import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registrationPriceAt } from '../src/shared/registration-pricing.js';

test('registration prices switch at exact WIB midnight boundaries', () => {
  assert.equal(registrationPriceAt('2026-11-04T16:59:59.999Z').amount, 150000);
  assert.equal(registrationPriceAt('2026-11-04T17:00:00.000Z').amount, 150000);
  assert.equal(registrationPriceAt('2026-11-11T16:59:59.999Z').amount, 150000);
  assert.equal(registrationPriceAt('2026-11-11T17:00:00.000Z').amount, 175000);
  assert.equal(registrationPriceAt('2026-12-04T16:59:59.999Z').amount, 175000);
  assert.equal(registrationPriceAt('2026-12-04T17:00:00.000Z').amount, 225000);
  assert.equal(registrationPriceAt('2026-12-11T16:59:59.999Z').amount, 225000);
  assert.equal(registrationPriceAt('2026-12-11T17:00:00.000Z'), null);
});

test('smart competition closes after December 8 23:59 WIB', () => {
  assert.equal(registrationPriceAt('2026-12-08T16:59:59.999Z', 'smart competition').amount, 225000);
  assert.equal(registrationPriceAt('2026-12-08T17:00:00.000Z', 'smart competition'), null);
  assert.equal(registrationPriceAt('2026-12-08T17:00:00.000Z', 'business case').amount, 225000);
});

test('invalid dates do not produce a payable price', () => {
  assert.equal(registrationPriceAt('not a date'), null);
  assert.equal(registrationPriceAt(null), null);
});
