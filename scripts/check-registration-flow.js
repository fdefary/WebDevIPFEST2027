import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('public/register.html', 'utf8');
const css = readFileSync('public/static/css/register.css', 'utf8');
const script = readFileSync('src/registration.js', 'utf8');
const adminHtml = readFileSync('public/dashboard/delegates-relation.html', 'utf8');
const adminScript = readFileSync('src/delegates-relation.js', 'utf8');
const validation = readFileSync('public/static/js/validation.js', 'utf8');

const steps = [...html.matchAll(/data-registration-step="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(steps, ['competition', 'leader', 'members', 'account', 'payment']);
assert.deepEqual([...html.matchAll(/class="registration-progress-step[^\"]*" data-step="([^\"]+)"/g)].map((match) => match[1]), steps);
assert.match(script, /registration-progress-step/);
assert.match(script, /setAttribute\("aria-current", "step"\)/);
assert.match(script, /setProperty\("--step-progress"/);
assert.match(html, /class="navbar registration-navbar"[\s\S]*ipfest_2027_logo\.png[\s\S]*ipfest_2027_text\.png/);
assert.match(html, /<main class="registration-shell">/);
assert.match(html, /<html lang="en">/);
assert.match(html, /<title>IPFEST 2027 Registration<\/title>/);
assert.match(html, /<label for="gender" class="form-label">Gender<\/label>[\s\S]*?<select name="gender" id="gender" class="form-select" required>[\s\S]*?<option value="Male">Male<\/option>[\s\S]*?<option value="Female">Female<\/option>/);
assert.match(script, /<label for="gender\$\{i\}" class="form-label">Gender<\/label>[\s\S]*?<select name="gender\$\{i\}" id="gender\$\{i\}" class="form-select" required>[\s\S]*?<option value="Male">Male<\/option>[\s\S]*?<option value="Female">Female<\/option>/);
assert.match(script, /const gender = document\.getElementById\("gender"\)\?\.value/);
assert.match(script, /leader:\s*\{[\s\S]*?gender,/);
assert.match(script, /const mGender = document\.getElementById\(`gender\$\{i\}`\)\?\.value/);
assert.match(script, /if \([\s\S]*?!mGender[\s\S]*?\)[\s\S]*?throw new Error/);
assert.match(script, /const member = \{[\s\S]*?gender: mGender,/);
assert.match(adminHtml, /<th scope="col">Gender<\/th>/);
assert.match(adminScript, /<td>\$\{esc\(p\.gender \?\? p\.sex\)\}<\/td>/);
assert.doesNotMatch(html, /id="step-count"/);
assert.doesNotMatch(script, /#step-count/);
assert.match(css, /\.registration-heading p \{ max-width:none;/);
assert.doesNotMatch(html, /gap-10/);
assert.match(html, /name="email"[^>]*id="email"/);
assert.match(html, /name="password"[^>]*id="password"/);
assert.match(html, /name="confirmPassword"[^>]*id="confirmPassword"/);
assert.match(html, /id="memberCount"/);
assert.doesNotMatch(html, /other-batch|Angkatan kamu|value="0">Lainnya/);
assert.doesNotMatch(script, /otherBatch|other-batch/);
assert.match(html, /id="payment-proof"/);
assert.match(html, /data-next>Continue to Team Leader Information<\/button>/);
assert.match(html, /class="btn btn-primary" data-back>Back<\/button>/);
assert.match(script, /const validateStep = \(\) => \{\s*if \(currentStep === 0 && !compeInput\.value\)/);
assert.match(script, /const validateStep = \(\) => \{[\s\S]*?return true;/);
assert.doesNotMatch(script, /step\.checkValidity\(\)/);
assert.doesNotMatch(script, /const invalidField = step\.querySelector\(":invalid"\)/);
assert.match(html, /data-method="Bank BCA"[\s\S]*data-method="Gopay"[\s\S]*data-method="Paypal"/);
assert.match(html, /banks-logo\/bca\.png/);
assert.match(html, /banks-logo\/gopay\.png/);
assert.match(html, /banks-logo\/paypal\.png/);
assert.match(html, /class="payment-panel[^"]*"[^>]*role="tabpanel"/);
assert.match(script, /setAttribute\("aria-selected", String\(selected\)\)/);
assert.match(script, /classList\.toggle\('active', selected\)/);
assert.match(css, /\.payment-panel \{[^\n]*background:transparent/);
assert.match(css, /#payment \.form-check \{[^\n]*display:flex[^\n]*align-items:center/);
assert.match(css, /#payment \.form-check \.invalid-feedback \{[^\n]*flex-basis:100%/);
assert.match(html, /<fieldset class="registration-subsection">[\s\S]*<legend>Team Leader Details<\/legend>/);
assert.match(html, /<span class="registration-progress-label">Team Leader Information<\/span>/);
assert.doesNotMatch(html, /<legend>Informasi Tim<\/legend>|<legend>Identitas &amp; Kontak<\/legend>/);
assert.match(html, /<legend>Required Documents<\/legend>/);
assert.match(script, /class="registration-subsection-grid member-details"/);
assert.match(script, /<legend>Identity &amp; Contact Information<\/legend>/);
assert.match(script, /<legend>Required Documents<\/legend>/);
for (const copy of [
  'Choose one competition', 'Prepare Your Twibbon Proof', 'Team Members', 'Account Setup',
  'Upload payment proof', 'I agree to the terms and conditions', 'Please select a competition first.',
  'Total payment', 'Transfer to BCA account', 'Send GoPay to', 'Pay through',
  'Personal &amp; Academic Details', 'Class year', "Enter member ${i}'s first name.",
  'Upload proof that member ${i} follows IPFEST on Instagram.'
]) {
  assert(html.includes(copy) || script.includes(copy), `Missing English registration copy: ${copy}`);
}
assert.match(css, /\.registration-subsection-grid \{[^\n]*grid-template-columns:1fr/);
assert.match(css, /\.registration-subsection-grid \{[^\n]*gap:1\.5rem/);
assert.match(css, /\.registration-subsection \.row \{[^\n]*display:grid[^\n]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css, /\.registration-subsection \.form-label \{[^\n]*display:block/);
assert.match(css, /#account > \.row \{[^\n]*display:grid[^\n]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css, /#account > \.row > \[class\*="col-"\] \{[^\n]*width:auto[^\n]*padding:0/);
assert.match(css, /\.form-control, \.form-select \{[^\n]*min-height:42px/);
assert.match(css, /ipfest-background\.jpg/);
assert.match(css, /\.registration-shell[^\n]*max-width:1320px[^\n]*margin:2rem auto 4rem/);
assert.match(css, /grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,480px\),1fr\)\)/);
assert.match(css, /\.card-compe \{[^\n]*grid-template-columns:4rem minmax\(0,1fr\)/);
assert.doesNotMatch(css, /--registration-left/);
assert.match(css, /body \{\s*margin:\s*0;/);
assert.match(css, /\.registration-navbar \.navbar-brand img:first-child[^\n]*width:96px/);
assert.match(css, /\.registration-navbar \.navbar-brand img:last-child[^\n]*width:156px/);
assert.match(css, /\.registration-navbar \.navbar-brand:focus-visible/);
assert.match(css, /\.registration-navbar \.navbar-brand img:first-child[^\n]*margin-right:-39px/);
assert.match(css, /\.registration-navbar \.navbar-brand \{ gap:24px;/);
assert.match(css, /\.registration-heading h1[^\n]*"Plus Jakarta Sans SemiBold"/);
assert.match(css, /\.registration-step > h2[^\n]*"Plus Jakarta Sans SemiBold"/);
assert.match(script, /teamMemberCondition/);
assert.match(script, /createUserWithEmailAndPassword/);
assert.match(script, /setDoc\(doc\(DB, "Team", user\.uid\), teamData\)/);
assert.match(validation, /data-registration-step/);
