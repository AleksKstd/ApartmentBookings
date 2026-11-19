---
name: Morski Briz Apartment
description: Direct booking for one apartment beside Bogoridi Boulevard, set as cobalt enamel street plates on a lime-washed wall.
colors:
  enamel-cobalt: "#1f3c88"
  enamel-cobalt-deep: "#182f6b"
  night-cobalt: "#111f47"
  signal-cobalt: "#3456a8"
  icon-cobalt: "#26479a"
  enamel-tint: "#dbe3f5"
  enamel-haze: "#b7c6ea"
  enamel-wash: "#eef2fb"
  footer-glint: "#9db0e0"
  plate-rule-white: "#ffffff"
  lime-wash: "#f4f4f1"
  plaster-shade: "#ebebe6"
  plaster-joint: "#dfe0d9"
  plaster-line: "#c8cac1"
  control-edge: "#8a8e82"
  ink: "#17213a"
  ink-muted: "#4f5a70"
  ink-soft: "#8a93a3"
  danger: "#dc2626"
  danger-deep: "#b91c1c"
  danger-wash: "#fef2f2"
  success-deep: "#15803d"
  success-wash: "#f0fdf4"
  warning-deep: "#b45309"
  warning-wash: "#fffbeb"
typography:
  display:
    fontFamily: "Sofia Sans Condensed, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 7.2vw, 6.25rem)"
    fontWeight: 800
    lineHeight: 0.95
  headline:
    fontFamily: "Sofia Sans Condensed, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
  title:
    fontFamily: "Sofia Sans Condensed, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  plate-lettering:
    fontFamily: "Sofia Sans Condensed, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.1
  plate-label:
    fontFamily: "Sofia Sans Condensed, Arial Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.14em"
  body-lede:
    fontFamily: "Sofia Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Sofia Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Sofia Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  md: "6px"
  lg: "8px"
  plate: "10px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  plate-face: "6px"
  gutter-mobile: "16px"
  gutter-tablet: "24px"
  gutter-desktop: "32px"
  container-max: "1200px"
  section-mobile: "56px"
  section-desktop: "80px"
components:
  button-primary:
    backgroundColor: "{colors.enamel-cobalt}"
    textColor: "{colors.plate-rule-white}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.enamel-cobalt-deep}"
  button-outline:
    backgroundColor: "{colors.plate-rule-white}"
    textColor: "{colors.enamel-cobalt}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-outline-hover:
    backgroundColor: "{colors.enamel-wash}"
  button-ghost:
    textColor: "{colors.enamel-cobalt}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  button-ghost-hover:
    backgroundColor: "{colors.enamel-wash}"
  button-on-plate:
    backgroundColor: "{colors.plate-rule-white}"
    textColor: "{colors.enamel-cobalt}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  plate:
    backgroundColor: "{colors.enamel-cobalt}"
    textColor: "{colors.plate-rule-white}"
    rounded: "{rounded.plate}"
    padding: "{spacing.plate-face}"
  card:
    backgroundColor: "{colors.plate-rule-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "28px"
  input:
    backgroundColor: "{colors.plate-rule-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
  amenity-medallion:
    backgroundColor: "{colors.enamel-wash}"
    textColor: "{colors.enamel-cobalt}"
    rounded: "{rounded.full}"
    size: "40px"
---

# Design System: Morski Briz Apartment

## Overview

**Creative North Star: "The Street Corner on Bogoridi"**

The site is a street corner in central Burgas. The ground is lime-washed plaster, pale and slightly grey-green, never cream. Everything that names, labels or acts is a cobalt enamel plate fixed to that wall: a cobalt face, a thin white rule painted just inside its edge, small rounded corners, and a low cast shadow where it stands off the plaster. The street plaque in the opening, the search bar, the walking-time signpost, the check-in/check-out board, the host's name, the address and the closing call to action are all the same object.

Density is calm and municipal: big condensed cobalt headings, generous plaster between sections, reading text in a quiet blue-black. Cobalt is the only hue the system owns; status colours exist only to carry meaning. Signs carry Cyrillic first, with a small tracked Latin line beneath, as Burgas street signs do. The admin area inherits these tokens but is an operating surface; plates there are optional, tokens are not.

The world replaced an earlier cream, serif and terracotta identity. Nothing from that world (warm cream ground, serif display, terracotta accent, teal-tinted shadows) carries forward.

**Key Characteristics:**
- Plaster-white ground, cobalt enamel plates, one hue family.
- The plate (cobalt face, inset white rule, 10px corners) is the signature and carries actions, signs and labels.
- Heavy Sofia Sans Condensed for headings and plate lettering; Sofia Sans for reading.
- Cyrillic first on signs, with a tracked uppercase Latin line under it.
- Depth comes from plates standing off the wall, never from floating cards.

## Colors

One enamel blue in several fired depths, set against neutral lime-wash plaster.

### Primary
- **Enamel Cobalt** (enamel-cobalt): the plate colour. Faces of every plate, primary buttons, h1/h2 headings, selected calendar days, active carousel marker, the top rule of lists. Also the browser theme colour.
- **Deep Enamel** (enamel-cobalt-deep): hover state of plates and primary buttons; h3 headings.
- **Night Cobalt** (night-cobalt): the deepest surface, the footer and the gallery lightbox backdrop; selection text.
- **Signal Cobalt** (signal-cobalt): the focus ring, the "today" ring on the calendar, small accent icons and the middle-dot separators in the fact line. Input focus border.
- **Icon Cobalt** (icon-cobalt): small reassurance icons in the booking trust panel.

### Secondary
- **Enamel Tint** (enamel-tint): secondary lettering on plates: Latin lines, plate labels, units, captions on cobalt; body text in the footer.
- **Enamel Haze** (enamel-haze): placeholder lettering on plates ("Add date"), text selection, input focus halo, small print in the footer.
- **Enamel Wash** (enamel-wash): hover wash for outline and ghost buttons, amenity medallions, step numerals.
- **Footer Glint** (footer-glint): contact icons on the night-cobalt footer only.

### Neutral
- **Lime-wash** (lime-wash): the page ground and the sticky header (at 95%).
- **Plaster Shade** (plaster-shade): inset panels inside cards (price lines, notices), disabled inputs, map placeholder.
- **Plaster Joint** (plaster-joint): hairline borders of secondary panels; booked days on the calendar; image placeholders.
- **Plaster Line** (plaster-line): row dividers in lists; unavailable legend dot.
- **Control Edge** (control-edge): form-control borders (3.35:1 on white) and the signpost's post.
- **Ink** (ink): reading text and labels.
- **Ink Muted** (ink-muted): ledes, secondary copy, nav links at rest, input placeholders.
- **Ink Soft** (ink-soft): decorative marks and disabled days only.
- **Plate Rule White** (plate-rule-white): the inset rule on plates, lettering on cobalt, card and input faces.

Status roles (danger, success, warning, and their washes) come from the standard red, green and amber scales and are used only for errors, confirmed and pending states.

### Named Rules
**The One Enamel Rule.** Cobalt is the only owned hue. Actions and signs share it, so a button and a street sign read as the same material. Do not introduce a second brand accent; the token named `clay` is an alias onto the cobalt scale, not a warm colour.

**The Soft Ink Rule.** Ink Soft is below 4.5:1 on the ground. It never carries text someone must read.

## Typography

**Display Font:** Sofia Sans Condensed (with Arial Narrow), self-hosted at 700 and 800
**Body Font:** Sofia Sans (with the system sans stack), self-hosted at 400 and 600

**Character:** A Bulgarian-designed family with native Bulgarian Cyrillic forms. The condensed cut, set heavy and tight, is the lettering painted on the plates; the regular cut is quiet and readable.

### Hierarchy
- **Display** (800, clamp(2.75rem, 7.2vw, 6.25rem), 0.95): the page's h1 in cobalt, held to about 11 characters per line. Inner pages use clamp(2.5rem, 6vw, 5rem) or 2.25 to 3rem.
- **Headline** (800, 2.25rem rising to 3rem; up to 3.75rem for the signpost section, 1 to 1.1): section h2s in cobalt, balanced.
- **Title** (700, 1.5 to 1.875rem): h3s in deep enamel; button lettering is the same condensed face at 700, 1rem.
- **Plate Lettering** (800, 1.375 to 2.5rem, about 1): street names, dates set into the search plate, walking-time numerals (tabular), check-in times.
- **Plate Label** (700, 0.75 to 0.875rem, 0.14em, uppercase): field labels and the Latin line on plates, always in enamel tint on cobalt (0.16em for Latin place names).
- **Body Lede** (400, 1.125 to 1.25rem, 1.625): ledes and descriptions in ink muted, held to 38ch to 65ch.
- **Body** (400, 1rem, 1.5): running text; 0.875rem for secondary lines.
- **Label** (600, 0.875 to 0.9375rem): nav links, ghost buttons, form labels, calendar days, mobile menu rows.

Only the four loaded weights are used: 400 and 600 for Sofia Sans, 700 and 800 for the condensed cut. There is no 500.

### Named Rules
**The Cyrillic First Rule.** On any sign, the Bulgarian name is the large lettering and the Latin form sits beneath it, smaller, uppercase and tracked. On Bulgarian pages the Latin line is omitted.

**The Condensed Is Lettering Rule.** The condensed face is for headings and for words painted on plates. Paragraphs, form copy and long labels stay in Sofia Sans.

## Layout

A centred container, max 1200px, with 16px gutters on phones, 24px from 640px and 32px from 1024px. Sections are separated by plaster: 56px vertical padding on phones, 80px from 640px. Breakpoints are Tailwind's defaults (640, 768, 1024).

The opening sets a large left-hand headline against a right-hand street plaque, with the full-width search plate below as the primary action, then the price line and the photo band. The photo band moves only when the visitor asks (plate arrows, markers or a swipe); its controls sit below the photo, never over it, so no scrim is needed. Two-column splits (text and plate, heading and signpost) collapse to a single column under 1024px. The search plate is four fields across from 640px and a 2x2 grid with a full-width submit on phones. On booking, a sticky summary bar appears at the bottom on phones.

Text wraps with `balance` for headings and `pretty` for paragraphs and list items.

## Elevation & Depth

Depth is physical and shallow: a plate stands a few millimetres off the wall, so it casts a short, tight cobalt-tinted shadow. Cards sit lower still. Nothing floats, glows or blurs except the light backdrop blur on the sticky header and the mobile booking bar.

### Shadow Vocabulary
- **Plate stand-off** (`0 1px 1px rgba(17,31,71,.12), 0 6px 14px -8px rgba(17,31,71,.45)`): every plate, and the host portrait.
- **Card rest** (`0 1px 2px rgba(17,31,71,.06), 0 8px 24px -12px rgba(17,31,71,.2)`): white working cards on booking and confirmation, and the map, with a 5% night-cobalt ring.
- **Bar lift** (`0 -8px 24px -12px rgba(17,31,71,.25)`): the sticky booking summary bar on phones, cast upward onto the page.
- **Painted rule** (`inset 0 0 0 4px #1f3c88, inset 0 0 0 6px #fff` on plates; `inset 0 0 0 3px` and `5px` on buttons): not depth but paint; the white rule is drawn on the plate itself, never by nesting a box.

### Named Rules
**The Wall Rule.** Shadows are always tinted night cobalt (17,31,71) and always short. A shadow that implies the object is floating, or that carries any other tint, is off-world.

## Shapes

Small, firm corners. Controls (buttons, inputs) use 8px; plates use 10px; white cards, photos and the carousel use 12px; bordered secondary panels, gallery tiles and the map use 16px. Circles are reserved for small medallions: amenity icons, calendar days, step numerals, avatars, status icons and legend dots.

The signpost plates are the one cut shape: a plate clipped to an arrow point, alternating left and right off a single grey post, with the point stopping 7px short of the edge so the painted rule never shows at the tip. The street plaque in the opening is the one tilted object (-1.5deg).

## Components

### Buttons
Every action is a small enamel plate.
- **Shape:** gently rounded (8px), condensed 700 lettering at 1rem, 10px by 20px.
- **Primary:** enamel cobalt face, white lettering, with a painted white rule inset 3 to 5px. Hover deepens to deep enamel, rule kept.
- **Outline:** white face, cobalt lettering, 2px cobalt inset edge; hover washes to enamel wash.
- **Ghost:** no face; Sofia Sans 600 at 0.875rem in cobalt; hover washes to enamel wash. Used for the language switch, menu toggle, calendar month arrows.
- **On a plate:** inside a cobalt plate the action inverts to a white plate with cobalt condensed lettering (6px corners inside the search plate, 8px elsewhere); hover to enamel wash.
- **Focus:** a 2px signal-cobalt ring with a 2px lime-wash offset, everywhere.
- **Danger:** red face, white text; destructive admin actions only.

### Plates (signature)
- **Face:** enamel cobalt, white lettering, 10px corners, painted white rule 4 to 6px inside, plate stand-off shadow.
- **Content:** a 6px face inset keeps lettering clear of the rule; real padding is added inside that.
- **Uses:** the site name in the header, the street plaque, the search plate, walking-time direction plates, the check-in/check-out board, the host's name, the address plaque, the closing call-to-action panel, carousel arrow buttons (44px square, set below the photo).
- **Interactive plates** deepen to deep enamel on hover. Fields set into the search plate are divided by 2px white rules at 35%, and focus shows a white outline inset 6px.

### Cards / Containers
- **Working card:** white, 12px corners, card rest shadow plus a faint cobalt ring, 20 to 28px padding (40px on large confirmation cards). Used where the visitor operates: calendar, stay summary, guest details, confirmation.
- **Inset panel:** plaster shade, 12px corners, 12 to 16px padding, inside cards.
- **Secondary panel:** no fill, 1px plaster-joint border, 16px corners. Trust and contact panels.

### Inputs / Fields
- **Style:** white face, 1px control-edge border, 8px corners, 10px by 14px, 1rem text (0.875rem from 640px), ink-muted placeholder.
- **Focus:** border shifts to signal cobalt with a 2px enamel-haze halo.
- **Error / Disabled:** `aria-invalid` turns the border red; disabled fills plaster shade.

### Navigation
- **Header:** sticky, lime-wash at 95% with a backdrop blur and a 10% night-cobalt hairline. The site name sits on its own small plate at left; links in Sofia Sans 600 ink-muted, hover cobalt; the current page is cobalt with a 2px underline offset 6px. A primary "Book" plate sits at right from 640px.
- **Mobile:** below 768px the links fold into a menu panel that fades in, with full-width rows and a full-width primary plate at the end.
- **Footer:** night cobalt, white condensed site name, enamel-tint body, footer-glint icons, white on hover.

### Icons
Lucide line icons in currentColor, 2px stroke: 20px (h-5 w-5) by default, 16px inline with small text, 32px as the lone mark in a placeholder. Calls to action that lead onward end with a 20px ArrowRight icon after the label, never a typed arrow character. Amenities set their icon in a 40px enamel-wash medallion.

### Map
The map loads only on request. Until then it is a plaster-shade panel (16px corners) holding a cobalt map-pin icon, an outline button and a one-line note. The address is not repeated there; it lives on the address plaque beside it.

### Calendar
Days are 40 to 44px circles. Free days in night cobalt with an enamel-haze hover; booked days on plaster joint with a strikethrough; selected ends filled enamel cobalt; today ringed in signal cobalt.

## Do's and Don'ts

### Do:
- **Do** put every sign, label of place, and primary action on a plate: cobalt face (#1f3c88), painted white rule, 10px corners, short cobalt-tinted shadow.
- **Do** set signs Cyrillic first, with the Latin name beneath in uppercase, tracked 0.14 to 0.16em, in enamel tint.
- **Do** keep the ground lime-wash (#f4f4f1) and let sections breathe (56px, 80px from 640px).
- **Do** use Sofia Sans Condensed 800 for headings and plate lettering, and Sofia Sans for reading text.
- **Do** use tabular numerals for prices, times and walking distances.
- **Do** keep focus visible with the 2px signal-cobalt ring and lime-wash offset.
- **Do** end onward calls to action with a 20px lucide ArrowRight icon.

### Don't:
- **Don't** introduce a warm accent, a cream ground or a serif display; they belong to the replaced world.
- **Don't** nest a box to draw a plate's white rule; it is painted with an inset shadow.
- **Don't** tint shadows anything but night cobalt, or make them long enough to float an object off the wall.
- **Don't** use ink soft (#8a93a3) for text a visitor must read.
- **Don't** tilt plates other than the single street plaque in the opening.
- **Don't** set paragraphs or form copy in the condensed face.
