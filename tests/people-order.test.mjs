import assert from 'node:assert/strict';
import test from 'node:test';
import { courseKey, orderPeople } from '../frontend/src/people-order.js';

const person = (id, firstName, lastName, groupId) => ({id,firstName,lastName,groupId});

test('Nombre: orden español, apellidos como desempate y sin modificar la lista original', () => {
  const people = [person('z','Zoé','Alonso','a'),person('b','Álvaro','Zapata','a'),person('a','Alvaro','Álvarez','b')];
  assert.deepEqual(orderPeople(people,[]).map(p=>p.id),['a','b','z']);
  assert.deepEqual(people.map(p=>p.id),['z','b','a']);
});

test('Curso: nivel numérico antes de letra y nombre dentro de la comunidad', () => {
  const communities = [
    {id:'2a',name:'Comunidad 2.º A'}, {id:'1b',name:'1B'},
    {id:'10a',name:'10º A'}, {id:'1a',name:'1.º A'}, {id:'unknown',name:'Sin curso'},
  ];
  const people = [person('unknown','Ana','','unknown'),person('10','Ana','','10a'),person('2','Ana','','2a'),person('1b','Ana','','1b'),person('1az','Zoe','','1a'),person('1aa','Álvaro','','1a')];
  assert.deepEqual(orderPeople(people,communities,'course').map(p=>p.id),['1aa','1az','1b','2','10','unknown']);
});

test('Curso: reconoce ordinales, ignora años académicos y usa el nivel del itinerario', () => {
  assert.deepEqual(courseKey({name:'Comunidad 2ºB'}),{level:2,letter:'B',name:'Comunidad 2ºB'});
  assert.equal(courseKey({name:'Confirmación · 2026–2027',itinerary:'confirmation'}).level,1);
  assert.equal(courseKey({name:'Bautismo · B',itinerary:'baptism-2'}).level,2);
  assert.equal(courseKey({name:'Bautismo · B',itinerary:'baptism-2'}).letter,'B');
  assert.equal(courseKey({name:'Curso 2026–2027'}).level,Number.MAX_SAFE_INTEGER);
  assert.deepEqual(orderPeople([],[],'course'),[]);
});
