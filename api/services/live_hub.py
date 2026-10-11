"""
Pushes live operational updates to every connected web client over WebSocket.

Two kinds of message go out, both as JSON:
  {"type": "responder_location", "responder": {...}}  - a responder's GPS fix
  {"type": "mission", "mission": {...}}               - a mission's latest state

A client that connects is first sent {"type": "snapshot", ...} with every
current position and mission, so a page opened mid-operation is not blank
until the next update happens to arrive.
"""
from __future__ import annotations

import asyncio
import logging

from fastapi import WebSocket

logger = logging.getLogger("rescueeye.live")

_clients: set[WebSocket] = set()
_lock = asyncio.Lock()


async def connect(ws: WebSocket, snapshot: dict) -> None:
    await ws.accept()
    await ws.send_json({"type": "snapshot", **snapshot})
    async with _lock:
        _clients.add(ws)
    logger.info(f"[live] client connected ({len(_clients)} total)")


async def disconnect(ws: WebSocket) -> None:
    async with _lock:
        _clients.discard(ws)
    logger.info(f"[live] client disconnected ({len(_clients)} total)")


async def broadcast(message: dict) -> None:
    """Sends to every client; one dead socket must not stop the rest getting it."""
    async with _lock:
        clients = list(_clients)
    dead: list[WebSocket] = []
    for ws in clients:
        try:
            await ws.send_json(message)
        except Exception:  # noqa: BLE001 - any send failure means the socket is gone
            dead.append(ws)
    if dead:
        async with _lock:
            for ws in dead:
                _clients.discard(ws)


def client_count() -> int:
    return len(_clients)
