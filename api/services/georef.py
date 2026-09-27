"""
Georeferencing a detection to its own ground coordinate.

Until this existed, every detection in a frame was stamped with the position
of the *drone*, which is fine for pinning "something was found near here" on a
map but wrong for any question about a specific subject. The responder veto in
services/casualty.py is exactly such a question: asking whether a rescuer is
standing where the drone is tells you nothing about whether the person in this
particular box is that rescuer, and answering it anyway would let a drone
hovering near one responder suppress every casualty in the frame.

The projection here is deliberately the simple one: a nadir camera over flat
ground. With the lens pointing straight down, the ground distance covered by
the frame is 2 * altitude * tan(fov / 2), which makes the pixels-to-metres
scale a single number, and the only other input is which way the aircraft is
facing. Oblique views need the full pinhole model with terrain, and rather
than approximate that badly this module declines to answer — the caller keeps
the drone position and marks the detection as not subject-located.

Everything depends on altitude, which the simulated flight model does not
produce. Without a real altitude this returns None rather than inventing one:
a confidently wrong coordinate is worse here than an honestly absent one,
because it would put a casualty marker on a street they are not on.
"""
from __future__ import annotations

import math
import os

# Horizontal field of view of the camera. The default is a typical consumer
# drone wide lens; set CAMERA_HFOV_DEG for the aircraft actually flying.
CAMERA_HFOV_DEG = float(os.getenv("CAMERA_HFOV_DEG", "84"))

# Fallback altitude in metres, for footage whose telemetry carries none (a
# recorded clip, the simulated flight model). Unset by default: guessing an
# altitude silently scales every coordinate by the ratio of the guess to the
# truth, and a plausible-looking wrong position is the failure this module
# exists to avoid.
_ALT_ENV = os.getenv("DRONE_ALTITUDE_M", "").strip()
FALLBACK_ALTITUDE_M: float | None = float(_ALT_ENV) if _ALT_ENV else None

# Pitch at or beyond which the nadir approximation holds well enough to use.
NADIR_PITCH_DEG = float(os.getenv("GEOREF_NADIR_PITCH_DEG", "75"))

METRES_PER_DEG_LAT = 111_320.0


def metres_per_pixel(altitude_m: float, frame_width_px: int,
                     hfov_deg: float | None = None) -> float:
    """Ground sampling distance directly below a nadir camera."""
    fov = CAMERA_HFOV_DEG if hfov_deg is None else hfov_deg
    ground_width_m = 2.0 * altitude_m * math.tan(math.radians(fov) / 2.0)
    return ground_width_m / max(1, frame_width_px)


def offset_to_latlng(lat: float, lng: float, north_m: float, east_m: float) -> tuple[float, float]:
    """Moves a coordinate by a local metric offset."""
    dlat = north_m / METRES_PER_DEG_LAT
    # Longitude degrees shrink with latitude; at the equator cos is 1.
    dlng = east_m / (METRES_PER_DEG_LAT * max(0.01, math.cos(math.radians(lat))))
    return lat + dlat, lng + dlng


def locate_detection(bbox: dict, frame_width: int, frame_height: int,
                     drone_lat: float, drone_lng: float,
                     altitude_m: float | None, heading_deg: float,
                     pitch_deg: float | None) -> tuple[float, float] | None:
    """
    Ground position of the subject in `bbox`, or None when it cannot be known.

    None is returned — rather than the drone position — so the caller has to
    decide explicitly what an unlocated detection means, instead of silently
    treating the aircraft's coordinate as the subject's.
    """
    if altitude_m is None:
        altitude_m = FALLBACK_ALTITUDE_M
    if not altitude_m or altitude_m <= 0:
        return None
    if pitch_deg is None or abs(pitch_deg) < NADIR_PITCH_DEG:
        # Oblique: the flat-ground nadir scale does not apply.
        return None

    # Offset of the subject from the centre of the frame, in pixels. Image y
    # grows downward, and a subject below centre is behind the aircraft along
    # its heading, hence the sign flip.
    cx = float(bbox.get("x", 0)) + float(bbox.get("w", 0)) / 2.0
    cy = float(bbox.get("y", 0)) + float(bbox.get("h", 0)) / 2.0
    dx_px = cx - frame_width / 2.0
    dy_px = (frame_height / 2.0) - cy

    mpp = metres_per_pixel(altitude_m, frame_width)
    right_m, forward_m = dx_px * mpp, dy_px * mpp

    # Rotate from camera axes (forward = where the nose points) into compass
    # north/east. Heading is clockwise from north.
    theta = math.radians(heading_deg or 0.0)
    north_m = forward_m * math.cos(theta) - right_m * math.sin(theta)
    east_m = forward_m * math.sin(theta) + right_m * math.cos(theta)

    return offset_to_latlng(drone_lat, drone_lng, north_m, east_m)
