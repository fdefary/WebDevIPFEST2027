import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'

import { DB } from './index.js'

import { setToastAlert } from './shared/alert.js'

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

	if (!attendanceForm.checkValidity()) {
		setToastAlert('warning', 'Please fill in all the fields properly!')
		return
	}

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
		await updateDoc(docRef, { checkout: serverTimestamp() })

		attendanceForm.reset()
		window.location.href = 'post-attendance.html'
	} catch (error) {
		if (error.code === 'permission-denied') {
			setToastAlert('danger', 'No check-in record exists, or you have already checked out.')
		} else {
			setToastAlert('danger', 'Something went wrong, please contact us!')
			console.error('Error updating document:', error)
		}
	} finally {
		formBtn.innerText = 'Submit'
		formBtn.disabled = false
	}
})
