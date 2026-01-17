/**
 * Contract Tests for /api/analyze-stream SSE Events
 *
 * Validates that frontend handles all SSE event types correctly.
 */

import { describe, it, expect } from 'vitest'

import {
  LocationEventSchema,
  GuidelineSearchEventSchema,
  DiagnosisSchema,
  DiagnosesEventSchema,
  DrugUpdateEventSchema,
  DrugDetailsSchema,
  BNFDataSchema,
  DrugBankDataSchema,
  CompleteEventSchema,
  ErrorEventSchema,
  ErrorTypeSchema,
} from '../sse/analyze-stream.schema'

describe('Analyze Stream SSE Contract', () => {
  describe('location event', () => {
    it('should validate location event from backend', () => {
      const mockEvent = {
        country: 'United Kingdom',
        country_code: 'GB',
        detected: true,
      }

      const result = LocationEventSchema.safeParse(mockEvent)
      expect(result.success).toBe(true)
    })

    it('should accept minimal location event', () => {
      const minimalEvent = {
        country: 'India',
      }

      const result = LocationEventSchema.safeParse(minimalEvent)
      expect(result.success).toBe(true)
    })
  })

  describe('guideline_search event', () => {
    it('should validate guideline search progress', () => {
      const mockEvent = {
        source: 'NICE',
        status: 'searching',
      }

      const result = GuidelineSearchEventSchema.safeParse(mockEvent)
      expect(result.success).toBe(true)
    })

    it('should accept different guideline sources', () => {
      const sources = ['NICE', 'BNF', 'PubMed', 'WHO']

      for (const source of sources) {
        const event = { source, status: 'complete' }
        const result = GuidelineSearchEventSchema.safeParse(event)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('diagnoses event', () => {
    it('should validate diagnoses with pending drugs', () => {
      const mockEvent = {
        diagnoses: [
          {
            diagnosis: 'Tension-type headache',
            confidence: 'high',
            source: 'NICE Guidelines',
            summary: 'Primary tension-type headache based on clinical presentation',
            primary_care: {
              medications: ['Paracetamol 1g QDS PRN', 'Ibuprofen 400mg TDS PRN'],
              supportive_care: ['Rest', 'Stress management'],
              when_to_escalate: ['Persistent headache > 2 weeks', 'Neurological symptoms'],
            },
          },
        ],
        drugs_pending: ['Paracetamol', 'Ibuprofen'],
      }

      const result = DiagnosesEventSchema.safeParse(mockEvent)
      expect(result.success).toBe(true)
    })

    it('should validate all confidence levels', () => {
      const confidenceLevels = ['high', 'medium', 'low'] as const

      for (const confidence of confidenceLevels) {
        const diagnosis = {
          diagnosis: 'Test diagnosis',
          confidence,
        }
        const result = DiagnosisSchema.safeParse(diagnosis)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid confidence levels', () => {
      const invalidDiagnosis = {
        diagnosis: 'Test',
        confidence: 'very_high', // Invalid
      }

      const result = DiagnosisSchema.safeParse(invalidDiagnosis)
      expect(result.success).toBe(false)
    })

    it('should accept diagnoses without primary_care', () => {
      const diagnosis = {
        diagnosis: 'Viral URTI',
        confidence: 'medium',
        source: 'Clinical assessment',
        summary: 'Self-limiting viral infection',
      }

      const result = DiagnosisSchema.safeParse(diagnosis)
      expect(result.success).toBe(true)
    })
  })

  describe('drug_update event', () => {
    it('should validate complete drug update from BNF', () => {
      const mockEvent = {
        drug_name: 'Paracetamol',
        status: 'complete',
        source: 'bnf',
        details: {
          drug_name: 'Paracetamol',
          bnf_data: {
            drug_name: 'Paracetamol',
            url: 'https://bnf.nice.org.uk/drug/paracetamol',
            success: true,
            dosage: '500mg-1g every 4-6 hours, max 4g daily',
            side_effects: 'Rare: blood disorders, skin reactions',
            interactions: 'Warfarin: enhanced anticoagulant effect',
          },
          drugbank_data: null,
          url: 'https://bnf.nice.org.uk/drug/paracetamol',
        },
      }

      const result = DrugUpdateEventSchema.safeParse(mockEvent)
      expect(result.success).toBe(true)
    })

    it('should validate pending drug update', () => {
      const mockEvent = {
        drug_name: 'Ibuprofen',
        status: 'pending',
      }

      const result = DrugUpdateEventSchema.safeParse(mockEvent)
      expect(result.success).toBe(true)
    })

    it('should validate failed drug update', () => {
      const mockEvent = {
        drug_name: 'Unknown Drug',
        status: 'failed',
        source: 'unknown',
      }

      const result = DrugUpdateEventSchema.safeParse(mockEvent)
      expect(result.success).toBe(true)
    })

    it('should validate all drug sources', () => {
      const sources = ['bnf', 'drugbank', 'llm', 'unknown'] as const

      for (const source of sources) {
        const event = {
          drug_name: 'Test Drug',
          status: 'complete',
          source,
        }
        const result = DrugUpdateEventSchema.safeParse(event)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('BNF data structure', () => {
    it('should validate complete BNF data', () => {
      const bnfData = {
        drug_name: 'Metformin',
        url: 'https://bnf.nice.org.uk/drug/metformin',
        success: true,
        dosage: '500mg initially, titrate up',
        side_effects: 'GI upset, lactic acidosis (rare)',
        interactions: 'Contrast media: discontinue before',
        contraindications: 'Severe renal impairment',
        cautions: 'Hepatic impairment',
        pregnancy: 'Can be used in pregnancy',
        breast_feeding: 'Present in milk',
        hepatic_impairment: 'Avoid in severe impairment',
        renal_impairment: 'Reduce dose if eGFR < 45',
      }

      const result = BNFDataSchema.safeParse(bnfData)
      expect(result.success).toBe(true)
    })
  })

  describe('DrugBank data structure', () => {
    it('should validate complete DrugBank data', () => {
      const drugbankData = {
        drug_name: 'Metformin',
        drugbank_id: 'DB00331',
        url: 'https://go.drugbank.com/drugs/DB00331',
        success: true,
        dosage: '500-2000mg daily in divided doses',
        side_effects: 'Nausea, diarrhea, abdominal pain',
        interactions: 'Cationic drugs may compete for renal tubular transport',
      }

      const result = DrugBankDataSchema.safeParse(drugbankData)
      expect(result.success).toBe(true)
    })
  })

  describe('complete event', () => {
    it('should validate successful completion', () => {
      const mockEvent = {
        success: true,
        diagnoses: [
          {
            diagnosis: 'Tension headache',
            confidence: 'high',
          },
        ],
        drugs: [
          {
            drug_name: 'Paracetamol',
            bnf_data: null,
            drugbank_data: null,
          },
        ],
      }

      const result = CompleteEventSchema.safeParse(mockEvent)
      expect(result.success).toBe(true)
    })

    it('should accept empty completion', () => {
      const emptyComplete = {}

      const result = CompleteEventSchema.safeParse(emptyComplete)
      expect(result.success).toBe(true)
    })
  })

  describe('error event', () => {
    it('should validate all error types', () => {
      const errorTypes = [
        'invalid_input',
        'anthropic_credits',
        'anthropic_api',
        'max_tokens',
        'error',
        'other',
      ] as const

      for (const type of errorTypes) {
        const event = {
          type,
          message: `Error of type ${type}`,
        }
        const result = ErrorEventSchema.safeParse(event)
        expect(result.success).toBe(true)
      }
    })

    it('should validate invalid_input error', () => {
      const mockEvent = {
        type: 'invalid_input',
        message: 'Consultation text is empty or too short',
      }

      const result = ErrorEventSchema.safeParse(mockEvent)
      expect(result.success).toBe(true)
    })

    it('should validate anthropic_credits error', () => {
      const mockEvent = {
        type: 'anthropic_credits',
        message: 'API credits exhausted. Please try again later.',
      }

      const result = ErrorEventSchema.safeParse(mockEvent)
      expect(result.success).toBe(true)
    })

    it('should reject unknown error types', () => {
      const invalidEvent = {
        type: 'unknown_error_type',
        message: 'Something went wrong',
      }

      const result = ErrorEventSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })
  })
})
