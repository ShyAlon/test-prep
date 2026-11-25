import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthBoundary } from './Auth.jsx';
import { App } from './App.jsx';
import './style.css';
import { loadLocalTheme } from './theme-database.js';
import { installTheme } from './creatures.js';

// Restore local packs before saved profiles resolve their selected world and rewards.
async function startApp() {
  const theme = await loadLocalTheme();
  if (theme) installTheme(theme);
  createRoot(document.getElementById('root')).render(
    <AuthBoundary>{(user, auth) => <App key={user.uid} user={user} auth={auth} />}</AuthBoundary>,
  );
}
startApp();

// Keep development un-cached; deploy under the current GitHub Pages subdirectory.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
      .catch((error) => console.warn('Offline support could not be enabled.', error.name));
  });
}
