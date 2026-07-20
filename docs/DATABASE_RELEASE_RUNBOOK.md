# Database release runbook

Use this runbook for the ordered Supabase migrations in
`supabase/migrations`. Never apply a migration directly to production before it
has succeeded against a backup-restored staging project.

## Required release pairing

`202607200003_release_hardening.sql` makes `guidance_results` read-only to
authenticated clients. The deployed backend must therefore write guidance,
cache, sync, and restore records through the server-only service-role client.
`SUPABASE_SERVICE_ROLE_KEY` is also required for mentor applications,
recommendation/agent audit rows, and analytics. Keep it out of frontend builds.

## Preflight

1. Confirm the linked project and compare local/remote migration history.
2. Confirm PostgreSQL 15 or newer; the platform migration uses
   `UNIQUE NULLS NOT DISTINCT`.
3. Back up the database and restore that backup into staging.
4. Run a dry run, apply to staging, lint, and execute the role matrix below.

```powershell
npx supabase@latest link --project-ref <project-ref>
npx supabase@latest migration list
npx supabase@latest db push --dry-run --linked
npx supabase@latest db push --linked
npx supabase@latest db lint --linked --level warning --fail-on error
npm --prefix server test
```

Do not use `db reset --linked`; it drops remote user-created entities. The
repository also cannot yet reset a clean local database because its legacy
bootstrap is outside the migration directory. See the baseline limitation in
`supabase/migrations/README.md`.

## Schema verification

Run these read-only queries after the staging push and again after production:

```sql
SELECT current_setting('server_version_num')::integer AS server_version_num;

SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('students', 'guidance_results', 'mentor_applications')
ORDER BY table_name, ordinal_position;

SELECT c.relname AS table_name, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'trg_bootstrap_student_profile_from_auth';
```

Expected invariants:

- `mentor_applications` has RLS enabled and no anon/authenticated data policy.
- `guidance_results` has only the authenticated owner `SELECT` policy; browser
  clients cannot insert, update, or delete rows.
- `recommendation_runs` and `agent_runs` allow owner reads and service-role
  writes only.
- Public platform records disappear when their source snapshot is not reviewed
  and `verified`, or when a required parent record is not public.
- A fresh auth signup immediately has one `students` row whose role is
  `student` regardless of submitted user metadata.

## Role matrix

Use disposable identities and test through the same Supabase Data API used by
the application:

| Actor | Required checks |
| --- | --- |
| anon | Cannot read/write guidance or mentor applications; can read only reviewed public catalogue evidence. |
| student | Can read only their own guidance; cannot create or mutate guidance or agent traces. |
| verified mentor | Can answer an unclaimed question and edit their own answer; cannot overwrite or impersonate another mentor. |
| service role | Can persist guidance, review mentor applications, and write recommendation/agent audit rows. |

Also create an auth user with metadata such as `{"role":"admin"}` and verify
that the resulting `students.role` remains `student`.

## Rollout and rollback

Coordinate one migration operator. After the staging role matrix passes, run
`db push --dry-run` once more against production, deploy the compatible backend,
then push the database migration. Record migration versions and deployment IDs.

Migrations are forward-only. If policy behavior is wrong, deploy a new
corrective migration. Do not edit an already-applied SQL file or reset the
production database.
