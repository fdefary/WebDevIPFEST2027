// ==== Import Firebase SDK ====
import { signInWithEmailAndPassword, signOut, sendEmailVerification } from "firebase/auth";
import { AUTH, DB } from "./index.js";
import { emailNotVerified, accountCreated, failedLogin } from "../static/js/alert.js";
import { doc, getDoc } from "firebase/firestore";

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

      console.log("Login successful:", user.email);

      // ==== OFFICIAL ACCOUNTS ====
      const officialAccounts = [
        "officialdelegates.ipfest2026@gmail.com",
        "treasury.ipfest2026@gmail.com",
        "entrepreneurship.ipfest2026@gmail.com",
        "event@ipfest2026.com",
        "podc.ipfest2026@gmail.com",
        "mic.ipfest2026@gmail.com",
        "ppc.ipfest2026@gmail.com",
        "ordc.ipfest2026@gmail.com",
        "bcc.ipfest2026@gmail.com",
        "gdpc.ipfest2026@gmail.com",
        "wdc.ipfest2026@gmail.com",
        "hc.ipfest2026@gmail.com",
        "sc.ipfest2026@gmail.com",
      ];

      // ==== RESEND EMAIL VERIFICATION IF USER IS NOT VERIFIED ====
      if (!officialAccounts.includes(user.email) && !user.emailVerified) {
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

      if (!officialAccounts.includes(user.email)) {
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
        "officialdelegates.ipfest2026@gmail.com": "./dashboard/delegates-relation.html",
        "treasury.ipfest2026@gmail.com": "./dashboard/treasury.html",
        "entrepreneurship.ipfest2026@gmail.com": "./dashboard/merchandise.html",
        "event@ipfest2026.com": "./dashboard/event.html",
        "podc.ipfest2026@gmail.com": "./dashboard/compe-manager.html",
        "mic.ipfest2026@gmail.com": "./dashboard/compe-manager.html",
        "ppc.ipfest2026@gmail.com": "./dashboard/compe-manager.html",
        "ordc.ipfest2026@gmail.com": "./dashboard/compe-manager.html",
        "bcc.ipfest2026@gmail.com": "./dashboard/compe-manager.html",
        "gdpc.ipfest2026@gmail.com": "./dashboard/compe-manager.html",
        "wdc.ipfest2026@gmail.com": "./dashboard/compe-manager.html",
        "hc.ipfest2026@gmail.com": "./dashboard/compe-manager.html",
        "sc.ipfest2026@gmail.com": "./dashboard/smart-competition/manager.html",
      };

      // Jika email official → tidak disentuh logic delegates
      if (officialAccounts.includes(user.email)) {
        const dest = redirectMap[user.email];
        console.log("Redirect (official):", dest);
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
        "auth/invalid-credential"
      ];

      if (known.includes(err.code)) {
        failedLogin("Invalid email or password.");
        loginForm.reset();
      } else {
        window.location.href = "400.html";
      }
    }

  });

  function registrationClosed() {
    const closeTime = new Date("2026-12-13T00:00:00").getTime();
    const now = Date.now();
    return now >= closeTime;
  }

  document.querySelector("#registerLink").addEventListener("click", (e) => {
    if (registrationClosed()) {
      e.preventDefault(); 
      alert("Registration is currently closed. Please contact the committee for more information.");
      return;
    }
  });


});
