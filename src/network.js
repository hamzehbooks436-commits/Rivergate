import {N,clamp,MODES} from './data.js';
import {perimeter} from './region.js';
export const xy=i=>({x:i%N,z:Math.floor(i/N)});
export const index=(x,z)=>x>=0&&z>=0&&x<N&&z<N?z*N+x:-1;
export function neighbours(i){const {x,z}=xy(i);return [[x-1,z],[x+1,z],[x,z-1],[x,z+1]].map(([a,b])=>index(a,b)).filter(n=>n>=0);}
export const edge=i=>i%N===0||i%N===N-1||i<N||i>=N*(N-1);
const accessCells=(s,i)=>{const b=s.buildingIndex?.get(s.tiles[i]?.building);return b?perimeter(b):neighbours(i);};
export function roadAt(s,i){if(!s.tiles[i])return -1;if(s.tiles[i].road)return i;return accessCells(s,i).filter(n=>s.tiles[n].road).sort((a,b)=>neighbours(b).filter(n=>s.tiles[n].road).length-neighbours(a).filter(n=>s.tiles[n].road).length)[0]??-1;}
export function railAt(s,i){if(!s.tiles[i])return -1;if(s.tiles[i].rail)return i;return accessCells(s,i).find(n=>s.tiles[n].rail)??-1;}
class Heap {
  constructor(){this.a=[];}
  push(item){let i=this.a.length;this.a.push(item);while(i){const p=(i-1)>>1;if(this.a[p][0]<=item[0])break;this.a[i]=this.a[p];i=p;}this.a[i]=item;}
  pop(){const first=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let j=i*2+1;if(j+1<this.a.length&&this.a[j+1][0]<this.a[j][0])j++;if(this.a[j][0]>=last[0])break;this.a[i]=this.a[j];i=j;}this.a[i]=last;}return first;}
}
export class Network {
  constructor(s,traffic=[],weather=1){
    this.s=s;this.cache=new Map();this.adj=Array.from({length:N*N},()=>[]);this.rail=Array.from({length:N*N},()=>[]);this.transit=Array.from({length:N*N},()=>[]);
    for(let i=0;i<s.tiles.length;i++){
      if(s.tiles[i].road)for(const j of neighbours(i))if(s.tiles[j].road){const cap=s.tiles[j].road===2?180:65;this.adj[i].push({to:j,cost:weather*(s.tiles[j].road===2?.62:1)*(1+clamp((traffic[j]||0)/cap,0,4)*1.5),road:j});}
      if(s.tiles[i].rail)for(const j of neighbours(i))if(s.tiles[j].rail)this.rail[i].push({to:j,cost:1});
    }
    this.routeInfo=new Map();
    for(const r of s.routes){
      const segments=[];let valid=r.stops.length>=2&&r.stops.every(i=>s.tiles[i]?.road),length=0;
      for(let k=1;k<r.stops.length;k++){
        const a=r.stops[k-1],b=r.stops[k];let p;
        if(r.mode==='metro')p={distance:Math.hypot(a%N-b%N,Math.floor(a/N)-Math.floor(b/N)),path:[a,b]};
        else if(r.mode==='rail'){const ra=railAt(s,a),rb=railAt(s,b);p=ra>=0&&rb>=0?this.path(ra,rb,'rail'):null;}
        else p=this.path(a,b,'road');
        if(!p){valid=false;break;}length+=p.path.length>2?p.path.length-1:p.distance;segments.push({a,b,...p});
      }
      const m=MODES[r.mode],operating=valid&&r.active&&!r.constructionDays&&s.funding.transport>0;
      const capacity=operating?Math.floor(m.capacity*r.vehicles*4*s.funding.transport/100*Math.min(1,24/Math.max(8,length))):0;
      this.routeInfo.set(r.id,{valid,operating,segments,length,capacity,used:0,waiting:0,fareRiders:0});
      if(operating)for(const p of segments){const travel=r.mode==='bus'?p.distance*.6:(r.mode==='metro'?p.distance:p.path.length-1)*3/m.speed;const cost=2+travel;this.transit[p.a].push({to:p.b,cost,route:r.id});this.transit[p.b].push({to:p.a,cost,route:r.id});}
    }
    this.cache.clear();
  }
  distances(start,type='road'){
    const key=type+':'+start;if(this.cache.has(key)){const value=this.cache.get(key);this.cache.delete(key);this.cache.set(key,value);return value;}
    const dist=new Float64Array(N*N).fill(Infinity),prev=new Int32Array(N*N).fill(-1),via=Array(N*N).fill(null),heap=new Heap();
    if(start<0)return {dist,prev,via};dist[start]=0;heap.push([0,start]);
    while(heap.a.length){const [d,i]=heap.pop();if(d>dist[i])continue;const links=type==='rail'?this.rail[i]:type==='trip'?[...this.adj[i],...this.transit[i]]:this.adj[i];for(const e of links){const next=d+e.cost;if(next<dist[e.to]){dist[e.to]=next;prev[e.to]=i;via[e.to]=e;heap.push([next,e.to]);}}}
    const result={dist,prev,via};this.cache.set(key,result);if(this.cache.size>32)this.cache.delete(this.cache.keys().next().value);return result;
  }
  path(a,b,type='road'){
    if(a<0||b<0)return null;const {dist,prev,via}=this.distances(a,type);if(!Number.isFinite(dist[b]))return null;
    const path=[],routes=new Set(),roads=[];let at=b;
    while(at!==-1){path.push(at);if(via[at]?.route)routes.add(via[at].route);else if(via[at]?.road!==undefined)roads.push(via[at].road);at=prev[at];}
    return {distance:dist[b],path:path.reverse(),routes:[...routes],roads};
  }
  external(i,type='road'){
    if(i<0)return null;const d=this.distances(i,type).dist;let best=-1;
    for(let j=0;j<d.length;j++)if(edge(j)&&Number.isFinite(d[j])&&(type==='rail'?this.s.tiles[j].rail:this.s.tiles[j].road)&&(best<0||d[j]<d[best]))best=j;
    return best<0?null:this.path(i,best,type);
  }
}
export function utilityComponents(s,key){
  const ids=new Int32Array(N*N).fill(-1);let component=0;
  for(let i=0;i<ids.length;i++)if(ids[i]<0&&(s.tiles[i].road||s.tiles[i][key])){
    const q=[i];ids[i]=component;
    for(let k=0;k<q.length;k++)for(const j of neighbours(q[k]))if(ids[j]<0&&(s.tiles[j].road||s.tiles[j][key])){ids[j]=component;q.push(j);}
    component++;
  }
  return {ids,count:component,at:i=>ids[i]>=0?ids[i]:accessCells(s,i).map(j=>ids[j]).find(n=>n>=0)??-1};
}
export function lineCells(a,b){const p=xy(a),q=xy(b),cells=[a];let x=p.x,z=p.z;while(x!==q.x){x+=Math.sign(q.x-x);cells.push(index(x,z));}while(z!==q.z){z+=Math.sign(q.z-z);cells.push(index(x,z));}return cells;}
export function rectCells(a,b){const p=xy(a),q=xy(b),cells=[];for(let z=Math.min(p.z,q.z);z<=Math.max(p.z,q.z);z++)for(let x=Math.min(p.x,q.x);x<=Math.max(p.x,q.x);x++)cells.push(index(x,z));return cells;}
