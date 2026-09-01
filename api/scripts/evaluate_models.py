"""
RescueEye — Phase 3 Model Evaluation
========================================
Evaluates both trained models against their test splits and
asserts the combined inference latency constraint (Objective 6).

Usage:
    python api/scripts/evaluate_models.py [--victim-only | --damage-only]
    python api/scripts/evaluate_models.py --latency-frames 100

Outputs saved to:
    models/victim_results/confusion_matrix.png
    models/victim_results/pr_curve.png
    models/damage_results/confusion_matrix.png
    models/evaluation_report.json   ← machine-readable summary
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
REPO_ROOT  = SCRIPT_DIR.parent
DATA_ROOT  = Path(os.getenv("DATA_ROOT",  str(REPO_ROOT / "data")))
MODELS_DIR = Path(os.getenv("MODELS_DIR", str(REPO_ROOT / "models")))

VICTIM_YAML  = DATA_ROOT / "victim.yaml"
DAMAGE_YAML  = DATA_ROOT / "damage.yaml"
VICTIM_BEST  = Path(os.getenv("VICTIM_MODEL_PATH", str(MODELS_DIR / "victim_best.pt")))
DAMAGE_BEST  = Path(os.getenv("DAMAGE_MODEL_PATH", str(MODELS_DIR / "damage_best.pt")))

RESULTS_VICTIM = MODELS_DIR / "victim_results"
RESULTS_DAMAGE = MODELS_DIR / "damage_results"

LATENCY_THRESHOLD_MS = float(os.getenv("LATENCY_WARN_MS", "3000"))
DAMAGE_CLASSES = ["flood_damage", "fire_damage", "structural_damage", "no_damage"]

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
RESET  = "\033[0m"
BOLD   = "\033[1m"


def log(msg: str, level: str = "INFO") -> None:
    color = {"INFO": "", "OK": GREEN, "WARN": YELLOW, "ERR": RED}.get(level, "")
    print(f"{color}[{level}] {msg}{RESET}")


def _divider(title: str = "") -> None:
    if title:
        pad = (60 - len(title) - 2) // 2
        print(f"\n{BOLD}{'─'*pad} {title} {'─'*pad}{RESET}")
    else:
        print(f"{'─'*60}")


# ─────────────────────────────────────────────────────────────────────────────
# Victim Detection Evaluation
# ─────────────────────────────────────────────────────────────────────────────
def evaluate_victim(latency_frames: int = 100) -> dict:
    _divider("VICTIM DETECTION — EVALUATION")

    weights = VICTIM_BEST if VICTIM_BEST.exists() else "yolov8n.pt"
    log(f"Weights: {weights}")
    if not VICTIM_YAML.exists():
        log(f"Dataset YAML not found: {VICTIM_YAML}", "ERR")
        return {}

    from ultralytics import YOLO  # type: ignore
    import numpy as np

    model = YOLO(str(weights))
    RESULTS_VICTIM.mkdir(parents=True, exist_ok=True)

    # ── Validation metrics ─────────────────────────────────────────────────
    log("Running validation on test split ...")
    val_results = model.val(
        data=str(VICTIM_YAML),
        split="test",
        project=str(RESULTS_VICTIM),
        name="eval",
        exist_ok=True,
        verbose=False,
        conf=0.40,
        iou=0.50,
        save_json=True,
        plots=True,
    )

    map50   = float(val_results.results_dict.get("metrics/mAP50(B)", 0))
    map5095 = float(val_results.results_dict.get("metrics/mAP50-95(B)", 0))
    prec    = float(val_results.results_dict.get("metrics/precision(B)", 0))
    rec     = float(val_results.results_dict.get("metrics/recall(B)", 0))
    f1      = 2 * prec * rec / (prec + rec + 1e-8)

    _divider()
    print(f"  {'mAP@0.5':<28} {map50:.4f}")
    print(f"  {'mAP@0.5:0.95':<28} {map5095:.4f}")
    print(f"  {'Precision':<28} {prec:.4f}")
    print(f"  {'Recall':<28} {rec:.4f}")
    print(f"  {'F1':<28} {f1:.4f}")

    # ── Per-frame latency on test images ──────────────────────────────────
    log(f"\nLatency test: {latency_frames} frames ...")
    test_img_dir = DATA_ROOT / "victim" / "images" / "test"
    test_imgs = sorted(test_img_dir.glob("*.jpg")) + sorted(test_img_dir.glob("*.png"))

    if not test_imgs:
        log("No test images found — using synthetic frames for latency test.", "WARN")
        test_imgs = [None] * latency_frames

    times = []
    for i in range(latency_frames):
        if test_imgs and test_imgs[i % len(test_imgs)] is not None:
            src = str(test_imgs[i % len(test_imgs)])
        else:
            src = np.zeros((480, 640, 3), dtype=np.uint8)

        t0 = time.perf_counter()
        model(src, verbose=False, conf=0.40)
        times.append((time.perf_counter() - t0) * 1000)

    avg_ms = sum(times) / len(times)
    print(f"\n  {'Avg inference / frame':<28} {avg_ms:.1f} ms")
    print(f"  {'Min':<28} {min(times):.1f} ms")
    print(f"  {'Max':<28} {max(times):.1f} ms")
    print(f"  {'P95':<28} {sorted(times)[int(0.95*len(times))]:.1f} ms")

    # ── Copy saved plots if ultralytics generated them ────────────────────
    eval_dir = RESULTS_VICTIM / "eval"
    for plot_name in ("confusion_matrix.png", "PR_curve.png", "F1_curve.png"):
        src_plot = eval_dir / plot_name
        if src_plot.exists():
            import shutil
            dst = RESULTS_VICTIM / plot_name.lower().replace("pr_curve", "pr_curve").replace("PR_curve", "pr_curve")
            shutil.copy2(src_plot, dst)
            log(f"Saved plot → {dst}", "OK")

    return {
        "map50":      round(map50, 4),
        "map50_95":   round(map5095, 4),
        "precision":  round(prec, 4),
        "recall":     round(rec, 4),
        "f1":         round(f1, 4),
        "avg_inference_ms": round(avg_ms, 1),
        "weights":    str(weights),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Damage Classification Evaluation
# ─────────────────────────────────────────────────────────────────────────────
def evaluate_damage(latency_frames: int = 100) -> dict:
    _divider("DAMAGE CLASSIFICATION — EVALUATION")

    weights = DAMAGE_BEST if DAMAGE_BEST.exists() else "yolov8n-cls.pt"
    log(f"Weights: {weights}")
    if not DAMAGE_YAML.exists():
        log(f"Dataset YAML not found: {DAMAGE_YAML}", "ERR")
        return {}

    from ultralytics import YOLO  # type: ignore
    import numpy as np

    model = YOLO(str(weights))
    RESULTS_DAMAGE.mkdir(parents=True, exist_ok=True)

    # ── Validation metrics ────────────────────────────────────────────────
    log("Running validation on test split ...")
    val_results = model.val(
        data=str(DAMAGE_YAML),
        split="test",
        project=str(RESULTS_DAMAGE),
        name="eval",
        exist_ok=True,
        verbose=False,
        plots=True,
    )

    top1 = float(val_results.results_dict.get("metrics/accuracy_top1", 0))
    top5 = float(val_results.results_dict.get("metrics/accuracy_top5", 0))

    _divider()
    print(f"  {'Top-1 accuracy':<28} {top1:.4f}")
    print(f"  {'Top-5 accuracy':<28} {top5:.4f}")

    # ── Per-class accuracy ─────────────────────────────────────────────────
    log("\nPer-class accuracy (test split):")
    per_class: dict[str, float] = {}
    for cls in DAMAGE_CLASSES:
        cls_dir = DATA_ROOT / "damage" / "test" / cls
        imgs = (
            list(cls_dir.glob("*.jpg")) + list(cls_dir.glob("*.png"))
            if cls_dir.exists()
            else []
        )
        if not imgs:
            per_class[cls] = 0.0
            continue

        correct = 0
        sample = imgs[:min(100, len(imgs))]
        for img in sample:
            res = model(str(img), verbose=False)
            pred_cls_id = int(res[0].probs.top1)
            pred_name   = res[0].names[pred_cls_id]
            if pred_name == cls:
                correct += 1
        acc = correct / len(sample)
        per_class[cls] = round(acc, 4)
        print(f"    {cls:<24} {acc:.4f}")

    # ── Latency ──────────────────────────────────────────────────────────
    log(f"\nLatency test: {latency_frames} frames ...")
    test_dir = DATA_ROOT / "damage" / "test"
    all_test = []
    if test_dir.exists():
        for cls in DAMAGE_CLASSES:
            all_test += list((test_dir / cls).glob("*.jpg"))
            all_test += list((test_dir / cls).glob("*.png"))

    times = []
    for i in range(latency_frames):
        src = (
            str(all_test[i % len(all_test)])
            if all_test
            else np.zeros((224, 224, 3), dtype=np.uint8)
        )
        t0 = time.perf_counter()
        model(src, verbose=False)
        times.append((time.perf_counter() - t0) * 1000)

    avg_ms = sum(times) / len(times)
    print(f"\n  {'Avg inference / frame':<28} {avg_ms:.1f} ms")
    print(f"  {'Min':<28} {min(times):.1f} ms")
    print(f"  {'Max':<28} {max(times):.1f} ms")

    # ── Copy confusion matrix ─────────────────────────────────────────────
    eval_dir = RESULTS_DAMAGE / "eval"
    cm_src = eval_dir / "confusion_matrix.png"
    if cm_src.exists():
        import shutil
        shutil.copy2(cm_src, RESULTS_DAMAGE / "confusion_matrix.png")
        log(f"Saved confusion matrix → {RESULTS_DAMAGE / 'confusion_matrix.png'}", "OK")

    return {
        "accuracy_top1":     round(top1, 4),
        "accuracy_top5":     round(top5, 4),
        "per_class_accuracy": per_class,
        "avg_inference_ms":  round(avg_ms, 1),
        "weights":           str(weights),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Combined latency assertion (Objective 6)
# ─────────────────────────────────────────────────────────────────────────────
def latency_assertion(victim_avg_ms: float, damage_avg_ms: float) -> bool:
    _divider("LATENCY ASSERTION — OBJECTIVE 6")
    combined = victim_avg_ms + damage_avg_ms
    threshold = LATENCY_THRESHOLD_MS
    print(f"  {'Victim detection avg':<32} {victim_avg_ms:.1f} ms")
    print(f"  {'Damage classification avg':<32} {damage_avg_ms:.1f} ms")
    print(f"  {'Combined':<32} {combined:.1f} ms")
    print(f"  {'Threshold':<32} {threshold:.0f} ms")
    print()
    if combined < threshold:
        log(f"PASS  —  {combined:.0f}ms < {threshold:.0f}ms  ✓", "OK")
        return True
    else:
        log(f"FAIL  —  {combined:.0f}ms ≥ {threshold:.0f}ms  ✗", "ERR")
        log(
            "To reduce latency:\n"
            "  1. Switch to yolov8n (nano) — already the fastest variant.\n"
            "  2. Reduce imgsz to 320 for inference (slight accuracy trade-off).\n"
            "  3. Enable ONNX or TorchScript export for faster CPU inference.\n"
            "  4. Run detect + classify in parallel (asyncio / thread pool).",
            "WARN",
        )
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="RescueEye model evaluation")
    parser.add_argument("--victim-only",    action="store_true")
    parser.add_argument("--damage-only",    action="store_true")
    parser.add_argument("--latency-frames", type=int, default=100)
    args = parser.parse_args()

    report: dict = {}

    victim_avg_ms = 0.0
    damage_avg_ms = 0.0

    if not args.damage_only:
        v_metrics = evaluate_victim(args.latency_frames)
        report["victim_detection"] = v_metrics
        victim_avg_ms = v_metrics.get("avg_inference_ms", 0)

    if not args.victim_only:
        d_metrics = evaluate_damage(args.latency_frames)
        report["damage_classification"] = d_metrics
        damage_avg_ms = d_metrics.get("avg_inference_ms", 0)

    if not args.victim_only and not args.damage_only:
        passed = latency_assertion(victim_avg_ms, damage_avg_ms)
        report["latency_assertion"] = {
            "victim_avg_ms":  victim_avg_ms,
            "damage_avg_ms":  damage_avg_ms,
            "combined_ms":    round(victim_avg_ms + damage_avg_ms, 1),
            "threshold_ms":   LATENCY_THRESHOLD_MS,
            "passed":         passed,
        }

    # ── Write evaluation report ───────────────────────────────────────────
    report_path = MODELS_DIR / "evaluation_report.json"
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2))
    log(f"\nEvaluation report → {report_path}", "OK")

    # ── Final metric summary ──────────────────────────────────────────────
    _divider("SUMMARY")
    if "victim_detection" in report:
        v = report["victim_detection"]
        status = GREEN + "✓" if v.get("map50", 0) >= 0.70 else YELLOW + "⚠"
        print(f"  Victim mAP@0.5  {v.get('map50', '—')}  {status}{RESET}")
    if "damage_classification" in report:
        d = report["damage_classification"]
        status = GREEN + "✓" if d.get("accuracy_top1", 0) >= 0.75 else YELLOW + "⚠"
        print(f"  Damage Top-1    {d.get('accuracy_top1', '—')}  {status}{RESET}")
    if "latency_assertion" in report:
        la = report["latency_assertion"]
        status = (GREEN + "PASS") if la["passed"] else (RED + "FAIL")
        print(f"  Latency         {la['combined_ms']}ms combined  {status}{RESET}")
    print()


if __name__ == "__main__":
    main()
