import { describe, expect, it } from 'vitest';
import { parseHash } from './useRoute';

describe('parseHash', () => {
  it('defaults to the overview route', () => {
    expect(parseHash('').path).toBe('/');
    expect(parseHash('#').path).toBe('/');
    expect(parseHash('#/').path).toBe('/');
  });
  it('normalises slashes and parses the query string', () => {
    const { path, query } = parseHash('#/findings/?finding=abc%231&x=2');
    expect(path).toBe('/findings');
    expect(query.get('finding')).toBe('abc#1');
    expect(query.get('x')).toBe('2');
  });
  it('accepts paths without a leading slash', () => {
    expect(parseHash('#audit').path).toBe('/audit');
  });
});
