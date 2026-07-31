// Deterministic ink-vine geometry. Pure math — no React, no DOM — so the
// same category always draws the same vine, and it can be unit-tested or
// rendered server-side without surprises.

export interface VinePod {
  x: number;
  y: number;
  r: number;
}

export interface VineGeometry {
  stem: string;
  stemHighlight: string;
  branches: string[];
  leaves: string[];
  pods: VinePod[];
  bud: string;
  height: number;
}

export const TASKS_PER_POD = 3;
const MAX_PODS = 22; // keeps a very long-running category from turning to clutter
export const COLUMN_WIDTH = 152;
export const LABEL_HEIGHT = 34;
export const TOP_PADDING = 26;

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stable per-category seed so a vine's wiggle never changes between loads.
export function seedFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
}

export function vineHeight(completedCount: number): number {
  return 86 + Math.max(0, completedCount) * 2.55;
}

// Horizontal hatch lines inside a pod, mimicking pen shading.
export function podHatch(x: number, y: number, r: number): string {
  const lines: string[] = [];
  for (let i = -2; i <= 2; i++) {
    const off = (i / 3) * r;
    const half = Math.sqrt(Math.max(0, r * r - off * off));
    lines.push(`M${(x - half).toFixed(1)},${(y + off).toFixed(1)} L${(x + half).toFixed(1)},${(y + off).toFixed(1)}`);
  }
  return lines.join(" ");
}

export function buildVine(completedCount: number, cx: number, baseY: number, seed: number): VineGeometry {
  const count = Math.max(0, completedCount);
  const rnd = mulberry32(seed);
  const height = vineHeight(count);

  const segments = 150;
  const amplitude = 17;
  const frequency = 1.5 + Math.min(1.2, count / 90);
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = baseY - t * height;
    // Wiggle widens as the vine climbs, so the base stays planted-looking.
    const x = cx + Math.sin(t * Math.PI * frequency + 0.5) * amplitude * (0.35 + 0.65 * t);
    points.push([x, y]);
  }

  const stem = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const stemHighlight = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(p[0] + 1.5).toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");

  const pointAt = (t: number) => points[Math.max(0, Math.min(segments, Math.round(t * segments)))];

  const podCount = count > 0 ? Math.min(MAX_PODS, Math.max(1, Math.floor(count / TASKS_PER_POD))) : 0;
  const pods: VinePod[] = [];
  const branches: string[] = [];
  for (let i = 0; i < podCount; i++) {
    const t = 0.12 + ((i + 0.5) / (podCount + 0.5)) * 0.84;
    const [sx, sy] = pointAt(t);
    const side = i % 2 === 0 ? -1 : 1;
    const branchLength = 15 + rnd() * 12;
    const rise = 7 + rnd() * 11;
    const ex = sx + side * branchLength;
    const ey = sy - rise;
    branches.push(
      `M${sx.toFixed(1)},${sy.toFixed(1)} Q${(sx + side * branchLength * 0.45).toFixed(1)},${(sy - rise * 0.15).toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`
    );
    const r = 5.5 + rnd() * 3.5;
    pods.push({ x: ex + side * r * 0.7, y: ey - r * 0.5, r });
  }

  const leaves: string[] = [];
  const leafCount = Math.min(10, 2 + Math.floor(count / 9));
  for (let i = 0; i < leafCount; i++) {
    const t = 0.1 + ((i + 0.5) / leafCount) * 0.82;
    const [sx, sy] = pointAt(t);
    const side = i % 2 === 0 ? 1 : -1;
    const L = 11 + rnd() * 6;
    leaves.push(
      `M${sx.toFixed(1)},${sy.toFixed(1)} C${(sx + side * L * 0.6).toFixed(1)},${(sy - L * 0.5).toFixed(1)} ${(sx + side * L).toFixed(1)},${(sy - L * 0.2).toFixed(1)} ${(sx + side * L * 0.9).toFixed(1)},${(sy + L * 0.25).toFixed(1)} C${(sx + side * L * 0.5).toFixed(1)},${(sy + L * 0.2).toFixed(1)} ${(sx + side * L * 0.2).toFixed(1)},${(sy + L * 0.1).toFixed(1)} ${sx.toFixed(1)},${sy.toFixed(1)} Z`
    );
  }

  const tip = points[segments];
  const bud = `M${tip[0].toFixed(1)},${tip[1].toFixed(1)} C${(tip[0] - 6).toFixed(1)},${(tip[1] - 9).toFixed(1)} ${(tip[0] - 3.5).toFixed(1)},${(tip[1] - 17).toFixed(1)} ${tip[0].toFixed(1)},${(tip[1] - 19).toFixed(1)} C${(tip[0] + 4.5).toFixed(1)},${(tip[1] - 17).toFixed(1)} ${(tip[0] + 6).toFixed(1)},${(tip[1] - 9).toFixed(1)} ${tip[0].toFixed(1)},${tip[1].toFixed(1)} Z`;

  return { stem, stemHighlight, branches, leaves, pods, bud, height };
}
