'use strict';
// 터틀 레이스 — 입력·상태 흐름·그리기 순서·루프

const keys = {};
let drag = null;
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.repeat) return;
  userActed = true; initAudio();
  if (coach && coach.wait === 'tap' && coachDone('tap')) return;
  onKey(e.code);
});
addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (state === 'play' && G && G.run) {
    if (RUN_JUMP.includes(e.code) && !RUN_JUMP.some((k) => keys[k])) jumpUp();
    if (RUN_SLIDE.includes(e.code) && !RUN_SLIDE.some((k) => keys[k])) slideUp();
  }
});
const RUN_JUMP = ['Space', 'ArrowUp', 'KeyW', 'KeyJ'], RUN_SLIDE = ['ArrowDown', 'KeyS', 'KeyK'];
const autoPause = () => { for (const k in keys) keys[k] = false; drag = null; releaseRunInput(); if (state === 'play' && G && !G.p.dead && !G.won) state = 'pause'; };
addEventListener('blur', autoPause);
document.addEventListener('visibilitychange', () => { // 백그라운드로 가면 소리 엔진도 멈춤(배터리·백그라운드 소리 금지), 돌아오면 다시
  if (document.hidden) { autoPause(); try { if (ac && ac.state === 'running') ac.suspend(); } catch (e) { /* 무시 */ } }
  else { try { if (ac && ac.state === 'suspended' && userActed) ac.resume(); } catch (e) { /* 무시 */ } }
});
// 안드로이드 「뒤로」 단추: 페이지를 떠나지 않고 게임 안에서 한 단계 뒤로(구글 플레이 품질 기준)
// 창 닫기 → 판 중이면 멈춤 → 멈춤이면 계속 → 상점·판 전·결과 → 지도 → 지도에서 처음 화면 → 처음 화면에서만 진짜 뒤로
try { history.replaceState({ g: 0 }, ''); history.pushState({ g: 1 }, ''); } catch (e) { /* 무시 */ }
addEventListener('popstate', () => {
  const stay = () => { try { history.pushState({ g: 1 }, ''); } catch (e) { /* 무시 */ } };
  if (gate) { gate = null; if (buying) buying = null; return stay(); }
  if (probOpen) { probOpen = false; return stay(); }
  if (buying) { buying = null; return stay(); }
  if (coach && coach.pass) { coach = null; return stay(); }
  if (state === 'map' && map.overlay) { map.overlay = null; return stay(); }
  if (state === 'play') { if (G && !G.p.dead && !G.won) state = 'pause'; return stay(); }
  if (state === 'pause') { state = 'play'; return stay(); }
  if (['shop', 'ready', 'clear', 'dead', 'story', 'intro'].includes(state)) { enterMap(); return stay(); }
  if (state === 'map' || state === 'ending') { state = 'title'; return stay(); }
  if (state !== 'title') return stay(); // 이어하기·쉼터 같은 고르는 화면은 그대로(실수로 판을 잃지 않게)
  // 처음 화면에서만: 그대로 한 번 더 뒤로 → 앱/브라우저가 닫음
  history.back();
});

function onKey(c) {
  const go = c === 'Space' || c === 'Enter';
  if (c === 'KeyM') { toggleMute(); return; }
  if (resultOverlay()) { if (go || c === 'Escape') closeResultOverlay(); return; }
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
      if (G.run) {
        if (RUN_JUMP.includes(c)) jumpDown();
        else if (RUN_SLIDE.includes(c)) slideDown();
        else if (c === 'ShiftLeft' || c === 'ShiftRight' || c === 'KeyX' || c === 'KeyL') tryBoost();
        else if (c === 'KeyE' || c === 'KeyC') useItem();
        else if ((c === 'Escape' || c === 'KeyP') && !G.p.dead) state = 'pause';
        break;
      }
      if (c === 'Space' || c === 'ShiftLeft' || c === 'ShiftRight' || c === 'KeyJ' || c === 'KeyX') tryBoost();
      else if (c === 'KeyE' || c === 'KeyK' || c === 'KeyC') useItem();
      else if ((c === 'Escape' || c === 'KeyP') && !G.p.dead) state = 'pause';
      break;
    case 'bless': if (c >= 'Digit1' && c <= 'Digit3') chooseBless(+c.slice(5) - 1); break;
    case 'story': if (go || c === 'ArrowRight') storyTap(); break;
    case 'ready': if (go && ready_) { const k = ready_.n; ready_ = null; startLevel(k); applyBoosters(); } else if (c === 'Escape') { ready_ = null; enterMap(); } break;
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
    case 'ending': if (go) endingTap(); break;
  }
}
function toGame(e) { const r = cvs.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
function hitButton(pt) {
  for (let i = buttons.length - 1; i >= 0; i--) { const b = buttons[i]; if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) return b; }
  // 작은 단추도 손가락으로 누르기 쉽게: 화면에서 44pt(애플 권장)보다 작으면 둘레를 넓혀 잡고, 겹치면 가운데가 가장 가까운 단추
  if (state === 'play') return null; // 달리는 중엔 넓히지 않음(점프·숙이기 터치를 단추가 뺏지 않게)
  const min = 44 / Math.max(0.3, CSS_S); let best = null, bd = 1e9;
  for (const b of buttons) {
    if (b.w >= W * 0.9) continue; // 화면 전체 막이(창 뒤 누르기 막기)는 빼고
    const ex = Math.max(0, (min - b.w) / 2), ey = Math.max(0, (min - b.h) / 2);
    if (pt.x >= b.x - ex && pt.x <= b.x + b.w + ex && pt.y >= b.y - ey && pt.y <= b.y + b.h + ey) { const d = Math.hypot(pt.x - (b.x + b.w / 2), pt.y - (b.y + b.h / 2)); if (d < bd) { bd = d; best = b; } }
  }
  return best;
}
cvs.addEventListener('pointerdown', (e) => {
  e.preventDefault(); userActed = true; initAudio(); cvs.focus();
  if (!persistAsked && navigator.storage && navigator.storage.persist) { persistAsked = true; navigator.storage.persist().catch(() => {}); } // 기록이 브라우저 정리로 지워지지 않게(사파리 7일 규칙 등)
  if (PORTRAIT) return;
  const pt = toGame(e); mouse = pt;
  if (coach && coach.wait === 'tap' && coachDone('tap')) return; // 안내 읽고 누르면 닫힘
  const b = hitButton(pt);
  if (b) { if (b.key) { press.key = b.key; press.down = true; haptic(8); } b.on(); return; }
  const lx = pt.x - OX(); // 메뉴 화면 좌표(가운데 960)
  if (state === 'title') { if (lx > 100 && lx < 400 && pt.y > 130 && pt.y < 450) buddyAct(); else startGame(); }
  else if (state === 'intro') introAdvance();
  else if (state === 'ending') endingTap();
  else if (state === 'clear' && endT < 3.2) endT = 3.2; // 누르면 굴러 오르던 숫자가 바로 끝까지(인기 게임처럼 빨리 넘기기)
  else if (state === 'story') storyTap();
  else if (state === 'map' && !map.overlay) mapDown(pt);
  else if (state === 'play' && !G.p.dead && G.run) {
    if (pt.x < W / 2) { G.touch.j = e.pointerId; jumpDown(); } else { G.touch.s = e.pointerId; slideDown(); }
  } else if (state === 'play' && !G.p.dead) {
    drag = { id: e.pointerId, sx: pt.x, sy: pt.y, kx: pt.x, ky: pt.y, px: G.p.x, py: G.p.y }; // 손가락을 끈 만큼 거북이가 그대로 따라감
    try { cvs.setPointerCapture(e.pointerId); } catch (_) { /* 무시 */ }
  } else if (state === 'dead' && G.deadT > 0.35 && !resultOverlay()) startLevel(G.n);
});
cvs.addEventListener('pointermove', (e) => {
  const pt = toGame(e); mouse = pt;
  if (drag && drag.id === e.pointerId) {
    drag.kx = pt.x; drag.ky = pt.y;
    if (state === 'play' && G) moveByFinger(); // 다음 그림을 기다리지 않고 손가락이 움직이는 즉시 반영
  }
  if (state === 'map') mapMove(pt);
});
const endDrag = (e) => {
  press.down = false; if (drag && drag.id === e.pointerId) drag = null;
  if (G && G.run && G.touch) { if (G.touch.j === e.pointerId) { G.touch.j = null; jumpUp(); } if (G.touch.s === e.pointerId) { G.touch.s = null; slideUp(); } } if (state === 'map' && map.drag) mapUp(toGame(e)); };
cvs.addEventListener('pointerup', endDrag);
cvs.addEventListener('pointercancel', endDrag);

// ───────── 루프 ─────────
let last = performance.now(), prevState = state;
// 프레임 재기: 2초 동안 평균이 느리면(45프레임 아래) 화질을 낮춰 조작이 굼뜨지 않게
let fpsAcc = 0, fpsN = 0;
let flashPrev = 0; const flashHits = [];
let playSec = 0, restAt = 3600, persistAsked = false; // 이번에 켠 뒤 판을 한 시간
function frame(now) {
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw); last = now; T += dt;
  if (state === 'play' && !LOWFX && raw < 0.5) {
    fpsAcc += raw; fpsN++;
    if (fpsAcc > 2) { if (fpsN / fpsAcc < 45) { LOWFX = true; resize(); try { Object.defineProperty(ctx, 'shadowBlur', { get: () => 0, set() {}, configurable: true }); } catch (e) { /* 무시 */ } } fpsAcc = 0; fpsN = 0; } // 느린 폰: 번짐(shadowBlur)도 끔
  }
  update(dt); render();
  requestAnimationFrame(frame);
}
function update(dt) {
  if (state !== prevState) { prevState = state; stateT = 0; }
  stateT += dt;
  springStep(press.sp, press.down ? 0.96 : 1, dt, SPRING_SNAPPY);
  if (!press.down && Math.abs(press.sp.v - 1) < 0.002) press.key = null;
  if (REDUCE || save.noShake) { shake = 0; zoom = 1; flash = Math.min(flash, 0.2); } // 흔들림 끄기(설정)
  updateBuddy(dt);
  shake = Math.max(0, shake - dt * 55);
  flash = Math.max(0, flash - dt * 2.2);
  timeScale = lerp(timeScale, 1, Math.min(1, dt * 2.6));
  zoom = lerp(zoom, 1, Math.min(1, dt * 5));
  hudPulse = Math.max(0, hudPulse - dt);
  // 알림은 판·결과·멈춤 화면 위에 겹치지 않게 지도/상점에서 하나씩만 보여줌(그때까지 줄 세움)
  if (toastOK()) { if (toasts.length) toasts[0].t -= dt; }
  while (toasts.length && toasts[0].t <= 0) toasts.shift();
  if (toasts.length > 6) toasts.splice(0, toasts.length - 6);
  if (PORTRAIT) { autoPause(); return; }
  if (state === 'pause' || state === 'bless') return;
  if (state === 'dead' && G) G.deadT += dt;
  if (state === 'clear' || state === 'ending') { endT += dt; if (state === 'clear') updateClear(); }

  if (state === 'intro') updateIntro(dt);
  if (state === 'map') updateMap(dt);
  if (state === 'shop') updateShop(dt);
  if (state === 'title') setMusic('title');
  updateCutin(dt); updateScreenFx(dt); juiceRealtime(dt);
  // 과몰입 예방(게임산업법 이용 시간 안내): 판을 1시간 할 때마다 다음 지도·결과 화면에서 한 번 쉬어 가기 안내
  if (state === 'play') playSec += dt;
  if (playSec >= restAt && !coach && ['map', 'clear', 'dead'].includes(state) && stateT > 1) {
    const hrs = Math.floor(playSec / 3600); restAt = (hrs + 1) * 3600;
    coach = { id: 'rest' + hrs, t: 0, wait: 'tap', pass: true, state, text: `${hrs}시간째 달리고 있어요`, sub: '눈과 손가락을 잠깐 쉬어 주세요 · 오늘 판은 그대로 남아요', spot: null }; snd('ready', 0.6);
  }
  if (updateCoach(dt)) return; // 안내 중엔 세계 멈춤
  if (state === 'play') coachRunTriggers();
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
    if (G.run) { ctx.save(); if (shake > 0) ctx.translate(rand(-shake, shake) * 0.3, 0); drawHitNums(); ctx.restore(); }
    drawBoostOverlay();
    drawScreenFxBack();
    drawUltCine(); if (!cine) drawSprFx(); drawTaunt();
    if (state === 'play' || state === 'pause' || state === 'bless') { drawPops(); drawSweepLabels(); drawHUD(); }
    if (state === 'play') drawCutin();
  } else if (state === 'map' || state === 'intro') {
    if (state === 'intro') drawBackground(1, T * 20);
  } else {
    drawBackground(state === 'shop' ? clamp(shop.next === ENDLESS ? 1 : shop.next, 1, LAST) : state === 'ready' && ready_ ? clamp(ready_.n === ENDLESS ? 1 : ready_.n, 1, LAST) : state === 'story' && story ? (story.w - 1) * 10 + 1 : 1, T * 90);
  }
  if (flash > 0) { // 번쩍임: 1초에 3번 넘으면 약하게(빛 민감한 사람 보호), 한 번도 0.45 넘지 않게
    if (flash > flashPrev + 0.05) { const now = performance.now(); flashHits.push(now); while (flashHits.length && now - flashHits[0] > 1000) flashHits.shift(); }
    const a = Math.min(flash, 0.55) * 0.8 * (flashHits.length > 3 ? 0.25 : 1);
    ctx.globalAlpha = a; ctx.fillStyle = flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }
  flashPrev = flash;
  // 메뉴 화면: 가운데 960 폭
  ctx.save();
  if (shake > 0 && (state === 'map' || state === 'intro')) ctx.translate(rand(-shake, shake) * 0.5, rand(-shake, shake) * 0.5);
  ctx.translate(OX(), 0);
  if (state === 'title') drawTitle();
  else if (state === 'map') drawMap();
  else if (state === 'intro') drawIntro();
  else if (state === 'shop') drawShop();
  else if (state === 'ready') drawReady();
  else if (state === 'story') drawStory();
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
  drawCoach(); // 초보 안내
  drawProbInfo(); // 확률 정보
  if (!buying) drawGate(); // 보호자 확인(링크 열기 등)
  drawBuyConfirm(); // 결제 확인 창은 맨 위
}
requestAnimationFrame(frame);

// 개발 확인용 (브라우저 콘솔)
window.__turtle = {
  state: () => state, G: () => G, save, start: startLevel, map: () => { enterMap(); },
  face: (f) => setFace(f, 99), boost: () => { G.boost = 100; tryBoost(); }, fever: () => startFever(), item: (k) => { G.item = k; useItem(); },
  bless: () => openBless(), jump: () => { jumpDown(); setTimeout(jumpUp, 200); }, slide: (ms = 600) => { slideDown(); setTimeout(slideUp, ms); }, xp: (n) => { save.xp += n; }, boss: () => { G.dist = G.cfg.length; }, die: () => { G.p.inv = 0; G.shield = 0; hitPlayer({ type: 'test' }); },
  win: () => levelClear(), special: (t) => { spawnEnemy(t); const e = G.enemies[G.enemies.length - 1]; if (e) { e.x = W * 0.62; e.sp = { t: 0, wind: 0.75, done: false }; } }, set: (k, v) => { save[k] = v; persist(); }, spawn: (t) => spawnEnemy(t),
};
// 오프라인 실행(https 공개본에서만 — 개발 중엔 안 씀)
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
if (new URLSearchParams(location.search).has('lab')) { const s = document.createElement('script'); s.src = 'tools/lab.js?' + Date.now(); document.body.append(s); } // 개발용 실험실
