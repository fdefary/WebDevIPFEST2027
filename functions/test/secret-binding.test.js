const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8')

assert.equal(/\bpass\s*:\s*['"][^'"]{8,}['"]/i.test(source), false, 'SMTP password must not be hard-coded')
assert.match(source, /defineSecret\(['"]MAILGUN_SMTP_PASSWORD['"]\)/, 'SMTP password must use Firebase Secret Manager')
assert.match(source, /secrets\s*:\s*\[[^\]]*mailgunSmtpPassword[^\]]*\]/, 'Secret must be bound to the certificate function')
assert.match(source, /mailgunSmtpPassword\.value\(\)/, 'Secret must be read at function invocation')
assert.match(source, /document:\s*['"]Certificates\/\{docId\}['"]/, 'Certificate trigger path must remain unchanged')
assert.match(source, /region:\s*['"]asia-southeast2['"]/, 'Certificate trigger region must remain unchanged')
