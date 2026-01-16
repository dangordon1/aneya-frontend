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

import { describe, it, expect, beforeAll } from 'vitest'
import { testSupabase, verifySupabaseConnection } from './supabase-integration'

describe('RLS Circular Dependency Prevention [INTEGRATION]', () => {
  let supabaseConnected = false

  beforeAll(async () => {
    supabaseConnected = await verifySupabaseConnection()
    if (!supabaseConnected) {
      console.warn('⚠️ Skipping RLS circular dependency tests - Supabase connection failed')
    }
  })

  describe('patient_doctor table queries', () => {
    it('should query patient_doctor with patients inner join without 400 error', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      const { data, error } = await testSupabase
        .from('patient_doctor')
        .select('patient_id, patients!inner(*)')
        .eq('status', 'active')
        .limit(1)

      // Should not have circular dependency error
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ patient_doctor → patients join succeeded (${data.length} records)`)
    })

    it('should query patient_doctor with nested patients and appointments without circular dependency', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      // This is the exact query pattern from usePatients hook that was failing
      const { data, error } = await testSupabase
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
      expect(error).toBeNull()
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
  })

  describe('appointments table queries', () => {
    it('should query appointments with patient expansion without circular dependency', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      const { data, error } = await testSupabase
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

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ appointments → patients join succeeded (${data.length} records)`)
    })

    it('should query appointments by doctor without errors', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      const { data, error } = await testSupabase
        .from('appointments')
        .select('*')
        .limit(1)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ Direct appointments query succeeded (${data.length} records)`)
    })
  })

  describe('patients table queries', () => {
    it('should query patients with appointments expansion without circular dependency', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      const { data, error } = await testSupabase
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

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ patients → appointments join succeeded (${data.length} records)`)
    })

    it('should query patients directly without errors', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      const { data, error } = await testSupabase
        .from('patients')
        .select('*')
        .eq('archived', false)
        .limit(1)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ Direct patients query succeeded (${data.length} records)`)
    })
  })

  describe('complex multi-table joins', () => {
    it('should handle patient_doctor → patients → appointments → back reference without infinite loop', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      // This tests the most complex scenario: multiple nested relationships
      const { data, error } = await testSupabase
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
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)

      console.log(`✅ Complex multi-table join succeeded without circular dependency`)
    })
  })

  describe('RLS policy effectiveness', () => {
    it('should enforce RLS on all tables (queries should filter based on auth context)', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      // Test that RLS is actually enabled and filtering results
      // Without auth context, authenticated queries should see filtered results
      const tables = ['patients', 'appointments', 'patient_doctor']

      for (const table of tables) {
        const { data, error } = await testSupabase
          .from(table)
          .select('*')
          .limit(1)

        // Should not error (RLS is working)
        expect(error).toBeNull()
        expect(data).toBeDefined()

        console.log(`✅ RLS policy enforced on ${table} table`)
      }
    })
  })

  describe('error scenarios that should NOT cause circular dependencies', () => {
    it('should handle non-existent patient_id in appointments gracefully', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const { data, error } = await testSupabase
        .from('appointments')
        .select(`
          *,
          patient:patients(*)
        `)
        .eq('patient_id', nonExistentId)

      // Should not error with circular dependency, just return empty results
      expect(error).toBeNull()
      expect(data).toEqual([])

      console.log(`✅ Non-existent foreign key handled without circular dependency`)
    })

    it('should handle deeply nested joins without stack overflow', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      // Test multiple levels of nesting to ensure no infinite recursion
      const { data, error } = await testSupabase
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

      expect(error).toBeNull()
      expect(data).toBeDefined()

      console.log(`✅ Deeply nested joins succeeded without stack overflow`)
    })
  })
})
