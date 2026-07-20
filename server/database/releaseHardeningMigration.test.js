import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const migrationUrl = new URL('../../supabase/migrations/202607200003_release_hardening.sql', import.meta.url)

test('release hardening makes guidance server-managed and bootstraps auth profiles', async () => {
  const sql = await readFile(migrationUrl, 'utf8')

  assert.match(sql, /DROP POLICY IF EXISTS "guidance_self_rw" ON public\.guidance_results;/i)
  assert.match(sql, /CREATE POLICY "guidance_owner_read"[\s\S]*?FOR SELECT[\s\S]*?TO authenticated[\s\S]*?auth\.uid\(\) = student_id/i)
  assert.match(sql, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER[\s\S]*?FROM authenticated;/i)
  assert.doesNotMatch(sql, /CREATE POLICY[^;]+ON public\.guidance_results[^;]+FOR (?:INSERT|UPDATE|DELETE|ALL)/i)

  assert.match(sql, /ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''/i)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.bootstrap_student_profile_from_auth\(\)/i)
  assert.match(sql, /SECURITY DEFINER[\s\S]*?SET search_path = public, pg_temp/i)
  assert.match(sql, /VALUES \(NEW\.id, COALESCE\(NEW\.email, ''\), 'student'\)/i)
  assert.match(sql, /ON CONFLICT \(id\) DO UPDATE[\s\S]*?SET email = EXCLUDED\.email/i)
  assert.match(sql, /CREATE TRIGGER trg_bootstrap_student_profile_from_auth[\s\S]*?ON auth\.users/i)
  assert.match(sql, /INSERT INTO public\.students \(id, email, role\)[\s\S]*?FROM auth\.users/i)
})

test('release hardening constrains mentor review and answer attribution', async () => {
  const sql = await readFile(migrationUrl, 'utf8')

  assert.match(sql, /ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ/i)
  assert.match(sql, /ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth\.users\(id\) ON DELETE SET NULL/i)
  assert.match(sql, /CHECK \(status IN \('pending', 'approved', 'rejected'\)\)/i)
  assert.match(sql, /idx_mentor_applications_review_queue/i)

  assert.match(sql, /CREATE POLICY "qa_posts_verified_mentor_update"[\s\S]*?qa_posts\.mentor_id IS NULL OR qa_posts\.mentor_id = m\.id/i)
  assert.match(sql, /WITH CHECK \([\s\S]*?qa_posts\.mentor_id = m\.id/i)
  assert.match(sql, /answers must be attributed to the authenticated verified mentor/i)
})

test('release hardening requires reviewed evidence through public read chains', async () => {
  const sql = await readFile(migrationUrl, 'utf8')
  const policies = [
    'source_registry_active_read',
    'source_snapshots_verified_read',
    'institutions_verified_read',
    'campuses_verified_read',
    'courses_active_read',
    'admission_cycles_read',
    'program_offerings_verified_read',
    'exams_verified_read',
    'exam_cycles_verified_read',
    'program_exam_requirements_read',
    'fee_schedules_verified_read',
    'fee_components_verified_read',
    'location_cost_profiles_verified_read',
    'scholarship_schemes_verified_read',
    'scholarship_rules_verified_read',
  ]

  for (const policy of policies) {
    assert.match(sql, new RegExp(`CREATE POLICY ${policy}\\b`, 'i'), `${policy} must be recreated`)
  }

  assert.match(sql, /verification_status = 'verified'/i)
  assert.match(sql, /status = 'published'/i)
  assert.match(sql, /recognition_status = 'recognized'/i)
  assert.match(sql, /value_status IN \('official', 'institution_published', 'government_published'\)/i)
  assert.match(sql, /valid_from IS NULL OR valid_from <= CURRENT_DATE/i)
  assert.match(sql, /valid_to IS NULL OR valid_to >= CURRENT_DATE/i)
})
