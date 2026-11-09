import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { chargeRadius, coulomb, fieldLines, projected, type FieldModel, type Geometry, type Vec3 } from "./physics";

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
    this.camera.position.copy(this.target).addScaledVector(direction, this.span * 2.15);
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
      this.camera.left = -this.span * aspect;
      this.camera.right = this.span * aspect;
      this.camera.top = this.span;
      this.camera.bottom = -this.span;
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
  for (const [q, p, color, sign] of [
    [g.positive, g.plus, colors.positive, "+"] as const,
    [g.negative, g.minus, colors.negative, "-"] as const,
  ]) {
    sphere(view.content, p, chargeRadius(q, g.separation), color);
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

export function drawConstruction(view: Viewport, g: Geometry, probe: Vec3) {
  view.clear();
  const R = g.radius;
  const O = g.origin;
  const extra = (X: readonly number[]): Vec3 => [O + R * X[0], R * X[3], R * X[1]];
  const pole: Vec3 = [O, R, 0];
  const sample: Vec3 = [probe[0], 0, probe[1]];
  // This displayed S2 is the section of S3 containing the axis, probe, and projection pole.
  sphere(view.content, [O, 0, 0], R, 0x426a91, 0.055);
  for (let j = -3; j <= 3; j++) {
    const latitude = j * Math.PI / 8;
    const ring: Vec3[] = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100 * 2 * Math.PI;
      ring.push([O + R * Math.cos(latitude) * Math.cos(t), R * Math.sin(latitude),
        R * Math.cos(latitude) * Math.sin(t)]);
    }
    line(view.content, ring, colors.muted, 0.5);
  }
  for (let j = 0; j < 8; j++) {
    const ring: Vec3[] = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100 * 2 * Math.PI;
      ring.push([O + R * Math.sin(t) * Math.cos(j * Math.PI / 8), R * Math.cos(t),
        R * Math.sin(t) * Math.sin(j * Math.PI / 8)]);
    }
    line(view.content, ring, colors.muted, 0.45);
  }
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(g.separation * 2, g.separation * 1.3),
    new THREE.MeshBasicMaterial({ color: 0x6281a2, side: THREE.DoubleSide, transparent: true, opacity: 0.06, depthWrite: false }));
  plane.rotation.x = -Math.PI / 2;
  view.content.add(plane);
  line(view.content, [[O, -R * 1.2, 0], [O, R * 1.3, 0]], colors.muted, 0.6, true);
  const lifted = projected([probe[0], probe[1], 0], g);
  const X = extra(lifted.X);
  const A = extra(g.polePlus);
  const B = extra(g.poleMinus);
  line(view.content, [A, B], colors.mint, 0.9);
  for (const [Q, p, color] of [[A, g.plus, colors.positive], [B, g.minus, colors.negative]] as const) {
    line(view.content, [pole, Q, p], color, 0.55, true);
    sphere(view.content, Q, 0.018 * g.separation, color);
  }
  line(view.content, [pole, X, sample], colors.ray, 0.8, true);
  line(view.content, [X, A], colors.positive, 0.55);
  line(view.content, [X, B], colors.negative, 0.55);
  sphere(view.content, pole, 0.015 * g.separation, colors.ray);
  sphere(view.content, X, 0.018 * g.separation, colors.ray);
  sphere(view.content, sample, 0.018 * g.separation, colors.ray);
  view.label("N / infinity", [O, R + g.separation * 0.06, 0], "#e7c78a");
  view.label("P / lifted probe", [X[0], X[1] + g.separation * 0.04, X[2]], "#e7c78a");
  view.label("p", [sample[0], g.separation * 0.04, sample[2]], "#e7c78a");
  view.label("extra dimension", [O, -R * 1.25, 0]);
  charges(view, g, true);
  view.render();
}

function heatmap(g: Geometry) {
  const size = 160;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p: Vec3 = [(x / (size - 1) - 0.5) * 6.4 * g.separation,
        (y / (size - 1) - 0.5) * 6.4 * g.separation, 0];
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

export interface PhysicalOptions { angle: number; count: number; model: FieldModel; context: boolean; potential: boolean }

export function drawPhysical(view: Viewport, g: Geometry, probe: Vec3, options: PhysicalOptions) {
  view.clear();
  const { angle, count, model, context, potential } = options;
  const rotate = (p: Vec3, a: number): Vec3 => [p[0], p[1] * Math.cos(a), p[1] * Math.sin(a)];
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(6.4 * g.separation, 6.4 * g.separation),
    new THREE.MeshBasicMaterial({ color: potential ? 0xffffff : 0x7894b4,
      map: potential ? heatmap(g) : null, transparent: true, opacity: potential ? 0.65 : 0.04,
      side: THREE.DoubleSide, depthWrite: false }));
  plane.rotation.x = angle;
  view.content.add(plane);
  const size = 3.2 * g.separation;
  line(view.content, [[-size, -size, 0], [size, -size, 0], [size, size, 0],
    [-size, size, 0], [-size, -size, 0]].map(p => rotate(p as Vec3, angle)), colors.muted, 0.5);
  line(view.content, [[-size, 0, 0], [size, 0, 0]], colors.muted, 0.65, true);
  const traces = fieldLines(g, count, model);
  for (const trace of traces) {
    line(view.content, trace.points.map(p => rotate(p, angle)), colors.mint, 0.88);
    if (trace.points.length > 10) {
      const index = Math.floor(trace.points.length * 0.43);
      const p = trace.points[index];
      const e = coulomb(p, g).field;
      arrow(view.content, rotate(p, angle), rotate(e, angle), g.separation * 0.045, colors.mint);
    }
    if (context) {
      for (const a of [Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4]) {
        line(view.content, trace.points.map(p => rotate(p, angle + a)), 0x6485a9, 0.13);
      }
    }
  }
  const worldProbe = rotate(probe, angle);
  sphere(view.content, worldProbe, g.separation * 0.024, colors.ray);
  const E = coulomb(worldProbe, g).field;
  arrow(view.content, worldProbe, E, g.separation * 0.15, colors.ray);
  view.label("p / probe", [worldProbe[0], worldProbe[1] + 0.1 * g.separation, worldProbe[2]], "#e7c78a");
  view.label("cross-section", rotate([size * 0.73, -size, 0], angle));
  charges(view, g);
  view.render();
}
