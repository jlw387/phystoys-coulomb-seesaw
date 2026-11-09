import "./style.css";
import { Vector3 } from "three";
import { geometry, verification, projected, coulomb, type FieldModel, type Vec3 } from "./physics";
import { drawConstruction, drawPhysical, Viewport } from "./views";

const root = document.querySelector<HTMLDivElement>("#app")!;
root.innerHTML = `
  <header>
    <a class="brand" href="./" aria-label="Charge lab home"><span class="brand-mark">C<span>+</span></span><strong>CHARGE<span> / FIELD LAB</span></strong></a>
    <span class="header-note"><i></i> An interactive geometry experiment</span>
  </header>
  <main>
    <div class="intro"><div><p class="eyebrow">STEREOGRAPHIC PROJECTION / EXPERIMENT 01</p>
      <h1>One field. <span>Two perspectives.</span></h1>
      <p class="subtitle">From a balanced pair on a hypersphere to unequal charges in our world.</p></div>
      <button id="reset" class="secondary">Reset experiment <span aria-hidden="true">&#8634;</span></button>
    </div>
    <div id="error" role="alert" hidden></div>
    <section class="workspace" aria-label="Interactive charge experiment">
      <aside class="controls">
        <div class="section-title"><span class="index">01</span><h2>Set the system</h2></div>
        <p class="small">Two opposite point charges. Natural units, with Coulomb's constant k = 1.</p>
        <form id="parameters">
          <label class="input-label positive" for="positive"><span><i></i> Positive charge</span><span>+q&#8321;</span></label>
          <div class="number-row"><input id="positive" name="positive" type="number" min="0.25" max="4" step="0.25" value="2" required aria-label="Positive charge magnitude"><span>charge units</span></div>
          <label class="input-label negative" for="negative"><span><i></i> Negative magnitude</span><span>|-q&#8322;|</span></label>
          <div class="number-row"><input id="negative" name="negative" type="number" min="0.25" max="4" step="0.25" value="1" required aria-label="Negative charge magnitude"><span>charge units</span></div>
          <label class="input-label" for="separation"><span>Separation</span><span>L</span></label>
          <div class="number-row"><input id="separation" name="separation" type="number" min="0.5" max="6" step="0.25" value="2" required><span>length units</span></div>
          <button type="submit" class="primary">Update field <span aria-hidden="true">&#8594;</span></button>
        </form>
        <div class="preset-row"><button data-preset="equal">1 : 1</button><button data-preset="positive">2 : 1</button><button data-preset="negative">1 : 3</button><span>presets</span></div>
        <div class="divider"></div>
        <div class="section-title"><span class="index">02</span><h2>Explore the field</h2></div>
        <label class="range-label" for="angle">Slice azimuth <output id="angle-value">0&#176;</output></label>
        <input id="angle" type="range" min="0" max="180" step="1" value="0">
        <p class="small tight">The slice rotates about the charge axis. Every such plane contains the true field lines.</p>
        <label class="range-label" for="density">Lines per half-plane <output id="density-value">12</output></label>
        <input id="density" type="range" min="6" max="22" step="2" value="12">
        <label class="select-label" for="model">Trace field lines using</label>
        <select id="model"><option value="weighted">Weighted sphere gradient</option><option value="coulomb">Direct Coulomb field</option></select>
        <label class="check"><input id="context" type="checkbox" checked> Show 3D field context</label>
        <label class="check"><input id="potential" type="checkbox" checked> Potential color on slice</label>
        <div class="divider"></div>
        <div class="section-title"><span class="index">03</span><h2>Move the probe</h2></div>
        <label class="range-label" for="probe-x">Axial position <output id="probe-x-value"></output></label>
        <input id="probe-x" type="range" min="-1.5" max="1.5" step="0.01" value="0.15">
        <label class="range-label" for="probe-rho">Distance from axis <output id="probe-rho-value"></output></label>
        <input id="probe-rho" type="range" min="0.1" max="1.5" step="0.01" value="0.45">
        <p class="small tight">Probe coordinates scale with L. Its nonzero radial distance avoids point singularities.</p>
      </aside>
      <div class="visuals">
        <section class="view-card">
          <div class="view-heading"><div><p class="eyebrow">THE CONSTRUCTION</p><h2>A sphere, a projection, a seesaw.</h2></div>
            <div class="segmented" role="group" aria-label="Construction camera"><button id="mode-2d" aria-pressed="false">2D</button><button id="mode-3d" aria-pressed="true">3D</button></div>
          </div>
          <div id="construction" class="viewport"><span class="canvas-badge">S&#178; SECTION OF S&#179; <span>/</span> <span id="camera-mode">3D ORBIT</span></span><button class="camera-reset" id="reset-construction" aria-label="Reset construction camera">&#8634;</button></div>
          <div class="view-footer"><span><i class="legend-dot mint"></i> Antipodal pole pair</span><span><i class="legend-dot gold"></i> Projection rays &amp; probe</span><span id="construction-hint">Drag to orbit &middot; scroll to zoom</span></div>
        </section>
        <section class="view-card">
          <div class="view-heading"><div><p class="eyebrow">PHYSICAL SPACE</p><h2>The real 3D Coulomb field.</h2></div><span class="pill">R&#179; / 1/r&#178;</span></div>
          <div id="physical" class="viewport physical"><span class="canvas-badge">ROTATABLE AXIAL CROSS-SECTION</span><button class="camera-reset" id="reset-physical" aria-label="Reset physical camera">&#8634;</button></div>
          <div class="view-footer"><span><i class="legend-dot mint"></i> Field lines &amp; direction</span><span class="potential-key">- potential <i></i> + potential</span><span>Drag to orbit &middot; scroll to zoom</span></div>
        </section>
      </div>
      <aside class="results">
        <div class="section-title"><span class="index">04</span><h2>Check the geometry</h2></div>
        <p class="small">The fulcrum moves toward the <em>weaker</em> charge. This is a reversed seesaw, not mechanical balance.</p>
        <div class="metric"><span>Fulcrum position, O</span><strong id="origin"></strong></div>
        <div class="metric"><span>Sphere radius, R</span><strong id="radius"></strong></div>
        <div class="lever"><span class="negative">-q&#8322;</span><span id="lever-ratio"></span><span class="positive">+q&#8321;</span></div>
        <div class="formula">d&#8321; / d&#8322; = (q&#8321; / q&#8322;)&#178;<br>d&#8321; d&#8322; = R&#178;</div>
        <p class="small">Sphere size of each charge is illustrative: volume is proportional to |q|. The underlying sources remain points.</p>
        <div class="divider"></div>
        <p class="eyebrow">AT THE GOLD PROBE</p>
        <dl class="probe-results">
          <div><dt>Conformal weight w</dt><dd id="weight"></dd></div>
          <div><dt>Sphere function F</dt><dd id="sphere-potential"></dd></div>
          <div><dt>Weighted potential A w F</dt><dd id="weighted-potential"></dd></div>
          <div><dt>Coulomb potential</dt><dd id="direct-potential"></dd></div>
          <div><dt>Field magnitude |E|</dt><dd id="field-strength"></dd></div>
        </dl>
        <div class="verification" id="verification" role="status" aria-live="polite">
          <div class="verify-title"><span id="verify-icon">&#10003;</span><strong id="verify-title">Checking identity</strong></div>
          <p>Independent checks at <span id="sample-count"></span> points in 3D.</p>
          <dl><div><dt>Potential error</dt><dd id="potential-error"></dd></div><div><dt>Field-vector error</dt><dd id="field-error"></dd></div><div><dt>Antipodal residual</dt><dd id="antipodal-error"></dd></div></dl>
          <span class="tolerance">Pass: V &amp; E &lt; 10&#8315;&#8312;; poles &lt; 10&#8315;&#185;&#178;</span>
        </div>
        <p class="small" id="unweighted"></p>
      </aside>
    </section>
    <section class="explanation">
      <div><p class="eyebrow">WHAT ACTUALLY WORKS?</p><h2>The weight makes the difference.</h2>
        <p>Yes: the weighted stereographic construction reproduces the potential exactly. Differentiating the <em>whole weighted function</em> also recovers the electric field. Simply projecting longitudes or latitudes does not.</p></div>
      <div class="identity"><span>V(p) = A w(p) [ 1/c&#8321; - 1/c&#8322; ]</span><p>A = 2&#8730;(q&#8321;&#178; + q&#8322;&#178;) / L<br>w = 1/&#8730;(1 + |(p - O)/R|&#178;)</p>
        <small>c&#8321;, c&#8322; are chord distances on the unit S&#179;. The displayed sphere is a scaled S&#178; section, not all four dimensions at once.</small></div>
      <details><summary>Read the construction &amp; its limits</summary>
        <p>The real charges sit at x = &#177;L/2. Their distances from O are d&#8321; = Lq&#8321;&#178;/(q&#8321;&#178;+q&#8322;&#178;) and d&#8322; = Lq&#8322;&#178;/(q&#8321;&#178;+q&#8322;&#178;). With R = &#8730;(d&#8321;d&#8322;), inverse stereographic projection lifts them to opposite poles.</p>
        <p>Physical space is the horizontal plane of the construction; vertical height is an extra coordinate. Rotating the construction reveals the radial direction in that plane. In 2D mode you see an orthographic elevation: radial depth is hidden, so an off-axis probe need not sit on the sphere silhouette.</p>
        <p>The grid on the sphere is only a geometry guide, not an equipotential or field-line grid. The physical plot integrates E = -&#8711;V with RK4 and can switch between independent weighted and Coulomb implementations. Colors show the direct Coulomb potential. Lines are finite samples, not a quantitative flux count; curves leaving the viewing boundary continue outside the plot and may return elsewhere. A boundary crossing alone does not establish escape to infinity.</p>
        <p>The verification reports maximum relative errors, with a 10&#8315;&#8312; characteristic-scale denominator floor near zeros. It is numerical evidence alongside the analytic identity, not proof by itself. Without w, the potential is wrong. Equal charges give a useful countercheck: a 90&#176; field line crosses the midplane at &#8730;3 times the half-separation, not the projected-circle radius.</p>
      </details>
    </section>
    <footer><span>CHARGE / FIELD LAB</span><span>Two opposite point charges &middot; electrostatics &middot; k = 1</span></footer>
  </main>`;

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing UI element: ${id}`);
  return found as T;
}
const input = (id: string) => element<HTMLInputElement>(id);
const text = (id: string, value: string) => { element(id).textContent = value; };
const fmt = (v: number) => Math.abs(v) < 1e-10 ? "0.0000" : v.toFixed(4);
const scientific = (v: number) => v.toExponential(2);
const error = element("error");

function reportFailure(cause: unknown) {
  error.textContent = cause instanceof Error ? cause.message : String(cause);
  error.hidden = false;
  console.error(cause);
}

function start() {
  const construction = new Viewport(element("construction"), "construction");
  let physical: Viewport;
  try {
    physical = new Viewport(element("physical"), "physical");
  } catch (cause) {
    construction.dispose();
    throw cause;
  }
  let g = geometry({ positive: 2, negative: 1, separation: 2 });
  let pending = 0;
  const probe = (): Vec3 => [Number(input("probe-x").value) * g.separation,
    Number(input("probe-rho").value) * g.separation, 0];

  function draw() {
    pending = 0;
    try {
      const p = probe();
      const result = projected(p, g);
      const exact = coulomb(p, g);
      drawConstruction(construction, g, p);
      drawPhysical(physical, g, p, {
        angle: Number(input("angle").value) * Math.PI / 180,
        count: Number(input("density").value),
        model: element<HTMLSelectElement>("model").value as FieldModel,
        context: input("context").checked,
        potential: input("potential").checked,
      });
      text("angle-value", `${input("angle").value}\u00b0`);
      text("density-value", input("density").value);
      text("probe-x-value", `${fmt(p[0])}`);
      text("probe-rho-value", `${fmt(p[1])}`);
      text("weight", fmt(result.weight));
      text("sphere-potential", fmt(result.spherePotential));
      text("weighted-potential", fmt(result.potential));
      text("direct-potential", fmt(exact.potential));
      text("field-strength", fmt(Math.hypot(...exact.field)));
      error.hidden = true;
    } catch (cause) { reportFailure(cause); }
  }
  function scheduleDraw() {
    if (!pending) pending = requestAnimationFrame(draw);
  }
  function updateSystem() {
    const form = element<HTMLFormElement>("parameters");
    if (!form.reportValidity()) return;
    try {
      g = geometry({
        positive: Number(input("positive").value), negative: Number(input("negative").value),
        separation: Number(input("separation").value),
      });
      text("origin", fmt(g.origin));
      text("radius", fmt(g.radius));
      text("lever-ratio", `${g.d2.toFixed(3)}  /  ${g.d1.toFixed(3)}`);
      const check = verification(g);
      text("verify-title", check.passed ? "Weighted identity verified" : "Verification failed");
      text("verify-icon", check.passed ? "\u2713" : "!");
      element("verification").classList.toggle("failed", !check.passed);
      text("sample-count", String(check.count));
      text("potential-error", scientific(check.potentialError));
      text("field-error", scientific(check.fieldError));
      text("antipodal-error", scientific(check.antipodalError));
      text("unweighted", `Omitting the weight gives a maximum error of ${check.unweightedError.toFixed(2)} \u00d7 the characteristic potential on the same samples.`);
      construction.frame(g.separation * 0.94, new Vector3(0, g.radius * 0.1, 0));
      physical.frame(g.separation * 2.05);
      draw();
    } catch (cause) { reportFailure(cause); }
  }
  element("parameters").addEventListener("submit", event => { event.preventDefault(); updateSystem(); });
  for (const id of ["angle", "density", "probe-x", "probe-rho", "model", "context", "potential"]) {
    element(id).addEventListener("input", scheduleDraw);
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-preset]")) {
    button.addEventListener("click", () => {
      const preset = button.dataset.preset;
      input("positive").value = preset === "positive" ? "2" : "1";
      input("negative").value = preset === "negative" ? "3" : "1";
      updateSystem();
    });
  }
  function setMode(flat: boolean) {
    construction.setFlat(flat);
    element("mode-2d").setAttribute("aria-pressed", String(flat));
    element("mode-3d").setAttribute("aria-pressed", String(!flat));
    text("camera-mode", flat ? "2D ELEVATION" : "3D ORBIT");
    text("construction-hint", flat ? "Radial depth hidden \u00b7 drag to pan" : "Drag to orbit \u00b7 scroll to zoom");
  }
  element("mode-2d").addEventListener("click", () => setMode(true));
  element("mode-3d").addEventListener("click", () => setMode(false));
  element("reset-construction").addEventListener("click", () => construction.reset());
  element("reset-physical").addEventListener("click", () => physical.reset());
  element("reset").addEventListener("click", () => {
    element<HTMLFormElement>("parameters").reset();
    input("angle").value = "0";
    input("density").value = "12";
    input("probe-x").value = "0.15";
    input("probe-rho").value = "0.45";
    input("context").checked = true;
    input("potential").checked = true;
    element<HTMLSelectElement>("model").value = "weighted";
    setMode(false);
    updateSystem();
  });
  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(pending);
    construction.dispose();
    physical.dispose();
  }, { once: true });
  updateSystem();
}

try { start(); }
catch (cause) { reportFailure(cause); }
