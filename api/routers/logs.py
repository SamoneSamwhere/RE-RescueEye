"""
Inference log router — appends each detection result to logs/inference_log.jsonl
and exposes a summary endpoint.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter

router = APIRouter()

LOG_DIR  = Path(os.getenv("LOG_DIR", Path(__file__).parent.parent / "logs"))
LOG_FILE = LOG_DIR / "inference_log.jsonl"

LOG_DIR.mkdir(parents=True, exist_ok=True)


def append_log(entry: dict) -> None:
    """Append one inference result line to the JSONL log file."""
    line = json.dumps({**entry, "logged_at": datetime.now(timezone.utc).isoformat()})
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


@router.get("/summary")
async def log_summary():
    """Return aggregate stats from the inference log."""
    if not LOG_FILE.exists():
        return {"total_frames": 0, "total_detections": 0, "avg_inference_ms": 0, "log_file": str(LOG_FILE)}

    total_frames     = 0
    total_detections = 0
    total_ms         = 0.0

    with LOG_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            try:
                record = json.loads(line)
                total_frames     += 1
                total_detections += record.get("detection_count", 0)
                total_ms         += record.get("inference_ms",    0)
            except json.JSONDecodeError:
                pass

    return {
        "total_frames":     total_frames,
        "total_detections": total_detections,
        "avg_inference_ms": round(total_ms / total_frames, 1) if total_frames else 0,
        "log_file":         str(LOG_FILE),
    }
