import { appUpdater } from './pwa-update.js';
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
  const register=()=>appUpdater.start(navigator.serviceWorker,`${import.meta.env.BASE_URL}sw.js`);
  if(document.readyState==='complete')void register();else window.addEventListener('load',register,{once:true});
  window.addEventListener('focus',()=>appUpdater.check());
  window.addEventListener('online',()=>appUpdater.check());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)appUpdater.check();});
  setInterval(()=>{if(!document.hidden)appUpdater.check();},60000);
}
