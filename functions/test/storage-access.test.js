const assert = require('node:assert/strict')
const { test } = require('node:test')
const { authorizeStoragePath, signedReadOptions } = require('../storage-access')

const owner = { uid: 'owner', email: 'owner@example.com', emailVerified: true }
const bccManager = { uid: 'manager', role: 'competition_manager', competition: 'business case' }
const delegatesRelation = { uid: 'delegates', role: 'delegates_relation' }
const treasury = { uid: 'treasury', role: 'treasury' }
const teams = {
  owner: { competition: 'business case', leader: {}, members: [{}, {}] },
  smart: { competition: 'smart competition', leader: {}, members: [{}] }
}
const teamLookup = async (uid) => teams[uid] ?? null

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

test('authorizes Delegates Relation only for registered student cards', async () => {
  assert.equal(await authorizeStoragePath(delegatesRelation, 'team/owner/leader/student_card.jpg', teamLookup), true)
  assert.equal(await authorizeStoragePath(delegatesRelation, 'team/owner/member1/student_card.jpg', teamLookup), true)
  assert.equal(await authorizeStoragePath(delegatesRelation, 'team/owner/member2/student_card.jpg', teamLookup), true)
  assert.equal(await authorizeStoragePath(delegatesRelation, 'team/owner/member3/student_card.jpg', teamLookup), false)
  assert.equal(await authorizeStoragePath(delegatesRelation, 'team/missing/leader/student_card.jpg', teamLookup), false)
  for (const path of [
    'team/owner/leader/twibbon.jpg',
    'team/owner/member1/follow_ig.jpg',
    'payments/owner/proof.pdf',
    'preliminary_submissions/owner/file.pdf'
  ]) {
    assert.equal(await authorizeStoragePath(delegatesRelation, path, teamLookup), false, path)
  }
})

test('competition managers can read team files only for their claimed competition', async () => {
  assert.equal(await authorizeStoragePath(bccManager, 'team/owner/leader/student_card.jpg', teamLookup), true)
  assert.equal(await authorizeStoragePath(bccManager, 'team/smart/leader/student_card.jpg', teamLookup), false)
})

test('Treasury can read only registered participant verification files', async () => {
  for (const name of ['student_card.jpg', 'twibbon.jpg', 'follow_ig.jpg']) {
    assert.equal(await authorizeStoragePath(treasury, `team/owner/leader/${name}`, teamLookup), true)
    assert.equal(await authorizeStoragePath(treasury, `team/owner/member1/${name}`, teamLookup), true)
    assert.equal(await authorizeStoragePath(treasury, `team/owner/member2/${name}`, teamLookup), true)
  }
  for (const path of [
    'team/owner/member3/twibbon.jpg',
    'team/owner/leader/other.jpg',
    'team/missing/leader/student_card.jpg'
  ]) {
    assert.equal(await authorizeStoragePath(treasury, path, teamLookup), false, path)
  }
})

test('only Treasury and the team owner can read registration payment proofs', async () => {
  for (const path of ['payments/owner/proof.jpg', 'finalreg_submissions/owner/leader_1']) {
    assert.equal(await authorizeStoragePath(treasury, path, teamLookup), true, path)
    assert.equal(await authorizeStoragePath(owner, path, teamLookup), true, path)
    assert.equal(await authorizeStoragePath(bccManager, path, teamLookup), false, path)
    assert.equal(await authorizeStoragePath(delegatesRelation, path, teamLookup), false, path)
    assert.equal(await authorizeStoragePath({ uid: 'other', role: null }, path, teamLookup), false, path)
  }
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
