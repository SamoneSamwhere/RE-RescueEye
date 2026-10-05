"""
RescueEye — Phase 3 Model Training
=====================================
Trains three YOLOv8 models:
  1. Victim Detection  — YOLOv8n (detection) on victim.yaml
  2. Damage Classification — YOLOv8n-cls (classification) on data/damage/
  3. Fire/Smoke Detection  — YOLOv8n (detection) on fire.yaml

Build the damage and fire datasets with scripts/training/prepare_aerial_datasets.py.

Recommended: run on Google Colab (free T4 GPU) via the notebook at
  notebooks/train_rescueeye.ipynb

Local CPU training works but is much slower (~hours vs minutes on GPU).

Usage:
    python api/scripts/training/train_models.py [--victim-only | --damage-only | --fire-only]
    python api/scripts/training/train_models.py --epochs 50 --batch 16

Environment variables:
    DATA_ROOT           — base directory containing victim.yaml / damage.yaml
    MODELS_DIR          — where to save trained weights (default: api/models)
    VICTIM_MODEL_PATH   — output path for victim_best.pt
    DAMAGE_MODEL_PATH   — output path for damage_best.pt
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = Path(__file__).parent
REPO_ROOT   = SCRIPT_DIR.parent.parent   # scripts/training/ -> api/
DATA_ROOT   = Path(os.getenv("DATA_ROOT",  str(REPO_ROOT / "data")))
MODELS_DIR  = Path(os.getenv("MODELS_DIR", str(REPO_ROOT / "models")))

VICTIM_YAML  = DATA_ROOT / "victim.yaml"
# Ultralytics classification reads class folders from a directory, not a YAML;
# handing it damage.yaml fails dataset checks.
DAMAGE_DIR     = DATA_ROOT / "damage"
DAMAGE_HOLDOUT = DATA_ROOT / "damage_holdout"
FIRE_YAML    = DATA_ROOT / "fire.yaml"
VICTIM_BEST  = Path(os.getenv("VICTIM_MODEL_PATH", str(MODELS_DIR / "victim_best.pt")))
DAMAGE_BEST  = Path(os.getenv("DAMAGE_MODEL_PATH", str(MODELS_DIR / "damage_best.pt")))
FIRE_BEST    = Path(os.getenv("FIRE_MODEL_PATH",   str(MODELS_DIR / "fire_best.pt")))

RUNS_DIR    = REPO_ROOT / "runs"          # training runs and candidate exports, kept out of models/
BASE_DIR    = MODELS_DIR / "base"         # stock Ultralytics weights


def base_weight(name: str) -> str:
    """Stock weights from models/base/, else the legacy api/ location, else a fresh download into models/base/."""
    for candidate in (BASE_DIR / name, REPO_ROOT / name):
        if candidate.exists():
            return str(candidate)
    return str(BASE_DIR / name)

RESULTS_VICTIM = RUNS_DIR / "victim"
RESULTS_DAMAGE = RUNS_DIR / "damage"
RESULTS_FIRE   = RUNS_DIR / "fire"

# services/yolo_model.py runs the damage ONNX graph at a fixed 224 input.
DAMAGE_IMGSZ = 224

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

# ── Target metrics (Objectives 2 & 3) ────────────────────────────────────────
TARGET_MAP50    = 0.70
TARGET_ACC_TOP1 = 0.75


def log(msg: str, level: str = "INFO") -> None:
    color = {"INFO": "", "OK": GREEN, "WARN": YELLOW, "ERR": RED}.get(level, "")
    print(f"{color}[{level}] {msg}{RESET}")


def _check_yaml(path: Path, name: str) -> bool:
    if not path.exists():
        log(
            f"{name} YAML not found at {path}.\n"
            "  Run: python api/scripts/training/prepare_dataset.py first.",
            "ERR",
        )
        return False
    return True


def _print_summary(label: str, metrics: dict, elapsed_s: float) -> None:
    print(f"\n{BOLD}{'─'*60}{RESET}")
    print(f"{BOLD}{label} — Training Summary{RESET}")
    print(f"{'─'*60}")
    for k, v in metrics.items():
        print(f"  {k:<30} {v}")
    print(f"  {'Training time':<30} {elapsed_s/60:.1f} min")
    print(f"{'─'*60}\n")


def _recommendations(metric_name: str, value: float, target: float) -> None:
    if value >= target:
        log(f"{metric_name} {value:.3f} ≥ target {target:.2f} — objective met.", "OK")
        return
    log(
        f"{metric_name} {value:.3f} < target {target:.2f} — objective NOT met.\n"
        "  Recommendations:\n"
        "    1. Collect more labelled images (aim 1000+ per class).\n"
        "    2. Increase epochs (try 100–200 on GPU).\n"
        "    3. Use a larger model variant (yolov8s.pt / yolov8m.pt).\n"
        "    4. Apply stronger augmentation: copy-paste, mixup.\n"
        "    5. Check annotation quality — noisy labels degrade mAP significantly.",
        "WARN",
    )


def _export_onnx(weights: Path, imgsz: int) -> None:
    """
    Export next to the .pt — the API prefers the ONNX graph on DirectML.
    opset 12 is what the victim re-export was verified with; the class names
    travel in the graph metadata, which is how yolo_model.py orders them.
    """
    from ultralytics import YOLO  # type: ignore
    out = YOLO(str(weights)).export(format="onnx", imgsz=imgsz, opset=12)
    log(f"ONNX export → {out}", "OK")


def _evaluate_damage_holdout(weights: Path) -> dict | None:
    """Per-class accuracy on the clip frames prepare_aerial_datasets.py held back."""
    if not DAMAGE_HOLDOUT.is_dir():
        log(f"No clip holdout at {DAMAGE_HOLDOUT} — skipped", "WARN")
        return None
    from ultralytics import YOLO  # type: ignore
    model = YOLO(str(weights))
    report: dict[str, dict] = {}
    for cls_dir in sorted(p for p in DAMAGE_HOLDOUT.iterdir() if p.is_dir()):
        frames = sorted(cls_dir.glob("*.jpg"))
        if not frames:
            continue
        predicted: dict[str, int] = {}
        for res in model(frames, imgsz=DAMAGE_IMGSZ, verbose=False, stream=True):
            name = res.names[int(res.probs.top1)]
            predicted[name] = predicted.get(name, 0) + 1
        correct = predicted.get(cls_dir.name, 0)
        report[cls_dir.name] = {
            "frames": len(frames),
            "accuracy": round(correct / len(frames), 4),
            "predicted": predicted,
        }
        log(f"Holdout {cls_dir.name:<18} {correct}/{len(frames)} correct  {predicted}",
            "OK" if correct == len(frames) else "WARN")
    return report
# ─────────────────────────────────────────────────────────────────────────────
def train_victim(args: argparse.Namespace) -> None:
    log("=" * 60)
    log("VICTIM DETECTION — Training YOLOv8n (detection)")
    log("=" * 60)

    if not _check_yaml(VICTIM_YAML, "Victim"):
        return

    RESULTS_VICTIM.mkdir(parents=True, exist_ok=True)

    from ultralytics import YOLO  # type: ignore

    model = YOLO(base_weight("yolov8n.pt"))
    log(f"Loaded base weights: yolov8n.pt")
    log(f"Dataset: {VICTIM_YAML}")
    log(f"Epochs: {args.epochs}  Batch: {args.batch}  imgsz: {args.imgsz}")

    t0 = time.perf_counter()

    results = model.train(
        data=str(VICTIM_YAML),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        patience=args.patience,
        optimizer="AdamW",
        lr0=args.lr0,
        augment=True,
        mosaic=1.0,
        flipud=0.5,
        fliplr=0.5,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        project=str(RESULTS_VICTIM),
        name="victim_train",
        exist_ok=True,
        verbose=True,
        device=args.device,
        workers=args.workers,
        save=True,
        save_period=10,
    )

    elapsed = time.perf_counter() - t0

    # ── Extract final metrics ───────────────────────────────────────────────
    best_map50   = float(results.results_dict.get("metrics/mAP50(B)", 0))
    best_map5095 = float(results.results_dict.get("metrics/mAP50-95(B)", 0))
    precision    = float(results.results_dict.get("metrics/precision(B)", 0))
    recall       = float(results.results_dict.get("metrics/recall(B)", 0))
    best_epoch   = int(getattr(results, "best_epoch", args.epochs))

    _print_summary(
        "Victim Detection",
        {
            "mAP@0.5":       f"{best_map50:.4f}",
            "mAP@0.5:0.95":  f"{best_map5095:.4f}",
            "Precision":      f"{precision:.4f}",
            "Recall":         f"{recall:.4f}",
            "Best epoch":     best_epoch,
        },
        elapsed,
    )
    _recommendations("mAP@0.5", best_map50, TARGET_MAP50)

    # ── Copy best weights ──────────────────────────────────────────────────
    best_src = RESULTS_VICTIM / "victim_train" / "weights" / "best.pt"
    if best_src.exists():
        VICTIM_BEST.parent.mkdir(parents=True, exist_ok=True)
        import shutil
        shutil.copy2(best_src, VICTIM_BEST)
        log(f"Best weights saved → {VICTIM_BEST}", "OK")
    else:
        log(f"best.pt not found at {best_src} — check training output.", "WARN")

    # ── Save metric metadata ───────────────────────────────────────────────
    import json
    meta = {
        "map50": round(best_map50, 4),
        "map50_95": round(best_map5095, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "best_epoch": best_epoch,
        "epochs_trained": args.epochs,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (MODELS_DIR / "victim_meta.json").write_text(json.dumps(meta, indent=2))
    log(f"Metrics saved → {MODELS_DIR / 'victim_meta.json'}", "OK")


# ─────────────────────────────────────────────────────────────────────────────
# Damage Classification training
# ─────────────────────────────────────────────────────────────────────────────
def train_damage(args: argparse.Namespace) -> None:
    log("=" * 60)
    log("DAMAGE CLASSIFICATION — Training YOLOv8n-cls")
    log("=" * 60)

    if not (DAMAGE_DIR / "train").is_dir():
        log(
            f"Damage dataset not found at {DAMAGE_DIR}.\n"
            "  Run: python scripts/training/prepare_aerial_datasets.py --damage-only first.",
            "ERR",
        )
        return

    RESULTS_DAMAGE.mkdir(parents=True, exist_ok=True)

    from ultralytics import YOLO  # type: ignore

    model = YOLO(base_weight("yolov8n-cls.pt"))
    log(f"Loaded base weights: yolov8n-cls.pt")
    log(f"Dataset: {DAMAGE_DIR}")
    log(f"Epochs: {args.epochs}  Batch: {args.batch}  imgsz: {DAMAGE_IMGSZ}")

    t0 = time.perf_counter()

    results = model.train(
        data=str(DAMAGE_DIR),
        epochs=args.epochs,
        imgsz=DAMAGE_IMGSZ,
        batch=args.batch,
        patience=args.patience,
        optimizer="AdamW",
        lr0=args.lr0,
        augment=True,
        flipud=0.5,
        fliplr=0.5,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        project=str(RESULTS_DAMAGE),
        name="damage_train",
        exist_ok=True,
        verbose=True,
        device=args.device,
        workers=args.workers,
        save=True,
        save_period=10,
    )

    elapsed = time.perf_counter() - t0

    # ── Extract final metrics ───────────────────────────────────────────────
    top1 = float(results.results_dict.get("metrics/accuracy_top1", 0))
    top5 = float(results.results_dict.get("metrics/accuracy_top5", 0))
    best_epoch = int(getattr(results, "best_epoch", args.epochs))

    _print_summary(
        "Damage Classification",
        {
            "Top-1 accuracy": f"{top1:.4f}",
            "Top-5 accuracy": f"{top5:.4f}",
            "Best epoch":      best_epoch,
        },
        elapsed,
    )
    _recommendations("Top-1 accuracy", top1, TARGET_ACC_TOP1)

    # ── Copy best weights ──────────────────────────────────────────────────
    best_src = RESULTS_DAMAGE / "damage_train" / "weights" / "best.pt"
    if best_src.exists():
        DAMAGE_BEST.parent.mkdir(parents=True, exist_ok=True)
        import shutil
        shutil.copy2(best_src, DAMAGE_BEST)
        log(f"Best weights saved → {DAMAGE_BEST}", "OK")
        _export_onnx(DAMAGE_BEST, DAMAGE_IMGSZ)
    else:
        log(f"best.pt not found at {best_src} — check training output.", "WARN")
        return

    holdout = _evaluate_damage_holdout(DAMAGE_BEST)

    # ── Save metric metadata ───────────────────────────────────────────────
    import json
    meta = {
        "accuracy_top1": round(top1, 4),
        "accuracy_top5": round(top5, 4),
        "clip_holdout_accuracy": holdout,
        "best_epoch": best_epoch,
        "epochs_trained": args.epochs,
        "imgsz": DAMAGE_IMGSZ,
        "dataset": "AIDER (Zenodo 3888300) + demo clip frames",
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (MODELS_DIR / "damage_meta.json").write_text(json.dumps(meta, indent=2))
    log(f"Metrics saved → {MODELS_DIR / 'damage_meta.json'}", "OK")


# ─────────────────────────────────────────────────────────────────────────────
# Fire / Smoke Detection training
# ─────────────────────────────────────────────────────────────────────────────
def train_fire(args: argparse.Namespace) -> None:
    log("=" * 60)
    log("FIRE/SMOKE DETECTION — Training YOLOv8n (detection)")
    log("=" * 60)

    if not _check_yaml(FIRE_YAML, "Fire"):
        return

    RESULTS_FIRE.mkdir(parents=True, exist_ok=True)

    from ultralytics import YOLO  # type: ignore

    model = YOLO(base_weight("yolov8n.pt"))
    log(f"Loaded base weights: yolov8n.pt")
    log(f"Dataset: {FIRE_YAML}")
    log(f"Epochs: {args.epochs}  Batch: {args.batch}  imgsz: {args.imgsz}")

    t0 = time.perf_counter()

    results = model.train(
        data=str(FIRE_YAML),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        patience=args.patience,
        optimizer="AdamW",
        lr0=args.lr0,
        mosaic=1.0,
        # A drone looks down from any heading, so vertical flips are real
        # views. Hue is kept tight: shifting it far enough turns orange flame
        # into something the model should not call fire.
        flipud=0.5,
        fliplr=0.5,
        hsv_h=0.01,
        hsv_s=0.6,
        hsv_v=0.4,
        project=str(RESULTS_FIRE),
        name="fire_train",
        exist_ok=True,
        verbose=True,
        device=args.device,
        workers=args.workers,
        save=True,
        save_period=10,
    )

    elapsed = time.perf_counter() - t0

    best_map50   = float(results.results_dict.get("metrics/mAP50(B)", 0))
    best_map5095 = float(results.results_dict.get("metrics/mAP50-95(B)", 0))
    precision    = float(results.results_dict.get("metrics/precision(B)", 0))
    recall       = float(results.results_dict.get("metrics/recall(B)", 0))
    best_epoch   = int(getattr(results, "best_epoch", args.epochs))

    _print_summary(
        "Fire/Smoke Detection",
        {
            "mAP@0.5":       f"{best_map50:.4f}",
            "mAP@0.5:0.95":  f"{best_map5095:.4f}",
            "Precision":      f"{precision:.4f}",
            "Recall":         f"{recall:.4f}",
            "Best epoch":     best_epoch,
        },
        elapsed,
    )
    _recommendations("mAP@0.5", best_map50, TARGET_MAP50)

    best_src = RESULTS_FIRE / "fire_train" / "weights" / "best.pt"
    if not best_src.exists():
        log(f"best.pt not found at {best_src} — check training output.", "WARN")
        return
    FIRE_BEST.parent.mkdir(parents=True, exist_ok=True)
    import shutil
    shutil.copy2(best_src, FIRE_BEST)
    log(f"Best weights saved → {FIRE_BEST}", "OK")
    _export_onnx(FIRE_BEST, args.imgsz)

    import json
    meta = {
        "map50": round(best_map50, 4),
        "map50_95": round(best_map5095, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "best_epoch": best_epoch,
        "epochs_trained": args.epochs,
        "imgsz": args.imgsz,
        "classes": ["smoke", "fire"],
        "dataset": "D-Fire (huggingface.co/datasets/badsaarow/d-fire)",
        "model": "yolov8n",
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (MODELS_DIR / "fire_meta.json").write_text(json.dumps(meta, indent=2))
    log(f"Metrics saved → {MODELS_DIR / 'fire_meta.json'}", "OK")


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="RescueEye model training")
    parser.add_argument("--victim-only",  action="store_true")
    parser.add_argument("--damage-only",  action="store_true")
    parser.add_argument("--fire-only",    action="store_true")
    parser.add_argument("--epochs",   type=int,   default=50)
    parser.add_argument("--batch",    type=int,   default=16)
    parser.add_argument("--imgsz",    type=int,   default=640)
    parser.add_argument("--patience", type=int,   default=10)
    parser.add_argument("--lr0",      type=float, default=0.001)
    parser.add_argument("--device",   type=str,   default="",
                        help="cuda device (0/1/cpu). Empty = auto-detect.")
    parser.add_argument("--workers",  type=int,   default=4)
    args = parser.parse_args()

    only = {"victim": args.victim_only, "damage": args.damage_only, "fire": args.fire_only}
    run_all = not any(only.values())

    if run_all or only["victim"]:
        train_victim(args)
    if run_all or only["damage"]:
        train_damage(args)
    if run_all or only["fire"]:
        train_fire(args)

    log("\nAll training runs complete.", "OK")


if __name__ == "__main__":
    main()
