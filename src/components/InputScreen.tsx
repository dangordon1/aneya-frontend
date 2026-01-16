import { useState, useRef, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import { PrimaryButton } from './PrimaryButton';
import { Patient, AppointmentWithPatient, ConsultationLanguage, CONSULTATION_LANGUAGES, isSarvamLanguage } from '../types/database';
import { getPatientAge } from '../utils/dateHelpers';
import { SpeakerMappingModal } from './SpeakerMappingModal';
import { StructuredSummaryDisplay } from './StructuredSummaryDisplay';
import { AudioPlayer } from './AudioPlayer';
import { LocationSelector } from './LocationSelector';
import { FeedbackButton } from './FeedbackButton';
import { useAuth } from '../contexts/AuthContext';
import { requiresOBGynForms } from '../utils/specialtyHelpers';
import { DynamicConsultationForm } from './doctor-portal/DynamicConsultationForm';
import { EditableDoctorReportCard } from './doctor-portal/EditableDoctorReportCard';
import { extractAudioChunk, shouldProcessNextChunk, extractFinalChunk, resetWebMInitSegment } from '../utils/chunkExtraction';
import { matchSpeakersAcrossChunks } from '../utils/speakerMatching';
import { consultationEventBus } from '../lib/consultationEventBus';
import { useConsultationRealtime } from '../hooks/useConsultationRealtime';
import { usePreviousAppointment } from '../hooks/usePreviousAppointment';
import { PreviousAppointmentSidebar } from './PreviousAppointmentSidebar';
import { AppointmentDetailModal } from './AppointmentDetailModal';

interface ChunkStatus {
  index: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime: number;
  endTime: number;
  error?: string;
}

interface DiarizedSegment {
  speaker_id: string;
  speaker_role?: string;
  text: string;
  start_time: number;
  end_time: number;
  chunk_index: number;
}

export interface PatientDetails {
  name: string;
  sex: string;
  age: string;
  height: string;
  weight: string;
  currentMedications: string;
  currentConditions: string;
}

interface InputScreenProps {
  onAnalyze: (
    consultation: string,
    patientDetails: PatientDetails,
    originalTranscript?: string,
    detectedLanguage?: string,
    transcript?: string,
    summary?: string
  ) => void;
  onSaveConsultation?: (consultationData: {
    patient_id: string;
    appointment_id: string | null;
    consultation_text: string;
    original_transcript: string;
    transcription_language: string | null;
    audio_url: string | null;
    patient_snapshot: any;
    consultation_duration_seconds: number;
    transcription_status: 'pending' | 'processing' | 'completed' | 'failed';
  }) => Promise<{ id: string } | undefined>;
  onUpdateConsultation?: (summaryResponse: any) => Promise<void>;
  onCloseConsultation?: () => void;
  onBack?: () => void;
  preFilledPatient?: Patient;
  appointmentContext?: AppointmentWithPatient;
  locationOverride?: string | null;
  onLocationChange?: (location: string | null) => void;
}

const SAMPLE_CONSULTATION_TEXT = `Doctor: Good morning, Mr. Thompson. I'm Dr. Patel. What brings you in today?

Patient: Morning, doctor. I've been feeling terrible for about 5 days now. Started with a bad cough and now I can barely breathe when I walk up stairs.

Doctor: I'm sorry to hear that. Tell me more about the cough - is it dry or are you bringing anything up?

Patient: It's productive now. I'm coughing up greenish-yellow phlegm, quite thick. And I've had this fever that comes and goes, been around 38.5 to 39 degrees.

Doctor: Any chest pain?

Patient: Yes, actually. Sharp pain on my right side when I take a deep breath or cough. Makes me not want to breathe deeply.

Doctor: I see. Have you had any night sweats, chills, or shaking?

Patient: Yes, terrible chills and sweating through my sheets at night. My wife made me come in.

Doctor: Smart wife. Any other symptoms - headache, muscle aches, loss of appetite?

Patient: All of the above, really. I've barely eaten in three days. Just exhausted.

Doctor: Let me ask about your background. Do you smoke?

Patient: I used to - quit 10 years ago, but I smoked for about 20 years before that.

Doctor: Any other medical conditions I should know about?

Patient: I have COPD - diagnosed about 5 years ago. I use an inhaler, the blue one, when I need it. And I take medication for high blood pressure.

Doctor: Which blood pressure medication?

Patient: Amlodipine, 5mg I think.

Doctor: Any allergies to medications?

Patient: Yes, I'm allergic to penicillin - I get a rash from it.

Doctor: Important to know. Let me examine you now.

[Physical examination]

Doctor: Right, Mr. Thompson. Your oxygen saturation is 94% on room air, which is a bit lower than we'd like. Temperature is 38.7. I can hear crackles in your right lower lung when I listen, and there's dullness when I tap that area, which suggests some consolidation. Your heart rate is slightly elevated at 98.

Given your history of COPD, the productive cough with purulent sputum, fever, and the examination findings, I'm confident you have community-acquired pneumonia. The pleuritic chest pain and the consolidation on the right side fit with this.

Patient: Is that serious?

Doctor: It can be, but we've caught it at a good stage. Because of your COPD and the penicillin allergy, I'm going to prescribe doxycycline 200mg today, then 100mg daily for 5 days total. It's important you complete the full course.

I also want you to continue your regular inhalers and stay well hydrated. Paracetamol for the fever and pain. If your breathing gets worse, you develop confusion, or the fever doesn't improve in 48-72 hours, I need you to go straight to A&E.

Patient: Should I have an X-ray?

Doctor: I'm going to arrange a chest X-ray to confirm the diagnosis and rule out any complications. Given your COPD history, I want to be thorough.

I'll also arrange some blood tests - full blood count and CRP to check for inflammation levels. You should rest at home, no work for at least a week.

Patient: Thank you, doctor. I appreciate you taking this seriously.

Doctor: Of course. Here's your prescription. The pharmacy is just downstairs. Please book a follow-up appointment for one week's time so we can check your progress. Sooner if you're worried about anything.`;

// Admin email for testing features
const ADMIN_EMAIL = 'dangordon@live.co.uk';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ELEVENLABS_WS_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';
const SARVAM_WS_URL = 'wss://api.sarvam.ai/speech-to-text-translate/ws';

// Format seconds as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Convert Float32Array audio samples to 16-bit PCM
function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

// Default patient details (prefilled)
const DEFAULT_PATIENT_DETAILS: PatientDetails = {
  name: 'John Smith',
  sex: 'Male',
  age: '45 years',
  height: '175 cm',
  weight: '78 kg',
  currentMedications: 'Metformin 500mg BD, Ramipril 5mg OD',
  currentConditions: 'Type 2 Diabetes Mellitus, Hypertension',
};

/**
 * Determine form type based on doctor's specialty and appointment type
 * Returns 'obgyn', 'infertility', 'antenatal', or null if no specialty-specific form
 */
function determineFormType(doctorSpecialty: string | undefined, appointmentType?: string): 'obgyn' | 'infertility' | 'antenatal' | null {
  // First, try to determine from appointment type (most reliable)
  if (appointmentType) {
    if (appointmentType === 'obgyn_infertility') return 'infertility';
    if (appointmentType === 'obgyn_antenatal') return 'antenatal';
    if (appointmentType === 'obgyn_general_obgyn' || appointmentType.startsWith('obgyn_')) return 'obgyn';
  }

  // Fallback to doctor specialty if appointment type not available
  if (doctorSpecialty && requiresOBGynForms(doctorSpecialty as any)) {
    return 'obgyn';
  }

  return null;
}

export function InputScreen({ onAnalyze, onSaveConsultation, onUpdateConsultation, onCloseConsultation, onBack, preFilledPatient, appointmentContext, locationOverride, onLocationChange }: InputScreenProps) {
  const { user, doctorProfile, getIdToken } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [consultation, setConsultation] = useState(''); // Consultation Transcript (raw or diarized)
  const [consultationSummary, setConsultationSummary] = useState<any>(null); // Consultation Summary (structured data from summarize API)
  const [originalTranscript, setOriginalTranscript] = useState(''); // Original language transcript
  const [audioUrl, setAudioUrl] = useState<string | null>(null); // GCS URL for the audio recording

  // Initialize patient details based on preFilledPatient or default
  const initialPatientDetails: PatientDetails = preFilledPatient ? {
    name: preFilledPatient.name,
    sex: preFilledPatient.sex,
    age: getPatientAge(preFilledPatient),
    height: preFilledPatient.height_cm ? `${preFilledPatient.height_cm} cm` : '',
    weight: preFilledPatient.weight_kg ? `${preFilledPatient.weight_kg} kg` : '',
    currentMedications: preFilledPatient.current_medications || '',
    currentConditions: preFilledPatient.current_conditions || '',
  } : DEFAULT_PATIENT_DETAILS;

  const [patientDetails, setPatientDetails] = useState<PatientDetails>(initialPatientDetails);
  const [isPatientDetailsExpanded, setIsPatientDetailsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false); // Ref for MediaRecorder callback access
  const [recordingTime, setRecordingTime] = useState(0);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Record<string, string>>({});

  // Background save tracking
  const [isSavingInBackground, setIsSavingInBackground] = useState(false);
  const saveLockRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Real-time transcription state
  const [_interimTranscript, setInterimTranscript] = useState('');
  const [isConnectingToTranscription, setIsConnectingToTranscription] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>(''); // For detailed progress feedback
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [shouldTranslateToEnglish, setShouldTranslateToEnglish] = useState(true); // Default: ON

  // Consultation language state - determines which transcription provider to use
  const [consultationLanguage, setConsultationLanguage] = useState<ConsultationLanguage>(
    preFilledPatient?.consultation_language || 'en-IN'
  );

  // NEW: Speaker diarization state
  const [isDiarizing, setIsDiarizing] = useState(false);
  const [_diarizationData, setDiarizationData] = useState<any>(null);
  const [showSpeakerMapping, setShowSpeakerMapping] = useState(false);

  // Chunked diarization state (used by processNextChunk, UI display will be added in separate task)
  const [chunkStatuses, setChunkStatuses] = useState<ChunkStatus[]>([]);
  const [diarizedSegments, setDiarizedSegments] = useState<DiarizedSegment[]>([]);
  const diarizedSegmentsRef = useRef<DiarizedSegment[]>([]); // Ref to access latest value
  const [speakerRoles, setSpeakerRoles] = useState<Record<string, string>>({});

  // NEW: Multi-speaker identification state
  const [pendingSegments, setPendingSegments] = useState<DiarizedSegment[]>([]);
  const [detectedSpeakerList, _setDetectedSpeakerList] = useState<string[]>([]);
  const [speakerRoleMapping, setSpeakerRoleMapping] = useState<Record<string, string>>({});
  const [speakerConfidenceScores, _setSpeakerConfidenceScores] = useState<Record<string, number>>({});
  const [speakerReasoning, _setSpeakerReasoning] = useState<Record<string, string>>({});
  const speakerRolesRef = useRef<Record<string, string>>({}); // Ref to access latest value
  const [lastProcessedChunkIndex, setLastProcessedChunkIndex] = useState(-1);

  // Async transcription processing state
  const [pendingConsultationId, setPendingConsultationId] = useState<string | null>(null);
  const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);

  // PDF generation state
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // CRITICAL: Lock to prevent parallel chunk processing
  // Sarvam batch jobs take 30-120s, so we must process chunks sequentially
  const [isProcessingChunk, setIsProcessingChunk] = useState(false);

  // Consultation type determination from first chunk
  const [determinedConsultationType, setDeterminedConsultationType] = useState<string | null>(null);

  // Realtime subscription for async transcription updates
  const { consultation: _liveConsultation } = useConsultationRealtime({
    consultationId: pendingConsultationId,
    onStatusChange: (updated) => {
      if (updated.transcription_status === 'completed') {
        console.log('✅ Async transcription completed');
        setConsultation(updated.consultation_text);
        setShowProcessingOverlay(false);
        setPendingConsultationId(null);
        alert('Speaker labels processed successfully!');
      } else if (updated.transcription_status === 'failed') {
        console.log('❌ Async transcription failed:', updated.transcription_error);
        setShowProcessingOverlay(false);
        setPendingConsultationId(null);
        alert(
          `Processing failed: ${updated.transcription_error}\n\nYour consultation has been saved with the real-time transcript.`
        );
      }
    },
    enabled: !!pendingConsultationId
  });

  // Previous appointment data for returning patients
  const { previousAppointment, consultation: previousConsultation, loading: previousAppointmentLoading } =
    usePreviousAppointment(preFilledPatient?.id, appointmentContext?.id);

  // Modal state for viewing previous appointment details
  const [showPreviousAppointmentDetail, setShowPreviousAppointmentDetail] = useState(false);

  // Keep refs in sync with state for accessing latest values in async functions
  useEffect(() => {
    diarizedSegmentsRef.current = diarizedSegments;
  }, [diarizedSegments]);

  useEffect(() => {
    speakerRolesRef.current = speakerRoles;
  }, [speakerRoles]);

  // Debug: log diarized segments and chunk status when they update
  useEffect(() => {
    if (diarizedSegments.length > 0) {
      console.log(`📝 Diarized segments updated: ${diarizedSegments.length} total segments`);
      console.log('Latest segments:', diarizedSegments.slice(-3));
    }
  }, [diarizedSegments.length]);

  useEffect(() => {
    if (chunkStatuses.length > 0) {
      const summary = chunkStatuses.map(c => `${c.index}:${c.status}`).join(', ');
      console.log(`📊 Chunk status: [${summary}]`);
    }
  }, [chunkStatuses]);

  useEffect(() => {
    if (Object.keys(speakerRoles).length > 0) {
      console.log('👥 Speaker roles:', speakerRoles);
    }
  }, [speakerRoles]);

  // Recording consent modal state
  const [showConsentModal, setShowConsentModal] = useState(false);

  // OB/GYN during-consultation form state
  // Track which form type is selected (null = none, dynamic from database)
  const [selectedFormType, setSelectedFormType] = useState<string | null>(null);
  const [availableForms, setAvailableForms] = useState<Array<{
    id: string;
    form_type: string;
    specialty: string;
    description: string;
    is_active: boolean;
  }>>([]);

  // Fetch available forms for the specialty
  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await fetch(`${API_URL}/api/form-schemas`);
        if (!response.ok) return;

        const data = await response.json();
        // Filter for OB/GYN forms only
        const obgynForms = data.schemas.filter(
          (schema: any) => schema.specialty === 'obstetrics_gynecology' && schema.is_active
        );
        console.log(`📋 Loaded ${obgynForms.length} OB/GYN forms:`, obgynForms.map((f: any) => f.form_type));
        setAvailableForms(obgynForms);
      } catch (error) {
        console.error('❌ Failed to fetch form schemas:', error);
      }
    };
    fetchForms();
  }, []);

  // Auto-select form when consultation type is determined
  useEffect(() => {
    if (determinedConsultationType && !selectedFormType && availableForms.length > 0) {
      // Check if the determined type matches any available form
      const matchingForm = availableForms.find(f => f.form_type === determinedConsultationType);
      if (matchingForm) {
        console.log(`🎯 Auto-selecting ${determinedConsultationType} form based on detected consultation type`);
        setSelectedFormType(determinedConsultationType);
      }
    }
  }, [determinedConsultationType, selectedFormType, availableForms]);

  // Audio recording refs
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAudioInitializedRef = useRef(false);
  const isStoppingRef = useRef(false); // Prevent multiple simultaneous stop calls

  // NEW: MediaRecorder for speaker diarization (parallel audio blob capture)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ElevenLabs transcription state - tracks completed segments
  const completedTurnsRef = useRef<string[]>([]); // Translated (English) segments
  const currentTurnTranscriptRef = useRef<string>(''); // Current turn (translated)
  const originalCompletedTurnsRef = useRef<string[]>([]); // Original language segments
  const currentOriginalTurnRef = useRef<string>(''); // Current turn (original)

  // Check backend health on page load
  useEffect(() => {
    const checkBackendHealth = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      try {
        const response = await fetch(`${API_URL}/health`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          setBackendStatus('ready');
        } else {
          setBackendStatus('error');
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.warn('Backend health check timed out after 2 seconds');
        }
        setBackendStatus('error');
      }
    };

    checkBackendHealth();
  }, []);

  // Cleanup: Release microphone and close WebSocket when component unmounts
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // DON'T abort background saves - let them complete even after unmount
      // Only abort if save hasn't started (saveLockRef is false)
      if (abortControllerRef.current && !saveLockRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Process a chunk (regular or final) for real-time diarization
  const processChunk = useCallback(async (chunkInfo: any) => {
    try {
      const nextIndex = chunkInfo.index;

      // Check if chunk already exists (prevent duplicate processing)
      const chunkExists = chunkStatuses.some(c => c.index === nextIndex);
      if (chunkExists) {
        console.warn(`⚠️  Chunk ${nextIndex} already processing/processed, skipping`);
        return;
      }

      // Set processing lock to prevent parallel chunks
      setIsProcessingChunk(true);

      // Update chunk status to processing
      setChunkStatuses(prev => [
        ...prev,
        {
          index: nextIndex,
          status: 'processing',
          startTime: chunkInfo.startTime,
          endTime: chunkInfo.endTime
        }
      ]);

      // Prepare FormData for API call
      const formData = new FormData();
      formData.append('audio', chunkInfo.audioBlob, `chunk-${nextIndex}.webm`);
      formData.append('chunk_index', nextIndex.toString());
      formData.append('chunk_start', chunkInfo.startTime.toString());
      formData.append('chunk_end', chunkInfo.endTime.toString());
      formData.append('language', consultationLanguage);

      // NEW: Add consultation context for form extraction
      if (appointmentContext?.id) {
        formData.append('appointment_id', appointmentContext.id);
      }
      if (preFilledPatient?.id) {
        formData.append('patient_id', preFilledPatient.id);
      }
      if (appointmentContext?.appointment_type) {
        formData.append('appointment_type', appointmentContext.appointment_type);
        console.log(`📋 Sending appointment_type to backend: ${appointmentContext.appointment_type}`);
      }

      // Send to backend for diarization + form extraction (combined)
      const response = await fetch(`${API_URL}/api/diarize-chunk`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Chunk diarization failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Chunk ${nextIndex} diarized: ${data.detected_speakers.length} speakers, ${data.segments.length} segments`);

      // NEW: Backend now returns form_type, form_updates, and form_confidence
      if (data.form_type) {
        console.log(`📋 Form type from backend: ${data.form_type}`);
        setDeterminedConsultationType(data.form_type);
      }
      if (data.form_updates && Object.keys(data.form_updates).length > 0) {
        console.log(`📝 Received ${Object.keys(data.form_updates).length} form field updates from backend`);
        console.log(`   Fields: ${Object.keys(data.form_updates).join(', ')}`);
      }

      // Update chunk status to completed
      setChunkStatuses(prev =>
        prev.map(c => c.index === nextIndex ? { ...c, status: 'completed' } : c)
      );

      // If this is not the first chunk, match speakers with previous chunk
      let remappedSegments = data.segments;
      if (nextIndex > 0 && data.start_overlap_stats) {
        // Get previous chunk's end_overlap_stats from state
        setChunkStatuses(prev => {
          const prevChunkData = prev.find(c => c.index === nextIndex - 1);
          if (prevChunkData && (prevChunkData as any).endOverlapStats) {
            // Match speakers across chunks
            const speakerMapping = matchSpeakersAcrossChunks(
              (prevChunkData as any).endOverlapStats,
              data.start_overlap_stats
            );

            // Remap speaker IDs in segments
            remappedSegments = data.segments.map((seg: any) => ({
              ...seg,
              speaker_id: speakerMapping.get(seg.speaker_id) || seg.speaker_id
            }));

            console.log(`🔀 Remapped speakers for chunk ${nextIndex}:`, Object.fromEntries(speakerMapping));
          }
          return prev;
        });
      }

      // Label segments with speaker IDs (roles will be identified during summarization)
      const labeledSegments = remappedSegments.map((seg: any) => ({
        ...seg,
        speaker_role: seg.speaker_id,  // Use speaker_id directly (e.g., "speaker_0", "speaker_1")
        chunk_index: nextIndex,
        // Adjust timestamps to global recording time
        start_time: chunkInfo.startTime + seg.start_time,
        end_time: chunkInfo.startTime + seg.end_time
      }));

      // Merge segments into global list (deduplicate overlaps)
      setDiarizedSegments(prev => {
        // Filter out duplicates using time-based and text similarity
        const newSegments = labeledSegments.filter((newSeg: any) => {
          // Check if this segment is too similar to any existing segment
          const isDuplicate = prev.some(existingSeg => {
            // Same speaker within 2 seconds with similar text
            const timeDiff = Math.abs(newSeg.start_time - existingSeg.start_time);
            const sameOrSimilarTime = timeDiff < 2.0;
            const sameSpeaker = newSeg.speaker_id === existingSeg.speaker_id;

            // Check text similarity (normalized)
            const normalizeText = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
            const newText = normalizeText(newSeg.text);
            const existingText = normalizeText(existingSeg.text);

            // Consider duplicate if same speaker, close in time, and text overlaps significantly
            const textMatch = newText === existingText ||
                              newText.includes(existingText) ||
                              existingText.includes(newText);

            return sameOrSimilarTime && sameSpeaker && textMatch;
          });

          return !isDuplicate;
        });

        console.log(`📥 Adding ${newSegments.length} new segments (${labeledSegments.length - newSegments.length} duplicates filtered)`);

        const merged = [...prev, ...newSegments];
        // Sort by start_time
        merged.sort((a, b) => a.start_time - b.start_time);
        return merged;
      });

      console.log(`📊 Total diarized segments: ${diarizedSegments.length + labeledSegments.length}`);

      // Store overlap stats for next chunk
      setChunkStatuses(prev =>
        prev.map(c => c.index === nextIndex
          ? { ...c, endOverlapStats: data.end_overlap_stats } as any
          : c
        )
      );

      // Update last processed chunk index
      setLastProcessedChunkIndex(nextIndex);

      // REMOVED: Separate consultation type determination call
      // (now integrated into /api/diarize-chunk response as data.form_type)

      // Emit event for form auto-fill with backend-provided form data
      // Use form_type from backend if available, otherwise fall back to specialty-based determination
      const formType = data.form_type || determinedConsultationType || determineFormType(doctorProfile?.specialty, appointmentContext?.appointment_type);
      console.log(`🔍 Using form type: ${formType} (from_backend=${!!data.form_type}, determined=${determinedConsultationType !== null})`);
      console.log(`🔍 Form auto-fill check:`, {
        formType,
        labeledSegments_length: labeledSegments.length,
        preFilledPatient_id: preFilledPatient?.id,
        appointmentContext_patient_id: appointmentContext?.patient_id,
        doctorProfile_specialty: doctorProfile?.specialty,
        will_emit: !!(formType && labeledSegments.length > 0)
      });

      // TEMPORARILY DISABLED: Real-time form filling during recording
      // TODO: Re-enable after fixing backend field extraction reliability
      /*
      if (formType && labeledSegments.length > 0) {
        const eventPayload = {
          segments: labeledSegments,
          chunk_index: nextIndex,
          form_type: formType,
          patient_id: preFilledPatient?.id || appointmentContext?.patient_id,
          // NEW: Include form updates from backend
          field_updates: data.form_updates || {},
          confidence_scores: data.form_confidence || {}
        };

        const subscriberCount = consultationEventBus.getSubscriberCount('diarization_chunk_complete');
        console.log(`📋 Emitting diarization event for ${formType} form auto-fill (chunk #${nextIndex})`, {
          form_type: eventPayload.form_type,
          patient_id: eventPayload.patient_id,
          segments_count: eventPayload.segments.length,
          field_updates_count: Object.keys(eventPayload.field_updates).length,
          subscriber_count: subscriberCount
        });

        consultationEventBus.emit('diarization_chunk_complete', eventPayload);

        // NEW: Identify speaker roles on first chunk with LLM
        if (nextIndex === 0 && labeledSegments.length > 0) {
          try {
            console.log('🎭 Identifying speaker roles with LLM...');

            const roleResponse = await fetch(`${API_URL}/api/identify-speaker-roles`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                segments: labeledSegments.map(seg => ({
                  speaker_id: seg.speaker_id,
                  text: seg.text,
                  start_time: seg.start_time,
                  end_time: seg.end_time
                })),
                language: consultationLanguage,
                confidence_threshold: 0.7
              })
            });

            if (roleResponse.ok) {
              const roleData = await roleResponse.json();

              console.log(`✅ Speaker roles identified:`, roleData.role_mapping);
              console.log(`   Confidence scores:`, roleData.confidence_scores);

              setSpeakerRoleMapping(roleData.role_mapping);
              setSpeakerConfidenceScores(roleData.confidence_scores);
              setSpeakerReasoning(roleData.reasoning || {});

              // Check if manual assignment required
              if (roleData.requires_manual_assignment) {
                console.log(`⚠️  Low confidence for speakers: ${roleData.low_confidence_speakers.join(', ')}`);
                console.log(`   Prompting user for manual assignment...`);

                // Store segments and show modal
                setPendingSegments(labeledSegments);
                setDetectedSpeakerList(data.detected_speakers || []);
                setShowSpeakerMapping(true);

                // Pause chunk processing until user confirms
                // (modal handlers will resume processing)
                return;
              } else {
                // High confidence: apply roles automatically
                console.log(`✓ High confidence - applying roles automatically`);
                setSpeakerRoles(roleData.role_mapping);
                speakerRolesRef.current = roleData.role_mapping;
              }
            } else {
              console.warn('⚠️  Speaker role identification failed, using speaker IDs');
            }
          } catch (error) {
            console.error('❌ Speaker role identification error:', error);
            // Continue with speaker IDs
          }
        }
      } else {
        console.log(`⏭️  Not emitting event: formType=${formType}, segments=${labeledSegments.length}`);
      }
      */

    } catch (error) {
      console.error(`❌ Chunk processing error:`, error);

      // Update chunk status to failed
      const nextIndex = lastProcessedChunkIndex + 1;
      setChunkStatuses(prev =>
        prev.map(c => c.index === nextIndex
          ? { ...c, status: 'failed', error: String(error) }
          : c
        )
      );
    } finally {
      // Always clear processing lock, even on error
      setIsProcessingChunk(false);
      console.log(`🔓 Processing lock released`);
    }
  }, [lastProcessedChunkIndex, recordingTime, consultationLanguage, diarizedSegments.length]);

  // Process next chunk for real-time diarization
  const processNextChunk = useCallback(async () => {
    const nextIndex = lastProcessedChunkIndex + 1;
    console.log(`🎬 Processing chunk ${nextIndex} at ${recordingTime}s`);

    // Extract audio chunk
    const chunkInfo = extractAudioChunk(audioChunksRef.current, nextIndex, recordingTime);
    if (!chunkInfo) {
      console.warn(`⚠️  Could not extract chunk ${nextIndex}`);
      return;
    }

    await processChunk(chunkInfo);
  }, [lastProcessedChunkIndex, recordingTime, processChunk]);

  // Chunk processing timer - process chunks every 30 seconds during recording
  // CRITICAL: Only process one chunk at a time (sequential, not parallel)
  useEffect(() => {
    console.log(`⏱️  Recording monitor: isRecording=${isRecording}, time=${recordingTime}s, lastChunk=${lastProcessedChunkIndex}, processing=${isProcessingChunk}`);

    if (isRecording && recordingTime > 0) {
      // Don't start new chunk if one is already processing
      if (isProcessingChunk) {
        console.log(`⏸️  Chunk processing already in progress, waiting...`);
        return;
      }

      const shouldProcess = shouldProcessNextChunk(recordingTime, lastProcessedChunkIndex);
      console.log(`🤔 Should process next chunk? ${shouldProcess} (time=${recordingTime}s >= ${(lastProcessedChunkIndex + 2) * 60}s)`);

      if (shouldProcess) {
        console.log(`🔒 Acquiring processing lock for chunk ${lastProcessedChunkIndex + 1}`);
        processNextChunk();
      }
    }
  }, [isRecording, recordingTime, lastProcessedChunkIndex, isProcessingChunk, processNextChunk]);

  // Cleanup audio resources
  const cleanupAudio = useCallback(() => {
    // Close WebSocket connection
    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.close();
      }
      websocketRef.current = null;
      console.log('🔌 WebSocket closed');
    }

    // Stop audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop audio stream
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
      console.log('🎤 Microphone released');
    }

    // Clear chunk processing lock
    setIsProcessingChunk(false);

    isAudioInitializedRef.current = false;
  }, []);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!consultation.trim()) {
      alert('Please enter or record a consultation before analyzing.');
      return;
    }

    setIsAnalyzing(true);

    try {
      // If no summary exists, run summarization first
      let summaryData = consultationSummary;
      if (!summaryData) {
        // Prepare request body with full parameters to match PatientDetailView implementation
        const requestBody = {
          text: consultation,
          original_text: originalTranscript.trim() && originalTranscript.trim() !== consultation.trim()
            ? originalTranscript
            : undefined,
          patient_info: {
            patient_id: preFilledPatient?.id,
            patient_age: patientDetails?.age,
            patient_name: patientDetails?.name,
            sex: patientDetails?.sex,
            height: patientDetails?.height,
            weight: patientDetails?.weight,
            current_medications: patientDetails?.currentMedications,
            current_conditions: patientDetails?.currentConditions
          },
          is_from_transcription: true,
          transcription_language: consultationLanguage || 'en'
        };

        const response = await fetch(`${API_URL}/api/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error('Summarization failed');
        }

        const data = await response.json();
        if (data.success) {
          summaryData = data;
          setConsultationSummary(data);
          console.log('✅ Consultation auto-summarized before analysis');
        }
      }

      // NOTE: Saving is now handled in stopRecording() for the diarization flow
      // Old signature save calls removed to match new interface

      // Extract summary text from structured data or use legacy string
      const summaryText = summaryData
        ? (typeof summaryData === 'string' ? summaryData : summaryData.summary || '')
        : '';

      // Use summary if available, otherwise fall back to full transcript
      const textToAnalyze = summaryText.trim() || consultation.trim();

      if (textToAnalyze) {
        // Pass both the summary/consultation and original transcript
        // If no translation occurred, originalTranscript will be empty
        const finalOriginal = originalTranscript.trim() || consultation.trim();
        onAnalyze(
          textToAnalyze,
          patientDetails,
          shouldTranslateToEnglish && originalTranscript.trim() ? finalOriginal : undefined,
          detectedLanguage || undefined,
          consultation.trim(), // Pass full transcript
          summaryText.trim() // Pass summary text
        );
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze consultation. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFeedback = async (
    feedbackType: string,
    sentiment: 'positive' | 'negative',
    data: any
  ) => {
    if (!pendingConsultationId) {
      console.warn('Cannot submit feedback: No consultation ID available');
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const payload = {
        consultation_id: pendingConsultationId,
        feedback_type: feedbackType,
        feedback_sentiment: sentiment,
        ...data
      };

      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to submit feedback');
      }

      const result = await response.json();
      console.log('✅ Feedback submitted:', result);

      setFeedbackSubmitted(prev => ({
        ...prev,
        [data.component_identifier || feedbackType]: sentiment
      }));

    } catch (error) {
      console.error('❌ Failed to submit feedback:', error);
      throw error;
    }
  };

  // Helper function to extract form fields and auto-fill the consultation form
  const callAutoFillEndpoint = async (consultationId: string) => {
    try {
      if (!appointmentContext || !preFilledPatient) {
        console.warn('⚠️ Cannot auto-fill form: missing appointmentContext or preFilledPatient');
        return;
      }

      console.log(`📋 Auto-filling form for consultation ${consultationId}...`);

      // Get Firebase ID token for authentication
      const idToken = await getIdToken();
      if (!idToken) {
        console.warn('⚠️ Cannot auto-fill form: no ID token available');
        return;
      }

      // Prepare request body
      const requestBody = {
        consultation_id: consultationId,
        appointment_id: appointmentContext?.id || null,
        patient_id: preFilledPatient.id,
        original_transcript: originalTranscript || consultation,
        consultation_text: consultation,
        patient_snapshot: {
          name: preFilledPatient.name,
          age: getPatientAge(preFilledPatient),
          sex: preFilledPatient.sex,
          allergies: preFilledPatient.allergies,
          current_medications: preFilledPatient.current_medications,
          current_conditions: preFilledPatient.current_conditions
        }
      };

      // Call backend endpoint with Authorization header
      const response = await fetch(`${API_URL}/api/auto-fill-consultation-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('⚠️ Form auto-fill failed:', errorData.detail || response.statusText);
        return; // Don't throw - this shouldn't block summarization
      }

      const data = await response.json();

      if (data.success) {
        console.log(`✅ ${data.form_created ? 'Created' : 'Updated'} ${data.consultation_type} form`);
        console.log(`   Form ID: ${data.form_id}`);
        console.log(`   Confidence: ${(data.confidence * 100).toFixed(0)}%`);
        console.log(`   Fields extracted: ${Object.keys(data.field_updates).length}`);
        console.log(`   Reasoning: ${data.reasoning}`);

        // Set determined consultation type so form auto-selects
        if (data.consultation_type) {
          setDeterminedConsultationType(data.consultation_type);

          // If form is not currently visible, show it
          if (selectedFormType !== data.consultation_type) {
            setSelectedFormType(data.consultation_type);
          }

          // Emit event to update any already-mounted form with the extracted data
          // Use setTimeout to ensure form component has mounted if it wasn't visible before
          setTimeout(() => {
            consultationEventBus.emit('diarization_chunk_complete', {
              segments: [],
              chunk_index: -1,
              form_type: data.consultation_type,
              patient_id: preFilledPatient?.id,
              field_updates: data.field_updates || {},
              confidence_scores: data.field_confidence || {}
            });
            console.log(`📤 Emitted form update event for ${data.consultation_type} with ${Object.keys(data.field_updates || {}).length} fields`);
          }, 300);
        }
      } else {
        console.warn('⚠️ Form auto-fill unsuccessful:', data.error);
      }

    } catch (error) {
      console.error('❌ Error in form auto-fill:', error);
      // Don't throw - form filling failure shouldn't block summarization
    }
  };

  const handleSummarize = async () => {
    if (!consultation.trim()) {
      alert('Please enter or record a consultation before summarizing.');
      return;
    }

    setIsSummarizing(true);
    try {
      // Prepare request body with full parameters to match PatientDetailView implementation
      const requestBody = {
        text: consultation,  // This is the translated (English) version
        original_text: originalTranscript.trim() && originalTranscript.trim() !== consultation.trim()
          ? originalTranscript
          : undefined,
        patient_info: {
          patient_id: preFilledPatient?.id,
          patient_age: patientDetails?.age,
          patient_name: patientDetails?.name,
          sex: patientDetails?.sex,
          height: patientDetails?.height,
          weight: patientDetails?.weight,
          current_medications: patientDetails?.currentMedications,
          current_conditions: patientDetails?.currentConditions
        },
        is_from_transcription: true,
        transcription_language: consultationLanguage || 'en'
      };

      const response = await fetch(`${API_URL}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Summarization failed');
      }

      const data = await response.json();
      if (data.success) {
        // Store the entire structured response
        setConsultationSummary(data);
        console.log('✅ Consultation summarized');

        // Save consultation if not already saved (for manual text entry or when summarize is clicked before stopping recording)
        let consultationId = pendingConsultationId;

        if (!consultationId && onSaveConsultation && preFilledPatient) {
          console.log('💾 Saving consultation before auto-fill...');

          // Prepare patient snapshot
          const patientSnapshot = {
            name: preFilledPatient.name,
            age: getPatientAge(preFilledPatient),
            sex: preFilledPatient.sex,
            allergies: preFilledPatient.allergies,
            current_medications: preFilledPatient.current_medications,
            current_conditions: preFilledPatient.current_conditions
          };

          const saved = await onSaveConsultation({
            patient_id: preFilledPatient.id,
            appointment_id: appointmentContext?.id || null,
            consultation_text: consultation,
            original_transcript: originalTranscript || consultation,
            transcription_language: consultationLanguage,
            audio_url: null,
            patient_snapshot: patientSnapshot,
            consultation_duration_seconds: 0,
            transcription_status: 'completed'
          });

          if (saved) {
            consultationId = saved.id;
            setPendingConsultationId(saved.id);
            console.log(`✅ Consultation saved (id: ${saved.id})`);
          }
        }

        // NEW: Call auto-fill endpoint if we have a saved consultation
        if (consultationId) {
          console.log(`📋 Triggering form auto-fill for consultation ${consultationId}...`);
          await callAutoFillEndpoint(consultationId);
        } else {
          console.warn('⚠️ No consultation ID available - skipping form auto-fill');
        }

        // NEW: Trigger form auto-fill if we have diarized segments
        const segments = diarizedSegmentsRef.current;
        console.log(`🔍 Post-summarize form auto-fill check:`, {
          segments_length: segments?.length || 0,
          preFilledPatient_id: preFilledPatient?.id,
          determinedConsultationType,
          doctorProfile_specialty: doctorProfile?.specialty,
          appointmentContext_type: appointmentContext?.appointment_type
        });

        if (segments && segments.length > 0 && preFilledPatient?.id) {
          const formType = determinedConsultationType || determineFormType(doctorProfile?.specialty, appointmentContext?.appointment_type);
          console.log(`🔍 Computed formType: ${formType}`);

          if (formType) {
            const subscriberCount = consultationEventBus.getSubscriberCount('diarization_chunk_complete');
            console.log(`📋 Emitting diarization event for ${formType} form auto-fill after summarization (${subscriberCount} subscribers)`);

            consultationEventBus.emit('diarization_chunk_complete', {
              segments,
              chunk_index: 999, // Use a high number to indicate this is a summary-triggered event
              form_type: formType,
              patient_id: preFilledPatient.id,
              speaker_role_mapping: speakerRolesRef.current,
              field_updates: {},  // Let the form extract fields from segments
              confidence_scores: {}
            });

            console.log(`✅ Form auto-fill event emitted with ${segments.length} segments`);
          } else {
            console.warn(`⚠️  Cannot emit event: formType is null`);
          }
        } else {
          console.warn(`⚠️  Cannot emit event: missing required data`, {
            has_segments: !!(segments && segments.length > 0),
            has_patient_id: !!preFilledPatient?.id
          });
        }
      } else {
        throw new Error('Invalid response from summarization endpoint');
      }
    } catch (error) {
      console.error('Summarization error:', error);
      alert('Failed to summarize consultation. Please try again.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Download consultation form PDF
  const handleDownloadPdf = async () => {
    if (!appointmentContext?.id) {
      console.error('Cannot download PDF: No appointment ID');
      return;
    }

    setGeneratingPdf(true);
    try {
      const response = await fetch(
        `${API_URL}/api/appointments/${appointmentContext.id}/consultation-pdf`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate PDF');
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      const patientName = (preFilledPatient?.name || appointmentContext.patient?.name || 'Patient').replace(/\s+/g, '_');
      a.download = `consultation_form_${patientName}_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Background save function for fire-and-forget operation
  const performBackgroundSave = async (): Promise<void> => {
    setIsSavingInBackground(true);
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Summarize if not already done
      let summaryData = consultationSummary;
      if (!summaryData) {
        // Prepare request body with full parameters to match PatientDetailView implementation
        const requestBody = {
          text: consultation,
          original_text: originalTranscript.trim() && originalTranscript.trim() !== consultation.trim()
            ? originalTranscript
            : undefined,
          patient_info: {
            patient_id: preFilledPatient?.id,
            patient_age: patientDetails?.age,
            patient_name: patientDetails?.name,
            sex: patientDetails?.sex,
            height: patientDetails?.height,
            weight: patientDetails?.weight,
            current_medications: patientDetails?.currentMedications,
            current_conditions: patientDetails?.currentConditions
          },
          is_from_transcription: true,
          transcription_language: consultationLanguage || 'en'
        };

        const response = await fetch(`${API_URL}/api/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) throw new Error('Summarization failed');

        const data = await response.json();
        if (data.success) {
          summaryData = data;
          setConsultationSummary(data);
          console.log('✅ Background summarization completed');
        }
      }

      // Step 2: Save consultation to database if not already saved
      if (!pendingConsultationId && onSaveConsultation && preFilledPatient) {
        console.log('💾 Saving consultation to database...');

        const patientSnapshot = {
          name: preFilledPatient.name,
          age: getPatientAge(preFilledPatient),
          sex: preFilledPatient.sex,
          allergies: preFilledPatient.allergies,
          current_medications: preFilledPatient.current_medications,
          current_conditions: preFilledPatient.current_conditions
        };

        const saved = await onSaveConsultation({
          patient_id: preFilledPatient.id,
          appointment_id: appointmentContext?.id || null,
          consultation_text: consultation,
          original_transcript: originalTranscript || consultation,
          transcription_language: consultationLanguage,
          audio_url: null,
          patient_snapshot: patientSnapshot,
          consultation_duration_seconds: recordingTime,
          transcription_status: 'completed'
        });

        if (saved) {
          setPendingConsultationId(saved.id);
          console.log(`✅ Consultation saved (id: ${saved.id})`);
        } else {
          console.error('❌ Failed to save consultation');
        }
      } else if (pendingConsultationId) {
        console.log(`ℹ️ Consultation already saved (id: ${pendingConsultationId})`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Background save aborted');
        return;
      }
      console.error('Background save failed:', error);
    } finally {
      setIsSavingInBackground(false);
    }
  };

  // Handle save and close with fire-and-forget pattern
  const handleSaveAndClose = () => {
    // Validation
    if (!consultation.trim()) {
      alert('Cannot save empty consultation');
      return;
    }

    if (isRecording) {
      alert('Please stop recording before saving');
      return;
    }

    // Prevent duplicate saves
    if (saveLockRef.current) {
      console.log('Save already in progress');
      return;
    }

    saveLockRef.current = true;

    // Fire-and-forget: Start background save
    performBackgroundSave()
      .catch(err => console.error('Background save error:', err))
      .finally(() => {
        saveLockRef.current = false;
      });

    // Immediate navigation (don't await)
    if (onCloseConsultation) {
      onCloseConsultation();
    }
  };

  // Update a single patient detail field
  const updatePatientDetail = (field: keyof PatientDetails, value: string) => {
    setPatientDetails(prev => ({ ...prev, [field]: value }));
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Connect to ElevenLabs WebSocket for real-time streaming with auto language detection
  const connectToElevenLabs = useCallback(async (): Promise<WebSocket> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Reset transcription state for new session
        completedTurnsRef.current = [];
        currentTurnTranscriptRef.current = '';
        originalCompletedTurnsRef.current = [];
        currentOriginalTurnRef.current = '';

        // Step 1: Get temporary token from our backend
        console.log('🔑 Fetching ElevenLabs token from backend...');
        const tokenResponse = await fetch(`${API_URL}/api/get-transcription-token`);
        if (!tokenResponse.ok) {
          throw new Error('Failed to get transcription token');
        }
        const { token } = await tokenResponse.json();
        console.log('✅ Token received');

        // Step 2: Connect to ElevenLabs WebSocket with token
        // Token is passed as 'token' query parameter (per ElevenLabs docs)
        const url = `${ELEVENLABS_WS_URL}?model_id=scribe_v2_realtime&audio_format=pcm_16000&token=${token}`;
        console.log('🔌 Connecting to ElevenLabs WebSocket...');

        const ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('✅ ElevenLabs WebSocket connected');
          resolve(ws);
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📩 ElevenLabs:', data.message_type, data);

            switch (data.message_type) {
              case 'session_started':
                console.log('✅ Session started');
                if (data.language_code) {
                  setDetectedLanguage(data.language_code);
                  console.log(`🌍 Detected language: ${data.language_code}`);
                }
                break;

              case 'partial_transcript':
                // Interim results during processing
                if (data.text) {
                  console.log(`[PARTIAL] Text: "${data.text}", Lang: ${data.language_code || 'unknown'}`);

                  // Store original text
                  currentOriginalTurnRef.current = data.text;

                  // Translate if enabled
                  const displayText = await translateText(data.text);
                  currentTurnTranscriptRef.current = displayText;

                  const completedText = completedTurnsRef.current.join(' ');
                  const fullText = completedText
                    ? `${completedText} ${displayText}`
                    : displayText;
                  setConsultation(fullText);
                  setInterimTranscript(displayText);

                  // Update original transcript state
                  const originalCompleted = originalCompletedTurnsRef.current.join(' ');
                  const fullOriginal = originalCompleted
                    ? `${originalCompleted} ${data.text}`
                    : data.text;
                  setOriginalTranscript(fullOriginal);
                }
                break;

              case 'committed_transcript':
              case 'committed_transcript_with_timestamps':
                // Final segment transcription
                if (data.text) {
                  console.log(`[COMMITTED] Text: "${data.text}", Lang: ${data.language_code || 'unknown'}`);

                  // Save original transcript
                  originalCompletedTurnsRef.current.push(data.text);
                  currentOriginalTurnRef.current = '';

                  // Translate if enabled
                  const translatedText = await translateText(data.text);

                  // Save the completed translated transcript
                  completedTurnsRef.current.push(translatedText);
                  currentTurnTranscriptRef.current = '';

                  // Update consultation with all completed transcripts (translated)
                  const fullText = completedTurnsRef.current.join(' ');
                  setConsultation(fullText);
                  setInterimTranscript('');

                  // Update original transcript state
                  const fullOriginal = originalCompletedTurnsRef.current.join(' ');
                  setOriginalTranscript(fullOriginal);

                  // Update detected language if provided
                  if (data.language_code) {
                    setDetectedLanguage(data.language_code);
                    console.log(`🌍 Language: ${data.language_code}`);
                  }
                }
                break;

              case 'input_error':
                console.error('❌ ElevenLabs input error:', data);
                break;
            }
          } catch (err) {
            console.error('Error parsing ElevenLabs message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ ElevenLabs WebSocket error:', error);
          reject(error);
        };

        ws.onclose = (event) => {
          console.log(`🔌 ElevenLabs WebSocket closed: ${event.code} ${event.reason}`);
          websocketRef.current = null;

          // On close, ensure any remaining current transcript is saved
          if (currentTurnTranscriptRef.current) {
            completedTurnsRef.current.push(currentTurnTranscriptRef.current);
            const finalText = completedTurnsRef.current.join(' ');
            setConsultation(finalText);
            currentTurnTranscriptRef.current = '';
          }
          if (currentOriginalTurnRef.current) {
            originalCompletedTurnsRef.current.push(currentOriginalTurnRef.current);
            const finalOriginal = originalCompletedTurnsRef.current.join(' ');
            setOriginalTranscript(finalOriginal);
            currentOriginalTurnRef.current = '';
          }
          setInterimTranscript('');
        };
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  // Connect to Sarvam WebSocket for real-time streaming (Indian languages)
  // Sarvam uses speech-to-text-translate which automatically translates to English
  const connectToSarvam = useCallback(async (languageCode: ConsultationLanguage): Promise<WebSocket> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Reset transcription state for new session
        completedTurnsRef.current = [];
        currentTurnTranscriptRef.current = '';
        originalCompletedTurnsRef.current = [];
        currentOriginalTurnRef.current = '';

        // Step 1: Get Sarvam API key from our backend
        console.log('🔑 Fetching Sarvam API key from backend...');
        const tokenResponse = await fetch(`${API_URL}/api/get-sarvam-token`);
        if (!tokenResponse.ok) {
          throw new Error('Failed to get Sarvam API key');
        }
        const { api_key } = await tokenResponse.json();
        console.log('✅ Sarvam API key received');

        // Step 2: Connect to Sarvam WebSocket using subprotocol authentication
        // Using speech-to-text-translate endpoint which auto-translates to English
        // Authentication: API key passed as WebSocket subprotocol (discovered from SDK source)
        // For PCM audio, we MUST specify input_audio_codec in the URL query params
        const params = new URLSearchParams({
          model: 'saaras:v2.5',
          sample_rate: '16000',
          input_audio_codec: 'pcm_s16le',  // Required for raw PCM audio
          high_vad_sensitivity: 'true',
          vad_signals: 'true'
        });
        const url = `${SARVAM_WS_URL}?${params.toString()}`;
        console.log('🔌 Connecting to Sarvam WebSocket...', url);

        // Pass API key as WebSocket subprotocol (format: api-subscription-key.YOUR_KEY)
        const ws = new WebSocket(url, [`api-subscription-key.${api_key}`]);

        ws.onopen = () => {
          console.log('✅ Sarvam WebSocket connected');
          setDetectedLanguage(languageCode);
          resolve(ws);
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📩 Sarvam:', data.type, data);

            switch (data.type) {
              case 'events':
                // VAD events: START_SPEECH, END_SPEECH
                const signal = data.data?.signal_type;
                if (signal === 'START_SPEECH') {
                  console.log('🎤 Speech started');
                } else if (signal === 'END_SPEECH') {
                  console.log('🎤 Speech ended');
                }
                break;

              case 'data':
                // Sarvam STTT data message contains transcript and optionally translation
                // Structure: { type: 'data', data: { transcript: '...', translation?: '...' } }
                const payload = data.data;
                console.log('📝 Sarvam data payload:', payload);

                if (payload) {
                  const transcript = payload.transcript || '';
                  const translation = payload.translation || '';

                  // Use translation if available, otherwise use transcript directly
                  // (When speaking English, Sarvam returns transcript only, no translation)
                  const textForConsultation = translation || transcript;

                  if (textForConsultation) {
                    console.log(`[TEXT] "${textForConsultation}"${translation ? ' (translated)' : ''}`);

                    // Save the completed transcript
                    completedTurnsRef.current.push(textForConsultation);
                    currentTurnTranscriptRef.current = '';

                    // Update consultation with all completed transcripts
                    const fullText = completedTurnsRef.current.join(' ');
                    setConsultation(fullText);
                    setInterimTranscript('');
                  }

                  // Store original language text if different from what we're showing
                  if (transcript && translation) {
                    console.log(`[ORIGINAL] ${transcript}`);
                    originalCompletedTurnsRef.current.push(transcript);
                    const fullOriginal = originalCompletedTurnsRef.current.join(' ');
                    setOriginalTranscript(fullOriginal);
                  }
                }
                break;

              case 'speech_start':
                console.log('🎤 Speech started');
                break;

              case 'speech_end':
                console.log('🎤 Speech ended');
                break;

              case 'translation':
                // Legacy handler - kept for compatibility
                if (data.text) {
                  console.log(`[TRANSLATION] English: "${data.text}"`);
                  const translatedText = data.text;
                  if (data.transcript) {
                    originalCompletedTurnsRef.current.push(data.transcript);
                    const fullOriginal = originalCompletedTurnsRef.current.join(' ');
                    setOriginalTranscript(fullOriginal);
                  }
                  completedTurnsRef.current.push(translatedText);
                  currentTurnTranscriptRef.current = '';
                  const fullText = completedTurnsRef.current.join(' ');
                  setConsultation(fullText);
                  setInterimTranscript('');
                }
                break;

              case 'transcript':
                // Regular transcript (for STT without translation)
                if (data.text) {
                  console.log(`[TRANSCRIPT] Text: "${data.text}"`);
                  originalCompletedTurnsRef.current.push(data.text);
                  const fullOriginal = originalCompletedTurnsRef.current.join(' ');
                  setOriginalTranscript(fullOriginal);
                  completedTurnsRef.current.push(data.text);
                  const fullText = completedTurnsRef.current.join(' ');
                  setConsultation(fullText);
                  setInterimTranscript('');
                }
                break;

              case 'error':
                console.error('❌ Sarvam error:', data);
                break;
            }
          } catch (err) {
            console.error('Error parsing Sarvam message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ Sarvam WebSocket error:', error);
          reject(error);
        };

        ws.onclose = (event) => {
          console.log(`🔌 Sarvam WebSocket closed: ${event.code} ${event.reason}`);
          websocketRef.current = null;

          // On close, ensure any remaining current transcript is saved
          if (currentTurnTranscriptRef.current) {
            completedTurnsRef.current.push(currentTurnTranscriptRef.current);
            const finalText = completedTurnsRef.current.join(' ');
            setConsultation(finalText);
            currentTurnTranscriptRef.current = '';
          }
          setInterimTranscript('');
        };
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  // Track which transcription provider is active
  const transcriptionProviderRef = useRef<'elevenlabs' | 'sarvam'>('elevenlabs');

  // Translate text to English using backend API
  const translateText = useCallback(async (text: string): Promise<string> => {
    if (!text.trim() || !shouldTranslateToEnglish) {
      return text;
    }

    try {
      const response = await fetch(`${API_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        console.error('Translation failed');
        return text; // Return original on error
      }

      const data = await response.json();
      if (data.success) {
        console.log(`🌍 Translated: "${text}" → "${data.translated_text}"`);
        return data.translated_text;
      }
      return text;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original on error
    }
  }, [shouldTranslateToEnglish]);

  // Start streaming audio to transcription service (Sarvam or ElevenLabs based on language)
  const startStreamingRecording = async () => {
    try {
      setIsConnectingToTranscription(true);
      setConnectionStatus('Requesting microphone...');

      // Reset chunked diarization state and consultation transcript
      setChunkStatuses([]);
      setDiarizedSegments([]);
      setSpeakerRoles({});
      setLastProcessedChunkIndex(-1);
      setConsultation(''); // Clear consultation for fresh real-time transcript
      console.log('🔄 Reset chunked diarization state and consultation');

      // Determine which provider to use based on consultation language
      const useSarvam = isSarvamLanguage(consultationLanguage);
      transcriptionProviderRef.current = useSarvam ? 'sarvam' : 'elevenlabs';
      console.log(`🌐 Using ${useSarvam ? 'Sarvam' : 'ElevenLabs'} for ${consultationLanguage}`);

      // Get microphone access - use simpler constraints for better browser compatibility
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      audioStreamRef.current = stream;
      console.log('🎤 Microphone ready');

      setConnectionStatus('Connecting to server...');

      // Connect to the appropriate transcription service
      let ws: WebSocket;
      if (useSarvam) {
        ws = await connectToSarvam(consultationLanguage);
      } else {
        ws = await connectToElevenLabs();
      }
      websocketRef.current = ws;

      // Create audio context - browser will use its default sample rate
      // AudioContext will resample to 16kHz for us
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      console.log(`🎵 Audio context created with sample rate: ${audioContext.sampleRate}Hz`);

      // Create audio source from stream
      const source = audioContext.createMediaStreamSource(stream);

      // Create script processor to capture audio data
      // Using 4096 buffer size for good balance of latency and efficiency
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = float32ToInt16(inputData);

          // Convert to base64
          const audioBase64 = btoa(
            String.fromCharCode(...new Uint8Array(pcmData.buffer))
          );

          // Send in appropriate format based on provider
          if (transcriptionProviderRef.current === 'sarvam') {
            // Sarvam format - AudioData type requires:
            // - encoding: MUST be 'audio/wav' (literal)
            // - input_audio_codec: actual format (pcm_s16le, wav, etc.)
            websocketRef.current.send(JSON.stringify({
              audio: {
                data: audioBase64,
                sample_rate: 16000,
                encoding: 'audio/wav',  // MUST be 'audio/wav' per Pydantic model
                input_audio_codec: 'pcm_s16le'  // actual audio format
              }
            }));
          } else {
            // ElevenLabs format
            websocketRef.current.send(JSON.stringify({
              message_type: 'input_audio_chunk',
              audio_base_64: audioBase64,
              commit: false,
              sample_rate: 16000
            }));
          }
        }
      };

      // Connect the audio pipeline
      source.connect(processor);
      processor.connect(audioContext.destination);

      // NEW: Start MediaRecorder for audio blob capture (for speaker diarization)
      console.log('🎬 Attempting to start MediaRecorder for chunked diarization...');
      try {
        audioChunksRef.current = []; // Reset chunks
        resetWebMInitSegment(); // Reset WebM init segment for new recording
        console.log('🎬 Creating MediaRecorder with stream:', stream);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        console.log('🎬 MediaRecorder created successfully');

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0 && !isPausedRef.current) {
            audioChunksRef.current.push(e.data);
            console.log(`📦 Audio chunk collected: ${e.data.size} bytes (total: ${audioChunksRef.current.length} chunks)`);
          } else if (e.data.size > 0 && isPausedRef.current) {
            console.log(`⏸️  Skipping paused chunk: ${e.data.size} bytes`);
          }
        };

        mediaRecorder.start(60000); // Collect chunks every 60 seconds
        mediaRecorderRef.current = mediaRecorder;
        console.log('✅ MediaRecorder started for diarization - will collect 60-second chunks');
      } catch (err) {
        console.error('❌ MediaRecorder failed (diarization won\'t work):', err);
        // Don't fail the whole recording - just skip diarization
      }

      isAudioInitializedRef.current = true;
      setIsConnectingToTranscription(false);
      setConnectionStatus('');
      setIsRecording(true);
      setRecordingTime(0);
      startTimer();

      console.log(`🎙️ Streaming recording started with ${transcriptionProviderRef.current}`);

    } catch (err) {
      console.error('Error starting streaming recording:', err);
      console.error('Error details:', err);
      setIsConnectingToTranscription(false);
      setConnectionStatus('');
      cleanupAudio();

      if (err instanceof Error) {
        if (err.message.includes('transcription token') || err.message.includes('Sarvam API')) {
          alert(`Unable to connect to transcription service. Please check your configuration. Error: ${err.message}`);
        } else if (err.name === 'NotAllowedError') {
          alert('Microphone access denied. Please allow microphone access and try again.');
        } else if (err.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.');
        } else if (err.name === 'NotReadableError') {
          alert('Microphone is already in use by another application.');
        } else {
          alert(`Unable to start recording: ${err.message}`);
        }
      } else if (err && typeof err === 'object' && 'type' in err) {
        // WebSocket error event
        alert('Unable to connect to transcription service. Please check your internet connection and try again.');
      } else {
        alert(`Unable to start recording: ${String(err)}`);
      }
    }
  };

  // Stop streaming recording (ASYNC VERSION - saves immediately, processes final chunk in background)
  const stopStreamingRecording = async () => {
    // Guard against multiple calls
    if (isStoppingRef.current) {
      console.log('⚠️ Already stopping...');
      return;
    }

    isStoppingRef.current = true;
    console.log('🛑 Stopping recording...');

    // IMMEDIATE state updates to change UI before async operations
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);

    stopTimer();
    setInterimTranscript('');

    // Stop MediaRecorder
    if (mediaRecorderRef.current?.state !== 'inactive') {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        await new Promise<void>(resolve => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => resolve();
          } else {
            resolve();
          }
        });
        mediaRecorderRef.current = null;
      }
    }

    // Extract final chunk info (if any remaining audio)
    const finalChunkInfo = extractFinalChunk(
      audioChunksRef.current,
      lastProcessedChunkIndex,
      recordingTime
    );

    // Upload audio to GCS first (to get audio_url before saving)
    let audioGcsUrl: string | null = null;
    if (audioChunksRef.current.length > 0) {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);

        const res = await fetch(`${API_URL}/api/upload-audio`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const result = await res.json();
          audioGcsUrl = result.gcs_uri;
          console.log('✅ Audio uploaded to GCS:', audioGcsUrl);
        }
      } catch (e) {
        console.error('❌ Audio upload failed:', e);
      }
    }

    // Determine consultation text and status
    const segments = diarizedSegmentsRef.current;
    let consultationText: string;
    let status: 'pending' | 'completed';

    if (segments.length > 0 && !finalChunkInfo) {
      // Already have full diarization from chunked processing (no final chunk)
      consultationText = segments
        .sort((a, b) => a.start_time - b.start_time)
        .map(s => `${s.speaker_role || s.speaker_id}: ${s.text}`)
        .join('\n\n');
      status = 'completed';
      console.log('✅ Using existing diarized segments, marking as completed');
    } else {
      // Use real-time transcript, mark as pending if we have a final chunk to process
      consultationText = consultation || 'Recording completed';
      status = finalChunkInfo ? 'pending' : 'completed';
      console.log(`ℹ️  Using real-time transcript, status: ${status}`);
    }

    // Clean up audio resources
    cleanupAudio();

    // Prepare patient snapshot
    const patientSnapshot = preFilledPatient ? {
      name: preFilledPatient.name,
      age: getPatientAge(preFilledPatient),
      sex: preFilledPatient.sex,
      allergies: preFilledPatient.allergies,
      current_medications: preFilledPatient.current_medications,
      current_conditions: preFilledPatient.current_conditions
    } : null;

    // Check consultation duration and log warning if < 60 seconds
    if (recordingTime < 60) {
      console.warn(
        `⚠️ Short consultation detected: ${recordingTime} seconds (< 60 seconds). ` +
        `All processing will continue normally.`
      );
    }

    // Save consultation IMMEDIATELY (don't wait for diarization)
    console.log('💾 Saving consultation immediately...');
    try {
      if (!onSaveConsultation || !preFilledPatient) {
        console.error('❌ Cannot save consultation: missing onSaveConsultation or preFilledPatient');
        isStoppingRef.current = false; // Reset guard before early return
        return;
      }

      const saved = await onSaveConsultation({
        patient_id: preFilledPatient.id,
        appointment_id: appointmentContext?.id || null,
        consultation_text: consultationText,
        original_transcript: originalTranscript || consultation,
        transcription_language: consultationLanguage,
        audio_url: audioGcsUrl,
        patient_snapshot: patientSnapshot,
        consultation_duration_seconds: recordingTime,
        transcription_status: status
      });

      if (!saved) {
        alert('Failed to save consultation');
        isStoppingRef.current = false; // Reset guard before early return
        return;
      }

      console.log(`✅ Consultation saved (id: ${saved.id}, status: ${status})`);

      // If pending, trigger async processing
      if (finalChunkInfo && status === 'pending') {
        console.log('🚀 Triggering async final chunk processing...');

        const formData = new FormData();
        formData.append('audio', finalChunkInfo.audioBlob);
        formData.append('consultation_id', saved.id);
        formData.append('chunk_index', finalChunkInfo.index.toString());
        formData.append('chunk_start', finalChunkInfo.startTime.toString());
        formData.append('chunk_end', finalChunkInfo.endTime.toString());
        formData.append('language', consultationLanguage);

        try {
          const res = await fetch(`${API_URL}/api/process-final-chunk-async`, {
            method: 'POST',
            body: formData
          });

          if (res.ok) {
            const result = await res.json();
            console.log('✅ Async processing queued:', result);
            setPendingConsultationId(saved.id);
            setShowProcessingOverlay(true);
          } else {
            console.error('❌ Failed to queue async processing:', await res.text());
          }
        } catch (e) {
          console.error('❌ Failed to trigger async processing:', e);
        }
      }

      setConsultation(consultationText);
    } catch (err) {
      console.error('❌ Failed to save consultation:', err);
      alert('Failed to save consultation. Please try again.');
      isStoppingRef.current = false; // Reset guard after error
    }

    console.log('🎙️ Recording stopped and saved');
    isStoppingRef.current = false; // Reset guard
  };

  // Helper: Upload audio blob to GCS
  const uploadAudioToGCS = async (blob: Blob) => {
    try {
      console.log(`📤 Uploading audio to GCS (${(blob.size / 1024).toFixed(2)} KB)...`);

      const formData = new FormData();
      formData.append('audio', blob, `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`);

      const response = await fetch(`${API_URL}/api/upload-audio`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Audio uploaded to GCS: ${data.gcs_uri}`);

      // Save the audio URL to state so it can be included in the consultation
      if (data.gcs_uri) {
        setAudioUrl(data.gcs_uri);
      }

      return data;
    } catch (error) {
      console.error('❌ Audio upload error:', error);
      // Non-blocking - don't interrupt the main flow
      return null;
    }
  };

  // NEW: Process speaker diarization (unused for now, will be enabled later)
  const processDiarization = async () => {
    try {
      setIsDiarizing(true);
      console.log('🎤 Starting diarization...');

      // Create audio blob from chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log(`📊 Audio blob size: ${(audioBlob.size / 1024).toFixed(2)} KB`);

      // Upload recording to GCS for storage
      uploadAudioToGCS(audioBlob);

      // Send to backend for diarization
      // Use Sarvam for Indian languages, ElevenLabs/Pyannote for auto-detect and others
      const useSarvam = isSarvamLanguage(consultationLanguage);
      const endpoint = useSarvam ? '/api/diarize-sarvam' : '/api/diarize';
      console.log(`🔀 Using ${useSarvam ? 'Sarvam' : 'ElevenLabs/Pyannote'} diarization`);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Diarization failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Diarization complete:', data);

      // If multiple speakers detected, show speaker mapping modal
      if (data.success && data.detected_speakers && data.detected_speakers.length > 1) {
        setDiarizationData(data);
        setShowSpeakerMapping(true);
      } else {
        console.log('Single speaker or diarization skipped - using realtime transcript');
      }

    } catch (error) {
      console.error('❌ Diarization error:', error);
      alert('Speaker detection unavailable. Using standard transcript.');
      // Silently fail - continue with realtime transcript
    } finally {
      setIsDiarizing(false);
      audioChunksRef.current = []; // Clear audio chunks to prevent memory leak
    }
  };
  // Mark as intentionally unused - will be enabled when diarization feature is complete
  void processDiarization;

  // Cancel recording (discard)
  const cancelRecording = () => {
    stopTimer();
    setInterimTranscript('');
    cleanupAudio();

    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);

    console.log('🎙️ Recording cancelled');
  };

  // Pause/resume for streaming (mute/unmute)
  const pauseRecording = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      isPausedRef.current = true;
      setIsPaused(true);
      stopTimer();
      console.log('⏸️ Recording paused');
    }
  };

  const resumeRecording = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      isPausedRef.current = false;
      setIsPaused(false);
      startTimer();
      console.log('▶️ Recording resumed');
    }
  };

  // Handle record button click
  const startRecording = async () => {
    // Use ElevenLabs WebSocket streaming for real-time transcription with auto language detection
    await startStreamingRecording();
  };

  const stopRecording = async () => {
    await stopStreamingRecording();
  };

  // Show error screen if backend is not available
  if (backendStatus === 'error') {
    return (
      <div className="min-h-screen bg-aneya-cream flex items-center justify-center">
        <div className="max-w-md mx-4 bg-white border-2 border-red-300 rounded-[20px] p-8 text-center shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-[24px] text-aneya-navy font-medium mb-2">Unable to Connect</h2>
          <p className="text-[14px] text-gray-600 mb-6">
            Unable to connect to the Aneya backend server. This may be due to:
          </p>
          <ul className="text-[14px] text-gray-600 mb-6 list-disc list-inside text-left max-w-md mx-auto">
            <li>Backend server is starting up (usually takes 5-10 seconds)</li>
            <li>Network connectivity issues</li>
            <li>Backend service is temporarily unavailable</li>
          </ul>
          <p className="text-[14px] text-gray-600 mb-6">
            Please wait a moment and try reconnecting.
          </p>
          <button
            onClick={() => {
              setBackendStatus('checking');
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 2000);

              fetch(`${API_URL}/health`, { signal: controller.signal })
                .then(res => {
                  clearTimeout(timeoutId);
                  return res.ok ? setBackendStatus('ready') : setBackendStatus('error');
                })
                .catch((error) => {
                  clearTimeout(timeoutId);
                  if (error.name === 'AbortError') {
                    console.warn('Backend health check timed out after 2 seconds');
                  }
                  setBackendStatus('error');
                });
            }}
            className="px-6 py-3 bg-aneya-navy hover:bg-aneya-navy-hover text-white rounded-[10px] font-medium text-[14px] transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Show loading screen while checking backend
  if (backendStatus === 'checking') {
    return (
      <div className="min-h-screen bg-aneya-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-aneya-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-aneya-navy">Connecting to server...</p>
        </div>
      </div>
    );
  }

  const isPatientLocked = !!preFilledPatient;

  // NEW: Handler for speaker mapping confirmation
  const handleSpeakerMappingConfirm = (mapping: Record<string, string>) => {
    console.log('✅ User confirmed speaker mapping:', mapping);
    setSpeakerRoleMapping(mapping);
    setSpeakerRoles(mapping);
    speakerRolesRef.current = mapping;

    // Apply mapping to pending segments
    const updatedSegments = pendingSegments.map(seg => ({
      ...seg,
      speaker_role: mapping[seg.speaker_id] || seg.speaker_id,
      speaker_role_confidence: 1.0  // User confirmation = 100% confidence
    }));

    // Add to diarized segments
    setDiarizedSegments(prev => [...prev, ...updatedSegments]);
    diarizedSegmentsRef.current = [...diarizedSegmentsRef.current, ...updatedSegments];

    // Close modal and clear pending state
    setShowSpeakerMapping(false);
    setPendingSegments([]);

    console.log('✅ Speaker mapping applied, resuming chunk processing');
  };

  // NEW: Handler for skipping/canceling speaker mapping
  const handleSkipDiarization = () => {
    console.log('❌ User skipped speaker mapping');

    // Use fallback speaker IDs for pending segments
    const fallbackSegments = pendingSegments.map(seg => ({
      ...seg,
      speaker_role: seg.speaker_id,
      speaker_role_confidence: 0.0
    }));

    setDiarizedSegments(prev => [...prev, ...fallbackSegments]);
    diarizedSegmentsRef.current = [...diarizedSegmentsRef.current, ...fallbackSegments];

    setShowSpeakerMapping(false);
    setPendingSegments([]);

    console.log('⏭️ Speaker mapping skipped, using speaker IDs');
  };

  return (
    <div className="min-h-screen bg-aneya-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-aneya-navy hover:text-aneya-teal transition-colors"
              aria-label="Back to consultations"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="text-[14px] font-medium">Back</span>
            </button>
          )}
          <h1 className="text-[24px] sm:text-[32px] leading-[30px] sm:leading-[38px] text-aneya-navy">
            Consultation for {appointmentContext?.patient.name || preFilledPatient?.name || 'Patient'}
          </h1>
        </div>

        {/* Previous Appointment Sidebar */}
        {previousAppointment && (
          <div className="mb-6">
            <PreviousAppointmentSidebar
              appointment={previousAppointment}
              consultation={previousConsultation}
              loading={previousAppointmentLoading}
              onAppointmentClick={() => setShowPreviousAppointmentDetail(true)}
            />
          </div>
        )}

        {/* HERO SECTION - Language Selector + Large Record Button */}
        <div className="mb-8 sm:mb-10">
          {/* Language Selector - Centered above button (when NOT recording) */}
          {!isRecording && (
            <div className="flex justify-center mb-4">
              <div className="flex flex-col gap-1 items-center">
                <div className="flex items-center gap-2">
                  <label htmlFor="consultation-language" className="text-[14px] text-gray-700 font-medium">
                    Language:
                  </label>
                  <select
                    id="consultation-language"
                    value={consultationLanguage}
                    onChange={(e) => setConsultationLanguage(e.target.value as ConsultationLanguage)}
                    disabled={isRecording || isConnectingToTranscription}
                    className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-[14px] text-aneya-navy focus:outline-none focus:border-aneya-teal disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                  >
                    {CONSULTATION_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Warning for auto-detect */}
                {consultationLanguage === 'auto' && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Reduced accuracy for Indian languages
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Large Record Button - Hero CTA (when NOT recording) */}
          {!isRecording && (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => setShowConsentModal(true)}
                disabled={isConnectingToTranscription}
                className="hero-record-button"
              >
                {isConnectingToTranscription ? (
                  <>
                    <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{connectionStatus || 'Connecting...'}</span>
                  </>
                ) : (
                  <>
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                    <span>Record Consultation</span>
                  </>
                )}
              </button>

              {/* Translation option - centered below button */}
              {!isSarvamLanguage(consultationLanguage) && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shouldTranslateToEnglish}
                    onChange={(e) => setShouldTranslateToEnglish(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-aneya-navy focus:ring-aneya-teal"
                  />
                  <span className="text-[14px] text-aneya-navy">Translate to English</span>
                </label>
              )}
            </div>
          )}

          {/* Recording Controls - Replace button when recording */}
          {isRecording && (
            <div className="bg-white border-2 border-aneya-teal rounded-[10px] p-6 sm:p-8">
              {/* Timer and Status - Centered at top */}
              <div className="flex flex-col items-center gap-2 mb-8">
                {/* Animated mic icon */}
                <div className={`relative ${!isPaused ? 'animate-pulse' : ''}`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isPaused ? 'bg-gray-100' : 'bg-red-50'}`}>
                    <svg className={`h-8 w-8 ${isPaused ? 'text-gray-400' : 'text-red-500'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {/* Recording dot */}
                  {!isPaused && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>

                {/* Timer */}
                <div className="text-[32px] sm:text-[40px] font-mono text-aneya-navy font-bold">
                  {formatTime(recordingTime)}
                </div>

                {/* Status */}
                <div className={`text-[14px] sm:text-[16px] font-medium ${isPaused ? 'text-yellow-600' : 'text-green-600'}`}>
                  {isPaused ? 'Paused' : `Streaming${detectedLanguage ? ` (${detectedLanguage})` : ''}...`}
                </div>
              </div>

              {/* Large Control Buttons - Centered */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-8">
                {/* Cancel button */}
                <button
                  onClick={cancelRecording}
                  className="recording-control-button cancel"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Cancel</span>
                </button>

                {/* Pause/Resume button */}
                <button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="recording-control-button pause-resume"
                >
                  {isPaused ? (
                    <>
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Pause</span>
                    </>
                  )}
                </button>

                {/* Stop button */}
                <button
                  onClick={stopRecording}
                  className="recording-control-button stop"
                >
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <rect x="6" y="6" width="8" height="8" rx="1" />
                  </svg>
                  <span>Stop</span>
                </button>
              </div>

              {/* Two-column transcript display during recording */}
              <div className="hidden sm:grid sm:grid-cols-2 gap-4">
                {/* LEFT: Real-time transcript from WebSocket */}
                <div className="bg-white border-2 border-aneya-teal rounded-[10px] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-medium text-aneya-navy">
                      Real-time Transcript
                    </h3>
                    <div className="text-[11px] text-gray-500">
                      Live WebSocket
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {consultation ? (
                      <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {consultation}
                      </p>
                    ) : (
                      <p className="text-[12px] text-gray-400 italic">
                        Listening...
                      </p>
                    )}
                  </div>
                </div>

                {/* RIGHT: Diarized segments appearing progressively */}
                <div className="bg-white border-2 border-aneya-teal rounded-[10px] p-4 relative">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-medium text-aneya-navy">
                      Speaker-Labeled Transcript
                    </h3>
                    <div className="text-[11px] text-gray-500">
                      {diarizedSegments.length > 0 ? `${diarizedSegments.length} segments` : 'Processing...'}
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto space-y-3">
                    {diarizedSegments.length === 0 ? (
                      <p className="text-[12px] text-gray-400 italic">
                        Speaker-labeled segments will appear here as chunks are processed...
                      </p>
                    ) : (
                      diarizedSegments.map((seg, idx) => (
                        <div key={`${seg.start_time.toFixed(2)}-${seg.speaker_id}-${idx}`} className="border-l-2 border-gray-200 pl-3 py-1">
                          <div className="flex items-start gap-2">
                            <div className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                              seg.speaker_id === 'speaker_0'
                                ? 'bg-blue-100 text-blue-800'
                                : seg.speaker_id === 'speaker_1'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {seg.speaker_id}
                            </div>
                            <div className="flex-1">
                              <p className="text-[13px] text-gray-700 leading-relaxed">
                                {seg.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Processing overlay - shown when async transcription is running */}
                  {showProcessingOverlay && (
                    <div className="absolute inset-0 bg-aneya-cream/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-[10px]">
                      <div className="text-center px-4">
                        <svg className="h-12 w-12 animate-spin text-aneya-teal mx-auto mb-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>

                        <h3 className="text-[18px] font-semibold text-aneya-navy mb-2">
                          Processing speaker labels...
                        </h3>
                        <p className="text-[14px] text-gray-600 mb-4">
                          {consultationLanguage.startsWith('en')
                            ? 'This will take 5-10 seconds'
                            : 'This may take up to 2 minutes'}
                        </p>
                        <p className="text-[12px] text-gray-500 italic">
                          Your consultation is saved.<br />
                          You can navigate away if needed.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Patient Details - expandable section */}
        <div className="mb-6">
          <button
            onClick={() => setIsPatientDetailsExpanded(!isPatientDetailsExpanded)}
            className="w-full flex items-center justify-between p-4 bg-white border-2 border-aneya-teal rounded-[10px] transition-colors hover:border-aneya-navy cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-aneya-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-[14px] leading-[18px] text-aneya-navy font-medium">
                Patient Details
              </span>
              <span className="text-[12px] text-gray-500">
                ({patientDetails.name})
              </span>
            </div>
            <svg
              className={`h-5 w-5 text-aneya-navy transition-transform duration-200 ${isPatientDetailsExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Expandable content */}
          {isPatientDetailsExpanded && (
            <div className="mt-2 p-4 bg-white border-2 border-aneya-teal border-t-0 rounded-b-[10px] space-y-4">
              {/* Name and Sex in a row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="patient-name" className="block mb-1 text-[12px] text-gray-600">
                    Name
                  </label>
                  <input
                    id="patient-name"
                    type="text"
                    value={patientDetails.name}
                    onChange={(e) => updatePatientDetail('name', e.target.value)}
                    disabled={isPatientLocked}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label htmlFor="patient-sex" className="block mb-1 text-[12px] text-gray-600">
                    Sex
                  </label>
                  <select
                    id="patient-sex"
                    value={patientDetails.sex}
                    onChange={(e) => updatePatientDetail('sex', e.target.value)}
                    disabled={isPatientLocked}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Age and Height in a row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="patient-age" className="block mb-1 text-[12px] text-gray-600">
                    Age
                  </label>
                  <input
                    id="patient-age"
                    type="text"
                    value={patientDetails.age}
                    onChange={(e) => updatePatientDetail('age', e.target.value)}
                    disabled={isPatientLocked}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label htmlFor="patient-height" className="block mb-1 text-[12px] text-gray-600">
                    Height
                  </label>
                  <input
                    id="patient-height"
                    type="text"
                    value={patientDetails.height}
                    onChange={(e) => updatePatientDetail('height', e.target.value)}
                    disabled={isPatientLocked}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="patient-weight" className="block mb-1 text-[12px] text-gray-600">
                    Weight
                  </label>
                  <input
                    id="patient-weight"
                    type="text"
                    value={patientDetails.weight}
                    onChange={(e) => updatePatientDetail('weight', e.target.value)}
                    disabled={isPatientLocked}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div></div>
              </div>

              {/* Current Medications */}
              <div>
                <label htmlFor="patient-medications" className="block mb-1 text-[12px] text-gray-600">
                  Current Medications
                </label>
                <textarea
                  id="patient-medications"
                  value={patientDetails.currentMedications}
                  onChange={(e) => updatePatientDetail('currentMedications', e.target.value)}
                  rows={2}
                  disabled={isPatientLocked}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Current Conditions */}
              <div>
                <label htmlFor="patient-conditions" className="block mb-1 text-[12px] text-gray-600">
                  Current Conditions
                </label>
                <textarea
                  id="patient-conditions"
                  value={patientDetails.currentConditions}
                  onChange={(e) => updatePatientDetail('currentConditions', e.target.value)}
                  rows={2}
                  disabled={isPatientLocked}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}
        </div>

        {/* OB/GYN During-consultation Form Button - Prominent location after Patient Details */}
        {appointmentContext && preFilledPatient && (appointmentContext as any).doctor && requiresOBGynForms((appointmentContext as any).doctor.specialty) && (
          <div className="mb-6 bg-white border-2 border-purple-300 rounded-[10px] p-4 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-[16px] font-medium text-purple-900 mb-2">Patient Medical Report</h3>
                <p className="text-[13px] text-gray-600 mb-2">
                  {determinedConsultationType && availableForms.some(f => f.form_type === determinedConsultationType)
                    ? `Suggested form type: ${determinedConsultationType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`
                    : 'Select consultation form type:'}
                </p>

                {/* Dynamic form buttons from database */}
                <div className={`grid grid-cols-1 gap-2 ${availableForms.length === 2 ? 'sm:grid-cols-2' : availableForms.length >= 3 ? 'sm:grid-cols-3' : ''}`}>
                  {availableForms.map((form) => {
                    const displayName = form.form_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    const isSelected = selectedFormType === form.form_type;
                    const isSuggested = determinedConsultationType === form.form_type;

                    return (
                      <button
                        key={form.id}
                        onClick={() => setSelectedFormType(isSelected ? null : form.form_type)}
                        className={`px-4 py-2.5 rounded-[8px] text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                            : isSuggested
                            ? 'bg-purple-100 text-purple-700 border-2 border-purple-400'
                            : 'bg-white text-purple-600 border-2 border-purple-600 hover:bg-purple-50'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {isSuggested && !isSelected && '★ '}
                        {displayName}
                      </button>
                    );
                  })}
                </div>

                {/* Inline Embedded Forms - Display below buttons */}
                {selectedFormType && appointmentContext && preFilledPatient && appointmentContext.id && (
                  <div className="mt-6">
                    <EditableDoctorReportCard
                      appointmentId={appointmentContext.id}
                      patientId={preFilledPatient.id}
                      formType={selectedFormType}
                      onFormComplete={() => {
                        setSelectedFormType(null);
                      }}
                      editable={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Consultation summary */}
        <div>
          <div className="mb-3">
            <label htmlFor="consultation" className="text-[20px] leading-[26px] text-aneya-navy font-serif">
              aneya consultation summary:
            </label>
          </div>

          {/* Consultation Transcript - Only show when NOT recording */}
          {!isRecording && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="consultation" className="text-[14px] font-medium text-aneya-navy">
                  Consultation Transcript
                </label>
                <div className="flex items-center gap-2">
                  {consultation && pendingConsultationId && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-aneya-text-secondary">Rate transcription:</span>
                      <FeedbackButton
                        onFeedback={(sentiment) => handleFeedback('transcription', sentiment, {
                          component_identifier: 'transcription'
                        })}
                        size="sm"
                        initialSentiment={feedbackSubmitted['transcription'] as 'positive' | 'negative' | null}
                      />
                    </div>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setConsultation(SAMPLE_CONSULTATION_TEXT)}
                      className="text-xs px-3 py-1 bg-aneya-teal/10 text-aneya-teal rounded-md hover:bg-aneya-teal/20 transition-colors"
                    >
                      Load Sample Text
                    </button>
                  )}
                </div>
              </div>
              <textarea
                id="consultation"
                value={consultation}
                onChange={(e) => setConsultation(e.target.value)}
                disabled={isDiarizing}
                className="w-full h-[150px] p-4 border-2 border-aneya-teal rounded-[10px] resize-none focus:outline-none focus:border-aneya-navy transition-colors text-[16px] leading-[1.5] text-aneya-navy"
              />
            </div>
          )}
        </div>

        {/* Summarise button */}
        <div className="mt-4">
          <button
            onClick={handleSummarize}
            disabled={isRecording || isSummarizing || isDiarizing || !consultation.trim()}
            className={`
              w-full px-6 py-3 rounded-[10px] font-medium text-[14px] transition-colors flex items-center justify-center gap-2
              ${isRecording || isSummarizing || isDiarizing || !consultation.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-aneya-teal hover:bg-aneya-teal/90 text-white'
              }
            `}
          >
            {isSummarizing ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Summarizing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Summarise Consultation
              </>
            )}
          </button>
        </div>

        {/* Consultation Summary */}
        {consultationSummary && (
          <div className="mt-4">
            <label className="block mb-2 text-[14px] font-medium text-aneya-navy">
              Consultation Summary
            </label>

            {/* Audio Recording */}
            {audioUrl && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-aneya-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <h5 className="text-[14px] font-semibold text-aneya-navy">
                    Consultation Recording
                  </h5>
                </div>
                <AudioPlayer audioUrl={audioUrl} />
              </div>
            )}

            <StructuredSummaryDisplay
              summaryData={consultationSummary}
              onUpdate={(updated) => setConsultationSummary(updated)}
              onConfirmFieldSave={onUpdateConsultation ? async (updated) => {
                await onUpdateConsultation(updated);
              } : undefined}
              consultationId={pendingConsultationId}
              onFeedback={handleFeedback}
              feedbackSubmitted={feedbackSubmitted}
            />

            {/* Download PDF button - shown after consultation is summarized */}
            {appointmentContext && selectedFormType && (
              <div className="mt-4">
                <button
                  onClick={handleDownloadPdf}
                  disabled={generatingPdf}
                  className="w-full px-6 py-3 bg-aneya-teal text-white rounded-[10px] font-medium text-[15px] hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className={`w-4 h-4 ${generatingPdf ? 'animate-bounce' : ''}`} />
                  {generatingPdf ? 'Generating PDF...' : 'Download PDF Form'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Analyse button - moved below summary */}
        <div className="mt-4">
          <PrimaryButton
            onClick={handleAnalyze}
            fullWidth
            disabled={isRecording || isAnalyzing || isDiarizing || !consultation.trim()}
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {!consultationSummary ? 'Summarizing & Analyzing...' : 'Analyzing...'}
              </span>
            ) : (
              'AI Diagnosis and Treatment'
            )}
          </PrimaryButton>
        </div>

        {/* Save & Close button - fire-and-forget for quick workflow */}
        {!isRecording && consultation.trim() && onCloseConsultation && (
          <div className="mt-3">
            <button
              onClick={handleSaveAndClose}
              disabled={isSavingInBackground}
              className="w-full px-6 py-3 bg-aneya-navy text-white rounded-[10px] font-medium text-[15px] hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingInBackground ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save & Close
                </>
              )}
            </button>
          </div>
        )}

        {/* Close Consultation button - shown after summarization */}
        {consultationSummary && onCloseConsultation && (
          <div className="mt-3">
            <button
              onClick={onCloseConsultation}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-[10px] font-medium text-[15px] hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Close Consultation
            </button>
          </div>
        )}

        {/* Location Override Selector - subtle at bottom */}
        {onLocationChange && (
          <div className="mt-8 pt-4 border-t border-gray-200 flex justify-end">
            <LocationSelector
              selectedLocation={locationOverride ?? null}
              onLocationChange={onLocationChange}
            />
          </div>
        )}
      </div>

      {/* NEW: Speaker Mapping Modal */}
      {showSpeakerMapping && (
        <SpeakerMappingModal
          isOpen={showSpeakerMapping}
          speakers={detectedSpeakerList}
          segments={pendingSegments}
          onConfirm={handleSpeakerMappingConfirm}
          onCancel={handleSkipDiarization}
          suggestedRoles={speakerRoleMapping}
          confidenceScores={speakerConfidenceScores}
          reasoning={speakerReasoning}
        />
      )}

      {/* NEW: Diarization Loading Indicator */}
      {isDiarizing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-[20px] p-8 max-w-sm mx-4 text-center border-2 border-aneya-teal shadow-xl">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-aneya-teal border-t-transparent rounded-full animate-spin" />
            <h3 className="text-[20px] text-aneya-navy font-medium mb-2">
              Analyzing Speakers...
            </h3>
            <p className="text-[14px] text-gray-600">
              Detecting and separating speakers in your recording
            </p>
          </div>
        </div>
      )}

      {/* Recording Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] p-6 max-w-md mx-4 border-2 border-aneya-teal shadow-xl">
            <h3 className="text-[20px] text-aneya-navy font-medium mb-4 text-center">
              Recording Consent
            </h3>
            <p className="text-[14px] text-gray-700 mb-6 text-center leading-relaxed">
              By clicking confirm, you confirm that both the clinician and the patient have consented to be recorded for medical records.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConsentModal(false)}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-[10px] font-medium text-[14px] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConsentModal(false);
                  startRecording();
                }}
                className="flex-1 px-4 py-2.5 bg-aneya-teal text-white rounded-[10px] font-medium text-[14px] hover:bg-aneya-teal/90 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Previous Appointment Detail Modal */}
      {showPreviousAppointmentDetail && previousAppointment && (
        <AppointmentDetailModal
          isOpen={true}
          onClose={() => setShowPreviousAppointmentDetail(false)}
          appointment={previousAppointment}
          consultation={previousConsultation || null}
          viewMode="doctor"
        />
      )}

    </div>
  );
}
