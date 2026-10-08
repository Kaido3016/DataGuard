import { useI18n } from '../../i18n';
import type { PreviewSegment, RedactedPreview } from '../../types/pii';

export function PreviewSegments({ segments }: { segments: readonly PreviewSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === 'tag' ? (
          <mark key={index} className="preview-tag">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

/** What was submitted, with every detected value replaced by its type tag. */
export function RedactedPreviewView({ preview }: { preview: RedactedPreview }) {
  const { t } = useI18n();
  return (
    <div>
      <pre className="preview" role="region" tabIndex={0} aria-label={t('preview.label')}>
        <PreviewSegments segments={preview.segments} />
      </pre>
      <p className="muted small">{preview.truncated ? t('preview.truncated') : t('preview.note')}</p>
    </div>
  );
}
