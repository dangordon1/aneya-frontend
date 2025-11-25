import { useState, useEffect } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { useDeepgramTranscription } from '../hooks/useDeepgramTranscription';

interface InputScreenProps {
  onAnalyze: (consultation: string, patientId: string) => void;
}

const EXAMPLE_CONSULTATION = `Patient presents with a 3-day history of productive cough with green sputum, fever (38.5°C), and shortness of breath. They report feeling generally unwell with fatigue and reduced appetite. Past medical history includes type 2 diabetes mellitus (well controlled on metformin) and hypertension (on ramipril). No known drug allergies. Non-smoker. On examination: respiratory rate 22/min, oxygen saturation 94% on air, crackles heard in right lower zone on auscultation.`;

export function InputScreen({ onAnalyze }: InputScreenProps) {
  const [consultation, setConsultation] = useState('');
  const [patientId, setPatientId] = useState('P004');

  const {
    isRecording,
    isConnecting,
    interimText,
    finalTranscript,
    error: transcriptionError,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useDeepgramTranscription();

  // Update consultation text when final transcript changes
  useEffect(() => {
    if (finalTranscript) {
      // Extract patient ID if mentioned
      const patientIdPattern = /(?:patient\s+(?:id\s+)?|id\s*:?\s*)([A-Z]?\d{3,4})/i;
      const match = finalTranscript.match(patientIdPattern);

      if (match) {
        const extractedId = match[1].toUpperCase();
        const formattedId = /^\d+$/.test(extractedId) ? `P${extractedId.padStart(3, '0')}` : extractedId;
        setPatientId(formattedId);
      }

      // Set consultation text (append to existing if any)
      setConsultation(prev => {
        if (!prev) return finalTranscript;
        return `${prev}\n\n${finalTranscript}`;
      });

      // Clear the transcript after appending
      clearTranscript();
    }
  }, [finalTranscript, clearTranscript]);

  const handleAnalyze = () => {
    if (consultation.trim()) {
      onAnalyze(consultation, patientId);
    }
  };

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-[32px] leading-[38px] text-[#0c3555] mb-8">Clinical Decision Support</h1>

        {/* Patient ID - above consultation summary */}
        <div className="mb-6">
          <label htmlFor="patient-id" className="block mb-2 text-[14px] leading-[18px] text-[#0c3555]">
            Patient ID:
          </label>
          <input
            id="patient-id"
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="e.g., P004"
            className="w-full max-w-xs p-3 border-2 border-[#1d9e99] rounded-[10px] focus:outline-none focus:border-[#0c3555] transition-colors text-[16px] leading-[1.5] text-[#0c3555]"
          />
        </div>

        {/* Consultation summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="consultation" className="text-[14px] leading-[18px] text-[#0c3555]">
              Heidi consultation summary:
            </label>

            {/* Microphone button */}
            <button
              onClick={handleRecordClick}
              disabled={isConnecting}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-[10px] font-medium text-[14px]
                transition-all duration-200
                ${isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : isConnecting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#0c3555] hover:bg-[#f6f5ee] text-white'
                }
              `}
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : isRecording ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
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

          {/* Transcription error display */}
          {transcriptionError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-[14px]">
              {transcriptionError}
            </div>
          )}

          {/* Live transcription preview */}
          {(isRecording || interimText) && (
            <div className="mb-3 p-3 bg-[#1d9e99]/30 border border-[#1d9e99] rounded-[10px]">
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[12px] text-[#0c3555] font-medium">Live Transcription</span>
              </div>
              <p className="text-[14px] text-[#0c3555] italic">
                {interimText || 'Listening...'}
              </p>
            </div>
          )}

          <textarea
            id="consultation"
            value={consultation}
            onChange={(e) => setConsultation(e.target.value)}
            placeholder={EXAMPLE_CONSULTATION}
            className="w-full h-[300px] p-4 border-2 border-[#1d9e99] rounded-[10px] resize-none focus:outline-none focus:border-[#0c3555] transition-colors text-[16px] leading-[1.5] text-[#0c3555]"
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
