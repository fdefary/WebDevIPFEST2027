import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, it } from 'node:test'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { ref, deleteObject, getBytes, uploadBytes } from 'firebase/storage'

const projectId = 'demo-ipfest-p0'
let env

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') }
  })
})

after(async () => env?.cleanup())
beforeEach(async () => env.clearFirestore())

const team = (uid, competition = 'business case') => ({
  competition,
  teamName: `Team ${uid}`,
  status: 'pending',
  payment_status: 'unpaid',
  leader: { firstName: 'Test', email: `${uid}@example.com` },
  members: [],
  sub_preliminary: { status: false, final: null, rank: null, score: null }
})

async function seedTeam(uid, data = team(uid)) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'Team', uid), data)
  })
}

describe('Firestore Team access', () => {
  it('denies anonymous reads and writes', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'Team', 'participant')))
    await assertFails(setDoc(doc(db, 'Team', 'attacker'), team('attacker')))
  })

  it('allows an owner to read and create only their own team', async () => {
    const db = env.authenticatedContext('owner').firestore()
    const initialTeam = team('owner')
    delete initialTeam.sub_preliminary
    await assertSucceeds(setDoc(doc(db, 'Team', 'owner'), initialTeam))
    await assertSucceeds(getDoc(doc(db, 'Team', 'owner')))
    await assertFails(setDoc(doc(db, 'Team', 'other'), team('other')))
    await assertFails(setDoc(doc(db, 'Team', 'forged'), { ...initialTeam, payment_status: 'verified' }))
  })

  it('allows owner profile and pending payment-submission updates', async () => {
    await seedTeam('owner')
    const db = env.authenticatedContext('owner').firestore()
    await assertSucceeds(updateDoc(doc(db, 'Team', 'owner'), { teamName: 'Updated name' }))
    await assertSucceeds(updateDoc(doc(db, 'Team', 'owner'), { 'sub_preliminary.fileURL': 'file-path' }))
    await assertSucceeds(updateDoc(doc(db, 'Team', 'owner'), { final_reg: { paymentStatus: 'pending', paymentScheme: 'Full' } }))
  })

  it('denies owner changes to payment verification and manager results', async () => {
    await seedTeam('owner')
    const db = env.authenticatedContext('owner').firestore()
    await assertFails(updateDoc(doc(db, 'Team', 'owner'), { payment_status: 'verified' }))
    await assertFails(updateDoc(doc(db, 'Team', 'owner'), { 'sub_preliminary.final': true }))
  })

  it('limits a manager to the matching competition and preliminary result fields', async () => {
    await seedTeam('bcc-team', team('bcc-team', 'business case'))
    await seedTeam('sc-team', team('sc-team', 'smart competition'))
    await seedTeam('final-team', {
      ...team('final-team', 'business case'),
      final_reg: { paymentScheme: 'Full', paymentStatus: 'pending', leader: {} }
    })
    const manager = env.authenticatedContext('bcc-manager', {
      email: 'bcc.ipfest2027@gmail.com', email_verified: true
    }).firestore()
    const unverifiedManager = env.authenticatedContext('bcc-unverified', {
      email: 'bcc.ipfest2027@gmail.com', email_verified: false
    }).firestore()
    await assertSucceeds(getDocs(query(collection(manager, 'Team'), where('competition', '==', 'business case'))))
    await assertFails(getDocs(collection(manager, 'Team')))
    await assertSucceeds(getDoc(doc(manager, 'Team', 'bcc-team')))
    await assertFails(getDoc(doc(manager, 'Team', 'sc-team')))
    await assertFails(getDoc(doc(unverifiedManager, 'Team', 'bcc-team')))
    const treasury = env.authenticatedContext('treasury', {
      email: 'treasury.ipfest2027@gmail.com', email_verified: true
    }).firestore()
    const delegatesRelation = env.authenticatedContext('delegates-relation', {
      email: 'officialdelegates.ipfest2027@gmail.com', email_verified: true
    }).firestore()
    const unverifiedTreasury = env.authenticatedContext('unverified-treasury', {
      email: 'treasury.ipfest2027@gmail.com', email_verified: false
    }).firestore()
    await assertSucceeds(getDocs(collection(treasury, 'Team')))
    await assertSucceeds(getDocs(collection(delegatesRelation, 'Team')))
    await assertFails(getDocs(collection(unverifiedTreasury, 'Team')))
    await assertSucceeds(updateDoc(doc(treasury, 'Team', 'bcc-team'), {
      payment_status: 'verified', payment_verified_at: serverTimestamp(),
      payment_verified_by: 'treasury.ipfest2027@gmail.com'
    }))
    await assertFails(updateDoc(doc(delegatesRelation, 'Team', 'bcc-team'), { payment_status: 'verified' }))
    await assertSucceeds(updateDoc(doc(treasury, 'Team', 'final-team'), {
      'final_reg.paymentStatus': 'verified',
      'final_reg.verifiedAt': serverTimestamp(),
      'final_reg.verifiedBy': 'treasury.ipfest2027@gmail.com'
    }))
    await assertFails(updateDoc(doc(treasury, 'Team', 'final-team'), { 'final_reg.teamName': 'Tampered' }))
    await assertFails(updateDoc(doc(treasury, 'Team', 'final-team'), { final_reg: null }))
    await assertFails(updateDoc(doc(treasury, 'Team', 'bcc-team'), { status: 'approved' }))
    await assertFails(updateDoc(doc(treasury, 'Team', 'bcc-team'), { payment_status: 'verified', teamName: 'Tampered' }))
    await assertSucceeds(updateDoc(doc(manager, 'Team', 'bcc-team'), { 'sub_preliminary.score': 100 }))
    await assertFails(updateDoc(doc(manager, 'Team', 'bcc-team'), { payment_status: 'pending_verification' }))
    await assertFails(updateDoc(doc(manager, 'Team', 'bcc-team'), { 'sub_preliminary.score': 251 }))
  })
})

describe('Firestore active collection access', () => {
  it('limits SC selection and answers to the selected participant', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'SC_Selection', 'sc-owner'), { university: 'ITB', team: 'Alpha' })
      await setDoc(doc(db, 'SC_Del_Answer', 'sc-owner'), { university: 'ITB', team: 'Alpha' })
    })
    const owner = env.authenticatedContext('sc-owner').firestore()
    const other = env.authenticatedContext('other').firestore()
    await assertSucceeds(getDoc(doc(owner, 'SC_Selection', 'sc-owner')))
    await assertFails(getDoc(doc(other, 'SC_Selection', 'sc-owner')))
    await assertSucceeds(updateDoc(doc(owner, 'SC_Del_Answer', 'sc-owner'), { question1: { answer: 'A', submittedAt: serverTimestamp() } }))
    await assertFails(updateDoc(doc(owner, 'SC_Del_Answer', 'sc-owner'), { score: 100 }))
    await assertFails(getDoc(doc(other, 'SC_Del_Answer', 'sc-owner')))
  })

  it('limits Information to same-competition reads and manager case-link updates', async () => {
    await seedTeam('bcc-team', team('bcc-team', 'business case'))
    await seedTeam('sc-team', team('sc-team', 'smart competition'))
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'Information', 'bcc-case'), { competition_name: 'business case', prelim_case_link: null })
      await setDoc(doc(db, 'Information', 'sc-case'), { competition_name: 'smart competition', prelim_case_link: null })
    })
    const owner = env.authenticatedContext('bcc-team').firestore()
    const manager = env.authenticatedContext('bcc-manager', { email: 'bcc.ipfest2027@gmail.com', email_verified: true }).firestore()
    const wrongManager = env.authenticatedContext('sc-manager', { email: 'sc.ipfest2027@gmail.com', email_verified: true }).firestore()
    await assertSucceeds(getDoc(doc(owner, 'Information', 'bcc-case')))
    await assertSucceeds(getDocs(query(collection(owner, 'Information'), where('competition_name', '==', 'business case'))))
    await assertFails(getDoc(doc(owner, 'Information', 'sc-case')))
    await assertSucceeds(updateDoc(doc(manager, 'Information', 'bcc-case'), { prelim_case_link: 'Case/business case/v1.pdf' }))
    await assertFails(updateDoc(doc(manager, 'Information', 'bcc-case'), { unrelated: true }))
    await assertFails(getDoc(doc(wrongManager, 'Information', 'bcc-case')))
  })

  it('allows bounded anonymous attendance check-in and one checkout only', async () => {
    const db = env.unauthenticatedContext().firestore()
    const attendance = doc(db, 'Career_Talk', 'attendee@example.com')
    await assertSucceeds(setDoc(attendance, {
      name: 'Attendee', email: 'attendee@example.com', major: 'Engineering', university: 'ITB',
      nim: '12345', batch: '2026', checkin: serverTimestamp(), checkout: null
    }))
    await assertSucceeds(updateDoc(attendance, { checkout: serverTimestamp() }))
    await assertFails(updateDoc(attendance, { checkout: serverTimestamp() }))
    await assertFails(updateDoc(attendance, { send_certificate: true }))
    await assertSucceeds(setDoc(doc(db, 'Grand_IPCONVEX', 'gi@example.com'), {
      name: 'Attendee', email: 'gi@example.com', major: 'Engineering', university: 'ITB',
      nim: '12345', batch: '2026', checkin: serverTimestamp(), checkout: null
    }))
    await assertFails(setDoc(doc(db, 'Grand_IPCONVEX', 'checkout-only@example.com'), {
      full_name: 'Attendee', email: 'checkout-only@example.com', major: 'Engineering', university: 'ITB',
      student_number: '12345', batch: '2026', checkin: null, checkout: serverTimestamp()
    }))
    await assertFails(setDoc(doc(db, 'Grand_IPCONVEX', 'spoofed@example.com'), {
      name: 'Spoofed', email: 'different@example.com', major: 'Engineering', university: 'ITB',
      nim: '12345', batch: '2026', checkin: serverTimestamp(), checkout: null
    }))
  })

  it('limits attendance reads to verified event staff and certificate writes to trusted server', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'Career_Talk', 'attendee@example.com'), { email: 'attendee@example.com', checkin: null, checkout: null })
    })
    const eventStaff = env.authenticatedContext('event-staff', { email: 'event@ipfest25.com', email_verified: true }).firestore()
    const participant = env.authenticatedContext('participant').firestore()
    await assertSucceeds(getDocs(collection(eventStaff, 'Career_Talk')))
    await assertFails(getDocs(collection(participant, 'Career_Talk')))
    await assertFails(setDoc(doc(eventStaff, 'Certificates', 'forged'), { name: 'Forged', email: 'x@example.com' }))
  })

  it('limits merchandise orders to verified manager reads and status-only updates', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'Merch', 'order-1'), { status: 'pending', totalAmount: 100 })
    })
    const manager = env.authenticatedContext('merch-manager', {
      email: 'entrepreneurship.ipfest2026@gmail.com', email_verified: true
    }).firestore()
    const publicDb = env.unauthenticatedContext().firestore()
    await assertSucceeds(getDocs(collection(manager, 'Merch')))
    await assertSucceeds(updateDoc(doc(manager, 'Merch', 'order-1'), { status: 'verified' }))
    await assertFails(updateDoc(doc(manager, 'Merch', 'order-1'), { totalAmount: 0 }))
    await assertFails(getDocs(collection(publicDb, 'Merch')))
    await assertFails(setDoc(doc(publicDb, 'Merch', 'new-order'), { status: 'pending' }))
  })
})

describe('Storage access', () => {
  it('denies public merchandise reads and writes', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), 'Merch/order/proof.jpg'), new Uint8Array([1]))
    })
    const storage = env.unauthenticatedContext().storage()
    await assertFails(getBytes(ref(storage, 'Merch/order/proof.jpg')))
    await assertFails(uploadBytes(ref(storage, 'Merch/order/proof.jpg'), new Uint8Array([1])))
  })

  it('allows owner files and denies other participants', async () => {
    await seedTeam('owner')
    const owner = env.authenticatedContext('owner').storage()
    const other = env.authenticatedContext('other').storage()
    await assertSucceeds(uploadBytes(ref(owner, 'team/owner/leader/id.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }))
    await assertSucceeds(getBytes(ref(owner, 'team/owner/leader/id.jpg')))
    await assertFails(getBytes(ref(other, 'team/owner/leader/id.jpg')))
    await assertFails(uploadBytes(ref(other, 'team/owner/leader/id.jpg'), new Uint8Array([2]), { contentType: 'image/jpeg' }))
    await assertFails(uploadBytes(ref(owner, 'team/owner/leader/id.jpg'), new Uint8Array([2]), { contentType: 'image/jpeg' }))
    await assertFails(deleteObject(ref(owner, 'team/owner/leader/id.jpg')))
    await assertFails(uploadBytes(ref(owner, 'team/owner/leader/payload.exe'), new Uint8Array([2]), { contentType: 'application/x-msdownload' }))
  })

  it('allows same-competition manager reads and restricts Case writes to its manager', async () => {
    await seedTeam('bcc-team', team('bcc-team', 'business case'))
    const manager = env.authenticatedContext('bcc-manager', {
      email: 'bcc.ipfest2027@gmail.com', email_verified: true
    }).storage()
    const wrongManager = env.authenticatedContext('sc-manager', {
      email: 'sc.ipfest2027@gmail.com', email_verified: true
    }).storage()
    const owner = env.authenticatedContext('bcc-team').storage()
    await assertSucceeds(uploadBytes(ref(owner, 'team/bcc-team/leader/id.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }))
    await assertSucceeds(getBytes(ref(manager, 'team/bcc-team/leader/id.jpg')))
    await assertFails(getBytes(ref(wrongManager, 'team/bcc-team/leader/id.jpg')))
    await assertSucceeds(uploadBytes(ref(manager, 'Case/business case/case.pdf'), new Uint8Array([1]), { contentType: 'application/pdf' }))
    await assertFails(uploadBytes(ref(manager, 'Case/business case/case.pdf'), new Uint8Array([2]), { contentType: 'application/pdf' }))
    await assertFails(deleteObject(ref(manager, 'Case/business case/case.pdf')))
    await assertFails(uploadBytes(ref(wrongManager, 'Case/business case/case.pdf'), new Uint8Array([1]), { contentType: 'application/pdf' }))
    await assertSucceeds(getBytes(ref(owner, 'Case/business case/case.pdf')))
    await assertFails(getBytes(ref(owner, 'Case/smart competition/case.pdf')))
  })
})
