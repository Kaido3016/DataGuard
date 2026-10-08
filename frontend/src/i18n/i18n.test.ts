import { describe, expect, it } from 'vitest';
import { KNOWN_PII_TYPES } from '../types/pii';
import { ROLES } from '../types/auth';
import { COMPLIANCE_STATUSES, FRAMEWORK_IDS } from '../types/analysis';
import { OBSERVED_AUDIT_ACTIONS } from '../types/audit';
import { PIA_STATUSES } from '../types/pia';
import { REMEDIATION_WORKFLOW } from '../types/remediation';
import { RISK_LEVELS } from '../types/risk';
import { en } from './en';
import { fr } from './fr';
import { translate } from './index';

const frKeys = new Set(Object.keys(fr));
const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();

describe('dictionaries', () => {
  it('define the same keys in both languages with the same placeholders', () => {
    expect(Object.keys(en).sort()).toEqual([...frKeys].sort());
    for (const key of frKeys) {
      expect(placeholders((en as Record<string, string>)[key] ?? '')).toEqual(placeholders((fr as Record<string, string>)[key] ?? ''));
    }
  });

  it('cover every value of every enum rendered through dynamic labels', () => {
    const families: [string, readonly string[]][] = [
      ['pii.type', KNOWN_PII_TYPES], ['pii.desc', KNOWN_PII_TYPES],
      ['risk.level', RISK_LEVELS], ['role', ROLES],
      ['pia.status', PIA_STATUSES], ['pia.review', PIA_STATUSES], ['pia.next', PIA_STATUSES],
      ['rem.status', REMEDIATION_WORKFLOW],
      ['compliance.status', COMPLIANCE_STATUSES],
      ['framework.name', FRAMEWORK_IDS], ['framework.scope', FRAMEWORK_IDS],
      ['audit.action', OBSERVED_AUDIT_ACTIONS],
      ['audit.object', ['analysis', 'pia', 'remediation']],
      ['audit.detail', ['risk', 'detections', 'source', 'project', 'status', 'from', 'to', 'priority', 'title', 'version']],
      ['pia.step', ['scope', 'data', 'purpose', 'risk', 'controls', 'review', 'evidence']],
      ['pia.help', ['scope', 'data', 'purpose', 'risk', 'controls', 'review', 'evidence']],
      ['risk.factor.sensitivity', ['label', 'desc']], ['risk.factor.exposure', ['label', 'desc']],
      ['risk.factor.controls', ['label', 'desc']], ['risk.factor.retention', ['label', 'desc']],
      ['risk.factor.volume', ['label', 'desc']], ['risk.factor.confidence', ['label', 'desc']],
      ['risk.factor.location', ['label', 'desc']], ['risk.factor.other', ['label', 'desc']],
      ['confidence', ['high', 'medium', 'low']], ['finding.confidence', ['high', 'medium', 'low']],
      ['compliance.severityValue', ['low', 'medium', 'high', 'critical']],
      ['source.kind', ['text', 'document']],
      ['opt.access', ['internal', 'restricted', 'external', 'public']],
      ['opt.exposure', ['internal', 'external', 'internet', 'unknown']],
      ['opt.location', ['quebec', 'canada', 'international', 'unknown', 'public']],
    ];
    const missing: string[] = [];
    for (const [prefix, values] of families) for (const value of values) if (!frKeys.has(`${prefix}.${value}`)) missing.push(`${prefix}.${value}`);
    expect(missing).toEqual([]);
  });

  it('interpolates parameters and leaves unknown placeholders visible', () => {
    expect(translate('en-CA', 'pager.status', { page: 2, pages: 5 })).toBe('Page 2 of 5');
    expect(translate('fr-CA', 'pager.status', { page: 2, pages: 5 })).toBe('Page 2 sur 5');
    expect(translate('en-CA', 'pager.status', { page: 2 })).toBe('Page 2 of {pages}');
  });
});
