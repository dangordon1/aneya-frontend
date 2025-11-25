interface DiagnosisCardProps {
  diagnosisNumber: number;
  diagnosis: string;
  confidence?: string; // "high" | "medium" | "low"
  isPrimary?: boolean;
  source?: string;
  url?: string;
  summary?: string;
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
  className = ''
}: DiagnosisCardProps) {
  // Map confidence to color classes
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
    </div>
  );
}
