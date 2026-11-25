import React from 'react';

export function QuestionText({ text, direction = 'auto' }) {
  const parts = text?.split(/([A0-9][A0-9,.]*(?:\s*[+×✕÷:−=*-]\s*(?:[A0-9][A0-9,.]*|__))+)/g);
  return (
    <span className="question-text" dir={direction}>
      {parts?.map((part, index) =>
        index % 2 ? (
          <bdi dir="ltr" key={index}>
            {part}
          </bdi>
        ) : (
          part
        ),
      )}
    </span>
  );
}

export function ReadingPassage({ question }) {
  if (!question.passageText) return null;
  return (
    <details className="passage">
      <summary>קטע הקריאה</summary>
      <div>
        <QuestionText text={question.passageText} />
      </div>
    </details>
  );
}

export function ExplanationContent({ question, className }) {
  return (
    <p className={className}>
      <QuestionText text={question.explanation} />
    </p>
  );
}

export function TrainerExplanation({ question }) {
  const isReading = Boolean(question.passageText);
  return (
    <details className="trainer-explanation">
      <summary>
        <span className="show-explanation">הצגת דרך הפתרון</span>
        <span className="hide-explanation">הסתרת דרך הפתרון</span>
      </summary>
      <div className="trainer-note">
        <span className="trainer-avatar" aria-hidden="true">
          🧢
        </span>
        <div>
          <strong>מאמנת היצור</strong>
          <p>בואו נפתור את זה יחד!</p>
          {isReading && (
            <p className="trainer-approach">
              נזהה מה השאלה מבקשת, נחזור למשפט המתאים בקטע ונבדוק איזו תשובה מתאימה למה שקראנו.
            </p>
          )}
          <ExplanationContent question={question} className="trainer-steps" />
        </div>
      </div>
    </details>
  );
}

export function AnswerText({ question, index, label, className = 'review-answer' }) {
  return (
    <p className={className}>
      {label && <b>{label} </b>}
      <QuestionText text={question.choices[index]} />
    </p>
  );
}
