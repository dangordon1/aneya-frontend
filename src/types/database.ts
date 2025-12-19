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
  user_id: string | null; // Firebase UID for patient portal login (null if not linked)
}

export type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type AppointmentType = 'general' | 'follow_up' | 'emergency' | 'routine_checkup';

export interface Appointment {
  id: string;
  created_at: string;
  updated_at: string;
  patient_id: string;
  doctor_id: string | null; // Reference to doctors table (null for legacy appointments)
  scheduled_time: string; // ISO timestamp
  duration_minutes: number;
  status: AppointmentStatus;
  appointment_type: AppointmentType;
  reason: string | null;
  notes: string | null;
  consultation_id: string | null;
  created_by: string;
  booked_by: 'doctor' | 'patient' | null; // Who made the booking
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
  email: string; // Required - used for patient portal login and messaging
  height_cm?: number | null;
  weight_kg?: number | null;
  current_medications?: string | null;
  current_conditions?: string | null;
  allergies?: string | null;
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
  doctor_id?: string | null;
  scheduled_time: string;
  duration_minutes: number;
  appointment_type: AppointmentType;
  reason?: string | null;
  notes?: string | null;
  booked_by?: 'doctor' | 'patient' | null;
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

// ============================================
// User Role Types
// ============================================

export type UserRole = 'user' | 'admin' | 'superadmin' | 'doctor' | 'patient';

export interface UserRoleRecord {
  id: string;
  user_id: string;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ============================================
// Doctor Types
// ============================================

export interface Doctor {
  id: string;
  user_id: string; // Firebase UID
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  license_number: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  default_appointment_duration: number;
  timezone: string;
  is_active: boolean;
  allow_patient_messages: boolean; // Whether patients can initiate messages
}

export interface CreateDoctorInput {
  name: string;
  email: string;
  phone?: string | null;
  specialty?: string | null;
  license_number?: string | null;
  clinic_name?: string | null;
  clinic_address?: string | null;
  default_appointment_duration?: number;
  timezone?: string;
}

export interface UpdateDoctorInput {
  name?: string;
  email?: string;
  phone?: string | null;
  specialty?: string | null;
  license_number?: string | null;
  clinic_name?: string | null;
  clinic_address?: string | null;
  default_appointment_duration?: number;
  timezone?: string;
  is_active?: boolean;
  allow_patient_messages?: boolean;
}

// ============================================
// Doctor Availability Types
// ============================================

export interface DoctorAvailability {
  id: string;
  doctor_id: string;
  created_at: string;
  updated_at: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string; // HH:mm:ss format from TIME column
  end_time: string; // HH:mm:ss format from TIME column
  slot_duration_minutes: number;
  is_active: boolean;
}

export interface CreateAvailabilityInput {
  day_of_week: number;
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  slot_duration_minutes?: number;
}

export interface UpdateAvailabilityInput {
  start_time?: string;
  end_time?: string;
  slot_duration_minutes?: number;
  is_active?: boolean;
}

// ============================================
// Patient-Doctor Relationship Types
// ============================================

export type PatientDoctorStatus = 'pending' | 'active' | 'inactive' | 'rejected';

export interface PatientDoctor {
  id: string;
  patient_id: string;
  doctor_id: string;
  created_at: string;
  initiated_by: 'doctor' | 'patient';
  status: PatientDoctorStatus;
}

export interface PatientDoctorWithDoctor extends PatientDoctor {
  doctor: Doctor;
}

export interface PatientDoctorWithPatient extends PatientDoctor {
  patient: Patient;
}

export interface CreatePatientDoctorInput {
  patient_id: string;
  doctor_id: string;
  initiated_by: 'doctor' | 'patient';
  status?: PatientDoctorStatus;
}

// ============================================
// Patient Invitation Types
// ============================================

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface PatientInvitation {
  id: string;
  doctor_id: string;
  email: string;
  patient_name: string | null;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  patient_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientInvitationWithDoctor extends PatientInvitation {
  doctor: Doctor;
}

export interface CreateInvitationInput {
  email: string;
  patient_name?: string | null;
}

// ============================================
// Time Slot Types (for booking)
// ============================================

export interface TimeSlot {
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
  duration_minutes: number;
  is_available: boolean;
}

export interface AvailableSlot {
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  duration_minutes: number;
}

// ============================================
// Message Types
// ============================================

export type MessageSenderType = 'doctor' | 'patient';
export type MessageType = 'text' | 'appointment_request' | 'system';

export interface Message {
  id: string;
  created_at: string;
  updated_at: string;
  sender_type: MessageSenderType;
  sender_id: string;
  recipient_type: MessageSenderType;
  recipient_id: string;
  content: string;
  read_at: string | null;
  patient_doctor_id: string | null;
  message_type: MessageType;
}

export interface MessageWithSender extends Message {
  sender_name?: string;
  sender_email?: string;
}

export interface Conversation {
  id: string; // patient_doctor_id or generated from sender/recipient
  other_party_id: string;
  other_party_name: string;
  other_party_type: MessageSenderType;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface CreateMessageInput {
  sender_type: MessageSenderType;
  sender_id: string;
  recipient_type: MessageSenderType;
  recipient_id: string;
  content: string;
  patient_doctor_id?: string | null;
  message_type?: MessageType;
}

// ============================================
// Blocked Slots Types
// ============================================

export interface BlockedSlot {
  id: string;
  doctor_id: string;
  blocked_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  reason: string | null;
  is_all_day: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBlockedSlotInput {
  blocked_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  reason?: string | null;
  is_all_day?: boolean;
}

export interface UpdateBlockedSlotInput {
  blocked_date?: string;
  start_time?: string;
  end_time?: string;
  reason?: string | null;
  is_all_day?: boolean;
}

// ============================================
// Patient Symptom Types
// ============================================

export type SymptomStatus = 'active' | 'resolved' | 'improving' | 'worsening';

export interface PatientSymptom {
  id: string;
  patient_id: string;
  symptom_text: string;
  original_transcript: string | null;
  transcription_language: string | null;
  severity: number | null; // 1-10 scale
  duration_description: string | null;
  onset_date: string | null; // YYYY-MM-DD
  body_location: string | null;
  status: SymptomStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSymptomInput {
  symptom_text: string;
  original_transcript?: string | null;
  transcription_language?: string | null;
  severity?: number | null;
  duration_description?: string | null;
  onset_date?: string | null;
  body_location?: string | null;
  status?: SymptomStatus;
  notes?: string | null;
}

export interface UpdateSymptomInput {
  symptom_text?: string;
  severity?: number | null;
  duration_description?: string | null;
  onset_date?: string | null;
  body_location?: string | null;
  status?: SymptomStatus;
  notes?: string | null;
}
