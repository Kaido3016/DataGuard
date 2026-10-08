import { getAnalysis } from '../api/pii';
import { analyzeDocument, analyzeText } from '../api/pii';
import { useWorkspace } from '../state/workspace';
import type { AnalysisContext, AnalysisRecord } from '../types/analysis';
import type { DocumentMeta } from '../types/pii';
import { useAsyncAction } from './useAsyncAction';

export type RunInput =
  | { readonly kind: 'text'; readonly text: string; readonly context: AnalysisContext }
  | { readonly kind: 'document'; readonly file: File };

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : 'unknown';
}

/**
 * Runs an analysis against the API and records the outcome in the workspace.
 * Raw text is passed only to the API and to the local redaction step; it is not stored.
 */
export function useAnalysisRunner() {
  const workspace = useWorkspace();
  return useAsyncAction<[RunInput], AnalysisRecord>(async (signal, input) => {
    if (input.kind === 'text') {
      const result = await analyzeText(input.text, input.context, { signal });
      return workspace.recordAnalysis(result, { kind: 'text', label: '', document: null }, input.context, input.text);
    }
    const result = await analyzeDocument(input.file, { signal });
    // The upload response omits extraction details; the stored analysis carries them.
    let document: DocumentMeta = {
      filename: input.file.name,
      documentType: extensionOf(input.file.name),
      pageCount: null,
      warnings: [],
    };
    if (result.analysisId) {
      try {
        const persisted = await getAnalysis(result.analysisId, { signal });
        if (persisted.document) document = persisted.document;
      } catch {
        /* metadata is a nicety: the analysis itself succeeded */
      }
    }
    return workspace.recordAnalysis(result, { kind: 'document', label: document.filename, document }, null, null);
  });
}
