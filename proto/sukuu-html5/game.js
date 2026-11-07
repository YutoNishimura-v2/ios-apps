// すくう — 金魚すくい 試作 第7回（HTML5 canvas 2D、外部アセットなし）
// 池 → 海 → 星 → 宇宙。各世界の「主（ぬし）」をすくうと、カメラが引いて次の世界へ。
// ?bot=1 自動プレイ、?human=1 bot を人の速さに、?seed=N、?fixed=1 固定刻み（window.__step / __render）、?world=N 途中から、?reset=1 セーブを消す
(() => {
'use strict';

// ---------------------------------------------------------------- 設定
const VERSION = 11;
const W = 720, H = 1280, TAU = Math.PI * 2;
const Q = new URLSearchParams(location.search);
const BOT = Q.get('bot') === '1';
const HUMAN = Q.get('human') === '1';
const FIXED = Q.get('fixed') === '1';
const SEED = parseInt(Q.get('seed') || '1', 10) || 1;
const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","YuGothic","Meiryo",sans-serif';

const TUB = { x: 22, y: 178, w: 676, h: 884, r: 64 };
const WATER = { x: TUB.x + 14, y: TUB.y + 14, w: TUB.w - 28, h: TUB.h - 28, r: TUB.r - 12 };
const SHOP_Y = 1080;
const COUNTER = { x: 700, y: 62 };
const BAG = { x: 96, y: 104, r: 52 };
const B = { x0: WATER.x + 18, x1: WATER.x + WATER.w - 18, y0: WATER.y + 18, y1: WATER.y + WATER.h - 18 };

// 世界。w＝重さ（紙の厚さで持てる量と比べる）、v＝値段（世界ごとに vs 倍）
// 紙の厚さで持てる重さ：3 × 1.6^Lv（Lv0 3／Lv2 7.7／Lv4 19.7）。主は 18 前後 → 厚さ Lv4 で、濡れる前にすくえば持てる
const WORLDS = [
  { id: 'pond', name: '池', label: '池すくい', scale: '', vs: 1, ripple: '230,250,255',
    kinds: [
      { id: 'kingyo', name: '金魚', draw: 'kingyo', r: 34, w: 1, v: 1, spd: 80, n: 11 },
      { id: 'demekin', name: '出目金', draw: 'demekin', r: 44, w: 2.6, v: 4, spd: 70, n: 4 },
      { id: 'koi', name: '鯉', draw: 'koi', r: 64, w: 7, v: 15, spd: 58, n: 2 },
      { id: 'nushi', name: '池の主', draw: 'bigkoi', r: 112, w: 17, v: 2200, spd: 40, n: 1, boss: true },
      // 二晩目から：宇宙から落ちてきた星の金魚（青く光る）と、帰ってきたキンちゃん（すばしこい、高い）
      { id: 'hoshikin', name: '星の金魚', draw: 'hoshikin', r: 36, w: 1.4, v: 12, spd: 95, n: 3, ng: 1 },
      { id: 'kinret', name: 'キンちゃん', draw: 'kin', r: 40, w: 2, v: 40, spd: 150, n: 1, ng: 1, rare: 9 },
    ] },
  { id: 'sea', name: '海', label: '海すくい', scale: '×10⁴', vs: 40, ripple: '220,245,255',
    vortex: { x: 0.74, y: 0.3, R: 200, core: 26, start: 5 },
    kinds: [
      { id: 'iwashi', name: 'いわし', draw: 'iwashi', r: 18, w: 0.32, v: 0.35, spd: 150, n: 22, school: true },
      { id: 'tai', name: '鯛', draw: 'tai', r: 44, w: 2.6, v: 5, spd: 95, n: 4 },
      { id: 'kame', name: '亀', draw: 'kame', r: 60, w: 7, v: 16, spd: 45, n: 2 },
      // 海の主役は大きさ：鯨は軽いが、ポイの大きさ Lv3 でないと枠に入らない
      { id: 'kujira', name: '鯨', draw: 'kujira', r: 195, w: 7, v: 2700, spd: 30, n: 1, boss: true },
      // 二晩目から：竜宮の亀（金色、たまに出る、高い）
      { id: 'ryugu', name: '竜宮の亀', draw: 'kame', gold: true, r: 56, w: 2.4, v: 70, spd: 75, n: 1, ng: 1, rare: 10 },
    ] },
  // 大陸：島は海の底に根を張っている。沈めたまま root 秒おさえないと、上げても抜けない（速乾が効く）
  { id: 'land', name: '大陸', label: '大陸すくい', scale: '×10⁶', vs: 1600, ripple: '220,240,255',
    kinds: [
      { id: 'shima', name: '小島', draw: 'island', r: 30, w: 0.7, v: 1.2, spd: 26, n: 9, root: 0.3 },
      { id: 'kazan', name: '火山島', draw: 'volcano', r: 46, w: 2.1, v: 5, spd: 22, n: 4, root: 0.4 },
      { id: 'oshima', name: '大きな島', draw: 'bigisland', r: 66, w: 5.5, v: 16, spd: 18, n: 2, root: 0.55 },
      // 大陸の主役は速乾：根が深く 2.6 秒おさえ続けないと抜けない。その間に紙が濡れる
      { id: 'tairiku', name: '大陸', draw: 'continent', r: 140, w: 6, v: 3400, spd: 12, n: 1, boss: true, root: 2.6 },
      // 二晩目から：浮き島（根がなく、雲に乗って速く流れる）
      { id: 'ukishima', name: '浮き島', draw: 'island', cloud: true, r: 34, w: 0.9, v: 9, spd: 85, n: 2, ng: 1 },
    ] },
  { id: 'sky', name: '星', label: '星すくい', scale: '×10⁸', vs: 64000, ripple: '200,215,255',
    vortex: { x: 0.2, y: 0.8, R: 180, core: 24, start: 3 },
    kinds: [
      { id: 'hoshi', name: '星', draw: 'star', r: 16, w: 0.32, v: 0.35, spd: 120, n: 20, school: true },
      { id: 'meteor', name: '流れ星', draw: 'meteor', r: 28, w: 1.4, v: 7, spd: 330, n: 2, fast: true },
      { id: 'planet', name: '惑星', draw: 'planet', r: 58, w: 7, v: 16, spd: 40, n: 3 },
      { id: 'sun', name: '太陽', draw: 'sun', r: 120, w: 10, v: 4300, spd: 24, n: 1, boss: true, heat: true },  // 熱で紙がすぐ濡れる：厚さと速乾の両方が要る
      // 二晩目から：彗星（大きな流れ星、緑に光る、高い）
      { id: 'suisei', name: '彗星', draw: 'meteor', comet: true, r: 40, w: 1.8, v: 45, spd: 260, n: 1, fast: true, ng: 1 },
    ] },
  { id: 'cosmos', name: '宇宙', label: '宇宙すくい', scale: '×10²⁰', vs: 2560000, ripple: '210,190,255',
    vortex: { x: 0.5, y: 0.44, R: 290, core: 58, start: 0, gravity: true },
    kinds: [
      { id: 'ginga', name: '銀河', draw: 'galaxy', r: 26, w: 0.4, v: 0.5, spd: 100, n: 16, school: true },
      { id: 'seiun', name: '星雲', draw: 'nebula', r: 62, w: 7, v: 16, spd: 34, n: 3 },
      // 宇宙の主役は大きさ：キンちゃんは大きな光の輪をまとっていて、輪ごとすくう（大きさ Lv2 が要る）
      { id: 'kin', name: 'キンちゃん', draw: 'kin', halo: true, r: 150, w: 6, v: 500, spd: 110, n: 1, boss: true, orbit: true },
      // 二晩目から：星の金魚の群れ（宇宙に散った金魚）
      { id: 'hoshikin2', name: '星の金魚', draw: 'hoshikin', r: 34, w: 0.6, v: 2.5, spd: 95, n: 5, ng: 1 },
    ] },
];
// 強化（3 系統）。どれも「取れるもの」を変える
//  厚さ：持てる重さ。赤い輪の獲物（重すぎ）が持てるようになる。主は厚さが要る
//  大きさ：枠が広がる。群れをまとめて囲める（欲張り倍率）
//  速乾：水の中で紙が濡れにくい。逃げる獲物・流れ星を水の中で追いかけられる。太陽の熱にも強い
const UPG = [
  { id: 't', name: '紙の厚さ', base: 18, g: 1.7, max: 6 },
  { id: 's', name: 'ポイの大きさ', base: 24, g: 1.7, max: 6 },
  { id: 'd', name: '速乾', base: 30, g: 1.75, max: 5 },
];
function capOf(lv) { return 3 * Math.pow(1.6, lv); }
function radOf(lv) { return 84 * (1 + 0.16 * lv); }
function dryOf(lv) { return Math.pow(0.74, lv); }
const mult = n => 1 + 0.3 * (n - 1);

// ---------------------------------------------------------------- 乱数（決定的）
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED * 9973 + 7);
const frng = mulberry32(SEED * 7919 + 13);
const brng = mulberry32(SEED * 104729 + 1);
const R = (a, b) => a + (b - a) * frng();
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const elastic = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t) * Math.cos(t * 10.5);
function angLerp(a, b, t) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * t; }
function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('en-US');
  if (n < 1e6) return (n / 1e3).toFixed(n < 1e5 ? 1 : 0) + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(n < 1e8 ? 1 : 0) + 'M';
  if (n < 1e12) return (n / 1e9).toFixed(n < 1e11 ? 1 : 0) + 'B';
  return (n / 1e12).toFixed(1) + 'T';
}

// ---------------------------------------------------------------- canvas
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
function fit() {
  if (FIXED) { cv.style.width = W + 'px'; cv.style.height = H + 'px'; return; }
  const vv = window.visualViewport, vw = vv ? vv.width : window.innerWidth, vh = vv ? vv.height : window.innerHeight;
  const s = Math.min(vw / W, vh / H);
  cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px';
}
fit(); window.addEventListener('resize', fit);
if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);

function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function text(c, s, x, y, size, fill, stroke, lw, align, weight) {
  c.font = (weight || '900') + ' ' + size + 'px ' + FONT;
  c.textAlign = align || 'center'; c.textBaseline = 'middle';
  if (stroke) { c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = stroke; c.strokeText(s, x, y); }
  c.fillStyle = fill; c.fillText(s, x, y);
}

// ---------------------------------------------------------------- 事前描画
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
const BGK = 0.5;   // 背景の飾りの濃さ（第6回の指摘で半分）

function nightTop(g, c0, c1, c2) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, c0); gr.addColorStop(0.15, c1); gr.addColorStop(0.85, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
function frame(g, dark, mid, light) {
  const T = TUB;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
  rr(g, T.x - 6, T.y - 6, T.w + 12, T.h + 12, T.r + 6); g.fillStyle = dark; g.fill(); g.restore();
  const gr = g.createLinearGradient(0, T.y - 6, 0, T.y + T.h + 6);
  gr.addColorStop(0, light); gr.addColorStop(0.08, mid); gr.addColorStop(1, dark);
  rr(g, T.x - 6, T.y - 6, T.w + 12, T.h + 12, T.r + 6); g.fillStyle = gr; g.fill();
  // 樹脂のたらいのつや：縁の上側に白い光の筋、水との境に影
  const hl = g.createLinearGradient(0, T.y - 6, 0, T.y + T.h);
  hl.addColorStop(0, 'rgba(255,255,255,0.9)'); hl.addColorStop(0.35, 'rgba(255,255,255,0.25)'); hl.addColorStop(1, 'rgba(255,255,255,0.05)');
  g.lineWidth = 5; g.strokeStyle = hl; rr(g, T.x + 1, T.y + 1, T.w - 2, T.h - 2, T.r - 1); g.stroke();
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,10,40,0.45)'; rr(g, WATER.x - 3, WATER.y - 3, WATER.w + 6, WATER.h + 6, WATER.r + 3); g.stroke();
}
function frameEnd(g, hl, inner) {
  const T = TUB, ix = WATER.x, iy = WATER.y, iw = WATER.w, ih = WATER.h;
  g.lineWidth = 40; g.strokeStyle = inner; rr(g, ix, iy, iw, ih, WATER.r); g.stroke();
  g.restore();
  g.lineWidth = 3; g.strokeStyle = hl; rr(g, T.x - 4, T.y - 4, T.w + 8, T.h + 8, T.r + 4); g.stroke();
  g.lineWidth = 2; g.strokeStyle = 'rgba(10,20,50,0.8)'; rr(g, ix, iy, iw, ih, WATER.r); g.stroke();
  const gr = g.createLinearGradient(0, SHOP_Y - 10, 0, H);
  gr.addColorStop(0, 'rgba(10,8,20,0)'); gr.addColorStop(0.15, 'rgba(10,8,20,0.85)'); gr.addColorStop(1, '#06050c');
  g.fillStyle = gr; g.fillRect(0, SHOP_Y - 10, W, H - SHOP_Y + 10);
}
function waterClip(g) { g.save(); rr(g, WATER.x, WATER.y, WATER.w, WATER.h, WATER.r); g.clip(); }
function starDots(g, n, seed, x0, y0, w, h, amax) {
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) { const s = 0.6 + r() * 1.8; g.fillStyle = `rgba(255,255,255,${0.2 + r() * amax})`; g.fillRect(x0 + r() * w, y0 + r() * h, s, s); }
}

// gpt-image で作った絵（assets/）。読めたら池の背景を作り直す。読めないときは今までのコードの絵のまま
const IMG = {};
const ART = [['pond_backdrop', 'png', 0], ['pond_water', 'png', 0], ['sea_water', 'jpg', 1], ['land_water', 'jpg', 2], ['sky_space', 'jpg', 3], ['cosmos', 'jpg', 4]];
for (const [k, ext, world] of ART) {
  const im = new Image();
  im.onload = () => { IMG[k] = im; BGS[world] = null; };
  im.src = 'assets/' + k + '.' + ext;
}
// 獲物の絵（透過 png）。読めないときはコードの絵
for (const k of ['isl_small', 'isl_volcano', 'isl_big', 'isl_continent', 'sp_galaxy', 'sp_nebula', 'sp_planet', 'sp_sun']) {
  const im = new Image();
  im.onload = () => { IMG[k] = im; };
  im.src = 'assets/' + k + '.png';
}
const ISLAND_ART = { island: 'isl_small', volcano: 'isl_volcano', bigisland: 'isl_big', continent: 'isl_continent' };
// 絵を中心 (0,0) に、半径 half の正方形で描く
function sprite(c, key, half) {
  const im = IMG[key];
  if (!im) return false;
  c.drawImage(im, -half, -half, half * 2, half * 2);
  return true;
}
// 段の水（空）を絵で塗る。絵が読めていなければ false を返し、呼び側はコードの絵を描く
function artWater(g, key, shade) {
  const im = IMG[key];
  if (!im) return false;
  drawCover(g, im, WATER.x, WATER.y, WATER.w, WATER.h);
  if (shade) { g.fillStyle = shade; g.fillRect(WATER.x, WATER.y, WATER.w, WATER.h); }
  return true;
}
function drawCover(g, im, x, y, w, h, ax, ay) {
  const s = Math.max(w / im.width, h / im.height), dw = im.width * s, dh = im.height * s;
  g.drawImage(im, x + (w - dw) * (ax === undefined ? 0.5 : ax), y + (h - dh) * (ay === undefined ? 0.5 : ay), dw, dh);
}
function buildPondArtBG() {
  const c = mk(W, H), g = c.getContext('2d');
  nightTop(g, '#0b0e26', '#1a1638', '#07060f');
  // 上：提灯と夜店（絵の上の 1/6 を横いっぱいに）
  const bd = IMG.pond_backdrop, sh = bd.height * 0.2;
  g.drawImage(bd, 0, 0, bd.width, sh, 0, 0, W, W * sh / bd.width);
  const fade = g.createLinearGradient(0, 120, 0, 200); fade.addColorStop(0, 'rgba(7,6,15,0)'); fade.addColorStop(1, 'rgba(7,6,15,0.9)');
  g.fillStyle = fade; g.fillRect(0, 120, W, 80);
  frame(g, '#174f9e', '#2f86e0', '#7cc8ff');
  waterClip(g);
  drawCover(g, IMG.pond_water, WATER.x, WATER.y, WATER.w, WATER.h);
  // 魚が読めるよう、水を少し暗く・ふちを濃く
  const vg = g.createRadialGradient(W / 2, WATER.y + WATER.h * 0.5, 120, W / 2, WATER.y + WATER.h * 0.5, WATER.h * 0.65);
  vg.addColorStop(0, 'rgba(0,20,60,0.08)'); vg.addColorStop(1, 'rgba(0,15,50,0.45)');
  g.fillStyle = vg; g.fillRect(WATER.x, WATER.y, WATER.w, WATER.h);
  frameEnd(g, 'rgba(200,240,255,0.7)', 'rgba(5,30,70,0.35)');
  return c;
}
function buildPondBG() {
  if (IMG.pond_backdrop && IMG.pond_water) return buildPondArtBG();
  const c = mk(W, H), g = c.getContext('2d');
  nightTop(g, '#0b0e26', '#1a1638', '#07060f');
  const br = mulberry32(77);
  for (let i = 0; i < 26; i++) {
    const s = bokehSprite(WARM[i % 4]), sz = 40 + br() * 110, x = br() * W, y = br() < 0.7 ? br() * 200 : 1060 + br() * 220;
    g.globalAlpha = (0.25 + br() * 0.35) * BGK; g.drawImage(s, x - sz / 2, y - sz / 2, sz, sz);
  }
  g.globalAlpha = 1;
  g.strokeStyle = 'rgba(40,30,30,0.9)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-10, 18); g.quadraticCurveTo(W / 2, 70, W + 10, 18); g.stroke();
  for (let i = 0; i < 7; i++) {
    const x = 50 + i * 104, t = x / W, y = 18 + 4 * t * (1 - t) * 26 + 22;
    const s = bokehSprite('rgba(255,120,50,A)'); g.globalAlpha = 0.55 * BGK; g.drawImage(s, x - 70, y - 70, 140, 140); g.globalAlpha = BGK;
    const lg = g.createRadialGradient(x - 6, y - 6, 2, x, y, 24);
    lg.addColorStop(0, '#ffe2a0'); lg.addColorStop(0.5, '#ff6a2a'); lg.addColorStop(1, '#a8201a');
    g.fillStyle = lg; g.beginPath(); g.ellipse(x, y, 19, 24, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(120,20,10,0.5)'; g.lineWidth = 1;
    for (let k = -16; k <= 16; k += 8) { const hw = Math.sqrt(Math.max(0, 1 - (k / 24) ** 2)) * 19; g.beginPath(); g.moveTo(x - hw, y + k); g.lineTo(x + hw, y + k); g.stroke(); }
    g.fillStyle = '#1c1210'; g.fillRect(x - 9, y - 27, 18, 5); g.fillRect(x - 9, y + 22, 18, 5);
    g.globalAlpha = 1;
  }
  frame(g, '#174f9e', '#2f86e0', '#7cc8ff');
  waterClip(g);
  const ix = WATER.x, iy = WATER.y, iw = WATER.w, ih = WATER.h;
  let gr = g.createRadialGradient(W / 2, TUB.y + TUB.h * 0.45, 60, W / 2, TUB.y + TUB.h * 0.5, TUB.h * 0.62);
  gr.addColorStop(0, '#5fd6f0'); gr.addColorStop(0.55, '#2fa6dc'); gr.addColorStop(1, '#14629e');
  g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
  g.strokeStyle = `rgba(255,255,255,${0.075 * BGK})`; g.lineWidth = 3;
  for (let row = 0; row < 40; row++) for (let col = -1; col < 12; col++) {
    const cx = ix + col * 70 + (row % 2) * 35, cy = iy + row * 24;
    for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(cx, cy, k * 11, Math.PI, TAU); g.stroke(); }
  }
  const mr = mulberry32(5), MC = ['#ff6fa8', '#ffd84a', '#6affc9', '#b48cff', '#ffffff', '#5ab8ff'];
  for (let i = 0; i < 18; i++) {
    const x = ix + 30 + mr() * (iw - 60), y = iy + 30 + mr() * (ih - 60), r = 9 + mr() * 6;
    g.fillStyle = `rgba(0,30,70,${0.25 * BGK})`; g.beginPath(); g.ellipse(x + 4, y + 6, r, r * 0.8, 0, 0, TAU); g.fill();
    const mg = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
    mg.addColorStop(0, 'rgba(255,255,255,0.95)'); mg.addColorStop(0.35, MC[i % 6]); mg.addColorStop(1, 'rgba(20,60,120,0.8)');
    g.globalAlpha = 0.8 * BGK; g.fillStyle = mg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.globalAlpha = 1;
  }
  frameEnd(g, 'rgba(200,240,255,0.7)', 'rgba(5,30,70,0.35)');
  return c;
}
function buildSeaBG() {
  const c = mk(W, H), g = c.getContext('2d');
  nightTop(g, '#071226', '#0d1f3c', '#04070f');
  // 月と水平線
  const mg = bokehSprite('rgba(220,235,255,A)'); g.globalAlpha = 0.35; g.drawImage(mg, 520, -30, 180, 180); g.globalAlpha = 1;
  g.fillStyle = '#f2f6ff'; g.beginPath(); g.arc(610, 60, 26, 0, TAU); g.fill();
  frame(g, '#0a2a4c', '#155a8c', '#6fb6e0');
  waterClip(g);
  if (!artWater(g, 'sea_water', 'rgba(0,20,50,0.12)')) drawSeaWaterCode(g);
  frameEnd(g, 'rgba(160,220,255,0.6)', 'rgba(2,15,40,0.4)');
  return c;
}
function drawSeaWaterCode(g) {
  const ix = WATER.x, iy = WATER.y, iw = WATER.w, ih = WATER.h;
  let gr = g.createLinearGradient(0, iy, 0, iy + ih);
  gr.addColorStop(0, '#1d93c6'); gr.addColorStop(0.45, '#0d5f97'); gr.addColorStop(1, '#042349');
  g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
  // 光の筋
  for (let i = 0; i < 6; i++) {
    const x = ix + 40 + i * 120, w0 = 30 + (i % 3) * 14;
    g.fillStyle = `rgba(190,235,255,${0.05 + (i % 2) * 0.025})`;
    g.beginPath(); g.moveTo(x, iy); g.lineTo(x + w0, iy); g.lineTo(x + w0 * 3 + 120, iy + ih * 0.8); g.lineTo(x + 100, iy + ih * 0.8); g.closePath(); g.fill();
  }
  // 砂の波紋と岩・海藻（下の方、薄く）
  g.strokeStyle = 'rgba(255,240,200,0.05)'; g.lineWidth = 3;
  for (let k = 0; k < 9; k++) { g.beginPath(); for (let x = ix; x <= ix + iw; x += 20) { const y = iy + ih - 150 + k * 18 + Math.sin(x * 0.03 + k) * 6; x === ix ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = 'rgba(2,14,32,0.55)';
  for (const [x, y, rx, ry] of [[ix + 40, iy + ih - 20, 120, 60], [ix + iw - 50, iy + ih - 10, 150, 80], [ix + iw * 0.45, iy + ih + 10, 90, 40]]) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(20,90,70,0.35)'; g.lineWidth = 7; g.lineCap = 'round';
  for (let k = 0; k < 7; k++) { const x = ix + 70 + k * 85 + (k % 2) * 20; g.beginPath(); g.moveTo(x, iy + ih); for (let y = 0; y < 150 + (k % 3) * 50; y += 12) g.lineTo(x + Math.sin(y * 0.05 + k) * 12, iy + ih - y); g.stroke(); }
}
function buildSkyBG() {
  const c = mk(W, H), g = c.getContext('2d');
  nightTop(g, '#05061a', '#0b0c2a', '#03030c');
  starDots(g, 120, 31, 0, 0, W, 175, 0.6);
  frame(g, '#1a1a4a', '#2c2c78', '#8f9fff');
  waterClip(g);
  const ix = WATER.x, iy = WATER.y, iw = WATER.w, ih = WATER.h;
  let gr;
  if (!artWater(g, 'sky_space', 'rgba(5,5,30,0.15)')) drawSkyCode(g);
  // 足もとに地球の縁（さっきまでの海）
  const ex = W / 2, ey = iy + ih + 1150, er = 1240;
  g.save(); g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.clip();
  gr = g.createLinearGradient(0, ey - er, 0, ey - er + 140); gr.addColorStop(0, '#2f8fe0'); gr.addColorStop(1, '#0a2a5a');
  g.fillStyle = gr; g.fillRect(ix, ey - er, iw, 200);
  g.fillStyle = 'rgba(70,160,90,0.7)'; g.beginPath(); g.ellipse(W * 0.35, ey - er + 30, 120, 26, 0, 0, TAU); g.fill();
  g.restore();
  g.globalCompositeOperation = 'lighter';
  const a = g.createRadialGradient(ex, ey, er - 10, ex, ey, er + 40); a.addColorStop(0, 'rgba(90,190,255,0.6)'); a.addColorStop(1, 'rgba(90,190,255,0)');
  g.fillStyle = a; g.beginPath(); g.arc(ex, ey, er + 40, 0, TAU); g.fill();
  g.globalCompositeOperation = 'source-over';
  frameEnd(g, 'rgba(170,180,255,0.6)', 'rgba(5,5,30,0.45)');
  return c;
}
function drawSkyCode(g) {
  const ix = WATER.x, iy = WATER.y, iw = WATER.w, ih = WATER.h;
  const gr = g.createLinearGradient(0, iy, 0, iy + ih);
  gr.addColorStop(0, '#1c1f5e'); gr.addColorStop(0.5, '#121442'); gr.addColorStop(1, '#0a0b26');
  g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
  // 天の川（斜めの帯）
  const r = mulberry32(41);
  for (let i = 0; i < 26; i++) {
    const u = r(), x = ix + u * iw, y = iy + ih * (0.85 - u * 0.7) + (r() - 0.5) * 120, sz = 80 + r() * 140;
    g.globalAlpha = 0.12 + r() * 0.1; g.drawImage(bokehSprite(i % 3 ? 'rgba(150,140,255,A)' : 'rgba(255,170,220,A)'), x - sz / 2, y - sz / 2, sz, sz);
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 700; i++) {
    const u = r(), x = ix + u * iw, y = iy + ih * (0.85 - u * 0.7) + (r() - 0.5) * (r() < 0.7 ? 140 : 600), s = 0.6 + r() * 1.6;
    g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.6})`; g.fillRect(x, y, s, s);
  }
}
function buildCosmosBG() {
  const c = mk(W, H), g = c.getContext('2d');
  nightTop(g, '#030208', '#07051a', '#020106');
  starDots(g, 100, 51, 0, 0, W, 175, 0.5);
  frame(g, '#1c0f3a', '#3a1f6e', '#c9a8ff');
  waterClip(g);
  if (!artWater(g, 'cosmos', 'rgba(5,2,20,0.18)')) drawCosmosCode(g);
  frameEnd(g, 'rgba(210,180,255,0.6)', 'rgba(5,2,20,0.5)');
  return c;
}
function drawCosmosCode(g) {
  const ix = WATER.x, iy = WATER.y, iw = WATER.w, ih = WATER.h;
  let gr = g.createRadialGradient(W / 2, iy + ih * 0.44, 40, W / 2, iy + ih * 0.5, ih * 0.7);
  gr.addColorStop(0, '#1a0f3a'); gr.addColorStop(0.6, '#0b0720'); gr.addColorStop(1, '#030210');
  g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
  const r = mulberry32(61), NC = ['rgba(120,80,255,A)', 'rgba(255,90,180,A)', 'rgba(60,200,220,A)'];
  for (let i = 0; i < 14; i++) { const x = ix + r() * iw, y = iy + r() * ih, sz = 140 + r() * 220; g.globalAlpha = 0.08 + r() * 0.08; g.drawImage(bokehSprite(NC[i % 3]), x - sz / 2, y - sz / 2, sz, sz); }
  g.globalAlpha = 1;
  starDots(g, 500, 71, ix, iy, iw, ih, 0.6);
  // 遠くの小さな銀河
  for (let i = 0; i < 10; i++) { const x = ix + r() * iw, y = iy + r() * ih; g.save(); g.translate(x, y); g.rotate(r() * 3); g.globalAlpha = 0.35; g.drawImage(bokehSprite('rgba(230,220,255,A)'), -14, -5, 28, 10); g.restore(); }
  g.globalAlpha = 1;
}
const BGS = [];
function bgOf(k) { if (!BGS[k]) BGS[k] = [buildPondBG, buildSeaBG, buildLandBG, buildSkyBG, buildCosmosBG][k](); return BGS[k]; }
// 大陸：はるか上から見た海。雲が流れる
function buildLandBG() {
  const c = mk(W, H), g = c.getContext('2d');
  nightTop(g, '#0a1a33', '#12284a', '#050a14');
  starDots(g, 60, 91, 0, 0, W, 175, 0.4);
  frame(g, '#10304a', '#1f5f80', '#9fd8f0');
  waterClip(g);
  if (!artWater(g, 'land_water', 'rgba(0,15,40,0.12)')) drawLandCode(g);
  frameEnd(g, 'rgba(170,230,255,0.6)', 'rgba(2,20,45,0.4)');
  return c;
}
function drawLandCode(g) {
  const ix = WATER.x, iy = WATER.y, iw = WATER.w, ih = WATER.h;
  const gr = g.createRadialGradient(W / 2, iy + ih * 0.4, 50, W / 2, iy + ih * 0.5, ih * 0.7);
  gr.addColorStop(0, '#1f78b8'); gr.addColorStop(0.6, '#145a92'); gr.addColorStop(1, '#0a3466');
  g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
  // 浅瀬の明るいところ
  const r = mulberry32(13);
  for (let i = 0; i < 10; i++) { const x = ix + r() * iw, y = iy + r() * ih, s = 120 + r() * 160; g.globalAlpha = 0.12; g.drawImage(bokehSprite('rgba(90,220,230,A)'), x - s / 2, y - s / 2, s, s); }
  // 雲
  for (let i = 0; i < 16; i++) { const x = ix + r() * iw, y = iy + r() * ih, s = 90 + r() * 120; g.globalAlpha = 0.1 + r() * 0.08; g.drawImage(bokehSprite('rgba(255,255,255,A)'), x - s, y - s * 0.35, s * 2, s * 0.7); }
  g.globalAlpha = 1;
}

// コースティクス（池・海）
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
const TWINKLE = []; (function () { const r = mulberry32(81); for (let i = 0; i < 60; i++) TWINKLE.push([WATER.x + r() * WATER.w, WATER.y + r() * WATER.h, 1 + r() * 2, r() * 6]); })();

// キンちゃん（最初の金魚）の模様。地球の大陸と同じ並び（種明かしの手がかり）
const KIN_PATCH = [[-0.12, -0.1, 0.17], [0.16, 0.08, 0.13], [-0.3, 0.14, 0.09], [0.05, -0.2, 0.07]];

// ---------------------------------------------------------------- 状態
const G = {
  k: 0, coins: 0, disp: 0, earned: 0, lv: { t: 0, s: 0, d: 0 }, saved: 0, kin: false, rescued: 0, ng: 0,
  realT: 0, simT: 0, wt: 0, slowmo: 0, hitstop: 0, flash: 0, shake: 0, shx: 0, shy: 0,
  bump: 0, bagBump: 0, banner: null, caption: null, total: null, scoops: 0, tears: 0,
  clear: null, trans: null, ending: null, vortex: null, bossSpawnT: 2.2, idle: 0, lastInput: 0, seen: {},
};
const EV = []; window.__events = EV;
function ev(type, data) { EV.push(Object.assign({ t: +G.realT.toFixed(3), type, world: G.k }, data || {})); }
function seenOnce(key, data) { if (G.seen[key]) return false; G.seen[key] = 1; ev('new', Object.assign({ what: key }, data || {})); return true; }

const PARTS_CAP = 900;
const fish = [], parts = [], rings = [], texts = [], lifted = [], shards = [], taps = [], flyers = [], sucked = [];
let fishId = 0;
// 今の周で出る獲物（ng つきは二晩目から）。startWorld で決める
let KINDS = WORLDS[0].kinds.filter(K => !K.ng);
const WK = () => KINDS;
const WD = () => WORLDS[G.k];

const KINGYO_COLS = [['#ff4a1c', 'rgba(255,120,80,0.72)'], ['#ff2b2b', 'rgba(255,110,100,0.72)'], ['#ff7a12', 'rgba(255,170,90,0.72)'], ['#ff3d1f', 'rgba(255,235,225,0.75)']];
const PLANET_COLS = [['#e8a560', '#b8703a'], ['#7fc8e8', '#3a7fb0'], ['#d9c27a', '#a8884a'], ['#c87ad8', '#8a4aa0'], ['#e86a50', '#a83a2a']];

function makeFish(ki, x, y, spawnAnim) {
  const K = WK()[ki], a = rng() * TAU;
  const f = {
    id: fishId++, ki, K, x, y, vx: Math.cos(a) * K.spd * 0.5, vy: Math.sin(a) * K.spd * 0.5, ang: a,
    r: K.r * (K.boss ? 1 : 0.9 + rng() * 0.2), phase: rng() * 6, wander: a, alert: -1, flee: 0, spawn: spawnAnim ? 0 : 1,
    var: Math.floor(rng() * 5), patches: [], danger: 0, spin: rng() * TAU, entered: false,
  };
  if (K.draw === 'koi' || K.draw === 'bigkoi') { const n = 2 + Math.floor(rng() * 3); for (let i = 0; i < n; i++) f.patches.push([-0.6 + rng() * 1.3, (rng() - 0.5) * 0.3, 0.16 + rng() * 0.18]); }
  if (K.draw === 'kujira' || K.draw === 'kame') { for (let i = 0; i < 6; i++) f.patches.push([-0.6 + rng() * 1.2, (rng() - 0.5) * 0.4, 0.03 + rng() * 0.04]); }
  if (K.draw === 'planet') { f.ring = rng() < 0.5; f.tilt = (rng() - 0.5) * 0.8; }
  if (K.fast) {
    // 流れ星：池の外から入って横切る
    const side = Math.floor(rng() * 4), m = 60;
    const p = [[B.x0 - m, lerp(B.y0, B.y1, rng())], [B.x1 + m, lerp(B.y0, B.y1, rng())], [lerp(B.x0, B.x1, rng()), B.y0 - m], [lerp(B.x0, B.x1, rng()), B.y1 + m]][side];
    f.x = p[0]; f.y = p[1];
    const tx = lerp(B.x0 + 120, B.x1 - 120, rng()), ty = lerp(B.y0 + 150, B.y1 - 150, rng()), d = Math.hypot(tx - f.x, ty - f.y);
    f.vx = (tx - f.x) / d * K.spd; f.vy = (ty - f.y) / d * K.spd; f.ang = Math.atan2(f.vy, f.vx); f.spawn = 1;
  }
  fish.push(f);
  return f;
}
function spawnAt(ki, big) {
  const K = WK()[ki];
  let x = 0, y = 0;
  for (let k = 0; k < 14; k++) {
    x = B.x0 + K.r + rng() * (B.x1 - B.x0 - 2 * K.r); y = B.y0 + K.r + rng() * (B.y1 - B.y0 - 2 * K.r);
    const V = G.vortex, far = !V || Math.hypot(x - V.x, y - V.y) > V.R + K.r;
    if (Math.hypot(x - poi.x, y - poi.y) > poi.r + 80 + K.r && far) break;
  }
  if (K.school) {
    const n = Math.max(4, K.n - fish.filter(f => f.ki === ki).length);
    for (let i = 0; i < n; i++) { const a = rng() * TAU, d = rng() * 70; makeFish(ki, clamp(x + Math.cos(a) * d, B.x0 + 20, B.x1 - 20), clamp(y + Math.sin(a) * d, B.y0 + 20, B.y1 - 20), true); }
    splash(x, y, 14, 1.0);
    return;
  }
  const f = makeFish(ki, x, y, !K.fast);
  if (!K.fast) splash(x, y, big ? 30 : 8, big ? 1.8 : 0.8);
  return f;
}
const bossFish = () => fish.find(f => f.K.boss);

// ---------------------------------------------------------------- ポイ
function makeCracks() {
  const cr = [];
  for (let i = 0; i < 7; i++) {
    const a = rng() * TAU, pts = [[Math.cos(a) * 0.95, Math.sin(a) * 0.95]];
    let ang = a + Math.PI + (rng() - 0.5) * 0.8, x = pts[0][0], y = pts[0][1];
    for (let k = 0; k < 5; k++) { ang += (rng() - 0.5) * 1.1; x += Math.cos(ang) * 0.16; y += Math.sin(ang) * 0.16; pts.push([x, y]); }
    cr.push(pts);
  }
  return cr;
}
const poi = {
  x: W / 2, y: 640, tx: W / 2, ty: 640, r: 84, rT: 84, rv: 0, state: 'hover', sink: 0, dipT: 0,
  wet: 0, cracks: makeCracks(), tearT: 0, enterT: 1, speed: 0, dripT: 0, fiber: [], squash: 0, glow: 0, load: 0, over: 0, heat: 0, burn: 0,
};
(function () { for (let i = 0; i < 26; i++) poi.fiber.push([rng() * 2 - 1, rng() * 2 - 1, rng() * 6, 0.1 + rng() * 0.25]); })();
const cap = () => capOf(G.lv.t);
// 乾いた紙は表示より 12% 余裕がある（「→ 〇〇が持てる」を買った直後に、少し濡れただけで破れないように）
const capEff = () => cap() * (1.12 - 0.6 * poi.wet);
// はじめての人：一晩目の池で、最初の 3 回は破れない。最初の 12 すくいは、ポイの真下にいた金魚が逃げない
const grace = () => G.ng === 0 && G.k === 0 && (G.dips || 0) <= 3;
const beginner = () => G.ng === 0 && G.k === 0 && G.scoops < 12;
// 守りは一度に切らず、一晩目の池の EASE_FROM〜EASE_TO 秒で少しずつ弱める（1 → 0）。批評 r9：守りが切れた直後に 13 秒で 5 回破れた
const EASE_FROM = 60, EASE_TO = 170;
// 批評 r10：時間だけで守りを 0 にすると、すくえない人が 44 秒止まった。
// 一晩目は、しばらくすくえていない人にだけ守りを戻す（SLUMP_FROM 秒すくえないと効き始め、SLUMP_LEN 秒で全部）
const SLUMP_FROM = 5, SLUMP_LEN = 5;
const slump = () => (G.ng === 0 ? clamp((G.wt - (G.lastScoopT || 0) - SLUMP_FROM) / SLUMP_LEN, 0, 1) : 0);
const ease = () => {
  if (G.ng !== 0) return 0;
  if (G.k !== 0) return slump();
  if (beginner()) return 1;
  return Math.max(slump(), clamp((EASE_TO - G.wt) / (EASE_TO - EASE_FROM), 0, 1));
};
// 一晩目の池に長くいると、池の主が疲れてくる（軽くなり、逃げずにポイへ寄る）。速い人には効かない
const TIRED_FROM = 95, TIRED_LEN = 40;
const tiredOf = f => (f.K.boss && G.ng === 0 && G.k === 0 ? clamp((G.wt - TIRED_FROM) / TIRED_LEN, 0, 1) : 0);
// 疲れきった主は 17 → 3.4（紙の厚さ Lv1 で持てる）
const wOf = f => f.K.w * (1 - 0.8 * tiredOf(f));
function insidePoi(f) { return Math.hypot(f.x - poi.x, f.y - poi.y) + f.r * 0.55 <= poi.r * 0.98; }
const tooHeavy = f => wOf(f) > cap() + 1e-6;
// 枠に入りきらない（ポイの大きさが要る）
const fitsLv = (K, lv) => K.r * 0.55 + 15 <= radOf(lv) * 0.98;
const tooBig = f => !fitsLv(f.K, G.lv.s);
function nextFit() { if (G.lv.s >= UPG[1].max) return null; for (const K of WK()) if (!fitsLv(K, G.lv.s) && fitsLv(K, G.lv.s + 1)) return K; return null; }

// ---------------------------------------------------------------- 音（WebAudio 合成）
let AC = null;
function initAudio() { if (AC || FIXED) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
function wakeAudio() { initAudio(); if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) { } } }
function tone(f0, f1, dur, type, vol, delay) {
  if (!AC) return;
  try {
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) { }
}
function noise(dur, vol, freq, q) {
  if (!AC) return;
  try {
    const n = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(AC.destination); s.start();
  } catch (e) { }
}
const SFX = {
  dip() { noise(0.18, 0.25, 700, 0.8); },
  plop(i) { tone(520 + i * 40, 180, 0.12, 'sine', 0.35); },
  coin(i) { tone(1200 + (i % 8) * 90, 1800 + (i % 8) * 90, 0.09, 'triangle', 0.12); },
  rip() { noise(0.35, 0.6, 2500, 0.6); noise(0.2, 0.4, 900, 1); },
  creak() { tone(140, 90, 0.18, 'sawtooth', 0.05); },
  buy() { [660, 880, 1320].forEach((f, i) => tone(f, f * 1.02, 0.14, 'square', 0.07, i * 0.06)); },
  unlock() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.22, 'triangle', 0.1, i * 0.05)); },
  boss() { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.5, 'triangle', 0.12, i * 0.07)); noise(0.6, 0.3, 400, 0.5); },
  combo(n) { tone(400 + n * 60, 800 + n * 90, 0.2, 'sawtooth', 0.06); },
  boom() { noise(0.8, 0.5, 120, 0.6); tone(90, 40, 0.6, 'sine', 0.3); },
};

// ---------------------------------------------------------------- エフェクト
function splash(x, y, n, power, col) {
  if (parts.length + n > PARTS_CAP) parts.splice(0, parts.length + n - PARTS_CAP);
  const dc = G.k >= 2 ? '#d8dcff' : '#ffffff';
  for (let i = 0; i < n; i++) {
    const a = R(0, TAU), s = R(60, 220) * power;
    parts.push({ k: 'drop', x, y, z: R(0, 6), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.8, vz: R(180, 420) * power, s: R(2.5, 6) * Math.sqrt(power), c: col || (frng() < 0.5 ? dc : '#bff4ff'), life: 2 });
  }
  rings.push({ x, y, r: 6, vr: 140 * power, life: 0.7, t: 0, w: 4 });
  rings.push({ x, y, r: 2, vr: 80 * power, life: 0.9, t: 0, w: 2.5 });
}
function sparks(x, y, n, col, spd) {
  for (let i = 0; i < n; i++) {
    const a = R(0, TAU), s = R(0.3, 1) * (spd || 360);
    parts.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, s: R(3, 7), c: col || '#ffe14a', life: R(0.35, 0.7), t: 0, rot: R(0, 6) });
  }
}
function floatText(s, x, y, size, fill, stroke, life, rot) { texts.length = 0; texts.push({ s, x, y, size, fill, stroke, life: life || 0.9, t: 0, rot: rot || 0 }); }
function addShake(m) { G.shake = Math.max(G.shake, m); }

// ---------------------------------------------------------------- 入力
const input = { down: false, px: W / 2, py: 640, away: false };
function btnRect(i) { return { x: 14 + i * 234, y: SHOP_Y + 8, w: 224, h: 180 }; }
function shopHit(x, y) { for (let i = 0; i < 3; i++) { const b = btnRect(i); if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i; } return -1; }
const busy = () => G.clear || G.trans || G.ending;
function pDown(x, y) {
  input.px = x; input.py = y; G.lastInput = G.realT;
  taps.push({ x, y, t: 0 });
  if (G.ending) {
    const E = G.ending;
    if (E.offer && E.pick == null) for (let i = 0; i < 3; i++) { const r = perkCardRect(i); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { E.pick = i; E.pickT = E.t; SFX.buy(); } }
    return;
  }
  if (busy()) return;
  const si = shopHit(x, y);
  if (si >= 0) { buy(si); return; }
  if (y >= SHOP_Y) return;
  input.down = true; poi.tx = x; poi.ty = y;
  // 押した所にポイを置く（離れた所から水の中を引きずって、知らないうちに紙が濡れないように）
  if (poi.state === 'hover') { poi.x = clamp(x, WATER.x + 20, WATER.x + WATER.w - 20); poi.y = clamp(y, WATER.y + 20, WATER.y + WATER.h - 20); }
}
function pMove(x, y) {
  input.px = x; input.py = y;
  if (input.away || busy()) return;
  if (input.down || (y < WATER.y + WATER.h - 10 && y > WATER.y)) { poi.tx = x; poi.ty = y; }
}
function pUp() { input.down = false; }
window.__input = { down: pDown, move: pMove, up: pUp };
let touchOff = 0;
function toLogical(e) { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height]; }
if (!BOT) {
  // 指でポイが隠れないよう、タッチのときはポイを指の少し上に出す（ショップの上では出さない）
  const off = (e, y) => (e.pointerType === 'touch' && y < SHOP_Y ? -64 : 0);
  cv.addEventListener('pointerdown', e => { wakeAudio(); e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { } const [x, y] = toLogical(e); touchOff = off(e, y); pDown(x, y + touchOff); });
  cv.addEventListener('pointermove', e => { const [x, y] = toLogical(e); pMove(x, y + (input.down ? touchOff : off(e, y))); });
  cv.addEventListener('pointerup', () => pUp());
  cv.addEventListener('pointercancel', () => pUp());
  cv.addEventListener('contextmenu', e => e.preventDefault());
}

// ---------------------------------------------------------------- ショップ
const press = [0, 0, 0], deny = [0, 0, 0], boughtFx = [0, 0, 0];
const lvOf = i => G.lv[UPG[i].id];
// 後の世界ほど少し高い（星・宇宙を駆け抜けて終わらないように）
// 第8回：人の速さで各段 55〜70 秒・最後の段に 4 分過ぎに着くよう合わせた（sukuu_check.py sim --human seed 1〜3）
const WORLD_PRICE = [3.3, 2.7, 1.8, 3.0, 6.5];
const SWARM_AT = 24;
// おまけ：段に入って 40 秒を過ぎると、夜店のおじさんが値引きしてくれる（1 秒 2.5%、最大 6 割引き）。1 つの段で足踏みしすぎない
const OMAKE_T = 40;
const omake = () => clamp(1 - (G.wt - (OMAKE_T - 20 * perkN('fuku'))) * 0.025, 0.4, 1);
// 段ごとの主役の強化（安い）：池＝厚さ／海＝大きさ／大陸＝速乾／星＝厚さと速乾／宇宙＝大きさ。並びは [厚さ, 大きさ, 速乾]
// 二晩目からは係数の並びを 1 つずつずらす（同じ買い方にならない）
const UPF = [[1, 1.3, 1.3], [1.1, 0.7, 1.25], [1.25, 1.1, 0.6], [1, 1.3, 0.8], [1.2, 0.75, 1.2]];
const upf = i => UPF[G.k][(i + G.ng) % 3];
// はじめての買い物は半額（一晩目の池だけ）
// 一晩目の池の買い物：1 回目はどれでも 9、2 回目はどれでも 20、3 回目 6 割、4 回目 8 割
// （批評 r10：でたらめに押す初心者の 1 回目→2 回目が 34〜36 秒空いた）
const FIRST_FIXED = [9, 20], FIRST_OFF = [1, 1, 0.6, 0.8];
const pondBuys = () => (G.firstBuy ? Math.max(1, G.pondBuys || 0) : 0);
const firstOff = () => (G.ng === 0 && G.k === 0 && pondBuys() < FIRST_OFF.length ? FIRST_OFF[pondBuys()] : 1);
function price(i) { const U = UPG[i], lv = lvOf(i); if (G.ng === 0 && G.k === 0 && pondBuys() < FIRST_FIXED.length) return FIRST_FIXED[pondBuys()]; return lv >= U.max ? Infinity : Math.round(U.base * Math.pow(U.g, lv) * WD().vs * WORLD_PRICE[G.k] * upf(i) * omake() * firstOff() * ngPrice()); }
// 次の厚さで新しく持てるようになる獲物（ボタンに出す）
function nextUnlock() {
  const c0 = cap(), c1 = capOf(G.lv.t + 1);
  let best = null;
  for (const K of WK()) if (K.w > c0 && K.w <= c1 && (!best || K.w > best.w)) best = K;
  return best;
}
function buy(i) {
  press[i] = 0.14;
  const p = price(i);
  if (p === Infinity) return false;
  if (G.coins < p) { deny[i] = 0.35; return false; }
  if (G.k === 0 && G.ng === 0) G.pondBuys = pondBuys() + 1;
  G.coins -= p; G.firstBuy = true;
  const b = btnRect(i); boughtFx[i] = 0.6;
  G.spent = 0.6; addShake(4);
  sparks(b.x + b.w / 2, b.y + 50, 26, '#ffe14a', 520);
  SFX.buy();
  const before = WK().filter(K => K.w > cap()).map(K => K.id);
  G.lv[UPG[i].id]++;
  ev('buy', { item: UPG[i].id, lv: lvOf(i), price: p });
  poi.glow = 1;
  if (i === 0) {
    rings.push({ x: poi.x, y: poi.y, r: poi.r, vr: 160, life: 0.5, t: 0, w: 8 });
    // 赤い輪（重すぎ）が外れた獲物を光らせる＝持てるようになった
    const now = WK().filter(K => before.includes(K.id) && K.w <= cap());
    for (const K of now) {
      ev('unlock', { kind: K.id }); seenOnce('unlock_' + K.id, { kind: K.id });
      for (const f of fish) if (f.K === K) { f.unlockFx = 1; sparks(f.x, f.y, 18, '#ffe14a', 300); rings.push({ x: f.x, y: f.y, r: f.r, vr: 200, life: 0.6, t: 0, w: 6 }); }
    }
    if (now.length) SFX.unlock();
  } else if (i === 1) { poi.rT = radOf(G.lv.s); poi.rv += 260; }
  else { poi.wet = Math.max(0, poi.wet - 0.2); }
  save();
  return true;
}
const BANNER_RECT = { x: 40, y: 44, w: 640, h: 112 };
function showBanner(s, life) {
  G.total = null; texts.length = 0;
  G.banner = { s, t: 0, life: life || 1.6 };
  ev('banner', { rect: BANNER_RECT, water: { x: WATER.x, y: WATER.y, w: WATER.w, h: WATER.h } });
}

// ---------------------------------------------------------------- 世界の始まり・終わり
// ---------------------------------------------------------------- お守り：周回の始めに 3 つから 1 つ選ぶ。ずっと効き、重ねがけできる
// 批評 r9：2 周目は同じ流れが速く回るだけで、選ぶものがない
const PERKS = [
  { id: 'thick', name: '厚紙守り', desc: ['どの段も', '紙の厚さ Lv1 から'], col: '#d6261f' },
  { id: 'size', name: '大枠守り', desc: ['どの段も', 'ポイの大きさ Lv1 から'], col: '#2f6fe0' },
  { id: 'dry', name: '風守り', desc: ['どの段も', '速乾 Lv1 から'], col: '#1fa37a' },
  { id: 'bell', name: '鈴守り', desc: ['4 匹いっしょに', 'すくうと ×2'], col: '#e0a000' },
  { id: 'fuku', name: '福袋', desc: ['おまけが', '20 秒早く始まる'], col: '#c2309a' },
];
const perkN = id => (G.perks || []).filter(p => p === id).length;
const QPERK = Q.get('perk');
// 3 つを選んで見せる（同じ seed なら同じ並び）
function offerPerks() {
  const idx = PERKS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(frng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, 3);
}
function perkCardRect(i) { return { x: 22 + i * 230, y: 800, w: 216, h: 250 }; }
function startWorld(k, first) {
  G.k = k; G.wt = 0; G.lastScoopT = 0; G.lv ={ t: perkN('thick'), s: perkN('size'), d: perkN('dry') };
  KINDS = WORLDS[k].kinds.filter(K => !K.ng || G.ng >= K.ng);
  G.rareAt = 5; G.swarmAt = SWARM_AT;
  BOTS.greedK = HUMAN ? 1.08 : 0.95;
  fish.length = 0; lifted.length = 0; flyers.length = 0; sucked.length = 0; shards.length = 0; parts.length = 0; rings.length = 0;
  poi.state = 'hover'; poi.wet = 0; poi.sink = 0; poi.rT = poi.r = radOf(G.lv.s); poi.x = poi.tx = W / 2; poi.y = poi.ty = 640; poi.cracks = makeCracks();
  const V = WD().vortex;
  G.vortex = V ? { x: WATER.x + WATER.w * V.x, y: WATER.y + WATER.h * V.y, R: V.R, R0: V.R, core: V.core, start: V.start, on: V.start <= 0, gravity: !!V.gravity, age: 0 } : null;
  WK().forEach((K, ki) => {
    if (K.boss) return;
    if (K.school) { spawnAt(ki); return; }
    if (K.fast || K.rare) return;
    for (let i = 0; i < K.n; i++) makeFish(ki, B.x0 + 40 + rng() * (B.x1 - B.x0 - 80), B.y0 + 40 + rng() * (B.y1 - B.y0 - 80), false);
  });
  for (const f of fish) f.spawn = 1;
  // 宇宙のキンちゃんは山場として遅れて現れる（COSMOS.kin 秒）
  G.bossSpawnT = k === 0 ? 2.2 : k === 4 ? COSMOS.kin : 1.2; G.kinCall = false; G.spawnT = 0; G.meteorT = 2; G.fastT = {};
  ev('world', { world: k, id: WD().id });
  seenOnce('world_' + k);
  if (!first) showBanner(G.ng > 0 && k === 0 ? NIGHT[Math.min(G.ng, NIGHT.length - 1)] + ' ご縁×' + ngMul() : WD().label, 2.2);
  save();
}
const NIGHT = ['一晩目', '二晩目', '三晩目', '四晩目', '五晩目'];
// 二晩目からは、前の晩に救った分のご縁で値段が上がる（×2、×3 …）
const ngMul = () => 1 + 0.5 * G.ng;
// 二晩目からは値段も少し上がる（お守りの分だけ速くなりすぎないように。批評 r9：2 周目の海が 27 秒）
const NG_PRICE = 0.7;
// 宇宙は前の段の残りのお金ですぐ買えてしまうので、二晩目からは 3 倍上げる
const ngPrice = () => 1 + NG_PRICE * G.ng * (G.k === 4 ? 3 : 1);
function bossCaught(f) {
  ev('boss_catch', { kind: f.K.id });
  G.clear = { t: 0 };
  G.flash = 1; addShake(36); G.slowmo = 0.6;
  // 池の水が全部はね上がる
  // 水しぶきは水槽の中だけ（上の数字を隠さない。描くときも水槽の上で切る）
  const nd = 140;
  if (parts.length + nd > PARTS_CAP) parts.splice(0, parts.length + nd - PARTS_CAP);
  for (let i = 0; i < nd; i++) {
    const x = WATER.x + R(0, WATER.w), y = WATER.y + 120 + R(0, WATER.h - 120), dx = x - poi.x, dy = y - poi.y, d = Math.hypot(dx, dy) + 1;
    parts.push({ k: 'drop', x, y, z: R(0, 20), vx: dx / d * R(20, 120), vy: dy / d * R(20, 120), vz: R(380, 640), s: R(3, 7), c: i % 5 ? '#dff8ff' : '#ffffff', life: 3 });
  }
  for (let i = 0; i < 14; i++) rings.push({ x: WATER.x + R(40, WATER.w - 40), y: WATER.y + R(40, WATER.h - 40), r: R(10, 40), vr: R(220, 420), life: 0.9, t: 0, w: 7 });
  rings.push({ x: poi.x, y: poi.y, r: poi.r, vr: 900, life: 0.9, t: 0, w: 14 });
  SFX.boss(); SFX.boom();
}
const SNAP = mk(W, H), snapCtx = SNAP.getContext('2d');
const OFF = mk(W, H), offCtx = OFF.getContext('2d');
const CLEAR_LEN = 1.5, TRANS_LEN = 3.6, EARTH_LEN = 6.6, ENDING_LEN = 9;
// 大陸 → 星（地球の正体）だけ長く見せる
const transLen = () => G.trans && G.trans.from === 2 ? EARTH_LEN : TRANS_LEN;
function beginTransition() {
  G.clear = null;
  // 写しは水しぶき・波紋・ポイ抜きのきれいな世界（ポイの中・終わりの画面で小さく見せる）
  const sp = parts.splice(0), sr = rings.splice(0), ps = poi.state;
  poi.state = 'snap'; G.clear = { t: 0 };
  renderScene(snapCtx, false);
  G.clear = null; poi.state = ps; parts.push(...sp.slice(-200)); rings.push(...sr.slice(-60));
  if (G.k >= WORLDS.length - 1) { G.ending = { t: 0 }; ev('ending', { saved: G.saved }); SFX.boss(); return; }
  const from = G.k;
  startWorld(from + 1, true);
  G.trans = { t: 0, from };
}

// ---------------------------------------------------------------- すくう・破れる
function lift() {
  const was = poi.state; poi.state = 'hover';
  if (was !== 'dip') return;
  // 根を張った島は、沈めたまま root 秒おさえないと抜けない（残る）
  const inside = poi.sink >= 0.99 ? fish.filter(f => f.spawn >= 1 && insidePoi(f)) : [];
  const caught = inside.filter(f => !f.K.root || (f.hold || 0) >= f.K.root);
  for (const f of inside) if (!caught.includes(f)) { f.slip = 0.5; splash(f.x, f.y, 6, 0.6); seenOnce('slip'); }
  for (const f of fish) f.hold = 0;
  splash(poi.x, poi.y, 10, 0.9);
  if (!caught.length) { poi.dripT = 0.3; return; }
  let wsum = caught.reduce((s, f) => s + wOf(f), 0);
  const hasBoss = caught.some(f => f.K.boss);
  // 守りが弱まる間は、少しの重すぎ（持てる重さの 1+1.5×ease 倍まで）なら破れずにこぼれる。
  // 1 匹だけで持てない魚（池の鯉など）も、守りの間はこぼれるだけ（「紙の厚さ」が要ると教える）
  const oneTooHeavy = caught.length === 1 && wOf(caught[0]) > capEff();
  const soft = ease() > 0 && (oneTooHeavy || wsum <= capEff() * (1 + 1.5 * ease()));
  // 群れ（6 匹以上）で少しの重すぎ（SPILL_MAX 倍まで）は、破れずに外側からあふれる（批評 r10：一度に 19〜20 匹失う）
  const school = !hasBoss && caught.length >= 6 && wsum <= capEff() * SPILL_MAX;
  if (wsum > capEff() && (grace() || school || (!hasBoss && (beginner() || soft)))) {
    if (!grace() && !beginner() && !school) G.thickHint = 4;
    // 最初の 3 回（と最初の 12 すくいの間の重すぎ）は破れない：重いものからこぼれる（重さの仕組みだけ見せる）
    // 群れは縁に近いものからあふれる
    if (school) caught.sort((a, b) => Math.hypot(a.x - poi.x, a.y - poi.y) - Math.hypot(b.x - poi.x, b.y - poi.y));
    else caught.sort((a, b) => wOf(a) - wOf(b));
    let nsp = 0;
    while (caught.length && wsum > capEff()) { const f = caught.pop(); wsum -= wOf(f); f.slip = 0.6; f.flee = 1; splash(f.x, f.y, 10, 0.9); nsp++; }
    ev('spill', { n: nsp, school });
    if (school) { if (!G.banner) floatText('あふれた！ -' + nsp, poi.x, clamp(poi.y - poi.r - 40, 300, 1000), 58, '#ffe14a', '#8a2a00', 1.0); SFX.creak(); }
    else if (seenOnce('hint_heavy')) floatText('重すぎて こぼれた', poi.x, clamp(poi.y - poi.r - 40, 300, 1000), 54, '#ffffff', '#c01010', 1.6);
    if (!caught.length) { poi.dripT = 0.3; return; }
  }
  if (wsum > capEff()) { tear(caught, 'heavy', wsum); return; }
  G.lastScoopT = G.wt;
  poi.wet = Math.min(0.95, poi.wet + 0.08);
  poi.dripT = 0.8;
  // はじめての人は、最初の 12 すくいが 2 倍（最初の買い物まで早く着く）
  // はじめての人は最初の 12 すくいが 2 倍。一晩目の池に長くいる人ほど（50〜130 秒で 1→3 倍）値段が上がる＝追いつける
  // 上限なし（批評 r10：130 秒以降、稼ぎが横ばい）
  const catchUp = G.ng === 0 && G.k === 0 ? 1 + 0.04 * Math.max(0, G.wt - 50) : 1;
  const n = caught.length, m = mult(n) * (beginner() ? 2 : catchUp) * (n >= 4 ? 1 + perkN('bell') : 1);
  let total = 0, rescue = 0;
  const boss = caught.find(f => f.K.boss);
  caught.forEach((f, i) => {
    const idx = fish.indexOf(f); if (idx >= 0) fish.splice(idx, 1);
    const v = f.K.v * WD().vs * (f.danger ? 2 : 1) * (f.swarm ? 2 : 1) * m * ngMul(); total += v;
    if (f.danger) rescue++;
    if (f.K.rare) G.rareAt = G.wt + f.K.rare;
    lifted.push({ f, dx: f.x - poi.x, dy: f.y - poi.y, t: -i * 0.03, v, i, n });
    if (seenOnce('catch_' + f.K.id, { kind: f.K.id })) ev('first_catch', { kind: f.K.id });
  });
  G.scoops++; G.saved += n;
  if (!G.kin) { G.kin = true; ev('kin'); }
  G.coins += total; G.earned += total;
  if (!EV.some(e => e.type === 'coin')) ev('coin', { v: total });
  ev('scoop', { n, value: total, kinds: [...new Set(caught.map(f => f.K.id))], w: +wsum.toFixed(2), cap: +capEff().toFixed(2), rescue });
  if (rescue) { G.rescued += rescue; ev('rescue', { n: rescue }); seenOnce('rescue'); }
  addShake(4 + Math.min(12, n * 1.5));
  poi.squash = 1;
  splash(poi.x, poi.y, 26 + Math.min(40, n * 4), 1.5 + Math.min(1.5, n * 0.1));
  G.hitstop = n >= 3 ? 0.08 : 0.04;
  const top = poi.y - poi.r - 70 > 300;
  G.total = G.banner ? null : { target: total, x: clamp(poi.x, 200, W - 200), y: top ? poi.y - poi.r - 70 : poi.y + poi.r + 80, t: 0, rescue: rescue > 0 };
  texts.length = 0;
  if (n >= 3) SFX.combo(n);
  SFX.plop(0);
  if (boss) bossCaught(boss);
  save();
}
const TOTAL_HOLD = 0.3, TOTAL_FLY = 0.35;
const SPILL_MAX = 1.8;
function tear(caught, why, wsum) {
  poi.state = 'torn'; poi.tearT = 0; G.tears++;
  const bossTear = (caught || []).some(f => f.K.boss);
  if (bossTear) BOTS.bossFails[G.k] = (BOTS.bossFails[G.k] || 0) + 1;
  // 人と同じく、重さで破ったら次は欲張りを控える（同じ失敗を何十回も続けない）
  else if (why === 'heavy') BOTS.greedK = Math.max(0.7, BOTS.greedK * 0.88);
  ev('tear', { n: caught ? caught.length : 0, why, kinds: (caught || []).map(f => f.K.id), boss: bossTear, w: +(wsum || 0).toFixed(2), cap: +capEff().toFixed(2), wet: +poi.wet.toFixed(2) });
  addShake(14); SFX.rip();
  const a = rng() * Math.PI, jag = [];
  for (let i = 0; i <= 8; i++) jag.push([(i / 8) * 2 - 1, (rng() - 0.5) * 0.25]);
  shards.length = 0;
  for (const side of [-1, 1]) shards.push({ side, a, jag, x: poi.x, y: poi.y, r: poi.r, vx: Math.cos(a + Math.PI / 2) * side * 90, vy: Math.sin(a + Math.PI / 2) * side * 90 + 30, rot: 0, vr: side * 1.5, t: 0 });
  for (let i = 0; i < 18; i++) { const b = R(0, TAU), d = R(0, poi.r); parts.push({ k: 'shred', x: poi.x + Math.cos(b) * d, y: poi.y + Math.sin(b) * d, z: 10, vx: Math.cos(b) * R(80, 260), vy: Math.sin(b) * R(80, 260), vz: R(150, 380), s: R(4, 10), c: why === 'burn' ? '#5a3a20' : '#eef3f6', life: 2, rot: R(0, 6) }); }
  G.total = null;
  // 重さで破れたら、理由を出して「紙の厚さ」を 4 秒光らせる（何を買えばよいかが分かる）
  const heavy = why === 'heavy' && !bossTear;
  if (heavy) G.thickHint = 4;
  if (!G.banner) floatText(why === 'burn' ? 'ジュッ！' : why === 'gravity' ? 'ズズッ…' : heavy ? 'ビリッ！ 重すぎ' : 'ビリッ！', poi.x, clamp(poi.y - poi.r - 30, 300, 1000), 96, '#ffffff', '#c01010', 0.9, -0.15);
  (caught || []).forEach(f => { f.alert = 0; f.flee = 1.2; splash(f.x, f.y, 6, 0.8); });
  splash(poi.x, poi.y, 22, 1.3);
}

// ---------------------------------------------------------------- 更新
function update(dt) {
  G.realT += dt;
  if (G.ending) { updateEnding(dt); return; }
  if (G.trans) {
    G.trans.t += dt;
    if (G.trans.from === 2 && !G.trans.earth && G.trans.t >= 2.0) { G.trans.earth = true; ev('earth_reveal'); seenOnce('earth'); }
    if (G.trans.from === 2 && !G.trans.kin && G.trans.t >= 3.6) { G.trans.kin = true; ev('kin_reveal'); SFX.unlock(); }
    if (G.trans.t >= transLen()) { G.trans = null; showBanner(WD().label, 1.8); ev('trans_end'); }
    decay(dt); return;
  }
  if (G.clear) { G.clear.t += dt; if (G.clear.t >= CLEAR_LEN) { beginTransition(); return; } }
  let sdt = dt;
  if (G.slowmo > 0) { G.slowmo -= dt; sdt = dt * 0.25; }
  if (G.hitstop > 0) { G.hitstop -= dt; sdt = 0; }
  G.simT += sdt; G.wt += sdt;
  poi.squash = Math.max(0, poi.squash - dt * 2.2);
  poi.glow = Math.max(0, poi.glow - dt * 2);
  G.spent = Math.max(0, (G.spent || 0) - dt);

  if (BOT && !G.clear) botUpdate(sdt || dt * 0.25);

  // 渦
  const V = G.vortex;
  if (V) {
    if (!V.on && G.wt >= V.start) { V.on = true; ev('vortex_on'); seenOnce('vortex'); V.age = 0; }
    if (V.on) { V.age += sdt; V.R = V.R0 * (0.65 + 0.35 * clamp(V.age / 25, 0, 1)); }
  }

  // ポイの動き
  const prx = poi.x, pry = poi.y;
  const k = 1 - Math.exp(-dt * 28);
  const tx = clamp(poi.tx, WATER.x + 20, WATER.x + WATER.w - 20), ty = clamp(poi.ty, WATER.y + 20, WATER.y + WATER.h - 20);
  if (!G.clear) { poi.x += (tx - poi.x) * k; poi.y += (ty - poi.y) * k; }
  // 宇宙：沈めている間、ブラックホールに引かれる
  if (V && V.on && V.gravity && poi.state === 'dip') {
    const dx = V.x - poi.x, dy = V.y - poi.y, d = Math.hypot(dx, dy) || 1;
    if (d < V.R * 1.25) { const pull = 190 * (1 - d / (V.R * 1.25)) + 25; poi.x += dx / d * pull * sdt; poi.y += dy / d * pull * sdt; poi.tx += dx / d * pull * sdt; poi.ty += dy / d * pull * sdt; }
  }
  poi.speed = sdt > 0 ? Math.hypot(poi.x - prx, poi.y - pry) / Math.max(dt, 1e-4) : 0;
  const acc = (poi.rT - poi.r) * 220 - poi.rv * 14;
  poi.rv += acc * dt; poi.r += poi.rv * dt;

  // 太陽の熱
  const boss = bossFish();
  poi.heat = 0;
  if (boss && boss.K.heat) { const d = Math.hypot(boss.x - poi.x, boss.y - poi.y); if (d < boss.r * 2.1 + poi.r * 0.5) poi.heat = 1 - clamp((d - boss.r) / (boss.r * 1.1 + poi.r * 0.5), 0, 1) * 0.6; }

  if (poi.state === 'torn') {
    poi.tearT += dt;
    if (poi.tearT > 0.6) { poi.state = 'enter'; poi.enterT = 0; poi.wet = 0; poi.burn = 0; poi.cracks = makeCracks(); poi.sink = 0; }
  } else if (poi.state === 'enter') {
    poi.enterT += dt * 4;
    if (poi.enterT >= 1) { poi.enterT = 1; poi.state = 'hover'; }
  } else if (poi.state === 'hover') {
    poi.sink = Math.max(0, poi.sink - dt * 8);
    poi.wet = Math.max(0, poi.wet - 0.7 * dt);
    poi.burn = Math.max(0, poi.burn - 0.3 * dt);
    poi.load = 0; poi.strain = 0; poi.over = Math.max(0, poi.over - dt * 4);
    if (input.down && !G.clear) {
      poi.state = 'dip'; poi.dipT = 0; SFX.dip(); G.dips = (G.dips || 0) + 1;
      // 沈めた瞬間にポイの下にいた群れだけが入る（外の群れは流れ込まない＝見たとおりにすくえる）
      // はじめての人は、ポイの少し外にいた金魚も「入った」扱いにして寄せる（狙いが甘くてもすくえる）
      for (const f of fish) f.inDip = Math.hypot(f.x - poi.x, f.y - poi.y) < poi.r * (1 + 0.6 * ease()) + (tiredOf(f) > 0.5 ? f.r * 0.6 : 0);
      poi.strainSeen = 0;
      splash(poi.x, poi.y, 8, 0.7); rings.push({ x: poi.x, y: poi.y, r: poi.r, vr: 120, life: 0.6, t: 0, w: 5 });
    }
  } else if (poi.state === 'dip') {
    poi.dipT += sdt; poi.sink = Math.min(1, poi.sink + sdt / 0.12);
    const heatMul = 1 + poi.heat * 6, vMul = V && V.on && Math.hypot(V.x - poi.x, V.y - poi.y) < V.R ? 1.6 : 1;
    // 大きいポイほど紙の面が広く、早く濡れる（大きさと引き換え）
    poi.wet += ((0.3 - 0.15 * ease()) + poi.speed * 0.00045) * dryOf(G.lv.d) * heatMul * vMul * (1 + 0.1 * G.lv.s) * sdt;
    if (poi.heat > 0) poi.burn = Math.min(1, poi.burn + poi.heat * sdt * 0.8);
    if (poi.speed > 300 && frng() < 0.4) rings.push({ x: poi.x + R(-poi.r, poi.r), y: poi.y + R(-poi.r, poi.r), r: 4, vr: 90, life: 0.5, t: 0, w: 2 });
    const inside = fish.filter(f => f.spawn >= 1 && insidePoi(f));
    poi.load = inside.reduce((s, f) => s + wOf(f), 0);
    const over = poi.load > capEff();
    // 限界の 75% を超えたら、破れる前に紙がきしむ（縁が黄→赤、ひび、ポイが震える）
    poi.strain = clamp((poi.load / capEff() - 0.75) / 0.25, 0, 1);
    if (poi.strain > 0.3 && !poi.strainSeen) { poi.strainSeen = 1; SFX.creak(); seenOnce('strain'); }
    if (over && poi.over < 0.5 && frng() < 0.08) SFX.creak();
    poi.over = over ? Math.min(1, poi.over + dt * 6) : Math.max(0, poi.over - dt * 6);
    if (V && V.on && V.gravity && Math.hypot(V.x - poi.x, V.y - poi.y) < V.core * 1.3) tear(inside, 'gravity');
    else if (poi.wet >= 0.97 && (grace() || !inside.length)) {
      // 何も入っていない（または最初の 3 回）は破らず、自動で上げる。理由を一度だけ出す
      poi.wet = 0.97; input.down = false; lift(); ev('soggy', { empty: !inside.length });
      // 1 回目は濡れの理由、2 回目からは「何をすればよいか」を 8 秒おきに（批評 r10：理由が最初の 1 回しか出ない）
      if (seenOnce('hint_wet')) floatText('速く動かすと 紙がぬれる', poi.x, clamp(poi.y - poi.r - 40, 300, 1000), 50, '#bff4ff', '#0a3a6a', 2.0);
      else if (!inside.length && G.realT - (G.wetHintT || 0) > 8 && !G.banner) { G.wetHintT = G.realT; floatText('魚の真上で 沈めて すぐ上げよう', poi.x, clamp(poi.y - poi.r - 40, 300, 1000), 46, '#bff4ff', '#0a3a6a', 1.8); }
    }
    else if (poi.wet >= 1) tear(inside, poi.heat > 0.3 ? 'burn' : 'wet');
    else if (!input.down) lift();
  }
  if (poi.dripT > 0) {
    poi.dripT -= sdt;
    if (frng() < 0.6) { const a = R(0, TAU), d = R(0, poi.r * 0.9); parts.push({ k: 'drop', x: poi.x + Math.cos(a) * d, y: poi.y + Math.sin(a) * d, z: 26, vx: 0, vy: 0, vz: -20, s: R(2, 4), c: '#dff8ff', life: 2 }); }
  }

  updateFish(sdt);

  // 補充
  G.spawnT -= sdt;
  if (G.spawnT <= 0 && !G.clear) {
    G.spawnT = 0.12;
    const cnt = WK().map(() => 0); fish.forEach(f => cnt[f.ki]++);
    let best = -1, bd = 0;
    WK().forEach((K, ki) => {
      if (K.boss || K.fast) return;
      if (K.rare && G.wt < G.rareAt) return;
      const lim = K.school ? K.n * 0.45 : K.n;
      const d = (K.n - cnt[ki]) / K.n;
      if (cnt[ki] < lim + (K.school ? 0 : 0) && d > bd) { bd = d; best = ki; }
    });
    if (best >= 0) {
      const K = WK()[best], f = spawnAt(best, !!K.rare); G.spawnT = 0.35;
      if (K.rare && f) { G.rareAt = Infinity; ev('rare_appear', { kind: K.id }); seenOnce('appear_' + K.id); sparks(f.x, f.y, 24, '#ffe14a', 300); SFX.unlock(); if (!G.banner && !G.total) floatText('おかえり！', f.x, clamp(f.y - 90, 300, 1000), 64, '#ffe14a', '#5a2a00', 1.1); }
    }
  }
  // 大群：段に入って SWARM_AT 秒で、いちばん小さい獲物が群れで湧く（その群れは 2 倍の値段・金色に光る）
  if (G.wt >= G.swarmAt && !G.clear) {
    G.swarmAt = Infinity;
    const ki = WK().findIndex(K => !K.boss && !K.fast && !K.rare), K = WK()[ki];
    const x = lerp(B.x0 + 160, B.x1 - 160, rng()), y = lerp(B.y0 + 200, B.y1 - 200, rng());
    for (let i = 0; i < 14; i++) { const a = rng() * TAU, d = 30 + rng() * 110; const f = makeFish(ki, clamp(x + Math.cos(a) * d, B.x0 + 20, B.x1 - 20), clamp(y + Math.sin(a) * d, B.y0 + 20, B.y1 - 20), true); f.swarm = 1; }
    splash(x, y, 40, 1.6); rings.push({ x, y, r: 20, vr: 380, life: 0.9, t: 0, w: 10 }); addShake(8); SFX.unlock();
    ev('swarm', { kind: K.id }); seenOnce('swarm_' + G.k);
    if (!G.banner && !G.total) floatText('大群！', x, clamp(y - 150, 300, 1000), 84, '#ffe14a', '#6a1a00', 1.1);
  }
  // 流れ星
  WK().forEach((K, ki) => {
    if (!K.fast) return;
    G.fastT = G.fastT || {};
    if (G.fastT[ki] === undefined) G.fastT[ki] = K.comet ? 6 : 2;
    G.fastT[ki] -= sdt;
    if (G.fastT[ki] <= 0) {
      if (fish.filter(f => f.K === K).length < K.n) { makeFish(ki, 0, 0, false); seenOnce(K.comet ? 'comet' : 'meteor'); }
      G.fastT[ki] = K.comet ? 7 + rng() * 4 : 1.6 + rng() * 2.2;
    }
  });
  // 池の主が疲れてきた（一晩目の池に長くいる人だけ）
  const bf = bossFish();
  if (bf && tiredOf(bf) > 0.5 && seenOnce('boss_tired') && !G.banner) {
    floatText('主が つかれてきた！', bf.x, clamp(bf.y - bf.r - 30, 300, 1000), 60, '#ffe14a', '#5a2a00', 1.6);
    sparks(bf.x, bf.y, 20, '#bff4ff', 220);
  }
  // 宇宙の山場（批評 r10：宇宙が 33 秒で一番短い）。超新星 → 大群 → キンちゃん登場 → ブラックホールが暴れる
  if (G.k === 4 && !G.clear) cosmosEvents();
  // 主
  if (!bossFish() && !G.clear) {
    G.bossSpawnT -= sdt;
    if (G.bossSpawnT <= 0) {
      const bi = WK().findIndex(K => K.boss);
      const f = spawnAt(bi, true);
      if (f && f.K.orbit && G.vortex) { f.orbA = rng() * TAU; f.x = G.vortex.x + Math.cos(f.orbA) * G.vortex.R0 * 0.7; f.y = G.vortex.y + Math.sin(f.orbA) * G.vortex.R0 * 0.7; }
      ev('boss_appear', { kind: WK()[bi].id });
      if (seenOnce('boss_' + G.k) && G.k === 4 && f) {
        G.flash = 0.5; addShake(20); rings.push({ x: f.x, y: f.y, r: 30, vr: 600, life: 1.1, t: 0, w: 14 }); sparks(f.x, f.y, 70, '#ffe14a', 480);
        ev('kin_enter'); seenOnce('kin_enter');
        if (!G.total) { texts.length = 0; showBanner('キンちゃんが 来た！', 1.8); }
      }
      addShake(10); SFX.dip();
      G.bossSpawnT = 6;
    }
  }

  // 持ち上げた獲物 → 跳ねて袋へ
  for (let i = lifted.length - 1; i >= 0; i--) {
    const L = lifted[i]; L.t += sdt;
    if (L.t >= 0.15) {
      const x = poi.x + L.dx, y = poi.y + L.dy;
      flyers.push({ f: L.f, x, y, sx: x, sy: y, t: 0, vx: R(-120, 120) + (x - poi.x) * 1.5, vy: R(-520, -380), rot: L.f.ang, vr: R(-14, 14), seq: L.i, boss: L.f.K.boss });
      splash(x, y, 6 + Math.min(10, L.f.K.w), 0.9 + Math.min(0.9, L.f.K.w * 0.05));
      SFX.plop(L.i);
      lifted.splice(i, 1);
    }
  }
  updateFlyers(sdt);
  if (G.total) { const T = G.total; T.t += dt; T.y = clamp(T.y, 300, 1000); if (T.t >= TOTAL_HOLD + TOTAL_FLY) { G.total = null; G.bump = 1; ev('total_end'); } }
  // 渦に吸われる
  for (let i = sucked.length - 1; i >= 0; i--) { const s = sucked[i]; s.t += sdt; if (s.t > 0.7) sucked.splice(i, 1); }
  updateParts(sdt);

  if (G.wt >= OMAKE_T - 20 * perkN('fuku') && !G.clear) seenOnce('omake_' + G.k);
  if (!G.afforded && G.coins >=Math.min(price(0), price(1), price(2))) { G.afforded = true; ev('afford', { coins: G.coins }); }
  decay(dt);
}
const COSMOS = { nova: 12, kin: 34, rage: 48, rageLen: 10 };
function cosmosEvents() {
  const V = G.vortex;
  if (G.wt >= COSMOS.nova && seenOnce('supernova')) {
    // 超新星：光って、金色の銀河（2 倍）が 10 個生まれる
    const ki = WK().findIndex(K => K.school), x = lerp(B.x0 + 150, B.x1 - 150, rng()), y = lerp(B.y0 + 520, B.y1 - 150, rng());
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const f = makeFish(ki, x + Math.cos(a) * 40, y + Math.sin(a) * 40, true); f.swarm = 1; f.vx = Math.cos(a) * 200; f.vy = Math.sin(a) * 200; }
    G.flash = 0.6; addShake(14); rings.push({ x, y, r: 10, vr: 700, life: 1.0, t: 0, w: 16 }); sparks(x, y, 60, '#fff3b0', 520); SFX.boom();
    ev('supernova');
    if (!G.banner && !G.total) floatText('超新星！', x, clamp(y - 140, 300, 1000), 84, '#fff3b0', '#5a1a6a', 1.1);
  }
  if (G.wt >= COSMOS.kin - 3 && !G.kinCall && !bossFish()) {
    // キンちゃんが来る前触れ：画面が金色に揺れる
    G.kinCall = true; addShake(8); SFX.unlock();
  }
  if (V && G.wt >= COSMOS.rage && G.wt < COSMOS.rage + COSMOS.rageLen) {
    // ブラックホールが暴れる：吸い込みの輪が広がる（渦の中の銀河を救うと 2 倍）
    if (seenOnce('bh_rage')) { ev('bh_rage'); addShake(16); SFX.boom(); if (!G.banner && !G.total) floatText('ブラックホールが 暴れだした！', W / 2, clamp(V.y - V.R - 40, 300, 1000), 52, '#ffd0ff', '#3a0a5a', 1.4); }
    V.R = V.R0 * (1.3 + 0.08 * Math.sin(G.wt * 5));
  }
}
function updateFlyers(sdt) {
  for (let i = flyers.length - 1; i >= 0; i--) {
    const p = flyers[i]; p.t += sdt; p.rot += p.vr * sdt;
    if (p.t < 0.25) { p.x += p.vx * sdt; p.y += p.vy * sdt; p.vy += 1300 * sdt; p.sx = p.x; p.sy = p.y; }
    else {
      const u = clamp((p.t - 0.25) / 0.4, 0, 1), e = easeIn(u);
      p.x = lerp(p.sx, BAG.x, e); p.y = lerp(p.sy, BAG.y, e) - Math.sin(u * Math.PI) * 60;
      if (u >= 1) { G.bagBump = 1; sparks(BAG.x, BAG.y, 6, '#bff4ff', 200); SFX.coin(p.seq); flyers.splice(i, 1); }
    }
  }
}
function updateParts(sdt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.k === 'drop' || p.k === 'shred') {
      p.x += p.vx * sdt; p.y += p.vy * sdt; p.z += p.vz * sdt; p.vz -= 1100 * sdt; p.vx *= 0.99; p.vy *= 0.99;
      if (p.rot !== undefined) p.rot += sdt * 8;
      if (p.z <= 0) { if (p.k === 'drop' && rings.length < 120) rings.push({ x: p.x, y: p.y, r: 1, vr: 50 + p.s * 6, life: 0.45, t: 0, w: 1.5 }); parts.splice(i, 1); }
    } else {
      p.t += sdt; p.x += p.vx * sdt; p.y += p.vy * sdt; p.vx *= 0.9; p.vy *= 0.9; p.rot += sdt * 6;
      if (p.t >= p.life) parts.splice(i, 1);
    }
  }
  if (parts.length > PARTS_CAP) parts.splice(0, parts.length - PARTS_CAP);
  for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += sdt; r.r += r.vr * sdt; r.vr *= 0.97; if (r.t >= r.life) rings.splice(i, 1); }
  for (let i = shards.length - 1; i >= 0; i--) { const s = shards[i]; s.t += sdt; s.x += s.vx * sdt; s.y += s.vy * sdt; s.rot += s.vr * sdt; if (s.t > 0.9) shards.splice(i, 1); }
}
function decay(dt) {
  for (let i = texts.length - 1; i >= 0; i--) { const t = texts[i]; t.t += dt; if (t.t >= t.life) texts.splice(i, 1); }
  for (let i = taps.length - 1; i >= 0; i--) { taps[i].t += dt; if (taps[i].t > 0.4) taps.splice(i, 1); }
  G.disp += (G.coins - G.disp) * (1 - Math.exp(-dt * 10)); if (Math.abs(G.coins - G.disp) < 0.5) G.disp = G.coins;
  G.bump = Math.max(0, G.bump - dt * 5); G.bagBump = Math.max(0, G.bagBump - dt * 4);
  G.thickHint = Math.max(0, (G.thickHint || 0) - dt);
  for (let i = 0; i < 3; i++) { press[i] = Math.max(0, press[i] - dt); deny[i] = Math.max(0, deny[i] - dt); boughtFx[i] = Math.max(0, boughtFx[i] - dt); }
  G.flash = Math.max(0, G.flash - dt * 2.2);
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.life) G.banner = null; }
  if (G.caption) { G.caption.t += dt; if (G.caption.t > G.caption.life) G.caption = null; }
  G.shake *= Math.exp(-dt * 12);
  G.shx = (frng() - 0.5) * 2 * G.shake; G.shy = (frng() - 0.5) * 2 * G.shake;
}

function updateFish(dt) {
  if (dt <= 0) return;
  const n = fish.length, dip = poi.state === 'dip', V = G.vortex && G.vortex.on ? G.vortex : null;
  const ax = new Float32Array(n), ay = new Float32Array(n), cx = new Float32Array(n), cy = new Float32Array(n), al = new Float32Array(n * 2), cnt = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = fish[i]; if (a.K.fast) continue;
    for (let j = i + 1; j < n; j++) {
      const b = fish[j]; if (b.K.fast) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, sep = (a.r + b.r) * (a.K.school && b.K.school ? 0.75 : 1.1);
      if (d2 < sep * sep && d2 > 0.01) {
        const d = Math.sqrt(d2), f = (sep - d) / sep * 260, wa = a.K.boss ? 0.15 : 1, wb = b.K.boss ? 0.15 : 1;
        ax[i] -= dx / d * f * wa; ay[i] -= dy / d * f * wa; ax[j] += dx / d * f * wb; ay[j] += dy / d * f * wb;
      }
      const rad = a.K.school ? 150 : 110;
      if (a.ki === b.ki && d2 < rad * rad) {
        cx[i] += b.x; cy[i] += b.y; cx[j] += a.x; cy[j] += a.y;
        al[i * 2] += b.vx; al[i * 2 + 1] += b.vy; al[j * 2] += a.vx; al[j * 2 + 1] += a.vy; cnt[i]++; cnt[j]++;
      }
    }
  }
  for (let i = n - 1; i >= 0; i--) {
    const f = fish[i], K = f.K;
    if (f.spawn < 1) f.spawn = Math.min(1, f.spawn + dt * 2.5);
    f.unlockFx = Math.max(0, (f.unlockFx || 0) - dt);
    f.slip = Math.max(0, (f.slip || 0) - dt);
    if (K.root) { if (dip && poi.sink >= 0.99 && insidePoi(f)) { const was = f.hold || 0; f.hold = was + dt; if (was < K.root && f.hold >= K.root) { sparks(f.x, f.y, 8, '#bfffcf', 160); SFX.coin(2); } } else f.hold = 0; }
    f.phase += dt * (5 + Math.hypot(f.vx, f.vy) * 0.07) * (K.r > 100 ? 0.35 : K.r > 55 ? 0.6 : 1);
    if (K.fast) {
      f.x += f.vx * dt; f.y += f.vy * dt; f.ang = Math.atan2(f.vy, f.vx);
      const inB = f.x > B.x0 && f.x < B.x1 && f.y > B.y0 && f.y < B.y1;
      if (inB) f.entered = true; else if (f.entered) { fish.splice(i, 1); continue; }
      continue;
    }
    let fx = ax[i], fy = ay[i];
    if (cnt[i]) {
      const kc = K.school ? 0.9 : 0.35, ka = K.school ? 1.2 : 0.6;
      fx += (cx[i] / cnt[i] - f.x) * kc; fy += (cy[i] / cnt[i] - f.y) * kc;
      fx += (al[i * 2] / cnt[i] - f.vx) * ka; fy += (al[i * 2 + 1] / cnt[i] - f.vy) * ka;
    }
    f.wander += (rng() - 0.5) * 4 * dt;
    fx += Math.cos(f.wander) * 40; fy += Math.sin(f.wander) * 40;
    const m = 40 + f.r;
    if (f.x < B.x0 + m) fx += (B.x0 + m - f.x) * 9; if (f.x > B.x1 - m) fx -= (f.x - B.x1 + m) * 9;
    if (f.y < B.y0 + m) fy += (B.y0 + m - f.y) * 9; if (f.y > B.y1 - m) fy -= (f.y - B.y1 + m) * 9;
    // キンちゃん：ブラックホールのまわりを回る
    if (K.orbit && G.vortex) {
      const Vv = G.vortex; f.orbA = (f.orbA || 0) + dt * (0.45 + f.flee * 0.5);
      const ro = Vv.R0 * 0.7, gx = Vv.x + Math.cos(f.orbA) * ro, gy = Vv.y + Math.sin(f.orbA) * ro;
      fx += (gx - f.x) * 6; fy += (gy - f.y) * 6;
    }
    // 逃げる（沈めたポイの近く）
    const dx = f.x - poi.x, dy = f.y - poi.y, d = Math.hypot(dx, dy) || 1, range = poi.r + 110 + f.r;
    // 疲れた池の主（tiredOf>0.5）も、持てる重さなら寄ってくる
    const tired = tiredOf(f);
    const helped = f.inDip && wOf(f) <= cap() && (K.boss ? tired > 0.5 : ease() > 0.3);
    if (helped && dip && !insidePoi(f)) { fx -= dx / d * 900; fy -= dy / d * 900; }
    if (dip && d < range && !K.root && !helped) {
      if (f.alert < 0) f.alert = 0.16 + rng() * 0.3 + (K.school ? 0 : 0.08) + (K.boss ? 0.15 : 0);
      f.alert -= dt;
      if (f.alert <= 0) { f.flee = 1; const s = (K.school ? 1100 : 900) * (1 - d / range) + 250; fx += dx / d * s * (K.boss ? 0.5 : 1); fy += dy / d * s * (K.boss ? 0.5 : 1); }
    } else if (!dip) f.alert = -1;
    if (dip && K.school && !f.inDip && d < poi.r + f.r + 20) { const p = 1 - (d - poi.r) / (f.r + 20); fx += dx / d * 2400 * clamp(p, 0.3, 1.5); fy += dy / d * 2400 * clamp(p, 0.3, 1.5); }
    f.flee = Math.max(0, f.flee - dt * 0.8);
    // 渦
    f.danger = 0;
    if (V && !K.orbit) {
      const vx = V.x - f.x, vy = V.y - f.y, vd = Math.hypot(vx, vy) || 1;
      if (K.boss) { if (vd < V.R + f.r) { fx -= vx / vd * 500; fy -= vy / vd * 500; } }
      else if (vd < V.R) {
        f.danger = 1;
        const p = 1 - vd / V.R;
        fx += vx / vd * (50 + 230 * p) + (-vy / vd) * 240 * p; fy += vy / vd * (50 + 230 * p) + (vx / vd) * 240 * p;
        if (vd < V.core) { sucked.push({ f, x: f.x, y: f.y, t: 0 }); fish.splice(i, 1); ev('lost', { kind: K.id }); seenOnce('lost'); continue; }
      }
    }
    f.vx += fx * dt; f.vy += fy * dt;
    // はじめての人：沈めたポイの上にいる金魚は、紙の上でゆっくりになる（見たとおりにすくえる）
    const rest = dip && helped && insidePoi(f), pulled = dip && helped && !rest;
    const sp = Math.hypot(f.vx, f.vy) || 1, mx = pulled ? Math.max(K.spd, 240) : K.spd * (1 - 0.5 * tired) * (rest ? 0.2 : (1 + f.flee * 1.8) * (f.danger ? 1.6 : 1)), mn = K.spd * (rest ? 0.05 : 0.3);
    if (sp > mx) { f.vx *= mx / sp; f.vy *= mx / sp; } else if (sp < mn) { f.vx *= mn / sp; f.vy *= mn / sp; }
    f.x += f.vx * dt; f.y += f.vy * dt;
    f.x = clamp(f.x, B.x0 + f.r * 0.5, B.x1 - f.r * 0.5); f.y = clamp(f.y, B.y0 + f.r * 0.5, B.y1 - f.r * 0.5);
    f.ang = angLerp(f.ang, Math.atan2(f.vy, f.vx), 1 - Math.exp(-dt * 7));
  }
}

// ---------------------------------------------------------------- 終わり
const FIRE = [];
function updateEnding(dt) {
  const E = G.ending; E.t += dt;
  if (E.t > 3 && E.t < 8.5) { E.fw = (E.fw || 0) - dt; if (E.fw <= 0) { E.fw = 0.35 + frng() * 0.3; firework(R(120, W - 120), R(260, 620)); } }
  for (let i = FIRE.length - 1; i >= 0; i--) { const p = FIRE[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; p.vx *= 0.985; p.vy *= 0.985; if (p.t > p.life) FIRE.splice(i, 1); }
  if (E.t > ENDING_LEN && !E.offer) {
    E.offer = offerPerks();
    // 試験用：?perk=id のときは必ず並べる
    const qi = PERKS.findIndex(P => P.id === QPERK);
    if (BOT && qi >= 0 && !E.offer.includes(qi)) E.offer[0] = qi;
  }
  // bot は ?perk=id があればそれを、なければ 1 枚目を選ぶ
  if (BOT && E.offer && E.pick == null && E.t > ENDING_LEN + 1) {
    const want = E.offer.findIndex(i => PERKS[i].id === QPERK);
    E.pick = want >= 0 ? want : 0; E.pickT = E.t;
  }
  if (E.pick != null && E.t > E.pickT + 0.5) {
    const perk = PERKS[E.offer[E.pick]];
    G.perks = (G.perks || []).concat(perk.id); ev('perk', { id: perk.id, offer: E.offer.map(i => PERKS[i].id) });
    G.ending = null; G.ng++; FIRE.length = 0; ev('restart', { ng: G.ng });
    G.coins = G.disp = 0; G.seen = {}; BOTS.bossFails = {};
    startWorld(0, false);
    seenOnce('night_' + G.ng, { mul: ngMul() });
  }
  decay(dt);
}
const FW_COLS = ['#ff5a5a', '#ffd23a', '#7fe0ff', '#b48cff', '#7aff9a', '#ff9ad0'];
function firework(x, y) {
  const col = FW_COLS[Math.floor(frng() * FW_COLS.length)], n = 60;
  for (let i = 0; i < n; i++) { const a = i / n * TAU, s = R(160, 260); FIRE.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: R(0.9, 1.4), c: col }); }
  SFX.boom();
}

// ---------------------------------------------------------------- bot（決定的）
const BOTS = { st: 'seek', t: 0, px: W / 2, py: 640, hold: 0, re: 0, anchor: null, maxIn: 0, shopI: -1, greedW: -1, bossFails: {}, greedK: HUMAN ? 1.08 : 0.95 };
const BOT_SPD = HUMAN ? 1100 : 2600, BOT_REACT = HUMAN ? 0.45 : 0.12;
function clusterAt(x, y, rr) {
  let n = 0, w = 0, v = 0, sx = 0, sy = 0;
  for (const f of fish) { if (f.spawn < 1 || f.K.fast) continue; const d = Math.hypot(f.x - x, f.y - y); if (d + f.r * 0.55 <= rr) { n++; w += f.K.w; v += f.K.v * (f.danger ? 2 : 1); sx += f.x; sy += f.y; } }
  return { n, w, v, cx: n ? sx / n : x, cy: n ? sy / n : y };
}
// 主を狙えるか：濡れを見込んだ持てる重さ。主で破れるたびに、見込みを厳しくする（もっと強化してから挑む）
// 主をすくうまでに見込む濡れ：根（おさえる秒数）・太陽の熱。速乾の Lv で減る
function botWetExp(BK, dlv) {
  const k = dryOf(dlv === undefined ? G.lv.d : dlv) * (1 + 0.1 * G.lv.s);
  if (BK.root) return 0.3 * (BK.root + 0.3) * k;
  if (BK.heat) return 0.3 * 0.4 * 7 * k;
  return 0.1 * k;
}
const botMargin = () => { const BK = WK().find(K => K.boss); return 1.12 - 0.6 * Math.min(0.8, Math.max(botWetExp(BK), 0.15 + 0.2 * (BOTS.bossFails[G.k] || 0))); };
const botDryOK = BK => !(BK.root || BK.heat) || botWetExp(BK) <= 0.5;
function botCanBoss() { const b = bossFish(); return b && b.spawn >= 1 && cap() * botMargin() >= b.K.w && !tooBig(b) && botDryOK(b.K) ? b : null; }
function botPick() {
  const b = botCanBoss();
  if (b) return { x: b.x, y: b.y, boss: b };
  // 流れ星：通り道で待つ
  for (const f of fish) {
    if (!f.K.fast || !f.entered || f.K.w > cap() * 0.8) continue;
    const px = f.x + f.vx * 0.55, py = f.y + f.vy * 0.55;
    if (px > B.x0 + 60 && px < B.x1 - 60 && py > B.y0 + 60 && py < B.y1 - 60) return { x: px, y: py, meteor: f };
  }
  // 一度だけ、重すぎる獲物に欲張って破る（各世界で 1 回。見せ場と、厚さの意味を見せる）
  if (BOTS.greedW !== G.k && G.wt > 6) {
    const h = fish.find(f => f.spawn >= 1 && !f.K.fast && tooHeavy(f) && !f.K.boss) || fish.find(f => f.spawn >= 1 && tooHeavy(f));
    if (h) { BOTS.greedW = G.k; return { x: h.x, y: h.y, greed: h }; }
  }
  // 人と同じく重さは目で見積もる：赤い輪は避けるが、群れの合計は少し欲張る（濡れも見込まない）
  // 島（根）は長くおさえる分だけ濡れるのを見込む
  const expHold = WK().some(K => K.root) ? 0.75 : 0.3;
  const wetEnd = Math.min(1, poi.wet + 0.32 * expHold * dryOf(G.lv.d) * (1 + 0.1 * G.lv.s));
  const rr = poi.r * 0.86, lim = cap() * (1.12 - 0.6 * wetEnd) * BOTS.greedK;
  let best = null, bs = -1;
  for (const f of fish) {
    if (f.spawn < 1 || f.K.fast || f.K.boss) continue;
    const c = clusterAt(f.x, f.y, rr); if (!c.n) continue;
    const c2 = clusterAt(c.cx, c.cy, rr);
    const use = c2.v * mult(c2.n) >= c.v * mult(c.n) ? c2 : c;
    const x = use === c2 ? c.cx : f.x, y = use === c2 ? c.cy : f.y;
    if (use.w > lim) continue;
    const score = use.v * mult(use.n) - Math.hypot(x - poi.x, y - poi.y) * 0.004;
    if (score > bs) { bs = score; best = { x, y }; }
  }
  return best;
}
function botBuy() {
  const BK = WK().find(K => K.boss), bw = BK.w;
  // 主に足りないもの（大きさ・速乾・厚さ）。足りないものの中で安い順に買う
  const need = [];
  if (!fitsLv(BK, G.lv.s)) need.push(1);
  if (!botDryOK(BK)) need.push(2);
  if (cap() * botMargin() < bw) need.push(0);
  if (need.length) {
    need.sort((a, b) => price(a) - price(b));
    if (price(need[0]) <= G.coins) return need[0];
    // 待つ間、安いほかの強化を少し
    for (const i of [1, 2, 0]) if (!need.includes(i) && price(i) <= G.coins && price(i) < price(need[0]) * 0.4 && lvOf(i) < 2) return i;
    return -1;
  }
  for (const i of [2, 1]) if (price(i) <= G.coins && lvOf(i) < (G.k >= 2 ? 3 : 2)) return i;
  return -1;
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
    const want = botBuy();
    if (want >= 0 && S.t > 0.05) { S.st = 'shop'; S.shopI = want; S.t = 0; input.away = true; return; }
    S.re -= dt;
    if (S.re <= 0 || !S.anchor) { S.anchor = botPick(); S.re = HUMAN ? 0.4 : 0.25; }
    if (!S.anchor) { move(W / 2, 640, 900); return; }
    if (S.anchor.boss) { S.anchor.x = S.anchor.boss.x; S.anchor.y = S.anchor.boss.y; }
    const d = move(S.anchor.x, S.anchor.y, BOT_SPD);
    const ready = S.anchor.meteor ? Math.hypot(S.anchor.meteor.x - poi.x, S.anchor.meteor.y - poi.y) < poi.r + 140 : true;
    if (d < 10 && S.t > BOT_REACT && ready) {
      pDown(S.px, S.py); S.st = 'dip'; S.t = 0; S.maxIn = 0; S.warnT = null;
      S.hold = S.anchor.greed ? 0.5 : S.anchor.boss ? 1.6 : S.anchor.meteor ? 1.0 : (HUMAN ? 0.34 : 0.24) + brng() * 0.14;
      const rootMax = Math.max(0, ...fish.filter(f => f.K.root && Math.hypot(f.x - S.px, f.y - S.py) < poi.r).map(f => f.K.root));
      S.rooted = rootMax;
      if (rootMax) S.hold = Math.max(S.hold, rootMax + 0.26 + (HUMAN ? 0.15 : 0));
      S.mode = S.anchor.boss ? 'boss' : S.anchor.meteor ? 'meteor' : S.anchor.greed ? 'greed' : 'school';
      S.tg = S.anchor.boss || S.anchor.meteor || S.anchor.greed || null;
    }
  } else if (S.st === 'dip') {
    const end = () => { pUp(); S.st = 'cool'; S.t = 0; };
    if (S.mode === 'boss' || S.mode === 'greed') {
      const f = S.tg;
      if (!fish.includes(f)) { end(); return; }
      move(f.x, f.y, HUMAN ? 420 : 520);
      if ((insidePoi(f) && S.t > 0.12 && (!f.K.root || (f.hold || 0) >= f.K.root)) || S.t > S.hold || poi.wet > (f.K.root || f.K.heat ? 0.8 : 0.55)) end();
      return;
    }
    if (S.mode === 'meteor') {
      const f = S.tg;
      if (!fish.includes(f) || S.t > S.hold) { end(); return; }
      if (insidePoi(f)) end();
      return;
    }
    const c = clusterAt(poi.x, poi.y, poi.r * 0.98);
    S.maxIn = Math.max(S.maxIn, c.n);
    if (!S.rooted) move(c.cx, c.cy, 260);
    // 沈みきる前（0.14 秒）に上げると空振りになるので、重さで上げるのは沈んでから
    // 人の速さの bot：重さの印が赤くなりかけたのを見てから 0.2 秒で上げる（見て反応する分だけ遅れる）
    if (HUMAN && S.warnT == null && c.w > capEff() * 0.85) S.warnT = S.t;
    const late = HUMAN && S.warnT != null && S.t - S.warnT > 0.2;
    if (S.t >= S.hold || (!S.rooted && S.t > 0.14 && (c.n < S.maxIn || late || (!HUMAN && c.w > capEff() * 0.95)))) end();
  } else if (S.st === 'cool') {
    if (S.t > (HUMAN ? 0.35 : 0.2)) { S.st = 'seek'; S.t = 0; S.anchor = null; }
  } else if (S.st === 'shop') {
    const b = btnRect(S.shopI), x = b.x + b.w / 2, y = b.y + b.h / 2;
    const d = move(x, y, BOT_SPD);
    if (d < 6) { pDown(x, y); pUp(); S.st = 'back'; S.t = 0; }
  } else if (S.st === 'back') {
    if (S.t > (HUMAN ? 0.4 : 0.12)) { S.st = 'seek'; S.t = 0; S.anchor = null; input.away = false; }
  }
}

// ---------------------------------------------------------------- 描画：獲物
function finTail(c, r, sw, sw2, tcol, tl) {
  c.save(); c.translate(-0.42 * r, 0); c.rotate(sw * 0.38); c.fillStyle = tcol;
  const bend = sw2 * 0.22 * r;
  for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(0, 0);
    c.quadraticCurveTo(-0.35 * r, s * 0.6 * r, -0.98 * r * tl, s * 0.62 * r + bend);
    c.quadraticCurveTo(-0.72 * r, s * 0.2 * r + bend * 0.5, -0.88 * r * tl, bend * 0.6);
    c.closePath(); c.fill();
  }
  c.restore();
}
function drawGoldfish(c, f, r, sw, sw2, kind) {
  const deme = kind === 'demekin', kin = kind === 'kin', black = deme && f.var < 2;
  const col = kin ? '#ffb21a' : deme ? (black ? '#1c1c2a' : '#ff3a1e') : KINGYO_COLS[f.var % 4][0];
  const tcol = kin ? 'rgba(255,220,120,0.8)' : deme ? (black ? 'rgba(60,60,110,0.75)' : 'rgba(255,120,90,0.75)') : KINGYO_COLS[f.var % 4][1];
  finTail(c, r, sw, sw2, tcol, deme ? 1.15 : 1.0);
  c.fillStyle = tcol;
  for (const s of [-1, 1]) { c.save(); c.translate(0.22 * r, s * 0.3 * r); c.rotate(s * (0.9 + sw * 0.35)); c.beginPath(); c.ellipse(-0.1 * r, 0, 0.2 * r, 0.08 * r, 0, 0, TAU); c.fill(); c.restore(); }
  c.fillStyle = col; c.beginPath(); c.ellipse(0.06 * r, 0, 0.58 * r, deme ? 0.4 * r : 0.35 * r, 0, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(-0.3 * r, -0.2 * r); c.quadraticCurveTo(-0.55 * r, 0, -0.3 * r, 0.2 * r); c.fill();
  // 白い模様（var 3 と キンちゃん）＝ 地球の大陸と同じ並び
  if ((f.var === 3 && kind === 'kingyo') || kin || f.isKin) {
    c.save(); c.beginPath(); c.ellipse(0.06 * r, 0, 0.58 * r, 0.35 * r, 0, 0, TAU); c.clip();
    c.fillStyle = kin ? 'rgba(255,250,220,0.85)' : '#fff6ee';
    for (const p of KIN_PATCH) { c.beginPath(); c.ellipse(p[0] * r * 1.6, p[1] * r * 1.2, p[2] * r * 1.5, p[2] * r * 1.1, 0.4, 0, TAU); c.fill(); }
    c.restore();
  }
  c.fillStyle = black ? 'rgba(140,150,255,0.25)' : 'rgba(255,230,160,0.45)';
  c.beginPath(); c.ellipse(0.02 * r, 0, 0.42 * r, 0.09 * r, 0, 0, TAU); c.fill();
  if (deme) {
    for (const s of [-1, 1]) {
      c.fillStyle = black ? '#2a2a3a' : '#ff6a3a'; c.beginPath(); c.arc(0.42 * r, s * 0.36 * r, 0.16 * r, 0, TAU); c.fill();
      c.fillStyle = '#05050a'; c.beginPath(); c.arc(0.45 * r, s * 0.4 * r, 0.11 * r, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0.43 * r, s * 0.37 * r, 0.04 * r, 0, TAU); c.fill();
    }
  } else {
    c.fillStyle = '#1a0a08';
    for (const s of [-1, 1]) { c.beginPath(); c.arc(0.46 * r, s * 0.2 * r, Math.max(1.2, 0.07 * r), 0, TAU); c.fill(); }
  }
}
function drawKoi(c, f, r, sw, sw2, big) {
  c.save(); c.translate(-0.7 * r, 0); c.rotate(sw * 0.3);
  c.fillStyle = big ? 'rgba(255,230,180,0.9)' : 'rgba(255,250,245,0.85)';
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-0.2 * r, s * 0.25 * r, -0.42 * r, s * 0.3 * r + sw2 * 0.08 * r); c.quadraticCurveTo(-0.3 * r, 0, -0.36 * r, sw2 * 0.05 * r); c.closePath(); c.fill(); }
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.6)';
  for (const s of [-1, 1]) { c.save(); c.translate(0.3 * r, s * 0.18 * r); c.rotate(s * (1.0 + sw * 0.25)); c.beginPath(); c.ellipse(-0.12 * r, 0, 0.2 * r, 0.08 * r, 0, 0, TAU); c.fill(); c.restore(); }
  c.beginPath(); c.moveTo(0.82 * r, 0);
  c.bezierCurveTo(0.8 * r, -0.26 * r, 0.1 * r, -0.28 * r, -0.4 * r, -0.14 * r);
  c.quadraticCurveTo(-0.75 * r, -0.04 * r, -0.72 * r, 0);
  c.quadraticCurveTo(-0.75 * r, 0.04 * r, -0.4 * r, 0.14 * r);
  c.bezierCurveTo(0.1 * r, 0.28 * r, 0.8 * r, 0.26 * r, 0.82 * r, 0);
  c.fillStyle = big ? '#fff1d6' : '#fbf6ef'; c.fill();
  c.save(); c.clip(); c.fillStyle = big ? '#f0a020' : '#e8321e';
  for (const p of f.patches) { c.beginPath(); c.ellipse(p[0] * r, p[1] * r, p[2] * r, p[2] * r * 0.8, 0, 0, TAU); c.fill(); }
  if (big) { c.fillStyle = 'rgba(30,20,10,0.75)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc((-0.4 + i * 0.22) * r, (i % 2 - 0.5) * 0.12 * r, 0.05 * r, 0, TAU); c.fill(); } }
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-r, -0.04 * r, 2 * r, 0.06 * r);
  c.restore();
  c.fillStyle = '#222'; for (const s of [-1, 1]) { c.beginPath(); c.arc(0.62 * r, s * 0.13 * r, 0.035 * r, 0, TAU); c.fill(); }
  c.strokeStyle = 'rgba(120,80,60,0.6)'; c.lineWidth = 1.5;
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0.8 * r, s * 0.05 * r); c.lineTo(0.9 * r, s * 0.12 * r); c.stroke(); }
}
function drawWhale(c, f, r, sw) {
  const fl = 0.75 + 0.25 * sw;
  c.fillStyle = '#26406a';
  c.save(); c.translate(-0.82 * r, 0); c.rotate(sw * 0.12);
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0.05 * r, 0); c.quadraticCurveTo(-0.08 * r, s * 0.3 * r * fl, -0.2 * r, s * 0.42 * r * fl); c.quadraticCurveTo(-0.12 * r, s * 0.12 * r, -0.16 * r, 0); c.closePath(); c.fill(); }
  c.restore();
  for (const s of [-1, 1]) { c.save(); c.translate(0.3 * r, s * 0.24 * r); c.rotate(s * (0.7 + sw * 0.15)); c.beginPath(); c.ellipse(-0.14 * r, 0, 0.26 * r, 0.06 * r, 0, 0, TAU); c.fill(); c.restore(); }
  c.beginPath(); c.moveTo(0.95 * r, 0);
  c.bezierCurveTo(0.95 * r, -0.34 * r, 0.2 * r, -0.34 * r, -0.4 * r, -0.16 * r);
  c.quadraticCurveTo(-0.85 * r, -0.05 * r, -0.85 * r, 0);
  c.quadraticCurveTo(-0.85 * r, 0.05 * r, -0.4 * r, 0.16 * r);
  c.bezierCurveTo(0.2 * r, 0.34 * r, 0.95 * r, 0.34 * r, 0.95 * r, 0);
  c.fillStyle = '#2d4b7c'; c.fill();
  c.fillStyle = 'rgba(160,200,255,0.25)'; c.beginPath(); c.ellipse(0.1 * r, 0, 0.6 * r, 0.08 * r, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(220,235,255,0.35)'; for (const p of f.patches) { c.beginPath(); c.arc(p[0] * r, p[1] * r, p[2] * r, 0, TAU); c.fill(); }
  c.fillStyle = '#0d1a30'; c.beginPath(); c.ellipse(0.55 * r, 0, 0.03 * r, 0.05 * r, 0, 0, TAU); c.fill();
}
function drawIwashi(c, f, r, sw) {
  c.save(); c.translate(-0.62 * r, 0); c.rotate(sw * 0.45); c.fillStyle = '#7f9ab8';
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(-0.38 * r, s * 0.3 * r); c.lineTo(-0.28 * r, 0); c.closePath(); c.fill(); }
  c.restore();
  const g = c.createLinearGradient(0, -0.2 * r, 0, 0.2 * r); g.addColorStop(0, '#3a6a9a'); g.addColorStop(0.45, '#cfe0f0'); g.addColorStop(1, '#f4f8ff');
  c.fillStyle = g; c.beginPath(); c.ellipse(0.04 * r, 0, 0.72 * r, 0.2 * r, 0, 0, TAU); c.fill();
  c.fillStyle = '#21364f'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc((0.25 - i * 0.16) * r, 0.02 * r, 0.035 * r, 0, TAU); c.fill(); }
  c.fillStyle = '#0a1220'; c.beginPath(); c.arc(0.55 * r, -0.05 * r, 0.05 * r, 0, TAU); c.fill();
}
function drawTai(c, f, r, sw, sw2) {
  c.save(); c.translate(-0.5 * r, 0); c.rotate(sw * 0.35); c.fillStyle = '#e8566a';
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-0.25 * r, s * 0.2 * r, -0.48 * r, s * 0.4 * r + sw2 * 0.06 * r); c.lineTo(-0.36 * r, 0); c.closePath(); c.fill(); }
  c.restore();
  // 背びれのとげ
  c.fillStyle = '#d23c52';
  for (let i = 0; i < 6; i++) { const x = (-0.3 + i * 0.12) * r; c.beginPath(); c.moveTo(x, -0.05 * r); c.lineTo(x + 0.05 * r, -0.42 * r); c.lineTo(x + 0.1 * r, -0.05 * r); c.fill(); }
  const g = c.createLinearGradient(0, -0.38 * r, 0, 0.38 * r); g.addColorStop(0, '#ff6d80'); g.addColorStop(0.7, '#ffb0b8'); g.addColorStop(1, '#fff0f0');
  c.fillStyle = g; c.beginPath(); c.ellipse(0.06 * r, 0, 0.6 * r, 0.36 * r, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(80,170,255,0.7)'; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc((-0.3 + (i % 4) * 0.18) * r, (i < 4 ? -0.1 : 0.06) * r, 0.025 * r, 0, TAU); c.fill(); }
  c.fillStyle = '#300'; c.beginPath(); c.arc(0.44 * r, -0.08 * r, 0.06 * r, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(0.43 * r, -0.09 * r, 0.02 * r, 0, TAU); c.fill();
}
function drawKame(c, f, r, sw) {
  c.fillStyle = '#8fbf5a';
  for (const [x, y, s, big] of [[0.28, 0.36, 1, 1], [0.28, -0.36, -1, 1], [-0.32, 0.3, 1, 0], [-0.32, -0.3, -1, 0]]) {
    c.save(); c.translate(x * r, y * r); c.rotate(s * (big ? 0.9 + sw * 0.5 : 2.2 - sw * 0.3)); c.beginPath(); c.ellipse(0.12 * r, 0, (big ? 0.28 : 0.15) * r, 0.08 * r, 0, 0, TAU); c.fill(); c.restore();
  }
  c.beginPath(); c.ellipse(0.62 * r, 0, 0.15 * r, 0.12 * r, 0, 0, TAU); c.fill();
  c.fillStyle = '#111'; for (const s of [-1, 1]) { c.beginPath(); c.arc(0.7 * r, s * 0.06 * r, 0.025 * r, 0, TAU); c.fill(); }
  const gold = f.K.gold;
  if (gold) { c.globalCompositeOperation = 'lighter'; c.drawImage(bokehSprite('rgba(255,210,80,A)'), -r, -r, r * 2, r * 2); c.globalCompositeOperation = 'source-over'; }
  const g = c.createRadialGradient(-0.1 * r, -0.1 * r, 0.05 * r, 0, 0, 0.55 * r); g.addColorStop(0, gold ? '#fff0a0' : '#9ccf5a'); g.addColorStop(1, gold ? '#d08a10' : '#3f6a2a');
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 0.52 * r, 0.43 * r, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(30,50,20,0.6)'; c.lineWidth = Math.max(1.5, r * 0.025);
  const hx = (x, y, s) => { c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); } c.closePath(); c.stroke(); };
  hx(0, 0, 0.15 * r); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.5; hx(Math.cos(a) * 0.3 * r, Math.sin(a) * 0.25 * r, 0.12 * r); }
}
function drawStar(c, f, r, t) {
  const rot = f.spin + t * 0.8, ro = r * 0.62, ri = r * 0.27;
  c.globalCompositeOperation = 'lighter'; c.drawImage(bokehSprite('rgba(255,230,140,A)'), -r * 1.2, -r * 1.2, r * 2.4, r * 2.4); c.globalCompositeOperation = 'source-over';
  // しっぽの光（泳ぐ向きの後ろ）
  c.fillStyle = 'rgba(255,240,180,0.35)'; c.beginPath(); c.moveTo(-0.2 * r, -0.2 * r); c.quadraticCurveTo(-1.1 * r, Math.sin(f.phase) * 0.3 * r, -0.2 * r, 0.2 * r); c.fill();
  c.save(); c.rotate(rot);
  c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rad = i % 2 ? ri : ro; c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } c.closePath();
  const g = c.createRadialGradient(0, 0, 0, 0, 0, ro); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#fff1a0'); g.addColorStop(1, '#ffc23a');
  c.fillStyle = g; c.fill();
  c.restore();
}
function drawMeteor(c, f, r) {
  const L = r * 6, cm = f.K.comet;
  const g = c.createLinearGradient(-L, 0, 0, 0); g.addColorStop(0, cm ? 'rgba(120,255,180,0)' : 'rgba(140,200,255,0)'); g.addColorStop(1, cm ? 'rgba(200,255,220,0.9)' : 'rgba(220,240,255,0.9)');
  c.fillStyle = g; c.beginPath(); c.moveTo(-L, 0); c.lineTo(0, -r * 0.35); c.lineTo(0, r * 0.35); c.closePath(); c.fill();
  c.globalCompositeOperation = 'lighter'; c.drawImage(bokehSprite(cm ? 'rgba(120,255,170,A)' : 'rgba(180,220,255,A)'), -r * 1.3, -r * 1.3, r * 2.6, r * 2.6); c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, r * 0.32, 0, TAU); c.fill();
}
function drawPlanet(c, f, r, t, x, y) {
  const [c1, c2] = PLANET_COLS[f.var % PLANET_COLS.length], pr = r * 0.55;
  if (f.ring) { c.save(); c.rotate(f.tilt); c.strokeStyle = 'rgba(230,220,190,0.55)'; c.lineWidth = r * 0.07; c.beginPath(); c.ellipse(0, 0, pr * 1.7, pr * 0.45, 0, Math.PI, TAU); c.stroke(); c.restore(); }
  if (IMG.sp_planet) {
    // 絵の惑星。色は種類ごとに色相だけ変える（1 つ目は絵のままの橙）
    c.save(); c.rotate(f.var * 1.1 + (f.tilt || 0)); sprite(c, 'sp_planet', pr * 1.04);
    if (f.var % PLANET_COLS.length) { c.beginPath(); c.arc(0, 0, pr * 0.98, 0, TAU); c.clip(); c.globalCompositeOperation = 'hue'; c.fillStyle = c1; c.fillRect(-pr, -pr, pr * 2, pr * 2); }
    c.restore();
  } else {
    const g = c.createRadialGradient(-pr * 0.35, -pr * 0.35, pr * 0.1, 0, 0, pr); g.addColorStop(0, c1); g.addColorStop(1, c2);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, pr, 0, TAU); c.fill();
    c.save(); c.clip(); c.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = -2; i <= 2; i++) c.fillRect(-pr, i * pr * 0.32 - pr * 0.06 + Math.sin(t + i) * 2, pr * 2, pr * 0.12);
    c.fillStyle = 'rgba(0,0,20,0.35)'; c.beginPath(); c.arc(pr * 0.35, pr * 0.35, pr, 0, TAU); c.fill(); c.restore();
  }
  if (f.ring) { c.save(); c.rotate(f.tilt); c.strokeStyle = 'rgba(240,230,200,0.75)'; c.lineWidth = r * 0.07; c.beginPath(); c.ellipse(0, 0, pr * 1.7, pr * 0.45, 0, 0, Math.PI); c.stroke(); c.restore(); }
}
function drawSun(c, f, r, t) {
  c.globalCompositeOperation = 'lighter';
  const s = 1 + 0.05 * Math.sin(t * 5);
  c.globalAlpha *= 0.8; c.drawImage(bokehSprite('rgba(255,150,40,A)'), -r * 1.6 * s, -r * 1.6 * s, r * 3.2 * s, r * 3.2 * s); c.globalAlpha /= 0.8;
  c.globalCompositeOperation = 'source-over';
  if (IMG.sp_sun) { c.save(); c.rotate(t * 0.15); sprite(c, 'sp_sun', r * 0.8 * s); c.restore(); return; }
  const g = c.createRadialGradient(-r * 0.15, -r * 0.15, r * 0.05, 0, 0, r * 0.6); g.addColorStop(0, '#fffbe0'); g.addColorStop(0.5, '#ffd040'); g.addColorStop(1, '#ff7a10');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 0.6, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,120,20,0.35)'; for (let i = 0; i < 5; i++) { const a = t * 0.3 + i * 1.3; c.beginPath(); c.arc(Math.cos(a) * r * 0.3, Math.sin(a * 1.3) * r * 0.25, r * 0.08, 0, TAU); c.fill(); }
}
function drawGalaxy(c, f, r, t) {
  c.rotate(f.spin + t * 0.6);
  if (IMG.sp_galaxy) {
    c.globalCompositeOperation = 'lighter'; c.globalAlpha *= 0.5; c.drawImage(bokehSprite('rgba(140,220,255,A)'), -r, -r, r * 2, r * 2); c.globalAlpha /= 0.5; c.globalCompositeOperation = 'source-over';
    sprite(c, 'sp_galaxy', r * 0.95); return;
  }
  c.globalCompositeOperation = 'lighter';
  // 背景（紫）と見分けやすいよう、銀河は水色と白
  c.drawImage(bokehSprite('rgba(140,220,255,A)'), -r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
  for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 14; i++) {
    const u = i / 14, a = arm * Math.PI + u * 4.2, d = u * r * 0.85;
    c.fillStyle = `rgba(${170 + arm * 60},${240 - u * 40},255,${0.95 - u * 0.5})`;
    c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d * 0.7, r * (0.09 - u * 0.05), 0, TAU); c.fill();
  }
  c.fillStyle = '#fff6e0'; c.beginPath(); c.arc(0, 0, r * 0.14, 0, TAU); c.fill();
  c.globalCompositeOperation = 'source-over';
}
function drawNebula(c, f, r, t) {
  if (IMG.sp_nebula) { c.save(); c.rotate(f.spin + t * 0.1); const s = 1 + 0.04 * Math.sin(t * 2 + f.id); sprite(c, 'sp_nebula', r * 0.85 * s); c.restore(); return; }
  c.globalCompositeOperation = 'lighter';
  const cols = ['rgba(120,90,255,A)', 'rgba(255,90,180,A)', 'rgba(70,210,230,A)'];
  for (let i = 0; i < 4; i++) { const a = i * 1.7 + t * 0.2 + f.spin, d = r * 0.3, s = r * (1.0 + 0.2 * Math.sin(t + i)); c.globalAlpha = 0.5; c.drawImage(bokehSprite(cols[(i + f.var) % 3]), Math.cos(a) * d - s / 2, Math.sin(a) * d - s / 2, s, s); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const a = i * 2.3 + f.spin; c.fillRect(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.3, 2.5, 2.5); }
}
function drawCreature(c, f, x, y, ang, sc, alpha) {
  const r = f.r * sc, sw = Math.sin(f.phase), sw2 = Math.sin(f.phase - 0.9), t = G.simT, d = f.K.draw;
  c.save(); c.translate(x, y); c.rotate(ROUND[d] ? 0 : ang); c.globalAlpha = alpha;
  if (f.swarm && f.spawn >= 1) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = alpha * (0.45 + 0.2 * Math.sin(t * 6 + f.id)); c.drawImage(bokehSprite('rgba(255,210,60,A)'), -r * 1.3, -r * 1.3, r * 2.6, r * 2.6); c.globalAlpha = alpha; c.globalCompositeOperation = 'source-over'; }
  if (d === 'kingyo' || d === 'demekin') drawGoldfish(c, f, r, sw, sw2, d);
  else if (d === 'hoshikin') {
    c.globalCompositeOperation = 'lighter'; c.drawImage(bokehSprite('rgba(110,190,255,A)'), -r * 1.3, -r * 1.3, r * 2.6, r * 2.6); c.globalCompositeOperation = 'source-over';
    drawGoldfish(c, f, r, sw, sw2, 'kingyo');
    c.fillStyle = '#e8f6ff'; for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1 + f.id, s = r * (0.07 + 0.03 * Math.sin(t * 8 + i)); const x0 = Math.cos(a) * r * 0.55, y0 = Math.sin(a) * r * 0.4; c.beginPath(); c.moveTo(x0, y0 - s * 2); c.lineTo(x0 + s * 0.5, y0); c.lineTo(x0, y0 + s * 2); c.lineTo(x0 - s * 0.5, y0); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x0 - s * 2, y0); c.lineTo(x0, y0 + s * 0.5); c.lineTo(x0 + s * 2, y0); c.lineTo(x0, y0 - s * 0.5); c.closePath(); c.fill(); }
  }
  else if (d === 'kin') {
    if (f.K.halo) {
      // 光の輪（この輪ごとすくう）。中のキンちゃんは小さめ
      // 輪は大きさ Lv2 のポイとほぼ同じ大きさ（画面幅の 30% 以上。批評 r10：山場が弱い）
      const hr = r * 0.74;
      c.save(); c.rotate(-ang); c.globalCompositeOperation = 'lighter';
      c.globalAlpha = alpha * 0.55; c.drawImage(bokehSprite('rgba(255,200,80,A)'), -hr * 1.3, -hr * 1.3, hr * 2.6, hr * 2.6);
      c.globalAlpha = alpha; c.strokeStyle = `rgba(255,225,120,${0.75 + 0.2 * Math.sin(t * 4)})`; c.lineWidth = 5;
      c.beginPath(); c.arc(0, 0, hr, 0, TAU); c.stroke();
      c.lineWidth = 2; c.setLineDash([4, 10]); c.beginPath(); c.arc(0, 0, hr * 0.86, t, t + TAU); c.stroke(); c.setLineDash([]);
      c.globalCompositeOperation = 'source-over'; c.restore();
      drawGoldfish(c, f, r * 0.42, sw, sw2, 'kin');
    } else {
      c.globalCompositeOperation = 'lighter'; c.drawImage(bokehSprite('rgba(255,200,80,A)'), -r * 1.4, -r * 1.4, r * 2.8, r * 2.8); c.globalCompositeOperation = 'source-over';
      drawGoldfish(c, f, r, sw, sw2, 'kin');
    }
  }
  else if (d === 'koi') drawKoi(c, f, r, sw, sw2, false);
  else if (d === 'bigkoi') drawKoi(c, f, r, sw, sw2, true);
  else if (d === 'kujira') drawWhale(c, f, r, sw);
  else if (d === 'iwashi') drawIwashi(c, f, r, sw);
  else if (d === 'tai') drawTai(c, f, r, sw, sw2);
  else if (d === 'kame') drawKame(c, f, r, sw);
  else if (d === 'star') drawStar(c, f, r, t);
  else if (d === 'meteor') drawMeteor(c, f, r);
  else if (d === 'planet') drawPlanet(c, f, r, t);
  else if (d === 'sun') drawSun(c, f, r, t);
  else if (d === 'galaxy') drawGalaxy(c, f, r, t);
  else if (d === 'island' || d === 'volcano' || d === 'bigisland' || d === 'continent') drawIsland(c, f, r, t, d);
  else if (d === 'nebula') drawNebula(c, f, r, t);
  c.restore();
}
const ROUND = { planet: 1, sun: 1, galaxy: 1, nebula: 1, island: 1, volcano: 1, bigisland: 1, continent: 1 };
const NO_SHADOW = { star: 1, meteor: 1, sun: 1, galaxy: 1, nebula: 1, kin: 1, island: 1, volcano: 1, bigisland: 1, continent: 1 };
// 島の形（ふちがでこぼこの丸）。f.id で形が決まる
function blob(c, r, seed, n, amp) {
  const rr0 = mulberry32(seed);
  const k = []; for (let i = 0; i < n; i++) k.push(1 - amp + rr0() * amp * 2);
  c.beginPath();
  for (let i = 0; i <= n; i++) { const a = i / n * TAU, rad = r * k[i % n]; const x = Math.cos(a) * rad, y = Math.sin(a) * rad * 0.85; i ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.closePath();
}
function drawIsland(c, f, r, t, kind) {
  const slip = f.slip > 0 ? Math.sin(t * 60) * 3 * f.slip : 0;
  c.translate(slip, 0);
  const R0 = kind === 'continent' ? r * 0.62 : kind === 'bigisland' ? r * 0.6 : r * 0.55;
  if (IMG[ISLAND_ART[kind]]) {
    // 絵の島：形ごとに向きを変える（同じ島が並んで見えないように）
    c.save(); c.rotate((f.id * 2.399) % TAU);
    sprite(c, ISLAND_ART[kind], R0 * 1.3);
    c.restore();
    if (f.K.cloud) { c.globalAlpha *= 0.85; for (let i = 0; i < 4; i++) c.drawImage(bokehSprite('rgba(255,255,255,A)'), (i - 1.5) * R0 * 0.7 - R0 * 0.6, R0 * 0.55, R0 * 1.2, R0 * 0.7); c.globalAlpha /= 0.85; }
    return;
  }
  // 浅瀬
  c.fillStyle = 'rgba(120,230,230,0.35)'; blob(c, R0 * 1.25, f.id * 7 + 1, 14, 0.18); c.fill();
  // 砂浜
  c.fillStyle = '#f2dca0'; blob(c, R0 * 1.06, f.id * 7 + 1, 14, 0.18); c.fill();
  // 緑
  const g = c.createRadialGradient(-R0 * 0.3, -R0 * 0.3, R0 * 0.1, 0, 0, R0); g.addColorStop(0, '#8fd36a'); g.addColorStop(1, '#3f8a3a');
  c.fillStyle = g; blob(c, R0 * 0.9, f.id * 7 + 1, 14, 0.2); c.fill();
  const rr1 = mulberry32(f.id * 13 + 5);
  if (kind === 'volcano') {
    c.fillStyle = '#7a5a40'; c.beginPath(); c.arc(0, 0, R0 * 0.55, 0, TAU); c.fill();
    c.fillStyle = '#5a3a28'; c.beginPath(); c.arc(0, 0, R0 * 0.3, 0, TAU); c.fill();
    c.fillStyle = '#ff6a20'; c.beginPath(); c.arc(0, 0, R0 * 0.17, 0, TAU); c.fill();
    c.globalAlpha *= 0.5; c.drawImage(bokehSprite('rgba(230,230,230,A)'), R0 * 0.1 + Math.sin(t) * 4, -R0 * 1.1, R0 * 0.9, R0 * 0.9); c.globalAlpha /= 0.5;
  } else if (kind === 'bigisland' || kind === 'continent') {
    const nm = kind === 'continent' ? 9 : 4;
    for (let i = 0; i < nm; i++) {
      const a = rr1() * TAU, d = rr1() * R0 * 0.55, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.85, s = R0 * (0.14 + rr1() * 0.1);
      c.fillStyle = '#8a7a5a'; c.beginPath(); c.moveTo(x - s, y + s * 0.6); c.lineTo(x, y - s * 0.8); c.lineTo(x + s, y + s * 0.6); c.closePath(); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(x - s * 0.3, y - s * 0.3); c.lineTo(x, y - s * 0.8); c.lineTo(x + s * 0.3, y - s * 0.3); c.closePath(); c.fill();
    }
    if (kind === 'continent') {
      c.strokeStyle = '#4fb0e0'; c.lineWidth = Math.max(2, R0 * 0.03); c.beginPath(); c.moveTo(-R0 * 0.6, R0 * 0.2); c.quadraticCurveTo(-R0 * 0.1, -R0 * 0.1, R0 * 0.3, R0 * 0.35); c.stroke();
      c.fillStyle = '#d9c27a'; c.beginPath(); c.ellipse(R0 * 0.35, -R0 * 0.35, R0 * 0.2, R0 * 0.12, 0.3, 0, TAU); c.fill();
    }
  }
  // 木
  const nt = kind === 'island' ? 3 : 5;
  for (let i = 0; i < nt; i++) { const a = rr1() * TAU, d = R0 * (0.3 + rr1() * 0.45); c.fillStyle = '#2f6a2a'; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d * 0.85, R0 * 0.09, 0, TAU); c.fill(); }
  // 浮き島：下に雲
  if (f.K.cloud) { c.globalAlpha *= 0.85; for (let i = 0; i < 4; i++) c.drawImage(bokehSprite('rgba(255,255,255,A)'), (i - 1.5) * R0 * 0.7 - R0 * 0.6, R0 * 0.55, R0 * 1.2, R0 * 0.7); c.globalAlpha /= 0.85; }
}
function drawShadow(c, f, x, y, ang, sc) {
  if (NO_SHADOW[f.K.draw]) return;
  const r = f.r * sc, off = 4 + f.r * 0.18, round = f.K.draw === 'planet' || f.K.draw === 'kame';
  c.save(); c.translate(x + off, y + off * 1.5); c.rotate(ang);
  c.beginPath(); c.ellipse(0, 0, (round ? 0.55 : 0.75) * r, (round ? 0.5 : 0.3) * r, 0, 0, TAU); c.fill();
  c.restore();
}

// ---------------------------------------------------------------- 描画：ポイ
function paperStyle(alphaMul) {
  const w = clamp(poi.wet, 0, 1), b = poi.burn;
  const r = Math.round(lerp(lerp(250, 168, w), 200, b * 0.6)), g = Math.round(lerp(lerp(250, 190, w), 140, b * 0.6)), bl = Math.round(lerp(lerp(246, 205, w), 90, b * 0.6));
  return `rgba(${r},${g},${bl},${lerp(0.95, 0.5, w) * alphaMul})`;
}
function drawPaper(c, x, y, r, alphaMul) {
  c.fillStyle = paperStyle(alphaMul); c.beginPath(); c.arc(x, y, r * 0.95, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(160,170,180,0.25)'; c.lineWidth = 1;
  for (const fb of poi.fiber) { c.beginPath(); c.arc(x + fb[0] * r * 0.6, y + fb[1] * r * 0.6, r * fb[3], fb[2], fb[2] + 0.8); c.stroke(); }
  if (poi.burn > 0.05) { c.strokeStyle = `rgba(90,40,10,${poi.burn * 0.8})`; c.lineWidth = r * 0.12; c.beginPath(); c.arc(x, y, r * 0.88, 0, TAU); c.stroke(); }
  const show = (poi.wet - 0.25) / 0.65 * poi.cracks.length;
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
// ポイの縁の外に、紙の残り（濡れると減る）を輪で出す。速く動かすと目に見えて減る
function drawWetGauge(c, x, y, r) {
  const df = clamp(1 - poi.wet, 0, 1), R2 = r + 24;
  const col = df > 0.5 ? '#5ee07a' : df > 0.25 ? '#ffd23a' : '#ff4a3a';
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 11; c.beginPath(); c.arc(x, y, R2, 0, TAU); c.stroke();
  c.strokeStyle = col; c.lineWidth = 7; c.beginPath(); c.arc(x, y, R2, -Math.PI / 2, -Math.PI / 2 + df * TAU); c.stroke();
  // 速く動かしているときは、しずくの印が縁から落ちる
  if (poi.speed > 300) { c.fillStyle = '#bff4ff'; for (let k = 0; k < 3; k++) { const a = G.realT * 5 + k * 2.1; c.beginPath(); c.arc(x + Math.cos(a) * R2, y + Math.sin(a) * R2, 5, 0, TAU); c.fill(); } }
  c.lineCap = 'butt';
}
function drawRing(c, x, y, r, alpha, rim) {
  c.globalAlpha = alpha;
  const a = 0.95, hx = x + Math.cos(a) * r, hy = y + Math.sin(a) * r, L = Math.max(90, r * 1.7);
  c.save(); c.translate(hx, hy); c.rotate(a);
  c.fillStyle = '#c9201c'; rr(c, -4, -r * 0.07 - 3, L, r * 0.14 + 6, 6); c.fill();
  c.fillStyle = 'rgba(255,170,160,0.6)'; c.fillRect(2, -r * 0.05 - 1, L - 12, 3);
  c.restore();
  c.lineWidth = Math.max(6, r * 0.1); c.strokeStyle = rim || '#d6261f'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
  c.lineWidth = Math.max(2, r * 0.03); c.strokeStyle = 'rgba(255,170,160,0.85)'; c.beginPath(); c.arc(x, y, r - r * 0.02, Math.PI * 1.05, Math.PI * 1.75); c.stroke();
  c.lineWidth = 1.5; c.strokeStyle = 'rgba(90,0,0,0.6)'; c.beginPath(); c.arc(x, y, r + Math.max(3, r * 0.05), 0, TAU); c.stroke();
  c.globalAlpha = 1;
}

// ---------------------------------------------------------------- 描画：渦・ブラックホール
function drawVortex(c, V, t) {
  if (!V || !V.on) return;
  const id = WD().id, appear = clamp(V.age / 1.2, 0, 1), R0 = V.R * appear;
  c.save(); c.translate(V.x, V.y);
  if (id === 'sea') {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, R0); g.addColorStop(0, 'rgba(0,10,30,0.85)'); g.addColorStop(0.35, 'rgba(0,30,60,0.45)'); g.addColorStop(1, 'rgba(0,40,80,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(220,245,255,0.35)'; c.lineWidth = 3;
    for (let i = 0; i < 6; i++) { c.beginPath(); for (let u = 0; u < 1; u += 0.04) { const a = t * 2.2 + i * TAU / 6 + u * 5, d = R0 * (1 - u); u === 0 ? c.moveTo(Math.cos(a) * d, Math.sin(a) * d) : c.lineTo(Math.cos(a) * d, Math.sin(a) * d); } c.stroke(); }
  } else {
    // ブラックホール（星・宇宙）
    const core = V.core * appear;
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, 0, core * 0.9, 0, 0, R0); g.addColorStop(0, 'rgba(255,170,80,0.55)'); g.addColorStop(0.25, 'rgba(255,90,160,0.25)'); g.addColorStop(1, 'rgba(120,80,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R0, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.save(); c.scale(1, 0.38); c.strokeStyle = 'rgba(255,200,120,0.85)'; c.lineWidth = core * 0.35;
    c.beginPath(); c.arc(0, 0, core * 2.0, 0, TAU); c.stroke(); c.restore();
    for (let i = 0; i < 18; i++) { const a = -t * 1.6 + i * 0.35, d = core * (1.4 + ((i * 37) % 10) / 10 * (R0 / core - 1.4) * (1 - ((t * 0.3 + i * 0.13) % 1))); c.fillStyle = 'rgba(255,220,180,0.7)'; c.fillRect(Math.cos(a) * d, Math.sin(a) * d * 0.8, 2.5, 2.5); }
    c.fillStyle = '#000'; c.beginPath(); c.arc(0, 0, core, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,230,190,0.9)'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, core * 1.06, 0, TAU); c.stroke();
    c.save(); c.scale(1, 0.38); c.strokeStyle = 'rgba(255,220,150,0.9)'; c.lineWidth = core * 0.25; c.beginPath(); c.arc(0, 0, core * 2.0, 0, Math.PI); c.stroke(); c.restore();
  }
  c.restore();
}

// ---------------------------------------------------------------- 描画：全体
let overlayMax = 0; window.__overlayMax = () => overlayMax;
const overlayNow = () => texts.length + (G.total ? 1 : 0) + (G.banner ? 1 : 0) + (G.caption ? 1 : 0);
window.__overlayNow = overlayNow;
function render() {
  if (!G.ending) { const n = overlayNow(); if (n > overlayMax) { overlayMax = n; ev('overlay', { n }); } }
  if (G.ending) { drawEnding(ctx, G.ending.t); return; }
  if (G.trans) { const ps = poi.state; if (G.trans.from === 2) poi.state = 'snap'; renderScene(offCtx, false); poi.state = ps; drawTrans(ctx, G.trans.t); drawHUD(ctx); drawShop(ctx); return; }
  renderScene(ctx, true);
}
function renderScene(c, hud) {
  const t = G.simT, V = G.vortex, id = WD().id;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#05060d'; c.fillRect(0, 0, W, H);
  c.setTransform(1, 0, 0, 1, G.shx, G.shy);
  c.drawImage(bgOf(G.k), 0, 0);
  c.save(); rr(c, WATER.x, WATER.y, WATER.w, WATER.h, WATER.r); c.clip();
  if (id === 'pond' || id === 'sea' || id === 'land') {
    if (!cauPat) cauPat = c.createPattern(CAU, 'repeat');
    c.globalCompositeOperation = 'lighter';
    c.save(); const ox = (t * 14 + Math.sin(t * 0.7) * 20) % 256, oy = (t * -9 + Math.cos(t * 0.5) * 16) % 256;
    c.translate(ox, oy); c.globalAlpha = (id === 'pond' ? 0.26 : 0.18) * BGK; c.fillStyle = cauPat;
    c.fillRect(WATER.x - ox, WATER.y - oy, WATER.w, WATER.h); c.restore();
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  } else {
    const tw = id === 'cosmos' ? 0.4 : 1;
    for (const s of TWINKLE) { c.globalAlpha = (0.25 + 0.6 * Math.abs(Math.sin(t * 1.5 + s[3]))) * tw; c.fillStyle = '#fff'; c.fillRect(s[0], s[1], s[2], s[2]); }
    c.globalAlpha = 1;
  }
  drawVortex(c, V, t);
  const rc = WD().ripple;
  for (const r of rings) { const u = r.t / r.life; c.strokeStyle = `rgba(${rc},${(1 - u) * 0.7})`; c.lineWidth = r.w * (1 - u) + 0.5; c.beginPath(); c.arc(r.x, r.y, r.r, 0, TAU); c.stroke(); }
  c.fillStyle = id === 'pond' || id === 'sea' || id === 'land' ?'rgba(0,35,75,0.28)' : 'rgba(0,0,10,0.35)';
  for (const f of fish) drawShadow(c, f, f.x, f.y, f.ang, f.spawn);
  // 太陽の熱の輪
  const boss = bossFish();
  if (boss && boss.K.heat) { c.strokeStyle = `rgba(255,140,40,${0.25 + 0.1 * Math.sin(t * 6)})`; c.lineWidth = 3; c.setLineDash([10, 10]); c.beginPath(); c.arc(boss.x, boss.y, boss.r * 2.1, 0, TAU); c.stroke(); c.setLineDash([]); }
  const dipped = poi.state === 'dip';
  if (dipped && hud !== null) drawPaper(c, poi.x, poi.y, poi.r, 0.78);
  // 吸い込まれる獲物
  for (const s of sucked) { const u = s.t / 0.7, V2 = G.vortex; if (!V2) continue; const a = u * 8; drawCreature(c, s.f, lerp(s.x, V2.x, easeIn(u)), lerp(s.y, V2.y, easeIn(u)), s.f.ang + a, 1 - u * 0.9, 1 - u); }
  for (const f of fish) if (!f.K.boss) drawCreature(c, f, f.x, f.y, f.ang, f.spawn, f.spawn);
  if (boss) drawCreature(c, boss, boss.x, boss.y, boss.ang, boss.spawn, boss.spawn);
  // 重すぎる獲物には赤い輪（今の紙では持てない）。持てるようになった瞬間は金色に光る
  for (const f of fish) {
    if (f.spawn < 1) continue;
    const heavy = tooHeavy(f), rr2 = f.r * (f.K.draw === 'planet' || f.K.draw === 'sun' ? 0.7 : 0.62);
    if (heavy) {
      c.strokeStyle = `rgba(255,60,50,${0.55 + 0.25 * Math.sin(t * 5 + f.id)})`; c.lineWidth = 4; c.setLineDash([12, 8]);
      c.beginPath(); c.arc(f.x, f.y, rr2 + 8, t * 0.5, t * 0.5 + TAU); c.stroke(); c.setLineDash([]);
      // 錘の印
      const wx = f.x + rr2 * 0.7, wy = f.y - rr2 * 0.7;
      c.fillStyle = 'rgba(30,10,10,0.8)'; c.beginPath(); c.moveTo(wx - 9, wy + 9); c.lineTo(wx + 9, wy + 9); c.lineTo(wx + 6, wy - 4); c.lineTo(wx - 6, wy - 4); c.closePath(); c.fill();
      c.strokeStyle = '#ff6a5a'; c.lineWidth = 2.5; c.beginPath(); c.arc(wx, wy - 7, 4, 0, TAU); c.stroke();
    }
    if (tooBig(f)) {
      // 枠に入りきらない：外向きの矢印つきの橙の輪（ポイの大きさが要る）
      const ro = f.r * 0.62 + 22;
      c.strokeStyle = `rgba(255,170,40,${0.6 + 0.25 * Math.sin(t * 5 + f.id)})`; c.lineWidth = 4; c.setLineDash([6, 10]);
      c.beginPath(); c.arc(f.x, f.y, ro, -t * 0.4, -t * 0.4 + TAU); c.stroke(); c.setLineDash([]);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.6, x0 = f.x + Math.cos(a) * ro, y0 = f.y + Math.sin(a) * ro, x1 = f.x + Math.cos(a) * (ro + 18), y1 = f.y + Math.sin(a) * (ro + 18);
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.moveTo(x1 + Math.cos(a + 2.5) * 8, y1 + Math.sin(a + 2.5) * 8); c.lineTo(x1, y1); c.lineTo(x1 + Math.cos(a - 2.5) * 8, y1 + Math.sin(a - 2.5) * 8); c.stroke(); }
    } else if (f.K.boss && !heavy) {
      c.strokeStyle = `rgba(255,225,80,${0.55 + 0.3 * Math.sin(t * 6)})`; c.lineWidth = 5;
      c.beginPath(); c.arc(f.x, f.y, rr2 + 10, 0, TAU); c.stroke();
    }
    // 根を張った島：おさえている間、緑の輪が満ちる（満ちたら抜ける）
    if (f.K.root && f.hold > 0) {
      const u = clamp(f.hold / f.K.root, 0, 1);
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 9; c.beginPath(); c.arc(f.x, f.y, rr2 + 14, 0, TAU); c.stroke();
      c.strokeStyle = u >= 1 ? '#bfffcf' : '#5ee07a'; c.lineWidth = 7; c.beginPath(); c.arc(f.x, f.y, rr2 + 14, -Math.PI / 2, -Math.PI / 2 + u * TAU); c.stroke();
    }
    if (f.unlockFx > 0) { c.strokeStyle = `rgba(255,230,90,${f.unlockFx})`; c.lineWidth = 6; c.beginPath(); c.arc(f.x, f.y, rr2 + 8 + (1 - f.unlockFx) * 40, 0, TAU); c.stroke(); }
    if (f.danger && !f.K.boss) { c.fillStyle = 'rgba(255,255,255,0.8)'; const a = t * 9 + f.id; c.beginPath(); c.arc(f.x + Math.cos(a) * f.r * 0.5, f.y - f.r * 0.5 + Math.sin(a * 1.3) * 3, 3, 0, TAU); c.fill(); }
  }
  for (const s of shards) {
    const u = s.t / 0.9;
    c.save(); c.translate(s.x, s.y); c.rotate(s.rot * 0.3); c.scale(1 - u * 0.3, 1 - u * 0.3); c.globalAlpha = 1 - u;
    c.beginPath(); c.arc(0, 0, s.r * 0.95, s.a + (s.side > 0 ? 0 : Math.PI), s.a + (s.side > 0 ? Math.PI : TAU));
    const ca = Math.cos(s.a), sa = Math.sin(s.a);
    for (let i = s.jag.length - 1; i >= 0; i--) { const j = s.side > 0 ? s.jag[i] : s.jag[s.jag.length - 1 - i]; const px = j[0] * (s.side > 0 ? 1 : -1), py = j[1]; c.lineTo((px * ca - py * sa) * s.r * 0.95, (px * sa + py * ca) * s.r * 0.95); }
    c.closePath(); c.fillStyle = 'rgba(200,215,225,0.8)'; c.fill(); c.strokeStyle = 'rgba(90,100,110,0.6)'; c.lineWidth = 1.5; c.stroke();
    c.restore();
  }
  c.restore(); // 水の clip おわり

  // ポイ
  let px = poi.x, py = poi.y, pr = poi.r;
  if (poi.state === 'enter') { const u = easeOut(poi.enterT); px = lerp(W + 120, poi.x, u); py = lerp(H - 200, poi.y, u); }
  const rim = poi.over > 0 ? `rgb(${Math.round(lerp(214, 255, poi.over))},${Math.round(lerp(38, 30, poi.over))},${Math.round(lerp(31, 30, poi.over))})` : null;
  if (poi.state === 'torn') {
    const u = clamp(poi.tearT / 0.6, 0, 1);
    drawRing(c, px + u * 30, py + u * 50, pr * (1 - u * 0.1), 1 - u);
  } else if (dipped) {
    // 限界に近い：ポイが震え、縁の外に黄→赤の輪、紙にひびが走る（破れる前の合図）
    const st = poi.strain || 0;
    if (st > 0) {
      px += Math.sin(G.realT * 70) * 3 * st; py += Math.cos(G.realT * 63) * 2 * st;
      c.strokeStyle = `rgba(255,${Math.round(lerp(210, 60, st))},40,${0.55 + 0.35 * st})`; c.lineWidth = 6 + 6 * st;
      c.beginPath(); c.arc(px, py, pr + 10, 0, TAU); c.stroke();
      c.strokeStyle = `rgba(120,20,10,${0.35 + 0.5 * st})`; c.lineCap = 'round';
      for (let i = 0; i < poi.cracks.length && i < 1 + st * 5; i++) {
        const pts = poi.cracks[i]; c.lineWidth = 3;
        c.beginPath(); c.moveTo(px + pts[0][0] * pr, py + pts[0][1] * pr);
        for (let k2 = 1; k2 < pts.length; k2++) c.lineTo(px + pts[k2][0] * pr, py + pts[k2][1] * pr);
        c.stroke();
      }
    }
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3;
    c.beginPath(); c.arc(px, py, pr + 6 + Math.sin(G.realT * 12) * 2, 0, TAU); c.stroke();
    // 重すぎると縁が赤く脈打つ（このまま上げると破れる）
    if (poi.over > 0) { c.strokeStyle = `rgba(255,50,40,${poi.over * (0.5 + 0.5 * Math.sin(G.realT * 30))})`; c.lineWidth = 10; c.beginPath(); c.arc(px, py, pr + 14, 0, TAU); c.stroke(); }
    if (poi.heat > 0.05) { c.strokeStyle = `rgba(255,150,40,${poi.heat * 0.7})`; c.lineWidth = 8; c.beginPath(); c.arc(px, py, pr + 4, 0, TAU); c.stroke(); }
    drawRing(c, px, py, pr, 1, rim);
    drawWetGauge(c, px, py, pr);
  } else if (!G.clear && poi.state !== 'snap') {
    const lift = 1 + 0.06 * (1 - poi.sink), k = poi.squash, wob = Math.sin((1 - k) * 22) * k;
    const sx = 1 + 0.16 * wob, sy = 1 - 0.22 * wob;
    c.fillStyle = 'rgba(0,30,60,0.25)'; c.beginPath(); c.ellipse(px + 16, py + 26, pr * lift * sx, pr * lift * sy, 0, 0, TAU); c.fill();
    c.save(); c.translate(px, py); c.scale(sx, sy); c.translate(-px, -py);
    drawPaper(c, px, py, pr * lift, pr > 120 ? lerp(0.85, 0.5, clamp((pr - 120) / 120, 0, 1)) : 1);
    if (k > 0) { const g = c.createRadialGradient(px, py, 0, px, py, pr * 0.9); g.addColorStop(0, `rgba(30,80,120,${0.35 * k})`); g.addColorStop(1, 'rgba(30,80,120,0)'); c.fillStyle = g; c.beginPath(); c.arc(px, py, pr * 0.95, 0, TAU); c.fill(); }
    drawRing(c, px, py, pr * lift, 1);
    if (poi.glow > 0) { c.globalAlpha = poi.glow; c.lineWidth = 14; c.strokeStyle = '#fff6a0'; c.beginPath(); c.arc(px, py, pr * lift + 4, 0, TAU); c.stroke(); c.globalAlpha = 1; }
    c.restore();
  }
  for (const L of lifted) {
    const u = clamp(L.t / 0.15, 0, 1), jump = u * 30, f = L.f; f.phase += 0.9;
    c.fillStyle = 'rgba(0,35,75,0.25)'; drawShadow(c, f, poi.x + L.dx, poi.y + L.dy, f.ang, (1 + 0.35 * u) * 0.9);
    drawCreature(c, f, poi.x + L.dx, poi.y + L.dy - jump, f.ang + Math.sin(L.t * 40) * 0.25, 1 + 0.35 * u, 1);
  }
  c.save(); c.beginPath(); c.rect(-40, TUB.y - 6, W + 80, H); c.clip();
  for (const p of parts) {
    if (p.k === 'drop') { c.fillStyle = p.c; c.globalAlpha = 0.9; c.beginPath(); c.arc(p.x, p.y - p.z, p.s * (1 + p.z / 300), 0, TAU); c.fill(); }
    else if (p.k === 'shred') { c.save(); c.translate(p.x, p.y - p.z); c.rotate(p.rot); c.fillStyle = p.c; c.globalAlpha = 0.9; c.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); c.restore(); }
  }
  c.restore();
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'lighter';
  for (const p of parts) if (p.k === 'spark') {
    const u = p.t / p.life; c.globalAlpha = 1 - u; c.fillStyle = p.c;
    c.save(); c.translate(p.x, p.y); c.rotate(p.rot); const s = p.s * (1 - u * 0.5);
    c.beginPath(); c.moveTo(0, -s * 1.6); c.lineTo(s * 0.4, 0); c.lineTo(0, s * 1.6); c.lineTo(-s * 0.4, 0); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-s * 1.6, 0); c.lineTo(0, s * 0.4); c.lineTo(s * 1.6, 0); c.lineTo(0, -s * 0.4); c.closePath(); c.fill();
    c.restore();
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  if (!hud) return;
  for (const tx of texts) {
    const u = tx.t / tx.life, s = 0.6 + 0.4 * elastic(Math.min(1, tx.t * 4));
    c.save(); c.translate(tx.x, tx.y - u * 40); c.rotate(tx.rot); c.scale(s, s); c.globalAlpha = u > 0.75 ? (1 - u) / 0.25 : 1;
    text(c, tx.s, 0, 0, tx.size, tx.fill, tx.stroke, tx.size * 0.16);
    c.restore();
  }
  c.globalAlpha = 1;
  c.setTransform(1, 0, 0, 1, 0, 0);
  for (const p of flyers) {
    const u = p.t < 0.25 ? 0 : clamp((p.t - 0.25) / 0.4, 0, 1);
    const big = p.f.r > 90 ? 90 / p.f.r : 1, sc = (1.3 - 1.05 * u) * big;
    p.f.phase += 0.7;
    drawCreature(c, p.f, p.x, p.y, p.rot, sc, 1);
  }
  if (G.total) {
    const T = G.total, pop = elastic(Math.min(1, T.t * 5));
    const u = clamp((T.t - TOTAL_HOLD) / TOTAL_FLY, 0, 1), e = easeIn(u);
    const base = (84 + Math.min(56, Math.log10(T.target + 1) * 10)) * pop, size = base * (1 - 0.7 * e);
    c.save(); c.globalAlpha = u > 0.75 ? (1 - u) / 0.25 : 1;
    const s = '+' + fmt(T.target); c.font = '900 ' + base + 'px ' + FONT;
    const hw = c.measureText(s).width / 2 + base * 0.12, x0 = clamp(T.x, 24 + hw, W - 24 - hw);
    const x = lerp(x0, COUNTER.x - 130, e), y = lerp(T.y, COUNTER.y, e) - Math.sin(u * Math.PI) * 50;
    c.setTransform(1, 0, 0, 1, u > 0 ? 0 : G.shx, u > 0 ? 0 : G.shy);
    text(c, s, x, y, size, T.rescue ? '#9affc8' : '#ffe14a', T.rescue ? '#0a4a2a' : '#6a1a00', size * 0.17);
    c.restore();
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  drawHUD(c);
  drawShop(c);
  if (BOT || Q.get('hand') === '1') drawHand(c);
  else drawTutorial(c);
  for (const tp of taps) { const u = tp.t / 0.4; c.strokeStyle = `rgba(255,255,255,${1 - u})`; c.lineWidth = 4; c.beginPath(); c.arc(tp.x, tp.y, 10 + u * 50, 0, TAU); c.stroke(); }
  if (G.banner) drawBanner(c, G.banner);
  if (G.flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(0.85, G.flash)})`; c.fillRect(0, TUB.y - 8, W, SHOP_Y - TUB.y + 8); }
  if (G.caption) {
    const u = G.caption.t / G.caption.life, s = elastic(Math.min(1, G.caption.t * 4));
    c.save(); c.translate(W / 2, 270); c.scale(s, s); c.globalAlpha = u > 0.85 ? (1 - u) / 0.15 : 1;
    text(c, G.caption.s, 0, 0, 62, '#ffffff', '#111', 14);
    c.restore(); c.globalAlpha = 1;
  }
}

// はじめの案内：手がポイを持って、押して沈めて、離してすくう（すくうまで出す）
function drawTutorial(c) {
  if (G.scoops > 0 || G.k !== 0 || G.ng > 0 || poi.state === 'dip' || G.realT - G.lastInput < 2.5) return;
  const f = fish.filter(f => f.K.id === 'kingyo').sort((a, b) => Math.hypot(a.x - W / 2, a.y - 640) - Math.hypot(b.x - W / 2, b.y - 640))[0];
  if (!f) return;
  const cyc = (G.realT % 1.8) / 1.8, down = cyc > 0.35 && cyc < 0.75;
  const x = f.x, y = f.y;
  c.save(); c.globalAlpha = 0.55;
  if (down) { c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, poi.r * (cyc < 0.45 ? (cyc - 0.35) * 10 : 1), 0, TAU); c.stroke(); }
  c.restore();
  const hx = x + 40, hy = y + 60 + (down ? 8 : 0);
  c.save(); c.globalAlpha = 0.9; drawHandAt(c, hx, hy, -0.35, down ? 0.9 : 1); c.restore();
}
function drawHandAt(c, x, y, rot, s) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(8, 12, 34, 42, 0, 0, TAU); c.fill();
  c.fillStyle = '#ffd9bd'; c.strokeStyle = '#7a3f22'; c.lineWidth = 3.5; c.lineJoin = 'round';
  rr(c, -9, -64, 20, 56, 10); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-26, -14); c.quadraticCurveTo(-30, 36, 0, 42); c.quadraticCurveTo(30, 40, 30, 4);
  c.quadraticCurveTo(30, -18, 12, -16); c.lineTo(-14, -16); c.quadraticCurveTo(-26, -18, -26, -14); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(122,63,34,0.6)'; c.lineWidth = 2;
  for (const yy of [-4, 8, 20]) { c.beginPath(); c.moveTo(12, yy); c.lineTo(28, yy); c.stroke(); }
  c.fillStyle = '#ffffff'; c.globalAlpha *= 0.5; rr(c, -5, -60, 7, 18, 4); c.fill();
  c.restore();
}
function drawHand(c) {
  const inShop = (input.away || input.py >= SHOP_Y) && poi.state !== 'dip';
  if (inShop) { drawHandAt(c, input.px + 18, input.py + 34, -0.35, taps.some(t => t.t < 0.15) ? 0.9 : 1); return; }
  if (poi.state === 'torn' || poi.state === 'enter' || G.clear) return;
  const lift = poi.state === 'dip' ? 1 : 1.06, a = 0.95, L = Math.max(90, poi.r * lift * 1.7);
  drawHandAt(c, poi.x + Math.cos(a) * (poi.r * lift + L * 0.78), poi.y + Math.sin(a) * (poi.r * lift + L * 0.78), a - Math.PI / 2 - 0.5, 1);
}

function coinIcon(c, x, y, r) {
  c.fillStyle = '#b8860b'; c.beginPath(); c.arc(x, y + 2, r, 0, TAU); c.fill();
  const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, '#fff6b0'); g.addColorStop(0.5, '#ffd23a'); g.addColorStop(1, '#e09a10');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = '#9a6a08'; c.fillRect(x - r * 0.22, y - r * 0.22, r * 0.44, r * 0.44);
  c.strokeStyle = 'rgba(150,100,10,0.7)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r * 0.72, 0, TAU); c.stroke();
}
// 金魚の袋（すくった数）。中にキンちゃん
const BAG_FISH = { K: { draw: 'kingyo', r: 20 }, r: 20, var: 3, phase: 0, isKin: true, patches: [] };
function drawBag(c, x, y, r, glow) {
  const b = 1 + 0.12 * easeOut(G.bagBump);
  c.save(); c.translate(x, y); c.scale(b, b);
  if (glow > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = glow; c.drawImage(bokehSprite('rgba(120,220,255,A)'), -r * 2, -r * 2, r * 4, r * 4); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  // 袋
  c.fillStyle = 'rgba(200,235,255,0.22)'; c.strokeStyle = 'rgba(230,248,255,0.8)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-r * 0.35, -r * 0.95); c.quadraticCurveTo(-r * 1.05, -r * 0.1, -r * 0.8, r * 0.55); c.quadraticCurveTo(0, r * 1.15, r * 0.8, r * 0.55); c.quadraticCurveTo(r * 1.05, -r * 0.1, r * 0.35, -r * 0.95); c.closePath(); c.fill(); c.stroke();
  // 水
  c.save(); c.beginPath(); c.moveTo(-r * 0.92, -r * 0.05); c.quadraticCurveTo(0, -r * 0.15 + Math.sin(G.realT * 3) * 3, r * 0.92, -r * 0.05); c.lineTo(r * 0.8, r * 0.55); c.quadraticCurveTo(0, r * 1.15, -r * 0.8, r * 0.55); c.closePath();
  c.fillStyle = 'rgba(80,190,240,0.55)'; c.fill(); c.clip();
  if (G.kin) { BAG_FISH.phase = G.realT * 6; drawCreature(c, BAG_FISH, Math.sin(G.realT * 0.9) * r * 0.25, r * 0.35, Math.cos(G.realT * 0.9) > 0 ? 0 : Math.PI, 1, 1); }
  c.restore();
  // 口のひも
  c.strokeStyle = '#ff5a8a'; c.lineWidth = 4; c.beginPath(); c.moveTo(-r * 0.4, -r * 0.92); c.lineTo(r * 0.4, -r * 0.92); c.stroke();
  c.restore();
}
function drawHUD(c) {
  const g = c.createLinearGradient(0, 0, 0, 175);
  g.addColorStop(0, 'rgba(5,5,15,0.65)'); g.addColorStop(1, 'rgba(5,5,15,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, 175);
  // 袋と、すくった数。海で初めて渦から救うと「救った」に変わる
  const glow = G.trans && G.trans.from === 2 ? clamp((G.trans.t - 5.6) / 0.6, 0, 1) : 0;
  drawBag(c, BAG.x, BAG.y, BAG.r, glow);
  text(c, (G.rescued > 0 ? '救った ' : 'すくった ') + fmt(G.saved), 170, 82, 30, G.rescued > 0 ? '#9affc8' : '#ffffff', '#000', 6, 'left');
  text(c, (G.ng > 0 ? NIGHT[Math.min(G.ng, NIGHT.length - 1)] + '・ご縁×' + ngMul() + '  ' : '') + WD().label + (WD().scale ? '  ' + WD().scale : ''), 172, 116, 22, G.ng > 0 ? '#ffe28a' : '#c8d4ff', '#000', 4, 'left', '700');
  // コイン（右上）
  const bs = 1 + 0.4 * easeOut(G.bump);
  c.save(); c.translate(COUNTER.x, COUNTER.y); c.scale(bs, bs);
  const s = fmt(G.disp);
  c.font = '900 60px ' + FONT; const tw = c.measureText(s).width;
  coinIcon(c, -tw - 34, 0, 24);
  text(c, s, 0, 2, 60, '#ffe14a', '#3a1a04', 12, 'right');
  c.restore();
  // 紙のもち（濡れると減る）。沈めている間は、持っている重さの割合の印も出す
  const bx = 190, by = 144, bw = 510, bh = 22;
  const df = clamp(poi.state === 'torn' ? 0 : 1 - poi.wet, 0, 1);
  const shk = df < 0.25 && poi.state === 'dip' ? Math.sin(G.realT * 60) * 2 : 0;
  rr(c, bx + shk, by, bw, bh, 11); c.fillStyle = 'rgba(0,0,0,0.55)'; c.fill();
  const col = df > 0.5 ? '#5ee07a' : df > 0.25 ? '#ffd23a' : '#ff4a3a';
  if (df > 0) { rr(c, bx + 3 + shk, by + 3, Math.max(16, (bw - 6) * df), bh - 6, 8); c.fillStyle = col; c.fill(); }
  c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.5)'; rr(c, bx + shk, by, bw, bh, 11); c.stroke();
  text(c, '紙', bx - 18, by + bh / 2, 24, '#ffffff', '#000', 5);
}
// 店のボタンの板：縁日の屋台の札のような、金の縁と厚みのある立体の板。
// 買えるときは中がクリーム色に光り、買えないときは夜の紺で、たまった分だけ金色が下から満ちる。
const PLATE = {
  rimTop: '#ffd54a', rimBot: '#e07a00', lip: '#8a3f00',
  faceTop: '#ffef9a', faceBot: '#ffb21e',
  nightTop: '#2c2f5c', nightBot: '#171936', nightRim: '#b88a2e', nightLip: '#0b0c20',
};
function drawShopPlate(c, x, y, w, h, lit, fill) {
  const R = 24, IN = 6, LIP = 9;
  c.fillStyle = 'rgba(0,0,0,0.45)'; rr(c, x + 2, y + LIP + 6, w, h, R); c.fill();
  c.fillStyle = lit ? PLATE.lip : PLATE.nightLip; rr(c, x, y + LIP, w, h, R); c.fill();
  let g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, lit ? PLATE.rimTop : PLATE.nightRim); g.addColorStop(1, lit ? PLATE.rimBot : '#6a4c18');
  c.fillStyle = g; rr(c, x, y, w, h, R); c.fill();
  const fx = x + IN, fy = y + IN, fw = w - IN * 2, fh = h - IN * 2;
  g = c.createLinearGradient(0, fy, 0, fy + fh);
  g.addColorStop(0, lit ? PLATE.faceTop : PLATE.nightTop); g.addColorStop(1, lit ? PLATE.faceBot : PLATE.nightBot);
  c.fillStyle = g; rr(c, fx, fy, fw, fh, R - IN); c.fill();
  if (!lit && fill > 0) {
    c.save(); rr(c, fx, fy, fw, fh, R - IN); c.clip();
    const top = fy + fh * (1 - fill);
    // たまった分だけ、買えるときの金色が下から満ちる
    g = c.createLinearGradient(0, fy, 0, fy + fh);
    g.addColorStop(0, 'rgba(255,214,90,0.7)'); g.addColorStop(1, 'rgba(255,170,30,0.9)');
    c.fillStyle = g; c.fillRect(fx, top, fw, fh * fill);
    c.fillStyle = '#ffe58a'; c.fillRect(fx, top - 1.5, fw, 3);
    c.restore();
  }
  // 上半分のつや
  c.save(); rr(c, fx, fy, fw, fh, R - IN); c.clip();
  g = c.createLinearGradient(0, fy, 0, fy + fh * 0.45);
  g.addColorStop(0, lit ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; rr(c, fx + 4, fy + 3, fw - 8, fh * 0.45, R - IN - 2); c.fill();
  c.restore();
  c.lineWidth = 2; c.strokeStyle = lit ? 'rgba(255,255,240,0.9)' : 'rgba(255,220,140,0.35)'; rr(c, x + 1, y + 1, w - 2, h - 2, R - 1); c.stroke();
}
function drawShop(c) {
  const nu = nextUnlock(), nf = nextFit();
  for (let i = 0; i < 3; i++) {
    const b = btnRect(i), p = price(i), can = G.coins >= p, maxed = p === Infinity;
    const ps = 1 - press[i] * 0.5 + (can && !maxed ? 0.02 * Math.sin(G.realT * 6 + i) : 0);
    const dshk = deny[i] > 0 ? Math.sin(deny[i] * 60) * 6 : 0;
    // 板は押せる範囲より 10px 低く描き、下に厚み（影）を見せる
    const bh = b.h - 10;
    c.save(); c.translate(b.x + b.w / 2 + dshk, b.y + bh / 2); c.scale(ps, ps);
    const x = -b.w / 2, y = -bh / 2;
    if (i === 0 && G.thickHint > 0 && !maxed) {
      // 重さで破れた直後：紙の厚さのまわりに脈打つ光の輪
      const pulse = 0.5 + 0.5 * Math.sin(G.realT * 10);
      c.save(); c.globalAlpha = Math.min(1, G.thickHint) * (0.5 + 0.5 * pulse);
      c.lineWidth = 8; c.strokeStyle = '#fff27a'; c.shadowColor = '#ffd23a'; c.shadowBlur = 24;
      rr(c, x - 6, y - 6, b.w + 12, bh + 12, 30); c.stroke(); c.restore();
    }
    drawShopPlate(c, x, y, b.w, bh, can && !maxed, maxed ? 1 : clamp(G.coins / p, 0, 1));
    const ix = 0, iy = y + 46, ink = can && !maxed ? '#7a2a00' : '#ffd23a';
    if (i === 0) {
      // 紙の厚さ：重ねた紙と錘
      c.fillStyle = '#fafaf5'; c.strokeStyle = 'rgba(150,100,40,0.7)'; c.lineWidth = 2;
      for (let k = 2; k >= 0; k--) { c.globalAlpha = 1 - k * 0.25; c.beginPath(); c.ellipse(ix - 8 + k * 4, iy + 6 - k * 6, 26, 12, 0, 0, TAU); c.fill(); c.stroke(); }
      c.globalAlpha = 1; c.fillStyle = ink; c.beginPath(); c.moveTo(ix + 14, iy + 12); c.lineTo(ix + 40, iy + 12); c.lineTo(ix + 35, iy - 8); c.lineTo(ix + 19, iy - 8); c.closePath(); c.fill();
      c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.arc(ix + 27, iy - 13, 5, 0, TAU); c.stroke();
    } else if (i === 1) {
      c.fillStyle = '#fafaf5'; c.beginPath(); c.arc(ix, iy, 24, 0, TAU); c.fill(); c.lineWidth = 5; c.strokeStyle = '#d6261f'; c.stroke();
      c.strokeStyle = ink; c.lineWidth = 4;
      for (const a of [0.3, 2.3, 4.0]) { const cx = Math.cos(a), sy = Math.sin(a); c.beginPath(); c.moveTo(ix + cx * 30, iy + sy * 30); c.lineTo(ix + cx * 44, iy + sy * 44); c.stroke(); }
    } else {
      // 速乾：しずく と 風
      c.fillStyle = '#7fd0ff'; c.beginPath(); c.moveTo(ix - 10, iy - 26); c.quadraticCurveTo(ix + 8, iy - 2, ix - 10, iy + 16); c.quadraticCurveTo(ix - 28, iy - 2, ix - 10, iy - 26); c.fill();
      c.strokeStyle = ink; c.lineWidth = 4; c.lineCap = 'round';
      for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(ix + 6, iy - 14 + k * 13); c.quadraticCurveTo(ix + 26, iy - 20 + k * 13, ix + 38, iy - 10 + k * 13); c.stroke(); }
    }
    const tc = can && !maxed ? '#3a1404' : '#ffffff';
    text(c, UPG[i].name, 0, y + 96, 26, tc, can && !maxed ? null : '#1a1030', 5);
    // 下の行：何が変わるか
    let sub = maxed ? '最大' : 'Lv ' + (lvOf(i) + 1);
    if (!maxed && i === 0 && nu) sub = '→ ' + nu.name + 'が持てる';
    if (!maxed && i === 1 && nf) sub = '→ ' + nf.name + 'が入る';
    text(c, sub, 0, y + 123, sub.length > 7 ? 18 : 20, can && !maxed ? '#7a3a10' : ((i === 0 && nu) || (i === 1 && nf) ? '#ffd27a' : '#c8cff0'), can && !maxed ? null : '#1a1030', 4, 'center', '800');
    if (!maxed) {
      const ps2 = fmt(p); c.font = '900 32px ' + FONT; const w = c.measureText(ps2).width;
      coinIcon(c, -w / 2 - 14, y + 150, 13);
      text(c, ps2, 8, y + 151, 32, deny[i] > 0 ? '#ff4a3a' : can ? '#4a1e00' : '#ffd23a', can ? null : '#000', 6);
    }
    // おまけの札（値引き中）
    if (!maxed && omake() < 1) {
      c.save(); c.translate(x + b.w - 30, y + 14); c.rotate(0.18);
      c.fillStyle = '#e8262a'; rr(c, -46, -16, 92, 32, 10); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#fff3c0'; c.stroke();
      text(c, 'おまけ -' + Math.round((1 - omake()) * 100) + '%', 0, 1, 16, '#ffffff', null, 0, 'center', '900');
      c.restore();
    }
    if (boughtFx[i] > 0) { c.globalAlpha = boughtFx[i] / 0.6; c.fillStyle = '#ffffff'; rr(c, x, y, b.w, bh, 24); c.fill(); c.globalAlpha = 1; }
    c.restore();
  }
}
function drawBanner(c, b) {
  const t = b.t, u = t / b.life, inT = elastic(Math.min(1, t * 3)), out = u > 0.82 ? (1 - u) / 0.18 : 1, R0 = BANNER_RECT;
  c.save(); c.globalAlpha = out;
  c.translate(R0.x + R0.w / 2, R0.y + R0.h / 2); c.scale(inT, inT);
  c.fillStyle = '#d6261f'; rr(c, -R0.w / 2, -R0.h / 2, R0.w, R0.h, 26); c.fill();
  c.lineWidth = 7; c.strokeStyle = '#ffe14a'; c.stroke();
  text(c, b.s, 0, -2, b.s.length > 7 ? 58 : 66, '#ffffff', '#5a0a04', 10);
  c.restore(); c.globalAlpha = 1;
}

// ---------------------------------------------------------------- 世界の移り変わり：さっきまでの世界が、新しい世界のポイの中に小さく入る
// 地球（大陸の並び＝キンちゃんの模様と同じ。drawGoldfish の KIN_PATCH と同じ式で描く）
function drawEarth(c, x, y, er, glowPatch) {
  c.save(); c.translate(x, y);
  // 大気の光
  c.globalCompositeOperation = 'lighter'; c.globalAlpha *= 0.9;
  c.drawImage(bokehSprite('rgba(90,170,255,A)'), -er * 1.45, -er * 1.45, er * 2.9, er * 2.9);
  c.globalAlpha /= 0.9; c.globalCompositeOperation = 'source-over';
  c.beginPath(); c.arc(0, 0, er, 0, TAU); c.save(); c.clip();
  const gg = c.createRadialGradient(-er * 0.35, -er * 0.35, er * 0.1, 0, 0, er); gg.addColorStop(0, '#4fb0f0'); gg.addColorStop(0.7, '#1d62b8'); gg.addColorStop(1, '#0b2a6a');
  c.fillStyle = gg; c.fillRect(-er, -er, er * 2, er * 2);
  const R0 = er * 1.15;
  for (const p of KIN_PATCH) {
    c.fillStyle = '#5fae4a'; c.beginPath(); c.ellipse(p[0] * R0 * 1.6, p[1] * R0 * 1.2, p[2] * R0 * 1.5, p[2] * R0 * 1.1, 0.4, 0, TAU); c.fill();
    c.fillStyle = '#b89a5a'; c.beginPath(); c.ellipse(p[0] * R0 * 1.6 + p[2] * R0 * 0.2, p[1] * R0 * 1.2, p[2] * R0 * 0.7, p[2] * R0 * 0.45, 0.4, 0, TAU); c.fill();
    if (glowPatch > 0) { c.strokeStyle = `rgba(255,225,90,${glowPatch})`; c.lineWidth = Math.max(3, er * 0.025); c.beginPath(); c.ellipse(p[0] * R0 * 1.6, p[1] * R0 * 1.2, p[2] * R0 * 1.5 + 4, p[2] * R0 * 1.1 + 4, 0.4, 0, TAU); c.stroke(); }
  }
  // 雲
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.beginPath(); c.ellipse(-er * 0.25, -er * 0.62, er * 0.42, er * 0.07, 0.15, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(er * 0.35, er * 0.55, er * 0.3, er * 0.06, -0.2, 0, TAU); c.fill();
  // 夜の側
  const sh = c.createRadialGradient(-er * 0.5, -er * 0.5, er * 0.6, -er * 0.2, -er * 0.2, er * 1.6); sh.addColorStop(0, 'rgba(0,0,20,0)'); sh.addColorStop(1, 'rgba(0,0,20,0.7)');
  c.fillStyle = sh; c.fillRect(-er, -er, er * 2, er * 2);
  c.restore();
  c.strokeStyle = 'rgba(160,220,255,0.7)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, er, 0, TAU); c.stroke();
  c.restore();
}
// 地球 ⇄ キンちゃん の変身。s＝形（0 地球の丸 → 1 金魚）、col＝色（0 海と陸 → 1 キンちゃんの橙と白）
// 体の幅は地球の直径と同じ（r＝ER/0.58）。大陸はキンちゃんの模様と同じ式の並びで、位置と大きさを s で寄せる
function drawMorph(c, x, y, ER, s, col, t) {
  const r = ER / 0.58, ry = lerp(ER, 0.35 * r, s), wig = Math.sin(t * 7) * s;
  c.save(); c.translate(x, y); c.rotate(Math.sin(t * 2.2) * 0.05 * s);
  // 大気の光（地球のときだけ）
  if (s < 1) { c.globalCompositeOperation = 'lighter'; const a0 = c.globalAlpha; c.globalAlpha = a0 * 0.9 * (1 - s); c.drawImage(bokehSprite('rgba(90,170,255,A)'), -ER * 1.45, -ER * 1.45, ER * 2.9, ER * 2.9); c.globalAlpha = a0; c.globalCompositeOperation = 'source-over'; }
  // しっぽ・ひれ（金魚になるほど伸びる。色は地球の青 → キンちゃんの黄）
  if (s > 0) {
    const a0 = c.globalAlpha; c.globalAlpha = a0 * clamp(s * 1.4, 0, 1);
    const tcol = col > 0.5 ? 'rgba(255,220,120,0.85)' : 'rgba(110,190,255,0.8)';
    const rT = 0.62 * r; c.save(); c.translate(-0.5 * r + 0.42 * rT, 0); finTail(c, rT, wig, Math.sin(t * 7 - 0.9) * s, tcol, lerp(0.3, 1, s)); c.restore();
    c.fillStyle = tcol;
    for (const sg of [-1, 1]) { c.save(); c.translate(0.16 * r, sg * ry * 0.86); c.rotate(sg * (0.9 + wig * 0.35)); c.beginPath(); c.ellipse(-0.1 * r, 0, 0.2 * r * s, 0.08 * r, 0, 0, TAU); c.fill(); c.restore(); }
    c.globalAlpha = a0;
  }
  // 体（海）
  c.beginPath(); c.ellipse(0, 0, ER, ry, 0, 0, TAU); c.save(); c.clip();
  const gg = c.createRadialGradient(-ER * 0.35, -ry * 0.35, ER * 0.1, 0, 0, ER); gg.addColorStop(0, '#4fb0f0'); gg.addColorStop(0.7, '#1d62b8'); gg.addColorStop(1, '#0b2a6a');
  c.fillStyle = gg; c.fillRect(-ER, -ER, ER * 2, ER * 2);
  if (col > 0) { const a0 = c.globalAlpha; c.globalAlpha = a0 * col; c.fillStyle = '#ffb21a'; c.fillRect(-ER, -ER, ER * 2, ER * 2); c.globalAlpha = a0; }
  // 大陸 ＝ 模様（同じ並び）
  const R0 = ER * 1.15;
  for (const p of KIN_PATCH) {
    const px = lerp(p[0] * R0 * 1.6, p[0] * r * 1.6 - 0.06 * r, s), py = lerp(p[1] * R0 * 1.2, p[1] * r * 1.2, s);
    const rx = lerp(p[2] * R0 * 1.5, p[2] * r * 1.5, s), ry2 = lerp(p[2] * R0 * 1.1, p[2] * r * 1.1, s);
    c.fillStyle = '#5fae4a'; c.beginPath(); c.ellipse(px, py, rx, ry2, 0.4, 0, TAU); c.fill();
    if (col < 1) { const a0 = c.globalAlpha; c.globalAlpha = a0 * (1 - col); c.fillStyle = '#b89a5a'; c.beginPath(); c.ellipse(px + rx * 0.13, py, rx * 0.47, ry2 * 0.41, 0.4, 0, TAU); c.fill(); c.globalAlpha = a0; }
    if (col > 0) { const a0 = c.globalAlpha; c.globalAlpha = a0 * col; c.fillStyle = '#fff8e0'; c.beginPath(); c.ellipse(px, py, rx, ry2, 0.4, 0, TAU); c.fill(); c.globalAlpha = a0; }
  }
  // 雲（地球の色のときだけ）
  if (col < 1) { const a0 = c.globalAlpha; c.globalAlpha = a0 * (1 - col); c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); c.ellipse(-ER * 0.25, -ry * 0.62, ER * 0.42, ER * 0.07, 0.15, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(ER * 0.35, ry * 0.55, ER * 0.3, ER * 0.06, -0.2, 0, TAU); c.fill(); c.globalAlpha = a0; }
  // 夜の側（丸い地球のときだけ）
  if (s < 1) { const sh = c.createRadialGradient(-ER * 0.5, -ry * 0.5, ER * 0.6, -ER * 0.2, -ry * 0.2, ER * 1.6); sh.addColorStop(0, 'rgba(0,0,20,0)'); sh.addColorStop(1, `rgba(0,0,20,${0.7 * (1 - s)})`); c.fillStyle = sh; c.fillRect(-ER, -ER, ER * 2, ER * 2); }
  // 背のつや
  if (s > 0) { c.fillStyle = `rgba(255,240,190,${0.35 * s})`; c.beginPath(); c.ellipse(-0.04 * r, 0, 0.42 * r, 0.09 * r, 0, 0, TAU); c.fill(); }
  c.restore();
  c.strokeStyle = `rgba(160,220,255,${0.7 * (1 - s)})`; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, ER, ry, 0, 0, TAU); c.stroke();
  // 目（金魚になると開く）
  if (s > 0.3) { const ea = clamp((s - 0.3) / 0.4, 0, 1), ey = 0.17 * r * (ry / (0.35 * r)); c.fillStyle = '#1a0a08'; for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(0.36 * r, sg * ey, 0.045 * r, 0.045 * r * ea, 0, 0, TAU); c.fill(); } c.fillStyle = '#ffffff'; for (const sg of [-1, 1]) { c.beginPath(); c.arc(0.37 * r, sg * ey - 0.013 * r, 0.014 * r * ea, 0, TAU); c.fill(); } }
  c.restore();
}
// 大陸 → 星：縮んだ大陸が地球になり、大きく止まる。地球にしっぽと目が生えて金魚になり、色がキンちゃんになって袋へ帰る
function drawEarthTrans(c, t) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(OFF, 0, 0);
  const WX = WATER.x + WATER.w / 2, WY = WATER.y + WATER.h / 2, EY = WY - 30, ER = 200;
  const u = easeInOut(clamp((t - 0.2) / 1.4, 0, 1));          // 大陸の写しが丸く縮む
  const ea = clamp((t - 1.2) / 0.8, 0, 1);                       // 地球が見えてくる
  const s = easeInOut(clamp((t - 2.6) / 1.0, 0, 1));           // 地球 → 金魚の形
  const col = easeInOut(clamp((t - 4.7) / 0.5, 0, 1));         // 海と陸 → キンちゃんの色
  const fly = clamp((t - 5.6) / 0.9, 0, 1), fe = easeIn(fly);   // 袋へ
  const cx = lerp(WX + 50 * s, BAG.x, fe), cy = lerp(EY, BAG.y, fe), er = ER * (1 - 0.88 * fe);
  // まわりを暗く（地球に目が行くように）
  const dim = clamp((t - 1.0) / 0.6, 0, 1) * (1 - fe);
  if (dim > 0) { c.fillStyle = `rgba(2,4,14,${0.65 * dim})`; c.fillRect(0, 0, W, SHOP_Y); }
  if (fly < 1) {
    c.save();
    if (ea < 1) {
      const sc = lerp(1, (ER * 2) / WATER.w, u);
      c.save(); c.translate(lerp(WX, cx, u), lerp(WY, cy, u)); c.scale(sc, sc);
      const w = WATER.w, h = lerp(WATER.h, WATER.w, u), r = lerp(WATER.r, WATER.w / 2, u);
      rr(c, -w / 2, -h / 2, w, h, r); c.clip();
      c.drawImage(SNAP, -WX, -WY);
      c.restore();
    }
    if (ea > 0) { c.globalAlpha = ea; drawMorph(c, cx, cy, er, s, col, t); }
    c.restore();
  }
  if (t < 0.4) { c.fillStyle = `rgba(255,255,255,${0.8 * (1 - t / 0.4)})`; c.fillRect(0, TUB.y - 8, W, SHOP_Y - TUB.y + 8); }
}
function drawTrans(c, t) {
  if (G.trans.from === 2) { drawEarthTrans(c, t); return; }
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(OFF, 0, 0);
  const WX = WATER.x + WATER.w / 2, WY = WATER.y + WATER.h / 2;
  const u = easeInOut(clamp((t - 0.2) / 2.0, 0, 1));
  const toR = poi.r * 0.92, s = lerp(1, (toR * 2) / WATER.w, u);
  const fly = clamp((t - 2.7) / 0.8, 0, 1), fe = easeIn(fly);
  const cx = lerp(lerp(WX, poi.x, u), BAG.x, fe), cy = lerp(lerp(WY, poi.y, u), BAG.y, fe), sc = s * (1 - 0.8 * fe);
  // 新しいポイ（中に前の世界）
  if (fly < 1) {
    c.save(); c.globalAlpha = 1 - fe;
    c.translate(cx, cy); c.scale(sc, sc);
    const w = WATER.w, h = lerp(WATER.h, WATER.w, u), r = lerp(WATER.r, WATER.w / 2, u);
    rr(c, -w / 2, -h / 2, w, h, r); c.clip();
    c.drawImage(SNAP, -WX, -WY);
    c.restore();
    if (u > 0.5) {
      c.save(); c.globalAlpha = (u - 0.5) * 2 * (1 - fe);
      c.globalCompositeOperation = 'lighter';
      const a = c.createRadialGradient(cx, cy, toR * 0.9 * (1 - 0.8 * fe), cx, cy, toR * 1.3 * (1 - 0.8 * fe)); a.addColorStop(0, 'rgba(120,210,255,0.5)'); a.addColorStop(1, 'rgba(120,210,255,0)');
      c.fillStyle = a; c.beginPath(); c.arc(cx, cy, toR * 1.3, 0, TAU); c.fill();
      c.restore();
      if (fly <= 0) drawRing(c, poi.x, poi.y, poi.r, (u - 0.5) * 2);
    }
  }
  // 白く光るのは水槽と上の帯まで（ボタンは白く飛ばさない）
  if (t < 0.4) { c.fillStyle = `rgba(255,255,255,${0.8 * (1 - t / 0.4)})`; c.fillRect(0, 0, W, SHOP_Y); }
}

// ---------------------------------------------------------------- 終わり：宇宙を引くと、最初の縁日のたらいだった
function drawEnding(c, t) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#05060d'; c.fillRect(0, 0, W, H);
  const u = easeInOut(clamp(t / 2.8, 0, 1));
  const z = lerp(2.6, 1, u), WX = WATER.x + WATER.w / 2, WY = WATER.y + WATER.h / 2;
  c.save(); c.translate(WX, WY); c.scale(z, z); c.translate(-WX, -WY);
  c.drawImage(bgOf(0), 0, 0);
  rr(c, WATER.x, WATER.y, WATER.w, WATER.h, WATER.r); c.clip();
  c.globalAlpha = lerp(1, 0.8, u); c.drawImage(SNAP, 0, 0); c.globalAlpha = 1;
  // 宇宙の中を、金魚（＝惑星）が泳いでいる
  if (u > 0.6) {
    const a = (u - 0.6) / 0.4;
    for (let i = 0; i < 7; i++) {
      const f = ENDING_FISH[i]; f.phase = t * 4 + i;
      const x = WATER.x + 80 + ((i * 97 + t * (20 + i * 4)) % (WATER.w - 160)), y = WATER.y + 120 + (i * 131) % (WATER.h - 240);
      drawCreature(c, f, x, y, 0.3 * Math.sin(t + i), 1, a * 0.95);
    }
  }
  c.restore();
  // 花火
  c.globalCompositeOperation = 'lighter';
  for (const p of FIRE) { const k = 1 - p.t / p.life; c.globalAlpha = k; c.fillStyle = p.c; c.beginPath(); c.arc(p.x, p.y, 3 + k * 2, 0, TAU); c.fill(); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // 「すくう」 → 「救う」
  if (t > 4.2) {
    const a1 = clamp((t - 4.2) / 0.5, 0, 1), sw = clamp((t - 6.0) / 0.8, 0, 1);
    c.save(); c.globalAlpha = a1 * (1 - sw); text(c, 'すくう', W / 2, 560, 150, '#ffffff', '#1a0a30', 18); c.restore();
    c.save(); c.globalAlpha = a1 * sw; text(c, '救う', W / 2, 560, 170, '#fff4c0', '#5a1a00', 20); c.restore();
  }
  if (t > 7.4) {
    const a2 = clamp((t - 7.4) / 0.6, 0, 1);
    c.save(); c.globalAlpha = a2; text(c, '救った いのち ' + fmt(G.saved), W / 2, 720, 44, '#9affc8', '#000', 8); c.restore();
  }
  drawBag(c, BAG.x, BAG.y, BAG.r, clamp((t - 2.8) / 1, 0, 1) * 0.8);
  if (G.ending.offer) drawPerkCards(c, G.ending);
}
// 次の晩に持っていくお守りを 3 枚から選ぶ（店のボタンと同じ金の板）
function drawPerkCards(c, E) {
  const a = clamp((E.t - ENDING_LEN) / 0.5, 0, 1);
  c.save(); c.globalAlpha = a;
  text(c, '次の晩へ お守りを ひとつ', W / 2, 772, 34, '#ffffff', '#1a0a30', 7);
  E.offer.forEach((pi, i) => {
    const P = PERKS[pi], r = perkCardRect(i), picked = E.pick === i, dim = E.pick != null && !picked;
    const pop = picked ? 1 + 0.08 * Math.sin(clamp((E.t - E.pickT) / 0.5, 0, 1) * Math.PI) : 1;
    c.save(); c.translate(r.x + r.w / 2, r.y + r.h / 2 + (1 - a) * 40); c.scale(pop, pop);
    c.globalAlpha = a * (dim ? 0.35 : 1);
    const x = -r.w / 2, y = -r.h / 2;
    drawShopPlate(c, x, y, r.w, r.h, true, 1);
    drawOmamori(c, 0, y + 70, P.col, perkN(P.id));
    text(c, P.name, 0, y + 146, 30, '#3a1404', null, 0);
    text(c, P.desc[0], 0, y + 186, 19, '#7a3a10', null, 0, 'center', '800');
    text(c, P.desc[1], 0, y + 212, 19, '#7a3a10', null, 0, 'center', '800');
    c.restore();
  });
  c.restore();
}
// お守り袋：色の布・金のひも・白い札。持っている数を右上に小さく
function drawOmamori(c, x, y, col, owned) {
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,0.25)'; rr(c, -26, -34, 56, 76, 12); c.fill();
  c.fillStyle = col; rr(c, -28, -38, 56, 76, 12); c.fill();
  c.lineWidth = 3; c.strokeStyle = '#ffe58a'; rr(c, -22, -32, 44, 64, 9); c.stroke();
  c.fillStyle = '#fffaf0'; rr(c, -11, -20, 22, 36, 4); c.fill();
  c.strokeStyle = '#ffd23a'; c.lineWidth = 4; c.beginPath(); c.moveTo(-8, -38); c.quadraticCurveTo(0, -56, 8, -38); c.stroke();
  if (owned > 0) text(c, '×' + owned, 40, -32, 20, '#ffffff', '#5a1a00', 5);
  c.restore();
}
const ENDING_FISH = [0, 1, 2, 3, 0, 2, 3].map((v, i) => ({ K: { draw: i === 3 ? 'kin' : 'kingyo', r: 30 }, r: 30 + (i % 3) * 6, var: v, phase: 0, patches: [], isKin: i === 3 }));

// ---------------------------------------------------------------- セーブ（遊んでいる人だけ。版が変わったら初めから）
const SAVE_KEY = 'sukuu_save';
function save() {
  if (BOT || FIXED) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: VERSION, k: G.k, coins: G.coins, lv: G.lv, saved: G.saved, kin: G.kin, rescued: G.rescued, ng: G.ng, seen: G.seen, firstBuy: !!G.firstBuy, pondBuys: G.pondBuys || 0, dips: G.dips || 0, scoops: G.scoops, perks: G.perks || [] })); } catch (e) { }
}
function load() {
  if (BOT || FIXED) return false;
  try {
    if (Q.get('reset') === '1') { localStorage.removeItem(SAVE_KEY); return false; }
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!s || s.v !== VERSION) return false;
    Object.assign(G, { coins: s.coins, saved: s.saved, kin: s.kin, rescued: s.rescued, ng: s.ng || 0, seen: s.seen || {}, firstBuy: !!s.firstBuy, pondBuys: s.pondBuys || 0, dips: s.dips || 0, scoops: s.scoops || 0, perks: s.perks || [] });
    G.disp = G.coins;
    startWorld(s.k, true); G.lv = s.lv; poi.rT = poi.r = radOf(G.lv.s);
    return true;
  } catch (e) { return false; }
}

// ---------------------------------------------------------------- 始める
const qWorld = parseInt(Q.get('world') || '0', 10) || 0;
if (!load()) startWorld(clamp(qWorld, 0, WORLDS.length - 1), true);
setInterval(save, 4000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// ---------------------------------------------------------------- ループ
const FPS = { dts: [], work: [] };
window.__fpsStats = () => {
  const d = FPS.dts.slice(1); if (!d.length) return null;
  const sum = d.reduce((a, b) => a + b, 0), sorted = d.slice().sort((a, b) => a - b), wk = FPS.work.slice().sort((a, b) => a - b);
  return { frames: d.length, seconds: sum / 1000, fps: d.length / (sum / 1000), p50ms: sorted[Math.floor(d.length * 0.5)], p95ms: sorted[Math.floor(d.length * 0.95)], maxms: sorted[d.length - 1],
    work_p50ms: wk[Math.floor(wk.length * 0.5)], work_p95ms: wk[Math.floor(wk.length * 0.95)], fish: fish.length };
};
window.__fpsReset = () => { FPS.dts.length = 0; FPS.work.length = 0; };
window.__state = () => ({ t: G.realT, world: G.k, coins: G.coins, earned: G.earned, tier: G.k, lv: G.lv, fish: fish.length, scoops: G.scoops, tears: G.tears, saved: G.saved, rescued: G.rescued, poi: poi.state, ending: !!G.ending, cap: +cap().toFixed(2) });
window.__fishPos = () => fish.map(f => [f.x, f.y]);
window.__caption = (s, life) => { G.caption = { s, t: 0, life: life || 2 }; };
window.__step = dt => update(dt);
window.__render = () => render();
window.__debug = { G, poi, fish, buy, startWorld, WORLDS, BOTS, input };

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
