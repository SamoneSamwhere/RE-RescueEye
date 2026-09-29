"""
RescueEye — Aerial damage + fire/smoke datasets
================================================
Builds the two datasets the damage side of the pipeline actually trains on:

  1. data/damage/{train,val,test}/<class>/   — damage classification (4 classes)
     from AIDER (drone imagery, CC-BY-4.0) plus frames from our own demo clips.
  2. data/fire/{images,labels}/{train,val,test}/ + data/fire.yaml
     — fire/smoke box detection from D-Fire (YOLO labels, 0=smoke 1=fire).

Why this exists: prepare_dataset.py falls back to a synthetic placeholder when
no raw images are present — flat colour plus orange blobs for "fire" — and the
shipped damage_best.pt was trained on exactly that. It scored 100% top-1 on
its own noise and called a burning barn in demo_feed7 structural_damage at
0.99. Nothing here generates data; a missing source is an error.

Clip frames and leakage: consecutive video frames are near-duplicates, so a
random split would put the "same" image in train and val and report accuracy
the model does not have. Each clip is cut in time instead — frames before
`holdout_from_s` go to train only, frames after (plus a gap) go to
data/damage_holdout/<class>/, which training never sees. The holdout is still
the same scene, so it measures "does it recognise this fire later in the
clip", not "does it generalise to a new fire" — AIDER's val/test split is the
honest number for that.

Inputs (download first):
    data/raw/downloads/AIDER.zip            https://zenodo.org/records/3888300
    data/raw/downloads/dfire/*.parquet      https://huggingface.co/datasets/badsaarow/d-fire
    data/media/*_demo_feed{,7,8}.mp4        uploaded through the app

Usage:
    python scripts/prepare_aerial_datasets.py [--damage-only | --fire-only]
"""
from __future__ import annotations

import argparse
import io
import os
import random
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

import yaml

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT  = SCRIPT_DIR.parent
DATA_ROOT  = Path(os.getenv("DATA_ROOT", str(REPO_ROOT / "data")))

DOWNLOADS      = DATA_ROOT / "raw" / "downloads"
AIDER_ZIP      = DOWNLOADS / "AIDER.zip"
AIDER_DIR      = DATA_ROOT / "raw" / "damage" / "AIDER"
DFIRE_DIR      = DOWNLOADS / "dfire"
MEDIA_DIR      = DATA_ROOT / "media"
DAMAGE_OUT     = DATA_ROOT / "damage"
DAMAGE_HOLDOUT = DATA_ROOT / "damage_holdout"
FIRE_OUT       = DATA_ROOT / "fire"
FIRE_YAML      = DATA_ROOT / "fire.yaml"

DAMAGE_CLASSES = ["fire_damage", "flood_damage", "no_damage", "structural_damage"]

# AIDER folder → our class. traffic_incident has no counterpart and is dropped
# rather than forced into no_damage, where a crashed car would teach the wrong
# thing.
AIDER_CLASS = {
    "collapsed_building": "structural_damage",
    "fire":               "fire_damage",
    "flooded_areas":      "flood_damage",
    "normal":             "no_damage",
}
# AIDER's normal class is ~8x the others. Uncapped, "no damage" becomes the
# safe answer for anything ambiguous — the opposite of what a responder wants.
NO_DAMAGE_CAP = 1000

# (media glob, class, holdout_from_s). demo_feed.mp4 is floodwater with a boat,
# demo_feed8 is an undamaged field — both aerial, both useful counterweights to
# demo_feed7's fire so the model can't learn "our drone footage = fire".
CLIPS = [
    ("*_demo_feed7.mp4", "fire_damage",  75.0),
    ("*_demo_feed.mp4",  "flood_damage", 38.0),
    ("*_demo_feed8.mp4", "no_damage",    13.0),
]
CLIP_TRAIN_FPS   = 2
CLIP_HOLDOUT_FPS = 1
CLIP_HOLDOUT_GAP = 3.0   # seconds skipped after the cut so the first holdout frame isn't the last train frame

SPLIT = (0.70, 0.20, 0.10)
DFIRE_VAL_FRACTION = 0.10
# Two thirds of D-Fire is 1280x720 or larger, and training letterboxes to 640
# anyway. Decoding the full-size JPEG every batch left the GPU at ~30% while
# the CPU decoded pixels it then threw away — ~11 min an epoch on this laptop.
# YOLO labels are normalised, so shrinking the image leaves them valid.
DFIRE_MAX_SIDE = 640

GREEN, YELLOW, RED, RESET = "\033[92m", "\033[93m", "\033[91m", "\033[0m"


def log(msg: str, level: str = "INFO") -> None:
    color = {"OK": GREEN, "WARN": YELLOW, "ERR": RED}.get(level, "")
    print(f"{color}[{level}] {msg}{RESET}", flush=True)


def _ffmpeg() -> str:
    try:
        import imageio_ffmpeg  # type: ignore
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        exe = shutil.which("ffmpeg")
        if not exe:
            raise SystemExit("ffmpeg not found — pip install imageio-ffmpeg")
        return exe


def _extract_frames(clip: Path, out_dir: Path, prefix: str, fps: int,
                    start: float, end: float | None) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = [_ffmpeg(), "-loglevel", "error", "-y", "-ss", str(start)]
    if end is not None:
        cmd += ["-t", str(end - start)]
    cmd += ["-i", str(clip), "-vf", f"fps={fps},scale=640:-1", "-q:v", "3",
            str(out_dir / f"{prefix}_%04d.jpg")]
    subprocess.run(cmd, check=True)
    return len(list(out_dir.glob(f"{prefix}_*.jpg")))


# ─────────────────────────────────────────────────────────────────────────────
# Damage classification
# ─────────────────────────────────────────────────────────────────────────────
def prepare_damage() -> None:
    log("=" * 60)
    log("DAMAGE CLASSIFICATION — AIDER + demo clips")
    log("=" * 60)

    if not AIDER_DIR.exists():
        if not AIDER_ZIP.exists():
            raise SystemExit(f"{AIDER_ZIP} not found — download it from https://zenodo.org/records/3888300")
        log(f"Extracting {AIDER_ZIP.name} ...")
        AIDER_DIR.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(AIDER_ZIP) as zf:
            zf.extractall(AIDER_DIR)

    by_class: dict[str, list[Path]] = {c: [] for c in DAMAGE_CLASSES}
    for folder in AIDER_DIR.rglob("*"):
        if folder.is_dir() and folder.name.lower() in AIDER_CLASS:
            cls = AIDER_CLASS[folder.name.lower()]
            by_class[cls] += [p for p in folder.iterdir()
                              if p.suffix.lower() in {".jpg", ".jpeg", ".png"}]
    if not any(by_class.values()):
        raise SystemExit(f"No AIDER class folders found under {AIDER_DIR}")

    rng = random.Random(42)
    if len(by_class["no_damage"]) > NO_DAMAGE_CAP:
        rng.shuffle(by_class["no_damage"])
        by_class["no_damage"] = by_class["no_damage"][:NO_DAMAGE_CAP]

    for d in (DAMAGE_OUT, DAMAGE_HOLDOUT):
        if d.exists():
            shutil.rmtree(d)

    counts: dict[str, dict[str, int]] = {s: {c: 0 for c in DAMAGE_CLASSES}
                                         for s in ("train", "val", "test", "holdout")}
    for cls, imgs in by_class.items():
        imgs = sorted(imgs)
        rng.shuffle(imgs)
        n_train = int(len(imgs) * SPLIT[0])
        n_val   = int(len(imgs) * SPLIT[1])
        parts = {"train": imgs[:n_train], "val": imgs[n_train:n_train + n_val],
                 "test": imgs[n_train + n_val:]}
        for split, files in parts.items():
            out = DAMAGE_OUT / split / cls
            out.mkdir(parents=True, exist_ok=True)
            for src in files:
                shutil.copy2(src, out / f"aider_{src.name}")
            counts[split][cls] += len(files)

    for pattern, cls, cut in CLIPS:
        matches = sorted(MEDIA_DIR.glob(pattern))
        if not matches:
            log(f"No clip matching {pattern} in {MEDIA_DIR} — skipped", "WARN")
            continue
        clip = matches[0]   # re-uploads of the same file share a name; one is enough
        stem = clip.stem.split("_", 1)[-1]
        counts["train"][cls] += _extract_frames(
            clip, DAMAGE_OUT / "train" / cls, f"clip_{stem}", CLIP_TRAIN_FPS, 0.0, cut)
        counts["holdout"][cls] += _extract_frames(
            clip, DAMAGE_HOLDOUT / cls, f"clip_{stem}", CLIP_HOLDOUT_FPS, cut + CLIP_HOLDOUT_GAP, None)
        log(f"{clip.name}: train < {cut:.0f}s, holdout > {cut + CLIP_HOLDOUT_GAP:.0f}s → {cls}")

    print()
    print(f"  {'class':<20}" + "".join(f"{s:>9}" for s in counts))
    for cls in DAMAGE_CLASSES:
        print(f"  {cls:<20}" + "".join(f"{counts[s][cls]:>9}" for s in counts))
    log(f"Damage dataset → {DAMAGE_OUT}", "OK")
    log(f"Clip holdout   → {DAMAGE_HOLDOUT} (never trained on)", "OK")


# ─────────────────────────────────────────────────────────────────────────────
# Fire / smoke detection
# ─────────────────────────────────────────────────────────────────────────────
def _write_capped_jpeg(data: bytes, dest: Path) -> None:
    from PIL import Image
    img = Image.open(io.BytesIO(data))
    if max(img.size) <= DFIRE_MAX_SIDE:
        dest.write_bytes(data)
        return
    img = img.convert("RGB")
    img.thumbnail((DFIRE_MAX_SIDE, DFIRE_MAX_SIDE), Image.BILINEAR)
    img.save(dest, quality=92)


def prepare_fire() -> None:
    log("=" * 60)
    log("FIRE/SMOKE DETECTION — D-Fire")
    log("=" * 60)

    import pyarrow.parquet as pq  # type: ignore

    shards = sorted(DFIRE_DIR.glob("*.parquet"))
    if not shards:
        raise SystemExit(f"No D-Fire parquet shards in {DFIRE_DIR}")

    if FIRE_OUT.exists():
        shutil.rmtree(FIRE_OUT)

    rng = random.Random(42)
    counts = {"train": 0, "val": 0, "test": 0}
    boxes  = {"smoke": 0, "fire": 0}
    for shard in shards:
        source_split = "test" if shard.name.startswith("test") else "train"
        table = pq.read_table(shard, columns=["image", "label", "filename"])
        for row in table.to_pylist():
            split = source_split
            if split == "train" and rng.random() < DFIRE_VAL_FRACTION:
                split = "val"
            name = Path(row["filename"]).stem
            img_dir = FIRE_OUT / "images" / split
            lbl_dir = FIRE_OUT / "labels" / split
            img_dir.mkdir(parents=True, exist_ok=True)
            lbl_dir.mkdir(parents=True, exist_ok=True)
            _write_capped_jpeg(row["image"]["bytes"], img_dir / f"{name}.jpg")
            label = (row["label"] or "").strip()
            (lbl_dir / f"{name}.txt").write_text(label + ("\n" if label else ""))
            for line in label.splitlines():
                cls = line.split()[0]
                boxes["smoke" if cls == "0" else "fire"] += 1
            counts[split] += 1
        log(f"{shard.name}: done ({sum(counts.values())} images so far)")

    with open(FIRE_YAML, "w") as f:
        yaml.dump({
            "path":  str(FIRE_OUT.resolve()),
            "train": "images/train",
            "val":   "images/val",
            "test":  "images/test",
            "nc":    2,
            "names": {0: "smoke", 1: "fire"},
        }, f, sort_keys=False)

    log(f"Images: {counts}", "OK")
    log(f"Boxes:  {boxes}", "OK")
    log(f"Wrote {FIRE_YAML}", "OK")


def main() -> None:
    parser = argparse.ArgumentParser(description="RescueEye aerial damage + fire datasets")
    parser.add_argument("--damage-only", action="store_true")
    parser.add_argument("--fire-only",   action="store_true")
    args = parser.parse_args()
    if not args.fire_only:
        prepare_damage()
    if not args.damage_only:
        prepare_fire()


if __name__ == "__main__":
    main()
