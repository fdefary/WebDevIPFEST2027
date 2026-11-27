const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { test } = require('node:test')

// Every function loads src/index.js when it starts, so anything loaded there slows the exam's cold starts.
test('loading the functions does not load the certificate-only libraries', () => {
  const script = `
    require('./src/index.js')
    const loaded = ['pdf-lib', '@google-cloud/storage', 'nodemailer']
      .filter((name) => require.cache[require.resolve(name)])
    process.stdout.write(JSON.stringify(loaded))
  `
  const output = execFileSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'), env: { ...process.env, GCLOUD_PROJECT: 'demo-ipfest-test' }
  })
  assert.deepEqual(JSON.parse(output.toString()), [])
})
