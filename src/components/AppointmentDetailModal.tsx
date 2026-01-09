import { useState } from 'react';
import { AppointmentWithPatient, Consultation } from '../types/database';
import { X, RefreshCw, Brain, Headphones, FileText, Activity, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
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
  onRerunTranscription?: (appointment: AppointmentWithPatient, consultation: Consultation, newTranscript: string) => Promise<void>;
  onFillForm?: (appointment: AppointmentWithPatient, consultation: Consultation) => Promise<void>;
  onViewConsultationForm?: (appointment: AppointmentWithPatient, consultation: Consultation | null) => void;
  viewMode?: 'doctor' | 'patient';
  isAdmin?: boolean;
  onDelete?: (appointmentId: string) => Promise<void>;
}

export function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
  consultation,
  onAnalyze,
  onResummarize,
  onRerunTranscription,
  onFillForm,
  onViewConsultationForm,
  viewMode = 'doctor',
  isAdmin,
  onDelete,
}: AppointmentDetailModalProps) {
  const [isResummarizing, setIsResummarizing] = useState(false);
  const [isFillingForm, setIsFillingForm] = useState(false);
  const [isOriginalTranscriptExpanded, setIsOriginalTranscriptExpanded] = useState(false);
  const [isEnglishTranscriptExpanded, setIsEnglishTranscriptExpanded] = useState(false);
  const [isRerunningTranscription, setIsRerunningTranscription] = useState(false);
  const [rerunProgress, setRerunProgress] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Record<string, string>>({});
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleFeedback = async (
    feedbackType: string,
    sentiment: 'positive' | 'negative',
    data: any
  ) => {
    if (!consultation?.id) {
      console.warn('Cannot submit feedback: No consultation ID available');
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const payload = {
        consultation_id: consultation.id,
        feedback_type: feedbackType,
        feedback_sentiment: sentiment,
        ...data
      };

      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to submit feedback');
      }

      const result = await response.json();
      console.log('✅ Feedback submitted:', result);

      setFeedbackSubmitted(prev => ({
        ...prev,
        [data.component_identifier || feedbackType]: sentiment
      }));

    } catch (error) {
      console.error('❌ Failed to submit feedback:', error);
      throw error;
    }
  };

  const handleRerunTranscription = async () => {
    if (!consultation?.id) return;

    // Confirmation dialog
    if (!window.confirm('Rerun transcription/diarization? This will replace the existing transcript.')) {
      return;
    }

    setIsRerunningTranscription(true);
    setRerunProgress('Downloading audio...');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://aneya-backend-xao3xivzia-el.a.run.app';

      setRerunProgress('Processing transcription (this may take 30-120s)...');

      const response = await fetch(`${apiUrl}/api/rerun-transcription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultation_id: consultation.id })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || response.statusText);
      }

      const data = await response.json();

      // Call parent callback to update state
      if (onRerunTranscription) {
        await onRerunTranscription(appointment, consultation, data.transcript);
      }

      // Show success notification
      alert(`Transcription rerun successfully in ${data.processing_time_seconds}s using ${data.provider}`);

    } catch (error: any) {
      console.error('Error rerunning transcription:', error);
      alert(`Failed to rerun transcription: ${error.message}`);
    } finally {
      setIsRerunningTranscription(false);
      setRerunProgress('');
    }
  };

  const handleDelete = async () => {
    const patientName = appointment.patient?.name || 'Unknown Patient';
    const confirmMessage = `Delete appointment with ${patientName}?\n\n` +
      `Date: ${formattedDate} at ${formattedTime}\n` +
      `Type: ${appointment.appointment_type}\n\n` +
      `Warning: This will permanently delete the appointment record.\n` +
      `Consultation data will be preserved but unlinked.\n\n` +
      `This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(appointment.id);
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Failed to delete appointment. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasAiAnalysis = consultation?.diagnoses && consultation.diagnoses.length > 0;
  const canAnalyze = !hasAiAnalysis && onAnalyze && consultation;
  const canResummarize = onResummarize && consultation;
  const canFillForm = onFillForm && consultation;
  const canRerunTranscription = onRerunTranscription && consultation?.audio_url;

  // Show consultation form button for all completed appointments with consultations
  // The form component will determine which form type to show based on detected consultation type
  const canViewConsultationForm = onViewConsultationForm &&
    consultation &&
    appointment.status === 'completed';

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
              {consultation?.detected_consultation_type && (
                <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-[12px] font-medium capitalize">
                  {consultation.detected_consultation_type.replace('_', ' ')}
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
            {viewMode === 'doctor' && (canResummarize || canFillForm || canAnalyze || canRerunTranscription || canViewConsultationForm) && (
              <div className="flex gap-2 flex-wrap">
                {canViewConsultationForm && (
                  <button
                    onClick={() => onViewConsultationForm && onViewConsultationForm(appointment, consultation)}
                    className="px-3 py-2 bg-green-600 text-white rounded-[8px] text-[13px] font-medium hover:bg-opacity-90 transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    View Consultation Form
                  </button>
                )}
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
                {canFillForm && (
                  <button
                    onClick={async () => {
                      setIsFillingForm(true);
                      try {
                        await onFillForm(appointment, consultation);
                      } finally {
                        setIsFillingForm(false);
                      }
                    }}
                    disabled={isFillingForm}
                    className="px-3 py-2 bg-orange-500 text-white rounded-[8px] text-[13px] font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FileText className={`w-4 h-4 ${isFillingForm ? 'animate-pulse' : ''}`} />
                    {isFillingForm ? 'Filling Form...' : 'Fill Form'}
                  </button>
                )}
                {canRerunTranscription && (
                  <button
                    onClick={handleRerunTranscription}
                    disabled={isRerunningTranscription}
                    className="px-3 py-2 bg-purple-600 text-white rounded-[8px] text-[13px] font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRerunningTranscription ? 'animate-spin' : ''}`} />
                    {isRerunningTranscription ? rerunProgress : 'Rerun Transcription'}
                  </button>
                )}
                {canAnalyze && (
                  <button
                    onClick={() => onAnalyze && onAnalyze(appointment, consultation)}
                    className="px-3 py-2 bg-aneya-navy text-white rounded-[8px] text-[13px] font-medium hover:bg-opacity-90 transition-colors flex items-center gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    AI Diagnosis and Treatment
                  </button>
                )}
                {isAdmin && onDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3 py-2 bg-red-600 text-white rounded-[8px] text-[13px] font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-pulse' : ''}`} />
                    {isDeleting ? 'Deleting...' : 'Delete Appointment'}
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
            {consultation.summary_data || consultation.original_transcript || transcript || summary ? (
              <div className="space-y-4">
                {/* Structured Summary (SOAP Notes) */}
                {consultation.summary_data && (
                  <StructuredSummaryDisplay
                    summaryData={consultation.summary_data}
                    onUpdate={handleUpdateSummaryData}
                    consultationId={consultation.id}
                    onFeedback={handleFeedback}
                    feedbackSubmitted={feedbackSubmitted}
                  />
                )}

                {/* Transcript Section - Show both if different, otherwise just one */}
                {consultation.original_transcript && consultation.translated_transcript && consultation.original_transcript.trim() !== consultation.translated_transcript.trim() ? (
                  <>
                    {/* Original Transcript (Diarized in Native Language) */}
                    <div className="bg-purple-50 rounded-[12px] overflow-hidden border border-purple-200">
                      <button
                        onClick={() => setIsOriginalTranscriptExpanded(!isOriginalTranscriptExpanded)}
                        className="w-full p-4 flex items-center justify-between hover:bg-purple-100 transition-colors"
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-700" />
                          <h5 className="text-[14px] text-purple-700 font-semibold">
                            Original Transcript (Diarized)
                          </h5>
                          {consultation.transcription_language && (
                            <span className="text-[11px] px-2 py-0.5 bg-purple-200 text-purple-700 rounded-full font-medium">
                              {consultation.transcription_language}
                            </span>
                          )}
                          <span className="text-[12px] text-gray-500">
                            ({consultation.original_transcript.split(/\s+/).length} words)
                          </span>
                        </div>
                        {isOriginalTranscriptExpanded ? (
                          <ChevronUp className="w-4 h-4 text-purple-700" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-purple-700" />
                        )}
                      </button>
                      {isOriginalTranscriptExpanded && (
                        <div className="px-4 pb-4">
                          <p className="text-[13px] text-gray-700 whitespace-pre-wrap">
                            {consultation.original_transcript}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* English Translation */}
                    <div className="bg-gray-50 rounded-[12px] overflow-hidden">
                      <button
                        onClick={() => setIsEnglishTranscriptExpanded(!isEnglishTranscriptExpanded)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-aneya-navy" />
                          <h5 className="text-[14px] text-aneya-navy font-semibold">
                            English Translation (Raw Transcript)
                          </h5>
                          <span className="text-[12px] text-gray-500">
                            ({consultation.translated_transcript.split(/\s+/).length} words)
                          </span>
                        </div>
                        {isEnglishTranscriptExpanded ? (
                          <ChevronUp className="w-4 h-4 text-aneya-navy" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-aneya-navy" />
                        )}
                      </button>
                      {isEnglishTranscriptExpanded && (
                        <div className="px-4 pb-4">
                          <p className="text-[13px] text-gray-700 whitespace-pre-wrap">
                            {consultation.translated_transcript}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (consultation.original_transcript || transcript) && (
                  /* Single Transcript Section (when both are the same or only one exists) */
                  <div className="bg-gray-50 rounded-[12px] overflow-hidden border border-gray-200">
                    <button
                      onClick={() => setIsOriginalTranscriptExpanded(!isOriginalTranscriptExpanded)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-aneya-navy" />
                        <h5 className="text-[14px] text-aneya-navy font-semibold">
                          Consultation Transcript (Diarized)
                        </h5>
                        {consultation.transcription_language && (
                          <span className="text-[11px] px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full font-medium">
                            {consultation.transcription_language}
                          </span>
                        )}
                        <span className="text-[12px] text-gray-500">
                          ({(consultation.original_transcript || transcript || '').split(/\s+/).length} words)
                        </span>
                      </div>
                      {isOriginalTranscriptExpanded ? (
                        <ChevronUp className="w-4 h-4 text-aneya-navy" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-aneya-navy" />
                      )}
                    </button>
                    {isOriginalTranscriptExpanded && (
                      <div className="px-4 pb-4">
                        <p className="text-[13px] text-gray-700 whitespace-pre-wrap">
                          {consultation.original_transcript || transcript}
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
