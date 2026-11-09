import "./style.css";
import { Vector3 } from "three";
import {
  coulomb, escapeFraction, fieldLines, geometry, projected, sphereLines, verification,
  type FieldModel, type Geometry, type Trace, type Vec3,
} from "./physics";
import { drawConstruction, drawPhysical, Viewport } from "./views";

const root = document.querySelector<HTMLDivElement>("#app")!;
root.innerHTML = `
  <header class="topbar">
    <a class="brand" href="./" aria-label="Charge lab home"><span class="brand-mark">C<span>+</span></span><strong>CHARGE<span> / FIELD LAB</span></strong></a>
    <button id="summary" class="summary" aria-controls="settings" title="Edit the charges">
      <span class="positive" id="summary-positive"></span><span class="negative" id="summary-negative"></span><span id="summary-separation"></span>
      <span class="summary-check" id="summary-check"></span>
    </button>
    <div class="actions">
      <button id="open-settings" class="tool" aria-expanded="false" aria-controls="settings"><span aria-hidden="true">&#9881;</span> Settings</button>
      <button id="open-details" class="tool" aria-expanded="false" aria-controls="details"><span aria-hidden="true">&#9432;</span> Details</button>
      <button id="reset" class="tool icon" title="Reset experiment" aria-label="Reset experiment">&#8634;</button>
    </div>
  </header>
  <div id="error" role="alert" hidden></div>
  <main class="stage">
    <section class="view-card" aria-label="Sphere construction">
      <div id="construction" class="viewport">
        <div class="overlay top-left"><p class="eyebrow">THE CONSTRUCTION</p><h2>Sphere at the fulcrum</h2></div>
        <div class="overlay top-right">
          <div class="segmented" role="group" aria-label="Construction camera"><button id="mode-2d" aria-pressed="false">2D</button><button id="mode-3d" aria-pressed="true">3D</button></div>
          <button class="camera-reset" id="reset-construction" aria-label="Reset construction camera" title="Reset camera">&#8634;</button>
        </div>
        <div class="overlay weight-control">
          <button id="play-weight" class="play" aria-label="Animate the weight from 0% to 100%" title="Animate 0% to 100%">&#9654;</button>
          <div class="weight-body">
            <label for="weight-t"><span>Weight applied: G = w<sup id="weight-exponent">1.00</sup> &middot; F</span> <output id="weight-t-value"></output></label>
            <input id="weight-t" type="range" min="0" max="100" step="1" value="100">
            <div class="weight-ends"><span>0%: longitudes of F</span><span>100%: real field</span></div>
          </div>
        </div>
        <div class="overlay bottom-left legend">
          <span><i class="dot grey"></i>Longitudes of F (unweighted)</span>
          <span><i class="dot mint"></i>Lines of G (stay finite)</span>
          <span><i class="dot violet"></i>Lines of G reaching N = &infin;</span>
          <span class="hint" id="construction-hint">Drag to orbit &middot; scroll to zoom</span>
        </div>
      </div>
    </section>
    <section class="view-card" aria-label="Physical field">
      <div id="physical" class="viewport">
        <div class="overlay top-left"><p class="eyebrow">PHYSICAL SPACE</p><h2>Real 3D Coulomb field</h2></div>
        <div class="overlay top-right">
          <button class="camera-reset" id="reset-physical" aria-label="Reset physical camera" title="Reset camera">&#8634;</button>
        </div>
        <div class="overlay bottom-left legend">
          <span><i class="dot mint"></i>Charge to charge</span>
          <span><i class="dot violet"></i>Escaping</span>
          <span class="potential-key">&minus; <i></i> + potential</span>
          <span class="hint">Drag to orbit &middot; scroll to zoom</span>
        </div>
      </div>
    </section>
  </main>

  <aside id="settings" class="drawer" hidden aria-labelledby="settings-title">
    <div class="drawer-head"><h2 id="settings-title">Settings</h2><button class="close" data-close aria-label="Close settings">&times;</button></div>
    <form id="parameters" novalidate>
      <h3>Charges</h3>
      <div class="field-grid">
        <label class="positive" for="positive">+q&#8321;<input id="positive" type="number" min="0.25" max="4" step="0.25" value="2" required></label>
        <label class="negative" for="negative" id="negative-label"><span id="negative-name">|&minus;q&#8322;|</span><input id="negative" type="number" min="0.25" max="4" step="0.25" value="1" required></label>
        <label for="separation">Separation L<input id="separation" type="number" min="0.5" max="6" step="0.25" value="2" required></label>
      </div>
      <div class="sign-row"><span>Second charge</span>
        <div class="segmented" role="group" aria-label="Sign of the second charge"><button type="button" id="sign-opposite" aria-pressed="true">&minus; opposite</button><button type="button" id="sign-like" aria-pressed="false">+ like</button></div>
      </div>
      <div class="preset-row"><span>Presets</span><button type="button" data-preset="1,1">1 : 1</button><button type="button" data-preset="2,1">2 : 1</button><button type="button" data-preset="1,3">1 : 3</button></div>
      <p class="hint-text" id="input-error" role="status"></p>
    </form>
    <h3>Field lines</h3>
    <label class="range" for="density">Lines from the stronger charge (per side) <output id="density-value"></output></label>
    <input id="density" type="range" min="6" max="22" step="2" value="12">
    <label class="select" for="model">Trace using
      <select id="model"><option value="weighted">Weighted sphere gradient</option><option value="coulomb">Direct Coulomb field</option></select>
    </label>
    <h3>Construction view</h3>
    <label class="check"><input id="sphere-lines" type="checkbox" checked> Weighted lines (steepest paths of G)</label>
    <label class="check"><input id="sphere-longitudes" type="checkbox" checked> Unweighted longitudes of F (reference)</label>
    <label class="check"><input id="rays" type="checkbox" checked> Projection rays from N</label>
    <h3>Physical view</h3>
    <label class="range" for="angle">Slice azimuth <output id="angle-value"></output></label>
    <input id="angle" type="range" min="0" max="180" step="1" value="0">
    <label class="check"><input id="lines" type="checkbox" checked> Field lines</label>
    <label class="check"><input id="potential" type="checkbox" checked> Potential color</label>
    <label class="check"><input id="equipotentials" type="checkbox"> Equipotential contours</label>
    <label class="check"><input id="context" type="checkbox" checked> Faint 3D context around the axis</label>
    <label class="check"><input id="physical-longitudes" type="checkbox"> Projected longitudes (2D-world circles)</label>
    <h3>Probe</h3>
    <label class="check"><input id="probe" type="checkbox"> Show probe in both views</label>
    <label class="range" for="probe-x">Axial position <output id="probe-x-value"></output></label>
    <input id="probe-x" type="range" min="-1.5" max="1.5" step="0.01" value="0.15">
    <label class="range" for="probe-rho">Distance from axis <output id="probe-rho-value"></output></label>
    <input id="probe-rho" type="range" min="0.1" max="1.5" step="0.01" value="0.45">
    <p class="hint-text">Probe coordinates are in units of L.</p>
  </aside>

  <aside id="details" class="drawer" hidden aria-labelledby="details-title">
    <div class="drawer-head"><h2 id="details-title">Details</h2><button class="close" data-close aria-label="Close details">&times;</button></div>
    <div class="verification" id="verification" role="status" aria-live="polite">
      <div class="verify-title"><span id="verify-icon">&#10003;</span><strong id="verify-title">Checking identity</strong></div>
      <dl>
        <div><dt>Potential error (max relative)</dt><dd id="potential-error"></dd></div>
        <div><dt>Field-vector error</dt><dd id="field-error"></dd></div>
        <div><dt>Antipodal residual</dt><dd id="antipodal-error"></dd></div>
      </dl>
      <p id="verify-note"></p>
    </div>
    <h3>Seesaw geometry</h3>
    <dl class="readout">
      <div><dt>Fulcrum O (sphere center)</dt><dd id="origin"></dd></div>
      <div><dt>Sphere radius R = &radic;(d&#8321;d&#8322;)</dt><dd id="radius"></dd></div>
      <div><dt>d&#8322; / d&#8321; (to &minus;q&#8322; / +q&#8321;)</dt><dd id="lever"></dd></div>
      <div><dt>Pole-axis tilt &alpha;</dt><dd id="tilt"></dd></div>
    </dl>
    <p class="formula">d&#8321;/d&#8322; = (q&#8321;/q&#8322;)&#178; &nbsp;&middot;&nbsp; q&#8321;/q&#8322; = tan(45&deg; + &alpha;/2)</p>
    <h3>Field-line count</h3>
    <dl class="readout">
      <div><dt>Lines escaping to infinity</dt><dd id="escaped"></dd></div>
      <div><dt>Gauss's law predicts</dt><dd id="escape-expected"></dd></div>
    </dl>
    <h3>At the probe</h3>
    <dl class="readout">
      <div><dt>Weight w</dt><dd id="weight"></dd></div>
      <div><dt>Sphere function F</dt><dd id="sphere-potential"></dd></div>
      <div><dt>C &middot; w &middot; F</dt><dd id="weighted-potential"></dd></div>
      <div><dt>Coulomb potential</dt><dd id="direct-potential"></dd></div>
      <div><dt>|E|</dt><dd id="field-strength"></dd></div>
    </dl>
    <h3>How the construction works</h3>
    <ol class="steps">
      <li><strong>Fulcrum.</strong> O splits the separation so d&#8321; : d&#8322; = q&#8321;&#178; : q&#8322;&#178;.</li>
      <li><strong>Sphere.</strong> Radius R = &radic;(d&#8321;d&#8322;), centered on O, with N (infinity) straight above.</li>
      <li><strong>Lift.</strong> Rays from N to each charge cross the sphere at opposite poles A and B.</li>
      <li><strong>Weight.</strong> F = 1/|X&minus;A| &minus; 1/|X&minus;B| is constant on rings around the A&ndash;B axis; its steepest paths are the flat longitudes (grey). The weight w = |X&minus;N|/2 is constant on rings around the vertical axis. Multiply: G = w&middot;F. Its steepest paths, traced on the sphere, are the bent curves (mint and violet). The slider traces G = w<sup>t</sup>F; only 0% and 100% have physical meaning.</li>
      <li><strong>Project.</strong> V(p) = C&middot;G(X) exactly, and projection preserves right angles, so G's steepest paths land on the real field lines.</li>
    </ol>
    <p class="identity">V(p) = C &middot; w(X) &middot; F(X), &nbsp; C = 2&radic;(q&#8321;&#178;+q&#8322;&#178;)/L</p>
    <p>Why w: stereographic projection is an inversion through N, and w is Kelvin's inversion factor, the same factor as in the image-charge method. In 2D that factor is 1, which is why the flat longitudes alone work there for equal charges.</p>
    <p>Why lines reach N: w = 0 at N, so N acts as a sink of strength F(N) &prop; q&#8321; + q&#8322; (with signs). At 0% no curve can reach N.</p>
    <p>Like charges use the same fulcrum, sphere, poles and weight; only the second sphere charge flips sign, so F = 1/c&#8321; + 1/c&#8322;. F then has a minimum on the equator between the poles, and the unweighted paths from both poles stall there. The weight is what sends every line up to N.</p>
    <p class="hint-text">Lines start at the stronger charge with equal flux each. Coulomb constant k = 1. Charge sphere volume &prop; |q|; the sources are ideal points. The displayed sphere is the 2-sphere slice of S&#179; over the z = 0 world plane.</p>
  </aside>`;

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing UI element: ${id}`);
  return found as T;
}
const input = (id: string) => element<HTMLInputElement>(id);
const checked = (id: string) => input(id).checked;
const text = (id: string, value: string) => { element(id).textContent = value; };
const fmt = (v: number) => Math.abs(v) < 1e-10 ? "0.0000" : v.toFixed(4);
const scientific = (v: number) => v.toExponential(2);
const error = element("error");

function reportFailure(cause: unknown) {
  error.textContent = cause instanceof Error ? cause.message : String(cause);
  error.hidden = false;
  console.error(cause);
}

const defaults: Record<string, string | boolean> = {
  positive: "2", negative: "1", separation: "2", density: "12", model: "weighted", angle: "0",
  "probe-x": "0.15", "probe-rho": "0.45", "sphere-lines": true, rays: true, lines: true,
  potential: true, equipotentials: false, context: true, probe: false,
  "weight-t": "100", "sphere-longitudes": true, "physical-longitudes": false,
};

function start() {
  const construction = new Viewport(element("construction"), "construction");
  let physical: Viewport;
  try {
    physical = new Viewport(element("physical"), "physical");
  } catch (cause) {
    construction.dispose();
    throw cause;
  }
  let g: Geometry = geometry({ positive: 2, negative: 1, separation: 2 });
  let sign2: 1 | -1 = -1;
  let pending = 0;
  let pendingConstruction = 0;
  const caches = new Map<string, unknown>();
  function cached<T>(key: string, make: () => T): T {
    if (!caches.has(key)) {
      if (caches.size > 64) caches.clear();
      caches.set(key, make());
    }
    return caches.get(key) as T;
  }

  const probe = (): Vec3 => [Number(input("probe-x").value) * g.separation,
    Number(input("probe-rho").value) * g.separation, 0];
  const count = () => Number(input("density").value);
  const weightT = () => Number(input("weight-t").value) / 100;
  const systemKey = () => `${g.positive},${g.negative},${g.sign2},${g.separation},${count()}`;

  function traces(): Trace[] {
    const model = element<HTMLSelectElement>("model").value as FieldModel;
    return cached(`real:${systemKey()}:${model}`, () => fieldLines(g, count(), model));
  }
  const longitudes = () => cached(`sphere:${systemKey()}:0`, () => sphereLines(g, count(), 0));
  const weighted = (t: number) => cached(`sphere:${systemKey()}:${t}`, () => sphereLines(g, count(), t));

  function drawConstructionView() {
    pendingConstruction = 0;
    try {
      const t = weightT();
      drawConstruction(construction, g, probe(), { weighted: weighted(t), longitudes: longitudes() }, {
        lines: checked("sphere-lines"), longitudes: checked("sphere-longitudes"),
        rays: checked("rays"), probe: checked("probe"),
      });
      text("weight-t-value", `${Math.round(t * 100)}%`);
      text("weight-exponent", t.toFixed(2));
    } catch (cause) { reportFailure(cause); }
  }

  function draw() {
    pending = 0;
    try {
      const p = probe();
      const lines = traces();
      drawConstructionView();
      drawPhysical(physical, g, p, lines, longitudes(), {
        angle: Number(input("angle").value) * Math.PI / 180,
        lines: checked("lines"), context: checked("context"), potential: checked("potential"),
        equipotentials: checked("equipotentials"), probe: checked("probe"),
        longitudes: checked("physical-longitudes"),
      });
      const result = projected(p, g);
      const exact = coulomb(p, g);
      text("angle-value", `${input("angle").value}\u00b0`);
      text("density-value", input("density").value);
      text("probe-x-value", fmt(p[0]));
      text("probe-rho-value", fmt(p[1]));
      text("weight", fmt(result.weight));
      text("sphere-potential", fmt(result.spherePotential));
      text("weighted-potential", fmt(result.potential));
      text("direct-potential", fmt(exact.potential));
      text("field-strength", fmt(Math.hypot(...exact.field)));
      const escaped = lines.filter(line => line.end === "escape").length;
      text("escaped", `${escaped} of ${lines.length} (${(100 * escaped / lines.length).toFixed(0)}%)`);
      text("escape-expected", `${(100 * escapeFraction(g)).toFixed(1)}%`);
      error.hidden = true;
    } catch (cause) { reportFailure(cause); }
  }
  const scheduleDraw = () => { if (!pending) pending = requestAnimationFrame(draw); };

  function updateSystem(reframe = true) {
    const fields = ["positive", "negative", "separation"].map(input);
    const invalid = fields.find(field => !field.checkValidity());
    if (invalid) {
      text("input-error", `${invalid.labels?.[0]?.firstChild?.textContent?.trim() ?? invalid.id} must be between ${invalid.min} and ${invalid.max}.`);
      return;
    }
    text("input-error", "");
    try {
      g = geometry({
        positive: Number(input("positive").value), negative: Number(input("negative").value),
        separation: Number(input("separation").value), sign2,
      });
      const like = sign2 > 0;
      text("summary-positive", `+${g.positive}`);
      text("summary-negative", `${like ? "+" : "\u2212"}${g.negative}`);
      for (const id of ["summary-negative", "negative-label"]) {
        element(id).classList.toggle("positive", like);
        element(id).classList.toggle("negative", !like);
      }
      element("negative-name").innerHTML = like ? "+q&#8322;" : "|&minus;q&#8322;|";
      element("sign-opposite").setAttribute("aria-pressed", String(!like));
      element("sign-like").setAttribute("aria-pressed", String(like));
      text("summary-separation", `L ${g.separation}`);
      text("origin", fmt(g.origin));
      text("radius", fmt(g.radius));
      text("lever", `${g.d2.toFixed(3)} / ${g.d1.toFixed(3)}`);
      text("tilt", `${(Math.asin(g.polePlus[3]) * 180 / Math.PI).toFixed(2)}\u00b0`);
      const check = verification(g);
      text("verify-title", check.passed ? "Weighted identity verified" : "Verification failed");
      text("verify-icon", check.passed ? "\u2713" : "!");
      text("summary-check", check.passed ? "\u2713 exact" : "! check failed");
      element("summary-check").classList.toggle("failed", !check.passed);
      element("verification").classList.toggle("failed", !check.passed);
      text("potential-error", scientific(check.potentialError));
      text("field-error", scientific(check.fieldError));
      text("antipodal-error", scientific(check.antipodalError));
      text("verify-note", `Weighted vs. direct Coulomb at ${check.count} points in 3D. Without the weight, the error is ${check.unweightedError.toFixed(2)} \u00d7 the characteristic potential.`);
      if (reframe) {
        const left = Math.min(g.origin - g.radius, -g.separation / 2);
        const right = Math.max(g.origin + g.radius, g.separation / 2);
        construction.frame((right - left) * 0.9, new Vector3((left + right) / 2, g.radius * 0.3, 0));
        physical.frame(g.separation * 2.05);
      }
      draw();
    } catch (cause) { reportFailure(cause); }
  }

  const form = element<HTMLFormElement>("parameters");
  form.addEventListener("submit", event => { event.preventDefault(); updateSystem(); });
  for (const id of ["positive", "negative", "separation"]) input(id).addEventListener("change", () => updateSystem());
  element("sign-opposite").addEventListener("click", () => { sign2 = -1; updateSystem(); });
  element("sign-like").addEventListener("click", () => { sign2 = 1; updateSystem(); });
  for (const id of ["angle", "density", "probe-x", "probe-rho", "model", "context", "potential",
    "equipotentials", "lines", "sphere-lines", "rays", "probe", "sphere-longitudes", "physical-longitudes"]) {
    element(id).addEventListener("input", scheduleDraw);
  }
  const scheduleConstruction = () => {
    if (!pendingConstruction) pendingConstruction = requestAnimationFrame(drawConstructionView);
  };
  let animation = 0;
  const play = element<HTMLButtonElement>("play-weight");
  function stopAnimation() {
    cancelAnimationFrame(animation);
    animation = 0;
    play.innerHTML = "&#9654;";
    play.setAttribute("aria-label", "Animate the weight from 0% to 100%");
  }
  input("weight-t").addEventListener("input", () => { stopAnimation(); scheduleConstruction(); });
  play.addEventListener("click", () => {
    if (animation) { stopAnimation(); return; }
    play.innerHTML = "&#10074;&#10074;";
    play.setAttribute("aria-label", "Pause the weight animation");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 1 : 3200;
    const begin = performance.now();
    const tick = (now: number) => {
      const s = Math.min(1, (now - begin) / duration);
      // Hold briefly at 0% so the flat longitudes are seen before they bend.
      const eased = s < 0.15 ? 0 : 0.5 - 0.5 * Math.cos(Math.PI * (s - 0.15) / 0.85);
      input("weight-t").value = String(Math.round(eased * 100));
      drawConstructionView();
      if (s < 1) animation = requestAnimationFrame(tick);
      else stopAnimation();
    };
    animation = requestAnimationFrame(tick);
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-preset]")) {
    button.addEventListener("click", () => {
      const [positive, negative] = button.dataset.preset!.split(",");
      input("positive").value = positive;
      input("negative").value = negative;
      updateSystem();
    });
  }

  function setMode(flat: boolean) {
    construction.setFlat(flat);
    element("mode-2d").setAttribute("aria-pressed", String(flat));
    element("mode-3d").setAttribute("aria-pressed", String(!flat));
    text("construction-hint", flat ? "Side elevation \u00b7 drag to pan" : "Drag to orbit \u00b7 scroll to zoom");
  }
  element("mode-2d").addEventListener("click", () => setMode(true));
  element("mode-3d").addEventListener("click", () => setMode(false));
  element("reset-construction").addEventListener("click", () => construction.reset());
  element("reset-physical").addEventListener("click", () => physical.reset());

  const drawers = { settings: element("settings"), details: element("details") };
  const openers = { settings: element("open-settings"), details: element("open-details") };
  function toggleDrawer(name: keyof typeof drawers, open = drawers[name].hidden) {
    for (const key of Object.keys(drawers) as (keyof typeof drawers)[]) {
      const show = key === name && open;
      drawers[key].hidden = !show;
      openers[key].setAttribute("aria-expanded", String(show));
    }
    if (open) drawers[name].querySelector<HTMLElement>("input, select, button.close")?.focus();
  }
  openers.settings.addEventListener("click", () => toggleDrawer("settings"));
  openers.details.addEventListener("click", () => toggleDrawer("details"));
  element("summary").addEventListener("click", () => toggleDrawer("settings", true));
  for (const close of document.querySelectorAll<HTMLButtonElement>("[data-close]")) {
    close.addEventListener("click", () => {
      const name = close.closest(".drawer")!.id as keyof typeof drawers;
      toggleDrawer(name, false);
      openers[name].focus();
    });
  }
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    for (const name of Object.keys(drawers) as (keyof typeof drawers)[]) {
      if (!drawers[name].hidden) { toggleDrawer(name, false); openers[name].focus(); }
    }
  });

  element("reset").addEventListener("click", () => {
    stopAnimation();
    sign2 = -1;
    for (const [id, value] of Object.entries(defaults)) {
      const field = element<HTMLInputElement | HTMLSelectElement>(id);
      if (typeof value === "boolean") (field as HTMLInputElement).checked = value;
      else field.value = value;
    }
    setMode(false);
    updateSystem();
  });
  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(pending);
    cancelAnimationFrame(pendingConstruction);
    stopAnimation();
    construction.dispose();
    physical.dispose();
  }, { once: true });
  updateSystem();
}

try { start(); }
catch (cause) { reportFailure(cause); }
