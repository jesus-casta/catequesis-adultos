import test from 'node:test';
import assert from 'node:assert/strict';
import { localDate, monthDays, shiftMonth } from '../frontend/src/calendar-dates.js';
import { weeklyDates } from '../backend/services/calendar.js';

test('Calendario mensual: lunes primero, años bisiestos y cambio de año',()=>{
  const feb=monthDays('2028-02');assert.equal(feb[0],null);assert.equal(feb[1],'2028-02-01');assert(feb.includes('2028-02-29'));assert.equal(feb.length%7,0);
  assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2026-01',-1),'2025-12');
  assert.equal(localDate(new Date(2026,9,4)),'2026-10-04');
});
test('Sesiones semanales: conserva fecha al cruzar horario de verano y meses',()=>{
  assert.deepEqual(weeklyDates('2026-10-18','2026-11-08'),['2026-10-18','2026-10-25','2026-11-01','2026-11-08']);
  assert.deepEqual(weeklyDates('2026-12-30','2027-01-10'),['2026-12-30','2027-01-06']);
});
