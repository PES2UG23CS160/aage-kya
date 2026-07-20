import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('guidance cache migration retains versioned agent and evidence context', async () => {
  const sql = await readFile(new URL('../../supabase/migrations/202607200002_guidance_trace_cache.sql', import.meta.url), 'utf8')
  for (const field of ['pipeline_version', 'grounded', 'colleges_data', 'scholarship_data', 'agent_trace', 'decision_context']) {
    assert.match(sql, new RegExp(`ADD COLUMN IF NOT EXISTS ${field}`, 'i'))
  }
  assert.match(sql, /idx_guidance_results_versioned_input/i)
})
