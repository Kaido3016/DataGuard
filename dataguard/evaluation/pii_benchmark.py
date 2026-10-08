from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from dataguard.detection.regex import RegexPIIDetector


@dataclass(frozen=True)
class Case:
    """One fictional document-level multi-label benchmark example."""

    case_id: str
    text: str
    expected: frozenset[str]
    split: str
    template_group: str
    language: str
    difficulty: str


# Synthetic-only document-label benchmark. All identifiers are fictional.
# Held-out cases use distinct template_group values; do not move cases between
# splits to tune rules and then continue calling the resulting split "held out".
CASES = (
    Case(
        "dev-001",
        "Nom: Alice Tremblay\nCourriel: alice@example.com",
        frozenset({"PERSON", "EMAIL"}),
        "development",
        "label_name_email",
        "fr-CA",
        "canonical",
    ),
    Case(
        "dev-002", "Téléphone: +1 514-555-0199", frozenset({"PHONE"}),
        "development", "label_phone", "fr-CA", "canonical",
    ),
    Case(
        "dev-003", "NAS: 123-456-789", frozenset({"SOCIAL_INSURANCE_NUMBER"}),
        "development", "label_nas", "fr-CA", "canonical",
    ),
    Case(
        "dev-004", "RAMQ: ABCE 12345678", frozenset({"HEALTH_INSURANCE_ID"}),
        "development", "label_ramq", "fr-CA", "canonical",
    ),
    Case(
        "dev-005", "Adresse: 123 Rue Exemple, Montréal", frozenset({"ADDRESS"}),
        "development", "label_address", "fr-CA", "canonical",
    ),
    Case(
        "dev-006", "IP: 192.0.2.10", frozenset({"IP_ADDRESS"}),
        "development", "label_ip", "fr-CA", "canonical",
    ),
    Case(
        "dev-007", "Diagnostic: condition fictive", frozenset({"HEALTH_INFORMATION"}),
        "development", "label_health", "fr-CA", "canonical",
    ),
    Case(
        "dev-008", "Date de naissance: 1985-04-12", frozenset({"DATE_OF_BIRTH"}),
        "development", "label_dob", "fr-CA", "canonical",
    ),
    Case(
        "dev-009", "Réunion à Montréal demain à 10 h.", frozenset(),
        "development", "plain_meeting", "fr-CA", "hard_negative",
    ),
    Case(
        "dev-010", "Le dossier contient trois lignes sans identifiant.", frozenset(),
        "development", "plain_dossier", "fr-CA", "easy_negative",
    ),
    Case(
        "dev-011", "Référence de commande: 123-456-7890", frozenset(),
        "development", "order_reference", "fr-CA", "hard_negative",
    ),
    Case(
        "dev-012", "Le numéro de lot est 192.0.2.999.", frozenset(),
        "development", "invalid_ip", "fr-CA", "hard_negative",
    ),
    Case(
        "dev-013", "Contact: service@example.org", frozenset({"EMAIL"}),
        "development", "label_contact_email", "en-CA", "canonical",
    ),
    Case(
        "dev-014", "Carte de crédit fictive: 4111 1111 1111 1111",
        frozenset({"CREDIT_CARD"}), "development", "label_card", "fr-CA", "canonical",
    ),
    Case(
        "dev-015", "Passport: AB1234567", frozenset({"PASSPORT"}),
        "development", "label_passport", "en-CA", "canonical",
    ),
    Case(
        "test-001", "Pour toute question, écrire à contact+demo@example.org.",
        frozenset({"EMAIL"}), "held_out", "prose_contact_email", "fr-CA", "format_variant",
    ),
    Case(
        "test-002", "Coordonnées téléphoniques — 1 (438) 555-0134",
        frozenset({"PHONE"}), "held_out", "prose_phone", "fr-CA", "format_variant",
    ),
    Case(
        "test-003", "Identifiant NAS attribué au profil fictif : 234 567 890",
        frozenset({"SOCIAL_INSURANCE_NUMBER"}), "held_out", "prose_nas", "fr-CA", "contextual",
    ),
    Case(
        "test-004", "Dossier médical — diagnostic : exemple non réel",
        frozenset({"HEALTH_INFORMATION"}), "held_out", "dash_health", "fr-CA", "format_variant",
    ),
    Case(
        "test-005", "Le formulaire indique comme nom complet - Camille Dubois",
        frozenset({"PERSON"}), "held_out", "prose_person", "fr-CA", "contextual",
    ),
    Case(
        "test-006", "Livraison prévue au 456 avenue Fictive, Québec",
        frozenset({"ADDRESS"}), "held_out", "prose_address", "fr-CA", "contextual",
    ),
    Case(
        "test-007", "Build reference: 4111-1111-1111-1112 (not a payment card)",
        frozenset(), "held_out", "card_like_invalid", "en-CA", "hard_negative",
    ),
    Case(
        "test-008", "Le ticket #2026-10-08 concerne 514 employés et 12 équipes.",
        frozenset(), "held_out", "ordinary_numbers", "fr-CA", "hard_negative",
    ),
    Case(
        "test-009", "Le rendez-vous fictif est prévu le 2026-13-45.",
        frozenset(), "held_out", "invalid_date", "fr-CA", "hard_negative",
    ),
    Case(
        "test-010", "Le service est situé à Montréal; aucun nom ni identifiant n'est fourni.",
        frozenset(), "held_out", "location_only", "fr-CA", "hard_negative",
    ),
)


def _predicted_labels(text: str, detector: RegexPIIDetector) -> frozenset[str]:
    return frozenset(detection.pii_type.value for detection in detector.detect(text))


def _score(
    cases: tuple[Case, ...], labels: list[str], detector: RegexPIIDetector
) -> dict[str, object]:
    counts: dict[str, dict[str, int]] = {
        label: {"tp": 0, "fp": 0, "fn": 0} for label in labels
    }
    micro = {"tp": 0, "fp": 0, "fn": 0}
    for case in cases:
        expected = set(case.expected)
        predicted = set(_predicted_labels(case.text, detector))
        for label in labels:
            tp = int(label in expected and label in predicted)
            fp = int(label not in expected and label in predicted)
            fn = int(label in expected and label not in predicted)
            counts[label]["tp"] += tp
            counts[label]["fp"] += fp
            counts[label]["fn"] += fn
            micro["tp"] += tp
            micro["fp"] += fp
            micro["fn"] += fn

    per_class: dict[str, dict[str, float | int | None]] = {}
    for label, values in counts.items():
        tp, fp, fn = values["tp"], values["fp"], values["fn"]
        precision = tp / (tp + fp) if tp + fp else None
        recall = tp / (tp + fn) if tp + fn else None
        f1 = (
            2 * precision * recall / (precision + recall)
            if precision is not None and recall is not None and precision + recall
            else (0.0 if precision == 0 or recall == 0 else None)
        )
        per_class[label] = {**values, "precision": precision, "recall": recall, "f1": f1}

    tp, fp, fn = micro["tp"], micro["fp"], micro["fn"]
    micro_precision = tp / (tp + fp) if tp + fp else None
    micro_recall = tp / (tp + fn) if tp + fn else None
    micro_f1 = (
        2 * micro_precision * micro_recall / (micro_precision + micro_recall)
        if (
            micro_precision is not None
            and micro_recall is not None
            and micro_precision + micro_recall
        )
        else (0.0 if micro_precision == 0 or micro_recall == 0 else None)
    )
    defined_f1 = [float(item["f1"]) for item in per_class.values() if item["f1"] is not None]
    return {
        "cases": len(cases),
        "unit": "document_label_presence",
        "micro": {
            **micro,
            "precision": micro_precision,
            "recall": micro_recall,
            "f1": micro_f1,
        },
        "macro_f1": sum(defined_f1) / len(defined_f1) if defined_f1 else None,
        "per_class": per_class,
    }


def evaluate(cases: Iterable[Case] = CASES) -> dict[str, object]:
    """Evaluate document-level label presence; this is not span-level scoring."""
    selected = tuple(cases)
    detector = RegexPIIDetector()
    labels = sorted(
        {label for case in selected for label in case.expected}
        | {label for case in selected for label in _predicted_labels(case.text, detector)}
    )
    overall = _score(selected, labels, detector)
    split_names = sorted({case.split for case in selected})
    splits = {
        split: _score(tuple(case for case in selected if case.split == split), labels, detector)
        for split in split_names
    }
    return {
        **overall,
        "synthetic_only": True,
        "split_counts": {
            split: sum(case.split == split for case in selected) for split in split_names
        },
        "splits": splits,
        "coverage": {
            "languages": sorted({case.language for case in selected}),
            "difficulty": sorted({case.difficulty for case in selected}),
            "template_groups": len({case.template_group for case in selected}),
        },
        "limitations": [
            "Synthetic, hand-authored cases; not representative deployment data.",
            "Document-label presence scoring; entity spans, overlaps, and normalization are not evaluated.",
            "Held-out template groups are separated by declared metadata, not independently audited.",
            "Precision depends on real-world PII prevalence and may differ in production.",
        ],
    }


if __name__ == "__main__":
    import json

    print(json.dumps(evaluate(), indent=2, sort_keys=True))
