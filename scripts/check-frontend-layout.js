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
assert.match(competitionManager, /ref\(ref\(caseStorage, manager\.competition\), `\$\{Date\.now\(\)\}_\$\{file\.name\}`\)/);

const treasury = readFileSync(path.join(root, 'src/treasury.js'), 'utf8');
const delegatesRelation = readFileSync(path.join(root, 'src/delegates-relation.js'), 'utf8');
const delegatesRelationHtml = readFileSync(path.join(root, 'public/dashboard/delegates-relation.html'), 'utf8');
const delegatesRelationCss = readFileSync(path.join(root, 'public/static/css/delegates-relation-grand.css'), 'utf8');
assert.match(treasury, /onSnapshot\(collection\(DB, 'Team'\)/);
assert.match(delegatesRelation, /onSnapshot\(collection\(DB, 'Team'\)/);
assert.doesNotMatch(treasury, /deleteField|data-delete-final/, 'Treasury may verify, not delete final payment records');
assert.match(treasury, /httpsCallable\(FUNCTIONS, 'updatePaymentVerifications'\)/);
assert.match(competitionManager, /httpsCallable\(FUNCTIONS, 'updateCompetitionResult'\)/);
assert.match(competitionManager, /httpsCallable\(FUNCTIONS, 'publishCompetitionCase'\)/);
assert.match(treasury, /getRoleClaims\(user\)/);
assert.match(delegatesRelation, /getRoleClaims\(user\)/);
assert.match(delegatesRelationHtml, /<p class="cm-help"><span class="cm-leader-tag">Leader<\/span> menandai ketua tim\. Baris di bawahnya adalah anggota tim yang sama\.<\/p>/);
assert.match(delegatesRelation, /personCells\(leader,\s*fmt,\s*true\)/);
assert.match(delegatesRelation, /cm-leader-tag/);
assert.match(delegatesRelation, /cm-badge-pending/);
assert.match(delegatesRelationCss, /\.delrel-stage \.cm-help\s*\{/);
assert.match(delegatesRelationCss, /\.delrel-stage \.cm-leader-tag\s*\{/);
assert.match(delegatesRelationCss, /\.delrel-stage \.cm-badge-pending\s*\{/);
const delegatesSource = readFileSync(path.join(root, 'src/delegates.js'), 'utf8');
assert.doesNotMatch(delegatesSource, /getDocs\(collection\(DB,\s*['"]Team['"]\)/, 'participants must not download all Team records for a fallback search');

const registrationSource = readFileSync(path.join(root, 'src/registration.js'), 'utf8');
assert.match(registrationSource, /payments\/\$\{user\.uid\}\/\$\{Date\.now\(\)\}_/);
assert.ok(registrationSource.indexOf('createUserWithEmailAndPassword(AUTH, email, password)') < registrationSource.indexOf('payments/${user.uid}/'), 'Payment upload must happen after Auth user creation');

const delegates = readFileSync(path.join(root, 'src/delegates.js'), 'utf8');
assert.match(delegates, /preliminary_submissions\/\$\{currentUserID\}\//);

const scManager = readFileSync(path.join(root, 'src/compe-manager-sc.js'), 'utf8');
assert.match(scManager, /escapeHTML\(/);
assert.doesNotMatch(scManager, /\$\{(?:teamName|univ|compe|leader\.\w+|m\.\w+)\}/);

const standardManagerHtml = readFileSync(path.join(root, 'public/dashboard/compe-manager.html'), 'utf8');
for (const tableId of ['db-table', 'submission-table', 'submission-table-final']) {
  assert.match(standardManagerHtml, new RegExp(`<table id="${tableId}"[\\s\\S]*?<th scope="col">Student Card</th>`), `${tableId} must show the Student Card column`);
}
for (const [tableId, html] of [
  ['db-table', readFileSync(path.join(root, 'public/dashboard/smart-competition/manager.html'), 'utf8')],
  ['selection-table', readFileSync(path.join(root, 'public/dashboard/smart-competition/manager.html'), 'utf8')]
]) {
  assert.match(html, new RegExp(`<table id="${tableId}"[\\s\\S]*?<th scope="col">Student Card</th>`), `Smart Competition ${tableId} must show the Student Card column`);
}
for (const [file, source] of [['compe-manager.js', competitionManager], ['compe-manager-sc.js', scManager]]) {
  assert.match(source, /privateStorageLink\(/, `${file} must use temporary private Storage links`);
  assert.match(source, /studentCardUrl\s*\?\?\s*\w+\.studentCardURL/, `${file} must support both participant card field names`);
  assert.match(source, /teamStudentCardCell\s*=\s*\(team\)\s*=>\s*\[team\.leader,\s*\.\.\./, `${file} team cells must include leader and members`);
}
assert.ok((competitionManager.match(/teamStudentCardCell\(team\)/g) || []).length >= 2, 'standard manager submission tables must show every team member card');
assert.match(competitionManager, /a\.dataset\.privateStoragePath\s*\|\|/, 'standard manager exports must retain private object paths');
assert.match(competitionManager, /const DB_COLS = 16/);
assert.match(competitionManager, /const PRELIM_COLS = 9/);
assert.match(competitionManager, /const FINAL_COLS = 6/);
assert.match(scManager, /teamStudentCardCell\(teamData\)/, 'Smart Competition preliminary table must show team member cards');

const merchManager = readFileSync(path.join(root, 'src/merchmanager.js'), 'utf8');
assert.match(merchManager, /escapeHTML\(/);
assert.match(merchManager, /privateStorageLink\(/);
assert.doesNotMatch(merchManager, /\$\{data\.customer_info\?\.\w+\s*\|\|\s*"-"\}/);
assert.doesNotMatch(merchManager, /href="\$\{data\.files\?\./);

const eventAttendance = readFileSync(path.join(root, 'src/event-attendance.js'), 'utf8');
assert.match(eventAttendance, /cell\.textContent\s*=/);
assert.doesNotMatch(eventAttendance, /\$\{(?:name|univ|major|batch|nim|email|checkin|checkout)\}/);
assert.doesNotMatch(eventAttendance, /issueAttendanceCertificate|Issue certificate/);
assert.doesNotMatch(readFileSync(path.join(root, 'public/dashboard/event.html'), 'utf8'), /<th[^>]*>\s*Certificate\s*<\/th>/i);

for (const file of [
  'registration.js', 'delegates.js', 'delegates-sc.js', 'compe-manager.js', 'merchandise.js',
  'merchmanager.js', 'treasury.js', 'delegates-relation.js'
]) {
  const source = readFileSync(path.join(root, 'src', file), 'utf8');
  assert.doesNotMatch(source, /getDownloadURL\(/, `${file} must not mint persistent bearer URLs`);
}
for (const file of ['registration.js', 'delegates.js', 'delegates-sc.js', 'compe-manager.js', 'merchandise.js']) {
  assert.match(readFileSync(path.join(root, 'src', file), 'utf8'), /privateStorageLink|privateStoragePathOf|\.fullPath/);
}
for (const file of ['ct-start.js', 'ct-finish.js', 'gi-start.js', 'gi-finish.js']) {
  assert.doesNotMatch(readFileSync(path.join(root, 'src', file), 'utf8'), /getDoc\(docRef\)/, `${file} must rely on bounded attendance Rules, not expose public reads`);
}

for (const file of ['login.js', 'login-sc.js']) {
  const script = readFileSync(path.join(root, 'src', file), 'utf8');
  assert.match(script, /auth\/invalid-login-credentials/, `${file} must treat auth/invalid-login-credentials as a credential error instead of redirecting to 400.html`);
}
assert.match(readFileSync(path.join(root, 'src', 'login.js'), 'utf8'), /auth\/too-many-requests/, 'login.js must handle auth/too-many-requests');

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
