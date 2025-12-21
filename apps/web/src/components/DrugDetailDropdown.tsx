import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { DrugDetails } from '../types/drug';

interface DrugDetailDropdownProps {
  drugName: string;
  details?: DrugDetails | null; // undefined = loading, null = failed, object = loaded
  onExpand?: () => void;
}

export function DrugDetailDropdown({ drugName, details, onExpand }: DrugDetailDropdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    if (!isExpanded && onExpand) {
      onExpand();
    }
    setIsExpanded(!isExpanded);
  };

  // Determine loading state
  const isLoading = details === undefined;
  const hasFailed = details === null;
  const isLoaded = details && typeof details === 'object';

  // Get data from appropriate source
  const bnfData = details?.bnf_data;
  const drugbankData = details?.drugbank_data;

  // Helper to get field value with fallback priority (BNF preferred for clinical info)
  const getField = (bnfField?: string, drugbankField?: string) => {
    const bnfValue = bnfData && bnfField && (bnfData as any)[bnfField];
    const drugbankValue = drugbankData && drugbankField && (drugbankData as any)[drugbankField];

    // Return BNF if available and not "Not specified", otherwise DrugBank
    if (bnfValue && bnfValue !== 'Not specified') return bnfValue;
    if (drugbankValue && drugbankValue !== 'Not specified') return drugbankValue;
    return null;
  };

  // Field display component
  const FieldDisplay = ({ label, value }: { label: string; value: string }) => (
    <div>
      <h4 className="text-[14px] font-semibold text-aneya-navy mb-1">{label}</h4>
      <p className="text-[14px] text-aneya-navy whitespace-pre-wrap">{value}</p>
    </div>
  );

  return (
    <div className="mb-2">
      {/* Drug name header - always visible */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 bg-white border border-aneya-teal rounded-lg hover:border-aneya-navy transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[15px] leading-[22px] text-aneya-navy font-medium">
            {drugName}
          </span>
          {isLoading && !isExpanded && (
            <span className="text-[12px] text-gray-500 italic">
              (loading...)
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-aneya-navy" />
        ) : (
          <ChevronDown className="w-4 h-4 text-aneya-navy" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-2 p-4 bg-white border border-aneya-teal border-t-0 rounded-b-lg">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal mb-3"></div>
              <p className="text-[14px] text-gray-600">Loading drug details...</p>
            </div>
          )}

          {/* Failed state */}
          {hasFailed && (
            <div className="text-center py-4">
              <p className="text-[14px] text-gray-600">
                Could not load details for this medication. Please consult the BNF or DrugBank directly.
              </p>
            </div>
          )}

          {/* Loaded state */}
          {isLoaded && (
            <div className="space-y-4">
              {/* Source Link - BNF */}
              {bnfData && details.url && (
                <div>
                  <a
                    href={details.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[14px] text-aneya-teal hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View full details on BNF</span>
                  </a>
                </div>
              )}

              {/* DrugBank link - fallback for international */}
              {drugbankData && !bnfData && details.url && (
                <div>
                  <a
                    href={details.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[14px] text-aneya-teal hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View full details on DrugBank</span>
                  </a>
                </div>
              )}

              {/* Dosage - try BNF first, then DrugBank */}
              {getField('dosage', 'dosage') && (
                <FieldDisplay label="Dosage" value={getField('dosage', 'dosage')!} />
              )}

              {/* Side Effects - try BNF first, then DrugBank */}
              {getField('side_effects', 'side_effects') && (
                <FieldDisplay label="Side Effects" value={getField('side_effects', 'side_effects')!} />
              )}

              {/* Drug Interactions - try BNF first, then DrugBank */}
              {getField('interactions', 'interactions') && (
                <FieldDisplay label="Drug Interactions" value={getField('interactions', 'interactions')!} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
