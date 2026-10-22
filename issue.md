# Event Pages UI/UX and Navbar Alignment

GitHub issue: [#7](https://github.com/fdefary/WebDevIPFEST2027/issues/7)

## Summary

Align the IPFEST event pages with the 2027 Grand Theme and make the shared navigation consistent and usable across desktop and mobile layouts.

## Work completed

- Refreshed the IPCONVEX, IPEXPO, and IPTRAINING event content with the supplied descriptions, timelines, and contact person details.
- Applied the Grand Theme styling to event pages, including navy-and-gold colors, event imagery, typography, cards, logo treatment, and animated background elements.
- Updated the event navbar across all six pages with consistent navigation links, including Merchandise, corrected relative paths, and a high stacking order.
- Fixed mobile menu toggle visibility and dropdown styling. Dropdowns now use navy backgrounds, ivory text, and gold hover/focus states.
- Prevented horizontal page overflow on narrow screens.

## Pages in scope

- `public/events/ipconvex.html`
- `public/events/ipexpo.html`
- `public/events/iptraining.html`
- `public/events/discover-bandung.html`
- `public/events/gala-dinner.html`
- `public/events/petrocare.html`

## Shared styles

- `public/static/css/grand-theme.css`
- `public/static/css/competition.css`

## Verification

- `npm test`
- `git diff --check`
- Browser checks at mobile and desktop widths across all six event pages: navbar toggle, dropdown visibility, dropdown colors/hover state, and horizontal overflow.
