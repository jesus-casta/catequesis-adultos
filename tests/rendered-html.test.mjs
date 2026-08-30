import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('genera un HTML sencillo con la aplicación React', async () => {
  const html = await readFile(new URL('../dist/client/index.html', import.meta.url), 'utf8')
  assert.match(html, /<html lang="es">/)
  assert.match(html, /<title>Catequesis de adultos<\/title>/)
  assert.match(html, /<div id="root"><\/div>/)
  assert.match(html, /\/assets\/.*\.js/)
  assert.match(html, /\/assets\/.*\.css/)
  assert.doesNotMatch(html, /index\.rsc|codex-preview|Starter Project/)
})
