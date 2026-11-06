import { chooseEncounter } from './pokemon.js';

const storageKey = 'poke-training.v1';

export function readGame() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? { history: [], sound: true };
  } catch {
    return { history: [], sound: true };
  }
}

export function saveGame(game) {
  localStorage.setItem(storageKey, JSON.stringify(game));
}

export async function hashPin(pin, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 150000,
  }, key, 256);
  return Array.from(new Uint8Array(hash)).join('.');
}

function timestampRandom(timestamp) {
  let seed = (timestamp ^ Math.floor(timestamp / 4294967296)) >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function createAttempt(bank, testId, limit, timestamp) {
  const questions = testId === 'mixed'
    ? bank.tests.flatMap(test => test.questions)
    : bank.tests.find(test => test.id === testId).questions;
  const random = timestampRandom(timestamp);
  const order = questions.map(question => question.id);
  for (let index = order.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  let previousPokemon;
  const rounds = order.slice(0, testId === 'mixed' ? limit : undefined).map(id => {
    const pokemon = chooseEncounter(random, previousPokemon);
    previousPokemon = pokemon;
    return { id, pokemon };
  });
  return { id: timestamp, testId, rounds, index: 0, answers: [], totalMs: 0, questionMs: 0 };
}

export function duration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return [minutes, seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
}

let audio;
export function playFeedback(correct) {
  try {
    audio ??= new AudioContext();
    audio.resume().then(() => {
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
    }).catch(() => {});
  } catch {
    // Keep visual feedback available on browsers without Web Audio.
  }
}
