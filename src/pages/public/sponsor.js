// --- BAGIAN 1: DATABASE DATA
const sponsorData = {
    // ID: exxon (Sesuai HTML data-id="exxon")
    "exxon": {
        title: "ExxonMobil Indonesia",
        img: "static/images/sponsor/7. ExxonMobil (Bronze).webp",
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
    
    // ID: PHR (Sesuai HTML data-id="PHR")
    "PHR": {
        title: "Pertamina Hulu Energi (PHE)",
        img: "static/images/sponsor/PHR.webp",
        desc: `PT Pertamina Hulu Energi (PHE) is the Upstream Subholding of PT Pertamina (Persero), responsible for managing Pertamina's upstream oil and gas business.
        <br><br>
        Through its subsidiaries and affiliates, PHE carries out exploration and production activities across Indonesia and internationally. The company supports Indonesia's energy security through safe, reliable, and responsible upstream operations.
        <br><br>
        PHE is also committed to developing its business sustainably while contributing to the long-term availability of energy for Indonesia.
        <br><br>
        <strong>Website:</strong> <a href="https://phe.pertamina.com" target="_blank" rel="noopener noreferrer" style="color: #4da6ff; text-decoration: underline;">phe.pertamina.com</a>`
    },

    // ID: wondr (dipakai logo wondr dan BNI)
    "wondr": {
        title: "Wondr BNI",
        img: "static/images/sponsor/wondr.webp",
        img2: "static/images/sponsor/BNI.webp",
        desc: `wondr by BNI is the latest banking application from PT Bank Negara Indonesia (Persero) Tbk, designed to provide financial management solutions that are more intuitive, comprehensive, and tailored to individual lifestyle needs.
        <br><br>
        Through its three core dimensions, namely Insight, Transaksi, and Growth, wondr empowers users to understand their financial patterns better, carry out transactions seamlessly, and grow their wealth for a secure future. The application supports modern financial lifestyles through safe, reliable, and user-friendly digital banking features.
        <br><br>
        wondr by BNI is also committed to supporting youth empowerment, education, and innovation, contributing to the development of the younger generation's potential across Indonesia.
        <br><br>
        <strong>Website:</strong> <a href="https://www.bni.co.id" target="_blank" rel="noopener noreferrer" style="color: #4da6ff; text-decoration: underline;">bni.co.id</a>`
    },

    // ID: emp
    "emp": {
        title: "Energi Mega Persada (EMP)",
        img: "static/images/sponsor/1. EMP (Bronze).webp",
        desc: "Company profile coming soon."
    },

    // ID: geodipa
    "geodipa": {
        title: "PT Geo Dipa Energi (Persero)",
        img: "static/images/sponsor/3. Geodipa (Bronze).webp",
        // Saya buat 1 paragraf padat agar enak dibaca di HP
        desc: `PT Geo Dipa Energi (Persero) is an Indonesian State-Owned Enterprise (SOE) specializing in the exploration and development of geothermal resources for power generation.
        <br><br>
        Acting as a Special Mission Vehicle (SMV) under the Ministry of Finance, the company operates several strategic Geothermal Power Plants (PLTP), notably in Dieng and Patuha. Geo Dipa Energi remains steadfast in its commitment to advancing green energy and ensuring national energy security.`
    },
    
    // ID: pyc
    "pyc": {
        title: "Purnomo Yusgiantoro Center (PYC)",
        img: "static/images/sponsor/5. PYC (Bronze).webp",
        desc: `The Purnomo Yusgiantoro Center (PYC) is an independent non-profit organization established by Prof. Ir. Purnomo Yusgiantoro, M.Sc., M.A., Ph.D., on June 16, 2016, as a dedication to Indonesia's national development. Drawing from Prof. Yusgiantoro's extensive experience in government, PYC was formed to address current and future challenges by strengthening the natural resources, energy, and national security sectors, as well as promoting sustainable social development.
        <br><br>
        PYC focuses on two primary sectors: Natural Resources and Human Capital. In the natural resources sector, the center develops strategic research and data-driven solutions to support sustainable management and national resilience. In the human capital sector, PYC contributes to community capacity building in education, healthcare, and cultural preservation through multi-sector collaborations.`
    },

    // ID: hcml
    "hcml": {
        title: "Husky-CNOOC Madura Limited",
        img: "static/images/sponsor/4. HCML (Bronze).webp",
        desc: "Company profile coming soon."
    },

    // ID: pertamina_ep
    "pertamina_ep": {
        title: "PT Pertamina EP",
        img: "static/images/sponsor/10. Pertamina EP (Bronze).webp",
        desc: `PT Pertamina EP (PEP) is a subsidiary of Subholding Upstream PT Pertamina Hulu Energi, engaged in the exploration and production of oil and natural gas in Indonesia, managing working areas across various national assets.
        <br><br>
        The company focuses on increasing oil and gas production and supporting national energy security through professional, safe, efficient, and commercially oriented upstream operations. PEP's vision is to become a world-class upstream oil and gas company, placing a strong emphasis on Health, Safety, Security, and Environment (HSSE) in every operational activity.`
    },

    // ID: harbour
    "harbour": {
        title: "Harbour Energy",
        img: "static/images/sponsor/9. Harbour Energy (Bronze).webp",
        desc: "Company profile coming soon."
    }
};

// --- BAGIAN 2: MODAL SPONSOR (klik logo, panah, geser, keyboard) ---

const sponsorModal = document.getElementById('sponsorModal');

// Cek apakah modal ada di halaman ini (untuk menghindari error di halaman lain)
if (sponsorModal) {
    const modalTitle = sponsorModal.querySelector('#modalTitle');
    const modalImage = sponsorModal.querySelector('#modalImage');
    const modalDesc = sponsorModal.querySelector('#modalDesc');
    const modalImage2 = sponsorModal.querySelector('#modalImage2');
    const modalImage2Box = sponsorModal.querySelector('#modalImage2Box');
    const prevBtn = sponsorModal.querySelector('#sponsorPrev');
    const nextBtn = sponsorModal.querySelector('#sponsorNext');
    const modalBody = sponsorModal.querySelector('.modal-body');

    // Urutan sponsor mengikuti urutan logo di halaman (tanpa duplikat, misal wondr & BNI)
    const sponsorIds = [...new Set(
        [...document.querySelectorAll('[data-bs-target="#sponsorModal"][data-id]')]
            .map(el => el.getAttribute('data-id'))
    )]
    let currentIndex = 0

    function renderSponsor(id) {
        const data = sponsorData[id];

        // Logo kedua (opsional) disembunyikan dulu supaya tidak terbawa dari sponsor sebelumnya
        modalImage2Box.classList.add('d-none');
        modalImage2.removeAttribute('src');
        modalImage.style.height = '';
        modalImage.style.width = '';

        if (data) {
            modalTitle.textContent = data.title;
            modalImage.src = data.img;
            modalImage.alt = data.title;

            // Logo kedua (opsional), tampil di samping logo pertama
            if (data.img2) {
                modalImage2.src = data.img2;
                modalImage2Box.classList.remove('d-none');

                // Dua logo dalam satu pop up: samakan tingginya
                modalImage.style.height = '70px';
                modalImage2.style.height = '70px';
                modalImage.style.width = modalImage2.style.width = 'auto';
            }

            // 'innerHTML' dipakai karena deskripsi berisi <br> dan link
            modalDesc.innerHTML = data.desc;
        } else {
            // Jaga-jaga kalau lupa bikin data di JS tapi ID ada di HTML
            console.error(`Data untuk ID "${id}" tidak ditemukan di sponsorData.`);
            modalTitle.textContent = "Sponsor";
            modalDesc.textContent = "Information not available.";
        }
        if (modalBody) modalBody.scrollTop = 0;
    }

    // Pindah ke sponsor sebelum/sesudahnya (berputar)
    function step(direction) {
        if (sponsorIds.length < 2) return;
        currentIndex = (currentIndex + direction + sponsorIds.length) % sponsorIds.length;
        renderSponsor(sponsorIds[currentIndex]);
    }

    // Event Bootstrap 'show.bs.modal' meletus sesaat sebelum modal muncul
    sponsorModal.addEventListener('show.bs.modal', function (event) {
        const id = event.relatedTarget.getAttribute('data-id');
        const index = sponsorIds.indexOf(id);
        currentIndex = index === -1 ? 0 : index;

        const hasMany = sponsorIds.length > 1;
        prevBtn?.classList.toggle('d-none', !hasMany);
        nextBtn?.classList.toggle('d-none', !hasMany);

        renderSponsor(id);
    });

    prevBtn?.addEventListener('click', () => step(-1));
    nextBtn?.addEventListener('click', () => step(1));

    // Keyboard: panah kiri/kanan saat modal terbuka
    document.addEventListener('keydown', (e) => {
        if (!sponsorModal.classList.contains('show')) return;
        if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'ArrowRight') step(1);
    });

    // Geser (swipe) kiri/kanan di layar sentuh
    let touchStartX = null;
    let touchStartY = null;
    sponsorModal.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });
    sponsorModal.addEventListener('touchend', (e) => {
        if (touchStartX === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        touchStartX = touchStartY = null;
        // Hanya geseran yang dominan horizontal, supaya scroll teks tidak ikut memindahkan sponsor
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    }, { passive: true });
}
