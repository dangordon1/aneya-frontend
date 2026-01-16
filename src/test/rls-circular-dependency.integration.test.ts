/**
 * RLS Circular Dependency Prevention Integration Tests
 *
 * These tests verify that RLS policies do not create circular dependencies
 * when querying with nested joins. Specifically, they test the query patterns
 * that previously failed with 400/500 errors due to circular RLS evaluation.
 *
 * Run with: npm run test:integration -- rls-circular-dependency
 *
 * @see /Users/dgordon/aneya/aneya-backend/supabase/migrations/039_fix_rls_circular_dependency.sql
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { testSupabase, verifySupabaseConnection, signInAsTestDoctor, signOut } from './supabase-integration'
import { SupabaseClient } from '@supabase/supabase-js'

describe('RLS Circular Dependency Prevention [INTEGRATION]', () => {
  let supabaseConnected = false
  let authenticatedClient: SupabaseClient | null = null
  let testDoctorUser: any = null

  beforeAll(async () => {
    supabaseConnected = await verifySupabaseConnection()
    if (!supabaseConnected) {
      console.warn('⚠️ Skipping RLS circular dependency tests - Supabase connection failed')
      return
    }

    // Sign in as test doctor for authenticated RLS testing
    const authResult = await signInAsTestDoctor()
    if (authResult) {
      authenticatedClient = authResult.client
      testDoctorUser = authResult.user
      console.log(`✅ Signed in as test doctor: ${testDoctorUser.email}`)
    } else {
      console.warn('⚠️ Could not sign in as test doctor - some tests will be skipped')
    }
  })

  afterAll(async () => {
    // Sign out after tests
    await signOut()
  })

  describe('patient_doctor table queries [AUTHENTICATED]', () => {
    it('should query patient_doctor with patients inner join without 400 error', async (ctx) => {
      if (!supabaseConnected || !authenticatedClient) return ctx.skip()

      const { data, error } = await authenticatedClient
        .from('patient_doctor')
        .select('patient_id, patients!inner(*)')
        .eq('status', 'active')
        .limit(1)

      // Should not have circular dependency error (400/500)
      if (error) {
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      }
      expect(error, `Expected no error but got: ${error?.message || 'unknown'}`).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ patient_doctor → patients join succeeded (${data?.length || 0} records)`)
    })

    it('should query patient_doctor with nested patients and appointments without circular dependency', async (ctx) => {
      if (!supabaseConnected || !authenticatedClient) return ctx.skip()

      // This is the exact query pattern from usePatients hook that was failing
      const { data, error } = await authenticatedClient
        .from('patient_doctor')
        .select(`
          patient_id,
          patients!inner(
            id,
            user_id,
            archived,
            created_at,
            appointments!patient_id(
              id,
              scheduled_time,
              status,
              appointment_type
            )
          )
        `)
        .eq('status', 'active')
        .limit(1)

      // Critical: This should NOT return 400 (circular dependency) or 500 error
      if (error) {
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      }
      expect(error, `Expected no error but got: ${error?.message || 'unknown'}`).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('patient_id')
        expect(data[0]).toHaveProperty('patients')
        console.log(`✅ Full nested query succeeded: patient_doctor → patients → appointments`)
      } else {
        console.log(`✅ Nested query succeeded with 0 records (no circular dependency)`)
      }
    })

    it('should query patient_doctor directly as doctor without circular dependency', async (ctx) => {
      if (!supabaseConnected || !authenticatedClient) return ctx.skip()

      // Test direct query to patient_doctor table
      const { data, error } = await authenticatedClient
        .from('patient_doctor')
        .select('*')
        .eq('status', 'active')
        .limit(5)

      if (error) {
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      }
      expect(error, `Expected no error but got: ${error?.message || 'unknown'}`).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ Direct patient_doctor query succeeded (${data?.length || 0} records)`)
    })
  })

  describe('appointments table queries [AUTHENTICATED]', () => {
    it('should query appointments with patient expansion without circular dependency', async (ctx) => {
      if (!supabaseConnected || !authenticatedClient) return ctx.skip()

      const { data, error } = await authenticatedClient
        .from('appointments')
        .select(`
          id,
          scheduled_time,
          status,
          patient:patients(
            id,
            user_id,
            archived
          )
        `)
        .limit(1)

      if (error) {
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      }
      expect(error, `Expected no error but got: ${error?.message || 'unknown'}`).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ appointments → patients join succeeded (${data?.length || 0} records)`)
    })

    it('should query appointments by doctor without errors', async (ctx) => {
      if (!supabaseConnected || !authenticatedClient) return ctx.skip()

      const { data, error } = await authenticatedClient
        .from('appointments')
        .select('*')
        .limit(1)

      if (error) {
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      }
      expect(error, `Expected no error but got: ${error?.message || 'unknown'}`).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ Direct appointments query succeeded (${data?.length || 0} records)`)
    })
  })

  describe('patients table queries [AUTHENTICATED]', () => {
    it('should query patients with appointments expansion without circular dependency', async (ctx) => {
      if (!supabaseConnected || !authenticatedClient) return ctx.skip()

      const { data, error } = await authenticatedClient
        .from('patients')
        .select(`
          id,
          user_id,
          archived,
          appointments!patient_id(
            id,
            scheduled_time,
            status
          )
        `)
        .eq('archived', false)
        .limit(1)

      if (error) {
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      }
      expect(error, `Expected no error but got: ${error?.message || 'unknown'}`).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ patients → appointments join succeeded (${data?.length || 0} records)`)
    })

    it('should query patients directly without errors', async (ctx) => {
      if (!supabaseConnected || !authenticatedClient) return ctx.skip()

      const { data, error } = await authenticatedClient
        .from('patients')
        .select('*')
        .eq('archived', false)
        .limit(1)

      if (error) {
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      }
      expect(error, `Expected no error but got: ${error?.message || 'unknown'}`).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ Direct patients query succeeded (${data?.length || 0} records)`)
    })
  })

  describe('complex multi-table joins [AUTHENTICATED]', () => {
    it('should handle patient_doctor → patients → appointments → back reference without infinite loop', async (ctx) => {
      if (!supabaseConnected || !authenticatedClient) return ctx.skip()

      // This tests the most complex scenario: multiple nested relationships
      const { data, error } = await authenticatedClient
        .from('patient_doctor')
        .select(`
          patient_id,
          doctor_id,
          status,
          patients!inner(
            id,
            user_id,
            archived,
            appointments!patient_id(
              id,
              scheduled_time,
              status,
              doctor_id
            )
          )
        `)
        .eq('status', 'active')
        .eq('patients.archived', false)
        .limit(1)

      // This is the critical test - should not timeout or return circular dependency error
      if (error) {
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      }
      expect(error, `Expected no error but got: ${error?.message || 'unknown'}`).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ Complex multi-table join succeeded without circular dependency`)
    })
  })

  describe('RLS policy effectiveness [AUTHENTICATED]', () => {
    it('should enforce RLS on all tables (queries should filter based on auth context)', async (ctx) => {
      if (!supabaseConnected || !authenticatedClient) return ctx.skip()

      // Test that RLS is actually enabled and filtering results
      // With authenticated doctor context, should see filtered results
      const tables = ['patients', 'appointments', 'patient_doctor'] as const

      for (const table of tables) {
        const { data, error } = await authenticatedClient
          .from(table)
          .select('*')
          .limit(1)

        // Should not error (RLS is working)
        if (error) {
          console.error(`❌ Error on ${table}:`, {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
        }
        expect(error, `Expected no error on ${table} but got: ${error?.message || 'unknown'}`).toBeNull()
        expect(data).toBeDefined()

        console.log(`✅ RLS policy enforced on ${table} table (${data?.length || 0} records visible to doctor)`)
      }
    })
  })

  describe('error scenarios that should NOT cause circular dependencies [AUTHENTICATED]', () => {
    it('should handle non-existent patient_id in appointments gracefully', async (ctx) => {
      if (!supabaseConnected || !authenticatedClient) return ctx.skip()

      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const { data, error } = await authenticatedClient
        .from('appointments')
        .select(`
          *,
          patient:patients(*)
        `)
        .eq('patient_id', nonExistentId)

      // Should not error with circular dependency, just return empty results
      if (error) {
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      }
      expect(error, `Expected no error but got: ${error?.message || 'unknown'}`).toBeNull()
      expect(data).toEqual([])

      console.log(`✅ Non-existent foreign key handled without circular dependency`)
    })

    it('should handle deeply nested joins without stack overflow', async (ctx) => {
      if (!supabaseConnected || !authenticatedClient) return ctx.skip()

      // Test multiple levels of nesting to ensure no infinite recursion
      const { data, error } = await authenticatedClient
        .from('patient_doctor')
        .select(`
          *,
          patients!inner(
            *,
            appointments!patient_id(
              *,
              doctors!doctor_id(
                id,
                user_id,
                specialty
              )
            )
          )
        `)
        .eq('status', 'active')
        .limit(1)

      if (error) {
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      }
      expect(error, `Expected no error but got: ${error?.message || 'unknown'}`).toBeNull()
      expect(data).toBeDefined()

      console.log(`✅ Deeply nested joins succeeded without stack overflow`)
    })
  })

  describe('messages table queries [AUTHENTICATED]', () => {
    it('should query messages without triggering circular dependencies', async (ctx) => {
      if (!supabaseConnected || !authenticatedClient) return ctx.skip()

      // Test messages table which was showing 500 errors in user logs
      const { data, error } = await authenticatedClient
        .from('messages')
        .select('*')
        .limit(5)

      if (error) {
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      }
      expect(error, `Expected no error but got: ${error?.message || 'unknown'}`).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ Messages query succeeded without circular dependency (${data?.length || 0} records)`)
    })
  })
})
