import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('public/dashboard/compe-manager.html', 'utf8');
const script = readFileSync('src/pages/competition/compe-manager.js', 'utf8');

test('competition manager UI remains hidden until a competition-manager claim is accepted', () => {
  const head = html.slice(0, html.indexOf('</head>'));
  assert.match(head, /body\s*\{\s*visibility:\s*hidden\s*;?\s*\}/);

  const denyIndex = script.indexOf('if (!found)');
  const showIndex = script.indexOf("document.body.style.visibility = 'visible'");
  assert.notEqual(denyIndex, -1, 'unauthorized users must be rejected');
  assert.notEqual(showIndex, -1, 'authorized users must reveal the UI');
  assert.ok(denyIndex < showIndex, 'the role check must run before revealing the UI');
});

test('delegates relation UI remains hidden until the delegates-relation claim is accepted', () => {
  const html = readFileSync('public/dashboard/delegates-relation.html', 'utf8');
  const script = readFileSync('src/pages/dashboard/delegates-relation.js', 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.match(head, /body\s*\{\s*visibility:\s*hidden\s*;?\s*\}/);

  const denyIndex = script.indexOf("claims?.role !== 'delegates_relation'");
  const showIndex = script.indexOf("document.body.style.visibility = 'visible'");
  assert.notEqual(denyIndex, -1, 'unauthorized users must be rejected');
  assert.notEqual(showIndex, -1, 'authorized users must reveal the UI');
  assert.ok(denyIndex < showIndex, 'the role check must run before revealing the UI');
});

test('treasury UI remains hidden until the treasury claim is accepted', () => {
  const html = readFileSync('public/dashboard/treasury.html', 'utf8');
  const script = readFileSync('src/pages/dashboard/treasury.js', 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.match(head, /body\s*\{\s*visibility:\s*hidden\s*;?\s*\}/);

  const denyIndex = script.indexOf("claims?.role !== 'treasury'");
  const showIndex = script.indexOf("document.body.style.visibility = 'visible'");
  assert.notEqual(denyIndex, -1, 'unauthorized users must be rejected');
  assert.notEqual(showIndex, -1, 'authorized users must reveal the UI');
  assert.ok(denyIndex < showIndex, 'the role check must run before revealing the UI');
});
