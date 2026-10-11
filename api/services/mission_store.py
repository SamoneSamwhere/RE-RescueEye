"""
Latest known state of every mission, as written back by the clients.

The web app owns the mission workflow (which transitions are allowed, who may
make them); this store only records the result of each change so it can be
pushed to every other screen and handed to a page that connects later. Held in
memory like the other operational state in this service - lost on restart.

Missions are stored as the client sends them (camelCase, matching
src/types/mission.ts) so the web app can apply them without translation.
"""
from __future__ import annotations

import threading

VALID_STATUSES = {"PENDING", "ACCEPTED", "DECLINED", "EN_ROUTE", "ON_SITE", "COMPLETED"}
REQUIRED_FIELDS = ("id", "incidentId", "responderUserId", "status", "dispatchedAt")

_missions: dict[str, dict] = {}
_lock = threading.Lock()


class InvalidMission(ValueError):
    pass


def upsert(mission: dict) -> dict:
    """Records a mission's latest state, replacing whatever was held for it."""
    missing = [f for f in REQUIRED_FIELDS if not mission.get(f)]
    if missing:
        raise InvalidMission(f"mission is missing {', '.join(missing)}")
    if mission["status"] not in VALID_STATUSES:
        raise InvalidMission(f"unknown mission status {mission['status']!r}")
    stored = dict(mission)
    with _lock:
        _missions[str(stored["id"])] = stored
    return stored


def all_missions() -> list[dict]:
    with _lock:
        return list(_missions.values())


def reset() -> None:
    """Test hook."""
    with _lock:
        _missions.clear()
