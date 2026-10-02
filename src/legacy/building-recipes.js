export const STYLES = {
  contemporary:{name:'Contemporary',color:'#e5dfce',trim:'#f6f0de',roofColor:'#667064',material:'plaster',windows:'ribbon',roof:'flat'},
  suburban:{name:'Suburban',color:'#e3dcc6',trim:'#f6edd9',roofColor:'#716d62',material:'plaster',windows:'classic',roof:'gable'},
  european:{name:'European',color:'#decbaa',trim:'#f5e7ca',roofColor:'#697678',material:'stone',windows:'arched',roof:'mansard'},
  mediterranean:{name:'Mediterranean',color:'#efddbf',trim:'#f7edda',roofColor:'#b46e4b',material:'plaster',windows:'arched',roof:'hip'},
  medieval:{name:'Medieval',color:'#a7a68e',trim:'#c8c4a9',roofColor:'#647567',material:'stone',windows:'arched',roof:'battlements'},
  classical:{name:'Neoclassical',color:'#e8dcc0',trim:'#fff0cf',roofColor:'#668e80',material:'stone',windows:'arched',roof:'dome'},
  industrial:{name:'Industrial',color:'#a67156',trim:'#d1b992',roofColor:'#565c55',material:'brick',windows:'grid',roof:'flat'},
  futuristic:{name:'Futuristic',color:'#8eb9b4',trim:'#e2ece2',roofColor:'#738d87',material:'glass',windows:'grid',roof:'stepped'},
  japanese:{name:'Japanese',color:'#d1bb95',trim:'#685844',roofColor:'#555f58',material:'wood',windows:'classic',roof:'hip'},
  brutalist:{name:'Brutalist',color:'#b6b6a7',trim:'#878d80',roofColor:'#a0a393',material:'concrete',windows:'ribbon',roof:'flat'},
};

const building=(id,name,category,style,width,depth,floors,extra={})=>({id,name,category,style,width,depth,floors,kind:'building',floorHeight:3.2,footprint:'rectangle',spacing:2.5,details:false,...STYLES[style],name,style,...extra});
export const BUILDINGS = [
  building('suburban','Suburban house','Homes','suburban',10,8,2),
  building('european','European townhouse','Homes','european',8,9,4),
  building('villa','Garden villa','Homes','mediterranean',15,11,2,{footprint:'l'}),
  building('apartment','Apartments','Homes','contemporary',14,12,6,{windows:'classic'}),
  building('cottage','Country cottage','Homes','suburban',8,7,1,{material:'stone',roofColor:'#826744'}),
  building('mansion','Modern mansion','Homes','contemporary',18,13,2,{footprint:'u'}),
  building('skyscraper','Skyscraper','City','futuristic',12,12,18),
  building('office','Office building','City','contemporary',17,12,7,{material:'glass',windows:'grid'}),
  building('hotel','Grand hotel','City','european',23,14,6,{footprint:'u'}),
  building('tower','Art deco tower','City','classical',11,11,15,{roof:'stepped',windows:'classic'}),
  building('castle','Castle','Historic','medieval',20,17,3,{footprint:'courtyard'}),
  building('palace','Palace','Historic','classical',25,17,3,{footprint:'u'}),
  building('cathedral','Cathedral','Historic','european',13,22,4,{footprint:'t',roof:'spire',floorHeight:4}),
  building('pagoda','Pagoda','Historic','japanese',11,11,4,{roof:'hip'}),
  building('hospital','Hospital','Public','contemporary',24,17,5,{footprint:'t',color:'#ece9df'}),
  building('school','School','Public','industrial',22,15,2,{footprint:'u',color:'#bb8b69'}),
  building('library','Public library','Public','classical',18,12,2,{roof:'flat'}),
  building('museum','Museum','Public','brutalist',22,17,2,{footprint:'courtyard'}),
  building('shop','Corner shop','Shops','european',9,7,2,{roof:'gable'}),
  building('mall','Shopping mall','Shops','contemporary',29,22,3,{footprint:'courtyard',windows:'grid'}),
  building('gas','Gas station','Shops','contemporary',12,7,1,{color:'#e9e0c8',trim:'#567e68'}),
  building('cafe','Neighborhood café','Shops','mediterranean',9,8,1,{roof:'flat'}),
  building('warehouse','Warehouse','City','industrial',24,16,1,{floorHeight:6,roof:'gable',windows:'ribbon'}),
  building('pavilion','Garden pavilion','Public','japanese',11,11,1,{footprint:'round',roof:'dome'}),
  building('townhall','Town hall','Public','classical',21,15,3,{footprint:'t',roof:'dome'}),
];

// Ten deliberately different editions for each of the 25 building families.
// IDs and recipes are stable so exported projects reopen with their exact design.
const SURPRISE_EDITIONS=[
  {id:'atrium',name:'Atrium',footprint:'courtyard',roof:'flat',width:1.18,depth:1.17,floors:1,spacing:2.7,color:'#e9dbc1',trim:'#faf0d9',roofColor:'#71866e'},
  {id:'alpine',name:'Alpine',footprint:'l',roof:'gable',width:.92,depth:1.12,floors:0,spacing:2.25,color:'#d7c4a7',trim:'#f5e7d0',roofColor:'#6d584b'},
  {id:'cypress',name:'Cypress',footprint:'u',roof:'hip',width:1.13,depth:1.09,floors:1,spacing:2.4,color:'#e4d0ac',trim:'#f9ecd5',roofColor:'#576b61'},
  {id:'dune',name:'Dune',footprint:'t',roof:'flat',width:1.24,depth:.87,floors:-1,spacing:3.1,color:'#d8b98b',trim:'#f3dec2',roofColor:'#ae785c'},
  {id:'ember',name:'Ember',footprint:'rectangle',roof:'mansard',width:.86,depth:1.22,floors:2,spacing:2.1,color:'#a9745f',trim:'#d8bca0',roofColor:'#454f53'},
  {id:'harbor',name:'Harbor',footprint:'l',roof:'hip',width:1.27,depth:1.13,floors:0,spacing:2.8,color:'#c3d0ce',trim:'#eef0df',roofColor:'#49767b'},
  {id:'lantern',name:'Lantern',footprint:'u',roof:'stepped',width:.97,depth:.94,floors:3,spacing:2.15,color:'#adaf9b',trim:'#e3d7b9',roofColor:'#8d604b'},
  {id:'marble',name:'Marble',footprint:'rectangle',roof:'dome',width:1.14,depth:1.2,floors:1,spacing:3,color:'#e9e4d8',trim:'#fff6e5',roofColor:'#6e978b'},
  {id:'skyline',name:'Skyline',footprint:'t',roof:'stepped',width:.91,depth:1.05,floors:4,spacing:2,color:'#8eb1b1',trim:'#d8ece8',roofColor:'#456d78'},
  {id:'willow',name:'Willow',footprint:'courtyard',roof:'gable',width:1.2,depth:1.28,floors:-1,spacing:2.55,color:'#c6d0ae',trim:'#eee8ca',roofColor:'#78836a'},
];
const SURPRISE_STYLES={
  Homes:['suburban','european','mediterranean','contemporary','japanese'],
  City:['contemporary','futuristic','industrial','brutalist','european'],
  Historic:['medieval','european','classical','japanese','mediterranean'],
  Public:['classical','contemporary','brutalist','industrial','japanese'],
  Shops:['european','mediterranean','contemporary','industrial','futuristic'],
};
export const SURPRISES=BUILDINGS.flatMap((base,familyIndex)=>SURPRISE_EDITIONS.map((edition,editionIndex)=>{
  const style=SURPRISE_STYLES[base.category][(familyIndex+editionIndex)%5];
  const small=['gas','cafe','shop','warehouse','pavilion','cottage'].includes(base.id);
  const floors=Math.max(1,Math.min(60,base.floors+(small?Math.round(edition.floors/2):edition.floors)));
  const roof=base.id==='gas'?'flat':base.id==='castle'&&editionIndex%3===0?'battlements':base.id==='cathedral'&&editionIndex%3===0?'spire':edition.roof;
  const footprint=base.id==='pavilion'&&editionIndex%2===0?'round':edition.footprint;
  return building(`surprise-${base.id}-${edition.id}`,`${edition.name} ${base.name}`,base.category,style,
    Math.max(4,Math.round(base.width*edition.width)),Math.max(4,Math.round(base.depth*edition.depth)),floors,{
      archetype:base.id,footprint,roof,color:edition.color,trim:edition.trim,roofColor:edition.roofColor,
      spacing:edition.spacing,floorHeight:base.floorHeight+(editionIndex%3===0?.3:0),
      windows:editionIndex%4===0?'classic':editionIndex%4===1?'arched':editionIndex%4===2?'ribbon':'grid',
      material:style==='industrial'?'brick':style==='futuristic'?'glass':style==='medieval'?'stone':STYLES[style].material,
    });
}));

// One hundred more designs per family: ten plan/roof forms times ten distinct
// architectural finishes. These extend the original ten, preserving save IDs.
const NEW_FINISHES=[
  {id:'aurora',name:'Aurora',color:'#dde4da',trim:'#f5f4e9',roofColor:'#6a8b89',width:1.04,depth:1.09,floors:1,roof:'hip',material:'plaster'},
  {id:'birch',name:'Birch',color:'#dbcba9',trim:'#f4e9d3',roofColor:'#7b765f',width:.93,depth:1.15,floors:0,roof:'gable',material:'wood'},
  {id:'coral',name:'Coral',color:'#cb8f77',trim:'#f0cdb1',roofColor:'#904f4d',width:1.11,depth:.91,floors:2,roof:'mansard',material:'brick'},
  {id:'delft',name:'Delft',color:'#adc3c8',trim:'#eee9d8',roofColor:'#536f83',width:.88,depth:1.07,floors:1,roof:'gable',material:'stone'},
  {id:'ebony',name:'Ebony',color:'#777d73',trim:'#c7c9b7',roofColor:'#444d4a',width:1.16,depth:.95,floors:3,roof:'flat',material:'metal'},
  {id:'flint',name:'Flint',color:'#a9aa9c',trim:'#e5dfca',roofColor:'#596766',width:1.02,depth:1.22,floors:0,roof:'stepped',material:'concrete'},
  {id:'golden',name:'Golden',color:'#dfbe88',trim:'#fbebca',roofColor:'#b27951',width:1.2,depth:1.03,floors:1,roof:'dome',material:'plaster'},
  {id:'ivy',name:'Ivy',color:'#aebd9f',trim:'#e9edcf',roofColor:'#5f7861',width:.95,depth:.89,floors:-1,roof:'hip',material:'stone'},
  {id:'jade',name:'Jade',color:'#91b6a7',trim:'#deecdd',roofColor:'#41665d',width:1.09,depth:1.17,floors:2,roof:'spire',material:'glass'},
  {id:'quartz',name:'Quartz',color:'#e7e1db',trim:'#fff7ec',roofColor:'#837e8e',width:1.13,depth:.97,floors:0,roof:'flat',material:'plaster'},
];
export const NEW_SURPRISES=BUILDINGS.flatMap((base,familyIndex)=>SURPRISE_EDITIONS.flatMap((edition,editionIndex)=>NEW_FINISHES.map((finish,finishIndex)=>{
  const style=SURPRISE_STYLES[base.category][(familyIndex+editionIndex+finishIndex)%5];
  const small=['gas','cafe','shop','warehouse','pavilion','cottage'].includes(base.id);
  const floorChange=edition.floors+finish.floors;
  const floors=Math.max(1,Math.min(60,base.floors+(small?Math.round(floorChange/2):floorChange)));
  const roof=base.id==='gas'?'flat':base.id==='castle'&&finishIndex%3===0?'battlements':base.id==='cathedral'&&finishIndex%4===0?'spire':finish.roof;
  const footprint=base.id==='pavilion'&&finishIndex%3===0?'round':edition.footprint;
  const width=Math.max(4,Math.round(base.width*edition.width*finish.width));
  const depth=Math.max(4,Math.round(base.depth*edition.depth*finish.depth));
  const windows=['classic','arched','ribbon','grid'][(editionIndex+finishIndex)%4];
  return building(`surprise2-${base.id}-${edition.id}-${finish.id}`,`${edition.name} ${finish.name} ${base.name}`,
    base.category,style,width,depth,floors,{
      archetype:base.id,footprint,roof,windows,
      color:finish.color,trim:finish.trim,roofColor:finish.roofColor,material:finish.material,
      spacing:Math.max(1.5,Math.min(6,edition.spacing+(finishIndex%5-2)*.25)),
      floorHeight:base.floorHeight+(finishIndex%3)*.15,
    });
}))) ;

// A third collection adds 100 new forms to every building family. Each
// concept changes the massing; each setting changes its proportions, height,
// roofline, windows, and finish. Keep these IDs stable for saved projects.
const CONCEPTS=[
  {id:'belvedere',name:'Belvedere',footprint:'t',roof:'dome',width:1.08,depth:1.16,floors:2,windows:'arched',spacing:2.8},
  {id:'arcade',name:'Arcade',footprint:'u',roof:'flat',width:1.32,depth:.88,floors:0,windows:'classic',spacing:2.3},
  {id:'laneway',name:'Laneway',footprint:'l',roof:'gable',width:.78,depth:1.3,floors:1,windows:'classic',spacing:2.1},
  {id:'rotunda',name:'Rotunda',footprint:'round',roof:'dome',width:1.04,depth:1.04,floors:1,windows:'arched',spacing:3},
  {id:'terrace',name:'Terrace',footprint:'courtyard',roof:'hip',width:1.26,depth:1.2,floors:-1,windows:'ribbon',spacing:2.7},
  {id:'needle',name:'Needle',footprint:'rectangle',roof:'spire',width:.72,depth:.75,floors:5,windows:'grid',spacing:1.9},
  {id:'crossing',name:'Crossing',footprint:'t',roof:'mansard',width:1.17,depth:1.27,floors:1,windows:'arched',spacing:2.5},
  {id:'cascade',name:'Cascade',footprint:'u',roof:'stepped',width:1.13,depth:1.12,floors:3,windows:'ribbon',spacing:2.2},
  {id:'keep',name:'Keep',footprint:'courtyard',roof:'battlements',width:1.22,depth:1.18,floors:2,windows:'classic',spacing:3.1},
  {id:'longhouse',name:'Longhouse',footprint:'rectangle',roof:'gable',width:1.38,depth:.82,floors:-1,windows:'grid',spacing:2.6},
];
const SETTINGS=[
  {id:'mist',name:'Mist',color:'#b9ced1',trim:'#edf3ea',roofColor:'#65858b',material:'plaster',width:.91,depth:1.04,floors:0,roof:'hip'},
  {id:'terracotta',name:'Terracotta',color:'#c9886a',trim:'#f1d9bb',roofColor:'#92584a',material:'brick',width:1.07,depth:.93,floors:1,roof:'mansard'},
  {id:'limestone',name:'Limestone',color:'#d8cfb5',trim:'#f4ead3',roofColor:'#7b8073',material:'stone',width:1.15,depth:1.08,floors:-1,roof:'gable'},
  {id:'copper',name:'Copper',color:'#a5aa94',trim:'#e0d8ba',roofColor:'#609386',material:'metal',width:.96,depth:1.14,floors:2,roof:'dome'},
  {id:'midnight',name:'Midnight',color:'#526a70',trim:'#aebdb4',roofColor:'#344e5a',material:'glass',width:.87,depth:.88,floors:3,roof:'stepped'},
  {id:'sandstone',name:'Sandstone',color:'#d2ad7f',trim:'#f7ddad',roofColor:'#aa7958',material:'stone',width:1.21,depth:.97,floors:0,roof:'flat'},
  {id:'cedar',name:'Cedar',color:'#a77b5b',trim:'#ddc69c',roofColor:'#5c665b',material:'wood',width:1.02,depth:1.2,floors:-2,roof:'hip'},
  {id:'pearl',name:'Pearl',color:'#e3e0d7',trim:'#fff8e8',roofColor:'#829994',material:'plaster',width:1.12,depth:1.13,floors:1,roof:'spire'},
  {id:'basalt',name:'Basalt',color:'#777b76',trim:'#c9c7b5',roofColor:'#414e4e',material:'concrete',width:.82,depth:1.06,floors:2,roof:'battlements'},
  {id:'sage',name:'Sage',color:'#aabc9e',trim:'#e8e6ce',roofColor:'#65816a',material:'wood',width:1.18,depth:.85,floors:-1,roof:'flat'},
];
export const MORE_SURPRISES=BUILDINGS.flatMap((base,familyIndex)=>CONCEPTS.flatMap((concept,conceptIndex)=>SETTINGS.map((setting,settingIndex)=>{
  const small=['gas','cafe','shop','warehouse','pavilion','cottage'].includes(base.id);
  const style=SURPRISE_STYLES[base.category][(familyIndex+conceptIndex+settingIndex)%5];
  const floorChange=concept.floors+setting.floors;
  const floors=Math.max(1,Math.min(60,base.floors+(small?Math.round(floorChange/2):floorChange)));
  const roof=settingIndex%3===0?concept.roof:setting.roof;
  const windows=settingIndex%4===0?concept.windows:['classic','arched','ribbon','grid'][(conceptIndex+settingIndex)%4];
  return building(`surprise3-${base.id}-${concept.id}-${setting.id}`,`${concept.name} ${setting.name} ${base.name}`,
    base.category,style,
    Math.max(4,Math.round(base.width*concept.width*setting.width)),
    Math.max(4,Math.round(base.depth*concept.depth*setting.depth)),floors,{
      archetype:base.id,footprint:concept.footprint,roof,windows,
      color:setting.color,trim:setting.trim,roofColor:setting.roofColor,material:setting.material,
      spacing:Math.max(1.5,Math.min(6,concept.spacing+(settingIndex%5-2)*.2)),
      floorHeight:Math.min(8,Math.max(2,base.floorHeight+(conceptIndex%3)*.2+(settingIndex%2)*.15)),
    });
})));
// Show the newest collection first in the library; saved projects use IDs.
export const ALL_SURPRISES=[...MORE_SURPRISES,...SURPRISES,...NEW_SURPRISES];
const piece=(id,name,category,extra={})=>({id,name,category,kind:'piece',color:'#dfd7bc',material:'plaster',...extra});
export const REMOVED_DECORATIONS=new Set(['stone_arch','balustrade_balcony','arched_window','shop_awning','fuel_pump','pergola','garden_tree','planter','pool','fountain','street_lamp','lawn']);
export const PIECES=[
  piece('wall','Wall','Structure',{shape:'box',size:[5,3,.25]}),
  piece('floor','Floor / foundation','Structure',{shape:'box',size:[8,.25,8]}),
  piece('block','Building block','Structure',{shape:'box',size:[6,3,6]}),
  piece('beam','Beam','Structure',{shape:'box',size:[5,.25,.25],material:'wood',color:'#90744e'}),
  piece('pillar','Round pillar','Structure',{shape:'cylinder',size:[.6,4,.6]}),
  piece('glass_wall','Glass wall','Structure',{shape:'box',size:[5,3,.12],material:'glass',color:'#86aaac'}),
  piece('gable_roof','Gabled roof','Roofs',{shape:'gable',size:[8,3,7],color:'#9a7358'}),
  piece('hip_roof','Hipped roof','Roofs',{shape:'hip',size:[8,3,7],color:'#727e71'}),
  piece('spire_roof','Spire roof','Roofs',{shape:'cone',size:[4,7,4],color:'#5f8275'}),
  piece('stone_arch','Stone arch','Details',{asset:'stone_arch'}),
  piece('classical_column','Classical column','Structure',{asset:'classical_column'}),
  piece('balustrade_balcony','Balustrade balcony','Details',{asset:'balustrade_balcony'}),
  piece('arched_window','Arched window','Details',{asset:'arched_window'}),
  piece('grand_stairs','Grand staircase','Structure',{asset:'grand_stairs'}),
  piece('castle_turret','Castle turret','Structure',{asset:'castle_turret'}),
  piece('copper_dome','Copper dome','Roofs',{asset:'copper_dome'}),
  piece('chimney','Chimney','Roofs',{asset:'chimney'}),
  piece('dormer','Dormer window','Roofs',{asset:'dormer'}),
  piece('solar_panel','Solar panel','Roofs',{asset:'solar_panel'}),
  piece('door','Timber door','Details',{shape:'box',size:[1.2,2.4,.16],material:'wood',color:'#786242'}),
  piece('shop_awning','Shop awning','Details',{asset:'shop_awning'}),
  piece('fuel_pump','Gas pump','Details',{asset:'fuel_pump'}),
  piece('pergola','Timber pergola','Garden',{asset:'pergola'}),
  piece('garden_tree','Garden tree','Garden',{asset:'garden_tree'}),
  piece('planter','Box planter','Garden',{asset:'planter'}),
  piece('pool','Swimming pool','Garden',{asset:'pool'}),
  piece('fountain','Stone fountain','Garden',{asset:'fountain'}),
  piece('street_lamp','Street lamp','Garden',{asset:'street_lamp'}),
  piece('path','Paved path','Garden',{shape:'box',size:[3,.08,10],color:'#c6c3ad',material:'stone'}),
  piece('road','Road segment','Garden',{shape:'road',size:[7,.06,20],color:'#70766e',material:'concrete'}),
  piece('lawn','Garden lawn','Garden',{shape:'box',size:[10,.06,10],color:'#8eab72'}),
].filter(p=>!REMOVED_DECORATIONS.has(p.id));
export const ASSET_IDS=PIECES.filter(p=>p.asset).map(p=>p.asset);
export const COLORS=['#e8ddc4','#c6b093','#ad785e','#718b77','#aab7ba','#ebebdf','#555f59','#c9a565'];
export function makeRecord(template,x=0,z=0){
  const {id,...rest}=template;
  return {...structuredClone(rest),id:crypto.randomUUID(),template:id,...(rest.kind==='building'?{details:false}:{}),position:[x,0,z],rotation:0,scale:[1,1,1]};
}

// Lightweight editorial illustrations for the toolkit; the scene uses actual 3D geometry.
export function thumbnail(p){
  let body='';
  if(p.kind==='building'){
    const tall=p.floors>8, castle=(p.archetype||p.id)==='castle', h=tall?49:Math.min(33,15+p.floors*3), y=67-h;
    body=`<ellipse cx="59" cy="70" rx="33" ry="7" fill="#a3b19a" opacity=".25"/><path d="M27 ${y+8}L58 ${y-4}L89 ${y+7}V64L58 77L27 64Z" fill="${p.color}"/><path d="M58 ${y-4}L89 ${y+7}V64L58 77Z" fill="#5e7565" opacity=".25"/>`;
    if(['gable','hip','mansard'].includes(p.roof))body+=`<path d="M22 ${y+10}L41 ${y-10}L69 ${y-18}L94 ${y+8}L58 ${y+20}Z" fill="${p.roofColor}"/><path d="M22 ${y+10}L41 ${y-10}L58 ${y+20}Z" fill="#b9b9a0" opacity=".28"/>`;
    else body+=`<path d="M27 ${y+8}L58 ${y-4}L89 ${y+7}L58 ${y+20}Z" fill="${p.roofColor}"/>`;
    for(let r=0;r<(tall?6:Math.min(p.floors,3));r++)for(let c=0;c<3;c++)body+=`<path d="M${32+c*8} ${y+17+r*7-c*2.5}l5 2v5l-5 -2Z" fill="#526f69"/><path d="M${63+c*8} ${y+20+r*7-c*3}l5 -2v5l-5 2Z" fill="#5a786c"/>`;
    if(castle)body+='<path d="M22 32h7v-5h6v5h6v25l-19-7Z M76 24h6v-5h6v5h7v30l-19 6Z" fill="#c2c1a7"/>';
    if(p.roof==='dome')body+=`<path d="M43 ${y+7}a15 17 0 0 1 30 0q-15 9-30 0" fill="${p.roofColor}"/>`;
    if(p.roof==='spire')body+=`<path d="M49 ${y+9}L61 2L72 ${y+8}Z" fill="${p.roofColor}"/>`;
  }else{
    const icons={garden_tree:'♣',stone_arch:'∩',classical_column:'Ⅱ',balustrade_balcony:'♜',arched_window:'▥',grand_stairs:'▟',castle_turret:'♜',copper_dome:'◠',chimney:'▥',solar_panel:'▦',pool:'▱',fountain:'♧',pergola:'▤',street_lamp:'♙',shop_awning:'▥',fuel_pump:'▣',planter:'♣',dormer:'⌂'};
    if(p.asset)body=`<ellipse cx="58" cy="69" rx="25" ry="5" fill="#a3b19a" opacity=".3"/><text x="58" y="59" text-anchor="middle" font-family="Georgia,serif" font-size="49" fill="#72846a">${icons[p.id]||'◇'}</text>`;
    else body=`<ellipse cx="58" cy="65" rx="30" ry="6" fill="#a3b19a" opacity=".3"/><path d="M25 34L56 23L91 34L60 46Z" fill="${p.color}"/><path d="M25 34L60 46V65L25 53Z" fill="${p.color}"/><path d="M60 46L91 34V52L60 65Z" fill="#8a967f"/>`;
  }
  return `<svg viewBox="0 0 116 84" aria-hidden="true">${body}</svg>`;
}
