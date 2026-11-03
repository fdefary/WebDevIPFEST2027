import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loginCredentials } from '../src/shared/login-credentials.js';

test('trims the email but preserves the password exactly as entered', () => {
  assert.deepEqual(loginCredentials('  manager@example.com  ', ' pass word '), {
    email: 'manager@example.com',
    password: ' pass word '
  });
});
