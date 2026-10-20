# Design QA

Status: **passed**

Date: 2026-10-20

## Approved visual source

`../output/design-concepts-round-3/03-technological.png` — 1536 × 1024.

The user selected the technological direction and requested the full original content and original floating WhatsApp behavior. The selected image was inspected before implementation. Product Design image-to-code was used; the laboratory background was generated separately from the typography and interface.

## Same-viewport comparison

- Implemented viewport: 1536 × 1024.
- Final screenshot: `qa/production/home-desktop.png`.
- Source and implementation shown together: `qa/comparison.png`, with the inspectable comparison in `qa/comparison.html`.
- Additional evidence: `qa/production/home-mobile.png`, `catalog-desktop.png`, `catalog-mobile.png`, `service-desktop.png`, `service-mobile.png`, `contacts-desktop.png`, `contacts-mobile.png`.

Compared the rendered site with the actual selected image, rather than only evaluating the implementation in isolation. The first pass had an oversized hero (614 px); its line spacing was corrected to produce the reference's 598 px boundary. The four service-column proportions and heading weight were also corrected.

## Visual findings

| Area | Result |
| --- | --- |
| Composition | Matched the photographic laboratory hero, overlaid navigation, left-aligned three-line headline, two actions, open four-column services and process strip. |
| Typography | Local Manrope variable font with Cyrillic; clear size hierarchy and reference-aligned headline width. |
| Color | Midnight navy background, bright cyan headings/actions and fine divider rules match the selected direction. |
| Imagery | Separate laboratory photograph retains dark text space on the left and instruments/glassware on the right. Its exact photographic details differ from the mockup. |
| Content | Expanded beyond the one-screen mockup to include all substantive source information and all source routes. |
| Long descriptions | Light reading panels within the dark visual system; full descriptions, tables and prices remain readable. |
| Responsive layout | Four service columns become two, navigation becomes a menu, content/sidebar stacks, tables remain contained. No horizontal overflow at 320, 390 or 1536 px in tested pages. |
| WhatsApp | Green floating shortcut at the original left-hand position; phone `77004496383` and original current-page message behavior preserved. |

Deliberate additions to the source mock: the requested WhatsApp shortcut, the rest of the original homepage content, 58 internal pages, searchable service catalog and consultation dialog.

## Functional evidence

Final production report: `qa/production/browser-report.json`.

- 59/59 original routes load with prerendered HTML.
- 27/27 responsive checks pass.
- 4/4 browser checks with JavaScript disabled pass.
- 6/6 interaction scenarios pass: search/filter/reset; category/service navigation; consultation validation, focus trap and Escape; service topic prefill; all six homepage accordion panels; mobile menu and contextual WhatsApp.
- Full source descriptions and prices verified against the migration snapshot.
- No invalid internal links, broken images, JavaScript errors or hydration errors.
- WhatsApp is intercepted in tests. No messages were sent.
- `npm run build` succeeds, including all 59 prerendered pages.
- Template packaging tests: 4/4 pass.

The earlier native-dialog focus gap and two obsolete `/#bot` links were fixed and retested. Prerender serialization preserves adjacent text-node boundaries so React hydrates without errors.

## Content and publication limits

Source content review items are recorded in `../content-source/REVIEW-NOTES.md`: SAPA SPACE / Алматы, generic merchandise-return text, and contradictory course durations. These facts require the owner's editorial decision and have not been silently altered.

The preview is local. DNS and live hosting have not been changed. The consultation form prepares a WhatsApp draft; it does not submit to an email backend or database. Browser verification used Microsoft Edge on Windows at desktop/mobile viewport sizes; physical iOS/Android devices were not tested.
