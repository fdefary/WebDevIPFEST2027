import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';
import {
  serverTimestamp,
  doc,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Import Firebase SDK initialization
import { AUTH, STORAGE, DB } from './index.js';

// Daftar kompetisi dan jumlah anggota yang valid
const teamMemberCondition = {
  "plan of development": [4, 5],
  "smart competition": [2, 3],
  "mud inovation": [2, 3],
  "paper and poster": [2, 3],
  "oil rig design": [4, 5],
  "business case": [3],
  "geothermal development plan": [4],
  "well design": [4, 5],
  "hackaton": [3]
};

function generateTeamMemberOption(competition, container) {
  if (!container || !teamMemberCondition[competition]) return;
  const selected = container.value || teamMemberCondition[competition][0];
  container.innerHTML = '';
  teamMemberCondition[competition].forEach(m => {
    container.innerHTML += `<option value="${m}" ${m == selected ? 'selected' : ''}>${m} people</option>`;
  });
}

function generateMemberEntry(entry, count) {
  if (!entry) return;
  entry.innerHTML = '';
  for (let i = 1; i < count; i++) {
    const memberEntry = document.createElement('div');
    memberEntry.innerHTML = `
      <h3 class="lead fs-2 mt-6">Member ${i}</h3>
      <div class="member-entry">
        <div class="registration-subsection-grid member-details">
          <fieldset class="registration-subsection">
            <legend>Data Diri &amp; Akademik</legend>
        <div class="row my-1">
          <div class="col-md-6">
            <label for="firstName${i}" class="form-label">First Name: </label>
            <input type="text" name="firstName${i}" id="firstName${i}" class="form-control" required>
            <div class="invalid-feedback">Please add your member ${i} first name</div>
          </div>
          <div class="col-md-6">
            <label for="lastName${i}" class="form-label">Last Name: </label>
            <input type="text" name="lastName${i}" id="lastName${i}" class="form-control" required>
            <div class="invalid-feedback">Please add your member ${i} last name</div>
          </div>
        </div>
        <div class="row my-1">
          <div class="col-md-6">
            <label for="major${i}" class="form-label">Major: </label>
            <input type="text" name="major${i}" id="major${i}" class="form-control" required>
            <div class="invalid-feedback">Please add your member ${i} major</div>
          </div>
          <div class="col-md-6">
            <label for="batch${i}" class="form-label">Batch: </label>
            <select name="batch${i}" id="batch${i}" class="form-select" required>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
            </select>
            <div class="invalid-feedback">Please add your member ${i} batch</div>
          </div>
        </div>
          </fieldset>
          <fieldset class="registration-subsection">
            <legend>Identitas &amp; Kontak</legend>
        <div class="row my-1">
          <div class="col-md-6">
            <label for="idCard${i}" class="form-label">ID(NIK/Pasport): </label>
            <input type="text" name="idCard${i}" id="idCard${i}" class="form-control" required>
            <div class="invalid-feedback">Please add your member ${i} ID</div>
          </div>
          <div class="col-md-6">
            <label for="studentId${i}" class="form-label">Student ID: </label>
            <input type="text" name="studentId${i}" id="studentId${i}" class="form-control" required>
            <div class="invalid-feedback">Please add your member ${i} student ID</div>
          </div>
        </div>
        <div class="row my-1">
          <div class="col-md-6">
            <label for="email${i}" class="form-label">Email: </label>
            <input type="email" name="email${i}" id="email${i}" class="form-control" required>
            <div class="invalid-feedback">Please provide your member ${i} valid email</div>
          </div>
          <div class="col-md-6">
            <label for="phoneNo${i}" class="form-label">Phone number: </label>
            <input type="tel" name="phoneNo${i}" id="phoneNo${i}" class="form-control" required>
            <div class="invalid-feedback">Please add your member ${i} phone number</div>
          </div>
        </div>
          </fieldset>
          <fieldset class="registration-subsection">
            <legend>Dokumen Persyaratan</legend>
        <div class="row my-1">
          <div class="col-md-6">
            <label for="studentCardPhoto${i}" class="form-label">Student Card Photo: </label>
            <input type="file" name="studentCardPhoto${i}" id="studentCardPhoto${i}" class="form-control" required>
            <div class="invalid-feedback">Please upload your member ${i} student card photo</div>
          </div>
          <div class="col-md-6">
            <label for="twibbon${i}" class="form-label">Proof for Uploading Twibbon: </label>
            <input type="file" name="twibbon${i}" id="twibbon${i}" class="form-control" required>
            <div class="invalid-feedback">Please upload your twibbon proof</div>
          </div>
        </div>
        <div class="row my-1">
          <div class="col-md-6">
            <label for="follow-ig${i}" class="form-label">Proof for Following IPFEST 2026 Instagram: </label>
            <input type="file" name="follow-ig${i}" id="follow-ig${i}" class="form-control" required>
            <div class="invalid-feedback">Please upload the proof that you are following IPFEST 2026 Instagram</div>
          </div>
        </div>
          </fieldset>
        </div>
      </div>
    `;
    entry.appendChild(memberEntry);
  }

}

// Fungsi upload file ke Firebase Storage
async function uploadFile(file, path) {
  if (!file) return null;
  const fileRef = ref(STORAGE, path);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

// Fungsi tampilkan error
function showError(message) {
  const alertContainer = document.querySelector("#alertContainer");
  if (alertContainer) {
    alertContainer.innerHTML = `
      <div class="alert alert-danger alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  }
}

// Validasi password
let passwordIsValid = false;
const pass = document.querySelector("input[name='password']");
const confirmPass = document.querySelector("input[name='confirmPassword']");

if (confirmPass) {
  confirmPass.addEventListener("input", () => {
    if (pass && confirmPass) {
      passwordIsValid = pass.value === confirmPass.value && pass.value.length >= 8;
      const feedback = confirmPass.parentNode.querySelector('.invalid-feedback');
      if (feedback) {
        feedback.textContent = passwordIsValid ? "" : "Passwords do not match or less than 8 characters";
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const registrationForm = document.querySelector("#registration-form");
  if (!registrationForm) return;

  const leaderForm = document.querySelector("#leader");
  const memberForm = document.querySelector("#member");
  const competitionForm = document.querySelector("#competition");
  const paymentForm = document.querySelector("#payment");
  const agreementForm = document.querySelector("#invalidCheck");
  const compeInput = document.querySelector('#choosen-competition');
  const memberCount = document.getElementById("memberCount");
  const entryContainer = document.querySelector("#entry");

  const steps = [...document.querySelectorAll("[data-registration-step]")];
  const descriptions = [
    "Pilih kompetisi yang sesuai. Ringkasan dan persyaratan tim akan membantu kamu melanjutkan pendaftaran.",
    "Isi informasi ketua tim dan siapkan dokumen yang diminta.",
    "Lengkapi data setiap anggota sesuai jumlah tim.",
    "Buat akun untuk login dan memantau pendaftaran.",
    "Pilih metode pembayaran, unggah bukti bila tersedia, lalu kirim pendaftaran."
  ];
  let currentStep = 0;
  const showStep = (index) => {
    currentStep = index;
    sessionStorage.setItem("registration-step", steps[index].dataset.registrationStep);
    steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== index; });
    document.querySelectorAll(".registration-progress-step").forEach((item, stepIndex) => {
      item.classList.toggle("is-complete", stepIndex < index);
      item.classList.toggle("is-current", stepIndex === index);
      if (stepIndex === index) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    document.querySelector(".registration-progress").style.setProperty("--step-progress", `${(index / (steps.length - 1)) * 100}%`);
    document.querySelector("#step-count").textContent = `Langkah ${index + 1} dari ${steps.length}`;
    document.querySelector("#step-description").textContent = descriptions[index];
    steps[index]?.querySelector("h2")?.focus({ preventScroll: true });
    steps[index]?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  };
  const validateStep = () => {
    if (currentStep === 0 && !compeInput.value) {
      showError("Pilih kompetisi terlebih dahulu.");
      return false;
    }
    return true;
  };
  document.querySelectorAll("[data-next]").forEach(button => {
    button.addEventListener("click", () => {
      if (validateStep()) showStep(Math.min(currentStep + 1, steps.length - 1));
    });
  });
  document.querySelectorAll("[data-back]").forEach(button => {
    button.addEventListener("click", () => showStep(Math.max(currentStep - 1, 0)));
  });
  const savedStepIndex = steps.findIndex(step => step.dataset.registrationStep === sessionStorage.getItem("registration-step"));
  if (savedStepIndex > 0) showStep(savedStepIndex);
  // Handle klik kompetisi
  document.querySelectorAll(".card-compe").forEach(card => {
    card.addEventListener("click", () => {

      const selectedCompetition = card.dataset.value;

      // Disable Smart Competition
      if (selectedCompetition === "smart competition") {
        card.classList.add("disabled");
        alert("Smart Competition registration is closed.");
        return;
      }

      document.querySelectorAll(".card-compe").forEach(c => {
        c.classList.remove('active');
        c.setAttribute("aria-pressed", "false");
      });

      card.classList.add('active');
      card.setAttribute("aria-pressed", "true");

      compeInput.value = selectedCompetition;
      competitionForm.querySelector("[data-next]").disabled = false;

      generateTeamMemberOption(selectedCompetition, memberCount);
      const count = parseInt(memberCount.value, 10) || 1;
      generateMemberEntry(entryContainer, count);
    });
  });

  // Handle perubahan jumlah anggota
  memberCount?.addEventListener('change', () => {
    const count = parseInt(memberCount.value, 10) || 1;
    generateMemberEntry(entryContainer, count);
  });

  // Handle metode pembayaran
  function earlybirdStatus() {
    const earlybirdDeadline = new Date('Nov 17, 2025 00:00:00').getTime();
    return Date.now() < earlybirdDeadline;
  }

  const paymentMethods = [...document.querySelectorAll(".payment-method .nav-link")];
  const showPaymentMethod = (method) => {
      const payMethod = method.dataset.method;
      paymentMethods.forEach(btn => {
        const selected = btn === method;
        btn.classList.toggle('active', selected);
        btn.setAttribute("aria-selected", String(selected));
      });

      const targetPane = document.querySelector(method.dataset.bsTarget);
      if (!targetPane) return;
      document.querySelectorAll(".payment-panel").forEach(panel => {
        panel.hidden = panel !== targetPane;
      });

      const isEarly = earlybirdStatus();
      const indoPrice = isEarly ? "IDR 200.000" : "IDR 250.000";
      const intlPrice = isEarly ? "USD 17" : "USD 20";

      switch (payMethod) {
        case "Bank BCA":
          targetPane.innerHTML = `<div class="payment-total"><span>Total pembayaran</span><strong>${indoPrice}</strong></div><p>Transfer ke rekening BCA <strong>2650508800</strong> atas nama <strong>Mochammad Rafly Ghazany A</strong>.</p>`;
          break;
        case "Gopay":
          targetPane.innerHTML = `<div class="payment-total"><span>Total pembayaran</span><strong>${indoPrice}</strong></div><p>Kirim GoPay ke nomor <strong>085655226900</strong> atas nama <strong>Rafly Ghazany</strong>.</p>`;
          break;
        case "Paypal":
          targetPane.innerHTML = `<div class="payment-total"><span>Total pembayaran</span><strong>${intlPrice}</strong></div><p>Bayar melalui <a href="https://www.paypal.me/RaflyGhazany" target="_blank" rel="noopener noreferrer">paypal.me/RaflyGhazany</a>.</p>`;
          break;
      }
  };
  paymentMethods.forEach(method => {
    method.addEventListener('click', () => showPaymentMethod(method));
  });
  if (paymentMethods[0]) showPaymentMethod(paymentMethods[0]);

  // Handle submit form
  registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!paymentForm.checkValidity()) {
      registrationForm.classList.add("was-validated");
      paymentForm.querySelector(":invalid")?.focus();
      return;
    }
    const submitBtn = registrationForm.querySelector("button[type='submit']");
    if (!submitBtn) return;

    const selectedCompetition = compeInput?.value;
    if (!selectedCompetition) {
      showError("Please select a competition first");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'Processing...';

    try {
      if (!passwordIsValid) {
        throw new Error("Passwords do not match or less than 8 characters");
      }

      // Ambil data leader
      const email = document.getElementById("email")?.value;
      const password = pass?.value;
      const firstName = document.getElementById("firstName")?.value;
      const lastName = document.getElementById("lastName")?.value;
      const major = document.getElementById("major")?.value;
      const batch = document.getElementById("batch")?.value;
      const teamName = document.getElementById("teamName")?.value;
      const university = document.getElementById("university")?.value;
      const phoneNo = document.getElementById("phoneNo")?.value;
      const idCard = document.getElementById("idCard")?.value;
      const studentId = document.getElementById("studentId")?.value;
      const studentCardFile = document.getElementById("studentCardPhoto")?.files[0];
      const twibbonFile = document.getElementById("twibbon")?.files[0];
      const followIgFile = document.getElementById("follow-ig")?.files[0];

      // Validasi dasar
      if (
        !email || !password || !firstName || !lastName || !major || !batch ||
        !teamName || !university || !phoneNo || !idCard || !studentId ||
        !studentCardFile || !twibbonFile || !followIgFile
      ) {
        throw new Error("All leader fields are required");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) throw new Error("Invalid email address");
      if (password.length < 8) throw new Error("Password must be at least 8 characters");

      // Upload bukti pembayaran (jika ada)
      const paymentFile = document.getElementById("payment-proof")?.files[0];
      let paymentProofUrl = null;
      if (paymentFile) {
        paymentProofUrl = await uploadFile(paymentFile, `payments/${Date.now()}_${paymentFile.name}`);
      }

      // Buat user auth di Firebase Authentication
      const { user } = await createUserWithEmailAndPassword(AUTH, email, password);

      // Upload file leader ke Firebase Storage
      const leaderUploads = {};
      if (studentCardFile)
        leaderUploads.studentCardUrl = await uploadFile(studentCardFile, `team/${user.uid}/leader/student_card.jpg`);
      if (twibbonFile)
        leaderUploads.twibbonUrl = await uploadFile(twibbonFile, `team/${user.uid}/leader/twibbon.jpg`);
      if (followIgFile)
        leaderUploads.followIgUrl = await uploadFile(followIgFile, `team/${user.uid}/leader/follow_ig.jpg`);

      // Siapkan data tim untuk Firestore
      const teamData = {
        competition: selectedCompetition,
        teamName,
        leader: {
          firstName,
          lastName,
          email,
          major,
          batch,
          university,
          phoneNo,
          idCard,
          studentId,
          ...leaderUploads // gunakan hasil upload (URL)
        },
        members: [],
        join_on: serverTimestamp(),
        status: "pending",
        payment_status: paymentProofUrl ? "pending_verification" : "unpaid"
      };

      if (paymentProofUrl) {
        teamData.payment = {
          proofUrl: paymentProofUrl,
          uploadedAt: serverTimestamp()
        };
      }

      // Ambil data anggota
    const totalMembers = parseInt(memberCount?.value || "1", 10);
      for (let i = 1; i < totalMembers; i++) {
        const mFirstName = document.getElementById(`firstName${i}`)?.value;
        const mLastName = document.getElementById(`lastName${i}`)?.value;
        const mEmail = document.getElementById(`email${i}`)?.value;
        const mMajor = document.getElementById(`major${i}`)?.value;
        const mBatch = document.getElementById(`batch${i}`)?.value;
        const mIdCard = document.getElementById(`idCard${i}`)?.value;
        const mStudentId = document.getElementById(`studentId${i}`)?.value;
        const mPhoneNo = document.getElementById(`phoneNo${i}`)?.value;

        if (!mFirstName || !mLastName || !mEmail || !mMajor || !mBatch || !mIdCard || !mStudentId || !mPhoneNo) {
          throw new Error(`Member ${i} data is incomplete`);
        }

        const member = {
          firstName: mFirstName,
          lastName: mLastName,
          email: mEmail,
          major: mMajor,
          batch: mBatch,
          idCard: mIdCard,
          studentId: mStudentId,
          phoneNo: mPhoneNo
        };

        // Upload file anggota (jika ada)
        const studentCard = document.getElementById(`studentCardPhoto${i}`)?.files[0];
        const twibbon = document.getElementById(`twibbon${i}`)?.files[0];
        const followIg = document.getElementById(`follow-ig${i}`)?.files[0];

        if (studentCard)
          member.studentCardUrl = await uploadFile(studentCard, `team/${user.uid}/member${i}/student_card.jpg`);
        if (twibbon)
          member.twibbonUrl = await uploadFile(twibbon, `team/${user.uid}/member${i}/twibbon.jpg`);
        if (followIg)
          member.followIgUrl = await uploadFile(followIg, `team/${user.uid}/member${i}/follow_ig.jpg`);

        teamData.members.push(member);
      }

      // Simpan ke Firestore
      await setDoc(doc(DB, "Team", user.uid), teamData);

      // Kirim verifikasi email
      await sendEmailVerification(user);

      alert("Registration successful! Please check your email to verify your account.");

      window.location.href = "/login.html";

    } catch (error) {
      console.error("Registration error:", error);
      alert(error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Register';
    }
  }); 
}); 

