import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

import { onAuthStateChanged, signOut } from 'firebase/auth'

// import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage'

import { DB, AUTH, STORAGE } from './index.js'

import { showProgressUI, setToastAlert } from '../static/js/alert.js'

// Check User ID
let currentUserID
onAuthStateChanged(AUTH, (user) => {
    if (user) {
        currentUserID = user.uid
        fetchUserData()
    } else {
        console.log("No user is signed in")
        currentUserID = null
        window.location.href = '../login.html'
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

// Handle User Data
const delCompetition = document.querySelectorAll(".del-team-competition")
const delegateUniv = document.querySelector("#del-univ")
const delegateTeamName = document.querySelector("#del-team-name")
const delegatePaymentStatus = document.querySelector("#del-payment-status")
const delTeamMembers = document.querySelector("#del-team-members")
const compeGuideBook = document.getElementById("competition-guide-book")

// User Submission Reference
const preliminaryStorage = ref(STORAGE, 'Preliminary')
const finalStorage = ref(STORAGE, 'Final')

const delMembersNameLogo = {
    0: `<svg style="height: 4rem" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <path d="M256 112c30.88 0 56-25.12 56-56S286.9 0 256 0S199.1 25.12 199.1 56S225.1 112 256 112zM511.1 197.4c0-5.178-2.509-10.2-7.096-13.26L476.4 168.2c-2.5-1.75-5.497-2.62-8.497-2.62c-5.501 .125-10.63 2.87-13.75 7.245c-9.001 12-23.16 19.13-38.16 19.13c-3.125 0-6.089-.2528-9.089-.8778c-23.13-4.25-38.88-26.25-38.88-49.75C367.1 134 361.1 128 354.6 128h-38.75c-6.001 0-11.63 4-12.88 9.875C298.2 160.1 278.7 176 255.1 176c-22.75 0-42.25-15.88-47-38.12C207.7 132 202.2 128 196.1 128h-38.75C149.1 128 143.1 134 143.1 141.4c0 18.49-13.66 50.62-47.95 50.62c-15.13 0-29.3-7.118-38.3-19.24C54.6 168.4 49.66 165.7 44.15 165.6c-3 0-5.931 .8951-8.432 2.645l-28.63 16C2.509 187.2 0 192.3 0 197.4c0 2.438 .5583 4.901 1.72 7.185L109.9 432h53.13L69.85 236.4C78.35 238.8 87.11 240 95.98 240c2.432 0 56.83 1.503 84.76-52.5C198.1 210.5 226.6 224 255.9 224c29.38 0 57.01-13.38 75.26-36.25C336.1 197.6 360.6 240 416 240c8.751 0 17.5-1.125 26-3.5L349 432h53.13l108.1-227.4C511.4 202.3 511.1 199.8 511.1 197.4zM424 464H87.98c-13.26 0-24 10.75-24 23.1S74.72 512 87.98 512h336c13.26 0 24-10.75 24-23.1S437.3 464 424 464z"/>
        </svg>`,
    1: `<svg style="height: 4rem;" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
            <path d="M360 464H23.1C10.75 464 0 474.7 0 487.1S10.75 512 23.1 512H360C373.3 512 384 501.3 384 488S373.3 464 360 464zM345.1 32h-308C17 32 0 49 0 70v139.4C0 218.8 4 227.5 11 233.6L48 265.8c0 8.885 .0504 17.64 .0504 26.46c0 39.32-1.001 79.96-11.93 139.8h49C94.95 374.3 96.11 333.3 96.11 285.5C96.11 270.7 96 255.1 96 238.2L48 196.5V80h64V128H160V80h64V128h48V80h64v116.5L288 238.2c0 16.77-.1124 32.25-.1124 47.1c0 47.79 1.164 89.15 10.99 146.7h49c-10.92-59.83-11.93-100.6-11.93-139.9C335.9 283.3 336 274.6 336 265.8l37-32.13C380 227.5 384 218.8 384 209.4V70C384 49 367 32 345.1 32zM192 224C174.4 224 160 238.4 160 256v64h64V256C224 238.4 209.6 224 192 224z"/>
        </svg>`,
    2: `<svg style="height: 4rem;" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
            <path d="M44 320.6l14.5 6.5c-17.01 20.24-26.44 45.91-26.44 72.35C32.06 399.7 32.12 432 32.12 432h48v-32c0-24.75 14-47.5 36.13-58.63l38.13-23.37c13.25-6.625 21.75-20.25 21.75-35.13v-58.75l-15.37 9C155.6 235.8 151.9 240.4 150.5 245.9L143 271c-2.25 7.625-8 13.88-15.38 16.75L117.1 292C114 293.3 110.7 293.9 107.4 293.9c-3.626 0-7.263-.7514-10.66-2.254L63.5 276.9C54.12 272.6 48 263.2 48 252.9V140.5c0-5.125 2.125-10.12 5.75-13.88l7.375-7.375L49.5 96C48.5 94.12 48 92 48 89.88C48 84.38 52.38 80 57.88 80h105c86.75 0 156.1 70.38 156.1 157.1V432h48.06l-.0625-194.9C367.9 124 276 32 162.9 32H57.88C25.88 32 0 57.88 0 89.88c0 8.5 1.75 16.88 5.125 24.62C1.75 122.8 0 131.6 0 140.5v112.4C0 282.2 17.25 308.8 44 320.6zM80.12 164c0 11 8.875 20 20 20c11 0 20-9 20-20s-9-20-20-20C89 144 80.12 153 80.12 164zM360 464H23.1C10.75 464 0 474.7 0 487.1S10.75 512 23.1 512H360C373.3 512 384 501.3 384 488S373.3 464 360 464z"/>
        </svg>`,
    3: `<svg style="height: 4rem;" viewBox="0 0 320 512" xmlns="http://www.w3.org/2000/svg">
            <path d="M296 464H23.1C10.75 464 0 474.7 0 487.1S10.75 512 23.1 512h272C309.3 512 320 501.3 320 488S309.3 464 296 464zM0 304c0 51.63 30.12 85.25 64 96v32h48v-67.13l-33.5-10.63C63.75 349.5 48 333.9 48 304c0-84.1 93.2-206.5 112.6-206.5c19.63 0 60.01 67.18 70.28 85.8l-66.13 66.13c-3.125 3.125-4.688 7.219-4.688 11.31S161.6 268.9 164.8 272L176 283.2c3.125 3.125 7.219 4.688 11.31 4.688s8.188-1.562 11.31-4.688L253 229C264.4 256.8 272 283.5 272 304c0 29.88-15.75 45.5-30.5 50.25L208 364.9V432H256v-32c33.88-10.75 64-44.38 64-96c0-73.38-67.75-197.2-120.6-241.5C213.4 59.12 224 47 224 32c0-17.62-14.38-32-32-32H128C110.4 0 96 14.38 96 32c0 15 10.62 27.12 24.62 30.5C67.75 106.8 0 230.6 0 304z"/>
        </svg>`
}

function writeTeamMembersName(leader, members) {
    delTeamMembers.innerHTML = ''
    let teamMarkup = ''
    let leaderMarkup = `
        <div class="col-sm-9 col-md-6 col-lg-4">
            <div class="card shadow pt-3 mb-2" data-bs-toggle="tooltip" data-bs-title="Leader">
                <div class="card-body">
                    <div class="text-center">
                        <svg style="height: 4rem;" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                            <path d="M391.9 464H55.95c-13.25 0-23.1 10.75-23.1 23.1S42.7 512 55.95 512h335.1c13.25 0 23.1-10.75 23.1-23.1S405.2 464 391.9 464zM448 216c0-11.82-3.783-23.51-11.08-33.17c-10.3-14.39-27-22.88-44.73-22.88L247.9 160V104h31.1c13.2 0 24.06-10.8 24.06-24S293.1 56 279.9 56h-31.1V23.1C247.9 10.8 237.2 0 223.1 0S199.9 10.8 199.9 23.1V56H167.9c-13.2 0-23.97 10.8-23.97 24S154.7 104 167.9 104h31.1V160H55.95C24.72 160 0 185.3 0 215.9C0 221.6 .8893 227.4 2.704 233L68.45 432h50.5L48.33 218.4C48.09 217.6 47.98 216.9 47.98 216.1C47.98 212.3 50.93 208 55.95 208h335.9c6.076 0 8.115 5.494 8.115 8.113c0 .6341-.078 1.269-.2405 1.887L328.8 432h50.62l65.1-199.2C447.2 227.3 448 221.7 448 216z"/>
                        </svg>
                        <p class="lead text-primary mt-3"></p>
                        <h4 class="card-title text-primary fs-3"><span id="del-leader-name">${decomposeDelName(leader.first_name, leader.last_name)}</span></h4>
                    </div>
                </div>
            </div>
        </div>
    `

    members.forEach((member, index) => {
        teamMarkup += `
            <div class="col-sm-9 col-md-6 col-lg-4">
                <div class="card shadow pt-3 mb-2" data-bs-toggle="tooltip" data-bs-title="Member">
                    <div class="card-body">
                        <div class="text-center">
                            ${delMembersNameLogo[(index)]}
                            <p class="lead text-primary mt-3"></p>
                            <h4 class="card-title text-primary fs-3"><span class="del-member-name">${decomposeDelName(member.first_name, member.last_name)}</span></h4>
                        </div>
                    </div>
                </div>
            </div>
        `
    })

    delTeamMembers.innerHTML = (leaderMarkup + teamMarkup)
}

// WA group for delegates
const WAGroup = {
    "BCC": "https://chat.whatsapp.com/LQIOCCbVfYhJaJyPl5w9XV?mode=wwt",
    "GDPC": "https://chat.whatsapp.com/GIELYdRnXdP09pVcgjqPiB?mode=wwt",
    "PPC": "https://chat.whatsapp.com/Hew4NHXzrFgBM3C6QmBRkx?mode=wwt",
    "ORDC": "https://chat.whatsapp.com/EjGDGrF5ldGFDyLVoz50vO?mode=wwt",
    "SC": "https://chat.whatsapp.com/H4ReXpGuRPHHuke5CUIWiu?mode=wwt",
    "MIC": "https://chat.whatsapp.com/GIhNevsM6HW2xDUirbLGUo?mode=wwt",
    "PODC": "https://chat.whatsapp.com/DCYjX4rejsqLKZAdKVqeQi?mode=wwt",
    "WDC": "https://chat.whatsapp.com/L96OCbDm3sq7CvvbhNyz7U?mode=wwt",
    "HC": "https://chat.whatsapp.com/BxMDdoC9aWG0MKx8cWZTqz?mode=wwt"
}

// Write Final Payment Status
// function writePaymentStatus(status) {
// 	delegatePaymentStatus.innerHTML = ''

// 	if (status) {
// 		delegatePaymentStatus.innerHTML = `
// 			<div class="alert alert-success alert-dismissible fade show" role="alert">
// 				<h4 class="alert-heading">Confirmed</h4>
// 				<p>Your team final payment has been confirmed! <i class="bi bi-emoji-smile"></i></p>
// 				<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
// 				<hr>
//   				<p class="mb-0">Make sure your liaison officer has invited you to the finalist group.</p>
// 			</div>
// 		`
// 	} else {
// 		delegatePaymentStatus.innerHTML = `
// 			<div class="alert alert-warning" role="alert">
// 				<h4 class="alert-heading">Unconfirmed</h4>
// 				<p>Your team final payment has not been confirmed <i class="bi bi-emoji-frown"></i></p>
// 				<hr>
//   				<p class="mb-0">If within 24 hours the status has not changed, please contact us</p>
// 			</div>
// 		`
// 	}
// }

function decomposeDelName(firstname, lastname) {
    return `${firstname} ${lastname}`
}

let competitionName = {
    "BCC": ["Business Case", "https://drive.google.com/file/d/1UI4jGySj6asIUHRUbgVkDgI4zfKuNAP9/view?usp=drive_link"],
    "GDPC": ["Geothermal Development Plan", "https://drive.google.com/file/d/1h13PetzYZIlkE4-NRZFcYCTuQ81I0ft7/view?usp=drive_link"],
    "MIC": ["Mud Innovation", "https://drive.google.com/file/d/18y_snK6CiK4zQz6XA-D9OTkX4wZua-pt/view?usp=drive_link"],
    "ORDC": ["Oil Rig Design", "https://drive.google.com/file/d/1b27MbLf4uARbmwOgTNSqcHZJaKY-ScsJ/view?usp=drive_link"],
    "PPC": ["Paper and Poster", "https://drive.google.com/file/d/1-BfuDiX9e9hpPQI73CN395f7wyPLOvLT/view?usp=drive_link"],
    "PODC": ["Plan of Development", "https://drive.google.com/file/d/1PQArM5lSdExnKH39FiCdkeYB06Gz6D7W/view?usp=drive_link"],
    "SC": ["Smart Competition", "https://drive.google.com/file/d/1MH0raIJYni8wuBYUZMx2t9H3zSNUX1Vn/view?usp=drive_link"],
    "WDC": ["Well Design", "https://drive.google.com/file/d/1To-cSoflWFLrrFqzS-n85h9UM4UzBi0d/view?usp=drive_link"],
    "HC": ["Hackathon", "https://drive.google.com/file/d/1hPczUYNxHH7tjNBKOD3prEBtdbJWjbFk/view?usp=drive_link"]
}
















// Submission Section
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

// Preliminary
const preliminaryForm = document.getElementById("preliminary-form")
const prelimSubmitBtn = document.getElementById("prelim-submit-btn")
const premFileInput = preliminaryForm.querySelector("input[name='preliminary-submit']")
const deleteFileBtnPrem = document.getElementById("delete-file-prem")
const delegateSubmissionSummary = document.getElementById("del-submission-summary")
const alertShowPrelim = document.getElementById("preliminary-alert")
const delCasePrelimLink = document.getElementById("del-case-prelim-download")
const editFileBtnPrem = delegateSubmissionSummary.querySelector("#del-edit-submission")

deleteFileBtnPrem.addEventListener("click", () => { premFileInput.value = '' })

editFileBtnPrem.addEventListener("click", () => { submissionFormStateShow(preliminaryForm, delegateSubmissionSummary) })

// Final
const finalForm = document.getElementById("final-form")
const finalSubmitBtn = document.getElementById("final-submit-btn")
const finalFileInput = finalForm.querySelector("input[name='final-submit']")
const uploadProgressCont = finalForm.querySelector("#upload-progress-container")
const uploadProgress = finalForm.querySelector("#upload-progress")
const uploadStatus = finalForm.querySelector("#upload-status")
const currentSizeShow = uploadStatus.querySelector("#current-uploaded-size")
const totalUploadSizeShow = uploadStatus.querySelector("#total-size")
const cancelFileUpload = uploadProgressCont.querySelector("#cancel-file-upload")
const deleteFileBtnFinal = document.getElementById("delete-file-final")
// const uploadCancelBtn = progressContainer.querySelector('#cancel-final-submit')
const delegateSubmissionSummaryFinal = document.getElementById("del-sub-sum-final")
const alertShowFinal = document.getElementById("final-alert")
const delCaseFinalLink = document.getElementById("del-case-final-download")
// const editFileBtnFinal = delegateSubmissionSummaryFinal.querySelector("#del-edit-submission")

deleteFileBtnFinal.addEventListener("click", () => { finalFileInput.value = '' })

// editFileBtnFinal.addEventListener("click", () => {
// 	console.log("EDIT FINAL FILE")
// 	submissionFormStateShow(finalForm, delegateSubmissionSummaryFinal)
// })

function overdueStatus() {
    let deadline = new Date('Dec 12, 2025 00:00:00').getTime()
   let now = new Date().getTime()

   return now > deadline
}

function finalOverdueStatus(compe) {
    let deadline
    let now = new Date().getTime()

    switch (compe) {
        case 'BCC':
            deadline = new Date('Feb 5, 2026 00:00:00').getTime()
            break
        case 'GDPC':
            deadline = new Date('Feb 5, 2026 00:00:00').getTime()
            break
        case 'MIC':
            deadline = new Date('Feb 5, 2026 00:00:00').getTime()
            break
        case 'ORDC':
            deadline = new Date('Feb 5, 2026 00:00:00').getTime()
            break
        case 'PODC':
            deadline = new Date('Feb 5, 2026 00:00:00').getTime()
            break
        case 'PODC-Model':
            deadline = new Date('Feb 5, 2026 00:00:00').getTime()
            break
        case 'PODC-PPT':
            deadline = new Date('Feb 5, 2026 00:00:00').getTime()
            break
        case 'PPC':
            deadline = new Date('Feb 5, 2026 00:00:00').getTime()
            break
        case 'WDC':
            deadline = new Date('Feb 5, 2026 00:00:00').getTime()
            break
        case 'HC':
            deadline = new Date('Feb 5, 2026 00:00:00').getTime()
            break
    }

    return now > deadline
}

function changeAlertStatus(alertContainer, substatus, isFinal) {
    if (substatus){
        alertContainer.classList.remove("alert-warning")
        alertContainer.classList.add("alert-success")
        alertContainer.innerHTML = `
            <div class="alert-heading">
                <h1 class="fs-5 lead" style="font-weight: bolder;">
                    <strong>You rock!</strong>
                    <?xml version="1.0" ?><svg style="width: 1.5rem" id="icon" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:none;}</style></defs><title/><path d="M16,24a8,8,0,0,0,6.85-3.89l-1.71-1a6,6,0,0,1-10.28,0l-1.71,1A8,8,0,0,0,16,24Z" transform="translate(0)"/><path d="M16,2A14,14,0,1,0,30,16,14,14,0,0,0,16,2Zm0,2a12,12,0,0,1,10.89,7H25a1,1,0,0,0-1-1H8a1,1,0,0,0-1,1H5.11A12,12,0,0,1,16,4Zm0,24A12,12,0,0,1,4,16a11.86,11.86,0,0,1,.4-3H7v2a2,2,0,0,0,2,2h3.31a2,2,0,0,0,2-1.67L14.83,12h2.34l.55,3.33a2,2,0,0,0,2,1.67H23a2,2,0,0,0,2-2V13h2.6a11.86,11.86,0,0,1,.4,3A12,12,0,0,1,16,28Z" transform="translate(0)"/><rect class="cls-1" data-name="&lt;Transparent Rectangle&gt;" height="32" id="_Transparent_Rectangle_" width="32"/></svg>
                </h1>
                <p class="fs-6">
                    We’ve got your submission! Thanks a lot for putting in the effort—awesome work so far. Keep it up!
                </p>
            </div>
        `
    } else {
        alertContainer.classList.remove("alert-success")
        alertContainer.classList.add("alert-warning")
        if (isFinal) {
            alertContainer.innerHTML = `
            <?xml version="1.0" ?><svg style="width: 4rem" data-name="Layer 1" id="Layer_1" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:#efcc00;}.cls-2{fill:#353535;}</style></defs><title/><path class="cls-1" d="M30.16,11.51,6.84,51.9a2.13,2.13,0,0,0,1.84,3.19H55.32a2.13,2.13,0,0,0,1.84-3.19L33.84,11.51A2.13,2.13,0,0,0,30.16,11.51Z"/><path class="cls-2" d="M29,46a3,3,0,1,1,3,3A2.88,2.88,0,0,1,29,46Zm1.09-4.66-.76-15h5.26l-.73,15Z"/></svg>
            <h4 class="alert-heading">Reminder</h4>
            <p class="fs-6">
                Before submitting your file, please carefully review all the content you have entered.
                <strong>You can only send a submission once.</strong> 
                Please pay attention to the submission deadline, 
                as you may experience a bad network connection.
            </p>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `
        } else {
            alertContainer.innerHTML = `
                <div class="alert-heading">
                    <?xml version="1.0" ?><svg style="width: 4rem" data-name="Layer 1" id="Layer_1" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:#efcc00;}.cls-2{fill:#353535;}</style></defs><title/><path class="cls-1" d="M30.16,11.51,6.84,51.9a2.13,2.13,0,0,0,1.84,3.19H55.32a2.13,2.13,0,0,0,1.84-3.19L33.84,11.51A2.13,2.13,0,0,0,30.16,11.51Z"/><path class="cls-2" d="M29,46a3,3,0,1,1,3,3A2.88,2.88,0,0,1,29,46Zm1.09-4.66-.76-15h5.26l-.73,15Z"/></svg>
                    <h1 class="fs-5">Reminder</h1>
                    <p class="fs-6">
                        Before submitting your file, please carefully review all the content you have entered.
                        Although you can edit your files again after sending, 
                        please still pay attention to the submission deadline, 
                        as you may experience a bad network connection.
                    </p>
                    <hr>
                    <p><strong>The file that will be assessed is the last file you sent</strong></p>
                </div>
            `
        }
    }
}

function submissionFormStateHide(form, subsummary, user, isFinal) {
    form.classList.add("d-none")
    
    subsummary.classList.remove("d-none")
    subsummary.querySelector("#file-team-name").textContent = user.team_name
    subsummary.querySelector("#file-competition").textContent = user.competition

    if (isFinal) {
        subsummary.querySelector("#file-time-sub").textContent = user.sub_final.submittedAt.toDate().toLocaleString()
        subsummary.querySelector("#file-time-status").innerHTML = user.sub_final.overdue ? 'Status: <span class="text-danger">Overdue</span>' : 'Status: <span class="text-success" id="file-time-status">On Time</span>'
    } else {
        subsummary.querySelector("#file-time-sub").textContent = user.sub_preliminary.submittedAt.toDate().toLocaleString()
        subsummary.querySelector("#file-time-status").innerHTML = user.sub_preliminary.overdue ? 'Status: <span class="text-danger">Overdue</span>' : 'Status: <span class="text-success" id="file-time-status">On Time</span>'
    }
}

function submissionFormStateShow(form, subsummary) {
    subsummary.classList.add("d-none")
    form.classList.remove("d-none")
}

preliminaryForm.addEventListener("submit", (e) => {
    e.preventDefault()

    if (prelimSubmitBtn.disabled) return

    prelimSubmitBtn.disabled = true
    prelimSubmitBtn.innerText = 'Processing...'

    if (preliminaryForm.checkValidity()) {
        try{
            const file = premFileInput.files[0]
            const timeStamp = Date.now()
            const delSubmitPrelim = ref(storageCompetition, `${file.name}_${timeStamp}`)

            uploadBytes(delSubmitPrelim, file).then((snap) => {
                return getDownloadURL(snap.ref)	
            })
            .then((downloadURL) => {
                return updateDoc(doc(DB, 'Submission_Status', currentUserID), {
                    sub_preliminary: {
                        fileURL: downloadURL,
                        submittedAt: serverTimestamp(),
                        status: true,
                        overdue: overdueStatus()
                    }
                })
            })
            .then(() => {
                prelimSubmitBtn.innerText = 'Submit'
                prelimSubmitBtn.disabled = false
                alert("Success sending your submission!")
                window.location.reload()
            })
            .catch((err) => {
                prelimSubmitBtn.innerText = 'Submit'
                prelimSubmitBtn.disabled = false
                alert("Cannot sending files! Please contact us.")
                console.log(err.message)
            })
        } catch(err) {
            prelimSubmitBtn.innerText = 'Submit'
            prelimSubmitBtn.disabled = false
            alert("Cannot sending files! Please contact us.")
            console.log(err)
        }
    }
})

// Final Submission
async function checkUserFinalSubmitStatus(ref) {
    try {
        const userSnap = await getDoc(ref)

        if (!userSnap.exists()) {
            setToastAlert('danger', 'User does not exist!')
            return false
        }

        const finalSubmitStatus = userSnap.data()?.sub_final?.status || false

        if (finalSubmitStatus) {
            setToastAlert('warning', 'Submission can only be done once!')
            console.log('Submission can only be done once!')
            return false
        }
        return true
    } catch (err) {
        console.error('Error when checking user final submission status:', err)
        setToastAlert('danger', 'Something went wrong! Please contact us!')
        return false
    }
}


finalForm.addEventListener('submit', (e) => {
    e.preventDefault()

    if (finalSubmitBtn.disabled) return

    if (!finalForm.checkValidity()) {
        setToastAlert('warning', 'Please fill the form correctly!')
        return
    }

    const userRef = doc(DB, 'Submission_Status', currentUserID)

    checkUserFinalSubmitStatus(userRef)
    .then((status) => {
        if (status) {
            // Handle Submission
            let bePatient
            uploadProgressCont.classList.remove('d-none')
            finalSubmitBtn.disabled = true

            const connection = navigator.connection || { effectiveType: '4g' }
            let chunkSize = 5 * 1024 * 1024 // 5 MB default

            if (connection.effectiveType === '4g') {
                chunkSize = 10 * 1024 * 1024 // 10 MB in faster connection
            }

            const file = finalFileInput.files[0]
            const timeStamp = Date.now()
            const delSubmitFinal = ref(finalStorageCompetition, `${timeStamp}_${file.name}`)
            const uploadTask = uploadBytesResumable(delSubmitFinal, file, {
                customMetadata: {},
                chunkSize: chunkSize
            })
    
            const cancelUpload = () => {
                uploadTask.cancel()
                finalSubmitBtn.disabled = false
                uploadProgressCont.classList.add('d-none')
                finalSubmitBtn.removeEventListener('click', cancelUpload)
            }
    
            cancelFileUpload.addEventListener('click', cancelUpload)
    
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    showProgressUI(progress, uploadProgress, currentSizeShow, totalUploadSizeShow, snapshot.totalBytes)
    
                    bePatient = setTimeout(() => {
                        uploadStatus.querySelector('h6').textContent = 'This may take a few minutes'
                    }, 10000)
                },
                (err) => {
                    switch (err.code) {
                        case 'storage/unauthorized':
                            setToastAlert('danger', 'You do not have permission to upload the file!')
                            break
                        case 'storage/canceled':
                            setToastAlert('warning', 'Upload canceled by user!')
                            break
                        case 'storage/unknown':
                            setToastAlert('danger', 'An unknown error occurred!')
                            break
                        case 'storage/retry-limit-exceeded':
                            setToastAlert('warning', 'Failed due to timeout. Please check your internet connection and try again')
                            break
                    }
                    console.error(err)
                    clearTimeout(bePatient)
                    cancelUpload()
                },
                () => {
                    getDownloadURL(uploadTask.snapshot.ref)
                    .then((url) => {
                        return updateDoc(userRef, {
                            sub_final: {
                                fileURL: url,
                                submittedAt: serverTimestamp(),
                                status: true,
                                overdue: finalOverdueStatus(userCompetition),
                            },
                        })
                    })
                    .then(() => {
                        setToastAlert('success', 'Success sending your submission!')
                    })
                    .catch((err) => {
                        console.error(err)
                        setToastAlert('danger', 'Failed sending your submission! Please try again and contact us!')
                    })
                    .finally(() => {
                        clearTimeout(bePatient)
                        cancelUpload()
                    })
                }
            ) 
        } else {
            return
        }
    })
    .catch((err) => {
        console.error(err)
        setToastAlert('danger', 'Failed sending your submission! Please try again and contact us!')
        finalSubmitBtn.innerText = 'Submit'
        finalSubmitBtn.disabled = false
        uploadProgressCont.classList.add('d-none')
    })
})

// Below is for PODC only
const absSubUIContainer = document.querySelector(".abs-sub-ui")
const absSummary = document.getElementById("del-abstract-submission-summary")

function summaryAbstractShowStatus(user) {
    absSummary.classList.remove("d-none")

    absSummary.querySelector("#file-team-name").textContent = user.team_name
    absSummary.querySelector("#file-competition").textContent = user.competition
    absSummary.querySelector("#abstract-file-time-sub").textContent = user.sub_abstract.submittedAt === undefined ? '-' : user.sub_abstract.submittedAt.toDate().toLocaleString()
    absSummary.querySelector("#abstract-file-time-status").innerHTML = user.sub_abstract.overdue ? '<span class="text-danger">Overdue</span>' : '<span class="text-success" id="file-time-status">On Time</span>'

    if (user.sub_add_abstract !== undefined) {
        absSummary.querySelector("#add-abstract-file-time-sub").textContent = user.sub_add_abstract.submittedAt === undefined ? '-' : user.sub_add_abstract.submittedAt.toDate().toLocaleString()
    }
}

// Deadline countdown
function abstractOverdueStatus() {
    let deadline = new Date('Dec 12, 2025 00:00:00').getTime()
   let now = new Date().getTime()

    return now > deadline
}

// Abstract submission UI function
function showAbsSubmission() {
    let absSubUI = `
        <div class="mt-5">
            <h1 class="display-5 text-primary lead">Abstract Submission</h1>
        </div>
        <div class="row">
            <form id="abstract-form" class="needs-validation" novalidate>
                <div class="mb-3">
                    <label for="abstract-submit" class="form-label">Upload your abstract file:</label>
                    <div class="col-md-8 col-12">
                        <div class="input-group">
                            <input type="file" name="abstract-submit" id="abstract-submit" class="form-control" placeholder="Your File" aria-label="Delegates Submission" aria-describedby="delete-file-prem" required>
                            <button class="btn btn-secondary text-white" type="button" id="delete-file-abs">Delete File</button>
                            <style>
                                #abstract-submit:hover{
                                    cursor: pointer;
                                }
                            </style>
                        </div>
                    </div>
                </div>
                <div class="mt-4">
                    <label for="addtional-abstract-submit" class="form-label">Upload your additional abstract file:</label>
                    <div class="col-md-8 col-12">
                        <div class="input-group">
                            <input type="file" name="additional-abstract-submit" id="additional-abstract-submit" class="form-control" placeholder="Your File" aria-label="Delegates Submission" aria-describedby="delete-file-prem">
                            <button class="btn btn-secondary text-white" type="button" id="delete-file-add-abs">Delete File</button>
                            <style>
                                #additional-abstract-submit:hover{
                                    cursor: pointer;
                                }
                            </style>
                        </div>
                    </div>
                </div>
                <div class="form-check mt-3">
                    <div class="">
                        <input class="form-check-input" type="checkbox" value="" id="have-read" required>
                            <label class="form-check-label" for="have-read">
                                I have read the <a href="https://drive.google.com/file/d/1m6Cf0w0ox1Jo8WHl_Zrh7w9NJ2XgoQTy/view?usp=drive_link" class="link-secondary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" target="_blank" id="competition-guide-book" style="text-decoration: underline;">Guide Book</a> of <span class="del-team-competition"></span> and I'm willing to face consequences if I break the rules. 
                            </label>
                        <div class="invalid-feedback">
                            You must agree before submitting.
                        </div>
                    </div>
                </div>
                <button type="submit" class="btn btn-light border border-primary rounded-pill text-primary py-2 px-4 me-4 mt-4" id="abs-sub-btn">Submit</button>
            </form>
        </div>
    `
    absSubUIContainer.innerHTML = absSubUI
    handleAbstractForm()
}

// Abstract
function handleAbstractForm() {
    const abstractForm = document.getElementById("abstract-form")
    const abstractSubBtn = abstractForm.querySelector("#abs-sub-btn")
    const absFileInput = abstractForm.querySelector("input[name='abstract-submit']")
    const addAbsFileInput = abstractForm.querySelector("input[name='additional-abstract-submit']")
    const deleteFileBtnAbs = document.getElementById("delete-file-abs")
    const deleteFileBtnAddAbs = document.getElementById("delete-file-add-abs")

    deleteFileBtnAbs.addEventListener("click", () => { absFileInput.value = '' })
    deleteFileBtnAddAbs.addEventListener("click", () => { addAbsFileInput.value = '' })

    abstractForm.addEventListener('submit', (e) => {
        e.preventDefault()

        abstractSubBtn.disabled = true
        abstractSubBtn.innerText = 'Processing...'

        if (abstractForm.checkValidity()) {
            try {
                const absFile = absFileInput.files[0]
                const addAbsFile = addAbsFileInput.files[0]
                const timeStamp = Date.now()
                const delSubmitAbs = ref(storageCompetition, `${absFile.name}_${timeStamp}`)

                // Upload abstract file
                uploadBytes(delSubmitAbs, absFile).then((snap) => {
                    return getDownloadURL(snap.ref)	
                })
                .then((downloadURL) => {
                    return updateDoc(doc(DB, 'Submission_Status', currentUserID), {
                        sub_abstract: {
                            fileURL: downloadURL,
                            submittedAt: serverTimestamp(),
                            status: true,
                            overdue: abstractOverdueStatus()
                        }
                    })
                })
                .catch((err) => {
                    alert("Cannot upload abstract file! Please contact us!")
                    console.log(err.message)
                })

                // Upload additional abstract file
                if (addAbsFile !== undefined) {
                    const delSubmitAddAbs = ref(storageCompetition, `${addAbsFile.name}_${timeStamp}_additional`)

                    uploadBytes(delSubmitAddAbs, addAbsFile).then((snap) => {
                        return getDownloadURL(snap.ref)
                    })
                    .then((downloadURL) => {
                        return updateDoc(doc(DB, 'Submission_Status', currentUserID), {
                            sub_add_abstract: {
                                fileURL: downloadURL,
                                submittedAt: serverTimestamp(),
                                status: true,
                                overdue: abstractOverdueStatus()
                            }
                        })
                    })
                    .then(() => {
                        abstractSubBtn.innerText = 'Submit'
                        abstractSubBtn.disabled = false
                        alert("Success uploading abstract files!")
                        // window.location.reload()
                    })
                } else {
                    abstractSubBtn.innerText = 'Submit'
                    abstractSubBtn.disabled = false
                    alert("Success uploading abstract files!")
                    // window.location.reload()
                }
            } catch(err) {
                console.log(err)
                abstractSubBtn.innerText = 'Submit'
                abstractSubBtn.disabled = false
                alert("Cannot uploading abstract files! Please contact us!")
            }
        }
    })
}

// Model and PPT Submission
const podcAdditionalSubmit = document.getElementById('podc-additional-final-submit')
// Model
const finalModelForm = podcAdditionalSubmit.querySelector('#final-model-form')
const finalModelSubmitBtn = finalModelForm.querySelector("#final-model-submit-btn")
const finalModelFileInput = finalModelForm.querySelector("input[name='final-model-submit']")
const uploadModelProgressCont = finalModelForm.querySelector("#upload-progress-container")
const uploadModelProgress = finalModelForm.querySelector("#upload-progress")
const uploadModelStatus = finalModelForm.querySelector("#upload-status")
const currentModelSizeShow = uploadModelStatus.querySelector("#current-uploaded-size")
const totalModelUploadSizeShow = uploadModelStatus.querySelector("#total-size")
const cancelModelFileUpload = uploadModelProgressCont.querySelector("#cancel-file-upload")
const deleteModelFileBtnFinal = document.getElementById("delete-model-file-final")
const delegateModelSubmissionSummaryFinal = document.getElementById("del-sub-model-sum-final")

deleteModelFileBtnFinal.addEventListener("click", () => { finalModelFileInput.value = '' })

// Model Final Submission
async function checkUserModelFinalSubmitStatus(ref) {
    try {
        const userSnap = await getDoc(ref)

        if (!userSnap.exists()) {
            setToastAlert('danger', 'User does not exist!')
            return false
        }

        const finalSubmitStatus = userSnap.data()?.sub_final_model?.status || false

        if (finalSubmitStatus) {
            setToastAlert('warning', 'Submission can only be done once!')
            return false
        }
        return true
    } catch (err) {
        console.error('Error when checking user final submission status:', err)
        setToastAlert('danger', 'Something went wrong! Please contact us!')
        return false
    }
}

finalModelForm.addEventListener('submit', (e) => {
    e.preventDefault()

    if (finalModelSubmitBtn.disabled) return

    if (!finalModelForm.checkValidity()) {
        setToastAlert('warning', 'Please fill the form correctly!')
        return
    }

    const userRef = doc(DB, 'Submission_Status', currentUserID)

    checkUserModelFinalSubmitStatus(userRef)
    .then((status) => {
        if (status) {
            // Handle Submission
            let bePatient
            uploadModelProgressCont.classList.remove('d-none')
            finalModelSubmitBtn.disabled = true

            const connection = navigator.connection || { effectiveType: '4g' }
            let chunkSize = 5 * 1024 * 1024 // 5 MB default

            if (connection.effectiveType === '4g') {
                chunkSize = 10 * 1024 * 1024 // 10 MB in faster connection
            }

            const file = finalModelFileInput.files[0]
            const timeStamp = Date.now()
            const delSubmitFinal = ref(finalStorageCompetition, `${timeStamp}_${file.name}`)
            const uploadTask = uploadBytesResumable(delSubmitFinal, file, {
                customMetadata: {},
                chunkSize: chunkSize
            })
    
            const cancelUpload = () => {
                uploadTask.cancel()
                finalModelSubmitBtn.disabled = false
                uploadModelProgressCont.classList.add('d-none')
                finalModelSubmitBtn.removeEventListener('click', cancelUpload)
            }
    
            cancelModelFileUpload.addEventListener('click', cancelUpload)
    
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    showProgressUI(progress, uploadModelProgress, currentModelSizeShow, totalModelUploadSizeShow, snapshot.totalBytes)
    
                    bePatient = setTimeout(() => {
                        uploadModelStatus.querySelector('h6').textContent = 'This may take a few minutes'
                    }, 10000)
                },
                (err) => {
                    switch (err.code) {
                        case 'storage/unauthorized':
                            setToastAlert('danger', 'You do not have permission to upload the file!')
                            break
                        case 'storage/canceled':
                            setToastAlert('warning', 'Upload canceled by user!')
                            break
                        case 'storage/unknown':
                            setToastAlert('danger', 'An unknown error occurred!')
                            break
                        case 'storage/retry-limit-exceeded':
                            setToastAlert('warning', 'Failed due to timeout. Please check your internet connection and try again')
                            break
                    }
                    console.error(err)
                    clearTimeout(bePatient)
                    cancelUpload()
                },
                () => {
                    getDownloadURL(uploadTask.snapshot.ref)
                    .then((url) => {
                        return updateDoc(userRef, {
                            sub_final_model: {
                                fileURL: url,
                                submittedAt: serverTimestamp(),
                                status: true,
                                overdue: finalOverdueStatus('PODC-Model'),
                            },
                        })
                    })
                    .then(() => {
                        setToastAlert('success', 'Success sending your submission!')
                    })
                    .catch((err) => {
                        console.error(err)
                        setToastAlert('danger', 'Failed sending your submission! Please try again and contact us!')
                    })
                    .finally(() => {
                        clearTimeout(bePatient)
                        cancelUpload()
                    })
                }
            ) 
        } else {
            return
        }
    })
    .catch((err) => {
        console.error(err)
        setToastAlert('danger', 'Failed sending your submission! Please try again and contact us!')
        finalModelSubmitBtn.innerText = 'Submit'
        finalModelSubmitBtn.disabled = false
        uploadModelProgressCont.classList.add('d-none')
    })
})

// PPT
const finalPPTForm = podcAdditionalSubmit.querySelector('#final-ppt-form')
const finalPPTSubmitBtn = finalPPTForm.querySelector("#final-ppt-submit-btn")
const finalPPTFileInput = finalPPTForm.querySelector("input[name='final-ppt-submit']")
const uploadPPTProgressCont = finalPPTForm.querySelector("#upload-progress-container")
const uploadPPTProgress = finalPPTForm.querySelector("#upload-progress")
const uploadPPTStatus = finalPPTForm.querySelector("#upload-status")
const currentPPTSizeShow = uploadPPTStatus.querySelector("#current-uploaded-size")
const totalPPTUploadSizeShow = uploadPPTStatus.querySelector("#total-size")
const cancelPPTFileUpload = uploadPPTProgressCont.querySelector("#cancel-file-upload")
const deletePPTFileBtnFinal = document.getElementById("delete-ppt-file-final")
const delegatePPTSubmissionSummaryFinal = document.getElementById("del-sub-ppt-sum-final")

deletePPTFileBtnFinal.addEventListener("click", () => { finalModelFileInput.value = '' })

// Model Final Submission
async function checkUserPPTFinalSubmitStatus(ref) {
    try {
        const userSnap = await getDoc(ref)

        if (!userSnap.exists()) {
            setToastAlert('danger', 'User does not exist!')
            return false
        }

        const finalSubmitStatus = userSnap.data()?.sub_final_ppt?.status || false

        if (finalSubmitStatus) {
            setToastAlert('warning', 'Submission can only be done once!')
            return false
        }
        return true
    } catch (err) {
        console.error('Error when checking user final submission status:', err)
        setToastAlert('danger', 'Something went wrong! Please contact us!')
        return false
    }
}

finalPPTForm.addEventListener('submit', (e) => {
    e.preventDefault()

    if (finalPPTSubmitBtn.disabled) return

    if (!finalPPTForm.checkValidity()) {
        setToastAlert('warning', 'Please fill the form correctly!')
        return
    }

    const userRef = doc(DB, 'Submission_Status', currentUserID)

    checkUserPPTFinalSubmitStatus(userRef)
    .then((status) => {
        if (status) {
            // Handle Submission
            let bePatient
            uploadPPTProgressCont.classList.remove('d-none')
            finalPPTSubmitBtn.disabled = true

            const connection = navigator.connection || { effectiveType: '4g' }
            let chunkSize = 5 * 1024 * 1024 // 5 MB default

            if (connection.effectiveType === '4g') {
                chunkSize = 10 * 1024 * 1024 // 10 MB in faster connection
            }

            const file = finalPPTFileInput.files[0]
            const timeStamp = Date.now()
            const delSubmitFinal = ref(finalStorageCompetition, `${timeStamp}_${file.name}`)
            const uploadTask = uploadBytesResumable(delSubmitFinal, file, {
                customMetadata: {},
                chunkSize: chunkSize
            })
    
            const cancelUpload = () => {
                uploadTask.cancel()
                finalPPTSubmitBtn.disabled = false
                uploadPPTProgressCont.classList.add('d-none')
                finalPPTSubmitBtn.removeEventListener('click', cancelUpload)
            }
    
            cancelPPTFileUpload.addEventListener('click', cancelUpload)
    
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    showProgressUI(progress, uploadPPTProgress, currentPPTSizeShow, totalPPTUploadSizeShow, snapshot.totalBytes)
    
                    bePatient = setTimeout(() => {
                        uploadPPTStatus.querySelector('h6').textContent = 'This may take a few minutes'
                    }, 10000)
                },
                (err) => {
                    switch (err.code) {
                        case 'storage/unauthorized':
                            setToastAlert('danger', 'You do not have permission to upload the file!')
                            break
                        case 'storage/canceled':
                            setToastAlert('warning', 'Upload canceled by user!')
                            break
                        case 'storage/unknown':
                            setToastAlert('danger', 'An unknown error occurred!')
                            break
                        case 'storage/retry-limit-exceeded':
                            setToastAlert('warning', 'Failed due to timeout. Please check your internet connection and try again')
                            break
                    }
                    console.error(err)
                    clearTimeout(bePatient)
                    cancelUpload()
                },
                () => {
                    getDownloadURL(uploadTask.snapshot.ref)
                    .then((url) => {
                        return updateDoc(userRef, {
                            sub_final_ppt: {
                                fileURL: url,
                                submittedAt: serverTimestamp(),
                                status: true,
                                overdue: finalOverdueStatus('PODC-PPT'),
                            },
                        })
                    })
                    .then(() => {
                        setToastAlert('success', 'Success sending your submission!')
                    })
                    .catch((err) => {
                        console.error(err)
                        setToastAlert('danger', 'Failed sending your submission! Please try again and contact us!')
                    })
                    .finally(() => {
                        clearTimeout(bePatient)
                        cancelUpload()
                    })
                }
            ) 
        } else {
            return
        }
    })
    .catch((err) => {
        console.error(err)
        setToastAlert('danger', 'Failed sending your submission! Please try again and contact us!')
        finalPPTSubmitBtn.innerText = 'Submit'
        finalPPTSubmitBtn.disabled = false
        uploadPPTProgressCont.classList.add('d-none')
    })
})

// End of PODC UI logic

async function handleCaseDownload(user, sub) {
    const caseCollection = doc(DB, 'Information', caseStorageCollection[user.competition])
    const caseData = await getDoc(caseCollection)
    const caseLink = caseData.data()

    const caseLinkPrelim = caseLink.prelim_case_link
    const caseLinkFinal = caseLink.final_case_link

    // Check Preliminary Case Availability
    if (caseLinkPrelim !== "" && user.confirmed) {
        delCasePrelimLink.setAttribute("href", caseLinkPrelim)
        delCasePrelimLink.classList.remove("d-none")
    } else {
        delCasePrelimLink.classList.add("d-none")
    }

    let userIsPassed = sub.final !== undefined && sub.final
    let userHavePay = user.final_pay_confirmed !== undefined && user.final_pay_confirmed

    if (caseLinkFinal !== "" && userIsPassed && userHavePay) {
        delCaseFinalLink.setAttribute("href", caseLinkFinal)
        delCaseFinalLink.classList.remove("d-none")
    } else {
        delCaseFinalLink.setAttribute("href", "")
        delCaseFinalLink.classList.add("d-none")
    }
}

// Delegates Final Status Announcements
const delFinalStatus = document.getElementById("del-final-status")

function showDelegatesFinalStatus(container, status) {
    let alertCont 

    if (status !== undefined) {
        if (status) {	
            alertCont = `
                <div class="alert alert-success" role="alert">
                    <h4 class="alert-heading fw-bold">PASSED</h4>
                    <p>Aww yeah! Congratulations on advancing to the finals—your hard work and dedication have truly paid off, and we're excited to see you shine in this next stage!</p>									 
                </div>
            `
        } else {
            alertCont = `
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading fw-bold">FAILED</h4>
                    <p>Although you didn't make it to the finals, your effort and dedication have been truly commendable—keep striving, as this is just one step in your journey to success!</p>									 
                </div>
            `
        }
    } else {
        alertCont = ''
    }
    container.innerHTML = alertCont
}

// Final Payment Upload Handle
const paymentStorage = ref(STORAGE, 'Payment')
const finalPaymentCont = document.getElementById("del-final-payment")
const finalPaymentUploadForm = document.getElementById("final-payment-upload")
const finalPayUplBtn = finalPaymentUploadForm.querySelector("button")
const leaderFinalPayForm = document.getElementById("leader-final-pay-form")
const membersFinalPaySec = document.querySelector(".members-final-pay-form")

// Hide final pay form if user already fully pay
async function hideFullyPayFinalForm(userDB) {
    let leaderisFull = userDB.leaderFinalPayData?.final_pay_status || false
    let individualMemberIsFull = []

    if (Array.isArray(userDB.members)) {
        for (let i = 0; i < userDB.members.length; i++) {
            let memberData = userDB[`member${i+1}FinalPayData`]
            individualMemberIsFull[i] = memberData?.final_pay_status || false
            console.log(individualMemberIsFull)
        }
    }

    if (leaderisFull && !individualMemberIsFull.includes(false)) {
        finalPaymentCont.classList.add('d-none')
    } else {
        finalPaymentCont.classList.remove('d-none')
    }
}

// DP dynamic UI
function setupPaymentSchemeListener() {
    const downPaymentCatParent = document.querySelectorAll(".down-payment-category-parent")
    const leaderFinalPayScheme = leaderFinalPayForm.querySelector('select[name="leader-payment-type"]')
    const leaderFinalPayDPCategory = leaderFinalPayForm.querySelector('select[name="leader-down-payment-category"]')

    leaderFinalPayScheme.addEventListener("change", () => {
        if (leaderFinalPayScheme.value === 'DP') {
            leaderFinalPayDPCategory.disabled = false
            leaderFinalPayDPCategory.required = true
            downPaymentCatParent[0].classList.remove('d-none')
        } else {
            leaderFinalPayDPCategory.disabled = true
            leaderFinalPayDPCategory.required = false
            downPaymentCatParent[0].classList.add('d-none')
        }
    })

    const membersFinalPayScheme = membersFinalPaySec.querySelectorAll(".member-payment-type")
    const membersFinalPayDPCategory = membersFinalPaySec.querySelectorAll(".member-down-payment-category")

    membersFinalPayScheme.forEach((m, i) => {
        m.addEventListener('change', () => {
            if (m.value == 'DP') {
                membersFinalPayDPCategory[i].disabled = false
                membersFinalPayDPCategory[i].required = true
                downPaymentCatParent[i+1].classList.remove('d-none')
            } else {
                membersFinalPayDPCategory[i].disabled = true
                membersFinalPayDPCategory[i].required = false
                downPaymentCatParent[i+1].classList.add('d-none')
            }
        })
    })
}

// Generate form based on how many the team members are
function generateTeamEntry(count, membersData) {
    membersFinalPaySec.innerHTML = ''

    for (let i = 0; i < count; i++) {
        let memberName = `<span class"fs-6" style="color: #bc2300">${membersData[i].first_name} ${membersData[i].last_name}</span>`

        let memberEntry = document.createElement('div')
        memberEntry.id = `member-${i+1}`
        memberEntry.classList.add("member", "mb-3")

        memberEntry.innerHTML = `
            <h4 class="lead fs-5 text-black">Member ${i+1}: ${memberName}</h4>
            <div class="row">
                <div class="col-md-6 col-12">
                    <label for="final-member-payment-submit-${i+1}" class="form-label">Upload payment proof</label>
                    <input type="file" name="final-member-payment-submit-${i+1}" id="final-member-payment-submit-${i+1}" class="form-control final-member-payment-submit" placeholder="Your Payment Proof" aria-label="Final Payment Proof">
                    <style>
                        #final-member-payment-submit-${i+1}:hover{
                            cursor: pointer;
                        }
                    </style>
                </div>
                <div class="col-md-6 col-12">
                    <label for="member-${i+1}-hospitality-type" class="form-label">Hospitality:</label>
                    <select name="member-${i+1}-hospitality-type" id="member-${i+1}-hospitality-type" class="form-select member-hospitality-type" required>
                        <option value="Full Hospitality">Full Hospitality</option>
                        <option value="Excluding Accommodation">Excluding Accommodation</option>
                    </select>
                </div>
            </div>
            <div class="row">
                <div class="col-md-4 col-12">
                    <label for="member-${i+1}-payment-type" class="form-label mt-3">Payment Scheme:</label>
                    <select name="member-${i+1}-payment-type" id="member-${i+1}-payment-type" class="form-select member-payment-type" required>
                        <option value="Full">Full Payment</option>
                        <option value="DP" selected>Down Payment</option>
                    </select>
                </div>
                <div class="col-md-4 col-12">
                    <label for="member-${i+1}-payment-method" class="form-label mt-3">Payment Method:</label>
                    <select name="member-${i+1}-payment-method" id="member-${i+1}-payment-method" class="form-select member-payment-method" required>
                        <option value="Gopay">Gopay</option>
                        <option value="Bank Mandiri">Bank Mandiri</option>
                        <option value="Paypal">Paypal</option>
                    </select>
                </div>
                <div class="down-payment-category-parent col-md-4 col-12">
                    <label for="member-${i+1}-down-payment-category" class="form-label mt-3">Category:</label>
                    <select name="member-${i+1}-down-payment-category" id="member-${i+1}-down-payment-category" class="form-select member-down-payment-category">
                        <option value="First">First Payment</option>
                        <option value="Last" selected>Last Payment</option>
                    </select>
                </div>
            </div>
        `
        membersFinalPaySec.append(memberEntry)
    }
}

// Get payment data
let teamName
let leaderPayIMG 
let leaderData
let members
let membersPayIMG
let membersPayIMGArchieve
let membersData

async function getTeamFinalPaymentData() {
    leaderPayIMG = leaderFinalPayForm.querySelector('input[name="final-leader-payment-submit"]').files[0]
    leaderData = {
        have_pay:true,
        confirmed: false,
        hospitality: leaderFinalPayForm.querySelector('select[name="leader-hospitality-type"]').value,
        pay_scheme: leaderFinalPayForm.querySelector('select[name="leader-payment-type"]').value,
        pay_method: leaderFinalPayForm.querySelector('select[name="leader-payment-method"]').value,
        pay_dp_category: leaderFinalPayForm.querySelector('select[name="leader-payment-type"]').value == 'Full' ? 'Non-DP' : leaderFinalPayForm.querySelector('select[name="leader-down-payment-category"]').value,
        final_pay_status: leaderFinalPayForm.querySelector('select[name="leader-payment-type"]').value == 'Full',
    }

    membersPayIMG = []
    membersPayIMGArchieve = []
    membersData = []
    members = membersFinalPaySec.querySelectorAll('.member')
    members.forEach((member, i) => {
        let mpi = member.querySelector(`input[name="final-member-payment-submit-${i+1}"]`).files[0]
        let validMPI = mpi === undefined ? '' : mpi

        membersPayIMG.push(validMPI)

        let memberData = {
            have_pay:true,
            confirmed: false,
            hospitality: member.querySelector(`select[name="member-${i+1}-hospitality-type"]`).value,
            pay_scheme: member.querySelector(`select[name="member-${i+1}-payment-type"]`).value,
            pay_method: member.querySelector(`select[name="member-${i+1}-payment-method"]`).value,
            pay_dp_category: member.querySelector(`select[name="member-${i+1}-payment-type"]`).value == 'Full' ? 'Non-DP': member.querySelector(`select[name="member-${i+1}-down-payment-category"]`).value,
            final_pay_status: member.querySelector(`select[name="member-${i+1}-payment-type"]`).value == 'Full'
        }
        membersData.push(memberData)
    })
}

// Final Payment Form Upload
async function uploadFile(storageRef, file) {
    try {
        const snap = await uploadBytes(storageRef, file)
        return await getDownloadURL(snap.ref)
    } catch(err) {
        console.log(`Failed to upload following file: ${file.name}`)
        alert(`Failed to upload ${file.name}. Please try again or contact us!`)
        throw err
    }
}

finalPaymentUploadForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    if (finalPayUplBtn.disabled) return

    finalPayUplBtn.disabled = true
    finalPayUplBtn.innerText = 'Processing...'

    let bePatient = setTimeout(() => {
        finalPayUplBtn.innerText = 'This may take a few minutes...'
    }, 10000)

    if (finalPaymentUploadForm.checkValidity()) {
        const categorizeFile = (cat, url) => cat === 'Last' ? { last_pay: url } : { first_pay: url }

        try {
            await getTeamFinalPaymentData()

            // Handle leader payment
            let leaderPayObj = {}
            if (leaderPayIMG) {
                const leaderRef = ref(paymentStorage, `${Date.now()}_${leaderPayIMG.name}`)
                const leaderDownloadUrl = await uploadFile(leaderRef, leaderPayIMG)
                leaderPayObj = categorizeFile(leaderData.pay_dp_category, leaderDownloadUrl)
            } else {
                leaderPayObj = { last_pay: "" }
            }

            // Handle members payment
            let failedFiles = []
            let uploadPromises = membersPayIMG.map(async (img, i) => {
                if (!img) {
                    return { last_pay: '' }
                }

                try {
                    const imgRef = ref(paymentStorage, `${Date.now()}_${img.name}`)
                    const downloadUrl = await uploadFile(imgRef, img)

                    return categorizeFile(membersData[i].pay_dp_category, downloadUrl)
                } catch (err) {
                    failedFiles.push(img.name)
                    return null
                }
            })

            membersPayIMGArchieve = (await Promise.allSettled(uploadPromises))
            .filter(r => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value)

            let individualMemberData = {}
            membersData.forEach((member, index) => {
                individualMemberData[`member${index + 1}FinalPayData`] = member
            })

            // Merged old data with the new one
            const teamDocRef = doc(DB, 'Team', currentUserID)
            const teamData = (await getDoc(teamDocRef)).data() || {}

            const updatedLeaderFinalPayIMG = {
            ...(teamData.leaderFinalPayIMG || {}), 
            ...leaderPayObj                  
            }

            const updatedMembersFinalPayIMG = (teamData.membersFinalPayIMG || []).map((img, index) => {
                if (index < membersPayIMGArchieve.length) {
                    return {
                        ...img, 
                        ...membersPayIMGArchieve[index]
                     };
                }
                return img
             })

            console.log("Data to update Firestore:", {
            leaderFinalPayIMG: updatedLeaderFinalPayIMG,
                leaderFinalPayData: leaderData,
                membersFinalPayIMG: updatedMembersFinalPayIMG,
                ...individualMemberData,
            })

            await updateDoc(teamDocRef, {
                leaderFinalPayIMG: updatedLeaderFinalPayIMG,
                leaderFinalPayData: leaderData,
                membersFinalPayIMG: updatedMembersFinalPayIMG,
                ...individualMemberData
            })

            if (failedFiles.length) {
                alert(`Failed to upload the following files: ${failedFiles.join(', ')}`)
            } else {
                alert('Success sending your payment')
            }
            delegatePaymentStatus.classList.remove('d-none')

        } catch(err) {
            console.error("Error during payment upload:", err);
            alert("Cannot send files! Please contact us.");
        } finally {
            clearTimeout(bePatient);
            finalPayUplBtn.innerText = 'Submit';
            finalPayUplBtn.disabled = false
        }
    } else {
        clearTimeout(bePatient)
        finalPayUplBtn.disabled = false
        finalPayUplBtn.innerText = 'Submit'
        alert("Please complete the form before submitting!")
    }
})

// Start Fetching User Data
let storageCompetition, finalStorageCompetition, userCompetition
async function fetchUserData(){

    if (currentUserID) {
        const userRef = doc(DB, "Team", currentUserID)
        const userSub = doc(DB, 'Submission_Status', currentUserID)

        try{
            const userSnap = await getDoc(userRef)
            const submissionSnap = await getDoc(userSub)

            if (userSnap.exists() && submissionSnap.exists()) {
                const userData = userSnap.data()
                const userSubData = submissionSnap.data()

                if (userData.competition === 'SC') {
                    window.location.href = '../dashboard/smart-competition/delegates.html'
                } else if (userData.competition === 'PODC') {
                    showAbsSubmission()
                    podcAdditionalSubmit.classList.remove('d-none')
                }

                const subData = submissionSnap.data()

                storageCompetition = ref(preliminaryStorage, userData.competition)
                finalStorageCompetition = ref(finalStorage, userData.competition)
                userCompetition = userData.competition

                // Handle Case File for Delegates
                await handleCaseDownload(userData, userSubData)

                // writeRoundStatus()
                delegateTeamName.textContent = userData.team_name
                teamName = userData.team_name

                delCompetition.forEach(del => {
                    del.textContent = competitionName[userData.competition][0]
                })

                delegateUniv.textContent = userData.university
                compeGuideBook.setAttribute("href", competitionName[userData.competition][1])
                                
                writePaymentStatus(userData.final_pay_confirmed)
                writeTeamMembersName(userData.leader, userData.members)

                if (userData.have_pay) {
                    delegatePaymentStatus.classList.remove("d-none")
                } else {
                    delegatePaymentStatus.classList.add("d-none")
                }

                // Show final status
                showDelegatesFinalStatus(delFinalStatus, userSubData.final)
                // Final Payment Form
                if (userSubData.final) {
                    generateTeamEntry(userData.members.length, userData.members)
                    setupPaymentSchemeListener()
                    finalPaymentCont.classList.remove('d-none')
                    document.getElementById("nav-contact").querySelector("main").classList.remove("d-none")
                } else {
                    finalPaymentCont.classList.add('d-none')
                    delegatePaymentStatus.classList.add("d-none")
                    document.getElementById("nav-contact").querySelector("main").classList.add("d-none")
                }
                // Hide if delegates already fully pay
                await hideFullyPayFinalForm(userData)

                // Write Alert Status
                if (subData.sub_preliminary.status) {
                    changeAlertStatus(alertShowPrelim, true, false)
                    submissionFormStateHide(preliminaryForm, delegateSubmissionSummary, subData, false)
                } else {
                    changeAlertStatus(alertShowPrelim, false, false)
                    submissionFormStateShow(preliminaryForm, delegateSubmissionSummary)
                }

                if (subData.sub_final.status) {
                    changeAlertStatus(alertShowFinal, true, true)
                    submissionFormStateHide(finalForm, delegateSubmissionSummaryFinal, subData, true)
                } else {
                    changeAlertStatus(alertShowFinal, false, true)
                    submissionFormStateShow(finalForm, delegateSubmissionSummaryFinal)
                }

                // PODC ONLY
                if (subData.sub_abstract !== undefined && subData.sub_abstract.status && userData.competition === 'PODC') {
                    summaryAbstractShowStatus(subData)	
                }

                if (subData.sub_final_model?.status) {
                    submissionFormStateHide(finalModelForm, delegateModelSubmissionSummaryFinal, subData, true)
                } else {
                    submissionFormStateShow(finalModelForm, delegateModelSubmissionSummaryFinal)
                }

                if (subData.sub_final_ppt?.status) {
                    submissionFormStateHide(finalPPTForm, delegatePPTSubmissionSummaryFinal, subData, true)
                } else {
                    submissionFormStateShow(finalPPTForm, delegatePPTSubmissionSummaryFinal)
                }

                // Determine Final Submit Status
                // isFinalSubmitAllowed = await checkUserFinalSubmitStatus(userSub)

            } else {
                console.log("User tidak ditemukan")
                window.location.href = '../login.html'
            }
        }catch(err){
            console.log("Something wrong during fetching user data", err)
            setToastAlert('danger', 'Something wrong during fetching user data.')
        }
    } else {
        console.log("There is no user logged in")
    }
}

// import { doc, getDoc, updateDoc, serverTimestamp,collection, getDocs } from 'firebase/firestore'

// import { onAuthStateChanged, signOut } from 'firebase/auth'

// import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage'

// import { DB, AUTH, STORAGE } from './index.js'

// import { showProgressUI, setToastAlert } from '../static/js/alert.js'

// // =========================
// // AUTH STATE
// // =========================
// let currentUserID = null;

// onAuthStateChanged(AUTH, async (user) => {
//     if (!user) {
//         window.location.href = '../login.html';
//         return;
//     }

//     currentUserID = user.uid;
//     let userData = await fetchUserData();
//     let userCompetition = (userData.competitionRaw || "").toLowerCase();
//     let PrelimOverdue = (userData.prelim_overdue || null);
//     let PrelimSubmittedAt = (userData.prelimSubmittedAt || null);
//     let PrelimFileURL = (userData.prelimFileURL || null);

//     loadPrelimCase(currentUserID);
//     setupGuidebook(userCompetition);
//     submissionSummary(PrelimOverdue, PrelimSubmittedAt, PrelimFileURL);
// });

// // =========================
// // LOGOUT BUTTON
// // =========================
// const logoutBtn = document.querySelector("#logout-btn")

// logoutBtn.addEventListener('click', () => {
//     signOut(AUTH).then(() => {
//         console.log("log out btn clicked")
//         window.location.href = '../login.html'
//     })
//     .catch((err) => {
//         console.log("Cannot loggin out user", err)
//     })
// })

// // =========================
// // COMPETITION FULL NAME MAP
// // =========================
// const CompetitionFullName = {
//     "business case": "Business Case Competition",
//     "geothermal development plan": "Geothermal Development Plan Competition",
//     "paper and poster": "Paper and Poster Competition",
//     "oil rig design": "Oil Rig Design Competition",
//     "smart competition": "Smart Competition",
//     "mud inovation": "Mud Innovation Competition",
//     "plan of development": "Plan of Development Competition",
//     "well design": "Well Design Competition",
//     "hackaton": "Hackathon Competition"
// };

// // =========================
// // WA GROUP LINKS
// // =========================
// const WAGroup = {
//     "business case": "https://chat.whatsapp.com/LQIOCCbVfYhJaJyPl5w9XV?mode=wwt",
//     "geothermal development plan": "https://chat.whatsapp.com/GIELYdRnXdP09pVcgjqPiB?mode=wwt",
//     "paper and poster": "https://chat.whatsapp.com/Hew4NHXzrFgBM3C6QmBRkx?mode=wwt",
//     "oil rig design": "https://chat.whatsapp.com/EjGDGrF5ldGFDyLVoz50vO?mode=wwt",
//     "smart competition": "https://chat.whatsapp.com/H4ReXpGuRPHHuke5CUIWiu?mode=wwt",
//     "mud inovation": "https://chat.whatsapp.com/GIhNevsM6HW2xDUirbLGUo?mode=wwt",
//     "plan of development": "https://chat.whatsapp.com/DCYjX4rejsqLKZAdKVqeQi?mode=wwt",
//     "well design": "https://chat.whatsapp.com/L96OCbDm3sq7CvvbhNyz7U?mode=wwt",
//     "hackaton": "https://chat.whatsapp.com/BxMDdoC9aWG0MKx8cWZTqz?mode=wwt"
// };

// // =========================
// // FETCH USER DATA
// // =========================
// async function fetchUserData() {
//     if (!currentUserID) return;

//     try {
//         const docRef = doc(DB, "Team", currentUserID);
//         const snap = await getDoc(docRef);

//         if (!snap.exists()) {
//             console.error("Team data not found");
//             return;
//         }

//         const data = snap.data();

//         // TEAM LEADER
//         document.getElementById("Team-Leader").textContent =
//             `${data.leader.firstName} ${data.leader.lastName}`;

//         // TEAM NAME
//         document.getElementById("Team-Name").textContent =
//             data.teamName || "-";

//         // =========================
//         // COMPETITION (FULL NAME)
//         // =========================
//         const compKey = (data.competition || "").toLowerCase();
//         document.getElementById("Competition-Name").textContent =
//             CompetitionFullName[compKey] || data.competition || "-";

//         // =========================
//         // WA GROUP (DISABLED IF NOT VERIFIED)
//         // =========================
//         const waEl = document.getElementById("WhatsApp-Group");
//         const waLink = WAGroup[compKey] || "#";

//         if (data.payment_status?.toLowerCase() === "verified") {
//             // PAYMENT VERIFIED → LINK AKTIF
//             waEl.href = waLink;
//             waEl.textContent = "Join";
//             waEl.style.pointerEvents = "auto";
//             waEl.style.opacity = "1";
//         } else {
//             // PAYMENT NOT VERIFIED → LINK DISABLED
//             waEl.href = "javascript:void(0)";
//             waEl.textContent = "Your payment has not been verified";
//             waEl.style.pointerEvents = "none";  // Disable clicking
//             waEl.style.opacity = "0.5";         // Make it look disabled
//         }
//         // =========================
//         // MEMBERS LIST (FULL NAMES)
//         // =========================
//         const members = data.members || [];

//         if (members.length > 0) {
//             const names = members.map(m => `${m.firstName} ${m.lastName}`);
//             document.getElementById("Team-Member").textContent = names.join(", ");
//         } else {
//             document.getElementById("Team-Member").textContent = "-";
//         }

//         // PAYMENT STATUS
//         let paymentStatusText = data.payment_status === "verified" ? "Verified" : "Pending";
//         document.getElementById("Payment-Status").textContent =
//             paymentStatusText || "Not Submitted";
        
//      // applySubmissionLock expects `undefined` when not submitted
//         const prelimStatus = data.sub_preliminary === undefined ? undefined : data.sub_preliminary;
//         applySubmissionLock(prelimStatus);

//         let prelim_overdue = null;
//         if (prelimStatus && prelimStatus.overdue !== undefined) {
//             prelim_overdue = prelimStatus.overdue === "yes" ? "Overdue" : "On Time";
//         }

//         const prelimSubmittedAt = prelimStatus && prelimStatus.submittedAt ? prelimStatus.submittedAt : null;
//         const prelimFileURL = prelimStatus && prelimStatus.fileURL ? prelimStatus.fileURL : null;

//         return {
//             competitionRaw: data.competition || null,
//             paymentStatus: data.payment_status || null,
//             teamName: data.teamName || null,
//             prelim_overdue: prelim_overdue,
//             prelimSubmittedAt: prelimSubmittedAt,
//             prelimFileURL: prelimFileURL
//         };



//     } catch (err) {
//         console.error("Failed to fetch data:", err);
//     }
// }

// // Write Final Payment Status
// // function writePaymentStatus(status) {
// // 	delegatePaymentStatus.innerHTML = ''

// // 	if (status) {
// // 		delegatePaymentStatus.innerHTML = `
// // 			<div class="alert alert-success alert-dismissible fade show" role="alert">
// // 				<h4 class="alert-heading">Confirmed</h4>
// // 				<p>Your team final payment has been confirmed! <i class="bi bi-emoji-smile"></i></p>
// // 				<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
// // 				<hr>
// //   				<p class="mb-0">Make sure your liaison officer has invited you to the finalist group.</p>
// // 			</div>
// // 		`
// // 	} else {
// // 		delegatePaymentStatus.innerHTML = `
// // 			<div class="alert alert-warning" role="alert">
// // 				<h4 class="alert-heading">Unconfirmed</h4>
// // 				<p>Your team final payment has not been confirmed <i class="bi bi-emoji-frown"></i></p>
// // 				<hr>
// //   				<p class="mb-0">If within 24 hours the status has not changed, please contact us</p>
// // 			</div>
// // 		`
// // 	}
// // }

// // function decomposeDelName(firstname, lastname) {
// // 	return `${firstname} ${lastname}`
// // }


// // =====================================
// // ELEMENTS
// // =====================================
// const preliminaryForm = document.getElementById("preliminary-form");
// const prelimSubmitBtn = document.getElementById("prelim-submit-btn");
// const premFileInput = preliminaryForm.querySelector("input[name='preliminary-submit']");
// const deleteFileBtnPrem = document.getElementById("delete-file-prem");

// const delegateSubmissionSummary = document.getElementById("del-submission-summary");
// const editFileBtnPrem = delegateSubmissionSummary.querySelector("#del-edit-submission");
// const delCasePrelimLink = document.getElementById("del-case-prelim-download");


// // =====================================
// // BUTTON LISTENERS
// // =====================================
// deleteFileBtnPrem.addEventListener("click", () => premFileInput.value = "");



// // =====================================
// // DEADLINE CHECK
// // =====================================
// function overdueStatus() {
//     const deadline = new Date("Dec 22, 2025 00:00:00").getTime();
//     if (Date.now() > deadline) {
//         return "yes"
//     } else {
//         return "no"
//     }
// }

// // =====================================
// // SUBMISSION OPENING DATE
// // =====================================
// function isSubmissionOpen() {
//     const openDate = new Date("Nov 23, 2025 00:00:00").getTime();
//     return Date.now() >= openDate;
// }

// export async function loadPrelimCase(currentUserID) {
//     try {
//         console.log("Starting loadPrelimCase...");
//         console.log("Current user ID:", currentUserID);

//         const teamRef = doc(DB, "Team", currentUserID);
//         const teamSnap = await getDoc(teamRef);

//         if (!teamSnap.exists()) {
//             console.log("Team doc not found");
//             return;
//         }

//         // Ambil nama competition dari Team
//         const rawCompetition = teamSnap.data().competition;
//         console.log("competition from Team:", rawCompetition);

//         const userCompetition = rawCompetition?.trim().toLowerCase();

//         if (!userCompetition) {
//             alert("Your competition data is missing!");
//             return;
//         }

//         console.log("Normalized user competition:", userCompetition);

//         // Ambil seluruh dokumen Information
//         const infoRef = collection(DB, "Information");
//         const infoSnap = await getDocs(infoRef);

//         console.log("Total documents in Information:", infoSnap.size);

//         if (infoSnap.empty) {
//             alert("⚠️ No case available yet!");
//             return;
//         }

//         // Loop dan cari yang nama kompetisinya cocok
//         let matchedCase = null;

//         infoSnap.forEach(docItem => {
//             const data = docItem.data();
//             const compName = data.competition_name?.trim().toLowerCase();

//             console.log("🔸 Checking:", compName);

//             if (compName === userCompetition) {
//                 console.log("✅ MATCH FOUND:", data);
//                 matchedCase = data;
//             }
//         });

//         // Tidak ditemukan case
//         if (!matchedCase) {
//             console.log("❌ No matched competition name in Information");

//             // Pastikan elemen ada
//             if (delCasePrelimLink) {
//                 // Hindari navigasi
//                 delCasePrelimLink.href = "javascript:void(0)";
//                 // Gunakan event listener yang jelas
//                 delCasePrelimLink.addEventListener("click", function (e) {
//                     e.preventDefault();
//                     alert("⚠️ Case is not available yet for your competition.");
//                 });

//                 // Tampilkan sebagai disabled/gray
//                 delCasePrelimLink.style.color = "gray";
//                 delCasePrelimLink.style.pointerEvents = "auto"; // biarkan klik supaya handler berjalan
//                 delCasePrelimLink.innerText = "Case Not Available";
//             } else {
//                 console.warn("#del-case-prelim-download element not found");
//             }

//             // KELUAR supaya kode di bawah yang memakai matchedCase tidak dieksekusi
//             return;
//         } else {
//             // Set link jika cocok
//             delCasePrelimLink.href = matchedCase.prelim_case_link;
//             delCasePrelimLink.innerText = "Download Case";
//             delCasePrelimLink.style.pointerEvents = "auto";
//             delCasePrelimLink.style.color = "#0dcaf0";

//             console.log("📎 Case link assigned:", matchedCase.prelim_case_link);
//         }
//     } catch (err) {
//         console.error("Error in loadPrelimCase:", err);	
//     }
// }

// // ========================
// // COMPETITION GUIDEBOOK DATA
// // ========================
// const competitionGuideBook = {
//     "BCC": ["business case", "https://drive.google.com/file/d/1GWaq2BPn5lWvV2VEGAKJyshy6z2T0OiS/view?usp=drive_link"],
//     "GDPC": ["geothermal development plan", "https://drive.google.com/file/d/1nHnoZvb8tnY8_J8kcFz-gvBDfjXkQUZg/view?usp=drive_link"],
//     "MIC": ["mud inovation", "https://drive.google.com/file/d/1IqLtOQ4xacP-KRwr7EY8J1apluTo8fY6/view?usp=drive_link"],
//     "ORDC": ["oil rig design", "https://drive.google.com/file/d/16lSPng29RjoQm0dfZSU622DV-TnD37v4/view?usp=drive_link"],
//     "PPC": ["paper and poster", "https://drive.google.com/file/d/1FCF1zc3ZNWW2vB8tq-p1VRZ0RhwforZM/view?usp=drive_link"],
//     "PODC": ["plan of development", "https://drive.google.com/file/d/1kgsvhtzgEMB0ZC9UpvvayYFHejy3WKp8/view?usp=drive_link"],
//     "SC": ["smart competition", "https://drive.google.com/file/d/1vLVrzxBPd0zfIRw1qmLgk1RJMbBHd79s/view?usp=drive_link"],
//     "WDC": ["well design", "https://drive.google.com/file/d/1U6tb3h5SVQAM3MDOlFs5DofSWPPRVykL/view?usp=drive_link"],
//     "HC": ["hackaton", "https://drive.google.com/file/d/17D-JtWdo7Nkv7j68kJx37cW-GHDmIzxY/view?usp=drive_link"]
// };


// // ========================
// // GUIDEBOOK FUNCTION
// // ========================
// function setupGuidebook(userCompetition) {
//     const guidebookLink = document.getElementById("competition-guide-book");
//     if (!guidebookLink) {
//         console.warn("#competition-guide-book element not found");
//         return;
//     }

//     // Cari link berdasarkan nama kompetisi
//     let guidebookURL = null;
//     for (const key in competitionGuideBook) {
//         if (competitionGuideBook[key][0] === userCompetition) {
//             guidebookURL = competitionGuideBook[key][1];
//             break;
//         }
//     }

//     // Jika submission belum dibuka
//     if (!isSubmissionOpen()) {
//         guidebookLink.href = "#";
//         guidebookLink.removeAttribute("target");
//         guidebookLink.style.pointerEvents = "auto";
//         guidebookLink.style.color = "gray";
//         guidebookLink.innerText = "Guidebook Locked";

//         guidebookLink.onclick = (e) => {
//             e.preventDefault();
//             alert("⚠️ Guidebook will be available when the submission period opens.");
//         };
//         return;
//     }

//     // Submission sudah dibuka
//     if (guidebookURL) {
//         guidebookLink.href = guidebookURL;
//         guidebookLink.target = "_blank";
//         guidebookLink.style.pointerEvents = "auto";
//         guidebookLink.style.color = "#0d6efd";
//         guidebookLink.innerText = "Download Guidebook";
//         guidebookLink.onclick = null;
//     } else {
//         guidebookLink.href = "#";
//         guidebookLink.removeAttribute("target");
//         guidebookLink.style.color = "gray";
//         guidebookLink.style.pointerEvents = "none";
//         guidebookLink.innerText = "Guidebook Not Available";
//     }
// }

// // =====================================
// // SUBMIT PRELIM FILE
// // ====================================

// document.addEventListener("DOMContentLoaded", () => {
//     // pilih semua checkbox id=have-read (meskipun duplikat id, querySelectorAll masih bekerja)
//     const haveReadCheckboxes = Array.from(document.querySelectorAll("input[type='checkbox']#have-read"));

//     haveReadCheckboxes.forEach(cb => {
//         // cari tombol submit di form yang sama
//         const form = cb.closest("form");
//         const submitBtn = form ? form.querySelector("button[type='submit'], input[type='submit']") : null;

//         function updateSubmitState() {
//             console.log("have-read changed:", { checked: cb.checked, formId: form?.id || null });
//             if (submitBtn) {
//                 submitBtn.disabled = !cb.checked;
//                 submitBtn.style.opacity = cb.checked ? "1" : "0.5";
//             }
//             // validasi bootstrap visual feedback
//             if (cb.checkValidity && !cb.checked) {
//                 cb.classList.add("is-invalid");
//             } else {
//                 cb.classList.remove("is-invalid");
//             }
//         }

//         // change event untuk deteksi state
//         cb.addEventListener("change", updateSubmitState);
//         // tambahan: click event + microtask untuk memastikan nilai sudah toggled
//         cb.addEventListener("click", () => setTimeout(updateSubmitState, 0));

//         // set initial state
//         updateSubmitState();
//     });

//     if (haveReadCheckboxes.length === 0) {
//         console.warn("No #have-read checkbox found on the page.");
//     }
// });



// preliminaryForm.addEventListener("submit", async (e) => {
//     e.preventDefault();


//     if (!isSubmissionOpen()) {
//         alert("⚠️ Submission will open on December 1st, 2025 at 00:00.");
//         return;
//     }

//     if (prelimSubmitBtn.disabled) return;

//     prelimSubmitBtn.disabled = true;
//     prelimSubmitBtn.innerText = "Processing...";

//     try {
//         const file = premFileInput.files[0];

//         if (!file) {
//             alert("Please choose a file before submitting.");
//             throw new Error("File is null");
//         }

//         const timeStamp = Date.now();

//         // Path penyimpanan di Firebase Storage
//         const uploadPath = `preliminary_submissions/${file.name}_${timeStamp}`;
//         const uploadRef = ref(STORAGE, uploadPath);

//         const snap = await uploadBytes(uploadRef, file);
//         const downloadURL = await getDownloadURL(snap.ref);

//         // Update ke dokumen Team
//         await updateDoc(doc(DB, "Team", currentUserID), {
//             sub_preliminary: {
//                 fileURL: downloadURL,
//                 submittedAt: serverTimestamp(),
//                 status: true,
//                 overdue: overdueStatus(),
//             }
//         });

//         alert("Success sending your submission!");
//         location.reload();

//     } catch (err) {
//         console.error(err);
//         alert("Cannot upload file! Please contact committee.");
//     }

//     prelimSubmitBtn.disabled = false;
//     prelimSubmitBtn.innerText = "Submit";
// });

// function applySubmissionLock(submissionData) {
//     const downloadCaseRow = document.querySelector(".row.my-2");
//     const formRow = document.querySelector("#preliminary-form")?.closest(".row");

//     if (submissionData !== undefined) {

//         prelimSubmitBtn.disabled = true;
//         prelimSubmitBtn.innerText = "Already Submitted";

//         // Hide "Download Case"
//         if (downloadCaseRow) downloadCaseRow.style.display = "none";

//         // Hide entire form block
//         if (formRow) formRow.style.display = "none";

//     } else {

//         // Normal (not submitted)
//         prelimSubmitBtn.disabled = false;
//         prelimSubmitBtn.innerText = "Submit";

//         if (downloadCaseRow) downloadCaseRow.style.display = "block";
//         if (formRow) formRow.style.display = "block";
//     }
// }

// editFileBtnPrem.addEventListener("click", () => {
//     unlockSubmissionForm();
// });

// function unlockSubmissionForm() {

//     applySubmissionLock(undefined);
//     const downloadCaseRow = document.querySelector(".row.my-2");
//     const formRow = document.querySelector("#preliminary-form")?.closest(".row");

//     // Show everything again
//     if (downloadCaseRow) downloadCaseRow.style.display = "block";
//     if (formRow) formRow.style.display = "block";

//     // Restore inner form elements
//     preliminaryForm.querySelectorAll("*").forEach(el => {
//         el.style.display = ""; 
//     });

//     // Restore submit button
//     prelimSubmitBtn.disabled = false;
//     prelimSubmitBtn.innerText = "Submit";
// }

// function submissionSummary (PrelimOverdue, PrelimSubmittedAt, PrelimFileURL) {
//     const delLastSubmission = delegateSubmissionSummary.querySelector("#file-time-sub");
//     const delSubmissionStatus = delegateSubmissionSummary.querySelector("#file-time-status");
//     const delFileURL = delegateSubmissionSummary.querySelector("#file-url");
//     delLastSubmission.textContent = PrelimSubmittedAt ? PrelimSubmittedAt.toDate().toLocaleString() : "No submission yet";
//     delSubmissionStatus.textContent = PrelimOverdue  || "No submission yet";
    
//     if (PrelimFileURL) {
//     delFileURL.innerHTML = `<a href="${PrelimFileURL}" target="_blank" class="text-primary text-decoration-underline">
//         Open File
//     </a>`;
//     } else {
//         delFileURL.textContent = "No file uploaded";
//     }
// }






// // // Final
// // const finalForm = document.getElementById("final-form")
// // const finalSubmitBtn = document.getElementById("final-submit-btn")
// // const finalFileInput = finalForm.querySelector("input[name='final-submit']")
// // const uploadProgressCont = finalForm.querySelector("#upload-progress-container")
// // const uploadProgress = finalForm.querySelector("#upload-progress")
// // const uploadStatus = finalForm.querySelector("#upload-status")
// // const currentSizeShow = uploadStatus.querySelector("#current-uploaded-size")
// // const totalUploadSizeShow = uploadStatus.querySelector("#total-size")
// // const cancelFileUpload = uploadProgressCont.querySelector("#cancel-file-upload")
// // const deleteFileBtnFinal = document.getElementById("delete-file-final")
// // // const uploadCancelBtn = progressContainer.querySelector('#cancel-final-submit')
// // const delegateSubmissionSummaryFinal = document.getElementById("del-sub-sum-final")
// // const alertShowFinal = document.getElementById("final-alert")
// // const delCaseFinalLink = document.getElementById("del-case-final-download")
// // // const editFileBtnFinal = delegateSubmissionSummaryFinal.querySelector("#del-edit-submission")

// // deleteFileBtnFinal.addEventListener("click", () => { finalFileInput.value = '' })

// // // editFileBtnFinal.addEventListener("click", () => {
// // // 	console.log("EDIT FINAL FILE")
// // // 	submissionFormStateShow(finalForm, delegateSubmissionSummaryFinal)
// // // })

// // function finalOverdueStatus(compe) {
// // 	let deadline
// // 	let now = new Date().getTime()

// // 	switch (compe) {
// // 		case 'BCC':
// // 			deadline = new Date('Feb 5, 2026 00:00:00').getTime()
// // 			break
// // 		case 'GDPC':
// // 			deadline = new Date('Feb 5, 2026 00:00:00').getTime()
// // 			break
// // 		case 'MIC':
// // 			deadline = new Date('Feb 5, 2026 00:00:00').getTime()
// // 			break
// // 		case 'ORDC':
// // 			deadline = new Date('Feb 5, 2026 00:00:00').getTime()
// // 			break
// // 		case 'PODC':
// // 			deadline = new Date('Feb 5, 2026 00:00:00').getTime()
// // 			break
// // 		case 'PODC-Model':
// // 			deadline = new Date('Feb 5, 2026 00:00:00').getTime()
// // 			break
// // 		case 'PODC-PPT':
// // 			deadline = new Date('Feb 5, 2026 00:00:00').getTime()
// // 			break
// // 		case 'PPC':
// // 			deadline = new Date('Feb 5, 2026 00:00:00').getTime()
// // 			break
// // 		case 'WDC':
// // 			deadline = new Date('Feb 5, 2026 00:00:00').getTime()
// // 			break
// // 		case 'HC':
// // 			deadline = new Date('Feb 5, 2026 00:00:00').getTime()
// // 			break
// // 	}

// // 	return now > deadline
// // }

// // function changeAlertStatus(alertContainer, substatus, isFinal) {
// // 	if (substatus){
// // 		alertContainer.classList.remove("alert-warning")
// // 		alertContainer.classList.add("alert-success")
// // 		alertContainer.innerHTML = `
// // 			<div class="alert-heading">
// // 				<h1 class="fs-5 lead" style="font-weight: bolder;">
// // 					<strong>You rock!</strong>
// // 					<?xml version="1.0" ?><svg style="width: 1.5rem" id="icon" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:none;}</style></defs><title/><path d="M16,24a8,8,0,0,0,6.85-3.89l-1.71-1a6,6,0,0,1-10.28,0l-1.71,1A8,8,0,0,0,16,24Z" transform="translate(0)"/><path d="M16,2A14,14,0,1,0,30,16,14,14,0,0,0,16,2Zm0,2a12,12,0,0,1,10.89,7H25a1,1,0,0,0-1-1H8a1,1,0,0,0-1,1H5.11A12,12,0,0,1,16,4Zm0,24A12,12,0,0,1,4,16a11.86,11.86,0,0,1,.4-3H7v2a2,2,0,0,0,2,2h3.31a2,2,0,0,0,2-1.67L14.83,12h2.34l.55,3.33a2,2,0,0,0,2,1.67H23a2,2,0,0,0,2-2V13h2.6a11.86,11.86,0,0,1,.4,3A12,12,0,0,1,16,28Z" transform="translate(0)"/><rect class="cls-1" data-name="&lt;Transparent Rectangle&gt;" height="32" id="_Transparent_Rectangle_" width="32"/></svg>
// // 				</h1>
// // 				<p class="fs-6">
// // 					We’ve got your submission! Thanks a lot for putting in the effort—awesome work so far. Keep it up!
// // 				</p>
// // 			</div>
// // 		`
// // 	} else {
// // 		alertContainer.classList.remove("alert-success")
// // 		alertContainer.classList.add("alert-warning")
// // 		if (isFinal) {
// // 			alertContainer.innerHTML = `
// // 			<?xml version="1.0" ?><svg style="width: 4rem" data-name="Layer 1" id="Layer_1" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:#efcc00;}.cls-2{fill:#353535;}</style></defs><title/><path class="cls-1" d="M30.16,11.51,6.84,51.9a2.13,2.13,0,0,0,1.84,3.19H55.32a2.13,2.13,0,0,0,1.84-3.19L33.84,11.51A2.13,2.13,0,0,0,30.16,11.51Z"/><path class="cls-2" d="M29,46a3,3,0,1,1,3,3A2.88,2.88,0,0,1,29,46Zm1.09-4.66-.76-15h5.26l-.73,15Z"/></svg>
// // 			<h4 class="alert-heading">Reminder</h4>
// // 			<p class="fs-6">
// // 				Before submitting your file, please carefully review all the content you have entered.
// // 				<strong>You can only send a submission once.</strong> 
// // 				Please pay attention to the submission deadline, 
// // 				as you may experience a bad network connection.
// // 			</p>
// // 			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
// // 		`
// // 		} else {
// // 			alertContainer.innerHTML = `
// // 				<div class="alert-heading">
// // 					<?xml version="1.0" ?><svg style="width: 4rem" data-name="Layer 1" id="Layer_1" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:#efcc00;}.cls-2{fill:#353535;}</style></defs><title/><path class="cls-1" d="M30.16,11.51,6.84,51.9a2.13,2.13,0,0,0,1.84,3.19H55.32a2.13,2.13,0,0,0,1.84-3.19L33.84,11.51A2.13,2.13,0,0,0,30.16,11.51Z"/><path class="cls-2" d="M29,46a3,3,0,1,1,3,3A2.88,2.88,0,0,1,29,46Zm1.09-4.66-.76-15h5.26l-.73,15Z"/></svg>
// // 					<h1 class="fs-5">Reminder</h1>
// // 					<p class="fs-6">
// // 						Before submitting your file, please carefully review all the content you have entered.
// // 						Although you can edit your files again after sending, 
// // 						please still pay attention to the submission deadline, 
// // 						as you may experience a bad network connection.
// // 					</p>
// // 					<hr>
// // 					<p><strong>The file that will be assessed is the last file you sent</strong></p>
// // 				</div>
// // 			`
// // 		}
// // 	}
// // }

// // function submissionFormStateHide(form, subsummary, user, isFinal) {
// // 	form.classList.add("d-none")
    
// // 	subsummary.classList.remove("d-none")
// // 	subsummary.querySelector("#file-team-name").textContent = user.team_name
// // 	subsummary.querySelector("#file-competition").textContent = user.competition

// // 	if (isFinal) {
// // 		subsummary.querySelector("#file-time-sub").textContent = user.sub_final.submittedAt.toDate().toLocaleString()
// // 		subsummary.querySelector("#file-time-status").innerHTML = user.sub_final.overdue ? 'Status: <span class="text-danger">Overdue</span>' : 'Status: <span class="text-success" id="file-time-status">On Time</span>'
// // 	} else {
// // 		subsummary.querySelector("#file-time-sub").textContent = user.sub_preliminary.submittedAt.toDate().toLocaleString()
// // 		subsummary.querySelector("#file-time-status").innerHTML = user.sub_preliminary.overdue ? 'Status: <span class="text-danger">Overdue</span>' : 'Status: <span class="text-success" id="file-time-status">On Time</span>'
// // 	}
// // }

// // function submissionFormStateShow(form, subsummary) {
// // 	subsummary.classList.add("d-none")
// // 	form.classList.remove("d-none")
// // }



// // // Final Submission
// // async function checkUserFinalSubmitStatus(ref) {
// // 	try {
// // 		const userSnap = await getDoc(ref)

// // 		if (!userSnap.exists()) {
// // 			setToastAlert('danger', 'User does not exist!')
// // 			return false
// // 		}

// // 		const finalSubmitStatus = userSnap.data()?.sub_final?.status || false

// // 		if (finalSubmitStatus) {
// // 			setToastAlert('warning', 'Submission can only be done once!')
// // 			console.log('Submission can only be done once!')
// // 			return false
// // 		}
// // 		return true
// // 	} catch (err) {
// // 		console.error('Error when checking user final submission status:', err)
// // 		setToastAlert('danger', 'Something went wrong! Please contact us!')
// // 		return false
// // 	}
// // }


// // finalForm.addEventListener('submit', (e) => {
// // 	e.preventDefault()

// // 	if (finalSubmitBtn.disabled) return

// // 	if (!finalForm.checkValidity()) {
// // 		setToastAlert('warning', 'Please fill the form correctly!')
// // 		return
// // 	}

// // 	const userRef = doc(DB, 'Submission_Status', currentUserID)

// // 	checkUserFinalSubmitStatus(userRef)
// // 	.then((status) => {
// // 		if (status) {
// // 			// Handle Submission
// // 			let bePatient
// // 			uploadProgressCont.classList.remove('d-none')
// // 			finalSubmitBtn.disabled = true

// // 			const connection = navigator.connection || { effectiveType: '4g' }
// // 			let chunkSize = 5 * 1024 * 1024 // 5 MB default

// // 			if (connection.effectiveType === '4g') {
// // 				chunkSize = 10 * 1024 * 1024 // 10 MB in faster connection
// // 			}

// // 			const file = finalFileInput.files[0]
// // 			const timeStamp = Date.now()
// // 			const delSubmitFinal = ref(finalStorageCompetition, `${timeStamp}_${file.name}`)
// // 			const uploadTask = uploadBytesResumable(delSubmitFinal, file, {
// // 				customMetadata: {},
// // 				chunkSize: chunkSize
// // 			})
    
// // 			const cancelUpload = () => {
// // 				uploadTask.cancel()
// // 				finalSubmitBtn.disabled = false
// // 				uploadProgressCont.classList.add('d-none')
// // 				finalSubmitBtn.removeEventListener('click', cancelUpload)
// // 			}
    
// // 			cancelFileUpload.addEventListener('click', cancelUpload)
    
// // 			uploadTask.on('state_changed',
// // 				(snapshot) => {
// // 					const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
// // 					showProgressUI(progress, uploadProgress, currentSizeShow, totalUploadSizeShow, snapshot.totalBytes)
    
// // 					bePatient = setTimeout(() => {
// // 						uploadStatus.querySelector('h6').textContent = 'This may take a few minutes'
// // 					}, 10000)
// // 				},
// // 				(err) => {
// // 					switch (err.code) {
// // 						case 'storage/unauthorized':
// // 							setToastAlert('danger', 'You do not have permission to upload the file!')
// // 							break
// // 						case 'storage/canceled':
// // 							setToastAlert('warning', 'Upload canceled by user!')
// // 							break
// // 						case 'storage/unknown':
// // 							setToastAlert('danger', 'An unknown error occurred!')
// // 							break
// // 						case 'storage/retry-limit-exceeded':
// // 							setToastAlert('warning', 'Failed due to timeout. Please check your internet connection and try again')
// // 							break
// // 					}
// // 					console.error(err)
// // 					clearTimeout(bePatient)
// // 					cancelUpload()
// // 				},
// // 				() => {
// // 					getDownloadURL(uploadTask.snapshot.ref)
// // 					.then((url) => {
// // 						return updateDoc(userRef, {
// // 							sub_final: {
// // 								fileURL: url,
// // 								submittedAt: serverTimestamp(),
// // 								status: true,
// // 								overdue: finalOverdueStatus(userCompetition),
// // 							},
// // 						})
// // 					})
// // 					.then(() => {
// // 						setToastAlert('success', 'Success sending your submission!')
// // 					})
// // 					.catch((err) => {
// // 						console.error(err)
// // 						setToastAlert('danger', 'Failed sending your submission! Please try again and contact us!')
// // 					})
// // 					.finally(() => {
// // 						clearTimeout(bePatient)
// // 						cancelUpload()
// // 					})
// // 				}
// // 			) 
// // 		} else {
// // 			return
// // 		}
// // 	})
// // 	.catch((err) => {
// // 		console.error(err)
// // 		setToastAlert('danger', 'Failed sending your submission! Please try again and contact us!')
// // 		finalSubmitBtn.innerText = 'Submit'
// // 		finalSubmitBtn.disabled = false
// // 		uploadProgressCont.classList.add('d-none')
// // 	})
// // })

// // // Below is for PODC only
// // const absSubUIContainer = document.querySelector(".abs-sub-ui")
// // const absSummary = document.getElementById("del-abstract-submission-summary")

// // function summaryAbstractShowStatus(user) {
// // 	absSummary.classList.remove("d-none")

// // 	absSummary.querySelector("#file-team-name").textContent = user.team_name
// // 	absSummary.querySelector("#file-competition").textContent = user.competition
// // 	absSummary.querySelector("#abstract-file-time-sub").textContent = user.sub_abstract.submittedAt === undefined ? '-' : user.sub_abstract.submittedAt.toDate().toLocaleString()
// // 	absSummary.querySelector("#abstract-file-time-status").innerHTML = user.sub_abstract.overdue ? '<span class="text-danger">Overdue</span>' : '<span class="text-success" id="file-time-status">On Time</span>'

// // 	if (user.sub_add_abstract !== undefined) {
// // 		absSummary.querySelector("#add-abstract-file-time-sub").textContent = user.sub_add_abstract.submittedAt === undefined ? '-' : user.sub_add_abstract.submittedAt.toDate().toLocaleString()
// // 	}
// // }

// // // Deadline countdown
// // function abstractOverdueStatus() {
// // 	let deadline = new Date('Dec 12, 2025 00:00:00').getTime()
// //    let now = new Date().getTime()

// // 	return now > deadline
// // }

// // // Abstract submission UI function
// // function showAbsSubmission() {
// // 	let absSubUI = `
// // 		<div class="mt-5">
// // 			<h1 class="display-5 text-primary lead">Abstract Submission</h1>
// // 		</div>
// // 		<div class="row">
// // 			<form id="abstract-form" class="needs-validation" novalidate>
// // 				<div class="mb-3">
// // 					<label for="abstract-submit" class="form-label">Upload your abstract file:</label>
// // 					<div class="col-md-8 col-12">
// // 						<div class="input-group">
// // 							<input type="file" name="abstract-submit" id="abstract-submit" class="form-control" placeholder="Your File" aria-label="Delegates Submission" aria-describedby="delete-file-prem" required>
// // 							<button class="btn btn-secondary text-white" type="button" id="delete-file-abs">Delete File</button>
// // 							<style>
// // 								#abstract-submit:hover{
// // 									cursor: pointer;
// // 								}
// // 							</style>
// // 						</div>
// // 					</div>
// // 				</div>
// // 				<div class="mt-4">
// // 					<label for="addtional-abstract-submit" class="form-label">Upload your additional abstract file:</label>
// // 					<div class="col-md-8 col-12">
// // 						<div class="input-group">
// // 							<input type="file" name="additional-abstract-submit" id="additional-abstract-submit" class="form-control" placeholder="Your File" aria-label="Delegates Submission" aria-describedby="delete-file-prem">
// // 							<button class="btn btn-secondary text-white" type="button" id="delete-file-add-abs">Delete File</button>
// // 							<style>
// // 								#additional-abstract-submit:hover{
// // 									cursor: pointer;
// // 								}
// // 							</style>
// // 						</div>
// // 					</div>
// // 				</div>
// // 				<div class="form-check mt-3">
// // 					<div class="">
// // 						<input class="form-check-input" type="checkbox" value="" id="have-read" required>
// // 							<label class="form-check-label" for="have-read">
// // 								I have read the <a href="https://drive.google.com/file/d/1m6Cf0w0ox1Jo8WHl_Zrh7w9NJ2XgoQTy/view?usp=drive_link" class="link-secondary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" target="_blank" id="competition-guide-book" style="text-decoration: underline;">Guide Book</a> of <span class="del-team-competition"></span> and I'm willing to face consequences if I break the rules. 
// // 							</label>
// // 						<div class="invalid-feedback">
// // 							You must agree before submitting.
// // 						</div>
// // 					</div>
// // 				</div>
// // 				<button type="submit" class="btn btn-light border border-primary rounded-pill text-primary py-2 px-4 me-4 mt-4" id="abs-sub-btn">Submit</button>
// // 			</form>
// // 		</div>
// // 	`
// // 	absSubUIContainer.innerHTML = absSubUI
// // 	handleAbstractForm()
// // }

// // // Abstract
// // function handleAbstractForm() {
// // 	const abstractForm = document.getElementById("abstract-form")
// // 	const abstractSubBtn = abstractForm.querySelector("#abs-sub-btn")
// // 	const absFileInput = abstractForm.querySelector("input[name='abstract-submit']")
// // 	const addAbsFileInput = abstractForm.querySelector("input[name='additional-abstract-submit']")
// // 	const deleteFileBtnAbs = document.getElementById("delete-file-abs")
// // 	const deleteFileBtnAddAbs = document.getElementById("delete-file-add-abs")

// // 	deleteFileBtnAbs.addEventListener("click", () => { absFileInput.value = '' })
// // 	deleteFileBtnAddAbs.addEventListener("click", () => { addAbsFileInput.value = '' })

// // 	abstractForm.addEventListener('submit', (e) => {
// // 		e.preventDefault()

// // 		abstractSubBtn.disabled = true
// // 		abstractSubBtn.innerText = 'Processing...'

// // 		if (abstractForm.checkValidity()) {
// // 			try {
// // 				const absFile = absFileInput.files[0]
// // 				const addAbsFile = addAbsFileInput.files[0]
// // 				const timeStamp = Date.now()
// // 				const delSubmitAbs = ref(storageCompetition, `${absFile.name}_${timeStamp}`)

// // 				// Upload abstract file
// // 				uploadBytes(delSubmitAbs, absFile).then((snap) => {
// // 					return getDownloadURL(snap.ref)	
// // 				})
// // 				.then((downloadURL) => {
// // 					return updateDoc(doc(DB, 'Submission_Status', currentUserID), {
// // 						sub_abstract: {
// // 							fileURL: downloadURL,
// // 							submittedAt: serverTimestamp(),
// // 							status: true,
// // 							overdue: abstractOverdueStatus()
// // 						}
// // 					})
// // 				})
// // 				.catch((err) => {
// // 					alert("Cannot upload abstract file! Please contact us!")
// // 					console.log(err.message)
// // 				})

// // 				// Upload additional abstract file
// // 				if (addAbsFile !== undefined) {
// // 					const delSubmitAddAbs = ref(storageCompetition, `${addAbsFile.name}_${timeStamp}_additional`)

// // 					uploadBytes(delSubmitAddAbs, addAbsFile).then((snap) => {
// // 						return getDownloadURL(snap.ref)
// // 					})
// // 					.then((downloadURL) => {
// // 						return updateDoc(doc(DB, 'Submission_Status', currentUserID), {
// // 							sub_add_abstract: {
// // 								fileURL: downloadURL,
// // 								submittedAt: serverTimestamp(),
// // 								status: true,
// // 								overdue: abstractOverdueStatus()
// // 							}
// // 						})
// // 					})
// // 					.then(() => {
// // 						abstractSubBtn.innerText = 'Submit'
// // 						abstractSubBtn.disabled = false
// // 						alert("Success uploading abstract files!")
// // 						// window.location.reload()
// // 					})
// // 				} else {
// // 					abstractSubBtn.innerText = 'Submit'
// // 					abstractSubBtn.disabled = false
// // 					alert("Success uploading abstract files!")
// // 					// window.location.reload()
// // 				}
// // 			} catch(err) {
// // 				console.log(err)
// // 				abstractSubBtn.innerText = 'Submit'
// // 				abstractSubBtn.disabled = false
// // 				alert("Cannot uploading abstract files! Please contact us!")
// // 			}
// // 		}
// // 	})
// // }

// // // Model and PPT Submission
// // const podcAdditionalSubmit = document.getElementById('podc-additional-final-submit')
// // // Model
// // const finalModelForm = podcAdditionalSubmit.querySelector('#final-model-form')
// // const finalModelSubmitBtn = finalModelForm.querySelector("#final-model-submit-btn")
// // const finalModelFileInput = finalModelForm.querySelector("input[name='final-model-submit']")
// // const uploadModelProgressCont = finalModelForm.querySelector("#upload-progress-container")
// // const uploadModelProgress = finalModelForm.querySelector("#upload-progress")
// // const uploadModelStatus = finalModelForm.querySelector("#upload-status")
// // const currentModelSizeShow = uploadModelStatus.querySelector("#current-uploaded-size")
// // const totalModelUploadSizeShow = uploadModelStatus.querySelector("#total-size")
// // const cancelModelFileUpload = uploadModelProgressCont.querySelector("#cancel-file-upload")
// // const deleteModelFileBtnFinal = document.getElementById("delete-model-file-final")
// // const delegateModelSubmissionSummaryFinal = document.getElementById("del-sub-model-sum-final")

// // deleteModelFileBtnFinal.addEventListener("click", () => { finalModelFileInput.value = '' })

// // // Model Final Submission
// // async function checkUserModelFinalSubmitStatus(ref) {
// // 	try {
// // 		const userSnap = await getDoc(ref)

// // 		if (!userSnap.exists()) {
// // 			setToastAlert('danger', 'User does not exist!')
// // 			return false
// // 		}

// // 		const finalSubmitStatus = userSnap.data()?.sub_final_model?.status || false

// // 		if (finalSubmitStatus) {
// // 			setToastAlert('warning', 'Submission can only be done once!')
// // 			return false
// // 		}
// // 		return true
// // 	} catch (err) {
// // 		console.error('Error when checking user final submission status:', err)
// // 		setToastAlert('danger', 'Something went wrong! Please contact us!')
// // 		return false
// // 	}
// // }

// // finalModelForm.addEventListener('submit', (e) => {
// // 	e.preventDefault()

// // 	if (finalModelSubmitBtn.disabled) return

// // 	if (!finalModelForm.checkValidity()) {
// // 		setToastAlert('warning', 'Please fill the form correctly!')
// // 		return
// // 	}

// // 	const userRef = doc(DB, 'Submission_Status', currentUserID)

// // 	checkUserModelFinalSubmitStatus(userRef)
// // 	.then((status) => {
// // 		if (status) {
// // 			// Handle Submission
// // 			let bePatient
// // 			uploadModelProgressCont.classList.remove('d-none')
// // 			finalModelSubmitBtn.disabled = true

// // 			const connection = navigator.connection || { effectiveType: '4g' }
// // 			let chunkSize = 5 * 1024 * 1024 // 5 MB default

// // 			if (connection.effectiveType === '4g') {
// // 				chunkSize = 10 * 1024 * 1024 // 10 MB in faster connection
// // 			}

// // 			const file = finalModelFileInput.files[0]
// // 			const timeStamp = Date.now()
// // 			const delSubmitFinal = ref(finalStorageCompetition, `${timeStamp}_${file.name}`)
// // 			const uploadTask = uploadBytesResumable(delSubmitFinal, file, {
// // 				customMetadata: {},
// // 				chunkSize: chunkSize
// // 			})
    
// // 			const cancelUpload = () => {
// // 				uploadTask.cancel()
// // 				finalModelSubmitBtn.disabled = false
// // 				uploadModelProgressCont.classList.add('d-none')
// // 				finalModelSubmitBtn.removeEventListener('click', cancelUpload)
// // 			}
    
// // 			cancelModelFileUpload.addEventListener('click', cancelUpload)
    
// // 			uploadTask.on('state_changed',
// // 				(snapshot) => {
// // 					const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
// // 					showProgressUI(progress, uploadModelProgress, currentModelSizeShow, totalModelUploadSizeShow, snapshot.totalBytes)
    
// // 					bePatient = setTimeout(() => {
// // 						uploadModelStatus.querySelector('h6').textContent = 'This may take a few minutes'
// // 					}, 10000)
// // 				},
// // 				(err) => {
// // 					switch (err.code) {
// // 						case 'storage/unauthorized':
// // 							setToastAlert('danger', 'You do not have permission to upload the file!')
// // 							break
// // 						case 'storage/canceled':
// // 							setToastAlert('warning', 'Upload canceled by user!')
// // 							break
// // 						case 'storage/unknown':
// // 							setToastAlert('danger', 'An unknown error occurred!')
// // 							break
// // 						case 'storage/retry-limit-exceeded':
// // 							setToastAlert('warning', 'Failed due to timeout. Please check your internet connection and try again')
// // 							break
// // 					}
// // 					console.error(err)
// // 					clearTimeout(bePatient)
// // 					cancelUpload()
// // 				},
// // 				() => {
// // 					getDownloadURL(uploadTask.snapshot.ref)
// // 					.then((url) => {
// // 						return updateDoc(userRef, {
// // 							sub_final_model: {
// // 								fileURL: url,
// // 								submittedAt: serverTimestamp(),
// // 								status: true,
// // 								overdue: finalOverdueStatus('PODC-Model'),
// // 							},
// // 						})
// // 					})
// // 					.then(() => {
// // 						setToastAlert('success', 'Success sending your submission!')
// // 					})
// // 					.catch((err) => {
// // 						console.error(err)
// // 						setToastAlert('danger', 'Failed sending your submission! Please try again and contact us!')
// // 					})
// // 					.finally(() => {
// // 						clearTimeout(bePatient)
// // 						cancelUpload()
// // 					})
// // 				}
// // 			) 
// // 		} else {
// // 			return
// // 		}
// // 	})
// // 	.catch((err) => {
// // 		console.error(err)
// // 		setToastAlert('danger', 'Failed sending your submission! Please try again and contact us!')
// // 		finalModelSubmitBtn.innerText = 'Submit'
// // 		finalModelSubmitBtn.disabled = false
// // 		uploadModelProgressCont.classList.add('d-none')
// // 	})
// // })

// // // PPT
// // const finalPPTForm = podcAdditionalSubmit.querySelector('#final-ppt-form')
// // const finalPPTSubmitBtn = finalPPTForm.querySelector("#final-ppt-submit-btn")
// // const finalPPTFileInput = finalPPTForm.querySelector("input[name='final-ppt-submit']")
// // const uploadPPTProgressCont = finalPPTForm.querySelector("#upload-progress-container")
// // const uploadPPTProgress = finalPPTForm.querySelector("#upload-progress")
// // const uploadPPTStatus = finalPPTForm.querySelector("#upload-status")
// // const currentPPTSizeShow = uploadPPTStatus.querySelector("#current-uploaded-size")
// // const totalPPTUploadSizeShow = uploadPPTStatus.querySelector("#total-size")
// // const cancelPPTFileUpload = uploadPPTProgressCont.querySelector("#cancel-file-upload")
// // const deletePPTFileBtnFinal = document.getElementById("delete-ppt-file-final")
// // const delegatePPTSubmissionSummaryFinal = document.getElementById("del-sub-ppt-sum-final")

// // deletePPTFileBtnFinal.addEventListener("click", () => { finalModelFileInput.value = '' })

// // // Model Final Submission
// // async function checkUserPPTFinalSubmitStatus(ref) {
// // 	try {
// // 		const userSnap = await getDoc(ref)

// // 		if (!userSnap.exists()) {
// // 			setToastAlert('danger', 'User does not exist!')
// // 			return false
// // 		}

// // 		const finalSubmitStatus = userSnap.data()?.sub_final_ppt?.status || false

// // 		if (finalSubmitStatus) {
// // 			setToastAlert('warning', 'Submission can only be done once!')
// // 			return false
// // 		}
// // 		return true
// // 	} catch (err) {
// // 		console.error('Error when checking user final submission status:', err)
// // 		setToastAlert('danger', 'Something went wrong! Please contact us!')
// // 		return false
// // 	}
// // }

// // finalPPTForm.addEventListener('submit', (e) => {
// // 	e.preventDefault()

// // 	if (finalPPTSubmitBtn.disabled) return

// // 	if (!finalPPTForm.checkValidity()) {
// // 		setToastAlert('warning', 'Please fill the form correctly!')
// // 		return
// // 	}

// // 	const userRef = doc(DB, 'Submission_Status', currentUserID)

// // 	checkUserPPTFinalSubmitStatus(userRef)
// // 	.then((status) => {
// // 		if (status) {
// // 			// Handle Submission
// // 			let bePatient
// // 			uploadPPTProgressCont.classList.remove('d-none')
// // 			finalPPTSubmitBtn.disabled = true

// // 			const connection = navigator.connection || { effectiveType: '4g' }
// // 			let chunkSize = 5 * 1024 * 1024 // 5 MB default

// // 			if (connection.effectiveType === '4g') {
// // 				chunkSize = 10 * 1024 * 1024 // 10 MB in faster connection
// // 			}

// // 			const file = finalPPTFileInput.files[0]
// // 			const timeStamp = Date.now()
// // 			const delSubmitFinal = ref(finalStorageCompetition, `${timeStamp}_${file.name}`)
// // 			const uploadTask = uploadBytesResumable(delSubmitFinal, file, {
// // 				customMetadata: {},
// // 				chunkSize: chunkSize
// // 			})
    
// // 			const cancelUpload = () => {
// // 				uploadTask.cancel()
// // 				finalPPTSubmitBtn.disabled = false
// // 				uploadPPTProgressCont.classList.add('d-none')
// // 				finalPPTSubmitBtn.removeEventListener('click', cancelUpload)
// // 			}
    
// // 			cancelPPTFileUpload.addEventListener('click', cancelUpload)
    
// // 			uploadTask.on('state_changed',
// // 				(snapshot) => {
// // 					const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
// // 					showProgressUI(progress, uploadPPTProgress, currentPPTSizeShow, totalPPTUploadSizeShow, snapshot.totalBytes)
    
// // 					bePatient = setTimeout(() => {
// // 						uploadPPTStatus.querySelector('h6').textContent = 'This may take a few minutes'
// // 					}, 10000)
// // 				},
// // 				(err) => {
// // 					switch (err.code) {
// // 						case 'storage/unauthorized':
// // 							setToastAlert('danger', 'You do not have permission to upload the file!')
// // 							break
// // 						case 'storage/canceled':
// // 							setToastAlert('warning', 'Upload canceled by user!')
// // 							break
// // 						case 'storage/unknown':
// // 							setToastAlert('danger', 'An unknown error occurred!')
// // 							break
// // 						case 'storage/retry-limit-exceeded':
// // 							setToastAlert('warning', 'Failed due to timeout. Please check your internet connection and try again')
// // 							break
// // 					}
// // 					console.error(err)
// // 					clearTimeout(bePatient)
// // 					cancelUpload()
// // 				},
// // 				() => {
// // 					getDownloadURL(uploadTask.snapshot.ref)
// // 					.then((url) => {
// // 						return updateDoc(userRef, {
// // 							sub_final_ppt: {
// // 								fileURL: url,
// // 								submittedAt: serverTimestamp(),
// // 								status: true,
// // 								overdue: finalOverdueStatus('PODC-PPT'),
// // 							},
// // 						})
// // 					})
// // 					.then(() => {
// // 						setToastAlert('success', 'Success sending your submission!')
// // 					})
// // 					.catch((err) => {
// // 						console.error(err)
// // 						setToastAlert('danger', 'Failed sending your submission! Please try again and contact us!')
// // 					})
// // 					.finally(() => {
// // 						clearTimeout(bePatient)
// // 						cancelUpload()
// // 					})
// // 				}
// // 			) 
// // 		} else {
// // 			return
// // 		}
// // 	})
// // 	.catch((err) => {
// // 		console.error(err)
// // 		setToastAlert('danger', 'Failed sending your submission! Please try again and contact us!')
// // 		finalPPTSubmitBtn.innerText = 'Submit'
// // 		finalPPTSubmitBtn.disabled = false
// // 		uploadPPTProgressCont.classList.add('d-none')
// // 	})
// // })

// // // End of PODC UI logic

// // async function handleCaseDownload(user, sub) {
// // 	const caseCollection = doc(DB, 'Information', caseStorageCollection[user.competition])
// // 	const caseData = await getDoc(caseCollection)
// // 	const caseLink = caseData.data()

// // 	const caseLinkPrelim = caseLink.prelim_case_link
// // 	const caseLinkFinal = caseLink.final_case_link

// // 	// Check Preliminary Case Availability
// // 	if (caseLinkPrelim !== "" && user.confirmed) {
// // 		delCasePrelimLink.setAttribute("href", caseLinkPrelim)
// // 		delCasePrelimLink.classList.remove("d-none")
// // 	} else {
// // 		delCasePrelimLink.classList.add("d-none")
// // 	}

// // 	let userIsPassed = sub.final !== undefined && sub.final
// // 	let userHavePay = user.final_pay_confirmed !== undefined && user.final_pay_confirmed

// // 	if (caseLinkFinal !== "" && userIsPassed && userHavePay) {
// // 		delCaseFinalLink.setAttribute("href", caseLinkFinal)
// // 		delCaseFinalLink.classList.remove("d-none")
// // 	} else {
// // 		delCaseFinalLink.setAttribute("href", "")
// // 		delCaseFinalLink.classList.add("d-none")
// // 	}
// // }

// // // Delegates Final Status Announcements
// // const delFinalStatus = document.getElementById("del-final-status")

// // function showDelegatesFinalStatus(container, status) {
// // 	let alertCont 

// // 	if (status !== undefined) {
// // 		if (status) {	
// // 			alertCont = `
// // 				<div class="alert alert-success" role="alert">
// // 					<h4 class="alert-heading fw-bold">PASSED</h4>
// // 					<p>Aww yeah! Congratulations on advancing to the finals—your hard work and dedication have truly paid off, and we're excited to see you shine in this next stage!</p>									 
// // 				</div>
// // 			`
// // 		} else {
// // 			alertCont = `
// // 				<div class="alert alert-danger" role="alert">
// // 					<h4 class="alert-heading fw-bold">FAILED</h4>
// // 					<p>Although you didn't make it to the finals, your effort and dedication have been truly commendable—keep striving, as this is just one step in your journey to success!</p>									 
// // 				</div>
// // 			`
// // 		}
// // 	} else {
// // 		alertCont = ''
// // 	}
// // 	container.innerHTML = alertCont
// // }

// // // Final Payment Upload Handle
// // const paymentStorage = ref(STORAGE, 'Payment')
// // const finalPaymentCont = document.getElementById("del-final-payment")
// // const finalPaymentUploadForm = document.getElementById("final-payment-upload")
// // const finalPayUplBtn = finalPaymentUploadForm.querySelector("button")
// // const leaderFinalPayForm = document.getElementById("leader-final-pay-form")
// // const membersFinalPaySec = document.querySelector(".members-final-pay-form")

// // // Hide final pay form if user already fully pay
// // async function hideFullyPayFinalForm(userDB) {
// // 	let leaderisFull = userDB.leaderFinalPayData?.final_pay_status || false
// // 	let individualMemberIsFull = []

// // 	if (Array.isArray(userDB.members)) {
// // 		for (let i = 0; i < userDB.members.length; i++) {
// // 			let memberData = userDB[`member${i+1}FinalPayData`]
// // 			individualMemberIsFull[i] = memberData?.final_pay_status || false
// // 			console.log(individualMemberIsFull)
// // 		}
// // 	}

// // 	if (leaderisFull && !individualMemberIsFull.includes(false)) {
// // 		finalPaymentCont.classList.add('d-none')
// // 	} else {
// // 		finalPaymentCont.classList.remove('d-none')
// // 	}
// // }

// // // DP dynamic UI
// // function setupPaymentSchemeListener() {
// // 	const downPaymentCatParent = document.querySelectorAll(".down-payment-category-parent")
// // 	const leaderFinalPayScheme = leaderFinalPayForm.querySelector('select[name="leader-payment-type"]')
// // 	const leaderFinalPayDPCategory = leaderFinalPayForm.querySelector('select[name="leader-down-payment-category"]')

// // 	leaderFinalPayScheme.addEventListener("change", () => {
// // 		if (leaderFinalPayScheme.value === 'DP') {
// // 			leaderFinalPayDPCategory.disabled = false
// // 			leaderFinalPayDPCategory.required = true
// // 			downPaymentCatParent[0].classList.remove('d-none')
// // 		} else {
// // 			leaderFinalPayDPCategory.disabled = true
// // 			leaderFinalPayDPCategory.required = false
// // 			downPaymentCatParent[0].classList.add('d-none')
// // 		}
// // 	})

// // 	const membersFinalPayScheme = membersFinalPaySec.querySelectorAll(".member-payment-type")
// // 	const membersFinalPayDPCategory = membersFinalPaySec.querySelectorAll(".member-down-payment-category")

// // 	membersFinalPayScheme.forEach((m, i) => {
// // 		m.addEventListener('change', () => {
// // 			if (m.value == 'DP') {
// // 				membersFinalPayDPCategory[i].disabled = false
// // 				membersFinalPayDPCategory[i].required = true
// // 				downPaymentCatParent[i+1].classList.remove('d-none')
// // 			} else {
// // 				membersFinalPayDPCategory[i].disabled = true
// // 				membersFinalPayDPCategory[i].required = false
// // 				downPaymentCatParent[i+1].classList.add('d-none')
// // 			}
// // 		})
// // 	})
// // }

// // // Generate form based on how many the team members are
// // function generateTeamEntry(count, membersData) {
// // 	membersFinalPaySec.innerHTML = ''

// // 	for (let i = 0; i < count; i++) {
// // 		let memberName = `<span class"fs-6" style="color: #bc2300">${membersData[i].first_name} ${membersData[i].last_name}</span>`

// // 		let memberEntry = document.createElement('div')
// // 		memberEntry.id = `member-${i+1}`
// // 		memberEntry.classList.add("member", "mb-3")

// // 		memberEntry.innerHTML = `
// // 			<h4 class="lead fs-5 text-black">Member ${i+1}: ${memberName}</h4>
// // 			<div class="row">
// // 				<div class="col-md-6 col-12">
// // 					<label for="final-member-payment-submit-${i+1}" class="form-label">Upload payment proof</label>
// // 					<input type="file" name="final-member-payment-submit-${i+1}" id="final-member-payment-submit-${i+1}" class="form-control final-member-payment-submit" placeholder="Your Payment Proof" aria-label="Final Payment Proof">
// // 					<style>
// // 						#final-member-payment-submit-${i+1}:hover{
// // 							cursor: pointer;
// // 						}
// // 					</style>
// // 				</div>
// // 				<div class="col-md-6 col-12">
// // 					<label for="member-${i+1}-hospitality-type" class="form-label">Hospitality:</label>
// // 					<select name="member-${i+1}-hospitality-type" id="member-${i+1}-hospitality-type" class="form-select member-hospitality-type" required>
// // 						<option value="Full Hospitality">Full Hospitality</option>
// // 						<option value="Excluding Accommodation">Excluding Accommodation</option>
// // 					</select>
// // 				</div>
// // 			</div>
// // 			<div class="row">
// // 				<div class="col-md-4 col-12">
// // 					<label for="member-${i+1}-payment-type" class="form-label mt-3">Payment Scheme:</label>
// // 					<select name="member-${i+1}-payment-type" id="member-${i+1}-payment-type" class="form-select member-payment-type" required>
// // 						<option value="Full">Full Payment</option>
// // 						<option value="DP" selected>Down Payment</option>
// // 					</select>
// // 				</div>
// // 				<div class="col-md-4 col-12">
// // 					<label for="member-${i+1}-payment-method" class="form-label mt-3">Payment Method:</label>
// // 					<select name="member-${i+1}-payment-method" id="member-${i+1}-payment-method" class="form-select member-payment-method" required>
// // 						<option value="Gopay">Gopay</option>
// // 						<option value="Bank Mandiri">Bank Mandiri</option>
// // 						<option value="Paypal">Paypal</option>
// // 					</select>
// // 				</div>
// // 				<div class="down-payment-category-parent col-md-4 col-12">
// // 					<label for="member-${i+1}-down-payment-category" class="form-label mt-3">Category:</label>
// // 					<select name="member-${i+1}-down-payment-category" id="member-${i+1}-down-payment-category" class="form-select member-down-payment-category">
// // 						<option value="First">First Payment</option>
// // 						<option value="Last" selected>Last Payment</option>
// // 					</select>
// // 				</div>
// // 			</div>
// // 		`
// // 		membersFinalPaySec.append(memberEntry)
// // 	}
// // }

// // // Get payment data
// // let teamName
// // let leaderPayIMG 
// // let leaderData
// // let members
// // let membersPayIMG
// // let membersPayIMGArchieve
// // let membersData

// // async function getTeamFinalPaymentData() {
// // 	leaderPayIMG = leaderFinalPayForm.querySelector('input[name="final-leader-payment-submit"]').files[0]
// // 	leaderData = {
// // 		have_pay:true,
// // 		confirmed: false,
// // 		hospitality: leaderFinalPayForm.querySelector('select[name="leader-hospitality-type"]').value,
// // 		pay_scheme: leaderFinalPayForm.querySelector('select[name="leader-payment-type"]').value,
// // 		pay_method: leaderFinalPayForm.querySelector('select[name="leader-payment-method"]').value,
// // 		pay_dp_category: leaderFinalPayForm.querySelector('select[name="leader-payment-type"]').value == 'Full' ? 'Non-DP' : leaderFinalPayForm.querySelector('select[name="leader-down-payment-category"]').value,
// // 		final_pay_status: leaderFinalPayForm.querySelector('select[name="leader-payment-type"]').value == 'Full',
// // 	}

// // 	membersPayIMG = []
// // 	membersPayIMGArchieve = []
// // 	membersData = []
// // 	members = membersFinalPaySec.querySelectorAll('.member')
// // 	members.forEach((member, i) => {
// // 		let mpi = member.querySelector(`input[name="final-member-payment-submit-${i+1}"]`).files[0]
// // 		let validMPI = mpi === undefined ? '' : mpi

// // 		membersPayIMG.push(validMPI)

// // 		let memberData = {
// // 			have_pay:true,
// // 			confirmed: false,
// // 			hospitality: member.querySelector(`select[name="member-${i+1}-hospitality-type"]`).value,
// // 			pay_scheme: member.querySelector(`select[name="member-${i+1}-payment-type"]`).value,
// // 			pay_method: member.querySelector(`select[name="member-${i+1}-payment-method"]`).value,
// // 			pay_dp_category: member.querySelector(`select[name="member-${i+1}-payment-type"]`).value == 'Full' ? 'Non-DP': member.querySelector(`select[name="member-${i+1}-down-payment-category"]`).value,
// // 			final_pay_status: member.querySelector(`select[name="member-${i+1}-payment-type"]`).value == 'Full'
// // 		}
// // 		membersData.push(memberData)
// // 	})
// // }

// // // Final Payment Form Upload
// // async function uploadFile(storageRef, file) {
// // 	try {
// // 		const snap = await uploadBytes(storageRef, file)
// // 		return await getDownloadURL(snap.ref)
// // 	} catch(err) {
// // 		console.log(`Failed to upload following file: ${file.name}`)
// // 		alert(`Failed to upload ${file.name}. Please try again or contact us!`)
// // 		throw err
// // 	}
// // }

// // finalPaymentUploadForm.addEventListener("submit", async (e) => {
// // 	e.preventDefault()

// // 	if (finalPayUplBtn.disabled) return

// // 	finalPayUplBtn.disabled = true
// // 	finalPayUplBtn.innerText = 'Processing...'

// // 	let bePatient = setTimeout(() => {
// // 		finalPayUplBtn.innerText = 'This may take a few minutes...'
// // 	}, 10000)

// // 	if (finalPaymentUploadForm.checkValidity()) {
// // 		const categorizeFile = (cat, url) => cat === 'Last' ? { last_pay: url } : { first_pay: url }

// // 		try {
// // 			await getTeamFinalPaymentData()

// // 			// Handle leader payment
// // 			let leaderPayObj = {}
// // 			if (leaderPayIMG) {
// // 				const leaderRef = ref(paymentStorage, `${Date.now()}_${leaderPayIMG.name}`)
// // 				const leaderDownloadUrl = await uploadFile(leaderRef, leaderPayIMG)
// // 				leaderPayObj = categorizeFile(leaderData.pay_dp_category, leaderDownloadUrl)
// // 			} else {
// // 				leaderPayObj = { last_pay: "" }
// // 			}

// // 			// Handle members payment
// // 			let failedFiles = []
// // 			let uploadPromises = membersPayIMG.map(async (img, i) => {
// // 				if (!img) {
// // 					return { last_pay: '' }
// // 				}

// // 				try {
// // 					const imgRef = ref(paymentStorage, `${Date.now()}_${img.name}`)
// // 					const downloadUrl = await uploadFile(imgRef, img)

// // 					return categorizeFile(membersData[i].pay_dp_category, downloadUrl)
// // 				} catch (err) {
// // 					failedFiles.push(img.name)
// // 					return null
// // 				}
// // 			})

// // 			membersPayIMGArchieve = (await Promise.allSettled(uploadPromises))
// // 			.filter(r => r.status === 'fulfilled' && r.value !== null)
// // 			.map(r => r.value)

// // 			let individualMemberData = {}
// // 			membersData.forEach((member, index) => {
// // 				individualMemberData[`member${index + 1}FinalPayData`] = member
// // 			})

// // 			// Merged old data with the new one
// // 			const teamDocRef = doc(DB, 'Team', currentUserID)
// // 			const teamData = (await getDoc(teamDocRef)).data() || {}

// // 			const updatedLeaderFinalPayIMG = {
// // 			...(teamData.leaderFinalPayIMG || {}), 
// // 			...leaderPayObj                  
// // 			}

// // 			const updatedMembersFinalPayIMG = (teamData.membersFinalPayIMG || []).map((img, index) => {
// // 				if (index < membersPayIMGArchieve.length) {
// // 				  	return {
// // 					 	...img, 
// // 					 	...membersPayIMGArchieve[index]
// // 				 	 };
// // 				}
// // 				return img
// // 			 })

// // 			console.log("Data to update Firestore:", {
// //             leaderFinalPayIMG: updatedLeaderFinalPayIMG,
// // 				leaderFinalPayData: leaderData,
// // 				membersFinalPayIMG: updatedMembersFinalPayIMG,
// // 				...individualMemberData,
// //         	})

// // 			await updateDoc(teamDocRef, {
// // 				leaderFinalPayIMG: updatedLeaderFinalPayIMG,
// // 				leaderFinalPayData: leaderData,
// // 				membersFinalPayIMG: updatedMembersFinalPayIMG,
// // 				...individualMemberData
// // 			})

// // 			if (failedFiles.length) {
// // 				alert(`Failed to upload the following files: ${failedFiles.join(', ')}`)
// // 			} else {
// // 				alert('Success sending your payment')
// // 			}
// // 			delegatePaymentStatus.classList.remove('d-none')

// // 		} catch(err) {
// // 			console.error("Error during payment upload:", err);
// // 			alert("Cannot send files! Please contact us.");
// // 		} finally {
// // 			clearTimeout(bePatient);
// // 			finalPayUplBtn.innerText = 'Submit';
// // 			finalPayUplBtn.disabled = false
// // 		}
// // 	} else {
// // 		clearTimeout(bePatient)
// // 		finalPayUplBtn.disabled = false
// // 		finalPayUplBtn.innerText = 'Submit'
// // 		alert("Please complete the form before submitting!")
// // 	}
// // })

// // // Start Fetching User Data
// // let storageCompetition, finalStorageCompetition, userCompetition
// // async function fetchUserData(){

// // 	if (currentUserID) {
// // 		const userRef = doc(DB, "Team", currentUserID)
// // 		const userSub = doc(DB, 'Submission_Status', currentUserID)

// // 		try{
// // 			const userSnap = await getDoc(userRef)
// // 			const submissionSnap = await getDoc(userSub)

// // 			if (userSnap.exists() && submissionSnap.exists()) {
// // 				const userData = userSnap.data()
// // 				const userSubData = submissionSnap.data()

// // 				if (userData.competition === 'SC') {
// // 					window.location.href = '../dashboard/smart-competition/delegates.html'
// // 				} else if (userData.competition === 'PODC') {
// // 					showAbsSubmission()
// // 					podcAdditionalSubmit.classList.remove('d-none')
// // 				}

// // 				const subData = submissionSnap.data()

// // 				storageCompetition = ref(preliminaryStorage, userData.competition)
// // 				finalStorageCompetition = ref(finalStorage, userData.competition)
// // 				userCompetition = userData.competition

// // 				// Handle Case File for Delegates
// // 				await handleCaseDownload(userData, userSubData)

// // 				// writeRoundStatus()
// // 				delegateTeamName.textContent = userData.team_name
// // 				teamName = userData.team_name

// // 				delCompetition.forEach(del => {
// // 					del.textContent = competitionName[userData.competition][0]
// // 				})

// // 				delegateUniv.textContent = userData.university
// // 				compeGuideBook.setAttribute("href", competitionName[userData.competition][1])
                                
// // 				writePaymentStatus(userData.final_pay_confirmed)
// // 				writeTeamMembersName(userData.leader, userData.members)

// // 				if (userData.have_pay) {
// // 					delegatePaymentStatus.classList.remove("d-none")
// // 				} else {
// // 					delegatePaymentStatus.classList.add("d-none")
// // 				}

// // 				// Show final status
// // 				showDelegatesFinalStatus(delFinalStatus, userSubData.final)
// // 				// Final Payment Form
// // 				if (userSubData.final) {
// // 					generateTeamEntry(userData.members.length, userData.members)
// // 					setupPaymentSchemeListener()
// // 					finalPaymentCont.classList.remove('d-none')
// // 					document.getElementById("nav-contact").querySelector("main").classList.remove("d-none")
// // 				} else {
// // 					finalPaymentCont.classList.add('d-none')
// // 					delegatePaymentStatus.classList.add("d-none")
// // 					document.getElementById("nav-contact").querySelector("main").classList.add("d-none")
// // 				}
// // 				// Hide if delegates already fully pay
// // 				await hideFullyPayFinalForm(userData)

// // 				// Write Alert Status
// // 				if (subData.sub_preliminary.status) {
// // 					changeAlertStatus(alertShowPrelim, true, false)
// // 					submissionFormStateHide(preliminaryForm, delegateSubmissionSummary, subData, false)
// // 				} else {
// // 					changeAlertStatus(alertShowPrelim, false, false)
// // 					submissionFormStateShow(preliminaryForm, delegateSubmissionSummary)
// // 				}

// // 				if (subData.sub_final.status) {
// // 					changeAlertStatus(alertShowFinal, true, true)
// // 					submissionFormStateHide(finalForm, delegateSubmissionSummaryFinal, subData, true)
// // 				} else {
// // 					changeAlertStatus(alertShowFinal, false, true)
// // 					submissionFormStateShow(finalForm, delegateSubmissionSummaryFinal)
// // 				}

// // 				// PODC ONLY
// // 				if (subData.sub_abstract !== undefined && subData.sub_abstract.status && userData.competition === 'PODC') {
// // 					summaryAbstractShowStatus(subData)	
// // 				}

// // 				if (subData.sub_final_model?.status) {
// // 					submissionFormStateHide(finalModelForm, delegateModelSubmissionSummaryFinal, subData, true)
// // 				} else {
// // 					submissionFormStateShow(finalModelForm, delegateModelSubmissionSummaryFinal)
// // 				}

// // 				if (subData.sub_final_ppt?.status) {
// // 					submissionFormStateHide(finalPPTForm, delegatePPTSubmissionSummaryFinal, subData, true)
// // 				} else {
// // 					submissionFormStateShow(finalPPTForm, delegatePPTSubmissionSummaryFinal)
// // 				}

// // 				// Determine Final Submit Status
// // 				// isFinalSubmitAllowed = await checkUserFinalSubmitStatus(userSub)

// // 			} else {
// // 				console.log("User tidak ditemukan")
// // 				window.location.href = '../login.html'
// // 			}
// // 		}catch(err){
// // 			console.log("Something wrong during fetching user data", err)
// // 			setToastAlert('danger', 'Something wrong during fetching user data.')
// // 		}
// // 	} else {
// // 		console.log("There is no user logged in")
// // 	}
// // }

// prototype 2

// import { doc, getDoc, updateDoc, serverTimestamp,collection, getDocs } from 'firebase/firestore'

// import { onAuthStateChanged, signOut } from 'firebase/auth'

// import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage'

// import { DB, AUTH, STORAGE } from './index.js'

// import { showProgressUI, setToastAlert } from '../static/js/alert.js'

// // =========================
// // AUTH STATE
// // =========================
// let currentUserID = null;

// onAuthStateChanged(AUTH, async (user) => {
//     if (!user) {
//         window.location.href = '../login.html';
//         return;
//     }

//     currentUserID = user.uid;
//     let userData = await fetchUserData();
//     let userCompetition = (userData.competitionRaw || "").toLowerCase();
//     let prelimStatus = (userData.prelimstats || null);
//     let PrelimOverdue = (userData.prelim_overdue || null);
//     let PrelimSubmittedAt = (userData.prelimSubmittedAt || null);
//     let PrelimFileURL = (userData.prelimFileURL || null);

//     loadPrelimCase(currentUserID);
//     setupGuidebook(userCompetition);
//     setupEditSubmission(prelimStatus);
//     submissionSummary(PrelimOverdue, PrelimSubmittedAt, PrelimFileURL);
// });



// // =========================
// // COMPETITION FULL NAME MAP
// // =========================
// const CompetitionFullName = {
//     "business case": "Business Case Competition",
//     "geothermal development plan": "Geothermal Development Plan Competition",
//     "paper and poster": "Paper and Poster Competition",
//     "oil rig design": "Oil Rig Design Competition",
//     "smart competition": "Smart Competition",
//     "mud inovation": "Mud Innovation Competition",
//     "plan of development": "Plan of Development Competition",
//     "well design": "Well Design Competition",
//     "hackaton": "Hackathon Competition"
// };

// // =========================
// // WA GROUP LINKS
// // =========================
// const WAGroup = {
//     "business case": "https://chat.whatsapp.com/LQIOCCbVfYhJaJyPl5w9XV?mode=wwt",
//     "geothermal development plan": "https://chat.whatsapp.com/GIELYdRnXdP09pVcgjqPiB?mode=wwt",
//     "paper and poster": "https://chat.whatsapp.com/Hew4NHXzrFgBM3C6QmBRkx?mode=wwt",
//     "oil rig design": "https://chat.whatsapp.com/EjGDGrF5ldGFDyLVoz50vO?mode=wwt",
//     "smart competition": "https://chat.whatsapp.com/H4ReXpGuRPHHuke5CUIWiu?mode=wwt",
//     "mud inovation": "https://chat.whatsapp.com/GIhNevsM6HW2xDUirbLGUo?mode=wwt",
//     "plan of development": "https://chat.whatsapp.com/DCYjX4rejsqLKZAdKVqeQi?mode=wwt",
//     "well design": "https://chat.whatsapp.com/L96OCbDm3sq7CvvbhNyz7U?mode=wwt",
//     "hackaton": "https://chat.whatsapp.com/BxMDdoC9aWG0MKx8cWZTqz?mode=wwt"
// };

// // =========================
// // FETCH USER DATA
// // =========================
// async function fetchUserData() {
//     if (!currentUserID) return;

//     try {
//         const docRef = doc(DB, "Team", currentUserID);
//         const snap = await getDoc(docRef);

//         if (!snap.exists()) {
//             console.error("Team data not found");
//             return;
//         }

//         const data = snap.data();

//         // TEAM LEADER
//         document.getElementById("Team-Leader").textContent =
//             `${data.leader.firstName} ${data.leader.lastName}`;

//         // TEAM NAME
//         document.getElementById("Team-Name").textContent =
//             data.teamName || "-";

//         // =========================
//         // COMPETITION (FULL NAME)
//         // =========================
//         const compKey = (data.competition || "").toLowerCase();
//         document.getElementById("Competition-Name").textContent =
//             CompetitionFullName[compKey] || data.competition || "-";

//         // =========================
//         // WA GROUP (DISABLED IF NOT VERIFIED)
//         // =========================
//         const waEl = document.getElementById("WhatsApp-Group");
//         const waLink = WAGroup[compKey] || "#";

//         if (data.payment_status?.toLowerCase() === "verified") {
//             // PAYMENT VERIFIED → LINK AKTIF
//             waEl.href = waLink;
//             waEl.textContent = "Join";
//             waEl.style.pointerEvents = "auto";
//             waEl.style.opacity = "1";
//         } else {
//             // PAYMENT NOT VERIFIED → LINK DISABLED
//             waEl.href = "javascript:void(0)";
//             waEl.textContent = "Your payment has not been verified";
//             waEl.style.pointerEvents = "none";  // Disable clicking
//             waEl.style.opacity = "0.5";         // Make it look disabled
//         }
//         // =========================
//         // MEMBERS LIST (FULL NAMES)
//         // =========================
//         const members = data.members || [];

//         if (members.length > 0) {
//             const names = members.map(m => `${m.firstName} ${m.lastName}`);
//             document.getElementById("Team-Member").textContent = names.join(", ");
//         } else {
//             document.getElementById("Team-Member").textContent = "-";
//         }

//         // PAYMENT STATUS
//         let paymentStatusText = data.payment_status === "verified" ? "Verified" : "Pending";
//         document.getElementById("Payment-Status").textContent =
//             paymentStatusText || "Not Submitted";
        
//      // applySubmissionLock expects `undefined` when not submitted
//         const prelimStatus = data.sub_preliminary === undefined ? undefined : data.sub_preliminary;
//         applySubmissionLock(prelimStatus);

//         let prelim_overdue = null;
//         if (prelimStatus && prelimStatus.overdue !== undefined) {
//             prelim_overdue = prelimStatus.overdue === "yes" ? "Overdue" : "On Time";
//         }

//         const prelimSubmittedAt = prelimStatus && prelimStatus.submittedAt ? prelimStatus.submittedAt : null;
//         const prelimFileURL = prelimStatus && prelimStatus.fileURL ? prelimStatus.fileURL : null;

//         return {
//             competitionRaw: data.competition || null,
//             paymentStatus: data.payment_status || null,
//             teamName: data.teamName || null,
//             prelimstats : prelimStatus || null,
//             prelim_overdue: prelim_overdue,
//             prelimSubmittedAt: prelimSubmittedAt,
//             prelimFileURL: prelimFileURL
//         };



//     } catch (err) {
//         console.error("Failed to fetch data:", err);
//     }
// }

// Write Final Payment Status
// function writePaymentStatus(status) {
// 	delegatePaymentStatus.innerHTML = ''

// 	if (status) {
// 		delegatePaymentStatus.innerHTML = `
// 			<div class="alert alert-success alert-dismissible fade show" role="alert">
// 				<h4 class="alert-heading">Confirmed</h4>
// 				<p>Your team final payment has been confirmed! <i class="bi bi-emoji-smile"></i></p>
// 				<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
// 				<hr>
//   				<p class="mb-0">Make sure your liaison officer has invited you to the finalist group.</p>
// 			</div>
// 		`
// 	} else {
// 		delegatePaymentStatus.innerHTML = `
// 			<div class="alert alert-warning" role="alert">
// 				<h4 class="alert-heading">Unconfirmed</h4>
// 				<p>Your team final payment has not been confirmed <i class="bi bi-emoji-frown"></i></p>
// 				<hr>
//   				<p class="mb-0">If within 24 hours the status has not changed, please contact us</p>
// 			</div>
// 		`
// 	}
// }

// function decomposeDelName(firstname, lastname) {
// 	return `${firstname} ${lastname}`
// }


// =====================================
// ELEMENTS
// =====================================
// let preliminaryForm = null;
// let prelimSubmitBtn = null;
// let premFileInput = null;
// let deleteFileBtnPrem = null;
// let delegateSubmissionSummary = null;
// let editFileBtnPrem = null;
// let delCasePrelimLink = null;

// // central init to run when DOM is ready
// function initDomBindings() {
//     preliminaryForm = document.getElementById("preliminary-form");
//     prelimSubmitBtn = document.getElementById("prelim-submit-btn");
//     premFileInput = preliminaryForm ? preliminaryForm.querySelector("input[name='preliminary-submit']") : null;
//     deleteFileBtnPrem = document.getElementById("delete-file-prem");
//     delegateSubmissionSummary = document.getElementById("del-submission-summary");
//     editFileBtnPrem = delegateSubmissionSummary ? delegateSubmissionSummary.querySelector("#del-edit-submission") : null;
//     delCasePrelimLink = document.getElementById("del-case-prelim-download");

//     // logout button (safe attach)
//     const logoutBtn = document.querySelector("#logout-btn");
//     if (logoutBtn) {
//         logoutBtn.addEventListener('click', () => {
//             signOut(AUTH).then(() => {
//                 console.log("log out btn clicked");
//                 window.location.href = '../login.html';
//             }).catch((err) => {
//                 console.log("Cannot loggin out user", err);
//             });
//         });
//     }

//     // safe delete file button
//     if (deleteFileBtnPrem && premFileInput) {
//         deleteFileBtnPrem.addEventListener("click", () => {
//             premFileInput.value = "";
//         });
//     }

//     // wire have-read checkbox handlers (moved here)
//     const haveReadCheckboxes = Array.from(document.querySelectorAll("input[type='checkbox']#have-read"));
//     console.log("initDomBindings: preliminaryForm =", preliminaryForm, "prelimSubmitBtn =", prelimSubmitBtn, "premFileInput =", premFileInput);

//     haveReadCheckboxes.forEach(cb => {
//         const form = cb.closest("form");
//         const submitBtn = form ? form.querySelector("button[type='submit'], input[type='submit']") : null;
//         if (submitBtn) {
//             submitBtn.disabled = true;
//             console.log("initDomBindings: submitBtn initially disabled for form", form?.id, "disabled =", submitBtn.disabled);
//         }

//         function updateSubmitState() {
//             console.log("updateSubmitState START:", {
//                 formId: form?.id,
//                 checkboxChecked: cb.checked,
//                 submitBtnDisabledBefore: submitBtn?.disabled
//             });

//             if (submitBtn) {
//                 submitBtn.disabled = !cb.checked;
//                 submitBtn.style.opacity = cb.checked ? "1" : "0.5";
//                 submitBtn.style.pointerEvents = cb.checked ? "auto" : "none"; // <- pastikan tombol tidak bisa diklik
//             }

//             if (cb.checkValidity && !cb.checked) {
//                 cb.classList.add("is-invalid");
//             } else {
//                 cb.classList.remove("is-invalid");
//             }

//             console.log("updateSubmitState END:", {
//                 formId: form?.id,
//                 checkboxChecked: cb.checked,
//                 submitBtnDisabledAfter: submitBtn?.disabled
//             });
//         }

//         cb.addEventListener("change", (e) => {
//             console.log("checkbox CHANGE event triggered for form", form?.id);
//             updateSubmitState();
//         });

//         cb.addEventListener("click", (e) => {
//             console.log("checkbox CLICK event triggered for form", form?.id);
//             setTimeout(updateSubmitState, 0);
//         });

//         updateSubmitState();
//     });
//     // attach preliminary form submit safely
//     if (preliminaryForm) {
//         preliminaryForm.addEventListener("submit", async (e) => {
//             e.preventDefault();

//             if (!isSubmissionOpen()) {
//                 alert("⚠️ Submission will open on December 1st, 2025 at 00:00.");
//                 return;
//             }

//             // guard button/input
//             if (!prelimSubmitBtn || prelimSubmitBtn.disabled) return;
//             if (!premFileInput) {
//                 alert("File input not found.");
//                 return;
//             }

//             prelimSubmitBtn.disabled = true;
//             const oldText = prelimSubmitBtn.innerText;
//             prelimSubmitBtn.innerText = "Processing...";

//             try {
//                 const file = premFileInput.files[0];
//                 if (!file) {
//                     alert("Please choose a file before submitting.");
//                     throw new Error("File is null");
//                 }

//                 const timeStamp = Date.now();
//                 const uploadPath = `preliminary_submissions/${file.name}_${timeStamp}`;
//                 const uploadRef = ref(STORAGE, uploadPath);
//                 const snap = await uploadBytes(uploadRef, file);
//                 const downloadURL = await getDownloadURL(snap.ref);

//                 await updateDoc(doc(DB, "Team", currentUserID), {
//                     sub_preliminary: {
//                         fileURL: downloadURL,
//                         submittedAt: serverTimestamp(),
//                         status: true,
//                         overdue: overdueStatus(),
//                     }
//                 });

//                 alert("✅ You're all set — submission complete!\n🔥 Keep up the fire!");
//                 location.reload();
//             } catch (err) {
//                 console.error(err);
//                 alert("Cannot upload file! Please contact committee.");
//             } finally {
//                 if (prelimSubmitBtn) {
//                     prelimSubmitBtn.disabled = false;
//                     prelimSubmitBtn.innerText = oldText || "Submit";
//                 }
//             }
//         });
//     }
// }

// // ensure init runs whether DOMContentLoaded already fired or not
// if (document.readyState === "loading") {
//     document.addEventListener("DOMContentLoaded", initDomBindings);
// } else {
//     initDomBindings();
// }


// // =====================================
// // DEADLINE CHECK
// // =====================================
// function overdueStatus() {
//     const deadline = new Date("Dec 22, 2025 00:00:00").getTime();
//     if (Date.now() > deadline) {
//         return "yes"
//     } else {
//         return "no"
//     }
// }

// // =====================================
// // SUBMISSION OPENING DATE
// // =====================================
// function isSubmissionOpen() {
//     const openDate = new Date("Nov 22, 2025 00:00:00").getTime();
//     return Date.now() >= openDate;
// }

// // =====================================
// // LOAD PRELIM CASE
// // =====================================
// export async function loadPrelimCase(currentUserID) {
//     try {
//         console.log("Starting loadPrelimCase...");
//         console.log("Current user ID:", currentUserID);

//         const teamRef = doc(DB, "Team", currentUserID);
//         const teamSnap = await getDoc(teamRef);

//         if (!teamSnap.exists()) {
//             console.log("Team doc not found");
//             return;
//         }

//         // Ambil nama competition dari Team
//         const rawCompetition = teamSnap.data().competition;
//         console.log("competition from Team:", rawCompetition);

//         const userCompetition = rawCompetition?.trim().toLowerCase();

//         if (!userCompetition) {
//             alert("Your competition data is missing!");
//             return;
//         }

//         if (!isSubmissionOpen()) {
//             console.log("Prelim case is still locked.");

//             if (delCasePrelimLink) {
//                 delCasePrelimLink.href = "javascript:void(0)";
//                 delCasePrelimLink.innerText = "Case Locked";

//                 delCasePrelimLink.style.color = "gray";
//                 delCasePrelimLink.style.pointerEvents = "auto";

//                 delCasePrelimLink.addEventListener("click", (e) => {
//                     e.preventDefault();
//                     alert("⚠️ The Preliminary Case is not yet accessible. It will be available for download on 30 November 2025");
//                 });
//             }

//             return; // stop di sini
//         }

//         console.log("✅ Prelim case unlocked — continuing load...");

//         console.log("Normalized user competition:", userCompetition);

//         // Ambil seluruh dokumen Information
//         const infoRef = collection(DB, "Information");
//         const infoSnap = await getDocs(infoRef);

//         console.log("Total documents in Information:", infoSnap.size);

//         if (infoSnap.empty) {
//             alert("⚠️ No case available yet!");
//             return;
//         }

//         // Loop dan cari yang nama kompetisinya cocok
//         let matchedCase = null;

//         infoSnap.forEach(docItem => {
//             const data = docItem.data();
//             const compName = data.competition_name?.trim().toLowerCase();

//             console.log("🔸 Checking:", compName);

//             if (compName === userCompetition) {
//                 console.log("✅ MATCH FOUND:", data);
//                 matchedCase = data;
//             }
//         });

//         // Tidak ditemukan case
//         if (!matchedCase) {
//             console.log("❌ No matched competition name in Information");

//             // Pastikan elemen ada
//             if (delCasePrelimLink) {
//                 // Hindari navigasi
//                 delCasePrelimLink.href = "javascript:void(0)";
//                 // Gunakan event listener yang jelas
//                 delCasePrelimLink.addEventListener("click", function (e) {
//                     e.preventDefault();
//                     alert("⚠️ Case is not available yet for your competition.");
//                 });

//                 // Tampilkan sebagai disabled/gray
//                 delCasePrelimLink.style.color = "gray";
//                 delCasePrelimLink.style.pointerEvents = "auto"; // biarkan klik supaya handler berjalan
//                 delCasePrelimLink.innerText = "Case Not Available";
//             } else {
//                 console.warn("#del-case-prelim-download element not found");
//             }

//             // KELUAR supaya kode di bawah yang memakai matchedCase tidak dieksekusi
//             return;
//         } else {
//             // Set link jika cocok
//             delCasePrelimLink.href = matchedCase.prelim_case_link;
//             delCasePrelimLink.innerText = "Download Case";
//             delCasePrelimLink.style.pointerEvents = "auto";
//             delCasePrelimLink.style.color = "#0dcaf0";

//             console.log("📎 Case link assigned:", matchedCase.prelim_case_link);
//         }
//     } catch (err) {
//         console.error("Error in loadPrelimCase:", err);	
//     }
// }

// // =====================================
// // COMPETITION GUIDEBOOK SETUP
// // =====================================

// const competitionGuideBookRaw = {
//     "business case": "https://drive.google.com/file/d/1GWaq2BPn5lWvV2VEGAKJyshy6z2T0OiS/view?usp=drive_link",
//     "geothermal development plan": "https://drive.google.com/file/d/1nHnoZvb8tnY8_J8kcFz-gvBDfjXkQUZg/view?usp=drive_link",
//     "mud inovation": "https://drive.google.com/file/d/1IqLtOQ4xacP-KRwr7EY8J1apluTo8fY6/view?usp=drive_link",
//     "oil rig design": "https://drive.google.com/file/d/16lSPng29RjoQm0dfZSU622DV-TnD37v4/view?usp=drive_link",
//     "paper and poster": "https://drive.google.com/file/d/1FCF1zc3ZNWW2vB8tq-p1VRZ0RhwforZM/view?usp=drive_link",
//     "plan of development": "https://drive.google.com/file/d/1kgsvhtzgEMB0ZC9UpvvayYFHejy3WKp8/view?usp=drive_link",
//     "smart competition": "https://drive.google.com/file/d/1vLVrzxBPd0zfIRw1qmLgk1RJMbBHd79s/view?usp=drive_link",
//     "well design": "https://drive.google.com/file/d/1U6tb3h5SVQAM3MDOlFs5DofSWPPRVykL/view?usp=drive_link",
//     "hackaton": "https://drive.google.com/file/d/17D-JtWdo7Nkv7j68kJx37cW-GHDmIzxY/view?usp=drive_link"
// };

// function setupGuidebook(userCompetition) {
//     console.log("setupGuidebook: lookup key =", userCompetition);

//     if (!userCompetition) {
//         console.warn("setupGuidebook: userCompetition kosong");
//         return;
//     }

//     const lookupKey = userCompetition;
//     const guidebookURL = competitionGuideBookRaw[lookupKey] || null;

//     console.log("setupGuidebook: found guidebook entry =", guidebookURL);

//     const guidebookAnchor = document.getElementById("competition-guide-book");

//     if (!guidebookAnchor) {
//         console.error("setupGuidebook: Elemen #competition-guide-book tidak ditemukan!");
//         return;
//     }

//     // ======================================================
//     // CASE: SUBMISSION BELUM OPEN → kasih alert saat diklik
//     // ======================================================
//     if (!isSubmissionOpen()) {
//         guidebookAnchor.href = "#"; // tidak membuka apa pun

//         guidebookAnchor.addEventListener("click", (e) => {
//             e.preventDefault();
//             alert("Guidebook can be accessed during the submission period.");
//         });

//         console.log("setupGuidebook: guidebook locked — alert mode aktif");
//         return;
//     }

//     // ======================================================
//     // CASE: SUBMISSION SUDAH OPEN → normal
//     // ======================================================
//     if (!guidebookURL) {
//         guidebookAnchor.href = "#";
//         guidebookAnchor.innerText = "Guidebook Not Available";
//         return;
//     }

//     // Normal mode
//     guidebookAnchor.href = guidebookURL;
//     guidebookAnchor.innerText = "Guide Book";
//     guidebookAnchor.classList.remove("disabled");

//     console.log("setupGuidebook: guidebook link applied");
// }

// // =====================================
// // SUBMISSION LOCKING
// // =====================================

// function applySubmissionLock(submissionData) {
//     const downloadCaseRow = document.querySelector(".row.my-2");
//     const formRow = document.querySelector("#preliminary-form")?.closest(".row");

//     if (submissionData !== undefined) {
//         prelimSubmitBtn.disabled = true;
//         prelimSubmitBtn.innerText = "Already Submitted";

//         // Hide "Download Case"
//         if (downloadCaseRow) downloadCaseRow.style.display = "none";

//         // Hide entire form block
//         if (formRow) formRow.style.display = "none";
//     } else {
//         // Normal (not submitted)
//         prelimSubmitBtn.disabled = false;
//         prelimSubmitBtn.innerText = "Submit";

//         if (downloadCaseRow) downloadCaseRow.style.display = "block";
//         if (formRow) formRow.style.display = "block";
//     }
// }


// // =====================================
// // EDIT SUBMISSION SETUP
// // =====================================
// function setupEditSubmission(prelimstats) {
//     // Nonactive for no submission
//     if (!prelimstats) {
//         const editBtn = document.getElementById("del-edit-submission");
//         if (editBtn) editBtn.style.display = "none";
//         return;
//     }
// }

// // Edit submission button handler
// document.addEventListener("DOMContentLoaded", () => {

//     editFileBtnPrem.addEventListener("click", () => {
//         const editModal = new bootstrap.Modal(document.getElementById("editConfirmModal"));
//         editModal.show();
//     });

//     document.getElementById("confirmEditBtn").addEventListener("click", () => {
//         unlockSubmissionForm();

//         document.getElementById("del-edit-submission").style.display = "none";

//         const modalInstance = bootstrap.Modal.getInstance(
//             document.getElementById("editConfirmModal")
//         );
//         modalInstance.hide();
//     });

// });

// function unlockSubmissionForm() {

//     applySubmissionLock(undefined);
//     const downloadCaseRow = document.querySelector(".row.my-2");
//     const formRow = document.querySelector("#preliminary-form")?.closest(".row");

//     // Show everything again
//     if (downloadCaseRow) downloadCaseRow.style.display = "block";
//     if (formRow) formRow.style.display = "block";

//     // Restore inner form elements
//     preliminaryForm.querySelectorAll("*").forEach(el => {
//         el.style.display = ""; 
//     });

//     // Restore submit button
//     prelimSubmitBtn.disabled = false;
//     prelimSubmitBtn.innerText = "Submit";
// }


// function submissionSummary (PrelimOverdue, PrelimSubmittedAt, PrelimFileURL) {
//     if (!delegateSubmissionSummary) return;

//     const delLastSubmission = delegateSubmissionSummary.querySelector("#file-time-sub");
//     const delSubmissionStatus = delegateSubmissionSummary.querySelector("#file-time-status");
//     const delFileURL = delegateSubmissionSummary.querySelector("#file-url");

//     // submittedAt may be a Firestore Timestamp or a Date or null
//     let submittedText = "No submission yet";
//     if (PrelimSubmittedAt) {
//         try {
//             const dt = typeof PrelimSubmittedAt.toDate === "function"
//                 ? PrelimSubmittedAt.toDate()
//                 : new Date(PrelimSubmittedAt);
//             submittedText = isNaN(dt) ? "No submission yet" : dt.toLocaleString();
//         } catch {
//             submittedText = "No submission yet";
//         }
//     }
//     if (delLastSubmission) delLastSubmission.textContent = submittedText;
//     if (delSubmissionStatus) delSubmissionStatus.textContent = PrelimOverdue || "No submission yet";

//     if (delFileURL) {
//         if (PrelimFileURL) {
//             delFileURL.innerHTML = `<a href="${PrelimFileURL}" target="_blank" class="text-primary text-decoration-underline">Open File</a>`;
//         } else {
//             delFileURL.textContent = "No file uploaded";
//         }
//     }
// }







