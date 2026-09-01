"""Unit tests for services/tracker.py (SORT) — pure numeric logic, no model I/O."""
import numpy as np
import pytest
from services.tracker import Sort, _iou


def test_iou_identical_boxes_is_one():
    box = np.array([10.0, 10.0, 50.0, 50.0])
    assert _iou(box, box) == pytest.approx(1.0)


def test_iou_disjoint_boxes_is_zero():
    a = np.array([0.0, 0.0, 10.0, 10.0])
    b = np.array([100.0, 100.0, 110.0, 110.0])
    assert _iou(a, b) == pytest.approx(0.0)


def test_first_detection_creates_a_new_track():
    tracker = Sort(max_age=3, min_hits=1, iou_threshold=0.20)
    dets = np.array([[10, 10, 50, 50, 0.9]], dtype=np.float32)
    out = tracker.update(dets)
    assert out.shape[0] == 1
    track_id_1 = out[0, 5]

    # Same location again — should keep the same track_id, not spawn a new one
    out2 = tracker.update(dets)
    assert out2.shape[0] == 1
    assert out2[0, 5] == track_id_1


def test_distant_detection_spawns_a_different_track():
    tracker = Sort(max_age=3, min_hits=1, iou_threshold=0.20)
    dets_a = np.array([[10, 10, 50, 50, 0.9]], dtype=np.float32)
    out_a = tracker.update(dets_a)
    track_id_a = out_a[0, 5]

    dets_b = np.array([[500, 500, 540, 540, 0.9]], dtype=np.float32)
    out_b = tracker.update(dets_b)

    # The far-away box should not have matched the existing track
    ids_b = set(out_b[:, 5].tolist())
    assert track_id_a not in ids_b or out_b.shape[0] > 1


def test_empty_detections_returns_empty_array():
    tracker = Sort()
    out = tracker.update(np.empty((0, 5), dtype=np.float32))
    assert out.shape == (0, 6)


def test_reset_clears_all_tracks():
    tracker = Sort(max_age=3, min_hits=1)
    dets = np.array([[10, 10, 50, 50, 0.9]], dtype=np.float32)
    tracker.update(dets)
    assert len(tracker._tracks) == 1
    tracker.reset()
    assert len(tracker._tracks) == 0
    assert tracker._frame == 0
