-- Emergency authorization hardening for the prototype schema.
-- Apply after supabase_schema.sql. Test in a staging clone first.

BEGIN;

-- Existing seed mentors remain unverified and are deliberately hidden.
ALTER TABLE public.mentors
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Prototype reference rows are hidden until a reviewer records a current-cycle
-- verification. These columns are a bridge to the normalized evidence model.
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS admission_cycle TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS admission_cycle TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.college_cutoffs
  ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS counselling_authority TEXT,
  ADD COLUMN IF NOT EXISTS counselling_round TEXT,
  ADD COLUMN IF NOT EXISTS quota TEXT,
  ADD COLUMN IF NOT EXISTS seat_pool TEXT,
  ADD COLUMN IF NOT EXISTS domicile TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.guidance_results
  ADD COLUMN IF NOT EXISTS input_fingerprint TEXT;
ALTER TABLE public.roadmaps
  ADD COLUMN IF NOT EXISTS input_fingerprint TEXT;
CREATE INDEX IF NOT EXISTS idx_guidance_results_input
  ON public.guidance_results (student_id, input_fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roadmaps_input
  ON public.roadmaps (student_id, career_path, input_fingerprint, created_at DESC);

DROP POLICY IF EXISTS "colleges_public_read" ON public.colleges;
CREATE POLICY "colleges_verified_public_read"
  ON public.colleges FOR SELECT USING (verified_at IS NOT NULL);

DROP POLICY IF EXISTS "scholarships_public_read" ON public.scholarships;
CREATE POLICY "scholarships_verified_public_read"
  ON public.scholarships FOR SELECT USING (verified_at IS NOT NULL);

DROP POLICY IF EXISTS "cutoffs_public_read" ON public.college_cutoffs;
CREATE POLICY "cutoffs_verified_public_read"
  ON public.college_cutoffs FOR SELECT USING (verified_at IS NOT NULL);

-- A client that owns a students row must never assign its own privileged role.
CREATE OR REPLACE FUNCTION public.protect_student_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    IF TG_OP = 'INSERT' AND NEW.role IS DISTINCT FROM 'student' THEN
      RAISE EXCEPTION 'student role is server controlled';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'student role is server controlled';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_student_role ON public.students;
CREATE TRIGGER trg_protect_student_role
  BEFORE INSERT OR UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.protect_student_role();

ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_role_allowed;
ALTER TABLE public.students
  ADD CONSTRAINT students_role_allowed CHECK (role IN ('student', 'mentor', 'admin')) NOT VALID;
ALTER TABLE public.students VALIDATE CONSTRAINT students_role_allowed;

-- Public and application reads expose only reviewed mentor profiles.
DROP POLICY IF EXISTS "mentors_public_read" ON public.mentors;
CREATE POLICY "mentors_verified_public_read"
  ON public.mentors FOR SELECT
  USING (verified_at IS NOT NULL);

-- A mentor may change availability/booking details, but identity and review
-- evidence require a service-role/admin workflow.
CREATE OR REPLACE FUNCTION public.protect_mentor_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    IF ROW(
      NEW.id, NEW.name, NEW.initials, NEW.college, NEW.degree, NEW.stream,
      NEW.stream_category, NEW.city, NEW.story, NEW.tags, NEW.gradient,
      NEW.border, NEW.tag_color, NEW.initials_bg, NEW.created_at, NEW.user_id,
      NEW.verified_at, NEW.verified_by
    ) IS DISTINCT FROM ROW(
      OLD.id, OLD.name, OLD.initials, OLD.college, OLD.degree, OLD.stream,
      OLD.stream_category, OLD.city, OLD.story, OLD.tags, OLD.gradient,
      OLD.border, OLD.tag_color, OLD.initials_bg, OLD.created_at, OLD.user_id,
      OLD.verified_at, OLD.verified_by
    ) THEN
      RAISE EXCEPTION 'reviewed mentor identity fields are server controlled';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_mentor_profile ON public.mentors;
CREATE TRIGGER trg_protect_mentor_profile
  BEFORE UPDATE ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.protect_mentor_profile();

-- Anonymous users must use the rate-limited backend application endpoint.
DROP POLICY IF EXISTS "mentor_applications_public_insert" ON public.mentor_applications;

-- Q&A authors may delete their question but cannot self-answer or rewrite the
-- row through the direct Supabase client.
DROP POLICY IF EXISTS "qa_posts_mentor_update" ON public.qa_posts;
CREATE POLICY "qa_posts_verified_mentor_update"
  ON public.qa_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.user_id = auth.uid() AND m.verified_at IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.user_id = auth.uid() AND m.verified_at IS NOT NULL
    )
  );

CREATE OR REPLACE FUNCTION public.protect_qa_question_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND ROW(
    NEW.id, NEW.author_id, NEW.stream_tag, NEW.question, NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.id, OLD.author_id, OLD.stream_tag, OLD.question, OLD.created_at
  ) THEN
    RAISE EXCEPTION 'question identity fields cannot be changed while answering';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_qa_question_fields ON public.qa_posts;
CREATE TRIGGER trg_protect_qa_question_fields
  BEFORE UPDATE ON public.qa_posts
  FOR EACH ROW EXECUTE FUNCTION public.protect_qa_question_fields();

-- Students can create and view their sessions, and can rate only completed
-- sessions. Mentors can update only sessions assigned to their reviewed profile.
DROP POLICY IF EXISTS "mentor_sessions_student_rw" ON public.mentor_sessions;
DROP POLICY IF EXISTS "mentor_sessions_mentor_read" ON public.mentor_sessions;
DROP POLICY IF EXISTS "mentor_sessions_mentor_update" ON public.mentor_sessions;

CREATE POLICY "mentor_sessions_student_select"
  ON public.mentor_sessions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "mentor_sessions_student_insert"
  ON public.mentor_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND status = 'pending'
    AND notes = ''
    AND rating IS NULL
    AND rating_comment = ''
    AND EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.id = mentor_id AND m.verified_at IS NOT NULL AND m.available
    )
  );

CREATE POLICY "mentor_sessions_student_rate"
  ON public.mentor_sessions FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "mentor_sessions_verified_mentor_select"
  ON public.mentor_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.id = mentor_id AND m.user_id = auth.uid() AND m.verified_at IS NOT NULL
    )
  );

CREATE POLICY "mentor_sessions_verified_mentor_update"
  ON public.mentor_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.id = mentor_id AND m.user_id = auth.uid() AND m.verified_at IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.id = mentor_id AND m.user_id = auth.uid() AND m.verified_at IS NOT NULL
    )
  );

CREATE OR REPLACE FUNCTION public.protect_mentor_session_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.student_id THEN
    IF OLD.status <> 'completed' THEN
      RAISE EXCEPTION 'only completed sessions can be rated';
    END IF;
    IF ROW(
      NEW.id, NEW.student_id, NEW.mentor_id, NEW.session_date, NEW.status,
      NEW.notes, NEW.created_at
    ) IS DISTINCT FROM ROW(
      OLD.id, OLD.student_id, OLD.mentor_id, OLD.session_date, OLD.status,
      OLD.notes, OLD.created_at
    ) THEN
      RAISE EXCEPTION 'students may update only rating fields';
    END IF;
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.id = OLD.mentor_id AND m.user_id = auth.uid() AND m.verified_at IS NOT NULL
  ) THEN
    IF ROW(
      NEW.id, NEW.student_id, NEW.mentor_id, NEW.rating,
      NEW.rating_comment, NEW.created_at
    ) IS DISTINCT FROM ROW(
      OLD.id, OLD.student_id, OLD.mentor_id, OLD.rating,
      OLD.rating_comment, OLD.created_at
    ) THEN
      RAISE EXCEPTION 'mentors may update only schedule, status, and notes';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'not permitted to update this mentor session';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_mentor_session_fields ON public.mentor_sessions;
CREATE TRIGGER trg_protect_mentor_session_fields
  BEFORE UPDATE ON public.mentor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.protect_mentor_session_fields();

-- Notifications are server-created. Users may read them and update read_at only.
DROP POLICY IF EXISTS "notifications_self_rw" ON public.notifications;
CREATE POLICY "notifications_self_select"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "notifications_self_mark_read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.protect_notification_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND ROW(
    NEW.id, NEW.user_id, NEW.type, NEW.payload, NEW.sent_at, NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.id, OLD.user_id, OLD.type, OLD.payload, OLD.sent_at, OLD.created_at
  ) THEN
    RAISE EXCEPTION 'users may update only notification read state';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_notification_fields ON public.notifications;
CREATE TRIGGER trg_protect_notification_fields
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.protect_notification_fields();

-- Recreate chat policies so only reviewed mentors can be selected or act as a
-- mentor participant. Students retain access to their own existing sessions.
DROP POLICY IF EXISTS "chat_sessions_participant_read" ON public.chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_student_insert" ON public.chat_sessions;

CREATE POLICY "chat_sessions_participant_read"
  ON public.chat_sessions FOR SELECT
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.id = mentor_id AND m.user_id = auth.uid() AND m.verified_at IS NOT NULL
    )
  );

CREATE POLICY "chat_sessions_student_insert"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.id = mentor_id AND m.verified_at IS NOT NULL AND m.available
    )
  );

DROP POLICY IF EXISTS "chat_messages_participant_read" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_participant_insert" ON public.chat_messages;

CREATE POLICY "chat_messages_participant_read"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_sessions s
      WHERE s.id = session_id
        AND (
          auth.uid() = s.student_id
          OR EXISTS (
            SELECT 1 FROM public.mentors m
            WHERE m.id = s.mentor_id AND m.user_id = auth.uid() AND m.verified_at IS NOT NULL
          )
        )
    )
  );

CREATE POLICY "chat_messages_participant_insert"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.chat_sessions s
      WHERE s.id = session_id
        AND (
          auth.uid() = s.student_id
          OR EXISTS (
            SELECT 1 FROM public.mentors m
            WHERE m.id = s.mentor_id AND m.user_id = auth.uid() AND m.verified_at IS NOT NULL
          )
        )
    )
  );

COMMIT;
