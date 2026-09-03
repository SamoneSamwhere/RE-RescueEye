"""
GET /detections/recent          — last N stored detections, with the drone's
                                  position at the moment of each frame.
GET /detections/{id}/snapshot   — JPEG crop of what the model saw, so a
                                  reviewer can confirm a casualty by eye
                                  rather than trusting a confidence number.
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from services.detection_store import get_recent, get_snapshot

router = APIRouter()


@router.get("/recent")
async def recent_detections(limit: int = Query(default=20, ge=1, le=100)):
    return {"detections": get_recent(limit)}


@router.get("/{detection_id}/snapshot")
async def detection_snapshot(detection_id: str):
    """
    The crop lives in the same bounded buffer as the detection, so it is gone
    once the detection ages out — a 404 here means "too old", not "no such
    detection". Cached hard because a stored crop never changes.
    """
    jpeg = get_snapshot(detection_id)
    if jpeg is None:
        raise HTTPException(404, f"No snapshot for detection '{detection_id}'")
    return Response(content=jpeg, media_type="image/jpeg",
                    headers={"Cache-Control": "public, max-age=86400"})
