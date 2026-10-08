import type { ReactNode } from 'react';

export function Panel({
  title,
  eyebrow,
  actions,
  children,
  className = '',
  id,
}: {
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section className={`panel ${className}`.trim()} aria-labelledby={title ? headingId : undefined} id={id}>
      {title || actions ? (
        <header className="panel-head">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? (
              <h2 className="panel-title" id={headingId}>
                {title}
              </h2>
            ) : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  caption,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  caption: string;
  tone?: 'neutral' | 'danger' | 'info' | 'warning';
}) {
  return (
    <article className="stat">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className={`stat-caption tone-text-${tone}`}>{caption}</p>
    </article>
  );
}
