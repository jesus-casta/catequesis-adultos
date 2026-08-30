import { test } from 'node:test';
import { request as httpRequest } from 'node:http';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplication } from '../app.js';
import { DEMO_PASSWORD } from '../models/store.js';
import { personalData, filePayload } from '../services/validation.js';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0WQAAAAASUVORK5CYII=';
const PDF = Buffer.from('%PDF-1.4\n1 0 obj <</Type /Catalog>> endobj\ntrailer <</Root 1 0 R>>\n%%EOF').toString('base64');
async function fixture(t,opts={}) {
  const app=createApplication({dbPath:':memory:',demo:true,...opts});
  await new Promise(ok=>app.server.listen(0,'127.0.0.1',ok));
  const origin=`http://127.0.0.1:${app.server.address().port}`;
  t.after(()=>app.close());
  async function req(path, {method='GET',data,auth,headers={}}={}) {
    const res=await fetch(`${origin}${path}`,{method,headers:{...(data===undefined?{}:{'Content-Type':'application/json',Origin:origin}),...(auth?{Cookie:auth.cookie,'X-CSRF-Token':auth.csrf}:{}),...headers},body:data===undefined?undefined:JSON.stringify(data)});
    const value=res.headers.get('content-type')?.includes('application/json')?await res.json():Buffer.from(await res.arrayBuffer());
    return {status:res.status,value,headers:res.headers};
  }
  async function login(username='ana') {
    const r=await req('/api/login',{method:'POST',data:{username,password:DEMO_PASSWORD}});assert.equal(r.status,200,JSON.stringify(r.value));
    return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:r.value.csrf,user:r.value.user};
  }
  return {app,req,login,origin};
}
function spec(name,fn){test(name,async t=>fn(await fixture(t),t));}
const updatePerson=(p,data={})=>({firstName:p.firstName,lastName:p.lastName,data:{...p.data,...data},version:p.version});
const updateUser=(u,extra={})=>({username:u.username,name:u.name,role:u.role,active:u.active,groupIds:u.groupIds,password:'',version:u.version,...extra});
const updateGroup=(g,extra={})=>({name:g.name,parish:g.parish,day:g.day,startTime:g.startTime,endTime:g.endTime,itinerary:g.itinerary,catechistIds:g.catechists.map(u=>u.id),version:g.version,...extra});

spec('CU-01: sesión autenticada, cookie HttpOnly y salida revocada',async({req,login})=>{
  const denied=await req('/api/people');assert.equal(denied.status,401);
  const r=await req('/api/login',{method:'POST',data:{username:'ana',password:DEMO_PASSWORD}});
  assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  const auth=await login();assert.equal((await req('/api/session',{auth})).status,200);
  assert.equal((await req('/api/logout',{method:'POST',data:{},auth})).status,200);
  assert.equal((await req('/api/people',{auth})).status,401);
});
spec('CU-01: datos de acceso incorrectos y límite de intentos',async({req})=>{
  for(let n=0;n<8;n++)assert.equal((await req('/api/login',{method:'POST',data:{username:'ana',password:'incorrecta'}})).status,401);
  assert.equal((await req('/api/login',{method:'POST',data:{username:'ana',password:DEMO_PASSWORD}})).status,429);
});
test('CU-01: la sesión caducada deja de dar acceso',async t=>{
  let clock=Date.now();const {req,login}=await fixture(t,{now:()=>clock});const auth=await login();clock+=9*60*60*1000;
  assert.equal((await req('/api/people',{auth})).status,401);
});
spec('Seguridad: origen ajeno, CSRF y Host no autorizado',async({req,login,origin})=>{
  const auth=await login('admin');
  assert.equal((await req('/api/logout',{method:'POST',data:{},auth,headers:{Origin:'https://otro.example'}})).status,403);
  assert.equal((await req('/api/logout',{method:'POST',data:{},auth,headers:{'X-CSRF-Token':'incorrecto'}})).status,403);
  // Fetch normalizes Host; use a raw HTTP request to exercise DNS-rebinding protection.
  const hostStatus=await new Promise((ok,no)=>{const r=httpRequest(`${origin}/api/meta`,{headers:{Host:'otro.example'}},res=>{res.resume();ok(res.statusCode);});r.on('error',no);r.end();});
  assert.equal(hostStatus,421);
});
spec('CU-07: Ana no ve segundo; consulta solo ve confirmación',async({req,login})=>{
  const a=await login('ana'),r=await login('consulta');
  const ps=(await req('/api/people',{auth:a})).value;assert.equal(ps.length,5);assert(!ps.some(p=>p.groupId==='g-second'));
  assert.equal((await req('/api/people/p-6',{auth:a})).status,404);
  assert.equal((await req('/api/people',{auth:r})).value.length,3);
  assert.equal((await req('/api/people/p-4',{auth:r})).status,404);
});
spec('Administración solo recibe datos mínimos, nunca fichas ampliadas',async({req,login})=>{
  const auth=await login('admin');const ps=(await req('/api/people',{auth})).value;assert.equal(ps.length,7);
  assert.deepEqual(Object.keys(ps[0]).sort(),['firstName','groupId','id','lastName','version']);
  assert.equal((await req('/api/people/p-1',{auth})).status,404);
});
spec('CU-02: altas de cuenta, sin grupo no hay fichas; duplicado rechazado',async({req,login})=>{
  const auth=await login('admin');
  const data={username:'nueva',name:'Nueva prueba',role:'reader',active:true,password:DEMO_PASSWORD,groupIds:[]};
  assert.equal((await req('/api/users',{method:'POST',auth,data})).status,201);
  const newcomer=await login('nueva');assert.deepEqual((await req('/api/people',{auth:newcomer})).value,[]);
  assert.equal((await req('/api/users',{method:'POST',auth,data})).status,409);
});
spec('CU-02: catequistas y lectores no administran usuarios',async({req,login})=>{
  for(const username of ['ana','consulta']) {const auth=await login(username);assert.equal((await req('/api/users',{auth})).status,403);assert.equal((await req('/api/users',{method:'POST',data:{},auth})).status,403);}
});
spec('CU-02: desactivar cuenta revoca su sesión sin borrar personas',async({req,login})=>{
  const auth=await login('admin'),reader=await login('consulta');
  const u=(await req('/api/users',{auth})).value.find(u=>u.id==='u-reader');
  assert.equal((await req(`/api/users/${u.id}`,{method:'PUT',auth,data:updateUser(u,{active:false})})).status,200);
  assert.equal((await req('/api/people',{auth:reader})).status,401);
  assert.equal((await req('/api/people',{auth})).value.length,7);
});
spec('CU-02: no se puede desactivar el último administrador',async({req,login})=>{
  const auth=await login('admin');const u=(await req('/api/users',{auth})).value.find(u=>u.id==='u-admin');
  assert.equal((await req(`/api/users/${u.id}`,{method:'PUT',auth,data:updateUser(u,{active:false})})).status,409);
  assert.equal((await req('/api/users',{auth})).status,200);
});
spec('CU-03: crear grupo, horario inválido, modificación e itinerario ocupado',async({req,login})=>{
  const auth=await login('admin');const g=(await req('/api/groups',{auth})).value.find(g=>g.id==='g-conf');
  const newGroup=updateGroup(g,{name:'Nuevo grupo de prueba'});delete newGroup.version;
  assert.equal((await req('/api/groups',{method:'POST',auth,data:newGroup})).status,201);
  assert.equal((await req('/api/groups/g-conf',{method:'PUT',auth,data:updateGroup(g,{endTime:'18:00'})})).status,400);
  assert.equal((await req('/api/groups/g-conf',{method:'PUT',auth,data:updateGroup(g,{itinerary:'baptism-1'})})).status,409);
  assert.equal((await req('/api/groups/g-conf',{method:'PUT',auth,data:updateGroup(g,{day:'Viernes'})})).status,200);
});
spec('CU-04: varios catequistas comparten acceso; retirar el último se rechaza',async({req,login})=>{
  const a=await login('ana'),l=await login('luis'),auth=await login('admin');
  for(const u of [a,l])assert.equal((await req('/api/people/p-1',{auth:u})).status,200);
  const g=(await req('/api/groups',{auth})).value.find(g=>g.id==='g-conf');
  assert.equal((await req('/api/groups/g-conf',{method:'PUT',auth,data:updateGroup(g,{catechistIds:[]})})).status,409);
  assert.equal((await req('/api/groups/g-conf',{method:'PUT',auth,data:updateGroup(g,{catechistIds:['u-reader']})})).status,400);
  assert.equal((await req('/api/groups/g-conf',{method:'PUT',auth,data:updateGroup(g,{catechistIds:['u-luis']})})).status,200);
  assert.equal((await req('/api/people/p-1',{auth:a})).status,404);
});
spec('CU-05: traslado único y revocación de acceso a ficha y archivo',async({req,login})=>{
  const auth=await login('admin'),a=await login('ana'),l=await login('luis');
  const uploaded=await req('/api/people/p-4/documents',{method:'POST',auth:a,data:{name:'prueba.pdf',base64:PDF,type:'birth',owner:'participant',version:1}});
  assert.equal(uploaded.status,201,JSON.stringify(uploaded.value));
  const p=(await req('/api/people',{auth})).value.find(p=>p.id==='p-4');
  assert.equal((await req('/api/people/p-4/group',{method:'PUT',auth,data:{groupId:'g-second',version:p.version}})).status,200);
  assert.equal((await req('/api/people/p-4',{auth:a})).status,404);
  assert.equal((await req(`/api/files/${uploaded.value.id}`,{auth:a})).status,404);
  assert.equal((await req(`/api/files/${uploaded.value.id}`,{auth:l})).status,200);
  assert.equal((await req('/api/people',{auth})).value.filter(p=>p.id==='p-4').length,1);
});
spec('CU-06: alta mínima incompleta, grupo obligatorio y duplicado explícito',async({req,login})=>{
  const auth=await login('admin');const data={firstName:'Prueba',lastName:'Nueva',groupId:'g-conf'};
  const r=await req('/api/people',{method:'POST',auth,data});assert.equal(r.status,201);
  assert.equal((await req('/api/people',{method:'POST',auth,data})).status,409);
  assert.equal((await req('/api/people',{method:'POST',auth,data:{...data,allowDuplicate:true}})).status,201);
  assert.equal((await req('/api/people',{method:'POST',auth,data:{...data,groupId:'desconocido'}})).status,400);
  const a=await login();const p=(await req(`/api/people/${r.value.id}`,{auth:a})).value;
  assert.equal(p.data.baptism,'unknown');assert.equal(p.documents.length,0);
});
spec('CU-08: editar y leer, sin sobreescritura simultánea',async({req,login})=>{
  const auth=await login();const p=(await req('/api/people/p-1',{auth})).value;
  const payload=updatePerson(p,{city:'Localidad de prueba'});
  assert.equal((await req('/api/people/p-1',{method:'PUT',data:payload,auth})).status,200);
  assert.equal((await req('/api/people/p-1',{method:'PUT',data:payload,auth})).status,409);
  assert.equal((await req('/api/people/p-1',{auth})).value.data.city,'Localidad de prueba');
});
spec('CU-08: lector no edita, catequista no cambia grupo ni privilegios',async({req,login})=>{
  const reader=await login('consulta'),a=await login();const p=(await req('/api/people/p-1',{auth:a})).value;
  assert.equal((await req('/api/people/p-1',{method:'PUT',auth:reader,data:updatePerson(p)})).status,403);
  assert.equal((await req('/api/people/p-1/group',{method:'PUT',auth:a,data:{groupId:'g-second',version:1}})).status,403);
  assert.equal((await req('/api/people/p-1',{method:'PUT',auth:a,data:{...updatePerson(p),groupId:'g-second'}})).status,400);
  assert.equal((await req('/api/people/p-1',{method:'PUT',auth:a,data:updatePerson(p,{email:'correo incorrecto'})})).status,400);
});
spec('CU-09: subir foto y proteger su acceso',async({req,login})=>{
  const a=await login(),admin=await login('admin');
  const r=await req('/api/people/p-1/photo',{method:'POST',auth:a,data:{name:'foto.png',base64:PNG,version:1}});assert.equal(r.status,201,JSON.stringify(r.value));
  assert.equal((await req('/api/people/p-1',{auth:a})).value.photoId,r.value.id);
  const f=await req(`/api/files/${r.value.id}`,{auth:a});assert.equal(f.headers.get('content-type'),'image/png');assert.equal(f.headers.get('cache-control'),'no-store');
  assert.equal((await req(`/api/files/${r.value.id}`,{auth:admin})).status,404);
  assert.equal((await req(`/api/files/${r.value.id}`)).status,401);
});
spec('CU-09: SVG, HTML renombrado y foto de tamaño excesivo se rechazan',async({req,login})=>{
  const auth=await login();
  for(const content of ['<svg onload="alert(1)"></svg>','<html>prueba</html>'])assert.equal((await req('/api/people/p-1/photo',{method:'POST',auth,data:{name:'foto.png',base64:Buffer.from(content).toString('base64'),version:1}})).status,400);
  assert.throws(()=>filePayload({name:'grande.png',base64:Buffer.alloc(2*1024*1024+1).toString('base64')},true),/2 MB/);
});
spec('CU-10: tipo/titular correctos, duplicado y padrino desconocido',async({req,login})=>{
  const auth=await login();
  const payload={name:'ejemplo.pdf',base64:PDF,type:'sponsor-confirmation',owner:'confirmationSponsor',version:1};
  const r=await req('/api/people/p-1/documents',{method:'POST',auth,data:payload});assert.equal(r.status,201,JSON.stringify(r.value));
  const p=(await req('/api/people/p-1',{auth})).value;assert.equal(p.documents[0].ownerName,'Marcos · padrino de ejemplo');
  assert.equal((await req('/api/people/p-1/documents',{method:'POST',auth,data:{...payload,version:p.version}})).status,409);
  assert.equal((await req('/api/people/p-4/documents',{method:'POST',auth,data:payload})).status,400);
  assert.equal((await req('/api/people/p-1/documents',{method:'POST',auth,data:{...payload,owner:'participant',version:p.version}})).status,400);
});
spec('CU-10: cambiar padrino no reasigna sus archivos silenciosamente',async({req,login})=>{
  const auth=await login();await req('/api/people/p-1/documents',{method:'POST',auth,data:{name:'ejemplo.pdf',base64:PDF,type:'sponsor-confirmation',owner:'confirmationSponsor',version:1}});
  const p=(await req('/api/people/p-1',{auth})).value;
  assert.equal((await req('/api/people/p-1',{method:'PUT',auth,data:updatePerson(p,{confirmationSponsor:'Otro padrino'})})).status,409);
});
spec('CU-11: consulta autorizada de PDF, lector no puede adjuntar',async({req,login})=>{
  const auth=await login(),reader=await login('consulta');const data={name:'ejemplo.pdf',base64:PDF,type:'baptism',owner:'participant',version:1};
  const r=await req('/api/people/p-1/documents',{method:'POST',auth,data});assert.equal(r.status,201);
  const f=await req(`/api/files/${r.value.id}`,{auth:reader});assert.equal(f.status,200);assert.equal(f.headers.get('content-type'),'application/pdf');assert.match(f.headers.get('content-security-policy'),/sandbox/);
  assert.equal((await req('/api/people/p-1/documents',{method:'POST',auth:reader,data})).status,403);
});
spec('Transacción: asignación fallida no cambia ficha ni auditoría',async({req,login,app})=>{
  const auth=await login('admin'),before=app.store.get('SELECT COUNT(*) n FROM audit').n;
  const data={name:'Vacío',parish:'Ejemplo',day:'Lunes',startTime:'18:00',endTime:'19:00',itinerary:'confirmation',catechistIds:[]};
  const g=await req('/api/groups',{method:'POST',auth,data});assert.equal(g.status,201);
  const p=(await req('/api/people',{auth})).value.find(p=>p.id==='p-1');
  assert.equal((await req('/api/people/p-1/group',{method:'PUT',auth,data:{groupId:g.value.id,version:p.version}})).status,409);
  assert.equal((await req('/api/people',{auth})).value.find(p=>p.id==='p-1').groupId,'g-conf');
  assert.equal(app.store.get('SELECT COUNT(*) n FROM audit').n,before+1);
});
spec('Las versiones detectan cambios cruzados de asignación',async({req,login})=>{
  const auth=await login('admin');const u=(await req('/api/users',{auth})).value.find(u=>u.id==='u-ana');
  const g=(await req('/api/groups',{auth})).value.find(g=>g.id==='g-conf');
  assert.equal((await req('/api/groups/g-conf',{method:'PUT',auth,data:updateGroup(g)})).status,200);
  assert.equal((await req('/api/users/u-ana',{method:'PUT',auth,data:updateUser(u)})).status,409);
});
test('Persistencia: datos y bytes sobreviven al cierre y reapertura, sin resembrar',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'catequesis-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const dbPath=join(dir,'test.sqlite');const first=createApplication({dbPath,demo:true});
  first.store.run('UPDATE people SET last_name=? WHERE id=?','Apellido modificado','p-1');
  first.store.run('INSERT INTO files VALUES (?,?,?,?,?,?,?,?,?,?,?,?)','f-test','p-1','birth','participant','Prueba','test.pdf','application/pdf',3,'hash',Buffer.from('abc'),new Date().toISOString(),'u-ana');
  await first.close();const second=createApplication({dbPath,demo:true});
  assert.equal(second.store.get('SELECT last_name FROM people WHERE id=?','p-1').last_name,'Apellido modificado');
  assert.equal(Buffer.from(second.store.get('SELECT bytes FROM files WHERE id=?','f-test').bytes).toString(),'abc');
  assert.equal(second.store.get('SELECT COUNT(*) n FROM people').n,7);await second.close();
});
test('Validaciones: no equivale a desconocido y fechas imposibles rechazadas',()=>{
  assert.equal(personalData({}).baptism,'unknown');assert.equal(personalData({baptism:'no'}).baptism,'no');
  assert.throws(()=>personalData({birthDate:'2025-02-30'}),/fecha/);
  assert.throws(()=>personalData({role:'admin'}),/no permitidos/);
});
