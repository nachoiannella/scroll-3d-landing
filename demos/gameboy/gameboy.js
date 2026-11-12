// Procedural model of the original handheld (DMG-01), in real millimetres:
// 90 (X) × 148 (Y) × 32 (Z) mm, front facing +Z. Every part is its own mesh so it can be
// exploded: userData.explode = [x, y, z] mm offset when data-explode = 1.
// Original geometry and pixel art; no logos or trademarks are reproduced.
import * as THREE from 'three';

const W = 90, H = 148;
const BEVEL = 1.5;

// --- materials ---------------------------------------------------------------
const mat = (color, roughness, extra = {}) => {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
  m.userData.keepPbr = true;          // tuned by hand: the engine must not "fix" them
  return m;
};
const fixed = (m) => { m.userData.noRecolor = true; return m; };   // ignores colourways

const M = {
  shell: mat('#b2aea6', 0.5),                       // warm grey ABS (this is what the colourways repaint)
  bezel: fixed(mat('#4b4f5e', 0.38)),                // slate-grey screen surround
  dark: fixed(mat('#2b2b30', 0.45)),                 // D-pad
  rubber: fixed(mat('#45454b', 0.7)),                // start / select
  berry: fixed(mat('#9b2c5a', 0.34)),                // A / B
  slot: fixed(mat('#7d7a74', 0.8)),
  lineA: fixed(mat('#8e2b55', 0.5)),
  lineB: fixed(mat('#2f3c7e', 0.5)),
  led: fixed(mat('#5a1010', 0.4, { emissive: '#ff2a1a', emissiveIntensity: 0 })),
  pcb: fixed(mat('#1d5a3c', 0.55)),
  chip: fixed(mat('#141416', 0.35)),
  cart: fixed(mat('#8f8e93', 0.5)),
  battery: fixed(mat('#33373f', 0.4)),
  batteryTip: fixed(new THREE.MeshStandardMaterial({ color: '#b9bcc2', roughness: 0.25, metalness: 1 })),
};
M.batteryTip.userData.keepPbr = true;

// --- shapes -------------------------------------------------------------------
// rounded rectangle with a radius per corner (the bottom-right one is the famous big one)
function roundedRect(w, h, tl, tr, br, bl) {
  const x = -w / 2, y = -h / 2, s = new THREE.Shape();
  s.moveTo(x + bl, y);
  s.lineTo(x + w - br, y); s.quadraticCurveTo(x + w, y, x + w, y + br);
  s.lineTo(x + w, y + h - tr); s.quadraticCurveTo(x + w, y + h, x + w - tr, y + h);
  s.lineTo(x + tl, y + h); s.quadraticCurveTo(x, y + h, x, y + h - tl);
  s.lineTo(x, y + bl); s.quadraticCurveTo(x, y, x + bl, y);
  return s;
}
function slab(shape, depth, bevel = 0, segs = 3) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, depth - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: segs, curveSegments: 18,
  });
  g.translate(0, 0, bevel);           // the slab goes from z = 0 to z = depth
  return g;
}
const mesh = (geo, m, pos = [0, 0, 0], explode = [0, 0, 0], rotZ = 0) => {
  const o = new THREE.Mesh(geo, m);
  o.position.set(...pos); o.rotation.z = rotZ;
  o.userData.explode = explode;
  o.castShadow = true; o.receiveShadow = true;
  return o;
};

// --- LCD: 160 × 144 canvas with the four classic greens -----------------------------
const PAL = ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'];   // light → dark
const OFF = '#8d9867';                                     // screen switched off
const lcdCanvas = document.createElement('canvas');
lcdCanvas.width = 160; lcdCanvas.height = 144;
const g2 = lcdCanvas.getContext('2d');
const lcdTex = new THREE.CanvasTexture(lcdCanvas);
lcdTex.colorSpace = THREE.SRGBColorSpace;
lcdTex.magFilter = THREE.NearestFilter;                    // real pixels when you get close

const FONT = {   // 3×5 pixel font, only the glyphs we use
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'], '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'], 'P': ['110', '101', '110', '100', '100'], 'R': ['110', '101', '110', '101', '101'],
  'E': ['111', '100', '110', '100', '111'], 'S': ['011', '100', '010', '001', '110'], 'T': ['111', '010', '010', '010', '010'],
  'A': ['010', '101', '111', '101', '101'], ' ': ['000', '000', '000', '000', '000'],
};
function text(str, x, y, scale, color) {
  g2.fillStyle = color;
  [...str].forEach((ch, i) => FONT[ch].forEach((row, r) => [...row].forEach((b, c) => {
    if (b === '1') g2.fillRect(x + (i * 4 + c) * scale, y + r * scale, scale, scale);
  })));
}
// an original little character (12×12): 1..3 = palette index
const SPRITE = [
  '....3333....', '...322223...', '..32222223..', '..32133123..', '..32222223..', '...322223...',
  '....3333....', '...333333...', '..3.3223.3..', '....3333....', '....3..3....', '...33..33...',
];
function drawScene(offY, blink) {
  g2.fillStyle = PAL[0]; g2.fillRect(0, 0, 160, 144);
  g2.save(); g2.translate(0, Math.round(offY));
  // sun
  for (let y = -11; y <= 11; y++) for (let x = -11; x <= 11; x++) if (x * x + y * y <= 121) { g2.fillStyle = PAL[1]; g2.fillRect(126 + x, 30 + y, 1, 1); }
  // far mountains / near hills / ground: one column per pixel = real pixel look
  for (let x = 0; x < 160; x++) {
    const far = 62 + Math.round(10 * Math.sin(x * 0.07) + 6 * Math.sin(x * 0.19 + 1));
    const near = 86 + Math.round(6 * Math.sin(x * 0.11 + 2) + 3 * Math.sin(x * 0.31));
    g2.fillStyle = PAL[1]; g2.fillRect(x, far, 1, 144 - far);
    g2.fillStyle = PAL[2]; g2.fillRect(x, near, 1, 144 - near);
  }
  g2.fillStyle = PAL[3]; g2.fillRect(0, 108, 160, 36);
  g2.fillStyle = PAL[2]; for (let x = 0; x < 160; x += 8) g2.fillRect(x, 112, 4, 2);
  // character standing on the ground
  SPRITE.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch !== '.') { g2.fillStyle = PAL[+ch]; g2.fillRect(30 + c * 2, 84 + r * 2, 2, 2); }
  }));
  text('1989', 56, 14, 3, PAL[3]);
  g2.restore();
  if (blink) text('PRESS START', 37, 124, 2, PAL[0]);
}
let lastScreen = -1, lastBlink = null;
function paintLcd(s, t) {
  const blink = s > 0.98 && Math.floor(t * 1.6) % 2 === 0;
  if (Math.abs(s - lastScreen) < 0.004 && blink === lastBlink) return;
  lastScreen = s; lastBlink = blink;
  if (s < 0.02) { g2.fillStyle = OFF; g2.fillRect(0, 0, 160, 144); }
  else {
    // "boot": the image comes down from the top, like the start-up scroll
    const k = Math.min(1, s / 0.8), e = k * k * (3 - 2 * k);
    drawScene(-(1 - e) * 120, blink);
    g2.globalAlpha = 1 - Math.min(1, s * 1.6); g2.fillStyle = OFF; g2.fillRect(0, 0, 160, 144); g2.globalAlpha = 1;
  }
  lcdTex.needsUpdate = true;
}
paintLcd(0, 0);
M.lcd = fixed(mat('#ffffff', 0.32, { map: lcdTex, emissiveMap: lcdTex, emissive: '#ffffff', emissiveIntensity: 0 }));

// cartridge label: abstract original artwork
function labelTexture() {
  // light label (from behind it must not read as a second screen): two stripes + embossed text
  const c = document.createElement('canvas'); c.width = 256; c.height = 220;
  const x = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
  x.fillStyle = '#e9e4d6'; x.fillRect(0, 0, 256, 220);
  x.fillStyle = '#9b2c5a'; x.fillRect(0, 22, 256, 10);
  x.fillStyle = '#2f3c7e'; x.fillRect(0, 38, 256, 10);
  x.fillStyle = '#1b1b1e'; x.font = '400 64px "Instrument Serif", serif'; x.fillText('Cartucho', 16, 128);
  x.font = '500 18px "Geist Mono", monospace'; x.fillText('DMG · 1989 · Nº 01', 18, 196);
  t.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);          // redraw once the web fonts are in
  return t;
}

// --- assembly -----------------------------------------------------------------------
// the engine clones every material per mesh, so animated parts are reached through their meshes
let lcdMesh = null, ledMesh = null;
export function buildGameBoy() {
  const root = new THREE.Group();
  const body = roundedRect(W - BEVEL * 2, H - BEVEL * 2, 5, 5, 24, 5);
  const FRONT = 15;                                   // front face z

  // shells: front and back, with a 0.4 mm seam
  root.add(mesh(slab(body, 14.8, BEVEL), M.shell, [0, 0, 0.2], [0, 0, 46]));
  root.add(mesh(slab(body, 14.8, BEVEL), M.shell, [0, 0, -15], [0, 0, -48]));

  // screen surround + its two lines + LCD + battery LED
  const bez = mesh(slab(roundedRect(76, 58, 3, 3, 14, 3), 0.6), M.bezel, [0, 36, FRONT], [0, 0, 60]);
  root.add(bez);
  root.add(mesh(new THREE.BoxGeometry(70, 0.7, 0.25), M.lineA, [0, 61.3, FRONT + 0.6], [0, 0, 60]));
  root.add(mesh(new THREE.BoxGeometry(70, 0.7, 0.25), M.lineB, [0, 59.9, FRONT + 0.6], [0, 0, 60]));
  lcdMesh = mesh(new THREE.PlaneGeometry(47, 43), M.lcd, [3, 35, FRONT + 0.66], [0, 0, 66]);
  ledMesh = mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.8, 20).rotateX(Math.PI / 2), M.led, [-29, 42, FRONT + 0.8], [0, 0, 60]);
  root.add(lcdMesh, ledMesh);

  // D-pad: an extruded cross with a soft bevel
  const a = 3.9, l = 12.2, cross = new THREE.Shape();
  cross.moveTo(-a, l); cross.lineTo(a, l); cross.lineTo(a, a); cross.lineTo(l, a); cross.lineTo(l, -a); cross.lineTo(a, -a);
  cross.lineTo(a, -l); cross.lineTo(-a, -l); cross.lineTo(-a, -a); cross.lineTo(-l, -a); cross.lineTo(-l, a); cross.lineTo(-a, a); cross.closePath();
  root.add(mesh(slab(cross, 3.2, 0.7, 2), M.dark, [-24, -22, FRONT - 0.4], [0, 0, 74]));

  // A / B: domed buttons (lathe profile), set on the diagonal
  const dome = new THREE.LatheGeometry([[0, 3.4], [2.6, 3.25], [4.2, 2.8], [4.9, 2.0], [5, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 40).rotateX(Math.PI / 2);
  root.add(mesh(dome, M.berry, [31, -17, FRONT - 0.6], [0, 0, 78]));
  root.add(mesh(dome.clone(), M.berry, [16, -24, FRONT - 0.6], [0, 0, 78]));

  // start / select: slanted rubber pills
  const pill = new THREE.CapsuleGeometry(1.7, 8, 6, 16);
  root.add(mesh(pill, M.rubber, [-7.5, -46, FRONT + 0.3], [0, 0, 74], -1.13));
  root.add(mesh(pill.clone(), M.rubber, [7.5, -46, FRONT + 0.3], [0, 0, 74], -1.13));

  // speaker grille: six slanted slots in the rounded corner
  for (let i = 0; i < 6; i++) {
    const d = (i - 2.5) * 3.4, ang = 0.44;
    root.add(mesh(new THREE.BoxGeometry(18, 1.5, 0.3), M.slot, [24 - Math.sin(ang) * d, -57 + Math.cos(ang) * d, FRONT + 0.1], [0, 0, 60], ang));
  }

  // power switch on the top edge
  root.add(mesh(new THREE.BoxGeometry(9, 2.2, 4), M.rubber, [-30, H / 2 + 0.6, -3], [0, 10, 0]));

  // inside: board, chips, four AA cells
  root.add(mesh(new THREE.BoxGeometry(80, 122, 1.6), M.pcb, [0, -6, 0], [0, 0, 0]));
  root.add(mesh(new THREE.BoxGeometry(13, 13, 1.8), M.chip, [8, 22, 1.7], [0, 0, 8]));          // CPU
  root.add(mesh(new THREE.BoxGeometry(11, 7, 1.4), M.chip, [-14, 24, 1.5], [0, 0, 8]));         // RAM
  root.add(mesh(new THREE.BoxGeometry(11, 7, 1.4), M.chip, [-14, 12, 1.5], [0, 0, 8]));         // VRAM
  const cell = new THREE.CylinderGeometry(7.1, 7.1, 48, 28).rotateZ(Math.PI / 2);
  const tip = new THREE.CylinderGeometry(2.6, 2.6, 1.6, 16).rotateZ(Math.PI / 2);
  [-63, -48.5, -34, -19.5].forEach((y, i) => {
    root.add(mesh(cell.clone(), M.battery, [0, y, -7.8], [0, 0, -30 - i * 3]));
    root.add(mesh(tip.clone(), M.batteryTip, [i % 2 ? 24.8 : -24.8, y, -7.8], [0, 0, -30 - i * 3]));
  });
  // battery cover on the back
  root.add(mesh(slab(roundedRect(72, 60, 3, 3, 14, 3), 0.9, 0.3), M.shell, [0, -38, -15.9], [0, 0, -66]));

  // cartridge: slides out of the top when exploded
  const cart = mesh(slab(roundedRect(57, 65, 2, 2, 2, 2), 7.6, 0.6), M.cart, [0, 44.5, -15.6], [0, 78, -14]);
  root.add(cart);
  const labelMat = fixed(mat('#ffffff', 0.6, { map: labelTexture() }));
  const label = mesh(new THREE.PlaneGeometry(46, 39.5).rotateY(Math.PI), labelMat, [0, 40, -15.65], [0, 78, -14]);
  label.userData.noWire = true;
  root.add(label);

  return root;
}

// --- per-frame: screen and LED follow the data-screen key ----------------------------
export function gameBoyFrame(cur, dt, t) {
  const s = Math.max(0, Math.min(1, cur.screen || 0));
  paintLcd(s, t);
  if (lcdMesh) lcdMesh.material.emissiveIntensity = 0.22 * s;
  if (ledMesh) ledMesh.material.emissiveIntensity = 2.2 * Math.min(1, s * 3);
}
