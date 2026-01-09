/**
 * Test fixtures for creating properly typed mock data
 */

import {
  Patient,
  Appointment,
  AppointmentWithPatient,
  Consultation,
  Doctor,
  MedicalSpecialtyType,
  AppointmentType,
  SummaryData,
} from '../../types/database'

// ============================================
// Patient Fixtures
// ============================================

export const createMockPatient = (overrides: Partial<Patient> = {}): Patient => ({
  id: 'pat-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  name: 'Jane Smith',
  sex: 'Female',
  date_of_birth: '1990-01-15',
  age_years: 34,
  height_cm: 165,
  weight_kg: 60,
  current_medications: null,
  current_conditions: null,
  allergies: null,
  email: 'jane@example.com',
  phone: '555-1234',
  consultation_language: 'en-IN',
  created_by: 'user-123',
  archived: false,
  user_id: null,
  ...overrides,
})

// ============================================
// Doctor Fixtures
// ============================================

export const createMockDoctor = (overrides: Partial<Doctor> = {}): Doctor => ({
  id: 'doc-456',
  user_id: 'user-456',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  name: 'Dr. Johnson',
  email: 'doc@example.com',
  phone: '555-5678',
  specialty: 'general' as MedicalSpecialtyType,
  license_number: 'MED12345',
  clinic_name: 'City Clinic',
  clinic_address: '123 Medical Street',
  clinic_logo_url: null,
  default_appointment_duration: 30,
  timezone: 'Asia/Kolkata',
  is_active: true,
  allow_patient_messages: true,
  ...overrides,
})

// ============================================
// Appointment Fixtures
// ============================================

export const createMockAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'apt-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  patient_id: 'pat-123',
  doctor_id: 'doc-456',
  scheduled_time: '2024-01-15T14:30:00Z',
  duration_minutes: 30,
  status: 'scheduled',
  appointment_type: 'general' as AppointmentType,
  specialty: 'general',
  specialty_subtype: null,
  reason: 'General checkup',
  notes: null,
  consultation_id: null,
  created_by: 'user-123',
  booked_by: 'doctor',
  cancelled_at: null,
  cancellation_reason: null,
  ...overrides,
})

export const createMockAppointmentWithPatient = (
  overrides: Partial<AppointmentWithPatient> & { patient?: Partial<Patient>; doctor?: Partial<Doctor> | null } = {}
): AppointmentWithPatient => {
  const { patient, doctor, ...appointmentOverrides } = overrides
  return {
    ...createMockAppointment(appointmentOverrides as Partial<Appointment>),
    patient: createMockPatient(patient || {}),
    doctor: doctor === null ? null : createMockDoctor(doctor || {}),
  }
}

// ============================================
// Consultation Fixtures
// ============================================

export const createMockSummaryData = (overrides: Partial<SummaryData> = {}): SummaryData => ({
  speakers: { speaker_0: 'Doctor', speaker_1: 'Patient' },
  metadata: {
    consultation_duration_seconds: 900,
    location: 'Mumbai, India',
  },
  clinical_summary: {
    chief_complaint: 'Headache for 3 days',
    history_present_illness: 'Patient presents with bilateral headache',
    assessment: 'Tension-type headache',
    plan: {
      diagnostic: ['Consider MRI if symptoms persist'],
      therapeutic: ['Paracetamol 1g QDS'],
      patient_education: ['Stress management', 'Regular sleep'],
      follow_up: '1 week if symptoms persist',
    },
    ...overrides.clinical_summary,
  },
  recommendations_given: ['Rest', 'Hydration'],
  ...overrides,
})

export const createMockConsultation = (overrides: Partial<Consultation> = {}): Consultation => ({
  id: 'cons-123',
  created_at: '2024-01-15T15:00:00Z',
  updated_at: '2024-01-15T15:00:00Z',
  appointment_id: 'apt-123',
  patient_id: 'pat-789',
  consultation_text: 'Consultation Transcript:\nPatient reports headache\n\nConsultation Summary:\nHeadache for 3 days.',
  original_transcript: null,
  translated_transcript: null,
  transcription_language: 'en-IN',
  audio_url: 'gs://bucket/audio.webm',
  patient_snapshot: {
    age: '35',
    allergies: 'NKDA',
    current_medications: 'None',
  },
  analysis_result: null,
  diagnoses: [
    {
      diagnosis: 'Tension Headache',
      confidence: 'high',
      reasoning: 'Classic presentation',
      primary_care: {
        medications: [{ name: 'Paracetamol', dose: '1g', frequency: 'QDS' }],
        supportive_care: ['Rest', 'Hydration'],
      },
    },
  ],
  guidelines_found: [{ name: 'NICE NG150' }, { name: 'CKS Headache' }],
  prescriptions: [],
  consultation_duration_seconds: 900,
  performed_by: 'doc-456',
  location_detected: 'Mumbai, India',
  backend_api_version: '1.0.0',
  summary_data: createMockSummaryData(overrides.summary_data || {}),
  transcription_status: 'completed',
  transcription_error: null,
  transcription_started_at: null,
  transcription_completed_at: null,
  ...overrides,
})

// ============================================
// Re-export types for convenience
// ============================================

export type {
  Patient,
  Appointment,
  AppointmentWithPatient,
  Consultation,
  Doctor,
  MedicalSpecialtyType,
  AppointmentType,
  SummaryData,
}
