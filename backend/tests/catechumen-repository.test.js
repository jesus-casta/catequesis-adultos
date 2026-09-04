import test from 'node:test';
import assert from 'node:assert/strict';
import { CatechumenRepository } from '../repositories/CatechumenRepository.js';

test('findAll devuelve las filas de MySQL como objetos de aplicación', async () => {
  const database = {
    async execute(sql, params) {
      assert.match(sql, /ORDER BY last_name, first_name/);
      assert.deepEqual(params, [7, 25, 0]);
      return [[{
        id: 2,
        group_id: 7,
        first_name: 'Nombre',
        last_name: 'Apellidos',
        birth_date: '2000-01-02',
        baptized: 0,
        confirmed: 1,
        first_communion: null,
        version: 1,
        created_at: '2026-09-04 10:00:00',
        updated_at: '2026-09-04 10:00:00'
      }]];
    }
  };

  const repository = new CatechumenRepository(database);
  const result = await repository.findAll({ groupId: 7, limit: 25 });

  assert.equal(result.length, 1);
  assert.equal(result[0].firstName, 'Nombre');
  assert.equal(result[0].groupId, 7);
  assert.equal(result[0].baptized, false);
  assert.equal(result[0].confirmed, true);
  assert.equal(result[0].firstCommunion, null);
});

test('update usa la versión para evitar sobrescrituras', async () => {
  const calls = [];
  const database = {
    async execute(sql, params) {
      calls.push({ sql, params });
      return [{ affectedRows: 0 }];
    }
  };

  const repository = new CatechumenRepository(database);
  const result = await repository.update(9, { city: 'Oviedo' }, 3);

  assert.equal(result, null);
  assert.match(calls[0].sql, /version = version \+ 1/);
  assert.deepEqual(calls[0].params, ['Oviedo', 9, 3]);
});
