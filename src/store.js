'use strict';
// 터틀 레이스 — 보석(유료 화폐)·결제·꼬리 효과·바다 패스·업적·시작 아이템·저장 코드
// 원칙: 거북알은 팔지 않음(디자인 키트: 현금 아님·환전 없음) → 돈으로 사는 건 「보석」만.
//       확률 있는 상품(펫 부화)은 확률 공개. 결제 전 확인 창·청약철회 안내. 꾸밈·편의 위주(돈으로 실력 키우기 직접 판매 없음)
//       실제 결제: window.TurtlePay.buy(id) 가 있으면 그걸로(앱·스토어 연결 — 맥미니/출시 때), 없으면 「시험 결제」(돈 안 나감)

// ───────── 상품 ─────────
const GEM_PACKS = [
  { id: 'gem_s', name: '보석 한 줌', gems: 80, bonus: 0, won: 1200 },
  { id: 'gem_m', name: '보석 주머니', gems: 500, bonus: 50, won: 5900, tag: '인기' },
  { id: 'gem_l', name: '보석 상자', gems: 1200, bonus: 200, won: 12000, tag: '+17%' },
];
const STARTER = { id: 'starter', name: '첫 바다 스타터 팩', won: 3300, gems: 300, pearls: 2000, trail: 'gold', desc: '보석 300 · 진주 2천 · 황금 꼬리' };
const PASS_PROD = { id: 'pass', name: '바다 패스 프리미엄', won: 6600, desc: '이번 달 패스의 프리미엄 줄 보상을 모두 받아요' };
const TRAILS = [
  { k: 'none', name: '없음', gems: 0 },
  { k: 'bubble', name: '반짝 물방울', gems: 0, how: '패스 10단계' },
  { k: 'heart', name: '하트 물결', gems: 120 },
  { k: 'sakura', name: '벚꽃 바람', gems: 180, how: '패스 15 (프리미엄)' },
  { k: 'rainbow', name: '무지개 꼬리', gems: 240 },
  { k: 'fire', name: '불꽃 질주', gems: 300, how: '패스 25 (프리미엄)' },
  { k: 'gold', name: '황금 별가루', gems: 0, how: '스타터 팩 · 패스 30' },
];
const EXCHANGE = [{ gems: 20, pearls: 500 }, { gems: 90, pearls: 2500 }];
const REVIVE_GEMS = 15;
const won = (n) => `₩${n.toLocaleString()}`;

function storeInit() {
  const d = { gems: 0, trails: ['none'], trail: 'none', starter: false, pass: null, ach: {}, stat: {}, boosters: {}, buys: [], chapters: {} };
  for (const k in d) if (save[k] === undefined) save[k] = d[k];
  passSeason();
}
const kstMonth = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7);
function passSeason() { if (!save.pass || save.pass.season !== kstMonth()) save.pass = { season: kstMonth(), xp: 0, prem: false, cf: [], cp: [] }; }

// ───────── 결제 ─────────
let buying = null; // 확인 창: { prod, onDone }
const PAY = {
  real: () => !!(window.TurtlePay && window.TurtlePay.buy),
  async buy(prod) {
    if (PAY.real()) { try { return await window.TurtlePay.buy(prod.id); } catch (e) { return { ok: false }; } } // { ok, receipt } — 영수증 검증은 서버(앱)에서
    return { ok: true, test: true };
  },
};
function askBuy(prod, onDone) { buying = { prod, onDone, t: 0 }; sfx.click(); }
async function confirmBuy() {
  const b = buying; if (!b || b.busy) return;
  b.busy = true;
  const r = await PAY.buy(b.prod);
  buying = null;
  if (!r || !r.ok) { toast('결제가 취소됐어요', C.danger); sfx.no(); return; }
  save.buys.push({ id: b.prod.id, t: Date.now(), test: !!r.test, receipt: r.receipt || null });
  b.onDone(); persist();
  sfx.buy(); confetti(60); haptic([20, 30, 60]);
}
function grantGems(n, why) { save.gems += n; persist(); toast(`보석 +${n}${why ? ` · ${why}` : ''}`, '#7cd8ff'); }
function buyGemPack(p) { askBuy(p, () => grantGems(p.gems + p.bonus, p.name)); }
function buyStarter() {
  if (save.starter) return;
  askBuy(STARTER, () => { save.starter = true; save.gems += STARTER.gems; save.eggs += STARTER.pearls; if (!save.trails.includes('gold')) save.trails.push('gold'); save.trail = 'gold'; toast('스타터 팩! 보석 300 · 진주 2,000 · 황금 별가루', C.yellow); });
}
function buyPass() { passSeason(); if (save.pass.prem) return; askBuy(PASS_PROD, () => { save.pass.prem = true; toast('바다 패스 프리미엄이 열렸어요!', C.yellow); }); }
function spendGems(n) { if (save.gems < n) { sfx.no(); toast(`보석이 ${n - save.gems}개 부족해요`, C.danger); return false; } save.gems -= n; persist(); return true; }
function buyTrail(t) {
  if (save.trails.includes(t.k)) { save.trail = t.k; persist(); sfx.click(); return; }
  if (!t.gems) { sfx.no(); toast(t.how || '아직 못 얻어요'); return; }
  if (!spendGems(t.gems)) return;
  save.trails.push(t.k); save.trail = t.k; persist(); sfx.buy(); toast(`${t.name} 꼬리 효과!`, C.yellow);
}
function exchange(x) { if (!spendGems(x.gems)) return; save.eggs += x.pearls; persist(); sfx.gold(); toast(`진주 +${x.pearls.toLocaleString()}`, C.yellow); }

// 결제 확인 창 (모든 화면 위)
function drawBuyConfirm() {
  if (!buying) return;
  const p = buying.prod, test = !PAY.real();
  buttons.length = 0;
  buttons.push({ x: 0, y: 0, w: W, h: H, on: () => {} });
  ctx.save(); ctx.translate(OX(), 0);
  ctx.fillStyle = 'rgba(8,8,12,.78)'; ctx.fillRect(-OX(), 0, W, H);
  panel(250, 90, 460, 360, { fill: C.gray });
  text('결제 확인', 480, 128, 26, C.text, { stroke: false });
  text(p.name, 480, 178, 22, C.yellow, { stroke: false });
  if (p.desc) text(p.desc, 480, 210, 15, C.sub, { body: true, stroke: false });
  else if (p.gems) text(`보석 ${(p.gems + (p.bonus || 0)).toLocaleString()}개${p.bonus ? ` (보너스 ${p.bonus})` : ''}`, 480, 210, 16, C.sub, { body: true, stroke: false });
  text(won(p.won), 480, 252, 34, '#ffffff', { stroke: false });
  if (test) { ctx.fillStyle = 'rgba(255,213,74,.14)'; rr(286, 280, 388, 34, 10); ctx.fill(); text('시험 결제예요 · 실제로 돈이 나가지 않아요', 480, 297, 14, C.yellow, { body: true, stroke: false }); }
  text('14세 미만은 보호자 동의 · 7일 안 청약철회', 480, 330, 13, C.sub, { body: true, stroke: false });
  button(290, 360, 200, 56, buying.busy ? '처리 중…' : '결제하기', confirmBuy, { size: 19, disabled: !!buying.busy });
  button(500, 360, 170, 56, '취소', () => { buying = null; sfx.click(); }, { size: 17, kind: 'soft' });
  ctx.restore();
}
// 보석 배지
function gemBadge(x, y, n, size = 26) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(16,16,18,.62)'; rr(-size * 0.7, -size * 0.6, size * 3.4, size * 1.2, size * 0.6); ctx.fill();
  icon('e_gem', 0, 0, size);
  text(String(n), size * 0.75, 1, size * 0.62, '#9fe3ff', { align: 'left', stroke: false });
  ctx.restore();
}

// ───────── 꼬리 효과(달리는 동안 보이는 유료 꾸밈) ─────────
const TRAIL_COL = { bubble: ['#dff6ff', '#9fe3ff'], heart: ['#ff7aa8', '#ffc1d6'], sakura: ['#ffd1e0', '#ffffff'], rainbow: null, fire: ['#ff8a3c', '#ffd54a', '#ff4d6a'], gold: ['#ffe36b', '#fff4c0'] };
function trailTick(dt) {
  const k = save.trail; if (!k || k === 'none' || !G || REDUCE) return;
  const p = G.p; if (p.dead || G.won) return;
  if (Math.random() > dt * (k === 'fire' ? 50 : 30)) return;
  const x = p.x - 26, y = p.y + rand(-12, 12);
  if (k === 'bubble') fx.push({ k: 'bub', x, y, vx: rand(-200, -90), vy: rand(-60, 10), life: 0.7, max: 0.7, size: rand(2, 5) });
  else if (k === 'fire') fx.push({ k: 'flame', x, y, vx: rand(-260, -140), vy: rand(-40, 20), life: 0.4, max: 0.4, size: rand(5, 10), color: pick(TRAIL_COL.fire) });
  else fx.push({ k: 'spark', x, y, vx: rand(-260, -120), vy: rand(-60, 40), life: 0.6, max: 0.6, size: rand(2.5, 5), color: k === 'rainbow' ? `hsl(${(T * 300) % 360},95%,65%)` : pick(TRAIL_COL[k]) });
}

// ───────── 바다 패스 (한 달 30단계 · 무료/프리미엄) ─────────
const PASS_TIERS = 30, PASS_XP = 250;
function passReward(tier, prem) {
  if (!prem) {
    if (tier === 10) return { trail: 'bubble' };
    if (tier === 30) return { gems: 30 };
    return tier % 5 === 0 ? { gems: 10 } : { pearls: 100 + tier * 10 };
  }
  if (tier === 15) return { trail: 'sakura' };
  if (tier === 25) return { trail: 'fire' };
  if (tier === 30) return { trail: 'gold', gems: 50 };
  return tier % 3 === 0 ? { gems: 20 } : { pearls: 300 + tier * 20 };
}
const rewardText = (r) => (r.trail ? `${TRAILS.find((t) => t.k === r.trail).name}${r.gems ? ` + 보석 ${r.gems}` : ''}` : r.gems ? `보석 ${r.gems}` : `진주 ${r.pearls}`);
const passTier = () => Math.min(PASS_TIERS, Math.floor(save.pass.xp / PASS_XP));
function passGain(xp) { passSeason(); const before = passTier(); save.pass.xp += xp; const after = passTier(); if (after > before) toast(`바다 패스 ${after}단계!`, '#7cd8ff'); }
function claimPass(tier, prem) {
  const list = prem ? save.pass.cp : save.pass.cf;
  if (list.includes(tier) || tier > passTier() || (prem && !save.pass.prem)) return;
  const r = passReward(tier, prem);
  list.push(tier);
  if (r.gems) save.gems += r.gems;
  if (r.pearls) save.eggs += r.pearls;
  if (r.trail && !save.trails.includes(r.trail)) save.trails.push(r.trail);
  persist(); sfx.gift(); toast(`받았어요: ${rewardText(r)}`, C.yellow);
}
let passPage = 0;
function drawPass() {
  overlayBase(60, 30, 840, 480, '바다 패스', 'e_medal');
  passSeason();
  const tier = passTier(), into = save.pass.xp % PASS_XP;
  text(`${save.pass.season} 시즌 · ${tier}/${PASS_TIERS}단계`, 110, 88, 16, C.text, { align: 'left', body: true, stroke: false });
  ctx.fillStyle = C.line; rr(330, 82, 300, 12, 6); ctx.fill();
  ctx.fillStyle = C.blueD; rr(330, 82, tier >= PASS_TIERS ? 300 : Math.max(12, (300 * into) / PASS_XP), 12, 6); ctx.fill();
  if (!save.pass.prem) button(700, 66, 180, 40, `프리미엄 ${won(PASS_PROD.won)}`, buyPass, { size: 15, kind: 'yellow' });
  else text('프리미엄 ✓', 790, 86, 16, C.yellow, { stroke: false });
  text('무료', 104, 196, 15, C.sub, { stroke: false }); text('프리미엄', 104, 330, 15, C.yellow, { stroke: false });
  const per = 6, start = passPage * per + 1;
  for (let i = 0; i < per; i++) {
    const t = start + i; if (t > PASS_TIERS) break;
    const x = 150 + i * 120;
    text(`${t}`, x + 52, 124, 16, t <= tier ? C.yellow : C.mute, { stroke: false });
    for (const prem of [false, true]) {
      const y = prem ? 270 : 140, r = passReward(t, prem), got = (prem ? save.pass.cp : save.pass.cf).includes(t), can = t <= tier && (!prem || save.pass.prem);
      panel(x, y, 104, 118, { fill: got ? C.sel : C.gray });
      if (r.trail) icon('e_sparkles', x + 52, y + 36, 40); else if (r.gems) icon('e_gem', x + 52, y + 36, 40); else drawPearl(x + 52, y + 36, 34);
      wrapText(rewardText(r), 96, 13).slice(0, 2).forEach((l, k) => text(l, x + 52, y + 70 + k * 16, 13, C.text, { body: true, stroke: false }));
      if (got) text('받음 ✓', x + 52, y + 104, 13, C.ok, { stroke: false });
      else if (can) button(x + 10, y + 90, 84, 24, '받기', () => claimPass(t, prem), { size: 13 });
      else if (prem && !save.pass.prem) icon('e_lock', x + 52, y + 102, 18);
    }
  }
  button(70, 410, 60, 44, '◀', () => { passPage = Math.max(0, passPage - 1); sfx.click(); }, { size: 18, kind: 'soft' });
  button(830, 410, 60, 44, '▶', () => { passPage = Math.min(Math.ceil(PASS_TIERS / per) - 1, passPage + 1); sfx.click(); }, { size: 18, kind: 'soft' });
  text('프리미엄은 이번 달만 · 무료 줄은 누구나 · 보상은 꾸밈·보석·진주(실력 직접 판매 없음)', 480, 432, 13, C.sub, { body: true, stroke: false });
}

// ───────── 업적 (보석 보상 → 돈 안 써도 보석을 모을 수 있게) ─────────
const ACH = [
  { k: 'w1', name: '산호 바다 정복', test: () => save.unlocked > 10 || save.cleared, gems: 20 },
  { k: 'w2', name: '깊은 바다 정복', test: () => save.unlocked > 20 || save.cleared, gems: 30 },
  { k: 'w3', name: '얼음 불꽃 바다 정복', test: () => save.unlocked > 30 || save.cleared, gems: 40 },
  { k: 'w4', name: '노을 보물섬 정복', test: () => save.unlocked > 40 || save.cleared, gems: 50 },
  { k: 'w5', name: '공주님 구출!', test: () => save.cleared, gems: 100 },
  { k: 's30', name: '별 30개', test: () => totalStars() >= 30, gems: 20 },
  { k: 's90', name: '별 90개', test: () => totalStars() >= 90, gems: 40 },
  { k: 's150', name: '별 150개(전부)', test: () => totalStars() >= 150, gems: 100 },
  { k: 'k300', name: '몬스터 300마리', test: () => (save.stat.kills || 0) >= 300, gems: 20 },
  { k: 'st200', name: '밟기 200번', test: () => (save.stat.stomps || 0) >= 200, gems: 20 },
  { k: 'b500', name: '박자 딱 500번', test: () => (save.stat.beats || 0) >= 500, gems: 30 },
  { k: 'lv10', name: '거북 레벨 10', test: () => save.lv >= 10, gems: 30 },
  { k: 'lv20', name: '거북 레벨 20', test: () => save.lv >= 20, gems: 60 },
  { k: 'pets', name: '펫 9마리 모두', test: () => save.pets.length >= PETS.length, gems: 50 },
  { k: 'end1k', name: '끝없는 바다 1,000미터', test: () => (save.endlessBest || 0) >= 1000, gems: 40 },
  { k: 'crown10', name: '어려움 왕관 10개', test: () => Object.keys(save.crown || {}).length >= 10, gems: 50 },
];
const achReady = () => ACH.filter((a) => !save.ach[a.k] && a.test()).length;
function claimAch(a) { if (save.ach[a.k] || !a.test()) return; save.ach[a.k] = Date.now(); save.gems += a.gems; persist(); sfx.mission(); toast(`업적 「${a.name}」 보석 +${a.gems}`, '#7cd8ff'); }
let achPage = 0;
function drawAch() {
  overlayBase(160, 30, 640, 480, '업적', 'e_trophy');
  const per = 8, list = ACH.slice(achPage * per, achPage * per + per);
  list.forEach((a, i) => withRise(i, () => {
    const y = 92 + i * 46, done = !!save.ach[a.k], ok = a.test();
    ctx.fillStyle = done ? 'rgba(52,201,135,.12)' : C.soft; rr(190, y, 580, 42, 12); ctx.fill();
    text(a.name, 214, y + 21, 16, done ? C.ok : C.text, { align: 'left', stroke: false });
    icon('e_gem', 620, y + 21, 22); text(String(a.gems), 636, y + 22, 15, '#9fe3ff', { align: 'left', stroke: false });
    if (done) text('받음 ✓', 730, y + 22, 14, C.ok, { stroke: false });
    else button(686, y + 5, 78, 32, ok ? '받기' : '아직', () => claimAch(a), { size: 13, kind: ok ? 'primary' : 'soft', disabled: !ok });
  }));
  button(190, 470, 60, 32, '◀', () => { achPage = Math.max(0, achPage - 1); }, { size: 15, kind: 'soft' });
  button(710, 470, 60, 32, '▶', () => { achPage = Math.min(Math.ceil(ACH.length / per) - 1, achPage + 1); }, { size: 15, kind: 'soft' });
}
// 판이 끝나면 누적 기록·패스 경험치
function storeAfterRun() {
  const s = save.stat;
  s.kills = (s.kills || 0) + (G.kills || 0); s.stomps = (s.stomps || 0) + (G.stomps || 0); s.beats = (s.beats || 0) + (G.beats || 0); s.runs = (s.runs || 0) + 1;
  passGain(G.xpGain || 0);
  if (achReady()) toast(`받을 업적이 ${achReady()}개 있어요`, '#7cd8ff');
}

// ───────── 판 전 시작 아이템 (진주로 삼 — 진주 쓸 곳) ─────────
const BOOSTERS = [
  { k: 'shield', name: '출발 방패', desc: '방패 하나 들고', cost: 150, icon: 'x_it_bubble' },
  { k: 'ult', name: '필살 1단', desc: '필살 100으로', cost: 200, icon: 'x_sk_ult' },
  { k: 'magnet', name: '30초 자석', desc: '처음 30초 자석', cost: 120, icon: 'x_it_magnet' },
];
let boostPick = {};
function toggleBooster(b) { if (boostPick[b.k]) { delete boostPick[b.k]; sfx.click(); return; } if (save.eggs < b.cost + Object.keys(boostPick).reduce((s, k) => s + BOOSTERS.find((x) => x.k === k).cost, 0)) { sfx.no(); toast('진주가 부족해요'); return; } boostPick[b.k] = true; sfx.click(); }
function applyBoosters() {
  const keys = Object.keys(boostPick); if (!keys.length || !G) return;
  let cost = 0;
  for (const k of keys) { const b = BOOSTERS.find((x) => x.k === k); cost += b.cost; if (k === 'shield') G.shield++; if (k === 'ult') G.boost = Math.max(G.boost, 100); if (k === 'magnet') G.eff.magnet = 30; }
  save.eggs = Math.max(0, save.eggs - cost); persist(); boostPick = {};
}
function drawBoosterRow(x, y) {
  BOOSTERS.forEach((b, i) => { // 시작 아이템(누르면 켜짐 · 출발할 때 진주 차감)
    const bx = x + i * 168, on = !!boostPick[b.k], w = 160;
    ctx.fillStyle = on ? 'rgba(76,130,255,.35)' : C.soft; rr(bx, y - 20, w, 40, 12); ctx.fill();
    if (on) { ctx.strokeStyle = C.blueD; ctx.lineWidth = 2; rr(bx, y - 20, w, 40, 12); ctx.stroke(); }
    drawItemIcon(b.icon, bx + 22, y, 24);
    text(on ? `✓ ${b.name}` : b.name, bx + 42, y - 7, 13, C.text, { align: 'left', stroke: false });
    text(`진주 ${b.cost}`, bx + 42, y + 10, 12, on ? C.yellow : C.sub, { align: 'left', body: true, stroke: false });
    buttons.push({ x: bx + OX(), y: y - 20, w, h: 40, on: () => toggleBooster(b) });
  });
}

// ───────── 저장 코드 (기기 바꿀 때) ─────────
function exportSave() {
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(save))));
  try { navigator.clipboard.writeText(code); toast('저장 코드를 복사했어요. 새 기기에서 붙여 넣어요', C.ok); } catch (e) { prompt('저장 코드(길게 눌러 복사)', code); }
}
function importSave() {
  const code = prompt('저장 코드를 붙여 넣어요 (지금 기록은 덮어써져요)');
  if (!code) return;
  try { const s = JSON.parse(decodeURIComponent(escape(atob(code.trim())))); if (typeof s.eggs !== 'number') throw 0; localStorage.setItem(SAVE_KEY, JSON.stringify(s)); location.reload(); }
  catch (e) { toast('저장 코드가 맞지 않아요', C.danger); }
}
storeInit();

// ───────── 장 이야기: 새 세계에 처음 들어갈 때 ─────────
const CHAPTERS = {
  2: [['hero', '여기가 깊은 바다… 너무 깜깜해.'], ['fish', '걱정 마! 내가 등불 조개 있는 곳을 알려 줄게. 공주님은 더 아래로 끌려갔어!'], ['hero', '고마워 반짝이! 무서워도… 한 칸씩 가 볼게!']],
  3: [['princess', '터틀… 들리니? 여긴 얼음이랑 불꽃이 같이 있어…'], ['hero', '공주님 목소리다! 기다려요, 얼어붙어도 녹여서 갈게요!'], ['king', '크하하! 여기까지 왔다고? 내 성 문 앞에서 돌아가게 될 거다!']],
  4: [['hero', '상어왕이 공주님을 데리고 노을 바다로…!'], ['fish', '해적선 무덤을 지나야 해. 보물보다 공주님이 먼저지?'], ['hero', '당연하지! 느려도 끝까지 쫓아갈 거야.']],
  5: [['princess', '터틀! 여기야, 심연의 왕궁! 이번엔 진짜 가까워!'], ['king', '마지막 바다다. 여기서 포기하면 편할 텐데?'], ['hero', '포기 안 해. 한 번도 안 했어. 이번에도!']],
};
const STORY_WHO = { hero: '터틀이', princess: '공주 거북', king: '상어왕', fish: '반짝이' };
let story = null;
function chapterFor(n) { if (n === ENDLESS || n % 10 !== 1 || n === 1) return null; const w = (n - 1) / 10 + 1; return save.chapters[w] ? null : w; }
function playStory(w, after) { story = { w, i: 0, shown: 0, t: 0, after }; state = 'story'; setMusic('title'); sfx.harp(); }
function storyTap() {
  if (!story) return;
  const line = CHAPTERS[story.w][story.i][1];
  if (story.shown < line.length) { story.shown = line.length; return; }
  story.i++; story.shown = 0; story.t = 0; snd('tap', 0.6);
  if (story.i >= CHAPTERS[story.w].length) { save.chapters[story.w] = 1; persist(); const a = story.after; story = null; a(); }
}
function drawStory() {
  if (!story) return;
  const [who, line] = CHAPTERS[story.w][story.i];
  story.t += 1 / 60; story.shown = Math.min(line.length, story.shown + 0.45);
  ctx.fillStyle = 'rgba(8,10,24,.45)'; ctx.fillRect(-OX(), 0, W, H);
  text(`제${story.w}장 · ${WORLDS[story.w - 1].name}`, 480, 60, 30, C.yellow, { lw: 7 });
  // 말하는 사람 크게
  const bob = Math.sin(T * 3) * 6;
  if (who === 'hero') drawImg(IMG.hello, 250, 250 + bob, 220);
  else if (who === 'princess') drawImg(IMG.princess, 710, 250 + bob, 220, 0, 1, true);
  else if (who === 'king') drawImg(IMG.spr_boss_king, 710, 240 + bob, 260);
  else drawFish(700, 250 + bob, 2.4, true);
  panel(40, 394, 880, 124, { fill: 'rgba(27,28,31,.94)' });
  text(STORY_WHO[who], 70, 416, 18, who === 'king' ? '#ff9aa8' : who === 'princess' ? '#ffd1ef' : C.yellow, { align: 'left', stroke: false });
  wrapText(line.slice(0, Math.floor(story.shown)), 820, 21).forEach((l, k) => text(l, 70, 452 + k * 30, 21, '#ffffff', { align: 'left', body: true, stroke: false }));
  if (story.shown >= line.length && Math.sin(T * 8) > 0) text('▼', 890, 498, 16, C.yellow, { stroke: false });
  button(960 + OX() - SAFE - 140, 14, 120, 40, '건너뛰기', () => { save.chapters[story.w] = 1; persist(); const a = story.after; story = null; a(); }, { size: 15, kind: 'soft' });
}
