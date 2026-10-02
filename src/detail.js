import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function batch(group){
  group.updateMatrixWorld(true);const buckets=new Map();group.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);geometry.deleteAttribute('uv');const id=o.material.uuid;if(!buckets.has(id))buckets.set(id,{material:o.material,parts:[]});buckets.get(id).parts.push(geometry);});
  const result=new THREE.Group();for(const {material,parts} of buckets.values()){const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(geometry){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;result.add(mesh);}}return result;
}
