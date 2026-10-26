import { onAuthStateChanged, signOut } from 'firebase/auth'
import { onSnapshot, collection } from 'firebase/firestore'

import { DB, AUTH } from './index.js'

// ===============================
//   IPFEST 2027 CONFIG
// ===============================
// Akun Delegates Relation. Versi 2026 memakai officialdelegates.ipfest2026@gmail.com.
// TODO: pastikan akun 2027 ini sudah dibuat di Firebase Authentication.
const DELEGATES_RELATION_EMAILS = [
    "officialdelegates.ipfest2027@gmail.com"
].map(e => e.trim().toLowerCase())

// Kode kompetisi di dashboard (id <span class="total-del">) -> nama kompetisi di Firestore
const COMPETITIONS = [
    { code: 'BCC',  name: 'business case',               full: 'Business Case Competition' },
    { code: 'GDPC', name: 'geothermal development plan', full: 'Geothermal Development Plan Competition' },
    { code: 'MIC',  name: 'mud inovation',               full: 'Mud Innovation Competition' },
    { code: 'ORDC', name: 'oil rig design',              full: 'Oil Rig Design Competition' },
    { code: 'PPC',  name: 'paper and poster',            full: 'Paper and Poster Competition' },
    { code: 'PODC', name: 'plan of development',         full: 'Plan of Development Competition' },
    { code: 'SC',   name: 'smart competition',           full: 'Smart Competition' },
    { code: 'WDC',  name: 'well design',                 full: 'Well Design Competition' },
    { code: 'HC',   name: 'hackaton',                    full: 'Hackathon Competition' }
]

// Kolom yang ditampilkan per kompetisi (dari versi 2026: Paper and Poster tanpa Major)
const COMPETITION_FORMAT = {
    'paper and poster': { showMajor: false, showBatch: true },
    default:            { showMajor: true,  showBatch: true }
}

// Variasi ejaan yang mungkin ada di Firestore
const COMPETITION_ALIASES = {
    'mud innovation': 'mud inovation',
    'hackathon': 'hackaton'
}

// Data pembayaran final ditulis src/delegates.js ke Team/{id}.final_reg:
//   paymentStatus : "pending" | "down_payment_verified" | "verified"
//   paymentScheme : "Full" | "DP"     dpCategory : "First" | "Last" | "-"
//   leader / members[] : { hospitality, paymentMethod, paymentProof, lastPayment }
//   createdAt / updatedAt / lastPaymentAt : Firestore Timestamp
const finalPaymentStatusOf = (team) => team.final_reg?.paymentStatus ?? null

// Tim dianggap sudah mengirim pembayaran final kalau dokumen final_reg ada
const hasFinalPayment = (team) => Boolean(team.final_reg)

// Jumlah kolom tabel Final Payment (harus sama dengan <thead> di HTML)
const PAYMENT_COLS = 9

// ===============================
//   HELPERS
// ===============================
const normalizeCompetition = (value = '') => {
    const v = String(value).trim().toLowerCase()
    return COMPETITION_ALIASES[v] ?? v
}

const competitionOf = (team) =>
    COMPETITIONS.find(c => c.name === normalizeCompetition(team.competition)) ?? null

const competitionName = (team) => competitionOf(team)?.full ?? team.competition ?? '-'

const formatOf = (team) =>
    COMPETITION_FORMAT[normalizeCompetition(team.competition)] ?? COMPETITION_FORMAT.default

// Escape supaya data dari Firestore tidak dirender sebagai HTML
const esc = (value) => {
    if (value === undefined || value === null || value === '') return '-'
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

// Hanya izinkan link http/https (mencegah href "javascript:...")
const safeUrl = (value) => {
    try {
        const url = new URL(String(value))
        return (url.protocol === 'http:' || url.protocol === 'https:') ? url.href : null
    } catch {
        return null
    }
}

// Status apa adanya (Verified / Rejected / Pending ...), bukan sekadar Verified-atau-Pending
const statusInfo = (raw) => {
    const v = String(raw ?? '').trim().toLowerCase()
    if (v === 'verified' || v === 'paid' || v === 'accepted') return { label: 'Verified', cls: 'verified' }
    if (v === 'down_payment_verified') return { label: 'DP Verified', cls: 'partial' }
    if (v === 'rejected' || v === 'failed' || v === 'declined') return { label: 'Rejected', cls: 'rejected' }
    if (v === '' || v === 'pending' || v === 'pending_verification' || v === 'unverified') return { label: 'Pending', cls: 'pending' }
    return { label: v.charAt(0).toUpperCase() + v.slice(1), cls: 'pending' }
}

const statusBadge = (raw) => {
    const { label, cls } = statusInfo(raw)
    return `<span class="pay-badge pay-${cls}">${label}</span>`
}

// Urutkan per kompetisi (sesuai urutan COMPETITIONS), lalu nama tim
const sortTeams = (teams) => {
    const order = (team) => {
        const idx = COMPETITIONS.indexOf(competitionOf(team))
        return idx === -1 ? COMPETITIONS.length : idx
    }
    return [...teams].sort((a, b) =>
        order(a) - order(b) ||
        String(a.teamName ?? '').localeCompare(String(b.teamName ?? ''), 'id', { sensitivity: 'base' })
    )
}

const todayStamp = () => new Date().toISOString().slice(0, 10)

// Salin tabel untuk Excel: link diganti URL lengkap, dropdown/input diganti nilainya
const tableForExport = (table) => {
    const copy = table.cloneNode(true)
    copy.querySelectorAll('a').forEach(a => {
        a.replaceWith(document.createTextNode(a.getAttribute('href') || a.textContent))
    })
    const originals = table.querySelectorAll('select, input')
    copy.querySelectorAll('select, input').forEach((field, i) => {
        const src = originals[i]
        const text = src.tagName === 'SELECT'
            ? (src.options[src.selectedIndex]?.text ?? '')
            : src.value
        field.replaceWith(document.createTextNode(text))
    })
    return copy
}

const showTableMessage = (tbody, colspan, message) => {
    if (!tbody) return
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-4">${esc(message)}</td></tr>`
}

// ===============================
//   ELEMENTS
// ===============================
const delRelList = document.getElementById('delrel-team-list')
const treasuryList = document.getElementById('treasury-history-list')
const totalTeamsEl = document.getElementById('total-teams-registered')
const chartCanvas = document.getElementById('registration-chart')
const dbTable = document.getElementById('db-table')
const finalPaymentTable = document.getElementById('final-payment-table')
const excelConvertBtn = document.getElementById('excel-convert')
const finalPaymentExcelBtn = document.getElementById('final-payment-excel')
const logoutBtn = document.getElementById('logout-btn')

let registrationChart = null
let unsubscribeTeams = null

// ===============================
//   AUTH
// ===============================
onAuthStateChanged(AUTH, (user) => {
    if (!user || !DELEGATES_RELATION_EMAILS.includes((user.email || '').trim().toLowerCase())) {
        if (unsubscribeTeams) { unsubscribeTeams(); unsubscribeTeams = null }
        window.location.href = '../login.html'
        return
    }

    // Listener baru dipasang setelah auth lolos, jadi snapshot pertama tidak terlewat
    if (!unsubscribeTeams) {
        showTableMessage(delRelList, 16, 'Loading data...')
        showTableMessage(treasuryList, PAYMENT_COLS, 'Loading data...')

        unsubscribeTeams = onSnapshot(collection(DB, 'Team'), (snap) => {
            const teams = sortTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            renderDashboard(teams)
            renderDatabase(teams)
            renderPayment(teams)
        }, (err) => {
            console.error('Cannot read Team collection', err)
            const msg = err.code === 'permission-denied'
                ? 'Akun ini tidak punya izin membaca data tim (cek Firestore Security Rules).'
                : 'Gagal memuat data tim. Coba muat ulang halaman.'
            showTableMessage(delRelList, 16, msg)
            showTableMessage(treasuryList, PAYMENT_COLS, msg)
            if (totalTeamsEl) totalTeamsEl.textContent = msg
        })
    }
})

// ===============================
//   DASHBOARD TAB
// ===============================
const isRegVerified = (team) => String(team.payment_status ?? '').toLowerCase() === 'verified'

// Rincian verified/pending di bawah angka kartu (seperti versi 2026: "✔ 3 / ⏳ 2").
// Ditaruh di elemen terpisah supaya angka utama tetap angka murni untuk animasi hitung.
function setBreakdown(countEl, verified, pending) {
    const body = countEl.closest('.card-body') || countEl.parentElement
    let line = body.querySelector('.del-breakdown')
    if (!line) {
        line = document.createElement('p')
        line.className = 'del-breakdown'
        body.querySelector('.text-center')?.appendChild(line) ?? body.appendChild(line)
    }
    line.innerHTML = `<span class="del-ok" title="Verified">✔ ${verified}</span><span class="del-wait" title="Pending">⏳ ${pending}</span>`
}

function renderDashboard(teams) {
    const counts = {}
    const verifiedCounts = {}
    COMPETITIONS.forEach(c => { counts[c.code] = 0; verifiedCounts[c.code] = 0 })

    let unknown = 0
    teams.forEach(team => {
        const found = competitionOf(team)
        if (found) {
            counts[found.code]++
            if (isRegVerified(team)) verifiedCounts[found.code]++
        } else {
            unknown++
        }
    })

    COMPETITIONS.forEach(c => {
        const el = document.getElementById(c.code)
        if (!el) return
        el.textContent = counts[c.code]
        setBreakdown(el, verifiedCounts[c.code], counts[c.code] - verifiedCounts[c.code])
    })

    if (totalTeamsEl) {
        const verified = teams.filter(isRegVerified).length
        totalTeamsEl.textContent =
            `Total Teams Registered: ${teams.length}  ·  Verified: ${verified}  ·  Pending: ${teams.length - verified}`
    }
    if (unknown > 0) {
        console.warn(`${unknown} tim punya nilai "competition" yang tidak dikenali, cek ejaannya di Firestore.`)
    }

    renderChart(counts)
}

function renderChart(counts) {
    if (!chartCanvas || typeof Chart === 'undefined') return

    const labels = COMPETITIONS.map(c => c.code)
    const values = COMPETITIONS.map(c => counts[c.code])

    if (registrationChart) {
        registrationChart.data.labels = labels
        registrationChart.data.datasets[0].data = values
        registrationChart.update()
        return
    }

    registrationChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Teams Registered',
                data: values,
                backgroundColor: 'rgba(230, 199, 42, 0.75)',
                hoverBackgroundColor: 'rgba(217, 119, 6, 0.9)',
                borderColor: '#E6C72A',
                borderWidth: 1,
                borderRadius: 8,
                maxBarThickness: 48
            }]
        },
        options: {
            responsive: true,
            animation: { duration: 1200, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0F1830',
                    titleColor: '#E6C72A',
                    bodyColor: '#F8F5F2',
                    borderColor: 'rgba(230, 199, 42, 0.5)',
                    borderWidth: 1,
                    callbacks: {
                        title: (items) => COMPETITIONS[items[0].dataIndex]?.full ?? '',
                        label: (item) => ` ${item.raw} team${item.raw === 1 ? '' : 's'}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    })
}

// ===============================
//   DATABASE TAB
// ===============================
// Field kartu mahasiswa: studentCardUrl (sama dengan versi 2026)
const studentCardOf = (person) => person.studentCardUrl ?? person.studentCardURL ?? null

const studentCardCell = (person) => {
    const url = safeUrl(studentCardOf(person))
    if (!url) return '-'
    return `<a href="${esc(url)}" target="_blank" rel="noopener" class="link-info link-offset-2">View</a>`
}

// Urutan kolom orang mengikuti thead:
// First Name, Last Name, Sex, Major, Batch, ID, Student ID, Phone, Email, Student Card
const personCells = (p, fmt = COMPETITION_FORMAT.default) => `
    <td>${esc(p.firstName)}</td>
    <td>${esc(p.lastName)}</td>
    <td>${esc(p.gender ?? p.sex)}</td>
    <td>${fmt.showMajor ? esc(p.major) : '-'}</td>
    <td>${fmt.showBatch ? esc(p.batch) : '-'}</td>
    <td>${esc(p.idCard)}</td>
    <td>${esc(p.studentId)}</td>
    <td>${esc(p.phoneNo)}</td>
    <td>${esc(p.email)}</td>
    <td>${studentCardCell(p)}</td>
`

function renderDatabase(teams) {
    if (!delRelList) return

    if (teams.length === 0) {
        showTableMessage(delRelList, 16, 'Belum ada tim yang terdaftar.')
        return
    }

    const fragment = document.createDocumentFragment()

    teams.forEach((team, index) => {
        const leader = team.leader || {}
        const members = Array.isArray(team.members) ? team.members : []
        const rows = members.length + 1
        const fmt = formatOf(team)

        const leaderRow = document.createElement('tr')
        leaderRow.classList.add('leader-row')
        leaderRow.innerHTML = `
            <td rowspan="${rows}">${index + 1}</td>
            <td rowspan="${rows}">${esc(team.teamName)}</td>
            <td rowspan="${rows}">${esc(leader.university)}</td>
            <td rowspan="${rows}">${esc(competitionName(team))}</td>
            <td rowspan="${rows}">${statusBadge(team.payment_status)}</td>
            <td rowspan="${rows}">${rows}</td>
            ${personCells(leader, fmt)}
        `
        fragment.appendChild(leaderRow)

        members.forEach(m => {
            const memberRow = document.createElement('tr')
            memberRow.innerHTML = personCells(m || {}, fmt)
            fragment.appendChild(memberRow)
        })
    })

    delRelList.replaceChildren(fragment)
}

if (excelConvertBtn && dbTable) {
    excelConvertBtn.addEventListener('click', () => {
        if (!delRelList?.querySelector('tr.leader-row')) {
            alert('Belum ada data tim untuk diunduh.')
            return
        }
        const workbook = XLSX.utils.table_to_book(tableForExport(dbTable), { sheet: 'Database' })
        XLSX.writeFile(workbook, `Delegates_Relation_DB_${todayStamp()}.xlsx`)
    })
}

// ===============================
//   FINAL PAYMENT TAB
// ===============================

const formatTime = (ts) => {
    if (!ts) return '-'
    const dt = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts)
    return isNaN(dt) ? '-' : dt.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

// Daftar link bukti bayar: "Leader · M1 · M2"
// Pemisah " · " ikut ke Excel, sehingga beberapa URL dalam satu sel tetap terpisah
const proofLinks = (finalReg, field) => {
    const people = [
        { label: 'Leader', data: finalReg.leader },
        ...(Array.isArray(finalReg.members) ? finalReg.members : [])
            .map((m, i) => ({ label: `M${i + 1}`, data: m }))
    ]
    const links = people
        .map(p => {
            const url = safeUrl(p.data?.[field])
            return url
                ? `<a href="${esc(url)}" target="_blank" rel="noopener" class="link-info">${p.label}</a>`
                : null
        })
        .filter(Boolean)
    return links.length ? links.join(' · ') : '-'
}

const hospitalityOf = (finalReg) => {
    const list = [finalReg.leader, ...(finalReg.members || [])]
        .map(p => p?.hospitality)
        .filter(Boolean)
    return list.length ? [...new Set(list)].join(' / ') : '-'
}

function renderPayment(teams) {
    if (!treasuryList) return

    const finalTeams = teams.filter(hasFinalPayment)
    if (finalTeams.length === 0) {
        showTableMessage(treasuryList, PAYMENT_COLS, 'Belum ada tim yang mengirim pembayaran final.')
        return
    }

    const fragment = document.createDocumentFragment()
    finalTeams.forEach((team, index) => {
        const fr = team.final_reg || {}
        const scheme = fr.paymentScheme === 'DP'
            ? `DP (${esc(fr.dpCategory)})`
            : esc(fr.paymentScheme)
        const lastUpdate = fr.lastPaymentAt ?? fr.updatedAt ?? fr.createdAt

        const row = document.createElement('tr')
        row.classList.add('payment-row')
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${esc(team.teamName)}</td>
            <td>${esc(team.leader?.university)}</td>
            <td>${esc(competitionName(team))}</td>
            <td>${statusBadge(finalPaymentStatusOf(team))}</td>
            <td>${scheme}</td>
            <td>${esc(hospitalityOf(fr))}</td>
            <td>${proofLinks(fr, 'paymentProof')}${fr.paymentScheme === 'DP' ? `<br><small>Last: ${proofLinks(fr, 'lastPayment')}</small>` : ''}</td>
            <td>${formatTime(lastUpdate)}</td>
        `
        fragment.appendChild(row)
    })

    treasuryList.replaceChildren(fragment)
}

if (finalPaymentExcelBtn && finalPaymentTable) {
    finalPaymentExcelBtn.addEventListener('click', () => {
        if (!treasuryList?.querySelector('tr.payment-row')) {
            alert('Belum ada data final payment untuk diunduh.')
            return
        }
        const workbook = XLSX.utils.table_to_book(tableForExport(finalPaymentTable), { sheet: 'Final Payment' })
        XLSX.writeFile(workbook, `Final_Payment_IPFEST2027_${todayStamp()}.xlsx`)
    })
}

// ===============================
//   LOG OUT
// ===============================
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        // Lepas listener dulu supaya tidak muncul error permission saat sesi ditutup
        if (unsubscribeTeams) { unsubscribeTeams(); unsubscribeTeams = null }
        signOut(AUTH)
            .then(() => { window.location.href = '../login.html' })
            .catch((err) => { console.error('Cannot log out user', err) })
    })
}