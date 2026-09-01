"""Unit tests for the pure _get_severity() helper in routers/classify.py."""
from routers.classify import _get_severity


def test_no_damage_is_always_clear():
    tier, action = _get_severity("no_damage", 0.99)
    assert tier == "CLEAR"
    assert "No immediate action" in action


def test_fire_damage_critical_at_high_confidence():
    tier, _ = _get_severity("fire_damage", 0.85)
    assert tier == "CRITICAL"


def test_fire_damage_moderate_at_mid_confidence():
    tier, _ = _get_severity("fire_damage", 0.60)
    assert tier == "MODERATE"


def test_fire_damage_minor_at_low_confidence():
    tier, _ = _get_severity("fire_damage", 0.40)
    assert tier == "MINOR"


def test_severity_thresholds_are_inclusive_boundaries():
    # Exactly at the critical threshold (0.80) should count as CRITICAL
    tier, _ = _get_severity("flood_damage", 0.80)
    assert tier == "CRITICAL"
    # Exactly at the moderate threshold (0.55) should count as MODERATE
    tier, _ = _get_severity("flood_damage", 0.55)
    assert tier == "MODERATE"


def test_known_label_severity_pairs_have_specific_actions():
    tier, action = _get_severity("structural_damage", 0.90)
    assert tier == "CRITICAL"
    assert "collapse" in action.lower()


def test_unknown_label_falls_back_to_generic_action():
    tier, action = _get_severity("some_unmapped_label", 0.90)
    assert tier == "CRITICAL"
    assert "assess area" in action.lower()
