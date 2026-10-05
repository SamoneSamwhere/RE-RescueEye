"""
Small-subject person dataset for fine-tuning the victim detector.

Builds data/small_person/{images,labels}/{train,val} + data/small_person.yaml,
single class "person" — the live pipeline reads the victim graph's first score
row as "person", so a drop-in replacement must keep exactly one class.

Sources (download first):
  data/raw/downloads/visdrone/detection/*.parquet     HF shijli/visdrone2019-det (CC BY-NC-SA 3.0)
      categories 1 "pedestrian" and 2 "people" (VisDrone's non-upright humans:
      sitting, lying) -> person. What the current weights were trained on, so
      including it keeps them from forgetting pedestrians while they learn more.
  data/raw/downloads/seadronessee/data/               HF dronefreak/SeaDronesSee (CC0)
      class 0 "swimmer" -> person. People in water seen from altitude: tiny and
      often horizontal — the closest open data to a flood casualty.
  data/raw/downloads/heridal.zip                      Zenodo 5662351 (CC BY 3.0)
      HERIDAL: real wilderness search-and-rescue drone photos, people standing,
      sitting and lying in grass, forest and rock — the land-casualty case.
      Pascal VOC XML; every object is a person.

Not used for training: the UAV-SAR set (scripts/training/eval_small_person.py) — it is
the independent test, and anything trained on it would grade itself.

Why tiling: SeaDronesSee frames are 3840-5456px wide. Letterboxed whole to
1280 a swimmer shrinks to ~5px, below what the network can learn; cut into
1280 tiles it stays at the size a drone camera actually sees it.
"""
from __future__ import annotations

import io
import os
import random
import shutil
import sys
from pathlib import Path

import yaml
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

API = Path(__file__).resolve().parents[2]   # scripts/training/ -> api/
DATA = Path(os.getenv("DATA_ROOT", str(API / "data")))
VISDRONE = DATA / "raw/downloads/visdrone/detection"
SDS = DATA / "raw/downloads/seadronessee/data"
HERIDAL_ZIP = DATA / "raw/downloads/heridal.zip"
HERIDAL_MAX_VAL_FRACTION = 0.1
OUT = DATA / "small_person"
YAML = DATA / "small_person.yaml"

MAX_SIDE = 1280          # training imgsz; larger frames are pre-shrunk (decode cost — see fire training)
TILE = 1280
TILE_OVERLAP = 0.2
MIN_BOX_PX = 4           # anything smaller after resizing is noise the model cannot see
SDS_MAX_TRAIN_TILES = 9000
SDS_MAX_VAL_TILES = 1200
NEGATIVE_TILE_RATE = 0.08  # some empty water so "glint" is not learned as "swimmer"

rng = random.Random(42)


def log(msg: str) -> None:
    print(msg, flush=True)


def save(img: Image.Image, boxes: list[tuple[float, float, float, float]], split: str, name: str) -> int:
    """boxes: pixel x1,y1,x2,y2 in `img`. Writes the image and its YOLO label; returns boxes kept."""
    w, h = img.size
    lines = []
    for x1, y1, x2, y2 in boxes:
        x1, y1, x2, y2 = max(0, x1), max(0, y1), min(w, x2), min(h, y2)
        bw, bh = x2 - x1, y2 - y1
        if bw < MIN_BOX_PX or bh < MIN_BOX_PX:
            continue
        lines.append(f"0 {(x1 + bw / 2) / w:.6f} {(y1 + bh / 2) / h:.6f} {bw / w:.6f} {bh / h:.6f}")
    (OUT / "images" / split).mkdir(parents=True, exist_ok=True)
    (OUT / "labels" / split).mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT / "images" / split / f"{name}.jpg", quality=90)
    (OUT / "labels" / split / f"{name}.txt").write_text("\n".join(lines) + ("\n" if lines else ""))
    return len(lines)


def shrink(img: Image.Image, boxes):
    w, h = img.size
    s = min(1.0, MAX_SIDE / max(w, h))
    if s < 1.0:
        img = img.resize((round(w * s), round(h * s)), Image.BILINEAR)
        boxes = [(x1 * s, y1 * s, x2 * s, y2 * s) for x1, y1, x2, y2 in boxes]
    return img, boxes


# ── VisDrone ─────────────────────────────────────────────────────────────────
def prepare_visdrone() -> None:
    import pyarrow.parquet as pq

    for split, pattern in (("train", "train-*.parquet"), ("val", "validation-*.parquet")):
        n_img = n_box = 0
        for shard in sorted(VISDRONE.glob(pattern)):
            table = pq.read_table(shard)
            for row in table.to_pylist():
                obj = row["objects"]
                boxes = [
                    (x, y, x + bw, y + bh)
                    for (x, y, bw, bh), cat, score in zip(obj["bbox"], obj["category"], obj["score"])
                    # score 0 marks VisDrone's "ignored" annotations
                    if cat in (1, 2) and score != 0
                ]
                img = Image.open(io.BytesIO(row["image"]["bytes"]))
                img, boxes = shrink(img, boxes)
                n_box += save(img, boxes, split, f"vd_{row['id']}")
                n_img += 1
            log(f"  visdrone {split}: {shard.name} done ({n_img} images, {n_box} people)")


# ── SeaDronesSee ─────────────────────────────────────────────────────────────
def tiles_for(w: int, h: int) -> list[tuple[int, int]]:
    step = int(TILE * (1 - TILE_OVERLAP))
    xs = list(range(0, max(1, w - TILE), step)) + [max(0, w - TILE)]
    ys = list(range(0, max(1, h - TILE), step)) + [max(0, h - TILE)]
    return [(x, y) for y in sorted(set(ys)) for x in sorted(set(xs))]


def prepare_seadronessee() -> None:
    for split, cap in (("train", SDS_MAX_TRAIN_TILES), ("val", SDS_MAX_VAL_TILES)):
        images = sorted((SDS / "images" / split).rglob("*.jpg"))
        rng.shuffle(images)
        n_tiles = n_box = 0
        for img_path in images:
            if n_tiles >= cap:
                break
            rel = img_path.relative_to(SDS / "images" / split)
            lbl = SDS / "labels" / split / rel.with_suffix(".txt")
            if not lbl.exists():
                continue
            img = Image.open(img_path)
            W, H = img.size
            people = []
            for line in lbl.read_text().splitlines():
                p = line.split()
                if len(p) >= 5 and p[0] == "0":     # swimmer
                    cx, cy, bw, bh = (float(v) for v in p[1:5])
                    people.append(((cx - bw / 2) * W, (cy - bh / 2) * H, (cx + bw / 2) * W, (cy + bh / 2) * H))
            for tx, ty in tiles_for(W, H):
                inside = [
                    (x1 - tx, y1 - ty, x2 - tx, y2 - ty)
                    for x1, y1, x2, y2 in people
                    if tx <= (x1 + x2) / 2 < tx + TILE and ty <= (y1 + y2) / 2 < ty + TILE
                ]
                if not inside and rng.random() > NEGATIVE_TILE_RATE:
                    continue
                crop = img.crop((tx, ty, min(W, tx + TILE), min(H, ty + TILE)))
                n_box += save(crop, inside, split, f"sds_{rel.stem}_{tx}_{ty}")
                n_tiles += 1
                if n_tiles >= cap:
                    break
            if n_tiles and n_tiles % 1000 < 4:
                log(f"  seadronessee {split}: {n_tiles} tiles, {n_box} people")
        log(f"  seadronessee {split}: {n_tiles} tiles, {n_box} people")


# ── HERIDAL ──────────────────────────────────────────────────────────────────
def tile_and_save(img: Image.Image, people, split: str, stem: str, budget: list[int]) -> tuple[int, int]:
    """Tile a large frame around its people (plus a few empty tiles). Returns (tiles, boxes)."""
    W, H = img.size
    n_tiles = n_box = 0
    for tx, ty in tiles_for(W, H):
        if budget[0] <= 0:
            break
        inside = [
            (x1 - tx, y1 - ty, x2 - tx, y2 - ty)
            for x1, y1, x2, y2 in people
            if tx <= (x1 + x2) / 2 < tx + TILE and ty <= (y1 + y2) / 2 < ty + TILE
        ]
        if not inside and rng.random() > NEGATIVE_TILE_RATE:
            continue
        crop = img.crop((tx, ty, min(W, tx + TILE), min(H, ty + TILE)))
        n_box += save(crop, inside, split, f"{stem}_{tx}_{ty}")
        n_tiles += 1
        budget[0] -= 1
    return n_tiles, n_box


def prepare_heridal() -> None:
    import xml.etree.ElementTree as ET
    import zipfile

    if not HERIDAL_ZIP.exists():
        log("  heridal.zip not found — skipped")
        return
    z = zipfile.ZipFile(HERIDAL_ZIP)
    names = z.namelist()
    images = {Path(n).stem: n for n in names if n.lower().endswith((".jpg", ".jpeg", ".png"))}
    xmls = [n for n in names if n.lower().endswith(".xml")]
    log(f"  heridal: {len(images)} images, {len(xmls)} annotation files")
    rng.shuffle(xmls)
    n_val = int(len(xmls) * HERIDAL_MAX_VAL_FRACTION)
    totals = {"train": [0, 0], "val": [0, 0]}
    budget = {"train": [10**9], "val": [10**9]}
    for i, x in enumerate(xmls):
        split = "val" if i < n_val else "train"
        root = ET.fromstring(z.read(x))
        stem = Path(root.findtext("filename") or x).stem
        img_name = images.get(stem) or images.get(Path(x).stem)
        if not img_name:
            continue
        people = []
        for obj in root.iter("object"):
            bb = obj.find("bndbox")
            if bb is None:
                continue
            people.append(tuple(float(bb.findtext(k)) for k in ("xmin", "ymin", "xmax", "ymax")))
        img = Image.open(io.BytesIO(z.read(img_name)))
        t, b = tile_and_save(img, people, split, f"her_{stem}", budget[split])
        totals[split][0] += t; totals[split][1] += b
        if i % 200 == 0:
            log(f"  heridal: {i}/{len(xmls)} frames — {totals}")
    log(f"  heridal done — train {totals['train'][0]} tiles / {totals['train'][1]} people, val {totals['val'][0]} tiles / {totals['val'][1]} people")


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    log("VisDrone (pedestrian + people)…")
    prepare_visdrone()
    log("SeaDronesSee (swimmers, tiled)…")
    prepare_seadronessee()
    log("HERIDAL (wilderness SAR, tiled)…")
    prepare_heridal()
    with open(YAML, "w") as f:
        yaml.dump({"path": str(OUT.resolve()), "train": "images/train", "val": "images/val",
                   "nc": 1, "names": {0: "person"}}, f, sort_keys=False)
    for split in ("train", "val"):
        log(f"{split}: {len(list((OUT / 'images' / split).glob('*.jpg')))} images")
    log(f"Wrote {YAML}")


if __name__ == "__main__":
    main()
