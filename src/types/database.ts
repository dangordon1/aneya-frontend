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

// Medical Specialty Types
// Matches database enum medical_specialty_type
export type MedicalSpecialtyType =
  | 'general'
  | 'obgyn'
  | 'cardiology'
  | 'neurology'
  | 'dermatology'
  | 'other';

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

// Medical Specialties - used for dropdown UI and display labels
export const MEDICAL_SPECIALTIES: { value: MedicalSpecialtyType; label: string }[] = [
  { value: 'general', label: 'General Practice' },
  { value: 'obgyn', label: 'Obstetrics & Gynaecology' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'other', label: 'Other' },
];

export interface Patient {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  sex: 'Male' | 'Female' | 'Other';
  date_of_birth: string | null; // ISO date string (YYYY-MM-DD), nullable - can use age_years instead
  age_years: number | null; // Age in years when exact DOB is unknown
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

// Multi-specialty appointment system (2-level: Specialty → Subtype)
export type MedicalSpecialty = 'general' | 'obgyn' | 'cardiology' | 'neurology' | 'dermatology';
export type OBGYNSubtype = 'infertility' | 'antenatal' | 'general_obgyn';

// Backward compatible with existing types + new specialty subtypes
export type AppointmentType =
  | 'general'
  | 'follow_up'
  | 'emergency'
  | 'routine_checkup'
  | `obgyn_${OBGYNSubtype}`; // e.g., 'obgyn_infertility', 'obgyn_antenatal'

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
  specialty: string; // Medical specialty (general, obgyn, cardiology, etc.)
  specialty_subtype: string | null; // Specialty subtype (infertility, antenatal, general_obgyn for OBGYN)
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
  doctor?: Doctor | null;  // Optional because doctor_id can be null
}

export interface AppointmentWithPatientAndDoctor extends Appointment {
  patient: Patient;
  doctor?: Doctor;  // Optional because doctor_id can be null
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
  audio_url: string | null; // GCS URL for the consultation audio recording
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
    review_of_systems?: Record<string, string>;
    physical_examination?: string;
    investigations_ordered?: string[];
    investigations_reviewed?: string[];
    assessment?: string;
    plan?: {
      diagnostic?: string[];
      therapeutic?: string[];
      patient_education?: string[];
      follow_up?: string;
    };
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
  date_of_birth?: string | null; // Optional - can use age_years instead
  age_years?: number | null; // Age in years when exact DOB is unknown
  phone: string; // Required - primary identifier (10-digit Indian mobile)
  email?: string | null; // Optional - used for patient portal login and messaging if provided
  height_cm?: number | null;
  weight_kg?: number | null;
  current_medications?: string | null;
  current_conditions?: string | null;
  allergies?: string | null;
  consultation_language?: ConsultationLanguage;
}

export interface UpdatePatientInput {
  name?: string;
  sex?: Patient['sex'];
  date_of_birth?: string | null;
  age_years?: number | null;
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
  specialty?: string; // Medical specialty (general, obgyn, cardiology, etc.)
  specialty_subtype?: string | null; // Specialty subtype (infertility, antenatal, general_obgyn for OBGYN)
  reason?: string | null;
  notes?: string | null;
  booked_by?: 'doctor' | 'patient' | null;
}

export interface UpdateAppointmentInput {
  scheduled_time?: string;
  duration_minutes?: number;
  status?: AppointmentStatus;
  appointment_type?: AppointmentType;
  specialty?: string; // Medical specialty (general, obgyn, cardiology, etc.)
  specialty_subtype?: string | null; // Specialty subtype (infertility, antenatal, general_obgyn for OBGYN)
  reason?: string | null;
  notes?: string | null;
}

export interface CreateConsultationInput {
  patient_id: string;
  appointment_id?: string | null;
  consultation_text: string; // Translated/final consultation text (English)
  original_transcript?: string | null; // Original language transcript before translation
  transcription_language?: string | null;
  audio_url?: string | null; // GCS URL for the consultation audio recording
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
  specialty: MedicalSpecialtyType; // Medical specialty - determines which forms patients see
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
  specialty?: MedicalSpecialtyType;
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
  specialty?: MedicalSpecialtyType;
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

// ============================================
// OB/GYN Consultation Form Types
// ============================================

/** Type of consultation form - either before or during the appointment */
export type FormType = 'pre_consultation' | 'during_consultation';

/** Current status of the consultation form */
export type FormStatus = 'draft' | 'partial' | 'completed';

/** Menstrual cycle regularity status */
export type CycleRegularity = 'regular' | 'irregular' | 'absent' | 'unknown';

/** Current pregnancy status */
export type PregnancyStatus = 'not_pregnant' | 'pregnant' | 'postpartum' | 'unknown';

/** Contraception method status */
export type ContraceptionStatus = 'none' | 'hormonal' | 'barrier' | 'iud' | 'permanent' | 'other' | 'unknown';

/** Menopausal status */
export type MenopauseStatus = 'pre_menopausal' | 'perimenopausal' | 'post_menopausal' | 'unknown';

/** Parity history - whether patient has given birth */
export type ParityHistory = 'nulliparous' | 'multiparous' | 'unknown';

/** Sexual activity status */
export type SexualActivityStatus = 'active' | 'inactive' | 'unknown';

/** STI (Sexually Transmitted Infection) screening result */
export type STIScreeningResult = 'positive' | 'negative' | 'not_tested' | 'unknown';

/**
 * Vital Signs - stores patient's vital measurements
 * Stored as JSONB in database
 */
export interface VitalSigns {
  /** Systolic blood pressure (mmHg) */
  systolic_bp?: number | null;
  /** Diastolic blood pressure (mmHg) */
  diastolic_bp?: number | null;
  /** Heart rate (beats per minute) */
  heart_rate?: number | null;
  /** Respiratory rate (breaths per minute) */
  respiratory_rate?: number | null;
  /** Body temperature (°C) */
  temperature?: number | null;
  /** Oxygen saturation (%) */
  spo2?: number | null;
  /** Blood glucose level (mg/dL) */
  blood_glucose?: number | null;
}

/**
 * Physical Examination Findings - documents clinical examination results
 * Stored as JSONB in database
 */
export interface PhysicalExamFindings {
  /** General inspection and appearance */
  general_inspection?: string | null;
  /** Abdominal examination findings */
  abdominal_exam?: string | null;
  /** Speculum examination findings */
  speculum_exam?: string | null;
  /** Digital/Bimanual examination findings */
  digital_exam?: string | null;
  /** Breast examination findings */
  breast?: string | null;
  /** Any other relevant physical findings */
  other_findings?: string | null;
}

/**
 * Ultrasound Findings - documents ultrasound imaging results
 * Stored as JSONB in database
 */
export interface UltrasoundFindings {
  /** Type of ultrasound performed (e.g., 'pelvic', 'transvaginal', 'obstetric') */
  ultrasound_type?: string | null;
  /** Fetal biometry measurements (Crown-Rump Length, Biparietal Diameter, etc.) */
  fetal_biometry?: string | null;
  /** Fetal well-being (Heart rate, movements, etc.) */
  fetal_wellbeing?: string | null;
  /** Placental findings and position */
  placental_findings?: string | null;
  /** Amniotic fluid volume assessment */
  amniotic_fluid?: string | null;
  /** Any anomalies or areas of concern */
  anomalies_concerns?: string | null;
  /** Gestational age if pregnant (weeks) */
  gestational_age_weeks?: number | null;
}

/**
 * Laboratory Results - documents lab test findings
 * Stored as JSONB in database
 */
export interface LabResults {
  /** Full Blood Count findings (hemoglobin, hematocrit, WBC, platelets) */
  fbc?: string | null;
  /** Coagulation profile (PT/INR, APTT) */
  coagulation?: string | null;
  /** Blood glucose and HbA1c results */
  glucose?: string | null;
  /** Serology and STI test results */
  serology?: string | null;
  /** Pregnancy-related tests (hCG, AFP, etc.) */
  pregnancy_tests?: string | null;
  /** Other relevant lab tests */
  other_tests?: string | null;
}

/**
 * Main OB/GYN Consultation Form Interface
 * Represents a complete consultation form record in the database
 */
export interface OBGynConsultationForm {
  /** Unique identifier for the form */
  id: string;
  /** Foreign key reference to patient */
  patient_id: string;
  /** Optional reference to appointment if form was created during an appointment */
  appointment_id: string | null;
  /** Type of consultation form - pre or during consultation */
  form_type: FormType;
  /** Current status of the form */
  status: FormStatus;
  /** Timestamp when form was created */
  created_at: string;
  /** Timestamp when form was last updated */
  updated_at: string;
  /** User who created the form */
  created_by: string;
  /** User who last updated the form */
  updated_by: string;
  /** User who filled the form (doctor_id if filled by doctor on behalf of patient, null if filled by patient) */
  filled_by?: string | null;

  // ---- Demographics & Medical History ----
  /** Patient's age at time of form creation */
  age_at_form?: number | null;
  /** Menstrual cycle regularity status */
  cycle_regularity: CycleRegularity;
  /** Date of last menstrual period (YYYY-MM-DD) */
  last_menstrual_period?: string | null;
  /** Current pregnancy status */
  pregnancy_status: PregnancyStatus;
  /** Estimated date of delivery if pregnant (YYYY-MM-DD) */
  estimated_delivery_date?: string | null;
  /** Menopausal status */
  menopause_status: MenopauseStatus;
  /** Parity history (whether patient has given birth) */
  parity_history: ParityHistory;
  /** Number of living children */
  number_of_children?: number | null;
  /** Number of pregnancies */
  number_of_pregnancies?: number | null;
  /** Number of miscarriages or abortions */
  number_of_miscarriages?: number | null;

  // ---- Contraception & Sexuality ----
  /** Current contraception method being used */
  contraception_status: ContraceptionStatus;
  /** Detailed description of contraception method if applicable */
  contraception_method_details?: string | null;
  /** Patient's sexual activity status */
  sexual_activity_status: SexualActivityStatus;
  /** Number of sexual partners in past year */
  num_sexual_partners?: number | null;
  /** Satisfaction with sexual health (1-10 scale) */
  sexual_satisfaction?: number | null;

  // ---- STI & Screening ----
  /** Result of most recent STI screening */
  sti_screening_result: STIScreeningResult;
  /** Date of last STI screening (YYYY-MM-DD) */
  last_sti_screening_date?: string | null;
  /** Date of last pap smear (YYYY-MM-DD) */
  last_pap_smear_date?: string | null;
  /** Date of last mammography (YYYY-MM-DD) */
  last_mammography_date?: string | null;

  // ---- Presenting Complaints ----
  /** Chief complaint or reason for visit */
  chief_complaint?: string | null;
  /** Detailed description of current symptoms */
  symptoms_description?: string | null;
  /** Duration of current symptoms in days/weeks/months */
  symptom_duration?: string | null;
  /** Severity of symptoms (1-10 scale) */
  symptom_severity?: number | null;
  /** Pre-menstrual spotting (spotting before period begins) */
  premenstrual_spotting?: boolean | null;
  /** Post-menstrual spotting (spotting after period ends) */
  postmenstrual_spotting?: boolean | null;
  /** Post-coital bleeding (bleeding after sexual intercourse) */
  postcoital_bleeding?: boolean | null;
  /** Inter-menstrual bleeding (bleeding between periods) */
  intermenstrual_bleeding?: boolean | null;
  /** Normal menstrual flow */
  normal_menstrual_flow?: boolean | null;
  /** Heavy menstrual bleeding (menorrhagia) */
  heavy_menstrual_bleeding?: boolean | null;
  /** Light menstrual bleeding (hypomenorrhea) */
  light_menstrual_bleeding?: boolean | null;
  /** Menstrual clotting */
  menstrual_clotting?: boolean | null;

  // ---- Obstetric History (if applicable) ----
  /** History of gestational diabetes */
  gestational_diabetes_history?: boolean | null;
  /** History of preeclampsia */
  preeclampsia_history?: boolean | null;
  /** History of complicated births */
  complicated_birth_history?: boolean | null;
  /** Birth complications description */
  birth_complications_description?: string | null;

  // ---- Gynecologic Conditions ----
  /** History of fibroids/uterine myomas */
  fibroids_history?: boolean | null;
  /** History of endometriosis */
  endometriosis_history?: boolean | null;
  /** History of PCOS (Polycystic Ovary Syndrome) */
  pcos_history?: boolean | null;
  /** History of pelvic inflammatory disease */
  pelvic_inflammatory_disease_history?: boolean | null;

  // ---- Clinical Assessments ----
  /** Vital signs measurements - stored as JSONB */
  vital_signs?: VitalSigns | null;
  /** Physical examination findings - stored as JSONB */
  physical_exam_findings?: PhysicalExamFindings | null;
  /** Ultrasound findings if performed - stored as JSONB */
  ultrasound_findings?: UltrasoundFindings | null;
  /** Laboratory results - stored as JSONB */
  lab_results?: LabResults | null;

  // ---- Clinical Diagnosis & Plan ----
  /** Working diagnosis or clinical impression */
  diagnosis?: string | null;
  /** Clinical diagnosis text */
  clinical_diagnosis?: string | null;
  /** Treatment plan and recommendations */
  treatment_plan?: string | null;
  /** Medications prescribed or recommended */
  medications?: string | null;
  /** Medications prescribed or recommended (alternative field) */
  medications_prescribed?: string | null;
  /** Follow-up appointment date */
  follow_up_date?: string | null;
  /** Follow-up recommendations */
  follow_up_recommendations?: string | null;
  /** Clinical notes and additional observations */
  clinical_notes?: string | null;
}

/**
 * Input type for creating new OB/GYN consultation forms
 * All fields are optional to support progressive form filling
 */
export interface CreateOBGynFormInput {
  appointment_id?: string | null;
  form_type: FormType;
  status?: FormStatus;
  filled_by?: string | null;
  age_at_form?: number | null;
  cycle_regularity?: CycleRegularity;
  cycle_length_days?: number | null;
  last_menstrual_period?: string | null;
  pregnancy_status?: PregnancyStatus;
  estimated_delivery_date?: string | null;
  menopause_status?: MenopauseStatus;
  parity_history?: ParityHistory;
  number_of_children?: number | null;
  number_of_pregnancies?: number | null;
  number_of_miscarriages?: number | null;
  contraception_status?: ContraceptionStatus;
  contraception_method_details?: string | null;
  sexual_activity_status?: SexualActivityStatus;
  num_sexual_partners?: number | null;
  sexual_satisfaction?: number | null;
  sti_screening_result?: STIScreeningResult;
  last_sti_screening_date?: string | null;
  last_pap_smear_date?: string | null;
  last_mammography_date?: string | null;
  chief_complaint?: string | null;
  symptoms_description?: string | null;
  symptom_duration?: string | null;
  symptom_severity?: number | null;
  premenstrual_spotting?: boolean | null;
  postmenstrual_spotting?: boolean | null;
  postcoital_bleeding?: boolean | null;
  intermenstrual_bleeding?: boolean | null;
  normal_menstrual_flow?: boolean | null;
  heavy_menstrual_bleeding?: boolean | null;
  light_menstrual_bleeding?: boolean | null;
  menstrual_clotting?: boolean | null;
  gestational_diabetes_history?: boolean | null;
  preeclampsia_history?: boolean | null;
  complicated_birth_history?: boolean | null;
  birth_complications_description?: string | null;
  fibroids_history?: boolean | null;
  endometriosis_history?: boolean | null;
  pcos_history?: boolean | null;
  pelvic_inflammatory_disease_history?: boolean | null;
  vital_signs?: VitalSigns | null;
  physical_exam_findings?: PhysicalExamFindings | null;
  ultrasound_findings?: UltrasoundFindings | null;
  lab_results?: LabResults | null;
  diagnosis?: string | null;
  clinical_diagnosis?: string | null;
  treatment_plan?: string | null;
  medications?: string | null;
  medications_prescribed?: string | null;
  follow_up_date?: string | null;
  follow_up_recommendations?: string | null;
  clinical_notes?: string | null;
}

/**
 * Input type for updating existing OB/GYN consultation forms
 * All fields are optional - only include fields to be updated
 */
export interface UpdateOBGynFormInput {
  form_type?: FormType;
  status?: FormStatus;
  filled_by?: string | null;
  age_at_form?: number | null;
  cycle_regularity?: CycleRegularity;
  last_menstrual_period?: string | null;
  pregnancy_status?: PregnancyStatus;
  estimated_delivery_date?: string | null;
  menopause_status?: MenopauseStatus;
  parity_history?: ParityHistory;
  number_of_children?: number | null;
  number_of_pregnancies?: number | null;
  number_of_miscarriages?: number | null;
  contraception_status?: ContraceptionStatus;
  contraception_method_details?: string | null;
  sexual_activity_status?: SexualActivityStatus;
  num_sexual_partners?: number | null;
  sexual_satisfaction?: number | null;
  sti_screening_result?: STIScreeningResult;
  last_sti_screening_date?: string | null;
  last_pap_smear_date?: string | null;
  last_mammography_date?: string | null;
  chief_complaint?: string | null;
  symptoms_description?: string | null;
  symptom_duration?: string | null;
  symptom_severity?: number | null;
  premenstrual_spotting?: boolean | null;
  postmenstrual_spotting?: boolean | null;
  postcoital_bleeding?: boolean | null;
  intermenstrual_bleeding?: boolean | null;
  normal_menstrual_flow?: boolean | null;
  heavy_menstrual_bleeding?: boolean | null;
  light_menstrual_bleeding?: boolean | null;
  menstrual_clotting?: boolean | null;
  gestational_diabetes_history?: boolean | null;
  preeclampsia_history?: boolean | null;
  complicated_birth_history?: boolean | null;
  birth_complications_description?: string | null;
  fibroids_history?: boolean | null;
  endometriosis_history?: boolean | null;
  pcos_history?: boolean | null;
  pelvic_inflammatory_disease_history?: boolean | null;
  vital_signs?: VitalSigns | null;
  physical_exam_findings?: PhysicalExamFindings | null;
  ultrasound_findings?: UltrasoundFindings | null;
  lab_results?: LabResults | null;
  diagnosis?: string | null;
  clinical_diagnosis?: string | null;
  treatment_plan?: string | null;
  medications?: string | null;
  medications_prescribed?: string | null;
  follow_up_date?: string | null;
  follow_up_recommendations?: string | null;
  clinical_notes?: string | null;
}

// ============================================
// Infertility Forms (Multi-Specialty System)
// ============================================

/** Infertility type classification */
export type InfertilityType = 'primary' | 'secondary';

/** Sexual frequency for infertility assessment */
export type SexualFrequency = 'daily' | 'weekly' | 'monthly' | 'rarely';

/** IVF cycle outcome */
export type IVFOutcome = 'pregnant' | 'not_pregnant' | 'miscarriage';

/**
 * Infertility Form - Main interface
 * Uses JSONB storage for flexibility (no schema updates needed)
 */
export interface InfertilityForm {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  form_type: FormType; // 'pre_consultation' | 'during_consultation'
  status: FormStatus; // 'draft' | 'partial' | 'completed'
  filled_by: string | null; // NULL if patient, doctor user_id if doctor-filled
  vitals_record_id: string | null; // Reference to shared patient_vitals table
  infertility_data: InfertilityFormData; // JSONB
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

/**
 * Infertility Form Data Structure (stored in JSONB)
 * Flexible schema - can add fields without migrations
 */
export interface InfertilityFormData {
  // Infertility Type
  infertility_type?: InfertilityType | string;

  // Basic Information (Pre-Consultation Form fields)
  duration_of_marriage?: number | string;
  consanguinity?: string;
  contraception_used?: string;

  // Menstrual History (flattened for form compatibility)
  lmp?: string; // ISO date (YYYY-MM-DD)
  duration_attempting_pregnancy?: number | string;
  menstrual_cycle?: string; // 'regular' | 'irregular'
  duration_of_flow?: number | string;
  dysmenorrhoea?: string; // 'mild' | 'moderate' | 'severe' | 'none'

  // Menstrual History (detailed - some overlap with generic obgyn)
  menstrual_history?: {
    lmp?: string; // ISO date (YYYY-MM-DD)
    cycle_length_days?: number;
    cycle_regularity?: CycleRegularity;
    bleeding_pattern?: {
      normal_flow?: boolean;
      heavy_bleeding?: boolean;
      light_bleeding?: boolean;
      menstrual_clotting?: boolean;
      premenstrual_spotting?: boolean;
      postmenstrual_spotting?: boolean;
      postcoital_bleeding?: boolean;
      intermenstrual_bleeding?: boolean;
    };
  };

  // Complaints
  complaints?: {
    impotence?: boolean;
    apareunia?: boolean;
    premature_ejaculation?: boolean;
    retrograde_ejaculation?: boolean;
    vaginismus?: boolean;
    dyspareunia?: boolean;
    others?: string;
  };

  // Obstetric History
  obstetric_history?: {
    gravida?: number | string;
    para?: number | string;
    live_births?: number | string; // NEW - L
    abortions?: number | string;
    deaths?: number | string; // NEW - D
  };
  previous_obstetric_history?: string; // Textarea for detailed history

  // Sexual History
  sexual_history?: {
    frequency?: SexualFrequency;
    satisfaction?: number; // 1-10 scale
    dyspareunia?: boolean; // pain during intercourse
    dyspareunia_description?: string;
  };

  // Medical History (Wife - specialized for infertility)
  medical_history?: {
    diabetes?: boolean;
    hypertension?: boolean;
    thyroid?: boolean;
    asthma?: boolean;
    tuberculosis?: boolean;
    cancer?: boolean; // NEW
    hepa_b?: boolean; // NEW
    alcohol?: boolean; // NEW
    smoking?: boolean; // NEW
    exercise?: boolean; // NEW
    recreational_drugs?: boolean; // NEW
    thyroid_disorder?: boolean; // Legacy field
    pcos?: boolean;
    endometriosis?: boolean;
    others_checked?: boolean;
    others?: string;
    previous_surgeries?: string[];
  };

  // Husband Medical History (NEW)
  husband_medical_history?: {
    diabetes?: boolean;
    hypertension?: boolean;
    thyroid?: boolean;
    asthma?: boolean;
    tuberculosis?: boolean;
    cancer?: boolean;
    hepa_b?: boolean;
    alcohol?: boolean;
    smoking?: boolean;
    exercise?: boolean;
    recreational_drugs?: boolean;
    others_checked?: boolean;
    others?: string;
  };

  // Previous Treatment
  previous_treatment?: {
    ovulation_induction?: boolean;
    cycles?: number | string; // Generic cycles count
    iui_cycles?: number;
    ivf_cycles?: number;
    ivf_outcomes?: Array<{
      cycle_number: number;
      outcome: IVFOutcome;
      date?: string;
    }>;
  };

  // Previous Surgeries (flat field for form)
  previous_surgeries?: string;

  // Family History
  family_history?: string;

  // General History (NEW)
  general_history?: string;

  // Immunization History (NEW)
  immunization_history?: string;

  // Investigations (form-compatible structure)
  investigations?: {
    hb?: number | string;
    rbs?: number | string;
    hiv_hbsag_hcv?: string;
    tb_bactec_cis?: string;
    tsh?: number | string;
    prl?: number | string;
    e2?: number | string;
    cbc?: string;
    ogt_tha_c?: string;
    findings?: string;
    // Detailed structure (optional)
    hormones?: {
      fsh?: number;
      lh?: number;
      amh?: number;
      prolactin?: number;
      thyroid?: {
        tsh?: number;
        t3?: number;
        t4?: number;
      };
    };
    ultrasound?: {
      date?: string;
      findings?: string;
      antral_follicle_count?: number;
    };
    hsg?: {
      date?: string;
      findings?: string;
      tubes_patent?: boolean;
    };
    semen_analysis?: {
      date?: string;
      count?: number; // million/mL
      motility?: number; // percentage
      morphology?: number; // percentage normal
    };
  };

  // Treatment Cycles (tracking table)
  treatment_cycles?: Array<{
    date?: string;
    cycle_type?: string; // IUI, IVF, etc.
    medications?: string;
    outcome?: string;
    notes?: string;
  }>;
}

/**
 * Input type for creating new infertility forms
 */
export interface CreateInfertilityFormInput {
  patient_id: string;
  appointment_id?: string | null;
  form_type: FormType;
  status?: FormStatus;
  filled_by?: string | null;
  vitals_record_id?: string | null;
  infertility_data: Partial<InfertilityFormData>;
}

/**
 * Input type for updating existing infertility forms
 */
export interface UpdateInfertilityFormInput {
  form_type?: FormType;
  status?: FormStatus;
  filled_by?: string | null;
  vitals_record_id?: string | null;
  infertility_data?: Partial<InfertilityFormData>;
}

// ============================================
// Antenatal (ANC) Form Types
// ============================================

export interface PreviousPregnancy {
  pregnancy_num: number; // I, II, III, etc.
  mode_of_conception?: 'natural' | 'ivf' | 'iui' | 'other';
  mode_of_delivery?: 'normal' | 'lscs' | 'forceps' | 'vacuum' | 'abortion';
  sex?: 'M' | 'F';
  age?: number; // Current age of child
  alive?: boolean;
  abortion?: boolean;
  birth_weight_kg?: number;
  year?: number;
  breastfeeding_months?: number;
  anomalies?: string;
  complications?: string;
}

export interface RiskFactors {
  previous_lscs?: boolean;
  previous_pph?: boolean;
  pih?: boolean; // Pregnancy-Induced Hypertension
  gdm?: boolean; // Gestational Diabetes Mellitus
  previous_stillbirth?: boolean;
  previous_preterm?: boolean;
  anemia?: boolean;
  heart_disease?: boolean;
  thyroid?: boolean;
  other_conditions?: string;
}

export type USGScanType = 'dating' | 'nt_scan' | 'anomaly' | 'growth1' | 'growth2' | 'growth3' | 'other';

export interface USGScan {
  scan_type: USGScanType;
  date: string; // ISO date
  ga_weeks?: number; // Gestational age at scan
  findings?: string;
  crl?: number; // Crown-Rump Length (mm) - Dating scan
  nt_thickness?: number; // Nuchal Translucency (mm) - NT scan
  nasal_bone?: boolean; // NT scan
  efw?: number; // Estimated Fetal Weight (grams) - Growth scans
  afi?: number; // Amniotic Fluid Index
  position?: 'cephalic' | 'breech' | 'transverse';
  anatomical_survey?: string; // Anomaly scan details
  anomalies?: string;
}

export interface DopplerStudy {
  date: string;
  umbilical_artery?: string;
  middle_cerebral_artery?: string;
  uterine_artery?: string;
  findings?: string;
}

export interface NSTTest {
  date: string;
  result?: 'reactive' | 'non_reactive';
  notes?: string;
}

export interface LabInvestigations {
  first_trimester?: {
    hemoglobin?: number;
    blood_group?: string;
    rh_factor?: string;
    vdrl?: string;
    hiv?: string;
    hbsag?: string;
    blood_sugar?: number;
  };
  second_trimester?: {
    hemoglobin?: number;
    triple_marker?: string;
    quadruple_marker?: string;
    gtt?: number; // Glucose Tolerance Test
  };
  third_trimester?: {
    hemoglobin?: number;
    blood_sugar?: number;
    repeat_hiv?: string;
    repeat_hbsag?: string;
  };
}

export interface BirthPlan {
  mode_of_delivery?: 'normal' | 'elective_lscs' | 'emergency_lscs' | 'instrumental';
  ga_at_delivery?: number; // Gestational age (weeks)
  iol_plan?: string; // Induction of Labour plan
  epidural?: boolean;
  support_person?: string;
  episiotomy?: 'yes' | 'no' | 'as_needed';
  breastfeeding_plan?: string;
}

export interface Referral {
  date: string;
  referred_to: string; // Specialist/Hospital
  reason: string;
  outcome?: string;
}

export interface AntenatalForm {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  form_type: FormType;
  status: FormStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  filled_by: string | null;

  // Current Pregnancy
  lmp?: string | null;
  edd?: string | null; // Calculated EDD from LMP
  scan_edd?: string | null; // EDD from ultrasound scan
  clinical_edd?: string | null; // EDD from clinical examination
  gestational_age_weeks?: number | null;
  gravida?: number | null;
  para?: number | null;
  live?: number | null;
  abortions?: number | null;

  // Marriage & Social History
  marriage_date?: string | null; // Date of marriage (or year)
  cohabitation_period_months?: number | null; // Period of cohabitation in months
  consanguinity?: 'consanguineous' | 'non_consanguineous' | null; // Consanguineous marriage status

  // Partner Details
  partner_name?: string | null;
  partner_blood_group?: string | null;
  partner_medical_history?: Record<string, any> | null;

  // Obstetric History
  previous_pregnancies?: PreviousPregnancy[] | null;

  // Risk Factors
  risk_factors?: RiskFactors | null;

  // Medical/Surgical/Family History
  medical_history?: Record<string, any> | null;
  surgical_history?: string | null;
  family_history?: Record<string, any> | null;

  // Gynecological History
  menstrual_history?: Record<string, any> | null;
  contraception_history?: string | null;

  // Immunization
  immunization_status?: Record<string, any> | null;

  // Current Symptoms
  current_symptoms?: string | null;
  complaints?: string | null;

  // USG Scans
  usg_scans?: USGScan[] | null;

  // Antepartum Surveillance
  doppler_studies?: DopplerStudy[] | null;
  nst_tests?: NSTTest[] | null;
  other_surveillance?: Record<string, any> | null;

  // Lab Investigations
  lab_investigations?: LabInvestigations | null;

  // Birth Plan
  birth_plan?: BirthPlan | null;

  // Plan of Management
  plan_mother?: string | null;
  plan_fetus?: string | null;

  // Hospitalization & Follow-up
  admission_date?: string | null;
  followup_plan?: string | null;
  postpartum_visits?: string | null;

  // Referrals
  referrals?: Referral[] | null;
}

export interface AntenatalVisit {
  id: string;
  antenatal_form_id: string;
  patient_id: string;
  appointment_id: string | null;
  visit_number: number;
  visit_date: string;
  created_at: string;
  updated_at: string;
  created_by: string;

  gestational_age_weeks?: number | null;
  weight_kg?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  fundal_height_cm?: number | null;
  presentation?: 'cephalic' | 'breech' | 'transverse' | null;
  fetal_heart_rate?: number | null;
  urine_albumin?: string | null;
  urine_sugar?: string | null;
  edema?: boolean | null;
  edema_location?: string | null;
  remarks?: string | null;
  complaints?: string | null;
  clinical_notes?: string | null;
  treatment_given?: string | null;
  next_visit_plan?: string | null;
}

export interface CreateAntenatalFormInput {
  appointment_id?: string | null;
  form_type: FormType;
  status?: FormStatus;
  filled_by?: string | null;
  lmp?: string | null;
  edd?: string | null;
  scan_edd?: string | null;
  clinical_edd?: string | null;
  gestational_age_weeks?: number | null;
  gravida?: number | null;
  para?: number | null;
  live?: number | null;
  abortions?: number | null;
  marriage_date?: string | null;
  cohabitation_period_months?: number | null;
  consanguinity?: 'consanguineous' | 'non_consanguineous' | null;
  partner_name?: string | null;
  partner_blood_group?: string | null;
  partner_medical_history?: Record<string, any> | null;
  previous_pregnancies?: PreviousPregnancy[] | null;
  risk_factors?: RiskFactors | null;
  medical_history?: Record<string, any> | null;
  surgical_history?: string | null;
  family_history?: Record<string, any> | null;
  menstrual_history?: Record<string, any> | null;
  contraception_history?: string | null;
  immunization_status?: Record<string, any> | null;
  current_symptoms?: string | null;
  complaints?: string | null;
  usg_scans?: USGScan[] | null;
  doppler_studies?: DopplerStudy[] | null;
  nst_tests?: NSTTest[] | null;
  other_surveillance?: Record<string, any> | null;
  lab_investigations?: LabInvestigations | null;
  birth_plan?: BirthPlan | null;
  plan_mother?: string | null;
  plan_fetus?: string | null;
  admission_date?: string | null;
  followup_plan?: string | null;
  postpartum_visits?: string | null;
  referrals?: Referral[] | null;
}

export interface UpdateAntenatalFormInput extends Partial<CreateAntenatalFormInput> {
  status?: FormStatus;
}

export interface CreateAntenatalVisitInput {
  antenatal_form_id: string;
  visit_number: number;
  visit_date: string;
  gestational_age_weeks?: number | null;
  weight_kg?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  fundal_height_cm?: number | null;
  presentation?: 'cephalic' | 'breech' | 'transverse' | null;
  fetal_heart_rate?: number | null;
  urine_albumin?: string | null;
  urine_sugar?: string | null;
  edema?: boolean | null;
  edema_location?: string | null;
  remarks?: string | null;
  complaints?: string | null;
  clinical_notes?: string | null;
  treatment_given?: string | null;
  next_visit_plan?: string | null;
}

export interface UpdateAntenatalVisitInput extends Partial<CreateAntenatalVisitInput> {}
