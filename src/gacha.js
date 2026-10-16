// ───────── 신비한 조개(확률 뽑기) · 보스 유물 · 장비(변신·무기·치장·유물) ─────────
// 벤치마크(docs/gacha.md): 인기 게임 스타 드롭(누를 때마다 등급 색이 오름 — 결과는 미리 정해짐), 인기 게임 10회 확정·마일리지(조각) 교환,
// 인기 게임 뽑기 기계(아예 다른 동물로 변신, 중복은 재화로), 인기 게임 천장(정해진 횟수 안에 반드시), 게임산업법·애플 3.1.1·구글 정책(사기 전에 확률 공개)
const RARITY = {
  c: { name: '일반', col: '#b9c4cf', glow: 'rgba(200,215,230,', shards: 2 },
  r: { name: '희귀', col: '#4fb6ff', glow: 'rgba(80,180,255,', shards: 5 },
  e: { name: '영웅', col: '#b56cff', glow: 'rgba(180,110,255,', shards: 15 },
  l: { name: '전설', col: '#ffc83a', glow: 'rgba(255,200,60,', shards: 50 },
  m: { name: '신화', col: '#ff4d6a', glow: 'rgba(255,80,110,', shards: 100 },
};
const R_ORDER = ['c', 'r', 'e', 'l', 'm'];
const GACHA = { odds: { c: 50, r: 32, e: 14, l: 4 }, cost: 60, cost10: 540, pcost: 400, pcost10: 3600, pity: 40, soft: 30, softStep: 6, relicPct: 5, shardCost: { r: 40, e: 120, l: 300 } };
// fx: pearl 진주 +% · shield 방패 · guard 부딪힘 기운 덜 · potion 물약 +% · boostRate 필살 게이지 +% · startBoost 시작 게이지 · bossDmg 보스 공격 +% · jump 점프 +1 · stomp 밟기 충격파 · spread 세 갈래
// look: giant 몸 크기(보기만) · aura 몸 둘레 빛 · col 물방울 색
const GEAR = [
  { k: 'pearl150', kind: 'cur', r: 'c', name: '진주 150', pearls: 150 },
  { k: 'pearl300', kind: 'cur', r: 'c', name: '진주 300', pearls: 300 },
  { k: 'ribbon', kind: 'deco', r: 'c', name: '분홍 리본', desc: '머리에 큰 리본' },
  { k: 'flower', kind: 'deco', r: 'c', name: '산호꽃 화관', desc: '머리에 꽃 화관' },
  { k: 'catears', kind: 'deco', r: 'r', name: '고양이 귀', desc: '쫑긋 고양이 귀 머리띠' },
  { k: 'star', kind: 'deco', r: 'r', name: '별 더듬이', desc: '반짝 별 머리핀' },
  { k: 'watergun', kind: 'wpn', r: 'r', name: '물총', desc: '보스 공격 +15%', fx: { bossDmg: 0.15 }, col: '#7fe3ff' },
  { k: 'boomerang', kind: 'wpn', r: 'r', name: '조개 부메랑', desc: '보스 공격 +20%', fx: { bossDmg: 0.2 }, col: '#ffb3d6' },
  { k: 'otter', kind: 'form', r: 'r', name: '수달 변신', desc: '진주 +5%', fx: { pearl: 0.05 } },
  { k: 'seal', kind: 'form', r: 'r', name: '아기 물범 변신', desc: '판마다 방패 +1', fx: { shield: 1 } },
  { k: 'halo', kind: 'deco', r: 'e', name: '천사 링', desc: '머리 위에 빛나는 링', look: { aura: '#fff3a8' } },
  { k: 'tiara', kind: 'deco', r: 'e', name: '진주 티아라', desc: '아멜리아 공주와 같은 티아라' },
  { k: 'trident', kind: 'wpn', r: 'e', name: '바다 삼지창', desc: '보스 공격 +35%', fx: { bossDmg: 0.35 }, col: '#ffd84d' },
  { k: 'thunder', kind: 'wpn', r: 'e', name: '번개 지팡이', desc: '보스 공격 +30% · 필살 게이지 +10%', fx: { bossDmg: 0.3, boostRate: 0.1 }, col: '#fff27a' },
  { k: 'axolotl', kind: 'form', r: 'e', name: '우파루파 변신', desc: '기운 물약 +50%', fx: { potion: 0.5 } },
  { k: 'dino', kind: 'form', r: 'e', name: '아기 공룡 변신', desc: '밟으면 쿵 충격파', fx: { stomp: 1 } },
  { k: 'penguin', kind: 'form', r: 'e', name: '펭귄 변신', desc: '필살 게이지 +15%', fx: { boostRate: 0.15 } },
  { k: 'rainbow', kind: 'wpn', r: 'l', name: '무지개 검', desc: '보스 공격 +50% · 물방울 세 갈래', fx: { bossDmg: 0.5, spread: 1 }, col: 'rainbow' },
  { k: 'dragon', kind: 'form', r: 'l', name: '아기 바다용 변신', desc: '필살 게이지 40으로 출발 · +20%', fx: { startBoost: 40, boostRate: 0.2 }, look: { aura: '#6ff0ff' } },
  { k: 'unicorn', kind: 'form', r: 'l', name: '유니콘 변신', desc: '점프 한 번 더 · 진주 +10%', fx: { jump: 1, pearl: 0.1 }, look: { aura: '#ffb8f0' } },
  // 보스 유물(신화): 보스를 이기면 5% — 끼우면 몸이 커지고 빛이 남
  { k: 'r_shark', kind: 'relic', r: 'm', boss: 'shark', name: '상어 대장의 이빨', desc: '부딪혀도 기운이 덜 줄어요(-8)', fx: { guard: 8 }, look: { giant: 1.18, aura: '#ff6b6b' } },
  { k: 'r_octopus', kind: 'relic', r: 'm', boss: 'octopus', name: '대왕 문어 먹물 망토', desc: '판마다 방패 +2', fx: { shield: 2 }, look: { giant: 1.18, aura: '#b07bff' } },
  { k: 'r_angler', kind: 'relic', r: 'm', boss: 'angler', name: '아귀 대왕의 등불', desc: '진주 +15%', fx: { pearl: 0.15 }, look: { giant: 1.18, aura: '#ffe36b' } },
  { k: 'r_jelly', kind: 'relic', r: 'm', boss: 'jelly', name: '번개 해파리 왕관', desc: '필살 게이지 +25%', fx: { boostRate: 0.25 }, look: { giant: 1.18, aura: '#ff9ce8' } },
  { k: 'r_crab', kind: 'relic', r: 'm', boss: 'crab', name: '왕꽃게 집게 장갑', desc: '보스 공격 +60%', fx: { bossDmg: 0.6 }, look: { giant: 1.18, aura: '#ff8a4d' } },
  { k: 'r_pirate', kind: 'relic', r: 'm', boss: 'pirate', name: '해적 선장 모자', desc: '필살 게이지 50으로 출발', fx: { startBoost: 50 }, look: { giant: 1.18, aura: '#ffd27a' } },
  { k: 'r_king', kind: 'relic', r: 'm', boss: 'king', name: '상어왕의 왕관', desc: '진주 +10% · 보스 공격 +30% · 방패 +1 · 게이지 30', fx: { pearl: 0.1, bossDmg: 0.3, shield: 1, startBoost: 30 }, look: { giant: 1.3, aura: '#ffcf3a' } },
];
const GEAR_KINDS = [['form', '변신'], ['wpn', '무기'], ['deco', '치장'], ['relic', '보스 유물']];
const BOSS_RELIC = { shark: 'r_shark', shark2: 'r_shark', shark3: 'r_shark', octopus: 'r_octopus', octopus2: 'r_octopus', octopus3: 'r_pirate', angler: 'r_angler', angler2: 'r_angler', jellyq: 'r_jelly', crabk: 'r_crab', king1: 'r_king', king: 'r_king' };
const gearOf = (k) => GEAR.find((g) => g.k === k);
const GEAR_SPR = { form: 'form_', wpn: 'gw_', deco: 'gd_', relic: 'gr_' };
['clam_shut', 'clam_open'].forEach((n) => load('spr_' + n, `assets/sprites/${n}.webp`));
GEAR.forEach((g) => { if (GEAR_SPR[g.kind]) load('spr_g_' + g.k, `assets/sprites/${GEAR_SPR[g.kind]}${g.kind === 'relic' ? g.k.slice(2) : g.k}.webp`); });
function gsave() {
  const d = { own: {}, eq: {}, shards: 0, pity: 0, pulls: 0, free: '', relicQ: [], log: [] };
  save.gacha = Object.assign(d, save.gacha || {}); return save.gacha;
}
const gearOwn = (k) => !!gsave().own[k];
const gearEq = (kind) => { const k = gsave().eq[kind]; return k ? gearOf(k) : null; };
function gearSum(key) { const eq = gsave().eq; let v = 0; for (const kind in eq) { const g = gearOf(eq[kind]); if (g && g.fx && g.fx[key]) v += g.fx[key]; } return v; }
function gearLook(key) { const eq = gsave().eq; let v = null; for (const kind of ['relic', 'form', 'deco']) { const g = gearOf(eq[kind]); if (g && g.look && g.look[key] != null && v == null) v = g.look[key]; } return v; }
const GEAR_POW = { c: 10, r: 25, e: 50, l: 100, m: 150 };
function gearPower() { const gs = gsave(); let v = 0; for (const kind in gs.eq) { const g = gearOf(gs.eq[kind]); if (g) v += GEAR_POW[g.r]; } return v + Object.keys(gs.own).length * 5; }
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const freePullReady = () => gsave().free !== todayKey();

// ───────── 뽑기 계산(결과는 누르기 전에 정해짐 — 연출은 보여 주기만) ─────────
function legendChance(n) { return n >= GACHA.pity ? 1 : n > GACHA.soft ? (GACHA.odds.l + GACHA.softStep * (n - GACHA.soft)) / 100 : GACHA.odds.l / 100; }
function rollTier(gs, floorE) {
  gs.pity++;
  const L = legendChance(gs.pity);
  if (Math.random() < L) { gs.pity = 0; return 'l'; }
  const rest = GACHA.odds.c + GACHA.odds.r + GACHA.odds.e; let x = Math.random() * rest;
  const t = (x -= GACHA.odds.c) < 0 ? 'c' : (x -= GACHA.odds.r) < 0 ? 'r' : 'e';
  return floorE && (t === 'c' || t === 'r') ? 'e' : t;
}
function grant(g) {
  const gs = gsave();
  if (g.kind === 'cur') { save.eggs += g.pearls; return { g, isNew: false, shards: 0 }; }
  if (gs.own[g.k]) { const s = RARITY[g.r].shards; gs.own[g.k]++; gs.shards += s; return { g, isNew: false, shards: s }; }
  gs.own[g.k] = 1; if (!gs.eq[g.kind] && g.kind !== 'cur') gs.eq[g.kind] = g.k; // 처음 얻은 장비는 빈 칸이면 바로 끼움(바로 달라진 걸 보게)
  return { g, isNew: true, shards: 0 };
}
function pull(n, how) {
  const gs = gsave(), out = [];
  for (let i = 0; i < n; i++) {
    const last = n === 10 && i === 9 && !out.some((o) => ['e', 'l'].includes(o.g.r)); // 10번 중 영웅 이상이 없으면 마지막은 영웅 확정
    const t = rollTier(gs, last), pool = GEAR.filter((g) => g.r === t && g.kind !== 'relic');
    out.push(grant(pick(pool)));
  }
  gs.pulls += n; gs.log = [...out.map((o) => o.g.k), ...gs.log].slice(0, 30);
  persist();
  gacha.rv = { list: out, i: 0, t0: performance.now(), shown: 0, taps: 0, open: false, multi: n > 1, how };
  if (typeof track === 'function') track('gacha', n);
  sfx.click(); haptic(20);
}
function buyPull(n) {
  if (n === 0) { if (!freePullReady()) return; gsave().free = todayKey(); pull(1, 'free'); return; }
  if (kidMode()) { // 어린이: 돈과 이어진 보석은 안 쓰고, 판에서 모은 진주로만
    const c = n === 10 ? GACHA.pcost10 : GACHA.pcost;
    if (save.eggs < c) { sfx.no(); shopSay(`진주가 ${(c - save.eggs).toLocaleString()}개 부족해요 · 판을 하면 모여요`); return; }
    spending = { gems: c, pearl: true, name: n === 10 ? '신비한 조개 10번' : '신비한 조개 1번', then: () => { save.eggs -= c; persist(); pull(n, 'pearl'); } }; sfx.click(); return;
  }
  const c = n === 10 ? GACHA.cost10 : GACHA.cost;
  askSpend(c, n === 10 ? '신비한 조개 10번' : '신비한 조개 1번', () => { if (!spendGems(c)) return; pull(n, 'gem'); });
}
function shardGet(g) {
  const gs = gsave(), c = GACHA.shardCost[g.r];
  if (!c || gs.own[g.k]) return;
  if (gs.shards < c) { sfx.no(); shopSay(`조각이 ${c - gs.shards}개 부족해요`); return; }
  gs.shards -= c; grant(g); persist();
  gacha.rv = { list: [{ g, isNew: true, shards: 0 }], i: 0, t0: performance.now(), shown: R_ORDER.indexOf(g.r), taps: 0, open: true, openT: performance.now(), multi: false, how: 'shard' };
  sfx.buy(); haptic(30);
}
function equipGear(g) {
  const gs = gsave();
  if (!gs.own[g.k]) return;
  if (gs.eq[g.kind] === g.k) { delete gs.eq[g.kind]; shopSay(`${g.name} 뺐어요`); }
  else { gs.eq[g.kind] = g.k; shopSay(`${g.name} 장착! ${g.desc || ''}`); if (g.kind === 'form') POSE_KEYS.forEach((k) => outfitPose(k)); }
  persist(); sfx.click(); haptic(15);
}
// 보스를 이기면 5% — 결과는 바로 저장(판을 끝내지 않고 나가도 안 잃게), 지도에서 신화 연출
function relicRoll(bossKey) {
  const k = BOSS_RELIC[bossKey]; if (!k || G.relicRolled) return;
  G.relicRolled = true;
  if (Math.random() * 100 >= GACHA.relicPct && !(window.LAB && LAB.relic)) return;
  const g = gearOf(k), res = grant(g), gs = gsave(); gs.relicQ.push({ k, shards: res.shards }); persist();
  G.relicGot = g;
  setTimeout(() => { if (G && state === 'play') { pop(W / 2, H / 2 - 90, '보스 유물 발견!!', RARITY.m.col, 52, true); reaction(4, '신화 등급!!'); burstRays(W / 2, H / 2, RARITY.m.col, 1.6, 28); sfx.gold(); haptic([80, 40, 160]); } }, 1500);
}
function openRelicQ() {
  const gs = gsave(), q = gs.relicQ.shift(); persist(); if (!q) return;
  gacha.rv = { list: [{ g: gearOf(q.k), isNew: !q.shards, shards: q.shards }], i: 0, t0: performance.now(), shown: 0, taps: 0, open: false, multi: false, how: 'relic' };
}

// ───────── 장비 그림: 아이콘 · 머리 치장 · 몸 둘레 빛 ─────────
function drawGear(g, x, y, s, alpha = 1, rot = 0) {
  if (!g) return;
  if (g.kind === 'cur') { drawPearl(x - s * 0.12, y + s * 0.06, s * 0.5); drawPearl(x + s * 0.16, y - s * 0.08, s * 0.42); if (g.pearls >= 300) drawPearl(x + s * 0.02, y + s * 0.22, s * 0.36); return; }
  if (!drawImg(IMG['spr_g_' + g.k], x, y, s, rot, alpha)) { ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = RARITY[g.r].col; ctx.beginPath(); ctx.arc(x, y, s * 0.36, 0, Math.PI * 2); ctx.fill(); ctx.restore(); icon(g.kind === 'wpn' ? 'e_fire' : g.kind === 'relic' ? 'e_crown' : g.kind === 'form' ? 'e_sparkles' : 'e_gift', x, y, s * 0.5, rot, alpha); }
}
const formImg = () => { const f = gearEq('form'); const im = f && IMG['spr_g_' + f.k]; return im && ready(im) ? im : null; };
function drawAura(x, y, r, col, a = 1) {
  if (!col) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r); const pul = 0.75 + Math.sin(T * 4) * 0.25;
  g.addColorStop(0, `rgba(255,255,255,${0.0})`); g.addColorStop(0.55, col + Math.round(0x55 * pul * a).toString(16).padStart(2, '0')); g.addColorStop(1, col + '00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 5; i++) { const ang = T * 1.6 + i * 1.26, rr2 = r * (0.62 + 0.14 * Math.sin(T * 3 + i)); ctx.fillStyle = col + 'cc'; ctx.beginPath(); ctx.arc(x + Math.cos(ang) * rr2, y + Math.sin(ang) * rr2 * 0.8, 2.5 + (i % 2), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// 달리는 터틀이 위: 치장(머리 꼭대기) · 무기(앞 손, 보스전) — run.js drawRunHero 에서 부름
function drawGearOnHero(key, c, x, feet, h, rot, alpha) {
  const d = !save.hideDeco && gearEq('deco'), hx = (typeof HAT_AT !== 'undefined' ? HAT_AT : {})[key];
  if (d && hx != null && c) {
    const w = (h * c.width) / c.height, cx = x + (hx - 0.5) * w * Math.cos(rot), cy = feet - h + (hx - 0.5) * w * Math.sin(rot);
    const s = h * (d.k === 'halo' ? 0.34 : 0.3), lift = d.k === 'halo' ? -h * 0.1 + Math.sin(T * 3) * 2 : d.k === 'star' ? -h * 0.06 : 0;
    drawGear(d, cx, cy + lift + s * 0.12, s, alpha == null ? 1 : alpha, rot);
  }
  const wpn = gearEq('wpn');
  if (wpn && G && G.boss && !G.boss.dead && key !== 'hero_shell' && key !== 'hero_ball') drawGear(wpn, x + h * 0.34, feet - h * 0.48 + Math.sin(T * 8) * 2, h * 0.42, alpha == null ? 1 : alpha, -0.5 + Math.sin(T * 8) * 0.08);
}

// ───────── 상점 「신비한 조개」 · 「가방」 화면 ─────────
const gacha = { rv: null, bagKind: 'form', sel: null };
function bagBtn(x, y, w, h) { // 상점 위: 「가방」 바로 가기(변신·무기·치장·보스 유물 장착)
  const on = shop.tab === 'bag';
  flatPill(x, y, w, h, h / 2, on ? '#ffd54a' : '#2f7bff');
  if (!drawImg(IMG.spr_g_dragon, x + 22, y + h / 2 - 1, h * 0.95, Math.sin(T * 2.5) * 0.06)) icon('e_gift', x + 22, y + h / 2, h * 0.7);
  text('가방', x + 44, y + h / 2, 15, on ? '#5a3000' : '#ffffff', { align: 'left', stroke: false, maxW: w - 50 });
  const mt = ctx.getTransform(); buttons.push({ x: (mt.a * x + mt.e) / K, y: (mt.d * y + mt.f) / K, w: w * mt.a / K, h: h * mt.d / K, on: () => { if (shop.tab !== 'bag') { shop.tab = 'bag'; shop.tabAt = T; shop.tabDir = 1; } sfx.click(); } });
}
function gachaBtn(x, y, w, h, onTap) { // 상점 위 가운데: 반짝이는 조개 단추(공짜가 있으면 빨간 점)
  const on = shop.tab === 'gacha' || shop.tab === 'bag';
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#8a4dff'); g.addColorStop(1, '#ff5fb8');
  ctx.fillStyle = g; rr(x, y, w, h, h / 2); ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.2 * Math.sin(T * 4); ctx.fillStyle = '#ffffff'; rr(x + 3, y + 3, w - 6, h * 0.42, h / 2); ctx.fill();
  ctx.restore();
  if (on) { ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 3; rr(x, y, w, h, h / 2); ctx.stroke(); }
  if (!drawImg(IMG.spr_clam_shut, x + 24, y + h / 2, h * 1.05, Math.sin(T * 3) * 0.1)) icon('e_gift', x + 24, y + h / 2, h * 0.7);
  text('신비한 조개', x + 46, y + h / 2, 15, '#ffffff', { align: 'left', stroke: 'rgba(60,0,80,.55)', lw: 3 });
  if (freePullReady() || gsave().relicQ.length) { ctx.fillStyle = C.danger; ctx.beginPath(); ctx.arc(x + w - 6, y + 6, 7, 0, Math.PI * 2); ctx.fill(); }
  const mt = ctx.getTransform(); buttons.push({ x: (mt.a * x + mt.e) / K, y: (mt.d * y + mt.f) / K, w: w * mt.a / K, h: h * mt.d / K, on: onTap || (() => { shop.tab = 'gacha'; shop.tabAt = T; shop.tabDir = 1; sfx.click(); }) });
}
function rarityChip(r, x, y, label) {
  ctx.font = `800 ${fs(13)}px ${FONT}`; const w = ctx.measureText(label).width + 18;
  ctx.fillStyle = RARITY[r].col; rr(x, y - 12, w, 24, 12); ctx.fill();
  text(label, x + w / 2, y, 13, r === 'c' ? '#26303a' : '#ffffff', { stroke: r === 'c' ? false : 'rgba(0,0,0,.35)', lw: 3 });
  return w;
}
function drawGachaPage() {
  // 여백 규칙(8 배수): 판 안쪽 32 · 묶음 사이 16 · 글자 줄 간격 1.45 · 한 판에 글자는 3줄까지(나머지는 확률 정보로)
  const gs = gsave(), PT = 118, PB = 470;
  // 왼쪽: 조개 진열장 — 전설 3개가 조개 둘레를 돌며 「이게 나올 수 있어요」
  panel(40, PT, 420, PB - PT, { fill: 'rgba(70,30,120,.9)' });
  ctx.save(); rr(48, PT + 8, 404, PB - PT - 16, 16); ctx.clip();
  celebrateGlow(250, 282, 190, '255,200,90', 0.6);
  const legs = GEAR.filter((g) => g.r === 'l');
  legs.forEach((g, i) => { const a = T * 0.7 + i * Math.PI * 2 / legs.length, x = 250 + Math.cos(a) * 140, y = 282 + Math.sin(a) * 52, z = 0.75 + 0.25 * Math.sin(a); drawGear(g, x, y, 64 * z, 0.5 + 0.5 * z); });
  ctx.restore();
  if (!drawImg(IMG.spr_clam_shut, 250, 282 + Math.sin(T * 2) * 4, 140, Math.sin(T * 1.4) * 0.05)) icon('e_gift', 250, 282, 110);
  text('신비한 조개', 250, PT + 44, 24, '#ffffff', { lw: 6, stroke: 'rgba(60,0,80,.7)' });
  text('변신 · 무기 · 치장', 250, PT + 74, 14, '#e9d2ff', { body: true, stroke: false });
  // 천장: 이름표 → 막대 → 한 줄(아래 안쪽 여백 32)
  const left = GACHA.pity - gs.pity, k = gs.pity / GACHA.pity, by = PB - 64;
  text(`전설까지 최대 ${left}번`, 250, by - 18, 15, RARITY.l.col, { lw: 4 });
  ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(80, by, 340, 12, 6); ctx.fill();
  const bg = ctx.createLinearGradient(80, 0, 420, 0); bg.addColorStop(0, '#b56cff'); bg.addColorStop(1, '#ffc83a');
  ctx.fillStyle = bg; rr(80, by, Math.max(12, 340 * k), 12, 6); ctx.fill();
  text(gs.pity > GACHA.soft ? `지금 전설 확률 ${Math.round(legendChance(gs.pity + 1) * 100)}%` : `${GACHA.soft + 1}번째부터 확률이 올라가요`, 250, by + 32, 13, 'rgba(255,255,255,.78)', { body: true, stroke: false });
  // 오른쪽: 확률 → 한 줄 → 공짜 → 뽑기 → 작은 단추 → 한 줄 (세로 리듬 14~18)
  const X0 = 500, X1 = 896, CW = X1 - X0;
  panel(476, PT, 444, PB - PT);
  ctx.font = `800 ${fs(13)}px ${FONT}`;
  const chips = ['c', 'r', 'e', 'l'].map((r) => [r, `${RARITY[r].name} ${GACHA.odds[r]}%`]), cws = chips.map(([, l]) => ctx.measureText(l).width + 20);
  let cx = X0 + (CW - (cws.reduce((a, b) => a + b, 0) + 8 * 3)) / 2;
  chips.forEach(([r, l], i) => { rarityChip(r, cx, PT + 40, l); cx += cws[i] + 8; });
  text('10번 뽑으면 영웅 이상 1개 확정', (X0 + X1) / 2, PT + 76, 14, '#ffffff', { body: true, stroke: false });
  const fr = freePullReady(), yF = PT + 102;
  button(X0, yF, CW, 48, fr ? '오늘의 공짜 조개 열기' : '공짜 조개는 내일 또 와요', () => buyPull(0), { size: 16, kind: fr ? 'ok' : 'soft', disabled: !fr });
  const yP = yF + 48 + 16, bw = (CW - 16) / 2;
  const kid = kidMode();
  [[1, '1번 뽑기', kid ? GACHA.pcost : GACHA.cost], [10, '10번 뽑기', kid ? GACHA.pcost10 : GACHA.cost10]].forEach(([n, label, c], i) => {
    const x = X0 + i * (bw + 16), mx = x + bw / 2;
    button(x, yP, bw, 64, '', () => buyPull(n), { kind: 'yellow' });
    text(label, mx, yP + 23, 17, '#5a3000', { stroke: false });
    ctx.font = `800 ${fs(15)}px ${FONT}`; const cs = c.toLocaleString(), nw = ctx.measureText(cs).width, gw = 18 + 6 + nw; // 아이콘 + 숫자를 한 덩어리로 가운데
    if (kid) drawPearl(mx - gw / 2 + 9, yP + 45, 18); else icon('e_gem', mx - gw / 2 + 9, yP + 45, 18); text(cs, mx - gw / 2 + 24, yP + 46, 15, '#5a3000', { align: 'left', stroke: false });
  });
  ctx.fillStyle = C.danger; rr(X1 - 64, yP - 10, 60, 20, 10); ctx.fill(); text('10% 할인', X1 - 34, yP, 12, '#ffffff', { stroke: false });
  const yU = yP + 64 + 14, uw = (CW - 24) / 3;
  button(X0, yU, uw, 40, '확률 정보', () => { probOpen = 'gacha'; sfx.click(); }, { size: 14, kind: 'soft' });
  button(X0 + uw + 12, yU, uw, 40, '가방 · 장착', () => { shop.tab = 'bag'; shop.tabAt = T; shop.tabDir = 1; sfx.click(); }, { size: 14, kind: 'primary' });
  button(X0 + (uw + 12) * 2, yU, uw, 40, `조각 ${gs.shards}`, () => { shop.tab = 'bag'; shop.tabAt = T; sfx.click(); }, { size: 14, kind: 'soft' });
  text(`보스 유물은 보스를 이기면 ${GACHA.relicPct}% · 조개에선 안 나와요`, (X0 + X1) / 2, yU + 40 + 26, 13, RARITY.m.col, { body: true, stroke: false });
}
function drawBagPage() {
  // 인기 게임 보물 화면처럼: 칸은 그림 + 이름만, 고른 것의 설명·단추는 아래 띠 한 줄(글자를 칸마다 넣지 않음)
  const gs = gsave(), PT = 118, PB = 470;
  // 왼쪽: 지금 모습 + 끼운 4칸(한 줄씩)
  panel(40, PT, 270, PB - PT);
  const relic = gearEq('relic'), aura = gearLook('aura'), giant = gearLook('giant') || 1;
  const ph = Math.min(136, 112 * giant), py = PT + 104;
  drawAura(175, py, ph * 0.66, aura);
  const fi = formImg(); drawImg(fi || playerImg(), 175, py, ph);
  const d = gearEq('deco'); if (d) drawGear(d, 175, py - ph * 0.5, 34);
  if (relic && giant > 1) { ctx.fillStyle = RARITY.m.col; rr(127, PT + 166, 96, 20, 10); ctx.fill(); text('몸이 커져요', 175, PT + 176, 12, '#ffffff', { stroke: false }); }
  const SY = PT + 190, SH = 32, SG = 6;
  GEAR_KINDS.forEach(([kind, label0], i) => {
    const g = gearEq(kind), y = SY + i * (SH + SG), label = kind === 'relic' ? '유물' : label0;
    ctx.fillStyle = 'rgba(255,255,255,.06)'; rr(56, y, 238, SH, 10); ctx.fill();
    if (g) { ctx.fillStyle = RARITY[g.r].col; rr(56, y, 4, SH, 2); ctx.fill(); drawGear(g, 82, y + SH / 2, 26); }
    else { ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(82, y + SH / 2, 10, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    text(label, 104, y + SH / 2, 12, 'rgba(255,255,255,.55)', { align: 'left', body: true, stroke: false });
    let nm = g ? g.name.replace(' 변신', '') : '비어 있음'; ctx.font = `600 ${fs(13)}px ${FONT}`; while (ctx.measureText(nm).width > 128 && nm.length > 2) nm = nm.slice(0, -2) + '…';
    text(nm, 282, y + SH / 2, 13, g ? '#ffffff' : 'rgba(255,255,255,.4)', { align: 'right', body: true, stroke: false });
  });
  // 오른쪽: 종류 탭 → 칸 4×2 → 고른 것 띠
  const X0 = 326, X1 = 920;
  GEAR_KINDS.forEach(([kind, label], i) => button(X0 + i * 118, PT, 110, 36, label, () => { gacha.bagKind = kind; gacha.sel = null; sfx.click(); }, { size: 14, kind: gacha.bagKind === kind ? 'yellow' : 'soft' }));
  text(`조각 ${gs.shards}`, X1, PT + 18, 14, '#9fe3ff', { align: 'right', stroke: false });
  const list = GEAR.filter((g) => g.kind === gacha.bagKind);
  if (!gacha.sel || gacha.sel.kind !== gacha.bagKind) gacha.sel = list.find((g) => gs.eq[g.kind] === g.k) || list.find((g) => gearOwn(g.k)) || list[0];
  const TW = 140, TH = 112, TG = 11.3, TY = PT + 50;
  list.forEach((g, i) => withRise(i, () => {
    const x = X0 + (i % 4) * (TW + TG), y = TY + Math.floor(i / 4) * (TH + 10), own = gearOwn(g.k), on = gs.eq[g.kind] === g.k, sel = gacha.sel === g;
    ctx.fillStyle = sel ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.07)'; rr(x, y, TW, TH, 14); ctx.fill();
    ctx.strokeStyle = sel ? '#ffd54a' : own ? RARITY[g.r].col : 'rgba(255,255,255,.12)'; ctx.lineWidth = sel ? 3 : 2; rr(x, y, TW, TH, 14); ctx.stroke();
    if (own && (g.r === 'l' || g.r === 'm')) drawAura(x + TW / 2, y + 46, 34, RARITY[g.r].col, 0.8);
    drawGear(g, x + TW / 2, y + 46, 54, own ? 1 : 0.3);
    if (!own) icon('e_lock', x + TW / 2, y + 48, 22, 0, 0.9);
    text(g.name.replace(/ 변신$| Form$/, ''), x + TW / 2, y + TH - 18, 13, own ? '#ffffff' : 'rgba(255,255,255,.5)', { body: true, stroke: false, maxW: TW - 8 });
    if (on) { ctx.fillStyle = C.ok; rr(x + TW - 46, y + 8, 38, 20, 10); ctx.fill(); text('장착', x + TW - 27, y + 18, 12, '#ffffff', { stroke: false }); }
    else if (own && gs.own[g.k] > 1) text(`×${gs.own[g.k]}`, x + TW - 12, y + 18, 12, 'rgba(255,255,255,.6)', { align: 'right', stroke: false });
    const mt = ctx.getTransform(); buttons.push({ x: (mt.a * x + mt.e) / K, y: (mt.d * y + mt.f) / K, w: TW * mt.a / K, h: TH * mt.d / K, on: () => { gacha.sel = g; sfx.click(); } });
  }));
  // 고른 것 띠: 그림 · 이름+등급 · 효과 한 줄 · 단추(같은 높이 가운데)
  const g = gacha.sel; if (!g) return;
  const BY = TY + 2 * (TH + 10) + 4, BH = PB - BY, own = gearOwn(g.k), on = gs.eq[g.kind] === g.k, sc = GACHA.shardCost[g.r];
  ctx.fillStyle = 'rgba(10,30,70,.55)'; rr(X0, BY, X1 - X0, BH, 14); ctx.fill();
  drawGear(g, X0 + 34, BY + BH / 2, 44, own ? 1 : 0.4);
  ctx.font = `800 ${fs(15)}px ${FONT}`; const nw = ctx.measureText(g.name).width;
  text(g.name, X0 + 66, BY + BH / 2 - 11, 15, '#ffffff', { align: 'left', stroke: false });
  rarityChip(g.r, X0 + 66 + nw + 10, BY + BH / 2 - 11, RARITY[g.r].name);
  text(g.desc || '', X0 + 66, BY + BH / 2 + 12, 13, C.yellow, { align: 'left', body: true, stroke: false });
  const bx = X1 - 12 - 150, bt = BY + (BH - 36) / 2;
  if (own) button(bx, bt, 150, 36, on ? '빼기' : '장착하기', () => equipGear(g), { size: 15, kind: on ? 'soft' : 'primary' });
  else if (g.kind === 'relic') text(`보스를 이기면 ${GACHA.relicPct}%`, X1 - 24, BY + BH / 2, 13, RARITY.m.col, { align: 'right', body: true, stroke: false });
  else if (sc) button(bx, bt, 150, 36, `조각 ${sc}로 받기`, () => shardGet(g), { size: 14, kind: gs.shards >= sc ? 'yellow' : 'off', disabled: gs.shards < sc });
}

// ───────── 여는 연출: 스타 드롭처럼 톡톡 → 색이 한 단계씩 오름 → 펑 ─────────
function drawGachaReveal() {
  const rv = gacha.rv; if (!rv) return false;
  const now = performance.now(), t = (now - rv.t0) / 1000;
  buttons.length = 0;
  ctx.save(); ctx.translate(OX(), 0);
  ctx.fillStyle = 'rgba(6,4,18,.95)'; ctx.fillRect(-OX(), 0, W, H);
  if (rv.multi) drawRevealGrid(rv, t); else drawRevealOne(rv, t);
  ctx.restore();
  return true;
}
function revealTap(rv) {
  const it = rv.list[rv.i], target = R_ORDER.indexOf(it.g.r);
  if (rv.open) { if ((performance.now() - rv.openT) / 1000 < 0.6) return; rv.i++; if (rv.i >= rv.list.length) { gacha.rv = null; confetti(30); return; } rv.open = false; rv.shown = 0; rv.taps = 0; rv.t0 = performance.now(); return; }
  rv.shakeT = performance.now(); rv.taps++;
  if (rv.shown < target) { rv.shown++; if (!snd('gc_knock', 0.85, 0.92 + rv.shown * 0.04)) snd('tick', 0.8, 0.9 + rv.shown * 0.18); snd('gc_up', 0.45 + rv.shown * 0.12, 0.9 + rv.shown * 0.07, 0, 0.04); haptic(15 + rv.shown * 12); /* 두드림(묵직) + 등급 오름(위로 차오름) 두 겹 */ if (rv.shown >= 3) { flash = 0.25; flashColor = RARITY[R_ORDER[rv.shown]].col; } return; }
  rv.open = true; rv.openT = performance.now(); haptic([40, 30, 90]); flash = 0.5; flashColor = '#ffffff';
  if (!snd('gc_open', 1)) sfx.crack(); else snd('crack', 0.3, 0.9); // 쾅 열림 + 껍데기 갈라짐(작게) 겹쳐서
  if (target >= 3) { confetti(80); burstRays(W / 2, H / 2, RARITY[it.g.r].col, 1.8, 30); snd('gc_legend', target >= 4 ? 1 : 0.85, 1, 0, 0.12); } // 전설·신화: 팡파레
  else if (target === 2) snd('gc_up', 0.5, 1.15, 0, 0.1);
}
function drawRevealOne(rv, t) {
  const it = rv.list[rv.i], r = R_ORDER[rv.shown], col = RARITY[r].col;
  buttons.push({ x: 0, y: 0, w: W, h: H, on: () => revealTap(rv) });
  if (!rv.open) {
    const st = rv.shakeT ? (performance.now() - rv.shakeT) / 1000 : 9, sh = st < 0.35 ? Math.sin(st * 60) * 0.18 * (1 - st / 0.35) : Math.sin(t * 3) * 0.03;
    drawAura(480, H / 2 + 10, 190 + rv.shown * 30, col, 1.2);
    const sc = 1 + (st < 0.2 ? (0.2 - st) * 0.8 : 0) + rv.shown * 0.04;
    if (!drawImg(IMG.spr_clam_shut, 480, H / 2 + 10, 230 * sc, sh)) icon('e_gift', 480, H / 2, 180 * sc, sh);
    text(RARITY[r].name, 480, 92, 38, col, { lw: 8 });
    text(rv.how === 'relic' ? '보스가 떨어뜨린 보물이에요!' : '톡톡 눌러 보세요!', 480, H - 60, 20, '#ffffff', { stroke: false });
    if (rv.multi === false && rv.list.length === 1 && rv.how !== 'relic') text('누를 때마다 더 좋은 색이 될지도…', 480, H - 32, 14, C.sub, { body: true, stroke: false });
    return;
  }
  const k = clamp((performance.now() - rv.openT) / 1000 / 0.5, 0, 1), g = it.g, gc = RARITY[g.r].col;
  { const m = RARITY[g.r].glow.match(/\d+,\d+,\d+/); celebrateGlow(480, H / 2 - 20, 300, m ? m[0] : '255,214,110', k); }
  drawImg(IMG.spr_clam_open, 480, H / 2 + 56, 170, 0, 0.85);
  drawAura(480, H / 2 - 24, 150, gc, 1.3);
  drawGear(g, 480, H / 2 - 24, 170 * easeOutBack(k));
  text(RARITY[g.r].name, 480, 62, 22, gc, { lw: 5 });
  text(g.name, 480, 98, 40, '#ffffff', { lw: 8 });
  if (g.desc) { ctx.font = `800 ${fs(17)}px ${FONT}`; const pw = ctx.measureText(g.desc).width + 48; ctx.globalAlpha = k; ctx.fillStyle = gc; rr(480 - pw / 2, H - 132, pw, 40, 20); ctx.fill(); text(g.desc, 480, H - 112, 17, g.r === 'c' || g.r === 'l' ? '#3a2a00' : '#ffffff', { stroke: false }); ctx.globalAlpha = 1; }
  if (it.isNew) { ctx.save(); ctx.translate(590, H / 2 - 112); ctx.rotate(0.2); ctx.fillStyle = C.danger; rr(-36, -15, 72, 30, 15); ctx.fill(); text('NEW', 0, 0, 16, '#ffffff', { stroke: false }); ctx.restore(); }
  if ((performance.now() - rv.openT) / 1000 > 0.6) { // 아래 한 줄만: 상태 · 다음 행동
    const st = it.shards ? `이미 있어요 → 조각 +${it.shards}` : it.isNew && g.kind !== 'cur' ? '가방에 넣었어요' : '';
    text([st, rv.i < rv.list.length - 1 ? '눌러서 다음' : '눌러서 닫기'].filter(Boolean).join('  ·  '), 480, H - 52, 15, it.shards ? '#9fe3ff' : 'rgba(255,255,255,.85)', { body: true, stroke: false });
  }
}
function drawRevealGrid(rv, t) {
  const n = rv.list.length, step = 0.16, done = t > n * step + 0.4;
  if (!rv.spot) rv.spot = rv.list.map((o, i) => (['l', 'm'].includes(o.g.r) ? i : -1)).filter((i) => i >= 0);
  buttons.push({ x: 0, y: 0, w: W, h: H, on: () => { if (!done) { rv.t0 = performance.now() - (n * step + 0.5) * 1000; return; } if (rv.spot.length) { const i = rv.spot.shift(); gacha.rv = { list: [rv.list[i]], i: 0, t0: performance.now(), shown: R_ORDER.indexOf(rv.list[i].g.r), open: true, openT: performance.now(), multi: false, after: rv }; return; } gacha.rv = null; confetti(40); } });
  text('신비한 조개 10번!', 480, 52, 30, '#ffffff', { lw: 6 });
  rv.list.forEach((o, i) => {
    const x = 144 + (i % 5) * 168, y = 170 + Math.floor(i / 5) * 190, k = clamp((t - i * step) / 0.3, 0, 1), g = o.g, col = RARITY[g.r].col;
    if (k > 0 && !rv['snd' + i]) { rv['snd' + i] = 1; if (!snd('gc_card', 0.55, 0.94 + R_ORDER.indexOf(g.r) * 0.05)) snd('tick', 0.6, 0.8 + R_ORDER.indexOf(g.r) * 0.2); if (['l', 'm'].includes(g.r)) { flash = 0.3; flashColor = col; haptic(60); snd('gc_legend', 0.75, 1, 1.5); } else if (g.r === 'e') snd('gc_up', 0.35, 1.2, 0.3); } // 카드 휙 + 좋은 것만 한 겹 더
    ctx.fillStyle = 'rgba(255,255,255,.06)'; rr(x - 72, y - 72, 144, 170, 18); ctx.fill();
    if (k <= 0) { drawImg(IMG.spr_clam_shut, x, y, 100); return; }
    ctx.strokeStyle = col; ctx.lineWidth = 3; rr(x - 72, y - 72, 144, 170, 18); ctx.stroke();
    if (R_ORDER.indexOf(g.r) >= 2) drawAura(x, y, 70, col, 0.9);
    drawGear(g, x, y, 92 * easeOutBack(k));
    ctx.font = `800 ${fs(12)}px ${FONT}`; const rw = Math.max(52, ctx.measureText(RARITY[g.r].name).width + 16); ctx.fillStyle = col; rr(x - rw / 2, y + 50, rw, 20, 10); ctx.fill(); text(RARITY[g.r].name, x, y + 60, 12, g.r === 'c' ? '#26303a' : '#ffffff', { stroke: false });
    text(g.name.replace(/ 변신$| Form$/, ''), x, y + 84, 13, '#ffffff', { body: true, stroke: false, maxW: 120 });
    if (o.isNew && g.kind !== 'cur') { ctx.fillStyle = C.danger; rr(x + 30, y - 66, 38, 18, 9); ctx.fill(); text('NEW', x + 49, y - 57, 12, '#ffffff', { stroke: false }); }
    else if (o.shards) text(`조각 +${o.shards}`, x, y - 56, 12, '#9fe3ff', { stroke: false });
  });
  if (done) text(rv.spot.length ? '눌러서 전설 보기!' : '눌러서 받기', 480, H - 30, 16, '#ffffff', { stroke: false });
}

// ───────── 확률 정보(게임산업법 시행령 별표 3의2 · 애플 3.1.1 · 구글 정책: 사기 전에, 뽑기 화면 바로 옆에) ─────────
function drawGachaProb() {
  // 표처럼: 등급 한 줄씩(왼쪽 등급 칩 · 오른쪽 항목 알약) → 아래 규칙 카드 3장. 판 안쪽 32, 줄 사이 12, 카드 안 줄 간격 1.45
  buttons.length = 0; buttons.push({ x: 0, y: 0, w: W, h: H, on: () => {} });
  ctx.save(); ctx.translate(OX(), 0);
  ctx.fillStyle = 'rgba(8,8,12,.9)'; ctx.fillRect(-OX(), 0, W, H);
  const PX = 80, PW = 800, PY = 28, PH = 496, L = PX + 32, R = PX + PW - 32;
  panel(PX, PY, PW, PH, { fill: C.gray });
  if (!ribbon(480, PY + 4, 340, '신비한 조개 확률', 22)) text('신비한 조개 확률', 480, PY + 40, 24, C.text, { stroke: false });
  text(kidMode() ? `어린이 모드: 진주로만 · 1번 진주 ${GACHA.pcost} · 10번 ${GACHA.pcost10.toLocaleString()} · 하루 1번 무료` : `1번 보석 ${GACHA.cost} · 10번 보석 ${GACHA.cost10} · 하루 1번 무료`, 480, PY + 64, 14, 'rgba(255,255,255,.72)', { body: true, stroke: false });
  const pct = (v) => `${+v.toFixed(2)}%`, PH2 = 26, GAP = 8;
  let y = PY + 88;
  for (const r of ['c', 'r', 'e', 'l']) {
    const pool = GEAR.filter((g) => g.r === r && g.kind !== 'relic'), each = GACHA.odds[r] / pool.length;
    rarityChip(r, L, y + PH2 / 2, `${RARITY[r].name} ${GACHA.odds[r]}%`);
    let x = L + 112, row = 0;
    ctx.font = `600 ${fs(13)}px ${FONT}`;
    for (const g of pool) {
      const label = `${g.name.replace(' 변신', '')}  ${pct(each)}`, w = ctx.measureText(label).width + 24;
      if (x + w > R) { x = L + 112; row++; }
      const yy = y + row * (PH2 + GAP);
      ctx.fillStyle = 'rgba(255,255,255,.07)'; rr(x, yy, w, PH2, PH2 / 2); ctx.fill();
      ctx.fillStyle = RARITY[r].col; ctx.beginPath(); ctx.arc(x + 11, yy + PH2 / 2, 3, 0, Math.PI * 2); ctx.fill();
      text(label, x + 18, yy + PH2 / 2, 13, '#ffffff', { align: 'left', body: true, stroke: false });
      x += w + GAP; ctx.font = `600 ${fs(13)}px ${FONT}`;
    }
    y += (row + 1) * (PH2 + GAP) + 6;
  }
  // 규칙 카드 3장(제목 1줄 + 짧은 3줄)
  const cards = [
    ['천장', RARITY.l.col, [`${GACHA.soft + 1}번째부터 전설 +${GACHA.softStep}%p씩`, `${GACHA.soft + 1}번째 ${GACHA.odds.l + GACHA.softStep}% → ${GACHA.pity - 1}번째 ${GACHA.odds.l + GACHA.softStep * (GACHA.pity - 1 - GACHA.soft)}%`, `${GACHA.pity}번째는 전설 확정`, '천장 넣은 평균 약 5.3%']],
    ['10번 · 조각', RARITY.e.col, ['10번 = 영웅 이상 1개 확정', `중복은 조각 ${RARITY.c.shards}·${RARITY.r.shards}·${RARITY.e.shards}·${RARITY.l.shards}개`, `조각 ${GACHA.shardCost.r}·${GACHA.shardCost.e}·${GACHA.shardCost.l}로 골라 받기`]],
    ['보스 유물(신화)', RARITY.m.col, ['조개에서는 안 나와요', `보스를 이기면 ${GACHA.relicPct}% (무료)`, `이미 있으면 조각 ${RARITY.m.shards}개`]],
  ];
  const cw = (R - L - 16 * 2) / 3, ch = PY + PH - 32 - y, lh = fs(13) * 1.45;
  cards.forEach(([t, col, lines], i) => {
    const x = L + i * (cw + 16);
    ctx.fillStyle = 'rgba(255,255,255,.06)'; rr(x, y, cw, ch, 14); ctx.fill();
    ctx.fillStyle = col; rr(x, y, 4, ch, 2); ctx.fill();
    const top = y + (ch - (fs(15) * 1.2 + 10 + lh * lines.length)) / 2; // 카드 안 세로 가운데
    text(t, x + 20, top + fs(15) * 0.6, 15, col, { align: 'left', stroke: false });
    lines.forEach((l, j) => text(l, x + 20, top + fs(15) * 1.2 + 10 + lh * (j + 0.5), 13, 'rgba(255,255,255,.88)', { align: 'left', body: true, stroke: false }));
  });
  roundBtn('close', PX + PW - 12, PY + 12, 22, () => { probOpen = false; sfx.click(); }, '닫기');
  ctx.restore();
  return true;
}
