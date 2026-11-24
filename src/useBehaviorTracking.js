import { useEffect, useRef } from 'react';
import { createTracker } from './tracking-core.js';
import { createTrackingSender } from './tracking-transport.js';

function quietly(action) {
  try {
    const result = action();
    if (result?.catch) result.catch(() => {});
    return result;
  } catch { /* Optional telemetry must never break training. */ }
}

export function useBehaviorTracking(user, auth, context) {
  const tracker = useRef(null);
  useEffect(() => {
    let storage;
    try { storage = window.localStorage; } catch { /* memory-only buffer */ }
    const env = import.meta.env;
    // Never send emulator sessions to production Firestore.
    const emulator = env.DEV && env.VITE_FIREBASE_AUTH_EMULATOR_URL;
    const endpoint = env.DEV ? env.VITE_FIREBASE_FIRESTORE_EMULATOR_URL : undefined;
    if (emulator && !endpoint) return;
    let current;
    try {
      current = createTracker({ uid: user.uid, storage,
        send: createTrackingSender(auth, { emulatorUrl: endpoint }),
        active: !document.hidden && document.hasFocus() });
    } catch { return; }
    const flush = force => quietly(() => current.flush({ force }));
    tracker.current = current;
    quietly(() => current.enter(context));
    const visibility = () => quietly(() => {
      current.setActive(!document.hidden && document.hasFocus());
      if (document.hidden) flush(true);
    });
    const pagehide = () => quietly(() => { current.setActive(false); flush(true); });
    const pageshow = () => quietly(() => current.setActive(!document.hidden && document.hasFocus()));
    const online = () => flush(true);
    const interval = setInterval(() => flush(false), 30000);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('freeze', pagehide);
    document.addEventListener('resume', pageshow);
    window.addEventListener('focus', visibility);
    window.addEventListener('blur', visibility);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('pageshow', pageshow);
    window.addEventListener('online', online);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('freeze', pagehide);
      document.removeEventListener('resume', pageshow);
      window.removeEventListener('focus', visibility);
      window.removeEventListener('blur', visibility);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', pageshow);
      window.removeEventListener('online', online);
      quietly(() => current.stop());
      tracker.current = null;
    };
    // The account owns the tracker. Context changes are handled separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid, auth]);
  const signature = JSON.stringify(context);
  useEffect(() => { quietly(() => tracker.current?.enter(context)); }, [signature]);
  return {
    track: (type, detail) => quietly(() => tracker.current?.track(type, detail)),
    flush: () => { quietly(() => tracker.current?.flush({ force: true })); },
  };
}
