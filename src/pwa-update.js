// Keep activation opt-in: never interrupt a running test or battle automatically.
export function createAppUpdater({reload=()=>globalThis.location.reload(),setTimer=setTimeout,clearTimer=clearTimeout,logger=console,now=Date.now}={}) {
  let state={available:false,updating:false,error:''},registration,container,requested=false,prepare=()=>{},timer,activatedElsewhere=false;
  let attempt=0,startedAt=0;
  const snapshot=()=>({attempt,available:state.available,updating:state.updating,requested,activatedElsewhere,
    scope:registration?.scope,controller:container?.controller?.state??null,
    installing:registration?.installing?.state??null,waiting:registration?.waiting?.state??null,
    active:registration?.active?.state??null,online:globalThis.navigator?.onLine,
    elapsedMs:startedAt?now()-startedAt:0,
  });
  function log(level,event,details={},error){
    try{logger[level](`[PWA update] ${event}`,{...snapshot(),...details},...(error?[error]:[]));}catch{/* Diagnostics must not break updates. */}
  }
  const listeners=new Set();
  const publish=patch=>{state={...state,...patch};for(const listener of listeners)listener();};
  const fail=(stage,error)=>{
    log('error','Failed',{stage,errorName:error?.name,errorMessage:error?.message},error);
    requested=false;clearTimer(timer);publish({updating:false,error:'לא הצלחנו לעדכן. בדקו שההתקדמות נשמרה ונסו שוב.'});
  };
  function waiting(){
    const worker=registration?.waiting;
    if(worker&&container.controller){log('info','New version ready');publish({available:true});}
  }
  async function start(serviceWorker,url) {
    container=serviceWorker;
    const hadController=Boolean(container.controller);
    log('info','Registering service worker',{scriptURL:url});
    container.addEventListener('controllerchange',async()=>{
      log('info','Controller changed');
      if(!requested){if(hadController){activatedElsewhere=true;publish({available:true});}return;}
      requested=false;clearTimer(timer);
      try{log('info','Saving before reload');await prepare();log('info','Reloading updated app');reload();}
      catch(error){fail('save before reload',error);}
    });
    try {
      registration=await container.register(url,{updateViaCache:'none'});
      log('info','Service worker registered');
      function watch(){
        const worker=registration.installing;
        if(!worker)return;
        log('info','Watching installing worker',{workerState:worker.state});
        worker.addEventListener('error',event=>log('error','Worker error',{message:event.message,filename:event.filename,line:event.lineno}));
        worker.addEventListener('statechange',()=>{
          log(worker.state==='redundant'?'warn':'info','Worker state changed',{workerState:worker.state});
          if(worker.state==='installed')waiting();
        });
      }
      registration.addEventListener('updatefound',()=>{log('info','Update found');watch();});watch();waiting();
    } catch(error){log('error','Registration failed',{errorName:error.name,errorMessage:error.message},error);}
  }
  async function apply(beforeUpdate=()=>{}) {
    if(state.updating){log('debug','Ignored duplicate update click');return;}
    attempt++;startedAt=now();let stage='save before activation';
    log('info','Update requested');
    try {
      prepare=beforeUpdate;
      await prepare();
      log('info','Progress saved');stage='find waiting worker';
      const worker=registration?.waiting;
      if(!worker){
        if(activatedElsewhere){log('info','Reloading version activated by another window');reload();return;}
        log('warn','No waiting worker at activation time');
        publish({available:false,updating:false});return;
      }
      requested=true;publish({updating:true,error:''});
      timer=setTimer(()=>fail('activation timeout',new Error('No controllerchange event within 15000 ms')),15000);
      stage='send activation request';log('info','Sending SKIP_WAITING',{workerState:worker.state});
      worker.postMessage({type:'SKIP_WAITING'});
    } catch(error){fail(stage,error);}
  }
  async function check(){
    if(!registration){log('debug','Update check skipped: not registered');return;}
    log('debug','Checking for update');
    try{await registration.update();log('debug','Update check complete');waiting();}
    catch(error){log('warn','Update check failed',{errorName:error.name,errorMessage:error.message},error);}
  }
  return {start,apply,check,
    subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
    getSnapshot:()=>state,
  };
}
export const appUpdater=createAppUpdater();
