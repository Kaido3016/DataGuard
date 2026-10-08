/**
 * SYNTHETIC DEMO DATA — never real, never from the API.
 *
 * This module is only imported dynamically when demo mode is explicitly enabled at build time
 * (VITE_ENABLE_DEMO_MODE=true) and switched on in Settings. Every record carries
 * `origin: 'demo'` and the UI shows a persistent "demo data" banner while it is active.
 * To replace it with real data, delete this folder and the dynamic import in state/workspace.tsx:
 * the real providers (API-backed) already feed the same record types.
 */
import type { Governance, AnalysisRecord } from '../types/analysis';
import type { ActivityEvent } from '../types/audit';
import type { PiaRecord, PiaStatus } from '../types/pia';
import type { Detection } from '../types/pii';
import type { RemediationPriority, RemediationRecord } from '../types/remediation';
import type { RiskFactor, RiskLevel } from '../types/risk';

export interface DemoWorkspace {
  readonly analyses: AnalysisRecord[];
  readonly pias: PiaRecord[];
  readonly remediations: RemediationRecord[];
  readonly activity: ActivityEvent[];
}

const ORG = 'demo-organization';
const USER = 'demo-privacy-officer';

function dets(items: readonly (readonly [string, number, string])[]): Detection[] {
  return items.map(([type, confidence, detector], index) => ({
    type,
    confidence,
    detector,
    start: index * 30,
    end: index * 30 + 12,
    redactedValue: '[REDACTED]',
  }));
}

function governance(framework: string, rules: readonly [string, string, string][]): Governance {
  return {
    framework,
    findings: rules.map(([ruleId, status, reason]) => ({
      ruleId,
      ruleVersion: '0.1.0',
      status,
      severity: 'high',
      reason,
      requiredEvidence: ['privacy_policy', 'accountable_owner'],
      remediation: ['Assign an accountable owner.'],
    })),
  };
}

function factors(base: number, count: number, extra: readonly [string, number, string][]): RiskFactor[] {
  return [
    { name: 'sensitivity', points: base, detail: 'highest detected sensitivity class' },
    { name: 'quantity', points: Math.min(15, count * 2), detail: `${count} detections` },
    { name: 'confidence', points: 9.4, detail: 'mean detector confidence=0.940' },
    ...extra.map(([name, points, detail]) => ({ name, points, detail })),
  ];
}

function analysis(
  n: number,
  label: string,
  level: RiskLevel,
  score: number,
  detections: Detection[],
  risk: RiskFactor[],
  gov: Governance,
  minutesAgo: number,
  now: Date,
): AnalysisRecord {
  return {
    key: `demo-analysis-${n}`,
    analysisId: `demo-analysis-${n}`,
    organizationId: ORG,
    origin: 'demo',
    observedVia: 'this-session',
    source: { kind: 'text', label, document: null },
    createdAt: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    context: null,
    detections,
    risk: {
      score,
      level,
      factors: risk,
      explanation: `Risk score ${score}/100 (${level}) based on sensitivity, quantity, confidence and supplied control/exposure context. Synthetic demo data.`,
      recommendations: [
        'Confirm encryption at rest and key-management controls.',
        'Review retention and apply the minimum period justified by the documented purpose.',
      ],
    },
    governance: gov,
    preview: null,
    partial: false,
    warnings: [],
  };
}

const PIA_PLAN: readonly [string, PiaStatus][] = [
  ['Customer portal redesign', 'IN_REVIEW'],
  ['HR onboarding platform', 'REQUIRES_REMEDIATION'],
  ['Citizen service chatbot', 'IN_REVIEW'],
  ['Loyalty programme analytics', 'DRAFT'],
  ['Claims processing automation', 'IN_REVIEW'],
  ['Data warehouse migration', 'APPROVED'],
  ['Marketing e-mail platform', 'DRAFT'],
  ['Legacy CRM decommission', 'ARCHIVED'],
];

const REMEDIATION_PLAN: readonly [RemediationPriority, number][] = [
  ['CRITICAL', 3],
  ['HIGH', 7],
  ['MEDIUM', 12],
  ['LOW', 5],
];

const REMEDIATION_TITLES: readonly string[] = [
  'Encrypt exported customer files at rest',
  'Restrict access to the HR share to named roles',
  'Define a retention period for support transcripts',
  'Document the processing purpose for the loyalty dataset',
  'Mask identifiers in analytics extracts',
  'Review third-party recipients of contact data',
];

export function createDemoWorkspace(now: Date): DemoWorkspace {
  const analyses: AnalysisRecord[] = [
    analysis(1, 'Customer export (synthetic)', 'CRITICAL', 86,
      dets([['SOCIAL_INSURANCE_NUMBER', 0.97, 'regex'], ['HEALTH_INSURANCE_ID', 0.95, 'regex'], ['PERSON', 0.96, 'ner']]),
      factors(85, 3, [['exposure', 10, 'external'], ['encryption', 8, 'encryption at rest not confirmed']]),
      governance('quebec_privacy', [['DG-QC-PI-001', 'REQUIRES_REVIEW', 'Applicability requires authorized human/legal review.'], ['DG-QC-PI-002', 'REQUIRES_REMEDIATION', 'Required evidence is missing: pia_record, safeguards']]), 95, now),
    analysis(2, 'Support tickets (synthetic)', 'HIGH', 68,
      dets([['EMAIL', 0.98, 'regex'], ['PHONE', 0.94, 'regex'], ['ADDRESS', 0.91, 'regex'], ['PERSON', 0.93, 'ner'], ['DATE_OF_BIRTH', 0.96, 'regex'], ['CUSTOMER_ID', 0.95, 'regex']]),
      factors(40, 6, [['access_scope', 10, 'external'], ['retention', 4.2, 'retention_days=1100']]),
      governance('canada_privacy', [['DG-CA-PI-001', 'REQUIRES_REVIEW', 'Applicability requires authorized human/legal review.']]), 70, now),
    analysis(3, 'Marketing list (synthetic)', 'MEDIUM', 46,
      dets([['PERSON', 0.95, 'ner'], ['EMAIL', 0.99, 'regex'], ['PHONE', 0.93, 'regex'], ['LOCATION', 0.89, 'ner'], ['EMAIL', 0.99, 'regex'], ['EMAIL', 0.98, 'regex'], ['PHONE', 0.92, 'regex'], ['ORGANIZATION', 0.88, 'ner']]),
      factors(25, 8, [['purpose', 5, 'processing purpose not confirmed']]),
      governance('gdpr', [['DG-EU-GDPR-001', 'REQUIRES_REMEDIATION', 'Required evidence is missing: processing_inventory']]), 40, now),
    analysis(4, 'Event registrations (synthetic)', 'MEDIUM', 38,
      dets([['PERSON', 0.96, 'ner'], ['EMAIL', 0.99, 'regex'], ['PHONE', 0.95, 'regex'], ['EMAIL', 0.98, 'regex'], ['PERSON', 0.94, 'ner'], ['LOCATION', 0.9, 'ner']]),
      factors(25, 6, [['data_location', 4, 'unknown']]),
      governance('ccpa', [['DG-US-CCPA-001', 'PASS', 'Configured evidence is present.']]), 25, now),
    analysis(5, 'Server logs (synthetic)', 'LOW', 22,
      dets([['IP_ADDRESS', 0.99, 'regex'], ['IP_ADDRESS', 0.99, 'regex'], ['ORGANIZATION', 0.9, 'ner'], ['LOCATION', 0.88, 'ner']]),
      factors(15, 4, []),
      governance('quebec_privacy', [['DG-QC-PI-001', 'REQUIRES_REVIEW', 'Applicability requires authorized human/legal review.']]), 10, now),
  ];

  const pias: PiaRecord[] = PIA_PLAN.map(([projectName, status], index) => {
    const at = new Date(now.getTime() - (index + 1) * 3_600_000).toISOString();
    return {
      id: `demo-pia-${index + 1}`,
      organizationId: ORG,
      projectName,
      status,
      version: status === 'DRAFT' ? 1 : 3,
      ownerId: USER,
      createdAt: at,
      updatedAt: at,
      draft: {
        projectName,
        systemDescription: 'Synthetic demonstration record.',
        personalInformation: ['Name', 'E-mail'],
        purposes: ['Service delivery'],
        dataSources: ['Web forms'],
        recipients: ['Internal teams'],
        storageLocations: ['Canada (Québec)'],
        retention: '24 months',
        risks: [
          { title: 'Excess retention', level: 'MEDIUM', description: 'Retention not yet justified.', mitigation: index % 2 === 0 ? 'Apply a 24-month policy' : '' },
        ],
        safeguards: ['Encryption at rest'],
      },
      history: [{ fromStatus: null, toStatus: 'DRAFT', reason: '', at, actorId: USER }],
      origin: 'demo',
    };
  });

  const remediations: RemediationRecord[] = [];
  let counter = 0;
  for (const [priority, count] of REMEDIATION_PLAN) {
    for (let i = 0; i < count; i += 1) {
      counter += 1;
      remediations.push({
        id: `demo-remediation-${counter}`,
        organizationId: ORG,
        title: REMEDIATION_TITLES[counter % REMEDIATION_TITLES.length] ?? 'Remediation item',
        description: 'Synthetic demonstration item.',
        priority,
        status: 'OPEN',
        ownerId: USER,
        analysisId: `demo-analysis-${(counter % 5) + 1}`,
        findingId: null,
        createdAt: new Date(now.getTime() - counter * 600_000).toISOString(),
        origin: 'demo',
      });
    }
  }

  const at = (minutesAgo: number): string => new Date(now.getTime() - minutesAgo * 60_000).toISOString();
  const activity: ActivityEvent[] = [
    { id: 'demo-act-4', at: at(5), action: 'REMEDIATION_CREATED', objectType: 'remediation', objectId: 'demo-remediation-1', details: [{ key: 'priority', value: 'CRITICAL' }, { key: 'status', value: 'OPEN' }], origin: 'demo' },
    { id: 'demo-act-3', at: at(12), action: 'PIA_TRANSITIONED', objectType: 'pia', objectId: 'demo-pia-1', details: [{ key: 'from', value: 'DRAFT' }, { key: 'to', value: 'IN_REVIEW' }], origin: 'demo' },
    { id: 'demo-act-2', at: at(40), action: 'PIA_CREATED', objectType: 'pia', objectId: 'demo-pia-1', details: [{ key: 'project', value: 'Customer portal redesign' }], origin: 'demo' },
    { id: 'demo-act-1', at: at(95), action: 'ANALYSIS_COMPLETED', objectType: 'analysis', objectId: 'demo-analysis-1', details: [{ key: 'risk', value: 'CRITICAL' }, { key: 'detections', value: '3' }], origin: 'demo' },
  ];

  return { analyses, pias, remediations, activity };
}
