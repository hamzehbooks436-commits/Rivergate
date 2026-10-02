import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ASSET_IDS} from './catalog.js';

const assets=new Map(), materials=new Map();
const cube=new THREE.BoxGeometry(1,1,1);
const cylinder=new THREE.CylinderGeometry(1,1,1,32);
const cone=new THREE.ConeGeometry(1,1,32);
const squareSpire=new THREE.ConeGeometry(1,1,4);
squareSpire.rotateY(Math.PI/4);
const hemisphere=new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2);
let night=false;

function surfaceTexture(type){
  if(!['brick','stone','wood','concrete','metal'].includes(type))return null;
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const c=canvas.getContext('2d');c.fillStyle='#e8e6df';c.fillRect(0,0,256,256);
  let seed=14;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<3500;i++){c.fillStyle=`rgba(65,60,49,${rnd()*.06})`;c.fillRect(rnd()*256,rnd()*256,1+rnd()*3,1+rnd()*3);}
  c.strokeStyle=type==='wood'?'#a59f8d':'#b3b1a5';c.lineWidth=type==='brick'?3:1.5;
  if(type==='brick'||type==='stone'){
    const row=type==='brick'?32:64, col=type==='brick'?64:128;
    for(let y=0;y<=256;y+=row){c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();for(let x=-(y/row%2)*col/2;x<=256;x+=col){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+row);c.stroke();}}
  }else if(type==='wood'){
    for(let x=0;x<256;x+=32){c.beginPath();c.moveTo(x,0);c.lineTo(x,256);c.stroke();for(let k=0;k<5;k++){c.strokeStyle='#bab4a3';c.beginPath();c.moveTo(x+k*5+3,0);c.bezierCurveTo(x+k*5+8,100,x+k*5,200,x+k*5+3,256);c.stroke();}}
  }else if(type==='metal'){for(let x=0;x<256;x+=32){c.beginPath();c.moveTo(x,0);c.lineTo(x,256);c.stroke();}}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);t.anisotropy=4;return t;
}
const textures=new Map();
export function mat(color,type='plaster'){
  const key=`${color}/${type}`;if(materials.has(key))return materials.get(key);
  if(!textures.has(type))textures.set(type,surfaceTexture(type));
  const m=new THREE.MeshStandardMaterial({color,map:textures.get(type),roughness:type==='glass'?.19:type==='metal'?.35:.88,metalness:type==='glass'?.48:type==='metal'?.7:0});
  if(type==='window'){m.roughness=.24;m.metalness=.35;m.emissive.set('#ffd88d');m.emissiveIntensity=night?.75:.045;m.userData.window=true;}
  materials.set(key,m);return m;
}
export function setNight(value){night=value;for(const m of materials.values())if(m.userData.window)m.emissiveIntensity=value?.75:.045;}
function mesh(parent,geometry,material,x,y,z,sx=1,sy=1,sz=1,ry=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.y=ry;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,x,y,z,w,h,d,material,ry=0){return mesh(parent,cube,material,x,y,z,w,h,d,ry);}
function roofGeometry(w,h,d,hip=false){
  const alongX=w>=d;
  const ridge=alongX
    ?(hip?[[-w*.22,h,0],[w*.22,h,0]]:[[-w/2,h,0],[w/2,h,0]])
    :(hip?[[0,h,-d*.22],[0,h,d*.22]]:[[0,h,-d/2],[0,h,d/2]]);
  const verts=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],...ridge];
  const slopes=alongX
    ?[[0,4,5],[0,5,1],[1,5,2],[2,5,4],[2,4,3],[3,4,0]]
    :[[0,3,5],[0,5,4],[1,4,5],[1,5,2],[1,0,4],[2,3,5]];
  const faces=[...slopes,[0,1,2],[0,2,3]];
  const a=[];for(const f of faces)for(const i of f)a.push(...verts[i]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(a.flatMap((_,i)=>i%3===0?[a[i]/w+.5,a[i+2]/d+.5]:[]),2));g.computeVertexNormals();return g;
}

// Bake each building into material batches so a tower does not require thousands of draw calls.
function bake(group){
  group.updateMatrixWorld(true);const buckets=new Map();const inv=group.matrixWorld.clone().invert();
  group.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;let geo=o.geometry.clone();if(geo.index){const old=geo;geo=geo.toNonIndexed();old.dispose();}geo.applyMatrix4(inv.clone().multiply(o.matrixWorld));
    for(const key of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(key))geo.deleteAttribute(key);
    if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));
    if(!geo.attributes.normal)geo.computeVertexNormals();
    const key=o.material.uuid;if(!buckets.has(key))buckets.set(key,{material:o.material,geos:[]});buckets.get(key).geos.push(geo);
  });
  const generated=new Set();group.traverse(o=>{if(o.geometry?.userData.temporary)generated.add(o.geometry);});
  group.clear();for(const {material,geos} of buckets.values()){const merged=mergeGeometries(geos);for(const g of geos)g.dispose();if(merged){merged.userData.owned=true;mesh(group,merged,material,0,0,0);}}
  for(const g of generated)g.dispose();return group;
}
export function disposeObject(group){const seen=new Set();group.traverse(o=>{if(o.geometry?.userData.owned&&!seen.has(o.geometry)){o.geometry.dispose();seen.add(o.geometry);}});}

export async function loadAssets(progress){
  const loader=new GLTFLoader();let done=0;
  return Promise.allSettled(ASSET_IDS.map(async id=>{
    const gltf=await loader.loadAsync(`./assets/models/${id}.glb`);
    const wrapper=new THREE.Group();wrapper.add(gltf.scene);
    const bounds=new THREE.Box3().setFromObject(wrapper);const center=bounds.getCenter(new THREE.Vector3());gltf.scene.position.add(new THREE.Vector3(-center.x,-bounds.min.y,-center.z));
    bake(wrapper);wrapper.traverse(o=>{if(o.geometry)o.geometry.userData.owned=false;});assets.set(id,wrapper);progress?.(++done,ASSET_IDS.length);return id;
  }));
}
function asset(parent,id,x,y,z,s=1,ry=0){const source=assets.get(id);if(!source)return null;const o=source.clone(true);o.position.set(x,y,z);if(Array.isArray(s))o.scale.fromArray(s);else o.scale.setScalar(s);o.rotation.y=ry;parent.add(o);return o;}

function blocks(p){
  const w=p.width,d=p.depth,a=w*.32,b=d*.32;
  switch(p.footprint){
    case 'l':return[{x:0,z:-d/2+b/2,w,d:b},{x:-w/2+a/2,z:b/2,w:a,d:d-b}];
    case 'u':return[{x:0,z:-d/2+b/2,w,d:b},{x:-w/2+a/2,z:b/2,w:a,d:d-b},{x:w/2-a/2,z:b/2,w:a,d:d-b}];
    case 't':return[{x:0,z:-d/2+b/2,w,d:b},{x:0,z:b/2,w:a,d:d-b}];
    case 'courtyard':return[{x:0,z:-d/2+b/2,w,d:b},{x:0,z:d/2-b/2,w,d:b},{x:-w/2+a/2,z:0,w:a,d:d-2*b},{x:w/2-a/2,z:0,w:a,d:d-2*b}];
    default:return[{x:0,z:0,w,d}];
  }
}
function roofPart(g,p,b,y){
  const rm=mat(p.roofColor),trim=mat(p.trim),w=b.w+.65,d=b.d+.65;
  const h=Math.min(w,d)*.32;
  box(g,b.x,y+.08,b.z,w,.16,d,trim);
  if(p.roof==='gable'||p.roof==='hip'){const geom=roofGeometry(w,h,d,p.roof==='hip');geom.userData.temporary=true;mesh(g,geom,rm,b.x,y+.12,b.z);}
  if(p.roof==='mansard'){
    const geo=new THREE.CylinderGeometry(.68,1,1,4,1);geo.rotateY(Math.PI/4);geo.userData.temporary=true;
    mesh(g,geo,rm,b.x,y+h/2,b.z,w/Math.SQRT2,h,d/Math.SQRT2);
    box(g,b.x,y+h,b.z,w*.68,.12,d*.68,rm);
    if(p.details&&b.w>5)for(let i=0;i<Math.floor(b.w/4);i++)asset(g,'dormer',b.x-b.w/2+2+i*4,y+.18,b.z+b.d/2-.15,.78);
  }
  if(p.roof==='dome'||p.roof==='spire'){
    // A circular feature cannot seal the corners of a rectangular wing. Give
    // every wing a complete pitched roof, then place the dome/spire above it.
    const baseHeight=h*.68;
    const geom=roofGeometry(w,baseHeight,d,p.roof==='dome');
    geom.userData.temporary=true;
    mesh(g,geom,rm,b.x,y+.12,b.z);
    const featureWidth=Math.min(w,d);
    if(p.roof==='dome'){
      const radius=featureWidth*.22;
      const platformHeight=y+baseHeight+.1;
      box(g,b.x,platformHeight+.18,b.z,radius*2.4,.36,radius*2.4,trim);
      mesh(g,hemisphere,rm,b.x,platformHeight+.36,b.z,radius,radius*.95,radius);
    }else{
      const radius=featureWidth*.18;
      const featureHeight=featureWidth*.7;
      const platformHeight=y+baseHeight+.1;
      box(g,b.x,platformHeight+.22,b.z,radius*2.6,.44,radius*2.6,trim);
      mesh(g,squareSpire,rm,b.x,platformHeight+.44+featureHeight/2,b.z,radius*1.4,featureHeight,radius*1.4);
    }
  }
  if(p.roof==='stepped'){for(let i=0;i<4;i++)box(g,b.x,y+i*.9+.45,b.z,w*(1-i*.17),.9,d*(1-i*.17),i%2?trim:rm);}
  if(['flat','battlements'].includes(p.roof)){
    for(const z of [-1,1])box(g,b.x,y+.35,b.z+z*b.d/2,b.w+.25,.7,.18,trim);
    for(const x of [-1,1])box(g,b.x+x*b.w/2,y+.35,b.z,.18,.7,b.d,trim);
    if(p.roof==='battlements'){
      for(let i=0;i<=Math.floor(b.w/1.5);i++)for(const z of [-1,1])box(g,b.x-b.w/2+i*b.w/Math.max(1,Math.floor(b.w/1.5)),y+.95,b.z+z*b.d/2,.75,.7,.65,trim);
      for(let i=1;i<Math.floor(b.d/1.5);i++)for(const x of [-1,1])box(g,b.x+x*b.w/2,y+.95,b.z-b.d/2+i*1.5,.65,.7,.75,trim);
    }
  }
}
function facade(g,p,b,totalH){
  if(p.windows==='none')return;
  const trim=mat(p.trim),glass=mat(p.style==='medieval'?'#425350':'#638984','window');
  for(let side=0;side<4;side++){
    const length=side%2?b.d:b.w, count=Math.max(1,Math.floor(length/p.spacing)), step=length/count;
    const angle=side*Math.PI/2,layer=new THREE.Group();layer.position.set(b.x,0,b.z);layer.rotation.y=angle;g.add(layer);
    const depth=side%2?b.w:b.d;
    for(let floor=0;floor<p.floors;floor++){
      const y=.25+floor*p.floorHeight+p.floorHeight*.54;
      const wh=p.floorHeight*(p.windows==='grid'?.79:.49);
      if(p.windows==='ribbon'){
        box(layer,0,y,depth/2+.025,length*.9,wh,.06,glass);
        for(let i=0;i<=count;i++)box(layer,-length*.45+i*length*.9/count,y,depth/2+.08,.07,wh+.08,.08,trim);
      }else{
        for(let i=0;i<count;i++){
          const x=-length/2+step*(i+.5),ww=step*(p.windows==='grid'?.89:.52);
          if(p.windows==='arched'&&p.floors<9&&count<12){
            const s=new THREE.Shape();s.moveTo(-ww/2,-wh/2);s.lineTo(ww/2,-wh/2);s.lineTo(ww/2,wh*.15);s.absarc(0,wh*.15,ww/2,0,Math.PI,false);s.lineTo(-ww/2,-wh/2);
            const geom=new THREE.ShapeGeometry(s,10);geom.userData.temporary=true;mesh(layer,geom,glass,x,y,depth/2+.04);
          }else box(layer,x,y,depth/2+.035,ww,wh,.07,glass);
          if(p.details&&p.windows!=='grid'){
            box(layer,x,y-wh/2-.07,depth/2+.12,ww+.24,.13,.27,trim);
            box(layer,x,y,depth/2+.09,.055,wh,.07,trim);
            if(p.style==='suburban')for(const sign of [-1,1])box(layer,x+sign*(ww/2+.19),y,depth/2+.08,.28,wh,.08,mat(p.roofColor));
          }
        }
      }
      if(p.details&&floor>0)box(layer,0,floor*p.floorHeight+.23,depth/2+.06,length+.1,.14,.16,trim);
    }
  }
}
function circular(g,p,h){
  const wm=mat(p.color,p.material),trim=mat(p.trim),glass=mat('#638984','window');
  mesh(g,cylinder,wm,0,h/2+.2,0,p.width/2,h,p.depth/2);
  mesh(g,cylinder,trim,0,.14,0,p.width/2+.25,.28,p.depth/2+.25);
  const count=Math.max(8,Math.floor(Math.PI*Math.min(p.width,p.depth)/p.spacing));
  for(let f=0;f<p.floors;f++){
    if(p.details)mesh(g,cylinder,trim,0,.2+(f+1)*p.floorHeight,0,p.width/2+.13,.15,p.depth/2+.13);
    if(p.windows!=='none')for(let i=0;i<count;i++){
      const angle=i*Math.PI*2/count,x=Math.sin(angle)*(p.width/2+.04),z=Math.cos(angle)*(p.depth/2+.04);
      box(g,x,.2+f*p.floorHeight+p.floorHeight*.53,z,Math.min(p.width,p.depth)*Math.PI/count*.6,p.floorHeight*.53,.09,glass,angle);
    }
  }
  const rm=mat(p.roofColor);
  if(p.roof==='dome')mesh(g,hemisphere,rm,0,h+.3,0,p.width*.53,Math.min(p.width,p.depth)*.45,p.depth*.53);
  else if(['spire','gable','hip','mansard'].includes(p.roof))mesh(g,cone,rm,0,h+.3+p.width*.3,0,p.width*.55,p.width*.6,p.depth*.55);
  else mesh(g,cylinder,rm,0,h+.4,0,p.width*.53,.4,p.depth*.53);
}
function entrance(g,p){
  const d=p.depth,trim=mat(p.trim),glass=mat('#4d6e64','window');
  const front=(p.footprint==='u'||p.footprint==='t'||p.footprint==='courtyard')?-d/2:d/2;
  box(g,0,1.45,front+(front<0?-.05:.05),1.65,2.5,.16,glass);
  box(g,0,.13,front+(front<0?-.6:.6),2.5,.26,1.1,trim);
}
export function buildObject(p){
  const g=new THREE.Group();g.name=p.name;g.userData.recordId=p.id;
  if(p.kind==='building'){
    p={...p,details:false};
    const h=p.floors*p.floorHeight;
    if(p.footprint==='round')circular(g,p,h);
    else for(const b of blocks(p)){
      box(g,b.x,.15,b.z,b.w+.4,.3,b.d+.4,mat(p.trim));
      box(g,b.x,h/2+.25,b.z,b.w,h,b.d,mat(p.color,p.material));
      facade(g,p,b,h);roofPart(g,p,b,h+.25);
      if(p.details&&['european','classical','medieval'].includes(p.style))for(const x of [-1,1])for(const z of [-1,1])box(g,b.x+x*(b.w/2-.1),h/2+.25,b.z+z*(b.d/2-.1),.25,h,.25,mat(p.trim));
    }
    entrance(g,p);bake(g);
  }else if(p.asset){
    const o=asset(g,p.asset,0,0,0);
    if(!o){box(g,0,.5,0,1,1,1,mat('#d09571'));g.userData.missingAsset=p.asset;}
    if(p.tinted&&o)o.traverse(n=>{if(n.isMesh)n.material=mat(p.color,p.material);});
  }else{
    const [w,h,d]=p.size;let m=mat(p.color,p.material);
    if(['path','road','lawn'].includes(p.template)){
      // Stable depth priority for coplanar landscaping pieces, including saved projects.
      let hash=2166136261;for(const char of p.id)hash=Math.imul(hash^char.charCodeAt(0),16777619);
      const priority=(hash>>>0)/4294967296;
      m=m.clone();m.userData={owned:true,sharedMap:true};m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-(2+priority*16);
      g.userData.surfacePriority=priority;
    }
    if(p.shape==='cylinder')mesh(g,cylinder,m,0,h/2,0,w/2,h,d/2);
    else if(p.shape==='cone')mesh(g,cone,m,0,h/2,0,w/2,h,d/2);
    else if(p.shape==='gable'||p.shape==='hip'){const geo=roofGeometry(w,h,d,p.shape==='hip');geo.userData.owned=true;mesh(g,geo,m,0,0,0);}
    else{box(g,0,h/2,0,w,h,d,m);if(p.shape==='road')for(let z=-d/2+1;z<d/2;z+=3)box(g,0,h+.01,z,.12,.02,1.4,mat('#efe7c8'));}
  }
  if(g.userData.surfacePriority!==undefined)g.traverse(o=>{if(o.isMesh)o.renderOrder=1+g.userData.surfacePriority;});
  g.position.fromArray(p.position);g.rotation.y=p.rotation;g.scale.fromArray(p.scale);return g;
}
