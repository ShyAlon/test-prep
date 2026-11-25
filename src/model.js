import fixedTests from './fixed-tests.json' with { type: 'json' };
import { generatePractice } from './question-generator.js';
import { chooseEncounter, migrateCreatureGame } from './creatures.js';

function timestampRandom(timestamp) {
  let seed = (timestamp ^ Math.floor(timestamp / 4294967296)) >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export { fixedTests };

export function createAttempt(limit, timestamp, mode = 'srd', testId = 'practice') {
  const fixed = fixedTests.find(test => test.id === testId);
  const random = timestampRandom(fixed?.seed ?? timestamp);
  limit = fixed?.count ?? limit;
  const generated = fixed ? structuredClone(fixed.questions) : generatePractice(random, limit);
  let previousCreature;
  const rounds = generated.map((question) => {
    const creature = chooseEncounter(random, previousCreature, mode);
    previousCreature = creature;
    return { id: question.id, question, creature };
  });
  return {
    id: timestamp,
    testId,
    rounds,
    index: 0,
    answers: [],
    totalMs: 0,
    questionMs: 0,
  };
}

// Booklet rounds cannot be resumed or reviewed after removing their source.
// Keep the user's generated snapshots, collection and preferences intact.
export function generatedOnlyGame(game) {
  const supported = (attempt) =>
    (attempt?.testId === 'practice' || fixedTests.some(test => test.id === attempt?.testId)) &&
    attempt.rounds?.length > 0 &&
    attempt.rounds.every(
      (round) => round.question && ['generated', 'authored'].includes(round.question.origin),
    );
  return migrateCreatureGame({
    ...game,
    ...(game.active ? { active: supported(game.active) ? game.active : null } : {}),
    history: (game.history ?? []).filter(supported),
  });
}

export function duration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return [minutes, seconds % 60].map((value) => String(value).padStart(2, '0')).join(':');
}

let audio;
export function playFeedback(correct) {
  try {
    audio ??= new AudioContext();
    audio
      .resume()
      .then(() => {
        const notes = correct ? [523.25, 659.25, 783.99, 1046.5] : [392, 329.63, 440];
        notes.forEach((frequency, index) => {
          const start = audio.currentTime + index * 0.11;
          const oscillator = audio.createOscillator();
          const volume = audio.createGain();
          oscillator.type = correct ? 'triangle' : 'sine';
          oscillator.frequency.value = frequency;
          volume.gain.setValueAtTime(0, start);
          volume.gain.linearRampToValueAtTime(0.12, start + 0.018);
          volume.gain.exponentialRampToValueAtTime(0.001, start + 0.21);
          oscillator.connect(volume).connect(audio.destination);
          oscillator.start(start);
          oscillator.stop(start + 0.22);
        });
      })
      .catch(() => {});
  } catch {
    // Keep visual feedback available on browsers without Web Audio.
  }
}

// Submitted answers stay immutable. Only the current unanswered question has a
// draft; carry it with us while the user reviews previously submitted rounds.
export function moveQuestion(attempt, index) {
  const furthest = Math.min(attempt.answers.length, attempt.rounds.length - 1);
  if (!Number.isInteger(index) || index < 0 || index > furthest || index === attempt.index)
    return attempt;
  const pending = attempt.answers[attempt.index]
    ? attempt.pendingQuestion
    : { index: attempt.index, choice: attempt.choice ?? null, ms: attempt.questionMs };
  const answer = attempt.answers[index];
  return {
    ...attempt,
    index,
    pendingQuestion: pending ?? null,
    choice: answer?.choice ?? (pending?.index === index ? pending.choice : null),
    questionMs: answer?.ms ?? (pending?.index === index ? pending.ms : 0),
  };
}
