import artwork from './creature-art.json' with { type: 'json' };
// Creature names from SRD 5.2.1 (CC BY 4.0); Hebrew labels are our translations.
// Artwork has independent CC0/public-domain notices in public/licenses/ATTRIBUTION.txt.
const originalCreatures = [
  { id: 'bat', name: 'עטלף', english: 'Bat', page: 345, color: 'air', rarity: 'standard' },
  {
    id: 'giant-spider',
    name: 'עכביש ענק',
    english: 'Giant Spider',
    page: 353,
    color: 'earth',
    rarity: 'standard',
  },
  {
    id: 'goblin',
    name: 'לוחם גובלין',
    english: 'Goblin Warrior',
    page: 290,
    color: 'grass',
    rarity: 'standard',
  },
  {
    id: 'skeleton',
    name: 'שלד',
    english: 'Skeleton',
    page: 325,
    color: 'earth',
    rarity: 'standard',
  },
  {
    id: 'animated-armor',
    name: 'שריון מונפש',
    english: 'Animated Armor',
    page: 259,
    color: 'water',
    rarity: 'epic',
  },
  { id: 'ghost', name: 'רוח רפאים', english: 'Ghost', page: 287, color: 'psychic', rarity: 'epic' },
  { id: 'imp', name: 'אימפ', english: 'Imp', page: 300, color: 'fire', rarity: 'legendary' },
  {
    id: 'gelatinous-cube',
    name: 'קובייה ג׳לטינית',
    english: 'Gelatinous Cube',
    page: 286,
    color: 'grass',
    rarity: 'mythical',
  },
];

// Keep these IDs fixed: old numeric rewards must not move when the roster grows.
const legacyIds = originalCreatures.map((creature) => creature.id);
const additionalSrd = [
  ['troll', 'טרול', 'Troll', 333, 'troll', 'grass', 'epic'],
  ['lich', 'ליץ׳', 'Lich', 304, 'lich', 'psychic', 'mythical'],
  [
    'minotaur-skeleton',
    'שלד מינוטאור',
    'Minotaur Skeleton',
    326,
    'minotaur-skeleton',
    'earth',
    'epic',
  ],
  ['stone-golem', 'גולם אבן', 'Stone Golem', 330, 'stone-golem', 'earth', 'epic'],
  [
    'young-red-dragon',
    'דרקון אדום צעיר',
    'Young Red Dragon',
    318,
    'red-dragon',
    'fire',
    'legendary',
  ],
  [
    'young-white-dragon',
    'דרקון לבן צעיר',
    'Young White Dragon',
    340,
    'frost-dragon',
    'water',
    'legendary',
  ],
  ['unicorn', 'חד־קרן', 'Unicorn', 334, 'unicorn', 'fairy', 'mythical'],
  ['pegasus', 'פגסוס', 'Pegasus', 313, 'pegasus', 'air', 'epic'],
  ['griffon', 'גריפון', 'Griffon', 295, 'griffon', 'air', 'epic'],
  ['nightmare', 'סוס בלהות', 'Nightmare', 312, 'nightmare', 'fire', 'legendary'],
  ['cockatrice', 'קוקטריס', 'Cockatrice', 275, 'cockatrice', 'grass', 'standard'],
  ['manticore', 'מנטיקור', 'Manticore', 306, 'manticore', 'earth', 'epic'],
  ['lion', 'אריה', 'Lion', 356, 'lion', 'earth', 'standard'],
  ['brown-bear', 'דוב חום', 'Brown Bear', 346, 'bear', 'earth', 'standard'],
  ['wolf', 'זאב', 'Wolf', 364, 'wolf', 'air', 'standard'],
  ['elephant', 'פיל', 'Elephant', 348, 'elephant', 'earth', 'epic'],
  ['owl', 'ינשוף', 'Owl', 358, 'owl', 'air', 'standard'],
  ['giant-eagle', 'עיט ענק', 'Giant Eagle', 350, 'eagle', 'air', 'epic'],
  ['riding-horse', 'סוס רכיבה', 'Riding Horse', 360, 'horse', 'earth', 'standard'],
  ['boar', 'חזיר בר', 'Boar', 346, 'boar', 'earth', 'standard'],
  ['crocodile', 'תנין', 'Crocodile', 347, 'crocodile', 'water', 'standard'],
  ['deer', 'אייל', 'Deer', 347, 'deer', 'grass', 'standard'],
  ['cat', 'חתול', 'Cat', 346, 'cat', 'air', 'standard'],
  ['frog', 'צפרדע', 'Frog', 348, 'frog', 'water', 'standard'],
].map(([id, name, english, page, asset, color, rarity]) => ({
  id,
  name,
  english,
  page,
  asset,
  color,
  rarity,
  mode: 'srd',
}));
const animals = [
  ['lion', 'אריה'],
  ['bear', 'דוב'],
  ['horse', 'סוס'],
  ['wolf', 'זאב'],
  ['elephant', 'פיל'],
  ['owl', 'ינשוף'],
  ['eagle', 'עיט'],
  ['boar', 'חזיר בר'],
  ['deer', 'אייל'],
  ['crocodile', 'תנין'],
  ['giraffe', 'ג׳ירפה'],
  ['rhinoceros', 'קרנף'],
  ['panda', 'פנדה'],
  ['penguin', 'פינגווין'],
  ['frog', 'צפרדע'],
  ['cat', 'חתול'],
  ['fox', 'שועל'],
  ['rabbit', 'ארנבון'],
  ['duck', 'ברווז'],
  ['chicken', 'תרנגולת'],
  ['swan', 'ברבור'],
  ['peacock', 'טווס'],
  ['macaw', 'תוכי ארה'],
  ['hummingbird', 'קוליברי'],
  ['bat-large', 'עטלף'],
].map(([asset, name], index) => ({
  id: `animal-${asset}`,
  name,
  english: asset === 'bat-large' ? 'Bat' : asset.replaceAll('-', ' '),
  asset,
  color: index % 2 ? 'grass' : 'earth',
  rarity: ['lion', 'elephant', 'eagle', 'rhinoceros'].includes(asset) ? 'epic' : 'standard',
  mode: 'animals',
}));
const mythology = [
  ['dragon', 'דרקון', 'Dragon', 'red-dragon', 'fire', 'standard'],
  ['unicorn', 'חד־קרן', 'Unicorn', 'unicorn', 'fairy', 'standard'],
  ['pegasus', 'פגסוס', 'Pegasus', 'pegasus', 'air', 'standard'],
  ['griffon', 'גריפון', 'Griffon', 'griffon', 'air', 'standard'],
  ['spirit-fox', 'שועל תשעה זנבות', 'Nine-tailed fox', 'spirit-fox', 'psychic', 'epic'],
  ['golem', 'גולם', 'Golem', 'stone-golem', 'earth', 'epic'],
  ['nightmare', 'סוס בלהות', 'Nightmare', 'nightmare', 'fire', 'legendary'],
  ['angel', 'מלאך', 'Angel', 'angel', 'fairy', 'mythical'],
].map(([id, name, english, asset, color, rarity]) => ({
  id: `myth-${id}`,
  name,
  english,
  asset,
  color,
  rarity,
  mode: 'mythology',
}));
const upgraded = {
  bat: 'bat-large',
  goblin: 'goblin-large',
  skeleton: 'skeleton-large',
  'gelatinous-cube': 'gelatinous-cube-large',
};
export const creatures = [
  ...originalCreatures.map((creature) => ({
    ...creature,
    mode: 'srd',
    asset: upgraded[creature.id] ?? creature.id,
  })),
  ...additionalSrd,
  ...mythology,
  ...animals,
];
export const creatureModes = {
  srd: {
    name: 'יצורי SRD',
    description: 'יצורי פנטזיה ובעלי חיים מתוך SRD',
    avatar: 'stone-golem',
    companion: 'troll',
  },
  mythology: {
    name: 'יצורים מיתולוגיים',
    description: 'דרקונים, חדי־קרן וחברים מהאגדות',
    avatar: 'myth-dragon',
    companion: 'myth-spirit-fox',
  },
  animals: {
    name: 'בעלי חיים',
    description: 'אריות, דובים וחברים מהטבע',
    avatar: 'animal-lion',
    companion: 'animal-bear',
  },
};
const creaturesById = new Map(creatures.map((creature) => [creature.id, creature]));
const rosters = new Map(
  Object.keys(creatureModes).map((mode) => [
    mode,
    creatures.filter((creature) => creature.mode === mode),
  ]),
);

export const validMode = (mode) => (Object.hasOwn(creatureModes, mode) ? mode : 'srd');
export const creaturesForMode = (mode) => rosters.get(validMode(mode));

export function creatureId(value) {
  if (creaturesById.has(value)) return value;
  const number = Number(value);
  return legacyIds[Number.isFinite(number) ? Math.abs(Math.trunc(number)) % legacyIds.length : 0];
}

export function creatureCard(id, count = 0) {
  const creature = creaturesById.get(creatureId(id));
  const asset = creature.asset;
  const metadata = artwork[asset];
  const frames = metadata?.frames ?? 0;
  return {
    ...creature,
    frames,
    pixelated: metadata?.pixelated !== false,
    experienced: count >= 2,
    image: `./creatures/${asset}.png`,
    animation: frames ? `./creatures/${asset}-idle.png` : null,
  };
}

export function chooseEncounter(random, previousId, mode = 'srd') {
  const roll = random();
  const rarities = roll < 0.04 ? ['legendary', 'mythical'] : roll < 0.2 ? ['epic'] : ['standard'];
  const pool = creaturesForMode(mode);
  const tier = pool.filter((creature) => rarities.includes(creature.rarity));
  const candidates = (tier.length ? tier : pool).filter((creature) => creature.id !== previousId);
  const choices = candidates.length
    ? candidates
    : pool.filter((creature) => creature.id !== previousId);
  return choices[Math.floor(random() * choices.length)].id;
}
// Keep earned companions fixed; an unanswered round can follow the chosen theme.
export function companionFor(round, mode = 'srd', attemptId = '', answer) {
  if (answer?.creature) return creatureId(answer.creature);
  mode = validMode(mode);
  const answerId = creatureId(round.creature);
  if (creatureCard(answerId).mode === mode) return answerId;
  let seed = 2166136261;
  for (const char of `${attemptId}:${round.id}:${mode}`)
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  return chooseEncounter(random, null, mode);
}
export function migrateCreatureGame(game) {
  const convert = (attempt) => {
    if (!attempt) return attempt;
    return {
      ...attempt,
      rounds: attempt.rounds.map((round) => {
        const { pokemon: oldCreature, ...rest } = round;
        return { ...rest, creature: creatureId(round.creature ?? oldCreature) };
      }),
      answers: (attempt.answers ?? []).map((answer, index) => ({
        ...answer,
        creature: creatureId(
          answer.creature ?? attempt.rounds[index]?.creature ?? attempt.rounds[index]?.pokemon,
        ),
      })),
    };
  };
  const collection = {};
  for (const [id, count] of Object.entries(game.collection ?? {})) {
    if (!Number.isFinite(count) || count < 0) continue;
    const key = creatureId(id);
    collection[key] = (collection[key] ?? 0) + count;
  }
  return {
    ...game,
    creatureMode: validMode(game.creatureMode),
    ...(game.active ? { active: convert(game.active) } : {}),
    history: game.history.map(convert),
    ...(game.collection ? { collection } : {}),
  };
}
