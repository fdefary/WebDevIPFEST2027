import { onAuthStateChanged, signOut } from "firebase/auth";

import {
	collection, doc, onSnapshot,
	query, updateDoc, where, deleteField,
	serverTimestamp,
	getDocs
} from 'firebase/firestore'

import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage'

import { DB, AUTH, STORAGE } from './index.js'

import { setToastAlert } from '../static/js/alert.js'

// =========================
// Manager Mapping
// =========================
const managerName = document.querySelector("#manager-name");
const managerCompetition = document.querySelector("#manager-competition");

const compeManagerEmail = {
    "smart competition": {
        email: "sc.ipfest2026@gmail.com",
        name: "Daniel Matthew Christian Sagala",
        label: "Smart Competition",
        firestoreValue: "smart competition"
    }
};

// =========================
// Identify Logged-in Manager
// =========================
let switchCompetition = null;

onAuthStateChanged(AUTH, (user) => {
    if (!user) return (window.location.href = "../../login.html");

    // cari manager berdasarkan email
    const manager = Object.values(compeManagerEmail)
        .find(m => m.email === user.email);

    if (!manager) {
        window.location.href = "../../login.html";
        return;
    }

    // Set UI + variabel
    switchCompetition = manager.firestoreValue;
    managerName.textContent = manager.name;
    managerCompetition.textContent = manager.label;
});

// =========================
// Logout
// =========================
const logoutBtn = document.querySelector("#logout-btn")

logoutBtn.addEventListener('click', () => {
	signOut(AUTH)
		.then(() => {
			console.log("log out btn clicked")
			window.location.href = '../../login.html'
		})
		.catch((err) => console.log("Cannot log out user", err))
})

// =========================
// Database Listener
// =========================
const delRelList = document.getElementById("delrel-team-list")

let SCTeam = null

const selectionList = document.getElementById("del-selection-list-prelim");

const waitCompetition = setInterval(() => {
    if (!switchCompetition) return;

    clearInterval(waitCompetition);

    SCTeam = query(collection(DB, 'Team'), where('competition', '==', switchCompetition));

    onSnapshot(SCTeam, (snap) => {
        let teamDocs = snap.docs;
        
        const totalTeams = teamDocs.length; 

        // RESET TABEL 
        delRelList.innerHTML = '';
        selectionList.innerHTML = ''; 

        teamDocs.forEach((team, index) => {
            let teamData = team.data();
            let teamId = team.id; // 

            // --- A. Render Tabel Database Utama ---
            createTeamList(
                index + 1,
                teamData.teamName,
                teamData.leader.university,
                teamData.competition,
                teamData.leader,
                teamData.members ?? [],
                teamData.payment_status === "verified" ? "Verified" : "Pending"
            );

            // --- B. Render Tabel Preliminary ---
            createPrelimSelectionRow(
                selectionList,  
                teamId,         
                index + 1,      
                teamData,       
                totalTeams      
            );
        });
    });
}, 100);


// =========================
// Render Table
// ===============================


function createTeamList(rowNo, teamName, univ, compe, leader, members, paymentStatus) {

    const totalMembers = members.length + 1

    // Leader row
    const leaderRow = document.createElement("tr")
    leaderRow.innerHTML = `
        <td rowspan="${totalMembers}">${rowNo}</td>
        <td rowspan="${totalMembers}">${teamName}</td>
        <td rowspan="${totalMembers}">${univ}</td>
        <td rowspan="${totalMembers}">${compe}</td>
        <td rowspan="${totalMembers}">${paymentStatus}</td>
        <td rowspan="${totalMembers}">${totalMembers}</td>

        <td>${leader.firstName}</td>
        <td>${leader.lastName}</td>
        <td>${leader.major}</td>
        <td>${leader.batch}</td>
        <td>${leader.idCard}</td>
        <td>${leader.studentId}</td>
        <td>${leader.phoneNo}</td>
        <td>${leader.email}</td>
    `
    delRelList.appendChild(leaderRow)

    // Members row
    members.forEach(m => {
        const mRow = document.createElement("tr")
        mRow.innerHTML = `
            <td>${m.firstName}</td>
            <td>${m.lastName}</td>
            <td>${m.major}</td>
            <td>${m.batch}</td>
            <td>${m.idCard}</td>
            <td>${m.studentId}</td>
            <td>${m.phoneNo}</td>
            <td>${m.email}</td>
        `
        delRelList.appendChild(mRow)
    })
}

// =========================
// Export XLSX
// =========================
const dbTable = document.getElementById("db-table")
const excelConvertBtn = document.getElementById("excel-convert")

excelConvertBtn.addEventListener("click", () => {
	const workbook = XLSX.utils.table_to_book(dbTable, { sheet: "DB" })
	XLSX.writeFile(workbook, "Delegates_DB.xlsx")
})


// =========================
// Function to Render Prelim Selection Row
// =========================
function createPrelimSelectionRow(tableElement, teamId, rowNo, teamData, totalTeams) {
    // Ambil data sub_preliminary (gunakan object kosong jika belum ada)
    const prelim = teamData.sub_preliminary || {};
    
    const finalStatus = prelim.final; // null (pending), true (passed), false (failed)
    const rankStatus = prelim.rank || 0; // default 0
    const scoreStatus = prelim.score !== undefined ? prelim.score : null;

    const row = document.createElement("tr");
    row.className = "align-middle";

    // --------------------------------------------------
    // 1. KOLOM NO & 2. KOLOM TEAM NAME/UNIV
    // --------------------------------------------------
    // Kita render string HTML statis untuk bagian yang tidak diedit
    const staticCols = `
        <th scope="row" class="text-center">${rowNo}</th>
        <td>
            <div class="fw-bold text-primary">${teamData.teamName || "No Name"}</div>
            <div class="small text-muted">${teamData.leader?.university || "-"}</div>
        </td>
    `;
    row.innerHTML = staticCols;

    // --------------------------------------------------
    // 3. KOLOM FINAL (Dropdown: Pending, Failed, Passed)
    // --------------------------------------------------
    const finalTd = document.createElement("td");
    finalTd.className = "text-center";
    
    const finalSelect = document.createElement("select");
    // Styling warna warni berdasarkan status
    let finalClass = "btn-light border-secondary text-secondary"; // Pending styling
    if (finalStatus === true) finalClass = "btn-success text-white";
    else if (finalStatus === false) finalClass = "btn-danger text-white";

    finalSelect.className = `form-select form-select-sm text-center fw-bold ${finalClass}`;
    finalSelect.style.borderRadius = "20px"; // Rounded pill style
    
    finalSelect.innerHTML = `
        <option value="pending" ${finalStatus === null || finalStatus === undefined ? "selected" : ""}>🕒 Pending</option>
        <option value="failed" ${finalStatus === false ? "selected" : ""}>✖ Failed</option>
        <option value="passed" ${finalStatus === true ? "selected" : ""}>✔ Passed</option>
    `;

    // Event Listener: Update Firestore saat diganti
    finalSelect.onchange = async (e) => {
        const val = e.target.value;
        const newStatus = val === "passed" ? true : (val === "failed" ? false : null);
        
        try {
            // Update Firestore
            await updateDoc(doc(DB, "Team", teamId), { 
                "sub_preliminary.final": newStatus 
            });
            // Update visual class tanpa reload
            e.target.className = `form-select form-select-sm text-center fw-bold ${
                newStatus === true ? "btn-success text-white" : 
                (newStatus === false ? "btn-danger text-white" : "btn-light border-secondary text-secondary")
            }`;
        } catch (err) {
            console.error("Error updating final status:", err);
            alert("Gagal mengupdate status.");
        }
    };
    finalTd.appendChild(finalSelect);
    row.appendChild(finalTd);

    // --------------------------------------------------
    // 4. KOLOM RANK (Dropdown: 1 - Total Teams)
    // --------------------------------------------------
    const rankTd = document.createElement("td");
    rankTd.className = "text-center";

    const rankSelect = document.createElement("select");
    rankSelect.className = "form-select form-select-sm text-center";
    
    // Opsi Default
    let rankOptions = `<option value="0" class="text-muted">- Rank -</option>`;
    
    // Loop untuk membuat opsi ranking sejumlah tim yang ada
    for (let i = 1; i <= totalTeams; i++) {
        rankOptions += `<option value="${i}" ${rankStatus === i ? "selected" : ""}>#${i}</option>`;
    }
    rankSelect.innerHTML = rankOptions;

    // Event Listener: Update Firestore
    rankSelect.onchange = async (e) => {
        const val = parseInt(e.target.value);
        const newRank = val === 0 ? null : val;

        try {
            await updateDoc(doc(DB, "Team", teamId), { 
                "sub_preliminary.rank": newRank 
            });
        } catch (err) {
            console.error("Error updating rank:", err);
        }
    };
    rankTd.appendChild(rankSelect);
    row.appendChild(rankTd);

    // --------------------------------------------------
    // 5. KOLOM SCORE (Input: 0 - 250)
    // --------------------------------------------------
    const scoreTd = document.createElement("td");
    scoreTd.className = "text-center";

    const scoreInput = document.createElement("input");
    scoreInput.type = "number";
    scoreInput.className = "form-control form-control-sm text-center fw-bold text-primary";
    scoreInput.placeholder = "0.00";
    scoreInput.min = "0";
    scoreInput.max = "250";
    scoreInput.step = "0.01"; // Support desimal

    // Set value jika ada di database
    if (scoreStatus !== null) {
        scoreInput.value = parseFloat(scoreStatus).toFixed(2);
    }

    // Event Listener: Update Firestore (menggunakan 'change' agar tidak spam saat mengetik)
    scoreInput.onchange = async (e) => {
        let val = e.target.value;

        // Jika dikosongkan manual, set null ke database
        if (val === "") {
            await updateDoc(doc(DB, "Team", teamId), { "sub_preliminary.score": null });
            return;
        }

        let floatVal = parseFloat(val);

        // Validasi Angka 0 - 250
        if (isNaN(floatVal) || floatVal < 0 || floatVal > 250) {
            alert("Score harus angka antara 0 - 250");
            e.target.value = scoreStatus !== null ? parseFloat(scoreStatus).toFixed(2) : ""; // Reset ke nilai lama
            return;
        }

        // Format tampilan di input jadi 2 desimal
        e.target.value = floatVal.toFixed(2);

        try {
            await updateDoc(doc(DB, "Team", teamId), { 
                "sub_preliminary.score": floatVal 
            });
        } catch (err) {
            console.error("Error updating score:", err);
        }
    };
    scoreTd.appendChild(scoreInput);
    row.appendChild(scoreTd);

    // Append baris ke tabel utama
    tableElement.appendChild(row);
}