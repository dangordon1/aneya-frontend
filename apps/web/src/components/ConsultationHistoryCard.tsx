import { useState } from 'react';
import { Consultation } from '../types/database';
import { ChevronDown, ChevronUp, Trash2, Brain } from 'lucide-react';
import { formatDateUK, formatTime24, formatDuration } from '../utils/dateHelpers';

interface ConsultationHistoryCardProps {
  consultation: Consultation;
  onDelete?: (consultationId: string) => Promise<boolean>;
  onAnalyze?: (consultation: Consultation) => void;
}

export function ConsultationHistoryCard({ consultation, onDelete, onAnalyze }: ConsultationHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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
        <div className="px-4 pb-4 border-t border-gray-100 space-y-3 pt-3">
          <div>
            <h5 className="text-[13px] text-gray-600 font-semibold mb-1">Consultation Notes</h5>
            <p className="text-[14px] text-aneya-navy whitespace-pre-wrap">
              {consultation.consultation_text}
            </p>
          </div>

          {consultation.diagnoses && consultation.diagnoses.length > 1 && (
            <div>
              <h5 className="text-[13px] text-gray-600 font-semibold mb-1">
                Alternative Diagnoses ({consultation.diagnoses.length - 1})
              </h5>
              <ul className="list-disc pl-5 space-y-1">
                {consultation.diagnoses.slice(1).map((diag: any, idx: number) => (
                  <li key={idx} className="text-[13px] text-gray-700">
                    {diag.diagnosis || diag.name}
                    {diag.confidence && (
                      <span className="text-[12px] text-gray-500 ml-2">
                        ({diag.confidence} confidence)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {consultation.guidelines_found && consultation.guidelines_found.length > 0 && (
            <div>
              <h5 className="text-[13px] text-gray-600 font-semibold mb-1">
                Guidelines Referenced ({consultation.guidelines_found.length})
              </h5>
              <p className="text-[12px] text-gray-500">
                NICE, BNF, and CKS guidelines consulted
              </p>
            </div>
          )}

          {/* AI Analysis Not Performed Section */}
          {canAnalyze && (
            <div className="bg-amber-50 rounded-[12px] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-amber-600" />
                <h5 className="text-[14px] text-amber-800 font-semibold">
                  AI Analysis Not Yet Performed
                </h5>
              </div>
              <p className="text-[13px] text-amber-700 mb-3">
                This consultation has been saved but hasn't been analyzed by AI yet.
              </p>
              <button
                onClick={() => onAnalyze(consultation)}
                className="w-full px-4 py-2 bg-aneya-teal text-white rounded-[10px] text-[14px] font-medium hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
              >
                <Brain className="w-4 h-4" />
                Analyse Consultation
              </button>
            </div>
          )}

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
