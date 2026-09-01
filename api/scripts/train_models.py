"""
RescueEye — Phase 3 Model Training
=====================================
Trains two YOLOv8 models:
  1. Victim Detection  — YOLOv8n (detection) on victim.yaml
  2. Damage Classification — YOLOv8n-cls (classification) on damage.yaml

Recommended: run on Google Colab (free T4 GPU) via the notebook at
  notebooks/train_rescueeye.ipynb

Local CPU training works but is much slower (~hours vs minutes on GPU).

Usage:
    python api/scripts/train_models.py [--victim-only | --damage-only]
    python api/scripts/train_models.py --epochs 50 --batch 16

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
REPO_ROOT   = SCRIPT_DIR.parent
DATA_ROOT   = Path(os.getenv("DATA_ROOT",  str(REPO_ROOT / "data")))
MODELS_DIR  = Path(os.getenv("MODELS_DIR", str(REPO_ROOT / "models")))

VICTIM_YAML  = DATA_ROOT / "victim.yaml"
DAMAGE_YAML  = DATA_ROOT / "damage.yaml"
VICTIM_BEST  = Path(os.getenv("VICTIM_MODEL_PATH", str(MODELS_DIR / "victim_best.pt")))
DAMAGE_BEST  = Path(os.getenv("DAMAGE_MODEL_PATH", str(MODELS_DIR / "damage_best.pt")))

RESULTS_VICTIM = MODELS_DIR / "victim_results"
RESULTS_DAMAGE = MODELS_DIR / "damage_results"

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
            "  Run: python api/scripts/prepare_dataset.py first.",
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


# ─────────────────────────────────────────────────────────────────────────────
# Victim Detection training
# ─────────────────────────────────────────────────────────────────────────────
def train_victim(args: argparse.Namespace) -> None:
    log("=" * 60)
    log("VICTIM DETECTION — Training YOLOv8n (detection)")
    log("=" * 60)

    if not _check_yaml(VICTIM_YAML, "Victim"):
        return

    RESULTS_VICTIM.mkdir(parents=True, exist_ok=True)

    from ultralytics import YOLO  # type: ignore

    model = YOLO("yolov8n.pt")
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

    if not _check_yaml(DAMAGE_YAML, "Damage"):
        return

    RESULTS_DAMAGE.mkdir(parents=True, exist_ok=True)

    from ultralytics import YOLO  # type: ignore

    model = YOLO("yolov8n-cls.pt")
    log(f"Loaded base weights: yolov8n-cls.pt")
    log(f"Dataset: {DAMAGE_YAML}")
    log(f"Epochs: {args.epochs}  Batch: {args.batch}  imgsz: {args.imgsz}")

    t0 = time.perf_counter()

    results = model.train(
        data=str(DAMAGE_YAML),
        epochs=args.epochs,
        imgsz=args.imgsz,
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
    else:
        log(f"best.pt not found at {best_src} — check training output.", "WARN")

    # ── Save metric metadata ───────────────────────────────────────────────
    import json
    meta = {
        "accuracy_top1": round(top1, 4),
        "accuracy_top5": round(top5, 4),
        "best_epoch": best_epoch,
        "epochs_trained": args.epochs,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (MODELS_DIR / "damage_meta.json").write_text(json.dumps(meta, indent=2))
    log(f"Metrics saved → {MODELS_DIR / 'damage_meta.json'}", "OK")


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="RescueEye model training")
    parser.add_argument("--victim-only",  action="store_true")
    parser.add_argument("--damage-only",  action="store_true")
    parser.add_argument("--epochs",   type=int,   default=50)
    parser.add_argument("--batch",    type=int,   default=16)
    parser.add_argument("--imgsz",    type=int,   default=640)
    parser.add_argument("--patience", type=int,   default=10)
    parser.add_argument("--lr0",      type=float, default=0.001)
    parser.add_argument("--device",   type=str,   default="",
                        help="cuda device (0/1/cpu). Empty = auto-detect.")
    parser.add_argument("--workers",  type=int,   default=4)
    args = parser.parse_args()

    if not args.damage_only:
        train_victim(args)
    if not args.victim_only:
        train_damage(args)

    log("\nAll training runs complete.", "OK")


if __name__ == "__main__":
    main()
