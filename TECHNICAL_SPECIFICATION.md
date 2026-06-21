# Flystar Website: Complete Technical Specification

This file is the canonical technical handoff for the Flystar International Courier website. It is deliberately explicit so that a small AI model, developer, or designer can understand the current implementation without guessing.

## 1. Project identity

| Item | Value |
|---|---|
| Product | Flystar International Courier marketing website |
| Business location | Tirupati, Andhra Pradesh, India |
| Application type | Client-side single-page application (SPA) |
| Rendering | React rendered in the browser into `#root` |
| Language | JavaScript and JSX; no TypeScript |
| Package manager | npm, with `package-lock.json` committed |
| Source module format | ES modules (`"type": "module"`) |
| Default Git branch | `main` |
| Remote repository | `https://github.com/nitishkitz/Flystar` |
| Current deployment setup | None in the repository |
| Backend | None |
| Database | None |
| Authentication | None |

The site presents services, a cinematic shipment story, a six-stage shipment journey, a quote form, demo tracking, an indicative rate calculator, contact information, and WhatsApp links.

## 2. Technology stack

### Runtime dependencies

| Package | Declared version | Purpose |
|---|---:|---|
| React | `^19.2.6` | Component and state model |
| React DOM | `^19.2.6` | Browser rendering |
| Vite | `^8.0.12` | Development server and production bundler |
| GSAP | `^3.15.0` | Scroll-linked animation |
| Lucide React | `^1.17.0` | SVG icon components |
| Inter Variable | `^5.2.8` | Body/interface font files |
| Outfit Variable | `^5.2.8` | Display/heading font files |
| Tailwind CSS | `^3.4.1` | CSS directives and optional utilities |
| PostCSS | `^8.5.15` | CSS processing |
| Autoprefixer | `^10.5.0` | Vendor prefix generation |

Most visual styling is handwritten in `src/index.css`. Tailwind is configured, but the JSX primarily uses project-specific semantic class names rather than Tailwind utility classes.

### Development and test dependencies

- ESLint 10 with recommended JavaScript, React Hooks, and React Refresh rules.
- Vitest 4 using the `jsdom` browser simulation environment.
- Testing Library for React, DOM assertions, and user-event simulation.
- Vite React plugin for JSX transformation and Fast Refresh.

## 3. Commands and prerequisites

```bash
npm ci                 # exact clean dependency installation
npm run dev            # Vite development server
npm run build          # production bundle in dist/
npm run preview        # serve the production bundle locally
npm run lint           # lint all JS/JSX source
npm test               # run all tests once
npm run test:watch     # watch tests
npm run media:build    # regenerate story media; requires ffmpeg
```

Use `npm ci`, not `npm install`, in CI. Node.js must support Vite 8. The repository was last verified locally with Node.js `v24.6.0`.

## 4. Repository and file map

```text
Flystar/
|- index.html                         Browser document, SEO metadata, root node
|- package.json                       Scripts and dependency declarations
|- package-lock.json                  Exact npm dependency graph
|- vite.config.js                     Vite + Vitest configuration
|- eslint.config.js                   ESLint flat configuration
|- tailwind.config.js                 Brand colors and font aliases
|- postcss.config.js                  Tailwind/Autoprefixer processing
|- README.md                          Original Vite template readme
|- design.md                          Older redesign notes; not canonical
|- TECHNICAL_SPECIFICATION.md         This canonical handoff
|- Assets/                            Original source videos for media processing
|- public/
|  |- favicon.svg                     Browser icon
|  |- icons.svg                       Public SVG sprite/asset
|  `- Assets/
|     |- flystar-wordmark.png         Main brand image
|     `- story/                       Runtime story videos, posters, manifest
|- scripts/
|  `- build-story-media.mjs           ffmpeg media-generation script
`- src/
   |- main.jsx                        React entry point and font/CSS imports
   |- App.jsx                         Page composition and lazy loading
   |- index.css                       Entire active visual system
   |- data/siteContent.js             Business copy and structured data
   |- config/navigation.js            Section IDs and navigation links
   |- adapters/                       Replaceable quote/tracking boundaries
   |- components/                     UI sections and interactive components
   |- hooks/                          Media, motion, navigation, and scroll hooks
   |- utils/pricing.js                Rate calculation and WhatsApp URL logic
   `- test/setup.js                   jest-dom setup
```

`src/App.css`, `src/assets/react.svg`, `src/assets/vite.svg`, and `src/assets/hero.png` are currently unused template/legacy assets. Do not assume they affect the rendered page.

## 5. Current project size

Sizes are approximate filesystem measurements and change after builds or dependency updates.

| Area | Approximate size | Notes |
|---|---:|---|
| Entire local folder | 244 MB | Includes dependencies and build output |
| `node_modules/` | 180 MB | Generated; ignored by Git |
| `dist/` | 19 MB | Generated production output; ignored by Git |
| `public/` | 15 MB | Runtime public assets |
| `Assets/` | 14 MB | Original source videos |
| `src/` | 244 KB | Application source |
| Non-generated project files counted | 73 files | Excludes `.git`, `node_modules`, and `dist` |
| Last production JS entry bundle | 337.00 KB | 115.23 KB gzip |
| Last production CSS bundle | 33.80 KB | 8.33 KB gzip |

No individual tracked asset is larger than GitHub's 100 MB per-file limit. The largest files are the chapter 2 source/runtime videos at about 5.69 MB each.

## 6. Browser document and SEO

`index.html` defines:

- Language: `en`.
- Character encoding: UTF-8.
- Responsive viewport: `width=device-width, initial-scale=1.0`.
- Theme color: `#051329`.
- Title: `Flystar International Courier | Tirupati to Worldwide Services`.
- Description: international delivery of documents, medicines, parcels, and commercial shipments from Tirupati.
- Root mount element: `<div id="root"></div>`.
- JavaScript entry: `/src/main.jsx`.

There is no Open Graph metadata, Twitter card metadata, canonical URL, structured data, sitemap, robots file, analytics, or consent manager.

## 7. Page composition and section order

`src/App.jsx` renders the page in this exact order:

1. Skip link: jumps to `#main-content`.
2. Fixed navigation header.
3. Cinematic story section, ID `story`.
4. Services section, ID `services`.
5. Deferred shipment journey wrapper, ID `journey`, placeholder minimum height `760px`.
6. Quote section, ID `quote`.
7. Deferred tracking wrapper, ID `tracking`, placeholder minimum height `720px`.
8. Deferred rate calculator wrapper, ID `rates`, placeholder minimum height `900px`.
9. Contact section, ID `contact`.
10. Footer.
11. Fixed WhatsApp action.

Lazy-loaded modules are `ShipmentOrbit`, `TrackingSection`, and `ShippingCalculator`. `DeferredSection` begins rendering a lazy section when it enters an IntersectionObserver margin of `700px 0px`. Browsers without IntersectionObserver render immediately.

## 8. Global design tokens

The active tokens are CSS custom properties in `src/index.css`.

### Colors

| Token/use | Hex or value | Meaning |
|---|---|---|
| `--ink` | `#071a34` | Primary dark navy |
| `--ink-deep` | `#041126` | Deep story/background navy |
| `--ink-soft` | `#17314f` | Focused control border navy |
| `--red` | `#d91a2a` | Primary Flystar action red |
| `--red-dark` | `#b91220` | Red hover/error text |
| `--green` | `#16835d` | Success status |
| `--surface` | `#ffffff` | Primary white surface |
| `--surface-soft` | `#f5f7fa` | Neutral section/card hover |
| `--surface-muted` | `#e9eef3` | Muted surface token |
| `--border` | `#d8e0e8` | Standard light border |
| `--text` | `#12263e` | Body text |
| `--muted` | `#607087` | Secondary text |
| Contact background | `#edf1f5` | Contact section |
| Footer background | `#020b19` | Footer |
| WhatsApp | `#1f9d61` | Floating button; hover `#168650` |
| Dark accent text | `#ff6572` | Red text on dark surfaces |
| Dark secondary text | `#b8c3d1` | Copy on navy |

Tailwind duplicates a related palette under `brand`: red `#D91A2A`, blue `#0B2545`, light blue `#134074`, navy `#081F3E`, dark `#051329`, green `#10B981`, and light `#F8FAFC`. The handwritten CSS values above are the actual current UI source of truth.

### Radius and shadow

| Token | Value |
|---|---|
| `--radius-sm` | `12px` |
| `--radius-lg` | `24px` |
| `--shadow-sm` | `0 12px 30px rgba(7, 26, 52, 0.08)` |
| `--shadow-lg` | `0 28px 80px rgba(4, 17, 38, 0.16)` |

Special radii include mobile tool cards `18px`, journey card `18px`, traveller `16px`, small controls `8-10px`, and pills/circular controls `999px` or `50%`.

## 9. Typography

### Font loading

- `Inter Variable` is imported from `@fontsource-variable/inter/wght.css` and used for body/interface text.
- `Outfit Variable` is imported from `@fontsource-variable/outfit/wght.css` and used for display headings.
- Fallbacks: `Inter`, system UI, sans-serif for body; `Outfit`, sans-serif for display.
- Global font synthesis is disabled and text rendering is optimized for legibility.

### Type rules

| Element | Size | Weight | Line height | Tracking |
|---|---:|---:|---:|---:|
| Body | `16px` | normal | inherited | normal |
| Section H2 | `clamp(42px, 5.4vw, 72px)` | `720` | `0.98` | `-0.045em` |
| Story H1/H2 | `clamp(52px, 6.3vw, 92px)` | `710` | `0.93` | `-0.055em` |
| Mobile story H1/H2 | `clamp(44px, 12vw, 70px)` | `710` | `0.93` | `-0.055em` |
| Quote H2 | `clamp(48px, 5.5vw, 74px)` | `710` | `0.98` | `-0.05em` |
| Section descriptive copy | `17px` | normal | `1.7` | normal |
| Story copy | `clamp(16px, 1.35vw, 19px)` | normal | `1.65` | normal |
| Eyebrow | `14px` | `700` | `1.3` | `0.08em`, uppercase |
| Buttons | `15px` | `700` | `1.2` | normal |
| Service H3 | `25px` | `680` | normal | normal |
| Journey stage H3 | `30px` | normal | normal | normal |
| Tracking empty H3 | `32px` | normal | `1.1` | normal |
| Rate price H3 | `38px` | normal | `1` | normal |
| Form label | `14px` | `700` | normal | normal |
| Form input | `16px` | normal | normal | normal |
| Footer text | `13-15px` | mixed | `1.5-1.7` | normal |

At widths up to `620px`, normal section H2 headings are forced to `42px`.

## 10. Layout system

### Global rules

- Universal `box-sizing: border-box`.
- Body minimum width: `320px`.
- Horizontal overflow is hidden.
- Main content container: `width: min(1180px, calc(100% - 40px))`, centered.
- At `<=900px`, container becomes `min(100% - 32px, 720px)`.
- Header inner container: `min(1320px, calc(100% - 32px))`.
- Story content container: `min(1320px, calc(100% - 72px))`.
- Standard section vertical padding: `clamp(84px, 10vw, 140px)`.
- At `<=900px`, section padding is exactly `84px 0`.
- Sections use `content-visibility: auto` and `contain-intrinsic-size: 820px`.
- HTML scroll padding: header height plus `16px`.

### Header

- Fixed at viewport top, z-index `100`.
- Desktop height `74px`; tablet/mobile height `68px` at `<=900px`.
- Background: 96% opaque white.
- Desktop grid: `220px 1fr auto`, gap `24px`.
- Brand button width `190px`; image height `58px`, `object-fit: contain`.
- At `<=1120px`, first column becomes `190px` and phone is hidden.
- At `<=900px`, desktop navigation and Enquire CTA are hidden; menu button appears.
- At `<=620px`, brand/header column width is `164px`, outer width is `100% - 24px`.
- Header gains a subtle shadow after vertical scroll exceeds `24px`.
- Menu control is `44px` square with `10px` radius.
- Mobile menu starts directly below the header, slides from `translateY(-110%)`, and becomes interactive only when open.

### Common buttons and controls

- Standard button minimum height: `48px`.
- Padding: `12px 19px`; gap `9px`; radius `12px`.
- Header CTA minimum height: `42px`; padding `10px 14px`.
- Button icons: `18px` square.
- Hover moves buttons upward `1px`; floating WhatsApp moves `2px`.
- Inputs/selects: minimum height `50px`, border `1px`, radius `12px`, padding `12px 14px`.
- Textarea minimum height: `118px`, vertically resizable.
- Focus ring: border darkens and gets `0 0 0 3px rgba(23,49,79,.1)`.
- Global keyboard focus outline: `3px solid rgba(217,26,42,.42)`, offset `3px`.

## 11. Responsive breakpoints

The CSS has three width breakpoints and one user-preference query.

### `max-width: 1120px`

- Header desktop grid first column shrinks.
- Header phone disappears.
- Desktop navigation gap becomes `18px`.
- Story rail shifts to `28px` from the right.
- Story rail progress line disappears.

### `max-width: 900px`

- Header height changes to `68px`.
- Cinematic story is replaced by four static/mobile story panels.
- Desktop navigation and header CTA disappear; mobile menu appears.
- Split section headings, quote, tracking, and contact become one column.
- Sticky quote/tracking introductions become normal-flow content.
- Services and rates become two columns.
- Journey scroll animation is disabled and its track becomes horizontally scrollable with a `780px` minimum width.
- Journey traveller card is hidden.
- Journey stage detail changes to a two-column layout.
- Calculator controls become one column.
- Footer becomes two columns.

Important implementation detail: JavaScript considers desktop to be `(min-width: 900px)`, while CSS tablet rules apply at `max-width: 900px`. Exactly `900px` matches both queries. Avoid relying on exact 900px behavior; if modifying breakpoints, make the JS and CSS boundaries non-overlapping and consistent.

### `max-width: 620px`

- Services, rates, contact cards, footer, and form fields become one column.
- Story action buttons become full-width stacked buttons.
- Journey detail becomes one column.
- Tool card padding becomes `22px` and radius `18px`.
- Form footer, tracking summary, and footer bottom stack vertically.
- Tracking search input and button stack.
- Rate card minimum height is removed.
- Contact cards use `190px` minimum height.
- Floating WhatsApp becomes a `50px` circular icon-only control.

### Reduced motion

For `prefers-reduced-motion: reduce`:

- All CSS animation/transition durations become `0.01ms`.
- Animation iteration count becomes 1.
- Smooth scroll behavior becomes automatic.
- Cinematic story and scroll-driven journey are disabled by React logic.

## 12. Cinematic story system

### Desktop behavior

- Enabled only when viewport query `(min-width: 900px)` is true and reduced motion is false.
- Outer section height: `520svh`.
- Sticky viewport: `100svh`, minimum `620px`, pinned with native CSS `position: sticky; top: 0`.
- Four media layers fill the viewport absolutely.
- Posters and videos use `object-fit: cover` and focal point `50% 50%`.
- Story text width: `min(650px, 58vw)`.
- Story layer cross-fade width: progress `0.018` before/after each chapter range.
- ScrollTrigger range: outer section `top top` to `bottom bottom`.
- Scroll scrub smoothing: `0.55` seconds.
- Progress ranges:

| Chapter | Label | Global progress range | Desktop media |
|---|---|---|---|
| 1 | Promise | `0.00-0.22` | `chapter-1.mp4` |
| 2 | Capabilities | `0.26-0.47` | `chapter-2.mp4` |
| 3 | Transit | `0.51-0.72` | `chapter-3.mp4` |
| 4 | Delivered | `0.76-1.00` | `chapter-4.mp4` |

- Video time is derived from local chapter progress and clamped to `duration - 0.04s`.
- A seek only occurs when time differs by at least `0.025s`.
- Seeks are throttled through `requestAnimationFrame`.
- Chapter 1 and 2 media are prepared initially; later media is prepared one chapter ahead.
- Chapter 1 preloads `auto`; remaining videos preload `metadata`.
- Posters remain visible underneath and become the fallback if video loading fails.
- The sticky shell fades to zero opacity over global progress `0.91-1.00`.
- Chapter content translates downward by up to `22px` while fading.
- Pointer events activate only when chapter opacity is above `0.75`.

### Story visual overlays

- Primary left-to-right scrim: navy opacity `0.95` at 0%, `0.86` at 32%, `0.30` at 68%, and `0.12` at 100%.
- Secondary bottom scrim: navy opacity `0.42` fading to transparent by 40%.
- Chapter rail is bottom `44px`; progress track width `190px`, height `2px`.
- Rail is right-aligned to the larger of `36px` or the 1320px container gutter.

### Mobile/reduced-motion behavior

- Renders four independent panels rather than video scrubbing.
- Each panel minimum height is `88svh`, or `92svh` at `<=620px`.
- Content aligns to panel bottom.
- Padding: header height + `70px` on top, `20px` horizontally, `64px` bottom.
- Background is the chapter poster plus a navy gradient.

## 13. Services section

- Six services are read from `services` in `siteContent.js`.
- Desktop grid: three equal columns; tablet: two; mobile: one.
- Grid uses shared borders rather than card gaps.
- Desktop card minimum height `270px`, padding `32px`.
- Tablet minimum height `240px`.
- Mobile minimum height removed, padding `26px`.
- Service title starts `64px` below top metadata; `42px` on mobile.
- Icons are selected through a string-to-Lucide-component map. Valid keys: `file`, `medicine`, `parcel`, `plane`, `price`, `shield`.

## 14. Shipment journey

### Desktop scroll mode

- Enabled when viewport is at least `900px` and reduced motion is false.
- Section height: `340svh`.
- Sticky area: `100svh`, minimum `680px`.
- ScrollTrigger scrub: `0.6`.
- Six equal columns represent shipment checkpoints.
- Progress line starts/ends at 7% horizontal inset and is `2px` high.
- Checkpoint circle is `62px` square.
- The active checkpoint scales to `1.12`, turns red, and uses white icon color.
- A `260px` waybill traveller card interpolates between the center of first and last checkpoint.
- The background uses chapter 3's poster, scaled to `1.025`, under a strong white scrim.

### Stage selection math

`nextId = min(floor(scrollProgress * 6) + 1, 6)`.

Clicking checkpoint N scrolls to `(N - 1) / 5` of the section's usable scroll range.

### Stage card

- Grid: `100px minmax(0,1fr) minmax(190px,.45fr)`.
- Gap `28px`; padding `24px 26px`; radius `18px`.
- Uses translucent white `rgba(255,255,255,.76)` with `14px` backdrop blur.
- Stage number is `48px` Outfit.
- Entry animation is `260ms`, from opacity `0.6` and `translateY(8px)`.
- Non-scroll mode includes buttons for related stages.

Stage data and status are entirely defined in `shipmentSteps`. The six IDs, titles, codes, statuses, and percentages are:

| ID | Title | Code | Status | Displayed progress |
|---:|---|---|---|---:|
| 1 | Booked | `TUP-01` | complete | 17% |
| 2 | Packed | `SEC-02` | complete | 33% |
| 3 | Picked Up | `DSP-03` | complete | 50% |
| 4 | Air Transit | `AIR-04` | in-progress | 67% |
| 5 | Customs | `CLR-05` | pending | 83% |
| 6 | Delivered | `POD-06` | complete | 100% |

## 15. Quote form

The form is UI-only. `submitQuoteRequest` simulates a server response after `700ms`; it does not transmit or store data.

### Fields

| Field | Initial value | Required | Rule |
|---|---|---:|---|
| Sender name | empty | yes | trimmed value must not be empty |
| Mobile number | empty | yes | Indian 10-digit pattern `^[6-9]\d{9}$` |
| Origin city | `Tirupati` | yes | trimmed value must not be empty |
| Destination country | empty | yes | trimmed value must not be empty |
| Shipment type | empty | yes | must select an option |
| Approximate weight | empty | no | numeric UI, minimum/step `0.5` |
| Shipment notes | empty | no | free text |

Shipment type options: Documents, Medicines, Parcel, Export / Import, Other.

On successful demo submission, the reference is `FSQ-` plus the last four mobile digits. The form resets and displays a success view. `QuoteForm` accepts an injectable `submitAdapter` prop for future API integration and testing.

## 16. Tracking

Tracking is demonstration data only.

- Empty waybill produces `Enter a waybill number`.
- Any non-empty value is trimmed and converted to uppercase.
- Adapter delay: `650ms`.
- Returned status is always `Delivered`.
- Returned timeline is the five static events from `trackingEvents`.
- Tracking panel minimum height: `560px`.
- Search icon is positioned at top `16px`, left `15px`; input has `44px` left padding.
- Timeline marker is a green `30px` circle in a `32px + 1fr` grid.
- `TrackingPanel` accepts an injectable `lookupAdapter` prop. Replace `src/adapters/trackingAdapter.js` with a real carrier boundary rather than embedding fetch logic in the component.

## 17. Rate calculator

The calculator is indicative and entirely client-side.

### Defaults and limits

- Default destination: Europe.
- Default shipment type: Parcel.
- Default weight: `2kg`.
- Input range: `0.5-100kg`, step `0.5kg`.
- Calculation also clamps weight to `0.5-100kg`.
- Documents use at least `0.5kg` chargeable weight.
- Other shipment types use at least `1kg` chargeable weight.

### Formula

```text
sanitizedWeight = clamp(number(weight) or 0.5, 0.5, 100)
chargeableWeight = documents ? max(0.5, weight) : max(1, weight)
weightCharge = chargeableWeight * 620 * zoneMultiplier * typeMultiplier
subtotal = zoneBase + weightCharge
servicePrice = round((subtotal * serviceMultiplier) / 50) * 50
```

Prices use Indian Rupee formatting (`en-IN`, `INR`) with no fractional digits.

### Destination configuration

| Key | Label | Base INR | Multiplier |
|---|---|---:|---:|
| `gulf` | UAE / Gulf Countries | 1250 | 1.00 |
| `asia` | Asia Pacific | 1450 | 1.15 |
| `europe` | United Kingdom / Europe | 1750 | 1.35 |
| `northAmerica` | USA / Canada | 2100 | 1.55 |
| `restOfWorld` | Rest of World | 2450 | 1.75 |

### Shipment multipliers

Documents `0.82`, Medicines `1.12`, Parcel `1.00`, Commercial `1.20`.

### Service multipliers

Economy `0.82` (8-12 business days), Priority `1.00` (5-7 days), Express `1.38` (3-5 days). Priority is visually featured as `Most requested`.

For Europe + Parcel + 2kg, the expected estimates are INR 2,800, INR 3,400, and INR 4,750. Each result builds a prefilled WhatsApp confirmation URL. Rates explicitly exclude possible duties, taxes, insurance, restricted-item handling, and remote-area surcharges.

## 18. Contact and navigation data

Canonical contact data in `src/data/siteContent.js`:

| Item | Value |
|---|---|
| Primary phone | `8125477584` |
| Secondary phone | `9666145766` |
| Email | `flystarintl1@gmail.com` |
| Address | `#19-10-24/P, Opp: Passport Office, AIR Bypass Road, Tirupati.` |
| WhatsApp | `https://wa.me/918125477584` |

Update contact details only in `contactDetails`; components derive their phone, email, map, and WhatsApp links from it. Note that `createWhatsAppQuoteUrl` currently hardcodes the WhatsApp number separately, so update that function too if the primary number changes.

Navigation uses buttons plus `scrollIntoView`, not router links. Navigation updates the URL fragment with `history.replaceState`. Smooth behavior is disabled for reduced-motion users. Main links: Story, Services, Journey, Quote, Track, Contact. Footer additionally exposes Rate calculator.

## 19. Assets and media

### Brand and images

| File | Dimensions | Approximate size | Use |
|---|---:|---:|---|
| `public/Assets/flystar-wordmark.png` | 720 x 248 | 194 KB | Header and footer brand |
| Story posters, each | 1280 x 720 | 93-165 KB | Video fallback and mobile panels |
| `src/assets/hero.png` | 343 x 361 | 13 KB | Currently unused |

### Story video sizes

| Chapter | Desktop MP4 | Mobile M4V |
|---|---:|---:|
| 1 | 1.87 MB | 136 KB |
| 2 | 5.69 MB | 141 KB |
| 3 | 3.38 MB | 140 KB |
| 4 | 3.68 MB | 140 KB |

The runtime paths are absolute-from-site-root paths beginning with `/Assets/`. Vite copies `public/` contents directly to the output root.

### Media build script

`scripts/build-story-media.mjs` expects `ffmpeg` and the four inputs `Assets/first.mp4`, `second.mp4`, `third.mp4`, and `fourth.mp4`. For each chapter it attempts to generate:

- 1920px-wide H.264 MP4, CRF 24, GOP/keyframe interval 12, fast start.
- 1920px-wide VP9 WebM, CRF 34, GOP 12.
- 720px-wide H.264 mobile MP4, CRF 28, GOP 12, fast start.
- 1280px-wide WebP first-frame poster, quality 78.

Important mismatch: the currently referenced mobile files are `.m4v` and posters are `.jpg`, while the script outputs `-mobile.mp4` and `-poster.webp`. The component also provides only an MP4 source and does not reference generated WebM. Do not run `npm run media:build` and assume all generated names are automatically used; either update `siteContent.js`/`StoryMedia.jsx` or align the script output names first.

## 20. Accessibility

Implemented accessibility features:

- Semantic `main`, `section`, `header`, `nav`, `footer`, `article`, ordered lists, labels, and address.
- Keyboard-visible focus outline.
- Skip link to `#main-content`.
- Buttons use explicit `type="button"` where needed.
- Menu exposes `aria-expanded` and changes its accessible label.
- Decorative icons and media are hidden from assistive technology.
- Form errors use `aria-invalid` and `aria-describedby`.
- Quote success and journey stage changes use live/status regions.
- Tracking results use `aria-live="polite"`.
- Active shipment checkpoint uses `aria-current="step"`.
- Reduced-motion preference changes both animation and application behavior.
- Video is muted, inline, non-focusable, and has poster fallback.

Known accessibility limitations:

- The open mobile menu does not trap focus or close on Escape/outside click.
- No active navigation item is announced while scrolling.
- Story desktop chapters are visually hidden by opacity but do not toggle `aria-hidden` dynamically.
- Color contrast has not been documented with measured WCAG ratios.

## 21. State, side effects, and external behavior

- React runs under `StrictMode` in development.
- No global state library; state is local to components.
- No React Router; the app uses section IDs and fragment replacement.
- No HTTP request is currently made by quote or tracking.
- External destinations are phone, email, Google Maps, and WhatsApp.
- External links opened in a new tab use `rel="noreferrer"`.
- Navbar attaches one passive scroll listener and removes it on unmount.
- Media query hooks subscribe to query changes and clean up listeners.
- GSAP hooks kill tweens and ScrollTriggers on cleanup.
- Video animation-frame requests are cancelled on cleanup.

## 22. Testing and verification

Vitest is configured in `vite.config.js` with:

- Environment: `jsdom`.
- Setup file: `src/test/setup.js`.
- CSS processing enabled.

Current automated coverage consists of 6 test files and 11 tests covering:

- Quote required-field validation and valid input.
- Quote form error rendering, adapter submission, and reset/success behavior.
- Tracking empty validation and adapter result rendering.
- Story video failure preserving the poster.
- Navigation ID/link integrity.
- Pricing outputs and WhatsApp message generation.

Last verified result: all 11 tests passed, ESLint passed, and production build passed.

Missing tests include full `App` integration, navbar/mobile menu behavior, GSAP scroll behavior, responsive visual regression, reduced motion, deferred loading, contact links, and real API failure states.

## 23. Security, privacy, and production limitations

- The site currently collects quote form input in browser memory but does not send it anywhere.
- There is no privacy policy, terms page, cookie use, or analytics.
- There are no secrets or environment files in the repository.
- No HTML is injected with `dangerouslySetInnerHTML`.
- User input is only rendered through React text interpolation.
- npm audit reported one high-severity dependency vulnerability during the last install; review with `npm audit` before production deployment instead of applying a blind breaking upgrade.
- Tracking data and prices are demonstrations, not operational guarantees.
- No network error, timeout, retry, cancellation, or offline state exists because adapters are simulated.
- No Content Security Policy or security headers are configured in the repository.

## 24. Rules for modifying the project

Follow these rules to avoid inconsistent behavior:

1. Put business text and repeated business values in `src/data/siteContent.js`.
2. Put section IDs and navigation membership in `src/config/navigation.js`.
3. Keep API logic behind `src/adapters/`; components should consume adapters.
4. Keep price math in `src/utils/pricing.js`, not in JSX.
5. Update both CSS and JavaScript media queries when changing the `900px` cinematic breakpoint.
6. Preserve reduced-motion alternatives for every new animation.
7. Preserve posters when changing story videos; video failure must not create a blank section.
8. Add a new icon key to the relevant component icon map whenever adding data with a new `icon` string.
9. Keep public runtime paths rooted at `/Assets/...` unless the asset import strategy is deliberately changed.
10. Do not commit `node_modules/` or `dist/`; both are generated and ignored.
11. Run `npm test`, `npm run lint`, and `npm run build` after changes.
12. Treat `TECHNICAL_SPECIFICATION.md` as the current handoff; update it when architecture, visual tokens, pricing, assets, or integrations change.

## 25. Small-model change recipes

### Change a color globally

Edit the matching custom property under `:root` in `src/index.css`. Search for direct hex uses too, because some dark-section and status colors are not tokenized. Update `tailwind.config.js` only if Tailwind utilities use the same color.

### Change a heading size

Find the exact selector in `src/index.css`. General section headings, story headings, quote headings, and component headings use separate rules. Verify desktop, `<=900px`, and `<=620px` behavior.

### Change container width

Update `.container`. The header and story intentionally use separate 1320px containers, so modify `.header-inner` and `.story-content-shell` only if those should change too.

### Add a service

Add an object to `services`, use a supported icon key, and verify the grid with the new count at three, two, and one columns.

### Add or remove a story chapter

This is not data-only. Update `storyChapters`, media assets, progress ranges, chapter-specific rendering in `StoryChapter`, preload logic, the chapter rail, and any hardcoded chapter index checks. The current code assumes exactly four chapters and chapter index 2 owns the six-stage transit display.

### Connect the quote form to an API

Replace `submitQuoteRequest` in `src/adapters/quoteAdapter.js` with a real request that returns `{ ok, reference }`. Add error state/copy to `QuoteForm`, timeouts/cancellation, server-side validation, privacy disclosure, and tests. Do not put credentials in frontend code.

### Connect tracking to an API

Replace `lookupTracking` while preserving `{ trackingId, status, events }`. Each event must provide `title`, `time`, `location`, and `description`. Add rejected-request handling because the current component only handles successful resolution.

### Change rate logic

Edit zone/type/service data in `siteContent.js` and formula logic in `utils/pricing.js`. Update the known-value unit test so a deliberate pricing change is explicit.

## 26. Definition of done for future work

A change is complete only when:

- It works at desktop, tablet, and 320px mobile widths.
- Keyboard focus and labels remain usable.
- Reduced-motion mode remains functional.
- Story content still has poster fallback.
- No business values are unnecessarily duplicated.
- Tests, lint, and production build pass.
- No generated folders or secrets are staged.
- This specification is updated when the technical contract changes.

