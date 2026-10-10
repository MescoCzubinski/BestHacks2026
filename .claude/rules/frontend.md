---
paths:
  - "frontend/**"
---

# Frontend rules (React + Vite + Tailwind + shadcn/ui, Feature-Sliced Design)

## Structure: Feature-Sliced Design (slim)

The project is small, so we use four layers. Layers, from top to bottom. A layer may import only from layers **below** it, never sideways or up.

```
frontend/src/
  app/        providers, router, global styles (index.css), entry wiring
  pages/      one slice per route (map, route); composes features and owns the page layout
  features/   one user action with value (pick-interest, build-route, show-place); UI + model + api
  shared/     no business knowledge: ui/ (shadcn), api/ (http client), lib/, config/
```

- **Not used by default:** `widgets/` (a big block used by one page lives in that page's `ui/`) and `entities/`. Add `entities/` (types, api, small display components of a business object like `place`) only when two features need the same object. Do not create either layer upfront.
- Each slice has segments: `ui/`, `model/` (state, hooks, types), `api/`, `lib/`, and an `index.ts` **public API**. Import a slice only through its `index.ts`, never its internals.
- Slices on the same layer do not import each other. If two features need the same thing, push it down to `shared/` (or `entities/` if it is a business object).
- Start simple: do not create a layer or segment until something needs it.
- Alias `@/` points to `src/`. Components use PascalCase file names; hooks, lib and api files use camelCase named exports.

## shadcn/ui, heavily customized

- Base every control on shadcn/ui (`npx shadcn@latest add <component>`), generated into `shared/ui/`.
- Do **not** ship the default look. Customize the components in `shared/ui/` themselves: tokens, radius, shadows, typography, variants, motion. The app should look like our product, not a template.
- Customize through the design tokens in `app/index.css` (CSS variables, Tailwind 4 `@theme`) first, then through new `cva` variants, and edit component internals last.
- Compose domain components (`TaskCard`) from `shared/ui` pieces in the slice that needs them. Do not fork a second copy of a primitive.
- Merge classes with `cn()`. Icons from `lucide-react`; every icon-only button has an `aria-label`.

## Popups: use them with restraint

- Prefer inline UI (expanding sections, inline editing, pages, sheets for secondary detail) over modal stacks.
- A dialog is for: destructive confirmation, a short focused form, or a detail view the user will dismiss quickly. Never a dialog opening another dialog.
- Toasts only for async outcomes the user cannot otherwise see (saved, failed). No toast for every click, no auto-popping promos or onboarding.
- Every popup is keyboard accessible, traps focus, closes on Escape, and returns focus to its trigger (shadcn `Dialog`/`AlertDialog` already do this; keep it that way).

## Data and API

- All HTTP goes through one typed client in `shared/api`. Entity-specific calls live in `entities/<name>/api` or `features/<name>/api`. The base URL comes from `VITE_API_URL` read once in `shared/config`.
- Entity types mirror the backend response shapes.
- Handle loading (skeletons), empty and error states for every fetched view. Update local state from the server response after a mutation.
- Forms: labelled inputs, the same limits as the backend DTO, submit disabled while pending, errors shown next to the field.

## Style

- Mobile-first, Tailwind utilities, theme tokens (`bg-background`, `text-muted-foreground`, …) instead of hard-coded colors.
- Semantic HTML, visible focus, sufficient contrast. Accessibility is part of "done".
- Router state (filters, selected tab) lives in the URL when it should survive reload or be shared.

## Checks

From `frontend/`: `npm run lint && npm run build`. From the root: `npx prettier --check .` (run from `frontend/node_modules/.bin` if not installed at root).
