import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

const productionFirebaseConfig = {
  apiKey: "AIzaSyCaAWAHqMdgDSfsSoEq2fVldksii1_vA18",
  authDomain: "ipfest-2027.firebaseapp.com",
  projectId: "ipfest-2027",
  storageBucket: "ipfest-2027.firebasestorage.app",
  messagingSenderId: "997727130659",
  appId: "1:997727130659:web:10902420888d916f398d96",
  measurementId: "G-MP3S9DH01H"
};

const localEmulator = process.env.NODE_ENV === 'development'
  && typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const firebaseConfig = localEmulator ? {
  apiKey: 'demo-api-key',
  authDomain: 'localhost',
  projectId: 'demo-ipfest-local',
  storageBucket: 'demo-ipfest-local.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:local'
} : productionFirebaseConfig

const app = initializeApp(firebaseConfig);
const DB = getFirestore(app);
const STORAGE = getStorage(app);
const AUTH = getAuth(app);
const FUNCTIONS = getFunctions(app, 'asia-southeast2');

if (localEmulator) {
  connectAuthEmulator(AUTH, 'http://127.0.0.1:39099');
  connectFirestoreEmulator(DB, '127.0.0.1', 39180);
  connectFunctionsEmulator(FUNCTIONS, '127.0.0.1', 35001);
  connectStorageEmulator(STORAGE, '127.0.0.1', 39199);
}

export { app, DB, STORAGE, AUTH, FUNCTIONS };
