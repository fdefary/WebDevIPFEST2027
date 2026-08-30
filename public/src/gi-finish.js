import { doc, serverTimestamp, setDoc, updateDoc, getDoc } from 'firebase/firestore'

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

	const checkTimeDifference = (t1, t2) => {

		if (t1 === null || t2 === null) {
			return false
		}

		const date1 = t1.toDate()
		const date2 = t2.toDate()

		const twoHalfHrMS = 2.5 * 60 * 60 * 1000
		const diffMilliseconds = Math.abs(date2 - date1)

		return diffMilliseconds >= twoHalfHrMS
	}

	try {
		const snap = await getDoc(docRef)

		if (!snap.exists()) {
			await setDoc(docRef, {
				full_name: fullName,
				email: email,
				major: major,
				university: university,
				student_number: studentNumber,
				batch: batch,
				checkin: null,
				checkout: serverTimestamp()
			})
		} else if (email === snap.id) {
			await updateDoc(docRef, {
				checkout: serverTimestamp(),
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