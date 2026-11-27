import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// A function missing from the documented deploy command never reaches the live site.
// Certificate functions stay out on purpose until certificate issuing is approved.
const deferred = ['issueAttendanceCertificate', 'generateCertificate']
const exported = [...readFileSync('functions/src/index.js', 'utf8').matchAll(/^exports\.(\w+)\s*=/gm)]
  .map(([, name]) => name)

for (const file of ['README.md', 'docs/firebase-production-setup.md']) {
  test(`${file} deploys every function except the deferred certificate ones`, () => {
    const command = readFileSync(file, 'utf8').split('\n').find((line) => line.includes('firebase deploy --only functions:'))
    assert.ok(command, 'missing the targeted Functions deploy command')
    const listed = [...command.matchAll(/functions:(\w+)/g)].map(([, name]) => name)
    assert.deepEqual([...listed].sort(), exported.filter((name) => !deferred.includes(name)).sort())
  })
}
