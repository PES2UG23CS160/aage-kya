-- Release hardening for server-managed guidance, reviewed mentor workflows,
-- evidence-chain reads, and auth-profile bootstrapping.
-- Apply after 202607200002_guidance_trace_cache.sql.
BEGIN;

-- Every auth identity needs a minimal profile before guidance/roadmap rows can
-- satisfy their foreign keys. Do not trust user metadata for authorization.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.bootstrap_student_profile_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.students (id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'student')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bootstrap_student_profile_from_auth ON auth.users;
CREATE TRIGGER trg_bootstrap_student_profile_from_auth
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_student_profile_from_auth();

-- Backfill profiles for identities created before this trigger. Existing roles
-- are preserved because the conflict path updates email only.
INSERT INTO public.students (id, email, role)
SELECT id, COALESCE(email, ''), 'student'
FROM auth.users
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

-- Guidance and its evidence/agent trace are server output. Students may read
-- their own rows, but only a service-role client may create or mutate them.
DROP POLICY IF EXISTS "guidance_self_rw" ON public.guidance_results;
DROP POLICY IF EXISTS "guidance_owner_read" ON public.guidance_results;
CREATE POLICY "guidance_owner_read"
  ON public.guidance_results FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

REVOKE ALL ON public.guidance_results FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.guidance_results FROM authenticated;
GRANT SELECT ON public.guidance_results TO authenticated;

-- Mentor applications remain default-deny under RLS and are reviewed through
-- the service-role workflow.
ALTER TABLE public.mentor_applications
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.mentor_applications
  DROP CONSTRAINT IF EXISTS mentor_applications_status_allowed;
ALTER TABLE public.mentor_applications
  ADD CONSTRAINT mentor_applications_status_allowed
  CHECK (status IN ('pending', 'approved', 'rejected')) NOT VALID;
ALTER TABLE public.mentor_applications
  VALIDATE CONSTRAINT mentor_applications_status_allowed;

CREATE INDEX IF NOT EXISTS idx_mentor_applications_review_queue
  ON public.mentor_applications (status, created_at DESC);

-- A reviewed mentor may answer an unclaimed question or edit their own answer,
-- but cannot overwrite another mentor's answer or attribute an answer to them.
DROP POLICY IF EXISTS "qa_posts_verified_mentor_update" ON public.qa_posts;
CREATE POLICY "qa_posts_verified_mentor_update"
  ON public.qa_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.mentors m
      WHERE m.user_id = auth.uid()
        AND m.verified_at IS NOT NULL
        AND (qa_posts.mentor_id IS NULL OR qa_posts.mentor_id = m.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.mentors m
      WHERE m.user_id = auth.uid()
        AND m.verified_at IS NOT NULL
        AND qa_posts.mentor_id = m.id
    )
  );

CREATE OR REPLACE FUNCTION public.protect_qa_question_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF ROW(
    NEW.id, NEW.author_id, NEW.stream_tag, NEW.question, NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.id, OLD.author_id, OLD.stream_tag, OLD.question, OLD.created_at
  ) THEN
    RAISE EXCEPTION 'question identity fields cannot be changed while answering';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.mentors m
    WHERE m.id = NEW.mentor_id
      AND m.user_id = auth.uid()
      AND m.verified_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'answers must be attributed to the authenticated verified mentor';
  END IF;

  RETURN NEW;
END;
$$;

-- Reviewed source metadata is safe to expose and is required to make the
-- evidence links on public catalogue records independently inspectable.
DROP POLICY IF EXISTS source_registry_active_read ON public.source_registry;
CREATE POLICY source_registry_active_read
  ON public.source_registry FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS source_snapshots_verified_read ON public.source_snapshots;
CREATE POLICY source_snapshots_verified_read
  ON public.source_snapshots FOR SELECT
  TO anon, authenticated
  USING (
    verification_status = 'verified'
    AND reviewed_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.source_registry r
      WHERE r.id = source_id AND r.active = true
    )
  );

DROP POLICY IF EXISTS institutions_verified_read ON public.institutions;
CREATE POLICY institutions_verified_read
  ON public.institutions FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND verified_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.source_snapshots ss
      WHERE ss.id = source_snapshot_id
        AND ss.verification_status = 'verified'
        AND ss.reviewed_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS campuses_verified_read ON public.campuses;
CREATE POLICY campuses_verified_read
  ON public.campuses FOR SELECT
  TO anon, authenticated
  USING (
    verified_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.institutions i
      WHERE i.id = institution_id
        AND i.status = 'published'
        AND i.verified_at IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.source_snapshots ss
      WHERE ss.id = source_snapshot_id
        AND ss.verification_status = 'verified'
        AND ss.reviewed_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS courses_active_read ON public.courses;
CREATE POLICY courses_active_read
  ON public.courses FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS admission_cycles_read ON public.admission_cycles;
CREATE POLICY admission_cycles_read
  ON public.admission_cycles FOR SELECT
  TO anon, authenticated
  USING (status IN ('active', 'closed'));

DROP POLICY IF EXISTS program_offerings_verified_read ON public.program_offerings;
CREATE POLICY program_offerings_verified_read
  ON public.program_offerings FOR SELECT
  TO anon, authenticated
  USING (
    recognition_status = 'recognized'
    AND verified_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.institutions i
      WHERE i.id = institution_id
        AND i.status = 'published'
        AND i.verified_at IS NOT NULL
    )
    AND (
      campus_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.campuses c
        WHERE c.id = campus_id AND c.verified_at IS NOT NULL
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.admission_cycles ac
      WHERE ac.id = admission_cycle_id AND ac.status IN ('active', 'closed')
    )
    AND EXISTS (
      SELECT 1 FROM public.source_snapshots ss
      WHERE ss.id = source_snapshot_id
        AND ss.verification_status = 'verified'
        AND ss.reviewed_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS exams_verified_read ON public.exams;
CREATE POLICY exams_verified_read
  ON public.exams FOR SELECT
  TO anon, authenticated
  USING (
    verified_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.source_snapshots ss
      WHERE ss.id = source_snapshot_id
        AND ss.verification_status = 'verified'
        AND ss.reviewed_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS exam_cycles_verified_read ON public.exam_cycles;
CREATE POLICY exam_cycles_verified_read
  ON public.exam_cycles FOR SELECT
  TO anon, authenticated
  USING (
    verified_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.exams e
      WHERE e.id = exam_id AND e.verified_at IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.admission_cycles ac
      WHERE ac.id = admission_cycle_id AND ac.status IN ('active', 'closed')
    )
    AND EXISTS (
      SELECT 1 FROM public.source_snapshots ss
      WHERE ss.id = source_snapshot_id
        AND ss.verification_status = 'verified'
        AND ss.reviewed_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS program_exam_requirements_read ON public.program_exam_requirements;
CREATE POLICY program_exam_requirements_read
  ON public.program_exam_requirements FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.program_offerings p
      WHERE p.id = program_offering_id
        AND p.recognition_status = 'recognized'
        AND p.verified_at IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.exam_cycles ec
      WHERE ec.id = exam_cycle_id AND ec.verified_at IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.source_snapshots ss
      WHERE ss.id = source_snapshot_id
        AND ss.verification_status = 'verified'
        AND ss.reviewed_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS fee_schedules_verified_read ON public.fee_schedules;
CREATE POLICY fee_schedules_verified_read
  ON public.fee_schedules FOR SELECT
  TO anon, authenticated
  USING (
    verified_at IS NOT NULL
    AND value_status IN ('official', 'institution_published', 'government_published')
    AND EXISTS (
      SELECT 1 FROM public.program_offerings p
      WHERE p.id = program_offering_id
        AND p.recognition_status = 'recognized'
        AND p.verified_at IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.source_snapshots ss
      WHERE ss.id = source_snapshot_id
        AND ss.verification_status = 'verified'
        AND ss.reviewed_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS fee_components_verified_read ON public.fee_components;
CREATE POLICY fee_components_verified_read
  ON public.fee_components FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fee_schedules f
      WHERE f.id = fee_schedule_id
        AND f.verified_at IS NOT NULL
        AND f.value_status IN ('official', 'institution_published', 'government_published')
    )
    AND EXISTS (
      SELECT 1 FROM public.source_snapshots ss
      WHERE ss.id = source_snapshot_id
        AND ss.verification_status = 'verified'
        AND ss.reviewed_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS location_cost_profiles_verified_read ON public.location_cost_profiles;
CREATE POLICY location_cost_profiles_verified_read
  ON public.location_cost_profiles FOR SELECT
  TO anon, authenticated
  USING (
    verified_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.source_snapshots ss
      WHERE ss.id = source_snapshot_id
        AND ss.verification_status = 'verified'
        AND ss.reviewed_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS scholarship_schemes_verified_read ON public.scholarship_schemes;
CREATE POLICY scholarship_schemes_verified_read
  ON public.scholarship_schemes FOR SELECT
  TO anon, authenticated
  USING (
    verified_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admission_cycles ac
      WHERE ac.id = admission_cycle_id AND ac.status IN ('active', 'closed')
    )
    AND EXISTS (
      SELECT 1 FROM public.source_snapshots ss
      WHERE ss.id = source_snapshot_id
        AND ss.verification_status = 'verified'
        AND ss.reviewed_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS scholarship_rules_verified_read ON public.scholarship_rules;
CREATE POLICY scholarship_rules_verified_read
  ON public.scholarship_rules FOR SELECT
  TO anon, authenticated
  USING (
    (valid_from IS NULL OR valid_from <= CURRENT_DATE)
    AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
    AND EXISTS (
      SELECT 1 FROM public.scholarship_schemes s
      WHERE s.id = scholarship_id AND s.verified_at IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.source_snapshots ss
      WHERE ss.id = source_snapshot_id
        AND ss.verification_status = 'verified'
        AND ss.reviewed_at IS NOT NULL
    )
  );

COMMIT;
