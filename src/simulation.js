import {seasonalState} from './seasons.js';
import {balancedShares} from './people-allocation.js';
import {N,DAY_SECONDS,SAVE_KEY,ZONES,SERVICES,MODES,INDUSTRIES,CARGO_RATES,clamp,wellbeing,CITY_WEIGHTS,PERSON_WEIGHTS,EVENTS,MILESTONES,DIFFICULTIES} from './data.js';
import {owned,parcelOf,parcelPrice,canBuy,districtOf,districtGate,densityGate,footprint,buildingCells,perimeter,reserve,PARCELS} from './region.js';
import {currentEvent,campaignMonth,SCENARIOS} from './campaign.js';
import {random,step as terrainStep} from './legacy/terrain.js';
import {Network,neighbours,roadAt,railAt,utilityComponents,xy,index,lineCells} from './network.js';
const sum=(arr,fn)=>arr.reduce((n,x)=>n+fn(x),0);
const finite=Number.isFinite;
export const capacity=b=>(ZONES[b.zone]?.capacity[b.level-1]||0)*(b.size||1)**2;
const active=b=>b.status==='occupied'||b.status==='vacant';
const COMMUTE_TIME_FACTOR=.65*.25;
const TRAFFIC_VOLUME_FACTOR=.55;
export function createState(seed=74021,starter=true,difficulty='mayor',scenario='revival'){
  const rng=random(seed);
  const tiles=Array.from({length:N*N},(_,i)=>{const {x,z}=xy(i),river=40+Math.sin(z*.075+seed*.0001)*3.5,water=Math.abs(x-river)<2.5;
    const hill=Math.min(12,Math.max(0,(x-100)*.16+(Math.sin(x*.085)*Math.cos(z*.08)+1)*.5+(scenario==='mountain'?Math.max(0,x-13)*.18:0)));
    return {type:water?18:rng()<.16?2:0,moisture:water?1:.6,elevation:water?-1:1+hill,age:0,road:0,rail:false,powerline:false,pipe:false,zone:null,density:1,building:null};});
  const s={version:2,name:'Rivergate',seed,month:0,day:0,cash:DIFFICULTIES[difficulty].cash,difficulty,scenario,scenarioComplete:false,owned:[16,17,24,25],districts:{},projects:[],profitMonths:0,offer:null,contract:null,celebration:null,debt:0,loanMonths:0,tiles,buildings:[],routes:[],nextId:1,taxes:{residential:9,commercial:9,industrial:9},funding:{power:100,water:100,waste:100,education:100,healthcare:100,police:100,fire:100,park:100,station:100,landmark:100,transport:100},policies:{affordable:false,cleanIndustry:false},fare:3,freightTrains:0,history:[],milestones:[],news:[],delivered:0,exported:0,lostPassengers:0,ledger:{income:0,expenses:0,net:0,taxes:0,fares:0,freight:0,grant:0,services:0,transport:0,roads:0,interest:0,principal:0,housing:0},stats:{},climate:{temperature:20,rain:62},style:'mixed',constructionSpent:0};
  if(starter){
    const road=(a,b,kind=1)=>lineCells(index(...a),index(...b)).forEach(i=>s.tiles[i].road=kind);
    road([0,60],[32,60]);road([8,43],[8,69]);road([18,43],[18,69]);road([28,43],[28,69]);road([8,48],[28,48]);road([8,54],[28,54]);road([8,68],[28,68]);
    const add=(x,z,spec)=>{const b=newBuilding(s,index(x,z),spec);b.status='occupied';b.progress=1;reserve(s,b);s.buildings.push(b);return b;};
    add(2,57,{service:'power'});add(4,61,{service:'water'});
    for(let x=9;x<=16;x++)for(const z of [47,49,53]){const b=add(x,z,{zone:'residential'});b.occupants=scenario==='rescue'?6:8;}
    for(let x=19;x<=24;x++)add(x,49,{zone:'commercial'});
    for(const [x,z,k] of [[19,59,'farm'],[20,59,'mill'],[21,59,'mine'],[22,59,'foundry'],[23,59,'factory'],[24,59,'timber'],[25,59,'furniture']]){add(x,z,{zone:'industrial'}).industry=k;}
    s.cash=Math.round(DIFFICULTIES[difficulty].cash*.48);
    if(scenario==='rescue'){s.debt=30000;s.loanMonths=60;s.cash=18000;}
    if(scenario==='clean'){s.cash+=4000;for(const b of s.buildings.filter(b=>b.zone==='industrial'))b.industry=b.id%2?'foundry':'factory';}
  }
  for(const key of Object.keys(SERVICES))s.funding[key]??=100;
  return s;
}
function newBuilding(s,i,{zone=null,density=1,service=null,size=SERVICES[service]?.size||1,depth=SERVICES[service]?.depth,apartment=false}){
  const id=s.nextId++;return {id,i,zone,service,size,...(depth?{depth}:{}),apartment,level:density,targetLevel:density,upgrade:1,status:'construction',progress:0,occupants:0,emptyMonths:0,goodMonths:0,age:0,industry:'factory',stock:0,inputStock:0,rotation:SERVICES[service]?.recreation?0:(id%4)*Math.PI/2,design:id%7,style:null,protected:false,info:{},lastProduced:0,lastExported:0,lastDelivered:0};
}
export class City {
  constructor(notify=()=>{}){this.notify=notify;this.speed=0;this.clock=0;this.revision=0;this.undoStack=[];this.s=createState();this.traffic=[];this.analyse();}
  replace(s){this.s=s;this.speed=0;this.clock=0;this.undoStack=[];this.traffic=[];this.analyse();this.revision++;}
  log(message){this.s.news.unshift({month:this.s.month,text:message});this.s.news=this.s.news.slice(0,40);this.notify(message);}
  checkpoint(){this.undoStack.push(this.export(false));if(this.undoStack.length>12)this.undoStack.shift();}
  undo(){const old=this.undoStack.pop();if(!old)return 'No construction to undo. History clears when a month ends.';this.s=validateSave(JSON.parse(old));this.analyse();this.revision++;return 'Last construction action undone.';}
  remove(cells,layer='all'){
    const s=this.s,validLayers=['all','zone','road','rail','pipe','powerline','trees'];if(!validLayers.includes(layer))return 'Choose what to delete.';
    const matches=t=>layer==='all'?!!(t.building||t.zone||t.road||t.rail||t.pipe||t.powerline||t.construction||t.type===2):layer==='trees'?t.type===2:!!t[layer]||t.construction?.tool===layer||(layer==='road'&&t.construction?.tool==='avenue');
    const targets=[...new Set(cells)].filter(i=>s.tiles[i]&&matches(s.tiles[i]));if(!targets.length)return 'Nothing here to delete.';
    this.checkpoint();
    for(const i of targets){const t=s.tiles[i];
      if(layer==='all'||layer==='zone'){if(t.building){const b=this.buildingsById.get(t.building);if(b&&(layer==='all'||b.zone)){s.buildings=s.buildings.filter(v=>v.id!==b.id);for(const j of buildingCells(b)){s.tiles[j].building=null;s.tiles[j].zone=null;}}}t.zone=null;}
      if(layer==='all'||t.construction?.tool===layer||(layer==='road'&&t.construction?.tool==='avenue'))delete t.construction;
      if(layer==='all')Object.assign(t,{road:0,rail:false,pipe:false,powerline:false});
      else if(['road','rail','pipe','powerline'].includes(layer))t[layer]=layer==='road'?0:false;
      if((layer==='all'||layer==='trees')&&t.type===2){t.type=0;t.age=0;}
    }
    this.analyse();this.revision++;return `Deleted ${layer==='all'?'everything':layer==='zone'?'zoning and its buildings':layer} on ${targets.length} tile${targets.length===1?'':'s'}. Ctrl+Z to undo before the next month.`;
  }
  spend(cost){if(this.s.cash<cost)return false;this.s.cash-=cost;this.s.constructionSpent+=cost;return true;}
  edit(tool,cells,options={}){
    if(tool==='bulldoze'&&!options.quote)return this.remove(cells,options.deleteLayer||'all');
    const s=this.s,changes=[],occupiedCells=new Set(),factor=DIFFICULTIES[s.difficulty].cost;let total=0,skipped=0;
    if(ZONES[tool]){const gate=densityGate(s,options.density||1);if(gate)return gate;}
    if(tool==='apartments'&&s.stats.population<250)return 'Apartment blocks unlock at 250 residents. Each 2 × 2 block houses up to 240 people.';
    if(tool==='skyscraper'){const gate=densityGate(s,4);if(gate)return gate;if(s.debt>0)return 'Repay city debt before commissioning a skyscraper.';}
    if(tool==='landmark'&&!s.projects.includes('riverfront'))return 'Complete Riverfront Revival to unlock the waterfront market.';
    for(const i of [...new Set(cells)]){
      const t=s.tiles[i];if(!t)continue;let cost=0,allowed=owned(s,i)&&(!t.construction||tool==='bulldoze');
      if(!allowed){skipped++;continue;}
      if(SERVICES[tool]||tool==='apartments'||tool==='skyscraper'){
        const size=SERVICES[tool]?.size||(tool==='skyscraper'?4:2),depth=SERVICES[tool]?.depth||size,area=footprint(i,size,depth),elev=area.map(j=>s.tiles[j].elevation);
        if(area.length!==size*depth||area.some(j=>!owned(s,j)||s.tiles[j].building||s.tiles[j].road||s.tiles[j].rail||s.tiles[j].construction||s.tiles[j].elevation<0||occupiedCells.has(j))||Math.max(...elev)-Math.min(...elev)>.9){skipped++;continue;}
        if(SERVICES[tool]?.shore&&!perimeter({i,size,depth}).some(j=>s.tiles[j].elevation<0))return 'River beaches need a 2 × 3 dry, level footprint directly beside river water.';
        if(tool==='skyscraper'){const quality=this.plotQuality(i,size);if(quality.land<70||quality.pollution>=20||['education','healthcare','police','fire'].some(k=>quality.coverage[k]<.8)||!s.routes.some(r=>r.active&&r.riders>0&&r.stops.some(j=>area.some(k=>Math.abs(j%N-k%N)+Math.abs(Math.floor(j/N)-Math.floor(k/N))<=8))))return 'Skyscrapers need land value 70+, pollution below 20, strong school, hospital, police and fire coverage, and used transit within eight tiles.';}
        area.forEach(j=>occupiedCells.add(j));cost=Math.round((SERVICES[tool]?.cost||(tool==='skyscraper'?120000:4800))*factor);changes.push({i,cost,area});total+=cost;continue;
      }
      if(ZONES[tool]){cost=ZONES[tool].cost*(options.density||1);const existing=this.buildingsById.get(t.building);allowed=!t.road&&!t.rail&&t.elevation>=0&&!existing?.service&&(!existing||existing.zone===tool)&&!(districtOf(s,i)==='oldtown'&&(options.density||1)>2);if(t.zone===tool&&t.density===(options.density||1))allowed=false;}
      else if(tool==='road'||tool==='avenue'){const level=tool==='avenue'?2:1;allowed=!t.building&&t.road<level;cost=t.elevation<0?480*level:level===2?160:65;}
      else if(tool==='rail'){allowed=!t.building&&!t.rail;cost=t.elevation<0?520:110;}
      else if(tool==='powerline'||tool==='pipe'){allowed=!t[tool]&&!t.building;cost=tool==='pipe'?15:20;}
      else if(SERVICES[tool]){allowed=!t.building&&!t.road&&!t.rail&&t.elevation>=0;cost=SERVICES[tool].cost;}
      else if(tool==='bulldoze'){const layer=options.deleteLayer||'all';allowed=layer==='all'?!!(t.building||t.road||t.rail||t.zone||t.powerline||t.pipe||t.construction||t.type===2):layer==='trees'?t.type===2:!!t[layer]||t.construction?.tool===layer||(layer==='road'&&t.construction?.tool==='avenue');cost=0;}
      else if(['raise','lower','forest','flatten'].includes(tool)){allowed=!t.building&&!t.road&&!t.rail;cost=tool==='forest'?35:60;if(tool==='raise'&&t.elevation>=5||tool==='lower'&&t.elevation<=-2)allowed=false;}
      else allowed=false;
      cost=Math.round(cost*factor);if(allowed){changes.push({i,cost});total+=cost;}else skipped++;
    }
    if(!changes.length)return 'No eligible land. Buy adjacent parcels; facilities need a clear, level footprint.';
    if(options.quote)return {cost:total,count:changes.length,skipped,cells:[...occupiedCells],days:SERVICES[tool]?.days||({road:1,avenue:2,rail:7,powerline:3,pipe:2,apartments:21,skyscraper:30})[tool]||0};
    if(s.cash<total)return `This costs $${total.toLocaleString()}; the treasury has $${Math.floor(s.cash).toLocaleString()}.`;
    this.checkpoint();this.spend(total);
    for(const {i} of changes){const t=s.tiles[i];
      if(ZONES[tool]){if(t.building&&t.zone!==tool){s.buildings=s.buildings.filter(b=>b.id!==t.building);t.building=null;}t.zone=tool;t.density=options.density||1;t.type=0;}
      else if(['road','avenue','rail','powerline','pipe'].includes(tool)){t.construction={tool,remaining:({road:1,avenue:2,rail:7,powerline:3,pipe:2})[tool],total:({road:1,avenue:2,rail:7,powerline:3,pipe:2})[tool]};if(['road','avenue','rail'].includes(tool))t.zone=null;t.type=0;}
      else if(SERVICES[tool]||tool==='apartments'||tool==='skyscraper'){const b=newBuilding(s,i,tool==='apartments'?{zone:'residential',density:2,size:2,apartment:true}:tool==='skyscraper'?{zone:'residential',density:4,size:4}:{service:tool});if(SERVICES[tool]?.decoration){b.status='occupied';b.progress=1;}reserve(s,b);s.buildings.push(b);}
      else if(tool==='bulldoze'){s.buildings=s.buildings.filter(b=>b.id!==t.building);Object.assign(t,{building:null,road:0,rail:false,powerline:false,pipe:false,zone:null});}
      else if(tool==='forest'){t.type=2;t.moisture=.7;}
      else {t.elevation=tool==='flatten'?1:clamp(t.elevation+(tool==='raise'?1:-1),-2,5);t.type=t.elevation<0?18:0;}
    }
    this.analyse();this.revision++;return `${occupiedCells.size||changes.length} tile${(occupiedCells.size||changes.length)!==1?'s':''} · $${total.toLocaleString()}${skipped?` · ${skipped} unchanged`:''}`;
  }
  buyLand(id){if(!canBuy(this.s,id))return 'Choose an unowned parcel bordering your land.';const cost=parcelPrice(this.s,id);if(this.s.cash<cost)return 'Not enough funds for this parcel.';this.checkpoint();this.spend(cost);this.s.owned.push(id);this.revision++;return `Land purchased for $${cost.toLocaleString()}. Plan its streets before expanding.`;}
  plotQuality(i,size){const s=this.s,area=footprint(i,size),frontage=perimeter({i,size}).filter(j=>s.tiles[j].road).sort((a,b)=>neighbours(b).filter(j=>s.tiles[j].road).length-neighbours(a).filter(j=>s.tiles[j].road).length),road=frontage[0]??-1,coverage=Object.fromEntries(Object.keys(SERVICES).map(k=>[k,road>=0?this.serviceLayers[k][road]:0]));return {coverage,land:clamp(sum(area,j=>this.layers.land[j])/Math.max(1,area.length)+coverage.park*13+coverage.education*8+coverage.healthcare*7+coverage.police*6+coverage.landmark*10,5,100),pollution:Math.max(...area.map(j=>this.layers.pollution[j]))};}
  setDistrict(id,key){if(!this.s.owned.includes(id))return 'Buy this parcel first.';const gate=districtGate(this.s,key);if(gate)return gate;if(this.s.districts[id]===key)return 'This district already has that character.';if(this.s.cash<1200)return 'District planning costs $1,200.';this.checkpoint();this.spend(1200);this.s.districts[id]=key;this.analyse();this.revision++;return 'District character adopted. Inspect its needs and bonuses.';}
  quoteRoute(mode,stops){
    if(!MODES[mode]||stops.length<2||new Set(stops).size!==stops.length)return {error:'Choose at least two different road stops.'};
    if(stops.some(i=>!this.s.tiles[i]?.road))return {error:'Stops must sit on roads. Rail stops also need adjacent track.'};
    const candidate={id:-1,mode,stops,active:true,vehicles:1};const net=new Network({...this.s,routes:[candidate]});const info=net.routeInfo.get(-1);
    if(!info.valid)return {error:mode==='rail'?'Connect every stop with continuous railway track.':'Connect every stop with roads before opening the line.'};
    return {cost:Math.round(MODES[mode].cost+stops.length*MODES[mode].station+info.length*MODES[mode].track),length:info.length,days:MODES[mode].days};
  }
  addRoute(mode,stops,name){const q=this.quoteRoute(mode,stops);if(q.error)return q.error;if(this.s.routes.length>=16)return 'The city can manage 16 lines. Add vehicles to existing lines.';if(this.s.cash<q.cost)return 'Insufficient funds for this line.';this.checkpoint();this.spend(q.cost);this.s.routes.push({id:this.s.nextId++,name:String(name||`${MODES[mode].name} ${this.s.routes.length+1}`).slice(0,40),mode,stops:[...stops],vehicles:1,active:false,constructionDays:q.days,riders:0,waiting:0,lost:0,income:0,investment:q.cost});this.analyse();this.revision++;return `Line construction started: ${q.days} day${q.days===1?'':'s'}. One vehicle is included.`;}
  manageRoute(id,action){const r=this.s.routes.find(r=>r.id===id);if(!r)return;if(r.constructionDays&&action==='toggle')return 'This line is still under construction.';if(action==='add'&&(r.vehicles>=8||this.s.cash<MODES[r.mode].cost))return r.vehicles>=8?'Maximum eight vehicles per line.':'Not enough funds.';if(action==='remove'&&r.vehicles<=1)return 'Keep one vehicle, or delete the line.';this.checkpoint();if(action==='add'){this.spend(MODES[r.mode].cost);r.vehicles++;r.investment+=MODES[r.mode].cost;}if(action==='remove'){r.vehicles--;this.s.cash+=MODES[r.mode].cost*.5;r.investment-=MODES[r.mode].cost;}if(action==='toggle')r.active=!r.active;if(action==='close'){this.s.cash+=r.investment*.35;this.s.routes=this.s.routes.filter(x=>x.id!==id);}this.analyse();this.revision++;return 'Transport plan updated. Ctrl+Z can undo this change.';}
  upgradeService(id){const b=this.s.buildings.find(b=>b.id===id);if(!b?.service)return 'Select a civic building.';if(SERVICES[b.service].decoration)return 'Decorations do not need upgrades.';if(b.renovationDays)return 'This facility already has an upgrade under construction.';if(b.status==='construction')return 'Wait for the facility to open before upgrading it.';if((b.upgrade||1)>=3)return 'This facility is fully upgraded.';const cost=Math.round(SERVICES[b.service].cost*.65);if(this.s.cash<cost)return 'Not enough funds for this upgrade.';this.checkpoint();this.spend(cost);b.pendingUpgrade=(b.upgrade||1)+1;b.renovationDays=7;this.analyse();this.revision++;return 'Upgrade scheduled: 7 days. The facility stays open during work.';}
  borrow(){const s=this.s;if(s.debt>0)return 'Repay the current loan first.';s.cash+=40000;s.debt=40000;s.loanMonths=60;this.revision++;return '$40,000 borrowed for 60 months. Initial monthly interest: $200, declining as the loan is repaid.';}
  repay(){if(!this.s.debt)return 'No outstanding debt.';if(this.s.cash<this.s.debt)return 'The treasury cannot cover the remaining principal.';this.s.cash-=this.s.debt;this.s.debt=0;this.s.loanMonths=0;this.revision++;return 'Loan repaid.';}
  analyse(){
    const s=this.s,event=currentEvent(s),calendar=seasonalState(s),winter=calendar.season==='Winter';
    this.buildingsById=new Map(s.buildings.map(b=>[b.id,b]));Object.defineProperty(s,'buildingIndex',{value:this.buildingsById,configurable:true});
    const net=new Network(s,this.traffic,event.traffic*(winter?1.12:1));this.network=net;
    const buildings=s.buildings,inhabited=buildings.filter(b=>active(b)&&b.zone),residential=inhabited.filter(b=>b.zone==='residential'),businesses=inhabited.filter(b=>b.zone&&b.zone!=='residential'),workplaces=[...businesses,...buildings.filter(b=>active(b)&&SERVICES[b.service]?.jobs)];
    const traffic=new Float64Array(N*N),pollution=new Float64Array(N*N),land=new Float64Array(N*N);
    this.serviceLayers=Object.fromEntries(Object.keys(SERVICES).map(k=>[k,new Float64Array(N*N)]));
    for(const b of buildings){b.info={road:roadAt(s,b.i),power:0,water:0,waste:0,education:0,healthcare:0,police:0,fire:0,park:0,landmark:0,workers:0,employed:0,commute:0,customers:0,freight:0,issues:[],use:0,capacity:0};}
    for(const b of buildings){let emission=active(b)?b.service==='power'?26:b.service==='waste'?19:b.zone==='industrial'?INDUSTRIES[b.industry].pollution*(s.policies.cleanIndustry?.55:1):0:0;emission+=(b.lastWaste||0)*9;if(!emission)continue;const {x,z}=xy(b.i),radius=b.service?12:8;for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){const i=index(x+dx,z+dz),d=Math.hypot(dx,dz);if(i>=0&&d<radius)pollution[i]+=emission*(1-d/radius);}}
    for(let i=0;i<pollution.length;i++)pollution[i]=clamp(pollution[i]+(this.traffic[i]||0)*.07-(s.tiles[i].type===2?8:0),0,100);
    for(const kind of ['power','water']){
      const components=utilityComponents(s,kind==='power'?'powerline':'pipe'),supply=new Float64Array(components.count),need=new Float64Array(components.count);
      for(const b of buildings){const c=components.at(b.i);b.info[kind+'Component']=c;if(c<0)continue;if(b.service===kind){const factor=kind==='water'?clamp(1-pollution[b.i]/180,.35,1)*(event.name.includes('Rain')?1.1:1):1;b.info.capacity=active(b)?SERVICES[kind].capacity*(b.upgrade||1)*s.funding[kind]/100*factor:0;supply[c]+=b.info.capacity;}else need[c]+=SERVICES[b.service]?.decoration?0:b.service?12:b.zone==='residential'?Math.max(2,b.occupants)*(winter&&kind==='power'?1.25:1):capacity(b)*.8;}
      for(const b of buildings){const c=b.info[kind+'Component'];b.info[kind]=c>=0?clamp(supply[c]/Math.max(1,need[c])):0;if(b.service===kind){b.info.use=c>=0?need[c]*b.info.capacity/Math.max(1,supply[c]):0;b.info[kind]=s.funding[kind]>0?1:0;}}
      this[kind+'Grid']={...components,supply,need};
    }
    for(const [kind,spec] of Object.entries(SERVICES)){
      if(spec.decoration||['power','water','station','education','healthcare'].includes(kind))continue;
      for(const facility of buildings.filter(b=>b.service===kind&&active(b))){
        if(facility.info.road<0)continue;
        const distances=net.distances(facility.info.road).dist,targets=inhabited.filter(b=>b.info.road>=0&&distances[b.info.road]<=spec.range);
        const load=b=>kind==='education'?b.zone==='residential'?Math.max(1,b.occupants*.3):0:b.zone==='residential'?Math.max(2,b.occupants):capacity(b)*.45;
        const need=sum(targets,load),cap=spec.capacity*(facility.upgrade||1)*s.funding[kind]/100*Math.min(facility.info.power,facility.info.water);
        facility.info.use=need;facility.info.capacity=cap;
        const layer=spec.recreation?'park':kind,ratio=clamp(cap/Math.max(1,need));for(const b of targets)b.info[layer]=clamp(b.info[layer]+ratio);
        if(ratio>0){const reached=new Set();for(let i=0;i<N*N;i++)if(s.tiles[i].road&&distances[i]<=spec.range)for(const j of [i,...neighbours(i)])reached.add(j);for(const j of reached)this.serviceLayers[layer][j]=clamp(this.serviceLayers[layer][j]+ratio);}
      }
    }
    const terminals=buildings.filter(b=>b.service==='station');
    for(const terminal of terminals){terminal.info.rail=railAt(s,terminal.i);terminal.info.external=!!net.external(terminal.info.rail,'rail');terminal.info.capacity=active(terminal)&&terminal.info.external&&Math.min(terminal.info.power,terminal.info.water)>.5&&terminal.info.road>=0?SERVICES.station.capacity*(terminal.upgrade||1)*s.funding.station/100:0;}
    for(const b of businesses){
      b.info.external=net.external(b.info.road);
      b.info.terminal=terminals.filter(t=>t.info.capacity>0&&s.freightTrains>0&&b.info.road>=0&&net.distances(b.info.road).dist[t.info.road]<=SERVICES.station.range).sort((a,c)=>net.distances(b.info.road).dist[a.info.road]-net.distances(b.info.road).dist[c.info.road])[0]?.id||null;
      b.info.freight=b.info.external||b.info.terminal?1:0;
    }
    // Shops can receive deliveries from stocked shops and finished-goods producers
    // on their road network, even when they have no direct regional trade access.
    for(const shop of businesses.filter(b=>b.zone==='commercial')){
      if(shop.info.road<0)continue;
      const distances=net.distances(shop.info.road).dist;
      shop.info.localSupply=businesses.some(source=>source.id!==shop.id&&source.info.road>=0&&Number.isFinite(distances[source.info.road])&&(
        source.zone==='commercial'&&((source.stock||0)>0||source.info.external||source.info.terminal)||
        source.zone==='industrial'&&['Food','Goods','Furniture'].includes(INDUSTRIES[source.industry].output)
      ));
      if(shop.info.localSupply)shop.info.freight=1;
    }
    // Schools enrol children once; hospitals share the month's patient demand.
    for(const kind of ['education','healthcare']){
      const spec=SERVICES[kind],facilities=buildings.filter(b=>b.service===kind&&active(b));
      for(const b of facilities){b.info.capacity=Math.floor(spec.capacity*(b.upgrade||1)*s.funding[kind]/100*Math.min(b.info.power,b.info.water));b.info.use=0;b.info.students=0;b.info.patients=0;b.info.waiting=0;}
      for(const home of residential){
        const demand=Math.round(home.occupants*(kind==='education'?.3:.05+event.health/200+pollution[home.i]/1000));
        const waitingKey=kind==='education'?'studentsWaiting':'patientsWaiting';home.info[waitingKey]=demand;
        if(home.info.road<0)continue;
        const distances=net.distances(home.info.road).dist;
        const reachable=facilities.filter(b=>b.info.road>=0&&distances[b.info.road]<=spec.range);
        if(!demand){home.info[kind]=reachable.some(b=>b.info.capacity>b.info.use)?1:0;continue;}
        const shares=balancedShares(reachable.map(b=>({id:b.id,b,filled:b.info.use,available:Math.max(0,b.info.capacity-b.info.use),distance:distances[b.info.road]})),demand);
        let admitted=0;
        for(const {b,people} of shares){b.info.use+=people;b.info[kind==='education'?'students':'patients']+=people;admitted+=people;}
        home.info[kind]=clamp(admitted/demand);
        home.info[waitingKey]=demand-admitted;
        if(reachable.length){const nearest=reachable.slice().sort((a,b)=>distances[a.info.road]-distances[b.info.road]||a.id-b.id)[0];nearest.info.waiting+=demand-admitted;}
      }
      for(const b of facilities)if(b.info.road>=0){const distances=net.distances(b.info.road).dist,ratio=clamp(b.info.capacity/Math.max(1,b.info.use+b.info.waiting));for(let i=0;i<N*N;i++)if(s.tiles[i].road&&distances[i]<=spec.range)for(const j of [i,...neighbours(i)])this.serviceLayers[kind][j]=Math.max(this.serviceLayers[kind][j],ratio);}
    }
    const jobSlots=b=>b.service?(SERVICES[b.service].jobs||0)*(b.upgrade||1):capacity(b);
    for(const b of buildings)if(SERVICES[b.service]?.jobs)b.info.jobCapacity=jobSlots(b);
    let population=sum(residential,b=>b.occupants),employed=0,commuteSum=0,transitRiders=0,totalJobs=sum(workplaces,jobSlots);
    const jobsLeft=new Map(workplaces.map(b=>[b.id,Math.floor(jobSlots(b)*(b.info.road>=0?1:0)*Math.min(b.info.power,b.info.water)*(b.service?clamp(s.funding[b.service]/100):b.zone==='industrial'&&!b.info.freight?.35:1))]));
    for(const b of workplaces)b.info.availableJobs=jobsLeft.get(b.id);
    // Rotate household priority each month; scarce work and seats are not always claimed by the first lots.
    const homes=residential.slice().sort((a,b)=>(a.id+s.month*13)%1009-(b.id+s.month*13)%1009);
    for(const home of homes){
      const workers=Math.round(home.occupants*.48);home.info.workforce=workers;if(home.info.road<0)continue;
      const reach=net.distances(home.info.road,'trip').dist;
      const paths=workplaces.filter(b=>(jobsLeft.get(b.id)||0)>0&&b.info.road>=0&&reach[b.info.road]*COMMUTE_TIME_FACTOR<=55).map(b=>({id:b.id,b,filled:b.info.workers,available:jobsLeft.get(b.id),distance:reach[b.info.road]}));
      let left=workers;
      for(const allocation of balancedShares(paths,workers)){const {b}=allocation;if(left<1)break;let people=Math.min(left,allocation.people,jobsLeft.get(b.id));if(people<=0)continue;const trip=net.path(home.info.road,b.info.road,'trip');if(!trip)continue;
        let usedTrip=trip;
        if(trip.routes.length){const eligible=clamp(1-(s.fare-2)*.075,.15,1);const seats=Math.min(...trip.routes.map(id=>Math.max(0,net.routeInfo.get(id).capacity-net.routeInfo.get(id).used)))/2;
          const desired=Math.round(people*eligible),served=Math.floor(Math.min(desired,seats));
          for(const id of trip.routes){const r=net.routeInfo.get(id);r.used+=served*2;r.waiting+=Math.max(0,desired-served)*2;r.fareRiders+=served/trip.routes.length;}
          transitRiders+=served*2;
          const roadTrip=net.path(home.info.road,b.info.road);
          const roadPeople=people-served;
          if(roadTrip&&roadTrip.distance*COMMUTE_TIME_FACTOR<=55){for(const i of roadTrip.roads)traffic[i]+=roadPeople*2;commuteSum+=roadPeople*roadTrip.distance;home.info.commute+=roadPeople*roadTrip.distance;}
          else people=served;
          home.info.commute+=served*trip.distance;commuteSum+=served*trip.distance;
          for(const i of trip.roads)traffic[i]+=served*.15;
        }else {for(const i of usedTrip.roads)traffic[i]+=people*2;home.info.commute+=people*usedTrip.distance;commuteSum+=people*usedTrip.distance;}
        left-=people;home.info.employed+=people;b.info.workers+=people;employed+=people;jobsLeft.set(b.id,jobsLeft.get(b.id)-people);
      }
      home.info.commute=home.info.employed?home.info.commute/home.info.employed*COMMUTE_TIME_FACTOR:15;
      const shops=businesses.filter(b=>b.zone==='commercial'&&b.info.road>=0&&net.distances(home.info.road).dist[b.info.road]<25);
      for(const shop of shops)shop.info.customers+=home.occupants/Math.max(1,shops.length);
    }
    // Operating buses add vehicles to the same streets whose congestion affects them.
    for(const r of s.routes){const ri=net.routeInfo.get(r.id);if(ri.operating&&r.mode==='bus')for(const seg of ri.segments)for(const i of seg.path)traffic[i]+=r.vehicles*2;}
    // Apply the citywide 45% reduction to all generated road traffic.
    for(let i=0;i<traffic.length;i++)traffic[i]*=TRAFFIC_VOLUME_FACTOR;
    let happiness=0,landTotal=0,rentTotal=0,capacityHomes=sum(residential,capacity),vacancies=0;
    const cityValues={jobs:0,housing:0,education:0,healthcare:0,safety:0};
    for(let i=0;i<land.length;i++){
      const {x,z}=xy(i);let green=0,water=0;
      for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){const j=index(x+dx,z+dz);if(j>=0){if(s.tiles[j].type===2)green++;if(s.tiles[j].elevation<0)water++;}}
      land[i]=clamp(32+green*.8+Math.min(15,water)-pollution[i]*.45-(traffic[i]||0)*.035,5,100);
    }
    const seasonalDecorations=buildings.filter(d=>SERVICES[d.service]?.decoration&&active(d)&&(!SERVICES[d.service].season||SERVICES[d.service].season===calendar.season));
    for(const b of buildings){const f=b.info;f.district=districtOf(s,b.i);if(f.district==='university'&&f.education>0)f.education=clamp(f.education*1.15);f.pollution=pollution[b.i];f.land=clamp(land[b.i]+f.park*13+f.education*8+f.healthcare*7+f.police*6+f.landmark*10,5,100);land[b.i]=f.land;f.happiness=0;f.rent=0;f.riverside=perimeter(b).some(i=>neighbours(i).some(j=>s.tiles[j].elevation<0));f.transit=s.routes.some(r=>r.active&&r.stops.some(i=>Math.abs(i%N-b.i%N)+Math.abs(Math.floor(i/N)-Math.floor(b.i/N))<=6));
      if(b.zone==='residential'){
        const available=f.road>=0?sum(workplaces,w=>net.distances(f.road,'trip').dist[w.info.road]*COMMUTE_TIME_FACTOR<=55?(jobsLeft.get(w.id)||0):0):0;
        f.potentialJobs=available;
        const job=b.occupants?clamp(f.employed/Math.max(1,f.workforce)):clamp(available/Math.max(1,capacity(b)*.48));
        const income=100+job*120+f.education*70;
        const marketRent=37+f.land*1.55+Math.max(0,population/Math.max(1,capacityHomes)-.7)*110;
        f.rent=marketRent*(s.policies.affordable?.68:1);f.affordability=clamp(1-(f.rent/Math.max(1,income)-.30)*1.55);f.income=income;
        f.city={jobs:job*100,housing:f.affordability*100,education:f.education*100,healthcare:f.healthcare*100,safety:(f.police+f.fire)*50};
        f.person={health:clamp(45+f.healthcare*42-f.pollution*.45-event.health,0,100),people:clamp(40+f.park*35+f.landmark*20-b.emptyMonths*2,0,100),work:clamp(job*70+f.education*30,0,100),rest:clamp(100-f.commute*1.1-f.pollution*.25,0,100),fun:clamp(25+f.park*60+f.landmark*15,0,100)};
        f.happiness=Math.round((wellbeing(f.city,CITY_WEIGHTS)*.6+wellbeing(f.person,PERSON_WEIGHTS)*.4)*Math.min(1,.35+.65*Math.min(f.power,f.water)));
        if(f.district==='garden')f.happiness=Math.min(100,f.happiness+5);
        const nearbyDecor=seasonalDecorations.some(d=>Math.hypot(d.i%N-b.i%N,Math.floor(d.i/N)-Math.floor(b.i/N))<=5);
        f.decorationBonus=nearbyDecor?1:0;f.holidayBonus=calendar.holiday?3+(nearbyDecor?2:0):0;
        f.happiness=Math.min(100,f.happiness+f.decorationBonus+f.holidayBonus);
        if(f.affordability<.45)f.issues.push('Housing costs too high');if(f.employed<f.workforce*.6&&b.occupants>0)f.issues.push('Too few reachable jobs');if(f.commute>30&&b.occupants>0)f.issues.push('Commute too long');
        happiness+=f.happiness*b.occupants;landTotal+=f.land*b.occupants;rentTotal+=f.rent*b.occupants;
        for(const k of Object.keys(cityValues))cityValues[k]+=f.city[k]*b.occupants;
        vacancies+=Math.max(0,capacity(b)-b.occupants);
      }else if(b.zone){
        f.happiness=clamp((f.workers/Math.max(1,capacity(b)))*70+Math.min(f.power,f.water)*30,0,100);
        if(f.workers<capacity(b)*.35&&active(b))f.issues.push('Too few workers');if(b.zone==='commercial'&&f.customers<capacity(b)*.7)f.issues.push('Too few customers');
        if(b.zone==='industrial'){if(!f.freight)f.issues.push('No freight connection');if(INDUSTRIES[b.industry].input&&b.inputStock<1)f.issues.push('Waiting for '+INDUSTRIES[b.industry].input.toLowerCase());}
      }
      if(!SERVICES[b.service]?.decoration){if(f.road<0)f.issues.unshift('No road access');if(f.power<.5&&b.service!=='power')f.issues.unshift(f.power===0?'No power':'Power capacity exceeded');if(f.water<.5&&b.service!=='water')f.issues.unshift(f.water===0?'No water':'Water capacity exceeded');
      if(b.zone&&f.waste<.5)f.issues.push('Waste collection insufficient');if(f.pollution>48)f.issues.push('High pollution');
      if(b.service==='station'&&!f.external)f.issues.push('No rail connection to the region');
      if(SERVICES[b.service]?.jobs&&active(b)&&f.workers<Math.min(f.jobCapacity,f.availableJobs)*.35)f.issues.push('Too few staff');
      if(b.service&&s.funding[b.service]===0)f.issues.unshift('Service funding is zero');}
      if(b.status==='abandoned')f.issues.unshift('Abandoned — restore services to redevelop');
      if(b.status==='construction')f.issues.unshift('Under construction');
    }
    const average=population?happiness/population:65,unemployment=population?1-employed/Math.max(1,sum(residential,b=>Math.round(b.occupants*.48))):0;
    const commercialCapacity=sum(workplaces.filter(b=>b.zone==='commercial'),capacity),industrialCapacity=sum(workplaces.filter(b=>b.zone==='industrial'),capacity);
    this.demand={
      residential:Math.round(clamp(55+(totalJobs-population*.48)*.45+(average-60)*.8-(s.taxes.residential-9)*6-vacancies*.18,-100,100)),
      commercial:Math.round(clamp(42+population*.38-commercialCapacity*1.5-(s.taxes.commercial-9)*7,-100,100)),
      industrial:Math.round(clamp(55+population*.42-industrialCapacity*.9-(s.taxes.industrial-9)*7,-100,100)),
    };
    this.layers={traffic,pollution,land};this.nextTraffic=traffic;
    s.stats={students:sum(buildings,b=>b.info.students||0),patients:sum(buildings,b=>b.info.patients||0),studentsWaiting:sum(residential,b=>b.info.studentsWaiting||0),patientsWaiting:sum(residential,b=>b.info.patientsWaiting||0),population:Math.round(population),jobs:totalJobs,employed:Math.round(employed),unemployment:clamp(unemployment),happiness:Math.round(average),land:population?landTotal/population:32,rent:population?rentTotal/population:0,vacancy:capacityHomes?vacancies/capacityHomes:0,commute:employed?commuteSum/employed*COMMUTE_TIME_FACTOR:0,riders:Math.round(transitRiders),cityValues:Object.fromEntries(Object.entries(cityValues).map(([k,v])=>[k,population?v/population:0])),season:calendar.season,holiday:calendar.holiday?.name||null,event:event.name,power:sum(buildings,b=>b.service==='power'?b.info.capacity:0),water:sum(buildings,b=>b.service==='water'?b.info.capacity:0)};
  }
  logistics(){
    const s=this.s,net=this.network,event=currentEvent(s),industries=s.buildings.filter(b=>b.zone==='industrial'&&active(b)),shops=s.buildings.filter(b=>b.zone==='commercial'&&active(b));
    let exported=0,freight=0,delivered=0,railLeft=s.freightTrains*240*s.funding.transport/100;
    const terminalLeft=new Map(s.buildings.filter(b=>b.service==='station').map(b=>[b.id,b.info.capacity]));
    const roadLeft=new Map();
    const connection=(a,b)=>a.info.road>=0&&b.info.road>=0?net.path(a.info.road,b.info.road):null;
    const regionalMove=(b,wanted)=>{
      let moved=0;
      if(b.info.terminal){const n=Math.min(wanted,railLeft,terminalLeft.get(b.info.terminal)||0);moved+=n;railLeft-=n;terminalLeft.set(b.info.terminal,(terminalLeft.get(b.info.terminal)||0)-n);}
      if(b.info.external?.path){const gate=b.info.external.path.at(-1);if(!roadLeft.has(gate))roadLeft.set(gate,80);const n=Math.min(wanted-moved,roadLeft.get(gate),14/(1+b.info.external.distance/45));moved+=n;roadLeft.set(gate,roadLeft.get(gate)-n);for(const i of b.info.external.roads)this.nextTraffic[i]+=n*.5;}
      return moved;
    };
    for(const b of industries){b.lastProduced=0;b.lastExported=0;b.lastDelivered=0;}
    // First deliver existing inventories to factories; production cannot conjure inputs.
    for(const target of industries){const spec=INDUSTRIES[target.industry];if(!spec.input)continue;
      for(const source of industries.filter(b=>INDUSTRIES[b.industry].output===spec.input&&b.stock>0)){
        const route=connection(source,target);if(!route||route.distance>65)continue;const amount=Math.min(source.stock,Math.max(0,capacity(target)*2-target.inputStock),20/(1+route.distance/35));
        target.inputStock+=amount;source.stock-=amount;source.lastDelivered+=amount;delivered+=amount;for(const i of route.roads)this.nextTraffic[i]+=amount*.3;
      }
      // A working regional connection imports missing inputs; the business pays, not the treasury.
      if(target.info.freight&&target.inputStock<capacity(target)*.2)target.inputStock+=regionalMove(target,capacity(target)*.2-target.inputStock);
    }
    for(const b of industries){const spec=INDUSTRIES[b.industry];let amount=b.info.workers*.45*spec.rate*Math.min(b.info.power,b.info.water)*(s.policies.cleanIndustry?.9:1)*(s.stats.season==='Autumn'&&b.industry==='farm'?1.4:1);
      if(districtOf(s,b.i)==='port'&&b.info.terminal)amount*=1.2;
      if(spec.input){amount=Math.min(amount,b.inputStock);b.inputStock-=amount;}amount=Math.min(amount,capacity(b)*4-b.stock);b.stock+=amount;b.lastProduced=amount;
    }
    for(const shop of shops){
      for(const b of industries.filter(b=>['Food','Goods','Furniture'].includes(INDUSTRIES[b.industry].output)&&b.stock>0)){
        const route=connection(b,shop);if(!route)continue;const amount=Math.min(b.stock,Math.max(0,capacity(shop)*2-shop.stock),12);b.stock-=amount;shop.stock+=amount;b.lastDelivered+=amount;delivered+=amount;for(const i of route.roads)this.nextTraffic[i]+=amount*.2;
      }
      if(shop.info.freight&&shop.stock<capacity(shop)*.3)shop.stock+=regionalMove(shop,capacity(shop)*.3-shop.stock);
    }
    // Redistribute actual surplus before sales. Reserve each supplier's own
    // customer demand and working inventory so deliveries do not drain it.
    for(const shop of shops){
      const wanted=()=>Math.max(0,capacity(shop)*.3+shop.info.customers*.15*event.trade-shop.stock);
      if(wanted()<=0)continue;
      const suppliers=shops.filter(source=>source.id!==shop.id&&source.stock>0)
        .map(source=>({source,route:connection(source,shop)})).filter(item=>item.route)
        .sort((a,b)=>a.route.distance-b.route.distance);
      for(const {source,route} of suppliers){
        const reserve=capacity(source)*.3+source.info.customers*.15*event.trade;
        const amount=Math.min(wanted(),Math.max(0,source.stock-reserve),12);
        if(amount<=0)continue;
        source.stock-=amount;shop.stock+=amount;source.lastDelivered=(source.lastDelivered||0)+amount;
        delivered+=amount;for(const i of route.roads)this.nextTraffic[i]+=amount*.2;
        if(wanted()<=0)break;
      }
    }
    for(const shop of shops){
      shop.lastProduced=Math.min(shop.stock,shop.info.customers*.15*event.trade);shop.stock-=shop.lastProduced;
    }
    for(const b of industries){if(!b.info.freight||b.stock<1)continue;const amount=regionalMove(b,b.stock);
      b.stock-=amount;b.lastExported=amount;exported+=amount;freight+=amount*CARGO_RATES[INDUSTRIES[b.industry].output]*event.trade;
    }
    // Mail handling is a regional freight service and is capacity limited as well.
    let mail=0;const mailedHomes=new Set();
    for(const terminal of s.buildings.filter(b=>b.service==='station'&&b.info.capacity>0)){
      const reach=net.distances(terminal.info.road).dist;
      for(const home of s.buildings.filter(b=>b.zone==='residential'&&b.occupants>0&&!mailedHomes.has(b.id)&&b.info.road>=0&&reach[b.info.road]<=SERVICES.station.range)){
        const n=Math.min(railLeft,terminalLeft.get(terminal.id)||0,home.occupants*.06);mail+=n;railLeft-=n;terminalLeft.set(terminal.id,(terminalLeft.get(terminal.id)||0)-n);mailedHomes.add(home.id);
      }
    }
    freight+=mail*CARGO_RATES.Mail;
    s.exported+=exported;return {exported,freight,delivered,mail};
  }
  develop(){
    const s=this.s,rules=DIFFICULTIES[s.difficulty];let starts=0;
    
    for(const b of [...s.buildings]){
      const f=b.info,t=s.tiles[b.i];b.age++;
      if(b.status==='construction')continue;
      if(!b.zone)continue;
      const utility=Math.min(f.power,f.water),connected=f.road>=0&&utility>.3;
      const viable=b.zone==='residential'?connected&&f.affordability>.2&&(f.happiness>32||(s.stats.population<150&&f.potentialJobs>0)):connected&&f.workers>=capacity(b)*.2&&(b.zone!=='industrial'||f.freight>0)&&(b.zone!=='commercial'||f.customers>2);
      if(b.zone==='residential'){
        let target=viable?capacity(b)*clamp(.38+(f.happiness-40)/70)*clamp(f.affordability+.2):0;
        if(f.workforce>0)target*=clamp(.4+f.employed/f.workforce,.4,1);
        if(this.demand.residential<0)target*=clamp(1+this.demand.residential/120);
        b.occupants=clamp(Math.round(b.occupants+clamp(target-b.occupants,-Math.max(1,capacity(b)*.07),Math.max(1,capacity(b)*.025*rules.growth))),0,capacity(b));
        if(b.status==='abandoned')b.occupants=0;
      }
      const empty=b.zone==='residential'?b.occupants<1:!viable;
      b.emptyMonths=empty?b.emptyMonths+1:0;b.goodMonths=viable&&f.happiness>58?b.goodMonths+1:0;
      if(b.status!=='abandoned')b.status=empty?'vacant':'occupied';
      if(b.emptyMonths===3)this.log('A building is struggling. Inspect vacancies before the district declines.');
      if(b.emptyMonths>=12&&b.status!=='abandoned'){b.status='abandoned';b.occupants=0;this.log(`A ${ZONES[b.zone].name.toLowerCase()} building was abandoned. Inspect it for the cause.`);}
      if(b.status==='abandoned'&&connected&&this.demand[b.zone]>15&&f.pollution<65){b.status='construction';b.progress=0;b.emptyMonths=0;b.targetLevel=Math.min(t.density,b.level);}
      const next=b.level+1,quality=next>=4?f.land>=85&&f.education>=.85&&f.healthcare>=.85&&f.police>=.8&&f.fire>=.8&&f.transit&&f.pollution<20&&s.debt===0:next>=3?f.land>=65&&f.education>=.65&&f.healthcare>=.65&&f.pollution<35:f.land>=45&&f.power>=.9&&f.water>=.9;
      const towerLand=next!==4||footprint(b.i,4).length===16&&footprint(b.i,4).every(i=>owned(s,i)&&(!s.tiles[i].building||s.tiles[i].building===b.id)&&!s.tiles[i].road&&!s.tiles[i].rail&&!s.tiles[i].construction&&s.tiles[i].elevation>=0&&Math.abs(s.tiles[i].elevation-t.elevation)<.9&&(!s.tiles[i].zone||s.tiles[i].zone===b.zone));
      if(!b.protected&&b.goodMonths>=(next>=4?24:12)&&t.density>b.level&&!densityGate(s,next)&&quality&&towerLand&&this.demand[b.zone]>25&&districtOf(s,b.i)!=='oldtown'){b.status='construction';b.targetLevel=next;if(next===4)b.size=4;reserve(s,b);b.progress=0;b.occupants=0;b.goodMonths=0;}
      b.lastWaste=1-f.waste;
      if(active(b)&&f.fire<.25&&f.pollution>35&&(b.id*17+s.month*31)%179===0){b.status='abandoned';b.occupants=0;this.log('A fire damaged an unprotected building. Improve reachable fire coverage.');}
    }
    const start=(s.month*83)%(N*N);
    for(let k=0;k<N*N&&starts<(s.difficulty==='expert'?2:s.difficulty==='relaxed'?6:3);k++){
      const i=(start+k)%(N*N),t=s.tiles[i];if(!owned(s,i)||!t.zone||t.building||t.road||t.rail||t.construction||t.elevation<0||this.demand[t.zone]<5||roadAt(s,i)<0)continue;
      const pc=this.powerGrid.at(i),wc=this.waterGrid.at(i);if(pc<0||wc<0||this.powerGrid.supply[pc]<=this.powerGrid.need[pc]||this.waterGrid.supply[wc]<=this.waterGrid.need[wc])continue;
      const b=newBuilding(s,i,{zone:t.zone,density:1});if(t.zone==='industrial'){const keys=Object.keys(INDUSTRIES);b.industry=keys[(s.buildings.filter(x=>x.zone==='industrial').length)%keys.length];}
      t.building=b.id;s.buildings.push(b);starts++;this.demand[t.zone]-=4;
    }
  }
  month(){
    const s=this.s;this.undoStack=[];this.analyse();const trade=this.logistics();
    const taxByZone={residential:0,commercial:0,industrial:0};let taxes=0;for(const b of s.buildings.filter(active))if(b.zone){const value=this.taxBase(b)*s.taxes[b.zone]/100;taxes+=value;taxByZone[b.zone]+=value;}
    let fares=0,transport=s.freightTrains*210*s.funding.transport/100;
    for(const r of s.routes){const ri=this.network.routeInfo.get(r.id);r.riders=Math.round(ri.used/2);r.income=ri.fareRiders*s.fare;r.lost=Math.round((r.waiting||0)*.5);r.waiting=Math.min(9999,Math.round(ri.waiting));s.lostPassengers+=r.lost;fares+=r.income;transport+=MODES[r.mode].upkeep*r.vehicles*(r.active?s.funding.transport/100:.2)+ri.length*.5;}
    s.delivered+=s.stats.riders/2;
    const services=sum(s.buildings,b=>b.service?this.serviceBase(b)*s.funding[b.service]/100:0);
    const roads=sum(s.tiles,t=>(t.road===2?1.1:t.road?.45:0)+(t.rail?.8:0)+(t.pipe?.05:0)+(t.powerline?.05:0))*DIFFICULTIES[s.difficulty].upkeep;
    const interest=s.debt*.005,principal=s.debt?Math.min(s.debt,s.debt/Math.max(1,s.loanMonths)):0,housing=s.policies.affordable?s.stats.population*.7:0;
    let grant=Math.max(0,DIFFICULTIES[s.difficulty].grant-s.month)*7.5;
    for(const m of MILESTONES)if(!s.milestones.includes(m.id)&&m.test(s)){s.milestones.push(m.id);grant+=m.reward;this.log(`${m.name} · $${m.reward.toLocaleString()} development grant.`);}
    const income=taxes+fares+trade.freight+grant,expenses=services+transport+roads+interest+principal+housing;
    s.ledger={taxes,...Object.fromEntries(Object.entries(taxByZone).map(([k,v])=>[k+'Tax',v])),fares,freight:trade.freight,grant,services,transport,roads,interest,principal,housing,income,expenses,net:income-expenses,exported:trade.exported,mail:trade.mail};
    s.cash+=s.ledger.net;s.debt=Math.max(0,s.debt-principal);if(s.loanMonths>0)s.loanMonths--;
    this.develop();s.month++;s.day=Math.max(s.day,Math.round((Date.UTC(2000+Math.floor(s.month/12),s.month%12,1)-Date.UTC(2000,0,1))/86400000));this.traffic=Array.from(this.nextTraffic);terrainStep(s.tiles,s.climate,s.month);this.analyse();campaignMonth(this);
    s.history.push({month:s.month,population:s.stats.population,happiness:s.stats.happiness,cash:s.cash,net:s.ledger.net});s.history=s.history.slice(-60);
    if(s.cash<0){this.speed=0;this.log('Treasury below zero. Time paused: reduce funding, close costly routes, raise taxes or use the city loan.');}
    this.revision++;this.save(false);
  }
  taxBase(b){const s=this.s;let base=b.zone==='residential'?b.occupants*(b.info.income||100)*.15:b.info.workers*(b.zone==='commercial'?34:28);if(b.zone==='commercial')base*=clamp(b.lastProduced/Math.max(1,capacity(b)*.12),.15,1.5);if(b.zone==='industrial')base*=clamp((b.lastProduced+b.lastDelivered+b.lastExported)/Math.max(1,capacity(b)*.15),.1,1.5);const d=districtOf(s,b.i);if(d==='garden'&&b.zone==='residential')base*=.92;if(d==='shopping'&&b.zone==='commercial'&&b.info.transit&&b.lastProduced>0)base*=1.2;if(d==='oldtown'&&b.zone==='commercial'&&b.info.park>.5)base*=1.15;return base;}
  serviceBase(b){return SERVICES[b.service].upkeep*(1+((b.upgrade||1)-1)*.7)*DIFFICULTIES[this.s.difficulty].upkeep*(b.status==='construction'?.2:1)*(this.s.policies.cleanIndustry&&b.service==='power'?1.2:1);}
  financeBase(group,key){if(group==='taxes')return sum(this.s.buildings.filter(b=>active(b)&&b.zone===key),b=>this.taxBase(b))/100;if(key==='transport')return (this.s.freightTrains*210+sum(this.s.routes,r=>r.active?MODES[r.mode].upkeep*r.vehicles:0))/100;return sum(this.s.buildings.filter(b=>b.service===key),b=>this.serviceBase(b))/100;}
  advanceConstruction(){
    const s=this.s;let changed=false;
    for(const r of s.routes)if(r.constructionDays){r.constructionDays--;if(r.constructionDays===0){delete r.constructionDays;r.active=true;changed=true;this.log(r.name+' line opened.');}}
    for(const t of s.tiles)if(t.construction){t.construction.remaining--;if(t.construction.remaining<=0){const tool=t.construction.tool;if(tool==='road'||tool==='avenue')t.road=tool==='avenue'?2:1;else t[tool]=true;delete t.construction;changed=true;}}
    if(changed)this.analyse();
    for(const b of s.buildings){if(b.renovationDays){b.renovationDays--;if(b.renovationDays===0){b.upgrade=b.pendingUpgrade;delete b.pendingUpgrade;changed=true;this.log(SERVICES[b.service].name+' upgrade completed.');}}if(b.status!=='construction')continue;const days=b.service?SERVICES[b.service].days:b.apartment?21:[5,14,24,30][b.targetLevel-1];b.progress=Math.min(1,b.progress+1/days);if(b.progress>=1-.00001){b.status=b.service?'occupied':'vacant';b.progress=1;b.level=b.targetLevel;b.emptyMonths=0;changed=true;if(b.service||b.apartment||b.level===4)this.log((b.service?SERVICES[b.service].name:b.level===4?'Skyscraper':'Apartment block')+' opened.');}}
    if(changed)this.analyse();
  }
  tick(dt){if(!this.speed)return;this.clock+=Math.min(dt,.25)*this.speed;while(this.clock>=DAY_SECONDS){this.clock-=DAY_SECONDS;const previous=seasonalState(this.s);this.s.day++;this.advanceConstruction();const date=new Date(Date.UTC(2000,0,1)+this.s.day*86400000),month=(date.getUTCFullYear()-2000)*12+date.getUTCMonth();if(month>this.s.month)this.month();else {if(previous.key!==seasonalState(this.s).key)this.analyse();this.revision++;}const current=seasonalState(this.s);if(current.season!==previous.season)this.log(current.season+' has arrived in Rivergate.');if(current.holiday&&current.holiday.id!==previous.holiday?.id)this.log(current.holiday.name+' begins! '+current.holiday.text+' Holiday happiness +3; nearby seasonal decorations add +2.');}}
  save(tell=true){try{localStorage.setItem(SAVE_KEY,this.export(false));if(tell)this.notify('City saved on this device.');return true;}catch{this.notify('Local saving is unavailable. Use Export city to keep your progress.');return false;}}
  load(){try{const text=localStorage.getItem(SAVE_KEY)||localStorage.getItem('rivergate.city.v1');if(!text)return false;this.replace(validateSave(JSON.parse(text)));return true;}catch{this.notify('The stored city could not be loaded. Your current city is safe.');return false;}}
  export(pretty=true){const tiles=this.s.tiles.map(t=>[t.type,Math.round(t.moisture*1000)/1000,Math.round(t.elevation*1000)/1000,t.age,t.road,+t.rail,+t.powerline,+t.pipe,t.zone?Object.keys(ZONES).indexOf(t.zone)+1:0,t.density,t.building,t.construction||null]);return JSON.stringify({...this.s,tiles},(key,value)=>key==='info'?{}:value,pretty?2:undefined);}
}
export function validateSave(s){
  const fail=()=>{throw new Error('This file is not a valid Rivergate city.');};
  const num=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
  if(!s||![1,2].includes(s.version)||!Array.isArray(s.tiles)||!Array.isArray(s.buildings)||!Array.isArray(s.routes))fail();
  if(s.version===2&&Array.isArray(s.tiles[0]))s.tiles=s.tiles.map(a=>{if(a.length!==12||![0,1].includes(a[5])||![0,1].includes(a[6])||![0,1].includes(a[7])||![0,1,2,3].includes(a[8]))fail();return {type:a[0],moisture:a[1],elevation:a[2],age:a[3],road:a[4],rail:!!a[5],powerline:!!a[6],pipe:!!a[7],zone:Object.keys(ZONES)[a[8]-1]||null,density:a[9],building:a[10],...(a[11]?{construction:a[11]}:{})};});
  if(s.version===1){
    if(s.tiles.length!==48*48)fail();const old=s.tiles,remap=i=>index(i%48,Math.floor(i/48)+38),fresh=createState(s.seed,false,'mayor','sandbox');
    s.tiles=fresh.tiles;old.forEach((t,i)=>s.tiles[remap(i)]=t);s.buildings.forEach(b=>{b.i=remap(b.i);b.size=1;b.apartment=false;});s.routes.forEach(r=>r.stops=r.stops.map(remap));
    Object.assign(s,{version:2,difficulty:'mayor',scenario:'sandbox',scenarioComplete:false,owned:[16,17,18,24,25,26,32,33,34],districts:{},projects:[],profitMonths:0,offer:null,contract:null,celebration:null});
    for(const b of s.buildings.filter(b=>b.service)){
      const size=SERVICES[b.service]?.size;if(!size)fail();s.tiles[b.i].building=null;let chosen=-1;
      for(let radius=0;radius<50&&chosen<0;radius++)for(let dz=-radius;dz<=radius&&chosen<0;dz++)for(let dx=-radius;dx<=radius&&chosen<0;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;const p=xy(b.i),i=index(p.x+dx,p.z+dz),area=footprint(i,size);if(area.length!==size*size||area.some(j=>!owned(s,j)||s.tiles[j].building||s.tiles[j].road||s.tiles[j].rail||s.tiles[j].elevation<0))continue;if(!perimeter({i,size}).some(j=>s.tiles[j].road))continue;chosen=i;}
      if(chosen>=0){b.i=chosen;b.size=size;}reserve(s,b);
    }
  }
  s.day??=Math.round((Date.UTC(2000+Math.floor(s.month/12),s.month%12,1)-Date.UTC(2000,0,1))/86400000);if(!Number.isInteger(s.day)||!num(s.day,0,3.1e8))fail();const date=new Date(Date.UTC(2000,0,1)+s.day*86400000);if((date.getUTCFullYear()-2000)*12+date.getUTCMonth()!==s.month)fail();
  if(typeof s.name!=='string'||s.name.length>60||!Number.isInteger(s.seed)||!Number.isInteger(s.month)||!num(s.month,0,1e7)||!num(s.cash,-1e12,1e12)||!num(s.debt,0,40000)||!num(s.loanMonths,0,60)||s.tiles.length!==N*N||s.buildings.length>N*N||s.routes.length>16||!DIFFICULTIES[s.difficulty]||!SCENARIOS[s.scenario]||typeof s.scenarioComplete!=='boolean'||!Number.isInteger(s.profitMonths)||!num(s.profitMonths,0,1e7))fail();
  if(!Array.isArray(s.owned)||s.owned.length>64||new Set(s.owned).size!==s.owned.length||s.owned.some(id=>!Number.isInteger(id)||!num(id,0,63))||!s.districts||Object.entries(s.districts).some(([k,v])=>!s.owned.includes(Number(k))||!['mixed','garden','oldtown','university','shopping','port'].includes(v))||!Array.isArray(s.projects)||s.projects.some(v=>!['stability','riverfront','community','tradehub','skyline'].includes(v)))fail();
  if(s.funding)for(const [key,spec] of Object.entries(SERVICES))if((spec.recreation||spec.decoration)&&key!=='park'&&s.funding[key]===undefined)s.funding[key]=100;
  if(!s.taxes||Object.keys(ZONES).some(k=>!num(s.taxes[k],0,20))||!s.funding||[...Object.keys(SERVICES),'transport'].some(k=>!num(s.funding[k],0,150))||!s.policies||typeof s.policies.affordable!=='boolean'||typeof s.policies.cleanIndustry!=='boolean'||!num(s.fare,0,12)||!Number.isInteger(s.freightTrains)||!num(s.freightTrains,0,20))fail();
  for(const k of ['delivered','exported','lostPassengers','constructionSpent'])if(!num(s[k],0,1e12))fail();
  const styles=['mixed','contemporary','suburban','european','mediterranean','classical','industrial','futuristic','japanese','brutalist','medieval'];
  if(!s.climate||!num(s.climate.temperature,-20,45)||!num(s.climate.rain,0,100)||!styles.includes(s.style))fail();
  const ids=new Set(),occupied=new Map();
  for(const b of s.buildings){
    if(!Number.isInteger(b.id)||b.id<1||ids.has(b.id)||!Number.isInteger(b.i)||!num(b.i,0,N*N-1)||!Number.isInteger(b.size)||!num(b.size,1,4)||(!ZONES[b.zone]&&!SERVICES[b.service])||(b.zone&&b.service)||!Number.isInteger(b.level)||!num(b.level,1,4)||!Number.isInteger(b.targetLevel)||!num(b.targetLevel,1,4)||!['construction','occupied','vacant','abandoned'].includes(b.status)||!num(b.progress,0,1)||!num(b.occupants,0,capacity(b))||!INDUSTRIES[b.industry]||!num(b.stock,0,1e6)||!num(b.inputStock,0,1e6)||!num(b.rotation,-100,100)||!Number.isInteger(b.design)||!num(b.design,0,6)||typeof b.protected!=='boolean'||(b.style!==null&&!styles.slice(1).includes(b.style)))fail();
    b.upgrade??=1;if(!Number.isInteger(b.upgrade)||!num(b.upgrade,1,3)||!num(b.lastWaste??0,0,1))fail();
    if(b.renovationDays!==undefined&&(!b.service||!Number.isInteger(b.renovationDays)||!num(b.renovationDays,0,7)))fail();if(b.renovationDays&&(!Number.isInteger(b.pendingUpgrade)||b.pendingUpgrade!==b.upgrade+1||b.pendingUpgrade>3))fail();
    for(const k of ['emptyMonths','goodMonths','age','lastProduced','lastExported','lastDelivered'])if(!num(b[k]??0,0,1e9))fail();
    const spec=SERVICES[b.service],depth=b.depth??b.size;if(!Number.isInteger(depth)||!num(depth,1,4)||(b.depth!==undefined&&!spec?.recreation)||(spec?.recreation&&(b.size!==spec.size||depth!==(spec.depth||spec.size)||(depth!==b.size&&b.rotation!==0))))fail();
    const cells=buildingCells(b);if(cells.length!==b.size*depth)fail();for(const i of cells){if(occupied.has(i))fail();occupied.set(i,b.id);}
    if(b.occupants>0&&(b.zone!=='residential'||!active(b)))fail();ids.add(b.id);b.info={};
  }
  for(let i=0;i<s.tiles.length;i++){const t=s.tiles[i];if(!t||!num(t.elevation,-2,20)||!Number.isInteger(t.type)||!num(t.type,0,19)||!num(t.moisture,0,1)||!num(t.age,0,1e9)||![0,1,2].includes(t.road)||!Number.isInteger(t.density)||!num(t.density,1,4)||(t.zone!==null&&!ZONES[t.zone])||['rail','powerline','pipe'].some(k=>typeof t[k]!=='boolean')||t.building!==(occupied.get(i)??null)||(t.building&&(t.road||t.rail)))fail();if(t.construction&&(!['road','avenue','rail','pipe','powerline'].includes(t.construction.tool)||!num(t.construction.remaining,1,30)||!num(t.construction.total,1,30)||t.building))fail();}
  for(const b of s.buildings)if(b.zone&&buildingCells(b).some(i=>s.tiles[i].zone!==b.zone))fail();
  for(const r of s.routes){if(!Number.isInteger(r.id)||r.id<1||ids.has(r.id)||!MODES[r.mode]||typeof r.name!=='string'||r.name.length>40||!Array.isArray(r.stops)||r.stops.length<2||r.stops.length>12||new Set(r.stops).size!==r.stops.length||r.stops.some(i=>!Number.isInteger(i)||!num(i,0,N*N-1))||!Number.isInteger(r.vehicles)||!num(r.vehicles,1,8)||typeof r.active!=='boolean')fail();for(const k of ['riders','waiting','lost','income','investment'])if(!num(r[k],0,1e12))fail();if(r.constructionDays!==undefined&&(!Number.isInteger(r.constructionDays)||!num(r.constructionDays,1,30)||r.active))fail();ids.add(r.id);}
  if(!Number.isInteger(s.nextId)||s.nextId<=Math.max(0,...ids)||!Array.isArray(s.history)||s.history.length>60||s.history.some(h=>!['month','population','happiness','cash','net'].every(k=>num(h[k],-1e12,1e12)))||!Array.isArray(s.milestones)||s.milestones.some(id=>!MILESTONES.some(m=>m.id===id))||!Array.isArray(s.news)||s.news.length>40||s.news.some(n=>typeof n.text!=='string'||n.text.length>600||!num(n.month,0,1e9))||!s.ledger||!Object.values(s.ledger).every(Number.isFinite))fail();
  if(s.offer&&(!num(s.offer.month,0,1e7)||!num(s.offer.expires,s.offer.month,1e7)))fail();if(s.contract&&(!num(s.contract.deadline,0,1e7)||!num(s.contract.exported,0,1e12)||!num(s.contract.factories,0,N*N)))fail();
  return s;
}
