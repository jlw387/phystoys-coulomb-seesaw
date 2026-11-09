export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];
/** q1 = +positive at x = L/2; q2 = sign2 * negative at x = -L/2 (sign2 defaults to -1, an opposite pair). */
export interface Parameters { positive: number; negative: number; separation: number; sign2?: 1 | -1 }
export interface Geometry extends Parameters {
  sign2: 1 | -1;
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
    ...p, sign2: p.sign2 ?? -1, d1, d2, radius, origin: p.separation / 2 - d1,
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
    potential: g.positive / r1 + g.sign2 * g.negative / r2,
    field: p.map((v, i) => g.positive * (v - g.plus[i]) / r1 ** 3 +
      g.sign2 * g.negative * (v - g.minus[i]) / r2 ** 3) as Vec3,
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
  // Both lifted charges have strength `amplitude` on the sphere; only the sign of the second one varies.
  const spherePotential = 1 / c1 + g.sign2 / c2;
  // Differentiate the lift and the conformal weight, not just the pole function.
  const field = u.map((uj, j) => {
    let derivative = 0;
    for (let i = 0; i < 4; i++) {
      const jacobian = i === 3 ? 4 * uj / D ** 2 :
        2 * Number(i === j) / D - 4 * u[i] * uj / D ** 2;
      derivative += jacobian * (-(X[i] - g.polePlus[i]) / c1 ** 3 -
        g.sign2 * (X[i] - g.poleMinus[i]) / c2 ** 3);
    }
    return -g.amplitude / g.radius *
      (-uj * weight ** 3 * spherePotential + weight * derivative);
  }) as Vec3;
  return { potential: g.amplitude * weight * spherePotential, field, weight, spherePotential, X };
}

export function flux(p: Vec3, g: Geometry): number {
  const [r1, r2] = radii(p, g);
  return g.positive * (p[0] - g.plus[0]) / r1 + g.sign2 * g.negative * (p[0] - g.minus[0]) / r2;
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
  let previous: Vec3 | undefined;
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
    // A reversal means the line has run into a null point (e.g. between like charges).
    if (previous && k1.reduce((s, v, j) => s + v * previous![j], 0) < -0.5) return { points, end: "null" };
    previous = k1;
    const k2 = tangent(shift(p, k1, 0.5));
    if (!k2) return { points, end: "null" };
    const k3 = tangent(shift(p, k2, 0.5));
    if (!k3) return { points, end: "null" };
    const k4 = tangent(shift(p, k3, 1));
    if (!k4) return { points, end: "null" };
    const k = k1.map((v, j) => (v + 2 * k2[j] + 2 * k3[j] + k4[j]) / 6);
    // Stages disagreeing means the step straddles a null point.
    if (k.reduce((s, v, j) => s + v * k1[j], 0) < 0.5) return { points, end: "null" };
    points.push(p.map((v, j) => v + step * k[j]) as Vec3);
  }
  return { points, end: "limit" };
}

export function fieldLines(g: Geometry, count: number, model: FieldModel): Trace[] {
  return lineSeeds(g, count).map(seed => traceField(seed.point, seed.direction, g, model));
}

/** A seed point and whether to follow the field (+1, from a positive charge) or run against it (-1). */
export interface Seed { point: Vec3; direction: 1 | -1 }

/**
 * Equal-flux seed points (uniform in cos theta, so each line in a half-plane carries the same
 * axisymmetric 3D flux).
 * - Opposite pair: seeds only around the stronger charge (positive when equal). Every line of the
 *   weaker charge connects to the stronger one, so it receives |q_weak|/|q_strong| of them and the
 *   rest escape.
 * - Like pair: no line connects the charges, so both emit, with counts proportional to charge.
 */
export function lineSeeds(g: Geometry, count: number): Seed[] {
  const ring = (center: Vec3, q: number, n: number, direction: 1 | -1): Seed[] => {
    const r = chargeRadius(q, g.separation) * 1.015;
    const seeds: Seed[] = [];
    for (let i = 0; i < n; i++) {
      const theta = Math.acos(1 - 2 * (i + 0.5) / n);
      for (const side of [-1, 1]) {
        seeds.push({ point: [center[0] + r * Math.cos(theta), side * r * Math.sin(theta), 0], direction });
      }
    }
    return seeds;
  };
  if (g.sign2 > 0) {
    const strongest = Math.max(g.positive, g.negative);
    return [
      ...ring(g.plus, g.positive, Math.max(1, Math.round(count * g.positive / strongest)), 1),
      ...ring(g.minus, g.negative, Math.max(1, Math.round(count * g.negative / strongest)), 1),
    ];
  }
  return g.positive >= g.negative ? ring(g.plus, g.positive, count, 1) : ring(g.minus, g.negative, count, -1);
}

export const NORTH: Vec4 = [0, 0, 0, 1];

/** Physical point -> unit S3 point over the fulcrum sphere. */
export function toSphere(p: Vec3, g: Geometry): Vec4 {
  return lift([(p[0] - g.origin) / g.radius, p[1] / g.radius, p[2] / g.radius]);
}

/** Unit S3 point -> physical point (stereographic projection from NORTH). */
export function fromSphere(X: Vec4, g: Geometry): Vec3 {
  const s = g.radius / (1 - X[3]);
  return [g.origin + s * X[0], s * X[1], s * X[2]];
}

/**
 * Direction of the tangential gradient of G_t = w^t F on the unit sphere, with F = 1/c1 + sign2/c2 and
 * w = |X - N| / 2. The positive factor w^t is divided out, which leaves the direction unchanged and
 * keeps it finite at N. t = 0 gives the longitudes of F; t = 1 gives the physical weighting.
 */
export function sphereGradient(X: Vec4, g: Geometry, t: number): Vec4 {
  const a = X.map((v, i) => v - g.polePlus[i]);
  const b = X.map((v, i) => v - g.poleMinus[i]);
  const n = X.map((v, i) => v - NORTH[i]);
  const ca = norm(a), cb = norm(b), cn = norm(n);
  const F = 1 / ca + g.sign2 / cb;
  // t * F * grad(w) / w, with grad(w) = n / (2 cn) and w = cn / 2.
  const out = X.map((_, i) => -a[i] / ca ** 3 - g.sign2 * b[i] / cb ** 3 + t * F * n[i] / cn ** 2);
  const radial = out.reduce((s, v, i) => s + v * X[i], 0);
  return out.map((v, i) => v - radial * X[i]) as Vec4;
}

/**
 * Steepest-descent curves of G_t traced on the sphere itself, from the same equal-flux seeds as
 * fieldLines. At t = 1 they project exactly onto the real field lines.
 */
export interface SphereTrace { points: Vec4[]; end: Trace["end"] }

export function sphereLines(g: Geometry, count: number, t: number): SphereTrace[] {
  // A line ends on whichever pole it did not start from, using the lifted size of that charge.
  const poles = [
    { pole: g.polePlus, hit: distance(toSphere([g.plus[0] - chargeRadius(g.positive, g.separation), 0, 0], g), g.polePlus) },
    { pole: g.poleMinus, hit: distance(toSphere([g.minus[0] + chargeRadius(g.negative, g.separation), 0, 0], g), g.poleMinus) },
  ];
  // Same far cut-off as the physical tracer: lifted points at ESCAPE_RADIUS separations from the origin.
  const hitNorth = 2 / Math.sqrt(1 + (ESCAPE_RADIUS * g.separation / g.radius) ** 2);
  const h = 0.004;
  return lineSeeds(g, count).map(seed => {
    let X = toSphere(seed.point, g);
    const own = distance(X, g.polePlus) < distance(X, g.poleMinus) ? 0 : 1;
    const { pole: target, hit: hitTarget } = poles[1 - own];
    // Following the field means descending G.
    const sign = -seed.direction;
    let previous: Vec4 | undefined;
    const points: Vec4[] = [X];
    const tangent = (Y: Vec4): Vec4 | undefined => {
      const d = sphereGradient(Y, g, t);
      const m = norm(d);
      return m < 1e-12 ? undefined : d.map(v => sign * v / m) as Vec4;
    };
    const shift = (Y: Vec4, k: Vec4, f: number) => Y.map((v, i) => v + h * f * k[i]) as Vec4;
    for (let i = 0; i < 4000; i++) {
      if (distance(X, target) < hitTarget) return { points, end: "charge" as const };
      if (distance(X, NORTH) < hitNorth) return { points, end: "escape" as const };
      const k1 = tangent(X); if (!k1) return { points, end: "null" as const };
      if (previous && k1.reduce((s, v, j) => s + v * previous![j], 0) < -0.5) return { points, end: "null" as const };
      previous = k1;
      const k2 = tangent(shift(X, k1, 0.5)); if (!k2) return { points, end: "null" as const };
      const k3 = tangent(shift(X, k2, 0.5)); if (!k3) return { points, end: "null" as const };
      const k4 = tangent(shift(X, k3, 1)); if (!k4) return { points, end: "null" as const };
      const k = k1.map((v, j) => (v + 2 * k2[j] + 2 * k3[j] + k4[j]) / 6);
      if (k.reduce((s, v, j) => s + v * k1[j], 0) < 0.5) return { points, end: "null" as const };
      const next = X.map((v, j) => v + h * k[j]);
      const m = norm(next);
      X = next.map(v => v / m) as Vec4;
      points.push(X);
    }
    return { points, end: "limit" as const };
  });
}

export function escapeFraction(g: Geometry): number {
  if (g.sign2 > 0) return 1;
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
