"""
SMS delivery behind a provider-neutral interface.

SMS is the channel that still reaches a responder with no mobile data, so every
dispatch sends one. The alert service only talks to `SmsGateway`; swapping
Semaphore for another provider means adding a class here and selecting it with
SMS_PROVIDER - nothing else changes.

Semaphore (https://semaphore.co, Philippine SMS gateway):
  POST /api/v4/messages            send; returns the queued message and its id
  GET  /api/v4/messages/{id}       current status: Pending, Queued, Sent, Failed, Refunded
Configured with SEMAPHORE_API_KEY and, optionally, SEMAPHORE_SENDER_NAME (a
sender name registered with Semaphore; their default is used when unset).

textbee (https://textbee.dev, open source): an Android phone running the
textbee app sends the SMS from its own SIM - a low-cost option for testing and
demos. Configured with TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID.

UniSMS (https://unismsapi.com, Philippine SMS gateway):
  POST /api/sms                    send; returns the message and its reference_id
  GET  /api/sms/{reference_id}     current status: pending, retrying, sent, failed
Configured with UNISMS_API_KEY (the dashboard's API secret key, sent as the
Basic-auth username) and UNISMS_SENDER_ID (required by UniSMS; new accounts
get a random test sender ID on the dashboard).

SMS_PROVIDER selects one: semaphore (default), unisms or textbee.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Literal, Protocol

import httpx

DeliveryState = Literal["SENT", "DELIVERED", "FAILED"]


@dataclass
class SendResult:
    ok: bool
    provider_id: str | None = None
    error: str | None = None


class SmsGateway(Protocol):
    async def send(self, number: str, message: str) -> SendResult: ...

    async def delivery_state(self, provider_id: str) -> DeliveryState:
        """SENT while still in flight, then DELIVERED or FAILED once the carrier settles it."""
        ...


def normalize_ph_number(raw: str | None) -> str | None:
    """+63 9XX…, 63 9XX…, 09XX… or 9XX… -> 09XXXXXXXXX, or None if it is not a PH mobile number."""
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("63") and len(digits) == 12:
        digits = "0" + digits[2:]
    elif digits.startswith("9") and len(digits) == 10:
        digits = "0" + digits
    return digits if re.fullmatch(r"09\d{9}", digits) else None


class SemaphoreGateway:
    BASE_URL = "https://api.semaphore.co/api/v4"

    def __init__(self, api_key: str, sender_name: str | None = None) -> None:
        self._api_key = api_key
        self._sender_name = sender_name

    async def send(self, number: str, message: str) -> SendResult:
        payload = {"apikey": self._api_key, "number": number, "message": message}
        if self._sender_name:
            payload["sendername"] = self._sender_name
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(f"{self.BASE_URL}/messages", data=payload)
        except httpx.HTTPError as exc:
            return SendResult(ok=False, error=f"Semaphore unreachable: {exc}")
        if response.status_code >= 400:
            return SendResult(ok=False, error=f"Semaphore rejected the message ({response.status_code}): {response.text[:200]}")
        body = response.json()
        first = body[0] if isinstance(body, list) and body else body
        if not isinstance(first, dict) or "message_id" not in first:
            return SendResult(ok=False, error=f"Unexpected Semaphore response: {str(body)[:200]}")
        if str(first.get("status", "")).lower() in ("failed", "refunded"):
            return SendResult(ok=False, provider_id=str(first["message_id"]), error="Semaphore marked the message failed")
        return SendResult(ok=True, provider_id=str(first["message_id"]))

    async def delivery_state(self, provider_id: str) -> DeliveryState:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{self.BASE_URL}/messages/{provider_id}", params={"apikey": self._api_key})
        response.raise_for_status()
        body = response.json()
        first = body[0] if isinstance(body, list) and body else body
        status = str((first or {}).get("status", "")).lower()
        if status == "sent":
            return "DELIVERED"
        if status in ("failed", "refunded"):
            return "FAILED"
        return "SENT"


class UniSmsGateway:
    BASE_URL = "https://unismsapi.com/api"

    def __init__(self, api_key: str, sender_id: str) -> None:
        self._auth = httpx.BasicAuth(api_key, "")
        self._sender_id = sender_id

    async def send(self, number: str, message: str) -> SendResult:
        payload = {"recipient": number, "content": message, "sender_id": self._sender_id}
        try:
            async with httpx.AsyncClient(timeout=15.0, auth=self._auth) as client:
                response = await client.post(f"{self.BASE_URL}/sms", json=payload)
        except httpx.HTTPError as exc:
            return SendResult(ok=False, error=f"UniSMS unreachable: {exc}")
        if response.status_code >= 400:
            return SendResult(ok=False, error=f"UniSMS rejected the message ({response.status_code}): {response.text[:200]}")
        try:
            msg = response.json().get("message") or {}
        except ValueError:
            msg = {}
        reference_id = msg.get("reference_id")
        if not reference_id:
            return SendResult(ok=False, error=f"Unexpected UniSMS response: {response.text[:200]}")
        if str(msg.get("status", "")).lower() == "failed":
            return SendResult(ok=False, provider_id=str(reference_id), error=f"UniSMS marked the message failed: {msg.get('fail_reason')}")
        return SendResult(ok=True, provider_id=str(reference_id))

    async def delivery_state(self, provider_id: str) -> DeliveryState:
        async with httpx.AsyncClient(timeout=10.0, auth=self._auth) as client:
            response = await client.get(f"{self.BASE_URL}/sms/{provider_id}")
        response.raise_for_status()
        status = str((response.json().get("message") or {}).get("status", "")).lower()
        if status == "sent":
            return "DELIVERED"
        if status == "failed":
            return "FAILED"
        return "SENT"


def to_e164_ph(number: str) -> str:
    """09XXXXXXXXX -> +639XXXXXXXXX."""
    return "+63" + number[1:]


class TextbeeGateway:
    """
    Sends through the textbee Android app. textbee queues the message for the
    phone and reports success once queued; this does not poll for a carrier
    delivery receipt, so these alerts stay SENT rather than being shown as
    DELIVERED without proof.
    """

    def __init__(self, api_key: str, device_id: str, base_url: str) -> None:
        self._api_key = api_key
        self._device_id = device_id
        self._base_url = base_url.rstrip("/")

    async def send(self, number: str, message: str) -> SendResult:
        url = f"{self._base_url}/gateway/devices/{self._device_id}/send-sms"
        payload = {"recipients": [to_e164_ph(number)], "message": message}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, json=payload, headers={"x-api-key": self._api_key})
        except httpx.HTTPError as exc:
            return SendResult(ok=False, error=f"textbee unreachable: {exc}")
        if response.status_code >= 400:
            return SendResult(ok=False, error=f"textbee rejected the message ({response.status_code}): {response.text[:200]}")
        try:
            data = response.json().get("data") or {}
        except ValueError:
            data = {}
        if data.get("success") is False:
            return SendResult(ok=False, error=f"textbee did not queue the message: {data.get('message', 'unknown error')}")
        # No provider id on purpose: there is no receipt to follow (see the class docstring).
        return SendResult(ok=True)

    async def delivery_state(self, provider_id: str) -> DeliveryState:
        return "SENT"


class UnconfiguredGateway:
    """Used when the selected provider has no credentials: every send fails loudly instead of pretending to deliver."""

    def __init__(self, missing: str = "SEMAPHORE_API_KEY") -> None:
        self._missing = missing

    async def send(self, number: str, message: str) -> SendResult:
        return SendResult(ok=False, error=f"SMS gateway not configured (set {self._missing} in api/.env)")

    async def delivery_state(self, provider_id: str) -> DeliveryState:
        return "FAILED"


def get_sms_gateway() -> SmsGateway:
    provider = os.getenv("SMS_PROVIDER", "semaphore").strip().lower()
    if provider == "textbee":
        api_key = os.getenv("TEXTBEE_API_KEY", "").strip()
        device_id = os.getenv("TEXTBEE_DEVICE_ID", "").strip()
        if api_key and device_id:
            base_url = os.getenv("TEXTBEE_BASE_URL", "").strip() or "https://api.textbee.dev/api/v1"
            return TextbeeGateway(api_key, device_id, base_url)
        return UnconfiguredGateway("TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID")
    if provider == "unisms":
        api_key = os.getenv("UNISMS_API_KEY", "").strip()
        sender_id = os.getenv("UNISMS_SENDER_ID", "").strip()
        if api_key and sender_id:
            return UniSmsGateway(api_key, sender_id)
        return UnconfiguredGateway("UNISMS_API_KEY and UNISMS_SENDER_ID")
    api_key = os.getenv("SEMAPHORE_API_KEY", "").strip()
    if api_key:
        return SemaphoreGateway(api_key, os.getenv("SEMAPHORE_SENDER_NAME", "").strip() or None)
    return UnconfiguredGateway()
