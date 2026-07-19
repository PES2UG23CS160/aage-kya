# Database migrations

The repository's original `supabase_schema.sql` is the legacy bootstrap schema. New changes are forward-only, ordered SQL files in this directory.

For an existing Supabase project, apply unapplied files in filename order with the Supabase CLI (`supabase db push`) or the SQL editor after reviewing them against a backup. For a new local project, apply `supabase_schema.sql` once, then apply these migrations until the legacy bootstrap is replaced by a generated baseline migration.

Never run `server/seed.js` in production. Its records are prototype fixtures without the field-level provenance required by `docs/DATA_AND_AI_RESEARCH.md`.

Before applying a security migration:

1. Back up the database and test the migration in a staging clone.
2. Run authorization tests with anonymous, student, mentor, and service-role clients.
3. Verify affected API paths, then record the migration in the deployment log.
4. Roll forward with a corrective migration; do not edit an already-applied migration.
