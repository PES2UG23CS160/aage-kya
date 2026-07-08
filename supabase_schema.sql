-- ============================================================
-- "Aage Kya?" PostgreSQL Schema (Supabase)
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

-- ─── 1. Students Profile Table ───────────────────────────────
-- Linked 1-to-1 with Supabase Auth users (auth.users).
-- id == auth.uid() so RLS policies work transparently.

CREATE TABLE IF NOT EXISTS public.students (
  id                 UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name          TEXT        NOT NULL DEFAULT '',
  state              TEXT        NOT NULL DEFAULT '',
  board              TEXT        NOT NULL DEFAULT '',
  stream             TEXT        NOT NULL DEFAULT '',
  marks              NUMERIC     NOT NULL DEFAULT 0,
  income_range       TEXT        NOT NULL DEFAULT '',
  first_gen_college  BOOLEAN     NOT NULL DEFAULT false,
  preferred_cities   TEXT[]      NOT NULL DEFAULT '{}',
  interests          TEXT        NOT NULL DEFAULT '',
  biggest_fear       TEXT        NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ─── 2. AI Guidance Results ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.guidance_results (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                UUID        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  summary                   TEXT        NOT NULL,
  options                   JSONB       NOT NULL,
  scholarship_to_check      TEXT        NOT NULL,
  one_thing_to_do_this_week TEXT        NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ─── 3. AI 4-Year Learning Roadmaps ──────────────────────────
CREATE TABLE IF NOT EXISTS public.roadmaps (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  career_path TEXT        NOT NULL,
  overview    TEXT        NOT NULL,
  years       JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ─── 4. Auto-update updated_at on students ───────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 5. Row Level Security ────────────────────────────────────
ALTER TABLE public.students         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidance_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps         ENABLE ROW LEVEL SECURITY;

-- Students can only read/write their own row.
DROP POLICY IF EXISTS "students_self_rw" ON public.students;
CREATE POLICY "students_self_rw"
  ON public.students FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "guidance_self_rw" ON public.guidance_results;
CREATE POLICY "guidance_self_rw"
  ON public.guidance_results FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "roadmaps_self_rw" ON public.roadmaps;
CREATE POLICY "roadmaps_self_rw"
  ON public.roadmaps FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- ─── 6. Analytics Views (pitch-deck data) ────────────────────
-- These views are readable ONLY via the service role key (bypasses RLS).
-- Call GET /api/analytics on the backend (server/index.js) to query safely.

-- "How many students chose each stream?"
CREATE OR REPLACE VIEW public.v_students_by_stream AS
  SELECT stream, COUNT(*) AS student_count
  FROM public.students
  GROUP BY stream
  ORDER BY student_count DESC;

-- "How many students per state?"
CREATE OR REPLACE VIEW public.v_students_by_state AS
  SELECT state, COUNT(*) AS student_count
  FROM public.students
  GROUP BY state
  ORDER BY student_count DESC;

-- "Income distribution — useful for grant applications and impact framing"
CREATE OR REPLACE VIEW public.v_students_by_income AS
  SELECT income_range, COUNT(*) AS student_count
  FROM public.students
  GROUP BY income_range
  ORDER BY student_count DESC;

-- "First-gen vs returning college families"
CREATE OR REPLACE VIEW public.v_first_gen_split AS
  SELECT first_gen_college, COUNT(*) AS student_count
  FROM public.students
  GROUP BY first_gen_college;

-- ─── 7. Useful ad-hoc queries (run in SQL editor) ────────────
-- Cross-tab: stream × state breakdown for the pitch deck.
-- SELECT stream, state, COUNT(*) AS n
-- FROM public.students
-- GROUP BY stream, state
-- ORDER BY n DESC
-- LIMIT 30;

-- ─── 8. Colleges Reference Table (Phase 3 — RAG grounding) ───
-- Populated by running: cd server && node seed.js
-- Public SELECT — no auth required (reference data).
-- Only insertable via service role key (seed script).

CREATE TABLE IF NOT EXISTS public.colleges (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL UNIQUE,
  state             TEXT        NOT NULL,
  city              TEXT        NOT NULL,
  streams           TEXT[]      NOT NULL DEFAULT '{}',
  min_marks         NUMERIC     NOT NULL DEFAULT 0,
  max_marks         NUMERIC     NOT NULL DEFAULT 100,
  yearly_cost_min   INTEGER     NOT NULL DEFAULT 0,   -- INR per year
  yearly_cost_max   INTEGER     NOT NULL DEFAULT 0,
  college_type      TEXT        NOT NULL DEFAULT 'private', -- central | state | private | deemed
  national          BOOLEAN     NOT NULL DEFAULT false,     -- accepts students from all states
  source_url        TEXT        NOT NULL DEFAULT '',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Fast array-overlap queries for stream filtering
CREATE INDEX IF NOT EXISTS idx_colleges_streams ON public.colleges USING GIN (streams);
CREATE INDEX IF NOT EXISTS idx_colleges_state   ON public.colleges (state);

-- RLS: enable but allow public reads (no auth required for reference data)
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "colleges_public_read" ON public.colleges;
CREATE POLICY "colleges_public_read"
  ON public.colleges FOR SELECT USING (true);

-- ─── 9. Scholarships Reference Table (Phase 3 — RAG grounding) ───
-- Populated by running: cd server && node seed.js
-- Public SELECT — no auth required.

CREATE TABLE IF NOT EXISTS public.scholarships (
  id                          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        TEXT    NOT NULL UNIQUE,
  description                 TEXT    NOT NULL DEFAULT '',
  eligibility_income_max_lakh NUMERIC NOT NULL DEFAULT 99,  -- 99 = no income limit
  eligibility_marks_min       NUMERIC NOT NULL DEFAULT 0,
  eligible_streams            TEXT[]  NOT NULL DEFAULT '{}', -- [] or ['All'] means any stream
  eligible_states             TEXT[]  NOT NULL DEFAULT '{}', -- [] or ['All'] means any state
  application_url             TEXT    NOT NULL DEFAULT '',
  deadline_pattern            TEXT    NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_scholarships_streams ON public.scholarships USING GIN (eligible_streams);

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scholarships_public_read" ON public.scholarships;
CREATE POLICY "scholarships_public_read"
  ON public.scholarships FOR SELECT USING (true);

-- ─── 10. Mentors Table (Phase 4 — Real Mentor Connect) ───────────
-- Public SELECT — no auth required.
-- Insert/Update/Delete restricted to service role key.

CREATE TABLE IF NOT EXISTS public.mentors (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  initials        TEXT        NOT NULL,
  college         TEXT        NOT NULL,
  degree          TEXT        NOT NULL,
  stream          TEXT        NOT NULL,                      -- e.g. "PCB → ECE"
  stream_category TEXT        NOT NULL,                      -- e.g. "Science (PCB)" (for matching)
  city            TEXT        NOT NULL,
  cal_link        TEXT        NOT NULL DEFAULT '#',
  story           TEXT        NOT NULL,
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  gradient        TEXT        NOT NULL DEFAULT 'from-blue-500/30 to-blue-600/10',
  border          TEXT        NOT NULL DEFAULT 'border-blue-500/25',
  tag_color       TEXT        NOT NULL DEFAULT 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  initials_bg     TEXT        NOT NULL DEFAULT 'bg-blue-500/20 text-blue-300',
  available       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_mentors_stream_category ON public.mentors (stream_category);
CREATE INDEX IF NOT EXISTS idx_mentors_tags ON public.mentors USING GIN (tags);

ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mentors_public_read" ON public.mentors;
CREATE POLICY "mentors_public_read"
  ON public.mentors FOR SELECT USING (true);

-- ─── 11. Mentor Applications Table (Phase 4 — Volunteer pipeline) ───
-- RLS enabled. No public policies. Only readable/writable by admin client via service role key.

CREATE TABLE IF NOT EXISTS public.mentor_applications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  college           TEXT        NOT NULL,
  degree            TEXT        NOT NULL,
  stream_transition TEXT        NOT NULL,
  story             TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at        TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.mentor_applications ENABLE ROW LEVEL SECURITY;


