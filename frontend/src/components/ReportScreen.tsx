import { useState } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { DiagnosisCard } from './DiagnosisCard';
import { WarningBox } from './WarningBox';
import { ExternalLink } from 'lucide-react';
import { PatientDetails } from './InputScreen';

interface ReportScreenProps {
  onStartNew: () => void;
  result: any;
  patientDetails: PatientDetails | null;
}

export function ReportScreen({ onStartNew, result, patientDetails }: ReportScreenProps) {
  const [isPatientDetailsExpanded, setIsPatientDetailsExpanded] = useState(false);
  const diagnoses = result.diagnoses || [];
  const bnfGuidance = result.bnf_prescribing_guidance || [];
  const niceGuidelines = result.guidelines_found || [];
  const cksTopics = result.cks_topics || [];
  const bnfSummaries = result.bnf_summaries || [];

  // Map BNF guidance from bnf_prescribing_guidance (if available)
  const mappedBnfTreatments = bnfGuidance.map((g: any) => ({
    medication: g.medication,
    url: g.url,
    dosage: g.dosage || g.indications,
    indications: g.indications,
    contraindications: g.contraindications,
    cautions: g.cautions,
    side_effects: g.side_effects,
    interactions: g.interactions,
    is_first_line: g.is_first_line,
    treatment_context: g.treatment_context
  }));

  // Helper function to get BNF treatments for a diagnosis
  // Only returns data if we have real BNF prescribing guidance (not AI-generated fallbacks)
  const getTreatmentsForDiagnosis = (_diagnosis: any) => {
    // Only use bnf_prescribing_guidance - this contains real data scraped from BNF
    // Do NOT fall back to diagnosis.treatments as those are AI-generated descriptions
    return mappedBnfTreatments;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-[32px] leading-[38px] text-aneya-navy mb-8">
          Clinical Analysis Report
        </h1>

        {/* 1. Patient Details - expandable section */}
        {patientDetails && (
          <section className="mb-8">
            <button
              onClick={() => setIsPatientDetailsExpanded(!isPatientDetailsExpanded)}
              className="w-full flex items-center justify-between p-4 bg-white border-2 border-aneya-teal rounded-[10px] hover:border-aneya-navy transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-aneya-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[14px] leading-[18px] text-aneya-navy font-medium">
                  Patient Details
                </span>
                <span className="text-[12px] text-gray-500">
                  ({patientDetails.name})
                </span>
              </div>
              <svg
                className={`h-5 w-5 text-aneya-navy transition-transform duration-200 ${isPatientDetailsExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expandable content */}
            {isPatientDetailsExpanded && (
              <div className="mt-2 p-4 bg-white border-2 border-aneya-teal border-t-0 rounded-b-[10px] space-y-4">
                {/* Name and Sex in a row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[12px] text-gray-600 mb-1">Name</div>
                    <div className="text-[14px] text-aneya-navy">{patientDetails.name}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-gray-600 mb-1">Sex</div>
                    <div className="text-[14px] text-aneya-navy">{patientDetails.sex}</div>
                  </div>
                </div>

                {/* Height and Weight in a row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[12px] text-gray-600 mb-1">Height</div>
                    <div className="text-[14px] text-aneya-navy">{patientDetails.height}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-gray-600 mb-1">Weight</div>
                    <div className="text-[14px] text-aneya-navy">{patientDetails.weight}</div>
                  </div>
                </div>

                {/* Current Medications */}
                <div>
                  <div className="text-[12px] text-gray-600 mb-1">Current Medications</div>
                  <div className="text-[14px] text-aneya-navy whitespace-pre-wrap">{patientDetails.currentMedications}</div>
                </div>

                {/* Current Conditions */}
                <div>
                  <div className="text-[12px] text-gray-600 mb-1">Current Conditions</div>
                  <div className="text-[14px] text-aneya-navy whitespace-pre-wrap">{patientDetails.currentConditions}</div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 2. Clinical Diagnoses Section with Treatments */}
        {diagnoses.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[26px] leading-[32px] text-aneya-navy mb-4">Clinical Diagnoses</h2>

            {/* Primary Diagnosis */}
            {diagnoses[0] && (
              <>
                <p className="text-[17px] leading-[26px] text-aneya-navy mb-3 font-semibold">Primary Diagnosis:</p>
                <DiagnosisCard
                  diagnosisNumber={1}
                  diagnosis={diagnoses[0].diagnosis || diagnoses[0].name}
                  confidence={diagnoses[0].confidence}
                  isPrimary={true}
                  source={diagnoses[0].source}
                  url={diagnoses[0].url}
                  summary={diagnoses[0].summary}
                  treatments={getTreatmentsForDiagnosis(diagnoses[0])}
                />
              </>
            )}

            {/* Alternative Diagnoses */}
            {diagnoses.length > 1 && (
              <>
                <p className="text-[17px] leading-[26px] text-aneya-navy mb-3 mt-6 font-semibold">Alternative Diagnoses:</p>
                <div className="space-y-4">
                  {diagnoses.slice(1).map((diag: any, idx: number) => (
                    <DiagnosisCard
                      key={idx + 1}
                      diagnosisNumber={idx + 2}
                      diagnosis={diag.diagnosis || diag.name}
                      confidence={diag.confidence}
                      isPrimary={false}
                      source={diag.source}
                      url={diag.url}
                      summary={diag.summary}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* 3. Resources Consulted Section */}
        {(niceGuidelines.length > 0 || cksTopics.length > 0 || bnfSummaries.length > 0) && (
          <section className="mb-8">
            <h2 className="text-[26px] leading-[32px] text-aneya-navy mb-4">Resources Consulted</h2>

            <div className="bg-white rounded-[16px] p-6 aneya-shadow-card border border-aneya-soft-pink space-y-6">
              {niceGuidelines.length > 0 && (
                <div>
                  <h3 className="text-[18px] leading-[24px] text-aneya-navy mb-3">NICE Guidelines</h3>
                  <ul className="space-y-2">
                    {niceGuidelines.map((guideline: any, idx: number) => (
                      <li key={idx}>
                        <a
                          href={guideline.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[15px] leading-[22px] text-aneya-navy hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>{guideline.reference}: {guideline.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {cksTopics.length > 0 && (
                <div>
                  <h3 className="text-[18px] leading-[24px] text-aneya-navy mb-3">CKS Topics</h3>
                  <ul className="space-y-2">
                    {cksTopics.map((topic: any, idx: number) => (
                      <li key={idx}>
                        <a
                          href={topic.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[15px] leading-[22px] text-aneya-navy hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>{topic.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {bnfSummaries.length > 0 && (
                <div>
                  <h3 className="text-[18px] leading-[24px] text-aneya-navy mb-3">BNF Summaries</h3>
                  <ul className="space-y-2">
                    {bnfSummaries.map((bnf: any, idx: number) => (
                      <li key={idx}>
                        <a
                          href={bnf.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[15px] leading-[22px] text-aneya-navy hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>{bnf.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4. Clinical Disclaimer */}
        <section className="mb-8">
          <WarningBox>
            <div className="space-y-2">
              <h3 className="text-[18px] leading-[24px] text-aneya-navy">Clinical Disclaimer</h3>
              <p className="text-[15px] leading-[22px] text-aneya-navy">
                This analysis is provided as a clinical decision support tool and should not replace clinical judgment.
                Always consider individual patient factors, local antimicrobial resistance patterns, and current clinical guidelines.
                Verify all medication doses and interactions before prescribing. In case of clinical deterioration or uncertainty,
                seek senior clinical advice or specialist input.
              </p>
            </div>
          </WarningBox>
        </section>

        {/* 5. Start New Analysis Button */}
        <div className="pt-6">
          <PrimaryButton onClick={onStartNew} fullWidth>
            Start New Analysis
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
