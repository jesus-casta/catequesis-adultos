import { resolve } from 'node:path';
import { openStore } from '../models/store.js';
const s=openStore(resolve(process.env.CATEQUESIS_DB_PATH??'local-data/catequesis.sqlite'),false,{
  username:process.env.CATEQUESIS_ADMIN_USERNAME,
  name:process.env.CATEQUESIS_ADMIN_NAME,
  password:process.env.CATEQUESIS_ADMIN_PASSWORD
});
console.log('Base inicializada. Los usuarios existentes no se modifican.');
s.db.close();
