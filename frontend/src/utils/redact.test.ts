import { describe, expect, it } from 'vitest';
import { buildRedactedPreview, contextAround } from './redact';
import { detection } from './testing';

const joined = (preview: ReturnType<typeof buildRedactedPreview>): string =>
  preview.segments.map((segment) => segment.text).join('');

describe('buildRedactedPreview', () => {
  it('replaces every detected span with a type tag and never keeps the value', () => {
    const text = 'Contact alice@example.com now';
    const preview = buildRedactedPreview(text, [detection({ type: 'EMAIL', start: 8, end: 25 })]);
    expect(joined(preview)).toBe('Contact [EMAIL] now');
    expect(joined(preview)).not.toContain('alice');
    expect(preview.truncated).toBe(false);
  });

  it('keeps offsets aligned for astral characters (API offsets are code points)', () => {
    const text = '😀 bob@x.co ok';
    const preview = buildRedactedPreview(text, [detection({ type: 'EMAIL', start: 2, end: 10 })]);
    expect(joined(preview)).toBe('😀 [EMAIL] ok');
  });

  it('orders segments by position regardless of detection order', () => {
    const text = 'a@b.co and 514-555-0100';
    const preview = buildRedactedPreview(text, [
      detection({ type: 'PHONE', start: 11, end: 23 }),
      detection({ type: 'EMAIL', start: 0, end: 6 }),
    ]);
    expect(joined(preview)).toBe('[EMAIL] and [PHONE]');
  });

  it('lets overlapping detections share the first tag', () => {
    const preview = buildRedactedPreview('abcdefghij', [
      detection({ type: 'PERSON', start: 0, end: 6 }),
      detection({ type: 'LOCATION', start: 4, end: 8 }),
    ]);
    expect(joined(preview)).toBe('[PERSON]ghij');
  });

  it('ignores invalid offsets', () => {
    const preview = buildRedactedPreview('hello', [
      detection({ start: 3, end: 3 }),
      detection({ start: -1, end: 2 }),
      detection({ start: 99, end: 120 }),
    ]);
    expect(joined(preview)).toBe('hello');
  });

  it('truncates long previews and flags it', () => {
    const preview = buildRedactedPreview('x'.repeat(50), [], 10);
    expect(joined(preview)).toBe('x'.repeat(10));
    expect(preview.truncated).toBe(true);
  });
});

describe('contextAround', () => {
  const text = 'Dossier de Jeanne: courriel jeanne@example.com, ville Montréal, suite du dossier';
  const detections = [
    detection({ type: 'PERSON', start: 10, end: 16 }),
    detection({ type: 'EMAIL', start: 27, end: 46 }),
  ];
  const preview = buildRedactedPreview(text, detections);

  it('returns a window containing the tag with ellipses when cut', () => {
    const window = contextAround(preview, 1, 10);
    expect(window).not.toBeNull();
    const rendered = (window ?? []).map((segment) => segment.text).join('');
    expect(rendered).toContain('[EMAIL]');
    expect(rendered.startsWith('…')).toBe(true);
    expect(rendered.endsWith('…')).toBe(true);
    expect(rendered).not.toContain('jeanne@');
  });

  it('returns null for a detection that has no tag of its own', () => {
    const overlapped = buildRedactedPreview('abcdefghij', [
      detection({ start: 0, end: 6 }),
      detection({ start: 4, end: 8 }),
    ]);
    expect(contextAround(overlapped, 1)).toBeNull();
  });
});
