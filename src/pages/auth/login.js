// ==== Import Firebase SDK ====
import { signInWithEmailAndPassword, signOut, sendEmailVerification } from "firebase/auth";
import { AUTH, DB } from "../../app/index.js";
import { emailNotVerified, accountCreated, failedLogin } from "../../shared/alert.js";
import { doc, getDoc } from "firebase/firestore";
import { getRoleClaims } from "../../shared/role-claims.js";
import { onDOMReady } from "../../shared/dom-ready.js";
import { loginCredentials } from "../../shared/login-credentials.js";

// Kirim ulang email verifikasi: login sebentar (sendEmailVerification butuh user aktif), kirim, lalu sign out.
async function resendVerificationEmail(email, password) {
  try {
    const { user } = await signInWithEmailAndPassword(AUTH, email, password);
    try {
      if (user.emailVerified) return "Your email is already verified. You can sign in now.";
      await sendEmailVerification(user);
      return "Verification email sent. Please check your inbox and spam folder.";
    } finally {
      await signOut(AUTH);
    }
  } catch (err) {
    console.error("Failed to resend verification email:", err);
    if (err.code === "auth/too-many-requests" || /quota/i.test(err.message || "")) {
      throw new Error("Email sending is temporarily limited. Please try again later or contact the committee.");
    }
    throw new Error("Could not send the email. Please try again later.");
  }
}

// ==== Wait for DOM ====
onDOMReady(() => {

  // Show success popup after signup
  const signupSuccess = localStorage.getItem("signupSuccess");
  if (signupSuccess) {
    accountCreated();
    localStorage.removeItem("signupSuccess");
  }

  const loginForm = document.querySelector("#login-user");
  if (!loginForm) {
    console.error("Login form not found.");
    return;
  }

  // ==== LOGIN HANDLER ====
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const { email: userEmail, password: userPassword } = loginCredentials(
      document.getElementById("email").value,
      document.getElementById("password").value
    );

    if (!userEmail || !userPassword) {
      failedLogin("Please enter both email and password.");
      return;
    }

    console.log("Attempting login with:", userEmail);

    // Hapus banner dari percobaan login sebelumnya agar tidak menumpuk.
    document.querySelectorAll("#alertContainer > div, #failLoginAlert > div").forEach((el) => el.remove());

    try {
      const credential = await signInWithEmailAndPassword(AUTH, userEmail, userPassword);
      const user = credential.user;
      const roleClaims = await getRoleClaims(user)

      console.log("Login successful:", user.email);

      // ==== RESEND EMAIL VERIFICATION IF USER IS NOT VERIFIED ====
      if (!roleClaims.role && !user.emailVerified) {
        // Email tidak dikirim otomatis di sini agar kuota harian Firebase tidak terbuang;
        // pendaftar menekan "resend" di banner jika perlu.
        await signOut(AUTH);  // keep user logged out until verified
        emailNotVerified(() => resendVerificationEmail(userEmail, userPassword));
        return;
      }

      // ==== FETCH TEAM DATA (ONLY FOR DELEGATES) ====
      let competitionField = null;

      if (!roleClaims.role) {
        const teamRef = doc(DB, "Team", user.uid);
        const teamSnap = await getDoc(teamRef);

        if (teamSnap.exists()) {
          competitionField = teamSnap.data().competition || null;
          console.log("Competition field:", competitionField);
        } else {
          console.warn("Team document not found for UID:", user.uid);
        }
      }

      // =============================
      // ==== OFFICIAL ACCOUNT ROUTE ====
      // =============================
      const redirectMap = {
        delegates_relation: "./dashboard/delegates-relation.html",
        treasury: "./dashboard/treasury.html",
        merch_manager: "./dashboard/merchandise.html",
        event_staff: "./dashboard/event.html",
        competition_manager: roleClaims.competition === 'smart competition'
          ? "./dashboard/smart-competition/manager.html"
          : "./dashboard/compe-manager.html"
      };
      if (roleClaims.role) {
        const dest = redirectMap[roleClaims.role];
        if (!dest) throw new Error('Unrecognized staff role')
        window.location.href = dest;
        return;
      }

      // =============================
      // ==== DELEGATES ROUTING ONLY ====
      // =============================

      if (competitionField === "smart competition") {
        console.log("Redirect: SMART COMPETITION delegate");
        window.location.href = "./dashboard/smart-competition/delegates.html";
        return;
      }

      console.log("Redirect: Non Smart Competition delegate");
      window.location.href = "./dashboard/delegates.html";

    } catch (err) {
      console.error("Login error:", err);

      const known = [
        "auth/wrong-password",
        "auth/invalid-email",
        "auth/user-not-found",
        "auth/invalid-credential",
        "auth/invalid-login-credentials"
      ];

      if (known.includes(err.code)) {
        failedLogin("Invalid email or password.");
        loginForm.reset();
      } else if (err.code === "auth/too-many-requests") {
        failedLogin("Too many login attempts. Please wait a moment and try again.");
      } else if (err.code === "auth/network-request-failed") {
        failedLogin("Network error. Please check your connection and try again.");
      } else {
        window.location.href = "400.html";
      }
    }

  });

});
