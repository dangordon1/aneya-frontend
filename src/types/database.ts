/**
 * Database type definitions for Aneya appointment management system
 * Matches Supabase schema
 */

export interface Patient {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  sex: 'Male' | 'Female' | 'Other';
  date_of_birth: string; // ISO date string (YYYY-MM-DD)
  height_cm: number | null;
  weight_kg: number | null;
  current_medications: string | null;
  current_conditions: string | null;
  allergies: string | null;
  email: string | null;
  phone: string | null;
  created_by: string; // UUID of user who created the patient
  archived: boolean;
}

export type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type AppointmentType = 'general' | 'follow_up' | 'emergency' | 'routine_checkup';

export interface Appointment {
  id: string;
  created_at: string;
  updated_at: string;
  patient_id: string;
  scheduled_time: string; // ISO timestamp
  duration_minutes: number;
  status: AppointmentStatus;
  appointment_type: AppointmentType;
  reason: string | null;
  notes: string | null;
  consultation_id: string | null;
  created_by: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export interface AppointmentWithPatient extends Appointment {
  patient: Patient;
}

export interface PatientWithAppointments extends Patient {
  last_visit?: {
    scheduled_time: string;
  } | null;
  next_appointment?: {
    scheduled_time: string;
    appointment_type: AppointmentType;
  } | null;
}

export interface Consultation {
  id: string;
  created_at: string;
  updated_at: string;
  appointment_id: string | null;
  patient_id: string;
  consultation_text: string; // Translated/final consultation text (English)
  original_transcript: string | null; // Original language transcript before translation
  transcription_language: string | null;
  patient_snapshot: Record<string, any> | null;
  analysis_result: Record<string, any> | null;
  diagnoses: Record<string, any>[] | null;
  guidelines_found: Record<string, any>[] | null;
  consultation_duration_seconds: number | null;
  performed_by: string;
  location_detected: string | null;
  backend_api_version: string | null;
}

export interface CreatePatientInput {
  name: string;
  sex: Patient['sex'];
  date_of_birth: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  current_medications?: string | null;
  current_conditions?: string | null;
  allergies?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface UpdatePatientInput {
  name?: string;
  sex?: Patient['sex'];
  date_of_birth?: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  current_medications?: string | null;
  current_conditions?: string | null;
  allergies?: string | null;
  email?: string | null;
  phone?: string | null;
  archived?: boolean;
}

export interface CreateAppointmentInput {
  patient_id: string;
  scheduled_time: string;
  duration_minutes: number;
  appointment_type: AppointmentType;
  reason?: string | null;
  notes?: string | null;
}

export interface UpdateAppointmentInput {
  scheduled_time?: string;
  duration_minutes?: number;
  status?: AppointmentStatus;
  appointment_type?: AppointmentType;
  reason?: string | null;
  notes?: string | null;
}

export interface CreateConsultationInput {
  patient_id: string;
  appointment_id?: string | null;
  consultation_text: string; // Translated/final consultation text (English)
  original_transcript?: string | null; // Original language transcript before translation
  transcription_language?: string | null;
  patient_snapshot?: Record<string, any> | null;
  analysis_result?: Record<string, any> | null;
  diagnoses?: Record<string, any>[] | null;
  guidelines_found?: Record<string, any>[] | null;
  consultation_duration_seconds?: number | null;
  location_detected?: string | null;
  backend_api_version?: string | null;
}
