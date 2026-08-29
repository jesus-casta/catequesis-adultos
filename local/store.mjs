import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { fail, personalData } from './validation.mjs';

export const DEMO_PASSWORD = 'Catequesis-demo-2026!';
export const hash = value => createHash('sha256').update(value).digest('hex');
export function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function checkPassword(password, encoded) {
  const [salt, expected] = encoded.split(':');
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
export function openStore(path, demo) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  if (path !== ':memory:') chmodSync(path, 0o600);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = DELETE;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','catechist','reader')),
      active INTEGER NOT NULL DEFAULT 1, password_hash TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, parish TEXT NOT NULL, day TEXT NOT NULL,
      start_time TEXT NOT NULL, end_time TEXT NOT NULL, itinerary TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS scopes (
      user_id TEXT NOT NULL REFERENCES users(id), group_id TEXT NOT NULL REFERENCES groups(id),
      PRIMARY KEY(user_id, group_id)
    );
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
      group_id TEXT NOT NULL REFERENCES groups(id), data TEXT NOT NULL,
      photo_id TEXT, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS people_group ON people(group_id);
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id), type TEXT NOT NULL,
      owner TEXT NOT NULL, owner_name TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL,
      size INTEGER NOT NULL, digest TEXT NOT NULL, bytes BLOB NOT NULL, created_at TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS files_person ON files(person_id);
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit (
      id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, entity_id TEXT NOT NULL, created_at TEXT NOT NULL
    );
  `);
  const store = {
    db,
    get(sql, ...params) { return db.prepare(sql).get(...params); },
    all(sql, ...params) { return db.prepare(sql).all(...params); },
    run(sql, ...params) { return db.prepare(sql).run(...params); },
    transaction(fn) {
      db.exec('BEGIN IMMEDIATE');
      try { const result = fn(); db.exec('COMMIT'); return result; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    audit(actor, action, entity) { this.run('INSERT INTO audit VALUES (?, ?, ?, ?, ?)', randomUUID(), actor, action, entity, new Date().toISOString()); },
    user(id) { return this.get('SELECT * FROM users WHERE id = ?', id); },
    publicUser(u) { return { id:u.id, username:u.username, name:u.name, role:u.role, active:!!u.active, version:u.version, groupIds:this.all('SELECT group_id FROM scopes WHERE user_id = ?',u.id).map(g=>g.group_id) }; },
    canRead(u, groupId) { return u.role !== 'admin' && !!this.get('SELECT 1 FROM scopes WHERE user_id = ? AND group_id = ?',u.id,groupId); },
    person(u, id, edit = false) {
      const p = this.get('SELECT * FROM people WHERE id = ?', id);
      if (!p || !this.canRead(u, p.group_id)) fail(404, 'Ficha no disponible en tu ámbito.');
      if (edit && u.role !== 'catechist') fail(403, 'Tu perfil solo permite consultar.');
      return p;
    },
    presentPerson(p, admin = false) {
      const base = {id:p.id, firstName:p.first_name,lastName:p.last_name,groupId:p.group_id,version:p.version};
      if (admin) return base;
      return {...base,data:JSON.parse(p.data),photoId:p.photo_id,updatedAt:p.updated_at,documents:this.all('SELECT id, type, owner, owner_name AS ownerName, name, mime, size, created_at AS createdAt FROM files WHERE person_id = ? AND type <> ? ORDER BY created_at DESC',p.id,'photo')};
    },
    ensureStaffed() {
      const row = this.get(`SELECT g.id FROM groups g WHERE EXISTS(SELECT 1 FROM people p WHERE p.group_id=g.id)
        AND NOT EXISTS(SELECT 1 FROM scopes s JOIN users u ON u.id=s.user_id WHERE s.group_id=g.id AND u.role='catechist' AND u.active=1)`);
      if (row) fail(409, 'Un grupo con personas no puede quedar sin catequista activo. Asigna un sustituto primero.');
    }
  };
  if (!store.get('SELECT 1 FROM metadata WHERE key = ?', 'schema')) {
    if (!demo) { db.close(); fail(400, 'Primera versión de demostración: arranca con --demo.'); }
    seedDemo(store);
  }
  if (store.get('SELECT value FROM metadata WHERE key = ?', 'schema').value !== '1') fail(500, 'Versión de datos no compatible. No se han modificado tus registros.');
  return store;
}

function seedDemo(s) {
  s.transaction(() => {
    s.run('INSERT INTO metadata VALUES (?, ?)', 'schema', '1');
    s.run('INSERT INTO metadata VALUES (?, ?)', 'demo', 'true');
    const pw = passwordHash(DEMO_PASSWORD);
    for (const [id, username, name, role] of [
      ['u-admin','admin','Administración de prueba','admin'],
      ['u-ana','ana','Ana · catequista de prueba','catechist'],
      ['u-luis','luis','Luis · catequista de prueba','catechist'],
      ['u-reader','consulta','Arzobispado · consulta de prueba','reader']
    ]) s.run('INSERT INTO users (id, username, name, role, password_hash) VALUES (?, ?, ?, ?, ?)',id,username,name,role,pw);
    const groups = [
      ['g-conf','Confirmación · 2026–2027','Parroquia de ejemplo · A','Miércoles','19:00','20:00','confirmation'],
      ['g-first','Bautismo y comunión · 1.º','Parroquia de ejemplo · A','Martes','18:30','19:30','baptism-1'],
      ['g-second','Bautismo y comunión · 2.º','Parroquia de ejemplo · B','Jueves','19:00','20:00','baptism-2']
    ];
    for (const g of groups) s.run('INSERT INTO groups (id,name,parish,day,start_time,end_time,itinerary) VALUES (?,?,?,?,?,?,?)',...g);
    for (const [u,g] of [['u-ana','g-conf'],['u-ana','g-first'],['u-luis','g-conf'],['u-luis','g-second'],['u-reader','g-conf']]) s.run('INSERT INTO scopes VALUES (?,?)',u,g);
    const people = [
      ['p-1','Clara','Ejemplo Robles','g-conf','1992-06-14','yes','yes','no','clara@example.test'],
      ['p-2','Mateo','Ejemplo Vidal','g-conf','1988-02-03','yes','yes','no','mateo@example.test'],
      ['p-3','Elena','Ejemplo Suárez','g-conf','1995-10-22','yes','unknown','no',''],
      ['p-4','Diego','Ejemplo Campos','g-first','1990-01-18','no','no','no','diego@example.test'],
      ['p-5','Lucía','Ejemplo Vega','g-first','','unknown','unknown','unknown',''],
      ['p-6','Pablo','Ejemplo Soto','g-second','1985-11-05','no','no','no','pablo@example.test'],
      ['p-7','Nora','Ejemplo Alonso','g-second','1999-04-09','no','no','no','']
    ];
    for (const [id, first, last, group, birthDate, baptism, communion, confirmation, email] of people) {
      const data = personalData({birthDate,baptism,communion,confirmation,email,city:'Ciudad de ejemplo',country:'España',baptismSponsor:baptism==='no'?'Andrea · madrina de ejemplo':'',confirmationSponsor:baptism==='yes'?'Marcos · padrino de ejemplo':''});
      s.run('INSERT INTO people (id,first_name,last_name,group_id,data,updated_at) VALUES (?,?,?,?,?,?)',id,first,last,group,JSON.stringify(data),new Date().toISOString());
    }
  });
}
