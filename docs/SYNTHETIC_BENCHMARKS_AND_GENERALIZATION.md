# Synthetic PII benchmarks: design, reporting, and limits of generalization

## Purpose and evidence boundary

This document defines how DataGuard's synthetic PII benchmark should be constructed and interpreted. Synthetic data is useful for repeatable regression tests, edge-case coverage, and testing known expected outputs without exposing real personal information. It is **not, by itself, evidence of real-world detection accuracy**.

Do not report benchmark scores as production precision, recall, F1, legal compliance, or suitability for government use. Results must identify the dataset version, detector/model version, configuration, scoring rules, and run date. If those artifacts are unavailable, report the result as unverified rather than reconstructing it from memory.\n\nThe current executable `dataguard.evaluation.pii_benchmark` is intentionally narrower than the full protocol below: it scores **document-level label presence**, not entity spans. Run it with `python -m dataguard.evaluation.pii_benchmark`. Its held-out cases are hand-authored and separated by declared template-group metadata; this is a useful regression split, not an independently validated generalization test. The report includes per-class and micro metrics, split counts, and explicit limitations.

## 1. Improve the synthetic benchmark

### Use explicit, stratified test cases

Keep each example independent and assign stable IDs. Cover at least these strata:

- **Entity type:** PERSON, EMAIL, PHONE, ADDRESS/LOCATION, ORGANIZATION, government/financial identifiers where appropriate to the detector's declared scope.
- **Language and locale:** French (including Québec names and address/phone conventions), English, and any other language explicitly supported by the product. Do not imply multilingual coverage merely because a multilingual model is configured.
- **Context:** structured fields, prose, tables, OCR-like text, mixed text, and text with punctuation or line breaks.
- **Difficulty:** canonical examples, formatting variants, partial/malformed values, ambiguous contexts, overlapping entities, and near-miss negatives.
- **Decision class:** true positive, false-positive challenge, false-negative challenge, and genuinely ambiguous case requiring human review.
- **Privacy-risk scenario:** direct identifier, quasi-identifier/contextual disclosure, repeated entity, and multiple entities in one document.

The benchmark should record which dimensions each case exercises. Avoid treating hundreds of near-identical templates as hundreds of independent examples.

### Add hard negatives and realistic variation

Include non-sensitive strings that resemble identifiers, such as order/reference numbers, ordinary numeric sequences, fictional company names, generic role labels, and phone-like strings that do not meet the detector's rules. These cases help measure over-detection as well as missed PII.

Vary names, accents, capitalization, spacing, separators, country/area codes, surrounding words, entity order, and document length. Use seeded generation so the same dataset version can be reproduced. Ensure generated values are fictional and do not intentionally reproduce real people's identifiers.

### Separate data by purpose

Maintain separate, versioned sets for:

1. **Unit/regression fixtures** — small, deterministic examples for each rule and known bug.
2. **Development/tuning set** — used to change rules, thresholds, prompts, or model settings.
3. **Held-out synthetic test set** — generated with different seeds/templates and not used for tuning.
4. **External/representative validation set** — only if lawfully obtained, privacy-reviewed, annotated, and representative of the intended deployment.

Never describe the held-out synthetic set as an external validation set. If the same templates or generation rules appear in both tuning and test sets, disclose that dependency; a random row-level split is not sufficient to prevent template leakage.

## 2. Ground truth and scoring

Every scored example should have a versioned annotation with:

- stable case ID and dataset version;
- expected entity spans, labels, and normalization rules;
- language/locale and scenario tags;
- expected behavior for ambiguous cases (detect, abstain, or human review);
- generator/template version and random seed where applicable;
- annotation provenance and review status.

Define span matching before evaluation. Prefer exact span + label matching as the strict score; optionally report a separately labelled relaxed overlap score. Do not silently count partial overlaps as exact matches.

Report micro-averaged precision, recall, and F1, plus per-entity and per-language results. Include support (number of gold entities and negative opportunities) for every reported slice. Also report false positives per document or per 1,000 tokens, missed entities, and ambiguous/review-required cases. An overall F1 can hide severe failures for rare or high-consequence entity types.

For a detection task:

- Precision = TP / (TP + FP)
- Recall = TP / (TP + FN)
- F1 = 2 × precision × recall / (precision + recall)

State how true negatives, empty predictions, duplicate predictions, overlapping spans, and documents with no PII are handled. If a denominator is zero, report the metric as undefined/not applicable rather than silently converting it to 0 or 100%.

## 3. Uncertainty and comparisons

Report the number of documents, tokens, and gold entities, not just the number of generated rows. For headline metrics, include confidence intervals where appropriate. Because entities within one document are correlated, use document-level bootstrap resampling rather than treating every entity as independent. Keep a fixed seed and number of resamples.

For comparisons between detector versions, score both versions on the same frozen cases. Show paired per-case changes and error categories, not just the difference between two aggregate scores. Preserve all failures and record software/model versions, configuration, dataset hash, and run timestamp.

Synthetic confidence intervals quantify uncertainty under the chosen synthetic sampling process; they do **not** quantify the gap between synthetic and real deployment data.

## 4. Limits of generalization

Synthetic results may not generalize because:

- **Generator bias:** templates reflect the assumptions and patterns encoded by their author, and can omit real-world variation.
- **Distribution shift:** actual documents differ in language mix, spelling, OCR quality, formatting, domain vocabulary, document length, and prevalence of PII.
- **Template leakage:** a detector can perform well by learning or matching generator patterns rather than robustly identifying PII.
- **Artificial class balance:** synthetic sets often contain more PII or more balanced entity classes than real workloads, distorting precision and operational alert volume.
- **Incomplete negative space:** hard negatives in a synthetic set cannot cover all legitimate numbers, names, identifiers, and domain-specific terms.
- **Annotation/generator coupling:** labels created by the same code that generated examples may share its mistakes, producing artificially optimistic scores.
- **Model familiarity:** common synthetic patterns may resemble examples seen during model training or tuning.
- **Pipeline effects:** synthetic plain text does not test extraction failures, OCR corruption, document parsing, access controls, tenant isolation, or production latency unless those are explicitly exercised.
- **Locale and domain gaps:** a result on French/English examples or one industry does not establish performance for other languages, jurisdictions, or sectors.
- **Prevalence dependence:** precision and review workload change when real-world PII prevalence differs from the benchmark.

Therefore, phrase conclusions narrowly: for example, “Detector version X achieved Y on synthetic dataset version Z under the documented scoring rules.” Do not phrase them as “DataGuard detects Y% of real PII” unless a suitable, independently reviewed representative evaluation supports that claim.

## 5. Recommended validation ladder

1. **Deterministic unit tests:** verify expected behavior for individual patterns and edge cases.
2. **Synthetic stratified regression:** catch known regressions across entity, language, context, and difficulty slices.
3. **Held-out synthetic challenge set:** use new templates/seeds and hard negatives; keep it separate from tuning.
4. **Privacy-reviewed representative evaluation:** if permitted, use appropriately governed data with qualified human annotations and documented sampling.
5. **Shadow/pilot evaluation:** measure false positives, missed detections, review burden, and drift under approved safeguards before relying on outputs operationally.
6. **Ongoing monitoring:** version datasets and detector configurations; sample for human review; define thresholds and rollback criteria before rollout.

Synthetic-only performance supports engineering regression confidence, not production deployment approval. A representative evaluation must document sampling frame, inclusion/exclusion criteria, annotation instructions, inter-annotator agreement or adjudication, privacy/legal approval, and known coverage gaps.

## 6. Minimal result-reporting template

Record the following for every benchmark run:

| Field | Required content |
|---|---|
| Run identity | Run ID, date, commit, detector/model version |
| Dataset | Version, hash, generator version, seed, strata |
| Size | Documents, tokens, gold entities, negative examples |
| Scope | Supported entity types, languages, formats, exclusions |
| Scoring | Exact/overlap match policy, normalization, empty-case policy |
| Metrics | Micro and per-slice precision/recall/F1, support, false positives/document |
| Uncertainty | Interval method, resampling unit, seed, replicates |
| Errors | False-positive and false-negative examples by category, with synthetic data only |
| Limitations | Template overlap, untested domains/locales, known distribution gaps |
| Decision | Regression accepted/rejected and reason; no unsupported production claim |

## Release checklist

- [ ] Synthetic examples are fictional and contain no real personal data.
- [ ] Dataset and generator are versioned; generation is reproducible.
- [ ] Tuning and held-out cases are separated by template/source, not only by random row.
- [ ] Entity types, languages, difficulty strata, and hard negatives are represented.
- [ ] Annotation and span-matching rules are explicit.
- [ ] Aggregate and per-slice metrics include support counts.
- [ ] Uncertainty resamples documents rather than correlated entity spans.
- [ ] Detector versions are compared on the same frozen cases.
- [ ] README and reports state that synthetic performance is not real-world accuracy.
- [ ] No certification, compliance, or production-accuracy claim is inferred from this benchmark.
