const assert = require('node:assert/strict')
const { test } = require('node:test')
const { examAssetUrl } = require('../src/exam/asset-url')

test('production exam images use a signed link that lasts five minutes', async () => {
  const asked = []
  const file = { getSignedUrl: async (options) => { asked.push(options); return ['https://signed.example.test/image'] } }
  const before = Date.now()
  assert.equal(await examAssetUrl(file, { emulator: false }), 'https://signed.example.test/image')
  assert.equal(asked[0].action, 'read')
  assert.ok(asked[0].expires >= before + 5 * 60 * 1000 && asked[0].expires <= Date.now() + 5 * 60 * 1000)
})

test('local emulator exam images use the emulator download link, which needs no cloud credentials', async () => {
  const file = { getSignedUrl: async () => { throw new Error('Could not load the default credentials.') } }
  assert.equal(await examAssetUrl(file, { emulator: true, downloadUrl: async () => 'http://127.0.0.1:1/image' }),
    'http://127.0.0.1:1/image')
})

// The SDK's getDownloadURL sends no sign-in to the emulator, so Storage Rules deny it. The admin
// metadata request is not subject to Rules and carries the download token.
test('the default local link is built from the token in the admin metadata', async (t) => {
  const previous = process.env.STORAGE_EMULATOR_HOST
  process.env.STORAGE_EMULATOR_HOST = 'http://127.0.0.1:39199'
  t.after(() => {
    if (previous === undefined) delete process.env.STORAGE_EMULATOR_HOST
    else process.env.STORAGE_EMULATOR_HOST = previous
  })
  const file = {
    name: 'SC_ExamAssets/admin 1/graph.png',
    bucket: { name: 'demo.appspot.com' },
    getMetadata: async () => [{ metadata: { firebaseStorageDownloadTokens: 'first-token,second-token' } }]
  }
  assert.equal(await examAssetUrl(file, { emulator: true }),
    'http://127.0.0.1:39199/v0/b/demo.appspot.com/o/SC_ExamAssets%2Fadmin%201%2Fgraph.png?alt=media&token=first-token')
})

test('a local image without a download token is reported, not linked', async () => {
  const file = { name: 'a.png', bucket: { name: 'demo' }, getMetadata: async () => [{}] }
  await assert.rejects(examAssetUrl(file, { emulator: true }), /no download token/i)
})

test('only the Functions emulator switches away from signed links', async () => {
  const file = { getSignedUrl: async () => ['https://signed.example.test/image'] }
  const previous = process.env.FUNCTIONS_EMULATOR
  delete process.env.FUNCTIONS_EMULATOR
  try {
    assert.equal(await examAssetUrl(file, { downloadUrl: async () => 'emulator-link' }), 'https://signed.example.test/image')
    process.env.FUNCTIONS_EMULATOR = 'true'
    assert.equal(await examAssetUrl(file, { downloadUrl: async () => 'emulator-link' }), 'emulator-link')
  } finally {
    if (previous === undefined) delete process.env.FUNCTIONS_EMULATOR
    else process.env.FUNCTIONS_EMULATOR = previous
  }
})
