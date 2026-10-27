import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
    onSnapshot, collection, doc, writeBatch, updateDoc, serverTimestamp
} from 'firebase/firestore'

import { DB, AUTH } from './index.js'
import { privateStorageLink } from './shared/private-download.js'

// =====================================================================
//   IPFEST 2027 CONFIG — cek dan isi bagian bertanda TODO
// =====================================================================

// TODO: email akun Treasury 2027 (harus ada di Firebase Authentication)
const TREASURY_EMAILS = [
    'treasury.ipfest2027@gmail.com'
].map(e => e.trim().toLowerCase())

// Biaya registrasi per tim (IDR), sama dengan treasury.js versi 2026.
// TODO: pastikan nominal ini masih berlaku untuk IPFEST 2027.
// Kalau dokumen Team punya field angka `payment_amount`, angka itu yang dipakai.
const REGISTRATION_FEE = {
    normal: 250000,
    earlyBird: 200000
}

// Batas early bird, dicocokkan dengan Team.join_on.
// Versi 2026 memakai 16 Nov 2025; di sini digeser satu tahun.
// TODO: pastikan tanggal early bird IPFEST 2027.
const EARLY_BIRD_DEADLINE = new Date('2026-11-16T23:59:59+07:00')

// TODO: kurs untuk pembayaran Paypal (USD) agar bisa dijumlah dalam Rupiah
const USD_TO_IDR = 16000

// Harga final per orang — SALINAN dari PRICE_TABLE di src/delegates.js.
// Kalau harga di delegates.js berubah, ubah juga di sini.
const FINAL_PRICE_TABLE = {
    'Full Hospitality': {
        Full: { 'Bank BCA': 700000, 'Gopay': 700000, 'Paypal': 50 },
        DP: {
            First: { 'Bank BCA': 400000, 'Gopay': 400000, 'Paypal': 30 },
            Last:  { 'Bank BCA': 300000, 'Gopay': 300000, 'Paypal': 20 }
        }
    },
    'Excluding Accommodation': {
        Full: { 'Bank BCA': 450000, 'Gopay': 450000, 'Paypal': 32 },
        DP: {
            First: { 'Bank BCA': 300000, 'Gopay': 300000, 'Paypal': 20 },
            Last:  { 'Bank BCA': 150000, 'Gopay': 150000, 'Paypal': 12 }
        }
    }
}

// Pilihan status di dropdown
// Registrasi: nilai sama dengan yang dipakai versi lama dan halaman lain
const REG_STATUSES = [
    { value: 'pending_verification', label: 'Pending' },
    { value: 'verified',             label: 'Verified' }
]
const FINAL_STATUSES = [
    { value: 'pending',               label: 'Pending' },
    { value: 'down_payment_verified', label: 'DP Verified' },
    { value: 'verified',              label: 'Verified' }
]

// =====================================================================
//   HELPERS
// =====================================================================
const esc = (value) => {
    if (value === undefined || value === null || value === '') return '-'
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

const linkCell = (value, label = 'View') => {
    return privateStorageLink(value, label) || '-'
}

const toDate = (ts) => {
    if (!ts) return null
    const dt = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts)
    return isNaN(dt) ? null : dt
}

const formatDate = (ts) => {
    const dt = toDate(ts)
    return dt ? dt.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'
}

const rupiah = (n) => Math.round(n).toLocaleString('id-ID')

const fullName = (p) => [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '-'

// Field registrasi di dokumen Team (sama dengan treasury.js versi 2026):
//   join_on            : Timestamp tanggal daftar
//   payment.proofUrl   : link bukti bayar registrasi
//   payment.uploadedAt : waktu bukti diunggah
//   payment_status     : "pending_verification" | "verified"
const joinedAtOf = (t) => t.join_on ?? t.createdAt ?? null
const regProofOf = (t) => t.payment?.proofUrl ?? null
const regStatusOf = (t) => String(t.payment_status ?? 'pending_verification').toLowerCase()

const CompetitionFullName = {
    'business case': 'Business Case Competition',
    'geothermal development plan': 'Geothermal Development Plan Competition',
    'paper and poster': 'Paper and Poster Competition',
    'oil rig design': 'Oil Rig Design Competition',
    'smart competition': 'Smart Competition',
    'mud inovation': 'Mud Innovation Competition',
    'plan of development': 'Plan of Development Competition',
    'well design': 'Well Design Competition',
    'hackaton': 'Hackathon Competition'
}
const competitionName = (t) => {
    const key = String(t.competition ?? '').trim().toLowerCase()
    return CompetitionFullName[key] ?? t.competition ?? '-'
}
const finalStatusOf = (t) => String(t.final_reg?.paymentStatus ?? 'pending').toLowerCase()

const isEarlyBird = (t) => {
    const flag = t.early_bird ?? t.earlyBird ?? t.isEarlyBird
    if (typeof flag === 'boolean') return flag
    if (typeof flag === 'string') return ['yes', 'true', 'early bird'].includes(flag.toLowerCase())
    const joined = toDate(joinedAtOf(t))
    if (EARLY_BIRD_DEADLINE && joined) return joined <= EARLY_BIRD_DEADLINE
    return null
}

const regFeeOf = (t) => {
    if (typeof t.payment_amount === 'number') return t.payment_amount
    const fee = isEarlyBird(t) ? REGISTRATION_FEE.earlyBird : REGISTRATION_FEE.normal
    return typeof fee === 'number' ? fee : null
}

// Uang final yang sudah DIVERIFIKASI untuk satu tim (IDR).
// - verified + Full : harga Full tiap orang
// - verified + DP   : First + Last tiap orang
// - down_payment_verified : First tiap orang
const finalPersonPrice = (person, scheme, part) => {
    const hosp = FINAL_PRICE_TABLE[person?.hospitality]
    const method = person?.paymentMethod
    if (!hosp || !method) return 0
    const raw = scheme === 'Full' ? hosp.Full?.[method] : hosp.DP?.[part]?.[method]
    if (typeof raw !== 'number') return 0
    return method === 'Paypal' ? raw * USD_TO_IDR : raw
}

const finalFeeOf = (t) => {
    const fr = t.final_reg
    if (!fr) return 0
    const status = finalStatusOf(t)
    const people = [fr.leader, ...(Array.isArray(fr.members) ? fr.members : [])].filter(Boolean)
    const scheme = fr.paymentScheme === 'Full' ? 'Full' : 'DP'

    return people.reduce((sum, p) => {
        if (status === 'verified') {
            return sum + (scheme === 'Full'
                ? finalPersonPrice(p, 'Full')
                : finalPersonPrice(p, 'DP', 'First') + finalPersonPrice(p, 'DP', 'Last'))
        }
        if (status === 'down_payment_verified') {
            return sum + finalPersonPrice(p, 'DP', 'First')
        }
        return sum
    }, 0)
}

const regStatusClass = (v) => v === 'verified' ? 'bg-success' : v === 'rejected' ? 'bg-danger' : 'bg-warning'
const finalStatusClass = (v) => v === 'verified' ? 'bg-success' : v === 'down_payment_verified' ? 'bg-info' : 'bg-warning'

const statusSelect = (options, current, extraAttrs, clsFn) => `
    <select class="form-select form-select-sm ${clsFn(current)}" ${extraAttrs}>
        ${options.map(o => `<option value="${o.value}" ${o.value === current ? 'selected' : ''}>${o.label}</option>`).join('')}
    </select>
`

const showTableMessage = (tbody, colspan, message) => {
    if (!tbody) return
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-4">${esc(message)}</td></tr>`
}

const setText = (el, text) => { if (el) el.textContent = text }

const sortByJoined = (a, b) => {
    const da = toDate(joinedAtOf(a))?.getTime() ?? Infinity
    const db = toDate(joinedAtOf(b))?.getTime() ?? Infinity
    return da - db
}

// =====================================================================
//   ELEMENTS & STATE
// =====================================================================
const el = {
    totalRegFee:    document.getElementById('total-reg-fee'),
    totalFinFee:    document.getElementById('total-fin-fee'),
    totalIncome:    document.getElementById('total-income'),
    verifiedTeams:  document.getElementById('verified-teams'),
    unverifiedTeams:document.getElementById('unverified-teams'),
    totalReg:       document.getElementById('total-reg'),
    regForm:        document.getElementById('treasury-privilage'),
    regList:        document.getElementById('treasury-team-list'),
    finalForm:      document.getElementById('treasury-privilage-final'),
    finalList:      document.getElementById('treasury-final-team-list'),
    historyList:    document.getElementById('treasury-history-list'),
    logoutBtn:      document.getElementById('logout-btn')
}

const REG_COLS = 8
const FINAL_COLS = 12

let currentUserEmail = null
let unsubscribeTeams = null
let latestTeams = []

// Perubahan yang belum disimpan (teamId -> status baru).
// Disimpan terpisah supaya pilihan dropdown tidak hilang saat data Firestore berubah.
const pendingReg = new Map()
const pendingFinal = new Map()

// =====================================================================
//   AUTH
// =====================================================================
onAuthStateChanged(AUTH, (user) => {
    const email = (user?.email || '').trim().toLowerCase()
    if (!user || !TREASURY_EMAILS.includes(email)) {
        if (unsubscribeTeams) { unsubscribeTeams(); unsubscribeTeams = null }
        window.location.href = '../login.html'
        return
    }
    currentUserEmail = email

    if (!unsubscribeTeams) {
        showTableMessage(el.regList, REG_COLS, 'Loading data...')
        showTableMessage(el.finalList, FINAL_COLS, 'Loading data...')
        unsubscribeTeams = onSnapshot(collection(DB, 'Team'), (snap) => {
            latestTeams = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            renderAll()
        }, (err) => {
            console.error('Cannot read Team collection', err)
            const msg = err.code === 'permission-denied'
                ? 'Akun ini tidak punya izin membaca data tim.'
                : 'Gagal memuat data tim. Coba muat ulang halaman.'
            showTableMessage(el.regList, REG_COLS, msg)
            showTableMessage(el.finalList, FINAL_COLS, msg)
        })
    }
})

function renderAll() {
    renderDashboard(latestTeams)
    renderVerification(latestTeams)
    renderFinal(latestTeams)
    renderHistory(latestTeams)
}

// =====================================================================
//   DASHBOARD
// =====================================================================
function renderDashboard(teams) {
    const verified = teams.filter(t => regStatusOf(t) === 'verified')

    // Total registrasi: hanya kalau biaya tiap tim terverifikasi diketahui
    const regFees = verified.map(regFeeOf)
    const regKnown = regFees.every(f => typeof f === 'number')
    const regTotal = regKnown ? regFees.reduce((a, b) => a + b, 0) : null
    if (!regKnown && verified.length > 0) {
        console.warn('Biaya registrasi belum diatur. Isi REGISTRATION_FEE di src/treasury.js.')
    }

    const finTotal = teams.reduce((sum, t) => sum + finalFeeOf(t), 0)

    setText(el.totalRegFee, regTotal === null ? '-' : rupiah(regTotal))
    setText(el.totalFinFee, rupiah(finTotal))
    setText(el.totalIncome, rupiah((regTotal ?? 0) + finTotal))
    setText(el.verifiedTeams, String(verified.length))
    setText(el.unverifiedTeams, String(teams.length - verified.length))
    setText(el.totalReg, String(teams.length))
}

// =====================================================================
//   VERIFICATION (pembayaran registrasi)
// =====================================================================
function renderVerification(teams) {
    if (!el.regList) return
    if (teams.length === 0) {
        showTableMessage(el.regList, REG_COLS, 'Belum ada tim yang terdaftar.')
        return
    }

    // Yang belum verified di atas, lalu urut tanggal daftar
    const sorted = [...teams].sort((a, b) =>
        (regStatusOf(a) === 'verified') - (regStatusOf(b) === 'verified') || sortByJoined(a, b)
    )

    const fragment = document.createDocumentFragment()
    sorted.forEach((t, i) => {
        const current = pendingReg.get(t.id) ?? regStatusOf(t)
        const eb = isEarlyBird(t)
        const row = document.createElement('tr')
        if (pendingReg.has(t.id)) row.classList.add('tr-dirty')
        row.innerHTML = `
            <td>${i + 1}</td>
            <td>${esc(t.teamName)}</td>
            <td>${esc(t.leader?.university)}</td>
            <td>${esc(competitionName(t))}</td>
            <td>${formatDate(joinedAtOf(t))}</td>
            <td>${eb === null ? '-' : eb ? 'Yes' : 'No'}</td>
            <td>${linkCell(regProofOf(t))}</td>
            <td>${statusSelect(REG_STATUSES, current, `data-team-id="${esc(t.id)}" data-kind="reg"`, regStatusClass)}</td>
        `
        fragment.appendChild(row)
    })
    el.regList.replaceChildren(fragment)
}

// =====================================================================
//   FINAL (pembayaran final, satu baris per orang)
// =====================================================================
function renderFinal(teams) {
    if (!el.finalList) return
    const finalTeams = teams.filter(t => t.final_reg).sort((a, b) => {
        const order = (t) => ({ pending: 0, down_payment_verified: 1, verified: 2 }[finalStatusOf(t)] ?? 0)
        return order(a) - order(b) || String(a.teamName ?? '').localeCompare(String(b.teamName ?? ''))
    })

    if (finalTeams.length === 0) {
        showTableMessage(el.finalList, FINAL_COLS, 'Belum ada tim yang mengirim pembayaran final.')
        return
    }

    const fragment = document.createDocumentFragment()
    finalTeams.forEach((t, i) => {
        const fr = t.final_reg
        const teamMembers = Array.isArray(t.members) ? t.members : []
        const payMembers = Array.isArray(fr.members) ? fr.members : []
        const people = [
            { role: 'Leader', name: fullName(t.leader), pay: fr.leader || {} },
            ...payMembers.map((m, idx) => ({ role: 'Member', name: fullName(teamMembers[idx]), pay: m || {} }))
        ]
        const span = people.length
        const current = pendingFinal.get(t.id) ?? finalStatusOf(t)
        const isDP = fr.paymentScheme === 'DP'

        people.forEach((p, pi) => {
            const row = document.createElement('tr')
            if (pendingFinal.has(t.id)) row.classList.add('tr-dirty')
            if (pi === 0) row.classList.add('tr-team-start')

            const personCells = `
                <td>${esc(p.pay.paymentMethod)}</td>
                <td><span class="d-block">${esc(p.name)}</span><small class="text-muted">${p.role}</small></td>
                <td>${linkCell(p.pay.paymentProof, 'First')}</td>
                <td>${isDP ? linkCell(p.pay.lastPayment, 'Last') : '-'}</td>
                <td>${esc(p.pay.hospitality)}</td>
            `

            row.innerHTML = pi === 0
                ? `
                    <td rowspan="${span}">${i + 1}</td>
                    <td rowspan="${span}">${esc(t.teamName)}</td>
                    <td rowspan="${span}">${esc(t.leader?.university)}</td>
                    <td rowspan="${span}">${esc(competitionName(t))}</td>
                    <td rowspan="${span}">${esc(fr.paymentScheme)}</td>
                    <td rowspan="${span}">${isDP ? esc(fr.dpCategory) : '-'}</td>
                    ${personCells}
                    <td rowspan="${span}">${statusSelect(FINAL_STATUSES, current, `data-team-id="${esc(t.id)}" data-kind="final"`, finalStatusClass)}</td>
                `
                : personCells

            fragment.appendChild(row)
        })
    })
    el.finalList.replaceChildren(fragment)
}

// =====================================================================
//   HISTORY (tab sedang dinonaktifkan di HTML, tapi tetap diisi)
// =====================================================================
function renderHistory(teams) {
    if (!el.historyList) return
    const verified = teams.filter(t => regStatusOf(t) === 'verified').sort(sortByJoined)
    if (verified.length === 0) {
        showTableMessage(el.historyList, 5, 'Belum ada tim terverifikasi.')
        return
    }
    el.historyList.innerHTML = verified.map((t, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${esc(t.teamName)}</td>
            <td>${esc(t.leader?.university)}</td>
            <td>${esc(competitionName(t))}</td>
            <td>${formatDate(joinedAtOf(t))}</td>
        </tr>
    `).join('')
}

// =====================================================================
//   INTERAKSI: ubah dropdown status
// =====================================================================
function handleStatusChange(e) {
    const select = e.target.closest('select[data-team-id]')
    if (!select) return
    const id = select.dataset.teamId
    const kind = select.dataset.kind
    const team = latestTeams.find(t => t.id === id)
    if (!team) return

    const original = kind === 'final' ? finalStatusOf(team) : regStatusOf(team)
    const map = kind === 'final' ? pendingFinal : pendingReg
    const clsFn = kind === 'final' ? finalStatusClass : regStatusClass

    if (select.value === original) map.delete(id)
    else map.set(id, select.value)

    select.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info')
    select.classList.add(clsFn(select.value))

    // Tandai semua baris milik tim ini (tabel final punya beberapa baris per tim)
    const firstRow = select.closest('tr')
    const rows = [firstRow]
    let next = firstRow.nextElementSibling
    while (next && !next.classList.contains('tr-team-start') && kind === 'final') {
        rows.push(next)
        next = next.nextElementSibling
    }
    rows.forEach(r => r.classList.toggle('tr-dirty', map.has(id)))
}

el.regList?.addEventListener('change', handleStatusChange)
el.finalList?.addEventListener('change', handleStatusChange)

// =====================================================================
//   SIMPAN
// =====================================================================
async function saveChanges(form, map, buildUpdate, label) {
    const btn = form.querySelector('button[type="submit"]')
    if (map.size === 0) {
        alert('Tidak ada perubahan untuk disimpan.')
        return
    }
    if (!confirm(`Simpan ${map.size} perubahan status ${label}?`)) return

    const oldHtml = btn?.innerHTML
    if (btn) { btn.disabled = true; btn.innerHTML = 'Saving...' }

    try {
        const batch = writeBatch(DB)
        map.forEach((status, id) => batch.update(doc(DB, 'Team', id), buildUpdate(status)))
        await batch.commit()
        map.clear()
        renderAll()
        alert('✅ Perubahan tersimpan.')
    } catch (err) {
        console.error('Save failed', err)
        alert(err.code === 'permission-denied'
            ? 'Gagal menyimpan: akun ini tidak punya izin menulis (cek Firestore Security Rules).'
            : 'Gagal menyimpan. Periksa koneksi lalu coba lagi.')
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = oldHtml }
    }
}

el.regForm?.addEventListener('submit', (e) => {
    e.preventDefault()
    saveChanges(el.regForm, pendingReg, (status) => ({
        payment_status: status,
        payment_verified_at: serverTimestamp(),
        payment_verified_by: currentUserEmail
    }), 'registrasi')
})

el.finalForm?.addEventListener('submit', (e) => {
    e.preventDefault()
    saveChanges(el.finalForm, pendingFinal, (status) => ({
        'final_reg.paymentStatus': status,
        'final_reg.verifiedAt': serverTimestamp(),
        'final_reg.verifiedBy': currentUserEmail
    }), 'final')
})

// =====================================================================
//   CEGAH KEHILANGAN PERUBAHAN & LOG OUT
// =====================================================================
window.addEventListener('beforeunload', (e) => {
    if (pendingReg.size || pendingFinal.size) {
        e.preventDefault()
        e.returnValue = ''
    }
})

el.logoutBtn?.addEventListener('click', () => {
    if ((pendingReg.size || pendingFinal.size) &&
        !confirm('Ada perubahan yang belum disimpan. Tetap log out?')) return
    pendingReg.clear()
    pendingFinal.clear()
    if (unsubscribeTeams) { unsubscribeTeams(); unsubscribeTeams = null }
    signOut(AUTH)
        .then(() => { window.location.href = '../login.html' })
        .catch((err) => { console.error('Cannot log out user', err) })
})

// Diekspor hanya untuk pengujian
export { finalFeeOf, regFeeOf, isEarlyBird }
