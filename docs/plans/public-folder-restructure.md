# Public Folder Restructure Plan

## Goal

Make `public/` easier to navigate and maintain without breaking Firebase Hosting URLs, page navigation, styles, images, or Webpack-loaded scripts.

## Implementation status

Image organization and usage cleanup implemented on 2026-11-02. Existing page routes were preserved; 49 top-level images moved into purpose-based subfolders, all 23 used previous-event photos moved into `static/images/events/archive/`, in-repository references were updated, and 125 unused images were removed after checking HTML, CSS/SCSS, and JS references. The remaining design-board and mascot references in `DESIGN.md` were retained even though current pages do not use them.

- Added `scripts/check-public-references.js` and tests for clean URLs, query/hash suffixes, Sass partial imports, escaped spaces, and all current HTML/CSS/SCSS references.
- Moved 49 top-level images into `brand/`, `competitions/`, `events/`, `partners/`, and `ui/` subfolders; `docs/public-image-assets.json` records the mapping and `tests/public-image-organization.test.js` enforces it.
- Audited all 246 public image assets against local HTML, CSS/SCSS, and JS paths. Removed 125 without runtime references or an explicit remaining design-document role; retained the design-board and mascot assets cited in `DESIGN.md`.
- Moved the 23 referenced previous-event photos from `prev_event_photos/` into `static/images/events/archive/` and updated 51 page references; a test prevents the legacy folder from returning.
- Added `npm run check:public` and included the checker/test in `npm test`.
- Enabled Webpack `output.clean`; a clean build now replaces old ignored `public/dist/` bundle names rather than accumulating them.
- Fixed competition footer links on IPTRAINING and PetroCare, a wrong CSS image path, and the login mascot path. Removed references to absent `site-layout.js`, `competition-manager.css`, and `dist/plugin/chart.min.js` files.
- Updated the root README with the `public/dist/` ownership and checker command.

Validation after the unused-image cleanup: `npm run build`, `npm run check:public`, and `npm test` passed (8 Node unit tests and 15 emulator tests). Browser smoke testing was not performed.

## Current-state inventory

`firebase.json` publishes `public/` directly with `cleanUrls: true`. Therefore, a file's path under `public/` is also a public URL, and relative links resolve from each HTML page's current URL.

Baseline inventory before implementation: 40 HTML pages, 361 files under `static/`, 40 previous-event photos, and 102 files under ignored `dist/`. The root has 9 HTML files; the remaining pages are already grouped under `attendance/` (5), `competitions/` (9), `dashboard/` (11), and `events/` (6). `static/` already has `css/`, `fonts/`, `images/`, `js/`, `lib/`, and `scss/` categories. Most disorder is in the large image collection and in mixed-era/generated files, not in the top-level page folders.

Important coupling found:

- `public/index.html` links to the competition, event, merchandise, and login routes; these are also repeated in page navigation and footers.
- HTML files refer to `static/`, `dist/`, and `prev_event_photos/` with both root-relative and parent-relative paths. CSS adds more relative image/font references.
- `src/` contains runtime redirects to HTML routes, while scripts under `scripts/` and tests read specific public files by path.
- `webpack.config.babel.js` writes build output to `public/dist/`. That directory is ignored by Git and contains both current split-chunk output and old bundle names. Some dashboards also reference `dist/plugin/chart.min.js`; verify this separately before deciding whether it is a missing dependency or stale markup.
- `README.md` explicitly treats the existing public URL layout as intentional. Keep that as the default compatibility requirement.

## Proposed organization

Keep the existing URL-bearing page paths and the existing static URL prefixes for the first cleanup. The target should remain recognizable and shallow:

```text
public/
  index.html
  login.html
  register.html
  reset-password.html
  merchandise.html
  merchandise-catalog.html
  coming-soon.html
  400.html
  404.html
  attendance/                 # attendance pages (existing URLs)
  competitions/               # public competition pages (existing URLs)
  dashboard/                  # authenticated/admin pages (existing URLs)
  events/                      # public event pages (existing URLs)
  static/
    css/
    fonts/
    images/                    # purpose-based folders; manifest lists moved top-level files
    js/
    lib/                       # third-party browser libraries
    scss/                      # source/vendor SCSS, not runtime assets
  dist/                        # generated Webpack output only; do not hand-edit
```

Do not create another `pages/` wrapper around the existing route folders or rename root pages in the initial pass. A later, separately approved URL migration may add redirect/compatibility policy; it is not needed to make the current structure safer.

## Migration principles

1. **Public URL compatibility first.** Do not move or rename an HTML page, image, font, stylesheet, script, photo, or library until its incoming references and compatibility behavior are known.
2. **Inventory before deletion.** `public/dist/` is generated and ignored, but stale files can mask missing build dependencies. Confirm every script reference and the deploy build sequence before changing cleanup behavior. Never delete `public/static/lib/` files or oddly named `temp`/`.map`/`.php` files merely because they look unused.
3. **Separate source from output.** Keep editable application JS in `src/`, keep page HTML/CSS and static runtime assets in `public/`, and let Webpack own `public/dist/`.
4. **Small batches.** Change one asset family or page family at a time, update references in the same change, and validate before moving on.
5. **No redesign or behavior changes.** The scope is paths, ownership, and dead-file cleanup that can be proven safe.

## Implementation phases

### Phase 1 — Establish a safe baseline

- Confirm the Hosting workflow builds Webpack output before deploy and record how local `public/dist/` is produced.
- Check local references in HTML (`href`, `src`, `poster`, `srcset`) and CSS/SCSS `url()`/`@import`; source ES module imports remain covered by `scripts/check-frontend-layout.js`. Resolve paths relative to the referring file; ignore external URLs, data URLs, fragments, and protocol handlers.
- Add a small Node check (or extend an existing check script) that fails on newly broken local references. First classify current failures, including the dashboard chart script path, so the checker does not hide pre-existing issues.
- Record a representative smoke-test set: landing page, one event page, one competition page, login/register, one attendance page, and one dashboard including Smart Competition.

**Acceptance:** checker reports no missing local HTML/CSS/SCSS references after the fixes; `npm run build` succeeds; existing frontend checks pass.

### Phase 2 — Clarify generated build output

- Compare all HTML script references with the current Webpack entry/chunk outputs and with the deployment workflow.
- Decide which legacy bundle references are obsolete and which referenced files are external/manual assets. In particular, resolve the chart script references before touching Webpack cleanup settings.
- Make `public/dist/` reproducible from source in a clean build/deploy. Only enable output cleanup after proving no required hand-maintained asset lives under `dist/`.
- Do not commit generated bundles or relocate the output in this phase.

**Acceptance:** a fresh build produces every local script referenced by active pages; obsolete bundle names are not relied on; deploy still builds before Hosting upload.

### Phase 3 — Organize source-owned static assets

- Keep current public URLs initially. First classify `static/images/` top-level files into an ownership inventory: brand, competition, event, sponsor/partner, merchandise, UI/error, and unclassified/legacy.
- Identify genuinely unused assets by checking references across HTML, CSS/SCSS, JavaScript, and generated page data—not by filename or visual guess. Keep uncertain assets in place and mark them unresolved.
- If a family is moved into subfolders, move one family at a time and update every code reference, including CSS `url()` values, HTML attributes, JS data, and docs that describe runtime assets. Preserve case, spaces, and encoded URL behavior.
- Keep `static/lib/` recognizable as vendored third-party material. Do not fold it into app-owned JS/CSS.
- Audit `static/scss/bootstrap/` as vendor source and `static/js/` as legacy/static page scripts; leave both until ownership and usage are confirmed.

**Acceptance:** the local-reference check is clean after each batch; no page's asset request changes to 404; asset ownership is clearer without an indiscriminate directory shuffle.

### Phase 4 — Remove only proven dead material

- For each candidate, document the search scope and evidence that it has no runtime, build, test, or documentation consumer.
- Prioritize stale `dist/` outputs (after Phase 2), temporary/vendor artifacts, and duplicate assets only when the replacement is byte/visually confirmed and references are migrated.
- Keep archival photos and legacy files if their public URL may be externally linked or their use is uncertain. Deletion is not a goal by itself.

**Acceptance:** every deletion has a verified no-reference result and a successful build/test run; no broad wildcard deletion.

### Phase 5 — Documentation and final validation

- Update `README.md`'s public tree and ownership notes only to reflect the final implemented structure.
- Run `npm run build`, `npm test`, and the reference checker. Run local Hosting/browser smoke tests against the representative pages and inspect browser network/console errors.
- Verify the deployed URL list or Hosting preview before production deployment. Do not deploy as part of the reorganization task unless explicitly requested.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| A move silently changes a public URL | Preserve routes by default; inventory references and use compatibility redirects/aliases only through an explicit URL-migration decision. |
| Relative paths break from nested pages | Resolve references from the referring file and test pages at their deployed nested URLs, not only at site root. |
| Build cleanup deletes a manually supplied chart file | Audit all `dist/` references and build ownership before enabling Webpack output cleanup. |
| Assets appear unused because references are constructed dynamically or live in CSS/JS | Search markup, CSS, SCSS, JS, test fixtures, docs, and runtime data; retain uncertain assets. |
| Case, spaces, or URL encoding differs between Windows and Hosting | Preserve exact filename casing and test URL-encoded spaces on a case-sensitive Hosting preview. |

## Out of scope

- Rewriting the site as a SPA, changing page URLs/SEO routes, or changing Firebase Hosting configuration beyond a verified need.
- Restyling pages, consolidating CSS, replacing vendor libraries, renaming every asset, or converting HTML pages to templates.
- Deploying production changes.

## Decisions to confirm before implementation

- Treat all existing page and asset URLs as compatibility-sensitive unless evidence says otherwise. (Recommended.)
- Keep `public/dist/` generated and ignored; only remove stale output through a verified clean build.
- Defer any public-facing asset URL redesign to its own change with an explicit redirect/alias strategy.
