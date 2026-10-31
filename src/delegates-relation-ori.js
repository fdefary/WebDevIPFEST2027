// UI Logic
const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

import { onAuthStateChanged, signOut } from 'firebase/auth'

import {
    onSnapshot,
    collection,
    doc, getDoc
} from 'firebase/firestore'

import { DB, AUTH } from './index.js'

// check auth
onAuthStateChanged(AUTH, (user) => {
    if (user) {
        if (user.email !== "officialdelegates.ipfest2026@gmail.com") {
            window.location.href = "../login.html"
        }
    } else {
        window.location.href = "../login.html"
    }
})

// NOTE: This codes below is made for development only!
// Development Start

// let lineChart
// let totalRegistrantPerDay = []
// document.getElementById("total-teams-registered").innerText = 160

// updateChart(totalRegistrantPerDay)

// Development End 


const Teams = collection(DB, 'Team')
// const Submission_Status = collection(DB, 'Submission_Status')

// Dashboard Tab Section
const totalDelPerCompe = document.querySelectorAll(".total-del")
const Competition = ["business case","plan of development", "smart competition", "mud inovation", "paper and poster", "oil rig design", "geothermal development plan", "well design", "hackaton"]
// Database Tab Section
const delRelList = document.getElementById("delrel-team-list")
// Final Pay Sect
const finalPayTable = document.getElementById("treasury-history-list")

onSnapshot(Teams, (snap) => {
    let teamDocs = snap.docs

    totalDelPerCompe.forEach((compe, index) => {
        let compeSize = teamDocs.filter(doc => doc.data().competition === Competition[index])
        compe.innerText = `${compeSize.length}`
    })

    delRelList.innerHTML = ''
    teamDocs.forEach((team, index) => {
        let data = team.data()
        createTeamList(
            index+1,
            data.team_name,
            data.university,
            data.competition,
            data.leader,
            data.leaderIMG,
            data.members,
            data.memberIMG
        )
    })
})

onSnapshot(Submission_Status, (snap) => {
    finalPayTable.innerHTML = ''
    let finalTeam = snap.docs.filter(d => d.data().final === true)

    finalTeam.forEach((t, i) => {
        getDoc(doc(DB, 'Team', t.id))
        .then((snap) => {
            let data = snap.data()
            let memberPayment = [data.leaderFinalPayData.final_pay_status]

            for (let i = 0; i < data.members.length; i++) {
                memberPayment.push(data[`member${i+1}FinalPayData`].final_pay_status)
            }
            
            createFinalDelegatesRow(
                t.id,
                i+1,
                data.team_name,
                data.university,
                data.competition,
                data.final_pay_confirmed,
                data.final_pay_status,
                memberPayment
            )
        })
    })
})

// Dashboard Tab Section
setInterval(() => {
    getDocs(Teams).then((snap) => {
        if (totalRegistrantPerDay.length === 0){
            totalRegistrantPerDay.push(parseInt(snap.size, 10))
        } else {
            let totalPerDay = parseInt(snap.size, 10) - totalRegistrantPerDay[totalRegistrantPerDay.length - 1]
            totalRegistrantPerDay.push(totalPerDay)
        }
    })
    updateChart(totalRegistrantPerDay, cumulativeRegisterPerDay)
}, 8.64e7)

function updateChart(registrantData) {
    const labels = Array.from({ length: 30 }, (_, i) => i+1)
    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Total Registrant per Day',
                data: registrantData,
                borderColor: '#bc2300',
                backgroundColor: 'rgba(188, 35, 0, 0.2)',
                fill: true
            }
        ]
    }

    if (lineChart) {
        lineChart.data.datasets[0].data = registrantData
        lineChart.update()
    } else {
        const config = {
            type: 'line',
            data: data,
            options: {
                scales: {
                    x: {
                            title: {
                                display: true,
                                text: 'Date in November'
                            },
                            ticks: {
                                callback: function(value, index) {
                                    return (index+1) % 3 === 0 ? this.getLabelForValue(value) : ''
                                }
                            }
                    },
                    y: {
                            title: {
                                display: true,
                                text: 'Registran'
                            },
                            beginAtZero: true
                    }
                }
            }
        }
    
        lineChart = new Chart(
            document.getElementById('registration-chart').getContext('2d'),
            config
        )
    }
}


// Database Tab Section
function createTeamList(rowNo, teamName, univ, compe, teamLeader, leader_id, teamMember, membersImgs) {
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
        <td><a href="${leader_id}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
            Download
        </a></td>
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
            <td><a href="${membersImgs[index]}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
                Download
            </a></td>
        `

        delRelList.appendChild(teamMemberRow)
    })
}

const dbTable = document.getElementById("db-table")
const excelConvertBtn = document.getElementById("excel-convert")

excelConvertBtn.addEventListener("click", () => {
    const workbook = XLSX.utils.table_to_book(dbTable, { sheet: "DB" })

    XLSX.writeFile(workbook, "Delegates_DB.xlsx")
})

// Generate Table for final payment
function createFinalDelegatesRow(teamId, rowNo, teamName, univ, compe, status, dpPayFinal, teamPayment) {

    const payStat = (s, dpfinal, payment) => {
        if (!s && !dpfinal) {
            return '<p class="text-danger">No Data</p>'
        } else {
            if (payment.includes(false)) {
                return '<p class="text-warning">Belum Lunas</p>'
            } else {
                return '<p class="text-success">Lunas</p>'
            }
        }
    }

    let rowContainer = document.createElement("tr")
    rowContainer.id = teamId
    rowContainer.innerHTML = `
        <td>${rowNo}</td>
        <td>${teamName}</td>
        <td>${univ}</td>
        <td>${compe}</td>
        <td>${payStat(status, dpPayFinal, teamPayment)}</td>
    `
    finalPayTable.append(rowContainer)
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

