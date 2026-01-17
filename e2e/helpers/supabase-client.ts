/**
 * Supabase client for E2E tests.
 * Uses real Supabase database for integration testing.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TEST_DOCTOR } from './auth-bypass';

// Real Supabase credentials (development database)
// These are the same credentials used in src/test/supabase-integration.ts
const SUPABASE_URL = 'https://ngkmhrckbybqghzfyorp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na21ocmNrYnlicWdoemZ5b3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5OTEyODYsImV4cCI6MjA4MDU2NzI4Nn0.MEPLXp3Hm6QhZtL7T_qdfOkDJ_eGj3NoOaj28PiJPf4';

// Create Supabase client for E2E tests
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Verify Supabase connection is working.
 */
export async function verifySupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('patients').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Ensure test doctor exists in the database.
 * Creates the doctor if it doesn't exist.
 */
export async function ensureTestDoctorExists(): Promise<{
  id: string;
  user_id: string;
}> {
  // Check if test doctor already exists
  const { data: existingDoctor } = await supabase
    .from('doctors')
    .select('id, user_id')
    .eq('user_id', TEST_DOCTOR.id)
    .single();

  if (existingDoctor) {
    return existingDoctor;
  }

  // Create test doctor
  const { data: newDoctor, error } = await supabase
    .from('doctors')
    .insert({
      user_id: TEST_DOCTOR.id,
      email: TEST_DOCTOR.email,
      name: TEST_DOCTOR.displayName,
      specialty: 'obgyn',
      is_active: true,
    })
    .select('id, user_id')
    .single();

  if (error) {
    throw new Error(`Failed to create test doctor: ${error.message}`);
  }

  // Also create user_roles entry
  await supabase.from('user_roles').upsert(
    {
      user_id: TEST_DOCTOR.id,
      email: TEST_DOCTOR.email,
      role: 'doctor',
    },
    { onConflict: 'user_id' }
  );

  return newDoctor;
}

/**
 * Get the test doctor's ID from the database.
 */
export async function getTestDoctorId(): Promise<string | null> {
  const { data } = await supabase
    .from('doctors')
    .select('id')
    .eq('user_id', TEST_DOCTOR.id)
    .single();

  return data?.id || null;
}

/**
 * Fetch a patient by ID.
 */
export async function getPatient(patientId: string): Promise<any | null> {
  const { data, error } = await supabase.from('patients').select('*').eq('id', patientId).single();

  if (error) {
    console.warn(`Failed to fetch patient ${patientId}:`, error.message);
    return null;
  }

  return data;
}

/**
 * Fetch an appointment by ID.
 */
export async function getAppointment(appointmentId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single();

  if (error) {
    console.warn(`Failed to fetch appointment ${appointmentId}:`, error.message);
    return null;
  }

  return data;
}

/**
 * Fetch a consultation by appointment ID.
 */
export async function getConsultationByAppointment(appointmentId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.warn(`Failed to fetch consultation for appointment ${appointmentId}:`, error.message);
    return null;
  }

  return data;
}

/**
 * Fetch consultation forms by appointment ID.
 */
export async function getConsultationForms(appointmentId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('consultation_forms')
    .select('*')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn(`Failed to fetch forms for appointment ${appointmentId}:`, error.message);
    return [];
  }

  return data || [];
}
