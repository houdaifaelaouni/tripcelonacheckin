---
version: alpha
name: Tripadvisor
slug: tripadvisor
source: "https://www.tripadvisor.com/"
extractedAt: "2026-05-18"
description: "Travel marketplace system with deep Trip Green ink, neon Trip Brand search actions, pill-shaped controls, dense photo-led recommendation cards, rating bubbles, and flat editorial discovery rails."

colors:
  primary: "#002B11"
  accent: "#00EB5B"
  accentHover: "#00D352"
  accentPressed: "#1F9448"
  ink: "#002B11"
  body: "#38443A"
  muted: "#768A79"
  canvas: "#FFFFFF"
  surface: "#FFFFFF"
  surfaceAlt: "#F7F7F7"
  border: "#DFE1DF"
  borderStrong: "#768A79"
  link: "#002B11"
  success: "#00AB42"
  warning: "#FFC56F"
  error: "#FFD9DF"
  businessInk: "#000000"
  businessBody: "#333333"
  businessMint: "#00AA6C"
  businessDeepMint: "#005234"
  businessMintSoft: "#C9F2E3"
  businessLavenderSoft: "#F4EFFA"
  businessStone: "#F2F1ED"
  tripBrand: "#00EB5B"
  tripMoss: "#00AB42"
  tripRewards: "#B2FF1A"
  tripYellow: "#FFEF0E"
  tripAi: "#34C457"
  travelerChoiceGold: "#FFC56F"
  ratingFill: "#00AA6C"
  mapBadgeGreen: "#003911"
  favorite: "#FB5184"
  michelin: "#BD2333"
  scrim: "#00000080"
  on-primary: "#F7F7F7"
  on-accent: "#002B11"
  on-dark: "#FFFFFF"
  on-business-primary: "#FFFFFF"

typography:
  display: {fontFamily: "\"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 62px, fontWeight: 900, lineHeight: 1.10, letterSpacing: "0em"}
  hero: {fontFamily: "\"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 54px, fontWeight: 900, lineHeight: 1.20, letterSpacing: "0.02em"}
  headline-lg: {fontFamily: "\"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 44px, fontWeight: 900, lineHeight: 1.09, letterSpacing: "0em"}
  headline-md: {fontFamily: "\"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 32px, fontWeight: 700, lineHeight: 1.19, letterSpacing: "0em"}
  title-lg: {fontFamily: "\"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 28px, fontWeight: 800, lineHeight: 1.21, letterSpacing: "0em"}
  title-md: {fontFamily: "\"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 20px, fontWeight: 800, lineHeight: 1.20, letterSpacing: "0em"}
  title-sm: {fontFamily: "\"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 18px, fontWeight: 700, lineHeight: 1.22, letterSpacing: "0em"}
  body: {fontFamily: "\"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 16px, fontWeight: 400, lineHeight: 1.50, letterSpacing: "0em"}
  label: {fontFamily: "\"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 14px, fontWeight: 700, lineHeight: 1.29, letterSpacing: "0em"}
  button: {fontFamily: "\"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 16px, fontWeight: 700, lineHeight: 1.00, letterSpacing: "0em"}
  caption: {fontFamily: "\"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 14px, fontWeight: 400, lineHeight: 1.29, letterSpacing: "0em"}
  legal: {fontFamily: "\"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 12px, fontWeight: 400, lineHeight: 1.50, letterSpacing: "0em"}
  editorial: {fontFamily: "Georgia, \"Times New Roman\", \"Century Schoolbook L\", serif", fontSize: 20px, fontWeight: 400, lineHeight: 1.20, letterSpacing: "0em"}
  mono: {fontFamily: "\"Trip Sans Mono\", Courier, monospace, Arial, sans-serif", fontSize: 14px, fontWeight: 400, lineHeight: 1.40, letterSpacing: "0em"}
  business-display: {fontFamily: "TripSansUltra, \"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 54px, fontWeight: 700, lineHeight: 1.19, letterSpacing: "0em"}
  business-title: {fontFamily: "TripSansBold, \"Trip Sans VF\", \"Trip Sans\", Arial, sans-serif", fontSize: 40px, fontWeight: 400, lineHeight: 1.00, letterSpacing: "0em"}

rounded: {sm: 4px, md: 8px, lg: 12px, xl: 28px, pill: 9999px}

spacing: {xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, xxl: 56px, section: 80px}

components:
  button-primary: {backgroundColor: "{colors.primary}", textColor: "{colors.on-primary}", typography: "{typography.button}", rounded: "{rounded.pill}", padding: 14px 24px}
  button-primary-active: {backgroundColor: "{colors.accentPressed}", textColor: "{colors.on-primary}", rounded: "{rounded.pill}"}
  button-accent: {backgroundColor: "{colors.accent}", textColor: "{colors.on-accent}", border: "1.5px solid {colors.tripMoss}", typography: "{typography.button}", rounded: "{rounded.pill}", padding: 12px 23px}
  button-accent-hover: {backgroundColor: "{colors.accentHover}", textColor: "{colors.on-accent}", rounded: "{rounded.pill}"}
  button-secondary: {backgroundColor: "{colors.surface}", textColor: "{colors.ink}", typography: "{typography.button}", rounded: "{rounded.pill}", padding: 10px 16px}
  button-outline: {backgroundColor: transparent, textColor: "{colors.ink}", border: "1.5px solid {colors.ink}", rounded: "{rounded.pill}", padding: 12px 16px}
  button-business-primary: {backgroundColor: "{colors.businessInk}", textColor: "{colors.on-business-primary}", border: "1.5px solid {colors.businessInk}", rounded: "{rounded.pill}", padding: 18px 24px}
  button-icon: {backgroundColor: "{colors.surface}", textColor: "{colors.ink}", border: "1px solid {colors.border}", rounded: "{rounded.pill}", size: 40px}
  search-hero: {backgroundColor: "{colors.surface}", textColor: "{colors.body}", rounded: "{rounded.pill}", height: 56px, padding: 4px 8px 4px 20px}
  search-tab: {backgroundColor: transparent, textColor: "{colors.ink}", typography: "{typography.label}", rounded: 0px, padding: 4px 4px 0px}
  product-card: {backgroundColor: "{colors.surface}", textColor: "{colors.ink}", border: "1px solid {colors.border}", rounded: "{rounded.md}", width: 272px}
  editorial-image-card: {backgroundColor: transparent, textColor: "{colors.on-dark}", rounded: 0px, imageRatio: "1 / 1"}
  winner-hero: {backgroundColor: "{colors.primary}", textColor: "{colors.on-dark}", typography: "{typography.hero}", rounded: 0px}
  rating-bubbles: {fillColor: "{colors.ratingFill}", emptyColor: "{colors.border}", size: 12px, gap: 2px}
  award-badge: {backgroundColor: "{colors.travelerChoiceGold}", textColor: "{colors.ink}", rounded: "{rounded.xl}", padding: 18px 24px}
  nav-consumer: {backgroundColor: "{colors.surface}", textColor: "{colors.ink}", height: 60px, itemRounded: "{rounded.pill}"}
  nav-business: {backgroundColor: "{colors.surface}", textColor: "{colors.businessInk}", height: 72px, itemRounded: "{rounded.pill}"}
  footer-consumer: {backgroundColor: "{colors.surfaceAlt}", textColor: "{colors.ink}", border: "1px solid {colors.border}"}
  input-pill: {backgroundColor: transparent, textColor: "{colors.body}", typography: "{typography.body}", rounded: "{rounded.pill}"}
  select-footer: {backgroundColor: "{colors.surface}", textColor: "{colors.ink}", border: "2px solid {colors.borderStrong}", rounded: "{rounded.lg}", padding: 7px 14px}
---

**Overview**
Tripadvisor's visual identity is a travel utility wrapped in a highly recognizable green marketplace shell. The consumer site is bright, practical, and photographic: white surfaces, deep green text, neon green search actions, huge pill controls, square image cards, and review metadata that makes every listing feel ranked, compared, and bookable. It avoids ornamental depth; recognition comes from the green system, dense horizontal rails, circular rating marks, award badges, and a search-first travel planning rhythm.

The brand has several visible modes. The consumer product mode uses {colors.primary} as the default ink and {colors.accent} as the highest-value commerce/search action. The Things to Do and Travelers' Choice surfaces add immersive image-backed heroes, white type, and gold award moments. Tripadvisor for Business is more B2B and editorial: black-and-white navigation, TripSansUltra statistics, owner-focused CTAs, and soft mint/lavender/stone panels. All modes remain flat, type-forward, and rounded at the control level.

Key Characteristics:
- Deep green text as brand ink, not just an accent.
- Bright action green reserved for search, commerce, and Trip Brand moments.
- Pill-shaped navigation, CTAs, search fields, and utility selectors.
- Photo-first square cards arranged in dense horizontal rails.
- Compact product metadata with rating bubbles, counts, badges, and prices.
- Flat surfaces with borders and scrims instead of heavy elevation.
- Heavy Trip Sans headings with little to no tracking.

Observed page modes:
- Homepage: centered search, category tabs, discovery rails, awards campaign content, and footer controls.
- Things to Do: image-backed hero, ranking cards, destination modules, compact search, and product comparison metadata.
- Travelers' Choice: award category tiles, campaign badges, green/white/gold contrast, and square visual browsing.
- Business Advantage: black-and-white B2B marketing, large stats, owner-facing CTAs, and soft pastel panels.
- Business FAQ: compact bold accordion questions and business-page navigation.

**Colors**
Primary & Action:

{colors.primary} is the main consumer ink and primary button fill. It appears in body text, header controls, sign-in CTAs, map pins, hero type, and product-card copy, giving even plain white pages a Tripadvisor-specific voice.

{colors.accent} is the high-energy Trip Brand green. It appears on the homepage search button and logo system; use it sparingly for the most important action on a screen.

{colors.accentHover} and {colors.accentPressed} are action state colors. Hover keeps the neon character, while pressed moves toward mossy green so the control feels engaged without losing brand family.

{colors.tripMoss} is the border and secondary green for commerce actions. It frames the bright search button and supports rating/category accents without overpowering the page.

{colors.link} intentionally stays in the brand-ink family. Tripadvisor links should feel like text-first navigation, not generic web-blue links.

Surfaces:

{colors.canvas} and {colors.surface} are clean white. Most consumer pages rely on white as the dominant plane so travel photography and green UI marks carry the brand.

{colors.surfaceAlt} is the soft off-white used for footer bands, quiet panels, and disabled/low-priority containers. It separates regions without making the interface feel card-heavy.

{colors.businessStone}, {colors.businessMintSoft}, and {colors.businessLavenderSoft} appear in owner-facing marketing modules. Use them as broad business panels, not as tiny utility chips.

Neutrals & Text:

{colors.ink} is the consumer text anchor. It replaces black in most traveler-facing contexts and should be used for headings, card titles, icons, tabs, and active controls.

{colors.body} is the softer green-gray body copy color. It appears in inputs and supporting metadata where pure brand ink would feel too loud.

{colors.muted} and {colors.borderStrong} support secondary metadata, footer selectors, and form outlines. Their green undertone keeps quiet UI from drifting into generic gray.

{colors.border} is the main divider and card border. It is light, cool, and flat; it should define edges without implying elevation.

Semantic:

{colors.success} overlaps with brand moss and can be used for confirmations, positive review states, and filled rating marks when {colors.ratingFill} is not available.

{colors.warning} is a warm gold seen on Travelers' Choice CTA treatments. In this system it is celebratory rather than cautionary.

{colors.error} is a pale red error container; pair it with a deeper red text when real validation language is needed.

Brand-specific signatures:

{colors.tripRewards} is a lime reward-system color. Use it for rewards badges or promotional surfaces, not standard success states.

{colors.tripYellow} is part of the logo/brand family and can support small award or logo moments.

{colors.tripAi} is the AI sub-brand green, distinct from the neon commerce green.

{colors.travelerChoiceGold} appears in awards and "Best of the Best" treatments. It pairs well with deep green copy and simple rounded CTAs.

{colors.favorite} marks saved/favorite map pins and should remain a rare emotional accent.

{colors.businessInk}, {colors.businessBody}, {colors.businessMint}, and {colors.businessDeepMint} belong to Tripadvisor for Business. Use them when reproducing business/pricing/owner-facing pages, not the traveler marketplace.

Contrast notes:

{colors.primary} on {colors.surface} is the safest default text pairing and exceeds normal body contrast expectations.

{colors.on-accent} on {colors.accent} is a distinctive brand pairing: dark green text on bright green fill, rather than white text on green.

{colors.on-primary} on {colors.primary} works for compact CTAs, but avoid long paragraphs white-on-green unless the module is clearly editorial or campaign-led.

**Typography**
Tripadvisor's consumer pages use "Trip Sans VF", "Trip Sans", Arial, sans-serif. The site declares Trip Sans Regular, Medium, and Mono webfonts, with variable font usage on the consumer surface. Business pages expose named faces such as TripSansRegular, TripSansMedium, TripSansBold, and TripSansUltra. Some editorial variables reference Georgia for longer content, but the current consumer product voice is overwhelmingly Trip Sans.

| Level | Size | Weight | Line height | Letter spacing | Role |
|---|---:|---:|---:|---:|---|
| display | 62px | 900 | 1.10 | 0em | Largest adaptive product/marketing display |
| hero | 54px | 900 | 1.20 | 0.02em | Awards and immersive editorial hero headlines |
| headline-lg | 44px | 900 | 1.09 | 0em | Large consumer display on wide screens |
| headline-md | 32px | 700 | 1.19 | 0em | Homepage "Where to?" and split-promo headings |
| title-lg | 28px | 800 | 1.21 | 0em | Section titles and destination group names |
| title-md | 20px | 800 | 1.20 | 0em | Rail headings |
| title-sm | 18px | 700 | 1.22 | 0em | Product-card titles |
| body | 16px | 400 | 1.50 | 0em | Main body copy, inputs, nav text |
| label | 14px | 700 | 1.29 | 0em | Badges, tabs, compact labels |
| button | 16px | 700 | 1.00 | 0em | CTA text, especially business CTAs |
| caption | 14px | 400 | 1.29 | 0em | Review counts, secondary metadata |
| legal | 12px | 400 | 1.50 | 0em | Footnotes and policy text |
| editorial | 20px | 400 | 1.20 | 0em | Long-form editorial copy when serif mode appears |
| mono | 14px | 400 | 1.40 | 0em | Technical identifiers if needed |
| business-display | 54px | 700 | 1.19 | 0em | Business hero and large stats |
| business-title | 40px | 400 | 1.00 | 0em | Business section headers |

Principles:
- Use weight, not tracking, to create hierarchy; Tripadvisor headings are heavy and tightly practical.
- Keep body text at 16px with a relaxed 24px line-height when copy runs longer than a card title.
- Consumer display typography can be extremely bold, but it should stay plain and unornamented.
- Business pages rely on face changes, especially TripSansUltra and TripSansBold, more than color.
- Preserve the green text color in consumer type; replacing it with black weakens the brand signal.

Type usage by surface:
- Search and navigation use medium-weight 14-16px text with pill ergonomics.
- Product cards use compact 18px bold titles, then quickly drop into captions and metadata.
- Awards and Things to Do heroes allow the largest display type, often over imagery or deep surfaces.
- Business pages use heavier named font faces and more abrupt size jumps, especially 54px hero/stat text.

**Layout**
The base spacing rhythm is 4, 8, 16, 24, 32, 56, and 80px. Consumer pages commonly use 24px page margins, 16px grid spacing, 8px small gutters, and broad content rails around 1120-1184px on desktop. Product cards often sit at about 272px wide on desktop, with square images and horizontal scrolling or carousel behavior. Current CSS variables include `--breakpointSmall: 768px`, `--breakpointMedium: 1024px`, and `--breakpointLarge: 1184px`.

Break large pages into full-width bands with constrained inner content. Hero search should center in the page and feel oversized, while discovery sections should become dense rails of cards. Business pages use larger vertical sections, 40px internal card padding, and generous split layouts for text-plus-media panels.

Whitespace philosophy: Tripadvisor is not sparse luxury travel. It is organized, scannable, and marketplace-dense. Use enough white space to make search and sections clear, then let cards, photos, ratings, and prices fill the page with useful comparison data.

Grid behavior:
- Use 12-column desktop logic with 24px outer margins and 16px rail gaps.
- Keep card widths stable before filling extra space; more viewport width should reveal more cards.
- Let wide editorial modules span the content width, but keep text blocks narrower for readability.
- On business pages, use two-column split modules until tablet size, then stack text before media.

**Elevation & Depth**
Tripadvisor is mostly flat. Consumer product cards use {colors.border} and {rounded.md}; they generally avoid large shadows. Navigation and search rely on white surfaces, pills, borders, and iconography rather than floating material layers.

When depth is required, use a subtle dark scrim over imagery or a light overlay for modal focus. Do not introduce glass panels, glossy shadows, or gradient glow. Hierarchy should come from image scale, bold type, border contrast, deep-green surfaces, and the bright action green.

Depth rules:
- Use borders first, scrims second, shadows last.
- Put text directly over images only when contrast is controlled by the image crop or scrim.
- Keep overlay icons simple, usually white or deep green in a circular/pill control.
- Treat carousel arrows as utility controls, not decorative floating objects.

**Components**
Buttons:

{components.button-primary} is the deep-green traveler action button. It works for sign-in, donation, and high-confidence actions where the page already has a white surface.

{components.button-primary-active} documents the pressed green family. Use it for active or engaged controls, not as a separate visual brand.

{components.button-accent} is the signature search/commerce button. It should be the only bright green CTA in a local cluster and should keep its moss border.

{components.button-accent-hover} represents the same action in hover state. The brighter hover should feel responsive without becoming a new semantic color.

{components.button-secondary} is used for top-nav utilities and low-pressure controls. Its white fill and pill shape let it sit inside a white header without becoming invisible.

{components.button-outline} is the inverse quiet CTA, seen most clearly in business navigation and footer selectors. It uses a black or green outline, depending on mode, with no fill.

{components.button-business-primary} belongs to owner-facing pages. It is black, bold, pill-shaped, and more SaaS-like than the consumer green CTA.

{components.button-icon} is a circular or pill icon surface for save, carousel, search, and menu actions. Keep the control simple and avoid text when an established icon will do.

Cards & Containers:

{components.product-card} is the core marketplace unit: bordered, flat, about 272px wide, with a travel photo, compact title, rating, count, badge, and price. Its job is comparison, not storytelling.

{components.editorial-image-card} is a square photo tile with overlaid or adjacent category text. It should be image-forward and minimally framed.

{components.winner-hero} is the awards/editorial hero pattern. It uses deep green or dark image-backed surfaces, white type, and large award identity.

{components.award-badge} is the celebratory Travelers' Choice CTA or label. The gold should feel like a campaign object, not a standard warning color.

Inputs & Forms:

{components.search-hero} is the most recognizable form pattern: a wide white pill with search icon, 16px input text, and an attached accent action button. It should feel tappable and central.

{components.search-tab} is a compact text button with underline/active emphasis. It sits above search and switches between Search All, Things to Do, Hotels, Restaurants, and Cruises.

{components.input-pill} is visually minimal. The input itself is transparent because the parent pill carries the shape and background.

{components.select-footer} is a compact rectangular-pill selector with a 2px muted green outline. It appears in footer locale/currency controls and should not be confused with the primary CTA pill.

Navigation:

{components.nav-consumer} is a 60px white header with the wordmark, rounded utility items, and a dark-green sign-in pill. It is calm but highly branded through color.

{components.nav-business} is taller and black-and-white. It uses pill nav items and separate log-in/claim-listing CTAs, matching the business landing-page tone.

{components.footer-consumer} is a dense off-white information zone. It uses compact text, bordered selectors, and many links rather than a decorative footer composition.

Pricing:

Tripadvisor does not expose a simple public consumer pricing page. The observed pricing-adjacent experience is Business Advantage and its FAQ, where pricing is handled as a subscription/business inquiry. Use {components.button-business-primary}, large TripSansUltra headings, owner-focused cards, and FAQ accordions for this mode.

Signature Components:

{components.rating-bubbles} are essential. Use filled green circular marks with tiny gaps before review counts; do not replace them with generic stars unless the specific surface calls for a partner rating format.

Photo rails are a signature pattern. Each section has a bold title, short supporting copy when needed, and a horizontally dense run of square or near-square cards.

Map surfaces use compact pins, white outlines, deep-green active states, and pink favorites. The map badge green is darker than the standard primary so labels remain legible at small sizes.

Destination modules behave like grouped recommendations. The section title names a place, then cards repeat the product-card rhythm underneath, keeping location browsing and bookable experiences visually connected.

Review density is part of the brand. A realistic Tripadvisor card should include rating value, bubble marks, review count, price or category, and occasional urgency or award badges.

Awards content should feel campaign-led but still practical. Use gold CTAs, badge imagery, and bold display type, then return quickly to browsable category tiles.

**Do's and Don'ts**
Do:
- Use {colors.ink} for consumer headings and card text instead of generic black.
- Reserve {colors.accent} for the primary search or booking action in each region.
- Build search as {components.search-hero}: wide, pill-shaped, icon-led, and centered.
- Use {components.rating-bubbles} with review counts on product cards.
- Keep card edges flat with {colors.border} and {rounded.md}.
- Use square travel photography in rails before introducing abstract illustration.
- Switch to {colors.businessInk} and {typography.business-display} on Tripadvisor for Business pages.
- Use {colors.travelerChoiceGold} only for awards, winner CTAs, and celebratory campaign modules.

Don't:
- Do not turn Tripadvisor into a blue-link travel site; links should stay close to {colors.link}.
- Do not use heavy shadows on {components.product-card}; borders are the main separator.
- Do not use {colors.accent} for every positive state; keep it for high-value action.
- Do not round photo cards into soft blobs; consumer imagery is mostly square or minimally framed.
- Do not replace rating bubbles with stars in the core Tripadvisor product-card pattern.
- Do not mix the black B2B palette into consumer discovery pages except for true business surfaces.
- Do not create decorative gradients or glass effects; they were not observed in the source.
- Do not loosen heading tracking; the brand's typography is heavy, plain, and unspaced.

**Responsive Behavior**
| Breakpoint | Width | Behavior |
|---|---:|---|
| mobile-sm | 360px | Single-column cards, full-width search, collapsed header actions |
| mobile | 480px | Search remains pill-like while category tabs become horizontally scrollable |
| tablet | 768px | Two-column or horizontal rail layouts begin; nonessential nav collapses |
| desktop | 1024px | Full header, centered hero search, constrained content grid |
| wide | 1184px | Rails reveal more stable-width cards with 24px page margins |

Touch targets should be at least 40px high, with primary search actions around 48-56px. Header pills are usually 40px tall; business CTAs can reach 57px.

Collapsing strategy:
- Collapse secondary nav items before shrinking the logo or search.
- Keep search categories scrollable rather than wrapping into multiple uneven rows.
- Convert product rails to horizontal scroll on mobile, preserving card proportions.
- Stack business hero text and media vertically below tablet widths.
- Preserve pill radii at all sizes; do not square off controls on mobile.

Images should crop center with object-fit cover. Square category and product images can crop aggressively, but hero campaign images need enough safe area for award marks and text overlays.

**Iteration Guide**
1. Check the page ink: consumer screens should read primarily as {colors.ink}, not black or gray.
2. Verify there is only one dominant {colors.accent} CTA in each local decision area.
3. Inspect all search controls against {components.search-hero}; the field must feel like a large pill, not a rectangle.
4. Audit product cards for {components.rating-bubbles}, review counts, prices, and compact metadata.
5. Confirm cards use {colors.border} and {rounded.md} without decorative elevation.
6. Test typography: section headings should match {typography.title-md} or heavier, with zero tracking.
7. For business pages, switch to {typography.business-display}, {colors.businessInk}, and black pill CTAs.
8. On mobile, ensure rails scroll or stack without shrinking cards into unreadable thumbnails.

**Known Gaps**
Observed directly: homepage, Things to Do/product discovery, Travelers' Choice awards/content, Business Advantage, and Business Advantage FAQ on May 18, 2026. The extraction includes computed fonts, major colors, button metrics, card borders, radii, page-level typography, responsive variables, and product patterns from those pages.

Derived: hover and pressed values come from exposed CSS custom properties and nearby token naming, not from manually forcing every state. Spacing is consolidated from observed grid variables and rendered measurements rather than every individual component margin.

Uncertain: Tripadvisor likely has additional vertical-specific patterns for hotel booking, restaurants, maps, account flows, and checkout that were not fully sampled. Public pricing is not a standard consumer page; the pricing guidance here is based on the business subscription/FAQ flow rather than a transparent pricing table.

Conservative assumptions: semantic error/success usage, focus rings, and disabled states are represented from available CSS variables but should be rechecked on form-heavy pages before implementing a production clone.