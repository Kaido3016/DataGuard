import { describe, expect, it } from 'vitest';
import { arcPath } from './gauge';

describe('arcPath', () => {
  it('starts bottom-left and ends bottom-right for the full sweep', () => {
    const path = arcPath(80, 80, 64, 0, 1);
    expect(path.startsWith('M 34.75 125.25 A 64 64 0 1 1 125.25 125.25')).toBe(true);
  });

  it('uses the small-arc flag for short sweeps and clamps out-of-range input', () => {
    expect(arcPath(80, 80, 64, 0, 0.3)).toContain(' 0 0 1 ');
    expect(arcPath(80, 80, 64, -1, 2)).toBe(arcPath(80, 80, 64, 0, 1));
  });
});
