# Design System Strategy: Clinical Ether

## 1. Overview & Creative North Star
The visual strategy for this design system is defined by **"Clinical Ether"**—a Creative North Star that balances the sterile, life-critical precision of healthcare with a modern, high-trust digital fluidity. 

We are moving away from the "Dashboard Template" aesthetic. Instead, we embrace a **High-End Editorial** approach. This system uses generous white space (inspired by the Notion reference), intentional asymmetry in layout, and sophisticated layering to create a sense of calm and security. By utilizing glassmorphism and tonal depth rather than rigid lines, we communicate that the software is advanced yet unobtrusive—a silent, secure partner in patient care.

---

## 2. Colors: Tonal Architecture
Color in this system is not just decorative; it is structural. We use a palette of deep teals and clinical grays to establish an authoritative hierarchy.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined by:
- **Background Shifts:** Using `surface-container-low` (#f2f4f5) against `background` (#f8fafb).
- **Negative Space:** Increasing padding to let the eye define the edge.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of semi-transparent layers.
- **Base Layer:** `surface` (#f8fafb)
- **Primary Containers:** `surface-container-low` (#f2f4f5)
- **Interactive Elevated Cards:** `surface-container-lowest` (#ffffff)
- **Nesting Logic:** To highlight a specific data point within a card, use a `surface-variant` (#e1e3e4) background for that specific module rather than a border.

### The "Glass & Gradient" Rule
To achieve the "Modern Glassmorphism" requested:
- **Floating Navigation/Modals:** Use `surface` colors at 70% opacity with a `backdrop-blur` of 20px to 40px.
- **Signature Textures:** For high-impact CTAs or Hero backgrounds, use a subtle linear gradient: `primary` (#005f6c) to `primary-container` (#007a8a). This adds a "soul" to the digital surface that flat fills lack.

---

## 3. Typography: Editorial Authority
The type system pairs the geometric precision of **Manrope** for high-level communication with the clinical clarity of **Inter** for data-heavy utility.

- **Display (Manrope):** Use `display-lg` and `display-md` for patient impact statements. The wide apertures of Manrope feel modern and approachable.
- **Headline (Manrope):** Set in `primary` (#005f6c) to anchor the page.
- **Body (Inter):** Use `body-lg` for general reading. Inter is chosen for its exceptional legibility in complex medical data environments.
- **Labels (Inter):** `label-md` and `label-sm` should be used for metadata. In the context of security (e.g., "Encrypted Record"), use these labels in uppercase with a 0.05em letter spacing to evoke a professional, secure feel.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are often too "dirty" for a healthcare context. We use **Ambient Shadows** and **Tonal Stacking**.

- **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a "Natural Lift" without a single pixel of black shadow.
- **Ambient Shadows:** For floating elements (like a medical record dropdown), use: 
  - `box-shadow: 0 20px 40px rgba(0, 95, 108, 0.06);` 
  - *Note: The shadow uses a tint of the `primary` color, not gray, to keep the UI feeling "clean" and "lit from within."*
- **The "Ghost Border" Fallback:** If a container sits on a background of the same color, use a 1px border with `outline-variant` (#bdc8cb) at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Precision Primitives

### Buttons
- **Primary:** `primary` (#005f6c) background with `on-primary` (#ffffff) text. Use `xl` (1.5rem) roundedness for a friendly yet high-end feel.
- **Tertiary:** No background. Use `primary` text with a subtle `primary-container` 8% opacity hover state.

### Input Fields
- Avoid high-contrast boxes. Use `surface-container-highest` (#e1e3e4) with no border.
- **States:** On focus, transition to a `ghost border` using `surface-tint` (#006876) at 20% opacity and a subtle 4px outer glow.

### Cards & Lists
- **Forbid Dividers:** Do not use line-rules between list items. Use 16px - 24px of vertical white space.
- **Medical Icons:** Icons (Security, Health Records) should be encased in a `secondary-container` (#cee7ee) circular glyph with `on-secondary-container` (#51686e) iconography.

### Chips (Security/Status Tags)
- **Status Chips:** Use `tertiary-container` (#2767e3) with `on-tertiary-container` (#f0f2ff) for "Verified" or "Secure" states. Avoid standard "Success Green" unless it's a critical confirmation; keep it within the Teal/Blue clinical palette for brand cohesion.

---

## 6. Do's and Don'ts

### Do
- **DO** use asymmetry. Place a headline on the left and a glassmorphic data card slightly offset to the right to break the "web-template" feel.
- **DO** maximize "Breathing Room." Reference the Notion layout: let sections sit 120px apart on desktop to reduce cognitive load for healthcare professionals.
- **DO** use `xl` (1.5rem) and `full` (9999px) corner radii for a soft, modern touch that offsets the "coldness" of medical software.

### Don't
- **DON'T** use #000000 for text. Always use `on-surface` (#191c1d) to maintain a soft, premium contrast.
- **DON'T** use harsh shadows. If a shadow looks like a shadow, it's too dark. It should look like "depth."
- **DON'T** use 100% opaque borders. They create visual noise that distracts from the critical healthcare data.