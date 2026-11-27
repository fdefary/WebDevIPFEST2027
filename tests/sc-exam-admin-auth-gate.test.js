import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync('public/dashboard/smart-competition/exam-admin.html', 'utf8')
const script = readFileSync('src/pages/competition/sc-exam-admin.js', 'utf8')
const bootstrap = readFileSync('src/app/bootstrap.js', 'utf8')

test('exam admin dashboard remains hidden until the Smart Competition manager claim is verified', () => {
  assert.match(html.slice(0, html.indexOf('</head>')), /body\s*\{[^}]*visibility:\s*hidden/i)
  const denyIndex = script.indexOf("claims?.role !== 'competition_manager'")
  const scopeIndex = script.indexOf("claims?.competition !== 'smart competition'")
  const showIndex = script.indexOf("document.body.style.visibility = 'visible'")
  assert.notEqual(denyIndex, -1)
  assert.notEqual(scopeIndex, -1)
  assert.ok(denyIndex < showIndex && scopeIndex < showIndex)
})

test('exam admin page is registered as a webpack page entry', () => {
  assert.match(html, /data-entry="sc_exam_admin"/)
  assert.match(bootstrap, /sc_exam_admin:/)
})

test('a failed role lookup does not reveal the admin dashboard', () => {
  const authFlow = script.slice(script.lastIndexOf('onAuthStateChanged('))
  const errorHandler = authFlow.slice(authFlow.indexOf('} catch (error)'))
  assert.doesNotMatch(errorHandler, /document\.body\.style\.visibility\s*=\s*'visible'/)
})
