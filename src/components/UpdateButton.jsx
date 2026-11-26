import React, {useSyncExternalStore} from 'react';
import {appUpdater} from '../pwa-update.js';
import {Button} from './UI.jsx';
const initial={available:false,updating:false,error:''};
export function UpdateButton({beforeUpdate}) {
  const state=useSyncExternalStore(appUpdater.subscribe,appUpdater.getSnapshot,()=>initial);
  if(!state.available&&!state.error)return null;
  return <><Button variant="utility" className="pwa-update" disabled={state.updating} onClick={()=>appUpdater.apply(beforeUpdate)} title="גרסה חדשה מוכנה. שמירת ההתקדמות וטעינה מחדש.">
    <span aria-hidden="true">↻</span> {state.updating?'מעדכנים…':'נדרש עדכון'}
  </Button>{state.error&&<span role="alert" className="update-error">{state.error}</span>}</>;
}
