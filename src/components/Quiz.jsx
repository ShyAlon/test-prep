import React, { useEffect, useRef, useState } from 'react';
import { creatureCard, localTheme } from '../creatures.js';
import { duration } from '../model.js';
import { attemptTitle, countCorrect } from '../practice-summary.js';
import { Creature } from './Creature.jsx';
import { Button } from './UI.jsx';
import { QuestionText, ReadingPassage, TrainerExplanation } from './QuestionContent.jsx';

const letters = ['א', 'ב', 'ג', 'ד'];

export function Quiz({ attempt, question, choice, setChoice, requestHint, pause, companionId }) {
  const themed = creatureCard(companionId).mode === localTheme?.mode;
  const noun = themed ? localTheme.manifest.singular ?? 'יצור' : 'יצור';
  const round = attempt.rounds[attempt.index];
  const answer = attempt.answers[attempt.index];
  const reward = answer?.catchCount ? creatureCard(companionId, answer.catchCount) : null;
  const justAdvanced = reward?.experienced && answer.catchCount === 2;
  const heading = useRef(null);
  const answers = useRef(null);
  const [hint, setHint] = useState(null);
  const highlighted = !answer && hint?.roundId === round.id ? hint.choices : null;

  useEffect(() => {
    if (!hint) return;
    const timeout = setTimeout(() => setHint(null), 2000);
    return () => clearTimeout(timeout);
  }, [hint]);

  function showHint() {
    if (answer || highlighted) return;
    const distractor = requestHint();
    setHint({ roundId: round.id, choices: [question.correct, distractor].sort((a, b) => a - b) });
    answers.current?.scrollIntoView({ block: 'nearest' });
  }

  useEffect(() => {
    heading.current?.focus();
  }, [round.id]);
  return (
    <>
      <section className="stats panel" aria-label="מדדי אימון">
        <div>
          <span>זמן כולל</span>
          <b dir="ltr">{duration(attempt.totalMs)}</b>
        </div>
        <div>
          <span>זמן לשאלה</span>
          <b dir="ltr">{duration(answer?.ms ?? attempt.questionMs)}</b>
        </div>
        <div>
          <span>תשובות נכונות</span>
          <b dir="ltr">
            {countCorrect(attempt)} / {attempt.answers.length}
          </b>
        </div>
        <div>
          <span>רמזים</span>
          <b data-hint-count>{attempt.hintCount ?? 0}</b>
        </div>
      </section>
      <section className="question panel">
        <div className="question-meta">
          <span>
            {attemptTitle(attempt)} · שאלה {attempt.index + 1} מתוך {attempt.rounds.length}
          </span>
          <Button variant="text" onClick={pause}>
            שמירה והפסקה
          </Button>
        </div>
        <progress
          aria-label="התקדמות באימון"
          max={attempt.rounds.length}
          value={attempt.answers.length}
        />
        <div className="question-title">
          <h1 ref={heading} tabIndex={-1}>
            {question.instruction && <span className="instruction">{question.instruction}</span>}
            <QuestionText text={question.prompt} direction={question.direction} />
          </h1>
          <Button
            variant="plain"
            className="round-creature hint-button"
            type="button"
            onClick={showHint}
            disabled={Boolean(answer)}
            aria-disabled={Boolean(highlighted)}
            aria-label={`בקשו רמז מה${noun}`}
          >
            <Creature key={companionId} id={companionId} />
            <span>רמז ✦</span>
          </Button>
        </div>
        <ReadingPassage key={`passage-${round.id}`} question={question} />
        <div className="visually-hidden" aria-live="polite">
          {highlighted &&
            `רמז: אחת מהתשובות ${highlighted.map((index) => letters[index]).join(' או ')} נכונה.`}
        </div>
        <fieldset
          ref={answers}
          disabled={Boolean(answer)}
          className="answers"
          key={`answers-${round.id}`}
        >
          <legend className="visually-hidden">בחירת תשובה</legend>
          {question.choices.map((option, index) => {
            const style =
              answer && index === question.correct
                ? 'correct'
                : answer && index === answer.choice
                  ? 'incorrect'
                  : choice === index
                    ? 'selected'
                    : '';
            return (
              <label
                key={index}
                className={`answer ${style}${highlighted?.includes(index) ? ' hinted' : ''}`}
              >
                <input
                  type="radio"
                  name="answer"
                  checked={(answer?.choice ?? choice) === index}
                  onChange={() => setChoice(index)}
                />
                <span className="answer-letter" aria-hidden="true">
                  {letters[index]}
                </span>
                <QuestionText text={option} />
              </label>
            );
          })}
        </fieldset>
        {answer && (
          <div role="status" className={`feedback ${answer.correct ? 'win' : 'try'}`}>
            <Creature key={companionId} id={companionId} count={answer.catchCount ?? 0} />
            <div>
              <strong>
                {answer.correct
                  ? `${noun} נתפס! תשובה נכונה!`
                  : `${creatureCard(companionId).name} איתך! ממשיכים להתאמן.`}
              </strong>
              {reward && (
                <p>
                  תפסתם את <bdi>{reward.name}</bdi>!
                  {justAdvanced && (
                    <>
                      {' '}
                      ✦ {reward.evolved ? 'התפתח ל־' : 'דרגת חברות חדשה עם '}<bdi>{reward.name}</bdi>!
                    </>
                  )}
                </p>
              )}
              {!answer.correct && (
                <>
                  <p>
                    התשובה שבחרתם: {letters[answer.choice]} —{' '}
                    <QuestionText text={question.choices[answer.choice]} /> (לא נכונה).
                  </p>
                  <p>
                    <strong>
                      התשובה הנכונה: {letters[question.correct]} —{' '}
                      <QuestionText text={question.choices[question.correct]} />.
                    </strong>
                  </p>
                </>
              )}
            </div>
            {answer.correct && (
              <span className="burst" aria-hidden="true">
                ✧ ✦ ✧
              </span>
            )}
          </div>
        )}
        {answer && question.explanation && <TrainerExplanation question={question} noun={noun} />}
      </section>
    </>
  );
}
