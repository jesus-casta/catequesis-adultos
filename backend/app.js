import { createResetMailer } from './services/mail.js';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, sep, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore, passwordHash, checkPassword, hash } from './models/store.js';
import { AppError, fail, keys, text, choice, ids, version, personalData, filePayload, ROLES, DAYS, ITINERARIES, DOC_TYPES, OWNER_TYPES } from './services/validation.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.rsc':'text/x-component; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const SESSION_MS = 8 * 60 * 60 * 1000;

export function createApplication({ dbPath = resolve(ROOT, 'local-data/catequesis.sqlite'), demo = false, staticRoot = resolve(ROOT, 'dist/client'), now = Date.now, publicOrigin = '', production = false, sendPasswordReset = createResetMailer() } = {}) {
  let external;
  if(publicOrigin) {
    external=new URL(publicOrigin);
    if(external.protocol!=='https:' || external.username || external.password || external.pathname!=='/' || external.search || external.hash)throw new Error('CATEQUESIS_PUBLIC_ORIGIN debe ser un origen HTTPS sin ruta.');
  }
  if(production && (!external || demo))throw new Error('Producción requiere un origen HTTPS y no admite --demo.');
  const s = openStore(dbPath, demo);
  if(production && (s.get("SELECT value FROM metadata WHERE key='demo'")?.value!=='false' || s.all('SELECT password_hash FROM users WHERE active=1').some(u=>checkPassword('Catequesis-demo-2026!',u.password_hash)))) {s.db.close();throw new Error('Inicializa una base de producción sin cuentas de ejemplo.');}
  const attempts = new Map();
  const dummyHash = passwordHash('not-a-real-account-password');
  const json = (res, code, body) => { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(body)); };
  function auth(req) {
    const token = (req.headers.cookie || '').split(';').map(v=>v.trim()).find(v=>v.startsWith('catequesis_session='))?.slice(19);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) fail(401, 'Identifícate para continuar.');
    const session = s.get('SELECT * FROM sessions WHERE token_hash = ? AND expires > ?', hash(token), now());
    const user = session && s.user(session.user_id);
    if (!user?.active) fail(401, 'La sesión ya no está activa. Vuelve a identificarte.');
    return { user, session };
  }
  function admin(user) { if (user.role !== 'admin') fail(403, 'Esta operación corresponde a administración.'); }
  function bodyLimit(path) { return /\/(documents|photo)$/.test(path) ? 7 * 1024 * 1024 + 65536 : 65536; }
  async function body(req, path) {
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) fail(415, 'Se requiere contenido JSON.');
    const max = bodyLimit(path);
    if (Number(req.headers['content-length'] || 0) > max) fail(413, 'La solicitud supera el tamaño admitido.');
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > max) fail(413, 'La solicitud supera el tamaño admitido.'); chunks.push(chunk); }
    try { const value = JSON.parse(Buffer.concat(chunks).toString('utf8')); keys(value,Object.keys(value)); return value; }
    catch (error) { if (error instanceof AppError) throw error; fail(400, 'La solicitud no contiene datos válidos.'); }
  }
  function group(id) { const g = s.get('SELECT * FROM groups WHERE id=?',id); if (!g) fail(400,'Selecciona un grupo existente.'); return g; }
  function groupData(b, old) {
    const out = {
      name:text(b.name,'Nombre',{required:true}), parish:text(b.parish,'Parroquia',{required:true}),
      day:choice(b.day,DAYS,'Día'), startTime:text(b.startTime,'Hora de inicio'), endTime:text(b.endTime,'Hora de finalización'),
      itinerary:choice(b.itinerary,ITINERARIES,'Itinerario'), catechistIds:ids(b.catechistIds)
    };
    if (![out.startTime,out.endTime].every(v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) || out.endTime <= out.startTime) fail(400,'Revisa el horario: la hora final debe ser posterior a la inicial.');
    out.catechesisId=text(b.catechesisId??old?.catechesis_id??'adults','Catequesis',{required:true,max:80});
    const catechesis=s.get('SELECT * FROM catecheses WHERE id=?',out.catechesisId);
    if(!catechesis)fail(400,'Selecciona una catequesis existente.');
    if(old&&old.catechesis_id!==out.catechesisId)fail(400,'No se puede cambiar la catequesis de un grupo existente.');
    if(catechesis.kind!=='general'&&(catechesis.kind==='first-communion')!==(out.itinerary==='first-communion'))fail(400,'El itinerario no corresponde a esta catequesis.');
    for (const id of out.catechistIds) { const u=s.user(id); if (!u?.active || !(u.role==='catechist'||(u.role==='admin'&&u.is_catechist))) fail(400,'Solo pueden asignarse catequistas activos.'); }
    return out;
  }
  function userData(b,old) {
    const username=text(b.username,'Usuario',{required:true,max:80}).toLowerCase();
    if (!/^[a-z0-9][a-z0-9._@-]{2,79}$/.test(username)) fail(400,'Usuario: usa al menos tres letras, números o . _ @ -');
    const role=choice(b.role,ROLES,'Perfil');
    if (typeof b.active !== 'boolean') fail(400,'Estado de cuenta no válido.');
    if(b.isCatechist!==undefined && typeof b.isCatechist!=='boolean')fail(400,'Option catequista no válida.');
    if(role==='reader'&&b.isCatechist===true)fail(400,'Visualizador no se puede combinar con Catequista.');
    const isCatechist=role==='catechist'||(role==='admin'&&(b.isCatechist??!!old?.is_catechist));
    const catechesisIds=role==='reader'?ids(b.catechesisIds??(old?.role==='reader'?s.publicUser(old).catechesisIds:[])):[];
    for(const id of catechesisIds)if(!s.get('SELECT 1 FROM catecheses WHERE id=?',id))fail(400,'Selecciona una catequesis existente.');
    const requestedGroups=ids(b.groupIds);
    const groupIds=role==='reader'?[]:requestedGroups; groupIds.forEach(group);
    if (role==='admin' && !isCatechist && groupIds.length) fail(400,'Administración tiene acceso a todos los grupos y no necesita asignaciones.');
    const name=text(b.name,'Nombre',{required:true});
    const password=text(b.password ?? '', 'Contraseña',{max:128});
    if (password && password.length<12) fail(400,'La contraseña debe tener al menos 12 caracteres.');
    const phone=b.phone===undefined?undefined:text(b.phone,'Teléfono',{max:40});
    const email=b.email===undefined?undefined:text(b.email,'Correo electrónico',{max:160});
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400,'Introduce un correo electrónico válido.');
    return {username,role,active:b.active,groupIds,catechesisIds,name,password,phone,email,isCatechist};
  }
  function current(req, csrf = false) {
    const a=auth(req);
    if (csrf && req.headers['x-csrf-token']!==a.session.csrf) fail(403,'La solicitud ha caducado o no procede de esta sesión. Recarga la página.');
    return a;
  }
  const server=createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    if(external)res.setHeader('Strict-Transport-Security','max-age=31536000');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    const nonce=randomBytes(18).toString('base64');
    res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`);
    try {
      const port=server.address()?.port;
      if (!(external?[external.host]:[`localhost:${port}`,`127.0.0.1:${port}`]).includes(req.headers.host)) fail(421,'Host no autorizado.');
      const url=new URL(req.url,`http://${req.headers.host}`), path=url.pathname;
      const method=req.method;
      const write=!['GET','HEAD','OPTIONS'].includes(method);
      if (write && req.headers.origin && req.headers.origin!==(external?.origin??url.origin)) fail(403,'Origen de la solicitud no autorizado.');
      if (req.headers['sec-fetch-site']==='cross-site') fail(403,'No se admite acceso desde otro sitio.');
      if(path==='/healthz'&&method==='GET'){s.get('SELECT 1');return json(res,200,{ok:true});}
      if (path==='/api/meta' && method==='GET') return json(res,200,{version:'0.1.0',demo:s.get("SELECT value FROM metadata WHERE key='demo'")?.value==='true',localOnly:!external,photoLimitMB:2,documentLimitMB:5});
      if (['/api/forgot-password','/api/reset-password'].includes(path) && method==='POST') {
        const b=await body(req,path);
        for(const [key,value] of attempts)if(value.until<=now())attempts.delete(key);
        const key=`recovery:${req.socket.remoteAddress}`;
        const attempt=attempts.get(key)??{count:0,until:now()+300000};
        if(attempt.count>=8)fail(429,'Demasiados intentos. Espera cinco minutos.');
        attempts.set(key,{...attempt,count:attempt.count+1});
        if(path==='/api/forgot-password') {
          keys(b,['username']);
          const username=text(b.username,'Usuario',{required:true,max:80}).toLowerCase();
          if(!sendPasswordReset)fail(503,'La recuperación por correo no está disponible. Contacta con administración.');
          const user=s.get('SELECT * FROM users WHERE username=? AND active=1',username);
          s.run('DELETE FROM password_resets WHERE expires<=?',now());
          if(user?.email) {
            const token=randomBytes(32).toString('hex');
            s.run('INSERT INTO password_resets VALUES (?,?,?,?,?)',hash(token),user.id,user.password_hash,user.email,now()+30*60*1000);
            try {
              await sendPasswordReset({to:user.email,url:`${external?.origin??url.origin}/#reset-password=${token}`});
            } catch {
              s.run('DELETE FROM password_resets WHERE token_hash=?',hash(token));
              // Do not expose account existence or mail transport details.
              console.error('No se pudo entregar un correo de recuperación.');
            }
          }
          return json(res,200,{message:'Si el usuario tiene una cuenta activa con correo registrado, recibirá un enlace para recuperar la contraseña. Revisa también la carpeta de spam. Si no llega, contacta con administración.'});
        }
        keys(b,['token','password']);
        const token=text(b.token,'Enlace',{required:true,max:64});
        const password=text(b.password,'Contraseña',{required:true,max:128});
        if(password.length<12)fail(400,'La contraseña debe tener al menos 12 caracteres.');
        const reset=/^[a-f0-9]{64}$/.test(token)&&s.get('SELECT r.* FROM password_resets r JOIN users u ON u.id=r.user_id WHERE r.token_hash=? AND r.expires>? AND u.active=1 AND u.password_hash=r.password_hash AND u.email=r.email',hash(token),now());
        if(!reset)fail(400,'El enlace no es válido o ha caducado. Solicita uno nuevo.');
        s.transaction(()=>{
          s.run('UPDATE users SET password_hash=?,version=version+1 WHERE id=?',passwordHash(password),reset.user_id);
          s.run('DELETE FROM sessions WHERE user_id=?',reset.user_id);
          s.run('DELETE FROM password_resets WHERE user_id=?',reset.user_id);
          s.audit(reset.user_id,'password.reset',reset.user_id);
        });
        return json(res,200,{message:'Contraseña actualizada. Ya puedes iniciar sesión.'});
      }
      if (path==='/api/login' && method==='POST') {
        const b=await body(req,path); keys(b,['username','password']);
        const username=text(b.username,'Usuario',{max:80}).toLowerCase();
        const password=text(b.password,'Contraseña',{max:128});
        for(const [key,value] of attempts)if(value.until<=now())attempts.delete(key);
        const ip=`${req.socket.remoteAddress}:${username}`;
        const attempt=attempts.get(ip);
        if (attempt && attempt.until>now() && attempt.count>=8) fail(429,'Demasiados intentos. Espera cinco minutos.');
        const user=s.get('SELECT * FROM users WHERE username=?',username);
        const correct=checkPassword(password,user?.password_hash ?? dummyHash);
        if (!correct || !user?.active) {
          const currentAttempt=attempt && attempt.until>now() ? attempt : {count:0,until:now()+300000};
          attempts.set(ip,{...currentAttempt,count:currentAttempt.count+1});
          fail(401,'Usuario o contraseña incorrectos, o cuenta inactiva.');
        }
        attempts.delete(ip);
        const token=randomBytes(32).toString('hex'), csrf=randomBytes(24).toString('hex');
        s.run('DELETE FROM sessions WHERE expires <= ?',now());
        s.run('INSERT INTO sessions VALUES (?,?,?,?)',hash(token),user.id,csrf,now()+SESSION_MS);
        res.setHeader('Set-Cookie',`catequesis_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS/1000}${external?'; Secure':''}`);
        return json(res,200,{user:s.publicUser(user),csrf});
      }
      if (path.startsWith('/api/')) {
        let {user,session}=current(req,write);
        let b;
        if (write) { b=await body(req,path); ({user,session}=current(req,true)); }
        if (path==='/api/session' && method==='GET') return json(res,200,{user:s.publicUser(user),csrf:session.csrf});
        if (path==='/api/logout' && method==='POST') {
          s.run('DELETE FROM sessions WHERE token_hash=?',session.token_hash);
          res.setHeader('Set-Cookie','catequesis_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
          return json(res,200,{ok:true});
        }
        const catechesisMatch=path.match(/^\/api\/catecheses\/([^/]+)$/);
        if((path==='/api/catecheses'&&method==='POST')||(catechesisMatch&&method==='PUT')) {
          admin(user);keys(b,['name','parish','kind','version']);
          const name=text(b.name,'Nombre del megagrupo',{required:true,max:160});
          const parish=text(b.parish??'','Parroquia',{max:160});
          const kind=choice(b.kind,['adults','first-communion','general'],'Tipo de catequesis');
          const id=catechesisMatch?.[1]??randomUUID();
          s.transaction(()=>{
            if(catechesisMatch) {
              const old=s.get('SELECT * FROM catecheses WHERE id=?',id);
              if(!old)fail(404,'Megagrupo no encontrado.');
              version(b.version,old);
              if(kind!=='general'&&s.all('SELECT itinerary FROM groups WHERE catechesis_id=?',id).some(g=>(kind==='first-communion')!==(g.itinerary==='first-communion')))fail(409,'El tipo elegido no admite los itinerarios de los grupos existentes.');
              s.run('UPDATE catecheses SET name=?,parish=?,kind=?,version=version+1 WHERE id=?',name,parish,kind,id);
            } else s.run('INSERT INTO catecheses (id,name,parish,kind) VALUES (?,?,?,?)',id,name,parish,kind);
            s.audit(user.id,'catechesis.save',id);
          });
          return json(res,catechesisMatch?200:201,{id});
        }
        if(path==='/api/catecheses'&&method==='GET') {
          const visible=s.all('SELECT * FROM groups').filter(g=>s.canRead(user,g.id));
          return json(res,200,s.all('SELECT * FROM catecheses ORDER BY id').filter(c=>user.role==='admin'||(user.role==='reader'&&s.get('SELECT 1 FROM reader_catecheses WHERE user_id=? AND catechesis_id=?',user.id,c.id))||visible.some(g=>g.catechesis_id===c.id)).map(c=>({...c,groupCount:visible.filter(g=>g.catechesis_id===c.id).length})));
        }
        if (path==='/api/groups' && method==='GET') {
          const gs=s.all('SELECT * FROM groups ORDER BY name').filter(g=>user.role==='admin'||s.canRead(user,g.id));
          return json(res,200,gs.map(g=>({id:g.id,catechesisId:g.catechesis_id,name:g.name,parish:g.parish,day:g.day,startTime:g.start_time,endTime:g.end_time,itinerary:g.itinerary,version:g.version,
            count:s.get('SELECT COUNT(*) AS n FROM people WHERE group_id=?',g.id).n,
            catechists:s.all("SELECT u.id,u.name,u.phone,u.email,u.version,EXISTS(SELECT 1 FROM user_photos up WHERE up.user_id=u.id) AS hasPhoto FROM scopes sc JOIN users u ON u.id=sc.user_id WHERE sc.group_id=? AND (u.role='catechist' OR (u.role='admin' AND u.is_catechist=1)) AND u.active=1 ORDER BY u.name",g.id)})));
        }
        const groupMatch=path.match(/^\/api\/groups\/([^/]+)$/);
        if ((path==='/api/groups'&&method==='POST') || (groupMatch&&method==='PUT')) {
          admin(user); keys(b,['name','parish','day','startTime','endTime','itinerary','catechistIds','version','catechesisId']);
          const g=groupData(b,groupMatch?group(groupMatch[1]):null), id=groupMatch?.[1] ?? randomUUID();
          s.transaction(()=>{
            const previous=s.all("SELECT sc.user_id FROM scopes sc JOIN users u ON u.id=sc.user_id WHERE sc.group_id=? AND (u.role='catechist' OR (u.role='admin' AND u.is_catechist=1))",id).map(r=>r.user_id);
            if (groupMatch) {
              const old=group(id); version(b.version,old);
              if (old.itinerary!==g.itinerary && s.get('SELECT 1 FROM people WHERE group_id=?',id)) fail(409,'El cambio de itinerario de un grupo con personas está pendiente de definir.');
              s.run('UPDATE groups SET name=?,parish=?,day=?,start_time=?,end_time=?,itinerary=?,version=version+1 WHERE id=?',g.name,g.parish,g.day,g.startTime,g.endTime,g.itinerary,id);
              s.run("DELETE FROM scopes WHERE group_id=? AND user_id IN (SELECT id FROM users WHERE role='catechist' OR (role='admin' AND is_catechist=1))",id);
            } else s.run('INSERT INTO groups (id,name,parish,day,start_time,end_time,itinerary,catechesis_id) VALUES (?,?,?,?,?,?,?,?)',id,g.name,g.parish,g.day,g.startTime,g.endTime,g.itinerary,g.catechesisId);
            for (const u of g.catechistIds) s.run('INSERT OR IGNORE INTO scopes VALUES (?,?)',u,id);
            for (const uid of new Set([...previous,...g.catechistIds])) s.run('UPDATE users SET version=version+1 WHERE id=?',uid);
            s.ensureStaffed(); s.audit(user.id,'group.save',id);
          });
          return json(res,groupMatch?200:201,{id});
        }
        if (path==='/api/users'&&method==='GET') { admin(user); return json(res,200,s.all('SELECT * FROM users ORDER BY name').map(u=>s.publicUser(u))); }
        const userPhoto=path.match(/^\/api\/users\/([^/]+)\/photo$/);
        if(userPhoto && ['GET','POST'].includes(method)) {
          const target=s.user(userPhoto[1]);
          if(!target || !(target.role==='catechist'||(target.role==='admin'&&target.is_catechist)))fail(404,'Catequista no disponible.');
          if(method==='POST') {
            admin(user);keys(b,['name','base64','version']);version(b.version,target);
            const file=filePayload(b,true);
            s.transaction(()=>{
              s.run('INSERT INTO user_photos (user_id,mime,bytes) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET mime=excluded.mime,bytes=excluded.bytes',target.id,file.mime,file.bytes);
              s.run('UPDATE users SET version=version+1 WHERE id=?',target.id);
              s.audit(user.id,'catechist.photo.upload',target.id);
            });return json(res,201,{ok:true});
          }
          if(user.role!=='admin' && !s.all('SELECT group_id FROM scopes WHERE user_id=?',target.id).some(g=>s.canRead(user,g.group_id)))fail(404,'Foto no disponible.');
          const photo=s.get('SELECT * FROM user_photos WHERE user_id=?',target.id);
          if(!photo)fail(404,'Foto no disponible.');
          res.setHeader('Content-Security-Policy',"sandbox; default-src 'none';");
          res.writeHead(200,{'Content-Type':photo.mime,'Content-Length':photo.bytes.length});return res.end(Buffer.from(photo.bytes));
        }
        const userMatch=path.match(/^\/api\/users\/([^/]+)$/);
        if ((path==='/api/users'&&method==='POST')||(userMatch&&method==='PUT')) {
          admin(user); keys(b,['username','name','role','active','password','groupIds','version','phone','email','isCatechist','catechesisIds']);
          const d=userData(b,userMatch?s.user(userMatch[1]):null), id=userMatch?.[1]??randomUUID();
          if (!userMatch&&!d.password) fail(400,'Introduce una contraseña inicial de al menos 12 caracteres.');
          const duplicate=s.get('SELECT id FROM users WHERE username=?',d.username);
          if (duplicate&&duplicate.id!==id) fail(409,'Ese nombre de usuario ya existe.');
          s.transaction(()=>{
            const previousGroups=s.all('SELECT group_id FROM scopes WHERE user_id=?',id).map(r=>r.group_id);
            if(userMatch) {
              const old=s.user(id); if(!old) fail(404,'Cuenta no encontrada.'); version(b.version,old);
              s.run('UPDATE users SET username=?,name=?,role=?,active=?,password_hash=?,version=version+1 WHERE id=?',d.username,d.name,d.role,Number(d.active),d.password?passwordHash(d.password):old.password_hash,id);
              if(old.role!==d.role || !d.active || d.password) s.run('DELETE FROM sessions WHERE user_id=?',id);
              s.run('DELETE FROM scopes WHERE user_id=?',id);
            } else s.run('INSERT INTO users (id,username,name,role,active,password_hash) VALUES (?,?,?,?,?,?)',id,d.username,d.name,d.role,Number(d.active),passwordHash(d.password));
            s.run('UPDATE users SET is_catechist=? WHERE id=?',Number(d.isCatechist),id);
            s.run('UPDATE users SET phone=COALESCE(?,phone),email=COALESCE(?,email) WHERE id=?',d.phone??null,d.email??null,id);
            s.run('DELETE FROM reader_catecheses WHERE user_id=?',id);
            for(const c of d.catechesisIds)s.run('INSERT INTO reader_catecheses VALUES (?,?)',id,c);
            for(const g of d.groupIds) s.run('INSERT INTO scopes VALUES (?,?)',id,g);
            for(const gid of new Set([...previousGroups,...d.groupIds])) s.run('UPDATE groups SET version=version+1 WHERE id=?',gid);
            if(!s.get("SELECT 1 FROM users WHERE role='admin' AND active=1")) fail(409,'Debe mantenerse al menos una cuenta administradora activa.');
            s.ensureStaffed();s.audit(user.id,'user.save',id);
          });
          return json(res,userMatch?200:201,{id});
        }
        if(path==='/api/people'&&method==='GET') {
          const ps=s.all('SELECT * FROM people ORDER BY last_name,first_name').filter(p=>user.role==='admin'||s.canRead(user,p.group_id));
          return json(res,200,ps.map(p=>s.presentPerson(p)));
        }
        if(path==='/api/people'&&method==='POST') {
          admin(user);keys(b,['firstName','lastName','groupId','data','allowDuplicate']);
          const first=text(b.firstName,'Nombre',{required:true,max:100}),last=text(b.lastName,'Apellidos',{required:true,max:160});group(b.groupId);
          const duplicate=s.all('SELECT first_name,last_name FROM people').some(p=>p.first_name.toLocaleLowerCase('es')===first.toLocaleLowerCase('es')&&p.last_name.toLocaleLowerCase('es')===last.toLocaleLowerCase('es'));
          if(duplicate&&b.allowDuplicate!==true) fail(409,'Existe una ficha con el mismo nombre y apellidos. Revisa el listado; solo confirma el duplicado si es otra persona.');
          const id=randomUUID();s.transaction(()=>{
            s.run('INSERT INTO people (id,first_name,last_name,group_id,data,updated_at) VALUES (?,?,?,?,?,?)',id,first,last,b.groupId,JSON.stringify(personalData(b.data??{})),new Date(now()).toISOString());
            s.ensureStaffed();s.audit(user.id,'person.create',id);
          });return json(res,201,{id});
        }
        const assignment=path.match(/^\/api\/people\/([^/]+)\/group$/);
        if(assignment&&method==='PUT') {
          admin(user);keys(b,['groupId','version']);group(b.groupId);
          const p=s.get('SELECT * FROM people WHERE id=?',assignment[1]);if(!p)fail(404,'Ficha no encontrada.');version(b.version,p);
          s.transaction(()=>{s.run('UPDATE people SET group_id=?,version=version+1,updated_at=? WHERE id=?',b.groupId,new Date(now()).toISOString(),p.id);s.ensureStaffed();s.audit(user.id,'person.move-group',p.id);});
          return json(res,200,{ok:true});
        }
        const personMatch=path.match(/^\/api\/people\/([^/]+)$/);
        if(personMatch&&method==='GET') return json(res,200,s.presentPerson(s.person(user,personMatch[1])));
        if(personMatch&&method==='PUT') {
          const p=s.person(user,personMatch[1],true);keys(b,['firstName','lastName','data','version']);version(b.version,p);
          const first=text(b.firstName,'Nombre',{required:true,max:100}),last=text(b.lastName,'Apellidos',{required:true,max:160}),data=personalData(b.data);
          const old=JSON.parse(p.data);
          for(const owner of ['baptismSponsor','confirmationSponsor']) if(old[owner]!==data[owner]&&s.get('SELECT 1 FROM files WHERE person_id=? AND owner=?',p.id,owner)) fail(409,'Este padrino tiene documentación asociada. La sustitución con historial está pendiente; no se reasignarán sus documentos automáticamente.');
          s.transaction(()=>{s.run('UPDATE people SET first_name=?,last_name=?,data=?,version=version+1,updated_at=? WHERE id=?',first,last,JSON.stringify(data),new Date(now()).toISOString(),p.id);s.audit(user.id,'person.update',p.id);});
          return json(res,200,s.presentPerson(s.person(user,p.id)));
        }
        const upload=path.match(/^\/api\/people\/([^/]+)\/(photo|documents)$/);
        if(upload&&method==='POST') {
          const photo=upload[2]==='photo';
          const p=photo&&user.role==='admin'?s.get('SELECT * FROM people WHERE id=?',upload[1]):s.person(user,upload[1],true);
          if(!p)fail(404,'Ficha no disponible.');
          keys(b,photo?['name','base64','version']:['name','base64','type','owner','version']);version(b.version,p);
          const file=filePayload(b,photo),type=photo?'photo':choice(b.type,DOC_TYPES,'Tipo de documento');
          const owner=photo?'participant':choice(b.owner,OWNER_TYPES,'Titular');
          const ownerName=owner==='participant'?`${p.first_name} ${p.last_name}`:JSON.parse(p.data)[owner];
          if(!ownerName)fail(400,'Completa primero el nombre del padrino o madrina en la ficha.');
          if(type==='sponsor-confirmation'&&owner==='participant') fail(400,'Selecciona el padrino o madrina al que pertenece el certificado.');
          if(['birth','baptism','registration'].includes(type)&&owner!=='participant')fail(400,'Este tipo de documento corresponde al participante.');
          const digest=hash(file.bytes);
          if(s.get('SELECT 1 FROM files WHERE person_id=? AND type=? AND owner=? AND digest=?',p.id,type,owner,digest))fail(409,'Este mismo archivo ya está incorporado para ese tipo y titular.');
          const id=randomUUID();s.transaction(()=>{
            s.run('INSERT INTO files VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',id,p.id,type,owner,ownerName,file.name,file.mime,file.bytes.length,digest,file.bytes,new Date(now()).toISOString(),user.id);
            if(photo)s.run('UPDATE people SET photo_id=? WHERE id=?',id,p.id);
            s.run('UPDATE people SET version=version+1,updated_at=? WHERE id=?',new Date(now()).toISOString(),p.id);s.audit(user.id,photo?'photo.upload':'document.upload',p.id);
          });return json(res,201,{id});
        }
        const fileMatch=path.match(/^\/api\/files\/([^/]+)$/);
        if(fileMatch&&method==='GET') {
          const f=s.get('SELECT * FROM files WHERE id=?',fileMatch[1]);if(!f)fail(404,'Archivo no disponible.');if(!(user.role==='admin'&&f.type==='photo'))s.person(user,f.person_id);
          res.setHeader('Content-Security-Policy',"sandbox; default-src 'none';");
          res.setHeader('Content-Disposition',`inline; filename="documento${f.mime==='application/pdf'?'.pdf':f.mime==='image/png'?'.png':'.jpg'}"; filename*=UTF-8''${encodeURIComponent(f.name).replace(/'/g,'%27')}`);
          res.writeHead(200,{'Content-Type':f.mime,'Content-Length':f.size});return res.end(Buffer.from(f.bytes));
        }
        fail(404,'Operación no disponible en esta versión.');
      }
      if(!['GET','HEAD'].includes(method))fail(405,'Método no permitido.');
      const relative=decodeURIComponent(path)==='/'?'index.html':decodeURIComponent(path).replace(/^\/+/, '');
      const filepath=resolve(staticRoot,relative);
      if(!filepath.startsWith(resolve(staticRoot)+sep)||!MIME[extname(filepath)]) fail(404,'Página no encontrada.');
      let info;try{info=await stat(filepath);}catch{fail(404,'Interfaz no disponible. Ejecuta la compilación indicada en README.md.');}
      if(!info.isFile())fail(404,'Página no encontrada.');
      let bytes=await readFile(filepath);
      if(extname(filepath)==='.html')bytes=Buffer.from(bytes.toString().replace(/<script\b/g,`<script nonce="${nonce}"`));
      res.writeHead(200,{'Content-Type':MIME[extname(filepath)]});res.end(method==='HEAD'?undefined:bytes);
    } catch(error) {
      if(res.headersSent){res.end();return;}
      const status=error instanceof AppError?error.status:500;
      if(status===500)console.error('Error interno:',error.message);
      json(res,status,{error:status===500?'No se ha podido completar la operación. No se ha confirmado ningún guardado.':error.message});
    }
  });
  server.requestTimeout=30000;server.headersTimeout=10000;
  return {server,store:s,async close(){if(server.listening)await new Promise((ok,error)=>server.close(e=>e?error(e):ok()));s.db.close();}};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const demo=process.argv.includes('--demo');
  const port=Number(process.env.CATEQUESIS_PORT??3000);
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('CATEQUESIS_PORT debe estar entre 1024 y 65535.');
  const staticRoot=resolve(ROOT,'dist/client');
  if(!existsSync(resolve(staticRoot,'index.html')))throw new Error('Falta la interfaz compilada. Consulta README.md antes de arrancar.');
  const production=process.env.NODE_ENV==='production';
  const host=process.env.CATEQUESIS_HOST??'127.0.0.1';
  if(!production && !['127.0.0.1','localhost'].includes(host))throw new Error('El modo local solo puede escuchar en loopback.');
  const app=createApplication({demo,staticRoot,production,publicOrigin:process.env.CATEQUESIS_PUBLIC_ORIGIN??'',dbPath:process.env.CATEQUESIS_DB_PATH?resolve(process.env.CATEQUESIS_DB_PATH):resolve(ROOT,'local-data/catequesis.sqlite')});
  app.server.listen(port,host,()=>{
    console.log(`Catequesis de adultos · ${production?'producción':'local'}\nAbre ${process.env.CATEQUESIS_PUBLIC_ORIGIN??`http://localhost:${port}`}`);
  });
  app.server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'El puerto está ocupado. Elige otro con CATEQUESIS_PORT.':error.message);app.store.db.close();process.exitCode=1;});
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
}
