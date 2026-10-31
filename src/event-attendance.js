import { onAuthStateChanged, signOut } from 'firebase/auth'

import { onSnapshot, collection } from 'firebase/firestore'

import { DB, AUTH } from './index.js'

import { setToastAlert } from './shared/alert.js'
import { getRoleClaims } from './shared/role-claims.js'

// Check auth
onAuthStateChanged(AUTH, async (user) => {
	const claims = user ? await getRoleClaims(user) : null
	if (user) {
		if (claims?.role !== 'event_staff') {
			window.location.href = '../login.html'
		}
	} else {
		window.location.href = '../login.html'
	}
})

// Career Talk Attendance
const CareerTalk = collection(DB, 'Career_Talk')
const CareerTalkTable = document.getElementById('ct-list')

const dateLabel = (value) => value?.toDate ? value.toDate().toLocaleString() : 'No data'

onSnapshot(CareerTalk, (snap) => {
	let personList = snap.docs

	CareerTalkTable.innerHTML = ''
	personList.forEach((person, index) => {
		let data = person.data()

		let checkin = dateLabel(data.checkin)
		let checkout = dateLabel(data.checkout)

		createPersonList(
			CareerTalkTable,
			index+1,
			data.name,
			data.university,
			data.major,
			data.batch,
			data.nim,
			data.email,
			checkin,
			checkout
		)
	})
})

// Grand IPCONVEX
const GrandIPCONVEX = collection(DB, 'Grand_IPCONVEX')
const GITable = document.getElementById('gi-list')

onSnapshot(GrandIPCONVEX, (snap) => {
	let personList = snap.docs

	GITable.innerHTML = ''
	personList.forEach((person, index) => {
		let data = person.data()

		let checkin = dateLabel(data.checkin)
		let checkout = dateLabel(data.checkout)

		createPersonList(
			GITable,
			index+1,
			data.full_name ?? data.name,
			data.university, 
			data.major,
			data.batch,
			data.student_number ?? data.nim,
			data.email,
			checkin,
			checkout
		)
	})
})

function createPersonList(table, rowNo, name, univ, major, batch, nim, email, checkin, checkout) {
	const rowContainer = document.createElement('tr')
	for (const value of [rowNo, name, univ, major, batch, nim, email, checkin, checkout]) {
		const cell = document.createElement('td')
		cell.textContent = String(value ?? '-')
		rowContainer.append(cell)
	}
	table.append(rowContainer)
}

// Download as .xlsx
const ctTable = document.getElementById("ct-table")
const ctExcelConvertBtn = document.getElementById("excel-convert-ct")

ctExcelConvertBtn.addEventListener("click", () => {
	const workbook = XLSX.utils.table_to_book(ctTable, { sheet: "Attendance" })

	XLSX.writeFile(workbook, "CT_Attendance.xlsx")
})

const giTable = document.getElementById("gi-table")
const giExcelConvertBtn = document.getElementById("excel-convert-gi")

giExcelConvertBtn.addEventListener("click", () => {
	const workbook = XLSX.utils.table_to_book(giTable, { sheet: "Attendance" })

	XLSX.writeFile(workbook, "GI_Attendance.xlsx")
})

// Sign Out
const logoutBtn = document.querySelector("#logout-btn")

logoutBtn.addEventListener('click', () => {
	signOut(AUTH).then(() => {
		window.location.href = '../login.html'
	})
	.catch((err) => {
		setToastAlert('danger', 'Cannot proceed!')
		console.log("Cannot loggin out user", err)
	})
})
