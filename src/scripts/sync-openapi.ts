/**
 * OpenAPI Schema Sync Script
 *
 * Fetches the OpenAPI schema from the backend and generates Zod schemas.
 * Run with: npx tsx src/scripts/sync-openapi.ts
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BACKEND_URL = process.env.BACKEND_URL || 'https://aneya-backend-xao3xivzia-el.a.run.app'
const OUTPUT_DIR = path.join(__dirname, '../contracts/__generated__')

// Schemas we want to export (ones used in contract tests)
const SCHEMAS_TO_EXPORT = [
  'PatientVitalsCreate',
  'PatientVitalsResponse',
  'PatientMedicationCreate',
  'PatientMedicationResponse',
  'PatientAllergyCreate',
  'PatientAllergyResponse',
  'PatientConditionCreate',
  'PatientConditionResponse',
  'PatientLabResultCreate',
  'PatientLabResultResponse',
  'AnalysisRequest',
  'HealthResponse',
  'FeedbackSubmitRequest',
  'FeedbackResponse',
  'StructureSymptomRequest',
  'SendInvitationEmailRequest',
  'SpeakerRoleRequest',
  'RerunTranscriptionRequest',
  'OBGYNFormCreateRequest',
  'OBGYNFormResponse',
  'OBGYNFormUpdateRequest',
  'DetermineConsultationTypeRequest',
  'DetermineConsultationTypeResponse',
  'ExtractFormFieldsRequest',
  'ExtractFormFieldsResponse',
  'AutoFillConsultationFormRequest',
  'AutoFillConsultationFormResponse',
]

async function main() {
  console.log(`Fetching OpenAPI schema from ${BACKEND_URL}/openapi.json...`)

  // 1. Fetch OpenAPI schema
  const response = await fetch(`${BACKEND_URL}/openapi.json`)

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI schema: ${response.status} ${response.statusText}`)
  }

  const schema = await response.json()

  // 2. Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // 3. Write schema to file
  const schemaPath = path.join(OUTPUT_DIR, 'openapi.schema.json')
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2))
  console.log(`Written OpenAPI schema to ${schemaPath}`)

  // 4. Generate Zod schemas using openapi-zod-client
  const outputPath = path.join(OUTPUT_DIR, 'schemas.ts')
  console.log('Generating Zod schemas...')

  try {
    execSync(
      `npx openapi-zod-client "${schemaPath}" -o "${outputPath}" --export-schemas`,
      { stdio: 'inherit', cwd: path.join(__dirname, '../..') }
    )
    console.log(`Generated Zod schemas at ${outputPath}`)
  } catch (error) {
    console.error('Failed to generate Zod schemas:', error)
    throw error
  }

  // 5. Post-process to add exports for individual schemas
  console.log('Adding schema exports...')
  let content = fs.readFileSync(outputPath, 'utf-8')

  // Add export to specific schema definitions
  for (const schemaName of SCHEMAS_TO_EXPORT) {
    const pattern = new RegExp(`^const ${schemaName} = `, 'm')
    if (pattern.test(content)) {
      content = content.replace(pattern, `export const ${schemaName} = `)
    }
  }

  fs.writeFileSync(outputPath, content)
  console.log('Added exports for schema constants')

  console.log('OpenAPI schemas synced successfully!')
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
