# UI Design System

Source of truth: `apps/app/src/index.css`

---

## Color Palette

### Brand / Semantic
```
Primary blue:     #2563EB  (hover: #1D4ED8, light bg: #EFF6FF)
Success green:    #059669
Info teal:        #0284C7
Warning amber:    #D97706
Danger red:       #DC2626
Emerald:          #10B981
```

### Text
```
Primary:   #111827
Secondary: #4B5563
Muted:     #9CA3AF
```

### Backgrounds
```
App bg:    #F9FAFB (or #F8FAFC)
Card bg:   #FFFFFF
Sidebar:   #0F172A (dark navy)
Subtle:    #F3F4F6
Hover:     #F9FAFB
```

### Borders
```
Default:  #E5E7EB
Hover:    #D1D5DB
Premium:  #E2E8F0
```

### Rank Position Badge Colors (5-tier)
```
1–3:   bg #DCFCE7  text #14532D  (bright green)
4–10:  bg #D1FAE5  text #065F46  (light green)
11–20: bg #FEF3C7  text #92400E  (yellow)
21–50: bg #FFEDD5  text #9A3412  (orange)
50+:   bg #FEE2E2  text #991B1B  (light red)
```

---

## Typography

### Fonts
- **UI**: Inter (fallback: system-ui)
- **Mono/data**: JetBrains Mono (fallback: SF Mono, Fira Code)

### Scale
```
H1/page title:    24px, bold, tracking-tight
Section title:    14–16px, semibold
KPI label:        11px, uppercase, tracking-wider
Body:             13px, medium
Small/caption:    11–12px
Mono/data:        13px, font-mono-data
```

### Special Utilities
```css
.metric-value    /* 600 weight, tabular-nums, letter-spacing -0.03em */
.table-num       /* 13px mono, tabular-nums */
.font-mono-data  /* Mono family, tabular-nums, letter-spacing -0.02em */
```

---

## Component Patterns

### Cards (`.premium-card`)
```css
background: white
border: 1px solid #E2E8F0
border-radius: 12px
padding: 20px (normal) / 16px (compact)
box-shadow: var(--shadow-sm)
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)
hover: box-shadow: var(--shadow-md)
```

### KPI Card Anatomy
- Icon: 32px in colored circle (8px radius)
- Label: 11px uppercase, `#9CA3AF`
- Value: 36px (28px compact), bold, `#111827`
- Change badge: 13px + trending icon (lucide)
- Footer: 11px muted text, date range

### Tables
- Header: `#F9FAFB` bg, 11px uppercase, tracking-wider
- Row hover: `#F9FAFB` bg + 3px left accent bar (`#2563EB`)
- Row padding: 12px compact / 16px normal
- Cell padding: 8–12px compact / 12–16px normal

### Buttons
- Default: white bg, `#E5E7EB` border, `#374151` text
- Primary: `#2563EB` bg, white text
- Both: 13px medium, rounded-lg, 150ms transition
- Active: scale(0.98)

### Badges / Tags
- 11px semibold, `px-2 py-0.5`, `rounded-md`
- Position: `font-mono-data` class

### Glass Morphism (`.glass-pill`)
```css
background: rgba(255,255,255,0.7)
backdrop-filter: blur(8px)
border: 1px solid rgba(226,232,240,0.8)
box-shadow: var(--shadow-sm)
```

---

## Shadow System
```css
--shadow-sm:  0 1px 3px rgba(0,0,0,0.04)     /* cards, buttons */
--shadow-md:  0 4px 6px rgba(0,0,0,0.1)      /* hovered cards */
--shadow-lg:  0 20px 25px rgba(0,0,0,0.1)    /* modals, dropdowns */
```

---

## Spacing Scale (4px base)
```
--sp-1: 4px    --sp-5: 20px
--sp-2: 8px    --sp-6: 24px
--sp-3: 12px   --sp-8: 32px
--sp-4: 16px   --sp-10: 40px   --sp-12: 48px
```

---

## Layout

- **Sidebar**: 260px fixed, `#0F172A`, shadow-2xl
- **App bg**: `#F8FAFC`
- **Grid gap**: `gap-5`
- **4-col KPI**: `grid-cols-4 gap-5`
- **Dashboard split**: 8-col main + 4-col sidebar

---

## Charts (Recharts)

### Colors
```
#2563EB  blue
#0D9488  teal
#7C3AED  violet
#D97706  amber
#059669  emerald
#DC2626  red
```

### Patterns
- Grid: `#F3F4F6`, dashed 3-3, no vertical lines
- Axis: 11px, `#9CA3AF`, no lines
- Bars: max 48px, radius [4,4,0,0]
- Pie: innerRadius 55, outerRadius 80, stroke white 3px
- Sparklines: 72×28px SVG

---

## Compact Mode

Controlled by `compact` prop on components:
```
card padding:  12px 16px (vs 16px 20px)
metric value:  28px (vs 36px)
kpi label:     10px (vs 11px)
table padding: 6px 12px (vs 8px 12px)
chart height:  220px (vs 280px)
```

---

## Loading Skeleton
```css
@keyframes shimmer {
  0%   { background-position: -200% 0 }
  100% { background-position: 200% 0 }
}
.skeleton {
  background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}
```

---

## Icons

**lucide-react v0.575.0**

Common icons: `LayoutDashboard`, `Key`, `FileText`, `BarChart3`, `TrendingUp`, `TrendingDown`, `Target`, `Globe`, `Settings`, `LogOut`, `CreditCard`, `Search`, `Plus`, `X`, `Trash2`, `Download`, `Shield`, `AlertTriangle`

Loading states: `.animate-spin`, `.animate-pulse`

---

## Focus / Accessibility

```css
focus-visible: outline 2px solid #2563EB, offset 2px, radius 6px
```

Custom scrollbar: 6px width, `#D1D5DB` thumb, hover `#9CA3AF`

---

## Key Files

- `apps/app/src/index.css` — all CSS variables and global styles
- `apps/app/src/Dashboard.jsx` — card + chart patterns
- `apps/app/src/Keywords.jsx` — table + filter patterns
- `apps/app/src/components/Logo.jsx` — `LogoIcon` / `LogoFull` SVG components
