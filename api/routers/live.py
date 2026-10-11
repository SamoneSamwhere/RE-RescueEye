"""
GET /live/ws (WebSocket) - live responder positions and mission status.

On connect the client gets a snapshot of everything currently known, then a
message per change.

The Field Responder app also sends its GPS fixes up this socket:
  {"type": "location", "responderId": "...", "name": "...", "lat": .., "lng": ..}
Mission changes are written through REST (routers/missions.py), which
broadcasts here; so is the location fallback in routers/responders.py.
"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from routers.responders import position_payload, record_device_fix
from services import live_hub, mission_store, responder_registry

logger = logging.getLogger("rescueeye.live")
router = APIRouter()


@router.websocket("/ws")
async def live_updates(ws: WebSocket) -> None:
    snapshot = {
        "responders": [position_payload(p) for p in responder_registry.active() if p.source == "device"],
        "missions": mission_store.all_missions(),
    }
    await live_hub.connect(ws, snapshot)
    try:
        # Reading also keeps the connection open and is how a closed tab is noticed.
        while True:
            await _handle_client_message(await ws.receive_text())
    except WebSocketDisconnect:
        pass
    finally:
        await live_hub.disconnect(ws)


async def _handle_client_message(text: str) -> None:
    """A bad message is logged and dropped; it must not close the socket."""
    try:
        message = json.loads(text)
    except json.JSONDecodeError:
        logger.debug(f"[live] ignored non-JSON message: {text[:80]!r}")
        return
    if not isinstance(message, dict) or message.get("type") != "location":
        return
    try:
        await record_device_fix(message.get("responderId"), message)
    except ValueError as exc:
        logger.debug(f"[live] ignored bad location: {exc}")
