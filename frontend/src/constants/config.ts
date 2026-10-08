function parsePositive(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Build-time configuration. Every value here ships in the public bundle: no secrets. */
export const config = {
  /** Empty string = same origin (dev proxy or reverse proxy). */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, ''),
  requestTimeoutMs: parsePositive(import.meta.env.VITE_REQUEST_TIMEOUT_MS, 60_000),
  /** The backend only serves /auth/login in development; a 404 is handled gracefully. */
  enableDevLogin: import.meta.env.VITE_ENABLE_DEV_LOGIN !== 'false',
  /** Demo mode must be explicitly enabled at build time; it is never on by default. */
  enableDemoMode: import.meta.env.VITE_ENABLE_DEMO_MODE === 'true',
  healthPollMs: 60_000,
  /** Mirrors AnalyzeRequest.text max_length (backend is authoritative). */
  maxTextChars: 1_000_000,
  /** Mirrors DATAGUARD_MAX_UPLOAD_BYTES default (50 MiB); the backend enforces the real limit. */
  maxUploadBytes: 50 * 1024 * 1024,
  /** How many persisted analysis ids are remembered per tab to reload them after sign-in. */
  recentAnalysisLimit: 30,
} as const;

export const UPLOAD_ACCEPT = '.pdf,.docx,.txt,.csv,.json,.xlsx,.png,.jpg,.jpeg,.tif,.tiff';
