import { useState, useRef, useEffect, useCallback } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { Patient, AppointmentWithPatient, ConsultationLanguage, CONSULTATION_LANGUAGES, isSarvamLanguage } from '../types/database';
import { formatTime24 } from '../utils/dateHelpers';
import { SpeakerMappingModal } from './SpeakerMappingModal';
import { StructuredSummaryDisplay } from './StructuredSummaryDisplay';
import { LocationSelector } from './LocationSelector';

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
  onSaveConsultation?: (transcript: string, summaryResponse: any, patientDetails: PatientDetails) => Promise<void>;
  onUpdateConsultation?: (summaryResponse: any) => Promise<void>;
  onCloseConsultation?: () => void;
  onBack?: () => void;
  preFilledPatient?: Patient;
  appointmentContext?: AppointmentWithPatient;
  locationOverride?: string | null;
  onLocationChange?: (location: string | null) => void;
}

const EXAMPLE_CONSULTATION = `Patient presents with a 3-day history of productive cough with green sputum, fever (38.5°C), and shortness of breath. They report feeling generally unwell with fatigue and reduced appetite. Past medical history includes type 2 diabetes mellitus (well controlled on metformin) and hypertension (on ramipril). No known drug allergies. Non-smoker. On examination: respiratory rate 22/min, oxygen saturation 94% on air, crackles heard in right lower zone on auscultation.`;

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

export function InputScreen({ onAnalyze, onSaveConsultation, onUpdateConsultation, onCloseConsultation, onBack, preFilledPatient, appointmentContext, locationOverride, onLocationChange }: InputScreenProps) {
  const [consultation, setConsultation] = useState(''); // Consultation Transcript (raw or diarized)
  const [consultationSummary, setConsultationSummary] = useState<any>(null); // Consultation Summary (structured data from summarize API)
  const [originalTranscript, setOriginalTranscript] = useState(''); // Original language transcript

  // Initialize patient details based on preFilledPatient or default
  const initialPatientDetails: PatientDetails = preFilledPatient ? {
    name: preFilledPatient.name,
    sex: preFilledPatient.sex,
    age: preFilledPatient.date_of_birth
      ? `${new Date().getFullYear() - new Date(preFilledPatient.date_of_birth).getFullYear()} years`
      : '',
    height: preFilledPatient.height_cm ? `${preFilledPatient.height_cm} cm` : '',
    weight: preFilledPatient.weight_kg ? `${preFilledPatient.weight_kg} kg` : '',
    currentMedications: preFilledPatient.current_medications || '',
    currentConditions: preFilledPatient.current_conditions || '',
  } : DEFAULT_PATIENT_DETAILS;

  const [patientDetails, setPatientDetails] = useState<PatientDetails>(initialPatientDetails);
  const [isPatientDetailsExpanded, setIsPatientDetailsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Real-time transcription state
  const [interimTranscript, setInterimTranscript] = useState('');
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
  const [diarizationData, setDiarizationData] = useState<any>(null);
  const [showSpeakerMapping, setShowSpeakerMapping] = useState(false);

  // Audio recording refs
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAudioInitializedRef = useRef(false);

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
      try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
          setBackendStatus('ready');
        } else {
          setBackendStatus('error');
        }
      } catch {
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
    };
  }, []);

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
        const response = await fetch(`${API_URL}/api/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: consultation })
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

      // Save consultation before analyzing
      if (onSaveConsultation && summaryData) {
        try {
          await onSaveConsultation(consultation, summaryData, patientDetails);
          console.log('✅ Consultation saved before analysis');
        } catch (saveError) {
          console.error('Failed to save consultation:', saveError);
          // Continue with analysis even if save fails
        }
      }

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

  const handleSummarize = async () => {
    if (!consultation.trim()) {
      alert('Please enter or record a consultation before summarizing.');
      return;
    }

    setIsSummarizing(true);
    try {
      const response = await fetch(`${API_URL}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: consultation })
      });

      if (!response.ok) {
        throw new Error('Summarization failed');
      }

      const data = await response.json();
      if (data.success) {
        // Store the entire structured response
        setConsultationSummary(data);
        console.log('✅ Consultation summarized');

        // Auto-save the consultation after summarizing
        if (onSaveConsultation) {
          try {
            await onSaveConsultation(consultation, data, patientDetails);
            console.log('✅ Consultation saved after summarization');
          } catch (saveError) {
            console.error('Failed to save consultation:', saveError);
            // Don't alert - summarization succeeded, just log the save error
          }
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
      try {
        audioChunksRef.current = []; // Reset chunks
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.start(1000); // Collect chunks every 1 second
        mediaRecorderRef.current = mediaRecorder;
        console.log('🎬 MediaRecorder started for diarization');
      } catch (err) {
        console.error('MediaRecorder failed (diarization won\'t work):', err);
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

  // Stop streaming recording
  const stopStreamingRecording = async () => {
    stopTimer();

    // Clear interim transcript
    setInterimTranscript('');

    // NEW: Stop MediaRecorder and process diarization
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();

      // Wait for final data to be collected
      await new Promise<void>((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => resolve();
        } else {
          resolve();
        }
      });

      // Process diarization if we have audio chunks
      // TODO: Re-enable after STTT streaming is working
      // if (audioChunksRef.current.length > 0) {
      //   await processDiarization();
      // }

      mediaRecorderRef.current = null;
    }

    // Clean up audio resources
    cleanupAudio();

    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);

    console.log('🎙️ Streaming recording stopped');
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
      return data;
    } catch (error) {
      console.error('❌ Audio upload error:', error);
      // Non-blocking - don't interrupt the main flow
      return null;
    }
  };

  // NEW: Process speaker diarization (unused for now, will be enabled later)
  // @ts-ignore - Function will be used when diarization is enabled
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
      // Silently fail - continue with realtime transcript
    } finally {
      setIsDiarizing(false);
    }
  };

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

  const stopRecording = () => {
    stopStreamingRecording();
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
            Cannot connect to the backend server. Please ensure the server is running and try again.
          </p>
          <button
            onClick={() => {
              setBackendStatus('checking');
              fetch(`${API_URL}/health`)
                .then(res => res.ok ? setBackendStatus('ready') : setBackendStatus('error'))
                .catch(() => setBackendStatus('error'));
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
    if (!diarizationData) return;

    // Build labeled transcript
    const labeledTranscript = diarizationData.segments
      .map((seg: any) => `${mapping[seg.speaker_id]}: ${seg.text}`)
      .join('\n\n');

    setConsultation(labeledTranscript);
    setShowSpeakerMapping(false);
    setDiarizationData(null);
    console.log('✅ Speaker-labeled transcript applied');
  };

  // NEW: Handler for skipping diarization
  const handleSkipDiarization = () => {
    setShowSpeakerMapping(false);
    setDiarizationData(null);
    console.log('⏭️ Diarization skipped - using realtime transcript');
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
          <h1 className="text-[24px] sm:text-[32px] leading-[30px] sm:leading-[38px] text-aneya-navy">Clinical Decision Support</h1>
        </div>

        {/* Appointment Context Banner */}
        {appointmentContext && (
          <div className="mb-6 bg-aneya-teal/10 border-2 border-aneya-teal rounded-[10px] p-4">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-aneya-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <div className="text-[14px] text-aneya-navy font-medium">
                  Consultation for: {appointmentContext.patient.name}
                </div>
                <div className="text-[12px] text-gray-600">
                  Appointment at {formatTime24(new Date(appointmentContext.scheduled_time))} - {appointmentContext.duration_minutes} min
                  {appointmentContext.reason && ` • ${appointmentContext.reason}`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patient Details - expandable section */}
        <div className="mb-6">
          <button
            onClick={() => !isPatientLocked && setIsPatientDetailsExpanded(!isPatientDetailsExpanded)}
            disabled={isPatientLocked}
            className={`w-full flex items-center justify-between p-4 bg-white border-2 border-aneya-teal rounded-[10px] transition-colors ${isPatientLocked ? 'cursor-default' : 'hover:border-aneya-navy cursor-pointer'
              }`}
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
              {isPatientLocked && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] rounded">
                  Locked
                </span>
              )}
            </div>
            {!isPatientLocked && (
              <svg
                className={`h-5 w-5 text-aneya-navy transition-transform duration-200 ${isPatientDetailsExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
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

        {/* Recording UI - embedded, slides down consultation */}
        {isRecording && (
          <div className="mb-6 bg-white border-2 border-aneya-teal rounded-[10px] p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left: Recording indicator */}
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Animated mic icon */}
                <div className={`relative ${!isPaused ? 'animate-pulse' : ''}`}>
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${isPaused ? 'bg-gray-100' : 'bg-red-50'}`}>
                    <svg className={`h-5 w-5 sm:h-6 sm:w-6 ${isPaused ? 'text-gray-400' : 'text-red-500'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {/* Recording dot */}
                  {!isPaused && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>

                {/* Timer and status */}
                <div>
                  <div className="text-[24px] sm:text-[28px] font-mono text-aneya-navy">
                    {formatTime(recordingTime)}
                  </div>
                  <div className={`text-[11px] sm:text-[12px] ${isPaused ? 'text-yellow-600' : 'text-green-600'}`}>
                    {isPaused ? 'Paused' : `Streaming${detectedLanguage ? ` (${detectedLanguage})` : ''}...`}
                  </div>
                </div>
              </div>

              {/* Right: Control buttons - stack on mobile */}
              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                {/* Cancel button */}
                <button
                  onClick={cancelRecording}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-[10px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors text-[13px] sm:text-[14px] flex-1 sm:flex-none"
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden xs:inline sm:inline">Cancel</span>
                </button>

                {/* Pause/Resume button */}
                <button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-[10px] bg-aneya-teal/20 hover:bg-aneya-teal/30 text-aneya-navy transition-colors text-[13px] sm:text-[14px] flex-1 sm:flex-none"
                >
                  {isPaused ? (
                    <>
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      <span className="hidden xs:inline sm:inline">Resume</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="hidden xs:inline sm:inline">Pause</span>
                    </>
                  )}
                </button>

                {/* Stop button */}
                <button
                  onClick={stopRecording}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-[10px] bg-red-500 hover:bg-red-600 text-white transition-colors text-[13px] sm:text-[14px] flex-1 sm:flex-none"
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 20 20">
                    <rect x="6" y="6" width="8" height="8" rx="1" />
                  </svg>
                  <span className="hidden xs:inline sm:inline">Stop</span>
                </button>
              </div>
            </div>

            {/* Real-time transcript preview */}
            {interimTranscript && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-[12px] text-gray-500 mb-1">Live transcription:</div>
                <div className="text-[14px] text-gray-700 italic">{interimTranscript}</div>
              </div>
            )}
          </div>
        )}

        {/* Consultation summary */}
        <div>
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <label htmlFor="consultation" className="text-[20px] leading-[26px] text-aneya-navy font-serif">
              aneya consultation summary:
            </label>

            {!isRecording && (
              <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                {/* Record Consultation Button */}
                <button
                  onClick={startRecording}
                  disabled={isConnectingToTranscription}
                  className={`
                    flex items-center justify-center gap-2 px-4 py-3 sm:py-2 rounded-[10px] font-medium text-[14px]
                    transition-all duration-200 w-full sm:w-auto
                    ${isConnectingToTranscription
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-aneya-navy hover:bg-aneya-navy-hover text-white'
                    }
                  `}
                >
                  {isConnectingToTranscription ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {connectionStatus || 'Connecting...'}
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                      Record Consultation
                    </>
                  )}
                </button>

                {/* Language and Translation Options - Below Record Button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  {/* Consultation Language Dropdown */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <label htmlFor="consultation-language" className="text-[12px] text-gray-600 whitespace-nowrap">
                        Language:
                      </label>
                      <select
                        id="consultation-language"
                        value={consultationLanguage}
                        onChange={(e) => setConsultationLanguage(e.target.value as ConsultationLanguage)}
                        disabled={isRecording || isConnectingToTranscription}
                        className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-aneya-navy focus:outline-none focus:border-aneya-teal disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {CONSULTATION_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Warning for auto-detect mode */}
                    {consultationLanguage === 'auto' && (
                      <p className="text-[11px] text-amber-600 flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Reduced accuracy for Indian languages
                      </p>
                    )}
                  </div>

                  {/* Translate to English checkbox - only show for non-Sarvam languages */}
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

                <p className="text-[11px] text-gray-500 max-w-xs text-left sm:text-right leading-tight italic">
                  By clicking this, you confirm that both the clinician and the patient have consented to be recorded for medical records.
                </p>
              </div>
            )}
          </div>

          {/* Consultation Transcript */}
          <div>
            <label htmlFor="consultation" className="block mb-2 text-[14px] font-medium text-aneya-navy">
              Consultation Transcript
            </label>
            <textarea
              id="consultation"
              value={consultation}
              onChange={(e) => setConsultation(e.target.value)}
              disabled={isRecording}
              className={`w-full h-[150px] p-4 border-2 border-aneya-teal rounded-[10px] resize-none focus:outline-none focus:border-aneya-navy transition-colors text-[16px] leading-[1.5] text-aneya-navy ${isRecording ? 'bg-gray-50' : ''
                }`}
            />
          </div>
        </div>

        {/* Summarise button */}
        <div className="mt-4">
          <button
            onClick={handleSummarize}
            disabled={isRecording || isSummarizing || !consultation.trim()}
            className={`
              w-full px-6 py-3 rounded-[10px] font-medium text-[14px] transition-colors flex items-center justify-center gap-2
              ${isRecording || isSummarizing || !consultation.trim()
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
            <StructuredSummaryDisplay
              summaryData={consultationSummary}
              onUpdate={(updated) => setConsultationSummary(updated)}
              onConfirmFieldSave={onUpdateConsultation ? async (updated) => {
                await onUpdateConsultation(updated);
              } : undefined}
            />
          </div>
        )}

        {/* Analyse button - moved below summary */}
        <div className="mt-4">
          <PrimaryButton
            onClick={handleAnalyze}
            fullWidth
            disabled={isRecording || isAnalyzing || !consultation.trim()}
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
              'Analyse Consultation'
            )}
          </PrimaryButton>
        </div>

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
      {diarizationData && (
        <SpeakerMappingModal
          isOpen={showSpeakerMapping}
          speakers={diarizationData.detected_speakers || []}
          segments={diarizationData.segments || []}
          onConfirm={handleSpeakerMappingConfirm}
          onCancel={handleSkipDiarization}
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
    </div>
  );
}
