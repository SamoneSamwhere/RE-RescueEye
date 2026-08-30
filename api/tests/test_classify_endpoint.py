"""
HTTP contract tests for POST /classify against the minimal test app.
get_damage_model() returns None since load_all() is never called, so
classify_damage() takes its built-in stub path.
"""
from services.yolo_model import DAMAGE_CLASS_NAMES


def test_classify_returns_stub_label_and_severity_fields(client, bright_frame_b64):
    resp = client.post("/classify", json={"frame": bright_frame_b64})
    assert resp.status_code == 200
    body = resp.json()
    assert body["label"] in DAMAGE_CLASS_NAMES
    assert 0.0 <= body["confidence"] <= 1.0
    assert body["severity"] in ("CLEAR", "MINOR", "MODERATE", "CRITICAL")
    assert "suggested_action" in body
    assert body["model_version"] == "stub"


def test_classify_missing_frame_field_is_422(client):
    resp = client.post("/classify", json={})
    assert resp.status_code == 422


def test_classify_invalid_base64_is_422(client):
    resp = client.post("/classify", json={"frame": "%%%not-base64%%%"})
    assert resp.status_code == 422
