import { useState, useMemo } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { DiagnosisCard } from './DiagnosisCard';
import { WarningBox } from './WarningBox';
import { ExternalLink } from 'lucide-react';
import { PatientDetails } from './InputScreen';
import { AppointmentWithPatient } from '../types/database';
import { formatTime24 } from '../utils/dateHelpers';

interface ReportScreenProps {
  onStartNew: () => void;
  onReanalyze?: () => void;
  result: any;
  patientDetails: PatientDetails | null;
  errors?: string[];
  drugDetails?: Record<string, any>;
  appointmentContext?: AppointmentWithPatient;
  onSaveConsultation?: () => void;
}

export function ReportScreen({ onStartNew, onReanalyze, result, patientDetails, errors = [], drugDetails = {}, appointmentContext, onSaveConsultation }: ReportScreenProps) {
  const [isPatientDetailsExpanded, setIsPatientDetailsExpanded] = useState(false);
  const diagnoses = result.diagnoses || [];
  const niceGuidelines = result.guidelines_found || [];
  const cksTopics = result.cks_topics || [];
  const bnfSummaries = result.bnf_summaries || [];

  // Helper: Check if diagnosis has new structure (primary_care/surgery/diagnostics)
  const hasNewStructure = (diag: any) => {
    return diag.primary_care || diag.surgery || diag.diagnostics;
  };

  // Helper: Convert old format to new format for backward compatibility
  const convertToNewFormat = (diag: any) => {
    if (hasNewStructure(diag)) {
      return diag; // Already new format
    }

    // Legacy format detected - convert to new format
    return {
      ...diag,
      primary_care: {
        medications: [],
        supportive_care: [],
        clinical_guidance: diag.summary || "Legacy format - treatment details available in the analysis.",
        when_to_escalate: []
      }
    };
  };

  // Memoize converted diagnoses to prevent repeated conversions on every render
  const convertedDiagnoses = useMemo(() => {
    const converted = diagnoses.map((diag: any) => convertToNewFormat(diag));

    // Log once when diagnoses are first converted
    converted.forEach((diag: any) => {
      if (hasNewStructure(diag) && diag.primary_care) {
        console.log('Using new format for:', diag.diagnosis);
      }
    });

    return converted;
  }, [diagnoses]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-[32px] leading-[38px] text-aneya-navy mb-8">
          Clinical Analysis Report
        </h1>

        {/* Appointment Context Banner */}
        {appointmentContext && (
          <div className="mb-6 bg-aneya-teal/10 border-2 border-aneya-teal rounded-[10px] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-aneya-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="text-[14px] text-aneya-navy font-medium">
                    Consultation for: {appointmentContext.patient?.name || 'Patient'}
                  </div>
                  <div className="text-[12px] text-gray-600">
                    Appointment at {formatTime24(new Date(appointmentContext.scheduled_time))} - {appointmentContext.duration_minutes} min
                    {appointmentContext.reason && ` • ${appointmentContext.reason}`}
                  </div>
                </div>
              </div>
              {onSaveConsultation && (
                <button
                  onClick={onSaveConsultation}
                  className="px-6 py-3 bg-aneya-teal hover:bg-aneya-teal/90 text-white rounded-[10px] font-medium text-[14px] transition-colors flex items-center gap-2"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Consultation
                </button>
              )}
            </div>
          </div>
        )}

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

                {/* Age and Height in a row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[12px] text-gray-600 mb-1">Age</div>
                    <div className="text-[14px] text-aneya-navy">{patientDetails.age}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-gray-600 mb-1">Height</div>
                    <div className="text-[14px] text-aneya-navy">{patientDetails.height}</div>
                  </div>
                </div>

                {/* Weight */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[12px] text-gray-600 mb-1">Weight</div>
                    <div className="text-[14px] text-aneya-navy">{patientDetails.weight}</div>
                  </div>
                  <div></div>
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

        {/* 2. Errors and Warnings Section */}
        {errors.length > 0 && (
          <section className="mb-8">
            <WarningBox>
              <div className="space-y-3">
                <h3 className="text-[18px] leading-[24px] text-aneya-navy font-semibold">
                  Analysis Warnings
                </h3>
                <p className="text-[15px] leading-[22px] text-aneya-navy">
                  The following issues were encountered during analysis. The results below may be incomplete:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  {errors.map((error, idx) => (
                    <li key={idx} className="text-[15px] leading-[22px] text-aneya-navy">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </WarningBox>
          </section>
        )}

        {/* 3. Clinical Diagnoses Section with Treatments */}
        {convertedDiagnoses.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[26px] leading-[32px] text-aneya-navy mb-4">Clinical Diagnoses</h2>

            {/* Primary Diagnosis */}
            {convertedDiagnoses[0] && (() => {
              const diag = convertedDiagnoses[0];
              return (
                <>
                  <p className="text-[17px] leading-[26px] text-aneya-navy mb-3 font-semibold">Primary Diagnosis:</p>
                  <DiagnosisCard
                    diagnosisNumber={1}
                    diagnosis={diag.diagnosis || diag.name}
                    confidence={diag.confidence}
                    isPrimary={true}
                    source={diag.source}
                    url={diag.url}
                    summary={diag.summary}
                    primary_care={diag.primary_care}
                    surgery={diag.surgery}
                    diagnostics={diag.diagnostics}
                    follow_up={diag.follow_up}
                    drugDetails={drugDetails}
                  />
                </>
              );
            })()}

            {/* Alternative Diagnoses */}
            {convertedDiagnoses.length > 1 && (
              <>
                <p className="text-[17px] leading-[26px] text-aneya-navy mb-3 mt-6 font-semibold">Alternative Diagnoses:</p>
                <div className="space-y-4">
                  {convertedDiagnoses.slice(1).map((diag: any, idx: number) => {
                    return (
                      <DiagnosisCard
                        key={idx + 1}
                        diagnosisNumber={idx + 2}
                        diagnosis={diag.diagnosis || diag.name}
                        confidence={diag.confidence}
                        isPrimary={false}
                        source={diag.source}
                        url={diag.url}
                        summary={diag.summary}
                        primary_care={diag.primary_care}
                        surgery={diag.surgery}
                        diagnostics={diag.diagnostics}
                        follow_up={diag.follow_up}
                        drugDetails={drugDetails}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}

        {/* 4. Resources Consulted Section */}
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

        {/* 5. Clinical Disclaimer */}
        <section className="mb-8">
          <WarningBox>
            <div className="space-y-2">
              <h3 className="text-[18px] leading-[24px] text-aneya-navy">Clinical Disclaimer</h3>
              <p className="text-[15px] leading-[22px] text-aneya-navy">
                This analysis should not replace clinical judgment.
                Always consider individual patient factors, local antimicrobial resistance patterns, and current clinical guidelines.
                Verify all medication doses and interactions before prescribing. In case of clinical deterioration or uncertainty,
                seek senior clinical advice or specialist input.
              </p>
            </div>
          </WarningBox>
        </section>

        {/* 6. Action Buttons */}
        <div className="pt-6 space-y-3">
          {onReanalyze && (
            <button
              onClick={onReanalyze}
              className="w-full px-6 py-3 bg-aneya-navy/10 text-aneya-navy rounded-[10px] font-medium text-[15px] hover:bg-aneya-navy/20 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-analyze Consultation
            </button>
          )}
          <PrimaryButton onClick={onStartNew} fullWidth>
            Start New Analysis
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
