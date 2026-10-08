import { useI18n } from '../../i18n';
import type { ActivityDetailKey, ActivityEvent } from '../../types/audit';
import { formatDay, formatTime, shortId } from '../../utils/format';
import { DemoTag } from '../common/Badges';
import { EmptyState } from '../common/States';

function groupByDay(events: readonly ActivityEvent[]): [string, ActivityEvent[]][] {
  const groups = new Map<string, ActivityEvent[]>();
  for (const event of events) {
    const day = event.at.slice(0, 10);
    const list = groups.get(day) ?? [];
    list.push(event);
    groups.set(day, list);
  }
  return [...groups.entries()];
}

export function ActivityTimeline({ events }: { events: readonly ActivityEvent[] }) {
  const { t, td, locale } = useI18n();
  if (events.length === 0) {
    return <EmptyState icon="clock" title={t('audit.timeline.empty.title')}>{t('audit.timeline.empty.body')}</EmptyState>;
  }
  const detailValue = (key: ActivityDetailKey, value: string): string => {
    if (key === 'risk' || key === 'priority') return td('risk.level', value);
    if (key === 'from' || key === 'to') return td('pia.status', value);
    if (key === 'status') return td('pia.status', value) !== value ? td('pia.status', value) : td('rem.status', value);
    if (key === 'source') return td('source.kind', value);
    return value;
  };
  return (
    <div>
      {groupByDay(events).map(([day, list]) => (
        <section key={day} aria-label={formatDay(list[0]?.at ?? null, locale)}>
          <h3 className="timeline-day">{formatDay(list[0]?.at ?? null, locale)}</h3>
          <ol className="timeline">
            {list.map((event) => (
              <li key={event.id} className="timeline-item">
                <span className="timeline-time">{formatTime(event.at, locale)}</span>
                <span className="timeline-dot" aria-hidden="true" />
                <div className="timeline-body">
                  <p className="timeline-title">
                    {td('audit.action', event.action)} <code className="action-code">{event.action}</code>
                    {event.origin === 'demo' ? <> <DemoTag /></> : null}
                  </p>
                  <p className="timeline-meta">
                    {td('audit.object', event.objectType)} · <code>{shortId(event.objectId)}</code>
                  </p>
                  {event.details.length > 0 ? (
                    <p className="timeline-details">
                      {event.details.map((detail) => (
                        <span key={detail.key} className="detail-pair">
                          <span className="muted">{td('audit.detail', detail.key)}:</span> {detailValue(detail.key, detail.value)}
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
