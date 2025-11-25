import { useState, useRef } from 'react';
import { PrimaryButton } from './PrimaryButton';

interface InputScreenProps {
  onAnalyze: (consultation: string, patientId: string) => void;
}

const EXAMPLE_CONSULTATION = `Patient presents with a 3-day history of productive cough with green sputum, fever (38.5°C), and shortness of breath. They report feeling generally unwell with fatigue and reduced appetite. Past medical history includes type 2 diabetes mellitus (well controlled on metformin) and hypertension (on ramipril). No known drug allergies. Non-smoker. On examination: respiratory rate 22/min, oxygen saturation 94% on air, crackles heard in right lower zone on auscultation.`;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function InputScreen({ onAnalyze }: InputScreenProps) {
  const [consultation, setConsultation] = useState('');
  const [patientId, setPatientId] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [streamingText, setStreamingText] = useState(''); // For showing partial results
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const accumulativeAudioRef = useRef<Blob[]>([]); // Store all chunks for accumulative transcription
  const streamingTextRef = useRef<string>(''); // Ref to track latest streaming text for onstop handler

  const handleAnalyze = () => {
    // Use streamingText if it exists (from voice input), otherwise use consultation
    const textToAnalyze = streamingText.trim() || consultation.trim();
    if (textToAnalyze) {
      onAnalyze(textToAnalyze, patientId);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      accumulativeAudioRef.current = []; // Clear accumulative buffer

      // Clear previous states
      setStreamingText('');
      streamingTextRef.current = ''; // Clear ref

      // Use timeslice to get chunks every 2 seconds for accumulative transcription
      const CHUNK_DURATION_MS = 2000;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          accumulativeAudioRef.current.push(event.data); // Add to accumulative buffer

          // If recording is still active, transcribe ALL audio so far (accumulative)
          if (isRecording || mediaRecorderRef.current?.state === 'recording') {
            await transcribeAccumulative();
          }
        }
      };

      mediaRecorder.onstop = () => {
        // When recording stops, finalize the text using ref (avoids closure issue)
        const finalText = streamingTextRef.current.trim();

        // Clear streaming text first to avoid duplication in textarea
        setStreamingText('');
        streamingTextRef.current = '';

        // Then append to consultation if there's text
        if (finalText) {
          setConsultation(prev => prev ? `${prev}\n\n${finalText}` : finalText);
        }

        // Stop all tracks to release microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Finally, update recording state
        setIsRecording(false);
      };

      // Start recording with timeslice for accumulative processing
      mediaRecorder.start(CHUNK_DURATION_MS);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // Don't set isRecording here - let onstop handler do it to avoid race condition
      // setIsRecording(false);
    }
  };

  const transcribeAccumulative = async () => {
    try {
      // Create a blob from ALL accumulated audio chunks so far
      const accumulativeBlob = new Blob(accumulativeAudioRef.current, { type: 'audio/webm' });

      const formData = new FormData();
      formData.append('audio', accumulativeBlob, 'accumulative.webm');

      const response = await fetch(`${API_URL}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.text) {
          const fullTranscription = result.text.trim();

          // Update the entire streaming text (this is the complete transcription so far)
          setStreamingText(fullTranscription);
          streamingTextRef.current = fullTranscription; // Keep ref in sync
        }
      }
    } catch (error) {
      console.error('Accumulative transcription error:', error);
      // Don't alert for errors, just log them
    }
  };

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

        {/* Consultation summary */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="consultation" className="text-[14px] leading-[18px] text-aneya-navy">
              aneya consultation summary:
            </label>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-[10px] font-medium text-[14px]
                transition-all duration-200
                ${isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : 'bg-aneya-navy hover:bg-aneya-navy-hover text-white'
                }
              `}
            >
              {isRecording ? (
                <>
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <rect x="6" y="6" width="8" height="8" rx="1" />
                  </svg>
                  Stop Recording
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

          <textarea
            id="consultation"
            value={streamingText ? `${consultation}${consultation ? '\n\n' : ''}${streamingText}` : consultation}
            onChange={(e) => {
              // Only allow edits when not recording
              if (!isRecording) {
                setConsultation(e.target.value);
              }
            }}
            placeholder={EXAMPLE_CONSULTATION}
            className="w-full h-[300px] p-4 border-2 border-aneya-teal rounded-[10px] resize-none focus:outline-none focus:border-aneya-navy transition-colors text-[16px] leading-[1.5] text-aneya-navy"
            disabled={isRecording}
          />

          {/* Streaming indicator */}
          {isRecording && (
            <div className="mt-2 flex items-center gap-2 text-[12px] text-aneya-navy">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>
                {streamingText
                  ? 'Live transcription updating...'
                  : 'Recording... transcription will begin shortly'}
              </span>
            </div>
          )}
        </div>

        {/* Bottom button */}
        <div className="mt-12">
          <PrimaryButton onClick={handleAnalyze} fullWidth>
            Analyse Consultation
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
