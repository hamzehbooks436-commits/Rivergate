import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT)||4180;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.svg':'image/svg+xml','.png':'image/png'};
http.createServer((req,res)=>{
  let file;
  try{const url=new URL(req.url,'http://localhost');file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));}
  catch{res.writeHead(400);res.end('Bad request');return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
    fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  });
}).listen(port,'127.0.0.1',()=>{
  console.log(`RIVERGATE — http://localhost:${port}\nKeep this window open while playing.`);
  if(process.argv.includes('--open')){
    const url=`http://localhost:${port}`;
    if(process.platform==='win32')spawn('powershell.exe',['-NoProfile','-WindowStyle','Hidden','-Command',`Start-Process '${url}'`],{windowsHide:true,stdio:'ignore'});
    else spawn(process.platform==='darwin'?'open':'xdg-open',[url],{stdio:'ignore'});
  }
}).on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is in use. Set PORT to another number, or close the other Rivergate server.`:e.message);process.exitCode=1;});
