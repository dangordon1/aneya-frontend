import { useState, useRef, useEffect } from 'react';
import { PrimaryButton } from './PrimaryButton';

interface InputScreenProps {
  onAnalyze: (consultation: string, patientId: string) => void;
}

const EXAMPLE_CONSULTATION = `Patient presents with a 3-day history of productive cough with green sputum, fever (38.5°C), and shortness of breath. They report feeling generally unwell with fatigue and reduced appetite. Past medical history includes type 2 diabetes mellitus (well controlled on metformin) and hypertension (on ramipril). No known drug allergies. Non-smoker. On examination: respiratory rate 22/min, oxygen saturation 94% on air, crackles heard in right lower zone on auscultation.`;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Format seconds as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function InputScreen({ onAnalyze }: InputScreenProps) {
  const [consultation, setConsultation] = useState('');
  const [patientId, setPatientId] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ready' | 'error'>('checking');

  // Audio recording refs (matching working audio_recorder pattern)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const isAudioInitializedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleAnalyze = () => {
    if (consultation.trim()) {
      onAnalyze(consultation.trim(), patientId);
    }
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

  // Initialize audio stream (called on first recording)
  const initializeAudio = async (): Promise<boolean> => {
    try {
      console.log('🎤 Requesting microphone access...');
      audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      isAudioInitializedRef.current = true;
      console.log('🎤 Microphone ready');
      return true;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Unable to access microphone. Please check permissions.');
      return false;
    }
  };

  // Start the actual recording (called after stream is ready)
  const beginRecording = () => {
    if (!audioStreamRef.current) return;

    // Choose best available MIME type
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : '';

    const options = mimeType ? { mimeType } : {};
    console.log('🎤 Using MIME type:', mimeType || 'default');

    const mediaRecorder = new MediaRecorder(audioStreamRef.current, options);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
        console.log(`📼 Captured chunk: ${(event.data.size / 1024).toFixed(2)} KB`);
      }
    };

    mediaRecorder.onstop = async () => {
      stopTimer();

      const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
      console.log(`🎤 Recording stopped. Total size: ${(totalSize / 1024).toFixed(2)} KB`);

      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);

      if (audioChunksRef.current.length > 0) {
        await transcribeAudio();
      }
    };

    mediaRecorder.start();
    console.log('🎙️ Recording started');

    setIsRecording(true);
    setRecordingTime(0);
    startTimer();
  };

  // Handle record button click
  const startRecording = async () => {
    if (!isAudioInitializedRef.current) {
      // First click: initialize audio, then immediately start recording
      const success = await initializeAudio();
      if (success) {
        beginRecording();
      }
    } else {
      // Already initialized: start recording immediately
      beginRecording();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (isRecording || isPaused)) {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    stopTimer();

    // Stop and discard recording
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }

    // Reset state
    audioChunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
  };

  const transcribeAudio = async () => {
    setIsTranscribing(true);
    try {
      // Create a single blob from all audio chunks using the recorder's MIME type
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      console.log(`🎤 Sending audio for transcription: ${(audioBlob.size / 1024).toFixed(2)} KB (${mimeType})`);

      const formData = new FormData();
      formData.append('audio', audioBlob, `recording.${extension}`);

      const response = await fetch(`${API_URL}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Transcription response:', result);
        if (result.success && result.text) {
          const transcribedText = result.text.trim();
          console.log('Transcribed text:', transcribedText);

          // Append to existing consultation text
          setConsultation(prev => prev ? `${prev}\n\n${transcribedText}` : transcribedText);
        } else {
          console.log('No text in response or success=false');
        }
      } else {
        console.error('Transcription failed:', response.status, response.statusText);
        alert('Transcription failed. Please try again.');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Transcription failed. Please check your connection.');
    } finally {
      setIsTranscribing(false);
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

        {/* Patient ID - above consultation summary */}
        <div className="mb-6">
          <label htmlFor="patient-id" className="block mb-2 text-[14px] leading-[18px] text-aneya-navy">
            Patient ID:
          </label>
          <input
            id="patient-id"
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="e.g., P004"
            className="w-full max-w-xs p-3 bg-white border-2 border-aneya-teal rounded-[10px] focus:outline-none focus:border-aneya-navy transition-colors text-[16px] leading-[1.5] text-aneya-navy"
          />
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
                  <div className={`text-[12px] ${isPaused ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {isPaused ? 'Paused' : 'Recording...'}
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
          </div>
        )}

        {/* Consultation summary */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="consultation" className="text-[14px] leading-[18px] text-aneya-navy">
              aneya consultation summary:
            </label>

            {!isRecording && (
              <button
                onClick={startRecording}
                disabled={isTranscribing}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-[10px] font-medium text-[14px]
                  transition-all duration-200
                  ${isTranscribing
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-aneya-navy hover:bg-aneya-navy-hover text-white'
                  }
                `}
              >
                {isTranscribing ? (
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
            )}
          </div>

          <textarea
            id="consultation"
            value={consultation}
            onChange={(e) => setConsultation(e.target.value)}
            placeholder={EXAMPLE_CONSULTATION}
            disabled={isRecording || isTranscribing}
            className={`w-full h-[150px] p-4 border-2 border-aneya-teal rounded-[10px] resize-none focus:outline-none focus:border-aneya-navy transition-colors text-[16px] leading-[1.5] text-aneya-navy ${
              (isRecording || isTranscribing) ? 'bg-gray-50' : ''
            }`}
          />

          {/* Transcribing indicator */}
          {isTranscribing && (
            <div className="mt-2 flex items-center gap-2 text-[12px] text-aneya-navy">
              <div className="w-2 h-2 rounded-full animate-pulse bg-blue-500" />
              <span>Transcribing audio...</span>
            </div>
          )}
        </div>

        {/* Bottom button */}
        <div className="mt-8">
          <PrimaryButton onClick={handleAnalyze} fullWidth disabled={isRecording || isTranscribing}>
            Analyse Consultation
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
