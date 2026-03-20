Load and apply the UI design system for this project.

Read `.claude/context/ui_design_system.md` silently, then follow these rules for any UI work:

## Core Principles
- **No Tailwind config** — Tailwind 4.2 via `@tailwindcss/vite`, JIT only, no custom config file
- **CSS variables for tokens** — all colors, shadows, spacing defined in `apps/app/src/index.css`
- **Professional SaaS aesthetic** — clean, data-dense, minimal ornamentation
- **Compact mode** — always support `compact` prop on dashboard components

## Colors to Use

| Purpose | Value |
|---------|-------|
| Primary action | `#2563EB` (hover `#1D4ED8`) |
| Success / positive | `#059669` |
| Warning | `#D97706` |
| Danger / negative | `#DC2626` |
| Text primary | `#111827` |
| Text muted | `#9CA3AF` |
| Card border | `#E2E8F0` |
| App background | `#F8FAFC` |
| Sidebar | `#0F172A` |

## Component Rules

**Cards:**
```
rounded-xl border border-[#E2E8F0] bg-white shadow-sm
hover:shadow-md transition-all duration-200
p-5 (normal) / p-4 (compact)
```

**Tables:**
- Header: `bg-[#F9FAFB] text-[11px] uppercase tracking-wider`
- Row hover: `hover:bg-[#F9FAFB]` + left accent via CSS
- Numeric cells: always use `font-mono-data` class

**Buttons:**
- Primary: `bg-[#2563EB] text-white rounded-lg text-[13px] font-medium`
- Secondary: `bg-white border border-[#E5E7EB] text-[#374151] rounded-lg text-[13px]`

**Badges:**
- `text-[11px] font-semibold px-2 py-0.5 rounded-md`

**Rank badges** — use 5-tier color system:
- 1–3: `bg-[#DCFCE7] text-[#14532D]`
- 4–10: `bg-[#D1FAE5] text-[#065F46]`
- 11–20: `bg-[#FEF3C7] text-[#92400E]`
- 21–50: `bg-[#FFEDD5] text-[#9A3412]`
- 50+: `bg-[#FEE2E2] text-[#991B1B]`

## Icons
Use **lucide-react** (already installed). Never add other icon libraries.

Common: `TrendingUp`, `TrendingDown`, `BarChart3`, `Target`, `Globe`, `Key`, `FileText`, `Settings`, `Search`, `Plus`, `X`, `Trash2`, `Download`, `Shield`, `AlertTriangle`

## Charts (Recharts)
Chart color order: `#2563EB`, `#0D9488`, `#7C3AED`, `#D97706`, `#059669`, `#DC2626`

Grid: `stroke="#F3F4F6" strokeDasharray="3 3"` — horizontal only, no vertical
Axis text: `fontSize={11} fill="#9CA3AF" fontFamily="Inter, sans-serif"`

## Loading States
Use `.skeleton` class (shimmer animation defined in `index.css`), not spinner for table/card loading.

## Typography
- Data/numbers: always `font-mono-data` class
- Section labels: `text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium`
- Page titles: `text-2xl font-bold text-[#111827] tracking-tight`

## Do Not
- Add new CSS files — use Tailwind utilities + existing CSS variables
- Use raw hex colors inline when a semantic variable exists
- Add heavy animation libraries — use CSS transitions (150–200ms)
- Use `grid-cols-*` without checking compact mode behavior
