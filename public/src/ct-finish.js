import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

import { DB } from './index.js'

import { setToastAlert } from '../static/js/alert.js'

const attendanceForm = document.querySelector('#ct-start')
const formBtn = attendanceForm.querySelector('button')
const attendanceFullName = document.querySelector('#attendance-full-name')
const attendanceEmail = document.querySelector('#attendance-email')
const attendanceMajor = document.querySelector('#attendance-major')
const attendanceUniversity = document.querySelector('#attendance-university')
const attendanceStudentNumber = document.querySelector('#attendance-nim')
const attendanceBatch = document.querySelector('#attendance-batch')

attendanceForm.addEventListener('submit', async (e) => {
	e.preventDefault()

	formBtn.innerText = 'Loading...'
	formBtn.disabled = true

	const fullName = attendanceFullName.value
	const email = attendanceEmail.value
	const major = attendanceMajor.value
	const university = attendanceUniversity.value
	const studentNumber = attendanceStudentNumber.value
	const batch = attendanceBatch.value

	const docRef = doc(DB, 'Career_Talk', email)

	const checkTimeDifference = (t1, t2) => {
		const date1 = t1.toDate()
		const date2 = t2.toDate()

		const twoHalfHrMS = 2.5 * 60 * 60 * 1000
		const diffMilliseconds = Math.abs(date2 - date1)

		return diffMilliseconds >= twoHalfHrMS
	}

	try {
		const snap = await getDoc(docRef)

		if (!snap.exists()) {
			setToastAlert('danger', 'You have not checked in yet!')
			throw new Error('User has not checked in')
		}

		if (snap.data().checkout !== null) {
			setToastAlert('danger', 'You have already checked out')
			throw new Error('User has already checked out')
		}

		if (email === snap.id) {
			await updateDoc(docRef, {
				checkout: serverTimestamp()
			})
		}

		const updatedSnap = await getDoc(docRef)
		const data = updatedSnap.data()

		await updateDoc(docRef, {
			send_certificate: checkTimeDifference(data.checkin, data.checkout)
		})

		attendanceForm.reset()
		window.location.href = 'post-attendance.html'
	} catch (error) {
		setToastAlert('danger', 'Something went wrong, please contact us!')
		console.error('Error updating document:', error)
	} finally {
		formBtn.innerText = 'Submit'
		formBtn.disabled = false
	}
})
