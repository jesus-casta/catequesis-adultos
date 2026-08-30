import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApplication } from '../app.js';

test('Interfaz compilada: HTML, CSP con nonce, JavaScript y CSS servidos por Node',async t=>{
  const staticRoot=fileURLToPath(new URL('../../dist/client/',import.meta.url));
  assert(existsSync(`${staticRoot}/index.html`),'Ejecuta npm run build antes de esta comprobación.');
  const app=createApplication({dbPath:':memory:',demo:true,staticRoot});t.after(()=>app.close());
  await new Promise(ok=>app.server.listen(0,'127.0.0.1',ok));
  const origin=`http://127.0.0.1:${app.server.address().port}`;
  const res=await fetch(origin);assert.equal(res.status,200);
  const html=await res.text();assert.match(html,/<title>Catequesis de adultos<\/title>/);assert.match(html,/lang="es"/);assert(!html.includes('Starter Project'));
  const nonce=res.headers.get('content-security-policy').match(/nonce-([^']+)/)[1];
  for(const script of html.matchAll(/<script\b[^>]*>/g))assert(script[0].includes(`nonce="${nonce}"`));
  const assets=new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)].map(m=>m[1]));assert(assets.size>=2);
  for(const path of assets){const a=await fetch(origin+path);assert.equal(a.status,200,path);assert((await a.arrayBuffer()).byteLength>0);}
  assert.equal((await fetch(origin+'/local-data/catequesis.sqlite')).status,404);
  assert.equal((await fetch(origin+'/api/people')).status,401);
});
