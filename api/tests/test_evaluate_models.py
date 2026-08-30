"""
Unit tests for scripts/evaluate_models.py's pure latency_assertion() logic.
evaluate_victim()/evaluate_damage() themselves are NOT tested — they run real
model.val() against the full VisDrone dataset, which isn't available here and
would be far too slow for a test suite. Explicit non-goal per the test plan.
"""
from scripts.evaluate_models import latency_assertion, LATENCY_THRESHOLD_MS


def test_passes_when_combined_latency_is_under_threshold():
    assert latency_assertion(100.0, 100.0) is True


def test_fails_when_combined_latency_meets_or_exceeds_threshold():
    half = LATENCY_THRESHOLD_MS / 2
    assert latency_assertion(half, half) is False


def test_fails_when_combined_latency_well_over_threshold():
    assert latency_assertion(LATENCY_THRESHOLD_MS, LATENCY_THRESHOLD_MS) is False


def test_passes_just_under_threshold():
    assert latency_assertion(0, LATENCY_THRESHOLD_MS - 1) is True
