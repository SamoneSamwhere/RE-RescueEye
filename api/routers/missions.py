"""
PUT /missions/{id} - write a mission's latest state back and push it live.
GET /missions      - every mission state held, for a client that needs to catch up.

Every mission change in the web app (dispatch, accept, decline, start
navigation, arrive on-site, rescue complete) is written here as it happens,
then broadcast over WebSocket so Command Staff and the responder see it at once.
"""
from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException

from services import live_hub, mission_store

router = APIRouter()


@router.put("/{mission_id}")
async def put_mission(mission_id: str, mission: dict = Body(...)) -> dict:
    if str(mission.get("id")) != mission_id:
        raise HTTPException(422, "mission id in the body does not match the URL")
    try:
        stored = mission_store.upsert(mission)
    except mission_store.InvalidMission as exc:
        raise HTTPException(422, str(exc)) from exc
    await live_hub.broadcast({"type": "mission", "mission": stored})
    return stored


@router.get("")
async def list_missions() -> dict:
    return {"missions": mission_store.all_missions()}
