"""
POST /classify — Damage classification using the custom damage model
(damage_best.pt if available) or YOLOv8n-cls COCO proxy fallback.
"""
from __future__ import annotations

import base64
import io
import logging
import time
from datetime import datetime, timezone

import numpy as np
from fastapi import APIRouter, Body, HTTPException
from PIL import Image

from services.yolo_model import (
    DAMAGE_CLASS_NAMES,
    DAMAGE_PROXY_CLASSES,
    PERSON_CLASS,
    get_damage_model,
    damage_state,
)

logger = logging.getLogger("rescueeye.classify")
router = APIRouter()

CONFIDENCE_THRESHOLD = 0.35


def _decode_frame(b64: str) -> np.ndarray:
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    raw = base64.b64decode(b64)
    return np.array(Image.open(io.BytesIO(raw)).convert("RGB"))


def _get_severity(label: str, confidence: float) -> tuple[str, str]:
    """Map damage label + confidence to (severity_tier, suggested_action)."""
    if label == "no_damage":
        return "CLEAR", "No immediate action required"
    crit_thresh = {"fire_damage": 0.80, "structural_damage": 0.80, "flood_damage": 0.80}
    mod_thresh  = {"fire_damage": 0.55, "structural_damage": 0.55, "flood_damage": 0.55}
    actions: dict[tuple[str, str], str] = {
        ("fire_damage",       "CRITICAL"): "Deploy fire suppression — immediate evacuation required",
        ("fire_damage",       "MODERATE"): "Alert fire responders — monitor active spread",
        ("fire_damage",       "MINOR"):    "Early fire signs — investigate the area",
        ("structural_damage", "CRITICAL"): "Do not enter — structural collapse risk",
        ("structural_damage", "MODERATE"): "Assess load-bearing integrity before entry",
        ("structural_damage", "MINOR"):    "Surface damage — inspect foundations",
        ("flood_damage",      "CRITICAL"): "Evacuation zone — deploy water rescue units immediately",
        ("flood_damage",      "MODERATE"): "Rising water — stage rescue assets nearby",
        ("flood_damage",      "MINOR"):    "Localised flooding — monitor water levels",
    }
    if confidence >= crit_thresh.get(label, 0.80):
        tier = "CRITICAL"
    elif confidence >= mod_thresh.get(label, 0.55):
        tier = "MODERATE"
    else:
        tier = "MINOR"
    return tier, actions.get((label, tier), f"{tier.title()} damage detected — assess area")


@router.post("")
async def classify_damage(payload: dict = Body(...)):
    b64 = payload.get("frame", "")
    if not b64:
        raise HTTPException(422, "'frame' field required")

    try:
        frame = _decode_frame(b64)
    except Exception as exc:
        raise HTTPException(422, f"Could not decode frame: {exc}")

    model     = get_damage_model()
    state     = damage_state()
    timestamp = datetime.now(timezone.utc).isoformat()

    if model is None:
        import random
        label = random.choice(DAMAGE_CLASS_NAMES)
        conf  = round(random.uniform(0.72, 0.93), 2)
        tier, action = _get_severity(label, conf)
        return {
            "label":            label,
            "confidence":       conf,
            "severity":         tier,
            "suggested_action": action,
            "timestamp":        timestamp,
            "model_version":    "stub",
        }

    t0 = time.perf_counter()
    results = model(frame, verbose=False)
    inference_ms = round((time.perf_counter() - t0) * 1000, 1)

    if state.is_custom:
        # Custom classification model — top-1 prediction
        probs   = results[0].probs
        cls_id  = int(probs.top1)
        conf    = float(probs.top1conf)
        names   = results[0].names
        label   = names.get(cls_id, DAMAGE_CLASS_NAMES[cls_id % len(DAMAGE_CLASS_NAMES)])
        # Normalise label to our 4 canonical names
        if label not in DAMAGE_CLASS_NAMES:
            label = DAMAGE_CLASS_NAMES[cls_id % len(DAMAGE_CLASS_NAMES)]
    else:
        # COCO detection fallback — find highest-conf non-person box
        best_label = None
        best_conf  = 0.0
        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf   = float(box.conf[0])
                if cls_id == PERSON_CLASS:
                    continue
                dmg = DAMAGE_PROXY_CLASSES.get(cls_id)
                if dmg and conf > best_conf:
                    best_label, best_conf = dmg, conf
        if best_label is None:
            best_label = "no_damage"
            best_conf  = 0.70
        label, conf = best_label, best_conf

    tier, action = _get_severity(label, float(conf))
    logger.info(
        f"[classify] label={label} conf={conf:.2f} severity={tier} "
        f"inference={inference_ms:.0f}ms model={state.version}"
    )

    return {
        "label":            label,
        "confidence":       round(float(conf), 3),
        "severity":         tier,
        "suggested_action": action,
        "timestamp":        timestamp,
        "inference_time_ms": inference_ms,
        "model_version":    state.version,
    }
