import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Pill } from 'lucide-react';

interface BnfTreatment {
  medication: string;
  url?: string;
  dosage?: string;
  indications?: string;
  contraindications?: string;
  cautions?: string;
  side_effects?: string;
  interactions?: string;
  is_first_line?: boolean;
  treatment_context?: string;
}

interface DiagnosisCardProps {
  diagnosisNumber: number;
  diagnosis: string;
  confidence?: string;
  isPrimary?: boolean;
  source?: string;
  url?: string;
  summary?: string;
  treatments?: BnfTreatment[];
  className?: string;
}

export function DiagnosisCard({
  diagnosisNumber,
  diagnosis,
  confidence,
  isPrimary = false,
  source,
  url,
  summary: _summary,
  treatments = [],
  className = ''
}: DiagnosisCardProps) {
  const [showTreatments, setShowTreatments] = useState(false);
  const [expandedTreatment, setExpandedTreatment] = useState<number | null>(null);

  const getConfidenceColor = (conf?: string) => {
    switch (conf?.toLowerCase()) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-red-600';
      default:
        return 'text-aneya-navy';
    }
  };

  const firstLineTreatments = treatments.filter(t => t.is_first_line);
  const alternateTreatments = treatments.filter(t => !t.is_first_line);

  // Extract a concise dosage summary from the full dosage text
  const extractDosageSummary = (dosage?: string): string => {
    if (!dosage) return 'See BNF for dosing';

    // Look for adult dosing patterns
    const adultMatch = dosage.match(/Adult\s+([^.]+(?:\.|$))/i);
    if (adultMatch) {
      const dose = adultMatch[1].trim();
      // Limit length and clean up
      return dose.length > 150 ? dose.substring(0, 150) + '...' : dose;
    }

    // Fallback: return first 150 chars
    return dosage.length > 150 ? dosage.substring(0, 150) + '...' : dosage;
  };

  return (
    <div className={`bg-white rounded-[16px] p-6 aneya-shadow-card border ${isPrimary ? 'border-aneya-navy border-2' : 'border-aneya-soft-pink'} ${className}`}>
      {isPrimary && (
        <span className="inline-block px-3 py-1 bg-aneya-soft-pink text-aneya-navy rounded-full text-[13px] leading-[18px] mb-3">
          Primary Diagnosis
        </span>
      )}

      <h3 className="text-[22px] leading-[28px] text-aneya-navy mb-3">
        {isPrimary ? diagnosis : `Diagnosis ${diagnosisNumber}: ${diagnosis}`}
      </h3>

      {confidence && (
        <p className="text-[15px] leading-[22px] text-aneya-text-secondary mb-2">
          <strong>Confidence:</strong>{' '}
          <span className={`font-semibold ${getConfidenceColor(confidence)}`}>
            {confidence.toUpperCase()}
          </span>
        </p>
      )}

      {source && (
        <p className="text-[15px] leading-[22px] text-aneya-text-secondary mb-2">
          <strong>Source:</strong>{' '}
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-aneya-navy hover:underline">
              {source}
            </a>
          ) : (
            source
          )}
        </p>
      )}

      {/* Treatments Toggle Button */}
      {treatments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-aneya-soft-pink">
          <button
            onClick={() => setShowTreatments(!showTreatments)}
            className="flex items-center gap-2 px-4 py-2 bg-aneya-navy text-white rounded-lg hover:bg-opacity-90 transition-colors text-[15px] font-medium"
          >
            <Pill className="w-4 h-4" />
            <span>{showTreatments ? 'Hide' : 'Show'} Treatments ({treatments.length})</span>
            {showTreatments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTreatments && (
            <div className="mt-4 space-y-4">
              {/* First-Line Treatments */}
              {firstLineTreatments.length > 0 && (
                <div>
                  <h4 className="text-[15px] font-semibold text-aneya-navy mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    First-Line Treatments
                  </h4>
                  <div className="space-y-3">
                    {firstLineTreatments.map((treatment, idx) => (
                      <TreatmentCard
                        key={idx}
                        treatment={treatment}
                        isExpanded={expandedTreatment === idx}
                        onToggle={() => setExpandedTreatment(expandedTreatment === idx ? null : idx)}
                        extractDosageSummary={extractDosageSummary}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Treatments */}
              {alternateTreatments.length > 0 && (
                <div>
                  <h4 className="text-[15px] font-semibold text-aneya-navy mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    Alternative Treatments
                  </h4>
                  <div className="space-y-3">
                    {alternateTreatments.map((treatment, idx) => (
                      <TreatmentCard
                        key={idx + firstLineTreatments.length}
                        treatment={treatment}
                        isExpanded={expandedTreatment === idx + firstLineTreatments.length}
                        onToggle={() => setExpandedTreatment(
                          expandedTreatment === idx + firstLineTreatments.length ? null : idx + firstLineTreatments.length
                        )}
                        extractDosageSummary={extractDosageSummary}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TreatmentCardProps {
  treatment: BnfTreatment;
  isExpanded: boolean;
  onToggle: () => void;
  extractDosageSummary: (dosage?: string) => string;
}

function TreatmentCard({ treatment, isExpanded, onToggle, extractDosageSummary }: TreatmentCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      {/* Treatment Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {treatment.url ? (
              <a
                href={treatment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[17px] font-semibold text-aneya-navy hover:underline"
              >
                {treatment.medication}
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <span className="text-[17px] font-semibold text-aneya-navy">
                {treatment.medication}
              </span>
            )}

            {treatment.treatment_context && (
              <p className="text-[13px] text-aneya-text-secondary mt-1">
                {treatment.treatment_context}
              </p>
            )}
          </div>
        </div>

        {/* Dosage Summary */}
        <div className="mt-3">
          <p className="text-[14px] text-aneya-navy">
            <strong>Dosage:</strong> {extractDosageSummary(treatment.dosage)}
          </p>
        </div>

        {/* Interactions Link */}
        {treatment.interactions && (
          <div className="mt-2">
            <p className="text-[14px] text-aneya-navy">
              <strong>Interactions:</strong>{' '}
              {treatment.url ? (
                <a
                  href={`${treatment.url}#interactions`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-aneya-navy hover:underline inline-flex items-center gap-1"
                >
                  View interactions
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-aneya-text-secondary">{treatment.interactions}</span>
              )}
            </p>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={onToggle}
          className="mt-3 text-[13px] text-aneya-navy hover:underline flex items-center gap-1"
        >
          {isExpanded ? 'Show less' : 'Show full details'}
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 space-y-3 text-[14px]">
          {treatment.indications && (
            <div>
              <strong className="text-aneya-navy">Indications:</strong>
              <p className="text-aneya-text-secondary mt-1 whitespace-pre-wrap">{treatment.indications}</p>
            </div>
          )}

          {treatment.dosage && (
            <div>
              <strong className="text-aneya-navy">Full Dosing Information:</strong>
              <p className="text-aneya-text-secondary mt-1 whitespace-pre-wrap">{treatment.dosage}</p>
            </div>
          )}

          {treatment.contraindications && treatment.contraindications !== 'Not specified' && (
            <div>
              <strong className="text-aneya-navy">Contraindications:</strong>
              <p className="text-aneya-text-secondary mt-1">{treatment.contraindications}</p>
            </div>
          )}

          {treatment.cautions && (
            <div>
              <strong className="text-aneya-navy">Cautions:</strong>
              <p className="text-aneya-text-secondary mt-1">{treatment.cautions}</p>
            </div>
          )}

          {treatment.side_effects && treatment.side_effects !== 'Not specified' && (
            <div>
              <strong className="text-aneya-navy">Side Effects:</strong>
              <p className="text-aneya-text-secondary mt-1">{treatment.side_effects}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
