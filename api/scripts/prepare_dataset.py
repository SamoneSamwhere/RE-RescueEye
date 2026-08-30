"""
RescueEye — Phase 3 Dataset Preparation
========================================
Downloads, converts, and splits datasets for:
  1. Victim Detection  (SARD / VisDrone / WiSARD / HERIDAL)
  2. Damage Classification (FloodNet / AIDER)

All annotations are converted to YOLOv8 format (normalized xywh txt).
Outputs dataset YAML files ready for `ultralytics train`.

Usage (run from repo root or Colab):
    python api/scripts/prepare_dataset.py [--victim-only | --damage-only]

Environment variables (optional overrides):
    DATA_ROOT   — base directory for all dataset output (default: api/data)
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import random
import shutil
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import NamedTuple

import yaml

# Ensure UTF-8 output on Windows consoles (Python 3.7+)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

try:
    import gdown                   # type: ignore
    HAS_GDOWN = True
except ImportError:
    HAS_GDOWN = False

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
REPO_ROOT  = SCRIPT_DIR.parent
DATA_ROOT  = Path(os.getenv("DATA_ROOT", str(REPO_ROOT / "data")))

RAW_VICTIM  = DATA_ROOT / "raw" / "victim"
RAW_DAMAGE  = DATA_ROOT / "raw" / "damage"
VICTIM_OUT  = DATA_ROOT / "victim"
DAMAGE_OUT  = DATA_ROOT / "damage"

SPLIT = (0.70, 0.20, 0.10)   # train / val / test

# ── Damage classes ─────────────────────────────────────────────────────────────
DAMAGE_CLASSES = ["flood_damage", "fire_damage", "structural_damage", "no_damage"]
DAMAGE_CLASS_ID = {c: i for i, c in enumerate(DAMAGE_CLASSES)}

# ── Colour codes ──────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
RESET  = "\033[0m"
BOLD   = "\033[1m"


def log(msg: str, level: str = "INFO") -> None:
    color = {"INFO": "", "OK": GREEN, "WARN": YELLOW, "ERR": RED}.get(level, "")
    print(f"{color}[{level}] {msg}{RESET}")


# ─────────────────────────────────────────────────────────────────────────────
# Generic utilities
# ─────────────────────────────────────────────────────────────────────────────
def download_file(url: str, dest: Path, desc: str = "") -> Path:
    """Download url → dest (skip if already exists)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        log(f"Already downloaded: {dest.name}", "OK")
        return dest
    log(f"Downloading {desc or dest.name} ...")
    if not HAS_REQUESTS:
        raise RuntimeError("pip install requests to download files")
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=65536):
                f.write(chunk)
    log(f"Saved → {dest}", "OK")
    return dest


def gdown_id(file_id: str, dest: Path, desc: str = "") -> Path:
    """Download a Google Drive file by ID (requires gdown)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        log(f"Already downloaded: {dest.name}", "OK")
        return dest
    if not HAS_GDOWN:
        raise RuntimeError("pip install gdown to download from Google Drive")
    log(f"Downloading {desc or dest.name} from Google Drive ...")
    gdown.download(id=file_id, output=str(dest), quiet=False)
    return dest


def extract_zip(src: Path, dest: Path) -> Path:
    """Extract zip archive (skip if dest already exists)."""
    if dest.exists():
        log(f"Already extracted: {dest}", "OK")
        return dest
    log(f"Extracting {src.name} → {dest} ...")
    with zipfile.ZipFile(src, "r") as z:
        z.extractall(dest)
    return dest


def split_files(files: list[Path], split: tuple[float, float, float]) -> tuple[list, list, list]:
    """Shuffle and split a list into (train, val, test) by given ratios."""
    random.shuffle(files)
    n = len(files)
    n_train = int(n * split[0])
    n_val   = int(n * split[1])
    return files[:n_train], files[n_train:n_train + n_val], files[n_train + n_val:]


def copy_to_split(img_label_pairs: list[tuple[Path, Path | None]],
                  split_name: str,
                  img_out: Path,
                  lbl_out: Path) -> int:
    """Copy (image, label) pairs into the appropriate split directory."""
    img_dir = img_out / split_name
    lbl_dir = lbl_out / split_name
    img_dir.mkdir(parents=True, exist_ok=True)
    lbl_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    for img_path, lbl_path in img_label_pairs:
        shutil.copy2(img_path, img_dir / img_path.name)
        if lbl_path and lbl_path.exists():
            shutil.copy2(lbl_path, lbl_dir / lbl_path.name)
        else:
            # Empty label = no detections in this frame
            (lbl_dir / img_path.with_suffix(".txt").name).touch()
        count += 1
    return count


def write_yaml(path: Path, content: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        yaml.dump(content, f, default_flow_style=False, sort_keys=False)
    log(f"Wrote {path}", "OK")


def print_distribution(title: str, counts: dict[str, int], min_per_class: int = 500) -> None:
    print(f"\n{BOLD}{title}{RESET}")
    total = sum(counts.values())
    ok = True
    for cls, n in counts.items():
        bar  = "█" * min(int(n / max(total, 1) * 40), 40)
        flag = ""
        if n < min_per_class:
            flag = f"  {YELLOW}⚠ BELOW {min_per_class} MINIMUM{RESET}"
            ok   = False
        print(f"  {cls:<22} {n:>5}  {bar}{flag}")
    print(f"  {'TOTAL':<22} {total:>5}")
    if not ok:
        log(
            "Some classes are below the 500-image minimum (Objective 3). "
            "Collect more data or use augmentation before training.",
            "WARN",
        )
    else:
        log("All classes meet the 500-image minimum.", "OK")


# ─────────────────────────────────────────────────────────────────────────────
# VICTIM DETECTION
# ─────────────────────────────────────────────────────────────────────────────

# VisDrone annotation format: <bb_left>,<bb_top>,<bb_width>,<bb_height>,<score>,<category>,<truncation>,<occlusion>
# category 1 = pedestrian, 2 = people (both map to class 0 "person")
VISDRONE_PERSON_CATS = {1, 2}


def _visdrone_ann_to_yolo(ann_path: Path, img_w: int, img_h: int) -> list[str]:
    """Convert one VisDrone annotation file to YOLOv8 lines."""
    lines = []
    with open(ann_path) as f:
        for row in csv.reader(f):
            if len(row) < 6:
                continue
            try:
                x, y, w, h = int(row[0]), int(row[1]), int(row[2]), int(row[3])
                cat = int(row[5])
            except ValueError:
                continue
            if cat not in VISDRONE_PERSON_CATS:
                continue
            if w <= 0 or h <= 0:
                continue
            cx = (x + w / 2) / img_w
            cy = (y + h / 2) / img_h
            nw = w / img_w
            nh = h / img_h
            lines.append(f"0 {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")
    return lines


def _wisard_ann_to_yolo(ann_path: Path, img_w: int, img_h: int) -> list[str]:
    """
    WiSARD annotations are PASCAL VOC XML.
    Any object name containing 'person' or 'survivor' maps to class 0.
    """
    lines = []
    try:
        tree = ET.parse(ann_path)
        root = tree.getroot()
        for obj in root.findall("object"):
            name = (obj.findtext("name") or "").lower()
            if "person" not in name and "survivor" not in name and "human" not in name:
                continue
            bndbox = obj.find("bndbox")
            if bndbox is None:
                continue
            xmin = float(bndbox.findtext("xmin") or 0)
            ymin = float(bndbox.findtext("ymin") or 0)
            xmax = float(bndbox.findtext("xmax") or 0)
            ymax = float(bndbox.findtext("ymax") or 0)
            w = xmax - xmin
            h = ymax - ymin
            if w <= 0 or h <= 0:
                continue
            cx = (xmin + w / 2) / img_w
            cy = (ymin + h / 2) / img_h
            lines.append(f"0 {cx:.6f} {cy:.6f} {(w/img_w):.6f} {(h/img_h):.6f}")
    except ET.ParseError:
        pass
    return lines


def _get_image_size(img_path: Path) -> tuple[int, int]:
    try:
        from PIL import Image
        with Image.open(img_path) as im:
            return im.size  # (width, height)
    except Exception:
        return 640, 480


def prepare_victim_dataset() -> None:
    log("=" * 60)
    log("VICTIM DETECTION DATASET PREPARATION", "INFO")
    log("=" * 60)

    RAW_VICTIM.mkdir(parents=True, exist_ok=True)

    # ── Download instructions / URLs ────────────────────────────────────────
    # VisDrone and WiSARD require registration or are large (~10 GB).
    # We provide the download logic; if files are already present we skip.
    # In Colab the notebook handles the actual download.

    visdrone_images = sorted(RAW_VICTIM.rglob("*.jpg")) + sorted(RAW_VICTIM.rglob("*.png"))
    ann_files = sorted(RAW_VICTIM.rglob("*.txt"))

    if not visdrone_images:
        log(
            "No raw victim images found in " + str(RAW_VICTIM) + ".\n"
            "  → In the Colab notebook this is downloaded automatically.\n"
            "  → Locally: place your VisDrone/WiSARD images+annotations under api/data/raw/victim/\n"
            "  → Expected structure:\n"
            "       api/data/raw/victim/images/  (*.jpg / *.png)\n"
            "       api/data/raw/victim/annotations/  (*.txt for VisDrone, *.xml for WiSARD)",
            "WARN",
        )
        _generate_victim_placeholder()
        return

    log(f"Found {len(visdrone_images)} raw images, {len(ann_files)} annotation files")

    # ── Convert annotations ─────────────────────────────────────────────────
    converted_dir = DATA_ROOT / "raw" / "victim" / "yolo_labels"
    converted_dir.mkdir(parents=True, exist_ok=True)

    pairs: list[tuple[Path, Path]] = []
    for img_path in visdrone_images:
        # Try VisDrone (.txt) then WiSARD (.xml) annotation
        ann_txt = img_path.parent.parent / "annotations" / img_path.with_suffix(".txt").name
        ann_xml = img_path.parent.parent / "annotations" / img_path.with_suffix(".xml").name
        lbl_out = converted_dir / img_path.with_suffix(".txt").name

        if not lbl_out.exists():
            w, h = _get_image_size(img_path)
            if ann_txt.exists():
                yolo_lines = _visdrone_ann_to_yolo(ann_txt, w, h)
            elif ann_xml.exists():
                yolo_lines = _wisard_ann_to_yolo(ann_xml, w, h)
            else:
                yolo_lines = []
            lbl_out.write_text("\n".join(yolo_lines))

        pairs.append((img_path, lbl_out))

    log(f"Converted {len(pairs)} image-label pairs")

    # ── Split ────────────────────────────────────────────────────────────────
    random.seed(42)
    random.shuffle(pairs)
    n = len(pairs)
    n_train = int(n * SPLIT[0])
    n_val   = int(n * SPLIT[1])
    splits = {
        "train": pairs[:n_train],
        "val":   pairs[n_train:n_train + n_val],
        "test":  pairs[n_train + n_val:],
    }

    img_out = VICTIM_OUT / "images"
    lbl_out = VICTIM_OUT / "labels"
    for split_name, split_pairs in splits.items():
        n_copied = copy_to_split(split_pairs, split_name, img_out, lbl_out)
        log(f"  {split_name}: {n_copied} images")

    # ── YAML ─────────────────────────────────────────────────────────────────
    write_yaml(
        DATA_ROOT / "victim.yaml",
        {
            "path": str(VICTIM_OUT.resolve()),
            "train": "images/train",
            "val":   "images/val",
            "test":  "images/test",
            "nc":    1,
            "names": ["person"],
        },
    )
    log("Victim dataset prepared.", "OK")


def _generate_victim_placeholder() -> None:
    """
    Generate a minimal synthetic dataset so training scripts can be tested
    end-to-end without real data.  For real training use Colab + actual data.
    """
    log("Generating synthetic placeholder victim dataset (50 images) ...")
    try:
        import numpy as np
        from PIL import Image, ImageDraw
    except ImportError:
        log("PIL not available — cannot generate placeholder images", "ERR")
        return

    random.seed(0)
    np.random.seed(0)

    for split_name, n in [("train", 35), ("val", 10), ("test", 5)]:
        img_dir = VICTIM_OUT / "images" / split_name
        lbl_dir = VICTIM_OUT / "labels" / split_name
        img_dir.mkdir(parents=True, exist_ok=True)
        lbl_dir.mkdir(parents=True, exist_ok=True)

        for i in range(n):
            W, H = 640, 480
            arr = np.random.randint(20, 60, (H, W, 3), dtype=np.uint8)
            img = Image.fromarray(arr)
            draw = ImageDraw.Draw(img)
            # Draw 1-3 "person" blobs
            labels = []
            for _ in range(random.randint(1, 3)):
                px = random.randint(50, W - 80)
                py = random.randint(50, H - 100)
                pw = random.randint(30, 60)
                ph = random.randint(60, 100)
                draw.rectangle([px, py, px + pw, py + ph], fill=(180, 120, 100))
                cx = (px + pw / 2) / W
                cy = (py + ph / 2) / H
                labels.append(f"0 {cx:.6f} {cy:.6f} {pw/W:.6f} {ph/H:.6f}")

            stem = f"synth_{split_name}_{i:04d}"
            img.save(img_dir / f"{stem}.jpg")
            (lbl_dir / f"{stem}.txt").write_text("\n".join(labels))

    write_yaml(
        DATA_ROOT / "victim.yaml",
        {
            "path": str(VICTIM_OUT.resolve()),
            "train": "images/train",
            "val":   "images/val",
            "test":  "images/test",
            "nc":    1,
            "names": ["person"],
        },
    )
    log("Placeholder victim dataset ready (synthetic — replace with real data for production).", "WARN")


# ─────────────────────────────────────────────────────────────────────────────
# DAMAGE CLASSIFICATION
# ─────────────────────────────────────────────────────────────────────────────

def _floodnet_label_from_path(img_path: Path) -> str | None:
    """
    FloodNet uses folder-based labels:
      Flooded/  → flood_damage
      Non-Flooded/ → no_damage
    Or filename suffixes: _flooded, _non-flooded
    """
    parts = {p.lower() for p in img_path.parts}
    name  = img_path.stem.lower()
    if "flooded" in parts or "flooded" in name:
        if "non" in name or "non-flooded" in parts:
            return "no_damage"
        return "flood_damage"
    if "non" in parts or "non_flooded" in parts:
        return "no_damage"
    return None


def _aider_label_from_path(img_path: Path) -> str | None:
    """
    AIDER uses folder names:
      flood/  → flood_damage
      fire/   → fire_damage
      collapsed_building/ → structural_damage
      normal/ → no_damage
    """
    for part in img_path.parts:
        p = part.lower()
        if "flood" in p:
            return "flood_damage"
        if "fire" in p:
            return "fire_damage"
        if "collaps" in p or "structural" in p or "building" in p or "rubble" in p:
            return "structural_damage"
        if "normal" in p or "no_damage" in p or "intact" in p:
            return "no_damage"
    return None


def prepare_damage_dataset() -> None:
    log("=" * 60)
    log("DAMAGE CLASSIFICATION DATASET PREPARATION", "INFO")
    log("=" * 60)

    RAW_DAMAGE.mkdir(parents=True, exist_ok=True)

    img_exts = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}
    all_images = [
        p for p in RAW_DAMAGE.rglob("*") if p.suffix.lower() in img_exts
    ]

    if not all_images:
        log(
            "No raw damage images found in " + str(RAW_DAMAGE) + ".\n"
            "  → In the Colab notebook this is downloaded automatically.\n"
            "  → Locally: place FloodNet / AIDER images under api/data/raw/damage/\n"
            "    with their original folder structure so labels can be inferred from paths.",
            "WARN",
        )
        _generate_damage_placeholder()
        return

    # ── Infer labels from paths ───────────────────────────────────────────
    labelled: dict[str, list[Path]] = {c: [] for c in DAMAGE_CLASSES}
    unlabelled = 0

    for img_path in all_images:
        label = _floodnet_label_from_path(img_path) or _aider_label_from_path(img_path)
        if label and label in labelled:
            labelled[label].append(img_path)
        else:
            unlabelled += 1

    if unlabelled:
        log(f"{unlabelled} images could not be labelled and will be skipped.", "WARN")

    print_distribution(
        "Class distribution (raw)",
        {c: len(imgs) for c, imgs in labelled.items()},
    )

    # ── Split and copy ─────────────────────────────────────────────────────
    random.seed(42)
    for cls, imgs in labelled.items():
        random.shuffle(imgs)
        n = len(imgs)
        n_train = int(n * SPLIT[0])
        n_val   = int(n * SPLIT[1])
        splits  = {
            "train": imgs[:n_train],
            "val":   imgs[n_train:n_train + n_val],
            "test":  imgs[n_train + n_val:],
        }
        for split_name, split_imgs in splits.items():
            out_dir = DAMAGE_OUT / split_name / cls
            out_dir.mkdir(parents=True, exist_ok=True)
            for src in split_imgs:
                shutil.copy2(src, out_dir / src.name)

    # ── Per-split counts ──────────────────────────────────────────────────
    for split_name in ("train", "val", "test"):
        counts = {}
        for cls in DAMAGE_CLASSES:
            d = DAMAGE_OUT / split_name / cls
            counts[cls] = len(list(d.glob("*"))) if d.exists() else 0
        total = sum(counts.values())
        log(f"  {split_name}: {total} images  {dict(counts)}")

    # ── YAML ─────────────────────────────────────────────────────────────
    write_yaml(
        DATA_ROOT / "damage.yaml",
        {
            "path": str(DAMAGE_OUT.resolve()),
            "train": "train",
            "val":   "val",
            "test":  "test",
            "nc":    4,
            "names": DAMAGE_CLASSES,
        },
    )
    log("Damage dataset prepared.", "OK")


def _generate_damage_placeholder() -> None:
    """Synthetic placeholder: 600 images per class (150 per split × 4)."""
    log("Generating synthetic placeholder damage dataset (2400 images) ...")
    try:
        import numpy as np
        from PIL import Image, ImageDraw
    except ImportError:
        log("PIL not available — cannot generate placeholder images", "ERR")
        return

    random.seed(1)
    np.random.seed(1)

    PALETTE = {
        "flood_damage":      (20, 80, 160),
        "fire_damage":       (200, 60, 10),
        "structural_damage": (120, 100, 80),
        "no_damage":         (60, 120, 60),
    }
    COUNTS = {"train": 420, "val": 120, "test": 60}

    for split_name, per_class in COUNTS.items():
        for cls, base_color in PALETTE.items():
            out_dir = DAMAGE_OUT / split_name / cls
            out_dir.mkdir(parents=True, exist_ok=True)
            for i in range(per_class):
                W, H = 224, 224
                noise = np.random.randint(-30, 30, (H, W, 3), dtype=np.int16)
                arr = np.clip(
                    np.array(base_color, dtype=np.int16) + noise, 0, 255
                ).astype(np.uint8)
                img = Image.fromarray(arr)
                draw = ImageDraw.Draw(img)
                # Add crude visual texture per class
                if cls == "flood_damage":
                    for y in range(0, H, 8):
                        draw.line([(0, y), (W, y + random.randint(-4, 4))],
                                  fill=(30, 100, 200), width=1)
                elif cls == "fire_damage":
                    for _ in range(20):
                        fx = random.randint(0, W)
                        fy = random.randint(H // 2, H)
                        draw.ellipse([fx, fy, fx + 12, fy + 20], fill=(255, 140, 0))
                elif cls == "structural_damage":
                    for _ in range(10):
                        draw.line(
                            [(random.randint(0, W), random.randint(0, H)),
                             (random.randint(0, W), random.randint(0, H))],
                            fill=(80, 60, 50), width=2,
                        )
                img.save(out_dir / f"synth_{i:04d}.jpg", quality=85)

    write_yaml(
        DATA_ROOT / "damage.yaml",
        {
            "path": str(DAMAGE_OUT.resolve()),
            "train": "train",
            "val":   "val",
            "test":  "test",
            "nc":    4,
            "names": DAMAGE_CLASSES,
        },
    )

    print_distribution(
        "Synthetic class distribution",
        {c: COUNTS["train"] + COUNTS["val"] + COUNTS["test"] for c in DAMAGE_CLASSES},
    )
    log("Placeholder damage dataset ready (synthetic — replace with real data for production).", "WARN")


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="RescueEye dataset preparation")
    parser.add_argument("--victim-only",  action="store_true")
    parser.add_argument("--damage-only",  action="store_true")
    parser.add_argument("--seed",         type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)

    if not args.damage_only:
        prepare_victim_dataset()
    if not args.victim_only:
        prepare_damage_dataset()

    log("\nDataset preparation complete.", "OK")
    log(f"YAML files written to: {DATA_ROOT}")


if __name__ == "__main__":
    main()
