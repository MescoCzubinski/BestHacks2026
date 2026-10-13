---
paths:
  - "frontend/**"
---

# Frontend rules (React + Vite + Tailwind + shadcn/ui, screen-based)

## Structure: three screens, no layers

The app is three screens: **start** (welcome, recent routes), **plan** (pick interest tags, location and time) and **route** (map, stops, editing). The structure follows the screens, not an architecture pattern (no Feature-Sliced Design).

```
frontend/src/
  main.tsx, App.tsx, index.css   entry, router (/, /plan, /route), providers, design tokens
  screens/
    start/                       StartScreen.tsx + whatever only this screen uses
    plan/                        PlanScreen.tsx, TagPicker.tsx, LocationField.tsx, useTags.ts, ...
    route/                       RouteScreen.tsx, RouteMap.tsx, StopList.tsx, useEditableRoute.ts, moveItem.ts, ...
  components/                    domain components used by 2+ screens
  hooks/                         hooks used by 2+ screens
  lib/                           pure helpers used by 2+ screens (format, totals, ...)
  api/                           one typed HTTP client + one function per endpoint
  ui/                            shadcn/ui primitives, heavily customized
```

- **A screen owns everything only it uses**: its components, hooks, helpers, types. Code moves to `components/`, `hooks/` or `lib/` only when a **second screen** needs it. Do not create those folders' contents speculatively.
- **Screens never import each other.** Imports go screen → shared folders (`components/`, `hooks/`, `lib/`, `api/`, `ui/`), never the other way and never sideways. No `index.ts` barrels; import files directly.
- **State between screens lives in the URL**, not in a store: `/route?tags=secesja&lat=..&lng=..&min=120`. The route screen reads it and builds the route itself, so reload works and a link can be shared. Recent routes (shown on the start screen) are kept in `localStorage`, behind one small module in `lib/`.
- A screen that grows past a few files may use its own subfolders (`ui/`, `model/`), but keep it flat until it hurts.
- Alias `@/` points to `src/`. Components use PascalCase file names; hooks, lib and api files use camelCase named exports.
- **Tests are colocated** (`moveItem.test.ts` next to `moveItem.ts`), only for pure logic (route editing, totals, form parsing) and the API client. No tests for components that only render.

## shadcn/ui, heavily customized

- Base every control on shadcn/ui (`bunx shadcn@latest add <component>`), generated into `ui/`.
- Do **not** ship the default look. Customize the components in `ui/` themselves: tokens, radius, shadows, typography, variants, motion. The app should look like our product, not a template.
- Customize through the design tokens in `index.css` (CSS variables, Tailwind 4 `@theme`) first, then through new `cva` variants, and edit component internals last.
- Compose domain components (`StopCard`) from `ui/` pieces in the screen that needs them. Do not fork a second copy of a primitive.
- Merge classes with `cn()`. Icons from `lucide-react`; every icon-only button has an `aria-label`.

## Popups: use them with restraint

- Prefer inline UI (expanding sections, inline editing, pages, sheets for secondary detail) over modal stacks.
- A dialog is for: destructive confirmation, a short focused form, or a detail view the user will dismiss quickly. Never a dialog opening another dialog.
- Toasts only for async outcomes the user cannot otherwise see (saved, failed). No toast for every click, no auto-popping promos or onboarding.
- Every popup is keyboard accessible, traps focus, closes on Escape, and returns focus to its trigger (shadcn `Dialog`/`AlertDialog` already do this; keep it that way).

## Data and API

- All HTTP goes through one typed client in `api/`, one function per endpoint. The base URL is the relative `/api`: frontend and backend are separate services behind one host, and the ingress (in prod) or the Vite dev proxy (in dev) routes `/` to the frontend and `/api` to the backend with an allowlist of public routes. So there is no CORS and no `VITE_API_URL`. The frontend image only serves static files (`serve`), with no proxy config.
- API types mirror the backend response shapes.
- Handle loading (skeletons), empty and error states for every fetched view. Update local state from the server response after a mutation.
- Forms: labelled inputs, the same limits as the backend DTO, submit disabled while pending, errors shown next to the field.

## Style

- Mobile-first, Tailwind utilities, theme tokens (`bg-background`, `text-muted-foreground`, …) instead of hard-coded colors.
- Semantic HTML, visible focus, sufficient contrast. Accessibility is part of "done".
- Router state (filters, selected tab) lives in the URL when it should survive reload or be shared.

## Checks

From `frontend/`: `bun run lint && bun --bun run build && bun --bun run test`. From the root: `bun --bun frontend/node_modules/.bin/prettier --check .`. The package manager is Bun (`oven/bun` images, `bun.lock`); oxlint also enforces that screens never import each other (`.oxlintrc.json`).
