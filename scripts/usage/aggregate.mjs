import { fixedTests } from '../../src/model.js';

export const NOTES = [
  ['Login counts', 'Explicit login events were not recorded. Sessions are a proxy: a reload or new tab starts another session; automatic sign-in counts too. Auth last sign-in is a timestamp, not a count.'],
  ['Coverage', 'Only retained, successfully uploaded telemetry is included (normally up to 85 days). Offline, blocked, or expired events may be missing. Counts are not lifetime totals.'],
  ['Question types', 'Recorded questionType is preferred. Fixed tests can be resolved from their saved bank. Older renewable-practice events without type metadata are Unknown; no type is guessed from question numbers.'],
  ['Questions', 'One row per UID + attempt ID + question ID. Repeated answer-submit events count once. Reattempts in a new attempt count again. Seen questions include visits/hints without a submitted answer.'],
  ['Hints and dwell', 'Hints count requests, not distinct questions. Dwell is focused visible seconds; overlapping tabs/devices can overlap. Answered-question review time is separated from pre-answer dwell.'],
  ['Date filter', 'From is inclusive and to is exclusive, based on each event timestamp. Dwell intervals crossing a boundary are clipped. First/last activity is within this window; Auth timestamps are account metadata. Timestamps are UTC; active-day counts use Asia/Jerusalem.'],
  ['Outcomes', 'Correct and wrong count only boolean answer outcomes. Missing outcomes stay Unknown. Accuracy excludes unknown outcomes. No answer does not imply wrong.'],
];
const fixed = new Map(fixedTests.flatMap(test => test.questions.map(q => [`${test.id}:${q.id}`,q.passageText ? 'Reading comprehension' : 'Math'])));
export function aggregateUsage({ batches, users = [], from = -Infinity, to = Infinity }) {
  const identities = new Map(users.map(user => [user.uid,user]));
  const people = new Map(); const questions = new Map(); const seen = new Set();
  const diagnostics = { duplicates:0, invalidEvents:0, conflictingAnswers:0, batches:batches.length };
  function person(uid) {
    if (!people.has(uid)) people.set(uid,{ uid, ...identities.get(uid), sessions:new Set(), days:new Set(), starts:new Set(), completes:new Set(), first:null,last:null,hints:0,dwell:0,quizDwell:0,explanations:0,passages:0,results:0,help:0 });
    return people.get(uid);
  }
  for (const uid of identities.keys()) person(uid);
  const all=[];
  for(const batch of batches) for(const [index,event] of (Array.isArray(batch.events)?batch.events:[]).entries()) {
    if(!batch.uid || !batch.sessionId || !Number.isFinite(event?.at) || typeof event.type !== 'string') {diagnostics.invalidEvents++;continue;}
    const key=JSON.stringify([batch.uid,batch.sessionId,Number.isInteger(event.sequence)?event.sequence:`${batch.id}:${index}`]);
    if(seen.has(key)){diagnostics.duplicates++;continue;} seen.add(key);
    all.push({...event,uid:batch.uid,sessionId:batch.sessionId});
  }
  all.sort((a,b)=>a.at-b.at || (a.sequence??0)-(b.sequence??0));
  const classify=e => e.questionType === 'math' ? 'Math' : e.questionType === 'reading' ? 'Reading comprehension' : fixed.get(`${e.testId}:${e.questionId}`) ?? 'Unknown';
  for(const e of all) {
    let dwell=0;
    if(e.type==='dwell' && Number.isFinite(e.dwellSeconds) && e.dwellSeconds>=0) {
      const start=e.at-e.dwellSeconds*1000;
      dwell=Math.max(0,Math.min(e.at,to)-Math.max(start,from))/1000;
    }
    if(!(e.at>=from && e.at<to) && !dwell) continue;
    const p=person(e.uid); p.sessions.add(e.sessionId);
    const activity=Math.min(e.at,Number.isFinite(to)?to-1:e.at);
    p.days.add(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(activity));
    const firstActivity=dwell?Math.max(e.at-e.dwellSeconds*1000,from):e.at;
    p.first=p.first===null?firstActivity:Math.min(p.first,firstActivity);p.last=Math.max(p.last??0,activity);
    if(e.type==='test_start'&&e.attemptId)p.starts.add(e.attemptId);
    if(e.type==='attempt_complete'&&e.attemptId)p.completes.add(e.attemptId);
    if(e.type==='hint')p.hints++;
    if(e.type==='explanation_open')p.explanations++;
    if(e.type==='passage_open')p.passages++;
    if(e.type==='results_open')p.results++;
    if(e.type==='view'&&e.view==='help')p.help++;
    p.dwell+=dwell; if(e.view==='quiz')p.quizDwell+=dwell;
    if(!e.attemptId||!e.questionId)continue;
    const key=JSON.stringify([e.uid,e.attemptId,e.questionId]);
    if(!questions.has(key))questions.set(key,{uid:e.uid,attemptId:e.attemptId,testId:e.testId??'',questionId:e.questionId,type:classify(e),seenAt:activity,answerAt:null,outcome:'Not answered',hints:0,dwell:0,preAnswerDwell:0,reviewDwell:0});
    const q=questions.get(key); if(q.type==='Unknown')q.type=classify(e);
    if(e.type==='hint')q.hints++;
    q.dwell+=dwell;
    if(e.answered===true)q.reviewDwell+=dwell;else q.preAnswerDwell+=dwell;
    if(e.type==='answer_submit') {
      const outcome=e.correct===true?'Correct':e.correct===false?'Wrong':'Unknown';
      if(q.answerAt===null){q.answerAt=e.at;q.outcome=outcome;}
      else if(q.outcome!==outcome)diagnostics.conflictingAnswers++;
    }
  }
  const detail=[...questions.values()]; const byType=[];
  const summaries=[...people.values()].map(p=>{
    const qs=detail.filter(q=>q.uid===p.uid);
    for(const type of ['Math','Reading comprehension','Unknown']) {
      const rows=qs.filter(q=>q.type===type);
      byType.push({uid:p.uid,email:p.email??'',type,seen:rows.length,answered:rows.filter(q=>q.answerAt!==null).length,correct:rows.filter(q=>q.outcome==='Correct').length,wrong:rows.filter(q=>q.outcome==='Wrong').length,hints:rows.reduce((s,q)=>s+q.hints,0),seconds:rows.reduce((s,q)=>s+q.dwell,0)});
    }
    return {uid:p.uid,email:p.email??'',name:p.name??'',created:p.created??null,lastLogin:p.lastLogin??null,disabled:p.disabled??false,sessions:p.sessions.size,activeDays:p.days.size,started:p.starts.size,completed:p.completes.size,seen:qs.length,answered:qs.filter(q=>q.answerAt!==null).length,correct:qs.filter(q=>q.outcome==='Correct').length,wrong:qs.filter(q=>q.outcome==='Wrong').length,unknownOutcomes:qs.filter(q=>q.outcome==='Unknown').length,math:qs.filter(q=>q.type==='Math'&&q.answerAt!==null).length,reading:qs.filter(q=>q.type==='Reading comprehension'&&q.answerAt!==null).length,unknownType:qs.filter(q=>q.type==='Unknown'&&q.answerAt!==null).length,hints:p.hints,seconds:p.dwell,quizSeconds:p.quizDwell,explanations:p.explanations,passages:p.passages,results:p.results,help:p.help,first:p.first,last:p.last};
  }).sort((a,b)=>b.answered-a.answered || a.uid.localeCompare(b.uid));
  return {summaries,byType,questions:detail,diagnostics};
}
