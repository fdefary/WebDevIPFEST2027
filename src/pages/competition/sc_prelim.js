import { onAuthStateChanged, signOut } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { AUTH, FUNCTIONS } from '../../app/index.js'
import { answerLayout, submitLabel } from '../../shared/sc-question-view.js'

const LOGIN_PAGE = 'loginsc.html'
// Timed answers are sent this long before the server deadline to cover network and processing delay.
// The server rejects late answers, so raise this if slow connections still miss it.
const SUBMIT_LEAD_MS = 1500
const WARN_SECONDS = 10
const DANGER_SECONDS = 5
const DRAFT_IDLE_MS = 500
const DRAFT_MAX_WAIT_MS = 2000
const RETRY_FIRST_MS = 1000
const RETRY_MAX_MS = 10000
// Retrying cannot fix these.
const PERMANENT_ERRORS = ['unauthenticated', 'permission-denied', 'not-found', 'failed-precondition', 'invalid-argument']
  .map((code) => `functions/${code}`)
const byId = (id) => document.getElementById(id)
const call = (name, data = {}) => httpsCallable(FUNCTIONS, name)(data).then((result) => result.data)
let state = null
let timerId = null
let saveId = null
let reloadId = null
let advancing = false
// Whether the team has typed in the current question's box since this page showed it.
let edited = false
let draftPendingSince = null
let retryMs = RETRY_FIRST_MS
let assetLoad = 0
let signedInEmail = ''

function showMessage(text, kind = 'info') {
  const box = byId('exam-status')
  box.className = `alert alert-${kind}`
  box.textContent = text
}

function showFinished(message = 'Your submitted answers have been saved. You may now log out and close this page.') {
  clearInterval(timerId)
  byId('exam-note').classList.add('d-none')
  byId('exam-panel').classList.add('d-none')
  byId('exam-finished').classList.remove('d-none')
  byId('exam-finished').querySelector('.scp-finished-text').textContent = message
}

function currentResponse() {
  return byId('exam-answer-long').classList.contains('d-none')
    ? byId('exam-answer-short').value.trim()
    : byId('exam-answer-long').value.trim()
}

// An empty box nobody has typed in is not the team's answer: after a reload, the server can still
// receive a draft that this page never saw.
const isUntouched = () => !edited && !currentResponse()

// Typed text also stays in the tab, so a reload shows it again even while its draft is still being
// saved. Storage can be blocked by browser settings; the server draft still works then.
const typedKey = () => `sc-typed:${state.sessionId}:${state.questionNumber}`
function rememberTyped() {
  try { sessionStorage.setItem(typedKey(), currentResponse()) } catch {}
}
function recallTyped() {
  try { return sessionStorage.getItem(typedKey()) } catch { return null }
}

function tooManyWords(question, response) {
  return question.category === 'Short Answer' && response.split(/\s+/).filter(Boolean).length > 4
}

function setControlsDisabled(disabled) {
  for (const id of ['exam-continue', 'exam-answer-long', 'exam-answer-short']) byId(id).disabled = disabled
}

function renderAnswer(question, answer) {
  const layout = answerLayout(question.category)
  const long = byId('exam-answer-long')
  const short = byId('exam-answer-short')
  long.classList.toggle('d-none', !layout.long)
  short.classList.toggle('d-none', layout.long)
  // The type is set first: a number field discards text that is already in it.
  short.type = layout.inputType
  if (layout.inputType === 'number') short.step = 'any'
  long.value = layout.long ? answer : ''
  short.value = layout.long ? '' : answer
  byId('answer-hint').classList.toggle('d-none', !layout.listHint)
  byId('exam-continue').textContent = submitLabel(question.number, state.questionCount)
}

async function loadAssets(paths, load) {
  for (const path of paths) {
    try {
      const { url } = await call('getExamAssetUrl', { path })
      if (load !== assetLoad) return
      const image = document.createElement('img')
      image.src = url
      image.alt = 'Question illustration'
      image.className = 'img-fluid rounded mb-2'
      image.style.maxHeight = '360px'
      byId('question-assets').append(image)
    } catch (error) { console.error('Cannot load question asset', error) }
  }
}

// The server only moves forward, so an earlier question or a reopened exam is a late reply.
function isStale(next) {
  if (state?.status === 'submitted') return next.status !== 'submitted'
  return state?.status === 'in_progress' && next.status === 'in_progress' && next.questionNumber < state.questionNumber
}

function renderQuestion(next) {
  if (isStale(next)) return
  const sameQuestion = state?.status === 'in_progress' && next.status === 'in_progress'
    && state.questionNumber === next.questionNumber
  state = next
  clearTimeout(reloadId)
  retryMs = RETRY_FIRST_MS
  byId('exam-account').classList.add('d-none')
  if (next.status === 'submitted') return showFinished()
  if (next.status === 'scheduled') {
    byId('exam-panel').classList.remove('d-none')
    byId('exam-question').classList.add('d-none')
    byId('exam-status').classList.remove('d-none')
    showMessage(`Your exam opens at ${new Date(next.opensAtMs).toLocaleString()}. This page will check again automatically.`)
    reloadId = setTimeout(() => loadState(false), 10000)
    return
  }
  if (next.status === 'closed') return showFinished('The session closed before an attempt could be started.')

  byId('exam-note').classList.remove('d-none')
  byId('exam-panel').classList.remove('d-none')
  byId('exam-question').classList.remove('d-none')
  byId('exam-status').classList.add('d-none')
  byId('question-heading').textContent = `Question ${next.questionNumber} of ${next.questionCount} · ${next.question.category}`
  byId('question-text').textContent = next.question.question
  if (!sameQuestion) {
    clearTimeout(saveId)
    draftPendingSince = null
    const typed = recallTyped()
    edited = typed !== null
    renderAnswer(next.question, typed ?? next.answer ?? '')
    if (edited && typed !== (next.answer || '')) scheduleDraftSave()
  } else if (isUntouched()) {
    renderAnswer(next.question, next.answer || '')
  } else if (currentResponse() !== (next.answer || '')) {
    // What is on screen is newer than the server's draft: keep it and save it again.
    scheduleDraftSave()
  }
  if (!advancing) setControlsDisabled(false)
  const formula = byId('question-formula')
  formula.replaceChildren()
  if (next.question.formulaLatex) {
    const code = document.createElement('code')
    code.textContent = next.question.formulaLatex
    formula.append(code)
  }
  startTimer(next.remainingMs)
  const paths = next.question.assets || []
  const assets = byId('question-assets')
  if (!sameQuestion || assets.children.length < paths.length) {
    assets.replaceChildren()
    loadAssets(paths, ++assetLoad)
  }
}

function startTimer(remainingMs) {
  clearInterval(timerId)
  const submitAt = Date.now() + remainingMs - SUBMIT_LEAD_MS
  const update = () => {
    const seconds = Math.max(0, Math.ceil((submitAt - Date.now()) / 1000))
    byId('exam-timer').textContent = String(seconds).padStart(2, '0')
    const box = byId('exam-timer-box')
    box.classList.toggle('is-warn', seconds <= WARN_SECONDS && seconds > DANGER_SECONDS)
    box.classList.toggle('is-danger', seconds <= DANGER_SECONDS)
    if (!seconds) advance(true)
  }
  // The interval must exist before the first update, so that advance() can clear it.
  timerId = setInterval(update, 250)
  update()
}

// The server will not give this account an exam, so take any question down and offer another sign-in.
function showBlocked(error) {
  clearInterval(timerId)
  clearTimeout(saveId)
  state = null
  byId('exam-note').classList.add('d-none')
  byId('exam-question').classList.add('d-none')
  // The two replies assertTeamLeader gives in functions/src/exam/service.js.
  const notATeam = error.code === 'functions/permission-denied' || error.message === 'Registered team not found.'
  const reason = notATeam ? 'This account isn’t a registered team.' : error.message
  showMessage(`${reason} Signed in as ${signedInEmail}. If this isn’t your team account, log out and sign in with it.`, 'danger')
  byId('exam-account').classList.remove('d-none')
}

async function logOut() {
  await signOut(AUTH)
  window.location.href = LOGIN_PAGE
}

async function loadState(resume = true) {
  clearTimeout(reloadId)
  try {
    const next = await call('getParticipantExamState', { resume })
    // While an answer is being sent, a reply for the same question must not unlock it.
    if (advancing && state && next.questionNumber === state.questionNumber) return
    renderQuestion(next)
  } catch (error) {
    if (state?.status === 'submitted') return
    byId('exam-panel').classList.remove('d-none')
    byId('exam-status').classList.remove('d-none')
    if (PERMANENT_ERRORS.includes(error?.code)) return showBlocked(error)
    // Keep a question already on screen so the team can keep typing through a short outage.
    if (state?.status !== 'in_progress') byId('exam-question').classList.add('d-none')
    showMessage(error?.message || 'Cannot load the exam. Check your connection and try again.', 'danger')
    clearTimeout(reloadId)
    reloadId = setTimeout(() => loadState(resume), retryMs)
    retryMs = Math.min(retryMs * 2, RETRY_MAX_MS)
  }
}

function scheduleDraftSave() {
  clearTimeout(saveId)
  draftPendingSince ??= Date.now()
  const maxWaitLeft = draftPendingSince + DRAFT_MAX_WAIT_MS - Date.now()
  saveId = setTimeout(saveDraft, Math.max(0, Math.min(DRAFT_IDLE_MS, maxWaitLeft)))
}

async function saveDraft() {
  draftPendingSince = null
  if (!state || state.status !== 'in_progress' || advancing) return
  const response = currentResponse()
  if (tooManyWords(state.question, response)) return
  try {
    const result = await call('saveParticipantDraft', { questionNumber: state.questionNumber, response })
    if (!result.saved) await loadState(false)
  } catch (error) { console.warn('Draft save will be retried on the next edit or refresh.', error) }
}

async function advance(byTimer = false) {
  if (advancing || !state || state.status !== 'in_progress') return
  const response = currentResponse()
  const tooLong = tooManyWords(state.question, response)
  if (tooLong && !byTimer) {
    return showMessage('Short answers can be at most four words. Shorten your answer, then submit.', 'warning')
  }
  const leaveOut = tooLong || isUntouched()
  advancing = true
  clearTimeout(saveId)
  clearInterval(timerId)
  setControlsDisabled(true)
  try {
    // A too-long or untouched empty answer is left out, so the server uses the last saved draft.
    const next = await call(state.questionNumber === state.questionCount ? 'submitExam' : 'advanceExamQuestion', {
      questionNumber: state.questionNumber, ...(leaveOut ? {} : { response })
    })
    renderQuestion(next)
  } catch (error) {
    showMessage(byTimer ? 'Reconnecting. The server timer will continue and advance the exam when available.' : (error?.message || 'Could not save the answer. Reconnecting…'), 'warning')
    clearTimeout(reloadId)
    reloadId = setTimeout(() => loadState(false), 1200)
  } finally {
    advancing = false
    if (state?.status === 'in_progress') setControlsDisabled(false)
  }
}

byId('exam-continue').addEventListener('click', () => advance(false))
function onAnswerInput() {
  edited = true
  if (state?.status === 'in_progress') rememberTyped()
  scheduleDraftSave()
}
byId('exam-answer-long').addEventListener('input', onAnswerInput)
byId('exam-answer-short').addEventListener('input', onAnswerInput)
byId('exam-logout').addEventListener('click', logOut)
byId('exam-switch-account').addEventListener('click', logOut)
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadState(false) })
// Coming back online is a reconnection, which the server logs for the exam admin.
window.addEventListener('online', () => loadState(true))
onAuthStateChanged(AUTH, (user) => {
  if (!user) {
    localStorage.setItem('currentURL', window.location.href)
    window.location.href = LOGIN_PAGE
    return
  }
  signedInEmail = user.email
  loadState(true)
})
