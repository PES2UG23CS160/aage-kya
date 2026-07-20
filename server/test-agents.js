import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { runMultiAgentOrchestrator } from './agents/Orchestrator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env'), override: true })

const mockFormData = {
  fullName: 'John Doe',
  board: 'CBSE',
  marks: '85',
  state: 'Karnataka',
  stream: 'Science (PCM)',
  classLevel: 'class12',
  incomeRange: '2.5L-5L',
  firstGenCollege: false,
  preferredState: 'Karnataka',
  preferredCity: 'Bengaluru',
  budget: '2L',
  interests: 'Coding and building games',
  biggestFear: 'High fee structure',
  preferredModeOfAdmission: 'KCET'
}

async function test() {
  console.log('Testing Multi-Agent Orchestrator...')
  try {
    const result = await runMultiAgentOrchestrator(mockFormData)
    console.log('SUCCESS!')
    console.log('Summary:', result.summary)
    console.log('Options:', result.options)
    console.log('Explainability Steps:', result.explainability.steps)
  } catch (err) {
    console.error('FAILED:', err.message)
    process.exit(1)
  }
}

test()
