import { doc, getDoc, updateDoc, serverTimestamp,collection, getDocs, setDoc,where,query } from 'firebase/firestore'

import { onAuthStateChanged, signOut } from 'firebase/auth'

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

import { DB, AUTH, STORAGE } from './index.js'
import { setToastAlert } from '../static/js/alert.js'

// =========================
// AUTH STATE
// =========================
let currentUserID = null;

onAuthStateChanged(AUTH, (user) => {
	if (!user) {
		window.location.href = '../../login.html';
		return;
	}

	currentUserID = user.uid;
	fetchUserData();
});

// =========================
// LOGOUT BUTTON
// =========================
const logoutBtn = document.querySelector("#logout-btn")

logoutBtn.addEventListener('click', () => {
	signOut(AUTH).then(() => {
		console.log("log out btn clicked")
		window.location.href = '../../login.html'
	})
	.catch((err) => {
		console.log("Cannot loggin out user", err)
	})
})


// =========================
// COMPETITION FULL NAME MAP
// =========================
const CompetitionFullName = {
	"smart competition": "Smart Competition",
};

// =========================
// WA GROUP LINKS
// =========================
const WAGroup = {
	"smart competition": "https://chat.whatsapp.com/H4ReXpGuRPHHuke5CUIWiu?mode=wwt",
};

// =========================
// FETCH USER DATA (UPDATED)
// =========================
async function fetchUserData() {
    if (!currentUserID) return;

    try {
        const docRef = doc(DB, "Team", currentUserID);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            console.error("Team data not found");
            return;
        }

        const data = snap.data();

        // 1. UI UPDATE: DATA DASAR
        // =========================
        
        // Team Leader
        document.getElementById("Team-Leader").textContent = 
            `${data.leader.firstName} ${data.leader.lastName}`;

        // Team Name
        document.getElementById("Team-Name").textContent = 
            data.teamName || "-";

        // Competition Name
        const compKey = (data.competition || "").toLowerCase();
        // Asumsi variabel CompetitionFullName sudah didefinisikan secara global
        document.getElementById("Competition-Name").textContent = 
            (typeof CompetitionFullName !== 'undefined' ? CompetitionFullName[compKey] : data.competition) || "-";

        // 2. UI UPDATE: WHATSAPP GROUP
        // =========================
        const waEl = document.getElementById("WhatsApp-Group");
        // Asumsi variabel WAGroup sudah didefinisikan secara global
        const waLink = (typeof WAGroup !== 'undefined' ? WAGroup[compKey] : "#") || "#";

        // Cek pembayaran Preliminary (Bukan Final)
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

        // 3. UI UPDATE: MEMBERS LIST
        // =========================
        const members = data.members || [];
        if (members.length > 0) {
            const names = members.map(m => `${m.firstName} ${m.lastName}`);
            document.getElementById("Team-Member").textContent = names.join(", ");
        } else {
            document.getElementById("Team-Member").textContent = "-";
        }

        // 4. UI UPDATE: PRELIMINARY PAYMENT STATUS
        // =========================
        let prelimPaymentText = data.payment_status === "verified" ? "Verified" : "Pending";
        document.getElementById("Payment-Status").textContent = 
            prelimPaymentText || "Not Submitted";


        // ============================================================
        // 5. FINAL ROUND SETUP (UPDATED)
        // ============================================================
        
        // A. Ambil Data Status Kelolosan (Sub Preliminary)
        const subPrelim = data.sub_preliminary || {};
        const finalStatusRaw = subPrelim.final; // true, false, or null

        // B. Ambil Data Registrasi Final
        const finalData = data.final_reg || {}; 
        const finalPaymentStatusRaw = finalData.paymentStatus || null; // "pending", "verified", etc.

        // C. Tentukan Teks Tampilan untuk UI (Final Payment)
        // Ambil data payment dari database
        let finalStatusText = "Not Paid"; // default

        // Mapping status database ke teks user-friendly
        const paymentTextMap = {
            pending: "Pending",
            down_payment_verified: "Down Payment Verified",
            verified: "Verified"
        };

        // Gunakan mapping, kalau null/undefined tetap "Not Paid"
        finalStatusText = paymentTextMap[finalPaymentStatusRaw] || "Not Paid";

        // D. Update Elemen UI "Final-Payment-Status"
        const finalPaymentStatusEl = document.getElementById("Final-Payment-Status");
        if (finalPaymentStatusEl) {
            finalPaymentStatusEl.textContent = finalStatusText;
        }

        // E. Jalankan Fungsi Setup Tombol/Link Final
        // Kita oper 'finalPaymentStatusRaw' (kode status) bukan teks tampilannya
        // agar logika di dalam setupFinalRoundLink bekerja dengan benar (if === 'verified')
        setupFinalRoundLink(
            finalStatusRaw, 
            currentUserID, 
            finalPaymentStatusRaw, 
            data.competition
        );

    } catch (err) {
        console.error("Failed to fetch data:", err);
    }
}

// =====================================
// FINAL ROUND LINK SETUP (OPTIMIZED)
// =====================================
async function setupFinalRoundLink(finalStatusRaw, currentUserID, finalPaymentStatus, competition) {
    // 1. Ambil Elemen DOM
    let finalLink = document.getElementById("Final-Round-Registration");
    let leaderboardDisplay = document.getElementById("Preliminary-Leaderboard"); 
    const paymentDisplay = document.getElementById("Final-Payment-Status"); 

    // Guard Clause: Jika tombol registrasi tidak ada, hentikan fungsi
    if (!finalLink) return;

    // -----------------------------------------------------------
    // BAGIAN 1: LOGIKA LEADERBOARD (VIEW & MODAL)
    // -----------------------------------------------------------
    if (leaderboardDisplay) {
        // Clone node untuk reset event listener lama agar tidak menumpuk
        const newLeaderboardDisplay = leaderboardDisplay.cloneNode(true);
        leaderboardDisplay.parentNode.replaceChild(newLeaderboardDisplay, leaderboardDisplay);
        leaderboardDisplay = newLeaderboardDisplay; // Update referensi variabel

        // Waktu Pembukaan: 3 Januari 2026, 11:00 UTC (18:00 WIB)
        const openTimeUTC = Date.UTC(2026, 0, 3, 11, 0, 0); 
        const nowUTC = Date.now();
        const isOpen = nowUTC >= openTimeUTC;

        // Set Tampilan Teks
        leaderboardDisplay.textContent = "View";
        leaderboardDisplay.style.textDecoration = "underline";

        if (!isOpen) {
            // KONDISI: LEADERBOARD TERKUNCI
            leaderboardDisplay.style.color = "#9ca3af"; // Abu-abu
            leaderboardDisplay.style.cursor = "not-allowed";

            leaderboardDisplay.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                alert("Leaderboard can only be accessed starting January 3, 2026 at 6:00 PM (Jakarta Time, GMT+7)");
            });

        } else {
            // KONDISI: LEADERBOARD TERBUKA
            leaderboardDisplay.style.color = "#4c1d95"; // Ungu gelap
            leaderboardDisplay.style.cursor = "pointer";

            leaderboardDisplay.addEventListener("click", (e) => {
                e.preventDefault();
                // Pastikan fungsi handleOpenLeaderboard dibuat nanti
                if (typeof handleOpenLeaderboard === 'function') {
                    handleOpenLeaderboard(competition);
                } else {
                    console.warn("Function handleOpenLeaderboard is not defined yet.");
                }
            });
        }
    }

    // -----------------------------------------------------------
    // BAGIAN 2: LOGIKA PAYMENT SUDAH VERIFIED (PRIORITAS UTAMA)
    // -----------------------------------------------------------
    // Jika user sudah bayar dan diverifikasi, tombol registrasi dimatikan
    if (finalPaymentStatus === "verified") {
        finalLink.textContent = "Registered";
        finalLink.style.pointerEvents = "none";
        finalLink.style.opacity = "0.7";
        finalLink.removeAttribute("href");
        
        if (paymentDisplay) {
            paymentDisplay.textContent = "Verified";
            paymentDisplay.style.color = "#198754"; // Hijau bootstrap (opsional visual cue)
        }
        return; // Selesai, tidak perlu cek status kelolosan lagi
    }

    // -----------------------------------------------------------
    // BAGIAN 3: RESET TOMBOL REGISTRASI (Agar bersih dari event lama)
    // -----------------------------------------------------------
    const newFinalLink = finalLink.cloneNode(true);
    finalLink.parentNode.replaceChild(newFinalLink, finalLink);
    finalLink = newFinalLink; // Update referensi variabel

    // -----------------------------------------------------------
    // BAGIAN 4: LOGIKA STATUS KELOLOSAN (PASSED / FAILED / PENDING)
    // -----------------------------------------------------------

    if (finalStatusRaw === true) {
        // ============================
        // SKENARIO A: LOLOS (PASSED) -> TOMBOL "REGIST" AKTIF
        // ============================
        
        finalLink.textContent = "Regist";
        finalLink.style.pointerEvents = "auto";
        finalLink.style.opacity = "1";
        finalLink.style.cursor = "pointer";
        
        // Reset style ke default CSS (jika sebelumnya ada inline style aneh)
        finalLink.style.backgroundColor = ""; 
        finalLink.style.borderColor = "";
        finalLink.style.color = "";
        finalLink.removeAttribute("href");

        // Event Listener: Buka Modal Pembayaran
        finalLink.addEventListener("click", async (e) => {
            e.preventDefault();

            try {
                // Ambil data terbaru dari Firestore untuk memastikan data akurat saat klik
                // Pastikan fungsi getDoc dan doc dari firebase sudah diimport
                const docRef = doc(DB, "Team", currentUserID);
                const snap = await getDoc(docRef);

                if (!snap.exists()) {
                    alert("Team data not found.");
                    return;
                }

                const teamData = snap.data();
                
                // Panggil fungsi modal pembayaran (akan dibuat nanti)
                if (typeof generateFinalModal === 'function') {
                     generateFinalModal(teamData); 
                     
                     const modalElement = document.getElementById("finalPaymentModal");
                     if (modalElement) {
                         const finalModal = new bootstrap.Modal(modalElement);
                         finalModal.show();
                     }
                } else {
                    console.warn("Function generateFinalModal is not defined yet.");
                }
            } catch (error) {
                console.error("Error fetching team data:", error);
                alert("An error occurred while loading registration data.");
            }
        });

        // Update status text di UI
        if (paymentDisplay) {
            let displayText = "Not Paid"; // default

            if (finalPaymentStatus === "pending") {
                displayText = "Pending";
            } else if (finalPaymentStatus === "down_payment_verified") {
                displayText = "Down Payment Verified";
            } else if (finalPaymentStatus === "verified") {
                displayText = "Verified";
            }

            paymentDisplay.textContent = displayText;
        }

    } else if (finalStatusRaw === false) {
        // ============================
        // SKENARIO B: TIDAK LOLOS (FAILED) -> TOMBOL PESAN SEMANGAT
        // ============================

        finalLink.textContent = "A Message For You"; 
        
        // Styling khusus tombol pesan
        finalLink.style.pointerEvents = "auto"; 
        finalLink.style.cursor = "pointer";
        finalLink.style.backgroundColor = "transparent"; 
        finalLink.style.borderColor = "rgba(255, 255, 255, 0.6)"; // Outline putih transparan
        finalLink.style.borderWidth = "1px";
        finalLink.style.borderStyle = "solid";
        finalLink.style.color = "#ffffff"; 
        finalLink.style.opacity = "1"; 
        finalLink.style.boxShadow = "none";
        finalLink.removeAttribute("href");

        // Event Listener: Buka Modal Semangat
        finalLink.addEventListener("click", async (e) => {
            e.preventDefault();
            
            try {
                const docRef = doc(DB, "Team", currentUserID);
                const snap = await getDoc(docRef);
                const teamName = snap.exists() ? snap.data().teamName : "Participant";
                
                // Panggil fungsi modal semangat (akan dibuat nanti)
                if (typeof generateEncouragementModal === 'function') {
                    generateEncouragementModal(teamName);
                    
                    const modalElement = document.getElementById("finalPaymentModal"); 
                    if (modalElement) {
                        // Cek instance modal yang sudah ada atau buat baru
                        let finalModal = bootstrap.Modal.getInstance(modalElement);
                        if (!finalModal) {
                            finalModal = new bootstrap.Modal(modalElement);
                        }
                        finalModal.show();
                    }
                } else {
                    console.warn("Function generateEncouragementModal is not defined yet.");
                }
            } catch (error) {
                console.error("Error fetching team name:", error);
            }
        });

        // Kosongkan Status Payment karena tidak lolos
        if (paymentDisplay) {
            paymentDisplay.textContent = "-";
            paymentDisplay.style.opacity = "0.5"; 
        }
        
    } else {
        // ============================
        // SKENARIO C: PENDING (NULL/UNDEFINED) -> TAMPILAN STANDAR
        // ============================
        
        finalLink.textContent = "Pending";
        finalLink.style.pointerEvents = "none"; // Tidak bisa diklik
        finalLink.style.opacity = "0.5"; // Tampilan redup
        finalLink.removeAttribute("href");
        
        if (paymentDisplay) {
            paymentDisplay.textContent = "Pending";
        }
    }
}

// =====================================
// GENERATE MODAL SEMANGAT (HTML - ORIGINAL STRUCTURE)
// =====================================
function generateEncouragementModal(teamName) {
    const wrapper = document.getElementById("final-payment-wrapper");

    // --- Hapus Background Putih Bawaan Bootstrap ---
    // Ini penting agar gradasi CSS Anda (#encourage-modal-card) yang terlihat, bukan kotak putih bootstrap
    const parentContent = wrapper.closest('.modal-content');
    if (parentContent) {
        parentContent.style.backgroundColor = 'transparent';
        parentContent.style.border = 'none';
        parentContent.style.boxShadow = 'none';
    }
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
        parentContent.style.backgroundColor = ''; 
        parentContent.style.border = '';
        parentContent.style.boxShadow = '';
    }

    if (wrapper.innerHTML.trim() !== "") return;

    const leaderName = `${teamData.leader.firstName} ${teamData.leader.lastName}`;

    let memberFormsHTML = "";
    if (teamData.members && teamData.members.length > 0) {
        teamData.members.forEach((member, i) => {
            memberFormsHTML += `
                <div class="member-final-pay-form">
                    <div class="form-header-row mb-3">
                        <div class="icon-box-member me-3">👤</div> <div class="text-group"> <div class="role-label">Member</div> 
                            <h5 class="name-label">${member.firstName} ${member.lastName}</h5>
                        </div>
                    </div>

                    <div class="price-display-box">
                        <span class="price-label">AMOUNT TO PAY</span>
                        <span class="price-value" id="member-price-${i}">Calculating...</span>
                    </div>
                    
                    <div id="member-payment-method-info-${i}" class="method-info-box"></div>

                    <div class="mb-3">
                        <label class="form-label">UPLOAD PAYMENT PROOF</label>
                        <input type="file" class="form-control" id="member-payment-submit-${i}" name="member-payment-submit-${i}">
                    </div>

                    <div class="row g-3">
                        <div class="col-6">
                            <label class="form-label">HOSPITALITY</label>
                            <select class="form-select" id="member-hospitality-type-${i}" name="member-hospitality-type-${i}" required>
                                <option value="Full Hospitality">Full Hospitality</option>
                                <option value="Excluding Accommodation">Excluding Accommodation</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label">PAYMENT METHOD</label>
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
                        
                        <div id="leader-final-pay-form">
                            
                            <div class="form-header-row mb-3">
                                <div class="icon-box-leader me-3">👑</div> <div class="text-group"> <div class="role-label text-leader">Team Leader</div>
                                    <h5 class="name-label text-leader-name">${leaderName}</h5>
                                </div>
                            </div>
                            
                            <div class="price-display-box">
                                <span class="price-label">AMOUNT TO PAY</span>
                                <span class="price-value" id="final-payment-price">Calculating...</span>
                            </div>

                            <div id="final-payment-method-info" class="method-info-box"></div>

                            <div class="mb-3">
                                <label class="form-label">UPLOAD PAYMENT PROOF</label>
                                <input type="file" id="final-leader-payment-submit" name="final-leader-payment-submit" class="form-control">
                            </div>

                            <div class="row g-3 mb-2">
                                <div class="col-6">
                                    <label class="form-label">HOSPITALITY</label>
                                    <select id="leader-hospitality-type" name="leader-hospitality-type" class="form-select" required>
                                        <option value="Full Hospitality">Full Hospitality</option>
                                        <option value="Excluding Accommodation">Excluding Accommodation</option>
                                    </select>
                                </div>
                                <div class="col-6">
                                    <label class="form-label">PAYMENT SCHEME</label>
                                    <select id="leader-payment-type" name="leader-payment-type" class="form-select" required>
                                        <option value="Full">Full Payment</option>
                                        <option value="DP" selected>Down Payment</option>
                                    </select>
                                </div>
                            </div>

                            <div class="row g-3"> 
                                <div class="col-6">
                                    <label class="form-label">PAYMENT METHOD</label>
                                    <select id="leader-payment-method" name="leader-payment-method" class="form-select" required>
                                        <option value="Gopay">Gopay</option>
                                        <option value="Bank BCA">Bank BCA</option>
                                        <option value="Paypal">Paypal</option>
                                    </select>
                                </div>
                                
                                <div class="col-6" id="down-payment-category-col">
                                    <label class="form-label">CATEGORY (DP)</label>
                                    <select id="leader-down-payment-category" name="leader-down-payment-category" class="form-select">
                                        <option value="First">First Payment</option>
                                        <option value="Last">Last Payment</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        ${memberFormsHTML}

                        <div class="custom-rules-box mt-3">
                            <input class="form-check-input" type="checkbox" id="final-rules-check" required>
                            <label class="custom-rules-label" for="final-rules-check">
                                I confirm that all data is correct and I have read the 
                                <a href="#" target="_blank">Finalist Payment Rules</a>.
                            </label>
                        </div>
                    </form>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn-cancel-custom" data-bs-dismiss="modal">Cancel</button>
                <button id="final-payment-submit-btn" type="submit" form="final-payment-upload">Submit Payment</button>
            </div>
        </div>
    `;

    // --- JS LOGIC FIX ---
    // --- DP CATEGORY VISIBILITY CONTROL (SAFE FIX) ---

    const paymentTypeSelect = document.getElementById("leader-payment-type");
    const downPaymentCategoryCol = document.getElementById("down-payment-category-col");
    const downPaymentCategorySelect = document.getElementById("leader-down-payment-category");

    function toggleDpCategory() {
        if (!paymentTypeSelect || !downPaymentCategoryCol) return;

        const isDP = paymentTypeSelect.value === "DP";

        // PAKAI HIDDEN (ANTI CSS OVERRIDE)
        downPaymentCategoryCol.hidden = !isDP;

        if (downPaymentCategorySelect) {
            downPaymentCategorySelect.disabled = !isDP;
            downPaymentCategorySelect.required = isDP;
        }
    }

    if (paymentTypeSelect) {
        paymentTypeSelect.addEventListener("change", toggleDpCategory);
        toggleDpCategory(); // initial state
    }



    setTimeout(() => {
        if (typeof initFinalPaymentBindings === "function") initFinalPaymentBindings(teamData);
        if (typeof setupFinalSubmitListener === "function") setupFinalSubmitListener(teamData);
    }, 100);
}

// =====================================
// 3. LOGIKA HARGA & BINDING DATA
// =====================================
const PRICE_TABLE = {
    "Full Hospitality": {
        Full: { "Bank BCA": 700000, "Gopay": 700000, "Paypal": 50 },
        DP: {
            First: { "Bank BCA": 400000, "Gopay": 400000, "Paypal": 30 },
            Last: { "Bank BCA": 300000, "Gopay": 300000, "Paypal": 20 }
        }
    },
    "Excluding Accommodation": {
        Full: { "Bank BCA": 450000, "Gopay": 450000, "Paypal": 32 },
        DP: {
            First: { "Bank BCA": 300000, "Gopay": 300000, "Paypal": 20 },
            Last: { "Bank BCA": 150000, "Gopay": 150000, "Paypal": 12 }
        }
    }
};

function initFinalPaymentBindings(teamData) {
    console.log("Initializing Payment Bindings...");

    const leaderHospitality = document.getElementById("leader-hospitality-type");
    const leaderPaymentScheme = document.getElementById("leader-payment-type");
    const leaderPaymentMethod = document.getElementById("leader-payment-method");
    const leaderCategory = document.getElementById("leader-down-payment-category");
    const downPaymentCategoryCol = document.getElementById("down-payment-category-col"); // Ambil kolom pembungkusnya
    
    const leaderPriceSpan = document.getElementById("final-payment-price");
    const leaderInfoBox = document.getElementById("final-payment-method-info");

    // 1. Fungsi Get Price dari Tabel
    function getPrice(hosp, scheme, method, category = "First") {
        if (scheme === "Full") {
            return PRICE_TABLE[hosp].Full[method];
        } else {
            const cat = category || "First"; 
            return PRICE_TABLE[hosp].DP[cat][method];
        }
    }

    // 2. Fungsi Update Info Rekening
    function updatePaymentMethodInfo(infoBox, method) {
        let text = "";
        switch (method) {
            case "Bank BCA": text = "<strong>BCA</strong> — 2650508800 (Mochammad Rafly Ghazany A)"; break;
            case "Gopay": text = "085655226900 (Rafly Ghazany)"; break;
            case "Paypal": text = `<a href="https://www.paypal.me/RaflyGhazany" target="_blank" class="text-primary">paypal.me/RaflyGhazany</a>`; break;
        }
        infoBox.innerHTML = `<small>${text}</small>`;
    }

    // 3. FUNGSI UTAMA: Toggle DP & Update Harga
    function updateLeaderUI() {
        // A. Logika Visibilitas Kolom DP
        if (leaderPaymentScheme.value === "DP") {
            downPaymentCategoryCol.style.display = "block"; // Munculkan
            leaderCategory.disabled = false;
        } else {
            downPaymentCategoryCol.style.display = "none";  // Sembunyikan (hilang dari layout)
            leaderCategory.disabled = true;
        }

        // B. Logika Hitung Harga
        const hosp = leaderHospitality.value;
        const scheme = leaderPaymentScheme.value;
        const method = leaderPaymentMethod.value;
        const category = leaderCategory.value;

        const price = getPrice(hosp, scheme, method, category);
        
        leaderPriceSpan.textContent = method === "Paypal" 
            ? `$${price.toFixed(2)}` 
            : `IDR ${price.toLocaleString('id-ID')}`;

        updatePaymentMethodInfo(leaderInfoBox, method);
    }

    // 4. Event Listeners Leader
    // Setiap kali ada yang berubah, jalankan updateLeaderUI
    leaderHospitality.addEventListener("change", () => { updateLeaderUI(); updateAllMemberPrices(); });
    leaderPaymentScheme.addEventListener("change", () => { updateLeaderUI(); updateAllMemberPrices(); }); // Ini yang mentrigger DP muncul/hilang
    leaderPaymentMethod.addEventListener("change", () => { updateLeaderUI(); });
    leaderCategory.addEventListener("change", () => { updateLeaderUI(); updateAllMemberPrices(); });

    // 5. Inisialisasi Awal
    updateLeaderUI();

    // 6. Fungsi Update Harga Member
    function updateAllMemberPrices() {
        if (teamData.members && teamData.members.length > 0) {
            teamData.members.forEach((member, i) => {
                const hosp = document.getElementById(`member-hospitality-type-${i}`);
                const method = document.getElementById(`member-payment-method-${i}`);
                const priceSpan = document.getElementById(`member-price-${i}`);
                const infoBox = document.getElementById(`member-payment-method-info-${i}`);

                const hospVal = hosp.value;
                const methodVal = method.value;
                // Member mengikuti Scheme & Category dari Leader
                const scheme = leaderPaymentScheme.value; 
                const category = leaderCategory.value;    

                const price = getPrice(hospVal, scheme, methodVal, category);
                
                priceSpan.textContent = methodVal === "Paypal" 
                    ? `$${price.toFixed(2)}` 
                    : `IDR ${price.toLocaleString('id-ID')}`;

                updatePaymentMethodInfo(infoBox, methodVal);
            });
        }
    }

    // 7. Event Listener untuk Member
    if (teamData.members && teamData.members.length > 0) {
        teamData.members.forEach((member, i) => {
            const hosp = document.getElementById(`member-hospitality-type-${i}`);
            const method = document.getElementById(`member-payment-method-${i}`);

            hosp.addEventListener("change", updateAllMemberPrices);
            method.addEventListener("change", updateAllMemberPrices);
        });
        updateAllMemberPrices();
    }
}

// =====================================
// 4. LISTENER SUBMIT & VALIDASI
// =====================================
function setupFinalSubmitListener(teamData) {
    const finalPaymentSubmitBtn = document.getElementById("final-payment-submit-btn");
    
    if (!finalPaymentSubmitBtn) return;

    // Reset event listener agar tidak duplikat (penting jika modal dibuka tutup)
    const newBtn = finalPaymentSubmitBtn.cloneNode(true);
    finalPaymentSubmitBtn.parentNode.replaceChild(newBtn, finalPaymentSubmitBtn);

    newBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        // VALIDASI CHECKBOX
        const checkboxRead = document.getElementById("final-rules-check");
        if (!checkboxRead.checked) {
            alert("⚠️ Please read and check the Finalist Payment Rules agreement.");
            checkboxRead.focus();
            return;
        }

        // VALIDASI FILE UPLOAD (Leader & Member)
        const leaderFile = document.getElementById("final-leader-payment-submit");
        if (leaderFile.files.length === 0) {
            alert("⚠️ Leader must upload payment proof.");
            leaderFile.focus();
            return;
        }

        if (teamData.members) {
            for (let i = 0; i < teamData.members.length; i++) {
                const memFile = document.getElementById(`member-payment-submit-${i}`);
                if (memFile.files.length === 0) {
                    alert(`⚠️ ${teamData.members[i].firstName} must upload payment proof.`);
                    memFile.focus();
                    return;
                }
            }
        }

        // PROSES SUBMIT
        const originalText = newBtn.innerText;
        newBtn.innerText = "Processing...";
        newBtn.disabled = true;

        try {
            const formData = collectFinalFormData(teamData);
            // Ambil User ID dari object auth atau global variable
            const currentUserID = AUTH.currentUser.uid; 
            
            await submitFinalRegistration(currentUserID, formData, teamData);

            alert("✅ Payment submitted successfully!\nData is under verification. See you at the Final Round!");
            window.location.reload();

        } catch (err) {
            console.error(err);
            alert("❌ Failed to submit data. Please check your connection.");
            newBtn.innerText = originalText;
            newBtn.disabled = false;
        }
    });
}

// =====================================
// 5. HELPER: COLLECT FORM DATA
// =====================================
function collectFinalFormData(teamData) {
    return {
        leader: {
            hospitality: document.getElementById("leader-hospitality-type").value,
            paymentMethod: document.getElementById("leader-payment-method").value,
            file: document.getElementById("final-leader-payment-submit").files[0],
        },
        members: (teamData.members || []).map((m, i) => ({
            hospitality: document.getElementById(`member-hospitality-type-${i}`).value,
            paymentMethod: document.getElementById(`member-payment-method-${i}`).value,
            file: document.getElementById(`member-payment-submit-${i}`).files[0],
        })),
        paymentScheme: document.getElementById("leader-payment-type").value,
        dpCategory: document.getElementById("leader-down-payment-category").value,
    };
}

// =====================================
// SUBMIT KE FIREBASE
// =====================================
async function submitFinalRegistration(currentUID, formData, teamData) {

    const teamRef = doc(DB, "Team", currentUID);
    const snap = await getDoc(teamRef);
    const timeStamp = Date.now();

    // 1. Upload Leader File
    let leaderURL = null;
    if (formData.leader.file) {
        const leaderPath = `finalreg_submissions/${currentUID}/leader_${timeStamp}`;
        const leaderRef = ref(STORAGE, leaderPath);
        const uploadRes = await uploadBytes(leaderRef, formData.leader.file);
        leaderURL = await getDownloadURL(uploadRes.ref);
    }

    // 2. Upload Member Files
    const memberURLs = [];
    for (let i = 0; i < formData.members.length; i++) {
        const memFile = formData.members[i].file;
        if (memFile) {
            const memPath = `finalreg_submissions/${currentUID}/member_${i}_${timeStamp}`;
            const memRef = ref(STORAGE, memPath);
            const uploadRes = await uploadBytes(memRef, memFile);
            const url = await getDownloadURL(uploadRes.ref);
            memberURLs.push(url);
        } else {
            memberURLs.push(null);
        }
    }

    const existing = snap.exists() ? snap.data().final_reg : null;
    const isDPFirst = formData.paymentScheme === "DP" && formData.dpCategory === "First";
    const isDPLast = formData.paymentScheme === "DP" && formData.dpCategory === "Last";

    // --- BUILD DATA OBJECT ---
    let updateData = {};

    if (!existing || formData.paymentScheme === "Full" || isDPFirst) {
        // OVERWRITE / NEW ENTRY / DP FIRST
        updateData = {
            final_reg: {
                leader: {
                    hospitality: formData.leader.hospitality,
                    paymentMethod: formData.leader.paymentMethod,
                    paymentProof: leaderURL || existing?.leader?.paymentProof || "-", // Pakai URL baru atau lama
                    lastPayment: existing?.leader?.lastPayment || "-" // Pertahankan data lama jika ada
                },
                members: formData.members.map((m, i) => ({
                    hospitality: m.hospitality,
                    paymentMethod: m.paymentMethod,
                    paymentProof: memberURLs[i] || existing?.members?.[i]?.paymentProof || "-",
                    lastPayment: existing?.members?.[i]?.lastPayment || "-"
                })),
                paymentScheme: formData.paymentScheme,
                dpCategory: formData.dpCategory,
                createdAt: existing ? existing.createdAt : serverTimestamp(),
                updatedAt: serverTimestamp(),
                paymentStatus: "pending" // Selalu reset ke pending saat upload baru
            }
        };
    } else if (isDPLast) {
        // UPDATE PARTIAL (Hanya update field lastPayment)
        const updatedLeader = {
            ...existing.leader,
            lastPayment: leaderURL || existing.leader.lastPayment // Update kolom lastPayment
        };
        
        const updatedMembers = existing.members.map((m, i) => ({
            ...m,
            lastPayment: memberURLs[i] || m.lastPayment
        }));

        updateData = {
            "final_reg.leader": updatedLeader,
            "final_reg.members": updatedMembers,
            "final_reg.dpCategory": "Last",
            "final_reg.lastPaymentAt": serverTimestamp(),
            "final_reg.paymentStatus": "pending"
        };
    }

    // Eksekusi Update Firestore
    await updateDoc(teamRef, updateData);
}

// =====================================
// HANDLE OPEN LEADERBOARD (PESERTA VIEW)
// =====================================
async function handleOpenLeaderboard(userCompetition) {
    const tbody = document.getElementById("prelim-table-body");
    const modalWrapper = document.getElementById("prelim-leaderboard-modal-wrapper");
    
    // Validasi parameter
    if (!userCompetition) {
        console.error("Error: userCompetition is missing");
        return;
    }

    // 1. Reset & Tampilkan Loading
    if (tbody) {
        // PERBAIKAN: colspan="5" karena ada 5 kolom di HTML Anda
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center p-5 text-muted">
                    <div class="spinner-border text-primary spinner-border-sm mb-2" role="status"></div> 
                    <div>Loading Leaderboard...</div>
                </td>
            </tr>
        `;
    }
    
    // 2. Buka Modal
    if (modalWrapper) {
        // Hapus class hidden dan set display flex
        modalWrapper.classList.remove("custom-modal-hidden");
        modalWrapper.style.display = 'flex';
    }

    try {
        // 3. Query Firebase
        const teamsRef = collection(DB, "Team");
        const q = query(
            teamsRef, 
            where("competition", "==", userCompetition) 
        );
        
        const querySnapshot = await getDocs(q);
        let qualifiedTeams = [];

        // 4. Filtering Data
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const prelim = data.sub_preliminary || {};

            const rankVal = Number(prelim.rank);
            const scoreVal = Number(prelim.score);
            
            // Validasi data valid (punya rank & score)
            const hasRank = prelim.rank !== null && prelim.rank !== undefined && rankVal > 0;
            const hasScore = prelim.score !== null && prelim.score !== undefined && !isNaN(scoreVal);

            if (hasRank && hasScore) {
                qualifiedTeams.push({
                    id: doc.id,
                    teamName: data.teamName,
                    university: data.leader?.university || "-",
                    rank: rankVal,
                    score: scoreVal,
                    finalStatus: prelim.final 
                });
            }
        });

        // 5. Sorting (Rank 1 paling atas)
        qualifiedTeams.sort((a, b) => a.rank - b.rank);

        // 6. Rendering ke HTML
        if (tbody) {
            tbody.innerHTML = ""; // Hapus loading

            // KONDISI: DATA KOSONG
            if (qualifiedTeams.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center p-5 text-muted" style="font-style: italic;">
                            <div style="font-size: 2rem; margin-bottom: 10px;">📊</div>
                            Leaderboard data is not available yet.
                        </td>
                    </tr>`;
                return;
            }

            // KONDISI: ADA DATA
            // Loop dan render (index + 1 sebagai Nomor Urut)
            qualifiedTeams.forEach((team, index) => {
                renderLeaderboardRow(tbody, team, index + 1);
            });
        }

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger p-4">
                        Leaderboard data is not available yet.
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * RENDER BARIS TABEL (5 KOLOM SESUAI HTML)
 */
function renderLeaderboardRow(tbody, team, displayNo) {
    const row = document.createElement("tr");
    row.className = "align-middle"; // Agar teks vertikal di tengah

    // A. Label Status Final
    let statusBadge = `<span class="badge rounded-pill bg-secondary bg-opacity-75 text-white fw-normal px-3">Pending</span>`;
    if (team.finalStatus === true) {
        statusBadge = `<span class="badge rounded-pill bg-success bg-opacity-75 text-white fw-normal px-3">Passed</span>`;
    } else if (team.finalStatus === false) {
        statusBadge = `<span class="badge rounded-pill bg-danger bg-opacity-75 text-white fw-normal px-3">Failed</span>`;
    }

    // B. Format Score (2 Desimal)
    const formattedScore = parseFloat(team.score).toFixed(2);

    // C. Render 5 Kolom: No, Nama, Status, Rank, Score
    row.innerHTML = `
        <td class="text-center text-muted fw-bold">
            ${displayNo}
        </td>
        
        <td>
            <div style="font-weight:700; color:#334155; font-size:14px;">
                ${team.teamName || "No Name"}
            </div>
            <div style="font-size:11px; color:#94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
                ${team.university}
            </div>
        </td>

        <td class="text-center">${statusBadge}</td>

        <td class="text-center">
             <div style="
                width: 30px; height: 30px; line-height: 30px; 
                border-radius: 50%; 
                background: ${team.rank <= 3 ? '#FFD700' : '#f1f5f9'}; 
                color: ${team.rank <= 3 ? '#fff' : '#64748b'}; 
                font-weight: 800; margin: 0 auto;
                box-shadow: ${team.rank <= 3 ? '0 2px 5px rgba(255, 215, 0, 0.4)' : 'none'};
            ">
                ${team.rank}
            </div>
        </td>

        <td class="text-center">
            <span style="font-weight: 700; color: #4c1d95; font-family: monospace; font-size: 14px;">
                ${formattedScore}
            </span>
        </td>
    `;

    tbody.appendChild(row);
}

// =====================================
// FUNGSI UNTUK MENUTUP MODAL (SESUAI ONCLICK HTML)
// =====================================
function closePrelimLeaderboardModal() {
    const modalWrapper = document.getElementById("prelim-leaderboard-modal-wrapper");
    if (modalWrapper) {
        modalWrapper.style.display = 'none';
        modalWrapper.classList.add("custom-modal-hidden"); // Optional: jika pakai class hidden
    }
}

// Tutup jika klik di luar modal (Background gelap)
window.addEventListener("click", function(event) {
    const modalWrapper = document.getElementById("prelim-leaderboard-modal-wrapper");
    if (event.target === modalWrapper) {
        closePrelimLeaderboardModal();
    }
});