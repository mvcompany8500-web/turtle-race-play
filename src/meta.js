'use strict';
// 터틀 레이스 — 판 밖: 도전(미션)·선물·출석·별 상자·도감·설정·월드맵(세계 3곳)·첫 이야기·상점·결과 화면
// 메뉴 화면은 가운데 960 폭에 그린다(main.js 가 OX 만큼 옮겨 줌)

// ───────── 오늘의 도전 ─────────
const MISSION_TYPES = [
  { type: 'eggsRun', goals: [30, 50, 80], text: (n) => `한 판에 알 ${n}개 모으기` },
  { type: 'near', goals: [5, 10, 20], text: (n) => `아슬아슬 회피 ${n}번` },
  { type: 'boostKill', goals: [5, 10, 20], text: (n) => `질주로 ${n}마리 물리치기` },
  { type: 'clear', goals: [1, 2, 3], text: (n) => `바다 ${n}곳 성공하기` },
  { type: 'fever', goals: [1, 2, 3], text: (n) => `알 소나기 ${n}번 부르기` },
  { type: 'gold', goals: [3, 6, 10], text: (n) => `황금알 ${n}개 먹기` },
  { type: 'runs', goals: [3, 5, 8], text: (n) => `${n}판 도전하기` },
  { type: 'boost', goals: [3, 6, 10], text: (n) => `질주 ${n}번 쓰기` },
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
  toast(`알 +${m.reward}`, C.yellow);
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
  toast(`선물 상자! 알 +${n}`, C.yellow);
}
function checkStreak() {
  const t = today();
  if (save.streak.last === t) return;
  save.streak.day = save.streak.last === today(1) ? save.streak.day + 1 : 1;
  save.streak.last = t;
  const r = Math.min(70, save.streak.day * 10);
  save.eggs += r; persist();
  fountain(W / 2, H / 2, r);
  toast(`출석 ${save.streak.day}일째! 알 +${r}`, C.yellow);
}
const chestGoal = () => (save.chests + 1) * 10;
const chestReady = () => totalStars() >= chestGoal();
function openChest() {
  if (!chestReady()) { sfx.no(); toast(`별 ${chestGoal()}개를 모으면 열려요 (지금 ${totalStars()}개)`); return; }
  save.chests++; save.eggs += 80; persist();
  fountain(W / 2, 40, 80); confetti(60); sfx.crack(); haptic([30, 30, 80]);
  toast('별 상자! 알 +80', C.yellow);
}

// ───────── 월드맵: 세계 3곳 × 바다 10칸 ─────────
// 칸 자리(960 폭 기준). 0 = 끝없는 바다(첫 세계에만), 1~10 = 그 세계의 바다
const NODES = [
  { x: 250, y: 168 }, { x: 90, y: 398 }, { x: 190, y: 326 }, { x: 290, y: 394 }, { x: 385, y: 314 }, { x: 478, y: 236 },
  { x: 578, y: 302 }, { x: 668, y: 378 }, { x: 762, y: 322 }, { x: 842, y: 248 }, { x: 884, y: 168 },
];
const map = { cur: 1, world: 1, x: 90, y: 398, path: [], face: 1, overlay: null, pageT: 1 };
const wOf = (s) => (s === 0 ? 1 : Math.ceil(s / 10));
const local = (s) => (s === 0 ? 0 : ((s - 1) % 10) + 1);
const nodeOpen = (s) => (s === 0 ? endlessOpen() : s >= 1 && s <= save.unlocked);
const worldOpen = (w) => save.unlocked >= (w - 1) * 10 + 1;
function placeHero(s) { map.cur = s; map.world = wOf(s); const n = NODES[local(s)]; map.x = n.x; map.y = n.y; map.path = []; }
function mapGo(target) {
  if (!nodeOpen(target) || map.path.length || target === map.cur) return;
  if (target === 0 || map.cur === 0 || wOf(target) !== wOf(map.cur)) { placeHero(target); map.pageT = 0; sfx.swoosh(); return; }
  const d = target > map.cur ? 1 : -1;
  for (let i = map.cur + d; d > 0 ? i <= target : i >= target; i += d) map.path.push(i);
  sfx.click();
}
function updateMap(dt) {
  map.pageT = Math.min(1, map.pageT + dt * 3);
  if (!map.path.length) return;
  const n = NODES[local(map.path[0])];
  const dx = n.x - map.x, dy = n.y - map.y, d = Math.hypot(dx, dy), stepLen = 300 * dt;
  if (Math.abs(dx) > 2) map.face = dx > 0 ? 1 : -1;
  if (d <= stepLen) { map.x = n.x; map.y = n.y; map.cur = map.path.shift(); tone(700, 900, 0.05, 'square', 0.05); }
  else { map.x += dx / d * stepLen; map.y += dy / d * stepLen; }
}
function enterMap(fromClear) {
  state = 'map'; map.overlay = null; setMusic('map'); musicFever = false;
  ensureMissions(); checkStreak();
  if (!nodeOpen(map.cur)) placeHero(Math.min(save.unlocked, LAST));
  if (fromClear && fromClear < LAST && nodeOpen(fromClear + 1)) {
    placeHero(fromClear);
    if (wOf(fromClear + 1) === wOf(fromClear)) mapGo(fromClear + 1);
    else { setTimeout(() => { if (state === 'map') { placeHero(fromClear + 1); map.pageT = 0; sfx.levelup(); toast(`새 세계 「${WORLDS[wOf(fromClear + 1) - 1].name}」가 열렸어요!`, C.yellow); } }, 900); }
  } else if (G && !map.path.length) { const s = G.n === ENDLESS ? 0 : G.n; if (nodeOpen(s)) placeHero(s); }
  map.world = wOf(map.cur);
}
function mapPlay() { if (map.path.length) return; if (map.world !== wOf(map.cur)) { sfx.no(); return; } startLevel(map.cur === 0 ? ENDLESS : map.cur); }
function mapStep(d) {
  if (map.path.length) return;
  let t = map.cur === 0 ? (d > 0 ? 1 : 0) : map.cur + d;
  if (t === 0 && !endlessOpen()) return;
  if (t > LAST || t < 0 || !nodeOpen(t)) { sfx.no(); return; }
  mapGo(t);
}
function mapPage(d) {
  const w = clamp(map.world + d, 1, 3);
  if (w === map.world) return;
  map.world = w; map.pageT = 0; sfx.swoosh();
  if (worldOpen(w)) { const first = (w - 1) * 10 + 1, s = clamp(save.unlocked, first, first + 9); placeHero(s); }
}
function drawMapBg(w) {
  const pal = [['#41c9f2', '#0d5aa6'], ['#2b3f9c', '#0a0b2e'], ['#8fdcf2', '#5a1a2e']][w - 1];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]);
  ctx.fillStyle = g; ctx.fillRect(-OX(), 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 2;
  for (let r = 0; r < 9; r++) { ctx.beginPath(); for (let x = -OX(); x <= 960 + OX(); x += 20) ctx.lineTo(x, 70 + r * 52 + Math.sin(x / 50 + T + r) * 4); ctx.stroke(); }
  if (w === 2) for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(120,255,230,${0.3 + 0.3 * Math.sin(T * 2 + i)})`; ctx.beginPath(); ctx.arc(hash(i) * 960, 70 + hash(i * 7) * 380, 2, 0, Math.PI * 2); ctx.fill(); }
  const blobs = w === 1 ? [[140, 470, 120, 30, '#e9d193'], [520, 420, 90, 26, '#e9d193'], [700, 150, 80, 24, '#e9d193'], [330, 170, 70, 20, '#ff8fb0'], [600, 470, 70, 18, '#ff8fb0'], [60, 200, 50, 16, '#7fdc8a']]
    : w === 2 ? [[140, 470, 120, 30, '#3a3f7a'], [520, 430, 90, 26, '#2f2a66'], [700, 150, 80, 24, '#3a3f7a'], [330, 170, 70, 20, '#5a3f9a']]
      : [[140, 470, 120, 30, '#dfefff'], [520, 430, 90, 26, '#ff7a45'], [700, 150, 80, 24, '#dfefff'], [330, 170, 70, 20, '#ff9a5a']];
  for (const [bx, by, rx, ry, c] of blobs) { ctx.fillStyle = c; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const b of bubbles) { ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(b.x - OX(), b.y, b.r, 0, Math.PI * 2); ctx.stroke(); }
}
function drawMap() {
  const w = map.world, base = (w - 1) * 10, slide = (1 - easeInOutCubic(map.pageT)) * 60;
  drawMapBg(w);
  ctx.save(); ctx.globalAlpha = map.pageT; ctx.translate(slide, 0);
  // 길
  const seg = (a, b, lit, dash) => {
    const A = NODES[a], B = NODES[b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2 - 24;
    ctx.setLineDash(dash ? [10, 9] : []); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(A.x, A.y + 3); ctx.quadraticCurveTo(mx, my + 3, B.x, B.y + 3); ctx.stroke();
    ctx.strokeStyle = lit ? C.yellow : 'rgba(255,255,255,.45)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(mx, my, B.x, B.y); ctx.stroke();
    ctx.setLineDash([]);
  };
  for (let i = 1; i < 10; i++) seg(i, i + 1, base + i + 1 <= save.unlocked, base + i + 1 > save.unlocked);
  if (w === 1 && endlessOpen()) seg(5, 0, true, true);
  // 큰 상어 성 (5·10번째)
  const bossFlag = { shark: '#3e5a76', shark2: '#2a4566', octopus: '#d0457f', octopus2: '#a0306a', angler: '#c98a2a', king: '#8a3cff' };
  for (const i of [5, 10]) {
    const s = base + i, bk = STAGES[s].boss;
    drawCastle(NODES[i].x + (i === 10 ? -4 : 4), NODES[i].y - 18, i === 10 ? 0.7 : 0.62, bossFlag[bk] || '#ff3355', w > 1);
  }
  if (w === 3 && !save.cleared) {
    const px = NODES[10].x - 92, py = NODES[10].y - 44 + Math.sin(T * 2) * 4;
    drawImg(IMG.princess, px, py, 52, 0, 1, true);
    ctx.strokeStyle = 'rgba(200,240,255,.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px, py, 32, 0, Math.PI * 2); ctx.stroke();
    text('살려줘요!', px, py - 42, 13, '#ffd1ef', { body: true });
    ctx.save(); ctx.translate(NODES[10].x - 190, NODES[10].y - 36); ctx.scale(-1, 1);
    drawShark(0, Math.sin(T * 1.5) * 6, 0.45, '#8a6bd6', '#3f2a7a', true, false, true, Math.sin(T * 8) * 0.3, 0.3);
    ctx.restore();
  } else if (w === 3) {
    drawImg(IMG.princess, NODES[10].x - 64, NODES[10].y - 70, 50, Math.sin(T * 3) * 0.1);
    text('♥', NODES[10].x - 40, NODES[10].y - 100 - Math.abs(Math.sin(T * 3)) * 8, 18, '#ff6fa8', { lw: 3 });
  } else {
    text(w === 1 ? '공주님은 더 깊은 바다로...' : '얼음 불꽃 바다 너머에!', NODES[10].x - 150, NODES[10].y - 40, 13, '#ffd1ef', { body: true });
  }
  // 끝없는 바다
  if (w === 1 && endlessOpen()) {
    const e = NODES[0];
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(T * 2);
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = ['#7cf0ff', '#b48bff', '#ffffff'][i]; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 14 + i * 7, i, i + 4.2); ctx.stroke(); }
    ctx.restore();
    if (map.cur === 0 && !map.path.length) { ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * Math.sin(T * 5)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, 40, 0, Math.PI * 2); ctx.stroke(); }
    text('끝없는 바다', e.x, e.y + 42, 14, '#fff', { body: true });
    if (save.endlessBest) text(`${save.endlessBest}미터`, e.x, e.y + 60, 13, C.yellow, { body: true });
  }
  // 칸
  for (let i = 1; i <= 10; i++) {
    const s = base + i, n = NODES[i], open = nodeOpen(s), st = save.stars[s] || 0, sel = map.cur === s && !map.path.length;
    if (sel) { ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * Math.sin(T * 5)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(n.x, n.y, 30 + Math.sin(T * 5) * 3, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(n.x, n.y + 6, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = !open ? C.sel : st ? C.blue : '#F2F3F5';
    ctx.beginPath(); ctx.arc(n.x, n.y, 21, 0, Math.PI * 2); ctx.fill();
    if (open) text(String(s), n.x, n.y + 1, 17, st ? '#ffffff' : '#191F28', { stroke: false });
    else icon('e_lock', n.x, n.y, 22);
    if (open) for (let k = 0; k < 3; k++) drawStar(n.x - 16 + k * 16, n.y + 31, 7, k < st);
    if (save.crown[s]) icon('e_crown', n.x + 18, n.y - 18, 20);
    if (STAGES[s].dark && open) { ctx.strokeStyle = 'rgba(16,16,18,.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(n.x, n.y, 24, 0, Math.PI * 2); ctx.stroke(); }
  }
  // 거북이
  if (wOf(map.cur) === w) {
    const walking = map.path.length > 0;
    drawHero(map.x, map.y - 40 + (walking ? Math.abs(Math.sin(T * 12)) * -6 : Math.sin(T * 3) * 3), 58, walking ? 0.1 : 0, { ph: T * (walking ? 18 : 6), flip: map.face < 0, stand: !walking });
    if (save.pet) drawImg(IMG['pet_' + save.pet], map.x - 34 * map.face, map.y - 26 + Math.sin(T * 4) * 3, 28);
  }
  ctx.restore();
  // 잠긴 세계
  if (!worldOpen(w)) {
    ctx.fillStyle = 'rgba(16,16,18,.6)'; ctx.fillRect(-OX(), 60, W, 396);
    icon('e_lock', 480, 230, 64);
    text(`${(w - 1) * 10}번 바다를 깨면 열려요`, 480, 290, 24, C.text);
  }
  // 세계 넘기기
  text(`세계 ${w} · ${WORLDS[w - 1].name}`, 480, 84, 20, '#ffffff');
  if (w > 1) button(-OX() + SAFE + 14, 240, 48, 64, '◀', () => mapPage(-1), { size: 20, color: '#cfd8ff' });
  if (w < 3) button(960 + OX() - SAFE - 62, 240, 48, 64, '▶', () => mapPage(1), { size: 20, color: '#cfd8ff' });
  // 위쪽 막대
  const L = -OX() + SAFE, R = 960 + OX() - SAFE;
  ctx.fillStyle = 'rgba(16,16,18,.6)'; ctx.fillRect(-OX(), 0, W, 60);
  eggBadge(L + 40, 30, save.eggs, 30 * (1 + hudPulse * 1.6));
  const cr = chestReady();
  button(L + 150, 10, 150, 40, `별 ${totalStars()} · 상자 ${cr ? '열기!' : chestGoal()}`, openChest, { size: 14, kind: cr ? 'yellow' : 'soft' });
  if (save.streak.day) text(`출석 ${save.streak.day}일째`, L + 312, 31, 14, C.yellow, { align: 'left', body: true });
  const gr = giftReady();
  const btns = [
    [gr ? '선물 받기!' : `선물 ${giftLeft()}`, openGift, gr ? 'yellow' : 'soft', 'e_gift'],
    ['오늘의 도전', () => { map.overlay = 'missions'; sfx.click(); }, 'soft', 'e_target'],
    ['도감', () => { map.overlay = 'dex'; sfx.click(); }, 'soft', 'e_dex'],
    ['상점', () => openShop(map.cur === 0 ? ENDLESS : map.cur), 'primary', null],
    ['설정', () => { map.overlay = 'settings'; sfx.click(); }, 'soft', null],
  ];
  const bw = [118, 120, 76, 76, 76];
  let bx = R - bw.reduce((a, b) => a + b + 8, 0);
  btns.forEach(([label, on, kind, ic], i) => {
    button(bx, 10, bw[i], 40, label, on, { size: 14, kind });
    if (ic) icon(ic, bx + 4, 16, 24, ic === 'e_gift' && gr ? Math.sin(T * 10) * 0.2 : 0);
    if (i === 1 && missionsReady()) { ctx.fillStyle = C.danger; ctx.beginPath(); ctx.arc(bx + bw[i] - 4, 12, 10, 0, Math.PI * 2); ctx.fill(); text(String(missionsReady()), bx + bw[i] - 4, 13, 13, '#fff', { stroke: false }); }
    bx += bw[i] + 8;
  });
  // 아래 칸 정보 + 난이도
  panel(L + 4, 456, R - L - 8, 76);
  const s = map.cur;
  if (s === 0) {
    text('끝없는 바다', L + 28, 482, 22, C.text, { align: 'left' });
    text(`최고 기록 ${save.endlessBest}미터 · 갈수록 붐벼요`, L + 28, 510, 14, C.sub, { align: 'left', body: true, stroke: false });
  } else {
    text(`${s}번 바다 · ${STAGES[s].name}${STAGES[s].boss ? ' (큰 적)' : ''}`, L + 28, 482, 20, C.text, { align: 'left' });
    for (let k = 0; k < 3; k++) drawStar(L + 38 + k * 24, 510, 9, k < (save.stars[s] || 0));
    text(save.best[s] ? `최고 ${save.best[s]}%` : '처음 도전!', L + 120, 510, 14, C.sub, { align: 'left', body: true, stroke: false });
  }
  DIFFS.forEach((d, i) => button(R - 470 + i * 84, 470, 78, 44, d.name, () => { save.diff = i; persist(); sfx.click(); }, { size: 15, kind: save.diff === i ? 'primary' : 'soft' }));
  text(save.diff === 2 ? '알 1.5배 · 왕관' : save.diff === 0 ? '천천히 · 알 0.8배' : '', R - 340, 524, 13, save.diff === 2 ? C.yellow : C.sub, { body: true, stroke: false });
  button(R - 210, 466, 196, 56, '출발!', mapPlay, { size: 22 });
  if (map.overlay === 'missions') drawMissions();
  else if (map.overlay === 'dex') drawDex();
  else if (map.overlay === 'settings') drawSettings();
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
    else { drawImg(IMG.egg, 636, y + 38, 24); text(`+${m.reward}`, 652, y + 39, 18, C.yellow, { align: 'left', stroke: false }); }
  }));
  text('도전을 이루면 바로 새 도전이 와요', 480, 402, 14, C.sub, { body: true, stroke: false });
  button(400, 420, 160, 40, '닫기', () => { map.overlay = null; sfx.click(); }, { size: 16, kind: 'soft' });
}
function drawDex() {
  overlayBase(60, 66, 840, 420, '바다 도감', 'e_dex');
  const found = ENEMY_KEYS.filter((k) => save.dex[k]).length;
  text(`${found}/${ENEMY_KEYS.length} 만남`, 880, 104, 13, C.sub, { align: 'right', body: true, stroke: false });
  ENEMY_KEYS.forEach((k, i) => withRise(i, () => {
    const col = i % 4, row = Math.floor(i / 4), x = 80 + col * 202, y = 128 + row * 112, info = ENEMIES[k], d = save.dex[k];
    panel(x, y, 192, 102, { fill: C.sel, r: 16 });
    ctx.save(); ctx.beginPath(); rr(x, y, 70, 102, 16); ctx.clip();
    if (d) drawEnemy({ type: k, x: x + 36, y: y + 52, r: k === 'puffer' ? 16 : k === 'eel' ? 10 : 18, t: T, ph: 0, len: 40, baseY: y + 52, top: false, armed: false }, x + 200, y + 52);
    else text('?', x + 36, y + 52, 40, C.mute, { stroke: false });
    ctx.restore();
    ctx.save(); rr(x, y, 192, 102, 16); ctx.clip();
    const small = fs(13) > 16; // 폰: 글자가 커지니 설명 줄은 빼고 이름·약점만
    if (d) {
      text(info.name, x + 76, y + 22, 16, C.text, { align: 'left', stroke: false });
      if (!small) text(info.trait, x + 76, y + 46, 13, C.sub, { align: 'left', body: true, stroke: false });
      drawItemIcon(info.weak, x + 88, y + (small ? 64 : 76), 22);
      text(ITEMS[info.weak].name, x + 102, y + (small ? 64 : 76), 13, d.weak ? C.yellow : C.sub, { align: 'left', body: true, stroke: false });
      if (small) text(`약점`, x + 76, y + 88, 13, C.mute, { align: 'left', body: true, stroke: false });
    } else text(`${info.intro}번 바다`, x + 76, y + 50, 13, C.mute, { align: 'left', body: true, stroke: false });
    ctx.restore();
  }));
  button(400, 476 - 38, 160, 40, '닫기', () => { map.overlay = null; sfx.click(); }, { size: 16, kind: 'soft' });
}
function goFullscreen() {
  const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (rq) {
    Promise.resolve(rq.call(el)).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* 지원 안 함 */ } }).catch(() => toast('이 브라우저는 꽉 찬 화면을 못 써요'));
  } else toast('아이폰은 공유 → 「홈 화면에 추가」로 꽉 차게 볼 수 있어요', C.blueD);
}
function drawSettings() {
  overlayBase(280, 80, 400, 390, '설정', null);
  const rows = [
    ['배경 음악', !save.musicOff, () => { save.musicOff = !save.musicOff; persist(); initAudio(); }],
    ['효과음', !save.sfxOff, () => { save.sfxOff = !save.sfxOff; persist(); initAudio(); sfx.tap(); }],
    ['진동', save.haptics, () => { save.haptics = !save.haptics; persist(); haptic(30); }],
  ];
  rows.forEach(([label, on, fn], i) => withRise(i, () => {
    const y = 140 + i * 62;
    text(label, 312, y + 22, 18, C.text, { align: 'left', stroke: false });
    button(520, y, 130, 44, on ? '켜짐' : '꺼짐', fn, { size: 15, kind: on ? 'primary' : 'soft' });
  }));
  button(312, 330, 338, 44, '꽉 찬 화면으로 보기', goFullscreen, { size: 15, kind: 'soft' });
  button(312, 382, 338, 44, '첫 이야기 다시 보기', startIntro, { size: 15, kind: 'soft' });
  text('거북알은 현금이 아니에요 · 게임 안에서만 써요', 480, 448, 13, C.sub, { body: true, stroke: false });
}

// ───────── 첫 이야기: 공주 납치 ─────────
const INTRO = [
  { who: 'princess', text: '오늘은 바다 축제 날이에요! 다 같이 신나게 놀아요~' },
  { who: 'hero', text: '공주님! 오늘 레이스에서 꼭 1등 할게요!' },
  { who: 'shark', text: '크하하하! 축제는 끝났다!!', ev: 'sharkIn' },
  { who: 'shark', text: '공주는 깊은 바다 끝 내 성으로 데려간다! 느림보 거북이가 따라올 수 있을까?', ev: 'grab' },
  { who: 'princess', text: '꺄악! 터틀아, 살려줘요!!', ev: 'leave' },
  { who: 'hero', text: '공주님!!! 느려도 괜찮아... 절대 포기 안 해! 세 바다를 건너서라도 꼭 구하러 갈게요!', ev: 'resolve' },
  { who: null, text: '', ev: 'title' },
];
const WHO = { princess: '공주 거북', hero: '터틀이', shark: '상어왕' };
const cut = { i: 0, t: 0, shown: 0 };
function startIntro() { state = 'intro'; cut.i = 0; cut.t = 0; cut.shown = 0; setMusic('title'); map.overlay = null; }
function introStep(s) {
  if (s.ev === 'sharkIn') { shake = 24; flash = 0.6; flashColor = '#ff3355'; sfx.roar(); haptic([60, 40, 120]); setMusic('boss'); }
  if (s.ev === 'grab') { sfx.bubble(); shake = 8; }
  if (s.ev === 'leave') { whoosh(2000, 200, 0.8, 0.3); }
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
function startGame() { if (!save.introSeen) startIntro(); else { placeHero(Math.min(save.unlocked, LAST)); enterMap(); } }
function drawTitle() {
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
  if (isTouch) button(510, 414, 200, 44, '꽉 찬 화면', goFullscreen, { size: 14, kind: 'soft' });
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
  if (save.eggs < c) { sfx.no(); shopSay(`거북알이 ${c - save.eggs}개 부족해요`); return; }
  save.eggs -= c; save.up[u.k]++; persist(); sfx.levelup(); haptic(25);
  shopSay(`${u.name} ${save.up[u.k]}단계!`);
}
function wearSkin(k) {
  if (save.skin === k) return;
  if (!REDUCE) shop.turn = { t: 0, from: save.skin, to: k }; // 앱의 휘리릭 턴: 앞 → 옆 → 뒤 → 옆 → 앞(새 옷)
  save.skin = k; persist(); haptic(30);
  whoosh(600, 4000, 0.6, 0.25);
}
function buySkin(s) {
  if (save.skins.includes(s.k)) { wearSkin(s.k); shopSay(`${s.name} 입었어요`); return; }
  if (save.eggs < s.cost) { sfx.no(); shopSay(`거북알이 ${s.cost - save.eggs}개 부족해요`); return; }
  save.eggs -= s.cost; save.skins.push(s.k); sfx.buy(); wearSkin(s.k); shopSay(`${s.name} 획득!`);
}
function hatchPet() {
  const left = PETS.filter((p) => !save.pets.includes(p.k));
  if (!left.length) { shopSay('펫을 다 모았어요!'); return; }
  if (save.eggs < HATCH_COST) { sfx.no(); shopSay(`거북알이 ${HATCH_COST - save.eggs}개 부족해요`); return; }
  const p = pick(left);
  save.eggs -= HATCH_COST; save.pets.push(p.k); save.pet = p.k; save.petLv[p.k] = 1; persist();
  shop.hatch = { t: 0, pet: p, cracked: false };
  sfx.click(); haptic(20);
}
function levelPet(k) {
  const lv = petLv(k);
  if (lv >= 5) { shopSay('최고 단계예요'); return; }
  const c = PET_LV_COST[lv - 1];
  if (save.eggs < c) { sfx.no(); shopSay(`거북알이 ${c - save.eggs}개 부족해요`); return; }
  save.eggs -= c; save.petLv[k] = lv + 1; persist(); sfx.levelup(); haptic(25);
  shopSay(`${PETS.find((p) => p.k === k).name} ${lv + 1}단계!`);
}
function updateShop(dt) {
  if (shop.msgT > 0) shop.msgT -= dt;
  if (shop.turn) { shop.turn.t += dt / 0.92; if (shop.turn.t >= 1) { shop.turn = null; sfx.buy(); haptic([15, 30, 15]); } }
  if (shop.hatch) {
    const h = shop.hatch; h.t += dt;
    if (h.t < 1.3 && Math.random() < dt * 8) { tone(300 + h.t * 300, 200, 0.05, 'square', 0.05); haptic(8); }
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
  text('거북알 상점', 480, 34, 32, C.text, { stroke: false });
  eggBadge(960 + OX() - SAFE - 120, 34, save.eggs, 30 * (1 + hudPulse * 1.6));
  [['up', '실력 키우기'], ['skin', '옷장'], ['pet', '펫']].forEach(([k, label], i) => {
    button(480 - 300 + i * 204, 62, 192, 40, label, () => { shop.tab = k; sfx.click(); }, { size: 16, kind: shop.tab === k ? 'primary' : 'soft' });
  });
  if (shop.tab === 'up') {
    UPS.forEach((u, i) => withRise(i, () => {
      const x = 40 + i * 222, y = 124, w = 206, h = 270, lv = save.up[u.k], c = upCost(u);
      panel(x, y, w, h);
      icon(['e_snow', 'e_rocket', 'e_shield', 'e_gem'][i], x + w / 2, y + 52, 64, Math.sin(T * 2 + i) * 0.08);
      text(u.name, x + w / 2, y + 112, 19, C.text, { stroke: false });
      text(u.desc, x + w / 2, y + 140, 14, C.sub, { body: true, stroke: false });
      for (let k = 0; k < u.max; k++) { ctx.fillStyle = k < lv ? C.blueD : C.line; rr(x + w / 2 - u.max * 13 + k * 26, y + 164, 20, 10, 5); ctx.fill(); }
      if (c == null) text('최고 단계', x + w / 2, y + 222, 18, C.ok, { stroke: false });
      else button(x + 20, y + 196, w - 40, 52, `알 ${c}개`, () => buyUp(i), { size: 18, disabled: save.eggs < c });
    }));
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
      button(x + 12, y + 128, w - 24, 32, on ? '입는 중' : own ? '입기' : `알 ${s.cost}`, () => buySkin(s), { size: 13, kind: on ? 'soft' : own ? 'soft' : 'primary', disabled: !own && save.eggs < s.cost });
    }));
  } else {
    panel(40, 118, 270, 350);
    drawImg(IMG.egg, 175, 240, 130, Math.sin(T * 6) * 0.12);
    text('알 부화', 175, 336, 22, C.text, { stroke: false });
    text('어떤 펫이 나올까요?', 175, 364, 14, C.sub, { body: true, stroke: false });
    const all = save.pets.length >= PETS.length;
    button(64, 396, 222, 52, all ? '다 모았어요!' : `알 ${HATCH_COST}개로 부화`, hatchPet, { size: 16, kind: 'yellow', disabled: all || save.eggs < HATCH_COST });
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
  if (shop.msgT > 0) text(shop.msg, 480, 482, 18, '#ffffff', { stroke: false });
  else text('거북알은 현금이 아니에요 · 게임 안에서만 써요', 480, 482, 13, C.sub, { body: true, stroke: false });
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
  text('산호 쉼터', 480, 70, 40, C.yellow, { lw: 8 });
  text('잠깐 쉬어 가요. 하나만 골라요!', 480, 116, 18, C.text, { body: true });
  (G.bless || []).forEach((b, i) => withRise(i, () => {
    const x = 150 + i * 230, y = 150, w = 210, h = 270;
    const hover = mouse.x >= x + OX() && mouse.x <= x + OX() + w && mouse.y >= y && mouse.y <= y + h;
    panel(x, y - (hover ? 6 : 0), w, h, { fill: C.gray, sel: hover });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x + w / 2, y + 80, 4, x + w / 2, y + 80, 80); g.addColorStop(0, 'rgba(76,130,255,.35)'); g.addColorStop(1, 'rgba(76,130,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + w / 2, y + 80, 80, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    drawItemIcon(b.icon, x + w / 2, y + 82 + Math.sin(T * 3 + i) * 4, 72);
    text(b.name, x + w / 2, y + 160, 20, C.text, { stroke: false });
    wrapText(b.desc, w - 30, 14).forEach((l, k) => text(l, x + w / 2, y + 190 + k * 20, 14, C.sub, { body: true, stroke: false }));
    button(x + 20, y + h - 56, w - 40, 44, isTouch ? '고르기' : `고르기 (${i + 1})`, () => chooseBless(i), { size: 15 });
  }));
}

// ───────── 결과 화면 ─────────
function drawRevive() {
  ctx.fillStyle = 'rgba(16,16,18,.66)'; ctx.fillRect(-OX(), 0, W, H);
  drawImg(IMG.comfort, 220, 290 + Math.sin(T * 2) * 6, 250);
  text('이어서 할까요?', 620, 86, 42, '#ffffff', { lw: 7 });
  const left = Math.max(0, G.reviveT), k = left / 5;
  ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(620, 216, 66, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = k > 0.4 ? C.blueD : C.danger; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(620, 216, 66, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
  const s = 1 + (1 - (left % 1)) * 0.25;
  ctx.save(); ctx.translate(620, 218); ctx.scale(s, s); text(String(Math.ceil(left)), 0, 0, 60, '#ffffff'); ctx.restore();
  if (!G.cfg.endless) text(`지금 ${Math.floor(progress() * 100)}% — 여기서 끝내기 아까워요!`, 620, 310, 18, C.yellow, { body: true });
  else text(`지금 ${meters()}미터 — 조금만 더!`, 620, 310, 18, C.yellow, { body: true });
  const cost = reviveCost(), ok = canRevive();
  button(460, 340, 320, 56, G.freeRevive ? '공짜로 일어나기!' : ok ? `이어하기 · 알 ${cost}개` : `알 ${cost}개가 필요해요`, doRevive, { size: 19, kind: G.freeRevive ? 'yellow' : 'primary', disabled: !ok });
  button(520, 410, 200, 44, '괜찮아요', giveUp, { size: 16, kind: 'soft' });
}
function drawDead() {
  const a = Math.min(1, G.deadT / 0.3);
  ctx.fillStyle = `rgba(16,16,18,${0.66 * a})`; ctx.fillRect(-OX(), 0, W, H);
  ctx.save(); ctx.globalAlpha = a;
  drawImg(IMG.comfort, 200, 290 + Math.sin(T * 2) * 6, 260);
  text('쿵! 부딪혔어요', 600, 60, 44, '#ff9aa8', { lw: 8 });
  const bx = 400, by = 104, bw = 400, endless = G.cfg.endless;
  text(endless ? `${G.prog}미터` : `${G.prog}%`, 600, by + 30, 50, '#ffffff');
  if (!endless) {
    ctx.fillStyle = 'rgba(255,255,255,.15)'; rr(bx, by + 68, bw, 14, 7); ctx.fill();
    ctx.fillStyle = C.blueD; rr(bx, by + 68, Math.max(14, bw * G.prog / 100), 14, 7); ctx.fill();
    if (G.prevBest > 0) { const fxp = bx + bw * G.prevBest / 100; ctx.fillStyle = C.yellow; ctx.fillRect(fxp - 2, by + 62, 4, 26); }
  }
  if (G.newBest) { icon('e_trophy', 470, by + 110, 34, Math.sin(T * 6) * 0.15); text('최고 기록 갱신!', 600, by + 110, 24, C.yellow); }
  else if (!endless && G.prevBest >= 100) text(`이미 깬 바다예요. 별 ${(save.stars[G.n] || 0) < 3 ? `${save.stars[G.n] || 0}개 → 3개 도전!` : '3개 다 모았어요!'}`, 600, by + 110, 18, C.yellow, { body: true });
  else text(`최고 기록까지 ${G.prevBest - G.prog}${endless ? '미터' : '%'} 남았어요. 조금만 더!`, 600, by + 110, 18, C.yellow, { body: true });
  eggBadge(540, by + 150, `+${G.eggs}  (모은 알 ${save.eggs})`, 26);
  const need = cheapestNext(), m = closestMission();
  const hint = need === Infinity ? '상점을 다 채웠어요!' : save.eggs >= need ? '상점에서 키울 수 있어요!' : `다음 키우기까지 알 ${need - save.eggs}개`;
  text(hint, 600, by + 186, 16, C.sub, { body: true, stroke: false });
  if (m) text(`도전 「${missionText(m)}」 ${m.prog}/${m.goal}`, 600, by + 210, 15, C.blueD, { body: true, stroke: false });
  text('느려도 괜찮아요, 포기만 하지 마세요', 600, by + 244, 20, '#ffffff', { body: true });
  ctx.restore();
  button(420, 392, 360, 56, '다시 하기', () => startLevel(G.n), { size: 21 });
  button(420, 460, 174, 44, '상점', () => openShop(G.n), { size: 16, kind: 'soft' });
  button(606, 460, 174, 44, '지도로', () => enterMap(), { size: 16, kind: 'soft' });
}
const CLEAR_LINES = ['공주님 왕관 조각을 찾았어요!', '상어왕의 발자국이 이어져요...', '바다 친구들이 응원해요!', '조금씩, 그래도 앞으로!', '공주님 목소리가 들려요!', '거의 다 왔어요!', '상어왕의 성이 보여요!'];
const BOSS_LINES = {
  5: '앗, 여긴 상어 대장 집이었어요! 공주님은 더 깊은 곳에!',
  10: '대왕 문어가 그러는데... 공주님은 깊은 바다로 갔대요!',
  15: '아귀 대왕도 이겼어요! 공주님 목소리가 가까워져요!',
  20: '상어 대장이 도망쳤어요! 이제 얼음 불꽃 바다로!',
  25: '대왕 문어가 길을 비켜 줬어요. 상어왕의 성이 코앞!',
};
const STAR_AT = [0.5, 0.95, 1.4];
function updateClear() {
  const shown = Math.floor(G.eggs * clamp((endT - 1.7) / 1.1, 0, 1));
  if (shown > (G.eggShown || 0) && Math.floor(endT * 30) % 2 === 0) tone(1200 + shown % 7 * 60, 1500, 0.03, 'square', 0.03);
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
  drawImg(IMG.cheer, 180, 280 + Math.abs(Math.sin(T * 4)) * -18, 260);
  if (save.pet) drawImg(IMG['pet_' + save.pet], 300, 400 + Math.abs(Math.sin(T * 4 + 1)) * -12, 70);
  text(`${G.n}번 바다 성공!`, 610, 46, 40, C.yellow, { lw: 8 });
  if (save.diff === 2) icon('e_crown', 790, 44, 34, Math.sin(T * 4) * 0.1);
  const labels = ['도착하기', `알 70% (${G.eggsGot}/${G.eggsSpawned})`, '한 번도 안 맞기'];
  for (let i = 0; i < 3; i++) {
    const x = 500 + i * 110, y = 124, shown = i < G.starShown, got = G.starGot[i];
    const age = endT - STAR_AT[i], s = shown ? (got ? 1 + Math.max(0, 0.6 - age * 3) : 1) : 0;
    drawStar(x, y, 34, false);
    if (shown && got) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); drawStar(0, 0, 34, true); ctx.restore(); }
    text(labels[i], x, y + 50, 13, shown && got ? C.yellow : C.sub, { body: true, stroke: false });
  }
  const cur = levelCfg(G.n), nxt = levelCfg(Math.min(LAST, G.n + 1));
  systemWindow(400, 198, 420, [
    '다음 바다는 물살이 더 느려요.',
    `· 물살 빠르기  ${Math.round(cur.speed)} → ${Math.round(nxt.speed)}`,
    `· 질주 차는 속도  ${cur.boostRate.toFixed(1)} → ${nxt.boostRate.toFixed(1)}`,
  ]);
  drawFish(430, 370, 0.7, true);
  text(BOSS_LINES[G.n] || CLEAR_LINES[(G.n - 1) % CLEAR_LINES.length], 460, 370, 16, '#ffd1ef', { align: 'left', body: true });
  text(`알 +${G.eggShown || 0}${G.diffBonus ? ` (난이도 ${G.diffBonus > 0 ? '+' : ''}${G.diffBonus})` : ''} · 물리친 적 ${G.kills} · 최고 연속 ${G.chainBest} · 딱 맞은 아이템 ${G.weak}`, 610, 404, 14, C.sub, { body: true, stroke: false });
  button(430, 426, 360, 56, '다음 바다로', () => enterMap(G.n), { size: 21 });
  button(430, 490, 174, 40, '상점', () => openShop(G.n + 1), { size: 15, kind: 'soft' });
  button(616, 490, 174, 40, '다시 하기', () => startLevel(G.n), { size: 15, kind: 'soft' });
}
function drawEnding() {
  ctx.fillStyle = 'rgba(40,10,40,.35)'; ctx.fillRect(-OX(), 0, W, H);
  drawConfetti();
  const meet = Math.min(1, endT / 1.6);
  drawTurtle(lerp(120, 380, meet), 300 + Math.sin(T * 3) * 5, 200, 0);
  drawImg(IMG.princess, lerp(840, 590, meet), 300 + Math.sin(T * 3 + 1) * 5, 200, 0, 1, true);
  if (meet >= 1) for (let i = 0; i < 5; i++) {
    const t = (T * 0.6 + i / 5) % 1;
    ctx.globalAlpha = 1 - t; text('♥', 485 + Math.sin(t * 9 + i) * 40, 220 - t * 160, 26 + i * 3, '#ff6fa8', { stroke: '#fff', lw: 3 }); ctx.globalAlpha = 1;
  }
  text('공주 거북이 구출 성공!', 480, 60, 48, C.yellow, { lw: 8 });
  text('세 바다를 건넜어요. 느려도 괜찮았죠? 포기하지 않았으니까요.', 480, 114, 20, '#ffffff', { body: true });
  if (endT > 2) {
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
    drawImg(f.gold ? silhouette('egg', '#ffc93a') : IMG.egg, x, y, 26 - k * 8, k * 6);
  }
}
function drawToasts() {
  toasts.forEach((t, i) => {
    const age = 2.8 - t.t, a = Math.min(1, t.t / 0.3), slide = Math.min(1, age / 0.25);
    const y = 82 + i * 48 - (1 - easeOutBack(slide)) * 40;
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = `600 ${fs(18)}px ${FONT}`; const w = ctx.measureText(t.s).width + 56;
    ctx.fillStyle = 'rgba(27,28,31,.94)'; rr(W / 2 - w / 2, y - 20, w, 40, 20); ctx.fill();
    ctx.fillStyle = t.color; ctx.beginPath(); ctx.arc(W / 2 - w / 2 + 20, y, 5, 0, Math.PI * 2); ctx.fill();
    text(t.s, W / 2 + 8, y, 18, C.text, { body: true, stroke: false });
    ctx.restore();
  });
}
