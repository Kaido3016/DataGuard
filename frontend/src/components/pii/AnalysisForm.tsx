import { useId, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react';
import { config, UPLOAD_ACCEPT } from '../../constants/config';
import { useI18n } from '../../i18n';
import { FRAMEWORK_IDS } from '../../types/analysis';
import type { AnalysisContext } from '../../types/analysis';
import { formatBytes } from '../../utils/format';
import { Button } from '../common/Button';
import { CheckboxField, SelectField, TextAreaField, TextField } from '../common/Fields';
import { Icon } from '../common/Icon';
import { Notice } from '../common/States';

const SAMPLE_TEXT = [
  'Dossier client — SYNTHETIC DEMONSTRATION DATA / DONNÉES SYNTHÉTIQUES',
  'Nom : Jeanne Tremblay',
  'Courriel : jeanne.tremblay@example.invalid',
  'Téléphone : 514-555-0142',
  'Adresse : 123 rue Exemple, Montréal, QC H2X 1Y4',
  'NAS : 046 454 286',
].join('\n');

const ALLOWED_EXTENSIONS = UPLOAD_ACCEPT.split(',').map((item) => item.trim().toLowerCase());

function hasAllowedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

interface Props {
  readonly variant: 'compact' | 'full';
  readonly busy: boolean;
  readonly disabled: boolean;
  readonly disabledReason?: string;
  readonly onAnalyzeText: (text: string, context: AnalysisContext) => void;
  readonly onAnalyzeDocument: (file: File) => void;
  readonly onCancel: () => void;
}

export function AnalysisForm({ variant, busy, disabled, disabledReason, onAnalyzeText, onAnalyzeDocument, onCancel }: Props) {
  const { t, td } = useI18n();
  const uid = useId();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<'text' | 'document'>('text');
  const [text, setText] = useState('');
  const [textError, setTextError] = useState<string | null>(null);
  const [accessScope, setAccessScope] = useState('internal');
  const [exposure, setExposure] = useState('internal');
  const [dataLocation, setDataLocation] = useState('unknown');
  const [retention, setRetention] = useState('');
  const [encrypted, setEncrypted] = useState(false);
  const [purpose, setPurpose] = useState(false);
  const [framework, setFramework] = useState<string>('quebec_privacy');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [retentionError, setRetentionError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const full = variant === 'full';
  const id = (name: string): string => `${uid}-${name}`;

  const submitText = (): void => {
    const trimmed = text.trim();
    let retentionDays: number | null = null;
    let valid = true;
    if (!trimmed) {
      setTextError(t('form.text.required'));
      valid = false;
    } else if (text.length > config.maxTextChars) {
      setTextError(t('form.text.tooLong', { max: config.maxTextChars.toLocaleString() }));
      valid = false;
    } else {
      setTextError(null);
    }
    if (full && retention.trim() !== '') {
      const parsed = Number(retention);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 36500) {
        setRetentionError(t('form.retention.invalid'));
        valid = false;
      } else {
        retentionDays = parsed;
        setRetentionError(null);
      }
    } else {
      setRetentionError(null);
    }
    if (!valid || disabled || busy) return;
    onAnalyzeText(text, {
      dataLocation: full ? dataLocation : 'unknown',
      accessScope,
      exposure,
      retentionDays,
      encryptedAtRest: encrypted,
      purposeDefined: full ? purpose : false,
      framework: full ? framework : 'quebec_privacy',
    });
  };

  const chooseFile = (candidate: File | null): void => {
    setFile(null);
    if (!candidate) {
      setFileError(null);
      return;
    }
    if (!hasAllowedExtension(candidate.name)) {
      setFileError(t('form.file.type'));
      return;
    }
    if (candidate.size > config.maxUploadBytes) {
      setFileError(t('form.file.size', { max: formatBytes(config.maxUploadBytes) }));
      return;
    }
    if (candidate.size === 0) {
      setFileError(t('form.file.empty'));
      return;
    }
    setFileError(null);
    setFile(candidate);
  };

  const submitDocument = (): void => {
    if (!file) {
      setFileError(t('form.file.required'));
      return;
    }
    if (!disabled && !busy) onAnalyzeDocument(file);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      submitText();
    }
  };
  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0] ?? null);
  };

  const options = (prefix: string, values: readonly string[]) =>
    values.map((value) => ({ value, label: td(prefix, value) }));

  return (
    <div className="analysis-form">
      {full ? (
        <div className="tabs" role="tablist" aria-label={t('form.mode')}>
          {(['text', 'document'] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              id={id(`tab-${item}`)}
              aria-selected={mode === item}
              aria-controls={id(`panel-${item}`)}
              tabIndex={mode === item ? 0 : -1}
              className={`tab${mode === item ? ' is-active' : ''}`}
              onClick={() => setMode(item)}
            >
              <Icon name={item === 'text' ? 'findings' : 'upload'} size={16} />
              {t(item === 'text' ? 'form.mode.text' : 'form.mode.document')}
            </button>
          ))}
        </div>
      ) : null}

      {disabled && disabledReason ? <Notice tone="warning">{disabledReason}</Notice> : null}

      {mode === 'text' ? (
        <div role={full ? 'tabpanel' : undefined} id={id('panel-text')} aria-labelledby={full ? id('tab-text') : undefined} className="form-stack">
          <TextAreaField
            id={id('text')}
            label={t('form.text.label')}
            value={text}
            onChange={(value) => {
              setText(value);
              if (textError) setTextError(null);
            }}
            rows={full ? 9 : 6}
            maxLength={config.maxTextChars}
            placeholder={t('form.text.placeholder')}
            hint={t('form.text.hint')}
            error={textError}
            disabled={disabled}
            monospace
            onKeyDown={onKeyDown}
          />
          <div className="inline-actions">
            <Button small variant="ghost" onClick={() => setText(SAMPLE_TEXT)} disabled={disabled || busy}>
              {t('form.sample')}
            </Button>
            <Button small variant="ghost" onClick={() => setText('')} disabled={text === '' || busy}>
              {t('form.clear')}
            </Button>
          </div>

          <div className={full ? 'form-grid' : 'form-grid form-grid-compact'}>
            <SelectField id={id('access')} label={t('form.access')} value={accessScope} onChange={setAccessScope} disabled={disabled}
              options={options('opt.access', ['internal', 'restricted', 'external', 'public'])} />
            <SelectField id={id('exposure')} label={t('form.exposure')} value={exposure} onChange={setExposure} disabled={disabled}
              options={options('opt.exposure', ['internal', 'external', 'internet', 'unknown'])} />
            {full ? (
              <SelectField id={id('location')} label={t('form.location')} value={dataLocation} onChange={setDataLocation} disabled={disabled}
                options={options('opt.location', ['quebec', 'canada', 'international', 'unknown', 'public'])} />
            ) : null}
            {full ? (
              <TextField id={id('retention')} label={t('form.retention')} type="number" value={retention} onChange={setRetention}
                hint={t('form.retention.hint')} error={retentionError} disabled={disabled} />
            ) : null}
            {full ? (
              <SelectField id={id('framework')} label={t('form.framework')} value={framework} onChange={setFramework} disabled={disabled}
                options={FRAMEWORK_IDS.map((value) => ({ value, label: td('framework.name', value) }))} />
            ) : null}
          </div>
          <div className="check-row">
            <CheckboxField id={id('encrypted')} label={t('form.encrypted')} checked={encrypted} onChange={setEncrypted} disabled={disabled} />
            {full ? <CheckboxField id={id('purpose')} label={t('form.purpose')} checked={purpose} onChange={setPurpose} disabled={disabled} /> : null}
          </div>
          <p className="muted small">{t('form.context.note')}</p>
          <div className="inline-actions">
            <Button variant="primary" icon="discovery" onClick={submitText} busy={busy} disabled={disabled}>
              {busy ? t('form.analyzing') : t('form.analyze')}
            </Button>
            {busy ? <Button onClick={onCancel}>{t('action.cancel')}</Button> : null}
            <span className="muted small">{t('form.shortcut')}</span>
          </div>
        </div>
      ) : (
        <div role="tabpanel" id={id('panel-document')} aria-labelledby={id('tab-document')} className="form-stack">
          <div
            role="presentation"
            className={`dropzone${dragging ? ' is-dragging' : ''}`}
            onDragOver={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <Icon name="upload" size={22} />
            <p>{file ? t('form.file.selected', { name: file.name, size: formatBytes(file.size) }) : t('form.file.drop')}</p>
            <input
              ref={fileInput}
              id={id('file')}
              className="sr-only"
              type="file"
              accept={UPLOAD_ACCEPT}
              disabled={disabled}
              onChange={(event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0] ?? null)}
              aria-describedby={id('file-hint')}
            />
            <label htmlFor={id('file')} className="btn btn-secondary btn-small">
              {t('form.file.choose')}
            </label>
          </div>
          <p className="field-hint" id={id('file-hint')}>
            {t('form.file.hint', { max: formatBytes(config.maxUploadBytes) })}
          </p>
          {fileError ? <p className="field-error" role="alert">{fileError}</p> : null}
          <div className="inline-actions">
            <Button variant="primary" icon="upload" onClick={submitDocument} busy={busy} disabled={disabled}>
              {busy ? t('form.analyzing') : t('form.analyzeDocument')}
            </Button>
            {busy ? <Button onClick={onCancel}>{t('action.cancel')}</Button> : null}
          </div>
        </div>
      )}
    </div>
  );
}
