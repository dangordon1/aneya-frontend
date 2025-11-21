import { useState, useRef } from 'react';
import { PrimaryButton } from './PrimaryButton';

interface InputScreenProps {
  onAnalyze: (consultation: string, patientId: string) => void;
}

const EXAMPLE_CONSULTATION = `Patient presents with a 3-day history of productive cough with green sputum, fever (38.5°C), and shortness of breath. They report feeling generally unwell with fatigue and reduced appetite. Past medical history includes type 2 diabetes mellitus (well controlled on metformin) and hypertension (on ramipril). No known drug allergies. Non-smoker. On examination: respiratory rate 22/min, oxygen saturation 94% on air, crackles heard in right lower zone on auscultation.`;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function InputScreen({ onAnalyze }: InputScreenProps) {
  const [consultation, setConsultation] = useState('');
  const [patientId, setPatientId] = useState('P004');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleAnalyze = () => {
    if (consultation.trim()) {
      onAnalyze(consultation, patientId);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(`${API_URL}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.text) {
        let transcribedText = result.text;

        // Extract patient ID if mentioned (e.g., "Patient P004", "ID: P123", "patient ID P456")
        const patientIdPattern = /(?:patient\s+(?:id\s+)?|id\s*:?\s*)([A-Z]?\d{3,4})/i;
        const match = transcribedText.match(patientIdPattern);

        if (match) {
          const extractedId = match[1].toUpperCase();
          // If it's just a number, prefix with 'P'
          const formattedId = /^\d+$/.test(extractedId) ? `P${extractedId.padStart(3, '0')}` : extractedId;
          setPatientId(formattedId);

          // Remove the patient ID mention from the transcribed text
          transcribedText = transcribedText.replace(match[0], '').trim();
        }

        // Append transcription to existing text (or replace if you prefer)
        setConsultation(prev => prev ? `${prev}\n\n${transcribedText}` : transcribedText);
      } else {
        throw new Error('No transcription text returned');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      alert(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-[32px] leading-[38px] text-[#351431] mb-8">Clinical Decision Support</h1>

        {/* Patient ID - above consultation summary */}
        <div className="mb-6">
          <label htmlFor="patient-id" className="block mb-2 text-[14px] leading-[18px] text-[#351431]">
            Patient ID:
          </label>
          <input
            id="patient-id"
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="e.g., P004"
            className="w-full max-w-xs p-3 border-2 border-[#F0D1DA] rounded-[10px] focus:outline-none focus:border-[#351431] transition-colors text-[16px] leading-[1.5] text-[#351431]"
          />
        </div>

        {/* Consultation summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="consultation" className="text-[14px] leading-[18px] text-[#351431]">
              Heidi consultation summary:
            </label>

            {/* Microphone button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-[10px] font-medium text-[14px]
                transition-all duration-200
                ${isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : isTranscribing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#351431] hover:bg-[#4a1d43] text-white'
                }
              `}
            >
              {isTranscribing ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Transcribing...
                </>
              ) : isRecording ? (
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
                  Voice Input
                </>
              )}
            </button>
          </div>

          <textarea
            id="consultation"
            value={consultation}
            onChange={(e) => setConsultation(e.target.value)}
            placeholder={EXAMPLE_CONSULTATION}
            className="w-full h-[300px] p-4 border-2 border-[#F0D1DA] rounded-[10px] resize-none focus:outline-none focus:border-[#351431] transition-colors text-[16px] leading-[1.5] text-[#351431]"
          />
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
