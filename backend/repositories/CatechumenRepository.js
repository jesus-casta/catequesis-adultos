import { getPool } from '../database/pool.js';

const columns = [
  'group_id', 'first_name', 'last_name', 'birth_date', 'birth_place',
  'address', 'city', 'province', 'postal_code', 'country', 'phone', 'email',
  'baptized', 'confirmed', 'first_communion', 'parents_information',
  'paternal_grandparents_information', 'maternal_grandparents_information',
  'baptism_sponsors', 'confirmation_sponsors', 'source_notes'
];

const keys = [
  'groupId', 'firstName', 'lastName', 'birthDate', 'birthPlace', 'address',
  'city', 'province', 'postalCode', 'country', 'phone', 'email', 'baptized',
  'confirmed', 'firstCommunion', 'parentsInformation',
  'paternalGrandparentsInformation', 'maternalGrandparentsInformation',
  'baptismSponsors', 'confirmationSponsors', 'sourceNotes'
];

function value(value) {
  if (value === undefined || value === '') return null;
  return value;
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    groupId: row.group_id,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    birthPlace: row.birth_place,
    address: row.address,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    country: row.country,
    phone: row.phone,
    email: row.email,
    baptized: row.baptized === null ? null : Boolean(row.baptized),
    confirmed: row.confirmed === null ? null : Boolean(row.confirmed),
    firstCommunion: row.first_communion === null ? null : Boolean(row.first_communion),
    parentsInformation: row.parents_information,
    paternalGrandparentsInformation: row.paternal_grandparents_information,
    maternalGrandparentsInformation: row.maternal_grandparents_information,
    baptismSponsors: row.baptism_sponsors,
    confirmationSponsors: row.confirmation_sponsors,
    sourceNotes: row.source_notes,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class CatechumenRepository {
  constructor(database = getPool()) {
    this.database = database;
  }

  async findAll({ groupId, search, limit = 100, offset = 0 } = {}) {
    const where = [];
    const params = [];

    if (groupId !== undefined) {
      where.push('group_id = ?');
      params.push(groupId);
    }
    if (search) {
      where.push("CONCAT_WS(' ', first_name, last_name) LIKE ?");
      params.push(`%${search}%`);
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const safeOffset = Math.max(Number(offset) || 0, 0);
    const sql = `SELECT * FROM catechumens
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY last_name, first_name LIMIT ? OFFSET ?`;
    const [rows] = await this.database.execute(sql, [...params, safeLimit, safeOffset]);
    return rows.map(mapRow);
  }

  async findById(id) {
    const [rows] = await this.database.execute(
      'SELECT * FROM catechumens WHERE id = ? LIMIT 1', [id]
    );
    return mapRow(rows[0]);
  }

  async create(data) {
    const params = keys.map(key => value(data[key]));
    const placeholders = columns.map(() => '?').join(', ');
    const [result] = await this.database.execute(
      `INSERT INTO catechumens (${columns.join(', ')}) VALUES (${placeholders})`, params
    );
    return this.findById(result.insertId);
  }

  async update(id, data, expectedVersion) {
    const assignments = [];
    const params = [];

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (!(key in data)) continue;
      assignments.push(`${columns[index]} = ?`);
      params.push(value(data[key]));
    }
    if (!assignments.length) return this.findById(id);

    const [result] = await this.database.execute(
      `UPDATE catechumens SET ${assignments.join(', ')}, version = version + 1
       WHERE id = ? AND version = ?`,
      [...params, id, expectedVersion]
    );
    if (!result.affectedRows) return null;
    return this.findById(id);
  }
}
