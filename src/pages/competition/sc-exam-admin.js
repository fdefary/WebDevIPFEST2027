import { onAuthStateChanged, signOut } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { ref, uploadBytes } from 'firebase/storage'
import { AUTH, FUNCTIONS, STORAGE } from '../../app/index.js'
import { getRoleClaims } from '../../shared/role-claims.js'
import { parsePacketCsv, parsePacketPdf } from '../../shared/exam-packet-import.js'
import { answerLayout, submitLabel } from '../../shared/sc-question-view.js'

const PARTICIPANT_PAGE = 'sesi-1.html'
const byId = (id) => document.getElementById(id)
const call = (name, data = {}) => httpsCallable(FUNCTIONS, name)(data).then((result) => result.data)
const categories = ['Short Answer', 'Long Answer', 'List-Based', 'Calculation']
const categoryOrder = [
  ...Array(20).fill('Short Answer'), ...Array(5).fill('Long Answer'),
  ...Array(3).fill('List-Based'), ...Array(2).fill('Calculation')
]
let currentUser = null
let questions = []
// Problems with the imported file itself. Rows cannot show them, so the admin confirms them.
let importNotices = []
let dashboard = { packets: [], teams: [], sessions: [], attempts: [] }
let previewQuestions = []
let previewNumber = 1
let previewRender = 0
let participantMarkup = null

function message(text, kind = 'info', boxId = 'exam-admin-message') {
  const box = byId(boxId)
  box.className = `alert alert-${kind}`
  box.textContent = text
}

// Session messages sit beside the Save button; the page-level box is out of view from there.
const sessionMessage = (text, kind) => message(text, kind, 'session-message')

// Each team has one session, so a team that has one can only be changed from that session.
function renderTeamOptions(editingSessionId) {
  const select = byId('session-team')
  const taken = new Set(dashboard.sessions
    .filter((session) => session.teamId && session.sessionId !== editingSessionId)
    .map((session) => session.teamId))
  const selected = select.value
  select.replaceChildren(new Option('None (draft)', ''))
  for (const team of dashboard.teams) {
    const note = taken.has(team.teamId) ? ' (has a session: use Edit on its row)' : ''
    const option = new Option(`${team.teamName} — ${team.university}${note}`, team.teamId)
    option.disabled = taken.has(team.teamId)
    select.add(option)
  }
  const stillAvailable = dashboard.teams.some((team) => team.teamId === selected && !taken.has(team.teamId))
  select.value = stillAvailable ? selected : ''
}

function formatError(error) {
  return error?.message || 'The request could not be completed. Refresh and try again.'
}

function field(tag, className, value = '') {
  const node = document.createElement(tag)
  node.className = className
  node.value = value ?? ''
  return node
}

function readRow(index) {
  const model = questions[index]
  const tr = document.createElement('tr')
  const number = field('input', 'form-control form-control-sm', model.number)
  number.type = 'number'
  number.min = '1'
  number.addEventListener('input', () => { model.number = number.value === '' ? NaN : Number(number.value); refreshWarnings() })
  const question = field('textarea', 'form-control form-control-sm', model.question)
  question.rows = 3
  question.addEventListener('input', () => { model.question = question.value; refreshWarnings() })
  const answer = field('textarea', 'form-control form-control-sm', model.answer)
  answer.rows = 3
  answer.addEventListener('input', () => { model.answer = answer.value; refreshWarnings() })
  const category = field('select', 'form-select form-select-sm')
  for (const value of categories) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = value
    category.append(option)
  }
  category.value = model.category
  category.addEventListener('change', () => { model.category = category.value; refreshWarnings(); renderReview() })
  const tolerance = field('input', 'form-control form-control-sm', model.tolerance)
  tolerance.type = 'number'
  tolerance.min = '0'
  tolerance.step = 'any'
  tolerance.disabled = model.category !== 'Calculation'
  tolerance.placeholder = model.category === 'Calculation' ? 'Required' : '—'
  tolerance.addEventListener('input', () => { model.tolerance = tolerance.value === '' ? null : Number(tolerance.value); refreshWarnings() })
  const asset = field('input', 'form-control form-control-sm')
  asset.type = 'file'
  asset.accept = 'image/png,image/jpeg,image/webp'
  asset.addEventListener('change', () => { model.assetFile = asset.files?.[0] || null })
  const formula = field('textarea', 'form-control form-control-sm', model.formulaLatex)
  formula.rows = 2
  formula.placeholder = 'Optional LaTeX formula'
  formula.addEventListener('input', () => { model.formulaLatex = formula.value })

  const remove = document.createElement('button')
  remove.type = 'button'
  remove.className = 'btn btn-sm btn-outline-danger'
  remove.textContent = 'Delete'
  remove.addEventListener('click', () => deleteRow(model, tr))

  for (const control of [number, question, answer, category, tolerance, asset, formula, remove]) {
    const td = document.createElement('td')
    td.append(control)
    tr.append(td)
  }
  return tr
}

function showRowCount() {
  byId('packet-row-count').textContent = String(questions.length)
  byId('packet-review').classList.toggle('d-none', questions.length === 0)
}

// Takes out only this row, so the other rows keep the images already chosen for them.
function deleteRow(model, tr) {
  if (!window.confirm(`Delete the row numbered ${model.number}? This cannot be undone.`)) return
  questions.splice(questions.indexOf(model), 1)
  const body = byId('packet-question-list')
  body.replaceChildren(...Array.from(body.children).filter((row) => row !== tr))
  showRowCount()
  refreshWarnings()
}

function renderReview() {
  const body = byId('packet-question-list')
  body.replaceChildren(...questions.map((_, index) => readRow(index)))
  showRowCount()
  refreshWarnings()
}

function refreshWarnings() {
  // Worked out from the rows as they are now, so a corrected problem disappears.
  const warnings = []
  if (questions.length !== 30) warnings.push(`A packet must contain exactly 30 questions (currently ${questions.length}).`)
  questions.forEach((question, index) => {
    const expected = categoryOrder[index]
    if (question.number !== index + 1) warnings.push(`Row ${index + 1}: No must be ${index + 1}.`)
    if (question.category !== expected) warnings.push(`Question ${index + 1}: category must be ${expected}.`)
    if (!question.question.trim()) warnings.push(`Question ${index + 1}: question text is required.`)
    if (!question.answer.trim()) warnings.push(`Question ${index + 1}: answer key is required.`)
    if (question.category === 'Calculation' && (!Number.isFinite(question.tolerance) || question.tolerance < 0)) {
      warnings.push(`Question ${index + 1}: enter a non-negative Calculation tolerance.`)
    }
  })
  const uniqueWarnings = [...new Set(warnings)]
  const box = byId('packet-warnings')
  box.textContent = uniqueWarnings.join('\n')
  box.classList.toggle('d-none', uniqueWarnings.length === 0)
  byId('packet-notice-list').textContent = importNotices.join('\n')
  byId('packet-notices').classList.toggle('d-none', importNotices.length === 0)
  byId('packet-save').disabled = uniqueWarnings.length > 0 || importNotices.length > 0
    || !byId('packet-name').value.trim()
}

function addQuestionRow() {
  questions.push({ number: questions.length + 1, question: '', answer: '', category: categoryOrder[questions.length] || 'Short Answer', assets: [], formulaLatex: '', tolerance: null })
  renderReview()
}

async function importPacket() {
  const file = byId('packet-file').files?.[0]
  if (!file) return message('Choose a CSV or PDF file first.', 'warning')
  try {
    const parsed = file.name.toLowerCase().endsWith('.pdf') ? await parsePacketPdf(file) : await parsePacketCsv(file)
    questions = parsed.questions
    importNotices = parsed.notices
    renderReview()
    message('Compare every row with your file, and correct any warnings before saving.', 'success')
  } catch (error) {
    questions = []
    importNotices = []
    renderReview()
    message(formatError(error), 'danger')
  }
}

async function savePacket() {
  const name = byId('packet-name').value.trim()
  if (!name || byId('packet-save').disabled) return
  const saveButton = byId('packet-save')
  saveButton.disabled = true
  try {
    const prepared = []
    for (const question of questions) {
      const assets = [...(question.assets || [])]
      if (question.assetFile) {
        if (question.assetFile.size > 5 * 1024 * 1024) throw new Error(`Image for question ${question.number} exceeds 5 MB.`)
        const safeName = question.assetFile.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80)
        const path = `SC_ExamAssets/${currentUser.uid}/${crypto.randomUUID()}-${safeName}`
        await uploadBytes(ref(STORAGE, path), question.assetFile, { contentType: question.assetFile.type })
        assets.push(path)
      }
      prepared.push({
        number: question.number, question: question.question.trim(), answer: question.answer.trim(),
        category: question.category, assets, formulaLatex: question.formulaLatex.trim(),
        ...(question.category === 'Calculation' ? { tolerance: question.tolerance } : {})
      })
    }
    const result = await call('createExamPacket', {
      packetName: name,
      sourceType: byId('packet-file').files?.[0]?.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'CSV',
      questions: prepared
    })
    message(`Packet saved as ${result.packetId}. Saved packet content is now immutable.`, 'success')
    byId('packet-name').value = ''
    byId('packet-file').value = ''
    questions = []
    importNotices = []
    renderReview()
    await loadDashboard()
  } catch (error) {
    message(formatError(error), 'danger')
    refreshWarnings()
  }
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

// Spreadsheets run a cell that starts like a formula; a leading apostrophe keeps it as text. Text after
// ';', a tab or a line break is guarded too, because some regional settings start a new cell there.
// Plain numbers are left alone.
function asSpreadsheetText(value) {
  const text = String(value ?? '')
  if (/^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(text)) return text
  return text
    .replace(/^(?=[\t\r]|\s*[=+\-@＝＋－＠])/, "'")
    .replace(/([;\t\r\n]\s*)(?=[=+\-@＝＋－＠])/g, "$1'")
}

function downloadCsv(filename, lines) {
  const csv = lines.map((line) => line.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function downloadPacket(packetId) {
  const packet = await call('getAdminExamPacket', { packetId })
  const lines = [
    ['No', 'Question', 'Answer', 'Category'],
    ...packet.questions.map((question) => [question.number, question.question, question.answer, question.category])
  ]
  downloadCsv(`${packet.name.replace(/[^A-Za-z0-9_-]/g, '_')}.csv`, lines)
}

async function downloadExamExport(session) {
  const result = await call('exportExamSubmissions', { sessionId: session.sessionId })
  const headers = ['Team', 'Team ID', 'Packet', 'Question', 'Category', 'Submitted Answer', 'Answer Key', 'Verdict', 'Judge Score']
  // Team names and answers are typed by participants. Extract CSV stays as written, to be imported again.
  const lines = [headers, ...result.rows.map((row) => headers.map((header) => asSpreadsheetText(row[header])))]
  downloadCsv(`SC-Exam-${session.teamId}-${session.sessionId}.csv`, lines)
  message('CSV export downloaded. Unanswered questions are blank.', 'success')
}

function renderPackets() {
  const body = byId('packet-library-list')
  body.replaceChildren()
  const packetOptions = [new Option('Choose a packet', '')]
  for (const packet of dashboard.packets) {
    const tr = document.createElement('tr')
    const name = document.createElement('td')
    name.textContent = packet.name
    const count = document.createElement('td')
    count.textContent = `${packet.questionCount} questions`
    const used = document.createElement('td')
    used.textContent = packet.usedEver ? 'Used' : packet.assignedEver ? 'Assigned' : 'Not assigned'
    const actions = document.createElement('td')
    const download = document.createElement('button')
    download.type = 'button'
    download.className = 'btn btn-sm btn-outline-primary me-2'
    download.textContent = 'Extract CSV'
    download.addEventListener('click', () => downloadPacket(packet.packetId).catch((error) => message(formatError(error), 'danger')))
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'btn btn-sm btn-outline-danger'
    remove.textContent = 'Remove'
    remove.disabled = packet.assignedEver || packet.usedEver
    remove.title = remove.disabled ? 'Assigned or used packets cannot be removed.' : 'Remove packet'
    remove.addEventListener('click', async () => {
      try {
        await call('removeExamPacket', { packetId: packet.packetId })
        message(`Removed packet ${packet.name}.`, 'success')
        await loadDashboard()
      } catch (error) { message(formatError(error), 'danger') }
    })
    actions.append(download, remove)
    tr.append(name, count, used, actions)
    body.append(tr)
    packetOptions.push(new Option(packet.name, packet.packetId))
  }
  if (!dashboard.packets.length) body.append(Object.assign(document.createElement('tr'), { textContent: 'No packets uploaded yet.' }))
  const packetSelect = byId('session-packet')
  const selected = packetSelect.value
  packetSelect.replaceChildren(...packetOptions)
  if (dashboard.packets.some((packet) => packet.packetId === selected)) packetSelect.value = selected
}

// Firestore times arrive from a callable as { _seconds }.
function toDate(value) {
  return value?.toDate ? value.toDate()
    : Number.isFinite(value?._seconds) ? new Date(value._seconds * 1000)
      : new Date(value)
}

function dateValue(value) {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const questionSeconds = (category) => category === 'Short Answer' ? 14 : category === 'Calculation' ? 60 : 25

async function participantPage() {
  if (!participantMarkup) {
    const response = await fetch(PARTICIPANT_PAGE)
    if (!response.ok) throw new Error('Could not load the participant page for the preview.')
    participantMarkup = await response.text()
  }
  return new DOMParser().parseFromString(participantMarkup, 'text/html')
}

// Fills a copy of the participant page, so the preview shows what teams see. Its scripts are removed,
// and only question fields are written into it, never the answer key.
async function renderPreview() {
  const render = ++previewRender
  const question = previewQuestions[previewNumber - 1]
  const total = previewQuestions.length
  const seconds = questionSeconds(question.category)
  byId('preview-count').textContent = `${previewNumber} / ${total} · ${seconds} s`
  byId('preview-previous').disabled = previewNumber <= 1
  byId('preview-next').disabled = previewNumber >= total

  const page = await participantPage()
  page.querySelectorAll('script').forEach((script) => script.remove())
  const part = (id) => page.getElementById(id)
  const layout = answerLayout(question.category)
  part('exam-panel').classList.toggle('d-none', false)
  part('question-heading').textContent = `Question ${previewNumber} of ${total} · ${question.category}`
  part('question-text').textContent = question.question
  part('exam-timer').textContent = String(seconds)
  const field = part(layout.long ? 'exam-answer-long' : 'exam-answer-short')
  if (!layout.long) field.type = layout.inputType
  field.classList.toggle('d-none', false)
  field.disabled = true
  part('answer-hint').classList.toggle('d-none', !layout.listHint)
  part('exam-continue').textContent = submitLabel(previewNumber, total)
  part('exam-continue').disabled = true
  if (question.formulaLatex) {
    const code = page.createElement('code')
    code.textContent = question.formulaLatex
    part('question-formula').append(code)
  }
  for (const path of question.assets || []) {
    try {
      const { url } = await call('getExamAssetUrl', { path })
      const image = page.createElement('img')
      image.src = url
      image.alt = 'Question illustration'
      image.className = 'img-fluid rounded mb-2'
      part('question-assets').append(image)
    } catch (error) {
      console.error('Cannot load question asset', error)
      const warning = page.createElement('p')
      warning.className = 'alert alert-warning'
      warning.textContent = 'An image for this question could not be loaded.'
      part('question-assets').append(warning)
    }
  }
  if (render !== previewRender) return
  byId('exam-preview-frame').srcdoc = `<!DOCTYPE html>${page.documentElement.outerHTML}`
}

function showPreviewQuestion(number) {
  previewNumber = number
  renderPreview().catch((error) => message(formatError(error), 'danger'))
}

async function openPreview(packetId, session = null) {
  message('Loading participant preview…')
  try {
    const packet = await call('getAdminExamPacket', { packetId })
    previewQuestions = packet.questions
    previewNumber = 1
    const meta = byId('preview-session-meta')
    meta.classList.toggle('d-none', !session)
    if (session) {
      const team = dashboard.teams.find((item) => item.teamId === session.teamId)
      meta.textContent = `Team: ${team?.teamName || 'None (draft)'} · Opens: ${new Date(dateValue(session.opensAt)).toLocaleString()} · Closes: ${new Date(dateValue(session.closesAt)).toLocaleString()}`
    }
    byId('exam-preview').classList.remove('d-none')
    await renderPreview()
    byId('exam-admin-message').classList.add('d-none')
    byId('exam-preview').scrollIntoView({ behavior: 'smooth' })
  } catch (error) { message(formatError(error), 'danger') }
}

const EVENT_LABELS = {
  session_created: 'Session created', session_updated: 'Session changed', started: 'Exam started',
  resumed: 'Exam page resumed', reconnect_cutoff: 'Cut off: away longer than 3 minutes',
  session_closed: 'Closed when the session window ended', exam_complete: 'Exam completed'
}
const END_REASONS = {
  reconnect_cutoff: 'away longer than 3 minutes', session_closed: 'the session window ended',
  exam_complete: 'all questions finished'
}
const SESSION_FIELDS = { packetId: 'packet', teamId: 'team', opensAt: 'opening time', closesAt: 'closing time' }

function changedFields({ previous, current }) {
  if (!previous || !current) return ''
  const comparable = (key, value) => key.endsWith('At') ? toDate(value).getTime() : value
  const names = Object.keys(SESSION_FIELDS)
    .filter((key) => comparable(key, previous[key]) !== comparable(key, current[key]))
    .map((key) => SESSION_FIELDS[key])
  return names.length ? ` (${names.join(', ')})` : ''
}

function textNode(tag, text, className = '') {
  const node = document.createElement(tag)
  node.className = className
  node.textContent = text
  return node
}

function attemptStatus(session, attempt) {
  const cell = document.createElement('td')
  if (!attempt) {
    cell.textContent = session.teamId ? 'Assigned' : 'Draft'
    return cell
  }
  if (attempt.status === 'in_progress') {
    cell.textContent = 'In progress'
    return cell
  }
  const reason = END_REASONS[attempt.submissionReason]
  cell.append(
    textNode('div', reason ? `Submitted: ${reason}` : 'Submitted'),
    textNode('div', `Completed ${attempt.completedThrough} of 30`, 'small text-secondary')
  )
  return cell
}

// Session edits and the team's own events in one list, oldest first.
function historyOf(session, attempt) {
  const events = [...(session.events || []), ...(attempt?.events || [])]
    .sort((a, b) => toDate(a.at) - toDate(b.at))
  if (!events.length) return null
  const history = document.createElement('details')
  history.className = 'small mt-2'
  const list = document.createElement('ul')
  list.className = 'mb-0 ps-3'
  for (const event of events) {
    const label = `${EVENT_LABELS[event.type] || event.type}${event.type === 'session_updated' ? changedFields(event) : ''}`
    list.append(textNode('li', `${toDate(event.at).toLocaleString()} · ${label}`))
  }
  history.append(textNode('summary', `History (${events.length})`), list)
  return history
}

function renderSessions() {
  const body = byId('exam-session-list')
  body.replaceChildren()
  renderTeamOptions(byId('session-id').value)
  const packetNames = new Map(dashboard.packets.map((packet) => [packet.packetId, packet.name]))
  const teamNames = new Map(dashboard.teams.map((team) => [team.teamId, team.teamName]))

  for (const session of dashboard.sessions) {
    const tr = document.createElement('tr')
    const team = document.createElement('td')
    team.textContent = session.teamId ? teamNames.get(session.teamId) || session.teamId : 'Draft (no team)'
    const packet = document.createElement('td')
    packet.textContent = packetNames.get(session.packetId) || session.packetId
    const window = document.createElement('td')
    window.textContent = `${new Date(dateValue(session.opensAt)).toLocaleString()} – ${new Date(dateValue(session.closesAt)).toLocaleString()}`
    const attempt = dashboard.attempts.find((item) => item.teamId === session.teamId)
    const status = attemptStatus(session, attempt)
    const actions = document.createElement('td')
    const edit = document.createElement('button')
    edit.type = 'button'
    edit.className = 'btn btn-sm btn-outline-secondary me-2'
    edit.textContent = 'Edit'
    edit.addEventListener('click', () => {
      byId('session-id').value = session.sessionId
      byId('session-packet').value = session.packetId
      renderTeamOptions(session.sessionId)
      byId('session-team').value = session.teamId || ''
      byId('session-opens').value = dateValue(session.opensAt)
      byId('session-closes').value = dateValue(session.closesAt)
      byId('session-team').disabled = Boolean(session.teamId)
      // The server refuses this change too; the export pairs answers with the session's packet.
      byId('session-packet').disabled = Boolean(attempt)
      byId('session-heading').scrollIntoView({ behavior: 'smooth' })
      sessionMessage(attempt
        ? 'This team has already started, so its packet can no longer be changed. You can still change the times.'
        : 'Session loaded into the form. Update the packet or times, then save. An assigned team stays fixed.', 'info')
    })
    const preview = document.createElement('button')
    preview.type = 'button'
    preview.className = 'btn btn-sm btn-outline-primary me-2'
    preview.textContent = 'Preview'
    preview.addEventListener('click', () => openPreview(session.packetId, session))
    actions.append(edit, preview)
    if (session.teamId) {
      const exportButton = document.createElement('button')
      exportButton.type = 'button'
      exportButton.className = 'btn btn-sm btn-outline-success'
      exportButton.textContent = 'Export CSV'
      exportButton.addEventListener('click', () => downloadExamExport(session).catch((error) => message(formatError(error), 'danger')))
      actions.append(exportButton)
    }
    const history = historyOf(session, attempt)
    if (history) actions.append(history)
    tr.append(team, packet, window, status, actions)
    body.append(tr)
  }
  if (!dashboard.sessions.length) body.append(Object.assign(document.createElement('tr'), { textContent: 'No sessions created yet.' }))
}

async function loadDashboard() {
  const result = await call('getAdminExamData')
  dashboard = { ...dashboard, ...result }
  renderPackets()
  renderSessions()
}

byId('packet-file').addEventListener('change', () => { questions = []; importNotices = []; renderReview() })
byId('packet-confirm-notices').addEventListener('click', () => { importNotices = []; refreshWarnings() })
byId('packet-name').addEventListener('input', refreshWarnings)
byId('packet-import').addEventListener('click', importPacket)
byId('packet-add-row').addEventListener('click', addQuestionRow)
byId('packet-save').addEventListener('click', savePacket)
byId('session-reset').addEventListener('click', () => {
  byId('exam-session-form').reset()
  byId('session-id').value = ''
  byId('session-team').disabled = false
  byId('session-packet').disabled = false
  renderTeamOptions('')
  sessionMessage('', 'info')
  byId('session-message').classList.add('d-none')
})
byId('exam-session-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const opensAtMs = Date.parse(byId('session-opens').value)
  const closesAtMs = Date.parse(byId('session-closes').value)
  try {
    await call('assignExamSession', {
      sessionId: byId('session-id').value || undefined,
      packetId: byId('session-packet').value,
      teamId: byId('session-team').value || null,
      opensAtMs, closesAtMs
    })
    byId('session-reset').click()
    sessionMessage('Session saved. Changes appear to participants on their next reload or refetch.', 'success')
    await loadDashboard()
  } catch (error) { sessionMessage(formatError(error), 'danger') }
})
byId('preview-close').addEventListener('click', () => byId('exam-preview').classList.add('d-none'))
byId('preview-previous').addEventListener('click', () => showPreviewQuestion(previewNumber - 1))
byId('preview-next').addEventListener('click', () => showPreviewQuestion(previewNumber + 1))
byId('exam-admin-logout').addEventListener('click', async () => {
  await signOut(AUTH)
  window.location.href = '../../login.html'
})

// Never sign out here: tabs share one login, so that would also end it for another tab,
// such as a team taking the exam.
function leaveDashboard() {
  document.body.style.visibility = 'hidden'
  window.location.href = '../../login.html'
}

onAuthStateChanged(AUTH, async (user) => {
  if (!user) return leaveDashboard()
  let authorized = false
  try {
    const claims = await getRoleClaims(user)
    if (claims?.role !== 'competition_manager' || claims?.competition !== 'smart competition') {
      return leaveDashboard()
    }
    currentUser = user
    authorized = true
    document.body.style.visibility = 'visible'
    await loadDashboard()
  } catch (error) {
    if (!authorized) return leaveDashboard()
    message(formatError(error), 'danger')
  }
})
