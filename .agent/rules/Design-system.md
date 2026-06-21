## Token Files Are the Source of Truth

The project has one design token file. The agent must never modify it:

- `tokens/tokens.css` — all color values, all font sizes, weights, line heights, and font families

The token file export CSS custom properties (CSS variables) that are available globally.

## Mandatory: Use CSS Variables, Never Raw Values

The agent must never write hardcoded color values or typography values anywhere in this codebase. 
There is an exception to the landing page /external pages design where creativity is needed . Raw colours and typography can be used on the landing page/external pages  to prevent limitation.

Dark mode is not a launch feature. We will add it later. Do not build two themes now.


**Wrong:**
```css
color: #1a1a1a;
font-size: 16px;
font-family: 'Inter', sans-serif;
background: #f5f5f5;
```

**Correct:**
```css
color: var(--color-on-surface);
font-size: var(--typography-body-large-font-size);
font-family: var(--typography-body-large-font-family);
background: var(--color-surface);
```

Before writing any style value, check the token files. If a variable exists for what you need, use it. If it does not exist, ask before inventing a new value.

## Spacing Scale

Use multiples of 4px for all spacing (margin, padding, gap). Do not use arbitrary values.

Allowed: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`

## Border Radius

All elements should use a border radius of 0px 

## Styling Method

- All component styles use CSS Modules (`.module.css` files).
- No inline `style={{}}` props except for truly dynamic values that cannot be expressed in CSS (e.g., a progress bar width driven by a number).
- No Tailwind. No styled-components. CSS Modules only.

## Mobile-First

Nexalaw users are primarily on mobile. Every component must be built mobile-first:

- Default styles target mobile (small screens).
- Use `@media (min-width: 768px)` to layer in desktop styles.
- Touch targets must be a minimum of 44px tall.


## Iconography

Use Lucide React for all icons (lucide-react)
Icon size: 16px in text, 20px in buttons, 24px standalone
Icons are always accompanied by a label or aria-label

## Accessibility

Nexalaw must meet WCAG 2.1 Level AA. These are non-negotiable:
All interactive elements must be keyboard navigable
All images must have descriptive alt text — decorative images use alt=""
Colour contrast ratios must meet AA standard: 4.5:1 for normal text, 3:1 for large text
All form inputs must have associated <label> elements — never rely on placeholder text as a label
All icon-only buttons must have aria-label

## What Not to Do

- Do not add skeumorphic effects, glassmorphism, or neumorphism. They go out of style fast and cost performance.
- Do not use more than two font weights in a single screen (regular and bold is usually enough, plus semibold for headings).
- Do not center-align body text. Left-align everything except buttons and single-line headings.
- Do not stack multiple modals. If a flow needs two decisions, it needs two pages.