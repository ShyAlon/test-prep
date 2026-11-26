import { UpdateButton } from './components/UpdateButton.jsx';
import React, { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { getAuthClient } from './firebase.js';
import { authErrorMessage } from './auth-errors.js';
import { AppMark, Brand, Button } from './components/UI.jsx';

export function AuthBoundary({ children }) {
  const [session, setSession] = useState({ status: 'loading', user: null, auth: null });
  useEffect(() => {
    try {
      const auth = getAuthClient();
      return onAuthStateChanged(
        auth,
        (user) => setSession({ status: 'ready', user, auth }),
        () => setSession({ status: 'error', user: null, auth: null }),
      );
    } catch {
      setSession({ status: 'error', user: null, auth: null });
    }
  }, []);
  if (session.status === 'loading')
    return (
      <div className="container">
        <section className="gate panel" role="status">
          <AppMark className="gate-mark" />
          <p>בודקים את החיבור למחנה…</p>
        </section>
      </div>
    );
  if (session.status === 'error')
    return (
      <div className="container">
        <section className="gate panel" role="alert">
          <AppMark className="gate-mark" />
          <h1>הכניסה אינה זמינה כרגע</h1>
          <p>נסו לרענן את העמוד ולבדוק את חיבור האינטרנט.</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            ניסיון נוסף
          </Button>
        </section>
      </div>
    );
  return session.user ? children(session.user, session.auth) : <AuthGate auth={session.auth} />;
}

export function AuthGate({ auth }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const resetNotice =
    'אם קיים חשבון מתאים, יישלח אליו קישור לאיפוס הסיסמה. בדקו גם את תיקיית הספאם.';

  function changeMode(next) {
    setMode(next);
    setPassword('');
    setConfirmation('');
    setError('');
    setNotice('');
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setNotice('');
    if (mode === 'signup' && password !== confirmation) return setError('הסיסמאות שונות. נסו שוב.');
    setBusy(true);
    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email.trim());
        setNotice(resetNotice);
      } else if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (error) {
      if (mode === 'reset' && error.code === 'auth/user-not-found') setNotice(resetNotice);
      else setError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      setError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner auth-brand">
          <Brand />
          <UpdateButton />
        </div>
      </header>
      <main className="container">
        <section className="gate panel auth-gate" aria-labelledby="auth-title">
          <AppMark className="gate-mark" />
          <p className="eyebrow">שער הכניסה</p>
          <h1 id="auth-title">
            {mode === 'signup'
              ? 'מצטרפים למחנה'
              : mode === 'reset'
                ? 'איפוס סיסמה'
                : 'ברוכים השבים, מאמנים!'}
          </h1>
          <p>
            {mode === 'reset'
              ? 'הקלידו את האימייל של החשבון כדי לקבל קישור לאיפוס.'
              : 'נכנסים עם Google או עם אימייל וסיסמה.'}
          </p>
          {mode !== 'reset' && (
            <>
              <Button
                variant="plain"
                className="google-signin"
                type="button"
                onClick={google}
                disabled={busy}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285f4"
                    d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.2 3-7.4Z"
                  />
                  <path
                    fill="#34a853"
                    d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2.1.9-3.4.9-2.6 0-4.9-1.8-5.7-4.2H3v2.6A10 10 0 0 0 12 22Z"
                  />
                  <path
                    fill="#fbbc05"
                    d="M6.3 13.8a6 6 0 0 1 0-3.6V7.6H3a10 10 0 0 0 0 8.8l3.3-2.6Z"
                  />
                  <path
                    fill="#ea4335"
                    d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.6l3.3 2.6C7.1 7.8 9.4 6 12 6Z"
                  />
                </svg>
                המשך עם Google
              </Button>
              <div className="auth-divider">
                <span>או עם אימייל</span>
              </div>
              <div className="auth-modes" role="group" aria-label="כניסה או הרשמה">
                <Button
                  variant="plain"
                  type="button"
                  aria-pressed={mode === 'signin'}
                  onClick={() => changeMode('signin')}
                  disabled={busy}
                >
                  כניסה
                </Button>
                <Button
                  variant="plain"
                  type="button"
                  aria-pressed={mode === 'signup'}
                  onClick={() => changeMode('signup')}
                  disabled={busy}
                >
                  הרשמה
                </Button>
              </div>
            </>
          )}
          <form onSubmit={submit} aria-busy={busy}>
            <label htmlFor="auth-email">אימייל</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="username"
              dir="ltr"
              required
              value={email}
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
            />
            {mode !== 'reset' && (
              <>
                <label htmlFor="auth-password">סיסמה</label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={mode === 'signup' ? 6 : undefined}
                  required
                  dir="ltr"
                  value={password}
                  disabled={busy}
                  aria-describedby={mode === 'signup' ? 'password-guidance' : undefined}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </>
            )}
            {mode === 'signup' && (
              <>
                <small id="password-guidance" className="auth-guidance">
                  לפחות 6 תווים. מומלץ לשלב אותיות, מספרים וסימנים.
                </small>
                <label htmlFor="auth-confirmation">הקלידו את הסיסמה שוב</label>
                <input
                  id="auth-confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  dir="ltr"
                  value={confirmation}
                  disabled={busy}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="auth-notice" role="status">
                {notice}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy
                ? 'רגע, מתחברים…'
                : mode === 'reset'
                  ? 'שליחת קישור לאיפוס'
                  : mode === 'signup'
                    ? 'הרשמה וכניסה למחנה'
                    : 'כניסה למחנה'}{' '}
              <span aria-hidden="true">←</span>
            </Button>
          </form>
          <Button
            variant="text"
            className="auth-reset"
            type="button"
            onClick={() => changeMode(mode === 'reset' ? 'signin' : 'reset')}
            disabled={busy}
          >
            {mode === 'reset' ? 'חזרה לכניסה' : 'שכחתם את הסיסמה?'}
          </Button>
        </section>
      </main>
    </>
  );
}
