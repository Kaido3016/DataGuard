import { describe, expect, it } from 'vitest';
import { groupRiskFactors, levelFromScore, normalizeLevel, totalPoints } from './risk';

describe('risk levels', () => {
  it('mirrors the backend thresholds', () => {
    expect(levelFromScore(0)).toBe('LOW');
    expect(levelFromScore(29.9)).toBe('LOW');
    expect(levelFromScore(30)).toBe('MEDIUM');
    expect(levelFromScore(59.9)).toBe('MEDIUM');
    expect(levelFromScore(60)).toBe('HIGH');
    expect(levelFromScore(80)).toBe('CRITICAL');
  });

  it('prefers the API level and tolerates case, falling back to the score for unknown levels', () => {
    expect(normalizeLevel('HIGH', 10)).toBe('HIGH');
    expect(normalizeLevel('medium', 90)).toBe('MEDIUM');
    expect(normalizeLevel('SEVERE', 85)).toBe('CRITICAL');
    expect(normalizeLevel(undefined, 12)).toBe('LOW');
  });
});

describe('groupRiskFactors', () => {
  const factors = [
    { name: 'sensitivity', points: 25, detail: 'highest detected sensitivity class' },
    { name: 'quantity', points: 6, detail: '3 detections' },
    { name: 'confidence', points: 9.5, detail: 'mean detector confidence=0.950' },
    { name: 'exposure', points: 10, detail: 'external' },
    { name: 'access_scope', points: 10, detail: 'external' },
    { name: 'encryption', points: 8, detail: 'encryption at rest not confirmed' },
  ];

  it('folds engine factors into explanation categories and keeps zero-point core groups', () => {
    const groups = groupRiskFactors(factors);
    const byId = Object.fromEntries(groups.map((group) => [group.id, group.points]));
    expect(byId['sensitivity']).toBe(25);
    expect(byId['exposure']).toBe(20);
    expect(byId['controls']).toBe(8);
    expect(byId['volume']).toBe(6);
    expect(byId['retention']).toBe(0);
    expect(byId['location']).toBe(0);
    expect(groups.map((group) => group.id)).not.toContain('other');
  });

  it('surfaces factors from a newer engine under "other" instead of dropping them', () => {
    const groups = groupRiskFactors([{ name: 'new_signal', points: 3, detail: 'x' }]);
    expect(groups[groups.length - 1]?.id).toBe('other');
    expect(groups[groups.length - 1]?.points).toBe(3);
  });

  it('sums points', () => {
    expect(totalPoints(factors)).toBeCloseTo(68.5, 5);
  });
});
