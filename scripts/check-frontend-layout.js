import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const config = readFileSync(path.join(root, 'webpack.config.babel.js'), 'utf8');
const entries = [...config.matchAll(/:\s*['"](\.\/[^'"]+\.js)['"]/g)].map((match) => match[1]);

assert(entries.length > 0, 'Webpack must declare frontend entry points');
assert(!entries.some((entry) => entry.startsWith('./public/src/')), 'Webpack sources belong outside public/');
for (const entry of entries) {
  assert(statSync(path.resolve(root, entry)).isFile(), `Missing Webpack entry: ${entry}`);
}

for (const file of readdirSync(path.join(root, 'src')).filter((name) => name.endsWith('.js'))) {
  const source = readFileSync(path.join(root, 'src', file), 'utf8');
  for (const [, imported] of source.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)) {
    assert(statSync(path.resolve(root, 'src', imported)).isFile(), `Missing import in src/${file}: ${imported}`);
  }
}

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(fullPath) : entry.name.endsWith('.html') ? [fullPath] : [];
  });
}

for (const file of htmlFiles(path.join(root, 'public'))) {
  assert(!/\bsrc\/[^"']+\.js/.test(readFileSync(file, 'utf8')), `HTML must load built bundles, not source: ${path.relative(root, file)}`);
}

for (const [file, code] of [['400.html', '400'], ['404.html', '404']]) {
  const html = readFileSync(path.join(root, 'public', file), 'utf8');
  assert(!/<nav\b/i.test(html), `${file} should not include a header`);
  assert.match(html, new RegExp(`static/images/error-icon/${code}\\.png`), `${file} should use its error icon`);
  assert.match(html, new RegExp(`alt="Error ${code}"`), `${file} should expose its error code to assistive technology`);
  assert(statSync(path.join(root, 'public/static/images/error-icon', `${code}.png`)).isFile(), `Missing ${code} error icon`);
  assert.match(html, /static\/css\/error-pages\.css/, `${file} should load shared error-page styling`);
}

const registration = readFileSync(path.join(root, 'public/register.html'), 'utf8');
for (const bank of ['bca', 'gopay', 'paypal']) {
  assert.match(registration, new RegExp(`static/images/banks-logo/${bank}\\.png`), `register.html should use the updated ${bank} logo path`);
  assert(statSync(path.join(root, 'public/static/images/banks-logo', `${bank}.png`)).isFile(), `Missing ${bank} bank logo`);
}

const notFound = readFileSync(path.join(root, 'public/404.html'), 'utf8');
assert.match(notFound, /class="error-button error-button-secondary" href="https:\/\/wa\.me\/\+6289518593615">Contact Us/);
const notFoundCopy = notFound.match(/<p>We're sorry,[\s\S]*?<\/p>/)?.[0] ?? '';
assert(notFoundCopy && !/<a\b/.test(notFoundCopy), '404 contact mention in the paragraph should not be a link');

const errorCss = readFileSync(path.join(root, 'public/static/css/error-pages.css'), 'utf8');
assert.match(errorCss, /--navy:\s*#16213E/i);
assert.match(errorCss, /--gold:\s*#E6C72A/i);
