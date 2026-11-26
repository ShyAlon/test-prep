import {readFile,writeFile} from 'node:fs/promises';
import {unzipSync,zipSync,strToU8,strFromU8} from 'fflate';
import {assignCombat} from '../src/combat-rules.js';
import {parseThemeZip} from '../src/theme-storage.js';
const path=process.argv[2];
if(!path)throw new Error('Usage: node scripts/upgrade-theme-combat.mjs path/to/theme.zip');
const files=unzipSync(new Uint8Array(await readFile(path)));
const manifest=JSON.parse(strFromU8(files['theme.json']));
manifest.creatures=assignCombat(manifest.creatures).map(creature=>({ ...creature,
  ...(creature.evolution?{evolution:{...creature.evolution,element:creature.evolution.element??creature.element,
    attack:creature.evolution.attack??Math.min(100,Math.round(creature.attack*1.1)),
    defense:creature.evolution.defense??Math.min(100,Math.round(creature.defense*1.1)),
    health:creature.evolution.health??Math.min(500,Math.round(creature.health*1.1))}}:{}),
}));
files['theme.json']=strToU8(JSON.stringify(manifest,null,2));
const output=zipSync(files);parseThemeZip(output);
await writeFile(path,output);
console.log(`Updated ${manifest.creatures.length} creatures in ${path}`);
