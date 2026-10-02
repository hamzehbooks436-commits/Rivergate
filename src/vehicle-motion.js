// Route heading is independent of the direction an imported model faces.
export function moveVehicle(item,time){
  const phase=(time*item.speed/item.total+item.offset)%2;
  const reverse=phase>=1,distance=(reverse?2-phase:phase)*item.total;
  let k=1;
  while(k<item.lengths.length-1&&item.lengths[k]<distance)k++;
  const a=item.points[k-1],b=item.points[k];
  const f=(distance-item.lengths[k-1])/Math.max(.001,item.lengths[k]-item.lengths[k-1]);
  item.model.position.lerpVectors(a,b,f);
  const heading=Math.atan2(b.x-a.x,b.z-a.z)+(reverse?Math.PI:0);
  item.model.rotation.y=heading+(item.headingOffset||0);
  // In this Y-up world, the right of +Z is -X.
  if(item.lane){
    item.model.position.x-=Math.cos(heading)*item.lane;
    item.model.position.z+=Math.sin(heading)*item.lane;
  }
}
