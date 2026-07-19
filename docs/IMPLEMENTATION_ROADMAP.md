# Prioritized implementation roadmap

This roadmap is ordered by risk and dependency, not by visual appeal. Phase 0 and Phase 1 are release foundations. Estimates are deliberately expressed as outcomes and gates; team size and source-access arrangements determine calendar dates.

## Priority legend

- P0: active security, trust, or deployability blocker.
- P1: required for a credible public beta.
- P2: required for production breadth and operations.
- P3: scale or optimization after evidence of use.

## Phase 0 — secure and make the prototype honest (P0)

### Deliverables

- Rotate the tracked Supabase service-role/anon credentials, review provider/database access logs, and run repository secret-history scanning. Rewriting public Git history requires repository-owner coordination; rotation is mandatory regardless.
- Replace all committed environment values with placeholders and add strict startup validation/readiness reporting.
- Route every frontend request through one configurable API client; remove production localhost constants.
- Remove fabricated mentors/testimonials/usage metrics and simulated-success responses, or visibly isolate them in an opt-in demo mode that cannot be confused with production.
- Add an emergency database migration preventing self-assigned roles and narrowing Q&A, notifications, and mentor-session policies.
- Protect analytics with staff authorization or remove it from the public API.
- Correct provider naming and publish an explicit data/AI limitation banner.
- Restore a passing build/test baseline; address current lint failures and vulnerable build tooling.

### Exit gate

No privileged credential remains valid; an unconfigured deployment fails safely or runs an explicit degraded health mode; the SPA uses the configured API; authorization bypass tests fail closed; no production path claims fake persistence or verified data.

## Phase 1 — typed modular foundation (P0/P1)

### Deliverables

- Migrate incrementally to TypeScript and domain modules: configuration, auth/policy, profile, catalogue, eligibility, recommendations, cost/aid, community, AI, and integrations.
- Introduce Zod request/response schemas, `/api/v1`, generated OpenAPI, consistent error envelopes, request IDs, structured redacted logs, timeouts, and centralized handlers.
- Establish versioned database migrations and local/staging seed fixtures separate from production data.
- Create server-controlled role memberships, default-deny RLS, and a complete policy test matrix.
- Add Dockerfiles, a worker process, Redis-backed distributed rate limiting/jobs, CI gates, preview/staging environments, readiness/liveness probes, error tracking, and basic telemetry.
- Implement server-recorded versioned consent, privacy settings, export request, deletion request, and retention jobs.

### Exit gate

The contract, migrations, policies, build, tests, security scans, and container smoke tests pass in CI; deployment and rollback are reproducible; all privileged actions are auditable.

## Phase 2 — authoritative catalogue and evidence operations (P1)

### Deliverables

- Implement the source registry, immutable snapshots, checksums, ingestion jobs, evidence assertions, verification workflow, conflicts, supersession, freshness SLAs, and correction reports.
- Normalize institutions, aliases, campuses, programs, program cycles, recognition, accreditations/rankings, exams, counselling routes, quotas/categories/seat pools, cutoffs, seats, deadlines, fees, and scholarships.
- Build admin review tools with provenance drill-down and publish controls.
- Launch regulator/authority connectors in a narrow initial scope (for example one engineering counselling system and one medical or state system) before adding breadth.
- Add data schema/range/continuity/duplicate tests and freshness dashboards.

### Exit gate

Every published fact in the pilot scope has an active-cycle source, locator, checksum, verification state, and freshness status; expired critical facts cannot be published.

## Phase 3 — profile, eligibility, and affordability core (P1)

### Deliverables

- Replace the current form with progressive, autosaved, versioned onboarding covering exams/ranks, eligibility attributes, goals, budget, location/lifestyle, accessibility, and family constraints.
- Build the versioned eligibility DSL/evaluator with `eligible`, `not_eligible`, and `needs_information` plus reasons and official citations.
- Implement scholarship rule matching, document checklists, deadlines, renewal conditions, and confirmed-versus-expected aid.
- Implement the component-level multi-year fee engine with editable low/base/high assumptions, living choices, escalation, cash timing, and loan scenarios.
- Add multilingual content structure, locale formatting, low-bandwidth drafts, and parent/assisted modes.

### Exit gate

Golden rule and cost fixtures pass; missing information never becomes eligibility; every number is sourced or visibly marked as an assumption; profile edits invalidate affected results.

## Phase 4 — recommendation engine and explainability (P1)

### Deliverables

- Build deterministic candidate generation, hard filters, feature calculation, transparent weighting, diversity, fallbacks, and counterfactual “what would change this result?” explanations.
- Add recommendation/evidence/model run records and data/profile/engine versioned cache keys.
- Implement the AI provider gateway, structured outputs, retrieval over approved evidence, server-side citations, no-new-facts validator, retry/circuit breaker/budgets, and deterministic degraded output.
- Replace “confidence” with profile completeness, evidence coverage/freshness, and uncertainty components.
- Build compare/save/share/print flows and actionable task generation.
- Establish counsellor-reviewed golden profiles, citation and hallucination tests, fairness slices, and feedback/correction loops.

### Exit gate

The engine can reproduce every result from recorded versions; all claims resolve to evidence; failure of every AI provider still yields a useful factual result; evaluation thresholds are approved before beta.

## Phase 5 — admission range and outcome validation (P1/P2)

### Deliverables

- Ingest correct round/quota/category/seat-pool historical cutoffs and seat matrices for the pilot systems.
- Launch conservative admission bands with partition, sample size, history, volatility, policy-change warning, and abstention.
- Collect consented application/allotment outcomes; build temporal backtests and calibration dashboards.
- Only after calibration meets documented thresholds, consider percentage ranges using monotonic or hierarchical models.
- Add scenario comparison for rank changes, category/domicile context, fee changes, and alternative rounds without presenting causally invalid claims.

### Exit gate

No estimate crosses incompatible admission partitions; temporal backtests and calibration/fairness reports are published internally; sparse or changed systems abstain.

## Phase 6 — trustworthy mentors and community (P1/P2)

### Deliverables

- Verify mentor identity, institution/course affiliation, claims, and availability; create expiry/re-verification workflows.
- Add guardian/minor safeguards, consent, conduct policy, report/block, moderation queues, escalation, session boundaries, and retention controls.
- Build truthful availability/calendar integration, request lifecycle, notifications, feedback, no-show and incident handling.
- Harden realtime authorization with narrowly scoped operations and policy tests.
- Add Q&A source citations, answer review, abuse prevention, and search.

### Exit gate

No unverified person is labelled verified/online; safeguarding operations and escalation are staffed, tested, and auditable; direct-client policy bypass tests pass.

## Phase 7 — mobile, multilingual, parent, and low-bandwidth excellence (P2)

### Deliverables

- WCAG 2.2 AA audit and remediation with keyboard/screen-reader/device testing.
- Full string/content internationalization, Indian-language terminology review, translated source/explanation fallbacks, and language QA.
- Installable PWA, offline drafts/saved summaries, update/staleness behavior, background retry, and data-saver mode.
- Parent/counsellor views with student-controlled sharing and evidence-first summaries.
- Low-end Android/web performance budgets, route/data lazy loading, compressed assets, and reliable printable reports.

### Exit gate

Critical journeys pass accessibility, language, low-bandwidth, offline interruption, and target-device performance suites.

## Phase 8 — production operations and governance (P2)

### Deliverables

- Service-level objectives, on-call ownership, dashboards/alerts, incident and provider-outage runbooks, status page, capacity/cost budgets, and chaos/degradation drills.
- Automated backups plus scheduled restore tests; disaster recovery objectives and regional/vendor risk review.
- Data governance board, source-owner SLAs, model/data cards, change approvals, bias/safety reviews, correction/appeal workflow, and public methodology/limitations pages.
- Product analytics with consent and minimization: funnel, evidence usage, applications/tasks, outcomes, corrections, and quality—not invasive tracking.
- Gradual rollout, feature flags, canaries, support tooling, and user research feedback cadence.

### Exit gate

Operational, privacy, data, safety, and model responsibilities have named owners; restore/failover/degradation drills meet objectives; support can explain and correct a recommendation.

## Phase 9 — scale and advanced optimization (P3)

### Deliverables

- Expand authorities, programs, states, languages, scholarships, and alternative/vocational pathways using the same evidence gates.
- Improve ranking and admission models only when outcome data supports them; run controlled experiments with guardrails.
- Introduce read replicas/search indexes, partitioning, CDN/edge caches, or service extraction only from measured bottlenecks.
- Offer counsellor/school workflows and public/partner APIs with scoped consent, tenant isolation, quotas, contracts, and provenance.

### Exit gate

Expansion does not reduce freshness, calibration, fairness, accessibility, or incident response below the pilot standard.

## First implementation slice in this repository

The first code changes should remain deliberately narrow and reversible:

1. Sanitize environment examples and make missing configuration explicit.
2. Centralize frontend API URL construction.
3. Allow the server health and honest public fallback endpoints to start without Supabase; return `503` for persistence-dependent actions instead of fake success.
4. Remove fake mentor data and simulated writes.
5. Add a security-hardening SQL migration and migration guidance.
6. Add request/error hygiene and test the degraded mode.
7. Update README setup, architecture, verification, and security instructions.

This slice does not claim to complete the production rebuild. It creates a trustworthy base on which Phase 1 can proceed without preserving critical security and deployment defects.

## Definition of done for any future feature

- Product behavior and limitations are written before implementation.
- Typed API/data contracts and authorization decisions exist.
- Every factual input has provenance/freshness; every assumption is labelled.
- Unit, contract, policy, accessibility, and relevant E2E/data/model tests pass.
- Loading, empty, partial, error, offline, unauthorized, and rate-limited states work.
- Telemetry is redacted, useful, and linked to an owner/runbook.
- Documentation, migration/rollback, privacy/retention, and support implications are complete.
- No success, verification, availability, probability, or impact claim is synthetic.
