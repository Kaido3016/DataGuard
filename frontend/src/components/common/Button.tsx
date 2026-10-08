import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly type?: 'button' | 'submit';
  readonly variant?: ButtonVariant;
  readonly icon?: IconName;
  readonly disabled?: boolean;
  readonly busy?: boolean;
  readonly small?: boolean;
  readonly title?: string;
  readonly ariaLabel?: string;
  readonly ariaExpanded?: boolean;
  readonly ariaControls?: string;
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'secondary',
  icon,
  disabled = false,
  busy = false,
  small = false,
  title,
  ariaLabel,
  ariaExpanded,
  ariaControls,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}${small ? ' btn-small' : ''}`}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      title={title}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
    >
      {busy ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  );
}

/** Anchor styled as a button, for hash navigation. */
export function ButtonLink({
  href,
  children,
  variant = 'secondary',
  icon,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  icon?: IconName;
}) {
  return (
    <a className={`btn btn-${variant}`} href={href}>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </a>
  );
}
