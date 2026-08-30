import { onAuthStateChanged, signOut } from 'firebase/auth'

import {
    onSnapshot,
    collection,
    updateDoc, doc,
    deleteField,
    serverTimestamp
} from 'firebase/firestore'

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

import { DB, AUTH, STORAGE } from './index.js'

import { setToastAlert } from '../static/js/alert.js'

// check auth
let switchCompetition
let isPODC = false
const managerName = document.querySelector("#manager-name")
const managerCompetition = document.querySelector("#manager-competition")
const compeManagerEmail = {
    "PODC": "podc.ipfest2026@gmail.com",
    "SC": "sc.ipfest2026@gmail.com",
    "MIC": "mic.ipfest2026@gmail.com",
    "PPC": "ppc.ipfest2026@gmail.com",
    "ORDC": "ordc.ipfest2026@gmail.com",
    "BCC": "bcc.ipfest2026@gmail.com",
    "GDPC": "gdpc.ipfest2026@gmail.com",
    "WDC": "wdc.ipfest2026@gmail.com",
    "HC": "hc.ipfest2026@gmail.com"
}

onAuthStateChanged(AUTH, (user) => {
    if (user) {
        switch (user.email) {
            case compeManagerEmail['BCC'].trim().toLowerCase():
                switchCompetition = 'BCC'
                managerName.textContent = 'Muhammad Raihan Fadillah'
                managerCompetition.textContent = 'Bussiness Case'
                break
            case compeManagerEmail['GDPC'].trim().toLowerCase():
                switchCompetition = 'GDPC'
                managerName.textContent = 'Iman Ganteng'
                managerCompetition.textContent = 'Geothermal Development Plan'
                break
            case compeManagerEmail['MIC'].trim().toLowerCase():
                switchCompetition = 'MIC'
                managerName.textContent = 'Nafidz Rayyan Hidayat'
                managerCompetition.textContent = 'Mud Innovation'
                break
            case compeManagerEmail['ORDC'].trim().toLowerCase():
                switchCompetition = 'ORDC'
                managerName.textContent = 'Muhammad Ferris Rahardian'
                managerCompetition.textContent = 'Oil Rig Design'
                break
            case compeManagerEmail['PODC'].trim().toLowerCase():
                switchCompetition = 'PODC'
                managerName.textContent = 'Jonathan Denen'
                managerCompetition.textContent = 'Plan of Development'
                isPODC = true
                document.getElementById("submission-table").style.width = '120vw'
                document.getElementById("submission-table").querySelector("tr").innerHTML = `
                    <tr>
                        <th scope="col">No.</th>
                        <th scope="col">Team Name</th>
                        <th scope="col">University</th>
                        <th scope="col">Last Submission</th>
                        <th scope="col">Overdue</th>
                        <th scope="col">Submission</th>
                        <th scope="col">L.A.S</th>
                        <th scope="col">Abstract</th>
                        <th scope="col">L.A.A.S</th>
                        <th scope="col">Add. Abstract</th>
                        <th scope="col">Final</th>
                    </tr>
                `
                document.getElementById('submission-table-final').style.width= '100vw'
                document.getElementById('submission-table-final').querySelector("tr").innerHTML = `
                    <tr>
                        <th scope="col">No.</th>
                        <th scope="col">Team Name</th>
                        <th scope="col">University</th>
                        <th scope="col">Last Submission</th>
                        <th scope="col">Overdue</th>
                        <th scope="col">Submission</th>
                        <th scope="col">Last Model</th>
                        <th scope="col">Overdue</th>
                        <th scope="col">Model</th>
                        <th scope="col">Last PPT</th>
                        <th scope="col">Overdue</th>
                        <th scope="col">PPT</th>
                    </tr>
                `
                break
            case compeManagerEmail['PPC'].trim().toLowerCase():
                switchCompetition = 'PPC'
                managerName.textContent = 'Ibra Rabbani Dahlan'
                managerCompetition.textContent = 'Paper and Poster'
                break
            case compeManagerEmail['SC'].trim().toLowerCase():
                switchCompetition = 'SC'
                managerName.textContent = 'Daniel Matthew Christian Sagala'
                managerCompetition.textContent = 'Smart Competition'
                break
            case compeManagerEmail['WDC'].trim().toLowerCase():
                switchCompetition = 'WDC'
                managerName.textContent = 'Jiro Adika Faruq'
                managerCompetition.textContent = 'Well Design'
                break
            case compeManagerEmail['HC'].trim().toLowerCase():
                switchCompetition = 'HDC'
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

onSnapshot(Teams, (snap) => {
    let teamDocs = snap.docs

    let compeSize = teamDocs.filter(doc => doc.data().competition === switchCompetition)

    delRelList.innerHTML = ''
    compeSize.forEach((team, index) => {
        let data = team.data()
        createTeamList(
            index+1,
            data.team_name,
            data.university,
            data.competition,
            data.leader,
            data.members
        )
    })
})

// Database Tab Section
function createTeamList(rowNo, teamName, univ, compe, teamLeader, teamMember) {
    let teamLeaderRow = document.createElement("tr")

    teamLeaderRow.innerHTML = `
        <td rowspan="${teamMember.length + 1}">${rowNo}</td>
        <td rowspan="${teamMember.length + 1}">${teamName}</td>
        <td rowspan="${teamMember.length + 1}">${univ}</td>
        <td rowspan="${teamMember.length + 1}">${compe}</td>
        <td rowspan="${teamMember.length + 1}">${teamMember.length + 1}</td>
        <td class="text-secondary">${teamLeader.first_name}</td>
        <td class="text-secondary">${teamLeader.last_name}</td>
        <td>${teamLeader.major}</td>
        <td>${teamLeader.gender}</td>
        <td>${teamLeader.batch}</td>
        <td>${teamLeader.person_id}</td>
        <td>${teamLeader.student_id}</td>
        <td>${teamLeader.phone}</td>
        <td>${teamLeader.email}</td>
    `;

    delRelList.appendChild(teamLeaderRow)

    teamMember.forEach((member, index) => {
        let teamMemberRow = document.createElement("tr")

        teamMemberRow.innerHTML = `
            <td>${member.first_name}</td>
            <td>${member.last_name}</td>
            <td>${member.major}</td>
            <td>${member.gender}</td>
            <td>${member.batch}</td>
            <td>${member.person_id}</td>
            <td>${member.student_id}</td>
            <td>${member.phone}</td>
            <td>${member.email}</td>
        `

        delRelList.appendChild(teamMemberRow)
    })
}

const dbTable = document.getElementById("db-table")
const excelConvertBtn = document.getElementById("excel-convert")

excelConvertBtn.addEventListener("click", () => {
    const workbook = XLSX.utils.table_to_book(dbTable, { sheet: "DB" })

    XLSX.writeFile(workbook, `${switchCompetition}_Delegates_DB.xlsx`)
})

// Submission Section
const Submission_Status = collection(DB, 'Submission_Status')

// Prelim Submission
const submissionTablePrelim = document.getElementById("del-submission-list-prelim")
const compeManagerPrivilage = document.getElementById("compe-manager-privilage")

function createSubmissionTable(table, teamId, rowNo, teamName, univ, submission, status, overdue, lastSubmit, finalStatus) {
    let submitRow = document.createElement("tr")
    submitRow.setAttribute("id", teamId)

    let URLSubmit = `
        <a href="${submission}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
            Download
        </a>
    `

    let finalPassingStatus
    switch (finalStatus) {
        case true:
            finalPassingStatus = `
                <select class="compe-manager-confirm form-select text-white bg-opacity-25 bg-success">
                    <option value="0">Pending</option>
                    <option value="-1">Failed</option>
                    <option value="1" selected>Passed</option>
                </select>
            `
            break
        case false:
            finalPassingStatus = `
                <select class="compe-manager-confirm form-select text-white bg-opacity-25 bg-danger">
                    <option value="0">Pending</option>
                    <option value="-1" selected>Failed</option>
                    <option value="1">Passed</option>
                </select>
            `
            break
        default:
            finalPassingStatus = `
                <select class="compe-manager-confirm form-select text-black bg-opacity-25 bg-light">
                    <option value="0" selected>Pending</option>
                    <option value="-1">Failed</option>
                    <option value="1">Passed</option>
                </select>
            `
            break
    }

    submitRow.innerHTML = `
        <td>${rowNo}</td>
        <td>${teamName}</td>
        <td>${univ}</td>
        <td>${status ? lastSubmit.toDate().toLocaleString() : "No Data"}</td>
        <td>${status ? overdue : "No Data"}</td>
        <td>${status ? URLSubmit : "No Data"}</td>
        <td>${finalPassingStatus}</td>
    `
    table.append(submitRow)
}

function createPODCSubmissionTable(table, teamId, rowNo, teamName, univ, submission, status, overdue, lastSubmit, finalStatus, absSub, addAbsSub, absStat, addAbsStat, lastAbs, lastAddAbs) {
    let submitRow = document.createElement("tr")
    submitRow.setAttribute("id", teamId)

    let URLSubmit = `
        <a href="${submission}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
            Download
        </a>
    `
    let URLAbsSub = `
        <a href="${absSub}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
            Download
        </a>
    `
    let URLAddAbsSub = `
        <a href="${addAbsSub}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
            Download
        </a>
    `

    let finalPassingStatus
    switch (finalStatus) {
        case true:
            finalPassingStatus = `
                <select class="compe-manager-confirm form-select text-white bg-opacity-25 bg-success">
                    <option value="0">Pending</option>
                    <option value="-1">Failed</option>
                    <option value="1" selected>Passed</option>
                </select>
            `
            break
        case false:
            finalPassingStatus = `
                <select class="compe-manager-confirm form-select text-white bg-opacity-25 bg-danger">
                    <option value="0">Pending</option>
                    <option value="-1" selected>Failed</option>
                    <option value="1">Passed</option>
                </select>
            `
            break
        default:
            finalPassingStatus = `
                <select class="compe-manager-confirm form-select text-black bg-opacity-25 bg-light">
                    <option value="0" selected>Pending</option>
                    <option value="-1">Failed</option>
                    <option value="1">Passed</option>
                </select>
            `
            break
    }

    submitRow.innerHTML = `
        <td>${rowNo}</td>
        <td>${teamName}</td>
        <td>${univ}</td>
        <td>${status ? lastSubmit.toDate().toLocaleString() : "No Data"}</td>
        <td>${status ? overdue : "No Data"}</td>
        <td>${status ? URLSubmit : "No Data"}</td>
        <td>${absStat ? lastAbs.toDate().toLocaleString() : "No Data"}</td>
        <td>${absStat ? URLAbsSub : "No Data"}</td>
        <td>${addAbsStat ? lastAddAbs.toDate().toLocaleString() : "No Data"}</td>
        <td>${addAbsStat ? URLAddAbsSub : "No Data"}</td>
        <td>${finalPassingStatus}</td>
    `
    table.append(submitRow)
}

compeManagerPrivilage.addEventListener("submit", (e) => {
    e.preventDefault()

    submissionTablePrelim.querySelectorAll("tr").forEach(row => {
        let selectedValue = row.querySelector("select")
        const docRef = doc(DB, 'Submission_Status', row.getAttribute("id"))
        
        switch (selectedValue.value) {
            case "1":
                updateDoc(docRef, { final: true })
                break
            case "-1":
                updateDoc(docRef, { final: false })
                break
            default:
                updateDoc(docRef, { final: deleteField() })
                break
        }
    })
    setToastAlert('success', 'Saving success!')
})

// Final Submission
const submissionTableFinal = document.getElementById("del-submission-list-final")

function createFinalSubmissionTable(table, teamId, rowNo, teamName, univ, submission, status, overdue, lastSubmit) {
    let submitRow = document.createElement("tr")
    submitRow.setAttribute("id", teamId)

    let URLSubmit = `
        <a href="${submission}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
            Download
        </a>
    `
    submitRow.innerHTML = `
        <td>${rowNo}</td>
        <td>${teamName}</td>
        <td>${univ}</td>
        <td>${status ? lastSubmit.toDate().toLocaleString() : "No Data"}</td>
        <td>${status ? overdue : "No Data"}</td>
        <td>${status ? URLSubmit : "No Data"}</td>
    `
    table.append(submitRow)
}

function createFinalPODCSubmissionTable(table, teamId, rowNo, teamName, univ, submission, status, overdue, overdueModel, overdueppt, lastSubmit, absSub, addAbsSub, absStat, addAbsStat, lastAbs, lastAddAbs) {
    let submitRow = document.createElement("tr")
    submitRow.setAttribute("id", teamId)

    let URLSubmit = `
        <a href="${submission}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
            Download
        </a>
    `
    let URLAbsSub = `
        <a href="${absSub}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
            Download
        </a>
    `
    let URLAddAbsSub = `
        <a href="${addAbsSub}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
            Download
        </a>
    `

    submitRow.innerHTML = `
        <td>${rowNo}</td>
        <td>${teamName}</td>
        <td>${univ}</td>
        <td>${status ? lastSubmit.toDate().toLocaleString() : "No Data"}</td>
        <td>${status ? overdue : "No Data"}</td>
        <td>${status ? URLSubmit : "No Data"}</td>
        <td>${absStat ? lastAbs.toDate().toLocaleString() : "No Data"}</td>
        <td>${absStat ? overdueModel : "No Data"}</td>
        <td>${absStat ? URLAbsSub : "No Data"}</td>
        <td>${addAbsStat ? lastAddAbs.toDate().toLocaleString() : "No Data"}</td>
        <td>${addAbsStat ? overdueppt : "No Data"}</td>
        <td>${addAbsStat ? URLAddAbsSub : "No Data"}</td>
    `
    table.append(submitRow)
}

onSnapshot(Submission_Status, (snap) => {
    let submissionDocs = snap.docs
    let currentCompe = submissionDocs.filter(doc => doc.data().competition === switchCompetition)
    let currentCompeFinal = currentCompe.filter(doc => doc.data().final === true)
    
    submissionTablePrelim.innerHTML = ''
    submissionTableFinal.innerHTML = ''

    if (isPODC) {
        currentCompe.forEach((compe, index) => {
            let data = compe.data()
            createPODCSubmissionTable(
                submissionTablePrelim,
                compe.id,
                index+1,
                data.team_name,
                data.university,
                data.sub_preliminary.fileURL,
                data.sub_preliminary.status,
                data.sub_preliminary.overdue,
                data.sub_preliminary.submittedAt,
                data.final,
                data.sub_abstract.fileURL,
                data.sub_add_abstract.fileURL,
                data.sub_abstract.status,
                data.sub_add_abstract.status,
                data.sub_abstract.submittedAt,
                data.sub_add_abstract.submittedAt
            )
        })
        currentCompeFinal.forEach((compe, index) => {
            let data = compe.data()
            createFinalPODCSubmissionTable(
                submissionTableFinal,
                compe.id,
                index+1,
                data.team_name,
                data.university,
                data.sub_final?.fileURL,
                data.sub_final?.status,
                data.sub_final?.overdue,
                data.sub_final_model?.overdue,
                data.sub_final_ppt?.overdue,
                data.sub_final?.submittedAt,
                data.sub_final_model?.fileURL,
                data.sub_final_ppt?.fileURL,
                data.sub_final_model?.status,
                data.sub_final_ppt?.status,
                data.sub_final_model?.submittedAt,
                data.sub_final_ppt?.submittedAt
            )
        })
    } else {
        currentCompe.forEach((compe, index) => {
            let data = compe.data()
            createSubmissionTable(
                submissionTablePrelim,
                compe.id,
                index+1, 
                data.team_name,
                data.university,
                data.sub_preliminary.fileURL,
                data.sub_preliminary.status,
                data.sub_preliminary.overdue,
                data.sub_preliminary.submittedAt,
                data.final
            )
        })
        currentCompeFinal.forEach((compe, index) => {
            let data = compe.data()
            createFinalSubmissionTable(
                submissionTableFinal,
                compe.id,
                index+1, 
                data.team_name,
                data.university,
                data.sub_final?.fileURL || false,
                data.sub_final?.status || false,
                data.sub_final?.overdue || false,
                data.sub_final?.submittedAt || false
            )
        })
    }

    

    const compeConfirm = document.querySelectorAll(".compe-manager-confirm")
    compeConfirm.forEach(c => c.addEventListener('change', () => {
        console.log("CONFIRM CHANGE")

        switch (c.value) {
            case "1":
                c.classList.remove("bg-danger")
                c.classList.remove("bg-light", "text-black")
                c.classList.add("bg-success", "text-white")
                break
            case "-1":
                c.classList.add("bg-danger", "text-white")
                c.classList.remove("bg-light", "text-black")
                c.classList.remove("bg-success")
                break
            default:
                c.classList.remove("bg-danger", "text-white")
                c.classList.add("bg-light", "text-black")
                c.classList.remove("bg-success", "text-white")
                break
        }
    }))
})

// Case Distribution Section
const caseStorageCollection = {
    "BCC": "TKNSFPMRQ6GGLdVurLCv",
    "GDPC": "u5XFl4812coW1J6yMqrm",
    "MIC": "pHlZbe6UyXpKpO35LInb",
    "ORDC": "yRP8ZxRSXbIlJx0vcoO3",
    "PODC": "G9gLvFCkxiviK2UDc5qX",
    "PPC": "BzdUKfPbIbyRYlLJmk1c",
    "WDC": "YgdwqPY6IIhqSDY45UMH",
    "Hackathon": "6gRhBNQ5yjBMg1tbK66d"
}

const caseStorage = ref(STORAGE, 'Case')

const prelimCaseDist = document.getElementById("prelim-case-distribution")
const caseInput = prelimCaseDist.querySelector("input")
const deletePrelimCaseFile = document.getElementById("delete-file-case-prelim")

deletePrelimCaseFile.addEventListener("click", () => { caseInput.value = '' })

prelimCaseDist.addEventListener("submit", (e) => {
    e.preventDefault()

    prelimCaseDist.querySelectorAll("button")[1].textContent = 'Processing...'
    prelimCaseDist.querySelectorAll("button")[1].disabled = true

    try{
        const file = caseInput.files[0]
        const folderRef = ref(caseStorage, switchCompetition)
        const fileRef = ref(folderRef, `${file.name}`)

        uploadBytes(fileRef, file).then((snap) => {
            return getDownloadURL(snap.ref)
        })
        .then((downloadURL) => {
            return updateDoc(doc(DB, 'Information', caseStorageCollection[switchCompetition]), {
                prelim_case_link: downloadURL,
                sent_on: serverTimestamp()
            })
        })
        .then(() => {
            alert("Success sending the file")
            prelimCaseDist.querySelectorAll("button")[1].textContent = 'Send'
            prelimCaseDist.querySelectorAll("button")[1].disabled = false
        })
        .catch((err) => {
            console.log("There is error during sending case file", err.message)
            alert("[ERROR-1N] Cannot sending case file!")
            prelimCaseDist.querySelectorAll("button")[1].textContent = 'Send'
            prelimCaseDist.querySelectorAll("button")[1].disabled = false
        })
    } catch (err) {
        console.log("Error during uploading case file", err.message)
        alert("[ERROR-0UT] Cannot sending case file!")
        prelimCaseDist.querySelectorAll("button")[1].textContent = 'Send'
        prelimCaseDist.querySelectorAll("button")[1].disabled = false
    }
})

const finalCaseDist = document.getElementById("final-case-distribution")
const finalCaseInput = finalCaseDist.querySelector("input")
const deleteFinalCaseFile = document.getElementById("delete-file-case-final")

deleteFinalCaseFile.addEventListener("click", () => { finalCaseInput.value = '' })

finalCaseDist.addEventListener("submit", (e) => {
    e.preventDefault()

    finalCaseDist.querySelectorAll("button")[1].textContent = 'Processing...'
    finalCaseDist.querySelectorAll("button")[1].disabled = true

    try{
        const file = finalCaseInput.files[0]
        const folderRef = ref(caseStorage, switchCompetition)
        const fileRef = ref(folderRef, `${file.name}`)

        uploadBytes(fileRef, file).then((snap) => {
            return getDownloadURL(snap.ref)
        })
        .then((downloadURL) => {
            return updateDoc(doc(DB, 'Information', caseStorageCollection[switchCompetition]), {
                final_case_link: downloadURL,
                sent_on: serverTimestamp()
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