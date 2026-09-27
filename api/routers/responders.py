"""
POST /responders/positions - where our own responders currently are.

Fed by the client, which already tracks responder positions to draw them on
the Damage Map. The detector uses it as a veto: a person detected within the
exclusion radius of a known responder is that responder, not a casualty.

Positions are operational state with a short TTL, not records - they are held
in memory and lost on restart, which is correct. A position from before the
last restart is too old to veto anything.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Body, HTTPException

from services import responder_registry

logger = logging.getLogger("rescueeye.responders")
router = APIRouter()


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
            responder_registry.report(rid, float(lat), float(lng), str(entry.get("name") or ""))
            accepted += 1
        except (TypeError, ValueError):
            # One malformed entry should not reject the rest of the batch: the
            # positions that did parse are still useful this frame.
            logger.debug(f"[responders] skipped malformed entry: {entry!r}")

    return {"accepted": accepted, "active": len(responder_registry.active())}


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
