import { sendEmailVerification } from 'firebase/auth'

// Delegates with a saved team may sign in without a verified email until the end of
// 4 December 2026 (WIB), the day before the preliminary case release. Verification
// emails were unavailable for a while because the daily Firebase email quota ran out.
export const EMAIL_VERIFICATION_GRACE_END = Date.parse('2026-12-05T00:00:00+07:00')
export const EMAIL_VERIFICATION_DEADLINE_LABEL = '4 December 2026, 23:59 WIB'

export function emailVerificationRequired(now = new Date()) {
  return now.getTime() >= EMAIL_VERIFICATION_GRACE_END
}

// Limit resends from the dashboard so the shared daily email quota is not used up.
const RESEND_COOLDOWN_MS = 5 * 60 * 1000
const RESEND_STORAGE_KEY = 'verification-email-sent-at'

function lastResendAt() {
  try {
    return Number(localStorage.getItem(RESEND_STORAGE_KEY)) || 0
  } catch {
    return 0
  }
}

function rememberResend() {
  try {
    localStorage.setItem(RESEND_STORAGE_KEY, String(Date.now()))
  } catch {
    // Storage can be unavailable (private mode); the cooldown then lasts for this page only.
  }
}

// Show a reminder on the delegate dashboard while the account is still unverified.
export function showVerificationReminder(user) {
  if (!user || user.emailVerified || document.querySelector('[data-verify-reminder]')) return

  const banner = document.createElement('div')
  banner.dataset.verifyReminder = 'true'
  banner.className = 'alert alert-warning m-3'
  banner.setAttribute('role', 'alert')
  banner.innerHTML = `
    <strong>Please verify your email.</strong>
    <span class="d-block small mt-1">
      Your email address is not verified yet. Please verify it before ${EMAIL_VERIFICATION_DEADLINE_LABEL}.
      <a href="#" class="fw-bold" style="color: #e6c72a; text-decoration: underline;" data-verify-resend>Send verification email</a>
    </span>
    <span class="d-block small mt-1" data-verify-status></span>
  `
  const host = document.querySelector('main') || document.body
  host.prepend(banner)

  const link = banner.querySelector('[data-verify-resend]')
  const status = banner.querySelector('[data-verify-status]')
  let busy = false

  link.addEventListener('click', async (event) => {
    event.preventDefault()
    if (busy) return
    const waitMs = lastResendAt() + RESEND_COOLDOWN_MS - Date.now()
    if (waitMs > 0) {
      status.textContent = `An email was sent recently. Please check your inbox and spam folder, or try again in ${Math.ceil(waitMs / 60000)} minute(s).`
      return
    }
    busy = true
    status.textContent = 'Sending...'
    try {
      await sendEmailVerification(user)
      rememberResend()
      status.textContent = 'Verification email sent. Please check your inbox and spam folder.'
    } catch (error) {
      console.error('Failed to send verification email:', error)
      status.textContent = error?.code === 'auth/too-many-requests' || /quota/i.test(error?.message || '')
        ? 'Email sending is temporarily limited. Please try again later.'
        : 'Could not send the email. Please try again later.'
    } finally {
      busy = false
    }
  })
}
