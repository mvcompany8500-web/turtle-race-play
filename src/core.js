'use strict';
// 터틀 레이스 — 공통: 화면(폰 가로 꽉 채움)·도구·그림 불러오기·저장·진동
// (일반 <script> 끼리는 맨 위 let/const 를 같이 쓴다. 순서: data → core → audio → art → play → meta → main)

// 화면 높이는 540 고정, 폭은 기기 비율대로 960~1280 (폰 가로 19.5:9 도 꽉 채움)
const H = 540, CEIL = 26, SEABED = H - 48;
let W = 960, K = 1, CSS_S = 1, SAFE = 0, PORTRAIT = false, LOWFX = false, DPR_CAP = 3;
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
const isTouch = matchMedia('(pointer: coarse)').matches;
function resize() {
  const vw = innerWidth, vh = innerHeight;
  PORTRAIT = isTouch && vh > vw * 1.05;
  W = PORTRAIT ? 960 : Math.round(Math.min(1280, Math.max(960, H * vw / vh)));
  const dpr = LOWFX ? 1 : Math.min(window.devicePixelRatio || 1, DPR_CAP); // 폰도 화면 그대로 선명하게(최대 3배) — 느리면 2배 → 1배로 내려감
  const s = Math.min(vw / W, vh / H);
  CSS_S = s;
  SAFE = isTouch && W > 1040 ? 34 : 0; // 노치(카메라 구멍) 쪽 여백
  cvs.style.width = Math.floor(W * s) + 'px';
  cvs.style.height = Math.floor(H * s) + 'px';
  cvs.width = Math.floor(W * s * dpr);
  cvs.height = Math.floor(H * s * dpr);
  K = cvs.width / W;
  try { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; } catch (e) { /* 무시 */ } // 그림을 줄일 때 곱게
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
resize();
const OX = () => (W - 960) / 2; // 메뉴 화면은 가운데 960 폭에 그린다

// ───────── 같이 쓰는 상태 ─────────
let state = 'title', G = null;
let freeze = 0, timeScale = 1, shake = 0, flash = 0, flashColor = '#fff', T = 0, endT = 0, hudPulse = 0, zoom = 1;
const fx = [], pops = [], bubbles = [], toasts = [];
let buttons = [], mouse = { x: -1, y: -1 }, stateT = 0, userActed = false;
const press = { key: null, down: false, sp: { v: 1, vel: 0 } }; // 버튼 누름: 0.96배로 들어가는 스프링

// ───────── 도구 ─────────
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (a) => a[(Math.random() * a.length) | 0];
const circ = (ax, ay, ar, bx, by, br) => (ax - bx) ** 2 + (ay - by) ** 2 < (ar + br) ** 2;
function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; }
function hash(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); }
function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; }
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// 디자인 키트(app.turtle-buff.com/design-kit.txt): 글꼴 Pretendard, 13px 미만 금지, 어두운 화면 색
const FONT = 'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const FT = FONT, FB = FONT;
const C = {
  blue: '#2E6BFF', blueD: '#4C82FF', deep: '#1240D6', soft: '#1B2A4D', bg: '#101012', gray: '#1B1C1F', sel: '#33353B',
  text: '#F2F3F5', sub: '#A0A6AF', mute: '#6B7280', line: '#2C2E33', yellow: '#FFD54A', ok: '#34C987', danger: '#FF5A66',
};
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches; // 기기의 「동작 줄이기」
// 실제 화면에서 13px 아래로 작아지지 않게 (폰 가로 화면은 논리 크기를 키운다)
const fs = (size) => Math.max(size, Math.min(13 / CSS_S, size * 1.45));
function text(s, x, y, size, color = '#fff', o = {}) {
  size = fs(Math.max(13, size));
  ctx.font = `${o.weight || (o.body ? 600 : 800)} ${size}px ${FONT}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  if (o.stroke !== false) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = o.lw || Math.max(2.5, size * 0.13);
    ctx.strokeStyle = o.stroke || 'rgba(16,16,18,.62)';
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}
function wrapText(s, maxW, size, body = true) {
  ctx.font = `${body ? 600 : 800} ${fs(size)}px ${FONT}`;
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) { // 한글은 낱말 중간에서 줄을 바꾸지 않는다
    const next = cur ? cur + ' ' + w : w;
    if (ctx.measureText(next).width > maxW && cur) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}
function rise(i) { // 등장: 아래에서 살짝 올라오며 차례로(한 칸에 50ms 늦게), 출렁임 없이
  if (REDUCE) return { dy: 0, a: 1 };
  const k = clamp((stateT - i * 0.05) / 0.32, 0, 1), e = 1 - Math.pow(1 - k, 3);
  return { dy: (1 - e) * 22, a: e };
}
function withRise(i, fn) { const r = rise(i); ctx.save(); ctx.globalAlpha *= r.a; ctx.translate(0, r.dy); fn(); ctx.restore(); }
function today(off = 0) { const d = new Date(Date.now() - off * 864e5); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

// ───────── 그림 (터틀메이커 앱 캐릭터·3D 이모지) ─────────
const IMG = {};
function load(key, src) { const im = new Image(); im.src = src; IMG[key] = im; return im; }
SKINS.forEach((s) => { load('skin_' + s.k, `assets/skins/${s.k}.webp`); load('skinf_' + s.k, `assets/skins_f/${s.k}.webp`); });
PETS.forEach((p) => load('pet_' + p.k, `assets/pets/${p.k}.webp`));
SPRITES.forEach((k) => load('spr_' + k, `assets/sprites/${k}.webp`));
['princess:princess.webp', 'egg:egg.png', 'comfort:comfort.png', 'cheer:cheer.png', 'hello:hello.png', 'side:side.webp', 'back:back.webp',
  'e_shield:emoji/shield.png', 'e_fire:emoji/fire.png', 'e_rocket:emoji/rocket.png', 'e_trophy:emoji/trophy.png', 'e_crown:emoji/crown.png',
  'e_sparkles:emoji/sparkles.png', 'e_gem:emoji/gem_stone.png', 'e_party:emoji/party_popper.png', 'e_target:emoji/bullseye.png',
  'e_medal:emoji/1st_place_medal.png', 'e_lock:emoji/locked.png', 'e_check:emoji/check_mark_button.png', 'e_gift:emoji/gift.webp',
  'e_snow:emoji/snowflake.png', 'e_potion:emoji/test_tube.png', 'e_bulb:emoji/light_bulb.png', 'e_key:emoji/key.png',
  'e_dex:emoji/magnifying_glass_tilted_left.png', 'e_books:emoji/books.png', 'e_bell:emoji/bell.png']
  .forEach((s) => { const [k, f] = s.split(':'); load(k, 'assets/' + f); });
const ready = (im) => im && im.complete && im.naturalWidth > 0;
const silCache = {};
function silhouette(key, color) {
  const id = key + color;
  if (silCache[id]) return silCache[id];
  const im = IMG[key];
  if (!ready(im)) return null;
  const c = document.createElement('canvas');
  c.width = im.naturalWidth; c.height = im.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return (silCache[id] = c);
}
// 옆모습 그림의 파란 모자만 다른 색으로 (http 로 열었을 때만 — 파일로 열면 원래 색)
const capCache = {};
function capVariant(color) {
  if (!color) return IMG.side;
  if (capCache[color] !== undefined) return capCache[color] || IMG.side;
  if (!ready(IMG.side)) return IMG.side;
  try {
    const im = IMG.side, c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data, [tr, tg, tb] = rgb(color);
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], gg = p[i + 1], b = p[i + 2];
      if (b > r + 45 && b > gg + 25) {
        const lum = (r * 0.3 + gg * 0.59 + b * 0.11) / 110;
        p[i] = clamp(tr * lum, 0, 255); p[i + 1] = clamp(tg * lum, 0, 255); p[i + 2] = clamp(tb * lum, 0, 255);
      }
    }
    g.putImageData(d, 0, 0);
    return (capCache[color] = c);
  } catch (e) { capCache[color] = null; return IMG.side; }
}
// 앱(turtle-app/app/src/constants/motion.ts) 움직임 값 그대로: 스프링 mass 1 · stiffness 220 · damping 20
const SPRING = { mass: 1, stiffness: 220, damping: 20 }, SPRING_SNAPPY = { mass: 1, stiffness: 380, damping: 22 };
function springStep(sp, target, dt, cfg = SPRING) {
  const n = Math.ceil(dt / 0.004), h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = (-cfg.stiffness * (sp.v - target) - cfg.damping * sp.vel) / cfg.mass;
    sp.vel += a * h; sp.v += sp.vel * h;
  }
  return sp.v;
}
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
function drawImg(im, x, y, h, rot = 0, alpha = 1, flip = false) {
  if (!im || !(im.width || im.naturalWidth) || (im instanceof HTMLImageElement && !ready(im))) return false;
  const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
  const w = h * iw / ih;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  if (flip) ctx.scale(-1, 1);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}

// ───────── 저장 ─────────
const SAVE_KEY = 'turtle-race-v1';
const save = (() => {
  const d = {
    eggs: 0, unlocked: 1, best: {}, stars: {}, crown: {}, up: { slow: 0, boost: 0, shield: 0, magnet: 0, fire: 0, power: 0 },
    skins: ['basic'], skin: 'basic', face: 'basic', pets: [], pet: null, petLv: {}, cleared: false,
    muted: false, musicOff: false, sfxOff: false, haptics: true, runs: 0, diff: 1, world: 1,
    introSeen: false, missions: [], giftAt: 0, streak: { day: 0, last: '' }, endlessBest: 0, dex: {}, chests: 0,
    ctrl: 'run', xp: 0, lv: 1, tutRun: false, letters: {},
  };
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s) return Object.assign(d, s, { up: Object.assign(d.up, s.up || {}), streak: Object.assign(d.streak, s.streak || {}) });
  } catch (e) { /* 저장 못 읽어도 새로 시작 */ }
  return d;
})();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 개인 창 등 */ } }
const endlessOpen = () => save.unlocked >= 6;
const petIs = (k) => save.pet === k;
const petLv = (k = save.pet) => (k ? save.petLv[k] || 1 : 0);
const upCost = (u) => (save.up[u.k] >= u.max ? null : u.cost[save.up[u.k]]);
const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);
function cheapestNext() {
  let m = Infinity;
  UPS.forEach((u) => { const c = upCost(u); if (c != null) m = Math.min(m, c); });
  SKINS.forEach((s) => { if (!save.skins.includes(s.k)) m = Math.min(m, s.cost); });
  if (save.pets.length < PETS.length) m = Math.min(m, hatchCost());
  return m;
}

// ───────── 진동 (안드로이드: vibrate, 아이폰 사파리: 숨긴 스위치 토글 방식) ─────────
const haptic = (() => {
  let lbl = null;
  if (!navigator.vibrate && isTouch) {
    try {
      const i = document.createElement('input');
      i.type = 'checkbox'; i.setAttribute('switch', ''); i.id = 'haptic-switch';
      i.style.cssText = 'position:absolute;left:-9999px;opacity:0;pointer-events:none';
      const l = document.createElement('label');
      l.htmlFor = 'haptic-switch'; l.style.cssText = i.style.cssText;
      document.body.append(i, l); lbl = l;
    } catch (e) { /* 지원 안 하면 조용히 */ }
  }
  let last = 0; const recent = [];
  return (p) => {
    if (!save.haptics || !userActed) return; // 처음 누르기 전에는 브라우저가 막는다
    // 너무 잦은 떨림 막기: 70ms 안에 또는 1초에 4번 넘게는 건너뜀(배터리·피로)
    const now = performance.now(); if (now - last < 70) return;
    while (recent.length && now - recent[0] > 1000) recent.shift();
    if (recent.length >= 4) return;
    last = now; recent.push(now);
    try { if (navigator.vibrate) navigator.vibrate(p); else if (lbl) lbl.click(); } catch (e) { /* 무시 */ }
  };
})();
function toast(s, color = '#ffffff') { toasts.push({ s, color, t: 2.8 }); }
