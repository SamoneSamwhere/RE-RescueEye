"""
Fire/smoke hazard boxes and the whole-frame scene label on /detect.

The damage classifier can only say "this frame shows fire"; the D-Fire
detector says where. These tests pin the decode of its ONNX output, and the
contract that hazards ride along on /detect without ever entering the
casualty path — no tracking, no store, no alerts.
"""
import numpy as np
import pytest

from routers import detect


class _FakeFireSession:
    """Mimics the D-Fire yolov8n graph: output [1, 6, N] — cx, cy, w, h, smoke, fire."""
    def __init__(self, boxes, size=640):
        self._boxes = boxes          # (cx, cy, w, h, smoke_score, fire_score), letterboxed space
        self._size = size

    def get_inputs(self):
        size = self._size

        class _I:
            name = "images"
            shape = [1, 3, size, size]
        return [_I()]

    def run(self, _out, _feed):
        n = max(len(self._boxes), 1)
        raw = np.zeros((1, 6, n), dtype=np.float32)
        for i, (cx, cy, w, h, smoke, fire) in enumerate(self._boxes):
            raw[0, :, i] = (cx, cy, w, h, smoke, fire)
        return [raw]


@pytest.fixture()
def frame():
    return np.zeros((720, 1280, 3), dtype=np.uint8)


@pytest.fixture()
def fire_model(monkeypatch):
    def install(boxes):
        monkeypatch.setattr(detect, "get_fire_ort_session", lambda: _FakeFireSession(boxes))
        monkeypatch.setattr(detect, "get_fire_ort_names", lambda: ["smoke", "fire"])
    return install


def test_fire_box_is_decoded_and_mapped_back_to_the_frame(frame, fire_model):
    # 1280x720 letterboxed into 640 scales by 0.5 with 140px vertical padding;
    # the padded centre must land on the frame centre.
    fire_model([(320, 320, 100, 60, 0.0, 0.9)])
    out = detect._run_hazards(frame)
    assert len(out) == 1
    assert out[0]["class"] == "fire"
    assert out[0]["confidence"] == 0.9
    b = out[0]["bbox"]
    assert abs((b["x"] + b["w"] / 2) - 640) < 3
    assert abs((b["y"] + b["h"] / 2) - 360) < 3
    assert (b["w"], b["h"]) == (200, 120)


def test_class_names_come_from_the_graph_order(frame, fire_model):
    fire_model([(320, 320, 100, 60, 0.8, 0.0)])
    assert [h["class"] for h in detect._run_hazards(frame)] == ["smoke"]


def test_smoke_over_fire_is_two_findings_not_a_duplicate(frame, fire_model):
    # Same box, both classes confident: per-class NMS keeps both.
    fire_model([(320, 320, 100, 60, 0.7, 0.0), (320, 320, 100, 60, 0.0, 0.8)])
    assert sorted(h["class"] for h in detect._run_hazards(frame)) == ["fire", "smoke"]


def test_overlapping_fire_boxes_collapse_to_the_stronger(frame, fire_model):
    fire_model([(320, 320, 100, 60, 0.0, 0.9), (322, 321, 100, 60, 0.0, 0.6)])
    out = detect._run_hazards(frame)
    assert len(out) == 1 and out[0]["confidence"] == 0.9


def test_below_threshold_is_dropped(frame, fire_model):
    fire_model([(320, 320, 100, 60, 0.05, 0.1)])
    assert detect._run_hazards(frame) == []


def test_no_model_means_no_hazards(frame, monkeypatch):
    monkeypatch.setattr(detect, "get_fire_ort_session", lambda: None)
    assert detect._run_hazards(frame) == []


def test_detect_returns_hazards_and_scene_beside_casualties(client, bright_frame_b64, fire_model):
    fire_model([(320, 320, 100, 60, 0.0, 0.9)])
    body = client.post("/detect", json={"frame": bright_frame_b64}).json()
    assert [h["class"] for h in body["hazards"]] == ["fire"]
    # A fire is never a casualty and never enters the review store.
    assert all(d["class"] != "fire" for d in body["detections"])
    assert "track_id" not in body["hazards"][0]
    assert {"label", "confidence", "severity"} <= set(body["scene"])


def test_scene_can_be_switched_off(client, bright_frame_b64, monkeypatch):
    monkeypatch.setattr(detect, "SCENE_CLASSIFY", False)
    body = client.post("/detect", json={"frame": bright_frame_b64}).json()
    assert body["scene"] is None
