# Repository Organization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clarify repository ownership while preserving public URLs, and move the backend email credential into Firebase Secret Manager.

**Architecture:** Move front-end JavaScript source from `public/src/` to root `src/`, while keeping Hosting output in `public/` and Webpack bundles in `public/dist/`. Keep Cloud Functions in `functions/`; use a Firebase-managed secret bound to the certificate trigger, and document all developer-facing boundaries and setup steps.

**Tech Stack:** HTML/CSS/JavaScript, Webpack 5, Firebase Hosting, Firebase Cloud Functions, Firebase Secret Manager.

**Spec:** `docs/superpowers/specs/2026-10-20-repository-organization.md`

## Global Constraints

- Keep `public/` as the Firebase Hosting root.
- Preserve every existing public page URL and asset URL.
- Keep generated bundles in `public/dist/`.
- Keep backend dependencies isolated in `functions/`.
- Never put secret values in source, logs, or Git.
- Preserve the certificate Firestore trigger path, region, and user-visible behavior.
- Do not remove historical files unless proven unused.

## Review Focus

- HTML files that directly reference source JS instead of bundles: search and update or retain compatibility before moving source.
- Relative links in nested pages: keep page files and asset locations unchanged; build output paths remain stable.
- Fresh checkout without provisioned secret: module loading/build must not require secret resolution until function invocation.
- Existing production function: document trigger migration/deployment implications and avoid deploying automatically.
- Secret rotation failure: document that the old credential must be revoked after replacing it; never reveal it in command output.

---

### Task 1: Move Frontend Source Out of Hosting Root

**Files:**
- Move: `public/src/*.js` to `src/*.js`
- Modify: `webpack.config.babel.js`, `public/index.html`
- Inspect: all HTML files under `public/` for direct `src/` script references

**Interfaces:**
- Consumes: existing page bundle filenames and HTML references under `public/`.
- Produces: source files at root `src/`; bundles remain at `public/dist/[name].bundle.js`.

- [x] Search all HTML for references into `src/`; add a `sponsor` Webpack entry for `src/sponsor.js` and change the homepage reference from `src/sponsor.js` to `dist/sponsor.bundle.js`.
- [x] Move frontend source files into root `src/` and update every Webpack entry from `./public/src/...` to `./src/...`; move the imported shared alert module to `src/shared/alert.js` and update its importers.
- [x] Run `npm run build`; all bundles including `sponsor.bundle.js` are emitted under `public/dist/`.
- [x] Run `npm test`; entry points and local imports resolve, and no HTML directly loads source from `/src/`.

### Task 2: Move Email Credential to Firebase Secret Manager

**Files:**
- Modify: `functions/index.js`
- Modify if required: `functions/package.json` and lockfile only for APIs unavailable in installed Firebase Functions SDK
- Document: `README.md`

**Interfaces:**
- Consumes: secret named `MAILGUN_SMTP_PASSWORD`, provisioned out-of-band with Firebase CLI.
- Produces: certificate trigger that reads the secret only at invocation and retains current document path/region and mail behavior.

- [x] Add `functions/test/secret-binding.test.js` to fail if an inline SMTP password is present and to assert Secret Manager binding, trigger path, and region.
- [x] Run the check against the original source; it failed on the hard-coded password without including the value in its assertion message.
- [x] Replace the inline password with `defineSecret` and a second-generation Firestore trigger, preserving `Certificates/{docId}` and `asia-southeast2`.
- [x] Run `npm test`, `node --check index.js`, and a module-load check without provisioning or printing the secret.
- [x] Document safe provisioning, ignored `.secret.local` emulator setup, required credential rotation, trigger-generation migration implications, and that deployment is a separate operator action.

### Task 3: Make Remaining Directory Ownership Clear

**Files:**
- Modify: `README.md`
- Inspect: root `static/`, `design/`, `public/static/`, Firebase config/rules, `.github/`, build output ignore behavior

**Interfaces:**
- Consumes: final source/build/backend locations from Tasks 1-2.
- Produces: README directory map and safe development/build/deploy guidance.

- [x] Inspect root-level `static/`; leave the assets in place because they are outside the Hosting root and their consumers are not confirmed.
- [x] Document `src/`, `public/`, `public/static/`, `public/dist/`, `functions/`, `design/`, `.github/`, root Firebase/build configuration, and `scripts/` responsibilities.
- [x] Clarify generated output, local serve/build/test commands, and separate Functions setup/secret handling.
- [x] Verify README paths against the final tree and rerun `npm run build`.

## Final Verification

- [x] Run `npm run build` and confirm success (Webpack reports existing bundle-size warnings).
- [x] Run the Functions source safety check and syntax/load check.
- [x] Search the repository for direct frontend script references and old source paths.
- [x] Confirm no SMTP password remains in current Functions source through the source safety test; historical Git revisions still require credential rotation.
- [x] Review `git diff --check`; generated `public/dist/` output is ignored and no unrelated assets were changed.
- [x] Do not run Firebase deployment as part of this task.

## Execution Rulings

- `public/static/js/alert.js` moved to `src/shared/alert.js` because frontend entry files import it as source code and no hosted HTML referenced its old public URL. Cost if wrong: an external client that directly requests the old asset URL would need a compatibility copy or redirect.
- Root `static/` was left in place because its runtime consumers could not be confirmed; it remains documented as outside Firebase Hosting's public root.
