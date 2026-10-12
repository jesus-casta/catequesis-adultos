import test from 'node:test';
import assert from 'node:assert/strict';
import { motherContact, motherGuardianIndex } from '../frontend/src/mother-contact.js';

test('Contacto de madre: conserva los datos antiguos y no usa el teléfono del niño',()=>{
  assert.deepEqual(motherContact({mother:'María',motherPhone:'600123123',phone:'999'}),{name:'María',phone:'600123123'});
  assert.deepEqual(motherContact({phone:'999'}),{name:'',phone:''});
});
test('Contacto de madre: identifica a la madre entre tutores y prioriza el contacto principal',()=>{
  const data={mother:'Anterior',motherPhone:'111',guardians:[{name:'Padre',relationship:'padre',phone:'222'},{name:'Ana',relationship:' Madre ',phone:'333'},{name:'Eva',relationship:'Mamá',phone:'444',primary:true}]};
  assert.equal(motherGuardianIndex(data),2);
  assert.deepEqual(motherContact(data),{name:'Eva',phone:'444'});
  data.guardians[2].phone='';
  assert.equal(motherContact(data).phone,'');
});
