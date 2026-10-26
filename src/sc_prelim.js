import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'

import { DB, AUTH } from './index.js'
import { SC_TEST_WINDOW, scTestStatus } from './shared/sc-schedule.js'

// =====================================================================
//   KONFIGURASI TES
// =====================================================================
// id      = id elemen .accordion-item di HTML, sekaligus nama field di SC_Del_Answer
// optId   = name radio jawaban
// timer   = detik untuk soal ini
const QUESTIONS = [
    { id: 'question1', optId: 'q-1-a', timer: 15, timerId: 'timer-q-1' },
    { id: 'question2', optId: 'q-2-a', timer: 20, timerId: 'timer-q-2' }
]

// false = semua soal dibuka & semua timer berjalan bersamaan (perilaku lama)
// true  = soal dibuka satu per satu; soal berikutnya mulai setelah soal sebelumnya terkirim
// TODO: pilih sesuai aturan tes SC 2027
const SEQUENTIAL = false

const LOGIN_PAGE = 'loginsc.html'

// =====================================================================
//   STATE
// =====================================================================
let answerRef = null
let answers = {}                 // isi dokumen SC_Del_Answer/{uid}
const timers = new Map()         // questionId -> intervalId
const sent = new Set()           // soal yang sudah terkirim

// =====================================================================
//   AUTH
// =====================================================================
onAuthStateChanged(AUTH, async (user) => {
    if (!user) {
        localStorage.setItem('currentURL', window.location.href)
        window.location.href = LOGIN_PAGE
        return
    }

    try {
        // Hanya peserta SC (punya dokumen SC_Selection/{uid}) yang boleh ikut tes
        const delegate = await getDoc(doc(DB, 'SC_Selection', user.uid))
        if (!delegate.exists()) {
            alert('This account is not registered as a Smart Competition participant.')
            await signOut(AUTH)
            window.location.href = LOGIN_PAGE
            return
        }

        answerRef = doc(DB, 'SC_Del_Answer', user.uid)
        const snap = await getDoc(answerRef)
        answers = snap.exists() ? snap.data() : {}

        // Di luar jadwal tes → jangan mulai timer, kecuali peserta sudah menyelesaikan semua soal
        if (scTestStatus() !== 'open' && !QUESTIONS.every(isAnswered)) {
            showOutsideSchedule(scTestStatus())
            return
        }

        startExam()
    } catch (err) {
        console.error('Cannot start exam', err)
        alert('Cannot load the test. Please check your connection and refresh the page. If this keeps happening, contact the committee.')
    }
})

// =====================================================================
//   ALUR TES
// =====================================================================
const qEl = (q) => document.getElementById(q.id)
const isAnswered = (q) => answers[q.id]?.answer !== undefined

let examStarted = false

function startExam() {
    // onAuthStateChanged bisa terpanggil lebih dari sekali; jangan pasang timer dobel
    if (examStarted) return
    examStarted = true

    // Soal yang sudah dijawab sebelumnya (misalnya setelah refresh) langsung dikunci
    QUESTIONS.filter(isAnswered).forEach(q => {
        sent.add(q.id)
        lockQuestion(q, answers[q.id].answer)
    })

    if (allDone()) {
        showFinished()
        return
    }

    if (SEQUENTIAL) {
        openNextQuestion()
    } else {
        QUESTIONS.filter(q => !sent.has(q.id)).forEach(openQuestion)
    }
}

function openNextQuestion() {
    const next = QUESTIONS.find(q => !sent.has(q.id))
    if (next) openQuestion(next)
}

function openQuestion(q) {
    const el = qEl(q)
    if (!el) return
    const btn = el.querySelector('.accordion-button')
    const body = el.querySelector('.accordion-collapse')
    const form = el.querySelector('form')

    btn.disabled = false
    btn.classList.remove('collapsed')
    btn.setAttribute('aria-expanded', 'true')
    body.classList.add('show')

    form.addEventListener('submit', (e) => {
        e.preventDefault()
        submitQuestion(q)
    })

    startTimer(q)
}

// Timer berdasarkan waktu mulai yang DISIMPAN di Firestore,
// sehingga refresh tidak mengembalikan waktu menjadi penuh.
async function startTimer(q) {
    const display = document.getElementById(q.timerId)
    let startedAt = answers[q.id]?.startedAt

    if (typeof startedAt !== 'number') {
        startedAt = Date.now()
        answers[q.id] = { ...(answers[q.id] || {}), startedAt }
        try {
            await setDoc(answerRef, { [q.id]: { startedAt } }, { merge: true })
        } catch (err) {
            console.error('Cannot save start time', err)
        }
    }

    const deadline = startedAt + q.timer * 1000
    const render = () => {
        const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
        if (display) display.textContent = String(left).padStart(2, '0')
        return left
    }

    if (render() <= 0) {
        submitQuestion(q)          // waktu sudah habis (misalnya saat halaman ditutup)
        return
    }

    const id = setInterval(() => {
        if (render() <= 0) submitQuestion(q)
    }, 250)
    timers.set(q.id, id)
}

function stopTimer(q) {
    const id = timers.get(q.id)
    if (id) clearInterval(id)
    timers.delete(q.id)
}

async function submitQuestion(q) {
    if (sent.has(q.id)) return     // cegah terkirim dua kali (submit + timeout)
    sent.add(q.id)
    stopTimer(q)

    const chosen = document.querySelector(`input[name="${q.optId}"]:checked`)
    const answer = chosen ? chosen.value : '0'
    lockQuestion(q, answer, 'saving')

    const ok = await saveAnswer(q, answer)
    lockQuestion(q, answer, ok ? 'saved' : 'failed')

    if (SEQUENTIAL) openNextQuestion()
    if (allDone()) showFinished()
}

// Simpan jawaban; coba ulang beberapa kali kalau koneksi bermasalah
async function saveAnswer(q, answer, attempts = 3) {
    for (let i = 1; i <= attempts; i++) {
        try {
            await setDoc(answerRef, {
                [q.id]: { answer, submittedAt: serverTimestamp() }
            }, { merge: true })
            answers[q.id] = { ...(answers[q.id] || {}), answer }
            return true
        } catch (err) {
            console.error(`Save attempt ${i} failed for ${q.id}`, err)
            if (i < attempts) await new Promise(r => setTimeout(r, 1500 * i))
        }
    }
    alert(`Your answer for ${q.id.replace('question', 'Question #')} could not be saved. Please screenshot this page and contact the committee immediately.`)
    return false
}

// Kunci tampilan soal setelah terkirim
function lockQuestion(q, answer, state = 'saved') {
    const el = qEl(q)
    if (!el) return
    const btn = el.querySelector('.accordion-button')
    const body = el.querySelector('.accordion-collapse')

    el.querySelectorAll('input, button[type="submit"]').forEach(x => { x.disabled = true })
    btn.disabled = true
    btn.classList.add('collapsed')
    btn.setAttribute('aria-expanded', 'false')
    body.classList.remove('show')

    el.classList.remove('is-saving', 'is-answered', 'is-failed')
    el.classList.add(state === 'saving' ? 'is-saving' : state === 'failed' ? 'is-failed' : 'is-answered')
    el.dataset.status = state === 'saving' ? 'Saving...' : state === 'failed' ? 'Not saved' : (answer === '0' ? 'No answer' : 'Answered')

    // Pilihan yang dikirim tetap terlihat tercentang
    if (answer && answer !== '0') {
        const radio = el.querySelector(`input[name="${q.optId}"][value="${answer}"]`)
        if (radio) radio.checked = true
    }
}

const allDone = () => QUESTIONS.every(q => sent.has(q.id))

// =====================================================================
//   LAYAR SELESAI
// =====================================================================
function showOutsideSchedule(status) {
    document.getElementById('exam-panel')?.classList.add('d-none')
    const note = document.getElementById('exam-note')
    if (!note) return
    note.textContent = status === 'before'
        ? `The test has not started yet. It opens on ${SC_TEST_WINDOW.open.label}.`
        : `The test closed on ${SC_TEST_WINDOW.close.label}.`
}

function showFinished() {
    const finished = document.getElementById('exam-finished')
    const panel = document.getElementById('exam-panel')
    const note = document.getElementById('exam-note')
    const failed = QUESTIONS.some(q => qEl(q)?.classList.contains('is-failed'))

    if (failed) return     // jangan tampilkan "selesai" kalau ada jawaban yang gagal tersimpan

    if (note) note.classList.add('d-none')
    if (panel) panel.classList.add('d-none')
    if (finished) {
        const count = QUESTIONS.filter(q => answers[q.id]?.answer && answers[q.id].answer !== '0').length
        const summary = document.getElementById('exam-finished-summary')
        if (summary) summary.textContent = `${count} of ${QUESTIONS.length} questions answered`
        finished.classList.remove('d-none')
        finished.focus()
    }
}

document.getElementById('exam-logout')?.addEventListener('click', async () => {
    try { await signOut(AUTH) } catch (err) { console.error(err) }
    localStorage.removeItem('currentURL')
    window.location.href = LOGIN_PAGE
})

// Peringatan kalau peserta mencoba menutup halaman di tengah tes
window.addEventListener('beforeunload', (e) => {
    if (answerRef && !allDone()) {
        e.preventDefault()
        e.returnValue = ''
    }
})