'use strict';
// 터틀런 — 판 밖: 도전(미션)·선물·출석·별 상자·도감·설정·월드맵(세계 3곳)·첫 이야기·상점·결과 화면
// 메뉴 화면은 가운데 960 폭에 그린다(main.js 가 OX 만큼 옮겨 줌)

// ───────── 오늘의 도전 ─────────
const MISSION_TYPES = [
  { type: 'eggsRun', goals: [25, 40, 60], text: (n) => `한 판에 진주 ${n}개 모으기` },
  { type: 'near', goals: [5, 10, 20], text: (n) => `아슬아슬 회피 ${n}번` },
  { type: 'boostKill', goals: [5, 10, 20], text: (n) => `필살기로 ${n}마리 물리치기` },
  { type: 'clear', goals: [1, 2, 3], text: (n) => `바다 ${n}곳 성공하기` },
  { type: 'fever', goals: [1, 2, 3], text: (n) => `바다 축제 ${n}번 부르기` },
  { type: 'gold', goals: [3, 6, 10], text: (n) => `황금 진주 ${n}개 먹기` },
  { type: 'runs', goals: [3, 5, 8], text: (n) => `${n}판 도전하기` },
  { type: 'boost', goals: [3, 6, 10], text: (n) => `필살기 ${n}번 쓰기` },
  { type: 'stomp', goals: [5, 10, 20], text: (n) => `몬스터 ${n}마리 밟기` },
  { type: 'jar', goals: [3, 6, 10], text: (n) => `숙여서 항아리 ${n}개 깨기`, from: 4 }, // 새 장치 미션: 그 장치가 나오는 바다까지 간 사람에게만
  { type: 'wall', goals: [1, 2, 3], text: (n) => `필살기로 벽 ${n}번 부수기`, from: 7 },
  { type: 'climbTop', goals: [1, 2, 3], text: (n) => `오르기 꼭대기 황금 진주 ${n}개`, from: 11 },
];
function newMission(exclude) {
  const m = pick(MISSION_TYPES.filter((t) => !exclude.includes(t.type) && (save.unlocked || 1) >= (t.from || 0)));
  const gi = (Math.random() * 3) | 0;
  return { type: m.type, goal: m.goals[gi], prog: 0, reward: [25, 45, 70][gi], done: false };
}
function ensureMissions() { while (save.missions.length < 3) save.missions.push(newMission(save.missions.map((m) => m.type))); }
const missionText = (m) => (MISSION_TYPES.find((t) => t.type === m.type) || MISSION_TYPES[0]).text(m.goal);
function track(type, amt = 1, runVal = 0) {
  for (const m of save.missions) {
    if (m.type !== type || m.done) continue;
    if (type === 'eggsRun') m.prog = Math.max(m.prog, runVal); else m.prog += amt;
    if (m.prog >= m.goal) { m.prog = m.goal; m.done = true; toast(`도전 성공! ${missionText(m)}`, C.ok); sfx.mission(); haptic(30); }
  }
}
const missionsReady = () => save.missions.filter((m) => m.done).length;
function claimMission(i) {
  const m = save.missions[i];
  if (!m || !m.done) return;
  save.eggs += m.reward; save.missionsDone = (save.missionsDone || 0) + 1; // 점수 배수가 영구히 오름(인기 게임 방식)
  if (save.missionsDone % 2 === 0) toast(`점수 배수 ×${scoreMult()}로 올랐어요!`, '#ff9a3c');
  save.missions.splice(i, 1); ensureMissions(); persist();
  fountain(W / 2, 200 + i * 86, m.reward); sfx.gift(); haptic([20, 30, 40]);
  toast(`진주 +${m.reward}`, C.yellow);
}
function closestMission() {
  const open = save.missions.filter((m) => !m.done);
  return open.length ? open.sort((a, b) => b.prog / b.goal - a.prog / a.goal)[0] : null;
}

// ───────── 선물 상자(3시간마다) · 출석 · 별 상자 ─────────
const giftReady = () => Date.now() >= (save.giftAt || 0);
function giftLeft() { const s = Math.max(0, Math.ceil(((save.giftAt || 0) - Date.now()) / 1000)); return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`; }
function openGift() {
  if (!giftReady()) { sfx.no(); toast(`선물은 ${giftLeft()} 뒤에 와요`); return; }
  const n = 20 + Math.floor(Math.random() * 41); // 20~60 각 개수 같은 확률(확률 정보와 같게)
  save.eggs += n; save.giftAt = Date.now() + 3 * 3600e3; persist();
  if (!showBox('wood', '선물 상자', n)) { fountain(W / 2, 40, n); confetti(40); sfx.gift(); haptic([20, 30, 40]); toast(`선물 상자! 진주 +${n}`, C.yellow); }
}
function checkStreak() {
  const t = today();
  if (save.streak.last === t) return;
  const st = save.streak; if (st.rest == null) st.rest = 1; // 쉬는 날 카드(최대 2장)
  let gap = 1; while (gap < 30 && st.last && st.last !== today(gap)) gap++; // 마지막 출석이 며칠 전?
  const missed = st.last ? gap - 1 : 0;
  if (!st.last || gap >= 30) st.day = 1;
  else if (missed === 0) st.day++;
  else if (missed <= st.rest) { st.rest -= missed; st.day++; toast(`쉬는 날 카드 ${missed}장으로 연속 지켰어요!`, '#7cd8ff'); }
  else { st.lost = st.day; st.lostRuns = 0; st.day = 1; toast(`연속이 끊겼어요. 오늘 3판 하면 ${st.lost}일 연속을 되찾아요!`, C.yellow); }
  if (st.day % 7 === 0 && st.rest < 2) { st.rest++; toast('7일 연속! 쉬는 날 카드 +1', '#7cd8ff'); }
  st.last = t;
  const r = Math.min(70, save.streak.day * 10);
  save.eggs += r; persist();
  fountain(W / 2, H / 2, r);
  toast(`출석 ${save.streak.day}일째! 진주 +${r}`, C.yellow);
}
const chestGoal = () => (save.chests + 1) * 10;
const chestReady = () => totalStars() >= chestGoal();
function openChest() {
  if (!chestReady()) { sfx.no(); toast(`별 ${chestGoal()}개를 모으면 열려요 (지금 ${totalStars()}개)`); return; }
  save.chests++; save.eggs += 80; persist();
  if (!showBox(save.chests % 5 === 0 ? 'gold' : 'silver', '별 상자', 80)) { fountain(W / 2, 40, 80); confetti(60); sfx.crack(); haptic([30, 30, 80]); toast('별 상자! 진주 +80', C.yellow); }
}
// 상자 열기 연출(알 합치기 게임의 나무·은·금 상자 그림): 떨어져 통통 → 흔들흔들 → 펑 열림 + 진주 숫자 굴러 오름 → 누르면 진주가 위 진주 칸으로
let boxShow = null;
function showBox(kind, label, n, opt = {}) {
  if (!ready(IMG['spr_box_' + kind + '_c']) || !ready(IMG['spr_box_' + kind + '_o'])) return false;
  boxShow = { kind, label, n, opt, t: 0, t0: performance.now(), opened: false }; sfx.click(); return true;
}
function openFirstGift() { // 처음 깬 바다 선물: 상자 연출로
  const n = save.giftQ.shift(), g = FIRST_GIFTS[n]; if (!g) { persist(); return; }
  if (g.gems) save.gems += g.gems; if (g.pearls) save.eggs += g.pearls; if (g.egg) save.freeEgg = true; if (g.skin && !save.skins.includes(g.skin)) save.skins.push(g.skin);
  persist(); showBox(g.box, g.label, g.gems || g.pearls || 0, { gem: !!g.gems, skin: g.skin, egg: g.egg, say: g.say });
}
function drawBoxShow() {
  const b = boxShow; b.t = (performance.now() - b.t0) / 1000; // 실제 시계 기준(프레임이 빠져도 길이 같게)
  buttons.length = 0; buttons.push({ x: 0, y: 0, w: W, h: H, on: () => { if (b.t > 1.4) { boxShow = null; if (!(b.opt && (b.opt.gem || b.opt.skin || b.opt.egg))) fountain(W / 2, H / 2, b.n); sfx.gift(); } else if (b.t < 0.95) b.t0 = performance.now() - 950; } }); // 누르면 바로 열기 → 한 번 더 누르면 받기
  ctx.fillStyle = `rgba(6,14,34,${Math.min(0.82, b.t * 3)})`; ctx.fillRect(-OX(), 0, W, H);
  const cx = 480, cy = 270, open = b.t >= 0.95;
  if (open && !b.opened) { b.opened = true; sfx.crack(); haptic([30, 30, 80]); flash = 0.4; flashColor = '#fff6c8'; confettiBurst(cx + OX(), cy - 40, 60); popDots(cx + OX(), cy - 30, 70); }
  if (open) { const k = Math.min(1, (b.t - 0.95) / 0.4); celebrateGlow(cx, cy - 20, 260, b.kind === 'gold' ? '255,213,74' : '190,232,255', k); } // 뒤에서 퍼지는 둥근 빛
  let sx = 1, sy = 1, dy = 0, rot = 0;
  if (b.t < 0.35) { const k = b.t / 0.35; dy = -(1 - k * k) * 320; } // 위에서 떨어짐
  else if (b.t < 0.5) { const k = (b.t - 0.35) / 0.15; sy = 1 - 0.18 * Math.sin(k * Math.PI); sx = 1 + 0.14 * Math.sin(k * Math.PI); } // 쿵 찌그러짐
  else if (!open) { const k = (b.t - 0.5) / 0.45; rot = Math.sin(b.t * 40) * 0.08 * k; sx = sy = 1 + 0.06 * k; } // 점점 세게 흔들
  else { const k = Math.min(1, (b.t - 0.95) / 0.25); sx = sy = 1 + 0.25 * (1 - k) * Math.sin(k * Math.PI); }
  ctx.save(); ctx.translate(cx, cy + 60 + dy); ctx.rotate(rot); ctx.scale(sx, sy);
  drawImg(IMG['spr_box_' + b.kind + (open ? '_o' : '_c')], 0, -110, 240); ctx.restore();
  text(b.label, cx, 92, 34, b.kind === 'gold' ? C.yellow : '#ffffff', { lw: 7 });
  if (open) {
    const k = Math.min(1, (b.t - 1.0) / 0.5), v = Math.round(b.n * (1 - Math.pow(1 - Math.max(0, k), 3))), o = b.opt || {};
    if (o.skin) { drawImg(IMG['skin_' + o.skin], cx, 400 - Math.abs(Math.sin(T * 4)) * 8, 120); } // 옷 선물: 그 옷을 입은 터틀이
    else if (o.egg) { drawImg(IMG.egg, cx, 410, 90, Math.sin(T * 6) * 0.15); }
    else { ctx.font = `800 ${fs(30)}px ${FONT}`; const tw = ctx.measureText(`+${v}`).width; if (o.gem) icon('e_gem', cx - tw / 2 - 12, 438, 34); else drawPearl(cx - tw / 2 - 10, 438, 32); text(`+${v}`, cx + 14, 440, 30, o.gem ? '#9fe3ff' : C.yellow, { lw: 6 }); }
    if (o.say && b.t > 1.2) text(o.say, cx, o.skin || o.egg ? 476 : 470, 15, '#ffffff', { body: true, lw: 4 });
    if (b.t > 1.4) text('눌러서 받기', cx, 506, 15, C.sub, { body: true, stroke: false });
  }
}

// ───────── 월드맵: 세계 5곳 × 바다 10칸 = 50판, 손가락으로 쭉 미는 긴 바다 지도 ─────────
const MAP_STEP = 190, MAP_X0 = 300;
function nodePos(s) {
  if (s === 0) return { x: 120, y: 250 };
  return { x: MAP_X0 + (s - 1) * MAP_STEP + (STAGES[s].boss ? 24 : 0), y: 288 + Math.sin((s - 1) * 0.9) * 70 + Math.sin((s - 1) * 0.31) * 12 }; // 위 메뉴(~150)와 아래 판(~445) 사이 가운데 줄을 따라 물결(1번은 정가운데에서 시작)
}
const MAP_LEN = MAP_X0 + (LAST - 1) * MAP_STEP + 420;
const zoneStart = (w) => (w === 1 ? -400 : nodePos((w - 1) * 10 + 1).x - MAP_STEP / 2);
const map = { cur: 1, x: 0, y: 0, path: [], face: 1, overlay: null, cam: 0, camV: 0, drag: null, unlock: null, zone: 1, banner: 0 };
const wOf = (s) => (s === 0 ? 1 : Math.ceil(s / 10));
const nodeOpen = (s) => (s === 0 ? endlessOpen() : s >= 1 && s <= save.unlocked);
const camFor = (x) => clamp(x - W * 0.42, 0, MAP_LEN - W);
function placeHero(s) { map.cur = s; const n = nodePos(s); map.x = n.x; map.y = n.y; map.path = []; }
function mapGo(target) {
  if (!nodeOpen(target) || map.path.length || target === map.cur || map.unlock) return;
  if (target === 0 || map.cur === 0) { map.path = [target]; sfx.swoosh(); return; }
  const d = target > map.cur ? 1 : -1;
  for (let i = map.cur + d; d > 0 ? i <= target : i >= target; i += d) map.path.push(i);
  sfx.click();
}
function updateMap(dt) {
  if (save.cleared && !map.overlay && stateT > 0.5) coachOnce('afterEnd', { text: '아멜리아 공주를 구했어요! 다음 목표는', sub: '「어려움」으로 바다마다 왕관 모으기(50개) · 끝없는 바다 최고 기록 · 펫 키우기 · 바다 패스', spot: null, pass: true, state: 'map' });
  // 지도 초보 안내: 처음엔 「달리기!」, 첫 성공 뒤 진주가 모이면 상점
  if (!map.overlay && !map.unlock && !map.path.length && stateT > 0.8) {
    if (marks.play && !save.runs) coachOnce('map', { text: '「달리기!」를 눌러 출발해요', sub: '왼쪽 = 점프 · 오른쪽 꾹 = 숙이기', spot: marks.play, spotId: 'play', pass: true, state: 'map' });
    else if (marks.shopBtn && Object.keys(save.best || {}).length && save.eggs >= 85) coachOnce('shopBtn', { text: '진주로 실력을 키워요', sub: '상점에서 「실력 키우기」 — 한 번 사면 모든 판에 계속', spot: marks.shopBtn, spotId: 'shopBtn', pass: true, state: 'map' });
  }
  // 새 바다 열리는 연출
  const u = map.unlock;
  if (u) {
    const before = u.t; u.t += dt;
    const nx = nodePos(u.s).x;
    if (u.t < 0.9) map.cam = lerp(map.cam, camFor(nx - 120), Math.min(1, dt * 4));
    if (before < 0.7 && u.t >= 0.7) { sfx.warn(); haptic(15); }
    if (before < 1.5 && u.t >= 1.5) {
      const n = nodePos(u.s);
      sfx.crack(); haptic([40, 30, 90]); shake = 14; flash = 0.35; flashColor = '#ffffff';
      burstRays(n.x - map.cam, n.y, C.yellow, 1.3, 24); fireworks(2, n.x - map.cam - 200, n.x - map.cam + 200, 90);
      for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, sp = rand(120, 520); fx.push({ k: 'spark', x: n.x - map.cam, y: n.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.8, max: 0.8, size: rand(3, 7), color: pick(['#ffd54a', '#ffffff', '#4c82ff']) }); }
      toast(`${u.s}번 바다가 열렸어요!`, C.yellow);
      if (u.s % 10 === 1) map.banner = 3;
    }
    if (u.t > 2.4) { map.unlock = null; mapGo(u.s); }
    return;
  }
  if (map.path.length) {
    const n = nodePos(map.path[0]);
    const dx = n.x - map.x, dy = n.y - map.y, d = Math.hypot(dx, dy), stepLen = 380 * dt;
    if (Math.abs(dx) > 2) map.face = dx > 0 ? 1 : -1;
    if (d <= stepLen) { map.x = n.x; map.y = n.y; map.cur = map.path.shift(); snd('tap', 0.5, 1.1); }
    else { map.x += dx / d * stepLen; map.y += dy / d * stepLen; }
    map.cam = lerp(map.cam, camFor(map.x), Math.min(1, dt * 5));
  } else if (!map.drag) {
    map.cam += map.camV * dt; map.camV *= Math.pow(0.04, dt);
    if (Math.abs(map.camV) < 5) map.camV = 0;
  }
  map.cam = clamp(map.cam, 0, MAP_LEN - W);
  const zone = clamp(Math.floor((map.cam + W / 2 - MAP_X0 + MAP_STEP / 2) / (MAP_STEP * 10)) + 1, 1, 5);
  if (zone !== map.zone) { map.zone = zone; map.banner = 2.2; sfx.swoosh(); }
  if (map.banner > 0) map.banner -= dt;
}
function mapDown(pt) { map.drag = { x0: pt.x, cam0: map.cam, moved: false, lastX: pt.x, lastT: performance.now(), v: 0 }; map.camV = 0; }
function mapMove(pt) {
  const d = map.drag; if (!d) return;
  if (Math.abs(pt.x - d.x0) > 10) d.moved = true;
  if (d.moved && !map.unlock) {
    const now2 = performance.now(), dt = Math.max(1, now2 - d.lastT) / 1000;
    d.v = lerp(d.v, -(pt.x - d.lastX) / dt, 0.5); d.lastX = pt.x; d.lastT = now2;
    map.cam = clamp(d.cam0 - (pt.x - d.x0), 0, MAP_LEN - W);
  }
}
function mapUp(pt) {
  const d = map.drag; map.drag = null; if (!d) return;
  if (d.moved) { map.camV = clamp(d.v, -3000, 3000); return; }
  const wx = pt.x + map.cam;
  for (let s = 0; s <= LAST; s++) {
    const n = nodePos(s), r = STAGES[s] && STAGES[s].boss ? 44 : 38;
    if ((wx - n.x) ** 2 + (pt.y - n.y) ** 2 < r * r && nodeOpen(s)) { if (s === map.cur && !map.path.length) mapPlay(); else mapGo(s); return; }
  }
}
function enterMap(fromClear) {
  state = 'map'; map.overlay = null; setMusic('map'); musicFever = false;
  ensureMissions(); checkStreak();
  if (!nodeOpen(map.cur)) placeHero(Math.min(save.unlocked, LAST));
  if (fromClear && fromClear < LAST && nodeOpen(fromClear + 1)) {
    placeHero(fromClear);
    map.cam = camFor(map.x);
    if (G && G.newUnlock) map.unlock = { s: fromClear + 1, t: 0 };
    else mapGo(fromClear + 1);
  } else {
    if (G && !map.path.length) { const s = G.n === ENDLESS ? 0 : G.n; if (nodeOpen(s)) placeHero(s); }
    if (!map.x) placeHero(map.cur);
    map.cam = camFor(map.x);
  }
}
function mapPlay() { if (map.path.length || map.unlock) return; openReady(map.cur === 0 ? ENDLESS : map.cur); } // 판 전 목표 카드
function mapStep(d) {
  if (map.path.length || map.unlock) return;
  const t = map.cur === 0 ? (d > 0 ? 1 : 0) : map.cur + d;
  if (t === 0 && !endlessOpen()) return;
  if (t > LAST || t < 0 || !nodeOpen(t)) { sfx.no(); return; }
  mapGo(t);
}
const ZONE_BG = [['#41c9f2', '#0d5aa6'], ['#2b3f9c', '#0a0b2e'], ['#8fdcf2', '#5a1a2e'], ['#ffb36b', '#5a1a3a'], ['#3a2a6a', '#05020c']];
function drawMapDecor(w, x, i, y0) {
  // 세계마다 다른 지도 장식 (그림 좌표 = 지도 좌표 - 카메라)
  const h = hash(i * 13.7);
  if (w === 1) {
    if (h < 0.4) { ctx.strokeStyle = h < 0.2 ? '#ff7f9e' : '#ffb36b'; ctx.lineWidth = 7; ctx.lineCap = 'round'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + k * 18, y0 - 30, x + k * 26 + Math.sin(T + i) * 3, y0 - 54 - Math.abs(k) * -8); ctx.stroke(); } }
    else if (h < 0.6) { ctx.fillStyle = '#ff9a5a'; ctx.save(); ctx.translate(x, y0 - 8); ctx.rotate(T * 0.3 + i); ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, r = k % 2 ? 6 : 15; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); ctx.restore(); }
    else { ctx.strokeStyle = '#2fb36c'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y0); for (let k = 1; k <= 5; k++) ctx.lineTo(x + Math.sin(T * 1.5 + i + k) * k * 2.5, y0 - k * 18); ctx.stroke(); }
  } else if (w === 2) {
    ctx.strokeStyle = '#2f8f8a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y0); for (let k = 1; k <= 7; k++) ctx.lineTo(x + Math.sin(T + i + k) * k * 2.5, y0 - k * 20); ctx.stroke();
    ctx.fillStyle = `rgba(120,255,230,${0.5 + 0.4 * Math.sin(T * 3 + i)})`; ctx.beginPath(); ctx.arc(x + Math.sin(T + i) * 8, y0 - 150, 4, 0, Math.PI * 2); ctx.fill();
  } else if (w === 3) {
    if (h < 0.5) { ctx.fillStyle = 'rgba(225,245,255,.85)'; ctx.beginPath(); ctx.moveTo(x - 16, y0); ctx.lineTo(x, y0 - 70 - h * 60); ctx.lineTo(x + 16, y0); ctx.fill(); }
    else { const g = ctx.createRadialGradient(x, y0, 2, x, y0, 60); g.addColorStop(0, `rgba(255,110,40,${0.6 + 0.2 * Math.sin(T * 5 + i)})`); g.addColorStop(1, 'rgba(255,110,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y0, 60, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2a1020'; ctx.beginPath(); ctx.moveTo(x - 18, y0 + 4); ctx.lineTo(x - 7, y0 - 28); ctx.lineTo(x + 7, y0 - 28); ctx.lineTo(x + 18, y0 + 4); ctx.fill(); }
  } else if (w === 4) {
    if (h < 0.35) { ctx.fillStyle = '#7a4a2a'; rr(x - 22, y0 - 26, 44, 26, 5); ctx.fill(); ctx.fillStyle = '#ffd54a'; ctx.fillRect(x - 22, y0 - 16, 44, 4); ctx.beginPath(); ctx.arc(x, y0 - 12, 4, 0, Math.PI * 2); ctx.fill(); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x - 14 + k * 14, y0 - 30 - Math.abs(Math.sin(T * 3 + k + i)) * 6, 5, 0, Math.PI * 2); ctx.fill(); } }
    else { ctx.strokeStyle = '#ff8a5a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y0); for (let k = 1; k <= 5; k++) ctx.lineTo(x + Math.sin(T * 1.5 + i + k) * k * 2.5, y0 - k * 18); ctx.stroke(); }
  } else {
    if (h < 0.5) { ctx.fillStyle = 'rgba(120,90,180,.75)'; ctx.fillRect(x - 12, y0 - 120, 24, 120); ctx.fillRect(x - 18, y0 - 128, 36, 10); }
    else { ctx.fillStyle = `rgba(190,150,255,${0.6 + 0.3 * Math.sin(T * 2 + i)})`; ctx.beginPath(); ctx.moveTo(x, y0 - 50); ctx.lineTo(x + 12, y0 - 18); ctx.lineTo(x, y0); ctx.lineTo(x - 12, y0 - 18); ctx.fill(); }
  }
}
function drawNode(s, x, y, scale = 1) {
  const st = STAGES[s], boss = !!st.boss, open = nodeOpen(s), stars = save.stars[s] || 0, cur = map.cur === s && !map.path.length;
  const r = (boss ? 36 : 28) * scale;
  if (boss) { const cs = IMG['spr_castle' + wOf(s)]; if (!drawImg(cs, x, y - r - 40 * scale, (s % 10 === 0 ? 120 : 92) * scale)) drawCastle(x, y - r - 6, 0.72, '#ff5470', wOf(s) > 1); }
  const SHELLS = ['pink', 'purple', 'blue', 'green'], shell = IMG['spr_node_shell_' + (cur ? 'gold' : SHELLS[s % 4])];
  if (shell && ready(shell)) { // 시안: 알록달록 조개 단추(코덱스), 지금 칸은 금빛, 잠긴 칸은 흐리게 + 자물쇠
    const sz = r * 2.9 * (cur ? 1.1 + Math.sin(T * 4) * 0.03 : 1);
    if (cur) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.4); g.addColorStop(0, `rgba(255,213,74,${0.45 + 0.2 * Math.sin(T * 5)})`); g.addColorStop(1, 'rgba(255,213,74,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    // 칸이 배경에서 떠 보이게(캔디크러시 지도처럼): 아래 진한 그림자 + 둘레 남색 후광
    const hg = ctx.createRadialGradient(x, y + r * 0.2, r * 0.6, x, y + r * 0.2, r * 1.75); hg.addColorStop(0, 'rgba(4,22,58,.55)'); hg.addColorStop(1, 'rgba(4,22,58,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 1.75, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(2,14,40,.5)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.95, r * 1.05, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    if (open) drawImg(shell, x, y, sz);
    else { ctx.save(); ctx.filter = 'grayscale(0.85) brightness(0.62)'; drawImg(shell, x, y, sz * 0.92); ctx.restore(); } // 잠긴 칸: 회색·어둡게·조금 작게
    if (open && x > 16 && x < W - 16) text(String(s), x, y - r * 0.08, boss ? 24 : 22, '#ffffff', { stroke: 'rgba(40,20,60,.7)', lw: 5 }); // 화면 끝에 걸린 칸은 번호 숨김
    else drawImg(IMG.spr_ui_lock, x, y + r * 0.15, r * 1.2);
    if (open) for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.55; drawStar(x + Math.cos(a) * (r + 16), y + Math.sin(a) * (r + 16) - 4, 9, k < stars); }
    if (save.crown[s]) icon('e_crown', x + r * 0.95, y - r * 0.95, 24);
    const ftN = !boss && open && typeof stageFeat === 'function' && STAGE_STYLE[s] && (STAGE_STYLE[s].wall || (STAGE_STYLE[s].sig || {}).climb >= 2) ? stageFeat(s) : null; // 벽·오르기 바다는 칸 아래 이름표
    if (ftN) { ctx.font = `700 ${fs(13)}px ${FONT}`; const w3 = ctx.measureText(ftN[0]).width + 18; if (x - w3 / 2 > 0 && x + w3 / 2 < W) { ctx.fillStyle = 'rgba(255,111,174,.92)'; rr(x - w3 / 2, y + r + 12, w3, 24, 12); ctx.fill(); text(ftN[0], x, y + r + 24, 13, '#fff', { stroke: false, weight: 700 }); } }
    if (boss && open) { const nm = (BOSS_DEF[st.boss] || {}).name || ''; ctx.font = `700 ${fs(13)}px ${FONT}`; const w2 = ctx.measureText(nm).width + 18; if (x - w2 / 2 > 0 && x + w2 / 2 < W) { ctx.fillStyle = 'rgba(240,68,82,.92)'; rr(x - w2 / 2, y + r + 12, w2, 24, 12); ctx.fill(); text(nm, x, y + r + 24, 13, '#fff', { stroke: false }); } }
    return;
  }
  const nodeImg = open ? IMG.spr_node : IMG.spr_node_lock;
  if (ready(nodeImg)) {
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.75, r * 0.95, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    if (cur) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.2); g.addColorStop(0, `rgba(255,213,74,${0.5 + 0.2 * Math.sin(T * 5)})`); g.addColorStop(1, 'rgba(255,213,74,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    drawImg(nodeImg, x, y, r * 2.5);
    if (open && stars) { ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.restore(); }
    if (open) text(String(s), x, y + 2, boss ? 24 : 21, stars ? C.blue : '#7a4a10', { stroke: '#ffffff', lw: 5 });
    if (open) for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.55; drawStar(x + Math.cos(a) * (r + 14), y + Math.sin(a) * (r + 14) + 2, 9, k < stars); }
    if (save.crown[s]) icon('e_crown', x + r * 0.95, y - r * 0.95, 24);
    if (boss && open) { const nm = (BOSS_DEF[st.boss] || {}).name || ''; ctx.font = `700 ${fs(13)}px ${FONT}`; const w2 = ctx.measureText(nm).width + 18; if (x - w2 / 2 > 0 && x + w2 / 2 < W) { ctx.fillStyle = 'rgba(240,68,82,.92)'; rr(x - w2 / 2, y + r + 10, w2, fs(13) + 8, (fs(13) + 8) / 2); ctx.fill(); text(nm, x, y + r + 14 + fs(13) / 2, 13, '#fff', { stroke: false, weight: 700 }); } }
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, r * 0.95, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  if (cur) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.2); g.addColorStop(0, `rgba(255,213,74,${0.45 + 0.2 * Math.sin(T * 5)})`); g.addColorStop(1, 'rgba(255,213,74,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  const g = ctx.createLinearGradient(x, y - r, x, y + r);
  if (!open) { g.addColorStop(0, '#6b7280'); g.addColorStop(1, '#33353b'); }
  else if (stars) { g.addColorStop(0, '#6f9bff'); g.addColorStop(1, C.deep); }
  else { g.addColorStop(0, '#ffe58a'); g.addColorStop(1, '#f2a516'); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = open ? '#ffffff' : 'rgba(255,255,255,.35)'; ctx.lineWidth = 4 * scale; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.45, r * 0.5, r * 0.22, -0.3, 0, Math.PI * 2); ctx.fill();
  if (open) text(String(s), x, y + 2, boss ? 24 : 21, '#ffffff', { stroke: 'rgba(10,22,62,.5)', lw: 4 });
  else icon('e_lock', x, y, r * 1.05);
  if (open) for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.55; drawStar(x + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12) + 2, 8, k < stars); }
  if (save.crown[s]) icon('e_crown', x + r * 0.9, y - r * 0.9, 22);
  if (boss && open) { const nm = (BOSS_DEF[st.boss] || {}).name || ''; ctx.font = `700 ${fs(13)}px ${FONT}`; const w2 = ctx.measureText(nm).width + 18; if (x - w2 / 2 > 0 && x + w2 / 2 < W) { ctx.fillStyle = 'rgba(240,68,82,.92)'; rr(x - w2 / 2, y + r + 8, w2, fs(13) + 8, (fs(13) + 8) / 2); ctx.fill(); text(nm, x, y + r + 12 + fs(13) / 2, 13, '#fff', { stroke: false, weight: 700 }); } }
}
// 지도 그림 왼쪽 끝 14%를 투명하게 풀어 둔 판(뒤집은 것도 따로) — 이음새 없애기
const featherCache = new Map();
function featherL(im, flip) {
  const key = im.src + (flip ? '|f' : ''); let c = featherCache.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d');
  if (flip) { g.translate(c.width, 0); g.scale(-1, 1); } g.drawImage(im, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0);
  const fw = c.width * 0.14, gr = g.createLinearGradient(0, 0, fw, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr; g.fillRect(0, 0, fw, c.height);
  featherCache.set(key, c); return c;
}
function drawMap() {
  ctx.save(); ctx.translate(-OX(), 0); // 지도는 화면 전체 폭
  const cam = map.cam;
  // 바다 배경: 세계마다 색, 경계는 부드럽게
  for (let w = 1; w <= 5; w++) {
    const x0 = zoneStart(w) - cam, x1 = (w < 5 ? zoneStart(w + 1) : MAP_LEN + 400) - cam;
    if (x1 < -300 || x0 > W + 300) continue;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, ZONE_BG[w - 1][0]); g.addColorStop(1, ZONE_BG[w - 1][1]);
    ctx.fillStyle = g; ctx.fillRect(Math.max(-10, x0), 0, Math.min(W + 10, x1) - Math.max(-10, x0), H);
  }
  // Codex 지도 그림: 세계마다 2장을 번갈아(두 번째 바퀴는 좌우 뒤집어) 이어 붙임
  const painted = ready(IMG.spr_map1a);
  if (painted) {
    for (let w = 1; w <= 5; w++) {
      const zs = w === 1 ? -200 : zoneStart(w), ze = w < 5 ? zoneStart(w + 1) : MAP_LEN + 400;
      if (ze - cam < -60 || zs - cam > W + 60) continue;
      const A2 = IMG['spr_mapv2_' + w + 'a'], B2 = IMG['spr_mapv2_' + w + 'b'], v2 = ready(A2); // 코덱스 시안 화풍 새 지도(오면 그것)
      const A = v2 ? A2 : IMG['spr_map' + w + 'a'], B = v2 ? (ready(B2) ? B2 : A2) : IMG['spr_map' + w + 'b'];
      if (!ready(A)) continue;
      const ph = H, pw = ph * A.naturalWidth / A.naturalHeight;
      const ov = pw * 0.14; // 이음새: 다음 그림의 왼쪽 끝을 투명하게 풀어 앞 그림 위에 겹침(띠 없이 자연스럽게) — 세계 경계도 같은 방법(세로 선 없음)
      const zc = w > 1 ? zs - ov : zs;
      ctx.save(); ctx.beginPath(); ctx.rect(zc - cam, 0, ze - zc, H); ctx.clip();
      for (let i = 0, x = zc; x < ze; x += pw - ov, i++) {
        if (x + pw - cam < 0 || x - cam > W) continue;
        const im0 = i % 2 && ready(B) ? B : A, flip = Math.floor(i / 2) % 2, im = i > 0 || w > 1 ? featherL(im0, flip) : im0;
        ctx.save(); ctx.translate(x - cam + pw / 2, H / 2); if (flip && i === 0) ctx.scale(-1, 1); ctx.drawImage(im, -pw / 2, -ph / 2, pw + 1, ph); ctx.restore();
      }
      ctx.restore();
    }
    for (let w = 2; w <= 5; w++) { // 세계 경계: 물안개로 부드럽게
      const x0 = zoneStart(w) - cam; if (x0 < -200 || x0 > W + 200) continue;
      const g = ctx.createLinearGradient(x0 - 140, 0, x0 + 140, 0); g.addColorStop(0, 'rgba(220,240,255,0)'); g.addColorStop(0.5, 'rgba(220,240,255,.22)'); g.addColorStop(1, 'rgba(220,240,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x0 - 140, 0, 280, H);
    }
    // A: 배경은 한 톤 눌러서(밝은 물 위 밝은 조개가 묻히지 않게) + 위·아래는 더 어둡게(메뉴·아래 판 글자 자리)
    ctx.fillStyle = 'rgba(6,36,84,.06)'; ctx.fillRect(0, 0, W, H); // 평면 지도는 밝고 또렷하게(살짝만)
    const vg = ctx.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, 'rgba(4,24,60,.22)'); vg.addColorStop(0.2, 'rgba(4,24,60,0)'); vg.addColorStop(0.78, 'rgba(4,24,60,0)'); vg.addColorStop(1, 'rgba(4,24,60,.25)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  // 세계 경계는 앞 세계 색이 서서히 사라지게
  for (let w = 2; w <= 5 && !painted; w++) {
    const x0 = zoneStart(w) - cam; if (x0 < -420 || x0 > W + 20) continue;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, ZONE_BG[w - 2][0]); g.addColorStop(1, ZONE_BG[w - 2][1]);
    ctx.fillStyle = g;
    for (let k = 0; k < 16; k++) { ctx.globalAlpha = 1 - (k + 0.5) / 16; ctx.fillRect(x0 + k * 25, 0, 26, H); }
    ctx.globalAlpha = 1;
  }
  // 빛줄기
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (painted ? 0 : 7); i++) { const x = ((i * 260 - cam * 0.3) % (W + 400) + W + 400) % (W + 400) - 200; const rg = ctx.createLinearGradient(0, 0, 0, H); rg.addColorStop(0, `rgba(220,250,255,${0.08 + 0.05 * Math.sin(T + i)})`); rg.addColorStop(1, 'rgba(220,250,255,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 60, 0); ctx.lineTo(x + 240, H); ctx.lineTo(x + 120, H); ctx.fill(); }
  ctx.restore();
  // 먼 바위(느리게) · 모래 바닥 · 장식 — Codex 지도 그림이 있으면 생략
  if (!painted) {
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 14) ctx.lineTo(x, 380 - vnoise((x + cam * 0.5) / 160) * 150);
  ctx.lineTo(W, H); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,200,.16)'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 12) ctx.lineTo(x, 470 - vnoise((x + cam) / 90) * 26);
  ctx.lineTo(W, H); ctx.fill();
  // 장식
  const i0 = Math.floor((cam - 200) / 120), i1 = Math.ceil((cam + W + 200) / 120);
  for (let i = i0; i <= i1; i++) { const wx = i * 120 + hash(i) * 60; drawMapDecor(clamp(Math.floor((wx - MAP_X0 + MAP_STEP / 2) / (MAP_STEP * 10)) + 1, 1, 5), wx - cam, i, 470 - vnoise(wx / 90) * 26 + 6); }
  }
  for (const b of bubbles) { ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); }
  // 길: 진주 목걸이처럼(열린 길은 반짝이는 진주, 잠긴 길은 희미한 작은 거품) — 코드로 그린 띠 대신 그림
  const pts = []; for (let s = 1; s <= LAST; s++) pts.push(nodePos(s));
  const openTo = Math.max(0, Math.min(LAST, save.unlocked - (map.unlock ? 1 : 0)) - 1);
  const unlockK = map.unlock && map.unlock.t > 1.5 ? Math.min(1, (map.unlock.t - 1.5) / 0.7) : -1;
  for (let i = 1; i < LAST; i++) {
    const a = pts[i - 1], b = pts[i]; if (Math.max(a.x, b.x) - cam < -40 || Math.min(a.x, b.x) - cam > W + 40) continue;
    const cx = a.x + (b.x - a.x) * 0.5, cy = (a.y + b.y) / 2 - 30, len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(3, Math.round(len / 24));
    const open = i <= openTo || (map.unlock && i === map.unlock.s - 1 && unlockK >= 0);
    for (let k = 1; k < n; k++) {
      const t = k / n; if (map.unlock && i === map.unlock.s - 1 && unlockK >= 0 && t > unlockK) continue;
      const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * cx + t * t * b.x - cam, y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * cy + t * t * b.y;
      if (open) { const tw = 0.88 + 0.12 * Math.sin(T * 4 + i + k); drawPearl(x, y, 20 * tw); }
      else { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // 끝없는 바다
  if (endlessOpen() && cam < 400) {
    const e = nodePos(0), ex = e.x - cam;
    for (let k = 1; k < 6; k++) { const t = k / 6; drawPearl(lerp(ex, pts[0].x - cam, t), lerp(e.y, pts[0].y, t), 11); } // 진주 길로 1번 바다와 이음
    if (!drawImg(IMG.spr_endless_portal, ex, e.y, 96, Math.sin(T * 1.5) * 0.05)) { ctx.save(); ctx.translate(ex, e.y); ctx.rotate(T * 2); for (let i = 0; i < 3; i++) { ctx.strokeStyle = ['#7cf0ff', '#b48bff', '#ffffff'][i]; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 16 + i * 9, i, i + 4.2); ctx.stroke(); } ctx.restore(); }
    if (ex > 56) text('끝없는 바다', ex, e.y + 52, 15, '#fff', { body: true }); // 화면 끝에 걸리면 이름표는 숨김
    if (save.endlessBest) text(`${save.endlessBest}미터`, ex, e.y + 74, 13, C.yellow, { body: true });
  }
  // 칸
  for (let s = 1; s <= LAST; s++) {
    const n = pts[s - 1], x = n.x - cam; if (x < -80 || x > W + 80) continue;
    let sc = 1;
    if (map.unlock && map.unlock.s === s) {
      const u = map.unlock;
      if (u.t < 1.5) { // 자물쇠가 흔들리며 빛남
        const k = Math.max(0, (u.t - 0.6) / 0.9);
        ctx.save(); ctx.translate(x, n.y); ctx.rotate(Math.sin(u.t * 40) * 0.12 * k);
        drawNode(s, 0, 0); ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, n.y, 4, x, n.y, 80); g.addColorStop(0, `rgba(255,213,74,${0.7 * k})`); g.addColorStop(1, 'rgba(255,213,74,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, n.y, 80, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        continue;
      }
      sc = 1 + Math.max(0, 0.5 - (u.t - 1.5) * 1.2) * easeOutBack(Math.min(1, (u.t - 1.5) * 3));
    }
    drawNode(s, x, n.y, sc);
  }
  for (const f of fx) if (f.k === 'spark') { const a = Math.max(0, f.life / f.max); ctx.globalAlpha = a; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.size * (0.4 + a * 0.6), 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  // 잠긴 바다: 어두운 안개 대신 칸 자체만 잠긴 모습(지도는 밝게 — 1998년 느낌 없앰)
  // 공주 (마지막 칸 옆)
  const last = nodePos(LAST), lx = last.x - cam;
  if (lx < W + 200) {
    const py = last.y - 120 + Math.sin(T * 2) * 4;
    drawImg(IMG.princess, lx + 110, py, 70, 0, 1, true);
    if (!save.cleared) { ctx.strokeStyle = 'rgba(200,240,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(lx + 110, py, 44, 0, Math.PI * 2); ctx.stroke(); text('살려줘요!', lx + 110, py - 56, 14, '#ffd1ef', { body: true }); }
  }
  // 거북이
  const walking = map.path.length > 0, hx = map.x - cam;
  if (save.pet) drawImg(IMG['pet_' + save.pet], hx - 40 * map.face, map.y - 30 + Math.sin(T * 4) * 3, 34);
  drawHero(hx, map.y - 54 + (walking ? Math.abs(Math.sin(T * 12)) * -8 : Math.sin(T * 3) * 3), 76, walking ? 0.1 : 0, { ph: T * (walking ? 18 : 6), flip: map.face < 0, stand: !walking });
  if (!walking && !map.unlock) { const ay = map.y - 118 + Math.abs(Math.sin(T * 4)) * -8; ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.moveTo(hx, ay + 14); ctx.lineTo(hx - 11, ay); ctx.lineTo(hx + 11, ay); ctx.fill(); }
  // 세계 이름 띠
  if (map.banner > 0) {
    const a = Math.min(1, map.banner / 0.4, (3 - map.banner) / 0.3), wd = WORLDS[map.zone - 1];
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    flatPill(W / 2 - 220, 92, 440, 64, 32);
    text(`세계 ${wd.id}`, W / 2, 112, 14, C.yellow, { stroke: false });
    text(wd.name, W / 2, 136, 26, '#ffffff', { stroke: false });
    ctx.restore();
  }
  // 위쪽: 알·별 상자 / 둥근 버튼
  const L = SAFE + 14, R = W - SAFE - 14;
  const NEWUI = ['spr_ui_cur_pill', 'spr_ui_ic_set', 'spr_ui_bottom_bar', 'spr_ui_play_btn'].every((k) => ready(IMG[k])); // 코덱스 지도 시안대로(그림이 다 오면)
  if (NEWUI) {
    const pill = (x, w, iconFn, val, plusFn, onTap, key) => curPill(x, 12, w, iconFn, val, plusFn, onTap, key);
    pill(L, 150, (x, y) => drawPearl(x, y, 26 * (1 + hudPulse * 1.6)), save.eggs.toLocaleString(), () => { openShop(map.cur === 0 ? ENDLESS : map.cur); shop.tab = 'gem'; }, null, 'pearl');
    pill(L + 160, 132, (x, y) => icon('e_gem', x, y, 26), String(save.gems), () => { openShop(map.cur === 0 ? ENDLESS : map.cur); shop.tab = 'gem'; }, null, 'gem');
    const cr = chestReady();
    pill(L + 302, 120, (x, y) => drawStar(x, y, 13, true), `${totalStars()}`, null, openChest);
    if (cr) { // 알림 딱지: 칸 오른쪽 위 모서리에 걸침(칸 글자는 안 가림) + 살짝 통통
      const bx = L + 302 + 120 - 8, by = 16 + Math.max(0, Math.sin(T * 6)) * -3; ctx.font = `800 ${fs(12)}px ${FONT}`; const bw = ctx.measureText('상자!').width + 14;
      ctx.fillStyle = '#ffffff'; rr(bx - bw / 2 - 2, by - 11, bw + 4, 22, 11); ctx.fill(); ctx.fillStyle = C.danger; rr(bx - bw / 2, by - 9, bw, 18, 9); ctx.fill(); text('상자!', bx, by, 12, '#fff', { stroke: false });
    }
    // 둘째 줄: 레벨·출석·왕관을 같은 높이(36)·같은 남색 알약으로, 칸 사이 8
    const chip = (x, y, w) => flatPill(x, y, w, 36, 18); // 평면 남색 알약
    chip(L, 62, 150); drawLvBadge(L, 62, true);
    if (save.streak.day) { const st2 = `출석 ${save.streak.day}일째`; ctx.font = `600 ${fs(14)}px ${FONT}`; const sw = ctx.measureText(st2).width; chip(L + 158, 62, sw + 28); text(st2, L + 172, 80, 14, C.yellow, { align: 'left', body: true, stroke: false }); }
    { // 셋째 줄: 거북 파워 + 등급(성장형) — 오르면 「+N」이 튀어오름
      const pw = turtlePower(), pt = `파워 ${pw.toLocaleString()} · ${powerRank(pw)}`; ctx.font = `600 ${fs(14)}px ${FONT}`; const pwW = ctx.measureText(pt).width + 54;
      if (save.powerSeen == null) save.powerSeen = pw;
      if (pw > save.powerSeen && !map.powerPop) { const up = powerRank(pw) !== powerRank(save.powerSeen); map.powerPop = { d: pw - save.powerSeen, t: T }; save.powerSeen = pw; persist(); snd('levelup', 0.6, 1.2); if (up) { toast(`등급 업! 이제 「${powerRank(pw)}」`, C.yellow); confettiBurst(L + 120, 124, 40); haptic([20, 30, 60]); } } // 등급이 오르면 축하
      chip(L, 106, pwW); icon('e_rocket', L + 20, 124, 20); text(pt, L + 38, 124, 14, '#ffd27a', { align: 'left', body: true, stroke: false });
      const pp = map.powerPop; if (pp) { const a = T - pp.t; if (a > 1.6) map.powerPop = null; else { ctx.globalAlpha = Math.min(1, 2 - a); text(`+${pp.d}`, L + pwW + 22, 124 - a * 18, 20, '#7dffb0', { lw: 4 }); ctx.globalAlpha = 1; } }
      if (save.cleared) { const nc = Object.keys(save.crown || {}).length, ct = `왕관 ${nc}/50`; const cx2 = L + pwW + 8; ctx.font = `600 ${fs(14)}px ${FONT}`; chip(cx2, 106, ctx.measureText(ct).width + 54); icon('e_crown', cx2 + 20, 124, 22); text(ct, cx2 + 38, 124, 14, C.yellow, { align: 'left', body: true, stroke: false }); }
    }
  } else {
  eggBadge(L + 34, 34, save.eggs, 30 * (1 + hudPulse * 1.6));
  drawLvBadge(L + 6, 62);
  gemBadge(L + 22, 118, save.gems, 22);
  const cr = chestReady();
  button(L + 130, 14, 156, 42, `별 ${totalStars()} · ${cr ? '상자 열기!' : '상자 ' + chestGoal()}`, openChest, { size: 14, kind: cr ? 'yellow' : 'soft' });
  if (save.cleared) { // 엔딩 뒤: 어려움 왕관 모으기(2회차 목표)
    const nc = Object.keys(save.crown || {}).length;
    flatPill(L + 6, 150, 150, 30, 15); icon('e_crown', L + 26, 165, 22); text(`왕관 ${nc}/50`, L + 44, 165, 14, C.yellow, { align: 'left', body: true, stroke: false });
  }
  if (save.streak.day) { // 출석 글: 바쁜 지도 위에서도 읽히게 어두운 띠 위에
    const st = `출석 ${save.streak.day}일째${save.streak.rest ? ` · 쉬는 카드 ${save.streak.rest}` : ''}${save.streak.lost ? ` · 오늘 ${3 - (save.streak.lostRuns || 0)}판 더 하면 ${save.streak.lost}일 되찾기` : ''}`;
    ctx.font = `600 ${fs(14)}px ${FONT}`; const room = R - 480 - (L + 306) - 16; // 오른쪽 둥근 단추 7개(70 간격) 앞까지
    let st2 = st; if (ctx.measureText(st2).width > room) st2 = `출석 ${save.streak.day}일째`; // 좁은 폰: 짧게
    const sw = Math.min(ctx.measureText(st2).width, room);
    flatPill(L + 294, 20, sw + 24, 30, 15);
    ctx.save(); rr(L + 294, 20, sw + 24, 30, 15); ctx.clip();
    text(st2, L + 306, 35, 14, C.yellow, { align: 'left', body: true, stroke: false }); ctx.restore();
  }
  }
  const gr = giftReady();
  const btns = [
    ['설정', () => { map.overlay = 'settings'; sfx.click(); }, null, 'gear'],
    ['상점', () => openShop(map.cur === 0 ? ENDLESS : map.cur), 'e_gem', null],
    ['도감', () => { map.overlay = 'dex'; map.dexSel = null; sfx.click(); }, 'e_dex', null],
    ['도전', () => { map.overlay = 'missions'; sfx.click(); }, 'e_target', null],
    [gr ? '선물!' : giftLeft(), openGift, 'e_gift', null],
    ['패스', () => { map.overlay = 'pass'; passPage = Math.floor(Math.max(0, passTier() - 1) / 6); sfx.click(); }, 'e_medal', null],
    ['업적', () => { map.overlay = 'ach'; sfx.click(); }, 'e_trophy', null],
  ];
  const ICON_ART = ['spr_ui_ic_set', 'spr_ui_ic_shop', 'spr_ui_ic_dex', 'spr_ui_ic_mission', 'spr_ui_ic_gift', 'spr_ui_ic_pass', 'spr_ui_ic_ach'];
  if (NEWUI) btns.forEach(([label, on], i) => { // 시안대로: 동그란 유리 아이콘(코덱스) + 아래 작은 이름
    const bx = R - 58 - i * 66, by = 5, cx = bx + 29, cy = by + 28, bob = i === 4 && gr ? Math.sin(T * 8) * 3 : 0;
    drawImg(IMG[ICON_ART[i]], cx, cy + bob, 58);
    ctx.save(); ctx.globalAlpha = 0; button(bx, by, 58, 64, '', on, {}); ctx.restore();
    if (i === 1) markSpot('shopBtn', cx, cy, 44);
    text(label, cx, by + 64, 13, "#ffffff", { lw: 3, maxW: 56 });
    const badge = i === 6 ? achReady() : i === 3 ? missionsReady() : i === 2 ? collectReady() : i === 5 ? passReady() : 0; // 도감 모으기·패스 받을 것도 빨간 점
    if (badge) { ctx.fillStyle = C.danger; ctx.beginPath(); ctx.arc(bx + 52, by + 6, 11, 0, Math.PI * 2); ctx.fill(); text(String(badge), bx + 52, by + 7, 13, '#fff', { stroke: false }); }
  });
  else btns.forEach(([label, on, ic, sym], i) => {
    const bx = R - 60 - i * 70, by = 10;
    button(bx, by, 58, 58, '', on, { kind: i === 1 ? 'primary' : i === 4 && gr ? 'yellow' : 'soft' });
    if (ic) icon(ic, bx + 29, by + 24, 30, ic === 'e_gift' && gr ? Math.sin(T * 10) * 0.2 : 0);
    if (i === 1) markSpot('shopBtn', bx + 29, by + 29, 44);
    if (sym === 'gear') { ctx.strokeStyle = C.text; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(bx + 29, by + 24, 9, 0, Math.PI * 2); ctx.stroke(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(bx + 29 + Math.cos(a) * 11, by + 24 + Math.sin(a) * 11); ctx.lineTo(bx + 29 + Math.cos(a) * 15, by + 24 + Math.sin(a) * 15); ctx.stroke(); } }
    text(label, bx + 29, by + 48, 13, C.text, { stroke: false, weight: 700 });
    if (i === 6 && achReady()) { ctx.fillStyle = C.danger; ctx.beginPath(); ctx.arc(bx + 54, by + 4, 11, 0, Math.PI * 2); ctx.fill(); text(String(achReady()), bx + 54, by + 5, 13, '#fff', { stroke: false }); }
    if (i === 3 && missionsReady()) { ctx.fillStyle = C.danger; ctx.beginPath(); ctx.arc(bx + 54, by + 4, 11, 0, Math.PI * 2); ctx.fill(); text(String(missionsReady()), bx + 54, by + 5, 13, '#fff', { stroke: false }); }
  });
  // 아래: 바다 정보 · 난이도 · 출발
  flatPill(L + 6, 446, R - L - 12, 72, 36); // 아래 판: 평면 남색 알약(유리 판 뺌), 가운데 줄 y=482
  const s = map.cur;
  const TL = L + 40, TW = R - 560 - TL; // 글자는 판의 둥근 끝 안쪽부터, 난이도 단추 앞 16에서 끊음
  const fit = (str, sz, min) => { while (sz > min) { ctx.font = `800 ${fs(sz)}px ${FONT}`; if (ctx.measureText(str).width <= TW) break; sz--; } return sz; };
  if (s === 0) {
    text('끝없는 바다', TL, 468, 21, '#ffffff', { align: 'left', stroke: 'rgba(8,30,60,.8)', lw: 5 });
    text(`최고 ${save.endlessBest}미터 · 갈수록 붐벼요`, TL, 498, 14, '#e8f6ff', { align: 'left', body: true, stroke: 'rgba(8,30,60,.75)', lw: 4 });
  } else {
    const t1 = `${s}번 바다 · ${STAGES[s].name}`;
    text(t1, TL, 468, fit(t1, 20, 14), '#ffffff', { align: 'left', stroke: 'rgba(8,30,60,.8)', lw: 5 }); // 유리 판 위에서도 또렷하게
    for (let k = 0; k < 3; k++) drawStar(TL + 9 + k * 23, 498, 9, k < (save.stars[s] || 0));
    text(save.best[s] ? `최고 ${save.best[s]}%` : '처음 도전!', TL + 80, 498, 14, '#e8f6ff', { align: 'left', body: true, stroke: 'rgba(8,30,60,.75)', lw: 4 });
  }
  DIFFS.forEach((d, i) => button(R - 538 + i * 92, 459, 78, 46, d.name, () => { save.diff = i; persist(); sfx.click(); }, { size: 15, kind: save.diff === i ? 'primary' : 'soft' }));
  // 인기 게임 「플레이」 단추처럼: 노랑→주황, 두꺼운 아래 그림자, 1.2초 맥박, 3초마다 빛줄이 지나감
  const bounce = 1 + Math.max(0, Math.sin(T * Math.PI / 0.6)) * 0.04, bx0 = R - 250, by0 = 450, bw0 = 216, bh0 = 64; // 그림 오른쪽 끝이 판 둥근 끝 안쪽(R-17)에
  ctx.save(); ctx.translate(bx0 + bw0 / 2, by0 + bh0 / 2); ctx.scale(bounce, bounce); ctx.translate(-(bx0 + bw0 / 2), -(by0 + bh0 / 2));
  const pressed = press.down && press.key === `${bx0 | 0},${by0 | 0}`;
  if (NEWUI || true) { // 평면 스티커 단추(코드): 남색 테·노랑+주황 띠·▶ + 글자 한 덩어리 가운데
    const dn = pressed ? 4 : 0; flatShape(bx0, by0, bw0, bh0, 26, '#ffd23a', '#ff9f1c', dn, UI_INK, 4);
    ctx.font = `800 ${fs(28)}px ${FONT}`; const tw = ctx.measureText('달리기!').width, gw = 26 + 10 + tw, gx = bx0 + bw0 / 2 - gw / 2, cy = by0 + bh0 / 2 + dn;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = UI_INK; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(gx + 2, cy - 13); ctx.lineTo(gx + 24, cy); ctx.lineTo(gx + 2, cy + 13); ctx.closePath(); ctx.stroke(); ctx.fill();
    text('달리기!', gx + 36, cy, 28, '#ffffff', { align: 'left', stroke: UI_INK, lw: 7 });
  } else {
  const pressed = press.down && press.key === `${bx0 | 0},${by0 | 0}`;
  ctx.fillStyle = '#b4560a'; rr(bx0, by0 + 6, bw0, bh0, 20); ctx.fill(); // 아래 그림자
  const gg = ctx.createLinearGradient(0, by0, 0, by0 + bh0); gg.addColorStop(0, '#ffd84a'); gg.addColorStop(1, '#ff8a00');
  ctx.fillStyle = gg; rr(bx0, by0 + (pressed ? 4 : 0), bw0, bh0, 20); ctx.fill();
  ctx.save(); rr(bx0, by0, bw0, bh0, 20); ctx.clip();
  const sw = ((T % 3) / 0.7) * (bw0 + 120) - 60; if (T % 3 < 0.7) { ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.moveTo(bx0 + sw, by0); ctx.lineTo(bx0 + sw + 30, by0); ctx.lineTo(bx0 + sw - 10, by0 + bh0); ctx.lineTo(bx0 + sw - 40, by0 + bh0); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(bx0 + 10, by0 + 6, bw0 - 20, 14, 7); ctx.fill();
  ctx.restore();
  text('달리기!', bx0 + bw0 / 2, by0 + bh0 / 2 + (pressed ? 6 : 2), 30, '#ffffff', { stroke: '#b4560a', lw: 6 });
  }
  ctx.save(); ctx.globalAlpha = 0; button(bx0, by0, bw0, bh0 + 6, '달리기!', mapPlay, { size: 26 }); ctx.restore();
  markSpot('play', bx0 + bw0 / 2, by0 + bh0 / 2 + 3, 0, bw0 + 16, bh0 + 22);
  ctx.restore();
  ctx.restore();
  if (map.overlay === 'missions') drawMissions();
  else if (map.overlay === 'dex') drawDex();
  else if (map.overlay === 'settings') drawSettings();
  else if (map.overlay === 'pass') drawPass();
  else if (map.overlay === 'ach') drawAch();
  if (save.unlocked >= 6 && !save.starter && !kidMode() && !map.overlay && typeof STARTER !== 'undefined') { // 조사: 스타터 팩은 튜토리얼·첫 보스 뒤 「가치를 안 다음」에, 싸게, 방해 없이(팝업 X, 배지 O)
    ctx.save(); ctx.translate(-OX(), 0); const bx = W - SAFE - 14 - 196, by = 92, sc = 1 + Math.max(0, Math.sin(T * 3)) * 0.04;
    ctx.translate(bx + 98, by + 18); ctx.scale(sc, sc); ctx.translate(-(bx + 98), -(by + 18));
    ctx.fillStyle = '#ff6fae'; rr(bx, by, 196, 36, 18); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; rr(bx, by, 196, 36, 18); ctx.stroke();
    icon('e_gift', bx + 22, by + 18, 22); text('첫 바다 꾸러미 ▶', bx + 40, by + 18, 15, '#ffffff', { align: 'left', stroke: false, weight: 800 });
    ctx.save(); ctx.globalAlpha = 0; button(bx, by, 196, 36, '', () => { openShop(map.cur === 0 ? ENDLESS : map.cur); shop.tab = 'gem'; }, {}); ctx.restore();
    ctx.restore();
  }
  if (save.unlocked >= 3 && !map.overlay) { ctx.save(); ctx.translate(-OX(), 0); gachaBtn(W - SAFE - 14 - 196, 92 + (save.unlocked >= 6 && !save.starter && !kidMode() ? 46 : 0), 196, 38, () => { openShop(map.cur === 0 ? ENDLESS : map.cur); shop.tab = 'gacha'; }); ctx.restore(); } // 첫 바다 몇 판으로 재미를 안 뒤에(조사: 가치 먼저) — 공짜 조개가 있으면 빨간 점
  if (!boxShow && save.giftQ && save.giftQ.length && !map.overlay && !map.unlock && !map.path.length && stateT > 0.8 && typeof coach !== 'undefined' && !coach) openFirstGift();
  if (!boxShow && !gacha.rv && gsave().relicQ.length && !map.overlay && !map.path.length && stateT > 0.8 && typeof coach !== 'undefined' && !coach) openRelicQ(); // 보스 유물을 주웠으면 지도에서 신화 연출
  if (boxShow) drawBoxShow(); // 상자 열기 연출은 맨 위
}
function overlayBase(x, y, w, h, title, ic) {
  ctx.fillStyle = 'rgba(10,22,62,.7)'; ctx.fillRect(-OX(), 0, W, H);
  buttons.length = 0;
  buttons.push({ x: 0, y: 0, w: W, h: H, on: () => { map.overlay = null; } });
  buttons.push({ x: x + OX(), y, w, h, on: () => {} }); // 판 안 빈 곳을 눌러도 닫히지 않게(바깥만 닫힘)
  panel(x, y, w, h, { fill: C.gray });
  if (!ribbon(x + w / 2, y + 4, Math.min(w * 0.72, 340), title, 22)) { if (ic) icon(ic, x + 44, y + 38, 34); text(title, x + w / 2, y + 38, 26, C.text, { stroke: false }); } // 시안: 판 위에 걸친 파란 리본
  roundBtn('close', x + w - 12, y + 12, 22, () => { map.overlay = null; sfx.click(); }, '닫기'); // 오른쪽 위 동그란 ✕
}
function drawMissions() {
  overlayBase(200, 70, 560, 400, '오늘의 도전', 'e_target');
  save.missions.forEach((m, i) => withRise(i, () => {
    const y = 120 + i * 90;
    panel(226, y, 508, 76, { fill: C.sel });
    text(missionText(m), 248, y + 24, 18, C.text, { align: 'left', body: true, stroke: false });
    ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(248, y + 46, 250, 12, 6); ctx.fill();
    ctx.fillStyle = m.done ? C.ok : C.blueD; rr(248, y + 46, Math.max(12, 250 * m.prog / m.goal), 12, 6); ctx.fill();
    text(`${m.prog}/${m.goal}`, 508, y + 52, 13, C.sub, { align: 'left', body: true, stroke: false });
    if (m.done) button(598, y + 16, 120, 44, `받기 +${m.reward}`, () => claimMission(i), { size: 16, kind: 'ok' });
    else { drawPearl(636, y + 38, 24); text(`+${m.reward}`, 652, y + 39, 18, C.yellow, { align: 'left', stroke: false }); }
  }));
  text('도전을 이루면 바로 새 도전이 와요', 480, 436, 14, C.sub, { body: true, stroke: false }); // 닫기는 오른쪽 위 ✕ 하나로
}
// 도감 모으기 목표(꾸미기·수집형 동기): 단계마다 보석 — 다 모으면 보석 330(보석 옷 한 벌 조금 넘게: 무과금도 언젠가, 과금은 「빨리」)
const COLLECT = [
  { k: 'mon', name: '몬스터', ic: 'e_dex', have: () => ENEMY_KEYS.filter((k) => save.dex[k]).length, all: () => ENEMY_KEYS.length, goals: [5, 10, 13], gems: [10, 20, 40] },
  { k: 'skin', name: '옷', ic: 'e_sparkles', have: () => save.skins.length, all: () => SKINS.length, goals: [4, 8, 14], gems: [15, 30, 60] },
  { k: 'pet', name: '펫', ic: 'e_party', have: () => save.pets.length, all: () => PETS.length, goals: [3, 6, 9], gems: [15, 30, 50] },
  { k: 'trail', name: '꼬리', ic: 'e_fire', have: () => (save.trails || ['none']).length - 1, all: () => TRAILS.length - 1, goals: [2, 4, 6], gems: [10, 20, 30] },
];
const collectNext = (c) => { const got = (save.colRw || {})[c.k] || 0; return got < c.goals.length ? got : -1; };
const collectReady = () => COLLECT.filter((c) => { const i = collectNext(c); return i >= 0 && c.have() >= c.goals[i]; }).length;
function claimCollect(c) { const i = collectNext(c); if (i < 0 || c.have() < c.goals[i]) return; save.colRw = save.colRw || {}; save.colRw[c.k] = i + 1; save.gems += c.gems[i]; persist(); sfx.mission(); popDots(mouse.x, mouse.y); confettiBurst(mouse.x, mouse.y - 10, 30); toast(`${c.name} ${c.goals[i]}개 모음! 보석 +${c.gems[i]}`, '#7cd8ff'); }
const dexMet = (c) => c.stage === 0 || (save.unlocked || 1) >= c.stage; // 인물: 그 바다까지 가 봤으면 보임
function dexTap(x, y, w, h, on) { buttons.push({ x: x + OX(), y, w, h, on }); }
function drawDex() {
  overlayBase(60, 50, 840, 460, '바다 도감', 'e_dex');
  const tab = map.dexTab || 'sea';
  [['sea', `바다 친구 ${ENEMY_KEYS.filter((k) => save.dex[k]).length}/${ENEMY_KEYS.length}`], ['who', `인물·보스 ${DEX_CHARS.filter(dexMet).length}/${DEX_CHARS.length}`]].forEach(([id, label], i) => { // 위 탭 두 개
    const x = 84 + i * 168, on = tab === id;
    flatPill(x, 74, 156, 32, 16, on ? C.yellow : 'rgba(255,255,255,.12)');
    text(label, x + 78, 91, 14, on ? '#3a2a00' : C.text, { stroke: false, maxW: 140 });
    dexTap(x, 70, 156, 40, () => { map.dexTab = id; map.dexSel = null; sfx.tap(); });
  });
  text('눌러서 자세히', 876, 92, 12, C.mute, { align: 'right', body: true, stroke: false });
  if (tab === 'who') drawDexWho(); else drawDexSea();
  if (map.dexSel) drawDexDetail(map.dexSel);
}
function drawDexSea() {
  COLLECT.forEach((c, i) => { // 아래 줄: 모으기 목표 4칸
    const x = 84 + i * 200, y = 446, w = 190, n = collectNext(c), have = c.have(), goal = n >= 0 ? c.goals[n] : c.all(), ready = n >= 0 && have >= goal;
    ctx.fillStyle = ready ? 'rgba(255,213,74,.16)' : 'rgba(255,255,255,.08)'; rr(x, y, w, 50, 14); ctx.fill(); ctx.strokeStyle = ready ? C.yellow : 'rgba(255,255,255,.16)'; ctx.lineWidth = ready ? 2.5 : 1.5; rr(x, y, w, 50, 14); ctx.stroke();
    text(`${c.name} ${Math.min(have, n >= 0 ? goal : c.all())}/${n >= 0 ? goal : c.all()}`, x + 12, y + 16, 14, C.text, { align: 'left', stroke: false });
    ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(x + 12, y + 32, 96, 8, 4); ctx.fill(); ctx.fillStyle = n < 0 ? C.ok : C.yellow; rr(x + 12, y + 32, Math.max(8, 96 * Math.min(1, have / goal)), 8, 4); ctx.fill();
    if (n < 0) text('다 모음 ✓', x + w - 12, y + 25, 13, C.ok, { align: 'right', stroke: false });
    else if (ready) button(x + w - 74, y + 9, 64, 32, `받기 ${c.gems[n]}`, () => claimCollect(c), { size: 13, kind: 'ok' });
    else { icon('e_gem', x + w - 52, y + 25, 18); text(`${c.gems[n]}`, x + w - 40, y + 26, 13, '#9fe3ff', { align: 'left', stroke: false }); }
  });
  ENEMY_KEYS.forEach((k, i) => withRise(i, () => { // 13마리 → 5칸 × 3줄
    const col = i % 5, row = Math.floor(i / 5), x = 74 + col * 164, y = 116 + row * 106, cw = 156, ch = 98, info = ENEMIES[k], d = save.dex[k];
    const sel = map.dexSel && map.dexSel.k === k;
    panel(x, y, cw, ch, { fill: sel ? 'rgba(255,213,74,.22)' : C.sel, r: 16 });
    dexTap(x, y, cw, ch, () => { map.dexSel = { kind: 'sea', k, t: T }; sfx.tap(); haptic(8); });
    ctx.save(); ctx.beginPath(); rr(x, y, 60, ch, 16); ctx.clip();
    if (d) drawEnemy({ type: k, x: x + 32, y: y + 48, r: k === 'puffer' ? 15 : k === 'eel' ? 9 : 16, t: T, ph: 0, len: 36, baseY: y + 48, top: false, armed: false }, x + 200, y + 48);
    else text('?', x + 32, y + 48, 36, C.mute, { stroke: false });
    ctx.restore();
    ctx.save(); rr(x, y, cw, ch, 16); ctx.clip();
    const tx = x + 64;
    if (d) {
      text(info.name, tx, y + 24, 14, C.text, { align: 'left', stroke: false, maxW: 86 });
      ctx.font = `600 ${fs(13)}px ${FONT}`; const lw = ctx.measureText(tr('약점')).width;
      text('약점', tx, y + 62, 13, C.mute, { align: 'left', body: true, stroke: false });
      drawItemIcon(info.weak, tx + lw + 16, y + 62, 22);
      if (fs(13) <= 16) text(ITEMS[info.weak].name, tx + lw + 30, y + 62, 13, d.weak ? C.yellow : C.sub, { align: 'left', body: true, stroke: false, maxW: cw - (lw + 96) });
    } else text(`${info.intro}번 바다`, tx, y + 48, 13, C.mute, { align: 'left', body: true, stroke: false });
    ctx.restore();
  }));
}
function drawDexWho() {
  DEX_CHARS.forEach((c, i) => withRise(i, () => { // 10명 → 5칸 × 2줄(큰 그림)
    const col = i % 5, row = Math.floor(i / 5), x = 74 + col * 164, y = 116 + row * 192, cw = 156, ch = 182, met = dexMet(c);
    panel(x, y, cw, ch, { fill: c.boss || c.k === 'king' ? 'rgba(255,90,120,.14)' : 'rgba(120,220,255,.14)', r: 18 });
    dexTap(x, y, cw, ch, () => { map.dexSel = { kind: 'who', k: c.k, t: T }; sfx.tap(); haptic(8); });
    const bob = Math.sin(T * 2.4 + i) * 3;
    if (met) drawImg(IMG[c.img], x + cw / 2, y + 74 + bob, 112); else drawImg(silhouette(c.img, '#2a3a6e'), x + cw / 2, y + 74, 112, 0, 0.9);
    if (!met) text('?', x + cw / 2, y + 74, 40, C.mute, { stroke: false });
    flatPill(x + 14, y + 136, cw - 28, 22, 11, c.boss || c.k === 'king' ? '#ff5a78' : C.blue);
    text(c.role, x + cw / 2, y + 147, 12, '#fff', { stroke: false, maxW: cw - 36 });
    text(met ? c.name : `${c.stage}번 바다`, x + cw / 2, y + 170, 15, met ? C.text : C.mute, { stroke: false, maxW: cw - 12 });
  }));
}
function drawDexDetail(sel) {
  const isSea = sel.kind === 'sea', c = isSea ? null : DEX_CHARS.find((q) => q.k === sel.k);
  const info = isSea ? ENEMIES[sel.k] : c, d = isSea ? save.dex[sel.k] : null, met = isSea ? !!d : dexMet(c);
  const p = easeOutBack(Math.min(1, (T - sel.t) / 0.28));
  ctx.fillStyle = 'rgba(10,22,62,.6)'; ctx.fillRect(-OX(), 0, W, H);
  dexTap(-OX(), 0, W, H, () => { map.dexSel = null; sfx.click(); }); // 아무 데나 누르면 닫힘
  ctx.save(); ctx.translate(480, 280); ctx.scale(0.6 + 0.4 * p, 0.6 + 0.4 * p); ctx.translate(-480, -280);
  panel(150, 96, 660, 368, { fill: C.gray, r: 26 });
  const lx = 300, ly = 270; // 왼쪽: 큰 그림
  ctx.fillStyle = isSea ? 'rgba(120,220,255,.16)' : c.boss || c.k === 'king' ? 'rgba(255,90,120,.18)' : 'rgba(120,220,255,.16)'; ctx.beginPath(); ctx.arc(lx, ly, 118, 0, Math.PI * 2); ctx.fill();
  const bob = Math.sin(T * 2.2) * 5;
  if (!met) { text('?', lx, ly, 90, C.mute, { stroke: false }); }
  else if (isSea) { if (!drawImg(IMG['spr_' + sel.k], lx, ly + bob, 150)) { ctx.save(); ctx.translate(lx, ly); ctx.scale(3, 3); ctx.translate(-lx, -ly); drawEnemy({ type: sel.k, x: lx, y: ly, r: 16, t: T, ph: 0, len: 36, baseY: ly, top: false, armed: false }, lx + 200, ly); ctx.restore(); } }
  else drawImg(IMG[c.img], lx, ly + bob, 210);
  const tx = 450, tw = 330; // 오른쪽: 이름 · 설명 · 특징
  if (!isSea) { flatPill(tx, 122, 120, 26, 13, c.boss || c.k === 'king' ? '#ff5a78' : C.blue); text(c.role, tx + 60, 135, 13, '#fff', { stroke: false, maxW: 108 }); }
  text(met ? info.name : '아직 못 만났어요', tx, isSea ? 140 : 176, 30, C.text, { align: 'left', stroke: false, maxW: tw });
  let y = isSea ? 186 : 218;
  const desc = met ? (isSea ? DEX_DESC[sel.k] : c.desc) : `${isSea ? info.intro : c.stage}번 바다까지 가면 만날 수 있어요!`;
  wrapText(desc || '', tw, 16).slice(0, 5).forEach((ln) => { text(ln, tx, y, 16, C.sub, { align: 'left', body: true, stroke: false }); y += 25; });
  if (met) {
    y += 10;
    const row = (label, val, col = C.text) => { text(label, tx, y, 14, C.mute, { align: 'left', body: true, stroke: false }); text(val, tx + 96, y, 15, col, { align: 'left', stroke: false, maxW: tw - 96 }); y += 30; };
    row('특징', isSea ? info.trait : c.trait);
    if (isSea) {
      text('약점', tx, y, 14, C.mute, { align: 'left', body: true, stroke: false }); drawItemIcon(info.weak, tx + 110, y, 26); text(ITEMS[info.weak].name, tx + 130, y, 15, C.yellow, { align: 'left', stroke: false, maxW: tw - 130 }); y += 30;
      row('처음 만남', `${info.intro}번 바다`);
      row('물리친 수', `${d.kills || 0}마리`, C.ok);
    } else if (c.stage) row('만나는 곳', `${c.stage}번 바다`);
  }
  ctx.restore();
  roundBtn('close', 800, 106, 22, () => { map.dexSel = null; sfx.click(); }, '닫기');
}
function drawIosGuide() {
  buttons.length = 0;
  ctx.fillStyle = 'rgba(10,22,62,.88)'; ctx.fillRect(-OX(), 0, W, H);
  panel(170, 40, 620, 400, { fill: C.gray });
  text('아이폰은 꽉 찬 화면으로 하려면', 480, 84, 26, C.text, { stroke: false });
  const steps = [['1', '사파리 아래(또는 위) 공유 버튼', 'share'], ['2', '「홈 화면에 추가」 누르기', 'plus'], ['3', '바탕화면 「터틀런」 아이콘으로 실행', 'icon']];
  steps.forEach(([n, s, ic], i) => withRise(i, () => {
    const y = 140 + i * 82;
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(230, y + 20, 20, 0, Math.PI * 2); ctx.fill();
    text(n, 230, y + 21, 18, '#fff', { stroke: false });
    ctx.strokeStyle = C.text; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (ic === 'share') { rr(282, y + 10, 26, 26, 5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(295, y + 22); ctx.lineTo(295, y - 2); ctx.moveTo(287, y + 6); ctx.lineTo(295, y - 2); ctx.lineTo(303, y + 6); ctx.stroke(); }
    else if (ic === 'plus') { rr(280, y + 4, 30, 30, 8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(295, y + 11); ctx.lineTo(295, y + 27); ctx.moveTo(287, y + 19); ctx.lineTo(303, y + 19); ctx.stroke(); }
    else drawImg(IMG.hello, 295, y + 20, 40);
    text(s, 330, y + 20, 19, C.text, { align: 'left', body: true, stroke: false });
  }));
  text('주소창 없이 앱처럼 꽉 차게 열려요', 480, 392, 15, C.sub, { body: true, stroke: false });
  button(330, 404, 300, 48, '알겠어요, 지금은 그냥 할게요', () => { iosGuide = false; startGame(); }, { size: 15 });
  const ay = H - 30 + Math.sin(T * 6) * 6; ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.moveTo(480, ay + 22); ctx.lineTo(462, ay); ctx.lineTo(498, ay); ctx.fill();
}
function goFullscreen() {
  const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (rq) {
    Promise.resolve(rq.call(el)).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* 지원 안 함 */ } }).catch(() => toast('이 브라우저는 꽉 찬 화면을 못 써요'));
  } else toast('아이폰은 공유 → 「홈 화면에 추가」로 꽉 차게 볼 수 있어요', C.blueD);
}
// 확률 정보(게임산업법 확률형 아이템 정보공개): 진주는 보석으로도 바꿀 수 있어 펫 부화는 「간접 유료」 → 확률을 모두 적음
let probOpen = false;
function drawProbInfo() {
  if (!probOpen) return false;
  if (probOpen === 'gacha') return drawGachaProb();
  buttons.length = 0; buttons.push({ x: 0, y: 0, w: W, h: H, on: () => {} });
  ctx.save(); ctx.translate(OX(), 0);
  ctx.fillStyle = 'rgba(8,8,12,.88)'; ctx.fillRect(-OX(), 0, W, H);
  panel(120, 44, 720, 470, { fill: C.gray });
  if (!ribbon(480, 48, 340, '확률 정보', 22)) text('확률 정보', 480, 78, 24, C.text, { stroke: false }); // 다른 창과 같은 리본
  const left = PETS.filter((p) => !save.pets.includes(p.k)), pc = left.length ? +(100 / left.length).toFixed(2) : 0;
  // 칸마다 카드 한 장: 왼쪽 제목(폭 132) · 오른쪽 짧은 줄들, 카드 안 위아래 14 · 카드 사이 10 · 줄 간격 1.45
  const rows = [
    ['펫 알 부화', C.yellow, [`진주 ${hatchCost()}개 · 진주는 보석으로도 바꿀 수 있어 유료 확률 상품이에요`, left.length ? `아직 없는 펫 ${left.length}마리 중 하나 · 모두 ${pc}% · 가진 펫은 안 나와요` : '펫을 다 모았어요']],
    ['선물 상자', '#9fe3ff', ['무료 · 3시간마다 · 진주 20~60개 중 하나(각 약 2.4%)']],
    ['? 상자(판 중)', '#9fe3ff', ['무료 · 아이템 40% / 진주 60%(황금 +5 30% · +3 70%)', '아이템은 그 바다에서 나오는 것끼리 같은 확률']],
    ['신비한 조개', '#ff8ad8', ['보석으로 여는 뽑기 · 항목별 확률·천장은 상점 「신비한 조개 › 확률 정보」', '보스 유물: 보스를 이기면 5%']],
    ['확률 없는 것', 'rgba(255,255,255,.7)', ['별 상자 · 보석 · 옷 · 보물 · 꼬리 · 패스 · 조각으로 받기']],
  ];
  const lh = fs(13) * 1.45, X = 150, CW = 660, TW = 132;
  const hs = rows.map(([, , ls]) => 28 + ls.length * lh);
  let y = 106 + (380 - (hs.reduce((a, b2) => a + b2, 0) + 10 * (rows.length - 1))) / 2;
  rows.forEach(([t, col, ls], i) => {
    const h = hs[i];
    ctx.fillStyle = 'rgba(255,255,255,.06)'; rr(X, y, CW, h, 12); ctx.fill();
    ctx.fillStyle = col; rr(X, y, 4, h, 2); ctx.fill();
    text(t, X + 20, y + h / 2, 15, col, { align: 'left', stroke: false });
    ls.forEach((l, j) => text(l, X + TW + 20, y + 14 + lh * (j + 0.5), 13, 'rgba(255,255,255,.88)', { align: 'left', body: true, stroke: false }));
    y += h + 10;
  });
  roundBtn('close', 828, 56, 22, () => { probOpen = false; sfx.click(); }, '닫기');
  ctx.restore();
  return true;
}
// 기록 지우기(구글 플레이·애플 개인정보: 앱 안에서 데이터를 지울 수 있게) — 두 번 눌러야 지움
let wipeAsk = 0;
function askWipe() {
  if (Date.now() - wipeAsk > 4000) { wipeAsk = Date.now(); sfx.no(); toast('정말 지울까요? 4초 안에 한 번 더 누르면 모든 기록이 지워져요', C.danger); return; }
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('turtle-race') || k === 'lab.keep') localStorage.removeItem(k); } catch (e) { /* 무시 */ } // 이 게임 기록만(앱 로그인 turtle.session 은 그대로)
  location.reload();
}
function drawSettings() {
  const X = 250, Wd = 460, L0 = X + 32, R0 = X + Wd - 32, cw = (R0 - L0 - 16) / 3; // 3칸 격자, 칸 사이 8
  overlayBase(X, 40, Wd, 470, '설정', null);
  const rows = [
    ['조작', save.ctrl !== 'swim', () => { save.ctrl = save.ctrl === 'swim' ? 'run' : 'swim'; persist(); sfx.click(); }, ['점프 달리기', '자유 헤엄']],
    ['배경 음악', !save.musicOff, () => { save.musicOff = !save.musicOff; persist(); initAudio(); }],
    ['효과음', !save.sfxOff, () => { save.sfxOff = !save.sfxOff; persist(); initAudio(); sfx.tap(); }],
    ['진동 · 흔들림', save.haptics && !save.noShake, () => { const on = save.haptics && !save.noShake; save.haptics = !on; save.noShake = on; persist(); haptic(30); }],
  ];
  rows.forEach(([label, on, fn, names], i) => withRise(i, () => {
    const y = 88 + i * 50;
    text(label, L0, y + 21, 18, C.text, { align: 'left', stroke: false });
    const bw = names ? 160 : 120; // 켜짐 = 초록, 꺼짐 = 회색(상태가 한눈에)
    button(R0 - bw, y, bw, 42, names ? names[on ? 0 : 1] : on ? '켜짐' : '꺼짐', fn, { size: 15, kind: names ? 'primary' : on ? 'ok' : 'soft' });
  }));
  text('나이', L0, 88 + 4 * 50 + 21, 18, C.text, { align: 'left', stroke: false });
  button(R0 - 128, 88 + 4 * 50, 128, 42, isEN ? 'English' : '한국어', () => { sfx.click(); setLang(isEN ? 'ko' : 'en'); }, { size: 15, kind: 'primary' }); // 언어: 누르면 바뀌고 다시 켜짐(글자는 그 언어 그대로 보이게 사전에 안 넣음) // 바꾸려면 보호자 확인(아이가 혼자 어린이 모드를 끄지 못하게)
  button(R0 - 128 - 10 - 176, 88 + 4 * 50, 176, 42, save.age == null ? '고르기' : kidMode() ? `${save.age}살 · 어린이 모드` : '13살 이상', () => withGate(() => { map.overlay = null; state = 'age'; stateT = 0; ageBack = 'map'; }), { size: 14, kind: kidMode() ? 'ok' : 'soft' });
  const grid = [
    [['꽉 찬 화면', () => { if (IS_IOS) { map.overlay = null; state = 'title'; iosGuide = true; } else goFullscreen(); }], ['확률 정보', () => { probOpen = true; sfx.click(); }], ['기록 지우기', askWipe]],
    [['저장하기', exportSave], ['불러오기', importSave], ['처음 화면', () => { map.overlay = null; state = 'title'; sfx.click(); }]], // 지도 → 처음 화면(게임 끄기도 거기)
  ];
  grid.forEach((row, r) => { const w2 = (R0 - L0 - 8 * (row.length - 1)) / row.length; row.forEach((c, k) => button(L0 + k * (w2 + 8), 346 + r * 48, w2, 40, c[0], c[1], { size: 14, kind: 'soft' })); }); // 줄마다 판 폭을 꽉 채워 나눔
  [['이용약관', 'terms'], ['개인정보', 'privacy'], ['만든 사람', 'credits']].forEach(([lb, f], k) => button(L0 + k * (cw + 8), 448, cw, 34, lb, () => withGate(() => { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ t: 'legal', doc: f })); else window.open(`legal/${f}.html`, '_blank'); }), { size: 13, kind: 'soft' })); // 판 아래 끝과 28 띄움
}

// ───────── 첫 이야기: 공주 납치 ─────────
const INTRO = [
  { who: 'princess', text: '오늘은 바다 축제 날이에요! 다 같이 신나게 놀아요~' },
  { who: 'hero', text: '아멜리아 공주님! 오늘 바다 축제 달리기에서 꼭 1등 할게요!' },
  { who: 'shark', text: '크하하하! 축제는 끝났다!!', ev: 'sharkIn' },
  { who: 'shark', text: '아멜리아 공주는 깊은 바다 끝 내 성으로 데려간다! 느림보 거북이가 따라올 수 있을까?', ev: 'grab' },
  { who: 'princess', text: '꺄악! 터틀아, 살려줘요!!', ev: 'leave' },
  { who: null, text: '', ev: 'kidnap' }, // 큰 알림: 아멜리아 공주가 납치되었어요!
  { who: 'hero', text: '아멜리아 공주님!!! 느려도 괜찮아... 절대 포기 안 해! 다섯 바다를 건너서라도 꼭 구하러 갈게요!', ev: 'resolve' },
  { who: null, text: '', ev: 'title' },
];
const WHO = { princess: '아멜리아 공주', hero: '터틀이', shark: '상어왕' };
const cut = { i: 0, t: 0, shown: 0 };
function startIntro() { state = 'intro'; cut.i = 0; cut.t = 0; cut.shown = 0; setMusic('title'); map.overlay = null; }
function introStep(s) {
  if (s.ev === 'sharkIn') { shake = 24; flash = 0.6; flashColor = '#ff3355'; sfx.roar(); haptic([60, 40, 120]); setMusic('boss'); }
  if (s.ev === 'grab') { sfx.bubble(); shake = 8; }
  if (s.ev === 'leave') { snd('swoosh', 1, 0.7); }
  if (s.ev === 'kidnap') { shake = 18; flash = 0.5; flashColor = '#ff3355'; sfx.warn(); snd('react', 0.9, 0.7); haptic([80, 40, 80]); }
  if (s.ev === 'resolve') { setMusic('w1'); sfx.boost(); flash = 0.3; flashColor = '#b48bff'; }
  if (s.ev === 'title') { sfx.clear(); confetti(40); }
}
function introAdvance() {
  const s = INTRO[cut.i];
  if (s.text && cut.shown < s.text.length) { cut.shown = s.text.length; return; }
  cut.i++; cut.t = 0; cut.shown = 0;
  if (cut.i >= INTRO.length) { endIntro(); return; }
  introStep(INTRO[cut.i]);
}
function endIntro() { const first = !save.introSeen && !save.runs; save.introSeen = true; persist(); placeHero(Math.min(save.unlocked, LAST)); if (first) { startLevel(1); return; } enterMap(); } // 처음엔 이야기 → 바로 달리기(히트작 공통: 첫 탭부터 몇 초 안에 달림)
function updateIntro(dt) {
  cut.t += dt;
  const s = INTRO[cut.i];
  const before = Math.floor(cut.shown);
  cut.shown = Math.min(s.text.length, cut.shown + dt * 24);
  if (s.text && Math.floor(cut.shown) > before && Math.floor(cut.shown) % 2 === 0) sfx.blip(s.who);
  if (s.ev === 'title') { if (cut.t > 3.4) endIntro(); }
  else if (s.ev === 'kidnap') { if (cut.t > 3.2) introAdvance(); }
  else if (cut.shown >= s.text.length && cut.t > s.text.length / 24 + 2.2) introAdvance();
}
function drawIntro() {
  const i = cut.i, t = cut.t;
  drawPalace(640, SEABED + 4, 1);
  if (i < 2) {
    for (let k = 0; k < 14; k++) {
      const x = 40 + k * 66, y = 40 + Math.sin(k * 1.3) * 10;
      ctx.fillStyle = ['#ffd34d', '#ff6fa8', '#7cf0ff', '#8dff7a'][k % 4];
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(T * 6 + k); ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // 아멜리아(코덱스 표정 3가지)와 상어왕: 축제 → 등장 → 거품에 갇힘 → 끌려감
  const pImg = (k) => { const im = IMG['spr_amelia' + (k ? '_' + k : '')]; return im && ready(im) ? im : IMG.princess; };
  const ev = INTRO[i].ev, idx = (e) => INTRO.findIndex((x) => x.ev === e), iIn = idx('sharkIn'), iGrab = idx('grab'), iLeave = idx('leave');
  let sx = 960 + 320, sy = 175, px = 620, py = 300, cageK = 0, pose = '', shakeP = 0;
  if (i < iIn) { pose = i === 0 ? '' : 'cheer'; py = 300 - (i === 1 ? Math.abs(Math.sin(T * 5)) * 16 : 0); }
  if (i >= iIn) { pose = 'scared'; shakeP = 2; sx = i === iIn ? lerp(960 + 320, 790, easeOutBack(Math.min(1, t / 0.7))) : 790; }
  if (i === iIn) { ctx.fillStyle = `rgba(40,0,20,${Math.min(0.35, t * 0.6)})`; ctx.fillRect(-OX(), 0, W, H); } // 등장: 어두워짐
  if (i >= iGrab) { cageK = i === iGrab ? easeOutBack(Math.min(1, t / 0.5)) : 1; const k = i === iGrab ? Math.min(1, t / 0.8) : 1; px = lerp(620, 670, k); py = lerp(300, 250, k); }
  if (i >= iLeave) { const k = i === iLeave ? Math.max(0, t - 0.35) : 9; sx = 790 + k * 620; sy = 175 - k * 90; px = sx - 150; py = sy + 90 + Math.sin(T * 6) * 8; }
  if (i > iLeave) { sx = 2000; px = 2000; }
  const bob = Math.sin(T * 3) * 5, jx = shakeP ? rand(-shakeP, shakeP) : 0;
  if (i < iIn) for (let k = 0; k < 5; k++) { const h = ((T * 0.6 + k * 0.2) % 1); ctx.globalAlpha = 1 - h; text('♥', px + 60 + Math.sin(T * 2 + k) * 14 - k * 22, py - 70 - h * 90, 18 + k * 2, '#ff8fc8', { stroke: false }); } // 하트가 떠오름
  ctx.globalAlpha = 1;
  if (i >= iLeave && i === iLeave && sx < 1400) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(sx + 10, sy + 40); ctx.quadraticCurveTo((sx + px) / 2, sy + 140, px + 60, py - 40); ctx.stroke(); ctx.setLineDash([]); // 거품을 끄는 줄
    for (let k = 0; k < 6; k++) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(px - 120 - k * 40 - ((T * 600) % 40), py - 40 + k * 16, 60, 2); } } // 물살 줄
  if (px < 960 + 160) {
    if (!cageK) { const gl = ctx.createRadialGradient(px, py + bob, 10, px, py + bob, 110); gl.addColorStop(0, 'rgba(255,255,255,.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(px, py + bob, 110, 0, Math.PI * 2); ctx.fill(); } // 분홍 궁전 앞에서도 또렷하게: 뒤에 흰 빛
    drawImg(pImg(pose), px + jx, py + bob, cageK ? 160 : 185, cageK ? Math.sin(T * 8) * 0.08 : 0, 1, true);
    if (pose === 'scared' && Math.sin(T * 5) > 0.3) { ctx.fillStyle = 'rgba(160,220,255,.9)'; ctx.beginPath(); ctx.ellipse(px + 30, py - 20 + ((T * 80) % 30), 4, 6, 0, 0, Math.PI * 2); ctx.fill(); } // 눈물
    if (cageK > 0.02 && !drawImg(IMG.spr_bubble_cage, px, py, (200 + Math.sin(T * 4) * 4) * cageK, 0, 0.55)) { /* 거품은 반투명: 안에 갇힌 공주가 보이게 */ ctx.strokeStyle = 'rgba(200,240,255,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px, py, 88 * cageK, 0, Math.PI * 2); ctx.stroke(); }
  }
  if (i >= iIn && sx < 960 + 260 && !drawImg(IMG.spr_boss_king, sx + 60, sy + Math.sin(T * 3) * 6, 200, Math.sin(T * 8) * 0.05)) drawShark(sx, 250, 2.7, '#8a6bd6', '#3f2a7a', true, false, true, Math.sin(T * 8) * 0.28, 0.6);
  if (ev === 'kidnap') { // 큰 알림: 아멜리아 공주가 납치되었어요!
    const a = Math.min(1, t / 0.3), z = 0.6 + 0.4 * easeOutBack(Math.min(1, t / 0.5));
    ctx.fillStyle = `rgba(20,0,10,${0.72 * a})`; ctx.fillRect(-OX(), 0, W, H);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(480, 250); ctx.scale(z, z);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 150); g.addColorStop(0, 'rgba(255,120,160,.35)'); g.addColorStop(1, 'rgba(255,120,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.fill();
    drawImg(pImg('scared'), Math.sin(T * 9) * 3, 6, 150, Math.sin(T * 6) * 0.06, 1, true); drawImg(IMG.spr_bubble_cage, 0, 0, 200 + Math.sin(T * 4) * 5, 0, 0.55);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = a;
    if (!ribbon(480, 92, 560, '아멜리아 공주가 납치되었어요!', 26, true)) text('아멜리아 공주가 납치되었어요!', 480, 92, 34, '#ff9aa8', { lw: 8 });
    text('상어왕이 깊은 바다 끝 성으로 데려갔어요', 480, 410, 20, '#ffffff', { lw: 5 });
    if (t > 1.2 && Math.sin(T * 6) > -0.3) text('구하러 가요!', 480, 450, 24, C.yellow, { lw: 6 });
    ctx.restore();
  }
  if (ev === 'kidnap') { /* 알림 장면: 터틀이는 숨김 */ } else if (i <= 1) drawImg(IMG.hello, 230, 320 + Math.sin(T * 3) * 4, 200);
  else if (i <= 4) drawHero(230, 330, 170, Math.sin(T * 20) * 0.03, { stand: true, face: 'scared', ph: T * 6 });
  else {
    const run = INTRO[i].ev === 'title' ? t * 520 : 0;
    drawHero(230 + run, 330, 170, -0.1, { face: 'boost', boost: run > 0, ph: T * 16 });
    if (run === 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(230, 330, 10, 230, 330, 150); g.addColorStop(0, 'rgba(160,110,255,.5)'); g.addColorStop(1, 'rgba(160,110,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(230, 330, 150, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  drawConfetti();
  if (INTRO[i].ev === 'title') {
    const a = Math.min(1, t / 0.5);
    ctx.fillStyle = `rgba(10,22,62,${0.6 * a})`; ctx.fillRect(-OX(), 0, W, H);
    ctx.save(); ctx.globalAlpha = a;
    const s = 0.7 + 0.3 * easeOutBack(Math.min(1, t / 0.6));
    ctx.translate(480, 200); ctx.scale(s, s); text('터틀런', 0, 0, 86, C.yellow, { lw: 12 }); ctx.restore();
    ctx.save(); ctx.globalAlpha = a;
    text('아멜리아 공주 구출 대작전', 480, 270, 30, '#ffffff');
    text('느려도 괜찮아요. 포기만 하지 마세요', 480, 318, 20, C.text, { body: true });
    ctx.restore();
  }
  const s = INTRO[i];
  if (s.text) {
    panel(40, 394, 880, 124);
    ctx.save(); ctx.beginPath(); ctx.arc(116, 456, 48, 0, Math.PI * 2); ctx.fillStyle = s.who === 'princess' ? '#ffe3f1' : '#ffffff'; ctx.fill(); ctx.clip();
    if (s.who === 'princess') drawImg(pImg(INTRO[i].ev ? 'scared' : ''), 116, 478, 128);
    else if (s.who === 'hero') drawImg(IMG.hello, 116, 470, 120);
    else { ctx.fillStyle = '#e9e0ff'; ctx.fillRect(60, 400, 112, 112); drawShark(132, 462, 1.2, '#8a6bd6', '#3f2a7a', true, false, true, 0, 0.5); }
    ctx.restore();
    text(WHO[s.who], 186, 414, 18, s.who === 'shark' ? '#ff9aa8' : s.who === 'princess' ? '#ffd1ef' : C.yellow, { align: 'left', stroke: false });
    wrapText(s.text.slice(0, Math.floor(cut.shown)), 690, 21).forEach((l, k) => text(l, 186, 448 + k * 30, 21, '#ffffff', { align: 'left', body: true, stroke: false }));
    if (cut.shown >= s.text.length && Math.sin(T * 8) > 0) text('▼', 890, 498, 16, C.yellow, { stroke: false });
  }
  if (!window.FILMING) button(960 + OX() - SAFE - 140, 14, 120, 40, '건너뛰기', endIntro, { size: 15, kind: 'soft' }); // 영상 찍을 땐 숨김
}

// ───────── 타이틀 · 터틀이 숨쉬기와 동작 (디자인 키트 4번) ─────────
const BUDDY_ACTS = ['jump', 'shake', 'bounce2', 'tilt', 'spin'];
const buddy = { i: 0, act: null, t: 0, idle: 10 };
function buddyAct(byTap) { if (REDUCE) return; buddy.act = BUDDY_ACTS[buddy.i++ % 5]; buddy.t = 0; if (byTap) { haptic(10); sfx.tap(); } } // 혼자 움직일 땐 소리·진동 없음(켜 두면 몇 초마다 「띵」 나던 원인)
function updateBuddy(dt) {
  if (buddy.act) { buddy.t += dt / 0.7; if (buddy.t >= 1) buddy.act = null; }
  else if ((buddy.idle -= dt) <= 0) { buddy.idle = rand(8, 14); buddyAct(); }
}
function drawBuddy(x, y, size) {
  const br = REDUCE ? 0 : Math.sin(T * Math.PI * 2 / 1.4);
  let dy = br * size * 0.012, rot = br * 0.015, sx = 1;
  const k = buddy.t;
  switch (buddy.act) {
    case 'jump': dy -= size * 0.16 * Math.sin(Math.PI * k); break;
    case 'shake': rot += Math.sin(k * Math.PI * 6) * 0.14 * (1 - k); break;
    case 'bounce2': dy -= size * 0.08 * Math.abs(Math.sin(Math.PI * 2 * k)); break;
    case 'tilt': rot += 0.2 * Math.sin(Math.PI * k); break;
    case 'spin': sx = Math.cos(Math.PI * 2 * k); break;
  }
  ctx.save(); ctx.translate(x, y + dy); ctx.rotate(rot); ctx.scale(Math.abs(sx) < 0.02 ? 0.02 : sx, 1);
  drawTurtle(0, 0, size, 0);
  ctx.restore();
}
const IS_IOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
let iosGuide = false;
function startGame() {
  if (isTouch && !STANDALONE && !document.fullscreenElement) {
    if (IS_IOS) { if (!save.iosTipSeen) { save.iosTipSeen = true; persist(); iosGuide = true; return; } }
    else goFullscreen();
  }
  if (save.age == null) { state = 'age'; stateT = 0; sfx.click(); return; } // 처음 한 번: 나이(어른이 대신 눌러도 됨)
  if (!save.introSeen) startIntro(); else { placeHero(Math.min(save.unlocked, LAST)); enterMap(); } }
// 첫 화면 불러오기 막대(그림이 다 올 때까지)
function drawLoadBar() {
  const ims = Object.values(IMG).filter((i) => i && i.complete !== undefined), done = ims.filter((i) => i.complete).length;
  if (!ims.length || done >= ims.length) return;
  const k = done / ims.length;
  flatPill(330, 500, 300, 14, 7);
  ctx.fillStyle = C.blueD; rr(330, 500, Math.max(14, 300 * k), 14, 7); ctx.fill();
  text(`바다 준비 중 ${Math.round(k * 100)}%`, 480, 484, 14, C.text, { body: true });
}
// ───────── 게임 끄기 ─────────
// 안드로이드·앱: 저장 → 소리 끔 → 앱/창 닫기. 아이폰·웹: 스스로 못 닫으니(애플은 강제 종료 단추를 막음) 저장·소리 끔 뒤 「또 만나요」 화면
let quitAsk = false, byeAt = 0;
function drawQuitAsk() {
  buttons.length = 0; buttons.push({ x: 0, y: 0, w: W, h: H, on: () => {} });
  ctx.fillStyle = 'rgba(6,14,34,.72)'; ctx.fillRect(-OX(), 0, W, H);
  // 판 400×230 을 화면 가운데에: x = 480 − 200, y = 270 − 115
  panel(280, 155, 400, 230);
  if (!ribbon(480, 160, 260, '게임 끄기', 22)) text('게임 끄기', 480, 190, 24, C.text, { stroke: false });
  text('게임을 끌까요?', 480, 228, 22, '#ffffff', { stroke: false });
  text('기록은 그대로 저장돼요', 480, 262, 15, C.sub, { body: true, stroke: false });
  // 두 단추 같은 크기: (400 − 32×2 − 12) / 2 = 162
  button(312, 302, 162, 54, '끄기', doQuit, { size: 19, kind: 'danger' });
  button(486, 302, 162, 54, '더 놀래요', () => { quitAsk = false; sfx.click(); }, { size: 17, kind: 'yellow' });
}
function doQuit() {
  quitAsk = false; persist();
  try { if (ac && ac.state === 'running') ac.suspend(); } catch (e) { /* 무시 */ }
  state = 'bye'; byeAt = T;
  try { if (window.TurtleApp && window.TurtleApp.exit) { window.TurtleApp.exit(); return; } } catch (e) { /* 앱 다리 없음 */ } // 앱(맥미니 쪽)에서 닫기
  if (!IS_IOS) { try { history.go(-Math.max(1, history.length - 1)); } catch (e) { /* 무시 */ } try { window.close(); } catch (e) { /* 무시 */ } } // 안드로이드·브라우저: 페이지를 떠남
}
function drawBye() { // 못 닫는 기기: 저장됐다는 인사 화면
  buttons.length = 0;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0e2a5a'); g.addColorStop(1, '#06132e'); ctx.fillStyle = g; ctx.fillRect(-OX(), 0, W, H);
  const b = Math.sin(T * 3) * 6;
  drawImg(IMG.hello, 400, 241 + b, 190); drawImg(ready(IMG.spr_amelia) ? IMG.spr_amelia : IMG.princess, 560, 243 - b, 180, 0, 1, true); // 내용 위끝 62 ~ 아래끝 479 → 가운데 270
  text('또 만나요!', 480, 84, 44, C.yellow, { lw: 8 });
  text('기록은 저장됐어요 · 이제 앱을 닫아도 돼요', 480, 391, 17, '#ffffff', { body: true, stroke: false });
  button(380, 429, 200, 50, '다시 하기', () => { state = 'title'; try { if (ac) ac.resume(); } catch (e) { /* 무시 */ } sfx.click(); }, { size: 19, kind: 'yellow' });
}
// 첫 화면 오른쪽: 상어왕(보스) + 끈에 매달린 거품 속 아멜리아(크게). 번갈아 말풍선, 누르면 반응. 구출한 뒤엔 아멜리아가 거품 밖에서 응원
const titleFx = { am: -9, king: -9 };
function drawTitleBoss(R, CX = 560) {
  const am = IMG.spr_amelia, amc = IMG.spr_amelia_cheer, king = IMG.spr_boss_king, freed = !!save.cleared;
  const kh = 200, kx = Math.max(R - 140, CX + 170 + 14 + kh * 0.78), ky = 172 + Math.sin(T * 1.3) * 6, /* 상어왕 왼쪽 끝이 로고 오른쪽 끝(CX+170)보다 오른쪽 */ kr = T - titleFx.king < 0.6 ? Math.sin((T - titleFx.king) * 40) * 0.06 : Math.sin(T * 1.3) * 0.03;
  const swing = Math.sin(T * 1.6) * 0.14, hx = kx - 24, hy = ky + kh * 0.22, rope = 40, br = 96, bx = hx + Math.sin(swing) * (rope + br), by = hy + Math.cos(swing) * (rope + br);
  if (!freed && king && ready(king)) {
    drawImg(king, kx, ky, kh * (T - titleFx.king < 0.6 ? 1.06 : 1), kr);
    ctx.strokeStyle = '#3b6b2c'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + bx) / 2 + 10, (hy + by - br) / 2, bx, by - br); ctx.stroke(); // 미역 끈
    ctx.strokeStyle = '#5e9c44'; ctx.lineWidth = 2; ctx.stroke();
  }
  const ax = freed ? R - 190 : bx, ay = freed ? 300 + Math.sin(T * 2.2) * 8 : by, img = freed || T - titleFx.am < 1 ? amc : am;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(ax, ay, 10, ax, ay, br * 1.25); g.addColorStop(0, 'rgba(255,170,215,.5)'); g.addColorStop(1, 'rgba(255,170,215,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ax, ay, br * 1.25, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  const hop = T - titleFx.am < 0.5 ? -Math.sin((T - titleFx.am) / 0.5 * Math.PI) * 18 : 0;
  if (img && ready(img)) drawImg(img, ax, ay + 6 + hop, freed ? 220 : 172, freed ? 0 : -swing * 0.5, 1, true);
  if (!freed) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ax, ay, br, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(ax - br * 0.5, ay - br * 0.58, 20, 10, -0.6, 0, Math.PI * 2); ctx.fill(); }
  for (let k = 0; k < 4; k++) { const h = (T * 0.5 + k * 0.25) % 1; ctx.globalAlpha = 1 - h; text('♥', ax + br * (0.78 + k * 0.08) + Math.sin(h * 6 + k) * 6, ay - br * 0.1 - h * 70, 16, '#ff8fc8', { stroke: false }); } ctx.globalAlpha = 1; // 하트는 거품 오른쪽에서 피어오름(말풍선과 안 겹치게)
  ctx.font = `800 ${fs(15)}px ${FONT}`; const nw = ctx.measureText('아멜리아 공주').width + 28;
  ctx.fillStyle = '#ff6fae'; rr(ax - nw / 2, ay + br + 6, nw, 30, 15); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; rr(ax - nw / 2, ay + br + 6, nw, 30, 15); ctx.stroke();
  text('아멜리아 공주', ax, ay + br + 21, 15, '#ffffff', { stroke: false, weight: 800 });
  // 말풍선: 3초마다 번갈아(구출 전: 공주 ↔ 상어왕 / 구출 뒤: 공주만)
  const say = freed ? ['고마워, 터틀!', '또 달리러 갈까?'] : ['터틀아, 도와줘!', '크하하! 못 구할걸?'], i = Math.floor(T / 3) % 2, ph = (T % 3) / 3;
  const who = freed ? 0 : i, s2 = say[i], sx = who ? kx - 40 : ax, sy = who ? ky - kh * 0.5 - 10 : ay - br - 34, a2 = Math.min(1, ph * 8, (1 - ph) * 8);
  { ctx.save(); ctx.globalAlpha = a2; ctx.font = `800 ${fs(15)}px ${FONT}`; const tw = ctx.measureText(s2).width + 28; ctx.fillStyle = who ? '#3a2350' : '#ffffff'; rr(sx - tw / 2, sy - 17, tw, 34, 17); ctx.fill(); ctx.beginPath(); ctx.moveTo(sx - 8, sy + 15); ctx.lineTo(sx + 8, sy + 15); ctx.lineTo(sx + (who ? 14 : -4), sy + 28); ctx.fill(); text(s2, sx, sy, 15, who ? '#ffd27a' : '#e0457b', { stroke: false }); ctx.restore(); }
  // 누르면: 아멜리아 = 손 흔들며 폴짝 + 하트 / 상어왕 = 크게 웃으며 흔들
  const mt = ctx.getTransform(), hit = (x, y, w, h, on) => buttons.push({ x: (mt.a * x + mt.e) / K, y: (mt.d * y + mt.f) / K, w: w * mt.a / K, h: h * mt.d / K, on });
  hit(ax - br, ay - br, br * 2, br * 2, () => { titleFx.am = T; snd('pop', 0.7, 1.3); haptic(15); });
  if (!freed) hit(kx - kh * 0.4, ky - kh * 0.5, kh * 0.8, kh * 0.7, () => { titleFx.king = T; snd('oof', 0.8, 0.7); haptic(30); });
}
// 영어 로고: 굵은 둥근 글자 + 남색 두꺼운 테 + 노랑→주황 + 흰 하이라이트 + 작은 거북 등껍질(한국어 로고 그림과 같은 느낌)
function drawLogoEN(x, y, w) {
  const word = 'TurtleRun'; let size = 80; ctx.font = `900 ${size}px ${FONT}`; size = size * (w * 0.9) / ctx.measureText(word).width; ctx.font = `900 ${size}px ${FONT}`;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.26; ctx.strokeStyle = '#13204a'; ctx.strokeText(word, x, y + size * 0.06);
  ctx.lineWidth = size * 0.2; ctx.strokeText(word, x, y);
  const g = ctx.createLinearGradient(0, y - size * 0.45, 0, y + size * 0.45); g.addColorStop(0, '#ffe65a'); g.addColorStop(0.55, '#ffc02e'); g.addColorStop(1, '#ff8a1f');
  ctx.fillStyle = g; ctx.fillText(word, x, y);
  ctx.save(); ctx.beginPath(); ctx.rect(x - w, y - size * 0.5, w * 2, size * 0.32); ctx.clip(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#ffffff'; ctx.fillText(word, x, y); ctx.restore();
  const tw = ctx.measureText(word).width, sx = x + tw / 2 + size * 0.1, sy = y - size * 0.55; // 등껍질
  ctx.fillStyle = '#13204a'; ctx.beginPath(); ctx.ellipse(sx, sy, size * 0.3, size * 0.22, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5cc93a'; ctx.beginPath(); ctx.ellipse(sx, sy, size * 0.24, size * 0.16, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3e9a26'; for (const [dx, dy] of [[0, 0], [-0.1, -0.05], [0.1, 0.05]]) { ctx.beginPath(); ctx.arc(sx + dx * size, sy + dy * size, size * 0.05, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function drawTitle() {
  drawLoadBar();
  // 인기 게임식 첫 화면: 화면 가득 키 아트(코덱스) + 로고 그림 + 크게 빛나는 시작 단추
  const bg = ready(IMG.spr_title_bg2) ? IMG.spr_title_bg2 : IMG.spr_title_bg; // 옛 공주를 뺀 배경(아멜리아는 따로 크게)
  if (bg && ready(bg)) { // 화면을 덮게(cover) + 아주 천천히 다가오는 느낌
    const sh = Math.max(0, 64 - OX() * 0.6), z = 1.04 + Math.sin(T * 0.25) * 0.02 + sh / 520, sc = Math.max(W / bg.naturalWidth, H / bg.naturalHeight) * z; // 좁은 화면: 배경(터틀이)을 왼쪽으로 밀어 가운데 단추·로고와 안 겹치게
    const dw = bg.naturalWidth * sc, dh = bg.naturalHeight * sc;
    ctx.drawImage(bg, -OX() + (W - dw) / 2 - sh, (H - dh) / 2, dw, dh);
  }
  // 가운데 열(560): 로고 → 부제 → 시작 단추 → 아래 줄 / 오른쪽: 상어왕이 아멜리아 거품을 끈으로 들고 있음(이야기가 한눈에)
  const CX = 456 + OX() * 0.5, R = 960 + OX() - SAFE; // 가운데 열은 화면 폭에 맞춰(좁으면 왼쪽으로)
  drawTitleBoss(R, CX);
  // 가운데 열 = 세로로 한 덩어리를 화면 위아래 가운데에: 로고(lh) 12 부제(34) 52 시작(70+6) 18 아래 줄(40)
  const lg = IMG.spr_title_logo_run, lw = 340, lb = lg && ready(lg) && typeof obox === 'function' ? obox(lg) : null, lh = lb ? lw * lb.h / lb.w : 90;
  const stack = lh + 12 + 34 + 52 + 76 + 18 + 40, top = Math.round((H - stack) / 2), ly = top + lh / 2, py = top + lh + 12, by0 = py + 34 + 52, ry = by0 + 76 + 18;
  { const bob = Math.sin(T * 2) * 4, ls = 1 + Math.sin(T * 3) * 0.015, pop = clamp(stateT / 0.5, 0, 1), e = pop < 1 ? easeOutBack(pop) : 1; // 처음엔 통 튀어나옴
    if (isEN) { ctx.save(); ctx.translate(CX, ly + bob); ctx.scale(ls * e, ls * e); ctx.rotate(Math.sin(T * 1.4) * 0.02); drawLogoEN(0, 0, lw); ctx.restore(); } // 영어: 코드로 그린 「TurtleRun」 로고(같은 사탕 글자)
    else if (lb) { ctx.save(); ctx.translate(CX, ly + bob); ctx.scale(ls * e, ls * e); ctx.rotate(Math.sin(T * 1.4) * 0.02); ctx.drawImage(lg, lb.x, lb.y, lb.w, lb.h, -lw / 2, -lh / 2, lw, lh); ctx.restore(); }
    else text('터틀런', CX, ly, 76, C.yellow, { lw: 12 }); }
  ctx.font = `800 ${fs(18)}px ${FONT}`; const sw = ctx.measureText('아멜리아 공주 구출 대작전').width + 40;
  ctx.fillStyle = '#1d2a5a'; rr(CX - sw / 2, py, sw, 34, 17); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; rr(CX - sw / 2, py, sw, 34, 17); ctx.stroke();
  text('아멜리아 공주 구출 대작전', CX, py + 17, 18, '#ffffff', { stroke: false });
  // 시작 단추(평면 귀염): 굵은 남색 테 + 노랑 + 아래 주황 띠 + 작은 하이라이트 · 젤리처럼 말랑 통통(1.6초마다) · 누르면 쑥
  const bw0 = 250, bh0 = 70, bx0 = CX - bw0 / 2, pressed = press.down && press.key === `${bx0 | 0},${by0 | 0}`, ph = (T % 1.6) / 1.6, jig = ph < 0.25 ? Math.sin(ph / 0.25 * Math.PI * 2) * (1 - ph / 0.25) : 0, sqx = 1 + jig * 0.06, sqy = 1 - jig * 0.06, dn = pressed ? 5 : 0;
  ctx.save(); ctx.translate(CX, by0 + bh0); ctx.scale(sqx, sqy); ctx.translate(-CX, -(by0 + bh0));
  ctx.fillStyle = '#1d2a5a'; rr(bx0 - 4, by0 - 4 + 6, bw0 + 8, bh0 + 8, 30); ctx.fill(); // 아래 그림자 겸 테
  ctx.fillStyle = '#1d2a5a'; rr(bx0 - 4, by0 - 4 + dn, bw0 + 8, bh0 + 8, 30); ctx.fill();
  ctx.save(); rr(bx0, by0 + dn, bw0, bh0, 26); ctx.clip();
  ctx.fillStyle = '#ffd23a'; ctx.fillRect(bx0, by0 + dn, bw0, bh0); ctx.fillStyle = '#ff9f1c'; ctx.fillRect(bx0, by0 + dn + bh0 * 0.68, bw0, bh0);
  if (T % 2.6 < 0.5) { const sx = ((T % 2.6) / 0.5) * (bw0 + 120) - 60; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(bx0 + sx, by0 + dn); ctx.lineTo(bx0 + sx + 22, by0 + dn); ctx.lineTo(bx0 + sx - 8, by0 + dn + bh0); ctx.lineTo(bx0 + sx - 30, by0 + dn + bh0); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(bx0 + 30, by0 + dn + 16, 13, 6, -0.4, 0, Math.PI * 2); ctx.fill();
  text('시작하기', CX, by0 + dn + bh0 / 2, 32, '#ffffff', { stroke: '#1d2a5a', lw: 7 });
  ctx.restore();
  for (let k = 0; k < 2; k++) { const tw = Math.max(0, Math.sin(T * 3 + k * 2.4)); ctx.save(); ctx.globalAlpha = tw; drawImg(IMG.spr_fx_spark, k ? bx0 + bw0 + 2 : bx0 - 2, by0 + (k ? bh0 - 6 : 4), 26 * tw + 6, T * 2); ctx.restore(); } // 단추 모서리 반짝
  ctx.save(); ctx.globalAlpha = 0; button(bx0, by0, bw0, bh0 + 6, '시작하기', startGame, { size: 26 }); ctx.restore();
  // 아래 줄: 같은 가운데(CX) 기준 좌우 대칭
  const row = [];
  if (save.introSeen) row.push(['첫 이야기', startIntro]);
  if (isTouch && !STANDALONE) row.push(['꽉 찬 화면', () => { if (IS_IOS) iosGuide = true; else goFullscreen(); }]);
  row.push(['게임 끄기', () => { quitAsk = true; sfx.click(); }]);
  const bwR = 116, gapR = 10, totR = row.length * bwR + (row.length - 1) * gapR, x0R = CX - totR / 2;
  row.forEach(([lbl, fn], i) => button(x0R + i * (bwR + gapR), ry, bwR, 40, lbl, fn, { size: 14, kind: 'soft' }));
  if (iosGuide) drawIosGuide();
  eggBadge(36 - OX() + SAFE, 32, save.eggs, 30);
  { // 오른쪽 위 언어 단추(지구 + 지금 언어) — 누르면 바뀌고 다시 켜짐
    const lw2 = 116, lx2 = 960 + OX() - SAFE - 16 - lw2;
    button(lx2, 12, lw2, 36, isEN ? '🌐 English' : '🌐 한국어', () => { sfx.click(); setLang(isEN ? 'ko' : 'en'); }, { size: 14, kind: 'soft' });
  }
  if (quitAsk) drawQuitAsk();
}

// ───────── 나이 묻기(중립 화면: 어른 쪽으로 이끌지 않음 · 모든 단추 같은 모양) ─────────
let ageBack = null;
function drawAge() {
  const bg = ready(IMG.spr_title_bg2) ? IMG.spr_title_bg2 : IMG.spr_title_bg;
  if (bg && ready(bg)) { const sc = Math.max(W / bg.naturalWidth, H / bg.naturalHeight); ctx.drawImage(bg, -OX() + (W - bg.naturalWidth * sc) / 2, (H - bg.naturalHeight * sc) / 2, bg.naturalWidth * sc, bg.naturalHeight * sc); }
  ctx.fillStyle = 'rgba(8,24,60,.62)'; ctx.fillRect(-OX(), 0, W, H);
  panel(200, 64, 560, 412);
  text('몇 살이에요?', 480, 120, 30, '#ffffff', { lw: 6 });
  text('나이에 맞게 게임을 맞춰 줘요', 480, 158, 15, 'rgba(255,255,255,.75)', { body: true, stroke: false });
  const ages = [5, 6, 7, 8, 9, 10, 11, 12, 13], bw = 140, bh = 56, gx = 14, gy = 14, cols = 3, tw = cols * bw + (cols - 1) * gx, x0 = 480 - tw / 2, y0 = 196;
  ages.forEach((a, i) => withRise(i, () => {
    const x = x0 + (i % cols) * (bw + gx), y = y0 + Math.floor(i / cols) * (bh + gy);
    button(x, y, bw, bh, a === 13 ? '13살+' : a === 5 ? '5살↓' : `${a}살`, () => pickAge(a), { size: 20, kind: 'soft' });
  }));
  text('어린이는 돈으로 사는 것 없이 놀아요 · 보호자가 설정에서 바꿀 수 있어요', 480, 432, 13, 'rgba(255,255,255,.7)', { body: true, stroke: false });
}
function pickAge(a) {
  const first = save.age == null; save.age = a;
  if (first && a < 13 && !save.runs) save.diff = 0; // 처음 하는 어린이는 「쉬움」부터
  persist(); sfx.levelup(); haptic(20);
  toast(a < 13 ? '어린이 모드: 돈으로 사는 것이 없어요 · 30분마다 쉬어 가요' : '좋아요! 즐겁게 달려요', C.yellow);
  if (ageBack === 'map') { ageBack = null; enterMap(); return; }
  startGame();
}

// ───────── 상점 (실력 키우기 · 옷장 · 펫) ─────────
const shop = { tab: 'up', next: 1, msg: '', msgT: 0, hatch: null, turn: null };
function openShop(next) { shop.next = next; shop.msg = ''; shop.hatch = null; shop.pillX = null; shop.tabAt = null; state = 'shop'; sfx.click(); }
function shopSay(m) { shop.msg = m; shop.msgT = 1.6; }
function buyUp(i) {
  const u = UPS[i]; if (!u) return;
  const c = upCost(u);
  if (c == null) { sfx.no(); shopSay('이미 최고 단계예요'); return; }
  if (save.eggs < c) { // 부족한 순간: 보석이 있으면 바로 바꾸는 길(쓰기 확인 창), 없으면 판으로 모으는 안내 — 팝업으로 밀지 않음
    sfx.no(); const need = c - save.eggs, x = EXCHANGE.find((e) => e.pearls >= need) || EXCHANGE[EXCHANGE.length - 1];
    if (save.gems >= x.gems && need <= x.pearls) { exchange(x); shopSay(`진주 ${need}개 부족 · 보석 ${x.gems}개로 진주 ${x.pearls.toLocaleString()}개를 바꿀 수 있어요`); }
    else shopSay(`진주가 ${need}개 부족해요 · 판을 하면 모여요`);
    return;
  }
  save.eggs -= c; save.up[u.k]++; persist(); haptic(25);
  for (let j = 0; j < 6; j++) snd('count', 0.5, 1 + j * 0.08, 0, j * 0.05); // 진주가 날아가는 소리
  if (!snd('levelup', 0.9, 1, 0, 0.35)) sfx.levelup(); // 빛기둥이 서는 순간
  { const cx = 40 + (i % 3) * 296 + 142 + OX(), cy = 116 + Math.floor(i / 3) * 176 + 134; popDots(cx, cy, 40); confettiBurst(cx, cy - 20, 30); } // 키운 카드 단추 자리에서 톡 + 색종이
  shopSay(`${u.name} Lv ${save.up[u.k]}! 이제 ${u.eff(save.up[u.k])}`);
}
function tapTreasure(t) {
  save.trs = save.trs || []; save.trEq = save.trEq || [];
  if (save.trEq.includes(t.k)) { save.trEq = save.trEq.filter((k) => k !== t.k); persist(); sfx.click(); shopSay(`${t.name} 뺐어요`); return; }
  if (!save.trs.includes(t.k) && t.gems && !t._ok) { askSpend(t.gems, t.name, () => { t._ok = true; tapTreasure(t); t._ok = false; }); return; } // 보석 보물: 쓰기 확인 먼저
  if (!save.trs.includes(t.k)) {
    if (t.gems) { if (!spendGems(t.gems)) return; }
    else { if (save.eggs < t.cost) { sfx.no(); shopSay(`진주가 ${t.cost - save.eggs}개 부족해요`); return; } save.eggs -= t.cost; }
    save.trs.push(t.k); sfx.buy(); snd('tada', 0.8, 1, 0, 0.2); shopSay(`${t.name} 얻었어요!`);
  }
  if (save.trEq.length >= 2) save.trEq.shift(); // 칸이 차면 먼저 끼운 것을 빼고
  save.trEq.push(t.k); persist(); haptic(20); shopSay(`${t.name} 끼웠어요 · ${t.desc}`);
}
function wearSkin(k) {
  if (save.skin === k) return;
  if (!REDUCE) shop.turn = { t: 0, from: save.skin, to: k }; // 앱의 휘리릭 턴: 앞 → 옆 → 뒤 → 옆 → 앞(새 옷)
  save.skin = k; persist(); haptic(30);
  if (REDUCE) snd('tada', 0.9);
}
function buySkin(s) {
  if (save.skins.includes(s.k)) { wearSkin(s.k); shopSay(`${s.name} 입었어요`); return; }
  if (s.gems) { // 보석 옷: 사기 전에 한 번 묻기
    askSpend(s.gems, s.name, () => { if (!spendGems(s.gems)) return; save.skins.push(s.k); sfx.buy(); wearSkin(s.k); shopSay(`${s.name} 획득!`); persist(); });
    return;
  }
  if (save.eggs < s.cost) { sfx.no(); shopSay(`진주가 ${s.cost - save.eggs}개 부족해요`); return; }
  save.eggs -= s.cost; save.skins.push(s.k); sfx.buy(); wearSkin(s.k); shopSay(`${s.name} 획득!`);
}
function hatchPet() {
  const left = PETS.filter((p) => !save.pets.includes(p.k));
  if (!left.length) { shopSay('펫을 다 모았어요!'); return; }
  const cost = hatchCost();
  if (save.eggs < cost) { sfx.no(); shopSay(`진주가 ${cost - save.eggs}개 부족해요`); return; }
  const p = pick(left);
  save.eggs -= cost; save.freeEgg = false; save.pets.push(p.k); save.pet = p.k; save.petLv[p.k] = 1; persist(); // 공짜 알은 깬 뒤에 씀 처리
  shop.hatch = { t: 0, pet: p, cracked: false };
  sfx.click(); haptic(20);
}
function levelPet(k) {
  const lv = petLv(k);
  if (lv >= 5) { shopSay('최고 단계예요'); return; }
  const c = PET_LV_COST[lv - 1];
  if (save.eggs < c) { sfx.no(); shopSay(`진주가 ${c - save.eggs}개 부족해요`); return; }
  save.eggs -= c; save.petLv[k] = lv + 1; persist(); sfx.levelup(); haptic(25);
  shopSay(`${PETS.find((p) => p.k === k).name} ${lv + 1}단계!`);
}
function updateShop(dt) {
  if (stateT > 0.6 && !shop.hatch && !buying) {
    const T0 = { gacha: ['gacha', '신비한 조개', '하루 한 번은 공짜! 확률은 「확률 정보」에 다 적혀 있어요 · 40번 안에 전설 확정'], up: ['up', '실력 키우기', '진주로 사서 키우면 모든 판에 계속 적용돼요 · 「지금 → 다음」을 봐요'], skin: ['skin', '옷장', '산 옷은 달릴 때도 그대로 입어요 · 힘은 똑같고 꾸미기만'], tr: ['tr', '보물', '2개까지 끼우면 판마다 힘이 붙어요 · 누르면 끼우기/빼기'], pet: ['pet', '펫', '알을 부화하면 펫이 따라다니며 도와줘요 · 확률은 화면에 적혀 있어요'] }[shop.tab];
    if (T0) coachOnce('shop_' + T0[0], { text: T0[1], sub: T0[2], spot: null, pass: true, state: 'shop' });
  }
  if (shop.msgT > 0) shop.msgT -= dt;
  if (shop.upFlash) { shop.upFlash.t += dt; if (shop.upFlash.t > 1.3) shop.upFlash = null; }
  if (shop.turn) {
    const tr = shop.turn; tr.t += dt / 0.92; tr.n = tr.n || 0;
    // 몸이 옆→뒤→옆으로 바뀌는 순간(easeInOutCubic 이 1/4·2/4·3/4 를 지나는 t)에 휙 소리, 앞으로 돌아오면 짠
    const STEPS = [0.397, 0.5, 0.603];
    while (tr.n < 3 && tr.t >= STEPS[tr.n]) { snd('spin', 0.9, 0.92 + tr.n * 0.1); tr.n++; }
    if (tr.t >= 1) { shop.turn = null; snd('tada', 0.9); haptic([15, 30, 15]); }
  }
  if (shop.hatch) {
    const h = shop.hatch; h.t += dt;
    if (h.t < 1.3 && Math.random() < dt * 8) { snd('tick', 0.5, 0.9 + h.t * 0.3, 0.1); haptic(8); }
    if (!h.cracked && h.t >= 1.3) { h.cracked = true; sfx.crack(); confetti(60); flash = 0.5; flashColor = '#ffffff'; haptic([40, 30, 80]); }
  }
}
function drawTurnPreview(x, y, size) {
  const tr = shop.turn, v = tr ? easeInOutCubic(Math.min(1, tr.t)) : 1;
  const f = (v * 4) % 1, squeeze = v >= 1 ? 1 : 0.7 + 0.3 * Math.abs(Math.cos(f * Math.PI));
  const lift = -size * 0.1 * Math.sin(v * Math.PI);
  if (tr) {
    ctx.save(); ctx.globalAlpha = 0.42 * Math.sin(v * Math.PI);
    ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(x, y, size * 0.38 * (0.6 + v * 0.6), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = Math.sin(v * Math.PI); ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y + size * 0.44, size * 0.3 * (0.3 + v * 1.3), size * 0.06 * (0.3 + v * 1.3), 0, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 4; k++) { const a = v * Math.PI * 4 + k * Math.PI / 2; icon('e_sparkles', x + Math.cos(a) * size * 0.42, y + Math.sin(a) * size * 0.2, 22); }
    ctx.restore();
  }
  let im = playerImg(), flip = false;
  if (tr && v < 0.125) im = playerImg(tr.from);
  else if (tr && v < 0.375) im = IMG.side;
  else if (tr && v < 0.625) im = IMG.back;
  else if (tr && v < 0.875) { im = IMG.side; flip = true; }
  ctx.save(); ctx.translate(x, y + lift); ctx.scale(squeeze, 1);
  drawImg(im, 0, 0, size, 0, 1, flip);
  if (!tr || v < 0.125 || v >= 0.875) drawFrontDeco(0, 0, size); // 끼운 치장도 보이게
  ctx.restore();
}
function drawShop() {
  ctx.fillStyle = 'rgba(10,22,62,.6)'; ctx.fillRect(-OX(), 0, W, H);
  if (shop.tab === 'up') { const pw = turtlePower(); text(`파워 ${pw.toLocaleString()} · ${powerRank(pw)}`, 446, 30, 15, '#ffd27a', { lw: 4, align: 'left' }); } // 키우면 바로 오르는 게 보이게
  // 시안: 왼쪽 위 제목 리본, 오른쪽 위 크림색 재화 칸(지도와 같은 부품)
  const stitle = shop.tab === 'gem' ? '보석 상점' : shop.tab === 'fx' ? '꾸밈 상점' : shop.tab === 'gacha' ? '뽑기' : shop.tab === 'bag' ? '가방' : '진주 상점', sL = -OX() + SAFE + 14, sR = 960 + OX() - SAFE - 14;
  if (!ribbon(sL + 120, 30, 240, stitle, 22)) text(stitle, 480, 34, 32, C.text, { stroke: false });
  if (ready(IMG.spr_ui_cur_pill)) {
    curPill(sR - 150, 8, 150, (x, y) => drawPearl(x, y, 26 * (1 + hudPulse * 1.6)), save.eggs.toLocaleString(), null, null, 'pearl');
    curPill(sR - 292, 8, 132, (x, y) => icon('e_gem', x, y, 26), String(save.gems), shop.tab === 'gem' ? null : () => { shop.tab = 'gem'; sfx.click(); }, null, 'gem');
  } else { eggBadge(960 + OX() - SAFE - 120, 34, save.eggs, 30 * (1 + hudPulse * 1.6)); gemBadge(960 + OX() - SAFE - 250, 34, save.gems, 26); }
  // 미끄러지는 알약 탭 (lucian-uxui #039, MIT): 노란 알약이 고른 탭으로 스르륵, 그 아래 글자만 진하게 · 내용은 옮긴 쪽에서 밀려 들어옴
  const TABS = [['up', '실력 키우기'], ['skin', '옷장'], ['pet', '펫'], ['tr', '보물'], ['fx', '꼬리 효과'], ['gem', '보석']], ti = TABS.findIndex(([k]) => k === shop.tab);
  gachaBtn(268, 10, 164, 40); // 신비한 조개(뽑기) — 탭 줄과 따로, 반짝이는 단추
  bagBtn(442, 10, 104, 40); // 가방(변신·무기·치장·보스 유물) 바로 가기
  if (shop.pillX == null) shop.pillX = Math.max(0, ti);
  const pdt = Math.min(0.1, Math.max(0, T - (shop.pillT || T))); shop.pillT = T;
  if (ti >= 0) { shop.pillX += (ti - shop.pillX) * (1 - Math.exp(-pdt * 16)); if (Math.abs(ti - shop.pillX) < 0.002) shop.pillX = ti; }
  // 탭 = 코덱스 흰 아이콘(왼쪽) + 글자(오른쪽) — 시안 ref_mock_shop 처럼
  const tabIcon = (k, i) => { const im = IMG['spr_tab_' + k]; if (im && ready(im)) { drawImg(im, 52 + i * 144 + 26, 81, 28); return true; } return false; };
  const hasIc = ready(IMG.spr_tab_up), lx = (i) => 52 + i * 144 + (hasIc ? 84 : 68);
  const tsz = (label) => { let z = 14; while (z > 12) { ctx.font = `800 ${fs(z)}px ${FONT}`; if (ctx.measureText(label).width <= 82) break; z--; } return z; }; // 아이콘 오른쪽 빈 폭(82)에 맞춤
  TABS.forEach(([k, label], i) => { button(52 + i * 144, 62, 136, 40, hasIc ? '' : label, () => { if (shop.tab !== k) { shop.tabDir = i > ti ? 1 : -1; shop.tabAt = T; } shop.tab = k; sfx.click(); }, { size: 15, kind: 'primary' }); if (hasIc) { tabIcon(k, i); text(label, lx(i), 81, tsz(label), '#ffffff', { stroke: 'rgba(0,20,60,.45)', lw: 3, weight: 800 }); } });
  const yb = IMG.spr_ui_btn_yellow, px = 52 + shop.pillX * 144;
  if (yb && ready(yb) && ti >= 0) {
    slice3(yb, px - 2, 60, 140, 44);
    ctx.save(); ctx.beginPath(); ctx.rect(px + 4, 60, 128, 44); ctx.clip();
    TABS.forEach(([k, label], i) => { if (hasIc) tabIcon(k, i); text(label, lx(i), 82 - 40 * 0.04, hasIc ? tsz(label) : 15, '#5a3000', { stroke: false, weight: 800 }); });
    ctx.restore();
  }
  const te = shop.tabAt != null ? clamp((T - shop.tabAt) / 0.32, 0, 1) : 1, tk = 1 - Math.pow(1 - te, 3);
  ctx.save(); if (te < 1) { ctx.translate((shop.tabDir || 1) * 70 * (1 - tk), 0); ctx.globalAlpha *= 0.2 + 0.8 * tk; }
  if (shop.tab === 'up') {
    const icons = { slow: 'e_snow', boost: 'e_rocket', shield: 'e_shield', magnet: 'e_gem', fire: 'e_sparkles', power: 'e_fire' };
    UPS.forEach((u, i) => withRise(i, () => {
      const x = 40 + (i % 3) * 296, y = 116 + Math.floor(i / 3) * 176, w = 284, h = 166, lv = save.up[u.k], c = upCost(u), maxed = c == null;
      const fl = shop.upFlash && shop.upFlash.i === i ? Math.max(0, 1 - Math.max(0, shop.upFlash.t - 0.35) / 0.6) * (shop.upFlash.t > 0.35 ? 1 : 0) : 0;
      panel(x, y, w, h, { sel: maxed, fill: maxed ? 'rgba(60,52,20,.92)' : undefined });
      if (fl > 0) { ctx.save(); ctx.globalAlpha = fl; ctx.strokeStyle = C.yellow; ctx.lineWidth = 3 + fl * 5; rr(x - 2, y - 2, w + 4, h + 4, 22); ctx.stroke(); ctx.restore(); }
      const ut = shop.upFlash && shop.upFlash.i === i ? shop.upFlash.t : 9;
      if (ut < 0.3 + 0.4) { // 인기 게임 레벨 업처럼: 진주가 위 진주 칸에서 날아오고(0.4초) → 카드에 빛기둥(0.3초)
        const eh2 = eggHud(), sx0 = eh2.x - OX(), sy0 = eh2.y;
        for (let j = 0; j < 6; j++) { const k = clamp((ut - j * 0.03) / 0.35, 0, 1); if (k <= 0 || k >= 1) continue; const e = 1 - Math.pow(1 - k, 2); drawPearl(lerp(sx0, x + 46, e), lerp(sy0, y + 50, e) - Math.sin(k * Math.PI) * 60, 16 * (1 - k * 0.4)); }
        if (ut > 0.35 && ut < 0.7) { const a = 1 - (ut - 0.35) / 0.35; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; drawImg(IMG.spr_fx_pillar, x + w / 2, y + h / 2, h * 1.3); ctx.restore(); }
      }
      // 왼쪽: 아이콘 동그라미
      ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.arc(x + 46, y + 50, 32, 0, Math.PI * 2); ctx.fill();
      if (!drawImg(IMG['spr_up_' + u.k], x + 46, y + 50 - fl * 8, 74 * (1 + fl * 0.25), Math.sin(T * 2 + i) * 0.06)) icon(icons[u.k], x + 46, y + 50 - fl * 8, 48 * (1 + fl * 0.25), Math.sin(T * 2 + i) * 0.08); // 코덱스 카드 그림(없으면 이모지)
      // 위: 이름 + 단계 배지
      const badgeTxt = save.up[u.k] >= u.max ? 'MAX' : `Lv ${save.up[u.k]}/${u.max}`; ctx.font = `800 ${fs(13)}px ${FONT}`; const bwN = ctx.measureText(badgeTxt).width + 16;
      let nsz = 18; ctx.font = `800 ${fs(nsz)}px ${FONT}`; while (nsz > 13 && ctx.measureText(u.name).width > w - 90 - 14 - bwN - 8) { nsz--; ctx.font = `800 ${fs(nsz)}px ${FONT}`; } // 긴 이름은 배지와 안 겹치게 줄임
      text(u.name, x + 90, y + 28, nsz, C.text, { align: 'left', stroke: false, maxW: w - 90 - 14 - bwN - 8 });
      ctx.save(); rr(x, y, w, h, 20); ctx.clip();
      text(u.desc, x + 90, y + 54, 13, C.sub, { align: 'left', body: true, stroke: false, maxW: w - 90 - 12 });
      const badge = maxed ? 'MAX' : `Lv ${lv}/${u.max}`;
      ctx.font = `800 ${fs(13)}px ${FONT}`; const bw = ctx.measureText(badge).width + 16;
      const bp = ut > 0.35 && ut < 0.65 ? 1 + 0.5 * (1 - (ut - 0.35) / 0.3) : 1; // 단계 숫자가 1.5배로 튀어나옴
      ctx.save(); ctx.translate(x + w - 14 - bw / 2, y + 27); ctx.scale(bp, bp);
      ctx.fillStyle = maxed ? C.yellow : 'rgba(255,255,255,.12)'; rr(-bw / 2, -13, bw, 26, 13); ctx.fill();
      text(badge, 0, 0, 13, maxed ? '#3a2a00' : C.text, { stroke: false }); ctx.restore();
      if (maxed && ut < 1.2) { // MAX 도장이 비스듬히 쾅(크기 2→1)
        const st = clamp((ut - 0.35) / 0.2, 0, 1), sc = 2 - st;
        if (ut > 0.35) { ctx.save(); ctx.translate(x + w / 2, y + 84); ctx.rotate(-0.25); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, st * 2) * (ut > 0.9 ? 1 - (ut - 0.9) / 0.3 : 1); ctx.strokeStyle = '#ff3b4e'; ctx.lineWidth = 5; rr(-70, -26, 140, 52, 10); ctx.stroke(); text('MAX', 0, 2, 34, '#ff3b4e', { stroke: false }); ctx.restore(); }
      }
      // 가운데: 지금 → 다음
      if (maxed) text(`${u.eff(lv)} · 최고 단계`, x + 90, y + 80, 15, C.yellow, { align: 'left', body: true, stroke: false });
      else {
        ctx.font = `600 ${fs(15)}px ${FONT}`; const cur = u.eff(lv), cw = ctx.measureText(cur).width;
        text(cur, x + 90, y + 80, 15, C.sub, { align: 'left', body: true, stroke: false });
        text('→', x + 90 + cw + 14, y + 80, 15, C.sub, { stroke: false });
        text(u.eff(lv + 1), x + 90 + cw + 28, y + 80, 16, '#8dff7a', { align: 'left', stroke: false });
      }
      // 단계 칸
      const pw = (w - 104) / u.max;
      for (let k = 0; k < u.max; k++) { ctx.fillStyle = k < lv ? (maxed ? C.yellow : C.blue) : 'rgba(255,255,255,.12)'; rr(x + 90 + k * pw, y + 97, pw - 5, 7, 3.5); ctx.fill(); }
      ctx.restore();
      // 아래: 설명 한 줄(넓은 화면만) + 사기 단추
      if (maxed) text('다 키웠어요!', x + w / 2, y + 134, 17, C.yellow, { stroke: false });
      else if (save.eggs < c) button(x + 16, y + 114, w - 32, 40, `진주 ${c - save.eggs}개 더 모으면`, () => buyUp(i), { size: 15, disabled: true });
      else button(x + 16, y + 114, w - 32, 40, `키우기 · 진주 ${c}`, () => { buyUp(i); shop.upFlash = { i, t: 0 }; }, { size: 16 });
    }));
  } else if (shop.tab === 'gacha') drawGachaPage();
  else if (shop.tab === 'bag') drawBagPage();
  else if (shop.tab === 'fx') {
    TRAILS.forEach((t, i) => withRise(i, () => {
      const x = 40 + (i % 4) * 222, y = 116 + Math.floor(i / 4) * 176, w = 210, h = 166, own = save.trails.includes(t.k), on = save.trail === t.k;
      panel(x, y, w, h, { sel: on, fill: on ? C.sel : undefined });
      if (t.k !== 'none') { // 미리보기: 게임과 같은 리본 + 날리는 조각
        ctx.save(); ctx.lineCap = 'round';
        for (let k = 0; k < 14; k++) { const f = k / 13, x0 = x + 22 + k * 10, y0 = y + 42 + Math.sin(T * 7 - k * 0.5) * 7 * (1 - f * 0.6); ctx.globalAlpha = 0.25 + 0.75 * f; ctx.strokeStyle = trailCol(t.k, k >> 1); ctx.lineWidth = 3 + f * 13; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + 10, y + 42 + Math.sin(T * 7 - (k + 1) * 0.5) * 7 * (1 - f * 0.6)); ctx.stroke(); }
        ctx.restore();
        for (let k = 0; k < 4; k++) { const ph = (T * 0.9 + k / 4) % 1, sh = t.k === 'gold' || t.k === 'rainbow' ? 'star' : t.k; ctx.save(); ctx.globalAlpha = Math.sin(ph * Math.PI); trailShape(sh, x + 150 - ph * 130, y + 30 + Math.sin(ph * 9 + k) * 14 + (k % 2 ? 10 : -6), 9, T * 3 + k, trailCol(t.k, k)); ctx.restore(); }
      } else text('꼬리 없음', x + 70, y + 42, 14, C.mute, { stroke: false });
      drawImg(IMG.side, x + w - 40, y + 40, 56);
      text(t.name, x + w / 2, y + 80, 17, C.text, { stroke: false });
      if (t.how && !own) text(t.how, x + w / 2, y + 104, 12, C.sub, { body: true, stroke: false });
      button(x + 16, y + 122, w - 32, 34, on ? '쓰는 중' : own ? '쓰기' : t.gems ? `보석 ${t.gems}` : '얻는 곳 보기', () => buyTrail(t), { size: 14, kind: on ? 'soft' : own ? 'soft' : t.gems ? 'yellow' : 'soft', disabled: on });
    }));
  } else if (shop.tab === 'gem' && kidMode()) { // 어린이 모드: 파는 것 없음 — 모으는 곳만 알려 줌
    withRise(0, () => { panel(40, 116, 880, 176); icon('e_gem', 120, 204, 64); text('보석은 놀면서 모아요', 180, 176, 22, '#ffffff', { align: 'left', stroke: false }); ['처음 깬 바다 선물 · 업적 · 바다 패스 · 도감 모으기', '어린이 모드에서는 돈으로 사는 상품이 없어요'].forEach((l, k) => text(l, 180, 214 + k * fs(14) * 1.6, 14, k ? C.yellow : 'rgba(255,255,255,.8)', { align: 'left', body: true, stroke: false })); });
    withRise(1, () => { panel(40, 306, 880, 120); text('보석으로 진주 바꾸기', 70, 334, 16, C.text, { align: 'left', stroke: false }); EXCHANGE.forEach((x2, i) => button(70 + i * 250, 352, 230, 52, `보석 ${x2.gems} → 진주 ${x2.pearls.toLocaleString()}`, () => exchange(x2), { size: 14, kind: 'soft', disabled: save.gems < x2.gems })); text(`가진 보석 ${save.gems}`, 890, 334, 14, '#9fe3ff', { align: 'right', body: true, stroke: false }); });
  } else if (shop.tab === 'gem') {
    GEM_PACKS.forEach((p, i) => withRise(i, () => {
      const x = 40 + i * 222, y = 116, w = 210, h = 176;
      panel(x, y, w, h);
      if (p.tag) { ctx.fillStyle = C.danger; rr(x + w - 70, y + 10, 58, 22, 11); ctx.fill(); text(p.tag, x + w - 41, y + 21, 12, '#fff', { stroke: false }); }
      for (let k = 0; k < 1 + i; k++) icon('e_gem', x + w / 2 - i * 14 + k * 28, y + 52, 44);
      text(p.name, x + w / 2, y + 96, 17, C.text, { stroke: false });
      text(`보석 ${(p.gems + p.bonus).toLocaleString()}${p.bonus ? ` (+${p.bonus})` : ''}`, x + w / 2, y + 118, 14, '#9fe3ff', { body: true, stroke: false });
      button(x + 16, y + 132, w - 32, 36, won(p.won), () => buyGemPack(p), { size: 16, kind: 'yellow' });
    }));
    withRise(3, () => { // 스타터 팩
      const x = 706, y = 116, w = 214, h = 176;
      panel(x, y, w, h, { sel: !save.starter });
      text('한 번만!', x + w / 2, y + 20, 13, C.danger, { stroke: false });
      drawImg(IMG.x_chest_gold_closed, x + w / 2, y + 54, 56);
      text(STARTER.name, x + w / 2, y + 84, 15, C.text, { stroke: false });
      wrapText(STARTER.desc, w - 24, 13).slice(0, 2).forEach((l, k, a) => text(l, x + w / 2, y + 108 - (a.length - 1) * 8 + k * fs(13) * 1.2, 13, C.sub, { body: true, stroke: false })); // 카드 폭 안에서 두 줄까지
      button(x + 16, y + 134, w - 32, 34, save.starter ? '샀어요 ✓' : won(STARTER.won), buyStarter, { size: 14, kind: 'yellow', disabled: save.starter });
    });
    withRise(4, () => { // 보석 → 진주
      panel(40, 306, 880, 120);
      text('보석으로 진주 바꾸기', 70, 334, 16, C.text, { align: 'left', stroke: false });
      EXCHANGE.forEach((x2, i) => button(70 + i * 250, 352, 230, 52, `보석 ${x2.gems} → 진주 ${x2.pearls.toLocaleString()}`, () => exchange(x2), { size: 14, kind: 'soft', disabled: save.gems < x2.gems }));
      text(`가진 보석 ${save.gems}`, 590, 334, 14, '#9fe3ff', { align: 'left', body: true, stroke: false });
      button(760, 316, 140, 36, '구매 복원', restoreBuys, { size: 14, kind: 'soft' });
    });
  } else if (shop.tab === 'tr') { // 보물: 왼쪽 끼운 칸 2개, 오른쪽 보물 8개
    save.trs = save.trs || []; save.trEq = save.trEq || [];
    panel(40, 118, 230, 350);
    text('끼운 보물', 155, 146, 17, C.text, { stroke: false });
    for (let i = 0; i < 2; i++) {
      const k = save.trEq[i], t = TREASURES.find((x) => x.k === k), y = 196 + i * 120;
      ctx.fillStyle = 'rgba(255,255,255,.06)'; rr(62, y - 44, 186, 100, 18); ctx.fill();
      ctx.strokeStyle = t ? C.yellow : 'rgba(255,255,255,.2)'; ctx.lineWidth = 2; ctx.setLineDash(t ? [] : [6, 6]); rr(62, y - 44, 186, 100, 18); ctx.stroke(); ctx.setLineDash([]);
      if (t) { drawImg(IMG['spr_tr_' + t.k], 104, y + 4, 62, Math.sin(T * 2 + i) * 0.08); text(t.name, 140, y - 14, 14, C.text, { align: 'left', body: true, stroke: false }); wrapText(t.desc, 100, 12).slice(0, 2).forEach((l, j) => text(l, 140, y + 8 + j * 18, 12, C.yellow, { align: 'left', body: true, stroke: false })); }
      else text('빈 칸', 155, y + 6, 14, C.mute, { body: true, stroke: false });
    }
    text('2개까지 끼울 수 있어요', 155, 446, 12, C.sub, { body: true, stroke: false, maxW: 230 });
    TREASURES.forEach((t, i) => withRise(i, () => {
      const x = 286 + (i % 4) * 160, y = 118 + Math.floor(i / 4) * 176, w = 150, h = 168, own = save.trs.includes(t.k), on = save.trEq.includes(t.k);
      panel(x, y, w, h, { sel: on, fill: on ? C.sel : t.gems && !own ? 'rgba(60,40,90,.9)' : undefined });
      drawImg(IMG['spr_tr_' + t.k], x + w / 2, y + 42, 56, Math.sin(T * 2 + i) * 0.06, own ? 1 : 0.55);
      text(t.name, x + w / 2, y + 84, 14, C.text, { body: true, stroke: false, maxW: w - 12 });
      text(t.desc, x + w / 2, y + 106, 12, C.yellow, { body: true, stroke: false, maxW: w - 12 });
      const price = t.gems ? `보석 ${t.gems}` : `진주 ${t.cost}`, can = t.gems ? save.gems >= t.gems : save.eggs >= t.cost;
      button(x + 10, y + 132, w - 20, 30, on ? '빼기' : own ? '끼우기' : price, () => tapTreasure(t), { size: 13, kind: on ? 'soft' : own ? 'primary' : t.gems ? 'yellow' : 'primary', disabled: !own && !can });
    }));
  } else if (shop.tab === 'skin') {
    panel(40, 118, 250, 350);
    drawTurnPreview(165, 266, 220);
    text(SKINS.find((s) => s.k === save.skin).name, 165, 398, 17, C.text, { body: true, stroke: false });
    [['basic', '기본 얼굴'], ['lash', '속눈썹 얼굴']].forEach(([f, label], i) => button(56 + i * 112, 418, 106, 36, label, () => { save.face = f; persist(); sfx.click(); }, { size: 13, kind: save.face === f ? 'primary' : 'soft' }));
    if (!save.skin || save.skin === 'basic') button(52, 128, 112, 32, save.noHat ? '모자 쓰기' : '모자 벗기', () => { save.noHat = !save.noHat; persist(); if (!REDUCE) shop.turn = { t: 0, from: save.skin }; sfx.click(); haptic(10); }, { size: 13, kind: save.noHat ? 'yellow' : 'soft' }); // 기본 옷: 모자 벗고 치장만
    const dg = gearEq('deco'); button(176, 128, 104, 32, dg ? (save.hideDeco ? '치장 보이기' : '치장 숨기기') : '치장 끼우기', () => { if (!dg) { shop.tab = 'bag'; gacha.bagKind = 'deco'; shop.tabAt = T; shop.tabDir = 1; } else { save.hideDeco = !save.hideDeco; persist(); } sfx.click(); }, { size: 12, kind: dg && !save.hideDeco ? 'soft' : 'primary' });
    const pages = Math.ceil(SKINS.length / 8), pg = clamp(shop.skinPage || 0, 0, pages - 1);
    const SK = [SKINS[0], ...SKINS.filter((s) => s.gems), ...SKINS.filter((s) => !s.gems && s.k !== 'basic')]; // 보석 옷은 앞자리(꾸미기 욕구: 제일 예쁜 걸 먼저 보이게)
    SK.slice(pg * 8, pg * 8 + 8).forEach((s, i) => withRise(i, () => {
      const x = 310 + (i % 4) * 154, y = 118 + Math.floor(i / 4) * 164, w = 144, h = 156, own = save.skins.includes(s.k), on = save.skin === s.k;
      panel(x, y, w, h, { sel: on, fill: on ? C.sel : s.gems && !own ? 'rgba(60,40,90,.9)' : undefined });
      drawImg(playerImg(s.k), x + w / 2, y + 56, 86, 0, own || s.gems ? 1 : 0.75); // 안 산 옷도 또렷하게(어떤 모습인지 보여야 갖고 싶음)
      if (s.gems && !own) { ctx.fillStyle = '#ff6fae'; rr(x + w - 52, y + 6, 46, 22, 11); ctx.fill(); text('추천', x + w - 29, y + 17, 12, '#ffffff', { stroke: false, weight: 800 }); }
      text(s.name, x + w / 2, y + 106, 14, C.text, { body: true, stroke: false });
      const price = s.gems ? `보석 ${s.gems}` : `진주 ${s.cost}`, can = s.gems ? save.gems >= s.gems : save.eggs >= s.cost;
      button(x + 12, y + 118, w - 24, 30, on ? '입는 중' : own ? '입기' : price, () => buySkin(s), { size: 13, kind: on ? 'soft' : own ? 'soft' : s.gems ? 'yellow' : 'primary', disabled: !own && !can });
    }));
    if (pages > 1) { // 인기 게임 옷장처럼 넘겨 보기
      button(560, 444, 52, 28, '◀', () => { shop.skinPage = (pg + pages - 1) % pages; sfx.click(); }, { size: 14, kind: 'soft' });
      text(`${pg + 1} / ${pages}`, 652, 458, 14, C.sub, { body: true, stroke: false });
      button(692, 444, 52, 28, '▶', () => { shop.skinPage = (pg + 1) % pages; sfx.click(); }, { size: 14, kind: 'soft' });
    }
  } else {
    panel(40, 118, 270, 350);
    drawImg(IMG.egg, 175, 240, 130, Math.sin(T * 6) * 0.12);
    text('알 부화', 175, 326, 22, C.text, { stroke: false });
    const left = PETS.length - save.pets.length;
    (left ? [`안 가진 펫 ${left}마리 중 하나`, `각 ${(100 / left).toFixed(1)}% (같은 확률)`] : ['다 모았어요']).forEach((l, k) => text(l, 175, 352 + k * fs(13) * 1.35, 13, C.sub, { body: true, stroke: false })); // 확률 공개 — 카드 폭에 맞게 두 줄
    button(234, 126, 68, 30, '확률', () => { probOpen = true; sfx.click(); }, { size: 13, kind: 'soft' });
    const all = save.pets.length >= PETS.length;
    button(64, 396, 222, 52, all ? '다 모았어요!' : (save.freeEgg ? '공짜 알 깨기!' : `진주 ${hatchCost()}개로 부화`), hatchPet, { size: 16, kind: 'yellow', disabled: all || save.eggs < hatchCost() });
    PETS.forEach((p, i) => withRise(i, () => {
      const x = 326 + (i % 3) * 206, y = 118 + Math.floor(i / 3) * 118, w = 198, h = 110, own = save.pets.includes(p.k), on = save.pet === p.k, lv = petLv(p.k);
      panel(x, y, w, h, { sel: on, fill: on ? C.sel : undefined, r: 16 });
      if (own) drawImg(IMG['pet_' + p.k], x + 38, y + 48, 58, Math.sin(T * 3 + i) * 0.08);
      else text('?', x + 38, y + h / 2, 40, C.mute, { stroke: false });
      const ty = own ? y + 20 : y + h / 2 - 12; // 못 만난 칸은 글자를 세로 가운데로
      text(own ? `${p.name} ${lv}단계` : '???', x + 74, ty, 15, C.text, { align: 'left', stroke: false });
      wrapText(own ? p.perk(lv) : '알을 깨서 만나요', 118, 13).slice(0, 2).forEach((l, k) => text(l, x + 74, ty + 22 + k * 18, 13, C.sub, { align: 'left', body: true, stroke: false }));
      if (own) {
        button(x + 8, y + 76, 86, 28, on ? '함께해요' : '데려가기', () => { save.pet = on ? null : p.k; persist(); sfx.click(); }, { size: 13, kind: on ? 'primary' : 'soft' });
        button(x + 100, y + 76, 90, 28, lv >= 5 ? '최고' : `키우기 ${PET_LV_COST[lv - 1]}`, () => levelPet(p.k), { size: 13, kind: 'soft', disabled: lv >= 5 || save.eggs < PET_LV_COST[lv - 1] });
      }
    }));
  }
  ctx.restore();
  if (shop.msgT > 0) text(shop.msg, sL + 6, H - 35, 16, '#ffffff', { align: 'left', stroke: false });
  else if (shop.tab !== 'skin') text(shop.tab === 'gacha' || shop.tab === 'bag' ? (kidMode() ? '어린이 모드 · 조개는 판에서 모은 진주로 열어요' : '보석은 결제로 사요 · 사기 전에 확률을 꼭 봐요 · 보스 유물은 팔지 않아요') : shop.tab === 'gem' ? (kidMode() ? '어린이 모드 · 돈으로 사는 상품이 없어요 · 거북알은 팔지 않아요' : PAY.real() ? '결제는 스토어로 · 보석은 게임 안에서만 · 거북알은 팔지 않아요' : '시험 결제 화면(실제로 돈이 나가지 않아요) · 거북알은 팔지 않아요') : '진주는 게임 안에서만 · 거북알·진주 모두 현금이 아니에요', sL + 6, H - 35, 13, C.sub, { align: 'left', body: true, stroke: false }); // 왼쪽 아래(오른쪽은 단추 자리)
  // 시안: 오른쪽 아래 — 동그란 뒤로 ↩ + 큰 노란 ▶ 출발
  const sr = 960 + OX() - SAFE - 16;
  button(sr - 250, H - 60, 250, 50, `▶ ${nameOf(shop.next)} 출발`, () => startLevel(shop.next), { size: 18, kind: 'yellow' });
  roundBtn('back', sr - 290, H - 35, 27, () => enterMap(), '지도로');
  if (shop.hatch) drawHatch();
}
function drawHatch() {
  const h = shop.hatch;
  buttons.length = 0;
  ctx.fillStyle = 'rgba(10,22,62,.86)'; ctx.fillRect(-OX(), 0, W, H);
  if (h.t < 1.3) {
    const k = h.t / 1.3, wob = Math.sin(h.t * (20 + k * 40)) * 0.25 * k;
    drawImg(IMG.egg, 480, H / 2 + 10, 200 + k * 30, wob);
    text('두근두근...', 480, 90, 28, '#ffffff', { stroke: false });
  } else {
    const k = Math.min(1, (h.t - 1.3) / 0.5);
    celebrateGlow(480, H / 2, 300, '255,213,74', k);
    drawImg(IMG['pet_' + h.pet.k], 480, H / 2 + 10, 220 * easeOutBack(k));
    text(`${h.pet.name} 탄생!`, 480, 80, 44, C.yellow, { lw: 8 });
    const pk = h.pet.perk(1); ctx.font = `800 ${fs(19)}px ${FONT}`; const pw = ctx.measureText(pk).width + 44; // 능력은 노란 띠로 강조
    ctx.globalAlpha = k; ctx.fillStyle = C.yellow; rr(480 - pw / 2, 446, pw, 40, 20); ctx.fill(); text(pk, 480, 466, 19, '#5a3000', { stroke: false, weight: 800 }); ctx.globalAlpha = 1;
    if (h.t > 1.9) text('눌러서 계속', 480, 510, 15, C.sub, { body: true, stroke: false });
  }
  buttons.push({ x: 0, y: 0, w: W, h: H, on: () => { if (h.t > 1.9) shop.hatch = null; } });
}

// ───────── 산호 쉼터 (축복 카드) ─────────
function drawBless() {
  ctx.fillStyle = 'rgba(10,22,62,.72)'; ctx.fillRect(-OX(), 0, W, H);
  const lv = G.blessKind === 'lv';
  if (lv) celebrateGlow(480, 80, 170, '255,214,110', 0.8);
  text(lv ? `레벨 업! Lv ${G.rlv}` : '산호 쉼터', 480, 70, 40, C.yellow, { lw: 8 });
  text(lv ? '능력 하나를 골라요 · 같은 걸 고르면 ★이 올라가요' : '잠깐 쉬어 가요. 하나만 골라요!', 480, 116, 18, C.text, { body: true });
  (G.bless || []).forEach((b, i) => withRise(i, () => {
    const x = 140 + i * 236, y = 140, w = 220, h = 300;
    const hover = mouse.x >= x + OX() && mouse.x <= x + OX() + w && mouse.y >= y && mouse.y <= y + h;
    panel(x, y - (hover ? 6 : 0), w, h, { fill: C.gray, sel: hover });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x + w / 2, y + 80, 4, x + w / 2, y + 80, 80); g.addColorStop(0, 'rgba(76,130,255,.35)'); g.addColorStop(1, 'rgba(76,130,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + w / 2, y + 80, 80, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    drawItemIcon(b.icon, x + w / 2, y + 72 + Math.sin(T * 3 + i) * 4, 68);
    text(b.name, x + w / 2, y + 140, 20, C.text, { stroke: false });
    if (b.lv) {
      if (b.max > 1 && b.max < 9) for (let k = 0; k < b.max; k++) text('★', x + w / 2 + (k - (b.max - 1) / 2) * 22, y + 112, 18, k < b.star + 1 ? C.yellow : 'rgba(255,255,255,.2)', { stroke: false });
      if (!b.star) { ctx.fillStyle = C.danger; rr(x + w - 58, y + 10, 46, 22, 11); ctx.fill(); text('NEW', x + w - 35, y + 21, 13, '#fff', { stroke: false }); }
    }
    const lh = fs(14) * 1.3; // 줄 간격은 실제 글자 크기 기준 (폰에서 글자가 커져도 안 겹치게)
    wrapText(b.desc, w - 28, 14).slice(0, 2).forEach((l, k) => text(l, x + w / 2, y + 140 + fs(20) * 0.9 + 8 + k * lh, 14, C.sub, { body: true, stroke: false }));
    button(x + 20, y + h - 58, w - 40, 46, isTouch ? '고르기' : `고르기 (${i + 1})`, () => chooseBless(i), { size: 15 });
  }));
}

// ───────── 결과 화면 ─────────
function drawRevive() { // 조사 D 규칙: 시간 압박(카운트다운)·아깝다는 문구 없이, 두 버튼 같은 크기
  ctx.fillStyle = 'rgba(10,22,62,.66)'; ctx.fillRect(-OX(), 0, W, H);
  drawImg(IMG.comfort, 190, 230 + Math.sin(T * 2) * 6, 250);
  panel(RC.x, 104, RC.w, 316); // 다른 결과 화면과 같은 유리 판 + 리본
  if (!ribbon(RM, 112, 360, '이어서 할까요?', 24)) text('이어서 할까요?', RM, 154, 30, '#ffffff', { stroke: false });
  const pk = G.cfg.endless ? 0 : clamp(progress(), 0, 1);
  text(G.cfg.endless ? `지금 ${meters()}미터` : `지금 ${Math.floor(pk * 100)}%`, RM, 180, 30, '#ffffff', { lw: 5 });
  if (!G.cfg.endless) { // 어디까지 왔는지(조사 D: 아깝다는 문구·카운트다운 없이 사실만)
    ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(RL, 210, RR - RL, 12, 6); ctx.fill();
    ctx.fillStyle = C.blueD; rr(RL, 210, Math.max(12, (RR - RL) * pk), 12, 6); ctx.fill();
    drawImg(IMG.princess, RR + 4, 216, 30);
  }
  drawItemIcon('heart', RM - 150, 254, 26); text('기운을 채우고 이 자리에서 다시 출발해요', RM - 132, 254, 15, C.text, { align: 'left', body: true, stroke: false });
  const cost = reviveCost(), ok = canRevive(), bw = (RR - RL - 12) / 2;
  button(RL, 298, bw, 64, G.freeRevive ? '공짜로 일어나기' : `이어하기 · 진주 ${cost}`, doRevive, { size: 17, kind: G.freeRevive ? 'yellow' : 'primary', disabled: !ok });
  button(RL + bw + 12, 298, bw, 64, '결과 보기', giveUp, { size: 17, kind: 'soft' });
  text(ok || G.freeRevive ? `이번 판에서 모은 진주 ${G.eggs}개로` : `이번 판 진주가 ${cost - G.eggs}개 모자라요 (모아 둔 진주는 안 써요)`, RM, 390, 13, C.sub, { body: true, stroke: false });
}
// ───────── 결과 화면 공통: 오른쪽 카드 한 장 · 안쪽 여백 32 · 표처럼 정렬 · 아래 단추 한 줄 ─────────
const RC = { x: 380, y: 40, w: 556, h: 476 }, RL = RC.x + 32, RR = RC.x + RC.w - 32, RM = RC.x + RC.w / 2;
function resultCard() { panel(RC.x, RC.y, RC.w, RC.h, { fill: 'rgba(27,28,31,.94)' }); }
function cardDivider(y) { ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(RL, y, RR - RL, 1); }
function rewardRow(y, iconFn, label, value, color = C.text, sub) {
  iconFn(RL + 12, y);
  text(label, RL + 34, y + 1, 15, C.text, { align: 'left', body: true, stroke: false });
  if (sub) text(sub, RL + 34 + measureW(label, 15) + 10, y + 1, 12, C.sub, { align: 'left', body: true, stroke: false });
  text(value, RR, y + 1, 17, color, { align: 'right', stroke: false });
}
function measureW(s, size) { ctx.font = `600 ${fs(size)}px ${FONT}`; return ctx.measureText(s).width; }
function sayBubble(x, y, w, line, color = '#ffffff') { // 왼쪽 캐릭터 아래 말풍선
  let lines = wrapText(line, w - 32, 14);
  if (lines.length > 1 && line.includes(', ')) { const parts = line.split(', ').map((p, i, a) => (i < a.length - 1 ? p + ',' : p)); if (parts.every((p) => measureW(p, 14) <= w - 32)) lines = parts; } // 끊을 땐 쉼표에서(「…하지 / 마세요」처럼 어색하게 안 끊기게)
  lines = lines.slice(0, 2);
  const lh = fs(14) * 1.4, pad = 16, h = pad * 2 + lines.length * lh; // 위아래 여백 같게
  panel(x - w / 2, y, w, h, { r: 16 }); // 말풍선도 코덱스 판
  ctx.fillStyle = 'rgba(12,40,92,.92)'; ctx.beginPath(); ctx.moveTo(x - 9, y + 9); ctx.lineTo(x, y - 6); ctx.lineTo(x + 9, y + 9); ctx.closePath(); ctx.fill(); // 꼬리: 판 속과 같은 남색(예전 검은 삼각형 X)
  lines.forEach((l, i) => text(l, x, y + pad + lh * (i + 0.5), 14, color, { body: true, stroke: false })); // 줄마다 가운데
}
function bottomButtons(primaryLabel, primaryFn, secondary) { // 아래부터: 판 끝 26 · 작은 단추 34 · 사이 20 · 큰 단추 48 (테·그림자 두께 4~8까지 셈)
  const yS = RC.y + RC.h - 26 - 34, yP = yS - 20 - 48;
  roundBtn('home', RL + 24, yP + 24, 24, () => enterMap(), '지도');
  button(RL + 62, yP, RR - RL - 62, 48, primaryLabel, primaryFn, { size: 21, kind: 'yellow' });
  const n = secondary.length, gap = 16, bw = (RR - RL - gap * (n - 1)) / n;
  secondary.forEach(([label, fn], i) => button(RL + i * (bw + gap), yS, bw, 34, label, fn, { size: 14, kind: 'soft' }));
}
const restToday = () => { toast('오늘도 잘했어요! 내일 또 만나요 🐢', C.ok); enterMap(); }; // 「오늘은 여기까지」(조사: 같은 크기로 보이게)
const HIT_TIPS = { tired: '분홍 기운 물약을 먹으면 기운이 차요 · 필살기 중엔 기운이 안 줄어요', urchin: '가시는 점프로 넘어요 · 짧게 톡 = 낮게', shark: '빨간 ! 뒤 상어: 땅 줄이면 점프, 머리 줄이면 숙이기', eel: '빨간 줄은 곰치 돌진 — 바로 점프!', swordfish: '청새치는 머리 높이 — 오른쪽 꾹 숙이기', rock: '보라 기둥은 숙이기, 바위는 점프(위에서 밟으면 부서져요)', mine: '기뢰 아래 가시는 짧게 톡!', boss: '큰 적 띠 글자를 봐요: ↑ 뛰어요 / ↓ 숙여요', jelly: '해파리는 위에서 밟으면 통통!', puffer: '부푼 복어는 못 밟아요 — 일찍 높게', crab: '게는 위에서 밟으면 끝!', ray: '가오리는 머리 높이 — 숙이기', phantom: '유령 해파리는 숙여서 지나가요', angler: '아귀가 덥석 오면 점프!' };
function drawDead() {
  const a = Math.min(1, G.deadT / 0.25), endless = G.cfg.endless;
  ctx.fillStyle = `rgba(10,22,62,${0.66 * a})`; ctx.fillRect(-OX(), 0, W, H);
  ctx.save(); ctx.globalAlpha = a;
  drawImg(IMG.comfort, 190, 230 + Math.sin(T * 2) * 6, 260);
  sayBubble(190, 380, 300, '느려도 괜찮아요, 포기만 하지 마세요');
  resultCard();
  const dt0 = G.fellPit ? '풍덩! 빠졌어요' : '쿵! 부딪혔어요'; // 구멍이면 빠졌다고
  if (!ribbon(RM, RC.y + 12, 380, dt0, 24, true)) text(dt0, RM, RC.y + 42, 30, '#ff9aa8', { lw: 6 });
  text(endless ? `${G.prog}미터` : `${G.prog}%`, RM, RC.y + 86, 44, '#ffffff');
  if (!endless) {
    const by = RC.y + 116; // 아래 점수 줄과 18 띄움
    ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(RL, by, RR - RL, 12, 6); ctx.fill();
    ctx.fillStyle = C.blueD; rr(RL, by, Math.max(12, (RR - RL) * G.prog / 100), 12, 6); ctx.fill();
    if (G.prevBest > 0) { const fx2 = RL + (RR - RL) * Math.min(1, G.prevBest / 100); ctx.fillStyle = C.yellow; ctx.fillRect(fx2 - 2, by - 5, 4, 22); }
  }
  const line2 = G.newBest ? '최고 기록 갱신!' : !endless && G.prevBest >= 100 ? `이미 깬 바다 · 별 ${save.stars[G.n] || 0}/3` : `최고까지 ${G.prevBest - G.prog}${endless ? '미터' : '%'}${G.lastProg != null ? ` · 지난번 ${G.lastProg}% → 이번 ${G.prog}%` : ''}`;
  text(`점수 ${(G.score || 0).toLocaleString()}${G.prevBestScore ? ` · 최고 ${Math.max(G.prevBestScore, G.score || 0).toLocaleString()}` : ''}`, RM, RC.y + 150, 14, C.sub, { body: true, stroke: false });
  text(line2, RM, RC.y + 172, 14, G.newBest ? C.yellow : C.text, { body: true, stroke: false });
  cardDivider(RC.y + 192);
  rewardRow(RC.y + 210, (x, y) => drawPearl(x, y, 20), '진주', `+${G.eggs}`, C.yellow, `가진 진주 ${save.eggs.toLocaleString()}`);
  rewardRow(RC.y + 244, (x, y) => { ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); text(String(save.lv), x, y + 1, 12, '#fff', { stroke: false }); }, '경험치', `+${G.xpGain || 0}`, '#cfe0ff', `Lv ${save.lv} · ${Math.floor((save.xp / xpNeed(save.lv)) * 100)}%`);
  if (G.appEgg) rewardRow(RC.y + 278, (x, y) => drawImg(IMG.egg, x, y, 22), '거북알', G.appEgg.eggs ? `+${G.appEgg.eggs}` : '—', C.yellow, G.appEgg.eggs ? (G.appEgg.server ? `오늘 ${G.appEgg.runs}/3` : `앱에서 받음 · 오늘 ${G.appEgg.runs}/3`) : G.appEgg.short ? '짧은 판' : '오늘 3판 다 받음');
  const tip = G.helpNext ? '다음 판은 방패 하나를 그냥 줄게요 ♥ 같이 가요!' : G.fellPit ? '구멍 바로 앞에서 톡! 발판은 끝까지 가서 뛰어요' : HIT_TIPS[G.lastHit] || '박자에 맞춰 뛰면 타이밍이 쉬워요';
  ctx.fillStyle = G.helpNext ? 'rgba(255,111,168,.16)' : 'rgba(255,213,74,.1)'; rr(RL, RC.y + 300, RR - RL, 32, 10); ctx.fill();
  text(G.helpNext ? tip : `💡 ${tip}`, RL + 14, RC.y + 316, 13, G.helpNext ? '#ffc4dc' : C.yellow, { align: 'left', body: true, stroke: false });
  ctx.restore();
  bottomButtons('다시 하기 ▶', () => startLevel(G.n), [['상점', () => openShop(G.n)], ['오늘은 여기까지', restToday]]);
  drawResultOverlay();
}
const CLEAR_LINES = ['아멜리아 공주의 왕관 조각을 찾았어요!', '상어왕의 발자국이 이어져요...', '바다 친구들이 응원해요!', '조금씩, 그래도 앞으로!', '공주님 목소리가 들려요!', '거의 다 왔어요!', '상어왕의 성이 보여요!'];
const BOSS_LINES = {
  5: '앗, 여긴 상어 대장 집이었어요! 공주님은 더 깊은 곳에!',
  10: '대왕 문어가 그러는데... 공주님은 깊은 바다로 갔대요!',
  15: '아귀 대왕도 이겼어요! 공주님 목소리가 가까워져요!',
  20: '상어 대장이 도망쳤어요! 이제 얼음 불꽃 바다로!',
  25: '번개 해파리 여왕이 길을 열어 줬어요. 상어왕의 성이 코앞!',
  30: '상어왕이 공주님을 데리고 노을 바다로 도망쳤어요! 쫓아가요!',
  35: '해적 문어 선장이 보물 지도를 떨어뜨렸어요. 공주님은 더 깊은 곳에!',
  40: '아귀 여왕의 보물고 너머에 심연의 왕궁이 보여요!',
  45: '왕꽃게가 집게를 내려놨어요! 이제 상어왕만 남았어요!',
};
// 결과 순서(인기 게임 결과 화면을 따라): 0.3초 점수가 굴러 오름(1.2초, 따르륵) → 쾅 → 신기록 띠 → 별 하나씩 → 진주 → 경험치. 화면을 누르면 바로 끝으로
const SCORE_AT = [0.3, 1.5], STAR_AT = [1.95, 2.2, 2.45], EGG_AT = 2.7;
function scoreRoll() { const k = clamp((endT - SCORE_AT[0]) / (SCORE_AT[1] - SCORE_AT[0]), 0, 1); return Math.round(G.score * (1 - Math.pow(1 - k, 3))); }
function updateScoreRoll() {
  if (endT > SCORE_AT[0] && endT < SCORE_AT[1]) { G.rollT = (G.rollT || 0) - 1 / 60; if (G.rollT <= 0) { G.rollT = 0.05; snd('count', 0.5, 1 + clamp((endT - SCORE_AT[0]) / 1.2, 0, 1) * 0.6); } }
  if (endT >= SCORE_AT[1] && !G.rollDone) { G.rollDone = true; snd('react', 0.9); shake = 6; haptic(30); if (G.newBestScore) { snd('lvup', 0.9, 1, 0, 0.25); confetti(80); } }
}
function updateClear() { updateScoreRoll();
  if (endT < 4 && Math.random() < 0.035) fireworks(1, 520 + OX(), W - 40 - SAFE, 40);
  const shown = Math.floor(G.eggs * clamp((endT - EGG_AT) / 0.8, 0, 1));
  if (shown > (G.eggShown || 0)) snd('count', 0.35, 1 + (shown % 7) * 0.03, 0.06);
  G.eggShown = shown;
  while (G.starShown < 3 && endT >= STAR_AT[G.starShown]) {
    const i = G.starShown++, got = G.starGot[i];
    sfx.star(i, got);
    if (got) snd('stomp', 0.9, 1 + i * 0.12, 0, 0.22); // 별이 쾅 박히는 순간(0.22초 뒤)
    if (got) { shake = 8 + i * 3; haptic(30 + i * 15); burst(500 + OX() + i * 110, 250, '#ffe36b', 18, 300); }
  }
}
// 점수 덩어리: 「점수」 + 굴러 오르는 큰 숫자 + (신기록이면 비스듬한 금빛 띠, 아니면 최고 기록)
function drawScoreBlock(y) {
  const v = scoreRoll(), done = endT >= SCORE_AT[1], pop = done ? 1 + Math.max(0, 0.25 - (endT - SCORE_AT[1]) * 1.2) : 1;
  text('점수', RM, y - 30, 13, C.sub, { body: true, stroke: false });
  ctx.save(); ctx.translate(RM, y); ctx.scale(pop, pop); text(v.toLocaleString(), 0, 0, 40, '#ffffff', { lw: 6 }); ctx.restore();
  if (done && G.newBestScore) {
    const a = endT - SCORE_AT[1], s2 = a < 0.2 ? 2 - a / 0.2 : 1;
    ctx.save(); ctx.translate(RM + 150, y - 26); ctx.rotate(-0.14); ctx.scale(s2, s2); ctx.globalAlpha = Math.min(1, a / 0.1);
    ctx.fillStyle = '#ffcf3a'; rr(-58, -15, 116, 30, 8); ctx.fill(); text('신기록!', 0, 1, 16, '#5a3a00', { stroke: false }); ctx.restore();
    text(`+${(G.score - G.prevBestScore).toLocaleString()}`, RM, y + 30, 13, C.yellow, { body: true, stroke: false });
  } else if (done && G.prevBestScore) text(`최고 ${Math.max(G.prevBestScore, G.score).toLocaleString()}`, RM, y + 30, 13, C.sub, { body: true, stroke: false });
}
function drawClear() {
  ctx.fillStyle = 'rgba(10,22,62,.55)'; ctx.fillRect(-OX(), 0, W, H);
  drawConfetti();
  { // 승리 동작(코덱스) + 뒤에서 도는 빛줄기 — 옷·변신이면 그 모습으로
    celebrateGlow(190, 230, 220, '255,215,90', 1);
    const plain = (!save.skin || save.skin === 'basic') && !(typeof gearEq === 'function' && gearEq('form')), hop = Math.abs(Math.sin(T * 4)) * -16, sq = 1 + Math.sin(T * 8) * 0.03;
    const im = plain && ready(IMG.pose_hero_win) ? IMG.pose_hero_win : (typeof formImg === 'function' && formImg()) || IMG.cheer;
    ctx.save(); ctx.translate(190, 230 + hop); ctx.scale(1 / sq, sq); drawImg(im, 0, 0, 260); ctx.restore();
  }
  if (save.pet) drawImg(IMG['pet_' + save.pet], 300, 320 + Math.abs(Math.sin(T * 4 + 1)) * -10, 62);
  drawCloser(190, 372);
  resultCard();
  if (!ribbon(RM, RC.y + 10, 400, `${G.n}번 바다 성공!`, 24)) text(`${G.n}번 바다 성공!`, RM, RC.y + 36, 24, C.yellow, { lw: 5 });
  if (save.diff === 2) icon('e_crown', RM + 120, RC.y + 34, 26, Math.sin(T * 4) * 0.1);
  drawScoreBlock(RC.y + 96);
  const labels = ['도착', '진주 70%', '안 맞기'];
  for (let i = 0; i < 3; i++) { // 시안: 큰 별 셋(가운데가 조금 높게), 글자는 별 아래 띄워서
    const x = RM + (i - 1) * 118, y = RC.y + 162 - (i === 1 ? 6 : 0), shown = i < G.starShown, got = G.starGot[i];
    const age = endT - STAR_AT[i], k = clamp(age / 0.22, 0, 1), sc = shown ? (got ? (age < 0.22 ? 2.4 - k * 1.4 : 1 + Math.max(0, 0.12 - (age - 0.22)) * 1.5) : 1) : 0; // 쾅: 크게 위에서 떨어져 박힘 → 살짝 튐
    drawStar(x, y, 27, false);
    if (shown && got) {
      if (age >= 0.22 && age < 0.7) { const a2 = 1 - (age - 0.22) / 0.48; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a2; ctx.strokeStyle = '#ffe36b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 30 + (1 - a2) * 40, 0, Math.PI * 2); ctx.stroke(); for (let r2 = 0; r2 < 8; r2++) { const an = r2 * Math.PI / 4; drawImg(IMG.spr_fx_spark, x + Math.cos(an) * (34 + (1 - a2) * 36), y + Math.sin(an) * (34 + (1 - a2) * 36), 18, an, a2); } ctx.restore(); }
      ctx.save(); ctx.translate(x, y); ctx.rotate(age < 0.22 ? (1 - k) * -0.6 : 0); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, 0.4 + k); drawStar(0, 0, 27, true); ctx.restore();
    }
    text(labels[i], x, RC.y + 202, 13, shown && got ? C.yellow : C.sub, { body: true, stroke: false });
  }
  cardDivider(RC.y + 220);
  // 받은 것(표): 진주는 굴러 오르고, 보너스는 하나씩 붙음 — 보너스 칸이 판 폭을 넘으면 다음 줄로
  rewardRow(RC.y + 238, (x, y) => drawPearl(x, y, 20), '진주', `+${G.eggShown || 0}`, C.yellow, G.diffBonus ? `난이도 ${G.diffBonus > 0 ? '+' : ''}${G.diffBonus}` : '');
  // 보너스 칸은 한 줄만: 넘치면 남은 것을 「그 밖 +합계」 하나로 묶음(아래 줄·단추와 안 겹치게)
  const shownS = (G.settle || []).filter((it, i) => endT - (EGG_AT + 0.5 + i * 0.35) >= 0), chips = [];
  { let used = 0; const room = RR - (RL + 34);
    for (let i = 0; i < shownS.length; i++) {
      const it = shownS[i], lab = `${it.s} +${it.v}`, w = measureW(lab, 12) + 20, rest = shownS.slice(i + 1).reduce((t, o) => t + o.v, 0);
      const restW = rest ? measureW(`그 밖 +${rest}`, 12) + 28 : 0;
      if (used + w + (i < shownS.length - 1 ? restW : 0) > room && chips.length) { const sum = shownS.slice(i).reduce((t, o) => t + o.v, 0); chips.push({ lab: `그 밖 +${sum}`, w: measureW(`그 밖 +${sum}`, 12) + 20, i }); break; }
      chips.push({ lab, w, i }); used += w + 8;
    } }
  let px = RL + 34;
  chips.forEach((c) => {
    const it = G.settle[c.i], age = endT - (EGG_AT + 0.5 + c.i * 0.35);
    shownS.forEach((o, k) => { if (!o.played && endT - (EGG_AT + 0.5 + k * 0.35) >= 0) { o.played = true; snd('count', 0.8, 1 + k * 0.12); haptic(10); } });
    const s2 = age < 0.12 ? 0.6 + (age / 0.12) * 0.4 : 1;
    ctx.save(); ctx.translate(px + c.w / 2, RC.y + 264); ctx.scale(s2, s2);
    ctx.fillStyle = 'rgba(255,213,74,.14)'; rr(-c.w / 2, -11, c.w, 22, 11); ctx.fill();
    text(c.lab, 0, 1, 12, C.yellow, { body: true, stroke: false }); ctx.restore();
    px += c.w + 8;
  });
  const ry = RC.y + 238 + ((G.settle || []).length ? 58 : 32); // 보너스 칩 줄이 있을 때만 그만큼 내림(빈 칸 없이)
  rewardRow(ry, (x, y) => { ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); text(String(save.lv), x, y + 1, 12, '#fff', { stroke: false }); }, '경험치', `+${G.xpGain || 0}`, '#cfe0ff', `Lv ${save.lv} · ${Math.floor((save.xp / xpNeed(save.lv)) * 100)}%`);
  if (G.appEgg) rewardRow(ry + 30, (x, y) => drawImg(IMG.egg, x, y, 22), '거북알', G.appEgg.eggs ? `+${G.appEgg.eggs}` : '—', C.yellow, G.appEgg.eggs ? (G.appEgg.server ? `오늘 ${G.appEgg.runs}/3` : `앱에서 받음 · 오늘 ${G.appEgg.runs}/3`) : '오늘 3판 다 받음');
  bottomButtons('다음 바다로 ▶', () => enterMap(G.n), [['상점', () => openShop(G.n + 1)], ['다시 하기', () => startLevel(G.n)], ['오늘은 여기까지', restToday]]);
  drawResultOverlay();
}
// ───────── 엔딩: 승리 폭발 → 거품 감옥이 깨지고 아멜리아가 빛기둥 타고 내려옴 → 만남(하트 폭발) → 대화 → 친구가 된 보스 퍼레이드·기록 결산·전설 보상 ─────────
const endFx = [];
function endBurst(x, y, n, cols, sp = 520, kind = 'dot') { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = rand(sp * 0.3, sp); endFx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.8, 1.6), max: 1.6, c: pick(cols), s: rand(3, 7), kind, rot: rand(0, 6) }); } }
function endFirework() { const x = rand(140, 820), y = rand(70, 220); endBurst(x, y, 46, pick([['#ffd34d', '#ffffff'], ['#ff6fae', '#ffd1ef'], ['#7cf0ff', '#ffffff'], ['#b48bff', '#ffd34d']]), 360); snd('firework', 0.6, rand(0.9, 1.15)); }
function drawEndFx(dt) {
  for (const f of endFx) { f.life -= dt; f.vx *= 1 - dt * 1.6; f.vy = f.vy * (1 - dt * 1.6) + 220 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += dt * 6; }
  for (let i = endFx.length - 1; i >= 0; i--) if (endFx[i].life <= 0) endFx.splice(i, 1);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const f of endFx) { ctx.globalAlpha = Math.min(1, f.life / f.max * 1.6); if (f.kind === 'heart') { text('♥', f.x, f.y, f.s * 4, f.c, { stroke: false }); continue; } ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, f.s, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore(); ctx.globalAlpha = 1;
}
// 결과 화면 왼쪽: 「아멜리아에게 한 바다 더 가까이」 — 길 위의 터틀이가 한 칸 다가가고, 끝엔 거품 속 아멜리아가 부름
function drawCloser(cx, y) {
  const n = G.n === ENDLESS ? 0 : G.n, rem = LAST - n, k = easeOutCubic(clamp((endT - 0.4) / 1.2, 0, 1)), w = 300, x0 = cx - w / 2;
  panel(x0 - 14, y - 20, w + 28, 128, { r: 18 });
  const L = x0 + 18, R = x0 + w - 44, prog = lerp((n - 1) / LAST, n / LAST, k), tx = lerp(L, R, prog);
  ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(L, y + 18, R - L, 10, 5); ctx.fill();
  const g = ctx.createLinearGradient(L, 0, R, 0); g.addColorStop(0, '#5fd4ff'); g.addColorStop(1, '#ff8fc8'); ctx.fillStyle = g; rr(L, y + 18, Math.max(10, tx - L), 10, 5); ctx.fill();
  drawHero(tx, y + 10, 34, 0, { ph: T * 12, stand: true });
  const ax = R + 22; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ax, y + 18, 22, 0, Math.PI * 2); ctx.stroke();
  drawImg(IMG.spr_amelia_scared || IMG.spr_amelia, ax, y + 22 + Math.sin(T * 3) * 2, 40, 0, 1, true);
  text(G.n === ENDLESS ? '끝없는 바다' : rem > 0 ? `아멜리아까지 ${rem}바다` : '아멜리아에게!', cx, y + 52, 17, '#ffd1ef', { lw: 4 });
  const line = BOSS_LINES[n] || (rem <= 5 ? '바로 앞이야! 조금만 더 와 줘!' : rem <= 15 ? '네 발소리가 들려! 와 줘!' : '보여! 조금만 더 와 줘!');
  wrapText(line, w - 10, 13).slice(0, 2).forEach((l, i) => text(l, cx, y + 76 + i * fs(13) * 1.4, 13, 'rgba(255,255,255,.85)', { body: true, stroke: false }));
}
function drawEnding() {
  const e = endT, dt = Math.min(0.05, e - (G.endPrev || 0)); G.endPrev = e;
  const ev = (k, at, fn) => { if (e >= at && !G['ev_' + k]) { G['ev_' + k] = 1; fn(); } }; // 시각마다 한 번씩 터뜨림
  // 배경: 어둡게 + 뒤에서 도는 금빛 햇살(점점 밝아짐)
  ctx.fillStyle = 'rgba(14,6,40,.55)'; ctx.fillRect(-OX(), 0, W, H);
  const glow = clamp((e - 0.2) / 1.2, 0, 1);
  celebrateGlow(480, 250, 420, '255,214,110', glow);
  // 1) 승리 폭발(0~1.3초)
  ev('boom', 0, () => { flash = 0.8; flashColor = '#ffffff'; shake = 26; haptic([80, 40, 160]); snd('ult_impact', 1); endBurst(480, 120, 80, ['#ffd34d', '#ffffff', '#ff9a1f'], 760); });
  ev('fw1', 0.5, endFirework); ev('fw2', 0.8, endFirework); ev('fw3', 1.1, endFirework);
  const fin = G.finAt ? clamp((e - G.finAt) / 0.6, 0, 1) : 0; // 마무리: 리본은 위로 작게, 둘은 양옆으로 벌어져 상자 자리를 비움
  const ts = (e < 0.45 ? 2.6 - (e / 0.45) * 1.6 : 1 + Math.max(0, 0.12 - (e - 0.45)) * 2) * (1 - 0.2 * fin);
  ctx.save(); ctx.translate(480, 64 - 22 * fin); ctx.scale(ts, ts); ctx.rotate(e < 0.45 ? (1 - e / 0.45) * -0.2 : 0);
  if (!ribbon(0, 0, 520, '아멜리아 공주 구출 성공!!', 30)) text('아멜리아 공주 구출 성공!!', 0, 0, 44, C.yellow, { lw: 8 });
  ctx.restore();
  // 2) 거품 감옥 → 깨짐(2.3초) → 빛기둥 타고 내려옴
  const popAt = 2.3, ax = 600 + 140 * fin, landY = 300, down = clamp((e - popAt - 0.3) / 1.1, 0, 1), ay = lerp(175, landY, easeOutBack(down) * 0.95 + down * 0.05);
  if (e < popAt) { const sh = e > 1.4 ? Math.sin(e * 60) * (e - 1.4) * 5 : 0; ctx.save(); ctx.translate(ax + sh, 175); drawImg(IMG.spr_amelia_scared || IMG.spr_amelia, 0, 4, 150, 0, 1, true); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.stroke(); if (e > 1.4) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; for (let k = 0; k < Math.floor((e - 1.4) * 8); k++) { const a2 = k * 1.3; ctx.beginPath(); ctx.moveTo(Math.cos(a2) * 92, Math.sin(a2) * 92); ctx.lineTo(Math.cos(a2 + 0.2) * 60, Math.sin(a2 + 0.2) * 60); ctx.stroke(); } } ctx.restore(); }
  ev('pop', popAt, () => { flash = 0.6; flashColor = '#ffe6f6'; shake = 16; snd('break', 1, 1.2); snd('tada', 1); endBurst(ax, 175, 60, ['#ffffff', '#bfefff', '#ffd1ef'], 620); });
  if (e >= popAt) {
    if (down < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85 * (1 - down * 0.6); drawImg(IMG.spr_fx_pillar, ax, 210, 520); ctx.restore(); }
    drawImg(IMG.spr_amelia_cheer || IMG.spr_amelia, ax, ay - (down >= 1 ? Math.abs(Math.sin(T * 4)) * 10 : 0), 190, 0, 1, true);
  }
  // 3) 터틀이가 왼쪽에서 달려와 폴짝(승리 동작)
  const run = clamp((e - 2.7) / 0.9, 0, 1), hx = lerp(-120, 360, easeOutCubic(run)) - 140 * fin, hy = 305 - Math.sin(run * Math.PI) * 60 - (run >= 1 ? Math.abs(Math.sin(T * 4 + 1)) * 10 : 0);
  if (e >= 2.6) { const win = ready(IMG.pose_hero_win) && (!save.skin || save.skin === 'basic') && !(typeof gearEq === 'function' && gearEq('form')) ? IMG.pose_hero_win : (typeof formImg === 'function' && formImg()) || IMG.cheer; drawImg(win, hx, hy, 210); }
  ev('meet', 3.7, () => { endBurst(480, 260, 40, ['#ff6fae', '#ff8fc8', '#ffd1ef'], 520, 'heart'); snd('levelup', 0.9); haptic([30, 30, 60]); endFirework(); });
  if (e >= 3.7 && e < 6) for (let i = 0; i < 6; i++) { const t2 = (T * 0.7 + i / 6) % 1; ctx.globalAlpha = 1 - t2; text('♥', 480 + Math.sin(t2 * 8 + i) * 50, 250 - t2 * 120, 22 + i * 3, '#ff6fa8', { stroke: '#fff', lw: 3 }); } ctx.globalAlpha = 1;
  if (e > 1.2 && Math.random() < dt * 1.4) endFirework(); // 내내 불꽃놀이
  drawEndFx(dt);
  // 4) 대화(4.2초부터)
  const ti = G.talkI || 0;
  if (e > 4.2 && ti < ENDING_TALK.length) {
    const ln = ENDING_TALK[ti]; if (G.talkAt < 4.2) G.talkAt = 4.2;
    G.talkShown = Math.min(ln.text.length, (G.talkShown || 0) + 0.45);
    panel(60, 404, 840, 112);
    ctx.save(); ctx.beginPath(); ctx.arc(128, 460, 42, 0, Math.PI * 2); ctx.fillStyle = ln.who === 'princess' ? '#ffd1e6' : '#cfe9ff'; ctx.fill(); ctx.clip();
    drawImg(ln.who === 'princess' ? IMG.spr_amelia_cheer || IMG.princess : IMG.pose_hero_win || IMG.hello, 128, 478, 110, 0, 1, ln.who === 'princess'); ctx.restore();
    text(WHO[ln.who], 188, 428, 17, ln.who === 'princess' ? '#ffb6dc' : C.yellow, { align: 'left', stroke: false });
    wrapText(ln.text.slice(0, Math.floor(G.talkShown)), 680, 20).forEach((l, k) => text(l, 188, 458 + k * 28, 20, '#ffffff', { align: 'left', body: true, stroke: false }));
    if (G.talkShown >= ln.text.length && Math.sin(T * 8) > 0) text('▼', 872, 498, 16, C.yellow, { stroke: false });
    if (G.talkShown >= ln.text.length && e - G.talkAt > ln.text.length / 27 + 2.6) endingTap();
    return;
  }
  if (e <= 4.2) return;
  // 5) 마무리: 친구가 된 보스 퍼레이드 + 기록이 굴러 오름 + 전설 보상 상자
  if (!G.finAt) { G.finAt = e; snd('mission', 1); }
  const f = e - G.finAt;
  const parade = ['boss_shark', 'boss_octopus', 'boss_angler', 'boss_jelly', 'boss_pirate', 'boss_crab', 'boss_king'];
  parade.forEach((k, i) => { const x = ((f * 70 + i * 150) % 1250) - 160, bob = Math.abs(Math.sin(T * 5 + i)) * -12; drawImg(IMG['spr_' + k], x, 486 + bob, k === 'boss_king' ? 96 : 76, Math.sin(T * 5 + i) * 0.08, 0.95); if (Math.sin(T * 2 + i) > 0.6) text('♪', x + 30, 430 + bob, 18, '#ffffff', { stroke: false }); });
  text('친구가 된 바다 친구들이 축하해요!', 480, 528, 14, 'rgba(255,255,255,.8)', { body: true, stroke: false });
  // 기록(0.3초 간격으로 하나씩, 숫자는 굴러 오름)
  const stats = [['건넌 바다', LAST, '개'], ['모은 별', totalStars(), '개'], ['달린 판', save.runs, '판'], ['거북 레벨', save.lv, '']];
  stats.forEach(([lab, v, u], i) => { const k = clamp((f - 0.3 - i * 0.3) / 0.8, 0, 1); if (k <= 0) return; const x = 120 + i * 240, y = 98;
    flatPill(x - 100, y - 4, 200, 66, 18); text(lab, x, y + 14, 14, 'rgba(255,255,255,.75)', { body: true, stroke: false });
    text(`${Math.round(v * easeOutCubic(k)).toLocaleString()}${u}`, x, y + 42, 26, C.yellow, { lw: 5 }); });
  // 전설 보상(1.8초에 상자 → 2.4초 펑)
  if (!save.endReward && f > 2.4) { save.endReward = true; save.gems += 500; save.eggs += 3000; if (typeof grant === 'function') { const g = gearOf('r_king'); if (g && !gearOwn('r_king')) grant(g); } persist(); flash = 0.7; flashColor = '#fff2b0'; shake = 18; endBurst(480, 270, 90, ['#ffd34d', '#ffffff', '#ff6fae', '#7cf0ff'], 820); snd('tada', 1); snd('levelup', 0.9, 1.2, 0, 0.2); haptic([60, 40, 120]); }
  if (f > 1.8) { const op = f > 2.4, sc = op ? 1 : 1 + Math.sin(f * 40) * 0.04 * (f - 1.8); drawImg(IMG[op ? 'spr_box_gold_o' : 'spr_box_gold_c'], 480, 262, 150 * sc); }
  if (f > 2.4) { const k = clamp((f - 2.4) / 0.4, 0, 1); ctx.save(); ctx.translate(480, 196); ctx.scale(easeOutBack(k), easeOutBack(k));
    if (typeof drawGear === 'function') { const g = gearOf('r_king'); if (g) { drawAura(-150, 0, 60, '#ffcf3a'); drawGear(g, -150, 0, 92); } }
    icon('e_gem', 0, -10, 54); text('+500', 0, 30, 18, '#ffffff', { lw: 4 }); drawPearl(150, -10, 48); text('+3,000', 150, 30, 18, '#ffffff', { lw: 4 });
    ctx.restore(); text('전설 보상 · 상어왕의 왕관(신화) · 보석 500 · 진주 3,000', 480, 340, 16, '#ffe9a8', { lw: 4 }); }
  if (f > 3.2) {
    button(250, 368, 280, 54, '끝없는 바다 도전! ▶', () => startLevel(ENDLESS), { size: 19, kind: 'yellow' });
    button(546, 368, 164, 54, '지도로', () => enterMap(), { size: 17, kind: 'soft' });
  }
}
function drawPause() {
  ctx.fillStyle = 'rgba(10,22,62,.66)'; ctx.fillRect(-OX(), 0, W, H);
  panel(300, 110, 360, 350, { fill: '#0c285c' }); // 시안: 유리판 + 파란 리본 제목 + 큰 노란 단추
  if (!ribbon(480, 116, 320, '잠깐 쉬어요', 24)) text('잠깐 쉬어요', 480, 140, 44, '#fff', { stroke: false });
  button(330, 196, 300, 58, '계속하기 ▶', () => { state = 'play'; }, { size: 22, kind: 'yellow' });
  button(330, 268, 300, 48, save.musicOff ? '음악 켜기' : '음악 끄기', () => { save.musicOff = !save.musicOff; persist(); initAudio(); }, { size: 16, kind: 'soft' });
  button(330, 326, 300, 48, save.haptics ? '진동 끄기' : '진동 켜기', () => { save.haptics = !save.haptics; persist(); haptic(30); }, { size: 16, kind: 'soft' });
  button(330, 384, 300, 48, '지도로 (알은 저장돼요)', () => { bank(false); enterMap(); }, { size: 16, kind: 'soft' });
}
function drawRotate() {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2 - 60); ctx.rotate(-Math.PI / 2 * easeInOutCubic(Math.min(1, (T % 2.4) / 1.2)));
  ctx.strokeStyle = C.text; ctx.lineWidth = 8; rr(-50, -90, 100, 180, 16); ctx.stroke();
  ctx.restore();
  drawImg(IMG.hello, W / 2 + 140, H / 2 - 40, 140);
  text('폰을 가로로 돌려 주세요', W / 2, H / 2 + 110, 40, C.text, { stroke: false });
  text('옆으로 헤엄치는 게임이라 가로가 훨씬 넓어요', W / 2, H / 2 + 160, 24, C.sub, { body: true, stroke: false });
}

// ───────── 어디서나 위에 ─────────
const eggHud = () => (['play', 'pause', 'revive', 'bless'].includes(state) ? { x: W - SAFE - 120, y: 30 } : state === 'shop' ? { x: W - SAFE - 120, y: 34 } : { x: SAFE + 40, y: 30 });
function drawConfetti() {
  for (const f of fx) if (f.k === 'confetti') {
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.globalAlpha = Math.min(1, f.life / 0.4);
    ctx.scale(1, Math.cos((f.max - f.life) * 9 + (f.ph || f.size))); // 종이가 빙글 뒤집히듯(얇아졌다 넓어졌다)
    ctx.fillStyle = f.color; ctx.fillRect(-f.size / 2, -f.size / 4, f.size, f.size / 2); ctx.restore();
  }
  for (const f of fx) if (f.k === 'dot') { // popDots: 바깥으로 퍼지며 작아짐
    const k = 1 - f.life / f.max, e = 1 - Math.pow(1 - k, 3);
    ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x + f.tx * e, f.y + f.ty * e, 4 * (1 - k), 0, Math.PI * 2); ctx.fill();
  }
}
function drawEggFly() {
  const eh = eggHud();
  for (const f of fx) if (f.k === 'eggfly') {
    const k = clamp(1 - f.life / f.max, 0, 1), e = k * k;
    const cx = (f.sx + eh.x) / 2 + 40, cy = Math.min(f.sy, eh.y) - 120;
    const x = (1 - e) * (1 - e) * f.sx + 2 * (1 - e) * e * cx + e * e * eh.x;
    const y = (1 - e) * (1 - e) * f.sy + 2 * (1 - e) * e * cy + e * e * eh.y;
    drawPearl(x, y, 24 - k * 8, k * 6, !!f.gold);
  }
}
function toastOK() { return state === 'map' && !map.overlay && !(map.banner > 0); } // 세계 이름 띠가 떠 있는 동안엔 알림을 기다림(겹치지 않게)
function drawToasts() {
  if (!toastOK()) return;
  toasts.slice(0, 1).forEach((t, i) => {
    const age = 2.8 - t.t, a = Math.min(1, t.t / 0.3), slide = Math.min(1, age / 0.25);
    const y = 132 + i * 48 + (1 - easeOutBack(slide)) * 24; // 아래에서 떠오름(위 아이콘 이름을 덮지 않게)
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = `600 ${fs(18)}px ${FONT}`; const w = ctx.measureText(t.s).width + 56;
    flatPill(W / 2 - w / 2, y - 20, w, 40, 20);
    ctx.fillStyle = t.color; ctx.beginPath(); ctx.arc(W / 2 - w / 2 + 20, y, 5, 0, Math.PI * 2); ctx.fill();
    text(t.s, W / 2 + 8, y, 18, C.text, { body: true, stroke: false });
    ctx.restore();
  });
}

// ───────── 거북 레벨 · 결과 위에 뜨는 창(공주님 편지 → 레벨 업) ─────────
function drawLvBadge(x, y, noBg) {
  const need = xpNeed(save.lv), k = clamp(save.xp / need, 0, 1);
  if (!noBg) { flatPill(x, y, 150, 36, 18); }
  ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(x + 18, y + 18, 15, 0, Math.PI * 2); ctx.fill();
  text(String(save.lv), x + 18, y + 18, 14, '#fff', { stroke: false });
  text('거북 레벨', x + 40, y + 13, 13, '#d6dbe6', { align: 'left', body: true, stroke: false });
  ctx.fillStyle = 'rgba(255,255,255,.15)'; rr(x + 40, y + 26, 100, 5, 2.5); ctx.fill();
  ctx.fillStyle = C.yellow; rr(x + 40, y + 26, Math.max(5, 100 * k), 5, 2.5); ctx.fill();
}
function drawXpRow(x, y, w) {
  if (G.xpGain == null) return;
  const need = xpNeed(save.lv), k = clamp(save.xp / need, 0, 1);
  ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(x + 14, y, 14, 0, Math.PI * 2); ctx.fill();
  text(String(save.lv), x + 14, y + 1, 14, '#fff', { stroke: false });
  ctx.fillStyle = 'rgba(255,255,255,.15)'; rr(x + 36, y - 5, w - 130, 10, 5); ctx.fill();
  ctx.fillStyle = C.yellow; rr(x + 36, y - 5, Math.max(10, (w - 130) * k), 10, 5); ctx.fill();
  text(`경험치 +${G.xpGain}`, x + w - 86, y, 14, C.yellow, { align: 'left', body: true, stroke: false });
}
function resultOverlay() {
  if (!G || (state !== 'clear' && state !== 'dead')) return null;
  if (G.letterShow && state === 'clear' && endT > 1.2) return 'letter';
  if (G.lvUps && G.lvUps.length && (state === 'dead' ? G.deadT > 0.7 : endT > (G.letterDone ? 0.3 : 2.4))) return 'lvup';
  return null;
}
function closeResultOverlay() {
  const o = resultOverlay();
  if (o === 'letter') {
    const full = PRINCESS_LETTERS[G.n];
    if (G.letterShow.shown < full.length) { G.letterShow.shown = full.length; return; }
    G.letterShow = null; G.letterDone = true; endT = Math.max(endT, 3); save.letters[G.n] = 1; persist();
  } else if (o === 'lvup') G.lvUps.shift();
  G.ovKey = null; sfx.click();
}
function drawResultOverlay() {
  const o = resultOverlay(); if (!o) return;
  const key = o + (o === 'lvup' ? G.lvUps[0] : '');
  if (G.ovKey !== key) { G.ovKey = key; G.ovStart = T; if (o === 'lvup') { sfx.lvup(); fireworks(4, 200 + OX(), 760 + OX()); haptic([30, 30, 60, 30, 120]); shake = 10; } else sfx.harp(); }
  const t = T - G.ovStart;
  buttons.length = 0;
  buttons.push({ x: 0, y: 0, w: W, h: H, on: closeResultOverlay });
  ctx.fillStyle = `rgba(8,8,12,${Math.min(0.8, t * 3)})`; ctx.fillRect(-OX(), 0, W, H);
  if (o === 'letter') {
    const full = PRINCESS_LETTERS[G.n];
    G.letterShow.shown = Math.min(full.length, G.letterShow.shown + 0.5);
    const s = easeOutBack(Math.min(1, t / 0.45));
    ctx.save(); ctx.translate(480, 270); ctx.scale(s, s); ctx.rotate(-0.015);
    ctx.fillStyle = '#fff6e4'; rr(-300, -200, 600, 400, 18); ctx.fill();
    ctx.strokeStyle = '#e9cfa0'; ctx.lineWidth = 3; rr(-286, -186, 572, 372, 12); ctx.stroke();
    for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(200,170,120,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-250, -60 + i * 40); ctx.lineTo(250, -60 + i * 40); ctx.stroke(); }
    drawImg(IMG.princess, -220, -130, 110);
    text('아멜리아의 편지', -150, -150, 26, '#b24a7a', { align: 'left', stroke: false });
    text('유리병에 담겨 떠내려왔어요', -150, -118, 14, '#a08a6a', { align: 'left', body: true, stroke: false });
    const lh = fs(19) * 1.55;
    wrapText(full.slice(0, Math.floor(G.letterShow.shown)), 500, 19).forEach((l, i) => text(l, -250, -64 + i * lh, 19, '#4a3a2a', { align: 'left', body: true, stroke: false }));
    if (G.letterShow.shown >= full.length) text('— 아멜리아', 250, 150, 17, '#b24a7a', { align: 'right', stroke: false });
    ctx.restore();
    if (G.letterShow.shown >= full.length && t > 0.8) button(380, 486, 200, 44, '편지 접기', closeResultOverlay, { size: 16, kind: 'yellow' });
    return;
  }
  const lv = G.lvUps[0], perk = LV_PERKS[lv];
  burstRays(480 + OX(), 210, '#ffd54a', 0.1, 18);
  const s = t < 0.3 ? 0.4 + easeOutBack(t / 0.3) * 0.6 : 1;
  ctx.save(); ctx.translate(480, 92); ctx.scale(s, s); text('레벨 업!', 0, 0, 64, C.yellow, { lw: 10 }); ctx.restore();
  drawImg(IMG.cheer, 240, 300 + Math.abs(Math.sin(T * 5)) * -14, 230);
  ctx.save(); ctx.translate(480, 196);
  const ps = 1 + Math.max(0, 0.5 - t) * 1.2; ctx.scale(ps, ps);
  ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(0, 0, 54, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke();
  text('Lv', 0, -22, 16, '#cfe0ff', { stroke: false }); text(String(lv), 0, 10, 46, '#ffffff', { stroke: false });
  ctx.restore();
  if (perk) {
    panel(370, 274, 400, 130, { fill: C.gray });
    drawItemIcon(perk.icon, 430, 338, 58);
    text('새 능력', 480, 302, 14, C.yellow, { align: 'left', stroke: false });
    text(perk.name, 480, 334, 26, '#ffffff', { align: 'left', stroke: false });
    text(perk.desc, 480, 370, 16, C.sub, { align: 'left', body: true, stroke: false });
  } else {
    text('조금 더 튼튼해졌어요!', 570, 330, 24, '#ffffff', { stroke: false });
    const nx = Object.keys(LV_PERKS).map(Number).find((k) => k > lv);
    if (nx) text(`Lv ${nx} 에 「${LV_PERKS[nx].name}」`, 570, 366, 16, C.sub, { body: true, stroke: false });
  }
  if (t > 0.7) button(430, 430, 280, 56, '좋아요!', closeResultOverlay, { size: 21, kind: 'yellow' });
}

// ───────── 마지막: 다시 만난 둘의 대화 ─────────
function endingTap() {
  if (endT < 4.2) return;
  const i = G.talkI || 0;
  if (i < ENDING_TALK.length) {
    const line = ENDING_TALK[i].text;
    if ((G.talkShown || 0) < line.length) { G.talkShown = line.length; return; }
    G.talkI = i + 1; G.talkShown = 0; G.talkAt = endT; sfx.click();
    if (G.talkI === ENDING_TALK.length) { sfx.fever(); endFirework(); endFirework(); }
  } /* 마무리 화면은 단추로만 나감(보상·퍼레이드를 끝까지 보게) */
}
