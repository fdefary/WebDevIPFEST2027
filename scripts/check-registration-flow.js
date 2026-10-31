import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('public/register.html', 'utf8');
const css = readFileSync('public/static/css/register.css', 'utf8');
const script = readFileSync('src/registration.js', 'utf8');
const pricing = readFileSync('src/shared/registration-pricing.js', 'utf8');
const treasury = readFileSync('src/treasury.js', 'utf8');
const firestoreRules = readFileSync('firestore.rules', 'utf8');
const adminHtml = readFileSync('public/dashboard/delegates-relation.html', 'utf8');
const adminScript = readFileSync('src/delegates-relation.js', 'utf8');
const validation = readFileSync('public/static/js/validation.js', 'utf8');
const teamDocuments = readFileSync('src/shared/team-documents.js', 'utf8');

const steps = [...html.matchAll(/data-registration-step="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(steps, ['competition', 'leader', 'members', 'account', 'payment']);
assert.deepEqual([...html.matchAll(/class="registration-progress-step[^\"]*" data-step="([^\"]+)"/g)].map((match) => match[1]), steps);
assert.match(script, /registration-progress-step/);
assert.match(script, /setAttribute\("aria-current", "step"\)/);
assert.match(script, /setProperty\("--step-progress"/);
assert.match(html, /class="[^"]*\bregistration-navbar\b[^"]*"[\s\S]*ipfest_2027_logo\.png[\s\S]*ipfest_2027_text\.png/);
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
assert.match(script, /firstInvalidRegistrationStep\(steps\)/);
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
assert.doesNotMatch(script, /<legend>Required Documents<\/legend>/);
for (const copy of [
  'Choose one competition', 'Prepare Your Twibbon Proof', 'Team Members', 'Account Setup',
  'Upload payment proof', 'I agree to the terms and conditions', 'Please select a competition first.',
  'Total payment', 'Transfer to BCA account', 'Send GoPay to', 'Pay through',
  'Personal &amp; Academic Details', 'Class year', "Enter member ${i}'s first name."
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
assert.match(script, /registrationPriceAt\(new Date\(\)\)/);
assert.match(script, /teamData\.payment_amount = registrationPrice\.amount/);
assert.match(pricing, /2026-11-12T00:00:00\+07:00/);
assert.match(pricing, /2026-12-05T00:00:00\+07:00/);
assert.match(treasury, /if \(typeof t\.payment_amount === 'number'\) return t\.payment_amount/);
assert.match(firestoreRules, /request\.resource\.data\.payment_amount == registrationAmount\(request\.time\)/);
assert.match(firestoreRules, /request\.resource\.data\.join_on == request\.time/);
for (const [source, description] of [[html, 'leader'], [script, 'generated member']]) {
  assert.match(source, /<option value="2026"(?: selected)?>(?:2026)<\/option>/, `${description} Class Year must include 2026`);
  assert.doesNotMatch(source, /<option value="2021">2021<\/option>/, `${description} Class Year must not include 2021`);
}
assert.match(html, /<button type="button" class="card-compe" data-value="smart competition" aria-pressed="false">[\s\S]*?<span class="card-title">Smart Competition<\/span>/, 'Smart Competition must be selectable');
assert.doesNotMatch(html.match(/<button[^>]*data-value="smart competition"[^>]*>/)?.[0] ?? '', /\bdisabled\b/);
assert.doesNotMatch(script, /selectedCompetition === ["']smart competition["']/);
assert.match(script, /["']smart competition["']:\s*\[2,\s*3\]/, 'Smart Competition must retain the two- or three-person team sizes');
assert.match(script, /createUserWithEmailAndPassword/);
assert.match(script, /setDoc\(doc\(DB, "Team", user\.uid\), teamData\)/);
for (const copy of [
  'Upload the student ID card of every team member. Only student ID cards are accepted. Make sure the name, student ID number, and university are easy to read. Put all ID cards in one PDF file named [CompetitionName]_[TeamName]_StudentID.pdf.',
  'Upload a screenshot of the IPFest 2027 twibbon post on each team member’s Instagram feed. The screenshot must show the username and the full post, including the caption. Make sure the caption follows the given guidelines. Put all proof in one PDF file named [CompetitionName]_[TeamName]_Twibbon.pdf.',
  'Upload screenshots showing that each team member follows these accounts:',
  'Instagram: @ipfest27', 'TikTok: @ipfest27', 'LinkedIn: Integrated Petroleum Festival',
  'The screenshots must show the “Following” status. Put all proof in one PDF file named [CompetitionName]_[TeamName]_Follow.pdf.',
  'Upload a screenshot of each team member’s Instagram Story sharing the post of the competition you are registering for. The story must mention @ipfest27. The screenshot must show the username and the mention. Put all proof in one PDF file named [CompetitionName]_[TeamName]_AddToStory.pdf.',
  'Upload screenshots showing that each team member has liked and reposted the Instagram post of the competition you are registering for. Put all proof in one PDF file named [CompetitionName]_[TeamName]_LikeRepost.pdf.'
]) assert.ok(html.includes(copy), `Missing team document instructions: ${copy}`);
for (const id of ['student-id-card-pdf', 'twibbon-pdf', 'social-media-follow-pdf', 'instagram-story-share-pdf', 'like-and-repost-pdf']) {
  assert.match(html, new RegExp(`<input[^>]*id="${id}"[^>]*type="file"|<input[^>]*type="file"[^>]*id="${id}"`), `${id} must be a file upload`);
  assert.match(html, new RegExp(`<input[^>]*id="${id}"[^>]*accept="application/pdf"[^>]*required|<input[^>]*accept="application/pdf"[^>]*required[^>]*id="${id}"`), `${id} must require a PDF`);
}
assert.match(html, /Social Media Follow/);
assert.doesNotMatch(script, /studentCardPhoto\$\{i\}|twibbon\$\{i\}|follow-ig\$\{i\}/, 'team proofs must not be requested per member');
assert.match(script, /teamDocumentPath\(user\.uid, selectedCompetition, teamName, definition\.suffix\)/);
assert.match(script, /teamData\.teamDocuments\s*=/);
assert.doesNotMatch(script, /leaderUploads/, 'Registration must not reference the removed per-leader upload object');
assert.match(script, /await isValidTeamDocumentFile\(file\)/, 'Validate PDF contents and Storage size before creating the account');
assert.match(script, /file\.type\s*&&\s*file\.type\s*!==\s*['"]application\/pdf['"][\s\S]*?file\.name\.toLowerCase\(\)\.endsWith\(['"]\.pdf['"]\)/, 'Reject non-PDF MIME types even when the filename ends in .pdf');
assert.match(script, /teamDocumentPath\(user\.uid, selectedCompetition, teamName, definition\.suffix\)[\s\S]*?['"]application\/pdf['"]/, 'Store team documents with PDF content type');
assert.match(teamDocuments, /export const TEAM_DOCUMENTS/);
assert.ok(script.indexOf('firstInvalidRegistrationStep(steps)', script.indexOf("registrationForm.addEventListener('submit'")) < script.indexOf('createUserWithEmailAndPassword(AUTH, email, password)'), 'Validate every step before creating a Firebase account');
assert.match(validation, /data-registration-step/);
