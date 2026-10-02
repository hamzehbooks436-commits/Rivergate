import {EVENTS,SERVICES,clamp} from './data.js';
import {districtOf} from './region.js';
export function currentEvent(s){if(s.month<6)return EVENTS[0];return EVENTS[((Math.floor(s.month/6)+Math.abs(s.seed)%29)*7)%EVENTS.length];}
const running=(s,key)=>s.buildings.some(b=>b.service===key&&b.status==='occupied'&&b.info.capacity>0);
const homes=s=>s.buildings.filter(b=>b.zone==='residential'&&b.occupants>0);
const served=(s,key)=>{const h=homes(s),people=h.reduce((n,b)=>n+b.occupants,0);return people?h.reduce((n,b)=>n+b.occupants*b.info[key],0)/people:0;};
export const PROJECTS=[
  {id:'stability',name:'Keep the lights on',text:'Reach 250 residents, cover 90% of homes with utilities, and run three profitable months.',reward:1625,unlock:'Garden suburbs and a development reserve',progress:s=>Math.min(s.stats.population/250,served(s,'power')/.9,served(s,'water')/.9,s.profitMonths/3)},
  {id:'riverfront',name:'Riverfront Revival',text:'Reach 600 residents and 65 happiness. Build a riverside park, serve 100 transit journeys and operate a profitable line.',reward:2750,unlock:'Waterfront market landmark',progress:s=>Math.min(s.stats.population/600,s.stats.happiness/65,s.delivered/100,s.buildings.some(b=>SERVICES[b.service]?.recreation&&b.status==='occupied'&&b.info.riverside)?1:0,s.routes.some(r=>r.active&&r.income>SERVICES.park.upkeep+r.vehicles*155)?1:0)},
  {id:'community',name:'A place to grow up',text:'Reach 1,500 residents, provide 75% education and healthcare coverage, and sustain 70 happiness.',reward:3500,unlock:'Community festival and university quarter',progress:s=>Math.min(s.stats.population/1500,served(s,'education')/.75,served(s,'healthcare')/.75,s.stats.happiness/70)},
  {id:'tradehub',name:'Made here, shipped everywhere',text:'Export 2,000 goods through a working freight railway and reach 2,500 residents.',reward:4500,unlock:'Industrial port logistics bonus',progress:s=>Math.min(s.exported/2000,s.stats.population/2500,s.freightTrains&&running(s,'station')?1:0)},
  {id:'skyline',name:'A skyline earned',text:'Reach 75,000 residents, 80 happiness, 12 profitable months and a used public transport network.',reward:8750,unlock:'Skyscraper districts',progress:s=>Math.min(s.stats.population/75000,s.stats.happiness/80,s.profitMonths/12,s.routes.some(r=>r.riders>0)?1:0)},
];
export const SCENARIOS={
  revival:{name:'Riverfront Revival',desc:'Repair a struggling neighbourhood, balance its budget and open the riverfront.',goal:s=>s.projects.includes('riverfront')},
  rescue:{name:'Town in debt',desc:'A neglected town owes $30,000. Repay it and sustain six profitable months with 60 happiness.',goal:s=>s.debt===0&&s.profitMonths>=6&&s.stats.population>=500&&s.stats.happiness>=60},
  clean:{name:'Clean industrial valley',desc:'Transform a factory settlement: reach 1,500 residents, 70 happiness and pollution below 25 at homes.',goal:s=>s.stats.population>=1500&&s.stats.happiness>=70&&homes(s).every(b=>b.info.pollution<25)&&s.policies.cleanIndustry},
  mountain:{name:'Mountain borough',desc:'Build across difficult terrain: reach 1,000 residents and operate a used rail or metro line.',goal:s=>s.stats.population>=1000&&s.routes.some(r=>['rail','metro'].includes(r.mode)&&r.riders>0)},
  sandbox:{name:'Open region',desc:'Build at your own pace with the same construction, district and progression rules.',goal:()=>false},
};
export function requests(s){const list=[];for(const [key,text,overlay] of [
  ['power','Our homes need reliable electricity.','power'],['water','We need clean, reliable drinking water.','water'],
  ['education','Our children need school places nearby.','education'],['healthcare','Our families need access to a hospital.','healthcare'],
  ['park','We need somewhere to play and meet neighbours.','park'],['fire','Our neighbourhood needs fire protection.','fire'],
]){const b=homes(s).filter(b=>b.info[key]<.55).sort((a,b)=>b.occupants-a.occupants)[0];if(b)list.push({key,text,overlay,i:b.i,people:b.occupants,solution:'Provide reachable '+SERVICES[key].name.toLowerCase()+' capacity, then check the coverage overlay.'});}
  const commute=homes(s).find(b=>b.info.commute>30);if(commute)list.push({key:'commute',text:'Getting to work takes too long.',overlay:'traffic',i:commute.i,people:commute.occupants,solution:'Place jobs nearby, add public transport or upgrade congested roads.'});
  const dirty=homes(s).find(b=>b.info.pollution>40);if(dirty)list.push({key:'pollution',text:'Factory pollution is affecting our health.',overlay:'pollution',i:dirty.i,people:dirty.occupants,solution:'Separate industry from homes, plant trees or adopt clean industry.'});return list.slice(0,6);
}
export function campaignMonth(city){const s=city.s;s.profitMonths=s.ledger.net>0?s.profitMonths+1:0;
  // Grants and one-time rewards cannot count as a sustainable operating surplus.
  if(s.ledger.net-s.ledger.grant<=0)s.profitMonths=0;
  for(const p of PROJECTS)if(!s.projects.includes(p.id)&&p.progress(s)>=1){s.projects.push(p.id);s.cash+=p.reward;s.celebration={name:p.name,month:s.month};city.log(`Project complete: ${p.name}. $${p.reward.toLocaleString()} awarded. ${p.unlock}.`);}
  if(s.scenario!=='sandbox'&&!s.scenarioComplete&&SCENARIOS[s.scenario].goal(s)){s.scenarioComplete=true;s.cash+=3750;s.celebration={name:'Scenario complete',month:s.month};city.log('Scenario complete! $3,750 awarded. Continue building your city.');}
  if(s.month>0&&s.month%6===0)city.log(currentEvent(s).name+': '+currentEvent(s).text);
  if(s.month>=12&&s.month%18===12&&!s.offer&&!s.contract)s.offer={month:s.month,expires:s.month+6};
  if(s.offer&&s.month>=s.offer.expires){s.offer=null;city.log('The regional manufacturing offer expired. Another opportunity will arrive later.');}
  if(s.contract){const c=s.contract;if(s.exported-c.exported>=500&&s.buildings.filter(b=>b.zone==='industrial'&&b.status==='occupied').length>=c.factories+4){s.cash+=3000;s.contract=null;city.log('Manufacturing contract delivered. $3,000 completion bonus awarded.');}else if(s.month>=c.deadline){s.cash-=8000;s.contract=null;city.log('Manufacturing contract missed its deadline. $8,000 advance reclaimed.');}}
  if(s.stats.population>1000&&s.month%12===8&&s.stats.cityValues.safety<35)city.log('Fire risk is rising. Improve fire coverage before another summer.');
}
export function respondOffer(city,accept){const s=city.s;if(!s.offer)return 'No offer is waiting.';city.checkpoint();s.offer=null;if(accept){s.cash+=8000;s.contract={deadline:s.month+24,exported:s.exported,factories:s.buildings.filter(b=>b.zone==='industrial'&&b.status==='occupied').length};}city.revision++;return accept?'$8,000 advance accepted. Add four operating factories and export 500 goods within 24 months; failure reclaims the advance.':'Offer declined. Your city can pursue its own priorities.';}
