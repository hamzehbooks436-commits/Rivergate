import assert from 'node:assert/strict';
import fs from 'node:fs';
import {City,createState,validateSave} from '../src/simulation.js';
import {DECORATIONS,DAY_SECONDS} from '../src/data.js';
import {seasonFor,activeHoliday,HOLIDAYS} from '../src/seasons.js';
import {index} from '../src/network.js';
const stateAt=(y,m,d)=>({day:(Date.UTC(y,m-1,d)-Date.UTC(2000,0,1))/86400000,month:(y-2000)*12+m-1});
for(const year of [2000,2001,2004])for(const [m,d,expected] of [[1,1,'Winter'],[2,28,'Winter'],[3,1,'Spring'],[6,10,'Spring'],[6,11,'Summer'],[9,30,'Summer'],[10,1,'Autumn'],[11,30,'Autumn'],[12,1,'Winter']])assert.equal(seasonFor(stateAt(year,m,d)),expected);
assert.equal(seasonFor(stateAt(2000,2,29)),'Winter');
for(const h of HOLIDAYS){assert.equal(activeHoliday(stateAt(2001,h.month,h.day))?.id,h.id);assert.equal(activeHoliday(stateAt(2001,h.month,h.day+h.duration-1))?.id,h.id);assert.equal(activeHoliday(stateAt(2001,h.month,h.day+h.duration)),null);assert.equal(seasonFor(stateAt(2001,h.month,h.day)),h.season);}
const city=new City();city.replace(createState(74021,false));
const initial=city.s.cash;
for(const [n,[key,spec]] of Object.entries(DECORATIONS).entries()){
  const i=index(10+n,45),before=city.s.cash;city.edit(key,[i]);
  const b=city.s.buildings.at(-1);assert.equal(b.service,key);assert.equal(b.status,'occupied');assert.equal(before-city.s.cash,spec.cost);assert.equal(b.info.issues.length,0);assert.equal(city.serviceBase(b),0);
  const count=city.s.buildings.length;city.edit(key,[i]);assert.equal(city.s.buildings.length,count);
  const file=fs.readFileSync(new URL('../assets/models/remaster_'+key+'.glb',import.meta.url));assert.equal(file.readUInt32LE(0),0x46546c67);
  const gltf=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString());assert.equal(gltf.scenes.length,1);assert(!gltf.nodes.some(n=>n.name==='Cube'));
}
assert(city.s.cash<initial);assert.equal(validateSave(JSON.parse(city.export(false))).buildings.length,8);
city.remove([index(10,45)]);assert.equal(city.s.buildings.length,7);city.undo();assert.equal(city.s.buildings.length,8);
const old=createState();for(const key of Object.keys(DECORATIONS))delete old.funding[key];assert.doesNotThrow(()=>validateSave(old));
// Tick across the mid-month boundary: rendering and simulation must switch together.
Object.assign(city.s,stateAt(2001,6,10));city.analyse();city.speed=1;city.clock=DAY_SECONDS-.1;city.tick(.2);assert.equal(city.s.stats.season,'Summer');
Object.assign(city.s,stateAt(2001,10,9));city.analyse();city.clock=DAY_SECONDS-.1;city.tick(.2);assert.equal(city.s.stats.holiday,'Harvest Fair');assert(city.s.news.some(n=>n.text.includes('Harvest Fair begins')));
Object.assign(city.s,stateAt(2001,10,13));city.analyse();city.clock=DAY_SECONDS-.1;city.tick(.2);assert.equal(city.s.stats.holiday,null);
// Holiday and decorative bonuses expire and never stack with duplicate ornaments.
city.replace(createState());Object.assign(city.s,stateAt(2001,5,14));city.analyse();
const home=city.s.buildings.find(b=>b.zone==='residential');
city.edit('decor_bench',[index(9,46)]);assert.equal(home.info.decorationBonus,1);assert.equal(home.info.decorationBonus,1);
city.edit('decor_lamp',[index(10,46)]);assert.equal(home.info.decorationBonus,1);
const decoratedHappiness=home.info.happiness;
Object.assign(city.s,stateAt(2001,5,15));city.analyse();assert.equal(home.info.holidayBonus,5);assert.equal(home.info.happiness,decoratedHappiness+5);
Object.assign(city.s,stateAt(2001,5,18));city.analyse();assert.equal(home.info.holidayBonus,0);assert.equal(home.info.decorationBonus,1);
console.log('PASS: exact seasonal dates, leap years, 8 holidays, daily transitions, all decoration assets, placement, costs, utilities, save migration, delete/undo and non-stacking holiday bonuses.');
