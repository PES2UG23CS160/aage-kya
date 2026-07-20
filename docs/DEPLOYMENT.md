# Production deployment handoff

This runbook describes a Vercel frontend, a Render backend, and the existing
Supabase project. It deliberately does not contain credentials, provider IDs,
or an automatic database migration hook.

The intended topology is:

```text
Browser -> Vercel SPA -> Render Express API -> Supabase / Groq / Resend
```

Use one canonical HTTPS frontend origin in public links. Add other origins to
CORS only when they are intentionally supported.

## Release prerequisites

Before changing a production provider:

1. Confirm the release commit is pushed and CI is green.
2. Confirm the worktree contains no intended-but-uncommitted files.
3. Back up Supabase and rehearse the migrations in a staging clone.
4. Record the current Vercel deployment, Render deployment, database backup,
   and DNS state as rollback references.
5. Confirm the historical Supabase service-role credential previously present
   in Git history has been revoked or its old project has been disabled.

Useful local checks:

```powershell
git status --short --branch
git log --oneline origin/main..HEAD
git diff --check
npm run lint
npm test
npm run build
```

The build writes the ignored `dist/` directory. Never copy `.env` or
`server/.env` into a commit or deployment artifact.

## Environment contract

### Vercel frontend: build-time values

Configure these for the Production environment in the Vercel project. Configure
Preview separately only when previews are expected to call a non-production
backend.

| Variable | Required value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | The public anon key for the same Supabase project |
| `VITE_API_URL` | The HTTPS Render origin, for example `https://<api-service>.onrender.com` |

`VITE_API_URL` is an origin, not an `/api` path, and should not end with a
slash. These variables are compiled into the bundle; changing one requires a
new Vercel deployment. The anon key is designed for browser use, but the
service-role key must never be exposed through a `VITE_` variable.

The current Vercel catch-all serves `index.html` for every same-origin path.
Consequently, a blank production `VITE_API_URL` makes `/api/*` return the SPA
instead of API JSON.

Vercel should use the repository root with:

```text
Install command: npm ci
Build command:   npm run build
Output:          dist
```

### Render backend: runtime values

Create or update the backend from `render.yaml`. The blueprint is intentionally
manual (`autoDeploy: false`), uses `server` as `rootDir`, installs from
`server/package-lock.json`, and starts `server/index.js` through `npm start`.
Render supplies `PORT`; do not hard-code it.

The blueprint selects the free plan so importing it cannot silently choose a
paid tier. Review the plan, region, capacity, cold-start behavior, and
availability requirements before calling it production. Applying a blueprint
may perform an initial deployment; `autoDeploy: false` governs later Git
changes, so do not create/sync the service until the database gate is ready.

The blueprint fixes `NODE_ENV=production`. This is security-critical: without
that value an empty CORS list is treated as development mode.

Enter every `sync: false` value in Render rather than adding it to the YAML:

| Variable | Required value or decision |
| --- | --- |
| `ALLOWED_ORIGINS` | Comma-separated exact HTTPS frontend origins, with no paths |
| `PUBLIC_APP_URL` | The single canonical HTTPS frontend origin used in email links |
| `SUPABASE_URL` | Same project URL used by the frontend |
| `SUPABASE_ANON_KEY` | Same anon key used by the frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service-role key |
| `GROQ_API_KEY` | Production Groq key with access to the configured text and transcription models |
| `GROQ_MODEL` | Defaults in the blueprint to `llama-3.3-70b-versatile`; confirm availability before release |
| `AI_TIMEOUT_MS` | Defaults to `30000`; accepted range is 1000-120000 |
| `AI_MAX_RETRIES` | Defaults to `1`; accepted range is 0-3 |
| `RESEND_API_KEY` | Production Resend credential |
| `RESEND_FROM_EMAIL` | Verified sender, for example `Aage Kya <noreply@<verified-domain>>` |

Production startup rejects a missing service-role key, Resend key, verified
sender, public application URL, or HTTPS origin. `/api/health/ready` also checks
that the service-role client can select every required legacy and platform
table/column; it remains `503` until all migrations are present.

Do not set `ENABLE_PROTOTYPE_DATA=true` in production, and never run
`server/seed.js` against production.

## Canonical URLs, CORS, and Supabase Auth

Choose the canonical frontend and verified sender domains before setting
provider values. `RESEND_FROM_EMAIL` is configuration, so no domain is assumed
by the application.

For a canonical site such as `https://<web-domain>`:

```dotenv
# Vercel
VITE_API_URL=https://<render-api-origin>

# Render
NODE_ENV=production
ALLOWED_ORIGINS=https://<web-domain>
PUBLIC_APP_URL=https://<web-domain>
```

If both apex and `www` genuinely serve the app, include both exact origins in
`ALLOWED_ORIGINS`, then redirect one to the canonical host at the edge.
`PUBLIC_APP_URL` should still name only the canonical host. Dynamic Vercel
preview domains are not wildcarded by the current CORS implementation; add a
specific preview origin only for a deliberate test environment.

In Supabase Auth configure:

- the production Site URL;
- every intended magic-link, signup-confirmation, and password-reset redirect
  origin;
- only deliberate preview URLs;
- the required email provider/templates.

The frontend sends the current browser origin in signup and magic-link redirect
requests, so missing Supabase redirect entries will break those flows even when
CORS is correct.

## Supabase migration gate

There is no automatic production migration command in the Render blueprint.
Database changes must be reviewed, backed up, applied once, and recorded before
the application deployment.

For an existing database, do not apply `supabase_schema.sql` again. Apply only
unapplied migrations in filename order:

1. `supabase/migrations/202607190001_security_foundation.sql`
2. `supabase/migrations/202607200001_platform_core.sql`
3. `supabase/migrations/202607200002_guidance_trace_cache.sql`
4. `supabase/migrations/202607200003_release_hardening.sql`

For a brand-new development or staging database only, apply
`supabase_schema.sql` first and then those four migrations. The repository does
not currently contain `supabase/config.toml`; either use a deliberately linked
Supabase CLI project or review and run the files in the SQL editor. Never guess
which migrations have already been applied.

Before applying production SQL:

1. Take a named backup or confirm a usable point-in-time recovery point.
2. Restore or clone that point into staging.
3. Apply the same files in staging and run authorization tests with anon,
   student, mentor, and service-role clients.
4. Verify app compatibility and migration duration.
5. Apply production files one at a time and record the filename, commit, time,
   operator, and outcome.

Read-only metadata checks after migration:

```sql
select to_regclass('public.mentor_applications') as mentor_applications,
       to_regclass('public.recommendation_runs') as recommendation_runs,
       to_regclass('public.agent_runs') as agent_runs;

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'guidance_results'
  and column_name in (
    'input_fingerprint', 'pipeline_version', 'grounded', 'colleges_data',
    'scholarship_data', 'agent_trace', 'decision_context'
  )
order by ordinal_position;

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'mentor_applications', 'source_registry', 'institutions', 'campuses',
    'courses', 'admission_cycles', 'program_offerings', 'exams',
    'exam_cycles', 'program_exam_requirements', 'fee_schedules',
    'fee_components', 'location_cost_profiles', 'scholarship_schemes',
    'scholarship_rules', 'recommendation_runs', 'agent_runs',
    'guidance_results'
  )
order by c.relname;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Metadata is not an authorization test. In staging, prove that anonymous users
cannot insert directly into `mentor_applications`, students can access only
their own records, verified mentors receive only their intended permissions,
and the backend service role can perform the required privileged writes.

## Deployment order

1. Push the reviewed release commit and wait for CI to pass.
2. Create the backup and complete the staging migration rehearsal.
3. Prepare the provider values without creating a new service. For an existing
   Render service with deploys disabled, its runtime values may be updated now.
4. Apply and record the production Supabase migrations.
5. Create/sync the Render blueprint if needed, enter its `sync: false` values,
   and deploy the backend from the release commit.
6. Run backend readiness, CORS, and real dependency smoke tests.
7. Set Vercel's production values, including the deployed Render origin, and
   deploy Vercel from the same release commit.
8. Configure or verify the canonical domain, HTTPS redirect, and certificates.
9. Run browser auth, persistence, AI, mentor-application, and email smoke tests.
10. Start the monitoring window and record the deployment IDs and results.

Do not let a Git push trigger a production deployment before its required CI
checks complete. Keep Render manual until an explicit checked-deploy gate is in
place.

## Smoke checks

Set local shell variables to the deployed HTTPS origins; do not put credentials
in command history.

```powershell
$apiOrigin = 'https://<render-api-origin>'
$webOrigin = 'https://<web-domain>'

curl.exe -i "$apiOrigin/api/health"
curl.exe -i "$apiOrigin/api/health/ready"

curl.exe -i -X OPTIONS `
  -H "Origin: $webOrigin" `
  -H "Access-Control-Request-Method: GET" `
  -H "Access-Control-Request-Headers: authorization,content-type" `
  "$apiOrigin/api/health"

curl.exe -i -H "Origin: https://not-allowed.invalid" `
  "$apiOrigin/api/health"

curl.exe -I "$webOrigin"
curl.exe -I "$webOrigin/result"
```

Expected results:

- `/api/health` is `200`, reports `mode: configured`, and shows the intended
  capabilities.
- `/api/health/ready` is `200` only after required configuration and all
  expected database tables/columns are reachable through the service role.
- The allowed preflight echoes the exact frontend origin.
- The unapproved origin receives `403 ORIGIN_NOT_ALLOWED`.
- Both the root and a client-side route return the Vercel SPA over HTTPS.

Readiness validates database connectivity/schema, but not a real Groq
generation or Resend delivery. Complete controlled staging and production
checks for:

- signup, email confirmation, password login, magic link, password reset, and
  logout;
- authenticated save/read behavior and RLS isolation between two users;
- one Groq guidance request and one transcription against approved test input;
- one mentor application that is confirmed in Supabase;
- one Resend message to an owned test address;
- expected request IDs and provider errors in the log destination.

Use synthetic accounts and delete their test records according to the data
retention policy.

## Domain, TLS, and Resend

Configure DNS and custom domains in Vercel/Render rather than storing records or
certificates in Git. Verify:

- HTTP redirects to HTTPS;
- apex/`www` redirects to the chosen canonical host;
- the frontend never calls an HTTP API from an HTTPS page;
- certificate issuance, renewal, and expiry monitoring;
- HSTS once every required subdomain is HTTPS-ready.

Before setting `RESEND_FROM_EMAIL`, verify that sender domain in Resend and
publish the required SPF/DKIM records. Establish an appropriate DMARC policy
and test both delivery and bounce behavior.

## Logging and monitoring

Render should send application stdout/stderr to a retained log destination.
The server already emits request IDs and structured request/AI events, although
some legacy log entries remain unstructured. Do not retain email addresses,
user IDs, or IP-derived data longer than the documented operational need.

At minimum configure:

- an external uptime check for `/api/health` and an alert on readiness failure;
- alerts for sustained 5xx/429 rates, restarts, latency, and memory pressure;
- searches/alerts for `ai_call_error`, Supabase write failures, and Resend
  failures;
- Vercel build/deployment failure alerts;
- Supabase capacity, connection, auth, and backup alerts;
- Groq/Resend quota and provider-status monitoring;
- an owner, severity, and response path for every alert.

Run a post-deploy observation window and compare error rate, latency, AI
failures, and database errors with the pre-release baseline.

## Backups and recovery

Enable the Supabase backup/PITR option appropriate to the data criticality and
document:

- recovery point and recovery time objectives;
- backup frequency and retention;
- who may restore;
- encryption and access review;
- the last successful restore test.

A backup is not proven until it has been restored into an isolated project and
the schema, row counts, auth/RLS behavior, and representative application flows
have been checked. Schedule recurring restore drills.

Provider environment values need their own controlled record in a password
manager or secrets system; Git is not their backup.

## Roll-forward and rollback

The SQL migrations are forward-only and wrapped in transactions. Do not edit an
already-applied migration and do not improvise destructive down migrations.

For an application-only regression:

1. Stop promotion and capture logs/request IDs.
2. Roll Vercel and Render back to the recorded previous deployment.
3. Keep the expanded database schema in place when it is backward compatible.
4. Re-run health and critical smoke checks.

For a schema defect with intact data, create a reviewed corrective migration
and roll forward. Prefer additive compatibility changes so old and new
application versions can both run during recovery.

Restore a database backup only for data loss/corruption or when a reviewed
roll-forward cannot recover safely. A restore changes the recovery point for
the entire service and must be coordinated with application deployment, auth,
DNS, and incident communication.

Record every release with:

```text
Commit:
Vercel deployment:
Render deployment:
Supabase migrations:
Backup/recovery point:
Canonical frontend URL:
Backend URL:
Smoke-test result:
Monitoring owner/window:
Rollback decision and references:
```
