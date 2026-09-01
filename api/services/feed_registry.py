"""
Multi-feed registry.

The platform originally carried a single drone feed held in module-level
globals, where uploading a video or setting a live URL *replaced* it. An
operator watching one aircraft is not a command centre, so feeds are now
independent entries in a registry: each owns its own FFmpeg process, frame
buffer and lock, and can be added or removed without disturbing the others.

Capped at MAX_FEEDS because each feed is a live FFmpeg transcode plus a
detection loop in the browser — beyond four, a laptop running YOLO alongside
them starts dropping frames, which is worse than refusing the fifth.
"""
import io
import logging
import os
import subprocess
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image

logger = logging.getLogger("rescueeye.feeds")

MAX_FEEDS = 4

# Detection runs on every feed, so the per-feed cadence is stretched as feeds
# are added to keep total inference load roughly constant. The browser reads
# `suggestedDetectIntervalMs` from the feed list rather than hardcoding it.
BASE_DETECT_INTERVAL_MS = 350
MAX_DETECT_INTERVAL_MS = 1500


def _is_network_source(source: str) -> bool:
    return source.startswith(("rtsp://", "rtsps://", "rtmp://", "udp://", "http://", "https://"))


# Frames wider than this are scaled down by FFmpeg before they ever reach the
# buffer. 4K frames cost roughly 3x as much to decode and process per detection
# pass while measuring identical detection accuracy, and the MJPEG view is
# downscaled to 1280x720 for the browser anyway — so the extra pixels are paid
# for on every frame and used by nothing. Raise it if a source needs the detail.
FEED_MAX_WIDTH = int(os.getenv("FEED_MAX_WIDTH", "1920"))


def _build_ffmpeg_cmd(source: str, fps: float) -> list[str]:
    """FFmpeg command with source-appropriate flags."""
    cmd = ["ffmpeg", "-loglevel", "error"]
    if source.startswith(("rtsp://", "rtsps://")):
        cmd += ["-rtsp_transport", "tcp", "-timeout", "5000000"]
    if not _is_network_source(source):
        cmd += ["-re"]          # pace file playback; omit for live network sources
    # -1 derives the height from the aspect ratio. (-2, which would also force
    # an even height, is rejected by some FFmpeg builds with "Size values less
    # than -1 are not acceptable".) min() leaves a source already narrower than
    # the cap untouched rather than upscaling it.
    vf = f"fps={fps},scale='min({FEED_MAX_WIDTH},iw)':-1"
    cmd += ["-i", source, "-vf", vf, "-f", "image2pipe",
            "-vcodec", "mjpeg", "-q:v", "3", "pipe:1"]
    return cmd


def _downscale_jpeg(jpeg: bytes, w: int = 1280, h: int = 720) -> bytes:
    buf = io.BytesIO()
    Image.open(io.BytesIO(jpeg)).resize((w, h), Image.BILINEAR).save(buf, format="JPEG", quality=78)
    return buf.getvalue()


@dataclass
class Feed:
    """One independently-running video source."""
    id: str
    label: str
    source: str
    kind: str                       # 'upload' | 'live' | 'synthetic'

    lock: threading.Lock = field(default_factory=threading.Lock)
    stop_event: threading.Event = field(default_factory=threading.Event)
    current_frame: bytes | None = None
    active: bool = False
    producer: str = "none"          # 'ffmpeg' | 'synthetic' | 'none'
    proc: subprocess.Popen | None = None
    created_at: float = field(default_factory=time.time)

    def snapshot(self) -> bytes | None:
        with self.lock:
            return self.current_frame

    def to_dict(self) -> dict:
        return {
            "id":        self.id,
            "label":     self.label,
            "kind":      self.kind,
            "source":    self.source,
            "active":    self.active,
            "producer":  self.producer,
            "hasFrame":  self.current_frame is not None,
            "createdAt": self.created_at,
        }


_registry: dict[str, Feed] = {}
_registry_lock = threading.Lock()
_counter = 0


class FeedLimitReached(Exception):
    """Raised when adding would exceed MAX_FEEDS."""


class FeedNotFound(Exception):
    pass


def detect_interval_ms() -> int:
    """
    Per-feed detection cadence. Every feed detects, so the interval widens with
    feed count to spread inference load rather than multiplying it.

    The base was 2500ms when a pass cost ~630ms and the overlay visibly lagged
    the video. A pass is now ~190ms, so the gap between updates — not inference
    — was what made the box trail the casualty. Clients run their cycles back to
    back, so this is a floor rather than a fixed period: it can never queue
    requests faster than the model clears them.
    """
    n = max(len(_registry), 1)
    return min(BASE_DETECT_INTERVAL_MS * n // 1, MAX_DETECT_INTERVAL_MS)


def _synthetic_producer(feed: Feed, fps: float):
    # Imported lazily: the synthetic frame painter lives with the router's
    # presentation helpers and pulls in PIL font handling.
    from routers.stream import synthetic_frame

    feed.active = True
    feed.producer = "synthetic"
    tick = 0
    interval = 1.0 / fps
    while not feed.stop_event.is_set():
        frame = synthetic_frame(tick, label=feed.label)
        with feed.lock:
            feed.current_frame = frame
        tick += 1
        time.sleep(interval)
    feed.active = False


def _ffmpeg_producer(feed: Feed, fps: float):
    cmd = _build_ffmpeg_cmd(feed.source, fps)
    logger.info(f"[feed:{feed.id}] FFmpeg: {' '.join(cmd)}")
    feed.producer = "ffmpeg"
    feed.active = True
    try:
        while not feed.stop_event.is_set():
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=0)
            feed.proc = proc
            buf = b""
            while not feed.stop_event.is_set():
                chunk = proc.stdout.read(65536)
                if not chunk:
                    break
                buf += chunk
                while True:
                    s = buf.find(b"\xff\xd8")
                    e = buf.find(b"\xff\xd9", s + 2)
                    if s == -1 or e == -1:
                        break
                    with feed.lock:
                        feed.current_frame = buf[s:e + 2]
                    buf = buf[e + 2:]
            proc.wait()
            if feed.stop_event.is_set():
                break
            # Files reach EOF; loop them so a demo clip runs continuously.
            logger.info(f"[feed:{feed.id}] source ended — restarting")
            time.sleep(0.5)
    except FileNotFoundError:
        logger.warning(f"[feed:{feed.id}] FFmpeg not installed — synthetic fallback")
        feed.stop_event.clear()
        _synthetic_producer(feed, fps)
    except Exception as exc:
        logger.error(f"[feed:{feed.id}] error: {exc}")
    finally:
        feed.active = False
        feed.proc = None


def _start_producer(feed: Feed) -> None:
    fps = float(os.getenv("FRAME_RATE", "8"))
    playable = feed.source and (_is_network_source(feed.source) or os.path.isfile(feed.source))
    target = _ffmpeg_producer if playable else _synthetic_producer
    if not playable and feed.source:
        logger.warning(f"[feed:{feed.id}] source '{feed.source}' unplayable — synthetic")
        feed.kind = "synthetic"
    threading.Thread(target=target, args=(feed, fps), daemon=True).start()


def add_feed(source: str, label: str | None = None, kind: str = "live") -> Feed:
    """
    Registers and starts a new feed.

    Raises FeedLimitReached rather than evicting an existing feed — a panel
    disappearing mid-demo is more confusing than being told to remove one.
    """
    global _counter
    with _registry_lock:
        if len(_registry) >= MAX_FEEDS:
            raise FeedLimitReached(
                f"Maximum of {MAX_FEEDS} feeds reached — remove one before adding another."
            )
        _counter += 1
        feed_id = f"feed{_counter}"
        feed = Feed(
            id=feed_id,
            label=label or f"Feed {_counter}",
            source=source,
            kind=kind if source else "synthetic",
        )
        _registry[feed_id] = feed

    _start_producer(feed)
    logger.info(f"[feed:{feed.id}] added ({feed.kind}) — {feed.source or 'synthetic'}")
    return feed


def remove_feed(feed_id: str) -> None:
    with _registry_lock:
        feed = _registry.pop(feed_id, None)
    if feed is None:
        raise FeedNotFound(feed_id)
    feed.stop_event.set()
    if feed.proc:
        try:
            feed.proc.terminate()
        except Exception:
            pass
    logger.info(f"[feed:{feed.id}] removed")


def get_feed(feed_id: str) -> Feed:
    feed = _registry.get(feed_id)
    if feed is None:
        raise FeedNotFound(feed_id)
    return feed


def list_feeds() -> list[Feed]:
    return sorted(_registry.values(), key=lambda f: f.created_at)


def primary_feed() -> Feed | None:
    """
    The oldest feed. Backs the legacy single-feed endpoints (/stream/feed3,
    /stream/status) that the mobile app and older docs still point at.
    """
    feeds = list_feeds()
    return feeds[0] if feeds else None


def count() -> int:
    return len(_registry)


def shutdown_all() -> None:
    for feed_id in list(_registry.keys()):
        try:
            remove_feed(feed_id)
        except FeedNotFound:
            pass
