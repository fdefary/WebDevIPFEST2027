import { doc, getDoc, updateDoc, serverTimestamp,collection, getDocs, setDoc,where,query } from 'firebase/firestore'

import { onAuthStateChanged, signOut } from 'firebase/auth'

import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage'

import { DB, AUTH, STORAGE } from './index.js'

import { showProgressUI, setToastAlert } from '../static/js/alert.js'


// =========================
// AUTH STATE
// =========================
let currentUserID = null;

onAuthStateChanged(AUTH, async (user) => {
    if (!user) {
        window.location.href = '../login.html';
        return;
    }

    currentUserID = user.uid;
    
    // Ambil data user
    let userData = await fetchUserData();

    // PENTING: Cek jika userData gagal diambil (undefined/null) agar tidak error lanjutannya
    if (!userData) {
        console.error("User data could not be loaded.");
        return;
    }

    let userCompetition = (userData.userCompetition || null);
    let paymentStatus = (userData.paymentStatus || null);
    let prelimStatus = (userData.prelimstats || null);
    let PrelimOverdue = (userData.prelim_overdue || null);
    let PrelimSubmittedAt = (userData.prelimSubmittedAt || null);
    let PrelimFileURL = (userData.prelimFileURL || null);
    let finalPaymentStatus = (userData.finalPaymentStatus || null);
    let finalstatus = (userData.finalstatus ?? null);
    let finalsubstatus = (userData.finalsubstatus ?? null);
    let finalsubfileURL = (userData.finalsubfileURL ?? null);
    let finalsubsubmittedAt = (userData.finalsubsubmittedAt ?? null);
    let finalsubmissionoverdue = (userData.finalsubmissionoverdue ?? null);

    // Pastikan fungsi-fungsi ini ada di kode Anda sebelumnya
    if (typeof loadPrelimCase === 'function') loadPrelimCase(currentUserID, paymentStatus);
    if (typeof setupGuidebook === 'function') setupGuidebook(userCompetition);
    if (typeof setupEditSubmission === 'function') setupEditSubmission(prelimStatus);
    if (typeof submissionSummary === 'function') submissionSummary(PrelimOverdue, PrelimSubmittedAt, PrelimFileURL);
    if (typeof setupPrelimTab === 'function') setupPrelimTab(paymentStatus);
    if (typeof setupFinalTab === 'function') setupFinalTab(finalPaymentStatus);
    
    // Panggil setupFinalRoundLink yang sudah diperbaiki sebelumnya
    setupFinalRoundLink(finalstatus, currentUserID, finalPaymentStatus, userCompetition);
    
    if (typeof checkSubmissionStatus === 'function') checkSubmissionStatus(finalsubstatus, finalsubfileURL, finalsubsubmittedAt, finalsubmissionoverdue);
});

async function fetchUserData() {
    if (!currentUserID) return null;

    try {
        const docRef = doc(DB, "Team", currentUserID);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            console.error("Team data not found");
            return null;
        }

        const data = snap.data();

        // --- FUNGSI BANTUAN AGAR TIDAK ERROR JIKA ID HTML TIDAK ADA ---
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        // 1. UPDATE UI (Dengan Safety Check)
        // TEAM LEADER
        setText("Team-Leader", `${data.leader.firstName} ${data.leader.lastName}`);

        // TEAM NAME
        setText("Team-Name", data.teamName || "-");

        // COMPETITION
        const compKey = (data.competition || "").toLowerCase();
        // Pastikan CompetitionFullName ada, jika tidak pakai data.competition
        const compName = (typeof CompetitionFullName !== 'undefined' && CompetitionFullName[compKey]) 
                         ? CompetitionFullName[compKey] 
                         : (data.competition || "-");
        setText("Competition-Name", compName);

        // WA GROUP
        const waEl = document.getElementById("WhatsApp-Group");
        if (waEl) {
            const waLink = (typeof WAGroup !== 'undefined' && WAGroup[compKey]) ? WAGroup[compKey] : "#";
            if (data.payment_status?.toLowerCase() === "verified") {
                waEl.href = waLink;
                waEl.textContent = "Join";
                waEl.style.pointerEvents = "auto";
                waEl.style.opacity = "1";
            } else {
                waEl.href = "javascript:void(0)";
                waEl.textContent = "Your payment has not been verified";
                waEl.style.pointerEvents = "none";
                waEl.style.opacity = "0.5";
            }
        }

        // MEMBERS LIST
        const members = data.members || [];
        if (members.length > 0) {
            const names = members.map(m => `${m.firstName} ${m.lastName}`);
            setText("Team-Member", names.join(", "));
        } else {
            setText("Team-Member", "-");
        }

        // PAYMENT STATUS
        let paymentStatusText = data.payment_status === "verified" ? "Verified" : "Pending";
        setText("Payment-Status", paymentStatusText || "Not Submitted");

        // APPLY LOCK
        const prelimStatus = data.sub_preliminary === undefined ? undefined : data.sub_preliminary;
        if (typeof applySubmissionLock === 'function') applySubmissionLock(prelimStatus);

        // PRELIM DATA
        let prelim_overdue = null;
        if (prelimStatus && prelimStatus.overdue !== undefined) {
            prelim_overdue = prelimStatus.overdue === "yes" ? "Overdue" : "On Time";
        }
        const prelimSubmittedAt = prelimStatus && prelimStatus.submittedAt ? prelimStatus.submittedAt : null;
        const prelimFileURL = prelimStatus && prelimStatus.fileURL ? prelimStatus.fileURL : null;
        const prelimRank = prelimStatus?.rank ?? "-";
        
        setText("Preliminary-Rank", prelimRank);

        // FINAL STATUS
        const finalstatus = prelimStatus?.final ?? "-";
        const finalData = data.final_reg || {};
        const finalPaymentStatus = finalData.paymentStatus || null;

        let finalStatusText = "Not Paid";
        if (finalPaymentStatus === "pending") finalStatusText = "Pending";
        else if (finalPaymentStatus === "down_payment_verified") finalStatusText = "Down Payment Verified";
        else if (finalPaymentStatus === "verified") finalStatusText = "Verified";

        setText("Final-Payment-Status", finalStatusText);

        // FINAL SUB DATA
        const finalsub = data.sub_final || {};
        const finalsubstatus = finalsub.status || null;
        const finalsubfileURL = finalsub.fileURL || null;
        const finalsubsubmittedAt = finalsub.submittedAt || null;
        const finalsubmissionoverdue = finalsub.overdue || null;

        // 2. RETURN DATA (PENTING: Return object meskipun UI error sebagian)
        return {
            userCompetition: data.competition || null,
            paymentStatus: data.payment_status || null,
            teamName: data.teamName || null,
            prelimstats: prelimStatus || null,
            prelim_overdue: prelim_overdue,
            prelimSubmittedAt: prelimSubmittedAt,
            prelimFileURL: prelimFileURL,
            finalPaymentStatus: finalPaymentStatus || null,
            finalstatus: finalstatus ?? null,
            finalsubstatus: finalsubstatus ?? null,
            finalsubfileURL: finalsubfileURL ?? null,
            finalsubsubmittedAt: finalsubsubmittedAt ?? null,
            finalsubmissionoverdue: finalsubmissionoverdue ?? null
        };

    } catch (err) {
        console.error("Failed to fetch data:", err);
        return null; // Return null jika error parah
    }
}


// =========================
// COMPETITION FULL NAME MAP
// =========================
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

// =========================
// WA GROUP LINKS
// =========================
const WAGroup = {
	"business case": "https://chat.whatsapp.com/LQIOCCbVfYhJaJyPl5w9XV?mode=wwt",
	"geothermal development plan": "https://chat.whatsapp.com/GIELYdRnXdP09pVcgjqPiB?mode=wwt",
	"paper and poster": "https://chat.whatsapp.com/Hew4NHXzrFgBM3C6QmBRkx?mode=wwt",
	"oil rig design": "https://chat.whatsapp.com/EjGDGrF5ldGFDyLVoz50vO?mode=wwt",
	"smart competition": "https://chat.whatsapp.com/H4ReXpGuRPHHuke5CUIWiu?mode=wwt",
	"mud inovation": "https://chat.whatsapp.com/GIhNevsM6HW2xDUirbLGUo?mode=wwt",
	"plan of development": "https://chat.whatsapp.com/DCYjX4rejsqLKZAdKVqeQi?mode=wwt",
	"well design": "https://chat.whatsapp.com/L96OCbDm3sq7CvvbhNyz7U?mode=wwt",
	"hackaton": "https://chat.whatsapp.com/BxMDdoC9aWG0MKx8cWZTqz?mode=wwt"
};

// =========================
// FETCH USER DATA
// =========================
// async function fetchUserData() {
// 	if (!currentUserID) return;

// 	try {
// 		const docRef = doc(DB, "Team", currentUserID);
// 		const snap = await getDoc(docRef);

// 		if (!snap.exists()) {
// 			console.error("Team data not found");
// 			return;
// 		}

// 		const data = snap.data();

// 		// TEAM LEADER
// 		document.getElementById("Team-Leader").textContent =
// 			`${data.leader.firstName} ${data.leader.lastName}`;

// 		// TEAM NAME
// 		document.getElementById("Team-Name").textContent =
// 			data.teamName || "-";

// 		// =========================
// 		// COMPETITION (FULL NAME)
// 		// =========================
// 		const compKey = (data.competition || "").toLowerCase();
// 		document.getElementById("Competition-Name").textContent =
// 			CompetitionFullName[compKey] || data.competition || "-";

// 		// =========================
// 		// WA GROUP (DISABLED IF NOT VERIFIED)
// 		// =========================
// 		const waEl = document.getElementById("WhatsApp-Group");
// 		const waLink = WAGroup[compKey] || "#";

// 		if (data.payment_status?.toLowerCase() === "verified") {
// 			// PAYMENT VERIFIED → LINK AKTIF
// 			waEl.href = waLink;
// 			waEl.textContent = "Join";
// 			waEl.style.pointerEvents = "auto";
// 			waEl.style.opacity = "1";
// 		} else {
// 			// PAYMENT NOT VERIFIED → LINK DISABLED
// 			waEl.href = "javascript:void(0)";
// 			waEl.textContent = "Your payment has not been verified";
// 			waEl.style.pointerEvents = "none";  // Disable clicking
// 			waEl.style.opacity = "0.5";         // Make it look disabled
// 		}
// 		// =========================
// 		// MEMBERS LIST (FULL NAMES)
// 		// =========================
// 		const members = data.members || [];

// 		if (members.length > 0) {
// 			const names = members.map(m => `${m.firstName} ${m.lastName}`);
// 			document.getElementById("Team-Member").textContent = names.join(", ");
// 		} else {
// 			document.getElementById("Team-Member").textContent = "-";
// 		}

// 		// PAYMENT STATUS
// 		let paymentStatusText = data.payment_status === "verified" ? "Verified" : "Pending";
// 		document.getElementById("Payment-Status").textContent =
// 			paymentStatusText || "Not Submitted";
        
//      // applySubmissionLock expects `undefined` when not submitted
//         const prelimStatus = data.sub_preliminary === undefined ? undefined : data.sub_preliminary;
//         applySubmissionLock(prelimStatus);

//         let prelim_overdue = null;
//         if (prelimStatus && prelimStatus.overdue !== undefined) {
//             prelim_overdue = prelimStatus.overdue === "yes" ? "Overdue" : "On Time";
//         }

//         const prelimSubmittedAt = prelimStatus && prelimStatus.submittedAt ? prelimStatus.submittedAt : null;
//         const prelimFileURL = prelimStatus && prelimStatus.fileURL ? prelimStatus.fileURL : null;

// 		const prelimRank = prelimStatus.rank ?? "-";
// 		document.getElementById("Preliminary-Rank").textContent = prelimRank;

//         const finalstatus = prelimStatus.final ?? "-";

//         const finalData = data.final_reg || {};
// 		const finalPaymentStatus = finalData.paymentStatus || null;

//         let finalStatusText = "Not Paid"; // default jika null
// 		if (finalPaymentStatus === "pending") finalStatusText = "Pending";
// 		else if (finalPaymentStatus === "down_payment_verified") finalStatusText = "Down Payment Verified";
// 		else if (finalPaymentStatus === "verified") {
//             finalStatusText = "Verified"; 
//         }

// 		document.getElementById("Final-Payment-Status").textContent = finalStatusText;

//         const finalsub =data.sub_final || {};
//         const finalsubstatus = finalsub.status || null;
//         const finalsubfileURL = finalsub.fileURL || null;
//         const finalsubsubmittedAt = finalsub.submittedAt || null;
//         const finalsubmissionoverdue = finalsub.overdue || null;

//         return {
//             userCompetition: data.competition || null,
//             paymentStatus: data.payment_status || null,
//             teamName: data.teamName || null,
//             prelimstats : prelimStatus || null,
//             prelim_overdue: prelim_overdue,
//             prelimSubmittedAt: prelimSubmittedAt,
//             prelimFileURL: prelimFileURL,
//             finalPaymentStatus : finalPaymentStatus || null,
//             finalstatus : finalstatus?? null,
//             finalsubstatus : finalsubstatus?? null,
//             finalsubfileURL : finalsubfileURL?? null,
//             finalsubsubmittedAt : finalsubsubmittedAt?? null,
//             finalsubmissionoverdue : finalsubmissionoverdue?? null
//         };



// 	} catch (err) {
// 		console.error("Failed to fetch data:", err);
// 	}
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
let preliminaryForm = null;
let prelimSubmitBtn = null;
let premFileInput = null;
let deleteFileBtnPrem = null;
let delegateSubmissionSummary = null;
let editFileBtnPrem = null;
let delCasePrelimLink = null;
let finalForm = null;
let finalSubmitBtn = null;
let finalFileInput = null;
let deleteFileBtnFinal = null;
let uploadProgressContainer = null;
let uploadProgress = null;
let uploadStatus = null;
let currentUploadedSize = null;
let totalUploadSize = null;
let cancelFileUpload = null;

// central init to run when DOM is ready
function initDomBindings() {
    preliminaryForm = document.getElementById("preliminary-form");
    prelimSubmitBtn = document.getElementById("prelim-submit-btn");
    premFileInput = preliminaryForm ? preliminaryForm.querySelector("input[name='preliminary-submit']") : null;
    deleteFileBtnPrem = document.getElementById("delete-file-prem");
    delegateSubmissionSummary = document.getElementById("del-submission-summary");
    editFileBtnPrem = delegateSubmissionSummary ? delegateSubmissionSummary.querySelector("#del-edit-submission") : null;
    delCasePrelimLink = document.getElementById("del-case-prelim-download");

    // logout button (safe attach)
    const logoutBtn = document.querySelector("#logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(AUTH).then(() => {
                console.log("log out btn clicked");
                window.location.href = '../login.html';
            }).catch((err) => {
                console.log("Cannot loggin out user", err);
            });
        });
    }

    // safe delete file button
    if (deleteFileBtnPrem && premFileInput) {
        deleteFileBtnPrem.addEventListener("click", () => {
            premFileInput.value = "";
        });
    }

    // final form bindings
    finalForm = document.getElementById("final-form");
    finalSubmitBtn = document.getElementById("final-submit-btn");
    finalFileInput = finalForm ? finalForm.querySelector("input[name='final-submit']") : null;
    deleteFileBtnFinal = document.getElementById("delete-file-final");
    uploadProgressContainer = document.getElementById("upload-progress-container");
    uploadProgress = document.getElementById("upload-progress");
    uploadStatus = document.getElementById("upload-status");
    currentUploadedSize = document.getElementById("current-uploaded-size");
    totalUploadSize = document.getElementById("total-size");
    cancelFileUpload = document.getElementById("cancel-file-upload");

    if (deleteFileBtnFinal && finalFileInput) {
        deleteFileBtnFinal.addEventListener("click", () => { finalFileInput.value = ""; });
    }

    if (finalForm) {
        finalForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!finalSubmitBtn || finalSubmitBtn.disabled) return;

            if (!finalForm.checkValidity()) {
                alert("Please fill the form correctly!");
                return;
            }

            if (!currentUserID) {
                alert("User not authenticated");
                return;
            }

            try {
                let teamRef = doc(DB, "Team", currentUserID);
                let teamSnap = await getDoc(teamRef);
                if (!teamSnap.exists()) {
                    console.warn('Team doc by UID not found, attempting fallback search by user email');
                    const firebaseUser = AUTH.currentUser;
                    const userEmail = firebaseUser?.email || null;
                    if (!userEmail) {
                        alert('Team data not found (no email available). Please contact support.');
                        return;
                    }

                    // Fallback: search Team collection for matching leader or member email
                    const allTeamsSnap = await getDocs(collection(DB, 'Team'));
                    let found = null;
                    allTeamsSnap.forEach(d => {
                        const data = d.data();
                        if (!data) return;
                        const leaderEmail = data.leader?.email?.toLowerCase();
                        if (leaderEmail === userEmail.toLowerCase()) {
                            found = { id: d.id, data };
                            return;
                        }
                        const members = data.members || [];
                        for (let m of members) {
                            if (m.email && m.email.toLowerCase() === userEmail.toLowerCase()) {
                                found = { id: d.id, data };
                                return;
                            }
                        }
                    });

                    if (!found) {
                        alert('Team data not found. Please contact committee.');
                        return;
                    }

                    teamRef = doc(DB, 'Team', found.id);
                    teamSnap = await getDoc(teamRef);
                    console.log('Fallback found team doc:', found.id);
                }

                const existingFinal = teamSnap.data().sub_final;
                if (existingFinal && existingFinal.status === true) {
                    alert("⚠️ Submission can only be done once!");
                    return;
                }

                const file = finalFileInput?.files[0];
                if (!file) {
                    alert("Please select a file to submit.");
                    return;
                }

                // Enforce .zip only
                const isZip = file.name && file.name.toLowerCase().endsWith('.zip');
                if (!isZip) {
                    alert('Please upload a .zip file only.');
                    return;
                }

                // show progress UI
                if (uploadProgressContainer) uploadProgressContainer.classList.remove('d-none');
                finalSubmitBtn.disabled = true;

                const timeStamp = Date.now();
                const uploadPath = `final_submissions/${currentUserID}/${timeStamp}_${file.name}`;
                const uploadRef = ref(STORAGE, uploadPath);
                const uploadTask = uploadBytesResumable(uploadRef, file);

                const cancelUpload = () => {
                    try { uploadTask.cancel(); } catch (err) {}
                    finalSubmitBtn.disabled = false;
                    if (uploadProgressContainer) uploadProgressContainer.classList.add('d-none');
                };

                if (cancelFileUpload) cancelFileUpload.addEventListener('click', cancelUpload, { once: true });

                uploadTask.on('state_changed', (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    showProgressUI(progress, uploadProgress, currentUploadedSize, totalUploadSize, snapshot.totalBytes);
                }, (err) => {
                    console.error('Upload error:', err);
                    let userMsg = 'Upload failed. Please try again.';
                    if (err && err.code) {
                        switch (err.code) {
                            case 'storage/unauthorized':
                                userMsg = 'Upload failed: permission denied. Please check Firebase storage rules.';
                                break;
                            case 'storage/canceled':
                                userMsg = 'Upload canceled.';
                                break;
                            case 'storage/quota-exceeded':
                                userMsg = 'Upload failed: storage quota exceeded.';
                                break;
                            case 'storage/retry-limit-exceeded':
                                userMsg = 'Upload failed due to network timeout. Please try again on a stable connection.';
                                break;
                            case 'storage/unknown':
                            default:
                                userMsg = `Upload failed (${err.code}): ${err.message || 'Unknown error'}`;
                                break;
                        }
                    } else if (err && err.message) {
                        userMsg = `Upload failed: ${err.message}`;
                    }

                    alert(userMsg);
                    cancelUpload();
                }, async () => {
                    try {
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        // simple overdue check (can be customized per competition)
                        const overdue = Date.now() > new Date('Feb 5, 2026 00:00:00').getTime() ? 'yes' : 'no';
                        await updateDoc(teamRef, {
                            sub_final: {
                                fileURL: url,
                                submittedAt: serverTimestamp(),
                                status: true,
                                overdue: overdue
                            }
                        });
                        alert('✅ Submission successful — thank you!');
                        location.reload();
                    } catch (err) {
                        console.error(err);
                        alert('Failed saving submission. Please contact committee.');
                        finalSubmitBtn.disabled = false;
                    } finally {
                        if (uploadProgressContainer) uploadProgressContainer.classList.add('d-none');
                    }
                });

            } catch (err) {
                console.error(err);
                alert('An error occurred. Please try again.');
                if (finalSubmitBtn) finalSubmitBtn.disabled = false;
                if (uploadProgressContainer) uploadProgressContainer.classList.add('d-none');
            }
        });
    }

    // wire have-read checkbox handlers (moved here)
    const haveReadCheckboxes = Array.from(document.querySelectorAll("input[type='checkbox']#have-read"));
    console.log("initDomBindings: preliminaryForm =", preliminaryForm, "prelimSubmitBtn =", prelimSubmitBtn, "premFileInput =", premFileInput);

    haveReadCheckboxes.forEach(cb => {
        const form = cb.closest("form");
        const submitBtn = form ? form.querySelector("button[type='submit'], input[type='submit']") : null;
        if (submitBtn) {
            submitBtn.disabled = true;
            console.log("initDomBindings: submitBtn initially disabled for form", form?.id, "disabled =", submitBtn.disabled);
        }

        function updateSubmitState() {
            console.log("updateSubmitState START:", {
                formId: form?.id,
                checkboxChecked: cb.checked,
                submitBtnDisabledBefore: submitBtn?.disabled
            });

            if (submitBtn) {
                submitBtn.disabled = !cb.checked;
                submitBtn.style.opacity = cb.checked ? "1" : "0.5";
                submitBtn.style.pointerEvents = cb.checked ? "auto" : "none"; // <- pastikan tombol tidak bisa diklik
            }

            if (cb.checkValidity && !cb.checked) {
                cb.classList.add("is-invalid");
            } else {
                cb.classList.remove("is-invalid");
            }

            console.log("updateSubmitState END:", {
                formId: form?.id,
                checkboxChecked: cb.checked,
                submitBtnDisabledAfter: submitBtn?.disabled
            });
        }

        cb.addEventListener("change", (e) => {
            console.log("checkbox CHANGE event triggered for form", form?.id);
            updateSubmitState();
        });

        cb.addEventListener("click", (e) => {
            console.log("checkbox CLICK event triggered for form", form?.id);
            setTimeout(updateSubmitState, 0);
        });

        updateSubmitState();
    });
    // attach preliminary form submit safely
    if (preliminaryForm) {
        preliminaryForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!isSubmissionOpen()) {
                alert("⚠️ Submission will open on 30 November 2025\nPlease wait until then!");
                return;
            }

            // guard button/input
            if (!prelimSubmitBtn || prelimSubmitBtn.disabled) return;
            if (!premFileInput) {
                alert("File input not found.");
                return;
            }

            prelimSubmitBtn.disabled = true;
            const oldText = prelimSubmitBtn.innerText;
            prelimSubmitBtn.innerText = "Processing...";

            try {
                const file = premFileInput.files[0];
                if (!file) {
                    alert("Please choose a file before submitting.");
                    throw new Error("File is null");
                }

                const timeStamp = Date.now();
                const uploadPath = `preliminary_submissions/${file.name}_${timeStamp}`;
                const uploadRef = ref(STORAGE, uploadPath);
                const snap = await uploadBytes(uploadRef, file);
                const downloadURL = await getDownloadURL(snap.ref);

                await updateDoc(doc(DB, "Team", currentUserID), {
                    sub_preliminary: {
                        fileURL: downloadURL,
                        submittedAt: serverTimestamp(),
                        status: true,
                        overdue: overdueStatus(),
                    }
                });

                alert("✅ You're all set — submission complete!\n🔥 Keep up the fire!");
                location.reload();
            } catch (err) {
                console.error(err);
                alert("Cannot upload file! Please contact committee.");
            } finally {
                if (prelimSubmitBtn) {
                    prelimSubmitBtn.disabled = false;
                    prelimSubmitBtn.innerText = oldText || "Submit";
                }
            }
        });
    }
}

// ensure init runs whether DOMContentLoaded already fired or not
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDomBindings);
} else {
    initDomBindings();
}


// =====================================
// DEADLINE CHECK
// =====================================
function overdueStatus() {
    const deadline = new Date("Dec 22, 2025 00:00:00").getTime();
    if (Date.now() > deadline) {
        return "yes"
    } else {
        return "no"
    }
}

// =====================================
// SUBMISSION OPENING DATE
// =====================================
function isSubmissionOpen() {
    const openDate = new Date("Nov 30, 2025 00:00:00").getTime();
    return Date.now() >= openDate;
}

// =====================================
// Verified Status Check
// =====================================


function setupPrelimTab(paymentStatus) {
    const prelimTab = document.getElementById("nav-profile-tab");

    if (paymentStatus !== "verified") {
  
        prelimTab.removeAttribute("data-bs-toggle");

        prelimTab.addEventListener("click", function (e) {
            e.preventDefault();
            alert("⚠️ Your payment has not been verified. Please complete the payment to access the Preliminary Case.");
        });

    } else {
 
        prelimTab.setAttribute("data-bs-toggle", "tab");
    }
}

// =====================================
// LOAD PRELIM CASE
// =====================================
export async function loadPrelimCase(currentUserID) {
    try {
        console.log("Starting loadPrelimCase...");
        console.log("Current user ID:", currentUserID);

        const teamRef = doc(DB, "Team", currentUserID);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
            console.log("Team doc not found");
            return;
        }
        // Ambil nama competition dari Team
        const rawCompetition = teamSnap.data().competition;
        console.log("competition from Team:", rawCompetition);

        const userCompetition = rawCompetition?.trim().toLowerCase();

        if (!userCompetition) {
            alert("Your competition data is missing!");
            return;
        }

        if (!isSubmissionOpen()) {
            console.log("Prelim case is still locked.");

            if (delCasePrelimLink) {
                delCasePrelimLink.href = "javascript:void(0)";
                delCasePrelimLink.innerText = "Case Locked";

                delCasePrelimLink.style.color = "gray";
                delCasePrelimLink.style.pointerEvents = "auto";

                delCasePrelimLink.addEventListener("click", (e) => {
                    e.preventDefault();
                    alert("⚠️ The Preliminary Case is not yet accessible. It will be available for download on 30 November 2025");
                });
            }

            return; // stop di sini
        }

        console.log("✅ Prelim case unlocked — continuing load...");

        console.log("Normalized user competition:", userCompetition);

        // Ambil seluruh dokumen Information
        const infoRef = collection(DB, "Information");
        const infoSnap = await getDocs(infoRef);

        console.log("Total documents in Information:", infoSnap.size);

        if (infoSnap.empty) {
            alert("⚠️ No case available yet!");
            return;
        }

        // Loop dan cari yang nama kompetisinya cocok
        let matchedCase = null;

        infoSnap.forEach(docItem => {
            const data = docItem.data();
            const compName = data.competition_name?.trim().toLowerCase();

            console.log("🔸 Checking:", compName);

            if (compName === userCompetition) {
                console.log("✅ MATCH FOUND:", data);
                matchedCase = data;
            }
        });

        // Tidak ditemukan case
        if (!matchedCase) {
            console.log("❌ No matched competition name in Information");

            // Pastikan elemen ada
            if (delCasePrelimLink) {
                // Hindari navigasi
                delCasePrelimLink.href = "javascript:void(0)";
                // Gunakan event listener yang jelas
                delCasePrelimLink.addEventListener("click", function (e) {
                    e.preventDefault();
                    alert("⚠️ Case is not available yet for your competition.");
                });

                // Tampilkan sebagai disabled/gray
                delCasePrelimLink.style.color = "gray";
                delCasePrelimLink.style.pointerEvents = "auto"; // biarkan klik supaya handler berjalan
                delCasePrelimLink.innerText = "Case Not Available";
            } else {
                console.warn("#del-case-prelim-download element not found");
            }

            // KELUAR supaya kode di bawah yang memakai matchedCase tidak dieksekusi
            return;
        } else {
            // Set link jika cocok
            delCasePrelimLink.href = matchedCase.prelim_case_link;
            delCasePrelimLink.innerText = "Download Case";
            delCasePrelimLink.style.pointerEvents = "auto";
            delCasePrelimLink.style.color = "#0dcaf0";

            console.log("📎 Case link assigned:", matchedCase.prelim_case_link);

            // --- FINAL CASE LINK ---
            try {
                const delCaseFinalLink = document.getElementById("del-case-final-download");
                if (delCaseFinalLink) {
                    // try multiple shapes for stored final link
                    const finalCaseUrl = matchedCase.final_case_link || (matchedCase.final && (matchedCase.final.case_link || matchedCase.final.final_case_link)) || null;
                    if (finalCaseUrl) {
                        delCaseFinalLink.href = finalCaseUrl;
                        delCaseFinalLink.innerText = "Download Case";
                        delCaseFinalLink.style.pointerEvents = "auto";
                        delCaseFinalLink.style.color = "#0dcaf0";
                    } else {
                        delCaseFinalLink.href = "javascript:void(0)";
                        delCaseFinalLink.innerText = "Case Not Available";
                        delCaseFinalLink.style.color = "gray";
                        delCaseFinalLink.addEventListener("click", (e) => {
                            e.preventDefault();
                            alert("⚠️ Final case is not available yet for your competition.");
                        });
                    }
                }
            } catch (err) {
                console.error("Error assigning final case link:", err);
            }
        }
	} catch (err) {
		console.error("Error in loadPrelimCase:", err);	
	}
}

// =====================================
// COMPETITION GUIDEBOOK SETUP
// =====================================

const competitionGuideBookRaw = {
    "business case": "https://drive.google.com/drive/folders/1eG9MgKhfW0E_aQrsW14aN29GLMXDGfCm?usp=drive_link",
    "geothermal development plan": "https://drive.google.com/drive/folders/12m5cj1cZVBADe5EpgcRTrieLi4n7s8Sx?usp=drive_link",
    "mud inovation": "https://drive.google.com/drive/folders/1noM7qGBFAVzUF6rX-tw8SJtLKZur0oxy?usp=drive_link",
    "oil rig design": "https://drive.google.com/drive/folders/11cJQVMsE95aGnZRe_N5PZ-tfmHcoA15V?usp=drive_link",
    "paper and poster": "https://drive.google.com/drive/folders/17P023GNrW9ksEgIVyvJ7_N459IV-u0jw?usp=drive_link",
    "plan of development": "https://drive.google.com/drive/folders/1BPNsjzrBkBcNTNhe8sp68B_RfZTy20Ve?usp=drive_link",
    "smart competition": "https://drive.google.com/drive/folders/1dxNlkauTNd-Oa0sN46ShO0oQCv-EoMDe?usp=drive_link",
    "well design": "https://drive.google.com/drive/folders/1nsiXXuDWnsf-5o62yt758k6WZYPaNqjI?usp=drive_link",
    "hackaton": "https://drive.google.com/drive/folders/1HorhBttwNfCOY2dB9VqOR_GxXjujtXDI?usp=drive_link"
};

function setupGuidebook(userCompetition) {
    console.log("setupGuidebook: lookup key =", userCompetition);

    if (!userCompetition) {
        console.warn("setupGuidebook: userCompetition kosong");
        return;
    }

    const lookupKey = userCompetition;
    const guidebookURL = competitionGuideBookRaw[lookupKey] || null;

    console.log("setupGuidebook: found guidebook entry =", guidebookURL);

    const guidebookAnchor = document.getElementById("competition-guide-book");
    const finalguidebookAnchor = document.getElementById("final-competition-guide-book");   

    if (!guidebookAnchor) {
        console.error("setupGuidebook: Elemen #competition-guide-book tidak ditemukan!");
        return;
    }

    if (!finalguidebookAnchor) {
        console.error("setupGuidebook: Elemen #final-competition-guide-book tidak ditemukan!");
        return;
    }

    // ======================================================
    // CASE: SUBMISSION BELUM OPEN → kasih alert saat diklik
    // ======================================================
    if (!isSubmissionOpen()) {
        guidebookAnchor.href = "#"; // tidak membuka apa pun

        guidebookAnchor.addEventListener("click", (e) => {
            e.preventDefault();
            alert("Guidebook can be accessed during the submission period.");
        });

        finalguidebookAnchor.addEventListener("click", (e) => {
            e.preventDefault();
            alert("Guidebook can be accessed during the submission period.");
        });

        console.log("setupGuidebook: guidebook locked — alert mode aktif");
        return;
    }

    // ======================================================
    // CASE: SUBMISSION SUDAH OPEN → normal
    // ======================================================
    if (!guidebookURL) {
        guidebookAnchor.href = "#";
        finalguidebookAnchor.href = "#";
        guidebookAnchor.innerText = "Guidebook Not Available";
        finalguidebookAnchor.innerText = "Guidebook Not Available"; 
        return;
    }

    // Normal mode
    guidebookAnchor.href = guidebookURL;
    finalguidebookAnchor.href = guidebookURL;
    guidebookAnchor.innerText = "Guide Book";
    finalguidebookAnchor.innerText = "Guide Book";
    guidebookAnchor.classList.remove("disabled");
    finalguidebookAnchor.classList.remove("disabled");

    console.log("setupGuidebook: guidebook link applied");
}

// =====================================
// SUBMISSION LOCKING
// =====================================

function applySubmissionLock(submissionData) {
    const downloadCaseRow = document.querySelector(".row.my-2");
    const formRow = document.querySelector("#preliminary-form")?.closest(".row");

    if (submissionData !== undefined) {
        prelimSubmitBtn.disabled = true;
        prelimSubmitBtn.innerText = "Already Submitted";

        // Hide "Download Case"
        if (downloadCaseRow) downloadCaseRow.style.display = "none";

        // Hide entire form block
        if (formRow) formRow.style.display = "none";
    } else {
        // Normal (not submitted)
        prelimSubmitBtn.disabled = false;
        prelimSubmitBtn.innerText = "Submit";

        if (downloadCaseRow) downloadCaseRow.style.display = "block";
        if (formRow) formRow.style.display = "block";
    }
}


// =====================================
// EDIT SUBMISSION SETUP
// =====================================
function setupEditSubmission(prelimstats) {
    // Nonactive for no submission
    if (!prelimstats) {
        const editBtn = document.getElementById("del-edit-submission");
        if (editBtn) editBtn.style.display = "none";
        return;
    }
}

// Edit submission button handler
document.addEventListener("DOMContentLoaded", () => {

    editFileBtnPrem.addEventListener("click", () => {
        const editModal = new bootstrap.Modal(document.getElementById("editConfirmModal"));
        editModal.show();
    });

    document.getElementById("confirmEditBtn").addEventListener("click", () => {
        unlockSubmissionForm();

        document.getElementById("del-edit-submission").style.display = "none";

        const modalInstance = bootstrap.Modal.getInstance(
            document.getElementById("editConfirmModal")
        );
        modalInstance.hide();
    });

});

function unlockSubmissionForm() {

    applySubmissionLock(undefined);
    const downloadCaseRow = document.querySelector(".row.my-2");
    const formRow = document.querySelector("#preliminary-form")?.closest(".row");

    // Show everything again
    if (downloadCaseRow) downloadCaseRow.style.display = "block";
    if (formRow) formRow.style.display = "block";

    // Restore inner form elements
    preliminaryForm.querySelectorAll("*").forEach(el => {
        el.style.display = ""; 
    });

    // Restore submit button
    prelimSubmitBtn.disabled = false;
    prelimSubmitBtn.innerText = "Submit";
}


function submissionSummary (PrelimOverdue, PrelimSubmittedAt, PrelimFileURL) {
    if (!delegateSubmissionSummary) return;

    const delLastSubmission = delegateSubmissionSummary.querySelector("#file-time-sub");
    const delSubmissionStatus = delegateSubmissionSummary.querySelector("#file-time-status");
    const delFileURL = delegateSubmissionSummary.querySelector("#file-url");

    // submittedAt may be a Firestore Timestamp or a Date or null
    let submittedText = "No submission yet";
    if (PrelimSubmittedAt) {
        try {
            const dt = typeof PrelimSubmittedAt.toDate === "function"
                ? PrelimSubmittedAt.toDate()
                : new Date(PrelimSubmittedAt);
            submittedText = isNaN(dt) ? "No submission yet" : dt.toLocaleString();
        } catch {
            submittedText = "No submission yet";
        }
    }
    if (delLastSubmission) delLastSubmission.textContent = submittedText;
    if (delSubmissionStatus) delSubmissionStatus.textContent = PrelimOverdue || "No submission yet";

    if (delFileURL) {
        if (PrelimFileURL) {
            delFileURL.innerHTML = `<a href="${PrelimFileURL}" target="_blank" class="text-primary text-decoration-underline">Open File</a>`;
        } else {
            delFileURL.textContent = "No file uploaded";
        }
    }
}

// =====================================
// FINAL TAB ACCESS CONTROL
// =====================================
console.log("SCRIPT LOADED");


// =====================================
// FINAL ROUND LINK SETUP (FIXED BOOLEAN LOGIC)
// =====================================
async function setupFinalRoundLink(finalStatusRaw, currentUserID, finalPaymentStatus, competition) {
    // 1. Ambil Elemen
    let finalLink = document.getElementById("Final-Round-Registration");
    let LeaderboardDisplay = document.getElementById("Preliminary-Leaderboard"); // Elemen Rank di Card 1
    const paymentDisplay = document.getElementById("Final-Payment-Status"); // Elemen Payment di Card 3

    if (!finalLink) return;

    // -----------------------------------------------------------
    // LOGIKA LEADERBOARD: UBAH JADI "VIEW" & BUKA MODAL
    // -----------------------------------------------------------
    if (LeaderboardDisplay) {

        LeaderboardDisplay.replaceWith(LeaderboardDisplay.cloneNode(true));
        LeaderboardDisplay = document.getElementById("Preliminary-Leaderboard");

        const openTimeUTC = Date.UTC(2026, 0, 3, 11, 0, 0); 
        const nowUTC = Date.now();

        const isOpen = nowUTC >= openTimeUTC;

        // ===== SET TAMPILAN =====
        LeaderboardDisplay.textContent = "View";
        LeaderboardDisplay.style.textDecoration = "underline";

        if (!isOpen) {
            // LOCKED
            LeaderboardDisplay.style.color = "#9ca3af";
            LeaderboardDisplay.style.cursor = "not-allowed";

            LeaderboardDisplay.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                alert("Leaderboard can only be accessed starting January 3, 2026 at 6:00 PM (Jakarta Time, GMT+7) ");
            });

        } else {
            // UNLOCKED
            LeaderboardDisplay.style.color = "#4c1d95";
            LeaderboardDisplay.style.cursor = "pointer";

            LeaderboardDisplay.addEventListener("click", (e) => {
                e.preventDefault();
                handleOpenLeaderboard(competition);
            });
        }
    }



    // -----------------------------------------------------------
    // LOGIKA PAYMENT VERIFIED (PRIORITAS TERTINGGI)
    // -----------------------------------------------------------
    if (finalPaymentStatus === "verified") {
        finalLink.textContent = "Registered";
        finalLink.style.pointerEvents = "none";
        finalLink.style.opacity = "0.7";
        if (paymentDisplay) paymentDisplay.textContent = "Verified";
        return;
    }

    // 2. Reset Listener Tombol Registrasi
    finalLink.replaceWith(finalLink.cloneNode(true));
    finalLink = document.getElementById("Final-Round-Registration"); 

    // -----------------------------------------------------------
    // LOGIKA STATUS KELOLOSAN (finalStatusRaw)
    // -----------------------------------------------------------

    if (finalStatusRaw === true) {
        // ============================
        // SKENARIO 1: LOLOS (PASSED) -> Tampilkan Tombol Regist
        // ============================
        
        finalLink.textContent = "Regist";
        finalLink.style.pointerEvents = "auto";
        finalLink.style.opacity = "1";
        
        // Reset style tombol ke default CSS
        finalLink.style.backgroundColor = ""; 
        finalLink.style.borderColor = "";
        finalLink.style.color = "";
        finalLink.removeAttribute("href");

        // Event Klik: Buka Modal Pembayaran
        finalLink.addEventListener("click", async (e) => {
            e.preventDefault();

            const docRef = doc(DB, "Team", currentUserID);
            const snap = await getDoc(docRef);

            if (!snap.exists()) {
                alert("Team data not found.");
                return;
            }

            const teamData = snap.data();
            
            // Panggil modal pembayaran bootstrap (Logic lama Anda)
            if(typeof generateFinalModal === 'function'){
                 generateFinalModal(teamData); 
                 const finalModal = new bootstrap.Modal(document.getElementById("finalPaymentModal"));
                 finalModal.show();
            }
        });

    } else if (finalStatusRaw === false) {
        // ============================
        // SKENARIO 2: TIDAK LOLOS -> TOMBOL PESAN SEMANGAT
        // ============================

        // Ubah tombol jadi pesan
        finalLink.textContent = "A Message For You"; 
        
        // Aktifkan klik
        finalLink.style.pointerEvents = "auto"; 
        finalLink.style.cursor = "pointer";

        // Style tombol: Outline putih transparan
        finalLink.style.backgroundColor = "transparent"; 
        finalLink.style.borderColor = "rgba(255, 255, 255, 0.6)";
        finalLink.style.color = "#ffffff"; 
        finalLink.style.opacity = "1"; 
        finalLink.style.boxShadow = "none";
        finalLink.removeAttribute("href");

        // Event Klik: Buka Modal Semangat
        finalLink.addEventListener("click", async (e) => {
            e.preventDefault();
            
            // 1. Ambil nama tim
            const docRef = doc(DB, "Team", currentUserID);
            const snap = await getDoc(docRef);
            const teamName = snap.exists() ? snap.data().teamName : "Participant";
            // 2. Generate HTML 
            generateEncouragementModal(teamName);
            // 3. Pastikan ID ini sesuai dengan ID modal pembungkus utama di HTML kamu (biasanya "finalPaymentModal")
            const modalElement = document.getElementById("finalPaymentModal"); 

            // Cek apakah modal sudah ada instance-nya atau buat baru
            let finalModal = bootstrap.Modal.getInstance(modalElement);
            if (!finalModal) {
                finalModal = new bootstrap.Modal(modalElement);
            }
            
            finalModal.show(); // <--- INI KUNCINYA
        });

        // Kosongkan Status Payment
        if (paymentDisplay) {
            paymentDisplay.textContent = "-";
            paymentDisplay.style.opacity = "0.5"; 
        }
        
    } else {
        // ============================
        // SKENARIO 3: PENDING -> Tampilan Default
        // ============================
        
        finalLink.textContent = "Pending";
        finalLink.style.pointerEvents = "none";
        finalLink.style.opacity = "0.5";
        
        if (paymentDisplay) paymentDisplay.textContent = "Pending";
    }
}

async function handleOpenLeaderboard(userCompetition) {
    const tbody = document.getElementById("prelim-table-body");
    const modalWrapper = document.getElementById("prelim-leaderboard-modal-wrapper");
    
    // 1. Reset & Tampilkan Loading
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-muted"><div class="spinner-border text-primary spinner-border-sm" role="status"></div> Loading Leaderboard...</td></tr>';
    
    // 2. Buka Modal
    if (modalWrapper) {
        modalWrapper.style.display = 'flex';
    }

    try {
        // 3. Query Firebase: Ambil HANYA tim dari lomba yang sama
        // Pastikan nama field di database sesuai, misal "competition" atau "selectedCompetition"
        const q = query(
            collection(DB, "Team"), 
            where("competition", "==", userCompetition) 
        );
        
        const querySnapshot = await getDocs(q);
        let qualifiedTeams = [];

        // 4. Filtering Data (Client Side)
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const prelim = data.sub_preliminary || {};

            // Syarat Masuk Leaderboard:
            // a. Punya Rank (Tidak null/undefined dan > 0)
            // b. Punya Score (Tidak null/undefined)
            const hasRank = prelim.rank !== null && prelim.rank !== undefined && prelim.rank > 0;
            const hasScore = prelim.score !== null && prelim.score !== undefined;

            if (hasRank && hasScore) {
                qualifiedTeams.push({
                    id: doc.id,
                    teamName: data.teamName,
                    university: data.leader?.university || "-",
                    rank: prelim.rank,
                    score: prelim.score,
                    finalStatus: prelim.final // true/false/null
                });
            }
        });

        // 5. Sorting: Urutkan berdasarkan Rank (1, 2, 3...)
        qualifiedTeams.sort((a, b) => a.rank - b.rank);

        // 6. Rendering ke HTML
        tbody.innerHTML = ""; // Hapus loading

        if (qualifiedTeams.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center p-4 text-muted" style="font-style: italic;">
                        Leaderboard data is not available yet.
                    </td>
                </tr>`;
            return;
        }

        // Loop data yang sudah bersih
        qualifiedTeams.forEach((team, index) => {
            renderLeaderboardRow(tbody, team, index + 1);
        });

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger p-3">Failed to load leaderboard.</td></tr>';
    }
}

/**
 * RENDER BARIS TABEL (READ-ONLY)
 * Karena ini untuk dilihat peserta, kita pakai Teks Biasa (Bukan Input/Select)
 */
function renderLeaderboardRow(tbody, team, displayNo) {
    const row = document.createElement("tr");

    // Tentukan Label Status Final
    let statusBadge = `<span class="badge bg-secondary">Pending</span>`;
    if (team.finalStatus === true) {
        statusBadge = `<span class="badge bg-success">Passed</span>`;
    } else if (team.finalStatus === false) {
        statusBadge = `<span class="badge bg-danger">Failed</span>`;
    }

    // Styling Score agar rapi (2 desimal)
    const formattedScore = parseFloat(team.score).toFixed(2);

    row.innerHTML = `
        <td class="text-center fw-bold text-secondary">${displayNo}</td>
        
        <td>
            <div style="font-weight:700; color:#4c1d95; font-size:14px;">
                ${team.teamName || "No Name"}
            </div>
            <div style="font-size:11px; color:#64748b;">
                ${team.university}
            </div>
        </td>

        <td class="text-center">${statusBadge}</td>

        <td class="text-center">
            <span style="font-weight: 800; font-size: 1.1rem; color: #0f172a;">#${team.rank}</span>
        </td>

        <td class="text-center">
            <span style="font-weight: 600; color: #4c1d95;">${formattedScore}</span>
        </td>
    `;

    tbody.appendChild(row);
}

// =====================================
// GENERATE MODAL SEMANGAT (HTML)
// =====================================

function generateEncouragementModal(teamName) {
    const wrapper = document.getElementById("final-payment-wrapper");

    // --- TAMBAHAN BARU: Hapus Background Putih Bawaan Bootstrap ---
    // Ini mencari elemen induk (.modal-content) dan membuatnya transparan
    const parentContent = wrapper.closest('.modal-content');
    if (parentContent) {
        parentContent.style.backgroundColor = 'transparent';
        parentContent.style.border = 'none';
        parentContent.style.boxShadow = 'none';
    }
    // -------------------------------------------------------------

    wrapper.innerHTML = `
        <div class="modal-content" id="encourage-modal-card">
            
            <div class="modal-header border-0 pb-0 justify-content-end">
                <button type="button" class="btn-close" id="encourage-close-icon" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body px-4 pb-4 pt-0 text-center">
                
                <div id="encourage-icon-wrapper">
                    <span id="encourage-icon">✨</span>
                </div>

                <h3 id="encourage-title">Dear ${teamName},</h3>
                
                <p id="encourage-message">
                    Thank you for participating. Although you did not proceed to the final round, 
                    <span id="encourage-message-highlight">we were truly impressed by your effort.</span>
                </p>

                <div id="encourage-quote-box">
                    <p id="encourage-quote-text">
                        "Success is not final, failure is not fatal: it is the courage to continue that counts."
                    </p>
                    <small id="encourage-quote-author">— Winston Churchill</small>
                </div>

                <p id="encourage-footer">
                    Keep learning, keep growing! 🚀
                </p>

                <button type="button" id="encourage-btn-action" data-bs-dismiss="modal">
                    Close
                </button>
            </div>
        </div>
    `;
}


function generateFinalModal(teamData) {
    const wrapper = document.getElementById("final-payment-wrapper");

    const parentContent = wrapper.closest('.modal-content');
    if (parentContent) {
        parentContent.style.backgroundColor = 'transparent';
        parentContent.style.border = 'none';
        parentContent.style.boxShadow = 'none';
    }

    // Cegah overwrite kalau sudah ada isi
    if (wrapper.innerHTML.trim() !== "") return;

    // Leader info
    const leaderfirstname = teamData.leader.firstName;
    const leaderlastname = teamData.leader.lastName;

    // Generate form member
    // Generate form member
    let memberFormsHTML = "";
    if (teamData.members && teamData.members.length > 0) {
        teamData.members.forEach((member, i) => {
            memberFormsHTML += `
                <div class="member-final-pay-form mb-3">
                    <div class="d-flex align-items-center mb-3">
                        <div class="payment-icon-user me-3">👤</div>
                        <div>
                            <div class="role-label-small">Member</div> <h5 class="member-name-large mb-0" id="member-name-${i}">
                                ${member.firstName} ${member.lastName}
                            </h5>
                        </div>
                    </div>

                    <div class="price-display-box">
                        <span class="price-label">Amount to Pay</span>
                        <span class="price-value" id="member-price-${i}">Calculating...</span>
                    </div>
                    
                    <div id="member-payment-method-info-${i}" class="small text-muted mb-2 px-1"></div>

                    <div class="mb-3">
                        <label class="form-label" for="member-payment-submit-${i}">Upload Payment Proof</label>
                        <input type="file" class="form-control" id="member-payment-submit-${i}" name="member-payment-submit-${i}">
                    </div>

                    <div class="row">
                        <div class="col-6">
                            <label class="form-label" for="member-hospitality-type-${i}">Hospitality</label>
                            <select class="form-select" id="member-hospitality-type-${i}" name="member-hospitality-type-${i}" required>
                                <option value="Full Hospitality">Full Hospitality</option>
                                <option value="Excluding Accommodation">Excluding Accommodation</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label" for="member-payment-method-${i}">Payment Method</label>
                            <select class="form-select" id="member-payment-method-${i}" name="member-payment-method-${i}" required>
                                <option value="Gopay">Gopay</option>
                                <option value="Bank BCA">Bank BCA</option>
                                <option value="Paypal">Paypal</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    wrapper.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">FINAL ROUND REGISTRATION</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <div class="modal-body"> 
                <div id="del-final-status"></div>
                <div id="del-payment-status"></div>

                <div id="del-final-payment">
                    <form id="final-payment-upload">
                        
                        <div id="leader-final-pay-form" class="mb-3">
                            <div class="d-flex align-items-center mb-3">
                                <div class="payment-icon-user me-3" style="background: rgba(255, 81, 47, 0.1); color: #ff512f;">👑</div> 
                                <div>
                                    <div class="role-label-small" style="color: #ff512f;">Team Leader</div>
                                    <h5 class="member-name-large mb-0">
                                        ${leaderfirstname + " " + leaderlastname}
                                    </h5>
                                </div>
                            </div>
                            
                            <div class="price-display-box">
                                <span class="price-label">Amount to Pay</span>
                                <span class="price-value" id="final-payment-price">Calculating...</span>
                            </div>

                            <div id="final-payment-method-info" class="small text-muted mb-2 px-1"></div>

                            <div class="mb-3">
                                <label for="final-leader-payment-submit" class="form-label">Upload Payment Proof</label>
                                <input type="file" id="final-leader-payment-submit" name="final-leader-payment-submit" class="form-control">
                            </div>

                            <div class="row mb-2">
                                <div class="col-6">
                                    <label for="leader-hospitality-type" class="form-label">Hospitality</label>
                                    <select id="leader-hospitality-type" name="leader-hospitality-type" class="form-select" required>
                                        <option value="Full Hospitality">Full Hospitality</option>
                                        <option value="Excluding Accommodation">Excluding Accommodation</option>
                                    </select>
                                </div>
                                <div class="col-6">
                                    <label for="leader-payment-type" class="form-label">Payment Scheme</label>
                                    <select id="leader-payment-type" name="leader-payment-type" class="form-select" required>
                                        <option value="Full">Full Payment</option>
                                        <option value="DP" selected>Down Payment</option>
                                    </select>
                                </div>
                            </div>

                            <div class="row"> 
                                <div class="col-6">
                                    <label for="leader-payment-method" class="form-label">Payment Method</label>
                                    <select id="leader-payment-method" name="leader-payment-method" class="form-select" required>
                                        <option value="Gopay">Gopay</option>
                                        <option value="Bank BCA">Bank BCA</option>
                                        <option value="Paypal">Paypal</option>
                                    </select>
                                </div>
                                <div class="col-6" id="down-payment-category-col">
                                    <label for="leader-down-payment-category" class="form-label">Category (DP)</label>
                                    <select id="leader-down-payment-category" name="leader-down-payment-category" class="form-select">
                                        <option value="First">First Payment</option>
                                        <option value="Last">Last Payment</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        ${memberFormsHTML}

                        <div class="custom-rules-box">
                            <input class="form-check-input" type="checkbox" id="final-rules-check" required>
                            <label class="custom-rules-label" for="final-rules-check">
                                I confirm that all data is correct and I have read the 
                                <a href="" target="_blank">Finalist Payment Rules</a>.
                            </label>
                        </div>
                        <div class="invalid-feedback d-block text-center mt-2" style="color: #ff8ccf; font-weight:bold; display:none;">* You must agree before submitting.</div>
                    </form>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn-cancel-custom" data-bs-dismiss="modal">Cancel</button>
                <button id="final-payment-submit-btn" type="submit" form="final-payment-upload" class="btn-submit-custom">Submit Payment</button>
            </div>
        </div>
    `;
    // Ambil elemen
    const paymentTypeSelect = document.getElementById("leader-payment-type");
    const downPaymentCategoryCol = document.getElementById("down-payment-category-col");
    const downPaymentCategorySelect = document.getElementById("leader-down-payment-category");

    // Fungsi untuk toggle visibility dan set default
    function updateCategoryVisibility() {
        if (paymentTypeSelect.value === "DP") {
            downPaymentCategoryCol.style.display = "block"; // muncul
            downPaymentCategorySelect.disabled = false;
            downPaymentCategorySelect.value = "First"; // default First Payment
        } else {
            downPaymentCategoryCol.style.display = "none"; // sembunyi
            downPaymentCategorySelect.disabled = true;
        }
    }

    // Event listener
    paymentTypeSelect.addEventListener("change", updateCategoryVisibility);
    updateCategoryVisibility(); // panggil sekali untuk inisialisasi

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            initFinalPaymentBindings(teamData);

            const finalPaymentSubmitBtn = document.getElementById("final-payment-submit-btn");

            if (!finalPaymentSubmitBtn) {
                console.warn("Submit button not found, modal might not be generated yet.");
                return;
            }

            finalPaymentSubmitBtn.addEventListener("click", async (e) => {
                e.preventDefault();

                // 1. VALIDASI CHECKBOX (Rules Agreement)
                const checkboxRead = document.getElementById("final-rules-check");
                    
                if (!checkboxRead || !checkboxRead.checked) {
                    alert("⚠️ Please read and check the Finalist Payment Rules agreement.");
                    checkboxRead.focus();
                    return;
                }

                // 2. VALIDASI LEADER
                const leaderFileInput = document.getElementById("final-leader-payment-submit");
                if (!leaderFileInput || leaderFileInput.files.length === 0) {
                    alert("⚠️ Leader must upload payment proof first.");
                    leaderFileInput.focus();
                    return;
                }

                // 3. VALIDASI MEMBER
                if (teamData.members && teamData.members.length > 0) {
                    for (let i = 0; i < teamData.members.length; i++) {
                        const memberFileInput = document.getElementById(`member-payment-submit-${i}`);
                        if (!memberFileInput || memberFileInput.files.length === 0) {
                            alert(`⚠️ ${teamData.members[i].firstName} must upload payment proof.`);
                            memberFileInput.focus();
                            return;
                        }
                    }
                }

                // --- PROSES SUBMIT ---
                const originalText = finalPaymentSubmitBtn.innerText;
                finalPaymentSubmitBtn.innerText = "Processing...";
                finalPaymentSubmitBtn.disabled = true;

                try {
                    const formData = collectFinalFormData(teamData);
                    await submitFinalRegistration(currentUserID, formData, teamData);
                    
                    alert("Payment submitted successfully. Well done on reaching the Final Round. We look forward to seeing you there.");
                    
                    window.location.reload(); 
                } catch (err) {
                    console.error(err);
                    alert("Failed to save data! Please check your connection.");
                    finalPaymentSubmitBtn.innerText = originalText;
                    finalPaymentSubmitBtn.disabled = false;
                }
            });
        });
    } else {
        initFinalPaymentBindings(teamData);

        const finalPaymentSubmitBtn = document.getElementById("final-payment-submit-btn");

        if (!finalPaymentSubmitBtn) {
            console.warn("Submit button not found, modal might not be generated yet.");
            return;
        }

        finalPaymentSubmitBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            // 1. VALIDASI CHECKBOX (Rules Agreement)
            const checkboxRead = document.getElementById("final-rules-check");
                
            if (!checkboxRead || !checkboxRead.checked) {
                alert("⚠️ Please read and check the Finalist Payment Rules agreement.");
                checkboxRead.focus();
                return;
            }

            // 2. VALIDASI LEADER
            const leaderFileInput = document.getElementById("final-leader-payment-submit");
            if (!leaderFileInput || leaderFileInput.files.length === 0) {
                alert("⚠️ Leader must upload payment proof first.");
                leaderFileInput.focus();
                return;
            }

            // 3. VALIDASI MEMBER
            if (teamData.members && teamData.members.length > 0) {
                for (let i = 0; i < teamData.members.length; i++) {
                    const memberFileInput = document.getElementById(`member-payment-submit-${i}`);
                    if (!memberFileInput || memberFileInput.files.length === 0) {
                        alert(`⚠️ ${teamData.members[i].firstName} must upload payment proof.`);
                        memberFileInput.focus();
                        return;
                    }
                }
            }

            // --- PROSES SUBMIT ---
            const originalText = finalPaymentSubmitBtn.innerText;
            finalPaymentSubmitBtn.innerText = "Processing...";
            finalPaymentSubmitBtn.disabled = true;

            try {
                const formData = collectFinalFormData(teamData);
                await submitFinalRegistration(currentUserID, formData, teamData);

                alert("Payment submitted successfully and is currently under verification by the organizing committee.\nWell done on reaching the Final Round. We look forward to seeing you there.");

                window.location.reload();
            } catch (err) {
                console.error(err);
                alert("Failed to save data! Please check your connection.");
                finalPaymentSubmitBtn.innerText = originalText;
                finalPaymentSubmitBtn.disabled = false;
            }
        });



    }
}

// PRICE TABLE
const PRICE_TABLE = {
    "Full Hospitality": {
        Full: {
            "Bank BCA": 700000,
            "Gopay": 700000,
            "Paypal": 50
        },
        DP: {
            First: {
                "Bank BCA": 400000,
                "Gopay": 400000,
                "Paypal": 30
            },
            Last: {
                "Bank BCA": 300000,
                "Gopay": 300000,
                "Paypal": 20
            }
        }
    },
    "Excluding Accommodation": {
        Full: {
            "Bank BCA": 450000,
            "Gopay": 450000,
            "Paypal": 32
        },
        DP: {
            First: {
                "Bank BCA": 300000,
                "Gopay": 300000,
                "Paypal": 20
            },
            Last: {
                "Bank BCA": 150000,
                "Gopay": 150000,
                "Paypal": 12
            }
        }
    }
};


function initFinalPaymentBindings(teamData) {
    console.log("initFinalPaymentBindings: running");

    const leaderHospitality = document.getElementById("leader-hospitality-type");
    const leaderPaymentScheme = document.getElementById("leader-payment-type");
    const leaderPaymentMethod = document.getElementById("leader-payment-method");
    const leaderCategory = document.getElementById("leader-down-payment-category");
    const leaderPriceSpan = document.getElementById("final-payment-price");
    const leaderInfoBox = document.getElementById("final-payment-method-info");

    // Ambil harga sesuai tabel, tanpa konversi Paypal tambahan
    function getPrice(hosp, scheme, method, category = null) {
        if (scheme === "Full") {
            return PRICE_TABLE[hosp].Full[method];
        } else { // DP
            return PRICE_TABLE[hosp].DP[category][method];
        }
    }

    function updatePaymentMethodInfo(infoBox, method) {
        switch (method) {
            case "Bank BCA":
                infoBox.innerHTML = `<p class="mt-2"><strong>BCA</strong> — 2650508800 (Mochammad Rafly Ghazany A)</p>`;
                break;
            case "Gopay":
                infoBox.innerHTML = `<p class="mt-2">085655226900 (Rafly Ghazany)</p>`;
                break;
            case "Paypal":
                infoBox.innerHTML = `<p class="mt-2"><a href="https://www.paypal.me/RaflyGhazany" target="_blank">paypal.me/RaflyGhazany</a></p>`;
                break;
            default:
                infoBox.innerHTML = "";
        }
    }

    function updateLeaderPrice() {
        const hosp = leaderHospitality.value;
        const scheme = leaderPaymentScheme.value;
        const method = leaderPaymentMethod.value;
        const category = leaderCategory.value;

        const price = getPrice(hosp, scheme, method, category);
        leaderPriceSpan.textContent = method === "Paypal" 
            ? `$${price.toFixed(2)}` 
            : `IDR ${price.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        updatePaymentMethodInfo(leaderInfoBox, method);
    }

    leaderHospitality.addEventListener("change", updateLeaderPrice);
    leaderPaymentScheme.addEventListener("change", updateLeaderPrice);
    leaderPaymentMethod.addEventListener("change", updateLeaderPrice);
    leaderCategory.addEventListener("change", updateLeaderPrice);

    updateLeaderPrice(); // inisialisasi leader

    // --- Member bindings ---
    if (teamData.members && teamData.members.length > 0) {
        teamData.members.forEach((member, i) => {
            const hosp = document.getElementById(`member-hospitality-type-${i}`);
            const method = document.getElementById(`member-payment-method-${i}`);
            const priceSpan = document.getElementById(`member-price-${i}`);
            const infoBox = document.getElementById(`member-payment-method-info-${i}`);

            function updateMemberPrice() {
                const hospVal = hosp.value;
                const methodVal = method.value;
                const scheme = leaderPaymentScheme.value;
                const category = leaderCategory.value;

                const price = getPrice(hospVal, scheme, methodVal, category);
                priceSpan.textContent = methodVal === "Paypal" 
                    ? `$${price.toFixed(2)}` 
                    : `IDR ${price.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;


                updatePaymentMethodInfo(infoBox, methodVal);
            }

            hosp.addEventListener("change", updateMemberPrice);
            method.addEventListener("change", updateMemberPrice);
            leaderPaymentScheme.addEventListener("change", updateMemberPrice);
            leaderCategory.addEventListener("change", updateMemberPrice);

            updateMemberPrice();
        });
    }
}

function collectFinalFormData(teamData) {
    const leaderPaymentType = document.getElementById("leader-payment-type").value;
    const leaderPaymentCategory = document.getElementById("leader-down-payment-category").value;
    const leaderPaymentMethod = document.getElementById("leader-payment-method").value;
    const leaderHospitality = document.getElementById("leader-hospitality-type").value;
    const leaderFile = document.getElementById("final-leader-payment-submit").files[0];

    const membersData = [];

    if (teamData.members && teamData.members.length > 0) {
        teamData.members.forEach((member, i) => {
            const fileInput = document.getElementById(`member-payment-submit-${i}`);
            const hospitalityInput = document.getElementById(`member-hospitality-type-${i}`);
            const methodInput = document.getElementById(`member-payment-method-${i}`);

            membersData.push({
                hospitality: hospitalityInput.value,
                paymentMethod: methodInput.value,
                file: fileInput.files[0] || null,
            });
        });
    }

    return {
        leader: {
            hospitality: leaderHospitality,
            paymentMethod: leaderPaymentMethod,
            file: leaderFile,
        },

        members: membersData,

        // digunakan untuk determinasi CASE di submitFinalRegistration()
        paymentScheme: leaderPaymentType,
        dpCategory: leaderPaymentCategory,
    };
}


async function submitFinalRegistration(currentUID, formData, teamData) {
    const teamRef = doc(DB, "Team", currentUID);
    const snap = await getDoc(teamRef);
    const timeStamp = Date.now();

    // ==============================
    // UPLOAD LEADER FILE
    // ==============================
    let leaderURL = null;
    if (formData.leader.file) {
        const leaderPath = `finalreg_submissions/${currentUID}/leader_${timeStamp}`;
        const leaderRef = ref(STORAGE, leaderPath);
        const uploadLeader = await uploadBytes(leaderRef, formData.leader.file);
        leaderURL = await getDownloadURL(uploadLeader.ref);
    }

    // ==============================
    // UPLOAD MEMBER FILES
    // ==============================
    const memberPaymentURLs = [];
    for (let i = 0; i < formData.members.length; i++) {
        const mem = formData.members[i];

        if (!mem.file) {
            memberPaymentURLs.push(null);
            continue;
        }

        const memPath = `finalreg_submissions/${currentUID}/member_${i}_${timeStamp}`;
        const memRef = ref(STORAGE, memPath);
        const memSnap = await uploadBytes(memRef, mem.file);
        const memURL = await getDownloadURL(memSnap.ref);
        memberPaymentURLs.push(memURL);
    }

    const existing = snap.exists() ? snap.data().final_reg : null;

    // ======================================================
    // CASE 1: BELUM ADA FINAL REG
    // ======================================================
    if (!existing) {
        return updateDoc(teamRef, {
            final_reg: {
                leader: {
                    hospitality: formData.leader.hospitality,
                    paymentMethod: formData.leader.paymentMethod,
                    paymentProof: leaderURL || "-",
                    lastPayment: "-",           // <── khusus leader
                },

                members: formData.members.map((m, i) => ({
                    hospitality: m.hospitality,
                    paymentMethod: m.paymentMethod,
                    paymentProof: memberPaymentURLs[i] || "-",
                    lastPayment: "-",           // <── khusus member
                })),

                paymentScheme: formData.paymentScheme,
                dpCategory: formData.dpCategory ?? "-",
                createdAt: serverTimestamp(),
                paymentStatus: "pending"
            }
        });
    }

    // ======================================================
    // CASE 2: FULL PAYMENT — overwrite semua
    // ======================================================
    if (formData.paymentScheme === "Full") {
        return updateDoc(teamRef, {
            final_reg: {
                leader: {
                    hospitality: formData.leader.hospitality,
                    paymentMethod: formData.leader.paymentMethod,
                    paymentProof: leaderURL || "-",
                    lastPayment: "-", // reset
                },

                members: formData.members.map((m, i) => ({
                    hospitality: m.hospitality,
                    paymentMethod: m.paymentMethod,
                    paymentProof: memberPaymentURLs[i] || "-",
                    lastPayment: "-", // reset
                })),

                paymentScheme: "Full",
                dpCategory: "-",
                updatedAt: serverTimestamp(),
                paymentStatus : "pending"
            }
        });
    }

    // ======================================================
    // CASE 3: DP LAST PAYMENT — SELURUH TIM SUBMIT SEKALIGUS
    // ======================================================
    if (formData.paymentScheme === "DP" && formData.dpCategory === "Last") {
        const updatedMembers = existing.members.map((member, i) => {
            return {
                ...member,
                lastPayment: memberPaymentURLs[i] || member.lastPayment || "-"
            };
        });
        const updatedLeader = {
            ...existing.leader,
            lastPayment: leaderURL || existing.leader.lastPayment || "-"
        };
        return updateDoc(teamRef, {
            "final_reg.leader": updatedLeader,
            "final_reg.members": updatedMembers,  
            "final_reg.dpCategory": "Last",
            "final_reg.lastPaymentAt": serverTimestamp(),
            "final_reg.paymentStatus": "pending"
        });
    }


    // ======================================================
    // CASE 4: DP FIRST PAYMENT OVERWRITE (kecuali lastPayment)
    // ======================================================
    if (formData.paymentScheme === "DP" && formData.dpCategory === "First") {
        return updateDoc(teamRef, {
            final_reg: {
                leader: {
                    hospitality: formData.leader.hospitality,
                    paymentMethod: formData.leader.paymentMethod,
                    paymentProof: leaderURL || existing?.leader?.paymentProof || "-",
                    lastPayment: existing?.leader?.lastPayment ?? "-", // pertahankan
                },

                members: formData.members.map((m, i) => ({
                    hospitality: m.hospitality,
                    paymentMethod: m.paymentMethod,
                    paymentProof: memberPaymentURLs[i] || existing?.members?.[i]?.paymentProof || "-",
                    lastPayment: existing?.members?.[i]?.lastPayment ?? "-", // pertahankan
                })),

                paymentScheme: "DP",
                dpCategory: "First",
                updatedAt: serverTimestamp(),
                paymentStatus : "pending"
            }
        });
    }

    console.warn("No case matched, check formData.");
}



function setupFinalTab(finalStatus) {
    const finalTab = document.getElementById("nav-contact-tab");

    if (!finalTab) return;

    // Buka Tab untuk Verified & DP Verified
    if (finalStatus === "verified" || finalStatus === "down_payment_verified") {
        finalTab.style.pointerEvents = "auto";
        finalTab.style.opacity = "1";
        finalTab.style.cursor = "pointer";

        // Kita kunci tombolnya HANYA jika statusnya "down_payment_verified"
        if (finalStatus === "down_payment_verified") {
            const finalSubmitBtn = document.getElementById("final-submit-btn");
            const finalFileInput = document.getElementById("final-submit");

            // 1. Matikan input file
            if (finalFileInput) {
                finalFileInput.disabled = true;
            }

            // 2. Cegah tombol submit dengan Alert
            if (finalSubmitBtn) {
                finalSubmitBtn.onclick = function (e) {
                    e.preventDefault();
                    alert("⚠️ Please complete your full payment to submit the file.");
                };
            }
        }
        // --- SELESAI TAMBAHAN ---

    } else {
        // Logic untuk yang belum bayar sama sekali
        finalTab.style.pointerEvents = "none";
        finalTab.style.opacity = "0.5";
        finalTab.style.cursor = "not-allowed";

        finalTab.addEventListener("click", function (e) {
            e.preventDefault();
            alert("⚠️ Your final payment is not verified yet.");
        });
    }
}


function checkSubmissionStatus(finalsubstatus,finalsubfileURL,finalsubsubmittedAt,finalsubmissionoverdue) {
    const formElement = document.getElementById('final-form');
    const summaryElement = document.getElementById('del-sub-sum-final');
    const finalcase = document.getElementById("del-case-final-download");
    
    // Jika finalsubstatus memiliki nilai (Truthy), artinya user SUDAH submit
    if (finalsubstatus) {
        // 1. Sembunyikan Form
        formElement.classList.add('d-none');
        finalcase.classList.add('d-none');
        // 2. Tampilkan Summary
        summaryElement.classList.remove('d-none');
        const filesubmitat = document.getElementById('final-file-time-sub');

        let submittedText = "No submission yet";
        if (finalsubsubmittedAt) {
            try {
                const dt = typeof finalsubsubmittedAt.toDate === "function"
                    ? finalsubsubmittedAt.toDate()
                    : new Date(finalsubsubmittedAt);
                submittedText = isNaN(dt) ? "No submission yet" : dt.toLocaleString();
            } catch {
                submittedText = "No submission yet";
            }
        }
        if (filesubmitat) filesubmitat.textContent = submittedText;


        const fileoverduestatus = document.getElementById('final-file-time-status');
        if (finalsubmissionoverdue==="no") {
            fileoverduestatus.innerText = "On Time";
        } else {
            fileoverduestatus.innerText = "Overdue";
        }

        const fileURL = document.getElementById('final-file-url');
        if (fileURL) {
            if (finalsubfileURL) {
                fileURL.innerHTML = `<a href="${finalsubfileURL}" target="_blank" class="text-primary text-decoration-underline" id="final-file-url">Open File</a>`;
            } else {
                fileURL.textContent = "No file uploaded";
            }
        }

    } else {
        formElement.classList.remove('d-none');
        summaryElement.classList.add('d-none');
    }
}


