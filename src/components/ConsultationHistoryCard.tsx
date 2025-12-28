import { useState } from 'react';
import { Consultation } from '../types/database';
import { ChevronDown, ChevronUp, Trash2, Brain, FileText, Activity, Pill, Stethoscope } from 'lucide-react';
import { formatDateUK, formatTime24, formatDuration } from '../utils/dateHelpers';

interface ConsultationHistoryCardProps {
  consultation: Consultation;
  onDelete?: (consultationId: string) => Promise<boolean>;
  onAnalyze?: (consultation: Consultation) => void;
}

export function ConsultationHistoryCard({ consultation, onDelete, onAnalyze }: ConsultationHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if consultation has been analyzed
  const hasAiAnalysis = consultation.diagnoses && consultation.diagnoses.length > 0;
  const canAnalyze = !hasAiAnalysis && onAnalyze;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion

    if (!onDelete) return;

    if (!confirm('Are you sure you want to delete this consultation? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(consultation.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const date = new Date(consultation.created_at);
  const formattedDate = formatDateUK(date);
  const formattedTime = formatTime24(date);
  const duration = consultation.consultation_duration_seconds
    ? formatDuration(consultation.consultation_duration_seconds)
    : 'N/A';

  // Extract primary diagnosis if available
  const primaryDiagnosis = consultation.diagnoses && consultation.diagnoses.length > 0
    ? consultation.diagnoses[0].diagnosis || consultation.diagnoses[0].name
    : 'No diagnosis recorded';

  const confidence = consultation.diagnoses && consultation.diagnoses.length > 0
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

  // Helper to safely convert any value to a displayable string
  const safeString = (value: any): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.map(safeString).join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Extract treatments from summary_data (recommendations given by doctor)
  const getTreatments = (): string[] | null => {
    const summaryData = consultation?.summary_data;
    if (!summaryData) return null;

    const treatmentsList: string[] = [];

    // Get recommendations given during consultation
    // Handle both old format (string[]) and new format (object with categorized recommendations)
    if (summaryData.recommendations_given) {
      if (Array.isArray(summaryData.recommendations_given)) {
        // Old format: string array - ensure each item is a string
        summaryData.recommendations_given.forEach((item: any) => {
          treatmentsList.push(safeString(item));
        });
      } else if (typeof summaryData.recommendations_given === 'object') {
        // New format: object with follow_up, diagnostic, therapeutic, patient_education
        const recs = summaryData.recommendations_given as Record<string, any>;
        if (recs.therapeutic && Array.isArray(recs.therapeutic)) {
          recs.therapeutic.forEach((t: any) => treatmentsList.push(`[Therapeutic] ${safeString(t)}`));
        }
        if (recs.diagnostic && Array.isArray(recs.diagnostic)) {
          recs.diagnostic.forEach((d: any) => treatmentsList.push(`[Diagnostic] ${safeString(d)}`));
        }
        if (recs.follow_up && Array.isArray(recs.follow_up)) {
          recs.follow_up.forEach((f: any) => treatmentsList.push(`[Follow-up] ${safeString(f)}`));
        }
        if (recs.patient_education && Array.isArray(recs.patient_education)) {
          recs.patient_education.forEach((p: any) => treatmentsList.push(`[Patient Education] ${safeString(p)}`));
        }
      }
    }

    // Get plan from clinical summary - could be string or object
    if (summaryData.clinical_summary?.plan) {
      const plan = summaryData.clinical_summary.plan;
      if (typeof plan === 'string') {
        treatmentsList.push(plan);
      } else if (typeof plan === 'object') {
        // Plan might have the same structure as recommendations_given
        const planObj = plan as Record<string, any>;
        if (planObj.therapeutic && Array.isArray(planObj.therapeutic)) {
          planObj.therapeutic.forEach((t: any) => treatmentsList.push(`[Plan - Therapeutic] ${safeString(t)}`));
        }
        if (planObj.diagnostic && Array.isArray(planObj.diagnostic)) {
          planObj.diagnostic.forEach((d: any) => treatmentsList.push(`[Plan - Diagnostic] ${safeString(d)}`));
        }
        if (planObj.follow_up && Array.isArray(planObj.follow_up)) {
          planObj.follow_up.forEach((f: any) => treatmentsList.push(`[Plan - Follow-up] ${safeString(f)}`));
        }
        if (planObj.patient_education && Array.isArray(planObj.patient_education)) {
          planObj.patient_education.forEach((p: any) => treatmentsList.push(`[Plan - Patient Education] ${safeString(p)}`));
        }
      }
    }

    return treatmentsList.length > 0 ? treatmentsList : null;
  };

  // Extract AI treatments (medications from AI analysis)
  const getAiTreatments = (): Array<{
    diagnosis: string;
    medications: Array<{ name: string; dose?: string; route?: string; frequency?: string; duration?: string } | string>;
    supportive_care?: string[];
  }> | null => {
    if (!consultation?.diagnoses || consultation.diagnoses.length === 0) return null;

    const aiTreatmentsList: Array<{
      diagnosis: string;
      medications: Array<{ name: string; dose?: string; route?: string; frequency?: string; duration?: string } | string>;
      supportive_care?: string[];
    }> = [];

    consultation.diagnoses.forEach((diag: any) => {
      if (diag.primary_care?.medications && diag.primary_care.medications.length > 0) {
        aiTreatmentsList.push({
          diagnosis: diag.diagnosis || diag.name,
          medications: diag.primary_care.medications,
          supportive_care: diag.primary_care.supportive_care
        });
      }
    });

    return aiTreatmentsList.length > 0 ? aiTreatmentsList : null;
  };

  const treatments = getTreatments();
  const aiTreatments = getAiTreatments();

  return (
    <div className="bg-white rounded-[16px] border-2 border-aneya-teal overflow-hidden hover:shadow-md transition-shadow">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[14px] text-gray-600">
              {formattedDate} at {formattedTime}
            </span>
            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[12px] font-medium">
              Completed
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
            {primaryDiagnosis}
          </h4>

          <div className="text-[13px] text-gray-500">Duration: {duration}</div>
        </div>

        <div className="ml-4">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-aneya-navy" />
          ) : (
            <ChevronDown className="w-5 h-5 text-aneya-navy" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-4 pt-4">
          {/* Consultation Transcript - Collapsible */}
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
                {transcript && (
                  <span className="text-[12px] text-gray-500">
                    ({transcript.split(/\s+/).length} words)
                  </span>
                )}
              </div>
              {isTranscriptExpanded ? (
                <ChevronUp className="w-4 h-4 text-aneya-navy" />
              ) : (
                <ChevronDown className="w-4 h-4 text-aneya-navy" />
              )}
            </button>
            {isTranscriptExpanded && (
              <div className="px-4 pb-4">
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

          {/* Treatments (from consultation - doctor's recommendations) */}
          <div className="bg-orange-50 rounded-[12px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-4 h-4 text-orange-600" />
              <h5 className="text-[14px] text-orange-800 font-semibold">
                Treatments
              </h5>
            </div>
            {treatments && treatments.length > 0 ? (
              <ul className="space-y-2">
                {treatments.map((treatment, idx) => (
                  <li key={idx} className="text-[13px] text-gray-700 pl-3 border-l-2 border-orange-300">
                    {treatment}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-gray-500 italic">
                No treatments recorded for this consultation.
              </p>
            )}
          </div>

          {/* AI Treatments (medications recommended by AI analysis) */}
          <div className="bg-teal-50 rounded-[12px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Pill className="w-4 h-4 text-teal-600" />
              <h5 className="text-[14px] text-teal-800 font-semibold">
                AI Treatments
              </h5>
            </div>
            {aiTreatments && aiTreatments.length > 0 ? (
              <div className="space-y-3">
                {aiTreatments.map((treatmentGroup, idx) => (
                  <div key={idx} className="space-y-2">
                    <p className="text-[12px] font-medium text-teal-700">
                      For: {treatmentGroup.diagnosis}
                    </p>
                    <ul className="space-y-1">
                      {treatmentGroup.medications.map((med, medIdx) => (
                        <li key={medIdx} className="text-[13px] text-gray-700 pl-3 border-l-2 border-teal-300">
                          <span className="font-medium">{typeof med === 'string' ? med : med.name}</span>
                          {typeof med !== 'string' && (med.dose || med.route || med.frequency || med.duration) && (
                            <span className="text-[12px] text-gray-600 ml-1">
                              {[med.dose, med.route, med.frequency, med.duration].filter(Boolean).join(' • ')}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {treatmentGroup.supportive_care && treatmentGroup.supportive_care.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[11px] font-medium text-gray-600 mb-1">Supportive Care:</p>
                        <ul className="space-y-1">
                          {treatmentGroup.supportive_care.map((care, careIdx) => (
                            <li key={careIdx} className="text-[12px] text-gray-600 pl-2">
                              • {care}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-gray-500 italic">
                {hasAiAnalysis
                  ? "No specific medication treatments recommended by AI."
                  : "Run AI analysis to get treatment recommendations."}
              </p>
            )}
          </div>

          {/* AI Diagnosis or Analyse Button */}
          {hasAiAnalysis && consultation.diagnoses && consultation.diagnoses.length > 0 ? (
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
                onClick={() => onAnalyze && onAnalyze(consultation)}
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

          {/* Action Buttons */}
          <div className="flex gap-3 mt-2">
            <button className="flex-1 px-4 py-2 bg-aneya-teal text-white rounded-[10px] text-[14px] font-medium hover:bg-opacity-90 transition-colors">
              View Full Report
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 text-white rounded-[10px] text-[14px] font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
