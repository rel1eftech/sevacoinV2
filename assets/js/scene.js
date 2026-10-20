// SevaCoin 3D scenes (Three.js). One shared coin model, rendered into several canvases:
//   [data-scene="hero"]  — coins landing on the string ends over the fixed globe (hero)
//   [data-scene="coin"]  — a SevaCoin floating above a lit podium with orbit rings (sections)
//   [data-scene="icon"]  — a small 3D object (wallet, gear, coin stack, shield, heart, people) for the section cards
// Every view pauses when off-screen, follows the pointer gently, and honours prefers-reduced-motion.
// ?heroT=<seconds> freezes all views at that moment (used for previews).

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const stillT = parseFloat(new URLSearchParams(location.search).get("heroT"));
const frozen = reduceMotion || Number.isFinite(stillT);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---------- Shared coin face (painted once, used by every view) ----------
const face = { canvas: null, listeners: [] };
function faceCanvas() {
  if (face.canvas) return face.canvas;
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  // The SEVA Coin face, matching the SVG coin (assets/coin/seva-coin.js): platinum rim, navy face with a fine
  // engraved rosette, and the SEVA "E" (the option chosen there) in the logo's white, blue and aqua.
  // Drawn in the SVG's 400-unit space.
  const paint = () => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, S, S);
    const k = S / 400;
    g.scale(k, k);
    // The cylinder cap's UVs are rotated 90° relative to the world, so counter-rotate
    g.translate(200, 200); g.rotate(-Math.PI / 2); g.translate(-200, -200);
    const lin = (stops) => { const gr = g.createLinearGradient(4, 4, 396, 396); stops.forEach(([o, col]) => gr.addColorStop(o, col)); return gr; };
    const disc = (r, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(200, 200, r, 0, Math.PI * 2); g.fill(); };
    g.fillStyle = lin([[0, "#f7f9fb"], [0.22, "#c3ccd6"], [0.45, "#eef2f6"], [0.7, "#8e9aa8"], [1, "#5d6978"]]);
    g.fillRect(-40, -40, 480, 480);
    disc(183, lin([[0, "#5d6978"], [1, "#f1f4f7"]]));
    const fc = g.createRadialGradient(144, 120, 4, 200, 200, 240);
    fc.addColorStop(0, "#2f5f90"); fc.addColorStop(0.45, "#15385d"); fc.addColorStop(1, "#061629");
    disc(178, fc);
    // engraved rosette and a fine ring
    g.save(); g.strokeStyle = "rgba(154, 210, 226, .09)"; g.lineWidth = 0.6;
    for (let i = 0; i < 36; i++) { g.beginPath(); g.ellipse(200, 200, 150, 58, (i * 5 * Math.PI) / 180, 0, Math.PI * 2); g.stroke(); }
    g.strokeStyle = "rgba(154, 210, 226, .22)"; g.lineWidth = 1; g.beginPath(); g.arc(200, 200, 152, 0, Math.PI * 2); g.stroke();
    g.restore();
    // bright blue inner ring
    g.strokeStyle = "rgba(47, 134, 255, .9)"; g.lineWidth = 2.5; g.beginPath(); g.arc(200, 200, 174, 0, Math.PI * 2); g.stroke();
    // the caduceus watermark behind the E (the same traced shape as the SVG coin, assets/coin/seva-coin.js)
    const cad = window.SevaCoin && window.SevaCoin.CADUCEUS && window.SevaCoin.CADUCEUS.match(/translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.]+)\)" d="([^"]+)"/);
    if (cad) {
      g.save(); g.translate(+cad[1], +cad[2]); g.scale(+cad[3], +cad[3]);
      const cp = new Path2D(cad[4]);
      g.globalAlpha = .3;   // a soft relief, not competing with the E
      // embossed: a dark cast shadow, a light top edge, then the metal gradient
      g.save(); g.translate(1.6 / +cad[3], 2.6 / +cad[3]); g.fillStyle = "rgba(2, 11, 28, .35)"; g.fill(cp, "evenodd"); g.restore();
      g.save(); g.translate(-1 / +cad[3], -1.2 / +cad[3]); g.fillStyle = "rgba(179, 212, 251, .55)"; g.fill(cp, "evenodd"); g.restore();
      const mg = g.createLinearGradient(0, 80, 0, 480); mg.addColorStop(0, "#eef7ff"); mg.addColorStop(.55, "#c4ddf5"); mg.addColorStop(1, "#9cc3e8");
      g.fillStyle = mg; g.fill(cp, "evenodd");
      g.globalAlpha = 1;
      g.restore();
    }
    // the E in the logo's colours, lifted off the face by a soft shadow
    const v = ((window.SevaCoin && (document.documentElement.dataset.coinVariant || window.SevaCoin.DEFAULT_VARIANT)) || "a").toLowerCase();
    const cols = ["#2b56a3", "#4ea7f2", "#82d6f6"];   // E colours: deep blue, bright blue, light aqua
    // one E mark W wide centred on (x, y): bar height .26W, pitch .57W, middle bar .79W set .026W in
    const mark = (x, y, W) => cols.forEach((col, i) => { const rx = x - W / 2, ry = y - W * 0.57 - W * 0.13 + i * W * 0.57, rw = i === 1 ? W * 0.79 : W, rh = W * 0.26; g.fillStyle = col; g.fillRect(rx, ry, rw, rh); });
    g.save(); g.shadowColor = "rgba(2, 10, 22, .6)"; g.shadowBlur = 3 * k; g.shadowOffsetY = 3 * k;
    if (v === "b") { g.fillStyle = "#e6f1f8"; g.fill(new Path2D("M116 131H284V165H152V183H262V217H152V235H284V269H116Z")); }
    else if (v === "c") { mark(200, 146, 50); mark(150, 244, 50); mark(250, 244, 50); }
    else [[114, 136, 172, 35, "#ffffff", "#dfe6f0"], [114, 190, 172, 35, "#7dbcf5", "#3f88dc"], [114, 242, 172, 35, "#b6eefc", "#68cdee"]].forEach(([x, y, w, h, c0, c1]) => { const bg = g.createLinearGradient(0, y, 0, y + h); bg.addColorStop(0, c0); bg.addColorStop(1, c1); g.fillStyle = bg; g.fillRect(x, y, w, h); g.save(); g.shadowColor = "transparent"; g.fillStyle = "rgba(255, 255, 255, .38)"; g.fillRect(x + 3, y + 2.6, w - 6, h * .26); g.restore(); g.save(); g.shadowColor = "transparent"; g.strokeStyle = "#fff"; g.lineWidth = 1.6; g.strokeRect(x, y, w, h); g.restore(); });   // left-aligned, middle shortest, bottom longest
    g.restore();
  };
  paint();
  face.canvas = c;
  return c;
}

function radialTexture(inner, outer) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, inner);
  r.addColorStop(1, outer);
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function beamTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 512;
  const g = c.getContext("2d");
  const v = g.createLinearGradient(0, 0, 0, 512);
  v.addColorStop(0, "rgba(255,255,255,0)");
  v.addColorStop(0.75, "rgba(255,255,255,.55)");
  v.addColorStop(1, "rgba(255,255,255,1)");
  g.fillStyle = v;
  g.fillRect(0, 0, 128, 512);
  g.globalCompositeOperation = "destination-in";
  const h = g.createLinearGradient(0, 0, 128, 0);
  h.addColorStop(0, "rgba(0,0,0,0)");
  h.addColorStop(0.5, "rgba(0,0,0,1)");
  h.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = h;
  g.fillRect(0, 0, 128, 512);
  return new THREE.CanvasTexture(c);
}

const pointer = new THREE.Vector2();
window.addEventListener("pointermove", (e) => {
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
}, { passive: true });

// ---------- Rendering ----------
// Browsers allow only a handful of WebGL contexts per page and silently drop the oldest ones, which leaves blank
// canvases. So the page uses two: the hero has its own (it is large and always on screen); every other view is
// drawn by one shared off-screen renderer and copied into its own plain 2D canvas each frame.
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  r.setClearColor(0x000000, 0);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  return r;
}
function makeEnvironment(renderer) {
  return new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
}
const Shared = {
  renderer: null, env: null, w: 0, h: 0, views: [],
  get() {
    if (!this.renderer) {
      this.renderer = makeRenderer(document.createElement("canvas"));
      this.renderer.setPixelRatio(1);                         // sizes below are already in device pixels
      this.env = makeEnvironment(this.renderer);
      this.renderer.domElement.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        this.views.forEach((v) => v.lost());                 // every shared view falls back to its flat artwork
      });
    }
    return this.renderer;
  },
  // Render one view into the shared buffer and copy the pixels into the view's 2D canvas
  draw(view) {
    const w = view.bw, h = view.bh;
    if (!w || !h || !view.ctx) return;
    const r = this.get();
    if (w > this.w || h > this.h) { this.w = Math.max(this.w, w); this.h = Math.max(this.h, h); r.setSize(this.w, this.h, false); }
    r.setViewport(0, 0, w, h);
    r.setScissor(0, 0, w, h);
    r.setScissorTest(true);
    r.clear();
    r.render(view.scene, view.camera);
    view.ctx.clearRect(0, 0, w, h);
    view.ctx.drawImage(r.domElement, 0, this.h - h, w, h, 0, 0, w, h);   // WebGL's origin is bottom-left
  },
};

// ---------- Base view ----------
class View {
  constructor(canvas) {
    this.canvas = canvas;
    this.host = canvas.parentElement;
    this.own = canvas.dataset.scene === "hero";
    if (this.own) {
      this.renderer = makeRenderer(canvas);
      this.renderer.setPixelRatio(DPR);
      canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.lost(); });
    } else {
      this.renderer = Shared.get();
      this.ctx = canvas.getContext("2d");
      Shared.views.push(this);
    }
    this.scene = new THREE.Scene();
    this.scene.environment = this.own ? makeEnvironment(this.renderer) : Shared.env;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);

    this.tex = new THREE.CanvasTexture(faceCanvas());
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    face.listeners.push(() => { this.tex.needsUpdate = true; if (frozen) this.renderStill(); });
    this.faceMat = new THREE.MeshPhysicalMaterial({
      map: this.tex, metalness: 0.5, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05,
      emissive: "#ffffff", emissiveMap: this.tex, emissiveIntensity: 0.12, envMapIntensity: 1.1,
    });
    this.edgeMat = new THREE.MeshPhysicalMaterial({ color: "#d3dbe4", metalness: 1, roughness: 0.2, envMapIntensity: 1.4 });
    this.glowTex = radialTexture("rgba(140, 200, 255, 1)", "rgba(60, 120, 255, 0)");

    this.scene.add(new THREE.AmbientLight("#4a6cb0", 0.7));
    this.key = new THREE.DirectionalLight("#ffffff", 1.6);
    this.key.position.set(-2, 3, 4);
    this.scene.add(this.key);
    const rim = new THREE.DirectionalLight("#7fd4ff", 1.1);
    rim.position.set(3, 1, -2);
    this.scene.add(rim);

    this.ps = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.base = 0;
    this.running = false;
    this.frame = this.frame.bind(this);
    new ResizeObserver(() => this.resize()).observe(this.host);
    this.resize();

    if (frozen) {
      this.renderStill();
      return;
    }
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !this.running) { this.running = true; this.clock.start(); requestAnimationFrame(this.frame); }
      else if (!e.isIntersecting && this.running) { this.running = false; this.base = this.now(); }
    }, { rootMargin: "80px" }).observe(this.host);
  }
  now() { return this.base + this.clock.getElapsedTime(); }
  // The WebGL context is gone: stop and let the CSS fallback artwork show again
  lost() {
    this.running = false;
    this.host.classList.remove("has-3d");
  }
  makeCoin(r) {
    const g = new THREE.Group();
    const h = r * 0.2;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 96, 1), [this.edgeMat, this.faceMat, this.faceMat]);
    body.rotation.x = Math.PI / 2;                          // faces point along ±Z
    g.add(body);
    for (const side of [1, -1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.955, r * 0.045, 14, 96), this.edgeMat);
      ring.position.z = (side * h) / 2;
      g.add(ring);
    }
    const inner = new THREE.Mesh(new THREE.TorusGeometry(r * 0.84, r * 0.012, 8, 96), this.edgeMat);
    inner.position.z = h / 2 + r * 0.004;
    g.add(inner);
    // No glow or shadow behind the coin: it reads as a clean metal object
    return g;
  }
  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    if (this.own) {
      this.renderer.setSize(w, h, false);
    } else {
      this.bw = Math.round(w * DPR); this.bh = Math.round(h * DPR);
      this.canvas.width = this.bw; this.canvas.height = this.bh;
    }
    this.camera.aspect = w / h;
    this.layout(w, h);
    this.camera.updateProjectionMatrix();
    if (frozen) this.renderStill();
  }
  draw() {
    if (this.own) this.renderer.render(this.scene, this.camera);
    else Shared.draw(this);
  }
  renderStill() {
    if (!this.layoutDone) return;
    this.update(Number.isFinite(stillT) ? stillT : 12);
    this.draw();
  }
  frame() {
    if (!this.running) return;
    this.ps.lerp(pointer, 0.04);
    this.update(this.now());
    this.draw();
    requestAnimationFrame(this.frame);
  }
}

// ---------- Hero: the SevaCoin lands on the globe, then the network grows out of it ----------
// The story: globe -> the main coin arrives -> one string reaches out and a coin lands at its end -> the next
// string, the next coin -> until coins are spread over the globe. The strings are the SVG network in the
// markup (one every few tenths of a second, see index.html); every node that carries data-coin gets a 3D coin
// of that width (fraction of the stage) which lands when the node lights (its --d). Coins are placed in the
// SVG's coordinate space so they sit exactly on the string ends whatever the viewport.
const HERO = {
  hub: { x: 1110, y: 400, w: 0.125, yaw: -0.2, pitch: 0.08 },   // where the strings start (the "M" of every path)
  MAIN_AT: 0.4, MAIN_IN: 1.0,   // main coin entrance: starts at 0.4s, settled by 1.4s; the first string leaves at 1.5s
  COIN_IN: 0.5,                 // a small coin takes this long to land once its string has arrived
};

class HeroView extends View {
  constructor(canvas) {
    super(canvas);
    this.build();
    this.layoutDone = true;
    this.resize();
  }
  build() {
    this.svg = document.querySelector(".network");
    this.main = this.makeCoin(1);
    this.scene.add(this.main);
    // The animated SVG SEVA Coin (.hero-coin, assets/coin) is the main coin now; the 3D one stays hidden
    if (document.querySelector(".hero-coin")) this.main.visible = false;
    this.spots = [];
    const nodes = this.svg ? this.svg.querySelectorAll(".node[data-coin]") : [];
    nodes.forEach((n, i) => {
      const coin = this.makeCoin(1);
      coin.visible = false;
      this.scene.add(coin);
      this.spots.push({
        coin, x: +n.getAttribute("cx"), y: +n.getAttribute("cy"), w: parseFloat(n.dataset.coin),
        at: parseFloat(n.style.getPropertyValue("--d")) || 0,
        yaw: (i % 2 ? 0.28 : -0.28) * (0.6 + (i % 3) * 0.2), pitch: ((i % 4) - 1.5) * 0.08,
      });
    });
    this.key.position.set(-3, 4, 5);
  }
  // SVG user units -> fractions of the stage, through the SVG's own screen matrix
  // (this covers the viewBox "slice" fit and the CSS scale on the globe wrapper)
  toStage(x, y) {
    const m = this.svg && this.svg.getScreenCTM();
    if (!m) return { x: x / 1672, y: y / 941 };
    const p = new DOMPoint(x, y).matrixTransform(m), r = this.host.getBoundingClientRect();
    return { x: (p.x - r.left) / r.width, y: (p.y - r.top) / r.height };
  }
  layout(w, h) {
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.position.set(0, 0, 0.5 / tanHalf);       // world height = 1, world width = aspect
    this.camera.lookAt(0, 0, 0);
    if (!this.main) return;
    this.A = w / h;
    this.W = w;
    const boost = w < 920 ? 1.45 : 1;
    this.main.userData.r = (HERO.hub.w * boost * this.A) / 2;
    this.spots.forEach((s) => { s.coin.userData.r = (s.w * boost * this.A) / 2; });
    this.place();
  }
  // Put every coin on its point of the picture. Called each frame as well, because the globe group drifts
  // (CSS animation + pointer parallax) and the coins must move with it.
  place() {
    const A = this.A, at = (coin, x, y) => {
      const s = this.toStage(x, y);
      coin.position.set((s.x - 0.5) * A, 0.5 - s.y, 0);
    };
    at(this.main, HERO.hub.x, HERO.hub.y);
    this.spots.forEach((s) => at(s.coin, s.x, s.y));
  }
  update(t) {
    const { MAIN_AT, MAIN_IN, COIN_IN } = HERO;
    const px = this.ps.x, py = this.ps.y;

    // The globe group leans very slightly towards the pointer (the picture, the strings and the coins together)
    if (!frozen) {
      const g = this.globe || (this.globe = this.host.querySelector(".globe-fixed"));
      if (g) { g.style.setProperty("--px", (-px * this.W * 0.006).toFixed(1) + "px"); g.style.setProperty("--py", (-py * this.W * 0.004).toFixed(1) + "px"); }
    }
    this.place();

    // Main coin: grows out of the globe and comes forward with a slow quarter turn; then it keeps hovering and
    // slowly swinging on its axis so its edge catches the light
    const e = easeInOut(clamp01((t - MAIN_AT) / MAIN_IN));
    this.main.scale.setScalar(this.main.userData.r * (0.05 + 0.95 * e));
    this.main.position.y += Math.sin(t * 0.7) * 0.006 * e;
    this.main.position.z = -0.2 * (1 - e) + Math.sin(t * 0.45) * 0.01;
    this.main.rotation.set(
      HERO.hub.pitch + py * 0.15 + Math.sin(t * 0.5) * 0.08,
      HERO.hub.yaw + (1 - e) * 0.6 + px * 0.2 + Math.sin(t * 0.35) * 0.5, 0);

    // Small coins: each lands on its node the moment that string arrives; afterwards every coin keeps hovering
    // and turning at its own pace, out of step with the others
    this.spots.forEach((s, i) => {
      const pe = easeOut(clamp01((t - s.at) / COIN_IN));
      s.coin.visible = pe > 0;
      s.coin.scale.setScalar(s.coin.userData.r * (0.15 + 0.85 * pe));
      const f = t * (0.5 + (i % 3) * 0.12) + i * 1.7;
      s.coin.position.y += Math.sin(f * 0.9) * 0.004 * pe;
      s.coin.position.z = Math.sin(f * 0.7) * 0.01;
      s.coin.rotation.set(s.pitch + Math.sin(f) * 0.1 + py * 0.08, s.yaw + (1 - pe) * 0.9 + Math.sin(f * 0.6) * 0.45 + px * 0.12, Math.sin(f * 0.4) * 0.05);
    });
    this.key.position.set(-3 + Math.sin(t * 0.12) * 1.2, 4, 5);
  }
}

// ---------- Sections: a coin floating above a lit podium ----------
class CoinView extends View {
  constructor(canvas) {
    super(canvas);
    this.opts = {
      r: parseFloat(canvas.dataset.radius || "0.27"),
      podium: canvas.dataset.podium !== "off",
      rings: canvas.dataset.rings !== "off",
      zoom: parseFloat(canvas.dataset.zoom || "1.4"),               // camera distance factor (smaller = tighter frame)
      podiumScale: parseFloat(canvas.dataset.podiumScale || "1"),   // podium size relative to the coin
      ringScale: parseFloat(canvas.dataset.ringScale || "1"),       // orbit ring size relative to the coin
      light: canvas.dataset.theme === "light",                      // for light backgrounds: no additive glow, pale podium
      showcase: canvas.dataset.showcase !== undefined,              // layered glass podium (+ hologram globe unless data-holo="off")
      holo: canvas.dataset.holo !== "off",
      phone: canvas.dataset.phone !== undefined,                    // a phone showing the wallet, standing beside the coin
    };
    this.opts.coinY = parseFloat(canvas.dataset.coinY || (this.opts.podium ? "0.1" : "0"));   // height of the coin above the centre
    this.build();
    this.layoutDone = true;
    this.resize();
  }
  build() {
    const r = this.opts.r;
    const light = this.opts.light, blend = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    this.coinY = this.opts.coinY;
    this.coin = this.makeCoin(r);
    this.coin.position.y = this.coinY;
    this.scene.add(this.coin);

    if (this.opts.rings) {
      this.rings = [];
      [{ R: 1.8, tilt: 1.25, spin: 0.22, n: 2 }, { R: 2.35, tilt: 1.05, spin: -0.15, n: 3 }].forEach((o, k) => {
        const g = new THREE.Group();
        g.rotation.x = o.tilt;
        g.rotation.y = k ? 0.4 : -0.3;
        g.position.y = this.coinY;
        const torus = new THREE.Mesh(new THREE.TorusGeometry(r * o.R * this.opts.ringScale, r * 0.009, 6, 160),
          new THREE.MeshBasicMaterial({ color: light ? "#3f9fe0" : "#7fd8ff", transparent: true, opacity: light ? 0.6 : 0.45, blending: blend, depthWrite: false }));
        const orbit = new THREE.Group();
        orbit.add(torus);
        for (let i = 0; i < o.n; i++) {
          const s = new THREE.Mesh(new THREE.SphereGeometry(r * 0.07, 16, 12), new THREE.MeshBasicMaterial({ color: light ? "#2f8fe6" : "#bff0ff" }));
          const a = (i / o.n) * Math.PI * 2;
          s.position.set(Math.cos(a) * r * o.R * this.opts.ringScale, Math.sin(a) * r * o.R * this.opts.ringScale, 0);
          const sg = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: "#7fd0ff", transparent: true, opacity: light ? 0.4 : 0.8, blending: blend, depthWrite: false }));
          sg.scale.setScalar(r * 0.4);
          s.add(sg);
          orbit.add(s);
        }
        g.add(orbit);
        g.userData.orbit = orbit;
        g.userData.spin = o.spin;
        this.scene.add(g);
        this.rings.push(g);
      });
    }

    if (this.opts.showcase) {
      this.buildShowcase(r);
    } else if (this.opts.podium) {
      const y = -0.36, pr = r * this.opts.podiumScale;
      const pod = new THREE.Group();
      pod.position.y = y;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(pr * 2.0, pr * 2.25, pr * 0.32, 96),
        new THREE.MeshStandardMaterial({ color: light ? "#dce9f8" : "#0b1a3a", metalness: light ? 0.45 : 0.65, roughness: light ? 0.3 : 0.4, envMapIntensity: light ? 1.1 : 0.8 }));
      pod.add(body);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(pr * 1.92, r * 0.025, 8, 128), new THREE.MeshBasicMaterial({ color: light ? "#3f9fe0" : "#8fe6ff" }));
      lip.rotation.x = Math.PI / 2;
      lip.position.y = pr * 0.17;
      pod.add(lip);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(pr * 1.7, 64),
        new THREE.MeshBasicMaterial({ map: this.glowTex, color: "#4fb8ff", transparent: true, opacity: light ? 0.35 : 0.55, blending: blend, depthWrite: false }));
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = pr * 0.17 + 0.002;
      pod.add(disc);
      this.podDisc = disc;
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(pr * 3.2, pr * 4.6),
        new THREE.MeshBasicMaterial({ map: beamTexture(), color: "#6fc6ff", transparent: true, opacity: light ? 0.14 : 0.32, blending: blend, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = pr * 0.17 + pr * 2.3;
      beam.position.z = -r * 0.2;
      pod.add(beam);
      this.beam = beam;
      this.scene.add(pod);
    }
    this.fill = new THREE.PointLight("#3f8fff", 6, 4, 1.5);
    this.fill.position.set(0, -0.1, 0.8);
    this.scene.add(this.fill);
  }
  // Showcase podium (About section): a layered glass podium with neon rims, and a holographic network globe
  // turning slowly behind the coin. Built for a light background (no additive blending).
  buildShowcase(r) {
    const glass = (color, opacity, extra = {}) => new THREE.MeshPhysicalMaterial({
      color, transparent: true, opacity, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05,
      envMapIntensity: 1.4, depthWrite: false, ...extra,
    });
    const neon = new THREE.MeshBasicMaterial({ color: "#5fe0ff" });
    const add = this.opts.light ? THREE.NormalBlending : THREE.AdditiveBlending;
    const pod = new THREE.Group();
    pod.position.y = -0.36;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.76, r * 1.86, r * 0.2, 128),
      new THREE.MeshPhysicalMaterial({ color: "#123f8a", metalness: 0.7, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 }));
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.5, r * 1.57, r * 0.16, 128),
      new THREE.MeshPhysicalMaterial({ color: "#2f8fe6", metalness: 0.5, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 }));
    mid.position.y = r * 0.18;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.3, r * 1.34, r * 0.12, 128), glass("#dff4ff", 0.78));
    top.position.y = r * 0.32;
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(r * 1.81, r * 0.02, 8, 180), neon);
    ring1.rotation.x = Math.PI / 2; ring1.position.y = r * 0.1;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(r * 1.33, r * 0.016, 8, 180), neon);
    ring2.rotation.x = Math.PI / 2; ring2.position.y = r * 0.38;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 1.22, 64),
      new THREE.MeshBasicMaterial({ map: this.glowTex, color: "#5fd0ff", transparent: true, opacity: 0.7, depthWrite: false, blending: add }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = r * 0.385;
    this.podDisc = disc;
    // soft light pooling under the podium
    const pool = new THREE.Mesh(new THREE.CircleGeometry(r * 1.9, 64),
      new THREE.MeshBasicMaterial({ map: this.glowTex, color: "#8fd4ff", transparent: true, opacity: 0.45, depthWrite: false, blending: add }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = -r * 0.1;
    pod.add(pool, base, mid, top, ring1, ring2, disc);
    this.scene.add(pod);

    if (!this.opts.light) {
      // a column of light rising from the podium behind the coin
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.4, r * 5.2),
        new THREE.MeshBasicMaterial({ map: beamTexture(), color: "#6fc6ff", transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.set(0, pod.position.y + r * 0.4 + r * 2.6, -r * 0.6);
      this.beam = beam;
      this.scene.add(beam);
    }
    if (this.opts.phone) this.buildPhone(r, pod.position.y + r * 0.44);
    if (!this.opts.holo) { this.key.intensity = 2.4; this.faceMat.emissiveIntensity = 0.26; return; }

    // the hologram: a translucent globe with a wire grid, scattered nodes and a halo, behind and to the right
    const holo = new THREE.Group();
    const R = r * 1.05;                                   // small enough to stay inside the canvas on the right
    holo.position.set(r * 0.85, r * 0.7, -r * 2.0);
    holo.add(new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), glass("#5fb0ff", 0.22)));
    holo.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(R * 1.002, 20, 12)),
      new THREE.LineBasicMaterial({ color: "#5fb8ff", transparent: true, opacity: 0.5 })));
    const pts = [];
    for (let i = 0; i < 80; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), q = R * 1.012;
      pts.push(q * Math.sin(ph) * Math.cos(th), q * Math.cos(ph), q * Math.sin(ph) * Math.sin(th));
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    holo.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: "#eaf8ff", size: r * 0.07, map: this.glowTex, transparent: true, depthWrite: false })));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: "#7fc8ff", transparent: true, opacity: 0.5, depthWrite: false }));
    halo.scale.setScalar(R * 3.2);
    halo.position.z = -R * 0.6;
    holo.add(halo);
    this.holo = holo;
    this.scene.add(holo);

    // brighter, cooler light so the coin pops on white
    this.key.intensity = 2.4;
    const fill2 = new THREE.DirectionalLight("#9fd8ff", 1.3);
    fill2.position.set(2.5, 2, 3);
    this.scene.add(fill2);
    this.faceMat.emissiveIntensity = 0.26;
  }
  // The phone: a dark rounded body with the wallet on its screen, standing on the podium to the left of the coin
  buildPhone(r, floorY) {
    const body = new THREE.MeshPhysicalMaterial({ color: "#1a2438", metalness: 0.8, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 });
    const W = r * 1.22, H = r * 2.5, D = r * 0.14;
    const p = new THREE.Group();
    p.add(new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 5, r * 0.16), body));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, H * 0.95), new THREE.MeshBasicMaterial({ map: screenTexture(WALLET_SCREEN, 512, 1080) }));
    screen.position.z = D / 2 + 0.001;
    p.add(screen);
    const glare = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, H * 0.95), new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.06, roughness: 0.05, clearcoat: 1, depthWrite: false }));
    glare.position.z = D / 2 + 0.002;
    p.add(glare);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: "#3f8fff", transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(W * 2.4, H * 1.3, 1); glow.position.z = -D;
    p.add(glow);
    p.position.set(-r * 1.05, floorY + H / 2 - r * 0.05, r * 0.75);
    p.rotation.set(0.05, 0.42, 0.06);
    this.phone = p;
    this.phoneBase = p.position.clone();
    this.scene.add(p);
    // the coin stands a little to the right so the two share the podium
    this.coinX = r * 0.5;
  }
  layout(w, h) {
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    // Pulled back so the podium (radius ~0.6) and the outer orbit ring fit inside a square canvas
    // (the base View lays out once before the options exist)
    this.camera.position.set(0, 0.02, (0.5 / tanHalf) * (this.opts ? this.opts.zoom : 1.4));
    if (this.opts && this.opts.showcase) { this.camera.position.y = 0.16; this.camera.lookAt(0, -0.05, 0); }   // a touch from above: the podium top shows as an ellipse
    else this.camera.lookAt(0, 0, 0);
  }
  update(t) {
    const r = this.opts.r;
    this.coin.position.y = this.coinY + Math.sin(t * 0.7) * r * (this.opts.showcase ? 0.03 : 0.1);
    if (this.coinX) { this.coin.position.x = this.coinX; if (this.rings) this.rings.forEach((g) => { g.position.x = this.coinX; }); }
    if (this.phone) {
      this.phone.rotation.y = 0.42 + this.ps.x * 0.12 + Math.sin(t * 0.45) * 0.06;
      this.phone.rotation.x = 0.05 + this.ps.y * 0.06 + Math.sin(t * 0.6) * 0.02;
      this.phone.position.y = this.phoneBase.y + Math.sin(t * 0.8 + 1) * r * 0.03;
    }
    this.coin.rotation.set(0.1 + this.ps.y * 0.18 + Math.sin(t * 0.45) * 0.05, Math.sin(t * 0.32) * 0.42 + this.ps.x * 0.4, Math.sin(t * 0.25) * 0.03);
    if (this.rings) this.rings.forEach((g) => { g.userData.orbit.rotation.z = t * g.userData.spin; });
    if (this.holo) this.holo.rotation.y = t * 0.1;
    if (this.podDisc) this.podDisc.material.opacity = (this.opts.showcase ? 0.6 : this.opts.light ? 0.3 : 0.5) + 0.12 * Math.sin(t * 1.1);
    if (this.beam) this.beam.material.opacity = (this.opts.light ? 0.1 : 0.28) + 0.06 * Math.sin(t * 0.9);
    this.key.position.set(-2 + Math.sin(t * 0.18) * 2.2, 3, 4);
  }
}

// ---------- Card scenes (About section): small rendered objects, each with a live screen drawn on a canvas ----------
function screenTexture(draw, w = 512, h = 512) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function heartPath(g, cx, cy, s) {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.38);
  g.bezierCurveTo(cx - s * 0.62, cy - s * 0.08, cx - s * 0.36, cy - s * 0.62, cx, cy - s * 0.3);
  g.bezierCurveTo(cx + s * 0.36, cy - s * 0.62, cx + s * 0.62, cy - s * 0.08, cx, cy + s * 0.38);
  g.closePath();
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
// A patient record on a tablet: silhouette, vitals and a pulse line
const TABLET_SCREEN = (g, S) => {
  const bg = g.createLinearGradient(0, 0, S, S); bg.addColorStop(0, "#f3f9ff"); bg.addColorStop(1, "#d6eaff");
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  g.fillStyle = "#2f8fe6"; g.fillRect(0, 0, S, 46);
  g.fillStyle = "#ffffff"; g.font = "600 24px sans-serif"; g.fillText("Patient record", 22, 31);
  g.fillStyle = "rgba(255,255,255,.85)"; roundRect(g, 24, 70, 200, 400, 18); g.fill();
  g.fillStyle = "#7fc0f5";
  g.beginPath(); g.arc(124, 150, 34, 0, Math.PI * 2); g.fill();
  roundRect(g, 74, 196, 100, 150, 40); g.fill();
  roundRect(g, 84, 340, 34, 110, 14); g.fill(); roundRect(g, 130, 340, 34, 110, 14); g.fill();
  g.fillStyle = "#2f8fe6"; g.beginPath(); g.arc(150, 230, 12, 0, Math.PI * 2); g.fill();
  [[250, 80, 0.72], [250, 150, 0.5], [250, 220, 0.86]].forEach(([x, y, p]) => {
    g.fillStyle = "rgba(255,255,255,.9)"; roundRect(g, x, y, 236, 48, 14); g.fill();
    g.fillStyle = "#dbe9f7"; roundRect(g, x + 16, y + 28, 204, 8, 4); g.fill();
    g.fillStyle = "#2f8fe6"; roundRect(g, x + 16, y + 28, 204 * p, 8, 4); g.fill();
    g.fillStyle = "#6b7f94"; g.font = "500 14px sans-serif"; g.fillText(["Heart rate", "Blood pressure", "Wellness score"][[80, 150, 220].indexOf(y)], x + 16, y + 20);
  });
  g.fillStyle = "rgba(255,255,255,.9)"; roundRect(g, 250, 290, 236, 180, 14); g.fill();
  g.strokeStyle = "#2f8fe6"; g.lineWidth = 4; g.lineJoin = "round"; g.beginPath();
  const pulse = [[260, 390], [300, 390], [318, 352], [336, 428], [354, 300], [372, 440], [390, 380], [410, 390], [476, 390]];
  pulse.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
};
// A smartwatch face: heart, pulse, reading
const WATCH_SCREEN = (g, S) => {
  const bg = g.createLinearGradient(0, 0, 0, S); bg.addColorStop(0, "#0f1f3d"); bg.addColorStop(1, "#071327");
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  g.fillStyle = "#5fe0ff"; heartPath(g, 256, 190, 150); g.fill();
  g.strokeStyle = "#ffffff"; g.lineWidth = 10; g.lineJoin = "round"; g.beginPath();
  [[150, 200], [205, 200], [222, 168], [244, 236], [266, 150], [288, 240], [306, 200], [362, 200]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  g.fillStyle = "#ffffff"; g.font = "700 96px sans-serif"; g.textAlign = "center"; g.fillText("72", 256, 390);
  g.fillStyle = "#9fd8ff"; g.font = "500 34px sans-serif"; g.fillText("bpm  ·  +12 SEVA", 256, 440);
};
// The SevaCoin wallet on a phone: balance, chart, actions, recent transactions
const WALLET_SCREEN = (g, W, H) => {
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#0b1733"); bg.addColorStop(1, "#060e22");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.textBaseline = "alphabetic";
  g.fillStyle = "#1a2a4d"; roundRect(g, 30, 44, 54, 54, 16); g.fill(); roundRect(g, W - 84, 44, 54, 54, 16); g.fill();
  g.fillStyle = "#ffffff"; g.font = "700 30px sans-serif"; g.textAlign = "center"; g.fillText("SevaCoin", W / 2, 82);
  g.textAlign = "left";
  g.fillStyle = "#8fa6c8"; g.font = "500 22px sans-serif"; g.fillText("Total Balance", 40, 150);
  g.fillStyle = "#ffffff"; g.font = "800 58px sans-serif"; g.fillText("5,500.25", 40, 212);
  g.font = "600 24px sans-serif"; g.fillText("SVC", 290, 212);
  g.fillStyle = "#36d399"; g.font = "600 22px sans-serif"; g.fillText("+12.4%   +$420.50", 40, 250);
  // chart
  g.strokeStyle = "#4fb3ff"; g.lineWidth = 4; g.lineJoin = "round"; g.beginPath();
  const pts = [[40, 360], [100, 340], [150, 352], [210, 318], [260, 330], [320, 296], [380, 310], [440, 282], [W - 40, 292]];
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  const fill = g.createLinearGradient(0, 280, 0, 400); fill.addColorStop(0, "rgba(79,179,255,.35)"); fill.addColorStop(1, "rgba(79,179,255,0)");
  g.lineTo(W - 40, 400); g.lineTo(40, 400); g.closePath(); g.fillStyle = fill; g.fill();
  // actions
  [["Send", 0], ["Receive", 1], ["Swap", 2]].forEach(([label, i]) => {
    const x = 40 + i * 150;
    g.fillStyle = "#13244a"; roundRect(g, x, 430, 132, 110, 22); g.fill();
    g.fillStyle = "#1e3a70"; g.beginPath(); g.arc(x + 66, 470, 22, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#7fd8ff"; g.lineWidth = 3; g.beginPath();
    if (i === 0) { g.moveTo(x + 56, 480); g.lineTo(x + 76, 460); g.moveTo(x + 62, 460); g.lineTo(x + 76, 460); g.lineTo(x + 76, 474); }
    else if (i === 1) { g.moveTo(x + 66, 458); g.lineTo(x + 66, 482); g.moveTo(x + 56, 472); g.lineTo(x + 66, 482); g.lineTo(x + 76, 472); }
    else { g.moveTo(x + 54, 464); g.lineTo(x + 78, 464); g.lineTo(x + 70, 456); g.moveTo(x + 78, 476); g.lineTo(x + 54, 476); g.lineTo(x + 62, 484); }
    g.stroke();
    g.fillStyle = "#dbe7ff"; g.font = "500 20px sans-serif"; g.textAlign = "center"; g.fillText(label, x + 66, 522); g.textAlign = "left";
  });
  // transactions
  g.fillStyle = "#ffffff"; g.font = "600 24px sans-serif"; g.fillText("Recent Transactions", 40, 600);
  g.fillStyle = "#4fb3ff"; g.font = "500 18px sans-serif"; g.textAlign = "right"; g.fillText("See all", W - 40, 600); g.textAlign = "left";
  [["Medical Support", "2 mins ago", "+250.00 SVC", "#36d399", "#2f6fe0"], ["Community Care", "1 hour ago", "-120.00 SVC", "#ff5f7a", "#1e3a70"], ["Global Health Fund", "1 day ago", "+500.00 SVC", "#36d399", "#1e3a70"]].forEach(([name, when, amt, col, ic], i) => {
    const y = 640 + i * 96;
    g.fillStyle = "#101e3f"; roundRect(g, 40, y, W - 80, 80, 20); g.fill();
    g.fillStyle = ic; g.beginPath(); g.arc(84, y + 40, 24, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#ffffff"; g.font = "600 21px sans-serif"; g.fillText(name, 126, y + 36);
    g.fillStyle = "#8fa6c8"; g.font = "400 17px sans-serif"; g.fillText(when, 126, y + 62);
    g.fillStyle = col; g.font = "700 20px sans-serif"; g.textAlign = "right"; g.fillText(amt, W - 60, y + 46); g.textAlign = "left";
  });
};
// A member tile: a portrait silhouette on light blue
const PORTRAIT = (g, S) => {
  const bg = g.createLinearGradient(0, 0, 0, S); bg.addColorStop(0, "#eef7ff"); bg.addColorStop(1, "#cfe6ff");
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  g.fillStyle = "#2f8fe6";
  g.beginPath(); g.arc(256, 200, 86, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(256, 460, 170, Math.PI, 0); g.fill();
};

// ---------- Icons and card scenes: small 3D objects on the section cards ----------
// [data-scene="icon"] with data-icon = wallet | gear | coins. Each slowly turns and hovers above the lit disc the CSS draws.
class IconView extends View {
  constructor(canvas) {
    super(canvas);
    this.kind = canvas.dataset.icon || "wallet";
    this.build();
    this.layoutDone = true;
    this.resize();
  }
  build() {
    const g = (this.obj = new THREE.Group());
    this.scene.add(g);
    const blue = new THREE.MeshPhysicalMaterial({ color: "#1d4fa8", metalness: 0.55, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 1.1 });
    const light = new THREE.MeshPhysicalMaterial({ color: "#3f86e8", metalness: 0.5, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.1, envMapIntensity: 1.2 });
    const cyan = new THREE.MeshPhysicalMaterial({ color: "#7fd8ff", emissive: "#2f8fff", emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.25, clearcoat: 1 });
    const steel = new THREE.MeshPhysicalMaterial({ color: "#a9c8f5", metalness: 0.95, roughness: 0.22, envMapIntensity: 1.5 });

    if (this.kind === "wallet") {
      const body = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.8, 0.3, 5, 0.09), blue);
      const flap = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.36, 0.34, 5, 0.09), light);
      flap.position.set(0, 0.24, 0.02);
      const card = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.5, 0.04, 3, 0.03), steel);
      card.position.set(0.06, 0.1, -0.1);
      const button = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 40), cyan);
      button.rotation.x = Math.PI / 2;
      button.position.set(0.38, -0.08, 0.19);
      const plus1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.02), steel), plus2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.13, 0.02), steel);
      plus1.position.set(0.38, -0.08, 0.24); plus2.position.copy(plus1.position);
      g.add(body, flap, card, button, plus1, plus2);
      g.rotation.set(0.28, -0.45, 0);
      this.base = { x: 0.28, y: -0.45 };
    } else if (this.kind === "gear") {
      const shape = new THREE.Shape(), teeth = 9, R = 0.58, r = 0.47, t = Math.PI * 2 / teeth;
      for (let i = 0; i < teeth; i++) {
        const a = i * t;
        const pts = [[a, R], [a + t * 0.32, R], [a + t * 0.42, r], [a + t * 0.9, r]];
        pts.forEach(([ang, rad], k) => { const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad; if (i === 0 && k === 0) shape.moveTo(x, y); else shape.lineTo(x, y); });
      }
      shape.closePath();
      const hole = new THREE.Path();
      hole.absarc(0, 0, 0.2, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      const gear = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 6 }), steel);
      gear.position.z = -0.11;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.3, 40), light);
      hub.rotation.x = Math.PI / 2;
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 32), cyan);
      core.rotation.x = Math.PI / 2;
      this.gear = gear;
      g.add(gear, hub, core);
      g.rotation.set(0.55, -0.35, 0);
      this.base = { x: 0.55, y: -0.35 };
    } else if (this.kind === "shield") {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0.78); sh.quadraticCurveTo(0.56, 0.78, 0.62, 0.56); sh.lineTo(0.62, 0.06);
      sh.quadraticCurveTo(0.62, -0.48, 0, -0.82); sh.quadraticCurveTo(-0.62, -0.48, -0.62, 0.06);
      sh.lineTo(-0.62, 0.56); sh.quadraticCurveTo(-0.56, 0.78, 0, 0.78);
      const shield = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 16 }), light);
      shield.position.z = -0.09;
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.06), steel), c2 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.46, 0.06), steel);
      c1.position.z = c2.position.z = 0.16;
      c1.position.y = c2.position.y = 0.02;
      g.add(shield, c1, c2);
      g.rotation.set(0.15, -0.35, 0);
      this.base = { x: 0.15, y: -0.35 };
    } else if (this.kind === "heart") {
      const x = 0, y = 0, hs = new THREE.Shape();
      hs.moveTo(x + 5, y + 5);
      hs.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
      hs.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
      hs.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
      hs.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
      hs.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
      hs.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);
      const hg = new THREE.ExtrudeGeometry(hs, { depth: 4, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.9, bevelSegments: 4, curveSegments: 16 });
      hg.center();
      const heart = new THREE.Mesh(hg, cyan);
      heart.scale.setScalar(0.07);
      heart.rotation.z = Math.PI;          // the shape is drawn point-up
      g.add(heart);
      g.rotation.set(0.2, -0.3, 0);
      this.base = { x: 0.2, y: -0.3 };
    } else if (this.kind === "people") {
      [[-0.46, -0.08, 0.85, light], [0, 0.02, 1, cyan], [0.46, -0.08, 0.85, light]].forEach(([px, py, sc, mat]) => {
        const p = new THREE.Group();
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 24), mat);
        head.position.y = 0.36;
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.28, 6, 24), mat);
        body.position.y = -0.1;
        p.add(head, body);
        p.position.set(px, py, px === 0 ? 0.15 : -0.1);
        p.scale.setScalar(sc);
        g.add(p);
      });
      g.rotation.set(0.12, -0.2, 0);
      this.base = { x: 0.12, y: -0.2 };
    } else if (this.kind === "tablet") {
      const dark = new THREE.MeshPhysicalMaterial({ color: "#17233a", metalness: 0.7, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 });
      const frame = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.94, 0.06, 4, 0.05), dark);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.84), new THREE.MeshBasicMaterial({ map: screenTexture(TABLET_SCREEN) }));
      screen.position.z = 0.031;
      const glare = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.84), new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.08, roughness: 0.05, clearcoat: 1, depthWrite: false }));
      glare.position.z = 0.034;
      const tab = new THREE.Group();
      tab.add(frame, screen, glare);
      tab.rotation.set(0.1, -0.42, 0.04);
      // the shield behind it
      const sh = new THREE.Shape();
      sh.moveTo(0, 0.5); sh.quadraticCurveTo(0.36, 0.5, 0.4, 0.36); sh.lineTo(0.4, 0.04);
      sh.quadraticCurveTo(0.4, -0.3, 0, -0.52); sh.quadraticCurveTo(-0.4, -0.3, -0.4, 0.04);
      sh.lineTo(-0.4, 0.36); sh.quadraticCurveTo(-0.36, 0.5, 0, 0.5);
      const shield = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 14 }), light);
      shield.position.set(0.72, 0.42, -0.35);
      shield.rotation.set(0.1, -0.4, 0.1);
      const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.04), steel), cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.04), steel);
      cross1.position.set(0.72, 0.44, -0.2); cross2.position.copy(cross1.position);
      cross1.rotation.copy(shield.rotation); cross2.rotation.copy(shield.rotation);
      this.shield = new THREE.Group();
      this.shield.add(shield, cross1, cross2);
      g.add(tab, this.shield);
      g.scale.setScalar(0.72);
      g.position.set(-0.08, 0.06, 0);
      g.rotation.set(0.06, 0, 0);
      this.base = { x: 0.06, y: 0 };
    } else if (this.kind === "watch") {
      const dark = new THREE.MeshPhysicalMaterial({ color: "#17233a", metalness: 0.75, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
      const band = new THREE.MeshPhysicalMaterial({ color: "#eef3f8", metalness: 0.05, roughness: 0.55, clearcoat: 0.4 });
      const body = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.66, 0.16, 5, 0.12), dark);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.54), new THREE.MeshBasicMaterial({ map: screenTexture(WATCH_SCREEN) }));
      screen.position.z = 0.081;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 24), steel);
      crown.rotation.z = Math.PI / 2; crown.position.set(0.31, 0.12, 0);
      const up = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.5, 0.07, 4, 0.03), band); up.position.set(0, 0.56, -0.02); up.rotation.x = -0.35;
      const down = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.5, 0.07, 4, 0.03), band); down.position.set(0, -0.56, -0.02); down.rotation.x = 0.35;
      const w = new THREE.Group();
      w.add(body, screen, crown, up, down);
      w.rotation.set(0.12, 0.5, -0.1);
      w.position.set(0.08, -0.05, 0);
      // a small heart floating beside it
      const hs = new THREE.Shape(), x = 0, y = 0;
      hs.moveTo(x + 5, y + 5); hs.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y); hs.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
      hs.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19); hs.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
      hs.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y); hs.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);
      const hg = new THREE.ExtrudeGeometry(hs, { depth: 4, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 3, curveSegments: 12 });
      hg.center();
      const heart = new THREE.Mesh(hg, cyan);
      heart.scale.setScalar(0.03); heart.rotation.z = Math.PI; heart.position.set(-0.42, 0.62, 0.15);
      this.heart = heart;
      g.add(w, heart);
      g.rotation.set(0.05, 0, 0);
      this.base = { x: 0.05, y: 0 };
    } else if (this.kind === "network") {
      const R = 0.5;
      const globe = new THREE.Group();
      globe.add(new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), new THREE.MeshPhysicalMaterial({ color: "#5fb0ff", transparent: true, opacity: 0.3, roughness: 0.1, clearcoat: 1, depthWrite: false })));
      globe.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(R * 1.002, 16, 10)), new THREE.LineBasicMaterial({ color: "#3f9fe6", transparent: true, opacity: 0.45 })));
      const portrait = new THREE.MeshBasicMaterial({ map: screenTexture(PORTRAIT) });
      const frameMat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.2, clearcoat: 1 });
      const linkMat = new THREE.LineBasicMaterial({ color: "#2f8fe6", transparent: true, opacity: 0.55 });
      const spots = [[-0.9, 0.6, 0.25], [0.9, 0.62, 0.15], [-0.92, -0.42, 0.2], [0.92, -0.38, 0.25]];
      spots.forEach(([px, py, pz]) => {
        const t = new THREE.Group();
        const fr = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.46, 0.04, 3, 0.04), frameMat);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.39), portrait);
        face.position.z = 0.021;
        t.add(fr, face);
        t.position.set(px * 0.85, py * 0.8, pz);
        globe.add(t);
        const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), t.position.clone().multiplyScalar(0.92)]);
        globe.add(new THREE.Line(lg, linkMat));
      });
      this.globe = globe;
      g.add(globe);
      g.scale.setScalar(0.9);
      g.rotation.set(0.1, 0, 0);
      this.base = { x: 0.1, y: 0 };
    } else {
      // a stack of coins with one standing in front
      const stack = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.09, 72), [this.edgeMat, this.faceMat, this.faceMat]);
        c.position.set((i % 2) * 0.04 - 0.02, -0.3 + i * 0.1, 0);
        c.rotation.y = i * 0.5;
        stack.add(c);
      }
      stack.position.set(0.18, 0, -0.1);
      const front = this.makeCoin(0.42);
      front.position.set(-0.36, 0.1, 0.32);
      front.rotation.set(0.08, -0.35, -0.12);
      this.front = front;
      g.add(stack, front);
      g.rotation.set(0.22, 0.2, 0);
      this.base = { x: 0.22, y: 0.2 };
    }
    this.fill = new THREE.PointLight("#3f8fff", 5, 3, 1.6);
    this.fill.position.set(0, -0.6, 0.6);
    this.scene.add(this.fill);
    this.key.position.set(-2, 3, 4);
  }
  layout(w, h) {
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.position.set(0, 0.05, 0.95 / tanHalf);   // world height ≈ 1.9
    this.camera.lookAt(0, 0, 0);
  }
  update(t) {
    const g = this.obj;
    g.position.y = Math.sin(t * 0.9) * 0.04;
    g.rotation.x = this.base.x + this.ps.y * 0.15 + Math.sin(t * 0.5) * 0.05;
    g.rotation.y = this.base.y + this.ps.x * 0.3 + Math.sin(t * 0.6) * 0.28;
    if (this.gear) this.gear.rotation.z = t * 0.45;
    if (this.shield) { this.shield.position.y = Math.sin(t * 0.8) * 0.04; this.shield.rotation.y = Math.sin(t * 0.6) * 0.15; }
    if (this.heart) { this.heart.rotation.y = Math.sin(t * 0.9) * 0.5; this.heart.position.y = 0.3 + Math.sin(t * 1.1) * 0.04; }
    if (this.globe) this.globe.rotation.y = t * 0.25;
    if (this.front) this.front.rotation.y = -0.35 + Math.sin(t * 0.7) * 0.35;
    this.key.position.set(-2 + Math.sin(t * 0.2) * 1.5, 3, 4);
  }
}

// ---------- Orbit rings + light (Why section) ----------
// Thin tilted rings around the phone-and-coin block with small glowing balls running along them; the page masks the
// canvas so the rings stay behind the phone, coin, panels and podium (style.css). Light rays fall from the top right onto the coin and breathe, and a soft glow
// pulses on the coin. Positions are fractions of the host (x of the width,
// y of the height). Data attributes:
//   data-cx / data-cy   ring centre        data-rings  "R:tiltX:tiltZ:speed:balls;..."   (R as a fraction of the width)
//   data-coin "cx,cy,rx,ry"   data-phone "x1,y1 x2,y2 ..."   data-panels "x,y,w,h;..."   data-light "1"
const RING = { cx: 0.5, cy: 0.47, rings: "0.212:1.2:-0.14:0.16:3;0.236:1.12:-0.04:-0.11:2" };
class RingView extends View {
  constructor(canvas) {
    super(canvas);
    const d = canvas.dataset, n = (k, v) => (d[k] !== undefined ? parseFloat(d[k]) : v);
    this.cfg = {
      cx: n("cx", RING.cx), cy: n("cy", RING.cy),
      rings: (d.rings || RING.rings).split(";").map((s) => { const [R, tiltX, tiltZ, speed, balls] = s.split(":").map(Number); return { R, tiltX, tiltZ, speed, balls }; }),
      coin: d.coin ? d.coin.split(",").map(Number) : null,
      phone: d.phone ? d.phone.trim().split(/\s+/).map((p) => p.split(",").map(Number)) : null,
      panels: d.panels ? d.panels.split(";").map((p) => p.split(",").map(Number)) : [],
      light: d.light !== undefined,
    };
    this.build();
    this.layoutDone = true;
    this.resize();
  }
  build() {
    this.group = new THREE.Group();
    this.scene.add(this.group);
    const ballMat = new THREE.MeshBasicMaterial({ color: "#dff4ff" });
    this.rings = this.cfg.rings.map((r) => {
      const orbit = new THREE.Group();
      orbit.add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.0035, 8, 256), new THREE.MeshBasicMaterial({ color: "#9fe0ff", transparent: true, opacity: 0.6 })));
      const balls = [];
      for (let i = 0; i < r.balls; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), ballMat);
        const sg = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: "#7fd0ff", transparent: true, opacity: 0.8, depthWrite: false }));
        sg.scale.setScalar(5);
        b.add(sg);
        b.userData.phase = (i / r.balls) * Math.PI * 2 + 0.6;
        b.userData.size = i % 2 ? 0.75 : 1;
        orbit.add(b);
        balls.push(b);
      }
      this.group.add(orbit);
      return { ...r, orbit, balls };
    });
    // depth-only stand-ins (so the far side of the rings hides behind the coin, phone and panels)
    const hidden = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
    this.occ = [];
    if (this.cfg.coin) { this.coinOcc = new THREE.Mesh(new THREE.CircleGeometry(1, 64), hidden); this.coinOcc.renderOrder = -1; this.scene.add(this.coinOcc); }
    if (this.cfg.phone) { this.phoneOcc = new THREE.Mesh(new THREE.BufferGeometry(), hidden); this.phoneOcc.renderOrder = -1; this.scene.add(this.phoneOcc); }
    this.panelOcc = this.cfg.panels.map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), hidden); m.renderOrder = -1; this.scene.add(m); return m; });

    if (this.cfg.light) {
      // light rays: long soft planes from the top right, aimed at the coin
      this.rays = [0, 1, 2, 3].map((i) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: beamTexture(), color: "#cfe9ff", transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
        m.userData.i = i;
        this.scene.add(m);
        return m;
      });
      // the glow on the coin
      this.coinGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: "#8fd0ff", transparent: true, opacity: 0.18, depthWrite: false, depthTest: false }));
      this.scene.add(this.coinGlow);
    }
  }
  layout(w, h) {
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.position.set(0, 0, 0.5 / tanHalf);       // world height = 1, world width = aspect
    this.camera.lookAt(0, 0, 0);
    if (!this.group) return;
    const A = (this.A = w / h), C = this.cfg, X = (fx) => (fx - 0.5) * A, Y = (fy) => 0.5 - fy;
    this.X = X; this.Y = Y;
    this.group.position.set(X(C.cx), Y(C.cy), 0);
    this.rings.forEach((r) => {
      r.orbit.scale.setScalar(r.R * A);
      r.orbit.rotation.set(r.tiltX, 0, r.tiltZ);
      r.balls.forEach((b) => b.scale.setScalar(0.009 * b.userData.size / (r.R * A)));
    });
    if (this.coinOcc) { const [cx, cy, rx, ry] = C.coin; this.coinOcc.position.set(X(cx), Y(cy), 0); this.coinOcc.scale.set(rx * A, ry, 1); }
    if (this.phoneOcc) {
      const shape = new THREE.Shape();
      C.phone.forEach(([fx, fy], i) => (i ? shape.lineTo(X(fx), Y(fy)) : shape.moveTo(X(fx), Y(fy))));
      shape.closePath();
      this.phoneOcc.geometry.dispose();
      this.phoneOcc.geometry = new THREE.ShapeGeometry(shape);
    }
    this.panelOcc.forEach((m, i) => { const [x, y, pw, ph] = C.panels[i]; m.position.set(X(x + pw / 2), Y(y + ph / 2), 0); m.scale.set(pw * A, ph, 1); });
    if (this.rays) {
      const [cx, cy] = C.coin || [0.58, 0.48];
      this.rays.forEach((m) => {
        const i = m.userData.i, sx = 0.72 + i * 0.07, sy = -0.05;              // where each ray enters (top right)
        const dx = X(cx) - X(sx), dy = Y(cy) - Y(sy), len = Math.hypot(dx, dy) * 1.25;
        m.position.set((X(sx) + X(cx)) / 2, (Y(sy) + Y(cy)) / 2, -0.05);
        m.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
        m.scale.set(0.05 + i * 0.015, len, 1);
        m.userData.base = 0.22 + (i % 2) * 0.1;
      });
      this.coinGlow.position.set(X(cx), Y(cy), 0.02);
      this.coinGlow.scale.setScalar(C.coin ? C.coin[3] * 3.2 : 0.6);
    }
  }
  update(t) {
    this.rings.forEach((r, k) => {
      const a = t * r.speed;
      r.balls.forEach((b) => { const p = a + b.userData.phase; b.position.set(Math.cos(p), Math.sin(p), 0); });
      r.orbit.rotation.x = r.tiltX + this.ps.y * 0.05 + Math.sin(t * 0.4 + k) * 0.02;
      r.orbit.rotation.z = r.tiltZ + this.ps.x * 0.04;
    });
    if (this.rays) {
      this.rays.forEach((m) => { m.material.opacity = m.userData.base + 0.1 * Math.sin(t * 0.7 + m.userData.i * 1.9) + 0.04 * Math.sin(t * 2.3 + m.userData.i); });
      this.coinGlow.material.opacity = 0.14 + 0.1 * (0.5 + 0.5 * Math.sin(t * 1.1));
    }
  }
}

// Mount each view. On success the host gets .has-3d, which hides the CSS fallback artwork (see style.css);
// if WebGL is unavailable the constructor throws and the fallback simply stays.
const VIEWS = { hero: HeroView, coin: CoinView, icon: IconView, ring: RingView };
document.querySelectorAll("canvas[data-scene]").forEach((c) => {
  const Ctor = VIEWS[c.dataset.scene];
  if (!Ctor) return;
  try {
    new Ctor(c);
    c.parentElement.classList.add("has-3d");
  } catch (e) {
    console.error("SevaCoin 3D scene failed to start:", e);
  }
});
