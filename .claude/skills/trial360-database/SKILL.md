---
name: trial360-database
description: Trial360 OS database rules — pre-migration checks, standard and soft-delete column sets, RLS template, post-migration verification, foundation pillar query, dev-then-prod workflow. Load before any SQL migration or schema change.
---

# Trial360 OS — Database Rules Skill

Load before any SQL migration or schema change.

## Where SQL runs
- Write migrations as `supabase/migrations/<timestamp>_<name>.sql`.
- Apply to DEV first: `npx supabase db query --linked --project-ref ikjusswwskrkjwxovgza -f <file>`
- Run integration tests on dev (`npm run test:integration`), then dry-run on PROD inside `begin; ... rollback;`, then apply to PROD: `npx supabase db query --linked -f <file>`.
- Never run test inserts into audit_trail on PROD — `sequence_no` uses `nextval('audit_trail_seq')`, so even a rolled-back insert leaves a gap in the chain.

## Pre-Migration Checklist
1. Check existing columns: select column_name from information_schema.columns where table_name='X';
2. Check existing policies: select policyname, cmd from pg_policies where tablename='X';
3. Check existing triggers: select trigger_name from information_schema.triggers where event_object_table='X';
4. Read the current definition before `create or replace function` (select prosrc from pg_proc where proname='X') — never overwrite a newer version
5. Never drop without checking what depends on it

## Standard Column Set (every new table)
```sql
id uuid primary key default gen_random_uuid(),
org_id uuid references organizations(id),
created_at timestamptz default now(),
created_by uuid
```

## Soft Delete Column Set (every GxP table)
```sql
deleted_at timestamptz,
deleted_by text,
deleted_by_id uuid,
deletion_reason text,
pre_deletion_status text
```

## RLS Template (every new table)
```sql
alter table X enable row level security;
create policy "org isolation" on X
  using (org_id = (
    select org_id from user_roles
    where user_id = auth.uid() and is_active = true
    limit 1
  ));
```
Prefer the existing helpers where they fit: `can_access_study(user, study, org)` and `has_org_permission(org, perm)`.

## Post-Migration Verification
```sql
select column_name from information_schema.columns where table_name='X';
select policyname from pg_policies where tablename='X';
select relrowsecurity from pg_class where relname='X';
```

## Foundation Pillar Verification
Run `scripts/verify-pillars.sql`. All values must be 1.

## Never Do
- Never hard delete from GxP tables
- Never disable RLS
- Never use service role key in client code
- Never run DROP without a transaction test
- Never skip post-migration verification
