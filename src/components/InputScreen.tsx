import { useState, useRef, useEffect, useCallback } from 'react';
import { PrimaryButton } from './PrimaryButton';

export interface PatientDetails {
  name: string;
  sex: string;
  height: string;
  weight: string;
  currentMedications: string;
  currentConditions: string;
}

interface InputScreenProps {
  onAnalyze: (consultation: string, patientDetails: PatientDetails) => void;
}

const EXAMPLE_CONSULTATION = `Patient presents with a 3-day history of productive cough with green sputum, fever (38.5°C), and shortness of breath. They report feeling generally unwell with fatigue and reduced appetite. Past medical history includes type 2 diabetes mellitus (well controlled on metformin) and hypertension (on ramipril). No known drug allergies. Non-smoker. On examination: respiratory rate 22/min, oxygen saturation 94% on air, crackles heard in right lower zone on auscultation.`;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY || '';

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
  height: '175 cm',
  weight: '78 kg',
  currentMedications: 'Metformin 500mg BD, Ramipril 5mg OD',
  currentConditions: 'Type 2 Diabetes Mellitus, Hypertension',
};

export function InputScreen({ onAnalyze }: InputScreenProps) {
  const [consultation, setConsultation] = useState('');
  const [patientDetails, setPatientDetails] = useState<PatientDetails>(DEFAULT_PATIENT_DETAILS);
  const [isPatientDetailsExpanded, setIsPatientDetailsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ready' | 'error'>('checking');

  // Real-time transcription state
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isConnectingToDeepgram, setIsConnectingToDeepgram] = useState(false);

  // Audio recording refs
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAudioInitializedRef = useRef(false);

  // Flux model transcription state - tracks completed turns
  const completedTurnsRef = useRef<string[]>([]);
  const currentTurnTranscriptRef = useRef<string>('');

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
    if (consultation.trim()) {
      onAnalyze(consultation.trim(), patientDetails);
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

  // Connect to Deepgram WebSocket for real-time streaming
  // Using v2 API with Flux model for conversational turn detection
  // Based on official Deepgram example: test_deepgram.py
  const connectToDeepgram = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      if (!DEEPGRAM_API_KEY) {
        reject(new Error('Deepgram API key not configured'));
        return;
      }

      // Reset transcription state for new session
      completedTurnsRef.current = [];
      currentTurnTranscriptRef.current = '';

      // Deepgram v2 API with Flux model for conversational transcription
      // linear16 encoding at 16000 sample rate (matches our audio processing)
      const url = `wss://api.deepgram.com/v2/listen?model=flux-general-en&encoding=linear16&sample_rate=16000`;

      console.log('🔌 Connecting to Deepgram v2 WebSocket (Flux model)...');
      const ws = new WebSocket(url, ['token', DEEPGRAM_API_KEY]);

      ws.onopen = () => {
        console.log('✅ Deepgram v2 WebSocket connected');
        resolve(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle Flux v2 API events (matching test_deepgram.py pattern)
          const eventType = data.event;
          const turnIndex = data.turn_index;
          const eotConfidence = data.end_of_turn_confidence;

          if (eventType === 'StartOfTurn') {
            console.log(`--- StartOfTurn (Turn ${turnIndex}) ---`);
            // Reset current turn transcript when a new turn starts
            currentTurnTranscriptRef.current = '';
          }

          // Handle transcript from Flux model
          // Each transcript message contains the FULL text for the current turn
          // so we REPLACE (not append) the current turn transcript
          const transcript = data.transcript;
          if (transcript) {
            console.log(`[TRANSCRIPT] ${transcript}`);

            // Store the current turn's transcript (replaces previous)
            currentTurnTranscriptRef.current = transcript;

            // Update display: completed turns + current turn transcript
            const completedText = completedTurnsRef.current.join(' ');
            const fullText = completedText
              ? `${completedText} ${transcript}`
              : transcript;

            // Update the consultation textarea with the full text
            setConsultation(fullText);

            // Show current turn as interim for visual feedback
            setInterimTranscript(transcript);
          }

          if (eventType === 'EndOfTurn') {
            console.log(`--- EndOfTurn (Turn ${turnIndex}, Confidence: ${eotConfidence}) ---`);

            // Save the completed turn's transcript
            if (currentTurnTranscriptRef.current) {
              completedTurnsRef.current.push(currentTurnTranscriptRef.current);
              currentTurnTranscriptRef.current = '';
            }

            // Clear interim display
            setInterimTranscript('');
          }
        } catch (err) {
          console.error('Error parsing Deepgram message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Deepgram WebSocket error:', error);
        reject(error);
      };

      ws.onclose = (event) => {
        console.log(`🔌 Deepgram WebSocket closed: ${event.code} ${event.reason}`);
        websocketRef.current = null;

        // On close, ensure any remaining current turn is saved
        if (currentTurnTranscriptRef.current) {
          completedTurnsRef.current.push(currentTurnTranscriptRef.current);
          const finalText = completedTurnsRef.current.join(' ');
          setConsultation(finalText);
          currentTurnTranscriptRef.current = '';
        }
        setInterimTranscript('');
      };
    });
  }, []);

  // Start streaming audio to Deepgram
  const startStreamingRecording = async () => {
    try {
      setIsConnectingToDeepgram(true);

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

      // Connect to Deepgram
      const ws = await connectToDeepgram();
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
          websocketRef.current.send(pcmData.buffer);
        }
      };

      // Connect the audio pipeline
      source.connect(processor);
      processor.connect(audioContext.destination);

      isAudioInitializedRef.current = true;
      setIsConnectingToDeepgram(false);
      setIsRecording(true);
      setRecordingTime(0);
      startTimer();

      console.log('🎙️ Streaming recording started');

    } catch (err) {
      console.error('Error starting streaming recording:', err);
      console.error('Error details:', err);
      setIsConnectingToDeepgram(false);
      cleanupAudio();

      if (err instanceof Error) {
        if (err.message.includes('Deepgram')) {
          alert('Unable to connect to Deepgram. Please check your API key.');
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
  const stopStreamingRecording = () => {
    stopTimer();

    // Clear interim transcript
    setInterimTranscript('');

    // Clean up audio resources
    cleanupAudio();

    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);

    console.log('🎙️ Streaming recording stopped');
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
    if (DEEPGRAM_API_KEY) {
      // Use WebSocket streaming for real-time transcription
      await startStreamingRecording();
    } else {
      // Fallback: show error - no API key
      alert('Deepgram API key not configured. Please set VITE_DEEPGRAM_API_KEY in your environment.');
    }
  };

  const stopRecording = () => {
    if (DEEPGRAM_API_KEY) {
      stopStreamingRecording();
    }
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

  return (
    <div className="min-h-screen bg-aneya-cream">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-[32px] leading-[38px] text-aneya-navy mb-8">Clinical Decision Support</h1>

        {/* Patient Details - expandable section */}
        <div className="mb-6">
          <button
            onClick={() => setIsPatientDetailsExpanded(!isPatientDetailsExpanded)}
            className="w-full flex items-center justify-between p-4 bg-white border-2 border-aneya-teal rounded-[10px] hover:border-aneya-navy transition-colors"
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
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy"
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
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Height and Weight in a row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="patient-height" className="block mb-1 text-[12px] text-gray-600">
                    Height
                  </label>
                  <input
                    id="patient-height"
                    type="text"
                    value={patientDetails.height}
                    onChange={(e) => updatePatientDetail('height', e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy"
                  />
                </div>
                <div>
                  <label htmlFor="patient-weight" className="block mb-1 text-[12px] text-gray-600">
                    Weight
                  </label>
                  <input
                    id="patient-weight"
                    type="text"
                    value={patientDetails.weight}
                    onChange={(e) => updatePatientDetail('weight', e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy"
                  />
                </div>
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
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy resize-none"
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
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy resize-none"
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
                    {isPaused ? 'Paused' : 'Streaming to Deepgram (Flux)...'}
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
              <button
                onClick={startRecording}
                disabled={isConnectingToDeepgram}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-[10px] font-medium text-[14px]
                  transition-all duration-200
                  ${isConnectingToDeepgram
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-aneya-navy hover:bg-aneya-navy-hover text-white'
                  }
                `}
              >
                {isConnectingToDeepgram ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connecting...
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
            )}
          </div>

          <textarea
            id="consultation"
            value={consultation}
            onChange={(e) => setConsultation(e.target.value)}
            placeholder={EXAMPLE_CONSULTATION}
            disabled={isRecording}
            className={`w-full h-[150px] p-4 border-2 border-aneya-teal rounded-[10px] resize-none focus:outline-none focus:border-aneya-navy transition-colors text-[16px] leading-[1.5] text-aneya-navy ${
              isRecording ? 'bg-gray-50' : ''
            }`}
          />
        </div>

        {/* Bottom button */}
        <div className="mt-8">
          <PrimaryButton onClick={handleAnalyze} fullWidth disabled={isRecording}>
            Analyse Consultation
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
