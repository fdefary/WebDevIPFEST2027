import { onAuthStateChanged, signOut } from 'firebase/auth'

import { 
    collection, doc, getDoc,
    getDocs, onSnapshot, query, updateDoc,
    writeBatch
} from 'firebase/firestore'

import { DB, AUTH } from './index.js'

// check auth
onAuthStateChanged(AUTH, (user) => {
    if (user) {
        if (user.email !== "treasury.ipfest2026@email.com") {
            window.location.href = "../login.html"
        }
    } else {
        window.location.href = '../login.html'
    }
})

const Teams = collection(DB, 'Team')
const SubmissionStatus = collection(DB, 'Submission_Status')
const paymentSummary = doc(DB, "Payment_Summary", "Tglyz4OAXNWN67MvH56d")

// let winnerTeam = []
// getDocs(SubmissionStatus).then((snap) => {
// 	winnerTeam = snap.docs.filter(d => d.data().final === true).map(d => d.id)

// 	return getDocs(Teams)
// }).then((snap) => {
// 	let allDocs = snap.docs.filter(el => winnerTeam.includes(el.id))

// 	allDocs.forEach(d => {
// 		let data = d.data()

// 		let individualMemberData = {}
// 		let individualMemberImg = []
// 		for(let i = 0; i < data.members.length; i++) {
// 			individualMemberData[`member${i+1}FinalPayData`] = {
// 				have_pay: data.have_pay,
// 				confirmed: data.final_pay_confirmed,
// 				hospitality: data.hospitality,
// 				pay_scheme: data.final_pay_scheme,
// 				pay_method: data.final_pay_method,
// 				pay_dp_category: data.final_pay_category,
// 				final_pay_status: data.final_pay_status
// 			}
// 			individualMemberImg.push({ first_pay: data.final_pay_link, last_pay: '' })
// 		}

// 		updateDoc(doc(DB, 'Team', d.id), {
// 			leaderFinalPayIMG: {
// 				first_pay: data.final_pay_link,
// 				last_pay: ''
// 			},
// 			leaderFinalPayData: {
// 				have_pay: data.have_pay,
// 				confirmed: data.final_pay_confirmed,
// 				hospitality: data.hospitality,
// 				pay_scheme: data.final_pay_scheme,
// 				pay_method: data.final_pay_method,
// 				pay_dp_category: data.final_pay_category,
// 				final_pay_status: data.final_pay_status
// 			},
// 			membersFinalPayIMG: individualMemberImg,
// 			...individualMemberData
// 		})
// 	})
// })

// History Tab Section
const historyTable = document.getElementById("treasury-history-list")

// Dashboard Tab Section
const totalRegistrationFee = document.getElementById("total-reg-fee")
const totalFinalisFee = document.getElementById("total-fin-fee")
const totalIncome = document.getElementById("total-income")
const verifiedTeams = document.getElementById("verified-teams")
const unverifiedTeams = document.getElementById("unverified-teams")
const totalRegistran = document.getElementById("total-reg")

// NOTE: This codes below is made for development only!
// Development Start

let lineChart
let totalRegistrantPerDay = []
let totalRegistered = totalRegistrantPerDay.reduce((acc, cv) => acc + cv, 0)
document.getElementById("total-teams-registered").textContent = totalRegistered

// updateChart(totalRegistrantPerDay)

// async function loadDataDev() {
// 	const paymentDevData = await getDoc(paymentSummary)

// 	if (paymentDevData.exists()) {
// 		if (paymentDevData.data()) {
// 			console.log(paymentDevData.data())
// 			totalFinalisFee.textContent = paymentDevData.data().income_from_finalist
// 			totalRegistrationFee.textContent = paymentDevData.data().income_from_registrant
// 			totalIncome.textContent = paymentDevData.data().total_income
// 		}
// 	} else {
// 		console.log("Something went error in dev")
// 	}
// 	const teamDevData = await getDocs(Teams)
// 	totalRegistran.textContent = teamDevData.size

// 	const unvTeamDevData = teamDevData.docs.filter(doc => doc.data().confirmed === false)
// 	unverifiedTeams.textContent = unvTeamDevData.length
// 	verifiedTeams.textContent = (parseInt(teamDevData.size, 10) - parseInt(unvTeamDevData.length, 10))

// 	console.log("DEV TEST COMPLETED")
// }

// loadDataDev()

// Development End

// Realtime Update
// onSnapshot(paymentSummary, (doc) => {
// 	let paymentData = doc.data()

// 	if (paymentData) {
// 		totalFinalisFee.textContent = paymentData.income_from_finalist
// 		totalRegistrationFee.textContent = paymentData.income_from_registrant
// 		totalIncome.textContent = paymentData.total_income

// 		console.log("Payment UPDATED")
// 	} else {
// 		console.log("There is no such data in payment summary")
// 	}
// })
// Calculate Income
function calcFinalIncome(teamsData) {
    let finalIncome = 0
    let hospitalityCost = {
        'Full Hospitality': 650,
        'Excluding Accommodation': 450
    }

    teamsData.docs.forEach(d => {
        let ldata = d.data().leaderFinalPayData
        
        if (ldata.pay_scheme === 'DP') {
            if ((ldata.pay_dp_category === 'First' && ldata.confirmed) || (ldata.pay_dp_category === 'Last' && !ldata.confirmed)) {
                finalIncome+=250
            } else if (ldata.pay_dp_category === 'Last' && ldata.confirmed) {
                finalIncome+=hospitalityCost[ldata.hospitality]
                // console.log({a: ldata.hospitality, id: d.id}, ldata.hospitality === 'Full Hospitality')
            }
        } else if (ldata.pay_scheme === 'Full') {
            finalIncome+=hospitalityCost[ldata.hospitality]
            // console.log({a: ldata.hospitality, id: d.id}, ldata.hospitality === 'Excluding Accommodation')
        }

        // Member
        for (let i = 0; i < d.data().members.length; i++) {
            let mdata = d.data()[`member${i+1}FinalPayData`]

            if (mdata.pay_scheme === 'DP') {
                if ((mdata.pay_dp_category === 'First' && mdata.confirmed) || (mdata.pay_dp_category === 'Last' && !mdata.confirmed)) {
                    finalIncome+=250
                } else if (mdata.pay_dp_category === 'Last' && mdata.confirmed) {
                    finalIncome+=hospitalityCost[mdata.hospitality]
                    // console.log({a: mdata.hospitality, id: d.id}, mdata.hospitality === 'Excluding Accommodation')
                }
            } else if (mdata.pay_scheme === 'Full') {
                finalIncome+=hospitalityCost[mdata.hospitality]
                // console.log({a: mdata.hospitality, id: d.id}, mdata.hospitality === 'Excluding Accommodation')
            }
        }
    })

    return finalIncome
}

onSnapshot(Teams, (snap) => {
    totalRegistran.textContent = snap.size
    let vSize = snap.docs.filter(doc => doc.data().confirmed === true)
    let unvSize = snap.size - vSize.length

    unverifiedTeams.textContent = unvSize
    verifiedTeams.textContent = vSize.length

    let earlySize = vSize.filter(v => v.data().early_bird === true)
    let regularSize = vSize.length - earlySize.length

    let totalRegFee = 200*earlySize.length + 250*regularSize
    let totalFinFee = calcFinalIncome(snap)

    totalRegistrationFee.textContent = `${totalRegFee}K`
    totalFinalisFee.textContent = `${totalFinFee}K`
    totalIncome.textContent = `${totalRegFee + totalFinFee}K`

    historyTable.innerHTML = ''
    snap.docs.forEach((d, index) => {
        let histData = d.data()
        createHistoryRows(
            index + 1,
            histData.team_name,
            histData.university,
            histData.competition,
            histData.join_on
        )
    })
    
    console.log("Teams UPDATED")
    console.log('Initializing Done - 1')
})

// Handling Registration Chart
setInterval(() => {
    getDocs(Teams).then((snap) => {
        if (totalRegistrantPerDay.length === 0){
            totalRegistrantPerDay.push(parseInt(snap.size, 10))
        } else {
            let totalPerDay = parseInt(snap.size, 10) - totalRegistrantPerDay[totalRegistrantPerDay.length - 1]
            totalRegistrantPerDay.push(totalPerDay)
        }
    })
    updateChart(totalRegistrantPerDay)
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


// Verification Tab Section
const tableContainer = document.getElementById("treasury-team-list")
const treasuryPrivilage = document.getElementById("treasury-privilage")

// Final Payment Status
const tableFinalContainer = document.getElementById("treasury-final-team-list")
const treasuryFinalPrivilage = document.getElementById("treasury-privilage-final")
const finalConfirmBtn = treasuryFinalPrivilage.querySelector("button")

function createDelegatesRow(container, teamId, rowNo, teamName, univ, compe, method, early, link, status) {
    let payStatus = `
        <option value="0" ${status ? '' : 'selected'}>Unconfirmed</option>
        <option value="1" ${status ? 'selected' : ''}>Confirmed</option>
    `

    let rowContainer = document.createElement("tr")
    rowContainer.id = teamId
    rowContainer.innerHTML = `
        <td>${rowNo}</td>
        <td>${teamName}</td>
        <td>${univ}</td>
        <td>${compe}</td>
        <td>${method}</td>
        <td>${early ? '<strong class="text-success">True</strong>' : '<strong class="text-danger">False</strong>'}</td>
        <td><a href="${link}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
            Download
        </a></td>
        <td>
            <select class="treasury-confirm form-select text-white bg-opacity-25 ${status ? 'bg-success' : 'bg-danger'}">
                ${payStatus}
            </select>
        </td>
    `

    container.append(rowContainer)
}

function changeFinalRowColor(status, dpStatus) {
    if (!status && !dpStatus) {
        return'bg-danger'
    } else if (status && dpStatus) {
        return 'bg-success'
    } else if (status && !dpStatus) {
        return 'bg-info'
    }
}

function createFinalDelegatesRow(teamID, rowNo, teamName, univ, compe, leader, l_data, l_link, m_data, m_link, ...m_pay_data) {
    let payStatus = (havePay, confirmed, dpPayFinal) => {
        return `
            <option value="-1" ${(confirmed && havePay) ? '' : 'selected'}>Unconfirmed</option>
            <option value="0" ${(confirmed && havePay && !dpPayFinal) ? 'selected' : ''}>Belum Lunas</option>
            <option value="1" ${(confirmed && dpPayFinal && havePay) ? 'selected' : ''}>Lunas</option>
        `
    } 	

    // Change availability of payment link
    function changePaymentLink(link, ...status) {
        let proofLink
        let pstatus = !status.includes(false)

        if (pstatus) {
            proofLink = `
                <a href="${link}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
                    Download
                </a>
            `
        } else {
            proofLink = `
                <a href="" class="link-muted link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
                    No Data
                </a>
            `
        }
        return proofLink
    }

    // Create table UI
    const lastDP = (cat) => cat === 'Last'
    let teamLeaderRow = document.createElement("tr")
    teamLeaderRow.id = teamID

    teamLeaderRow.innerHTML = `
        <td rowspan="${m_data.length + 1}">${rowNo}</td>
        <td rowspan="${m_data.length + 1}">${teamName}</td>
        <td rowspan="${m_data.length + 1}">${univ}</td>
        <td rowspan="${m_data.length + 1}">${compe}</td>
        <td>${leader.first_name} ${leader.last_name}</td>
        <td>${l_data.pay_method === '' ? 'No Data' : l_data.pay_method}</td>
        <td>${l_data.pay_scheme === '' ? 'No Data' : l_data.pay_scheme}</td>
        <td>${l_link == undefined ? 'No Data' : changePaymentLink(l_link.first_pay, l_data.have_pay)}</td>
        <td>${l_link == undefined ? 'No Data' : changePaymentLink(l_link.last_pay, l_data.have_pay, lastDP(l_data.pay_dp_category))}</td>
        <td>${l_data.pay_dp_category === '' ? 'No Data' : l_data.pay_dp_category}</td>
        <td>${l_data.hospitality === '' ? 'No Data' : l_data.hospitality}</td>
        <td>
            <select class="treasury-final-confirm form-select text-white bg-opacity-25 ${changeFinalRowColor(l_data.confirmed, l_data.final_pay_status)}">
                ${payStatus(l_data.have_pay, l_data.confirmed, l_data.final_pay_status)}
            </select>
        </td>
    `
    tableFinalContainer.append(teamLeaderRow)

    for (let i = 0; i < m_data.length; i++) {
        let memberTeamRow = document.createElement("tr")
        memberTeamRow.id = teamID

        memberTeamRow.innerHTML = `
            <td>${m_data[i].first_name} ${m_data[i].last_name}</td>
            <td>${m_pay_data[i].pay_method === '' ? 'No Data' : m_pay_data[i].pay_method}</td>
            <td>${m_pay_data[i].pay_scheme === '' ? 'No Data' : m_pay_data[i].pay_scheme}</td>
            <td>${m_link[i] === '' ? 'No Data' : changePaymentLink(m_link[i].first_pay, m_pay_data[i].have_pay)}</td>
            <td>${m_link[i] === '' ? 'No Data' : changePaymentLink(m_link[i].last_pay, m_pay_data[i].have_pay, lastDP(m_pay_data[i].pay_dp_category))}</td>
            <td>${m_pay_data[i].pay_dp_category === '' ? 'No Data' : m_pay_data[i].pay_dp_category}</td>
            <td>${m_pay_data[i].hospitality === '' ? 'No Data' : m_pay_data[i].hospitality}</td>
            <td>
                <select class="treasury-final-confirm form-select text-white bg-opacity-25 ${changeFinalRowColor(m_pay_data[i].confirmed, m_pay_data[i].final_pay_status)}">
                    ${payStatus(m_pay_data[i].have_pay, m_pay_data[i].confirmed, m_pay_data[i].final_pay_status)}
                </select>
            </td>
        `
        tableFinalContainer.append(memberTeamRow)
    }
}

onSnapshot(Teams, (snap) => {
    tableContainer.innerHTML = ''

    snap.docs.forEach((d, index) => {
        let data = d.data()
        createDelegatesRow(
            tableContainer,
            d.id,
            index + 1,
            data.team_name,
            data.university,
            data.competition,
            data.method,
            data.early_bird,
            data.p_url,
            data.confirmed,
        )
    })

    // Treasury Confirmation Logic
    const treasuryConfirm = document.querySelectorAll(".treasury-confirm")
    treasuryConfirm.forEach(row => row.addEventListener('change', () => {
        console.log("CONFIRM CHANGE")
        
        if (row.value == '0'){
            row.classList.remove("bg-success")
            row.classList.add("bg-danger")
        } else {
            row.classList.remove("bg-danger")
            row.classList.add('bg-success')
        }
    }))

    console.log('Initializing Done - 2')
})

onSnapshot(SubmissionStatus, (snap) => {
    tableFinalContainer.innerHTML = ''

    let finalTeam = snap.docs.filter(d => d.data().final === true)

    let promises = finalTeam.map((team, index) => {
        return getDoc(doc(DB, 'Team', `${team.id}`)).then(snap => {
            let data = snap.data()
            let individualMemberData = []
            for (let i = 0; i < data.members.length; i++) {
                individualMemberData[i] = data[`member${i+1}FinalPayData`]
            }

            if (data.members == undefined) {
                console.log(data.leader)
            } else {
                createFinalDelegatesRow(
                    team.id,
                    index + 1,
                    data.team_name,
                    data.university,
                    data.competition,
                    data.leader,
                    data.leaderFinalPayData,
                    data.leaderFinalPayIMG,
                    data.members,
                    data.membersFinalPayIMG,
                    ...individualMemberData
                )
            }
        })
    })

    Promise.all(promises).then(() => {
        const treasuryFinalConfirm = document.querySelectorAll(".treasury-final-confirm")

        treasuryFinalConfirm.forEach(row => row.addEventListener('change', () => {
            console.log("CONFIRM CHANGE")

            if (row.value == '-1') {
                    row.classList.remove("bg-success", "bg-info")
                    row.classList.add("bg-danger")
            } else if (row.value == '0') {
                    row.classList.remove("bg-danger", "bg-success")
                    row.classList.add('bg-info')
            } else if (row.value == '1') {
                    row.classList.remove("bg-danger", "bg-info")
                    row.classList.add('bg-success')
            }
        }))
    }).catch(err => {
        console.error(err)
        alert('Error happen when fetching user data!')
    })

    console.log('Initializing Done - 3')
})

treasuryPrivilage.addEventListener('submit', (e) => {
    e.preventDefault()

    tableContainer.querySelectorAll("tr").forEach(row => {
        let selectedValue = row.querySelector("select")
        const docRef = doc(DB, 'Team', row.getAttribute("id"))
        updateDoc(
            docRef,
            {
                confirmed: (selectedValue.value == '-1') ? false : true,
            }
        )
    })
    alert("Saving Success!")
    console.log("SAVE SUCCESS")
})

treasuryFinalPrivilage.addEventListener('submit', async (e) => {
    e.preventDefault()

    if (finalConfirmBtn.disabled) return

    finalConfirmBtn.disabled = true
    finalConfirmBtn.innerText = 'Processing...'

    let bePatient = setTimeout(() => {
        finalConfirmBtn.innerText = 'This may take a few minutes...'
    }, 5000)

    try {
        const batch = writeBatch(DB)
        const rows = tableFinalContainer.querySelectorAll("tr")

        for (const row of rows) {
            const selectedValue = row.querySelector('select').value
            const docRef = doc(DB, 'Team', row.getAttribute("id"))
            const snap = await getDoc(docRef)
            const data = snap.data()

            let individualMemberData = {}

            if (!data || !data.members) {
                console.error(`Members data not found for ID: ${row.getAttribute("id")}`)
                alert('An error has occurred, please contact me')
                break
            }

            const membersLength = data.members.length
            for (let i = 0; i < membersLength; i++) {
                individualMemberData[`member${i + 1}FinalPayData`] = {
                    confirmed: selectedValue !== '-1',
                    final_pay_status: selectedValue === '1',
                    hospitality: data[`member${i + 1}FinalPayData`].hospitality,
                    pay_scheme: data[`member${i + 1}FinalPayData`].pay_scheme,
                    pay_method: data[`member${i + 1}FinalPayData`].pay_method,
                    pay_dp_category: data[`member${i + 1}FinalPayData`].pay_dp_category,
                    have_pay: data[`member${i + 1}FinalPayData`].have_pay
                }
            }
            
            batch.update(docRef, {
                final_pay_confirmed: true,
                leaderFinalPayData: {
                    confirmed: selectedValue !== '-1',
                    final_pay_status: selectedValue === '1',
                    hospitality: data.leaderFinalPayData.hospitality,
                    pay_scheme: data.leaderFinalPayData.pay_scheme,
                    pay_method: data.leaderFinalPayData.pay_method,
                    pay_dp_category: data.leaderFinalPayData.pay_dp_category,
                    have_pay: data.leaderFinalPayData.have_pay
                },
                ...individualMemberData,
            })
        }
        await batch.commit()
        alert("Saving Success!")
    } catch (err) {
        console.error("Error during saving:", err)
        alert("Saving Failed! Please contact me")
    } finally {
        clearTimeout(bePatient)
        finalConfirmBtn.disabled = false
        finalConfirmBtn.innerText = 'Save'
    }
 })
 

// History Tab Section : Table Function
function createHistoryRows(rowNo, teamName, univ, compe, join) {
    let rowContainer = document.createElement("tr")

    rowContainer.innerHTML = `
        <td>${rowNo}</td>
        <td>${teamName}</td>
        <td>${univ}</td>
        <td>${compe}</td>
        <td>${join.toDate().toLocaleString()}</td>
    `

    historyTable.append(rowContainer)
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