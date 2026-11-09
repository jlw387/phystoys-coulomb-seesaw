import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { chargeRadius, coulomb, distance, fromSphere, lift, NORTH, type Geometry, type SphereTrace, type Trace, type Vec3 } from "./physics";

const colors = { positive: 0xff796a, negative: 0x6daaff, mint: 0x89e2c3, muted: 0x596a80, ray: 0xe7c78a };
type Label = { element: HTMLDivElement; point: THREE.Vector3 };
type Camera = THREE.PerspectiveCamera | THREE.OrthographicCamera;

export class Viewport {
  readonly scene = new THREE.Scene();
  readonly content = new THREE.Group();
  readonly renderer: THREE.WebGLRenderer;
  camera: Camera;
  controls: OrbitControls;
  private labels: Label[] = [];
  private observer: ResizeObserver;
  private span = 4;
  private width = 1;
  private height = 1;
  private target = new THREE.Vector3();
  private flat = false;
  private kind: "construction" | "physical";

  constructor(private host: HTMLElement, kind: "construction" | "physical") {
    this.kind = kind;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x101823, 1);
    this.renderer.domElement.setAttribute("aria-label", kind === "construction" ?
      "Interactive stereographic sphere construction" : "Interactive 3D electric field and cross-section");
    this.renderer.domElement.setAttribute("role", "img");
    this.host.append(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
    this.controls = this.makeControls();
    this.scene.add(this.content);
    this.scene.add(new THREE.AmbientLight(0xdce9ff, 2));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(3, 5, 6);
    this.scene.add(key);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.renderer.domElement.addEventListener("webglcontextlost", event => {
      event.preventDefault();
      const error = document.getElementById("error");
      if (error) {
        error.hidden = false;
        error.textContent = "The graphics context was lost. Reload the page to restore both views.";
      }
    });
  }

  private makeControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableRotate = !this.flat;
    controls.enableDamping = false;
    controls.minDistance = 0.3;
    controls.maxDistance = 150;
    controls.addEventListener("change", () => this.render());
    return controls;
  }

  frame(span: number, target = new THREE.Vector3()) {
    this.span = span;
    this.target.copy(target);
    this.reset();
  }

  setFlat(flat: boolean) {
    if (flat === this.flat) return;
    this.flat = flat;
    this.controls.dispose();
    this.camera = flat ? new THREE.OrthographicCamera() : new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
    this.controls = this.makeControls();
    this.reset();
  }

  reset() {
    const direction = this.flat ? new THREE.Vector3(0, 0, 1) :
      this.kind === "construction" ? new THREE.Vector3(0.35, 0.65, 1.8).normalize() :
        new THREE.Vector3(0.45, 0.7, 1.6).normalize();
    // Narrow (portrait) panels need the camera further back to fit the same horizontal span.
    const aspect = Math.max(1, this.host.clientWidth) / Math.max(1, this.host.clientHeight);
    this.camera.position.copy(this.target).addScaledVector(direction, this.span * 2.15 / Math.min(1, aspect));
    this.camera.up.set(0, 1, 0);
    this.controls.target.copy(this.target);
    this.camera.lookAt(this.target);
    this.controls.update();
    this.resize();
  }

  clear() {
    this.content.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if ("map" in material && material.map instanceof THREE.Texture) material.map.dispose();
          material.dispose();
        }
      }
    });
    this.content.clear();
    for (const label of this.labels) label.element.remove();
    this.labels = [];
  }

  label(text: string, point: Vec3, color = "#c8d3e2") {
    const element = document.createElement("div");
    element.className = "scene-label";
    element.textContent = text;
    element.style.color = color;
    this.host.append(element);
    this.labels.push({ element, point: new THREE.Vector3(...point) });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    for (const { element, point } of this.labels) {
      const projected = point.clone().project(this.camera);
      element.hidden = projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1;
      element.style.left = `${(projected.x + 1) * this.width / 2}px`;
      element.style.top = `${(1 - projected.y) * this.height / 2}px`;
    }
  }

  private resize() {
    this.width = Math.max(1, this.host.clientWidth);
    this.height = Math.max(1, this.host.clientHeight);
    const aspect = this.width / this.height;
    if (this.camera instanceof THREE.PerspectiveCamera) this.camera.aspect = aspect;
    else {
      this.camera.left = -this.span * Math.max(aspect, 1);
        this.camera.right = this.span * Math.max(aspect, 1);
        this.camera.top = this.span * Math.max(1, 1 / aspect);
        this.camera.bottom = -this.span * Math.max(1, 1 / aspect);
      this.camera.near = 0.001;
      this.camera.far = 1000;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
    this.render();
  }

  dispose() {
    this.observer.disconnect();
    this.controls.dispose();
    this.clear();
    this.renderer.dispose();
  }
}

function line(parent: THREE.Group, points: Vec3[], color: number, opacity = 1, dashed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
  const material = dashed ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.06, gapSize: 0.035 }) :
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  const mesh = new THREE.Line(geometry, material);
  if (dashed) mesh.computeLineDistances();
  parent.add(mesh);
}

function sphere(parent: THREE.Group, center: Vec3, radius: number, color: number, opacity = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.18, transparent: opacity < 1, opacity,
      depthWrite: opacity === 1 }));
  mesh.position.set(...center);
  parent.add(mesh);
  return mesh;
}

function arrow(parent: THREE.Group, point: Vec3, direction: Vec3, size: number, color: number) {
  const axis = new THREE.Vector3(...direction).normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(size * 0.3, size, 7),
    new THREE.MeshBasicMaterial({ color }));
  cone.position.set(...point);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  parent.add(cone);
}

function charges(view: Viewport, g: Geometry, construction = false) {
  // The construction view is zoomed in, so the illustrative charge spheres are drawn smaller there.
  const scale = construction ? 0.55 : 1;
  for (const [q, p, color, sign] of [
    [g.positive, g.plus, colors.positive, "+"] as const,
    [g.negative, g.minus, secondColor(g), g.sign2 > 0 ? "+" : "-"] as const,
  ]) {
    sphere(view.content, p, scale * chargeRadius(q, g.separation), color);
    view.label(`${sign}${q.toFixed(2)}`, [p[0], -g.separation * 0.13, 0],
      sign === "+" ? "#ff9a8f" : "#8ebdff");
  }
  if (construction) {
    line(view.content, [g.minus, g.plus], 0xc3cfde);
    const triangle = new THREE.Mesh(new THREE.ConeGeometry(0.045 * g.separation, 0.1 * g.separation, 3),
      new THREE.MeshStandardMaterial({ color: colors.mint, roughness: 0.6 }));
    triangle.position.set(g.origin, -0.07 * g.separation, 0);
    view.content.add(triangle);
    view.label("O / fulcrum", [g.origin, -0.2 * g.separation, 0], "#89e2c3");
  }
}

const escapeColor = 0xb69cff;
const secondColor = (g: Geometry) => g.sign2 > 0 ? colors.positive : colors.negative;
const longitudeColor = 0xa9b9cc;

function traceColor(trace: Trace) {
  return trace.end === "escape" ? escapeColor : colors.mint;
}

/** Split a polyline into the pieces that lie inside the square |x|, |y| <= half. */
function clip(points: Vec3[], half: number): Vec3[][] {
  const pieces: Vec3[][] = [];
  let current: Vec3[] = [];
  for (const p of points) {
    if (Math.abs(p[0]) <= half && Math.abs(p[1]) <= half) current.push(p);
    else if (current.length) { if (current.length > 1) pieces.push(current); current = []; }
  }
  if (current.length > 1) pieces.push(current);
  return pieces;
}

export interface ConstructionOptions { lines: boolean; longitudes: boolean; rays: boolean; probe: boolean }
export interface ConstructionLines { weighted: SphereTrace[]; longitudes: SphereTrace[] }

export function drawConstruction(view: Viewport, g: Geometry, probe: Vec3, sets: ConstructionLines, options: ConstructionOptions) {
  view.clear();
  const R = g.radius;
  const O = g.origin;
  // Scene axes: x = charge axis, z = physical y, vertical = the extra (fourth) coordinate.
  const extra = (X: readonly number[]): Vec3 => [O + R * X[0], R * X[3], R * X[1]];
  const toSphere = (p: Vec3) => extra(lift([(p[0] - O) / R, p[1] / R, 0]));
  const onPlane = (p: Vec3): Vec3 => [p[0], 0, p[1]];
  const N: Vec3 = [O, R, 0];
  const half = 2 * g.separation;

  sphere(view.content, [O, 0, 0], R, 0x426a91, 0.07);
  const equator: Vec3[] = [];
  const meridian: Vec3[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120 * 2 * Math.PI;
    equator.push([O + R * Math.cos(t), 0, R * Math.sin(t)]);
    meridian.push([O + R * Math.cos(t), R * Math.sin(t), 0]);
  }
  line(view.content, equator, colors.muted, 0.55);
  line(view.content, meridian, colors.muted, 0.35);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2 * half, 2 * half),
    new THREE.MeshBasicMaterial({ color: 0x6281a2, side: THREE.DoubleSide, transparent: true, opacity: 0.05, depthWrite: false }));
  plane.rotation.x = -Math.PI / 2;
  view.content.add(plane);

  // Curves are drawn on the sphere only; the physical view shows their projections.
  const drawSet = (set: SphereTrace[], styled: (trace: SphereTrace) => [number, number]) => {
    for (const trace of set) {
      const [color, opacity] = styled(trace);
      const first = trace.points[0];
      const source = distance(first, g.polePlus) < distance(first, g.poleMinus) ? g.polePlus : g.poleMinus;
      const sink = source === g.polePlus ? g.poleMinus : g.polePlus;
      // Close each curve onto its poles (or N) so the sphere curves meet exactly at the lifted charges.
      const closing = trace.end === "charge" ? [sink] : trace.end === "escape" ? [NORTH] : [];
      line(view.content, [source, ...trace.points, ...closing].map(extra), color, opacity);
    }
  };
  if (g.sign2 > 0) {
    // Like charges: F = 1/c1 + 1/c2 is smallest on the equator between the poles, where unweighted lines stall.
    const A4 = g.polePlus;
    const m = Math.hypot(A4[0], A4[3]);
    const ring: Vec3[] = [];
    for (let i = 0; i <= 120; i++) {
      const a = i / 120 * 2 * Math.PI;
      ring.push(extra([-A4[3] / m * Math.cos(a), Math.sin(a), 0, A4[0] / m * Math.cos(a)]));
    }
    line(view.content, ring, 0xe9eef5, 0.55, true);
  }
  if (options.longitudes) drawSet(sets.longitudes, () => [longitudeColor, 0.5]);
  if (options.lines) drawSet(sets.weighted, trace => [trace.end === "escape" ? escapeColor : colors.mint, 0.95]);

  const A = extra(g.polePlus);
  const B = extra(g.poleMinus);
  rod(view.content, A, B, g.separation * 0.006, 0xdfe8f3);
  sphere(view.content, A, 0.022 * g.separation, colors.positive);
  sphere(view.content, B, 0.022 * g.separation, secondColor(g));
  if (options.rays) {
    line(view.content, [N, A, g.plus], colors.positive, 0.6, true);
    line(view.content, [N, B, g.minus], secondColor(g), 0.6, true);
  }
  if (options.probe) {
    const X = toSphere(probe);
    const sample = onPlane(probe);
    line(view.content, [N, X, sample], colors.ray, 0.85, true);
    sphere(view.content, X, 0.018 * g.separation, colors.ray);
    sphere(view.content, sample, 0.018 * g.separation, colors.ray);
    view.label("P", [X[0], X[1] + g.separation * 0.05, X[2]], "#e7c78a");
    view.label("p", [sample[0], g.separation * 0.05, sample[2]], "#e7c78a");
  }
  sphere(view.content, N, 0.018 * g.separation, colors.ray);
  view.label("N = \u221e", [O, R + g.separation * 0.07, 0], "#e7c78a");
  charges(view, g, true);
  view.render();
}

function rod(parent: THREE.Group, a: Vec3, b: Vec3, radius: number, color: number) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
  parent.add(mesh);
}

function heatmap(g: Geometry, half: number) {
  const size = 160;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p: Vec3 = [(x / (size - 1) * 2 - 1) * half, (y / (size - 1) * 2 - 1) * half, 0];
      const v = coulomb(p, g).potential * g.separation / (g.positive + g.negative);
      const intensity = Math.abs(Math.tanh(v * 1.3));
      const color = new THREE.Color(v > 0 ? colors.positive : colors.negative);
      const index = (y * size + x) * 4;
      data[index] = color.r * 255;
      data[index + 1] = color.g * 255;
      data[index + 2] = color.b * 255;
      data[index + 3] = 15 + intensity * 110;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.needsUpdate = true;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/** Marching-squares equipotential segments of the Coulomb potential in the z = 0 slice. */
export function equipotentials(g: Geometry, half: number, size = 240): Vec3[] {
  const scale = (g.positive + g.negative) / g.separation;
  const levels = [-4, -2, -1, -0.5, -0.25, -0.1, 0, 0.1, 0.25, 0.5, 1, 2, 4].map(v => v * scale);
  const at = (i: number) => (i / (size - 1) * 2 - 1) * half;
  const grid: number[][] = [];
  for (let j = 0; j < size; j++) {
    grid.push([]);
    for (let i = 0; i < size; i++) {
      const p: Vec3 = [at(i), at(j), 0];
      const near = distance(p, g.plus) < chargeRadius(g.positive, g.separation) ||
        distance(p, g.minus) < chargeRadius(g.negative, g.separation);
      grid[j].push(near ? NaN : coulomb(p, g).potential);
    }
  }
  const segments: Vec3[] = [];
  const edge = (x0: number, y0: number, v0: number, x1: number, y1: number, v1: number, level: number): Vec3 => {
    const t = (level - v0) / (v1 - v0);
    return [x0 + t * (x1 - x0), y0 + t * (y1 - y0), 0];
  };
  for (const level of levels) {
    for (let j = 0; j < size - 1; j++) {
      for (let i = 0; i < size - 1; i++) {
        const v = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]];
        if (v.some(Number.isNaN)) continue;
        const x = [at(i), at(i + 1), at(i + 1), at(i)];
        const y = [at(j), at(j), at(j + 1), at(j + 1)];
        const crossings: Vec3[] = [];
        for (let k = 0; k < 4; k++) {
          const a = v[k], b = v[(k + 1) % 4];
          if ((a < level) !== (b < level)) crossings.push(edge(x[k], y[k], a, x[(k + 1) % 4], y[(k + 1) % 4], b, level));
        }
        // Saddle cells (4 crossings) are rare here; pairing in edge order is adequate for display.
        for (let k = 0; k + 1 < crossings.length; k += 2) segments.push(crossings[k], crossings[k + 1]);
      }
    }
  }
  return segments;
}

export interface PhysicalOptions {
  angle: number; lines: boolean; context: boolean; potential: boolean; equipotentials: boolean; probe: boolean;
  longitudes: boolean;
}

export function drawPhysical(view: Viewport, g: Geometry, probe: Vec3, traces: Trace[], longitudes: SphereTrace[],
  options: PhysicalOptions) {
  view.clear();
  const { angle } = options;
  const rotate = (p: Vec3, a: number): Vec3 => [p[0], p[1] * Math.cos(a), p[1] * Math.sin(a)];
  const half = 3.2 * g.separation;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2 * half, 2 * half),
    new THREE.MeshBasicMaterial({ color: options.potential ? 0xffffff : 0x7894b4,
      map: options.potential ? heatmap(g, half) : null, transparent: true, opacity: options.potential ? 0.65 : 0.04,
      side: THREE.DoubleSide, depthWrite: false }));
  plane.rotation.x = angle;
  view.content.add(plane);
  line(view.content, [[-half, -half, 0], [half, -half, 0], [half, half, 0],
    [-half, half, 0], [-half, -half, 0]].map(p => rotate(p as Vec3, angle)), colors.muted, 0.5);
  line(view.content, [[-half, 0, 0], [half, 0, 0]], colors.muted, 0.65, true);
  if (options.equipotentials) {
    const segments = new THREE.BufferGeometry().setFromPoints(
      equipotentials(g, half).map(p => new THREE.Vector3(...rotate(p, angle))));
    view.content.add(new THREE.LineSegments(segments,
      new THREE.LineBasicMaterial({ color: 0xe9eef5, transparent: true, opacity: 0.45 })));
  }
  if (options.longitudes) {
    // Unweighted longitudes projected into the world: circles through both charges (the 2D-world field).
    for (const trace of longitudes) {
      for (const piece of clip(trace.points.map(X => fromSphere(X, g)), half)) {
        line(view.content, piece.map(p => rotate(p, angle)), longitudeColor, 0.45);
      }
    }
  }
  if (options.lines) {
    for (const trace of traces) {
      const pieces = clip(trace.points, half);
      for (const piece of pieces) line(view.content, piece.map(p => rotate(p, angle)), traceColor(trace), 0.9);
      const first = pieces[0];
      if (first && first.length > 10) {
        const p = first[Math.floor(first.length * 0.45)];
        arrow(view.content, rotate(p, angle), rotate(coulomb(p, g).field, angle), g.separation * 0.045, traceColor(trace));
      }
      if (options.context) {
        for (const a of [Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4]) {
          for (const piece of pieces) line(view.content, piece.map(p => rotate(p, angle + a)), 0x6485a9, 0.13);
        }
      }
    }
  }
  if (options.probe) {
    const worldProbe = rotate(probe, angle);
    sphere(view.content, worldProbe, g.separation * 0.024, colors.ray);
    arrow(view.content, worldProbe, coulomb(worldProbe, g).field, g.separation * 0.15, colors.ray);
    view.label("p", [worldProbe[0], worldProbe[1] + 0.1 * g.separation, worldProbe[2]], "#e7c78a");
  }
  charges(view, g);
  view.render();
}
