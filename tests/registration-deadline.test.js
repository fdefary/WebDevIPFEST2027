import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRegistrationOpen } from '../src/shared/registration-deadline.js';

test('Smart Competition registration closes at 23:59 WIB on December 8, 2026', () => {
  assert.equal(isRegistrationOpen('smart competition', '2026-12-08T16:58:59.999Z'), true);
  assert.equal(isRegistrationOpen('smart competition', '2026-12-08T16:59:00.000Z'), false);
});

test('the Smart Competition deadline does not close other competitions', () => {
  assert.equal(isRegistrationOpen('business case', '2026-12-09T00:00:00+07:00'), true);
});
