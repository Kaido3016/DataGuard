import { useCallback, useEffect, useState } from 'react';
import { getReadiness } from '../api/health';
import { config } from '../constants/config';
import type { HealthStatus } from '../types/audit';

export type ApiHealthState =
  | { readonly status: 'checking' }
  | { readonly status: 'ok' | 'degraded'; readonly health: HealthStatus }
  | { readonly status: 'unreachable' };

/** Polls the unauthenticated readiness endpoint. */
export function useApiHealth(): { state: ApiHealthState; refresh: () => void } {
  const [state, setState] = useState<ApiHealthState>({ status: 'checking' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getReadiness({ signal: controller.signal }).then(
      (health) => setState({ status: health.status, health }),
      () => {
        if (!controller.signal.aborted) setState({ status: 'unreachable' });
      },
    );
    return () => controller.abort();
  }, [tick]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), config.healthPollMs);
    return () => window.clearInterval(id);
  }, []);

  const refresh = useCallback(() => setTick((value) => value + 1), []);
  return { state, refresh };
}
