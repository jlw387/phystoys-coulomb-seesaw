import { test } from "node:test";
import assert from "node:assert/strict";
import { geometry, lift, norm, distance, coulomb, projected, verification, flux, traceField, fieldLines, chargeRadius } from "./physics";

test("seesaw, full 3D potential, and analytic weighted gradient across the UI range", () => {
  for (const positive of [0.25, 1, 2, 4]) {
    for (const negative of [0.25, 1, 3, 4]) {
      for (const separation of [0.5, 2, 6]) {
        const g = geometry({ positive, negative, separation });
        assert.ok(Math.abs(g.d1 / g.d2 - (positive / negative) ** 2) < 1e-12);
        assert.ok(Math.abs(g.d1 * g.d2 - g.radius ** 2) < 1e-12);
        assert.ok(verification(g).passed, JSON.stringify({ positive, negative, separation, ...verification(g) }));
      }
    }
  }
});

test("lift is on unit S3 and obeys the stereographic chord identity", () => {
  const p: [number, number, number] = [1.2, -0.8, 2.1];
  const q: [number, number, number] = [-0.3, 1.4, 0.2];
  assert.ok(Math.abs(norm(lift(p)) - 1) < 1e-14);
  assert.ok(Math.abs(distance(p, q) -
    distance(lift(p), lift(q)) * Math.sqrt((1 + norm(p) ** 2) * (1 + norm(q) ** 2)) / 2) < 1e-14);
});

test("weighted field is minus the potential gradient, including weight derivative", () => {
  const g = geometry({ positive: 2, negative: 0.5, separation: 3 });
  const p: [number, number, number] = [0.4, 0.7, -0.6];
  const h = 1e-5;
  for (let i = 0; i < 3; i++) {
    const left = [...p] as typeof p;
    const right = [...p] as typeof p;
    left[i] -= h;
    right[i] += h;
    const finiteDifference = -(projected(right, g).potential - projected(left, g).potential) / (2 * h);
    assert.ok(Math.abs(finiteDifference - projected(p, g).field[i]) < 1e-8);
  }
});

test("unweighted construction fails while equal-charge 90 degree crossing is sqrt(3) a", () => {
  const g = geometry({ positive: 1, negative: 1, separation: 2 });
  assert.ok(verification(g).unweightedError > 0.1);
  assert.ok(Math.abs(flux([0, Math.sqrt(3), 0], g) + 1) < 1e-14);
  assert.ok(Math.abs(flux([0, 1, 0], g) + 1) > 0.4);
});

test("RK4 weighted field lines preserve the Coulomb flux invariant", () => {
  for (const [positive, negative] of [[1, 1], [3, 1], [1, 3]]) {
    const g = geometry({ positive, negative, separation: 2 });
    const line = traceField([1, 0.2, 0], 1, g, "weighted");
    const f0 = flux(line.points[0], g);
    assert.ok(line.end !== "limit");
    for (const p of line.points) assert.ok(Math.abs(flux(p, g) - f0) < 2e-5);
  }
});

test("rendered trajectories terminate at a charge or plotting boundary and agree for both models", () => {
  for (const [positive, negative] of [[1, 1], [4, 0.25], [0.25, 4], [2, 1], [1, 3]]) {
    const g = geometry({ positive, negative, separation: 2 });
    const weighted = fieldLines(g, 8, "weighted");
    const direct = fieldLines(g, 8, "coulomb");
    assert.equal(weighted.length, direct.length);
    for (let i = 0; i < weighted.length; i++) {
      assert.ok(["charge", "boundary"].includes(weighted[i].end), `${positive}:${negative} trace ${i}: ${weighted[i].end}`);
      assert.equal(weighted[i].end, direct[i].end);
      assert.equal(weighted[i].points.length, direct[i].points.length);
      for (let j = 0; j < weighted[i].points.length; j += 20) {
        assert.ok(distance(weighted[i].points[j], direct[i].points[j]) < 1e-8);
      }
    }
    assert.ok(weighted.some(line => line.end === "boundary"));
  }
});

test("charge volume scales with magnitude and cancellation near zero potential remains accurate", () => {
  assert.ok(Math.abs((chargeRadius(4, 2) / chargeRadius(0.25, 2)) ** 3 - 16) < 1e-12);
  for (const [positive, negative] of [[1, 1], [4, 0.25], [0.25, 4]]) {
    const g = geometry({ positive, negative, separation: 2 });
    const p: [number, number, number] = [(negative - positive) / (positive + negative), 0, 0];
    assert.ok(Math.abs(projected(p, g).potential - coulomb(p, g).potential) < 1e-12);
  }
});

test("off-plane rule: any sphere and charges, q = R s / c_N, V = w * sum s/c", () => {
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
  const N = [0, 0, 0, 1];
  for (let trial = 0; trial < 40; trial++) {
    const O: [number, number, number] = [3 * rand(), 3 * rand(), 3 * rand()];
    const R = Math.exp(rand());
    const charges = Array.from({ length: 1 + (trial % 4) }, () => ({
      p: [3 * rand(), 3 * rand(), 3 * rand()] as [number, number, number], q: 4 * rand() }));
    const toU = (p: number[]) => p.map((v, i) => (v - O[i]) / R) as [number, number, number];
    const sphere = charges.map(({ p, q }) => {
      const Q = lift(toU(p));
      return { Q, s: q * distance(Q, N) / R };
    });
    for (let k = 0; k < 30; k++) {
      const x: [number, number, number] = [4 * rand(), 4 * rand(), 4 * rand()];
      const u = toU(x);
      const w = 1 / Math.sqrt(1 + norm(u) ** 2);
      const X = lift(u);
      const V = charges.reduce((sum, { p, q }) => sum + q / distance(x, p), 0);
      const F = sphere.reduce((sum, { Q, s }) => sum + s / distance(X, Q), 0);
      assert.ok(Math.abs(V - w * F) <= 1e-9 * Math.max(1, Math.abs(V)));
    }
  }
  const g = geometry({ positive: 2, negative: 1, separation: 2 });
  const s1 = g.positive * distance(g.polePlus, N) / g.radius;
  const s2 = g.negative * distance(g.poleMinus, N) / g.radius;
  assert.ok(Math.abs(s1 - g.amplitude) < 1e-12 && Math.abs(s2 - g.amplitude) < 1e-12);
});

test("invalid inputs and charge singularities are explicit errors", () => {
  for (const positive of [0, -1, NaN, Infinity]) {
    assert.throws(() => geometry({ positive, negative: 1, separation: 2 }), RangeError);
  }
  const g = geometry({ positive: 1, negative: 1, separation: 2 });
  assert.throws(() => coulomb(g.plus, g), RangeError);
  assert.throws(() => projected(g.minus, g), RangeError);
  assert.equal(coulomb([0, 0, 0], g).potential, 0);
});
