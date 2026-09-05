import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { execFileSync } from 'node:child_process';
import { openStore, checkPassword } from '../models/store.js';
import { createApplication } from '../app.js';
const password='Initial-private-test-password!';
function prepare(t) {
 const dir=mkdtempSync(join(tmpdir(),'catequesis-prod-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const path=join(dir,'data.sqlite');
 const s=openStore(path,false,{username:'owner',name:'Owner',password});s.db.close();
 return {dir,path};
}
test('Base de producción vacía, inicialización idempotente y backup recuperable',t=>{
 const {dir,path}=prepare(t);
 let s=openStore(path,false,{username:'other',name:'Other',password});
 assert.equal(s.all('SELECT * FROM users').length,1);assert.equal(s.all('SELECT * FROM people').length,0);
 assert(checkPassword(password,s.get('SELECT * FROM users').password_hash));s.db.close();
 const copy=join(dir,'copy.sqlite');
 execFileSync(process.execPath,['backend/scripts/backup.js',copy],{env:{...process.env,CATEQUESIS_DB_PATH:path}});
 s=openStore(copy,false);assert.equal(s.get('SELECT * FROM users').username,'owner');s.db.close();
 execFileSync(process.execPath,['backend/scripts/reset-password.js','owner'],{env:{...process.env,CATEQUESIS_DB_PATH:copy,CATEQUESIS_NEW_PASSWORD:'Replacement-password-test!'}});
 s=openStore(copy,false);assert(checkPassword('Replacement-password-test!',s.get('SELECT * FROM users').password_hash));s.db.close();
});
test('Producción rechaza demo y exige HTTPS',t=>{
 const {path}=prepare(t);
 assert.throws(()=>createApplication({dbPath:path,production:true}),/HTTPS/);
 assert.throws(()=>createApplication({dbPath:path,publicOrigin:'http://example.org'}),/HTTPS/);
 const s=openStore(join(path,'..','demo.sqlite'),true);s.db.close();
 assert.throws(()=>createApplication({dbPath:join(path,'..','demo.sqlite'),production:true,publicOrigin:'https://example.org'}),/producción/);
});
test('Proxy HTTPS: Host, Origin, Secure, HSTS, health y cierre de sesión',async t=>{
 const {path}=prepare(t);
 const app=createApplication({dbPath:path,production:true,publicOrigin:'https://example.org'});t.after(()=>app.close());
 await new Promise(ok=>app.server.listen(0,'127.0.0.1',ok));
 function req(route,{method='GET',data,headers={}}={}) {return new Promise((ok,no)=>{
  const r=request({hostname:'127.0.0.1',port:app.server.address().port,path:route,method,headers:{Host:'example.org',...(data?{'Content-Type':'application/json',Origin:'https://example.org'}:{}),...headers}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>ok({status:res.statusCode,headers:res.headers,body:JSON.parse(body)}));});r.on('error',no);r.end(data?JSON.stringify(data):undefined);
 });}
 assert.equal((await req('/healthz')).status,200);
 assert.equal((await req('/healthz',{headers:{Host:'evil.example'}})).status,421);
 assert.equal((await req('/api/meta')).body.demo,false);
 const data={username:'owner',password};
 assert.equal((await req('/api/login',{method:'POST',data,headers:{Origin:'https://evil.example'}})).status,403);
 const login=await req('/api/login',{method:'POST',data});assert.equal(login.status,200);
 assert.match(login.headers['set-cookie'][0],/; Secure/);assert(login.headers['strict-transport-security']);
 const headers={Cookie:login.headers['set-cookie'][0].split(';')[0],'X-CSRF-Token':login.body.csrf};
 assert.equal((await req('/api/people',{headers})).status,200);
 assert.equal((await req('/api/logout',{method:'POST',data:{},headers})).status,200);
 assert.equal((await req('/api/session',{headers})).status,401);
});
