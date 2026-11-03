import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const files = [
  'src/legacy/login_ori.js',
  'src/pages/auth/login.js',
  'src/pages/auth/registration.js',
  'src/pages/competition/delegates.js',
  'src/pages/merchandise/merchandise.js'
];

test('page modules use onDOMReady instead of direct DOMContentLoaded or readyState checks', () => {
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /(?:window|document)\.addEventListener\(\s*["']DOMContentLoaded["']/, `${file} must use onDOMReady`);
    assert.doesNotMatch(source, /document\.readyState/, `${file} must use onDOMReady`);
  }
});
