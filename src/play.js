'use strict';
// 터틀 레이스 — 한 판: 바다·적·보스·알·피버·아이템·상성·펫·산호 쉼터·이어하기·별

const isDark = (n) => n !== ENDLESS && !!STAGES[n].dark;
function levelCfg(n) {
  const D = DIFFS[save.diff];
  const slow = (1 - save.up.slow * 0.07) * (petIs('snail') ? 1 - petLv() * 0.02 : 1);
  const boostMul = (1 + save.up.boost * 0.3) * (petIs('cat') ? 1 + petLv() * 0.05 : 1);
  if (n === ENDLESS) return { n, endless: true, speed: 330 * slow * D.speed, pool: ENEMY_KEYS.filter((k) => !ENEMIES[k].darkOnly), length: Infinity, gap: 0.9 * D.gap, boostRate: 12 * boostMul, boss: null, dark: false, D };
  const st = STAGES[n], pool = [];
  for (const k of ENEMY_KEYS) {
    const e = ENEMIES[k];
    if (e.intro <= n && (!e.darkOnly || st.dark)) { pool.push(k); if (st.fresh === k) pool.push(k, k, k); }
  }
  const speed = Math.max(220, 600 - (n - 1) * 12.5) * slow * D.speed;
  return { n, speed, pool, endless: false, length: speed * (36 + n * 0.8), gap: Math.max(0.36, 1.1 - n * 0.022) * D.gap, boostRate: (5 + n * 0.55) * boostMul, boss: st.boss || null, dark: !!st.dark, D };
}
const stageMusic = (n) => (n === ENDLESS ? 'w3' : worldOf(n).music);
const boostDur = () => 3.2 + (petIs('penguin') ? petLv() * 0.3 : 0);
const itemPool = (n) => ITEM_KEYS.filter((k) => n === ENDLESS || ITEMS[k].from <= n);
const nameOf = (n) => (n === ENDLESS ? '끝없는 바다' : `${n}번 바다`);

function startLevel(n) {
  const cfg = levelCfg(n);
  G = {
    n, cfg, D: cfg.D, dist: 0, t: 0, eggs: 0, combo: 0, comboT: 0,
    boost: n === ENDLESS ? 30 : Math.min(60, (n - 1) * 3), boosting: 0,
    shield: save.up.shield + (petIs('whale') ? (petLv() >= 4 ? 2 : 1) : 0),
    enemies: [], eggsArr: [], shots: [], warns: [], inks: [], boxes: [], sweeps: [],
    spawnT: 1.8, eggT: 0.9, boxT: 4, boss: null, bossDone: !cfg.boss, bossWarnT: null, goal: null,
    p: { x: -90, y: H / 2, vx: 0, vy: 0, tx: null, ty: null, r: 20, inv: 1.2, dead: false, rot: 0, trail: [],
         ph: 0, blinkT: 2, face: 'normal', faceT: 0, scared: false, wakeT: 0, flip: 0, scale: 1 },
    pet: save.pet ? { x: -150, y: H / 2 - 50, t: 0, zapT: 3 } : null,
    enterT: 0.8, won: false, winT: 0,
    kills: 0, near: 0, perfect: 0, weak: 0, intro: 2.8, banked: false, deathT: 0, deadT: 0,
    eggsSpawned: 0, eggsGot: 0, hits: 0, revives: 0, freeRevive: false, fever: 0, feverT: 0, feverEggT: 0, sprout: 0, starShown: 0,
    item: null, itemPop: 0, eff: { magnet: 0, giant: 0, freeze: 0, lamp: 0, whirl: 0, double: 0 }, jellySafe: 0,
    slowMul: 1, blessDone: cfg.boss != null, nextBless: 1500, bless: null, chain: 0, chainT: 0, chainBest: 0, feverEggs: 0, zoomAt: null,
  };
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
function bank(cleared) {
  if (G.banked) return;
  G.banked = true;
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
    G.newBest = G.prog > G.prevBest;
    if (G.newBest) save.best[G.n] = G.prog;
  }
  if (cleared) {
    G.starGot = [true, G.eggsGot >= Math.ceil(G.eggsSpawned * 0.7), G.hits === 0];
    save.stars[G.n] = Math.max(save.stars[G.n] || 0, G.starGot.filter(Boolean).length);
    if (save.diff === 2) save.crown[G.n] = true;
    if (G.n < LAST) save.unlocked = Math.max(save.unlocked, G.n + 1);
    track('clear');
  }
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
function pop(x, y, s, color = '#fff', size = 24, big = false) { pops.push({ x, y, s, color, size, life: big ? 1.4 : 0.9, max: big ? 1.4 : 0.9, big }); }
function confetti(n = 70) {
  for (let i = 0; i < n; i++) fx.push({ k: 'confetti', x: rand(0, W), y: rand(-220, -10), vx: rand(-40, 40), vy: rand(120, 260), life: 3.2, max: 3.2, size: rand(4, 9), color: pick(['#ffd34d', '#ff6fa8', '#7cf0ff', '#8dff7a', '#b48bff']), rot: rand(0, 6) });
}
function fountain(x, y, n) { for (let i = 0; i < Math.min(n, 16); i++) fx.push({ k: 'eggfly', sx: x + rand(-30, 30), sy: y + rand(-20, 20), life: 0.6 + i * 0.05, max: 0.6 }); }
const zoomTo = (v) => { zoom = Math.max(zoom, v); };
function updateFx(dt) {
  for (const f of fx) {
    f.life -= dt;
    if (f.k === 'ring') f.r = lerp(f.r, f.maxR, dt * 9);
    else if (f.k === 'eggfly') { if (f.life <= 0) { hudPulse = 0.18; tone(1400, 1800, 0.04, 'square', 0.03); } }
    else if (f.k === 'laser') { /* 그대로 */ }
    else {
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.k === 'confetti') { f.rot += dt * 6; f.vx += Math.sin(T * 3 + f.y * 0.02) * 30 * dt; }
      else { f.vx *= 1 - dt * 3; f.vy *= 1 - dt * 3; }
      if (f.k === 'flame') f.vy -= 60 * dt;
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
  if (d.kills++ === 0 && G) { G.eggs += 10; toast(`도감 등록! ${ENEMIES[type].name} · 알 +10`, C.ok); sfx.mission(); }
}

// ───────── 적 ─────────
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
  }
  if (!e) return;
  Object.assign(e, base);
  if (elite) { e.r *= 1.25; e.vx *= 1.2; }
  G.enemies.push(e);
}
function enemyHits(e, x, y, r) {
  switch (e.type) {
    case 'shark': return circ(e.x - 20, e.y, 19, x, y, r) || circ(e.x + 16, e.y, 15, x, y, r);
    case 'ray': return circ(e.x - 12, e.y, 18, x, y, r) || circ(e.x + 12, e.y, 13, x, y, r);
    case 'eel':
      for (let i = 0; i <= e.len; i += 18) if (circ(e.x + i, e.y + Math.sin(e.t * 12 + i * 0.05) * 6, e.r, x, y, r)) return true;
      return false;
    default: return circ(e.x, e.y, e.r, x, y, r);
  }
}
const harmless = (e) => (e.frozen && ['shark', 'eel', 'ray', 'jelly'].includes(e.type)) || (G.eff.lamp > 0 && (e.type === 'octopus' || e.type === 'angler'));
function weakHit(e, item) {
  G.eggs += 3; G.weak++;
  pop(e.x, e.y - 50, '딱 맞았어요! +3', C.yellow, 24);
  sfx.weak(); haptic(20);
  dexSee(e.type); save.dex[e.type].weak = true;
  if (item) ring(e.x, e.y, '#7cf0ff', 90, 0.4, 6);
}
function killEnemy(e, cause = 'boost') {
  if (e.dead) return;
  e.dead = true;
  freeze = Math.max(freeze, 0.05); shake = Math.max(shake, e.elite ? 14 : 9); zoomTo(1.025);
  const col = (ENEMIES[e.type] || {}).color || '#fff';
  burst(e.x, e.y, col, 24, 460); burst(e.x, e.y, '#ffffff', 8, 300);
  ring(e.x, e.y, C.yellow, 80);
  G.kills++;
  if (cause === 'boost') track('boostKill');
  dexKill(e.type);
  if (cause === 'boost' || cause === 'whirl' || cause === 'giant') chainKill(e);
  if (e.elite) pop(e.x, e.y - 50, '정예 처치!', C.yellow, 28);
  else pop(e.x, e.y - 34, pick(['펑!', '쾅!', '퍽!', '뿅!']), C.yellow, 30);
  if (ENEMIES[e.type] && ENEMIES[e.type].weak === cause) weakHit(e, true);
  sfx.smash(); haptic(25);
  const drops = e.elite ? 4 : 2;
  for (let i = 0; i < drops; i++) G.eggsArr.push({ x: e.x, y: e.y, vx: rand(-80, 160), vy: rand(-160, 160), loose: true, gold: e.elite && i === 0, t: 0 });
}
// 카타르시스: 질주·회오리·커지기로 연달아 들이받으면 점점 커지는 연출, 5연속이면 화면을 휩쓴다
function chainKill(e) {
  G.chain++; G.chainT = 1.6; G.chainBest = Math.max(G.chainBest, G.chain);
  const c = G.chain;
  if (c >= 2) {
    pop(e.x, e.y - 70, `${c}연속!`, c >= 5 ? '#ff6fa8' : C.yellow, Math.min(54, 24 + c * 5), c >= 4);
    if (ac) bell(hz(72 + Math.min(c, 14) * 2), now(), 0.12, 0.4);
    shake = Math.max(shake, 8 + c * 2); haptic(10 + c * 6);
  }
  if (c === 5) sweepScreen('바다를 휩쓸었다!!');
  if (c === 10) { G.eggs += 30; pop(W / 2, H / 2 + 40, '전설의 거북이! 알 +30', C.yellow, 40, true); sfx.fever(); }
}
function sweepScreen(label) {
  flash = 0.7; flashColor = '#ffffff'; shake = 30; freeze = 0.18; timeScale = 0.3; zoomTo(1.12);
  ring(G.p.x, G.p.y, '#ffffff', W, 0.7, 18); ring(G.p.x, G.p.y, C.yellow, W * 0.7, 0.55, 10);
  pop(W / 2, H / 2 - 40, label, '#ffffff', 60, true);
  boom(1); sfx.bossHit(); sfx.fever(); haptic([60, 30, 60, 30, 160]);
  for (const o of G.enemies) if (!o.dead && o.x < W + 30) { o.dead = true; G.kills++; dexKill(o.type); burst(o.x, o.y, (ENEMIES[o.type] || {}).color || '#fff', 18, 500); for (let i = 0; i < 2; i++) G.eggsArr.push({ x: o.x, y: o.y, vx: rand(-120, 120), vy: rand(-200, 200), loose: true, gold: i === 0, t: 0 }); }
  G.shots = [];
}
function setFace(f, t) { G.p.face = f; G.p.faceT = t; }
function hitPlayer(src) {
  const p = G.p;
  if (p.inv > 0 || p.dead || G.won || G.eff.whirl > 0) return;
  G.hits++;
  if (G.shield > 0) {
    G.shield--; p.inv = 1.4; shake = 12; freeze = 0.06; setFace('ouch', 0.6);
    ring(p.x, p.y, '#9ff3ff', 110, 0.5, 8); burst(p.x, p.y, '#bff8ff', 18);
    pop(p.x, p.y - 56, '방패가 막았어요!', '#9ff3ff', 24);
    sfx.shield(); haptic(60);
    if (G.boosting <= 0) { G.boost = Math.min(100, G.boost + 30); pop(p.x, p.y - 84, '분노 충전! 질주 +30', '#ff9aa8', 20); }
    if (src && src.type === 'mine') weakHit(src, false);
    if (src && src.type && ENEMIES[src.type] && src.type !== 'urchin' && src.type !== 'whirlpool') src.dead = true;
    return;
  }
  p.dead = true; p.vy = -260; G.deathT = 1.1;
  freeze = 0.22; shake = 26; flash = 0.55; flashColor = '#ff3355'; timeScale = 0.3; zoomTo(1.14);
  burst(p.x, p.y, '#fff0a0', 34, 520); ring(p.x, p.y, '#ff5470', 140, 0.6, 10);
  sfx.die(); haptic([90, 40, 160]);
  musicFever = false;
}
function tryBoost() {
  if (!G || G.p.dead || G.boosting > 0 || G.won || G.enterT > 0) return;
  if (G.boost < 100) { if (G.boost < 99) sfx.no(); return; }
  G.boost = 0; G.boosting = boostDur();
  freeze = 0.09; flash = 0.5; flashColor = '#b48bff'; shake = 14; timeScale = 0.35; zoomTo(1.08);
  ring(G.p.x, G.p.y, '#b48bff', 220, 0.6, 12); ring(G.p.x, G.p.y, '#5fd4ff', 150, 0.45, 6);
  pop(W / 2, H / 2 - 70, '질주!', '#d9c6ff', 64, true);
  sfx.boost(); haptic([30, 30, 70]);
  track('boost');
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
  if (G.item) { G.eggs += 5; pop(b.x, b.y - 30, '알 +5', C.yellow, 22); sfx.gold(); return; }
  G.item = rollItem(); G.itemPop = 0.6;
  pop(G.p.x, G.p.y - 70, `${ITEMS[G.item].name}!`, '#ffffff', 26);
  sfx.box(); haptic(15);
  if (!save.itemTipSeen) { save.itemTipSeen = true; toast(isTouch ? '아이템 버튼을 눌러서 써요' : 'E 키로 아이템을 써요', C.blueD); }
}
function useItem() {
  if (!G || !G.item || G.p.dead || G.won || G.enterT > 0) { if (G && !G.item) sfx.no(); return; }
  const k = G.item, p = G.p; G.item = null;
  pop(W / 2, H / 2 - 150, ITEMS[k].name, '#ffffff', 36, true);
  haptic([20, 20, 40]); zoomTo(1.04);
  switch (k) {
    case 'magnet': G.eff.magnet = ITEMS.magnet.dur; sfx.magnet(); break;
    case 'double': G.eff.double = ITEMS.double.dur; sfx.double(); break;
    case 'bubble': G.shield++; G.jellySafe = 8; sfx.bubble(); ring(p.x, p.y, '#9ff3ff', 90, 0.5, 8); break;
    case 'freeze': G.eff.freeze = ITEMS.freeze.dur; sfx.freeze(); flash = 0.35; flashColor = '#bfefff'; break;
    case 'giant': G.eff.giant = ITEMS.giant.dur; sfx.giant(); shake = 12; break;
    case 'lamp': G.eff.lamp = ITEMS.lamp.dur; sfx.lamp(); G.inks.forEach((k2) => { k2.fade = true; }); break;
    case 'whirl':
      G.eff.whirl = ITEMS.whirl.dur; sfx.whirl(); p.inv = Math.max(p.inv, 3.3);
      for (const e of G.enemies) if ((e.type === 'whirlpool' || e.type === 'mine') && e.x < W + 40) killEnemy(e, 'whirl');
      break;
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
  const y0 = rand(CEIL + 90, SEABED - 90), amp = rand(40, 90);
  for (let i = 0; i < 9; i++) G.eggsArr.push({ x: W + 30 + i * 36, y: clamp(y0 + Math.sin(i * 0.7 + T) * amp, CEIL + 30, SEABED - 30), gold: true, bonus: true, t: rand(0, 6) });
}
function collectEgg(e) {
  e.got = true;
  setFace('happy', 0.35);
  const mult = (G.feverT > 0 ? 2 : 1) * (G.eff.double > 0 ? 2 : 1);
  const v = (e.gold ? (e.bonus ? 1 : 5) : 1) * mult;
  G.eggs += v;
  if (G.feverT > 0) G.feverEggs += v;
  if (!e.loose && !e.bonus) G.eggsGot++;
  fx.push({ k: 'eggfly', sx: e.x, sy: e.y, life: 0.5, max: 0.5, gold: e.gold });
  G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 0.95;
  if (G.boosting <= 0) G.boost = Math.min(100, G.boost + (e.gold && !e.bonus ? 10 : 2.5));
  if (e.gold && !e.bonus) { sfx.gold(); pop(e.x, e.y - 24, `황금알 +${v}`, C.yellow, 26); burst(e.x, e.y, '#ffe36b', 16); track('gold'); }
  else { sfx.egg(G.combo); burst(e.x, e.y, '#eafff2', 5, 160); }
  if (G.combo > 0 && G.combo % 6 === 0) { pop(G.p.x, G.p.y - 60, `${G.combo}개 연속!`, '#7cf0ff', 30); G.boost = Math.min(100, G.boost + 6); haptic(12); }
  if (petIs('sprout') && ++G.sprout % 10 === 0) { G.eggs += petLv(); pop(G.p.x - 40, G.p.y - 40, `새싹이 +${petLv()}`, '#9dff7a', 20); }
  if (G.feverT <= 0) {
    G.fever = Math.min(100, G.fever + (e.gold ? 14 : 5));
    if (G.fever >= 100) startFever();
  }
}
function startFever() {
  G.feverT = 6; G.fever = 0; G.feverEggT = 0;
  pop(W / 2, H / 2 - 30, '알 소나기! 2배', C.yellow, 60, true);
  flash = 0.45; flashColor = '#ffe36b'; shake = 10; zoomTo(1.05);
  sfx.fever(); haptic([20, 30, 20, 30, 60]);
  musicFever = true;
  track('fever');
}

// ───────── 보스 6종 ─────────
const BOSS_DEF = {
  shark: { name: '상어 대장', hp: 4, kind: 'shark', c1: '#7f9fbf', c2: '#3e5a76', s: 2.5, spd: 1 },
  shark2: { name: '상어 대장', hp: 6, kind: 'shark', c1: '#a6b8d8', c2: '#2a4566', s: 2.6, spd: 1.3 },
  octopus: { name: '대왕 문어', hp: 5, kind: 'octopus', s: 3.2, spd: 1 },
  octopus2: { name: '대왕 문어', hp: 7, kind: 'octopus', s: 3.4, spd: 1.3 },
  angler: { name: '아귀 대왕', hp: 5, kind: 'angler', s: 3, spd: 1 },
  king: { name: '상어왕', hp: 8, kind: 'shark', c1: '#8a6bd6', c2: '#3f2a7a', s: 2.8, spd: 1.2, king: true },
};
function spawnBoss() {
  const d = BOSS_DEF[G.cfg.boss];
  G.boss = { def: d, kind: d.kind, x: W + 260, y: H / 2, hp: d.hp, maxHp: d.hp, st: 'enter', t: 0, cd: 2.4, shoot: 1.4, hurt: 0, ihit: 0, stun: 0, dead: false, deadT: 0, cycle: 0, s: d.s };
  pop(W / 2, H / 2 - 40, `${d.name}이(가) 나타났어요!`, C.danger, 44, true);
  shake = 18; zoomTo(1.05);
  setMusic('boss');
  sfx.roar(); haptic([80, 50, 120]);
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
  if (b.stun > 0) { b.stun -= dt; b.x = lerp(b.x, W - 170, dt * 2); return; }
  const sdt = dt * (G.eff.freeze > 0 ? 0.4 : 1) * d.spd;
  b.t += sdt;
  const homeX = W - 170, minY = CEIL + 70, maxY = SEABED - 60;
  const trackY = (spd) => { b.y += clamp(p.y - b.y, -1, 1) * Math.min(spd, Math.abs(p.y - b.y) * 2.5) * sdt; };
  if (b.kind === 'shark') {
    switch (b.st) {
      case 'enter': b.x = lerp(b.x, homeX, sdt * 2.5); trackY(120); if (b.x < homeX + 12) { b.st = 'idle'; b.t = 0; } break;
      case 'idle':
        trackY(170); b.x = lerp(b.x, homeX, sdt * 3);
        b.shoot -= sdt;
        if (b.shoot <= 0) { b.shoot = d.king ? 0.9 : 1.35; G.shots.push({ x: b.x - 80, y: b.y + 12, vx: -440, vy: rand(-50, 50), r: 13, t: 0 }); sfx.shoot(); }
        b.cd -= sdt;
        if (b.cd <= 0) {
          b.cycle++;
          if (d.king && b.cycle % 2 === 0) { // 상어왕: 부하 부르기 + 먹물
            for (let i = 0; i < 2; i++) G.warns.push({ kind: 'shark', y: clamp(p.y + rand(-120, 120), CEIL + 40, SEABED - 40), t: 0.9 + i * 0.3, max: 0.9 });
            for (let i = 0; i < 2; i++) G.inks.push({ x: W - 260 - i * 120, y: rand(CEIL + 80, SEABED - 80), r: 80, a: 0.9, t: 0, vx: -60 });
            sfx.warn(); sfx.ink(); b.cd = 2.2;
          } else { b.st = 'windup'; b.t = 0; sfx.warn(); haptic(30); }
        }
        break;
      case 'windup':
        if (b.t < 0.7) trackY(220);
        b.x = homeX + 30 * b.t + Math.sin(b.t * 70) * 4;
        if (b.t > 0.9) { b.st = 'charge'; b.t = 0; noise(0.5, 0.3, 2000); }
        break;
      case 'charge': b.x -= 1150 * sdt; if (b.x < -260) { b.x = W + 260; b.st = 'enter'; b.cd = rand(2.2, 3.4); } break;
      case 'retreat': b.x += 600 * sdt; if (b.x > W + 200) { b.st = 'enter'; b.cd = 2.5; } break;
      case 'knock': b.x = lerp(b.x, homeX + 40, sdt * 5); if (b.t > 0.6) { b.st = 'idle'; b.cd = Math.max(b.cd, 1.4); } break;
    }
  } else if (b.kind === 'octopus') {
    switch (b.st) {
      case 'enter': b.x = lerp(b.x, homeX, sdt * 2); if (b.x < homeX + 12) { b.st = 'idle'; b.t = 0; } break;
      case 'idle':
        b.y = lerp(b.y, H / 2 + Math.sin(b.t * 1.3) * 110, sdt * 2); b.x = lerp(b.x, homeX, sdt * 3);
        b.shoot -= sdt;
        if (b.shoot <= 0 && G.eff.lamp <= 0) { b.shoot = 1.8; G.inks.push({ x: b.x - 110, y: clamp(p.y + rand(-60, 60), CEIL + 60, SEABED - 60), r: 70, a: 0.95, t: 0, vx: -320 }); sfx.ink(); }
        b.cd -= sdt;
        if (b.cd <= 0) { // 다리 휘두르기: 위·가운데·아래 중 한 줄 미리 표시
          const lane = pick([0, 1, 2]), lh = (SEABED - CEIL) / 3, y0 = CEIL + 10 + lane * lh;
          G.sweeps.push({ y0, y1: y0 + lh - 10, t: 0.95, x: W + 60, on: false });
          if (d.spd > 1 || b.hp <= 2) { const l2 = (lane + 1 + ((Math.random() * 2) | 0)) % 3, y2 = CEIL + 10 + l2 * lh; G.sweeps.push({ y0: y2, y1: y2 + lh - 10, t: 1.5, x: W + 60, on: false }); }
          b.cd = rand(2.6, 3.6); sfx.warn(); haptic(25);
        }
        break;
      case 'retreat': b.st = 'idle'; break;
      case 'knock': b.x = lerp(b.x, homeX + 50, sdt * 5); if (b.t > 0.6) b.st = 'idle'; break;
    }
  } else { // 아귀: 어둠 속 미끼 → 덥석 → 잠깐 멈춤(때릴 틈) → 물러남
    switch (b.st) {
      case 'enter': b.x = W + 120; b.st = 'lurk'; b.t = 0; break;
      case 'lurk':
        b.x = lerp(b.x, W + 90, sdt * 3); trackY(140);
        b.shoot -= sdt;
        if (b.shoot <= 0) { b.shoot = 1.6; G.shots.push({ x: W - 30, y: b.y - 60, vx: -380, vy: rand(-30, 30), r: 12, t: 0, fake: true }); }
        if (b.t > 2.6) { b.st = 'windup'; b.t = 0; sfx.lunge(); haptic(30); }
        break;
      case 'windup': trackY(200); if (b.t > 0.8) { b.st = 'lunge'; b.t = 0; } break;
      case 'lunge': b.x -= 900 * sdt; if (b.x < W * 0.42) { b.st = 'bite'; b.t = 0; sfx.lunge(); shake = 10; } break;
      case 'bite': if (b.t > 0.9) { b.st = 'retreat'; b.t = 0; } break;
      case 'retreat': b.x += 700 * sdt; if (b.x > W + 90) { b.st = 'lurk'; b.t = 0; } break;
      case 'knock': b.x += 300 * sdt; if (b.t > 0.6) { b.st = 'retreat'; b.t = 0; } break;
    }
  }
  b.y = clamp(b.y, minY, maxY);
  if (!p.dead && bossHitTest(b, p.x, p.y, p.r * p.scale)) {
    if (G.boosting > 0 || G.eff.giant > 0 || G.eff.whirl > 0) { if (b.ihit <= 0) bossDamage(); }
    else if (!(b.kind === 'angler' && b.st === 'lurk')) hitPlayer({ type: 'boss' });
  }
}
function bossDamage() {
  const b = G.boss, p = G.p;
  b.hp--; b.ihit = 0.7; b.hurt = 0.3; b.st = 'knock'; b.t = 0; b.x += 70;
  p.x -= 90; p.vx = -320;
  freeze = 0.16; shake = 26; flash = 0.4; flashColor = '#ffffff'; zoomTo(1.1);
  burst(b.x - 50, b.y, '#ffe36b', 30, 560); burst(b.x - 50, b.y, '#ffffff', 14, 400);
  ring(b.x - 50, b.y, '#ffe36b', 180, 0.5, 12);
  pop(b.x - 40, b.y - 90, '크게 한 방!', C.yellow, 44, true);
  sfx.bossHit(); haptic([60, 30, 100]);
  if (b.hp <= 0) {
    b.dead = true; b.deadT = 2.2; timeScale = 0.12; freeze = 0.5; zoom = 1.3; G.zoomAt = { x: b.x - 40, y: b.y };
    flash = 0.9; flashColor = '#ffffff'; shake = 34;
    pop(clamp(b.x - 60, 260, W - 260), clamp(b.y - 120, 120, H - 160), '마무리!!', '#ffffff', 70, true);
    setTimeout(() => { if (G && state === 'play') { pop(W / 2, H / 2 - 20, `${b.def.name}을(를) 이겼어요!`, C.yellow, 50, true); sfx.clear(); } }, 900);
    for (let k = 0; k < 5; k++) setTimeout(() => { if (G && G.boss) { boom(0.9); noise(0.5, 0.5, 3000); } }, 150 + k * 220);
    for (let i = 0; i < 26; i++) G.eggsArr.push({ x: b.x, y: b.y, vx: rand(-420, 120), vy: rand(-300, 300), loose: true, gold: i % 9 === 0, t: 0 });
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
  switch (b.k) {
    case 'boost': G.boost = 100; break;
    case 'shield': G.shield++; break;
    case 'magnet': G.eff.magnet = 20; break;
    case 'item': G.item = rollItem(); break;
    case 'slow': G.slowMul *= 0.9; break;
    case 'eggs': G.eggs += 25; fountain(W / 2, H / 2, 25); break;
    case 'revive': G.freeRevive = true; break;
    case 'double': G.eff.double = 15; break;
  }
  G.bless = null; state = 'play'; p.inv = Math.max(p.inv, 1.2);
  pop(W / 2, H / 2 - 60, b.name, '#ffffff', 40, true);
  sfx.levelup(); haptic(30);
}

// ───────── 이어하기 ─────────
const reviveCost = () => (G.freeRevive ? 0 : Math.round(25 * Math.pow(2, G.revives) * G.D.revive));
const canRevive = () => G.revives < 3 && (G.freeRevive || save.eggs + G.eggs >= reviveCost());
function doRevive() {
  if (!canRevive()) { sfx.no(); return; }
  const cost = reviveCost(), fromRun = Math.min(G.eggs, cost);
  G.eggs -= fromRun; save.eggs -= cost - fromRun;
  if (G.freeRevive) G.freeRevive = false;
  G.revives++;
  const p = G.p;
  Object.assign(p, { dead: false, vy: 0, vx: 0, x: 170, y: H / 2, rot: 0, inv: 2.6, flip: 0 });
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
  if (G.intro > 0) G.intro -= dt;
  for (const k in E) if (E[k] > 0) E[k] -= dt;
  if (G.jellySafe > 0) G.jellySafe -= dt;
  if (G.itemPop > 0) G.itemPop -= dt;
  const bossFight = G.boss && !G.boss.dead;
  const whirling = E.whirl > 0;
  const scroll = cfg.speed * G.slowMul * (G.boosting > 0 || whirling ? 2.3 : 1) * (bossFight ? 0.55 : 1) * (p.dead ? 0.3 : 1);
  G.dist += scroll * dt;
  updateBubbles(dt, scroll);
  p.scale = lerp(p.scale, E.giant > 0 ? 1.75 : 1, Math.min(1, dt * 8));

  // 질주·알 소나기
  if (G.boosting > 0) {
    G.boosting -= dt;
    if (Math.random() < dt * 60) fx.push({ k: 'flame', x: p.x - 22 + rand(-10, 10), y: p.y + rand(-26, 26), vx: rand(-320, -160), vy: rand(-40, 20), life: 0.42, max: 0.42, size: rand(6, 12), color: pick(['#7c4dff', '#4fc3ff', '#b388ff', '#e0d4ff']) });
    if (G.boosting <= 0) { p.inv = Math.max(p.inv, 0.9); pop(p.x, p.y - 56, '질주 끝', '#cfd8ff', 18); }
  } else if (!p.dead) {
    const before = G.boost;
    G.boost = Math.min(100, G.boost + (cfg.boostRate + (bossFight ? 12 : 0)) * dt);
    if (before < 100 && G.boost >= 100) { sfx.ready(); pop(p.x, p.y - 60, '질주 준비!', '#d9c6ff', 26); haptic(15); }
  }
  if (G.comboT > 0) G.comboT -= dt;
  if (G.chainT > 0) {
    G.chainT -= dt;
    if (G.chainT <= 0) {
      if (G.chain >= 3) { const bonus = G.chain * 2; G.eggs += bonus; pop(W / 2, H / 2 + 30, `${G.chain}연속 처치! 알 +${bonus}`, C.yellow, 34, true); sfx.mission(); }
      G.chain = 0;
    }
  }
  if (G.feverT > 0) {
    G.feverT -= dt; G.feverEggT -= dt;
    if (G.feverEggT <= 0 && !p.dead) { G.feverEggT = 0.5; spawnEggRain(); }
    if (G.feverT <= 0) {
      musicFever = false;
      if (G.feverEggs > 0) { pop(W / 2, H / 2 - 40, `알 소나기 +${G.feverEggs}!`, C.yellow, 46, true); fountain(G.p.x, G.p.y, G.feverEggs); sfx.gift(); haptic([20, 20, 40]); }
      G.feverEggs = 0;
    }
  } else if (G.comboT <= 0) G.fever = Math.max(0, G.fever - 9 * dt);

  // 골인 연출
  if (G.won) {
    G.winT -= dt;
    p.x += 380 * dt; p.y = lerp(p.y, H / 2 - 30, dt * 3);
    p.flip = Math.min(Math.PI * 2, p.flip + dt * 11); p.ph += dt * 16;
    if (Math.random() < dt * 30) fx.push({ k: 'bub', x: p.x - 40, y: p.y + rand(-8, 8), vx: rand(-160, -80), vy: rand(-40, 0), life: 0.8, max: 0.8, size: rand(2, 5) });
    if (G.pet) { G.pet.x = lerp(G.pet.x, p.x - 62, dt * 6); G.pet.y = lerp(G.pet.y, p.y - 54, dt * 6); }
    if (G.winT <= 0) finishClear();
    return;
  }
  // 등장
  if (G.enterT > 0) {
    G.enterT -= dt;
    const k = 1 - Math.max(0, G.enterT) / 0.8;
    p.x = lerp(-90, 170 + SAFE, 1 - (1 - k) * (1 - k)); p.ph += dt * 18;
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
  else if (!p.dead) {
    let ix = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    let iy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
    if (drag && p.tx != null) {
      p.vx = clamp((p.tx - p.x) * 14, -760, 760);
      p.vy = clamp((p.ty - p.y) * 14, -760, 760);
    } else {
      if (ix && iy) { ix *= 0.7071; iy *= 0.7071; }
      const sp = 440 * (petIs('rabbit') ? 1 + petLv() * 0.05 : 1), a = Math.min(1, dt * 16);
      p.vx += (ix * sp - p.vx) * a; p.vy += (iy * sp - p.vy) * a;
    }
    if (whirling) p.vx = lerp(p.vx, (E.whirl > 1 ? 640 - p.x : 220 - p.x) * 4, Math.min(1, dt * 6));
    const maxX = G.boosting > 0 || whirling ? 820 : 470;
    p.x += p.vx * dt; p.y += p.vy * dt;
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
  if (!p.dead) {
    const D = G.D;
    if (!finishing && !bossFight && G.bossWarnT == null) {
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
    if (G.boxT <= 0 && !finishing) { G.boxT = rand(9, 13); G.boxes.push({ x: W + 40, y: rand(CEIL + 70, SEABED - 70), t: 0 }); }
    if (finishing && cfg.boss && !G.boss && !G.bossDone) {
      if (G.bossWarnT == null) { G.bossWarnT = 2.4; sfx.siren(); haptic([60, 60, 60, 60, 60]); }
      else { G.bossWarnT -= dt; if (G.bossWarnT <= 0) spawnBoss(); }
    } else if (finishing && G.bossDone && !G.goal) G.goal = { x: W + 140 };
  }

  // 경고 → 등장
  for (const w of G.warns) {
    w.t -= dt;
    if (w.kind === 'shark') w.y = lerp(w.y, clamp(p.y, CEIL + 40, SEABED - 40), dt * 1.6);
    if (w.t <= 0) {
      w.done = true;
      const e = w.kind === 'shark'
        ? { type: 'shark', x: W + 80, y: w.y, r: 20, vx: -230 - (cfg.endless ? 60 : G.n * 4), t: 0, elite: w.elite }
        : { type: 'eel', x: W + 40, y: w.y, r: 12, vx: -950, len: 150, t: 0, elite: w.elite };
      if (e.elite) { e.r *= 1.2; e.vx *= 1.2; }
      G.enemies.push(e);
    }
  }
  G.warns = G.warns.filter((w) => !w.done);

  // 적
  const fz = E.freeze > 0 ? 0.3 : 1;
  for (const e of G.enemies) {
    e.frozen = E.freeze > 0;
    if (e.x < W) dexSee(e.type);
    if (e.stun > 0) { e.stun -= dt; e.x -= scroll * dt; continue; }
    const edt = dt * fz;
    e.t += edt;
    e.x += (-scroll + e.vx * fz) * dt;
    switch (e.type) {
      case 'jelly': e.y = e.baseY + Math.sin(e.t * 2.2 + e.ph) * e.amp; break;
      case 'shark': if (e.x > p.x + 140) e.y += clamp(p.y - e.y, -1, 1) * Math.min(80, Math.abs(p.y - e.y) * 1.4) * edt; break;
      case 'puffer': { const d = Math.hypot(e.x - p.x, e.y - p.y); e.r = lerp(e.r, d < 175 ? 36 : 15, Math.min(1, edt * 6)); e.y += Math.sin(e.t * 1.6 + e.ph) * 22 * edt; break; }
      case 'octopus':
        e.y = e.baseY + Math.sin(e.t * 1.8 + e.ph) * 26;
        e.inkT -= edt;
        if (e.inkT <= 0 && e.x < W - 60 && e.x > p.x + 80 && E.lamp <= 0) { e.inkT = rand(2.2, 3.2); G.inks.push({ x: e.x - 50, y: e.y, r: 72, a: 0.95, t: 0, vx: -110 }); sfx.ink(); }
        break;
      case 'angler':
        if (!e.lunge && e.x - p.x < 240 && e.x > p.x) { e.lunge = true; e.vx = -520; e.vy = clamp((p.y - e.y) * 2, -260, 260); sfx.lunge(); }
        if (e.lunge) e.y += (e.vy || 0) * edt;
        break;
      case 'ray': e.y = e.baseY + Math.sin(e.t * 2.5 + e.ph) * e.amp; break;
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
        if (!e.armed && d < 130 && !p.dead) { e.armed = true; e.armT = 0.75; }
        if (e.armed) {
          e.armT -= edt; e.beepT -= edt;
          if (e.beepT <= 0) { e.beepT = 0.12; sfx.beep(); }
          if (e.armT <= 0) {
            e.dead = true; sfx.mineBoom(); shake = 18; flash = 0.3; flashColor = '#ffb070';
            burst(e.x, e.y, '#ffb070', 36, 520); ring(e.x, e.y, '#ff5470', 120, 0.5, 10);
            if (Math.hypot(e.x - p.x, e.y - p.y) < 110 + p.r * p.scale && !p.dead) {
              if (G.boosting > 0 || E.giant > 0) weakHit(e, false); else hitPlayer(e);
            }
          }
        }
        break;
      }
      case 'whirlpool': {
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
        if (d < 140 && d > 1 && !p.dead && G.boosting <= 0 && !whirling && E.giant <= 0) {
          const f = 260 * (1 - d / 140) * dt;
          p.x += dx / d * f; p.y += dy / d * f; p.rot += 0.05;
        }
        break;
      }
    }
    if (p.dead || e.dead) continue;
    const pr = p.r * p.scale;
    if (enemyHits(e, p.x, p.y, pr)) {
      if (G.boosting > 0) killEnemy(e, 'boost');
      else if (whirling) killEnemy(e, 'whirl');
      else if (E.giant > 0) killEnemy(e, 'giant');
      else if (harmless(e)) killEnemy(e, e.frozen && ENEMIES[e.type].weak === 'freeze' ? 'freeze' : 'lamp');
      else if (e.type === 'jelly' && G.jellySafe > 0) killEnemy(e, 'bubble');
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
          G.perfect++; G.boost = Math.min(100, G.boost + 14); timeScale = 0.35; zoomTo(1.04);
          pop(p.x, p.y - 52, '완벽 회피!', C.yellow, 28); sfx.perfect(); haptic(20);
        } else {
          G.boost = Math.min(100, G.boost + 7);
          pop(p.x, p.y - 48, pick(['아슬아슬!', '휴~ 살았다!', '나이스 회피!']), '#7cf0ff', 22); sfx.near();
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
    if (!s.on) { s.t -= dt; if (s.t <= 0) { s.on = true; sfx.swoosh(); shake = 8; } continue; }
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
  G.shots = G.shots.filter((s) => !s.dead && s.x > -40);
  if (G.boss) updateBoss(dt);

  // 아이템 상자
  for (const b of G.boxes) {
    b.t += dt; b.x -= scroll * dt;
    if (!p.dead && circ(b.x, b.y, 24, p.x, p.y, p.r * p.scale)) pickupBox(b);
  }
  G.boxes = G.boxes.filter((b) => !b.got && b.x > -40);

  // 알
  const magR = Math.max([0, 75, 125, 185][save.up.magnet] + (petIs('chick') ? 40 + petLv() * 20 : 0), G.boosting > 0 || G.feverT > 0 ? 150 : 0, E.magnet > 0 ? 270 : 0);
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
    if (!p.dead && p.x + p.r > G.goal.x - 34) levelClear();
  }
}
function levelClear() {
  G.won = true; G.winT = 1.1; G.p.inv = 99; G.p.flip = 0;
  setFace('happy', 9);
  for (const e of G.enemies) { burst(e.x, e.y, (ENEMIES[e.type] || {}).color || '#fff', 10); e.dead = true; }
  G.enemies = []; G.shots = []; G.warns = []; G.sweeps = [];
  pop(W / 2, H / 2 - 60, G.n === LAST ? '공주님!' : '도착!', C.yellow, 60, true);
  shake = 6; sfx.ready(); haptic([30, 40, 60]);
}
function finishClear() {
  bank(true);
  endT = 0; G.starShown = 0;
  shake = 8; flash = 0.4; flashColor = '#fff6c0';
  confetti();
  sfx.clear(); musicFever = false;
  if (G.n === LAST) { save.cleared = true; persist(); state = 'ending'; setMusic('ending'); }
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
    ctx.strokeStyle = 'rgba(200,240,255,.85)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(gx + 50, y, 78, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(200,240,255,.12)'; ctx.fill();
    text('도와줘요!', gx + 50, y - 100, 22, '#ffd1ef');
    return;
  }
  ctx.fillStyle = '#ff7f9e';
  rr(gx, CEIL + 60, 26, SEABED - CEIL - 60, 12); ctx.fill();
  ctx.fillStyle = '#ff5b84';
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(gx + 13 + Math.sin(i * 2) * 8, CEIL + 90 + i * 62, 9, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(gx + 13, CEIL + 60); ctx.lineTo(gx + 13, CEIL + 10); ctx.stroke();
  const wave = Math.sin(T * 6) * 5;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    ctx.fillStyle = (r + c) % 2 ? '#111' : '#fff';
    ctx.fillRect(gx + 15 + c * 12, CEIL + 10 + r * 10 + wave * (c / 4), 12, 10);
  }
  text('도착', gx + 13, CEIL + 54, 18, '#fff');
  drawFish(gx + 70, SEABED - 60 + Math.sin(T * 3) * 6, 0.8);
}
function drawEgg(e) {
  const bob = Math.sin(e.t * 4) * 3, h = e.gold && !e.bonus ? 34 : 28;
  if (e.gold) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(e.x, e.y + bob, 2, e.x, e.y + bob, 30);
    g.addColorStop(0, 'rgba(255,220,90,.7)'); g.addColorStop(1, 'rgba(255,220,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y + bob, 30, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  const im = e.gold || G.eff.double > 0 ? silhouette('egg', '#ffc93a') : IMG.egg;
  if (!drawImg(im, e.x, e.y + bob, h, Math.sin(e.t * 3) * 0.15)) {
    ctx.fillStyle = e.gold ? '#ffc93a' : '#f6f1e2'; ctx.beginPath(); ctx.ellipse(e.x, e.y + bob, 10, 13, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (e.gold) { ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(T * 10); ctx.beginPath(); ctx.arc(e.x - 5, e.y + bob - 7, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
}
function drawBoss(b, px, py) {
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
  for (const b of G.boxes) drawItemBox(b);
  for (const e of G.eggsArr) drawEgg(e);
  for (const e of G.enemies) drawEnemy(e, p.x, p.y);
  if (G.boss) drawBoss(G.boss, p.x, p.y);
  for (const s of G.shots) {
    if (s.fake) { drawImg(silhouette('egg', '#ffc93a'), s.x, s.y, 26, s.t * 6); continue; }
    ctx.fillStyle = '#2a1030'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,60,90,${0.6 + 0.4 * Math.sin(s.t * 20)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  // 문어 다리
  for (const s of G.sweeps) {
    if (!s.on) { ctx.fillStyle = `rgba(255,60,90,${0.18 + 0.15 * Math.sin(T * 30)})`; ctx.fillRect(0, s.y0, W, s.y1 - s.y0); continue; }
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
    for (let i = p.trail.length - 1; i >= 1; i--) { const tr = p.trail[i]; drawHero(tr.x - 6, tr.y + 4, 92 * p.scale, tr.rot, { ghost: E.whirl > 0 ? '#7cf0ff' : i % 2 ? '#8b5cff' : '#4fb8ff', alpha: 0.4 * (1 - i / p.trail.length), ph: p.ph, boost: true, stretch: 1.1 }); }
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
  drawHero(p.x - 6 * p.scale, p.y + (4 + bob) * p.scale, 92 * p.scale, p.rot + p.flip, {
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
  // 파편·번개·레이저
  for (const f of fx) {
    const a = Math.max(0, f.life / f.max);
    if (f.k === 'spark') { ctx.globalAlpha = a; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.size * (0.4 + a * 0.6), 0, Math.PI * 2); ctx.fill(); }
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
  if (G.cfg.dark) {
    const r = E.lamp > 0 ? 560 : G.boosting > 0 ? 420 : G.feverT > 0 ? 320 : 230;
    const g = ctx.createRadialGradient(p.x, p.y, r * 0.3, p.x, p.y, r);
    g.addColorStop(0, 'rgba(0,3,10,0)'); g.addColorStop(1, E.lamp > 0 ? 'rgba(0,3,10,.55)' : 'rgba(0,3,10,.93)');
    ctx.fillStyle = g; ctx.fillRect(-80, -80, W + 160, H + 160);
    for (const b of G.boxes) { ctx.save(); ctx.globalAlpha = 0.6; drawItemBox(b); ctx.restore(); }
  }
  // 아귀 미끼는 어둠 위에서도 진짜 황금알처럼 반짝
  for (const e of G.enemies) if (e.type === 'angler' && !e.dead) drawLure(e.x, e.y, e.r / 22, e.t);
  if (G.boss && G.boss.kind === 'angler' && !G.boss.dead) drawLure(Math.min(G.boss.x, W - 30 + 40 * G.boss.s), G.boss.y, G.boss.s, G.boss.t);
  if (E.lamp > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 200); g.addColorStop(0, 'rgba(255,230,150,.22)'); g.addColorStop(1, 'rgba(255,230,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 200, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  // 경고는 어둠 위에
  for (const w of G.warns) {
    const blinkOn = Math.sin(T * 30) > 0;
    if (w.kind === 'eel') {
      ctx.strokeStyle = `rgba(255,50,80,${blinkOn ? 0.7 : 0.3})`; ctx.lineWidth = 3; ctx.setLineDash([16, 10]);
      ctx.beginPath(); ctx.moveTo(0, w.y); ctx.lineTo(W, w.y); ctx.stroke(); ctx.setLineDash([]);
    }
    if (blinkOn || w.t > w.max * 0.5) {
      ctx.fillStyle = '#ff3355';
      ctx.beginPath(); ctx.moveTo(W - 14 - SAFE, w.y); ctx.lineTo(W - 50 - SAFE, w.y - 22); ctx.lineTo(W - 50 - SAFE, w.y + 22); ctx.fill();
      text('!', W - 66 - SAFE, w.y + 2, 34, '#ff3355', { stroke: '#fff', lw: 5 });
    }
  }
}
function drawPops() {
  for (const p of pops) {
    const age = p.max - p.life, s = age < 0.12 ? 0.5 + age / 0.12 * 0.7 : age < 0.22 ? 1.2 - (age - 0.12) / 0.1 * 0.2 : 1;
    ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 0.3); ctx.translate(p.x, p.y); ctx.scale(s, s);
    text(p.s, 0, 0, p.size, p.color);
    ctx.restore();
  }
}
const BOOST_BTN = () => ({ x: W - SAFE - 92, y: H - 92, r: 60 });
const ITEM_BTN = () => ({ x: W - SAFE - 214, y: H - 70, r: 44 });
function drawHUD() {
  const n = G.n, endless = G.cfg.endless, L = 22 + SAFE;
  text(endless ? STAGES[n].name : `${n}번 바다 · ${STAGES[n].name}`, L, 30, 18, C.text, { align: 'left' });
  if (save.diff !== 1) text(DIFFS[save.diff].name, L, 54, 13, save.diff === 2 ? C.danger : C.ok, { align: 'left', body: true });
  let sx = L + 12;
  for (let i = 0; i < G.shield; i++) { icon('e_shield', sx, 80, 26); sx += 30; }
  // 켜진 아이템 효과 (남은 시간 고리)
  for (const k of ['magnet', 'double', 'freeze', 'giant', 'lamp', 'whirl']) {
    const v = G.eff[k]; if (v <= 0) continue;
    const max = Math.max(v, ITEMS[k].dur);
    ctx.fillStyle = 'rgba(16,16,18,.55)'; ctx.beginPath(); ctx.arc(sx + 4, 80, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.yellow; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx + 4, 80, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, v / max)); ctx.stroke();
    drawItemIcon(k, sx + 4, 80, 22); sx += 42;
  }
  const bx = W / 2 - 180, by = 20, bw = 360, bh = 14;
  if (G.boss && !G.boss.dead) {
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
      ctx.strokeStyle = C.yellow; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fxp, by - 6); ctx.lineTo(fxp, by + bh + 4); ctx.stroke();
      text('최고', fxp, by + bh + 15, 13, C.yellow, { body: true });
    }
    drawHero(bx + bw * pr, by + bh / 2, 30, 0, { ph: T * 10, stand: true });
    drawImg(IMG.princess, bx + bw + 22, by + bh / 2, 30, 0, n === LAST ? 1 : 0.45);
  }
  const eh = eggHud();
  eggBadge(eh.x, eh.y, save.eggs + G.eggs, 28 * (1 + hudPulse * 1.6));
  if (isTouch) button(W - SAFE - 60, 52, 46, 40, 'II', () => { if (!G.p.dead) state = 'pause'; }, { size: 17, color: '#cfd8ff' });
  // 질주 게이지
  const gx = L, gy = H - 46, gw = 270, gh = 20, full = G.boost >= 100;
  icon('e_rocket', gx + 10, gy - 16, 24);
  text('질주', gx + 28, gy - 16, 16, C.text, { align: 'left', body: true });
  ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(gx, gy, gw, gh, 10); ctx.fill();
  const v = G.boosting > 0 ? G.boosting / boostDur() : G.boost / 100;
  const gg = ctx.createLinearGradient(gx, 0, gx + gw, 0); gg.addColorStop(0, C.blueD); gg.addColorStop(1, C.deep);
  ctx.save();
  if (full || G.boosting > 0) { ctx.shadowColor = '#b48bff'; ctx.shadowBlur = 18 + Math.sin(T * 10) * 8; }
  ctx.fillStyle = gg; rr(gx, gy, Math.max(gh, gw * v), gh, 10); ctx.fill(); ctx.restore();
  if (full && G.boosting <= 0 && !isTouch && Math.sin(T * 8) > -0.3) text('스페이스!', gx + gw + 14, gy + 10, 20, '#fff', { align: 'left' });
  // 알 소나기 게이지
  const fy = gy + 28, fw = 180;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(gx + 24, fy - 5, fw, 10, 5); ctx.fill();
  icon('e_fire', gx + 10, fy, 20);
  if (G.feverT > 0) {
    const rg = ctx.createLinearGradient(gx + 24, 0, gx + 24 + fw, 0);
    ['#ff5470', '#ffd34d', '#7dffb0', '#5fd4ff', '#b48bff'].forEach((c, i) => rg.addColorStop(((i / 4) + T * 0.8) % 1, c));
    ctx.fillStyle = rg; rr(gx + 24, fy - 5, fw * (G.feverT / 6), 10, 5); ctx.fill();
    text('알 소나기 2배', gx + 32 + fw, fy, 14, C.yellow, { align: 'left' });
  } else { ctx.fillStyle = C.yellow; rr(gx + 24, fy - 5, Math.max(10, fw * G.fever / 100), 10, 5); ctx.fill(); }
  // 아이템 칸
  const ib = isTouch ? ITEM_BTN() : { x: gx + gw + 150, y: H - 44, r: 30 };
  ctx.save();
  const pulse = G.itemPop > 0 ? 1 + G.itemPop * 0.5 : 1;
  ctx.fillStyle = G.item ? 'rgba(46,107,255,.9)' : 'rgba(27,28,31,.75)';
  if (G.item) { ctx.shadowColor = C.blueD; ctx.shadowBlur = 16; }
  ctx.beginPath(); ctx.arc(ib.x, ib.y, ib.r * pulse, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ib.x, ib.y, ib.r * pulse, 0, Math.PI * 2); ctx.stroke();
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
    icon('e_rocket', bb.x, bb.y - 10, 44);
    text('질주', bb.x, bb.y + 28, 17, '#fff');
    buttons.push({ x: bb.x - bb.r, y: bb.y - bb.r, w: bb.r * 2, h: bb.r * 2, on: tryBoost });
  }
  // 보스 경고
  if (G.bossWarnT > 0 && !G.boss) {
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
  // 시작 안내
  if (G.intro > 0 && !(G.bossWarnT > 0)) {
    const a = Math.min(1, G.intro / 0.4, (2.8 - G.intro) / 0.3);
    ctx.save(); ctx.globalAlpha = a;
    text(endless ? STAGES[n].name : `${n}번 바다 · ${STAGES[n].name}`, W / 2, H / 2 - 54, 38, '#ffffff');
    wrapText(STAGES[n].tip, 760, 20).forEach((l, i) => text(l, W / 2, H / 2 + i * 30, 20, C.text, { body: true }));
    const fresh = n !== ENDLESS && STAGES[n].fresh;
    if (fresh) { const it = ENEMIES[fresh].weak; drawItemIcon(it, W / 2 - 150, H / 2 + 70, 30); text(`새 몬스터 ${ENEMIES[fresh].name} · 약점 ${ITEMS[it].name}`, W / 2 + 10, H / 2 + 70, 17, C.yellow, { body: true }); }
    else if (n === 1 && save.runs <= 2) text(isTouch ? '손가락으로 끌어서 움직이고, 질주 버튼을 눌러요!' : '방향키로 움직이고, 스페이스로 질주! E로 아이템!', W / 2, H / 2 + 70, 18, C.yellow, { body: true });
    ctx.restore();
  }
}
function drawBoostOverlay() {
  if (!G) return;
  if (G.feverT > 0 || G.eff.double > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.1 + 0.05 * Math.sin(T * 8);
    const rg = ctx.createLinearGradient(0, 0, W, H);
    ['#ff5470', '#ffd34d', '#7dffb0', '#5fd4ff', '#b48bff'].forEach((c, i) => rg.addColorStop(((i / 4) + T * 0.5) % 1, c));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  if (G.eff.freeze > 0) { ctx.fillStyle = `rgba(190,240,255,${0.12 + 0.04 * Math.sin(T * 6)})`; ctx.fillRect(0, 0, W, H); }
  if (G.boosting <= 0) return;
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.65);
  v.addColorStop(0, 'rgba(40,0,90,0)'); v.addColorStop(1, `rgba(60,10,140,${0.45 + 0.1 * Math.sin(T * 12)})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) { const y = rand(0, H), x = rand(0, W), l = rand(60, 200); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - l, y); ctx.stroke(); }
}
