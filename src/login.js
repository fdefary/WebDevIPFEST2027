// ==== Import Firebase SDK ====
import { signInWithEmailAndPassword, signOut, sendEmailVerification } from "firebase/auth";
import { AUTH, DB } from "./index.js";
import { emailNotVerified, accountCreated, failedLogin } from "./shared/alert.js";
import { doc, getDoc } from "firebase/firestore";
import { getRoleClaims } from "./shared/role-claims.js";

// ==== Wait for DOM ====
window.addEventListener("DOMContentLoaded", () => {

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

    const userEmail = document.getElementById("email").value.trim();
    const userPassword = document.getElementById("password").value.trim();

    if (!userEmail || !userPassword) {
      failedLogin("Please enter both email and password.");
      return;
    }

    console.log("Attempting login with:", userEmail);

    try {
      const credential = await signInWithEmailAndPassword(AUTH, userEmail, userPassword);
      const user = credential.user;
      const roleClaims = await getRoleClaims(user)

      console.log("Login successful:", user.email);

      // ==== RESEND EMAIL VERIFICATION IF USER IS NOT VERIFIED ====
      if (!roleClaims.role && !user.emailVerified) {
        try {
          await sendEmailVerification(user);
          console.log("Verification email resent to:", user.email);
        } catch (err) {
          console.error("Failed to resend verification email:", err);
        }

        emailNotVerified();   // your alert popup
        await signOut(AUTH);  // keep user logged out until verified
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
