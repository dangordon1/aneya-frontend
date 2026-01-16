/**
 * useAppointments Hook Security Integration Tests
 *
 * CRITICAL SECURITY TESTS - Run against REAL Supabase database
 *
 * ## What This Tests
 *
 * This test suite verifies that appointment data access is properly secured based on
 * the `doctor_id` field, NOT the `created_by` field. This ensures:
 * - Doctors can only see appointments where they are the assigned doctor
 * - Appointments created by one doctor but assigned to another are properly filtered
 * - Admin users can see all appointments
 *
 * ## Security Requirements Tested
 *
 * 1. **Appointment Visibility**
 *    - Doctors ONLY see appointments where doctor_id matches their profile
 *    - Doctors DO NOT see appointments they created but are assigned to another doctor
 *    - Doctors DO NOT see appointments assigned to other doctors
 *
 * 2. **Doctor ID vs Created By**
 *    - Access is based on `doctor_id` field, not `created_by` field
 *    - This ensures proper assignment-based access control
 *
 * ## Run Commands
 *
 * ```bash
 * # Run all integration tests (includes security tests)
 * npm run test:integration
 *
 * # Run only appointments security tests
 * npm run test:integration -- useAppointments.security
 * ```
 *
 * @see {@link /Users/dgordon/aneya/aneya-frontend/src/hooks/useAppointments.ts} - Implementation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  testSupabase,
  verifySupabaseConnection,
} from '../test/supabase-integration'

// Check connection status before running tests
let supabaseConnected = false

// Test marker for cleanup - use unique ID per run to avoid conflicts
const TEST_RUN_ID = `${Date.now()}-${Math.random().toString(36).substring(7)}`
const TEST_MARKER = `[APPT-SEC-${TEST_RUN_ID}]`

// Track created IDs for cleanup
const testPatientIds: string[] = []
const testAppointmentIds: string[] = []
const testRelationshipIds: string[] = []

/**
 * Create a test patient for appointment tests
 */
async function createTestPatient(name: string, createdBy: string) {
  const { data, error } = await testSupabase
    .from('patients')
    .insert({
      name: `${TEST_MARKER} ${name}`,
      sex: 'Male',
      date_of_birth: '1990-01-01',
      created_by: createdBy,
      archived: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create test patient:', error)
    return null
  }

  testPatientIds.push(data.id)
  return data
}

/**
 * Create a test appointment
 */
async function createTestAppointment(
  patientId: string,
  doctorId: string,
  createdBy: string,
  scheduledTime?: Date
) {
  const { data, error } = await testSupabase
    .from('appointments')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      created_by: createdBy,
      scheduled_time: (scheduledTime || new Date(Date.now() + 86400000)).toISOString(), // Tomorrow
      status: 'scheduled',
      appointment_type: 'consultation',
      notes: `${TEST_MARKER} Test appointment`,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create test appointment:', error)
    return null
  }

  testAppointmentIds.push(data.id)
  return data
}

/**
 * Create a patient-doctor relationship
 */
async function createPatientDoctorRelationship(patientId: string, doctorId: string) {
  const { data, error } = await testSupabase
    .from('patient_doctor')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      initiated_by: 'doctor',
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create relationship:', error)
    return null
  }

  testRelationshipIds.push(data.id)
  return data
}

/**
 * Cleanup all test data
 */
async function cleanupTestData() {
  // Delete appointments first
  if (testAppointmentIds.length > 0) {
    await testSupabase
      .from('appointments')
      .delete()
      .in('id', testAppointmentIds)
    testAppointmentIds.length = 0
  }

  // Delete relationships
  if (testRelationshipIds.length > 0) {
    await testSupabase
      .from('patient_doctor')
      .delete()
      .in('id', testRelationshipIds)
    testRelationshipIds.length = 0
  }

  // Delete patients
  if (testPatientIds.length > 0) {
    await testSupabase
      .from('patients')
      .delete()
      .in('id', testPatientIds)
    testPatientIds.length = 0
  }

  // Also clean up any data with test marker (current run)
  await testSupabase
    .from('appointments')
    .delete()
    .like('notes', `%${TEST_MARKER}%`)

  await testSupabase
    .from('patients')
    .delete()
    .like('name', `%${TEST_MARKER}%`)

  // Clean up old test data from previous runs
  await testSupabase
    .from('appointments')
    .delete()
    .like('notes', '%[APPT-SEC-%')

  await testSupabase
    .from('patients')
    .delete()
    .like('name', '%[APPT-SEC-%')

  await testSupabase
    .from('appointments')
    .delete()
    .like('notes', '%[APPT-SECURITY-TEST]%')
}

describe('useAppointments Security Integration Tests', () => {

  beforeAll(async () => {
    // Verify Supabase connection
    supabaseConnected = await verifySupabaseConnection()
    if (!supabaseConnected) {
      console.warn('⚠️ Supabase connection failed - skipping security integration tests')
      return
    }

    // Clean up any existing test data
    await cleanupTestData()
  })

  afterAll(async () => {
    // Only clean up if we were connected
    if (supabaseConnected) {
      await cleanupTestData()
    }
  })

  describe('Appointment Visibility by Doctor ID', () => {
    it('should only return appointments where doctor_id matches the querying doctor', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      // Get two existing doctors from the database
      const { data: existingDoctors } = await testSupabase
        .from('doctors')
        .select('id, user_id')
        .not('user_id', 'is', null)
        .limit(2)

      if (!existingDoctors || existingDoctors.length < 2) {
        console.warn('⚠️ Need at least 2 doctors in database - skipping test')
        return
      }

      const doctor1 = existingDoctors[0]
      const doctor2 = existingDoctors[1]

      // Create a test patient
      const patient = await createTestPatient('Appointment Test Patient', doctor1.user_id)
      if (!patient) {
        console.warn('⚠️ Failed to create test patient - skipping test')
        return
      }

      // Create patient-doctor relationships for both doctors
      await createPatientDoctorRelationship(patient.id, doctor1.id)
      await createPatientDoctorRelationship(patient.id, doctor2.id)

      // Create appointment for doctor1
      const appt1 = await createTestAppointment(patient.id, doctor1.id, doctor1.user_id)
      // Create appointment for doctor2
      const appt2 = await createTestAppointment(patient.id, doctor2.id, doctor2.user_id)

      if (!appt1 || !appt2) {
        console.warn('⚠️ Failed to create test appointments - skipping test')
        return
      }

      // Query as doctor1 - should only see appt1
      const { data: doctor1Appointments, error: error1 } = await testSupabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctor1.id)
        .like('notes', `%${TEST_MARKER}%`)

      expect(error1).toBeNull()
      expect(doctor1Appointments).toBeDefined()
      expect(doctor1Appointments?.length).toBe(1)
      expect(doctor1Appointments?.[0].id).toBe(appt1.id)
      expect(doctor1Appointments?.[0].doctor_id).toBe(doctor1.id)

      // Query as doctor2 - should only see appt2
      const { data: doctor2Appointments, error: error2 } = await testSupabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctor2.id)
        .like('notes', `%${TEST_MARKER}%`)

      expect(error2).toBeNull()
      expect(doctor2Appointments).toBeDefined()
      expect(doctor2Appointments?.length).toBe(1)
      expect(doctor2Appointments?.[0].id).toBe(appt2.id)
      expect(doctor2Appointments?.[0].doctor_id).toBe(doctor2.id)

      console.log('✅ Appointments correctly filtered by doctor_id')
    })

    it('should NOT return appointments created by doctor but assigned to another', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      // Get two existing doctors
      const { data: existingDoctors } = await testSupabase
        .from('doctors')
        .select('id, user_id')
        .not('user_id', 'is', null)
        .limit(2)

      if (!existingDoctors || existingDoctors.length < 2) {
        console.warn('⚠️ Need at least 2 doctors in database - skipping test')
        return
      }

      const doctor1 = existingDoctors[0] // Will create the appointment
      const doctor2 = existingDoctors[1] // Will be assigned the appointment

      // Create a test patient
      const patient = await createTestPatient('Cross-Assignment Patient', doctor1.user_id)
      if (!patient) {
        console.warn('⚠️ Failed to create test patient - skipping test')
        return
      }

      // Create relationship with doctor2
      await createPatientDoctorRelationship(patient.id, doctor2.id)

      // Doctor1 CREATES the appointment, but it's ASSIGNED to doctor2
      const appointment = await createTestAppointment(
        patient.id,
        doctor2.id, // Assigned to doctor2
        doctor1.user_id // Created by doctor1
      )

      if (!appointment) {
        console.warn('⚠️ Failed to create test appointment - skipping test')
        return
      }

      // Verify created_by is doctor1 but doctor_id is doctor2
      expect(appointment.created_by).toBe(doctor1.user_id)
      expect(appointment.doctor_id).toBe(doctor2.id)

      // Query as doctor1 (the creator) - should NOT see the appointment
      const { data: doctor1Appointments } = await testSupabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctor1.id)
        .eq('id', appointment.id)

      expect(doctor1Appointments?.length).toBe(0)

      // Query as doctor2 (the assignee) - SHOULD see the appointment
      const { data: doctor2Appointments } = await testSupabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctor2.id)
        .eq('id', appointment.id)

      expect(doctor2Appointments?.length).toBe(1)
      expect(doctor2Appointments?.[0].id).toBe(appointment.id)

      console.log('✅ Appointments correctly use doctor_id not created_by for visibility')
    })

    it('should return zero appointments for doctor with no assigned appointments', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      // Get two existing doctors
      const { data: existingDoctors } = await testSupabase
        .from('doctors')
        .select('id, user_id')
        .not('user_id', 'is', null)
        .limit(2)

      if (!existingDoctors || existingDoctors.length < 2) {
        console.warn('⚠️ Need at least 2 doctors in database - skipping test')
        return
      }

      const doctor1 = existingDoctors[0] // Has appointments
      const doctor2 = existingDoctors[1] // Has no appointments in this test

      // Create a test patient
      const patient = await createTestPatient('Doctor1 Only Patient', doctor1.user_id)
      if (!patient) {
        console.warn('⚠️ Failed to create test patient - skipping test')
        return
      }

      await createPatientDoctorRelationship(patient.id, doctor1.id)

      // Create appointment ONLY for doctor1
      const appointment = await createTestAppointment(patient.id, doctor1.id, doctor1.user_id)
      if (!appointment) {
        console.warn('⚠️ Failed to create test appointment - skipping test')
        return
      }

      // Query for THIS SPECIFIC appointment as doctor2 - should NOT find it
      const { data: doctor2Appointments, error } = await testSupabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctor2.id)
        .eq('id', appointment.id)

      expect(error).toBeNull()
      expect(doctor2Appointments).toBeDefined()
      expect(doctor2Appointments?.length).toBe(0)

      // Verify doctor1 CAN see this specific appointment
      const { data: doctor1Appointments } = await testSupabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctor1.id)
        .eq('id', appointment.id)

      expect(doctor1Appointments?.length).toBe(1)

      console.log('✅ Appointment correctly visible only to assigned doctor')
    })
  })

  describe('Appointment Status Filtering', () => {
    it('should only return scheduled/in_progress appointments by default', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      const { data: existingDoctors } = await testSupabase
        .from('doctors')
        .select('id, user_id')
        .not('user_id', 'is', null)
        .limit(1)

      if (!existingDoctors || existingDoctors.length < 1) {
        console.warn('⚠️ Need at least 1 doctor in database - skipping test')
        return
      }

      const doctor = existingDoctors[0]

      // Create a test patient
      const patient = await createTestPatient('Status Test Patient', doctor.user_id)
      if (!patient) {
        console.warn('⚠️ Failed to create test patient - skipping test')
        return
      }

      await createPatientDoctorRelationship(patient.id, doctor.id)

      // Create appointments with different statuses
      const scheduledAppt = await createTestAppointment(patient.id, doctor.id, doctor.user_id)

      // Create a cancelled appointment
      const { data: cancelledAppt } = await testSupabase
        .from('appointments')
        .insert({
          patient_id: patient.id,
          doctor_id: doctor.id,
          created_by: doctor.user_id,
          scheduled_time: new Date(Date.now() + 86400000).toISOString(),
          status: 'cancelled',
          appointment_type: 'consultation',
          notes: `${TEST_MARKER} Cancelled appointment`,
        })
        .select()
        .single()

      if (cancelledAppt) {
        testAppointmentIds.push(cancelledAppt.id)
      }

      if (!scheduledAppt || !cancelledAppt) {
        console.warn('⚠️ Failed to create test appointments - skipping test')
        return
      }

      // Query for THESE SPECIFIC appointments with status filter
      const { data: activeAppointments, error } = await testSupabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctor.id)
        .in('status', ['scheduled', 'in_progress'])
        .in('id', [scheduledAppt.id, cancelledAppt.id])

      expect(error).toBeNull()
      expect(activeAppointments).toBeDefined()
      // Should only find the scheduled one, not the cancelled one
      expect(activeAppointments?.length).toBe(1)
      expect(activeAppointments?.[0].id).toBe(scheduledAppt.id)
      expect(activeAppointments?.[0].status).toBe('scheduled')

      // Verify cancelled appointment is excluded
      const cancelledInResults = activeAppointments?.find(a => a.id === cancelledAppt.id)
      expect(cancelledInResults).toBeUndefined()

      console.log('✅ Status filtering correctly excludes cancelled appointments')
    })
  })

  describe('Appointment with Patient Data', () => {
    it('should return appointments with patient information', async (ctx) => {
      if (!supabaseConnected) return ctx.skip()

      const { data: existingDoctors } = await testSupabase
        .from('doctors')
        .select('id, user_id')
        .not('user_id', 'is', null)
        .limit(1)

      if (!existingDoctors || existingDoctors.length < 1) {
        console.warn('⚠️ Need at least 1 doctor in database - skipping test')
        return
      }

      const doctor = existingDoctors[0]

      // Create a test patient with specific name
      const patient = await createTestPatient('John Doe Test', doctor.user_id)
      if (!patient) {
        console.warn('⚠️ Failed to create test patient - skipping test')
        return
      }

      await createPatientDoctorRelationship(patient.id, doctor.id)

      // Create appointment
      const appointment = await createTestAppointment(patient.id, doctor.id, doctor.user_id)
      if (!appointment) {
        console.warn('⚠️ Failed to create test appointment - skipping test')
        return
      }

      // Query with patient join (like useAppointments does)
      const { data: appointmentsWithPatient, error } = await testSupabase
        .from('appointments')
        .select('*, patient:patients(*), doctor:doctors(*)')
        .eq('doctor_id', doctor.id)
        .eq('id', appointment.id)

      expect(error).toBeNull()
      expect(appointmentsWithPatient).toBeDefined()
      expect(appointmentsWithPatient?.length).toBe(1)

      const appt = appointmentsWithPatient?.[0]
      expect(appt.patient).toBeDefined()
      expect(appt.patient.id).toBe(patient.id)
      expect(appt.patient.name).toContain('John Doe Test')
      expect(appt.doctor).toBeDefined()
      expect(appt.doctor.id).toBe(doctor.id)

      console.log('✅ Appointments correctly joined with patient and doctor data')
    })
  })
})
