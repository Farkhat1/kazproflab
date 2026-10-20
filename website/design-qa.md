# Design QA

Date: 2026-10-20

## Latest addition: favicon and map

Source: original brand asset `../content-assets/brand/kazproflab-original.png` and the live [original contacts page](https://kazproflab.kz/contacts). The original map's URL was checked against the saved `company.mapUrl`; coordinates remain `51.1263996,71.4183996`.

- The favicon uses the original blue/gold emblem, cropped only to omit the tiny wordmark. A white background preserves visibility in different browser themes. ICO contains 16/32/48 px variants; PNG 16/32 and Apple 180 icons are also linked.
- Contacts now includes a lazy-loaded, titled Google Maps iframe, an external-map link and the original directions. The footer address links to `/contacts#location-map`.
- Existing typography, colors, content and contact layout remain intact. The new section follows the existing heading/link spacing, with a 440 px desktop map and 300 px mobile map.
- Production browser check: `qa/map-favicon/report.json`. Map tiles and the marker load, the footer anchor scrolls correctly, all icon URLs return HTTP 200, no horizontal overflow at 1536/390/320 px, and no runtime/hydration errors were observed.
- Visual evidence: `qa/map-favicon/comparison.png` combines before/after full-page captures from a 1536 × 1024 CSS viewport at density 1, equally scaled in both columns. Different page heights reflect the requested addition. Focused captures: `original-map.png` and `map-{1536,390,320}.png`. The first captures were taken during Google's tile animation; the evidence was recaptured after tiles, controls and animations settled.
- Production build regenerated all 59 routes; packaging checks pass 4/4. This targeted addition was checked separately from the full regression documented below.

No actionable P0/P1/P2 issues remain. Third-party map content requires internet access; the standalone map link remains available.

## Current visual experiment

No actionable P0/P1/P2 findings remain after the final comparison.

The original source is `../output/design-concepts-round-3/03-technological.png` (1536 × 1024). The user subsequently requested the original logo, integrated service imagery, and additional generated photographs on the landing page/footer. These intentional changes are recorded in `AGENTS.md` and supersede exact fidelity in those regions.

The earlier implementation is captured in `qa/visual-v2/before/`. The refreshed production implementation is at `http://127.0.0.1:4174/`, with captures in `qa/visual-v2/after/`.

## Comparison evidence

- Full view against the selected concept: `qa/visual-v2/selected-concept-comparison.png`.
- Before/after first screen: `qa/visual-v2/home-1536-comparison.png`.
- Focused company section: `qa/visual-v2/intro-1536-comparison.png`.
- Focused footer: `qa/visual-v2/footer-1536-comparison.png`.
- Original logo at rendered size: `qa/visual-v2/after/brand.png`.
- Final service and catalog captures: `qa/visual-v2/after-services-final/`.
- Mobile home, company section and footer: `qa/visual-v2/after/*-390.png` and `*-320.png`.

Source mock and desktop first-screen implementation are both 1536 × 1024 pixels, rendered at a 1536 × 1024 CSS viewport with deviceScaleFactor 1. Before/after section captures use the same 1536 px viewport and density; their heights intentionally differ because photographs and the contact block change the composition. Comparison boards scale both columns equally. Mobile viewports are 390 × 844 and 320 × 844, density 1. All captures show loaded local fonts and images, the default theme, and closed menus/dialogs unless their filename specifies an open menu.

The images were opened and visually inspected together, including the combined source/implementation board. Logo and service details were also inspected in focused captures.

## Required fidelity surfaces

| Surface | Result |
| --- | --- |
| Fonts and typography | Local Manrope with Cyrillic is preserved. Original hero wrapping, weight and hierarchy remain intact. Service titles wrap within the narrower column; text-bearing source banners remain fully visible. Brand lettering and its descriptor fit at all checked breakpoints. |
| Spacing and layout | The original 598 px desktop hero and four service columns remain. The company section now pairs photography with the complete text. Service pages pair the title with an image; catalog cards have a consistent 3:2 image area. Footer CTA sits above navigation in one continuous photographic section. Mobile layouts stack without horizontal overflow. |
| Colors and tokens | Midnight navy, cyan actions/headings, muted body copy and fine dividers remain consistent with the selected concept. The real logo retains its blue/gold colors on a light badge. Overlays keep footer text readable without hiding the balance on desktop. |
| Image quality and assets | The actual 640 × 630 source logo is optimized to lossless WebP, not redrawn. Two generated photographs follow the established laboratory direction and are optimized to approximately 99 KB and 63 KB. All 33 original service images remain; five text-bearing banners use `contain` to avoid lost information. Photographic subject, crop, sharpness and mobile framing were inspected. |
| Copy and content | All 59 source routes, substantive texts, prices and homepage sections are preserved and verified against the source snapshot. Generated photography is illustrative and does not make a claim about the company's physical premises. Contact details and the contextual WhatsApp draft remain unchanged. |

Phosphor icons remain consistent and controls retain visible keyboard focus. The green floating WhatsApp shortcut remains at the original left-hand position.

## Comparison history and fixes

1. Initial build: the hero was 614 px rather than the reference's 598 px. Line spacing, service-column proportions and heading weight were corrected; the earlier evidence remains in `qa/comparison.png`.
2. This iteration intentionally replaces the plain wordmark with the real brand asset and introduces photography into the company section, service heroes/cards and footer. Tablet navigation now changes to a menu through 1100 px so the wider brand does not crowd controls.
3. A P2 issue in the first mobile footer capture exposed the offscreen skip link. The transform-only hiding rule was replaced with a clipped 1 px unfocused state. The revised mobile captures show no leaked control; keyboard checks confirm the link appears on first Tab, activates `#main-content`, and the next Tab reaches the main CTA. Native fragment navigation leaves `activeElement` as BODY.
4. Post-fix production captures were compared again at the same viewport and density. No further actionable P0/P1/P2 differences remain.

## Functional evidence

Final production report: `qa/visual-v2/production/browser-report.json`.
Additional header/keyboard report: `qa/visual-v2/after-services-final/header-report.json`.

- 59/59 original routes return HTTP 200 with prerendered HTML.
- 27/27 responsive checks pass at 1536, 390 and 320 px.
- Additional header checks pass at 768, 1024, 1100, 1280 and 390 px.
- 4/4 browser checks with JavaScript disabled pass.
- 6/6 interaction scenarios pass: search/filter/reset; category/service navigation; consultation validation, focus trap and Escape; service topic prefill; all six homepage accordion panels; mobile menu and contextual WhatsApp.
- Original descriptions and prices match the migration snapshot.
- No invalid links, broken images, failed requests, console, runtime or hydration errors.
- WhatsApp is intercepted in tests; no messages were sent.
- Production build succeeds with all 59 pages; template packaging tests pass 4/4.

## Assets and limits

Original logo provenance: `../content-assets/brand/source.json`. Generated originals and exact prompts: `../content-assets/visual-v2/`, created through built-in Image Gen. Optimized runtime files are in `public/assets/brand/` and `public/assets/visual-v2/`.

Source-content review items remain in `../content-source/REVIEW-NOTES.md`: SAPA SPACE / Алматы, generic merchandise-return text, and contradictory course durations. These facts have not been silently altered.

Browser verification used Microsoft Edge on Windows at desktop/tablet/mobile viewport sizes; physical iOS/Android devices were not tested. Preview remains local. The consultation form prepares a WhatsApp draft; it does not submit to a backend.

## Implementation checklist

- [x] Original brand mark integrated in the header and footer.
- [x] Service images integrated into page headers and catalog cards.
- [x] Generated company-section and footer photography integrated and optimized.
- [x] Post-fix visual comparison, responsive and functional checks completed.
- [x] Production preview rebuilt with all source content.

final result: passed
