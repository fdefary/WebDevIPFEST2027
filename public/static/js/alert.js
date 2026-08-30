const alertContainer = document.querySelector("#alertContainer")

// alert when users havent verified their email as they tried to login
export function emailNotVerified(){
	const wrapper = document.createElement('div')
	wrapper.innerHTML = `
		<div class="alert alert-warning alert-dismissible fade show" role="alert">
  			<strong>Please verified your email first!</strong>
  			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
		</div>
	`

	alertContainer.append(wrapper)
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
export function failedLogin(){
	const container = document.querySelector("#failLoginAlert")
	const wraper = document.createElement('div')
	wraper.innerHTML = `
		<div class="alert alert-danger alert-dismissible fade show" role="alert">
  			<strong>Cannot find specified account</strong>
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