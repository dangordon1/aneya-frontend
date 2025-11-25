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
        return 'text-[#0c3555]';
    }
  };

  return (
    <div className={`bg-white rounded-[16px] p-6 aneya-shadow-card border ${isPrimary ? 'border-[#0c3555] border-2' : 'border-[#1d9e99]'} ${className}`}>
      {isPrimary && (
        <span className="inline-block px-3 py-1 bg-[#1d9e99] text-[#0c3555] rounded-full text-[13px] leading-[18px] mb-3">
          Primary Diagnosis
        </span>
      )}

      <h3 className="text-[22px] leading-[28px] text-[#0c3555] mb-3">
        {isPrimary ? diagnosis : `Diagnosis ${diagnosisNumber}: ${diagnosis}`}
      </h3>

      {confidence && (
        <p className="text-[15px] leading-[22px] text-[#5C3E53] mb-2">
          <strong>Confidence:</strong>{' '}
          <span className={`font-semibold ${getConfidenceColor(confidence)}`}>
            {confidence.toUpperCase()}
          </span>
        </p>
      )}

      {source && (
        <p className="text-[15px] leading-[22px] text-[#5C3E53] mb-2">
          <strong>Source:</strong>{' '}
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#0c3555] hover:underline">
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
