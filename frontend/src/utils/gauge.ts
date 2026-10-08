/** Geometry for the 270° risk gauge (0 at bottom-left, 1 at bottom-right, clockwise). */
const START_DEG = 135;
const SWEEP_DEG = 270;

function point(cx: number, cy: number, r: number, degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return { x: cx + r * Math.cos(radians), y: cy + r * Math.sin(radians) };
}

/** SVG path for the arc between two fractions (0..1) of the gauge sweep. */
export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const a = Math.min(1, Math.max(0, from));
  const b = Math.min(1, Math.max(a, to));
  const startDeg = START_DEG + SWEEP_DEG * a;
  const endDeg = START_DEG + SWEEP_DEG * b;
  const start = point(cx, cy, r, startDeg);
  const end = point(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const fmt = (n: number): string => n.toFixed(2);
  return `M ${fmt(start.x)} ${fmt(start.y)} A ${r} ${r} 0 ${largeArc} 1 ${fmt(end.x)} ${fmt(end.y)}`;
}
