/**
 * Database type definitions for Aneya appointment management system
 * Matches Supabase schema
 */

// Supported consultation languages
// Sarvam AI languages use their codes, others fall back to ElevenLabs
export type ConsultationLanguage =
  | 'auto'    // Auto-detect - ElevenLabs (worse for Indian languages)
  | 'en-IN'   // English (India) - Sarvam
  | 'hi-IN'   // Hindi - Sarvam
  | 'bn-IN'   // Bengali - Sarvam
  | 'gu-IN'   // Gujarati - Sarvam
  | 'kn-IN'   // Kannada - Sarvam
  | 'ml-IN'   // Malayalam - Sarvam
  | 'mr-IN'   // Marathi - Sarvam
  | 'od-IN'   // Odia - Sarvam
  | 'pa-IN'   // Punjabi - Sarvam
  | 'ta-IN'   // Tamil - Sarvam
  | 'te-IN'   // Telugu - Sarvam
  | 'other';  // Other languages - ElevenLabs

export const CONSULTATION_LANGUAGES: { code: ConsultationLanguage; name: string; provider: 'sarvam' | 'elevenlabs'; warning?: string }[] = [
  { code: 'auto', name: 'Auto-detect', provider: 'elevenlabs', warning: 'Reduced accuracy for Indian languages' },
  { code: 'en-IN', name: 'English (India)', provider: 'sarvam' },
  { code: 'hi-IN', name: 'Hindi', provider: 'sarvam' },
  { code: 'bn-IN', name: 'Bengali', provider: 'sarvam' },
  { code: 'gu-IN', name: 'Gujarati', provider: 'sarvam' },
  { code: 'kn-IN', name: 'Kannada', provider: 'sarvam' },
  { code: 'ml-IN', name: 'Malayalam', provider: 'sarvam' },
  { code: 'mr-IN', name: 'Marathi', provider: 'sarvam' },
  { code: 'od-IN', name: 'Odia', provider: 'sarvam' },
  { code: 'pa-IN', name: 'Punjabi', provider: 'sarvam' },
  { code: 'ta-IN', name: 'Tamil', provider: 'sarvam' },
  { code: 'te-IN', name: 'Telugu', provider: 'sarvam' },
  { code: 'other', name: 'Other Language', provider: 'elevenlabs' },
];

// Helper to check if a language uses Sarvam
export const isSarvamLanguage = (lang: ConsultationLanguage): boolean => {
  return lang !== 'other' && lang !== 'auto';
};

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
  consultation_language: ConsultationLanguage; // Preferred language for consultations
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
  analysis_result: Record<string, any> | null; // AI analysis - null until analyze is called
  diagnoses: Record<string, any>[] | null; // AI diagnoses - empty until analyze is called
  guidelines_found: Record<string, any>[] | null; // AI guidelines - empty until analyze is called
  consultation_duration_seconds: number | null;
  performed_by: string;
  location_detected: string | null;
  backend_api_version: string | null;
  summary_data?: SummaryData | null; // Full summarization data
}

// Summary data returned from /api/summarize endpoint
export interface SummaryData {
  speakers?: Record<string, string>;
  metadata?: {
    consultation_duration_seconds?: number;
    location?: string;
    patient_info?: Record<string, any>;
  };
  timeline?: Array<{
    time?: string;
    event?: string;
    details?: string;
  }>;
  clinical_summary?: {
    chief_complaint?: string;
    history_present_illness?: string;
    physical_examination?: string;
    assessment?: string;
    plan?: string;
  };
  key_concerns?: string[];
  recommendations_given?: string[];
  follow_up?: string;
}

// Unified consultation data format from /api/summarize
export interface ConsultationDataFromSummary {
  consultation_text: string;
  original_transcript: string | null;
  transcription_language: string | null;
  patient_snapshot: Record<string, any>;
  analysis_result: null; // NA until analyze is called
  diagnoses: []; // Empty until analyze is called
  guidelines_found: []; // Empty until analyze is called
  consultation_duration_seconds: number | null;
  location_detected: string | null;
  backend_api_version: string;
  summary_data: SummaryData;
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
  consultation_language?: ConsultationLanguage;
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
  consultation_language?: ConsultationLanguage;
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
  analysis_result?: Record<string, any> | null; // AI analysis - null until analyze is called
  diagnoses?: Record<string, any>[] | null; // AI diagnoses - empty until analyze is called
  guidelines_found?: Record<string, any>[] | null; // AI guidelines - empty until analyze is called
  consultation_duration_seconds?: number | null;
  location_detected?: string | null;
  backend_api_version?: string | null;
  summary_data?: SummaryData | null; // Full summarization data from /api/summarize
}
