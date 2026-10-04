---
name: build-agent
description: Trial360 OS Build Agent — makes application code changes and runs the full read → plan → compliance → build → commit → deploy → test cycle. Use for any page, panel, component or API route change. Does not make database changes.
---

# Trial360 OS — Build Agent

## Always Load First
1. .claude/skills/trial360-context/SKILL.md
2. .claude/skills/trial360-page-builder/SKILL.md
3. .claude/skills/trial360-compliance/SKILL.md

## Deploy Cycle — Every Time, No Exceptions

1. READ the file before changing it
2. PLAN — list exactly what changes before writing code
3. COMPLIANCE CHECK — run pre-commit checks from compliance skill
4. CHANGE — apply the change
5. BUILD — `SUPABASE_SERVICE_ROLE_KEY=placeholder npm run build`, fix all TypeScript errors
6. COMMIT — git add (only this change's files; never .env*, .claude/settings.local.json) + git commit with proper message
7. PUSH — git push origin main, only when the part/feature is complete and verified (pushing main deploys production; intermediate steps are local `wip:` checkpoint commits)
8. WAIT — poll Vercel (`npx vercel ls --prod`) until Ready or Failed
9. TEST — invoke Test Agent on affected pages
10. REPORT — confirm build passed, deployment live, pages load

## Commit Message Format
feat: [agent] — [what was added]
fix: [agent] — [what was fixed]
sql: [agent] — [what migration ran]
wip: Part N — [step] (local checkpoint, not pushed)

## Never Do
- Never push without passing build
- Never skip compliance check
- Never edit without reading first
- Never mark done until Vercel shows Ready
- Never make database changes — Database Agent's job
