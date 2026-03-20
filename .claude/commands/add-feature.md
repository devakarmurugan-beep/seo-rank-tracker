Before implementing any new feature, load the full architecture context and enforce the planning workflow.

## Step 1: Read context files
Read these files silently to load project context:
- `.claude/context/architecture.md`
- `.claude/context/db_schema.md`
- `.claude/context/ui_design_system.md`

## Step 2: Clarify the feature
Ask the user:
1. Which surface does this affect? (Dashboard, Keywords, Pages, Settings, API, DB)
2. Does it require new DB tables/columns, or can it reuse existing ones?
3. Is there a UI component to build, or is this backend-only?

## Step 3: Plan before coding
- Enter plan mode (`/plan`) for any feature with 3+ steps or DB changes
- Identify which existing files to modify (prefer editing over creating new files)
- Check `apps/app/src/lib/dataFetcher.js` for existing query patterns to reuse
- Check `apps/app/src/lib/permissions.js` if the feature is plan-gated

## Step 4: UI rules (if building UI)
Follow `.claude/context/ui_design_system.md`:
- Use `premium-card` class for cards (12px radius, `#E2E8F0` border)
- Use `#2563EB` for primary actions
- Use `font-mono-data` for any numeric/position data
- Use lucide-react icons (already installed)
- Support `compact` prop if adding to Dashboard
- Match table styling: 11px uppercase headers, hover accent bar

## Step 5: Verify
- Run `npm run lint -w apps/app` after frontend changes
- Check Supabase RLS if adding new tables/queries
- Confirm the feature works for both free trial and paid plan users
