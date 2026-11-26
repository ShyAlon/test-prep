import {attemptTitle,countCorrect} from './practice-summary.js';
export function shareMessage(attempt) {
  if (!attempt) return 'בואו למחנה האימונים! 🌟 עונים על שאלות, אוספים חברים ויוצאים לקרב היסודות!';
  const correct=countCorrect(attempt),total=attempt.rounds.length;
  const battle=attempt.battle?.phase==='won'?' וגם ניצחתי בקרב היסודות! 🏆':'';
  return `סיימתי את ${attemptTitle(attempt)} במחנה האימונים! 🌟\nעניתי נכון על ${correct} מתוך ${total} שאלות ואספתי ${correct} חברים לצוות.${battle}\nבואו להתאמן ולצאת להרפתקה!`;
}
export function publicAppUrl(location) {
  if(!location||!['http:','https:'].includes(location.protocol))return '';
  return `${location.origin}${location.pathname}`;
}
export async function tryNativeShare(data,navigator=globalThis.navigator) {
  if(!navigator?.share)return 'fallback';
  try{await navigator.share(data);return 'shared';}
  catch(error){return error.name==='AbortError'?'cancelled':'fallback';}
}
