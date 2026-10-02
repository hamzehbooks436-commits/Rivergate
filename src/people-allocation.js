// Fill the least staffed destinations first, respecting capacity and reachability.
// Return whole people, with deterministic tie-breaking between equal destinations.
export function balancedShares(candidates,demand){
  const eligible=candidates.filter(c=>c.available>=1);
  const target=Math.min(Math.max(0,Math.floor(demand)),eligible.reduce((n,c)=>n+Math.floor(c.available),0));
  if(!target)return [];
  let low=Math.min(...eligible.map(c=>c.filled)),high=Math.max(...eligible.map(c=>c.filled+Math.floor(c.available)));
  for(let step=0;step<40;step++){
    const level=(low+high)/2;
    const assigned=eligible.reduce((n,c)=>n+Math.min(Math.floor(c.available),Math.max(0,level-c.filled)),0);
    if(assigned<target)low=level;else high=level;
  }
  const shares=eligible.map(c=>{const exact=Math.min(Math.floor(c.available),Math.max(0,high-c.filled));return {...c,people:Math.floor(exact+1e-9),fraction:exact-Math.floor(exact+1e-9)};});
  let remaining=target-shares.reduce((n,c)=>n+c.people,0);
  const order=shares.slice().sort((a,b)=>b.fraction-a.fraction||a.filled-b.filled||(a.distance||0)-(b.distance||0)||a.id-b.id);
  for(const c of order)if(remaining>0&&c.people<Math.floor(c.available)){c.people++;remaining--;}
  return shares.filter(c=>c.people>0);
}
