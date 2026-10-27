const assert = require('node:assert/strict')
const { test } = require('node:test')
const { authorizeStoragePath, signedReadOptions } = require('../storage-access')

const owner = { uid: 'owner', email: 'owner@example.com', emailVerified: true }
const bccManager = { uid: 'manager', role: 'competition_manager', competition: 'business case' }
const teamLookup = async (uid) => ({ competition: uid === 'owner' ? 'business case' : 'smart competition' })

test('authorizes private owner files and rejects other users', async () => {
  assert.equal(await authorizeStoragePath(owner, 'payments/owner/proof.pdf', teamLookup), true)
  assert.equal(await authorizeStoragePath({ ...owner, uid: 'other' }, 'payments/owner/proof.pdf', teamLookup), false)
})

test('authorizes only verified managers and participants for the matching Case', async () => {
  assert.equal(await authorizeStoragePath(bccManager, 'Case/business case/v1.pdf', teamLookup), true)
  assert.equal(await authorizeStoragePath({ ...bccManager, role: null }, 'Case/business case/v1.pdf', teamLookup), false)
  assert.equal(await authorizeStoragePath(owner, 'Case/business case/v1.pdf', teamLookup), true)
  assert.equal(await authorizeStoragePath(owner, 'Case/smart competition/v1.pdf', teamLookup), false)
})

test('rejects merchandise, unknown roots, and malformed object paths', async () => {
  for (const path of ['Merch/order/proof.jpg', 'unknown/owner/file.pdf', 'team/owner/../secret.pdf', 'Case/business case']) {
    assert.equal(await authorizeStoragePath(owner, path, teamLookup), false, path)
  }
})

test('signed read URLs expire five minutes after creation', () => {
  const now = 1_800_000_000_000
  const options = signedReadOptions(now)
  assert.equal(options.action, 'read')
  assert.equal(options.version, 'v4')
  assert.equal(options.expires.getTime(), now + 5 * 60 * 1000)
})
