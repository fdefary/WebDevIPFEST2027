import { onAuthStateChanged, signOut } from 'firebase/auth'
import { onSnapshot, collection, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { ref, uploadBytes } from 'firebase/storage'

import { DB, AUTH, STORAGE, FUNCTIONS } from './index.js'
import { privateStorageLink } from './shared/private-download.js'
import { TEAM_DOCUMENTS } from './shared/team-documents.js'
import { getRoleClaims } from './shared/role-claims.js'

// =====================================================================
//   IPFEST 2027 CONFIG
// =====================================================================

// TODO: sesuaikan tanggal rilis case dengan timeline IPFEST 2027
const PRELIM_CASE_RELEASE = { iso: '2026-12-05T00:00:00+07:00', label: '5 Dec 2026 00.00 WIB' }
const FINAL_CASE_RELEASE  = { iso: '2027-01-20T00:00:00+07:00', label: '20 Jan 2027 00.00 WIB' }

// Akun manager per kompetisi.
// competition = nilai `competition` di dokumen Team (huruf kecil, ejaan sesuai registrasi)
// TODO: update nama manager 2027
const MANAGERS = {
    'business case':               { name: 'Sely',    label: 'Business Case' },
    'geothermal development plan': { name: 'Nicho',   label: 'Geothermal Development Plan' },
    'mud inovation':               { name: 'Vincent', label: 'Mud Innovation' },
    'oil rig design':              { name: 'Falah',   label: 'Oil Rig Design' },
    'plan of development':         { name: 'Steven',  label: 'Plan of Development' },
    'paper and poster':            { name: 'Junita',  label: 'Paper and Poster' },
    'smart competition':           { name: 'Mujib',   label: 'Smart Competition' },
    'well design':                 { name: 'Akmal',   label: 'Well Design' },
    'hackaton':                    { name: 'Ghani',   label: 'Hackathon' }
}

// ID dokumen di koleksi 'Information' tempat link case disimpan (dibaca dashboard delegasi)
// TODO: pastikan ID dokumen ini masih sama untuk 2027.
// Smart Competition tidak ada di sini karena memakai halaman manager SC tersendiri.
const CASE_INFO_DOC = {
    'business case':               'TKNSFPMRQ6GGLdVurLCv',
    'geothermal development plan': 'u5XFl4812coW1J6yMqrm',
    'mud inovation':               'pHlZbe6UyXpKpO35LInb',
    'oil rig design':              'yRP8ZxRSXbIlJx0vcoO3',
    'plan of development':         'G9gLvFCkxiviK2UDc5qX',
    'paper and poster':            'BzdUKfPbIbyRYlLJmk1c',
    'well design':                 'YgdwqPY6IIhqSDY45UMH',
    'hackaton':                    '6gRhBNQ5yjBMg1tbK66d'
}

const MAX_PRELIM_SCORE = 100

// =====================================================================
//   HELPERS
// =====================================================================
// Escape supaya data dari Firestore tidak dirender sebagai HTML; nilai kosong jadi "-"
const esc = (value) => {
    if (value === undefined || value === null || value === '') return '-'
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

const toDate = (ts) => {
    if (!ts) return null
    const dt = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts)
    return isNaN(dt) ? null : dt
}

const dateCell = (date) => date
    ? `<div>${date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
       <div class="cm-sub">${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</div>`
    : '-'

const fileCell = (url) => {
    const safe = privateStorageLink(url, 'VIEW FILE', 'btn-view-file')
    return safe
        ? safe
        : `<span class="badge-ipfest cm-badge-empty">NO FILE</span>`
}

const twibbonCell = (person = {}) => privateStorageLink(person.twibbonUrl, 'VIEW FILE', 'btn-view-file') || '-'
const followIgCell = (person = {}) => privateStorageLink(person.followIgUrl, 'VIEW IG PROOF', 'btn-view-file') || '-'
const teamDocumentCells = (team, span) => TEAM_DOCUMENTS
    .map(({ field }) => `<td rowspan="${span}">${fileCell(team.teamDocuments?.[field])}</td>`)
    .join('')

const submissionBadge = (submitted, overdue) => {
    if (!submitted) return `<span class="badge-ipfest cm-badge-empty">EMPTY</span>`
    return overdue === 'no'
        ? `<span class="badge-ipfest bg-success text-white">ON TIME</span>`
        : `<span class="badge-ipfest bg-danger text-white">LATE</span>`
}

const teamCell = (team) => `
    <div class="cm-team-name">${esc(team.teamName)}</div>
    <div class="cm-sub">${esc(team.leader?.university)}</div>
`

const fileSafeName = (s) => String(s || 'competition').replace(/[^\w-]+/g, '_')

// Salin tabel untuk Excel: link jadi URL lengkap, dropdown/input jadi nilainya
// (tanpa ini, dropdown Rank akan tertulis "RANK#1#2#3..." di Excel)
const tableForExport = (table) => {
    const copy = table.cloneNode(true)
    copy.querySelectorAll('a').forEach(a => a.replaceWith(document.createTextNode(a.dataset.privateStoragePath || a.getAttribute('href') || a.textContent)))
    const originals = table.querySelectorAll('select, input')
    copy.querySelectorAll('select, input').forEach((field, i) => {
        const src = originals[i]
        const text = src.tagName === 'SELECT' ? (src.options[src.selectedIndex]?.text ?? '') : src.value
        field.replaceWith(document.createTextNode(text))
    })
    return copy
}

const exportTable = (table, sheet, suffix) => {
    if (!table.querySelector('tbody tr[data-team-id]')) {
        alert('Belum ada data untuk diunduh.')
        return
    }
    const workbook = XLSX.utils.table_to_book(tableForExport(table), { sheet })
    XLSX.writeFile(workbook, `${fileSafeName(manager?.label)}_${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

const showTableMessage = (tbody, colspan, message) => {
    if (tbody) tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-4">${esc(message)}</td></tr>`
}

// Tulis satu field; kalau gagal, beri tahu dan kembalikan tampilan
async function saveField(teamId, field, value, onFail) {
    try {
        await httpsCallable(FUNCTIONS, 'updateCompetitionResult')({ teamId, field: field.split('.').at(-1), value })
    } catch (err) {
        console.error(`Gagal menyimpan ${field}`, err)
        alert(err.code === 'permission-denied'
            ? 'Gagal menyimpan: akun ini tidak punya izin menulis (cek Firestore Security Rules).'
            : 'Gagal menyimpan. Periksa koneksi lalu coba lagi.')
        onFail?.()
    }
}

// =====================================================================
//   ELEMENTS & STATE
// =====================================================================
const el = {
    managerName:        document.getElementById('manager-name'),
    managerCompetition: document.getElementById('manager-competition'),
    dbTable:            document.getElementById('db-table'),
    dbList:             document.getElementById('delrel-team-list'),
    dbExcel:            document.getElementById('excel-convert'),
    prelimTable:        document.getElementById('submission-table'),
    prelimList:         document.getElementById('del-submission-list-prelim'),
    prelimExcel:        document.getElementById('export-prelim-excel'),
    finalTable:         document.getElementById('submission-table-final'),
    finalList:          document.getElementById('del-submission-list-final'),
    finalExcel:         document.getElementById('export-final-excel'),
    prelimCaseForm:     document.getElementById('prelim-case-distribution'),
    finalCaseForm:      document.getElementById('final-case-distribution'),
    logoutBtn:          document.getElementById('logout-btn')
}

const DB_COLS = 21
const PRELIM_COLS = 8
const FINAL_COLS = 5

let manager = null          // { competition, name, label } milik akun yang login
let unsubscribeTeams = null

// =====================================================================
//   AUTH
// =====================================================================
onAuthStateChanged(AUTH, async (user) => {
    const claims = user ? await getRoleClaims(user) : null
    const found = claims?.role === 'competition_manager'
        ? MANAGERS[claims.competition]
        : null

    // Belum login, atau bukan akun manager → ke halaman login
    if (!found) {
        if (unsubscribeTeams) { unsubscribeTeams(); unsubscribeTeams = null }
        window.location.href = '../login.html'
        return
    }

    manager = { ...found, competition: claims.competition }
    if (el.managerName) el.managerName.textContent = manager.name
    if (el.managerCompetition) el.managerCompetition.textContent = manager.label

    // Satu listener untuk semua tabel, dipasang SETELAH akun dikenali,
    // supaya data pertama tidak terlewat dan tidak ada pembacaan sebelum login.
    if (!unsubscribeTeams) {
        showTableMessage(el.dbList, DB_COLS, 'Loading data...')
        showTableMessage(el.prelimList, PRELIM_COLS, 'Loading data...')
        showTableMessage(el.finalList, FINAL_COLS, 'Loading data...')

        const managerTeams = query(collection(DB, 'Team'), where('competition', '==', manager.competition))
        unsubscribeTeams = onSnapshot(managerTeams, (snap) => {
            const teams = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => String(a.teamName ?? '').localeCompare(String(b.teamName ?? ''), 'id', { sensitivity: 'base' }))

            renderAll(teams)
        }, (err) => {
            console.error('Cannot read Team collection', err)
            const msg = err.code === 'permission-denied'
                ? 'Akun ini tidak punya izin membaca data tim (cek Firestore Security Rules).'
                : 'Gagal memuat data tim. Coba muat ulang halaman.'
            showTableMessage(el.dbList, DB_COLS, msg)
            showTableMessage(el.prelimList, PRELIM_COLS, msg)
            showTableMessage(el.finalList, FINAL_COLS, msg)
        })
    }
})

// Render ulang semua tabel tanpa mengganggu kolom yang sedang diketik
function renderAll(teams) {
    const active = document.activeElement
    const focusKey = active?.dataset?.focusKey
    const typedValue = focusKey && active.tagName === 'INPUT' ? active.value : null

    renderDatabase(teams)
    renderPrelim(teams)
    renderFinal(teams)

    if (focusKey) {
        const again = document.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`)
        if (again) {
            if (typedValue !== null) again.value = typedValue
            again.focus()
        }
    }
}

// =====================================================================
//   TAB DATABASE
// =====================================================================
// Urutan kolom = <thead>: First Name | Last Name | Gender | Major | Batch | ID | Student ID | Phone | Email
// Field gender (data lama yang memakai `sex` tetap terbaca)
const personCells = (p = {}, isLeader = false) => `
    <td>${esc(p.firstName)}${isLeader ? ' <span class="cm-leader-tag">Leader</span>' : ''}</td>
    <td>${esc(p.lastName)}</td>
    <td>${esc(p.gender ?? p.sex)}</td>
    <td>${esc(p.major)}</td>
    <td>${esc(p.batch)}</td>
    <td>${esc(p.idCard)}</td>
    <td>${esc(p.studentId)}</td>
    <td>${esc(p.phoneNo)}</td>
    <td>${esc(p.email)}</td>
    <td>${twibbonCell(p)}</td>
    <td>${followIgCell(p)}</td>
`

function renderDatabase(teams) {
    if (!el.dbList) return
    if (teams.length === 0) {
        showTableMessage(el.dbList, DB_COLS, 'Belum ada tim yang terdaftar di kompetisi ini.')
        return
    }

    const fragment = document.createDocumentFragment()
    teams.forEach((team, i) => {
        const members = Array.isArray(team.members) ? team.members : []
        const span = members.length + 1
        const verified = String(team.payment_status ?? '').toLowerCase() === 'verified'

        const leaderRow = document.createElement('tr')
        leaderRow.dataset.teamId = team.id
        leaderRow.className = 'cm-leader-row'
        leaderRow.innerHTML = `
            <td class="cm-team-cell" rowspan="${span}">${i + 1}</td>
            <td class="cm-team-cell" rowspan="${span}">${esc(team.teamName)}</td>
            <td class="cm-team-cell" rowspan="${span}">${esc(team.leader?.university)}</td>
            <td class="cm-team-cell" rowspan="${span}"><span class="badge-ipfest ${verified ? 'bg-success text-white' : 'cm-badge-pending'}">${verified ? 'Verified' : 'Pending'}</span></td>
            <td class="cm-team-cell" rowspan="${span}">${span}</td>
            ${personCells(team.leader, true)}
            ${teamDocumentCells(team, span)}
        `
        fragment.appendChild(leaderRow)

        members.forEach(m => {
            const row = document.createElement('tr')
            row.innerHTML = personCells(m)
            fragment.appendChild(row)
        })
    })
    el.dbList.replaceChildren(fragment)
}

el.dbExcel?.addEventListener('click', () => exportTable(el.dbTable, 'Database', 'Delegates_DB'))

// =====================================================================
//   TAB PRELIMINARY
// =====================================================================
function renderPrelim(teams) {
    if (!el.prelimList) return
    if (teams.length === 0) {
        showTableMessage(el.prelimList, PRELIM_COLS, 'Belum ada tim di kompetisi ini.')
        return
    }

    // Rank yang dipakai lebih dari satu tim ditandai
    const rankCount = {}
    teams.forEach(t => {
        const r = t.sub_preliminary?.rank
        if (r) rankCount[r] = (rankCount[r] || 0) + 1
    })

    const fragment = document.createDocumentFragment()
    teams.forEach((team, i) => fragment.appendChild(prelimRow(team, i + 1, teams.length, rankCount)))
    el.prelimList.replaceChildren(fragment)
}

function prelimRow(team, rowNo, totalTeams, rankCount) {
    const prelim = team.sub_preliminary || {}
    const submitted = prelim.status === true
    const finalStatus = prelim.final ?? null      // true | false | null
    const rank = prelim.rank ?? null
    const score = typeof prelim.score === 'number' ? prelim.score : null

    const row = document.createElement('tr')
    row.className = 'align-middle'
    row.dataset.teamId = team.id
    row.innerHTML = `
        <td class="text-center fw-bold">${rowNo}</td>
        <td>${teamCell(team)}</td>
        <td>${submitted ? dateCell(toDate(prelim.submittedAt)) : '-'}</td>
        <td class="text-center">${submissionBadge(submitted, prelim.overdue)}</td>
        <td class="text-center">${fileCell(prelim.fileURL)}</td>
    `

    // --- Final (lolos / tidak) ---
    const finalCell = document.createElement('td')
    const finalSelect = document.createElement('select')
    const finalClass = (v) => v === true ? 'status-passed' : v === false ? 'status-failed' : 'status-pending'
    finalSelect.className = `form-select form-select-sm select-pill ${finalClass(finalStatus)}`
    finalSelect.dataset.focusKey = `final-${team.id}`
    finalSelect.innerHTML = `
        <option value="pending" ${finalStatus === null ? 'selected' : ''}>🕒 Pending</option>
        <option value="failed"  ${finalStatus === false ? 'selected' : ''}>✖ Failed</option>
        <option value="passed"  ${finalStatus === true ? 'selected' : ''}>✔ Passed</option>
    `
    finalSelect.addEventListener('change', () => {
        const v = finalSelect.value === 'passed' ? true : finalSelect.value === 'failed' ? false : null
        finalSelect.className = `form-select form-select-sm select-pill ${finalClass(v)}`
        saveField(team.id, 'sub_preliminary.final', v, () => {
            finalSelect.value = finalStatus === true ? 'passed' : finalStatus === false ? 'failed' : 'pending'
            finalSelect.className = `form-select form-select-sm select-pill ${finalClass(finalStatus)}`
        })
    })
    finalCell.appendChild(finalSelect)

    // --- Rank ---
    const rankCell = document.createElement('td')
    const rankSelect = document.createElement('select')
    const isDup = rank && rankCount[rank] > 1
    rankSelect.className = `form-select form-select-sm select-pill ${rank ? 'rank-pill' : 'status-pending'}${isDup ? ' rank-dup' : ''}`
    rankSelect.dataset.focusKey = `rank-${team.id}`
    if (isDup) rankSelect.title = `Rank #${rank} dipakai lebih dari satu tim`
    let options = `<option value="0">RANK</option>`
    for (let r = 1; r <= totalTeams; r++) {
        options += `<option value="${r}" ${rank === r ? 'selected' : ''}>#${r}</option>`
    }
    rankSelect.innerHTML = options
    rankSelect.addEventListener('change', () => {
        const v = rankSelect.value === '0' ? null : Number(rankSelect.value)
        saveField(team.id, 'sub_preliminary.rank', v, () => { rankSelect.value = String(rank ?? 0) })
    })
    rankCell.appendChild(rankSelect)

    // --- Score ---
    const scoreCell = document.createElement('td')
    const scoreInput = document.createElement('input')
    scoreInput.type = 'number'
    scoreInput.className = 'form-control form-control-sm text-center fw-bold'
    scoreInput.style.minWidth = '90px'
    scoreInput.placeholder = '0.00'
    scoreInput.step = '0.01'
    scoreInput.min = '0'
    scoreInput.max = String(MAX_PRELIM_SCORE)
    scoreInput.dataset.focusKey = `score-${team.id}`
    if (score !== null) scoreInput.value = score.toFixed(2)
    scoreInput.addEventListener('change', () => {
        const raw = scoreInput.value
        const restore = () => { scoreInput.value = score !== null ? score.toFixed(2) : '' }
        if (raw === '') {
            saveField(team.id, 'sub_preliminary.score', null, restore)
            return
        }
        const v = parseFloat(raw)
        if (isNaN(v) || v < 0 || v > MAX_PRELIM_SCORE) {
            alert(`Score harus angka antara 0.00 dan ${MAX_PRELIM_SCORE}.00`)
            restore()
            return
        }
        scoreInput.value = v.toFixed(2)
        saveField(team.id, 'sub_preliminary.score', v, restore)
    })
    scoreCell.appendChild(scoreInput)

    row.append(finalCell, rankCell, scoreCell)
    return row
}

el.prelimExcel?.addEventListener('click', () => exportTable(el.prelimTable, 'Preliminary', 'Prelim'))

// =====================================================================
//   TAB FINAL (hanya tim yang lolos)
// =====================================================================
function renderFinal(teams) {
    if (!el.finalList) return
    const finalists = teams.filter(t => t.sub_preliminary?.final === true)
    if (finalists.length === 0) {
        showTableMessage(el.finalList, FINAL_COLS, 'Belum ada tim yang ditandai lolos ke final (tab Preliminary → kolom Final).')
        return
    }

    const fragment = document.createDocumentFragment()
    finalists.forEach((team, i) => {
        const fin = team.sub_final || {}
        const submitted = fin.status === true
        const row = document.createElement('tr')
        row.className = 'align-middle'
        row.dataset.teamId = team.id
        row.innerHTML = `
            <td class="text-center fw-bold">${i + 1}</td>
            <td>${teamCell(team)}</td>
            <td>${submitted ? dateCell(toDate(fin.submittedAt)) : '-'}</td>
            <td class="text-center">${submissionBadge(submitted, fin.overdue)}</td>
            <td class="text-center">${fileCell(fin.fileURL)}</td>
        `
        fragment.appendChild(row)
    })
    el.finalList.replaceChildren(fragment)
}

el.finalExcel?.addEventListener('click', () => exportTable(el.finalTable, 'Final', 'Final'))

// =====================================================================
//   CASE DISTRIBUTION
// =====================================================================
const caseStorage = ref(STORAGE, 'Case')

function setupCaseUpload(form, { release, stage, label }) {
    if (!form) return
    const input = form.querySelector('input[type="file"]')
    const clearBtn = form.querySelector('button[type="button"]')
    const sendBtn = form.querySelector('button[type="submit"]')

    clearBtn?.addEventListener('click', () => { input.value = '' })

    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        if (!manager) return

        if (Date.now() < new Date(release.iso).getTime()) {
            alert(`Case baru bisa diunggah mulai ${release.label}.`)
            return
        }
        const infoDocId = CASE_INFO_DOC[manager.competition]
        if (!infoDocId) {
            alert('Kompetisi ini tidak memakai upload case dari halaman ini.')
            return
        }
        const file = input?.files?.[0]
        if (!file) {
            alert('Pilih file case terlebih dahulu.')
            return
        }
        if (!confirm(`Kirim "${file.name}" sebagai ${label} untuk ${manager.label}?\nCase akan langsung terlihat di dashboard delegasi.`)) return

        const oldText = sendBtn.textContent
        sendBtn.disabled = true
        sendBtn.textContent = 'Uploading...'
        try {
            const fileRef = ref(ref(caseStorage, manager.competition), `${Date.now()}_${file.name}`)
            const snap = await uploadBytes(fileRef, file)
            const url = snap.ref.fullPath
            await httpsCallable(FUNCTIONS, 'publishCompetitionCase')({ stage, path: url })
            input.value = ''
            alert(`✅ ${label} berhasil dikirim.`)
        } catch (err) {
            console.error(`Gagal mengirim ${label}`, err)
            alert(err.code === 'storage/unauthorized' || err.code === 'permission-denied'
                ? 'Gagal mengirim: akun ini tidak punya izin (cek Storage/Firestore Security Rules).'
                : `Gagal mengirim ${label}. Coba lagi.`)
        } finally {
            sendBtn.disabled = false
            sendBtn.textContent = oldText
        }
    })
}

// Field yang ditulis sama dengan versi lama, supaya dashboard delegasi tetap membacanya:
//   prelim_case_link, sent_on, competition_name, final.case_link, final.sent_on
setupCaseUpload(el.prelimCaseForm, {
    release: PRELIM_CASE_RELEASE,
    stage: 'preliminary',
    label: 'Preliminary case'
})

setupCaseUpload(el.finalCaseForm, {
    release: FINAL_CASE_RELEASE,
    stage: 'final',
    label: 'Final case'
})

// =====================================================================
//   LOG OUT
// =====================================================================
el.logoutBtn?.addEventListener('click', () => {
    if (unsubscribeTeams) { unsubscribeTeams(); unsubscribeTeams = null }
    signOut(AUTH)
        .then(() => { window.location.href = '../login.html' })
        .catch((err) => console.error('Cannot log out user', err))
})
