import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstInvalidRegistrationStep } from '../src/shared/registration-fields.js';

function step(fields) {
  return { querySelectorAll: () => fields };
}
function field(value, { valid = true, hidden = false } = {}) {
  return { value, required: true, disabled: false, type: 'text', closest: () => hidden ? {} : null, checkValidity: () => valid };
}

test('blocks a whitespace-only leader field even when its step is not displayed', () => {
  assert.equal(firstInvalidRegistrationStep([step([field('  ')]), step([field('paid')])]), 0);
});

test('blocks invalid account and member fields before payment submission', () => {
  assert.equal(firstInvalidRegistrationStep([step([field('ready')]), step([field('invalid', { valid: false })]), step([field('paid')])]), 1);
});

test('ignores conditional hidden fields, but rejects an empty visible upload', () => {
  const invisible = field('', { hidden: true });
  const upload = { ...field(''), type: 'file', files: [], closest: () => null };
  assert.equal(firstInvalidRegistrationStep([step([invisible, upload])]), 0);
  upload.files = [{ name: 'proof.png' }];
  assert.equal(firstInvalidRegistrationStep([step([invisible, upload])]), -1);
});
