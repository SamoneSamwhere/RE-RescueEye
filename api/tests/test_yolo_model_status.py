"""
Unit tests for services/yolo_model.py's pure/filesystem-only functions.
Deliberately never calls load_all()/reload_victim()/reload_damage() — those
load real ONNX/PyTorch weights and are out of scope for a fast unit suite.
"""
from services import yolo_model


def test_model_status_shape_without_loading_anything():
    status = yolo_model.model_status()
    assert "victim_model" in status
    assert "damage_model" in status
    for key in ("version", "weights", "loaded", "is_custom", "loaded_at"):
        assert key in status["victim_model"]
        assert key in status["damage_model"]


def test_model_info_shape_without_loading_anything():
    info = yolo_model.model_info()
    assert set(info.keys()) == {"victim", "damage"}
    for entry in info.values():
        assert "loaded" in entry
        assert "version" in entry


def test_resolve_victim_weights_finds_real_onnx_file_on_disk():
    # Regression check: if this ever returns False/a fallback path, the
    # actual victim_best.onnx weight file has gone missing or been renamed.
    path, is_custom = yolo_model._resolve_victim_weights()
    assert is_custom is True
    assert path.endswith("victim_best.onnx")
    assert (yolo_model.MODELS_DIR / "victim_best.onnx").exists()


def test_resolve_damage_weights_finds_real_pt_file_on_disk():
    path, is_custom = yolo_model._resolve_damage_weights()
    assert is_custom is True
    assert path.endswith("damage_best.pt")
    assert (yolo_model.MODELS_DIR / "damage_best.pt").exists()
