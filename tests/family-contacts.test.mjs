import test from 'node:test';
import assert from 'node:assert/strict';
import { parentIndex,parentContact,cleanPersonData } from '../frontend/src/family-contacts.js';
test('Padre y madre: reconoce parentescos y conserva contactos genéricos sin atribuirlos',()=>{
 const data={mother:'Madre antigua',motherPhone:'123',father:'Padre antiguo',guardians:[{name:'Tutor genérico',phone:'456'},{name:'Padre',relationship:'Papá',phone:'789',email:'padre@example.test'}]};
 assert.equal(parentIndex(data,'mother'),-1);assert.equal(parentIndex(data,'father'),1);
 assert.equal(parentContact(data,'mother').name,'Madre antigua');assert.equal(parentContact(data,'father').phone,'789');
 assert.equal(data.guardians[0].name,'Tutor genérico');
});
test('Tutor inicial vacío no se envía; los datos parciales se conservan para validarlos',()=>{
 const data={mother:'Ana',guardians:[{name:'',relationship:'',phone:'',email:'',primary:false},{name:'',phone:'123'}]};
 assert.deepEqual(cleanPersonData(data),{mother:'Ana',guardians:[{name:'',phone:'123'}]});
});
