import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const Body_upload_clinic_logo_api_doctor_logo_upload_post = z
  .object({ file: z.instanceof(File) })
  .passthrough();
const LogoUploadResponse = z
  .object({
    success: z.boolean(),
    clinic_logo_url: z.union([z.string(), z.null()]).optional(),
    message: z.string(),
  })
  .passthrough();
const ValidationError = z
  .object({
    loc: z.array(z.union([z.string(), z.number()])),
    msg: z.string(),
    type: z.string(),
  })
  .passthrough();
const HTTPValidationError = z
  .object({ detail: z.array(ValidationError) })
  .partial()
  .passthrough();
const LogoDeleteResponse = z
  .object({ success: z.boolean(), message: z.string() })
  .passthrough();
const LogoCurrentResponse = z
  .object({ clinic_logo_url: z.union([z.string(), z.null()]) })
  .partial()
  .passthrough();
const Body_upload_custom_form_api_custom_forms_upload_post = z
  .object({
    form_name: z.string(),
    specialty: z.string(),
    description: z.union([z.string(), z.null()]).optional(),
    is_public: z.boolean().optional().default(false),
    files: z.array(z.instanceof(File)),
  })
  .passthrough();
const FormExtractionResponse = z
  .object({
    success: z.boolean(),
    form_name: z.string(),
    specialty: z.string(),
    form_schema: z.object({}).partial().passthrough(),
    pdf_template: z.object({}).partial().passthrough(),
    patient_criteria: z.string().optional().default(""),
    metadata: z.object({}).partial().passthrough(),
    error: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const SaveFormRequest = z
  .object({
    form_name: z.string(),
    specialty: z.string(),
    form_schema: z.object({}).partial().passthrough(),
    pdf_template: z.object({}).partial().passthrough(),
    description: z.union([z.string(), z.null()]).optional(),
    patient_criteria: z.string(),
    is_public: z.boolean().optional().default(false),
    metadata: z
      .union([z.object({}).partial().passthrough(), z.null()])
      .optional(),
  })
  .passthrough();
const CustomFormResponse = z
  .object({
    id: z.string(),
    form_name: z.string(),
    specialty: z.string(),
    description: z.union([z.string(), z.null()]),
    patient_criteria: z.union([z.string(), z.null()]).optional(),
    created_by: z.string(),
    is_public: z.boolean(),
    status: z.string(),
    version: z.number().int(),
    field_count: z.number().int(),
    section_count: z.number().int(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();
const PreviewPDFRequest = z
  .object({
    form_name: z.string(),
    form_schema: z.object({}).partial().passthrough(),
    pdf_template: z.object({}).partial().passthrough(),
    clinic_logo_url: z.union([z.string(), z.null()]).optional(),
    clinic_name: z.union([z.string(), z.null()]).optional(),
    primary_color: z.union([z.string(), z.null()]).optional(),
    accent_color: z.union([z.string(), z.null()]).optional(),
    text_color: z.union([z.string(), z.null()]).optional(),
    light_gray_color: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const specialty = z.union([z.string(), z.null()]).optional();
const Body_select_form_for_consultation_api_custom_forms_select_form_for_consultation_post =
  z
    .object({ specialty: z.string(), patient_context: z.string() })
    .passthrough();
export const HealthResponse = z
  .object({
    status: z.string(),
    message: z.string(),
    branch: z.string().optional().default("unknown"),
  })
  .passthrough();
export const AnalysisRequest = z
  .object({
    consultation: z.string(),
    patient_id: z.union([z.string(), z.null()]).optional(),
    patient_name: z.union([z.string(), z.null()]).optional(),
    patient_age: z.union([z.string(), z.null()]).optional(),
    patient_sex: z.union([z.string(), z.null()]).optional(),
    patient_height: z.union([z.string(), z.null()]).optional(),
    patient_weight: z.union([z.string(), z.null()]).optional(),
    current_medications: z.union([z.string(), z.null()]).optional(),
    current_conditions: z.union([z.string(), z.null()]).optional(),
    allergies: z.union([z.string(), z.null()]).optional(),
    user_ip: z.union([z.string(), z.null()]).optional(),
    location_override: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const Body_diarize_audio_api_diarize_post = z
  .object({ audio: z.instanceof(File) })
  .passthrough();
const num_speakers = z.union([z.number(), z.null()]).optional();
const Body_diarize_audio_sarvam_api_diarize_sarvam_post = z
  .object({ audio: z.instanceof(File) })
  .passthrough();
export const SpeakerRoleRequest = z
  .object({
    segments: z.array(z.object({}).partial().passthrough()),
    language: z.union([z.string(), z.null()]).optional().default("en-IN"),
  })
  .passthrough();
export const RerunTranscriptionRequest = z
  .object({
    consultation_id: z.string(),
    language: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const Body_diarize_audio_chunk_api_diarize_chunk_post = z
  .object({
    audio: z.instanceof(File),
    chunk_index: z.number().int().optional().default(0),
    chunk_start: z.number().optional().default(0),
    chunk_end: z.number().optional().default(30),
    num_speakers: z.union([z.number(), z.null()]).optional(),
    diarization_threshold: z.number().optional().default(0.22),
    language: z.union([z.string(), z.null()]).optional(),
    appointment_id: z.union([z.string(), z.null()]).optional(),
    patient_id: z.union([z.string(), z.null()]).optional(),
    appointment_type: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const Body_process_final_chunk_async_api_process_final_chunk_async_post = z
  .object({
    consultation_id: z.string(),
    audio: z.instanceof(File),
    chunk_index: z.number().int().optional().default(0),
    chunk_start: z.number().optional().default(0),
    chunk_end: z.number().optional().default(30),
    language: z.union([z.string(), z.null()]).optional(),
    num_speakers: z.union([z.number(), z.null()]).optional(),
    diarization_threshold: z.number().optional().default(0.22),
  })
  .passthrough();
const Body_transcribe_audio_api_transcribe_post = z
  .object({ audio: z.instanceof(File) })
  .passthrough();
const Body_upload_audio_to_gcs_api_upload_audio_post = z
  .object({ audio: z.instanceof(File) })
  .passthrough();
export const SendInvitationEmailRequest = z
  .object({
    email: z.string(),
    patient_name: z.union([z.string(), z.null()]).optional(),
    doctor_name: z.string(),
    invitation_token: z.string(),
    invitation_url: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const PasswordResetRequest = z.object({ email: z.string() }).passthrough();
export const StructureSymptomRequest = z
  .object({
    symptom_text: z.string(),
    original_transcript: z.union([z.string(), z.null()]).optional(),
    transcription_language: z.union([z.string(), z.null()]).optional(),
    patient_id: z.string(),
  })
  .passthrough();
export const OBGYNFormCreateRequest = z
  .object({
    patient_id: z.string(),
    appointment_id: z.union([z.string(), z.null()]).optional(),
    form_data: z.object({}).partial().passthrough(),
    status: z.string().optional().default("draft"),
  })
  .passthrough();
export const OBGYNFormResponse = z
  .object({
    id: z.string(),
    patient_id: z.string(),
    appointment_id: z.union([z.string(), z.null()]).optional(),
    form_data: z.object({}).partial().passthrough(),
    status: z.string(),
    created_at: z.union([z.string(), z.null()]).optional(),
    updated_at: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
export const OBGYNFormUpdateRequest = z
  .object({
    form_data: z.object({}).partial().passthrough(),
    status: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
const OBGYNFormSectionRequest = z
  .object({
    section_name: z.string(),
    section_data: z.object({}).partial().passthrough(),
    patient_id: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
export const PatientVitalsCreate = z
  .object({
    patient_id: z.string(),
    appointment_id: z.union([z.string(), z.null()]).optional(),
    consultation_form_id: z.union([z.string(), z.null()]).optional(),
    consultation_form_type: z.union([z.string(), z.null()]).optional(),
    systolic_bp: z.union([z.number(), z.null()]).optional(),
    diastolic_bp: z.union([z.number(), z.null()]).optional(),
    heart_rate: z.union([z.number(), z.null()]).optional(),
    respiratory_rate: z.union([z.number(), z.null()]).optional(),
    temperature_celsius: z.union([z.number(), z.null()]).optional(),
    spo2: z.union([z.number(), z.null()]).optional(),
    blood_glucose_mg_dl: z.union([z.number(), z.null()]).optional(),
    weight_kg: z.union([z.number(), z.null()]).optional(),
    height_cm: z.union([z.number(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
    source_form_status: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
export const PatientVitalsResponse = z
  .object({
    id: z.string(),
    patient_id: z.string(),
    recorded_at: z.string(),
    recorded_by: z.union([z.string(), z.null()]).optional(),
    appointment_id: z.union([z.string(), z.null()]).optional(),
    systolic_bp: z.union([z.number(), z.null()]).optional(),
    diastolic_bp: z.union([z.number(), z.null()]).optional(),
    heart_rate: z.union([z.number(), z.null()]).optional(),
    respiratory_rate: z.union([z.number(), z.null()]).optional(),
    temperature_celsius: z.union([z.number(), z.null()]).optional(),
    spo2: z.union([z.number(), z.null()]).optional(),
    blood_glucose_mg_dl: z.union([z.number(), z.null()]).optional(),
    weight_kg: z.union([z.number(), z.null()]).optional(),
    height_cm: z.union([z.number(), z.null()]).optional(),
    bmi: z.union([z.number(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();
export const PatientMedicationCreate = z
  .object({
    patient_id: z.string(),
    medication_name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    route: z.union([z.string(), z.null()]).optional(),
    started_date: z.union([z.string(), z.null()]).optional(),
    stopped_date: z.union([z.string(), z.null()]).optional(),
    status: z.string().optional().default("active"),
    appointment_id: z.union([z.string(), z.null()]).optional(),
    indication: z.union([z.string(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
export const PatientMedicationResponse = z
  .object({
    id: z.string(),
    patient_id: z.string(),
    medication_name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    route: z.union([z.string(), z.null()]).optional(),
    started_date: z.string(),
    stopped_date: z.union([z.string(), z.null()]).optional(),
    status: z.string(),
    prescribed_by: z.union([z.string(), z.null()]).optional(),
    prescribed_at: z.union([z.string(), z.null()]).optional(),
    appointment_id: z.union([z.string(), z.null()]).optional(),
    indication: z.union([z.string(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();
export const PatientAllergyCreate = z
  .object({
    patient_id: z.string(),
    allergen: z.string(),
    allergen_category: z.union([z.string(), z.null()]).optional(),
    reaction: z.union([z.string(), z.null()]).optional(),
    severity: z.union([z.string(), z.null()]).optional(),
    onset_date: z.union([z.string(), z.null()]).optional(),
    status: z.string().optional().default("active"),
    notes: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
export const PatientAllergyResponse = z
  .object({
    id: z.string(),
    patient_id: z.string(),
    allergen: z.string(),
    allergen_category: z.union([z.string(), z.null()]).optional(),
    reaction: z.union([z.string(), z.null()]).optional(),
    severity: z.union([z.string(), z.null()]).optional(),
    onset_date: z.union([z.string(), z.null()]).optional(),
    status: z.string(),
    recorded_by: z.union([z.string(), z.null()]).optional(),
    recorded_at: z.union([z.string(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();
const status = z.union([z.string(), z.null()]).optional().default("active");
export const PatientConditionCreate = z
  .object({
    patient_id: z.string(),
    condition_name: z.string(),
    icd10_code: z.union([z.string(), z.null()]).optional(),
    diagnosed_date: z.union([z.string(), z.null()]).optional(),
    status: z.string().optional().default("active"),
    appointment_id: z.union([z.string(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
export const PatientConditionResponse = z
  .object({
    id: z.string(),
    patient_id: z.string(),
    condition_name: z.string(),
    icd10_code: z.union([z.string(), z.null()]).optional(),
    diagnosed_date: z.union([z.string(), z.null()]).optional(),
    status: z.string(),
    diagnosed_by: z.union([z.string(), z.null()]).optional(),
    appointment_id: z.union([z.string(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();
export const PatientLabResultCreate = z
  .object({
    patient_id: z.string(),
    test_date: z.union([z.string(), z.null()]).optional(),
    test_type: z.string(),
    appointment_id: z.union([z.string(), z.null()]).optional(),
    results: z.object({}).partial().passthrough(),
    interpretation: z.union([z.string(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
    lab_name: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
export const PatientLabResultResponse = z
  .object({
    id: z.string(),
    patient_id: z.string(),
    test_date: z.string(),
    test_type: z.string(),
    ordered_by: z.union([z.string(), z.null()]).optional(),
    appointment_id: z.union([z.string(), z.null()]).optional(),
    results: z.object({}).partial().passthrough(),
    interpretation: z.union([z.string(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
    lab_name: z.union([z.string(), z.null()]).optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();
export const DetermineConsultationTypeRequest = z
  .object({
    diarized_segments: z.array(z.unknown()),
    doctor_specialty: z.string(),
    patient_context: z.object({}).partial().passthrough(),
  })
  .passthrough();
export const DetermineConsultationTypeResponse = z
  .object({
    consultation_type: z.string(),
    confidence: z.number(),
    reasoning: z.string(),
  })
  .passthrough();
export const ExtractFormFieldsRequest = z
  .object({
    diarized_segments: z.array(z.unknown()),
    form_type: z.string(),
    patient_context: z.object({}).partial().passthrough(),
    current_form_state: z.object({}).partial().passthrough(),
    chunk_index: z.number().int(),
    appointment_id: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
export const ExtractFormFieldsResponse = z
  .object({
    field_updates: z.object({}).partial().passthrough(),
    confidence_scores: z.object({}).partial().passthrough(),
    chunk_index: z.number().int(),
    extraction_metadata: z.object({}).partial().passthrough(),
  })
  .passthrough();
export const AutoFillConsultationFormRequest = z
  .object({
    consultation_id: z.string(),
    appointment_id: z.string(),
    patient_id: z.string(),
    original_transcript: z.string(),
    consultation_text: z.string(),
    patient_snapshot: z.object({}).partial().passthrough(),
    force_consultation_type: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
export const AutoFillConsultationFormResponse = z
  .object({
    success: z.boolean(),
    consultation_type: z.string(),
    confidence: z.number(),
    reasoning: z.string(),
    form_id: z.string(),
    form_created: z.boolean(),
    field_updates: z.object({}).partial().passthrough(),
    error: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();
export const FeedbackSubmitRequest = z
  .object({
    consultation_id: z.string(),
    feedback_type: z.string(),
    feedback_sentiment: z.string(),
    component_identifier: z.union([z.string(), z.null()]).optional(),
    component_data: z
      .union([z.object({}).partial().passthrough(), z.null()])
      .optional(),
    diagnosis_text: z.union([z.string(), z.null()]).optional(),
    is_correct_diagnosis: z
      .union([z.boolean(), z.null()])
      .optional()
      .default(false),
    drug_name: z.union([z.string(), z.null()]).optional(),
    drug_dosage: z.union([z.string(), z.null()]).optional(),
    user_id: z.union([z.string(), z.null()]).optional(),
    user_role: z.union([z.string(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
    metadata: z
      .union([z.object({}).partial().passthrough(), z.null()])
      .optional(),
  })
  .passthrough();
export const FeedbackResponse = z
  .object({
    id: z.string(),
    success: z.boolean(),
    message: z.string(),
    feedback_type: z.string(),
    feedback_sentiment: z.string(),
    created_at: z.string(),
  })
  .passthrough();
const FeedbackStatsResponse = z
  .object({
    total_feedback_count: z.number().int(),
    feedback_by_type: z.object({}).partial().passthrough(),
    feedback_by_sentiment: z.object({}).partial().passthrough(),
    positive_percentage: z.number(),
    top_diagnoses: z.array(z.unknown()),
    top_drugs: z.array(z.unknown()),
    recent_feedback: z.array(z.unknown()),
  })
  .passthrough();

export const schemas = {
  Body_upload_clinic_logo_api_doctor_logo_upload_post,
  LogoUploadResponse,
  ValidationError,
  HTTPValidationError,
  LogoDeleteResponse,
  LogoCurrentResponse,
  Body_upload_custom_form_api_custom_forms_upload_post,
  FormExtractionResponse,
  SaveFormRequest,
  CustomFormResponse,
  PreviewPDFRequest,
  specialty,
  Body_select_form_for_consultation_api_custom_forms_select_form_for_consultation_post,
  HealthResponse,
  AnalysisRequest,
  Body_diarize_audio_api_diarize_post,
  num_speakers,
  Body_diarize_audio_sarvam_api_diarize_sarvam_post,
  SpeakerRoleRequest,
  RerunTranscriptionRequest,
  Body_diarize_audio_chunk_api_diarize_chunk_post,
  Body_process_final_chunk_async_api_process_final_chunk_async_post,
  Body_transcribe_audio_api_transcribe_post,
  Body_upload_audio_to_gcs_api_upload_audio_post,
  SendInvitationEmailRequest,
  PasswordResetRequest,
  StructureSymptomRequest,
  OBGYNFormCreateRequest,
  OBGYNFormResponse,
  OBGYNFormUpdateRequest,
  OBGYNFormSectionRequest,
  PatientVitalsCreate,
  PatientVitalsResponse,
  PatientMedicationCreate,
  PatientMedicationResponse,
  PatientAllergyCreate,
  PatientAllergyResponse,
  status,
  PatientConditionCreate,
  PatientConditionResponse,
  PatientLabResultCreate,
  PatientLabResultResponse,
  DetermineConsultationTypeRequest,
  DetermineConsultationTypeResponse,
  ExtractFormFieldsRequest,
  ExtractFormFieldsResponse,
  AutoFillConsultationFormRequest,
  AutoFillConsultationFormResponse,
  FeedbackSubmitRequest,
  FeedbackResponse,
  FeedbackStatsResponse,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/",
    alias: "root__get",
    description: `Root endpoint`,
    requestFormat: "json",
    response: HealthResponse,
  },
  {
    method: "post",
    path: "/api/analyze",
    alias: "analyze_consultation_api_analyze_post",
    description: `Analyze a clinical consultation and return recommendations

Args:
    request: AnalysisRequest with consultation text and optional patient info

Returns:
    Complete clinical decision support analysis`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AnalysisRequest,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/analyze-stream",
    alias: "analyze_consultation_stream_api_analyze_stream_post",
    description: `Analyze a clinical consultation with real-time progress updates via Server-Sent Events (SSE)

This endpoint streams progress updates as the analysis proceeds:
- Location detection
- Guidelines being searched
- Diagnoses identified
- BNF drug lookups
- Final results

Args:
    request: AnalysisRequest with consultation text and optional patient info

Returns:
    StreamingResponse with SSE events containing progress updates and final results`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AnalysisRequest,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "delete",
    path: "/api/appointments/:appointment_id",
    alias: "delete_appointment_api_appointments__appointment_id__delete",
    description: `Delete an appointment by ID.

Args:
    appointment_id: The ID of the appointment to delete

Returns:
    Success response with deletion confirmation`,
    requestFormat: "json",
    parameters: [
      {
        name: "appointment_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/appointments/:appointment_id/consultation-pdf",
    alias:
      "download_consultation_pdf_api_appointments__appointment_id__consultation_pdf_get",
    description: `Generate and download a PDF of the consultation form and appointment details.

Args:
    appointment_id: UUID of the appointment

Returns:
    StreamingResponse with PDF file

Raises:
    400: Invalid appointment ID format
    404: Appointment not found or no consultation form found
    500: PDF generation failed`,
    requestFormat: "json",
    parameters: [
      {
        name: "appointment_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "patch",
    path: "/api/appointments/:appointment_id/status",
    alias:
      "update_appointment_status_api_appointments__appointment_id__status_patch",
    description: `Update appointment status (e.g., mark as completed, cancelled)

This is a placeholder endpoint for the appointments feature.
In production, this would update a database.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
      {
        name: "appointment_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/auto-fill-consultation-form",
    alias: "auto_fill_consultation_form_api_auto_fill_consultation_form_post",
    description: `Intelligently detect consultation type, create/update form, and auto-fill fields.

Workflow:
1. Parse diarized transcript
2. Call determine_consultation_type() to detect type
3. Check if form already exists in database
4. Create new form if missing, or get existing form
5. Call extract_form_fields() to extract data
6. Update form with extracted fields
7. Return success response with form details`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: AutoFillConsultationFormRequest,
      },
    ],
    response: AutoFillConsultationFormResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/cache-stats",
    alias: "get_cache_stats_api_cache_stats_get",
    description: `Get cache statistics for monitoring schema cache performance.

Returns hit/miss ratios and cache size information.`,
    requestFormat: "json",
    response: z.unknown(),
  },
  {
    method: "get",
    path: "/api/consultation-form",
    alias: "get_consultation_form_api_consultation_form_get",
    description: `Get consultation form by appointment ID and form type.`,
    requestFormat: "json",
    parameters: [
      {
        name: "appointment_id",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "form_type",
        type: "Query",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/consultation-form",
    alias: "create_consultation_form_api_consultation_form_post",
    description: `Create a new consultation form in unified table.

Request body:
{
    &quot;patient_id&quot;: &quot;uuid&quot;,
    &quot;appointment_id&quot;: &quot;uuid&quot;,
    &quot;form_type&quot;: &quot;antenatal|obgyn|infertility|...&quot;,
    &quot;form_data&quot;: {...},  // JSONB data
    &quot;status&quot;: &quot;draft|partial|completed&quot;,
    &quot;created_by&quot;: &quot;firebase_uid&quot;,
    &quot;updated_by&quot;: &quot;firebase_uid&quot;,
    &quot;filled_by&quot;: &quot;firebase_uid&quot;
}`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "put",
    path: "/api/consultation-form/:form_id",
    alias: "update_consultation_form_api_consultation_form__form_id__put",
    description: `Update an existing consultation form.

Request body: Same as create, but only include fields to update.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
      {
        name: "form_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "delete",
    path: "/api/custom-forms/:form_id",
    alias: "delete_custom_form_api_custom_forms__form_id__delete",
    description: `Delete a draft custom form`,
    requestFormat: "json",
    parameters: [
      {
        name: "form_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "patch",
    path: "/api/custom-forms/:form_id/activate",
    alias: "activate_custom_form_api_custom_forms__form_id__activate_patch",
    description: `Activate a custom form to make it usable`,
    requestFormat: "json",
    parameters: [
      {
        name: "form_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/custom-forms/default-forms/:specialty",
    alias:
      "get_default_forms_for_specialty_api_custom_forms_default_forms__specialty__get",
    description: `Get all built-in/default forms for a specific medical specialty.

Args:
    specialty: Medical specialty (e.g., &#x27;obstetrics_gynecology&#x27;, &#x27;cardiology&#x27;)

Returns:
    List of default forms for that specialty`,
    requestFormat: "json",
    parameters: [
      {
        name: "specialty",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.array(CustomFormResponse),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/custom-forms/filled-forms/:filled_form_id/pdf",
    alias:
      "download_filled_form_pdf_api_custom_forms_filled_forms__filled_form_id__pdf_get",
    description: `Generate and download PDF for a filled custom form using stored pdf_template.

Args:
    filled_form_id: ID of the filled form record

Returns:
    StreamingResponse with PDF file`,
    requestFormat: "json",
    parameters: [
      {
        name: "filled_form_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/custom-forms/forms/:form_id",
    alias: "get_custom_form_api_custom_forms_forms__form_id__get",
    description: `Get a single custom form with full details (schema and PDF template).

Args:
    form_id: UUID of the custom form
    authorization: Firebase JWT token in Authorization header

Returns:
    Complete form details`,
    requestFormat: "json",
    parameters: [
      {
        name: "form_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: CustomFormResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "delete",
    path: "/api/custom-forms/forms/:form_id",
    alias: "delete_custom_form_api_custom_forms_forms__form_id__delete",
    description: `Delete a custom form.

Args:
    form_id: UUID of the custom form to delete
    authorization: Firebase JWT token in Authorization header

Returns:
    Success message`,
    requestFormat: "json",
    parameters: [
      {
        name: "form_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "put",
    path: "/api/custom-forms/forms/:form_id",
    alias: "update_custom_form_api_custom_forms_forms__form_id__put",
    description: `Update an existing custom form&#x27;s schema and PDF template.

Args:
    form_id: UUID of the custom form to update
    request: Updated form data (schema, pdf_template, etc.)
    authorization: Firebase JWT token in Authorization header

Returns:
    Updated form details`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SaveFormRequest,
      },
      {
        name: "form_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/custom-forms/forms/:form_id/adopt",
    alias: "adopt_form_to_library_api_custom_forms_forms__form_id__adopt_post",
    description: `Add a public form to the doctor&#x27;s &quot;My Forms&quot; library.

Args:
    form_id: UUID of the form to adopt
    authorization: Firebase JWT token in Authorization header

Returns:
    Success message with form details`,
    requestFormat: "json",
    parameters: [
      {
        name: "form_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/custom-forms/forms/:form_id/preview-pdf",
    alias:
      "preview_saved_form_pdf_api_custom_forms_forms__form_id__preview_pdf_get",
    description: `Generate PDF preview for a saved custom form.

Args:
    form_id: UUID of the custom form
    authorization: Firebase JWT token in Authorization header

Returns:
    PDF file as downloadable response`,
    requestFormat: "json",
    parameters: [
      {
        name: "form_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "delete",
    path: "/api/custom-forms/forms/:form_id/remove",
    alias:
      "remove_form_from_library_api_custom_forms_forms__form_id__remove_delete",
    description: `Remove an adopted form from the doctor&#x27;s library.
Cannot remove forms you created (use DELETE /forms/{id} instead).

Args:
    form_id: UUID of the form to remove
    authorization: Firebase JWT token in Authorization header

Returns:
    Success message`,
    requestFormat: "json",
    parameters: [
      {
        name: "form_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "patch",
    path: "/api/custom-forms/forms/:form_id/share",
    alias: "share_custom_form_api_custom_forms_forms__form_id__share_patch",
    description: `Make a custom form public so all doctors can use it.

Args:
    form_id: UUID of the custom form to share
    authorization: Firebase JWT token in Authorization header

Returns:
    Updated form details`,
    requestFormat: "json",
    parameters: [
      {
        name: "form_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/custom-forms/forms/browse",
    alias: "browse_forms_to_add_api_custom_forms_forms_browse_get",
    description: `Browse all public forms that can be added to &quot;My Forms&quot;.
Excludes forms already in the doctor&#x27;s library (owned or adopted).

Args:
    specialty: Optional filter by specialty
    search: Optional search in form name or description
    authorization: Firebase JWT token in Authorization header

Returns:
    Dict with available forms to add`,
    requestFormat: "json",
    parameters: [
      {
        name: "specialty",
        type: "Query",
        schema: specialty,
      },
      {
        name: "search",
        type: "Query",
        schema: specialty,
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/custom-forms/my-forms",
    alias: "get_my_forms_library_api_custom_forms_my_forms_get",
    description: `Get doctor&#x27;s complete form library (owned + adopted forms).
This is the list of forms available for consultation selection.

Auto-adopts public forms in doctor&#x27;s specialty on first call (idempotent).

Args:
    specialty: Optional filter by specialty
    status: Optional filter by status (draft, active, archived)
    authorization: Firebase JWT token in Authorization header

Returns:
    Dict with forms (owned + adopted), counts, and ownership metadata`,
    requestFormat: "json",
    parameters: [
      {
        name: "specialty",
        type: "Query",
        schema: specialty,
      },
      {
        name: "status",
        type: "Query",
        schema: specialty,
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/custom-forms/preview-pdf",
    alias: "preview_pdf_api_custom_forms_preview_pdf_post",
    description: `Generate a preview PDF based on the form schema and PDF template.
Shows sample/dummy data for layout review before form is activated.

Args:
    request: PreviewPDFRequest with form schema, PDF template, and optional branding

Returns:
    StreamingResponse with PDF file for inline display`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PreviewPDFRequest,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/custom-forms/public-forms",
    alias: "get_public_custom_forms_api_custom_forms_public_forms_get",
    description: `Get all public custom forms available to use.

Args:
    specialty: Optional filter by specialty

Returns:
    List of public custom forms`,
    requestFormat: "json",
    parameters: [
      {
        name: "specialty",
        type: "Query",
        schema: specialty,
      },
    ],
    response: z.array(CustomFormResponse),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/custom-forms/save",
    alias: "save_custom_form_api_custom_forms_save_post",
    description: `Save doctor-reviewed form schema + PDF template to database.
Called AFTER doctor has reviewed and edited the extracted schema.

Args:
    request: SaveFormRequest with reviewed schema and PDF template
    authorization: Firebase JWT token in Authorization header

Returns:
    CustomFormResponse with saved form details`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SaveFormRequest,
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: CustomFormResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/custom-forms/select-form-for-consultation",
    alias:
      "select_form_for_consultation_api_custom_forms_select_form_for_consultation_post",
    description: `Smart form selection for consultations.

Logic:
- If only 1 form available for specialty → return it immediately (no LLM call)
- If multiple forms available → call LLM with patient_criteria to decide which form to use

Args:
    specialty: Doctor&#x27;s specialty
    patient_context: Brief description of patient (age, gender, chief complaint, pregnancy status, etc.)
    authorization: Firebase JWT token

Returns:
    Selected form details with form_id and form_name`,
    requestFormat: "form-url",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema:
          Body_select_form_for_consultation_api_custom_forms_select_form_for_consultation_post,
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/custom-forms/upload",
    alias: "upload_custom_form_api_custom_forms_upload_post",
    description: `Upload form images and extract schema + PDF template for review.
DOES NOT save to database - returns extraction results for doctor to review.

Args:
    form_name: Name for the form in snake_case
    specialty: Medical specialty (e.g., &#x27;cardiology&#x27;, &#x27;neurology&#x27;)
    description: Optional description of the form
    is_public: Whether to make form available to all doctors
    files: List of HEIC/JPEG/PNG image files

Returns:
    Extraction results with schema and PDF template for review`,
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: Body_upload_custom_form_api_custom_forms_upload_post,
      },
    ],
    response: FormExtractionResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/determine-consultation-type",
    alias: "determine_consultation_type_api_determine_consultation_type_post",
    description: `Analyze the first chunk of a consultation to determine the appropriate form type.

This helps auto-select the correct consultation form based on the conversation content,
especially for specialists who handle multiple types of consultations (e.g., OBGyn doctors
seeing general gynecology, infertility, or antenatal patients).`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: DetermineConsultationTypeRequest,
      },
    ],
    response: DetermineConsultationTypeResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/diarize",
    alias: "diarize_audio_api_diarize_post",
    description: `Perform speaker diarization on audio using ElevenLabs Scribe v1 API

This endpoint uses the batch Scribe v1 model which supports speaker segmentation.
Returns word-level timestamps with speaker IDs for multi-speaker conversations.

Args:
    audio: Audio file (webm, wav, mp3, etc.)
    num_speakers: Optional expected number of speakers (if known)
    diarization_threshold: Threshold for speaker change detection (0.1-0.4, default 0.22)

Returns:
    {
        &quot;success&quot;: true,
        &quot;segments&quot;: [{&quot;speaker_id&quot;: &quot;speaker_1&quot;, &quot;text&quot;: &quot;...&quot;, &quot;start_time&quot;: 0.0, &quot;end_time&quot;: 1.5}],
        &quot;detected_speakers&quot;: [&quot;speaker_1&quot;, &quot;speaker_2&quot;, ...],
        &quot;full_transcript&quot;: &quot;complete text&quot;
    }`,
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ audio: z.instanceof(File) }).passthrough(),
      },
      {
        name: "num_speakers",
        type: "Query",
        schema: num_speakers,
      },
      {
        name: "diarization_threshold",
        type: "Query",
        schema: z.number().optional().default(0.22),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/diarize-chunk",
    alias: "diarize_audio_chunk_api_diarize_chunk_post",
    description: `Diarize audio chunk with overlap metadata for speaker ID matching

This endpoint processes 30-second audio chunks during recording, enabling
real-time speaker-labeled transcription. Returns segments with overlap
statistics for cross-chunk speaker matching.

Args:
    audio: Audio chunk file (webm, 30 seconds)
    chunk_index: Chunk number (0, 1, 2, ...)
    chunk_start: Start time in full recording (seconds)
    chunk_end: End time in full recording (seconds)
    num_speakers: Optional expected number of speakers
    diarization_threshold: Speaker change detection threshold
    language: Language code (e.g., &quot;en-IN&quot;, &quot;hi-IN&quot;)

Returns:
    {
        &quot;success&quot;: true,
        &quot;chunk_index&quot;: 0,
        &quot;chunk_start&quot;: 0.0,
        &quot;chunk_end&quot;: 30.0,
        &quot;segments&quot;: [...],
        &quot;detected_speakers&quot;: [&quot;speaker_0&quot;, &quot;speaker_1&quot;],
        &quot;start_overlap_stats&quot;: {...},
        &quot;end_overlap_stats&quot;: {...},
        &quot;latency_seconds&quot;: 2.3
    }`,
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: Body_diarize_audio_chunk_api_diarize_chunk_post,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/diarize-sarvam",
    alias: "diarize_audio_sarvam_api_diarize_sarvam_post",
    description: `Perform speaker diarization on audio using Sarvam AI Batch API

This endpoint uses Sarvam&#x27;s speech-to-text-translate batch API with diarization
for Indian language consultations. Returns diarized transcript with speaker labels
and automatic English translation.

Args:
    audio: Audio file (webm, wav, mp3, etc.)
    num_speakers: Expected number of speakers (default 2 for doctor-patient)

Returns:
    {
        &quot;success&quot;: true,
        &quot;segments&quot;: [{&quot;speaker_id&quot;: &quot;speaker 1&quot;, &quot;text&quot;: &quot;...&quot;, &quot;start_time&quot;: 0.0, &quot;end_time&quot;: 1.5}],
        &quot;detected_speakers&quot;: [&quot;speaker 1&quot;, &quot;speaker 2&quot;],
        &quot;full_transcript&quot;: &quot;complete translated text in English&quot;
    }`,
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ audio: z.instanceof(File) }).passthrough(),
      },
      {
        name: "num_speakers",
        type: "Query",
        schema: z.number().int().optional().default(2),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/doctor-logo/current",
    alias: "get_current_logo_api_doctor_logo_current_get",
    description: `Get current clinic logo URL for a doctor
Requires JWT authentication`,
    requestFormat: "json",
    parameters: [
      {
        name: "doctor_id",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: LogoCurrentResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "delete",
    path: "/api/doctor-logo/delete",
    alias: "delete_clinic_logo_api_doctor_logo_delete_delete",
    description: `Delete clinic logo for a doctor

- Deletes logo from Supabase Storage
- Sets clinic_logo_url to NULL in Supabase
- Requires JWT authentication`,
    requestFormat: "json",
    parameters: [
      {
        name: "doctor_id",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: LogoDeleteResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/doctor-logo/upload",
    alias: "upload_clinic_logo_api_doctor_logo_upload_post",
    description: `Upload and process clinic logo for a doctor

- Validates file type (PNG, JPEG) and size (max 2MB)
- Resizes to fit within 200x80px
- Uploads to Supabase Storage
- Updates doctor record in Supabase
- Deletes old logo if exists
- Requires JWT authentication`,
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ file: z.instanceof(File) }).passthrough(),
      },
      {
        name: "doctor_id",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "authorization",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: LogoUploadResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/examples",
    alias: "get_examples_api_examples_get",
    description: `Get example clinical scenarios for testing`,
    requestFormat: "json",
    response: z.unknown(),
  },
  {
    method: "post",
    path: "/api/extract-form-fields",
    alias: "extract_form_fields_api_extract_form_fields_post",
    description: `Extract structured form fields from diarized conversation segments.

This endpoint processes doctor-patient conversation segments from real-time
diarization and extracts relevant clinical data to auto-populate form fields.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ExtractFormFieldsRequest,
      },
    ],
    response: ExtractFormFieldsResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/feedback",
    alias: "submit_ai_feedback_api_feedback_post",
    description: `Submit feedback on AI-generated content.

Supports:
- Transcription quality feedback
- Summary quality feedback
- Diagnosis accuracy feedback (with &quot;correct diagnosis&quot; marking)
- Drug recommendation feedback

Deduplication: Uses fingerprint to prevent duplicate submissions.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: FeedbackSubmitRequest,
      },
    ],
    response: FeedbackResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/feedback/consultation/:consultation_id",
    alias:
      "get_consultation_feedback_api_feedback_consultation__consultation_id__get",
    description: `Retrieve all feedback for a specific consultation.
Useful for displaying feedback history in the UI.`,
    requestFormat: "json",
    parameters: [
      {
        name: "consultation_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/feedback/stats",
    alias: "get_feedback_stats_api_feedback_stats_get",
    description: `Get aggregated feedback statistics for RLHF analysis.

Query parameters:
- days: Number of days to look back (default: 30)
- feedback_type: Filter by specific type (optional)`,
    requestFormat: "json",
    parameters: [
      {
        name: "days",
        type: "Query",
        schema: z.number().int().optional().default(30),
      },
      {
        name: "feedback_type",
        type: "Query",
        schema: specialty,
      },
    ],
    response: FeedbackStatsResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/form-schema/:form_type",
    alias: "get_form_schema_api_form_schema__form_type__get",
    description: `Get form schema from database.

Returns the active schema definition for the specified form type.
Frontend uses this to render forms dynamically.

Path parameters:
- form_type: Any form type registered in the database (e.g., &#x27;antenatal&#x27;, &#x27;obgyn&#x27;, &#x27;infertility&#x27;)

Note: No hardcoded validation - any form type in the database is valid.
This allows adding new form types without code changes.`,
    requestFormat: "json",
    parameters: [
      {
        name: "form_type",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/form-schemas",
    alias: "list_form_schemas_api_form_schemas_get",
    description: `List all available form schemas.

Returns metadata about all active form schemas in the system.`,
    requestFormat: "json",
    response: z.unknown(),
  },
  {
    method: "get",
    path: "/api/geolocation",
    alias: "get_geolocation_api_geolocation_get",
    description: `Get geolocation info including timezone based on the caller&#x27;s IP address.
Uses ip-api.com for geolocation lookups.

Returns:
    Dictionary with ip, country, country_code, timezone, city, region`,
    requestFormat: "json",
    response: z.unknown(),
  },
  {
    method: "get",
    path: "/api/get-sarvam-token",
    alias: "get_sarvam_token_api_get_sarvam_token_get",
    description: `Return the Sarvam API key for WebSocket connection (Indian languages)

Sarvam AI is used for Indian language transcription and translation.
The API key is passed as a query parameter to the WebSocket endpoint.

Returns:
    JSON with API key for WebSocket authentication`,
    requestFormat: "json",
    response: z.unknown(),
  },
  {
    method: "get",
    path: "/api/get-transcription-token",
    alias: "get_transcription_token_api_get_transcription_token_get",
    description: `Generate a temporary token for ElevenLabs speech-to-text WebSocket connection

This endpoint provides secure client-side access to ElevenLabs by generating
a single-use token that expires after 15 minutes.

Returns:
    JSON with temporary token for WebSocket authentication`,
    requestFormat: "json",
    response: z.unknown(),
  },
  {
    method: "get",
    path: "/api/health",
    alias: "api_health_check_api_health_get",
    description: `API health check endpoint (frontend compatibility)`,
    requestFormat: "json",
    response: HealthResponse,
  },
  {
    method: "post",
    path: "/api/identify-speaker-roles",
    alias: "identify_speaker_roles_api_identify_speaker_roles_post",
    description: `Identify which speaker is the doctor vs patient using LLM analysis

Analyzes the FULL conversation to determine speaker roles.
Uses Claude Haiku for fast, cost-effective inference.

Args:
    segments: ALL diarized segments from the consultation
    language: Conversation language (for context)

Returns:
    Speaker role mapping: {&quot;speaker_0&quot;: &quot;Doctor&quot;, &quot;speaker_1&quot;: &quot;Patient&quot;}`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SpeakerRoleRequest,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/obgyn-forms",
    alias: "create_obgyn_form_api_obgyn_forms_post",
    description: `Create a new OB/GYN form for a patient.

Args:
    request: OBGYNFormCreateRequest with patient_id, form_data, and optional appointment_id

Returns:
    OBGYNFormResponse with the created form details`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: OBGYNFormCreateRequest,
      },
    ],
    response: OBGYNFormResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/obgyn-forms/:form_id",
    alias: "get_obgyn_form_api_obgyn_forms__form_id__get",
    description: `Retrieve an OB/GYN form by ID.

Args:
    form_id: The ID of the form to retrieve

Returns:
    OBGYNFormResponse with the form details`,
    requestFormat: "json",
    parameters: [
      {
        name: "form_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: OBGYNFormResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "put",
    path: "/api/obgyn-forms/:form_id",
    alias: "update_obgyn_form_api_obgyn_forms__form_id__put",
    description: `Update an existing OB/GYN form.

Args:
    form_id: The ID of the form to update
    request: OBGYNFormUpdateRequest with updated form_data and optional status

Returns:
    OBGYNFormResponse with the updated form details`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: OBGYNFormUpdateRequest,
      },
      {
        name: "form_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: OBGYNFormResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "delete",
    path: "/api/obgyn-forms/:form_id",
    alias: "delete_obgyn_form_api_obgyn_forms__form_id__delete",
    description: `Delete an OB/GYN form by ID.

Args:
    form_id: The ID of the form to delete

Returns:
    Success response with deletion confirmation`,
    requestFormat: "json",
    parameters: [
      {
        name: "form_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/obgyn-forms/appointment/:appointment_id",
    alias:
      "get_appointment_obgyn_form_api_obgyn_forms_appointment__appointment_id__get",
    description: `Retrieve the OB/GYN form associated with a specific appointment.

Args:
    appointment_id: The ID of the appointment

Returns:
    OBGYNFormResponse for the appointment, or 404 if not found`,
    requestFormat: "json",
    parameters: [
      {
        name: "appointment_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/obgyn-forms/patient/:patient_id",
    alias: "get_patient_obgyn_forms_api_obgyn_forms_patient__patient_id__get",
    description: `Retrieve all OB/GYN forms for a specific patient.

Args:
    patient_id: The ID of the patient

Returns:
    List of OBGYNFormResponse objects for the patient`,
    requestFormat: "json",
    parameters: [
      {
        name: "patient_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/obgyn-forms/validate",
    alias: "validate_obgyn_form_section_api_obgyn_forms_validate_post",
    description: `Validate a specific section of an OB/GYN form.

This endpoint validates form sections against expected data structures
and can be called to check individual sections during form filling.

Args:
    request: OBGYNFormSectionRequest with section_name and section_data

Returns:
    Validation result with success status and any errors found`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: OBGYNFormSectionRequest,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/patient-allergies",
    alias: "create_patient_allergy_api_patient_allergies_post",
    description: `Create a new patient allergy record`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PatientAllergyCreate,
      },
    ],
    response: PatientAllergyResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "put",
    path: "/api/patient-allergies/:allergy_id",
    alias: "update_patient_allergy_api_patient_allergies__allergy_id__put",
    description: `Update a patient allergy record (e.g., mark as resolved)`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
      {
        name: "allergy_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: PatientAllergyResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/patient-allergies/patient/:patient_id",
    alias:
      "get_patient_allergies_api_patient_allergies_patient__patient_id__get",
    description: `Get all allergies for a patient (default: active only)`,
    requestFormat: "json",
    parameters: [
      {
        name: "patient_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "status",
        type: "Query",
        schema: status,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/patient-conditions",
    alias: "create_patient_condition_api_patient_conditions_post",
    description: `Create a new patient condition record`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PatientConditionCreate,
      },
    ],
    response: PatientConditionResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "put",
    path: "/api/patient-conditions/:condition_id",
    alias: "update_patient_condition_api_patient_conditions__condition_id__put",
    description: `Update a patient condition record (e.g., mark as resolved)`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
      {
        name: "condition_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: PatientConditionResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/patient-conditions/patient/:patient_id",
    alias:
      "get_patient_conditions_api_patient_conditions_patient__patient_id__get",
    description: `Get all conditions for a patient (optionally filtered by status)`,
    requestFormat: "json",
    parameters: [
      {
        name: "patient_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "status",
        type: "Query",
        schema: specialty,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/patient-health-summary/:patient_id",
    alias:
      "get_patient_health_summary_api_patient_health_summary__patient_id__get",
    description: `Get a comprehensive health summary for a patient including:
- Latest vitals
- Active medications
- Active allergies
- Active conditions
- Recent lab results`,
    requestFormat: "json",
    parameters: [
      {
        name: "patient_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/patient-lab-results",
    alias: "create_patient_lab_result_api_patient_lab_results_post",
    description: `Create a new patient lab result record`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PatientLabResultCreate,
      },
    ],
    response: PatientLabResultResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/patient-lab-results/:result_id",
    alias: "get_lab_result_by_id_api_patient_lab_results__result_id__get",
    description: `Get a specific lab result by ID`,
    requestFormat: "json",
    parameters: [
      {
        name: "result_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: PatientLabResultResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/patient-lab-results/patient/:patient_id",
    alias:
      "get_patient_lab_results_api_patient_lab_results_patient__patient_id__get",
    description: `Get all lab results for a patient (optionally filtered by test type)`,
    requestFormat: "json",
    parameters: [
      {
        name: "patient_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "test_type",
        type: "Query",
        schema: specialty,
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional().default(20),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/patient-medications",
    alias: "create_patient_medication_api_patient_medications_post",
    description: `Create a new patient medication record`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PatientMedicationCreate,
      },
    ],
    response: PatientMedicationResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "put",
    path: "/api/patient-medications/:medication_id",
    alias:
      "update_patient_medication_api_patient_medications__medication_id__put",
    description: `Update a patient medication record (e.g., stop date, status)`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
      {
        name: "medication_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: PatientMedicationResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/patient-medications/patient/:patient_id",
    alias:
      "get_patient_medications_api_patient_medications_patient__patient_id__get",
    description: `Get all medications for a patient (optionally filtered by status)`,
    requestFormat: "json",
    parameters: [
      {
        name: "patient_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "status",
        type: "Query",
        schema: specialty,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/patient-vitals",
    alias: "create_patient_vitals_api_patient_vitals_post",
    description: `Create a new patient vitals record`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PatientVitalsCreate,
      },
    ],
    response: PatientVitalsResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/patient-vitals/:vitals_id",
    alias: "get_vitals_by_id_api_patient_vitals__vitals_id__get",
    description: `Get a specific vitals record by ID`,
    requestFormat: "json",
    parameters: [
      {
        name: "vitals_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: PatientVitalsResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/patient-vitals/patient/:patient_id",
    alias: "get_patient_vitals_api_patient_vitals_patient__patient_id__get",
    description: `Get all vitals records for a patient (most recent first)`,
    requestFormat: "json",
    parameters: [
      {
        name: "patient_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional().default(10),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/process-final-chunk-async",
    alias: "process_final_chunk_async_api_process_final_chunk_async_post",
    description: `Process final audio chunk asynchronously and update consultation

This endpoint returns immediately after queuing the background task.
The consultation is updated via Supabase when processing completes.

Args:
    consultation_id: UUID of the consultation to update
    audio: Audio chunk file (webm)
    chunk_index: Chunk number
    chunk_start: Start time in full recording (seconds)
    chunk_end: End time in full recording (seconds)
    language: Language code (e.g., &quot;en-IN&quot;, &quot;hi-IN&quot;)
    num_speakers: Expected number of speakers
    diarization_threshold: Speaker change detection threshold

Returns:
    {
        &quot;success&quot;: true,
        &quot;consultation_id&quot;: &quot;...&quot;,
        &quot;message&quot;: &quot;Processing in background&quot;
    }`,
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema:
          Body_process_final_chunk_async_api_process_final_chunk_async_post,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/rerun-transcription",
    alias: "rerun_transcription_api_rerun_transcription_post",
    description: `Rerun transcription/diarization on a past consultation&#x27;s audio file.

Processes the entire audio file at once with speaker diarization and role
identification (Doctor vs Patient), then updates the consultation record.

Args:
    consultation_id: UUID of the consultation to reprocess
    language: Optional language code override (e.g., &quot;en-IN&quot;, &quot;hi-IN&quot;)

Returns:
    {
        &quot;success&quot;: true,
        &quot;consultation_id&quot;: &quot;uuid&quot;,
        &quot;transcript&quot;: &quot;Doctor: ... Patient: ...&quot;,
        &quot;language&quot;: &quot;en-IN&quot;,
        &quot;provider&quot;: &quot;sarvam&quot; | &quot;elevenlabs&quot;,
        &quot;speaker_roles&quot;: {&quot;speaker_0&quot;: &quot;Doctor&quot;, &quot;speaker_1&quot;: &quot;Patient&quot;},
        &quot;segments_count&quot;: 42,
        &quot;processing_time_seconds&quot;: 45.2
    }`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: RerunTranscriptionRequest,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/send-invitation-email",
    alias: "send_invitation_email_api_send_invitation_email_post",
    description: `Send a patient invitation email using Resend

Args:
    request: SendInvitationEmailRequest with email, names, and invitation token

Returns:
    {
        &quot;success&quot;: true,
        &quot;message_id&quot;: &quot;resend-message-id&quot;,
        &quot;recipient&quot;: &quot;email@example.com&quot;
    }`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SendInvitationEmailRequest,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/send-password-reset-email",
    alias: "send_password_reset_email_api_send_password_reset_email_post",
    description: `Send a password reset email using Resend with Firebase password reset link

This bypasses Firebase&#x27;s default email sending which has poor deliverability.
Instead, we generate the reset link using Firebase Admin SDK and send it
via Resend from our custom domain (aneya.health).

Args:
    request: PasswordResetRequest with email address

Returns:
    {
        &quot;success&quot;: true,
        &quot;message&quot;: &quot;Password reset email sent&quot;
    }`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ email: z.string() }).passthrough(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/structure-symptom",
    alias: "structure_symptom_api_structure_symptom_post",
    description: `Use Claude to structure free-form symptom text into structured data,
then save to Supabase patient_symptoms table.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: StructureSymptomRequest,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/summarize",
    alias: "summarize_text_api_summarize_post",
    description: `Summarize consultation transcript using ConsultationSummary system

Takes a diarized consultation transcript and generates a comprehensive
clinical summary with speaker identification, timeline extraction, and
structured SOAP note format.

Args:
    request: {
        &quot;text&quot;: &quot;diarized transcript with [timestamp] speaker_X: format&quot;,
        &quot;original_text&quot;: &quot;original language transcript (optional)&quot;,
        &quot;patient_info&quot;: {  # Optional
            &quot;patient_id&quot;: &quot;P001&quot;,
            &quot;patient_age&quot;: &quot;30 years old&quot;,
            &quot;allergies&quot;: &quot;None&quot;
        },
        &quot;is_from_transcription&quot;: true,  # Default true - enables transcription error handling
        &quot;transcription_language&quot;: &quot;en&quot;  # Optional - language of original speech for homophone handling
    }

Returns:
    Comprehensive JSON summary with:
    - speakers: Doctor/patient mapping
    - metadata: Patient info, consultation duration
    - timeline: Symptom onset and progression
    - clinical_summary: Full SOAP note
    - key_concerns: Patient concerns
    - recommendations_given: Medical advice`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/api/test-sse",
    alias: "test_sse_api_test_sse_get",
    description: `Simple SSE test endpoint - yields events with 2 second delays`,
    requestFormat: "json",
    response: z.unknown(),
  },
  {
    method: "post",
    path: "/api/transcribe",
    alias: "transcribe_audio_api_transcribe_post",
    description: `Transcribe audio using ElevenLabs Scribe v2 Realtime API

Args:
    audio: Audio file (webm, wav, mp3, etc.)

Returns:
    Transcribed text with ultra-low latency (~150ms) and automatic language detection`,
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ audio: z.instanceof(File) }).passthrough(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/translate",
    alias: "translate_text_api_translate_post",
    description: `Translate text to English using Google Translate

Automatically detects the source language and translates to English.
If the text is already in English, returns it unchanged.

Args:
    request: {&quot;text&quot;: &quot;text to translate&quot;}

Returns:
    {
        &quot;success&quot;: true,
        &quot;original_text&quot;: &quot;original text&quot;,
        &quot;translated_text&quot;: &quot;translated text&quot;,
        &quot;detected_language&quot;: &quot;hi&quot;,
        &quot;detected_language_name&quot;: &quot;Hindi&quot;
    }`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/api/upload-audio",
    alias: "upload_audio_to_gcs_api_upload_audio_post",
    description: `Upload audio recording to Google Cloud Storage

Args:
    audio: Audio file (webm, wav, mp3, etc.)
    session_id: Optional session ID for organizing recordings

Returns:
    {
        &quot;success&quot;: true,
        &quot;gcs_uri&quot;: &quot;gs://aneya-audio-recordings/...&quot;,
        &quot;public_url&quot;: &quot;https://storage.googleapis.com/...&quot;,
        &quot;filename&quot;: &quot;...&quot;,
        &quot;size_bytes&quot;: 12345
    }`,
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ audio: z.instanceof(File) }).passthrough(),
      },
      {
        name: "session_id",
        type: "Query",
        schema: specialty,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/health",
    alias: "health_check_health_get",
    description: `Health check endpoint`,
    requestFormat: "json",
    response: HealthResponse,
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
