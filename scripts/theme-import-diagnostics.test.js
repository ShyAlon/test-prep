import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadThemeZip as downloadThemeZipWithConfig } from '../src/theme-download.js';
import { createThemeImportDiagnostics } from '../src/theme-import-diagnostics.js';
const downloadThemeZip = (url, options) => downloadThemeZipWithConfig(url, { driveApiKey: 'test-browser-key', ...options });

function capture() {
  const entries = [];
  const logger = Object.fromEntries(['info', 'error'].map(level => [level, (event, details) => entries.push({level,event,...details})]));
  return {entries, logger};
}
const link = 'https://drive.google.com/file/d/private-file-id/view?resourcekey=private-key';

test('blocked fetches have a correlated, useful network/CORS diagnosis without leaking sharing keys', async () => {
  const {entries,logger} = capture();
  await assert.rejects(downloadThemeZip(link, {logger,fetch:async () => {
    throw new TypeError('Failed to fetch https://drive.usercontent.google.com/download?id=private-file-id&resourcekey=private-key');
  }}));
  const failure = entries.find(entry => entry.event === '[Theme import] Failed');
  assert.equal(failure.reason, 'network-or-cors');
  assert.equal(failure.provider, 'Google Drive');
  assert.equal(failure.downloadHost, 'www.googleapis.com');
  assert.equal(failure.stage, 'download request');
  assert.equal(failure.causeName, 'TypeError');
  assert.match(failure.hint, /Network tab/);
  assert.match(failure.causeMessage, /redacted URL/);
  assert.equal(new Set(entries.map(entry => entry.importId)).size, 1);
  assert.ok(entries.every(entry => entry.elapsedMs >= 0));
  assert.ok(!JSON.stringify(entries).includes('private-file-id'));
  assert.ok(!JSON.stringify(entries).includes('private-key'));
  assert.ok(!entries.some(entry => entry.event === '[Theme import] Response received'), 'no invented HTTP response on blocked fetch');
});

test('readable HTTP and HTML failures log status, type, size, redirect and safe final host', async () => {
  for (const [status,type,reason] of [[403,'application/json','http-error'],[200,'text/html; charset=utf-8','html-response']]) {
    const {entries,logger} = capture();
    const response = new Response('private response contents', {status,headers:{'content-type':type,'content-length':'25'}});
    Object.defineProperty(response,'url',{value:'https://drive.usercontent.google.com/private-file-id?resourcekey=private-key'});
    Object.defineProperty(response,'redirected',{value:true});
    await assert.rejects(downloadThemeZip(link,{logger,fetch:async()=>response}));
    const metadata = entries.find(entry=>entry.event==='[Theme import] Response received');
    assert.equal(metadata.httpStatus,status);
    assert.equal(metadata.contentType,type.split(';')[0]);
    assert.equal(metadata.advertisedBytes,25);
    assert.equal(metadata.redirected,true);
    assert.equal(metadata.finalHost,'drive.usercontent.google.com');
    assert.equal(entries.at(-1).reason,reason);
    assert.doesNotMatch(JSON.stringify(entries), /private-file-id|private-key|private response contents/);
  }
});

test('timeouts and user cancellation have distinct diagnostic reasons and severity', async () => {
  const fetch = (_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}));
  const timeout = capture();
  await assert.rejects(downloadThemeZip(link,{logger:timeout.logger,fetch,timeoutMs:5}));
  assert.equal(timeout.entries.at(-1).reason,'timeout');
  assert.equal(timeout.entries.at(-1).level,'error');
  const cancel = capture(), controller = new AbortController();
  const pending = downloadThemeZip(link,{logger:cancel.logger,fetch,signal:controller.signal});
  controller.abort();await assert.rejects(pending,{name:'AbortError'});
  assert.equal(cancel.entries.at(-1).reason,'cancelled');
  assert.equal(cancel.entries.at(-1).level,'info');
});

test('the pipeline shares one trace and maps validation/storage failures without duplicate errors', async () => {
  const {entries,logger} = capture();
  let time=100;
  const diagnostics=createThemeImportDiagnostics({source:'url',logger,now:()=>time});
  await downloadThemeZip(link,{diagnostics,fetch:async()=>new Response('PKfixture')});
  assert.ok(!entries.some(entry=>entry.event==='[Theme import] Failed'));
  time=250;diagnostics.stage('ZIP validation');diagnostics.failure(new Error('Invalid ZIP'));
  assert.equal(entries.at(-1).reason,'invalid-zip');
  assert.equal(entries.at(-1).elapsedMs,150);
  assert.equal(entries.at(-1).provider,'Google Drive');
  diagnostics.stage('IndexedDB persistence');diagnostics.failure(new DOMException('Storage full','QuotaExceededError'));
  assert.equal(entries.at(-1).reason,'storage-failed');
  assert.equal(entries.at(-1).errorName,'QuotaExceededError');
  diagnostics.failure(new DOMException('Transaction aborted','AbortError'));
  assert.equal(entries.at(-1).reason,'storage-failed', 'storage aborts are not user cancellation');
  assert.equal(entries.at(-1).level,'error');
});

test('successful logs report byte totals; broken console methods do not break downloads', async () => {
  const {entries,logger}=capture();
  const bytes=await downloadThemeZip(link,{logger,fetch:async()=>new Response('PKfixture')});
  assert.equal(entries.find(entry=>entry.event==='[Theme import] Download completed').receivedBytes,bytes.length);
  const broken=()=>{throw new Error('Console unavailable');};
  assert.equal((await downloadThemeZip(link,{logger:{info:broken,error:broken},fetch:async()=>new Response('PKfixture')})).length,9);
});
