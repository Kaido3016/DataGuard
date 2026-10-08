/** Locally generated identifier (never sent as a tenant or object id to the API). */
export function localId(prefix: string): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }
  const bytes = new Uint8Array(12);
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return `${prefix}-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/** Request correlation id; accepted by the backend's X-Request-ID validation (<=128, printable). */
export function requestId(): string {
  return localId('dg').replace(/^dg-/, '');
}
