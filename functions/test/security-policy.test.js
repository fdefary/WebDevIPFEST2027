const assert = require('node:assert/strict')
const { test } = require('node:test')
const { assertPaymentUpdates, assertResult, assertCase, INFO_DOCS, RELEASES } = require('../security-policy')

test('validates payment batches and status enums', () => {
  assert.doesNotThrow(() => assertPaymentUpdates([{ teamId: 't1', kind: 'final', status: 'down_payment_verified' }]))
  assert.throws(() => assertPaymentUpdates([{ teamId: 't1', kind: 'registration', status: 'approved' }]))
  assert.throws(() => assertPaymentUpdates([{ teamId: 't1/another/doc', kind: 'final', status: 'verified' }]))
  assert.throws(() => assertPaymentUpdates([
    { teamId: 't1', kind: 'final', status: 'verified' }, { teamId: 't1', kind: 'final', status: 'pending' }
  ]))
  assert.throws(() => assertPaymentUpdates(Array.from({ length: 451 }, (_, i) => ({ teamId: String(i), kind: 'final', status: 'verified' }))))
})

test('validates allowed result fields and bounds', () => {
  assert.doesNotThrow(() => assertResult('rank', 10000))
  assert.doesNotThrow(() => assertResult('score', 250))
  assert.throws(() => assertResult('score', 251))
  assert.throws(() => assertResult('payment_status', 'verified'))
})

test('restricts case release to mapped manager, matching path, and release date', () => {
  const valid = { role: 'competition_manager', competition: 'business case', stage: 'preliminary', path: 'Case/business case/a.pdf', now: RELEASES.preliminary }
  assert.equal(assertCase(valid), INFO_DOCS['business case'])
  for (const change of [{ role: 'treasury' }, { competition: 'smart competition' }, { path: 'Case/other/a.pdf' }, { now: RELEASES.preliminary - 1 }]) {
    assert.throws(() => assertCase({ ...valid, ...change }))
  }
})
