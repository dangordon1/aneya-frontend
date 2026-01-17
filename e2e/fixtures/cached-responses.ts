/**
 * Cached API responses for E2E tests.
 * These responses mock LLM/Sarvam API calls to avoid expensive real calls.
 */

import { PREGNANCY_CONSULTATION, PREGNANCY_SEGMENTS } from './english-transcript';

// Transcription response
export const TRANSCRIBE_RESPONSE = {
  transcript: PREGNANCY_CONSULTATION,
  language: 'en-IN',
  duration: 103.66,
  confidence: 0.95,
};

// Diarization response (ElevenLabs)
export const DIARIZE_RESPONSE = {
  segments: PREGNANCY_SEGMENTS.map((s, i) => ({
    ...s,
    speaker: s.speaker_id,
  })),
  language: 'en-IN',
  transcript: PREGNANCY_CONSULTATION,
};

// Diarization response (Sarvam)
export const DIARIZE_SARVAM_RESPONSE = {
  segments: PREGNANCY_SEGMENTS,
  language: 'en-IN',
  transcript: PREGNANCY_CONSULTATION,
  job_id: 'e2e-test-job-id',
  status: 'completed',
};

// Speaker roles identification response
export const SPEAKER_ROLES_RESPONSE = {
  speaker_roles: {
    speaker_0: 'Doctor',
    speaker_1: 'Patient',
  },
  confidence: 0.95,
  reasoning: 'speaker_0 asks diagnostic questions and inquires about symptoms. speaker_1 describes personal symptoms and responds to medical queries.',
};

// Consultation type detection response
export const CONSULTATION_TYPE_RESPONSE = {
  consultation_type: 'antenatal',
  confidence: 0.95,
  reasoning: 'Patient mentions being 6 weeks pregnant. This is an antenatal consultation for a pregnant patient presenting with flu symptoms.',
};

// Summarize response
export const SUMMARIZE_RESPONSE = {
  summary: 'Patient Selene, 6 weeks pregnant, presenting with flu symptoms for 5 days including cough, cold, fever, vomiting, and sore throat. Currently taking paracetamol 1g twice daily.',
  consultation_data: {
    summary_data: {
      speakers: {
        speaker_0: 'Doctor',
        speaker_1: 'Patient',
      },
      clinical_summary: {
        chief_complaint: 'Flu symptoms during early pregnancy',
        history_present_illness: '6 weeks pregnant with cough, cold, fever, vomiting, sore throat, and runny nose for 5 days',
        review_of_systems: {
          respiratory: 'Persistent cough preventing sleep, runny nose',
          constitutional: 'Fever, vomiting',
          ENT: 'Sore throat',
        },
        physical_examination: {},
        current_medications: 'Paracetamol 1g twice daily',
        assessment: 'Viral upper respiratory infection in early pregnancy',
        plan: {
          therapeutic: ['Continue paracetamol as needed for fever', 'Rest', 'Adequate hydration'],
          follow_up: 'Return if symptoms worsen or new symptoms develop',
        },
      },
    },
  },
};

// SSE events for analyze-stream endpoint
export const ANALYZE_STREAM_EVENTS = [
  {
    type: 'start',
    data: { status: 'Starting analysis...' },
  },
  {
    type: 'progress',
    data: { status: 'Detecting location...' },
  },
  {
    type: 'location',
    data: { country: 'India', country_code: 'IN', detected: true },
  },
  {
    type: 'guideline_search',
    data: { source: 'NICE Guidelines', status: 'searching' },
  },
  {
    type: 'diagnoses',
    data: {
      diagnoses: [
        {
          diagnosis: 'Viral Upper Respiratory Infection',
          icd10_code: 'J06.9',
          confidence: 'high',
          reasoning: 'Classic presentation of viral URI with cough, cold, fever, sore throat, and runny nose in a pregnant patient',
          primary_care: {
            medications: [
              { name: 'Paracetamol', dose: '500-1000mg', frequency: 'Every 4-6 hours as needed', max_daily: '4g' },
            ],
            supportive_care: [
              'Rest and adequate sleep',
              'Increase fluid intake',
              'Honey and lemon for sore throat (safe in pregnancy)',
              'Saline nasal rinse for congestion',
            ],
            when_to_escalate: [
              'Fever >38.5C persisting beyond 48 hours',
              'Difficulty breathing or chest pain',
              'Signs of dehydration',
              'Symptoms worsening after 7 days',
            ],
          },
          pregnancy_considerations: 'Paracetamol is safe in pregnancy. Avoid NSAIDs. Monitor for signs of bacterial superinfection.',
        },
      ],
      drugs_pending: ['Paracetamol'],
    },
  },
  {
    type: 'drug_update',
    data: {
      drug_name: 'Paracetamol',
      status: 'complete',
      source: 'bnf',
      details: {
        bnf_url: 'https://bnf.nice.org.uk/drugs/paracetamol/',
        pregnancy_category: 'Safe to use',
        interactions: [],
        contraindications: ['Severe hepatic impairment'],
      },
    },
  },
  {
    type: 'complete',
    data: { success: true, status: 'Analysis complete' },
  },
];

// Auto-fill form response
export const AUTO_FILL_FORM_RESPONSE = {
  success: true,
  consultation_type: 'antenatal',
  form_id: 'e2e-test-form-id',
  form_created: true,
  confidence: 0.9,
  field_updates: {
    'patient_info.name': 'Selene',
    'patient_info.gestational_age_weeks': 6,
    'presenting_complaints.chief_complaint': 'Flu symptoms - cough, cold, fever, vomiting, sore throat',
    'presenting_complaints.duration': '5 days',
    'current_medications.medications': 'Paracetamol 1g twice daily',
    'vital_signs.temperature': 'Fever reported',
  },
  reasoning: 'Extracted patient information and symptoms from pregnancy consultation transcript',
};

// All cached responses exported as a single object
export const CACHED_RESPONSES = {
  transcribe: TRANSCRIBE_RESPONSE,
  diarize: DIARIZE_RESPONSE,
  diarizeSarvam: DIARIZE_SARVAM_RESPONSE,
  speakerRoles: SPEAKER_ROLES_RESPONSE,
  consultationType: CONSULTATION_TYPE_RESPONSE,
  summarize: SUMMARIZE_RESPONSE,
  analyzeStream: ANALYZE_STREAM_EVENTS,
  autoFillForm: AUTO_FILL_FORM_RESPONSE,
};
