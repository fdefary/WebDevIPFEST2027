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

const competitionManager = readFileSync(path.join(root, 'src/compe-manager.js'), 'utf8');
assert.match(competitionManager, /query\(collection\(DB, 'Team'\), where\('competition', '==', manager\.competition\)\)/);

const registrationSource = readFileSync(path.join(root, 'src/registration.js'), 'utf8');
assert.match(registrationSource, /payments\/\$\{user\.uid\}\/\$\{Date\.now\(\)\}_/);
assert.ok(registrationSource.indexOf('createUserWithEmailAndPassword(AUTH, email, password)') < registrationSource.indexOf('payments/${user.uid}/'), 'Payment upload must happen after Auth user creation');

const delegates = readFileSync(path.join(root, 'src/delegates.js'), 'utf8');
assert.match(delegates, /preliminary_submissions\/\$\{currentUserID\}\//);

const scManager = readFileSync(path.join(root, 'src/compe-manager-sc.js'), 'utf8');
assert.match(scManager, /escapeHTML\(/);
assert.doesNotMatch(scManager, /\$\{(?:teamName|univ|compe|leader\.\w+|m\.\w+)\}/);

const merchManager = readFileSync(path.join(root, 'src/merchmanager.js'), 'utf8');
assert.match(merchManager, /escapeHTML\(/);
assert.match(merchManager, /safeHttpUrl\(/);
assert.doesNotMatch(merchManager, /\$\{data\.customer_info\?\.\w+\s*\|\|\s*"-"\}/);
assert.doesNotMatch(merchManager, /href="\$\{data\.files\?\./);

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

const resetPage = readFileSync(path.join(root, 'public/reset-password.html'), 'utf8');
const resetCss = readFileSync(path.join(root, 'public/static/css/reset-password.css'), 'utf8');
assert.match(resetPage, /static\/images\/ipfest_2027_logo\.png/);
assert.match(resetPage, /static\/images\/ipfest_2027_text\.png/);
assert.match(resetPage, /id="reset-password"/);
assert.match(resetPage, /id="passwordResetEmail"/);
assert.match(resetPage, /id="alertContainer"/);
assert.doesNotMatch(resetPage, /ipfest_2026|IPFEST 2026|DM\+Sans/);
assert.match(resetCss, /ipfest-background\.jpg/);
assert.match(resetCss, /\.reset-header\s*\{[^}]*background:\s*#fff;/);
assert.match(resetCss, /\.reset-panel\s*\{[^}]*background:\s*rgba\(22,\s*33,\s*62/);
assert.match(resetCss, /\.reset-panel\s*\{[^}]*padding:\s*2rem;/);
assert.doesNotMatch(resetCss, /\.reset-panel\s*\{[^}]*box-shadow:/);
assert.match(resetCss, /@media\(max-width:575\.98px\)/);

const comingSoon = readFileSync(path.join(root, 'public/coming-soon.html'), 'utf8');
const merchandise = readFileSync(path.join(root, 'public/merchandise.html'), 'utf8');
const merchandiseCatalog = readFileSync(path.join(root, 'public/merchandise-catalog.html'), 'utf8');
assert.match(comingSoon, /static\/images\/Oii%20mikir\.PNG/);
assert(statSync(path.join(root, 'public/static/images', 'Oii mikir.PNG')).isFile(), 'Missing Coming Soon mascot image');
assert.match(readFileSync(path.join(root, 'public/static/css/coming-soon.css'), 'utf8'), /\.\.\/images\/ipfest-background\.jpg/);
assert.doesNotMatch(comingSoon, /Merchandise|<nav\b/i);
assert.match(merchandise, /class="coming-soon-page"/);
assert.match(merchandise, /<h1[^>]*>Merchandise is not available yet<\/h1>/);
assert.match(merchandise, /static\/images\/Oii%20mikir\.PNG/);
assert.match(merchandise, /static\/css\/coming-soon\.css/);
assert.doesNotMatch(merchandise, /location\.replace|http-equiv="refresh"/);
assert.match(merchandiseCatalog, /id="checkout-form"/);
assert.match(merchandiseCatalog, /id="cart-badge"/);
assert.match(merchandiseCatalog, /Order Now/);
for (const file of ['index.html', 'events/ipconvex.html', 'events/ipexpo.html', 'events/iptraining.html']) {
  const html = readFileSync(path.join(root, 'public', file), 'utf8');
  assert.match(html, /href="(?:\.\.\/)?merchandise\.html"/);
  assert.doesNotMatch(html, /alert\(['"]Merchandise is not available yet['"]\)/);
}

const notFound = readFileSync(path.join(root, 'public/404.html'), 'utf8');
assert.match(notFound, /class="error-button error-button-secondary" href="https:\/\/wa\.me\/\+6285136328278">Contact Us/);
const notFoundCopy = notFound.match(/<p>We're sorry,[\s\S]*?<\/p>/)?.[0] ?? '';
assert(notFoundCopy && !/<a\b/.test(notFoundCopy), '404 contact mention in the paragraph should not be a link');

const errorCss = readFileSync(path.join(root, 'public/static/css/error-pages.css'), 'utf8');
assert.match(errorCss, /--navy:\s*#16213E/i);
assert.match(errorCss, /--gold:\s*#E6C72A/i);
