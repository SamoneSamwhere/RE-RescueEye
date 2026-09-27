"""
The damage class names must stay in the order the model was trained in.

classify.py falls back to indexing DAMAGE_CLASS_NAMES by the class id the model
returns. That is only correct while the list matches the graph. It did not: the
constant was ["flood", "fire", "structural", "no_damage"] against a model
trained ["fire", "flood", "no_damage", "structural"], so every id resolved to
the wrong label — and id 2 reported structural damage as "no_damage", which
_get_severity turns into CLEAR, telling an operator a damaged building is safe.
"""
import ast
from pathlib import Path

import pytest

from services.yolo_model import DAMAGE_CLASS_NAMES

MODEL = Path(__file__).resolve().parent.parent / "models" / "damage_best.onnx"


def _graph_names() -> list[str]:
    onnx = pytest.importorskip("onnx")
    model = onnx.load(str(MODEL), load_external_data=False)
    meta = {p.key: p.value for p in model.metadata_props}
    names = ast.literal_eval(meta["names"])
    return [names[i] for i in sorted(names)]


@pytest.mark.skipif(not MODEL.exists(), reason="damage_best.onnx not installed")
def test_constant_matches_the_trained_class_order():
    assert DAMAGE_CLASS_NAMES == _graph_names()


@pytest.mark.skipif(not MODEL.exists(), reason="damage_best.onnx not installed")
def test_no_damage_is_not_reachable_by_a_damaged_class_id():
    """
    The specific failure that mattered: a damaged class resolving to no_damage.
    Pinned on its own because this one flips the severity tier to CLEAR rather
    than merely renaming the hazard.
    """
    graph = _graph_names()
    for cls_id, true_label in enumerate(graph):
        resolved = DAMAGE_CLASS_NAMES[cls_id % len(DAMAGE_CLASS_NAMES)]
        if true_label != "no_damage":
            assert resolved != "no_damage", f"class {cls_id} ({true_label}) resolved to no_damage"
        assert resolved == true_label
