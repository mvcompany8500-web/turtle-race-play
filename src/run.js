'use strict';
// 터틀 레이스 — 점프 달리기 (쿠키런·마리오 런식 타이밍)
// 왼쪽 톡 = 점프(꾹 = 높이, 공중에서 한 번 더 = 이단 점프) · 오른쪽 꾹 = 숙이기(공중이면 급강하)
// 위에서 밟으면 처치(가시 달린 건 빼고) · 발판 · ? 조개 · 「바·다·축·제」 글자 · 코스 패턴 · 첫 판 연습

const GROUND = SEABED - 2;                 // 발이 닿는 바닥
const PX = () => 230 + SAFE;               // 거북이 가로 자리(고정)
const GRAV = 2700, JUMP_V = 900, JUMP2_V = 800, FALL_MAX = 1050;
const STAND_R = 28, SLIDE_R = 16;          // 서 있을 때·숙였을 때 몸 판정
const HEAD_Y = GROUND - 66;                // 머리 높이 줄(숙여야 피함)
const runMode = () => save.ctrl !== 'swim';
const LETTERS = ['바', '다', '축', '제'];
const STOMP_NO = { urchin: '가시가 있어요!', mine: '펑!', whirlpool: '' };

const hasPerk = (k) => Object.keys(LV_PERKS).some((lv) => LV_PERKS[lv].k === k && save.lv >= +lv);
const maxJumps = () => (hasPerk('triple') ? 3 : 2) + (typeof abStar === 'function' ? abStar('triple') : 0);
const maxHearts = () => [4, 3, 2][save.diff] + ['heart', 'heart2', 'heart3'].filter(hasPerk).length;
// 기운(쿠키런 에너지 방식): 하트 1개 = 기운 25. 시간이 지나면 조금씩 줄고, 부딪히면 25, 기운 물약으로 채움
const HIT_E = 25;
const maxEnergy = () => maxHearts() * HIT_E;
const xpNeed = (lv) => Math.round(60 + 55 * Math.pow(lv, 1.45)); // docs/balance.md: Lv5 ≈ 4번 바다, Lv10 ≈ 25번 바다, Lv20 = 끝까지 깨고도 더

function runInit() {
  const p = G.p;
  G.run = true;
  POSE_KEYS.forEach((k) => outfitPose(k)); // 입은 옷의 동작 그림 7장을 미리 불러 둠(첫 점프부터 그 옷)
  G.en = G.maxEn = G.enShow = maxEnergy();
  if (hasTr('compass')) G.boost = Math.max(G.boost, 30);
  if (hasTr('charm')) G.shield++; G.enHealT = 0; G.potionT = 9;
  // 한 판을 끝까지 달리면 기운 30%가 줄어드는 빠르기(물약을 안 먹어도 시간만으로는 안 쓰러짐 — 조사: 시간 압박 금지)
  G.drain = G.cfg.endless ? 0.9 : (maxEnergy() * 0.3) / Math.max(25, G.cfg.length / G.cfg.speed);
  G.obs = []; G.letters = [0, 0, 0, 0]; G.stomps = 0; G.stompChain = 0; G.bumps = 0;
  G.courseAt = G.dist + W * 0.95; G.pats = 0; G.lastPat = '';
  G.letterAt = [0.14, 0.36, 0.58, 0.8].map((k) => G.cfg.length * k);
  G.touch = { j: null, s: null };
  if (hasPerk('boostStart')) G.boost = Math.max(G.boost, 25);
  if (hasPerk('shieldStart')) G.shield++;
  Object.assign(p, { fy: GROUND, vy: 0, onG: true, jumps: 0, slide: false, slideHold: false, holdJ: false, buf: 0, coyote: 0, land: 0, spin: 0, r: STAND_R, airT: 0 });
  p.y = GROUND - STAND_R;
  // 첫 판 연습: 정해진 순서로 하나씩 배우기
  G.tut = !save.tutRun && G.n === 1 ? { seq: ['eggs', 'hop', 'eggs', 'duck', 'hop', 'wide', 'tutDouble', 'stomp', 'tutPotion', 'duck', 'stairs'], hint: null, slow: 0 } : null;
  G.bestFlag = null;
  const bd = G.cfg.endless ? (save.endlessBest || 0) * 40 : ((save.best[G.n] || 0) / 100) * G.cfg.length;
  if (bd > W && (G.cfg.endless || (save.best[G.n] || 0) < 100)) G.bestFlag = { d: bd, x: null, passed: false };
  if (G.helped) later(1200, () => G && G.helped && pop(W / 2, H / 2 - 90, '도와줄게! 방패 하나 ♥', '#ffc4dc', 30, true));
}

// ───────── 입력 ─────────
const canAct = () => G && G.run && state === 'play' && !G.p.dead && !G.won && G.enterT <= 0;
function jumpDown() {
  if (coachDone('jump')) return;
  if (G && G.bonus) { bonusMoveLane(1); return; }
  if (!canAct()) return;
  const p = G.p;
  p.holdJ = true; p.buf = 0.13;
  if (G.tut) G.tut.did = 'jump';
}
function jumpUp() {
  if (!G || !G.run) return;
  const p = G.p;
  p.holdJ = false;
  if (p.vy < -330 && !p.bounced) p.vy *= 0.55; // 짧게 톡 = 낮게
}
function slideDown() {
  if (coachDone('slide')) return;
  if (G && G.bonus) { bonusMoveLane(-1); return; }
  if (!canAct()) return;
  const p = G.p;
  p.slideHold = true;
  if (!p.onG && p.vy < 700) { p.vy = 760; p.dive = 0.3; if (ac) sfx.swoosh(); }
  else if (p.onG && !p.slide) beatJudge(); // 숙이기도 박자 판정
  if (G.tut) G.tut.did = 'slide';
}
function slideUp() { if (G && G.run) G.p.slideHold = false; }
function releaseRunInput() { if (G && G.run) { G.p.holdJ = false; G.p.slideHold = false; G.touch = { j: null, s: null }; } }

function doJump(first) {
  const p = G.p;
  const k = (G.grabT > 0 ? 0.72 : 1) * (G.eff.giant > 0 ? 1.06 : 1) * (1 + abStar('jump') * 0.06);
  if (first && p.onG) beatJudge(); // 땅에서 뛸 때 박자 판정
  p.vy = -(first ? JUMP_V : JUMP2_V) * k * (p.holdJ ? 1 : 0.62);
  p.jumps = first ? 1 : Math.max(2, p.jumps + 1); // 발판에서 떨어진 뒤 공중 점프는 두 번째로 셈
  p.onG = false; p.coyote = 0; p.buf = 0; p.slide = false; p.bounced = false;
  if (first) {
    if (!snd('jump', 0.9, rand(0.97, 1.07))) sfx.jump(); haptic(8); // 같은 소리 반복이 기계 같지 않게 높낮이 살짝씩
    for (let i = 0; i < 6; i++) fx.push({ k: 'bub', x: p.x + rand(-20, 20), y: GROUND - 4, vx: rand(-120, 40), vy: rand(-80, -20), life: 0.5, max: 0.5, size: rand(2, 5) });
    for (let i = 0; i < 9; i++) fx.push({ k: 'spark', x: p.x + rand(-14, 18), y: GROUND - 2, vx: rand(-260, -40), vy: rand(-150, -30), life: 0.32, max: 0.32, size: rand(2.5, 4.5), color: '#e9d9a8' }); // 발밑 모래가 뒤로 튐
  } else {
    p.spin = 1; if (!snd('jump2', 0.9, rand(0.97, 1.05))) sfx.jump2(); haptic(12);
    ring(p.x, p.fy - 10, '#bff3ff', 60, 0.3, 5);
    for (let i = 0; i < 10; i++) { const a = Math.PI * (0.2 + i / 12); fx.push({ k: 'bub', x: p.x, y: p.fy - 6, vx: Math.cos(a) * 180, vy: Math.sin(a) * 120, life: 0.5, max: 0.5, size: rand(2, 5) }); }
  }
}
function land(vy) {
  const p = G.p;
  p.land = 0.14; p.jumps = 0; p.bounced = false;
  if (G.stompChain >= 3) snd('mission', 0.7); // 연속 밟기 끝: 짧은 칭찬음(진주는 밟을 때마다 이미 줌)
  G.stompChain = 0;
  if (vy > 500) {
    shake = Math.max(shake, p.dive > 0 ? 8 : 3); sfx.land();
    for (let i = 0; i < 8; i++) fx.push({ k: 'spark', x: p.x + rand(-26, 26), y: p.fy - 2, vx: rand(-200, 200), vy: rand(-140, -30), life: 0.35, max: 0.35, size: rand(2, 4), color: '#e9d9a8' });
  }
}

// ───────── 움직임 ─────────
function runMove(dt) {
  if (G.bonus) { bonusUpdate(dt); return; }
  if (G.eff.rocket > 0) { // 로켓: 높이 날며 무적, 위 줄 진주를 먹음 — 끝나면 그대로 떨어져 착지
    const p = G.p; p.fy = lerp(p.fy, GROUND - 235 + Math.sin(T * 6) * 6, Math.min(1, dt * 6)); p.y = p.fy - STAND_R; p.vy = 0; p.onG = false; p.jumps = 1;
    p.x = lerp(p.x, PX() + 30, Math.min(1, dt * 4));
    G.rocketT = (G.rocketT || 0) - dt; if (G.rocketT <= 0) { G.rocketT = 0.09; G.eggsArr.push({ x: W + 40, y: GROUND - 260 + Math.sin(T * 3) * 30, pearl: true, t: 0 }); }
    fx.push({ k: 'spark', x: p.x - 18, y: p.fy + 4, vx: rand(-260, -120), vy: rand(60, 160), life: 0.3, max: 0.3, size: rand(3, 6), color: pick(['#ff9a1f', '#ffe14a', '#ff5470']) });
    return;
  }
  const p = G.p, E = G.eff;
  const bossOn = G.boss && !G.boss.dead && G.boss.x < W + 40;
  // 질주: 큰 적이 있으면 그쪽으로 돌진해서 들이받음(점프 달리기는 앞뒤로 못 가니까)
  const tx = G.boosting > 0 && bossOn ? G.boss.x - 70 : E.whirl > 0 ? 520 + SAFE : G.boosting > 0 ? PX() + 70 : PX();
  const follow = G.boosting > 0 && bossOn ? 9 : 5;
  p.x = lerp(p.x, tx, Math.min(1, dt * follow));
  // 왕초보 도움(마리오 런처럼): 「쉬움」에선 작은 가시를 놓치면 알아서 폴짝
  if (save.diff === 0 && p.onG && !p.slideHold && !p.dead && p.buf <= 0 && G.enemies.some((e) => !e.dead && e.type === 'urchin' && e.y > GROUND - 50 && e.x - p.x > 62 && e.x - p.x < 92)) {
    p.holdJ = true; doJump(true); p.holdJ = false;
    G.assists = (G.assists || 0) + 1; if (G.assists <= 2) pop(p.x, p.y - 70, '쉬움: 가시는 알아서 폴짝!', '#9ff3ff', 18);
  }
  if (p.coyote > 0) p.coyote -= dt;
  if (p.dive > 0) p.dive -= dt;
  if (p.land > 0) p.land -= dt;
  if (p.spin > 0) p.spin = Math.max(0, p.spin - dt * 2.6);
  if (p.buf > 0) {
    if (p.onG || p.coyote > 0) doJump(true);
    else if (p.jumps < maxJumps()) doJump(false);
    else p.buf -= dt;
  }
  // 중력: 꾹 누르고 올라가는 중엔 살짝 덜 당김(높이 조절), 질주 중엔 사뿐
  const g = GRAV * (p.vy < 0 && p.holdJ ? 0.8 : 1) * (G.boosting > 0 ? 0.85 : 1);
  p.vy = Math.min(FALL_MAX * (p.slideHold ? 1.3 : 1), p.vy + g * dt);
  const prevF = p.fy, vyNow = p.vy;
  p.fy += p.vy * dt;
  const sc = p.scale, topNow = p.fy - STAND_R * 2 * sc;
  if (topNow < CEIL + 4) { p.fy = CEIL + 4 + STAND_R * 2 * sc; if (p.vy < 0) p.vy = 0; }
  let onNow = false;
  if (p.fy >= GROUND) { p.fy = GROUND; onNow = true; }
  else if (p.vy >= 0) {
    for (const o of G.obs) {
      if (o.k !== 'plat' || o.dead) continue;
      if (p.x > o.x - 16 && p.x < o.x + o.w + 16 && prevF <= o.y + 3 && p.fy >= o.y) { p.fy = o.y; onNow = true; break; }
    }
  }
  if (onNow) { if (!p.onG) land(vyNow); p.vy = 0; p.onG = true; p.jumps = 0; }
  else { if (p.onG) p.coyote = 0.09; p.onG = false; }
  // 숙이기
  const wasSlide = p.slide;
  p.slide = p.slideHold && p.onG;
  if (p.slide && !wasSlide) { sfx.slide(); for (let i = 0; i < 6; i++) fx.push({ k: 'spark', x: p.x + rand(-10, 30), y: p.fy - 3, vx: rand(-260, -80), vy: rand(-80, -10), life: 0.3, max: 0.3, size: rand(2, 4), color: '#e9d9a8' }); }
  if (p.slide && Math.random() < dt * 30) fx.push({ k: 'spark', x: p.x - 20, y: p.fy - 2, vx: rand(-260, -120), vy: rand(-60, -10), life: 0.25, max: 0.25, size: rand(1.5, 3), color: '#e9d9a8' });
  p.r = p.slide ? SLIDE_R : STAND_R;
  p.y = p.fy - p.r * sc;
  p.vx = 0;
  p.airT = p.onG ? 0 : p.airT + dt;
  p.rot = lerp(p.rot, p.onG ? 0 : clamp(p.vy * 0.0005, -0.3, 0.35), Math.min(1, dt * 12));
  p.ph += dt * (p.onG ? 14 : 6);
}

// ───────── 밟기 ─────────
function canStomp(e) {
  const p = G.p;
  if (p.vy < 60 || p.onG) return false;
  return p.y < e.y - 6 && p.fy < e.y + e.r * 0.6;
}
function stomp(e) {
  const p = G.p;
  if (STOMP_NO[e.type] != null || (e.type === 'puffer' && e.r > 24)) {
    const msg = STOMP_NO[e.type] || '빵빵해서 못 밟아요!';
    if (msg && !e.toldNo && G.p.inv <= 0) { e.toldNo = true; pop(e.x, e.y - 44, msg, '#ff9aa8', 22); }
    return false;
  }
  G.stomps++; G.stompChain++; addScore(500 * Math.min(G.stompChain, 8)); p.land = 0.12; // 발이 닿는 순간 찌그러졌다가 튀어오르며 길쭉
  p.vy = -(p.holdJ ? 860 : 640); p.jumps = Math.min(p.jumps, 1); p.bounced = true; p.onG = false;
  freeze = Math.max(freeze, 0.05); shake = Math.max(shake, 10);
  ring(e.x, e.y - 10, '#ffffff', 90, 0.3, 8);
  if (!snd('stomp', 1, comboRate(Math.min(G.stompChain, 5)))) sfx.stomp(); haptic([15, 10, 30]); // 연속 밟기마다 한 음씩 위로
  const c = G.stompChain;
  const cv = c >= 2 ? Math.min(8, 2 ** (c - 1)) : 0; if (cv) earn('stompChain', cv); // 마리오처럼 연속 밟기 진주 1→2→4→8
  pop(e.x, e.y - 40, c >= 2 ? `밟기 ${c}연속! 진주 +${cv}` : pick(['꾹!', '밟았다!', '뿌직!']), c >= 3 ? '#ff8a3c' : C.yellow, 28 + Math.min(c, 6) * 3, c >= 3);
  say(['one', 'two', 'three', 'wow'][Math.min(c, 4) - 1], true); // 하나! 둘! 셋! 대박!
  if (c === 3) reaction(1, '3단 밟기!');
  if (c === 5) reaction(3, '밟기 장인!!');
  if (hasPerk('stompEgg')) earn('perk', 1);
  if (abStar('stomp')) earn('perk', abStar('stomp'));
  runXp(6); hitStar(e.x, e.y - 10, false, true); hitStop('big');
  if (e.type === 'jelly') { p.vy = -1000; pop(p.x, p.y - 60, '통통!', '#ff8fd0', 24); } // 해파리는 트램펄린
  killEnemy(e, 'stomp');
  if (hasPerk('shockStomp') || abStar('stomp') >= 2) for (const o of G.enemies) if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 150 && STOMP_NO[o.type] == null) killEnemy(o, 'stomp');
  track('stomp');
  return true;
}
function stompBoss(b) {
  const p = G.p;
  p.vy = -(p.holdJ ? 920 : 720); p.jumps = Math.min(p.jumps, 1); p.bounced = true;
  G.stomps++;
  pop(p.x, p.y - 80, '머리 밟기!!', '#ffffff', 40, true);
  bossDamage(10);
  p.x = PX(); // 밟기는 뒤로 안 밀림
}

// ───────── 코스: 패턴을 이어 붙인다 (곡의 마디처럼 — 쉬운 곳·몰아치는 곳이 번갈아) ─────────
const runSpd = () => G.cfg.speed * G.slowMul;
const jumpW = () => runSpd() * 0.74;            // 한 번 점프로 날아가는 가로 길이
const GC = () => GROUND - STAND_R;               // 서 있을 때 몸 가운데 높이
const REACT = () => runSpd() * 0.45;            // 한 동작이 끝나고 다음 위험까지 최소 거리(0.45초 = 착지 + 사람 반응)
// 길잡이는 「물방울 구슬」(돈 아님: 연속·질주·바다 축제 게이지만), 진짜 알은 타이밍이 맞아야 닿는 곳(점프 꼭대기·위험한 길)에만
function egg(x, y, gold = false) { G.eggsArr.push({ x, y, gold, t: rand(0, 6) }); G.eggsSpawned++; }
const EGG_P = 0.5; // 점프 꼭대기·줄 끝에 진짜 알이 놓일 확률 (docs/balance.md 의 수입 목표에 맞춘 값)
function pearl(x, y) { G.eggsArr.push({ x, y, pearl: true, t: rand(0, 6) }); }
function eggLine(x, n, y, gap = 46, every = 0) { // every: k개마다 진짜 알(0이면 마지막 하나만)
  for (let i = 0; i < n; i++) ((every ? i % every === every - 1 : i === n - 1 && Math.random() < EGG_P) ? egg : pearl)(x + i * gap, y);
  return n * gap;
}
function eggArc(x, w, h = 140, n = 7, goldMid = false) { // 점프 길을 구슬로 그려 줌 — 꼭대기에만 알
  const withEgg = goldMid || Math.random() < EGG_P;
  for (let i = 0; i < n; i++) { const u = i / (n - 1), y = GC() - 4 * h * u * (1 - u); if (i === (n >> 1) && withEgg) egg(x + u * w, y, goldMid); else pearl(x + u * w, y); }
}
function spike(x, y = GROUND - 22) { return addEnemy({ type: 'urchin', x, y, baseY: y, r: 20, vx: 0, t: 0, ph: rand(0, 6), elite: false, run: true, noSp: true }); }
function mon(type, x, y, extra = {}) {
  const elite = Math.random() < G.D.elite;
  // 필살기는 읽기 쉬운 것만(문어 먹물·게 집게·가오리·유령·아귀) — 점프 달리기에선 갑자기 날아드는 건 불공평
  const e = Object.assign({ type, x, y, baseY: y, r: 20, vx: 0, t: 0, ph: rand(0, 6), elite, run: true, noSp: !['octopus', 'crab', 'ray', 'phantom', 'angler'].includes(type) }, extra);
  if (elite) { e.r *= 1.15; }
  return addEnemy(e);
}
function pillar(x, w = 64) { G.obs.push({ k: 'pillar', x, w, y1: GROUND - 46, t: 0 }); }
function plat(x, w, y) { G.obs.push({ k: 'plat', x, w, y, t: 0 }); }
function qblock(x, y = GROUND - 180) { G.obs.push({ k: 'qb', x, y, t: 0, hit: false }); }
function letter(x, y) {
  const i = G.letters.indexOf(0); if (i < 0) return;
  if (G.obs.some((o) => o.k === 'letter' && o.i === i)) return;
  G.obs.push({ k: 'letter', x, y, i, t: 0 });
}
function rockAt(x, k = 'rock') { const d = BREAK[k]; G.breaks.push({ k, x, y: GROUND - d.r, r: d.r, hp: d.hp, maxHp: d.hp, t: 0, hitT: 0, wob: 0, run: true }); }
function warnLane(kind, y, t = 0.9) { G.warns.push({ kind, y, t, max: t, elite: Math.random() < G.D.elite, run: true }); sfx.warn(); }
const has = (k) => G.cfg.pool.includes(k);

// 패턴: [이름, 처음 나오는 바다, 무게, 만들기(x) → 길이]
const PATS = [
  ['eggs', 1, 1, (x) => eggLine(x, 6, GC())],
  ['hop', 1, 4, (x) => { const w = jumpW(); spike(x + w * 0.5); eggArc(x, w); return w; }],
  ['hop2', 1, 3, (x) => { const w = jumpW(); spike(x + w * 0.5); spike(x + w * 1.55); eggArc(x, w); eggArc(x + w * 1.05, w); return w * 2.1; }],
  ['wide', 1, 3, (x) => { const w = jumpW(); for (let i = 0; i < 3; i++) spike(x + w * 0.38 + i * w * 0.1); eggArc(x - 10, w * 1.05, 165, 8, true); return w * 1.1; }], // 가시 간격은 빠르기에 맞춰(느린 바다에서도 한 번 점프로)
  ['duck', 1, 4, (x) => { pillar(x + 40, 70); eggLine(x, 5, GROUND - 16, 40); return 220; }],
  ['stomp', 1, 3, (x) => { mon('jelly', x + 140, GC() - 6, { amp: 6, vx: -30 }); eggArc(x - 60, jumpW(), 150, 5); return 260; }],
  ['stairs', 1, 3, (x) => {
    plat(x, 210, GROUND - 118); plat(x + 290, 230, GROUND - 228);
    eggLine(x + 20, 4, GROUND - 118 - 30, 46, 2); eggLine(x + 310, 4, GROUND - 228 - 30, 46, 2); egg(x + 500, GROUND - 228 - 30, true);
    spike(x + 120); spike(x + 330); spike(x + 380);
    return 560;
  }],
  ['qblock', 2, 2, (x) => { const w = jumpW(); qblock(x + w * 0.5); for (let i = 0; i < 4; i++) pearl(x + w * 0.5 - 60 + i * 40, GC()); return w + 80; }], // 밑에서 박거나 위에서 밟으면 열림
  ['jumpDuck', 3, 3, (x) => { const w = jumpW(), px = x + w + REACT(); spike(x + w * 0.5); eggArc(x, w); pillar(px, 70); eggLine(px - 30, 3, GROUND - 16, 40); return px - x + 120; }],
  ['shortHop', 4, 2, (x) => { const w = jumpW() * 0.62; spike(x + w * 0.5); mon('mine', x + w * 0.5, GROUND - 212, { r: 16, noSp: true }); eggArc(x, w, 60, 5); return w + 60; }],
  ['duckLong', 5, 2, (x) => { pillar(x + 30, 260); eggLine(x + 10, 7, GROUND - 16, 44); return 340; }],
  ['highRoad', 4, 2, (x) => { // 위로 가면 황금 진주, 아래는 가시 — 고르기
    plat(x, 520, GROUND - 150); eggLine(x + 30, 9, GROUND - 150 - 30, 52, 3); egg(x + 480, GROUND - 180, true);
    for (let i = 0; i < 4; i++) spike(x + 80 + i * 120);
    return 560;
  }],
  ['shark', 2, 3, (x) => { warnLane('shark', GROUND - 24); eggArc(x + 60, jumpW(), 160, 6); return 240; }, 'shark'],
  ['sharkHead', 6, 3, (x) => { warnLane('shark', HEAD_Y); eggLine(x + 40, 5, GROUND - 16, 44); return 240; }, 'shark'],
  ['puffer', 3, 2, (x) => { mon('puffer', x + 200, GROUND - 26, { r: 15 }); eggArc(x + 40, jumpW() * 1.1, 175, 7); return 330; }, 'puffer'],
  ['eel', 4, 3, (x) => { warnLane('eel', GROUND - 16, 1.0); eggArc(x + 60, jumpW(), 130, 6); return 230; }, 'eel'],
  ['octo', 7, 2, (x) => { mon('octopus', x + 220, GROUND - 170, { r: 22, inkT: 2.5 }); eggArc(x + 20, jumpW() * 1.2, 190, 7); return 360; }, 'octopus'],
  ['angler', 8, 2, (x) => { mon('angler', x + 260, GROUND - 30, { r: 22 }); return 320; }, 'angler'],
  ['ray', 16, 3, (x) => { mon('ray', x + 200, HEAD_Y - 2, { r: 22, amp: 5, vx: -220, ph: 0 }); eggLine(x, 5, GROUND - 16, 44); return 300; }, 'ray'], // 가오리: 머리 높이로 빠르게 미끄러져 옴 → 숙이기
  ['crab', 21, 3, (x) => { mon('crab', x + 220, GROUND - 18, { r: 18, vx: -90, floor: GROUND - 18, top: false, jumped: true, vy: 0 }); eggArc(x + 120, jumpW(), 150, 6); return 320; }, 'crab'],
  ['sword', 32, 3, (x) => { warnLane('sword', HEAD_Y + 2, 1.0); eggLine(x + 30, 5, GROUND - 16, 44); return 240; }, 'swordfish'],
  ['phantom', 42, 2, (x) => { mon('phantom', x + 220, HEAD_Y, { r: 20, amp: 6, vx: -40, vis: 1 }); eggLine(x, 5, GROUND - 16, 44); return 300; }, 'phantom'],
  ['rock', 2, 2, (x) => { rockAt(x + 150); eggArc(x + 20, jumpW() * 1.05, 175, 7); return 330; }],
  ['chest', 3, 1, (x) => { rockAt(x + 120, 'chest'); eggLine(x, 3, GC()); return 260; }],
  ['jellyBridge', 10, 2, (x) => { // 한 번 점프로는 못 넘는 가시밭(점프 1.3배) — 해파리를 밟거나 이단 점프
    // 한 번 점프로 넘는 가시 줄 ≈ 0.76w-100px, 이단 점프 ≈ 1.3w-100px (실험실 계산) → 0.7w = 이단 점프나 해파리 밟기가 꼭 필요, 여유 0.2초
    const w = jumpW(), span = w * 0.7;
    for (let i = 0; i < 6; i++) spike(x + w * 0.35 + i * span / 5.5);
    mon('jelly', x + w * 0.35 + span * 0.45, GROUND - 150, { amp: 8, vx: 0, noSp: true, ph: 0 });
    eggArc(x + 20, w * 1.4, 230, 7, true);
    return w * 0.35 + span + REACT();
  }],
  ['gauntlet', 14, 2, (x) => { // 점프 → 숙이기 → 점프, 사이마다 0.45초
    const w = jumpW(), p1 = x + w + REACT(), s2 = p1 + 64 + REACT() + w * 0.35;
    spike(x + w * 0.5); eggArc(x, w); pillar(p1, 64); eggLine(p1 - 30, 3, GROUND - 16, 40); spike(s2); eggArc(s2 - w * 0.5, w);
    return s2 + w * 0.5 - x;
  }],
  ['tutDouble', 99, 0, (x) => { // 튜토리얼: 이단 점프가 꼭 필요한 긴 가시밭(꼭대기에서 멈추고 「한 번 더 톡!」)
    const w = jumpW(), span = w * 0.95; for (let i = 0; i < 7; i++) spike(x + w * 0.3 + i * span / 6);
    eggArc(x, w * 1.5, 240, 9, true); if (G.tut) G.tut.dbl = true; return w * 0.3 + span + REACT();
  }],
  ['tutPotion', 99, 0, (x) => { G.eggsArr.push({ x: x + 200, y: GROUND - 70, potion: 's', t: 0, tut: true }); eggLine(x, 4, GC()); return 320; }], // 튜토리얼: 기운 물약
  ['box', 1, 1, (x) => { G.boxes.push({ x: x + 140, y: GROUND - 150, t: 0 }); eggArc(x + 20, jumpW(), 150, 5); return 260; }],
];
const PAT_BY = Object.fromEntries(PATS.map((p) => [p[0], p]));
function choosePat() {
  const n = G.cfg.endless ? Math.min(50, 8 + Math.floor(G.dist / 1500)) : G.n;
  const list = PATS.filter(([id, from, , , need]) => from <= n && id !== G.lastPat && (!need || has(need)));
  // 새 몬스터 판이면 그 몬스터 패턴을 자주
  const fresh = !G.cfg.endless && STAGES[G.n].fresh;
  let sum = 0;
  const ws = list.map((p) => { const w = p[2] * (fresh && p[4] === fresh ? 4 : 1) * (p[1] > n - 4 && p[1] > 1 ? 1.4 : 1); sum += w; return w; });
  let r = Math.random() * sum;
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
  return list[0];
}
function runCourse() {
  const cfg = G.cfg;
  const finishing = !cfg.endless && G.dist >= cfg.length;
  const bossFight = G.boss && !G.boss.dead;
  if (finishing || bossFight || G.bossWarnT != null || G.bonus) return;
  while (G.courseAt - G.dist < W + 160) {
    const x = G.courseAt - G.dist;
    let pat;
    if (G.tut && G.tut.seq.length) pat = PAT_BY[G.tut.seq.shift()];
    else pat = choosePat();
    const before = { e: G.enemies.length, o: G.obs.length, b: G.breaks.length, g: G.eggsArr.length, x: G.boxes.length, w: G.warns.length };
    let len = pat[3](x);
    len += snapToBeat(before); // 누를 때가 음악 박에 오게
    G.lastPat = pat[0]; G.pats++;
    // 글자는 정해진 거리마다 높은 곳에
    if (!cfg.endless && G.letterAt.length && G.dist + x >= G.letterAt[0]) { G.letterAt.shift(); letter(x + len * 0.5, GROUND - 230 - rand(0, 30)); }
    if (cfg.endless && Math.random() < 0.06) letter(x + len * 0.5, GROUND - 240);
    const n = cfg.endless ? Math.min(50, 8 + G.dist / 1500) : G.n;
    const gapSec = clamp(0.75 - n * 0.006, 0.45, 0.75) * G.D.gap * (G.tut ? 2.2 : 1); // 패턴 사이도 최소 0.45초(착지+반응) — 실험실에서 잰 값
    G.courseAt += len + runSpd() * gapSec * rand(0.8, 1.25);
  }
}

// ───────── 코스 물건 (기둥·발판·? 조개·글자) ─────────
function smashPillar(o) {
  o.dead = true;
  for (let i = 0; i < 12; i++) fx.push({ k: 'chunk', x: o.x + rand(0, o.w), y: rand(CEIL, o.y1), vx: rand(100, 500), vy: rand(-300, 100), life: 0.8, max: 0.8, size: rand(8, 16), color: i % 2 ? '#c06a9a' : '#5a3a6a', rot: rand(0, 6), vr: rand(-12, 12) });
  pop(o.x + o.w / 2, o.y1 - 30, '와장창!', '#ffffff', 34, true); shake = Math.max(shake, 14); sfx.smash(); haptic(30);
}
function bumpBlock(o) {
  const p = G.p;
  o.hit = true; o.bumpT = 0.25; addScore(800); if (p.vy < 0) p.vy = 160; G.bumps++;
  sfx.bump(); haptic(20); shake = Math.max(shake, 6);
  ring(o.x, o.y, C.yellow, 80, 0.35, 6);
  // 보상은 거북이에게 바로(마리오 동전처럼) — 위로 튀어 못 먹는 일이 없게
  burst(o.x, o.y - 20, '#ffe36b', 20, 360);
  if (Math.random() < 0.4 && !G.item) {
    G.item = rollItem(); G.itemPop = 0.6; sfx.box();
    pop(o.x, o.y - 56, `${ITEMS[G.item].name}!`, '#ffffff', 26, true);
  } else {
    const gold = Math.random() < 0.3, n = gold ? 3 : 3;
    for (let i = 0; i < n; i++) later(i * 90, () => { fx.push({ k: 'eggfly', sx: o.x, sy: o.y - 30, life: 0.5, max: 0.5, gold: gold && i === 0 }); });
    earn('qb', gold ? 5 : 3);
    for (let i = 0; i < n; i++) snd('egg', 0.6, comboRate(3 + i * 2), 0, 0.06 + i * 0.09); // 진주가 하나씩 튈 때마다 「딩·딩·딩」 올라감(나는 모습과 같은 박)
    if (gold) snd('gold', 0.8, 1, 0, 0.3);
    pop(o.x, o.y - 56, gold ? '황금 진주! +5' : '진주 +3', C.yellow, 26, true);
  }
  runXp(5);
}
// ───────── 보너스 바다(쿠키런 보너스 타임 방식) ─────────
// 장애물 없음 · 기운 안 줄어듦 · 위/가운데/아래 3줄 진주 길(점프 = 한 줄 위, 숙이기 = 한 줄 아래) · 시계 진주 +2초 · 끝나면 내려와 1초 무적
const BONUS_LANES = () => [GROUND - 40, GROUND - 165, GROUND - 290];
function startBonus() {
  const p = G.p;
  G.bonus = { t: 15 + (hasPerk('feverLong') ? 3 : 0) + (hasTr('clock') ? 3 : 0), max: 15, lane: 0, spawnT: 0.4, path: 1, pathT: 0, enter: 0 };
  for (const e of G.enemies) if (!e.dead) { e.dead = true; G.eggsArr.push({ x: e.x, y: e.y, pearl: true, t: 0 }); burst(e.x, e.y, '#ffe36b', 10); }
  G.obs = G.obs.filter((o) => o.x < p.x - 80); G.breaks = []; G.warns = []; G.sweeps = []; G.shots = [];
  p.slide = false; p.slideHold = false; p.onG = false; p.vy = 0; p.inv = Math.max(p.inv, 0.5);
  later(700, () => coachOnce('bonus', { text: '보너스 바다!', sub: '점프 = 위 줄 · 숙이기 = 아래 줄 · 진주를 쓸어 담아요', spot: null, state: 'play' }));
  reaction(4, '보너스 바다!!'); fireworks(4); pop(W / 2, H / 2 + 40, '점프 = 위 줄 · 숙이기 = 아래 줄', '#ffffff', 22, true); flash = 0.35; flashColor = '#bff8ff';
  if (!playSample('sfx_fever', 1)) sfx.fever(); say('wow', true); haptic([20, 30, 20, 30, 60]);
  musicFever = true;
}
function endBonus() {
  const p = G.p; G.bonus = null;
  p.inv = Math.max(p.inv, 1); p.vy = 120; p.onG = false;
  G.courseAt = G.dist + W * 0.9; // 장애물은 화면 끝에서 다시
  musicFever = false; pop(W / 2, H / 2 - 80, '보너스 끝!', '#ffffff', 34, true);
}
function bonusUpdate(dt) {
  const b = G.bonus, p = G.p, L = BONUS_LANES();
  b.t -= dt; b.enter += dt;
  if (b.t <= 0) { endBonus(); return; }
  // 거북: 고른 줄로 부드럽게(거품을 타고 둥실)
  const ty = L[b.lane];
  p.fy = lerp(p.fy, ty, Math.min(1, dt * 10)); p.y = p.fy - STAND_R; p.vy = 0; p.onG = false; p.jumps = 0;
  p.x = lerp(p.x, PX() + 40, Math.min(1, dt * 4));
  // 진주 길: 1.3초마다 길이 다른 줄로 옮겨 가며(전부는 못 먹음), 가끔 다른 줄에도 짧은 줄
  b.pathT -= dt; if (b.pathT <= 0) { b.pathT = rand(1.1, 1.5); b.path = clamp(b.path + pick([-1, 1, 1, -1, 2, -2]), 0, 2); }
  b.spawnT -= dt;
  if (b.spawnT <= 0) {
    b.spawnT = 0.11;
    G.eggsArr.push({ x: W + 40, y: L[b.path] - 24, pearl: true, t: 0 });
    if (Math.random() < 0.05) G.eggsArr.push({ x: W + 40, y: L[(b.path + 1 + (Math.random() < 0.5 ? 1 : 0)) % 3] - 24, gold: true, t: 0 }); // 다른 줄 황금 진주(옮길까 말까)
    if (Math.random() < 0.012) G.eggsArr.push({ x: W + 40, y: L[(b.path + 2) % 3] - 24, clock: true, t: 0 }); // 시계 진주 +2초
  }
}
function bonusMoveLane(d) { const b = G.bonus; if (!b) return false; const n = clamp(b.lane + d, 0, 2); if (n !== b.lane) { b.lane = n; snd('swoosh', 0.5, d > 0 ? 1.3 : 1); } return true; }
function getLetter(o) {
  o.dead = true; G.letters[o.i] = 1; addScore(3000);
  sfx.letter(); haptic([10, 20, 30]);
  burst(o.x, o.y, '#ffe36b', 24, 360); ring(o.x, o.y, '#ffffff', 80, 0.4, 6);
  pop(o.x, o.y - 40, `「${LETTERS[o.i]}」`, C.yellow, 40, true);
  coachOnce('letter', { text: '「바·다·축·제」 글자를 모아요', sub: '4개 다 모으면 보너스 바다 15초!', spot: { x: W / 2, y: 52, w: 200, h: 46 }, state: 'play' });
  if (G.letters.every(Boolean)) { // 쿠키런 보너스 타임처럼: 글자를 다 모으면 보너스 바다 15초
    G.letters = [0, 0, 0, 0];
    startBonus();
  }
}
// 기운(쿠키런 방식): 시간이 지나며 조금씩 줄고, 0이 되면 다음에 땅에 닿을 때 쓰러짐 · 물약으로 채움
function updateEnergy(dt) {
  const p = G.p;
  const running = !p.dead && !G.won && G.enterT <= 0 && !cine && !G.tut && state === 'play';
  if (running && G.boosting <= 0 && !G.bonus) G.en = Math.max(0, G.en - G.drain * dt);
  if (running) addScore(runSpd() * dt * 0.4); // 거리 점수 // 질주 중엔 안 줄어듦(쿠키런 보너스 타임처럼)
  if (G.enShow > G.en) { G.enLagT = (G.enLagT || 0) - dt; if (G.enLagT <= 0) G.enShow = Math.max(G.en, G.enShow - G.maxEn * 0.9 * dt); } else G.enShow = G.en;
  if (G.enHealT > 0) G.enHealT -= dt;
  const low = G.en / G.maxEn < 0.2;
  if (running && low) { G.beatT = (G.beatT || 0) - dt; if (G.beatT <= 0) { G.beatT = 0.85; snd('heartbeat', 0.8); edgeFlash('#ff3355', 0.5); } }
  if (running && G.en <= 0 && p.onG) { G.lastHit = 'tired'; pop(p.x, p.y - 70, '기운이 다 떨어졌어요…', '#ff9aa8', 26, true); killPlayer(); return; }
  // 물약 놓기: 보통 14초마다 작은 물약(땅 근처), 가끔 큰 물약(높은 곳 — 이단 점프로)
  if (G.eff.rain > 0) { G.rainT = (G.rainT || 0) - dt; if (G.rainT <= 0) { G.rainT = 0.06; G.eggsArr.push({ x: rand(G.p.x + 60, W + 30), y: CEIL + 20, vx: rand(-60, 0), vy: rand(220, 330), loose: true, pearl: true, t: 0 }); } } // 진주 비
  if (running && !G.bonus && !(G.boss && !G.boss.dead)) {
    G.potionT -= dt;
    if (G.potionT <= 0) {
      G.potionT = rand(12, 16);
      const big = Math.random() < 0.22;
      G.eggsArr.push({ x: W + 60, y: big ? GROUND - 230 : GROUND - 70, potion: big ? 'b' : 's', t: 0 });
    }
  }
}
function updateObs(dt, scroll) {
  const p = G.p, E = G.eff, mighty = G.boosting > 0 || E.giant > 0 || E.whirl > 0;
  updateEnergy(dt);
  const magL = hasPerk('letterLuck') ? 160 : 0;
  for (const o of G.obs) {
    o.t += dt; o.x -= scroll * dt;
    if (o.bumpT > 0) o.bumpT -= dt;
    if (o.dead || p.dead) continue;
    if (o.k === 'pillar') {
      const cx = clamp(p.x, o.x, o.x + o.w), cy = clamp(p.y, CEIL, o.y1);
      if ((p.x - cx) ** 2 + (p.y - cy) ** 2 < (p.r * p.scale) ** 2) { if (mighty) smashPillar(o); else hitPlayer({ type: 'rock' }); }
      else if (!o.near && p.x > o.x + o.w && G.boosting <= 0) { o.near = true; if (p.slide && T - (G.hurtAt || -9) > 1.2) { G.boost = Math.min(BMAX(), G.boost + 6); G.near++; pop(p.x, p.y - 40, pick(['쓱~', '슬라이딩!', '나이스!']), '#7cf0ff', 20); } }  // 방금 맞았으면 칭찬 안 함
    } else if (o.k === 'qb') {
      // 넉넉한 판정: 몸(원)이 블록(48×48)에 14px 안으로 닿기만 하면 열림 — 밑에서·옆에서·위에서 모두
      if (!o.hit) {
        const cx = clamp(p.x, o.x - 24, o.x + 24), cy = clamp(p.y, o.y - 24, o.y + 24), R = p.r * p.scale + 14;
        if ((p.x - cx) ** 2 + (p.y - cy) ** 2 < R * R || (mighty && Math.hypot(p.x - o.x, p.y - o.y) < 80)) {
          const fromTop = p.vy > 0 && p.y < o.y - 20;
          bumpBlock(o);
          if (fromTop) { p.vy = -(p.holdJ ? 760 : 560); p.bounced = true; } // 위에서 밟으면 통통
        }
      }
    } else if (o.k === 'letter') {
      if (magL && Math.hypot(p.x - o.x, p.y - o.y) < magL) { o.x = lerp(o.x, p.x, dt * 6); o.y = lerp(o.y, p.y, dt * 6); }
      if (Math.hypot(p.x - o.x, p.y - o.y) < p.r * p.scale + 26) getLetter(o);
    }
  }
  G.obs = G.obs.filter((o) => !o.dead && o.x + (o.w || 0) > -120);
  // 지난 기록 깃발
  const f = G.bestFlag;
  if (f && !f.passed) {
    if (f.x == null && G.dist + W + 100 >= f.d) f.x = W + 100;
    if (f.x != null) { f.x -= scroll * dt; if (f.x < p.x && !p.dead) { f.passed = true; reaction(3, '기록 돌파!!'); sfx.fever(); fireworks(3); G.recordBroke = true; } }
  }
}

// ───────── 첫 판 연습: 막히기 직전에 천천히 + 큰 안내 ─────────
const NEED_TXT = { jump: ['점프!', isTouch ? '왼쪽 화면을 톡!' : '스페이스 / ↑'], slide: ['숙이기!', isTouch ? '오른쪽 화면을 꾹~' : '↓ 를 꾹~'], stomp: ['밟기!', '점프해서 위에서 쿵!'] };
function updateTutor() {
  const tu = G.tut; if (!tu) return;
  const p = G.p;
  // 이단 점프 안내: 긴 가시밭 위 꼭대기에서 멈춤
  if (tu.dbl && !p.onG && !p.dead && p.jumps === 1 && p.vy > -140 && G.enemies.some((e) => !e.dead && e.type === 'urchin' && e.x - p.x > -20 && e.x - p.x < 200))
    coachOnce('double', { text: '공중에서 한 번 더 톡!', sub: '이단 점프로 긴 가시밭을 넘어요', spot: { x: SAFE + 66, y: H - 62, r: 62 }, wait: 'jump', state: 'play' });
  // 기운 안내: 물약이 보이면
  const pot = G.eggsArr.find((e) => e.tut && !e.got && e.x - p.x < 330);
  if (pot) coachOnce('potion', { text: '기운은 조금씩 줄어요', sub: '분홍 물약을 먹으면 다시 차요 · 부딪히면 크게 줄어요', spot: { x: SAFE + 22 + 30 + 110, y: 59, w: 270, h: 46 }, state: 'play' });
  let need = null;
  if (p.onG && !p.dead) {
    for (const o of G.obs) if (o.k === 'pillar' && !o.taught && o.x - p.x < 230 && o.x - p.x > 40) { need = 'slide'; tu.obj = o; break; }
    if (!need) for (const e of G.enemies) {
      if (e.taught || e.dead || e.x - p.x > 250 || e.x - p.x < 60) continue;
      need = e.type === 'jelly' ? 'stomp' : 'jump'; tu.obj = e; break;
    }
  }
  if (need && tu.did === (need === 'slide' ? 'slide' : 'jump')) { tu.obj.taught = true; need = null; }
  if (need !== tu.hint) { tu.hint = need; tu.did = null; if (need) { sfx.ready(); G.intro = 0; } }
  if (tu.hint) { // 가까워질수록 느려지다가 바로 앞에서 멈춰 기다림
    const o = tu.obj, dx = (o.x || 0) - p.x;
    timeScale = Math.min(timeScale, dx < 150 ? 0 : 0.3);
  }
}

// ───────── 그리기 ─────────
// 코덱스 그림 장애물: 끝은 원래 모양 그대로, 가운데만 늘리거나 반복(찌그러지지 않게)
// 그림의 투명 여백은 한 번 재서 잘라 씀(얇은 선처럼 보이지 않게)
const oboxCache = new Map();
function obox(im) {
  let b = oboxCache.get(im); if (b) return b;
  const w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  b = x1 > x0 ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : { x: 0, y: 0, w, h };
  oboxCache.set(im, b); return b;
}
function drawLedgeArt(o) {
  const im = IMG.spr_ledge; if (!im || !ready(im)) return false;
  const b = obox(im), h = 44, k = h / b.h, cap = Math.min(b.w * 0.16, (o.w / 2) / k);
  const y = o.y - 8; // 그림 윗면 ≈ 밟는 줄
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, o.y + 44, o.w / 2, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(im, b.x, b.y, cap, b.h, o.x, y, cap * k, h);
  ctx.drawImage(im, b.x + cap, b.y, b.w - cap * 2, b.h, o.x + cap * k, y, Math.max(0, o.w - cap * k * 2), h);
  ctx.drawImage(im, b.x + b.w - cap, b.y, cap, b.h, o.x + o.w - cap * k, y, cap * k, h);
  return true;
}
function drawPillarArt(o) {
  const body = IMG.spr_pillar_body, tip = IMG.spr_pillar_tip; if (!body || !tip || !ready(body) || !ready(tip)) return false;
  const bb = obox(body), tb = obox(tip), w = o.w + 14, x = o.x - 7;
  const th = (w * tb.h) / tb.w, bw = w * 0.78, bh = (bw * bb.h) / bb.w;
  const tipTop = o.y1 + 4 - th;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 4, CEIL - 40, w + 8, tipTop - (CEIL - 40) + 10); ctx.clip();
  for (let y = tipTop - bh + 10; y > CEIL - 40 - bh; y -= bh - 2) ctx.drawImage(body, bb.x, bb.y, bb.w, bb.h, x + (w - bw) / 2, y, bw, bh); // 아래에서 위로 반복
  ctx.restore();
  ctx.drawImage(tip, tb.x, tb.y, tb.w, tb.h, x, tipTop, w, th);
  // 끝 가시가 빨갛게 숨쉬기 — 「여기 닿으면 아파요」
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.2 * Math.sin(T * 8);
  const g = ctx.createRadialGradient(o.x + o.w / 2, o.y1, 4, o.x + o.w / 2, o.y1, w * 0.8); g.addColorStop(0, 'rgba(255,60,90,1)'); g.addColorStop(1, 'rgba(255,60,90,0)');
  ctx.fillStyle = g; ctx.fillRect(x - w * 0.3, o.y1 - w * 0.8, w * 1.6, w * 1.6); ctx.restore();
  if (G.tut && G.tut.hint === 'slide' && G.tut.obj === o) { ctx.strokeStyle = `rgba(255,213,74,${0.6 + 0.4 * Math.sin(T * 10)})`; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.strokeRect(o.x - 8, o.y1 - 2, o.w + 16, GROUND - o.y1); ctx.setLineDash([]); }
  return true;
}
function drawRunObs() {
  for (const o of G.obs) {
    if (o.k === 'pillar' && drawPillarArt(o)) { /* 코덱스 그림 */ } else if (o.k === 'pillar') {
      const x = o.x, w = o.w, y1 = o.y1;
      const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#3a2350'); g.addColorStop(0.5, '#6a3f86'); g.addColorStop(1, '#3a2350');
      ctx.fillStyle = g; rr(x, CEIL - 30, w, y1 - CEIL + 18, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#ff6fa8';
      for (let yy = CEIL + 30; yy < y1 - 40; yy += 46) { ctx.beginPath(); ctx.arc(x + w * (0.3 + 0.4 * hash(yy + x * 0.01)), yy, 7, 0, Math.PI * 2); ctx.fill(); }
      // 아래 가시: 빨갛게 깜빡 — 「여기 닿으면 아파요」
      const n = Math.max(2, Math.round(w / 22));
      ctx.fillStyle = `rgb(255,${80 + 40 * Math.sin(T * 8)},${100})`;
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const a = x + (i / n) * w, b = x + ((i + 1) / n) * w; ctx.moveTo(a, y1 - 12); ctx.lineTo((a + b) / 2, y1 + 4); ctx.lineTo(b, y1 - 12); }
      ctx.fill();
      if (G.tut && G.tut.hint === 'slide' && G.tut.obj === o) { ctx.strokeStyle = `rgba(255,213,74,${0.6 + 0.4 * Math.sin(T * 10)})`; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.strokeRect(x - 8, y1 - 2, w + 16, GROUND - y1); ctx.setLineDash([]); }
    } else if (o.k === 'plat' && drawLedgeArt(o)) { /* 코덱스 그림 */
    } else if (o.k === 'plat') {
      const g = ctx.createLinearGradient(0, o.y, 0, o.y + 26); g.addColorStop(0, '#ffb3c8'); g.addColorStop(1, '#b5527a');
      ctx.fillStyle = 'rgba(0,0,0,.18)'; rr(o.x + 6, o.y + 8, o.w, 24, 12); ctx.fill();
      ctx.fillStyle = g; rr(o.x, o.y, o.w, 24, 12); ctx.fill();
      ctx.fillStyle = '#ffe1ea'; rr(o.x + 6, o.y + 3, o.w - 12, 6, 3); ctx.fill();
      ctx.fillStyle = '#ff7fa6'; for (let i = 14; i < o.w - 10; i += 36) { ctx.beginPath(); ctx.arc(o.x + i, o.y + 22, 5, 0, Math.PI); ctx.fill(); }
    } else if (o.k === 'qb') {
      const by = o.y - (o.bumpT > 0 ? Math.sin(o.bumpT / 0.25 * Math.PI) * 14 : 0) + Math.sin(o.t * 3) * 2;
      ctx.save(); ctx.translate(o.x, by);
      if (!o.hit) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(0, 0, 4, 0, 0, 46); gg.addColorStop(0, 'rgba(255,220,90,.45)'); gg.addColorStop(1, 'rgba(255,220,90,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      const qi = IMG[o.hit ? 'spr_qblock_used' : 'spr_qblock'];
      if (qi && ready(qi)) { // 코덱스 그림: 맞으면 위로 튀며 납작했다가 길쭉(용수철)
        const k = o.bumpT > 0 ? o.bumpT / 0.25 : 0, sq = Math.sin(k * Math.PI) * 0.18;
        const qb = obox(qi); ctx.save(); ctx.scale(1 + sq, 1 - sq); ctx.drawImage(qi, qb.x, qb.y, qb.w, qb.h, -27, -27, 54, 54); ctx.restore(); // 판정 48칸에 맞춤
      } else {
        ctx.fillStyle = o.hit ? '#8a7a66' : '#ffc93a'; rr(-24, -24, 48, 48, 12); ctx.fill();
        ctx.strokeStyle = o.hit ? '#5a4a3a' : '#a26a00'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = o.hit ? 'rgba(0,0,0,.2)' : '#fff6cf'; rr(-18, -19, 36, 8, 4); ctx.fill();
        if (!o.hit) text('?', 0, 4, 28, '#7a4a00', { stroke: '#fff3c0', lw: 4 });
      }
      ctx.restore();
    } else if (o.k === 'letter') {
      const y = o.y + Math.sin(o.t * 4) * 6, s = 1 + Math.sin(o.t * 6) * 0.06;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(o.x, y, 4, o.x, y, 44); gg.addColorStop(0, 'rgba(255,230,120,.55)'); gg.addColorStop(1, 'rgba(255,230,120,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(o.x, y, 44, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(o.x, y); ctx.scale(s, s);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.yellow; ctx.lineWidth = 4; ctx.stroke();
      text(LETTERS[o.i], 0, 1, 24, '#ff6a3d', { stroke: false });
      ctx.restore();
    }
  }
  const f = G.bestFlag;
  if (f && f.x != null && !f.passed) {
    // 지난 기록: 금빛 빛기둥(코덱스 그림) + 이름표 — 막대 선 대신
    const pl = IMG.spr_fx_pillar;
    if (pl && ready(pl)) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + Math.sin(T * 4) * 0.1; const ph = 230, pw = (ph * pl.naturalWidth) / pl.naturalHeight * 0.7; ctx.drawImage(pl, f.x - pw / 2, GROUND - ph, pw, ph); ctx.restore(); }
    ctx.font = `600 ${fs(15)}px ${FONT}`; const lw = ctx.measureText('지난 기록').width + 24, ly = GROUND - 210 + Math.sin(T * 3) * 3;
    ctx.fillStyle = 'rgba(16,16,18,.7)'; rr(f.x - lw / 2, ly - 15, lw, 30, 15); ctx.fill();
    ctx.strokeStyle = C.yellow; ctx.lineWidth = 2; rr(f.x - lw / 2, ly - 15, lw, 30, 15); ctx.stroke();
    text('지난 기록', f.x, ly, 15, C.yellow, { body: true, stroke: false });
  }
}
// 땅 그림자(점프 높이를 읽기 쉽게)
function drawRunShadow() {
  const p = G.p; if (p.dead) return;
  const h = GROUND - p.fy, k = clamp(1 - h / 300, 0.3, 1);
  ctx.fillStyle = `rgba(0,10,30,${0.32 * k})`;
  ctx.beginPath(); ctx.ellipse(p.x, GROUND + 2, 34 * k * p.scale, 7 * k, 0, 0, Math.PI * 2); ctx.fill();
}
// ───────── 주인공 동작 그림: Codex 가 같은 캐릭터로 그린 7장(달리기 2·점프·떨어짐·등껍질 미끄럼·등껍질 공·맞음) ─────────
const POSE_KEYS = ['hero_run1', 'hero_run2', 'hero_jump', 'hero_fall', 'hero_shell', 'hero_ball', 'hero_hurt'];
POSE_KEYS.forEach((k) => load('pose_' + k, `assets/sprites/${k}.webp`));
const poseCache = {};
// 투명 여백을 잘라 둔 그림(발끝 = 그림 아래 끝) + 옷의 모자 색
// 옷마다 그린 달리기 동작(o_<옷>_<동작>.webp) — 있으면 그걸, 없으면 기본 그림 + 모자 색
const OUTFIT_POSES = ['raincoat', 'chef', 'barista', 'delivery', 'cape14', 'suit', 'crown7', 'pirate', 'wizard', 'hanbok', 'astronaut', 'firefighter', 'diver'];
const outfitMiss = new Set(); // 그림 파일이 없는 동작(404) — 기본 그림 + 모자 색으로
// 높은 모자·투구가 있는 옷은 그림 키에 모자가 들어가 몸이 작아 보임 → 그만큼 키움(몸 크기를 기본 터틀이와 맞춤)
const OUTFIT_H = { chef: 1.16, wizard: 1.3, pirate: 1.12, firefighter: 1.1, astronaut: 1.07, diver: 1.08, crown7: 1.08, raincoat: 1.04, hanbok: 1.04 };
function outfitPose(key) {
  const sk = save.skin; if (!sk || sk === 'basic' || !OUTFIT_POSES.includes(sk)) return null;
  const n = `o_${sk}_${key}`; if (outfitMiss.has(n)) return null;
  if (!IMG['pose_' + n]) { const im = load('pose_' + n, `assets/sprites/${n}.webp`); im.onerror = () => outfitMiss.add(n); }
  return ready(IMG['pose_' + n]) ? n : null;
}
function pose(key, cap) {
  const ok = outfitPose(key); if (ok) { key = ok; cap = null; } // 옷 그림이 있으면 모자 색 바꾸기는 안 함
  const id = key + (cap || '');
  if (poseCache[id] !== undefined) return poseCache[id];
  const im = IMG['pose_' + key]; if (!ready(im)) return null;
  try {
    const w = im.naturalWidth, h = im.naturalHeight, c0 = document.createElement('canvas'); c0.width = w; c0.height = h;
    const g0 = c0.getContext('2d', { willReadFrequently: true }); g0.drawImage(im, 0, 0);
    const d = g0.getImageData(0, 0, w, h), px = d.data;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (px[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 <= x0) return (poseCache[id] = null);
    if (cap) { const [tr, tg, tb] = rgb(cap); for (let i = 0; i < px.length; i += 4) { const r = px[i], gg = px[i + 1], b = px[i + 2]; if (b > r + 45 && b > gg + 25) { const lum = (r * 0.3 + gg * 0.59 + b * 0.11) / 110; px[i] = clamp(tr * lum, 0, 255); px[i + 1] = clamp(tg * lum, 0, 255); px[i + 2] = clamp(tb * lum, 0, 255); } } g0.putImageData(d, 0, 0); }
    const c = document.createElement('canvas'); c.width = x1 - x0 + 1; c.height = y1 - y0 + 1;
    c.getContext('2d').drawImage(c0, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
    return (poseCache[id] = c);
  } catch (e) { return (poseCache[id] = null); }
}
// 동작별 키(서 있는 키 = 1): 등껍질에 쏙 들어가면 낮고 납작하게
// 모자 꼭대기의 가로 자리(잘라 둔 그림 폭 기준 0~1) — 등껍질 공·미끄럼은 숨김
const HAT_AT = { hero_run1: 0.6, hero_run2: 0.62, hero_jump: 0.5, hero_fall: 0.5, hero_hurt: 0.35 };
const POSE_H = { hero_run1: 0.98, hero_run2: 0.98, hero_jump: 1.02, hero_fall: 1.02, hero_shell: 0.43, hero_ball: 0.66, hero_hurt: 0.98 };
function heroPose() {
  const p = G.p;
  if (p.dead || T - (G.hurtAt || -9) < 0.45) return 'hero_hurt';
  if (p.slide) return 'hero_shell';
  if (G.bonus || G.eff.rocket > 0) return 'hero_jump';
  if (!p.onG) { if (p.spin > 0) return 'hero_ball'; return p.vy > 160 ? 'hero_fall' : 'hero_jump'; }
  return Math.floor(G.dist / (G.boosting > 0 ? 70 : 52)) % 2 ? 'hero_run2' : 'hero_run1';
}
function drawPoseAt(c, x, feetY, h, rot, alpha, ghost) {
  const w = (h * c.width) / c.height;
  ctx.save(); ctx.translate(x, feetY - h / 2); ctx.rotate(rot);
  if (alpha != null) ctx.globalAlpha *= alpha;
  if (ghost) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.45; }
  ctx.drawImage(c, -w / 2, -h / 2, w, h);
  ctx.restore();
}
// 그림 모양 그대로 한 색으로 칠한 판(맞을 때 하얀 번쩍 → 빨강)
const tintCache = new Map();
function tinted(c, color) {
  let m = tintCache.get(c); if (!m) { m = {}; tintCache.set(c, m); }
  if (!m[color]) { const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; const g = t.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, t.width, t.height); m[color] = t; }
  return m[color];
}
function drawBonusBubble() { // 보너스 바다: 반짝이는 거품을 타고 둥실(쿠키런에선 펫이 들어 올림)
  const p = G.p, r = 54 + Math.sin(T * 5) * 3;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(p.x - 14, p.y - 18, 6, p.x, p.y - 6, r); g.addColorStop(0, 'rgba(255,255,255,.25)'); g.addColorStop(0.7, 'rgba(120,230,255,.12)'); g.addColorStop(1, 'rgba(160,240,255,.5)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - 6, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(220,250,255,.8)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(p.x - r * 0.45, p.y - 6 - r * 0.5, 10, 5, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawRunHero(face, blink, alpha) {
  const p = G.p, cap = (SIDE_STYLE[save.skin] || {}).cap; let key = heroPose(), c = pose(key, cap);
  if (!c && key === 'hero_fall') { key = 'hero_jump'; c = pose(key, cap); } // 그림이 없으면 점프 그림으로
  if (!c) return drawRunHeroOld(face, blink, alpha);
  const base = HERO_H * 0.96 * p.scale; let h = base * POSE_H[key] * (outfitPose(key) ? OUTFIT_H[save.skin] || 1 : 1), rot = 0, sx = 1, sy = 1, feet = p.fy + 2, x = p.x;
  if (key === 'hero_ball') { rot = Math.PI * 2 * easeInOutCubic(1 - p.spin); feet = p.fy - base * 0.12; }
  else if (key === 'hero_shell') { rot = Math.sin(T * 30) * 0.03; x += Math.sin(T * 20) * 1.5; }
  else if (key === 'hero_hurt') { rot = -0.18 + Math.sin(T * 25) * 0.05; if (p.dead) { feet = p.y + base * 0.5; rot = p.rot; } }
  else if (!p.onG) rot = clamp(p.vy * 0.00035, -0.2, 0.25);
  else { feet -= Math.abs(Math.sin(G.dist / 52 * Math.PI)) * 3; rot = 0.06; } // 달리며 통통 + 앞으로 살짝
  if (p.land > 0) { const k = p.land / 0.14; sx = 1 + k * 0.16; sy = 1 - k * 0.14; } // 착지 찌그러짐
  else if (!p.onG && p.vy < -300 && key !== 'hero_ball') { sx = 0.92; sy = 1.08; } // 솟구칠 때 길쭉
  if (G.boosting > 0 && !REDUCE) {
    // 질주: 발밑 물결을 타고 + 뒤로 보라 꼬리빛(코덱스 그림) + 잔상
    const fl = 0.85 + Math.sin(T * 40) * 0.15, my = feet - h * 0.5;
    const tr = IMG.spr_fx_trail, wv = IMG.spr_fx_wave;
    if (tr && ready(tr)) for (const [ad, al] of [[false, 0.85], [true, 0.6]]) { // 진하게 한 번 + 빛으로 한 번(밝은 바다에서도 보이게)
      const th = h * 1.5 * fl, tw = 460 + Math.sin(T * 25) * 30;
      ctx.save(); if (ad) ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = al;
      ctx.translate(x + 40, my); ctx.scale(-1, 1); ctx.drawImage(tr, 0, -th / 2, tw, th); ctx.restore();
    }
    if (wv && ready(wv)) { const wh = h * 1.05, ww = (wh * wv.naturalWidth) / wv.naturalHeight; ctx.save(); ctx.globalAlpha = 0.92; ctx.drawImage(wv, x - ww * 0.72, feet - wh * 0.86 + Math.sin(T * 18) * 3, ww, wh); ctx.restore(); }
    for (let i = 1; i <= 3; i++) drawPoseAt(c, x - i * 26, feet, h * sy, rot, 1 - i * 0.25, true);
  }
  if (G.eff.rocket > 0) drawImg(IMG.spr_it_rocket, x - 4, feet + 6, 64, -Math.PI / 2 + 0.25 + Math.sin(T * 30) * 0.04); // 로켓 타고
  ctx.save(); ctx.translate(x, feet); ctx.scale(sx, 1); ctx.translate(-x, -feet);
  drawPoseAt(c, x, feet, h * sy, rot, alpha);
  const ha = T - (G.hurtAt || -9); // 맞은 뒤: 55ms 하얗게 → 200ms 빨갛게 사라짐(알 합치기 수치)
  if (ha < 0.255 && !p.dead) drawPoseAt(tinted(c, ha < 0.055 ? '#ffffff' : '#ff3355'), x, feet, h * sy, rot, ha < 0.055 ? 0.9 : 0.6 * (1 - (ha - 0.055) / 0.2));
  const st = SIDE_STYLE[save.skin] || {}, hx = HAT_AT[key];
  if (hx != null && (st.crown || st.chef) && !outfitPose(key)) { // 모자 꼭대기(그림 폭의 hx 지점, 맨 위)
    const w = (h * sy * c.width) / c.height, cx = x + (hx - 0.5) * w * Math.cos(rot), cy = feet - h * sy + 4 + (hx - 0.5) * w * Math.sin(rot), u = h * 0.06;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); if (alpha != null) ctx.globalAlpha *= alpha;
    if (st.crown) { ctx.fillStyle = '#ffcf3a'; ctx.strokeStyle = '#a26a00'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-2.2 * u, 0); ctx.lineTo(-2.2 * u, -2.6 * u); ctx.lineTo(-u, -1.3 * u); ctx.lineTo(0, -3 * u); ctx.lineTo(u, -1.3 * u); ctx.lineTo(2.2 * u, -2.6 * u); ctx.lineTo(2.2 * u, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff3b6b'; ctx.beginPath(); ctx.arc(0, -1.2 * u, u * 0.4, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillStyle = '#ffffff'; ctx.fillRect(-1.6 * u, -1.2 * u, 3.2 * u, 1.2 * u); [[-1.1, -2], [0, -2.5], [1.1, -2]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx * u, dy * u, u * 0.95, 0, Math.PI * 2); ctx.fill(); }); }
    ctx.restore();
  }
  ctx.restore();
}
function drawRunHeroOld(face, blink, alpha) {
  const p = G.p, h = HERO_H * p.scale;
  let rot = p.rot, stretch = 1;
  if (p.dead) { drawHero(p.x, p.y, h, rot, { ph: p.ph, face, stand: true }); return; }
  if (p.slide) rot = 1.15;
  else if (p.land > 0) stretch = 1 + p.land / 0.14 * 0.16;
  else if (!p.onG && p.vy < -200) stretch = 0.9;
  if (p.spin > 0) rot += Math.PI * 2 * easeInOutCubic(1 - p.spin); // 이단 점프: 앞으로 한 바퀴
  const cy = p.fy - h * 0.43 + (p.slide ? h * 0.3 : 0);
  const opts = { ph: p.onG && !p.slide ? p.ph : p.ph * 0.4, boost: G.boosting > 0, face, blink, alpha, stretch: G.boosting > 0 ? 1.1 : stretch, stand: true };
  if (G.boosting > 0 && !REDUCE) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawHero(p.x - 8, cy, h, rot, { ...opts, ghost: '#ff3355', alpha: 0.5 });
    drawHero(p.x + 8, cy, h, rot, { ...opts, ghost: '#33aaff', alpha: 0.5 });
    ctx.restore();
  }
  drawHero(p.x, cy, h, rot, opts);
}
function drawRunPads() {
  if (!isTouch) return;
  const tu = G.tut, jh = tu && (tu.hint === 'jump' || tu.hint === 'stomp'), sh = tu && tu.hint === 'slide';
  const pads = [[SAFE + 66, H - 62, '점프', 'e_rocket', jh, !!G.touch.j], [W - SAFE - 66, H - 62, '숙이기', null, sh, !!G.touch.s]];
  for (const [x, y, label, , hi, on] of pads) {
    ctx.save();
    ctx.globalAlpha = hi ? 0.95 : on ? 0.55 : save.runs <= 6 ? 0.32 : 0.18;
    const r = hi ? 58 + Math.sin(T * 10) * 6 : 46;
    ctx.fillStyle = hi ? C.yellow : 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 2.2);
    ctx.fillStyle = hi ? '#191F28' : '#ffffff';
    ctx.beginPath();
    if (label === '점프') { ctx.moveTo(x, y - 30); ctx.lineTo(x - 18, y - 10); ctx.lineTo(x + 18, y - 10); }
    else { ctx.moveTo(x, y - 6); ctx.lineTo(x - 18, y - 26); ctx.lineTo(x + 18, y - 26); }
    ctx.fill();
    text(label, x, y + 16, 17, hi ? '#191F28' : '#ffffff', { stroke: false });
    ctx.restore();
  }
}
function drawRunHud(L) {
  // 기운 막대(쿠키런 에너지 막대 방식): 하트 + 줄무늬 막대, 줄어든 만큼 0.4초 빨갛게 남았다 따라 내려감, 채우면 하늘색 반짝, 20% 아래면 깜빡
  const bx = L + 30, by = 50, bw = 220, bh = 18, k = clamp(G.en / G.maxEn, 0, 1), ks = clamp(G.enShow / G.maxEn, 0, 1), low = k < 0.2;
  const blink = low && Math.sin(T * 12) > 0;
  ctx.fillStyle = 'rgba(16,16,18,.62)'; rr(bx - 4, by - 4, bw + 8, bh + 8, (bh + 8) / 2); ctx.fill();
  if (ks > k) { ctx.fillStyle = '#ff3355'; rr(bx, by, bw * ks, bh, bh / 2); ctx.fill(); } // 잃은 만큼(빨강)
  if (k > 0) {
    ctx.save(); rr(bx, by, Math.max(bh, bw * k), bh, bh / 2); ctx.clip();
    const g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, blink ? '#ff8aa0' : '#ffe14a'); g.addColorStop(1, blink ? '#ff3355' : '#ff9a1f');
    ctx.fillStyle = g; ctx.fillRect(bx, by, bw * k, bh);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; for (let x = bx - 30 + ((T * 40) % 24); x < bx + bw * k; x += 24) { ctx.beginPath(); ctx.moveTo(x, by + bh); ctx.lineTo(x + 10, by); ctx.lineTo(x + 18, by); ctx.lineTo(x + 8, by + bh); ctx.fill(); } // 흐르는 줄무늬
    if (G.enHealT > 0) { const k0 = clamp((G.enHealFrom || 0) / G.maxEn, 0, 1); ctx.fillStyle = `rgba(110,235,255,${Math.min(1, G.enHealT / 0.3)})`; ctx.fillRect(bx + bw * k0, by, bw * (k - k0), bh); } // 채운 만큼 하늘색
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx, by + 2, bw * k, 4);
    ctx.restore();
  }
  if (G.bonus) { // 보너스 바다: 기운 막대 위에 하늘색 남은 시간 막대를 덮음
    const tk = clamp(G.bonus.t / G.bonus.max, 0, 1);
    ctx.fillStyle = '#6eebff'; rr(bx, by, Math.max(bh, bw * Math.min(1, tk)), bh, bh / 2); ctx.fill();
    text(`보너스 ${Math.ceil(G.bonus.t)}초`, bx + bw / 2, by + bh / 2 + 1, 13, '#063040', { stroke: false });
  }
  const hs = 34 * (low ? 1 + Math.abs(Math.sin(T * 4.5)) * 0.18 : G.p.inv > 0 && T - (G.hurtAt || -9) < 0.5 ? 1.15 : 1);
  drawItemIcon('heart', bx - 6, by + bh / 2, hs);
  let hx = bx + bw + 22;
  for (let i = 0; i < G.shield; i++) { icon('e_shield', hx + 4, 60, 24); hx += 28; }
  if (save.diff !== 1) text(DIFFS[save.diff].name, hx + 10, 60, 13, save.diff === 2 ? C.danger : C.ok, { align: 'left', body: true });
  // 바·다·축·제 글자 (보스전엔 체력바 자리라 숨김)
  const lx = W / 2 - 66, ly = 52;
  if (!(G.boss && !G.boss.dead)) LETTERS.forEach((c, i) => {
    const on = G.letters[i];
    ctx.fillStyle = on ? C.yellow : 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(lx + i * 44, ly, 16, 0, Math.PI * 2); ctx.fill();
    if (on) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    text(c, lx + i * 44, ly + 1, 15, on ? '#7a3a00' : 'rgba(255,255,255,.5)', { stroke: false });
  });
  // 연습 안내
  const tu = G.tut;
  if (tu && tu.hint) {
    const [big, small] = NEED_TXT[tu.hint];
    const s = 1 + Math.sin(T * 10) * 0.05;
    ctx.save(); ctx.translate(W / 2, H / 2 - 70); ctx.scale(s, s); text(big, 0, 0, 64, C.yellow, { lw: 10 }); ctx.restore();
    text(small, W / 2, H / 2 - 18, 24, '#ffffff', { lw: 6 });
  }
  drawRunPads();
}
