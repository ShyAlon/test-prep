import React, { useState } from 'react';
import { creatureModes } from '../creatures.js';
import { PRACTICE_TITLE, countCorrect, formatDate } from '../practice-summary.js';
import { Creature } from './Creature.jsx';
import { AppMark, Button } from './UI.jsx';

export function Home({
  game,
  start,
  resume,
  showResults,
  legacyAvailable,
  importLegacy,
  mode = 'srd',
}) {
  const [practiceLimit, setPracticeLimit] = useState(20);
  return (
    <>
      {legacyAvailable && (
        <section className="legacy-import panel">
          <div>
            <strong>ממשיכים מהאימונים הקודמים</strong>
            <p>נמצאה התקדמות מהגרסה הישנה בדפדפן הזה. אפשר להעביר אותה לחשבון הנוכחי.</p>
          </div>
          <Button variant="text" onClick={importLegacy}>
            העברת ההתקדמות לחשבון הזה
          </Button>
        </section>
      )}
      <section className="hero panel">
        <div className="hero-text">
          <p className="eyebrow">
            <span /> מועדון המאמנים · {creatureModes[mode].name}
          </p>
          <h1>
            מחנה האימונים
            <br />
            <em>של היצורים</em>
          </h1>
          <p>בוחרים את אורך האימון, עונים על שאלות ופוגשים יצור חדש בכל סיבוב!</p>
          {game.active && (
            <Button variant="primary" onClick={resume}>
              ממשיכים את {PRACTICE_TITLE} <span aria-hidden="true">←</span>
            </Button>
          )}
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun" />
          <AppMark className="hero-mark" />
          <Creature id={creatureModes[mode].avatar} className="hero-creature" />
          <Creature id={creatureModes[mode].companion} className="hero-companion" />
          <span className="spark spark-one">✦</span>
          <span className="spark spark-two">✦</span>
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">מפת האימונים</p>
        <h2>בוחרים את האתגר הבא</h2>
        <div className="mixed panel">
          <div className="tile-icon" aria-hidden="true">
            ✨
          </div>
          <div>
            <h3>אימון מתחדש</h3>
            <p>מספרים משתנים, תשובות מחושבות וקטעי קריאה חדשים. השאלות נשמרות להמשך ולחזרה.</p>
          </div>
          <label>
            מספר שאלות
            <select
              id="practice-count"
              defaultValue="20"
              onChange={(event) => setPracticeLimit(Number(event.target.value))}
            >
              {[10, 20, 30, 50, 100].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <Button variant="primary" onClick={() => start(practiceLimit)}>
            לאימון <span aria-hidden="true">←</span>
          </Button>
        </div>
      </section>
      <section className="section history">
        <p className="eyebrow">יומן המאמן</p>
        <h2>האימונים שלי</h2>
        {game.history.length === 0 ? (
          <p className="panel empty">כאן יופיעו התוצאות אחרי האימון הראשון.</p>
        ) : (
          <div className="panel history-list">
            {game.history.map((attempt) => (
              <Button variant="plain" key={attempt.id} onClick={() => showResults(attempt.id)}>
                <div>
                  <strong>{PRACTICE_TITLE}</strong>
                  <small>{formatDate(attempt.finishedAt)}</small>
                </div>
                <b dir="ltr">
                  {countCorrect(attempt)} / {attempt.rounds.length}
                </b>
                <span aria-hidden="true">←</span>
              </Button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
