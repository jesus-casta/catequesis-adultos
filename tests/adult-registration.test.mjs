import test from 'node:test';
import assert from 'node:assert/strict';
import { adultRegistrationFields,registrationHtml } from '../frontend/src/adult-registration.js';
import { personalData } from '../backend/services/validation.js';

test('la ficha muestra únicamente la rama correspondiente al bautismo',()=>{
 const no=adultRegistrationFields({baptism:'no'}).map(([k])=>k),yes=adultRegistrationFields({baptism:'yes'}).map(([k])=>k);
 assert.ok(no.includes('fatherBirth'));assert.ok(no.includes('baptismSponsor'));assert.ok(!no.includes('baptismParish'));
 assert.ok(yes.includes('baptismParish'));assert.ok(yes.includes('confirmationSponsor'));assert.ok(!yes.includes('father'));assert.ok(!yes.includes('baptismSponsor'));
 assert.deepEqual(adultRegistrationFields({}),[]);
});
test('la impresión incluye itinerario, datos y autorización en blanco, y escapa el contenido',()=>{
 const html=registrationHtml({firstName:'<script>mal</script>',lastName:'García',data:{baptism:'yes',father:'PADRE OCULTO',baptismParish:'San Pedro',birthDate:'1990-02-03'}},{name:'Adultos',catechistName:'Ana'},'Confirmación');
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
 for(const value of ['Confirmación','San Pedro','Ana','03/02/1990','PROTECCIÓN DE DATOS','DNI:','FIRMA:','☐ ACEPTO','id="print-registration"'])assert.ok(html.includes(value),value);
 assert.ok(!html.includes('PADRE OCULTO'));
 const no=registrationHtml({data:{baptism:'no',father:'Juan',baptismParish:'PARROQUIA OCULTA'}});
 assert.ok(no.includes('Juan'));assert.ok(!no.includes('PARROQUIA OCULTA'));
});
test('los datos de catequista se guardan y se conservan los campos de ambas ramas',()=>{
 const result=personalData({baptism:'yes',catechistName:'Ana',catechistPhone:'123',father:'Juan',fatherBirth:'Oviedo'});
 assert.equal(result.catechistName,'Ana');assert.equal(result.catechistPhone,'123');assert.equal(result.fatherBirth,'Oviedo');
});
