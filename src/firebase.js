import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import defaults from './firebase-config.json';

let client;
export function getAuthClient() {
  if (client) return client;
  const env = import.meta.env ?? {};
  const config = {
    ...defaults,
    apiKey: env.VITE_FIREBASE_API_KEY || defaults.apiKey,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaults.authDomain,
    projectId: env.VITE_FIREBASE_PROJECT_ID || defaults.projectId,
    appId: env.VITE_FIREBASE_APP_ID || defaults.appId,
  };
  if (['apiKey', 'authDomain', 'projectId', 'appId'].some(key => !config[key])) {
    throw new Error('Firebase web configuration is incomplete');
  }
  const app = getApps().find(app => app.name === 'training-camp') ?? initializeApp(config, 'training-camp');
  const auth = getAuth(app);
  auth.languageCode = 'he';
  // Emulator routing is available only in the development server.
  if (env.DEV && env.VITE_FIREBASE_AUTH_EMULATOR_URL) {
    connectAuthEmulator(auth, env.VITE_FIREBASE_AUTH_EMULATOR_URL);
  }
  client = auth;
  return client;
}
