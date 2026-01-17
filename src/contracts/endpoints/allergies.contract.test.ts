/**
 * Contract Tests for /api/patient-allergies
 *
 * Validates that frontend types match backend Pydantic schemas.
 */

import { describe, it, expect } from 'vitest'

// Import from generated schemas
import {
  PatientAllergyCreate,
  PatientAllergyResponse,
} from '../__generated__/schemas'

describe('Patient Allergies Contract', () => {
  describe('POST /api/patient-allergies request body', () => {
    it('should accept valid allergy input with all fields', () => {
      const validInput = {
        patient_id: 'patient-123',
        allergen: 'Penicillin',
        allergen_category: 'medication',
        reaction: 'Skin rash and hives',
        severity: 'moderate',
        onset_date: '2020-05-15',
        status: 'active',
        notes: 'Confirmed by allergy testing',
      }

      const result = PatientAllergyCreate.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should accept minimal allergy input', () => {
      const minimalInput = {
        patient_id: 'patient-123',
        allergen: 'Peanuts',
      }

      const result = PatientAllergyCreate.safeParse(minimalInput)
      expect(result.success).toBe(true)
    })

    it('should reject missing required fields', () => {
      const invalidInput = {
        allergen_category: 'food',
        reaction: 'Anaphylaxis',
      }

      const result = PatientAllergyCreate.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should accept different allergen categories', () => {
      const categories = ['medication', 'food', 'environmental', 'other']

      for (const category of categories) {
        const input = {
          patient_id: 'patient-123',
          allergen: 'Test allergen',
          allergen_category: category,
        }

        const result = PatientAllergyCreate.safeParse(input)
        expect(result.success).toBe(true)
      }
    })

    it('should accept different severity levels', () => {
      const severities = ['mild', 'moderate', 'severe', 'unknown']

      for (const severity of severities) {
        const input = {
          patient_id: 'patient-123',
          allergen: 'Test allergen',
          severity: severity,
        }

        const result = PatientAllergyCreate.safeParse(input)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('GET /api/patient-allergies response body', () => {
    it('should validate complete allergy response', () => {
      const mockResponse = {
        id: 'allergy-123',
        patient_id: 'patient-123',
        allergen: 'Penicillin',
        allergen_category: 'medication',
        reaction: 'Skin rash',
        severity: 'moderate',
        onset_date: '2020-05-15',
        status: 'active',
        notes: 'Confirmed',
        recorded_by: 'doctor-456',
        recorded_at: '2024-01-15T10:30:00Z',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      }

      const result = PatientAllergyResponse.safeParse(mockResponse)
      expect(result.success).toBe(true)
    })

    it('should require mandatory response fields', () => {
      const incompleteResponse = {
        id: 'allergy-123',
        allergen: 'Penicillin',
        // missing patient_id, created_at, updated_at
      }

      const result = PatientAllergyResponse.safeParse(incompleteResponse)
      expect(result.success).toBe(false)
    })
  })

  describe('PUT /api/patient-allergies/:id request body', () => {
    it('should accept partial update with only status', () => {
      const partialUpdate = {
        patient_id: 'patient-123',
        allergen: 'Penicillin',
        status: 'resolved',
      }

      // PUT uses the same schema as POST in this API
      const result = PatientAllergyCreate.safeParse(partialUpdate)
      expect(result.success).toBe(true)
    })
  })
})
