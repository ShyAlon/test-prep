import test from 'node:test';import assert from 'node:assert/strict';
import {createAppUpdater} from '../src/pwa-update.js';
function setup({waiting=true,controlled=true}={}) {
 const worker=new EventTarget();worker.state='installed';worker.messages=[];worker.postMessage=m=>worker.messages.push(m);
 const registration=new EventTarget();registration.waiting=waiting?worker:null;registration.update=async()=>{};
 const container=new EventTarget();container.controller=controlled?{}:null;container.register=async()=>registration;
 let reloads=0,timeout;
 const manager=createAppUpdater({reload:()=>reloads++,setTimer:callback=>{timeout=callback;return 1;},clearTimer(){}});
 return {manager,container,registration,worker,reloads:()=>reloads,timeout:()=>timeout()};
}
test('waiting update is offered without reloading; click checkpoints and reloads after activation',async()=>{
 const f=setup();await f.manager.start(f.container,'/app/sw.js');
 assert.equal(f.manager.getSnapshot().available,true);assert.equal(f.reloads(),0);
 let saves=0;await f.manager.apply(()=>saves++);
 assert.deepEqual(f.worker.messages,[{type:'SKIP_WAITING'}]);assert.equal(saves,1);assert.equal(f.reloads(),0);
 f.container.dispatchEvent(new Event('controllerchange'));await Promise.resolve();
 assert.equal(saves,2);assert.equal(f.reloads(),1);
 f.container.dispatchEvent(new Event('controllerchange'));assert.equal(f.reloads(),1);
});
test('initial installation and updates activated by another tab never force a reload',async()=>{
 const f=setup({controlled:false});await f.manager.start(f.container,'/sw.js');
 assert.equal(f.manager.getSnapshot().available,false);
 f.container.dispatchEvent(new Event('controllerchange'));assert.equal(f.reloads(),0);
});
test('save failure prevents activation, and a stuck worker exposes a retryable error',async()=>{
 const f=setup();await f.manager.start(f.container,'/sw.js');
 await f.manager.apply(()=>{throw new Error('Storage full');});
 assert.equal(f.worker.messages.length,0);assert.ok(f.manager.getSnapshot().error);
 await f.manager.apply();f.timeout();assert.equal(f.manager.getSnapshot().updating,false);assert.ok(f.manager.getSnapshot().error);assert.equal(f.reloads(),0);
});
test('new worker installs while app is open and publishes an available update',async()=>{
 const f=setup({waiting:false});await f.manager.start(f.container,'/sw.js');
 f.registration.installing=f.worker;f.registration.dispatchEvent(new Event('updatefound'));
 f.registration.waiting=f.worker;f.worker.dispatchEvent(new Event('statechange'));
 assert.equal(f.manager.getSnapshot().available,true);
});


test('when another tab activates the worker, this tab offers a user-controlled reload',async()=>{
 const f=setup();await f.manager.start(f.container,'/sw.js');
 f.registration.waiting=null;f.container.dispatchEvent(new Event('controllerchange'));
 assert.equal(f.reloads(),0);assert.equal(f.manager.getSnapshot().available,true);
 let saved=false;await f.manager.apply(()=>{saved=true;});assert.ok(saved);assert.equal(f.reloads(),1);
});
