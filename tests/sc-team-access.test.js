import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const flush = async () => { for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setImmediate(resolve)) }

// ---- Exam login (loginsc.html): runs the real script with Firebase replaced ----
const loginSource = readFileSync('src/pages/auth/login-sc.js', 'utf8').replace(/^import .*$/gm, '')

async function signInAtExamLogin(records) {
  let submit
  const seen = { signOuts: 0, writes: 0, failures: 0, errors: [] }
  const button = { textContent: 'Sign in', disabled: false, dataset: {} }
  const form = {
    email: { value: 'leader@example.test' }, password: { value: 'secret' },
    querySelector: () => button, reset: () => {},
    addEventListener: (_type, handler) => { submit = handler }
  }
  const window = { location: { href: 'http://localhost/dashboard/smart-competition/loginsc.html', origin: 'http://localhost' } }
  const dependencies = {
    window,
    document: { querySelector: () => form },
    localStorage: { getItem: () => null, removeItem: () => {} },
    console: { log: () => {}, error: (...parts) => seen.errors.push(parts.join(' ')) },
    alert: () => {},
    AUTH: {}, DB: {},
    signInWithEmailAndPassword: async () => ({ user: { uid: 'team-1' } }),
    signOut: async () => { seen.signOuts += 1 },
    failedLogin: () => { seen.failures += 1 },
    doc: (_db, collection, id) => `${collection}/${id}`,
    getDoc: async (path) => ({ exists: () => path in records, data: () => records[path] }),
    setDoc: async () => { seen.writes += 1 }
  }
  new Function(...Object.keys(dependencies), loginSource)(...Object.values(dependencies))
  await submit({ preventDefault: () => {} })
  await flush()
  return { ...seen, destination: window.location.href }
}

test('lets a registered Smart Competition team in without any older selection record', async () => {
  const result = await signInAtExamLogin({ 'Team/team-1': { competition: 'smart competition' } })
  assert.equal(result.destination, 'sesi-1.html')
  assert.equal(result.signOuts, 0)
  assert.equal(result.writes, 0, 'signing in must not write the old answer record')
})

for (const [label, records] of [
  ['an account without a team record', {}],
  ['a team from another competition', { 'Team/team-1': { competition: 'business case' } }],
  ['an account that only has the old selection record', { 'SC_Selection/team-1': { team: 'Old' } }]
]) {
  test(`turns away ${label} at the exam login`, async () => {
    const result = await signInAtExamLogin(records)
    assert.equal(result.signOuts, 1)
    assert.equal(result.failures, 1)
    assert.notEqual(result.destination, 'sesi-1.html')
  })
}

// ---- Start button on the team dashboard ----
function dashboardCard() {
  const element = (...initial) => {
    const classes = new Set(initial)
    const node = {
      textContent: '', href: undefined,
      classList: {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        toggle: (name, on) => { on ? classes.add(name) : classes.delete(name) },
        contains: (name) => classes.has(name)
      },
      setAttribute: () => {},
      removeAttribute: (name) => { if (name === 'href') node.href = undefined }
    }
    return node
  }
  return { card: element('d-none'), link: element('pe-none', 'opacity-50') }
}

let copies = 0

async function showSchedule(t, load) {
  t.mock.timers.enable({ apis: ['setInterval'] })
  // A fresh copy for each test: the module keeps its timer handle, and clearing a handle left over from
  // an earlier fake clock stops the next fake clock from firing.
  const { watchTestLink } = await import(`../src/shared/sc-test-link.js?copy=${copies += 1}`)
  const { card, link } = dashboardCard()
  watchTestLink({ card, link, loadSchedule: load })
  await flush()
  return {
    hidden: () => card.classList.contains('d-none'),
    usable: () => link.href === 'sesi-1.html' && !link.classList.contains('pe-none'),
    label: () => link.textContent,
    async later(ms) { t.mock.timers.tick(ms); await flush() }
  }
}

const times = { opensAtMs: 1_000, closesAtMs: 2_000 }

for (const [status, label] of [['open', 'Start Test'], ['in_progress', 'Resume Test']]) {
  test(`offers "${label}" when the team exam is ${status}`, async (t) => {
    const view = await showSchedule(t, async () => ({ status, ...times }))
    assert.equal(view.hidden(), false)
    assert.equal(view.usable(), true)
    assert.equal(view.label(), label)
  })
}

for (const [status, label] of [['submitted', 'Test Completed'], ['closed', 'Test Closed']]) {
  test(`shows "${label}" without a link when the team exam is ${status}`, async (t) => {
    const view = await showSchedule(t, async () => ({ status, ...times }))
    assert.equal(view.hidden(), false)
    assert.equal(view.usable(), false)
    assert.equal(view.label(), label)
  })
}

test('keeps the card hidden until the team window opens, then shows it by itself', async (t) => {
  let status = 'scheduled'
  const view = await showSchedule(t, async () => ({ status, ...times }))
  assert.equal(view.hidden(), true)
  status = 'open'
  await view.later(30_000)
  assert.equal(view.hidden(), false)
  assert.equal(view.usable(), true)
})

test('keeps the card hidden for a team with no assigned session', async (t) => {
  const view = await showSchedule(t, async () => { throw Object.assign(new Error('No exam session'), { code: 'functions/not-found' }) })
  assert.equal(view.hidden(), true)
})

test('says so when the schedule cannot be checked, and recovers on the next check', async (t) => {
  let online = false
  const view = await showSchedule(t, async () => {
    if (!online) throw Object.assign(new Error('offline'), { code: 'functions/unavailable' })
    return { status: 'open', ...times }
  })
  assert.equal(view.hidden(), false)
  assert.equal(view.usable(), false)
  assert.match(view.label(), /could not check/i)
  online = true
  await view.later(30_000)
  assert.equal(view.usable(), true)
})

test('the team dashboard asks the read-only schedule function, never the one that starts an attempt', () => {
  const dashboard = readFileSync('src/pages/competition/delegates-sc.js', 'utf8')
  assert.match(dashboard, /'getParticipantExamSchedule'/)
  assert.doesNotMatch(dashboard, /getParticipantExamState|sc-schedule/)
  assert.match(readFileSync('functions/src/index.js', 'utf8'), /exports\.getParticipantExamSchedule = examCall/)
})
