import { PrimaryButton } from './PrimaryButton';
import { DiagnosisCard } from './DiagnosisCard';
import { ExpandableSection } from './ExpandableSection';
import { MedicationBox } from './MedicationBox';
import { WarningBox } from './WarningBox';
import { ExternalLink } from 'lucide-react';

interface ReportScreenProps {
  onStartNew: () => void;
  result: any;
}

export function ReportScreen({ onStartNew, result }: ReportScreenProps) {
  const patientInfo = result.patient_info;
  const diagnoses = result.diagnoses || [];
  const bnfGuidance = result.bnf_prescribing_guidance || [];
  const niceGuidelines = result.guidelines_found || [];
  const cksTopics = result.cks_topics || [];
  const bnfSummaries = result.bnf_summaries || [];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-[32px] leading-[38px] text-[#0c3555] mb-8">
          Clinical Analysis Report
        </h1>

        {/* 1. Patient Information Card */}
        {patientInfo && patientInfo.success && (
          <section className="mb-8">
            <h2 className="text-[26px] leading-[32px] text-[#0c3555] mb-4">Patient Information</h2>
            <div className="bg-white rounded-[16px] p-6 aneya-shadow-card border border-[#1d9e99]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <div className="text-[13px] leading-[18px] text-[#5C3E53] mb-1">Patient ID</div>
                  <div className="text-[17px] leading-[26px] text-[#0c3555]">{patientInfo.patient_id || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[13px] leading-[18px] text-[#5C3E53] mb-1">Age</div>
                  <div className="text-[17px] leading-[26px] text-[#0c3555]">{patientInfo.age || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[13px] leading-[18px] text-[#5C3E53] mb-1">Gender</div>
                  <div className="text-[17px] leading-[26px] text-[#0c3555]">{patientInfo.gender || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[13px] leading-[18px] text-[#5C3E53] mb-1">Weight</div>
                  <div className="text-[17px] leading-[26px] text-[#0c3555]">{patientInfo.weight_kg ? `${patientInfo.weight_kg} kg` : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[13px] leading-[18px] text-[#5C3E53] mb-1">BMI</div>
                  <div className="text-[17px] leading-[26px] text-[#0c3555]">{patientInfo.bmi || 'N/A'}</div>
                </div>
              </div>

              <div className="border-t border-[#1d9e99] pt-4">
                <div className="mb-4">
                  <div className="text-[13px] leading-[18px] text-[#5C3E53] mb-2">Allergies</div>
                  <div className="text-[15px] leading-[22px] text-[#0c3555]">
                    {patientInfo.allergies && patientInfo.allergies.length > 0
                      ? patientInfo.allergies.join(', ')
                      : 'No known drug allergies (NKDA)'}
                  </div>
                </div>

                {patientInfo.current_medications && patientInfo.current_medications.length > 0 && (
                  <div>
                    <div className="text-[13px] leading-[18px] text-[#5C3E53] mb-2">Current Medications</div>
                    <ul className="text-[15px] leading-[22px] text-[#0c3555] space-y-1">
                      {patientInfo.current_medications.map((med: string, idx: number) => (
                        <li key={idx}>• {med}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 2. Clinical Diagnoses Section */}
        {diagnoses.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[26px] leading-[32px] text-[#0c3555] mb-4">Clinical Diagnoses</h2>

            {/* Primary Diagnosis */}
            {diagnoses[0] && (
              <>
                <p className="text-[17px] leading-[26px] text-[#0c3555] mb-3 font-semibold">Primary Diagnosis:</p>
                <DiagnosisCard
                  diagnosisNumber={1}
                  diagnosis={diagnoses[0].diagnosis}
                  confidence={diagnoses[0].confidence}
                  isPrimary={true}
                  source={diagnoses[0].source}
                  url={diagnoses[0].url}
                  summary={diagnoses[0].summary}
                />
              </>
            )}

            {/* Alternative Diagnoses */}
            {diagnoses.length > 1 && (
              <>
                <p className="text-[17px] leading-[26px] text-[#0c3555] mb-3 mt-6 font-semibold">Alternative Diagnoses:</p>
                <div className="space-y-4">
                  {diagnoses.slice(1).map((diag: any, idx: number) => (
                    <DiagnosisCard
                      key={idx + 1}
                      diagnosisNumber={idx + 2}
                      diagnosis={diag.diagnosis}
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

        {/* 3. Prescribing Guidance Section */}
        {bnfGuidance.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[26px] leading-[32px] text-[#0c3555] mb-4">
              Evidence-Based Prescribing Guidance
            </h2>

            {bnfGuidance.map((guidance: any, idx: number) => (
              <div key={idx} className="mb-6 bg-white rounded-[16px] p-6 aneya-shadow-card border border-[#1d9e99]">
                <h3 className="text-[22px] leading-[28px] text-[#0c3555] mb-2">
                  Prescribing Guidance {idx + 1}: {guidance.condition}
                </h3>

                {guidance.source && (
                  <p className="text-[15px] leading-[22px] text-[#5C3E53] mb-2">
                    <strong>Source:</strong>{' '}
                    {guidance.source_url ? (
                      <a href={guidance.source_url} target="_blank" rel="noopener noreferrer" className="text-[#0c3555] hover:underline">
                        {guidance.source}
                      </a>
                    ) : (
                      guidance.source
                    )}
                  </p>
                )}

                {guidance.severity_assessment && (
                  <p className="text-[15px] leading-[22px] text-[#5C3E53] mb-4">
                    <strong>Severity Assessment:</strong> {guidance.severity_assessment}
                  </p>
                )}

                <div className="space-y-4">
                  {/* Special Considerations */}
                  {guidance.special_considerations && (
                    <ExpandableSection title="Special Considerations" defaultExpanded={false}>
                      <div className="space-y-3 text-[15px] leading-[22px] text-[#0c3555]">
                        {guidance.special_considerations.elderly && (
                          <p><strong>Elderly:</strong> {guidance.special_considerations.elderly}</p>
                        )}
                        {guidance.special_considerations.renal_impairment && (
                          <p><strong>Renal Impairment:</strong> {guidance.special_considerations.renal_impairment}</p>
                        )}
                        {guidance.special_considerations.hepatic_impairment && (
                          <p><strong>Hepatic Impairment:</strong> {guidance.special_considerations.hepatic_impairment}</p>
                        )}
                        {guidance.special_considerations.pregnancy && (
                          <p><strong>Pregnancy:</strong> {guidance.special_considerations.pregnancy}</p>
                        )}
                      </div>
                    </ExpandableSection>
                  )}

                  {/* First-Line Treatments */}
                  {guidance.first_line_treatments && guidance.first_line_treatments.length > 0 && (
                    <ExpandableSection title="First-Line Treatments" defaultExpanded={true}>
                      <div className="space-y-4">
                        {guidance.first_line_treatments.map((treatment: any, tidx: number) => (
                          <MedicationBox
                            key={tidx}
                            drugName={treatment.medication}
                            dose={treatment.dose || 'Not specified'}
                            route={treatment.route || 'Not specified'}
                            duration={treatment.duration || 'Not specified'}
                            notes={treatment.notes}
                            drugInteractions={treatment.drug_interactions}
                            bnfUrl={treatment.bnf_url}
                          />
                        ))}
                      </div>
                    </ExpandableSection>
                  )}

                  {/* Alternative Treatments */}
                  {guidance.alternative_treatments && guidance.alternative_treatments.length > 0 && (
                    <ExpandableSection title="Alternative Treatments" defaultExpanded={false}>
                      <div className="space-y-4">
                        {guidance.alternative_treatments.map((alt: any, aidx: number) => (
                          <MedicationBox
                            key={aidx}
                            drugName={`${alt.medication} ${alt.indication ? `(${alt.indication})` : ''}`}
                            dose={alt.dose || 'Not specified'}
                            route={alt.route || 'Not specified'}
                            duration={alt.duration || 'Not specified'}
                            notes={alt.notes}
                            drugInteractions={alt.drug_interactions}
                            bnfUrl={alt.bnf_url}
                          />
                        ))}
                      </div>
                    </ExpandableSection>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* 4. Resources Consulted Section */}
        {(niceGuidelines.length > 0 || cksTopics.length > 0 || bnfSummaries.length > 0) && (
          <section className="mb-8">
            <h2 className="text-[26px] leading-[32px] text-[#0c3555] mb-4">Resources Consulted</h2>

            <div className="bg-white rounded-[16px] p-6 aneya-shadow-card border border-[#1d9e99] space-y-6">
              {niceGuidelines.length > 0 && (
                <div>
                  <h3 className="text-[18px] leading-[24px] text-[#0c3555] mb-3">NICE Guidelines</h3>
                  <ul className="space-y-2">
                    {niceGuidelines.map((guideline: any, idx: number) => (
                      <li key={idx}>
                        <a
                          href={guideline.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[15px] leading-[22px] text-[#0c3555] hover:underline"
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
                  <h3 className="text-[18px] leading-[24px] text-[#0c3555] mb-3">CKS Topics</h3>
                  <ul className="space-y-2">
                    {cksTopics.map((topic: any, idx: number) => (
                      <li key={idx}>
                        <a
                          href={topic.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[15px] leading-[22px] text-[#0c3555] hover:underline"
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
                  <h3 className="text-[18px] leading-[24px] text-[#0c3555] mb-3">BNF Summaries</h3>
                  <ul className="space-y-2">
                    {bnfSummaries.map((bnf: any, idx: number) => (
                      <li key={idx}>
                        <a
                          href={bnf.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[15px] leading-[22px] text-[#0c3555] hover:underline"
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
              <h3 className="text-[18px] leading-[24px] text-[#0c3555]">Clinical Disclaimer</h3>
              <p className="text-[15px] leading-[22px] text-[#0c3555]">
                This analysis is provided as a clinical decision support tool and should not replace clinical judgment.
                Always consider individual patient factors, local antimicrobial resistance patterns, and current clinical guidelines.
                Verify all medication doses and interactions before prescribing. In case of clinical deterioration or uncertainty,
                seek senior clinical advice or specialist input.
              </p>
            </div>
          </WarningBox>
        </section>

        {/* 6. Start New Analysis Button */}
        <div className="pt-6">
          <PrimaryButton onClick={onStartNew} fullWidth>
            Start New Analysis
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
