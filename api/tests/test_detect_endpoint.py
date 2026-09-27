"""
HTTP contract tests for POST /detect against the minimal test app.
No real model weights are loaded (load_all() is never called), so
_run_victim() falls back to its built-in stub detection path — see
routers/detect.py's _run_victim(). NTFY_MIN_CONF/INCIDENT_CONF_MIN are
neutralized in conftest.py so the background alert tasks never fire a
real network call.
"""


def test_detect_returns_the_casualty_in_visual_mode(client, prone_victim, bright_frame_b64):
    resp = client.post("/detect", json={"frame": bright_frame_b64})
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "visual"
    assert len(body["detections"]) == 1
    det = body["detections"][0]
    assert det["class"] == "casualty"
    assert body["casualty_count"] == 1
    # The reasoning travels with the detection so a reviewer can check it.
    assert det["casualty_score"] >= detect_min_score()
    assert det["casualty_reasons"]
    assert "track_id" in det
    assert "id" in det and "timestamp" in det
    assert "frame_id" in body
    assert "inference_time_ms" in body


def detect_min_score() -> float:
    from services import casualty
    return casualty.CASUALTY_MIN_SCORE


def test_a_person_walking_around_is_not_reported_at_all(client, bright_frame_b64, monkeypatch):
    """
    The requirement this whole gate exists for: someone on their feet in the
    search area must not reach an operator. Not a grey box, not a row in the
    review queue, not a record in the store — nothing. They are still detected
    and tracked internally, which is what lets them become a casualty later if
    they collapse.
    """
    from routers import detect
    from services import detection_store

    monkeypatch.setattr(
        detect, "_run_victim",
        lambda frame: ([{"class": "person", "confidence": 0.9,
                         "bbox": {"x": 80, "y": 60, "w": 55, "h": 170}}], 5.0, []),
    )
    body = client.post("/detect", json={"frame": bright_frame_b64}).json()

    assert body["detections"] == []
    assert body["casualty_count"] == 0
    # But the system is not pretending it saw nothing.
    assert body["person_count"] == 1
    assert body["suppressed_count"] == 1
    assert body["annotated_frame"] is None
    assert detection_store.get_recent() == []


def test_suppressed_people_can_be_reported_for_tuning(client, bright_frame_b64, monkeypatch):
    from routers import detect

    monkeypatch.setattr(
        detect, "_run_victim",
        lambda frame: ([{"class": "person", "confidence": 0.9,
                         "bbox": {"x": 80, "y": 60, "w": 55, "h": 170}}], 5.0, []),
    )
    monkeypatch.setattr(detect, "REPORT_NON_CASUALTIES", True)
    body = client.post("/detect", json={"frame": bright_frame_b64}).json()
    assert [d["class"] for d in body["detections"]] == ["person"]
    assert body["casualty_count"] == 0


def test_only_casualties_escalate_to_incidents(client, bright_frame_b64, monkeypatch):
    """A suppressed person must not create an incident or wake anyone up."""
    from routers import detect

    escalated = []
    monkeypatch.setattr(detect, "INCIDENT_CONF_MIN", 0.0)
    monkeypatch.setattr(
        detect, "_run_victim",
        lambda frame: ([{"class": "person", "confidence": 0.9,
                         "bbox": {"x": 80, "y": 60, "w": 55, "h": 170}}], 5.0, []),
    )
    monkeypatch.setattr(detect, "_maybe_create_incident",
                        lambda det: escalated.append(det) or _noop())
    monkeypatch.setattr(detect, "_send_ntfy_alert", lambda det: _noop())

    client.post("/detect", json={"frame": bright_frame_b64})
    assert escalated == []


async def _noop():
    return None


def test_detect_classifies_the_same_way_in_thermal_mode(client, prone_victim, dark_frame_b64):
    # Thermal changes how the frame is displayed, not what was found. The
    # subject keeps whatever class the gate assigned and the mode is reported
    # separately, so the UI never treats one subject as two different things.
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


def test_detect_tracker_assigns_same_track_id_across_consecutive_calls(client, prone_victim, bright_frame_b64):
    # The detection uses a fixed bbox, so the SORT tracker (which persists
    # across requests) should match it to the same track on frame 2.
    first = client.post("/detect", json={"frame": bright_frame_b64}).json()
    second = client.post("/detect", json={"frame": bright_frame_b64}).json()
    assert first["detections"][0]["track_id"] == second["detections"][0]["track_id"]


def test_detect_skips_the_annotated_frame_when_asked(client, prone_victim, dark_frame_b64):
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
