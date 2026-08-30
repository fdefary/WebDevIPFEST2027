import { onAuthStateChanged, signOut } from 'firebase/auth'

import {
    onSnapshot,
    collection,
    updateDoc, doc,
    deleteField,
    serverTimestamp,
	getDocs
} from 'firebase/firestore'

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

import { DB, AUTH, STORAGE } from './index.js'

import { setToastAlert } from '../static/js/alert.js'

// check auth
let switchCompetition = null
let isPODC = false
const managerName = document.querySelector("#manager-name")
const managerCompetition = document.querySelector("#manager-competition")

const normalizeCompetition = (value = '') => value.trim().toLowerCase()

const compeManagerEmail = {
    "plan of development": "podc.ipfest2026@gmail.com",
    "smart competition": "sc.ipfest2026@gmail.com",
    "mud inovation": "mic.ipfest2026@gmail.com",
    "paper and poster": "ppc.ipfest2026@gmail.com",
    "oil rig design": "ordc.ipfest2026@gmail.com",
    "business case": "bcc.ipfest2026@gmail.com",
    "geothermal development plan": "gdpc.ipfest2026@gmail.com",
    "well design": "wdc.ipfest2026@gmail.com",
    "hackaton": "hc.ipfest2026@gmail.com"
}

onAuthStateChanged(AUTH, (user) => {
    if (user) {
        switch (user.email) {
            case compeManagerEmail['business case']:
                switchCompetition = 'business case'
                managerName.textContent = 'Muhammad Raihan Fadillah'
                managerCompetition.textContent = 'Business Case'
                break

            case compeManagerEmail['geothermal development plan']:
                switchCompetition = 'geothermal development plan'
                managerName.textContent = 'Iman Ganteng'
                managerCompetition.textContent = 'Geothermal Development Plan'
                break

            case compeManagerEmail['mud inovation']:
                switchCompetition = 'mud inovation'
                managerName.textContent = 'Nafidz Rayyan Hidayat'
                managerCompetition.textContent = 'Mud Innovation'
                break

            case compeManagerEmail['oil rig design']:
                switchCompetition = 'oil rig design'
                managerName.textContent = 'Muhammad Ferris Rahardian'
                managerCompetition.textContent = 'Oil Rig Design'
                break

            case compeManagerEmail['plan of development']:
                switchCompetition = 'plan of development'
                managerName.textContent = 'Jonathan Denen'
                managerCompetition.textContent = 'Plan of Development'
                isPODC = true
                // document.getElementById("submission-table").style.width = '120vw'
                // document.getElementById("submission-table").querySelector("tr").innerHTML = `
                //     <tr>
                //         <th scope="col">No.</th>
                //         <th scope="col">Team Name</th>
                //         <th scope="col">University</th>
                //         <th scope="col">Last Submission</th>
                //         <th scope="col">Overdue</th>
                //         <th scope="col">Submission</th>
                //         <th scope="col">L.A.S</th>
                //         <th scope="col">Abstract</th>
                //         <th scope="col">L.A.A.S</th>
                //         <th scope="col">Add. Abstract</th>
                //         <th scope="col">Final</th>
                //     </tr>
                // `
                // document.getElementById('submission-table-final').style.width= '100vw'
                // document.getElementById('submission-table-final').querySelector("tr").innerHTML = `
                //     <tr>
                //         <th scope="col">No.</th>
                //         <th scope="col">Team Name</th>
                //         <th scope="col">University</th>
                //         <th scope="col">Last Submission</th>
                //         <th scope="col">Overdue</th>
                //         <th scope="col">Submission</th>
                //         <th scope="col">Last Model</th>
                //         <th scope="col">Overdue</th>
                //         <th scope="col">Model</th>
                //         <th scope="col">Last PPT</th>
                //         <th scope="col">Overdue</th>
                //         <th scope="col">PPT</th>
                //     </tr>
                // `
                break
                

            case compeManagerEmail['paper and poster']:
                switchCompetition = 'paper and poster'
                managerName.textContent = 'Ibra Rabbani Dahlan'
                managerCompetition.textContent = 'Paper and Poster'
                break

            case compeManagerEmail['smart competition']:
                switchCompetition = 'smart competition'
                managerName.textContent = 'Daniel Matthew Christian Sagala'
                managerCompetition.textContent = 'Smart Competition'
                break

            case compeManagerEmail['well design']:
                switchCompetition = 'well design'
                managerName.textContent = 'Jiro Adika Faruq'
                managerCompetition.textContent = 'Well Design'
                break

            case compeManagerEmail['hackaton']:
                switchCompetition = 'hackaton'
                managerName.textContent = 'Audrey Hillary Tamba'
                managerCompetition.textContent = 'Hackathon Competition'
                break

            default:
                window.location.href = "../login.html"
        }
    }
})

// Main Database
const Teams = collection(DB, 'Team')

// Database Tab Section
const delRelList = document.getElementById("delrel-team-list")
const Submission_Status = collection(DB, 'Team')
const submissionTablePrelim = document.getElementById("del-submission-list-prelim");
const compeManagerPrivilage = document.getElementById("compe-manager-privilage");

onSnapshot(Teams, (snap) => {
	if (!switchCompetition) return
	const teamDocs = snap.docs
	const activeCompetition = normalizeCompetition(switchCompetition)

	const compeSize = teamDocs.filter(doc => {
		const d = doc.data()
		return normalizeCompetition(d.competition || '') === activeCompetition
	})

    delRelList.innerHTML = ''

    compeSize.forEach((team, index) => {
        let data = team.data()
        createTeamList(
            index + 1,
            data.teamName,
            data.leader.university,
            data.competition,
            data.leader,
            data.members ?? [],
            data.payment_status === "verified" ? "Verified" : "Pending"
        )
    })
})

// ===============================
//   CREATE TABLE ROW BY REAL DATA
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

// EXPORT TO EXCEL
const dbTable = document.getElementById("db-table")
const excelConvertBtn = document.getElementById("excel-convert")

excelConvertBtn.addEventListener("click", () => {
    const workbook = XLSX.utils.table_to_book(dbTable, { sheet: "DB" })
    XLSX.writeFile(workbook, `${switchCompetition}_Delegates_DB.xlsx`)
})

// ===============================
//   CREATE TABLE ROW BY REAL DATA
// ===============================

function createPrelimSubmissionRow(table, teamId, rowNo, teamData, totalTeams) {
    const prelim = teamData.sub_preliminary || {};
    const submission = prelim.fileURL || null;
    const overdue = prelim.overdue !== undefined ? prelim.overdue : "Haven't Submitted";
    const status = prelim.status !== undefined ? prelim.status : false;
    const lastSubmit = prelim.submittedAt ? prelim.submittedAt.toDate() : null;

    const finalStatus = prelim.final ?? null; 
    const rankStatus = prelim.rank ?? null;
    // Ambil data score yang ada (jika ada)
    const scoreStatus = prelim.score !== undefined ? prelim.score : null;

    const row = document.createElement("tr");
    row.id = teamId;
    row.className = "align-middle";

    // --- CELL FINAL STATUS ---
    const finalStatusCell = document.createElement("td");
    const finalSelect = document.createElement("select");
    let finalClass = "status-pending";
    if (finalStatus === true) finalClass = "status-passed";
    else if (finalStatus === false) finalClass = "status-failed";
    
    finalSelect.className = `form-select form-select-sm select-pill ${finalClass}`;
    finalSelect.innerHTML = `
        <option value="pending" ${finalStatus === null ? "selected" : ""}>🕒 Pending</option>
        <option value="failed" ${finalStatus === false ? "selected" : ""}>✖ Failed</option>
        <option value="passed" ${finalStatus === true ? "selected" : ""}>✔ Passed</option>
    `;
    finalSelect.onchange = async (e) => {
        const val = e.target.value;
        const newStatus = val === "passed" ? true : (val === "failed" ? false : null);
        await updateDoc(doc(DB, "Team", teamId), { "sub_preliminary.final": newStatus });
    };
    finalStatusCell.appendChild(finalSelect);

    // --- CELL RANK ---
    const rankCell = document.createElement("td");
    const rankSelect = document.createElement("select");
    rankSelect.className = `form-select form-select-sm select-pill ${rankStatus ? 'rank-pill' : 'status-pending'}`;
    let rankOptions = `<option value="0">RANK</option>`;
    for (let i = 1; i <= totalTeams; i++) {
        rankOptions += `<option value="${i}" ${rankStatus === i ? "selected" : ""}>#${i}</option>`;
    }
    rankSelect.innerHTML = rankOptions;
    rankSelect.onchange = async (e) => {
        const val = e.target.value;
        const newRank = val === "0" ? null : Number(val);
        await updateDoc(doc(DB, "Team", teamId), { "sub_preliminary.rank": newRank });
    };
    rankCell.appendChild(rankSelect);

    // --- CELL SCORE (NEW) ---
    const scoreCell = document.createElement("td");
    const scoreInput = document.createElement("input");
    
    scoreInput.type = "number";
    scoreInput.className = "form-control form-control-sm text-center fw-bold text-primary";
    scoreInput.style.minWidth = "80px";
    scoreInput.placeholder = "0.00";
    scoreInput.step = "0.01"; // Memungkinkan desimal
    scoreInput.min = "0";
    scoreInput.max = "100";

    // Set value awal jika ada, format ke 2 desimal
    if (scoreStatus !== null) {
        scoreInput.value = parseFloat(scoreStatus).toFixed(2);
    }

    scoreInput.onchange = async (e) => {
        let val = e.target.value;

        // Jika input dikosongkan, update ke null
        if (val === "") {
            await updateDoc(doc(DB, "Team", teamId), { "sub_preliminary.score": null });
            return;
        }

        let floatVal = parseFloat(val);

        // Validasi Input
        if (isNaN(floatVal) || floatVal < 0 || floatVal > 100) {
            alert("Error: Score must be a number between 0.00 and 100.00");
            
            // Reset ke nilai database terakhir atau kosongkan jika error
            e.target.value = scoreStatus !== null ? parseFloat(scoreStatus).toFixed(2) : "";
            return;
        }

        // Format tampilan menjadi 2 desimal (ex: 16 -> 16.00)
        e.target.value = floatVal.toFixed(2);

        // Update ke Firebase
        await updateDoc(doc(DB, "Team", teamId), { "sub_preliminary.score": floatVal });
    };
    scoreCell.appendChild(scoreInput);


    // --- RENDER ROW ---
    const btnDownload = submission
        ? `<a href="${submission}" target="_blank" class="btn-view-file">
            <i class="bi bi-cloud-arrow-down-fill"></i> VIEW FILE
        </a>`
        : `<span class="badge-ipfest" style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;">
            NO FILE
        </span>`;

    row.innerHTML = `
        <td class="text-center fw-bold text-muted" style="font-size: 12px;">${rowNo}</td>
        <td>
            <div class="fw-bold" style="color: #4c1d95; font-size: 14px;">${teamData.teamName || "No Name"}</div>
            <div class="text-muted" style="font-size: 10px;">${teamData.leader?.university || "-"}</div>
        </td>
        <td class="text-dark" style="font-size: 13px; line-height: 1.2;">
            ${status && lastSubmit ? `
                <div>${lastSubmit.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</div>
                <div class="text-muted" style="font-size: 11px;">${lastSubmit.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
            ` : "-"}
        </td>
        <td class="text-center">
            <span class="badge-ipfest ${overdue === "no" ? 'bg-success text-white' : (status ? 'bg-danger text-white' : 'bg-secondary text-white')}">
                ${status ? (overdue === "no" ? "ON TIME" : "LATE") : "EMPTY"}
            </span>
        </td>
        <td class="text-center">${btnDownload}</td>
    `;

    // Append cells sesuai urutan header HTML: Final -> Rank -> Score
    row.appendChild(finalStatusCell);
    row.appendChild(rankCell);
    row.appendChild(scoreCell); // Menambahkan kolom score di akhir

    table.append(row);
}
// ==========================================
// EXPORT PRELIM TABLE TO EXCEL
// ==========================================

const excelBtn = document.getElementById("export-prelim-excel");
const tablePrelim = document.getElementById("submission-table"); // ID tabel HTML kamu

if (excelBtn && tablePrelim) {
    excelBtn.addEventListener("click", () => {
        // Ambil nama file dari variabel switchCompetition (jika ada), atau default
        const fileName = (typeof switchCompetition !== 'undefined' ? switchCompetition : "Competition") + "_Prelim.xlsx";
        
        // Convert langsung
        const workbook = XLSX.utils.table_to_book(tablePrelim, { sheet: "Data" });
        XLSX.writeFile(workbook, fileName);
    });
}

// ================================
// LISTENER UTAMA (REAL-TIME)
// ================================

const submissionTableFinal = document.getElementById("del-submission-list-final");

onSnapshot(collection(DB, "Team"), (snap) => {
    if (!switchCompetition) return;

    const activeCompetition = normalizeCompetition(switchCompetition);
    
    // Filter berdasarkan kompetisi yang dipilih
    const filteredTeams = snap.docs.filter(doc =>
        normalizeCompetition(doc.data().competition || '') === activeCompetition
    );

    const totalCount = filteredTeams.length;

    // 1. UPDATE TABEL PRELIM 
    if(typeof submissionTablePrelim !== 'undefined' && submissionTablePrelim) {
        submissionTablePrelim.innerHTML = '';
        filteredTeams.forEach((docSnap, index) => {
             // ... fungsi createPrelimSubmissionRow kamu ...
             createPrelimSubmissionRow(submissionTablePrelim, docSnap.id, index + 1, docSnap.data(), totalCount);
        });
    }

    console.log(`[UI] Tables updated with ${totalCount} teams for ${activeCompetition}`);

    // 2. UPDATE TABEL FINAL 
    if(submissionTableFinal) {
        submissionTableFinal.innerHTML = ''; // Reset isi tabel

        const finalistTeams = filteredTeams.filter(doc => {
            const data = doc.data();
            // Cek existensi object sub_preliminary DAN status final === true
            return data.sub_preliminary && data.sub_preliminary.final === true;
        });
        
        finalistTeams.forEach((docSnap, index) => {
            createFinalSubmissionRow(
                submissionTableFinal, 
                docSnap.id, 
                index + 1, 
                docSnap.data()
            );
        });
        console.log(`[UI] Final Table updated: ${finalistTeams.length} finalists out of ${totalCount} teams.`);
    }
});

// // Final Submission
// const submissionTableFinal = document.getElementById("del-submission-list-final")

// function createFinalSubmissionTable(table, teamId, rowNo, teamName, univ, submission, status, overdue, lastSubmit) {
// 	let submitRow = document.createElement("tr")
// 	submitRow.setAttribute("id", teamId)

// 	let URLSubmit = `
// 		<a href="${submission}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
// 			Download
// 		</a>
// 	`
// 	submitRow.innerHTML = `
// 		<td>${rowNo}</td>
// 		<td>${teamName}</td>
// 		<td>${univ}</td>
// 		<td>${status ? lastSubmit.toDate().toLocaleString() : "No Data"}</td>
// 		<td>${status ? overdue : "No Data"}</td>
// 		<td>${status ? URLSubmit : "No Data"}</td>
// 	`
// 	table.append(submitRow)
// }

// function createFinalPODCSubmissionTable(table, teamId, rowNo, teamName, univ, submission, status, overdue, overdueModel, overdueppt, lastSubmit, absSub, addAbsSub, absStat, addAbsStat, lastAbs, lastAddAbs) {
// 	let submitRow = document.createElement("tr")
// 	submitRow.setAttribute("id", teamId)

// 	let URLSubmit = `
// 		<a href="${submission}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
// 			Download
// 		</a>
// 	`
// 	let URLAbsSub = `
// 		<a href="${absSub}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
// 			Download
// 		</a>
// 	`
// 	let URLAddAbsSub = `
// 		<a href="${addAbsSub}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
// 			Download
// 		</a>
// 	`

// 	submitRow.innerHTML = `
// 		<td>${rowNo}</td>
// 		<td>${teamName}</td>
// 		<td>${univ}</td>
// 		<td>${status ? lastSubmit.toDate().toLocaleString() : "No Data"}</td>
// 		<td>${status ? overdue : "No Data"}</td>
// 		<td>${status ? URLSubmit : "No Data"}</td>
// 		<td>${absStat ? lastAbs.toDate().toLocaleString() : "No Data"}</td>
// 		<td>${absStat ? overdueModel : "No Data"}</td>
// 		<td>${absStat ? URLAbsSub : "No Data"}</td>
// 		<td>${addAbsStat ? lastAddAbs.toDate().toLocaleString() : "No Data"}</td>
// 		<td>${addAbsStat ? overdueppt : "No Data"}</td>
// 		<td>${addAbsStat ? URLAddAbsSub : "No Data"}</td>
// 	`
// 	table.append(submitRow)
// }

// onSnapshot(Submission_Status, (snap) => {
// 	if (!switchCompetition) return
// 	const submissionDocs = snap.docs
// 	const activeCompetition = normalizeCompetition(switchCompetition)
// 	const currentCompe = submissionDocs.filter(doc => normalizeCompetition(doc.data().competition || '') === activeCompetition)
// 	const currentCompeFinal = currentCompe.filter(doc => doc.data().final === true)
	
// 	submissionTablePrelim.innerHTML = ''
// 	submissionTableFinal.innerHTML = ''

// 	if (isPODC) {
// 		currentCompe.forEach((compe, index) => {
// 			let data = compe.data()
// 			createPODCSubmissionTable(
// 				submissionTablePrelim,
// 				compe.id,
// 				index+1,
// 				data.team_name,
// 				data.university,
// 				data.sub_preliminary.fileURL,
// 				data.sub_preliminary.status,
// 				data.sub_preliminary.overdue,
// 				data.sub_preliminary.submittedAt,
// 				data.final,
// 				data.sub_abstract.fileURL,
// 				data.sub_add_abstract.fileURL,
// 				data.sub_abstract.status,
// 				data.sub_add_abstract.status,
// 				data.sub_abstract.submittedAt,
// 				data.sub_add_abstract.submittedAt
// 			)
// 		})
// 		currentCompeFinal.forEach((compe, index) => {
// 			let data = compe.data()
// 			createFinalPODCSubmissionTable(
// 				submissionTableFinal,
// 				compe.id,
// 				index+1,
// 				data.team_name,
// 				data.university,
// 				data.sub_final?.fileURL,
// 				data.sub_final?.status,
// 				data.sub_final?.overdue,
// 				data.sub_final_model?.overdue,
// 				data.sub_final_ppt?.overdue,
// 				data.sub_final?.submittedAt,
// 				data.sub_final_model?.fileURL,
// 				data.sub_final_ppt?.fileURL,
// 				data.sub_final_model?.status,
// 				data.sub_final_ppt?.status,
// 				data.sub_final_model?.submittedAt,
// 				data.sub_final_ppt?.submittedAt
// 			)
// 		})
// 	} else {
// 		currentCompe.forEach((compe, index) => {
// 			let data = compe.data()
// 			createSubmissionTable(
// 				submissionTablePrelim,
// 				compe.id,
// 				index+1, 
// 				data.team_name,
// 				data.university,
// 				data.sub_preliminary.fileURL,
// 				data.sub_preliminary.status,
// 				data.sub_preliminary.overdue,
// 				data.sub_preliminary.submittedAt,
// 				data.final
// 			)
// 		})
// 		currentCompeFinal.forEach((compe, index) => {
// 			let data = compe.data()
// 			createFinalSubmissionTable(
// 				submissionTableFinal,
// 				compe.id,
// 				index+1, 
// 				data.team_name,
// 				data.university,
// 				data.sub_final?.fileURL || false,
// 				data.sub_final?.status || false,
// 				data.sub_final?.overdue || false,
// 				data.sub_final?.submittedAt || false
// 			)
// 		})
// 	}

	

// 	const compeConfirm = document.querySelectorAll(".compe-manager-confirm")
// 	compeConfirm.forEach(c => c.addEventListener('change', () => {
// 		console.log("CONFIRM CHANGE")

// 		switch (c.value) {
// 			case "1":
// 				c.classList.remove("bg-danger")
// 				c.classList.remove("bg-light", "text-black")
// 				c.classList.add("bg-success", "text-white")
// 				break
// 			case "-1":
// 				c.classList.add("bg-danger", "text-white")
// 				c.classList.remove("bg-light", "text-black")
// 				c.classList.remove("bg-success")
// 				break
// 			default:
// 				c.classList.remove("bg-danger", "text-white")
// 				c.classList.add("bg-light", "text-black")
// 				c.classList.remove("bg-success", "text-white")
// 				break
// 		}
// 	}))
// })

// Case Distribution Section
const caseStorageCollection = {
	"business case": "TKNSFPMRQ6GGLdVurLCv",
	"geothermal development plan": "u5XFl4812coW1J6yMqrm",
	"mud inovation": "pHlZbe6UyXpKpO35LInb",
	"oil rig design": "yRP8ZxRSXbIlJx0vcoO3",
	"plan of development": "G9gLvFCkxiviK2UDc5qX",
	"paper and poster": "BzdUKfPbIbyRYlLJmk1c",
	"well design": "YgdwqPY6IIhqSDY45UMH",
	"hackaton": "6gRhBNQ5yjBMg1tbK66d"
}

const caseStorage = ref(STORAGE, 'Case')
const CASE_RELEASE_TIMESTAMP = new Date('2025-11-30T00:00:00+07:00').getTime()


const prelimCaseDist = document.getElementById("prelim-case-distribution")
const caseInput = prelimCaseDist.querySelector("input")
const deletePrelimCaseFile = document.getElementById("delete-file-case-prelim")

deletePrelimCaseFile.addEventListener("click", () => { caseInput.value = '' })

prelimCaseDist.addEventListener("submit", (e) => {
	e.preventDefault()

	prelimCaseDist.querySelectorAll("button")[1].textContent = 'Processing...'
	prelimCaseDist.querySelectorAll("button")[1].disabled = true

	try{
		if (Date.now() < CASE_RELEASE_TIMESTAMP) {
			alert("Case can only be uploaded after 30 Nov 2025 00.00 WIB")
			prelimCaseDist.querySelectorAll("button")[1].textContent = 'Pending'
			prelimCaseDist.querySelectorAll("button")[1].disabled = false
			return
		}
		const file = caseInput.files[0]
		const folderRef = ref(caseStorage, switchCompetition)
		const fileRef = ref(folderRef, `${file.name}`)

		uploadBytes(fileRef, file).then((snap) => {
			return getDownloadURL(snap.ref)
		})
		.then((downloadURL) => {
			return updateDoc(doc(DB, 'Information', caseStorageCollection[switchCompetition]), {
				prelim_case_link: downloadURL,
				sent_on: serverTimestamp(),
				competition_name: switchCompetition
			})
		})
		.then(() => {
			alert("Success sending the file")
			prelimCaseDist.querySelectorAll("button")[1].textContent = 'Success'
			prelimCaseDist.querySelectorAll("button")[1].disabled = false
		})
		.catch((err) => {
			console.log("There is error during sending case file", err.message)
			alert("[ERROR-1N] Cannot sending case file!")
			prelimCaseDist.querySelectorAll("button")[1].textContent = 'Failed'
			prelimCaseDist.querySelectorAll("button")[1].disabled = false
		})
	} catch (err) {
		console.log("Error during uploading case file", err.message)
		alert("[ERROR-0UT] Cannot sending case file!")
		prelimCaseDist.querySelectorAll("button")[1].textContent = 'Failed'
		prelimCaseDist.querySelectorAll("button")[1].disabled = false
	}
})

const finalCaseDist = document.getElementById("final-case-distribution")
const finalCaseInput = finalCaseDist.querySelector("input")
const deleteFinalCaseFile = document.getElementById("delete-file-case-final")
const finalcaserelease = new Date('2025-01-04T00:00:00+07:00').getTime()

deleteFinalCaseFile.addEventListener("click", () => { finalCaseInput.value = '' })

finalCaseDist.addEventListener("submit", (e) => {
	e.preventDefault()

	finalCaseDist.querySelectorAll("button")[1].textContent = 'Processing...'
	finalCaseDist.querySelectorAll("button")[1].disabled = true

	try{
		if (Date.now() < finalcaserelease) {
			alert("Case can only be uploaded after 4 Jan 2026 00.00 WIB")
			finalCaseDist.querySelectorAll("button")[1].textContent = 'Failed'
			finalCaseDist.querySelectorAll("button")[1].disabled = false
			return
		}
		const file = finalCaseInput.files[0]
		const folderRef = ref(caseStorage, switchCompetition)
		const fileRef = ref(folderRef, `${file.name}`)

		uploadBytes(fileRef, file).then((snap) => {
			return getDownloadURL(snap.ref)
		})
		.then((downloadURL) => {
			return updateDoc(doc(DB, 'Information', caseStorageCollection[switchCompetition]), {
				final: { case_link: downloadURL, sent_on: serverTimestamp() }
			})
		})
		.then(() => {
			alert("Success sending the file")
		})
		.catch((err) => {
			console.log("There is error during sending case file", err.message)
			alert("[ERROR-1N] Cannot sending case file!")
		})
	} catch (err) {
		console.log("Error during uploading case file", err.message)
		alert("[ERROR-0UT] Cannot sending case file!")
	} finally {
		finalCaseDist.querySelectorAll("button")[1].textContent = 'Send'
		finalCaseDist.querySelectorAll("button")[1].disabled = false
	}	
})

// ================================
// Final Row
// ================================
function createFinalSubmissionRow(table, teamId, rowNo, teamData) {
    // Ambil data sub_final, default object kosong jika belum ada
    const finalSub = teamData.sub_final || {};
    
    const submission = finalSub.fileURL || null;
    const overdue = finalSub.overdue; // "no" atau "yes" (sesuai data firebase)
    const status = finalSub.status || false; // boolean status submit
    
    // Konversi timestamp ke Date object
    const lastSubmit = finalSub.submittedAt ? finalSub.submittedAt.toDate() : null;

    const row = document.createElement("tr");
    row.id = `final-${teamId}`; // ID unik row
    row.className = "align-middle";

    // --- LOGIKA TOMBOL VIEW FILE ---
    const btnDownload = submission
        ? `<a href="${submission}" target="_blank" class="btn-view-file">
            <i class="bi bi-cloud-arrow-down-fill"></i> VIEW FILE
        </a>`
        : `<span class="badge-ipfest" style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;">
            NO FILE
        </span>`;

    // --- LOGIKA BADGE OVERDUE ---
    // Default: Abu-abu (Empty/Belum submit)
    let badgeClass = "bg-secondary text-white";
    let badgeText = "EMPTY";

    if (status === true) {
        if (overdue === "no") {
            badgeClass = "bg-success text-white"; // Hijau
            badgeText = "ON TIME";
        } else {
            badgeClass = "bg-danger text-white"; // Merah
            badgeText = "LATE";
        }
    }

    // --- FORMAT TANGGAL ---
    const dateDisplay = (status && lastSubmit) 
        ? `<div>${lastSubmit.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</div>
           <div class="text-muted" style="font-size: 11px;">${lastSubmit.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>`
        : "-";

    // --- RENDER HTML ROW ---
    // Kolom sesuai thead: No | Team Name | Time | Overdue | Submission
    row.innerHTML = `
        <td class="text-center fw-bold text-muted" style="font-size: 12px;">${rowNo}</td>
        <td>
            <div class="fw-bold" style="color: #4c1d95; font-size: 14px;">${teamData.teamName || "No Name"}</div>
            <div class="text-muted" style="font-size: 10px;">${teamData.leader?.university || "-"}</div>
        </td>
        <td class="text-dark" style="font-size: 13px; line-height: 1.2;">
            ${dateDisplay}
        </td>
        <td class="text-center">
            <span class="badge-ipfest ${badgeClass}">
                ${badgeText}
            </span>
        </td>
        <td class="text-center">${btnDownload}</td>
    `;

    table.append(row);
}

// Listener simpel untuk export excel FINAL
const excelFinalBtn = document.getElementById("export-final-excel");
const tableFinal = document.getElementById("submission-table-final");

if (excelFinalBtn && tableFinal) {
    excelFinalBtn.addEventListener("click", () => {
        // Nama file: "NamaKompetisi_Final.xlsx"
        const fileName = (typeof switchCompetition !== 'undefined' ? switchCompetition : "Competition") + "_Final.xlsx";
        
        // Convert langsung
        const workbook = XLSX.utils.table_to_book(tableFinal, { sheet: "Final Data" });
        XLSX.writeFile(workbook, fileName);
    });
}

// Sign out user
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

