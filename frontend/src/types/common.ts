/**
 * Where a piece of data came from. `live` data was returned by the DataGuard API;
 * `demo` data is synthetic and only exists when demo mode is explicitly enabled.
 */
export type DataOrigin = 'live' | 'demo';

/** Locales supported by the UI. */
export type Locale = 'fr-CA' | 'en-CA';
