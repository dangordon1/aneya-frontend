/**
 * Contract Tests for /api/patient-vitals
 *
 * Validates that frontend types match backend Pydantic schemas.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Import from generated schemas
import {
  PatientVitalsCreate,
  PatientVitalsResponse,
} from '../__generated__/schemas'

describe('Patient Vitals Contract', () => {
  describe('POST /api/patient-vitals request body', () => {
    it('should accept valid vitals input with all fields', () => {
      const validInput = {
        patient_id: 'patient-123',
        appointment_id: 'apt-456',
        consultation_form_id: 'form-789',
        consultation_form_type: 'antenatal',
        systolic_bp: 120,
        diastolic_bp: 80,
        heart_rate: 72,
        respiratory_rate: 16,
        temperature_celsius: 36.8,
        spo2: 98,
        blood_glucose_mg_dl: 95,
        weight_kg: 65.5,
        height_cm: 165,
        notes: 'Patient feeling well',
        source_form_status: 'completed',
      }

      const result = PatientVitalsCreate.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should accept minimal vitals input with only patient_id', () => {
      const minimalInput = {
        patient_id: 'patient-123',
      }

      const result = PatientVitalsCreate.safeParse(minimalInput)
      expect(result.success).toBe(true)
    })

    it('should reject missing patient_id', () => {
      const invalidInput = {
        systolic_bp: 120,
        diastolic_bp: 80,
      }

      const result = PatientVitalsCreate.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should accept null for optional fields', () => {
      const inputWithNulls = {
        patient_id: 'patient-123',
        systolic_bp: null,
        diastolic_bp: null,
        notes: null,
      }

      const result = PatientVitalsCreate.safeParse(inputWithNulls)
      expect(result.success).toBe(true)
    })
  })

  describe('GET /api/patient-vitals response body', () => {
    it('should validate complete vitals response', () => {
      const mockResponse = {
        id: 'vitals-123',
        patient_id: 'patient-123',
        recorded_at: '2024-01-15T10:30:00Z',
        recorded_by: 'doctor-456',
        appointment_id: 'apt-789',
        systolic_bp: 120,
        diastolic_bp: 80,
        heart_rate: 72,
        respiratory_rate: 16,
        temperature_celsius: 36.8,
        spo2: 98,
        blood_glucose_mg_dl: 95,
        weight_kg: 65.5,
        height_cm: 165,
        bmi: 24.1,
        notes: 'Patient feeling well',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      }

      const result = PatientVitalsResponse.safeParse(mockResponse)
      expect(result.success).toBe(true)
    })

    it('should require mandatory response fields', () => {
      const incompleteResponse = {
        id: 'vitals-123',
        // missing patient_id, recorded_at, created_at, updated_at
      }

      const result = PatientVitalsResponse.safeParse(incompleteResponse)
      expect(result.success).toBe(false)
    })

    it('should validate BMI as computed field', () => {
      const responseWithBMI = {
        id: 'vitals-123',
        patient_id: 'patient-123',
        recorded_at: '2024-01-15T10:30:00Z',
        weight_kg: 70,
        height_cm: 175,
        bmi: 22.86, // Computed: 70 / (1.75)^2
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      }

      const result = PatientVitalsResponse.safeParse(responseWithBMI)
      expect(result.success).toBe(true)
    })
  })
})
