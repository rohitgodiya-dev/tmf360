@AGENTS.md

# Trial360 OS — Project Instructions

## Identity
- Project: Trial360 OS — AI clinical trial operating system
- Repo: rohitgodiya-dev/tmf360 (main branch)
- Live: trial360os.com (served at https://www.trial360os.com)
- Stack: Next.js 16, TypeScript, Supabase, Vercel, Anthropic Claude API, Resend
- Local: C:\Users\rohit\Desktop\tmf360

## Load at session start
1. Read `.claude/skills/trial360-context/SKILL.md` (project state, tables, roadmap).
2. Check the open claude-mem work_state lists (current part and its next step) and `git status`.
Load the other skills in `.claude/skills/` only when the task needs them: page-builder (UI),
compliance (before committing), database (any SQL), etmf-domain (TMF/ISF domain).
Path-scoped rules in `.claude/rules/` load automatically for matching files.
Plans per part: `docs/partN-plan.md`. API conventions: `docs/api-conventions.md`.

## 10 Rules — Never Break These
1. Inline styles only — no Tailwind className in page code (Tabler icon classes `ti ti-*` are allowed)
2. TMF360 and Site360 are fully independent — never share data tables
3. Site360 demo → site360_demo_requests. TMF360 demo → demo_requests. Never mix.
4. ISF lives at /site360/isf — separate full page, not a panel
5. Always plan before building — list what will change before touching code
6. SQL first — run and confirm SQL before writing page code (dev Supabase first, then prod)
7. Read the file before editing it — never edit blind
8. Build must pass before pushing — npm run build, zero TypeScript errors
9. Soft delete only — never hard delete GxP data
10. Server timestamps only — never accept client-supplied timestamps

## Key IDs
- Org: db6a8dd1-6148-47ba-aace-fab4608ee7f5
- Site: c1000000-0000-0000-0000-000000000001
- Study T003: dfc10911-2707-4eee-9ab3-fef9f45b33a0
- User (Rohit): 43e8523a-eca5-4a04-8ef2-95cb3d6ff432

## Environments
- Supabase PROD is the CLI-linked project: `npx supabase db query --linked -f file.sql`
- Supabase DEV (structure-only copy): `npx supabase db query --linked --project-ref ikjusswwskrkjwxovgza -f file.sql`
- Local build: `SUPABASE_SERVICE_ROLE_KEY=placeholder npm run build`
- Tests: `npm test` (unit), `npm run test:integration` (dev Supabase only)
- E2E (browser): start `next dev -p 3100` with .env.dev, then `node tests/e2e/<name>.mjs`. Don't run e2e and the
  integration suite at the same time (DEV contention). If nested API routes 404 with HTML, delete `.next/dev` and restart.
- Pushing `main` deploys production. Checkpoint commits stay local until a part is complete.
- Guard rails: `.claude/settings.json` (permissions) + `.claude/hooks/pre-tool-check.mjs` (blocks force push,
  hard reset, recursive deletes of source dirs, supabase db reset/push, destructive SQL on PROD).

## Agent Architecture (`.claude/agents/`)
Build Agent → handles code changes + deploy cycle
Database Agent → handles all SQL + schema
Compliance Agent → pre-commit regulatory check
Test Agent → post-deploy page verification

## Scripts
- `scripts/verify-pillars.sql` — foundation pillar check (run the trigger test on DEV only)
- `scripts/pre-commit-check.sh` — build + isolation + style checks
- `scripts/page-health-check.js` — live page status
