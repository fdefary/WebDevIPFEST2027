const assert = require('node:assert/strict')
const { test } = require('node:test')
const { resolveRoleClaims, mergeRoleClaims } = require('../role-assignments')

test('maps approved staff accounts to scoped custom claims', () => {
  assert.deepEqual(resolveRoleClaims(' BCC.IPFEST2027@gmail.com '), {
    ipfestRole: 'competition_manager', ipfestCompetition: 'business case'
  })
  assert.deepEqual(resolveRoleClaims('treasury.ipfest2027@gmail.com'), { ipfestRole: 'treasury' })
  assert.equal(resolveRoleClaims('unlisted@example.com'), null)
})

test('replaces only IPFEST claims and preserves unrelated custom claims', () => {
  assert.deepEqual(mergeRoleClaims({ support: true, ipfestRole: 'treasury', ipfestCompetition: 'old' }, {
    ipfestRole: 'competition_manager', ipfestCompetition: 'smart competition'
  }), {
    support: true, ipfestRole: 'competition_manager', ipfestCompetition: 'smart competition'
  })
  assert.deepEqual(mergeRoleClaims({ ipfestRole: 'treasury', ipfestCompetition: 'old', support: true }, null), {
    support: true
  })
})
