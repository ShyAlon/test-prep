import { reportTables } from './usage/workbook.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateUsage } from './usage/aggregate.mjs';
import { decodeValue, readFirebaseUsage } from './usage/firebase-source.mjs';
import { demoUsage } from './export-usage.mjs';
import { createTracker } from '../src/tracking-core.js';

test('usage aggregates answer attempts, types, hints and focused time without counting replays twice', () => {
  const input=demoUsage();input.users.push({uid:'inactive',email:'none@example.org'});
  const first=input.batches[0];
  input.batches.push({...first,id:'replayed-batch'});
  first.events.push({type:'answer_submit',at:first.events[0].at+90000,sequence:11,attemptId:'demo-attempt',testId:'practice',questionId:'generated-0',correct:true});
  const report=aggregateUsage(input);const p=report.summaries.find(p=>p.uid==='demo-user');
  assert.equal(p.sessions,1);assert.equal(p.started,1);assert.equal(p.completed,1);
  assert.equal(p.answered,2);assert.equal(p.correct,1);assert.equal(p.wrong,1);
  assert.equal(p.math,1);assert.equal(p.reading,1);assert.equal(p.hints,2);assert.equal(p.seconds,40);
  assert.ok(report.diagnostics.duplicates>0);
  assert.equal(report.summaries.find(p=>p.uid==='inactive').answered,0);
});

test('unknown legacy types stay unknown; fixed snapshots classify; unanswered is not wrong', () => {
  const events=[{type:'answer_submit',at:10,sequence:0,attemptId:'a',testId:'practice',questionId:'generated-0',correct:false},
    {type:'hint',at:20,sequence:1,attemptId:'a',testId:'practice',questionId:'generated-1'},
    {type:'answer_submit',at:30,sequence:2,attemptId:'b',testId:'fixed-1',questionId:'generated-0',correct:true}];
  const report=aggregateUsage({batches:[{uid:'u',sessionId:'s',events}]});
  assert.equal(report.summaries[0].seen,3);assert.equal(report.summaries[0].wrong,1);
  assert.equal(report.summaries[0].math,1);assert.equal(report.summaries[0].unknownType,1);
  assert.equal(report.questions[1].outcome,'Not answered');
});

test('date filtering clips dwell intervals and excludes events at the exclusive endpoint', () => {
  const report=aggregateUsage({from:10000,to:20000,batches:[{uid:'u',sessionId:'s',events:[
    {type:'dwell',at:25000,dwellSeconds:20,sequence:0,view:'quiz',attemptId:'a',questionId:'q',answered:true},
    {type:'answer_submit',at:20000,sequence:1,attemptId:'a',questionId:'q',correct:true},
    {type:'hint',at:9999,sequence:2,attemptId:'a',questionId:'q'},
  ]}]});
  assert.equal(report.summaries[0].seconds,10);assert.equal(report.summaries[0].answered,0);
  assert.equal(report.summaries[0].hints,0);assert.equal(report.summaries[0].first,10000);
  assert.equal(report.questions[0].reviewDwell,10);
});

test('Firebase reader paginates both sources, decodes typed events and requests no password fields', async () => {
  const calls=[];let tokenCalls=0;
  const data=await readFirebaseUsage({projectId:'test-project',getToken:async()=>{tokenCalls++;return 'test-token';},fetcher:async(url,options)=>{
    calls.push({url:new URL(url),options});
    assert.equal(options.headers.Authorization,'Bearer test-token');
    if(url.pathname.includes('firestore')||url.hostname==='firestore.googleapis.com')return Response.json(url.searchParams.has('pageToken')?{documents:[]}:{documents:[{name:'projects/test/documents/behaviorBatches/b',fields:{uid:{stringValue:'u'},sessionId:{stringValue:'s'},events:{arrayValue:{values:[{mapValue:{fields:{type:{stringValue:'hint'},at:{integerValue:'123'}}}}]}}}}],nextPageToken:'next'});
    return Response.json(url.searchParams.has('nextPageToken')?{users:[]}:{users:[{localId:'u',displayName:'User',createdAt:'100',passwordHash:'MUST NOT SAVE'}],nextPageToken:'next'});
  }});
  assert.equal(calls.length,4);assert.equal(tokenCalls,4);
  assert.equal(data.batches[0].events[0].at,123);assert.equal(data.users[0].uid,'u');
  assert.ok(!JSON.stringify(data).includes('MUST NOT SAVE'));
  assert.ok(!calls[2].url.searchParams.get('fields').includes('password'));
  assert.equal(decodeValue({booleanValue:false}),false);
});

test('question type metadata survives telemetry batching for future reports', async () => {
  const sent=[];const tracker=createTracker({uid:'u',send:async b=>sent.push(b),storage:{length:0},id:()=> 'id',wallNow:()=>1000,now:()=>0});
  tracker.enter({view:'quiz',attemptId:'a',questionId:'q',questionType:'reading'});
  tracker.track('answer_submit',{correct:true});await tracker.flush({force:true});
  assert.equal(sent[0].events.find(e=>e.type==='answer_submit').questionType,'reading');
});


test('summary leads with email and reconciles to per-user activity, retaining users without email', () => {
  const data=demoUsage();data.users.push({uid:'no-email'});
  const report=aggregateUsage(data);
  const [summary]=reportTables(report,{projectId:'test',exportedAt:new Date().toISOString()});
  assert.equal(summary.name,'Summary');
  assert.equal(summary.rows.length,2);
  const row=summary.rows.find(row=>row[0]==='learner@example.org');
  assert.deepEqual(row.slice(1,7),[1,1,1,2,1,1]);
  assert.equal(row[8],2);assert.equal(row[9],40/60);
  assert.ok(summary.rows.some(row=>row[0]==='no-email'));
});
