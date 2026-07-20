# Database migrations

The repository's original `supabase_schema.sql` is the legacy bootstrap schema. New changes are forward-only, ordered SQL files in this directory.

For an existing Supabase project, apply unapplied files in filename order with the Supabase CLI (`supabase db push`) or the SQL editor after reviewing them against a backup. For a new local project, apply `supabase_schema.sql` once, then apply these migrations until the legacy bootstrap is replaced by a generated baseline migration.

Never run `server/seed.js` in production. Its records are prototype fixtures without the field-level provenance required by `docs/DATA_AND_AI_RESEARCH.md`.

Before applying a security migration:

1. Back up the database and test the migration in a staging clone.
2. Run authorization tests with anonymous, student, mentor, and service-role clients.
3. Verify affected API paths, then record the migration in the deployment log.
4. Roll forward with a corrective migration; do not edit an already-applied migration.

Current order:

1. `supabase_schema.sql` - legacy bootstrap required by the current application.
2. `202607190001_security_foundation.sql` - emergency authorization hardening.
3. `202607200001_platform_core.sql` - normalized sources, institutions,
   programmes, exams, component fees, scholarships, recommendations, and
   agent-run audit records.
4. `202607200002_guidance_trace_cache.sql` - versioned guidance cache with
   grounding, decision context, and user-visible agent execution traces.
5. `202607200003_release_hardening.sql` - auth-to-student profile bootstrap,
   server-managed guidance rows, reviewed mentor workflow fields, safe Q&A
   attribution, and end-to-end evidence-chain read policies.

## Release compatibility

`202607200003_release_hardening.sql` deliberately removes authenticated
`INSERT`, `UPDATE`, and `DELETE` access from `guidance_results`. Deploy the
backend change that writes guidance through the service-role client at the same
time or before this migration. Direct browser writes, including legacy sync and
history-restore code, must not be treated as authoritative guidance.

The migration also creates an idempotent `auth.users` trigger and backfills a
minimal `students` row (`id`, `email`, default `student` role) for existing auth
identities. User-controlled auth metadata is never copied into the authorization
role.

## Legacy baseline limitation

This repository is not yet replayable from an empty database with
`supabase db reset`: the legacy bootstrap remains at the repository root, while
the first tracked migration assumes those tables already exist. Do not add an
older timestamped copy of `supabase_schema.sql` to a linked project: Supabase
would see it as an unapplied migration, replay its legacy public policies, and
could undo later hardening whose versions are already recorded.

The safe conversion is a coordinated baseline/squash release: capture the
current remote schema, validate a clean reset in a disposable project, and then
repair migration history on each existing project before adopting that baseline.
Until that work is scheduled, inspect the linked migration history and use a
staging clone before every push. A checked-in `supabase/config.toml` is also
deferred because local reset would still fail without the coordinated baseline.
