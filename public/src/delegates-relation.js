// ========================= UI Logic =========================
const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(el => new bootstrap.Tooltip(el))

// ========================= IMPORT =========================
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { onSnapshot, collection, getDocs } from 'firebase/firestore'
import { DB, AUTH } from './index.js'

// ========================= COMPETITION FULL NAME =========================
const CompetitionFullName = {
	"business case": "Business Case Competition",
	"geothermal development plan": "Geothermal Development Plan Competition",
	"paper and poster": "Paper and Poster Competition",
	"oil rig design": "Oil Rig Design Competition",
	"smart competition": "Smart Competition",
	"mud inovation": "Mud Innovation Competition",
	"plan of development": "Plan of Development Competition",
	"well design": "Well Design Competition",
	"hackaton": "Hackathon Competition"
};

// ========================= COMPETITION FORMAT CONFIG =========================
const CompetitionFormatConfig = {
	"smart competition": {
		showMajor: true,
		showBatch: true
	},
	"paper and poster": {
		showMajor: false,
		showBatch: true
	},
	"default": {
		showMajor: true,
		showBatch: true
	}
}

function getCompetitionFormat(compe) {
	return CompetitionFormatConfig[compe] || CompetitionFormatConfig["default"]
}

// ========================= LOGIN AUTHENTICATION =========================
onAuthStateChanged(AUTH, (user) => {
	if (user) {
		if (user.email !== "officialdelegates.ipfest2026@gmail.com") {
			window.location.href = "../login.html"
		}
	} else {
		window.location.href = "../login.html"
	}
})

// ========================= FIRESTORE COLLECTION =========================
const Teams = collection(DB, 'Team')

// ========================= DATABASE TABLE =========================
const delRelList = document.getElementById("delrel-team-list")

onSnapshot(Teams, (snap) => {
	delRelList.innerHTML = '' // reset table

	// ========================= COMPETITION COUNTERS =========================
	const counters = {
		"business case": { pending: 0, verified: 0, html: "BCC" },
		"geothermal development plan": { pending: 0, verified: 0, html: "GDPC" },
		"mud inovation": { pending: 0, verified: 0, html: "MIC" },
		"oil rig design": { pending: 0, verified: 0, html: "ORDC" },
		"paper and poster": { pending: 0, verified: 0, html: "PPC" },
		"plan of development": { pending: 0, verified: 0, html: "PODC" },
		"smart competition": { pending: 0, verified: 0, html: "SC" },
		"well design": { pending: 0, verified: 0, html: "WDC" },
		"hackaton": { pending: 0, verified: 0, html: "HC" }
	};
	// ======================================================================

	snap.docs.forEach((team, index) => {
		let data = team.data()

		const compeFull = CompetitionFullName[data.competition] || data.competition
		const compeFormat = getCompetitionFormat(data.competition)

		// ========================= COUNT PENDING & VERIFIED =========================
		if (counters[data.competition]) {
			if (data.payment_status === "verified") {
				counters[data.competition].verified++
			} else {
				counters[data.competition].pending++
			}
		}
		// ==========================================================================

		let mappedLeader = {
			first_name: data.leader.firstName || "",
			last_name: data.leader.lastName || "",
			major: compeFormat.showMajor ? data.leader.major || "" : "-",
			gender: "-",
			batch: compeFormat.showBatch ? data.leader.batch || "" : "-",
			person_id: data.leader.idCard || "",
			student_id: data.leader.studentId || "",
			phone: data.leader.phoneNo || "",
			email: data.leader.email || ""
		}

		let mappedMembers = (data.members || []).map(m => ({
			first_name: m.firstName || "",
			last_name: m.lastName || "",
			major: compeFormat.showMajor ? m.major || "" : "-",
			gender: "-",
			batch: compeFormat.showBatch ? m.batch || "" : "-",
			person_id: m.idCard || "",
			student_id: m.studentId || "",
			phone: m.phoneNo || "",
			email: m.email || "",
		}))

		let mappedLeaderIMG = data.leader.studentCardUrl || ""
		let mappedMembersIMG = (data.members || []).map(m => m.studentCardUrl || "")

		let paymentStatus = data.payment_status === "verified" ? "verified" : "pending"

		createTeamList(
			index + 1,
			data.teamName,
			data.leader.university,
			compeFull,
			paymentStatus,
			mappedLeader,
			mappedLeaderIMG,
			mappedMembers,
			mappedMembersIMG
		)
	})

	// ========================= UPDATE COMPETITION WIDGETS =========================
	Object.keys(counters).forEach(key => {
		const comp = counters[key];
		const total = comp.pending + comp.verified;

		const targetEl = document.getElementById(comp.html);
		if (targetEl) {
			targetEl.innerText = `${total} (✔ ${comp.verified} / ⏳ ${comp.pending})`;
		}
	});
	// ==========================================================================
})

// ========================= TABLE RENDER FUNCTION =========================
function createTeamList(rowNo, teamName, univ, compe, payStatus, teamLeader, leader_id, teamMember, membersImgs) {

	const payColor = payStatus === "verified" ? "text-success fw-bold" : "text-danger fw-bold"

	let teamLeaderRow = document.createElement("tr")

	teamLeaderRow.innerHTML = `
		<td rowspan="${teamMember.length + 1}">${rowNo}</td>
		<td rowspan="${teamMember.length + 1}">${teamName}</td>
		<td rowspan="${teamMember.length + 1}">${univ}</td>
		<td rowspan="${teamMember.length + 1}">${compe}</td>

		<td rowspan="${teamMember.length + 1}" class="${payColor}">
			${payStatus}
		</td>

		<td rowspan="${teamMember.length + 1}">${teamMember.length + 1}</td>

		<td class="text-secondary">${teamLeader.first_name}</td>
		<td class="text-secondary">${teamLeader.last_name}</td>
		<td>${teamLeader.major}</td>
		<td>${teamLeader.batch}</td>
		<td>${teamLeader.person_id}</td>
		<td>${teamLeader.student_id}</td>
		<td>${teamLeader.phone}</td>
		<td>${teamLeader.email}</td>
		<td><a href="${leader_id}" target="_blank" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">Download</a></td>
	`;

	delRelList.appendChild(teamLeaderRow)

	teamMember.forEach((member, index) => {
		let row = document.createElement("tr")

		row.innerHTML = `
			<td>${member.first_name}</td>
			<td>${member.last_name}</td>
			<td>${member.major}</td>
			<td>${member.batch}</td>
			<td>${member.person_id}</td>
			<td>${member.student_id}</td>
			<td>${member.phone}</td>
			<td>${member.email}</td>
			<td><a href="${membersImgs[index]}" target="_blank" class="link-info">Download</a></td>
		`

		delRelList.appendChild(row)
	})
}

// ===========================
// HITUNG TOTAL TEAM TERDAFTAR
// ===========================
async function countRegisteredTeams() {
	try {
		const snap = await getDocs(collection(DB, "Team"));

		let total = 0;
		let verified = 0;
		let pending = 0;

		snap.forEach(doc => {
			const d = doc.data();
			total++;

			if (d.payment_status === "verified") verified++;
			else pending++;
		});

		document.getElementById("total-teams-registered").innerHTML = `
			<p>Total Teams: ${total}</p>
			<p>Verified: ${verified}</p>
			<p>Pending: ${pending}</p>
		`;

	} catch (err) {
		console.error("Gagal menghitung total tim:", err);
	}
}

// ========================= PANGGIL SETELAH LOGIN =========================
onAuthStateChanged(AUTH, (user) => {
	if (user) {
		countRegisteredTeams();
	}
});

// ========================= EXPORT EXCEL =========================
const dbTable = document.getElementById("db-table")
const excelConvertBtn = document.getElementById("excel-convert")

excelConvertBtn.addEventListener("click", () => {
	const workbook = XLSX.utils.table_to_book(dbTable, { sheet: "DB" })
	XLSX.writeFile(workbook, "Delegates_DB.xlsx")
})

// ========================= SIGN OUT =========================
const logoutBtn = document.querySelector("#logout-btn")

logoutBtn.addEventListener('click', () => {
	signOut(AUTH).then(() => {
		console.log("log out btn clicked")
		window.location.href = '../login.html'
	})
	.catch((err) => {
		console.log("Cannot loggin out user", err)
	})
})
