from typing import cast

from dataguard.evaluation.pii_benchmark import CASES, evaluate


def test_synthetic_benchmark_is_reproducible_and_reports_document_metrics() -> None:
    first = evaluate()
    second = evaluate()

    assert first == second
    assert first["cases"] == len(CASES)
    assert first["unit"] == "document_label_presence"
    assert first["synthetic_only"] is True
    assert set(first["split_counts"]) == {"development", "held_out"}
    assert first["split_counts"]["development"] > 0
    assert first["split_counts"]["held_out"] > 0

    micro = cast(dict[str, object], first["micro"])
    assert {"precision", "recall", "f1", "tp", "fp", "fn"} <= micro.keys()
    for metric in ("precision", "recall", "f1"):
        value = micro[metric]
        assert value is None or 0.0 <= cast(float, value) <= 1.0

    per_class = cast(dict[str, dict[str, object]], first["per_class"])
    assert per_class
    for metrics in per_class.values():
        assert {"precision", "recall", "f1", "tp", "fp", "fn"} <= metrics.keys()
        for metric in ("precision", "recall", "f1"):
            value = metrics[metric]
            assert value is None or 0.0 <= cast(float, value) <= 1.0


def test_held_out_cases_do_not_reuse_declared_template_groups() -> None:
    development_groups = {case.template_group for case in CASES if case.split == "development"}
    held_out_groups = {case.template_group for case in CASES if case.split == "held_out"}

    assert development_groups
    assert held_out_groups
    assert development_groups.isdisjoint(held_out_groups)


def test_benchmark_contains_hard_negatives_and_multiple_locales() -> None:
    assert any(case.difficulty == "hard_negative" and not case.expected for case in CASES)
    assert {"fr-CA", "en-CA"} <= {case.language for case in CASES}
    assert len({case.case_id for case in CASES}) == len(CASES)
    assert len({case.template_group for case in CASES}) < len(CASES)


def test_empty_metric_denominators_are_not_reported_as_perfect_scores() -> None:
    result = evaluate(())
    assert result["cases"] == 0
    assert result["macro_f1"] is None
    assert result["per_class"] == {}
    assert result["micro"]["precision"] is None
    assert result["micro"]["recall"] is None
    assert result["micro"]["f1"] is None
