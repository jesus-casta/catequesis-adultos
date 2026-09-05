import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const archive='release/catequesis-adultos-aws.tar.gz';
mkdirSync('release',{recursive:true});
const paths=['package.json','package-lock.json','README.md','TODO.txt','eslint.config.mjs','postcss.config.mjs','frontend','backend/app.js','backend/models','backend/services','backend/scripts','backend/tests','backend/repositories','backend/database/pool.js','backend/database/migrations','dist/client','public','vendor','docs','deploy','tests','scripts','.github'];
execFileSync('tar',['-czf',archive,...paths],{env:{...process.env,COPYFILE_DISABLE:'1'}});
const listing=execFileSync('tar',['-tzf',archive],{encoding:'utf8'});
if(listing.split('\n').some(p=>/(^|\/)(local-data|node_modules|private-data|\.git)(\/|$)|\.(sqlite|pem|key)$/.test(p)))throw new Error('El paquete incluye una ruta privada');
console.log(`Entrega sin base de datos ni credenciales: ${archive}`);
