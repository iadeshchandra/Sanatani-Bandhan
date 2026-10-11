# Sanatani Bandhan — UX Guidelines

One-page standard for contributors. The console must feel like **one product**, not 48 apps.

## Design primitives (`src/components/common/ui/`)

Import from the barrel: `import { Button, Card, Modal } from '../common/ui';`

| Primitive | When to use | One-line rule |
|---|---|---|
| `Button` | Every action | `variant`: primary = the one main action per view; secondary = supporting; ghost = tertiary/icon-adjacent; danger = destructive. `loading` for async — never silently disable. |
| `Card` / `CardHeader` | Content sections | One `Card` per logical section; `CardHeader` for title + subtitle + action slot. |
| `Modal` | Forms, confirmations, detail views | Focus-trapped, Esc closes, restores focus. `size`: sm (confirm), md (forms), lg/xl (complex). |
| `Input` / `Select` / `Textarea` | All form fields | Always pass `label`; `error` for validation (red, `role="alert"`); `hint` for format help. Never a bare `<input>`. |
| `Badge` | Status & labels | `tone`: saffron (brand), success, warning, danger, info, default. Uppercase micro-labels only. |
| `PageHeader` | Every desk top | `eyebrow` (domain), `title`, `subtitle`, `actions` slot for primary buttons. No bespoke desk headers. |
| `Stat` | KPI cards | `value` pre-formatted (use `formatINR`); units go in `sub`, never the value. |
| `confirmDialog` | Destructive/irreversible actions | `await confirmDialog({title, message, danger:true})` — **never `window.confirm`**. `<ConfirmProvider/>` is mounted in App.tsx. |

Desk skeletons/empty states live in `src/components/common/`: `DeskSkeletons.tsx`, `EmptyState.tsx`, `DataExportButton.tsx`.

## Modal rules

1. One modal open at a time (ConfirmProvider queues).
2. Esc always closes; backdrop click closes unless data loss is at stake (`closeOnBackdrop={false}` + explicit Cancel).
3. Footer buttons: Cancel (secondary, left) → Confirm (primary/danger, right). On mobile they stack full-width.
4. Focus the first field on open; return focus to the trigger on close (handled by `Modal`).

## Toast rules

- Types only: `success` / `error` / `info`. No other variants.
- One toast per user action. Success toasts state the outcome ("Rent of ₹12,000 collected"), error toasts state the fix ("Odometer must be ≥ last reading").
- **No emoji spam.** Maximum one emoji per toast, and none in error toasts.
- Toasts are feedback, not documentation — keep under ~90 characters.

## State rules

- **Loading:** skeletons matching the final layout (`DeskSkeletons`), never a bare spinner for content areas.
- **Empty:** `EmptyState` with icon, plain-language title, one sentence of guidance, and a CTA when the user can fix it ("Register New Gomata").
- **Error:** inline `role="alert"` message near the cause + toast. Never a blank screen. Retry affordance for network failures.
- **Zero results from filters:** empty state with "Clear filters" action — never an empty table.

## Touch & layout

- Interactive targets ≥ **44px** in both dimensions (Button md/lg enforce this; icon buttons use `min-h-[44px] min-w-[44px]`).
- Design mobile-first: 360px must not horizontally overflow. Test the header + sidebar at 360px.
- Modals: `max-h-[90vh]` with internal scroll; footers stack on mobile.

## Color tokens

- Brand: `saffron-500` `#FF8E00` (primary actions, active states, focus rings).
- Surfaces: `temple-900` `#3D3836` cards on `temple-950` `#262321` app bg; borders `temple-800` `#46413E`.
- Text: `temple-100` headings, `temple-300` body, `temple-400/500` muted.
- Never introduce new hues for status — use Badge tones. Never use pure `#fff` text on saffron (use `temple-950`).

## Navigation

- **Cmd/Ctrl+K** opens the command palette (fuzzy search over all desks + quick actions). Every desk must be reachable in ≤3 keystrokes of typing.
- Sidebar: star any desk to pin it to the top; last 5 visited desks appear under Recent. Pins/recents respect RBAC automatically.
- Deep-linkable desk ids live in `MODULE_CATALOG` (Sidebar.tsx) — reuse them, never invent new ones.
