"""
Pluggable telemetry sources — how RescueEye learns where a drone actually is.

No single protocol reaches every aircraft. A Pixhawk speaks MAVLink; a DJI
consumer drone exposes nothing over its video link and needs a companion app;
a bespoke airframe may only manage an HTTP POST. So position is read through a
small interface with several implementations, and the rest of the platform
keeps calling `drone_telemetry.current_position()` exactly as before.

  push       — anything that can make an HTTP request. A DJI Mobile SDK app, a
               ground-station script, a Raspberry Pi, curl. This is the
               universal path: if a drone can be read at all, something can
               forward a fix here.
  mavlink    — ArduPilot / PX4 / Pixhawk over UDP, TCP or serial. Reads
               GLOBAL_POSITION_INT directly, so no bridge software is needed.
  simulated  — the built-in flight model, used when nothing real is connected.

Selection is by TELEMETRY_SOURCE. The default, "auto", prefers whichever real
source has a *fresh* fix and falls back to the simulation, so a link drop
degrades to a labelled simulated track instead of a frozen marker or a crash.
"""
from __future__ import annotations

import logging
import math
import os
import threading
import time
from dataclasses import dataclass, field
from typing import Protocol

logger = logging.getLogger("rescueeye.telemetry")

# A fix older than this is treated as no fix at all. Loitering on a stale
# position is worse than admitting the link is down: it silently pins every
# subsequent detection to wherever the aircraft was when contact was lost.
STALE_AFTER_S = float(os.getenv("TELEMETRY_STALE_AFTER_S", "5"))


@dataclass
class TelemetryFix:
    """One position report, whatever produced it."""
    lat: float
    lng: float
    received_at: float                      # time.monotonic()
    source: str                             # 'push' | 'mavlink' | 'simulated'
    drone_id: str = "DRN-01"
    callsign: str = "Rescue-1"
    # Altitude above ground and heading are optional because not every source
    # reports them; georeferencing a detection to the casualty rather than the
    # drone needs both, so adapters should supply them where they can.
    altitude_m: float | None = None
    heading_deg: float | None = None
    speed_mps: float | None = None
    extra: dict = field(default_factory=dict)

    def is_fresh(self, now: float | None = None) -> bool:
        return (now or time.monotonic()) - self.received_at <= STALE_AFTER_S


class TelemetrySource(Protocol):
    name: str

    def latest(self, drone_id: str | None = None) -> TelemetryFix | None:
        """Most recent fix, or None when this source has nothing usable."""
        ...


# ── Push: the universal adapter ───────────────────────────────────────────────

class PushSource:
    """
    Fixes delivered to POST /drone/telemetry.

    Deliberately dumb: it validates and stores. Anything that can reach the API
    over HTTP can drive it, which is what makes "connect any drone" tractable —
    a new airframe needs a small forwarder, not a change in here.

    Fixes are kept per drone id so several aircraft can report at once.
    """
    name = "push"

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._fixes: dict[str, TelemetryFix] = {}

    def submit(self, fix: TelemetryFix) -> None:
        with self._lock:
            self._fixes[fix.drone_id] = fix

    def latest(self, drone_id: str | None = None) -> TelemetryFix | None:
        with self._lock:
            if drone_id:
                fix = self._fixes.get(drone_id)
            else:
                # No id asked for: the most recently heard-from aircraft.
                fix = max(self._fixes.values(), key=lambda f: f.received_at, default=None)
        return fix if fix and fix.is_fresh() else None

    def known_drones(self) -> list[str]:
        with self._lock:
            return sorted(self._fixes)


# ── MAVLink: ArduPilot / PX4 / Pixhawk ────────────────────────────────────────

class MavlinkSource:
    """
    Reads GLOBAL_POSITION_INT from a MAVLink endpoint on a background thread.

    Connection strings are pymavlink's own, so this covers UDP telemetry
    radios, TCP bridges, SITL and direct serial without special cases:
        udp:0.0.0.0:14550 · tcp:127.0.0.1:5760 · COM4 · /dev/ttyUSB0

    pymavlink is imported lazily and a failure is logged rather than raised —
    a missing optional dependency must not stop the API from starting.
    """
    name = "mavlink"

    def __init__(self, connection: str, baud: int = 57600,
                 drone_id: str = "DRN-01", callsign: str = "Rescue-1") -> None:
        self.connection = connection
        self.baud = baud
        self.drone_id = drone_id
        self.callsign = callsign
        self._lock = threading.Lock()
        self._fix: TelemetryFix | None = None
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="mavlink-telemetry", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def _run(self) -> None:
        try:
            from pymavlink import mavutil  # type: ignore
        except ImportError:
            logger.warning(
                "[telemetry] pymavlink is not installed — MAVLink source disabled. "
                "pip install pymavlink to use TELEMETRY_SOURCE=mavlink."
            )
            return

        while not self._stop.is_set():
            try:
                logger.info(f"[telemetry] connecting to MAVLink at {self.connection}")
                link = mavutil.mavlink_connection(self.connection, baud=self.baud)
                link.wait_heartbeat(timeout=10)
                logger.info("[telemetry] MAVLink heartbeat received")
                while not self._stop.is_set():
                    msg = link.recv_match(type="GLOBAL_POSITION_INT", blocking=True, timeout=5)
                    if msg is None:
                        continue
                    self._store(msg)
            except Exception as exc:
                # A telemetry radio dropping out is routine; retry rather than
                # dying, and let staleness decide whether to fall back.
                logger.warning(f"[telemetry] MAVLink link error ({exc}) — retrying in 5s")
                self._stop.wait(5)

    def _store(self, msg) -> None:
        fix = TelemetryFix(
            lat=msg.lat / 1e7,
            lng=msg.lon / 1e7,
            # relative_alt is height above home, which is what a camera
            # footprint calculation needs; alt is above mean sea level.
            altitude_m=msg.relative_alt / 1000.0,
            heading_deg=(msg.hdg / 100.0) % 360 if msg.hdg != 65535 else None,
            speed_mps=math.hypot(msg.vx, msg.vy) / 100.0,
            received_at=time.monotonic(),
            source=self.name,
            drone_id=self.drone_id,
            callsign=self.callsign,
        )
        with self._lock:
            self._fix = fix

    def latest(self, drone_id: str | None = None) -> TelemetryFix | None:
        with self._lock:
            fix = self._fix
        if fix and drone_id and fix.drone_id != drone_id:
            return None
        return fix if fix and fix.is_fresh() else None


# ── Registry ──────────────────────────────────────────────────────────────────

_push_source = PushSource()
_mavlink_source: MavlinkSource | None = None


def push_source() -> PushSource:
    return _push_source


def mavlink_source() -> MavlinkSource | None:
    return _mavlink_source


def configure(mode: str | None = None) -> str:
    """
    Wire up whichever real sources this deployment uses. Returns the mode.

    Called once at startup. 'auto' leaves push always listening and starts
    MAVLink only when a connection string is configured, so a deployment can
    add an aircraft by setting one env var.
    """
    global _mavlink_source
    mode = (mode or os.getenv("TELEMETRY_SOURCE", "auto")).lower()
    connection = os.getenv("MAVLINK_CONNECTION", "").strip()

    if mode in ("auto", "mavlink") and connection:
        _mavlink_source = MavlinkSource(
            connection,
            baud=int(os.getenv("MAVLINK_BAUD", "57600")),
            drone_id=os.getenv("DRONE_ID", "DRN-01"),
            callsign=os.getenv("DRONE_CALLSIGN", "Rescue-1"),
        )
        _mavlink_source.start()
    elif mode == "mavlink" and not connection:
        logger.warning("[telemetry] TELEMETRY_SOURCE=mavlink but MAVLINK_CONNECTION is unset")

    logger.info(f"[telemetry] source mode: {mode}"
                + (f" (mavlink: {connection})" if connection else "")
                + " | push endpoint always accepts POST /drone/telemetry")
    return mode


def live_fix(drone_id: str | None = None) -> TelemetryFix | None:
    """
    Freshest fix from any real source, or None to mean "fall back to simulated".

    Push wins ties: it is the explicit, operator-configured path, and a
    deployment running both is bridging something MAVLink cannot see.
    """
    mode = os.getenv("TELEMETRY_SOURCE", "auto").lower()
    if mode == "simulated":
        return None

    candidates: list[TelemetryFix] = []
    if mode in ("auto", "push"):
        fix = _push_source.latest(drone_id)
        if fix:
            candidates.append(fix)
    if mode in ("auto", "mavlink") and _mavlink_source is not None:
        fix = _mavlink_source.latest(drone_id)
        if fix:
            candidates.append(fix)

    if not candidates:
        return None
    return max(candidates, key=lambda f: f.received_at)


def reset_for_tests() -> None:
    global _mavlink_source
    _push_source._fixes.clear()
    if _mavlink_source is not None:
        _mavlink_source.stop()
    _mavlink_source = None
