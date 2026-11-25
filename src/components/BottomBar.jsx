import React from 'react';
import { Button, ExternalLink } from './UI.jsx';

export function BottomBar({ ref, attempt, previous, next, submit, termsOpen, openTerms }) {
  return (
    <footer ref={ref} className="bottom-bar">
      {attempt && (
        <nav className="question-actions" aria-label="ניווט בין שאלות">
          <Button variant="primary" onClick={previous} disabled={attempt.index === 0}>
            <span aria-hidden="true">→</span> לשאלה הקודמת
          </Button>
          {attempt.answers[attempt.index] ? (
            <Button variant="primary" onClick={next}>
              {attempt.index === attempt.rounds.length - 1 ? 'לתוצאות האימון' : 'לשאלה הבאה'}{' '}
              <span aria-hidden="true">←</span>
            </Button>
          ) : (
            <Button variant="primary" disabled={attempt.choice == null} onClick={submit}>
              בדיקת תשובה <span aria-hidden="true">✓</span>
            </Button>
          )}
        </nav>
      )}
      <p>
        מחנה אימונים לשימוש אישי ·{' '}
        <ExternalLink href="./licenses/ATTRIBUTION.txt">מקורות ורישיונות</ExternalLink> ·{' '}
        <Button
          variant="plain"
          className="terms-link"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={termsOpen}
          onClick={openTerms}
        >
          תנאי שימוש והפצה
        </Button>
      </p>
    </footer>
  );
}
