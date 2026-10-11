"""
Push notifications through Expo's push service.

Reaches responders who have a data connection and a registered Expo push token
(stored on the user row as "pushToken"). Expo works in two steps:
  POST /push/send         -> a ticket per message ("ok" with an id, or "error")
  POST /push/getReceipts  -> later, whether the platform (FCM/APNs) delivered it
EXPO_ACCESS_TOKEN is optional and only needed if push security is enabled on
the Expo project.
"""
from __future__ import annotations

import os

import httpx

from services.sms_gateway import DeliveryState, SendResult

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push"


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    token = os.getenv("EXPO_ACCESS_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def is_expo_token(token: str | None) -> bool:
    return bool(token) and (token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken["))


async def send(token: str, title: str, body: str, data: dict) -> SendResult:
    message = {"to": token, "title": title, "body": body, "data": data, "sound": "default", "priority": "high"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(f"{EXPO_PUSH_URL}/send", json=[message], headers=_headers())
    except httpx.HTTPError as exc:
        return SendResult(ok=False, error=f"Expo push service unreachable: {exc}")
    if response.status_code >= 400:
        return SendResult(ok=False, error=f"Expo rejected the push ({response.status_code}): {response.text[:200]}")
    tickets = response.json().get("data") or []
    ticket = tickets[0] if tickets else {}
    if ticket.get("status") != "ok":
        detail = (ticket.get("details") or {}).get("error") or ticket.get("message") or "unknown error"
        return SendResult(ok=False, error=f"Expo push failed: {detail}")
    return SendResult(ok=True, provider_id=ticket.get("id"))


async def delivery_state(ticket_id: str) -> DeliveryState:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(f"{EXPO_PUSH_URL}/getReceipts", json={"ids": [ticket_id]}, headers=_headers())
    response.raise_for_status()
    receipt = (response.json().get("data") or {}).get(ticket_id)
    if receipt is None:
        return "SENT"  # receipt not ready yet
    return "DELIVERED" if receipt.get("status") == "ok" else "FAILED"
