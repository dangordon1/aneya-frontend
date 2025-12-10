import { useState } from 'react';
import { AppointmentWithPatient, Consultation } from '../types/database';
import { ChevronDown, ChevronUp, FileText, Brain, Activity } from 'lucide-react';
import { formatDateUK, formatTime24 } from '../utils/dateHelpers';

interface PastAppointmentCardProps {
  appointment: AppointmentWithPatient;
  consultation: Consultation | null;
  onAnalyze?: (appointment: AppointmentWithPatient, consultation: Consultation) => void;
}

export function PastAppointmentCard({ appointment, consultation, onAnalyze }: PastAppointmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if consultation has been analyzed (has AI diagnosis)
  const hasAiAnalysis = consultation?.diagnoses && consultation.diagnoses.length > 0;
  const canAnalyze = consultation && !hasAiAnalysis && onAnalyze;

  const date = new Date(appointment.scheduled_time);
  const formattedDate = formatDateUK(date);
  const formattedTime = formatTime24(date);

  // Extract primary diagnosis if available
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

  // Split consultation_text into transcript and summary if formatted as separate sections
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
            {appointment.patient.name}
          </h4>

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
        <div className="px-4 pb-4 border-t border-gray-100 space-y-4 pt-4">
          {/* Consultation Transcript */}
          <div className="bg-gray-50 rounded-[12px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-aneya-navy" />
              <h5 className="text-[14px] text-aneya-navy font-semibold">
                Consultation Transcript
              </h5>
            </div>
            {transcript ? (
              <p className="text-[13px] text-gray-700 whitespace-pre-wrap">
                {transcript}
              </p>
            ) : (
              <p className="text-[13px] text-gray-500 italic">
                This will be populated when you stop recording the transcription.
              </p>
            )}
          </div>

          {/* Consultation Summary */}
          <div className="bg-blue-50 rounded-[12px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-aneya-navy" />
              <h5 className="text-[14px] text-aneya-navy font-semibold">
                Consultation Summary
              </h5>
            </div>
            {summary ? (
              <p className="text-[13px] text-gray-700 whitespace-pre-wrap">
                {summary}
              </p>
            ) : (
              <p className="text-[13px] text-gray-500 italic">
                This will be populated when you summarize the consultation.
              </p>
            )}
          </div>

          {/* AI Diagnosis or Analyse Button */}
          {hasAiAnalysis ? (
            <div className="bg-green-50 rounded-[12px] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-aneya-navy" />
                <h5 className="text-[14px] text-aneya-navy font-semibold">
                  AI-Assisted Diagnosis
                </h5>
              </div>

              {/* Primary Diagnosis */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <h6 className="text-[13px] font-semibold text-gray-800">
                    Primary Diagnosis
                  </h6>
                  {consultation.diagnoses[0].confidence && (
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${getConfidenceBadgeColor(
                        consultation.diagnoses[0].confidence
                      )}`}
                    >
                      {consultation.diagnoses[0].confidence} confidence
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-gray-700">
                  {consultation.diagnoses[0].diagnosis || consultation.diagnoses[0].name}
                </p>
                {consultation.diagnoses[0].reasoning && (
                  <p className="text-[12px] text-gray-600 mt-1">
                    <span className="font-medium">Reasoning:</span> {consultation.diagnoses[0].reasoning}
                  </p>
                )}
              </div>

              {/* Alternative Diagnoses */}
              {consultation.diagnoses.length > 1 && (
                <div>
                  <h6 className="text-[13px] font-semibold text-gray-800 mb-2">
                    Alternative Diagnoses ({consultation.diagnoses.length - 1})
                  </h6>
                  <ul className="space-y-2">
                    {consultation.diagnoses.slice(1).map((diag: any, idx: number) => (
                      <li key={idx} className="text-[12px] text-gray-700 pl-3 border-l-2 border-gray-300">
                        <div className="flex items-start justify-between">
                          <span className="font-medium">{diag.diagnosis || diag.name}</span>
                          {diag.confidence && (
                            <span className="text-[11px] text-gray-500 ml-2">
                              ({diag.confidence})
                            </span>
                          )}
                        </div>
                        {diag.reasoning && (
                          <p className="text-[11px] text-gray-600 mt-0.5">
                            {diag.reasoning}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : canAnalyze ? (
            <div className="bg-amber-50 rounded-[12px] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-amber-600" />
                <h5 className="text-[14px] text-amber-800 font-semibold">
                  AI Analysis Not Yet Performed
                </h5>
              </div>
              <p className="text-[13px] text-amber-700 mb-3">
                This consultation has been saved but hasn't been analyzed by AI yet.
                Click the button below to run AI-assisted diagnosis.
              </p>
              <button
                onClick={() => onAnalyze(appointment, consultation)}
                className="w-full px-4 py-2 bg-aneya-teal text-white rounded-[10px] text-[14px] font-medium hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
              >
                <Brain className="w-4 h-4" />
                Analyse Consultation
              </button>
            </div>
          ) : null}

          {/* Guidelines Referenced */}
          {consultation.guidelines_found && consultation.guidelines_found.length > 0 && (
            <div className="bg-purple-50 rounded-[12px] p-3">
              <h5 className="text-[13px] text-aneya-navy font-semibold mb-1">
                Clinical Guidelines Referenced ({consultation.guidelines_found.length})
              </h5>
              <p className="text-[12px] text-gray-600">
                NICE, BNF, and CKS guidelines consulted during analysis
              </p>
            </div>
          )}

          {/* Patient Snapshot at time of consultation */}
          {consultation.patient_snapshot && (
            <div className="text-[12px] text-gray-500 border-t border-gray-200 pt-3">
              <p className="font-medium text-gray-700 mb-1">Patient Details (at time of consultation)</p>
              <div className="grid grid-cols-2 gap-2">
                {consultation.patient_snapshot.age && (
                  <span>Age: {consultation.patient_snapshot.age}</span>
                )}
                {consultation.patient_snapshot.allergies && (
                  <span>Allergies: {consultation.patient_snapshot.allergies}</span>
                )}
                {consultation.patient_snapshot.current_medications && (
                  <span className="col-span-2">
                    Medications: {consultation.patient_snapshot.current_medications}
                  </span>
                )}
              </div>
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
