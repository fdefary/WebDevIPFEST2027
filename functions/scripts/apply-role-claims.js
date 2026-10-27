const admin = require('firebase-admin')
const { resolveRoleClaims, mergeRoleClaims, STAFF } = require('../role-assignments')

admin.initializeApp()
const apply = process.argv.includes('--apply')

async function main() {
  for (const email of Object.keys(STAFF)) {
    const user = await admin.auth().getUserByEmail(email)
    if (!user.emailVerified) throw new Error(`Refusing to assign a role to unverified account: ${email}`)
    const claims = mergeRoleClaims(user.customClaims, resolveRoleClaims(email))
    console.log(`${apply ? 'Assigning' : 'Would assign'} ${email}: ${JSON.stringify(claims)}`)
    if (apply) await admin.auth().setCustomUserClaims(user.uid, claims)
  }
}

if (apply && !process.argv.includes('--confirm-production-claims')) {
  throw new Error('Pass --confirm-production-claims with --apply to assign live claims.')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
