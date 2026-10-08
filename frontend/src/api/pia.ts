import { apiClient } from './http';
import { parsePiaSummary } from './parsers';
import type { CallOptions } from './pii';
import type { PiaDraft, PiaStatus, PiaSummary } from '../types/pia';

/** POST /api/v1/pias — creates a DRAFT PIA (permission `pia:manage`). */
export async function createPia(draft: PiaDraft, options: CallOptions = {}): Promise<PiaSummary> {
  const raw = await apiClient.request('/api/v1/pias', {
    method: 'POST',
    signal: options.signal,
    json: {
      project_name: draft.projectName,
      system_description: draft.systemDescription,
      personal_information: draft.personalInformation,
      purposes: draft.purposes,
      data_sources: draft.dataSources,
      recipients: draft.recipients,
      storage_locations: draft.storageLocations,
      retention: draft.retention,
      risks: draft.risks.map((risk) => ({
        title: risk.title,
        level: risk.level,
        description: risk.description,
        mitigation: risk.mitigation,
      })),
      safeguards: draft.safeguards,
    },
  });
  return parsePiaSummary(raw);
}

/** POST /api/v1/pias/{id}/transition — the backend answers 409 for a disallowed move. */
export async function transitionPia(
  id: string,
  target: PiaStatus,
  reason: string,
  options: CallOptions = {},
): Promise<PiaSummary> {
  const raw = await apiClient.request(`/api/v1/pias/${encodeURIComponent(id)}/transition`, {
    method: 'POST',
    signal: options.signal,
    json: { target, reason },
  });
  return parsePiaSummary(raw);
}
