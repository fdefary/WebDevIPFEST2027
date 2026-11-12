import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emailVerificationRequired } from '../src/shared/email-verification.js';

test('unverified delegates may sign in until 23:59 WIB on December 4, 2026', () => {
  assert.equal(emailVerificationRequired(new Date('2026-11-12T10:00:00+07:00')), false);
  assert.equal(emailVerificationRequired(new Date('2026-12-04T23:59:59.999+07:00')), false);
});

test('email verification is required again from December 5, 2026 WIB', () => {
  assert.equal(emailVerificationRequired(new Date('2026-12-05T00:00:00+07:00')), true);
  assert.equal(emailVerificationRequired(new Date('2027-01-05T12:00:00+07:00')), true);
});
