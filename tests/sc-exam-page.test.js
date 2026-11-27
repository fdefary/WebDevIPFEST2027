import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { answerLayout, submitLabel } from '../src/shared/sc-question-view.js'

// Runs the real participant page script against a fake DOM built from sesi-1.html,
// so a lookup for an ID the page does not have fails here as it does in a browser.
const html = readFileSync('public/dashboard/smart-competition/sesi-1.html', 'utf8')
const source = readFileSync('src/pages/competition/sc_prelim.js', 'utf8').replace(/^import .*$/gm, '')

function element(classes = '') {
  const names = new Set(classes.split(/\s+/).filter(Boolean))
  const listeners = {}
  const node = {
    value: '', textContent: '', disabled: false, type: '', step: '', style: {}, children: [],
    classList: {
      add: (name) => names.add(name),
      remove: (name) => names.delete(name),
      contains: (name) => names.has(name),
      toggle: (name, on = !names.has(name)) => { on ? names.add(name) : names.delete(name) }
    },
    set className(value) { names.clear(); value.split(/\s+/).filter(Boolean).forEach((name) => names.add(name)) },
    addEventListener: (type, handler) => { listeners[type] = handler },
    emit: (type) => listeners[type]?.(),
    append: (...nodes) => { node.children.push(...nodes) },
    replaceChildren: (...nodes) => { node.children = nodes },
    querySelector: () => element()
  }
  return node
}

const flush = async () => { for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setImmediate(resolve)) }

function inProgress(overrides = {}) {
  const { category = 'Short Answer', assets = [], ...rest } = overrides
  const questionNumber = rest.questionNumber ?? 1
  return {
    status: 'in_progress', sessionId: 'session-1', questionNumber, questionCount: 30,
    question: { number: questionNumber, question: `Question text ${questionNumber}`, category, assets, formulaLatex: '' },
    answer: '', remainingMs: 14000, ...rest
  }
}

// `tab` stands in for sessionStorage, which a reload of the same tab keeps.
async function openPage(t, server, tab = {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 })
  const elements = {}
  for (const [tag, id] of html.matchAll(/<[a-z][^>]*?\sid="([^"]+)"[^>]*>/g)) {
    elements[id] = element(tag.match(/\sclass="([^"]*)"/)?.[1])
  }
  const events = {}
  const document = {
    hidden: false,
    getElementById: (id) => elements[id] ?? null,
    createElement: () => element(),
    addEventListener: (type, handler) => { events[type] = handler }
  }
  const window = { location: { href: '' }, addEventListener: (type, handler) => { events[type] = handler } }
  const calls = []
  let authChanged
  let signOuts = 0
  const dependencies = {
    document, window,
    localStorage: { setItem: () => {} },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    AUTH: {}, FUNCTIONS: {}, answerLayout, submitLabel,
    sessionStorage: { getItem: (key) => tab[key] ?? null, setItem: (key, value) => { tab[key] = String(value) } },
    signOut: async () => { signOuts += 1 },
    onAuthStateChanged: (_auth, callback) => {
      authChanged = callback
      callback({ uid: 'team-1', email: 'leader@example.test' })
    },
    httpsCallable: (_functions, name) => async (data) => {
      calls.push({ name, data, at: Date.now() })
      return { data: await server(name, data) }
    }
  }
  new Function(...Object.keys(dependencies), source)(...Object.values(dependencies))
  await flush()
  return {
    $: (id) => elements[id],
    calls,
    named: (name) => calls.filter((call) => call.name === name),
    hidden: (id) => elements[id].classList.contains('d-none'),
    async elapse(ms) {
      for (let passed = 0; passed < ms; passed += 250) {
        t.mock.timers.tick(250)
        await flush()
      }
    },
    async fire(type) { events[type]?.(); await flush() },
    async signInAs(email) { authChanged({ uid: email, email }); await flush() },
    signOuts: () => signOuts,
    location: window.location
  }
}

test('displays the active question with a running timer', async (t) => {
  const page = await openPage(t, () => inProgress())
  assert.equal(page.$('question-text').textContent, 'Question text 1')
  assert.equal(page.hidden('exam-question'), false)
  assert.equal(page.hidden('exam-status'), true)
  const first = Number(page.$('exam-timer').textContent)
  await page.elapse(2000)
  assert.equal(Number(page.$('exam-timer').textContent), first - 2)
})

function type(page, text, id = 'exam-answer-short') {
  page.$(id).value = text
  page.$(id).emit('input')
}

const advances = (page) => page.calls.filter((call) => ['advanceExamQuestion', 'submitExam'].includes(call.name))
const failure = (code) => Object.assign(new Error(`failed with ${code}`), { code })

test('saves drafts while the participant types without pausing', async (t) => {
  const page = await openPage(t, (name) => name === 'saveParticipantDraft' ? { saved: true } : inProgress())
  for (let i = 1; i <= 16; i += 1) {
    type(page, 'x'.repeat(i))
    await page.elapse(250)
  }
  assert.ok(page.named('saveParticipantDraft').length >= 1)
})

test('sends the timed-out answer early enough to beat the server deadline', async (t) => {
  const page = await openPage(t, (name) => name === 'getParticipantExamState' ? inProgress() : { saved: true, status: 'submitted' })
  const loadedAt = Date.now()
  type(page, 'last words')
  await page.elapse(14000)
  const [sent] = advances(page)
  assert.equal(sent.data.response, 'last words')
  assert.ok(sent.at - loadedAt <= 13000, `sent after ${sent.at - loadedAt} ms of 14000`)
})

test('keeps a five-word short answer editable instead of sending it', async (t) => {
  const page = await openPage(t, () => inProgress())
  type(page, 'one two three four five')
  page.$('exam-continue').emit('click')
  await page.elapse(3000)
  assert.equal(advances(page).length, 0)
  assert.equal(page.$('exam-answer-short').value, 'one two three four five')
  assert.equal(page.hidden('exam-status'), false)
  assert.match(page.$('exam-status').textContent, /four words/i)
})

test('lets the server use the saved draft when a too-long answer times out', async (t) => {
  const page = await openPage(t, (name) => name === 'getParticipantExamState' ? inProgress() : { saved: true, status: 'submitted' })
  page.$('exam-answer-short').value = 'one two three four five'
  await page.elapse(14000)
  const [sent] = advances(page)
  assert.equal(sent.data.questionNumber, 1)
  assert.equal(sent.data.response, undefined)
})

// A page reloaded while a draft was still being saved shows an empty box, although the server will
// have the draft. That empty box must not replace it.
test('leaves the answer out when an untouched empty box times out or is submitted', async (t) => {
  for (const submit of [false, true]) {
    await t.test(submit ? 'submitted' : 'timed out', async (t) => {
      const page = await openPage(t, (name) => name === 'getParticipantExamState' ? inProgress() : { status: 'submitted' })
      if (submit) {
        page.$('exam-continue').emit('click')
        await flush()
      } else await page.elapse(14000)
      const [sent] = advances(page)
      assert.equal(sent.data.questionNumber, 1)
      assert.equal('response' in sent.data, false)
    })
  }
})

test('shows a draft that arrives late instead of saving the empty box over it', async (t) => {
  let draft = ''
  const page = await openPage(t, (name) => name === 'saveParticipantDraft' ? { saved: true } : inProgress({ answer: draft }))
  draft = 'saved before the reload'
  await page.fire('visibilitychange')
  await page.elapse(3000)
  assert.equal(page.$('exam-answer-short').value, 'saved before the reload')
  assert.equal(page.named('saveParticipantDraft').length, 0)
})

test('still sends an empty answer when the team deletes what it typed', async (t) => {
  const page = await openPage(t, (name) => name === 'getParticipantExamState' ? inProgress({ answer: 'old' }) : { status: 'submitted' })
  type(page, '')
  page.$('exam-continue').emit('click')
  await flush()
  assert.equal(advances(page)[0].data.response, '')
})

test('restores typed text after a reload, before the server has the draft', async (t) => {
  const tab = { 'sc-typed:session-1:1': 'typed before reload' }
  const page = await openPage(t, (name) => name === 'getParticipantExamState' ? inProgress() : { saved: true, status: 'submitted' }, tab)
  assert.equal(page.$('exam-answer-short').value, 'typed before reload')
  await page.elapse(750)
  assert.equal(page.named('saveParticipantDraft').at(-1).data.response, 'typed before reload')
  page.$('exam-continue').emit('click')
  await flush()
  assert.equal(advances(page)[0].data.response, 'typed before reload')
})

test('remembers typed text only for the question it was typed in', async (t) => {
  const tab = {}
  const page = await openPage(t, (name) => name === 'advanceExamQuestion' ? inProgress({ questionNumber: 2 })
    : name === 'getParticipantExamState' ? inProgress() : { saved: true }, tab)
  type(page, 'first answer')
  assert.deepEqual(tab, { 'sc-typed:session-1:1': 'first answer' })
  page.$('exam-continue').emit('click')
  await flush()
  assert.equal(page.$('exam-answer-short').value, '')
})

test('keeps typed text and re-saves it when the same question is refreshed', async (t) => {
  const page = await openPage(t, (name) => name === 'saveParticipantDraft' ? { saved: true } : inProgress({ answer: 'old' }))
  page.$('exam-answer-short').value = 'newer text'
  await page.fire('visibilitychange')
  assert.equal(page.$('exam-answer-short').value, 'newer text')
  await page.elapse(750)
  assert.equal(page.named('saveParticipantDraft').at(-1).data.response, 'newer text')
})

test('retries a failed first load until the server answers', async (t) => {
  let attempts = 0
  const page = await openPage(t, () => {
    attempts += 1
    if (attempts < 4) throw failure('functions/internal')
    return inProgress()
  })
  assert.equal(page.hidden('exam-question'), true)
  await page.elapse(20000)
  assert.equal(page.$('question-text').textContent, 'Question text 1')
  assert.equal(page.hidden('exam-question'), false)
})

test('does not keep retrying when the team has no exam session', async (t) => {
  const page = await openPage(t, () => { throw failure('functions/not-found') })
  await page.elapse(30000)
  assert.equal(page.calls.length, 1)
})

test('keeps the active question and typed text when a refresh or submit fails', async (t) => {
  let online = true
  const page = await openPage(t, (name) => {
    if (!online) throw failure('functions/unavailable')
    return name === 'saveParticipantDraft' ? { saved: true } : inProgress({ remainingMs: 60000 })
  })
  page.$('exam-answer-short').value = 'my answer'
  online = false
  await page.fire('visibilitychange')
  assert.equal(page.hidden('exam-question'), false)
  page.$('exam-continue').emit('click')
  await page.elapse(3000)
  online = true
  await page.fire('online')
  assert.equal(page.$('exam-answer-short').value, 'my answer')
  assert.equal(page.$('exam-answer-short').disabled, false)
  assert.equal(page.$('exam-continue').disabled, false)
  assert.equal(page.hidden('exam-status'), true)
})

test('ignores a late refresh reply for an earlier question', async (t) => {
  let releaseStale
  let loads = 0
  const page = await openPage(t, (name) => {
    if (name === 'advanceExamQuestion') return inProgress({ questionNumber: 2 })
    loads += 1
    if (loads === 1) return inProgress()
    return new Promise((resolve) => { releaseStale = () => resolve(inProgress()) })
  })
  await page.fire('visibilitychange')
  page.$('exam-continue').emit('click')
  await flush()
  releaseStale()
  await flush()
  assert.equal(page.$('question-text').textContent, 'Question text 2')
})

test('starts the countdown without waiting for question images', async (t) => {
  const page = await openPage(t, (name) => name === 'getExamAssetUrl'
    ? new Promise(() => {}) : inProgress({ assets: ['SC_ExamAssets/a/diagram.png'] }))
  const first = Number(page.$('exam-timer').textContent)
  await page.elapse(2000)
  assert.equal(Number(page.$('exam-timer').textContent), first - 2)
})

test('shows each image once when refreshes overlap', async (t) => {
  const pending = []
  const page = await openPage(t, (name) => name === 'getExamAssetUrl'
    ? new Promise((resolve) => pending.push(() => resolve({ url: 'https://example.test/diagram.png' })))
    : inProgress({ assets: ['SC_ExamAssets/a/diagram.png'] }))
  await page.fire('visibilitychange')
  pending.forEach((release) => release())
  await flush()
  assert.equal(page.$('question-assets').children.length, 1)
})

const serverError = (code, message) => Object.assign(new Error(message), { code })
const noTeamRecord = () => serverError('functions/not-found', 'Registered team not found.')

test('names the signed-in account and offers logout when it is not a registered team', async (t) => {
  const page = await openPage(t, () => { throw noTeamRecord() })
  assert.match(page.$('exam-status').textContent, /account isn.t a registered team/i)
  assert.match(page.$('exam-status').textContent, /leader@example\.test/)
  assert.equal(page.hidden('exam-account'), false)
  page.$('exam-switch-account').emit('click')
  await flush()
  assert.equal(page.signOuts(), 1)
  assert.equal(page.location.href, 'loginsc.html')
})

test('treats a team outside Smart Competition as not a registered team', async (t) => {
  const page = await openPage(t, () => {
    throw serverError('functions/permission-denied', 'Only the registered Smart Competition team leader may take the exam.')
  })
  assert.match(page.$('exam-status').textContent, /account isn.t a registered team/i)
  assert.equal(page.hidden('exam-account'), false)
})

test('keeps other permanent reasons and still shows which account is signed in', async (t) => {
  const page = await openPage(t, () => { throw serverError('functions/not-found', 'No exam session is assigned to this team.') })
  assert.match(page.$('exam-status').textContent, /No exam session is assigned/)
  assert.match(page.$('exam-status').textContent, /leader@example\.test/)
  assert.equal(page.hidden('exam-account'), false)
})

test('does not offer logout for a temporary connection problem', async (t) => {
  const page = await openPage(t, () => { throw failure('functions/unavailable') })
  assert.equal(page.hidden('exam-account'), true)
})

test('removes the question and stops its timer when another account takes over', async (t) => {
  let isTeam = true
  const page = await openPage(t, () => {
    if (!isTeam) throw noTeamRecord()
    return inProgress()
  })
  isTeam = false
  await page.signInAs('admin@example.test')
  assert.equal(page.hidden('exam-question'), true)
  assert.match(page.$('exam-status').textContent, /admin@example\.test/)
  await page.elapse(20000)
  assert.equal(advances(page).length, 0)
})

test('clears the account notice when the team account returns', async (t) => {
  let isTeam = false
  const page = await openPage(t, () => {
    if (!isTeam) throw noTeamRecord()
    return inProgress()
  })
  isTeam = true
  await page.signInAs('leader@example.test')
  assert.equal(page.hidden('exam-account'), true)
  assert.equal(page.hidden('exam-question'), false)
  assert.equal(page.$('question-text').textContent, 'Question text 1')
})

test('turns the timer amber in the last ten seconds and red in the last five, then resets', async (t) => {
  const page = await openPage(t, (name) => name === 'advanceExamQuestion'
    ? inProgress({ questionNumber: 2, remainingMs: 25000 }) : inProgress())
  const colour = () => ['is-warn', 'is-danger'].filter((name) => page.$('exam-timer-box')?.classList.contains(name)).join()
  assert.equal(colour(), '')
  await page.elapse(3000)
  assert.equal(colour(), 'is-warn')
  await page.elapse(5000)
  assert.equal(colour(), 'is-danger')
  page.$('exam-continue').emit('click')
  await flush()
  assert.equal(colour(), '')
})

test('tells teams to type their answers, not to choose from options', () => {
  const note = html.match(/id="exam-note">([\s\S]*?)<\/p>/)[1]
  assert.match(note, /type your answer/i)
  assert.doesNotMatch(note, /choose one answer|current choice/i)
  assert.doesNotMatch(html, /timer-q-/, 'the old script watched timers that no longer exist')
})

test('reports a resume when the connection returns, but not for routine tab switches', async (t) => {
  const page = await openPage(t, () => inProgress())
  await page.fire('online')
  assert.equal(page.named('getParticipantExamState').at(-1).data.resume, true)
  await page.fire('visibilitychange')
  assert.equal(page.named('getParticipantExamState').at(-1).data.resume, false)
})
