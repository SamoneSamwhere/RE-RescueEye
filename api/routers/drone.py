"""
Drone telemetry endpoint.

Exposes the feed drone's live position so the commander's Damage Map and the
responder's mobile map can plot where the aircraft actually is. Before this,
the drone's position was recorded but never readable by any client — both maps
could only show incidents, with no aircraft on screen.
"""
from fastapi import APIRouter
from pydantic import BaseModel

from services.drone_telemetry import current_state

router = APIRouter()


class DroneTelemetry(BaseModel):
    droneId: str
    callsign: str
    lat: float
    lng: float
    headingDeg: float
    speedMps: float
    status: str
    simulated: bool


@router.get("/telemetry", response_model=DroneTelemetry)
async def get_telemetry() -> DroneTelemetry:
    """
    Current position of the feed drone.

    `simulated` is reported honestly so the UI can label the marker rather
    than implying a GPS fix the platform does not yet have.
    """
    state = current_state()
    return DroneTelemetry(
        droneId=state.drone_id,
        callsign=state.callsign,
        lat=round(state.lat, 6),
        lng=round(state.lng, 6),
        headingDeg=round(state.heading_deg, 1),
        speedMps=round(state.speed_mps, 1),
        status="ACTIVE",
        simulated=True,
    )
