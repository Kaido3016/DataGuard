import { useId, useState } from 'react';
import { createPia } from '../../api/pia';
import { ROUTES } from '../../constants/routes';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { hrefFor } from '../../hooks/useRoute';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n';
import { useWorkspace } from '../../state/workspace';
import { PIA_LIMITS } from '../../types/pia';
import type { PiaDraft, PiaRecord, PiaRisk } from '../../types/pia';
import { RISK_LEVELS } from '../../types/risk';
import type { RiskLevel } from '../../types/risk';
import { shortId, splitLines } from '../../utils/format';
import { Button, ButtonLink } from '../common/Button';
import { SeverityBadge } from '../common/Badges';
import { SelectField, TextAreaField, TextField } from '../common/Fields';
import { ErrorState, Notice } from '../common/States';
import { Stepper } from '../common/Stepper';
import { useSourceLabel } from '../pii/sourceLabel';

const STEPS = ['scope', 'data', 'purpose', 'risk', 'controls', 'review', 'evidence'] as const;
type StepId = (typeof STEPS)[number];

interface RiskRow {
  readonly key: number;
  readonly title: string;
  readonly level: RiskLevel;
  readonly description: string;
  readonly mitigation: string;
}

interface Form {
  projectName: string;
  systemDescription: string;
  personalInformation: string;
  dataSources: string;
  storageLocations: string;
  purposes: string;
  recipients: string;
  retention: string;
  safeguards: string;
}

const EMPTY_FORM: Form = {
  projectName: '', systemDescription: '', personalInformation: '', dataSources: '',
  storageLocations: '', purposes: '', recipients: '', retention: '', safeguards: '',
};

function toDraft(form: Form, risks: readonly RiskRow[]): PiaDraft {
  const cleaned: PiaRisk[] = risks
    .filter((row) => row.title.trim() !== '')
    .map((row) => ({ title: row.title.trim(), level: row.level, description: row.description.trim(), mitigation: row.mitigation.trim() }));
  return {
    projectName: form.projectName.trim(),
    systemDescription: form.systemDescription.trim(),
    personalInformation: splitLines(form.personalInformation),
    purposes: splitLines(form.purposes),
    dataSources: splitLines(form.dataSources),
    recipients: splitLines(form.recipients),
    storageLocations: splitLines(form.storageLocations),
    retention: form.retention.trim(),
    risks: cleaned,
    safeguards: splitLines(form.safeguards),
  };
}

export function PiaWizard({ onCancel, onOpen }: { onCancel: () => void; onOpen: (record: PiaRecord) => void }) {
  const { t, td } = useI18n();
  const uid = useId();
  const { analyses, addPia } = useWorkspace();
  const sourceLabel = useSourceLabel();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [risks, setRisks] = useState<readonly RiskRow[]>([{ key: 1, title: '', level: 'MEDIUM', description: '', mitigation: '' }]);
  const [nextKey, setNextKey] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<PiaRecord | null>(null);
  const [fromAnalysis, setFromAnalysis] = useState('');

  const create = useAsyncAction(async (signal, draft: PiaDraft) => {
    const summary = await createPia(draft, { signal });
    return addPia(summary, draft);
  });

  const set = (name: keyof Form) => (value: string): void => setForm((previous) => ({ ...previous, [name]: value }));
  const id = (name: string): string => `${uid}-${name}`;
  const draft = toDraft(form, risks);
  const current: StepId = STEPS[step] ?? 'scope';

  const validate = (): string | null => {
    if (current === 'scope' && !form.projectName.trim()) return t('pia.err.name');
    const overLimit = [draft.personalInformation, draft.purposes, draft.dataSources, draft.recipients, draft.storageLocations, draft.safeguards]
      .some((list) => list.length > PIA_LIMITS.listItems);
    if (overLimit) return t('pia.err.items', { max: PIA_LIMITS.listItems });
    if (current === 'risk' && risks.some((row) => row.title.trim() === '' && (row.description.trim() !== '' || row.mitigation.trim() !== ''))) return t('pia.err.riskTitle');
    return null;
  };

  const next = (): void => {
    const problem = validate();
    setError(problem);
    if (!problem) setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const submit = async (): Promise<void> => {
    if (!draft.projectName) {
      setError(t('pia.err.name'));
      setStep(0);
      return;
    }
    const record = await create.run(draft);
    if (record) {
      setCreated(record);
      setStep(STEPS.indexOf('evidence'));
    }
  };

  const updateRisk = (key: number, patch: Partial<RiskRow>): void =>
    setRisks((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const addFromAnalysis = (): void => {
    const record = analyses.find((item) => item.key === fromAnalysis);
    if (!record) return;
    setRisks((rows) => [...rows.filter((row) => row.title.trim() !== ''), {
      key: nextKey, title: t('pia.risk.fromAnalysisTitle', { source: sourceLabel(record.source) }), level: record.risk.level,
      description: record.risk.explanation, mitigation: '',
    }]);
    setNextKey((value) => value + 1);
  };

  const stepLabel = (item: StepId): string => t(`pia.step.${item}` as MessageKey);
  const list = (items: readonly string[]) => (items.length ? <ul className="bullets small">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted small">{t('pia.review.none')}</p>);

  return (
    <div className="wizard">
      <Stepper steps={STEPS.map((item) => ({ id: item, label: stepLabel(item) }))} current={step} label={t('pia.wizard.label')} onSelect={created ? undefined : setStep} />
      <div className="wizard-body">
        <h3 className="wizard-title">{stepLabel(current)}</h3>
        <p className="muted">{t(`pia.help.${current}` as MessageKey)}</p>

        {current === 'scope' ? (
          <div className="form-stack">
            <TextField id={id('name')} label={t('pia.f.name')} value={form.projectName} onChange={set('projectName')} maxLength={PIA_LIMITS.projectName} required error={error && !form.projectName.trim() ? error : null} />
            <TextAreaField id={id('desc')} label={t('pia.f.description')} value={form.systemDescription} onChange={set('systemDescription')} maxLength={PIA_LIMITS.systemDescription} rows={5} />
          </div>
        ) : null}
        {current === 'data' ? (
          <div className="form-stack">
            <TextAreaField id={id('pi')} label={t('pia.f.personalInformation')} hint={t('pia.f.linesHint')} value={form.personalInformation} onChange={set('personalInformation')} rows={4} />
            <TextAreaField id={id('src')} label={t('pia.f.dataSources')} hint={t('pia.f.linesHint')} value={form.dataSources} onChange={set('dataSources')} rows={3} />
            <TextAreaField id={id('loc')} label={t('pia.f.storageLocations')} hint={t('pia.f.linesHint')} value={form.storageLocations} onChange={set('storageLocations')} rows={3} />
          </div>
        ) : null}
        {current === 'purpose' ? (
          <div className="form-stack">
            <TextAreaField id={id('pur')} label={t('pia.f.purposes')} hint={t('pia.f.linesHint')} value={form.purposes} onChange={set('purposes')} rows={4} />
            <TextAreaField id={id('rec')} label={t('pia.f.recipients')} hint={t('pia.f.linesHint')} value={form.recipients} onChange={set('recipients')} rows={3} />
          </div>
        ) : null}
        {current === 'risk' ? (
          <div className="form-stack">
            {analyses.length > 0 ? (
              <div className="inline-form">
                <SelectField id={id('from')} label={t('pia.risk.fromAnalysis')} value={fromAnalysis} onChange={setFromAnalysis}
                  options={[{ value: '', label: t('pia.risk.pick') }, ...analyses.map((record) => ({ value: record.key, label: `${sourceLabel(record.source)} · ${td('risk.level', record.risk.level)} ${record.risk.score.toFixed(0)}` }))]} />
                <Button icon="plus" onClick={addFromAnalysis} disabled={!fromAnalysis}>{t('pia.risk.add')}</Button>
              </div>
            ) : null}
            {risks.map((row, index) => (
              <fieldset key={row.key} className="risk-row">
                <legend>{t('pia.risk.n', { n: index + 1 })}</legend>
                <TextField id={id(`rt-${row.key}`)} label={t('pia.risk.title')} value={row.title} onChange={(value) => updateRisk(row.key, { title: value })} maxLength={200} />
                <SelectField id={id(`rl-${row.key}`)} label={t('pia.risk.level')} value={row.level} onChange={(value) => updateRisk(row.key, { level: value as RiskLevel })}
                  options={RISK_LEVELS.map((level) => ({ value: level, label: td('risk.level', level) }))} />
                <TextAreaField id={id(`rd-${row.key}`)} label={t('pia.risk.description')} value={row.description} onChange={(value) => updateRisk(row.key, { description: value })} rows={2} maxLength={1000} />
                <TextAreaField id={id(`rm-${row.key}`)} label={t('pia.risk.mitigation')} value={row.mitigation} onChange={(value) => updateRisk(row.key, { mitigation: value })} rows={2} maxLength={1000} />
                {risks.length > 1 ? <Button small variant="ghost" onClick={() => setRisks((rows) => rows.filter((item) => item.key !== row.key))}>{t('pia.risk.remove')}</Button> : null}
              </fieldset>
            ))}
            <div className="inline-actions">
              <Button icon="plus" onClick={() => { setRisks((rows) => [...rows, { key: nextKey, title: '', level: 'MEDIUM', description: '', mitigation: '' }]); setNextKey((value) => value + 1); }}>{t('pia.risk.addBlank')}</Button>
            </div>
          </div>
        ) : null}
        {current === 'controls' ? (
          <div className="form-stack">
            <TextAreaField id={id('saf')} label={t('pia.f.safeguards')} hint={t('pia.f.linesHint')} value={form.safeguards} onChange={set('safeguards')} rows={5} />
            <TextAreaField id={id('ret')} label={t('pia.f.retention')} value={form.retention} onChange={set('retention')} maxLength={PIA_LIMITS.retention} rows={2} />
          </div>
        ) : null}
        {current === 'review' ? (
          <div className="form-stack">
            <dl className="kv kv-wide">
              <dt>{t('pia.f.name')}</dt><dd>{draft.projectName || <span className="muted">{t('pia.review.none')}</span>}</dd>
              <dt>{t('pia.f.description')}</dt><dd>{draft.systemDescription || <span className="muted">{t('pia.review.none')}</span>}</dd>
              <dt>{t('pia.f.personalInformation')}</dt><dd>{list(draft.personalInformation)}</dd>
              <dt>{t('pia.f.dataSources')}</dt><dd>{list(draft.dataSources)}</dd>
              <dt>{t('pia.f.storageLocations')}</dt><dd>{list(draft.storageLocations)}</dd>
              <dt>{t('pia.f.purposes')}</dt><dd>{list(draft.purposes)}</dd>
              <dt>{t('pia.f.recipients')}</dt><dd>{list(draft.recipients)}</dd>
              <dt>{t('pia.step.risk')}</dt>
              <dd>{draft.risks.length ? <ul className="bullets small">{draft.risks.map((risk) => <li key={risk.title}><SeverityBadge level={risk.level} /> {risk.title}{risk.mitigation ? '' : ` — ${t('pia.risk.noMitigation')}`}</li>)}</ul> : <p className="muted small">{t('pia.review.none')}</p>}</dd>
              <dt>{t('pia.f.safeguards')}</dt><dd>{list(draft.safeguards)}</dd>
              <dt>{t('pia.f.retention')}</dt><dd>{draft.retention || <span className="muted">{t('pia.review.none')}</span>}</dd>
            </dl>
            <Notice tone="info">{t('pia.review.note')}</Notice>
            {create.state.status === 'error' ? <ErrorState error={create.state.error} /> : null}
          </div>
        ) : null}
        {current === 'evidence' ? (
          <div className="form-stack">
            {created ? (
              <Notice tone="success" live title={t('pia.created.title')}>{t('pia.created.body', { id: shortId(created.id) })}</Notice>
            ) : null}
            <p>{t('pia.evidence.body')}</p>
            <ul className="bullets">
              <li>{t('pia.evidence.analyses', { n: analyses.filter((record) => record.analysisId).length })}</li>
              <li>{t('pia.evidence.audit')}</li>
              <li>{t('pia.evidence.gap')}</li>
            </ul>
            <div className="inline-actions">
              {created ? <Button variant="primary" icon="pia" onClick={() => onOpen(created)}>{t('pia.open')}</Button> : null}
              <ButtonLink href={hrefFor(ROUTES.audit)} icon="audit">{t('pia.evidence.openAudit')}</ButtonLink>
            </div>
          </div>
        ) : null}

        {error && current !== 'scope' ? <p className="field-error" role="alert">{error}</p> : null}

        <div className="wizard-nav">
          {current === 'evidence' ? null : (
            <>
              <Button onClick={step === 0 ? onCancel : () => { setError(null); setStep(step - 1); }}>{step === 0 ? t('action.cancel') : t('action.back')}</Button>
              {current === 'review' ? (
                <Button variant="primary" icon="check" busy={create.state.status === 'loading'} onClick={() => void submit()}>{t('pia.create')}</Button>
              ) : (
                <Button variant="primary" icon="chevronRight" onClick={next}>{t('action.next')}</Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
