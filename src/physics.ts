export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];
export interface Parameters { positive: number; negative: number; separation: number }
export interface Geometry extends Parameters {
  origin: number;
  radius: number;
  d1: number;
  d2: number;
  amplitude: number;
  plus: Vec3;
  minus: Vec3;
  polePlus: Vec4;
  poleMinus: Vec4;
}

export const norm = (v: readonly number[]) => Math.hypot(...v);
export const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(...a.map((v, i) => v - b[i]));

export function lift(u: Vec3): Vec4 {
  const s = u.reduce((sum, v) => sum + v * v, 0);
  return [2 * u[0] / (1 + s), 2 * u[1] / (1 + s), 2 * u[2] / (1 + s), (s - 1) / (s + 1)];
}

export function geometry(p: Parameters): Geometry {
  if (![p.positive, p.negative, p.separation].every(v => Number.isFinite(v) && v > 0)) {
    throw new RangeError("Both charge magnitudes and separation must be finite and positive.");
  }
  const sum = p.positive ** 2 + p.negative ** 2;
  const d1 = p.separation * p.positive ** 2 / sum;
  const d2 = p.separation * p.negative ** 2 / sum;
  const radius = p.separation * p.positive * p.negative / sum;
  return {
    ...p, d1, d2, radius, origin: p.separation / 2 - d1,
    amplitude: 2 * Math.sqrt(sum) / p.separation,
    plus: [p.separation / 2, 0, 0],
    minus: [-p.separation / 2, 0, 0],
    polePlus: lift([d1 / radius, 0, 0]),
    poleMinus: lift([-d2 / radius, 0, 0]),
  };
}

function radii(p: Vec3, g: Geometry): [number, number] {
  const r1 = distance(p, g.plus);
  const r2 = distance(p, g.minus);
  if (r1 === 0 || r2 === 0) throw new RangeError("Point-charge potential is singular at a charge.");
  return [r1, r2];
}

export function coulomb(p: Vec3, g: Geometry): { potential: number; field: Vec3 } {
  const [r1, r2] = radii(p, g);
  return {
    potential: g.positive / r1 - g.negative / r2,
    field: p.map((v, i) => g.positive * (v - g.plus[i]) / r1 ** 3 -
      g.negative * (v - g.minus[i]) / r2 ** 3) as Vec3,
  };
}

export function projected(p: Vec3, g: Geometry) {
  radii(p, g);
  const u: Vec3 = [(p[0] - g.origin) / g.radius, p[1] / g.radius, p[2] / g.radius];
  const D = 1 + u.reduce((sum, v) => sum + v * v, 0);
  const X = lift(u);
  const c1 = distance(X, g.polePlus);
  const c2 = distance(X, g.poleMinus);
  const weight = 1 / Math.sqrt(D);
  const spherePotential = 1 / c1 - 1 / c2;
  // Differentiate the lift and the conformal weight, not just the pole function.
  const field = u.map((uj, j) => {
    let derivative = 0;
    for (let i = 0; i < 4; i++) {
      const jacobian = i === 3 ? 4 * uj / D ** 2 :
        2 * Number(i === j) / D - 4 * u[i] * uj / D ** 2;
      derivative += jacobian * (-(X[i] - g.polePlus[i]) / c1 ** 3 +
        (X[i] - g.poleMinus[i]) / c2 ** 3);
    }
    return -g.amplitude / g.radius *
      (-uj * weight ** 3 * spherePotential + weight * derivative);
  }) as Vec3;
  return { potential: g.amplitude * weight * spherePotential, field, weight, spherePotential, X };
}

export function flux(p: Vec3, g: Geometry): number {
  const [r1, r2] = radii(p, g);
  return g.positive * (p[0] - g.plus[0]) / r1 - g.negative * (p[0] - g.minus[0]) / r2;
}

export function chargeRadius(q: number, separation: number): number {
  return 0.065 * separation * Math.cbrt(q);
}

export type FieldModel = "weighted" | "coulomb";
export interface Trace { points: Vec3[]; end: "charge" | "escape" | "limit" | "null" }

// Escaping lines are followed this many separations out, far enough that their lift lies next to N.
export const ESCAPE_RADIUS = 200;

export function traceField(seed: Vec3, direction: 1 | -1, g: Geometry, model: FieldModel): Trace {
  const base = g.separation * 0.013;
  let step = base;
  const points: Vec3[] = [seed];
  const field = model === "weighted" ? projected : coulomb;
  const tangent = (p: Vec3): Vec3 | undefined => {
    const e = field(p, g).field;
    const n = norm(e);
    return n < 1e-12 / g.separation ** 2 ? undefined :
      e.map(v => direction * v / n) as Vec3;
  };
  const shift = (p: Vec3, v: Vec3, factor: number) => p.map((x, i) => x + step * factor * v[i]) as Vec3;
  for (let i = 0; i < 6000; i++) {
    const p = points[points.length - 1];
    if (i > 0 && (distance(p, g.plus) < chargeRadius(g.positive, g.separation) ||
      distance(p, g.minus) < chargeRadius(g.negative, g.separation))) return { points, end: "charge" };
    const r = norm(p);
    if (r > ESCAPE_RADIUS * g.separation) return { points, end: "escape" };
    // Steps grow with distance so far-out loops and escapes stay cheap.
    step = base * Math.max(1, r / (2 * g.separation));
    const k1 = tangent(p);
    if (!k1) return { points, end: "null" };
    const k2 = tangent(shift(p, k1, 0.5));
    if (!k2) return { points, end: "null" };
    const k3 = tangent(shift(p, k2, 0.5));
    if (!k3) return { points, end: "null" };
    const k4 = tangent(shift(p, k3, 1));
    if (!k4) return { points, end: "null" };
    points.push(p.map((v, j) => v + step * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) / 6) as Vec3);
  }
  return { points, end: "limit" };
}

/**
 * Equal-flux lines seeded only from the stronger charge (positive when equal). Every line of the
 * weaker charge connects to the stronger one, so its share of lines is automatically
 * |q_weak| / |q_strong|, and the remaining fraction 1 - |q_weak| / |q_strong| escapes to infinity.
 */
export function fieldLines(g: Geometry, count: number, model: FieldModel): Trace[] {
  const fromPositive = g.positive >= g.negative;
  const q = fromPositive ? g.positive : g.negative;
  const center = fromPositive ? g.plus : g.minus;
  const r = chargeRadius(q, g.separation) * 1.015;
  const traces: Trace[] = [];
  for (let i = 0; i < count; i++) {
    // Uniform in cos(theta): each line in a half-plane carries the same axisymmetric 3D flux.
    const theta = Math.acos(1 - 2 * (i + 0.5) / count);
    for (const side of [-1, 1]) {
      traces.push(traceField([center[0] + r * Math.cos(theta), side * r * Math.sin(theta), 0],
        fromPositive ? 1 : -1, g, model));
    }
  }
  return traces;
}

export function escapeFraction(g: Geometry): number {
  return 1 - Math.min(g.positive, g.negative) / Math.max(g.positive, g.negative);
}

export function verification(g: Geometry) {
  let potentialError = 0;
  let fieldError = 0;
  let unweightedError = 0;
  let count = 0;
  // Three nonzero coordinates exercise the full R^3 -> S^3 map.
  for (let i = 0; i < 180; i++) {
    const p: Vec3 = [
      g.separation * (2.3 * Math.sin(i * 2.399) + 0.07),
      g.separation * (1.7 * Math.cos(i * 1.137) + 0.13),
      g.separation * (1.3 * Math.sin(i * 0.731) + 0.19),
    ];
    const exact = coulomb(p, g);
    const test = projected(p, g);
    const potentialScale = (g.positive + g.negative) / g.separation;
    const fieldScale = potentialScale / g.separation;
    potentialError = Math.max(potentialError, Math.abs(test.potential - exact.potential) /
      Math.max(Math.abs(exact.potential), potentialScale * 1e-8));
    fieldError = Math.max(fieldError, distance(test.field, exact.field) /
      Math.max(norm(exact.field), fieldScale * 1e-8));
    unweightedError = Math.max(unweightedError,
      Math.abs(g.amplitude * test.spherePotential - exact.potential) / potentialScale);
    count++;
  }
  const antipodalError = norm(g.polePlus.map((v, i) => v + g.poleMinus[i]));
  return { potentialError, fieldError, unweightedError, antipodalError, count,
    passed: potentialError < 1e-8 && fieldError < 1e-8 && antipodalError < 1e-12 };
}
