# Aage Kya?

Aage Kya is an India-focused education-guidance prototype for students after class 10 and class 12. The current application includes onboarding, AI-assisted path exploration, roadmaps, a cutoff simulator, saved scenarios, mentor/community surfaces, and a Supabase-backed account flow.

It is not yet a production admissions authority. Current seed fees, cutoffs, college matches, exam rules, and scholarships are prototype data and must be verified against the active official notice before a student acts on them. The production rebuild and evidence policy are documented below.

## Project status and design documents

- [Current-state audit](docs/CURRENT_STATE_AUDIT.md)
- [Target architecture, schema, APIs, and algorithms](docs/TARGET_ARCHITECTURE.md)
- [Official-data and AI research strategy](docs/DATA_AND_AI_RESEARCH.md)
- [Prioritized implementation roadmap](docs/IMPLEMENTATION_ROADMAP.md)
- [Requirement traceability ledger](docs/PROJECT_PLAN_TRACEABILITY.md)
- [Database release runbook](docs/DATABASE_RELEASE_RUNBOOK.md)
- [Production deployment runbook](docs/DEPLOYMENT.md)

## Current stack

| Layer | Technology | Location |
|---|---|---|
| Web | React 18, React Router, Vite, Tailwind CSS | `src/` |
| API | Node.js 20+, Express | `server/index.js` |
| AI | Groq chat and Whisper APIs | Server-side only |
| Auth/data/realtime | Supabase | `supabase_schema.sql` and `supabase/migrations/` |
| Deployment stubs | Vercel SPA config and server Procfile | `vercel.json`, `server/Procfile` |

## Local setup

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
cd server
npm ci
```

Copy the environment templates without committing the resulting files:

```powershell
Copy-Item .env.example .env
Copy-Item server/.env.example server/.env
```

Frontend variables:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# Blank locally: Vite proxies same-origin /api requests to port 5000.
VITE_API_URL=
```

Server variables:

```dotenv
PORT=5000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
PUBLIC_APP_URL=http://localhost:5173
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# Required in production:
# RESEND_API_KEY=your_resend_api_key
# RESEND_FROM_EMAIL=Aage Kya <noreply@your-verified-domain.example>
# Optional: GROQ_MODEL, AI_TIMEOUT_MS, and AI_MAX_RETRIES
# Development fixtures only: ENABLE_PROTOTYPE_DATA=true
```

Outside production, the API can start in explicit degraded mode without Supabase or Groq so health, validation, and honest empty states can be tested. Auth/persistence or AI endpoints remain unavailable; they are not simulated. Production startup fails if Supabase, Groq, or `ALLOWED_ORIGINS` is missing.
Production also requires the service-role client, an explicit HTTPS public URL,
HTTPS CORS origins, and configured Resend credentials/sender.

Run the services in separate terminals:

```bash
cd server
npm start
```

```bash
npm run dev
```

The web app is normally at `http://localhost:5173` and the API at `http://localhost:5000`.

## Database setup

The repository is transitioning from a legacy bootstrap SQL file to ordered migrations.

For a new development database:

1. Create a Supabase project or local Supabase instance.
2. Apply `supabase_schema.sql` once.
3. Apply files in `supabase/migrations/` in filename order.
4. Enable the intended Supabase email authentication providers and configure redirect URLs.
5. Test RLS using anonymous, student, mentor, and service-role clients.

For an existing database, apply only unapplied migrations after backup and staging verification. See [migration instructions](supabase/migrations/README.md).

Do not run `server/seed.js` in production. It contains prototype fixtures without field-level provenance, current-cycle validation, or human verification. In particular, migrated mentor rows are hidden until an authorized reviewer sets `verified_at`.

## Verification

```bash
# Frontend production build
npm run build

# Lint (zero warnings allowed)
npm run lint

# Environment unit tests and degraded-mode API integration tests
cd server
npm test
```

Health endpoints:

- `GET /api/health` reports process status and configured capabilities.
- `GET /api/health/ready` returns `503` until production dependencies are
  configured and every required Supabase table/column is reachable.

## API surface

The current unversioned prototype exposes:

- Guidance and plans: `/api/guidance`, `/api/roadmap`, `/api/parent-summary`, `/api/clarify`.
- Prediction: `/api/predictor/options`, `/api/predictor/predict`, `/api/predictor/simulate`.
- Account data: `/api/sync`, `/api/re-onboard`, `/api/wallet`, `/api/scenarios`.
- Mentor/community: `/api/mentors`, `/api/mentors/apply`, `/api/mentor-sessions`, `/api/qa`, `/api/chat`, `/api/course-feedback`.
- Support: `/api/transcribe`, `/api/notifications`, `/api/health`.
- Staff-only: `/api/analytics` requires an authenticated `admin` role and a service-role client on the server.

The target API is `/api/v1` with generated OpenAPI and typed schemas; see the [target architecture](docs/TARGET_ARCHITECTURE.md#api-design).

## Security notice

A previous tracked version of `server/.env.example` contained real-looking Supabase credentials, including a service-role token. Removing it from the current file does not revoke it or remove it from Git history. The project owner must:

1. Rotate/revoke the exposed service-role and anon/JWT credentials in Supabase.
2. Review database/auth/provider logs for unexpected use.
3. Update deployment secrets and clients.
4. Run a repository-history secret scan and coordinate any history rewrite with all collaborators.

Never expose a service-role key to the browser. It bypasses RLS.

## Known limitations

- Recommendation and cutoff methods are prototype heuristics, not calibrated admission probabilities.
- The data model cannot yet provide complete active-cycle, field-level provenance.
- Exam details and seed data require current official-source re-ingestion.
- AI output is JSON-parsed but not yet fully schema-bound or claim-validated.
- The current server remains a monolith; TypeScript modules, OpenAPI, distributed rate limits, jobs, telemetry, and CI/CD are roadmap work.
- Frontend lint debt, accessibility/E2E coverage, multilingual completion, and offline/PWA behavior remain open.

Please report incorrect educational information instead of silently propagating it. A source URL, document date, admission cycle, and exact disputed value make corrections actionable.
