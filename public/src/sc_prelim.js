import { 
	collection, doc, 
	serverTimestamp, updateDoc 
} from 'firebase/firestore'

import { onAuthStateChanged, signOut } from 'firebase/auth'

import { DB, AUTH } from './index.js'

// Question Data
const Question1 = {
	id: 'question1',
	optId: 'q-1-a',
	element: document.getElementById('question1'),
	timer: 15, // sekon
	timerCont: document.getElementById('timer-q-1')
}
const Question2 = {
	id: 'question2',
	optId: 'q-2-a',
	element: document.getElementById('question2'),
	timer: 20,
	timerCont: document.getElementById('timer-q-2')
}

const Questions = [Question1, Question2]

let userID
onAuthStateChanged(AUTH, (user) => {
	if (user) {
		userID = user.uid
		startUserExam(userID)
	} else {
		userID = null
		localStorage.setItem('currentURL', window.location.href)
		window.location.href = '../../dashboard/smart-competition/login.html'
	}
})

function loadQuestion(question) {
	const accorBtn = question.querySelector(".accordion-button")
	const accorItem = question.querySelector(".accordion-collapse")

	// Open the current or next question
	// accorBtn.classList.remove('collapse')
	accorBtn.disabled = false

	accorItem.classList.add('show')
}

function afterSentUI(question) {
	const accorBtn = question.querySelector(".accordion-button")
	const accorItem = question.querySelector(".accordion-collapse")

	// Manage accordion btn after sending
	accorBtn.classList.add('bg-success', 'opacity-50')
	accorBtn.disabled = true

	// Manage accordion item after sending
	accorItem.classList.remove('show')
}

function sendAnswer(q, a, user) {
	try {
		updateDoc(user, {
			[q]: {
				answer: a,
				submittedAt: serverTimestamp()
			}
		})
	} catch(err) {
		alert('Cannot saving your answer! Please contact us!')
		console.error(err)
	}
}

// Start exam func
const questionTimers = new Map()

function startUserExam(userID) {
	const userRef = doc(DB, 'SC_Del_Answer', userID)

	Questions.forEach((q) => {
		let thresh = q.timer
		loadQuestion(q.element)
	
		// Case if user do form submit
		const form = q.element.querySelector('form')
		form.addEventListener('submit', (e) => {
			e.preventDefault()

			let userAnsElement = document.querySelector(`input[name="${q.optId}"]:checked`)
			let userAns = userAnsElement ? userAnsElement.value : '0'

			sendAnswer(q.id, userAns, userRef)

			const qTimer = questionTimers.get(q.id)
			if (qTimer) {
				clearInterval(qTimer)
				questionTimers.delete(q.id)
			}

			afterSentUI(q.element)
		}, { once: true })

		// Question Timer
		const qTimer = setInterval(() => {
			thresh -= 1
			q.timerCont.textContent = `${thresh}`.length === 2 ? `${thresh}` : `0${thresh}`
	
			// Case if timeout
			if (thresh <= 0) {
				afterSentUI(q.element)
				
				let userAnsElement = document.querySelector(`input[name="${q.optId}"]:checked`)
				let userAns = userAnsElement ? userAnsElement.value : '0'
	
				sendAnswer(q.id, userAns, userRef)

				clearInterval(qTimer)
				questionTimers.delete(q.id)
			}
		}, 1000)

		questionTimers.set(q.id, qTimer)
	})
}