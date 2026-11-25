import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthBoundary } from './Auth.jsx';
import { App } from './App.jsx';
import './style.css';

createRoot(document.getElementById('root')).render(
  <AuthBoundary>{(user, auth) => <App key={user.uid} user={user} auth={auth} />}</AuthBoundary>,
);

// Keep development un-cached; deploy under the current GitHub Pages subdirectory.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
      .catch((error) => console.warn('Offline support could not be enabled.', error.name));
  });
}
