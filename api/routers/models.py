"""
/models/status  — current state of both AI models
/models/reload  — hot-swap weights without restarting the server
"""
from fastapi import APIRouter
from services.yolo_model import model_status, reload_victim, reload_damage

router = APIRouter()


@router.get("/status")
async def get_model_status():
    """
    Returns loaded model versions, weights file, and training metrics.
    version = "custom_v1"        → custom-trained weights are loaded
    version = "pretrained_coco"  → falling back to COCO yolov8n.pt
    version = "stub"             → model failed to load
    """
    return model_status()


@router.post("/reload/victim")
async def hot_reload_victim():
    """Re-read VICTIM_MODEL_PATH and swap the victim detection model in place."""
    return reload_victim()


@router.post("/reload/damage")
async def hot_reload_damage():
    """Re-read DAMAGE_MODEL_PATH and swap the damage classification model in place."""
    return reload_damage()


@router.post("/reload")
async def hot_reload_all():
    """Reload both models."""
    reload_victim()
    reload_damage()
    return model_status()
