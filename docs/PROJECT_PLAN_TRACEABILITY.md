# Project plan traceability ledger

Source of truth: `Project Plan for Indian Education Guidance Platform.pdf` (36 pages).

This ledger prevents a requirement from being treated as complete merely because
it was mentioned in a design document. Every row needs code/data, automated
verification, and user-visible evidence before it can become `DONE`.

Status definitions:

- `DONE`: implemented and covered by an automated check.
- `PARTIAL`: a tested foundation exists, but the complete user outcome does not.
- `TODO`: not yet implemented.
- `OPERATOR`: requires an owner-controlled external action after code review.

## A. Repository audit and production foundation

| ID | Requirement and acceptance evidence | Status |
|---|---|---|
| AUD-001 | Audit stack, frontend, backend, API, database, authentication, AI, recommendation logic, fees, colleges, exams, scholarships, deployment and environment variables. | DONE |
| AUD-002 | Identify security weaknesses, broken/incomplete features, hard-coded values, mock/fake data, prototype shortcuts and scalability risks. | DONE |
| AUD-003 | Record UI/UX, responsive, accessibility, performance, rate-limit, test and documentation gaps. | DONE |
| ARC-001 | Modular domains for configuration, profile, catalogue, exams, fees, scholarships, recommendations, verification, community and AI. | PARTIAL |
| ARC-002 | Typed runtime request/response contracts with consistent versioned API envelopes and OpenAPI. | PARTIAL |
| ARC-003 | Preserve useful working features until tested replacements exist. | PARTIAL |
| ARC-004 | Mobile-app-compatible APIs and maintainable folder boundaries. | PARTIAL |

## B. Student profile and decision inputs

| ID | Requirement and acceptance evidence | Status |
|---|---|---|
| PRO-001 | Capture academic marks, board, stream, entrance marks/rank/percentile and multiple exam attempts. | PARTIAL |
| PRO-002 | Capture reservation category, domicile, gender/disability when voluntarily provided and consented. | PARTIAL |
| PRO-003 | Capture family income, annual budget, affordability, hostel and travel constraints. | PARTIAL |
| PRO-004 | Capture rural/semi-urban/urban background, state, district, preferred state/city and distance constraints. | PARTIAL |
| PRO-005 | Capture course/specialisation, college type, interests, skills, goals, language, accessibility and special requirements. | PARTIAL |
| PRO-006 | Progressive, autosaved, versioned onboarding with validation, missing-information states and profile completeness. | TODO |
| PRO-007 | Never convert missing information into an eligibility or recommendation assumption. | PARTIAL |

## C. Agentic AI and hybrid decision architecture

| ID | Requirement and acceptance evidence | Status |
|---|---|---|
| AGT-001 | Main orchestrator coordinates dependencies, avoids duplicate work, collects evidence, handles failures and returns an execution trace. | DONE |
| AGT-002 | Student Profile Agent produces a validated structured profile and missing-field report. | DONE |
| AGT-003 | College Recommendation Agent ranks evidence-bound candidates using transparent factors. | PARTIAL |
| AGT-004 | Competitive Examination Agent identifies routes and later resolves current-cycle rules from official records. | PARTIAL |
| AGT-005 | Fee Analysis Agent calculates first-year, annual, complete-course, hostel, travel and scenario costs from components. | PARTIAL |
| AGT-006 | Scholarship Agent evaluates versioned eligibility/exclusion/renewal rules and required documents. | PARTIAL |
| AGT-007 | Career Guidance Agent maps courses, alternatives, skills, certifications, internships, roles and long-term paths. | PARTIAL |
| AGT-008 | Verification Agent checks authority, cycle, freshness, conflicts, missing evidence and unsupported claims. | PARTIAL |
| AGT-009 | Recommendation Explanation Agent explains fit, rejection reasons, factors, costs, aid, exams, risks and next actions in simple language. | PARTIAL |
| AGT-010 | Provider abstraction supports provider order, timeout, retry, transient-error fallback and validated structured output. | PARTIAL |
| AGT-011 | Configure at least two production text providers plus local/Ollama development mode and health-based failover. | TODO |
| AGT-012 | Add embeddings, approved-evidence retrieval, reranking and citation entailment checks. | TODO |
| AGT-013 | Add semantic cache, deduplication, queue/batch processing, user/daily quotas, token/cost budgets and model-health monitoring. | PARTIAL |
| AGT-014 | AI remains server-side and cannot create college, fee, cutoff, scholarship, deadline or eligibility facts. | PARTIAL |
| AGT-015 | Deterministic code owns eligibility, fee maths, deadlines, ranking factors, scholarship rules and admission bands. | PARTIAL |

## D. Source-based Indian education data

| ID | Requirement and acceptance evidence | Status |
|---|---|---|
| DAT-001 | Source priority: official authority, institution notice, government data, accredited discovery source, then labelled community input. | DONE |
| DAT-002 | Store immutable snapshots, checksums, effective dates, academic cycle, review status, reviewer and conflict/supersession links. | PARTIAL |
| DAT-003 | Automated ingestion pipeline for government portals, institution sites/PDFs, exam authorities, public datasets and approved APIs. | TODO |
| DAT-004 | Admin review queue, source drill-down, corrections, publish/unpublish and audit history. | TODO |
| DAT-005 | Scheduled refresh for fees, exams, scholarships, cutoffs, courses, recognition and ranking/outcomes. | TODO |
| DAT-006 | Freshness SLAs, expiry alerts, source failure monitoring and change detection. | TODO |
| DAT-007 | Never silently overwrite conflicting evidence; preserve and display conflict status. | PARTIAL |

## E. Institution, programme and search catalogue

| ID | Requirement and acceptance evidence | Status |
|---|---|---|
| CAT-001 | Model institutions, aliases, ownership/type, campuses, location, recognition, accreditation and official sources. | PARTIAL |
| CAT-002 | Cover government/private/deemed/central/state/autonomous institutions; IIT, NIT, IIIT, IISER; medical, dental, nursing, pharmacy, law, engineering, management, polytechnic, diploma, arts, science, commerce, design, architecture, agriculture, veterinary, teaching, vocational, skill, open, distance and online providers. | PARTIAL |
| CAT-003 | Model courses, levels, disciplines, duration, programme cycle, seats, delivery mode, language and application URL. | PARTIAL |
| CAT-004 | Search by college/course/city/state/exam/fees/scholarship/accreditation/placement/hostel and admission probability. | TODO |
| CAT-005 | Full-text, filters, faceting, pagination, typo correction, synonyms, recent/popular searches and useful semantic search. | TODO |

## F. Detailed fee research and affordability

| ID | Requirement and acceptance evidence | Status |
|---|---|---|
| FEE-001 | Component model covers tuition, admission, application, registration, examination, lab, library, development, technology, hostel, mess, transport, books/materials, uniform, tools/equipment/laptop, deposits, internship/clinical/field/industrial visit, placement/alumni/activity, insurance, convocation, counselling, one-time and other compulsory costs. | DONE |
| FEE-002 | Each record stores institution/program, duration, academic year, amount/currency, recurrence, mandatory/optional/refundable, student category, domicile, gender, hostel condition, source, verification, confidence and notes. | DONE |
| FEE-003 | Distinguish official, institution/government-published, estimated, historical, third-party, contributed and unverified values. | DONE |
| FEE-004 | Calculate first-year, annual, complete-course, monthly burden, hostel, travel, gross, confirmed-aid net, expected-aid scenario, loan requirement and low/base/high totals. | PARTIAL |
| FEE-005 | Location engine covers rural/semi-urban/urban/metro rent, food, utilities, internet, local transport and origin-to-campus travel. | PARTIAL |
| FEE-006 | Recommend commutable, nearby, lower-cost, subsidised-hostel, government and fee-waiver options without assuming hostel affordability. | TODO |
| FEE-007 | Build a current, official-source pilot dataset for selected institution/course/cycle combinations; every number links to the precise fee notice. | PARTIAL |
| FEE-008 | Fee UI shows component breakdown, source, academic year, last checked date, confidence, additional-cost warning and editable assumptions. | PARTIAL |
| FEE-009 | Education-loan cash-flow, interest/subsidy assumptions, repayment scenarios and family emergency buffer. | TODO |

## G. Exams, cutoffs and admission probability

| ID | Requirement and acceptance evidence | Status |
|---|---|---|
| EXM-001 | National/state/institution exam catalogue across engineering, medicine/health, universities, management, law, design/architecture, PG/research, government/career and scholarship/talent categories. | PARTIAL |
| EXM-002 | Store authority, eligibility, qualification/subjects/age/attempt/nationality, dates, URL, syllabus, pattern, duration, questions, marking, score/rank/percentile, cutoffs, institutions, counselling, reservation, documents, cycle and last verified date. | PARTIAL |
| EXM-003 | Student can store multiple exam results including year, score, total, rank, category rank, percentile, qualification and counselling status. | TODO |
| EXM-004 | Exam relevance appears in recommendations without unrelated exams. | PARTIAL |
| ADM-001 | Eligibility engine returns `eligible`, `not_eligible` or `needs_information` with rule reasons and citations. | TODO |
| ADM-002 | Admission bands use cycle, exam, round, quota, category, domicile, seat pool, gender seats, demand and multi-year cutoffs. | TODO |
| ADM-003 | Present very high/high/moderate/low/very low/insufficient data; numeric ranges only after calibration, never guarantees. | PARTIAL |
| ADM-004 | Temporal backtests, sample size, volatility, policy-change warnings, calibration and abstention thresholds. | TODO |

## H. Scholarships and financial aid

| ID | Requirement and acceptance evidence | Status |
|---|---|---|
| SCH-001 | Cover central/state/institution/private, merit, income, category, minority, disability, women, rural, reimbursement, waiver and loan-support schemes. | PARTIAL |
| SCH-002 | Store provider/type, eligibility/exclusions, income/category/academic/domicile/gender/disability/course/institution conditions, award, duration, renewal, documents, deadline, URL, verification and last checked. | PARTIAL |
| SCH-003 | Rules engine returns why eligible/not/needs information, documents, expected benefit and confirmed-versus-possible aid. | PARTIAL |
| SCH-004 | Never rank only by award amount or subtract unconfirmed aid as guaranteed money. | PARTIAL |

## I. Recommendation and comparison

| ID | Requirement and acceptance evidence | Status |
|---|---|---|
| REC-001 | Transparent configurable score across eligibility, admission band, budget, course, location, scholarship, placement/academic signals, career, mentor, hostel, safety, distance and preferences. | PARTIAL |
| REC-002 | Produce dream/target/safe/very safe, budget, nearby, government, private alternative, scholarship-friendly, placement, academic, emerging, value and backup groups. | TODO |
| REC-003 | Every result shows reason, eligibility, probability/band, exam, cutoff comparison, fee/total cost, hostel, aid, outcomes, accreditation, advantages, disadvantages, source, confidence and next action. | PARTIAL |
| REC-004 | Lower-ranked better-fit options can outrank famous institutions; ranking alone never determines recommendations. | PARTIAL |
| CMP-001 | Compare multiple colleges on course, eligibility, band, tuition/total/hostel, aid, placements, rank/accreditation, faculty, infrastructure, distance, safety, reviews, advantages and disadvantages. | TODO |

## J. Student, parent, mentor and admin experiences

| ID | Requirement and acceptance evidence | Status |
|---|---|---|
| UI-001 | Modern mobile-first responsive landing, navigation, cards, transitions, forms, progress, skeletons, empty/error states, tooltips and clear typography. | PARTIAL |
| UI-002 | Dark/light themes, keyboard navigation, contrast, reduced motion, screen-reader labels and accessibility audit. | TODO |
| UI-003 | Optional performant 3D/map/journey/course visuals only when useful; lazy loaded with low-power fallbacks. | TODO |
| UI-004 | Student dashboard covers profile, recommendations, saved/compared colleges, exams, applications, deadlines, scholarships, fees, budgets, documents, mentors and history. | PARTIAL |
| UI-005 | Parent dashboard provides evidence-first summaries, affordability, backup plans and assisted/consented access. | TODO |
| UI-006 | Admin dashboard manages colleges, courses, fees, exams, cutoffs, scholarships, sources, reviews, mentors, users, AI usage/logs, errors, analytics, reports and updates. | TODO |
| UI-007 | Mentor identity/review, availability, sessions, chat/Q&A, conduct, reporting, moderation, safeguarding and re-verification. | PARTIAL |
| UI-008 | Multilingual architecture and preservation tests; low-bandwidth/PWA/offline drafts and installability. | TODO |

## K. Security, privacy, performance and reliability

| ID | Requirement and acceptance evidence | Status |
|---|---|---|
| SEC-001 | Secure authentication, email verification/reset, session/JWT validation, server-controlled RBAC and least-privilege RLS. | PARTIAL |
| SEC-002 | Input validation, SQL/XSS/CSRF/SSRF/path/file protections, uploads, document storage, rate limits, brute-force controls and safe errors/logs. | PARTIAL |
| SEC-003 | Encryption, secret management, audit trails, admin logs, sensitive-field minimisation and export/delete support. | PARTIAL |
| SEC-004 | Consent, guardian/minor safeguards, purpose limitation, retention/deletion policy and correction/appeal workflow. | TODO |
| SEC-005 | Never store passwords, API keys, authentication tokens or sensitive education information in client logs. | PARTIAL |
| PRF-001 | Fast initial load, slow-network/average-phone support, lazy loading, code splitting, image/animation limits, caching/CDN, pagination, indexes, compression and query optimisation. | PARTIAL |
| REL-001 | Central errors, retry/backoff, circuit breaker, provider/DB degradation, readiness, monitoring, alerts, backups and restore tests. | PARTIAL |
| REL-002 | AI outage still permits search, compare, profile, exams, scholarships, saved records and deterministic recommendations. | TODO |

## L. Testing, DevOps, documentation and delivery

| ID | Requirement and acceptance evidence | Status |
|---|---|---|
| TST-001 | Unit, integration, API, database/RLS, recommendation, eligibility, fee, scholarship, agent/provider, UI, accessibility, E2E, security and performance suites. | PARTIAL |
| TST-002 | Edge cases: missing/invalid scores, unknown categories, conflicting/outdated data, missing keys, provider/database failure, duplicate/no-match and slow network. | PARTIAL |
| OPS-001 | Docker/local services, separate environments, CI/CD, environment validation, migrations, seed fixtures, health checks, logging, backups, rollback, domain/SSL and monitoring. | PARTIAL |
| OPS-002 | Affordable initial deployment plus documented scale path and mobile/API readiness. | TODO |
| DOC-001 | README setup/run/test/build/migration/troubleshooting/security commands. | PARTIAL |
| DOC-002 | Architecture, database, API/OpenAPI, agent, recommendation, fee methodology, data source, testing, deployment, admin, contribution and change-log documentation. | PARTIAL |
| DEL-001 | Final reports: audit, architecture diagram, feature-gap analysis, upgrade limitations, security, deployment, recommendation/agent/fee methodology and complete changed-file/command/test inventory. | PARTIAL |
| DEL-002 | Final requirement audit proves every row here is `DONE` or explicitly accepted by the owner as out of scope. | TODO |

## Current implementation slice

Implemented in the first PDF-driven slice:

- Provider-agnostic structured AI gateway with timeout, retry, fallback and Zod validation.
- Nine-part guidance execution: eight specialist agents plus the main orchestrator.
- Evidence guardrails that remove unsupported college and scholarship claims.
- Deterministic profile normalization, exam-route discovery and transparent candidate scoring.
- Component-level fee engine with recurrence, conditions, escalation, confirmed/expected aid and low/base/high scenarios.
- Normalized database migration for evidence snapshots, institutions, programmes, exams, fees, living costs, scholarships, recommendation runs and agent-run auditing.
- Automated tests for the above foundations.

This slice is not the final product. Rows remain `PARTIAL` until real reviewed data,
API integration, user interfaces, operational deployment and acceptance tests are complete.
