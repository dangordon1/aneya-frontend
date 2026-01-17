/**
 * Contract Tests for /api/patient-medications
 *
 * Validates that frontend types match backend Pydantic schemas.
 */

import { describe, it, expect } from 'vitest'

// Import from generated schemas
import {
  PatientMedicationCreate,
  PatientMedicationResponse,
} from '../__generated__/schemas'

describe('Patient Medications Contract', () => {
  describe('POST /api/patient-medications request body', () => {
    it('should accept valid medication input with all fields', () => {
      const validInput = {
        patient_id: 'patient-123',
        medication_name: 'Metformin',
        dosage: '500mg',
        frequency: 'BD',
        route: 'oral',
        started_date: '2024-01-01',
        stopped_date: null,
        status: 'active',
        appointment_id: 'apt-456',
        indication: 'Type 2 Diabetes',
        notes: 'Take with meals',
      }

      const result = PatientMedicationCreate.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should accept minimal medication input', () => {
      const minimalInput = {
        patient_id: 'patient-123',
        medication_name: 'Paracetamol',
        dosage: '500mg',
        frequency: 'QDS PRN',
      }

      const result = PatientMedicationCreate.safeParse(minimalInput)
      expect(result.success).toBe(true)
    })

    it('should reject missing required fields', () => {
      const invalidInput = {
        patient_id: 'patient-123',
        medication_name: 'Metformin',
        // missing dosage and frequency
      }

      const result = PatientMedicationCreate.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should accept different medication statuses', () => {
      const statuses = ['active', 'stopped', 'completed']

      for (const status of statuses) {
        const input = {
          patient_id: 'patient-123',
          medication_name: 'Test Drug',
          dosage: '10mg',
          frequency: 'OD',
          status: status,
        }

        const result = PatientMedicationCreate.safeParse(input)
        expect(result.success).toBe(true)
      }
    })

    it('should default status to active', () => {
      const inputWithoutStatus = {
        patient_id: 'patient-123',
        medication_name: 'Aspirin',
        dosage: '75mg',
        frequency: 'OD',
      }

      const result = PatientMedicationCreate.safeParse(inputWithoutStatus)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('active')
      }
    })
  })

  describe('GET /api/patient-medications response body', () => {
    it('should validate complete medication response', () => {
      const mockResponse = {
        id: 'med-123',
        patient_id: 'patient-123',
        medication_name: 'Metformin',
        dosage: '500mg',
        frequency: 'BD',
        route: 'oral',
        started_date: '2024-01-01',
        stopped_date: null,
        status: 'active',
        appointment_id: 'apt-456',
        indication: 'Type 2 Diabetes',
        notes: 'Take with meals',
        prescribed_by: 'doctor-789',
        prescribed_at: '2024-01-01T09:00:00Z',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      }

      const result = PatientMedicationResponse.safeParse(mockResponse)
      expect(result.success).toBe(true)
    })

    it('should require mandatory response fields', () => {
      const incompleteResponse = {
        id: 'med-123',
        medication_name: 'Metformin',
        // missing patient_id, dosage, frequency, created_at, updated_at
      }

      const result = PatientMedicationResponse.safeParse(incompleteResponse)
      expect(result.success).toBe(false)
    })
  })
})
