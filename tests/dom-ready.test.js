import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onDOMReady } from '../src/shared/dom-ready.js';

test('runs initialization immediately when a dynamically loaded module arrives after DOMContentLoaded', () => {
  let calls = 0;
  const doc = { readyState: 'complete', addEventListener() { assert.fail('should not wait for an event that already fired'); } };

  onDOMReady(() => calls++, doc);

  assert.equal(calls, 1);
});

test('waits for DOMContentLoaded while the document is still loading', () => {
  let listener;
  let calls = 0;
  const doc = { readyState: 'loading', addEventListener(event, callback, options) {
    assert.equal(event, 'DOMContentLoaded');
    assert.equal(options.once, true);
    listener = callback;
  } };

  onDOMReady(() => calls++, doc);
  assert.equal(calls, 0);
  listener();
  assert.equal(calls, 1);
});
