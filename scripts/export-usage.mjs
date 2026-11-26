import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { aggregateUsage } from './usage/aggregate.mjs';
import { firebaseCliAuth, readFirebaseUsage } from './usage/firebase-source.mjs';
import { writeUsageWorkbook, writeUsageCsv } from './usage/workbook.mjs';

export function demoUsage() {
  const at=Date.parse('2026-11-26T09:00:00Z');
  return { users:[{uid:'demo-user',email:'learner@example.org',name:'Demo learner',created:at-86400000,lastLogin:at}],
    batches:[{id:'demo-batch',uid:'demo-user',sessionId:'demo-session',events:[
      {type:'session_start',at,sequence:0},
      {type:'test_start',at:at+1000,sequence:1,attemptId:'demo-attempt',testId:'practice'},
      ...['math','reading'].flatMap((questionType,index)=>{
        const common={attemptId:'demo-attempt',testId:'practice',questionId:`generated-${index}`,questionType,questionIndex:index,view:'quiz'};
        return [{...common,type:'view',at:at+2000+index*30000,sequence:2+index*4},
          {...common,type:'hint',at:at+5000+index*30000,sequence:3+index*4},
          {...common,type:'dwell',at:at+22000+index*30000,sequence:4+index*4,dwellSeconds:20,answered:false},
          {...common,type:'answer_submit',at:at+23000+index*30000,sequence:5+index*4,correct:index===0}];
      }),
      {type:'attempt_complete',at:at+60000,sequence:10,attemptId:'demo-attempt',testId:'practice'},
    ]}] };
}
async function main() {
  const {values:args}=parseArgs({options:{project:{type:'string'},account:{type:'string'},from:{type:'string'},to:{type:'string'},out:{type:'string'},format:{type:'string',default:'xlsx'},input:{type:'string'},demo:{type:'boolean'},'no-users':{type:'boolean'},preview:{type:'boolean'},help:{type:'boolean'}}});
  if(args.help){console.log('Usage: npm run usage:export -- [--project ID] [--account EMAIL] [--from ISO_DATE] [--to ISO_DATE] [--out PATH] [--format xlsx|csv] [--no-users]\nOffline: --input usage.json or --demo. --preview writes local QA images. Requires firebase login and project read access.');return;}
  if(!['xlsx','csv'].includes(args.format))throw new Error('--format must be xlsx or csv');
  if(args.demo&&args.input)throw new Error('Use either --demo or --input');
  const from=args.from?Date.parse(args.from):-Infinity,to=args.to?Date.parse(args.to):Infinity;
  if(Number.isNaN(from)||Number.isNaN(to)||from>=to)throw new Error('Invalid --from / --to range; end must be later than start (exclusive).');
  const config=JSON.parse(await readFile(new URL('../src/firebase-config.json',import.meta.url),'utf8'));
  const projectId=args.project??config.projectId;
  const input=args.demo?demoUsage():args.input?JSON.parse(await readFile(args.input,'utf8')):await readFirebaseUsage({projectId,getToken:firebaseCliAuth({account:args.account}),includeUsers:!args['no-users']});
  if(!Array.isArray(input.batches)||!Array.isArray(input.users??[]))throw new Error('Input needs a batches array and optional users array');
  const report=aggregateUsage({...input,from,to});
  const meta={projectId:args.demo?'DEMO (synthetic data)':projectId,exportedAt:new Date().toISOString(),from:args.from,to:args.to};
  const stamp=new Date().toISOString().replaceAll(':','-');
  const output=resolve(args.out??join('artifacts','usage',`usage-${stamp}${args.format==='xlsx'?'.xlsx':''}`));
  if(args.format==='xlsx')await writeUsageWorkbook(report,meta,output,{preview:args.preview});
  else await writeUsageCsv(report,meta,output);
  console.log(`Exported ${report.summaries.length} users, ${report.questions.length} question attempts from ${input.batches.length} batches.\n${output}`);
  console.log('Sessions are a login proxy; explicit login counts are unavailable. Older question types may be Unknown. See Notes.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
