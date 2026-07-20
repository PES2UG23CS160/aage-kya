-- Version the guidance cache and retain the evidence/agent trace shown to the
-- student. Apply after 202607200001_platform_core.sql.

BEGIN;

ALTER TABLE public.guidance_results
  ADD COLUMN IF NOT EXISTS pipeline_version TEXT,
  ADD COLUMN IF NOT EXISTS grounded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS colleges_data JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scholarship_data JSONB,
  ADD COLUMN IF NOT EXISTS agent_trace JSONB,
  ADD COLUMN IF NOT EXISTS decision_context JSONB;

CREATE INDEX IF NOT EXISTS idx_guidance_results_versioned_input
  ON public.guidance_results (student_id, pipeline_version, input_fingerprint, created_at DESC);

COMMIT;
