/**
 * Supabase Integration Test Utilities
 *
 * These utilities enable real Supabase integration tests.
 * Integration tests use the actual Supabase database (not mocks).
 *
 * IMPORTANT: Run integration tests separately from unit tests:
 *   npm run test:integration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Use HARDCODED real Supabase credentials for integration tests
// This bypasses MSW and vi.stubEnv from the test setup
const SUPABASE_URL = 'https://ngkmhrckbybqghzfyorp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na21ocmNrYnlicWdoemZ5b3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5OTEyODYsImV4cCI6MjA4MDU2NzI4Nn0.MEPLXp3Hm6QhZtL7T_qdfOkDJ_eGj3NoOaj28PiJPf4'

// Create a test-specific Supabase client
export const testSupabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Test data marker for easy identification and cleanup
const TEST_MARKER = '[INTEGRATION-TEST]'

// Track created consultation IDs for cleanup
const createdConsultationIds: string[] = []

/**
 * Track a consultation ID for cleanup
 */
export function trackConsultationId(id: string): void {
  createdConsultationIds.push(id)
}

/**
 * Check if consultation text is test data
 */
export function isTestData(text: string): boolean {
  return text.includes(TEST_MARKER)
}

/**
 * Clean up test consultations by tracked IDs
 */
export async function cleanupTestConsultations(): Promise<void> {
  // Clean up by tracked IDs
  if (createdConsultationIds.length > 0) {
    const { error } = await testSupabase
      .from('consultations')
      .delete()
      .in('id', createdConsultationIds)

    if (error) {
      console.warn('Failed to cleanup test consultations by ID:', error.message)
    }
    // Clear the tracked IDs
    createdConsultationIds.length = 0
  }

  // Also clean up any consultations with the test marker in consultation_text
  const { error: markerError } = await testSupabase
    .from('consultations')
    .delete()
    .like('consultation_text', `%${TEST_MARKER}%`)

  if (markerError) {
    console.warn('Failed to cleanup test consultations by marker:', markerError.message)
  }
}

/**
 * Clean up test patients (not typically needed as we use existing patients)
 */
export async function cleanupTestPatients(): Promise<void> {
  // We don't create test patients - we use existing ones
  // This is a no-op but kept for API compatibility
}

/**
 * Clean up all test data
 */
export async function cleanupAllTestData(): Promise<void> {
  // Clean up in order of dependencies (consultations before patients)
  await cleanupTestConsultations()
  await cleanupTestPatients()
}

/**
 * Create test patient data (for reference - we typically use existing patients)
 */
export function createTestPatientData(overrides: Record<string, unknown> = {}) {
  return {
    // Don't set id - let Supabase generate UUID
    name: `${TEST_MARKER} Test Patient`,
    sex: 'female' as const,
    date_of_birth: '1990-01-15',
    allergies: null,
    current_medications: null,
    current_conditions: null,
    email: null,
    phone: null,
    archived: false,
    ...overrides
  }
}

/**
 * Create test consultation data
 * Note: Don't set id - let Supabase generate UUID
 */
export function createTestConsultationData(patientId: string, overrides: Record<string, unknown> = {}) {
  return {
    // Don't set id - let Supabase generate UUID
    patient_id: patientId,
    appointment_id: null,
    consultation_text: `${TEST_MARKER} Test consultation text`,
    original_transcript: `${TEST_MARKER} Test original transcript`,
    transcription_language: 'en',
    transcription_status: 'completed' as const,
    patient_snapshot: {
      name: 'Test Patient',
      age: '34 years',
      sex: 'female'
    },
    ...overrides
  }
}

/**
 * Wait for a condition with timeout
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<boolean> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  return false
}

/**
 * Verify Supabase connection is working
 */
export async function verifySupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await testSupabase.from('patients').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}
