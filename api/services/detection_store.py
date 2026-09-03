"""
In-memory circular buffer for recent detections.
Shared across detect, classify, and the /detections/recent endpoint.
Phase 3 will replace this with Firestore persistence.
"""
import io
import random
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque

# Cebu City bounding box for simulated GPS coordinates
CEBU_LAT = (10.28, 10.35)
CEBU_LNG = (123.87, 123.92)

MAX_STORED = 200


@dataclass
class StoredDetection:
    id: str
    cls: str
    confidence: float
    bbox: dict
    timestamp: str
    lat: float
    lng: float
    inference_time_ms: float
    # Size of the frame the bbox was measured in. Without it a consumer cannot
    # turn pixel boxes into the percentages the review UI draws with, and the
    # frame size varies by source (a 1080p feed vs a 4K upload).
    frame_width: int = 0
    frame_height: int = 0
    # SORT track id: the same physical subject keeps this across frames, so a
    # consumer can collapse a hundred sightings of one casualty into one thing
    # to act on instead of a hundred rows.
    track_id: int | None = None
    # A JPEG crop of the subject, kept in memory alongside the record so the
    # review screen can show what the model actually saw. It rides the same
    # bounded deque, so old crops are evicted with their detection and nothing
    # accumulates on disk.
    snapshot: bytes | None = None


# Context kept around the box so a reviewer can see where the subject is,
# as a fraction of the box's own size.
SNAPSHOT_PADDING = 0.6
SNAPSHOT_MAX_EDGE = 360


def _crop_snapshot(frame, bbox: dict) -> bytes | None:
    """JPEG crop around one detection, with context padding. None on failure."""
    try:
        from PIL import Image

        fh, fw = frame.shape[:2]
        pad_x = int(bbox["w"] * SNAPSHOT_PADDING)
        pad_y = int(bbox["h"] * SNAPSHOT_PADDING)
        x1 = max(0, int(bbox["x"]) - pad_x)
        y1 = max(0, int(bbox["y"]) - pad_y)
        x2 = min(fw, int(bbox["x"] + bbox["w"]) + pad_x)
        y2 = min(fh, int(bbox["y"] + bbox["h"]) + pad_y)
        if x2 <= x1 or y2 <= y1:
            return None
        img = Image.fromarray(frame[y1:y2, x1:x2])
        img.thumbnail((SNAPSHOT_MAX_EDGE, SNAPSHOT_MAX_EDGE), Image.BILINEAR)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80)
        return buf.getvalue()
    except Exception:
        # A missing thumbnail must never cost us the detection itself.
        return None


_store: Deque[StoredDetection] = deque(maxlen=MAX_STORED)


def _random_cebu_coord() -> tuple[float, float]:
    lat = round(random.uniform(*CEBU_LAT), 6)
    lng = round(random.uniform(*CEBU_LNG), 6)
    return lat, lng


# Public helper so the detect handler can stamp a coordinate onto a detection
# BEFORE storing/bridging, ensuring the map, the recent-detections feed, and
# the created incident all agree on where the drone spotted the casualty.
def random_coord() -> tuple[float, float]:
    return _random_cebu_coord()


def add_detections(detections: list[dict], inference_time_ms: float,
                   frame_width: int = 0, frame_height: int = 0,
                   frame=None) -> None:
    for det in detections:
        # Reuse the coordinate already assigned to the detection (so the
        # incident lands at the same spot), falling back to a fresh one.
        if det.get("lat") is not None and det.get("lng") is not None:
            lat, lng = det["lat"], det["lng"]
        else:
            lat, lng = _random_cebu_coord()
        _store.append(
            StoredDetection(
                id=det.get("id", ""),
                cls=det["class"],
                confidence=det["confidence"],
                bbox=det["bbox"],
                timestamp=det.get("timestamp", datetime.now(timezone.utc).isoformat()),
                lat=lat,
                lng=lng,
                inference_time_ms=inference_time_ms,
                frame_width=frame_width,
                frame_height=frame_height,
                snapshot=_crop_snapshot(frame, det["bbox"]) if frame is not None else None,
                track_id=det.get("track_id"),
            )
        )


def get_recent(limit: int = 20) -> list[dict]:
    items = list(_store)[-limit:]
    return [
        {
            "id": d.id,
            "class": d.cls,
            "confidence": d.confidence,
            "bbox": d.bbox,
            "timestamp": d.timestamp,
            "lat": d.lat,
            "lng": d.lng,
            "inference_time_ms": d.inference_time_ms,
            "frame_width": d.frame_width,
            "frame_height": d.frame_height,
            "has_snapshot": d.snapshot is not None,
            "track_id": d.track_id,
        }
        for d in reversed(items)
    ]


def get_snapshot(detection_id: str) -> bytes | None:
    """JPEG crop for one detection, or None once it has aged out of the buffer."""
    for d in _store:
        if d.id == detection_id:
            return d.snapshot
    return None
