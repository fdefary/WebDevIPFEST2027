import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, it } from 'node:test'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { ref, getBytes, uploadBytes } from 'firebase/storage'

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
    const manager = env.authenticatedContext('bcc-manager', {
      email: 'bcc.ipfest2027@gmail.com', email_verified: true
    }).firestore()
    await assertSucceeds(getDocs(query(collection(manager, 'Team'), where('competition', '==', 'business case'))))
    await assertFails(getDocs(collection(manager, 'Team')))
    await assertSucceeds(getDoc(doc(manager, 'Team', 'bcc-team')))
    await assertFails(getDoc(doc(manager, 'Team', 'sc-team')))
    await assertSucceeds(updateDoc(doc(manager, 'Team', 'bcc-team'), { 'sub_preliminary.score': 100 }))
    await assertFails(updateDoc(doc(manager, 'Team', 'bcc-team'), { payment_status: 'verified' }))
    await assertFails(updateDoc(doc(manager, 'Team', 'bcc-team'), { 'sub_preliminary.score': 251 }))
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
    await assertFails(uploadBytes(ref(wrongManager, 'Case/business case/case.pdf'), new Uint8Array([1]), { contentType: 'application/pdf' }))
    await assertSucceeds(getBytes(ref(owner, 'Case/business case/case.pdf')))
    await assertFails(getBytes(ref(owner, 'Case/smart competition/case.pdf')))
  })
})
