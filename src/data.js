'use strict';
// 터틀 레이스 — 게임 데이터: 세계·바다(판)·몬스터·아이템·펫·축복 카드·난이도·옷·실력
// 벤치마킹 근거: docs/benchmark.md

// ───────── 세계 3곳 × 바다 10칸 = 30판 ─────────
const WORLDS = [
  { id: 1, name: '산호 바다', music: 'w1', pal: { top: ['#35c8f0', '#1a6fb8'], bot: ['#0a4f9e', '#06244f'], sand: ['#e9d193', '#b89a62'], weed: '#2fb36c', rock: ['#1b6fae', '#0d3566'] } },
  { id: 2, name: '깊은 바다', music: 'w2', pal: { top: ['#2a4fa8', '#150a3c'], bot: ['#0b1440', '#03020f'], sand: ['#5a5f8a', '#2b2542'], weed: '#2f8f8a', rock: ['#1d2a6a', '#0a0b26'] } },
  { id: 3, name: '얼음 불꽃 바다', music: 'w3', pal: { top: ['#8fdcf2', '#4a1c34'], bot: ['#1a4f7a', '#1a0508'], sand: ['#e4f2ff', '#3a2a2a'], weed: '#5fb6c4', rock: ['#5e8fb5', '#2a0f18'] } },
  { id: 4, name: '노을 보물섬 바다', music: 'w1', pal: { top: ['#ffb36b', '#7a2f5a'], bot: ['#c2456a', '#2a0a26'], sand: ['#f2c48a', '#7a4a3a'], weed: '#ff8a5a', rock: ['#a04a6a', '#3a1030'] } },
  { id: 5, name: '심연의 왕궁', music: 'w2', pal: { top: ['#3a2a6a', '#0a0418'], bot: ['#14082e', '#000000'], sand: ['#8a6aa8', '#2a1a3a'], weed: '#b48bff', rock: ['#4a2a7a', '#12051f'] } },
];
const LAST = 50, ENDLESS = 99;
const worldOf = (n) => (n === ENDLESS ? WORLDS[0] : WORLDS[Math.floor((n - 1) / 10)]);
const STAGES = [null,
  // 1. 산호 바다
  { name: '산호초 얕은 바다', tip: '처음엔 빨라서 어려워요. 바다를 건널수록 물살이 느려져요. ? 상자를 먹으면 아이템!' },
  { name: '흔들흔들 해초 숲', tip: '빨간 ! 뒤에 상어가 돌진해요. 꽁꽁 눈꽃이면 얼어붙어요', fresh: 'shark' },
  { name: '난파선 골짜기', tip: '복어는 가까이 가면 부풀어요. 번개 한 방이면 바람이 빠져요', fresh: 'puffer' },
  { name: '해파리 동굴', tip: '빨간 줄 = 곰치 돌진! 거품 방패가 있으면 해파리는 안 아파요', fresh: 'eel' },
  { name: '상어 대장의 바위성', tip: '큰 상어는 질주로 들이받아야 아파해요!', boss: 'shark' },
  { name: '무지개 산호밭', tip: '스치듯 피하면 완벽 회피! 질주가 확 차요' },
  { name: '먹물 골목', tip: '문어가 먹물로 앞을 가려요. 등불을 켜면 걷혀요', fresh: 'octopus' },
  { name: '빛 없는 바다', tip: '깜깜해요! 반짝이는 황금알이 다 진짜는 아니에요...', fresh: 'angler', dark: true },
  { name: '심해 갈림길', tip: '알을 끊기지 않게 먹으면 알 소나기가 내려요', dark: true },
  { name: '대왕 문어의 동굴', tip: '대왕 문어는 먹물과 다리로 공격해요. 등불이 있으면 편해요', boss: 'octopus' },
  // 2. 깊은 바다
  { name: '푸른 낭떠러지', tip: '여기부턴 깊은 바다! 적이 섞여서 나와요' },
  { name: '소용돌이 해협', tip: '소용돌이는 거북이를 빨아들여요. 회오리로 날려 버려요!', fresh: 'whirlpool' },
  { name: '해파리 은하수', tip: '해파리가 잔뜩! 거품 방패를 아껴 두세요' },
  { name: '아귀 마을', tip: '가짜 황금알을 조심! 등불을 켜면 정체가 보여요', dark: true },
  { name: '아귀 대왕의 등불탑', tip: '아귀 대왕은 어둠 속에서 덥석 물어요', boss: 'angler', dark: true },
  { name: '가오리 하늘', tip: '가오리는 크게 물결치며 빨라요. 얼리면 느려져요', fresh: 'ray' },
  { name: '침몰선 무덤', tip: '산호 쉼터에서 고른 카드가 판을 바꿔요' },
  { name: '거꾸로 해류', tip: '소용돌이와 가오리가 같이 와요' },
  { name: '깜깜 미로', tip: '어둠 속 소용돌이를 조심!', dark: true },
  { name: '상어 대장의 복수', tip: '더 빨라진 상어 대장! 질주를 아껴 두세요', boss: 'shark2' },
  // 3. 얼음 불꽃 바다
  { name: '얼음 산호숲', tip: '게는 단단해서 번개가 안 들어요. 커지는 물약으로 밟아요', fresh: 'crab' },
  { name: '눈송이 해류', tip: '물살은 느려도 적은 많아요. 침착하게!' },
  { name: '기뢰 밭', tip: '기뢰는 깜빡이다 터져요. 회오리로 날리거나 방패로 막아요', fresh: 'mine' },
  { name: '열수구 지대', tip: '뜨거운 물기둥 사이로 헤엄쳐요' },
  { name: '대왕 문어의 귀환', tip: '더 화난 대왕 문어! 먹물이 두 배예요', boss: 'octopus2' },
  { name: '불꽃 협곡', tip: '모든 적이 다 나와요. 아이템을 아끼지 마세요' },
  { name: '얼음 동굴', tip: '깜깜한 얼음 동굴. 등불이 최고예요', dark: true },
  { name: '폭풍 바다', tip: '기뢰와 소용돌이가 같이 와요!' },
  { name: '상어왕의 문', tip: '상어왕의 성이 코앞이에요!' },
  { name: '상어왕의 성', tip: '상어왕과 첫 대결! 공주님을 데리고 도망칠지도...', boss: 'king1' },
  // 4. 노을 보물섬 바다
  { name: '노을 산호 해변', tip: '상어왕이 공주님을 데리고 노을 바다로 도망쳤어요!' },
  { name: '청새치 항로', tip: '청새치는 긴 부리로 일직선 돌진! 거품 방패로 튕겨 내요', fresh: 'swordfish' },
  { name: '해적선 무덤', tip: '보물 상자처럼 생긴 ? 상자가 더 자주 나와요' },
  { name: '황금 동굴', tip: '황금알이 반짝반짝! 욕심내다 부딪히지 않게', dark: true },
  { name: '해적 문어 선장', tip: '보물을 지키는 문어 선장! 다리가 세 줄로 와요', boss: 'octopus3' },
  { name: '폭풍 보물섬', tip: '기뢰와 청새치가 같이 와요' },
  { name: '노을 소용돌이', tip: '회오리를 아껴 두세요' },
  { name: '산호 미로', tip: '좁은 길, 침착하게' },
  { name: '보물섬 동굴', tip: '깜깜한 동굴 속 아귀를 조심!', dark: true },
  { name: '아귀 여왕의 보물고', tip: '아귀 여왕이 가짜 황금알을 잔뜩 뿌려요', boss: 'angler2', dark: true },
  // 5. 심연의 왕궁
  { name: '심연의 입구', tip: '마지막 세계! 공주님이 이 깊은 곳에 있어요' },
  { name: '유령 해파리 정원', tip: '유령 해파리는 사라졌다 나타나요. 등불이면 다 보여요', fresh: 'phantom' },
  { name: '무너진 기둥 길', tip: '모든 적이 다 나와요' },
  { name: '빛 없는 회랑', tip: '등불, 등불, 등불!', dark: true },
  { name: '상어 대장의 마지막 결투', tip: '상어 대장이 마지막으로 덤벼요!', boss: 'shark3' },
  { name: '심연의 소용돌이', tip: '소용돌이가 셋 넷!' },
  { name: '얼어붙은 왕좌', tip: '느려도 괜찮아요. 포기만 하지 마세요' },
  { name: '불타는 회랑', tip: '정예 몬스터가 많아요' },
  { name: '왕궁의 문', tip: '공주님 목소리가 들려요!' },
  { name: '상어왕의 왕좌', tip: '최후의 결전! 공주 거북이를 구해요!', boss: 'king' },
];
STAGES[ENDLESS] = { name: '끝없는 바다', tip: '얼마나 멀리 갈 수 있을까요? 갈수록 붐벼요' };

// ───────── 몬스터 11종 (특징·약점 아이템) ─────────
const ENEMIES = {
  jelly: { name: '해파리', hp: 2, intro: 1, trait: '둥둥 떠다니며 쏴요', weak: 'bubble', color: '#ff8fd0' },
  urchin: { name: '성게', hp: 4, intro: 1, trait: '바닥·천장에 박혀 있어요', weak: 'giant', color: '#a36bff' },
  shark: { name: '상어', hp: 3, intro: 2, trait: '! 경고 뒤 돌진해요', weak: 'freeze', color: '#9fc0dc' },
  puffer: { name: '복어', hp: 2, intro: 3, trait: '가까이 가면 부풀어요', weak: 'bolt', color: '#ffd34d' },
  eel: { name: '곰치', hp: 2, intro: 4, trait: '빨간 줄을 따라 쏜살같이', weak: 'freeze', color: '#7fe36b' },
  octopus: { name: '문어', hp: 4, intro: 7, trait: '먹물로 앞을 가려요', weak: 'lamp', color: '#e0679a' },
  angler: { name: '아귀', hp: 4, intro: 8, trait: '가짜 황금알로 꾀어요', weak: 'lamp', color: '#ffb84d', darkOnly: true },
  whirlpool: { name: '소용돌이', hp: 999, intro: 12, trait: '거북이를 빨아들여요', weak: 'whirl', color: '#7cf0ff' },
  ray: { name: '가오리', hp: 3, intro: 16, trait: '크게 물결치며 빨라요', weak: 'freeze', color: '#6f8fd8' },
  crab: { name: '게', hp: 6, intro: 21, trait: '뛰어올라요, 번개가 안 들어요', weak: 'giant', color: '#ff6a4d', armored: true },
  mine: { name: '기뢰', hp: 1, intro: 23, trait: '깜빡이다 펑 터져요', weak: 'whirl', color: '#ff5470' },
  swordfish: { name: '청새치', hp: 2, intro: 32, trait: '긴 부리로 일직선 돌진', weak: 'bubble', color: '#5fa8ff' },
  phantom: { name: '유령 해파리', hp: 3, intro: 42, trait: '사라졌다 나타나요', weak: 'lamp', color: '#c9b8ff' },
};
const ENEMY_KEYS = Object.keys(ENEMIES);

// ───────── 아이템 8종 (? 상자) ─────────
const ITEMS = {
  magnet: { name: '자석 조개', desc: '8초 동안 알을 끌어와요', icon: 'magnet', from: 1, dur: 8 },
  bubble: { name: '거품 방패', desc: '한 번 막고, 해파리는 안 아파요', icon: 'e_shield', from: 1 },
  double: { name: '반짝 별', desc: '10초 동안 알 두 배', icon: 'e_sparkles', from: 2, dur: 10 },
  freeze: { name: '꽁꽁 눈꽃', desc: '5초 동안 적이 얼어요', icon: 'e_snow', from: 3, dur: 5 },
  giant: { name: '커지는 물약', desc: '5초 동안 커져서 다 밟아요', icon: 'e_potion', from: 5, dur: 5 },
  lamp: { name: '등불', desc: '10초 동안 환해져요, 먹물·아귀 약점', icon: 'e_bulb', from: 7, dur: 10 },
  bolt: { name: '번개', desc: '화면 속 적을 한 번에! (게는 빼고)', icon: 'bolt', from: 9 },
  whirl: { name: '회오리', desc: '3초 동안 앞으로 휘몰아쳐요', icon: 'whirl', from: 12, dur: 3 },
};
const ITEM_KEYS = Object.keys(ITEMS);

// ───────── 산호 쉼터 축복 카드 (3장 중 1장) ─────────
const BLESSINGS = [
  { k: 'boost', name: '질주 가득', desc: '질주 게이지를 꽉 채워요', icon: 'e_rocket' },
  { k: 'shield', name: '방패 하나 더', desc: '한 번 더 막아 줘요', icon: 'e_shield' },
  { k: 'magnet', name: '자석 20초', desc: '알이 알아서 와요', icon: 'magnet' },
  { k: 'item', name: '아이템 받기', desc: '빈 칸에 아이템을 넣어 줘요', icon: 'e_gift' },
  { k: 'slow', name: '물살 느리게', desc: '이번 판 물살 10% 느리게', icon: 'e_snow' },
  { k: 'eggs', name: '알 25개', desc: '바로 받아요', icon: 'egg' },
  { k: 'revive', name: '공짜 이어하기', desc: '한 번은 알 없이 일어나요', icon: 'e_sparkles' },
  { k: 'double', name: '알 두 배 15초', desc: '반짝반짝 두 배', icon: 'e_gem' },
];

// ───────── 난이도 ─────────
const DIFFS = [
  { name: '쉬움', speed: 0.85, gap: 1.25, eggs: 0.8, elite: 0, revive: 0.5 },
  { name: '보통', speed: 1, gap: 1, eggs: 1, elite: 0.08, revive: 1 },
  { name: '어려움', speed: 1.12, gap: 0.82, eggs: 1.5, elite: 0.3, revive: 1.5 },
];

// ───────── 옷 · 펫 · 실력 ─────────
const SKINS = [
  { k: 'basic', name: '기본 터틀이', cost: 0 },
  { k: 'raincoat', name: '노란 우비', cost: 60 },
  { k: 'chef', name: '요리사', cost: 120 },
  { k: 'barista', name: '바리스타', cost: 120 },
  { k: 'delivery', name: '택배 기사', cost: 180 },
  { k: 'cape14', name: '히어로 망토', cost: 260 },
  { k: 'suit', name: '사장님 정장', cost: 360 },
  { k: 'crown7', name: '황금 왕관', cost: 600 },
];
const PETS = [
  { k: 'chick', name: '삐약이', perk: (lv) => `알을 ${40 + lv * 20} 거리에서 끌어와요` },
  { k: 'cat', name: '냥이', perk: (lv) => `질주가 ${lv * 5}% 빨리 차요` },
  { k: 'snail', name: '달팽이', perk: (lv) => `물살이 ${lv * 2}% 느려져요` },
  { k: 'sprout', name: '새싹이', perk: (lv) => `알 10개마다 +${lv}` },
  { k: 'whale', name: '고래', perk: (lv) => `판마다 방패 +${lv >= 4 ? 2 : 1}` },
  { k: 'robot', name: '로봇', perk: (lv) => `${9 - lv}초마다 빛으로 적을 물리쳐요` },
  { k: 'penguin', name: '펭펭이', perk: (lv) => `질주가 ${(lv * 0.3).toFixed(1)}초 더 가요` },
  { k: 'puppy', name: '멍멍이', perk: (lv) => `황금알·? 상자가 ${lv * 15}% 더 자주` },
  { k: 'rabbit', name: '토순이', perk: (lv) => `${lv * 5}% 더 빨리 헤엄쳐요` },
];
const HATCH_COST = 150, PET_LV_COST = [60, 120, 240, 480];
const UPS = [
  { k: 'slow', name: '느긋한 등껍질', desc: '물살이 7% 느려져요', max: 5, cost: [15, 35, 70, 120, 200] },
  { k: 'boost', name: '질주 엔진', desc: '질주가 30% 빨리 차요', max: 5, cost: [20, 45, 90, 150, 240] },
  { k: 'shield', name: '거품 방패', desc: '판마다 한 번 막아 줘요', max: 3, cost: [40, 130, 280] },
  { k: 'magnet', name: '알 자석', desc: '가까운 알을 끌어와요', max: 3, cost: [25, 80, 180] },
  { k: 'fire', name: '물방울 연사', desc: '물방울을 더 빨리 쏴요', max: 5, cost: [20, 50, 100, 170, 260] },
  { k: 'power', name: '물방울 위력', desc: '물방울이 더 세져요', max: 5, cost: [30, 70, 130, 210, 320] },
];
// Codex 로 만든 그림 (assets/sprites/*.webp) — 없으면 코드 그림으로
const SPRITES = ['jelly', 'urchin', 'shark', 'puffer', 'eel', 'octopus', 'angler', 'ray', 'crab', 'mine', 'swordfish', 'phantom',
  'boss_shark', 'boss_king', 'boss_octopus', 'boss_pirate', 'boss_angler', 'rock', 'chest', 'ice', 'bg1', 'bg2', 'bg3', 'bg4', 'bg5',
  'map1a', 'map1b', 'map2a', 'map2b', 'map3a', 'map3b', 'map4a', 'map4b', 'map5a', 'map5b', 'castle1', 'castle2', 'castle3', 'castle4', 'castle5', 'node', 'node_lock'];

// ───────── 거북 레벨 (판마다 경험치 → 레벨 업 → 새 능력) ─────────
const LV_PERKS = {
  2: { k: 'heart', name: '하트 +1', desc: '하트가 하나 늘어요', icon: 'heart' },
  3: { k: 'stompEgg', name: '밟기 보너스', desc: '밟을 때마다 알 +1', icon: 'egg' },
  4: { k: 'boostStart', name: '질주 예열', desc: '질주 게이지 25로 시작', icon: 'e_rocket' },
  5: { k: 'triple', name: '삼단 점프', desc: '공중에서 한 번 더 뛰어요', icon: 'e_sparkles' },
  6: { k: 'magnet', name: '알 끌어오기', desc: '가까운 알이 붙어 와요', icon: 'magnet' },
  7: { k: 'heart2', name: '하트 +1', desc: '하트가 또 하나 늘어요', icon: 'heart' },
  8: { k: 'itemTime', name: '아이템 오래', desc: '아이템이 30% 오래가요', icon: 'e_gift' },
  9: { k: 'shockStomp', name: '쿵 충격파', desc: '밟으면 주변 적도 날아가요', icon: 'bolt' },
  10: { k: 'shieldStart', name: '거품 출발', desc: '판마다 방패 하나 들고 시작', icon: 'e_shield' },
  12: { k: 'heart3', name: '하트 +1', desc: '하트가 또또 하나!', icon: 'heart' },
  14: { k: 'letterLuck', name: '글자 자석', desc: '알·소·나·기 글자가 끌려와요', icon: 'magnet' },
  16: { k: 'feverLong', name: '긴 알 소나기', desc: '알 소나기 3초 더', icon: 'e_fire' },
  18: { k: 'reviveCheap', name: '씩씩한 마음', desc: '이어하기 알 반값', icon: 'e_sparkles' },
  20: { k: 'legend', name: '전설의 거북', desc: '모든 알 +20%', icon: 'e_crown' },
};

// ───────── 공주님 편지 (큰 적을 이길 때마다 한 통) ─────────
const PRINCESS_LETTERS = {
  5: '터틀아, 여기까지 와 줬구나. 사실 나도 무서워. 그래도 멀리서 네 발소리가 들리는 것 같아서 힘이 나.',
  10: '깊은 바다는 춥고 깜깜해. 그런데 이상하지? 네가 오고 있다고 생각하면 마음이 따뜻해져.',
  15: '아귀 대왕까지 이겼다고? 다들 느림보라고 놀리던 그 터틀이 맞니? 정말 멋있어.',
  20: '상어 대장이 투덜대더라. 「저 거북이는 넘어져도 또 일어나」래. 응, 그게 내가 아는 터틀이야.',
  25: '오늘 창밖으로 알 소나기가 반짝이는 걸 봤어. 혹시 너였니? 혼자 웃었어.',
  30: '미안해, 상어왕이 나를 또 데려가. 그래도 이번엔 안 울 거야. 네가 꼭 올 거니까.',
  35: '노을 바다 정말 예쁘다. 나중에 같이 보자. 꼭, 같이.',
  40: '이제 조금만 더. 빨리 오지 않아도 돼. 멈추지만 마. 나 여기서 기다릴게.',
  45: '바다 친구들이 다 네 이름을 불러. 터틀! 터틀! 나도 제일 크게 부르고 있어.',
};
const ENDING_TALK = [
  { who: 'princess', text: '정말 왔구나... 느림보 터틀.' },
  { who: 'hero', text: '늦어서 미안해요. 넘어지고, 또 넘어지고... 그래도 포기는 안 했어요!' },
  { who: 'princess', text: '알아. 편지 쓸 때마다 네가 어디쯤 왔을지 생각했어. 고마워, 터틀.' },
  { who: 'hero', text: '이제 같이 집에 가요. 천천히, 노을 바다도 보면서요!' },
];
