export const N=152, TILE=10, DAY_SECONDS=7.5, SAVE_KEY='rivergate.city.v2';
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const money=n=>'$'+Math.round(n).toLocaleString('en-US');
export const ZONES={
  residential:{name:'Residential',short:'R',color:'#79c789',capacity:[12,60,240,900],cost:45},
  commercial:{name:'Commercial',short:'C',color:'#6daee6',capacity:[10,48,180,640],cost:60},
  industrial:{name:'Industrial',short:'I',color:'#edbc68',capacity:[16,64,220,360],cost:55},
};
export const SERVICES={
  power:{jobs:24,name:'Power plant',icon:'ϟ',cost:18000,upkeep:360,capacity:3200,range:999,size:3,days:20,color:'#d8b35e',desc:'3 × 3 industrial campus. Connected streets and cables distribute power. Allow twenty days for construction.'},
  water:{jobs:18,name:'Water treatment plant',icon:'≈',cost:12000,upkeep:240,capacity:3000,range:999,size:3,days:18,color:'#72bed3',desc:'3 × 3 campus with settling tanks and filtration. Pollution reduces output; allow eighteen days for construction.'},
  waste:{name:'Recycling centre',icon:'♲',cost:5000,upkeep:130,capacity:1200,range:35,color:'#a6af80',desc:'Collects waste over reachable streets. Uncollected waste creates pollution.'},
  education:{jobs:30,name:'School campus',icon:'▤',cost:8000,upkeep:240,capacity:700,range:42.9,size:2,days:14,color:'#dfad77',desc:'2 × 2 campus with classrooms and a playground. School places raise wages and support skilled districts.'},
  healthcare:{jobs:60,name:'General hospital',icon:'✚',cost:14000,upkeep:420,capacity:1800,range:52.8,size:3,days:30,color:'#e58f83',desc:'3 × 3 hospital with emergency department, gardens and a helipad. Healthcare improves resilience during outbreaks.'},
  police:{name:'Police station',icon:'◇',cost:4500,upkeep:150,capacity:850,range:39.6,color:'#8ca2d3',desc:'Reduces crime and improves neighbourhood safety.'},
  fire:{name:'Fire station',icon:'♜',cost:4500,upkeep:150,capacity:850,range:39.6,color:'#de8266',desc:'Reachable engines reduce fire risk and prevent building damage.'},
  park:{name:'Small park',icon:'♧',cost:450,upkeep:12,capacity:300,range:9,size:1,recreation:true,color:'#78b37a',desc:'1 × 1 green space with trees and benches. Improves friendships, fun and land value.'},
  largePark:{name:'Large park',icon:'♧',cost:1800,upkeep:40,capacity:1000,range:18,size:2,days:7,recreation:true,color:'#78b37a',desc:'2 × 2 landscaped park with walking paths, a fountain and picnic areas. Serves a wider neighbourhood.'},
  pool:{name:'Swimming pool',icon:'≈',cost:3600,upkeep:85,capacity:650,range:15,size:2,depth:1,days:10,recreation:true,color:'#69cbd6',desc:'2 × 1 outdoor swimming pool with lane markings and sun loungers. Requires working power and water.'},
  beach:{name:'River beach',icon:'☀',cost:2200,upkeep:35,capacity:800,range:18,size:2,depth:3,days:6,recreation:true,shore:true,color:'#e5c68b',desc:'2 × 3 sandy river beach with umbrellas and a lifeguard hut. Place on dry, level land directly beside river water.'},
  playground:{name:'Playground',icon:'⚑',cost:850,upkeep:20,capacity:350,range:10,size:1,days:4,recreation:true,color:'#e8ae74',desc:'1 × 1 playground with a slide, climbing tower and swings. Gives families a local place to play.'},
  tennis:{name:'Tennis courts',icon:'◉',cost:2400,upkeep:50,capacity:450,range:14,size:2,depth:1,days:7,recreation:true,color:'#98bc86',desc:'2 × 1 fenced tennis court with a net and court markings. Supports neighbourhood recreation.'},
  basketball:{name:'Basketball court',icon:'◎',cost:1900,upkeep:35,capacity:450,range:13,size:2,depth:1,days:6,recreation:true,color:'#d29c76',desc:'2 × 1 basketball court with two hoops and painted markings. Creates space for community sport.'},
  picnic:{name:'Picnic garden',icon:'♣',cost:650,upkeep:15,capacity:300,range:10,size:1,days:3,recreation:true,color:'#8db77c',desc:'1 × 1 shaded picnic garden with tables and flower beds. Helps neighbours meet and relax.'},
  station:{name:'Rail terminal',icon:'▥',cost:9000,upkeep:180,capacity:240,range:18,color:'#c1a58a',desc:'Connect to road and track. Freight trains require a continuous rail connection to a map edge.'},
  landmark:{name:'Civic hall',icon:'▱',cost:15000,upkeep:120,capacity:1200,range:18,color:'#e0cdac',desc:'A landmark supporting community life, attractiveness and city identity.'},
};
// Decorative lots share placement, occupancy, deletion and save handling with facilities.
export const DECORATIONS={
  decor_bench:{name:'Garden bench',icon:'▰',cost:40,desc:'A slatted timber bench with cast-metal legs.'},
  decor_flowers:{name:'Flower bed',icon:'✿',cost:65,season:'Spring',desc:'A raised planter of colourful flowers for spring festivals.'},
  decor_lamp:{name:'Lantern post',icon:'✧',cost:80,desc:'A warm ornamental street lantern.'},
  decor_fountain:{name:'Garden fountain',icon:'◉',cost:220,desc:'A small tiered ornamental fountain with a stone basin.'},
  decor_bunting:{name:'Festival bunting',icon:'⚑',cost:55,season:'Summer',desc:'Colourful pennants strung between timber poles.'},
  decor_harvest:{name:'Harvest display',icon:'❧',cost:90,season:'Autumn',desc:'Pumpkins, hay bales and golden leaves for the harvest fair.'},
  decor_snowman:{name:'Snowman',icon:'☃',cost:45,season:'Winter',desc:'A permanent snowman ornament with a scarf, hat and carrot nose.'},
  decor_tree:{name:'Festive tree',icon:'♠',cost:140,season:'Winter',desc:'An evergreen with golden ornaments and a star topper.'},
};
for(const spec of Object.values(DECORATIONS))Object.assign(spec,{decoration:true,size:1,days:0,upkeep:0,capacity:0,range:0,color:'#d4b46e'});
Object.assign(SERVICES,DECORATIONS);
export const MODES={
  bus:{name:'Bus',color:'#eeb44f',cost:3500,station:240,track:12,upkeep:155,capacity:22,speed:6.6,days:1},
  tram:{name:'Tram',color:'#df735f',cost:12500,station:800,track:65,upkeep:410,capacity:64,speed:9,days:14},
  metro:{name:'Metro',color:'#52b5b0',cost:28500,station:1900,track:155,upkeep:800,capacity:130,speed:15,days:30},
  rail:{name:'Passenger rail',color:'#aa9aca',cost:16000,station:900,track:25,upkeep:450,capacity:110,speed:18,days:21},
};
export const INDUSTRIES={
  farm:{name:'Farm',input:null,output:'Grain',rate:1.4,pollution:5},
  timber:{name:'Timber yard',input:null,output:'Timber',rate:1.2,pollution:10},
  mine:{name:'Ore works',input:null,output:'Ore',rate:1.1,pollution:24},
  mill:{name:'Food mill',input:'Grain',output:'Food',rate:1,pollution:12},
  foundry:{name:'Steel works',input:'Ore',output:'Steel',rate:.8,pollution:30},
  factory:{name:'Goods factory',input:'Steel',output:'Goods',rate:.9,pollution:21},
  furniture:{name:'Furniture workshop',input:'Timber',output:'Furniture',rate:.9,pollution:12},
};
export const CARGO_RATES={Grain:3,Timber:4,Ore:4,Food:6,Steel:7,Goods:9,Furniture:10,Mail:2};
export const OVERLAYS={none:'City view',zones:'Zoning',traffic:'Traffic',pollution:'Pollution',land:'Land value',power:'Electricity',water:'Water',waste:'Waste collection',education:'Education',healthcare:'Healthcare',police:'Police',fire:'Fire protection',happiness:'Happiness',jobs:'Job access',freight:'Freight access'};
export const CITY_WEIGHTS={jobs:.22,housing:.22,education:.16,healthcare:.20,safety:.20};
export const PERSON_WEIGHTS={health:.24,people:.24,work:.18,rest:.18,fun:.16};
export function wellbeing(values,weights){const entries=Object.entries(weights).map(([k,w])=>[100*Math.pow(clamp(values[k]/100),.75),w]);return Math.round(entries.reduce((v,[s,w])=>v+s*w,0)*.75+Math.min(...entries.map(([s])=>s))*.25);}
export const EVENTS=[
  {name:'A quiet month',text:'A good time to plan the next neighbourhood.',traffic:1,health:0,trade:1},
  {name:'Rain over Rivergate',text:'Road travel is slower. Water output improves.',traffic:1.22,health:0,trade:1},
  {name:'Market festival',text:'Shops need more goods and customer trips.',traffic:1.1,health:0,trade:1.25},
  {name:'Flu season',text:'Healthcare coverage matters more this month.',traffic:.95,health:15,trade:.95},
  {name:'Regional trade fair',text:'Export demand and freight income are higher.',traffic:1.08,health:0,trade:1.3},
  {name:'School open month',text:'Education supports skilled work and household income.',traffic:1.1,health:0,trade:1},
];
export const MILESTONES=[
  {id:'village',name:'A place to call home',desc:'Reach 200 residents',reward:2000,test:s=>s.stats.population>=200},
  {id:'connected',name:'A city on the move',desc:'Complete 250 passenger journeys',reward:1500,test:s=>s.delivered>=250},
  {id:'town',name:'Growing together',desc:'Reach 750 residents and 60 happiness',reward:3500,test:s=>s.stats.population>=750&&s.stats.happiness>=60},
  {id:'trade',name:'Made in Rivergate',desc:'Export 500 units of freight',reward:3000,test:s=>s.exported>=500},
  {id:'city',name:'A flourishing city',desc:'Reach 2,000 residents and a positive monthly balance',reward:5000,test:s=>s.stats.population>=2000&&s.ledger.net>0},
  {id:'regional',name:'Regional centre',desc:'Reach 10,000 residents and 70 happiness',reward:7500,test:s=>s.stats.population>=10000&&s.stats.happiness>=70},
  {id:'metropolis',name:'A skyline earned',desc:'Reach 75,000 residents, 80 happiness and 12 profitable months',reward:11250,test:s=>s.stats.population>=75000&&s.stats.happiness>=80&&s.profitMonths>=12},
];
// Larger facilities reserve every tile, including their yards and access courts.
for(const [key,spec] of Object.entries(SERVICES)){spec.size??=['waste','police','fire','station','landmark'].includes(key)?2:1;spec.days??=key==='park'?3:key==='station'?18:key==='landmark'?24:12;}
export const DIFFICULTIES={
  relaxed:{name:'Relaxed',cash:110000,cost:.8,upkeep:.75,growth:1.2,grant:36,description:'Room to experiment, construction and progression still matter.'},
  mayor:{name:'Mayor',cash:65000,cost:1,upkeep:1,growth:.7,grant:18,description:'Limited capital, temporary support and deliberate growth.'},
  expert:{name:'Expert',cash:48000,cost:1.25,upkeep:1.3,growth:.45,grant:12,description:'Tight finances, costly expansion and patient development.'},
};
export const DISTRICTS={
  mixed:{name:'Mixed neighbourhood',color:'#90ad84',desc:'A flexible district with no special bonus.'},
  garden:{name:'Garden suburb',color:'#71aa65',desc:'Residential happiness +5, residential tax receipts −8%. Unlocked by Keep the lights on.'},
  oldtown:{name:'Old town',color:'#c1a577',desc:'Traditional façades. Shops earn +15% with park coverage; density is limited to medium.'},
  university:{name:'University quarter',color:'#9198cd',desc:'Education coverage +15% when a school is reachable. Complete A place to grow up and maintain a working school.'},
  shopping:{name:'Market district',color:'#72aac4',desc:'Commercial receipts +20% with transit access and reliable goods. Requires 500 people.'},
  port:{name:'Industrial port',color:'#c28b68',desc:'Factory production +20% near a working freight terminal. Complete Made here, shipped everywhere and maintain rail freight.'},
};
