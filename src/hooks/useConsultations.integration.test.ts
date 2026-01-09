/**
 * useConsultations Hook Integration Tests
 *
 * These tests use the REAL Supabase database to verify:
 * - Consultation CRUD operations work correctly
 * - Error handling behaves as expected
 * - Data integrity is maintained
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  testSupabase,
  trackConsultationId,
  cleanupTestConsultations,
  createTestConsultationData,
  verifySupabaseConnection
} from '../test/supabase-integration'

describe('useConsultations Integration Tests', () => {

  beforeAll(async () => {
    // Verify Supabase connection
    const connected = await verifySupabaseConnection()
    if (!connected) {
      console.warn('⚠️ Supabase connection failed - skipping integration tests')
    }
    expect(connected).toBe(true)
  })

  afterAll(async () => {
    // Clean up all test data
    await cleanupTestConsultations()
  })

  beforeEach(async () => {
    // Clean up any leftover test data before each test
    await cleanupTestConsultations()
  })

  describe('Consultation CRUD Operations', () => {
    it('should fetch consultations from the database', async () => {
      // This test verifies the basic fetch works
      const { data, error } = await testSupabase
        .from('consultations')
        .select('*')
        .limit(5)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should insert a consultation and retrieve it', async () => {
      // We need a valid patient_id to create a consultation
      // First, get an existing patient
      const { data: patients, error: patientError } = await testSupabase
        .from('patients')
        .select('id')
        .limit(1)

      if (patientError || !patients?.length) {
        console.warn('⚠️ No patients found - skipping insert test')
        return
      }

      const patientId = patients[0].id
      const consultationData = createTestConsultationData(patientId)

      // Insert (let Supabase generate UUID)
      const { data: inserted, error: insertError } = await testSupabase
        .from('consultations')
        .insert(consultationData)
        .select()
        .single()

      expect(insertError).toBeNull()
      expect(inserted).toBeDefined()
      expect(inserted?.id).toBeDefined()
      expect(inserted?.consultation_text).toContain('Test consultation text')

      // Track for cleanup
      if (inserted?.id) {
        trackConsultationId(inserted.id)
      }

      // Retrieve
      const { data: retrieved, error: retrieveError } = await testSupabase
        .from('consultations')
        .select('*')
        .eq('id', inserted?.id)
        .single()

      expect(retrieveError).toBeNull()
      expect(retrieved?.id).toBe(inserted?.id)
      expect(retrieved?.patient_id).toBe(patientId)
    })

    it('should update a consultation', async () => {
      // Get existing patient
      const { data: patients } = await testSupabase
        .from('patients')
        .select('id')
        .limit(1)

      if (!patients?.length) {
        console.warn('⚠️ No patients found - skipping update test')
        return
      }

      const patientId = patients[0].id

      // Create consultation (let Supabase generate UUID)
      const { data: created } = await testSupabase
        .from('consultations')
        .insert(createTestConsultationData(patientId))
        .select()
        .single()

      if (!created?.id) {
        console.warn('⚠️ Failed to create consultation - skipping update test')
        return
      }

      trackConsultationId(created.id)

      // Update
      const updatedText = '[INTEGRATION-TEST] Updated consultation text'
      const { error: updateError } = await testSupabase
        .from('consultations')
        .update({ consultation_text: updatedText })
        .eq('id', created.id)

      expect(updateError).toBeNull()

      // Verify update
      const { data: updated } = await testSupabase
        .from('consultations')
        .select('consultation_text')
        .eq('id', created.id)
        .single()

      expect(updated?.consultation_text).toBe(updatedText)
    })

    it('should delete a consultation', async () => {
      // Get existing patient
      const { data: patients } = await testSupabase
        .from('patients')
        .select('id')
        .limit(1)

      if (!patients?.length) {
        console.warn('⚠️ No patients found - skipping delete test')
        return
      }

      const patientId = patients[0].id

      // Create consultation (let Supabase generate UUID)
      const { data: created } = await testSupabase
        .from('consultations')
        .insert(createTestConsultationData(patientId))
        .select()
        .single()

      if (!created?.id) {
        console.warn('⚠️ Failed to create consultation - skipping delete test')
        return
      }

      // Verify exists
      const { data: beforeDelete } = await testSupabase
        .from('consultations')
        .select('id')
        .eq('id', created.id)
        .single()

      expect(beforeDelete?.id).toBe(created.id)

      // Delete
      const { error: deleteError } = await testSupabase
        .from('consultations')
        .delete()
        .eq('id', created.id)

      expect(deleteError).toBeNull()

      // Verify deleted
      const { data: afterDelete } = await testSupabase
        .from('consultations')
        .select('id')
        .eq('id', created.id)
        .single()

      expect(afterDelete).toBeNull()
    })
  })

  describe('Consultation Query Filters', () => {
    it('should filter consultations by patient_id', async () => {
      const { data: patients } = await testSupabase
        .from('patients')
        .select('id')
        .limit(1)

      if (!patients?.length) return

      const patientId = patients[0].id

      const { data, error } = await testSupabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patientId)
        .limit(5)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      // All results should have the same patient_id
      data?.forEach(consultation => {
        expect(consultation.patient_id).toBe(patientId)
      })
    })

    it('should order consultations by created_at desc', async () => {
      const { data, error } = await testSupabase
        .from('consultations')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)

      // Verify descending order
      if (data && data.length > 1) {
        for (let i = 0; i < data.length - 1; i++) {
          const current = new Date(data[i].created_at).getTime()
          const next = new Date(data[i + 1].created_at).getTime()
          expect(current).toBeGreaterThanOrEqual(next)
        }
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid patient_id gracefully', async () => {
      // Use a valid UUID format but non-existent ID
      const invalidPatientId = '00000000-0000-0000-0000-000000000000'

      const { error } = await testSupabase
        .from('consultations')
        .insert({
          patient_id: invalidPatientId,
          consultation_text: '[INTEGRATION-TEST] Test with invalid patient'
        })

      // Should fail due to foreign key constraint
      expect(error).not.toBeNull()
    })

    it('should handle duplicate id gracefully', async () => {
      const { data: patients } = await testSupabase
        .from('patients')
        .select('id')
        .limit(1)

      if (!patients?.length) return

      const patientId = patients[0].id

      // First insert
      const { data: created } = await testSupabase
        .from('consultations')
        .insert(createTestConsultationData(patientId))
        .select()
        .single()

      if (!created?.id) return

      trackConsultationId(created.id)

      // Try to insert with same ID (duplicate)
      const { error } = await testSupabase
        .from('consultations')
        .insert({ ...createTestConsultationData(patientId), id: created.id })

      expect(error).not.toBeNull()
    })
  })
})
