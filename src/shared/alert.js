const alertContainer = document.querySelector("#alertContainer")

// alert when users havent verified their email as they tried to login
// onResend (optional): async () => string — sends a new verification email and returns a status message.
export function emailNotVerified(onResend){
	const COOLDOWN_SECONDS = 60
	const wrapper = document.createElement('div')
	wrapper.dataset.verifyAlert = 'true'
	wrapper.innerHTML = `
		<div class="alert alert-warning alert-dismissible fade show" role="alert">
  			<strong>Please verify your email first!</strong>
  			${onResend ? `
  			<p class="mb-0 mt-1 small">
  				Didn't receive the email? Check your spam folder or
  				<a href="#" class="resend-verification fw-bold">resend verification email</a>.
  				<span class="resend-status d-block"></span>
  			</p>` : ''}
  			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
		</div>
	`

	alertContainer.append(wrapper)

	if (!onResend) return

	const link = wrapper.querySelector('.resend-verification')
	const status = wrapper.querySelector('.resend-status')
	let busy = false

	function startCooldown() {
		let remaining = COOLDOWN_SECONDS
		link.style.pointerEvents = 'none'
		link.style.opacity = '0.6'
		const timer = setInterval(() => {
			remaining -= 1
			if (remaining <= 0 || !wrapper.isConnected) {
				clearInterval(timer)
				link.style.pointerEvents = ''
				link.style.opacity = ''
				link.textContent = 'resend verification email'
				return
			}
			link.textContent = `resend available in ${remaining}s`
		}, 1000)
		link.textContent = `resend available in ${remaining}s`
	}

	link.addEventListener('click', async (e) => {
		e.preventDefault()
		if (busy) return
		busy = true
		status.textContent = 'Sending...'
		try {
			status.textContent = await onResend()
		} catch (err) {
			status.textContent = err?.message || 'Could not send the email. Please try again later.'
		}
		busy = false
		startCooldown()
	})
}

// alert when users successfully create their account
export function accountCreated(){
	const wrapper = document.createElement('div')
	wrapper.innerHTML = `
		<div class="alert alert-success alert-dismissible fade show" role="alert">
  			<strong>Success creating your account!</strong>
			<p>Log in to your account to see your payment status</p>
  			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
		</div>
	`

	alertContainer.append(wrapper)
}

// alert when reset password email has been sent
export function resetEmailSent(){
	const wrapper = document.createElement('div')
	wrapper.innerHTML = `
		<div class="alert alert-success alert-dismissible fade show" role="alert">
  			<strong>Success sending the email!</strong>
  			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
		</div>
	`

	alertContainer.append(wrapper)
}

// alert when user fail to login
export function failedLogin(message = 'Cannot find specified account'){
	const container = document.querySelector("#failLoginAlert")
	const wraper = document.createElement('div')
	wraper.innerHTML = `
		<div class="alert alert-danger alert-dismissible fade show" role="alert">
			<strong>${message}</strong>
  			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
		</div>
	`

	container.append(wraper)
}

export function setToastAlert(flag, message) {
	const toastElement = document.querySelector('#upload-toast')
	const toastBody = toastElement.querySelector('.toast-body')

	toastElement.setAttribute('class', `toast border border-${flag} border-3`)
	toastBody.textContent = message

	const toast = new bootstrap.Toast(toastElement)
	toast.show()
}

// UI for upload progress
export function showProgressUI(progressVal, progressUI, currentSizeShow, totalSizeShow, totalSize) {
	let uploadVal = Math.round(progressVal * 100) / 100

	progressUI.style.width = uploadVal + '%'
	progressUI.textContent = uploadVal + '%'

	if (totalSize / (1024**3) >= 1) { // GB size file
		totalSize = (totalSize / (1024**3)).toFixed(2)
		currentSizeShow.textContent = ((uploadVal/100) * totalSize).toFixed(2) + ' GB'
		totalSizeShow.textContent = totalSize + ' GB'
	} else if (totalSize / (1024**2) >= 1) { // MB size file
		totalSize = (totalSize / (1024**2)).toFixed(2)
		currentSizeShow.textContent = ((uploadVal/100) * totalSize).toFixed(2) + ' MB'
		totalSizeShow.textContent = totalSize + ' MB'
	} else if (totalSize / 1024 >= 1) { // KB size file
		totalSize = (totalSize / 1024).toFixed(2)
		currentSizeShow.textContent = ((uploadVal/100) * totalSize).toFixed(2) + ' KB'
		totalSizeShow.textContent = totalSize + ' KB'
	}
}