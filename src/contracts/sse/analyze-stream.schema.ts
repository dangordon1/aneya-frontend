/**
 * SSE Event Schemas for /api/analyze-stream
 *
 * These schemas define the contract for Server-Sent Events from the analysis endpoint.
 * SSE events are not captured in OpenAPI, so they must be defined manually.
 */

import { z } from 'zod'

// Location detection event
export const LocationEventSchema = z.object({
  country: z.string(),
  country_code: z.string().optional(),
  detected: z.boolean().optional(),
})

// Guideline search progress event
export const GuidelineSearchEventSchema = z.object({
  source: z.string(), // e.g., 'NICE', 'BNF', 'PubMed'
  status: z.enum(['searching', 'complete', 'error']).optional(),
})

// Primary care recommendation structure
export const PrimaryCareSchema = z.object({
  medications: z.array(z.string()).optional(),
  supportive_care: z.array(z.string()).optional(),
  when_to_escalate: z.array(z.string()).optional(),
})

// Individual diagnosis structure
export const DiagnosisSchema = z.object({
  diagnosis: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  source: z.string().optional(),
  summary: z.string().optional(),
  primary_care: PrimaryCareSchema.optional(),
})

// Diagnoses event - sent when primary diagnoses are ready
export const DiagnosesEventSchema = z.object({
  diagnoses: z.array(DiagnosisSchema),
  drugs_pending: z.array(z.string()),
})

// BNF drug data structure
export const BNFDataSchema = z.object({
  drug_name: z.string(),
  url: z.string(),
  success: z.boolean(),
  dosage: z.string().optional(),
  side_effects: z.string().optional(),
  interactions: z.string().optional(),
  contraindications: z.string().optional(),
  cautions: z.string().optional(),
  pregnancy: z.string().optional(),
  breast_feeding: z.string().optional(),
  hepatic_impairment: z.string().optional(),
  renal_impairment: z.string().optional(),
})

// DrugBank data structure
export const DrugBankDataSchema = z.object({
  drug_name: z.string(),
  drugbank_id: z.string(),
  url: z.string(),
  success: z.boolean(),
  dosage: z.string().optional(),
  side_effects: z.string().optional(),
  interactions: z.string().optional(),
})

// Drug details structure
export const DrugDetailsSchema = z.object({
  drug_name: z.string(),
  bnf_data: BNFDataSchema.nullable().optional(),
  drugbank_data: DrugBankDataSchema.nullable().optional(),
  url: z.string().optional(),
})

// Drug update event - sent for each drug as details are fetched
export const DrugUpdateEventSchema = z.object({
  drug_name: z.string(),
  status: z.enum(['pending', 'complete', 'failed']),
  source: z.enum(['bnf', 'drugbank', 'llm', 'unknown']).optional(),
  details: DrugDetailsSchema.optional(),
})

// BNF drug event (legacy format)
export const BNFDrugEventSchema = z.object({
  medication: z.string(),
  status: z.string(),
})

// Complete event - sent when analysis is finished
export const CompleteEventSchema = z.object({
  success: z.boolean().optional(),
  diagnoses: z.array(DiagnosisSchema).optional(),
  drugs: z.array(DrugDetailsSchema).optional(),
})

// Error types
export const ErrorTypeSchema = z.enum([
  'invalid_input',
  'anthropic_credits',
  'anthropic_api',
  'max_tokens',
  'error',
  'other',
])

// Error event
export const ErrorEventSchema = z.object({
  type: ErrorTypeSchema,
  message: z.string(),
})

// Union of all possible SSE event data types
export const AnalyzeStreamEventDataSchema = z.union([
  LocationEventSchema,
  GuidelineSearchEventSchema,
  DiagnosesEventSchema,
  DrugUpdateEventSchema,
  BNFDrugEventSchema,
  CompleteEventSchema,
  ErrorEventSchema,
])

// Inferred TypeScript types
export type LocationEvent = z.infer<typeof LocationEventSchema>
export type GuidelineSearchEvent = z.infer<typeof GuidelineSearchEventSchema>
export type PrimaryCare = z.infer<typeof PrimaryCareSchema>
export type Diagnosis = z.infer<typeof DiagnosisSchema>
export type DiagnosesEvent = z.infer<typeof DiagnosesEventSchema>
export type BNFData = z.infer<typeof BNFDataSchema>
export type DrugBankData = z.infer<typeof DrugBankDataSchema>
export type DrugDetails = z.infer<typeof DrugDetailsSchema>
export type DrugUpdateEvent = z.infer<typeof DrugUpdateEventSchema>
export type BNFDrugEvent = z.infer<typeof BNFDrugEventSchema>
export type CompleteEvent = z.infer<typeof CompleteEventSchema>
export type ErrorType = z.infer<typeof ErrorTypeSchema>
export type ErrorEvent = z.infer<typeof ErrorEventSchema>
export type AnalyzeStreamEventData = z.infer<typeof AnalyzeStreamEventDataSchema>
