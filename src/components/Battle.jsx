import React, { useEffect, useRef, useState } from 'react';
import { startBattle, advanceBattle, finishBattle } from '../battle.js';
import { elements } from '../combat-rules.js';
import { battleSound } from '../battle-audio.js';
import { Creature } from './Creature.jsx';
import { CombatStats } from './CombatStats.jsx';
import { Button, Modal } from './UI.jsx';

function Fighter({unit,side,hit,attacking}) {
  if(!unit)return null;
  return <div className={`battle-fighter ${side}${hit?' is-hit':''}${attacking?' is-attacking':''}`}>
    <div className="fighter-name"><strong>{unit.name}</strong><span>{elements[unit.element].icon} {elements[unit.element].name}</span></div>
    <div className="fighter-health"><progress max={unit.health} value={unit.hp} aria-label={`בריאות ${unit.name}`} /><b dir="ltr">{unit.hp} / {unit.health}</b></div>
    <div className="fighter-art"><Creature id={unit.creatureId} count={unit.catchCount} /><span className={`element-orb element-${unit.element}`} aria-hidden="true">{elements[unit.element].icon}</span></div>
    <CombatStats creature={unit} compact />
  </div>;
}
export function Battle({battle,onChange,sound=true}) {
  const [auto,setAuto]=useState(false),[fast,setFast]=useState(false),[confirmSkip,setConfirmSkip]=useState(false);
  const skipButton=useRef(null),previousTurn=useRef(battle.turn),skipWasOpen=useRef(false);
  useEffect(()=>{
    if(skipWasOpen.current&&!confirmSkip)skipButton.current?.focus();
    skipWasOpen.current=confirmSkip;
  },[confirmSkip]);
  const active=battle.phase==='active',done=['won','lost','skipped'].includes(battle.phase);
  const enemy=battle.enemies[Math.min(battle.enemyIndex,battle.enemies.length-1)];
  const ally=battle.allies[Math.min(battle.allyIndex,battle.allies.length-1)];
  useEffect(()=>{
    if(!active || confirmSkip || (battle.side==='ally'&&!auto))return;
    const timeout=setTimeout(()=>onChange(advanceBattle(battle)),fast?220:850);
    return ()=>clearTimeout(timeout);
  },[battle,auto,fast,active,confirmSkip,onChange]);
  useEffect(()=>{
    if(previousTurn.current===battle.turn)return;
    previousTurn.current=battle.turn;
    battleSound(battle.phase==='won'?'won':battle.phase==='lost'?'lost':battle.last?.kind??'attack',sound);
  },[battle.turn,battle.phase,battle.last,sound]);
  function begin(){battleSound('start',sound);onChange(startBattle(battle));}
  function closeSkip(){setConfirmSkip(false);}
  const last=battle.last;
  const message=last?.kind==='guard'?`${last.name} מתגונן ומחדש ${last.healed} נקודות בריאות.`:last?.kind==='attack'?`${last.name} תקף את ${last.targetName}: ${last.damage} נזק! ${last.multiplier>1?'יתרון יסוד!':last.multiplier<1?'היריב עמיד ליסוד הזה.':''} ${last.knockout?(last.side==='ally'?'היריב הובס!':'החבר נח; הבא בתור נכנס!'):''}`:'הצוות מוכן. כל תשובה נכונה הביאה חבר לקרב!';
  if(battle.phase==='empty')return <section className="battle-empty panel"><h2>הצוות מחכה לאימון הבא</h2><p>כל תשובה נכונה מצרפת יצור לצוות. באימון הבא אפשר לאסוף חברים ולצאת לקרב!</p></section>;
  return <section className={`battle panel battle-${battle.phase}`} aria-label="זירת הקרב">
    <header className="battle-header"><div><p className="eyebrow">ההרפתקה שלכם</p><h2>{done?'הקרב הסתיים':'זירת היסודות'}</h2><p>{battle.allies.length} חברים מול {battle.enemies.length} יריבים · רק תשובות נכונות מצרפות חברים</p></div>
      {!done&&<Button ref={skipButton} variant="text" onClick={()=>setConfirmSkip(true)}>דילוג על הקרב</Button>}
    </header>
    {done ? <div className="battle-finale" role="status">
      <span className="battle-trophy" aria-hidden="true">{battle.phase==='won'?'🏆':battle.phase==='skipped'?'🌟':'🌱'}</span>
      {battle.phase==='won'&&<div className="battle-confetti" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{'--i':i}} />)}</div>}
      <h3>{battle.phase==='won'?'כל הכבוד! הצוות שלכם ניצח!':battle.phase==='skipped'?'כל הכבוד על האימון!':'נלחמתם באומץ! כל אימון מחזק אתכם'}</h3>
      <p>{battle.phase==='skipped'?'דילגתם על הקרב. התוצאות והיצורים שאספתם נשמרו.':`${battle.enemyIndex} מתוך ${battle.enemies.length} יריבים הובסו. היצורים שאספתם נשארים באוסף!`}</p>
    </div> : <>
      <div className="battle-score"><span>הצוות שלכם · {battle.allies.length-battle.allyIndex} נותרו</span><b aria-hidden="true">VS</b><span>היריבים · {battle.enemies.length-battle.enemyIndex} נותרו</span></div>
      <div className="battle-arena" key={battle.turn}>
        <Fighter unit={ally} side="ally" hit={last?.targetKey===ally.key} attacking={last?.attackerKey===ally.key} />
        <div className="battle-center" aria-hidden="true">✦</div>
        <Fighter unit={enemy} side="enemy" hit={last?.targetKey===enemy.key} attacking={last?.attackerKey===enemy.key} />
      </div>
      <p className="battle-message" role="status" aria-live={auto?'off':'polite'}>{message}</p>
      {battle.phase==='ready'?<div className="battle-actions"><Button onClick={begin}>יוצאים לקרב! ⚔️</Button><p>תשובות מהירות ונכונות חיזקו את הצוות שלכם. אפשר לשחק או לצפות בקרב אוטומטי.</p></div>:
      <div className="battle-actions">
        <Button disabled={battle.side!=='ally'||auto||confirmSkip} onClick={()=>onChange(advanceBattle(battle,'attack'))}>⚔️ התקפה</Button>
        <Button variant="text" disabled={battle.side!=='ally'||auto||confirmSkip} onClick={()=>onChange(advanceBattle(battle,'guard'))}>🛡️ הגנה וריפוי קל</Button>
        <Button variant="text" aria-pressed={auto} onClick={()=>setAuto(!auto)}>{auto?'עצירת משחק אוטומטי':'משחק אוטומטי'}</Button>
        <Button variant="text" aria-pressed={fast} onClick={()=>setFast(!fast)}>{fast?'מהירות רגילה':'מהירות ×3'}</Button>
        <Button variant="text" onClick={()=>onChange(finishBattle(battle))}>סיום מהיר ותוצאת הקרב</Button>
      </div>}
    </>}
    <details className="battle-team"><summary>הצוות שאספתם · {battle.allies.length} חברים</summary><ul>{battle.allies.map(unit=><li key={unit.key}><Creature id={unit.creatureId} count={unit.catchCount} animated={false}/><strong>{unit.name}</strong><CombatStats creature={unit} compact /><small>{unit.speedBonus>0?`בונוס מהירות: +${unit.speedBonus}%`:'כוח בסיס מלא'}</small></li>)}</ul></details>
    <details className="element-guide"><summary>איך היסודות עובדים?</summary><p>יתרון יסוד מעניק ×1.5 נזק; חיסרון מעניק ×0.75 נזק. הגנה מפחיתה את המכה הבאה ומרפאת מעט.</p><ul>{Object.entries(elements).map(([id,item])=><li key={id}><span>{item.icon} {item.name}</span><span aria-hidden="true"> ← </span> חזק נגד {elements[item.strongAgainst].icon} {elements[item.strongAgainst].name}</li>)}</ul></details>
    {confirmSkip&&<Modal title="לדלג על הקרב?" eyebrow="אפשר לבחור בקצב שלכם" onClose={closeSkip} className="help-dialog battle-skip-dialog" closeLabel="חזרה לקרב">
      <div className="battle-skip-content"><span aria-hidden="true">🛡️</span><p>בטוחים שתרצו לדלג? הקרב הזה ייסגר, אבל התוצאה וכל היצורים שאספתם יישארו שלכם.</p><div><Button onClick={closeSkip}>ממשיכים לקרב</Button><Button variant="text" onClick={()=>{setAuto(false);setConfirmSkip(false);onChange({...battle,phase:'skipped'});}}>כן, לדלג על הקרב</Button></div></div>
    </Modal>}
  </section>;
}
