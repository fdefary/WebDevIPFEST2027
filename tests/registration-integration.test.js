import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, ref, uploadBytes } from 'firebase/storage';
import { registrationPriceAt } from '../src/shared/registration-pricing.js';

test('a registrant can create an account, upload proof, save a team, and log in again', { timeout: 30000 }, async () => {
  const app = initializeApp({ apiKey: 'demo-key', authDomain: 'demo-ipfest-p0.firebaseapp.com', projectId: 'demo-ipfest-p0', storageBucket: 'demo-ipfest-p0.firebasestorage.app' });
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  try {
    const email = `register-${Date.now()}@example.com`;
    const password = 'testing-password-123';
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    const file = ref(storage, `payments/${user.uid}/proof.jpg`);
    await uploadBytes(file, new TextEncoder().encode('test proof'), { contentType: 'image/jpeg' });
    const paymentAmount = registrationPriceAt(new Date()).amount;
    await setDoc(doc(db, 'Team', user.uid), {
      competition: 'business case', teamName: 'Test team',
      leader: { email, firstName: 'Test' }, members: [], join_on: serverTimestamp(), payment_amount: paymentAmount,
      status: 'pending', payment_status: 'pending_verification',
      payment: { proofUrl: file.fullPath, uploadedAt: serverTimestamp() }
    });
    await signOut(auth);
    const signedIn = await signInWithEmailAndPassword(auth, email, password);
    assert.equal(signedIn.user.uid, user.uid);
    const team = await getDoc(doc(db, 'Team', signedIn.user.uid));
    assert.equal(team.data().payment.proofUrl, file.fullPath);
    assert.equal(team.data().payment_amount, paymentAmount);
    await assert.rejects(setDoc(doc(db, 'Team', signedIn.user.uid), { ...team.data(), payment_amount: paymentAmount + 1 }));
    const spoof = await createUserWithEmailAndPassword(auth, `spoof-${Date.now()}@example.com`, password);
    await assert.rejects(setDoc(doc(db, 'Team', spoof.user.uid), {
      competition: 'business case', teamName: 'Spoofed fee', leader: { firstName: 'Test' }, members: [],
      join_on: serverTimestamp(), payment_amount: paymentAmount + 1,
      status: 'pending', payment_status: 'unpaid'
    }));
  } finally {
    await deleteApp(app);
  }
});
