import {SERVICES,money} from './data.js';
import {currentEvent,requests} from './campaign.js';

const count=n=>Math.round(n||0).toLocaleString('en-US');
export function newspaperEdition(s){
  const st=s.stats,event=currentEvent(s),stories=[],voices=[];
  const homes=s.buildings.filter(b=>b.zone==='residential'&&b.occupants>0&&b.status==='occupied');
  const facilities=kind=>s.buildings.filter(b=>b.service===kind&&b.status==='occupied');
  const school=facilities('education'),hospitals=facilities('healthcare');
  const students=school.reduce((n,b)=>n+(b.info.students||0),0),patients=hospitals.reduce((n,b)=>n+(b.info.patients||0),0);
  const schoolWaiting=st.studentsWaiting||0,hospitalWaiting=st.patientsWaiting||0;
  const previous=s.history.findLast(h=>h.month<s.month),growth=previous?st.population-previous.population:0;
  stories.push({section:'TOWN LIFE',headline:st.population?`${count(st.population)} people call ${s.name} home`:'A new town, a fresh beginning',text:st.population?`Town happiness stands at ${count(st.happiness)} / 100.${previous?` Population has ${growth>=0?'grown by':'fallen by'} ${count(Math.abs(growth))} since the previous report.`:''}`:'Build homes, connect streets and utilities, then welcome the first neighbours.'});
  stories.push({section:'WORK & BUSINESS',headline:st.unemployment>.2?'Residents seek more reachable jobs':'A working town',text:`${count(st.employed)} residents are employed across businesses and civic facilities. The town offers ${count(st.jobs)} job positions; unemployment is ${Math.round(st.unemployment*100)}%. Places without road access, utilities or funding cannot recruit.`});
  stories.push({section:'AROUND TOWN',headline:event.name,text:event.text});
  stories.push({section:'SCHOOLS',headline:schoolWaiting?`${count(schoolWaiting)} children waiting for a school place`:school.length?'Classrooms welcome local children':'Town needs its first school',text:`${count(students)} children are enrolled across ${school.length} open school${school.length===1?'':'s'}. ${schoolWaiting?'More funded, reachable places are needed.':'Children need a school they can reach by road.'}`});
  stories.push({section:'HEALTH',headline:hospitalWaiting?'Hospital demand exceeds available places':hospitals.length?'Hospital teams care for the town':'Healthcare on the town agenda',text:`${count(patients)} patients are being treated this month across ${hospitals.length} open hospital${hospitals.length===1?'':'s'}.${hospitalWaiting?` ${count(hospitalWaiting)} patients are waiting for space.`:''} Demand changes with population, pollution and seasonal illness.`});
  stories.push({section:'TOWN HALL',headline:s.ledger.net-s.ledger.grant<0?'Council faces an operating shortfall':'Council reviews the town finances',text:`The treasury holds ${money(s.cash)}. Last month's operating balance before grants and awards was ${money(s.ledger.net-s.ledger.grant)}.`});
  for(const r of requests(s))voices.push({i:r.i,text:r.text,by:`Neighbourhood resident · ${r.i%152+1}, ${Math.floor(r.i/152)+1}`,context:r.solution});
  const jobSeeker=homes.find(b=>b.info.employed<b.info.workforce);
  if(jobSeeker)voices.unshift({i:jobSeeker.i,text:'I want a job I can reach from home. More workplaces nearby would help.',by:'A resident looking for work',context:`${count(jobSeeker.info.employed)} of ${count(jobSeeker.info.workforce)} working residents in this building have a job.`});
  const happy=homes.filter(b=>b.info.happiness>=65).sort((a,b)=>b.info.happiness-a.info.happiness)[0];
  if(happy)voices.push({i:happy.i,text:happy.info.park>.5?'The parks give us somewhere to relax and meet our neighbours.':happy.info.commute<20?'It is good to have work close to home.':'Our neighbourhood is becoming a good place to live.',by:'A neighbourhood resident',context:`Neighbourhood happiness: ${count(happy.info.happiness)} / 100.`});
  for(const b of [...school,...hospitals].filter(b=>b.info.workers>0).slice(0,2))voices.push({i:b.i,text:b.service==='education'?`We have ${count(b.info.students)} pupils learning here. Every school place matters.`:`Our team is treating ${count(b.info.patients)} patients this month.`,by:b.service==='education'?'From the school staff room':'From the hospital team',context:`${count(b.info.workers)} staff at ${SERVICES[b.service].name.toLowerCase()}.`});
  return {stories,voices:voices.slice(0,9),notices:s.news.slice(0,12),students,patients};
}

export function renderNewspaper(s,escape){
  const edition=newspaperEdition(s),date=new Date(Date.UTC(2000,0,1)+s.day*86400000).toLocaleDateString('en',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  const article=a=>`<article class="paper-article"><span class="eyebrow">${a.section}</span><h3>${escape(a.headline)}</h3><p>${escape(a.text)}</p></article>`;
  return `<div class="newspaper"><header class="paper-masthead"><span class="eyebrow">YOUR TOWN’S LOCAL NEWSPAPER</span><h2>${escape(s.name)} Gazette</h2><div class="paper-date">${date} <span>Edition ${s.month+1} · Local news & neighbourhood voices</span></div></header>${article(edition.stories[0])}<div class="paper-columns"><section>${edition.stories.slice(1).map(article).join('')}</section><section><h3 class="paper-section">On the streets</h3><p class="paper-caption">What the town’s residents and staff are saying today.</p>${edition.voices.length?edition.voices.map(v=>`<blockquote class="paper-quote"><p>“${escape(v.text)}”</p><cite>${escape(v.by)}</cite><small>${escape(v.context)}</small><button data-paper-lot="${v.i}">Visit this neighbourhood →</button></blockquote>`).join(''):'<p>Resident voices will appear as your town becomes inhabited.</p>'}<h3 class="paper-section">Town notices</h3>${edition.notices.length?edition.notices.map(n=>`<article class="paper-notice"><small>Month ${n.month+1}</small><p>${escape(n.text)}</p></article>`).join(''):'<p>No notices yet. Openings, projects and town events will be reported here.</p>'}</section></div><footer class="paper-footer">Published from current town conditions. Open the newspaper again for the latest edition.</footer></div>`;
}
