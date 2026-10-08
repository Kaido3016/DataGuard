import { describe, expect, it } from 'vitest';
import { createDemoWorkspace } from './demoWorkspace';
import { summarize } from '../utils/selectors';

describe('demo workspace', () => {
  const demo = createDemoWorkspace(new Date('2026-10-06T12:00:00Z'));

  it('is entirely marked as demo data', () => {
    const origins = [...demo.analyses, ...demo.pias, ...demo.remediations, ...demo.activity].map((item) => item.origin);
    expect(origins.every((origin) => origin === 'demo')).toBe(true);
  });

  it('is internally consistent with the dashboard derivations', () => {
    const summary = summarize(demo.analyses);
    expect(summary.findings).toBe(27);
    expect(summary.critical).toBe(3);
    expect(demo.pias).toHaveLength(8);
    expect(demo.remediations).toHaveLength(27);
  });
});
