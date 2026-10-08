import type { Detection, PreviewSegment, RedactedPreview } from '../types/pii';

export const DEFAULT_PREVIEW_CHARS = 6000;

export function tagFor(type: string): string {
  return `[${type}]`;
}

/**
 * Builds a redacted rendering of the submitted text from the API's detection offsets.
 *
 * - Offsets from the API are Unicode code-point indices (Python), so the text is split by code
 *   point rather than UTF-16 unit; this keeps astral characters (emoji) aligned.
 * - Every detected span is replaced by a `[TYPE]` tag, so the result never contains the
 *   detected values. Text that no detector flagged is kept as typed.
 * - Overlapping detections share the first tag.
 */
export function buildRedactedPreview(
  text: string,
  detections: readonly Detection[],
  maxChars: number = DEFAULT_PREVIEW_CHARS,
): RedactedPreview {
  const points = Array.from(text);
  const order = detections
    .map((detection, index) => ({ detection, index }))
    .filter(({ detection }) => Number.isInteger(detection.start) && Number.isInteger(detection.end))
    .filter(({ detection }) => detection.start >= 0 && detection.start < detection.end)
    .sort((a, b) => a.detection.start - b.detection.start || a.index - b.index);

  const segments: PreviewSegment[] = [];
  let cursor = 0;
  for (const { detection, index } of order) {
    if (detection.start >= points.length) continue;
    if (detection.start < cursor) continue; // overlaps a previous detection
    if (detection.start > cursor) {
      segments.push({ kind: 'text', text: points.slice(cursor, detection.start).join('') });
    }
    segments.push({ kind: 'tag', text: tagFor(detection.type), detectionIndex: index });
    cursor = Math.min(points.length, detection.end);
  }
  if (cursor < points.length) segments.push({ kind: 'text', text: points.slice(cursor).join('') });

  return truncateSegments(segments, maxChars);
}

function truncateSegments(segments: PreviewSegment[], maxChars: number): RedactedPreview {
  const kept: PreviewSegment[] = [];
  let used = 0;
  for (const segment of segments) {
    const length = Array.from(segment.text).length;
    if (used + length <= maxChars) {
      kept.push(segment);
      used += length;
      continue;
    }
    const remaining = maxChars - used;
    if (segment.kind === 'text' && remaining > 0) {
      kept.push({ kind: 'text', text: Array.from(segment.text).slice(0, remaining).join('') });
    }
    return { segments: kept, truncated: true };
  }
  return { segments: kept, truncated: false };
}

/**
 * Returns a short window of the redacted preview around one detection's tag
 * (with ellipses when cut), or null when that detection has no tag of its own.
 */
export function contextAround(
  preview: RedactedPreview,
  detectionIndex: number,
  radius = 48,
): PreviewSegment[] | null {
  const position = preview.segments.findIndex(
    (segment) => segment.kind === 'tag' && segment.detectionIndex === detectionIndex,
  );
  if (position < 0) return null;
  const target = preview.segments[position];
  if (!target) return null;

  const before: PreviewSegment[] = [];
  let budget = radius;
  for (let i = position - 1; i >= 0 && budget > 0; i -= 1) {
    const segment = preview.segments[i];
    if (!segment) break;
    const chars = Array.from(segment.text);
    if (chars.length <= budget) {
      before.unshift(segment);
      budget -= chars.length;
    } else {
      before.unshift({ kind: 'text', text: `…${chars.slice(chars.length - budget).join('')}` });
      budget = 0;
    }
  }

  const after: PreviewSegment[] = [];
  budget = radius;
  for (let i = position + 1; i < preview.segments.length && budget > 0; i += 1) {
    const segment = preview.segments[i];
    if (!segment) break;
    const chars = Array.from(segment.text);
    if (chars.length <= budget) {
      after.push(segment);
      budget -= chars.length;
    } else {
      after.push({ kind: 'text', text: `${chars.slice(0, budget).join('')}…` });
      budget = 0;
    }
  }
  return [...before, target, ...after];
}
