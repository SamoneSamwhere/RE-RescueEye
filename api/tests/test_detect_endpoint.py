"""
HTTP contract tests for POST /detect against the minimal test app.
No real model weights are loaded (load_all() is never called), so
_run_victim() falls back to its built-in stub detection path — see
routers/detect.py's _run_victim(). NTFY_MIN_CONF/INCIDENT_CONF_MIN are
neutralized in conftest.py so the background alert tasks never fire a
real network call.
"""


def test_detect_reports_an_upright_stub_as_a_person_not_a_casualty(client, bright_frame_b64):
    """
    The stub box is 55x110 — a standing figure. It is still detected and still
    returned; it simply is not promoted to "casualty". This is the whole point
    of the gate in services/casualty.py: the detector finds people, and only
    evidence of a casualty makes one.
    """
    resp = client.post("/detect", json={"frame": bright_frame_b64})
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "visual"
    assert len(body["detections"]) == 1
    det = body["detections"][0]
    assert det["class"] == "person"
    assert body["person_count"] == 1
    assert body["casualty_count"] == 0
    # The reasoning travels with the detection so a reviewer can check it.
    assert det["casualty_score"] < detect_min_score()
    assert det["casualty_reasons"]
    assert "track_id" in det
    assert "id" in det and "timestamp" in det
    assert "frame_id" in body
    assert "inference_time_ms" in body


def detect_min_score() -> float:
    from services import casualty
    return casualty.CASUALTY_MIN_SCORE


def test_detect_promotes_a_prone_body_to_casualty(client, bright_frame_b64, monkeypatch):
    """The other half of the contract: a body lying down does become a casualty."""
    from routers import detect

    monkeypatch.setattr(
        detect, "_run_victim",
        lambda frame: ([{"class": "person", "confidence": 0.9,
                         "bbox": {"x": 80, "y": 60, "w": 180, "h": 60}}], 5.0, []),
    )
    body = client.post("/detect", json={"frame": bright_frame_b64}).json()
    assert body["casualty_count"] == 1
    assert body["detections"][0]["class"] == "casualty"


def test_only_casualties_escalate_to_incidents(client, bright_frame_b64, monkeypatch):
    """
    A bystander is a real detection worth drawing, but it must not create an
    incident or wake anyone up. Before the gate, every person box did both.
    """
    from routers import detect

    escalated = []
    monkeypatch.setattr(detect, "INCIDENT_CONF_MIN", 0.0)
    monkeypatch.setattr(detect, "_maybe_create_incident",
                        lambda det: escalated.append(det) or _noop())
    monkeypatch.setattr(detect, "_send_ntfy_alert", lambda det: _noop())

    client.post("/detect", json={"frame": bright_frame_b64})
    assert escalated == []


async def _noop():
    return None


def test_detect_classifies_the_same_way_in_thermal_mode(client, dark_frame_b64):
    # Thermal changes how the frame is displayed, not what was found. The
    # subject keeps whatever class the gate assigned and the mode is reported
    # separately, so the UI never treats one subject as two different things.
    resp = client.post("/detect", json={"frame": dark_frame_b64})
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "thermal"
    assert body["detections"][0]["class"] == "person"


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
