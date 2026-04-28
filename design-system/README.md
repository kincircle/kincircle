# KinCircle Design System

Three CSS files. Read top to bottom: tokens (data) → primitives (widgets) → voice (brand marks).

```
design-system/
├── tokens.css        variables only
├── primitives.css    btn-pill, status-badge, card-surface, input, avatar
├── voice.css         eyebrow, italic em, underlined word
└── screens/          static HTML prototypes
```

The live React app at `src/app/` mirrors these tokens in `globals.css` and imports primitives+voice for use across pages.

---

## tokens.css — what each variable is for

### Color

| token | use |
|---|---|
| `--bg` | warm cream — page background |
| `--bg-warm` | linen-cream — alternating sections, sidebars |
| `--muted` | linen — soft surfaces, eyebrow pill, mock chips |
| `--ink` | warm near-black — body text, headings |
| `--ink-soft` | warm gray — secondary text, captions, deemphasized |
| `--primary` | terracotta — main CTAs, focus rings, italic-em emphasis |
| `--primary-deep` | dark terracotta — hover state for primary |
| `--primary-soft` | dusty rose — soft borders that hint at primary |
| `--accent` | honey — highlights, the underlined-word block, eyebrow dot, links on dark |
| `--accent-soft` | honey wash — soft highlight backgrounds |
| `--accent-deep` | burnt honey — em-dash before eyebrow, accent text on dark bg |
| `--sage` | quiet green — confirmed/yes states only |
| `--border` | taupe — default lines |
| `--border-strong` | darker taupe — hover state for borders |
| `--destructive` | warm red — errors, destructive actions |

### Type

- `--font-serif` — Fraunces. Headings only. Italic for emphasis.
- `--font-sans` — Nunito Sans. Body text, UI controls.

### Radii

- `--radius-sm` (6px) — chips, small inputs
- `--radius-md` (10px) — inputs, badges
- `--radius-lg` (16px) — cards
- `--radius-xl` (24px) — hero photo, marquee
- `--radius-pill` — buttons, status badges

### Shadows

- `--shadow-sm` — border-rest cards, button rest
- `--shadow-md` — raised cards, button hover
- `--shadow-lg` — hero photo, sticky surfaces

---

## primitives.css — widgets

| class | what |
|---|---|
| `.btn-pill.primary` | Main CTA. Pill, terracotta, cream text. |
| `.btn-pill.ghost` | Secondary CTA. Transparent, ink text, taupe border. |
| `.status-badge` + `.status-claimed` / `.status-pending` / `.status-voted` / `.status-sage` | Contextual chips for household and RSVP state. |
| `.card-surface` | Cream surface with border + radius. Add `.raised` for shadow. |
| `.input`, `.textarea`, `.label` | Form controls. |
| `.avatar` | 36px circle with initials. Honey background. |

---

## voice.css — brand marks

| selector | what |
|---|---|
| `h1 em, h2 em, h3 em` | Italic Fraunces in terracotta. Drop into a heading on one key word. |
| `.section-eyebrow` | Italic serif tag with em-dash prefix in burnt honey. Sits above section titles. |
| `.eyebrow` + `.eyebrow-dot` | Pill-shaped tag with honey dot. Sits above hero headings. |
| `.underlined` | Wraps a heading word with a skewed honey block. Max one per heading. |

---

## How to add a new screen

1. Compose with primitives — reach for `.btn-pill`, `.card-surface`, etc. before writing custom CSS.
2. Use voice marks (eyebrow + one italic em + maybe one underlined) so the page sounds like KinCircle.
3. Layout-specific CSS lives in the page file (e.g. `landing.css`), not the design system.
4. If you find yourself reusing a layout pattern across 3+ pages, lift it into a new `patterns.css`.

## Open the prototypes

```sh
open design-system/screens/*.html
```
