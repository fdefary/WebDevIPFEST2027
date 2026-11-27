import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { getDoc, doc } from 'firebase/firestore'

import { AUTH, DB } from '../../app/index.js'
import { failedLogin } from '../../shared/alert.js'

// =====================================================================
//   CONFIG
// =====================================================================
// Halaman tujuan kalau peserta membuka login SC langsung
// (tidak datang dari halaman tes, sehingga tidak ada `currentURL` tersimpan).
// Relatif terhadap folder login SC. Isi '' untuk hanya menampilkan pesan "login berhasil".
const DEFAULT_REDIRECT = 'sesi-1.html'

// Halaman error umum (relatif terhadap folder login SC; 400.html ada di root)
const ERROR_PAGE = '../../400.html'

// =====================================================================
//   HELPERS
// =====================================================================

// Peserta SC yang sah = tim terdaftar Smart Competition (Team/{uid}).
// Sesi dan jadwal ujiannya diperiksa di server oleh fungsi ujian.
async function isSmartCompetitionTeam(uid) {
    const snap = await getDoc(doc(DB, 'Team', uid))
    return snap.exists() && snap.data().competition === 'smart competition'
}

// Hanya izinkan kembali ke halaman di situs yang sama (cegah redirect ke situs lain)
function safeReturnURL(raw) {
    if (!raw) return null
    try {
        const url = new URL(raw, window.location.href)
        return url.origin === window.location.origin ? url.href : null
    } catch {
        return null
    }
}

function setBusy(form, busy) {
    const btn = form.querySelector('button[type="submit"]')
    if (!btn) return
    if (busy) {
        btn.dataset.label = btn.textContent
        btn.textContent = 'Signing in...'
        btn.disabled = true
    } else {
        btn.textContent = btn.dataset.label || 'Sign in'
        btn.disabled = false
    }
}

// =====================================================================
//   LOGIN
// =====================================================================
const loginForm = document.querySelector('#login-user')

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault()

    const userEmail = loginForm.email.value.trim()
    const userPassword = loginForm.password.value
    if (!userEmail || !userPassword) {
        failedLogin()
        return
    }

    setBusy(loginForm, true)
    try {
        const { user } = await signInWithEmailAndPassword(AUTH, userEmail, userPassword)

        if (!await isSmartCompetitionTeam(user.uid)) {
            // Akun valid tapi bukan peserta SC → jangan biarkan tetap login
            console.log('Not a SC delegate')
            await signOut(AUTH)
            loginForm.reset()
            failedLogin()
            return
        }

        const savedURL = safeReturnURL(localStorage.getItem('currentURL'))
        localStorage.removeItem('currentURL')

        const target = savedURL || DEFAULT_REDIRECT
        if (target) {
            window.location.href = target
        } else {
            alert('✅ Login successful. Please open the Smart Competition test link again.')
        }
    } catch (err) {
        const code = err.code
        const credentialErrors = [
            'auth/wrong-password',
            'auth/invalid-email',
            'auth/invalid-credential',
            'auth/invalid-login-credentials',
            'auth/user-not-found',
            'auth/missing-password'
        ]

        if (credentialErrors.includes(code)) {
            loginForm.reset()
            failedLogin()
        } else if (code === 'auth/too-many-requests') {
            alert('Too many login attempts. Please wait a moment and try again.')
        } else if (code === 'auth/network-request-failed') {
            alert('Network error. Please check your connection and try again.')
        } else {
            console.error('Login error', err)
            window.location.href = ERROR_PAGE
        }
    } finally {
        setBusy(loginForm, false)
    }
})