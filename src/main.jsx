import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createAttempt, duration, hashPin, playFeedback, readGame, saveGame } from './model.js';
import bankUrl from './question-bank.json?url';
import './style.css';

const letters = ['א', 'ב', 'ג', 'ד'];
const title = testId => testId === 'mixed' ? 'אימון מעורב' : `מבחן ${testId}`;
const countCorrect = attempt => attempt.answers.filter(answer => answer.correct).length;
const formatDate = timestamp => new Intl.DateTimeFormat('he-IL', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(timestamp);

function Ball({ className = '' }) {
  return <span aria-hidden="true" className={`ball ${className}`}><i /></span>;
}

function Pokemon({ id, className = '' }) {
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
      {!useStill && <source media="(prefers-reduced-motion: no-preference)" srcSet={`${base}/showdown/${id}.gif`} />}
      <img alt="" draggable="false" className={status === 'ready' ? '' : 'loading'}
        onLoad={() => setStatus('ready')} onError={onImageError} src={`${base}/official-artwork/${id}.png`} />
    </picture>}
  </div>;
}

function PinGate({ pin, unlock }) {
  const [value, setValue] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(value)) return setError('הקוד צריך להכיל 4 עד 8 ספרות.');
    if (!pin && confirmation !== value) return setError('הקודים שונים. נסו שוב.');
    setError('');
    setBusy(true);
    try {
      const salt = pin?.salt ?? crypto.randomUUID();
      const hash = await hashPin(value, salt);
      if (pin && pin.hash !== hash) return setError('הקוד שגוי. נסו שוב.');
      unlock({ salt, hash });
    } catch {
      setError('אי אפשר לפתוח את המחנה כרגע. נסו לפתוח את האתר שוב.');
    } finally {
      setBusy(false);
    }
  }
  return <section className="gate panel">
    <Ball className="gate-ball" />
    <p className="eyebrow">שער הכניסה</p>
    <h1>{pin ? 'ברוכים השבים, מאמנים!' : 'פותחים את מחנה האימונים'}</h1>
    <p>{pin ? 'הקלידו את הקוד כדי להיכנס למחנה.' : 'בחרו קוד אישי לפתיחת המחנה בדפדפן הזה.'}</p>
    <form onSubmit={submit}>
      <label htmlFor="pin">קוד כניסה</label>
      <input id="pin" type="password" inputMode="numeric" autoComplete={pin ? 'current-password' : 'new-password'}
        maxLength={8} value={value} onChange={event => setValue(event.target.value)} required dir="ltr" />
      {!pin && <><label htmlFor="confirm">הקלידו את הקוד שוב</label>
        <input id="confirm" type="password" inputMode="numeric" autoComplete="new-password"
          maxLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} required dir="ltr" /></>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}>{pin ? 'כניסה למחנה' : 'שמירת הקוד וכניסה'} <span aria-hidden="true">←</span></button>
    </form>
  </section>;
}

function Home({ game, bank, start, resume, showResults }) {
  const questionCount = bank.tests.reduce((total, test) => total + test.questions.length, 0);
  const [limit, setLimit] = useState(Math.min(20, questionCount));
  return <>
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

function BookletArt({ art, text }) {
  return art ? <img className="booklet-art" src={art.src} width={art.width} height={art.height} alt={text} />
    : <span dir="auto">{text}</span>;
}

function Reference({ question, bank }) {
  if (!question.passage) return null;
  const isPriceList = ['20', '44'].includes(question.passage);
  return <details className="passage" open={isPriceList ? true : undefined}>
    <summary>{isPriceList ? 'המחירון' : 'קטע הקריאה'}</summary>
    <div><BookletArt art={bank.referenceArt?.[question.passage]} text={bank.passages[question.passage]} /></div>
  </details>;
}

function Quiz({ attempt, question, bank, choice, setChoice, submit, next, pause }) {
  const round = attempt.rounds[attempt.index];
  const answer = attempt.answers[attempt.index];
  const last = attempt.index === attempt.rounds.length - 1;
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [round.id]);
  return <>
    <section className="stats panel" aria-label="מדדי אימון">
      <div><span>זמן כולל</span><b dir="ltr">{duration(attempt.totalMs)}</b></div>
      <div><span>זמן לשאלה</span><b dir="ltr">{duration(attempt.questionMs)}</b></div>
      <div><span>תשובות נכונות</span><b dir="ltr">{countCorrect(attempt)} / {attempt.answers.length}</b></div>
    </section>
    <section className="question panel">
      <div className="question-meta"><span>{title(attempt.testId)} · שאלה {attempt.index + 1} מתוך {attempt.rounds.length}</span>
        <button className="text-button" onClick={pause}>שמירה והפסקה</button></div>
      <progress aria-label="התקדמות באימון" max={attempt.rounds.length} value={attempt.answers.length} />
      <div className="question-title">
        <h1 ref={heading} tabIndex={-1}>
          {question.instruction && <span className="instruction">{question.instruction}</span>}
          <BookletArt art={question.promptArt} text={question.prompt} />
        </h1>
        <Pokemon key={round.pokemon} id={round.pokemon} className="round-pokemon" />
      </div>
      <Reference key={round.id} question={question} bank={bank} />
      <fieldset disabled={Boolean(answer)} className="answers" key={round.id}>
        <legend className="visually-hidden">בחירת תשובה</legend>
        {question.choices.map((option, index) => {
          const style = answer && index === question.correct ? 'correct'
            : answer && index === answer.choice ? 'incorrect' : choice === index ? 'selected' : '';
          return <label key={index} className={`answer ${style}`}>
            <input type="radio" name="answer" checked={(answer?.choice ?? choice) === index}
              onChange={() => setChoice(index)} />
            <span className="answer-letter" aria-hidden="true">{letters[index]}</span><BookletArt art={question.choiceArt?.[index]} text={option} />
          </label>;
        })}
      </fieldset>
      {answer && <div role="status" className={`feedback ${answer.correct ? 'win' : 'try'}`}>
        <Pokemon key={answer.correct ? 25 : 133} id={answer.correct ? 25 : 133} />
        <div><strong>{answer.correct ? 'פוקימון נתפס! תשובה נכונה!' : 'איווי איתך! ממשיכים להתאמן.'}</strong>
          {!answer.correct && <p>התשובה הנכונה היא {letters[question.correct]}.</p>}</div>
        {answer.correct && <span className="burst" aria-hidden="true">✧ ✦ ✧</span>}
      </div>}
      <div className="question-actions">
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
        const question = questions.get(round.id);
        const answer = attempt.answers[index];
        return <details key={round.id} className="panel review">
          <summary><span className={answer.correct ? 'check' : 'miss'} aria-hidden="true">{answer.correct ? '✓' : '↻'}</span>
            <strong>שאלה {index + 1}</strong><span dir="ltr">{duration(answer.ms)}</span>
            <span className="visually-hidden">{answer.correct ? 'נכון' : 'ניסיון נוסף'}</span></summary>
          <div className="review-body">
            {question && <><p className="review-prompt"><BookletArt art={question.promptArt} text={question.prompt} /></p>
              <Reference question={question} bank={bank} />
              <p className="review-answer"><b>התשובה שלך</b> <BookletArt art={question.choiceArt?.[answer.choice]} text={question.choices[answer.choice]} /></p>
              <p className="review-answer"><b>התשובה הנכונה</b> <BookletArt art={question.choiceArt?.[question.correct]} text={question.choices[question.correct]} /></p>
              {question.explanation && <p className="explanation">{question.explanation}</p>}</>}
          </div>
        </details>;
      })}</div>
    </section>
  </>;
}

function App({ bank, questions }) {
  const [game, setGame] = useState(readGame);
  const current = useRef(game);
  const [unlocked, setUnlocked] = useState(false);
  const [view, setView] = useState('home');
  const [resultId, setResultId] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const checkpoint = useRef(null);
  const active = game.active;
  const activeId = active?.id;
  const activeIndex = active?.index;

  function update(patch) {
    const updated = { ...current.current, ...patch };
    try {
      saveGame(updated);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    current.current = updated;
    setGame(updated);
  }

  useEffect(() => {
    if (!unlocked || view !== 'quiz' || !activeId) return;
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
  }, [unlocked, view, activeId, activeIndex]);

  function go(nextView) {
    setView(nextView);
    window.scrollTo(0, 0);
  }

  function start(testId, limit) {
    if (active && !window.confirm('יש אימון פתוח. להתחיל אימון חדש במקומו?')) return;
    update({ active: createAttempt(bank, testId, limit, Date.now()) });
    go('quiz');
  }

  function pause() {
    checkpoint.current?.();
    go('home');
  }

  function submit() {
    checkpoint.current?.();
    const attempt = current.current.active;
    if (attempt.choice == null || attempt.answers[attempt.index]) return;
    const question = questions.get(attempt.rounds[attempt.index].id);
    const correct = attempt.choice === question.correct;
    const recorded = { choice: attempt.choice, correct, ms: attempt.questionMs };
    update({ active: { ...attempt, answers: [...attempt.answers, recorded] } });
    if (current.current.sound) playFeedback(correct);
  }

  function next() {
    checkpoint.current?.();
    const attempt = current.current.active;
    if (!attempt?.answers[attempt.index]) return;
    if (attempt.index + 1 < attempt.rounds.length) {
      update({ active: { ...attempt, index: attempt.index + 1, questionMs: 0, choice: null } });
      window.scrollTo(0, 0);
    } else {
      const completed = { ...attempt, finishedAt: Date.now() };
      update({ active: null, history: [completed, ...current.current.history] });
      setResultId(completed.id);
      go('results');
    }
  }

  const question = active && questions.get(active.rounds[active.index].id);
  const result = game.history.find(attempt => attempt.id === resultId);
  return <>
    <header className="topbar"><div className="topbar-inner">
      <button className="brand" onClick={pause}><Ball /><span>פוקימון <small>מחנה האימונים</small></span></button>
      {unlocked && <div className="utilities">
        <button className="utility" type="button" aria-pressed={game.sound}
          onClick={() => update({ sound: !game.sound })}><span aria-hidden="true">{game.sound ? '♫' : '♪'}</span> צליל</button>
        <button className="utility" type="button" onClick={() => { pause(); setUnlocked(false); }}>
          <span aria-hidden="true">◈</span> נעילה</button>
      </div>}
    </div></header>
    <main className="container">
      {storageError && <p className="error panel" role="alert">הדפדפן לא הצליח לשמור את הנתונים. האימון זמין עד סגירת הדף.</p>}
      {!unlocked ? <PinGate pin={game.pin} unlock={pin => { if (!game.pin) update({ pin }); setUnlocked(true); }} />
        : view === 'quiz' && question ? <Quiz attempt={active} question={question} bank={bank}
          choice={active.choice ?? null} setChoice={choice => update({ active: { ...current.current.active, choice } })}
          submit={submit} next={next} pause={pause} />
        : view === 'results' && result ? <Results attempt={result} questions={questions} bank={bank} home={pause} />
        : <Home game={game} bank={bank} start={start} resume={() => go('quiz')} showResults={id => { setResultId(id); go('results'); }} />}
    </main>
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
    root.render(<App bank={bank} questions={questions} />);
  } catch {
    root.render(<main className="container">
      <p className="panel error" role="alert">לא הצלחנו לטעון את השאלות. נסו לרענן את הדף.</p>
    </main>);
  }
}

loadApp();
