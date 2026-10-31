const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')

test('certificate emails attach the PDF instead of using a long-lived signed URL', () => {
  const source = readFileSync(require.resolve('../index'), 'utf8')
  assert.doesNotMatch(source, /expires:\s*['"]03-09-2491['"]/, 'certificate link must not be valid for centuries')
  assert.match(source, /content:\s*Buffer\.from\(pdfBytes\)/)
})
