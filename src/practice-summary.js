import { fixedTests } from './model.js';
export const PRACTICE_TITLE = 'אימון מתחדש';
export const countCorrect = (attempt) => attempt.answers.filter((answer) => answer.correct).length;
const dateFormat = new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' });
export const formatDate = (timestamp) => dateFormat.format(timestamp);

export const attemptTitle = attempt => fixedTests.find(test => test.id === attempt?.testId)?.title ?? PRACTICE_TITLE;

export function questionType(question) {
  if (question?.passageText || question?.passage) return 'הבנת הנקרא';
  if (question?.origin === 'generated') return 'חשבון';
  return 'תרגול כללי';
}

export function questionTypeIcon(question) {
  const type=questionType(question);
  return type==='חשבון'?'🧮':type==='הבנת הנקרא'?'📖':'🧩';
}
