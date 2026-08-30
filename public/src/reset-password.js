import { sendPasswordResetEmail } from 'firebase/auth'
import { AUTH } from './index.js'
import { resetEmailSent } from '../static/js/alert.js'

const resetForm = document.querySelector("#reset-password")

resetForm.addEventListener('submit', (e) => {
	e.preventDefault()

	let userEmail = document.querySelector("#passwordResetEmail").value

	if (resetForm.checkValidity()){
		sendPasswordResetEmail(AUTH, userEmail)
		.then(() => {
			resetEmailSent()
			console.log("EMAIL SENT")
			resetForm.reset()
		})
		.catch((err) => { console.log("Something wrong:", err.message) })
	}
})