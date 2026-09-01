"""
GET /detections/recent — returns the last N stored detections with
simulated Cebu GPS coordinates for the Damage Map.
"""
from fastapi import APIRouter, Query
from services.detection_store import get_recent

router = APIRouter()


@router.get("/recent")
async def recent_detections(limit: int = Query(default=20, ge=1, le=100)):
    return {"detections": get_recent(limit)}
