// Tombol tes di dashboard delegasi SC, mengikuti jadwal sesi milik tim masing-masing.
// Dicek ulang tiap 30 detik supaya berubah sendiri tanpa refresh.
const REFRESH_MS = 30_000

// null = kartu disembunyikan (belum dijadwalkan atau belum dibuka).
const VIEWS = {
    unassigned: null,
    scheduled: null,
    open: { label: 'Start Test', canOpen: true },
    in_progress: { label: 'Resume Test', canOpen: true },
    submitted: { label: 'Test Completed' },
    closed: { label: 'Test Closed' },
    unknown: { label: 'Could not check your test. Retrying…' }
}

let timerId = null

// loadSchedule() mengembalikan { status } dari fungsi read-only getParticipantExamSchedule.
export function watchTestLink({ card, link, loadSchedule }) {
    if (!card || !link) return

    function show(view) {
        card.classList.toggle('d-none', !view)
        if (!view) return
        link.textContent = view.label
        if (view.canOpen) {
            link.href = 'sesi-1.html'
            link.removeAttribute('aria-disabled')
            link.classList.remove('pe-none', 'opacity-50')
        } else {
            link.removeAttribute('href')
            link.setAttribute('aria-disabled', 'true')
            link.classList.add('pe-none', 'opacity-50')
        }
    }

    async function refresh() {
        try {
            const { status } = await loadSchedule()
            show(VIEWS[status])
        } catch (error) {
            // not-found: belum ada sesi untuk tim ini.
            if (error?.code === 'functions/not-found') return show(VIEWS.unassigned)
            console.warn('Could not check the exam schedule', error)
            show(VIEWS.unknown)
        }
    }

    clearInterval(timerId)
    timerId = setInterval(refresh, REFRESH_MS)
    refresh()
}
