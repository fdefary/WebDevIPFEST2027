// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD43AzGJgHhtw_EBP11SktAGwAQBtDR3po",
  authDomain: "ipfest-2026.firebaseapp.com",
  projectId: "ipfest-2026",
  storageBucket: "ipfest-2026.firebasestorage.app",
  messagingSenderId: "549421075173",
  appId: "1:549421075173:web:98807aea4151379616a20c",
  measurementId: "G-7PTFK31CE0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const DB = getFirestore(app);
const STORAGE = getStorage(app);
const AUTH = getAuth(app);

export { app, DB, STORAGE, AUTH , analytics };