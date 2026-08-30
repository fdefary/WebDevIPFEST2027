import { onAuthStateChanged, signOut } from 'firebase/auth'

import { onSnapshot, collection } from 'firebase/firestore'

import { DB, AUTH } from './index.js'

import { setToastAlert } from '../static/js/alert.js'

// Check auth
onAuthStateChanged(AUTH, (user) => {
	if (user) {
		if (user.email !== 'event@ipfest25.com') {
			window.location.href = '../login.html'
		}
	} else {
		window.location.href = '../login.html'
	}
})

// Career Talk Attendance
const CareerTalk = collection(DB, 'Career_Talk')
const CareerTalkTable = document.getElementById('ct-list')

onSnapshot(CareerTalk, (snap) => {
	let personList = snap.docs

	CareerTalkTable.innerHTML = ''
	personList.forEach((person, index) => {
		let data = person.data()

		let checkin = data.checkin === null ? 'No data' : data.checkin.toDate().toLocaleString()
		let checkout = data.checkout === null ? 'No data' : data.checkout.toDate().toLocaleString()

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

		let checkin = data.checkin === null ? 'No data' : data.checkin.toDate().toLocaleString()
		let checkout = data.checkout === null ? 'No data' : data.checkout.toDate().toLocaleString()

		createPersonList(
			GITable,
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

function createPersonList(table, rowNo, name, univ, major, batch, nim, email, checkin, checkout) {
	let rowContainer = document.createElement('tr')
	rowContainer.innerHTML = `
		<td>${rowNo}</td>
		<td>${name}</td>
		<td>${univ}</td>
		<td>${major}</td>
		<td>${batch}</td>
		<td>${nim}</td>
		<td>${email}</td>
		<td>${checkin}</td>
		<td>${checkout}</td>
	`
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