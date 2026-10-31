# Firebase production — IPFEST 2027

Project target: `ipfest-2027`  
Web App: `1:997727130659:web:10902420888d916f398d96`  
Hosting: `https://ipfest-2027.web.app`  
Functions region: `asia-southeast2`

This setup starts with empty application data. It does **not** copy users, Firestore documents, or Storage files from `ipfest-2026`.

## Project configuration already set in this repo

- `.firebaserc` defaults to `ipfest-2027`.
- `firebase.json` targets Hosting site `ipfest-2027`.
- `src/index.js` uses the Web App configuration registered in project `ipfest-2027`.
- Functions use Node.js 22 and the web-to-Functions region is `asia-southeast2`.
- Firestore `(default)` Standard was created in Jakarta (`asia-southeast2`); repo Rules and indexes were deployed on 2026-10-31.
- The four core callable Functions are deployed in `asia-southeast2`; certificate issuance and email-trigger Functions remain intentionally undeployed.
- Firebase Hosting site `ipfest-2027` was deployed on 2026-10-31; public URL: `https://ipfest-2027.web.app`.
- Storage Rules were deployed after the default bucket was set up; Hosting now includes cross-step registration validation.
- Secret `MAILGUN_SMTP_PASSWORD` version 1 exists in Secret Manager. Its value is not stored in this repo.
- Artifact Registry cleanup policy for Functions is still unset; old container images may accumulate a small monthly charge.

The Firebase Web API key is client configuration, not an Admin SDK credential. Never add a service-account key JSON to the repo or frontend.

## 1. Verify the account and project

```sh
firebase login
firebase projects:list
firebase apps:list --project ipfest-2027
firebase hosting:sites:list --project ipfest-2027
```

Confirm the project ID, Web App, and Hosting site before any production command. Use `--project ipfest-2027` explicitly for deploys.

## 2. Enable Authentication

In Firebase Console for `ipfest-2027`:

1. Open **Authentication → Sign-in method** and enable **Email/Password**.
2. Add `ipfest-2027.web.app` and any production custom domain under **Authentication → Settings → Authorized domains**.
3. Configure and test the email verification template.

No users are migrated from the old project; users register again. Create and verify new staff accounts before assigning claims.

## 3. Create/check Firestore and Storage

1. The `(default)` Standard Firestore database has been created in `asia-southeast2` (Jakarta). Its location cannot be changed. The new database starts with closed rules; deploy `firestore.rules` before the app needs access.
2. Create/check the default Storage bucket from `src/index.js`: `ipfest-2027.firebasestorage.app`.
3. The certificate function separately reads `template_sertif/dummy_sertif_template.pdf`. Verify that this bucket and PDF exist and that the Functions runtime service account can read them; this is not automatically the default bucket.
4. Review `firestore.rules`, `firestore.indexes.json`, and `storage.rules`. Indexes are currently empty; add any index Firestore reports during tests before deploying.
5. Seed the required `Information` documents and other initial data using an approved, repeatable process. Empty Firestore means these documents will not appear automatically.

## 4. Prepare Cloud Functions and email

Cloud Functions requires the **Blaze** plan. The Firebase Console previously showed Spark, so a project owner must enable billing and budget alerts before deploying Functions.

If the Mailgun SMTP secret is not already configured, set it directly through the CLI prompt; do not paste it into chat, source code, or a command argument:

```sh
firebase functions:secrets:set MAILGUN_SMTP_PASSWORD --project ipfest-2027
```

Verify the Mailgun sender/domain currently hardcoded in `functions/index.js`, the secret, and the certificate template before enabling certificate issuance. No SMTP password has been provided or set by this guide.

## 5. Prepare staff claims

Review the email-to-role mapping in `functions/role-assignments.js` and update it to the approved IPFEST 2027 staff accounts. After creating and verifying those accounts, authenticate with Google Cloud ADC and do a dry run:

```powershell
gcloud auth application-default login
$env:GOOGLE_CLOUD_PROJECT = "ipfest-2027"
node .\functions\scripts\apply-role-claims.js
```

Only after reviewing the exact account list, apply claims:

```powershell
node .\functions\scripts\apply-role-claims.js --apply --confirm-production-claims
```

Staff must sign out and sign back in after claims are updated. Do not use a downloaded service-account key for this workflow.

## 6. Test and build

From the repository root:

```sh
npm test
npm run build
npm --prefix functions test
```

Resolve all failures before deploy. `npm run build` creates ignored output in `public/dist/`, which Hosting needs.

## 7. Deploy (production gate)

Run only after the project owner confirms billing, Firestore location, rules, staff mapping, SMTP secret, template bucket, and initial data.

```sh
firebase deploy --only firestore:rules,firestore:indexes,storage --project ipfest-2027
firebase deploy --only functions:createPrivateDownloadUrl,functions:updatePaymentVerifications,functions:updateCompetitionResult,functions:publishCompetitionCase --project ipfest-2027
npm run build
firebase deploy --only hosting --project ipfest-2027
```

Review the CLI deployment plan before confirming. If it proposes deleting a remote function, stop and review that change. **Do not use `--only functions` while certificate issuance is deferred**; that would also deploy `issueAttendanceCertificate` and `generateCertificate`. Authentication providers/domains, billing, secrets, staff accounts/claims, bucket contents, and Firestore seed data are not deployed by these commands.

## 8. Post-deploy smoke test

Use approved test accounts and non-real participant data:

1. Open `https://ipfest-2027.web.app`; confirm pages and bundles load over HTTPS.
2. Test registration, email verification, login, Firestore team creation, and Storage upload.
3. Test that anonymous users and other participants cannot read private team files or write privileged fields.
4. Test each callable with an allowed and disallowed role.
5. Test the certificate flow only after SMTP and template setup; inspect Functions logs and billing alerts.

The service-account key JSON is not needed for Hosting deploy, Functions runtime, or the claims script when ADC is available. Revoke any key created only for this setup and do not commit it.
