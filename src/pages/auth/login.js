// ==== Import Firebase SDK ====
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { AUTH, DB } from "../../app/index.js";
import { accountCreated, failedLogin } from "../../shared/alert.js";
import { doc, getDoc } from "firebase/firestore";
import { getRoleClaims } from "../../shared/role-claims.js";
import { onDOMReady } from "../../shared/dom-ready.js";
import { loginCredentials } from "../../shared/login-credentials.js";

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

      // ==== FETCH TEAM DATA (ONLY FOR DELEGATES) ====
      let competitionField = null;
      let hasTeam = false;

      if (!roleClaims.role) {
        const teamRef = doc(DB, "Team", user.uid);
        const teamSnap = await getDoc(teamRef);

        if (teamSnap.exists()) {
          hasTeam = true;
          competitionField = teamSnap.data().competition || null;
          console.log("Competition field:", competitionField);
        } else {
          console.warn("Team document not found for UID:", user.uid);
        }
      }

      // ==== DELEGATE ACCOUNT CHECKS ====
      // An account without a team document means registration was interrupted
      // after the account was created. Ask the registrant to finish it.
      if (!roleClaims.role && !hasTeam) {
        await signOut(AUTH);
        failedLogin("Your registration is not complete yet. Please submit the registration form again using the same email and password.");
        return;
      }
      // Delegates with a saved team may sign in before verifying their email. Email
      // verification is not required by Firestore or Storage Rules, and verification
      // emails can be unavailable when the daily Firebase email quota is exhausted.

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
