import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';

interface Shell {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly error?: string | null;
  readonly required?: boolean;
  readonly disabled?: boolean;
}

function describedBy(id: string, hint?: string, error?: string | null): string | undefined {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ');
  return ids || undefined;
}

function FieldFrame({ id, label, hint, error, required, children }: Shell & { children: ReactNode }) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label className="field-label" htmlFor={id}>
        {label}
        {required ? <span className="field-required" aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint ? (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField(
  props: Shell & {
    value: string;
    onChange: (value: string) => void;
    type?: 'text' | 'email' | 'password' | 'number';
    autoComplete?: string;
    maxLength?: number;
    placeholder?: string;
  },
) {
  const { id, value, onChange, type = 'text', autoComplete, maxLength, placeholder, required, disabled, hint, error } = props;
  return (
    <FieldFrame {...props}>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        autoComplete={autoComplete ?? 'off'}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        spellCheck={false}
      />
    </FieldFrame>
  );
}

export function TextAreaField(
  props: Shell & {
    value: string;
    onChange: (value: string) => void;
    rows?: number;
    maxLength?: number;
    placeholder?: string;
    monospace?: boolean;
    onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  },
) {
  const { id, value, onChange, rows = 5, maxLength, placeholder, required, disabled, hint, error, monospace, onKeyDown } = props;
  return (
    <FieldFrame {...props}>
      <textarea
        id={id}
        className={`input textarea${monospace ? ' is-mono' : ''}`}
        value={value}
        rows={rows}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        spellCheck={false}
      />
    </FieldFrame>
  );
}

export function SelectField(
  props: Shell & {
    value: string;
    onChange: (value: string) => void;
    options: readonly { readonly value: string; readonly label: string }[];
  },
) {
  const { id, value, onChange, options, required, disabled, hint, error } = props;
  return (
    <FieldFrame {...props}>
      <select
        id={id}
        className="input select"
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="field field-check">
      <input
        id={id}
        type="checkbox"
        className="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      <label htmlFor={id}>{label}</label>
      {hint ? (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
