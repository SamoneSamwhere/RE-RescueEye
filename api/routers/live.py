"""
GET /live/ws (WebSocket) - live responder positions and mission status.

On connect the client gets a snapshot of everything currently known, then a
message per change. Clients only listen: positions and mission changes are
written through the REST endpoints in routers/responders.py and
routers/missions.py, which broadcast here.
"""
from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from routers.responders import position_payload
from services import live_hub, mission_store, responder_registry

router = APIRouter()


@router.websocket("/ws")
async def live_updates(ws: WebSocket) -> None:
    snapshot = {
        "responders": [position_payload(p) for p in responder_registry.active() if p.source == "device"],
        "missions": mission_store.all_missions(),
    }
    await live_hub.connect(ws, snapshot)
    try:
        # Nothing is expected from the client; reading keeps the connection
        # open and is how a closed tab is noticed.
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await live_hub.disconnect(ws)
