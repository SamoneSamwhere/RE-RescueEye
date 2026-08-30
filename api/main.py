import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()  # MUST be before any router imports so env vars are available at module load

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import detect, classify, detections
from routers import stream, models as models_router, logs as logs_router
from routers import drone as drone_router
from routers import media as media_router
from services import feed_registry
from services.yolo_model import load_all, model_info, model_status

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("rescueeye.main")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Load both AI models (victim detection + damage classification)
    logger.info("[startup] Loading AI models ...")
    load_all()
    status = model_status()
    logger.info(f"[startup] Victim model: {status['victim_model']['version']}  "
                f"({status['victim_model']['weights']})")
    logger.info(f"[startup] Damage model: {status['damage_model']['version']}  "
                f"({status['damage_model']['weights']})")

    # Start MJPEG stream producer
    logger.info("[startup] Starting stream producer ...")
    stream.startup()

    yield

    logger.info("[shutdown] Stopping stream producer ...")
    stream.shutdown()


app = FastAPI(
    title="RescueEye Detection API",
    description="Phase 3 — custom YOLOv8 victim detection + damage classification",
    version="0.3.0",
    lifespan=lifespan,
)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detect.router,         prefix="/detect",     tags=["detection"])
app.include_router(classify.router,       prefix="/classify",   tags=["classification"])
app.include_router(stream.router,         prefix="/stream",     tags=["stream"])
app.include_router(detections.router,     prefix="/detections", tags=["detections"])
app.include_router(models_router.router,  prefix="/models",     tags=["models"])
app.include_router(logs_router.router,    prefix="/logs",       tags=["logs"])
app.include_router(drone_router.router,   prefix="/drone",      tags=["drone"])
app.include_router(media_router.router,   prefix="/media",      tags=["media"])


@app.get("/health", tags=["system"])
async def health():
    # stream_active/stream_source describe the primary feed, preserving the
    # shape this endpoint had when the platform carried a single feed.
    primary = feed_registry.primary_feed()
    return {
        "status":        "ok",
        "service":       "rescueeye-api",
        "version":       "0.3.0",
        "phase":         "3-custom-models",
        "models":        model_info(),
        "stream_active": bool(primary and primary.active),
        "stream_source": primary.producer if primary else "none",
        "feed_count":    feed_registry.count(),
        "max_feeds":     feed_registry.MAX_FEEDS,
    }
