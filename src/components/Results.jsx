import React from 'react';
import { duration } from '../model.js';
import { attemptTitle, countCorrect, formatDate } from '../practice-summary.js';
import { Creature } from './Creature.jsx';
import { Button } from './UI.jsx';
import {
  QuestionText,
  ReadingPassage,
  ExplanationContent,
  AnswerText,
} from './QuestionContent.jsx';

export function Results({ attempt, home }) {
  return (
    <>
      <section className="result-hero panel">
        <Creature
          id={attempt.answers[0]?.creature ?? attempt.rounds[0].creature}
          className="result-creature"
        />
        <div>
          <p className="eyebrow">{attemptTitle(attempt)}</p>
          <h1>האימון הושלם!</h1>
          <p>{formatDate(attempt.finishedAt)}</p>
          <div className="result-metrics">
            <span>
              <b dir="ltr">
                {countCorrect(attempt)} / {attempt.rounds.length}
              </b>{' '}
              נכונות
            </span>
            <span>
              <b dir="ltr">{duration(attempt.totalMs)}</b> זמן כולל
            </span>
          </div>
          <Button variant="primary" onClick={home}>
            חזרה למחנה <span aria-hidden="true">←</span>
          </Button>
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">יומן המאמן</p>
        <h2>עוברים על התשובות</h2>
        <div className="review-list">
          {attempt.rounds.map((round, index) => {
            const question = round.question;
            const answer = attempt.answers[index];
            return (
              <details key={round.id} className="panel review">
                <summary>
                  <span className={answer.correct ? 'check' : 'miss'} aria-hidden="true">
                    {answer.correct ? '✓' : '↻'}
                  </span>
                  <strong>שאלה {index + 1}</strong>
                  <span dir="ltr">{duration(answer.ms)}</span>
                  <span className="visually-hidden">{answer.correct ? 'נכון' : 'ניסיון נוסף'}</span>
                </summary>
                <div className="review-body">
                  {question && (
                    <>
                      <p className="review-prompt">
                        <QuestionText text={question.prompt} direction={question.direction} />
                      </p>
                      <ReadingPassage question={question} />
                      <AnswerText label="התשובה שלך" question={question} index={answer.choice} />
                      <AnswerText
                        label="התשובה הנכונה"
                        question={question}
                        index={question.correct}
                      />
                      {question.explanation && (
                        <ExplanationContent question={question} className="explanation" />
                      )}
                    </>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </>
  );
}
