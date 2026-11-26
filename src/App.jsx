import { UpdateButton } from './components/UpdateButton.jsx';
import { ShareButton } from './components/ShareButton.jsx';
import { createBattle, withChampionSelection, settleChampionLosses } from './battle.js';
import { recruitCreature, strongestRecruit } from './combat-rules.js';
import { creatureCard } from './creatures.js';
import React, { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { createAttempt, moveQuestion, playFeedback, generatedOnlyGame } from './model.js';
import { companionFor, validMode, localTheme } from './creatures.js';
import { countCorrect } from './practice-summary.js';
import { canImportLegacyGame, importLegacyGame, readGame, saveGame } from './profile-storage.js';
import { Magnifier } from './Magnifier.jsx';
import { useBehaviorTracking } from './useBehaviorTracking.js';
import { Brand, Button } from './components/UI.jsx';
import { AvatarMenu } from './components/AvatarMenu.jsx';
import { HelpDialog, TermsDialog, Backpack } from './components/Dialogs.jsx';
import { Home } from './components/Home.jsx';
import { Quiz } from './components/Quiz.jsx';
import { Results } from './components/Results.jsx';
import { BottomBar } from './components/BottomBar.jsx';

export function App({ user, auth }) {
  const topbar = useRef(null);
  const bottomBar = useRef(null);
  useEffect(() => {
    const header = topbar.current;
    const root = document.documentElement;
    const measure = () => {
      root.style.setProperty('--topbar-height', `${header.getBoundingClientRect().height}px`);
      root.style.setProperty(
        '--bottom-bar-height',
        `${bottomBar.current.getBoundingClientRect().height}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(bottomBar.current);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--topbar-height');
      root.style.removeProperty('--bottom-bar-height');
    };
  }, []);
  const [game, setGame] = useState(() => generatedOnlyGame(readGame(user.uid)));
  const [legacyAvailable, setLegacyAvailable] = useState(() => canImportLegacyGame(user.uid));
  const [accountError, setAccountError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const current = useRef(game);
  const [view, setView] = useState('home');
  const [resultId, setResultId] = useState(null);
  const [dialog, setDialog] = useState(null);
  const backpackOpen = dialog === 'backpack';
  const helpOpen = dialog === 'help';
  const termsOpen = dialog === 'terms';
  const [magnifierOpen, setMagnifierOpen] = useState(false);
  const magnifierToggle = useRef(null);
  const [storageError, setStorageError] = useState(false);
  const checkpoint = useRef(null);
  const active = game.active;
  const activeId = active?.id;
  const activeIndex = active?.index;
  const creatureMode = validMode(game.creatureMode);
  const behavior = useBehaviorTracking(user, auth, {
    view: dialog ?? view,
    ...(view === 'quiz' && active
      ? {
          testId: active.testId,
          attemptId: String(active.id),
          questionId: active.rounds[active.index].id,
          questionType: active.rounds[active.index].question.passageText ? 'reading' :
            active.rounds[active.index].question.origin === 'generated' ? 'math' : 'unknown',
          questionIndex: active.index,
          answered: Boolean(active.answers[active.index]),
        }
      : {}),
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

  function start(limit, testId = 'practice') {
    if (active && !window.confirm('יש אימון פתוח. להתחיל אימון חדש במקומו?')) return;
    const attempt = createAttempt(limit, Date.now(), creatureMode, testId);
    behavior.track('test_start', {
      testId: attempt.testId,
      attemptId: String(attempt.id),
      count: attempt.rounds.length,
    });
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
    setDialog(null);
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
      const imported = generatedOnlyGame(importLegacyGame(user.uid));
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
    const question = round.question;
    const distractors = question.choices
      .map((_, index) => index)
      .filter((index) => index !== question.correct);
    behavior.track('hint');
    const distractor =
      attempt.hintDistractors?.[round.id] ??
      distractors[Math.floor(Math.random() * distractors.length)];
    update({
      active: {
        ...attempt,
        hintCount: (attempt.hintCount ?? 0) + 1,
        hintDistractors: { ...attempt.hintDistractors, [round.id]: distractor },
      },
    });
    return distractor;
  }

  function submit() {
    checkpoint.current?.();
    const attempt = current.current.active;
    if (
      attempt.choice == null ||
      attempt.answers[attempt.index] ||
      attempt.index !== attempt.answers.length
    )
      return;
    const round = attempt.rounds[attempt.index];
    const question = round.question;
    const correct = attempt.choice === question.correct;
    behavior.track('answer_submit', { choice: attempt.choice, correct });
    const encountered = companionFor(round, current.current.creatureMode, attempt.id);
    const recorded = {
      choice: attempt.choice,
      correct,
      ms: attempt.questionMs,
      creature: encountered,
    };
    const collection = current.current.collection ?? {};
    if (correct) {
      recorded.catchCount = (collection[encountered] ?? 0) + 1;
      recorded.recruit = recruitCreature(creatureCard(encountered,recorded.catchCount),recorded.ms,question,recorded.catchCount);
    }
    update({
      active: { ...attempt, answers: [...attempt.answers, recorded], pendingQuestion: null },
      ...(correct ? { collection: { ...collection, [encountered]: recorded.catchCount },
        collectionStats: { ...current.current.collectionStats,
          [encountered]:strongestRecruit(current.current.collectionStats?.[encountered],recorded.recruit),
        },
      } : {}),
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
      completed.battle = withChampionSelection(createBattle(completed,creatureMode),current.current.collection,current.current.collectionStats,creatureMode);
      behavior.track('attempt_complete', { count: countCorrect(completed) });
      update({ active: null, history: [completed, ...current.current.history] });
      setResultId(completed.id);
      go('results');
    }
  }

  const question = active && active.rounds[active.index].question;
  const result = game.history.find((attempt) => attempt.id === resultId);
  return (
    <>
      <header ref={topbar} className="topbar">
        <div className="topbar-inner">
          <Brand onClick={pause} theme={creatureMode === localTheme?.mode ? localTheme : null} />
          <div className="utilities">
            <UpdateButton beforeUpdate={()=>{checkpoint.current?.();saveGame(current.current,user.uid);}} />
            <AvatarMenu
              user={user}
              mode={creatureMode}
              changeMode={(mode) => {
                checkpoint.current?.();
                if (!mode.startsWith('local-')) behavior.track('mode_change', { mode });
                update({ creatureMode: mode });
              }}
            />
            <Button
              variant="utility"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={helpOpen}
              onClick={() => {
                checkpoint.current?.();
                setDialog('help');
              }}
            >
              <span aria-hidden="true">?</span> הדרכה
            </Button>
            <Button
              ref={magnifierToggle}
              variant="utility"
              className="magnifier-toggle"
              type="button"
              aria-pressed={magnifierOpen}
              aria-label="זכוכית מגדלת"
              onClick={() => {
                behavior.track('magnifier_toggle', { enabled: !magnifierOpen });
                setMagnifierOpen((open) => !open);
              }}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="6.5" />
                <path d="m15 15 6 6" />
                <path d="M7 8a3 3 0 0 1 3-2" opacity=".6" />
              </svg>
              <span>הגדלה</span>
            </Button>
            <Button
              variant="utility"
              className="backpack-button"
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                checkpoint.current?.();
                behavior.track('backpack_open');
                setDialog('backpack');
              }}
            >
              <span aria-hidden="true">🎒</span> תיק
            </Button>
            <Button
              variant="utility"
              type="button"
              aria-pressed={game.sound}
              onClick={() => {
                behavior.track('sound_toggle', { enabled: !game.sound });
                update({ sound: !game.sound });
              }}
            >
              <span aria-hidden="true">{game.sound ? '♫' : '♪'}</span> צליל
            </Button>
            <ShareButton variant="utility" label="↗ שיתוף" onOpen={() => checkpoint.current?.()} />
            <Button variant="utility" type="button" disabled={signingOut} onClick={logout}>
              <span aria-hidden="true">↪</span> {signingOut ? 'יוצאים…' : 'יציאה'}
            </Button>
          </div>
        </div>
      </header>
      <main
        className="container"
        onToggleCapture={(event) => {
          const details = event.target;
          if (!(details instanceof HTMLDetailsElement)) return;
          const type = details.classList.contains('passage')
            ? 'passage'
            : details.classList.contains('trainer-explanation')
              ? 'explanation'
              : null;
          if (type) behavior.track(`${type}_${details.open ? 'open' : 'close'}`);
        }}
      >
        {storageError && (
          <p className="error panel" role="alert">
            הדפדפן לא הצליח לשמור את הנתונים. האימון זמין עד סגירת הדף.
          </p>
        )}
        {accountError && (
          <p className="error panel" role="alert">
            {accountError}
          </p>
        )}
        {view === 'quiz' && question ? (
          <Quiz
            attempt={active}
            mode={creatureMode}
            showTimers={game.showTimers !== false}
            toggleTimers={() => update({ showTimers: current.current.showTimers === false })}
            question={question}
            companionId={companionFor(
              active.rounds[active.index],
              creatureMode,
              active.id,
              active.answers[active.index],
            )}
            choice={active.choice ?? null}
            setChoice={(choice) => {
              behavior.track('answer_select', { choice });
              update({ active: { ...current.current.active, choice } });
            }}
            requestHint={requestHint}
            pause={pause}
          />
        ) : view === 'results' && result ? (
          <Results key={result.id} attempt={result} home={pause} collection={game.collection} collectionStats={game.collectionStats} mode={creatureMode} sound={game.sound} onBattleChange={battle => {
            const currentGame = current.current;
            const savedBattle = currentGame.history.find(attempt => attempt.id === result.id)?.battle;
            const settled = settleChampionLosses({ ...battle, removedChampionKeys: savedBattle?.removedChampionKeys ?? battle.removedChampionKeys }, currentGame.collection, currentGame.collectionStats);
            update({ collection:settled.collection, collectionStats:settled.collectionStats, history:currentGame.history.map(attempt => attempt.id === result.id ? {...attempt,battle:settled.battle} : attempt) });
          }} />
        ) : (
          <Home
            mode={creatureMode}
            legacyAvailable={
              legacyAvailable &&
              !game.active &&
              !game.history.length &&
              !Object.keys(game.collection ?? {}).length
            }
            importLegacy={importLegacy}
            game={game}
            start={start}
            resume={() => {
              behavior.track('test_resume');
              go('quiz');
            }}
            showResults={(id) => {
              behavior.track('results_open', { attemptId: String(id) });
              setResultId(id);
              go('results');
            }}
          />
        )}
      </main>
      {helpOpen && <HelpDialog close={() => setDialog(null)} />}
      {termsOpen && <TermsDialog close={() => setDialog(null)} />}
      {magnifierOpen && !dialog && (
        <Magnifier
          onClose={() => {
            behavior.track('magnifier_toggle', { enabled: false });
            setMagnifierOpen(false);
            magnifierToggle.current?.focus();
          }}
        />
      )}
      {backpackOpen && (
        <Backpack
          collection={game.collection ?? {}}
          collectionStats={game.collectionStats ?? {}}
          mode={creatureMode}
          close={() => {
            behavior.track('backpack_close');
            setDialog(null);
          }}
        />
      )}
      <BottomBar
        ref={bottomBar}
        attempt={view === 'quiz' && question ? active : null}
        previous={previous}
        next={next}
        submit={submit}
        termsOpen={termsOpen}
        openTerms={() => {
          checkpoint.current?.();
          setDialog('terms');
        }}
      />
    </>
  );
}
