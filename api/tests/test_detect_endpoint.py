"""
HTTP contract tests for POST /detect against the minimal test app.
No real model weights are loaded (load_all() is never called), so
_run_victim() falls back to its built-in stub detection path — see
routers/detect.py's _run_victim(). NTFY_MIN_CONF/INCIDENT_CONF_MIN are
neutralized in conftest.py so the background alert tasks never fire a
real network call.
"""


def test_detect_returns_stub_casualty_detection_in_visual_mode(client, bright_frame_b64):
    resp = client.post("/detect", json={"frame": bright_frame_b64})
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "visual"
    assert len(body["detections"]) == 1
    det = body["detections"][0]
    assert det["class"] == "casualty"
    assert "track_id" in det
    assert "id" in det and "timestamp" in det
    assert "frame_id" in body
    assert "inference_time_ms" in body


def test_detect_keeps_casualty_class_in_thermal_mode(client, dark_frame_b64):
    # Thermal changes how the frame is displayed, not what was found. The class
    # stays "casualty" and the mode is reported separately, so the UI never has
    # to treat one subject as two different things.
    resp = client.post("/detect", json={"frame": dark_frame_b64})
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "thermal"
    assert body["detections"][0]["class"] == "casualty"


def test_detect_force_mode_overrides_brightness_heuristic(client, bright_frame_b64):
    resp = client.post("/detect", json={"frame": bright_frame_b64, "force_mode": "thermal"})
    assert resp.status_code == 200
    assert resp.json()["mode"] == "thermal"


def test_detect_missing_frame_field_is_422(client):
    resp = client.post("/detect", json={})
    assert resp.status_code == 422


def test_detect_invalid_base64_is_422(client):
    resp = client.post("/detect", json={"frame": "not-valid-base64!!"})
    assert resp.status_code == 422


def test_detect_tracker_assigns_same_track_id_across_consecutive_calls(client, bright_frame_b64):
    # The stub detection uses a fixed bbox, so the SORT tracker (which
    # persists across requests) should match it to the same track on frame 2.
    first = client.post("/detect", json={"frame": bright_frame_b64}).json()
    second = client.post("/detect", json={"frame": bright_frame_b64}).json()
    assert first["detections"][0]["track_id"] == second["detections"][0]["track_id"]


def test_detect_skips_the_annotated_frame_when_asked(client, dark_frame_b64):
    """
    Live Monitoring draws its own overlay, so the annotated JPEG is ~60ms of
    thermal colouring and JPEG encoding it throws away. Opting out is what
    allows the detection cadence to keep the box on the casualty.
    """
    body = client.post("/detect", json={"frame": dark_frame_b64, "annotate": False}).json()
    assert body["annotated_frame"] is None
    assert body["detections"]              # detection itself is unaffected


def test_detect_still_annotates_by_default(client, dark_frame_b64):
    body = client.post("/detect", json={"frame": dark_frame_b64}).json()
    assert body["annotated_frame"] is not None
    assert body["annotated_frame"].startswith("data:image/jpeg;base64,")
