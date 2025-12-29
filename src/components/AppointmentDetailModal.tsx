import { useState } from 'react';
import { AppointmentWithPatient, Consultation } from '../types/database';
import { X, RefreshCw, Brain, Headphones, FileText, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDateUK, formatTime24 } from '../utils/dateHelpers';
import { StructuredSummaryDisplay } from './StructuredSummaryDisplay';
import { AudioPlayer } from './AudioPlayer';

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentWithPatient;
  consultation: Consultation | null;
  onAnalyze?: (appointment: AppointmentWithPatient, consultation: Consultation) => void;
  onResummarize?: (appointment: AppointmentWithPatient, consultation: Consultation | null) => Promise<void>;
  viewMode?: 'doctor' | 'patient';
}

export function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
  consultation,
  onAnalyze,
  onResummarize,
  viewMode = 'doctor',
}: AppointmentDetailModalProps) {
  const [isResummarizing, setIsResummarizing] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  if (!isOpen) return null;

  const date = new Date(appointment.scheduled_time);
  const formattedDate = formatDateUK(date);
  const formattedTime = formatTime24(date);

  // Extract primary diagnosis
  const primaryDiagnosis = consultation?.diagnoses && consultation.diagnoses.length > 0
    ? consultation.diagnoses[0].diagnosis || consultation.diagnoses[0].name
    : null;

  const confidence = consultation?.diagnoses && consultation.diagnoses.length > 0
    ? consultation.diagnoses[0].confidence
    : null;

  const getConfidenceBadgeColor = (conf?: string) => {
    switch (conf?.toLowerCase()) {
      case 'high':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // Extract transcript and summary from consultation_text
  const getTranscriptAndSummary = () => {
    if (!consultation?.consultation_text) return { transcript: null, summary: null };

    const text = consultation.consultation_text;

    const transcriptMatch = text.match(/Consultation Transcript:\s*([\s\S]*?)(?=Consultation Summary:|$)/i);
    const summaryMatch = text.match(/Consultation Summary:\s*([\s\S]*?)$/i);

    if (transcriptMatch && summaryMatch) {
      return {
        transcript: transcriptMatch[1].trim(),
        summary: summaryMatch[1].trim()
      };
    }

    return {
      transcript: text,
      summary: null
    };
  };

  const { transcript, summary } = getTranscriptAndSummary();

  const handleUpdateSummaryData = (updatedData: any) => {
    console.log('Summary data updated:', updatedData);
  };

  const hasAiAnalysis = consultation?.diagnoses && consultation.diagnoses.length > 0;
  const canAnalyze = !hasAiAnalysis && onAnalyze && consultation;
  const canResummarize = onResummarize && consultation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-4 sm:py-8">
      <div className="bg-white rounded-[20px] p-4 sm:p-6 max-w-4xl w-full mx-4 my-auto max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 sm:mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-[24px] sm:text-[28px] text-aneya-navy font-semibold">
                {viewMode === 'doctor'
                  ? appointment.patient.name
                  : appointment.doctor?.name || 'Doctor'}
              </h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[14px] text-gray-600">
                {formattedDate} at {formattedTime}
              </span>
              <span className="px-2 py-1 rounded-full bg-aneya-teal/10 text-aneya-teal text-[12px] font-medium">
                {appointment.status === 'completed' ? 'Completed' : appointment.status}
              </span>
              {confidence && (
                <span
                  className={`px-2 py-1 rounded-full border text-[12px] font-medium ${getConfidenceBadgeColor(
                    confidence
                  )}`}
                >
                  {confidence} confidence
                </span>
              )}
            </div>
            {viewMode === 'patient' && appointment.doctor?.specialty && (
              <p className="text-[13px] text-gray-600 mt-1">
                {appointment.doctor.specialty}
              </p>
            )}
            {primaryDiagnosis && (
              <p className="text-[14px] text-gray-700 mt-2">
                <span className="font-medium">Diagnosis:</span> {primaryDiagnosis}
              </p>
            )}
            {appointment.reason && (
              <p className="text-[13px] text-gray-500 mt-1">
                Reason: {appointment.reason}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 ml-4"
            type="button"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        {consultation ? (
          <div className="space-y-4">
            {/* Action buttons */}
            {viewMode === 'doctor' && (canResummarize || canAnalyze) && (
              <div className="flex gap-2">
                {canResummarize && (
                  <button
                    onClick={async () => {
                      setIsResummarizing(true);
                      try {
                        await onResummarize(appointment, consultation);
                      } finally {
                        setIsResummarizing(false);
                      }
                    }}
                    disabled={isResummarizing}
                    className="px-3 py-2 bg-aneya-teal text-white rounded-[8px] text-[13px] font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isResummarizing ? 'animate-spin' : ''}`} />
                    {isResummarizing ? 'Re-summarizing...' : 'Re-summarize'}
                  </button>
                )}
                {canAnalyze && (
                  <button
                    onClick={() => onAnalyze && onAnalyze(appointment, consultation)}
                    className="px-3 py-2 bg-aneya-navy text-white rounded-[8px] text-[13px] font-medium hover:bg-opacity-90 transition-colors flex items-center gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    Run AI Analysis
                  </button>
                )}
              </div>
            )}

            {/* Audio Recording */}
            {consultation.audio_url && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Headphones className="w-4 h-4 text-aneya-navy" />
                  <h5 className="text-[14px] font-semibold text-aneya-navy">
                    Consultation Recording
                  </h5>
                </div>
                <AudioPlayer audioUrl={consultation.audio_url} />
              </div>
            )}

            {/* Content Display */}
            {consultation.summary_data ? (
              <StructuredSummaryDisplay
                summaryData={consultation.summary_data}
                onUpdate={handleUpdateSummaryData}
              />
            ) : (transcript || summary) ? (
              <div className="space-y-4">
                {/* Consultation Transcript - Collapsible */}
                {transcript && (
                  <div className="bg-gray-50 rounded-[12px] overflow-hidden">
                    <button
                      onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-aneya-navy" />
                        <h5 className="text-[14px] text-aneya-navy font-semibold">
                          Consultation Transcript
                        </h5>
                        <span className="text-[12px] text-gray-500">
                          ({transcript.split(/\s+/).length} words)
                        </span>
                      </div>
                      {isTranscriptExpanded ? (
                        <ChevronUp className="w-4 h-4 text-aneya-navy" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-aneya-navy" />
                      )}
                    </button>
                    {isTranscriptExpanded && (
                      <div className="px-4 pb-4">
                        <p className="text-[13px] text-gray-700 whitespace-pre-wrap">
                          {transcript}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Consultation Summary */}
                {summary && (
                  <div className="bg-blue-50 rounded-[12px] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-aneya-navy" />
                      <h5 className="text-[14px] text-aneya-navy font-semibold">
                        Consultation Summary
                      </h5>
                    </div>
                    <p className="text-[13px] text-gray-700 whitespace-pre-wrap">
                      {summary}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p className="text-[14px]">No consultation data available</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p className="text-[14px]">No consultation record found for this appointment</p>
          </div>
        )}
      </div>
    </div>
  );
}
