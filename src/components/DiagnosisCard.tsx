import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from 'lucide-react';
import { DrugDetailDropdown } from './DrugDetailDropdown';
import { WarningBox } from './WarningBox';

// New structure interfaces matching backend
interface PrimaryCare {
  medications: string[];
  supportive_care: string[];
  clinical_guidance?: string;
  when_to_escalate: string[];
}

interface SurgeryPhases {
  preoperative: {
    investigations: string[];
    medications: string[];
    preparation: string[];
  };
  operative: {
    technique: string;
    anesthesia: string;
    duration?: string;
  };
  postoperative: {
    immediate_care: string[];
    medications: string[];
    mobilization?: string;
    complications?: string[];
  };
}

interface Surgery {
  indicated: boolean;
  procedure: string;
  phases: SurgeryPhases;
}

interface Diagnostics {
  required: string[];
  monitoring: string[];
  referral_criteria: string[];
}

interface FollowUp {
  timeframe?: string;
  monitoring?: string[];
  referral_criteria?: string[];
}

interface DiagnosisCardProps {
  diagnosisNumber: number;
  diagnosis: string;
  confidence?: string;
  isPrimary?: boolean;
  source?: string;
  url?: string;
  summary?: string;
  primary_care?: PrimaryCare;
  surgery?: Surgery;
  diagnostics?: Diagnostics;
  follow_up?: FollowUp;
  drugDetails?: Record<string, any>; // Drug details map from parent
  className?: string;
}

export function DiagnosisCard({
  diagnosisNumber,
  diagnosis,
  confidence,
  isPrimary = false,
  source,
  url,
  summary,
  primary_care,
  surgery,
  diagnostics,
  follow_up,
  drugDetails = {},
  className = ''
}: DiagnosisCardProps) {
  const [showDetails, setShowDetails] = useState(isPrimary); // Primary diagnosis expanded by default

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
    <div className={`bg-white rounded-[16px] aneya-shadow-card border border-aneya-soft-pink overflow-hidden ${className}`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-6 flex items-start justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[14px] leading-[18px] text-gray-500">
              {isPrimary ? 'Primary Diagnosis' : `Alternative Diagnosis ${diagnosisNumber}`}
            </span>
            {confidence && (
              <span className={`px-3 py-1 rounded-full border text-[13px] font-medium ${getConfidenceBadgeColor(confidence)}`}>
                {confidence} confidence
              </span>
            )}
          </div>
          <h3 className="text-[20px] leading-[28px] text-aneya-navy font-semibold mb-2">
            {diagnosis}
          </h3>
          {source && (
            <p className="text-[14px] text-gray-600">
              Source: {source}
            </p>
          )}
        </div>
        <div className="ml-4">
          {showDetails ? (
            <ChevronUp className="w-6 h-6 text-aneya-navy" />
          ) : (
            <ChevronDown className="w-6 h-6 text-aneya-navy" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      {showDetails && (
        <div className="px-6 pb-6 space-y-6 border-t border-gray-100">
          {/* Summary */}
          {summary && (
            <div className="pt-6">
              <p className="text-[15px] leading-[22px] text-aneya-navy">
                {summary}
              </p>
            </div>
          )}

          {/* Guideline URL */}
          {url && (
            <div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[14px] text-aneya-teal hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View full guideline</span>
              </a>
            </div>
          )}

          {/* PRIMARY CARE SECTION */}
          {primary_care && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-[18px] leading-[24px] text-aneya-navy font-semibold mb-3">
                Primary Care Management
              </h4>

              {/* Medications */}
              {primary_care.medications && primary_care.medications.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-[15px] font-semibold text-aneya-navy mb-2">Medications</h5>
                  <div className="space-y-2">
                    {primary_care.medications.map((drugName, idx) => (
                        <DrugDetailDropdown
                          key={idx}
                          drugName={drugName}
                          details={drugDetails[drugName]}
                        />
                    ))}
                  </div>
                </div>
              )}

              {/* Clinical Guidance */}
              {primary_care.clinical_guidance && (
                <div className="mb-4">
                  <h5 className="text-[15px] font-semibold text-aneya-navy mb-2">Clinical Guidance</h5>
                  <p className="text-[14px] text-aneya-navy whitespace-pre-wrap">
                    {primary_care.clinical_guidance}
                  </p>
                </div>
              )}

              {/* Supportive Care */}
              {primary_care.supportive_care && primary_care.supportive_care.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-[15px] font-semibold text-aneya-navy mb-2">Supportive Care</h5>
                  <ul className="list-disc pl-5 space-y-1">
                    {primary_care.supportive_care.map((item, idx) => (
                      <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* When to Escalate */}
              {primary_care.when_to_escalate && primary_care.when_to_escalate.length > 0 && (
                <WarningBox>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-aneya-navy flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-[15px] font-semibold text-aneya-navy mb-2">
                        When to Seek Further Care
                      </h5>
                      <ul className="list-disc pl-5 space-y-1">
                        {primary_care.when_to_escalate.map((item, idx) => (
                          <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </WarningBox>
              )}
            </div>
          )}

          {/* SURGERY SECTION */}
          {surgery && surgery.indicated && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h4 className="text-[18px] leading-[24px] text-aneya-navy font-semibold mb-3">
                Surgical Management: {surgery.procedure}
              </h4>

              {/* Pre-operative Phase */}
              <div className="mb-4 bg-white rounded-lg p-4 border border-blue-300">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-[12px] font-bold">
                    1
                  </span>
                  <h5 className="text-[16px] font-semibold text-aneya-navy">Pre-operative</h5>
                </div>

                {surgery.phases?.preoperative?.investigations && surgery.phases.preoperative.investigations.length > 0 && (
                  <div className="mb-3">
                    <strong className="text-[14px] text-aneya-navy">Investigations:</strong>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      {surgery.phases.preoperative.investigations.map((item, idx) => (
                        <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {surgery.phases?.preoperative?.medications && surgery.phases.preoperative.medications.length > 0 && (
                  <div className="mb-3">
                    <strong className="text-[14px] text-aneya-navy">Medications:</strong>
                    <div className="space-y-2 mt-2">
                      {surgery.phases.preoperative.medications.map((drugName, idx) => (
                          <DrugDetailDropdown
                            key={idx}
                            drugName={drugName}
                            details={drugDetails[drugName]}
                          />
                      ))}
                    </div>
                  </div>
                )}

                {surgery.phases?.preoperative?.preparation && surgery.phases.preoperative.preparation.length > 0 && (
                  <div>
                    <strong className="text-[14px] text-aneya-navy">Preparation:</strong>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      {surgery.phases.preoperative.preparation.map((item, idx) => (
                        <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Operative Phase */}
              <div className="mb-4 bg-white rounded-lg p-4 border border-purple-300">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-6 h-6 bg-purple-500 text-white rounded-full text-[12px] font-bold">
                    2
                  </span>
                  <h5 className="text-[16px] font-semibold text-aneya-navy">Operative</h5>
                </div>

                {surgery.phases?.operative?.technique && (
                  <div className="mb-2">
                    <strong className="text-[14px] text-aneya-navy">Technique:</strong>
                    <p className="text-[14px] text-aneya-navy mt-1">{surgery.phases.operative.technique}</p>
                  </div>
                )}

                {surgery.phases?.operative?.anesthesia && (
                  <div className="mb-2">
                    <strong className="text-[14px] text-aneya-navy">Anesthesia:</strong>
                    <p className="text-[14px] text-aneya-navy mt-1">{surgery.phases.operative.anesthesia}</p>
                  </div>
                )}

                {surgery.phases?.operative?.duration && (
                  <div>
                    <strong className="text-[14px] text-aneya-navy">Duration:</strong>
                    <p className="text-[14px] text-aneya-navy mt-1">{surgery.phases.operative.duration}</p>
                  </div>
                )}
              </div>

              {/* Post-operative Phase */}
              <div className="bg-white rounded-lg p-4 border border-green-300">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full text-[12px] font-bold">
                    3
                  </span>
                  <h5 className="text-[16px] font-semibold text-aneya-navy">Post-operative</h5>
                </div>

                {surgery.phases?.postoperative?.immediate_care && surgery.phases.postoperative.immediate_care.length > 0 && (
                  <div className="mb-3">
                    <strong className="text-[14px] text-aneya-navy">Immediate Care:</strong>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      {surgery.phases.postoperative.immediate_care.map((item, idx) => (
                        <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {surgery.phases?.postoperative?.medications && surgery.phases.postoperative.medications.length > 0 && (
                  <div className="mb-3">
                    <strong className="text-[14px] text-aneya-navy">Medications:</strong>
                    <div className="space-y-2 mt-2">
                      {surgery.phases.postoperative.medications.map((drugName, idx) => (
                          <DrugDetailDropdown
                            key={idx}
                            drugName={drugName}
                            details={drugDetails[drugName]}
                          />
                      ))}
                    </div>
                  </div>
                )}

                {surgery.phases?.postoperative?.mobilization && (
                  <div className="mb-3">
                    <strong className="text-[14px] text-aneya-navy">Mobilization:</strong>
                    <p className="text-[14px] text-aneya-navy mt-1">{surgery.phases.postoperative.mobilization}</p>
                  </div>
                )}

                {surgery.phases?.postoperative?.complications && surgery.phases.postoperative.complications.length > 0 && (
                  <div>
                    <strong className="text-[14px] text-aneya-navy">Complications to Watch:</strong>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      {surgery.phases.postoperative.complications.map((item, idx) => (
                        <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DIAGNOSTICS SECTION */}
          {diagnostics && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h4 className="text-[18px] leading-[24px] text-aneya-navy font-semibold mb-3">
                Diagnostic Workup
              </h4>

              {diagnostics.required && diagnostics.required.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-[15px] font-semibold text-aneya-navy mb-2">Required Investigations</h5>
                  <ul className="list-disc pl-5 space-y-1">
                    {diagnostics.required.map((item, idx) => (
                      <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {diagnostics.monitoring && diagnostics.monitoring.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-[15px] font-semibold text-aneya-navy mb-2">Monitoring</h5>
                  <ul className="list-disc pl-5 space-y-1">
                    {diagnostics.monitoring.map((item, idx) => (
                      <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {diagnostics.referral_criteria && diagnostics.referral_criteria.length > 0 && (
                <div>
                  <h5 className="text-[15px] font-semibold text-aneya-navy mb-2">Referral Criteria</h5>
                  <ul className="list-disc pl-5 space-y-1">
                    {diagnostics.referral_criteria.map((item, idx) => (
                      <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* FOLLOW-UP SECTION */}
          {follow_up && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-[18px] leading-[24px] text-aneya-navy font-semibold mb-3">
                Follow-up Care
              </h4>

              {follow_up.timeframe && (
                <div className="mb-3">
                  <strong className="text-[14px] text-aneya-navy">Timeframe:</strong>
                  <p className="text-[14px] text-aneya-navy mt-1">{follow_up.timeframe}</p>
                </div>
              )}

              {follow_up.monitoring && follow_up.monitoring.length > 0 && (
                <div className="mb-3">
                  <strong className="text-[14px] text-aneya-navy">Monitoring:</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {follow_up.monitoring.map((item, idx) => (
                      <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {follow_up.referral_criteria && follow_up.referral_criteria.length > 0 && (
                <div>
                  <strong className="text-[14px] text-aneya-navy">Referral Criteria:</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {follow_up.referral_criteria.map((item, idx) => (
                      <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
