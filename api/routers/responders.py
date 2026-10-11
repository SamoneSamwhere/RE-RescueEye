"""
POST /responders/positions - where our own responders currently are.
POST /responders/{id}/location - one responder's own device GPS fix.

Fed by the client, which already tracks responder positions to draw them on
the Damage Map. The detector uses it as a veto: a person detected within the
exclusion radius of a known responder is that responder, not a casualty.

Positions are operational state with a short TTL, not records - they are held
in memory and lost on restart, which is correct. A position from before the
last restart is too old to veto anything.

Device fixes are also pushed to the web Damage Map over WebSocket (see
routers/live.py), which is how responder markers move in real time.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Body, HTTPException

from services import live_hub, responder_registry

logger = logging.getLogger("rescueeye.responders")
router = APIRouter()


def position_payload(p: responder_registry.ResponderPosition) -> dict:
    """One position as the web client expects it (updatedAt in epoch ms)."""
    return {
        "id": p.responder_id,
        "name": p.name,
        "lat": p.lat,
        "lng": p.lng,
        "source": p.source,
        "updatedAt": int(p.updated_at * 1000),
    }


@router.post("/positions")
async def report_positions(payload: dict = Body(...)) -> dict:
    """
    Records responder positions.

    Body: {"responders": [{"id": "...", "lat": 10.3, "lng": 123.9, "name": "..."}]}
    """
    responders = payload.get("responders")
    if not isinstance(responders, list):
        raise HTTPException(422, "'responders' must be a list")

    accepted = 0
    for entry in responders:
        if not isinstance(entry, dict):
            continue
        rid = str(entry.get("id") or "").strip()
        lat, lng = entry.get("lat"), entry.get("lng")
        if not rid or lat is None or lng is None:
            continue
        try:
            # None means the responder's own device reported more recently; that fix stands.
            if responder_registry.report(rid, float(lat), float(lng), str(entry.get("name") or "")):
                accepted += 1
        except (TypeError, ValueError):
            # One malformed entry should not reject the rest of the batch: the
            # positions that did parse are still useful this frame.
            logger.debug(f"[responders] skipped malformed entry: {entry!r}")

    return {"accepted": accepted, "active": len(responder_registry.active())}


@router.post("/{responder_id}/location")
async def report_device_location(responder_id: str, payload: dict = Body(...)) -> dict:
    """
    Records a responder's GPS fix from their own device and pushes it live.

    Body: {"lat": 10.3, "lng": 123.9, "name": "..."}
    """
    try:
        lat, lng = float(payload["lat"]), float(payload["lng"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(422, "'lat' and 'lng' must be numbers")
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HTTPException(422, "'lat'/'lng' out of range")

    position = responder_registry.report(
        responder_id, lat, lng, str(payload.get("name") or ""), source="device",
    )
    body = position_payload(position)
    await live_hub.broadcast({"type": "responder_location", "responder": body})
    return body


@router.get("")
async def list_positions() -> dict:
    """Currently known responder positions, stale ones already expired."""
    return {
        "responders": [
            {
                "id": p.responder_id,
                "name": p.name,
                "lat": p.lat,
                "lng": p.lng,
            }
            for p in responder_registry.active()
        ],
        "exclusion_radius_m": responder_registry.RESPONDER_EXCLUSION_M,
        "ttl_s": responder_registry.RESPONDER_TTL_S,
    }


@router.delete("")
async def clear_positions() -> dict:
    """Drops every known position - used when an operation ends."""
    responder_registry.reset()
    return {"cleared": True}
