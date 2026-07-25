# Lumina Feedback

An editorial-minimal dashboard for browsing customer feedback.

> **Live demo:** <https://lumina-feedback.vercel.app>

## Setup

```bash
# with npm (recommended — lockfile included)
npm install
npm run dev

# or with pnpm
pnpm install
pnpm dev
```

Then visit the printed local URL (usually <http://localhost:8080>).

### Build & deploy

```bash
npm run build
```

The static build output drops cleanly into Vercel or Netlify (zero config — both auto-detect TanStack Start).

## Tech

- **Vite + TanStack Start** — modern SSR-ready React with file-based routing
- **TypeScript** end-to-end
- **Tailwind CSS** (v4, the new CSS-first config)
- **shadcn/ui** for `Dialog`, `DropdownMenu`, and primitives only — cards, segmented controls, and chips are custom
- **lucide-react** icons

## Features

**Core (per the spec)**

- Responsive grid of customer feedback (1/2/3 columns)
- Real-time, case-insensitive search across `customer_name` and `feedback_text`
- Sentiment filter as a segmented pill control with live counts

**Polish**

- Light + dark theme, persisted to `localStorage` and applied pre-paint via inline script (no FOUC)
- Keyboard shortcuts: `/` or `⌘K` focuses search; `1`–`4` set filter; `T` toggles theme; `Esc` closes modal or clears search
- URL hash sync — `#q=crash&s=Negative` is shareable and refresh-safe
- Detail modal with one-click copy-quote, top-right and `Esc` close affordances
- Search match highlighting with the brand accent
- Sentiment distribution bar (Apple Health-style)
- Stat tiles: Total, Positive, Negative, Latest
- Sort by Newest / Oldest / Name
- Results meta row with single "Clear all" affordance
- Contextual empty state when filters return nothing
- Subtle SVG noise overlay for tactile depth

## Design choices

The look is editorial: **Instrument Serif** for the wordmark, hero, stat values, and the modal pull-quote anchors the eye to the human content; **Geist** runs the UI; **Geist Mono** carries metadata, IDs, and counts as quiet typographic furniture. The canvas is a warm off-white (`#FAF8F3`) in light mode and a warm near-black (`#14130F`) in dark mode — never pure white, never slate — paired with a single burnt-orange accent (`#B8541F` / `#D97A45`). Sentiment color appears only as 6px dots and softly-tinted chip backgrounds, never as loud full-color badges. A faint SVG noise overlay (~3.5%, `mix-blend-mode: multiply` in light / `screen` in dark) takes the digital sheen off the flats. All colors are derived once as CSS variables and mixed perceptually through `color-mix(in oklab, …)`.

Motion is restrained: cards fade-rise with a 45ms-per-card stagger capped at 280ms, all transitions on `cubic-bezier(.2, .8, .2, 1)`, no springs.

## State management

State is intentionally local and minimal — no Context, no global store. Four `useState` hooks at the root drive everything: `q` (search), `sent` (sentiment filter), `sort` (order), and `open` (which card's modal is showing).

The visible list is a `useMemo` over the source array that applies the sentiment filter, then the case-insensitive substring search, then the sort. Storing the filtered list separately would create two ways to be wrong — deriving it guarantees the filters and the visible results can never drift out of sync.

A small `useTheme` hook and a `useEffect`-driven URL-hash sync round things out:

- **URL hash sync** reads on first mount (so a shared `#q=crash&s=Negative` URL restores the exact view) and writes via `history.replaceState` (so no extra history entries pile up while typing).
- **Theme** lives in `localStorage` and is also applied to `<html>` via an inline `<script>` injected before paint in `__root.tsx`, which prevents the dark-mode flash that React-after-hydration would otherwise cause.
- A `renderKey` increments on filter changes to retrigger the staggered card animation.

For a 6-item dataset, no debouncing is needed — every keystroke re-filters in microseconds. For a 10k+ dataset I'd debounce by ~150ms and pre-build a lowercased searchable index.

## Project structure

```
src/
├── routes/
│   ├── __root.tsx        # root shell + theme pre-paint script
│   └── index.tsx         # the entire dashboard page
├── lib/
│   ├── feedback-data.ts  # the hardcoded dataset (per spec)
│   └── feedback-utils.tsx # initials, avatarColor, highlight, formatters
├── components/ui/        # shadcn primitives (Dialog, DropdownMenu, etc.)
└── styles.css            # design tokens + base styles
```

## Shortcuts reference

| Key            | Action                          |
|----------------|---------------------------------|
| `/` or `⌘K`    | Focus the search input          |
| `1` … `4`      | All / Positive / Neutral / Negative |
| `T`            | Toggle light/dark theme         |
| `Esc`          | Close the modal, or clear search |

## License

Typography: Instrument Serif, Geist, and Geist Mono are all open-source via Google Fonts. Icons by [Lucide](https://lucide.dev).
