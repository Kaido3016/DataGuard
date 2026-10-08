import { useId, useState } from 'react';
import { createRemediation } from '../../api/remediation';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { hrefFor } from '../../hooks/useRoute';
import { ROUTES } from '../../constants/routes';
import { useI18n } from '../../i18n';
import { useAuth } from '../../state/auth';
import { useWorkspace } from '../../state/workspace';
import { RISK_LEVELS } from '../../types/risk';
import type { RiskLevel } from '../../types/risk';
import { REMEDIATION_LIMITS } from '../../types/remediation';
import { shortId } from '../../utils/format';
import { Button, ButtonLink } from '../common/Button';
import { Dialog } from '../common/Dialog';
import { SelectField, TextAreaField, TextField } from '../common/Fields';
import { ErrorState, Notice } from '../common/States';
import { useSourceLabel } from '../pii/sourceLabel';

export interface RemediationDraft {
  readonly title: string;
  readonly description: string;
  readonly priority: RiskLevel;
  readonly analysisId: string | null;
  readonly findingId: string | null;
}

export const EMPTY_REMEDIATION: RemediationDraft = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  analysisId: null,
  findingId: null,
};

function RemediationForm({ initial, onClose }: { initial: RemediationDraft; onClose: () => void }) {
  const { t, td } = useI18n();
  const uid = useId();
  const { can } = useAuth();
  const { analyses, addRemediation, isDemo } = useWorkspace();
  const sourceLabel = useSourceLabel();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [priority, setPriority] = useState<string>(initial.priority);
  const [analysisId, setAnalysisId] = useState(initial.analysisId ?? '');
  const [owner, setOwner] = useState('');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  const action = useAsyncAction(async (signal, input: Parameters<typeof createRemediation>[0]) => {
    const summary = await createRemediation(input, { signal });
    return addRemediation(summary, input, initial.findingId);
  });

  const allowed = can('analysis:write') && !isDemo;
  const persisted = analyses.filter((record) => record.analysisId !== null);

  const submit = (): void => {
    const next: { title?: string; description?: string } = {};
    if (!title.trim()) next.title = t('rem.form.titleRequired');
    if (!description.trim()) next.description = t('rem.form.descriptionRequired');
    setErrors(next);
    if (next.title || next.description || !allowed) return;
    void action.run({
      title: title.trim(),
      description: description.trim(),
      analysisId: analysisId || null,
      priority: priority as RiskLevel,
      ownerId: owner.trim() || null,
    });
  };

  if (action.state.status === 'success') {
    return (
      <div className="form-stack">
        <Notice tone="success" live title={t('rem.form.created')}>
          {t('rem.form.createdBody', { id: shortId(action.state.data.id) })}
        </Notice>
        <div className="inline-actions">
          <ButtonLink href={hrefFor(ROUTES.remediation)} variant="primary" icon="remediation">
            {t('rem.form.open')}
          </ButtonLink>
          <Button onClick={onClose}>{t('action.close')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-stack">
      {!allowed ? <Notice tone="warning">{isDemo ? t('demo.readonly') : t('rem.form.forbidden')}</Notice> : null}
      <TextField id={`${uid}-title`} label={t('rem.form.title')} value={title} onChange={setTitle} maxLength={REMEDIATION_LIMITS.title} error={errors.title} required disabled={!allowed} />
      <TextAreaField id={`${uid}-desc`} label={t('rem.form.description')} value={description} onChange={setDescription} maxLength={REMEDIATION_LIMITS.description} rows={5} error={errors.description} required disabled={!allowed} />
      <div className="form-grid">
        <SelectField id={`${uid}-prio`} label={t('rem.form.priority')} value={priority} onChange={setPriority} disabled={!allowed}
          options={RISK_LEVELS.map((level) => ({ value: level, label: td('risk.level', level) }))} />
        <SelectField id={`${uid}-analysis`} label={t('rem.form.analysis')} value={analysisId} onChange={setAnalysisId} disabled={!allowed}
          hint={t('rem.form.analysisHint')}
          options={[{ value: '', label: t('rem.form.noAnalysis') }, ...persisted.map((record) => ({ value: record.analysisId ?? '', label: `${sourceLabel(record.source)} · ${shortId(record.analysisId ?? '')}` }))]} />
      </div>
      <TextField id={`${uid}-owner`} label={t('rem.form.owner')} value={owner} onChange={setOwner} maxLength={255} hint={t('rem.form.ownerHint')} disabled={!allowed} />
      {action.state.status === 'error' ? <ErrorState error={action.state.error} /> : null}
      <div className="inline-actions">
        <Button variant="primary" icon="plus" onClick={submit} busy={action.state.status === 'loading'} disabled={!allowed}>
          {t('rem.form.submit')}
        </Button>
        <Button onClick={onClose}>{t('action.cancel')}</Button>
      </div>
    </div>
  );
}

export function RemediationDialog({ open, initial, onClose }: { open: boolean; initial: RemediationDraft; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} title={t('rem.form.heading')} titleId="remediation-dialog-title" wide>
      <RemediationForm initial={initial} onClose={onClose} />
    </Dialog>
  );
}
