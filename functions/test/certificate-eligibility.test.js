const assert = require('node:assert/strict')
const { test } = require('node:test')
const { certificateId, validateCertificateAttendance } = require('../security-policy')

test('certificate requests use stable IDs scoped to an attendance source', () => {
  assert.equal(certificateId('Career_Talk', 'a+b@example.com'), 'Career_Talk_e8d87b42fd25944d484b1a12df866232e6a25c0551a50e84d8f9d2103b16f1db')
  assert.notEqual(certificateId('Career_Talk', 'a+b@example.com'), certificateId('Grand_IPCONVEX', 'a+b@example.com'))
  assert.throws(() => certificateId('Merch', 'order-1'))
  assert.throws(() => certificateId('Career_Talk', '../x'))
})

test('only valid attendance identities with 2.5 hours checked in are eligible', () => {
  const start = new Date('2026-01-01T00:00:00Z')
  const eligible = {
    name: ' Attendee ', email: 'attendee@example.com',
    checkin: { toDate: () => start }, checkout: { toDate: () => new Date(+start + 150 * 60 * 1000) }
  }
  assert.deepEqual(validateCertificateAttendance(eligible), { name: 'Attendee', email: 'attendee@example.com' })
  assert.throws(() => validateCertificateAttendance({ ...eligible, checkout: { toDate: () => new Date(+start + 149 * 60 * 1000) } }))
  assert.throws(() => validateCertificateAttendance({ ...eligible, email: 'bad' }))
  assert.deepEqual(validateCertificateAttendance({
    full_name: ' Grand Attendee ', email: 'grand@example.com',
    checkin: eligible.checkin, checkout: eligible.checkout
  }), { name: 'Grand Attendee', email: 'grand@example.com' })
})
