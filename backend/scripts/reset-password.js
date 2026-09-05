import { resolve } from 'node:path';
import { openStore, passwordHash, DEMO_PASSWORD } from '../models/store.js';
const password=process.env.CATEQUESIS_NEW_PASSWORD;
if(!password || password.length<12 || password.length>128 || password===DEMO_PASSWORD)throw new Error('Define CATEQUESIS_NEW_PASSWORD con una contraseña privada de 12 a 128 caracteres.');
const s=openStore(resolve(process.env.CATEQUESIS_DB_PATH??'local-data/catequesis.sqlite'),false);
try {
 const user=s.get('SELECT * FROM users WHERE username=?',process.argv[2]??'');
 if(!user)throw new Error('Usuario no encontrado');
 s.transaction(()=>{s.run('UPDATE users SET password_hash=?,version=version+1 WHERE id=?',passwordHash(password),user.id);s.run('DELETE FROM sessions WHERE user_id=?',user.id);s.audit(user.id,'password.reset-console',user.id);});
 console.log('Contraseña actualizada y sesiones cerradas.');
}finally{s.db.close();}
