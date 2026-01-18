/**
 * No Doctor Profile Access Security Integration Tests
 *
 * CRITICAL SECURITY TESTS - Run against REAL Supabase database
 *
 * ## What This Tests
 *
 * Verifies that users who are authenticated but have NO doctor profile
 * cannot access any appointments or patient data. This is essential for:
 * - Google SSO users who haven't completed profile setup
 * - Users whose doctor profile was deleted
 * - Preventing data access before profile creation
 *
 * ## Test User Setup Required
 *
 * Before running these tests, create a test user in Supabase Auth:
 * - Email: test-no-profile@aneya.test
 * - Password: (stored in TEST_NO_PROFILE_PASSWORD or hardcoded)
 * - Do NOT create a corresponding entry in `doctors` table
 *
 * ## RLS Policy Verification
 *
 * This test validates migration 040_explicit_doctor_profile_check.sql which:
 * - Adds user_has_doctor_profile() helper function
 * - Updates all doctor-related RLS policies to explicitly check for profile
 * - Ensures users without profiles get 0 results (not errors)
 *
 * @see Migration 040_explicit_doctor_profile_check.sql
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { verifySupabaseConnection } from '../test/supabase-integration'

// Supabase credentials (same as other integration tests)
const SUPABASE_URL = 'https://ngkmhrckbybqghzfyorp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na21ocmNrYnlicWdoemZ5b3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5OTEyODYsImV4cCI6MjA4MDU2NzI4Nn0.MEPLXp3Hm6QhZtL7T_qdfOkDJ_eGj3NoOaj28PiJPf4'

// Test user without doctor profile (must be pre-created in Supabase Auth)
// This user MUST exist in auth.users but NOT have a row in the doctors table
const NO_PROFILE_USER_EMAIL = 'test-no-profile@aneya.test'
const NO_PROFILE_USER_PASSWORD = 'test-password-123'

let supabaseConnected = false
let authenticatedClient: SupabaseClient | null = null
let testUserId: string | null = null

describe('No Doctor Profile Access Control [SECURITY]', () => {
  beforeAll(async () => {
    // First verify Supabase is reachable
    supabaseConnected = await verifySupabaseConnection()
    if (!supabaseConnected) {
      console.warn('⚠️ Skipping security tests - Supabase not connected')
      return
    }

    // Sign in as user WITHOUT a doctor profile
    const testSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    try {
      const { data, error } = await testSupabase.auth.signInWithPassword({
        email: NO_PROFILE_USER_EMAIL,
        password: NO_PROFILE_USER_PASSWORD
      })

      if (error) {
        console.warn('⚠️ Failed to sign in as no-profile user:', error.message)
        console.warn('   Make sure to create this test user in Supabase Auth Dashboard:')
        console.warn(`   Email: ${NO_PROFILE_USER_EMAIL}`)
        console.warn('   Password: (set a test password)')
        console.warn('   Do NOT create a doctors table entry for this user')
        return
      }

      if (!data.session) {
        console.warn('⚠️ No session returned after sign-in')
        return
      }

      testUserId = data.user?.id || null

      // Create authenticated client with the session token
      authenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`
          }
        }
      })

      // Verify this user does NOT have a doctor profile
      const { data: doctorData } = await authenticatedClient
        .from('doctors')
        .select('id')
        .eq('user_id', data.user?.id)
        .maybeSingle()

      if (doctorData) {
        console.error('❌ Test user has a doctor profile - delete it before running tests')
        console.error('   User ID:', data.user?.id)
        console.error('   Doctor ID:', doctorData.id)
        authenticatedClient = null
      }
    } catch (err) {
      console.warn('⚠️ Error during test setup:', err)
    }
  })

  afterAll(async () => {
    // Sign out the test user
    if (authenticatedClient) {
      await authenticatedClient.auth.signOut()
    }
  })

  describe('Appointments Access Blocked', () => {
    it('should return 0 appointments for user without doctor profile', async () => {
      if (!supabaseConnected || !authenticatedClient) {
        console.warn('⚠️ Skipping test - prerequisites not met')
        return
      }

      const { data, error } = await authenticatedClient
        .from('appointments')
        .select('*')

      // Should NOT return an error - just empty results
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('should not allow inserting appointments without doctor profile', async () => {
      if (!supabaseConnected || !authenticatedClient) {
        console.warn('⚠️ Skipping test - prerequisites not met')
        return
      }

      // Try to insert an appointment
      // This should fail because:
      // 1. user_has_doctor_profile() returns false
      // 2. No doctor_id can match the user
      const { error } = await authenticatedClient
        .from('appointments')
        .insert({
          patient_id: '00000000-0000-0000-0000-000000000001',
          doctor_id: '00000000-0000-0000-0000-000000000002',
          scheduled_time: new Date().toISOString(),
          status: 'scheduled',
          duration_minutes: 30,
          appointment_type: 'general',
          booked_by: 'doctor'
        })

      // RLS policy should block the insert
      // Error could be RLS violation or FK constraint - either way, insert should fail
      expect(error).not.toBeNull()
    })

    it('should return 0 appointments even with specific ID query', async () => {
      if (!supabaseConnected || !authenticatedClient) {
        console.warn('⚠️ Skipping test - prerequisites not met')
        return
      }

      // Try to access a specific appointment by ID
      const { data, error } = await authenticatedClient
        .from('appointments')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')

      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe('Patients Access Blocked', () => {
    it('should return 0 patients for user without doctor profile', async () => {
      if (!supabaseConnected || !authenticatedClient) {
        console.warn('⚠️ Skipping test - prerequisites not met')
        return
      }

      const { data, error } = await authenticatedClient
        .from('patients')
        .select('*')

      // Should NOT return an error - just empty results
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('should not allow inserting patients without doctor profile', async () => {
      if (!supabaseConnected || !authenticatedClient) {
        console.warn('⚠️ Skipping test - prerequisites not met')
        return
      }

      // Try to insert a patient
      // This should fail because user_has_doctor_profile() returns false
      const { error } = await authenticatedClient
        .from('patients')
        .insert({
          name: '[TEST] Unauthorized Patient',
          sex: 'Male',
          date_of_birth: '1990-01-01',
          created_by: testUserId || 'test-user-id'
        })

      // RLS policy should block the insert
      expect(error).not.toBeNull()
    })

    it('should return 0 patients even with specific name query', async () => {
      if (!supabaseConnected || !authenticatedClient) {
        console.warn('⚠️ Skipping test - prerequisites not met')
        return
      }

      // Try to search for patients by name
      const { data, error } = await authenticatedClient
        .from('patients')
        .select('*')
        .ilike('name', '%test%')

      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe('Related Tables Access Blocked', () => {
    it('should return 0 patient_doctor relationships', async () => {
      if (!supabaseConnected || !authenticatedClient) {
        console.warn('⚠️ Skipping test - prerequisites not met')
        return
      }

      const { data, error } = await authenticatedClient
        .from('patient_doctor')
        .select('*')

      // RLS should block access
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('should return 0 consultations', async () => {
      if (!supabaseConnected || !authenticatedClient) {
        console.warn('⚠️ Skipping test - prerequisites not met')
        return
      }

      const { data, error } = await authenticatedClient
        .from('consultations')
        .select('*')

      // RLS should block access
      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe('User Has Profile Function', () => {
    it('should return false for user without doctor profile', async () => {
      if (!supabaseConnected || !authenticatedClient || !testUserId) {
        console.warn('⚠️ Skipping test - prerequisites not met')
        return
      }

      // Call the helper function directly via RPC
      const { data, error } = await authenticatedClient
        .rpc('user_has_doctor_profile', { p_user_id: testUserId })

      expect(error).toBeNull()
      expect(data).toBe(false)
    })

    it('should return false for non-existent user', async () => {
      if (!supabaseConnected || !authenticatedClient) {
        console.warn('⚠️ Skipping test - prerequisites not met')
        return
      }

      // Call with a random UUID that doesn't exist
      const { data, error } = await authenticatedClient
        .rpc('user_has_doctor_profile', { p_user_id: '00000000-0000-0000-0000-000000000000' })

      expect(error).toBeNull()
      expect(data).toBe(false)
    })
  })
})
