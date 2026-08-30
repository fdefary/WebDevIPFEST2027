import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, doc, updateDoc, query, orderBy, deleteField } from "firebase/firestore";
import { DB, AUTH } from "./index.js";

// =========================
// INIT
// =========================
console.log("[INIT] treasury.js loaded");

function checkEarlyBird(joinDate) { 
    const deadline = new Date("2025-11-16T23:59:59+07:00"); 
    return joinDate <= deadline ? "Yes" : "No"; 
}

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(AUTH);
            window.location.href = "../login.html";
        } catch (err) { console.error(err); }
    });
}

// =========================
// AUTH CHECK
// =========================
onAuthStateChanged(AUTH, async (user) => {
    if (!user || user.email !== "treasury.ipfest2026@gmail.com") {
        window.location.href = "../login.html";
        return;
    }
    console.log("[AUTH] Authorized. Loading tables...");
    const regFeeValue = await loadTreasuryTable();
    const finalFeeValue = await loadTreasuryFinalTable();
    calculateGrandTotal(regFeeValue, finalFeeValue);
    setupFinalDeleteHandler();

});

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

const PRICE_TABLE = {
    "Full Hospitality": {
        Full: { "Bank BCA": 700000, "Gopay": 700000, "Paypal": 700000 / 16000 },
        DP: {
            First: { "Bank BCA": 400000, "Gopay": 400000, "Paypal": 400000 / 16000 },
            Last: { "Bank BCA": 300000, "Gopay": 300000, "Paypal": 300000 / 16000 }
        }
    },
    "Excluding Accommodation": {
        Full: { "Bank BCA": 450000, "Gopay": 450000, "Paypal": 450000 / 16000 },
        DP: {
            First: { "Bank BCA": 300000, "Gopay": 300000, "Paypal": 300000 / 16000 },
            Last: { "Bank BCA": 150000, "Gopay": 150000, "Paypal": 150000 / 16000 }
        }
    }
};

let verifiedTeams = []; // Deklarasikan di sini

// =========================
// 1. LOAD REGISTRATION TABLE
// =========================
async function loadTreasuryTable() {
    console.log("[TABLE] loadTreasuryTable() called");

    const tbody = document.getElementById("treasury-team-list");
    if (!tbody) {
        console.error("[TABLE] tbody not found");
        return 0;
    }

    tbody.innerHTML = "<tr><td colspan='8'>Loading...</td></tr>";

    try {
        const teamRef = collection(DB, "Team");
        const q = query(teamRef, orderBy("join_on", "asc"));
        const teamSnap = await getDocs(q);

        if (teamSnap.empty) {
            tbody.innerHTML = "<tr><td colspan='8'>No data found</td></tr>";
            document.getElementById("total-reg-fee").innerText = "0";
            document.getElementById("verified-teams").innerText = "0";
            document.getElementById("unverified-teams").innerText = "0";
            document.getElementById("total-reg").innerText = "0";
            return 0;
        }

        tbody.innerHTML = "";
        let index = 1;
        let totalRegFee = 0;
        let totalTeams = 0;
        let totalVerified = 0;

        verifiedTeams = []; 

        teamSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            const teamName = data.teamName || "-";
            const university = data.leader?.university || "-";
            const competition = CompetitionFullName[data.competition] || "-";
            const paymentDate = data.payment?.uploadedAt
                ? data.payment.uploadedAt.toDate().toLocaleString()
                : "Not Uploaded";

            const joinDate = data.join_on?.toDate ? data.join_on.toDate() : null;
            const earlyBird = joinDate ? checkEarlyBird(joinDate) : "-";
            const proofLink = data.payment?.proofUrl || "-";
            let paymentStatus = data.payment_status || "pending_verification";

            totalTeams++;

            if (paymentStatus === "verified") {
                totalVerified++;
                if (!verifiedTeams.includes(docId)) verifiedTeams.push(docId);
                totalRegFee += (earlyBird === "Yes" ? 200000 : 250000);
            }

            const paymentStatusId = `payment-status-${docId}`;
            const earlyBirdId = `early-bird-${docId}`;

            const rowHTML = `
                <tr>
                    <td>${index}</td>
                    <td>${teamName}</td>
                    <td>${university}</td>
                    <td>${competition}</td>
                    <td>${paymentDate}</td>
                    <td id="${earlyBirdId}">${earlyBird}</td>
                    <td>${proofLink !== "-" ? `<a href="${proofLink}" target="_blank">View</a>` : "-"}</td>
                    <td>
                        <span id="${paymentStatusId}" 
                              style="cursor:pointer; font-weight:bold; color:${paymentStatus === "verified" ? "green" : "blue"}">
                              ${paymentStatus}
                        </span>
                    </td>
                </tr>
            `;

            tbody.insertAdjacentHTML("beforeend", rowHTML);

            // ============================
            // CLICK HANDLER PAYMENT STATUS
            // ============================
            document.getElementById(paymentStatusId).onclick = async () => {
                const newStatus = paymentStatus === "verified" ? "pending_verification" : "verified";
                if (!confirm(`Change status to "${newStatus}"?`)) return;

                try {
                    await updateDoc(doc(DB, "Team", docId), { payment_status: newStatus });
                    
                    // 1. Refresh tabel ini & ambil nilai reg fee terbaru
                    const freshRegFee = await loadTreasuryTable();
                    
                    // 2. Ambil nilai finalist fee terbaru (dan render ulang tabel final agar sinkron)
                    const freshFinalFee = await loadTreasuryFinalTable();
                    
                    // 3. Update Grand Total di Dashboard & Console secara Real-time
                    calculateGrandTotal(freshRegFee, freshFinalFee);

                } catch (err) {
                    console.error("Error updating status:", err);
                }
            };

            index++;
        });

        // UPDATE DASHBOARD SUMMARY
        document.getElementById("total-reg-fee").innerText = totalRegFee.toLocaleString('id-ID');
        document.getElementById("verified-teams").innerText = totalVerified;
        document.getElementById("unverified-teams").innerText = totalTeams - totalVerified;
        document.getElementById("total-reg").innerText = totalTeams;

        return totalRegFee;

    } catch (err) {
        console.error("[TABLE] Error loading table:", err);
        tbody.innerHTML = "<tr><td colspan='8'>Error loading data</td></tr>";
        return 0;
    }
}

// =========================
// 2. LOAD FINALIST TABLE
// =========================
async function loadTreasuryFinalTable() {
    const tbody = document.getElementById("treasury-final-team-list");
    const finalistFeeEl = document.getElementById("total-fin-fee");
    const verifiedFinalEl = document.getElementById("verified-final-teams"); 

    if (!tbody) return 0; // Return 0 jika elemen tidak ada
    tbody.innerHTML = `<tr><td colspan="13">Loading...</td></tr>`;

    try {
        const snap = await getDocs(collection(DB, "Team"));
        tbody.innerHTML = "";
        let totalFinalistFee = 0;
        let totalFinalVerified = 0; 
        let index = 1;

        snap.forEach((docSnap) => {
            const team = docSnap.data();
            const teamId = docSnap.id;
            const finalReg = team.final_reg;
            if (!finalReg) return;

            const paymentStatus = finalReg.paymentStatus || "pending";
            const scheme = finalReg.paymentScheme || "-";
            const statusId = `final-status-${teamId}`;

            // 1. Tentukan Warna Status Berdasarkan Value
            let statusColor = "blue"; 
            if (paymentStatus === "verified") statusColor = "green";
            if (paymentStatus === "down_payment_verified") statusColor = "orange";

            const participants = [
                { name: `${team.leader?.firstName || ""} ${team.leader?.lastName || ""}`.trim(), method: finalReg.leader?.paymentMethod || "-", first: finalReg.leader?.paymentProof || "-", last: finalReg.leader?.lastPayment || "-", hospitality: finalReg.leader?.hospitality || "-" },
                ...(Array.isArray(finalReg.members) ? finalReg.members.map((m, idx) => ({ name: `${team.members?.[idx]?.firstName || ""} ${team.members?.[idx]?.lastName || ""}`.trim(), method: m.paymentMethod || "-", first: m.paymentProof || "-", last: m.lastPayment || "-", hospitality: m.hospitality || "-" })) : [])
            ];

            // 2. Kalkulasi Biaya & Statistik Tim Terverifikasi
            if (paymentStatus === "verified" || paymentStatus === "down_payment_verified") {
                totalFinalVerified++;
                participants.forEach(p => {
                    const h = p.hospitality;
                    const m = p.method;
                    if (PRICE_TABLE[h]) {
                        if (scheme === "Full" && paymentStatus === "verified") {
                            totalFinalistFee += (PRICE_TABLE[h].Full[m] || 0);
                        } else if (scheme === "DP") {
                            totalFinalistFee += (PRICE_TABLE[h].DP.First[m] || 0);
                            if (paymentStatus === "verified") totalFinalistFee += (PRICE_TABLE[h].DP.Last[m] || 0);
                        }
                    }
                });
            }

            // 3. Render Baris Tabel
            const rowSpan = participants.length;
            participants.forEach((p, i) => {
                let row = `<tr>`;
                if (i === 0) {
                    row += `<td rowspan="${rowSpan}">${index++}</td>
                            <td rowspan="${rowSpan}">${team.teamName || "-"}</td>
                            <td rowspan="${rowSpan}">${team.leader?.university || "-"}</td>
                            <td rowspan="${rowSpan}">${CompetitionFullName[team.competition] || "-"}</td>
                            <td rowspan="${rowSpan}">${scheme}</td>
                            <td rowspan="${rowSpan}">${finalReg.dpCategory || "-"}</td>`;
                }
                row += `<td>${p.method}</td><td>${p.name}</td>
                        <td>${p.first !== "-" ? `<a href="${p.first}" target="_blank">V1</a>` : "-"}</td>
                        <td>${p.last !== "-" ? `<a href="${p.last}" target="_blank">V2</a>` : "-"}</td>
                        <td>${p.hospitality}</td>`;
                if (i === 0) {
                    row += `<td rowspan="${rowSpan}">
                        <select id="${statusId}" class="form-select form-select-sm" 
                                style="color: ${statusColor}; font-weight: bold; border: 1px solid ${statusColor};">
                            <option value="pending" style="color: blue;" ${paymentStatus === 'pending' ? 'selected' : ''}>pending</option>
                            <option value="down_payment_verified" style="color: orange;" ${paymentStatus === 'down_payment_verified' ? 'selected' : ''}>dp_verified</option>
                            <option value="verified" style="color: green;" ${paymentStatus === 'verified' ? 'selected' : ''}>verified</option>
                        </select>
                    </td>
                    <td rowspan="${rowSpan}"><button class="btn btn-sm btn-danger" data-team="${teamId}" data-team-name="${team.teamName}">Delete</button></td>`;
                }
                row += `</tr>`;
                tbody.insertAdjacentHTML("beforeend", row);
            });

            // 4. Handler Onchange dengan Sinkronisasi Grand Total
            setTimeout(() => {
                const sel = document.getElementById(statusId);
                if (sel) {
                    sel.onchange = async () => {
                        if (!confirm(`Update status to ${sel.value}?`)) {
                            loadTreasuryFinalTable(); 
                            return;
                        }
                        await updateDoc(doc(DB, "Team", teamId), { "final_reg.paymentStatus": sel.value });
                        
                        // Eksekusi pembaruan kedua tabel dan hitung total income
                        const freshFinalFee = await loadTreasuryFinalTable(); 
                        const freshRegFee = await loadTreasuryTable();
                        calculateGrandTotal(freshRegFee, freshFinalFee);
                    };
                }
            }, 0);
        });

        // 5. Update Statistik Ke UI
        if (finalistFeeEl) finalistFeeEl.innerText = totalFinalistFee.toLocaleString('id-ID');
        if (verifiedFinalEl) verifiedFinalEl.innerText = totalFinalFinalVerified;

        // PENTING: Return nilai nominal untuk diproses fungsi kalkulasi luar
        return totalFinalistFee;

    } catch (err) { 
        console.error(err); 
        tbody.innerHTML = `<tr><td colspan="13">Error loading data</td></tr>`;
        return 0;
    }
}

// =========================
// 3. DELETE HANDLER
// =========================
function setupFinalDeleteHandler() {
    const tbody = document.getElementById("treasury-final-team-list");
    if (!tbody) return;
    
    tbody.onclick = async (e) => {
        const btn = e.target.closest("button[data-team]");
        if (!btn) return;

        // Ambil ID dari data-team dan Nama dari data-team-name
        const teamId = btn.getAttribute("data-team"); 
        const teamName = btn.getAttribute("data-team-name"); 

        if (!confirm(`Delete final registration for "${teamName}"?`)) return;

        try {
            await updateDoc(doc(DB, "Team", teamId), { 
                final_reg: deleteField() 
            });

            console.log(`[DELETE] Success for ${teamName}`);

            // Update Tabel dan Grand Total secara Real-time
            const freshFinalFee = await loadTreasuryFinalTable();
            const freshRegFee = await loadTreasuryTable();
            calculateGrandTotal(freshRegFee, freshFinalFee);

        } catch (err) {
            console.error("[DELETE] Error:", err);
            alert("Failed to delete data.");
        }
    };
}

// =========================
// 4. CALCULATE GRAND TOTAL
// =========================
function calculateGrandTotal(regFee, finalistFee) {
    const grandTotal = regFee + finalistFee;
    console.log("==============================");
    console.log(`Registration Total : Rp ${regFee.toLocaleString('id-ID')}`);
    console.log(`Finalist Total     : Rp ${finalistFee.toLocaleString('id-ID')}`);
    console.log(`GRAND TOTAL INCOME : Rp ${grandTotal.toLocaleString('id-ID')}`);
    console.log("==============================");
    const incomeEl = document.getElementById("total-income");
    if (incomeEl) incomeEl.innerText = grandTotal.toLocaleString('id-ID');
}

