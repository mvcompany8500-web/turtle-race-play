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
const STARTER = { id: 'starter', name: '첫 바다 스타터 팩', won: 3300, gems: 300, pearls: 2000, trail: 'gold', desc: '보석 300 · 진주 2천 · 황금 별가루 꼬리' };
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
  // 구매 복원(애플 3.1.1·구글 결제): 다시 깔거나 기기를 바꿔도 「한 번만 사는 상품」(스타터 팩·이번 달 패스)을 되돌려 받음
  async restore() {
    if (window.TurtlePay && window.TurtlePay.restore) { try { return await window.TurtlePay.restore(); } catch (e) { return { ok: false }; } } // { ok, ids: ['starter', 'pass:2026-10', ...] }
    return { ok: true, ids: [], test: true };
  },
};
async function restoreBuys() {
  sfx.click();
  const r = await PAY.restore();
  if (!r || !r.ok) { toast('복원하지 못했어요 · 잠시 뒤 다시', C.danger); return; }
  let n = 0;
  for (const id of r.ids || []) {
    if (id === 'starter' && !save.starter) { save.starter = true; if (!save.trails.includes('gold')) save.trails.push('gold'); n++; } // 스타터 팩: 꼬리(한 번만 사는 꾸밈)와 「샀어요」 표시
    if (id === 'pass:' + kstMonth()) { passSeason(); if (!save.pass.prem) { save.pass.prem = true; n++; } }
  }
  persist();
  toast(n ? `구매 ${n}개를 되돌렸어요` : r.test ? '시험 결제라 되돌릴 구매가 없어요' : '되돌릴 구매가 없어요', n ? C.yellow : '#ffffff');
}
function askBuy(prod, onDone) { buying = { prod, onDone, t: 0 }; sfx.click(); }
// 보호자 확인(앱스토어 어린이 규칙 1.3: 결제·바깥 링크 전에 어른만 풀 수 있는 문제). 맞히면 10분 동안 다시 안 물음
let gateUntil = 0, gate = null;
function withGate(then) {
  if (Date.now() < gateUntil) { then(); return; }
  const a = 13 + Math.floor(Math.random() * 7), b = 4 + Math.floor(Math.random() * 6), ans = a * b; // 두 자리 × 한 자리(어린이가 바로 못 푸는 정도)
  const opts = shuffle([ans, ans + b, ans - a]);
  gate = { q: `${a} × ${b} = ?`, ans, opts, then }; sfx.click();
}
function drawGate() {
  if (!gate) return false;
  buttons.length = 0; buttons.push({ x: 0, y: 0, w: W, h: H, on: () => {} });
  ctx.save(); ctx.translate(OX(), 0);
  ctx.fillStyle = 'rgba(8,8,12,.85)'; ctx.fillRect(-OX(), 0, W, H);
  panel(270, 120, 420, 300, { fill: C.gray });
  text('보호자 확인', 480, 158, 24, C.text, { stroke: false });
  text('어른이 풀어 주세요', 480, 192, 14, C.sub, { body: true, stroke: false });
  text(gate.q, 480, 246, 36, C.yellow, { stroke: false });
  gate.opts.forEach((v, i) => button(300 + i * 124, 290, 112, 54, String(v), () => { const g = gate; gate = null; if (v === g.ans) { gateUntil = Date.now() + 10 * 60e3; g.then(); } else { sfx.no(); toast('답이 달라요', C.danger); if (buying) buying = null; } }, { size: 22, kind: 'soft' }));
  button(400, 360, 160, 42, '닫기', () => { gate = null; if (buying) buying = null; sfx.click(); }, { size: 15, kind: 'soft' });
  ctx.restore();
  return true;
}
async function confirmBuy() {
  const b = buying; if (!b || b.busy) return;
  b.busy = true;
  const r = await PAY.buy(b.prod);
  buying = null;
  if (!r || !r.ok) { toast('결제가 취소됐어요', C.danger); sfx.no(); return; }
  save.buys.push({ id: b.prod.id, t: Date.now(), test: !!r.test, receipt: r.receipt || null });
  b.onDone(); persist();
  sfx.buy(); haptic([20, 30, 60]);
}
function grantGems(n, why) { save.gems += n; persist(); toast(`보석 +${n}${why ? ` · ${why}` : ''}`, '#7cd8ff'); }
function buyGemPack(p) { askBuy(p, () => grantGems(p.gems + p.bonus, p.name)); }
function buyStarter() {
  if (save.starter) return;
  askBuy(STARTER, () => { save.starter = true; save.gems += STARTER.gems; save.eggs += STARTER.pearls; if (!save.trails.includes('gold')) save.trails.push('gold'); save.trail = 'gold'; toast('스타터 팩! 보석 300 · 진주 2,000 · 황금 별가루', C.yellow); });
}
function buyPass() { passSeason(); if (save.pass.prem) return; askBuy(PASS_PROD, () => { save.pass.prem = true; toast('바다 패스 프리미엄이 열렸어요!', C.yellow); }); }
// 보석 쓰기 확인(옷·꼬리·보물·진주 바꾸기): 한 번 눌러 바로 빠지지 않게 — 두 단추 같은 크기
let spending = null;
function askSpend(gems, name, then) { if (save.gems < gems) { spendGems(gems); return; } spending = { gems, name, then }; sfx.click(); }
function drawSpend() {
  const sp = spending;
  buttons.length = 0; buttons.push({ x: 0, y: 0, w: W, h: H, on: () => {} });
  ctx.save(); ctx.translate(OX(), 0);
  ctx.fillStyle = 'rgba(8,8,12,.72)'; ctx.fillRect(-OX(), 0, W, H);
  panel(280, 130, 400, 270, { fill: C.gray });
  if (!ribbon(480, 134, 280, '보석 쓰기', 22)) text('보석 쓰기', 480, 166, 24, C.text, { stroke: false });
  text(sp.name, 480, 196, 22, C.yellow, { stroke: false });
  icon('e_gem', 438, 242, 30); text(`${sp.gems}개를 써요`, 458, 243, 22, '#ffffff', { align: 'left', stroke: false });
  text(`남는 보석 ${(save.gems - sp.gems).toLocaleString()}개`, 480, 282, 14, C.sub, { body: true, stroke: false });
  button(312, 316, 162, 54, '쓰기', () => { spending = null; sp.then(); }, { size: 19, kind: 'ok' });
  button(486, 316, 162, 54, '취소', () => { spending = null; sfx.click(); }, { size: 17, kind: 'soft' });
  ctx.restore();
}
function spendGems(n) { if (save.gems < n) { sfx.no(); toast(`보석이 ${n - save.gems}개 부족해요`, C.danger); return false; } save.gems -= n; persist(); return true; }
function buyTrail(t) {
  if (save.trails.includes(t.k)) { save.trail = t.k; persist(); sfx.click(); return; }
  if (!t.gems) { sfx.no(); toast(t.how || '아직 못 얻어요'); return; }
  askSpend(t.gems, `${t.name} 꼬리`, () => { if (!spendGems(t.gems)) return; save.trails.push(t.k); save.trail = t.k; persist(); sfx.buy(); toast(`${t.name} 꼬리 효과!`, C.yellow); });
}
function exchange(x) { askSpend(x.gems, `진주 ${x.pearls.toLocaleString()}개로 바꾸기`, () => { if (!spendGems(x.gems)) return; save.eggs += x.pearls; persist(); sfx.gold(); toast(`진주 +${x.pearls.toLocaleString()}`, C.yellow); }); }

// 결제 확인 창 (모든 화면 위)
function drawBuyConfirm() {
  if (drawGate()) return;
  if (spending) { drawSpend(); return; }
  if (!buying) return;
  const p = buying.prod, test = !PAY.real();
  buttons.length = 0;
  buttons.push({ x: 0, y: 0, w: W, h: H, on: () => {} });
  ctx.save(); ctx.translate(OX(), 0);
  ctx.fillStyle = 'rgba(8,8,12,.78)'; ctx.fillRect(-OX(), 0, W, H);
  panel(210, 50, 540, 440, { fill: C.gray }); // 넓고 높게: 법 안내 문구가 잘리지 않게(판 안쪽 폭 470에서 줄바꿈)
  if (!ribbon(480, 54, 320, '결제 확인', 22)) text('결제 확인', 480, 88, 26, C.text, { stroke: false });
  text(p.name, 480, 110, 22, C.yellow, { stroke: false });
  if (p.desc) text(p.desc, 480, 140, 15, C.sub, { body: true, stroke: false });
  else if (p.gems) text(`보석 ${(p.gems + (p.bonus || 0)).toLocaleString()}개${p.bonus ? ` (보너스 ${p.bonus})` : ''}`, 480, 140, 16, C.sub, { body: true, stroke: false });
  text(won(p.won), 480, 180, 34, '#ffffff', { stroke: false });
  text(p.id === 'pass' ? '부가세 포함 · 한 번 결제(자동 갱신 없음) · 이번 달만' : '부가세 포함', 480, 210, 13, C.sub, { body: true, stroke: false });
  let ny = 242;
  if (test) { ctx.fillStyle = 'rgba(255,213,74,.14)'; rr(250, ny - 15, 460, 30, 10); ctx.fill(); text('시험 결제예요 · 실제로 돈이 나가지 않아요', 480, ny, 14, C.yellow, { body: true, stroke: false }); ny += 34; }
  const lh = fs(13) * 1.4;
  wrapText('14세 미만은 보호자 동의가 필요해요 · 안 쓴 상품은 7일 안에 청약철회할 수 있어요', 470, 13).forEach((l) => { text(l, 480, ny, 13, C.sub, { body: true, stroke: false }); ny += lh; });
  wrapText('쓴 보석·받은 보상은 철회가 제한돼요 · 이용약관 2조', 470, 13).forEach((l) => { text(l, 480, ny, 13, C.mute, { body: true, stroke: false }); ny += lh; });
  const by = Math.max(ny + 14, 400); // 안내 끝에서 14 띄우고, 두 단추는 같은 크기(아이 보호: 한쪽만 크게 하지 않음)
  button(250, by, 224, 52, buying.busy ? '처리 중…' : '결제하기', () => withGate(confirmBuy), { size: 19, disabled: !!buying.busy });
  button(486, by, 224, 52, '취소', () => { buying = null; sfx.click(); }, { size: 17, kind: 'soft' });
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
  overlayBase(60, 44, 840, 476, '바다 패스', 'e_medal'); ctx.save(); ctx.translate(0, 14); // 리본이 화면 위에 잘리지 않게 창을 14 내림(내용도 같이)
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
  ctx.restore();
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
  // 엔딩 뒤 목표(2회차): 어려움 왕관 모으기 · 끝없는 바다 기록
  { k: 'crown25', name: '어려움 왕관 25개', test: () => Object.keys(save.crown || {}).length >= 25, gems: 80 },
  { k: 'crown50', name: '어려움 왕관 50개 — 바다의 왕', test: () => Object.keys(save.crown || {}).length >= 50, gems: 200 },
  { k: 'end3k', name: '끝없는 바다 3,000미터', test: () => (save.endlessBest || 0) >= 3000, gems: 60 },
  { k: 'end5k', name: '끝없는 바다 5,000미터', test: () => (save.endlessBest || 0) >= 5000, gems: 100 },
];
const achReady = () => ACH.filter((a) => !save.ach[a.k] && a.test()).length;
function claimAch(a) { if (save.ach[a.k] || !a.test()) return; save.ach[a.k] = Date.now(); save.gems += a.gems; persist(); sfx.mission(); toast(`업적 「${a.name}」 보석 +${a.gems}`, '#7cd8ff'); }
let achPage = 0;
function drawAch() {
  overlayBase(160, 46, 640, 474, '업적', 'e_trophy'); // 리본 아래 여백 확보
  const per = 8, list = ACH.slice(achPage * per, achPage * per + per);
  list.forEach((a, i) => withRise(i, () => {
    const y = 100 + i * 44, done = !!save.ach[a.k], ok = a.test();
    ctx.fillStyle = done ? 'rgba(52,201,135,.12)' : C.soft; rr(190, y, 580, 40, 12); ctx.fill();
    text(a.name, 214, y + 20, 16, done ? C.ok : C.text, { align: 'left', stroke: false });
    icon('e_gem', 620, y + 20, 22); text(String(a.gems), 636, y + 21, 15, '#9fe3ff', { align: 'left', stroke: false });
    if (done) text('받음 ✓', 725, y + 21, 14, C.ok, { stroke: false });
    else button(686, y + 4, 78, 32, ok ? '받기' : '아직', () => claimAch(a), { size: 13, kind: ok ? 'ok' : 'soft', disabled: !ok }); // 받기 = 초록(도전 창과 같게)
  }));
  text(`${achPage + 1} / ${Math.ceil(ACH.length / per)}`, 480, 486, 14, C.sub, { body: true, stroke: false });
  button(190, 470, 60, 32, '◀', () => { achPage = Math.max(0, achPage - 1); }, { size: 15, kind: 'soft' });
  button(710, 470, 60, 32, '▶', () => { achPage = Math.min(Math.ceil(ACH.length / per) - 1, achPage + 1); }, { size: 15, kind: 'soft' });
}
// 판이 끝나면 누적 기록·패스 경험치
function storeAfterRun() {
  const st = save.streak;
  if (st.lost && st.last === today()) { st.lostRuns = (st.lostRuns || 0) + 1; if (st.lostRuns >= 3) { st.day = st.lost + 1; st.lost = 0; toast(`연속 ${st.day}일 되찾았어요!`, C.yellow); } }
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
  BOOSTERS.forEach((b, i) => { // 시작 아이템(누르면 켜짐 · 출발할 때 진주 차감) — 유리 칸, 고르면 노란 테두리 + 오른쪽 위 ✓
    const w = 160, bx = x + i * 168, on = !!boostPick[b.k];
    ctx.fillStyle = on ? 'rgba(255,213,74,.16)' : 'rgba(255,255,255,.08)'; rr(bx, y - 22, w, 44, 14); ctx.fill();
    ctx.strokeStyle = on ? C.yellow : 'rgba(255,255,255,.16)'; ctx.lineWidth = on ? 2.5 : 1.5; rr(bx, y - 22, w, 44, 14); ctx.stroke();
    drawItemIcon(b.icon, bx + 24, y, 28);
    text(b.name, bx + 46, y - 8, 14, C.text, { align: 'left', stroke: false });
    drawPearl(bx + 52, y + 11, 12); text(String(b.cost), bx + 62, y + 11, 13, on ? C.yellow : C.sub, { align: 'left', body: true, stroke: false });
    if (on) { ctx.fillStyle = C.ok; ctx.beginPath(); ctx.arc(bx + w - 6, y - 20, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); text('✓', bx + w - 6, y - 19, 12, '#fff', { stroke: false }); }
    buttons.push({ x: bx + OX(), y: y - 22, w, h: 44, on: () => toggleBooster(b) });
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

// ───────── 초보 안내(인기 게임 튜토리얼처럼): 화면을 어둡게 하고 한 곳만 동그랗게 비춰 손가락으로 가리킴 ─────────
// coachOnce(id, { text, sub, spot: {x,y,r}(화면 좌표), wait: 'jump'|'slide'|'boost'|'item'|'tap', pass }) — 처음 한 번만
// 판 중에는 세계가 멈춰 기다리고, 말한 동작을 하면 풀림. 메뉴 안내(pass)는 누르면 닫히고 누른 단추도 그대로 눌림
let coach = null;
const spotAt = (x, y) => { const m = ctx.getTransform(); return { x: (m.a * x + m.c * y + m.e) / K, y: (m.b * x + m.d * y + m.f) / K }; }; // 지금 그리는 좌표 → 화면 좌표
const marks = {}; // 그릴 때 기록해 둔 단추 자리(화면 좌표)
function markSpot(id, x, y, r) { const s = spotAt(x, y); marks[id] = { x: s.x, y: s.y, r }; }
function coachOnce(id, o) {
  save.coach = save.coach || {};
  if (save.coach[id] || coach || (typeof LAB !== 'undefined' && LAB.noCoach)) return false;
  coach = { id, t: 0, wait: 'tap', ...o };
  snd('ready', 0.7); haptic(15);
  return true;
}
// 돌려주는 값: true = 이 입력은 안내가 먹음(동작 안 함), false = 동작도 그대로
function coachDone(kind) {
  if (!coach) return false;
  if (coach.t < 0.35) return true; // 너무 빨리 눌러 못 읽고 넘어가지 않게
  if (coach.wait === kind) { finishCoach(); return false; } // 말한 동작을 함 → 풀리며 그 동작 실행
  if (coach.wait === 'tap') { const pass = coach.pass; finishCoach(); return !pass; } // 읽고 누름 → 닫힘(메뉴 안내는 누른 단추도 눌림)
  return true; // 다른 걸 눌렀으면 계속 기다림
}
function finishCoach() {
  save.coach = save.coach || {}; save.coach[coach.id] = true; persist();
  if (G && G.p && state === 'play') G.p.inv = Math.max(G.p.inv, 0.8); // 멈췄다 풀릴 때 억울하게 맞지 않게
  coach = null; snd('click', 0.6);
}
function drawCoach() {
  if (!coach) return;
  const c = coach, a = Math.min(1, c.t / 0.25), sp = c.spot;
  ctx.save(); ctx.globalAlpha = a;
  // 어둡게 + 구멍
  ctx.fillStyle = 'rgba(8,10,20,.62)'; ctx.beginPath(); ctx.rect(0, 0, W, H);
  const pulse = 1 + Math.sin(T * 5) * 0.05;
  const hole = () => { if (sp.w) { const w = sp.w * pulse, h = sp.h * pulse; const x = sp.x - w / 2, y = sp.y - h / 2, r = h / 2; ctx.moveTo(x + r, y); ctx.arcTo(x, y, x, y + h, r); ctx.arcTo(x, y + h, x + w, y + h, r); ctx.arcTo(x + w, y + h, x + w, y, r); ctx.arcTo(x + w, y, x, y, r); ctx.closePath(); } else { const r = sp.r * pulse; ctx.moveTo(sp.x + r, sp.y); ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2, true); } };
  if (sp) hole(); // 동그라미 또는 둥근 네모(막대용)
  ctx.fill('evenodd');
  if (sp) { ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 4; ctx.beginPath(); hole(); ctx.stroke(); }
  // 손가락(구멍 아래에서 위를 가리킴, 구멍이 아래쪽이면 위에서 아래로)
  if (sp) {
    const rr0 = sp.w ? sp.h / 2 : sp.r, below = sp.y < H * 0.55, bob = Math.sin(T * 7) * 8, hx = sp.x + (sp.w ? sp.w * 0.2 : sp.r * 0.35), hy = below ? sp.y + rr0 + 34 + bob : sp.y - rr0 - 34 - bob;
    ctx.save(); ctx.translate(hx, hy); if (!below) ctx.rotate(Math.PI);
    if (!drawImg(IMG.spr_hand_point, 0, 0, 64)) text('👆', 0, 0, 44, '#fff', { stroke: false });
    ctx.restore();
  }
  // 말풍선(구멍과 반대쪽)
  const top = sp ? sp.y > H * 0.5 : false, bw = Math.min(560, W - 60), bx = W / 2 - bw / 2, by = top ? 70 : H - 200;
  panel(bx, by, bw, 116, { r: 22 }); // 안내 말풍선도 코덱스 판
  drawImg(IMG.hello, bx + 54, by + 60, 92);
  text(c.text, bx + 108, by + 38, 22, C.yellow, { align: 'left', stroke: false });
  if (c.sub) wrapText(c.sub, bw - 130, 16).slice(0, 2).forEach((l, i) => text(l, bx + 108, by + 70 + i * 24, 16, '#ffffff', { align: 'left', body: true, stroke: false }));
  const hint = { jump: isTouch ? '왼쪽을 톡!' : '스페이스 / ↑', slide: isTouch ? '오른쪽을 꾹!' : '↓', boost: '번개 단추를 눌러요', item: '아이템 단추를 눌러요', tap: '눌러서 계속' }[c.wait];
  if (c.t > 0.6 && Math.sin(T * 6) > -0.3) text(hint, bx + bw - 18, by + 100, 13, C.sub, { align: 'right', body: true, stroke: false });
  ctx.restore();
}
function updateCoach(dt) {
  if (!coach) return false;
  coach.t += dt;
  if (coach.state && coach.state !== state) { coach = null; return false; } // 화면이 바뀌면 그 안내는 접음(다음에 다시)
  return state === 'play'; // 판 중이면 세계를 멈춤
}

// 판 중 처음 나오는 것들 안내(첫 판 튜토리얼 밖에서도)
function coachRunTriggers() {
  if (!G || !G.run || state !== 'play' || coach || G.p.dead || G.won || G.enterT > 0 || cine) return;
  if (G.tut) return; // 첫 판(기본 연습) 동안은 다른 안내 없음 — 첫 판 기본 연습(점프·숙이기·이단 점프·밟기·물약)이 끝난 뒤에
  const p = G.p, low = G.en / G.maxEn;
  const bb = BOOST_BTN(), ib = ITEM_BTN();
  if (G.boost >= 100 && !G.bonus && G.boosting <= 0) coachOnce('boost', { text: '질주가 꽉 찼어요!', sub: '번개 단추를 누르면 앞을 다 들이받아요', spot: { x: bb.x, y: bb.y, r: bb.r + 14 }, wait: 'boost', state: 'play' });
  else if (G.item && isTouch) coachOnce('item', { text: `아이템 「${ITEMS[G.item].name}」!`, sub: ITEMS[G.item].desc, spot: { x: ib.x, y: ib.y, r: ib.r + 14 }, wait: 'item', state: 'play' });
  else if (low < 0.25 && G.en > 0) coachOnce('lowEn', { text: '기운이 얼마 안 남았어요', sub: '분홍 물약을 먹으면 차요 · 질주 중엔 안 줄어요', spot: { x: SAFE + 22 + 30 + 110, y: 59, w: 270, h: 46 }, state: 'play' });
  else if (G.n >= 2 && G.t > 4 && p.onG && !G.enemies.some((e) => !e.dead && e.x - p.x < 420 && e.x > p.x - 40)) coachOnce('beat', { text: '고리가 금색일 때 뛰면', sub: '「박자 딱!」 — 질주가 빨리 차고 진주도 받아요', spot: { x: p.x, y: p.y, r: 90 }, state: 'play' });
}
