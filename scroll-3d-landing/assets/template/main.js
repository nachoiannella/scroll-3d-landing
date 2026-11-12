import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ================================================================== *
 * CONFIG: everything you tune per project lives here
 * ================================================================== */
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');            // ?debug → axes + click on the model logs its box fraction
const WIRE_ONLY = params.has('wire');         // ?wire  → blueprint only, to tune the wire mesh

const CONFIG = {
  model: params.get('model') || 'models/product.glb',
  wireModel: params.get('wireModel') || 'models/product-wire.glb', // optional (scans); null or ?wireModel=none: lines come from the main mesh
  procedural: null,           // () => THREE.Object3D — build the object by code instead of loading a glb (see buildFallback)
  wireMode: params.get('wiremode') || 'auto',   // ?wiremode=edges to compare. 'auto' | 'wire' (every triangle) | 'edges' (sharp edges only: best for hard-surface, CAD, procedural)
  extraKeys: [],              // extra per-section values (data-<key>, 0 by default) for your own effects; read them in onFrame
  onFrame: null,              // (cur, dt, elapsed) => {} — called every frame, after the pose is applied
  edgeAngle: +(params.get('edgeangle') || 28),   // ?edgeangle=35 to tune.              // without a wire mesh on a dense mesh: draw only edges sharper than this angle (deg)
  wireColors: ['#ffffff', '#0c0c0d'],   // line colour at data-paper 0 and at data-paper 1
  edgeColor: '#ffffff',       // glow at the reveal cut
  recolorOnly: null,          // e.g. ['BodyMaterial']: only these materials take the colourways
  keepPbr: false,             // true = trust the model's PBR (hand-made models with real metal/varnish); false = fix scan/AI materials
  realSizeCm: 30,             // real size of the object's LONGEST side, in cm (drives every displayed measurement)
  explodeFactor: 0.6,         // data-explode=1 moves each part this much × its distance from the centre (needs a model with several meshes)
  normSize: 2,                // longest side in scene units
  orient: [0, 0, 0],          // rotation (rad) mesh → scene. Goal: Y up, length along X
  sweepDir: [0, 0.3, 1],      // reveal-plane direction, in source space
  keepSaturated: params.has('keep') ? +params.get('keep') : 1,   // ?keep=0 to try it. 1 = recolouring respects saturated details (logos, accents). 0 if the product itself is saturated
  fov: 30,                    // low FOV = "product photo" look
  callouts: [                 // f = fraction of the box (0..1 per axis), or p = [x,y,z] in source units; snaps to the nearest vertex
    { n: '01', label: 'Parte uno', f: [0.5, 0.9, 0.0] },
    { n: '02', label: 'Parte dos', f: [0.5, 0.6, 0.6] },
    { n: '03', label: 'Parte tres', f: [1, 0.4, 0.4], mirror: true },
    { n: '04', label: 'Parte cuatro', f: [0.5, 0.08, 1.0] },
  ],
  colorways: [               // mix 0 = original texture. dark/light: luminance recolouring
    { id: 'og', name: 'Original', code: 'Cód. 0001', mix: 0, dark: '#0c0c0d', light: '#f4f2ec', swatches: [['Blanco', '#f4f2ec'], ['Negro', '#0c0c0d']] },
    { id: 'navy', name: 'Azul', code: 'Cód. 0002', mix: 1, dark: '#232849', light: '#f2f2f0', swatches: [['Blanco', '#f2f2f0'], ['Azul', '#262b4b']] },
    { id: 'blackout', name: 'Blackout', code: null, mix: 1, dark: '#060606', light: '#161616', swatches: [['Negro', '#0a0a0a'], ['Carbón', '#161616']], dark_ui: true },
  ],
};

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileMQ = matchMedia('(max-width: 860px)');          // same breakpoint as the CSS
const isMobile = () => mobileMQ.matches;

/* ================================================================== *
 * Renderer, scene, lights: studio photography
 * ================================================================== */
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));       // >2 costs GPU without visible gain
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.NeutralToneMapping;              // keeps the texture's true colour (ACES shifts hues)
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;   // soft studio reflections, no HDR download
scene.environmentIntensity = 0.9;
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 0.55));            // sky/floor bounce

const KEY_OFFSET = new THREE.Vector3(2.2, 5.5, 3.2);
const key = new THREE.DirectionalLight(0xfffaf2, 2.1);     // warm key, casts the shadow
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 6;
key.shadow.blurSamples = 16;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
Object.assign(key.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: 0.5, far: 14 });
scene.add(key, key.target);
const fill = new THREE.DirectionalLight(0xe8eeff, 0.45);   // cool fill
fill.position.set(-4, 1.5, 3);
const rim = new THREE.DirectionalLight(0xfff1dc, 0.9);     // rim light: separates the silhouette from the background
rim.position.set(-3, 3, -4);
scene.add(fill, rim);

const camera = new THREE.PerspectiveCamera(CONFIG.fov, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.25, 6);
camera.lookAt(0, 0, 0);

// Hierarchy: base(position, scale) → roll(rz) → pitch(rx) → yaw(ry) → [shadows, orient → norm → model]
// rz (roll) stands long objects up (a guitar on its stand) without touching the other two axes
// Each axis in its own group = rotations that never fight each other and a stable pivot.
const base = new THREE.Group(), roll = new THREE.Group(), pitch = new THREE.Group(), yaw = new THREE.Group();
const orient = new THREE.Group(), norm = new THREE.Group();
scene.add(base); base.add(roll); roll.add(pitch); pitch.add(yaw); yaw.add(orient); orient.add(norm);
if (DEBUG) yaw.add(new THREE.AxesHelper(1.5));

/* ================================================================== *
 * Shared uniforms + shader patches (see references/shaders.md)
 * ================================================================== */
const U = {
  uSweep: { value: -10 },
  uDir: { value: new THREE.Vector3(...CONFIG.sweepDir).normalize() },
  uEdge: { value: 0.012 },
  uEdgeColor: { value: new THREE.Color(CONFIG.edgeColor || '#ffffff') },
  uWire: { value: 1 },
  uWireColor: { value: new THREE.Color('#ffffff') },
  uCwMix: { value: 0 },
  uCwKeep: { value: CONFIG.keepSaturated },
  uCwDark: { value: new THREE.Color(CONFIG.colorways[0].dark) },
  uCwLight: { value: new THREE.Color(CONFIG.colorways[0].light) },
};

const VERT_HEAD = /* glsl */`
  uniform mat4 uNodeMat;
  varying vec3 vSrc;
`;
const FRAG_HEAD = /* glsl */`
  uniform float uSweep; uniform vec3 uDir; uniform float uEdge; uniform vec3 uEdgeColor;
  uniform float uCwMix; uniform float uCwKeep; uniform vec3 uCwDark; uniform vec3 uCwLight;
  varying vec3 vSrc;
  float sweepDist() { return dot(vSrc, uDir) - uSweep; }   // >0 = still blueprint, <0 = solid
`;
// Colourway: remap luminance to a dark→light ramp; saturated details (logos, red accents) stay as scanned.
const CW_CHUNK = /* glsl */`
  #include <map_fragment>
  {
    vec3 c = diffuseColor.rgb;
    float l = pow(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1.0 / 2.2);
    float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    vec3 rec = mix(uCwDark, uCwLight, smoothstep(0.12, 0.8, l)) * mix(0.85, 1.05, l);
    float keep = smoothstep(0.12, 0.3, sat) * uCwKeep;
    diffuseColor.rgb = mix(c, rec, uCwMix * (1.0 - keep));
  }
`;

// Patch a standard glTF material: discard on the blueprint side of the plane, glowing edge, colourway.
function patchSolid(material, nodeMat) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U, { uNodeMat: { value: nodeMat } });
    shader.vertexShader = VERT_HEAD + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n vSrc = (uNodeMat * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = FRAG_HEAD + shader.fragmentShader
      .replace('#include <map_fragment>', material.userData.noRecolor ? '#include <map_fragment>' : CW_CHUNK)   // userData.noRecolor: this part ignores the colourways
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n float sd = sweepDist(); if (sd > 0.0) discard;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uEdgeColor * 3.0 * (1.0 - smoothstep(0.0, uEdge, -sd));');
  };
  material.needsUpdate = true;
}

const identity = new THREE.Matrix4();
// Blueprint lines: visible only ahead of the plane, brighter right at the cut
const wireMat = new THREE.ShaderMaterial({
  uniforms: { ...U, uNodeMat: { value: identity } },
  transparent: true, depthWrite: false,
  vertexShader: VERT_HEAD + /* glsl */`
    void main() { vSrc = (uNodeMat * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: FRAG_HEAD + /* glsl */`
    uniform float uWire; uniform vec3 uWireColor;
    void main() {
      float sd = sweepDist(); if (sd < 0.0) discard;
      float edge = 1.0 - smoothstep(0.0, uEdge * 4.0, sd);
      gl_FragColor = vec4(mix(uWireColor, uEdgeColor, edge), (0.42 + edge * 0.6) * uWire);
    }`,
});
// Ghost: translucent surface with fresnel rim. Writes depth → hides the back lines (reads as a drawing)
const ghostMat = new THREE.ShaderMaterial({
  uniforms: { ...U, uNodeMat: { value: identity } },
  transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  vertexShader: VERT_HEAD + /* glsl */`
    varying vec3 vN; varying vec3 vV;
    void main() {
      vSrc = (uNodeMat * vec4(position, 1.0)).xyz;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: FRAG_HEAD + /* glsl */`
    uniform float uWire; uniform vec3 uWireColor;
    varying vec3 vN; varying vec3 vV;
    void main() {
      if (sweepDist() < 0.0) discard;
      float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
      gl_FragColor = vec4(uWireColor, (0.05 + fr * 0.35) * uWire);
    }`,
});

// Hidden-line prepass: writes only depth (opaque pass, before every transparent object), so the
// nearest surface hides everything behind it — back lines AND the ghosts of inner parts.
// Same polygonOffset as the ghost, so the ghost passes the depth test exactly where it is in front.
const occluderMat = new THREE.ShaderMaterial({
  uniforms: { ...U, uNodeMat: { value: identity } },
  colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  vertexShader: VERT_HEAD + /* glsl */`
    void main() { vSrc = (uNodeMat * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: FRAG_HEAD + /* glsl */`
    void main() { if (sweepDist() < 0.0) discard; gl_FragColor = vec4(0.0); }`,
});

/* ================================================================== *
 * Loading with real progress
 * ================================================================== */
const loaderEl = document.getElementById('loader');
const loaderBar = document.getElementById('loaderBar');
const loaderPct = document.getElementById('loaderPct');
let pModel = 0, pWire = 0;
const setProgress = () => {
  const p = pModel * 0.85 + pWire * 0.15;
  loaderBar.style.transform = `scaleX(${p})`;
  loaderPct.textContent = `${Math.round(p * 100)}%`;
};

const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const progress = (set) => (e) => { if (e.total) { set(e.loaded / e.total); setProgress(); } };
const modelP = CONFIG.procedural ? Promise.resolve(null) : gltfLoader.loadAsync(CONFIG.model, progress((v) => (pModel = v)))
  .catch((err) => { console.warn(`[3d] ${CONFIG.model} did not load, using the procedural object.`, err); return null; });
const wireP = CONFIG.procedural || !CONFIG.wireModel || CONFIG.wireModel === 'none' ? Promise.resolve(null) : gltfLoader.loadAsync(CONFIG.wireModel, progress((v) => (pWire = v)))
  .catch(() => { pWire = 1; return null; });     // optional
if (CONFIG.procedural) { pModel = pWire = 1; setProgress(); }

let root = null, srcBox = null, ready = false;
let shadow = null, ground = null, sweepRange = [-1, 1];
let wirePositions = null;                         // vertices for snapping the callouts
const parts = [];                                 // meshes for the exploded view: { o, home, offset }

Promise.all([modelP, wireP]).then(([gltf, wireGltf]) => {
  root = gltf ? gltf.scene : (CONFIG.procedural || buildFallback)();
  // CONFIG.orient is baked in here, so "source space" = the model already oriented (Y up, length on X):
  // box, dimensions, sweepDir, callouts and explode offsets are all expressed in that space.
  root.rotation.set(...CONFIG.orient);
  root.updateMatrixWorld(true);                   // root has no parent yet: matrixWorld = node → source
  srcBox = new THREE.Box3().setFromObject(root);

  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();              // a shared material cannot have two uNodeMat values
    const m = o.material;
    // Scans and AI models often bring a fake metalness: leather/rubber/fabric are dielectric
    if (!m.userData.keepPbr && !CONFIG.keepPbr) { m.metalness = 0; m.metalnessMap = null; m.roughness = Math.max(m.roughness ?? 1, 0.75); }
    m.envMapIntensity = 0.85;
    if (m.map) { m.map.anisotropy = renderer.capabilities.getMaxAnisotropy(); m.map.colorSpace = THREE.SRGBColorSpace; }
    o.castShadow = true;
    if (CONFIG.recolorOnly && !CONFIG.recolorOnly.includes(m.name)) m.userData.noRecolor = true;
    patchSolid(m, o.matrixWorld.clone());
  });

  buildWire(wireGltf);

  // (computed before root is re-parented, so every matrixWorld is still in source space)
  const srcCenter = srcBox.getCenter(new THREE.Vector3());
  // Exploded view: each mesh moves along userData.explode ([x,y,z] in source units) if it has one,
  // otherwise away from the centre along the line that joins them
  root.traverse((o) => {
    if (!o.isMesh || o.material.isShaderMaterial) return;          // skip the blueprint helpers
    const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    const inv = o.parent.matrixWorld.clone().invert();
    const a = c.clone().applyMatrix4(inv);
    const off = o.userData.explode ? new THREE.Vector3(...o.userData.explode) : c.clone().sub(srcCenter).multiplyScalar(CONFIG.explodeFactor);
    const b = c.clone().add(off).applyMatrix4(inv);
    parts.push({ o, home: o.position.clone(), offset: b.sub(a) });
  });

  // Normalise: centre the box and scale its longest side to normSize
  const size = srcBox.getSize(new THREE.Vector3());
  const center = srcBox.getCenter(new THREE.Vector3());
  const s = CONFIG.normSize / Math.max(size.x, size.y, size.z);
  norm.scale.setScalar(s);
  norm.position.copy(center).multiplyScalar(-s);
  norm.add(root);

  const corners = boxCorners(srcBox);
  const proj = corners.map((c) => c.dot(U.uDir.value));
  sweepRange = [Math.min(...proj) - 0.02, Math.max(...proj) + 0.02];

  // Floor = lowest point of the box after orient/norm, in yaw space
  orient.updateMatrix(); norm.updateMatrix();
  const toYaw = new THREE.Matrix4().multiplyMatrices(orient.matrix, norm.matrix);
  const floorY = Math.min(...corners.map((c) => c.clone().applyMatrix4(toYaw).y));

  shadow = new THREE.Mesh(                       // soft contact shadow (fake, cheap, always pretty)
    new THREE.PlaneGeometry(CONFIG.normSize * 1.12, CONFIG.normSize * 0.5),
    new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, depthWrite: false, opacity: 0 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = floorY - 0.005;
  ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0, transparent: true }));
  ground.rotation.x = -Math.PI / 2;               // real shadow from the key light, on an invisible floor
  ground.position.y = floorY - 0.007;
  ground.receiveShadow = true;
  yaw.add(shadow, ground);

  snapCallouts();
  fillDimensions(size);
  ready = true;
  measure();
  requestAnimationFrame(() => loaderEl.classList.add('is-done'));
});

// Meshopt/quantised glbs store positions as int16 (+ a node scale). Raw arrays are NOT metres, and
// applyMatrix4 on them clamps or rounds: work on a plain Float32 copy of position/normal.
function toFloatGeometry(src) {
  const g = src.clone();
  for (const name of ['position', 'normal']) {
    const a = g.getAttribute(name);
    if (!a || (a.array instanceof Float32Array && !a.normalized && !a.isInterleavedBufferAttribute)) continue;
    const out = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) { out[i * 3] = a.getX(i); out[i * 3 + 1] = a.getY(i); out[i * 3 + 2] = a.getZ(i); }
    g.setAttribute(name, new THREE.Float32BufferAttribute(out, 3));
  }
  return g;
}

// Blueprint lines + ghost. Priority: dedicated wire mesh > full wireframe if light > sharp edges only
function buildWire(wireGltf) {
  const group = new THREE.Group();
  const geos = [];
  const collect = (obj) => {
    if (obj !== root) obj.rotation.set(...CONFIG.orient);   // the wire mesh gets the same orientation
    obj.updateMatrixWorld(true);
    obj.traverse((o) => { if (o.isMesh && !o.userData.noWire) geos.push(toFloatGeometry(o.geometry).applyMatrix4(o.matrixWorld)); });
  };
  if (wireGltf) collect(wireGltf.scene); else collect(root);
  const tris = geos.reduce((n, g) => n + (g.index ? g.index.count : g.attributes.position.count) / 3, 0);
  const mode = CONFIG.wireMode !== 'auto' ? CONFIG.wireMode : (!wireGltf && tris > 20000 ? 'edges' : 'wire');
  const useEdges = mode === 'edges';
  if (useEdges && CONFIG.wireMode === 'auto') console.info(`[3d] No wire mesh: drawing edges > ${CONFIG.edgeAngle}°. For better lines run scripts/prepare-model.sh`);

  const pts = [];
  for (const g of geos) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const occ = new THREE.Mesh(g, occluderMat); occ.renderOrder = -1;
    const ghost = new THREE.Mesh(g, ghostMat); ghost.renderOrder = 1;
    const lineGeo = useEdges ? new THREE.EdgesGeometry(g, CONFIG.edgeAngle) : new THREE.WireframeGeometry(g);
    const lines = new THREE.LineSegments(lineGeo, wireMat); lines.renderOrder = 2;
    group.add(occ, ghost, lines);
    pts.push(g.attributes.position.array);
  }
  wirePositions = pts;
  norm.add(group);                                 // already in source space (identity uNodeMat): sibling of root
}

// Procedural object (bottle) when there is no glb yet. Replace it with the real model.
function buildFallback() {
  const prof = [[0, 0], [0.034, 0], [0.037, 0.004], [0.037, 0.15], [0.034, 0.175], [0.016, 0.205], [0.014, 0.24], [0.015, 0.25], [0, 0.25]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#f2efe6'; x.fillRect(0, 0, 512, 512);
  x.fillStyle = '#0d0d0e'; x.fillRect(0, 150, 512, 170);
  x.fillStyle = '#c8321e'; x.beginPath(); x.arc(256, 235, 34, 0, Math.PI * 2); x.fill();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })));
  return g;
}

function boxCorners(b) {
  const out = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) out.push(new THREE.Vector3(x, y, z));
  return out;
}
function radialTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const fromFrac = (fx, fy, fz) => new THREE.Vector3(
  srcBox.min.x + (srcBox.max.x - srcBox.min.x) * fx,
  srcBox.min.y + (srcBox.max.y - srcBox.min.y) * fy,
  srcBox.min.z + (srcBox.max.z - srcBox.min.z) * fz);

function nearestVertex(t) {
  let best = null, bd = Infinity;
  for (const pos of wirePositions) for (let i = 0; i < pos.length; i += 3) {
    const d = (pos[i] - t.x) ** 2 + (pos[i + 1] - t.y) ** 2 + (pos[i + 2] - t.z) ** 2;
    if (d < bd) { bd = d; best = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]); }
  }
  return best;
}
function snapCallouts() {
  for (const c of CONFIG.callouts) {
    c.anchors = [nearestVertex(c.p ? new THREE.Vector3(...c.p) : fromFrac(...c.f))];
    // mirror: the same part on the other side (mirrored on source X); the one facing the camera wins
    if (c.mirror && c.f) c.anchors.push(nearestVertex(fromFrac(1 - c.f[0], c.f[1], c.f[2])));
  }
}

/* ================================================================== *
 * Real dimensions, taken from the model
 * ================================================================== */
const dims = { length: 0, height: 0, width: 0 };
function fillDimensions(size) {
  const k = CONFIG.realSizeCm / Math.max(size.x, size.y, size.z);
  dims.length = Math.max(size.x, size.z) * k;
  dims.width = Math.min(size.x, size.z) * k;
  dims.height = size.y * k;
  document.querySelectorAll('[data-dim]').forEach((el) => { el.textContent = `${dims[el.dataset.dim].toFixed(1)} cm`; });
  document.querySelectorAll('[data-dim-count]').forEach((el) => {
    const v = el.dataset.dimCount === 'ratio' ? dims.length / dims.width : dims[el.dataset.dimCount];
    el.dataset.to = v.toFixed(2);
  });
}

/* ================================================================== *
 * Scroll choreography: poses declared in the HTML, interpolated here
 * ================================================================== */
const KEYS = ['ry', 'rx', 'rz', 'x', 'y', 'scale', 'reveal', 'wire', 'dims', 'callouts', 'paper', 'explode', ...(CONFIG.extraKeys || [])];
const stops = [...document.querySelectorAll('[data-ry]')];
const num = (v, d = 0) => (v === undefined || v === '' ? d : parseFloat(v));
const values = stops.map((el) => Object.fromEntries(KEYS.map((k) => [k, num(el.dataset[k])])));
// Mobile: data-m-<key> if present; x stays centred unless data-m-x says otherwise
const valuesM = stops.map((el, i) => Object.fromEntries(KEYS.map((k) => {
  const m = el.dataset['m' + k[0].toUpperCase() + k.slice(1)];
  return [k, m !== undefined ? parseFloat(m) : k === 'x' ? 0 : values[i][k]];
})));
let anchors = [], anatomyCentre = 0;
// Sticky titles only show once docked: as they slide in from below they would cross the object
const stickies = [...document.querySelectorAll('.sticky')].map((el) => ({ el, top: NaN, bottom: NaN }));

function measure() {
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  // each stop "arrives" when its section's centre crosses the centre of the window
  anchors = stops.map((el, i) => {
    let a = el.offsetTop + el.offsetHeight / 2 - innerHeight / 2;
    if (i === 0) a = 0;
    if (i === stops.length - 1) a = maxScroll;
    return Math.max(0, Math.min(maxScroll, a));
  });
  for (const s of stickies) { const cs = getComputedStyle(s.el); s.top = parseFloat(cs.top); s.bottom = parseFloat(cs.bottom); }
  const an = stops.find((s) => num(s.dataset.callouts) > 0);
  if (an) anatomyCentre = an.offsetTop + an.offsetHeight / 2;
}

const target = { ...values[0] };
const cur = { ...values[0] };
let activeIndex = 0;
const smooth = (t) => t * t * (3 - 2 * t);

function sampleScroll() {
  const y = scrollY;
  let i = 0;
  while (i < anchors.length - 2 && y > anchors[i + 1]) i++;
  const a = anchors[i], b = anchors[i + 1];
  const t = b > a ? smooth(Math.min(1, Math.max(0, (y - a) / (b - a)))) : 0;
  const vals = isMobile() ? valuesM : values;
  for (const k of KEYS) target[k] = vals[i][k] + (vals[i + 1][k] - vals[i][k]) * t;
  if (WIRE_ONLY) { target.reveal = 0; target.wire = 1; target.paper = 0; }
  activeIndex = t > 0.5 ? i + 1 : i;
  return y / Math.max(1, anchors[anchors.length - 1]);
}

/* ================================================================== *
 * Drag to rotate: inertia, then a spring back to the choreographed pose
 * ================================================================== */
const drag = { active: false, id: null, lastX: 0, lastY: 0, offY: 0, offX: 0, velY: 0, lastMove: 0 };
canvas.addEventListener('pointerdown', (e) => {
  if (drag.active) return;
  Object.assign(drag, { active: true, id: e.pointerId, lastX: e.clientX, lastY: e.clientY });
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('is-dragging');
  if (DEBUG) debugPick(e);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag.active || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.lastX, dy = e.clientY - drag.lastY;
  drag.lastX = e.clientX; drag.lastY = e.clientY;
  drag.offY += dx * 0.008; drag.velY = dx * 0.008;
  drag.offX = Math.max(-0.5, Math.min(0.5, drag.offX + dy * 0.004));
  drag.lastMove = performance.now();
});
const endDrag = (e) => {
  if (e.pointerId !== drag.id) return;
  drag.active = false; drag.id = null;
  if (performance.now() - drag.lastMove > 80) drag.velY = 0;   // held still before letting go: no fling
  canvas.classList.remove('is-dragging');
};
['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => canvas.addEventListener(ev, endDrag));

/* ================================================================== *
 * SVG overlay: dimension lines and callouts, projected every frame
 * ================================================================== */
const svg = document.getElementById('overlay');
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent = svg) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent.appendChild(n);
  return n;
};
const defs = el('defs');
const marker = el('marker', { id: 'tick', viewBox: '-6 -6 12 12', markerWidth: 12, markerHeight: 12, orient: 'auto-start-reverse' }, defs);
el('path', { d: 'M -4 4 L 4 -4', class: 'dim-tick' }, marker);

const dimG = el('g', { opacity: 0 });
const dimParts = [0, 1].map(() => ({
  ext1: el('line', { class: 'dim-ext' }, dimG),
  ext2: el('line', { class: 'dim-ext' }, dimG),
  line: el('path', { class: 'dim-line', 'marker-start': 'url(#tick)', 'marker-end': 'url(#tick)' }, dimG),
  bg: el('rect', { class: 'dim-label-bg', height: 18 }, dimG),
  text: el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, dimG),
}));
const coG = el('g', { opacity: 0 });
const coParts = CONFIG.callouts.map((c) => {
  const g = el('g', {}, coG);
  return { c, g, line: el('path', { class: 'co-line' }, g), dot: el('circle', { class: 'co-dot', r: 4 }, g),
    num: el('text', { class: 'co-num' }, g), text: el('text', {}, g) };
});

const v3 = new THREE.Vector3();
function project(src) {
  v3.copy(src); norm.localToWorld(v3); v3.project(camera);   // norm's local space = source space
  return [(v3.x * 0.5 + 0.5) * innerWidth, (-v3.y * 0.5 + 0.5) * innerHeight, v3.z];
}
const projectNearest = (list) => list.map(project).sort((a, b) => a[2] - b[2])[0];

function drawDim(p, a, b, offset, label) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L * offset, ny = dx / L * offset;
  const A = [a[0] + nx, a[1] + ny], B = [b[0] + nx, b[1] + ny];
  const set = (n, o) => { for (const k in o) n.setAttribute(k, o[k]); };
  set(p.ext1, { x1: a[0], y1: a[1], x2: A[0] + nx * 0.25, y2: A[1] + ny * 0.25 });
  set(p.ext2, { x1: b[0], y1: b[1], x2: B[0] + nx * 0.25, y2: B[1] + ny * 0.25 });
  p.line.setAttribute('d', `M${A[0]},${A[1]} L${B[0]},${B[1]}`);
  const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, w = label.length * 7.4 + 16;
  p.text.textContent = label;
  set(p.bg, { x: mx - w / 2, y: my - 9, width: w });
  set(p.text, { x: mx, y: my });
}

function updateOverlay() {
  if (!ready) return;
  dimG.setAttribute('opacity', cur.dims.toFixed(3));
  coG.setAttribute('opacity', (isMobile() ? 0 : cur.callouts).toFixed(3));
  if (cur.dims > 0.01) {
    const alongZ = (srcBox.max.z - srcBox.min.z) >= (srcBox.max.x - srcBox.min.x);
    const a = alongZ ? fromFrac(0.5, 0, 0) : fromFrac(0, 0, 0.5);
    const b = alongZ ? fromFrac(0.5, 0, 1) : fromFrac(1, 0, 0.5);
    let pa = project(a), pb = project(b);
    const heel = pa[0] <= pb[0] ? a : b;                 // the height line goes on whichever end is on the left of the screen
    if (pa[0] > pb[0]) [pa, pb] = [pb, pa];
    drawDim(dimParts[0], pa, pb, 44, `${dims.length.toFixed(1)} CM`);
    const top = heel.clone(); top.y = srcBox.max.y;
    drawDim(dimParts[1], project(heel), project(top), 48, `${dims.height.toFixed(1)} CM`);
  }
  if (cur.callouts > 0.01 && !isMobile()) {
    const M = Math.max(48, innerWidth * 0.06), ROW = 72, n = coParts.length;
    const centre = anatomyCentre - scrollY;             // the rows ride with the section
    const top = centre - ((n - 1) / 2) * ROW;
    coParts.forEach((p, i) => {
      const [ax, ay] = projectNearest(p.c.anchors);
      const lx = M, ly = top + i * ROW, end = lx + 220, elbow = end + 24;
      p.line.setAttribute('d', `M${end},${ly} L${elbow},${ly} L${ax},${ay}`);
      p.dot.setAttribute('cx', ax); p.dot.setAttribute('cy', ay);
      p.num.setAttribute('x', lx); p.num.setAttribute('y', ly); p.num.textContent = p.c.n;
      p.text.setAttribute('x', lx + 40); p.text.setAttribute('y', ly); p.text.textContent = p.c.label;
      // stagger by index, and fade near the window edges so no line hangs off-screen as the row scrolls away
      const edge = Math.min(1, Math.max(0, Math.min(ly - 60, innerHeight - 60 - ly) / 80));
      p.g.setAttribute('opacity', (Math.min(1, Math.max(0, cur.callouts * 1.6 - i * 0.12)) * edge).toFixed(3));
    });
  }
}

/* ================================================================== *
 * HUD: progress rail, background, labels
 * ================================================================== */
const paperEl = document.querySelector('.backdrop__paper');
const gridEl = document.querySelector('.backdrop__grid');
const railFill = document.getElementById('railFill');
const railLabel = document.getElementById('railLabel');
let lastIdx = -1, lastPaper = null;
function updateDocked() {
  for (const s of stickies) {
    const r = s.el.getBoundingClientRect();
    const docked = !Number.isNaN(s.top) ? Math.abs(r.top - s.top) < 2 : !Number.isNaN(s.bottom) && Math.abs(innerHeight - r.bottom - s.bottom) < 2;
    if (docked !== s.el.classList.contains('is-docked')) s.el.classList.toggle('is-docked', docked);
  }
}
function updateHud(p) {
  railFill.style.transform = `scaleX(${p.toFixed(4)})`;
  const paper = smooth(Math.min(1, Math.max(0, (cur.paper - 0.45) / 0.45)));
  paperEl.style.opacity = paper.toFixed(3);
  gridEl.style.opacity = (1 - paper).toFixed(3);
  const isPaper = paper > 0.5;
  if (isPaper !== lastPaper) { document.body.classList.toggle('is-paper', isPaper); lastPaper = isPaper; }
  if (activeIndex !== lastIdx) { railLabel.textContent = stops[activeIndex].dataset.label || ''; lastIdx = activeIndex; }
  return paper;
}

/* ================================================================== *
 * Main loop
 * ================================================================== */
measure();
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  measure();
});
addEventListener('load', measure);
document.fonts?.ready.then(measure);
new ResizeObserver(measure).observe(document.querySelector('main'));

const wireA = new THREE.Color((CONFIG.wireColors || [])[0] || '#ffffff'), wireB = new THREE.Color((CONFIG.wireColors || [])[1] || '#0c0c0d');
const cwTarget = { mix: CONFIG.colorways[0].mix, dark: new THREE.Color(CONFIG.colorways[0].dark), light: new THREE.Color(CONFIG.colorways[0].light) };
let lastT = performance.now(), elapsed = 0, spinAngle = 0;
const TAU = Math.PI * 2;

function frame(now = performance.now()) {
  const dt = Math.min((now - lastT) / 1000, 0.05);   // clamp: a hidden tab does not cause a jump
  lastT = now; elapsed += dt;
  const p = sampleScroll();
  // Exponential damping, frame-rate independent: this is what gives "weight"
  const k = 1 - Math.exp(-dt * 6);
  for (const key of KEYS) cur[key] += (target[key] - cur[key]) * k;

  if (!drag.active) {
    drag.offY += drag.velY; drag.velY *= 0.92;
    if (performance.now() - drag.lastMove > 1400) {   // after a pause, back to the pose the short way
      drag.offY -= Math.round(drag.offY / TAU) * TAU;
      drag.offY += -drag.offY * (1 - Math.exp(-dt * 2));
      drag.offX += -drag.offX * (1 - Math.exp(-dt * 2));
    }
  }
  const sway = reduceMotion ? 0 : Math.sin(elapsed * 0.5) * 0.12 * Math.max(0, 1 - p * 6);   // idle breathing in the hero
  const spinRate = reduceMotion ? 0 : Math.min(1, Math.max(0, (p - 0.94) / 0.06));       // turntable at the end
  if (spinRate > 0) spinAngle += dt * 0.35 * spinRate;
  else if (spinAngle) {
    const home = Math.round(spinAngle / TAU) * TAU;
    spinAngle += (home - spinAngle) * (1 - Math.exp(-dt * 2));
    if (Math.abs(home - spinAngle) < 1e-4) spinAngle = 0;
  }

  // Position as a fraction of the visible frame → the layout works at any aspect ratio
  const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const visW = visH * camera.aspect;
  const mobile = isMobile();
  const fit = mobile ? Math.min((visW * 0.96) / CONFIG.normSize, (visH * 0.62) / CONFIG.normSize) : Math.min(1.25, visW / 5.2);
  base.position.set(cur.x * visW, (mobile ? visH * 0.2 : 0) + cur.y * visH, 0);
  base.scale.setScalar(cur.scale * fit);
  roll.rotation.z = cur.rz;
  pitch.rotation.x = cur.rx + drag.offX;
  yaw.rotation.y = cur.ry + drag.offY + sway + spinAngle;
  if (parts.length > 1) for (const pt of parts) pt.o.position.copy(pt.home).addScaledVector(pt.offset, cur.explode);
  CONFIG.onFrame?.(cur, dt, elapsed);

  U.uSweep.value = sweepRange[0] + (sweepRange[1] - sweepRange[0]) * cur.reveal;
  const paper = updateHud(p);
  updateDocked();
  const darkUi = document.body.classList.contains('is-dark');
  U.uWireColor.value.copy(wireA).lerp(wireB, darkUi ? 0 : paper);
  U.uWire.value = Math.max(cur.wire, 0);
  const flat = Math.pow(Math.max(0, Math.cos(cur.rz)), 6);   // the floor shadows fade out when the object is stood up
  if (shadow) shadow.material.opacity = (0.12 + paper * 0.5) * flat;
  if (ground) ground.material.opacity = paper * (darkUi ? 0.5 : 0.22) * flat;
  // the key light and its shadow frustum follow the object wherever the layout moves it
  key.target.position.copy(base.position);
  key.position.copy(base.position).add(KEY_OFFSET);
  const sc = 2.2 * base.scale.x;
  if (Math.abs(key.shadow.camera.right - sc) > 0.01) {
    Object.assign(key.shadow.camera, { left: -sc, right: sc, top: sc, bottom: -sc });
    key.shadow.camera.updateProjectionMatrix();
  }
  scene.environmentIntensity = 0.75 + paper * 0.35;
  const kc = 1 - Math.exp(-dt * 7);
  U.uCwMix.value += (cwTarget.mix - U.uCwMix.value) * kc;
  U.uCwDark.value.lerp(cwTarget.dark, kc);
  U.uCwLight.value.lerp(cwTarget.light, kc);

  renderer.render(scene, camera);
  updateOverlay();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// QA: with ?debug, __settle() jumps to the current scroll's final pose (handy when the browser throttles rAF)
if (DEBUG) window.__settle = () => { sampleScroll(); Object.assign(cur, target); drag.offX = drag.offY = drag.velY = 0; };
// ?shot=<section id>: open already settled on that section, with no loader or transitions
// (screenshots, social previews: chrome --headless --screenshot "page.html?shot=anatomia")
const SHOT = params.get('shot');
if (SHOT) {
  document.documentElement.classList.add('is-shot');
  modelP.then(() => setTimeout(() => {
    const el = document.getElementById(SHOT);
    if (el) scrollTo(0, Math.max(0, el.offsetTop + el.offsetHeight / 2 - innerHeight / 2));
    document.querySelectorAll('.reveal, .card').forEach((n) => n.classList.add('in-view'));
    sampleScroll(); Object.assign(cur, target);
  }, 400));
}
// QA: __dbg() returns the live state (model, source box in model units, current/target pose)
if (DEBUG) window.__dbg = () => ({ root, norm, camera, callouts: CONFIG.callouts, srcBox, cur, target, size: srcBox && srcBox.getSize(new THREE.Vector3()).toArray() });

/* ================================================================== *
 * Entrance reveals, counters
 * ================================================================== */
document.querySelectorAll('.copy > *, .hero > *, .metrics__head > *, .outro > *').forEach((n, i) => {
  n.classList.add('reveal');
  n.style.transitionDelay = `${(i % 6) * 60}ms`;
});
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
function countUp(node) {
  const to = parseFloat(node.dataset.to || '0'), dec = parseInt(node.dataset.dec || '0', 10);
  // formatted in the page's language: 118,69 in es, 118.69 in en
  const nf = new Intl.NumberFormat(document.documentElement.lang || undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
  if (reduceMotion) { node.textContent = nf.format(to); return; }
  const t0 = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - t0) / 1300);
    node.textContent = nf.format(to * easeOut(t));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in-view');
    // counters wait for the model (their value comes from the scan)
    const run = () => e.target.querySelectorAll('.count').forEach(countUp);
    ready ? run() : modelP.then(() => setTimeout(run, 50));
    io.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -4% 0px' });
document.querySelectorAll('.reveal, .card').forEach((n) => io.observe(n));

/* ================================================================== *
 * Colourways
 * ================================================================== */
const cwBar = document.querySelector('.colorways');
const pill = cwBar.querySelector('.colorways__pill');
const swatchBox = document.querySelector('.swatches');
const cwCode = document.getElementById('cwCode');
const tabs = CONFIG.colorways.map((cw, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(i === 0));
  b.innerHTML = `<i style="--a:${cw.dark};--b:${cw.light}"></i><span>${cw.name}</span>`;
  b.addEventListener('click', () => setColorway(cw, b));
  cwBar.appendChild(b);
  return b;
});
const movePill = (btn) => { pill.style.width = `${btn.offsetWidth}px`; pill.style.transform = `translateX(${btn.offsetLeft}px)`; };
const selected = () => tabs.find((t) => t.getAttribute('aria-selected') === 'true');
function renderSwatches(cw) {
  if (swatchBox) swatchBox.innerHTML = cw.swatches.map(([n, c]) => `<span style="--c:${c}"><em class="mono">${n}</em></span>`).join('');
  if (cwCode) cwCode.textContent = cw.code || 'Fuera de catálogo';
}
function setColorway(cw, btn) {
  // coming from the original texture: start the remap from its colours so the fade is smooth
  if (U.uCwMix.value < 0.01) { U.uCwDark.value.set(CONFIG.colorways[0].dark); U.uCwLight.value.set(CONFIG.colorways[0].light); }
  cwTarget.mix = cw.mix; cwTarget.dark.set(cw.dark); cwTarget.light.set(cw.light);
  tabs.forEach((t) => t.setAttribute('aria-selected', String(t === btn)));
  movePill(btn);
  renderSwatches(cw);
  document.body.classList.toggle('is-dark', !!cw.dark_ui);
}
cwBar.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const i = tabs.indexOf(selected());
  const j = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
  tabs[j].focus(); setColorway(CONFIG.colorways[j], tabs[j]);
});
renderSwatches(CONFIG.colorways[0]);
new ResizeObserver(() => movePill(selected())).observe(cwBar);   // late fonts change the widths
movePill(tabs[0]);

/* ================================================================== *
 * Debug: click → box fraction of the point (to place the callouts)
 * ================================================================== */
function debugPick(e) {
  if (!ready) return;
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hit = rc.intersectObject(norm, true).find((h) => h.object.isMesh && !h.object.material.isShaderMaterial);
  if (!hit) return;
  const q = norm.worldToLocal(hit.point.clone());
  const f = ['x', 'y', 'z'].map((a) => +((q[a] - srcBox.min[a]) / (srcBox.max[a] - srcBox.min[a])).toFixed(3));
  console.log('[debug] callout f:', JSON.stringify(f));
}
