import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('la interfaz está escrita en JavaScript y JSX', async () => {
  const app = await readFile(new URL('../frontend/src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /export default function CatequesisApp/)
  assert.doesNotMatch(app, /type Role|interface |FormEvent|ReactNode/)
})

test('Vite usa un index.html explícito', async () => {
  const html = await readFile(new URL('../frontend/index.html', import.meta.url), 'utf8')
  assert.match(html, /src="\/src\/main\.jsx"/)
})

test('las tareas pendientes están fuera de la interfaz', async () => {
  const [app, todo] = await Promise.all([
    readFile(new URL('../frontend/src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../TODO.txt', import.meta.url), 'utf8'),
  ])
  assert.doesNotMatch(app, /Qué está pendiente|Lo que todavía no incluye/)
  assert.match(todo, /TAREAS PENDIENTES/)
})
