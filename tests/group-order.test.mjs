import assert from 'node:assert/strict';
import test from 'node:test';
import { reorderGroups } from '../frontend/src/group-order.js';

test('arrastrar grupos permite subir y bajar sin alterar el listado original',()=>{
  const groups=['a','b','c','d'].map(id=>({id,version:1}));
  assert.deepEqual(reorderGroups(groups,'a','c').map(g=>g.id),['b','c','a','d']);
  assert.deepEqual(reorderGroups(groups,'d','a').map(g=>g.id),['d','a','b','c']);
  assert.deepEqual(groups.map(g=>g.id),['a','b','c','d']);
  assert.equal(reorderGroups(groups,'a','a'),groups);
  assert.equal(reorderGroups(groups,'missing','a'),groups);
});
