import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePatientSymptoms } from '../../hooks/usePatientSymptoms';
import { PatientSymptom, SymptomStatus, ConsultationLanguage, CONSULTATION_LANGUAGES } from '../../types/database';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
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

const STATUS_OPTIONS: { value: SymptomStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'bg-red-100 text-red-800' },
  { value: 'improving', label: 'Improving', color: 'bg-green-100 text-green-800' },
  { value: 'worsening', label: 'Worsening', color: 'bg-orange-100 text-orange-800' },
  { value: 'resolved', label: 'Resolved', color: 'bg-gray-100 text-gray-800' },
];

interface SymptomsTabProps {
  onBack: () => void;
}

export function SymptomsTab({ onBack: _onBack }: SymptomsTabProps) {
  void _onBack; // suppress unused warning - kept for API consistency
  const { patientProfile } = useAuth();
  const { symptoms, loading, error, createSymptom, updateSymptom, deleteSymptom, refetch } = usePatientSymptoms();

  // Input state
  const [symptomText, setSymptomText] = useState('');
  const [originalTranscript, setOriginalTranscript] = useState('');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [consultationLanguage, setConsultationLanguage] = useState<ConsultationLanguage>(
    patientProfile?.consultation_language || 'en-IN'
  );

  // Audio refs
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedTurnsRef = useRef<string[]>([]);
  const originalCompletedTurnsRef = useRef<string[]>([]);

  // UI state
  const [showAddForm, setShowAddForm] = useState(false);

  // Timer functions
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
  };

  // Connect to Sarvam transcription service
  const connectToSarvam = async (language: ConsultationLanguage): Promise<WebSocket> => {
    // Get transcription token from backend
    const tokenResponse = await fetch(`${API_URL}/api/transcription-token`);
    if (!tokenResponse.ok) {
      throw new Error('Failed to get Sarvam API key');
    }
    const { sarvam_api_key } = await tokenResponse.json();
    if (!sarvam_api_key) {
      throw new Error('Sarvam API key not available');
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(SARVAM_WS_URL);

      ws.onopen = () => {
        console.log('Connected to Sarvam');
        // Send configuration
        ws.send(JSON.stringify({
          config: {
            sample_rate: 16000,
            language_code: language,
            api_subscription_key: sarvam_api_key,
            enable_itn: true,
            enable_automatic_punctuation: true
          }
        }));
        resolve(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'transcript') {
            const transcript = data.transcript || '';
            const translatedText = data.translated_text || transcript;
            const isFinal = data.is_final === true;

            if (data.language_code) {
              setDetectedLanguage(data.language_code);
            }

            if (isFinal && transcript.trim()) {
              // Add to completed turns
              completedTurnsRef.current.push(translatedText);
              originalCompletedTurnsRef.current.push(transcript);

              // Update the main transcript
              const fullTranscript = completedTurnsRef.current.join(' ');
              const fullOriginal = originalCompletedTurnsRef.current.join(' ');

              setSymptomText(fullTranscript);
              setOriginalTranscript(fullOriginal);
              setInterimTranscript('');
            } else if (!isFinal) {
              setInterimTranscript(translatedText);
            }
          }
        } catch (err) {
          console.error('Error parsing Sarvam message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('Sarvam WebSocket error:', error);
        reject(error);
      };

      ws.onclose = () => {
        console.log('Sarvam connection closed');
      };
    });
  };

  // Start recording
  const startRecording = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('Requesting microphone...');

      // Reset transcription state
      completedTurnsRef.current = [];
      originalCompletedTurnsRef.current = [];
      setInterimTranscript('');

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      audioStreamRef.current = stream;

      setConnectionStatus('Connecting to server...');

      // Connect to Sarvam
      const ws = await connectToSarvam(consultationLanguage);
      websocketRef.current = ws;

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // Create audio source from stream
      const source = audioContext.createMediaStreamSource(stream);

      // Create script processor to capture audio data
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

          // Send in Sarvam format
          websocketRef.current.send(JSON.stringify({
            audio: {
              data: audioBase64,
              sample_rate: 16000,
              encoding: 'audio/wav',
              input_audio_codec: 'pcm_s16le'
            }
          }));
        }
      };

      // Connect the audio pipeline
      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsConnecting(false);
      setConnectionStatus('');
      setIsRecording(true);
      setRecordingTime(0);
      startTimer();

    } catch (err) {
      console.error('Error starting recording:', err);
      setIsConnecting(false);
      setConnectionStatus('');
      cleanupAudio();

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          alert('Microphone access denied. Please allow microphone access and try again.');
        } else if (err.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.');
        } else {
          alert(`Unable to start recording: ${err.message}`);
        }
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    stopTimer();
    setInterimTranscript('');
    cleanupAudio();
    setIsRecording(false);
    setRecordingTime(0);
  };

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show toast notification
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Save symptom - sends to backend for LLM structuring (non-blocking)
  const handleSave = () => {
    if (!symptomText.trim()) return;

    const textToSave = symptomText.trim();
    const transcriptToSave = originalTranscript || null;
    const languageToSave = detectedLanguage || consultationLanguage;
    const patientId = patientProfile?.id;

    if (!patientId) {
      showToast('Error: Patient profile not available');
      return;
    }

    // Immediately close form and show confirmation
    setSymptomText('');
    setOriginalTranscript('');
    setDetectedLanguage('');
    setShowAddForm(false);
    completedTurnsRef.current = [];
    originalCompletedTurnsRef.current = [];

    showToast('Your symptoms are being processed and will appear in your history shortly.');

    // Fire and forget - process in background
    (async () => {
      try {
        // Call backend to structure the symptom text using LLM
        const response = await fetch(`${API_URL}/api/structure-symptom`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symptom_text: textToSave,
            original_transcript: transcriptToSave,
            transcription_language: languageToSave,
            patient_id: patientId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to structure symptom');
        }

        // Backend handles saving to database, just refresh the list
        setTimeout(() => refetch(), 3000);
      } catch (err) {
        console.error('Error saving symptom:', err);
        // Fallback: save directly without structuring if backend fails
        await createSymptom({
          symptom_text: textToSave,
          original_transcript: transcriptToSave,
          transcription_language: languageToSave,
          severity: null,
          duration_description: null,
          body_location: null,
          notes: null,
          status: 'active',
        });
        refetch();
      }
    })();
  };

  // Update symptom status
  const handleStatusChange = async (symptom: PatientSymptom, newStatus: SymptomStatus) => {
    await updateSymptom(symptom.id, { status: newStatus });
  };

  // Delete symptom
  const handleDelete = async (symptomId: string) => {
    if (confirm('Are you sure you want to delete this symptom entry?')) {
      await deleteSymptom(symptomId);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Add Symptom Button */}
      {!showAddForm && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-aneya-teal text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-aneya-teal/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Record Symptoms
          </button>
        </div>
      )}

      {/* Add Symptom Form */}
      {showAddForm && (
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-aneya-navy text-lg">Record Your Symptoms</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setSymptomText('');
                setOriginalTranscript('');
                if (isRecording) stopRecording();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Guidance Section */}
            <div className="bg-aneya-cream/50 rounded-lg p-4">
              <h4 className="font-medium text-aneya-navy mb-2">
                When describing your symptoms, please include:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>&#8226; What you're experiencing (pain, discomfort, changes)</li>
                <li>&#8226; How severe it is (mild, moderate, severe, or rate 1-10)</li>
                <li>&#8226; When it started and how long it's lasted</li>
                <li>&#8226; What time of day it's worst</li>
                <li>&#8226; Where in your body you feel it</li>
                <li>&#8226; What makes it better or worse</li>
                <li>&#8226; Any possible triggers (food, activity, stress)</li>
                <li>&#8226; Any other symptoms at the same time</li>
              </ul>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recording Language
              </label>
              <select
                value={consultationLanguage}
                onChange={(e) => setConsultationLanguage(e.target.value as ConsultationLanguage)}
                disabled={isRecording}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
              >
                {CONSULTATION_LANGUAGES.filter(l => l.provider === 'sarvam').map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Recording Controls */}
            <div className="flex flex-col items-center gap-4">
              {isConnecting ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aneya-teal mx-auto mb-2"></div>
                  <p className="text-gray-600">{connectionStatus}</p>
                </div>
              ) : isRecording ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-2xl font-mono text-aneya-navy">{formatTime(recordingTime)}</span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="bg-red-500 text-white px-8 py-3 rounded-full font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    Stop Recording
                  </button>
                </>
              ) : (
                <button
                  onClick={startRecording}
                  className="bg-aneya-teal text-white px-8 py-3 rounded-full font-medium hover:bg-aneya-teal/90 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                  Start Recording
                </button>
              )}

              {detectedLanguage && (
                <p className="text-sm text-gray-500">
                  Detected: {CONSULTATION_LANGUAGES.find(l => l.code === detectedLanguage)?.name || detectedLanguage}
                </p>
              )}
            </div>

            {/* Symptom Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your symptoms
              </label>
              <textarea
                value={symptomText + (interimTranscript ? ' ' + interimTranscript : '')}
                onChange={(e) => setSymptomText(e.target.value)}
                placeholder="Describe your symptoms in detail. For example: I've had a sharp headache on the right side of my head for 2 days. It's about a 6/10 in severity, worse in the mornings. It started after a stressful week at work..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent resize-none"
              />
              {interimTranscript && (
                <p className="text-xs text-gray-400 mt-1 italic">
                  Transcribing: {interimTranscript}
                </p>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setSymptomText('');
                  setOriginalTranscript('');
                  if (isRecording) stopRecording();
                }}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!symptomText.trim()}
                className="bg-aneya-teal text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-aneya-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Symptoms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Symptoms History */}
      <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-aneya-navy text-lg">Symptom History</h3>
          <button
            onClick={refetch}
            className="text-sm text-aneya-teal hover:text-aneya-teal/80 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal mx-auto"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <p>{error}</p>
            <button
              onClick={refetch}
              className="mt-2 text-aneya-teal hover:text-aneya-teal/80 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        ) : symptoms.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg mb-2">No symptoms recorded</p>
            <p className="text-sm text-gray-400 mb-4">Record your symptoms to share with your doctor</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-aneya-teal hover:text-aneya-teal/80 text-sm font-medium"
            >
              Record your first symptom
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {symptoms.map(symptom => (
              <div key={symptom.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_OPTIONS.find(s => s.value === symptom.status)?.color || 'bg-gray-100 text-gray-800'
                      }`}>
                        {STATUS_OPTIONS.find(s => s.value === symptom.status)?.label || symptom.status}
                      </span>
                      {symptom.severity && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          symptom.severity <= 3 ? 'bg-green-100 text-green-800' :
                          symptom.severity <= 6 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Severity: {symptom.severity}/10
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {formatDate(symptom.created_at)}
                      </span>
                    </div>
                    <p className="text-aneya-navy">{symptom.symptom_text}</p>
                    {(symptom.duration_description || symptom.body_location) && (
                      <div className="mt-2 text-sm text-gray-500 flex gap-4">
                        {symptom.duration_description && (
                          <span>Duration: {symptom.duration_description}</span>
                        )}
                        {symptom.body_location && (
                          <span>Location: {symptom.body_location}</span>
                        )}
                      </div>
                    )}
                    {symptom.notes && (
                      <p className="mt-2 text-sm text-gray-500 italic">{symptom.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Status dropdown */}
                    <select
                      value={symptom.status}
                      onChange={(e) => handleStatusChange(symptom, e.target.value as SymptomStatus)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:ring-1 focus:ring-aneya-teal"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(symptom.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-aneya-navy text-white px-6 py-4 rounded-lg shadow-lg max-w-md animate-fade-in z-50">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-aneya-teal flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">{toastMessage}</p>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white/70 hover:text-white flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
