import { useState, useRef, useEffect, useCallback } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { Patient, AppointmentWithPatient } from '../types/database';
import { formatTime24 } from '../utils/dateHelpers';
import { SpeakerMappingModal } from './SpeakerMappingModal';
import { StructuredSummaryDisplay } from './StructuredSummaryDisplay';

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
  onSaveConsultation?: (transcript: string, summary: string, patientDetails: PatientDetails) => Promise<void>;
  onBack?: () => void;
  preFilledPatient?: Patient;
  appointmentContext?: AppointmentWithPatient;
}

const EXAMPLE_CONSULTATION = `Patient presents with a 3-day history of productive cough with green sputum, fever (38.5°C), and shortness of breath. They report feeling generally unwell with fatigue and reduced appetite. Past medical history includes type 2 diabetes mellitus (well controlled on metformin) and hypertension (on ramipril). No known drug allergies. Non-smoker. On examination: respiratory rate 22/min, oxygen saturation 94% on air, crackles heard in right lower zone on auscultation.`;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ELEVENLABS_WS_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';

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

export function InputScreen({ onAnalyze, onSaveConsultation, onBack, preFilledPatient, appointmentContext }: InputScreenProps) {
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
  const [isConnectingToElevenLabs, setIsConnectingToElevenLabs] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [shouldTranslateToEnglish, setShouldTranslateToEnglish] = useState(true); // Default: ON

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

  const handleAnalyze = () => {
    // Extract summary text from structured data or use legacy string
    const summaryText = consultationSummary
      ? (typeof consultationSummary === 'string' ? consultationSummary : consultationSummary.summary || '')
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

  // Start streaming audio to ElevenLabs
  const startStreamingRecording = async () => {
    try {
      setIsConnectingToElevenLabs(true);

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

      // Connect to ElevenLabs
      const ws = await connectToElevenLabs();
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

          // Convert to base64 for ElevenLabs
          const audioBase64 = btoa(
            String.fromCharCode(...new Uint8Array(pcmData.buffer))
          );

          // Send in ElevenLabs format
          websocketRef.current.send(JSON.stringify({
            message_type: 'input_audio_chunk',
            audio_base_64: audioBase64,
            commit: false,
            sample_rate: 16000
          }));
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
      setIsConnectingToElevenLabs(false);
      setIsRecording(true);
      setRecordingTime(0);
      startTimer();

      console.log('🎙️ Streaming recording started with ElevenLabs');

    } catch (err) {
      console.error('Error starting streaming recording:', err);
      console.error('Error details:', err);
      setIsConnectingToElevenLabs(false);
      cleanupAudio();

      if (err instanceof Error) {
        if (err.message.includes('transcription token')) {
          alert('Unable to connect to ElevenLabs. Please check your configuration.');
        } else if (err.name === 'NotAllowedError') {
          alert('Microphone access denied. Please allow microphone access and try again.');
        } else if (err.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.');
        } else if (err.name === 'NotReadableError') {
          alert('Microphone is already in use by another application.');
        } else {
          alert(`Unable to access microphone: ${err.message}`);
        }
      } else {
        alert('Unable to access microphone. Please check permissions.');
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
      if (audioChunksRef.current.length > 0) {
        await processDiarization();
      }

      mediaRecorderRef.current = null;
    }

    // Clean up audio resources
    cleanupAudio();

    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);

    console.log('🎙️ Streaming recording stopped');
  };

  // Helper: Download audio blob for testing
  const downloadAudioBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`💾 Audio saved: ${a.download}`);
  };

  // NEW: Process speaker diarization
  const processDiarization = async () => {
    try {
      setIsDiarizing(true);
      console.log('🎤 Starting diarization...');

      // Create audio blob from chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log(`📊 Audio blob size: ${(audioBlob.size / 1024).toFixed(2)} KB`);

      // Save recording for testing
      downloadAudioBlob(audioBlob);

      // Send to backend for diarization
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(`${API_URL}/api/diarize`, {
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
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
          <h1 className="text-[32px] leading-[38px] text-aneya-navy">Clinical Decision Support</h1>
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
          <div className="mb-6 bg-white border-2 border-aneya-teal rounded-[10px] p-6">
            <div className="flex items-center justify-between">
              {/* Left: Recording indicator */}
              <div className="flex items-center gap-4">
                {/* Animated mic icon */}
                <div className={`relative ${!isPaused ? 'animate-pulse' : ''}`}>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isPaused ? 'bg-gray-100' : 'bg-red-50'}`}>
                    <svg className={`h-6 w-6 ${isPaused ? 'text-gray-400' : 'text-red-500'}`} fill="currentColor" viewBox="0 0 20 20">
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
                  <div className="text-[28px] font-mono text-aneya-navy">
                    {formatTime(recordingTime)}
                  </div>
                  <div className={`text-[12px] ${isPaused ? 'text-yellow-600' : 'text-green-600'}`}>
                    {isPaused ? 'Paused' : `Streaming to ElevenLabs${detectedLanguage ? ` (${detectedLanguage})` : ''}...`}
                  </div>
                </div>
              </div>

              {/* Right: Control buttons */}
              <div className="flex items-center gap-3">
                {/* Cancel button */}
                <button
                  onClick={cancelRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors text-[14px]"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>

                {/* Pause/Resume button */}
                <button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-aneya-teal/20 hover:bg-aneya-teal/30 text-aneya-navy transition-colors text-[14px]"
                >
                  {isPaused ? (
                    <>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Resume
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Pause
                    </>
                  )}
                </button>

                {/* Stop button */}
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-red-500 hover:bg-red-600 text-white transition-colors text-[14px]"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <rect x="6" y="6" width="8" height="8" rx="1" />
                  </svg>
                  Stop
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
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="consultation" className="text-[20px] leading-[26px] text-aneya-navy font-serif">
              aneya consultation summary:
            </label>

            {!isRecording && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shouldTranslateToEnglish}
                      onChange={(e) => setShouldTranslateToEnglish(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-aneya-navy focus:ring-aneya-teal"
                    />
                    <span className="text-[14px] text-aneya-navy">Translate to English</span>
                  </label>

                  <button
                    onClick={startRecording}
                    disabled={isConnectingToElevenLabs}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-[10px] font-medium text-[14px]
                      transition-all duration-200
                      ${isConnectingToElevenLabs
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-aneya-navy hover:bg-aneya-navy-hover text-white'
                      }
                    `}
                  >
                    {isConnectingToElevenLabs ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Transcribing...
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
                </div>
                <p className="text-[11px] text-gray-500 max-w-xs text-right leading-tight italic">
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
              placeholder={EXAMPLE_CONSULTATION}
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
            />
          </div>
        )}

        {/* Analyse button - moved below summary */}
        <div className="mt-4">
          <PrimaryButton
            onClick={handleAnalyze}
            fullWidth
            disabled={isRecording || !consultationSummary}
          >
            Analyse Consultation
          </PrimaryButton>
        </div>

        {/* Save Consultation button */}
        {onSaveConsultation && (
          <div className="mt-3">
            <button
              onClick={() => onSaveConsultation(consultation, consultationSummary, patientDetails)}
              disabled={isRecording || !consultation.trim()}
              className="w-full px-6 py-3 bg-aneya-teal text-white rounded-[10px] font-medium text-[15px] hover:bg-aneya-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Consultation
            </button>
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
