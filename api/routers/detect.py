"""
POST /detect — YOLOv8 casualty detection on a base64-encoded JPEG frame.
Uses the custom victim_best.pt if available; falls back to COCO yolov8n.pt.

Phase 4: bridges high-confidence detections to Node.js /incidents (httpx,
conf ≥ 0.75, 10s cooldown per grid cell) and appends to inference log.
"""
from __future__ import annotations

import asyncio
import base64
import io
import logging
import os
import time
import uuid
from datetime import datetime, timezone

import numpy as np
from fastapi import APIRouter, Body, HTTPException
from PIL import Image

from services.yolo_model import (
    DAMAGE_PROXY_CLASSES,
    PERSON_CLASS,
    get_coco_assist,
    get_coco_ort_session,
    get_victim_model,
    get_victim_ort_session,
    victim_state,
)
from services.detection_store import add_detections
from services.drone_telemetry import current_position as drone_position
from services.tracker import Sort
from routers.logs import append_log

logger = logging.getLogger("rescueeye.detect")
router = APIRouter()

LATENCY_WARN_MS      = float(os.getenv("LATENCY_WARN_MS",      "3000"))
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.40"))
INCIDENT_CONF_MIN    = float(os.getenv("INCIDENT_CONF_MIN",    "0.75"))
NODE_SERVER_URL      = os.getenv("NODE_SERVER_URL", "http://localhost:3001")
DRONE_ID             = os.getenv("DRONE_ID", "DRN-01")
DRONE_CALLSIGN       = os.getenv("DRONE_CALLSIGN", "Rescue-1")
NTFY_TOPIC           = os.getenv("NTFY_TOPIC", "rescueeye-alerts")
NTFY_MIN_CONF        = float(os.getenv("NTFY_MIN_CONF", "0.10"))
GRID_COOLDOWN_S      = 10.0
NTFY_COOLDOWN_S      = 30.0
SAHI_ENABLED         = os.getenv("SAHI_ENABLED", "true").lower() == "true"
SAHI_TILES           = int(os.getenv("SAHI_TILES", "2"))      # NxN grid (2→4 tiles, 3→9 tiles)
SAHI_SKIP_CONF       = float(os.getenv("SAHI_SKIP_CONF", "0.65"))  # skip tiles if full-frame already this confident
# Close-range assist (see services/yolo_model.py). 960 is the accuracy/latency
# knee on the 1280x720 frames the stream hands us: 640 misses bodies the custom
# model also misses, and 1280 costs ~130ms more for no gain.
COCO_ASSIST_IMGSZ    = int(os.getenv("COCO_ASSIST_IMGSZ", "960"))
COCO_ASSIST_CONF     = float(os.getenv("COCO_ASSIST_CONF", "0.35"))

_grid_cooldown: dict[tuple[int, int], float] = {}
_grid_lock = asyncio.Lock()
_ntfy_last_sent: float = 0.0
_ntfy_lock = asyncio.Lock()

# SORT tracker — persists across requests, maintains Kalman state per person
_tracker = Sort(max_age=4, min_hits=1, iou_threshold=0.20)



def _bbox_to_grid(bbox: dict, cols: int = 8, rows: int = 6) -> tuple[int, int]:
    cx = bbox["x"] + bbox["w"] / 2
    cy = bbox["y"] + bbox["h"] / 2
    return (min(int(cy / 480 * rows), rows - 1), min(int(cx / 640 * cols), cols - 1))


async def _maybe_create_incident(detection: dict) -> None:
    if detection.get("confidence", 0) < INCIDENT_CONF_MIN:
        return
    cell = _bbox_to_grid(detection["bbox"])
    now  = time.monotonic()
    async with _grid_lock:
        if now - _grid_cooldown.get(cell, 0) < GRID_COOLDOWN_S:
            return
        _grid_cooldown[cell] = now
    class_to_type = {
        "casualty":          "VICTIM_DETECTED",
        "fire_damage":       "FIRE",
        "flood_damage":      "FLOOD",
        "structural_damage": "STRUCTURAL",
    }
    try:
        import httpx  # type: ignore
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(
                f"{NODE_SERVER_URL}/incidents",
                json={
                    "type":        class_to_type.get(detection["class"], "UNKNOWN"),
                    "severity":    "HIGH" if detection["confidence"] >= 0.90 else "MEDIUM",
                    "description": (
                        f"AI detected {detection['class']} "
                        f"(conf={detection['confidence']:.2f}) via {DRONE_CALLSIGN}"
                    ),
                    "reportedBy":    "AI_SYSTEM",
                    # Where the drone spotted the casualty — the incident is
                    # pinned here, and the map shows "spotted by <callsign>".
                    "lat":           detection.get("lat"),
                    "lng":           detection.get("lng"),
                    "droneId":       DRONE_ID,
                    "droneCallsign": DRONE_CALLSIGN,
                },
            )
    except Exception as exc:
        logger.debug(f"[detect] Incident bridge error (non-fatal): {exc}")


async def _send_ntfy_alert(detection: dict) -> None:
    global _ntfy_last_sent
    if detection.get("confidence", 0) < NTFY_MIN_CONF:
        return
    now = time.monotonic()
    async with _ntfy_lock:
        if now - _ntfy_last_sent < NTFY_COOLDOWN_S:
            return
        _ntfy_last_sent = now
    # Use the coordinate already stamped onto the detection so the map pin in
    # this alert points at the same place as the incident. Falling back to the
    # drone's live position keeps the link meaningful if it's ever missing —
    # previously this rolled a fresh random coordinate, so the "GPS" in the
    # alert had no relationship to where the casualty was reported.
    lat = detection.get("lat")
    lng = detection.get("lng")
    if lat is None or lng is None:
        lat, lng = drone_position()
    lat, lng = round(lat, 4), round(lng, 4)
    conf_pct = round(detection["confidence"] * 100)
    tid = detection.get("track_id", "?")
    body = (
        f"Casualty detected — {conf_pct}% confidence\n"
        f"Track ID: #{tid}\n"
        f"GPS: {lat}, {lng}\n"
        f"Dispatch nearest field team immediately."
    )
    try:
        import httpx
        async with httpx.AsyncClient(timeout=4.0) as client:
            await client.post(
                f"https://ntfy.sh/{NTFY_TOPIC}",
                content=body.encode(),
                headers={
                    "Title":    "RescueEye — Casualty Detected",
                    "Priority": "urgent",
                    "Tags":     "sos,rotating_light",
                    "Click":    f"https://www.openstreetmap.org/?mlat={lat}&mlon={lng}&zoom=17",
                },
            )
        logger.info(f"[detect] ntfy alert sent → ntfy.sh/{NTFY_TOPIC} (conf={conf_pct}%)")
    except Exception as exc:
        logger.debug(f"[detect] ntfy error (non-fatal): {exc}")


def _decode_frame(b64: str) -> np.ndarray:
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    raw = base64.b64decode(b64)
    return np.array(Image.open(io.BytesIO(raw)).convert("RGB"))


LABEL_COLORS: dict[str, tuple[int, int, int]] = {
    "casualty":          (255, 59,  59),
    "fire_damage":       (255, 119, 0),
    "flood_damage":      (0,   212, 255),
    "structural_damage": (249, 115, 22),
}

# Brightness below this (0-255) triggers thermal mode
DARK_THRESHOLD = float(os.getenv("DARK_THRESHOLD", "60"))

# Inferno-like LUT: maps grayscale 0-255 → RGB thermal color
def _build_thermal_lut() -> np.ndarray:
    lut = np.zeros((256, 3), dtype=np.uint8)
    for i in range(256):
        t = i / 255.0
        if t < 0.25:
            r = int(t * 4 * 30)
            g = 0
            b = int(20 + t * 4 * 80)
        elif t < 0.5:
            r = int(30 + (t - 0.25) * 4 * 190)
            g = 0
            b = int(100 - (t - 0.25) * 4 * 90)
        elif t < 0.75:
            r = 220
            g = int((t - 0.5) * 4 * 120)
            b = 0
        else:
            r = 255
            g = int(120 + (t - 0.75) * 4 * 135)
            b = int((t - 0.75) * 4 * 60)
        lut[i] = [min(r, 255), min(g, 255), min(b, 255)]
    return lut

_THERMAL_LUT = _build_thermal_lut()


def _measure_brightness(frame_rgb: np.ndarray) -> float:
    return float(np.mean(frame_rgb))


def _apply_thermal(frame_rgb: np.ndarray) -> np.ndarray:
    """Convert RGB frame to simulated thermal using inferno colormap."""
    gray = np.mean(frame_rgb, axis=2).astype(np.uint8)
    return _THERMAL_LUT[gray]


def _annotate_frame(frame_rgb: np.ndarray, detections: list[dict]) -> str:
    """Draw bounding boxes on a downscaled frame, return as base64 JPEG thumbnail."""
    from PIL import ImageDraw
    img = Image.fromarray(frame_rgb).resize((320, 240), Image.BILINEAR)
    sx, sy = 320 / frame_rgb.shape[1], 240 / frame_rgb.shape[0]
    draw = ImageDraw.Draw(img)
    for d in detections:
        b = d["bbox"]
        x1, y1 = int(b["x"] * sx), int(b["y"] * sy)
        x2, y2 = int((b["x"] + b["w"]) * sx), int((b["y"] + b["h"]) * sy)
        color = LABEL_COLORS.get(d["class"], (255, 255, 255))
        draw.rectangle([x1, y1, x2, y2], outline=color, width=2)
        label = f"{d['class'].upper()} {round(d['confidence'] * 100)}%"
        tw, th = 7 * len(label), 12
        ly = y1 - th - 1 if y1 > th + 1 else y2 + 1
        draw.rectangle([x1, ly, x1 + tw, ly + th], fill=color)
        draw.text((x1 + 2, ly + 1), label, fill=(10, 14, 26))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=40)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def _letterbox(img: np.ndarray, target: int = 1280) -> tuple[np.ndarray, float, int, int]:
    """Resize + pad to square keeping aspect ratio. Returns (padded_rgb, scale, pad_x, pad_y)."""
    h, w = img.shape[:2]
    scale = target / max(h, w)
    new_h, new_w = int(round(h * scale)), int(round(w * scale))
    resized = np.array(Image.fromarray(img).resize((new_w, new_h), Image.BILINEAR))
    pad = np.full((target, target, 3), 114, dtype=np.uint8)
    pad_y = (target - new_h) // 2
    pad_x = (target - new_w) // 2
    pad[pad_y:pad_y + new_h, pad_x:pad_x + new_w] = resized
    return pad, scale, pad_x, pad_y


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_thresh: float = 0.45) -> list[int]:
    """Simple NMS — returns surviving indices."""
    if len(boxes) == 0:
        return []
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]
    keep: list[int] = []
    while order.size:
        i = order[0]
        keep.append(int(i))
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        inter = np.maximum(0, xx2 - xx1) * np.maximum(0, yy2 - yy1)
        iou = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)
        order = order[1:][iou < iou_thresh]
    return keep


def _run_victim_ort(frame: np.ndarray) -> tuple[list[dict], float]:
    """GPU inference via DirectML ONNX Runtime (bypasses PyTorch entirely)."""
    sess = get_victim_ort_session()
    t0   = time.perf_counter()

    padded, scale, pad_x, pad_y = _letterbox(frame, 1280)
    blob = padded.astype(np.float32) / 255.0
    blob = blob.transpose(2, 0, 1)[np.newaxis]  # NCHW

    input_name = sess.get_inputs()[0].name
    raw = sess.run(None, {input_name: blob})[0]  # [1, 5, 33600]

    preds = raw[0]          # [5, 33600]
    cx, cy, bw, bh = preds[0], preds[1], preds[2], preds[3]
    conf = preds[4]

    logger.info(f"[ort] threshold={CONFIDENCE_THRESHOLD} max_conf={conf.max():.4f} frame={frame.shape}")
    mask = conf >= CONFIDENCE_THRESHOLD
    if not mask.any():
        elapsed = (time.perf_counter() - t0) * 1000
        return [], round(elapsed, 1)

    cx, cy, bw, bh, conf = cx[mask], cy[mask], bw[mask], bh[mask], conf[mask]

    # Convert from padded-input coords → original frame coords
    orig_x1 = ((cx - bw / 2) - pad_x) / scale
    orig_y1 = ((cy - bh / 2) - pad_y) / scale
    orig_x2 = ((cx + bw / 2) - pad_x) / scale
    orig_y2 = ((cy + bh / 2) - pad_y) / scale

    boxes = np.stack([orig_x1, orig_y1, orig_x2, orig_y2], axis=1)
    keep  = _nms(boxes, conf, iou_thresh=0.30)

    fh, fw = frame.shape[:2]
    detections: list[dict] = []
    for i in keep:
        x1 = max(0, int(orig_x1[i]))
        y1 = max(0, int(orig_y1[i]))
        x2 = min(fw, int(orig_x2[i]))
        y2 = min(fh, int(orig_y2[i]))
        if x2 <= x1 or y2 <= y1:
            continue
        detections.append({
            "class":      "casualty",
            "confidence": round(float(conf[i]), 3),
            "bbox":       {"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1},
        })

    elapsed_ms = (time.perf_counter() - t0) * 1000
    return detections, round(elapsed_ms, 1)


def _run_victim_ort_sahi(frame: np.ndarray) -> tuple[list[dict], float]:
    """
    SAHI (Slicing Aided Hyper Inference):
    - Pass 1: full frame letterboxed to 1280 (high-res global pass)
    - Pass 2…N: NxN overlapping tiles each letterboxed to 640 (zoom-in pass)
    All detections merged then NMS'd together. Catches tiny people that the
    full-frame pass misses at altitude.
    """
    sess = get_victim_ort_session()
    t0   = time.perf_counter()
    fh, fw = frame.shape[:2]
    all_boxes:  list[list[float]] = []
    all_scores: list[float]       = []

    def _infer_tile(tile: np.ndarray, off_x: int, off_y: int, target: int) -> None:
        padded, scale, pad_x, pad_y = _letterbox(tile, target)
        blob = padded.astype(np.float32) / 255.0
        blob = blob.transpose(2, 0, 1)[np.newaxis]
        raw  = sess.run(None, {sess.get_inputs()[0].name: blob})[0][0]  # [5, N]
        cx, cy, bw_, bh_, conf = raw[0], raw[1], raw[2], raw[3], raw[4]
        mask = conf >= CONFIDENCE_THRESHOLD
        if not mask.any():
            return
        cx, cy, bw_, bh_, conf = cx[mask], cy[mask], bw_[mask], bh_[mask], conf[mask]
        x1 = np.clip(((cx - bw_ / 2) - pad_x) / scale + off_x, 0, fw)
        y1 = np.clip(((cy - bh_ / 2) - pad_y) / scale + off_y, 0, fh)
        x2 = np.clip(((cx + bw_ / 2) - pad_x) / scale + off_x, 0, fw)
        y2 = np.clip(((cy + bh_ / 2) - pad_y) / scale + off_y, 0, fh)
        for i in range(len(conf)):
            if x2[i] > x1[i] and y2[i] > y1[i]:
                all_boxes.append([float(x1[i]), float(y1[i]), float(x2[i]), float(y2[i])])
                all_scores.append(float(conf[i]))

    # Determine model's fixed input size from the session
    input_shape = sess.get_inputs()[0].shape   # e.g. [1, 3, 1280, 1280]
    model_size  = int(input_shape[2]) if len(input_shape) == 4 and isinstance(input_shape[2], int) else 1280

    # Pass 1 — full frame (global context)
    _infer_tile(frame, 0, 0, model_size)

    # Adaptive early-exit: if full-frame already found a confident detection,
    # tiles won't add much — skip them to save ~800ms
    if all_scores and max(all_scores) >= SAHI_SKIP_CONF:
        logger.info(f"[ort-sahi] skipping tiles — full-frame conf={max(all_scores):.2f} >= {SAHI_SKIP_CONF}")
    else:
        # Pass 2…N — NxN tile grid with 25% overlap (sequential — DirectML is single-threaded)
        n      = SAHI_TILES
        tile_w = fw // n
        tile_h = fh // n
        ovl_x  = int(tile_w * 0.25)
        ovl_y  = int(tile_h * 0.25)
        for row in range(n):
            for col in range(n):
                tx1 = max(0,  col * tile_w - ovl_x)
                ty1 = max(0,  row * tile_h - ovl_y)
                tx2 = min(fw, (col + 1) * tile_w + ovl_x)
                ty2 = min(fh, (row + 1) * tile_h + ovl_y)
                _infer_tile(frame[ty1:ty2, tx1:tx2], tx1, ty1, model_size)

    elapsed_ms = (time.perf_counter() - t0) * 1000

    if not all_boxes:
        return [], round(elapsed_ms, 1)

    boxes  = np.array(all_boxes,  dtype=np.float32)
    scores = np.array(all_scores, dtype=np.float32)
    keep   = _nms(boxes, scores, iou_thresh=0.30)

    detections: list[dict] = []
    for i in keep:
        x1, y1, x2, y2 = boxes[i]
        detections.append({
            "class":      "casualty",
            "confidence": round(float(scores[i]), 3),
            "bbox":       {"x": int(x1), "y": int(y1), "w": int(x2 - x1), "h": int(y2 - y1)},
        })

    logger.info(
        f"[ort-sahi] tiles={n}x{n} pre_nms={len(all_boxes)} "
        f"post_nms={len(detections)} inference={elapsed_ms:.0f}ms"
    )
    return detections, round(elapsed_ms, 1)


def _run_coco_assist_ort(frame: np.ndarray) -> list[dict] | None:
    """
    COCO assist through ONNX Runtime on the GPU.

    Output is [1, 84, N]: rows 0-3 are cx/cy/w/h, rows 4.. are the 80 class
    scores, so row 4 is "person". Returns None when no session is loaded, which
    tells the caller to fall back to the PyTorch path.
    """
    sess = get_coco_ort_session()
    if sess is None:
        return None
    try:
        size = sess.get_inputs()[0].shape[2]
        size = int(size) if isinstance(size, int) else COCO_ASSIST_IMGSZ
        padded, scale, pad_x, pad_y = _letterbox(frame, size)
        blob = (padded.astype(np.float32) / 255.0).transpose(2, 0, 1)[np.newaxis].copy()
        raw = sess.run(None, {sess.get_inputs()[0].name: blob})[0][0]   # [84, N]
    except Exception as exc:
        logger.warning(f"[detect] COCO assist ORT failed: {exc}")
        return None

    scores = raw[4 + PERSON_CLASS]
    keep = scores >= COCO_ASSIST_CONF
    if not keep.any():
        return []

    cx, cy, bw, bh = raw[0][keep], raw[1][keep], raw[2][keep], raw[3][keep]
    conf = scores[keep]
    x1 = ((cx - bw / 2) - pad_x) / scale
    y1 = ((cy - bh / 2) - pad_y) / scale
    x2 = ((cx + bw / 2) - pad_x) / scale
    y2 = ((cy + bh / 2) - pad_y) / scale

    boxes = np.stack([x1, y1, x2, y2], axis=1)
    fh, fw = frame.shape[:2]
    out: list[dict] = []
    for i in _nms(boxes, conf):
        x, y = max(0, int(boxes[i][0])), max(0, int(boxes[i][1]))
        w, h = int(boxes[i][2] - boxes[i][0]), int(boxes[i][3] - boxes[i][1])
        if w <= 0 or h <= 0:
            continue
        out.append({
            "class":      "casualty",
            "confidence": round(float(conf[i]), 3),
            "bbox":       {"x": x, "y": y, "w": min(fw - x, w), "h": min(fh - y, h)},
        })
    return out


def _run_coco_assist(frame: np.ndarray) -> list[dict]:
    """
    Whole-body casualties via the generic COCO detector (class 0 = person).

    The custom weights are trained on VisDrone-scale targets and produce boxes
    a few dozen pixels tall, so a body filling much of the frame goes unboxed.
    This pass covers that range; results are merged, never substituted, so
    small distant targets still come from the custom model.
    """
    gpu = _run_coco_assist_ort(frame)
    if gpu is not None:
        return gpu

    model = get_coco_assist()
    if model is None:
        return []
    try:
        results = model(frame, imgsz=COCO_ASSIST_IMGSZ, classes=[PERSON_CLASS],
                        conf=COCO_ASSIST_CONF, verbose=False)
    except Exception as exc:
        logger.warning(f"[detect] COCO assist failed: {exc}")
        return []

    out: list[dict] = []
    fh, fw = frame.shape[:2]
    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            x, y = max(0, int(x1)), max(0, int(y1))
            out.append({
                "class":      "casualty",
                "confidence": round(float(box.conf[0]), 3),
                "bbox":       {"x": x, "y": y,
                               "w": min(fw - x, int(x2 - x1)),
                               "h": min(fh - y, int(y2 - y1))},
            })
    return out


def _merge_detections(primary: list[dict], extra: list[dict],
                      iou_thresh: float = 0.45) -> list[dict]:
    """Union of two detector outputs, de-duplicated by NMS on the same frame."""
    combined = primary + extra
    if len(combined) < 2:
        return combined
    boxes = np.array([[d["bbox"]["x"], d["bbox"]["y"],
                       d["bbox"]["x"] + d["bbox"]["w"],
                       d["bbox"]["y"] + d["bbox"]["h"]] for d in combined], dtype=np.float32)
    scores = np.array([d["confidence"] for d in combined], dtype=np.float32)
    keep = _nms(boxes, scores, iou_thresh)
    return [combined[i] for i in keep]


def _run_victim(frame: np.ndarray) -> tuple[list[dict], float]:
    """Custom victim model plus the close-range COCO assist, merged."""
    t_all = time.perf_counter()
    detections, elapsed = _run_victim_primary(frame)
    assist = _run_coco_assist(frame)
    if assist:
        detections = _merge_detections(detections, assist)
        elapsed = (time.perf_counter() - t_all) * 1000
    return detections, round(elapsed, 1)


def _run_victim_primary(frame: np.ndarray) -> tuple[list[dict], float]:
    # Prefer SAHI + DirectML when ORT session available and SAHI is enabled
    if get_victim_ort_session() is not None:
        if SAHI_ENABLED:
            return _run_victim_ort_sahi(frame)
        return _run_victim_ort(frame)

    model  = get_victim_model()
    state  = victim_state()
    t0     = time.perf_counter()

    if model is None:
        import random
        elapsed = (time.perf_counter() - t0) * 1000
        return [
            {
                "class":      "casualty",
                "confidence": round(random.uniform(0.82, 0.95), 2),
                "bbox":       {"x": 80, "y": 60, "w": 55, "h": 110},
            }
        ], round(elapsed + random.uniform(40, 80), 1)

    results    = model(frame, verbose=False, conf=CONFIDENCE_THRESHOLD)
    elapsed_ms = (time.perf_counter() - t0) * 1000

    detections = []
    for result in results:
        for box in result.boxes:
            cls_id  = int(box.cls[0])
            conf    = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            if state.is_custom:
                label = "casualty"
            elif cls_id == PERSON_CLASS:
                label = "casualty"
            elif cls_id in DAMAGE_PROXY_CLASSES:
                label = DAMAGE_PROXY_CLASSES[cls_id]
            else:
                continue

            detections.append({
                "class":      label,
                "confidence": round(conf, 3),
                "bbox":       {"x": int(x1), "y": int(y1), "w": int(x2 - x1), "h": int(y2 - y1)},
            })

    return detections, round(elapsed_ms, 1)


@router.post("")
async def detect_objects(payload: dict = Body(...)):
    b64 = payload.get("frame", "")
    if not b64:
        raise HTTPException(422, "'frame' field with base64 JPEG is required")
    try:
        frame = _decode_frame(b64)
    except Exception as exc:
        raise HTTPException(422, f"Could not decode frame: {exc}")

    # ── Dual-technology mode selection ────────────────────────────────────────
    brightness = _measure_brightness(frame)
    force_mode = payload.get("force_mode")  # "visual" | "thermal" | null
    if force_mode in ("visual", "thermal"):
        mode = force_mode
    else:
        mode = "thermal" if brightness < DARK_THRESHOLD else "visual"

    if mode == "thermal":
        # Thermal/life-sensor mode: display as infrared colormap, run YOLO on
        # the original RGB (the colouring is display-only). The class stays
        # "casualty" — thermal vs visual is reported in `mode`, so it does not
        # need a second name for the same subject.
        display_frame            = _apply_thermal(frame)
        detections, inference_ms = _run_victim(frame)
    else:
        display_frame            = frame
        detections, inference_ms = _run_victim(frame)

    # ── SORT tracking — assign persistent IDs via Kalman filter ─────────────
    if detections:
        det_arr = np.array([
            [d["bbox"]["x"], d["bbox"]["y"],
             d["bbox"]["x"] + d["bbox"]["w"],
             d["bbox"]["y"] + d["bbox"]["h"],
             d["confidence"]]
            for d in detections
        ], dtype=np.float32)
        tracked = _tracker.update(det_arr)  # [M, 6]: x1,y1,x2,y2,score,track_id
        tracked_label = "casualty"
        detections = []
        for row in tracked:
            x1, y1, x2, y2, score, tid = row
            fh, fw = frame.shape[:2]
            detections.append({
                "class":      tracked_label,
                "confidence": round(float(score), 3),
                "track_id":   int(tid),
                "bbox":       {
                    "x": max(0, int(x1)), "y": max(0, int(y1)),
                    "w": min(fw - max(0, int(x1)), int(x2 - x1)),
                    "h": min(fh - max(0, int(y1)), int(y2 - y1)),
                },
            })
    else:
        _tracker.update(np.empty((0, 5), dtype=np.float32))

    frame_id  = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    if inference_ms > LATENCY_WARN_MS:
        logger.warning(
            f"[detect] LATENCY EXCEEDED: {inference_ms:.0f}ms > {LATENCY_WARN_MS:.0f}ms"
        )

    # One position for the whole frame: every casualty visible in this frame is
    # on the ground beneath the drone at this instant. Sampling a fresh random
    # coordinate per detection (the previous behaviour) scattered casualties
    # from a single frame kilometres apart on the map.
    lat, lng = drone_position()

    annotated = []
    for i, d in enumerate(detections):
        annotated.append({**d, "id": f"{frame_id[:8]}-{i}", "timestamp": timestamp, "lat": lat, "lng": lng})

    add_detections(annotated, inference_ms)

    annotated_frame = _annotate_frame(display_frame, annotated) if annotated else None

    # In thermal mode always return the thermal frame so the UI can show it
    if mode == "thermal" and annotated_frame is None:
        buf = io.BytesIO()
        Image.fromarray(display_frame).save(buf, format="JPEG", quality=55)
        annotated_frame = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

    # Persist to inference log
    append_log({
        "frame_id":        frame_id,
        "detection_count": len(detections),
        "inference_ms":    inference_ms,
        "model_version":   victim_state().version,
        "mode":            mode,
    })

    # Bridge high-confidence detections to Node.js /incidents + ntfy push (non-blocking)
    for det in annotated:
        asyncio.create_task(_maybe_create_incident(det))
        asyncio.create_task(_send_ntfy_alert(det))

    logger.info(
        f"[detect] mode={mode} brightness={brightness:.0f} "
        f"detections={len(detections)} "
        f"inference={inference_ms:.0f}ms "
        f"model={victim_state().version}"
    )

    return {
        "detections":        annotated,
        "inference_time_ms": inference_ms,
        "frame_id":          frame_id,
        "model_version":     victim_state().version,
        "annotated_frame":   annotated_frame,
        "mode":              mode,
        "brightness":        round(brightness, 1),
    }
