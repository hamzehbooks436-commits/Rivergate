// The city uses UTC dates so season boundaries do not depend on the player's timezone.
export const cityDate=s=>new Date(Date.UTC(2000,0,1)+s.day*86400000);
export const SEASONS={
  Winter:{icon:'❄',dates:'December – February',ground:'#e4e9e7',leaf:'#c4d2c9',accent:'#f5f7fa',description:'Snow blankets the ground and frost settles on the trees.'},
  Spring:{icon:'✿',dates:'March 1 – June 10',ground:'#83ad65',leaf:'#629447',accent:'#98bc70',description:'Fresh green grass and new foliage return to the valley.'},
  Summer:{icon:'☀',dates:'June 11 – September 30',ground:'#9eaf6d',leaf:'#7e984a',accent:'#c7bc71',description:'Green grass mixes with sun-dried yellow patches.'},
  Autumn:{icon:'❧',dates:'October 1 – November 30',ground:'#c49b59',leaf:'#c87839',accent:'#e2b850',description:'Orange and golden leaves cover the ground.'},
};
export function seasonFor(s){const d=cityDate(s),m=d.getUTCMonth()+1,day=d.getUTCDate();return m===12||m<=2?'Winter':m<6||(m===6&&day<=10)?'Spring':m<=9?'Summer':'Autumn';}
// Annual local city celebrations: fixed dates, independent of real-world religious calendars.
export const HOLIDAYS=[
  {id:'new-year',name:'New Year',season:'Winter',month:1,day:1,duration:3,icon:'✦',text:'Neighbours welcome another year together.'},
  {id:'blossom',name:'Blossom Festival',season:'Spring',month:3,day:20,duration:4,icon:'✿',text:'Gardens open for a celebration of spring flowers.'},
  {id:'garden',name:'Community Garden Day',season:'Spring',month:5,day:15,duration:3,icon:'♧',text:'Residents share flowers and enjoy their neighbourhood gardens.'},
  {id:'river',name:'River Festival',season:'Summer',month:6,day:21,duration:4,icon:'≈',text:'Summer picnics and colourful bunting brighten the riverfront.'},
  {id:'summer',name:'Summer Lights',season:'Summer',month:8,day:15,duration:4,icon:'☀',text:'Lanterns and evening gatherings celebrate the long summer days.'},
  {id:'harvest',name:'Harvest Fair',season:'Autumn',month:10,day:10,duration:4,icon:'❧',text:'Pumpkins, golden leaves and harvest displays fill the city.'},
  {id:'lantern',name:'Autumn Lantern Night',season:'Autumn',month:11,day:5,duration:3,icon:'✧',text:'Warm lanterns bring neighbours together before winter.'},
  {id:'winter',name:'Winter Lights',season:'Winter',month:12,day:20,duration:7,icon:'❄',text:'Festive trees and snowmen bring colour to the snowy streets.'},
];
export function activeHoliday(s){const d=cityDate(s);return HOLIDAYS.find(h=>d.getUTCMonth()+1===h.month&&d.getUTCDate()>=h.day&&d.getUTCDate()<h.day+h.duration)||null;}
export function nextHoliday(s){const now=cityDate(s);return HOLIDAYS.map(h=>{let date=new Date(Date.UTC(now.getUTCFullYear(),h.month-1,h.day));if(date<now)date=new Date(Date.UTC(now.getUTCFullYear()+1,h.month-1,h.day));return {...h,date,days:Math.round((date-now)/86400000)};}).sort((a,b)=>a.days-b.days)[0];}
export function seasonalState(s){const season=seasonFor(s),holiday=activeHoliday(s);return {season,holiday,key:season+':'+(holiday?.id||'')};}
