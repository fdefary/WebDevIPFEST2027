import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync('src/app/index.js', 'utf8')
const emulatorConfig = JSON.parse(readFileSync('firebase.exam-emulators.json', 'utf8'))
const productionConfig = JSON.parse(readFileSync('firebase.json', 'utf8'))
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const webpackConfig = readFileSync('webpack.config.babel.js', 'utf8')

test('local development uses a demo Firebase project and connects every service to emulators', () => {
  assert.match(appSource, /process\.env\.NODE_ENV\s*===\s*['"]development['"]/)
  assert.match(appSource, /demo-ipfest-local/)
  assert.match(appSource, /connectAuthEmulator/)
  assert.match(appSource, /connectFirestoreEmulator/)
  assert.match(appSource, /connectFunctionsEmulator/)
  assert.match(appSource, /connectStorageEmulator/)
  assert.equal(emulatorConfig.emulators.auth.port, 39099)
  assert.equal(emulatorConfig.emulators.firestore.port, 39180)
  assert.equal(emulatorConfig.emulators.functions.port, 35001)
  assert.equal(emulatorConfig.emulators.storage.port, 39199)
  assert.equal(emulatorConfig.emulators.pubsub.port, 38501)
  assert.match(readFileSync('functions/.env.demo-ipfest-local', 'utf8'), /GOOGLE_CLOUD_UNIVERSE_DOMAIN=googleapis\.com/)
  assert.equal(packageJson.scripts['dev:exam:emulators'], 'firebase emulators:start --config firebase.exam-emulators.json --project demo-ipfest-local')
  assert.ok(productionConfig.functions[0].ignore.includes('.env.demo-ipfest-local'))
})

test('production frontend configuration remains the registered IPFEST project', () => {
  assert.match(appSource, /projectId:\s*['"]ipfest-2027['"]/)
})

test('webpack serves development bundles in development mode', () => {
  assert.match(webpackConfig, /export default\s*\([^)]*argv[^)]*\)\s*=>/)
  assert.match(webpackConfig, /mode:\s*argv\.mode\s*\|\|\s*['"]production['"]/) 
  assert.match(webpackConfig, /publicPath:\s*['"]\/dist\/['"]/) 
  assert.match(webpackConfig, /devtool:\s*false/)
  assert.match(webpackConfig, /splitChunks:\s*argv\.mode\s*===\s*['"]development['"]\s*\?\s*false/)
})

test('emulator seed script hardcodes a demo project and localhost endpoints', () => {
  const seedSource = readFileSync('functions/scripts/seed-exam-emulator.js', 'utf8')
  assert.match(seedSource, /demo-ipfest-local/)
  assert.match(seedSource, /127\.0\.0\.1/)
  assert.match(seedSource, /SC_ExamAttempts/)
  assert.match(seedSource, /collection\('Events'\)/)
  assert.doesNotMatch(seedSource, /--project\s+ipfest-2027/)
})
