'use strict';
// 터틀 레이스 — 손맛·연출 2판. 앱의 미니게임 「알 합치기」를 분석해서(장치만) 러너에 맞게 다시 만든 것
// ① 맞음: 몸 모양 번쩍(흰 55ms → 빨강 200ms) · 세기별 멈칫 · 밀려남/찌그러짐 용수철 · 충격 별 · 합쳐지는 피해 숫자
// ② 격파: 그림 조각으로 와장창(졸개 3×3, 보스는 하얗게 굳어 부풀었다가 4×4 + K.O!)
// ③ 보스: 그림자 → 떨어짐 → 쿵, 줄무늬 경고 띠, 잔상 체력바(얼굴·10칸·떨림), 75/50/25% 「아야!」, 도발(크게·웃음·ㅋㅋ)
// ④ 박자: 진짜 음악 시계(곡마다 BPM·첫 박은 scripts/beats.mjs 로 잰 값). 박에 맞춰 뛰면 「박자 딱!」, 코스도 박에 맞춰 놓음
// ⑤ 필살 3단: 질주 게이지 300 — 1단 질주 / 2단 그림자 거북 군단 / 3단 황금 터틀이 강림
// ⑥ 판 안 레벨업: 구슬·알·밟기·박자로 경험치 → 능력 카드 3장 중 1장(★1~3)
// ⑦ 판 전 목표 카드

['fx_ha', 'taunt_bubble', 'ui_ult', 'lvup_burst', 'm10', 'm06', 'it_bolt', 'it_bubble', 'it_ice', 'it_magnet', 'it_swirl', 'it_star', 'it_up', 'it_gold',
  'sk_combo', 'sk_crit', 'sk_magnet', 'sk_gold', 'sk_ult', 'sk_moves', 'sk_chain', 'sk_bomb', 'sk_pet', 'chest_gold_closed', 'chest_gold_open', 'cur_pearl', 'cur_pearls', 'fx_ink', 'fx_tentacle']
  .forEach((n) => load('x_' + n, `assets/fx/${n}.webp`));

// 판이 바뀌면 예전 예약은 실행 안 되게(연출이 새 판을 건드리는 버그 막기)
let runSeq = 0;
const later = (ms, fn) => { const r = runSeq; setTimeout(() => { if (r === runSeq && G) fn(); }, ms); };

// ───────── ① 맞음 ─────────
const hitNums = [], hitStars = [], shards = [];
function hitReact(o, power = 1, dir = 1) {
  if (!o) return;
  if (power >= 1.5 || T - (o.flashAt || -9) > 0.15) o.flashAt = T; // 연타는 흰 번쩍임 0.15초에 한 번
  o.hitAt = T;
  o.kvx = (o.kvx || 0) + dir * 11 * power * 60;
  o.sq = Math.min(0.36, Math.max(o.sq || 0, 0.14 * power + 0.06)); o.sqv = 0;
}
function springs(o, dt) {
  if (o.kx == null) { o.kx = 0; o.kvx = o.kvx || 0; o.sq = o.sq || 0; o.sqv = 0; }
  const f = dt * 60;
  o.kvx += -0.24 * o.kx * f * 60; o.kvx *= Math.pow(0.76, f); o.kx += (o.kvx / 60) * f;
  o.sqv += -0.32 * o.sq * f; o.sqv *= Math.pow(0.8, f); o.sq += o.sqv * f;
  if (Math.abs(o.sq) < 0.001 && Math.abs(o.sqv) < 0.001) o.sq = 0;
}
// 몸 모양 번쩍: 흰색 55ms → 빨강이 200ms 동안 식음
function flashOver(key, h, o) {
  const a = T - (o.flashAt == null ? -9 : o.flashAt), b = T - (o.hitAt == null ? -9 : o.hitAt);
  if (a < 0.055) drawImg(silhouette(key, '#ffffff'), 0, 0, h, 0, 0.85);
  else if (b < 0.255) drawImg(silhouette(key, '#ff3b4e'), 0, 0, h, 0, (1 - (b - 0.055) / 0.2) * 0.45);
}
const recentHits = [];
function hitStop(kind) {
  const now = T; while (recentHits.length && now - recentHits[0] > 1.5) recentHits.shift(); recentHits.push(now);
  let s = { small: 0.022, big: 0.055, crit: 0.09, ko: 0.22 }[kind] || 0.022;
  if (kind !== 'crit' && kind !== 'ko' && recentHits.length >= 4) s = 0.012; // 연타는 짧게(답답하지 않게)
  freeze = Math.max(freeze, s);
}
function hitStar(x, y, crit, big) { hitStars.push({ x, y, t: 0, crit, big, rot: rand(0, 6) }); if (hitStars.length > 10) hitStars.shift(); }
function hitNum(x, y, val, crit = false) {
  const last = hitNums[hitNums.length - 1];
  if (last && !crit && !last.crit && T - last.t0 < 0.6 && Math.abs(last.x - x) < 220) { last.val += val; last.t0 = T; last.vy = -180; last.popT = T; return; } // 작은 물방울 피해는 0.6초 안이면 하나로 합침(숫자가 쏟아지지 않게)
  for (let k = 0; k < 3; k++) { const hit = pops.find((q) => q.life > 0.2 && Math.abs(q.x - x) < 110 && Math.abs(q.y - y) < 46); if (!hit) break; y = hit.y - 54; } // 떠 있는 글자 위는 피해서
  hitNums.push({ x, y, vx: -(50 + rand(0, 90)), vy: -(216 + rand(0, 72)), t0: T, popT: T, val, crit, life: crit ? 1.15 : 0.85 });
  if (hitNums.length > 8) hitNums.shift();
}
// 그림을 조각내서 흩뿌림(처음 12%는 하얗게)
function shatter(key, x, y, h, n = 3, power = 1) {
  const im = IMG[key]; if (!ready(im) || REDUCE) return;
  const iw = im.naturalWidth, ih = im.naturalHeight, w = h * iw / ih;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const ox = (i + 0.5) / n - 0.5, oy = (j + 0.5) / n - 0.5;
    shards.push({ key, im, sx: (i * iw) / n, sy: (j * ih) / n, sw: iw / n, sh: ih / n, dw: w / n, dh: h / n, x: x + ox * w, y: y + oy * h,
      vx: (ox * 16 * 60 + rand(-120, 120)) * power, vy: (oy * 12 * 60 - 360 - rand(0, 240)) * power, rot: 0, vr: rand(-15, 15), t: 0, life: 1.1 });
  }
  if (shards.length > 80) shards.splice(0, shards.length - 80);
}
// 멈칫 중에도 흘러야 하는 것(조각·숫자·별) — main.update 의 freeze 앞에서 부름
// ───────── 그림 효과(코덱스가 그린 칼빛·폭발·충격파·빛기둥) — 진짜 시간으로 움직여 멈칫 중에도 살아 있음 ─────────
const sprFx = [];
// k: 그림 이름(fx_slash 등), h: 높이, o: { life, from, to(크기 배율), rot, vr, vx, vy, add(빛 섞기), delay, alpha, sx(가로 배율) }
function fxSpr(k, x, y, h, o = {}) {
  if (LOWFX && sprFx.length > 18) return;
  sprFx.push({ k, x, y, h, t: -(o.delay || 0), life: o.life || 0.4, from: o.from ?? 0.6, to: o.to ?? 1.2, rot: o.rot || 0, vr: o.vr || 0, vx: o.vx || 0, vy: o.vy || 0, add: o.add !== false, a: o.alpha ?? 1, sx: o.sx || 1, flip: !!o.flip });
}
function drawSprFx() {
  for (const f of sprFx) {
    if (f.t < 0) continue;
    const im = IMG['spr_' + f.k]; if (!im || !ready(im)) continue;
    const k = clamp(f.t / f.life, 0, 1), sc = lerp(f.from, f.to, 1 - Math.pow(1 - k, 3));
    const a = f.a * (k < 0.12 ? k / 0.12 : 1 - Math.pow(Math.max(0, (k - 0.45) / 0.55), 1.6));
    const h = f.h * sc, w = (h * im.naturalWidth) / im.naturalHeight * f.sx;
    ctx.save(); if (f.add) ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(f.x, f.y); ctx.rotate(f.rot); if (f.flip) ctx.scale(-1, 1);
    ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
  }
}
function juiceRealtime(dt) {
  for (const f of sprFx) { f.t += dt; if (f.t > 0) { f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; } }
  for (let i = sprFx.length - 1; i >= 0; i--) if (sprFx[i].t > sprFx[i].life) sprFx.splice(i, 1);
  for (const s of shards) { s.t += dt; s.vy += 1620 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt; }
  for (let i = shards.length - 1; i >= 0; i--) if (shards[i].t > shards[i].life) shards.splice(i, 1);
  for (const n of hitNums) { const age = T - n.t0; if (age > 0) { n.vy += 1150 * dt; n.vx *= Math.pow(0.96, dt * 60); n.x += n.vx * dt; n.y = Math.max(140, n.y + n.vy * dt); } }
  for (let i = hitNums.length - 1; i >= 0; i--) if (T - hitNums[i].t0 > hitNums[i].life) hitNums.splice(i, 1);
  for (const s of hitStars) s.t += dt;
  for (let i = hitStars.length - 1; i >= 0; i--) if (hitStars[i].t > 0.26) hitStars.splice(i, 1);
  if (taunt) { taunt.t += dt; if (taunt.t > taunt.dur) taunt = null; }
}
// 판 시간으로 움직이는 것(용수철) — 멈칫 동안은 굳음
function juiceUpdate(dt) {
  if (!G) return;
  for (const e of G.enemies) if (e.kvx || e.sq) springs(e, dt);
  if (G.boss) { springs(G.boss, dt); const b = G.boss; if (b.hpShow == null) b.hpShow = b.hp; if (T > (b.chipAt || 0)) b.hpShow += (b.hp - b.hpShow) * (1 - Math.pow(0.86, dt * 60)); }
  if (G.run) updateBeat(dt);
}
function drawJuiceWorld() { // 조각·충격 별 (세계 좌표)
  for (const s of shards) {
    const a = 1 - Math.max(0, (s.t - s.life * 0.7) / (s.life * 0.3));
    ctx.save(); ctx.globalAlpha = a; ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    ctx.drawImage(s.im, s.sx, s.sy, s.sw, s.sh, -s.dw / 2, -s.dh / 2, s.dw, s.dh);
    if (s.t < s.life * 0.12) { const w = silhouette(s.key, '#ffffff'); if (w) ctx.drawImage(w, s.sx, s.sy, s.sw, s.sh, -s.dw / 2, -s.dh / 2, s.dw, s.dh); }
    ctx.restore();
  }
  for (const s of hitStars) {
    const k = s.t / 0.26, R = (s.crit ? 74 : s.big ? 52 : 34) * (0.6 + 0.4 * k), n = s.crit ? 12 : 9;
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.globalAlpha = 1 - k;
    ctx.fillStyle = s.crit ? '#ffe36b' : '#ffffff'; ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? R * 0.38 : R; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    if (s.crit && k < 0.7) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6 * (1 - k); ctx.beginPath(); ctx.moveTo(-90, 60); ctx.lineTo(90, -60); ctx.stroke(); }
    ctx.restore();
  }
}
function drawHitNums() {
  for (const n of hitNums) {
    const age = T - n.popT, life = T - n.t0;
    const s = age < 0.09 ? 2 - age / 0.09 : age < 0.16 ? 1 + Math.sin(((age - 0.09) / 0.07) * Math.PI) * 0.12 : 1;
    const a = Math.min(1, (n.life - life) / 0.3);
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(n.x, n.y); ctx.scale(s, s); if (n.crit) ctx.rotate(-0.1);
    const v = String(Math.round(n.val));
    if (n.crit) { text('크리티컬!', 0, -26, 14, '#ffffff', { lw: 4 }); text(v, 0, 0, 31, '#ffb13b', { stroke: '#5a1a00', lw: 7 }); }
    else text(v, 0, 0, n.val >= 10 ? 25 : 19, '#ffffff', { stroke: 'rgba(120,10,30,.85)', lw: 6 });
    ctx.restore();
  }
}

// ───────── ③ 보스: 등장·체력바·도발 ─────────
const TAUNTS = { jelly: ['찌릿찌릿~ 감전되고 싶니?', '번쩍! 눈 감아도 소용없어~'], crab: ['집게 맛 좀 볼래?', '내 모래성에서 나가!'], shark: ['크하하! 그 정도야?', '느림보 거북이 주제에!'], octopus: ['먹물 맛 좀 봐라~', '키득키득, 못 피하지?'], angler: ['깜깜하지? 키키키', '반짝이는 건 다 내 거야~'], king: ['공주는 내 거다! 크하하!', '여기까지 온 걸 후회하게 해 주마!'] };
let taunt = null, lastTauntAt = -99;
function bossTaunt(force = false) {
  const b = G && G.boss; if (!b || b.dead || REDUCE) return;
  if (!force && T - lastTauntAt < 4) return;
  if (!['idle', 'lurk', 'enter', 'retreat', 'knock'].includes(b.st)) { later(500, () => bossTaunt(force)); return; } // 돌진 준비·돌진 중엔 화면을 가리지 않게 미룸
  lastTauntAt = T;
  const lines = TAUNTS[b.def.king ? 'king' : b.kind] || TAUNTS.shark;
  taunt = { t: 0, dur: 1.25, line: pick(lines), key: 'spr_' + BOSS_SPR[G.cfg.boss], king: !!b.def.king };
  snd('laugh_' + (b.def.king ? 'king' : b.kind), 0.9);
  duckMusic(1.2);
  haptic([12, 70, 12]);
}
function drawTaunt() {
  if (!taunt) return;
  const k = taunt.t / taunt.dur, im = IMG[taunt.key];
  const inK = Math.min(1, k / 0.18), outK = k > 0.82 ? (k - 0.82) / 0.18 : 0;
  ctx.save();
  ctx.fillStyle = `rgba(10,0,20,${0.32 * (1 - outK) * inK})`; ctx.fillRect(0, 0, W, H);
  const cx = W * 0.7, cy = H * 0.5;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22 * (1 - outK);
  ctx.fillStyle = taunt.king ? '#ff4d6a' : '#ffd54a';
  for (let i = 0; i < 12; i++) { const a = T / 0.7 + (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - 0.08) * 700, cy + Math.sin(a - 0.08) * 700); ctx.lineTo(cx + Math.cos(a + 0.08) * 700, cy + Math.sin(a + 0.08) * 700); ctx.fill(); }
  ctx.restore();
  if (ready(im)) {
    const s = (0.4 + 0.6 * (1 - Math.pow(1 - inK, 3))) * (1 - outK * 0.15), h = H * 0.62 * s;
    ctx.save(); ctx.globalAlpha = 1 - outK; ctx.translate(cx + rand(-3, 3), cy + 20); ctx.rotate(Math.sin(T / 0.09) * 0.06); ctx.scale(1 + Math.sin(T / 0.055) * 0.06, 1 - Math.sin(T / 0.055) * 0.06);
    drawImg(im, 0, 0, h); ctx.restore();
    // 말풍선 + ㅋㅋ
    ctx.save(); ctx.globalAlpha = (1 - outK) * inK;
    const bx = cx - h * 0.55, by = cy - h * 0.42;
    if (!drawImg(IMG.x_taunt_bubble, bx, by, 150)) { ctx.fillStyle = '#fff'; rr(bx - 90, by - 40, 180, 80, 30); ctx.fill(); }
    wrapText(taunt.line, 120, 17, false).slice(0, 2).forEach((l, i, a) => text(l, bx, by - 8 + (i - (a.length - 1) / 2) * 22, 17, '#3a1020', { stroke: false }));
    drawImg(IMG.x_fx_ha, cx + h * 0.32, cy - h * 0.38 + Math.sin(T * 14) * 6, 74, Math.sin(T * 9) * 0.2);
    ctx.restore();
  }
  ctx.restore();
}
// 체력바: 잔상(흰) → 빨강 그라데이션, 10칸, 30% 아래 맥동, 맞으면 떨림, 왼쪽 얼굴
function drawBossBar(b) {
  // 왼쪽 기운 막대(+방패·난이도 표시) 끝과 오른쪽 점수 칸 사이에 14씩 띄워 넣음, 가운데 높이는 첫 줄(30)
  const left = 22 + SAFE + 272 + (G.shield || 0) * 28 + (save.diff !== 1 ? 56 : 0) + 14 + 30, right = W - SAFE - 78 - 200 - 14;
  const w = Math.min(520, right - left), x = left + Math.max(0, (right - left - w) / 2), y = 19, h = 22;
  const jolt = T - (b.barT || -9) < 0.24 ? 5 * (1 - (T - b.barT) / 0.24) : 0, jx = jolt ? rand(-jolt, jolt) : 0, jy = jolt ? rand(-jolt, jolt) * 0.5 : 0;
  ctx.save(); ctx.translate(jx, jy);
  ctx.fillStyle = 'rgba(8,10,30,.82)'; rr(x, y, w, h, 10); ctx.fill();
  const show = clamp(b.hpShow == null ? b.hp : b.hpShow, 0, b.maxHp) / b.maxHp, cur = clamp(b.hp, 0, b.maxHp) / b.maxHp;
  if (show > cur) { ctx.fillStyle = '#ffffff'; rr(x + 2, y + 2, Math.max(8, (w - 4) * show), h - 4, 8); ctx.fill(); }
  const low = cur < 0.3, g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, low ? '#ff8a8a' : '#ff6b6b'); g.addColorStop(0.5, '#f0384f'); g.addColorStop(1, '#a3122a');
  ctx.fillStyle = g; if (cur > 0) { rr(x + 2, y + 2, Math.max(8, (w - 4) * cur), h - 4, 8); ctx.fill(); }
  if (low) { ctx.fillStyle = `rgba(255,255,255,${0.12 + 0.12 * Math.sin(T / 0.09)})`; rr(x + 2, y + 2, (w - 4) * cur, h - 4, 8); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.25)'; rr(x + 4, y + 3, Math.max(0, (w - 8) * cur), h * 0.32, 6); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 1; i < 10; i++) ctx.fillRect(x + (w * i) / 10 - 1, y + 3, 2, h - 6);
  ctx.strokeStyle = b.def.king ? '#ffd23d' : '#ffffff'; ctx.lineWidth = 3; rr(x, y, w, h, 10); ctx.stroke();
  // 얼굴
  ctx.fillStyle = '#1b1c1f'; ctx.beginPath(); ctx.arc(x - 6, y + h / 2, 24, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = b.def.king ? '#ffd23d' : '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(x - 6, y + h / 2, 22, 0, Math.PI * 2); ctx.clip(); drawImg(IMG['spr_' + BOSS_SPR[G.cfg.boss]], x - 2, y + h / 2 + 6, 52); ctx.restore();
  text(b.def.name, x + 24, y + h + 13, 14, '#ffd1d8', { align: 'left', body: true });
  text(`${Math.ceil(Math.max(0, b.hp))} / ${b.maxHp}`, x + w - 4, y + h + 13, 13, '#ffffff', { align: 'right', body: true });
  ctx.restore();
}
// 보스가 맞을 때 공통(잔상·떨림·구간 넉백)
function bossHitFx(b, dmg, crit) {
  b.chipAt = T + 0.38; b.barT = T;
  hitReact(b, crit ? 1.7 : 0.75, 1);
  for (const m of [0.75, 0.5, 0.25]) {
    b.marks = b.marks || {};
    if (!b.marks[m] && b.hp > 0 && b.hp / b.maxHp < m) {
      b.marks[m] = true; b.kvx += 28 * 60; b.x += 40; b.cd = (b.cd || 0) + 0.6;
      pop(b.x - 40, b.y - 110, '아야!!', '#ffffff', 46, true); speed(b.x, b.y);
      if (ac) sfx.bossHit();
      later(350, () => bossTaunt());
    }
  }
}
const speed = (x, y) => burstRays(x, y, '#ffffff', 0.5, 10);
// 큰 적 등장: 경고 동안 그림자가 커지고 땅이 울림 → 떨어짐 → 쿵
function drawBossShadowWarn() {
  if (!(G.bossWarnT > 0) || G.boss) return;
  const k = 1 - G.bossWarnT / 2.4, x = BOSS_HOME();
  ctx.fillStyle = `rgba(0,5,20,${0.15 + 0.3 * k})`;
  ctx.beginPath(); ctx.ellipse(x, GROUND + 4, 40 + 110 * k, 10 + 14 * k, 0, 0, Math.PI * 2); ctx.fill();
  shake = Math.max(shake, 1.5 + 6 * k);
}
function drawHazardBands(title, sub) {
  for (const [yy, dir] of [[150, 1], [H - 168, -1]]) { // 위 HUD·아래 단추를 가리지 않는 높이
    ctx.save(); ctx.translate(W / 2, yy + 20); ctx.rotate(0.06 * dir); ctx.translate(-W / 2, -20);
    ctx.beginPath(); ctx.rect(-40, 0, W + 80, 40); ctx.clip();
    ctx.fillStyle = '#ffd23d'; ctx.fillRect(-40, 0, W + 80, 40);
    ctx.fillStyle = '#1b1c1f';
    const off = ((T * 160 * dir) % 56 + 56) % 56;
    for (let x = -120 + off; x < W + 120; x += 56) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 28, 0); ctx.lineTo(x + 6, 40); ctx.lineTo(x - 22, 40); ctx.fill(); }
    ctx.restore();
  }
  const s = 1 + Math.sin(T * 14) * 0.04;
  ctx.save(); ctx.translate(W / 2, H / 2 - 30); ctx.scale(s, s); text(title, 0, 0, 50, '#ff3b4e', { stroke: '#ffffff', lw: 9 }); ctx.restore();
  if (sub) text(sub, W / 2, H / 2 + 24, 24, '#ffffff', { lw: 6 });
}
function bossLand(b) {
  freeze = Math.max(freeze, 0.12); shake = Math.max(shake, b.def.king ? 26 : 22); zoomTo(1.07);
  ring(b.x, GROUND, '#ffffff', 340, 0.5, 12); ring(b.x, GROUND, '#ff9ac0', 260, 0.45, 8);
  for (let i = 0; i < 40; i++) fx.push({ k: 'spark', x: b.x + rand(-120, 120), y: GROUND - rand(0, 10), vx: rand(-420, 420), vy: rand(-380, -60), life: rand(0.4, 0.8), max: 0.8, size: rand(3, 6), color: '#e9d9a8' });
  b.sq = 0.4;
  snd('thud', 1); snd('roar', 0.9, 1, 0, 0.32); haptic([30, 40, 30, 40, 60]); // 쿵 먼저 → 땅이 울린 뒤 포효(같이 내면 뭉개짐)
  edgeFlash('#ff3355', 0.5);
  later(450, () => bossTaunt(true));
  later(1700, () => G && G.boss && coachOnce('boss', { text: `${b.def.name}이 나타났어요!`, sub: '머리를 밟거나 질주로 들이받아요 · 공격 전 띠 글자(↑ 뛰어요 / ↓ 숙여요)를 봐요', spot: { x: b.x - 20, y: b.y, r: 120 }, state: 'play' }));
}

// ───────── ④ 박자 ─────────
// 음악이 지금 몇 초 지점인지 → 박 위치. 파일 음악은 시작 시각·반복 구간으로, 합성 음악은 첫 음 시각으로
function beatClock() {
  const m = (typeof AUDIO_META !== 'undefined' && AUDIO_META['bgm_' + trackName]) || {};
  let bpm = m.bpm || (curTrack ? curTrack.bpm : 120), b0 = m.beat0 || 0, pos;
  const lat = ac ? (ac.outputLatency || ac.baseLatency || 0) : 0;
  if (ac && bgmSrc && bgmName === trackName && bgmStartAt != null) {
    pos = bgmStartOff + (ac.currentTime - lat - bgmStartAt);
    if (m.loopEnd && pos > m.loopEnd) { const L = m.loopEnd - (m.loopStart || 0); pos = (m.loopStart || 0) + ((pos - (m.loopStart || 0)) % L); }
  } else if (ac && synthT0 != null && curTrack) { bpm = curTrack.bpm; b0 = 0; pos = ac.currentTime - lat - synthT0; }
  else { b0 = 0; pos = T; }
  const len = 60 / bpm, x = (pos - b0) / len;
  return { len, phase: x - Math.floor(x), idx: Math.floor(x) };
}
const BEAT_OK = () => 0.08 + abStar('beat') * 0.025, BEAT_GOOD = 0.16;
function beatJudge() {
  const b = beatClock(), err = Math.min(b.phase, 1 - b.phase) * b.len;
  const p = G.p;
  if (err <= BEAT_OK()) {
    G.beatCombo = (G.beatCombo || 0) + 1; G.beatBest = Math.max(G.beatBest || 0, G.beatCombo); G.beats = (G.beats || 0) + 1;
    const c = G.beatCombo;
    pop(p.x, p.y - 92, c >= 2 ? `박자 딱! ×${c}` : '박자 딱!', '#ffe36b', 22);
    ring(p.x, p.y, '#ffe36b', 70, 0.3, 5);
    const rate = comboRate(c);
    snd('beat', 0.25, rate, 0.2); // 박자 딱: 아주 작게(잦은 소리)
    addBoost(4 * (1 + abStar('ult') * 0.25));
    if (G.feverT <= 0) G.fever = Math.min(100, G.fever + 3);
    runXp(2);
    if (c % 5 === 0) { earn('beat', 1 + abStar('beat')); pop(p.x, p.y - 120, `박자 ${c}연속! 진주 +${1 + abStar('beat')}`, C.yellow, 24, true); }
    const R = { 4: 0, 8: 1, 12: 2, 20: 3, 30: 4 };
    if (R[c] != null) reaction(R[c], `박자 ${c}연속 ${REACT_WORDS[R[c]][0]}`);
    return 'perfect';
  }
  if (err <= BEAT_GOOD) { G.beatCombo = G.beatCombo || 0; addBoost(1.5); return 'good'; } // 좋아: 연속은 유지
  G.beatCombo = 0;
  return 'miss';
}
const PENTA = [0, 2, 4, 7, 9];
const comboRate = (c) => { const i = Math.max(0, Math.min(10, c) - 1); return Math.pow(2, (12 * Math.floor(i / 5) + PENTA[i % 5]) / 12); };
function updateBeat() {
  const b = beatClock();
  if (b.idx !== G.lastBeat) { G.lastBeat = b.idx; G.beatPulse = T; }
}
// 박자 고리: 서 있을 때 거북이 둘레에서 박마다 닫힘(맞을 창 안이면 금색)
function drawBeatRing() {
  const p = G.p; if (p.dead || !p.onG || G.won || G.enterT > 0) return;
  const b = beatClock(), toNext = 1 - b.phase, near = Math.min(b.phase, 1 - b.phase) * b.len <= BEAT_OK();
  const r = 40 + 46 * toNext;
  ctx.save();
  ctx.globalAlpha = near ? 0.85 : 0.28;
  ctx.strokeStyle = near ? '#ffd54a' : '#ffffff'; ctx.lineWidth = near ? 4 : 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
// 코스를 박에 맞춰 놓기: 「이상적으로 누를 때」가 박에 오도록 패턴 전체를 살짝 뒤로 미룸
const PRESS_LEAD = { jump: 0.27, slide: 0.32 };
function snapToBeat(before) {
  if (G.tut || G.boosting > 0 || !G.run) return 0;
  if (G.warns.length > before.w) return 0; // 경고 뒤 돌진하는 적은 시간 기준이 따로라 빼고
  const p = G.p, spd = runSpd();
  let first = Infinity, kind = 'jump';
  for (let i = before.e; i < G.enemies.length; i++) { const e = G.enemies[i]; if (e.vx < -50) return 0; if (e.x < first) { first = e.x; kind = e.y < GROUND - 50 && e.y > GROUND - 100 ? 'slide' : 'jump'; } }
  for (let i = before.o; i < G.obs.length; i++) { const o = G.obs[i]; if (o.k === 'pillar' && o.x < first) { first = o.x; kind = 'slide'; } }
  for (let i = before.b; i < G.breaks.length; i++) if (G.breaks[i].x < first) { first = G.breaks[i].x; kind = 'jump'; }
  if (first === Infinity) return 0;
  const press = (first - p.x) / spd - PRESS_LEAD[kind], bc = beatClock();
  const tNext = (Math.ceil(bc.phase + press / bc.len) - bc.phase) * bc.len; // press 뒤 첫 박까지
  const shift = Math.max(0, tNext - press) * spd;
  if (shift <= 0 || shift > spd * bc.len) return 0;
  for (let i = before.e; i < G.enemies.length; i++) G.enemies[i].x += shift;
  for (let i = before.o; i < G.obs.length; i++) G.obs[i].x += shift;
  for (let i = before.b; i < G.breaks.length; i++) G.breaks[i].x += shift;
  for (let i = before.g; i < G.eggsArr.length; i++) G.eggsArr[i].x += shift;
  for (let i = before.x; i < G.boxes.length; i++) G.boxes[i].x += shift;
  return shift;
}

// ───────── ⑤ 필살 3단 ─────────
const BMAX = () => (G && G.run ? 300 : 100);
let cine = null;
function ultCine(lvl) {
  const targets = [];
  for (const e of G.enemies) if (!e.dead && e.x < W + 30 && e.x > -30) targets.push({ kind: 'e', o: e, x: e.x, y: e.y });
  for (const o of G.obs) if (!o.dead && o.k === 'pillar' && o.x < W + 30 && o.x + o.w > 0) targets.push({ kind: 'p', o, x: o.x + o.w / 2, y: o.y1 - 30 });
  for (const o of G.breaks) if (!o.dead && o.x < W + 30 && o.x > -30) targets.push({ kind: 'b', o, x: o.x, y: o.y });
  targets.sort((a, b) => a.x - b.x);
  const n = targets.length, total = 1.7 + n * 0.065 + 0.32;
  cine = { lvl, t0: performance.now(), targets, n };
  freeze = Math.max(freeze, total); // 세계는 멈추고 연출만
  duckMusic(total + 0.4);
  snd('react', 0.8); // 필살 시작: 짧은 「쾅」 하나(모으는 소리·상승음은 뺌)
  haptic([20, 40, 20, 40, 60]);
  const px = G.p.x, py = G.p.y, gold = lvl >= 3;
  fxSpr('fx_shock', px, py, 180, { life: 0.5, from: 0.2, to: 1.6, vr: 1.5 }); // 모으는 소용돌이
  later(500, () => {
    reaction(3, gold ? '그림자 거북 군단!!' : '그림자 거북 군단!'); burstRays(G.p.x, G.p.y, '#8b5cff', 1.2, 22);
    fxSpr('fx_shock', px, py, 200, { life: 0.55, from: 0.3, to: 1.6, vr: -1 });
    fxSpr('fx_burst', px, py, 160, { life: 0.45, from: 0.3, to: 1.4 });
  });
  later(1250, () => {
    flash = 0.45; flashColor = '#b48bff'; shake = 14; edgeFlash('#8b5cff', 0.8);
    if (gold) {
      reaction(4, '황금 터틀이 강림!!!'); burstRays(W / 2, H / 2, '#ffd54a', 2.2, 28); playSample('sfx_hatch', 1);
      fxSpr('fx_pillar', W / 2, H / 2, H * 1.25, { life: 1.9, from: 0.7, to: 1.05, sx: 1.6 }); // 하늘에서 내리는 황금 빛기둥
      [-1, 1].forEach((d) => fxSpr('fx_pillar', W / 2 + d * W * 0.3, H / 2, H * 1.1, { life: 1.2, from: 0.5, to: 1, delay: 0.18, alpha: 0.75 }));
      fxSpr('fx_shock', W / 2, H * 0.6, 260, { life: 0.6, from: 0.2, to: 2.2, vr: 0.8 });
    }
  });
  later(1700, () => {
    playSample('sfx_ult_slash', 1); later(320, () => playSample('sfx_ult_slash', 0.9, 1.15));
    // 화면을 가르는 큰 칼빛 세 줄(왼→오, 오→왼, 가운데 X)
    const sl = gold ? 'fx_slash_gold' : 'fx_slash';
    fxSpr(sl, W * 0.5, H * 0.42, H * 1.15, { life: 0.42, from: 0.7, to: 1.15, rot: -0.5, vx: 260 });
    fxSpr('fx_slash', W * 0.5, H * 0.58, H * 1.05, { life: 0.42, from: 0.7, to: 1.15, rot: 2.6, vx: -260, delay: 0.12 });
    fxSpr(sl, W * 0.5, H * 0.5, H * 1.25, { life: 0.5, from: 0.8, to: 1.25, rot: 0.9, flip: true, delay: 0.26 });
  });
  targets.forEach((tg, i) => later(1700 + i * 65, () => {
    const o = tg.o, rate = comboRate(i + 1) * (i >= 10 ? 2 : 1);
    snd('chain', 0.8, rate);
    burst(tg.x, tg.y, '#c9a2ff', 12, 420); ring(tg.x, tg.y, '#b48bff', 90, 0.35, 6);
    fxSpr(gold && i % 2 ? 'fx_slash_gold' : 'fx_slash', tg.x, tg.y, 150, { life: 0.3, from: 0.6, to: 1.3, rot: rand(-1.2, 1.2), flip: i % 2 === 1 });
    fxSpr('fx_burst', tg.x, tg.y, 110, { life: 0.32, from: 0.3, to: 1.2, rot: rand(0, 6) });
    shake = Math.max(shake, 3 + Math.min(8, i * 0.5));
    if (tg.kind === 'e' && !o.dead) { if (ENEMIES[o.type] && ENEMIES[o.type].hp >= 999) o.dead = true; else killEnemy(o, 'ult'); }
    else if (tg.kind === 'p' && !o.dead) smashPillar(o);
    else if (tg.kind === 'b' && !o.dead) smashBreak(o, true);
  }));
  later(1700 + n * 65 + 260, () => {
    snd('ult_impact', 1);
    // 마무리 한 방: 가운데 큰 폭발 + 충격파 두 겹 (+3단은 황금 X 칼빛과 빛기둥 줄)
    fxSpr('fx_burst', W / 2, H / 2, 380, { life: 0.6, from: 0.3, to: 1.5, rot: rand(0, 6) });
    fxSpr('fx_shock', W / 2, H / 2, 300, { life: 0.7, from: 0.2, to: 3.6, vr: 1.2 });
    fxSpr('fx_shock', W / 2, H / 2, 300, { life: 0.9, from: 0.1, to: 2.4, vr: -0.8, delay: 0.1, alpha: 0.8 });
    if (gold) {
      fxSpr('fx_slash_gold', W / 2, H / 2, H * 1.1, { life: 0.55, from: 0.8, to: 1.2, rot: 0.75 });
      fxSpr('fx_slash_gold', W / 2, H / 2, H * 1.1, { life: 0.55, from: 0.8, to: 1.2, rot: -0.75, flip: true });
      for (let i = 0; i < 5; i++) fxSpr('fx_pillar', W * (0.1 + i * 0.2), H / 2, H * 1.15, { life: 0.8, from: 0.4, to: 1, delay: i * 0.06, alpha: 0.8 });
    }
    flash = 0.45; flashColor = '#ffffff'; zoomTo(1.11); shake = 26; // 눈부시지 않게(0.95→0.45)
    fireworks(lvl >= 3 ? 8 : 4); confetti(lvl >= 3 ? 120 : 60);
    reaction(4, n ? `${n}마리 한 번에!!` : '바다가 조용해졌다!');
    const b = G.boss;
    if (b && !b.dead && b.st !== 'fall') { const d = Math.max(20, n * 6) * (lvl >= 3 ? 2 : 1); bossDamage(d); if (lvl >= 3) { later(250, () => G.boss && !G.boss.dead && bossDamage(10)); later(450, () => G.boss && !G.boss.dead && bossDamage(10)); } }
    if (lvl >= 3) { G.fever = 100; startFever(); }
    cine = null;
    G.boosting = boostDur(); G.p.inv = Math.max(G.p.inv, 0.5); // 마무리 뒤에 질주 시작
  });
}
function drawUltCine() {
  if (!cine) return;
  const t = (performance.now() - cine.t0) / 1000, total = 1.7 + cine.n * 0.065 + 0.3;
  const dk = Math.min(1, t / 0.3) * (t > total - 0.3 ? Math.max(0, (total - t) / 0.3) : 1);
  ctx.fillStyle = `rgba(6,2,20,${0.78 * dk})`; ctx.fillRect(-60, -60, W + 120, H + 120);
  // 2단: 가운데에 큰 그림자 거북 대장이 솟아오름(3단은 황금 터틀이가 그 자리)
  if (cine.lvl < 3 && t > 0.45 && t < 2.2) {
    const k = clamp((t - 0.45) / 0.5, 0, 1), out = t > 1.85 ? (2.2 - t) / 0.35 : 1, e = 1 - Math.pow(1 - k, 3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gy = lerp(H + 120, H * 0.5, e), g = ctx.createRadialGradient(W / 2, gy, 10, W / 2, gy, 230);
    g.addColorStop(0, `rgba(150,80,255,${0.5 * out})`); g.addColorStop(1, 'rgba(150,80,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, gy, 230, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    drawImg(IMG.spr_fx_shadow, W / 2, gy, 320 + Math.sin(T * 6) * 6, 0, 0.92 * out * k);
  }
  // 그림자 거북: 바닥에서 대상 위로 솟음
  const sil = silhouette('x_m06', '#1b0b3a');
  cine.targets.forEach((tg, i) => {
    const st = 0.38 + i * 0.055, k = clamp((t - st) / 0.65, 0, 1); if (k <= 0) return;
    const done = t > 1.7 + i * 0.065; if (done && t > 1.7 + i * 0.065 + 0.15) return;
    const e = 1 - Math.pow(1 - k, 3), x = tg.x - 34, y = lerp(GROUND + 30, tg.y - 40, e);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 4, x, y, 50); g.addColorStop(0, 'rgba(160,90,255,.55)'); g.addColorStop(1, 'rgba(160,90,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (!drawImg(IMG.spr_fx_shadow, x, y - 14, 128 + Math.sin(T * 14 + i) * 4)) { // 코덱스 그림: 보라 불꽃 두른 그림자 거북
      const rim = silhouette('x_m06', '#9b6bff');
      if (rim) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawImg(rim, x, y, 72, 0, 0.75); ctx.restore(); }
      if (sil) drawImg(sil, x, y, 64);
    }
  });
  drawSprFx(); // 칼빛·폭발은 그림자 위, 시스템 글 아래
  // 황금 터틀이
  if (cine.lvl >= 3 && t > 1.25) {
    const k = clamp((t - 1.25) / 1.8, 0, 1), bob = Math.abs(Math.sin(k * Math.PI * 3)) * 40 * (1 - k);
    ctx.save(); ctx.globalAlpha = k < 0.12 ? k / 0.12 : k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.translate(W / 2, H * 0.6 - bob); ctx.rotate(Math.sin(T / 0.12) * 0.08); drawImg(IMG.x_m10, 0, 0, 210); ctx.restore();
  }
  // 시스템 창(나 혼자만 레벨업 느낌의 파란 유리)
  if (t < 1.7) {
    const k = Math.min(1, t / 0.16), msg = cine.lvl >= 3 ? '[ 시스템 ] 황금 터틀이가 깨어납니다' : '[ 시스템 ] 그림자 거북들이 일어납니다';
    const sy = H - 150; // 큰 글자(위)와 안 겹치게 아래쪽
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = 'rgba(20,60,140,.55)'; rr(W / 2 - 230, sy, 460, 52, 12); ctx.fill();
    ctx.strokeStyle = '#7cc8ff'; ctx.lineWidth = 2; rr(W / 2 - 230, sy, 460, 52, 12); ctx.stroke();
    text(msg.slice(0, Math.floor(t / 0.022)), W / 2, sy + 26, 19, '#dff3ff', { stroke: false, body: true });
    ctx.restore();
  }
}

// ───────── ⑥ 판 안 레벨업 ─────────
const ABIL = [
  { k: 'jump', name: '높이 뛰기', desc: '점프가 6% 높아져요', icon: 'x_it_up', max: 3 },
  { k: 'stomp', name: '밟기 장인', desc: '밟으면 진주 +1, ★2부터 충격파', icon: 'x_sk_bomb', max: 3 },
  { k: 'magnet', name: '구슬 자석', desc: '구슬·진주를 더 멀리서 끌어와요', icon: 'x_sk_magnet', max: 3 },
  { k: 'ult', name: '필살 충전', desc: '필살 게이지가 25% 빨리 + 바로 30', icon: 'x_sk_ult', max: 3 },
  { k: 'beat', name: '박자 장인', desc: '박자 판정 +25ms, 박자 보상 진주 +1', icon: 'x_sk_combo', max: 3 },
  { k: 'gold', name: '황금 손', desc: '진주가 15% 더', icon: 'x_sk_gold', max: 3 },
  { k: 'slow', name: '느긋한 물살', desc: '이번 판 물살 4% 느리게', icon: 'e_snow', max: 3 },
  { k: 'triple', name: '공중 한 번 더', desc: '공중에서 한 번 더 뛰어요', icon: 'x_sk_chain', max: 1 },
  { k: 'heart', name: '기운 회복', desc: '기운 +25 (가득이면 최대 +25)', icon: 'heart', max: 9 },
  { k: 'shield', name: '거품 방패', desc: '한 번 막아 줘요', icon: 'x_it_bubble', max: 9 },
  { k: 'item', name: '아이템 받기', desc: '빈 칸에 아이템을 넣어 줘요', icon: 'e_gift', max: 9 },
];
const abStar = (k) => (G && G.ab ? G.ab[k] || 0 : 0);
const runNeed = () => 40 + 26 * (G.rlv || 1);
function runXp(v) {
  if (!G || !G.run || G.won || G.p.dead) return;
  G.rxp = (G.rxp || 0) + v;
  if (G.rxp >= runNeed()) { G.rxp -= runNeed(); G.rlv = (G.rlv || 1) + 1; G.lvPending = (G.lvPending || 0) + 1; }
}
function tryOpenLevelUp() {
  if (!G.lvPending || state !== 'play' || cine || G.won || G.p.dead || G.boosting > 0 || G.enterT > 0 || freeze > 0.05) return false;
  if (G.boss && G.boss.st === 'fall') return false;
  G.lvPending--;
  const pool = ABIL.filter((a) => abStar(a.k) < a.max && !(a.k === 'triple' && hasPerk('triple')));
  G.bless = shuffle(pool).slice(0, 3).map((a) => ({ ...a, lv: true, star: abStar(a.k) }));
  G.blessKind = 'lv'; state = 'bless';
  if (!playSample('sfx_lvup', 0.8)) sfx.levelup();
  say('levelup', true);
  haptic([20, 40, 20]);
  return true;
}
function applyAbility(a) {
  G.ab = G.ab || {}; G.ab[a.k] = (G.ab[a.k] || 0) + 1;
  switch (a.k) {
    case 'ult': addBoost(30); break;
    case 'slow': G.slowMul *= 0.96; break;
    case 'heart': if (G.en >= G.maxEn - 1) G.maxEn += HIT_E; G.en = Math.min(G.maxEn, G.en + HIT_E); G.enHealT = 0.6; break;
    case 'shield': G.shield++; break;
    case 'item': if (!G.item) G.item = rollItem(); else earn('bless', 10); break;
  }
}

// ───────── ⑦ 판 전 목표 카드 ─────────
let ready_ = null;
// 그림 미리 풀기: 처음 화면에 그릴 때 압축 풀기로 생기던 끊김(18번 바다 첫 판 최대 83ms) — 한 프레임에 6장씩 작은 판에 한 번 그려 둠
const warmed = new Set();
function warmStage(n) {
  const w = n === ENDLESS ? 1 : Math.floor((n - 1) / 10) + 1, st = STAGES[n] || {};
  const keys = ['spr_bg' + w, 'spr_castle' + w, ...Object.keys(ENEMIES).map((k) => 'spr_' + k), st.boss ? 'spr_' + BOSS_SPR[st.boss] : null,
    ...['fx_burst', 'fx_lightning', 'fx_pillar', 'fx_shadow', 'fx_shock', 'fx_slash', 'fx_slash_gold', 'fx_trail', 'fx_wave', 'goal_gate', 'it_rain', 'it_rocket', 'it_transform', 'ledge', 'pillar_body', 'pillar_tip', 'potion_b', 'potion_s', 'qblock', 'qblock_used', 'ui_pad_jump', 'ui_pad_slide', 'ui_slot', 'ui_pause'].map((k) => 'spr_' + k)]
    .filter((k) => k && IMG[k] && !warmed.has(k));
  const c = document.createElement('canvas'); c.width = c.height = 4; const g = c.getContext('2d');
  const step = () => { for (let i = 0; i < 6 && keys.length; i++) { const k = keys.shift(), im = IMG[k]; if (ready(im)) { g.drawImage(im, 0, 0, 4, 4); warmed.add(k); } } if (keys.length) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function openReady(n) {
  const w = typeof chapterFor === 'function' ? chapterFor(n) : null;
  if (w) { playStory(w, () => openReady(n)); return; } // 새 세계 첫 판: 장 이야기 먼저
  ready_ = { n, t: 0 }; state = 'ready'; sfx.click();
  warmStage(n); // 준비창이 떠 있는 동안 그 판 그림을 미리 풀어 둠(처음 그릴 때 버벅임 없애기)
}
// 이 바다의 특징(대표 패턴을 쉬운 말로) — 준비창 목표 칸 오른쪽
const FEAT = { ultWall: ['벽 판', '필살기로 벽을 부숴요'], climb: ['오르기 판', '발판을 밟고 위로!'], jarRow: ['항아리 판', '숙여서 와르르 깨요'], slideTunnel: ['낮은 굴', '숙인 채 끝까지'], kelpSteps: ['해초 계단', '세 칸 올라가요'], spikeRhythm: ['박자 가시', '하나 둘 셋 넷!'], lowCeil: ['낮은 천장', '톡 짧게 뛰어요'], duckJump: ['숙이고 뛰고', '번갈아 피해요'], jellyField: ['해파리 가시밭', '이단 점프 또는 밟기'], zigzag: ['지그재그 발판', '높게 낮게'], treasure: ['보물 판', '? 조개와 상자'], pearlWave: ['진주 물결', '신나게 줍기'], rockRow: ['바위 판', '밟아 부수기'], highRoad: ['높은 길', '위로 가면 황금 진주'], stairs: ['계단 발판', '위로 올라가요'], gauntlet: ['연속 피하기', '점프·숙이기·점프'], shortHop: ['기뢰 밭', '톡 짧게'], duckLong: ['긴 굴', '꾹 숙이기'], stomp: ['해파리 밟기', '위에서 쿵!'], chest: ['보물 상자', '부딪혀 열기'] };
function stageFeat(n) { const st = STAGE_STYLE[n]; if (!st) return null; if (st.wall) return FEAT.ultWall; const top = Object.entries(st.sig || {}).sort((a, b) => b[1] - a[1]).find(([k]) => FEAT[k]); return top ? FEAT[top[0]] : null; }
function drawReady() {
  const n = ready_.n, st = STAGES[n], endless = n === ENDLESS;
  ctx.fillStyle = 'rgba(16,16,18,.6)'; ctx.fillRect(-OX(), 0, W, H);
  withRise(0, () => {
    panel(200, 40, 560, 460, { fill: C.gray }); // 세로: 리본·이름·목표·별·기록·시작 아이템·출발(판 아래 30 여백)
    if (!ribbon(480, 50, 380, endless ? '끝없는 바다' : `${n}번 바다`, 26, true)) text(endless ? '끝없는 바다' : `${n}번 바다`, 480, 82, 30, C.yellow, { stroke: false }); // 시안: 빨간 리본
    text(st.name, 480, 116, 18, C.text, { stroke: false, body: true });
  });
  withRise(1, () => {
    const by = 128;
    ctx.fillStyle = 'rgba(255,255,255,.08)'; rr(232, by, 496, 90, 16); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1.5; rr(232, by, 496, 90, 16); ctx.stroke(); // 유리 판 안 밝은 칸
    if (!endless && st.boss) {
      drawImg(IMG['spr_' + BOSS_SPR[st.boss]], 300, by + 50, 88);
      text('목표', 360, by + 26, 14, C.sub, { align: 'left', body: true, stroke: false });
      text(`${BOSS_DEF[st.boss].name} 쓰러뜨리기`, 360, by + 54, 22, '#ffffff', { align: 'left', stroke: false });
      text('↑ 뛰고 ↓ 숙여 피하고, 위에서 밟기!', 360, by + 78, 13, C.sub, { align: 'left', body: true, stroke: false });
    } else if (!endless && st.fresh) {
      if (!drawImg(IMG['spr_' + st.fresh], 300, by + 50, 70)) drawEnemy({ type: st.fresh, x: 300, y: by + 50, r: 22, t: T, ph: 0, len: 40, baseY: by + 50, top: false, armed: false }, 520, by + 50); // 그림이 없는 몬스터(소용돌이 등)는 게임 속 모습으로
      text('새 몬스터', 360, by + 26, 14, C.sub, { align: 'left', body: true, stroke: false });
      text(`${ENEMIES[st.fresh].name} — ${ENEMIES[st.fresh].trait}`, 360, by + 54, 18, '#ffffff', { align: 'left', stroke: false });
      text(`약점: ${ITEMS[ENEMIES[st.fresh].weak].name}`, 360, by + 78, 14, C.yellow, { align: 'left', body: true, stroke: false });
    } else {
      icon('e_target', 300, by + 48, 54);
      text('목표', 360, by + 30, 14, C.sub, { align: 'left', body: true, stroke: false });
      text(endless ? '얼마나 멀리 갈 수 있을까?' : '끝까지 도착하기', 360, by + 58, 22, '#ffffff', { align: 'left', stroke: false });
    }
  });
  const ft = !endless && stageFeat(n); // 이 바다의 특징
  if (ft) withRise(1, () => { const by = 128; ctx.font = `800 ${fs(13)}px ${FONT}`; const fw = Math.max(ctx.measureText(ft[0]).width, ctx.measureText(ft[1]).width * 0.92) + 26; ctx.fillStyle = 'rgba(255,111,174,.2)'; rr(728 - 12 - fw, by + 14, fw, 62, 12); ctx.fill(); text(ft[0], 728 - 12 - fw / 2, by + 32, 13, '#ff9ccd', { stroke: false, weight: 800 }); text(ft[1], 728 - 12 - fw / 2, by + 56, 13, '#ffffff', { body: true, stroke: false }); });
  withRise(2, () => {
    const lab = ['도착', '진주 70%', '안 맞기'], got = save.stars[n] || 0;
    for (let i = 0; i < 3; i++) { const x = 330 + i * 150; drawStar(x, 252, 20, i < got); text(lab[i], x, 290, 14, i < got ? C.yellow : C.sub, { body: true, stroke: false }); } // 별과 글자 사이 띄움
  });
  withRise(3, () => {
    const best = endless ? `최고 ${save.endlessBest}미터` : save.best[n] ? `최고 기록 ${save.best[n]}%` : '처음 도전!';
    text(`${best} · 기운 ${maxEnergy()} · 거북 Lv ${save.lv}`, 480, 322, 15, C.text, { body: true, stroke: false });
  });
  withRise(4, () => {
    drawBoosterRow(232, 370);
    button(300, 412, 360, 58, '출발!', () => { const k = ready_.n; ready_ = null; startLevel(k); applyBoosters(); }, { size: 26, kind: 'yellow' }); // 시안: 큰 노란 출발 + 오른쪽 동그란 ✕
    roundBtn('close', 708, 441, 30, () => { ready_ = null; boostPick = {}; enterMap(); }, '지도로');
  });
}

// ───────── ⑧ 앱 거북알: 「알 합치기」와 같은 규칙 (turtle-app/api/src/games.ts) ─────────
// 하루(한국 날짜) 3판까지만 · 한 판 5~15개 = 5 + 점수/400 · 8초 넘은 판만 · 경품·환전 없음(꾸미기에만)
// 앱 주소(…turtle-buff.com)에서 로그인한 채 열리면 서버(/api/games/race/run)가 정함 — 서버에 race 등록은 맥미니 몫
const APP_EGG = { runs: 3, minMs: 8000, maxScore: 60000 };
const eggsFor = (score) => Math.max(5, Math.min(15, 5 + Math.floor(score / 400)));
const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
// 판 점수: 모은 진주·구슬·처치·밟기·박자·진행 + 성공·별·보스 (보통 실력 성공 ≈ 4000점 → 15개)
function runScore(cleared) {
  const stars = cleared && G.starGot ? G.starGot.filter(Boolean).length : 0;
  return Math.min(APP_EGG.maxScore, Math.round(G.eggsGot * 20 + (G.pearls || 0) * 2 + G.kills * 40 + (G.stomps || 0) * 30 + (G.beats || 0) * 15
    + Math.floor(progress() * 100) * 12 + (cleared ? 600 + stars * 300 + (G.cfg.boss ? 500 : 0) : 0)));
}
function appEggs(cleared) {
  const ms = Math.round(G.t * 1000), day = kstDay();
  G.appScore = runScore(cleared); // 앱 거북알 계산용 점수(서버 eggsFor 와 같은 기준) — 화면 점수(G.score)와 따로
  if (!save.appEgg || save.appEgg.day !== day) save.appEgg = { day, runs: 0, total: (save.appEgg && save.appEgg.total) || 0 };
  const a = save.appEgg;
  G.appEgg = { eggs: 0, runs: a.runs, max: APP_EGG.runs, short: ms < APP_EGG.minMs, server: false };
  if (ms < APP_EGG.minMs || a.runs >= APP_EGG.runs) return;
  const n = eggsFor(G.appScore);
  a.runs++; a.total += n; G.appEgg.eggs = n; G.appEgg.runs = a.runs;
  let tok = null; try { tok = localStorage.getItem('turtle.session'); } catch (e) { /* 개인 창 */ }
  if (tok && /(^|\.)turtle-buff\.com$/.test(location.hostname)) {
    G.appEgg.server = true; G.appEgg.pending = true;
    const ap = G.appEgg;
    fetch('/api/games/race/run', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}` },
      body: JSON.stringify({ score: G.appScore, ms: Math.min(ms, 400000), maxStage: G.n === ENDLESS ? 0 : G.n }) })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { ap.pending = false; if (j) { ap.eggs = j.eggs; ap.runs = j.rewardedToday; ap.balance = j.balance; } else ap.failed = true; })
      .catch(() => { ap.pending = false; ap.failed = true; });
  }
}
function drawAppEgg(x, y) {
  const a = G.appEgg; if (!a) return;
  ctx.fillStyle = 'rgba(16,16,18,.7)'; rr(x - 170, y - 18, 340, 36, 18); ctx.fill();
  drawImg(IMG.egg, x - 148, y, 26);
  let t;
  if (a.short) t = '너무 짧은 판은 거북알이 없어요';
  else if (!a.eggs) t = `오늘 거북알 ${a.max}판 다 받았어요 · 내일 또!`;
  else if (a.pending) t = `거북알 +${a.eggs} 받는 중…`;
  else t = a.server ? `거북알 +${a.eggs} · 오늘 ${a.runs}/${a.max}판` : `앱에서 하면 거북알 +${a.eggs} · 오늘 ${a.runs}/${a.max}`;
  text(t, x - 128, y + 1, 15, a.eggs ? C.yellow : C.sub, { align: 'left', body: true, stroke: false });
}
