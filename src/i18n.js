// 터틀런 — 언어(한국어 / English). 게임 코드는 한국어 그대로 두고, 화면에 그리는 순간 영어로 바꿔 그린다.
// 사전: src/lang-en.js 의 EN_DICT { 한국어: 영어 } (템플릿은 {0},{1} 자리 표시). 새 글이 생기면 사전에 한 줄 더하면 됨.
// 처음 켤 때 폰 언어가 한국어가 아니면 영어. 설정 › 언어 에서 바꾸면 다시 켜짐.
const LANG = (location.search.match(/[?&]lang=(ko|en)\b/) || [])[1] || save.lang || (/^ko\b/i.test(navigator.language || '') ? 'ko' : 'en'); // ?lang=en 으로 바로 볼 수 있음(스토어 영어 스크린샷)
const isEN = LANG === 'en';
const HAN = /[가-힣]/;
const TR_CACHE = new Map();
let TR_TPL = null, TR_WORDS = null;
function trBuild() {
  TR_TPL = []; TR_WORDS = [];
  for (const k of Object.keys(EN_DICT)) {
    if (/\{\d+\}/.test(k)) { // 템플릿 → 정규식(자리 표시는 아무 글자)
      const idx = []; const re = '^' + k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{(\d+)\\?\}/g, (m, d) => { idx.push(+d); return '([\\s\\S]+?)'; }) + '$';
      try { TR_TPL.push({ re: new RegExp(re), idx, en: EN_DICT[k] }); } catch (e) { /* 무시 */ }
    } else if (k.length >= 2 && k.length <= 16 && EN_DICT[k] !== k) TR_WORDS.push(k);
  }
  TR_TPL.sort((a, b) => b.re.source.length - a.re.source.length); // 더 구체적인 것 먼저
  TR_WORDS.sort((a, b) => b.length - a.length);
}
function tr(s) {
  if (!isEN || typeof s !== 'string' || !HAN.test(s)) return s;
  const hit = TR_CACHE.get(s); if (hit !== undefined) return hit;
  let out = EN_DICT[s];
  if (out === undefined) {
    if (!TR_TPL) trBuild();
    for (const t of TR_TPL) { const m = s.match(t.re); if (m) { out = t.en.replace(/\{(\d+)\}/g, (x, d) => { const i = t.idx.indexOf(+d); return i >= 0 ? tr(m[i + 1]) : x; }); break; } }
  }
  if (out === undefined) { // 이어 붙인 글(「진주 」 + 숫자 등): 아는 낱말을 바꿔 끼움
    out = s; for (const w of TR_WORDS) if (out.includes(w)) out = out.split(w).join(EN_DICT[w]);
    if (HAN.test(out) && window.LAB) (window.TR_MISS = window.TR_MISS || new Set()).add(s);
  }
  if (TR_CACHE.size > 4000) TR_CACHE.clear();
  TR_CACHE.set(s, out);
  return out;
}
// 화면에 글을 그리는 곳(캔버스)에서 바꿔 그림 — 「가」는 글자 높이 재는 데 쓰므로 그대로
if (isEN) {
  for (const fn of ['fillText', 'strokeText', 'measureText']) {
    const orig = CanvasRenderingContext2D.prototype[fn];
    CanvasRenderingContext2D.prototype[fn] = function (t, ...a) { return orig.call(this, t === '가' ? t : tr(String(t)), ...a); };
  }
  document.documentElement.lang = 'en';
}
// 데이터 속 글(이야기·바다 이름·설명 등)을 미리 영어로 — 한 글자씩 나타나는 대사도 영어로 나오게. main.js 가 부름
function i18nData() {
  if (!isEN) return;
  const seen = new Set();
  const walk = (o, depth) => {
    if (!o || typeof o !== 'object' || seen.has(o) || depth > 5) return; seen.add(o);
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string' && HAN.test(v)) { const t = EN_DICT[v]; if (t !== undefined) o[k] = t; }
      else if (v && typeof v === 'object' && !(v instanceof HTMLElement) && !(v instanceof Image)) walk(v, depth + 1);
    }
  };
  for (const get of I18N_DATA) { try { walk(get(), 0); } catch (e) { /* 아직 없는 것 */ } }
}
const I18N_DATA = [() => WORLDS, () => STAGES, () => ENEMIES, () => ITEMS, () => BLESSINGS, () => DIFFS, () => SKINS, () => TREASURES, () => PETS, () => UPS, () => LV_PERKS,
  () => PRINCESS_LETTERS, () => ENDING_TALK, () => FIRST_GIFTS, () => INTRO, () => GEAR, () => RARITY, () => GEAR_KINDS, () => ABIL, () => ACH, () => AM_LINES, () => BOSS_DEF, () => BOSS_LINES,
  () => CHAPTERS, () => CLEAR_LINES, () => COLLECT, () => FEAT, () => GEM_PACKS, () => HIT_TIPS, () => MISSION_TYPES, () => NEED_TXT, () => PASS_PROD, () => POWER_RANKS, () => REACT_WORDS,
  () => SPECIALS, () => STARTER, () => STORY_WHO, () => TAUNTS, () => TRAILS, () => WHO, () => EXCHANGE, () => BOOSTERS, () => BUDDY_ACTS, () => LETTERS];
function setLang(l) { save.lang = l; persist(); location.reload(); }
