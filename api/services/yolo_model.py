"""
RescueEye — dual-model singleton service.

Manages two YOLOv8 models independently:
  _victim_model   — detection (casualty localisation)
  _damage_model   — classification (flood/fire/structural/no_damage)

Priority order for each:
  1. Custom-trained weights (VICTIM_MODEL_PATH / DAMAGE_MODEL_PATH env vars)
  2. Generic COCO pretrained fallback (MODEL_PATH / yolov8n.pt)

Hot-swap is supported: call reload_victim() / reload_damage() to swap weights
at runtime without restarting the server (used by /models/reload endpoint).
"""
from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger("rescueeye.yolo")

# ── COCO class constants (used by detect.py when victim model is COCO) ────────
# COCO's own class index for a human; the label the API emits is "casualty".
PERSON_CLASS = 0
DAMAGE_PROXY_CLASSES: dict[int, str] = {
    72: "fire_damage",
    8:  "flood_damage",
    7:  "flood_damage",
    2:  "structural_damage",
    5:  "structural_damage",
    56: "structural_damage",
}

# ── Damage classification labels (custom model) ───────────────────────────────
DAMAGE_CLASS_NAMES = ["flood_damage", "fire_damage", "structural_damage", "no_damage"]


@dataclass
class ModelState:
    model:        Any   = None
    weights:      str   = ""
    version:      str   = "none"
    loaded_at:    str   = ""
    is_custom:    bool  = False
    map50:        float = 0.0
    accuracy:     float = 0.0
    meta:         dict  = field(default_factory=dict)


_victim = ModelState()
_damage = ModelState()

# Close-range assist. The custom victim weights are trained on VisDrone —
# pedestrians a few dozen pixels tall, seen from altitude — so they miss a body
# filling a large part of the frame, which is exactly what an uploaded clip
# shot from low altitude looks like. A generic COCO detector covers that case;
# the two are merged in detect.py rather than one replacing the other.
_coco_assist = ModelState()

# ── Paths ─────────────────────────────────────────────────────────────────────
REPO_ROOT  = Path(__file__).parent.parent
MODELS_DIR = REPO_ROOT / "models"


def _load_meta(meta_file: Path) -> dict:
    try:
        return json.loads(meta_file.read_text())
    except Exception:
        return {}


def _load_single(weights_path: str, task: str, imgsz: int | None = None) -> tuple[Any, bool]:
    """Load a YOLO model via Ultralytics; returns (model, success)."""
    try:
        from ultralytics import YOLO  # type: ignore
        m = YOLO(weights_path)
        dummy = np.zeros((480, 640, 3), dtype="uint8")
        # An exported ONNX graph has its input size baked in, so warming up at
        # the Ultralytics default (640) raises on a model exported at another
        # size. The training imgsz recorded in *_meta.json is the right one.
        warm = {"imgsz": int(imgsz)} if imgsz else {}
        m(dummy, verbose=False, **warm)
        logger.info(f"[yolo] loaded {task} model on CPU via Ultralytics")
        return m, True
    except Exception as exc:
        logger.warning(f"[yolo] Failed to load {weights_path}: {exc}")
        return None, False


def _dml_available() -> bool:
    """True when onnxruntime-directml is installed and a GPU adapter is present."""
    try:
        import onnxruntime as ort
        return "DmlExecutionProvider" in ort.get_available_providers()
    except Exception:
        return False


def _cuda_available() -> bool:
    try:
        import torch
        return torch.cuda.is_available()
    except Exception:
        return False


# ── DirectML ONNX session for victim model (GPU, no PyTorch needed) ───────────
_victim_ort_session: Any = None


def _load_victim_ort(onnx_path: str) -> None:
    """Load victim_best.onnx into an ONNX Runtime session using DirectML."""
    global _victim_ort_session
    try:
        import onnxruntime as ort
        providers = (["DmlExecutionProvider", "CPUExecutionProvider"]
                     if _dml_available() else ["CPUExecutionProvider"])
        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        _victim_ort_session = ort.InferenceSession(onnx_path, sess_options=opts, providers=providers)
        active = _victim_ort_session.get_providers()[0]
        logger.info(f"[yolo] victim ONNX session ready — provider: {active}")
    except Exception as exc:
        logger.warning(f"[yolo] ORT session failed: {exc}")
        _victim_ort_session = None


def get_victim_ort_session() -> Any:
    return _victim_ort_session


# ── DirectML ONNX session for the COCO assist ────────────────────────────────
# Ultralytics runs the assist through PyTorch, and the torch wheel on Windows is
# CPU-only — measured at 220ms a frame, several times the cost of everything
# else in the request. The same weights exported to ONNX run on DirectML in 9ms.
_coco_ort_session: Any = None


def _load_coco_ort(onnx_path: str) -> None:
    global _coco_ort_session
    try:
        import onnxruntime as ort
        providers = (["DmlExecutionProvider", "CPUExecutionProvider"]
                     if _dml_available() else ["CPUExecutionProvider"])
        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        _coco_ort_session = ort.InferenceSession(onnx_path, sess_options=opts, providers=providers)
        logger.info(f"[yolo] COCO assist ONNX ready — provider: {_coco_ort_session.get_providers()[0]}")
    except Exception as exc:
        logger.warning(f"[yolo] COCO assist ORT session failed ({exc}) — falling back to PyTorch")
        _coco_ort_session = None


def get_coco_ort_session() -> Any:
    return _coco_ort_session


def _resolve_victim_weights() -> tuple[str, bool]:
    """Return (weights_path, is_custom). Prefers ONNX over PT for faster CPU inference."""
    onnx = MODELS_DIR / "victim_best.onnx"
    if onnx.exists():
        return str(onnx), True
    custom = os.getenv("VICTIM_MODEL_PATH", str(MODELS_DIR / "victim_best.pt"))
    if Path(custom).exists():
        return custom, True
    fallback = os.getenv("MODEL_PATH", "yolov8n.pt")
    return fallback, False


def _resolve_damage_weights() -> tuple[str, bool]:
    custom = os.getenv("DAMAGE_MODEL_PATH", str(MODELS_DIR / "damage_best.pt"))
    if Path(custom).exists():
        return custom, True
    return "yolov8n-cls.pt", False


def _init_model(state: ModelState, weights: str, is_custom: bool,
                meta_file: Path | None = None, task: str = "detect") -> None:
    meta = _load_meta(meta_file) if meta_file and meta_file.exists() else {}
    logger.info(f"[yolo] Loading {'custom' if is_custom else 'pretrained'} {task} model: {weights}")
    t0 = time.perf_counter()
    model, ok = _load_single(weights, task, imgsz=meta.get("imgsz"))
    elapsed = (time.perf_counter() - t0) * 1000

    state.model     = model
    state.weights   = weights
    state.is_custom = is_custom
    state.loaded_at = datetime.now(timezone.utc).isoformat()
    state.version   = "custom_v1" if is_custom else "pretrained_coco"

    if model is not None:
        logger.info(f"[yolo] {task} model ready in {elapsed:.0f}ms — {state.version}")
    else:
        logger.warning(f"[yolo] {task} model failed to load — stub mode")
        state.version = "stub"

    if meta:
        state.meta     = meta
        state.map50    = meta.get("map50", 0.0)
        state.accuracy = meta.get("accuracy_top1", 0.0)


# ── Public API ────────────────────────────────────────────────────────────────

COCO_ASSIST_ENABLED = os.getenv("COCO_ASSIST", "true").lower() == "true"
COCO_ASSIST_WEIGHTS = os.getenv("COCO_ASSIST_WEIGHTS", "yolov8n.pt")


def get_coco_assist() -> Any:
    """Generic COCO detector used to catch close-range bodies, or None."""
    return _coco_assist.model


def coco_assist_state() -> ModelState:
    return _coco_assist


def load_all() -> None:
    """Called once from FastAPI lifespan. Loads both models."""
    v_weights, v_custom = _resolve_victim_weights()
    _init_model(_victim, v_weights, v_custom,
                meta_file=MODELS_DIR / "victim_meta.json", task="detect")

    # Load GPU-accelerated ONNX session for victim model (DirectML)
    onnx_path = str(MODELS_DIR / "victim_best.onnx")
    if Path(onnx_path).exists():
        _load_victim_ort(onnx_path)

    d_weights, d_custom = _resolve_damage_weights()
    _init_model(_damage, d_weights, d_custom,
                meta_file=MODELS_DIR / "damage_meta.json", task="classify")

    if COCO_ASSIST_ENABLED:
        coco_onnx = REPO_ROOT / os.getenv("COCO_ASSIST_ONNX", "yolov8n.onnx")
        if coco_onnx.exists():
            _load_coco_ort(str(coco_onnx))
            _coco_assist.weights = str(coco_onnx)
            _coco_assist.version = "pretrained_coco"
        if _coco_ort_session is None:
            # No ONNX export available — the PyTorch path still works, just slower.
            _init_model(_coco_assist, COCO_ASSIST_WEIGHTS, is_custom=False, task="coco-assist")


def get_victim_model() -> Any:
    return _victim.model


def get_damage_model() -> Any:
    return _damage.model


def victim_state() -> ModelState:
    return _victim


def damage_state() -> ModelState:
    return _damage


def reload_victim() -> dict:
    """Hot-swap victim model weights (no server restart needed)."""
    weights, is_custom = _resolve_victim_weights()
    _init_model(_victim, weights, is_custom,
                meta_file=MODELS_DIR / "victim_meta.json", task="detect")
    return model_status()


def reload_damage() -> dict:
    """Hot-swap damage model weights."""
    weights, is_custom = _resolve_damage_weights()
    _init_model(_damage, weights, is_custom,
                meta_file=MODELS_DIR / "damage_meta.json", task="classify")
    return model_status()


def model_status() -> dict:
    """Serialisable status dict — returned by GET /models/status."""
    def _state_dict(s: ModelState, kind: str) -> dict:
        d: dict = {
            "version":     s.version,
            "weights":     s.weights,
            "loaded":      s.model is not None,
            "is_custom":   s.is_custom,
            "loaded_at":   s.loaded_at,
        }
        if kind == "victim" and s.map50:
            d["map50"] = s.map50
        if kind == "damage" and s.accuracy:
            d["accuracy"] = s.accuracy
        return d

    return {
        "victim_model": _state_dict(_victim, "victim"),
        "damage_model": _state_dict(_damage, "damage"),
        "coco_assist": {
            "enabled":  COCO_ASSIST_ENABLED,
            "loaded":   _coco_assist.model is not None or _coco_ort_session is not None,
            "weights":  _coco_assist.weights,
            "runtime":  "onnx-directml" if _coco_ort_session is not None else
                        ("pytorch-cpu" if _coco_assist.model is not None else "none"),
        },
    }


def model_info() -> dict:
    """Legacy compat — used by /health."""
    return {
        "victim": {"loaded": _victim.model is not None, "version": _victim.version},
        "damage": {"loaded": _damage.model is not None, "version": _damage.version},
    }
