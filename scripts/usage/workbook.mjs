import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdtemp, symlink, mkdir, rm, writeFile } from 'node:fs/promises';
import { NOTES } from './aggregate.mjs';

const date=ms=>Number.isFinite(ms)?new Date(ms):null;
const safe=v=>typeof v==='string'&&/^[=+@-]/.test(v)?`'${v}`:v;
export function reportTables(report,meta) {
  return [
    { name:'Summary', headers:['Email (UID if unavailable)','Sessions (login proxy)','Active days','Tests completed','Questions answered','Correct','Wrong','Accuracy','Hint requests','Active minutes','Last activity (UTC)'],
      rows:report.summaries.map(p=>[p.email||p.uid,p.sessions,p.activeDays,p.completed,p.answered,p.correct,p.wrong,null,p.hints,p.seconds/60,date(p.last)]), dateColumns:[10],seconds:[9],accuracy:7,correct:5,wrong:6 },
    { name:'Users', headers:['UID','Email','Name','Sessions (login proxy)','Active days','Tests started','Tests completed','Questions seen','Answered','Correct','Wrong','Unknown outcome','Accuracy','Math answered','Reading answered','Unknown type answered','Hint requests','Active seconds','Quiz seconds','Explanations opened','Passages opened','Results opened','Help opened','First activity','Last activity','Account created','Auth last sign-in','Disabled'],
      rows:report.summaries.map(p=>[p.uid,p.email,p.name,p.sessions,p.activeDays,p.started,p.completed,p.seen,p.answered,p.correct,p.wrong,p.unknownOutcomes,null,p.math,p.reading,p.unknownType,p.hints,p.seconds,p.quizSeconds,p.explanations,p.passages,p.results,p.help,date(p.first),date(p.last),date(p.created),date(p.lastLogin),p.disabled]), dateColumns:[23,24,25,26], seconds:[17,18], accuracy:12, correct:9, wrong:10 },
    { name:'Question types',headers:['UID','Email','Question type','Seen','Answered','Correct','Wrong','Accuracy','Hints','Active seconds'],rows:report.byType.map(p=>[p.uid,p.email,p.type,p.seen,p.answered,p.correct,p.wrong,null,p.hints,p.seconds]),accuracy:7,correct:5,wrong:6,seconds:[9]},
    { name:'Questions',headers:['UID','Attempt ID','Test ID','Question ID','Question type','Outcome','Hints','Active seconds','Before-answer seconds','Review seconds','First seen','Answer submitted'],rows:report.questions.map(q=>[q.uid,q.attemptId,q.testId,q.questionId,q.type,q.outcome,q.hints,q.dwell,q.preAnswerDwell,q.reviewDwell,date(q.seenAt),date(q.answerAt)]),dateColumns:[10,11],seconds:[7,8,9] },
    { name:'Notes',headers:['Topic','Definition'],rows:[['Project',meta.projectId],['Exported at (UTC)',new Date(meta.exportedAt)],['Window (UTC)',`${meta.from??'All retained events'} to ${meta.to??'now'} (end exclusive)`],['Time zone','Timestamps: UTC. Active days: Asia/Jerusalem.'],['Source',`Firestore: projects/${meta.projectId}/databases/(default)/documents/behaviorBatches; Firebase Auth user metadata`],...NOTES,...Object.entries(report.diagnostics).map(([k,v])=>[`Diagnostic: ${k}`,v])], },
  ];
}
function column(i){let s='';for(i++;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;}
export async function writeUsageWorkbook(report,meta,path,{preview=false}={}) {
  const modules=process.env.ARTIFACT_NODE_MODULES??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const scratch=await mkdtemp(join(tmpdir(),'gifted-usage-render-'));
  try {
    await symlink(modules,join(scratch,'node_modules'),'dir');
    const require=createRequire(join(scratch,'package.json'));
    let library;try {library=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);}catch{throw new Error('Spreadsheet runtime not found. Set ARTIFACT_NODE_MODULES to the bundled node_modules path, or use --format csv.');}
    const {Workbook,SpreadsheetFile}=library;const workbook=Workbook.create();
    const tables=reportTables(report,meta);
    for(const table of tables)workbook.worksheets.add(table.name);
    for(const table of tables) {
      const sheet=workbook.worksheets.getItem(table.name);sheet.showGridLines=false;
      const width=table.headers.length, height=Math.max(1,table.rows.length)+3;
      sheet.getRangeByIndexes(0,0,height,width).format.font={name:'Arial',size:10};
      sheet.getRange('A1').values=[[table.name==='Users'?'Usage by user':table.name]];
      sheet.getRange('A1').format.font={bold:true,size:15,color:'#173350'};
      sheet.getRangeByIndexes(2,0,1,width).values=[table.headers];
      sheet.getRangeByIndexes(2,0,1,width).format={fill:'#173350',font:{bold:true,color:'#FFFFFF'},rowHeight:42,wrapText:true};
      if(table.rows.length) {
        sheet.getRangeByIndexes(3,0,table.rows.length,width).setNumberFormat('@');
        sheet.getRangeByIndexes(3,0,table.rows.length,width).values=table.rows.map(row=>row.map(safe));
      }
      sheet.getRangeByIndexes(0,0,height,width).format.verticalAlignment='center';
      sheet.getRangeByIndexes(0,0,height,width).format.columnWidth=18;
      sheet.getRangeByIndexes(0,0,height,1).format.columnWidth=30;
      if(table.name==='Users'||table.name==='Question types')sheet.getRangeByIndexes(0,1,height,1).format.columnWidth=30;
      if(table.name==='Notes'){
        sheet.getRangeByIndexes(0,0,height,1).format.columnWidth=27;
        sheet.getRangeByIndexes(0,1,height,1).format.columnWidth=105;
        sheet.getRangeByIndexes(3,1,table.rows.length,1).format.wrapText=true;
        sheet.getRangeByIndexes(3,0,table.rows.length,width).format.rowHeight=62;
        sheet.getRange('B5').setNumberFormat('yyyy-mm-dd hh:mm');
      } else {
        sheet.freezePanes.freezeRows(3);sheet.freezePanes.freezeColumns(table.name==='Summary'?1:table.name==='Users'?3:2);
        if(table.rows.length){
          const formats=table.rows.map(row=>row.map(v=>typeof v==='number'?'#,##0':v instanceof Date?'yyyy-mm-dd hh:mm':typeof v==='string'&&/^\d+$/.test(v)?'0'.repeat(v.length):'@'));
          sheet.getRangeByIndexes(3,0,table.rows.length,width).format.numberFormat=formats;
          for(const c of table.dateColumns??[])sheet.getRangeByIndexes(3,c,table.rows.length,1).setNumberFormat('yyyy-mm-dd hh:mm');
          for(const c of table.seconds??[])sheet.getRangeByIndexes(3,c,table.rows.length,1).setNumberFormat('#,##0.0');
          for(const c of table.dateColumns??[])sheet.getRangeByIndexes(0,c,height,1).format.columnWidth=23;
          if(table.accuracy!==undefined)for(let i=0;i<table.rows.length;i++){
            const r=i+4;sheet.getCell(i+3,table.accuracy).formulas=[[`=IF(${column(table.correct)}${r}+${column(table.wrong)}${r}=0,"",${column(table.correct)}${r}/(${column(table.correct)}${r}+${column(table.wrong)}${r}))`]];
            sheet.getCell(i+3,table.accuracy).setNumberFormat('0.0%');
          }
          if(table.name==='Summary') {
            sheet.getRangeByIndexes(0,0,height,1).format.columnWidth=34;
            sheet.getRangeByIndexes(0,1,height,9).format.columnWidth=11;
            for(let i=0;i<table.rows.length;i++) {
              const r=i+4;
              sheet.getRangeByIndexes(i+3,0,1,width).formulas=[[
                `=IF('Users'!B${r}="",'Users'!A${r},'Users'!B${r})`,
                ...['D','E','G','I','J','K','M','Q'].map(c=>`='Users'!${c}${r}`),
                `='Users'!R${r}/60`,
                `=IF('Users'!Y${r}="","",'Users'!Y${r})`,
              ]];
            }
          }
        }
      }
    }
    workbook.recalculate();
    const errors=await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#NULL!',options:{useRegex:true,maxResults:10},summary:'Usage export formula check'});
    if(/"(?:value|displayValue)":"#/.test(errors.ndjson))throw new Error('Workbook formula validation failed');
    await mkdir(dirname(path),{recursive:true});
    const file=await SpreadsheetFile.exportXlsx(workbook);await file.save(path);
    if(preview)for(const table of reportTables(report,meta)){
      const image=await workbook.render({sheetName:table.name,range:`A1:${table.name==='Notes'?'B':['Summary','Users'].includes(table.name)?'K':'J'}${Math.min(table.rows.length+3,12)}`,scale:1,format:'png'});
      await writeFile(join(dirname(path),`${table.name.replaceAll(' ','-')}-preview.png`),new Uint8Array(await image.arrayBuffer()));
    }
  } finally {await rm(scratch,{recursive:true,force:true});}
}
export async function writeUsageCsv(report,meta,folder) {
  await mkdir(folder,{recursive:true});
  for(const table of reportTables(report,meta)){
    const rows=table.rows.map(row=>row.map(safe));
    if(table.accuracy!==undefined)for(const row of rows){const n=row[table.correct]+row[table.wrong];row[table.accuracy]=n?row[table.correct]/n:null;}
    const csv=[table.headers,...rows].map(row=>row.map(v=>`"${String(v instanceof Date?v.toISOString():v??'').replaceAll('"','""')}"`).join(',')).join('\r\n');
    await writeFile(join(folder,`${table.name.replaceAll(' ','-')}.csv`),'\uFEFF'+csv);
  }
}
