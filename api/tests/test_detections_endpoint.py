"""HTTP contract tests for GET /detections/recent against the minimal test app."""


def test_recent_detections_is_empty_before_any_detect_call(client):
    resp = client.get("/detections/recent")
    assert resp.status_code == 200
    assert resp.json() == {"detections": []}


def test_recent_detections_reflects_a_detect_call(client, bright_frame_b64):
    client.post("/detect", json={"frame": bright_frame_b64})
    resp = client.get("/detections/recent")
    assert resp.status_code == 200
    body = resp.json()["detections"]
    assert len(body) == 1
    # The stub box is upright, so the gate reports a person (see
    # test_detect_endpoint.py); what matters here is that the record
    # reached the store with its position stamped.
    assert body[0]["class"] == "person"
    assert "lat" in body[0] and "lng" in body[0]


def test_recent_detections_limit_out_of_range_is_422(client):
    resp = client.get("/detections/recent", params={"limit": 0})
    assert resp.status_code == 422
    resp = client.get("/detections/recent", params={"limit": 101})
    assert resp.status_code == 422
