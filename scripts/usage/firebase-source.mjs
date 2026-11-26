import { createRequire } from 'node:module';
import { realpathSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, delimiter } from 'node:path';

export function firebaseCliAuth({ account, cwd=process.cwd() }={}) {
  const binary=process.env.FIREBASE_CLI_PATH || (process.env.PATH??'').split(delimiter).map(p=>join(p,process.platform==='win32'?'firebase.cmd':'firebase')).find(existsSync);
  if(!binary)throw new Error('Firebase CLI not found. Install firebase-tools and run firebase login.');
  let root=dirname(realpathSync(binary));
  while(true){
    try {if(JSON.parse(readFileSync(join(root,'package.json'),'utf8')).name==='firebase-tools')break;}catch{}
    const parent=dirname(root);if(parent===root)throw new Error('Cannot locate firebase-tools modules. Set FIREBASE_CLI_PATH to its lib/bin/firebase.js entry.');root=parent;
  }
  // Use the installed CLI's account selection and token refresh; never print or export credentials.
  const require=createRequire(join(root,'package.json'));
  const auth=require('./lib/auth.js');
  const selected=account?auth.findAccountByEmail(account):auth.getProjectDefaultAccount(cwd);
  if(!selected?.tokens?.refresh_token)throw new Error('No Firebase CLI login available. Run firebase login first (or select --account).');
  return async()=>{
    const token=await auth.getAccessToken(selected.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform','https://www.googleapis.com/auth/firebase']);
    if(!token?.access_token)throw new Error('Firebase CLI could not refresh its access token. Run firebase login --reauth.');
    return token.access_token;
  };
}
export function decodeValue(v) {
  if('stringValue'in v)return v.stringValue;
  if('integerValue'in v)return Number(v.integerValue);
  if('doubleValue'in v)return v.doubleValue;
  if('booleanValue'in v)return v.booleanValue;
  if('timestampValue'in v)return v.timestampValue;
  if('arrayValue'in v)return (v.arrayValue.values??[]).map(decodeValue);
  if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue.fields??{}).map(([k,v])=>[k,decodeValue(v)]));
  return null;
}
export async function readFirebaseUsage({projectId,getToken,fetcher=fetch,includeUsers=true}) {
  if(!/^[a-z][a-z0-9-]+$/.test(projectId))throw new Error('Invalid Firebase project ID');
  async function get(url){
    for(let n=0;n<3;n++){
      const response=await fetcher(url,{headers:{Authorization:`Bearer ${await getToken()}`},signal:AbortSignal.timeout(30000)});
      if(response.ok)return response.json();
      if([429,500,502,503,504].includes(response.status)&&n<2){await new Promise(r=>setTimeout(r,500*2**n));continue;}
      throw new Error(`Firebase read failed (HTTP ${response.status}). Check CLI login and project IAM read permissions.`);
    }
  }
  const batches=[];let pageToken='';const visited=new Set();
  do {
    const url=new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/behaviorBatches`);
    url.searchParams.set('pageSize','1000');if(pageToken)url.searchParams.set('pageToken',pageToken);
    for(const field of ['uid','sessionId','events'])url.searchParams.append('mask.fieldPaths',field);
    const page=await get(url);for(const doc of page.documents??[])batches.push({id:doc.name.split('/').pop(),...Object.fromEntries(Object.entries(doc.fields??{}).map(([k,v])=>[k,decodeValue(v)]))});
    pageToken=page.nextPageToken??'';if(pageToken&&visited.has(pageToken))throw new Error('Repeated Firestore page token');visited.add(pageToken);
  }while(pageToken);
  const users=[];pageToken='';visited.clear();
  if(includeUsers) do {
    const url=new URL(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchGet`);
    url.searchParams.set('maxResults','1000');if(pageToken)url.searchParams.set('nextPageToken',pageToken);
    url.searchParams.set('fields','users(localId,email,displayName,createdAt,lastLoginAt,disabled),nextPageToken');
    const page=await get(url);for(const u of page.users??[])users.push({uid:u.localId,email:u.email??'',name:u.displayName??'',created:u.createdAt?Number(u.createdAt):null,lastLogin:u.lastLoginAt?Number(u.lastLoginAt):null,disabled:u.disabled===true});
    pageToken=page.nextPageToken??'';if(pageToken&&visited.has(pageToken))throw new Error('Repeated Auth page token');visited.add(pageToken);
  }while(pageToken);
  return {batches,users};
}
