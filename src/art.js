'use strict';
// 터틀 레이스 — 그림: 배경·주인공·적·알·성·화면 부품

// 세계마다 다른 바다 색, 같은 세계 안에서는 갈수록 깊어짐
function theme(n) {
  const wd = worldOf(n), p = wd.pal, t = n === ENDLESS ? 0.4 : ((n - 1) % 10) / 9;
  const sand = mix(p.sand[0], p.sand[1], t);
  return {
    world: wd.id, top: mix(p.top[0], p.top[1], t), bot: mix(p.bot[0], p.bot[1], t),
    sand, sandDark: mix(p.sand[0], '#000000', 0.25 + t * 0.2), weed: p.weed,
    rock: mix(p.rock[0], p.rock[1], t), rock2: mix(p.rock[0], p.rock[1], Math.min(1, t + 0.25)),
    ray: wd.id === 2 ? 0.03 : 0.16 * (1 - t) + 0.03, glow: wd.id === 2 || (wd.id === 1 && t > 0.6) || (wd.id === 3 && t > 0.5),
  };
}


// ───────── 그리기: 배경 ─────────
function drawBackground(n, d) {
  const th = theme(n);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, th.top); g.addColorStop(1, th.bot);
  ctx.fillStyle = g; ctx.fillRect(-30, -30, W + 60, H + 60);
  const bgi = IMG['spr_bg' + th.world];
  if (ready(bgi)) {
    const bh = H + 40, bw = bh * bgi.naturalWidth / bgi.naturalHeight, off = (d * 0.22) % (bw * 2);
    for (let x = -off, i = 0; x < W + bw; x += bw, i++) {
      ctx.save(); ctx.translate(x + bw / 2, H / 2); if (i % 2) ctx.scale(-1, 1); ctx.drawImage(bgi, -bw / 2, -bh / 2, bw, bh); ctx.restore();
    }
    const depth = n === ENDLESS ? 0.2 : ((n - 1) % 10) / 9;
    ctx.fillStyle = `rgba(4,10,30,${0.08 + depth * 0.32})`; ctx.fillRect(-30, -30, W + 60, H + 60); // 같은 세계 안에서 깊어질수록 어둡게
  }
  // 빛줄기
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = (((i * 233 - d * 0.04) % (W + 400)) + W + 400) % (W + 400) - 200;
    const a = th.ray * (0.55 + 0.45 * Math.sin(T * 0.6 + i * 1.7));
    const rg = ctx.createLinearGradient(0, 0, 0, H);
    rg.addColorStop(0, `rgba(220,250,255,${a})`); rg.addColorStop(1, 'rgba(220,250,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x + 70, -10); ctx.lineTo(x + 280, H); ctx.lineTo(x + 130, H); ctx.fill();
  }
  ctx.restore();
  // 먼 바위
  const ridge = (factor, base, amp, scale, color, alpha) => {
    ctx.fillStyle = color; ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.moveTo(-20, H);
    for (let x = -20; x <= W + 20; x += 12) ctx.lineTo(x, base - vnoise((x + d * factor) / scale) * amp - vnoise((x + d * factor) / (scale * 0.37)) * amp * 0.3);
    ctx.lineTo(W + 20, H); ctx.fill(); ctx.globalAlpha = 1;
  };
  if (!ready(bgi)) ridge(0.12, SEABED - 40, 170, 190, th.rock, 0.5);
  ridge(0.3, SEABED - 6, 90, 120, th.rock2, ready(bgi) ? 0.35 : 0.75);
  const painted = ready(bgi); // Codex 배경이면 코드로 그린 장식·해초·모래는 생략
  // 장식: 난파선(3·17), 열수구(24·26·얼음불꽃 후반), 얼음 기둥(얼음불꽃 초반)
  if (!painted && (n === 3 || n === 17)) {
    const tile = 1500, off = d * 0.22, i0 = Math.floor(off / tile);
    ctx.fillStyle = th.rock2; ctx.globalAlpha = 0.85;
    for (let i = i0; i <= i0 + 1; i++) {
      const sx = i * tile - off + 380, sy = SEABED - 20;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.12);
      ctx.beginPath(); ctx.moveTo(-170, -40); ctx.lineTo(150, -40); ctx.lineTo(110, 20); ctx.lineTo(-140, 20); ctx.closePath(); ctx.fill();
      ctx.fillRect(-20, -150, 9, 112); ctx.fillRect(60, -120, 7, 82);
      ctx.beginPath(); ctx.moveTo(-11, -146); ctx.lineTo(-11, -70); ctx.lineTo(-80, -80); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  if (!painted && th.world === 3 && n <= 23) {
    const tile = 260, off = d * 0.5, i0 = Math.floor(off / tile);
    for (let i = i0; i <= i0 + Math.ceil(W / tile) + 1; i++) {
      const x = i * tile - off + hash(i) * 90, h1 = 40 + hash(i * 3) * 70;
      ctx.fillStyle = 'rgba(220,245,255,.55)';
      ctx.beginPath(); ctx.moveTo(x - 14, -5); ctx.lineTo(x + 14, -5); ctx.lineTo(x, h1); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 40, SEABED + 6); ctx.lineTo(x + 58, SEABED + 6); ctx.lineTo(x + 49, SEABED - h1 * 0.7); ctx.fill();
    }
  }
  if (!painted && (n === 7 || n === 24 || n === 26 || (th.world === 3 && n >= 24))) {
    const tile = 430, off = d, i0 = Math.floor(off / tile);
    for (let i = i0; i <= i0 + 3; i++) {
      const vx = i * tile - off + 120 + hash(i) * 120;
      const glow = ctx.createRadialGradient(vx, SEABED - 10, 4, vx, SEABED - 10, 90);
      glow.addColorStop(0, `rgba(255,110,40,${0.55 + 0.2 * Math.sin(T * 5 + i)})`); glow.addColorStop(1, 'rgba(255,110,40,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(vx, SEABED - 10, 90, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.moveTo(vx - 22, SEABED + 6); ctx.lineTo(vx - 9, SEABED - 34); ctx.lineTo(vx + 9, SEABED - 34); ctx.lineTo(vx + 22, SEABED + 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,190,120,.5)';
      for (let k = 0; k < 4; k++) { const yy = SEABED - 40 - ((T * 70 + k * 40 + i * 13) % 160); ctx.beginPath(); ctx.arc(vx + Math.sin(T * 3 + k) * 6, yy, 3 + k % 2, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // 해초
  const tile = 105, off = d * 0.65, i0 = Math.floor(off / tile) - 1;
  for (let i = i0; i < i0 + W / tile + 3 && !painted; i++) {
    if (hash(i * 3.1) > 0.62) continue;
    const bx = i * tile - off + hash(i) * 60, hgt = 55 + hash(i * 7.7) * 100;
    ctx.strokeStyle = th.weed; ctx.lineCap = 'round';
    for (let s = 0; s < 3; s++) {
      ctx.lineWidth = 7 - s * 1.5;
      ctx.beginPath(); ctx.moveTo(bx + s * 9, SEABED + 6);
      for (let k = 1; k <= 6; k++) {
        const yy = SEABED + 6 - (hgt * (1 - s * 0.18)) * k / 6;
        ctx.lineTo(bx + s * 9 + Math.sin(T * 1.6 + i + k * 0.7 + s) * k * 2.6, yy);
      }
      ctx.stroke();
    }
  }
  // 모래 (그림 배경이면 얇게 바닥 선만)
  if (painted) { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(-20, SEABED + 8, W + 40, 3); }
  else {
  ctx.fillStyle = th.sand;
  ctx.beginPath(); ctx.moveTo(-20, H + 20);
  for (let x = -20; x <= W + 20; x += 10) ctx.lineTo(x, SEABED + 4 - vnoise((x + d) / 70) * 10);
  ctx.lineTo(W + 20, H + 20); ctx.fill();
  ctx.fillStyle = th.sandDark;
  const pt = 46, po = d % pt;
  for (let x = -po; x < W + pt; x += pt) {
    const idx = Math.floor((x + d) / pt);
    ctx.beginPath(); ctx.ellipse(x + hash(idx) * 30, SEABED + 18 + hash(idx * 2.3) * 22, 4 + hash(idx * 5.1) * 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  }
  // 물방울·플랑크톤
  for (const b of bubbles) {
    if (th.glow) { ctx.fillStyle = `rgba(120,255,230,${0.35 + 0.3 * Math.sin(b.ph)})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.7, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(b.x + Math.sin(b.ph) * 3, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); }
  }
  // 수면 물결
  ctx.strokeStyle = `rgba(255,255,255,${th.ray * 1.4 + 0.04})`; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 8 + Math.sin(x / 40 + T * 2) * 3);
  ctx.stroke();
}

// ───────── 그리기: 캐릭터·적 ─────────
function playerImg(k = save.skin) { return IMG[(save.face === 'lash' ? 'skinf_' : 'skin_') + k] || IMG.skin_basic; }
function drawTurtle(x, y, h, rot, alpha = 1) {
  const im = playerImg();
  if (!drawImg(ready(im) ? im : null, x, y, h, rot, alpha)) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#d29a4a'; ctx.beginPath(); ctx.ellipse(-6, 6, 28, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8fd16a'; ctx.beginPath(); ctx.arc(18, -12, 16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
// 게임 속 거북이: 앱 캐릭터 색감 그대로, 오른쪽(앞)을 보고 헤엄치는 옆모습
const SKIN_STYLE = {
  basic: { hat: 'cap', color: '#2f6fe0' },
  raincoat: { hat: 'rain', color: '#ffcf2e' },
  chef: { hat: 'chef' },
  barista: { hat: 'cap', color: '#2e7d4f' },
  delivery: { hat: 'cap', color: '#9a6430', box: true },
  cape14: { hat: 'cap', color: '#2f6fe0', cape: '#2552d8' },
  suit: { hat: 'none', tie: '#d8283c' },
  crown7: { hat: 'crown' },
};
function limb(x, y, ang, len, w, c) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = c;
  ctx.beginPath(); ctx.ellipse(len * 0.45, 0, len * 0.6, w, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawSwimmer(x, y, s, rot, o = {}) {
  const st = SKIN_STYLE[o.skin || save.skin] || SKIN_STYLE.basic;
  const gh = o.ghost, col = (c) => gh || c;
  const ph = o.ph || 0, boost = !!o.boost, face = o.face || 'normal';
  const look = o.look || { x: 1, y: 0 }, stretch = o.stretch || 1;
  ctx.save();
  ctx.translate(x, y); if (o.flip) ctx.scale(-1, 1); ctx.rotate(rot); ctx.scale(s * stretch, s / stretch);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  const stroke = boost ? 2.6 : 1.3 + Math.sin(ph) * 0.8;   // 앞발 젓기
  const kick = boost ? 2.9 : 2.3 + Math.sin(ph + 1.6) * 0.45; // 뒷발 차기
  // 망토 (맨 뒤에서 펄럭)
  if (st.cape) {
    const w1 = Math.sin(ph * 0.6) * 6, w2 = Math.sin(ph * 0.6 + 1.7) * 9;
    ctx.fillStyle = col(st.cape);
    ctx.beginPath(); ctx.moveTo(18, -16);
    ctx.quadraticCurveTo(-18, -36 + w1, -56, -22 + w2);
    ctx.quadraticCurveTo(-40, -6 + w1, -8, -2); ctx.closePath(); ctx.fill();
  }
  limb(-22, 10, kick, 18, 7, col('#62a83b'));          // 뒷발(먼 쪽)
  limb(12, 6, stroke + 0.5, 25, 8, col('#5b9c36'));     // 앞발(먼 쪽)
  ctx.fillStyle = col('#7cc24e');                       // 꼬리
  ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(-46, 5 + Math.sin(ph) * 2); ctx.lineTo(-32, 9); ctx.fill();
  // 배딱지
  ctx.fillStyle = col('#f2d99a');
  ctx.beginPath(); ctx.ellipse(0, 8, 31, 13, 0, 0, Math.PI * 2); ctx.fill();
  // 등껍질
  if (gh) ctx.fillStyle = gh;
  else {
    const g = ctx.createRadialGradient(-12, -16, 3, -4, -4, 36);
    g.addColorStop(0, '#ffdb8c'); g.addColorStop(0.6, '#e9a94f'); g.addColorStop(1, '#bf7f35');
    ctx.fillStyle = g;
  }
  ctx.beginPath(); ctx.ellipse(-4, -4, 32, 22, -0.06, 0, Math.PI * 2); ctx.fill();
  if (!gh) {
    ctx.strokeStyle = 'rgba(140,80,25,.45)'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    [[-4, -10, 8], [-20, -3, 7], [12, -3, 7]].forEach(([hx, hy, hr]) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(hx + Math.cos(a) * hr, hy + Math.sin(a) * hr * 0.8); }
      ctx.closePath(); ctx.stroke();
    });
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.ellipse(-14, -16, 9, 4, -0.4, 0, Math.PI * 2); ctx.fill();
  }
  // 택배 상자
  if (st.box) {
    ctx.fillStyle = col('#c8935a'); ctx.fillRect(-18, -38, 22, 16);
    if (!gh) { ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; ctx.strokeRect(-18, -38, 22, 16); ctx.beginPath(); ctx.moveTo(-7, -38); ctx.lineTo(-7, -22); ctx.stroke(); }
  }
  // 목·머리
  ctx.fillStyle = col('#86c95a');
  ctx.beginPath(); ctx.ellipse(22, -4, 12, 9, -0.3, 0, Math.PI * 2); ctx.fill();
  limb(15, 13, stroke, 27, 9, col('#7cc24e'));          // 앞발(가까운 쪽)
  if (st.tie) {
    ctx.fillStyle = col(st.tie);
    ctx.beginPath(); ctx.moveTo(22, 2); ctx.lineTo(27, 4); ctx.lineTo(23, 18); ctx.lineTo(18, 6); ctx.fill();
  }
  ctx.save(); ctx.translate(30, -6); ctx.scale(1.32, 1.32); ctx.translate(-30, -6);
  if (gh) ctx.fillStyle = gh;
  else {
    const hg = ctx.createRadialGradient(31, -19, 2, 36, -12, 19);
    hg.addColorStop(0, '#c2ec8e'); hg.addColorStop(1, '#6eb544');
    ctx.fillStyle = hg;
  }
  ctx.beginPath(); ctx.arc(36, -12, 17, 0, Math.PI * 2); ctx.fill();
  if (!gh) {
    // 얼굴
    const ex = 41, ey = -15, lx = clamp(look.x, -1, 1) * 1.8, ly = clamp(look.y, -1, 1) * 2;
    if (face === 'dead') {
      ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey + 5); ctx.moveTo(ex + 5, ey - 5); ctx.lineTo(ex - 5, ey + 5); ctx.stroke();
    } else if (face === 'ouch') {
      ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 4, ey); ctx.lineTo(ex - 5, ey + 5); ctx.stroke();
    } else if (o.blink) {
      ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ex, ey, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else {
      const big = face === 'scared' ? 1.18 : 1;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 6.6 * big, 7.6 * big, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b1d14'; ctx.beginPath(); ctx.arc(ex + lx, ey + ly, face === 'scared' ? 3.4 : 4.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + lx + 1.7, ey + ly - 2, 1.7, 0, Math.PI * 2); ctx.fill();
    }
    if (face === 'boost') {
      ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(34, -26); ctx.lineTo(47, -21); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,120,140,.55)'; ctx.beginPath(); ctx.ellipse(45, -4, 4.2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    // 입
    ctx.strokeStyle = '#5a2a1a'; ctx.fillStyle = '#c8404f'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    if (face === 'happy' || face === 'boost') {
      ctx.beginPath(); ctx.moveTo(43, -6); ctx.quadraticCurveTo(48, 4, 53, -7); ctx.closePath(); ctx.fill();
    } else if (face === 'scared' || face === 'dead' || face === 'ouch') {
      ctx.beginPath(); ctx.ellipse(49, -4, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(48, -8, 4.5, 0.15 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    }
  }
  // 모자
  const hat = st.hat;
  if (hat === 'cap' || hat === 'rain') {
    ctx.fillStyle = col(st.color);
    ctx.beginPath(); ctx.ellipse(35, -22, 16, 11, -0.1, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col(hat === 'rain' ? st.color : mix(st.color, '#000000', 0.25));
    if (hat === 'cap') { ctx.beginPath(); ctx.ellipse(50, -22, 11, 3.4, 0.1, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(35, -22, 24, 4, -0.1, 0, Math.PI * 2); ctx.fill(); }
    if (!gh) { ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(30, -28, 6, 3, -0.3, 0, Math.PI * 2); ctx.fill(); }
  } else if (hat === 'chef') {
    ctx.fillStyle = col('#ffffff');
    ctx.fillRect(25, -34, 20, 10);
    [[27, -38, 7], [35, -42, 8], [43, -38, 7]].forEach(([cx, cy, r]) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); });
  } else if (hat === 'crown') {
    ctx.fillStyle = col('#ffcf3a');
    ctx.beginPath(); ctx.moveTo(24, -24); ctx.lineTo(25, -40); ctx.lineTo(31, -31); ctx.lineTo(36, -44); ctx.lineTo(41, -31); ctx.lineTo(47, -40); ctx.lineTo(47, -24); ctx.closePath(); ctx.fill();
    if (!gh) { ctx.fillStyle = '#ff3b6b'; ctx.beginPath(); ctx.arc(36, -29, 2.6, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  ctx.restore();
}
function drawShark(x, y, s, c1, c2, angry, hurt, crown, tail = 0, mouth = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const body = ctx.createLinearGradient(0, -22, 0, 22);
  body.addColorStop(0, hurt ? '#ffffff' : c1); body.addColorStop(1, hurt ? '#ffd0d0' : c2);
  ctx.fillStyle = hurt ? '#fff' : c2;
  ctx.save(); ctx.translate(38, 0); ctx.rotate(tail);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(28, -24); ctx.lineTo(19, 0); ctx.lineTo(28, 21); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(-2, -17); ctx.lineTo(14, -42); ctx.lineTo(22, -15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(0, 0, 47, 21, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#eef5fa';
  ctx.beginPath(); ctx.ellipse(-8, 8, 34, 9, 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hurt ? '#fff' : c2;
  ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(8, 27); ctx.lineTo(12, 9); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-18 + i * 5, -6); ctx.lineTo(-20 + i * 5, 6); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-31, -6, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = angry ? '#d4002a' : '#111'; ctx.beginPath(); ctx.arc(-32, -6, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1b2633'; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(-38, -14); ctx.lineTo(-25, -10); ctx.stroke();
  const jaw = mouth * 13;
  ctx.fillStyle = '#5a1020';
  ctx.beginPath(); ctx.moveTo(-48, 2); ctx.lineTo(-20, 5); ctx.quadraticCurveTo(-30, 12 + jaw, -46, 5 + jaw); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-46 + i * 6, 2.5); ctx.lineTo(-43 + i * 6, 8); ctx.lineTo(-40 + i * 6, 3); ctx.fill(); }
  if (mouth > 0.2) for (let i = 0; i < 3; i++) { const bx = -44 + i * 6, by = 5 + jaw * (1 - i * 0.18); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 3, by - 5); ctx.lineTo(bx + 6, by); ctx.fill(); }
  if (crown) {
    ctx.fillStyle = '#ffcf3a'; ctx.strokeStyle = '#a26a00'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-14, -18); ctx.lineTo(-12, -34); ctx.lineTo(-5, -25); ctx.lineTo(2, -38); ctx.lineTo(8, -25); ctx.lineTo(15, -34); ctx.lineTo(16, -17); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff3b6b'; ctx.beginPath(); ctx.arc(2, -24, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
// Codex 그림 몬스터: 키(몸 반지름의 몇 배), 움직임(둥실·기울기·찌그러짐), 맞으면 하얗게, 얼면 파랗게, 필살기면 빨갛게
const SPR_H = { jelly: 3.4, urchin: 3.3, shark: 3.4, puffer: 3.1, eel: 4.4, octopus: 3.5, angler: 3.4, ray: 3.9, crab: 3.4, mine: 3.4, swordfish: 4.2, phantom: 3.4 };
function drawSpriteEnemy(e) {
  const key = 'spr_' + e.type, im = IMG[key];
  if (!SPR_H[e.type] || !ready(im)) return false;
  let h = e.r * SPR_H[e.type];
  if (e.type === 'eel') h = (e.len + 50) * im.naturalHeight / im.naturalWidth;
  const bob = Math.sin(e.t * 3 + (e.ph || 0)) * 3, tilt = Math.sin(e.t * 2.2 + (e.ph || 0)) * 0.07, sq = 1 + Math.sin(e.t * 6 + (e.ph || 0)) * 0.035;
  const cx = e.type === 'eel' ? e.x + e.len / 2 : e.x;
  const sk = e.sq || 0;
  ctx.save(); ctx.translate(cx + (e.kx || 0), e.y + bob); ctx.rotate(tilt + (e.roll > 0 ? -e.t * 10 : 0) + (e.kx || 0) * 0.012); ctx.scale((1 / sq) * (1 + sk), sq * (1 - sk));
  if (e.top && e.type === 'urchin') ctx.scale(1, -1);
  if (e.type === 'phantom') ctx.globalAlpha *= e.vis == null ? 1 : e.vis;
  drawImg(im, 0, 0, h);
  if (T - (e.hitAt == null ? -9 : e.hitAt) < 0.26) flashOver(key, h, e); // 몸 모양 그대로 번쩍(흰 → 빨강)
  else if (e.frozen) drawImg(silhouette(key, '#bfefff'), 0, 0, h, 0, 0.5);
  else if (e.rage > 0 || (e.sp && !e.sp.done)) drawImg(silhouette(key, '#ff3355'), 0, 0, h, 0, 0.3 + 0.2 * Math.sin(T * 30));
  ctx.restore();
  return true;
}
function drawEnemy(e, px = 0, py = H / 2) {
  if (e.type !== 'whirlpool' && e.type !== 'mine' && drawSpriteEnemy(e)) {
    if (e.type === 'mine' || e.armed) { ctx.strokeStyle = `rgba(255,84,112,${0.4 + 0.4 * Math.sin(T * 30)})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(e.x, e.y, 110, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    return;
  }
  if (e.type === 'mine' && drawSpriteEnemy(e)) {
    if (e.armed) { ctx.strokeStyle = `rgba(255,84,112,${0.4 + 0.4 * Math.sin(T * 30)})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(e.x, e.y, e.big ? 170 : 110, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,50,70,${0.5 + 0.5 * Math.sin(T * 30)})`; ctx.beginPath(); ctx.arc(e.x, e.y - 6, 10, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    return;
  }
  ctx.save();
  if (e.elite) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, e.r * 2.4);
    g.addColorStop(0, 'rgba(255,213,74,.45)'); g.addColorStop(1, 'rgba(255,213,74,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 2.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  switch (e.type) {
    case 'octopus': drawOctopus(e.x, e.y, e.r / 22, e.t, px, py, false); break;
    case 'angler': drawAngler(e.x, e.y, e.r / 22, e.t, e.lunge ? 1 : 0.25 + 0.15 * Math.sin(e.t * 3), false); break;
    case 'swordfish': {
      ctx.translate(e.x, e.y);
      ctx.strokeStyle = '#2a5a9a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(-58, -4); ctx.stroke();
      ctx.fillStyle = '#2a5a9a'; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.quadraticCurveTo(10, -46, 30, -16); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(52, -18 + Math.sin(e.t * 20) * 3); ctx.lineTo(44, 0); ctx.lineTo(52, 18 + Math.sin(e.t * 20) * 3); ctx.fill();
      const g = ctx.createLinearGradient(0, -14, 0, 14); g.addColorStop(0, '#6fb8ff'); g.addColorStop(1, '#e8f4ff');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(6, 0, 34, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-14, -3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c4002e'; ctx.beginPath(); ctx.arc(-15, -3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(60 + i * 18, -6 + i * 6); ctx.lineTo(100 + i * 24, -6 + i * 6); ctx.stroke(); }
      break;
    }
    case 'phantom': {
      ctx.translate(e.x, e.y); ctx.globalAlpha *= e.vis == null ? 1 : e.vis;
      ctx.strokeStyle = 'rgba(210,200,255,.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 7, 2); for (let k = 1; k <= 6; k++) ctx.lineTo(i * 7 + Math.sin(e.t * 4 + k + i) * 6, 2 + k * 8); ctx.stroke(); }
      const g = ctx.createRadialGradient(-4, -10, 2, 0, -4, e.r * 1.5); g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(160,140,255,.75)');
      ctx.fillStyle = g; ctx.shadowColor = '#b48bff'; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.ellipse(0, 4, e.r * 1.25, e.r * 1.15, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#2a1a4a'; ctx.beginPath(); ctx.ellipse(-7, -6, 3, 4.5, 0, 0, Math.PI * 2); ctx.ellipse(7, -6, 3, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 1, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'whirlpool': {
      ctx.translate(e.x, e.y);
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = `rgba(124,240,255,${0.55 - k * 0.1})`; ctx.lineWidth = 5 - k;
        ctx.beginPath(); ctx.arc(0, 0, 26 + k * 24, -e.t * (5 - k) + k, -e.t * (5 - k) + k + 4.3); ctx.stroke();
      }
      ctx.fillStyle = '#0b2a4a'; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, e.r * 0.6, e.t * 8, e.t * 8 + 4); ctx.stroke();
      break;
    }
    case 'ray': {
      ctx.translate(e.x, e.y); ctx.rotate(Math.cos(e.t * 2.5 + e.ph) * 0.25);
      const flap = Math.sin(e.t * 8) * 0.35;
      ctx.strokeStyle = '#3b4f8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(20, 0); ctx.quadraticCurveTo(50, 6, 76, Math.sin(e.t * 6) * 8); ctx.stroke();
      const g = ctx.createLinearGradient(0, -20, 0, 20); g.addColorStop(0, '#8fb0f0'); g.addColorStop(1, '#3b4f8a');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-34, 0); ctx.quadraticCurveTo(-4, -30 * (1 + flap), 26, 0); ctx.quadraticCurveTo(-4, 26 * (1 - flap), -34, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; [[-6, -6], [4, -10], [8, 2]].forEach(([sx, sy]) => { ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-20, -4, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-21, -4, 1.8, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'crab': {
      ctx.translate(e.x, e.y); if (e.top) ctx.scale(1, -1);
      ctx.strokeStyle = '#b8321e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { const a = Math.sin(e.t * 14 + i) * 0.3; ctx.beginPath(); ctx.moveTo(sd * 10, 4); ctx.lineTo(sd * (20 + i * 3), 10 + i * 2 + a * 8); ctx.lineTo(sd * (24 + i * 3), 18); ctx.stroke(); }
      const g = ctx.createRadialGradient(-5, -6, 2, 0, 0, 24); g.addColorStop(0, '#ff9a7a'); g.addColorStop(1, '#d1351c');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 22, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-6, -7, 8, 3, -0.3, 0, Math.PI * 2); ctx.fill();
      for (const sd of [-1, 1]) {
        const open = 0.3 + 0.3 * Math.sin(e.t * 6 + sd);
        ctx.fillStyle = '#e8462a'; ctx.beginPath(); ctx.arc(sd * 24, -14, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8a1f10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sd * 24, -14); ctx.lineTo(sd * (30 + open * 4), -20 - open * 6); ctx.stroke();
      }
      for (const sd of [-1, 1]) { ctx.strokeStyle = '#b8321e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sd * 6, -12); ctx.lineTo(sd * 8, -22); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sd * 8, -24, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(sd * 8 - 1, -24, 2, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'mine': {
      ctx.translate(e.x, e.y);
      if (e.armed) { ctx.strokeStyle = `rgba(255,84,112,${0.4 + 0.4 * Math.sin(T * 30)})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      ctx.strokeStyle = '#2a2f38'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + e.t * 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); ctx.stroke(); }
      const g = ctx.createRadialGradient(-5, -6, 2, 0, 0, 18); g.addColorStop(0, '#7b8494'); g.addColorStop(1, '#2a2f38');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
      const on = e.armed ? Math.sin(T * 30) > 0 : Math.sin(T * 4) > 0.6;
      ctx.fillStyle = on ? '#ff3355' : '#5a1020'; ctx.beginPath(); ctx.arc(0, -4, 5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'jelly': {
      ctx.translate(e.x, e.y);
      const pulse = 1 + Math.sin(e.t * 6 + e.ph) * 0.08;
      ctx.strokeStyle = 'rgba(255,170,225,.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(i * 7, 2);
        for (let k = 1; k <= 5; k++) ctx.lineTo(i * 7 + Math.sin(e.t * 5 + k + i) * 5, 2 + k * 7);
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(-4, -10, 2, 0, -4, e.r * 1.4);
      g.addColorStop(0, '#fff0fa'); g.addColorStop(1, 'rgba(255,90,190,.9)');
      ctx.fillStyle = g; ctx.shadowColor = '#ff7ad0'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.ellipse(0, 4, e.r * 1.2 * pulse, e.r * 1.1 * pulse, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#3a0a2a';
      ctx.beginPath(); ctx.arc(-6, -4, 2.4, 0, Math.PI * 2); ctx.arc(6, -4, 2.4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'urchin': {
      ctx.translate(e.x, e.y);
      if (e.top) { ctx.fillStyle = '#26324a'; ctx.beginPath(); ctx.ellipse(0, -24, 34, 16, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 18, 26, 6, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#2a0f45'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + e.t * 0.6, L = i % 2 ? e.r * 1.5 : e.r * 1.25;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * e.r * 0.6, Math.sin(a) * e.r * 0.6); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L); ctx.stroke();
      }
      const g = ctx.createRadialGradient(-5, -6, 2, 0, 0, e.r);
      g.addColorStop(0, '#9d5cff'); g.addColorStop(1, '#2a0f45');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, e.r * 0.85, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-6, -2, 4, 0, Math.PI * 2); ctx.arc(6, -2, 4, 0, Math.PI * 2); ctx.fill();
      { const a = Math.atan2(py - e.y, px - e.x), ox = Math.cos(a) * 1.8, oy = Math.sin(a) * 1.8;
        ctx.fillStyle = '#c4002e'; ctx.beginPath(); ctx.arc(-6 + ox, -2 + oy, 2, 0, Math.PI * 2); ctx.arc(6 + ox, -2 + oy, 2, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'shark': {
      const near = e.x > px ? clamp(1 - (e.x - px - 40) / 200, 0, 1) : 0;
      drawShark(e.x, e.y, 1, '#8fb2d0', '#4d6b88', true, false, false, Math.sin(e.t * 13) * 0.32, near);
      break;
    }
    case 'puffer': {
      ctx.translate(e.x, e.y);
      const r = e.r, big = r > 22;
      ctx.fillStyle = '#e09a12';
      const flap = Math.sin(e.t * 22) * 0.35;
      ctx.beginPath(); ctx.moveTo(r * 0.8, 0); ctx.lineTo(r * 1.4, -r * (0.45 + flap)); ctx.lineTo(r * 1.4, r * (0.45 - flap)); ctx.fill();
      ctx.save(); ctx.translate(0, r * 0.35); ctx.rotate(0.6 + flap * 1.5); ctx.fillStyle = '#f0b43a';
      ctx.beginPath(); ctx.ellipse(r * 0.35, 0, r * 0.4, r * 0.16, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (big) {
        ctx.strokeStyle = '#b06e00'; ctx.lineWidth = 2.4;
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); ctx.lineTo(Math.cos(a) * r * 1.28, Math.sin(a) * r * 1.28); ctx.stroke(); }
      }
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 2, 0, 0, r);
      g.addColorStop(0, '#fff3a6'); g.addColorStop(1, '#f2a516');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * 0.45, -r * 0.2, r * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-r * 0.5, -r * 0.2, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7a3e00'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-r * 0.8, r * 0.2, r * 0.12, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'eel': {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = '#9dff6a'; ctx.shadowBlur = 16;
      ctx.strokeStyle = '#4fa83a'; ctx.lineWidth = e.r * 2;
      ctx.beginPath();
      for (let i = 0; i <= e.len; i += 10) { const yy = e.y + Math.sin(e.t * 12 + i * 0.05) * 6; i ? ctx.lineTo(e.x + i, yy) : ctx.moveTo(e.x, yy); }
      ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#c8ff8a'; ctx.lineWidth = 3; ctx.stroke();
      const hy = e.y + Math.sin(e.t * 12) * 6;
      ctx.fillStyle = '#3f8f2e'; ctx.beginPath(); ctx.ellipse(e.x - 4, hy, 18, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x - 10, hy - 4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c4002e'; ctx.beginPath(); ctx.arc(e.x - 11, hy - 4, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }
  ctx.restore();
  if (e.frozen) {
    ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#bfefff';
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.35 + (e.len ? 10 : 0), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  ctx.save();
  ctx.restore();
}

// ───────── 그리기: UI (디자인 키트: 버튼 모서리 16·높이 56/44, 회색 칸, 옅은 그림자) ─────────
const BTN_KIND = { '#ffcf3a': 'primary', '#ffd34d': 'primary', '#7dffb0': 'ok', '#ff9ec0': 'yellow', '#cfd8ff': 'soft', '#9fd8ff': 'soft', '#6d7f99': 'soft', '#9fb6cc': 'soft', '#ff9aa8': 'soft' };
function button(x, y, w, h, label, on, o = {}) {
  const mt = ctx.getTransform(), hx = (mt.a * x + mt.c * y + mt.e) / K, hy = (mt.b * x + mt.d * y + mt.f) / K, hw = w * mt.a / K, hh = h * mt.d / K;
  const kind = o.disabled ? 'off' : o.kind || BTN_KIND[o.color] || 'primary';
  const key = `${x | 0},${y | 0}`;
  const hover = !isTouch && mouse.x >= hx && mouse.x <= hx + hw && mouse.y >= hy && mouse.y <= hy + hh;
  const sc = press.key === key ? press.sp.v : 1;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.shadowColor = 'rgba(0,0,0,.12)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
  let fill, fg;
  if (kind === 'primary') {
    const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, C.blue); g.addColorStop(1, C.deep);
    fill = g; fg = '#ffffff';
  } else if (kind === 'ok') { fill = C.ok; fg = '#ffffff'; }
  else if (kind === 'yellow') { fill = C.yellow; fg = '#191F28'; }
  else if (kind === 'off') { fill = C.line; fg = C.mute; }
  else { fill = hover ? '#24365e' : C.soft; fg = C.text; }
  ctx.fillStyle = fill; rr(x, y, w, h, Math.min(16, h / 2)); ctx.fill();
  ctx.shadowColor = 'transparent';
  if (hover && kind !== 'off' && kind !== 'soft') { ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(x, y, w, h, Math.min(16, h / 2)); ctx.fill(); }
  text(label, x + w / 2, y + h / 2 + 1, o.size || 20, fg, { stroke: false, weight: 700 });
  ctx.restore();
  buttons.push({ x: hx, y: hy, w: hw, h: hh, on, key });
}
function panel(x, y, w, h, o = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.1)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
  ctx.fillStyle = o.fill || 'rgba(27,28,31,.94)'; rr(x, y, w, h, o.r || 20); ctx.fill();
  ctx.shadowColor = 'transparent';
  if (o.sel) { ctx.strokeStyle = C.blueD; ctx.lineWidth = 2.5; ctx.stroke(); }
  ctx.restore();
}
function eggBadge(x, y, n, size = 26) {
  const label = String(n);
  ctx.font = `800 ${Math.max(13, size * 0.7)}px ${FONT}`;
  const w = ctx.measureText(label).width + size * 1.6;
  ctx.fillStyle = 'rgba(16,16,18,.55)'; rr(x - size * 0.75, y - size * 0.62, w, size * 1.24, size * 0.62); ctx.fill();
  drawImg(IMG.egg, x, y, size * 0.95);
  text(label, x + size * 0.62, y + 1, size * 0.7, C.text, { align: 'left', stroke: false });
}
function systemWindow(x, y, w, lines, title = '바다 소식') {
  const h = 58 + lines.length * 30;
  panel(x, y, w, h);
  ctx.fillStyle = C.soft; rr(x + 20, y + 16, 104, 28, 14); ctx.fill();
  text(title, x + 72, y + 30, 15, C.blueD, { stroke: false, weight: 700 });
  lines.forEach((l, i) => text(l, x + 20, y + 66 + i * 30, 17, i === 0 ? C.text : C.sub, { align: 'left', body: true, stroke: false }));
}

// ───────── 주인공: 앱 옆모습 그림(turn_side)을 헤엄 자세로 눕히고 다리만 따로 발차기 ─────────
const SIDE_STYLE = {
  basic: {}, raincoat: { cap: '#ffcf2e', rain: true }, chef: { chef: true }, barista: { cap: '#2e7d4f' },
  delivery: { cap: '#9a6430', box: true }, cape14: { cape: '#2552d8' }, suit: { cap: '#33363d', tie: '#d8283c' }, crown7: { crown: true },
};
const SWIM_TILT = 0.36; // 서 있는 옆모습을 살짝 앞으로 숙여서 — 얼굴은 앞(오른쪽)을 본다
function drawHero(x, y, h, rot, o = {}) {
  const im = o.ghost ? silhouette('side', o.ghost) : capVariant((SIDE_STYLE[o.skin || save.skin] || {}).cap);
  if (!im || !(im.width || im.naturalWidth) || !ready(IMG.side)) { drawSwimmer(x, y, h / 92, rot, o); return; }
  const st = SIDE_STYLE[o.skin || save.skin] || {};
  const iw = h * IMG.side.naturalWidth / IMG.side.naturalHeight;
  const ph = o.ph || 0, boost = !!o.boost;
  const kick = boost ? -0.35 : Math.sin(ph) * 0.32;
  const sq = boost ? 0 : Math.sin(ph * 2) * 0.03;
  ctx.save();
  ctx.translate(x, y);
  if (o.flip) ctx.scale(-1, 1);
  ctx.rotate(rot + (o.stand ? 0 : SWIM_TILT));
  ctx.scale((1 + sq) * (o.stretch || 1), (1 - sq) / (o.stretch || 1));
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (st.cape && !o.ghost) {
    const w1 = Math.sin(ph * 0.7) * 0.08 * h, w2 = Math.sin(ph * 0.7 + 1.6) * 0.1 * h;
    ctx.fillStyle = st.cape;
    ctx.beginPath(); ctx.moveTo(0.05 * iw, -0.12 * h);
    ctx.quadraticCurveTo(-0.7 * iw + w1, -0.05 * h, -0.95 * iw + w2, 0.28 * h);
    ctx.quadraticCurveTo(-0.4 * iw, 0.2 * h + w1, -0.05 * iw, 0.05 * h); ctx.closePath(); ctx.fill();
  }
  // 다리(아래쪽 23%)만 엉덩이를 축으로 흔들기
  ctx.save();
  ctx.beginPath(); ctx.rect(-iw, 0.27 * h, iw * 2, 0.3 * h); ctx.clip();
  ctx.translate(-0.05 * iw, 0.3 * h); ctx.rotate(kick); ctx.translate(0.05 * iw, -0.3 * h);
  ctx.drawImage(im, -iw / 2, -h / 2, iw, h);
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.rect(-iw, -h, iw * 2, 1.3 * h); ctx.clip();
  ctx.drawImage(im, -iw / 2, -h / 2, iw, h);
  ctx.restore();
  if (!o.ghost) {
    if (st.box) {
      ctx.save(); ctx.translate(-0.48 * iw, -0.02 * h); ctx.rotate(-0.15);
      ctx.fillStyle = '#c8935a'; ctx.fillRect(-0.13 * h, -0.09 * h, 0.26 * h, 0.18 * h);
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; ctx.strokeRect(-0.13 * h, -0.09 * h, 0.26 * h, 0.18 * h);
      ctx.beginPath(); ctx.moveTo(0, -0.09 * h); ctx.lineTo(0, 0.09 * h); ctx.stroke(); ctx.restore();
    }
    if (st.tie) {
      ctx.fillStyle = st.tie;
      ctx.beginPath(); ctx.moveTo(0.16 * iw, -0.03 * h); ctx.lineTo(0.26 * iw, -0.02 * h); ctx.lineTo(0.22 * iw, 0.13 * h); ctx.lineTo(0.13 * iw, 0.03 * h); ctx.fill();
    }
    if (st.crown) {
      ctx.fillStyle = '#ffcf3a'; ctx.strokeStyle = '#a26a00'; ctx.lineWidth = 1.5;
      const cx = -0.02 * iw, cy = -0.47 * h, u = h * 0.06;
      ctx.beginPath(); ctx.moveTo(cx - 2.2 * u, cy + u); ctx.lineTo(cx - 2.2 * u, cy - 1.6 * u); ctx.lineTo(cx - u, cy - 0.3 * u); ctx.lineTo(cx, cy - 2 * u);
      ctx.lineTo(cx + u, cy - 0.3 * u); ctx.lineTo(cx + 2.2 * u, cy - 1.6 * u); ctx.lineTo(cx + 2.2 * u, cy + u); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff3b6b'; ctx.beginPath(); ctx.arc(cx, cy - 0.2 * u, u * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    if (st.chef) {
      ctx.fillStyle = '#ffffff';
      const cx = -0.02 * iw, cy = -0.5 * h, u = h * 0.07;
      ctx.fillRect(cx - 1.6 * u, cy - 0.4 * u, 3.2 * u, 1.2 * u);
      [[-1.1, -1], [0, -1.5], [1.1, -1]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(cx + dx * u, cy + dy * u, u * 0.95, 0, Math.PI * 2); ctx.fill(); });
    }
    if (st.rain) {
      ctx.fillStyle = 'rgba(255,214,60,.95)';
      ctx.beginPath(); ctx.ellipse(0.02 * iw, -0.36 * h, 0.62 * iw, 0.05 * h, -0.08, 0, Math.PI * 2); ctx.fill();
    }
    // 표정 덧그림 (눈 위치: 그림 기준 (0.69, 0.30))
    const ex = 0.19 * iw, ey = -0.2 * h, u = h * 0.035, face = o.face || 'normal';
    if (face === 'dead' || face === 'ouch') {
      ctx.fillStyle = '#a9d47c'; ctx.beginPath(); ctx.ellipse(ex, ey, 1.9 * u, 2.3 * u, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = Math.max(2, u * 0.7); ctx.lineCap = 'round'; ctx.beginPath();
      if (face === 'dead') { ctx.moveTo(ex - u, ey - u); ctx.lineTo(ex + u, ey + u); ctx.moveTo(ex + u, ey - u); ctx.lineTo(ex - u, ey + u); }
      else { ctx.moveTo(ex - u, ey - u); ctx.lineTo(ex + u * 0.8, ey); ctx.lineTo(ex - u, ey + u); }
      ctx.stroke();
    } else if (o.blink) {
      ctx.fillStyle = '#a9d47c'; ctx.beginPath(); ctx.ellipse(ex, ey, 1.9 * u, 2.3 * u, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = Math.max(2, u * 0.6); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ex, ey - 0.3 * u, 1.3 * u, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
    if (face === 'boost') {
      ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = Math.max(2.5, u * 0.8); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - 2 * u, ey - 3.2 * u); ctx.lineTo(ex + 1.8 * u, ey - 2.2 * u); ctx.stroke();
    }
    if (face === 'scared') {
      ctx.fillStyle = '#8fd6ff';
      const dx = ex + 3.6 * u, dy = ey - 2.4 * u + Math.sin(T * 8) * 0.4 * u;
      ctx.beginPath(); ctx.moveTo(dx, dy - 1.6 * u); ctx.quadraticCurveTo(dx + 1.2 * u, dy + 0.4 * u, dx, dy + 0.9 * u); ctx.quadraticCurveTo(dx - 1.2 * u, dy + 0.4 * u, dx, dy - 1.6 * u); ctx.fill();
    }
    if (face === 'happy') {
      ctx.fillStyle = '#fff6a8';
      for (let i = 0; i < 2; i++) { const a = T * 6 + i * 3; ctx.beginPath(); ctx.arc(ex + 4 * u + Math.cos(a) * u, ey - 3 * u + Math.sin(a) * u, u * 0.5, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  ctx.restore();
}

// ───────── 성·궁전·도우미 물고기·별·아이콘 ─────────
function drawCastle(x, y, s, flag = '#ff3355', dark = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const wall = dark ? '#3b2d5c' : '#7a5ea8', wall2 = dark ? '#2a1f44' : '#5e4688';
  ctx.fillStyle = wall2; ctx.fillRect(-40, -62, 20, 62); ctx.fillRect(20, -62, 20, 62);
  ctx.fillStyle = wall; ctx.fillRect(-28, -44, 56, 44);
  for (let i = 0; i < 4; i++) { ctx.fillRect(-28 + i * 16, -52, 9, 9); }
  ctx.fillStyle = wall2; for (const tx of [-40, 20]) for (let i = 0; i < 2; i++) ctx.fillRect(tx + i * 12, -70, 8, 9);
  ctx.fillStyle = '#1a1030'; ctx.beginPath(); ctx.arc(0, -10, 11, Math.PI, 0); ctx.fillRect(-11, -10, 22, 10); ctx.fill();
  ctx.fillStyle = '#ffd34d'; ctx.fillRect(-33, -50, 6, 8); ctx.fillRect(27, -50, 6, 8);
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(30, -70); ctx.lineTo(30, -96); ctx.stroke();
  ctx.fillStyle = flag; ctx.beginPath(); ctx.moveTo(30, -96); ctx.lineTo(52 + Math.sin(T * 6) * 3, -90); ctx.lineTo(30, -82); ctx.fill();
  ctx.restore();
}
function drawPalace(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#ff9ec0';
  for (const cx of [-150, -60, 60, 150]) { rr(cx - 16, -170, 32, 170, 14); ctx.fill(); }
  ctx.fillStyle = '#ffb8d2';
  ctx.beginPath(); ctx.ellipse(0, -170, 190, 70, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#ff7fa8'; ctx.beginPath(); ctx.ellipse(0, -232, 60, 60, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#ffe36b'; ctx.beginPath(); ctx.arc(0, -296, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(-170 + i * 42, -170 + Math.sin(i) * 6, 5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function drawFish(x, y, s, flip = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  ctx.fillStyle = '#ff8a2a';
  ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(38, -14 + Math.sin(T * 12) * 3); ctx.lineTo(38, 14 + Math.sin(T * 12) * 3); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-6, -17, 7, 34); ctx.fillRect(12, -13, 5, 26);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-14, -4, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-15, -4, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a2a00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-20, 6, 4, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}
function drawStar(x, y, r, filled, color = C.yellow) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
  ctx.closePath();
  ctx.fillStyle = filled ? color : 'rgba(255,255,255,.16)'; ctx.fill();
  if (filled) { ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.strokeStyle = 'rgba(160,100,0,.45)'; ctx.stroke(); }
  if (filled) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.3, r * 0.18, r * 0.1, -0.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function icon(key, x, y, size, rot = 0, alpha = 1) { return drawImg(IMG[key], x, y, size, rot, alpha); }

// ───────── 새 몬스터·보스 몸통 ─────────
function drawOctopus(x, y, s, t, px, py, crown, hurt = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = hurt ? '#ffffff' : '#c9487f'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const bx = -12 + i * 5; ctx.beginPath(); ctx.moveTo(bx, 8);
    for (let k = 1; k <= 4; k++) ctx.lineTo(bx + 4 + k * 5 + Math.sin(t * 6 + i + k) * 5, 8 + k * 7 - i * 1.2);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(-8, -14, 3, 0, -6, 32);
  g.addColorStop(0, hurt ? '#ffffff' : '#ffb3d1'); g.addColorStop(1, hurt ? '#ffd0e0' : '#d0457f');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -8, 23, 21, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(-8, -20, 7, 4, -0.5, 0, Math.PI * 2); ctx.fill();
  const a = Math.atan2(py - y, px - x), ox = Math.cos(a) * 1.8, oy = Math.sin(a) * 1.8;
  for (const [ex, ey] of [[-12, -4], [-2, -7]]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2a0a1a'; ctx.beginPath(); ctx.arc(ex + ox, ey + oy, 2.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#7a1f45'; ctx.beginPath(); ctx.ellipse(-18, 6, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
  if (crown) {
    ctx.fillStyle = '#ffcf3a'; ctx.strokeStyle = '#a26a00'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-14, -26); ctx.lineTo(-12, -42); ctx.lineTo(-5, -33); ctx.lineTo(2, -46); ctx.lineTo(8, -33); ctx.lineTo(15, -42); ctx.lineTo(16, -25); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
function drawAngler(x, y, s, t, open, crown, hurt = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#6b4a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -18); ctx.quadraticCurveTo(-22, -48, -40, -34 + Math.sin(t * 3) * 3); ctx.stroke();
  ctx.fillStyle = hurt ? '#ffffff' : '#4a3328';
  ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(40, -14 + Math.sin(t * 8) * 3); ctx.lineTo(40, 14 + Math.sin(t * 8) * 3); ctx.fill();
  const g = ctx.createRadialGradient(-4, -10, 3, 0, 0, 30); g.addColorStop(0, hurt ? '#ffffff' : '#8a6450'); g.addColorStop(1, hurt ? '#ffe0d0' : '#3a2620');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 27, 21, 0, 0, Math.PI * 2); ctx.fill();
  const jaw = open * 16;
  ctx.fillStyle = '#2a0610'; ctx.beginPath(); ctx.moveTo(-28, -4); ctx.lineTo(-4, 2); ctx.lineTo(-26, 6 + jaw); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-26 + i * 5, -3); ctx.lineTo(-24 + i * 5, 4); ctx.lineTo(-22 + i * 5, -2); ctx.fill(); }
  for (let i = 0; i < 3; i++) { const by = 5 + jaw * (1 - i * 0.2); ctx.beginPath(); ctx.moveTo(-25 + i * 5, by); ctx.lineTo(-23 + i * 5, by - 6); ctx.lineTo(-21 + i * 5, by); ctx.fill(); }
  ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(-10, -10, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-11, -10, 2, 0, Math.PI * 2); ctx.fill();
  if (crown) {
    ctx.fillStyle = '#ffcf3a'; ctx.strokeStyle = '#a26a00'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-2, -18); ctx.lineTo(0, -32); ctx.lineTo(6, -24); ctx.lineTo(12, -36); ctx.lineTo(17, -24); ctx.lineTo(22, -31); ctx.lineTo(22, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
// 아귀 미끼: 어둠 위에 그려서 진짜 황금알처럼 보인다
function drawLure(x, y, s, t) {
  const lx = x - 40 * s, ly = y + (-34 + Math.sin(t * 3) * 3) * s;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 30 * s); g.addColorStop(0, 'rgba(255,220,90,.75)'); g.addColorStop(1, 'rgba(255,220,90,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 30 * s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  drawImg(silhouette('egg', '#ffc93a'), lx, ly, 30 * Math.min(1.4, s), Math.sin(t * 3) * 0.15);
}
function drawInk(k) {
  ctx.save(); ctx.globalAlpha = k.a;
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#14081c' : '#1f0f2a'; ctx.beginPath(); ctx.arc(k.x + Math.cos(i * 1.3 + k.t) * k.r * 0.4, k.y + Math.sin(i * 1.7 + k.t) * k.r * 0.35, k.r * (0.6 + (i % 3) * 0.15), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// ───────── 아이템 상자·아이콘 ─────────
const ITEM_ART = { magnet: 'x_it_magnet', bubble: 'x_it_bubble', double: 'x_it_star', freeze: 'x_it_ice', giant: 'x_it_up', bolt: 'x_it_bolt', whirl: 'x_it_swirl' };
function drawItemIcon(key, x, y, size) {
  if (ITEM_ART[key] && ready(IMG[ITEM_ART[key]])) return drawImg(IMG[ITEM_ART[key]], x, y, size * 1.15);
  if (typeof key === 'string' && key.startsWith('x_')) return drawImg(IMG[key], x, y, size * 1.15);
  const it = ITEMS[key] ? ITEMS[key].icon : key;
  if (it === 'egg') return drawImg(IMG.egg, x, y, size);
  if (it.startsWith('e_')) return icon(it, x, y, size);
  ctx.save(); ctx.translate(x, y); const s = size / 40; ctx.scale(s, s);
  if (it === 'heart') {
    ctx.fillStyle = '#ff5470'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 16); ctx.bezierCurveTo(-26, -2, -14, -24, 0, -10); ctx.bezierCurveTo(14, -24, 26, -2, 0, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-8, -8, 4, 3, -0.6, 0, Math.PI * 2); ctx.fill();
  } else if (it === 'magnet') {
    ctx.lineCap = 'butt'; ctx.lineWidth = 11; ctx.strokeStyle = '#ff4d5e';
    ctx.beginPath(); ctx.arc(0, -2, 11, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-11, -2); ctx.lineTo(-11, 10); ctx.moveTo(11, -2); ctx.lineTo(11, 10); ctx.stroke();
    ctx.strokeStyle = '#e9edf3'; ctx.beginPath(); ctx.moveTo(-11, 10); ctx.lineTo(-11, 17); ctx.moveTo(11, 10); ctx.lineTo(11, 17); ctx.stroke();
  } else if (it === 'bolt') {
    ctx.fillStyle = '#ffd54a'; ctx.strokeStyle = '#c98a00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(4, -18); ctx.lineTo(-10, 3); ctx.lineTo(0, 3); ctx.lineTo(-5, 18); ctx.lineTo(11, -4); ctx.lineTo(1, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (it === 'whirl') {
    ctx.strokeStyle = '#7cf0ff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, -10 + i * 9, 16 - i * 4, 4, 0, T * 6 + i, T * 6 + i + 4.6); ctx.stroke(); }
  }
  ctx.restore();
  return true;
}
function drawItemBox(b) {
  const y = b.y + Math.sin(b.t * 3) * 5, r = 22;
  ctx.save();
  const g = ctx.createRadialGradient(b.x - 6, y - 8, 2, b.x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(160,220,255,.35)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, y, r, 0, Math.PI * 2); ctx.fill();
  const rg = ctx.createLinearGradient(b.x - r, y - r, b.x + r, y + r);
  ['#ff5470', '#ffd54a', '#34c987', '#4c82ff', '#b48bff'].forEach((c, i) => rg.addColorStop(((i / 4) + T * 0.6) % 1, c));
  ctx.strokeStyle = rg; ctx.lineWidth = 4; ctx.stroke();
  ctx.restore();
  text('?', b.x, y + 1, 24, C.blue, { stroke: '#ffffff', lw: 4 });
}
function drawOctoBoss(b, px, py) { drawOctopus(b.x, b.y, b.s || 3.2, b.t, px, py, true, b.hurt > 0); }
function drawAnglerBoss(b) { drawAngler(b.x, b.y, b.s || 3, b.t, b.st === 'lunge' || b.st === 'windup' ? 1 : 0.3 + 0.2 * Math.sin(b.t * 3), true, b.hurt > 0); }
