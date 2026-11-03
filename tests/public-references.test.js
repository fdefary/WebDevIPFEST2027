import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { findMissingReferences } from '../scripts/check-public-references.js';

test('checks local markup and CSS references while accepting deployed clean URLs', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ipfest-public-refs-'));
  try {
    mkdirSync(path.join(root, 'events'), { recursive: true });
    mkdirSync(path.join(root, 'static', 'css'), { recursive: true });
    mkdirSync(path.join(root, 'static', 'fonts'), { recursive: true });
    mkdirSync(path.join(root, 'static', 'scss'), { recursive: true });
    writeFileSync(path.join(root, 'index.html'), '<a href="events/tour?from=home#photos">Tour</a>');
    writeFileSync(path.join(root, 'events', 'tour.html'), '<img src="../static/images/logo.svg">');
    writeFileSync(path.join(root, 'static', 'css', 'site.css'), 'body { background: url("../images/background.png"); src: url(../fonts/A\\ Font.woff2); }');
    writeFileSync(path.join(root, 'static', 'fonts', 'A Font.woff2'), '');
    writeFileSync(path.join(root, 'static', 'scss', 'main.scss'), '@import "theme";');
    writeFileSync(path.join(root, 'static', 'scss', '_theme.scss'), '');
    mkdirSync(path.join(root, 'static', 'images'));
    writeFileSync(path.join(root, 'static', 'images', 'logo.svg'), '');

    const missing = findMissingReferences(root);
    assert.deepEqual(missing.map(({ reference }) => reference), ['../images/background.png']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('checks local image strings in public and source JavaScript against the hosting root', () => {
  const project = mkdtempSync(path.join(os.tmpdir(), 'ipfest-js-refs-'));
  const root = path.join(project, 'public');
  try {
    mkdirSync(path.join(root, 'static', 'images'), { recursive: true });
    mkdirSync(path.join(root, 'static', 'js'), { recursive: true });
    mkdirSync(path.join(project, 'src'), { recursive: true });
    writeFileSync(path.join(root, 'static', 'images', 'exists.webp'), '');
    writeFileSync(path.join(root, 'static', 'js', 'app.js'), 'const ok = "static/images/exists.webp"; const missing = "static/images/public-missing.webp";');
    writeFileSync(path.join(project, 'src', 'app.js'), "const ok = 'static/images/exists.webp'; const missing = 'static/images/src-missing.webp';");

    assert.deepEqual(
      findMissingReferences(root).map(({ file, reference }) => [file.replaceAll('\\', '/'), reference]),
      [
        ['static/js/app.js', 'static/images/public-missing.webp'],
        ['../src/app.js', 'static/images/src-missing.webp']
      ]
    );
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test('keeps every local public page and stylesheet reference resolvable', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
  assert.deepEqual(findMissingReferences(root), []);
});
