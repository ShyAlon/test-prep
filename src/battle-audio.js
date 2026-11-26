let context;
export function battleSound(kind, enabled=true) {
  if(!enabled)return;
  try {
    context ??= new AudioContext();
    void context.resume().then(()=>{
      const notes=kind==='won'?[523,659,784,1047]:kind==='lost'?[392,440,523]:kind==='guard'?[330,494]:kind==='start'?[392,523,659]:[196,294];
      notes.forEach((frequency,index)=>{
        const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime+index*.105;
        oscillator.type=kind==='attack'?'triangle':'sine';oscillator.frequency.setValueAtTime(frequency,at);
        gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.065,at+.015);gain.gain.exponentialRampToValueAtTime(.001,at+.2);
        oscillator.connect(gain).connect(context.destination);oscillator.start(at);oscillator.stop(at+.23);
      });
    }).catch(()=>{});
  } catch { /* Visual battles remain available when browser audio is blocked. */ }
}
