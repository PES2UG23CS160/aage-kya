# Foundation implementation record

Implementation date: 2026-07-19

This slice addresses immediate trust, security, configuration, and deployability defects. It does not complete the production rebuild described in the roadmap.

## Completed in code

- Removed tracked Supabase values from `server/.env.example` and documented mandatory rotation/history scanning.
- Added environment parsing and production validation in `server/config/env.js`.
- Added honest degraded local mode, capability health, dependency readiness, request IDs, basic security headers, structured request logging, strict production CORS requirements, 404 handling, and centralized unexpected-error handling.
- Made all frontend backend requests use `VITE_API_URL`/same-origin construction; removed hard-coded localhost origins.
- Kept the SPA renderable without frontend Supabase variables while auth/persistence fail closed.
- Removed fake backend/frontend mentor fallbacks, fabricated testimonials/adoption metrics, unconditional “free/online” promises, and simulated persistence success.
- Hid mentors until review and made an unavailable datastore return a truthful empty/error state.
- Made prototype seed/cutoff fallback data opt-in only in non-production and blocked accidental production seeding.
- Reframed the cutoff feature as an uncalibrated historical comparison, with descriptive position labels and explicit methodological limitations.
- Keyed guidance and roadmap caches by a canonical input fingerprint so changed profiles/options do not receive an unrelated cached result.
- Changed database-backed guidance labels and prompts from “verified” to prototype/unverified until evidence review exists.
- Added a forward security migration that protects role changes, requires reviewed mentor visibility, hides unreviewed colleges/scholarships/cutoffs, removes anonymous direct mentor-application inserts, and narrows Q&A, session, notification, and chat authorization.
- Corrected scholarship retrieval to include the marks field used by its current filter.
- Protected the analytics API with authenticated `admin` role middleware.
- Replaced deployment-key instructions in the student UI with an honest temporary-unavailability state.
- Cleared the existing frontend lint baseline and enabled the previously unused reviewed-feedback empty state.
- Upgraded Vite from the vulnerable 4.x line to 6.4.3 and removed reported npm audit vulnerabilities.
- Added a least-privilege GitHub Actions CI workflow for clean installs, lint, build, tests, and frontend/server high-severity dependency audits.
- Rewrote setup, limitations, security, migration, and verification documentation.

## Verification results

| Check | Result |
|---|---|
| `npm run lint` | Pass, zero warnings/errors |
| `npm run build` | Pass with Vite 6.4.3 |
| `npm test` | Pass: 13 tests across environment validation and API degraded mode |
| `npm audit --audit-level=high` | Pass: zero vulnerabilities reported |
| `node --check server/index.js` | Pass |

The API tests prove that missing configuration is visible, readiness fails closed, prototype cutoff data is not served by default, mentors are not fabricated, and writes do not report simulated success.

## Required owner/operator actions

These cannot be completed from a local code change:

1. Rotate/revoke the previously tracked Supabase service-role and anon/JWT credentials immediately, update deployment secrets, and review logs.
2. Run secret scanning over full Git history. Coordinate any history rewrite because it disrupts clones and does not replace rotation.
3. Back up and clone the database to staging; apply `supabase/migrations/202607190001_security_foundation.sql`; run role/RLS tests; then deploy it through an approved migration job.
4. Do not mark seed rows verified. Re-ingest a narrow pilot scope from authoritative current-cycle documents using the source policy.
5. Configure reviewed mentor records through a staff-only workflow before making the mentor service public.
6. Run browser/device/accessibility E2E in an environment reachable from the browser runner; the local in-app browser could not reach the host Vite process during this audit.

## Still intentionally open

- The server remains a JavaScript monolith and output schemas are not fully runtime validated.
- The database is still the legacy model plus an emergency migration, not the target normalized schema.
- In-memory rate limiting is not suitable for multiple instances.
- Recommendation caching does not yet include full profile/data/prompt/model versions.
- The recommendation and scholarship algorithms remain prototype filters; hiding unreviewed records prevents false trust but does not create production data.
- The cutoff comparison is not a calibrated admission model.
- Consent, retention, guardian/minor safeguards, moderation, data export/delete, OpenAPI, CI/CD, jobs, observability, E2E, and full accessibility/multilingual/PWA work remain phased deliverables.

The next implementation step is Phase 1 in `IMPLEMENTATION_ROADMAP.md`: typed contracts and modular domains, server-controlled role memberships, policy tests, migrations/CI, durable limits/jobs, consent, and observability.
