import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const loginSource = readFileSync('src/pages/auth/login.js', 'utf8')

test('Smart Competition managers land on the exam admin dashboard after login', () => {
  assert.match(loginSource, /competition_manager:\s*roleClaims\.competition === 'smart competition'\s*\?\s*"\.\/dashboard\/smart-competition\/exam-admin\.html"/)
})
