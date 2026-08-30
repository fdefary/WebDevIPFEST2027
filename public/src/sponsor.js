// --- BAGIAN 1: DATABASE DATA
const sponsorData = {
    // ID: exxon (Sesuai HTML data-id="exxon")
    "exxon": {
        title: "ExxonMobil Indonesia",
        img: "static/images/sponsor/7. ExxonMobil (Bronze).png",
        desc: `ExxonMobil is proud to be one of Indonesia's trusted partners in developing its energy resources and presence for 125 years. ExxonMobil has been present in the Nusantara archipelago for over 125 years, beginning in 1898 with the opening of its marketing office in Java, and started exploration activities in Sumatera in 1912.
        <br><br>
        Following its journey in 1968 as one of the first Production Sharing Contract (PSC) contractors for the B block and North Sumatera Offshore (NSO) in Aceh, ExxonMobil continues its commitment to support Indonesia in meeting its energy demands as the operator for the Cepu Block in East Java since 2005. ExxonMobil Cepu Limited (EMCL) represents the company's presence in Indonesia's upstream oil and gas industry, having delivered more than 650 million barrels of cumulative crude oil production from Cepu Block through safe, reliable, and efficient production operations.
        <br><br>
        The upstream operations are supported by more than 450 employees, 99 percent of whom are world-class Indonesians. In 2007, ExxonMobil trained 110 operators from neighboring areas in East Java and Central Java—including Bojonegoro, Tuban, and Blora regencies—where the Banyu Urip project is located, and these operators have now returned to operate Banyu Urip facilities.
        <br><br>
        PT ExxonMobil Lubricants Indonesia (PT EMLI) represents ExxonMobil's downstream presence in lubricants, chemicals, and fuels businesses in the country, successfully entering the fuels market for industrial and commercial customers in 2016. ExxonMobil also acquired PT Federal Karyatama (FKT) in 2018.
        <br><br>
        Furthermore, in collaboration with Pertamina, ExxonMobil signs several agreements toward Indonesia's low-carbon future, assessing the prospect of large-scale implementation of low-carbon technologies and the development of a regional Carbon Capture and Storage (CCS) Hub to support Indonesia's 2060 net-zero ambition.
        <br><br>
        <hr style="border-color: rgba(255,255,255,0.3);"> <strong>Company Address:</strong><br>
        Wisma GKBI, Jl. Jenderal Sudirman No.28, Jakarta, 10210, Indonesia<br>
        <strong>Phone:</strong> (+62) 21 5092 1234<br>
        <strong>Website:</strong> <a href="https://www.exxonmobil.co.id" target="_blank" style="color: #4da6ff; text-decoration: underline;">www.exxonmobil.co.id</a>`
    },
    
    // ID: benvors
    "benvors": {
        title: "Benvors",
        img: "static/images/sponsor/6. Benvors (Gold).png",
        desc: `Established in 2007, PT Benvors Sarana Utama has grown into a trusted and leading partner in the Oil, Gas, and Geothermal Industry. We specialize in delivering high-quality wellhead solutions, supported by experienced professionals, proven operational excellence, and strict adherence to international standards. 
        <br><br>
        With a strong commitment to efficiency, reliability, and competitive pricing, we provide end-to-end services designed to meet the evolving needs of our clients. Our ability to deliver flexible, customized solutions—combined with fast lead times and uncompromising quality—has positioned us as a preferred service provider across various upstream operations. 
        <br><br>
        Through continuous innovation and strong industry partnerships, PT Benvors Sarana Utama remains dedicated to supporting sustainable energy development while creating long-term value for our clients and stakeholders We welcome strategic collaborations and sponsorship opportunities to drive mutual growth, brand visibility, and industry advancement.
` 
    },

    // ID: emp
    "emp": {
        title: "Energi Mega Persada (EMP)",
        img: "static/images/sponsor/1. EMP (Bronze).png",
        desc: "Company profile coming soon."
    },

    // ID: geodipa
    "geodipa": {
        title: "PT Geo Dipa Energi (Persero)",
        img: "static/images/sponsor/3. Geodipa (Bronze).png",
        // Saya buat 1 paragraf padat agar enak dibaca di HP
        desc: `PT Geo Dipa Energi (Persero) is an Indonesian State-Owned Enterprise (SOE) specializing in the exploration and development of geothermal resources for power generation.
        <br><br>
        Acting as a Special Mission Vehicle (SMV) under the Ministry of Finance, the company operates several strategic Geothermal Power Plants (PLTP), notably in Dieng and Patuha. Geo Dipa Energi remains steadfast in its commitment to advancing green energy and ensuring national energy security.`
    },
    
    // ID: pyc
    "pyc": {
        title: "Purnomo Yusgiantoro Center (PYC)",
        img: "static/images/sponsor/5. PYC (Bronze).png",
        desc: `The Purnomo Yusgiantoro Center (PYC) is an independent non-profit organization established by Prof. Ir. Purnomo Yusgiantoro, M.Sc., M.A., Ph.D., on June 16, 2016, as a dedication to Indonesia's national development. Drawing from Prof. Yusgiantoro's extensive experience in government, PYC was formed to address current and future challenges by strengthening the natural resources, energy, and national security sectors, as well as promoting sustainable social development.
        <br><br>
        PYC focuses on two primary sectors: Natural Resources and Human Capital. In the natural resources sector, the center develops strategic research and data-driven solutions to support sustainable management and national resilience. In the human capital sector, PYC contributes to community capacity building in education, healthcare, and cultural preservation through multi-sector collaborations.`
    },

    // ID: hcml
    "hcml": {
        title: "Husky-CNOOC Madura Limited",
        img: "static/images/sponsor/4. HCML (Bronze).png",
        desc: "Company profile coming soon."
    },

    // ID: pertamina_ep
    "pertamina_ep": {
        title: "PT Pertamina EP",
        img: "static/images/sponsor/10. Pertamina EP (Bronze).png",
        desc: `PT Pertamina EP (PEP) is a subsidiary of Subholding Upstream PT Pertamina Hulu Energi, engaged in the exploration and production of oil and natural gas in Indonesia, managing working areas across various national assets.
        <br><br>
        The company focuses on increasing oil and gas production and supporting national energy security through professional, safe, efficient, and commercially oriented upstream operations. PEP's vision is to become a world-class upstream oil and gas company, placing a strong emphasis on Health, Safety, Security, and Environment (HSSE) in every operational activity.`
    },

    // ID: harbour
    "harbour": {
        title: "Harbour Energy",
        img: "static/images/sponsor/9. Harbour Energy (Bronze).png",
        desc: "Company profile coming soon."
    }
};

// --- BAGIAN 2: EVENT LISTENER (Salin yang ini) ---

// 1. Ambil elemen modal berdasarkan ID
const sponsorModal = document.getElementById('sponsorModal');

// 2. Cek apakah modal ada di halaman ini (untuk menghindari error di halaman lain)
if (sponsorModal) {
    
    // 3. Tambahkan Event Listener khusus Bootstrap: 'show.bs.modal'
    // Event ini meletus SESAAT SEBELUM modal muncul
    sponsorModal.addEventListener('show.bs.modal', function (event) {
        
        // A. Tangkap elemen yang memicu modal (yaitu Gambar Logo yang diklik)
        const button = event.relatedTarget;
        
        // B. Ambil nilai 'data-id' dari gambar tersebut (contoh: "exxon", "benvors")
        const id = button.getAttribute('data-id');
        
        // C. Cari data yang cocok di dalam variable 'sponsorData'
        const data = sponsorData[id];

        // D. Siapkan elemen-elemen di dalam Modal yang mau diubah isinya
        const modalTitle = sponsorModal.querySelector('#modalTitle');
        const modalImage = sponsorModal.querySelector('#modalImage');
        const modalDesc = sponsorModal.querySelector('#modalDesc');

        // E. Masukkan data ke dalam elemen Modal
        if (data) {
            // Update Judul
            modalTitle.textContent = data.title;
            
            // Update Gambar (Src)
            modalImage.src = data.img;
            modalImage.alt = data.title; // update alt text juga biar rapi (SEO/Accessibility)
            
            // Update Deskripsi
            // Kita pakai 'innerHTML' 
            modalDesc.innerHTML = data.desc; 
        } else {
            // F. Fallback (Jaga-jaga kalau lupa bikin data di JS tapi ID ada di HTML)
            console.error(`Data untuk ID "${id}" tidak ditemukan di sponsorData.`);
            modalTitle.textContent = "Sponsor";
            modalDesc.textContent = "Information not available.";
        }
    });
}