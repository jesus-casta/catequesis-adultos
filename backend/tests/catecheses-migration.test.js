import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../models/store.js';

test('Migración de grupos anteriores: conserva datos y no duplica catequesis al reiniciar',t=>{
  const dir=mkdtempSync(join(tmpdir(),'catecheses-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const path=join(dir,'test.sqlite');
  const old=new DatabaseSync(path);
  old.exec(`CREATE TABLE metadata (key TEXT PRIMARY KEY,value TEXT NOT NULL);
    INSERT INTO metadata VALUES ('schema','1'),('demo','false');
    CREATE TABLE groups (id TEXT PRIMARY KEY,name TEXT NOT NULL,parish TEXT NOT NULL,day TEXT NOT NULL,start_time TEXT NOT NULL,end_time TEXT NOT NULL,itinerary TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
    INSERT INTO groups VALUES ('existing','Grupo actual','Parroquia','Lunes','18:00','19:00','confirmation',7);`);
  old.close();
  let s=openStore(path,false);
  assert.equal(s.get('SELECT * FROM groups').catechesis_id,'adults');
  assert.equal(s.get('SELECT * FROM groups').version,7);
  s.run("INSERT INTO groups (id,name,parish,day,start_time,end_time,itinerary,catechesis_id) VALUES ('new','Nuevo','San Francisco','Lunes','18:00','19:00','first-communion','san-francisco')");
  assert.throws(()=>s.run("UPDATE groups SET catechesis_id='missing' WHERE id='existing'"));
  s.db.close();s=openStore(path,false);
  assert.equal(s.get('SELECT COUNT(*) n FROM catecheses').n,2);
  assert.equal(s.get("SELECT catechesis_id FROM groups WHERE id='new'").catechesis_id,'san-francisco');
  assert.equal(s.get("SELECT name FROM groups WHERE id='existing'").name,'Grupo actual');
  s.db.close();
});

test('Migración de visualizadores: conserva el acceso una vez y no restaura permisos retirados',t=>{
  const dir=mkdtempSync(join(tmpdir(),'readers-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const path=join(dir,'test.sqlite');let s=openStore(path,true);
  s.run("DELETE FROM metadata WHERE key='reader-catecheses-v1'");
  s.run('DELETE FROM reader_catecheses');s.db.close();
  s=openStore(path,false);
  assert.deepEqual(s.publicUser(s.user('u-reader')).catechesisIds,['adults','san-francisco']);
  s.run("DELETE FROM reader_catecheses WHERE user_id='u-reader'");s.db.close();
  s=openStore(path,false);
  assert.deepEqual(s.publicUser(s.user('u-reader')).catechesisIds,[]);
  s.db.close();
});

test('Megagrupos: los nombres editados y los nuevos registros persisten al reiniciar',t=>{
  const dir=mkdtempSync(join(tmpdir(),'megagroups-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const path=join(dir,'test.sqlite');let s=openStore(path,true);
  s.run("UPDATE catecheses SET name='Nombre personalizado',version=2 WHERE id='san-francisco'");
  s.run("INSERT INTO catecheses (id,name,parish,kind) VALUES ('new','Otro megagrupo','Otra parroquia','general')");
  s.db.close();s=openStore(path,false);
  assert.equal(s.get("SELECT name FROM catecheses WHERE id='san-francisco'").name,'Nombre personalizado');
  assert.equal(s.get("SELECT version FROM catecheses WHERE id='san-francisco'").version,2);
  assert.equal(s.get('SELECT COUNT(*) n FROM catecheses').n,3);
  assert(!s.publicUser(s.user('u-reader')).catechesisIds.includes('new'));
  s.db.close();
});
