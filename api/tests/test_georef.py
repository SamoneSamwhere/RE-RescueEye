"""
Tests for per-detection georeferencing.

The value of this module is not precision — it is a flat-ground nadir
approximation — but knowing when it must not answer. Every detection used to
inherit the drone's position, and the responder veto cannot be asked about a
specific subject on that basis.
"""
import math

import pytest

from services import georef


FRAME_W, FRAME_H = 1280, 720
DRONE_LAT, DRONE_LNG = 10.3157, 123.8854


def _bbox_at(cx, cy, w=60, h=80):
    return {"x": cx - w / 2, "y": cy - h / 2, "w": w, "h": h}


def test_metres_per_pixel_scales_with_altitude():
    low = georef.metres_per_pixel(20, FRAME_W)
    high = georef.metres_per_pixel(40, FRAME_W)
    assert high == pytest.approx(low * 2)


def test_ground_width_matches_the_field_of_view():
    alt, fov = 50.0, 90.0
    mpp = georef.metres_per_pixel(alt, FRAME_W, hfov_deg=fov)
    # A 90-degree lens at 50m sees 100m across: 2 * 50 * tan(45).
    assert mpp * FRAME_W == pytest.approx(2 * alt * math.tan(math.radians(45)))


def test_subject_at_frame_centre_is_under_the_drone():
    fix = georef.locate_detection(_bbox_at(FRAME_W / 2, FRAME_H / 2), FRAME_W, FRAME_H,
                                  DRONE_LAT, DRONE_LNG, altitude_m=40,
                                  heading_deg=0, pitch_deg=-90)
    assert fix is not None
    assert fix[0] == pytest.approx(DRONE_LAT, abs=1e-6)
    assert fix[1] == pytest.approx(DRONE_LNG, abs=1e-6)


def test_subject_above_centre_is_north_when_heading_north():
    fix = georef.locate_detection(_bbox_at(FRAME_W / 2, FRAME_H / 4), FRAME_W, FRAME_H,
                                  DRONE_LAT, DRONE_LNG, altitude_m=40,
                                  heading_deg=0, pitch_deg=-90)
    assert fix[0] > DRONE_LAT
    assert fix[1] == pytest.approx(DRONE_LNG, abs=1e-6)


def test_heading_rotates_the_offset():
    """Facing east, the same 'ahead of the aircraft' pixel is east, not north."""
    fix = georef.locate_detection(_bbox_at(FRAME_W / 2, FRAME_H / 4), FRAME_W, FRAME_H,
                                  DRONE_LAT, DRONE_LNG, altitude_m=40,
                                  heading_deg=90, pitch_deg=-90)
    assert fix[1] > DRONE_LNG
    assert fix[0] == pytest.approx(DRONE_LAT, abs=1e-6)


def test_offset_distance_is_plausible():
    """A subject at the frame edge should be about half the ground width away."""
    alt = 40.0
    fix = georef.locate_detection(_bbox_at(FRAME_W - 30, FRAME_H / 2), FRAME_W, FRAME_H,
                                  DRONE_LAT, DRONE_LNG, altitude_m=alt,
                                  heading_deg=0, pitch_deg=-90)
    half_width = alt * math.tan(math.radians(georef.CAMERA_HFOV_DEG) / 2)
    east_m = (fix[1] - DRONE_LNG) * georef.METRES_PER_DEG_LAT * math.cos(math.radians(DRONE_LAT))
    assert east_m == pytest.approx(half_width, rel=0.15)


# ── When it must decline ──────────────────────────────────────────────────────

def test_unknown_altitude_gives_no_fix(monkeypatch):
    """
    A guessed altitude scales every coordinate by the ratio of guess to truth,
    putting a casualty marker on a street they are not on.
    """
    monkeypatch.setattr(georef, "FALLBACK_ALTITUDE_M", None)
    assert georef.locate_detection(_bbox_at(640, 360), FRAME_W, FRAME_H,
                                   DRONE_LAT, DRONE_LNG, altitude_m=None,
                                   heading_deg=0, pitch_deg=-90) is None


def test_oblique_camera_gives_no_fix():
    """The flat-ground nadir scale does not hold when the lens looks outward."""
    assert georef.locate_detection(_bbox_at(640, 360), FRAME_W, FRAME_H,
                                   DRONE_LAT, DRONE_LNG, altitude_m=40,
                                   heading_deg=0, pitch_deg=-30) is None


def test_unknown_pitch_gives_no_fix():
    assert georef.locate_detection(_bbox_at(640, 360), FRAME_W, FRAME_H,
                                   DRONE_LAT, DRONE_LNG, altitude_m=40,
                                   heading_deg=0, pitch_deg=None) is None


def test_zero_altitude_gives_no_fix():
    assert georef.locate_detection(_bbox_at(640, 360), FRAME_W, FRAME_H,
                                   DRONE_LAT, DRONE_LNG, altitude_m=0,
                                   heading_deg=0, pitch_deg=-90) is None


def test_configured_fallback_altitude_is_used(monkeypatch):
    """Recorded footage carries no telemetry; an operator can supply the height."""
    monkeypatch.setattr(georef, "FALLBACK_ALTITUDE_M", 35.0)
    fix = georef.locate_detection(_bbox_at(FRAME_W / 2, FRAME_H / 4), FRAME_W, FRAME_H,
                                  DRONE_LAT, DRONE_LNG, altitude_m=None,
                                  heading_deg=0, pitch_deg=-90)
    assert fix is not None
    assert fix[0] > DRONE_LAT
