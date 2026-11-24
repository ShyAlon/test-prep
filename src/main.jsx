import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createAttempt, duration, moveQuestion, playFeedback } from './model.js';
import { Magnifier } from './Magnifier.jsx';
import { useBehaviorTracking } from './useBehaviorTracking.js';
import { AuthBoundary } from './Auth.jsx';
import { signOut } from 'firebase/auth';
import { canImportLegacyGame, importLegacyGame, readGame, saveGame } from './profile-storage.js';
import { pokemonCard } from './pokemon.js';
import bankUrl from './question-bank.json?url';
import './style.css';

const letters = ['א', 'ב', 'ג', 'ד'];
const rarityLabels = { epic: 'אפי', legendary: 'אגדי', mythical: 'מיתי' };
const priceListPages = new Set(['20', '44']);
const title = testId => testId === 'practice' ? 'אימון מתחדש' : testId === 'mixed' ? 'אימון מעורב' : `מבחן ${testId}`;
const countCorrect = attempt => attempt.answers.filter(answer => answer.correct).length;
const formatDate = timestamp => new Intl.DateTimeFormat('he-IL', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(timestamp);

function Ball({ className = '' }) {
  return <span aria-hidden="true" className={`ball ${className}`}><i /></span>;
}

function Pokemon({ id, className = '', animated = true }) {
  const [status, setStatus] = useState('loading');
  const [useStill, setUseStill] = useState(false);
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other';

  function onImageError(event) {
    if (event.currentTarget.currentSrc.endsWith('.gif')) {
      setStatus('loading');
      setUseStill(true);
    } else {
      setStatus('failed');
    }
  }

  return <div className={`pokemon ${className}`} aria-hidden="true">
    {status !== 'ready' && <Ball />}
    {status !== 'failed' && <picture>
      {animated && !useStill && <source media="(prefers-reduced-motion: no-preference)" srcSet={`${base}/showdown/${id}.gif`} />}
      <img alt="" draggable="false" className={status === 'ready' ? '' : 'loading'}
        onLoad={() => setStatus('ready')} onError={onImageError} src={`${base}/official-artwork/${id}.png`} />
    </picture>}
  </div>;
}

function Backpack({ collection, close }) {
  const dialog = useRef(null);
  const catches = Object.entries(collection);

  useEffect(() => { dialog.current.showModal(); }, []);

  return <dialog ref={dialog} className="backpack" onClose={close} aria-labelledby="backpack-title">
    <header className="backpack-header">
      <div>
        <p className="eyebrow">אוסף הפוקימונים שלי</p>
        <h2 id="backpack-title">תיק הפוקימונים</h2>
        <p>{catches.length} סוגי פוקימונים באוסף</p>
      </div>
      <button className="text-button" onClick={() => dialog.current.close()}>סגירה</button>
    </header>
    {catches.length === 0
      ? <p className="backpack-empty">התיק עדיין ריק. ענו נכון כדי לתפוס את הפוקימון שמופיע ליד השאלה!</p>
      : <ul className="pokemon-cards">
        {catches.map(([id, count]) => {
          const card = pokemonCard(Number(id), count);
          return <li key={id} className={`pokemon-card card-${card.color} rarity-${card.rarity}`}>
            <div className="card-header"><strong dir="ltr">{card.name}</strong><Ball /></div>
            <div className="card-art">
              {rarityLabels[card.rarity] && <span className="rarity-badge">✦ {rarityLabels[card.rarity]}</span>}
              <Pokemon id={card.id} animated={false} />
            </div>
            <div className="card-caption">
              <span dir="ltr">#{String(card.id).padStart(3, '0')}</span>
              <span>{count} תפיסות</span>
            </div>
            <p>{card.evolved ? <>✦ התפתח מ־<bdi>{card.baseName}</bdi></> :
              card.canEvolve ? 'עוד תפיסה אחת להתפתחות!' : 'ללא התפתחות'}</p>
          </li>;
        })}
      </ul>}
  </dialog>;
}

function Home({ game, bank, start, resume, showResults, legacyAvailable, importLegacy }) {
  const questionCount = bank.tests.reduce((total, test) => total + test.questions.length, 0);
  const [practiceLimit, setPracticeLimit] = useState(20);
  const [limit, setLimit] = useState(Math.min(20, questionCount));
  return <>
    {legacyAvailable && <section className="legacy-import panel">
      <div><strong>ממשיכים מהאימונים הקודמים</strong><p>נמצאה התקדמות מהגרסה הישנה בדפדפן הזה. אפשר להעביר אותה לחשבון הנוכחי.</p></div>
      <button className="text-button" onClick={importLegacy}>העברת ההתקדמות לחשבון הזה</button>
    </section>}
    <section className="hero panel">
      <div className="hero-text">
        <p className="eyebrow"><span /> מועדון המאמנים</p>
        <h1>מחנה האימונים<br /><em>של פוקימון</em></h1>
        <p>בוחרים מסלול, עונים על שאלות ופוגשים פוקימון חדש בכל סיבוב!</p>
        {game.active && <button className="primary" onClick={resume}>ממשיכים את {title(game.active.testId)} <span aria-hidden="true">←</span></button>}
      </div>
      <div className="hero-art" aria-hidden="true"><div className="sun" /><Ball className="hero-ball" />
        <Pokemon id={25} className="hero-pikachu" /><Pokemon id={133} className="hero-eevee" />
        <span className="spark spark-one">✦</span><span className="spark spark-two">✦</span>
      </div>
    </section>
    <section className="section">
      <p className="eyebrow">מפת האימונים</p>
      <h2>בוחרים את האתגר הבא</h2>
      <div className="mixed panel">
        <div className="tile-icon" aria-hidden="true">✨</div>
        <div><h3>אימון מתחדש</h3><p>מספרים משתנים, תשובות מחושבות וקטעי קריאה חדשים. השאלות נשמרות להמשך ולחזרה.</p></div>
        <label>מספר שאלות<select id="practice-count" defaultValue="20" onChange={event => setPracticeLimit(Number(event.target.value))}>
          {[10, 20, 30, 50, 100].map(value => <option key={value}>{value}</option>)}
        </select></label>
        <button className="primary" onClick={() => start('practice', practiceLimit)}>לאימון <span aria-hidden="true">←</span></button>
      </div>
      <div className="mixed panel">
        <div className="tile-icon" aria-hidden="true">⚡</div>
        <div><h3>אימון מעורב</h3><p>שאלות מכל המבחנים, בסדר חדש בכל אימון.</p></div>
        <label>מספר שאלות
          <select value={limit} onChange={event => setLimit(Number(event.target.value))}>
            {[10, 20, 30].filter(value => value < questionCount).map(value => <option key={value}>{value}</option>)}
            <option value={questionCount}>כל השאלות</option>
          </select>
        </label>
        <button className="primary" onClick={() => start('mixed', limit)}>לאימון <span aria-hidden="true">←</span></button>
      </div>
      <div className="test-grid">
        {bank.tests.map(test => <button key={test.id} className="test-card panel" onClick={() => start(test.id)}>
          <Ball /><strong>{title(test.id)}</strong><small>{test.questions.length} שאלות</small>
        </button>)}
      </div>
    </section>
    <section className="section history">
      <p className="eyebrow">יומן המאמן</p>
      <h2>האימונים שלי</h2>
      {game.history.length === 0 ? <p className="panel empty">כאן יופיעו התוצאות אחרי האימון הראשון.</p> :
        <div className="panel history-list">{game.history.map(attempt => <button key={attempt.id} onClick={() => showResults(attempt.id)}>
          <div><strong>{title(attempt.testId)}</strong><small>{formatDate(attempt.finishedAt)}</small></div>
          <b dir="ltr">{countCorrect(attempt)} / {attempt.rounds.length}</b><span aria-hidden="true">←</span>
        </button>)}</div>}
    </section>
  </>;
}

function QuestionText({ text, direction = 'auto' }) {
  const parts = text?.split(/([A0-9][A0-9,.]*(?:\s*[+×✕÷:−=*-]\s*(?:[A0-9][A0-9,.]*|__))+)/g);
  return <span className="question-text" dir={direction}>{parts?.map((part, index) =>
    index % 2 ? <bdi dir="ltr" key={index}>{part}</bdi> : part)}</span>;
}

function Reference({ question, bank, answered = false }) {
  if (!question.passage) return null;
  const isPriceList = priceListPages.has(question.passage);
  return <details className="passage" open={isPriceList && !answered ? true : undefined}>
    <summary>{isPriceList ? 'המחירון' : 'קטע הקריאה'}</summary>
    <div><QuestionText text={question.passageText ?? bank.passages[question.passage]} /></div>
  </details>;
}

function ExplanationContent({ question, className }) {
  return <p className={className}><QuestionText text={question.explanation} /></p>;
}

function TrainerExplanation({ question }) {
  const isReading = question.passage && !priceListPages.has(question.passage);
  return <details className="trainer-explanation">
    <summary>
      <span className="show-explanation">הצגת דרך הפתרון</span>
      <span className="hide-explanation">הסתרת דרך הפתרון</span>
    </summary>
    <div className="trainer-note">
      <span className="trainer-avatar" aria-hidden="true">🧢</span>
      <div>
        <strong>מאמנת הפוקימון</strong>
        <p>בואו נפתור את זה יחד!</p>
        {isReading && <p className="trainer-approach">נזהה מה השאלה מבקשת, נחזור למשפט המתאים בקטע ונבדוק איזו תשובה מתאימה למה שקראנו.</p>}
        <ExplanationContent question={question} className="trainer-steps" />
      </div>
    </div>
  </details>;
}

function Quiz({ attempt, question, bank, choice, setChoice, requestHint, submit, next, previous, pause }) {
  const round = attempt.rounds[attempt.index];
  const answer = attempt.answers[attempt.index];
  const last = attempt.index === attempt.rounds.length - 1;
  const reward = answer?.catchCount ? pokemonCard(round.pokemon, answer.catchCount) : null;
  const justEvolved = reward?.evolved && answer.catchCount === 2;
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

  useEffect(() => { heading.current?.focus(); }, [round.id]);
  return <>
    <section className="stats panel" aria-label="מדדי אימון">
      <div><span>זמן כולל</span><b dir="ltr">{duration(attempt.totalMs)}</b></div>
      <div><span>זמן לשאלה</span><b dir="ltr">{duration(answer?.ms ?? attempt.questionMs)}</b></div>
      <div><span>תשובות נכונות</span><b dir="ltr">{countCorrect(attempt)} / {attempt.answers.length}</b></div>
      <div><span>רמזים</span><b data-hint-count>{attempt.hintCount ?? 0}</b></div>
    </section>
    <section className="question panel">
      <div className="question-meta"><span>{title(attempt.testId)} · שאלה {attempt.index + 1} מתוך {attempt.rounds.length}</span>
        <button className="text-button" onClick={pause}>שמירה והפסקה</button></div>
      <progress aria-label="התקדמות באימון" max={attempt.rounds.length} value={attempt.answers.length} />
      <div className="question-title">
        <h1 ref={heading} tabIndex={-1}>
          {question.instruction && <span className="instruction">{question.instruction}</span>}
          <QuestionText text={question.prompt} direction={question.direction} />
        </h1>
        <button className="round-pokemon hint-button" type="button" onClick={showHint} disabled={Boolean(answer)}
          aria-disabled={Boolean(highlighted)} aria-label="בקשו רמז מהפוקימון">
          <Pokemon key={round.pokemon} id={round.pokemon} />
          <span>רמז ✦</span>
        </button>
      </div>
      <Reference key={`${round.id}-${Boolean(answer)}`} question={question} bank={bank} answered={Boolean(answer)} />
      <div className="visually-hidden" aria-live="polite">
        {highlighted && `רמז: אחת מהתשובות ${highlighted.map(index => letters[index]).join(' או ')} נכונה.`}
      </div>
      <fieldset ref={answers} disabled={Boolean(answer)} className="answers" key={round.id}>
        <legend className="visually-hidden">בחירת תשובה</legend>
        {question.choices.map((option, index) => {
          const style = answer && index === question.correct ? 'correct'
            : answer && index === answer.choice ? 'incorrect' : choice === index ? 'selected' : '';
          return <label key={index} className={`answer ${style}${highlighted?.includes(index) ? ' hinted' : ''}`}>
            <input type="radio" name="answer" checked={(answer?.choice ?? choice) === index}
              onChange={() => setChoice(index)} />
            <span className="answer-letter" aria-hidden="true">{letters[index]}</span><QuestionText text={option} />
          </label>;
        })}
      </fieldset>
      {answer && <div role="status" className={`feedback ${answer.correct ? 'win' : 'try'}`}>
        <Pokemon key={reward?.id ?? (answer.correct ? 25 : 133)} id={reward?.id ?? (answer.correct ? 25 : 133)} />
        <div><strong>{answer.correct ? 'פוקימון נתפס! תשובה נכונה!' : 'איווי איתך! ממשיכים להתאמן.'}</strong>
          {reward && <p>תפסתם את <bdi>{reward.baseName}</bdi>!
            {justEvolved && <> ✦ הוא התפתח ל־<bdi>{reward.name}</bdi>!</>}
          </p>}
          {!answer.correct && <p>התשובה הנכונה היא {letters[question.correct]}.</p>}</div>
        {answer.correct && <span className="burst" aria-hidden="true">✧ ✦ ✧</span>}
      </div>}
      {answer && question.explanation && <TrainerExplanation question={question} />}
      <div className="question-actions">
        <button className="text-button" onClick={previous} disabled={attempt.index === 0}>
          <span aria-hidden="true">→</span> לשאלה הקודמת
        </button>
        {answer ? <button className="primary" onClick={next}>{last ? 'לתוצאות האימון' : 'לשאלה הבאה'} <span aria-hidden="true">←</span></button>
          : <button className="primary" disabled={choice === null} onClick={submit}>בדיקת תשובה <span aria-hidden="true">✓</span></button>}
      </div>
    </section>
  </>;
}

function Results({ attempt, questions, bank, home }) {
  return <>
    <section className="result-hero panel">
      <Pokemon id={25} className="result-pokemon" />
      <div><p className="eyebrow">{title(attempt.testId)}</p><h1>האימון הושלם!</h1>
        <p>{formatDate(attempt.finishedAt)}</p>
        <div className="result-metrics"><span><b dir="ltr">{countCorrect(attempt)} / {attempt.rounds.length}</b> נכונות</span>
          <span><b dir="ltr">{duration(attempt.totalMs)}</b> זמן כולל</span></div>
        <button className="primary" onClick={home}>חזרה למחנה <span aria-hidden="true">←</span></button></div>
    </section>
    <section className="section"><p className="eyebrow">יומן המאמן</p><h2>עוברים על התשובות</h2>
      <div className="review-list">{attempt.rounds.map((round, index) => {
        const question = round.question ?? questions.get(round.id);
        const answer = attempt.answers[index];
        return <details key={round.id} className="panel review">
          <summary><span className={answer.correct ? 'check' : 'miss'} aria-hidden="true">{answer.correct ? '✓' : '↻'}</span>
            <strong>שאלה {index + 1}</strong><span dir="ltr">{duration(answer.ms)}</span>
            <span className="visually-hidden">{answer.correct ? 'נכון' : 'ניסיון נוסף'}</span></summary>
          <div className="review-body">
            {question && <><p className="review-prompt"><QuestionText text={question.prompt} direction={question.direction} /></p>
              <Reference question={question} bank={bank} />
              <p className="review-answer"><b>התשובה שלך</b> <QuestionText text={question.choices[answer.choice]} /></p>
              <p className="review-answer"><b>התשובה הנכונה</b> <QuestionText text={question.choices[question.correct]} /></p>
              {question.explanation && <ExplanationContent question={question} className="explanation" />}</>}
          </div>
        </details>;
      })}</div>
    </section>
  </>;
}

function App({ bank, questions, user, auth }) {
  const [game, setGame] = useState(() => readGame(user.uid));
  const [legacyAvailable, setLegacyAvailable] = useState(() => canImportLegacyGame(user.uid));
  const [accountError, setAccountError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const current = useRef(game);
  const [view, setView] = useState('home');
  const [resultId, setResultId] = useState(null);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [magnifierOpen, setMagnifierOpen] = useState(false);
  const magnifierToggle = useRef(null);
  const [storageError, setStorageError] = useState(false);
  const checkpoint = useRef(null);
  const active = game.active;
  const activeId = active?.id;
  const activeIndex = active?.index;
  const behavior = useBehaviorTracking(user, auth, {
    view: backpackOpen ? 'backpack' : view,
    ...(view === 'quiz' && active ? { testId: active.testId, attemptId: String(active.id),
      questionId: active.rounds[active.index].id, questionIndex: active.index,
      answered: Boolean(active.answers[active.index]) } : {}),
    ...(view === 'results' && resultId ? { attemptId: String(resultId) } : {}),
  });

  function update(patch) {
    const updated = { ...current.current, ...patch };
    try {
      saveGame(updated, user.uid);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    current.current = updated;
    setGame(updated);
  }

  useEffect(() => {
    if (view !== 'quiz' || !activeId || backpackOpen) return;
    let since = document.hidden ? null : performance.now();
    function recordTime() {
      if (since === null) return;
      const now = performance.now();
      const elapsed = Math.round(now - since);
      since = now;
      const attempt = current.current.active;
      if (elapsed && attempt?.id === activeId && attempt.index === activeIndex) {
        const questionMs = attempt.questionMs + (attempt.answers[activeIndex] ? 0 : elapsed);
        update({ active: { ...attempt, totalMs: attempt.totalMs + elapsed, questionMs } });
      }
    }
    function visibility() {
      if (document.hidden) {
        recordTime();
        since = null;
      } else if (since === null) {
        since = performance.now();
      }
    }
    checkpoint.current = recordTime;
    const interval = setInterval(recordTime, 1000);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', recordTime);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', recordTime);
      checkpoint.current = null;
    };
  }, [view, activeId, activeIndex, backpackOpen]);

  function go(nextView) {
    setView(nextView);
    window.scrollTo(0, 0);
  }

  function start(testId, limit) {
    if (active && !window.confirm('יש אימון פתוח. להתחיל אימון חדש במקומו?')) return;
    const attempt = createAttempt(bank, testId, limit, Date.now());
    behavior.track('test_start', { testId, attemptId: String(attempt.id), count: attempt.rounds.length });
    update({ active: attempt });
    go('quiz');
  }

  function pause() {
    checkpoint.current?.();
    go('home');
  }

  async function logout() {
    if (signingOut) return;
    behavior.track('logout');
    behavior.flush();
    pause();
    setMagnifierOpen(false);
    setBackpackOpen(false);
    setAccountError('');
    setSigningOut(true);
    try {
      await signOut(auth);
    } catch {
      setAccountError('לא הצלחנו לצאת מהחשבון. נסו שוב.');
      setSigningOut(false);
    }
  }

  function importLegacy() {
    try {
      const imported = importLegacyGame(user.uid);
      current.current = imported;
      setGame(imported);
      setLegacyAvailable(false);
      behavior.track('legacy_import');
      setAccountError('');
    } catch {
      setAccountError('לא הצלחנו להעביר את ההתקדמות. הנתונים הקודמים נשארו בדפדפן.');
    }
  }

  function requestHint() {
    const attempt = current.current.active;
    const round = attempt.rounds[attempt.index];
    const question = round.question ?? questions.get(round.id);
    const distractors = question.choices.map((_, index) => index).filter(index => index !== question.correct);
    behavior.track('hint');
    const distractor = attempt.hintDistractors?.[round.id] ?? distractors[Math.floor(Math.random() * distractors.length)];
    update({ active: {
      ...attempt,
      hintCount: (attempt.hintCount ?? 0) + 1,
      hintDistractors: { ...attempt.hintDistractors, [round.id]: distractor },
    } });
    return distractor;
  }

  function submit() {
    checkpoint.current?.();
    const attempt = current.current.active;
    if (attempt.choice == null || attempt.answers[attempt.index] || attempt.index !== attempt.answers.length) return;
    const round = attempt.rounds[attempt.index];
    const question = round.question ?? questions.get(round.id);
    const correct = attempt.choice === question.correct;
    behavior.track('answer_submit', { choice: attempt.choice, correct });
    const recorded = { choice: attempt.choice, correct, ms: attempt.questionMs };
    const collection = current.current.collection ?? {};
    if (correct) recorded.catchCount = (collection[round.pokemon] ?? 0) + 1;
    update({
      active: { ...attempt, answers: [...attempt.answers, recorded], pendingQuestion: null },
      ...(correct ? { collection: { ...collection, [round.pokemon]: recorded.catchCount } } : {}),
    });
    if (current.current.sound) playFeedback(correct);
  }

  function previous() {
    checkpoint.current?.();
    const attempt = current.current.active;
    behavior.track('previous');
    update({ active: moveQuestion(attempt, attempt.index - 1) });
    window.scrollTo(0, 0);
  }

  function next() {
    checkpoint.current?.();
    const attempt = current.current.active;
    if (!attempt?.answers[attempt.index]) return;
    behavior.track('next');
    if (attempt.index + 1 < attempt.rounds.length) {
      update({ active: moveQuestion(attempt, attempt.index + 1) });
      window.scrollTo(0, 0);
    } else {
      const completed = { ...attempt, finishedAt: Date.now() };
      behavior.track('attempt_complete', { count: countCorrect(completed) });
      update({ active: null, history: [completed, ...current.current.history] });
      setResultId(completed.id);
      go('results');
    }
  }

  const question = active && (active.rounds[active.index].question ?? questions.get(active.rounds[active.index].id));
  const result = game.history.find(attempt => attempt.id === resultId);
  return <>
    <header className="topbar"><div className="topbar-inner">
      <button className="brand" onClick={pause}><Ball /><span>פוקימון <small>מחנה האימונים</small></span></button>
      <div className="utilities">
        <span className="account-name" title={user.email ?? user.displayName ?? ''}>{user.displayName || user.email || 'מאמן'}</span>
        <button ref={magnifierToggle} className="utility magnifier-toggle" type="button"
          aria-pressed={magnifierOpen} aria-label="זכוכית מגדלת"
          onClick={() => { behavior.track('magnifier_toggle', { enabled: !magnifierOpen }); setMagnifierOpen(open => !open); }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="10" cy="10" r="6.5" /><path d="m15 15 6 6" /><path d="M7 8a3 3 0 0 1 3-2" opacity=".6" />
          </svg><span>הגדלה</span>
        </button>
        <button className="utility backpack-button" type="button" aria-haspopup="dialog" onClick={() => {
          checkpoint.current?.();
          behavior.track('backpack_open');
          setBackpackOpen(true);
        }}><span aria-hidden="true">🎒</span> תיק</button>
        <button className="utility" type="button" aria-pressed={game.sound}
          onClick={() => { behavior.track('sound_toggle', { enabled: !game.sound }); update({ sound: !game.sound }); }}><span aria-hidden="true">{game.sound ? '♫' : '♪'}</span> צליל</button>
        <button className="utility" type="button" disabled={signingOut} onClick={logout}>
          <span aria-hidden="true">↪</span> {signingOut ? 'יוצאים…' : 'יציאה'}
        </button>
      </div>
    </div></header>
    <main className="container" onToggleCapture={event => {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement)) return;
      const type = details.classList.contains('passage') ? 'passage' : details.classList.contains('trainer-explanation') ? 'explanation' : null;
      if (type) behavior.track(`${type}_${details.open ? 'open' : 'close'}`);
    }}>
      {storageError && <p className="error panel" role="alert">הדפדפן לא הצליח לשמור את הנתונים. האימון זמין עד סגירת הדף.</p>}
      {accountError && <p className="error panel" role="alert">{accountError}</p>}
      {view === 'quiz' && question ? <Quiz attempt={active} question={question} bank={bank}
          choice={active.choice ?? null} setChoice={choice => { behavior.track('answer_select', { choice }); update({ active: { ...current.current.active, choice } }); }}
          requestHint={requestHint} submit={submit} next={next} previous={previous} pause={pause} />
        : view === 'results' && result ? <Results attempt={result} questions={questions} bank={bank} home={pause} />
        : <Home legacyAvailable={legacyAvailable && !game.active && !game.history.length && !Object.keys(game.collection ?? {}).length} importLegacy={importLegacy} game={game} bank={bank} start={start} resume={() => { behavior.track('test_resume'); go('quiz'); }} showResults={id => { behavior.track('results_open', { attemptId: String(id) }); setResultId(id); go('results'); }} />}
    </main>
    {magnifierOpen && !backpackOpen && <Magnifier onClose={() => {
      behavior.track('magnifier_toggle', { enabled: false });
      setMagnifierOpen(false);
      magnifierToggle.current?.focus();
    }} />}
    {backpackOpen && <Backpack collection={game.collection ?? {}} close={() => { behavior.track('backpack_close'); setBackpackOpen(false); }} />}
    <footer>מחנה אימונים לשימוש אישי · <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noreferrer">איורי פוקימון דרך PokéAPI</a></footer>
  </>;
}

const root = createRoot(document.getElementById('root'));

async function loadApp() {
  try {
    const response = await fetch(bankUrl);
    if (!response.ok) throw new Error('Could not load question bank');
    const bank = await response.json();
    const questions = new Map(bank.tests.flatMap(test => test.questions).map(question => [question.id, question]));
    root.render(<AuthBoundary>{(user, auth) => <App key={user.uid} user={user} auth={auth} bank={bank} questions={questions} />}</AuthBoundary>);
  } catch {
    root.render(<main className="container">
      <p className="panel error" role="alert">לא הצלחנו לטעון את השאלות. נסו לרענן את הדף.</p>
    </main>);
  }
}

loadApp();
