const assert = require('node:assert/strict')
const { test } = require('node:test')
const { assertTeamIds, chunk, summarizeAccounts, MAX_TEAM_IDS } = require('../src/security/account-status')

test('accepts a unique list of team IDs within the limit', () => {
  assert.doesNotThrow(() => assertTeamIds(['6BbztBPUujSBlx4XJPduypi6g1w1', 'team_2']))
  assert.doesNotThrow(() => assertTeamIds(Array.from({ length: MAX_TEAM_IDS }, (_, i) => `t${i}`)))
})

test('rejects empty, oversized, duplicate or malformed team ID lists', () => {
  for (const ids of [
    undefined, 'team1', [], ['t1', 't1'], ['Team/t1'], [''], [42],
    Array.from({ length: MAX_TEAM_IDS + 1 }, (_, i) => `t${i}`)
  ]) {
    assert.throws(() => assertTeamIds(ids))
  }
})

test('splits lookups into batches of 100', () => {
  const batches = chunk(Array.from({ length: 250 }, (_, i) => i))
  assert.deepEqual(batches.map((batch) => batch.length), [100, 100, 50])
})

test('returns only the verification fields and marks missing accounts', () => {
  const users = [{
    uid: 'a', email: 'a@example.com', emailVerified: true, passwordHash: 'secret',
    metadata: { lastSignInTime: 'Fri, 13 Nov 2026 13:20:17 GMT' }
  }, { uid: 'b', emailVerified: false, metadata: {} }]
  assert.deepEqual(summarizeAccounts(['a', 'b', 'c'], users), {
    a: { exists: true, emailVerified: true, lastSignInAt: 'Fri, 13 Nov 2026 13:20:17 GMT' },
    b: { exists: true, emailVerified: false, lastSignInAt: null },
    c: { exists: false, emailVerified: false, lastSignInAt: null }
  })
})
