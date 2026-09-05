import { DatabaseSync, backup } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { mkdirSync, existsSync, chmodSync } from 'node:fs';
process.umask(0o077);
const source=resolve(process.env.CATEQUESIS_DB_PATH??'local-data/catequesis.sqlite');
const destination=resolve(process.argv[2]??`${process.env.CATEQUESIS_BACKUP_DIR??'local-data/backups'}/catequesis-${new Date().toISOString().replaceAll(':','-')}.sqlite`);
if(!existsSync(source)||existsSync(destination))throw new Error('Origen inexistente o destino ya existente; no se sobrescribe ninguna copia.');
mkdirSync(dirname(destination),{recursive:true,mode:0o700});
const db=new DatabaseSync(source,{readOnly:true});
try {await backup(db,destination);chmodSync(destination,0o600);}finally{db.close();}
const check=new DatabaseSync(destination,{readOnly:true});
try {if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Copia no íntegra');}finally{check.close();}
console.log(`Copia verificada: ${destination}`);
