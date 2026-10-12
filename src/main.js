'use strict';
// 터틀 레이스 — 입력·상태 흐름·그리기 순서·루프

const keys = {};
let drag = null;
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.repeat) return;
  userActed = true; initAudio();
  onKey(e.code);
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
const autoPause = () => { for (const k in keys) keys[k] = false; drag = null; if (state === 'play' && G && !G.p.dead && !G.won) state = 'pause'; };
addEventListener('blur', autoPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

function onKey(c) {
  const go = c === 'Space' || c === 'Enter';
  if (c === 'KeyM') { toggleMute(); return; }
  switch (state) {
    case 'title': if (go) startGame(); break;
    case 'intro': if (c === 'Escape') endIntro(); else if (go || c === 'ArrowRight') introAdvance(); break;
    case 'map':
      if (map.overlay) { if (c === 'Escape' || go) map.overlay = null; break; }
      if (c === 'ArrowLeft' || c === 'KeyA') mapStep(-1);
      else if (c === 'ArrowRight' || c === 'KeyD') mapStep(1);
      else if (go) mapPlay();
      else if (c === 'KeyS') openShop(map.cur === 0 ? ENDLESS : map.cur);
      else if (c === 'KeyQ') { map.overlay = 'missions'; sfx.click(); }
      else if (c === 'KeyB') { map.overlay = 'dex'; sfx.click(); }
      else if (c === 'KeyG') openGift();
      else if (c >= 'Digit1' && c <= 'Digit3') { save.diff = +c.slice(5) - 1; persist(); sfx.click(); }
      break;
    case 'play':
      if (c === 'Space' || c === 'ShiftLeft' || c === 'ShiftRight' || c === 'KeyJ' || c === 'KeyX') tryBoost();
      else if (c === 'KeyE' || c === 'KeyK' || c === 'KeyC') useItem();
      else if ((c === 'Escape' || c === 'KeyP') && !G.p.dead) state = 'pause';
      break;
    case 'bless': if (c >= 'Digit1' && c <= 'Digit3') chooseBless(+c.slice(5) - 1); break;
    case 'pause':
      if (c === 'Escape' || c === 'KeyP' || go) state = 'play';
      else if (c === 'KeyQ') { bank(false); enterMap(); }
      break;
    case 'revive': if (go) doRevive(); else if (c === 'Escape' || c === 'KeyX') giveUp(); break;
    case 'dead':
      if (G.deadT > 0.35 && (go || c === 'KeyR')) startLevel(G.n);
      else if (c === 'KeyS') openShop(G.n);
      else if (c === 'Escape') enterMap();
      break;
    case 'clear':
      if (endT > 0.8 && go) enterMap(G.n);
      else if (c === 'KeyS') openShop(Math.min(LAST, G.n + 1));
      else if (c === 'KeyR') startLevel(G.n);
      break;
    case 'shop':
      if (shop.hatch) { if (shop.hatch.t > 1.9 && (go || c === 'Escape')) shop.hatch = null; break; }
      if (c === 'Tab') { const t = ['up', 'skin', 'pet']; shop.tab = t[(t.indexOf(shop.tab) + 1) % 3]; sfx.click(); }
      else if (shop.tab === 'up' && c >= 'Digit1' && c <= 'Digit6') buyUp(+c.slice(5) - 1);
      else if (go) startLevel(shop.next);
      else if (c === 'Escape') enterMap();
      break;
    case 'ending': if (endT > 2 && go) enterMap(); break;
  }
}
function toGame(e) { const r = cvs.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
function hitButton(pt) { for (let i = buttons.length - 1; i >= 0; i--) { const b = buttons[i]; if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) return b; } return null; }
cvs.addEventListener('pointerdown', (e) => {
  e.preventDefault(); userActed = true; initAudio(); cvs.focus();
  if (PORTRAIT) return;
  const pt = toGame(e); mouse = pt;
  const b = hitButton(pt);
  if (b) { if (b.key) { press.key = b.key; press.down = true; haptic(8); } b.on(); return; }
  const lx = pt.x - OX(); // 메뉴 화면 좌표(가운데 960)
  if (state === 'title') { if (lx > 100 && lx < 400 && pt.y > 130 && pt.y < 450) buddyAct(); else startGame(); }
  else if (state === 'intro') introAdvance();
  else if (state === 'map' && !map.overlay) mapDown(pt);
  else if (state === 'play' && !G.p.dead) {
    drag = { id: e.pointerId, sx: pt.x, sy: pt.y, kx: pt.x, ky: pt.y, px: G.p.x, py: G.p.y }; // 손가락을 끈 만큼 거북이가 그대로 따라감
    try { cvs.setPointerCapture(e.pointerId); } catch (_) { /* 무시 */ }
  } else if (state === 'dead' && G.deadT > 0.35) startLevel(G.n);
});
cvs.addEventListener('pointermove', (e) => {
  const pt = toGame(e); mouse = pt;
  if (drag && drag.id === e.pointerId) {
    drag.kx = pt.x; drag.ky = pt.y;
    if (state === 'play' && G) moveByFinger(); // 다음 그림을 기다리지 않고 손가락이 움직이는 즉시 반영
  }
  if (state === 'map') mapMove(pt);
});
const endDrag = (e) => { press.down = false; if (drag && drag.id === e.pointerId) drag = null; if (state === 'map' && map.drag) mapUp(toGame(e)); };
cvs.addEventListener('pointerup', endDrag);
cvs.addEventListener('pointercancel', endDrag);

// ───────── 루프 ─────────
let last = performance.now(), prevState = state;
// 프레임 재기: 2초 동안 평균이 느리면(45프레임 아래) 화질을 낮춰 조작이 굼뜨지 않게
let fpsAcc = 0, fpsN = 0;
function frame(now) {
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw); last = now; T += dt;
  if (state === 'play' && !LOWFX && raw < 0.5) {
    fpsAcc += raw; fpsN++;
    if (fpsAcc > 2) { if (fpsN / fpsAcc < 45) { LOWFX = true; resize(); } fpsAcc = 0; fpsN = 0; }
  }
  update(dt); render();
  requestAnimationFrame(frame);
}
function update(dt) {
  if (state !== prevState) { prevState = state; stateT = 0; }
  stateT += dt;
  springStep(press.sp, press.down ? 0.96 : 1, dt, SPRING_SNAPPY);
  if (!press.down && Math.abs(press.sp.v - 1) < 0.002) press.key = null;
  if (REDUCE) { shake = 0; zoom = 1; flash = Math.min(flash, 0.2); }
  updateBuddy(dt);
  shake = Math.max(0, shake - dt * 55);
  flash = Math.max(0, flash - dt * 2.2);
  timeScale = lerp(timeScale, 1, Math.min(1, dt * 2.6));
  zoom = lerp(zoom, 1, Math.min(1, dt * 5));
  hudPulse = Math.max(0, hudPulse - dt);
  for (const t of toasts) t.t -= dt;
  while (toasts.length && toasts[0].t <= 0) toasts.shift();
  if (toasts.length > 3) toasts.splice(0, toasts.length - 3);
  if (PORTRAIT) { autoPause(); return; }
  if (state === 'pause' || state === 'bless') return;
  if (state === 'dead' && G) G.deadT += dt;
  if (state === 'clear' || state === 'ending') { endT += dt; if (state === 'clear') updateClear(); }
  if (state === 'revive') {
    G.reviveT -= dt;
    if (Math.ceil(G.reviveT) < G.reviveTick) { G.reviveTick = Math.ceil(G.reviveT); sfx.tick(); haptic(10); }
    if (G.reviveT <= 0) giveUp();
  }
  if (state === 'intro') updateIntro(dt);
  if (state === 'map') updateMap(dt);
  if (state === 'shop') updateShop(dt);
  if (state === 'title') setMusic('title');
  updateCutin(dt); updateScreenFx(dt);
  if (freeze > 0) { freeze -= dt; return; }
  const sdt = dt * timeScale;
  updateFx(state === 'play' ? sdt : dt);
  if (state === 'play') updatePlay(sdt);
  else if (state !== 'revive' && state !== 'dead') updateBubbles(dt, state === 'map' ? 20 : 90);
}
const SHEET = new URLSearchParams(location.search).has('sheet');
function drawSheet() {
  drawBackground(1, T * 60);
  ['normal', 'happy', 'scared', 'boost', 'ouch', 'dead'].forEach((f, i) => {
    const x = 90 + i * 155, y = 110;
    drawHero(x, y, 110, 0, { ph: T * 9 + i, face: f, boost: f === 'boost', blink: f === 'normal' && Math.sin(T * 2) > 0.9 });
    text(f, x, y + 66, 14, '#fff', { body: true });
  });
  const fake = (type, x, y) => ({ type, x, y, baseY: y, r: type === 'puffer' ? 15 + 21 * (0.5 + 0.5 * Math.sin(T * 2)) : type === 'eel' ? 12 : 20, t: T, ph: 0, len: 150, armed: Math.sin(T) > 0, elite: type === 'shark' });
  ENEMY_KEYS.forEach((k, i) => drawEnemy(fake(k, 60 + (i % 6) * 150, 270 + Math.floor(i / 6) * 110), 0, 300));
  drawShark(860, 470, 0.9, '#8a6bd6', '#3f2a7a', true, false, true, Math.sin(T * 7) * 0.28, 0.5 + 0.5 * Math.sin(T * 3));
  ITEM_KEYS.forEach((k, i) => { drawItemIcon(k, 60 + i * 60, 500, 40); });
  drawItemBox({ x: 560, y: 500, t: T });
}
function render() {
  buttons = [];
  ctx.setTransform(K, 0, 0, K, 0, 0);
  if (SHEET) { drawSheet(); return; }
  if (PORTRAIT) { drawRotate(); return; }
  const inRun = G && ['play', 'pause', 'dead', 'revive', 'clear', 'ending', 'bless'].includes(state);
  if (inRun) {
    ctx.save();
    if (shake > 0) ctx.translate(rand(-shake, shake) * 0.6, rand(-shake, shake) * 0.6);
    if (zoom > 1.001) { const zx = G.zoomAt ? G.zoomAt.x : G.p.x, zy = G.zoomAt ? G.zoomAt.y : G.p.y; ctx.translate(zx, zy); ctx.scale(zoom, zoom); ctx.translate(-zx, -zy); }
    drawBackground(G.n, G.dist);
    drawScreenFxBehind();
    if (state !== 'ending') drawWorld();
    ctx.restore();
    drawBoostOverlay();
    drawScreenFxBack();
    if (state === 'play' || state === 'pause' || state === 'bless') { drawPops(); drawHUD(); }
    if (state === 'play') drawCutin();
  } else if (state === 'map' || state === 'intro') {
    if (state === 'intro') drawBackground(1, T * 20);
  } else {
    drawBackground(state === 'shop' ? clamp(shop.next === ENDLESS ? 1 : shop.next, 1, LAST) : 1, T * 90);
  }
  if (flash > 0) { ctx.globalAlpha = flash * 0.8; ctx.fillStyle = flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  // 메뉴 화면: 가운데 960 폭
  ctx.save();
  if (shake > 0 && (state === 'map' || state === 'intro')) ctx.translate(rand(-shake, shake) * 0.5, rand(-shake, shake) * 0.5);
  ctx.translate(OX(), 0);
  if (state === 'title') drawTitle();
  else if (state === 'map') drawMap();
  else if (state === 'intro') drawIntro();
  else if (state === 'shop') drawShop();
  else if (state === 'pause') drawPause();
  else if (state === 'bless') drawBless();
  else if (state === 'revive') drawRevive();
  else if (state === 'dead') drawDead();
  else if (state === 'clear') drawClear();
  else if (state === 'ending') drawEnding();
  ctx.restore();
  if (state === 'map' || state === 'shop') drawConfetti();
  if (!inRun) drawScreenFxBack();
  drawScreenFxTop();
  drawEggFly();
  drawToasts();
}
requestAnimationFrame(frame);

// 개발 확인용 (브라우저 콘솔)
window.__turtle = {
  state: () => state, G: () => G, save, start: startLevel, map: () => { enterMap(); },
  face: (f) => setFace(f, 99), boost: () => { G.boost = 100; tryBoost(); }, fever: () => startFever(), item: (k) => { G.item = k; useItem(); },
  bless: () => openBless(), boss: () => { G.dist = G.cfg.length; }, die: () => { G.p.inv = 0; G.shield = 0; hitPlayer({ type: 'test' }); },
  win: () => levelClear(), special: (t) => { spawnEnemy(t); const e = G.enemies[G.enemies.length - 1]; if (e) { e.x = W * 0.62; e.sp = { t: 0, wind: 0.75, done: false }; } }, set: (k, v) => { save[k] = v; persist(); }, spawn: (t) => spawnEnemy(t),
};
