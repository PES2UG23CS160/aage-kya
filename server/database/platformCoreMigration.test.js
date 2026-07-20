import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationPath = path.resolve(here, '../../supabase/migrations/202607200001_platform_core.sql')

test('platform core migration covers every evidence and decision domain with RLS', async () => {
  const sql = await readFile(migrationPath, 'utf8')
  const tables = [
    'source_registry', 'source_snapshots', 'institutions', 'campuses', 'courses',
    'admission_cycles', 'program_offerings', 'exams', 'exam_cycles',
    'program_exam_requirements', 'fee_schedules', 'fee_components',
    'location_cost_profiles', 'scholarship_schemes', 'scholarship_rules',
    'recommendation_runs', 'agent_runs',
  ]

  for (const table of tables) {
    assert.match(sql, new RegExp(`CREATE TABLE public\\.${table}\\b`), `${table} must be created`)
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`), `${table} must enable RLS`)
  }

  assert.match(sql, /amount_low NUMERIC/)
  assert.match(sql, /amount_expected NUMERIC/)
  assert.match(sql, /amount_high NUMERIC/)
  assert.match(sql, /content_sha256 TEXT NOT NULL/)
  assert.match(sql, /orchestration_version TEXT NOT NULL/)
  assert.doesNotMatch(sql, /CREATE POLICY .* FOR (INSERT|UPDATE|DELETE)/, 'reference writes must remain backend-only')
})
