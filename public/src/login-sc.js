import { signInWithEmailAndPassword } from 'firebase/auth'

import { collection, getDocs, setDoc, doc } from 'firebase/firestore'

import { AUTH, DB } from './index.js'

import { failedLogin } from '../static/js/alert.js'

// DB for SC Delegates
const SC_DB = collection(DB, 'SC_Selection')
const SC_ANS = collection(DB, 'SC_Del_Answer')

getDocs(SC_DB).then((snap) => {
	let users = snap.docs

	users.forEach(user => {
		let data = user.data()

		setDoc(doc(DB, 'SC_Del_Answer', user.id), {
			university: data.university,
			team: data.team
		})
	})
})

// Check if user is valid as SC delegate
async function validateSC(uid) {
	const snap = await getDocs(SC_DB)
	let userDocs = snap.docs

	for (let doc of userDocs) {
		if (uid === doc.id) {
			return true
		}
	}
	return false
}

const loginForm = document.querySelector("#login-user")
loginForm.addEventListener('submit', async (e) => {
	e.preventDefault()

	const userEmail = loginForm.email.value
	const userPassword = loginForm.password.value

	try {
		const credential = await signInWithEmailAndPassword(AUTH, userEmail, userPassword)
		const user = credential.user

		if (user && user.email) {
			const savedURL = localStorage.getItem('currentURL')
			localStorage.removeItem('currentURL')

			if (await validateSC(user.uid)) { // a valid sc delegate
				window.location.href = savedURL
			} else {
				failedLogin()
				console.log("Not a SC delegate")
			}
		}
	} catch (err) {
		const errorCode = err.code

		if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-email' || errorCode === 'auth/invalid-credential') {
			loginForm.reset()
			failedLogin()
		} else {
			window.location.href = '400.html'
		}
	}
});