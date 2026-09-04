import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CatechumenRepository } from '../repositories/CatechumenRepository.js';
import { closePool } from '../database/pool.js';

const source = resolve(process.argv[2] ?? 'local-data/mysql/catechumens.private.json');

try {
  const records = JSON.parse(await readFile(source, 'utf8'));
  if (!Array.isArray(records)) throw new Error('El archivo debe contener una lista JSON.');

  const repository = new CatechumenRepository();
  for (const record of records) await repository.create(record);
  console.log(`${records.length} fichas importadas.`);
} finally {
  await closePool();
}
