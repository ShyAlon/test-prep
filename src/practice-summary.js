export const PRACTICE_TITLE = 'אימון מתחדש';
export const countCorrect = (attempt) => attempt.answers.filter((answer) => answer.correct).length;
const dateFormat = new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' });
export const formatDate = (timestamp) => dateFormat.format(timestamp);
