"""
Alert endpoints (see services/alert_service.py for the delivery rules).

POST /alerts/dispatch           Command Staff dispatched a verified incident: record the
                                assignment and send SMS + PUSH + DASHBOARD alerts.
GET  /alerts?recipientId=&incidentId=
                                Alert history - a responder's own, or one incident's.
POST /alerts/{id}/read          The responder opened the alert: READ + acknowledgedAt.
POST /alerts/acknowledge        The responder accepted or declined: acknowledgedAt on
                                their alerts for that incident.
POST /alerts/push-token         A responder's device registers its Expo push token.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from services import alert_service, supabase_db

router = APIRouter()


class DispatchRequest(BaseModel):
    incidentId: int
    recipientIds: list[int] = Field(min_length=1)
    dispatchedBy: int
    # Full human label, e.g. "Major Fire Damage"; derived from the incident type when omitted.
    label: str | None = Field(default=None, max_length=60)


class ReadRequest(BaseModel):
    userId: int


class AcknowledgeRequest(BaseModel):
    incidentId: int
    userId: int


class PushTokenRequest(BaseModel):
    userId: int
    token: str = Field(min_length=1, max_length=255)


async def _run(coro):
    try:
        return await coro
    except supabase_db.DatabaseNotConfigured as exc:
        raise HTTPException(503, str(exc)) from exc
    except supabase_db.DatabaseError as exc:
        raise HTTPException(502, str(exc)) from exc
    except alert_service.AlertNotFound as exc:
        raise HTTPException(404, str(exc)) from exc
    except alert_service.AlertError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.post("/dispatch")
async def dispatch(body: DispatchRequest) -> dict:
    alerts = await _run(alert_service.dispatch(body.incidentId, body.recipientIds, body.dispatchedBy, body.label))
    return {"alerts": alerts}


@router.get("")
async def list_alerts(recipientId: int | None = None, incidentId: int | None = None) -> dict:
    if recipientId is None and incidentId is None:
        raise HTTPException(422, "pass recipientId or incidentId")
    return {"alerts": await _run(alert_service.list_alerts(recipientId, incidentId))}


@router.post("/{alert_id}/read")
async def mark_read(alert_id: int, body: ReadRequest) -> dict:
    return await _run(alert_service.mark_read(alert_id, body.userId))


@router.post("/acknowledge")
async def acknowledge(body: AcknowledgeRequest) -> dict:
    return {"alerts": await _run(alert_service.acknowledge(body.incidentId, body.userId))}


@router.post("/push-token", status_code=204, response_class=Response)
async def register_push_token(body: PushTokenRequest) -> Response:
    await _run(alert_service.register_push_token(body.userId, body.token))
    return Response(status_code=204)
