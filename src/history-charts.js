const settings=new Map();
const metrics={population:{name:'Population',unit:'residents',color:'#38766b'},net:{name:'Monthly balance',unit:'dollars',color:'#8e683b'}};
const number=n=>Math.round(n).toLocaleString('en-US');
const value=(n,key)=>key==='net'?`${n<0?'−':''}$${number(Math.abs(n))}`:number(n);
const date=month=>new Date(Date.UTC(2000,month,1)).toLocaleDateString('en',{month:'short',year:'numeric',timeZone:'UTC'});
const attr=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;');

export function chartData(history,key,range='12'){
  const all=history.filter(h=>Number.isFinite(h[key])&&Number.isFinite(h.month)).map(h=>({month:h.month,value:h[key]}));
  const points=range==='all'?all:all.slice(-Number(range));
  const values=points.map(p=>p.value);
  let min=Math.min(0,...values),max=Math.max(0,...values);
  if(max===min){max=min+1;min=Math.min(0,min);}
  const span=max-min,step=10**Math.floor(Math.log10(span/4)),scaled=span/4/step;
  const tickStep=(scaled<=1?1:scaled<=2?2:scaled<=5?5:10)*step;
  min=Math.floor(min/tickStep)*tickStep;max=Math.ceil(max/tickStep)*tickStep;
  if(max===min)max=min+tickStep;
  const x=i=>70+(points.length>1?i/(points.length-1):.5)*380,y=n=>190-(n-min)/(max-min)*160;
  const ticks=[];for(let n=min;n<=max+tickStep*.001;n+=tickStep)ticks.push({value:n,y:y(n)});
  return {points,min,max,x,y,ticks};
}

export function renderHistoryChart(history,key){
  const metric=metrics[key];if(!metric)return '';
  const range=settings.get(key)||'12',data=chartData(history,key,range),points=data.points;
  if(!points.length)return '<p class="footer-note">Your first monthly report will start this graph.</p>';
  const latest=points.at(-1),first=points[0],change=latest.value-first.value;
  const line=points.map((p,i)=>`${data.x(i)},${data.y(p.value)}`).join(' ');
  const tickLabel=n=>{const abs=Math.abs(n),short=abs>=1e6?`${+(abs/1e6).toFixed(1)}m`:abs>=1e3?`${+(abs/1e3).toFixed(1)}k`:number(abs);return `${n<0?'−':''}${key==='net'?'$':''}${short}`;};
  const indices=[...new Set([0,Math.floor((points.length-1)/2),points.length-1])];
  const lastX=data.x(points.length-1),lastY=data.y(latest.value);
  return `<section class="town-chart" data-chart-key="${key}" data-chart-history="${attr(JSON.stringify(history.map(h=>({month:h.month,[key]:h[key]}))))}" style="--chart-color:${metric.color}"><div class="chart-heading"><div><small>${metric.name.toUpperCase()}</small><strong>${value(latest.value,key)}</strong></div><span class="chart-change">${change>=0?'+':'−'}${value(Math.abs(change),key)} over this period</span></div><div class="chart-ranges" role="group" aria-label="${metric.name} graph period">${[['6','6 months'],['12','12 months'],['all','All history']].map(([r,label])=>`<button data-chart-range="${r}" aria-pressed="${range===r}">${label}</button>`).join('')}</div><svg class="town-chart-svg" viewBox="0 0 470 230" role="img" aria-label="${metric.name} from ${date(first.month)} to ${date(latest.month)}. ${points.length} monthly reports.">${data.ticks.map(t=>`<line class="chart-grid ${Math.abs(t.value)<1e-8?'chart-zero':''}" x1="70" y1="${t.y}" x2="450" y2="${t.y}"/><text class="chart-axis" x="61" y="${t.y+4}" text-anchor="end">${tickLabel(t.value)}</text>`).join('')}<polygon class="chart-area" points="${data.x(0)},${data.y(0)} ${line} ${lastX},${data.y(0)}"/><polyline class="chart-line" points="${line}"/>${indices.map(i=>`<text class="chart-axis" x="${data.x(i)}" y="215" text-anchor="${i===0?'start':i===points.length-1?'end':'middle'}">${date(points[i].month)}</text>`).join('')}<line class="chart-cursor" x1="${lastX}" x2="${lastX}" y1="30" y2="190"/><circle class="chart-dot" cx="${lastX}" cy="${lastY}" r="5"/></svg><output class="chart-readout">${date(latest.month)} · ${value(latest.value,key)} ${key==='population'?metric.unit:''}</output><input class="chart-scrubber" data-chart-scrub type="range" min="0" max="${points.length-1}" step="1" value="${points.length-1}" aria-label="Explore ${metric.name.toLowerCase()} by month" aria-valuetext="${date(latest.month)}: ${value(latest.value,key)}" ${points.length===1?'disabled':''}><small class="chart-hint">Hover or tap the graph. Use the slider or arrow keys to explore each month.</small></section>`;
}

function showPoint(chart,index){
  const key=chart.dataset.chartKey,history=JSON.parse(chart.dataset.chartHistory),data=chartData(history,key,settings.get(key)||'12');
  index=Math.max(0,Math.min(data.points.length-1,index));const p=data.points[index],x=data.x(index),y=data.y(p.value);
  const cursor=chart.querySelector('.chart-cursor');cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);
  const dot=chart.querySelector('.chart-dot');dot.setAttribute('cx',x);dot.setAttribute('cy',y);
  chart.querySelector('.chart-readout').textContent=`${date(p.month)} · ${value(p.value,key)}${key==='population'?' residents':''}`;
  const slider=chart.querySelector('.chart-scrubber');slider.value=index;slider.setAttribute('aria-valuetext',`${date(p.month)}: ${value(p.value,key)}`);
}

export function handleChartClick(button){
  if(!button.hasAttribute('data-chart-range'))return false;
  const chart=button.closest('.town-chart'),key=chart.dataset.chartKey,history=JSON.parse(chart.dataset.chartHistory);
  const range=button.dataset.chartRange;settings.set(key,range);
  const holder=chart.parentElement,slot=[...holder.querySelectorAll('.town-chart')].indexOf(chart);
  chart.outerHTML=renderHistoryChart(history,key);holder.querySelectorAll('.town-chart')[slot]?.querySelector(`[data-chart-range="${range}"]`)?.focus({preventScroll:true});return true;
}

export function installChartInteractions(){
  const point=event=>{
    const svg=event.target.closest?.('.town-chart-svg');if(!svg)return;
    const chart=svg.closest('.town-chart'),key=chart.dataset.chartKey,history=JSON.parse(chart.dataset.chartHistory),data=chartData(history,key,settings.get(key)||'12');
    const bounds=svg.getBoundingClientRect(),x=(event.clientX-bounds.left)/bounds.width*470;
    showPoint(chart,Math.round((x-70)/380*(data.points.length-1)));
  };
  document.addEventListener('pointermove',point);document.addEventListener('pointerdown',point);
  document.addEventListener('input',event=>{if(event.target.hasAttribute('data-chart-scrub'))showPoint(event.target.closest('.town-chart'),Number(event.target.value));});
}
