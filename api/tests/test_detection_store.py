"""Unit tests for services/detection_store.py — fully pure, no model/network I/O."""
import pytest
from services import detection_store as ds


@pytest.fixture(autouse=True)
def _clear_store():
    ds._store.clear()
    yield
    ds._store.clear()


def _det(cls="casualty", confidence=0.9, det_id="d1"):
    return {"id": det_id, "class": cls, "confidence": confidence, "bbox": {"x": 1, "y": 2, "w": 3, "h": 4}}


def test_add_and_get_recent_round_trip():
    ds.add_detections([_det()], inference_time_ms=42.0)
    recent = ds.get_recent(limit=10)
    assert len(recent) == 1
    assert recent[0]["class"] == "casualty"
    assert recent[0]["inference_time_ms"] == 42.0


def test_get_recent_returns_most_recent_first():
    ds.add_detections([_det(det_id="first")], inference_time_ms=1.0)
    ds.add_detections([_det(det_id="second")], inference_time_ms=1.0)
    recent = ds.get_recent(limit=10)
    assert [d["id"] for d in recent] == ["second", "first"]


def test_get_recent_respects_limit():
    for i in range(5):
        ds.add_detections([_det(det_id=f"d{i}")], inference_time_ms=1.0)
    recent = ds.get_recent(limit=2)
    assert len(recent) == 2
    # most recent two, most-recent-first
    assert [d["id"] for d in recent] == ["d4", "d3"]


def test_ring_buffer_evicts_oldest_beyond_max_stored():
    for i in range(ds.MAX_STORED + 10):
        ds.add_detections([_det(det_id=f"d{i}")], inference_time_ms=1.0)
    all_items = ds.get_recent(limit=ds.MAX_STORED)
    assert len(all_items) == ds.MAX_STORED
    ids = {d["id"] for d in all_items}
    # the earliest 10 should have been evicted
    assert "d0" not in ids
    assert "d9" not in ids
    assert f"d{ds.MAX_STORED + 9}" in ids


def test_random_cebu_coord_within_bounding_box():
    for _ in range(50):
        lat, lng = ds._random_cebu_coord()
        assert ds.CEBU_LAT[0] <= lat <= ds.CEBU_LAT[1]
        assert ds.CEBU_LNG[0] <= lng <= ds.CEBU_LNG[1]


def test_added_detections_get_lat_lng_within_bounds():
    ds.add_detections([_det()], inference_time_ms=1.0)
    recent = ds.get_recent(limit=1)
    d = recent[0]
    assert ds.CEBU_LAT[0] <= d["lat"] <= ds.CEBU_LAT[1]
    assert ds.CEBU_LNG[0] <= d["lng"] <= ds.CEBU_LNG[1]
