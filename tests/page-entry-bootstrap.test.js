import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const bootstrap = readFileSync('src/app/bootstrap.js', 'utf8')

test('page bootstrap finds the entry script when currentScript is unavailable', () => {
  assert.match(bootstrap, /document\.currentScript\?\.dataset\.entry\s*\?\?\s*document\.querySelector\('script\[data-entry\]'\)\?\.dataset\.entry/)
})
