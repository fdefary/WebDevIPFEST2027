import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicImages = path.join(root, 'public/static/images');
const groups = JSON.parse(readFileSync(path.join(root, 'docs/public-image-assets.json'), 'utf8'));

test('stores top-level image assets in documented purpose folders', () => {
  for (const [folder, names] of Object.entries(groups)) {
    for (const name of names) {
      assert.ok(existsSync(path.join(publicImages, folder, name)), `Expected ${folder}/${name}`);
      assert.equal(existsSync(path.join(publicImages, name)), false, `Old root image still exists: ${name}`);
    }
  }
  assert.deepEqual(readdirSync(publicImages).filter((name) => /\.(?:png|jpe?g|webp|svg)$/i.test(name)), []);
});
