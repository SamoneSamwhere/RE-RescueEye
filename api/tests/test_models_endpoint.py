"""
HTTP contract test for GET /models/status against the minimal test app.
The /reload* endpoints are deliberately NOT tested here — they call real
weight-loading code (reload_victim/reload_damage), which is out of scope
for this suite per the test plan.
"""


def test_models_status_shape(client):
    resp = client.get("/models/status")
    assert resp.status_code == 200
    body = resp.json()
    assert "victim_model" in body
    assert "damage_model" in body
    for key in ("version", "weights", "loaded", "is_custom", "loaded_at"):
        assert key in body["victim_model"]
        assert key in body["damage_model"]
