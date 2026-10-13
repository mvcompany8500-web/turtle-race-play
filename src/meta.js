'use strict';
// 터틀 레이스 — 판 밖: 도전(미션)·선물·출석·별 상자·도감·설정·월드맵(세계 3곳)·첫 이야기·상점·결과 화면
// 메뉴 화면은 가운데 960 폭에 그린다(main.js 가 OX 만큼 옮겨 줌)

// ───────── 오늘의 도전 ─────────
const MISSION_TYPES = [
  { type: 'eggsRun', goals: [25, 40, 60], text: (n) => `한 판에 진주 ${n}개 모으기` },
  { type: 'near', goals: [5, 10, 20], text: (n) => `아슬아슬 회피 ${n}번` },
  { type: 'boostKill', goals: [5, 10, 20], text: (n) => `질주로 ${n}마리 물리치기` },
  { type: 'clear', goals: [1, 2, 3], text: (n) => `바다 ${n}곳 성공하기` },
  { type: 'fever', goals: [1, 2, 3], text: (n) => `바다 축제 ${n}번 부르기` },
  { type: 'gold', goals: [3, 6, 10], text: (n) => `황금 진주 ${n}개 먹기` },
  { type: 'runs', goals: [3, 5, 8], text: (n) => `${n}판 도전하기` },
  { type: 'boost', goals: [3, 6, 10], text: (n) => `질주 ${n}번 쓰기` },
  { type: 'stomp', goals: [5, 10, 20], text: (n) => `몬스터 ${n}마리 밟기` },
];
function newMission(exclude) {
  const m = pick(MISSION_TYPES.filter((t) => !exclude.includes(t.type)));
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
  save.eggs += m.reward;
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
  const n = Math.round(rand(20, 60));
  save.eggs += n; save.giftAt = Date.now() + 3 * 3600e3; persist();
  fountain(W / 2, 40, n); confetti(40); sfx.gift(); haptic([20, 30, 40]);
  toast(`선물 상자! 진주 +${n}`, C.yellow);
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
  fountain(W / 2, 40, 80); confetti(60); sfx.crack(); haptic([30, 30, 80]);
  toast('별 상자! 진주 +80', C.yellow);
}

// ───────── 월드맵: 세계 5곳 × 바다 10칸 = 50판, 손가락으로 쭉 미는 긴 바다 지도 ─────────
const MAP_STEP = 190, MAP_X0 = 300;
function nodePos(s) {
  if (s === 0) return { x: 120, y: 190 };
  return { x: MAP_X0 + (s - 1) * MAP_STEP + (STAGES[s].boss ? 24 : 0), y: 300 + Math.sin(s * 0.85) * 92 + Math.cos(s * 0.37) * 22 };
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
  const nodeImg = open ? IMG.spr_node : IMG.spr_node_lock;
  if (ready(nodeImg)) {
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.75, r * 0.95, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    if (cur) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.2); g.addColorStop(0, `rgba(255,213,74,${0.5 + 0.2 * Math.sin(T * 5)})`); g.addColorStop(1, 'rgba(255,213,74,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    drawImg(nodeImg, x, y, r * 2.5);
    if (open && stars) { ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.restore(); }
    if (open) text(String(s), x, y + 2, boss ? 24 : 21, stars ? C.blue : '#7a4a10', { stroke: '#ffffff', lw: 5 });
    if (open) for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.55; drawStar(x + Math.cos(a) * (r + 14), y + Math.sin(a) * (r + 14) + 2, 9, k < stars); }
    if (save.crown[s]) icon('e_crown', x + r * 0.95, y - r * 0.95, 24);
    if (boss && open) { const nm = (BOSS_DEF[st.boss] || {}).name || ''; ctx.font = `700 ${fs(13)}px ${FONT}`; const w2 = ctx.measureText(nm).width + 18; ctx.fillStyle = 'rgba(240,68,82,.92)'; rr(x - w2 / 2, y + r + 10, w2, fs(13) + 8, (fs(13) + 8) / 2); ctx.fill(); text(nm, x, y + r + 14 + fs(13) / 2, 13, '#fff', { stroke: false, weight: 700 }); }
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
  if (open) text(String(s), x, y + 2, boss ? 24 : 21, '#ffffff', { stroke: 'rgba(16,16,18,.5)', lw: 4 });
  else icon('e_lock', x, y, r * 1.05);
  if (open) for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.55; drawStar(x + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12) + 2, 8, k < stars); }
  if (save.crown[s]) icon('e_crown', x + r * 0.9, y - r * 0.9, 22);
  if (boss && open) { const nm = (BOSS_DEF[st.boss] || {}).name || ''; ctx.font = `700 ${fs(13)}px ${FONT}`; const w2 = ctx.measureText(nm).width + 18; ctx.fillStyle = 'rgba(240,68,82,.92)'; rr(x - w2 / 2, y + r + 8, w2, fs(13) + 8, (fs(13) + 8) / 2); ctx.fill(); text(nm, x, y + r + 12 + fs(13) / 2, 13, '#fff', { stroke: false, weight: 700 }); }
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
      const A = IMG['spr_map' + w + 'a'], B = IMG['spr_map' + w + 'b'];
      if (!ready(A)) continue;
      const ph = H, pw = ph * A.naturalWidth / A.naturalHeight;
      ctx.save(); ctx.beginPath(); ctx.rect(zs - cam, 0, ze - zs, H); ctx.clip();
      for (let i = 0, x = zs; x < ze; x += pw, i++) {
        if (x + pw - cam < 0 || x - cam > W) continue;
        const im = i % 2 && ready(B) ? B : A;
        ctx.save(); ctx.translate(x - cam + pw / 2, H / 2); if (Math.floor(i / 2) % 2) ctx.scale(-1, 1); ctx.drawImage(im, -pw / 2, -ph / 2, pw + 1, ph); ctx.restore();
        if (i > 0) { // 그림 이음새: 물빛 띠로 부드럽게
          const sx = x - cam, sg = ctx.createLinearGradient(sx - 90, 0, sx + 90, 0), wc = ZONE_BG[w - 1][0];
          const [r2, g2, b2] = rgb(wc);
          sg.addColorStop(0, `rgba(${r2},${g2},${b2},0)`); sg.addColorStop(0.5, `rgba(${r2},${g2},${b2},.55)`); sg.addColorStop(1, `rgba(${r2},${g2},${b2},0)`);
          ctx.fillStyle = sg; ctx.fillRect(sx - 90, 0, 180, H);
        }
      }
      ctx.restore();
    }
    for (let w = 2; w <= 5; w++) { // 세계 경계: 물안개로 부드럽게
      const x0 = zoneStart(w) - cam; if (x0 < -200 || x0 > W + 200) continue;
      const g = ctx.createLinearGradient(x0 - 140, 0, x0 + 140, 0); g.addColorStop(0, 'rgba(220,240,255,0)'); g.addColorStop(0.5, 'rgba(220,240,255,.45)'); g.addColorStop(1, 'rgba(220,240,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x0 - 140, 0, 280, H);
    }
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
  // 길: 모래 길 + 열린 곳은 금빛
  const pts = []; for (let s = 1; s <= LAST; s++) pts.push(nodePos(s));
  const trace = (from, to) => { ctx.beginPath(); ctx.moveTo(pts[from].x - cam, pts[from].y); for (let i = from + 1; i <= to; i++) { const a = pts[i - 1], b = pts[i]; ctx.quadraticCurveTo(a.x - cam + (b.x - a.x) * 0.5, (a.y + b.y) / 2 - 30, b.x - cam, b.y); } };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  trace(0, LAST - 1); ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 30; ctx.stroke();
  ctx.strokeStyle = '#f2dfae'; ctx.lineWidth = 22; ctx.stroke();
  const openTo = Math.max(0, Math.min(LAST, save.unlocked - (map.unlock ? 1 : 0)) - 1);
  if (openTo > 0) { trace(0, openTo); ctx.strokeStyle = C.yellow; ctx.lineWidth = 9; ctx.setLineDash([2, 16]); ctx.lineWidth = 10; ctx.stroke(); ctx.setLineDash([]); }
  if (map.unlock && map.unlock.t > 1.5) { // 열리는 길이 금빛으로 이어짐
    const k = Math.min(1, (map.unlock.t - 1.5) / 0.7), a = pts[map.unlock.s - 2], b = pts[map.unlock.s - 1];
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = C.yellow; ctx.lineWidth = 12; ctx.shadowColor = C.yellow; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(a.x - cam, a.y); ctx.lineTo(lerp(a.x, b.x, k) - cam, lerp(a.y, b.y, k)); ctx.stroke(); ctx.restore();
  }
  // 끝없는 바다
  if (endlessOpen() && cam < 400) {
    const e = nodePos(0), ex = e.x - cam;
    ctx.setLineDash([10, 9]); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ex, e.y); ctx.lineTo(pts[0].x - cam, pts[0].y); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(ex, e.y); ctx.rotate(T * 2);
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = ['#7cf0ff', '#b48bff', '#ffffff'][i]; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 16 + i * 9, i, i + 4.2); ctx.stroke(); }
    ctx.restore();
    text('끝없는 바다', ex, e.y + 52, 15, '#fff', { body: true });
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
  // 잠긴 바다 안개
  const fogX = (save.unlocked < LAST ? nodePos(save.unlocked + 1).x - 70 : MAP_LEN + 200) - cam;
  if (fogX < W) { const fg = ctx.createLinearGradient(fogX, 0, fogX + 260, 0); fg.addColorStop(0, 'rgba(10,12,24,0)'); fg.addColorStop(1, 'rgba(10,12,24,.66)'); ctx.fillStyle = fg; ctx.fillRect(fogX, 60, 260, H); ctx.fillStyle = 'rgba(10,12,24,.66)'; ctx.fillRect(fogX + 260, 60, W + 400, H); }
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
    ctx.fillStyle = 'rgba(16,16,18,.7)'; rr(W / 2 - 220, 92, 440, 64, 32); ctx.fill();
    text(`세계 ${wd.id}`, W / 2, 112, 14, C.yellow, { stroke: false });
    text(wd.name, W / 2, 136, 26, '#ffffff', { stroke: false });
    ctx.restore();
  }
  // 위쪽: 알·별 상자 / 둥근 버튼
  const L = SAFE + 14, R = W - SAFE - 14;
  eggBadge(L + 34, 34, save.eggs, 30 * (1 + hudPulse * 1.6));
  drawLvBadge(L + 6, 62);
  gemBadge(L + 22, 118, save.gems, 22);
  const cr = chestReady();
  button(L + 130, 14, 156, 42, `별 ${totalStars()} · ${cr ? '상자 열기!' : '상자 ' + chestGoal()}`, openChest, { size: 14, kind: cr ? 'yellow' : 'soft' });
  if (save.streak.day) { // 출석 글: 바쁜 지도 위에서도 읽히게 어두운 띠 위에
    const st = `출석 ${save.streak.day}일째${save.streak.rest ? ` · 쉬는 카드 ${save.streak.rest}` : ''}${save.streak.lost ? ` · 오늘 ${3 - (save.streak.lostRuns || 0)}판 더 하면 ${save.streak.lost}일 되찾기` : ''}`;
    ctx.font = `600 ${fs(14)}px ${FONT}`; const sw = Math.min(ctx.measureText(st).width, R - 480 - (L + 306) - 16); // 오른쪽 둥근 단추 7개(70 간격) 앞까지
    ctx.fillStyle = 'rgba(16,16,18,.62)'; rr(L + 294, 20, sw + 24, 30, 15); ctx.fill();
    ctx.save(); rr(L + 294, 20, sw + 24, 30, 15); ctx.clip();
    text(st, L + 306, 35, 14, C.yellow, { align: 'left', body: true, stroke: false }); ctx.restore();
  }
  const gr = giftReady();
  const btns = [
    ['설정', () => { map.overlay = 'settings'; sfx.click(); }, null, 'gear'],
    ['상점', () => openShop(map.cur === 0 ? ENDLESS : map.cur), 'e_gem', null],
    ['도감', () => { map.overlay = 'dex'; sfx.click(); }, 'e_dex', null],
    ['도전', () => { map.overlay = 'missions'; sfx.click(); }, 'e_target', null],
    [gr ? '선물!' : giftLeft(), openGift, 'e_gift', null],
    ['패스', () => { map.overlay = 'pass'; passPage = Math.floor(Math.max(0, passTier() - 1) / 6); sfx.click(); }, 'e_medal', null],
    ['업적', () => { map.overlay = 'ach'; sfx.click(); }, 'e_trophy', null],
  ];
  btns.forEach(([label, on, ic, sym], i) => {
    const bx = R - 60 - i * 70, by = 10;
    button(bx, by, 58, 58, '', on, { kind: i === 1 ? 'primary' : i === 4 && gr ? 'yellow' : 'soft' });
    if (ic) icon(ic, bx + 29, by + 24, 30, ic === 'e_gift' && gr ? Math.sin(T * 10) * 0.2 : 0);
    if (sym === 'gear') { ctx.strokeStyle = C.text; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(bx + 29, by + 24, 9, 0, Math.PI * 2); ctx.stroke(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(bx + 29 + Math.cos(a) * 11, by + 24 + Math.sin(a) * 11); ctx.lineTo(bx + 29 + Math.cos(a) * 15, by + 24 + Math.sin(a) * 15); ctx.stroke(); } }
    text(label, bx + 29, by + 48, 13, C.text, { stroke: false, weight: 700 });
    if (i === 6 && achReady()) { ctx.fillStyle = C.danger; ctx.beginPath(); ctx.arc(bx + 54, by + 4, 11, 0, Math.PI * 2); ctx.fill(); text(String(achReady()), bx + 54, by + 5, 13, '#fff', { stroke: false }); }
    if (i === 3 && missionsReady()) { ctx.fillStyle = C.danger; ctx.beginPath(); ctx.arc(bx + 54, by + 4, 11, 0, Math.PI * 2); ctx.fill(); text(String(missionsReady()), bx + 54, by + 5, 13, '#fff', { stroke: false }); }
  });
  // 아래: 바다 정보 · 난이도 · 출발
  panel(L, 452, R - L, 80);
  const s = map.cur;
  if (s === 0) {
    text('끝없는 바다', L + 24, 480, 22, C.text, { align: 'left' });
    text(`최고 ${save.endlessBest}미터 · 갈수록 붐벼요`, L + 24, 510, 14, C.sub, { align: 'left', body: true, stroke: false });
  } else {
    text(`${s}번 바다 · ${STAGES[s].name}`, L + 24, 478, 20, C.text, { align: 'left' });
    for (let k = 0; k < 3; k++) drawStar(L + 34 + k * 24, 510, 9, k < (save.stars[s] || 0));
    text(save.best[s] ? `최고 ${save.best[s]}%` : '처음 도전!', L + 114, 510, 14, C.sub, { align: 'left', body: true, stroke: false });
  }
  DIFFS.forEach((d, i) => button(R - 486 + i * 84, 470, 78, 46, d.name, () => { save.diff = i; persist(); sfx.click(); }, { size: 15, kind: save.diff === i ? 'primary' : 'soft' }));
  const bounce = 1 + Math.sin(T * 5) * 0.035;
  ctx.save(); ctx.translate(R - 118, 492); ctx.scale(bounce, bounce); ctx.translate(-(R - 118), -492);
  button(R - 226, 462, 216, 62, '출발!', mapPlay, { size: 26 });
  ctx.restore();
  ctx.restore();
  if (map.overlay === 'missions') drawMissions();
  else if (map.overlay === 'dex') drawDex();
  else if (map.overlay === 'settings') drawSettings();
  else if (map.overlay === 'pass') drawPass();
  else if (map.overlay === 'ach') drawAch();
}
function overlayBase(x, y, w, h, title, ic) {
  ctx.fillStyle = 'rgba(16,16,18,.7)'; ctx.fillRect(-OX(), 0, W, H);
  buttons.length = 0;
  buttons.push({ x: 0, y: 0, w: W, h: H, on: () => { map.overlay = null; } });
  panel(x, y, w, h, { fill: C.gray });
  if (ic) icon(ic, x + 44, y + 38, 34);
  text(title, x + w / 2, y + 38, 26, C.text, { stroke: false });
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
  text('도전을 이루면 바로 새 도전이 와요', 480, 402, 14, C.sub, { body: true, stroke: false });
  button(400, 420, 160, 40, '닫기', () => { map.overlay = null; sfx.click(); }, { size: 16, kind: 'soft' });
}
function drawDex() {
  overlayBase(60, 66, 840, 420, '바다 도감', 'e_dex');
  const found = ENEMY_KEYS.filter((k) => save.dex[k]).length;
  text(`${found}/${ENEMY_KEYS.length} 만남`, 880, 104, 13, C.sub, { align: 'right', body: true, stroke: false });
  ENEMY_KEYS.forEach((k, i) => withRise(i, () => { // 13마리 → 5칸 × 3줄(4칸이면 4줄째가 화면 밖)
    const col = i % 5, row = Math.floor(i / 5), x = 74 + col * 164, y = 124 + row * 104, cw = 156, ch = 96, info = ENEMIES[k], d = save.dex[k];
    panel(x, y, cw, ch, { fill: C.sel, r: 16 });
    ctx.save(); ctx.beginPath(); rr(x, y, 60, ch, 16); ctx.clip();
    if (d) drawEnemy({ type: k, x: x + 32, y: y + 48, r: k === 'puffer' ? 15 : k === 'eel' ? 9 : 16, t: T, ph: 0, len: 36, baseY: y + 48, top: false, armed: false }, x + 200, y + 48);
    else text('?', x + 32, y + 48, 36, C.mute, { stroke: false });
    ctx.restore();
    ctx.save(); rr(x, y, cw, ch, 16); ctx.clip();
    const tx = x + 64;
    if (d) {
      text(info.name, tx, y + 24, 14, C.text, { align: 'left', stroke: false });
      ctx.font = `600 ${fs(13)}px ${FONT}`; const lw = ctx.measureText('약점').width;
      text('약점', tx, y + 62, 13, C.mute, { align: 'left', body: true, stroke: false });
      drawItemIcon(info.weak, tx + lw + 16, y + 62, 22);
      if (fs(13) <= 16) text(ITEMS[info.weak].name, tx + lw + 30, y + 62, 13, d.weak ? C.yellow : C.sub, { align: 'left', body: true, stroke: false });
    } else text(`${info.intro}번 바다`, tx, y + 48, 13, C.mute, { align: 'left', body: true, stroke: false });
    ctx.restore();
  }));
  button(400, 476 - 38, 160, 40, '닫기', () => { map.overlay = null; sfx.click(); }, { size: 16, kind: 'soft' });
}
function drawIosGuide() {
  buttons.length = 0;
  ctx.fillStyle = 'rgba(16,16,18,.88)'; ctx.fillRect(-OX(), 0, W, H);
  panel(170, 40, 620, 400, { fill: C.gray });
  text('아이폰은 꽉 찬 화면으로 하려면', 480, 84, 26, C.text, { stroke: false });
  const steps = [['1', '사파리 아래(또는 위) 공유 버튼', 'share'], ['2', '「홈 화면에 추가」 누르기', 'plus'], ['3', '바탕화면 「터틀 레이스」 아이콘으로 실행', 'icon']];
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
function drawSettings() {
  overlayBase(280, 40, 400, 470, '설정', null);
  const rows = [
    ['조작', save.ctrl !== 'swim', () => { save.ctrl = save.ctrl === 'swim' ? 'run' : 'swim'; persist(); sfx.click(); }, ['점프 달리기', '자유 헤엄']],
    ['배경 음악', !save.musicOff, () => { save.musicOff = !save.musicOff; persist(); initAudio(); }],
    ['효과음', !save.sfxOff, () => { save.sfxOff = !save.sfxOff; persist(); initAudio(); sfx.tap(); }],
    ['진동 · 흔들림', save.haptics && !save.noShake, () => { const on = save.haptics && !save.noShake; save.haptics = !on; save.noShake = on; persist(); haptic(30); }],
  ];
  rows.forEach(([label, on, fn, names], i) => withRise(i, () => {
    const y = 96 + i * 58;
    text(label, 312, y + 22, 18, C.text, { align: 'left', stroke: false });
    button(names ? 490 : 520, y, names ? 160 : 130, 44, names ? names[on ? 0 : 1] : on ? '켜짐' : '꺼짐', fn, { size: 15, kind: on ? 'primary' : 'soft' });
  }));
  text(save.ctrl === 'swim' ? '손가락으로 끌어서 자유롭게 헤엄 (예전 방식)' : '왼쪽 톡 점프 · 오른쪽 꾹 숙이기 · 위에서 밟기', 480, 340, 14, C.sub, { body: true, stroke: false });
  button(312, 366, 338, 44, '꽉 찬 화면으로 보기', () => { if (IS_IOS) { map.overlay = null; state = 'title'; iosGuide = true; } else goFullscreen(); }, { size: 15, kind: 'soft' });
  button(312, 418, 166, 44, '첫 이야기', startIntro, { size: 14, kind: 'soft' });
  button(484, 418, 80, 44, '저장↑', exportSave, { size: 13, kind: 'soft' });
  button(570, 418, 80, 44, '불러오기', importSave, { size: 13, kind: 'soft' });
  button(312, 468, 108, 32, '이용약관', () => window.open('legal/terms.html', '_blank'), { size: 13, kind: 'soft' });
  button(426, 468, 120, 32, '개인정보', () => window.open('legal/privacy.html', '_blank'), { size: 13, kind: 'soft' });
  button(552, 468, 98, 32, '만든 사람', () => window.open('legal/credits.html', '_blank'), { size: 13, kind: 'soft' });
}

// ───────── 첫 이야기: 공주 납치 ─────────
const INTRO = [
  { who: 'princess', text: '오늘은 바다 축제 날이에요! 다 같이 신나게 놀아요~' },
  { who: 'hero', text: '공주님! 오늘 레이스에서 꼭 1등 할게요!' },
  { who: 'shark', text: '크하하하! 축제는 끝났다!!', ev: 'sharkIn' },
  { who: 'shark', text: '공주는 깊은 바다 끝 내 성으로 데려간다! 느림보 거북이가 따라올 수 있을까?', ev: 'grab' },
  { who: 'princess', text: '꺄악! 터틀아, 살려줘요!!', ev: 'leave' },
  { who: 'hero', text: '공주님!!! 느려도 괜찮아... 절대 포기 안 해! 다섯 바다를 건너서라도 꼭 구하러 갈게요!', ev: 'resolve' },
  { who: null, text: '', ev: 'title' },
];
const WHO = { princess: '공주 거북', hero: '터틀이', shark: '상어왕' };
const cut = { i: 0, t: 0, shown: 0 };
function startIntro() { state = 'intro'; cut.i = 0; cut.t = 0; cut.shown = 0; setMusic('title'); map.overlay = null; }
function introStep(s) {
  if (s.ev === 'sharkIn') { shake = 24; flash = 0.6; flashColor = '#ff3355'; sfx.roar(); haptic([60, 40, 120]); setMusic('boss'); }
  if (s.ev === 'grab') { sfx.bubble(); shake = 8; }
  if (s.ev === 'leave') { snd('swoosh', 1, 0.7); }
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
function endIntro() { save.introSeen = true; persist(); placeHero(Math.min(save.unlocked, LAST)); enterMap(); }
function updateIntro(dt) {
  cut.t += dt;
  const s = INTRO[cut.i];
  const before = Math.floor(cut.shown);
  cut.shown = Math.min(s.text.length, cut.shown + dt * 24);
  if (s.text && Math.floor(cut.shown) > before && Math.floor(cut.shown) % 2 === 0) sfx.blip(s.who);
  if (s.ev === 'title') { if (cut.t > 3.4) endIntro(); }
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
  let sx = 960 + 320, px = 600, py = 300, caged = false;
  if (i >= 2) sx = i === 2 ? lerp(960 + 320, 790, easeOutBack(Math.min(1, t / 0.7))) : 790;
  if (i >= 3) { caged = true; const k = i === 3 ? Math.min(1, t / 0.6) : 1; px = lerp(600, 660, k); py = lerp(300, 270, k); }
  if (i >= 4) { const k = i === 4 ? t : 99; sx = 790 + Math.max(0, k - 0.8) * 560; px = sx - 130; }
  if (px < 960 + 120) {
    drawImg(IMG.princess, px, py + Math.sin(T * 3) * 5, 150, caged ? Math.sin(T * 8) * 0.08 : 0, 1, true);
    if (caged) { ctx.strokeStyle = 'rgba(200,240,255,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px, py, 88, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(200,240,255,.12)'; ctx.fill(); }
  }
  if (i >= 2 && sx < 960 + 260) drawShark(sx, 250, 2.7, '#8a6bd6', '#3f2a7a', true, false, true, Math.sin(T * 8) * 0.28, i === 2 || i === 3 ? 0.6 + 0.4 * Math.sin(T * 10) : 0.2);
  if (i <= 1) drawImg(IMG.hello, 230, 320 + Math.sin(T * 3) * 4, 200);
  else if (i <= 4) drawHero(230, 330, 170, Math.sin(T * 20) * 0.03, { stand: true, face: 'scared', ph: T * 6 });
  else {
    const run = INTRO[i].ev === 'title' ? t * 520 : 0;
    drawHero(230 + run, 330, 170, -0.1, { face: 'boost', boost: run > 0, ph: T * 16 });
    if (run === 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(230, 330, 10, 230, 330, 150); g.addColorStop(0, 'rgba(160,110,255,.5)'); g.addColorStop(1, 'rgba(160,110,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(230, 330, 150, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  drawConfetti();
  if (INTRO[i].ev === 'title') {
    const a = Math.min(1, t / 0.5);
    ctx.fillStyle = `rgba(16,16,18,${0.6 * a})`; ctx.fillRect(-OX(), 0, W, H);
    ctx.save(); ctx.globalAlpha = a;
    const s = 0.7 + 0.3 * easeOutBack(Math.min(1, t / 0.6));
    ctx.translate(480, 200); ctx.scale(s, s); text('터틀 레이스', 0, 0, 86, C.yellow, { lw: 12 }); ctx.restore();
    ctx.save(); ctx.globalAlpha = a;
    text('공주 거북 구출 대작전', 480, 270, 30, '#ffffff');
    text('느려도 괜찮아요. 포기만 하지 마세요', 480, 318, 20, C.text, { body: true });
    ctx.restore();
  }
  const s = INTRO[i];
  if (s.text) {
    panel(40, 394, 880, 124, { fill: 'rgba(27,28,31,.94)' });
    ctx.save(); ctx.beginPath(); ctx.arc(116, 456, 48, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.clip();
    if (s.who === 'princess') drawImg(IMG.princess, 116, 470, 120);
    else if (s.who === 'hero') drawImg(IMG.hello, 116, 470, 120);
    else { ctx.fillStyle = '#e9e0ff'; ctx.fillRect(60, 400, 112, 112); drawShark(132, 462, 1.2, '#8a6bd6', '#3f2a7a', true, false, true, 0, 0.5); }
    ctx.restore();
    text(WHO[s.who], 186, 414, 18, s.who === 'shark' ? '#ff9aa8' : s.who === 'princess' ? '#ffd1ef' : C.yellow, { align: 'left', stroke: false });
    wrapText(s.text.slice(0, Math.floor(cut.shown)), 690, 21).forEach((l, k) => text(l, 186, 448 + k * 30, 21, '#ffffff', { align: 'left', body: true, stroke: false }));
    if (cut.shown >= s.text.length && Math.sin(T * 8) > 0) text('▼', 890, 498, 16, C.yellow, { stroke: false });
  }
  button(960 + OX() - SAFE - 140, 14, 120, 40, '건너뛰기', endIntro, { size: 15, kind: 'soft' });
}

// ───────── 타이틀 · 터틀이 숨쉬기와 동작 (디자인 키트 4번) ─────────
const BUDDY_ACTS = ['jump', 'shake', 'bounce2', 'tilt', 'spin'];
const buddy = { i: 0, act: null, t: 0, idle: 10 };
function buddyAct() { if (REDUCE) return; buddy.act = BUDDY_ACTS[buddy.i++ % 5]; buddy.t = 0; haptic(10); sfx.tap(); }
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
  if (!save.introSeen) startIntro(); else { placeHero(Math.min(save.unlocked, LAST)); enterMap(); } }
// 첫 화면 불러오기 막대(그림이 다 올 때까지)
function drawLoadBar() {
  const ims = Object.values(IMG).filter((i) => i && i.complete !== undefined), done = ims.filter((i) => i.complete).length;
  if (!ims.length || done >= ims.length) return;
  const k = done / ims.length;
  ctx.fillStyle = 'rgba(16,16,18,.6)'; rr(330, 500, 300, 14, 7); ctx.fill();
  ctx.fillStyle = C.blueD; rr(330, 500, Math.max(14, 300 * k), 14, 7); ctx.fill();
  text(`바다 준비 중 ${Math.round(k * 100)}%`, 480, 484, 14, C.text, { body: true });
}
function drawTitle() {
  drawLoadBar();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(250, 290, 20, 250, 290, 220);
  g.addColorStop(0, 'rgba(120,230,255,.35)'); g.addColorStop(1, 'rgba(120,230,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(250, 290, 220, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  drawBuddy(250, 290, 300);
  drawImg(IMG.princess, 860, 130 + Math.sin(T * 1.7) * 6, 110, 0, 0.9, true);
  ctx.strokeStyle = 'rgba(200,240,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(860, 130 + Math.sin(T * 1.7) * 6, 62, 0, Math.PI * 2); ctx.stroke();
  text('살려줘요!', 860, 52, 17, '#ffd1ef', { body: true });
  const s = 1 + Math.sin(T * 3) * 0.02;
  ctx.save(); ctx.translate(610, 130); ctx.scale(s, s); text('터틀 레이스', 0, 0, 80, C.yellow, { lw: 12 }); ctx.restore();
  text('공주 거북 구출 대작전', 610, 196, 26, '#ffffff');
  text('느려도 괜찮아요, 포기만 하지 마세요', 610, 236, 19, C.text, { body: true });
  button(500, 286, 220, 64, '시작하기', startGame, { size: 26 });
  if (save.introSeen) button(510, 362, 200, 44, '첫 이야기 다시 보기', startIntro, { size: 14, kind: 'soft' });
  if (isTouch && !STANDALONE) button(510, 414, 200, 44, '꽉 찬 화면으로', () => { if (IS_IOS) iosGuide = true; else goFullscreen(); }, { size: 14, kind: 'soft' });
  if (iosGuide) drawIosGuide();
  eggBadge(36 - OX() + SAFE, 32, save.eggs, 30);
  const cx = ((T * 170) % (960 + 520)) - 120;
  drawHero(cx, 488 + Math.sin(T * 4) * 4, 52, Math.sin(T * 4) * 0.06, { ph: T * 16, face: 'scared' });
  ctx.save(); ctx.translate(cx - 200 + Math.sin(T * 2) * 20, 494); ctx.scale(-1, 1);
  drawShark(0, 0, 0.75, '#8fb2d0', '#4d6b88', true, false, false, Math.sin(T * 13) * 0.3, 0.6 + 0.4 * Math.sin(T * 5));
  ctx.restore();
  text(isTouch ? '눌러서 시작 · 폰은 가로로' : '스페이스로 시작 · 방향키로 이동 · 스페이스로 질주 · E 아이템', 480, H - 12, 14, 'rgba(242,243,245,.8)', { body: true, stroke: false });
}

// ───────── 상점 (실력 키우기 · 옷장 · 펫) ─────────
const shop = { tab: 'up', next: 1, msg: '', msgT: 0, hatch: null, turn: null };
function openShop(next) { shop.next = next; shop.msg = ''; shop.hatch = null; state = 'shop'; sfx.click(); }
function shopSay(m) { shop.msg = m; shop.msgT = 1.6; }
function buyUp(i) {
  const u = UPS[i]; if (!u) return;
  const c = upCost(u);
  if (c == null) { sfx.no(); shopSay('이미 최고 단계예요'); return; }
  if (save.eggs < c) { sfx.no(); shopSay(`진주가 ${c - save.eggs}개 부족해요`); return; }
  save.eggs -= c; save.up[u.k]++; persist(); sfx.levelup(); haptic(25);
  shopSay(`${u.name} ${save.up[u.k]}단계!`);
}
function wearSkin(k) {
  if (save.skin === k) return;
  if (!REDUCE) shop.turn = { t: 0, from: save.skin, to: k }; // 앱의 휘리릭 턴: 앞 → 옆 → 뒤 → 옆 → 앞(새 옷)
  save.skin = k; persist(); haptic(30);
  if (REDUCE) snd('tada', 0.9);
}
function buySkin(s) {
  if (save.skins.includes(s.k)) { wearSkin(s.k); shopSay(`${s.name} 입었어요`); return; }
  if (save.eggs < s.cost) { sfx.no(); shopSay(`진주가 ${s.cost - save.eggs}개 부족해요`); return; }
  save.eggs -= s.cost; save.skins.push(s.k); sfx.buy(); wearSkin(s.k); shopSay(`${s.name} 획득!`);
}
function hatchPet() {
  const left = PETS.filter((p) => !save.pets.includes(p.k));
  if (!left.length) { shopSay('펫을 다 모았어요!'); return; }
  const cost = hatchCost();
  if (save.eggs < cost) { sfx.no(); shopSay(`진주가 ${cost - save.eggs}개 부족해요`); return; }
  const p = pick(left);
  save.eggs -= cost; save.pets.push(p.k); save.pet = p.k; save.petLv[p.k] = 1; persist();
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
  if (shop.msgT > 0) shop.msgT -= dt;
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
  ctx.restore();
}
function drawShop() {
  ctx.fillStyle = 'rgba(16,16,18,.6)'; ctx.fillRect(-OX(), 0, W, H);
  text(shop.tab === 'gem' ? '보석 상점' : shop.tab === 'fx' ? '꾸밈 상점' : '진주 상점', 480, 34, 32, C.text, { stroke: false });
  eggBadge(960 + OX() - SAFE - 120, 34, save.eggs, 30 * (1 + hudPulse * 1.6));
  gemBadge(960 + OX() - SAFE - 250, 34, save.gems, 26);
  [['up', '실력 키우기'], ['skin', '옷장'], ['pet', '펫'], ['fx', '꼬리 효과'], ['gem', '보석']].forEach(([k, label], i) => {
    button(55 + i * 172, 62, 164, 40, label, () => { shop.tab = k; sfx.click(); }, { size: 15, kind: shop.tab === k ? (k === 'gem' ? 'yellow' : 'primary') : 'soft' });
  });
  if (shop.tab === 'up') {
    const icons = { slow: 'e_snow', boost: 'e_rocket', shield: 'e_shield', magnet: 'e_gem', fire: 'e_sparkles', power: 'e_fire' };
    UPS.forEach((u, i) => withRise(i, () => {
      const x = 40 + (i % 3) * 296, y = 116 + Math.floor(i / 3) * 176, w = 284, h = 166, lv = save.up[u.k], c = upCost(u);
      panel(x, y, w, h);
      icon(icons[u.k], x + 52, y + 56, 60, Math.sin(T * 2 + i) * 0.08);
      text(u.name, x + 100, y + 34, 19, C.text, { align: 'left', stroke: false });
      text(u.desc, x + 100, y + 62, 14, C.sub, { align: 'left', body: true, stroke: false });
      for (let k = 0; k < u.max; k++) { ctx.fillStyle = k < lv ? C.blueD : C.line; rr(x + 100 + k * 26, y + 84, 20, 10, 5); ctx.fill(); }
      if (c == null) text('최고 단계', x + w / 2, y + 134, 17, C.ok, { stroke: false });
      else button(x + 20, y + 110, w - 40, 44, `진주 ${c}`, () => buyUp(i), { size: 17, disabled: save.eggs < c });
    }));
  } else if (shop.tab === 'fx') {
    TRAILS.forEach((t, i) => withRise(i, () => {
      const x = 40 + (i % 4) * 222, y = 116 + Math.floor(i / 4) * 176, w = 210, h = 166, own = save.trails.includes(t.k), on = save.trail === t.k;
      panel(x, y, w, h, { sel: on, fill: on ? C.sel : undefined });
      for (let k = 0; k < 9; k++) { // 미리보기: 꼬리 색 점
        const c = t.k === 'none' ? 'rgba(255,255,255,.15)' : t.k === 'rainbow' ? `hsl(${(T * 200 + k * 40) % 360},95%,65%)` : (TRAIL_COL[t.k] || ['#fff'])[k % (TRAIL_COL[t.k] || ['#fff']).length];
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 30 + k * 18, y + 40 + Math.sin(T * 6 + k) * 7, 6 - k * 0.4, 0, Math.PI * 2); ctx.fill();
      }
      drawImg(IMG.side, x + w - 40, y + 40, 56);
      text(t.name, x + w / 2, y + 80, 17, C.text, { stroke: false });
      if (t.how && !own) text(t.how, x + w / 2, y + 104, 12, C.sub, { body: true, stroke: false });
      button(x + 16, y + 122, w - 32, 34, on ? '쓰는 중' : own ? '쓰기' : t.gems ? `보석 ${t.gems}` : '얻는 곳 보기', () => buyTrail(t), { size: 14, kind: on ? 'soft' : own ? 'soft' : t.gems ? 'yellow' : 'soft', disabled: on });
    }));
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
      text(STARTER.name, x + w / 2, y + 92, 15, C.text, { stroke: false });
      text(STARTER.desc, x + w / 2, y + 114, 12, C.sub, { body: true, stroke: false });
      button(x + 16, y + 134, w - 32, 34, save.starter ? '샀어요 ✓' : won(STARTER.won), buyStarter, { size: 14, kind: 'yellow', disabled: save.starter });
    });
    withRise(4, () => { // 보석 → 진주
      panel(40, 306, 880, 120);
      text('보석으로 진주 바꾸기', 70, 334, 16, C.text, { align: 'left', stroke: false });
      EXCHANGE.forEach((x2, i) => button(70 + i * 250, 352, 230, 52, `보석 ${x2.gems} → 진주 ${x2.pearls.toLocaleString()}`, () => exchange(x2), { size: 14, kind: 'soft', disabled: save.gems < x2.gems }));
      text(`가진 보석 ${save.gems}`, 600, 378, 14, '#9fe3ff', { align: 'left', body: true, stroke: false });
    });
  } else if (shop.tab === 'skin') {
    panel(40, 118, 250, 350);
    drawTurnPreview(165, 266, 220);
    text(SKINS.find((s) => s.k === save.skin).name, 165, 398, 17, C.text, { body: true, stroke: false });
    [['basic', '기본 얼굴'], ['lash', '속눈썹 얼굴']].forEach(([f, label], i) => button(56 + i * 112, 418, 106, 36, label, () => { save.face = f; persist(); sfx.click(); }, { size: 13, kind: save.face === f ? 'primary' : 'soft' }));
    SKINS.forEach((s, i) => withRise(i, () => {
      const x = 310 + (i % 4) * 154, y = 118 + Math.floor(i / 4) * 176, w = 144, h = 168, own = save.skins.includes(s.k), on = save.skin === s.k;
      panel(x, y, w, h, { sel: on, fill: on ? C.sel : undefined });
      drawImg(playerImg(s.k), x + w / 2, y + 60, 92, 0, own ? 1 : 0.45);
      text(s.name, x + w / 2, y + 114, 14, C.text, { body: true, stroke: false });
      button(x + 12, y + 128, w - 24, 32, on ? '입는 중' : own ? '입기' : `진주 ${s.cost}`, () => buySkin(s), { size: 13, kind: on ? 'soft' : own ? 'soft' : 'primary', disabled: !own && save.eggs < s.cost });
    }));
  } else {
    panel(40, 118, 270, 350);
    drawImg(IMG.egg, 175, 240, 130, Math.sin(T * 6) * 0.12);
    text('알 부화', 175, 336, 22, C.text, { stroke: false });
    const left = PETS.length - save.pets.length;
    text(left ? `안 가진 펫 ${left}마리 중 하나 · 각 ${(100 / left).toFixed(1)}%` : '다 모았어요', 175, 364, 13, C.sub, { body: true, stroke: false }); // 확률 공개
    const all = save.pets.length >= PETS.length;
    button(64, 396, 222, 52, all ? '다 모았어요!' : `진주 ${hatchCost()}개로 부화`, hatchPet, { size: 16, kind: 'yellow', disabled: all || save.eggs < hatchCost() });
    PETS.forEach((p, i) => withRise(i, () => {
      const x = 326 + (i % 3) * 206, y = 118 + Math.floor(i / 3) * 118, w = 198, h = 110, own = save.pets.includes(p.k), on = save.pet === p.k, lv = petLv(p.k);
      panel(x, y, w, h, { sel: on, fill: on ? C.sel : undefined, r: 16 });
      if (own) drawImg(IMG['pet_' + p.k], x + 38, y + 48, 58, Math.sin(T * 3 + i) * 0.08);
      else text('?', x + 38, y + 50, 40, C.mute, { stroke: false });
      text(own ? `${p.name} ${lv}단계` : '???', x + 74, y + 20, 15, C.text, { align: 'left', stroke: false });
      wrapText(own ? p.perk(lv) : '알을 깨서 만나요', 118, 13).slice(0, 2).forEach((l, k) => text(l, x + 74, y + 42 + k * 18, 13, C.sub, { align: 'left', body: true, stroke: false }));
      if (own) {
        button(x + 8, y + 76, 86, 28, on ? '함께해요' : '데려가기', () => { save.pet = on ? null : p.k; persist(); sfx.click(); }, { size: 13, kind: on ? 'primary' : 'soft' });
        button(x + 100, y + 76, 90, 28, lv >= 5 ? '최고' : `키우기 ${PET_LV_COST[lv - 1]}`, () => levelPet(p.k), { size: 13, kind: 'soft', disabled: lv >= 5 || save.eggs < PET_LV_COST[lv - 1] });
      }
    }));
  }
  if (shop.msgT > 0) text(shop.msg, 480, 474, 18, '#ffffff', { stroke: false });
  else text(shop.tab === 'gem' ? (PAY.real() ? '결제는 스토어로 · 보석은 게임 안에서만 · 거북알은 팔지 않아요' : '시험 결제 화면(실제로 돈이 나가지 않아요) · 거북알은 팔지 않아요') : '진주는 게임 안에서만 · 거북알·진주 모두 현금이 아니에요', 480, 474, 13, C.sub, { body: true, stroke: false });
  button(480 - 230, H - 50, 220, 44, `${nameOf(shop.next)} 출발!`, () => startLevel(shop.next), { size: 17 });
  button(480 + 10, H - 50, 220, 44, '지도로', () => enterMap(), { size: 17, kind: 'soft' });
  if (shop.hatch) drawHatch();
}
function drawHatch() {
  const h = shop.hatch;
  buttons.length = 0;
  ctx.fillStyle = 'rgba(16,16,18,.86)'; ctx.fillRect(-OX(), 0, W, H);
  if (h.t < 1.3) {
    const k = h.t / 1.3, wob = Math.sin(h.t * (20 + k * 40)) * 0.25 * k;
    drawImg(IMG.egg, 480, H / 2 + 10, 200 + k * 30, wob);
    text('두근두근...', 480, 90, 28, '#ffffff', { stroke: false });
  } else {
    const k = Math.min(1, (h.t - 1.3) / 0.5);
    ctx.save(); ctx.translate(480, H / 2); ctx.rotate(T * 0.6);
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = `rgba(255,213,74,${0.18 * k})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -360); ctx.lineTo(30, -360); ctx.fill(); }
    ctx.restore();
    drawImg(IMG['pet_' + h.pet.k], 480, H / 2 + 10, 220 * easeOutBack(k));
    text(`${h.pet.name} 탄생!`, 480, 80, 44, C.yellow, { lw: 8 });
    text(h.pet.perk(1), 480, 470, 20, '#ffffff', { body: true });
    if (h.t > 1.9) text('눌러서 계속', 480, 506, 15, C.sub, { body: true, stroke: false });
  }
  buttons.push({ x: 0, y: 0, w: W, h: H, on: () => { if (h.t > 1.9) shop.hatch = null; } });
}

// ───────── 산호 쉼터 (축복 카드) ─────────
function drawBless() {
  ctx.fillStyle = 'rgba(16,16,18,.72)'; ctx.fillRect(-OX(), 0, W, H);
  const lv = G.blessKind === 'lv';
  if (lv) { ctx.save(); ctx.globalAlpha = 0.5; ctx.translate(480, 80); ctx.rotate(T * 0.4); drawImg(IMG.x_lvup_burst, 0, 0, 300); ctx.restore(); }
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
  ctx.fillStyle = 'rgba(16,16,18,.66)'; ctx.fillRect(-OX(), 0, W, H);
  drawImg(IMG.comfort, 190, 230 + Math.sin(T * 2) * 6, 250);
  panel(RC.x, 110, RC.w, 300, { fill: 'rgba(27,28,31,.94)' });
  text('이어서 할까요?', RM, 154, 30, '#ffffff', { stroke: false });
  text(G.cfg.endless ? `지금 ${meters()}미터` : `지금 ${Math.floor(progress() * 100)}%`, RM, 196, 18, C.sub, { body: true, stroke: false });
  const cost = reviveCost(), ok = canRevive(), bw = (RR - RL - 12) / 2;
  button(RL, 300, bw, 64, G.freeRevive ? '공짜로 일어나기' : `이어하기 · 진주 ${cost}`, doRevive, { size: 17, kind: G.freeRevive ? 'yellow' : 'primary', disabled: !ok });
  button(RL + bw + 12, 300, bw, 64, '결과 보기', giveUp, { size: 17, kind: 'soft' });
  if (!ok) text(`진주가 ${cost - (save.eggs + G.eggs)}개 모자라요`, RM, 384, 13, C.sub, { body: true, stroke: false });
}
// ───────── 결과 화면 공통: 오른쪽 카드 한 장 · 안쪽 여백 32 · 표처럼 정렬 · 아래 단추 한 줄 ─────────
const RC = { x: 380, y: 22, w: 556, h: 496 }, RL = RC.x + 32, RR = RC.x + RC.w - 32, RM = RC.x + RC.w / 2;
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
  const lines = wrapText(line, w - 32, 14).slice(0, 2), h = 22 + lines.length * fs(14) * 1.35;
  ctx.fillStyle = 'rgba(27,28,31,.9)'; rr(x - w / 2, y, w, h, 16); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x, y - 10); ctx.lineTo(x + 10, y); ctx.fill();
  lines.forEach((l, i) => text(l, x, y + 18 + i * fs(14) * 1.35, 14, color, { body: true, stroke: false }));
}
function bottomButtons(primaryLabel, primaryFn, secondary) {
  button(RL, RC.y + RC.h - 118, RR - RL, 54, primaryLabel, primaryFn, { size: 20 });
  const n = secondary.length, gap = 10, bw = (RR - RL - gap * (n - 1)) / n;
  secondary.forEach(([label, fn], i) => button(RL + i * (bw + gap), RC.y + RC.h - 54, bw, 40, label, fn, { size: 14, kind: 'soft' }));
}
const restToday = () => { toast('오늘도 잘했어요! 내일 또 만나요 🐢', C.ok); enterMap(); }; // 「오늘은 여기까지」(조사: 같은 크기로 보이게)
const HIT_TIPS = { urchin: '가시는 점프로 넘어요 · 짧게 톡 = 낮게', shark: '빨간 ! 뒤 상어: 땅 줄이면 점프, 머리 줄이면 숙이기', eel: '빨간 줄은 곰치 돌진 — 바로 점프!', swordfish: '청새치는 머리 높이 — 오른쪽 꾹 숙이기', rock: '보라 기둥은 숙이기, 바위는 점프(위에서 밟으면 부서져요)', mine: '기뢰 아래 가시는 짧게 톡!', boss: '큰 적 띠 글자를 봐요: ↑ 뛰어요 / ↓ 숙여요', jelly: '해파리는 위에서 밟으면 통통!', puffer: '부푼 복어는 못 밟아요 — 일찍 높게', crab: '게는 위에서 밟으면 끝!', ray: '가오리는 머리 높이 — 숙이기', phantom: '유령 해파리는 숙여서 지나가요', angler: '아귀가 덥석 오면 점프!' };
function drawDead() {
  const a = Math.min(1, G.deadT / 0.25), endless = G.cfg.endless;
  ctx.fillStyle = `rgba(16,16,18,${0.66 * a})`; ctx.fillRect(-OX(), 0, W, H);
  ctx.save(); ctx.globalAlpha = a;
  drawImg(IMG.comfort, 190, 230 + Math.sin(T * 2) * 6, 260);
  sayBubble(190, 380, 300, '느려도 괜찮아요, 포기만 하지 마세요');
  resultCard();
  text('쿵! 부딪혔어요', RM, RC.y + 42, 30, '#ff9aa8', { lw: 6 });
  text(endless ? `${G.prog}미터` : `${G.prog}%`, RM, RC.y + 92, 44, '#ffffff');
  if (!endless) {
    const by = RC.y + 124;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(RL, by, RR - RL, 12, 6); ctx.fill();
    ctx.fillStyle = C.blueD; rr(RL, by, Math.max(12, (RR - RL) * G.prog / 100), 12, 6); ctx.fill();
    if (G.prevBest > 0) { const fx2 = RL + (RR - RL) * Math.min(1, G.prevBest / 100); ctx.fillStyle = C.yellow; ctx.fillRect(fx2 - 2, by - 5, 4, 22); }
  }
  const line2 = G.newBest ? '최고 기록 갱신!' : !endless && G.prevBest >= 100 ? `이미 깬 바다 · 별 ${save.stars[G.n] || 0}/3` : `최고까지 ${G.prevBest - G.prog}${endless ? '미터' : '%'}${G.lastProg != null ? ` · 지난번 ${G.lastProg}% → 이번 ${G.prog}%` : ''}`;
  text(line2, RM, RC.y + 160, 15, G.newBest ? C.yellow : C.text, { body: true, stroke: false });
  cardDivider(RC.y + 184);
  rewardRow(RC.y + 210, (x, y) => drawPearl(x, y, 20), '진주', `+${G.eggs}`, C.yellow, `가진 진주 ${save.eggs.toLocaleString()}`);
  rewardRow(RC.y + 244, (x, y) => { ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); text(String(save.lv), x, y + 1, 12, '#fff', { stroke: false }); }, '경험치', `+${G.xpGain || 0}`, '#cfe0ff', `Lv ${save.lv} · ${Math.floor((save.xp / xpNeed(save.lv)) * 100)}%`);
  if (G.appEgg) rewardRow(RC.y + 278, (x, y) => drawImg(IMG.egg, x, y, 22), '거북알', G.appEgg.eggs ? `+${G.appEgg.eggs}` : '—', C.yellow, G.appEgg.eggs ? (G.appEgg.server ? `오늘 ${G.appEgg.runs}/3` : `앱에서 받음 · 오늘 ${G.appEgg.runs}/3`) : G.appEgg.short ? '짧은 판' : '오늘 3판 다 받음');
  const tip = HIT_TIPS[G.lastHit] || '박자에 맞춰 뛰면 타이밍이 쉬워요';
  ctx.fillStyle = 'rgba(255,213,74,.1)'; rr(RL, RC.y + 304, RR - RL, 34, 10); ctx.fill();
  text(`💡 ${tip}`, RL + 14, RC.y + 322, 13, C.yellow, { align: 'left', body: true, stroke: false });
  ctx.restore();
  bottomButtons('다시 하기 ▶', () => startLevel(G.n), [['상점', () => openShop(G.n)], ['지도로', () => enterMap()], ['오늘은 여기까지', restToday]]);
  drawResultOverlay();
}
const CLEAR_LINES = ['공주님 왕관 조각을 찾았어요!', '상어왕의 발자국이 이어져요...', '바다 친구들이 응원해요!', '조금씩, 그래도 앞으로!', '공주님 목소리가 들려요!', '거의 다 왔어요!', '상어왕의 성이 보여요!'];
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
const STAR_AT = [0.5, 0.95, 1.4];
function updateClear() {
  if (endT < 4 && Math.random() < 0.035) fireworks(1, 520 + OX(), W - 40 - SAFE, 40);
  const shown = Math.floor(G.eggs * clamp((endT - 1.7) / 1.1, 0, 1));
  if (shown > (G.eggShown || 0)) snd('count', 0.35, 1 + (shown % 7) * 0.03, 0.06);
  G.eggShown = shown;
  while (G.starShown < 3 && endT >= STAR_AT[G.starShown]) {
    const i = G.starShown++, got = G.starGot[i];
    sfx.star(i, got);
    if (got) { shake = 8 + i * 3; haptic(30 + i * 15); burst(500 + OX() + i * 110, 250, '#ffe36b', 18, 300); }
  }
}
function drawClear() {
  ctx.fillStyle = 'rgba(16,16,18,.55)'; ctx.fillRect(-OX(), 0, W, H);
  drawConfetti();
  drawImg(IMG.cheer, 190, 220 + Math.abs(Math.sin(T * 4)) * -14, 250);
  if (save.pet) drawImg(IMG['pet_' + save.pet], 300, 320 + Math.abs(Math.sin(T * 4 + 1)) * -10, 62);
  sayBubble(190, 370, 300, BOSS_LINES[G.n] || CLEAR_LINES[(G.n - 1) % CLEAR_LINES.length], '#ffd1ef');
  resultCard();
  text(`${G.n}번 바다 성공!`, RM, RC.y + 42, 30, C.yellow, { lw: 6 });
  if (save.diff === 2) icon('e_crown', RM + 120, RC.y + 40, 28, Math.sin(T * 4) * 0.1);
  text(STAGES[G.n].name, RM, RC.y + 72, 14, C.sub, { body: true, stroke: false });
  const labels = ['도착', '진주 70%', '안 맞기'], details = ['', `${G.eggsGot}/${G.eggsSpawned}`, G.hits ? `${G.hits}번 맞음` : '완벽!'];
  for (let i = 0; i < 3; i++) {
    const x = RM + (i - 1) * 130, y = RC.y + 118, shown = i < G.starShown, got = G.starGot[i];
    const age = endT - STAR_AT[i], sc = shown ? (got ? 1 + Math.max(0, 0.6 - age * 3) : 1) : 0;
    drawStar(x, y, 28, false);
    if (shown && got) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); drawStar(0, 0, 28, true); ctx.restore(); }
    text(labels[i], x, y + 40, 13, shown && got ? C.yellow : C.sub, { body: true, stroke: false });
    text(details[i] || ' ', x, y + 58, 12, C.mute, { body: true, stroke: false });
  }
  cardDivider(RC.y + 194);
  // 받은 것(표): 진주는 굴러 오르고, 보너스는 하나씩 붙음
  rewardRow(RC.y + 220, (x, y) => drawPearl(x, y, 20), '진주', `+${G.eggShown || 0}`, C.yellow, G.diffBonus ? `난이도 ${G.diffBonus > 0 ? '+' : ''}${G.diffBonus}` : '');
  let px = RL + 34;
  (G.settle || []).forEach((it, i) => {
    const age = endT - (0.9 + i * 0.35); if (age < 0) return;
    if (!it.played) { it.played = true; snd('count', 0.8, 1 + i * 0.12); haptic(10); }
    const label = `${it.s} +${it.v}`, w = measureW(label, 12) + 20, s2 = age < 0.12 ? 0.6 + (age / 0.12) * 0.4 : 1;
    ctx.save(); ctx.translate(px + w / 2, RC.y + 248); ctx.scale(s2, s2);
    ctx.fillStyle = 'rgba(255,213,74,.14)'; rr(-w / 2, -11, w, 22, 11); ctx.fill();
    text(label, 0, 1, 12, C.yellow, { body: true, stroke: false }); ctx.restore();
    px += w + 8;
  });
  rewardRow(RC.y + 282, (x, y) => { ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); text(String(save.lv), x, y + 1, 12, '#fff', { stroke: false }); }, '경험치', `+${G.xpGain || 0}`, '#cfe0ff', `Lv ${save.lv} · ${Math.floor((save.xp / xpNeed(save.lv)) * 100)}%`);
  if (G.appEgg) rewardRow(RC.y + 316, (x, y) => drawImg(IMG.egg, x, y, 22), '거북알', G.appEgg.eggs ? `+${G.appEgg.eggs}` : '—', C.yellow, G.appEgg.eggs ? (G.appEgg.server ? `오늘 ${G.appEgg.runs}/3` : `앱에서 받음 · 오늘 ${G.appEgg.runs}/3`) : '오늘 3판 다 받음');
  if (G.n < LAST) { const cur = levelCfg(G.n), nxt = levelCfg(G.n + 1); text(`다음 바다: 물살 ${Math.round(cur.speed)} → ${Math.round(nxt.speed)} · 조금 더 느려요`, RM, RC.y + 352, 12, C.sub, { body: true, stroke: false }); }
  bottomButtons('다음 바다로 ▶', () => enterMap(G.n), [['상점', () => openShop(G.n + 1)], ['다시 하기', () => startLevel(G.n)], ['오늘은 여기까지', restToday]]);
  drawResultOverlay();
}
function drawEnding() {
  ctx.fillStyle = 'rgba(40,10,40,.35)'; ctx.fillRect(-OX(), 0, W, H);
  drawConfetti();
  const meet = Math.min(1, endT / 1.6);
  drawTurtle(lerp(120, 380, meet), 300 + Math.sin(T * 3) * 5, 200, 0);
  drawImg(IMG.princess, lerp(840, 590, meet), 300 + Math.sin(T * 3 + 1) * 5, 200, 0, 1, true);
  if (meet >= 1) for (let i = 0; i < 5; i++) {
    const t = (T * 0.6 + i / 5) % 1;
    ctx.globalAlpha = 1 - t; text('♥', 485 + Math.sin(t * 9 + i) * 40, 255 - t * 90, 24 + i * 2, '#ff6fa8', { stroke: '#fff', lw: 3 }); ctx.globalAlpha = 1;
  }
  text('공주 거북이 구출 성공!', 480, 60, 48, C.yellow, { lw: 8 });
  const ti = G.talkI || 0;
  if (endT > 1.8 && ti < ENDING_TALK.length) { // 대화 상자
    const ln = ENDING_TALK[ti];
    G.talkShown = Math.min(ln.text.length, (G.talkShown || 0) + 0.45);
    panel(60, 394, 840, 120, { fill: 'rgba(27,28,31,.94)' });
    ctx.save(); ctx.beginPath(); ctx.arc(130, 454, 46, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.clip();
    drawImg(ln.who === 'princess' ? IMG.princess : IMG.hello, 130, 468, 116); ctx.restore();
    text(WHO[ln.who], 196, 414, 18, ln.who === 'princess' ? '#ffd1ef' : C.yellow, { align: 'left', stroke: false });
    wrapText(ln.text.slice(0, Math.floor(G.talkShown)), 660, 21).forEach((l, k) => text(l, 196, 448 + k * 30, 21, '#ffffff', { align: 'left', body: true, stroke: false }));
    if (G.talkShown >= ln.text.length && Math.sin(T * 8) > 0) text('▼', 870, 494, 16, C.yellow, { stroke: false });
    if (G.talkShown >= ln.text.length && endT - (G.talkAt || 1.8) > ln.text.length / 27 + 3.2) endingTap();
    return;
  }
  text('다섯 바다를 건넜어요. 느려도 괜찮았죠? 포기하지 않았으니까요.', 480, 114, 20, '#ffffff', { body: true });
  if (endT > 2 && ti >= ENDING_TALK.length) {
    text('끝없는 바다·어려움 왕관에 도전해 보세요!', 480, 430, 16, C.text, { body: true, stroke: false });
    button(330, 452, 300, 56, '지도로', () => enterMap(), { size: 22 });
  }
}
function drawPause() {
  ctx.fillStyle = 'rgba(16,16,18,.66)'; ctx.fillRect(-OX(), 0, W, H);
  text('잠깐 쉬어요', 480, 140, 44, '#fff', { stroke: false });
  button(330, 200, 300, 56, '계속하기', () => { state = 'play'; }, { size: 21 });
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
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.fillStyle = f.color; ctx.fillRect(-f.size / 2, -f.size / 4, f.size, f.size / 2); ctx.restore();
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
function toastOK() { return state === 'map' && !map.overlay; }
function drawToasts() {
  if (!toastOK()) return;
  toasts.slice(0, 1).forEach((t, i) => {
    const age = 2.8 - t.t, a = Math.min(1, t.t / 0.3), slide = Math.min(1, age / 0.25);
    const y = 132 + i * 48 - (1 - easeOutBack(slide)) * 40;
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = `600 ${fs(18)}px ${FONT}`; const w = ctx.measureText(t.s).width + 56;
    ctx.fillStyle = 'rgba(27,28,31,.94)'; rr(W / 2 - w / 2, y - 20, w, 40, 20); ctx.fill();
    ctx.fillStyle = t.color; ctx.beginPath(); ctx.arc(W / 2 - w / 2 + 20, y, 5, 0, Math.PI * 2); ctx.fill();
    text(t.s, W / 2 + 8, y, 18, C.text, { body: true, stroke: false });
    ctx.restore();
  });
}

// ───────── 거북 레벨 · 결과 위에 뜨는 창(공주님 편지 → 레벨 업) ─────────
function drawLvBadge(x, y) {
  const need = xpNeed(save.lv), k = clamp(save.xp / need, 0, 1);
  ctx.fillStyle = 'rgba(16,16,18,.62)'; rr(x, y, 150, 36, 18); ctx.fill();
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
    text('공주님의 편지', -150, -150, 26, '#b24a7a', { align: 'left', stroke: false });
    text('유리병에 담겨 떠내려왔어요', -150, -118, 14, '#a08a6a', { align: 'left', body: true, stroke: false });
    const lh = fs(19) * 1.55;
    wrapText(full.slice(0, Math.floor(G.letterShow.shown)), 500, 19).forEach((l, i) => text(l, -250, -64 + i * lh, 19, '#4a3a2a', { align: 'left', body: true, stroke: false }));
    if (G.letterShow.shown >= full.length) text('— 공주 거북', 250, 150, 17, '#b24a7a', { align: 'right', stroke: false });
    ctx.restore();
    if (G.letterShow.shown >= full.length && t > 0.8) button(380, 486, 200, 44, '편지 접기', closeResultOverlay, { size: 16 });
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
  if (t > 0.7) button(430, 430, 280, 56, '좋아요!', closeResultOverlay, { size: 21 });
}

// ───────── 마지막: 다시 만난 둘의 대화 ─────────
function endingTap() {
  if (endT < 1.8) return;
  const i = G.talkI || 0;
  if (i < ENDING_TALK.length) {
    const line = ENDING_TALK[i].text;
    if ((G.talkShown || 0) < line.length) { G.talkShown = line.length; return; }
    G.talkI = i + 1; G.talkShown = 0; G.talkAt = endT; sfx.click();
    if (G.talkI === ENDING_TALK.length) { sfx.fever(); fireworks(6); confetti(80); }
  } else if (endT - (G.talkAt || 0) > 1.2) enterMap();
}
