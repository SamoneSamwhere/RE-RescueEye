"""
In-memory circular buffer for recent detections.
Shared across detect, classify, and the /detections/recent endpoint.
Phase 3 will replace this with Firestore persistence.
"""
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


def add_detections(detections: list[dict], inference_time_ms: float) -> None:
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
        }
        for d in reversed(items)
    ]
