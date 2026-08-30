import { doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore'

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

	const docRef = doc(DB, 'Grand_IPCONVEX', email)

	try {
		const snap = await getDoc(docRef)

		if (snap.exists()) {
			setToastAlert('warning', 'You have already checked in!')
			throw new Error('User has already checked in')
		} else {
			await setDoc(docRef, {
				name: fullName,
				email: email,
				major: major,
				university: university,
				nim: studentNumber,
				batch: batch,
				checkin: serverTimestamp(),
				checkout: null
			})
			
			attendanceForm.reset()
			window.location.href = 'post-attendance.html'
		}
	} catch (error) {
		if (error.message !== 'User already checked in') {
			setToastAlert('danger', 'Something went wrong, please contact us!')
			console.error('Error updating document:', error)
		}
	} finally {
		formBtn.innerText = 'Submit'
		formBtn.disabled = false
	}
})