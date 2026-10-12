'use strict';
// 터틀 레이스 — 소리: 파일 없이 합성. 세계별·보스·알 소나기 음악 + 마법 같은 효과음
// 잔향(물속 울림)과 압축기로 폰 스피커에서도 꽉 차게 들리도록

let ac = null, master = null, musicBus = null, sfxBus = null, verb = null, noiseBuf = null;
function makeImpulse(sec, decay) {
  const len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
function initAudio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ac.createGain(); master.connect(comp); comp.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.connect(master);
    verb = ac.createConvolver(); verb.buffer = makeImpulse(2.6, 3.2);
    const vg = ac.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2.5, ac.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  applyVolumes();
  if (ac.state === 'suspended') ac.resume();
}
function applyVolumes() {
  if (!ac) return;
  master.gain.value = save.muted ? 0 : 0.6;
  musicBus.gain.value = save.musicOff ? 0 : 0.5;
  sfxBus.gain.value = save.sfxOff ? 0 : 1;
}
function toggleMute() { save.muted = !save.muted; persist(); initAudio(); }

// ───────── 소리 재료 ─────────
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function m(name) { const r = /^([A-G])(#|b)?(-?\d)$/.exec(name); return 12 * (+r[3] + 1) + NOTE[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0); }
function voice({ type = 'sine', f, f2, t, a = 0.005, d = 0.2, vol = 0.2, bus, wet = 0, filter = null, detune = 0, vib = 0 }) {
  if (!ac) return;
  t = t ?? ac.currentTime;
  const o = ac.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2 && f2 !== f) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + a + d);
  if (detune) o.detune.value = detune;
  if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vib; lg.gain.value = f * 0.02; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + a + d + 0.1); }
  let node = o;
  if (filter) {
    const fl = ac.createBiquadFilter(); fl.type = filter.type || 'lowpass';
    fl.frequency.setValueAtTime(filter.f, t); if (filter.f2) fl.frequency.exponentialRampToValueAtTime(filter.f2, t + a + d);
    fl.Q.value = filter.q || 1; node.connect(fl); node = fl;
  }
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  node.connect(g); g.connect(bus || sfxBus);
  if (wet) { const w = ac.createGain(); w.gain.value = wet; g.connect(w); w.connect(verb); }
  o.start(t); o.stop(t + a + d + 0.05);
}
function nz({ t, d = 0.2, vol = 0.3, type = 'lowpass', f = 1500, f2 = 60, q = 1, bus, wet = 0, a = 0.002 }) {
  if (!ac) return;
  t = t ?? ac.currentTime;
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + a + d);
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  s.connect(fl); fl.connect(g); g.connect(bus || sfxBus);
  if (wet) { const w = ac.createGain(); w.gain.value = wet; g.connect(w); w.connect(verb); }
  s.start(t, Math.random() * 0.5); s.stop(t + a + d + 0.05);
}
const now = (d = 0) => (ac ? ac.currentTime + d : 0);
// 예전 이름 그대로 쓰는 간단한 소리
function tone(f1, f2, dur, type = 'square', vol = 0.12, delay = 0) { if (ac) voice({ type, f: f1, f2, t: now(delay), d: dur, vol }); }
function noise(dur, vol = 0.3, freq = 1500, delay = 0, at, type = 'lowpass', freq2 = 60) { if (ac) nz({ t: at ?? now(delay), d: dur, vol, f: freq, f2: freq2, type }); }
const boom = (vol = 0.5, delay = 0) => { if (ac) voice({ type: 'sine', f: 150, f2: 34, t: now(delay), d: 0.5, vol }); }; // 몸으로 느끼는 저음 쿵
// 마법 종소리: 사인 + 종 배음(2.76배), 물속 잔향
function bell(f, t, vol = 0.12, d = 0.5, wet = 0.6) { voice({ f, t, d, vol, wet }); voice({ f: f * 2.76, t, d: d * 0.4, vol: vol * 0.25, wet }); }
function chime(names, gap = 0.06, vol = 0.12, delay = 0, d = 0.5) { if (!ac) return; names.forEach((n, i) => bell(hz(m(n)), now(delay + i * gap), vol, d)); }
function sparkle(n = 8, delay = 0, vol = 0.05) { if (!ac) return; for (let i = 0; i < n; i++) voice({ f: rand(2200, 5200), t: now(delay + i * 0.025 + rand(0, 0.02)), d: 0.12, vol, wet: 0.7 }); }
function whoosh(f1 = 300, f2 = 4000, d = 0.35, vol = 0.3, delay = 0) { if (ac) nz({ t: now(delay), d, vol, type: 'bandpass', f: f1, f2, q: 1.2, wet: 0.2 }); }

// ───────── 효과음 ─────────
const sfx = {
  click: () => voice({ f: 880, f2: 1250, d: 0.05, vol: 0.07 }),
  tap: () => voice({ type: 'triangle', f: 660, f2: 990, d: 0.06, vol: 0.08 }),
  blip: (who) => voice({ type: 'square', f: who === 'shark' ? 150 : who === 'princess' ? 980 : 620, f2: who === 'shark' ? 130 : 1040, d: 0.035, vol: 0.035 }),
  egg: (c) => { if (!ac) return; const f = 1046 * Math.pow(1.0595, Math.min(c, 16)); bell(f, now(), 0.08, 0.16, 0.2); },
  gold: () => { chime(['C6', 'E6', 'G6', 'C7'], 0.045, 0.1); sparkle(5, 0.1); },
  near: () => whoosh(400, 3600, 0.25, 0.28),
  perfect: () => { whoosh(400, 5000, 0.3, 0.32); chime(['G6', 'C7'], 0.05, 0.1, 0.05); sparkle(6, 0.08); },
  ready: () => chime(['G5', 'D6', 'G6'], 0.07, 0.1),
  boost: () => { if (!ac) return; voice({ type: 'sawtooth', f: 110, f2: 880, d: 0.5, vol: 0.12, filter: { f: 400, f2: 6000 } }); nz({ d: 0.7, vol: 0.14, type: 'highpass', f: 5000, f2: 9000, wet: 0.5 }); boom(0.7); chime(['C5', 'G5', 'C6', 'E6', 'G6'], 0.035, 0.08, 0.05); },
  smash: () => { nz({ d: 0.3, vol: 0.42, f: 3000, f2: 80 }); voice({ type: 'square', f: 240, f2: 40, d: 0.25, vol: 0.13 }); boom(0.45); },
  shield: () => { voice({ type: 'triangle', f: 900, f2: 300, d: 0.25, vol: 0.18 }); for (let i = 0; i < 3; i++) voice({ f: 300, f2: 1000, t: now(i * 0.06), d: 0.07, vol: 0.08 }); boom(0.3); },
  die: () => { nz({ d: 0.6, vol: 0.5, f: 1600 }); voice({ type: 'sawtooth', f: 420, f2: 50, d: 0.9, vol: 0.13, filter: { f: 1800 } }); boom(0.8); chime(['E5', 'C5', 'A4'], 0.18, 0.08, 0.45, 0.7); },
  warn: () => [0, 0.12].forEach((d) => voice({ type: 'square', f: 1250, t: now(d), d: 0.07, vol: 0.05 })),
  siren: () => { for (let k = 0; k < 4; k++) { voice({ type: 'square', f: 600, f2: 980, t: now(k * 0.56), d: 0.28, vol: 0.05 }); voice({ type: 'square', f: 980, f2: 600, t: now(k * 0.56 + 0.28), d: 0.28, vol: 0.05 }); } },
  roar: () => { nz({ d: 1.2, vol: 0.45, f: 900, f2: 100 }); voice({ type: 'sawtooth', f: 70, f2: 40, d: 1.2, vol: 0.22, filter: { f: 500 } }); boom(0.8); },
  bossHit: () => { nz({ d: 0.7, vol: 0.6, f: 5000 }); voice({ type: 'square', f: 110, f2: 30, d: 0.7, vol: 0.26 }); boom(0.9); chime(['C6', 'G6'], 0.05, 0.08, 0.05); },
  shoot: () => voice({ type: 'triangle', f: 300, f2: 120, d: 0.15, vol: 0.08 }),
  buy: () => { chime(['C5', 'E5', 'G5', 'C6'], 0.06, 0.1); sparkle(4, 0.2); },
  no: () => voice({ type: 'square', f: 200, f2: 140, d: 0.15, vol: 0.07 }),
  clear: () => { chime(['C5', 'E5', 'G5', 'C6', 'E6'], 0.11, 0.12, 0, 0.6); chime(['C5', 'E5', 'G5', 'C6'], 0, 0.06, 0.62, 1.4); sparkle(10, 0.6); },
  mission: () => { chime(['G5', 'B5', 'D6', 'G6'], 0.07, 0.1); boom(0.2, 0.25); },
  fever: () => { chime(['C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'E7', 'G7'], 0.04, 0.08); boom(0.6); sparkle(12, 0.2); },
  star: (i, got) => { if (got) { bell(hz(m(['C6', 'E6', 'G6'][i])), now(), 0.18, 0.8); boom(0.5); sparkle(5); } else voice({ type: 'square', f: 220, f2: 180, d: 0.15, vol: 0.05 }); },
  tick: () => voice({ f: 1000, d: 0.05, vol: 0.08 }),
  revive: () => { chime(['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.04, 0.09); nz({ d: 0.5, vol: 0.25, type: 'highpass', f: 4000, f2: 9000, wet: 0.5 }); boom(0.6); },
  gift: () => { chime(['G5', 'C6', 'E6', 'G6'], 0.08, 0.1); boom(0.4); sparkle(8, 0.3); },
  crack: () => { nz({ d: 0.25, vol: 0.45, f: 3200 }); voice({ type: 'triangle', f: 300, f2: 900, d: 0.3, vol: 0.13 }); boom(0.5); chime(['C6', 'E6', 'G6', 'C7'], 0.05, 0.09, 0.2); },
  harp: () => { const sc = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7']; sc.forEach((n, i) => voice({ type: 'triangle', f: hz(m(n)), t: now(i * 0.03), d: 0.5, vol: 0.06, wet: 0.6 })); },
  card: () => { whoosh(800, 2400, 0.15, 0.18); voice({ type: 'triangle', f: 700, f2: 1100, d: 0.08, vol: 0.08 }); },
  levelup: () => { chime(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.05, 0.1); boom(0.3, 0.3); },
  swoosh: () => whoosh(300, 2600, 0.3, 0.22),
  // 아이템
  box: () => { chime(['E6', 'G#6', 'B6', 'E7'], 0.04, 0.09); sparkle(4, 0.12); },
  weak: () => { chime(['C6', 'E6', 'G6'], 0.04, 0.12); boom(0.25); },
  magnet: () => { voice({ type: 'sawtooth', f: 180, d: 0.55, vol: 0.07, vib: 14, filter: { f: 1100 } }); chime(['C6', 'G6'], 0.08, 0.08, 0.1); },
  bubble: () => { for (let i = 0; i < 4; i++) voice({ f: 280 + i * 60, f2: 1000 + i * 120, t: now(i * 0.05), d: 0.08, vol: 0.09, wet: 0.3 }); chime(['E6', 'B6'], 0.06, 0.07, 0.2); },
  giant: () => { voice({ type: 'square', f: 80, f2: 320, d: 0.6, vol: 0.12, filter: { f: 600, f2: 3000 } }); boom(0.6, 0.45); voice({ f: 600, f2: 1300, t: now(0.5), d: 0.12, vol: 0.1 }); },
  freeze: () => { for (let i = 0; i < 9; i++) bell(3200 * Math.pow(0.9, i), now(i * 0.035), 0.05, 0.25, 0.7); nz({ d: 0.6, vol: 0.09, type: 'highpass', f: 7000, f2: 9000, wet: 0.5 }); },
  bolt: () => { for (let i = 0; i < 7; i++) nz({ t: now(i * 0.03 + rand(0, 0.02)), d: 0.05, vol: 0.3, type: 'highpass', f: rand(2000, 6000), f2: 9000 }); voice({ type: 'sawtooth', f: 1500, f2: 60, d: 0.35, vol: 0.15 }); boom(0.75, 0.05); },
  lamp: () => { ['C5', 'E5', 'G5', 'C6'].forEach((n) => voice({ type: 'triangle', f: hz(m(n)), a: 0.15, d: 0.9, vol: 0.05, wet: 0.7 })); sparkle(6, 0.2, 0.04); },
  whirl: () => { whoosh(250, 4200, 0.45, 0.32); whoosh(4200, 250, 0.45, 0.25, 0.3); },
  double: () => { chime(['C6', 'E6', 'G6', 'C7', 'E7', 'G7'], 0.03, 0.08); sparkle(8, 0.1); },
  // 몬스터
  ink: () => { nz({ d: 0.35, vol: 0.25, f: 900, f2: 120 }); voice({ f: 200, f2: 90, d: 0.2, vol: 0.08 }); },
  beep: () => voice({ type: 'square', f: 1450, d: 0.05, vol: 0.05 }),
  mineBoom: () => { nz({ d: 0.9, vol: 0.65, f: 2200, f2: 50 }); boom(1); voice({ type: 'sawtooth', f: 200, f2: 30, d: 0.6, vol: 0.15 }); },
  crab: () => [0, 0.06].forEach((d) => nz({ t: now(d), d: 0.03, vol: 0.2, type: 'highpass', f: 3000, f2: 5000 })),
  lunge: () => { nz({ d: 0.3, vol: 0.3, f: 700, f2: 120 }); voice({ type: 'sawtooth', f: 90, f2: 60, d: 0.3, vol: 0.12 }); },
};

// ───────── 음악 ─────────
// 16분음표 칸 단위. 드럼: k 킥 · s 스네어 · h 하이햇 · o 열린 햇 · x 킥+햇. 베이스: 1 근음 · 5 5도 · 8 옥타브
// 멜로디: 8분음표 칸, '-' 쉼
const TRACKS = {
  title: { bpm: 90, chords: [['C4', 'E4', 'G4', 'B4'], ['A3', 'C4', 'E4', 'G4'], ['F3', 'A3', 'C4', 'E4'], ['G3', 'B3', 'D4', 'F4']], drums: '....h.......h...', bass: '1.......5.......', arp: true, pad: true },
  map: { bpm: 108, chords: [['F3', 'A3', 'C4'], ['C3', 'E3', 'G3'], ['D3', 'F3', 'A3'], ['Bb2', 'D3', 'F3']], drums: 'k.h.s.h.k.h.s.hh', bass: '1..5..8.1..5..8.', arp: true, pad: true,
    lead: 'A4 - C5 - F5 - E5 C5 D5 - C5 - A4 - G4 - A4 - C5 - F5 - G5 A5 G5 - F5 - D5 - C5 -'.split(' '), leadType: 'triangle' },
  w1: { bpm: 124, chords: [['G3', 'B3', 'D4'], ['E3', 'G3', 'B3'], ['C3', 'E3', 'G3'], ['D3', 'F#3', 'A3']], drums: 'x.h.s.hkx.h.s.hh', bass: '1.1.5.8.1.1.5.8.', arp: true, pad: true,
    lead: 'B4 - D5 G5 - F#5 E5 D5 B4 - G4 - B4 - D5 - C5 - E5 G5 - E5 C5 - D5 - F#5 - A5 G5 F#5 -'.split(' '), leadType: 'square' },
  w2: { bpm: 112, chords: [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4'], ['E3', 'G#3', 'B3']], drums: 'k...s..hk.k.s..h', bass: '1...1.5.1...8.5.', arp: true, pad: true, arpHigh: true,
    lead: 'E5 - - C5 - A4 - - F5 - - E5 C5 - - - D5 - - B4 - G4 - - E5 - - G#5 B5 - - -'.split(' '), leadType: 'triangle' },
  w3: { bpm: 134, chords: [['E3', 'G3', 'B3'], ['C3', 'E3', 'G3'], ['D3', 'F#3', 'A3'], ['B2', 'D#3', 'F#3']], drums: 'x.hkshhkx.hks.ho', bass: '1.8.1.8.1.8.5.8.', arp: true, pad: true,
    lead: 'E5 G5 B5 - A5 G5 E5 - C5 E5 G5 - F#5 E5 D5 - D5 F#5 A5 - G5 F#5 D5 - D#5 F#5 B5 - A5 - F#5 -'.split(' '), leadType: 'square' },
  boss: { bpm: 152, chords: [['D3', 'F3', 'A3'], ['Bb2', 'D3', 'F3'], ['C3', 'E3', 'G3'], ['A2', 'C#3', 'E3']], drums: 'x.hkx.s.x.hkx.so', bass: '1818181815151515', arp: true, pad: false,
    lead: 'D5 - D5 F5 A5 - G5 F5 Bb4 - D5 - F5 - E5 D5 C5 - E5 G5 C6 - Bb5 G5 A4 - C#5 - E5 - A5 -'.split(' '), leadType: 'sawtooth' },
  ending: { bpm: 86, chords: [['C4', 'E4', 'G4'], ['G3', 'B3', 'D4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4']], drums: '....h.......h..h', bass: '1.......5.......', arp: true, pad: true,
    lead: 'E5 - G5 - C6 - B5 G5 D5 - G5 - B5 - A5 - C5 - E5 - A5 - G5 E5 F5 - A5 - C6 - - -'.split(' '), leadType: 'triangle' },
};
let curTrack = null, trackName = '', mStep = 0, mNext = 0, musicFever = false;
function setMusic(name) { if (name === trackName) return; trackName = name; curTrack = TRACKS[name] || null; mStep = 0; mNext = 0; }
function kick(t) { voice({ f: 160, f2: 45, t, d: 0.26, vol: 0.5, bus: musicBus }); }
function snare(t) { nz({ t, d: 0.16, vol: 0.2, type: 'bandpass', f: 1800, f2: 1200, bus: musicBus }); voice({ type: 'triangle', f: 190, f2: 120, t, d: 0.08, vol: 0.1, bus: musicBus }); }
function hat(t, open) { nz({ t, d: open ? 0.2 : 0.035, vol: 0.06, type: 'highpass', f: 7000, f2: 9000, bus: musicBus }); }
function bassNote(t, mi, dur) { voice({ type: 'sawtooth', f: hz(mi), t, d: dur, vol: 0.13, bus: musicBus, filter: { f: 520, f2: 200 } }); }
function padChord(t, ch, dur) { ch.forEach((mi, i) => voice({ type: 'sawtooth', f: hz(mi), t, a: 0.35, d: dur, vol: 0.018, bus: musicBus, wet: 0.5, detune: i % 2 ? 8 : -8, filter: { f: 1100 } })); }
function pluck(t, mi, vol) { voice({ type: 'triangle', f: hz(mi), t, d: 0.32, vol, bus: musicBus, wet: 0.45 }); voice({ f: hz(mi + 12), t, d: 0.12, vol: vol * 0.3, bus: musicBus, wet: 0.45 }); }
function leadNote(t, mi, dur, type) { voice({ type, f: hz(mi), t, a: 0.01, d: dur, vol: type === 'sawtooth' ? 0.04 : 0.055, bus: musicBus, wet: 0.25, vib: 5, filter: { f: 2600 } }); }
function playStep(s, t, st) {
  const bar = Math.floor(s / 16) % 4, i = s % 16, ch = curTrack.chords[bar].map(m);
  const d = curTrack.drums[i];
  if (d === 'k' || d === 'x') kick(t);
  if (d === 's') snare(t);
  if (d === 'h' || d === 'x' || (musicFever && i % 2 === 1)) hat(t, false);
  if (d === 'o') hat(t, true);
  const b = curTrack.bass[i];
  if (b && b !== '.') bassNote(t, ch[0] - 12 + (b === '5' ? 7 : b === '8' ? 12 : 0), st * 1.7);
  if (i === 0 && curTrack.pad) padChord(t, ch, st * 16);
  if (curTrack.arp && (i % 2 === 0 || musicFever)) {
    const k = Math.floor(s / (musicFever ? 1 : 2)) % (ch.length + 1), note = k === ch.length ? ch[0] + 12 : ch[k];
    pluck(t, note + 12 + (curTrack.arpHigh || musicFever ? 12 : 0), musicFever ? 0.05 : 0.04);
  }
  if (curTrack.lead && i % 2 === 0) { const tok = curTrack.lead[(bar * 8 + i / 2) % curTrack.lead.length]; if (tok && tok !== '-') leadNote(t, m(tok) + (musicFever ? 12 : 0), st * 3, curTrack.leadType || 'square'); }
}
setInterval(() => {
  if (!ac || !curTrack || save.muted || save.musicOff) { mNext = 0; return; }
  if (['pause', 'revive', 'dead', 'bless'].includes(state)) { mNext = 0; return; }
  if (mNext < ac.currentTime) mNext = ac.currentTime + 0.06;
  const st = 60 / (curTrack.bpm * (musicFever ? 1.1 : 1)) / 4;
  while (mNext < ac.currentTime + 0.18) { playStep(mStep, mNext, st); mStep++; mNext += st; }
}, 25);
