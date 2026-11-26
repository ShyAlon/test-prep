import React,{useState,useRef}from'react';
import{shareMessage,publicAppUrl,tryNativeShare}from'../share-result.js';
import{Button,Modal,ExternalLink}from'./UI.jsx';
export function ShareButton({attempt, variant, label, onOpen}) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const text=useRef(null),trigger=useRef(null);
  const message=shareMessage(attempt),url=publicAppUrl(globalThis.location);
  const content=`${message}${url?`\n${url}`:''}`;
  async function share(){setBusy(true);setStatus('');const result=await tryNativeShare({title:'מחנה האימונים',text:message,...(url?{url}:{})});setBusy(false);if(result==='fallback')setStatus('השיתוף במכשיר אינו זמין. אפשר להעתיק או לבחור רשת חברתית.');}
  async function copy(){
    try{await navigator.clipboard.writeText(content);setStatus('ההודעה הועתקה! אפשר להדביק בכל רשת חברתית.');}
    catch{ text.current?.focus();text.current?.select();setStatus('בחרו העתקה במכשיר או לחצו Ctrl/Cmd+C, ואז הדביקו במקום הרצוי.');}
  }
  return <><Button ref={trigger} variant={variant} className="share-result" disabled={busy} aria-haspopup="dialog" aria-expanded={open} onClick={()=>{onOpen?.();setStatus('');setOpen(true);}}>{label ?? '↗ שיתוף ההישג'}</Button>
    {open&&<Modal title={attempt?'משתפים את ההישג':'משתפים את מחנה האימונים'} eyebrow={attempt?'יש במה להתגאות':'מזמינים חברים להרפתקה'} onClose={()=>setOpen(false)} className="help-dialog share-dialog">
      <div className="share-content"><p>אפשר לשתף ברשת חברתית או להעתיק את ההודעה. השיתוף אינו כולל שם, אימייל או מזהה משתמש.</p>
        <textarea ref={text} readOnly value={content} aria-label="הודעה לשיתוף" rows={6}/>
        <div className="share-actions">{typeof globalThis.navigator?.share==='function'&&<Button disabled={busy} onClick={share}>{busy?'פותחים שיתוף…':'שיתוף במכשיר'}</Button>}<Button onClick={copy}>העתקת ההודעה</Button>
          <ExternalLink href={`https://wa.me/?text=${encodeURIComponent(content)}`}>WhatsApp ↗</ExternalLink>
          {url&&<ExternalLink href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>Facebook (קישור) ↗</ExternalLink>}
        </div><p role="status">{status}</p>
      </div>
    </Modal>}
  </>;
}
