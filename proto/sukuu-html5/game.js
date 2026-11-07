// すくう — 金魚すくい放置ゲーム 試作（HTML5 canvas 2D、外部アセットなし）
// ?bot=1 で自動プレイ、?seed=N で乱数固定、?fixed=1 で window.__step(dt) / window.__render() による固定刻み
(() => {
'use strict';

// ---------------------------------------------------------------- 設定
const W = 720, H = 1280;
const Q = new URLSearchParams(location.search);
const BOT = Q.get('bot') === '1';
const FIXED = Q.get('fixed') === '1';
const SEED = parseInt(Q.get('seed') || '1', 10) || 1;
const FISH0 = parseInt(Q.get('fish') || '60', 10);
const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","YuGothic","Meiryo",sans-serif';

const TUB = { x: 22, y: 178, w: 676, h: 884, r: 64 };
const SHOP_Y = 1080;
const COUNTER = { x: 700, y: 66 };

const TIERS = [
  { name: '金魚',   r: 20,  val: 1,   w: 6,   spd: 90, poiR: 70,  cm: 0.8 },
  { name: '出目金', r: 28,  val: 6,   w: 13,  spd: 76, poiR: 100, cm: 1.3 },
  { name: '鯉',     r: 46,  val: 40,  w: 40,  spd: 62, poiR: 136, cm: 4 },
  { name: '鯨',     r: 105, val: 450, w: 150, spd: 44, poiR: 190, cm: 150 },
];
const TIER_PRICE = [200, 2000, 12000];
const DUR_MUL = [1, 2.2, 6, 22];
const POP = [
  [FISH0],
  [Math.round(FISH0 * 0.7), Math.round(FISH0 * 0.3)],
  [Math.round(FISH0 * 0.5), Math.round(FISH0 * 0.27), 12],
  [Math.round(FISH0 * 0.45), Math.round(FISH0 * 0.22), 10, 4],
];

// ---------------------------------------------------------------- 乱数（決定的）
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED * 9973 + 7);     // ゲーム進行
const frng = mulberry32(SEED * 7919 + 13);   // 演出（パーティクル）
const brng = mulberry32(SEED * 104729 + 1);  // bot
const R = (a, b) => a + (b - a) * frng();

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const elastic = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t) * Math.cos(t * 10.5);
function angLerp(a, b, t) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; }
function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('en-US');
  if (n < 1e6) return (n / 1e3).toFixed(n < 1e5 ? 1 : 0) + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(1) + 'M';
  return (n / 1e9).toFixed(1) + 'B';
}

// ---------------------------------------------------------------- canvas
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
function fit() {
  if (FIXED) { cv.style.width = W + 'px'; cv.style.height = H + 'px'; return; }
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px';
}
fit(); window.addEventListener('resize', fit);

function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function text(c, s, x, y, size, fill, stroke, lw, align, weight) {
  c.font = (weight || '900') + ' ' + size + 'px ' + FONT;
  c.textAlign = align || 'center'; c.textBaseline = 'middle';
  if (stroke) { c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = stroke; c.strokeText(s, x, y); }
  c.fillStyle = fill; c.fillText(s, x, y);
}

// ---------------------------------------------------------------- 事前描画：背景・コースティクス・ぼけ
const bokehSprites = {};
function bokehSprite(col) {
  if (bokehSprites[col]) return bokehSprites[col];
  const c = mk(128, 128), g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, col.replace('A', '0.95')); gr.addColorStop(0.55, col.replace('A', '0.55'));
  gr.addColorStop(0.8, col.replace('A', '0.18')); gr.addColorStop(1, col.replace('A', '0'));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  bokehSprites[col] = c; return c;
}
const WARM = ['rgba(255,150,60,A)', 'rgba(255,90,60,A)', 'rgba(255,210,110,A)', 'rgba(255,120,150,A)'];

const BG = mk(W, H);
(function drawBG() {
  const g = BG.getContext('2d');
  // 夜空
  let gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#0b0e26'); gr.addColorStop(0.15, '#1a1638'); gr.addColorStop(0.85, '#120f24'); gr.addColorStop(1, '#07060f');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // 遠くの屋台のぼけ
  const br = mulberry32(77);
  for (let i = 0; i < 26; i++) {
    const s = bokehSprite(WARM[i % 4]);
    const sz = 40 + br() * 110, x = br() * W, y = br() < 0.7 ? br() * 200 : 1060 + br() * 220;
    g.globalAlpha = 0.25 + br() * 0.35; g.drawImage(s, x - sz / 2, y - sz / 2, sz, sz);
  }
  g.globalAlpha = 1;
  // 提灯の列
  g.strokeStyle = 'rgba(40,30,30,0.9)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-10, 18); g.quadraticCurveTo(W / 2, 70, W + 10, 18); g.stroke();
  for (let i = 0; i < 7; i++) {
    const x = 50 + i * 104, t = x / W, y = 18 + 4 * t * (1 - t) * 26 + 22;
    const s = bokehSprite('rgba(255,120,50,A)'); g.globalAlpha = 0.55; g.drawImage(s, x - 70, y - 70, 140, 140); g.globalAlpha = 1;
    const lg = g.createRadialGradient(x - 6, y - 6, 2, x, y, 24);
    lg.addColorStop(0, '#ffe2a0'); lg.addColorStop(0.5, '#ff6a2a'); lg.addColorStop(1, '#a8201a');
    g.fillStyle = lg; g.beginPath(); g.ellipse(x, y, 19, 24, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(120,20,10,0.5)'; g.lineWidth = 1;
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(x, y, 19, 24 - Math.abs(k) * 0, 0, 0, Math.PI * 2); }
    for (let k = -16; k <= 16; k += 8) { g.beginPath(); g.moveTo(x - Math.sqrt(Math.max(0, 1 - (k / 24) ** 2)) * 19, y + k); g.lineTo(x + Math.sqrt(Math.max(0, 1 - (k / 24) ** 2)) * 19, y + k); g.stroke(); }
    g.fillStyle = '#1c1210'; g.fillRect(x - 9, y - 27, 18, 5); g.fillRect(x - 9, y + 22, 18, 5);
  }
  // たらいの縁（青いプラスチック）
  const T = TUB;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
  rr(g, T.x - 6, T.y - 6, T.w + 12, T.h + 12, T.r + 6); g.fillStyle = '#1b5fb8'; g.fill(); g.restore();
  gr = g.createLinearGradient(0, T.y - 6, 0, T.y + T.h + 6);
  gr.addColorStop(0, '#7cc8ff'); gr.addColorStop(0.08, '#2f86e0'); gr.addColorStop(1, '#174f9e');
  rr(g, T.x - 6, T.y - 6, T.w + 12, T.h + 12, T.r + 6); g.fillStyle = gr; g.fill();
  // 水
  const ix = T.x + 14, iy = T.y + 14, iw = T.w - 28, ih = T.h - 28;
  g.save(); rr(g, ix, iy, iw, ih, T.r - 12); g.clip();
  gr = g.createRadialGradient(W / 2, T.y + T.h * 0.45, 60, W / 2, T.y + T.h * 0.5, T.h * 0.62);
  gr.addColorStop(0, '#5fd6f0'); gr.addColorStop(0.55, '#2fa6dc'); gr.addColorStop(1, '#14629e');
  g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
  // たらいの底の青海波
  g.strokeStyle = 'rgba(255,255,255,0.075)'; g.lineWidth = 3;
  for (let row = 0; row < 40; row++) for (let col = -1; col < 12; col++) {
    const cx = ix + col * 70 + (row % 2) * 35, cy = iy + row * 24;
    for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(cx, cy, k * 11, Math.PI, 2 * Math.PI); g.stroke(); }
  }
  // ビー玉
  const mr = mulberry32(5);
  const MC = ['#ff6fa8', '#ffd84a', '#6affc9', '#b48cff', '#ffffff', '#5ab8ff'];
  for (let i = 0; i < 18; i++) {
    const x = ix + 30 + mr() * (iw - 60), y = iy + 30 + mr() * (ih - 60), r = 9 + mr() * 6;
    g.fillStyle = 'rgba(0,30,70,0.25)'; g.beginPath(); g.ellipse(x + 4, y + 6, r, r * 0.8, 0, 0, 7); g.fill();
    const mg = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
    mg.addColorStop(0, 'rgba(255,255,255,0.95)'); mg.addColorStop(0.35, MC[i % 6]); mg.addColorStop(1, 'rgba(20,60,120,0.8)');
    g.globalAlpha = 0.8; g.fillStyle = mg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.globalAlpha = 1;
  }
  // 縁の内側の影
  g.lineWidth = 40; g.strokeStyle = 'rgba(5,30,70,0.35)'; rr(g, ix, iy, iw, ih, T.r - 12); g.stroke();
  g.restore();
  // 縁のハイライト
  g.lineWidth = 3; g.strokeStyle = 'rgba(200,240,255,0.7)'; rr(g, T.x - 4, T.y - 4, T.w + 8, T.h + 8, T.r + 4); g.stroke();
  g.lineWidth = 2; g.strokeStyle = 'rgba(10,40,90,0.8)'; rr(g, ix, iy, iw, ih, T.r - 12); g.stroke();
  // 下の屋台の板
  gr = g.createLinearGradient(0, SHOP_Y - 10, 0, H);
  gr.addColorStop(0, 'rgba(10,8,20,0)'); gr.addColorStop(0.15, 'rgba(10,8,20,0.85)'); gr.addColorStop(1, '#06050c');
  g.fillStyle = gr; g.fillRect(0, SHOP_Y - 10, W, H - SHOP_Y + 10);
})();
const WATER = { x: TUB.x + 14, y: TUB.y + 14, w: TUB.w - 28, h: TUB.h - 28, r: TUB.r - 12 };

// コースティクス（タイル可能）
const CAU = mk(256, 256);
(function () {
  const g = CAU.getContext('2d'), img = g.createImageData(256, 256), d = img.data;
  const waves = [[3, 1, 0.3], [1, 4, 1.7], [-2, 3, 2.9], [4, -1, 4.1], [2, 2, 5.3]];
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    let v = 0;
    for (const [a, b, p] of waves) v += Math.sin((a * x + b * y) * Math.PI * 2 / 256 + p + 1.3 * Math.sin((b * x - a * y) * Math.PI * 2 / 256));
    v = 1 - Math.min(1, Math.abs(v) / 1.6); v = Math.pow(v, 6);
    const i = (y * 256 + x) * 4; d[i] = 220; d[i + 1] = 250; d[i + 2] = 255; d[i + 3] = Math.floor(v * 255);
  }
  g.putImageData(img, 0, 0);
})();
let cauPat = null;

// 手前のぼけ
const FG_BOKEH = [];
(function () { const r = mulberry32(99); for (let i = 0; i < 9; i++) FG_BOKEH.push({ x: r() < 0.5 ? r() * 120 : W - r() * 120, y: 180 + r() * 900, s: 90 + r() * 140, c: WARM[i % 4], p: r() * 6 }); })();
const WATER_REFL = [];
(function () { const r = mulberry32(3); for (let i = 0; i < 7; i++) WATER_REFL.push({ x: 70 + i * 96 + r() * 30, y: WATER.y + 40 + r() * 60, s: 120 + r() * 60, c: WARM[i % 4], p: r() * 6 }); })();

// ---------------------------------------------------------------- 状態
const G = {
  coins: 0, disp: 0, earned: 0, tier: 0, lv: { dur: 0, size: 0 },
  realT: 0, simT: 0, slowmo: 0, hitstop: 0, flash: 0, shake: 0, shx: 0, shy: 0,
  bump: 0, dial: 0, banner: null, caption: null, spawnT: 0, scoops: 0, tears: 0,
};
const EV = []; window.__events = EV;
function ev(type, data) { EV.push(Object.assign({ t: +G.realT.toFixed(3), type }, data || {})); }

const fish = [], parts = [], rings = [], pops = [], texts = [], lifted = [], shards = [], taps = [];
let fishId = 0;

const KINGYO_COLS = [['#ff4a1c', 'rgba(255,120,80,0.72)'], ['#ff2b2b', 'rgba(255,110,100,0.72)'], ['#ff7a12', 'rgba(255,170,90,0.72)'], ['#ff3d1f', 'rgba(255,235,225,0.75)']];
function makeFish(tier, x, y, spawnAnim) {
  const T = TIERS[tier];
  const a = rng() * Math.PI * 2;
  const f = {
    id: fishId++, tier, x, y, vx: Math.cos(a) * T.spd * 0.5, vy: Math.sin(a) * T.spd * 0.5, ang: a,
    r: T.r * (0.88 + rng() * 0.24), phase: rng() * 6, wander: a, alert: -1, flee: 0, spawn: spawnAnim ? 0 : 1,
    var: Math.floor(rng() * 4), patches: [],
  };
  if (tier === 2) { const n = 2 + Math.floor(rng() * 3); for (let i = 0; i < n; i++) f.patches.push([-0.6 + rng() * 1.3, (rng() - 0.5) * 0.3, 0.16 + rng() * 0.18]); }
  if (tier === 3) { for (let i = 0; i < 6; i++) f.patches.push([-0.6 + rng() * 1.2, (rng() - 0.5) * 0.4, 0.03 + rng() * 0.04]); }
  fish.push(f);
  return f;
}
const B = { x0: WATER.x + 18, x1: WATER.x + WATER.w - 18, y0: WATER.y + 18, y1: WATER.y + WATER.h - 18 };
for (let i = 0; i < POP[0][0]; i++) makeFish(0, B.x0 + 30 + rng() * (B.x1 - B.x0 - 60), B.y0 + 30 + rng() * (B.y1 - B.y0 - 60), false);

// ポイ
function poiMax() { return 100 * Math.pow(1.3, G.lv.dur) * DUR_MUL[G.tier]; }
function poiR() { return Math.min(250,TIERS[G.tier].poiR * (1 + 0.7 * (1 - Math.pow(0.86, G.lv.size)))); }
function makeCracks() {
  const cr = [];
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2, pts = [[Math.cos(a) * 0.95, Math.sin(a) * 0.95]];
    let ang = a + Math.PI + (rng() - 0.5) * 0.8, x = pts[0][0], y = pts[0][1];
    for (let k = 0; k < 5; k++) { ang += (rng() - 0.5) * 1.1; x += Math.cos(ang) * 0.16; y += Math.sin(ang) * 0.16; pts.push([x, y]); }
    cr.push(pts);
  }
  return cr;
}
const poi = {
  x: W / 2, y: 720, tx: W / 2, ty: 720, r: 56, rT: 56, rv: 0, state: 'hover', sink: 0, dipT: 0,
  max: 100, wet: 0, dmg: 0, cracks: makeCracks(), tearT: 0, enterT: 1, speed: 0, dripT: 0, fiber: [],
};
(function () { for (let i = 0; i < 26; i++) poi.fiber.push([rng() * 2 - 1, rng() * 2 - 1, rng() * 6, 0.1 + rng() * 0.25]); })();
poi.max = poiMax(); poi.r = poi.rT = poiR();
G.dial = cmOf(poi.rT);
function poiDur() { return poi.max - poi.wet - poi.dmg; }
function cmOf(r) { return r * 2 * 0.065 * TIERS[G.tier].cm; }
function fmtCm(cm) { return cm < 100 ? cm.toFixed(1) + 'cm' : (cm / 100).toFixed(cm < 1000 ? 2 : 1) + 'm'; }
function sizeMaxed() { return TIERS[G.tier].poiR * (1 + 0.7 * (1 - Math.pow(0.86, G.lv.size))) >= 250; }

// ---------------------------------------------------------------- 音（WebAudio 合成、ユーザー操作後のみ）
let AC = null;
function initAudio() {
  if (AC || FIXED) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
}
function tone(f0, f1, dur, type, vol, delay) {
  if (!AC) return;
  try {
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) { /* 無音で続行 */ }
}
function noise(dur, vol, freq, q) {
  if (!AC) return;
  try {
    const n = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(AC.destination); s.start();
  } catch (e) { /* 無音で続行 */ }
}
const SFX = {
  dip() { noise(0.18, 0.25, 700, 0.8); },
  plop(i) { tone(520 + i * 40, 180, 0.12, 'sine', 0.35); },
  coin(i) { tone(1200 + (i % 8) * 90, 1800 + (i % 8) * 90, 0.09, 'triangle', 0.12); },
  rip() { noise(0.35, 0.6, 2500, 0.6); noise(0.2, 0.4, 900, 1); },
  buy() { [660, 880, 1320].forEach((f, i) => tone(f, f * 1.02, 0.14, 'square', 0.07, i * 0.06)); },
  tier() { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.5, 'triangle', 0.12, i * 0.07)); noise(0.6, 0.3, 400, 0.5); },
  combo(n) { tone(400 + n * 80, 800 + n * 120, 0.2, 'sawtooth', 0.06); },
};

// ---------------------------------------------------------------- エフェクト生成
function splash(x, y, n, power, col) {
  for (let i = 0; i < n; i++) {
    const a = R(0, Math.PI * 2), s = R(60, 220) * power;
    parts.push({ k: 'drop', x, y, z: R(0, 6), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.8, vz: R(180, 420) * power, s: R(2.5, 6) * Math.sqrt(power), c: col || (frng() < 0.5 ? '#ffffff' : '#bff4ff'), life: 2 });
  }
  rings.push({ x, y, r: 6, vr: 140 * power, life: 0.7, t: 0, w: 4 });
  rings.push({ x, y, r: 2, vr: 80 * power, life: 0.9, t: 0, w: 2.5 });
}
function sparks(x, y, n, col, spd) {
  for (let i = 0; i < n; i++) {
    const a = R(0, Math.PI * 2), s = R(0.3, 1) * (spd || 360);
    parts.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, s: R(3, 7), c: col || '#ffe14a', life: R(0.35, 0.7), t: 0, rot: R(0, 6) });
  }
}
function floatText(s, x, y, size, fill, stroke, life, rot) {
  texts.push({ s, x, y, size, fill, stroke, life: life || 0.9, t: 0, rot: rot || 0 });
}
function addShake(m) { G.shake = Math.max(G.shake, m); }

// ---------------------------------------------------------------- 入力
const input = { down: false, px: W / 2, py: 720, shopIdx: -1 };
function btnRect(i) { return { x: 14 + i * 234, y: SHOP_Y + 8, w: 224, h: 180 }; }
function shopHit(x, y) { for (let i = 0; i < 3; i++) { const b = btnRect(i); if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i; } return -1; }
function pDown(x, y) {
  input.px = x; input.py = y;
  const si = shopHit(x, y);
  taps.push({ x, y, t: 0 });
  if (si >= 0) { buy(si); return; }
  if (y >= SHOP_Y) return;
  input.down = true; poi.tx = x; poi.ty = y;
}
function pMove(x, y) {
  input.px = x; input.py = y;
  // 手がショップへ行っている間、ポイは池の上に置いたまま（隅へ吸い寄せない）
  if (input.away) return;
  if (input.down || (y < WATER.y + WATER.h - 10 && y > WATER.y)) { poi.tx = x; poi.ty = y; }
}
function pUp() { input.down = false; }
window.__input = { down: pDown, move: pMove, up: pUp };

function toLogical(e) { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height]; }
if (!BOT) {
  cv.addEventListener('pointerdown', e => { initAudio(); e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { } const [x, y] = toLogical(e); pDown(x, y); });
  cv.addEventListener('pointermove', e => { const [x, y] = toLogical(e); pMove(x, y); });
  cv.addEventListener('pointerup', e => { pUp(); });
  cv.addEventListener('pointercancel', e => { pUp(); });
  cv.addEventListener('contextmenu', e => e.preventDefault());
}

// ---------------------------------------------------------------- ショップ
const SHOP = [
  { id: 'dur', name: '紙の強さ' },
  { id: 'size', name: 'ポイの大きさ' },
  { id: 'tier', name: '獲物を大きく' },
];
const press = [0, 0, 0], deny = [0, 0, 0], boughtFx = [0, 0, 0];
function price(i) {
  if (i === 0) return Math.round(12 * Math.pow(1.6, G.lv.dur));
  if (i === 1) return sizeMaxed() ? Infinity : Math.round(18 * Math.pow(1.6, G.lv.size));
  return G.tier >= 3 ? Infinity : TIER_PRICE[G.tier];
}
function buy(i) {
  press[i] = 0.14;
  const p = price(i);
  if (G.coins < p) { deny[i] = 0.35; return false; }
  G.coins -= p;
  const b = btnRect(i); boughtFx[i] = 0.6;
  floatText('LV UP!', b.x + b.w / 2, b.y - 26, 46, '#ffffff', '#1a8a2a', 0.8, -0.08);
  floatText('-' + fmt(p), COUNTER.x - 90, COUNTER.y + 62, 38, '#ff7a6a', '#300', 0.7, 0);
  addShake(4);
  sparks(b.x + b.w / 2, b.y + 50, 26, '#ffe14a', 520);
  SFX.buy();
  if (i === 0) {
    G.lv.dur++; const old = poi.max; poi.max = poiMax(); poi.wet = Math.max(0, poi.wet - (poi.max - old));
    floatText('紙 ×1.3', poi.x, poi.y - poi.r - 34, 58, '#ffffff', '#1a5fd0', 1.0, -0.06);
    rings.push({ x: poi.x, y: poi.y, r: poi.r, vr: 160, life: 0.5, t: 0, w: 8 });
    ev('buy', { item: 'dur', lv: G.lv.dur, price: p });
  } else if (i === 1) {
    const oldCm = cmOf(poi.rT);
    G.lv.size++; poi.rT = poiR(); poi.rv += 260;
    floatText(fmtCm(oldCm) + '→' + fmtCm(cmOf(poi.rT)), poi.x, poi.y - poi.r - 34, 54, '#ffffff', '#d0301a', 1.0, -0.06);
    ev('buy', { item: 'size', lv: G.lv.size, price: p });
  } else tierUp(p);
  return true;
}
function tierUp(p) {
  G.tier++;
  ev('tier', { tier: G.tier, name: TIERS[G.tier].name, price: p });
  G.slowmo = 0.3; G.flash = 1; addShake(16);
  G.banner = { s: TIERS[G.tier].name + 'がすくえる！', sub: 'ポイも大きくなった', t: 0, life: 1.4, tier: G.tier };
  poi.rT = poiR(); poi.rv += 600;
  poi.max = poiMax(); poi.wet = 0; poi.dmg = 0; poi.cracks = makeCracks();
  SFX.tier();
  // 新しい獲物がザブンと入ってくる
  const n = Math.ceil(POP[G.tier][G.tier] * 0.6);
  for (let i = 0; i < n; i++) spawnFish(G.tier, true);
}
function spawnFish(tier, big) {
  const T = TIERS[tier];
  let x = 0, y = 0;
  for (let k = 0; k < 12; k++) {
    x = B.x0 + T.r + rng() * (B.x1 - B.x0 - 2 * T.r); y = B.y0 + T.r + rng() * (B.y1 - B.y0 - 2 * T.r);
    if (Math.hypot(x - poi.x, y - poi.y) > poi.r + 80 + T.r) break;
  }
  makeFish(tier, x, y, true);
  splash(x, y, big ? 16 : 8, big ? 1.4 : 0.8);
}

// ---------------------------------------------------------------- 掬う・破れる
function insidePoi(f) { return Math.hypot(f.x - poi.x, f.y - poi.y) + f.r * 0.55 <= poi.r * 0.98; }
function lift() {
  const was = poi.state; poi.state = 'hover';
  if (was !== 'dip') return;
  const caught = poi.sink >= 0.99 ? fish.filter(f => f.spawn >= 1 && insidePoi(f)) : [];
  splash(poi.x, poi.y, 10, 0.9);
  if (!caught.length) { poi.dripT = 0.3; return; }
  const wsum = caught.reduce((s, f) => s + TIERS[f.tier].w, 0);
  if (wsum > poiDur()) { tear(caught); return; }
  poi.dmg += wsum * 0.4; poi.wet += wsum * 0.3;
  poi.dripT = 0.8;
  const n = caught.length, mult = Math.min(10, n);
  let total = 0;
  caught.forEach((f, i) => {
    const idx = fish.indexOf(f); if (idx >= 0) fish.splice(idx, 1);
    const v = TIERS[f.tier].val * mult; total += v;
    lifted.push({ f, dx: f.x - poi.x, dy: f.y - poi.y, t: -i * 0.03, v, i, n });
  });
  G.scoops++;
  ev('scoop', { n, value: total, tier: Math.max(...caught.map(f => f.tier)) });
  addShake(3 + Math.min(10, n * 1.2));
  if (n >= 2) {
    const big = n >= 5;
    // 「×n」と合計を縦に積む（重ならない位置）。Balatro のように数字を主役に
    const cx = clamp(poi.x, 170, W - 170), cy = clamp(poi.y - poi.r - 40, 360, 1000);
    texts.push({ s: '×' + n, x: cx, y: cy, size: 80 + Math.min(50, n * 5), fill: big ? '#fff04a' : '#ffffff', stroke: '#e0241a', life: 1.0, t: 0, rot: -0.12, combo: true });
    texts.push({ s: '+' + fmt(total), x: cx, y: cy - 110, size: 70 + Math.min(40, Math.log10(total + 1) * 12), fill: '#ffe14a', stroke: '#6a1a00', life: 1.1, t: 0, rot: 0.05, combo: true });
    if (big) { G.hitstop = 0.07; floatText(n >= 10 ? '大漁！！' : '大漁！', poi.x, poi.y + poi.r + 40, 64, '#ffffff', '#1a3fd0', 1.0, 0.06); }
    SFX.combo(n);
  }
  SFX.plop(0);
}
function tear(caught) {
  poi.state = 'torn'; poi.tearT = 0; G.tears++;
  ev('tear', { n: caught ? caught.length : 0 });
  addShake(14);
  SFX.rip();
  const a = rng() * Math.PI, jag = [];
  for (let i = 0; i <= 8; i++) jag.push([(i / 8) * 2 - 1, (rng() - 0.5) * 0.25]);
  shards.length = 0;
  for (const side of [-1, 1]) shards.push({ side, a, jag, x: poi.x, y: poi.y, r: poi.r, vx: Math.cos(a + Math.PI / 2) * side * 90, vy: Math.sin(a + Math.PI / 2) * side * 90 + 30, rot: 0, vr: side * 1.5, t: 0, wet: 1 });
  for (let i = 0; i < 18; i++) { const b = R(0, 6.28), d = R(0, poi.r); parts.push({ k: 'shred', x: poi.x + Math.cos(b) * d, y: poi.y + Math.sin(b) * d, z: 10, vx: Math.cos(b) * R(80, 260), vy: Math.sin(b) * R(80, 260), vz: R(150, 380), s: R(4, 10), c: '#eef3f6', life: 2, rot: R(0, 6) }); }
  floatText('ビリッ！', poi.x, poi.y - poi.r - 30, 96, '#ffffff', '#c01010', 0.9, -0.15);
  (caught || []).forEach(f => { f.alert = 0; f.flee = 1.2; splash(f.x, f.y, 6, 0.8); });
  splash(poi.x, poi.y, 22, 1.3);
}

// ---------------------------------------------------------------- 更新
function update(dt) {
  G.realT += dt;
  let sdt = dt;
  if (G.slowmo > 0) { G.slowmo -= dt; sdt = dt * 0.2; }
  if (G.hitstop > 0) { G.hitstop -= dt; sdt = 0; }
  G.simT += sdt;

  if (BOT) botUpdate(sdt || dt * 0.2);

  // ポイの動き
  const prx = poi.x, pry = poi.y;
  const k = 1 - Math.exp(-dt * 28);
  const tx = clamp(poi.tx, WATER.x + 20, WATER.x + WATER.w - 20), ty = clamp(poi.ty, WATER.y + 20, WATER.y + WATER.h - 20);
  poi.x += (tx - poi.x) * k; poi.y += (ty - poi.y) * k;
  poi.speed = sdt > 0 ? Math.hypot(poi.x - prx, poi.y - pry) / Math.max(dt, 1e-4) : 0;
  // 半径のばね
  const acc = (poi.rT - poi.r) * 220 - poi.rv * 14;
  poi.rv += acc * dt; poi.r += poi.rv * dt;

  if (poi.state === 'torn') {
    poi.tearT += dt;
    if (poi.tearT > 0.6) {
      poi.state = 'enter'; poi.enterT = 0; poi.wet = 0; poi.dmg = 0; poi.max = poiMax(); poi.cracks = makeCracks(); poi.sink = 0;
    }
  } else if (poi.state === 'enter') {
    poi.enterT += dt * 4;
    if (poi.enterT >= 1) { poi.enterT = 1; poi.state = input.down ? 'dip' : 'hover'; if (poi.state === 'dip') { poi.dipT = 0; SFX.dip(); } }
  } else if (poi.state === 'hover') {
    poi.sink = Math.max(0, poi.sink - dt * 8);
    poi.wet = Math.max(0, poi.wet - 22 * DUR_MUL[G.tier] * dt);
    if (input.down) {
      poi.state = 'dip'; poi.dipT = 0; SFX.dip();
      splash(poi.x, poi.y, 8, 0.7); rings.push({ x: poi.x, y: poi.y, r: poi.r, vr: 120, life: 0.6, t: 0, w: 5 });
    }
  } else if (poi.state === 'dip') {
    poi.dipT += sdt; poi.sink = Math.min(1, poi.sink + sdt / 0.12);
    poi.wet += (11 + poi.speed * 0.035) * DUR_MUL[G.tier] * sdt;
    if (poi.speed > 300 && frng() < 0.4) rings.push({ x: poi.x + R(-poi.r, poi.r), y: poi.y + R(-poi.r, poi.r), r: 4, vr: 90, life: 0.5, t: 0, w: 2 });
    if (poiDur() <= 0) {
      const inside = fish.filter(f => insidePoi(f));
      tear(inside);
    } else if (!input.down) lift();
  }
  if (poi.dripT > 0) {
    poi.dripT -= sdt;
    if (frng() < 0.6) { const a = R(0, 6.28), d = R(0, poi.r * 0.9); parts.push({ k: 'drop', x: poi.x + Math.cos(a) * d, y: poi.y + Math.sin(a) * d, z: 26, vx: 0, vy: 0, vz: -20, s: R(2, 4), c: '#dff8ff', life: 2 }); }
  }

  updateFish(sdt);

  // 補充
  G.spawnT -= sdt;
  if (G.spawnT <= 0) {
    const tgt = POP[G.tier], cnt = [0, 0, 0, 0]; fish.forEach(f => cnt[f.tier]++);
    let best = -1, bd = 0;
    for (let t = 0; t < tgt.length; t++) { const d = (tgt[t] - cnt[t]) / tgt[t]; if (d > bd) { bd = d; best = t; } }
    if (best >= 0) { spawnFish(best, false); G.spawnT = bd > 0.3 ? 0.05 : 0.12; } else G.spawnT = 0.1;
  }

  // 持ち上げた魚
  for (let i = lifted.length - 1; i >= 0; i--) {
    const L = lifted[i]; L.t += sdt;
    if (L.t >= 0.34) {
      const x = poi.x + L.dx, y = poi.y + L.dy - 24;
      pops.push({ v: L.v, x, y, sx: x, sy: y, t: 0, vx: R(-60, 60), vy: R(-260, -180), big: L.f.tier, seq: L.i, k: L.n >= 6 ? 0.72 : 1 });
      sparks(x, y, 6 + L.f.tier * 6, L.f.tier >= 2 ? '#ffd23a' : '#ffffff', 260 + L.f.tier * 120);
      splash(x, y + 20, 4 + L.f.tier * 3, 0.6 + L.f.tier * 0.3);
      SFX.plop(L.i);
      lifted.splice(i, 1);
    }
  }
  // 数字：浮いて、カウンターへ飛ぶ
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.t += sdt;
    if (p.t < 0.45) { p.x += p.vx * sdt; p.y += p.vy * sdt; p.vy += 520 * sdt; p.vx *= 0.96; p.sx = p.x; p.sy = p.y; }
    else {
      const u = clamp((p.t - 0.45) / 0.42, 0, 1), e = easeIn(u);
      p.x = lerp(p.sx, COUNTER.x - 120, e) + Math.sin(u * Math.PI) * -60; p.y = lerp(p.sy, COUNTER.y, e);
      if (u >= 1) {
        G.coins += p.v; G.earned += p.v; G.bump = 1;
        if (!EV.some(e => e.type === 'coin')) ev('coin', { v: p.v });
        sparks(COUNTER.x - 110, COUNTER.y, 5, '#ffe14a', 200);
        SFX.coin(p.seq);
        pops.splice(i, 1);
      }
    }
  }
  // パーティクル
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.k === 'drop' || p.k === 'shred') {
      p.x += p.vx * sdt; p.y += p.vy * sdt; p.z += p.vz * sdt; p.vz -= 1100 * sdt; p.vx *= 0.99; p.vy *= 0.99;
      if (p.rot !== undefined) p.rot += sdt * 8;
      if (p.z <= 0) { if (p.k === 'drop') rings.push({ x: p.x, y: p.y, r: 1, vr: 50 + p.s * 6, life: 0.45, t: 0, w: 1.5 }); parts.splice(i, 1); }
    } else {
      p.t += sdt; p.x += p.vx * sdt; p.y += p.vy * sdt; p.vx *= 0.9; p.vy *= 0.9; p.rot += sdt * 6;
      if (p.t >= p.life) parts.splice(i, 1);
    }
  }
  if (parts.length > 700) parts.splice(0, parts.length - 700);
  for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += sdt; r.r += r.vr * sdt; r.vr *= 0.97; if (r.t >= r.life) rings.splice(i, 1); }
  for (let i = texts.length - 1; i >= 0; i--) { const t = texts[i]; t.t += dt; if (t.t >= t.life) texts.splice(i, 1); }
  for (let i = shards.length - 1; i >= 0; i--) { const s = shards[i]; s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt; if (s.t > 0.9) shards.splice(i, 1); }
  for (let i = taps.length - 1; i >= 0; i--) { taps[i].t += dt; if (taps[i].t > 0.4) taps.splice(i, 1); }

  if (!G.afforded && G.coins >= Math.min(price(0), price(1))) { G.afforded = true; ev('afford', { coins: G.coins }); }
  // HUD
  G.disp +=(G.coins - G.disp) * (1 - Math.exp(-dt * 10)); if (Math.abs(G.coins - G.disp) < 0.5) G.disp = G.coins;
  G.bump = Math.max(0, G.bump - dt * 5);
  G.dial += (cmOf(poi.r) - G.dial) * (1 - Math.exp(-dt * 6));
  for (let i = 0; i < 3; i++) { press[i] = Math.max(0, press[i] - dt); deny[i] = Math.max(0, deny[i] - dt); boughtFx[i] = Math.max(0, boughtFx[i] - dt); }
  G.flash = Math.max(0, G.flash - dt * 2.6);
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.life) G.banner = null; }
  if (G.caption) { G.caption.t += dt; if (G.caption.t > G.caption.life) G.caption = null; }
  G.shake *= Math.exp(-dt * 12);
  G.shx = (frng() - 0.5) * 2 * G.shake; G.shy = (frng() - 0.5) * 2 * G.shake;
}

function updateFish(dt) {
  if (dt <= 0) return;
  const n = fish.length, dip = poi.state === 'dip';
  const ax = new Float32Array(n), ay = new Float32Array(n), cx = new Float32Array(n), cy = new Float32Array(n), al = new Float32Array(n * 2), cnt = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = fish[i];
    for (let j = i + 1; j < n; j++) {
      const b = fish[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      const sep = (a.r + b.r) * 1.15;
      if (d2 < sep * sep && d2 > 0.01) {
        const d = Math.sqrt(d2), f = (sep - d) / sep * 260;
        ax[i] -= dx / d * f; ay[i] -= dy / d * f; ax[j] += dx / d * f; ay[j] += dy / d * f;
      }
      if (a.tier === b.tier && d2 < 110 * 110) {
        cx[i] += b.x; cy[i] += b.y; cx[j] += a.x; cy[j] += a.y;
        al[i * 2] += b.vx; al[i * 2 + 1] += b.vy; al[j * 2] += a.vx; al[j * 2 + 1] += a.vy; cnt[i]++; cnt[j]++;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const f = fish[i], T = TIERS[f.tier];
    let fx = ax[i], fy = ay[i];
    if (cnt[i]) {
      fx += (cx[i] / cnt[i] - f.x) * 0.35; fy += (cy[i] / cnt[i] - f.y) * 0.35;
      fx += (al[i * 2] / cnt[i] - f.vx) * 0.6; fy += (al[i * 2 + 1] / cnt[i] - f.vy) * 0.6;
    }
    f.wander += (rng() - 0.5) * 4 * dt;
    fx += Math.cos(f.wander) * 40; fy += Math.sin(f.wander) * 40;
    // 壁
    const m = 40 + f.r;
    if (f.x < B.x0 + m) fx += (B.x0 + m - f.x) * 9; if (f.x > B.x1 - m) fx -= (f.x - B.x1 + m) * 9;
    if (f.y < B.y0 + m) fy += (B.y0 + m - f.y) * 9; if (f.y > B.y1 - m) fy -= (f.y - B.y1 + m) * 9;
    // 逃げる
    const dx = f.x - poi.x, dy = f.y - poi.y, d = Math.hypot(dx, dy) || 1, range = poi.r + 110 + f.r;
    if (dip && d < range) {
      if (f.alert < 0) f.alert = 0.16 + rng() * 0.3 + f.tier * 0.06;
      f.alert -= dt;
      if (f.alert <= 0) { f.flee = 1; const s = 900 * (1 - d / range) + 250; fx += dx / d * s; fy += dy / d * s; }
    } else if (!dip) f.alert = -1;
    f.flee = Math.max(0, f.flee - dt * 0.8);
    f.vx += fx * dt; f.vy += fy * dt;
    const sp = Math.hypot(f.vx, f.vy) || 1, mx = T.spd * (1 + f.flee * 1.8), mn = T.spd * 0.3;
    if (sp > mx) { f.vx *= mx / sp; f.vy *= mx / sp; } else if (sp < mn) { f.vx *= mn / sp; f.vy *= mn / sp; }
    f.x += f.vx * dt; f.y += f.vy * dt;
    f.x = clamp(f.x, B.x0 + f.r * 0.5, B.x1 - f.r * 0.5); f.y = clamp(f.y, B.y0 + f.r * 0.5, B.y1 - f.r * 0.5);
    f.ang = angLerp(f.ang, Math.atan2(f.vy, f.vx), 1 - Math.exp(-dt * 7));
    f.phase += dt * (5 + Math.hypot(f.vx, f.vy) * 0.07) * (f.tier === 3 ? 0.35 : f.tier === 2 ? 0.6 : 1);
    if (f.spawn < 1) f.spawn = Math.min(1, f.spawn + dt * 2.5);
  }
}

// ---------------------------------------------------------------- bot（決定的）
const BOTS = { st: 'seek', t: 0, tx: W / 2, ty: 700, px: W / 2, py: 700, hold: 0, re: 0, anchor: null, greedyDone: false, greedy: false, maxIn: 0, shopI: -1 };
function clusterAt(x, y, rr) {
  let n = 0, w = 0, v = 0, sx = 0, sy = 0;
  for (const f of fish) { if (f.spawn < 1) continue; const d = Math.hypot(f.x - x, f.y - y); if (d + f.r * 0.55 <= rr) { n++; w += TIERS[f.tier].w; v += TIERS[f.tier].val; sx += f.x; sy += f.y; } }
  return { n, w, v, cx: n ? sx / n : x, cy: n ? sy / n : y };
}
function botPick() {
  const rr = poi.r * 0.86, dur = poiDur();
  let best = null, bs = -1;
  for (const f of fish) {
    if (f.spawn < 1) continue;
    const c = clusterAt(f.x, f.y, rr);
    if (!c.n) continue;
    const c2 = clusterAt(c.cx, c.cy, rr);
    const use = c2.v * c2.n >= c.v * c.n ? c2 : c;
    const x = use === c2 ? c.cx : f.x, y = use === c2 ? c.cy : f.y;
    if (!BOTS.greedy && use.w > dur * 0.85) continue;
    const score = use.v * use.n - Math.hypot(x - poi.x, y - poi.y) * 0.004 * TIERS[G.tier].val;
    if (score > bs) { bs = score; best = { x, y }; }
  }
  return best;
}
function botUpdate(dt) {
  const S = BOTS; S.t += dt;
  const move = (x, y, spd) => {
    const dx = x - S.px, dy = y - S.py, d = Math.hypot(dx, dy), st = Math.min(d, spd * dt);
    if (d > 0.01) { S.px += dx / d * st; S.py += dy / d * st; }
    pMove(S.px, S.py); return d;
  };
  if (poi.state === 'torn' || poi.state === 'enter') { if (input.down) pUp(); S.st = 'seek'; S.t = 0; return; }
  if (S.st === 'seek') {
    // 買い物
    const tp = price(2);
    let want = -1;
    if (G.coins >= tp) want = 2;
    else if (G.coins < tp * 0.55 || G.tier >= 3) {
      const a = price(0), b = price(1);
      const pick = G.lv.size <= G.lv.dur ? (b <= G.coins ? 1 : a <= G.coins ? 0 : -1) : (a <= G.coins ? 0 : b <= G.coins ? 1 : -1);
      want = pick;
    }
    if (want >= 0 && S.t > 0.2) { S.st = 'shop'; S.shopI = want; S.t = 0; input.away = true; return; }
    // 欲張りの時間（一度だけ破らせて見せ場を作る）
    if (!S.greedyDone && G.realT > 9 && G.realT < 14) S.greedy = true;
    S.re -= dt;
    if (S.re <= 0 || !S.anchor) { S.anchor = botPick(); S.re = 0.25; }
    if (!S.anchor) { move(W / 2, 640, 900); return; }
    const d = move(S.anchor.x, S.anchor.y, 2000);
    if (d < 10 && S.t > 0.12) { pDown(S.px, S.py); S.st = 'dip'; S.t = 0; S.hold = S.greedy ? 2.5 : 0.24 + brng() * 0.14; S.maxIn = 0; }
  } else if (S.st === 'dip') {
    const c = clusterAt(poi.x, poi.y, poi.r * 0.98);
    S.maxIn = Math.max(S.maxIn, c.n);
    if (S.greedy) {
      // わざと粘って動かす → 紙が持たない
      move(poi.x + Math.cos(S.t * 9) * 220, poi.y + Math.sin(S.t * 7) * 160, 2200);
      if (S.t > S.hold || c.w > poiDur()) { pUp(); S.greedy = false; S.greedyDone = true; S.st = 'cool'; S.t = 0; }
      return;
    }
    move(c.cx, c.cy, 260);
    const danger = c.w > poiDur() * 0.9;
    if (S.t >= S.hold || danger || (S.t > 0.14 && c.n < S.maxIn)) { pUp(); S.st = 'cool'; S.t = 0; }
  } else if (S.st === 'cool') {
    if (S.t > 0.2) { S.st = 'seek'; S.t = 0; S.anchor = null; }
  } else if (S.st === 'shop') {
    const b = btnRect(S.shopI), x = b.x + b.w / 2, y = b.y + b.h / 2;
    const d = move(x, y, 2600);
    if (d < 6) { pDown(x, y); pUp(); S.st = 'back'; S.t = 0; }
  } else if (S.st === 'back') {
    if (S.t > 0.12) { S.st = 'seek'; S.t = 0; S.anchor = null; input.away = false; }
  }
}

// ---------------------------------------------------------------- 描画：魚
function drawFishBody(c, f, x, y, ang, sc, alpha) {
  const r = f.r * sc, sw = Math.sin(f.phase), sw2 = Math.sin(f.phase - 0.9);
  c.save(); c.translate(x, y); c.rotate(ang); c.globalAlpha = alpha;
  if (f.tier <= 1) {
    const black = f.tier === 1 && f.var < 2;
    const col = f.tier === 1 ? (black ? '#1c1c2a' : '#ff3a1e') : KINGYO_COLS[f.var][0];
    const tcol = f.tier === 1 ? (black ? 'rgba(60,60,110,0.75)' : 'rgba(255,120,90,0.75)') : KINGYO_COLS[f.var][1];
    // 尾びれ
    c.save(); c.translate(-0.42 * r, 0); c.rotate(sw * 0.38); c.fillStyle = tcol;
    const bend = sw2 * 0.22 * r, tl = f.tier === 1 ? 1.15 : 1.0;
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(0, 0);
      c.quadraticCurveTo(-0.35 * r, s * 0.6 * r, -0.98 * r * tl, s * 0.62 * r + bend);
      c.quadraticCurveTo(-0.72 * r, s * 0.2 * r + bend * 0.5, -0.88 * r * tl, bend * 0.6);
      c.closePath(); c.fill();
    }
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = Math.max(1, r * 0.04);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-0.9 * r * tl, s1(bend)); c.stroke();
    c.restore();
    // 胸びれ
    c.fillStyle = tcol;
    for (const s of [-1, 1]) { c.save(); c.translate(0.22 * r, s * 0.3 * r); c.rotate(s * (0.9 + sw * 0.35)); c.beginPath(); c.ellipse(-0.1 * r, 0, 0.2 * r, 0.08 * r, 0, 0, 7); c.fill(); c.restore(); }
    // 体
    c.fillStyle = col; c.beginPath(); c.ellipse(0.06 * r, 0, 0.58 * r, f.tier === 1 ? 0.4 * r : 0.35 * r, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(-0.3 * r, -0.2 * r); c.quadraticCurveTo(-0.55 * r, 0, -0.3 * r, 0.2 * r); c.fill();
    if (f.var === 3 && f.tier === 0) { c.fillStyle = '#fff6ee'; c.beginPath(); c.ellipse(-0.08 * r, 0.04 * r, 0.26 * r, 0.2 * r, 0.4, 0, 7); c.fill(); }
    // 背の光
    c.fillStyle = black ? 'rgba(140,150,255,0.25)' : 'rgba(255,230,160,0.45)';
    c.beginPath(); c.ellipse(0.02 * r, 0, 0.42 * r, 0.09 * r, 0, 0, 7); c.fill();
    // 目
    if (f.tier === 1) {
      for (const s of [-1, 1]) {
        c.fillStyle = black ? '#2a2a3a' : '#ff6a3a'; c.beginPath(); c.arc(0.42 * r, s * 0.36 * r, 0.16 * r, 0, 7); c.fill();
        c.fillStyle = '#05050a'; c.beginPath(); c.arc(0.45 * r, s * 0.4 * r, 0.11 * r, 0, 7); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0.43 * r, s * 0.37 * r, 0.04 * r, 0, 7); c.fill();
      }
    } else {
      c.fillStyle = '#1a0a08';
      for (const s of [-1, 1]) { c.beginPath(); c.arc(0.46 * r, s * 0.2 * r, Math.max(1.2, 0.07 * r), 0, 7); c.fill(); }
    }
  } else if (f.tier === 2) {
    // 鯉（紅白）
    c.save(); c.translate(-0.7 * r, 0); c.rotate(sw * 0.3);
    c.fillStyle = 'rgba(255,250,245,0.85)';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-0.2 * r, s * 0.25 * r, -0.42 * r, s * 0.3 * r + sw2 * 0.08 * r); c.quadraticCurveTo(-0.3 * r, 0, -0.36 * r, sw2 * 0.05 * r); c.closePath(); c.fill(); }
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    for (const s of [-1, 1]) { c.save(); c.translate(0.3 * r, s * 0.18 * r); c.rotate(s * (1.0 + sw * 0.25)); c.beginPath(); c.ellipse(-0.12 * r, 0, 0.2 * r, 0.08 * r, 0, 0, 7); c.fill(); c.restore(); }
    c.beginPath(); c.moveTo(0.82 * r, 0);
    c.bezierCurveTo(0.8 * r, -0.26 * r, 0.1 * r, -0.28 * r, -0.4 * r, -0.14 * r);
    c.quadraticCurveTo(-0.75 * r, -0.04 * r, -0.72 * r, 0);
    c.quadraticCurveTo(-0.75 * r, 0.04 * r, -0.4 * r, 0.14 * r);
    c.bezierCurveTo(0.1 * r, 0.28 * r, 0.8 * r, 0.26 * r, 0.82 * r, 0);
    c.fillStyle = '#fbf6ef'; c.fill();
    c.save(); c.clip(); c.fillStyle = '#e8321e';
    for (const p of f.patches) { c.beginPath(); c.ellipse(p[0] * r, p[1] * r, p[2] * r, p[2] * r * 0.8, 0, 0, 7); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-r, -0.04 * r, 2 * r, 0.06 * r);
    c.restore();
    c.fillStyle = '#222'; for (const s of [-1, 1]) { c.beginPath(); c.arc(0.62 * r, s * 0.13 * r, 0.035 * r, 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(120,80,60,0.6)'; c.lineWidth = 1.5;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0.8 * r, s * 0.05 * r); c.lineTo(0.9 * r, s * 0.12 * r); c.stroke(); }
  } else {
    // 鯨（シルエット）
    const fl = 0.75 + 0.25 * sw;
    c.fillStyle = '#26406a';
    c.save(); c.translate(-0.82 * r, 0); c.rotate(sw * 0.12);
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0.05 * r, 0); c.quadraticCurveTo(-0.08 * r, s * 0.3 * r * fl, -0.2 * r, s * 0.42 * r * fl); c.quadraticCurveTo(-0.12 * r, s * 0.12 * r, -0.16 * r, 0); c.closePath(); c.fill(); }
    c.restore();
    for (const s of [-1, 1]) { c.save(); c.translate(0.3 * r, s * 0.24 * r); c.rotate(s * (0.7 + sw * 0.15)); c.beginPath(); c.ellipse(-0.14 * r, 0, 0.26 * r, 0.06 * r, 0, 0, 7); c.fill(); c.restore(); }
    c.beginPath(); c.moveTo(0.95 * r, 0);
    c.bezierCurveTo(0.95 * r, -0.34 * r, 0.2 * r, -0.34 * r, -0.4 * r, -0.16 * r);
    c.quadraticCurveTo(-0.85 * r, -0.05 * r, -0.85 * r, 0);
    c.quadraticCurveTo(-0.85 * r, 0.05 * r, -0.4 * r, 0.16 * r);
    c.bezierCurveTo(0.2 * r, 0.34 * r, 0.95 * r, 0.34 * r, 0.95 * r, 0);
    c.fillStyle = '#2d4b7c'; c.fill();
    c.fillStyle = 'rgba(160,200,255,0.25)'; c.beginPath(); c.ellipse(0.1 * r, 0, 0.6 * r, 0.08 * r, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(220,235,255,0.35)'; for (const p of f.patches) { c.beginPath(); c.arc(p[0] * r, p[1] * r, p[2] * r, 0, 7); c.fill(); }
    c.fillStyle = '#0d1a30'; c.beginPath(); c.ellipse(0.55 * r, 0, 0.03 * r, 0.05 * r, 0, 0, 7); c.fill();
  }
  c.restore();
}
function s1(v) { return v; }
function drawFishShadow(c, f, x, y, ang, sc) {
  const r = f.r * sc, off = 4 + f.r * 0.18;
  c.save(); c.translate(x + off, y + off * 1.5); c.rotate(ang);
  c.beginPath(); c.ellipse(f.tier >= 2 ? 0 : -0.1 * r, 0, (f.tier >= 2 ? 0.85 : 0.75) * r, (f.tier >= 2 ? 0.28 : 0.38) * r, 0, 0, 7); c.fill();
  c.restore();
}

// ---------------------------------------------------------------- 描画：ポイ
function paperStyle(alphaMul) {
  const wetF = clamp((poi.wet + poi.dmg) / poi.max, 0, 1);
  const r = Math.round(lerp(250, 168, wetF)), g = Math.round(lerp(250, 190, wetF)), b = Math.round(lerp(246, 205, wetF));
  const a = lerp(0.95, 0.52, wetF) * alphaMul;
  return `rgba(${r},${g},${b},${a})`;
}
function drawPaper(c, x, y, r, alphaMul) {
  c.fillStyle = paperStyle(alphaMul); c.beginPath(); c.arc(x, y, r * 0.95, 0, 7); c.fill();
  c.strokeStyle = 'rgba(160,170,180,0.25)'; c.lineWidth = 1;
  for (const fb of poi.fiber) { c.beginPath(); c.arc(x + fb[0] * r * 0.6, y + fb[1] * r * 0.6, r * fb[3], fb[2], fb[2] + 0.8); c.stroke(); }
  // ひび
  const dmgF = clamp((poi.wet * 0.5 + poi.dmg) / poi.max, 0, 1);
  const show = (dmgF - 0.18) / 0.7 * poi.cracks.length;
  if (show > 0) {
    c.strokeStyle = 'rgba(60,70,80,0.75)'; c.lineCap = 'round';
    for (let i = 0; i < poi.cracks.length && i < show; i++) {
      const pts = poi.cracks[i], part = Math.min(1, show - i), m = Math.max(1, Math.floor(pts.length * part));
      c.lineWidth = 2.5 - i * 0.15;
      c.beginPath(); c.moveTo(x + pts[0][0] * r, y + pts[0][1] * r);
      for (let k = 1; k < m; k++) c.lineTo(x + pts[k][0] * r, y + pts[k][1] * r);
      c.stroke();
    }
  }
}
function drawRing(c, x, y, r, alpha) {
  c.globalAlpha = alpha;
  // 柄
  const a = 0.95, hx = x + Math.cos(a) * r, hy = y + Math.sin(a) * r, L = Math.max(90, r * 1.7);
  c.save(); c.translate(hx, hy); c.rotate(a);
  c.fillStyle = '#c9201c'; rr(c, -4, -r * 0.07 - 3, L, r * 0.14 + 6, 6); c.fill();
  c.fillStyle = 'rgba(255,170,160,0.6)'; c.fillRect(2, -r * 0.05 - 1, L - 12, 3);
  c.restore();
  c.lineWidth = Math.max(6, r * 0.1); c.strokeStyle = '#d6261f'; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
  c.lineWidth = Math.max(2, r * 0.03); c.strokeStyle = 'rgba(255,170,160,0.85)'; c.beginPath(); c.arc(x, y, r - r * 0.02, Math.PI * 1.05, Math.PI * 1.75); c.stroke();
  c.lineWidth = 1.5; c.strokeStyle = 'rgba(90,0,0,0.6)'; c.beginPath(); c.arc(x, y, r + Math.max(3, r * 0.05), 0, 7); c.stroke();
  c.globalAlpha = 1;
}

// ---------------------------------------------------------------- 描画：全体
const PERF = Q.get('perf') || '';
function render() {
  const c = ctx, t = G.simT;
  if (PERF === 'blank') { c.fillStyle = (G.realT * 10 | 0) % 2 ? '#111' : '#222'; c.fillRect(0, 0, W, H); return; }
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#05060d'; c.fillRect(0, 0, W, H);
  c.setTransform(1, 0, 0, 1, G.shx, G.shy);
  c.drawImage(BG, 0, 0);

  // 水の中
  c.save(); rr(c, WATER.x, WATER.y, WATER.w, WATER.h, WATER.r); c.clip();
  if (!cauPat) cauPat = c.createPattern(CAU, 'repeat');
  c.globalCompositeOperation = 'lighter';
  // コースティクス：1 層だけ、水面の範囲だけ塗る（ソフトウェア描画の負荷を下げる）
  if (PERF !== 'nocau') {
    c.save(); const ox = (t * 14 + Math.sin(t * 0.7) * 20) % 256, oy = (t * -9 + Math.cos(t * 0.5) * 16) % 256;
    c.translate(ox, oy); c.globalAlpha = 0.26; c.fillStyle = cauPat;
    c.fillRect(WATER.x - ox, WATER.y - oy, WATER.w, WATER.h); c.restore();
  }
  // 提灯の映り込み
  for (const b of WATER_REFL) {
    const s = bokehSprite(b.c), wob = Math.sin(t * 2 + b.p) * 6;
    c.globalAlpha = 0.18 + 0.06 * Math.sin(t * 3 + b.p);
    c.drawImage(s, b.x - b.s / 2 + wob, b.y - b.s * 0.25, b.s, b.s * 0.5);
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // 波紋
  for (const r of rings) { const u = r.t / r.life; c.strokeStyle = `rgba(230,250,255,${(1 - u) * 0.7})`; c.lineWidth = r.w * (1 - u) + 0.5; c.beginPath(); c.arc(r.x, r.y, r.r, 0, 7); c.stroke(); }
  // 影
  c.fillStyle = 'rgba(0,35,75,0.28)';
  for (const f of fish) drawFishShadow(c, f, f.x, f.y, f.ang, f.spawn);
  // 沈んだ紙（魚より下）
  const dipped = poi.state === 'dip';
  if (dipped) { drawPaper(c, poi.x, poi.y, poi.r, 0.78); }
  // 魚
  for (const f of fish) if (f.tier < 3) drawFishBody(c, f, f.x, f.y, f.ang, f.spawn, f.spawn);
  for (const f of fish) if (f.tier === 3) drawFishBody(c, f, f.x, f.y, f.ang, f.spawn, f.spawn);
  // 破れた紙片
  for (const s of shards) {
    const u = s.t / 0.9;
    c.save(); c.translate(s.x, s.y); c.rotate(s.rot * 0.3); c.scale(1 - u * 0.3, 1 - u * 0.3); c.globalAlpha = 1 - u;
    c.beginPath(); c.arc(0, 0, s.r * 0.95, s.a + (s.side > 0 ? 0 : Math.PI), s.a + (s.side > 0 ? Math.PI : 2 * Math.PI));
    const ca = Math.cos(s.a), sa = Math.sin(s.a);
    for (let i = s.jag.length - 1; i >= 0; i--) { const j = s.side > 0 ? s.jag[i] : s.jag[s.jag.length - 1 - i]; const px = j[0] * (s.side > 0 ? 1 : -1), py = j[1]; c.lineTo((px * ca - py * sa) * s.r * 0.95, (px * sa + py * ca) * s.r * 0.95); }
    c.closePath(); c.fillStyle = 'rgba(200,215,225,0.8)'; c.fill(); c.strokeStyle = 'rgba(90,100,110,0.6)'; c.lineWidth = 1.5; c.stroke();
    c.restore();
  }
  c.restore(); // clip終わり

  // ポイ
  let px = poi.x, py = poi.y, pr = poi.r;
  if (poi.state === 'enter') { const u = easeOut(poi.enterT); px = lerp(W + 120, poi.x, u); py = lerp(H - 200, poi.y, u); }
  if (poi.state === 'torn') {
    const u = clamp(poi.tearT / 0.6, 0, 1);
    drawRing(c, px + u * 30, py + u * 50, pr * (1 - u * 0.1), 1 - u);
  } else if (dipped) {
    // 水面のゆらぎ
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3;
    c.beginPath(); c.arc(px, py, pr + 6 + Math.sin(G.realT * 12) * 2, 0, 7); c.stroke();
    drawRing(c, px, py, pr, 1);
  } else {
    const lift = 1 + 0.06 * (1 - poi.sink);
    // 影
    c.fillStyle = 'rgba(0,30,60,0.25)'; c.beginPath(); c.arc(px + 16, py + 26, pr * lift, 0, 7); c.fill();
    // 大きいポイは紙を薄くして、下の魚が見えるようにする
    drawPaper(c, px, py, pr * lift, pr > 120 ? lerp(0.85, 0.5, clamp((pr - 120) / 120, 0, 1)) : 1);
    drawRing(c, px, py, pr * lift, 1);
  }
  // 持ち上げた魚（ポイの上でピチピチ）
  for (const L of lifted) {
    const u = clamp(L.t / 0.34, 0, 1), jump = Math.sin(u * Math.PI) * 26;
    const f = L.f; f.phase += 0.9;
    const sc = 1 + 0.35 * u;
    c.fillStyle = 'rgba(0,35,75,0.25)'; drawFishShadow(c, f, poi.x + L.dx, poi.y + L.dy, f.ang, sc * 0.9);
    drawFishBody(c, f, poi.x + L.dx, poi.y + L.dy - jump, f.ang + Math.sin(L.t * 40) * 0.25, sc, 1);
  }
  // 水しぶき・紙くず
  for (const p of parts) {
    if (p.k === 'drop') { c.fillStyle = p.c; c.globalAlpha = 0.9; c.beginPath(); c.arc(p.x, p.y - p.z, p.s * (1 + p.z / 300), 0, 7); c.fill(); }
    else if (p.k === 'shred') { c.save(); c.translate(p.x, p.y - p.z); c.rotate(p.rot); c.fillStyle = p.c; c.globalAlpha = 0.9; c.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); c.restore(); }
  }
  c.globalAlpha = 1;
  // 手前のぼけ
  c.globalCompositeOperation = 'lighter';
  for (const b of FG_BOKEH) { c.globalAlpha = 0.1 + 0.05 * Math.sin(G.realT * 1.5 + b.p); const s = bokehSprite(b.c); c.drawImage(s, b.x - b.s / 2, b.y - b.s / 2, b.s, b.s); }
  c.globalAlpha = 1;
  for (const p of parts) if (p.k === 'spark') {
    const u = p.t / p.life; c.globalAlpha = 1 - u; c.fillStyle = p.c;
    c.save(); c.translate(p.x, p.y); c.rotate(p.rot); const s = p.s * (1 - u * 0.5);
    c.beginPath(); c.moveTo(0, -s * 1.6); c.lineTo(s * 0.4, 0); c.lineTo(0, s * 1.6); c.lineTo(-s * 0.4, 0); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-s * 1.6, 0); c.lineTo(0, s * 0.4); c.lineTo(s * 1.6, 0); c.lineTo(0, -s * 0.4); c.closePath(); c.fill();
    c.restore();
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';

  // 文字（コンボ・ビリッ）
  for (const tx of texts) {
    const u = tx.t / tx.life, s = tx.combo ? 0.5 + 0.6 * elastic(Math.min(1, tx.t * 3.5)) : 0.6 + 0.4 * elastic(Math.min(1, tx.t * 4));
    c.save(); c.translate(tx.x, tx.y - (tx.combo ? 0 : u * 40)); c.rotate(tx.rot); c.scale(s, s); c.globalAlpha = u > 0.75 ? (1 - u) / 0.25 : 1;
    text(c, tx.s, 0, 0, tx.size, tx.fill, tx.stroke, tx.size * 0.16);
    c.restore();
  }
  c.globalAlpha = 1;
  // 数字
  for (const p of pops) {
    const pop = p.t < 0.15 ? elastic(p.t / 0.15) : 1, fly = p.t > 0.45 ? 1 - 0.5 * clamp((p.t - 0.45) / 0.42, 0, 1) : 1;
    const size = (44 + Math.min(44, Math.log10(p.v + 1) * 14)) * pop * fly * (p.k || 1);
    const fill = p.big >= 2 ? '#ffe14a' : p.big === 1 ? '#fff3b0' : '#ffffff';
    text(c, '+' + fmt(p.v), p.x, p.y, size, fill, p.big >= 2 ? '#b0300a' : '#d2501a', Math.max(4, size * 0.18));
  }

  // ---- HUD（揺れなし）
  c.setTransform(1, 0, 0, 1, 0, 0);
  drawHUD(c);
  drawShop(c);
  if (BOT || Q.get('hand') === '1') drawHand(c);
  for (const tp of taps) { const u = tp.t / 0.4; c.strokeStyle = `rgba(255,255,255,${1 - u})`; c.lineWidth = 4; c.beginPath(); c.arc(tp.x, tp.y, 10 + u * 50, 0, 7); c.stroke(); }
  // 段位アップ
  if (G.banner) drawBanner(c, G.banner);
  if (G.flash > 0) { c.fillStyle = `rgba(255,255,255,${G.flash})`; c.fillRect(0, 0, W, H); }
  if (G.caption) {
    const u = G.caption.t / G.caption.life, s = elastic(Math.min(1, G.caption.t * 4));
    c.save(); c.translate(W / 2, 270); c.scale(s, s); c.globalAlpha = u > 0.85 ? (1 - u) / 0.15 : 1;
    text(c, G.caption.s, 0, 0, 62, '#ffffff', '#111', 14);
    c.restore(); c.globalAlpha = 1;
  }
}

// 自動プレイ時の「手」：池ではポイの柄を持ち、ショップでは指で押す
function drawHand(c) {
  let x, y, rot, pressing;
  const inShop = (input.away || input.py >= SHOP_Y) && poi.state !== 'dip';
  if (inShop) { x = input.px + 18; y = input.py + 34; rot = -0.35; pressing = taps.some(t => t.t < 0.15); }
  else {
    if (poi.state === 'torn' || poi.state === 'enter') return;
    const lift = poi.state === 'dip' ? 1 : 1.06, a = 0.95, L = Math.max(90, poi.r * lift * 1.7);
    x = poi.x + Math.cos(a) * (poi.r * lift + L * 0.78); y = poi.y + Math.sin(a) * (poi.r * lift + L * 0.78); rot = a - Math.PI / 2 - 0.5; pressing = false;
  }
  const s = pressing ? 0.9 : 1;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(8, 12, 34, 42, 0, 0, 7); c.fill();
  c.fillStyle = '#ffd9bd'; c.strokeStyle = '#7a3f22'; c.lineWidth = 3.5; c.lineJoin = 'round';
  // 人差し指
  rr(c, -9, -64, 20, 56, 10); c.fill(); c.stroke();
  // 手の甲
  c.beginPath(); c.moveTo(-26, -14); c.quadraticCurveTo(-30, 36, 0, 42); c.quadraticCurveTo(30, 40, 30, 4);
  c.quadraticCurveTo(30, -18, 12, -16); c.lineTo(-14, -16); c.quadraticCurveTo(-26, -18, -26, -14); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(122,63,34,0.6)'; c.lineWidth = 2;
  for (const yy of [-4, 8, 20]) { c.beginPath(); c.moveTo(12, yy); c.lineTo(28, yy); c.stroke(); }
  c.fillStyle = '#ffffff'; c.globalAlpha = 0.5; rr(c, -5, -60, 7, 18, 4); c.fill(); c.globalAlpha = 1;
  c.restore();
}

function coinIcon(c, x, y, r) {
  c.fillStyle = '#b8860b'; c.beginPath(); c.arc(x, y + 2, r, 0, 7); c.fill();
  const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, '#fff6b0'); g.addColorStop(0.5, '#ffd23a'); g.addColorStop(1, '#e09a10');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.fillStyle = '#9a6a08'; c.fillRect(x - r * 0.22, y - r * 0.22, r * 0.44, r * 0.44);
  c.strokeStyle = 'rgba(150,100,10,0.7)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r * 0.72, 0, 7); c.stroke();
}

function drawHUD(c) {
  // 上の帯
  const g = c.createLinearGradient(0, 0, 0, 175);
  g.addColorStop(0, 'rgba(5,5,15,0.65)'); g.addColorStop(1, 'rgba(5,5,15,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, 175);
  // サイズのダイヤル（左上）
  const dx = 92, dy = 92, dr = 70;
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.arc(dx + 3, dy + 5, dr, 0, 7); c.fill();
  const dg = c.createRadialGradient(dx - 20, dy - 20, 5, dx, dy, dr);
  dg.addColorStop(0, '#fffbe8'); dg.addColorStop(1, '#ffd8a0');
  c.fillStyle = dg; c.beginPath(); c.arc(dx, dy, dr, 0, 7); c.fill();
  c.lineWidth = 7; c.strokeStyle = '#e8321e'; c.stroke();
  c.strokeStyle = '#7a3a10';
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2 - Math.PI / 2, l = i % 4 === 0 ? 12 : 6; c.lineWidth = i % 4 === 0 ? 3 : 1.5; c.beginPath(); c.moveTo(dx + Math.cos(a) * (dr - 8), dy + Math.sin(a) * (dr - 8)); c.lineTo(dx + Math.cos(a) * (dr - 8 - l), dy + Math.sin(a) * (dr - 8 - l)); c.stroke(); }
  const cm = G.dial, na = ((cm * 10) % 10) / 10 * Math.PI * 2 - Math.PI / 2;
  c.strokeStyle = 'rgba(230,50,30,0.9)'; c.lineWidth = 4; c.beginPath(); c.moveTo(dx, dy); c.lineTo(dx + Math.cos(na) * (dr - 14), dy + Math.sin(na) * (dr - 14)); c.stroke();
  let big, small;
  if (cm < 100) { big = cm.toFixed(1); small = 'cm'; } else { big = Math.floor(cm / 100) + 'm'; small = Math.floor(cm % 100) + 'cm'; }
  text(c, 'ポイ', dx, dy - 36, 18, '#7a3a10', null, 0);
  text(c, big, dx, dy + 2, cm < 100 ? 44 : 40, '#2a1206', '#fffbe8', 6);
  text(c, small, dx, dy + 36, 20, '#7a3a10', null, 0);
  // コイン（右上）
  const bs = 1 + 0.4 * easeOut(G.bump);
  c.save(); c.translate(COUNTER.x, COUNTER.y); c.scale(bs, bs);
  const s = fmt(G.disp);
  c.font = '900 66px ' + FONT; const tw = c.measureText(s).width;
  coinIcon(c, -tw - 36, 0, 26);
  text(c, s, 0, 2, 66, '#ffe14a', '#3a1a04', 12, 'right');
  c.restore();
  // 紙の強さバー
  const bx = 190, by = 140, bw = 510, bh = 22;
  const df = clamp(poi.state === 'torn' ? 0 : poiDur() / poi.max, 0, 1);
  const shk = df < 0.25 && poi.state === 'dip' ? Math.sin(G.realT * 60) * 2 : 0;
  rr(c, bx + shk, by, bw, bh, 11); c.fillStyle = 'rgba(0,0,0,0.55)'; c.fill();
  const col = df > 0.5 ? '#5ee07a' : df > 0.25 ? '#ffd23a' : '#ff4a3a';
  if (df > 0) { rr(c, bx + 3 + shk, by + 3, Math.max(16, (bw - 6) * df), bh - 6, 8); c.fillStyle = col; c.fill(); }
  c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.5)'; rr(c, bx + shk, by, bw, bh, 11); c.stroke();
  text(c, '紙', bx - 18, by + bh / 2, 24, '#ffffff', '#000', 5);
  text(c, 'いま：' + TIERS[G.tier].name, 190, 112, 24, '#ffffff', '#000', 5, 'left');
}

function drawShop(c) {
  for (let i = 0; i < 3; i++) {
    const b = btnRect(i), p = price(i), can = G.coins >= p, maxed = p === Infinity;
    const ps = 1 - press[i] * 0.5 + (can && !maxed ? 0.02 * Math.sin(G.realT * 6 + i) : 0);
    const dshk = deny[i] > 0 ? Math.sin(deny[i] * 60) * 6 : 0;
    c.save(); c.translate(b.x + b.w / 2 + dshk, b.y + b.h / 2); c.scale(ps, ps);
    const x = -b.w / 2, y = -b.h / 2;
    c.fillStyle = 'rgba(0,0,0,0.5)'; rr(c, x + 3, y + 7, b.w, b.h, 26); c.fill();
    let g;
    if (can && !maxed) { g = c.createLinearGradient(0, y, 0, y + b.h); g.addColorStop(0, '#ffe066'); g.addColorStop(1, '#ff8a1f'); }
    else { g = c.createLinearGradient(0, y, 0, y + b.h); g.addColorStop(0, '#2a3358'); g.addColorStop(1, '#161b33'); }
    c.fillStyle = g; rr(c, x, y, b.w, b.h, 26); c.fill();
    if (!can && !maxed) {
      const f = clamp(G.coins / p, 0, 1);
      c.save(); rr(c, x, y, b.w, b.h, 26); c.clip(); c.fillStyle = 'rgba(70,150,255,0.35)'; c.fillRect(x, y + b.h * (1 - f), b.w, b.h * f);
      c.fillStyle = '#7fc4ff'; c.fillRect(x, y + b.h * (1 - f) - 2, b.w, 4); c.restore();
    }
    c.lineWidth = 4; c.strokeStyle = can && !maxed ? '#fff8d0' : 'rgba(255,255,255,0.18)'; rr(c, x, y, b.w, b.h, 26); c.stroke();
    // アイコン
    const ix = 0, iy = y + 52;
    if (i === 0) {
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.arc(ix + 3, iy + 4, 32, 0, 7); c.fill();
      c.fillStyle = '#fafaf5'; c.beginPath(); c.arc(ix, iy, 30, 0, 7); c.fill(); c.lineWidth = 5; c.strokeStyle = '#d6261f'; c.stroke();
      text(c, '強', ix, iy + 2, 32, '#d6261f', null, 0);
    } else if (i === 1) {
      c.fillStyle = '#fafaf5'; c.beginPath(); c.arc(ix, iy, 24, 0, 7); c.fill(); c.lineWidth = 5; c.strokeStyle = '#d6261f'; c.stroke();
      c.strokeStyle = can ? '#7a2a00' : '#ffd23a'; c.lineWidth = 4;
      for (const a of [0.3, 2.3, 4.0]) { const cx = Math.cos(a), sy = Math.sin(a); c.beginPath(); c.moveTo(ix + cx * 30, iy + sy * 30); c.lineTo(ix + cx * 44, iy + sy * 44); c.stroke(); }
    } else {
      const nt = Math.min(3, G.tier + 1);
      const ff = { tier: nt, r: 1, phase: G.realT * 6, var: 0, patches: nt === 2 ? [[-0.2, 0, 0.25], [0.4, 0.05, 0.18]] : nt === 3 ? [[0, 0.1, 0.04]] : [] };
      const scale = nt === 3 ? 40 : nt === 2 ? 46 : 40;
      ff.r = scale;
      if (!maxed) drawFishBody(c, ff, ix + 4, iy, -0.15, 1, 1);
    }
    const tc = can && !maxed ? '#3a1404' : '#ffffff';
    text(c, SHOP[i].name, 0, y + 104, 26, tc, null, 0);
    let sub = maxed ? '最大' : i === 0 ? 'Lv ' + (G.lv.dur + 1) : i === 1 ? 'Lv ' + (G.lv.size + 1) : '→ ' + TIERS[G.tier + 1].name;
    text(c, sub, 0, y + 132, 20, can && !maxed ? '#7a3a10' : '#a8b4e0', null, 0, 'center', '700');
    if (!maxed) {
      const ps2 = fmt(p); c.font = '900 30px ' + FONT; const w = c.measureText(ps2).width;
      coinIcon(c, -w / 2 - 14, y + 160, 12);
      text(c, ps2, 8, y + 161, 30, deny[i] > 0 ? '#ff4a3a' : can ? '#ffffff' : '#ffd23a', can ? '#7a2a00' : '#000', 6);
    }
    if (boughtFx[i] > 0) { c.globalAlpha = boughtFx[i] / 0.6; c.fillStyle = '#ffffff'; rr(c, x, y, b.w, b.h, 26); c.fill(); c.globalAlpha = 1; }
    c.restore();
  }
}

function drawBanner(c, b) {
  const t = b.t, u = t / b.life;
  const inT = elastic(Math.min(1, t * 3)), out = u > 0.82 ? (1 - u) / 0.18 : 1;
  c.save(); c.globalAlpha = out;
  // 放射状の光
  c.translate(W / 2, 560);
  c.save(); c.rotate(t * 0.8); c.fillStyle = 'rgba(255,230,120,0.18)';
  for (let i = 0; i < 14; i++) { c.rotate(Math.PI * 2 / 14); c.beginPath(); c.moveTo(0, 0); c.lineTo(-60, -700); c.lineTo(60, -700); c.closePath(); c.fill(); }
  c.restore();
  c.scale(inT, inT); c.rotate(-0.05);
  c.fillStyle = '#d6261f'; rr(c, -330, -70, 660, 140, 30); c.fill();
  c.lineWidth = 8; c.strokeStyle = '#ffe14a'; c.stroke();
  text(c, b.s, 0, -4, b.s.length > 7 ? 64 : 76, '#ffffff', '#5a0a04', 12);
  c.restore(); c.globalAlpha = 1;
}

// ---------------------------------------------------------------- ループ
const FPS = { dts: [], work: [] };
window.__fpsStats = () => {
  const d = FPS.dts.slice(1); if (!d.length) return null;
  const sum = d.reduce((a, b) => a + b, 0), sorted = d.slice().sort((a, b) => a - b);
  const wk = FPS.work.slice().sort((a, b) => a - b);
  return { frames: d.length, seconds: sum / 1000, fps: d.length / (sum / 1000), p50ms: sorted[Math.floor(d.length * 0.5)], p95ms: sorted[Math.floor(d.length * 0.95)], maxms: sorted[d.length - 1],
    work_p50ms: wk[Math.floor(wk.length * 0.5)], work_p95ms: wk[Math.floor(wk.length * 0.95)], fish: fish.length };
};
window.__fpsReset = () => { FPS.dts.length = 0; FPS.work.length = 0; };
window.__state = () => ({ t: G.realT, coins: G.coins, earned: G.earned, tier: G.tier, lv: G.lv, fish: fish.length, scoops: G.scoops, tears: G.tears, poi: poi.state });
window.__fishPos = () => fish.map(f => [f.x, f.y]);
window.__caption = (s, life) => { G.caption = { s, t: 0, life: life || 2 }; };
window.__step = dt => update(dt);
window.__render = () => render();

if (!FIXED) {
  let last = performance.now();
  const loop = now => {
    const ms = now - last; last = now; FPS.dts.push(ms); if (FPS.dts.length > 20000) FPS.dts.shift();
    const w0 = performance.now();
    update(Math.min(0.05, ms / 1000));
    render();
    FPS.work.push(performance.now() - w0); if (FPS.work.length > 20000) FPS.work.shift();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
} else render();
})();
