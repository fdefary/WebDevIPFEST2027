import { AUTH } from "./index.js"
import { onAuthStateChanged } from "firebase/auth"

onAuthStateChanged(AUTH, (user) => {
   if (user) {
      document.querySelector("#btn-login-status").innerHTML = `
         <button class="btn btn-light border border-primary rounded-pill text-primary py-2 px-4 me-4" id="logout-btn">Log Out</button>
			<a href="delegates.html" class="btn btn-primary rounded-pill text-white py-2 px-4">Dashboard</a>
      `

      // Handle user logout
      document.querySelector("#logout-btn").addEventListener('click', () => {
         signOut(AUTH).then(() => {
            console.log("log out btn clicked")
            window.location.href = 'login.html'
         })
         .catch((err) => {
            console.log("Cannot loggin out user", err)
         })
      })

   } else {
      document.querySelector("#btn-login-status").innerHTML = `
         <a href="login.html" class="btn btn-light border border-primary rounded-pill text-primary py-2 px-4 me-4">Log In</a>
			<a href="register.html" class="btn btn-primary rounded-pill text-white py-2 px-4">Register</a>
      `
   }
})