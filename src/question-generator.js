// Templates keep quantities, solution rules and difficulty bounds together.
const integer = (random, min, max) => min + Math.floor(random() * (max - min + 1));
export function shuffle(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const numericalTemplates = [
  {
    id: 'remaining', skill: 'two-step-subtraction', sourceId: '1-3-1',
    sample: r => ({ each: integer(r, 6, 12), first: integer(r, 2, 5), second: integer(r, 2, 5) }),
    prompt: p => `אַלּוֹן וְדָן קִיבְּלוּ ${p.each} עוּגִיּוֹת כׇּל אֶחָד. אַלּוֹן אָכַל ${p.first} עוּגִיּוֹת וְדָן אָכַל ${p.second} עוּגִיּוֹת. כַּמָּה עוּגִיּוֹת נִשְׁאֲרוּ לִשְׁנֵיהֶם יַחַד?`,
    solve: p => 2 * p.each - p.first - p.second,
    explain: p => `מְחַבְּרִים אֶת הַכַּמּוּת שֶׁקִּיבְּלוּ: ${p.each} + ${p.each} = ${2 * p.each}. מְחַסְּרִים אֶת מָה שֶׁאָכְלוּ: ${2 * p.each} − ${p.first} − ${p.second} = ${2 * p.each - p.first - p.second}.`,
  },
  {
    id: 'saving', skill: 'missing-quantity-division', sourceId: '1-3-5',
    sample: r => ({ saved: integer(r, 5, 15), weekly: integer(r, 3, 8), weeks: integer(r, 2, 5) }),
    prompt: p => `לְדָנָה יֵשׁ ${p.saved} שְׁקָלִים. בְּכׇל שָׁבוּעַ הִיא חוֹסֶכֶת ${p.weekly} שְׁקָלִים נוֹסָפִים. כַּמָּה שָׁבוּעוֹת עָלֶיהָ לַחֲסֹוךְ כְּדֵי לִקְנוֹת מִשְׂחָק שֶׁמְּחִירוֹ ${p.saved + p.weekly * p.weeks} שְׁקָלִים?`,
    solve: p => p.weeks,
    explain: p => `חֲסֵרִים ${p.weekly * p.weeks} שְׁקָלִים. בְּכׇל שָׁבוּעַ נֶחֱסָכִים ${p.weekly} שְׁקָלִים, וְלָכֵן ${p.weekly * p.weeks} ÷ ${p.weekly} = ${p.weeks} שָׁבוּעוֹת.`,
  },
  {
    id: 'comparison', skill: 'two-step-comparison', sourceId: '4-3-3',
    sample: r => ({ start: integer(r, 10, 20), more: integer(r, 2, 5), less: integer(r, 3, 7) }),
    prompt: p => `לְגִילָה ${p.start} מַדְבֵּקוֹת. לְסִיגָלִית ${p.more} מַדְבֵּקוֹת יוֹתֵר מִגִּילָה. לְטַלְיָה ${p.less} מַדְבֵּקוֹת פָּחוֹת מִסִּיגָלִית. כַּמָּה מַדְבֵּקוֹת יֵשׁ לְטַלְיָה?`,
    solve: p => p.start + p.more - p.less,
    explain: p => `לְסִיגָלִית ${p.start} + ${p.more} = ${p.start + p.more} מַדְבֵּקוֹת. לְטַלְיָה ${p.start + p.more} − ${p.less} = ${p.start + p.more - p.less}.`,
  },
  {
    id: 'change', skill: 'multiply-and-subtract', sourceId: '1-3-2',
    sample: r => ({ price: integer(r, 3, 7), count: integer(r, 2, 4), change: integer(r, 1, 9) }),
    prompt: p => `מַחְבֶּרֶת עוֹלָה ${p.price} שְׁקָלִים. נֹועָה קָנְתָה ${p.count} מַחְבָּרוֹת וְשִׁילְּמָה ${p.price * p.count + p.change} שְׁקָלִים. כַּמָּה שְׁקָלִים קִיבְּלָה כְּעֹודֶף?`,
    solve: p => p.change,
    explain: p => `הַמַּחְבָּרוֹת עוֹלוֹת ${p.price} × ${p.count} = ${p.price * p.count} שְׁקָלִים. הָעֹודֶף הוּא ${p.price * p.count + p.change} − ${p.price * p.count} = ${p.change} שְׁקָלִים.`,
  },
  ...['+', '−', '×'].map(operation => ({
    id: `arithmetic-${operation}`, skill: 'arithmetic', sourceId: '4-5-1',
    sample: r => ({ a: integer(r, operation === '×' ? 2 : 20, operation === '×' ? 9 : 80), b: integer(r, 2, operation === '×' ? 9 : 19) }),
    prompt: p => `${p.a} ${operation} ${p.b} = __`,
    solve: p => operation === '+' ? p.a + p.b : operation === '−' ? p.a - p.b : p.a * p.b,
    explain: p => `מְחַשְּׁבִים: ${p.a} ${operation} ${p.b} = ${operation === '+' ? p.a + p.b : operation === '−' ? p.a - p.b : p.a * p.b}.`,
    direction: 'ltr',
  })),
  {
    id: 'equation', skill: 'balance-equation', sourceId: '2-1-1',
    sample: r => { const a = integer(r, 3, 9), b = integer(r, 3, 9); return { a, b, c: integer(r, 2, a * b - 2) }; },
    prompt: p => `${p.a} × ${p.b} = __ + ${p.c}`,
    solve: p => p.a * p.b - p.c,
    explain: p => `תְּחִילָּה כּוֹפְלִים: ${p.a} × ${p.b} = ${p.a * p.b}. כְּדֵי לִמְצֹוא אֶת הַמִּסְפָּר הֶחָסֵר מְחַסָרִים: ${p.a * p.b} − ${p.c} = ${p.a * p.b - p.c}.`, direction: 'ltr',
  },
  ...[1, -1].map(sign => ({
    id: `sequence-${sign}`, skill: 'constant-step-sequence', sourceId: sign === 1 ? '1-4-2' : '1-4-1',
    sample: r => ({ start: integer(r, sign === 1 ? 1 : 60, sign === 1 ? 20 : 100), step: sign * integer(r, 2, 10) }),
    prompt: p => `${Array.from({ length: 4 }, (_, i) => p.start + i * p.step).join(', ')}, __`,
    solve: p => p.start + 4 * p.step,
    explain: p => `בְּכׇל צַעַד ${p.step > 0 ? 'מוֹסִיפִים' : 'מְחַסְּרִים'} ${Math.abs(p.step)}. לָכֵן הַמִּסְפָּר הַבָּא הוּא ${p.start + 3 * p.step} ${p.step > 0 ? '+' : '−'} ${Math.abs(p.step)} = ${p.start + 4 * p.step}.`, direction: 'ltr',
  })),
  {
    id: 'alternating', skill: 'alternating-sequence', sourceId: '4-4-4',
    sample: r => ({ start: integer(r, 4, 12), jump: integer(r, 3, 6) }),
    prompt: p => `${p.start}, ${p.start - 1}, ${p.start + p.jump}, ${p.start + p.jump - 1}, ${p.start + 2 * p.jump}, __`,
    solve: p => p.start + 2 * p.jump - 1,
    explain: p => `לְסֵירוּגִין מְחַסְּרִים 1 וּמוֹסִיפִים ${p.jump + 1}. כָּעֵת מְחַסְּרִים 1: ${p.start + 2 * p.jump} − 1 = ${p.start + 2 * p.jump - 1}.`, direction: 'ltr',
  },
  {
    id: 'half', skill: 'part-to-whole', sourceId: '1-3-4',
    sample: r => ({ slices: integer(r, 2, 6) }),
    prompt: p => `חֲצִי עוּגָה מֵכִיל ${p.slices} פְּרוּסוֹת שָׁווֹת. כַּמָּה פְּרוּסוֹת כָּאֵלֶּה יֵשׁ בְּעוּגָה שְׁלֵמָה?`,
    solve: p => 2 * p.slices,
    explain: p => `בְּשָׁלֶם יֵשׁ שְׁנֵי חֲצָאִים, וְלָכֵן ${p.slices} × 2 = ${2 * p.slices} פְּרוּסוֹת.`,
  },
];

export function generateNumerical(template, random, id) {
  const parameters = template.sample(random);
  const value = template.solve(parameters);
  const offsets = shuffle([-10, -2, -1, 1, 2, 10], random);
  const distractors = offsets.map(offset => value + offset).filter(n => n >= 0).slice(0, 3);
  const choices = shuffle([value, ...distractors], random).map(String);
  return { id, templateId: template.id, sourceId: template.sourceId, skill: template.skill,
    difficulty: 'stage-a', origin: 'generated', parameters, prompt: template.prompt(parameters), choices,
    correct: choices.indexOf(String(value)), explanation: template.explain(parameters), direction: template.direction ?? 'auto' };
}

import { readingStories } from './reading-bank.js';

export function generatePractice(random, count) {
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new RangeError('Practice length must be 1–100');
  const questions = [];
  const stories = shuffle(readingStories, random);
  let templates = [];
  const seen = new Set();
  let storyIndex = 0;
  // Keep each reading set together; use about one third reading comprehension.
  const readingCount = count >= 10 ? Math.min(Math.floor(count / 3), readingStories.reduce((sum, story) => sum + story.items.length, 0)) : 0;
  const mathCount = count - readingCount;
  for (let i = 0; i < mathCount; i++) {
    if (!templates.length) templates = shuffle(numericalTemplates, random);
    const template = templates.pop();
    let question;
    let tries = 0;
    do {
      question = generateNumerical(template, random, `generated-${i}`);
      tries++;
    } while (seen.has(question.prompt) && tries < 100);
    if (seen.has(question.prompt)) { i--; continue; }
    seen.add(question.prompt);
    questions.push(question);
  }
  let remaining = readingCount;
  while (remaining > 0) {
    const story = stories[storyIndex++ % stories.length];
    const items = shuffle(story.items, random).slice(0, remaining);
    for (const [skill, prompt, options, explanation] of items) {
      const choices = shuffle(options, random);
      questions.push({ id: `generated-${questions.length}`, templateId: story.id, sourceId: story.sourceId,
        skill, difficulty: 'stage-a', origin: 'authored', prompt, choices, correct: choices.indexOf(options[0]),
        explanation, passage: `story-${story.id}`, passageText: `${story.title}\n\n${story.paragraphs.join('\n\n')}` });
    }
    remaining -= items.length;
  }
  return questions;
}
