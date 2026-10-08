import { useI18n } from '../../i18n';
import { Icon } from './Icon';

export interface StepItem {
  readonly id: string;
  readonly label: string;
}

/** Ordered workflow track. The numbering is meaningful: these steps are a real sequence. */
export function Stepper({
  steps,
  current,
  label,
  onSelect,
}: {
  steps: readonly StepItem[];
  current: number;
  label: string;
  /** When provided, completed steps become buttons that jump back. */
  onSelect?: (index: number) => void;
}) {
  const { t } = useI18n();
  return (
    <ol className="stepper" aria-label={label}>
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo';
        const marker = (
          <span className="step-marker" aria-hidden="true">
            {state === 'done' ? <Icon name="check" size={14} /> : index + 1}
          </span>
        );
        const status = state === 'done' ? t('stepper.done') : state === 'current' ? t('stepper.current') : t('stepper.todo');
        return (
          <li key={step.id} className={`step step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            {onSelect && state === 'done' ? (
              <button type="button" className="step-button" onClick={() => onSelect(index)}>
                {marker}
                <span className="step-label">{step.label}</span>
                <span className="sr-only">{status}</span>
              </button>
            ) : (
              <span className="step-inner">
                {marker}
                <span className="step-label">{step.label}</span>
                <span className="sr-only">{status}</span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
