// Keep activation opt-in: never interrupt a running test or battle automatically.
export function createAppUpdater({reload=()=>globalThis.location.reload(),setTimer=setTimeout,clearTimer=clearTimeout}={}) {
  let state={available:false,updating:false,error:''},registration,container,requested=false,prepare=()=>{},timer,activatedElsewhere=false;
  const listeners=new Set();
  const publish=patch=>{state={...state,...patch};for(const listener of listeners)listener();};
  const fail=()=>{requested=false;clearTimer(timer);publish({updating:false,error:'לא הצלחנו לעדכן. בדקו שההתקדמות נשמרה ונסו שוב.'});};
  function waiting(){
    const worker=registration?.waiting;
    if(worker&&container.controller)publish({available:true});
  }
  async function start(serviceWorker,url) {
    container=serviceWorker;
    const hadController=Boolean(container.controller);
    container.addEventListener('controllerchange',async()=>{
      if(!requested){if(hadController){activatedElsewhere=true;publish({available:true});}return;}
      requested=false;clearTimer(timer);
      try{await prepare();reload();}catch{fail();}
    });
    try {
      registration=await container.register(url,{updateViaCache:'none'});
      function watch(){
        const worker=registration.installing;
        if(!worker)return;
        worker.addEventListener('statechange',()=>{
          if(worker.state==='installed')waiting();
        });
      }
      registration.addEventListener('updatefound',watch);watch();waiting();
    } catch(error){console.warn('Offline support could not be enabled.',error.name);}
  }
  async function apply(beforeUpdate=()=>{}) {
    if(state.updating)return;
    try {
      prepare=beforeUpdate;
      await prepare();
      const worker=registration?.waiting;
      if(!worker){
        if(activatedElsewhere){reload();return;}
        publish({available:false,updating:false});return;
      }
      requested=true;publish({updating:true,error:''});
      timer=setTimer(fail,15000);
      worker.postMessage({type:'SKIP_WAITING'});
    } catch{fail();}
  }
  return {start,apply,check:()=>registration?.update().catch(()=>{}),
    subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
    getSnapshot:()=>state,
  };
}
export const appUpdater=createAppUpdater();
