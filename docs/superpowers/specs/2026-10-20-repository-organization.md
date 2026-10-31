# Repository Organization and Secret Handling

## Intent

Make the IPFEST website repository easier to develop by clarifying ownership of source code, hosted files, build output, backend functions, design assets, and configuration. Remove the hard-coded email service credential from source code.

## Goals

- Keep Firebase Hosting's `public/` directory as the deployed web root.
- Keep existing public page URLs and asset URLs working.
- Keep front-end source code outside the deployed `public/` tree.
- Keep generated bundles under `public/dist/` because pages load them there and Hosting serves that directory.
- Keep Firebase Cloud Functions isolated in `functions/` with its own dependencies.
- Move the email credential to Firebase Secret Manager and bind it only to the function that needs it.
- Document directory ownership and the local development/build workflow.

## Non-goals

- Rewrite the website into a new framework or redesign its application architecture.
- Rename public routes or bulk-convert public assets.
- Delete historical/possibly-unused source files without usage verification.
- Perform a general dependency/security upgrade as part of this task.

## Structure

```text
src/                     # Webpack source JavaScript (not deployed directly)
public/                  # Firebase Hosting root; preserve current URL layout
  attendance/            # Hosted attendance pages
  competitions/          # Hosted competition pages
  dashboard/             # Hosted operational/admin pages
  events/                # Hosted event pages
  static/                # Hosted CSS, images, fonts, and browser libraries
  dist/                  # Generated browser bundles
functions/               # Firebase Cloud Functions and backend dependencies
design/                  # Design references and source materials
.github/                 # Hosting CI workflows
root config files        # Firebase rules/configuration, Webpack, Babel, npm
```

## Responsibilities

- `src/` owns browser JavaScript source and Firebase Web SDK integration.
- `public/` owns files that must be served by Firebase Hosting; `public/dist/` is generated output, not hand-edited source.
- `functions/` owns server-side event handlers and backend-only dependencies.
- `design/` owns design references, not runtime assets.
- Root configuration owns build/deploy wiring and Firebase rules remain at their current paths unless configuration is updated consistently.
- `README.md` documents these boundaries and the local development/build workflow.

## Compatibility and safety

- Preserve all existing hosted HTML and static asset paths; only move source JavaScript after updating Webpack entries and checking for direct HTML references.
- Do not delete `*_ori.js` or other legacy files in this change unless they are proven unused and deletion is explicitly included in the implementation plan.
- The current email service credential must be rotated in its provider, then supplied to Firebase Secret Manager as `MAILGUN_SMTP_PASSWORD`; source code must read the bound secret at runtime and must not contain the credential.
- Local emulator overrides belong in the ignored `functions/.secret.local` file and must not be committed.
- The certificate trigger should retain its Firestore collection/path, region, generated PDF behavior, and email behavior while adopting a supported secret binding mechanism.
- Do not print or commit secret values.

## Verification

- Production Webpack build succeeds.
- Every HTML page's referenced bundle, CSS, and static asset remains at its old public URL.
- Firebase Functions source passes syntax/load checks without requiring a secret value during module import.
- Git diff contains no credential value.
- README explains secret provisioning and directory responsibilities.
