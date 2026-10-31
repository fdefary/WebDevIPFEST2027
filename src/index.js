// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCaAWAHqMdgDSfsSoEq2fVldksii1_vA18",
  authDomain: "ipfest-2027.firebaseapp.com",
  projectId: "ipfest-2027",
  storageBucket: "ipfest-2027.firebasestorage.app",
  messagingSenderId: "997727130659",
  appId: "1:997727130659:web:10902420888d916f398d96",
  measurementId: "G-MP3S9DH01H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const DB = getFirestore(app);
const STORAGE = getStorage(app);
const AUTH = getAuth(app);
const FUNCTIONS = getFunctions(app, 'asia-southeast2');

export { app, DB, STORAGE, AUTH, FUNCTIONS, analytics };
