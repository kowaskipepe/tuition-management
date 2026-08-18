---
name: ui-design
description: TuitionHub UI design system — tokens, layout shell, and component patterns for consistent front-end development.
---

# TuitionHub UI Design System

Use this skill when building or modifying UI in the TuitionHub tuition management app.

## Stack

- Next.js 16 App Router with Server Components by default
- Tailwind CSS v4 (CSS-first config in `src/app/globals.css`, no `tailwind.config.js`)
- shadcn/ui 2.3+ with OKLCH color tokens
- `tw-animate-css` for animations (not `tailwindcss-animate`)
- Dark mode via `next-themes` with `class` strategy

## Layout Shell

All dashboard pages live under `src/app/(dashboard)/` and inherit:

```
AppShell
├── Sidebar (collapsible, w-64 / w-16)
├── Topbar (theme toggle)
└── main (p-6, overflow-y-auto)
```

Every page starts with `<PageHeader title description actions? />`.

## Color Tokens

Defined in `globals.css` using OKLCH. Key semantic tokens:

- `--primary` / `--primary-foreground` — main actions
- `--destructive` — errors, overdue, absent
- `--muted` / `--muted-foreground` — secondary text, backgrounds
- `--sidebar-*` — sidebar-specific tokens
- `--chart-1` through `--chart-5` — Recharts data series

Class group colours are stored per-group in the DB (`ClassGroup.colour`) and applied as inline `backgroundColor` or border accents.

## Component Patterns

### Server vs Client

- **Pages** (`page.tsx`) — Server Components, fetch with Prisma directly
- **Interactive forms/dialogs** — `"use client"` with `useActionState` + Server Actions
- **Tables with filters** — Client component reading/writing URL searchParams

### Forms

```tsx
const [state, formAction, pending] = useActionState(createStudent, initialActionState())

useEffect(() => {
  if (state.success) toast.success(state.message)
  if (!state.success && state.message) toast.error(state.message)
}, [state])
```

Validation errors render with `role="alert"` below the field.

### Status Badges

Use `<StatusBadge status={invoice.status} />` — maps enum values to shadcn Badge variants.

### Empty States

Use `<EmptyState icon title description action? />` when lists are empty.

### Currency

Always use `formatLkr(cents)` for display. Never show raw cent integers to users.

### Dates

Use `formatDate(date)`, `formatTime("16:00")`, `periodMonthLabel("2026-08")` from `@/lib/dates`.

## Typography

- Page titles: `text-2xl font-bold tracking-tight`
- Card titles: `text-base` or default CardTitle
- Descriptions: `text-sm text-muted-foreground`
- KPI numbers: `text-3xl font-bold`

## Spacing

- Page sections: `space-y-6`
- Card grids: `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`
- Form fields: `space-y-2` per field, `space-y-4` in card content

## Accessibility

- All interactive elements need `aria-label` when icon-only
- Form errors use `role="alert"` + `aria-describedby`
- Sidebar links use `aria-current="page"` when active
- Dialogs trap focus via shadcn Dialog component

## Code Style

- No semicolons
- Arrow function consts: `const handleClick = () => {}`
- Event handlers prefixed with `handle`
- Tailwind only — no CSS files or `<style>` tags
- Early returns for loading/empty states

## Charts

Use Recharts wrapped in `<ResponsiveContainer>`. Import chart components from `@/components/charts/dashboard-charts`. Format tooltips with LKR locale.

## Do Not

- Add auth/login in v1 (single local user)
- Use `tailwind.config.js` (v4 is CSS-first)
- Store money as floats (always integer cents)
- Instantiate PrismaClient outside `src/lib/db.ts`
