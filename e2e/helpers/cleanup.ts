/**
 * Test data cleanup utilities for E2E tests.
 * All test data is marked with [E2E-TEST] for easy identification and cleanup.
 */

import { supabase } from './supabase-client';

// Test marker used to identify E2E test data
export const E2E_TEST_MARKER = '[E2E-TEST]';

// Track created IDs for cleanup
const createdPatientIds: string[] = [];
const createdAppointmentIds: string[] = [];
const createdConsultationIds: string[] = [];
const createdFormIds: string[] = [];

/**
 * Track a patient ID for cleanup.
 */
export function trackPatientId(id: string): void {
  createdPatientIds.push(id);
}

/**
 * Track an appointment ID for cleanup.
 */
export function trackAppointmentId(id: string): void {
  createdAppointmentIds.push(id);
}

/**
 * Track a consultation ID for cleanup.
 */
export function trackConsultationId(id: string): void {
  createdConsultationIds.push(id);
}

/**
 * Track a form ID for cleanup.
 */
export function trackFormId(id: string): void {
  createdFormIds.push(id);
}

/**
 * Create test patient data with the E2E marker.
 */
export function createTestPatientData(uniqueId: string) {
  return {
    name: `${E2E_TEST_MARKER} Test Patient ${uniqueId}`,
    sex: 'Female' as const,
    date_of_birth: '1990-01-15',
    phone: '+919876543210',
    email: `e2e-test-patient-${uniqueId}@test.aneya.health`,
    consultation_language: 'en-IN',
    archived: false,
  };
}

/**
 * Create test appointment data with the E2E marker.
 */
export function createTestAppointmentData(patientId: string, doctorId: string, createdBy: string) {
  const now = new Date();
  return {
    patient_id: patientId,
    doctor_id: doctorId,
    scheduled_time: now.toISOString(),
    duration_minutes: 30,
    status: 'scheduled',
    appointment_type: 'obgyn_antenatal',
    specialty: 'obgyn',
    specialty_subtype: 'antenatal',
    notes: `${E2E_TEST_MARKER} Automated E2E test appointment`,
    booked_by: 'doctor',
    created_by: createdBy, // This is crucial - appointments are filtered by created_by
  };
}

/**
 * Clean up all E2E test data from the database.
 * Deletes in order of dependencies: forms -> consultations -> appointments -> patients
 */
export async function cleanupAllTestData(): Promise<void> {
  console.log('Cleaning up E2E test data...');

  // 1. Delete consultation forms by tracked IDs
  if (createdFormIds.length > 0) {
    const { error: formError } = await supabase
      .from('consultation_forms')
      .delete()
      .in('id', createdFormIds);

    if (formError) {
      console.warn('Failed to cleanup forms by ID:', formError.message);
    }
    createdFormIds.length = 0;
  }

  // 2. Delete consultations by tracked IDs
  if (createdConsultationIds.length > 0) {
    const { error: consultationError } = await supabase
      .from('consultations')
      .delete()
      .in('id', createdConsultationIds);

    if (consultationError) {
      console.warn('Failed to cleanup consultations by ID:', consultationError.message);
    }
    createdConsultationIds.length = 0;
  }

  // 3. Delete appointments by tracked IDs
  if (createdAppointmentIds.length > 0) {
    const { error: appointmentError } = await supabase
      .from('appointments')
      .delete()
      .in('id', createdAppointmentIds);

    if (appointmentError) {
      console.warn('Failed to cleanup appointments by ID:', appointmentError.message);
    }
    createdAppointmentIds.length = 0;
  }

  // 4. Delete patients by tracked IDs
  if (createdPatientIds.length > 0) {
    const { error: patientError } = await supabase
      .from('patients')
      .delete()
      .in('id', createdPatientIds);

    if (patientError) {
      console.warn('Failed to cleanup patients by ID:', patientError.message);
    }
    createdPatientIds.length = 0;
  }

  // Also clean up any orphaned test data by marker
  await cleanupByMarker();

  console.log('E2E test data cleanup complete');
}

/**
 * Clean up test data by marker (fallback for orphaned data).
 */
async function cleanupByMarker(): Promise<void> {
  // Delete consultation forms linked to test appointments
  const { data: testAppointments } = await supabase
    .from('appointments')
    .select('id')
    .like('notes', `%${E2E_TEST_MARKER}%`);

  if (testAppointments && testAppointments.length > 0) {
    const appointmentIds = testAppointments.map((a) => a.id);

    await supabase.from('consultation_forms').delete().in('appointment_id', appointmentIds);

    await supabase.from('consultations').delete().in('appointment_id', appointmentIds);
  }

  // Delete consultations with marker in text
  await supabase.from('consultations').delete().like('consultation_text', `%${E2E_TEST_MARKER}%`);

  // Delete appointments with marker in notes
  await supabase.from('appointments').delete().like('notes', `%${E2E_TEST_MARKER}%`);

  // Delete patients with marker in name
  await supabase.from('patients').delete().like('name', `%${E2E_TEST_MARKER}%`);
}

/**
 * Clean up stale test data (older than 1 hour).
 * Useful for cleaning up after failed test runs.
 */
export async function cleanupStaleTestData(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Delete old test patients and their related data
  const { data: stalePatients } = await supabase
    .from('patients')
    .select('id')
    .like('name', `%${E2E_TEST_MARKER}%`)
    .lt('created_at', oneHourAgo);

  if (stalePatients && stalePatients.length > 0) {
    console.log(`Cleaning up ${stalePatients.length} stale test patients...`);
    const patientIds = stalePatients.map((p) => p.id);

    // Delete related data
    await supabase.from('consultation_forms').delete().in('patient_id', patientIds);
    await supabase.from('consultations').delete().in('patient_id', patientIds);
    await supabase.from('appointments').delete().in('patient_id', patientIds);
    await supabase.from('patients').delete().in('id', patientIds);
  }
}
