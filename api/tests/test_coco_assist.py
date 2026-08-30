"""
Unit tests for the close-range COCO assist and the merge that combines it with
the custom victim model.

The custom weights are VisDrone-scale (targets a few dozen pixels tall), so a
body filling much of the frame is missed. These tests pin the behaviour that
fixes that: the assist adds detections, it never replaces the primary model's,
and overlapping boxes collapse to one.
"""
import numpy as np
import pytest

from routers import detect


def _det(x, y, w, h, conf, cls="casualty"):
    return {"class": cls, "confidence": conf, "bbox": {"x": x, "y": y, "w": w, "h": h}}


class _FakeBox:
    def __init__(self, xyxy, conf):
        self.xyxy = [np.array(xyxy, dtype=np.float32)]
        self.conf = [np.float32(conf)]


class _FakeResult:
    def __init__(self, boxes):
        self.boxes = boxes


class _FakeModel:
    """Stands in for an Ultralytics model; records the kwargs it was called with."""
    def __init__(self, boxes=(), raises=False):
        self._boxes = boxes
        self._raises = raises
        self.calls = []

    def __call__(self, frame, **kwargs):
        self.calls.append(kwargs)
        if self._raises:
            raise RuntimeError("model exploded")
        return [_FakeResult([_FakeBox(b, c) for b, c in self._boxes])]


@pytest.fixture()
def frame():
    return np.zeros((720, 1280, 3), dtype=np.uint8)


# ── merge ─────────────────────────────────────────────────────────────────────

def test_merge_keeps_both_when_boxes_are_far_apart():
    primary = [_det(10, 10, 20, 20, 0.4)]
    assist = [_det(600, 400, 200, 300, 0.8)]
    merged = detect._merge_detections(primary, assist)
    assert len(merged) == 2


def test_merge_collapses_overlapping_boxes_to_the_more_confident_one():
    primary = [_det(100, 100, 200, 300, 0.30)]
    assist = [_det(105, 104, 198, 295, 0.85)]      # same body, better score
    merged = detect._merge_detections(primary, assist)
    assert len(merged) == 1
    assert merged[0]["confidence"] == 0.85


def test_merge_handles_empty_inputs():
    assert detect._merge_detections([], []) == []
    only = [_det(1, 2, 3, 4, 0.5)]
    assert detect._merge_detections(only, []) == only
    assert detect._merge_detections([], only) == only


def test_merge_preserves_small_custom_detections_alongside_a_big_body():
    """The whole point: distant VisDrone-scale hits must survive the merge."""
    primary = [_det(50, 50, 14, 18, 0.33), _det(900, 120, 12, 16, 0.29)]
    assist = [_det(500, 300, 260, 340, 0.78)]
    merged = detect._merge_detections(primary, assist)
    assert len(merged) == 3
    assert sorted(d["confidence"] for d in merged) == [0.29, 0.33, 0.78]


# ── assist pass ───────────────────────────────────────────────────────────────

def test_assist_returns_casualty_boxes_clamped_to_the_frame(frame, monkeypatch):
    model = _FakeModel(boxes=[((100, 50, 400, 600), 0.77)])
    monkeypatch.setattr(detect, "get_coco_assist", lambda: model)
    out = detect._run_coco_assist(frame)
    assert len(out) == 1
    assert out[0]["class"] == "casualty"
    assert out[0]["confidence"] == 0.77
    assert out[0]["bbox"] == {"x": 100, "y": 50, "w": 300, "h": 550}


def test_assist_clamps_boxes_that_run_past_the_edge(frame, monkeypatch):
    model = _FakeModel(boxes=[((1200, 700, 1400, 900), 0.5)])
    monkeypatch.setattr(detect, "get_coco_assist", lambda: model)
    box = detect._run_coco_assist(frame)[0]["bbox"]
    assert box["x"] + box["w"] <= 1280
    assert box["y"] + box["h"] <= 720


def test_assist_requests_person_class_only(frame, monkeypatch):
    model = _FakeModel(boxes=[((10, 10, 20, 20), 0.5)])
    monkeypatch.setattr(detect, "get_coco_assist", lambda: model)
    detect._run_coco_assist(frame)
    assert model.calls[0]["classes"] == [detect.PERSON_CLASS]
    assert model.calls[0]["imgsz"] == detect.COCO_ASSIST_IMGSZ


def test_assist_is_a_no_op_when_not_loaded(frame, monkeypatch):
    monkeypatch.setattr(detect, "get_coco_assist", lambda: None)
    assert detect._run_coco_assist(frame) == []


def test_assist_failure_does_not_break_detection(frame, monkeypatch):
    """A broken assist must degrade to custom-only, never take the request down."""
    monkeypatch.setattr(detect, "get_coco_assist", lambda: _FakeModel(raises=True))
    assert detect._run_coco_assist(frame) == []


def test_run_victim_merges_assist_into_primary(frame, monkeypatch):
    monkeypatch.setattr(detect, "_run_victim_primary",
                        lambda f: ([_det(20, 20, 15, 18, 0.31)], 12.0))
    monkeypatch.setattr(detect, "get_coco_assist",
                        lambda: _FakeModel(boxes=[((500, 300, 760, 640), 0.8)]))
    dets, ms = detect._run_victim(frame)
    assert len(dets) == 2
    assert max(d["confidence"] for d in dets) == 0.8
    assert ms >= 0


def test_run_victim_returns_primary_alone_when_assist_is_off(frame, monkeypatch):
    primary = [_det(20, 20, 15, 18, 0.31)]
    monkeypatch.setattr(detect, "_run_victim_primary", lambda f: (primary, 12.0))
    monkeypatch.setattr(detect, "get_coco_assist", lambda: None)
    dets, ms = detect._run_victim(frame)
    assert dets == primary
    assert ms == 12.0


# ── GPU (ONNX) assist path ────────────────────────────────────────────────────

class _FakeOrtSession:
    """Mimics the yolov8n ONNX graph: output [1, 84, N], row 4 = person score."""
    def __init__(self, boxes, size=960):
        self._boxes = boxes          # (cx, cy, w, h, person_score) in letterboxed space
        self._size = size

    def get_inputs(self):
        class _I:
            name = "images"
            shape = [1, 3, self._size, self._size]
        return [_I()]

    def run(self, _out, _feed):
        n = max(len(self._boxes), 1)
        raw = np.zeros((1, 84, n), dtype=np.float32)
        for i, (cx, cy, w, h, sc) in enumerate(self._boxes):
            raw[0, 0, i], raw[0, 1, i], raw[0, 2, i], raw[0, 3, i] = cx, cy, w, h
            raw[0, 4, i] = sc
        return [raw]


def test_ort_assist_decodes_person_row_and_maps_back_to_frame(frame, monkeypatch):
    # A 1280x720 frame letterboxed into 960 scales by 0.75 and is padded 165px
    # vertically; a box at the padded centre must land at the frame centre.
    monkeypatch.setattr(detect, "get_coco_ort_session",
                        lambda: _FakeOrtSession([(480, 480, 150, 300, 0.9)]))
    out = detect._run_coco_assist_ort(frame)
    assert len(out) == 1
    b = out[0]["bbox"]
    assert out[0]["class"] == "casualty"
    assert out[0]["confidence"] == 0.9
    assert abs((b["x"] + b["w"] / 2) - 640) < 3      # frame centre x
    assert abs((b["y"] + b["h"] / 2) - 360) < 3      # frame centre y


def test_ort_assist_filters_below_threshold(frame, monkeypatch):
    monkeypatch.setattr(detect, "get_coco_ort_session",
                        lambda: _FakeOrtSession([(480, 480, 100, 100, 0.01)]))
    assert detect._run_coco_assist_ort(frame) == []


def test_ort_assist_returns_none_without_a_session(frame, monkeypatch):
    """None (not []) so the caller knows to try the PyTorch path."""
    monkeypatch.setattr(detect, "get_coco_ort_session", lambda: None)
    assert detect._run_coco_assist_ort(frame) is None


def test_assist_prefers_gpu_and_skips_pytorch(frame, monkeypatch):
    torch_model = _FakeModel(boxes=[((0, 0, 10, 10), 0.9)])
    monkeypatch.setattr(detect, "get_coco_ort_session",
                        lambda: _FakeOrtSession([(480, 480, 150, 300, 0.8)]))
    monkeypatch.setattr(detect, "get_coco_assist", lambda: torch_model)
    out = detect._run_coco_assist(frame)
    assert len(out) == 1
    assert torch_model.calls == []          # PyTorch never invoked


def test_assist_falls_back_to_pytorch_when_ort_errors(frame, monkeypatch):
    class _Boom:
        def get_inputs(self): raise RuntimeError("session gone")
    torch_model = _FakeModel(boxes=[((100, 50, 400, 600), 0.7)])
    monkeypatch.setattr(detect, "get_coco_ort_session", lambda: _Boom())
    monkeypatch.setattr(detect, "get_coco_assist", lambda: torch_model)
    out = detect._run_coco_assist(frame)
    assert len(out) == 1
    assert out[0]["confidence"] == 0.7
    assert len(torch_model.calls) == 1
