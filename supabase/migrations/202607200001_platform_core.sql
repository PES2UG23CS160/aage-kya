-- Normalized evidence, catalogue, affordability, exam, scholarship, and
-- agent-run foundation. Apply after the legacy schema and security foundation.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.source_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('statute','regulator','counselling_authority','exam_authority','scholarship_owner','institution','government_dataset','accreditation_body','third_party','community')),
  authority_tier SMALLINT NOT NULL CHECK (authority_tier BETWEEN 1 AND 9),
  title TEXT NOT NULL,
  organisation TEXT NOT NULL,
  canonical_url TEXT NOT NULL UNIQUE,
  jurisdiction TEXT NOT NULL DEFAULT 'India',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.source_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.source_registry(id) ON DELETE CASCADE,
  document_title TEXT NOT NULL,
  document_url TEXT NOT NULL,
  academic_year TEXT,
  effective_from DATE,
  effective_to DATE,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  content_sha256 TEXT NOT NULL CHECK (length(content_sha256) = 64),
  storage_path TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','conflicting','superseded','expired','rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (source_id, content_sha256)
);
CREATE INDEX idx_source_snapshots_status ON public.source_snapshots (verification_status, last_checked_at DESC);

CREATE TABLE public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  name TEXT NOT NULL,
  institution_type TEXT NOT NULL CHECK (institution_type IN ('government_college','private_college','deemed_university','central_university','state_university','autonomous_college','iit','nit','iiit','iiser','medical_college','dental_college','nursing_college','pharmacy_college','law_college','engineering_college','management_college','polytechnic','diploma','arts_college','science_college','commerce_college','design_college','architecture_college','agricultural_college','veterinary_college','teacher_training','vocational','skill_development','open_university','distance_provider','online_provider','other')),
  ownership TEXT NOT NULL CHECK (ownership IN ('central_government','state_government','local_government','public_private','private','trust','other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','suspended','closed')),
  official_website TEXT,
  source_snapshot_id UUID REFERENCES public.source_snapshots(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (name, institution_type)
);

CREATE TABLE public.campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT,
  city TEXT,
  postal_code TEXT,
  locality_type TEXT CHECK (locality_type IN ('rural','semi_urban','urban','metro')),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  hostel_available BOOLEAN,
  accessibility_notes TEXT NOT NULL DEFAULT '',
  source_snapshot_id UUID REFERENCES public.source_snapshots(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (institution_id, name)
);
CREATE INDEX idx_campuses_location ON public.campuses (state, district, city);

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('certificate','iti','diploma','undergraduate','postgraduate','doctoral','postdoctoral','other')),
  discipline TEXT NOT NULL,
  standard_duration_months SMALLINT NOT NULL CHECK (standard_duration_months BETWEEN 1 AND 120),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.admission_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  starts_on DATE,
  ends_on DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','closed','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.program_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  admission_cycle_id UUID NOT NULL REFERENCES public.admission_cycles(id) ON DELETE RESTRICT,
  delivery_mode TEXT NOT NULL DEFAULT 'on_campus' CHECK (delivery_mode IN ('on_campus','online','distance','hybrid')),
  seats INTEGER CHECK (seats >= 0),
  language_of_instruction TEXT[] NOT NULL DEFAULT '{}',
  recognition_status TEXT NOT NULL DEFAULT 'pending' CHECK (recognition_status IN ('pending','recognized','not_recognized','expired','not_applicable')),
  accreditation JSONB NOT NULL DEFAULT '[]',
  application_url TEXT,
  source_snapshot_id UUID REFERENCES public.source_snapshots(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE NULLS NOT DISTINCT (institution_id, campus_id, course_id, admission_cycle_id, delivery_mode)
);
CREATE INDEX idx_program_offerings_lookup ON public.program_offerings (course_id, admission_cycle_id, recognition_status);

CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  conducting_authority TEXT NOT NULL,
  category TEXT NOT NULL,
  official_url TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'national' CHECK (scope IN ('national','state','institution','international')),
  source_snapshot_id UUID REFERENCES public.source_snapshots(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.exam_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  admission_cycle_id UUID NOT NULL REFERENCES public.admission_cycles(id) ON DELETE RESTRICT,
  eligibility_rules JSONB NOT NULL DEFAULT '{}',
  application_start DATE,
  application_end DATE,
  correction_start DATE,
  correction_end DATE,
  admit_card_date DATE,
  exam_start DATE,
  exam_end DATE,
  result_date DATE,
  counselling_start DATE,
  syllabus_url TEXT,
  pattern JSONB NOT NULL DEFAULT '{}',
  reservation_rules JSONB NOT NULL DEFAULT '{}',
  source_snapshot_id UUID NOT NULL REFERENCES public.source_snapshots(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (exam_id, admission_cycle_id)
);

CREATE TABLE public.program_exam_requirements (
  program_offering_id UUID NOT NULL REFERENCES public.program_offerings(id) ON DELETE CASCADE,
  exam_cycle_id UUID NOT NULL REFERENCES public.exam_cycles(id) ON DELETE CASCADE,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('required','accepted','optional','exempted')),
  minimum_rule JSONB NOT NULL DEFAULT '{}',
  source_snapshot_id UUID NOT NULL REFERENCES public.source_snapshots(id) ON DELETE RESTRICT,
  PRIMARY KEY (program_offering_id, exam_cycle_id)
);

CREATE TABLE public.fee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_offering_id UUID NOT NULL REFERENCES public.program_offerings(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  student_category TEXT NOT NULL DEFAULT 'all',
  domicile TEXT NOT NULL DEFAULT 'all',
  gender_condition TEXT NOT NULL DEFAULT 'all',
  hostel_condition TEXT NOT NULL DEFAULT 'any' CHECK (hostel_condition IN ('any','hosteller','day_scholar')),
  currency CHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  value_status TEXT NOT NULL CHECK (value_status IN ('official','institution_published','government_published','estimated','historical','third_party','user_contributed','unverified')),
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  source_snapshot_id UUID NOT NULL REFERENCES public.source_snapshots(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (program_offering_id, academic_year, student_category, domicile, gender_condition, hostel_condition)
);

CREATE TABLE public.fee_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_schedule_id UUID NOT NULL REFERENCES public.fee_schedules(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  amount_low NUMERIC(12,2) NOT NULL CHECK (amount_low >= 0),
  amount_expected NUMERIC(12,2) NOT NULL CHECK (amount_expected >= amount_low),
  amount_high NUMERIC(12,2) NOT NULL CHECK (amount_high >= amount_expected),
  recurrence TEXT NOT NULL CHECK (recurrence IN ('one_time','annual','semester','monthly')),
  occurrences_per_year NUMERIC(5,2),
  start_year SMALLINT NOT NULL DEFAULT 1 CHECK (start_year > 0),
  end_year SMALLINT CHECK (end_year IS NULL OR end_year >= start_year),
  mandatory BOOLEAN NOT NULL,
  refundable BOOLEAN NOT NULL DEFAULT false,
  annual_escalation_rate NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (annual_escalation_rate BETWEEN 0 AND 1),
  source_snapshot_id UUID NOT NULL REFERENCES public.source_snapshots(id) ON DELETE RESTRICT,
  notes TEXT NOT NULL DEFAULT '',
  UNIQUE (fee_schedule_id, code, start_year)
);
CREATE INDEX idx_fee_components_schedule ON public.fee_components (fee_schedule_id, category);

CREATE TABLE public.location_cost_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL,
  district TEXT,
  city TEXT,
  locality_type TEXT NOT NULL CHECK (locality_type IN ('rural','semi_urban','urban','metro')),
  academic_year TEXT NOT NULL,
  rent_low NUMERIC(12,2) NOT NULL DEFAULT 0,
  rent_expected NUMERIC(12,2) NOT NULL DEFAULT 0,
  rent_high NUMERIC(12,2) NOT NULL DEFAULT 0,
  food_low NUMERIC(12,2) NOT NULL DEFAULT 0,
  food_expected NUMERIC(12,2) NOT NULL DEFAULT 0,
  food_high NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_low NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_expected NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_high NUMERIC(12,2) NOT NULL DEFAULT 0,
  utilities_low NUMERIC(12,2) NOT NULL DEFAULT 0,
  utilities_expected NUMERIC(12,2) NOT NULL DEFAULT 0,
  utilities_high NUMERIC(12,2) NOT NULL DEFAULT 0,
  source_snapshot_id UUID NOT NULL REFERENCES public.source_snapshots(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE NULLS NOT DISTINCT (state, district, city, locality_type, academic_year)
);

CREATE TABLE public.scholarship_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('central_government','state_government','institution','private','other')),
  application_url TEXT NOT NULL,
  admission_cycle_id UUID NOT NULL REFERENCES public.admission_cycles(id) ON DELETE RESTRICT,
  award_components JSONB NOT NULL DEFAULT '[]',
  renewal_conditions JSONB NOT NULL DEFAULT '{}',
  required_documents JSONB NOT NULL DEFAULT '[]',
  source_snapshot_id UUID NOT NULL REFERENCES public.source_snapshots(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (name, admission_cycle_id)
);

CREATE TABLE public.scholarship_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id UUID NOT NULL REFERENCES public.scholarship_schemes(id) ON DELETE CASCADE,
  ruleset_version TEXT NOT NULL,
  rule_expression JSONB NOT NULL,
  exclusion_expression JSONB NOT NULL DEFAULT '{}',
  source_snapshot_id UUID NOT NULL REFERENCES public.source_snapshots(id) ON DELETE RESTRICT,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (scholarship_id, ruleset_version)
);

CREATE TABLE public.recommendation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  input_fingerprint TEXT NOT NULL,
  profile_version TEXT NOT NULL,
  catalogue_version TEXT,
  rules_version TEXT,
  model_version TEXT,
  orchestration_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running','completed','degraded','failed')),
  evidence_coverage JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_recommendation_runs_student ON public.recommendation_runs (student_id, created_at DESC);

CREATE TABLE public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_run_id UUID NOT NULL REFERENCES public.recommendation_runs(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  status TEXT NOT NULL CHECK (status IN ('completed','degraded','skipped','failed')),
  evidence_count INTEGER NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  latency_ms INTEGER NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
  input_tokens INTEGER CHECK (input_tokens >= 0),
  output_tokens INTEGER CHECK (output_tokens >= 0),
  estimated_cost_inr NUMERIC(12,6) CHECK (estimated_cost_inr >= 0),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Default deny. Public reads require reviewed/published evidence. Reference
-- writes remain service-role only because no client write policy is created.
ALTER TABLE public.source_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_exam_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_cost_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY institutions_verified_read ON public.institutions FOR SELECT USING (status = 'published' AND verified_at IS NOT NULL);
CREATE POLICY campuses_verified_read ON public.campuses FOR SELECT USING (verified_at IS NOT NULL);
CREATE POLICY courses_active_read ON public.courses FOR SELECT USING (active = true);
CREATE POLICY admission_cycles_read ON public.admission_cycles FOR SELECT USING (status IN ('active','closed'));
CREATE POLICY program_offerings_verified_read ON public.program_offerings FOR SELECT USING (recognition_status = 'recognized' AND verified_at IS NOT NULL);
CREATE POLICY exams_verified_read ON public.exams FOR SELECT USING (verified_at IS NOT NULL);
CREATE POLICY exam_cycles_verified_read ON public.exam_cycles FOR SELECT USING (verified_at IS NOT NULL);
CREATE POLICY program_exam_requirements_read ON public.program_exam_requirements FOR SELECT USING (EXISTS (SELECT 1 FROM public.program_offerings p WHERE p.id = program_offering_id AND p.verified_at IS NOT NULL));
CREATE POLICY fee_schedules_verified_read ON public.fee_schedules FOR SELECT USING (verified_at IS NOT NULL AND value_status IN ('official','institution_published','government_published'));
CREATE POLICY fee_components_verified_read ON public.fee_components FOR SELECT USING (EXISTS (SELECT 1 FROM public.fee_schedules f WHERE f.id = fee_schedule_id AND f.verified_at IS NOT NULL AND f.value_status IN ('official','institution_published','government_published')));
CREATE POLICY location_cost_profiles_verified_read ON public.location_cost_profiles FOR SELECT USING (verified_at IS NOT NULL);
CREATE POLICY scholarship_schemes_verified_read ON public.scholarship_schemes FOR SELECT USING (verified_at IS NOT NULL);
CREATE POLICY scholarship_rules_verified_read ON public.scholarship_rules FOR SELECT USING (EXISTS (SELECT 1 FROM public.scholarship_schemes s WHERE s.id = scholarship_id AND s.verified_at IS NOT NULL));
CREATE POLICY recommendation_runs_owner_read ON public.recommendation_runs FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY agent_runs_owner_read ON public.agent_runs FOR SELECT USING (EXISTS (SELECT 1 FROM public.recommendation_runs r WHERE r.id = recommendation_run_id AND r.student_id = auth.uid()));

COMMIT;
