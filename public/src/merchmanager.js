import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, onSnapshot, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { DB, AUTH } from "./index.js";

// =========================
// AUTH CHECK (ENTREPRENEURSHIP)
// =========================
onAuthStateChanged(AUTH, async (user) => {
    console.log("[AUTH] Checking Entrepreneurship Access...", user);

    if (!user) {
        window.location.href = "../login.html";
        return;
    }

    try {
        // Paksa refresh token untuk memastikan claims terbaru
        await user.getIdToken(true);
        const idTokenResult = await user.getIdTokenResult();
        console.log("[AUTH] User claims verified");
    } catch (err) {
        console.error("[AUTH] Token error:", err);
    }

    // Ganti email sesuai dengan akun Entrepreneurship/Merchandise Anda
    const authorizedEmail = "entrepreneurship.ipfest2026@gmail.com"; 

    if (user.email !== authorizedEmail) {
        console.warn(`[AUTH] Unauthorized Access Attempt: ${user.email}`);
        alert("You do not have permission to access this dashboard.");
        window.location.href = "../login.html";
        return;
    }

    console.log("[AUTH] Welcome Korlap Fem! Loading data...");
    
    // Panggil fungsi inisialisasi dashboard
    initEntrepreneurshipDashboard();
});

// =========================
// LOGOUT HANDLER
// =========================
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(AUTH);
            window.location.href = "../login.html";
        } catch (err) {
            console.error("Logout failed:", err);
        }
    });
}
// =========================
// LOAD MERCHANDISE ORDERS TABLE
// =========================
async function loadMerchTable() {
    console.log("[TABLE] loadMerchTable() with onSnapshot called");

    const tbody = document.getElementById("treasury-merch-list");
    const totalRevenueEl = document.getElementById("total-merch-revenue");
    const pendingOrdersEl = document.getElementById("pending-orders-count");

    if (!tbody) return;

    // Referensi koleksi dan Query (Urutkan berdasarkan waktu terbaru)
    const merchRef = collection(DB, "Merch");
    const q = query(merchRef, orderBy("createdAt", "desc"));

    // Listener Real-time
    onSnapshot(q, (snapshot) => {
        tbody.innerHTML = "";
        let index = 1;
        let totalRevenue = 0;
        let pendingCount = 0;

        if (snapshot.empty) {
            tbody.innerHTML = "<tr><td colspan='6' class='text-center'>No merchandise orders found</td></tr>";
            if (totalRevenueEl) totalRevenueEl.innerText = "Rp 0";
            if (pendingOrdersEl) pendingOrdersEl.innerText = "0";
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;

            // 1. Kalkulasi Statistik (berdasarkan totalAmount number)
            if (data.status === "verified") {
                totalRevenue += (data.totalAmount || 0);
            } else if (data.status === "pending") {
                pendingCount++;
            }

            // 2. Format Tanggal (createdAt timestamp)
            const orderDate = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString('id-ID') : "-";

            // 3. Mapping Items Array (Struktur Map: name, quantity)
            const itemsList = data.items.map(item => 
                `<li>${item.name} <span class="badge bg-light text-dark" style="border: 1px solid #ddd;">x${item.quantity}</span></li>`
            ).join('');

            // 4. Status Styling
            let currentStatus = data.status || "pending";
            const statusColor = currentStatus === "verified" ? "green" : (currentStatus === "rejected" ? "red" : "blue");
            const statusId = `status-click-${docId}`;

            const rowHTML = `
                <tr>
                    <td>${index}</td>
                    <td>
                        <div class="fw-bold">${data.customer_info?.fullName || "-"}</div>
                        <div class="small text-muted">${orderDate}</div>
                        <a href="mailto:${data.customer_info?.email || ""}" class="small text-decoration-none">
                            <i class="bi bi-envelope"></i> ${data.customer_info?.email || ""}
                        </a>
                        <br>
                        <a href="https://wa.me/${data.customer_info?.whatsapp}" target="_blank" class="small text-success text-decoration-none">
                            <i class="bi bi-whatsapp"></i> ${data.customer_info?.whatsapp || ""}
                        </a>
                    </td>
                    <td>
                        <ul class="order-details-list" style="list-style: none; padding: 0; margin: 0; font-size: 0.85rem;">
                            ${itemsList}
                        </ul>
                    </td>
                    <td class="fw-bold">Rp ${(data.totalAmount || 0).toLocaleString('id-ID')}</td>
                    <td>
                        <div class="btn-file-container">
                            ${data.files?.identityCardUrl ? 
                                `<a href="${data.files.identityCardUrl}" target="_blank" class="btn-view-custom btn-view-id">View ID</a>` : ""}
                            ${data.files?.paymentProofUrl ? 
                                `<a href="${data.files.paymentProofUrl}" target="_blank" class="btn-view-custom btn-view-proof">View Proof</a>` : ""}
                        </div>
                    </td>
                    <td>
                        <span id="${statusId}" class="fw-bold" style="cursor:pointer; color: ${statusColor}; text-transform: capitalize; border-bottom: 2px dashed ${statusColor}">
                            ${currentStatus}
                        </span>
                    </td>
                </tr>
            `;

            tbody.insertAdjacentHTML("beforeend", rowHTML);

            // Handler Click Status (Inline Update)
            document.getElementById(statusId).onclick = async () => {
                const statusCycle = { "pending": "verified", "verified": "rejected", "rejected": "pending" };
                const nextStatus = statusCycle[currentStatus];

                if (!confirm(`Ubah status pesanan ${data.customer_info?.fullName} menjadi ${nextStatus}?`)) return;

                try {
                    const merchDocRef = doc(DB, "Merch", docId);
                    await updateDoc(merchDocRef, { status: nextStatus });
                    // Tidak perlu panggil loadMerchTable() lagi karena onSnapshot akan mendeteksi perubahan
                } catch (err) {
                    console.error("Update failed:", err);
                    alert("Gagal memperbarui status.");
                }
            };

            index++;
        });

        // 5. Update UI Summary (Otomatis terupdate saat data berubah)
        if (totalRevenueEl) totalRevenueEl.innerText = `Rp ${totalRevenue.toLocaleString('id-ID')}`;
        if (pendingOrdersEl) pendingOrdersEl.innerText = pendingCount;

        console.log("[SNAPSHOT] Table updated with latest Firestore data");
    });
}

// Tambahkan ke init function Anda
async function initEntrepreneurshipDashboard() {
    console.log("Dashboard ready to fetch Merchandise data.");
    await loadMerchTable();
}

// EXPORT TO EXCEL
document.addEventListener('click', function(e) {
    // Mengecek apakah yang diklik adalah tombol export atau icon di dalamnya
    const btn = e.target.closest('#export-merch-excel');
    
    if (btn) {
        console.log("[EXCEL] Exporting table...");
        
        // Memastikan library XLSX dari CDN terdeteksi
        const XLSX = window.XLSX;
        if (!XLSX) {
            alert("Library Excel belum siap. Silakan refresh halaman.");
            return;
        }

        // Ambil elemen tabel (menggunakan ID tbody sebagai patokan)
        const tableBody = document.getElementById("treasury-merch-list");
        if (!tableBody) return alert("Data tabel belum dimuat.");
        
        const table = tableBody.closest('table');

        try {
            // Proses konversi tabel ke file Excel
            const wb = XLSX.utils.table_to_book(table, { sheet: "Merchandise_Orders" });
            
            // Nama file dengan format tanggal hari ini
            const date = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `IPFEST_Merch_Report_${date}.xlsx`);
            
            console.log("[EXCEL] Download started.");
        } catch (err) {
            console.error("Export Error:", err);
            alert("Gagal mengonversi data ke Excel.");
        }
    }
});