import { useState } from 'react';
import { AppointmentWithPatient, Consultation } from '../types/database';
import { ChevronDown, ChevronUp, RefreshCw, Brain, Headphones, FileText, Activity } from 'lucide-react';
import { formatDateUK, formatTime24 } from '../utils/dateHelpers';
import { StructuredSummaryDisplay } from './StructuredSummaryDisplay';
import { AudioPlayer } from './AudioPlayer';

interface PastAppointmentCardProps {
  appointment: AppointmentWithPatient;
  consultation: Consultation | null;
  onAnalyze?: (appointment: AppointmentWithPatient, consultation: Consultation) => void;
  onResummarize?: (appointment: AppointmentWithPatient, consultation: Consultation) => Promise<void>;
  viewMode?: 'doctor' | 'patient';
  showOBGynForm?: boolean;
  onOBGynFormClick?: () => void;
  obgynFormStatus?: 'draft' | 'partial' | 'completed' | null;
}

export function PastAppointmentCard({
  appointment,
  consultation,
  onAnalyze,
  onResummarize,
  viewMode = 'doctor',
  showOBGynForm = false,
  onOBGynFormClick,
  obgynFormStatus
}: PastAppointmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResummarizing, setIsResummarizing] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  const date = new Date(appointment.scheduled_time);
  const formattedDate = formatDateUK(date);
  const formattedTime = formatTime24(date);

  // Extract transcript and summary from consultation_text
  const getTranscriptAndSummary = () => {
    if (!consultation?.consultation_text) return { transcript: null, summary: null };

    const text = consultation.consultation_text;

    // Check if text contains both "Consultation Transcript:" and "Consultation Summary:"
    const transcriptMatch = text.match(/Consultation Transcript:\s*([\s\S]*?)(?=Consultation Summary:|$)/i);
    const summaryMatch = text.match(/Consultation Summary:\s*([\s\S]*?)$/i);

    if (transcriptMatch && summaryMatch) {
      return {
        transcript: transcriptMatch[1].trim(),
        summary: summaryMatch[1].trim()
      };
    }

    // If no clear separation, treat entire text as transcript
    return {
      transcript: text,
      summary: null
    };
  };

  const { transcript, summary } = getTranscriptAndSummary();

  // Extract primary diagnosis if available for the card header
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

  // Handler to update summary data (for editing in SOAP format)
  const handleUpdateSummaryData = (updatedData: any) => {
    // For read-only view of past appointments, we don't need to do anything
    // If editing is needed in the future, this would update the consultation
    console.log('Summary data updated:', updatedData);
  };

  // Check if consultation has been analyzed
  const hasAiAnalysis = consultation?.diagnoses && consultation.diagnoses.length > 0;
  const canAnalyze = !hasAiAnalysis && onAnalyze && consultation;
  const canResummarize = onResummarize && consultation;

  return (
    <div className="bg-white rounded-[16px] border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3 mb-2">
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

          <h4 className="text-[16px] text-aneya-navy font-semibold mb-1">
            {viewMode === 'doctor'
              ? appointment.patient.name
              : appointment.doctor?.name || 'Doctor'}
          </h4>

          {viewMode === 'patient' && appointment.doctor?.specialty && (
            <p className="text-[13px] text-gray-600 mb-1">
              {appointment.doctor.specialty}
            </p>
          )}

          {primaryDiagnosis && (
            <p className="text-[14px] text-gray-700 mb-1">
              <span className="font-medium">Diagnosis:</span> {primaryDiagnosis}
            </p>
          )}

          {appointment.reason && (
            <p className="text-[13px] text-gray-500">Reason: {appointment.reason}</p>
          )}
        </div>

        <div className="ml-4">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-aneya-navy" />
          ) : (
            <ChevronDown className="w-5 h-5 text-aneya-navy" />
          )}
        </div>
      </button>

      {isExpanded && consultation && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          {/* Action buttons */}
          {viewMode === 'doctor' && (canResummarize || canAnalyze) && (
            <div className="flex gap-2 mb-4">
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
                  onClick={() => onAnalyze(appointment, consultation)}
                  className="px-3 py-2 bg-aneya-navy text-white rounded-[8px] text-[13px] font-medium hover:bg-opacity-90 transition-colors flex items-center gap-2"
                >
                  <Brain className="w-4 h-4" />
                  Run AI Analysis
                </button>
              )}
            </div>
          )}

          {/* OB/GYN Pre-consultation Form */}
          {showOBGynForm && viewMode === 'patient' && onOBGynFormClick && (
            <div className="mb-4">
              {obgynFormStatus && (
                <div className="mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    obgynFormStatus === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : obgynFormStatus === 'partial'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {obgynFormStatus === 'completed' ? 'Pre-consultation Form Completed' :
                     obgynFormStatus === 'partial' ? 'Form In Progress' : 'Form Started'}
                  </span>
                </div>
              )}
              <button
                onClick={onOBGynFormClick}
                className="w-full py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors border border-purple-200"
              >
                {obgynFormStatus ? 'Continue Pre-consultation Form' : 'Fill Pre-consultation Form'}
              </button>
            </div>
          )}

          {/* Audio Recording */}
          {consultation.audio_url && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Headphones className="w-4 h-4 text-aneya-navy" />
                <h5 className="text-[14px] font-semibold text-aneya-navy">
                  Consultation Recording
                </h5>
              </div>
              <AudioPlayer audioUrl={consultation.audio_url} />
            </div>
          )}

          {/* Content Display - use StructuredSummaryDisplay if available, otherwise show transcript/summary */}
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
      )}

      {isExpanded && !consultation && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          <div className="text-center py-6 text-gray-500">
            <p className="text-[14px]">No consultation record found for this appointment</p>
          </div>
        </div>
      )}
    </div>
  );
}
