import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { contractError, isApiError } from '../api/errors';
import { getAnalysis } from '../api/pii';
import { useAuth } from './auth';
import {
  analysisActivity,
  applyPiaTransition,
  buildAnalysisRecord,
  buildPiaRecord,
  buildRemediationRecord,
  piaActivity,
  recordFromPersisted,
  remediationActivity,
} from './builders';
import { clearRecentIds, forgetAnalysisId, readRecentIds, rememberAnalysisId } from './recentIds';
import type { AnalysisContext, AnalysisRecord, AnalyzeResult } from '../types/analysis';
import type { ActivityEvent } from '../types/audit';
import type { PiaDraft, PiaRecord, PiaSummary } from '../types/pia';
import type { Finding, SourceRef } from '../types/pii';
import type { RemediationInput, RemediationRecord, RemediationSummary } from '../types/remediation';
import { recordsToFindings } from '../utils/selectors';

interface WorkspaceData {
  readonly analyses: readonly AnalysisRecord[];
  readonly pias: readonly PiaRecord[];
  readonly remediations: readonly RemediationRecord[];
  readonly activity: readonly ActivityEvent[];
}

interface StoredState extends WorkspaceData {
  /** `${organizationId}:${subject}` that owns the data. Data of another owner is never exposed. */
  readonly ownerKey: string | null;
}

const EMPTY: WorkspaceData = { analyses: [], pias: [], remediations: [], activity: [] };

type Action =
  | { type: 'reset'; ownerKey: string | null }
  | { type: 'analysis'; record: AnalysisRecord; event: ActivityEvent }
  | { type: 'reloaded'; records: readonly AnalysisRecord[] }
  | { type: 'pia-added'; record: PiaRecord; event: ActivityEvent }
  | { type: 'pia-updated'; record: PiaRecord; event: ActivityEvent }
  | { type: 'remediation-added'; record: RemediationRecord; event: ActivityEvent };

function reducer(state: StoredState, action: Action): StoredState {
  switch (action.type) {
    case 'reset':
      return { ...EMPTY, ownerKey: action.ownerKey };
    case 'analysis':
      return {
        ...state,
        analyses: [action.record, ...state.analyses.filter((item) => item.key !== action.record.key)],
        activity: [action.event, ...state.activity],
      };
    case 'reloaded': {
      const known = new Set(state.analyses.map((item) => item.key));
      const fresh = action.records.filter((item) => !known.has(item.key));
      return fresh.length === 0 ? state : { ...state, analyses: [...state.analyses, ...fresh] };
    }
    case 'pia-added':
      return { ...state, pias: [action.record, ...state.pias], activity: [action.event, ...state.activity] };
    case 'pia-updated':
      return {
        ...state,
        pias: state.pias.map((item) => (item.id === action.record.id ? action.record : item)),
        activity: [action.event, ...state.activity],
      };
    case 'remediation-added':
      return {
        ...state,
        remediations: [action.record, ...state.remediations],
        activity: [action.event, ...state.activity],
      };
  }
}

export type RehydrationStatus = 'idle' | 'loading' | 'done' | 'partial';

interface WorkspaceContextValue extends WorkspaceData {
  readonly findings: readonly Finding[];
  readonly isDemo: boolean;
  readonly demoAvailable: boolean;
  readonly setDemoMode: (enabled: boolean) => Promise<void>;
  readonly rehydration: RehydrationStatus;
  readonly recordAnalysis: (
    result: AnalyzeResult,
    source: SourceRef,
    context: AnalysisContext | null,
    previewText: string | null,
  ) => AnalysisRecord;
  readonly loadAnalysisById: (id: string, signal?: AbortSignal) => Promise<AnalysisRecord>;
  readonly addPia: (summary: PiaSummary, draft: PiaDraft) => PiaRecord;
  readonly updatePia: (current: PiaRecord, summary: PiaSummary, reason: string) => PiaRecord;
  readonly addRemediation: (
    summary: RemediationSummary,
    input: RemediationInput,
    findingId: string | null,
  ) => RemediationRecord;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const REHYDRATE_CONCURRENCY = 4;

export function WorkspaceProvider({ children, demoEnabled }: { children: ReactNode; demoEnabled: boolean }) {
  const { session, signOutReason } = useAuth();
  const [stored, dispatch] = useReducer(reducer, { ...EMPTY, ownerKey: null });
  const [demoData, setDemoData] = useState<WorkspaceData | null>(null);
  const [rehydration, setRehydration] = useState<RehydrationStatus>('idle');

  const ownerKey = session ? `${session.claims.organizationId}:${session.claims.subject}` : null;
  const organizationId = session?.claims.organizationId ?? null;
  const subject = session?.claims.subject ?? null;
  const sessionRef = useRef({ organizationId, subject });
  sessionRef.current = { organizationId, subject };
  const lastOrganizationRef = useRef<string | null>(null);
  if (organizationId) lastOrganizationRef.current = organizationId;

  // A different tenant/user starts from an empty workspace; an explicit sign-out wipes it.
  useEffect(() => {
    if (ownerKey && stored.ownerKey !== ownerKey) dispatch({ type: 'reset', ownerKey });
  }, [ownerKey, stored.ownerKey]);
  useEffect(() => {
    if (signOutReason === 'user') {
      if (lastOrganizationRef.current) clearRecentIds(lastOrganizationRef.current);
      dispatch({ type: 'reset', ownerKey: null });
      setDemoData(null);
      setRehydration('idle');
    }
  }, [signOutReason]);

  // After (re)sign-in, re-fetch analyses remembered for this organization from the API.
  useEffect(() => {
    if (!organizationId || !ownerKey) return undefined;
    const ids = readRecentIds(organizationId);
    if (ids.length === 0) {
      setRehydration('done');
      return undefined;
    }
    let cancelled = false;
    setRehydration('loading');
    const queue = [...ids];
    let failed = false;
    const worker = async (): Promise<void> => {
      for (;;) {
        const id = queue.shift();
        if (id === undefined || cancelled) return;
        try {
          const persisted = await getAnalysis(id);
          if (persisted.organizationId && persisted.organizationId !== organizationId) {
            forgetAnalysisId(organizationId, id); // never surface another tenant's data
            continue;
          }
          if (!cancelled) dispatch({ type: 'reloaded', records: [recordFromPersisted(persisted)] });
        } catch (error) {
          if (isApiError(error) && error.kind === 'not_found') forgetAnalysisId(organizationId, id);
          else failed = true;
        }
      }
    };
    void Promise.all(Array.from({ length: REHYDRATE_CONCURRENCY }, worker)).then(() => {
      if (!cancelled) setRehydration(failed ? 'partial' : 'done');
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId, ownerKey]);

  const live: WorkspaceData = stored.ownerKey !== null && stored.ownerKey === ownerKey ? stored : EMPTY;
  const isDemo = demoData !== null;
  const view = demoData ?? live;

  const recordAnalysis = useCallback<WorkspaceContextValue['recordAnalysis']>(
    (result, source, context, previewText) => {
      const { organizationId: org } = sessionRef.current;
      if (!org || (result.organizationId && result.organizationId !== org)) {
        throw contractError('organization mismatch');
      }
      const now = new Date();
      const record = buildAnalysisRecord({ result, source, context, previewText, now });
      if (record.analysisId) rememberAnalysisId(org, record.analysisId);
      dispatch({ type: 'analysis', record, event: analysisActivity(record, now) });
      return record;
    },
    [],
  );

  const loadAnalysisById = useCallback<WorkspaceContextValue['loadAnalysisById']>(async (id, signal) => {
    const persisted = await getAnalysis(id.trim(), { signal });
    const { organizationId: org } = sessionRef.current;
    if (!org || (persisted.organizationId && persisted.organizationId !== org)) {
      throw contractError('organization mismatch');
    }
    const record = recordFromPersisted(persisted);
    rememberAnalysisId(org, persisted.id);
    dispatch({ type: 'reloaded', records: [record] });
    return record;
  }, []);

  const addPia = useCallback<WorkspaceContextValue['addPia']>((summary, draft) => {
    const now = new Date();
    const record = buildPiaRecord(summary, draft, sessionRef.current.subject ?? '', now);
    dispatch({ type: 'pia-added', record, event: piaActivity('PIA_CREATED', record, null, now) });
    return record;
  }, []);

  const updatePia = useCallback<WorkspaceContextValue['updatePia']>((current, summary, reason) => {
    const now = new Date();
    const record = applyPiaTransition(current, summary, reason, sessionRef.current.subject ?? '', now);
    dispatch({ type: 'pia-updated', record, event: piaActivity('PIA_TRANSITIONED', record, current.status, now) });
    return record;
  }, []);

  const addRemediation = useCallback<WorkspaceContextValue['addRemediation']>((summary, input, findingId) => {
    const now = new Date();
    const record = buildRemediationRecord(summary, input, findingId, sessionRef.current.subject ?? '', now);
    dispatch({ type: 'remediation-added', record, event: remediationActivity(record, now) });
    return record;
  }, []);

  const setDemoMode = useCallback(
    async (enabled: boolean) => {
      if (!enabled || !demoEnabled) {
        setDemoData(null);
        return;
      }
      // The literal build-time comparison lets the bundler remove this import (and the synthetic
      // data with it) from production builds; with the flag on it is loaded lazily, on demand.
      if (import.meta.env.VITE_ENABLE_DEMO_MODE === 'true') {
        const { createDemoWorkspace } = await import('../demo/demoWorkspace');
        setDemoData(createDemoWorkspace(new Date()));
      }
    },
    [demoEnabled],
  );

  const findings = useMemo(() => recordsToFindings(view.analyses), [view.analyses]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ...view,
      findings,
      isDemo,
      demoAvailable: demoEnabled,
      setDemoMode,
      rehydration,
      recordAnalysis,
      loadAnalysisById,
      addPia,
      updatePia,
      addRemediation,
    }),
    [view, findings, isDemo, demoEnabled, setDemoMode, rehydration, recordAnalysis, loadAnalysisById, addPia, updatePia, addRemediation],
  );
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return context;
}

