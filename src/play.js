'use strict';
// 터틀 레이스 — 한 판: 바다·적·보스·알·피버·아이템·상성·펫·산호 쉼터·이어하기·별

const HERO_H = 112, ES = 1.2; // 큼직하게: 주인공 키, 적 크기 배율
let cutin = null; // 화면을 가로지르는 컷인(질주·큰 적 등장·마무리)
function startCutin(kind, title, sub, dur = 0.85) {
  if (REDUCE) return;
  cutin = { kind, title, sub, t: 0, dur };
  freeze = Math.max(freeze, dur * 0.85);
}
const isDark = (n) => n !== ENDLESS && !!STAGES[n].dark;
function levelCfg(n) {
  const D = DIFFS[save.diff];
  const slow = (1 - save.up.slow * 0.07) * (petIs('snail') ? 1 - petLv() * 0.02 : 1);
  const boostMul = (1 + save.up.boost * 0.3) * (petIs('cat') ? 1 + petLv() * 0.05 : 1);
  if (n === ENDLESS) return { n, endless: true, speed: (runMode() ? 400 : 330) * slow * D.speed, pool: ENEMY_KEYS.filter((k) => !ENEMIES[k].darkOnly), length: Infinity, gap: 0.9 * D.gap, boostRate: 12 * boostMul, boss: null, dark: false, D };
  const st = STAGES[n], pool = [];
  for (const k of ENEMY_KEYS) {
    const e = ENEMIES[k];
    if (e.intro <= n && (!e.darkOnly || st.dark)) { pool.push(k); if (st.fresh === k) pool.push(k, k, k); }
  }
  // 점프 달리기: 처음 480 → 50번 바다 330 (타이밍을 맞출 수 있는 빠르기) / 자유 헤엄: 600 → 220
  const speed = (runMode() ? Math.max(330, 480 - (n - 1) * 3) : Math.max(220, 600 - (n - 1) * 8)) * slow * D.speed;
  return { n, speed, pool, endless: false, length: speed * (46 + n * 0.6), gap: Math.max(0.34, 1.1 - n * 0.015) * D.gap, boostRate: (5 + n * 0.35) * boostMul, boss: st.boss || null, dark: !!st.dark, D };
}
const stageMusic = (n) => (n === ENDLESS ? 'w3' : worldOf(n).music);
const boostDur = () => 3.2 + (petIs('penguin') ? petLv() * 0.3 : 0);
const itemPool = (n) => ITEM_KEYS.filter((k) => (n === ENDLESS || ITEMS[k].from <= n) && (!ITEMS[k].run || (G && G.run)));
const nameOf = (n) => (n === ENDLESS ? '끝없는 바다' : `${n}번 바다`);

function startLevel(n) {
  const cfg = levelCfg(n);
  G = {
    n, cfg, D: cfg.D, dist: 0, t: 0, eggs: 0, combo: 0, comboT: 0,
    boost: n === ENDLESS ? 30 : Math.min(60, (n - 1) * 3), boosting: 0,
    shield: save.up.shield + (petIs('whale') ? (petLv() >= 4 ? 2 : 1) : 0) + (save.helpShield === n ? 1 : 0), helped: save.helpShield === n, // 같은 바다 2번 연속 실패 → 공짜 방패 하나
    enemies: [], eggsArr: [], shots: [], warns: [], inks: [], boxes: [], sweeps: [], hazards: [], spCD: 4,
    bullets: [], fireT: 0.5, breaks: [], brkT: 5, shotKills: 0, darkT: 0, grabT: 0,
    spawnT: 1.8, eggT: 0.9, boxT: 4, boss: null, bossDone: !cfg.boss, bossWarnT: null, goal: null,
    p: { x: -90, y: H / 2, vx: 0, vy: 0, tx: null, ty: null, r: 23, inv: 1.2, dead: false, rot: 0, trail: [],
         ph: 0, blinkT: 2, face: 'normal', faceT: 0, scared: false, wakeT: 0, flip: 0, scale: 1 },
    pet: save.pet ? { x: -150, y: H / 2 - 50, t: 0, zapT: 3 } : null,
    enterT: 0.8, won: false, winT: 0,
    kills: 0, near: 0, perfect: 0, weak: 0, intro: 4.4, banked: false, deathT: 0, deadT: 0,
    score: 0, scoreShow: 0, eggsSpawned: 0, eggsGot: 0, hits: 0, revives: 0, freeRevive: false, fever: 0, feverT: 0, feverEggT: 0, sprout: 0, starShown: 0,
    item: null, itemPop: 0, eff: { magnet: 0, giant: 0, freeze: 0, lamp: 0, whirl: 0, double: 0, rain: 0, rocket: 0 }, jellySafe: 0,
    slowMul: 1, blessDone: cfg.boss != null, nextBless: 1500, bless: null, chain: 0, chainT: 0, chainBest: 0, feverEggs: 0, zoomAt: null,
  };
  G.run = false;
  runSeq++; taunt = null; cine = null; hitNums.length = 0; shards.length = 0; hitStars.length = 0;
  Object.assign(G, { rxp: 0, rlv: 1, ab: {}, beatCombo: 0, beatBest: 0, beats: 0, lvPending: 0, blessKind: null });
  if (runMode()) { runInit(); G.blessDone = true; } // 점프 달리기는 산호 쉼터 대신 판 안 레벨업
  fx.length = 0; pops.length = 0;
  freeze = 0; timeScale = 1; shake = 0; flash = 0; zoom = 1;
  setMusic(stageMusic(n)); musicFever = false;
  state = 'play';
  save.runs++;
  track('runs');
}
function progress() {
  if (!G || G.cfg.endless) return 0;
  const d = clamp(G.dist / G.cfg.length, 0, 1);
  if (!G.cfg.boss) return Math.min(d, 0.99);
  const b = G.bossDone ? 1 : G.boss ? 1 - G.boss.hp / G.boss.maxHp : 0;
  return Math.min(d * 0.8 + b * 0.2, 0.99);
}
const meters = () => Math.floor(G.dist / 40);
// 알 장부: 어디서 몇 개 벌었나(실험실·밸런스용)
const hasTr = (k) => (save.trEq || []).includes(k); // 끼운 보물
function earn(k, v) { if (G.run && ['egg', 'gold', 'drop', 'rain'].includes(k)) v = Math.round(v * (1 + abStar('gold') * 0.15) * (hasTr('wallet') ? 1.1 : 1)); G.eggs += v; G.ledger = G.ledger || {}; G.ledger[k] = (G.ledger[k] || 0) + v; }
function bank(cleared) {
  if (G.banked) return;
  G.banked = true;
  if (cleared) { G.clearBonus = 8 + Math.floor((G.n === ENDLESS ? 0 : G.n) * 0.6); earn('clear', G.clearBonus); } // 도착 보너스: 뒤 바다일수록 조금 더
  G.settle = [];
  save.bestScore = save.bestScore || {}; G.score = Math.round(G.score); G.prevBestScore = save.bestScore[G.n] || 0; G.newBestScore = G.score > G.prevBestScore && G.prevBestScore > 0; if (G.score > G.prevBestScore) save.bestScore[G.n] = G.score;
  if (save.helpShield === G.n) save.helpShield = null; // 도움 방패는 한 판만
  if (G.n !== ENDLESS) { // 막힌 사람 돕기: 같은 바다 연속 실패 수
    save.failRow = save.failRow || {};
    if (cleared) delete save.failRow[G.n];
    else if (progress() >= 0.05 || G.t > 8) { save.failRow[G.n] = (save.failRow[G.n] || 0) + 1; if (save.failRow[G.n] >= 2) { save.helpShield = G.n; G.helpNext = true; } }
  }
  if (cleared && G.run) { const pc = Math.round((Math.max(0, G.en) / G.maxEn) * 100), v = Math.min(20, Math.round(G.en / 5)); if (v) { earn('settle', v); G.settle.push({ s: `남은 기운 ${pc}%`, v }); } if (G.beatBest >= 5) { earn('settle', 5); G.settle.push({ s: `박자 최고 ${G.beatBest}연속`, v: 5 }); } if (G.stomps) { const v = Math.min(10, G.stomps); earn('settle', v); G.settle.push({ s: `밟기 ${G.stomps}번`, v }); } } // 끝나면 하나씩 반짝이며 더해짐
  G.diffBonus = Math.round(G.eggs * (G.D.eggs - 1));
  G.eggs = Math.max(0, G.eggs + G.diffBonus);
  save.eggs += G.eggs;
  track('eggsRun', 0, G.eggs);
  if (G.cfg.endless) {
    G.prog = meters(); G.prevBest = save.endlessBest; G.newBest = G.prog > save.endlessBest;
    if (G.newBest) save.endlessBest = G.prog;
  } else {
    G.prog = cleared ? 100 : Math.floor(progress() * 100);
    G.prevBest = save.best[G.n] || 0;
    save.lastProg = save.lastProg || {}; G.lastProg = save.lastProg[G.n]; save.lastProg[G.n] = G.prog; // 「지난번 → 이번」
    G.newBest = G.prog > G.prevBest;
    if (G.newBest) save.best[G.n] = G.prog;
  }
  if (cleared) {
    G.starGot = [true, G.eggsGot >= Math.ceil(G.eggsSpawned * 0.7), G.hits === 0];
    save.stars[G.n] = Math.max(save.stars[G.n] || 0, G.starGot.filter(Boolean).length);
    if (save.diff === 2) save.crown[G.n] = true;
    if (G.n < LAST && save.unlocked < G.n + 1) { save.unlocked = G.n + 1; G.newUnlock = true; }
    track('clear');
  }
  // 거북 레벨: 모은 알·물리친 적·밟기·성공·별·기록 돌파로 경험치
  const stars = cleared ? G.starGot.filter(Boolean).length : 0;
  G.xpGain = Math.max(5, Math.round(G.eggsGot + (G.pearls || 0) * 0.2 + G.kills * 3 + (G.stomps || 0) * 2 + (cleared ? 40 + stars * 15 + (G.cfg.boss ? 60 : 0) : progress() * 30) + (G.recordBroke ? 20 : 0)));
  G.lvUps = [];
  save.xp += G.xpGain;
  while (save.xp >= xpNeed(save.lv)) { save.xp -= xpNeed(save.lv); save.lv++; G.lvUps.push(save.lv); }
  G.letterShow = cleared && PRINCESS_LETTERS[G.n] && !save.letters[G.n] ? { shown: 0 } : null;
  if (cleared && G.n === 1 && G.run) save.tutRun = true;
  appEggs(cleared); // 앱 거북알(하루 3판·5~15개)
  storeAfterRun();
  persist();
}

// ───────── 효과 ─────────
function burst(x, y, color, n, spd = 380) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = rand(spd * 0.2, spd), life = rand(0.3, 0.75);
    fx.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: rand(2, 5.5), color });
  }
}
function ring(x, y, color, maxR = 90, life = 0.45, lw = 6) { fx.push({ k: 'ring', x, y, r: 6, maxR, life, max: life, color, lw }); }
const popSeen = new Map();
function pop(x, y, s, color = '#fff', size = 24, big = false) {
  if (T - (popSeen.get(s) ?? -9) < 0.4) return; popSeen.set(s, T); if (popSeen.size > 60) popSeen.clear();
  if (!big && state === 'play') { y = Math.max(y, 150); x = clamp(x, 110 + SAFE, W - 110 - SAFE); } // 위 HUD(게이지·글자)와 안 겹치게
  // 이미 떠 있는 글자와 겹치면 아래로 한 줄씩 비킴(최대 4번)
  const hw = (t) => String(t.s).length * fs(t.size) * 0.5;
  for (let k = 0; k < 4; k++) {
    const hit = pops.find((q) => q.life > 0.25 && Math.abs(q.x - x) < hw(q) + String(s).length * fs(size) * 0.5 && Math.abs(q.y - y) < (fs(q.size) + fs(size)) * 0.6);
    if (!hit) break;
    y = hit.y + (fs(hit.size) + fs(size)) * 0.62;
  }
  pops.push({ x, y, s, color, size, life: big ? 1.4 : 0.9, max: big ? 1.4 : 0.9, big }); }
function confetti(n = 70) {
  for (let i = 0; i < n; i++) fx.push({ k: 'confetti', x: rand(0, W), y: rand(-220, -10), vx: rand(-40, 40), vy: rand(120, 260), life: 3.2, max: 3.2, size: rand(4, 9), color: pick(['#ffd34d', '#ff6fa8', '#7cf0ff', '#8dff7a', '#b48bff']), rot: rand(0, 6) });
}
// 한 점에서 위로 부채꼴로 터진 뒤 중력으로 떨어지는 색종이 (lucian-uxui #093, MIT) — 사기·성공 등 「바로 그 자리」 축하
function confettiBurst(x, y, n = 50) {
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9, v = rand(380, 800); fx.push({ k: 'confetti', burst: true, x: x + rand(-20, 20), y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(1.6, 2.5), max: 2.5, size: rand(6, 11), color: pick(['#ffd34d', '#ff6fa8', '#7cf0ff', '#8dff7a', '#b48bff', '#3d8bff']), rot: rand(0, 6), vr: rand(-7, 7), ph: rand(0, 6) }); }
}
// 체크·구매 순간 둘레로 작은 점 8개가 톡 (lucian-uxui #093 pop, MIT)
function popDots(x, y, d = 30) {
  const cols = ['#22C3A6', '#ffd34d', '#ff6fa8', '#7b61ff', '#3d8bff', '#8dff7a'];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.3, dd = d + Math.random() * 8; fx.push({ k: 'dot', x, y, tx: Math.cos(a) * dd, ty: Math.sin(a) * dd, life: 0.52, max: 0.52, color: cols[i % cols.length] }); }
}
function fountain(x, y, n) { for (let i = 0; i < Math.min(n, 16); i++) fx.push({ k: 'eggfly', sx: x + rand(-30, 30), sy: y + rand(-20, 20), life: 0.6 + i * 0.05, max: 0.6 }); }
const zoomTo = (v) => { zoom = Math.max(zoom, v); };
function updateFx(dt) {
  for (const f of fx) {
    f.life -= dt;
    if (f.k === 'ring') f.r = lerp(f.r, f.maxR, dt * 9);
    else if (f.k === 'eggfly') { if (f.life <= 0) { hudPulse = 0.18; snd('count', 0.35, rand(0.95, 1.15), 0.06); } }
    else if (f.k === 'laser' || f.k === 'dot') { /* 그대로 */ }
    else {
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.k === 'confetti' && f.burst) { f.vy += 900 * dt; f.vx *= Math.pow(0.985, dt * 60); f.vy *= Math.pow(0.985, dt * 60); f.rot += f.vr * dt; }
      else if (f.k === 'confetti') { f.rot += dt * 6; f.vx += Math.sin(T * 3 + f.y * 0.02) * 30 * dt; }
      else { f.vx *= 1 - dt * 3; f.vy *= 1 - dt * 3; }
      if (f.k === 'flame') f.vy -= 60 * dt;
      if (f.k === 'chunk') { f.vy += 900 * dt; f.rot += f.vr * dt; f.vx *= 1 + dt * 2.2; f.vy *= 1 + dt * 2.2; }
      if (f.k === 'bub') f.vy -= 90 * dt;
    }
  }
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].life <= 0) fx.splice(i, 1);
  for (const p of pops) { p.life -= dt; p.y -= (p.big ? 14 : 40) * dt; }
  for (let i = pops.length - 1; i >= 0; i--) if (pops[i].life <= 0) pops.splice(i, 1);
}
function updateBubbles(dt, scroll) {
  if (bubbles.length < 40 && Math.random() < dt * 14) bubbles.push({ x: rand(0, W + 100), y: H + 10, r: rand(1.5, 5), vy: rand(30, 80), ph: rand(0, 6) });
  for (const b of bubbles) { b.y -= b.vy * dt; b.x -= scroll * 0.25 * dt; b.ph += dt * 2; }
  for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].y < -10 || bubbles[i].x < -20) bubbles.splice(i, 1);
}

// ───────── 도감 ─────────
function dexSee(type) { if (!save.dex[type]) save.dex[type] = { kills: 0, weak: false }; }
function dexKill(type) {
  dexSee(type);
  const d = save.dex[type];
  if (d.kills++ === 0 && G) { earn('dex', 10); toast(`도감 등록! ${ENEMIES[type].name} · 진주 +10`, C.ok); sfx.mission(); }
}

// ───────── 적 ─────────
// 등장 모습(그리기만 움직임): drop 위에서 쿵 · rise 모래에서 쑥 · pop 뽕 커짐 · swoop 오른쪽 위에서 사선으로
function entOff(e) {
  const o = { dx: 0, dy: 0, sx: 1, sy: 1, a: 1, rot: 0 }; if (!e.ent) return o;
  const t = e.ent.t; if (t < 0) { o.a = 0; return o; }
  const k = Math.min(1, t / 0.38), ob = easeOutBack(k), out = 1 - Math.pow(1 - k, 3);
  if (e.ent.k === 'drop') { o.dy = -(1 - k * k) * 420; if (t > 0.38) { const q = Math.min(1, (t - 0.38) / 0.2); o.sy = 1 - 0.28 * Math.sin(q * Math.PI); o.sx = 1 + 0.22 * Math.sin(q * Math.PI); } }
  else if (e.ent.k === 'rise') { o.dy = (1 - ob) * 80; o.a = Math.min(1, k * 2.5); o.sy = 0.7 + 0.3 * ob; }
  else if (e.ent.k === 'pop') { o.sx = o.sy = Math.max(0.01, ob); }
  else if (e.ent.k === 'swoop') { o.dx = (1 - out) * 180; o.dy = -(1 - out) * 200; o.rot = -(1 - out) * 0.6; o.a = Math.min(1, k * 3); }
  return o;
}
function addEnemy(e) {
  const base = (ENEMIES[e.type] || {}).hp || 2;
  e.hp = e.maxHp = base * (e.elite ? 2 : 1) * (G.n > 30 ? 1.5 : 1);
  e.hitT = 0;
  if (G.run && typeof styleOf === 'function' && !G.tut) { const en = styleOf().enter; if (en) e.ent = { k: en === 'rise' && e.y < GROUND - 100 ? 'drop' : en, t: -1 }; } // 판마다 다른 등장
  G.enemies.push(e);
  return e;
}
function spawnEnemy(type) {
  const p = G.p, y = rand(CEIL + 50, SEABED - 50);
  const elite = Math.random() < G.D.elite + (G.n !== ENDLESS && G.n > 20 ? 0.05 : 0);
  const base = { type, t: 0, ph: rand(0, 6), elite };
  let e = null;
  switch (type) {
    case 'jelly': e = { x: W + 40, y, baseY: y, r: 19, amp: rand(30, 75), vx: -20 }; break;
    case 'urchin': { const top = Math.random() < 0.35; e = { x: W + 40, y: top ? CEIL + 26 : SEABED - 18, r: 20, vx: 0, top }; break; }
    case 'shark': G.warns.push({ kind: 'shark', y: clamp(p.y + rand(-50, 50), CEIL + 40, SEABED - 40), t: 0.85, max: 0.85, elite }); sfx.warn(); return;
    case 'eel': G.warns.push({ kind: 'eel', y: clamp(p.y + rand(-30, 30), CEIL + 40, SEABED - 40), t: 1.05, max: 1.05, elite }); sfx.warn(); return;
    case 'puffer': e = { x: W + 40, y, r: 15, vx: -30 }; break;
    case 'octopus': e = { x: W + 40, y, baseY: y, r: 22, vx: -24, inkT: rand(0.8, 1.6) }; break;
    case 'angler': e = { x: W + 60, y: rand(CEIL + 90, SEABED - 70), r: 22, vx: -12, lunge: false }; break;
    case 'whirlpool': e = { x: W + 140, y: rand(CEIL + 130, SEABED - 130), r: 18, vx: 0 }; break;
    case 'ray': { const by = rand(CEIL + 140, SEABED - 140); e = { x: W + 60, y: by, baseY: by, amp: rand(70, 115), r: 22, vx: -240 }; break; }
    case 'crab': { const top = Math.random() < 0.3; e = { x: W + 40, y: top ? CEIL + 18 : SEABED - 16, floor: top ? CEIL + 18 : SEABED - 16, top, r: 18, vx: -40, vy: 0, jumped: false }; break; }
    case 'mine': e = { x: W + 40, y, baseY: y, r: 16, vx: 0, armed: false, armT: 0, beepT: 0 }; break;
    case 'swordfish': G.warns.push({ kind: 'sword', y: clamp(p.y + rand(-40, 40), CEIL + 40, SEABED - 40), t: 1.0, max: 1.0, elite }); sfx.warn(); return;
    case 'phantom': e = { x: W + 40, y, baseY: y, r: 20, amp: rand(40, 80), vx: -50, vis: 1 }; break;
  }
  if (!e) return;
  Object.assign(e, base);
  if (elite) { e.r *= 1.25; e.vx *= 1.2; }
  addEnemy(e);
}
function enemyHits(e, x, y, r) {
  const k = ES * 0.92; // 그림은 1.2배, 판정은 살짝 너그럽게
  switch (e.type) {
    case 'shark': return circ(e.x - 20 * k, e.y, 19 * k, x, y, r) || circ(e.x + 16 * k, e.y, 15 * k, x, y, r);
    case 'ray': return circ(e.x - 12 * k, e.y, 18 * k, x, y, r) || circ(e.x + 12 * k, e.y, 13 * k, x, y, r);
    case 'swordfish': return circ(e.x, e.y, 18 * k, x, y, r) || circ(e.x - 40 * k, e.y, 7 * k, x, y, r) || circ(e.x + 28 * k, e.y, 12 * k, x, y, r);
    case 'eel':
      for (let i = 0; i <= e.len; i += 18) if (circ(e.x + i, e.y + Math.sin(e.t * 12 + i * 0.05) * 6, e.r * k, x, y, r)) return true;
      return false;
    default: return circ(e.x, e.y, e.r * k, x, y, r);
  }
}
const harmless = (e) => (e.frozen && ['shark', 'eel', 'ray', 'jelly', 'swordfish'].includes(e.type)) || (G.eff.lamp > 0 && ['octopus', 'angler', 'phantom'].includes(e.type));
function weakHit(e, item) {
  earn('weak', 3); G.weak++;
  pop(e.x, e.y - 50, '딱 맞았어요! +3', C.yellow, 24);
  sfx.weak(); haptic(20);
  dexSee(e.type); save.dex[e.type].weak = true;
  if (item) ring(e.x, e.y, '#7cf0ff', 90, 0.4, 6);
}
function killEnemy(e, cause = 'boost') {
  if (e.dead) return;
  e.dead = true;
  if (cause === 'shot') shake = Math.max(shake, e.elite ? 10 : 5);
  else { freeze = Math.max(freeze, 0.06); shake = Math.max(shake, e.elite ? 18 : 12); zoomTo(1.035); }
  const col = (ENEMIES[e.type] || {}).color || '#fff';
  if (SPR_H[e.type]) shatter('spr_' + e.type, e.x, e.y, e.r * SPR_H[e.type] * ES, 3, cause === 'stomp' ? 0.7 : 1);
  hitStar(e.x, e.y, false, true); runXp(4);
  burst(e.x, e.y, col, 34, 620); burst(e.x, e.y, '#ffffff', 12, 420);
  for (let i = 0; i < 7; i++) { const a = Math.random() * Math.PI * 2, sp = rand(200, 560); fx.push({ k: 'chunk', x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.7, max: 0.7, size: rand(6, 12), color: col, rot: rand(0, 6), vr: rand(-14, 14) }); }
  ring(e.x, e.y, '#ffffff', 120, 0.35, 10); ring(e.x, e.y, C.yellow, 90);
  G.kills++; addScore(e.elite ? 3000 : 1000);
  if (cause === 'boost') track('boostKill');
  dexKill(e.type);
  if (cause === 'boost' || cause === 'whirl' || cause === 'giant') chainKill(e);
  if (e.elite) pop(e.x, e.y - 50, '정예 처치!', C.yellow, 28);
  else if (cause !== 'stomp') pop(e.x, e.y - 40, pick(['펑!', '쾅!', '퍽!', '뿅!', '콰앙!']), C.yellow, 40); // 밟기는 밟기 글자 하나만
  if (ENEMIES[e.type] && ENEMIES[e.type].weak === cause) weakHit(e, true);
  if (cause === 'stomp' ? !snd('smash', 0.6, 1.1, 0, 0.06) : !snd('smash', 1, rand(0.94, 1.06))) sfx.smash(); haptic(25); // 밟기: 쿵(밟기 소리) → 멈칫 뒤 조각 날 때 펑
  const drops = G.run ? (e.elite ? 2 : 1) : e.elite ? 4 : 2;
  for (let i = 0; i < drops; i++) G.eggsArr.push({ x: e.x, y: e.y, vx: rand(-80, 160), vy: rand(-160, 160), loose: true, gold: e.elite && i === 0, t: 0 });
}
// 카타르시스: 질주·회오리·커지기로 연달아 들이받으면 점점 커지는 연출, 5연속이면 화면을 휩쓴다
function chainKill(e) {
  G.chain++; G.chainT = 1.6; G.chainBest = Math.max(G.chainBest, G.chain);
  const c = G.chain;
  if (c >= 2) {
    pop(e.x, e.y - 70, `${c}연속!`, c >= 5 ? '#ff6fa8' : C.yellow, Math.min(54, 24 + c * 5), c >= 4);
    snd('chain', 0.8, comboRate(c));
    shake = Math.max(shake, 8 + c * 2); haptic(10 + c * 6);
  }
  if (c === 3) reaction(1, '3연속!');
  if (c === 5) sweepScreen('바다를 휩쓸었다!!');
  if (c === 8) reaction(3, '8연속 미쳤다!!');
  if (c === 10) { earn('chain', 30); reaction(4, '전설의 거북이!!!'); pop(W / 2, H / 2 + 50, '진주 +30', C.yellow, 40, true); sfx.fever(); }
}
function sweepScreen(label) {
  flash = 0.7; flashColor = '#ffffff'; shake = 30; freeze = 0.18; timeScale = 0.3; zoomTo(1.12);
  ring(G.p.x, G.p.y, '#ffffff', W, 0.7, 18); ring(G.p.x, G.p.y, C.yellow, W * 0.7, 0.55, 10);
  reaction(3, label); burstRays(G.p.x, G.p.y, '#ffffff', 1.4, 30);
  sfx.bossHit(); sfx.fever(); haptic([60, 30, 60, 30, 160]);
  for (const o of G.enemies) if (!o.dead && o.x < W + 30) { o.dead = true; G.kills++; dexKill(o.type); burst(o.x, o.y, (ENEMIES[o.type] || {}).color || '#fff', 18, 500); for (let i = 0; i < 2; i++) G.eggsArr.push({ x: o.x, y: o.y, vx: rand(-120, 120), vy: rand(-200, 200), loose: true, gold: i === 0, t: 0 }); }
  G.shots = [];
}
function moveByFinger() {
  const p = G.p;
  if (!drag || p.dead || G.enterT > 0 || G.won) return;
  const K2 = 1.25 * (G.grabT > 0 && G.boosting <= 0 ? 0.45 : 1);
  let tx = drag.px + (drag.kx - drag.sx) * K2, ty = drag.py + (drag.ky - drag.sy) * K2;
  const maxX = G.boosting > 0 || G.eff.whirl > 0 ? 820 : 470, rs = p.r * p.scale;
  const cx = clamp(tx, 50 + SAFE, maxX), cy = clamp(ty, CEIL + rs + 2, SEABED - rs - 4);
  if (cx !== tx) drag.px += cx - tx; // 벽에 막힌 만큼 기준을 옮김 → 손가락을 돌리면 즉시 반대로
  if (cy !== ty) drag.py += cy - ty;
  const dt = 1 / 60;
  p.vx = clamp((cx - p.x) / dt, -1600, 1600); p.vy = clamp((cy - p.y) / dt, -1600, 1600);
  p.x = cx; p.y = cy;
}
function setFace(f, t) { G.p.face = f; G.p.faceT = t; }
function hitPlayer(src) {
  const p = G.p;
  if (p.inv > 0 || p.dead || G.won || G.eff.whirl > 0) return;
  G.lastHit = src && src.type; // 실패 화면 팁용
  G.hits++;
  if (G.shield > 0) {
    G.shield--; p.inv = 1.4; shake = 12; freeze = 0.06; setFace('ouch', 0.6);
    ring(p.x, p.y, '#9ff3ff', 110, 0.5, 8); burst(p.x, p.y, '#bff8ff', 18);
    pop(p.x, p.y - 56, '방패가 막았어요!', '#9ff3ff', 24);
    sfx.shield(); haptic(60);
    if (G.boosting <= 0) { G.boost = Math.min(BMAX(), G.boost + 30); pop(p.x, p.y - 84, '분노 충전! 질주 +30', '#ff9aa8', 20); }
    if (src && src.type === 'mine') weakHit(src, false);
    if (src && src.type && ENEMIES[src.type] && src.type !== 'urchin' && src.type !== 'whirlpool') src.dead = true;
    return;
  }
  const hitE = hasTr('flute') ? 18 : HIT_E;
  if (G.run && G.en - hitE > 0.5) { // 점프 달리기는 기운: 부딪히면 25 줄고 깜빡이며 버팀
    G.en -= hitE; G.enLagT = 0.4; G.hurtAt = T; p.inv = 1.6; shake = 16; freeze = 0.08; flash = 0.3; flashColor = '#ff3355'; setFace('ouch', 0.8);
    burst(p.x - 10, p.y, '#ffb3c0', 10, 300); ring(p.x, p.y, '#ff5470', 70, 0.3, 5); hitStar(p.x + 24, p.y - 10, false, false); // 몸을 가리지 않게 작게
    pop(p.x, p.y - 64, G.en <= HIT_E ? '기운이 얼마 안 남았어요!' : '아야!', '#ff9aa8', 26, G.en <= HIT_E);
    // 맞은 몸짓: 뒤로 밀리며 살짝 튀어오름(알 합치기 넉백처럼) — 무적 1.6초라 다시 맞지 않음
    p.x -= 46; if (p.onG) { p.vy = -330; p.onG = false; p.slide = false; } else p.vy = Math.min(p.vy, -300);
    sfx.hurt(); if (Math.random() < 0.5) say('ouch'); haptic([40, 30, 60]);
    if (G.boosting <= 0) G.boost = Math.min(BMAX(), G.boost + 20);
    if (src && src.type && ENEMIES[src.type] && src.type !== 'urchin' && src.type !== 'whirlpool' && !src.run) src.dead = true;
    return;
  }
  if (G.run && save.runs <= 3 && !G.forgiven) { // 처음 3판은 실패해도 한 번 봐주기 (조사 00-레시피 1-1)
    G.forgiven = true; G.en = Math.max(G.en, G.maxEn / 2); p.inv = 2.2;
    pop(W / 2, H / 2 - 60, '괜찮아! 한 번 봐줄게 ♥', '#ffd1ef', 36, true); sfx.revive(); haptic([30, 30, 60]);
    for (const e of G.enemies) if (e.x < p.x + 300) { e.dead = true; burst(e.x, e.y, '#ffffff', 10); }
    return;
  }
  killPlayer();
}
function killPlayer() {
  const p = G.p; if (G.run) G.en = 0;
  p.dead = true; p.vy = -260; G.deathT = 0.7; // 1초 재시작(조사): 죽음 연출 짧게
  freeze = 0.22; shake = 26; flash = 0.55; flashColor = '#ff3355'; timeScale = 0.3; zoomTo(1.14);
  burst(p.x, p.y, '#fff0a0', 34, 520); ring(p.x, p.y, '#ff5470', 140, 0.6, 10);
  sfx.die(); haptic([90, 40, 160]);
  musicFever = false;
}
function tryBoost() {
  if (coachDone('boost')) return;
  if (!G || G.p.dead || G.boosting > 0 || G.won || G.enterT > 0) return;
  if (G.boost < 100) { if (G.boost < 99) sfx.no(); return; }
  const lvl = G.run ? Math.min(3, Math.floor(G.boost / 100)) : 1;
  G.boost = G.run ? G.boost - lvl * 100 : 0; G.boosting = boostDur();
  if (lvl >= 2) { G.boosting = 0; G.p.inv = Math.max(G.p.inv, 3); ultCine(lvl); return; } // 2·3단은 연출 → 마무리 뒤 질주 // 2단·3단: 세계를 멈추고 그림자 군단이 화면의 적을 하나씩
  freeze = 0.05; flash = 0.35; flashColor = '#b48bff'; shake = 14; timeScale = 0.75; zoomTo(1.06);
  ring(G.p.x, G.p.y, '#b48bff', 220, 0.6, 12);
  fxSpr('fx_shock', G.p.x, G.p.y, 200, { life: 0.55, from: 0.2, to: 2.2, vr: 2, add: false }); // 출발 충격파
  fxSpr('fx_burst', G.p.x + 30, G.p.y, 150, { life: 0.35, from: 0.3, to: 1.3, add: false });
  fxSpr('fx_slash', G.p.x + 120, G.p.y, 220, { life: 0.35, from: 0.6, to: 1.3, rot: 0.2, vx: 500, add: false });
  startCutin('boost', '질주!!', '앞을 막는 건 다 들이받아!', 0.7);
  burstRays(G.p.x, G.p.y, '#b48bff', 1.2, 24); edgeFlash('#8b5cff', 0.9);
  sfx.boost(); haptic([30, 30, 70]);
  track('boost');
}

// ───────── 몬스터 필살기: 갑자기 빨간 기운 → 이름 띠 → 화려한 한 방 ─────────
const SPECIALS = { // 몬스터마다 2~3가지, 쓸 때마다 무작위
  jelly: ['전기 폭풍', '번개 사슬', '분열'], urchin: ['가시 폭발', '조준 가시', '굴러오기'], shark: ['광폭 돌진', '상어 떼', '물어뜯기'],
  puffer: ['독가시 폭탄', '독 안개', '튕기기'], octopus: ['먹물 폭풍', '먹물 광선', '다리 붙잡기'], angler: ['유혹의 빛', '가짜 황금 진주 비', '어둠 파동'],
  whirlpool: ['대소용돌이'], ray: ['전기 활공', '급강하'], crab: ['집게 미사일', '집게 3연발', '높이 뛰기'], mine: ['연쇄 폭발', '쫓아오는 기뢰'], phantom: ['분신술', '순간이동'],
};
function trySpecials(dt) {
  const p = G.p;
  if (G.spCD > 0) { G.spCD -= dt; return; }
  for (const e of G.enemies) {
    if (e.sp || e.noSp || e.dead || e.stun > 0 || !SPECIALS[e.type] || e.x > W - 90 || e.x < p.x + 150) continue;
    const rate = (G.run ? 0.5 : 1) * (e.elite ? 0.9 : 0.22) * (G.n === ENDLESS ? 1.4 : 1 + Math.min(G.n, 50) / 40) * (G.D.elite > 0.2 ? 1.4 : 1);
    if (Math.random() < rate * dt) {
      const v = (Math.random() * SPECIALS[e.type].length) | 0;
      e.sp = { t: 0, wind: 0.75, done: false, v };
      G.spCD = rand(2.2, 4.2) * (G.n > 30 ? 0.75 : 1);
      pop(e.x, e.y - 64, `필살! ${SPECIALS[e.type][v]}`, '#ff4d6a', 22, true);
      if (e.type === 'jelly' && v === 1) G.hazards.push({ k: 'beam', x1: e.x, y1: e.y, x2: p.x, y2: p.y, t: 0, warn: 0.75, src: e }); // 번개 사슬 조준선
      if (e.type === 'octopus' && v === 1) G.hazards.push({ k: 'hbeam', y: e.y, t: 0, warn: 0.75, src: e });
      snd('charge', 0.8, 1, 0.3);
      haptic(15);
      return;
    }
  }
}
function runSpecial(e) {
  const p = G.p, ang = Math.atan2(p.y - e.y, p.x - e.x), v = e.sp ? e.sp.v : 0;
  shake = Math.max(shake, 12); burstRays(e.x, e.y, '#ff4d6a', 0.6, 12); ring(e.x, e.y, '#ff4d6a', 120, 0.4, 8);
  const key = `${e.type}:${v}`;
  switch (key) {
    case 'jelly:0': G.hazards.push({ k: 'shock', x: e.x, y: e.y, r: 12, max: 170, spd: 300, t: 0 }); sfx.bolt(); break;
    case 'jelly:1': for (const h of G.hazards) if (h.src === e && h.k === 'beam') { h.on = true; h.t = 0; } if (ac) sfx.bolt(); break;
    case 'jelly:2': for (const dy of [-70, 0, 70]) addEnemy({ type: 'jelly', x: e.x, y: e.y + dy, baseY: clamp(e.y + dy, CEIL + 50, SEABED - 50), r: 12, amp: 30, vx: -120, t: 0, ph: rand(0, 6), noSp: true }); e.dead = true; burst(e.x, e.y, '#ff8fd0', 24, 400); if (ac) sfx.bubble(); break;
    case 'urchin:0': for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; G.shots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, r: 9, t: 0, style: 'spike' }); } snd('break', 0.8, 1.3); break;
    case 'urchin:1': for (const da of [-0.18, 0, 0.18]) G.shots.push({ x: e.x, y: e.y, vx: Math.cos(ang + da) * 560, vy: Math.sin(ang + da) * 560, r: 10, t: 0, style: 'spike' }); if (ac) sfx.shoot(); break;
    case 'urchin:2': e.roll = 3; e.vx = -520; e.top = false; snd('swoosh', 0.8); break;
    case 'shark:0': e.rage = 1.8; e.vx = -780; e.zigT = 0; if (ac) sfx.roar(); break;
    case 'shark:1': for (let i = 0; i < 3; i++) G.warns.push({ kind: 'shark', y: G.run ? (i % 2 ? HEAD_Y : GROUND - 24) : clamp(p.y + (i - 1) * 110, CEIL + 40, SEABED - 40), t: 0.5 + i * 0.45, max: 0.75, run: G.run }); if (ac) sfx.roar(); break;
    case 'shark:2': e.vx = -620; e.lungeY = clamp(p.y, CEIL + 40, SEABED - 40); e.rage = 1; e.zigT = 99; e.zigY = e.lungeY; if (ac) sfx.lunge(); break;
    case 'puffer:0': for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; G.shots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 10, t: 0, style: 'poison' }); } e.dead = true; burst(e.x, e.y, '#9dff6a', 40, 520); ring(e.x, e.y, '#9dff6a', 160, 0.5, 12); if (ac) sfx.mineBoom(); break;
    case 'puffer:1': G.hazards.push({ k: 'cloud', x: e.x - 60, y: e.y, r: 90, t: 0, dur: 3.2 }); snd('bubble', 0.7); break;
    case 'puffer:2': e.bounce = 3; e.vy2 = pick([-420, 420]); e.vx = -260; if (ac) sfx.bubble(); break;
    case 'octopus:0': for (let i = 0; i < 5; i++) G.inks.push({ x: e.x - 40, y: e.y + (i - 2) * 60, r: 60, a: 0.95, t: 0, vx: -240 - i * 20 }); e.spin = 1; if (ac) sfx.ink(); break;
    case 'octopus:1': for (const h of G.hazards) if (h.src === e && h.k === 'hbeam') { h.on = true; h.t = 0; } sfx.ink(); break;
    case 'octopus:2': G.grabT = 1.8; G.hazards.push({ k: 'grab', src: e, t: 0, dur: 1.8 }); pop(p.x, p.y - 70, '붙잡혔다! 버둥버둥', '#ff9aa8', 22); if (ac) sfx.ink(); break;
    case 'angler:0': flash = 0.7; flashColor = '#fff4c0'; e.lunge = true; e.vx = -900; e.vy = clamp((p.y - e.y) * 2.5, -360, 360); if (ac) sfx.lunge(); break;
    case 'angler:1': for (let i = 0; i < 6; i++) G.shots.push({ x: e.x - 20, y: e.y - 40, vx: -rand(260, 420), vy: rand(-220, 220), r: 12, t: 0, fake: true }); if (ac) sfx.gold(); break;
    case 'angler:2': G.darkT = 3.2; pop(W / 2, H / 2 - 120, '깜깜해졌어요!', '#ffffff', 30, true); snd('lamp', 0.6, 0.6); break;
    case 'whirlpool:0': e.big = 4; sfx.whirl(); break;
    case 'ray:0': e.amp *= 1.6; e.vx = -560; e.spark = 1.6; if (ac) sfx.bolt(); break;
    case 'ray:1': e.dive = 1.2; e.vx = -700; e.baseY = clamp(p.y, CEIL + 60, SEABED - 60); e.amp = 10; if (ac) sfx.swoosh(); break;
    case 'crab:0': G.shots.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 560, vy: Math.sin(ang) * 560, r: 14, t: 0, style: 'claw' }); if (ac) sfx.shoot(); break;
    case 'crab:1': for (let i = 0; i < 3; i++) G.shots.push({ x: e.x, y: e.y, vx: Math.cos(ang + (i - 1) * 0.22) * 500, vy: Math.sin(ang + (i - 1) * 0.22) * 500, r: 13, t: 0, style: 'claw' }); if (ac) sfx.shoot(); break;
    case 'crab:2': e.jumped = true; e.vy = e.top ? 820 : -860; e.vx = -320; if (ac) sfx.crab(); break;
    case 'mine:0': e.armed = true; e.armT = 0; e.big = true; break;
    case 'mine:1': e.homing = 3; e.armed = false; if (ac) sfx.beep(); break;
    case 'phantom:0': for (const dy of [-110, 110]) addEnemy({ type: 'phantom', x: e.x + 30, y: e.y + dy, baseY: clamp(e.y + dy, CEIL + 60, SEABED - 60), r: e.r, amp: 40, vx: e.vx, vis: 1, t: 0, ph: rand(0, 6), noSp: true }); if (ac) sfx.double(); break;
    case 'phantom:1': e.x = p.x + 190; e.baseY = clamp(p.y + rand(-40, 40), CEIL + 60, SEABED - 60); e.vis = 1; burst(e.x, e.y, '#c9b8ff', 24, 360); if (ac) sfx.double(); break;
  }
}
function updateHazards(dt) {
  const p = G.p;
  if (G.darkT > 0) G.darkT -= dt;
  if (G.grabT > 0) G.grabT -= dt;
  const safe = () => G.boosting > 0 || G.eff.giant > 0 || G.eff.whirl > 0;
  for (const h of G.hazards) {
    h.t += dt;
    if (h.k === 'beam') { // 해파리 번개 사슬: 조준선 → 번쩍
      if (!h.on) { if (h.src && !h.src.dead) { h.x1 = h.src.x; h.y1 = h.src.y; } if (h.t > 1.2) h.done = true; continue; }
      if (!h.hit && h.t < 0.25 && !p.dead) { const dx = h.x2 - h.x1, dy = h.y2 - h.y1, L = Math.hypot(dx, dy) || 1, u = clamp(((p.x - h.x1) * dx + (p.y - h.y1) * dy) / (L * L), 0, 1.6), cx = h.x1 + dx * u, cy = h.y1 + dy * u; if (Math.hypot(p.x - cx, p.y - cy) < 26 + p.r) { h.hit = true; if (!safe()) hitPlayer({ type: 'jelly' }); } }
      if (h.t > 0.35) h.done = true; continue;
    }
    if (h.k === 'hbeam') { // 문어 먹물 광선: 한 줄 가로
      if (!h.on) { if (h.src && !h.src.dead) h.y = h.src.y; if (h.t > 1.2) h.done = true; continue; }
      if (!h.hit && h.t < 0.5 && !p.dead && Math.abs(p.y - h.y) < 30 + p.r && p.x < (h.src ? h.src.x : W)) { h.hit = true; if (!safe()) hitPlayer({ type: 'octopus' }); }
      if (h.t > 0.6) h.done = true; continue;
    }
    if (h.k === 'cloud') { h.x -= G.cfg.speed * 0.5 * dt; if (!p.dead && !h.hit && h.t > 0.4 && Math.hypot(p.x - h.x, p.y - h.y) < h.r * 0.8) { h.hit = true; if (!safe()) hitPlayer({ type: 'puffer' }); } if (h.t > h.dur) h.done = true; continue; }
    if (h.k === 'wave') { // 왕꽃게 모래 파도: 바닥을 따라 밀려옴 → 점프
      h.x -= (640 + G.cfg.speed * 0.3) * dt;
      if (!h.hit && !p.dead && Math.abs(p.x - h.x) < 36 && p.fy > GROUND - 40) { h.hit = true; if (!safe()) hitPlayer({ type: 'boss' }); }
      if (h.x < -80) h.done = true; continue;
    }
    if (h.k === 'grab') { if (h.t > h.dur || !h.src || h.src.dead) { h.done = true; G.grabT = 0; } continue; }
    if (h.k === 'shock') {
      h.r = Math.min(h.max, h.r + h.spd * dt); h.x -= G.cfg.speed * 0.3 * dt;
      const d = Math.hypot(p.x - h.x, p.y - h.y);
      if (!h.hit && !p.dead && Math.abs(d - h.r) < 16 + p.r * 0.4 && h.r < h.max) {
        h.hit = true;
        if (G.boosting > 0 || G.eff.giant > 0 || G.eff.whirl > 0) { /* 버팀 */ } else hitPlayer({ type: 'jelly' });
      }
      if (h.r >= h.max) h.done = (h.fade = (h.fade || 0) + dt) > 0.3;
    }
  }
  G.hazards = G.hazards.filter((h) => !h.done);
}

// ───────── 아이템 상자 · 아이템 ─────────
function rollItem() {
  const pool = itemPool(G.n), w = {};
  pool.forEach((k) => { w[k] = 1; });
  if (G.hits > 0 || (G.boss && !G.boss.dead)) ['bubble', 'bolt', 'giant'].forEach((k) => { if (w[k]) w[k] = 2.2; }); // 위험할수록 좋은 아이템(따라잡기)
  const fresh = G.n !== ENDLESS && STAGES[G.n].fresh;
  if (fresh && w[ENEMIES[fresh].weak]) w[ENEMIES[fresh].weak] += 3; // 새 몬스터의 약점을 자연스럽게 배우게
  if (G.cfg.dark && w.lamp) w.lamp += 2;
  let sum = 0; for (const k in w) sum += w[k];
  let r = Math.random() * sum;
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return pool[0];
}
function pickupBox(b) {
  b.got = true;
  burst(b.x, b.y, '#ffffff', 14, 300); ring(b.x, b.y, C.blueD, 70, 0.4, 5);
  if (G.item) { earn('box', 5); pop(b.x, b.y - 30, '진주 +5', C.yellow, 22); sfx.gold(); return; }
  G.item = rollItem(); G.itemPop = 0.6;
  pop(G.p.x, G.p.y - 70, `${ITEMS[G.item].name}!`, '#ffffff', 26);
  sfx.box(); haptic(15);
  if (!save.itemTipSeen) { save.itemTipSeen = true; toast(isTouch ? '아이템 버튼을 눌러서 써요' : 'E 키로 아이템을 써요', C.blueD); }
}
function useItem() {
  if (coachDone('item')) return;
  if (!G || !G.item || G.p.dead || G.won || G.enterT > 0) { if (G && !G.item) sfx.no(); return; }
  const k = G.item, p = G.p; G.item = null;
  pop(W / 2, H / 2 - 150, ITEMS[k].name, '#ffffff', 36, true);
  haptic([20, 20, 40]); zoomTo(1.04);
  switch (k) {
    case 'magnet': G.eff.magnet = ITEMS.magnet.dur; sfx.magnet(); break; // 지속 시간은 아래에서 레벨 능력만큼 늘림
    case 'double': G.eff.double = ITEMS.double.dur; sfx.double(); break;
    case 'bubble': G.shield++; G.jellySafe = 8; sfx.bubble(); ring(p.x, p.y, '#9ff3ff', 90, 0.5, 8); break;
    case 'freeze': G.eff.freeze = ITEMS.freeze.dur; sfx.freeze(); flash = 0.35; flashColor = '#bfefff'; break;
    case 'giant': G.eff.giant = ITEMS.giant.dur; sfx.giant(); shake = 12; break;
    case 'lamp': G.eff.lamp = ITEMS.lamp.dur; sfx.lamp(); G.inks.forEach((k2) => { k2.fade = true; }); break;
    case 'whirl':
      G.eff.whirl = ITEMS.whirl.dur; sfx.whirl(); p.inv = Math.max(p.inv, 3.3);
      for (const e of G.enemies) if ((e.type === 'whirlpool' || e.type === 'mine') && e.x < W + 40) killEnemy(e, 'whirl');
      break;
    case 'rain': G.eff.rain = ITEMS.rain.dur; if (!snd('gift', 0.9)) sfx.gold(); break; // 인기 게임 「젤리 비」처럼
    case 'rocket': G.eff.rocket = ITEMS.rocket.dur; p.inv = Math.max(p.inv, ITEMS.rocket.dur + 0.6); p.slide = false; p.slideHold = false; snd('boost', 0.9); shake = 10; break;
    case 'transform': { // 화면 속 장애물이 진주로(인기 게임 「젤리 변신」)
      let n = 0; snd('hatch', 0.8); flash = 0.4; flashColor = '#fff3c0';
      for (const e of G.enemies) if (!e.dead && e.x < W + 40 && e.x > -40) { e.dead = true; n++; G.eggsArr.push({ x: e.x, y: e.y, gold: n % 4 === 0, t: 0 }); burst(e.x, e.y, '#ffe36b', 14, 300); }
      for (const o of G.breaks) if (!o.dead && o.x < W + 40) { o.dead = true; n++; G.eggsArr.push({ x: o.x, y: o.y, gold: true, t: 0 }); burst(o.x, o.y, '#ffe36b', 14, 300); }
      for (const o of G.obs) if (!o.dead && o.k === 'pillar' && o.x < W + 40 && o.x + o.w > 0) { o.dead = true; n++; for (let i = 0; i < 4; i++) G.eggsArr.push({ x: o.x + o.w / 2, y: o.y1 - 30 - i * 50, pearl: true, t: 0 }); burst(o.x + o.w / 2, o.y1 - 60, '#ffe36b', 18, 320); }
      pop(W / 2, H / 2 - 100, n ? `${n}개가 진주로!` : '진주 마법!', C.yellow, 30, true);
      break;
    }
    case 'bolt':
      sfx.bolt(); flash = 0.6; flashColor = '#e8f4ff'; shake = 18; freeze = 0.12;
      for (const e of G.enemies) {
        if (e.x > W + 30 || e.dead) continue;
        fx.push({ k: 'laser', x: e.x + rand(-30, 30), y: -10, x2: e.x, y2: e.y, life: 0.3, max: 0.3, color: '#fff7b0' });
        if (ENEMIES[e.type].armored) { e.stun = 1.6; pop(e.x, e.y - 30, '단단해요!', C.sub, 18); }
        else killEnemy(e, 'bolt');
      }
      if (G.boss && !G.boss.dead) { G.boss.stun = 1.6; if (G.boss.st === 'charge' || G.boss.st === 'lunge') G.boss.st = 'retreat'; pop(G.boss.x, G.boss.y - 90, '찌릿!', C.yellow, 36); }
      break;
  }
  if (typeof hasPerk === 'function' && hasPerk('itemTime')) for (const e in G.eff) if (G.eff[e] > 0 && ITEMS[e] && ITEMS[e].dur && G.eff[e] >= ITEMS[e].dur - 0.01) G.eff[e] *= 1.3;
}

// ───────── 알 · 피버 ─────────
function spawnEggs() {
  const pattern = pick(['line', 'arc', 'wave', 'column', 'arc', 'zig']);
  const y0 = rand(CEIL + 80, SEABED - 80);
  const goldChance = 0.12 * (petIs('puppy') ? 1 + petLv() * 0.15 : 1);
  const goldIdx = Math.random() < goldChance ? 5 : -1;
  for (let i = 0; i < 6; i++) {
    let x = W + 40 + i * 44, y = y0;
    if (pattern === 'arc') y = y0 - Math.sin((i / 5) * Math.PI) * 75;
    if (pattern === 'wave') y = y0 + Math.sin(i * 0.95) * 45;
    if (pattern === 'zig') y = y0 + (i % 2 ? 30 : -30);
    if (pattern === 'column') { x = W + 40 + (i % 2) * 20; y = y0 - 80 + i * 32; }
    G.eggsArr.push({ x, y: clamp(y, CEIL + 30, SEABED - 30), gold: i === goldIdx, t: rand(0, 6) });
  }
  G.eggsSpawned += 6;
}
function spawnEggRain() {
  if (G.run) { // 점프로 닿는 높이에 줄·무지개로
    const h = pick([0, 0, 90, 150]);
    for (let i = 0; i < 9; i++) G.eggsArr.push({ x: W + 30 + i * 40, y: SEABED - 32 - h - Math.sin(i / 8 * Math.PI) * (h ? 40 : 0), gold: i === 4, bonus: i === 4, pearl: i !== 4, t: rand(0, 6) }); // 구슬 + 알 1개
    return;
  }
  const y0 = G.run ? rand(SEABED - 220, SEABED - 90) : rand(CEIL + 90, SEABED - 90), amp = G.run ? rand(30, 70) : rand(40, 90);
  for (let i = 0; i < 9; i++) G.eggsArr.push({ x: W + 30 + i * 36, y: clamp(y0 + Math.sin(i * 0.7 + T) * amp, CEIL + 30, SEABED - 30), gold: true, bonus: true, t: rand(0, 6) });
}
// 점수(인기 게임 방식): 진주·밟기·처치·상자·글자·보스·거리로 쌓이고, 소나기(피버) 중엔 두 배
const scoreMult = () => Math.min(20, 1 + Math.floor((save.missionsDone || 0) / 2)); // 도전 2개마다 점수 배수 +1(최대 ×20)
function addScore(v) { if (G && !G.banked) G.score += Math.round(v * (G.feverT > 0 ? 2 : 1) * (hasTr('scale') ? 1.15 : 1) * scoreMult()); }
function collectEgg(e) {
  e.got = true;
  if (e.clock && G.bonus) { G.bonus.t += 2; pop(e.x, e.y - 30, '+2초!', '#7cf0ff', 26, true); snd('ready', 0.8); return; }
  if (e.clock) return;
  if (e.ult) { // 필살 조개: 필살 게이지를 1단까지 꽉(벽 앞 — 못 쓰는 상황이 없게)
    G.boost = Math.max(G.boost, 100); pop(e.x, e.y - 40, isTouch ? '필살 충전! 오른쪽 단추!' : '필살 충전! Shift!', '#d9c6ff', 28, true);
    snd('react', 0.8); haptic([20, 30, 20]); burst(e.x, e.y, '#b48bff', 20, 320); ring(G.p.x, G.p.y, '#b48bff', 90, 0.4, 6); return;
  }
  if (e.potion) { // 기운 물약: 작은 +10 · 큰 +30, 처음 기운보다 넘치지 않음
    const v = (e.potion === 'b' ? 30 : 10) * (hasTr('bottle') ? 1.5 : 1), before = G.en;
    G.en = Math.min(G.maxEn, G.en + v); G.enHealT = 0.7; G.enHealFrom = before;
    if (!snd('potion', 0.9)) sfx.revive(); haptic([10, 20]);
    burst(e.x, e.y, '#ff9ac0', 14, 260); ring(G.p.x, G.p.y, '#ff9ac0', 70, 0.35, 5);
    pop(e.x, e.y - 30, `기운 +${Math.round(G.en - before) || v}`, '#ffb3d1', 24);
    return;
  }
  if (e.pearl) { // 물방울 구슬: 알은 아니고 연속·질주·소나기 게이지만
    G.pearls = (G.pearls || 0) + 1; runXp(1); addScore(100 + Math.min(G.combo, 20) * 10);
    G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 0.6; // 0.6초 못 먹으면 첫 음으로(인기 게임)
    if (G.boosting <= 0) G.boost = Math.min(BMAX(), G.boost + 1.2);
    if (G.feverT <= 0) { G.fever = Math.min(100, G.fever + 1.4); if (G.fever >= 100) startFever(); }
    snd('egg', 0.3, comboRate(Math.min(G.combo, 6)), 0.06); // 진주 줄: 5음계로 한 칸씩 올라감(알 합치기 콤보 음)
    burst(e.x, e.y, '#dff6ff', 3, 120);
    const CM = { 30: 0, 60: 1, 100: 2, 150: 3, 220: 4 };
    if (CM[G.combo] != null) reaction(CM[G.combo], `${G.combo}연속 ${REACT_WORDS[CM[G.combo]][0]}`);
    return;
  }
  setFace('happy', 0.35); runXp(3);
  const mult = (G.feverT > 0 ? 2 : 1) * (G.eff.double > 0 ? 2 : 1);
  const v = Math.round((e.gold ? (e.bonus ? 1 : G.run ? 3 : 5) : 1) * mult * (G.run && hasPerk('legend') ? 1.2 : 1)) || 1;
  earn(e.loose ? 'drop' : e.bonus ? 'rain' : e.gold ? 'gold' : 'egg', v); addScore(e.gold ? (hasTr('hook') ? 6000 : 3000) : 500);
  if (G.feverT > 0) G.feverEggs += v;
  if (!e.loose && !e.bonus) G.eggsGot++;
  fx.push({ k: 'eggfly', sx: e.x, sy: e.y, life: 0.5, max: 0.5, gold: e.gold });
  G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 0.6; // 0.6초 못 먹으면 첫 음으로(인기 게임)
  if (G.boosting <= 0) G.boost = Math.min(BMAX(), G.boost + (e.gold && !e.bonus ? 10 : 2.5));
  if (e.gold && !e.bonus) { sfx.gold(); pop(e.x, e.y - 24, `황금 진주 +${v}`, C.yellow, 26); burst(e.x, e.y, '#ffe36b', 16); track('gold'); }
  else { sfx.egg(G.combo); burst(e.x, e.y, '#eafff2', 5, 160); }
  if (G.combo > 0 && G.combo % (G.run ? 15 : 6) === 0) { pop(G.p.x, G.p.y - 60, `${G.combo}개 연속!`, '#7cf0ff', 30); G.boost = Math.min(BMAX(), G.boost + 6); haptic(12); }
  const CM = G.run ? { 30: 0, 60: 1, 100: 2, 150: 3, 220: 4 } : { 12: 0, 24: 1, 36: 2, 54: 3, 80: 4 };
  if (CM[G.combo] != null) reaction(CM[G.combo], `${G.combo}연속 ${REACT_WORDS[CM[G.combo]][0]}`);
  if (petIs('sprout') && ++G.sprout % 10 === 0) { earn('pet', petLv()); pop(G.p.x - 40, G.p.y - 40, `새싹이 +${petLv()}`, '#9dff7a', 20); }
  if (G.feverT <= 0) {
    G.fever = Math.min(100, G.fever + (e.gold ? 14 : 5) * (G.run ? 0.35 : 1)); // 점프 달리기는 알이 많아서 천천히 참(글자 4개로도 부름)
    if (G.fever >= 100) startFever();
  }
}
function startFever() {
  G.feverT = 6; G.fever = 0; G.feverEggT = 0;
  reaction(3, '바다 축제!!');
  flash = 0.45; flashColor = '#ffe36b'; shake = 10; zoomTo(1.05);
  sfx.fever(); haptic([20, 30, 20, 30, 60]);
  musicFever = true;
  track('fever');
}

// ───────── 보스 6종 ─────────
const BOSS_HOME = () => (G && G.run ? W - 260 - SAFE : W - 170); // 점프 달리기: 오른쪽 엄지 단추(필살·아이템)에 안 가리게 안쪽
const BOSS_DEF = {
  shark: { name: '상어 대장', hp: 4, kind: 'shark', c1: '#7f9fbf', c2: '#3e5a76', s: 2.5, spd: 1 },
  shark2: { name: '상어 대장', hp: 6, kind: 'shark', c1: '#a6b8d8', c2: '#2a4566', s: 2.6, spd: 1.3 },
  octopus: { name: '대왕 문어', hp: 5, kind: 'octopus', s: 3.2, spd: 1 },
  octopus2: { name: '대왕 문어', hp: 7, kind: 'octopus', s: 3.4, spd: 1.3 },
  angler: { name: '아귀 대왕', hp: 5, kind: 'angler', s: 3, spd: 1 },
  king1: { name: '상어왕', hp: 7, kind: 'shark', c1: '#8a6bd6', c2: '#3f2a7a', s: 2.8, spd: 1.15, king: true, flee: true },
  octopus3: { name: '해적 문어 선장', hp: 8, kind: 'octopus', s: 3.5, spd: 1.4, triple: true },
  angler2: { name: '아귀 여왕', hp: 7, kind: 'angler', s: 3.2, spd: 1.3 },
  shark3: { name: '상어 대장', hp: 8, kind: 'shark', c1: '#d8b06a', c2: '#6a4a1a', s: 2.8, spd: 1.45 },
  jellyq: { name: '번개 해파리 여왕', hp: 7, kind: 'jelly', s: 3, spd: 1.25 },
  crabk: { name: '왕꽃게', hp: 8, kind: 'crab', s: 3, spd: 1.35 },
  king: { name: '상어왕', hp: 11, kind: 'shark', c1: '#8a6bd6', c2: '#3f2a7a', s: 3.1, spd: 1.35, king: true },
};
function spawnBoss() {
  const d = BOSS_DEF[G.cfg.boss];
  // 그림자 → 떨어짐(0.23초) → 쿵 (경고 2.4초 동안 그림자가 커지고 땅이 울렸음)
  const land = G.run ? Math.min(SEABED - 60, GROUND - 58 * (d.s / 2.5) + 4) : H / 2;
  G.boss = { def: d, kind: d.kind, x: BOSS_HOME(), y: -300, landY: land, hp: d.hp * 10, maxHp: d.hp * 10, hpShow: d.hp * 10, st: 'fall', t: 0, cd: 2.4, shoot: 1.4, hurt: 0, ihit: 0, stun: 0, dead: false, deadT: 0, cycle: 0, s: d.s };
  setMusic('boss');
  snd('swoosh', 1, 0.7);
}
function bossHitTest(b, x, y, r) {
  if (b.kind === 'shark') { const k = b.s / 2.5; return circ(b.x - 10 * k, b.y, 58 * k, x, y, r) || circ(b.x - 75 * k, b.y + 6, 30 * k, x, y, r); }
  if (b.kind === 'octopus') return circ(b.x, b.y - 18, 64, x, y, r) || circ(b.x + 30, b.y + 50, 40, x, y, r);
  return circ(b.x, b.y, 62, x, y, r);
}
function updateBoss(dt) {
  const b = G.boss, p = G.p, d = b.def;
  b.hurt -= dt; b.ihit -= dt;
  if (b.dead) {
    b.t += dt; b.deadT -= dt; b.y += 50 * dt; b.x += 40 * dt;
    if (Math.random() < 0.4) { burst(b.x + rand(-80, 80), b.y + rand(-40, 40), pick(['#ffd34d', '#ff7a45', '#ffffff']), 10, 420); shake = Math.max(shake, 6); }
    if (b.deadT <= 0) { G.boss = null; G.bossDone = true; G.zoomAt = null; setMusic(stageMusic(G.n)); }
    return;
  }
  if (b.st === 'fall') { // 하늘에서 떨어짐
    b.t += dt; const k = Math.min(1, b.t / 0.23); b.y = lerp(-300, b.landY, k * k); b.x = BOSS_HOME();
    if (k >= 1) { b.y = b.landY; bossLand(b); b.st = b.kind === 'angler' ? 'retreat' : 'idle'; b.t = 0; b.cd = 2.6; }
    return;
  }
  if (b.stun > 0) { b.stun -= dt; b.x = lerp(b.x, BOSS_HOME(), dt * 2); return; }
  if (!b.rage && b.hp <= b.maxHp / 2) {
    b.rage = true;
    startCutin('boss', '분노!!', `${d.name}이(가) 필살기를 꺼냈어요!`, 1.0);
    burstRays(b.x, b.y, '#ff4d6a', 1.4, 28); edgeFlash('#ff3355', 1); if (ac) sfx.roar();
  }
  const sdt = dt * (G.eff.freeze > 0 ? 0.4 : 1) * d.spd * (b.rage ? 1.25 : 1);
  if (b.rage && Math.random() < dt * 25) fx.push({ k: 'flame', x: b.x + rand(-60, 60), y: b.y + rand(-40, 40), vx: rand(-40, 40), vy: rand(-140, -60), life: 0.5, max: 0.5, size: rand(6, 14), color: pick(['#ff4d6a', '#ff8a3c', '#ffd54a']) });
  b.t += sdt;
  const homeX = BOSS_HOME(), minY = CEIL + 70, maxY = SEABED - 60;
  // 점프 달리기: 큰 적은 「땅 줄」(점프로 넘기) 아니면 「머리 줄」(숙여서 피하기)로만 돌진
  const kS = b.s / 2.5, lowY = Math.min(maxY, GROUND - 58 * kS + 4), highY = GROUND - 46 - 58 * kS;
  const aimY = () => (G.run ? (b.laneY != null ? b.laneY : lowY) : p.y);
  const trackY = (spd) => { const ty = aimY(); b.y += clamp(ty - b.y, -1, 1) * Math.min(spd, Math.abs(ty - b.y) * 2.5) * sdt; };
  if (b.kind === 'shark') {
    switch (b.st) {
      case 'enter': b.x = lerp(b.x, homeX, sdt * 2.5); trackY(120); if (b.x < homeX + 12) { b.st = 'idle'; b.t = 0; } break;
      case 'idle':
        trackY(170); b.x = lerp(b.x, homeX, sdt * 3);
        b.shoot -= sdt;
        if (b.shoot <= 0) { b.shoot = (d.king ? 0.9 : 1.35) * (G.run ? 1.6 : 1); G.shots.push({ x: b.x - 80, y: b.y + 12, vx: -440, vy: rand(-50, 50), r: 13, t: 0 }); sfx.shoot(); }
        b.cd -= sdt;
        if (b.cd <= 0) {
          b.cycle++;
          if (d.king && b.cycle % 2 === 0) { // 상어왕: 부하 부르기 + 먹물
            for (let i = 0; i < 2; i++) G.warns.push({ kind: 'shark', y: G.run ? (i ? HEAD_Y : GROUND - 24) : clamp(p.y + rand(-120, 120), CEIL + 40, SEABED - 40), t: 0.9 + i * 0.6, max: 0.9, run: G.run });
            for (let i = 0; i < 2; i++) G.inks.push({ x: W - 260 - i * 120, y: rand(CEIL + 80, SEABED - 80), r: 80, a: 0.9, t: 0, vx: -60 });
            sfx.warn(); sfx.ink(); b.cd = 2.2;
          } else { b.st = 'windup'; b.t = 0; b.laneY = G.run && Math.random() < (b.rage ? 0.5 : 0.32) ? highY : null; sfx.warn(); haptic(30); }
        }
        break;
      case 'windup':
        if (b.t < 0.7) trackY(G.run ? 400 : 220);
        b.x = homeX + 30 * b.t + Math.sin(b.t * 70) * 4;
        if (b.t > 0.9) { b.st = 'charge'; b.t = 0; snd('lunge', 1); }
        break;
      case 'charge': b.x -= (G.run ? 760 : 1150) * sdt; if (b.x < -260) {
        if (b.rage && !b.second) { b.second = true; b.x = W + 260; b.st = 'windup'; b.t = 0.35; if (G.run) { b.laneY = b.laneY == null ? highY : null; b.y = aimY(); } else b.y = clamp(p.y, minY, maxY); sfx.warn(); } // 분노: 연속 돌진(점프 달리기는 줄을 바꿔서)
        else { b.second = false; b.laneY = null; b.x = W + 260; b.st = 'enter'; b.cd = rand(2.2, 3.4); if (Math.random() < 0.3) later(200, () => bossTaunt()); }
      } break;
      case 'retreat': b.x += 600 * sdt; if (b.x > W + 200) { b.st = 'enter'; b.cd = 2.5; } break;
      case 'knock': b.x = lerp(b.x, homeX + 40, sdt * 5); if (b.t > 0.6) { b.st = 'idle'; b.cd = Math.max(b.cd, 1.4); } break;
    }
  } else if (b.kind === 'octopus') {
    switch (b.st) {
      case 'enter': b.x = lerp(b.x, homeX, sdt * 2); if (b.x < homeX + 12) { b.st = 'idle'; b.t = 0; } break;
      case 'idle':
        b.y = lerp(b.y, G.run ? GROUND - 120 + Math.sin(b.t * 1.3) * 55 : H / 2 + Math.sin(b.t * 1.3) * 110, sdt * 2); b.x = lerp(b.x, homeX, sdt * 3);
        b.shoot -= sdt;
        if (b.shoot <= 0 && G.eff.lamp <= 0) { b.shoot = 1.8; G.inks.push({ x: b.x - 110, y: clamp(p.y + rand(-60, 60), CEIL + 60, SEABED - 60), r: 70, a: 0.95, t: 0, vx: -320 }); sfx.ink(); }
        b.cd -= sdt;
        if (b.cd <= 0 && G.run) { // 점프 달리기: 아래 줄 = 점프, 위 줄 = 뛰지 말기
          const low = { y0: GROUND - 70, y1: GROUND + 6 }, high = { y0: CEIL + 10, y1: GROUND - 78 };
          const first = Math.random() < 0.6 ? low : high;
          G.sweeps.push({ ...first, t: 1.0, x: W + 60, on: false, lane: first === low ? 'low' : 'high' });
          if (b.rage || d.triple || d.spd > 1) { const second = first === low ? high : low; G.sweeps.push({ ...second, t: 1.75, x: W + 60, on: false, lane: second === low ? 'low' : 'high' }); }
          b.cd = rand(2.6, 3.6); sfx.warn(); haptic(25);
        } else if (b.cd <= 0) { // 다리 휘두르기: 위·가운데·아래 중 한 줄 미리 표시
          const lane = pick([0, 1, 2]), lh = (SEABED - CEIL) / 3, y0 = CEIL + 10 + lane * lh;
          G.sweeps.push({ y0, y1: y0 + lh - 10, t: 0.95, x: W + 60, on: false });
          if (b.rage) { const gap = pick([0, 1, 2]); for (const l3 of [0, 1, 2]) if (l3 !== gap) G.sweeps.push({ y0: CEIL + 10 + l3 * lh, y1: CEIL + lh * (l3 + 1), t: 1.1, x: W + 60, on: false }); G.sweeps = G.sweeps.filter((s2) => s2.y0 !== y0 || s2.t !== 0.95 || lane !== gap); }
          else if (d.triple) { for (const l3 of [0, 1, 2]) if (l3 !== lane) G.sweeps.push({ y0: CEIL + 10 + l3 * lh, y1: CEIL + lh * (l3 + 1), t: 1.2 + l3 * 0.35, x: W + 60, on: false }); }
          else if (d.spd > 1 || b.hp <= 2) { const l2 = (lane + 1 + ((Math.random() * 2) | 0)) % 3, y2 = CEIL + 10 + l2 * lh; G.sweeps.push({ y0: y2, y1: y2 + lh - 10, t: 1.5, x: W + 60, on: false }); }
          b.cd = rand(2.6, 3.6); sfx.warn(); haptic(25);
        }
        break;
      case 'retreat': b.st = 'idle'; break;
      case 'knock': b.x = lerp(b.x, homeX + 50, sdt * 5); if (b.t > 0.6) b.st = 'idle'; break;
    }
  } else if (b.kind === 'jelly') { // 번개 해파리 여왕: 떠서 번개 줄 · 새끼 · 급강하(밟을 틈)
    const hover = GROUND - 210 + Math.sin(b.t * 1.4) * 40;
    switch (b.st) {
      case 'enter': case 'idle': case 'retreat': case 'knock':
        b.x = lerp(b.x, homeX, sdt * 3); b.y = lerp(b.y, hover, sdt * 2.5);
        if (b.st !== 'idle' && b.t > 0.6) b.st = 'idle';
        b.cd -= sdt;
        if (b.cd <= 0 && b.st === 'idle') {
          const r = Math.random();
          if (r < 0.45) { // 번개 줄: 아래(점프) / 위(가만히), 화나면 두 번
            const low = { y0: GROUND - 70, y1: GROUND + 6, lane: 'low' }, high = { y0: CEIL + 10, y1: GROUND - 78, lane: 'high' };
            const first = Math.random() < 0.55 ? low : high;
            G.sweeps.push({ ...first, t: 0.95, x: W + 60, on: false, zap: true });
            if (b.rage) G.sweeps.push({ ...(first === low ? high : low), t: 1.7, x: W + 60, on: false, zap: true });
            sfx.bolt(); b.cd = rand(2.8, 3.6);
          } else if (r < 0.7) { // 새끼 해파리(밟으면 통통)
            for (let i = 0; i < (b.rage ? 3 : 2); i++) addEnemy({ type: 'jelly', x: b.x - 60 - i * 90, y: GC() - 6, baseY: GC() - 6, r: 16, amp: 4, vx: -160, t: 0, ph: 0, run: true, noSp: true });
            snd('bubble', 0.8); b.cd = rand(2, 2.8);
          } else { b.st = 'windup'; b.t = 0; snd('charge', 0.9); }
        }
        break;
      case 'windup': b.x = homeX + Math.sin(b.t * 60) * 3; if (b.t > 0.7) { b.st = 'lunge'; b.t = 0; snd('lunge', 1); } break;
      case 'lunge': b.x -= 700 * sdt; b.y = lerp(b.y, GROUND - 76, sdt * 8); if (b.x < -220) { b.x = W + 220; b.st = 'enter'; b.t = 0; b.cd = rand(2, 3); } break; // 낮게 휩쓸고 지나감: 점프로 넘거나 머리 밟기
    }
  } else if (b.kind === 'crab') { // 왕꽃게: 쿵(모래 파도) · 집게 던지기(머리 높이) · 옆걸음 돌진
    const ground = Math.min(maxY, GROUND - 58 * kS + 4);
    switch (b.st) {
      case 'enter': case 'idle': case 'knock': case 'retreat':
        b.x = lerp(b.x, homeX + Math.sin(b.t * 2) * 20, sdt * 3); b.y = lerp(b.y, ground, sdt * 6);
        if (b.st !== 'idle' && b.t > 0.6) b.st = 'idle';
        b.cd -= sdt;
        if (b.cd <= 0 && b.st === 'idle') {
          const r = Math.random();
          if (r < 0.4) { b.st = 'hop'; b.t = 0; snd('crab', 1); }
          else if (r < 0.7) { for (let i = 0; i < (b.rage ? 3 : 2); i++) later(i * 260, () => { if (G.boss === b && !b.dead) { G.shots.push({ x: b.x - 90, y: HEAD_Y, vx: -560, vy: 0, r: 16, t: 0, style: 'claw' }); snd('swoosh', 0.7, 1.3); } }); b.cd = rand(2, 2.8); }
          else { b.st = 'windup'; b.t = 0; b.laneY = null; sfx.warn(); }
        }
        break;
      case 'hop': b.y = ground - Math.sin(Math.min(1, b.t / 0.55) * Math.PI) * 160; if (b.t > 0.55) { b.y = ground; b.st = 'idle'; b.t = 0; b.cd = rand(2.2, 3); G.hazards.push({ k: 'wave', x: b.x - 90, t: 0 }); if (b.rage) later(420, () => G.hazards.push({ k: 'wave', x: W + 40, t: 0 })); shake = Math.max(shake, 14); snd('thud', 0.8); ring(b.x, GROUND, '#e9d9a8', 160, 0.4, 8); } break;
      case 'windup': b.x = homeX + 30 * b.t + Math.sin(b.t * 70) * 4; if (b.t > 0.8) { b.st = 'charge'; b.t = 0; snd('lunge', 1); } break;
      case 'charge': b.x -= 760 * sdt; if (b.x < -260) { b.x = W + 200; b.st = 'enter'; b.t = 0; b.cd = rand(2.2, 3); } break;
    }
  } else { // 아귀: 어둠 속 미끼 → 덥석 → 잠깐 멈춤(때릴 틈) → 물러남
    switch (b.st) {
      case 'enter': b.x = W + 120; b.st = 'lurk'; b.t = 0; break;
      case 'lurk':
        b.x = lerp(b.x, W + 90, sdt * 3); trackY(140);
        b.shoot -= sdt;
        if (b.shoot <= 0) { b.shoot = 1.6; for (let k = 0; k < (b.rage ? 3 : 1); k++) G.shots.push({ x: W - 30, y: b.y - 60 + (k - (b.rage ? 1 : 0)) * 70, vx: -380, vy: rand(-30, 30), r: 12, t: 0, fake: true }); }
        if (b.t > 2.6) { b.st = 'windup'; b.t = 0; sfx.lunge(); haptic(30); }
        break;
      case 'windup': trackY(200); if (b.t > 0.8) { b.st = 'lunge'; b.t = 0; } break; // (그림: drawBoss 의 띠)
      case 'lunge': b.x -= 900 * sdt; if (b.x < (G.run ? p.x + 130 : W * 0.42)) { b.st = 'bite'; b.t = 0; sfx.lunge(); shake = 10; } break;
      case 'bite': if (b.t > 0.9) { b.st = 'retreat'; b.t = 0; } break;
      case 'retreat': b.x += 700 * sdt; if (b.x > W + 90) { b.st = 'lurk'; b.t = 0; } break;
      case 'knock': b.x += 300 * sdt; if (b.t > 0.6) { b.st = 'retreat'; b.t = 0; } break;
    }
  }
  b.y = clamp(b.y, minY, maxY);
  if (!p.dead && bossHitTest(b, p.x, p.y, p.r * p.scale * (G.run ? 0.7 : 1))) { // 점프 달리기: 큰 적 판정은 너그럽게
    if (G.run && b.ihit <= 0 && p.vy > 60 && !p.onG && p.y < b.y - 24 && !(b.kind === 'angler' && b.st === 'lurk')) stompBoss(b);
    else if (G.boosting > 0 || G.eff.giant > 0 || G.eff.whirl > 0) { if (b.ihit <= 0) bossDamage(); }
    else if (!(b.kind === 'angler' && b.st === 'lurk')) hitPlayer({ type: 'boss' });
  }
}
function bossChip(dmg, x, y) { // 물방울로 조금씩
  const b = G.boss; if (!b || b.dead) return;
  b.hp -= dmg;
  burst(x, y, '#ffffff', 4, 220); hitStar(x, y, false, false); hitNum(x, y - 20, dmg); bossHitFx(b, dmg, false);
  snd('hit', 0.5, rand(0.9, 1.15), 0.07);
  if (b.hp <= 0) { b.hp = 0; bossDamage(0); }
}
function bossDamage(amount = 10) {
  const b = G.boss, p = G.p;
  b.hp -= amount; b.ihit = 0.7; addScore(amount * 300 + (b.hp <= 0 ? 30000 : 0)); if (b.hp > 0) { b.st = 'knock'; b.t = 0; b.x += 70; }
  if (amount) { hitNum(b.x - 40, b.y - 70, amount, true); hitStar(b.x - 50, b.y, true, true); bossHitFx(b, amount, true); hitStop('crit'); }
  p.x -= 90; p.vx = -320;
  freeze = 0.22; shake = 30; flash = 0.45; flashColor = '#ffffff'; zoomTo(1.12);
  burst(b.x - 50, b.y, '#ffe36b', 30, 560); burst(b.x - 50, b.y, '#ffffff', 14, 400);
  ring(b.x - 50, b.y, '#ffe36b', 180, 0.5, 12);
  pop(b.x - 40, b.y - 90, '크게 한 방!', C.yellow, 44, true);
  burstRays(b.x - 50, b.y, '#ffffff', 0.8, 18); edgeFlash('#ff5470', 0.5);
  sfx.bossHit(); haptic([60, 30, 100]);
  // 보스 신음: 맞고 50ms 뒤 「윽!」 — 몸집·종류마다 높낮이(꽃게·해파리 높게, 상어왕 낮게)
  if (b.hp > 0) snd('oof', 0.85, ({ crab: 1.25, jelly: 1.3, octopus: 1.05, angler: 0.95, shark: 0.9 }[b.def.kind] || 1) * (b.def.king ? 0.8 : 1) * rand(0.96, 1.04), 0.2, 0.05);
  if (amount) pop(b.x - 40, b.y - 50, `-${amount}`, '#ff4d6a', 34, true);
  if (b.hp <= 0) {
    b.dead = true; b.deadT = 2.2; b.koAt = T; timeScale = 0.12; freeze = 0.5; zoom = 1.3; G.zoomAt = { x: b.x - 40, y: b.y };
    later(260, () => { if (G.boss === b) { b.shattered = true; shatter('spr_' + BOSS_SPR[G.cfg.boss], b.x, b.y, BOSS_H[BOSS_SPR[G.cfg.boss]], 4, 1.3); playSample('sfx_ko', 1); reaction(4, 'K.O!!'); } });
    flash = 0.9; flashColor = '#ffffff'; shake = 34;
    startCutin('finish', '마무리!!', '', 0.6);
    burstRays(b.x - 40, b.y, C.yellow, 2.4, 32); setTimeout(() => { if (state === 'play') { fireworks(6); reaction(4, b.def.flee ? '도망쳤다!!' : '해냈다!!!'); } }, 700);
    pop(clamp(b.x - 60, 260, W - 260), clamp(b.y - 120, 120, H - 160), '마무리!!', '#ffffff', 70, true);
    setTimeout(() => { if (G && state === 'play') { pop(W / 2, H / 2 - 20, b.def.flee ? '상어왕이 도망쳤어요! 쫓아가요!' : `${b.def.name}을(를) 이겼어요!`, C.yellow, b.def.flee ? 40 : 50, true); sfx.clear(); } }, 900);
    for (let k = 0; k < 4; k++) setTimeout(() => { if (G && G.boss) snd('mineBoom', 0.6, 0.9 + k * 0.08); }, 150 + k * 260);
    for (let i = 0; i < (G.run ? 16 : 26); i++) G.eggsArr.push({ x: b.x, y: b.y, vx: rand(-420, 120), vy: rand(-300, 300), loose: true, gold: i % 9 === 0, t: 0 });
    G.kills++; G.sweeps = []; G.inks.forEach((k) => { k.fade = true; });
    haptic([100, 50, 100, 50, 200]);
  }
}

// ───────── 산호 쉼터: 축복 카드 3장 중 1장 ─────────
function openBless() {
  const pool = BLESSINGS.filter((b) => !(b.k === 'revive' && G.freeRevive));
  G.bless = shuffle(pool).slice(0, 3);
  state = 'bless'; sfx.harp(); haptic([20, 40, 20]);
}
function chooseBless(i) {
  const b = G.bless && G.bless[i]; if (!b) return;
  const p = G.p;
  if (G.blessKind === 'lv') { applyAbility(b); G.bless = null; G.blessKind = null; state = 'play'; p.inv = Math.max(p.inv, 1); releaseRunInput(); pop(W / 2, H / 2 - 60, `${b.name} ★${abStar(b.k)}`, '#ffffff', 36, true); sfx.levelup(); haptic(30); return; }
  switch (b.k) {
    case 'boost': G.boost = 100; break;
    case 'shield': G.shield++; break;
    case 'magnet': G.eff.magnet = 20; break;
    case 'item': G.item = rollItem(); break;
    case 'slow': G.slowMul *= 0.9; break;
    case 'eggs': earn('bless', 25); fountain(W / 2, H / 2, 25); break;
    case 'revive': G.freeRevive = true; break;
    case 'double': G.eff.double = 15; break;
  }
  G.bless = null; state = 'play'; p.inv = Math.max(p.inv, 1.2);
  pop(W / 2, H / 2 - 60, b.name, '#ffffff', 40, true);
  sfx.levelup(); haptic(30);
}

// ───────── 이어하기 ─────────
const reviveCost = () => (G.freeRevive ? 0 : Math.round(40 * Math.pow(2, G.revives) * G.D.revive * (hasPerk('reviveCheap') ? 0.5 : 1)));
// 이어하기는 「이번 판에서 모은 진주」로만 — 모아 둔 진주는 보석으로 살 수 있어서, 그걸 쓰면 이어하기를 간접으로 파는 셈(조사 규칙: 목숨·이어하기 판매 금지)
const canRevive = () => G.revives < 3 && (G.freeRevive || G.eggs >= reviveCost());
function doRevive() {
  if (!canRevive()) { sfx.no(); return; }
  const cost = reviveCost();
  G.eggs -= cost;
  if (G.freeRevive) G.freeRevive = false;
  G.revives++;
  const p = G.p;
  Object.assign(p, { dead: false, vy: 0, vx: 0, x: 170, y: H / 2, rot: 0, inv: 2.6, flip: 0 });
  if (G.run) { Object.assign(p, { x: PX(), fy: GROUND, onG: true, jumps: 0, slide: false, r: STAND_R }); p.y = GROUND - STAND_R; G.en = G.enShow = G.maxEn; G.obs = G.obs.filter((o) => o.k !== 'pillar'); releaseRunInput(); }
  setFace('boost', 1);
  for (const e of G.enemies) { burst(e.x, e.y, (ENEMIES[e.type] || {}).color || '#fff', 10); e.dead = true; }
  G.enemies = []; G.shots = []; G.warns = []; G.sweeps = []; G.inks.forEach((k) => { k.fade = true; });
  if (G.boss && !G.boss.dead) { G.boss.st = 'enter'; G.boss.x = W + 240; }
  G.boost = Math.max(G.boost, 60);
  ring(p.x, p.y, '#7dffb0', 420, 0.7, 14); flash = 0.5; flashColor = '#ffffff'; zoomTo(1.08);
  pop(W / 2, H / 2 - 60, '다시 일어났어요!', C.ok, 48, true);
  sfx.revive(); haptic([40, 40, 80]);
  state = 'play';
}
function giveUp() { bank(false); state = 'dead'; G.deadT = 0; }

// ───────── 한 판 진행 ─────────
function updatePlay(dt) {
  const p = G.p, cfg = G.cfg, E = G.eff;
  G.t += dt;
  juiceUpdate(dt); trailTick(dt);
  if (G.run && tryOpenLevelUp()) return;
  if (G.intro > 0) G.intro -= dt;
  for (const k in E) if (E[k] > 0) E[k] -= dt;
  if (G.jellySafe > 0) G.jellySafe -= dt;
  if (G.itemPop > 0) G.itemPop -= dt;
  const bossFight = G.boss && !G.boss.dead;
  const whirling = E.whirl > 0;
  const scroll = cfg.speed * G.slowMul * (G.boosting > 0 || whirling ? 2.3 : 1) * (bossFight ? 0.55 : 1) * (p.dead ? 0.3 : 1) * (G.wallStop ? 0 : 1); // 벽에 막히면 멈춤
  if (!G.bonus) G.dist += scroll * dt; // 보너스 바다 동안은 진행도가 멈춤(끝·보스가 안 끼어들게)
  updateBubbles(dt, scroll);
  p.scale = lerp(p.scale, E.giant > 0 ? 1.75 : 1, Math.min(1, dt * 8));

  // 질주·바다 축제
  if (G.boosting > 0) {
    G.boosting -= dt;
    if (Math.random() < dt * 60) fx.push({ k: 'flame', x: p.x - 22 + rand(-10, 10), y: p.y + rand(-26, 26), vx: rand(-320, -160), vy: rand(-40, 20), life: 0.42, max: 0.42, size: rand(6, 12), color: pick(['#7c4dff', '#4fc3ff', '#b388ff', '#e0d4ff']) });
    if (G.boosting <= 0) { p.inv = Math.max(p.inv, 0.9); pop(p.x, p.y - 56, '질주 끝', '#cfd8ff', 18); }
  } else if (!p.dead) {
    const before = G.boost;
    G.boost = Math.min(BMAX(), G.boost + (cfg.boostRate + (bossFight ? 12 : 0)) * dt * (1 + abStar('ult') * 0.25));
    if (Math.floor(before / 100) < Math.floor(G.boost / 100)) { const lv = Math.floor(G.boost / 100); pop(p.x, p.y - 60, G.run ? (lv >= 3 ? '필살 3단!! 황금 터틀이' : lv === 2 ? '필살 2단! 그림자 군단' : '필살 1단 준비!') : '질주 준비!', lv >= 2 ? '#ffd54a' : '#d9c6ff', 26); haptic(15); } // 게이지가 찰 때는 소리 없음(대표: 거슬림) — 글자·진동·단추 빛만
  }
  if (G.comboT > 0) G.comboT -= dt;
  if (G.chainT > 0) {
    G.chainT -= dt;
    if (G.chainT <= 0) {
      if (G.chain >= 3) { const bonus = G.chain * 2; earn('chain', bonus); pop(W / 2, H / 2 + 30, `${G.chain}연속 처치! 진주 +${bonus}`, C.yellow, 34, true); sfx.mission(); }
      G.chain = 0;
    }
  }
  if (G.feverT > 0) {
    G.feverT -= dt; G.feverEggT -= dt;
    if (G.feverEggT <= 0 && !p.dead) { G.feverEggT = G.run ? 0.85 : 0.5; spawnEggRain(); }
    if (G.feverT <= 0) {
      musicFever = false;
      if (G.feverEggs > 0) { pop(W / 2, H / 2 - 40, `바다 축제 +${G.feverEggs}!`, C.yellow, 46, true); fountain(G.p.x, G.p.y, G.feverEggs); sfx.gift(); haptic([20, 20, 40]); }
      G.feverEggs = 0;
    }
  } else if (G.comboT <= 0) G.fever = Math.max(0, G.fever - 9 * dt);

  // 골인 연출
  if (G.won) {
    G.winT -= dt;
    p.x += 380 * dt;
    if (G.run) { p.fy = GROUND - Math.abs(Math.sin(G.winT * 7)) * 90; p.y = p.fy - p.r; p.onG = false; } // 신나서 통통
    else p.y = lerp(p.y, H / 2 - 30, dt * 3);
    p.flip = Math.min(Math.PI * 2, p.flip + dt * 11); p.ph += dt * 16;
    if (Math.random() < dt * 30) fx.push({ k: 'bub', x: p.x - 40, y: p.y + rand(-8, 8), vx: rand(-160, -80), vy: rand(-40, 0), life: 0.8, max: 0.8, size: rand(2, 5) });
    if (G.pet) { G.pet.x = lerp(G.pet.x, p.x - 62, dt * 6); G.pet.y = lerp(G.pet.y, p.y - 54, dt * 6); }
    if (G.winT <= 0) finishClear();
    return;
  }
  // 등장
  if (G.enterT > 0) {
    G.enterT -= dt;
    if (G.enterT <= 0) { pop(W / 2, H / 2 - 30, '출발!', C.yellow, 76, true); sfx.ready(); say('go', true); haptic([20, 30, 50]); zoomTo(1.04); }
    const k = 1 - Math.max(0, G.enterT) / 0.8;
    p.x = lerp(-90, G.run ? PX() : 170 + SAFE, 1 - (1 - k) * (1 - k)); p.ph += dt * 18;
  }
  p.ph += dt * (G.boosting > 0 ? 22 : 8 + Math.hypot(p.vx, p.vy) / 60);
  p.blinkT -= dt; if (p.blinkT < -0.13) p.blinkT = rand(1.8, 4.2);
  if (p.faceT > 0) { p.faceT -= dt; if (p.faceT <= 0) p.face = 'normal'; }
  {
    let bd = 1e9;
    for (const e of G.enemies) { const dx = e.x - p.x; if (dx > -30 && dx < 380 && !harmless(e)) bd = Math.min(bd, dx * dx + (e.y - p.y) ** 2); }
    if (bossFight) bd = Math.min(bd, (G.boss.x - p.x) ** 2 + (G.boss.y - p.y) ** 2);
    p.scared = bd < 150 * 150;
  }
  if (!p.dead) {
    p.wakeT -= dt;
    if (p.wakeT <= 0) { p.wakeT = G.boosting > 0 ? 0.03 : 0.11; fx.push({ k: 'bub', x: p.x - 48 * p.scale, y: p.y + rand(-4, 14), vx: rand(-140, -60), vy: rand(-30, 10), life: 0.9, max: 0.9, size: rand(1.8, 4.2) }); }
  }
  // 펫
  if (G.pet) {
    const pt = G.pet;
    pt.t += dt;
    pt.x = lerp(pt.x, p.x - 66, Math.min(1, dt * 6)); pt.y = lerp(pt.y, p.y - 56 + Math.sin(pt.t * 3) * 6, Math.min(1, dt * 6));
    if (petIs('robot') && !p.dead && G.enterT <= 0) {
      pt.zapT -= dt;
      if (pt.zapT <= 0) {
        const tgt = G.enemies.filter((e) => !e.dead && e.x > p.x && e.x < W - 20).sort((a, b) => a.x - b.x)[0];
        if (tgt) { fx.push({ k: 'laser', x: pt.x + 14, y: pt.y, x2: tgt.x, y2: tgt.y, life: 0.25, max: 0.25 }); killEnemy(tgt, 'pet'); pt.zapT = 9 - petLv(); }
        else pt.zapT = 0.5;
      }
    }
  }
  // 거북이 움직임
  if (G.enterT > 0) { /* 들어오는 중엔 조작 없음 */ }
  else if (!p.dead && G.run) {
    runMove(dt);
    p.inv -= dt;
    if (G.boosting > 0 || whirling) { p.trail.unshift({ x: p.x, y: p.fy - HERO_H * p.scale * 0.43 - 4, rot: p.rot }); if (p.trail.length > 9) p.trail.pop(); }
    else if (p.trail.length) p.trail.pop();
  } else if (!p.dead) {
    let ix = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    let iy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
    if (drag) {
      moveByFinger(); p.vx *= 0.5; p.vy *= 0.5; // 손가락 이동은 moveByFinger 가 바로 처리 (여기선 기울기용 속도만 줄임)
    } else {
      if (ix && iy) { ix *= 0.7071; iy *= 0.7071; }
      const sp = 440 * (petIs('rabbit') ? 1 + petLv() * 0.05 : 1), a = Math.min(1, dt * 16);
      p.vx += (ix * sp - p.vx) * a; p.vy += (iy * sp - p.vy) * a;
    }
    if (whirling) p.vx = lerp(p.vx, (E.whirl > 1 ? 640 - p.x : 220 - p.x) * 4, Math.min(1, dt * 6));
    const maxX = G.boosting > 0 || whirling ? 820 : 470;
    if (G.grabT > 0 && G.boosting <= 0) { p.vx *= 0.4; p.vy *= 0.4; p.x -= 40 * dt; }
    if (!drag) { p.x += p.vx * dt; p.y += p.vy * dt; }
    p.x = Math.max(50 + SAFE, p.x);
    if (p.x > maxX) p.x = lerp(p.x, maxX, Math.min(1, dt * 6));
    const rs = p.r * p.scale;
    p.y = clamp(p.y, CEIL + rs + 2, SEABED - rs - 4);
    p.rot = lerp(p.rot, clamp(p.vy * 0.0011, -0.45, 0.45) + (whirling ? Math.sin(G.t * 30) * 0.4 : 0), Math.min(1, dt * 10));
    p.inv -= dt;
    if (G.boosting > 0 || whirling) { p.trail.unshift({ x: p.x, y: p.y, rot: p.rot }); if (p.trail.length > 9) p.trail.pop(); }
    else if (p.trail.length) p.trail.pop();
  } else {
    p.vy += 700 * dt; p.y += p.vy * dt; p.x -= 40 * dt; p.rot += dt * 9;
    G.deathT -= dt;
    if (G.deathT <= 0) {
      if (G.revives < 3) { state = 'revive'; G.reviveT = 5; G.reviveTick = 5; }
      else giveUp();
    }
  }

  // 산호 쉼터
  if (!p.dead && !G.blessDone && !cfg.endless && G.dist >= cfg.length * 0.5) { G.blessDone = true; openBless(); return; }
  if (!p.dead && cfg.endless && meters() >= G.nextBless) { G.nextBless += 2000; openBless(); return; }

  // 생성
  const finishing = !cfg.endless && G.dist >= cfg.length;
  // 막판 긴장: 85% 지점에서 한 번 「조금만 더!」 + 금빛 테두리 + 올라가는 소리
  if (!p.dead && !cfg.endless && !G.lastPush && !G.tut && G.dist >= cfg.length * 0.85 && !finishing) {
    G.lastPush = true; reaction(2, cfg.boss ? '보스가 가까워졌어!' : '조금만 더!'); edgeFlash(cfg.boss ? '#ff5470' : '#ffd54a', 1.1);
    snd('ready', 0.7); snd('ready', 0.6, 1.26, 0, 0.12); // 마림바 두 음(상승음 대신)
  }
  if (!p.dead) {
    const D = G.D;
    if (G.run) {
      runCourse();
      if (bossFight) { G.eggT -= dt; if (G.eggT <= 0) { G.eggT = rand(2.2, 3.2); eggArc(W + 40, jumpW(), rand(90, 170), 6); } }
    } else if (!finishing && !bossFight && G.bossWarnT == null) {
      G.spawnT -= dt;
      if (G.spawnT <= 0) {
        const gap = cfg.endless ? Math.max(0.33, 0.9 - G.dist / 45000) * D.gap : cfg.gap;
        G.spawnT = gap * rand(0.75, 1.3);
        spawnEnemy(pick(cfg.pool));
        if ((G.n >= 18 || (cfg.endless && G.dist > 15000)) && Math.random() < 0.22) spawnEnemy(pick(cfg.pool));
      }
      G.eggT -= dt;
      if (G.eggT <= 0) { G.eggT = rand(1.1, 1.9); spawnEggs(); }
    } else if (bossFight) {
      G.eggT -= dt;
      if (G.eggT <= 0) { G.eggT = rand(2.2, 3.2); spawnEggs(); }
    }
    G.boxT -= dt * (petIs('puppy') ? 1 + petLv() * 0.15 : 1) * (bossFight ? 1.6 : 1);
    if (G.boxT <= 0 && !finishing && (!G.run || bossFight)) { G.boxT = rand(9, 13); G.boxes.push({ x: W + 40, y: G.run ? GROUND - rand(60, 200) : rand(CEIL + 70, SEABED - 70), t: 0 }); }
    if (finishing && cfg.boss && !G.boss && !G.bossDone) {
      if (G.bossWarnT == null) { G.bossWarnT = 2.4; sfx.siren(); haptic([60, 60, 60, 60, 60]); }
      else { G.bossWarnT -= dt; if (G.bossWarnT <= 0) spawnBoss(); }
    } else if (finishing && G.bossDone && !G.goal) G.goal = { x: W + 140 };
  }

  // 경고 → 등장
  for (const w of G.warns) {
    w.t -= dt;
    if (w.kind === 'shark' && !w.run) w.y = lerp(w.y, clamp(p.y, CEIL + 40, SEABED - 40), dt * 1.6);
    if (w.t <= 0) {
      w.done = true;
      const e = w.kind === 'shark'
        ? { type: 'shark', x: W + 80, y: w.y, r: 20, vx: -230 - (cfg.endless ? 60 : Math.min(G.n, 30) * 4), t: 0, elite: w.elite, run: w.run }
        : w.kind === 'sword' ? { type: 'swordfish', x: W + 60, y: w.y, r: 18, vx: w.run ? -760 : -1050, t: 0, elite: w.elite, run: w.run }
          : { type: 'eel', x: W + 40, y: w.y, r: 12, vx: w.run ? -700 : -950, len: 150, t: 0, elite: w.elite, run: w.run };
      if (e.elite) { e.r *= 1.2; e.vx *= 1.2; }
      addEnemy(e); snd('dash', 0.8, rand(0.95, 1.1), 0.15); // 일직선 돌진: 깨끗한 「슝」
    }
  }
  G.warns = G.warns.filter((w) => !w.done);

  // 적
  const fz = E.freeze > 0 ? 0.3 : 1;
  if (!p.dead && G.enterT <= 0) trySpecials(dt);
  updateHazards(dt);
  if (G.run) { updateObs(dt, scroll); updateTutor(); }
  updateShooting(dt, scroll);
  for (const e of G.enemies) {
    if (e.ent) { // 판마다 다른 등장: 거북이 앞 1.5초 거리에서 시작, 0.38초
      if (e.ent.t < 0 && e.x - p.x < Math.max(560, runSpd() * 1.5)) {
        e.ent.t = 0;
        if (e.ent.k === 'rise') { for (let i = 0; i < 10; i++) fx.push({ k: 'spark', x: e.x + rand(-18, 18), y: GROUND - 2, vx: rand(-120, 120), vy: rand(-260, -80), life: 0.4, max: 0.4, size: rand(3, 5), color: '#e9d9a8' }); }
        else if (e.ent.k === 'pop') ring(e.x, e.y, '#ffffff', 50, 0.3, 4);
      } else if (e.ent.t >= 0) {
        const was = e.ent.t; e.ent.t += dt;
        if (e.ent.k === 'drop' && was < 0.38 && e.ent.t >= 0.38) { shake = Math.max(shake, 3); for (let i = 0; i < 8; i++) fx.push({ k: 'bub', x: e.x + rand(-20, 20), y: e.y + e.r, vx: rand(-140, 140), vy: rand(-90, -20), life: 0.4, max: 0.4, size: rand(2, 4) }); }
        if (e.ent.t > 0.7) e.ent = null;
      }
    }
    e.frozen = E.freeze > 0;
    if (e.x < W) dexSee(e.type);
    if (e.stun > 0) { e.stun -= dt; e.x -= scroll * dt; continue; }
    if (e.sp && !e.sp.done) { // 필살기 준비: 떨면서 빨간 기운 (그 자리에서 버팀)
      e.sp.t += dt; e.x -= scroll * 0.35 * dt;
      if (e.sp.t >= e.sp.wind) { e.sp.done = true; runSpecial(e); }
      if (e.dead) continue;
    }
    if (e.rage > 0) { e.rage -= dt; e.zigT -= dt; if (e.zigT <= 0) { e.zigT = G.run ? 0.6 : 0.32; e.zigY = G.run ? (e.zigY === GROUND - 24 ? HEAD_Y : GROUND - 24) : clamp(p.y + rand(-80, 80), CEIL + 40, SEABED - 40); } e.y = lerp(e.y, e.zigY, Math.min(1, dt * 7)); if (Math.random() < dt * 40) fx.push({ k: 'flame', x: e.x + 30, y: e.y + rand(-14, 14), vx: rand(80, 200), vy: rand(-30, 30), life: 0.35, max: 0.35, size: rand(5, 10), color: pick(['#ff4d6a', '#ff8a3c']) }); }
    if (e.spark > 0) { e.spark -= dt; if (Math.random() < dt * 30) fx.push({ k: 'spark', x: e.x, y: e.y, vx: rand(-60, 60), vy: rand(-60, 60), life: 0.4, max: 0.4, size: 3, color: '#bfe8ff' }); }
    if (e.big > 0 && e.type === 'whirlpool') e.big -= dt;
    if (e.roll > 0) { e.roll -= dt; e.spin = 0.2; e.y = lerp(e.y, SEABED - 18, dt * 4); }
    if (e.bounce > 0) { e.bounce -= dt; e.y += e.vy2 * dt; if (e.y < CEIL + 30 || e.y > SEABED - 30) { e.vy2 *= -1; snd('boing', 0.5, 1, 0.1); } }
    if (e.dive > 0) { e.dive -= dt; if (Math.random() < dt * 30) fx.push({ k: 'spark', x: e.x + 20, y: e.y, vx: rand(60, 160), vy: rand(-40, 40), life: 0.3, max: 0.3, size: 3, color: '#bfe8ff' }); }
    if (e.homing > 0) { e.homing -= dt; e.y = lerp(e.y, p.y, dt * 1.5); e.baseY = e.y; e.x -= 60 * dt; if (e.homing <= 0) { e.armed = true; e.armT = 0.2; e.big = true; } }
    if (e.spin > 0) e.spin -= dt;
    const edt = dt * fz;
    e.t += edt;
    e.x += (-scroll + e.vx * fz) * dt;
    switch (e.type) {
      case 'jelly': e.y = e.baseY + Math.sin(e.t * 2.2 + e.ph) * e.amp; break;
      case 'shark': if (!e.run && e.x > p.x + 140) e.y += clamp(p.y - e.y, -1, 1) * Math.min(80, Math.abs(p.y - e.y) * 1.4) * edt; break;
      case 'puffer': { const d = Math.hypot(e.x - p.x, e.y - p.y); e.r = lerp(e.r, d < 175 ? 36 : 15, Math.min(1, edt * 6)); if (!e.run) e.y += Math.sin(e.t * 1.6 + e.ph) * 22 * edt; else e.y = GROUND - e.r * 1.1; break; } // 점프 달리기: 바닥에 붙어서 부풂(항상 같은 타이밍)
      case 'octopus':
        e.y = e.baseY + Math.sin(e.t * 1.8 + e.ph) * 26;
        e.inkT -= edt;
        if (e.inkT <= 0 && e.x < W - 60 && e.x > p.x + 80 && E.lamp <= 0) { e.inkT = rand(2.2, 3.2); G.inks.push({ x: e.x - 50, y: e.y, r: 72, a: 0.95, t: 0, vx: -110 }); sfx.ink(); }
        break;
      case 'angler':
        if (!e.lunge && e.x - p.x < (e.run ? 330 : 240) && e.x > p.x) { e.lunge = true; e.vx = e.run ? -380 : -520; e.vy = e.run ? 0 : clamp((p.y - e.y) * 2, -260, 260); sfx.lunge(); }
        if (e.lunge) e.y += (e.vy || 0) * edt;
        break;
      case 'ray': e.y = e.baseY + Math.sin(e.t * 2.5 + e.ph) * e.amp; break;
      case 'phantom': {
        const cyc = (e.t + e.ph) % 2.4, show = cyc < 1.3;
        if (!show && e.vis > 0.5 && !e.run) e.baseY = clamp(e.baseY + rand(-90, 90), CEIL + 60, SEABED - 60); // 사라질 때 자리 옮김
        e.vis = lerp(e.vis, show || E.lamp > 0 ? 1 : 0.08, Math.min(1, edt * 8));
        e.y = e.baseY + Math.sin(e.t * 2 + e.ph) * e.amp * 0.5;
        break;
      }
      case 'crab':
        if (!e.jumped && e.x - p.x < 250 && e.x > p.x) { e.jumped = true; e.vy = e.top ? 560 : -580; sfx.crab(); }
        if (e.jumped) {
          e.vy += (e.top ? -1000 : 1000) * edt; e.y += e.vy * edt;
          if ((!e.top && e.y >= e.floor) || (e.top && e.y <= e.floor)) { e.y = e.floor; e.vy = 0; }
        }
        break;
      case 'mine': {
        e.y = e.baseY + Math.sin(e.t * 2 + e.ph) * 8;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (!e.armed && d < (e.run ? 0 : 130) && !p.dead) { e.armed = true; e.armT = 0.75; }
        if (e.armed) {
          e.armT -= edt; e.beepT -= edt;
          if (e.beepT <= 0) { e.beepT = 0.12; sfx.beep(); }
          if (e.armT <= 0) {
            e.dead = true; sfx.mineBoom(); shake = 18; flash = 0.3; flashColor = '#ffb070';
            burst(e.x, e.y, '#ffb070', 36, 520); ring(e.x, e.y, '#ff5470', 120, 0.5, 10);
            const BR = e.run ? 70 : e.big ? 170 : 110;
            if (e.big) { ring(e.x, e.y, '#ffb070', 200, 0.6, 14); burstRays(e.x, e.y, '#ff8a3c', 0.8, 16); for (const o of G.enemies) if (o !== e && o.type === 'mine' && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 300) { o.armed = true; o.armT = 0.18; o.big = true; } }
            if (Math.hypot(e.x - p.x, e.y - p.y) < BR + p.r * p.scale && !p.dead) {
              if (G.boosting > 0 || E.giant > 0) weakHit(e, false); else hitPlayer(e);
            }
          }
        }
        break;
      }
      case 'whirlpool': {
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
        const PR = e.big > 0 ? 270 : 140, PF = e.big > 0 ? 470 : 260;
        if (d < PR && d > 1 && !p.dead && G.boosting <= 0 && !whirling && E.giant <= 0) {
          const f = PF * (1 - d / PR) * dt;
          p.x += dx / d * f; p.y += dy / d * f; p.rot += 0.05;
        }
        break;
      }
    }
    if (p.dead || e.dead) continue;
    const pr = p.r * p.scale;
    if (enemyHits(e, p.x, p.y, pr)) {
      if (G.run && G.boosting <= 0 && !whirling && E.giant <= 0 && canStomp(e) && stomp(e)) continue;
      if (G.run && e.type === 'mine' && !(G.boosting > 0 || E.giant > 0 || whirling)) { e.armed = true; e.armT = 0; continue; }
      if (G.boosting > 0) killEnemy(e, 'boost');
      else if (whirling) killEnemy(e, 'whirl');
      else if (E.giant > 0) killEnemy(e, 'giant');
      else if (harmless(e)) killEnemy(e, e.frozen && ENEMIES[e.type].weak === 'freeze' ? 'freeze' : 'lamp');
      else if ((e.type === 'jelly' || e.type === 'swordfish') && G.jellySafe > 0) killEnemy(e, 'bubble');
      else if (e.type !== 'mine') hitPlayer(e);
    } else if (G.boosting <= 0 && !harmless(e)) {
      if (enemyHits(e, p.x, p.y, pr + 10)) e.wasClose = true;
      else if (enemyHits(e, p.x, p.y, pr + 28)) e.wasNear = true;
    }
    if ((e.wasNear || e.wasClose) && !e.nearDone && e.x + (e.len || 0) < p.x - 40) {
      e.nearDone = true;
      if (p.inv <= 0) {
        G.near++; track('near');
        if (e.wasClose) {
          G.perfect++; G.boost = Math.min(BMAX(), G.boost + 14); timeScale = 0.7; zoomTo(1.03);
          pop(p.x, p.y - 52, G.run ? (p.onG ? (p.slide ? '완벽 숙이기!' : '완벽 회피!') : '완벽 점프!') : '완벽 회피!', C.yellow, 34); sfx.perfect(); haptic(20); edgeFlash('#ffffff', 0.4);
        } else {
          G.boost = Math.min(BMAX(), G.boost + 7);
          if (!G.run) { pop(p.x, p.y - 48, pick(['아슬아슬!', '휴~ 살았다!', '나이스 회피!']), '#7cf0ff', 22); sfx.near(); }
        }
      }
    }
  }
  G.enemies = G.enemies.filter((e) => !e.dead && e.x + (e.len || 0) > -170);

  // 먹물
  for (const k of G.inks) {
    k.t += dt; k.x += (k.vx - scroll * 0.4) * dt; k.r = Math.min(k.r + 30 * dt, 120);
    k.a -= dt * (k.fade || E.lamp > 0 ? 2.5 : 0.12);
  }
  G.inks = G.inks.filter((k) => k.a > 0.02 && k.x > -150);
  // 문어 다리 휘두르기
  for (const s of G.sweeps) {
    if (!s.on) { s.t -= dt; if (s.t <= 0) { s.on = true; if (s.zap) { sfx.bolt(); snd('swoosh', 0.5, 1.4); } else sfx.swoosh(); shake = 8; } continue; } // 번개는 번개 소리, 문어 다리는 휘익
    s.x -= 1200 * dt;
    if (!p.dead && p.y > s.y0 - p.r && p.y < s.y1 + p.r && Math.abs(p.x - s.x) < 60) {
      if (!(G.boosting > 0 || E.giant > 0 || whirling)) hitPlayer({ type: 'boss' });
    }
  }
  G.sweeps = G.sweeps.filter((s) => !s.on || s.x > -260);

  // 보스 탄
  for (const s of G.shots) {
    s.t += dt; s.x += (s.vx * (E.freeze > 0 ? 0.4 : 1) - scroll * 0.2) * dt; s.y += s.vy * dt; s.vy *= 1 - dt;
    if (!p.dead && circ(s.x, s.y, s.r, p.x, p.y, p.r * p.scale)) {
      if (G.boosting > 0 || E.giant > 0 || whirling) { s.dead = true; burst(s.x, s.y, '#ff8aa0', 12); sfx.smash(); }
      else { s.dead = true; hitPlayer(s); }
    }
  }
  G.shots = G.shots.filter((s) => !s.dead && s.x > -40 && s.x < W + 80 && s.y > -80 && s.y < H + 80);
  if (G.boss) updateBoss(dt);

  // 아이템 상자
  for (const b of G.boxes) {
    b.t += dt; b.x -= scroll * dt;
    if (G.run && !p.dead) { const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < 130) { const k = Math.min(1, dt * 7); b.x += (p.x - b.x) * k; b.y += (p.y - b.y) * k; } } // 가까우면 끌려옴
    if (!p.dead && circ(b.x, b.y, G.run ? 36 : 24, p.x, p.y, p.r * p.scale)) pickupBox(b);
  }
  G.boxes = G.boxes.filter((b) => !b.got && b.x > -40);

  // 알
  const magR = Math.max([0, 75, 125, 185][save.up.magnet] + (petIs('chick') ? 40 + petLv() * 20 : 0) + abStar('magnet') * 70, G.boosting > 0 || G.feverT > 0 ? 150 : 0, E.magnet > 0 ? 270 : 0);
  for (const e of G.eggsArr) {
    e.t += dt;
    if (e.loose) { e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 1 - dt * 2; e.vy *= 1 - dt * 2; e.y = clamp(e.y, CEIL + 20, SEABED - 20); }
    e.x -= scroll * dt;
    if (p.dead) continue;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
    if (d < magR || (e.loose && d < 220)) { const s = 700 * dt / Math.max(d, 1); e.x += dx * Math.min(1, s); e.y += dy * Math.min(1, s); }
    if (d < p.r * p.scale + 16) collectEgg(e);
  }
  G.eggsArr = G.eggsArr.filter((e) => !e.got && e.x > -30);

  // 골
  if (G.goal) {
    G.goal.x -= scroll * dt;
    if (!p.dead && p.x > G.goal.x + 20) levelClear(); // 문 한가운데를 지나갈 때
  }
}
// 도착 문 높이 보너스(인기 게임 깃대처럼): 문 한가운데를 지날 때의 높이로 1~5단계
const GOAL_BAND = [{ pearl: 2, score: 1000 }, { pearl: 4, score: 2000 }, { pearl: 6, score: 4000 }, { pearl: 10, score: 8000 }, { pearl: 20, score: 20000 }];
function goalBand() { return G.run ? clamp(Math.ceil((GROUND - G.p.fy) / 58), 1, 5) : 0; }
function levelClear() {
  if (G.run && G.goal && G.n !== LAST) {
    const band = goalBand(), gb = GOAL_BAND[band - 1]; G.goalBand = band;
    earn('goal', gb.pearl); addScore(gb.score);
    later(350, () => pop(W / 2, H / 2 + 10, band === 5 ? `완벽!! 진주 +${gb.pearl}` : `높이 ${band}단계 · 진주 +${gb.pearl}`, band === 5 ? '#ffe14a' : '#ffffff', band === 5 ? 44 : 32, true));
    for (let i = 0; i < band; i++) later(500 + i * 220, () => { fireworks(1); snd('firework', 0.7, 1 + i * 0.1); });
  }
  addScore(10000 + (G.run ? Math.round(G.en) * 100 : 0)); // 도착 보너스 + 남은 기운
  G.won = true; G.winT = 1.1; G.p.inv = 99; G.p.flip = 0;
  setFace('happy', 9);
  for (const e of G.enemies) { burst(e.x, e.y, (ENEMIES[e.type] || {}).color || '#fff', 10); e.dead = true; }
  G.enemies = []; G.shots = []; G.warns = []; G.sweeps = [];
  pop(W / 2, H / 2 - 60, G.n === LAST ? '공주님!' : '도착!', C.yellow, 60, true);
  shake = 6; sfx.ready(); say('clear', true); haptic([30, 40, 60]);
  fireworks(5); burstRays(G.p.x, G.p.y, C.yellow, 1.2, 24);
}
function finishClear() {
  bank(true);
  endT = 0; G.starShown = 0;
  shake = 8; flash = 0.4; flashColor = '#fff6c0';
  confetti();
  sfx.clear(); musicFever = false;
  if (G.n === LAST) { save.cleared = true; persist(); state = 'ending'; setMusic('ending'); G.talkI = 0; G.talkShown = 0; G.talkAt = 1.8; }
  else { state = 'clear'; setMusic('map'); }
}

// ───────── 그리기: 한 판 ─────────
function drawGoal(gx) {
  if (G.n === LAST) {
    const y = H / 2 + Math.sin(T * 2) * 8;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(gx + 50, y, 10, gx + 50, y, 120);
    g.addColorStop(0, 'rgba(255,200,240,.55)'); g.addColorStop(1, 'rgba(255,200,240,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx + 50, y, 120, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    drawImg(IMG.princess, gx + 50, y, 120, -0.05, 1, true);
    if (!drawImg(IMG.spr_bubble_cage, gx + 50, y, 190 + Math.sin(T * 4) * 4)) { ctx.strokeStyle = 'rgba(200,240,255,.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(gx + 50, y, 78, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(200,240,255,.12)'; ctx.fill(); } // 마지막 바다: 거품 감옥 속 공주님
    text('도와줘요!', gx + 50, y - 100, 22, '#ffd1ef');
    return;
  }
  // 도착 문: 코덱스 그림(산호 아치) + 뒤에서 도는 빛 + 올라가는 거품 + 반짝이
  const cx = gx + 20, base = SEABED + 6, gh = 300;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(cx, base - gh * 0.55, 20, cx, base - gh * 0.55, gh * 0.75);
  gl.addColorStop(0, 'rgba(255,240,170,.45)'); gl.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, base - gh * 0.55, gh * 0.75, 0, Math.PI * 2); ctx.fill();
  if (!LOWFX) for (let i = 0; i < 10; i++) {
    const a = T * 0.5 + i * Math.PI / 5;
    ctx.fillStyle = 'rgba(255,245,200,.07)'; ctx.beginPath(); ctx.moveTo(cx, base - gh * 0.55);
    ctx.arc(cx, base - gh * 0.55, gh * 0.9, a, a + 0.16); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  if (!drawImg(IMG.spr_goal_gate, cx, base - gh / 2 + Math.sin(T * 2) * 2, gh)) {
    // 그림이 아직 안 왔을 때: 산호 아치 모양(막대 아님)
    ctx.strokeStyle = '#ff7f9e'; ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, base - 150, 95, Math.PI, 0); ctx.lineTo(cx + 95, base); ctx.moveTo(cx - 95, base - 150); ctx.lineTo(cx - 95, base); ctx.stroke();
  }
  for (let i = 0; i < 7; i++) { // 거품
    const k = (T * 0.35 + i / 7) % 1, bx = cx + Math.sin(i * 3.1 + T * 2) * 70, by = base - k * gh * 1.1;
    ctx.strokeStyle = `rgba(220,250,255,${0.7 * (1 - k)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, 4 + (i % 3) * 3, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 6; i++) { // 반짝이
    const a = i * 1.05 + T * 0.8, s = 0.5 + 0.5 * Math.sin(T * 5 + i * 2);
    const sx = cx + Math.cos(a) * 120, sy = base - gh * 0.55 + Math.sin(a) * 120;
    ctx.fillStyle = `rgba(255,250,210,${s})`; ctx.beginPath();
    for (let j = 0; j < 8; j++) { const rr2 = j % 2 ? 2 : 8 * s + 2, aa = j * Math.PI / 4; ctx.lineTo(sx + Math.cos(aa) * rr2, sy + Math.sin(aa) * rr2); }
    ctx.closePath(); ctx.fill();
  }
  // 높이 별 사다리(인기 게임 깃대처럼): 높이 지날수록 큰 보상 — 지나면 닿은 단계까지 불이 켜짐
  if (G.run) for (let i = 1; i <= 5; i++) {
    const sy = GROUND - (i - 0.5) * 58, lit = G.goalBand >= i, near = !G.goalBand && Math.abs((GROUND - G.p.fy) / 58 + 0.5 - i) < 0.6 && G.goal.x - G.p.x < 400;
    const r = (i === 5 ? 17 : 13) * (lit ? 1.25 + Math.sin(T * 8 + i) * 0.08 : 1);
    ctx.fillStyle = 'rgba(10,20,40,.35)'; ctx.beginPath(); ctx.arc(gx + 20, sy, r + 6, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.globalAlpha = lit ? 1 : near ? 0.85 : 0.45; drawStar(gx + 20, sy, r, true); ctx.restore();
    if (lit) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; drawStar(gx + 20, sy, r * 1.5, true); ctx.restore(); }
    if (i === 5 && !G.goalBand) text('완벽!', gx + 52, sy, 12, '#ffe14a', { align: 'left', body: true });
  }
}
function drawEgg(e) {
  if (e.ult) { const y = e.y + Math.sin(e.t * 4) * 5, k = 1 + Math.sin(e.t * 8) * 0.06; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(e.x, y, 2, e.x, y, 60); g.addColorStop(0, 'rgba(190,140,255,.7)'); g.addColorStop(1, 'rgba(190,140,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, y, 60, 0, Math.PI * 2); ctx.fill(); ctx.restore(); if (!drawImg(IMG.x_ui_ult, e.x, y, 64 * k)) { ctx.fillStyle = '#b48bff'; ctx.beginPath(); ctx.arc(e.x, y, 24, 0, Math.PI * 2); ctx.fill(); } return; }
  if (e.clock) { const y = e.y + Math.sin(e.t * 4) * 3; ctx.fillStyle = '#7cf0ff'; ctx.beginPath(); ctx.arc(e.x, y, 15, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.x, y); ctx.lineTo(e.x, y - 8); ctx.moveTo(e.x, y); ctx.lineTo(e.x + 6, y + 3); ctx.stroke(); return; }
  if (e.potion) { // 기운 물약(코덱스 그림) + 분홍 빛
    const y = e.y + Math.sin(e.t * 3) * 4, h = e.potion === 'b' ? 66 : 50;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(e.x, y, 2, e.x, y, h); g.addColorStop(0, 'rgba(255,140,190,.5)'); g.addColorStop(1, 'rgba(255,140,190,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, y, h, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (!drawImg(IMG['spr_potion_' + e.potion], e.x, y, h, Math.sin(e.t * 2) * 0.1)) drawItemIcon('heart', e.x, y, h * 0.8);
    return;
  }
  if (e.pearl) {
    const y = e.y + Math.sin(e.t * 4) * 2;
    ctx.fillStyle = 'rgba(190,240,255,.85)'; ctx.beginPath(); ctx.arc(e.x, y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(e.x - 3, y - 3, 2.5, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const bob = Math.sin(e.t * 4) * 3, h = e.gold && !e.bonus ? 34 : 28;
  if (e.gold && !e.bonus) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(e.x, e.y + bob, 2, e.x, e.y + bob, 30);
    g.addColorStop(0, 'rgba(255,220,90,.7)'); g.addColorStop(1, 'rgba(255,220,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y + bob, 30, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  const isGold = e.gold && !e.bonus;
  if (e.bonus) { ctx.strokeStyle = `hsl(${(T * 200 + e.x) % 360},90%,70%)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y + bob, 15, 0, Math.PI * 2); ctx.stroke(); }
  drawPearl(e.x, e.y + bob, h, Math.sin(e.t * 3) * 0.15, isGold || e.gold);
}
const BOSS_SPR = { shark: 'boss_shark', shark2: 'boss_shark', shark3: 'boss_shark', king1: 'boss_king', king: 'boss_king', jellyq: 'boss_jelly', crabk: 'boss_crab', octopus: 'boss_octopus', octopus2: 'boss_octopus', octopus3: 'boss_pirate', angler: 'boss_angler', angler2: 'boss_angler' };
const BOSS_H = { boss_jelly: 250, boss_crab: 230, boss_shark: 230, boss_king: 270, boss_octopus: 300, boss_pirate: 300, boss_angler: 280 };
function drawBoss(b, px, py) {
  const key = 'spr_' + BOSS_SPR[G.cfg.boss], im = IMG[key];
  if (ready(im)) {
    if (b.dead && b.shattered) return; // 조각나서 흩어짐
    if (b.st === 'fall') { const k = Math.min(1, b.t / 0.23); ctx.fillStyle = `rgba(0,5,20,${0.45})`; ctx.beginPath(); ctx.ellipse(b.x, GROUND + 4, 150, 24, 0, 0, Math.PI * 2); ctx.fill(); if (k <= 0) return; }
    ctx.save();
    if (b.st === 'windup') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.5 + 0.5 * Math.sin(T * 40); ctx.fillStyle = 'rgba(255,40,70,.22)'; ctx.fillRect(0, b.y - 60, W, 120); ctx.restore(); if (G.run) text(b.laneY != null ? '↓ 숙여요!' : '↑ 뛰어요!', W * 0.42, b.y - 74, 34, '#ffffff', { stroke: 'rgba(200,20,50,.9)', lw: 7 }); }
    const h = BOSS_H[BOSS_SPR[G.cfg.boss]] * (b.kind === 'octopus' ? 1 : 1), att = b.st === 'charge' || b.st === 'lunge' || b.st === 'bite';
    const bob = Math.sin(b.t * 2.4) * 8, tilt = att ? -0.12 : Math.sin(b.t * 1.6) * 0.06, sq = 1 + Math.sin(b.t * (att ? 18 : 4)) * (att ? 0.05 : 0.025);
    // 공격 몸짓: 움츠림(뒤로·커짐·떨림·빨간 기운) → 돌진(1.28배) → 복귀
    const wk = b.st === 'windup' ? Math.min(1, b.t / 0.38) : 0;
    let ws = 1 + 0.1 * wk, jx = b.st === 'windup' ? rand(-3, 3) * wk : 0;
    if (att) ws = 1.28;
    if (b.dead) { const a = Math.min(1, (T - b.koAt) / 0.26); ws = 1 + 0.22 * a; jx = rand(-7, 7); }
    const sk = b.sq || 0;
    ctx.save(); ctx.translate(b.x + jx + (b.kx || 0), b.y + bob); ctx.rotate(tilt + (b.kx || 0) * 0.012 + (b.dead ? Math.sin(T / 0.018) * 0.06 : 0)); ctx.scale((1 / sq) * (1 + sk) * ws, sq * (1 - sk) * ws);
    drawImg(im, 0, 0, h);
    if (b.dead) drawImg(silhouette(key, '#ffffff'), 0, 0, h, 0, 0.9);
    else if (wk > 0) drawImg(silhouette(key, '#ff3355'), 0, 0, h, 0, 0.25 + 0.25 * Math.sin(T / 0.04));
    else if (T - (b.hitAt || -9) < 0.26) flashOver(key, h, b);
    else if (b.rage) drawImg(silhouette(key, '#ff3355'), 0, 0, h, 0, 0.18 + 0.12 * Math.sin(T * 10));
    if (G.eff.freeze > 0) drawImg(silhouette(key, '#bfefff'), 0, 0, h, 0, 0.4);
    ctx.restore();
    if (b.stun > 0) for (let i = 0; i < 3; i++) { const a = T * 7 + i * 2.1; text('★', b.x + Math.cos(a) * 60, b.y - h * 0.45 + Math.sin(a) * 12, 22, C.yellow, { lw: 3 }); }
    ctx.restore();
    return;
  }
  ctx.save(); ctx.globalAlpha = b.dead ? Math.max(0, b.deadT / 1.7) : 1;
  if (b.kind === 'shark') {
    const d = b.def, open = b.st === 'windup' || b.st === 'charge' ? 1 : 0.15 + 0.15 * Math.sin(b.t * 3);
    if (b.st === 'windup') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 40); ctx.fillStyle = 'rgba(255,40,70,.25)'; ctx.fillRect(0, b.y - 55, W, 110); ctx.restore(); }
    drawShark(b.x, b.y, b.s, d.c1, d.c2, true, b.hurt > 0, !!d.king, Math.sin(b.t * (b.st === 'charge' ? 18 : 7)) * 0.28, open);
    if (b.st === 'windup' || b.st === 'charge') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,40,60,.8)'; ctx.beginPath(); ctx.arc(b.x - 80 * b.s / 2.5, b.y - 15, 9 + Math.sin(T * 30) * 3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  } else if (b.kind === 'octopus') drawOctoBoss(b, px, py);
  else {
    drawAnglerBoss(b);
    if (b.st === 'windup') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 40); ctx.fillStyle = 'rgba(255,200,60,.22)'; ctx.fillRect(0, b.y - 70, W, 140); ctx.restore(); }
  }
  if (b.stun > 0) for (let i = 0; i < 3; i++) { const a = T * 7 + i * 2.1; text('★', b.x + Math.cos(a) * 50, b.y - 90 + Math.sin(a) * 12, 20, C.yellow, { lw: 3 }); }
  ctx.restore();
}
function drawWorld() {
  const p = G.p, E = G.eff;
  if (G.goal) drawGoal(G.goal.x);
  if (G.run) { drawBossShadowWarn(); drawRunObs(); }
  drawShooting();
  for (const b of G.boxes) drawItemBox(b);
  for (const e of G.eggsArr) drawEgg(e);
  for (const e of G.enemies) {
    if (e.hitT > 0) e.hitT -= 1 / 60;
    const winding = e.sp && !e.sp.done, k = winding ? e.sp.t / e.sp.wind : 0;
    if (winding || e.rage > 0 || (e.big > 0 && e.type === 'whirlpool')) { // 필살기 기운
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const R = e.r * ES * (2.4 + k * 1.6 + (e.big > 0 ? 2 : 0));
      const g = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, R); g.addColorStop(0, `rgba(255,60,90,${0.55 + 0.3 * Math.sin(T * 30)})`); g.addColorStop(1, 'rgba(255,60,90,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (winding) {
        ctx.strokeStyle = `rgba(255,77,106,${0.6 + 0.4 * Math.sin(T * 40)})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * ES * 2 + 30 * (1 - k), T * 4, T * 4 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        for (let i = 0; i < 3; i++) { const a = rand(0, Math.PI * 2), r1 = rand(60, 110); fx.push({ k: 'spark', x: e.x + Math.cos(a) * r1, y: e.y + Math.sin(a) * r1, vx: -Math.cos(a) * 220, vy: -Math.sin(a) * 220, life: 0.25, max: 0.25, size: 3, color: '#ff8aa0' }); }
      }
    }
    const jx = winding ? rand(-4, 4) * (0.4 + k) : 0, sc = ES * (winding ? 1 + k * 0.25 : 1) * (e.type === 'whirlpool' && e.big > 0 ? 1.9 : 1);
    const en = entOff(e); if (en.a <= 0) continue;
    ctx.save(); ctx.globalAlpha *= en.a; ctx.translate(e.x + jx + en.dx, e.y + en.dy); ctx.scale(sc * en.sx, sc * en.sy); if (e.spin > 0 || en.rot) ctx.rotate(e.spin > 0 ? e.spin * 12 : en.rot); ctx.translate(-e.x, -e.y);
    drawEnemy(e, p.x, p.y);
    ctx.restore();
    if (e.rage > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,40,60,.9)'; ctx.beginPath(); ctx.arc(e.x - 30, e.y - 8, 6 + Math.sin(T * 30) * 2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  for (const h of G.hazards) {
    if (h.k === 'beam') {
      if (!h.on) { ctx.strokeStyle = `rgba(255,77,106,${0.4 + 0.4 * Math.sin(T * 40)})`; ctx.lineWidth = 3; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.moveTo(h.x1, h.y1); ctx.lineTo(h.x1 + (h.x2 - h.x1) * 1.6, h.y1 + (h.y2 - h.y1) * 1.6); ctx.stroke(); ctx.setLineDash([]); }
      else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 10 * (1 - h.t / 0.35) + 2; ctx.shadowColor = '#7cf0ff'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.moveTo(h.x1, h.y1); for (let i = 1; i <= 8; i++) ctx.lineTo(lerp(h.x1, h.x1 + (h.x2 - h.x1) * 1.6, i / 8) + rand(-14, 14), lerp(h.y1, h.y1 + (h.y2 - h.y1) * 1.6, i / 8) + rand(-14, 14)); ctx.stroke(); ctx.restore(); }
    } else if (h.k === 'hbeam') {
      const x0 = h.src ? h.src.x : W;
      if (!h.on) { ctx.fillStyle = `rgba(80,20,90,${0.2 + 0.15 * Math.sin(T * 30)})`; ctx.fillRect(0, h.y - 30, x0, 60); }
      else { const a = 1 - h.t / 0.6; ctx.fillStyle = `rgba(30,8,40,${0.85 * a})`; ctx.fillRect(0, h.y - 34, x0, 68); ctx.fillStyle = `rgba(180,120,255,${0.5 * a})`; ctx.fillRect(0, h.y - 6, x0, 12); }
    } else if (h.k === 'cloud') {
      const a = Math.min(1, h.t / 0.4) * (h.t > h.dur - 0.5 ? (h.dur - h.t) / 0.5 : 1);
      ctx.save(); ctx.globalAlpha = a * 0.75; for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#7bd44a' : '#a8f06a'; ctx.beginPath(); ctx.arc(h.x + Math.cos(i * 1.1 + h.t) * h.r * 0.45, h.y + Math.sin(i * 1.7 + h.t) * h.r * 0.35, h.r * 0.5, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    } else if (h.k === 'wave') {
      ctx.save(); ctx.fillStyle = '#e9d9a8'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(h.x - 40, GROUND + 4); ctx.quadraticCurveTo(h.x - 10, GROUND - 46, h.x + 26, GROUND - 30); ctx.quadraticCurveTo(h.x + 40, GROUND - 10, h.x + 60, GROUND + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(h.x - 6 + i * 12, GROUND - 38 + Math.sin(T * 20 + i) * 3, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    } else if (h.k === 'grab' && h.src && !h.src.dead) {
      ctx.strokeStyle = '#d0457f'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(h.src.x - 20, h.src.y + 10);
      ctx.quadraticCurveTo((h.src.x + p.x) / 2, Math.max(h.src.y, p.y) + 60 + Math.sin(T * 10) * 10, p.x + 10, p.y); ctx.stroke();
      ctx.strokeStyle = '#ffb3d1'; ctx.lineWidth = 4; ctx.stroke();
    }
  }
  // 전기 고리
  for (const h of G.hazards) if (h.k === 'shock') {
    const a = h.fade ? 1 - h.fade / 0.3 : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 8; ctx.shadowColor = '#7cf0ff'; ctx.shadowBlur = 18;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const an = i / 40 * Math.PI * 2, rr2 = h.r + rand(-7, 7); ctx.lineTo(h.x + Math.cos(an) * rr2, h.y + Math.sin(an) * rr2); }
    ctx.closePath(); ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.restore();
  }
  if (G.boss) drawBoss(G.boss, p.x, p.y);
  for (const s of G.shots) {
    if (s.fake) { drawPearl(s.x, s.y, 26, s.t * 6, true); continue; }
    if (s.style === 'spike') { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx)); ctx.fillStyle = '#2a0f45'; ctx.strokeStyle = '#c9a2ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -6); ctx.lineTo(-10, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); continue; }
    if (s.style === 'poison') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, 18); g.addColorStop(0, '#eaffc0'); g.addColorStop(1, 'rgba(120,255,80,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, 18, 0, Math.PI * 2); ctx.fill(); ctx.restore(); ctx.fillStyle = '#6fd43a'; ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.fill(); continue; }
    if (s.style === 'claw') { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.t * 16); ctx.fillStyle = '#e8462a'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#8a1f10'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, -10); ctx.moveTo(0, 0); ctx.lineTo(14, 10); ctx.stroke(); ctx.restore(); continue; }
    ctx.fillStyle = '#2a1030'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,60,90,${0.6 + 0.4 * Math.sin(s.t * 20)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  // 문어 다리
  for (const s of G.sweeps) {
    if (!s.on) { ctx.fillStyle = `rgba(255,60,90,${0.18 + 0.15 * Math.sin(T * 30)})`; ctx.fillRect(0, s.y0, W, s.y1 - s.y0); continue; } // 글자는 drawSweepLabels 에서 숫자들 위에
    if (s.zap && IMG.spr_fx_lightning && ready(IMG.spr_fx_lightning)) { // 번개 줄: 코덱스 번개 그림을 줄 따라 이어 붙이고 깜빡임
      const im = IMG.spr_fx_lightning, b = obox(im), lh = (s.y1 - s.y0) * 1.5, lw = (lh * b.w) / b.h, my = (s.y0 + s.y1) / 2;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(124,240,255,.14)'; ctx.fillRect(s.x - 40, s.y0, W - s.x + 100, s.y1 - s.y0);
      for (let x = s.x - 40, i = 0; x < W + 60; x += lw * 0.8, i++) {
        const fl = 0.75 + 0.25 * Math.sin(T * 50 + i * 2);
        ctx.globalAlpha = fl; ctx.save(); ctx.translate(x + lw / 2, my + Math.sin(T * 40 + i) * 3); if ((Math.floor(T * 14) + i) % 2) ctx.scale(1, -1); // 번쩍일 때마다 모양이 바뀌어 보이게
        ctx.drawImage(im, b.x, b.y, b.w, b.h, -lw / 2, -lh / 2, lw, lh); ctx.restore();
      }
      ctx.restore(); continue;
    }
    if (s.zap) { // 번개 줄(그림이 아직 없을 때)
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = k % 2 ? '#ffffff' : '#7cf0ff'; ctx.lineWidth = k % 2 ? 2 : 6; ctx.beginPath();
        const yy = s.y0 + ((k + 0.5) / 4) * (s.y1 - s.y0); ctx.moveTo(s.x - 40, yy);
        for (let x = s.x - 40; x < W + 60; x += 34) ctx.lineTo(x, yy + rand(-14, 14));
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(124,240,255,.12)'; ctx.fillRect(s.x - 40, s.y0, W - s.x + 100, s.y1 - s.y0);
      ctx.restore(); continue;
    }
    if (ready(IMG.x_fx_tentacle)) { // 그림 문어 다리를 줄 따라 이어 붙임(대왕 문어 색으로 물들임)
      const th = s.y1 - s.y0, sz = Math.min(th * 1.15, 220), red = silhouette('x_fx_tentacle', '#e8455e');
      for (let x = s.x, i = 0; x < W + sz; x += sz * 0.62, i++) {
        const y = s.lane === 'high' ? s.y1 - sz * 0.45 : (s.y0 + s.y1) / 2, wob = Math.sin(T * 9 + i) * 0.12;
        ctx.save(); ctx.translate(x, y + Math.sin(T * 10 + i) * 4); ctx.rotate(-Math.PI / 2 + wob); if (i % 2) ctx.scale(-1, 1);
        drawImg(IMG.x_fx_tentacle, 0, 0, sz); if (red) drawImg(red, 0, 0, sz, 0, 0.5);
        ctx.restore();
      }
      continue;
    }
    ctx.save(); ctx.fillStyle = '#d0457f'; ctx.strokeStyle = '#ffb3d1'; ctx.lineWidth = 3;
    const mid = (s.y0 + s.y1) / 2, th = (s.y1 - s.y0) * 0.35;
    ctx.beginPath(); ctx.moveTo(s.x - 40, mid);
    for (let x = s.x - 40; x <= W + 200; x += 30) ctx.lineTo(x, mid - th * (0.5 + 0.5 * Math.min(1, (x - s.x) / 300)) + Math.sin(x * 0.03 + T * 10) * 6);
    for (let x = W + 200; x >= s.x - 40; x -= 30) ctx.lineTo(x, mid + th * (0.5 + 0.5 * Math.min(1, (x - s.x) / 300)) + Math.sin(x * 0.03 + T * 10) * 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd0e0'; for (let x = s.x; x < W; x += 36) { ctx.beginPath(); ctx.arc(x, mid + th * 0.4, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  // 질주·회오리 잔상과 기운
  if (G.boosting > 0 || E.whirl > 0) {
    for (let i = p.trail.length - 1; i >= 1; i--) { const tr = p.trail[i]; drawHero(tr.x - 6, tr.y + 4, HERO_H * p.scale, tr.rot, { ghost: E.whirl > 0 ? '#7cf0ff' : i % 2 ? '#8b5cff' : '#4fb8ff', alpha: 0.4 * (1 - i / p.trail.length), ph: p.ph, boost: true, stretch: 1.1 }); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, 100 * p.scale);
    g.addColorStop(0, E.whirl > 0 ? 'rgba(124,240,255,.6)' : 'rgba(160,110,255,.65)'); g.addColorStop(0.5, 'rgba(80,170,255,.25)'); g.addColorStop(1, 'rgba(80,170,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 100 * p.scale, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  if (E.whirl > 0) { ctx.save(); ctx.translate(p.x, p.y); for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(124,240,255,${0.7 - i * 0.2})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -30 + i * 30, 60 - i * 8, 14, 0, G.t * 14 + i, G.t * 14 + i + 4.4); ctx.stroke(); } ctx.restore(); }
  for (const f of fx) if (f.k === 'flame') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f.life / f.max;
    ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.size * (f.life / f.max), 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  for (const f of fx) if (f.k === 'bub') {
    ctx.globalAlpha = Math.max(0, f.life / f.max) * 0.7; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const k of G.inks) drawInk(k); // 먹물(앞을 가림)
  if (G.pet) drawImg(IMG['pet_' + save.pet], G.pet.x, G.pet.y, 46, Math.sin(G.pet.t * 2) * 0.12);
  // 거북이
  const blink = p.inv > 0 && !p.dead && !G.won && G.boosting <= 0 && E.whirl <= 0 && Math.sin(T * 40) > 0;
  const face = p.dead ? 'dead' : G.boosting > 0 || E.giant > 0 ? 'boost' : p.faceT > 0 ? p.face : p.scared ? 'scared' : 'normal';
  const bob = p.dead ? 0 : Math.sin(p.ph * 0.5) * 2.5;
  if (E.giant > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 110); g.addColorStop(0, 'rgba(120,255,160,.35)'); g.addColorStop(1, 'rgba(120,255,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 110, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  if (G.run && G.bonus) { // 보너스 바다: 금빛 바다 + 줄 안내
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,210,90,${0.10 + 0.04 * Math.sin(T * 3)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
    for (const ly of BONUS_LANES()) { ctx.fillStyle = 'rgba(255,255,255,.08)'; rr(0, ly - 48, W, 48, 24); ctx.fill(); }
  }
  if (G.run) { drawRunShadow(); drawBeatRing(); drawRunHero(face, p.blinkT < 0, blink && T - (G.hurtAt || -9) > 0.45 ? 0.5 : 1); if (G.bonus) drawBonusBubble(); } // 맞은 직후 0.45초는 또렷하게(맞은 몸짓이 보이게), 그다음 깜빡임
  else if (G.boosting > 0 && !REDUCE) { // 질주 중 빨강·파랑으로 갈라지는 잔상
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawHero(p.x - 6 * p.scale - 8, p.y + (4 + bob) * p.scale, HERO_H * p.scale, p.rot + p.flip, { ghost: '#ff3355', alpha: 0.5, ph: p.ph, boost: true });
    drawHero(p.x - 6 * p.scale + 8, p.y + (4 + bob) * p.scale, HERO_H * p.scale, p.rot + p.flip, { ghost: '#33aaff', alpha: 0.5, ph: p.ph, boost: true });
    ctx.restore();
  }
  if (!G.run) drawHero(p.x - 6 * p.scale, p.y + (4 + bob) * p.scale, HERO_H * p.scale, p.rot + p.flip, {
    ph: p.ph, boost: G.boosting > 0, face, blink: p.blinkT < 0,
    alpha: blink ? 0.35 : 1, stretch: G.boosting > 0 ? 1.1 : 1,
  });
  if (p.dead) for (let i = 0; i < 3; i++) { const a = T * 6 + i * 2.1; text('★', p.x + 28 + Math.cos(a) * 22, p.y - 40 + Math.sin(a) * 7, 16, '#ffe36b', { lw: 3 }); }
  if (G.shield > 0 && !p.dead) {
    ctx.strokeStyle = `rgba(160,245,255,${0.55 + 0.2 * Math.sin(T * 4)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 52 * p.scale, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(160,245,255,.08)'; ctx.fill();
  }
  if (E.magnet > 0 && !p.dead) { ctx.strokeStyle = `rgba(255,77,94,${0.25 + 0.15 * Math.sin(T * 8)})`; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(p.x, p.y, 120 + Math.sin(T * 4) * 10, T, T + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  drawJuiceWorld();
  // 파편·번개·레이저
  for (const f of fx) {
    const a = Math.max(0, f.life / f.max);
    if (f.k === 'spark') { ctx.globalAlpha = a; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.size * (0.4 + a * 0.6), 0, Math.PI * 2); ctx.fill(); }
    else if (f.k === 'chunk') { ctx.globalAlpha = a; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.fillStyle = f.color; ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.strokeRect(-f.size / 2, -f.size / 2, f.size, f.size); ctx.restore(); }
    else if (f.k === 'ring') { ctx.globalAlpha = a; ctx.strokeStyle = f.color; ctx.lineWidth = f.lw * a + 1; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke(); }
    else if (f.k === 'laser') {
      ctx.globalAlpha = a; ctx.strokeStyle = f.color || '#7cf0ff'; ctx.lineWidth = 8 * a + 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(f.x, f.y);
      if (f.color) { const n = 6; for (let i = 1; i <= n; i++) ctx.lineTo(lerp(f.x, f.x2, i / n) + (i < n ? rand(-14, 14) : 0), lerp(f.y, f.y2, i / n)); }
      else ctx.lineTo(f.x2, f.y2);
      ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // 깜깜한 바다: 내 주변만 보임 (등불·질주면 넓게)
  if (G.cfg.dark || G.darkT > 0) {
    const r = E.lamp > 0 ? 560 : G.boosting > 0 ? 420 : G.feverT > 0 ? 320 : G.run ? 300 : 230, lx = p.x + (G.run ? 150 : 0); // 점프 달리기: 앞쪽을 더 밝게
    const g = ctx.createRadialGradient(lx, p.y, r * 0.3, lx, p.y, r);
    g.addColorStop(0, 'rgba(0,3,10,0)'); g.addColorStop(1, E.lamp > 0 ? 'rgba(0,3,10,.55)' : 'rgba(0,3,10,.93)');
    ctx.fillStyle = g; ctx.fillRect(-80, -80, W + 160, H + 160);
    for (const b of G.boxes) { ctx.save(); ctx.globalAlpha = 0.6; drawItemBox(b); ctx.restore(); }
  }
  // 아귀 미끼는 어둠 위에서도 진짜 황금 진주처럼 반짝
  for (const e of G.enemies) if (e.type === 'angler' && !e.dead) drawLure(e.x, e.y, e.r / 22, e.t);
  if (G.boss && G.boss.kind === 'angler' && !G.boss.dead) drawLure(Math.min(G.boss.x, W - 30 + 40 * G.boss.s), G.boss.y, G.boss.s, G.boss.t);
  if (E.lamp > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 200); g.addColorStop(0, 'rgba(255,230,150,.22)'); g.addColorStop(1, 'rgba(255,230,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 200, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  // 경고는 어둠 위에
  for (const w of G.warns) {
    const blinkOn = Math.sin(T * 30) > 0;
    // 돌진 길 예고: 선 대신 빛나는 띠 + 왼쪽으로 흐르는 화살 + 오른쪽 끝에 올 몬스터 얼굴(가까울수록 진하게)
    const k = clamp(1 - w.t / (w.max || 1), 0, 1), gold = w.kind === 'sword', col = gold ? '255,200,70' : '255,60,90';
    const bh = 26 + k * 6, band = ctx.createLinearGradient(0, 0, W, 0); // 땅 줄·머리 줄이 붙어 있어 띠는 얇게(어느 줄인지 또렷)
    band.addColorStop(0, `rgba(${col},0)`); band.addColorStop(0.55, `rgba(${col},${0.10 + 0.12 * k})`); band.addColorStop(1, `rgba(${col},${0.28 + 0.25 * k})`);
    ctx.fillStyle = band; rr(0, w.y - bh / 2, W, bh, bh / 2); ctx.fill();
    ctx.save(); ctx.globalAlpha = 0.35 + 0.5 * k;
    for (let i = 0; i < 9; i++) { // ‹ 화살이 거북 쪽으로 흐름
      const ax = W - SAFE - 130 - ((T * (260 + 300 * k) + i * 110) % (W - 60)), aw = 12;
      if (ax < 40) continue;
      ctx.strokeStyle = `rgba(${col},${0.5 + 0.5 * (ax / W)})`; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax + aw, w.y - 8); ctx.lineTo(ax, w.y); ctx.lineTo(ax + aw, w.y + 8); ctx.stroke();
    }
    ctx.restore();
    const face = IMG['spr_' + (w.kind === 'sword' ? 'swordfish' : w.kind)], fx0 = W - SAFE - 34 - k * 26 + Math.sin(T * 30) * k * 3;
    if (face && ready(face)) { ctx.save(); ctx.beginPath(); ctx.rect(W - SAFE - 90, w.y - 60, 90 + SAFE, 120); ctx.clip(); drawImg(face, fx0 + 20, w.y, 56 + k * 10, 0, 0.9); ctx.restore(); }
    if (blinkOn || w.t > w.max * 0.5) text('!', W - SAFE - 92, w.y - 26, 34, gold ? '#ffc846' : '#ff3355', { stroke: '#fff', lw: 5 });
  }
}
// 공격 예고 글자(↑ 점프! / 뛰지 마요!)는 피해 숫자·떠오르는 글자보다 위에 — 꼭 읽어야 하는 말이라
function drawSweepLabels() {
  if (!G || !G.sweeps) return;
  for (const s of G.sweeps) if (!s.on && s.lane) text(s.lane === 'low' ? '↑ 점프!' : '뛰지 마요!', W / 2, (s.y0 + s.y1) / 2, 34, '#ffffff', { stroke: 'rgba(200,20,50,.9)', lw: 7 });
}
function drawPops() {
  for (const p of pops) {
    const age = p.max - p.life, s = age < 0.12 ? 0.5 + age / 0.12 * 0.7 : age < 0.22 ? 1.2 - (age - 0.12) / 0.1 * 0.2 : 1;
    ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 0.3); ctx.translate(p.x, p.y); ctx.scale(s, s);
    text(p.s, 0, 0, p.size, p.color);
    ctx.restore();
  }
}
// 달리기(터치): 양쪽 끝 세로 줄로 — 왼쪽 = 점프 위에 아이템(거북이 x=230 뒤라 길을 안 가림), 오른쪽 = 숙이기 위에 필살. 두 줄 모두 x=66, 단추 사이 약 12
const BOOST_BTN = () => (G && G.run ? { x: W - SAFE - 66, y: H - 182, r: 42 } : { x: W - SAFE - 92, y: H - 92, r: 60 });
const ITEM_BTN = () => (G && G.run ? { x: SAFE + 66, y: H - 178, r: 34 } : { x: W - SAFE - 214, y: H - 70, r: 44 });
function drawHUD() {
  const n = G.n, endless = G.cfg.endless, L = 22 + SAFE;
  if (!G.run) text(endless ? STAGES[n].name : `${n}번 바다 · ${STAGES[n].name}`, L, 30, 18, C.text, { align: 'left' }); // 달리기 화면은 시안처럼 바다 이름 대신 기운 막대가 맨 위
  if (save.diff !== 1 && !G.run) text(DIFFS[save.diff].name, L, 54, 13, save.diff === 2 ? C.danger : C.ok, { align: 'left', body: true });
  let sx = L + 12;
  if (G.run) sx += 270 + G.shield * 28;
  else for (let i = 0; i < G.shield; i++) { icon('e_shield', sx, 80, 26); sx += 30; }
  // 켜진 아이템 효과 (남은 시간 고리)
  // 켜진 아이템: 인기 게임처럼 오른쪽 가장자리에 아이콘 + 줄어드는 막대를 세로로 쌓음(2초 아래면 깜빡, 끝나면 퐁)
  let iy = G.run ? 104 : 130; const ix = W - SAFE - 40;
  for (const k of ['magnet', 'double', 'freeze', 'giant', 'lamp', 'whirl', 'rain', 'rocket']) {
    const v = G.eff[k]; if (v <= 0) { if (G.effOn && G.effOn[k]) { G.effOn[k] = false; snd('bubble', 0.6, 1.3); } continue; }
    G.effOn = G.effOn || {}; G.effOn[k] = true;
    const max = Math.max(v, ITEMS[k].dur), blinkI = v < 2 && Math.sin(T * 18) < 0;
    ctx.fillStyle = 'rgba(16,16,18,.55)'; rr(ix - 28, iy - 22, 56, 54, 14); ctx.fill();
    if (!blinkI) drawItemIcon(k, ix, iy - 2, 30);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; rr(ix - 22, iy + 20, 44, 6, 3); ctx.fill();
    ctx.fillStyle = v < 2 ? '#ff5470' : C.yellow; rr(ix - 22, iy + 20, Math.max(4, 44 * Math.min(1, v / max)), 6, 3); ctx.fill();
    iy += 60;
  }
  const bx = W / 2 - 180, by = G.run ? 23 : 20, bw = 360, bh = 14; // 달리기: 기운 막대·점수 칸과 같은 가운데 줄(y=30)
  if (G.boss && !G.boss.dead && G.run) drawBossBar(G.boss);
  else if (G.boss && !G.boss.dead) {
    text(G.boss.def.name, W / 2, by - 2, 16, '#ff9aa8', { body: true });
    ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(bx, by + 8, bw, bh, 7); ctx.fill();
    ctx.fillStyle = C.danger; rr(bx, by + 8, Math.max(bh, bw * (G.boss.hp / G.boss.maxHp)), bh, 7); ctx.fill();
  } else if (endless) {
    text(`${meters()}미터`, W / 2, by + 8, 28, '#ffffff');
    if (save.endlessBest) text(`최고 ${save.endlessBest}미터`, W / 2, by + 34, 14, C.yellow, { body: true });
  } else {
    const pr = progress(), best = (save.best[n] || 0) / 100;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(bx, by, bw, bh, 7); ctx.fill();
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, C.blueD); g.addColorStop(1, C.blue);
    ctx.fillStyle = g; rr(bx, by, Math.max(bh, bw * pr), bh, 7); ctx.fill();
    if (!G.cfg.boss) { ctx.fillStyle = G.blessDone ? C.ok : '#ffffff'; ctx.beginPath(); ctx.arc(bx + bw * 0.5, by + bh / 2, 5, 0, Math.PI * 2); ctx.fill(); }
    if (best > 0 && best < 1) {
      const fxp = bx + bw * best;
      ctx.strokeStyle = C.yellow; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fxp, by - 2); ctx.lineTo(fxp, by + bh + 2); ctx.stroke();
      ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.moveTo(fxp - 6, by - 9); ctx.lineTo(fxp + 6, by - 9); ctx.lineTo(fxp, by - 2); ctx.fill(); // 최고 기록 자리: 작은 노란 삼각표(아래 글자 동그라미와 안 겹치게)
    }
    drawHero(bx + bw * pr, by + bh / 2, 30, 0, { ph: T * 10, stand: true });
    drawImg(IMG.princess, bx + bw + 22, by + bh / 2, 30, 0, n === LAST ? 1 : 0.45);
  }
  const eh = eggHud();
  if (G.run) { // 인기 게임처럼 오른쪽 위: 이번 판 점수(굴러 올라감) + 이번 판 진주
    G.scoreShow += (G.score - G.scoreShow) * Math.min(1, 1 / 60 * 10); if (G.score - G.scoreShow < 1) G.scoreShow = G.score;
    const cp = IMG.spr_ui_cur_pill, PR = W - SAFE - 78; // 시안: 크림색 점수 칸 + 그 아래 진주 칸, 오른쪽 끝에 멈춤 단추
    if (cp && ready(cp)) {
      slice3(cp, PR - 200, 8, 200, 44); drawStar(PR - 178, 30, 13, true);
      text(Math.round(G.scoreShow).toLocaleString(), PR - 16, 31, 22, '#2f3550', { align: 'right', stroke: false });
      slice3(cp, PR - 132, 56, 132, 36); drawPearl(PR - 112, 74, 20 * (1 + hudPulse * 1.6));
      text(String(G.eggs), PR - 14, 75, 17, '#2f3550', { align: 'right', stroke: false });
      const mlt = scoreMult(); if (mlt > 1) { ctx.fillStyle = '#ff7a00'; rr(PR - 260, 17, 50, 26, 10); ctx.fill(); text(`×${mlt}`, PR - 235, 30, 15, '#ffffff', { stroke: false }); }
    } else {
    text(Math.round(G.scoreShow).toLocaleString(), W - SAFE - 20, 28, 28, '#ffffff', { align: 'right', lw: 5 });
    const mlt = scoreMult(); if (mlt > 1) { // 점수 배수 상자(인기 게임)
      ctx.font = `800 ${fs(28)}px ${FONT}`; const sw2 = ctx.measureText(Math.round(G.scoreShow).toLocaleString()).width;
      const mx = W - SAFE - 20 - sw2 - 34; ctx.fillStyle = '#ff7a00'; rr(mx - 22, 15, 44, 26, 9); ctx.fill(); text(`×${mlt}`, mx, 28, 15, '#ffffff', { stroke: false });
    }
    ctx.font = `800 ${fs(18)}px ${FONT}`; const ew = ctx.measureText(String(G.eggs)).width;
    drawPearl(W - SAFE - 92 - ew - 14, 64, 18 * (1 + hudPulse * 1.6)); text(String(G.eggs), W - SAFE - 92, 64, 18, C.yellow, { align: 'right' });
    }
  } else eggBadge(eh.x, eh.y, save.eggs + G.eggs, 28 * (1 + hudPulse * 1.6));
  if (isTouch || G.run) { const pz = IMG.spr_ui_pause; if (G.run && pz && ready(pz)) { drawImg(pz, W - SAFE - 40, 30, 52); ctx.save(); ctx.globalAlpha = 0; button(W - SAFE - 68, 4, 56, 56, 'II', () => { if (!G.p.dead) state = 'pause'; }, {}); ctx.restore(); } else if (isTouch) button(W - SAFE - 60, 52, 46, 40, 'II', () => { if (!G.p.dead) state = 'pause'; }, { size: 17, color: '#cfd8ff' }); }
  const full = G.boost >= 100;
  if (G.run) { // 달리기 화면 위쪽(정리): 둘째 줄은 남색 알약 하나씩 — 터치는 질주를 오른쪽 아래 필살 메달이 보여 주니 여기선 축제 게이지만
    const chip = (x, y, w, h) => { ctx.fillStyle = 'rgba(8,30,70,.6)'; rr(x, y, w, h, h / 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; rr(x, y, w, h, h / 2); ctx.stroke(); };
    let ry = 64;
    if (!isTouch) {
      chip(L, ry, 262, 28); icon('e_rocket', L + 16, ry + 14, 20);
      const v = G.boosting > 0 ? G.boosting / boostDur() : (G.boost % 100) / 100;
      ctx.fillStyle = 'rgba(255,255,255,.16)'; rr(L + 32, ry + 9, 150, 10, 5); ctx.fill();
      ctx.save(); if (full || G.boosting > 0) { ctx.shadowColor = '#b48bff'; ctx.shadowBlur = 14; } ctx.fillStyle = '#9b7bff'; rr(L + 32, ry + 9, Math.max(10, 150 * v), 10, 5); ctx.fill(); ctx.restore();
      for (let i = 0; i < 3; i++) { const on = G.boost >= (i + 1) * 100; ctx.fillStyle = on ? (i ? C.yellow : '#b48bff') : 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(L + 198 + i * 18, ry + 14, 6, 0, Math.PI * 2); ctx.fill(); }
      if (full && G.boosting <= 0 && Math.sin(T * 8) > -0.3) text('Shift!', L + 274, ry + 14, 18, '#fff', { align: 'left' });
      ry += 34;
    }
    chip(L, ry, 200, 26); icon('e_fire', L + 16, ry + 13, 18);
    ctx.fillStyle = 'rgba(255,255,255,.16)'; rr(L + 32, ry + 9, 154, 8, 4); ctx.fill();
    if (G.feverT > 0) {
      const rg = ctx.createLinearGradient(L + 32, 0, L + 186, 0); ['#ff5470', '#ffd34d', '#7dffb0', '#5fd4ff', '#b48bff'].forEach((c, i) => rg.addColorStop(((i / 4) + T * 0.8) % 1, c));
      ctx.fillStyle = rg; rr(L + 32, ry + 9, 154 * (G.feverT / 6), 8, 4); ctx.fill();
      text('축제 2배!', L + 109, ry + 13, 14, '#ffffff', { lw: 4, stroke: '#7a2a00' }); // 알약 안 가운데(옆 아이템 칸과 안 겹치게)
    } else { ctx.fillStyle = C.yellow; rr(L + 32, ry + 9, Math.max(8, 154 * G.fever / 100), 8, 4); ctx.fill(); }
  } else {
  // 질주 게이지 (폰은 왼쪽 아래가 조이스틱 자리라 위로)
  const top = isTouch || G.run; // 점프 달리기는 바닥이 길이라 게이지를 위로
  const gx = L, gy = top ? (G.run ? 74 : 104) : H - 46, gw = top ? 190 : 270, gh = top ? 14 : 20;
  icon('e_rocket', gx + 10, gy - 16, 24);
  text('질주', gx + 28, gy - 16, 16, C.text, { align: 'left', body: true });
  ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(gx, gy, gw, gh, 10); ctx.fill();
  const v = G.boosting > 0 ? G.boosting / boostDur() : G.run ? (G.boost % 100) / 100 : G.boost / 100;
  const gg = ctx.createLinearGradient(gx, 0, gx + gw, 0); gg.addColorStop(0, C.blueD); gg.addColorStop(1, C.deep);
  ctx.save();
  if (full || G.boosting > 0) { ctx.shadowColor = '#b48bff'; ctx.shadowBlur = 18 + Math.sin(T * 10) * 8; }
  ctx.fillStyle = gg; rr(gx, gy, Math.max(gh, gw * v), gh, 10); ctx.fill(); ctx.restore();
  if (G.run) for (let i = 0; i < 3; i++) { const on = G.boost >= (i + 1) * 100; ctx.fillStyle = on ? (i ? C.yellow : '#b48bff') : 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(gx + 60 + i * 18, gy - 16, 6, 0, Math.PI * 2); ctx.fill(); } // 필살 단계 구슬 3개
  if (full && G.boosting <= 0 && !isTouch && Math.sin(T * 8) > -0.3) text(G.run ? 'Shift!' : '스페이스!', gx + gw + 14, gy + 10, 20, '#fff', { align: 'left' });
  // 바다 축제 게이지
  const fy = gy + (top ? 24 : 28), fw = top ? 150 : 180;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(gx + 24, fy - 5, fw, 10, 5); ctx.fill();
  icon('e_fire', gx + 10, fy, 20);
  if (G.feverT > 0) {
    const rg = ctx.createLinearGradient(gx + 24, 0, gx + 24 + fw, 0);
    ['#ff5470', '#ffd34d', '#7dffb0', '#5fd4ff', '#b48bff'].forEach((c, i) => rg.addColorStop(((i / 4) + T * 0.8) % 1, c));
    ctx.fillStyle = rg; rr(gx + 24, fy - 5, fw * (G.feverT / 6), 10, 5); ctx.fill();
    text('바다 축제 2배', gx + 32 + fw, fy, 14, C.yellow, { align: 'left' });
  } else { ctx.fillStyle = C.yellow; rr(gx + 24, fy - 5, Math.max(10, fw * G.fever / 100), 10, 5); ctx.fill(); }
  }
  // 조이스틱: 반투명 원 + 손잡이
  if (isTouch && drag) {
    ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(drag.kx, drag.ky, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill(); ctx.restore();
  } else if (isTouch && save.runs <= 3 && !G.run) text('화면 아무 데나 끌어서 이동', L + 120, H - 34, 15, C.text, { body: true });
  if (G.run) drawRunHud(L);
  if (false) {
    const JR = 62, idle = !drag;
    const bx = idle ? L + 96 : drag.bx, by = idle ? H - 104 : drag.by;
    let kx = bx, ky = by;
    if (!idle) { const dx = drag.kx - drag.bx, dy = drag.ky - drag.by, d = Math.hypot(dx, dy) || 1, m = Math.min(d, JR); kx = bx + dx / d * m; ky = by + dy / d * m; }
    ctx.save(); ctx.globalAlpha = idle ? 0.35 : 0.85;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(bx, by, JR + 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * (JR + 2), by + Math.sin(a) * (JR + 2)); ctx.lineTo(bx + Math.cos(a + 0.18) * (JR - 10), by + Math.sin(a + 0.18) * (JR - 10)); ctx.lineTo(bx + Math.cos(a - 0.18) * (JR - 10), by + Math.sin(a - 0.18) * (JR - 10)); ctx.fill(); }
    const kg = ctx.createRadialGradient(kx - 8, ky - 8, 4, kx, ky, 30); kg.addColorStop(0, 'rgba(255,255,255,.95)'); kg.addColorStop(1, 'rgba(200,215,240,.75)');
    ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(kx, ky, 28, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (idle && save.runs <= 3) text('끌어서 이동', bx, by - JR - 22, 15, C.text, { body: true });
  }
  // 아이템 칸
  const ib = isTouch ? ITEM_BTN() : G.run ? { x: L + 240, y: 124, r: 24 } : { x: L + 420, y: H - 44, r: 30 }; // 키보드 달리기: 축제 알약 오른쪽(가운데 글자 동그라미와 안 닿게)
  ctx.save();
  const pulse = G.itemPop > 0 ? 1 + G.itemPop * 0.5 : 1;
  const slot = IMG.spr_ui_slot;
  if (slot && ready(slot)) { // 시안: 유리 아이템 칸(코덱스) — 아이템이 있으면 금빛이 돎
    if (G.item) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(ib.x, ib.y, 4, ib.x, ib.y, ib.r * 1.6); g.addColorStop(0, `rgba(255,213,74,${0.45 + 0.15 * Math.sin(T * 6)})`); g.addColorStop(1, 'rgba(255,213,74,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ib.x, ib.y, ib.r * 1.6, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    drawImg(slot, ib.x, ib.y, ib.r * 2.3 * pulse, 0, G.item ? 1 : 0.7); ctx.restore();
  } else {
  ctx.fillStyle = G.item ? 'rgba(46,107,255,.9)' : G.run ? 'rgba(27,28,31,.32)' : 'rgba(27,28,31,.75)';
  if (G.item) { ctx.shadowColor = C.blueD; ctx.shadowBlur = 16; }
  ctx.beginPath(); ctx.arc(ib.x, ib.y, ib.r * pulse, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ib.x, ib.y, ib.r * pulse, 0, Math.PI * 2); ctx.stroke();
  }
  if (G.item) { drawItemIcon(G.item, ib.x, ib.y - 2, ib.r * 1.15); if (!isTouch) text('E', ib.x + ib.r - 2, ib.y + ib.r - 6, 13, C.yellow); }
  else text('?', ib.x, ib.y + 1, ib.r * 0.8, 'rgba(255,255,255,.35)', { stroke: false });
  if (isTouch) buttons.push({ x: ib.x - ib.r, y: ib.y - ib.r, w: ib.r * 2, h: ib.r * 2, on: useItem });
  if (isTouch) {
    const bb = BOOST_BTN();
    ctx.save();
    ctx.globalAlpha = full ? 1 : 0.6;
    ctx.fillStyle = full ? C.blue : 'rgba(51,53,59,.85)';
    if (full) { ctx.shadowColor = C.blueD; ctx.shadowBlur = 24; }
    ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.r * (full ? 1 + Math.sin(T * 8) * 0.04 : 1), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (!full) { ctx.strokeStyle = C.blueD; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * G.boost / 100); ctx.stroke(); }
    if (G.run && ready(IMG.x_ui_ult)) {
      const lv = Math.floor(G.boost / 100);
      drawImg(IMG.x_ui_ult, bb.x, bb.y, bb.r * 2.1, 0, full ? 1 : 0.55);
      text(lv ? `필살 ${lv}단` : `${Math.floor(G.boost % 100)}%`, bb.x, bb.y + bb.r * 0.62, 15, lv >= 2 ? C.yellow : '#fff', { lw: 4 });
    } else {
      icon('e_rocket', bb.x, bb.y - 10, 44);
      text('질주', bb.x, bb.y + 28, 17, '#fff');
    }
    buttons.push({ x: bb.x - bb.r, y: bb.y - bb.r, w: bb.r * 2, h: bb.r * 2, on: tryBoost });
  }
  // 보스 경고
  if (G.bossWarnT > 0 && !G.boss && G.run) { drawHazardBands('⚠ 보스 ⚠', `${BOSS_DEF[G.cfg.boss].name}이(가) 떨어져요!`); }
  else if (G.bossWarnT > 0 && !G.boss) {
    const a = 0.55 + 0.45 * Math.sin(T * 14);
    ctx.fillStyle = `rgba(255,30,60,${0.25 * a})`; ctx.fillRect(0, 0, W, H);
    for (const yy of [96, H - 126]) {
      ctx.fillStyle = 'rgba(20,0,0,.75)'; ctx.fillRect(0, yy, W, 34);
      ctx.save(); ctx.beginPath(); ctx.rect(0, yy, W, 34); ctx.clip();
      for (let i = -1; i < 9; i++) text('위험! 위험!', ((i * 170 + T * 240 * (yy < H / 2 ? 1 : -1)) % (W + 170) + W + 170) % (W + 170) - 85, yy + 18, 22, '#ff3355', { stroke: false });
      ctx.restore();
    }
    text(`${BOSS_DEF[G.cfg.boss].name}이(가) 와요!`, W / 2, H / 2 - 10, 50, '#ffffff', { stroke: 'rgba(240,68,82,.9)', lw: 9 });
  }
  if (G.enterT > 0) { const k = 1 - G.enterT / 0.8, s = 0.6 + easeOutBack(Math.min(1, k * 1.6)) * 0.5; ctx.save(); ctx.translate(W / 2, H / 2 - 30); ctx.scale(s, s); text('준비…', 0, 0, 64, '#ffffff', { lw: 9 }); ctx.restore(); }
  // 시작 안내
  if (G.intro > 0 && G.intro < 2.8 && !(G.bossWarnT > 0)) { // 「출발!」이 사라진 뒤에 바다 이름
    const a = Math.min(1, G.intro / 0.4, (2.8 - G.intro) / 0.3);
    ctx.save(); ctx.globalAlpha = a;
    if (!endless && n % 10 === 1) text(`제${(n - 1) / 10 + 1}장 · ${worldOf(n).name}`, W / 2, H / 2 - 104, 24, C.yellow, { lw: 6 });
    text(endless ? STAGES[n].name : `${n}번 바다 · ${STAGES[n].name}`, W / 2, H / 2 - 54, 38, '#ffffff');
    wrapText(STAGES[n].tip, 760, 20).forEach((l, i) => text(l, W / 2, H / 2 + i * 30, 20, C.text, { body: true }));
    const fresh = n !== ENDLESS && STAGES[n].fresh;
    if (fresh) { const it = ENEMIES[fresh].weak; drawItemIcon(it, W / 2 - 150, H / 2 + 70, 30); text(`새 몬스터 ${ENEMIES[fresh].name} · 약점 ${ITEMS[it].name}`, W / 2 + 10, H / 2 + 70, 17, C.yellow, { body: true }); }
    else if (n === 1 && save.runs <= 2) text(G.run ? (isTouch ? '왼쪽 톡 = 점프 · 오른쪽 꾹 = 숙이기 · 위에서 밟으면 처치!' : '스페이스·↑ 점프 · ↓ 숙이기 · Shift 질주 · E 아이템') : isTouch ? '손가락으로 끌어서 움직이고, 질주 버튼을 눌러요!' : '방향키로 움직이고, 스페이스로 질주! E로 아이템!', W / 2, H / 2 + 70, 18, C.yellow, { body: true });
    ctx.restore();
  }
}
function drawBoostOverlay() {
  if (!G) return;
  if (G.feverT > 0 || G.eff.double > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.05 + 0.03 * Math.sin(T * 8);
    const rg = ctx.createLinearGradient(0, 0, W, H);
    ['#ff5470', '#ffd34d', '#7dffb0', '#5fd4ff', '#b48bff'].forEach((c, i) => rg.addColorStop(((i / 4) + T * 0.5) % 1, c));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  if (G.eff.freeze > 0) { ctx.fillStyle = `rgba(190,240,255,${0.06 + 0.03 * Math.sin(T * 6)})`; ctx.fillRect(0, 0, W, H); }
  if (G.boosting <= 0) return;
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.65);
  v.addColorStop(0, 'rgba(40,0,90,0)'); v.addColorStop(1, `rgba(60,10,140,${0.26 + 0.06 * Math.sin(T * 12)})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) { const y = rand(0, H), x = rand(0, W), l = rand(60, 200); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - l, y); ctx.stroke(); }
}

// ───────── 컷인: 화면을 사선으로 가로지르는 띠 + 큰 그림 + 큰 글자 ─────────
function updateCutin(dt) { if (cutin) { cutin.t += dt; if (cutin.t >= cutin.dur) cutin = null; } }
function drawCutin() {
  if (!cutin) return;
  const c = cutin, k = c.t / c.dur;
  const inK = easeOutBack(Math.min(1, k / 0.25)), outK = k > 0.8 ? (k - 0.8) / 0.2 : 0;
  const col = c.kind === 'boss' ? ['#2a0610', '#ff3355'] : c.kind === 'finish' ? ['#ffffff', '#ffd54a'] : ['#160a3a', '#7c4dff'];
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${0.45 * (1 - outK)})`; ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2, H / 2); ctx.rotate(-0.12);
  const bandH = c.kind === 'boss' ? 200 : 160, slideX = (1 - inK) * -W + outK * W;
  ctx.translate(slideX, 0);
  const g = ctx.createLinearGradient(-W, 0, W, 0); g.addColorStop(0, col[0]); g.addColorStop(0.5, col[1]); g.addColorStop(1, col[0]);
  ctx.fillStyle = g; ctx.fillRect(-W, -bandH / 2, W * 2, bandH);
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(-W, -bandH / 2 - 8, W * 2, 6); ctx.fillRect(-W, bandH / 2 + 2, W * 2, 6);
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 3;
  for (let i = 0; i < 18; i++) { const y = -bandH / 2 + ((i * 37 + c.t * 900) % bandH); ctx.beginPath(); ctx.moveTo(-W, y); ctx.lineTo(W, y); ctx.stroke(); }
  // 큰 그림
  if (c.kind === 'boss' && G && G.cfg.boss) {
    const d = BOSS_DEF[G.cfg.boss];
    ctx.save(); ctx.translate(W * 0.22, 10);
    if (d.kind === 'shark') drawShark(0, 0, 2.2, d.c1, d.c2, true, false, !!d.king, Math.sin(T * 10) * 0.3, 1);
    else if (d.kind === 'octopus') drawOctopus(0, 10, 3, T, -200, 0, true);
    else drawAngler(0, 0, 3, T, 1, true);
    ctx.restore();
  } else drawHero(-W * 0.24, 10, c.kind === 'finish' ? 210 : 190, -0.15, { face: 'boost', boost: true, ph: T * 20 });
  const tx = c.kind === 'boss' ? -W * 0.12 : W * 0.08;
  const s = 1 + Math.max(0, 0.3 - c.t) * 1.5;
  ctx.save(); ctx.translate(tx, -14); ctx.scale(s, s);
  text(c.title, 0, 0, c.kind === 'boss' ? 64 : 76, c.kind === 'finish' ? '#191F28' : '#ffffff', { stroke: c.kind === 'finish' ? '#ffffff' : 'rgba(0,0,0,.6)', lw: 10 });
  ctx.restore();
  if (c.sub) text(c.sub, tx, 50, 22, c.kind === 'finish' ? '#191F28' : C.yellow, { body: true, stroke: false });
  ctx.restore();
}

// ───────── 눈이 번쩍: 화면 가득 효과 (빛줄기·집중선·테두리 빛·반응 글자·불꽃놀이) ─────────
const scr = { rays: [], reacts: [], works: [], sparks: [], edge: null };
const REACT_WORDS = [['좋아!', '#7cf0ff'], ['굉장해!', '#7dffb0'], ['대박!', '#ffd54a'], ['미쳤다!!', '#ff8a3c'], ['전설이다!!!', '#ff4d8a']];
function burstRays(x, y, color = '#ffffff', dur = 0.9, n = 20) { if (!REDUCE) scr.rays.push({ x, y, color, t: 0, dur, n, rot: rand(0, 6) }); }
function edgeFlash(color, dur = 0.6) { scr.edge = { color, t: 0, dur }; }
function reaction(tier, word) {
  tier = clamp(tier, 0, 4);
  const [w, c] = REACT_WORDS[tier];
  scr.reacts = [{ s: word || w, c, t: 0, dur: 1.15, tier, rot: rand(-0.1, 0.1) }];
  edgeFlash(c, 0.7); shake = Math.max(shake, 10 + tier * 5); zoomTo(1.03 + tier * 0.012);
  snd('react', 0.7 + tier * 0.08, 1 + tier * 0.06, 0.2);
  say(['good', 'great', 'awesome', 'wow', 'legend'][tier]);
  haptic([20 + tier * 10, 20, 30 + tier * 15]);
  burstRays(W / 2, 128, c, 0.9, 14 + tier * 3);
}
function fireworks(n = 5, x0 = 120, x1 = W - 120, yTop = 80) {
  for (let i = 0; i < n; i++) scr.works.push({ x: rand(x0, x1), y: H + 20 + i * 60, vy: -rand(620, 820), ty: rand(yTop, yTop + 160), color: pick(['#ffd54a', '#ff4d8a', '#7cf0ff', '#7dffb0', '#b48bff', '#ff8a3c']), t: 0 });
}
function updateScreenFx(dt) {
  for (const r of scr.rays) r.t += dt;
  scr.rays = scr.rays.filter((r) => r.t < r.dur);
  for (const r of scr.reacts) r.t += dt;
  scr.reacts = scr.reacts.filter((r) => r.t < r.dur);
  if (scr.edge) { scr.edge.t += dt; if (scr.edge.t > scr.edge.dur) scr.edge = null; }
  for (const w of scr.works) {
    w.t += dt; w.y += w.vy * dt;
    if (Math.random() < 0.8) scr.sparks.push({ x: w.x + rand(-2, 2), y: w.y, vx: rand(-20, 20), vy: rand(40, 100), life: 0.4, max: 0.4, c: '#fff4c0', s: 2 });
    if (w.y <= w.ty) {
      w.dead = true;
      for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2, sp = rand(160, 360); scr.sparks.push({ x: w.x, y: w.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.9, 1.4), max: 1.4, c: i % 5 ? w.color : '#ffffff', s: rand(2.5, 4.5), g: true }); }
      snd('firework', 0.55, rand(0.9, 1.15), 0.08);
    }
  }
  scr.works = scr.works.filter((w) => !w.dead);
  for (const s of scr.sparks) { s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.g) { s.vy += 160 * dt; s.vx *= 1 - dt * 1.2; } }
  scr.sparks = scr.sparks.filter((s) => s.life > 0);
}
// 캐릭터 뒤: 빛줄기·오로라 (배경 위, 캐릭터 아래라 캐릭터가 또렷)
function drawScreenFxBehind() {
  if (LOWFX && !scr.rays.length) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const r of scr.rays) {
    const k = r.t / r.dur, a = (1 - k) * 0.26, rad = 900;
    ctx.fillStyle = r.color; ctx.globalAlpha = a;
    for (let i = 0; i < r.n; i++) {
      const ang = r.rot + i * Math.PI * 2 / r.n + r.t * 0.9, w = 0.05 + 0.03 * Math.sin(i * 7);
      ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + Math.cos(ang - w) * rad, r.y + Math.sin(ang - w) * rad); ctx.lineTo(r.x + Math.cos(ang + w) * rad, r.y + Math.sin(ang + w) * rad); ctx.fill();
    }
    const g = ctx.createRadialGradient(r.x, r.y, 4, r.x, r.y, 220 * (0.5 + k)); g.addColorStop(0, r.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a * 0.7; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(r.x, r.y, 160 * (0.5 + k), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  if (G && state === 'play' && G.feverT > 0 && !REDUCE) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let b = 0; b < 3; b++) {
      const g = ctx.createLinearGradient(0, 0, W, 0);
      ['#ff4d8a', '#ffd54a', '#7dffb0', '#7cf0ff', '#b48bff'].forEach((c, i) => g.addColorStop(((i / 4) + T * 0.3 + b * 0.2) % 1, c));
      ctx.globalAlpha = 0.1; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= W; x += 24) ctx.lineTo(x, 60 + b * 40 + Math.sin(x / 120 + T * 2 + b) * 30);
      ctx.lineTo(W, 0); ctx.fill();
    }
    ctx.restore();
  }
}
// 캐릭터 앞: 집중선은 가장자리만, 테두리 빛은 연하게
function drawScreenFxBack() {
  if (LOWFX) return; // 느린 폰: 화면 전체 효과 생략
  if (G && state === 'play') {
    const p = G.p;
    if (G.boosting > 0 && !REDUCE) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.3)';
      for (let i = 0; i < 40; i++) {
        const a = rand(0, Math.PI * 2), r0 = rand(420, 560), r1 = 1100;
        ctx.lineWidth = rand(1, 4.5); ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0); ctx.lineTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1); ctx.stroke();
      }
      ctx.restore();
    }
    if (G.feverT > 0 && !REDUCE) edgeGlow('#ff9ad5', 0.12 + 0.04 * Math.sin(T * 8));
    if (G.boosting > 0) edgeGlow('#8b5cff', 0.25 + 0.06 * Math.sin(T * 12));
  }
  if (scr.edge) edgeGlow(scr.edge.color, 0.45 * (1 - scr.edge.t / scr.edge.dur));
}
function edgeGlow(color, a) {
  if (a <= 0) return;
  const [r, g, b] = rgb(color.length === 7 ? color : '#ffffff');
  const gr = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  gr.addColorStop(0, `rgba(${r},${g},${b},0)`); gr.addColorStop(1, `rgba(${r},${g},${b},${a})`);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// 맨 위: 반응 글자·불꽃놀이
function drawScreenFxTop() {
  for (const w of scr.works) { ctx.fillStyle = '#fff4c0'; ctx.beginPath(); ctx.arc(w.x, w.y, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of scr.sparks) { ctx.globalAlpha = Math.max(0, s.life / s.max); ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  for (const r of scr.reacts) {
    const k = r.t / r.dur;
    const s = k < 0.12 ? 0.3 + (k / 0.12) * 1.05 : k < 0.24 ? 1.35 - ((k - 0.12) / 0.12) * 0.35 : 1 + Math.sin(k * 30) * 0.015;
    const a = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1, size = 56 + r.tier * 7;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2 + (r.tier >= 3 ? rand(-3, 3) : 0), 128); ctx.rotate(r.rot); ctx.scale(s, s);
    ctx.font = `900 ${fs(size)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(16,16,18,.85)'; ctx.strokeText(r.s, 0, 6);
    ctx.lineWidth = 7; ctx.strokeStyle = '#ffffff'; ctx.strokeText(r.s, 0, 0);
    const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, r.c); g.addColorStop(1, mix(r.c, '#000000', 0.25));
    ctx.fillStyle = g; ctx.fillText(r.s, 0, 0);
    ctx.restore();
  }
}

// ───────── 물방울 쏘기 · 체력 · 부술 것 (피하기만 하지 않고 깨부수는 맛) ─────────
const fireGap = () => 0.34 * (1 - save.up.fire * 0.12);
const shotDmg = () => 1 + save.up.power * 0.5;
function fireBullets(dt) {
  const p = G.p;
  if (p.dead || G.won || G.enterT > 0 || G.boosting > 0 || G.eff.whirl > 0) return;
  if (G.run && !(G.boss && !G.boss.dead)) return;
  G.fireT -= dt;
  if (G.fireT > 0) return;
  G.fireT = fireGap();
  const mx = p.x + 44 * p.scale, my = p.y - 4, big = G.eff.giant > 0;
  const spread = G.feverT > 0 ? [-0.16, 0, 0.16] : [0];
  for (const a of spread) G.bullets.push({ x: mx, y: my, vx: Math.cos(a) * 920, vy: Math.sin(a) * 920, r: big ? 14 : 8, dmg: shotDmg() * (big ? 2 : 1), t: 0 });
  fx.push({ k: 'ring', x: mx, y: my, r: 4, maxR: 18, life: 0.15, max: 0.15, color: '#bff3ff', lw: 3 });
  snd('shoot', 0.12, rand(0.95, 1.15), 0.3); // 보스전 내내 나는 소리라 아주 작게·드물게
}
function damageEnemy(e, dmg, bx, by) {
  if (e.dead) return;
  if (ENEMIES[e.type] && ENEMIES[e.type].armored) dmg *= 0.5;
  e.hp -= dmg; hitReact(e, 0.75, 1);
  burst(bx, by, '#ffffff', 5, 260); hitStar(bx, by, false, false); hitNum(bx, by - 20, dmg);
  snd('hit', 0.55, rand(0.95, 1.2), 0.05);
  if (e.hp <= 0) {
    killEnemy(e, 'shot');
    G.shotKills++;
    const M = { 10: [0, '10마리 격추!'], 25: [1, '25마리 격추!'], 50: [2, '50마리 격추!!'], 80: [3, '80마리 격추!!'], 120: [4, '120마리!!!'] };
    if (M[G.shotKills]) reaction(M[G.shotKills][0], M[G.shotKills][1]);
  }
}
const BREAK = { jar: { hp: 1, r: 24, col: '#d9925a', eggs: 8 }, rock: { hp: 8, r: 36, col: '#c98a6a', eggs: 4 }, ice: { hp: 6, r: 34, col: '#bfe8ff', eggs: 4 }, chest: { hp: 4, r: 32, col: '#c8935a', eggs: 10 } };
function spawnBreakable() {
  const world = G.n === ENDLESS ? 1 : worldOf(G.n).id;
  const k = Math.random() < 0.28 ? 'chest' : world === 3 && Math.random() < 0.6 ? 'ice' : 'rock';
  const d = BREAK[k];
  G.breaks.push({ k, x: W + 60, y: rand(CEIL + 80, SEABED - 70), r: d.r, hp: d.hp, maxHp: d.hp, t: 0, hitT: 0, wob: rand(0, 6) });
}
function smashBreak(o, byRam) {
  o.dead = true;
  const d = BREAK[o.k];
  freeze = Math.max(freeze, byRam ? 0.06 : 0.02); shake = Math.max(shake, 14); zoomTo(1.03);
  for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, sp = rand(200, 620); fx.push({ k: 'chunk', x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 160, life: 0.9, max: 0.9, size: rand(8, 18), color: i % 3 ? d.col : '#ffffff', rot: rand(0, 6), vr: rand(-16, 16) }); }
  burst(o.x, o.y, d.col, 30, 520); ring(o.x, o.y, '#ffffff', 140, 0.4, 12);
  pop(o.x, o.y - 50, o.k === 'chest' ? '보물이다!' : o.k === 'jar' ? '쨍그랑!' : pick(['와장창!', '콰직!', '깨부숴!']), o.k === 'chest' ? C.yellow : '#ffffff', o.k === 'jar' ? 26 : 36, true);
  for (let i = 0; i < (G.run ? Math.ceil(d.eggs * 0.4) : d.eggs); i++) G.eggsArr.push({ x: o.x, y: o.y, vx: rand(-260, 260), vy: rand(-300, 200), loose: true, gold: o.k === 'chest' && i < 2, t: 0 });
  if (o.k === 'chest' && Math.random() < 0.4) G.boxes.push({ x: o.x + 30, y: o.y, t: 0 });
  if (o.k === 'ice') sfx.freeze(); else if (o.k === 'chest') { snd('break', 0.6, 1.2); sfx.gold(); } else snd('break', 0.9, rand(0.9, 1.1));
  haptic([30, 20, 50]);
  if (byRam) chainKill(o);
}
function updateShooting(dt, scroll) {
  const p = G.p;
  fireBullets(dt);
  for (const b of G.bullets) {
    b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt;
    for (const e of G.enemies) {
      if (e.dead || e.type === 'whirlpool' || (e.type === 'phantom' && e.vis < 0.5)) continue;
      if (enemyHits(e, b.x, b.y, b.r)) { b.dead = true; damageEnemy(e, b.dmg, b.x, b.y); break; }
    }
    if (b.dead) continue;
    for (const o of G.breaks) if (!o.dead && circ(o.x, o.y, o.r, b.x, b.y, b.r)) {
      b.dead = true; o.hp -= b.dmg; o.hitT = 0.1; o.x += 4; burst(b.x, b.y, BREAK[o.k].col, 5, 240);
      snd('hit', 0.4, 0.8, 0.06);
      if (o.hp <= 0) smashBreak(o, false);
      break;
    }
    if (b.dead) continue;
    if (G.boss && !G.boss.dead && !(G.boss.kind === 'angler' && G.boss.st === 'lurk') && bossHitTest(G.boss, b.x, b.y, b.r)) { b.dead = true; bossChip(b.dmg, b.x, b.y); }
  }
  G.bullets = G.bullets.filter((b) => !b.dead && b.x < W + 40 && b.y > -20 && b.y < H + 20);
  // 부술 것
  G.brkT -= dt;
  if (!G.run && G.brkT <= 0 && !p.dead && !G.goal && !(G.boss && !G.boss.dead)) { G.brkT = rand(4.5, 7.5); spawnBreakable(); }
  for (const o of G.breaks) {
    o.t += dt; o.x -= scroll * dt; o.hitT -= dt;
    if (o.dead || p.dead) continue;
    if (circ(o.x, o.y, o.r, p.x, p.y, p.r * p.scale)) {
      if (o.k === 'jar') { // 숙이기(등껍질 굴리기)로 들이받으면 쨍그랑 — 숙이기를 피하기 말고도 쓰게
        if (p.slide || G.boosting > 0 || G.eff.giant > 0 || (p.vy > 60 && !p.onG && p.y < o.y - 6)) { smashBreak(o, false); G.jarCombo = (G.jarCombo || 0) + 1; if (G.jarCombo >= 3) { pop(o.x, o.y - 90, `항아리 ${G.jarCombo}개 와르르!`, C.yellow, 28, true); addScore(150); } }
        else if (!o.bumped) { o.bumped = true; o.hitT = 0.15; snd('boing', 0.5, 1.3); pop(o.x, o.y - 50, '숙여서 깨요!', '#ffe08a', 20); } // 그냥 닿으면: 거북이는 안 튕기고(리듬 안 깨짐) 항아리만 흔들
        continue;
      }
      if (G.boosting > 0 || G.eff.giant > 0 || G.eff.whirl > 0) smashBreak(o, true);
      else if (G.run && o.k === 'chest') smashBreak(o, false);
      else if (G.run && p.vy > 60 && !p.onG && p.y < o.y - 10) { smashBreak(o, false); p.vy = -(p.holdJ ? 820 : 620); p.bounced = true; pop(o.x, o.y - 80, '밟아 부수기!', '#ffffff', 26); }
      else if (o.k === 'chest') { o.x += 30; p.vx = -260; }
      else hitPlayer({ type: 'rock' });
    }
  }
  G.breaks = G.breaks.filter((o) => !o.dead && o.x > -80);
}
function drawShooting() {
  for (const o of G.breaks) {
    const im = IMG['spr_' + o.k], wob = Math.sin(o.t * 2 + o.wob) * 0.06, sz = o.r * 2.6;
    ctx.save(); ctx.translate(o.x + (o.hitT > 0 ? rand(-3, 3) : 0), o.y); ctx.rotate(wob);
    if (!drawImg(im, 0, 0, sz)) { ctx.fillStyle = BREAK[o.k].col; rr(-o.r, -o.r, o.r * 2, o.r * 2, 10); ctx.fill(); }
    if (o.hitT > 0) drawImg(silhouette('spr_' + o.k, '#ffffff'), 0, 0, sz, 0, 0.6);
    // 금 간 정도
    const dmg = 1 - o.hp / o.maxHp;
    if (dmg > 0.2) { ctx.strokeStyle = 'rgba(30,20,10,.75)'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < Math.ceil(dmg * 5); i++) { const a = i * 1.7 + o.wob; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * o.r * 0.6, Math.sin(a) * o.r * 0.6); ctx.lineTo(Math.cos(a + 0.4) * o.r * 0.95, Math.sin(a + 0.4) * o.r * 0.95); } ctx.stroke(); }
    ctx.restore();
    if (o.hp < o.maxHp) { ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(o.x - 26, o.y - o.r - 18, 52, 7, 3); ctx.fill(); ctx.fillStyle = C.yellow; rr(o.x - 26, o.y - o.r - 18, 52 * Math.max(0, o.hp / o.maxHp), 7, 3); ctx.fill(); }
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const b of G.bullets) {
    const g = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.r * 2.2); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.4, 'rgba(140,220,255,.7)'); g.addColorStop(1, 'rgba(80,170,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  for (const b of G.bullets) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.8, 0, Math.PI * 2); ctx.stroke(); }
  // 맞은 몬스터 체력 막대
  for (const e of G.enemies) if (!e.dead && e.hp < e.maxHp && e.maxHp < 900) { const w = 44; ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(e.x - w / 2, e.y - e.r * ES - 22, w, 6, 3); ctx.fill(); ctx.fillStyle = C.danger; rr(e.x - w / 2, e.y - e.r * ES - 22, w * Math.max(0, e.hp / e.maxHp), 6, 3); ctx.fill(); }
}
