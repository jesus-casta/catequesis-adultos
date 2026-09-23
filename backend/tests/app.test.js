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
spec('CU-07: catequista limitado a sus grupos y visitante con consulta global',async({req,login})=>{
  const a=await login('ana'),r=await login('consulta');
  const ps=(await req('/api/people',{auth:a})).value;assert.equal(ps.length,5);assert(!ps.some(p=>p.groupId==='g-second'));
  assert.equal((await req('/api/people/p-6',{auth:a})).status,404);
  assert.equal((await req('/api/people',{auth:r})).value.length,7);
  assert.equal((await req('/api/groups',{auth:r})).value.length,3);
  assert.equal((await req('/api/people/p-4',{auth:r})).status,200);
  assert.equal((await req('/api/people/p-6/photo',{auth:a,method:'POST',data:{name:'foto.png',base64:PNG,version:1}})).status,404);
});
spec('Administración recibe fichas completas',async({req,login})=>{
  const auth=await login('admin');const ps=(await req('/api/people',{auth})).value;assert.equal(ps.length,7);
  assert(ps[0].data);assert(Array.isArray(ps[0].documents));
  assert.equal((await req('/api/people/p-1',{auth})).status,200);
});
spec('CU-02: altas de cuenta, sin grupo no hay fichas; duplicado rechazado',async({req,login})=>{
  const auth=await login('admin');
  const data={username:'nueva',name:'Nueva prueba',role:'catechist',active:true,password:DEMO_PASSWORD,groupIds:[]};
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
spec('Alta completa: conserva curso de comunión y contactos responsables',async({req,login})=>{
  const auth=await login('admin');
  const group={name:'Comunión · 2.º',parish:'San Francisco de Asís',day:'Miércoles',startTime:'17:00',endTime:'18:00',itinerary:'first-communion',catechesisId:'san-francisco',catechistIds:['u-luis']};
  const createdGroup=await req('/api/groups',{method:'POST',auth,data:group});assert.equal(createdGroup.status,201);
  const data={communionYear:'2',guardians:[{name:'Padre Prueba',relationship:'Padre',phone:'600000001',email:'padre@example.test',primary:false},{name:'Madre Prueba',relationship:'Madre',phone:'600000002',email:'madre@example.test',primary:false},{name:'Abuela Prueba',relationship:'Abuela',phone:'600000003',email:'abuela@example.test',primary:true}]};
  const created=await req('/api/people',{method:'POST',auth,data:{firstName:'Infantil',lastName:'Prueba',groupId:createdGroup.value.id,data}});assert.equal(created.status,201,JSON.stringify(created.value));
  const person=(await req(`/api/people/${created.value.id}`,{auth})).value;
  assert.equal(person.data.communionYear,'2');assert.equal(person.data.guardians.length,3);assert.equal(person.data.guardians[2].name,'Abuela Prueba');assert.equal(person.data.guardians[0].email,'padre@example.test');
  assert.equal((await req('/api/people',{method:'POST',auth,data:{firstName:'Correo',lastName:'Inválido',groupId:createdGroup.value.id,data:{guardians:[{name:'Tutor',email:'incorrecto'}]}}})).status,400);
  assert.throws(()=>personalData({guardians:[{name:'Uno',primary:true},{name:'Dos',primary:true}]}),/Solo un tutor/);
});
spec('Excel: previsualiza e importa fichas de forma atómica dentro del megagrupo',async({req,login,app})=>{
  const auth=await login('ana');
  const existing=(await req('/api/people/p-1',{auth})).value;
  const people=[
    {reference:'p-1',id:'p-1',firstName:existing.firstName,lastName:existing.lastName,groupId:'g-conf',data:{...existing.data,city:'Ciudad importada'}},
    {reference:'NUEVO-1',id:'',firstName:'Nueva',lastName:'Desde Excel',groupId:'g-first',data:{email:'nueva@example.test',guardians:[]}}
  ];
  const preview=await req('/api/catecheses/adults/import',{method:'POST',auth,data:{people,commit:false}});
  assert.equal(preview.status,200,JSON.stringify(preview.value));assert.deepEqual(preview.value,{total:2,created:1,updated:1,groups:2});
  assert.equal(app.store.get("SELECT json_extract(data,'$.city') city FROM people WHERE id='p-1'").city,'Ciudad de ejemplo');
  const imported=await req('/api/catecheses/adults/import',{method:'POST',auth,data:{people,commit:true}});
  assert.equal(imported.status,200,JSON.stringify(imported.value));assert.equal(app.store.get("SELECT json_extract(data,'$.city') city FROM people WHERE id='p-1'").city,'Ciudad importada');
  assert.equal(app.store.get("SELECT COUNT(*) n FROM people WHERE first_name='Nueva' AND last_name='Desde Excel'").n,1);
});
spec('Excel: respeta permisos y no aplica parcialmente un archivo inválido',async({req,login,app})=>{
  const catechist=await login('ana'),reader=await login('consulta');
  const valid={reference:'NUEVO-1',id:'',firstName:'Primera',lastName:'Válida',groupId:'g-conf',data:{}};
  const outside={reference:'NUEVO-2',id:'',firstName:'Fuera',lastName:'De ámbito',groupId:'g-second',data:{}};
  assert.equal((await req('/api/catecheses/adults/import',{method:'POST',auth:reader,data:{people:[valid],commit:false}})).status,403);
  assert.equal((await req('/api/catecheses/adults/import',{method:'POST',auth:catechist,data:{people:[valid,outside],commit:true}})).status,403);
  assert.equal(app.store.get("SELECT COUNT(*) n FROM people WHERE last_name='Válida'").n,0);
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
  assert.equal((await req(`/api/files/${r.value.id}`,{auth:admin})).status,200);
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

spec('Contacto de catequistas: guardar, consultar por grupo y conservar campos omitidos',async({req,login})=>{
  const auth=await login('admin');
  let users=(await req('/api/users',{auth})).value;
  let ana=users.find(u=>u.username==='ana');
  const contact={phone:'+34 600 123 456',email:'catequista@example.org'};
  assert.equal((await req(`/api/users/${ana.id}`,{auth,method:'PUT',data:updateUser(ana,contact)})).status,200);
  ana=(await req('/api/users',{auth})).value.find(u=>u.id===ana.id);
  assert.equal(ana.phone,contact.phone);assert.equal(ana.email,contact.email);
  assert.equal((await req(`/api/users/${ana.id}`,{auth,method:'PUT',data:updateUser(ana)})).status,200);
  const catechist=await login('ana');
  const groups=(await req('/api/groups',{auth:catechist})).value;
  const shown=groups.flatMap(g=>g.catechists).find(u=>u.id===ana.id);
  assert.equal(shown.email,contact.email);assert.equal(shown.phone,contact.phone);
  assert.equal(shown.password_hash,undefined);
  assert.equal((await req('/api/users',{auth:catechist})).status,403);
  ana=(await req('/api/users',{auth})).value.find(u=>u.id===ana.id);
  assert.equal((await req(`/api/users/${ana.id}`,{auth,method:'PUT',data:updateUser(ana,{email:'incorrecto'})})).status,400);
});

spec('Fotos de catequista: administración guarda, ámbito limita consulta y versión evita sobrescrituras',async({req,login})=>{
  const auth=await login('admin');
  const ana=(await req('/api/users',{auth})).value.find(u=>u.username==='ana');
  const path=`/api/users/${ana.id}/photo`;
  const payload={name:'foto.png',base64:PNG,version:ana.version};
  assert.equal((await req(path,{method:'POST',auth,data:{...payload,base64:PDF}})).status,400);
  assert.equal((await req(path,{method:'POST',auth,data:payload})).status,201);
  assert.equal((await req(path,{method:'POST',auth,data:payload})).status,409);
  const updated=(await req('/api/users',{auth})).value.find(u=>u.id===ana.id);
  assert.equal(updated.hasPhoto,true);
  const photo=await req(path,{auth});assert.equal(photo.status,200);assert.equal(photo.value.toString('base64'),PNG);
  const catechist=await login('ana');
  assert.equal((await req(path,{auth:catechist})).status,200);
  assert.equal((await req(path,{method:'POST',auth:catechist,data:payload})).status,403);
  assert.equal((await req(path)).status,401);
  assert.equal((await req('/api/users',{auth,method:'POST',data:{username:'sinambito',name:'Sin ámbito',role:'reader',active:true,password:DEMO_PASSWORD,groupIds:[]}})).status,201);
  const reader=await login('sinambito');
  assert.equal((await req(path,{auth:reader})).status,404);
});
spec('Administración sube foto de catecúmeno y recibe datos completos',async({req,login})=>{
  const auth=await login('admin');
  const payload={name:'foto.png',base64:PNG,version:1};
  const result=await req('/api/people/p-1/photo',{auth,method:'POST',data:payload});assert.equal(result.status,201);
  const person=(await req('/api/people',{auth})).value.find(p=>p.id==='p-1');assert.equal(person.photoId,result.value.id);assert(person.data);
  assert.equal((await req(`/api/files/${result.value.id}`,{auth})).status,200);
  assert.equal((await req('/api/people/p-1/documents',{auth,method:'POST',data:{...payload,version:person.version}})).status,400);
});

spec('Visitante consulta también grupos nuevos y sus documentos sin poder modificarlos',async({req,login})=>{
  const auth=await login('admin'),visitor=await login('consulta'),catechist=await login('ana');
  const base=(await req('/api/groups',{auth})).value[0];
  const created=await req('/api/groups',{auth,method:'POST',data:{...updateGroup(base),name:'Grupo nuevo',catechistIds:['u-ana']}});
  assert.equal(created.status,201);
  assert((await req('/api/groups',{auth:visitor})).value.some(g=>g.id===created.value.id));
  const person=await req('/api/people',{auth,method:'POST',data:{firstName:'Nueva',lastName:'Persona',groupId:created.value.id}});assert.equal(person.status,201);
  const path=`/api/people/${person.value.id}`;
  assert.equal((await req(path,{auth:visitor})).status,200);
  const upload={name:'documento.pdf',base64:PDF,type:'birth',owner:'participant',version:1};
  const file=await req(`${path}/documents`,{auth:catechist,method:'POST',data:upload});assert.equal(file.status,201);
  assert.equal((await req(`/api/files/${file.value.id}`,{auth:visitor})).status,200);
  assert.equal((await req(`${path}/documents`,{auth:visitor,method:'POST',data:upload})).status,403);
  assert.equal((await req(`${path}/photo`,{auth:visitor,method:'POST',data:{name:'foto.png',base64:PNG,version:2}})).status,403);
  assert.equal((await req('/api/groups',{auth:visitor,method:'POST',data:updateGroup(base)})).status,403);
});

spec('Administración edita datos personales, sacramentales y familiares y adjunta documentos',async({req,login})=>{
  const auth=await login('admin');
  let p=(await req('/api/people/p-6',{auth})).value;
  const result=await req('/api/people/p-6',{auth,method:'PUT',data:updatePerson(p,{phone:'600123456',email:'persona@example.org',father:'Padre',confirmation:'yes'})});assert.equal(result.status,200);
  p=(await req('/api/people/p-6',{auth})).value;
  assert.equal(p.data.email,'persona@example.org');assert.equal(p.data.father,'Padre');assert.equal(p.data.confirmation,'yes');
  const file=await req('/api/people/p-6/documents',{auth,method:'POST',data:{name:'certificado.pdf',base64:PDF,type:'birth',owner:'participant',version:p.version}});assert.equal(file.status,201);
  assert.equal((await req(`/api/files/${file.value.id}`,{auth})).status,200);
  assert((await req('/api/people/p-6',{auth})).value.documents.some(d=>d.id===file.value.id));
});

spec('Administrador también catequista: ficha, foto, asignación y protección del último catequista',async({req,login})=>{
  const auth=await login('admin');
  let adminUser=(await req('/api/users',{auth})).value.find(u=>u.username==='admin');
  assert.equal((await req(`/api/users/${adminUser.id}`,{auth,method:'PUT',data:updateUser(adminUser,{isCatechist:true,groupIds:['g-conf']})})).status,200);
  adminUser=(await req('/api/users',{auth})).value.find(u=>u.id===adminUser.id);
  assert.equal(adminUser.role,'admin');assert.equal(adminUser.isCatechist,true);
  let group=(await req('/api/groups',{auth})).value.find(g=>g.id==='g-conf');
  assert(group.catechists.some(u=>u.id===adminUser.id));
  assert.equal((await req('/api/groups/g-conf',{auth,method:'PUT',data:updateGroup(group,{catechistIds:[adminUser.id]})})).status,200);
  adminUser=(await req('/api/users',{auth})).value.find(u=>u.id===adminUser.id);
  assert.equal((await req(`/api/users/${adminUser.id}/photo`,{auth,method:'POST',data:{name:'foto.png',base64:PNG,version:adminUser.version}})).status,201);
  assert.equal((await req(`/api/users/${adminUser.id}/photo`,{auth})).status,200);
  adminUser=(await req('/api/users',{auth})).value.find(u=>u.id===adminUser.id);
  assert.equal((await req(`/api/users/${adminUser.id}`,{auth,method:'PUT',data:updateUser(adminUser,{isCatechist:false,groupIds:[]})})).status,409);
  assert.equal((await req('/api/people/p-6',{auth})).status,200);
  group=(await req('/api/groups',{auth})).value.find(g=>g.id==='g-conf');
  assert.equal((await req('/api/groups/g-conf',{auth,method:'PUT',data:updateGroup(group,{catechistIds:['u-ana']})})).status,200);
  group=(await req('/api/groups',{auth})).value.find(g=>g.id==='g-conf');
  assert(!group.catechists.some(u=>u.id===adminUser.id));
});

spec('Visualizador es exclusivo: se rechaza combinarlo con catequista',async({req,login})=>{
 const auth=await login('admin');
 const reader=(await req('/api/users',{auth})).value.find(u=>u.role==='reader');
 assert.equal((await req(`/api/users/${reader.id}`,{auth,method:'PUT',data:updateUser(reader,{isCatechist:true})})).status,400);
 const saved=(await req('/api/users',{auth})).value.find(u=>u.id===reader.id);
 assert.equal(saved.role,'reader');assert.equal(saved.isCatechist,false);
});

test('Recuperación: respuesta privada, enlace único y revocación de sesiones',async t=>{
  const messages=[];
  const {app,req,login}=await fixture(t,{sendPasswordReset:async message=>messages.push(message)});
  app.store.run('UPDATE users SET email=? WHERE id=?','ana@example.org','u-ana');
  const auth=await login();
  const request=username=>req('/api/forgot-password',{method:'POST',data:{username}});
  const known=await request('ana'),unknown=await request('desconocido');
  assert.equal(known.status,200);assert.deepEqual(known.value,unknown.value);assert.equal(messages.length,1);
  const token=new URL(messages[0].url).hash.split('=')[1];
  assert.equal(messages[0].to,'ana@example.org');
  assert.notEqual(app.store.get('SELECT token_hash FROM password_resets').token_hash,token);
  const reset=password=>req('/api/reset-password',{method:'POST',data:{token,password}});
  assert.equal((await reset('corta')).status,400);
  assert.equal((await reset('Nueva-clave-segura-2026!')).status,200);
  assert.equal((await req('/api/session',{auth})).status,401);
  assert.equal((await reset('Otra-clave-segura-2026!')).status,400);
  assert.equal((await req('/api/login',{method:'POST',data:{username:'ana',password:DEMO_PASSWORD}})).status,401);
  assert.equal((await req('/api/login',{method:'POST',data:{username:'ana',password:'Nueva-clave-segura-2026!'}})).status,200);
});

test('Recuperación: caducidad, cuenta desactivada y límite de solicitudes',async t=>{
  let clock=Date.now();const messages=[];
  const {app,req}=await fixture(t,{now:()=>clock,sendPasswordReset:async message=>messages.push(message)});
  app.store.run('UPDATE users SET email=? WHERE id=?','ana@example.org','u-ana');
  const request=()=>req('/api/forgot-password',{method:'POST',data:{username:'ana'}});
  const reset=()=>req('/api/reset-password',{method:'POST',data:{token:new URL(messages.at(-1).url).hash.split('=')[1],password:'Nueva-clave-segura-2026!'}});
  await request();clock+=30*60*1000;assert.equal((await reset()).status,400);
  await request();app.store.run('UPDATE users SET active=0 WHERE id=?','u-ana');assert.equal((await reset()).status,400);
  clock+=300001;
  for(let i=0;i<8;i++)assert.equal((await request()).status,200);
  assert.equal(messages.length,2);assert.equal((await request()).status,429);
});

test('Recuperación: transporte ausente y fallo sin revelar la cuenta',async t=>{
  const {req}=await fixture(t,{sendPasswordReset:null});
  assert.equal((await req('/api/forgot-password',{method:'POST',data:{username:'ana'}})).status,503);
  const failing=await fixture(t,{sendPasswordReset:async()=>{throw new Error('mail unavailable');}});
  failing.app.store.run('UPDATE users SET email=? WHERE id=?','ana@example.org','u-ana');
  assert.equal((await failing.req('/api/forgot-password',{method:'POST',data:{username:'ana'}})).status,200);
  assert.equal(failing.app.store.get('SELECT COUNT(*) n FROM password_resets').n,0);
});

spec('Catequesis: existentes en adultos, San Francisco vacío y acceso por ámbito',async({req,login})=>{
  const admin=await login('admin');
  const cs=(await req('/api/catecheses',{auth:admin})).value;
  assert.equal(cs.length,2);assert.equal(cs.find(c=>c.id==='adults').groupCount,3);
  assert.equal(cs.find(c=>c.id==='san-francisco').groupCount,0);
  assert((await req('/api/groups',{auth:admin})).value.every(g=>g.catechesisId==='adults'));
  const catechist=await login('ana');
  assert.deepEqual((await req('/api/catecheses',{auth:catechist})).value.map(c=>c.id),['adults']);
  assert.equal((await req('/api/catecheses')).status,401);
});

spec('Catequesis: crear grupos de comunión sin ampliar permisos ni cambiar grupos anteriores',async({req,login})=>{
  const auth=await login('admin'),ana=await login('ana');
  const data={name:'Primera Comunión · 1.º A',parish:'San Francisco de Asís',day:'Sábado',startTime:'10:00',endTime:'11:00',itinerary:'first-communion',catechesisId:'san-francisco',catechistIds:['u-luis']};
  assert.equal((await req('/api/groups',{method:'POST',auth:ana,data})).status,403);
  assert.equal((await req('/api/groups',{method:'POST',auth,data:{...data,catechesisId:'missing'}})).status,400);
  assert.equal((await req('/api/groups',{method:'POST',auth,data:{...data,itinerary:'confirmation'}})).status,400);
  const created=await req('/api/groups',{method:'POST',auth,data});assert.equal(created.status,201);
  const id=created.value.id;
  const person=await req('/api/people',{method:'POST',auth,data:{firstName:'Comunión',lastName:'Prueba',groupId:id}});assert.equal(person.status,201);
  assert.equal((await req(`/api/people/${person.value.id}`,{auth:ana})).status,404);
  assert(!(await req('/api/groups',{auth:ana})).value.some(g=>g.id===id));
  const luis=await login('luis');
  assert.equal((await req(`/api/people/${person.value.id}`,{auth:luis})).status,200);
  assert.equal((await req('/api/catecheses',{auth:luis})).value.length,2);
  const visitor=await login('consulta');assert.equal((await req('/api/catecheses',{auth:visitor})).value.length,2);
  const current=(await req('/api/groups',{auth})).value.find(g=>g.id===id);
  assert.equal((await req(`/api/groups/${id}`,{method:'PUT',auth,data:{...data,version:current.version,name:'Primera Comunión · 1.º B'}})).status,200);
  assert.equal((await req(`/api/groups/${id}`,{method:'PUT',auth,data:{...data,version:current.version+1,catechesisId:'adults',itinerary:'confirmation'}})).status,400);
  assert.equal((await req('/api/groups',{auth})).value.find(g=>g.id===id).catechesisId,'san-francisco');
});

spec('Visualizador: uno o varios megagrupos, archivos protegidos y retirada inmediata',async({req,login,app})=>{
  const auth=await login('admin');
  const created=await req('/api/groups',{auth,method:'POST',data:{name:'Comunión A',parish:'San Francisco',day:'Lunes',startTime:'18:00',endTime:'19:00',itinerary:'first-communion',catechesisId:'san-francisco',catechistIds:['u-luis']}});
  assert.equal(created.status,201);
  const person=await req('/api/people',{auth,method:'POST',data:{firstName:'Prueba',lastName:'Comunión',groupId:created.value.id}});
  const path=`/api/people/${person.value.id}`;
  const doc=await req(`${path}/documents`,{auth,method:'POST',data:{name:'documento.pdf',base64:PDF,type:'birth',owner:'participant',version:1}});
  const photo=await req(`${path}/photo`,{auth,method:'POST',data:{name:'foto.png',base64:PNG,version:2}});
  assert.equal(doc.status,201);assert.equal(photo.status,201);
  const newReader=await req('/api/users',{auth,method:'POST',data:{username:'limited',name:'Consulta limitada',role:'reader',active:true,password:DEMO_PASSWORD,groupIds:[],catechesisIds:['adults']}});
  assert.equal(newReader.status,201);
  const visitor=await login('limited');
  const change=async catechesisIds=>{
    const user=(await req('/api/users',{auth})).value.find(u=>u.id===newReader.value.id);
    return req(`/api/users/${user.id}`,{auth,method:'PUT',data:{...updateUser(user),catechesisIds}});
  };
  assert.deepEqual((await req('/api/catecheses',{auth:visitor})).value.map(c=>c.id),['adults']);
  assert.equal((await req(path,{auth:visitor})).status,404);
  assert.equal((await req(`/api/files/${doc.value.id}`,{auth:visitor})).status,404);
  assert.equal((await change(['adults','san-francisco'])).status,200);
  assert.equal((await req('/api/catecheses',{auth:visitor})).value.length,2);
  assert.equal((await req(path,{auth:visitor})).status,200);
  assert.equal((await req(`/api/files/${doc.value.id}`,{auth:visitor})).status,200);
  assert.equal((await req(`/api/files/${photo.value.id}`,{auth:visitor})).status,200);
  assert.equal((await req(`${path}/documents`,{auth:visitor,method:'POST',data:{}})).status,403);
  assert.equal((await change(['missing'])).status,400);
  assert.equal((await change(['san-francisco'])).status,200);
  assert.equal((await req('/api/people/p-1',{auth:visitor})).status,404);
  assert.deepEqual((await req('/api/groups',{auth:visitor})).value.map(g=>g.id),[created.value.id]);
  assert.equal((await change([])).status,200);
  assert.deepEqual((await req('/api/people',{auth:visitor})).value,[]);
  assert.deepEqual((await req('/api/catecheses',{auth:visitor})).value,[]);
  assert.equal((await req(`/api/files/${doc.value.id}`,{auth:visitor})).status,404);
  assert.equal((await req(`/api/files/${photo.value.id}`,{auth:visitor})).status,404);
  assert.equal((await req('/api/users/u-luis/photo',{auth:visitor})).status,404);
  assert.equal(app.store.publicUser(app.store.user(newReader.value.id)).catechesisIds.length,0);
});

spec('Megagrupos: administración crea y edita, sin conceder acceso implícito',async({req,login})=>{
  const auth=await login('admin'),reader=await login('consulta'),catechist=await login('ana');
  const data={name:'Catequesis de otra parroquia',parish:'Santa María',kind:'general'};
  for(const user of [reader,catechist])assert.equal((await req('/api/catecheses',{auth:user,method:'POST',data})).status,403);
  assert.equal((await req('/api/catecheses',{auth,method:'POST',data:{...data,name:' '}})).status,400);
  const created=await req('/api/catecheses',{auth,method:'POST',data});assert.equal(created.status,201);
  const id=created.value.id;
  assert(!(await req('/api/catecheses',{auth:reader})).value.some(c=>c.id===id));
  const original=(await req('/api/catecheses',{auth})).value.find(c=>c.id===id);
  assert.equal((await req(`/api/catecheses/${id}`,{auth,method:'PUT',data:{...data,name:'Santa María — Catequesis',version:original.version}})).status,200);
  assert.equal((await req(`/api/catecheses/${id}`,{auth,method:'PUT',data:{...data,version:original.version}})).status,409);
  assert.equal((await req(`/api/catecheses/${id}`,{auth:reader,method:'PUT',data:{...data,version:2}})).status,403);
  const group={name:'Comunión',parish:'Santa María',day:'Lunes',startTime:'18:00',endTime:'19:00',itinerary:'first-communion',catechesisId:id,catechistIds:[]};
  assert.equal((await req('/api/groups',{auth,method:'POST',data:group})).status,201);
  assert.equal((await req('/api/groups',{auth,method:'POST',data:{...group,name:'Confirmación',itinerary:'confirmation'}})).status,201);
  assert.equal((await req(`/api/catecheses/${id}`,{auth,method:'PUT',data:{...data,kind:'adults',version:2}})).status,409);
  const changed=(await req('/api/catecheses',{auth})).value.find(c=>c.id===id);
  assert.equal(changed.name,'Santa María — Catequesis');assert.equal(changed.groupCount,2);
});

spec('Borrado de fichas: solo admin, confirmación, versión y eliminación de archivos',async({app,req,login})=>{
  const auth=await login('admin'),catechist=await login('ana'),reader=await login('consulta');
  let p=(await req('/api/people/p-1',{auth})).value;
  const confirmation=`${p.firstName} ${p.lastName}`;
  for(const denied of [catechist,reader])assert.equal((await req('/api/people/p-1',{method:'DELETE',auth:denied,data:{version:p.version,confirmation}})).status,403);
  assert.equal((await req('/api/people/p-1',{method:'DELETE',auth,data:{version:p.version,confirmation:'otro nombre'}})).status,400);
  const file=await req('/api/people/p-1/documents',{method:'POST',auth,data:{name:'bautismo.pdf',base64:PDF,type:'baptism',owner:'participant',version:p.version}});
  assert.equal(file.status,201);
  assert.equal((await req('/api/people/p-1',{method:'DELETE',auth,data:{version:p.version,confirmation}})).status,409);
  p=(await req('/api/people/p-1',{auth})).value;
  assert.equal((await req('/api/people/p-1/photo',{method:'POST',auth,data:{name:'foto.png',base64:PNG,version:p.version}})).status,201);
  p=(await req('/api/people/p-1',{auth})).value;
  assert.equal((await req('/api/people/p-1',{method:'DELETE',auth,data:{version:p.version,confirmation},headers:{'X-CSRF-Token':'incorrecto'}})).status,403);
  assert.equal((await req('/api/people/p-1',{method:'DELETE',auth,data:{version:p.version,confirmation}})).status,200);
  assert.equal((await req('/api/people/p-1',{auth})).status,404);
  assert.equal((await req(`/api/files/${file.value.id}`,{auth})).status,404);
  assert.equal(app.store.get('SELECT count(*) n FROM files WHERE person_id=?','p-1').n,0);
  assert.equal(app.store.get("SELECT count(*) n FROM audit WHERE action='person.delete' AND entity_id='p-1'").n,1);
  assert.equal((await req('/api/people/p-2',{auth})).status,200);
  assert.equal((await req('/api/people/p-1',{method:'DELETE',auth,data:{version:p.version,confirmation}})).status,404);
});

spec('Borrado de grupos: impide borrar con personas, limpia asignaciones y conserva usuarios',async({app,req,login})=>{
  const auth=await login('admin'),catechist=await login('ana'),reader=await login('consulta');
  const occupied=(await req('/api/groups',{auth})).value.find(g=>g.id==='g-conf');
  assert.equal((await req('/api/groups/g-conf',{method:'DELETE',auth,data:{version:occupied.version,confirmation:occupied.name}})).status,409);
  assert.equal(app.store.get("SELECT count(*) n FROM people WHERE group_id='g-conf'").n,3);
  const created=await req('/api/groups',{method:'POST',auth,data:{name:'Grupo para borrar',parish:'Ejemplo',day:'Lunes',startTime:'17:00',endTime:'18:00',itinerary:'confirmation',catechesisId:'adults',catechistIds:['u-ana']}});
  assert.equal(created.status,201);
  const id=created.value.id,g=(await req('/api/groups',{auth})).value.find(g=>g.id===id),data={version:g.version,confirmation:g.name};
  for(const denied of [catechist,reader])assert.equal((await req(`/api/groups/${id}`,{method:'DELETE',auth:denied,data})).status,403);
  assert.equal((await req(`/api/groups/${id}`,{method:'DELETE',auth,data:{...data,confirmation:'otro'}})).status,400);
  assert.equal((await req(`/api/groups/${id}`,{method:'DELETE',auth,data:{...data,version:0}})).status,409);
  const before=app.store.user('u-ana').version;
  assert.equal((await req(`/api/groups/${id}`,{method:'DELETE',auth,data})).status,200);
  assert.equal(app.store.get('SELECT id FROM groups WHERE id=?',id),undefined);
  assert.equal(app.store.get('SELECT count(*) n FROM scopes WHERE group_id=?',id).n,0);
  assert.equal(app.store.user('u-ana').version,before+1);
  assert.equal(app.store.get("SELECT count(*) n FROM audit WHERE action='group.delete' AND entity_id=?",id).n,1);
  assert.equal((await req(`/api/groups/${id}`,{method:'DELETE',auth,data})).status,404);
});

spec('Orden de grupos: guarda el orden completo, respeta permisos y rechaza conflictos',async({req,login,app})=>{
  const auth=await login('admin'),catechist=await login('ana'),reader=await login('consulta');
  const original=(await req('/api/groups',{auth})).value;
  const reversed=[...original].reverse();
  const data={catechesisId:'adults',groups:reversed.map(({id,version})=>({id,version}))};
  for(const restricted of [catechist,reader])assert.equal((await req('/api/groups/order',{auth:restricted,method:'PUT',data})).status,403);
  assert.equal((await req('/api/groups/order',{auth,method:'PUT',data:{...data,groups:[data.groups[0],data.groups[0],data.groups[2]]}})).status,409);
  assert.equal((await req('/api/groups/order',{auth,method:'PUT',data:{...data,groups:data.groups.slice(1)}})).status,409);
  assert.equal((await req('/api/groups/order',{auth,method:'PUT',data:{...data,catechesisId:'san-francisco'}})).status,409);
  assert.equal((await req('/api/groups/order',{auth,method:'PUT',data:{...data,groups:[null]}})).status,400);
  assert.deepEqual((await req('/api/groups',{auth})).value.map(g=>g.id),original.map(g=>g.id));
  assert.equal((await req('/api/groups/order',{auth,method:'PUT',data})).status,200);
  const updated=(await req('/api/groups',{auth})).value;
  assert.deepEqual(updated.map(g=>g.id),reversed.map(g=>g.id));
  assert(updated.every(g=>g.version===original.find(old=>old.id===g.id).version+1));
  assert.deepEqual((await req('/api/groups',{auth:reader})).value.map(g=>g.id),reversed.map(g=>g.id));
  const positions=app.store.all('SELECT id,sort_position,version FROM groups ORDER BY sort_position');
  assert.equal((await req('/api/groups/order',{auth,method:'PUT',data})).status,409);
  assert.deepEqual(app.store.all('SELECT id,sort_position,version FROM groups ORDER BY sort_position'),positions);
  assert.equal(app.store.get("SELECT COUNT(*) n FROM audit WHERE action='groups.reorder'").n,1);
});

spec('Traslado por arrastre: solo administración, versión vigente y datos conservados',async({req,login})=>{
  const auth=await login('admin'),catechist=await login('ana');
  const before=(await req('/api/people/p-4',{auth})).value;
  const data={groupId:'g-second',version:before.version};
  assert.equal((await req('/api/people/p-4/group',{auth:catechist,method:'PUT',data})).status,403);
  assert.equal((await req('/api/people/p-4/group',{auth,method:'PUT',data})).status,200);
  const after=(await req('/api/people/p-4',{auth})).value;
  assert.equal(after.groupId,'g-second');assert.deepEqual(after.data,before.data);assert.deepEqual(after.documents,before.documents);
  assert.equal((await req('/api/people/p-4/group',{auth,method:'PUT',data:{...data,groupId:before.groupId}})).status,409);
  assert.equal((await req('/api/people/p-4',{auth})).value.groupId,'g-second');
});
