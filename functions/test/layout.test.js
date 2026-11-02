const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

const root = path.resolve(__dirname, '..')
const packageJson = require(path.join(root, 'package.json'))

test('keeps Firebase runtime code organized under src by responsibility', () => {
  assert.equal(packageJson.main, 'src/index.js')
  for (const file of [
    'src/index.js',
    'src/auth/role-assignments.js',
    'src/security/security-policy.js',
    'src/security/storage-access.js'
  ]) {
    assert.ok(fs.statSync(path.join(root, file)).isFile(), `Missing ${file}`)
  }
  for (const file of ['index.js', 'role-assignments.js', 'security-policy.js', 'storage-access.js']) {
    assert.equal(fs.existsSync(path.join(root, file)), false, `Legacy root file still exists: ${file}`)
  }
})
