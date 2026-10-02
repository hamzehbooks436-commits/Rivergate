import {SEASONS,seasonFor} from './seasons.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildObject,loadAssets,setNight} from './legacy/architecture.js';
import {STYLES} from './legacy/catalog.js';
import {N,TILE,ZONES,SERVICES,DECORATIONS,MODES,clamp} from './data.js';
import {buildingCells,footprint,owned,parcelOf,PARCEL,PARCELS,districtOf} from './region.js';
import {batch} from './detail.js';
import {moveVehicle} from './vehicle-motion.js';
import {BUILDINGS as ARCHITECTURE_BUILDINGS} from '../Architecture Game/src/catalog.js';
import {xy,index,neighbours} from './network.js';
const cube=new THREE.BoxGeometry(1,1,1),materials=new Map(),dummy=new THREE.Object3D();
function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));return materials.get(color);}
function box(g,x,y,z,w,h,d,color){const mesh=new THREE.Mesh(cube,mat(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;}
export const position=i=>new THREE.Vector3((i%N-N/2+.5)*TILE,0,(Math.floor(i/N)-N/2+.5)*TILE);
const top=t=>t.elevation<0?(t.road||t.rail?1.1:-.12):t.elevation*.6;
const assets=['civic_power','civic_water','civic_waste','civic_education','civic_healthcare','civic_police','civic_fire','civic_station','civic_park','civic_landmark','factory','farmhouse','mill','foundry','coal_mine','furniture_workshop','warehouse','locomotive','freight','station','oak','pine','bus','tram','metro','shelter','metro_entry'];
function removeArchitectureDecorations(scene,id){
  // Imported modular ornaments are separate nodes before material batching.
  // Keep the building family's own geometry; discard the attached kit parts.
  if(!/^remaster_(house|shop|office|apartment|skyscraper)_/.test(id))return;
  const remove=[];
  scene.traverse(node=>{
    if(!node.isMesh)return;
    const materials=Array.isArray(node.material)?node.material:[node.material];
    // GLTFLoader replaces spaces in node names with underscores. Materials
    // preserve their names, and FF_ identifies only the imported ornament kit.
    const ornament=materials.length>0&&materials.every(material=>material.name.startsWith('FF_'));
    const landscaping=materials.length>0&&materials.every(material=>/^Remaster (bark|leaf)$/.test(material.name));
    if(ornament||landscaping)remove.push(node);
  });
  for(const node of remove)node.removeFromParent();
}
function bakeGLTF(scene){
  scene.updateMatrixWorld(true);const buckets=new Map();scene.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;let g=o.geometry.clone();if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}g.applyMatrix4(o.matrixWorld);for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!g.attributes.normal)g.computeVertexNormals();if(!buckets.has(o.material.uuid))buckets.set(o.material.uuid,{m:o.material,parts:[]});buckets.get(o.material.uuid).parts.push(g);});
  const group=new THREE.Group();for(const {m,parts} of buckets.values()){const geometry=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(geometry){const mesh=new THREE.Mesh(geometry,m);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}}
  const bounds=new THREE.Box3().setFromObject(group),centre=bounds.getCenter(new THREE.Vector3());group.position.set(-centre.x,-bounds.min.y,-centre.z);const wrapper=new THREE.Group();wrapper.add(group);return wrapper;
}
export class World {
  constructor(canvas,city){
    this.canvas=canvas;this.city=city;this.models=new Map();this.templates=new Map();this.objects=new Map();this.overlay='none';this.revision=-1;this.routeDraft=[];this.moving=[];this.time=0;this.dark=false;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c5d7dc');this.scene.fog=new THREE.Fog('#c5d7dc',1300,3000);
    this.camera=new THREE.OrthographicCamera(-220,220,150,-150,.1,6000);this.camera.position.set(-310,300,135);
    this.controls=new OrbitControls(this.camera,canvas);this.controls.target.set(-590,0,-205);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.minZoom=.16;this.controls.maxZoom=7;this.controls.minPolarAngle=.22;this.controls.maxPolarAngle=1.28;this.controls.mouseButtons={LEFT:null,MIDDLE:THREE.MOUSE.ROTATE,RIGHT:THREE.MOUSE.PAN};this.controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};
    this.hemi=new THREE.HemisphereLight('#d7e8ed','#7a896a',1.6);this.scene.add(this.hemi);
    this.sun=new THREE.DirectionalLight('#ffe6bd',3.1);this.sun.position.set(-750,380,-80);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-260,right:260,top:260,bottom:-260,near:1,far:1200});this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.2;this.scene.add(this.sun,this.sun.target);
    this.ground=new THREE.InstancedMesh(cube,new THREE.MeshStandardMaterial({roughness:1}),N*N);this.ground.receiveShadow=true;this.scene.add(this.ground);
    this.water=new THREE.InstancedMesh(new THREE.PlaneGeometry(TILE,TILE),new THREE.MeshPhysicalMaterial({color:'#42c5db',metalness:.25,roughness:.19,transparent:true,opacity:.84,clearcoat:1,clearcoatRoughness:.14,side:THREE.DoubleSide}),N*N);this.water.count=0;this.scene.add(this.water);
    const rippleGeometry=new THREE.PlaneGeometry(2.5,.15),rippleMaterial=new THREE.MeshBasicMaterial({color:'#daffff',transparent:true,opacity:.55,depthWrite:false});this.ripples=new THREE.InstancedMesh(rippleGeometry,rippleMaterial,240);this.ripples.count=0;this.rippleSites=[];this.scene.add(this.ripples);
    this.heat=new THREE.InstancedMesh(new THREE.PlaneGeometry(9.75,9.75),new THREE.MeshBasicMaterial({transparent:true,opacity:.67,depthWrite:false,side:THREE.DoubleSide}),N*N);this.heat.renderOrder=3;this.scene.add(this.heat);
    this.hover=new THREE.InstancedMesh(new THREE.BoxGeometry(9.7,.14,9.7),new THREE.MeshBasicMaterial({color:'#ffdd87',transparent:true,opacity:.6,depthTest:false}),N*N);this.hover.count=0;this.hover.frustumCulled=false;this.hover.renderOrder=6;this.scene.add(this.hover);
    this.selection=new THREE.Mesh(new THREE.BoxGeometry(10.2,.2,10.2),new THREE.MeshBasicMaterial({color:'#ffffff',wireframe:true,depthTest:false}));this.selection.visible=false;this.selection.renderOrder=8;this.scene.add(this.selection);
    this.structures=new THREE.Group();this.roads=new THREE.Group();this.nature=new THREE.Group();this.lines=new THREE.Group();this.vehicles=new THREE.Group();this.scene.add(this.structures,this.roads,this.nature,this.lines,this.vehicles);
    this.trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.3,3,6),mat('#75674d'),N*N);this.crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.8,1),mat('#547751'),N*N);this.crowns.castShadow=true;this.trunks.count=0;this.crowns.count=0;this.scene.add(this.trunks,this.crowns);
    this.leaves=new THREE.InstancedMesh(new THREE.CircleGeometry(.8,5),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,side:THREE.DoubleSide}),N*N);this.leaves.count=0;this.leaves.frustumCulled=false;this.scene.add(this.leaves);
    this.backdrop=new THREE.Mesh(new THREE.PlaneGeometry(12000,12000),mat('#809591'));this.backdrop.rotation.x=-Math.PI/2;this.backdrop.position.y=-4;this.scene.add(this.backdrop);this.carTemplates=[];this.streetLamps=[];
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.resize();new ResizeObserver(()=>this.resize()).observe(canvas.parentElement);
  }
  async load(progress){
    const loader=new GLTFLoader();let done=0;const failures=[];
    const library=await fetch('./assets/models/remaster-manifest.json').then(r=>r.json());const allAssets=[...assets,...library.map(a=>a.id),...Object.keys(DECORATIONS).map(id=>'remaster_'+id)];
    await Promise.allSettled([loadAssets(),...allAssets.map(async id=>{try{const gltf=await loader.loadAsync(`./assets/models/${id}.glb`);removeArchitectureDecorations(gltf.scene,id);this.models.set(id,bakeGLTF(gltf.scene));}catch{failures.push(id);}done++;progress?.(done,allAssets.length);})]);
    this.carTemplates=Array.from({length:16},(_,i)=>this.fitModel('remaster_'+(i<8?'car_'+i:'vehicle_'+(i-8)),i<8?3.15:3.95,2.8)).filter(Boolean);
    const nature=this.models.get('remaster_tree');if(nature){nature.updateMatrixWorld(true);nature.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld);const isTrunk=o.material.name.includes('bark'),mesh=isTrunk?this.trunks:this.crowns;g.translate(0,isTrunk?-1.4:-3.9,0);mesh.geometry.dispose();mesh.geometry=g;mesh.material=o.material;});}
    this.crowns.material=this.crowns.material.clone();this.crowns.material.color.set('#ffffff');
    this.templates.clear();this.revision=-1;return failures;
  }
  resize(){const {width,height}=this.canvas.getBoundingClientRect();if(!width||!height)return;this.renderer.setSize(width,height,false);const aspect=width/height;this.camera.left=-165*aspect;this.camera.right=165*aspect;this.camera.top=165;this.camera.bottom=-165;this.camera.updateProjectionMatrix();}
  fitModel(id,width=8.7,maxHeight=35){const source=this.models.get(id);if(!source)return null;const clone=source.clone(true);const bounds=new THREE.Box3().setFromObject(clone),size=bounds.getSize(new THREE.Vector3());clone.scale.setScalar(Math.min(width/Math.max(size.x,size.z,.1),maxHeight/Math.max(size.y,.1)));return clone;}
  fitSkyscraper(id,footprintSize){const source=this.models.get(id);if(!source)return null;const clone=source.clone(true),size=new THREE.Box3().setFromObject(clone).getSize(new THREE.Vector3()),width=Math.max(size.x,size.z,.1);const horizontal=(footprintSize*TILE-.4)/width;/* Blender widened the footprint fourfold. Preserve the previous vertical scale. */const vertical=Math.min((TILE-.4)/(width/4),210/Math.max(size.y,.1));clone.scale.set(horizontal,vertical,horizontal);return clone;}
  building(b){
    const globalStyle=this.city.s.style,style=b.style||(districtOf(this.city.s,b.i)==='oldtown'?'european':globalStyle==='mixed'?['suburban','european','mediterranean','contemporary','classical','japanese','contemporary'][b.design]:globalStyle);
    const key=[b.service,b.zone,b.size,b.depth,b.apartment,b.level,b.targetLevel,b.upgrade,b.status,b.industry,style,b.design,(b.id+b.design)%72,b.status==='construction'?Math.floor(b.progress*10):0].join(':');let source=this.templates.get(key);
    if(!source){source=new THREE.Group();
      if(b.status==='construction'){const asset=this.fitModel('remaster_site_'+b.size+'_'+Math.min(3,Math.floor(b.progress*4)),b.size*TILE-.5,25);if(asset){asset.scale.z*=(b.depth||b.size)/b.size;source.add(asset);}}
      else if(b.service){const asset=(SERVICES[b.service].recreation||SERVICES[b.service].decoration)?this.models.get('remaster_'+b.service)?.clone(true):this.fitModel('remaster_'+b.service,b.size*TILE-.4,40);if(asset)source.add(asset);}
      else if(b.zone==='industrial'){
        const id='remaster_industry_'+b.industry+'_'+b.design%2;const asset=this.fitModel(id,8.7,7+b.level*3);if(asset)source.add(asset);else box(source,0,2,0,7,4,7,'#aa8065');
        if(b.level>1)box(source,-2,2.5,1,2,b.level*2,3,'#8e9c96');
       }else if(b.level===4){const asset=this.fitSkyscraper('remaster_skyscraper_'+((b.id+b.design)%12),b.size);if(asset)source.add(asset);}
      else if(b.apartment||(b.zone==='residential'&&b.level>=2)){const asset=this.fitModel('remaster_apartment_'+((b.id+b.design)%(b.level>=3?2:12))+(b.level>=3?'_high':''),b.size*TILE-.5,70);if(asset)source.add(asset);}
      else if(!b.style&&globalStyle==='mixed'&&districtOf(this.city.s,b.i)!=='oldtown'){const family=b.zone==='residential'?'house':b.level===1?'shop':'office',count=family==='house'?24:family==='shop'?18:12,asset=this.fitModel('remaster_'+family+'_'+((b.id+b.design)%count),9.3,70);if(asset)source.add(asset);}
      else {
        const levels=b.zone==='residential'?[1,4,10]:[2,5,14];const palette=['#d8c8ac','#cebca8','#e1d3bd','#aabfc0','#c7c2ac','#cdbb9c','#d1cfbc'];
        const recipe=ARCHITECTURE_BUILDINGS.find(p=>p.id===(b.zone==='residential'?(b.design%3===0?'cottage':b.design%3===1?'suburban':'european'):(b.level===1?(b.design%2?'cafe':'shop'):'office')));
        const p={...recipe,...STYLES[style],kind:'building',id:key,name:key,template:b.zone==='commercial'?'office':'apartment',style,position:[0,0,0],rotation:0,scale:[1,1,1],width:7.1,depth:7.2,floors:levels[b.level-1],floorHeight:2.25,footprint:b.design===2&&b.level>1?'l':'rectangle',spacing:2.1,details:false,decorativePillars:false,color:palette[b.design]};
        if(b.level===3){p.roof='flat';p.windows='grid';}if(b.zone==='commercial')p.windows='ribbon';source.add(buildObject(p));
      }
      if(b.status==='abandoned')source.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.lerp(new THREE.Color('#5b625b'),.72);}});
      this.templates.set(key,source);
    }
    const result=source.clone(true);result.userData.buildingId=b.id;result.rotation.y=b.rotation;return result;
  }
  clearLines(){this.lines.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});this.lines.clear();}
  polyline(points,color){if(points.length<2)return;const geometry=new THREE.BufferGeometry().setFromPoints(points);const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.85,depthTest:false}));line.renderOrder=5;this.lines.add(line);}
  sync(){
    const s=this.city.s;this.roads.traverse(o=>{if(o.geometry)o.geometry.dispose();});this.roads.clear();this.structures.clear();this.nature.clear();this.vehicles.clear();this.clearLines();this.moving=[];this.objects.clear();this.streetLamps=[];
    const season=seasonFor(s),palette=SEASONS[season],base=new THREE.Color(palette.ground),accent=new THREE.Color(palette.accent);
    this.leaves.count=0;this.leaves.visible=season==='Autumn';
    // Change landscape materials only; evergreens and decorative colours retain their character.
    const seen=new Set();for(const model of this.models.values())model.traverse(o=>{const m=o.material;if(!m||seen.has(m))return;seen.add(m);if(/^(recreation_grass|Remaster grass)(?:\.\d+)?$/.test(m.name))m.color.set(palette.ground);else if(/^(recreation_(leaf|lightleaf)|decoration_leaf)(?:\.\d+)?$/.test(m.name))m.color.set(palette.leaf);});
    this.water.count=0;this.rippleSites=[];this.trunks.count=0;this.crowns.count=0;
    for(let i=0;i<s.tiles.length;i++){
      const t=s.tiles[i],p=position(i),h=top(t),water=t.elevation<0;dummy.position.set(p.x,(water?-1.1:t.elevation*.6)-1.6,p.z);dummy.scale.set(TILE,3.2,TILE);dummy.rotation.set(0,0,0);dummy.updateMatrix();this.ground.setMatrixAt(i,dummy.matrix);
      const color=water?new THREE.Color('#608a91'):base.clone().multiplyScalar(.91+(Math.sin(i*42.12)*.5+.5)*.13);if(t.type===6)color.set('#c5b38a');if(t.type===2)color.multiplyScalar(.92);if(t.elevation>5)color.lerp(new THREE.Color('#939c91'),Math.min(.8,t.elevation/15));if(!owned(s,i))color.multiplyScalar(.87);if(!water&&neighbours(i).some(j=>s.tiles[j].elevation<0))color.lerp(new THREE.Color('#ccbea0'),.6);if(!water){const patch=(Math.sin((i%N)*.64)+Math.cos(Math.floor(i/N)*.47)+2)/4;if(season==='Winter')color.lerp(accent,.8);else if(season==='Summer')color.lerp(accent,patch*.28);else if(season==='Autumn')color.lerp(accent,patch*.45);}this.ground.setColorAt(i,color);
      if(season==='Autumn'&&!water&&!t.building&&!t.road&&!t.rail&&i%3===0){for(let n=0;n<3&&this.leaves.count<N*N;n++){const k=this.leaves.count++;dummy.position.set(p.x+Math.sin(i+n*4)*4,h+.035,p.z+Math.cos(i*3+n)*4);dummy.rotation.set(-Math.PI/2,0,i+n);dummy.scale.set(.25+(i%4)*.08,.55,1);dummy.updateMatrix();this.leaves.setMatrixAt(k,dummy.matrix);this.leaves.setColorAt(k,new THREE.Color(n%2?'#e6b952':'#b97235'));}}
      if(water){dummy.position.set(p.x,-.22,p.z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();this.water.setMatrixAt(this.water.count++,dummy.matrix);if(this.rippleSites.length<240&&i%2===0)this.rippleSites.push({x:p.x+(i%5-2),z:p.z+(i%3-1)*2,offset:i*.12});}
      if(t.road){
        const asphalt=t.road===2?8:6.6;box(this.roads,p.x,h+.13,p.z,10,.25,10,'#b5b1a0');box(this.roads,p.x,h+.29,p.z,asphalt,.08,asphalt,'#515c5c');
        const near=neighbours(i).filter(j=>s.tiles[j].road);for(const j of near){const q=position(j),dx=(q.x-p.x)/TILE,dz=(q.z-p.z)/TILE;box(this.roads,p.x+dx*3.3,h+.3,p.z+dz*3.3,dx?3.5:asphalt,.09,dz?3.5:asphalt,'#515c5c');if(near.length<=2)box(this.roads,p.x+dx*3.3,h+.36,p.z+dz*3.3,dx?2:.12,.04,dz?2:.12,'#d3c59e');}
        if(water)for(const side of [-1,1])box(this.roads,p.x+side*4.6,h+.8,p.z,.2,.8,10,'#c9c1aa');
        if(near.length>=3){for(const side of [-1,1])for(let stripe=-3;stripe<=3;stripe++)box(this.roads,p.x+stripe*.65,h+.4,p.z+side*3.7,.36,.025,1.25,'#dedbcc');}
        if(i%5===0){const lamp=this.fitModel('remaster_streetlamp',1.5,5.4);if(lamp){lamp.position.set(p.x+4.3,h+.2,p.z+3.4);lamp.traverse(o=>{if(o.isMesh&&o.material.name.includes('warm'))this.streetLamps.push(o.material);});this.roads.add(lamp);}} 
      }
      if(t.rail){const ns=neighbours(i).filter(j=>s.tiles[j].rail),vertical=ns.some(j=>Math.abs(j-i)===N);const rail=new THREE.Group();rail.position.set(p.x,h+.45,p.z);if(!vertical)rail.rotation.y=Math.PI/2;box(rail,0,0,0,4,.2,10,'#8b8875');for(let k=-4;k<=4;k+=2)box(rail,0,.13,k,3.8,.15,.4,'#6c6251');for(const k of [-1.2,1.2])box(rail,k,.3,0,.16,.16,10,'#c5c4b5');this.roads.add(rail);}
      if(t.zone&&!t.building){box(this.roads,p.x,h+.11,p.z,9,.13,9,ZONES[t.zone].color);for(let k=1;k<t.density;k++)box(this.roads,p.x-3+k*2,h+.25,p.z,.12,.07,7,'#e7ead4');}
      if(t.powerline&&!t.building&&!water){box(this.roads,p.x,h+3,p.z,.18,6,.18,'#777966');box(this.roads,p.x,h+5.8,p.z,3,.17,.17,'#a7a68c');}
      if(t.construction){box(this.roads,p.x,h+.2,p.z,8,.3,8,'#baaa85');for(const z of [-3.8,3.8]){box(this.roads,p.x,h+.9,p.z+z,8,1.4,.12,'#a4824f');for(let x=-3;x<=3;x+=2)box(this.roads,p.x+x,h+1,p.z+z,.6,.5,.15,'#efe0b3');}}
      if(t.type===2&&!water&&!t.building&&!t.road&&!t.rail&&!t.zone){const k=this.trunks.count++,scale=.85+(i%5)*.12,px=p.x+(i%3-1)*1.8,pz=p.z+((i*7)%3-1);dummy.position.set(px,h+1.5*scale,pz);dummy.scale.set(scale,scale,scale);dummy.rotation.set(0,0,0);dummy.updateMatrix();this.trunks.setMatrixAt(k,dummy.matrix);dummy.position.y=h+4*scale;dummy.scale.set(scale,1.3*scale,scale);dummy.rotation.y=i;dummy.updateMatrix();this.crowns.setMatrixAt(k,dummy.matrix);this.crowns.setColorAt(k,new THREE.Color(palette.leaf).lerp(accent,(i%5)*.12));}
    }
    this.leaves.instanceMatrix.needsUpdate=true;if(this.leaves.instanceColor)this.leaves.instanceColor.needsUpdate=true;
    this.ground.instanceMatrix.needsUpdate=true;this.ground.instanceColor.needsUpdate=true;
    this.ground.computeBoundingSphere();this.trunks.computeBoundingSphere();this.trunks.instanceMatrix.needsUpdate=true;this.crowns.count=this.trunks.count;this.crowns.computeBoundingSphere();this.crowns.instanceMatrix.needsUpdate=true;if(this.crowns.instanceColor)this.crowns.instanceColor.needsUpdate=true;
    this.water.instanceMatrix.needsUpdate=true;this.water.computeBoundingSphere();this.ripples.count=this.rippleSites.length;this.ripples.frustumCulled=false;
    for(const b of s.buildings){const obj=this.building(b),p=position(b.i),offset=((b.size||1)-1)*TILE/2;obj.position.set(p.x+offset,Math.max(...buildingCells(b).map(i=>top(s.tiles[i])))+.15,p.z+((b.depth||b.size||1)-1)*TILE/2);this.structures.add(obj);this.objects.set(b.id,obj);}
    for(const r of s.routes){const info=this.city.network.routeInfo.get(r.id);if(!info.valid)continue;const pts=[];
      for(const seg of info.segments){for(const i of seg.path){const p=position(i);p.y=top(s.tiles[i])+.8;pts.push(p);}}
      if(!pts.length)continue;if(r.active)this.polyline(pts,MODES[r.mode].color);
      for(const i of r.stops){const p=position(i),stop=this.fitModel(r.mode==='metro'?'metro_entry':'shelter',3,3);if(stop){stop.position.set(p.x+3.7,top(s.tiles[i])+.35,p.z);this.roads.add(stop);}}
      if(info.operating)for(let k=0;k<r.vehicles;k++){const model=this.fitModel(r.mode==='rail'?'locomotive':r.mode,r.mode==='bus'?4:6,3);if(model)this.addMoving(model,pts,k/r.vehicles,MODES[r.mode].speed*.75);}
    }
    // Traffic samples follow actual connected road edges; their volume follows assigned journeys.
    let cars=0;for(let i=0;i<s.tiles.length&&cars<220;i++){if(!s.tiles[i].road||(this.city.nextTraffic[i]||0)<2)continue;const path=[i];let last=-1,at=i;for(let k=0;k<6;k++){const ns=neighbours(at).filter(j=>s.tiles[j].road&&j!==last&&!path.includes(j)),next=ns[(i+k)%ns.length];if(next===undefined)break;path.push(next);last=at;at=next;}if(path.length<2)continue;const pts=path.map(j=>{const p=position(j);p.y=top(s.tiles[j])+.4;return p;});this.addMoving(this.carTemplates[i%this.carTemplates.length]?.clone(true),pts,(i%17)/17,5,1.5,Math.PI);cars++;}
    for(const terminal of s.buildings.filter(b=>b.service==='station'&&b.info.external&&b.info.capacity>0).slice(0,s.freightTrains)){
      const p=this.city.network.external(terminal.info.rail,'rail');if(p){const pts=p.path.map(i=>{const v=position(i);v.y=top(s.tiles[i])+.5;return v;});const loco=this.fitModel('locomotive',6,4);if(loco)this.addMoving(loco,pts,.2,13);}
    }
    if(this.routeDraft.length>1)this.polyline(this.routeDraft.map(i=>{const p=position(i);p.y=top(s.tiles[i])+1.5;return p;}),'#ffffff');
    const merged=batch(this.roads);this.scene.remove(this.roads);this.roads=merged;this.scene.add(this.roads);
    for(const id of s.owned){const x=id%PARCELS*PARCEL,z=Math.floor(id/PARCELS)*PARCEL;const pts=[[x,z],[x+PARCEL,z],[x+PARCEL,z+PARCEL],[x,z+PARCEL],[x,z]].map(([a,b])=>new THREE.Vector3((a-N/2)*TILE,.85,(b-N/2)*TILE));this.polyline(pts,'#b9c6a3');}
    if(this.dark)for(const m of this.streetLamps){m.emissive.set('#f8d795');m.emissiveIntensity=2;}
    this.revision=this.city.revision;this.updateOverlay();
  }
  addMoving(model,points,offset,speed,lane=0,headingOffset=0){if(!model||points.length<2)return;const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+points[i].distanceTo(points[i-1]));if(!lengths.at(-1))return;this.vehicles.add(model);this.moving.push({model,points,lengths,total:lengths.at(-1),offset,speed,lane,headingOffset});}
  setOverlay(name){this.overlay=name;this.updateOverlay();}
  updateOverlay(){
    const s=this.city.s,kind=this.overlay,byTile=new Map(s.buildings.flatMap(b=>buildingCells(b).map(i=>[i,b])));this.heat.visible=kind!=='none';if(kind==='none'){for(const object of this.objects.values())object.traverse(o=>{if(o.userData.originalMaterial)o.material=o.userData.originalMaterial;});return;}
    for(let i=0;i<s.tiles.length;i++){
      const t=s.tiles[i],b=byTile.get(i),p=position(i);let v=0,color;
      if(kind==='zones')color=new THREE.Color(t.zone?ZONES[t.zone].color:t.road?'#ded8be':'#455b52');
      else {
        if(kind==='traffic')v=clamp((this.city.nextTraffic[i]||0)/(t.road===2?180:65));
        else if(kind==='pollution')v=this.city.layers.pollution[i]/100;
        else if(kind==='land')v=this.city.layers.land[i]/100;
        else if(kind==='happiness')v=(b?.info.happiness||0)/100;
        else if(kind==='jobs')v=b?clamp(b.info.employed/Math.max(1,b.info.workforce||0)):0;
        else if(kind==='freight')v=b?.info.freight||0;
        else if(kind==='power'||kind==='water'){const grid=this.city[kind+'Grid'],c=grid.at(i);v=c>=0?clamp(grid.supply[c]/Math.max(1,grid.need[c])):0;}
        else v=b?.info[kind]||this.city.serviceLayers[kind]?.[i]||0;
        const badHigh=['traffic','pollution'].includes(kind);color=new THREE.Color().setHSL((badHigh?1-v:v)*.33,.63,.50);
      }
      dummy.position.set(p.x,top(t)+.48,p.z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();this.heat.setMatrixAt(i,dummy.matrix);this.heat.setColorAt(i,color);
      if(b){const object=this.objects.get(b.id);const tint=color.clone();const hsl={};tint.getHSL(hsl);tint.setHSL(Math.round(hsl.h*16)/16,hsl.s,.52);object?.traverse(o=>{if(!o.isMesh)return;if(!o.userData.originalMaterial)o.userData.originalMaterial=o.material;o.material=kind==='none'?o.userData.originalMaterial:mat('#'+tint.getHexString());});}
    }
    this.heat.instanceMatrix.needsUpdate=true;this.heat.instanceColor.needsUpdate=true;
  }
  setHover(cells,color='#ffdd87'){this.hover.count=cells.length;this.hover.material.color.set(color);for(let k=0;k<cells.length;k++){const i=cells[k],p=position(i);dummy.position.set(p.x,top(this.city.s.tiles[i])+.5,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();this.hover.setMatrixAt(k,dummy.matrix);}this.hover.instanceMatrix.needsUpdate=true;}
  select(i){this.selection.visible=i>=0;if(i>=0){const b=this.city.buildingsById.get(this.city.s.tiles[i].building),size=b?.size||1,p=position(b?.i??i);this.selection.scale.set(size,1,b?.depth||size);this.selection.position.set(p.x+(size-1)*TILE/2,top(this.city.s.tiles[i])+.7,p.z+((b?.depth||size)-1)*TILE/2);}}
  pick(event){const rect=this.canvas.getBoundingClientRect();this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hits=this.ray.intersectObject(this.structures,true);for(const hit of hits){let node=hit.object;while(node){if(node.userData.buildingId)return this.city.buildingsById.get(node.userData.buildingId)?.i??-1;node=node.parent;}}const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();let i=-1;for(let k=0;k<4;k++){if(!this.ray.ray.intersectPlane(plane,point))return -1;i=index(Math.floor(point.x/TILE+N/2),Math.floor(point.z/TILE+N/2));if(i<0)return -1;plane.constant=-top(this.city.s.tiles[i]);}return i;}
  rotate(angle){const delta=this.camera.position.clone().sub(this.controls.target);delta.applyAxisAngle(new THREE.Vector3(0,1,0),angle);this.camera.position.copy(this.controls.target).add(delta);this.controls.update();}
  pan(dx,dz){const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrix,0),forward=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),right);const move=right.multiplyScalar(dx).add(forward.multiplyScalar(dz));this.camera.position.add(move);this.controls.target.add(move);}
  focus(i,zoom=1){const p=position(i),delta=this.camera.position.clone().sub(this.controls.target);this.controls.target.copy(p);this.camera.position.copy(p).add(delta);this.camera.zoom=zoom;this.camera.updateProjectionMatrix();this.controls.update();}
  home(){const s=this.city.s,bs=s.buildings,p=bs.length?position(bs[Math.floor(bs.length/3)].i):position(55*N+18);this.controls.target.copy(p);this.camera.position.copy(p).add(new THREE.Vector3(270,320,320));this.camera.zoom=1.05;this.camera.updateProjectionMatrix();this.controls.update();}
  night(){this.dark=!this.dark;this.hemi.intensity=this.dark?.55:1.6;this.sun.intensity=this.dark?.65:3.1;this.scene.background.set(this.dark?'#253949':'#c5d7dc');this.scene.fog.color.copy(this.scene.background);setNight(this.dark);for(const source of this.models.values())source.traverse(o=>{if(o.isMesh&&o.material.name.includes('warm'))o.material.emissiveIntensity=this.dark?2.2:.15;});for(const m of this.streetLamps){m.emissive.set('#f8d795');m.emissiveIntensity=this.dark?2:0;}}
  draw(dt){if(this.revision!==this.city.revision)this.sync();if(this.city.speed)this.time+=dt*Math.sqrt(this.city.speed);this.waterTime=(this.waterTime||0)+Math.min(dt,.1);for(let i=0;i<this.rippleSites.length;i++){const p=this.rippleSites[i];dummy.position.set(p.x+Math.sin(this.waterTime*.4+p.offset)*.4,-.15,p.z+Math.sin(this.waterTime*.18+p.offset));dummy.rotation.set(-Math.PI/2,0,Math.sin(p.offset)*.3);dummy.scale.set(.7+Math.sin(this.waterTime*.8+p.offset)*.4,1,1);dummy.updateMatrix();this.ripples.setMatrixAt(i,dummy.matrix);}this.ripples.instanceMatrix.needsUpdate=true;for(const item of this.moving)moveVehicle(item,this.time);this.controls.update();this.sun.target.position.copy(this.controls.target);this.sun.position.copy(this.controls.target).add(new THREE.Vector3(-180,380,140));this.renderer.render(this.scene,this.camera);}
}
