import { Activity, AlertTriangle, ExternalLink } from 'lucide-react';

interface DesignTokens {
  logo_url?: string;
  primary_color: string;
  accent_color: string;
  background_color: string;
  clinic_name: string;
  contact_info?: {
    address?: string;
    phone?: string;
    fax?: string;
  };
}

interface PatientInfo {
  name: string;
  id?: string;
  date_of_birth?: string;
  age?: number;
  sex?: string;
}

interface AppointmentInfo {
  id: string;
  scheduled_time: string;
  doctor?: {
    name: string;
  };
}

interface Diagnosis {
  diagnosis: string;
  confidence: 'high' | 'medium' | 'low';
  source?: string;
  url?: string;
  summary?: string;
  primary_care?: {
    medications?: string[];
    clinical_guidance?: string;
    supportive_care?: string[];
    when_to_escalate?: string[];
  };
  surgery?: {
    indicated?: boolean;
    procedure?: string;
    phases?: any;
  };
  diagnostics?: {
    required?: string[];
    monitoring?: string[];
    referral_criteria?: string[];
  };
  follow_up?: {
    timeframe?: string;
    monitoring?: string[];
    referral_criteria?: string[];
  };
}

interface GuidelineResource {
  source: string;
  title: string;
  url: string;
  summary?: string;
}

interface ConsultationData {
  id: string;
  consultation_text: string;
  original_transcript?: string;
  analysis_result?: any;
  diagnoses: Diagnosis[];
  guidelines_found?: GuidelineResource[];
  summary_data?: any;
  created_at: string;
}

interface PdfAnalysisReportProps {
  consultationData: ConsultationData;
  patientInfo: PatientInfo;
  appointmentInfo: AppointmentInfo;
  clinicBranding: DesignTokens;
}

export function PdfAnalysisReport({
  consultationData,
  patientInfo,
  appointmentInfo,
  clinicBranding
}: PdfAnalysisReportProps) {
  const primaryDiagnosis = consultationData.diagnoses?.[0];
  const alternativeDiagnoses = consultationData.diagnoses?.slice(1) || [];

  return (
    <div className="min-h-screen bg-[var(--clinic-background)] p-8 print-background">
      <div className="max-w-[1200px] mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">

        {/* Letterhead */}
        <div className="bg-[var(--clinic-primary)] text-white p-8 print-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {clinicBranding.logo_url ? (
                <img
                  src={clinicBranding.logo_url}
                  alt="Clinic Logo"
                  className="w-20 h-20 object-contain bg-white rounded-full p-2"
                />
              ) : (
                <div className="w-20 h-20 bg-[var(--clinic-accent)] rounded-full flex items-center justify-center">
                  <Activity className="w-10 h-10 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-3xl text-white">{clinicBranding.clinic_name}</h1>
                <p className="text-[var(--clinic-background)] mt-1">
                  Excellence in Patient Care
                </p>
              </div>
            </div>
            <div className="text-right text-sm text-[var(--clinic-background)]">
              {clinicBranding.contact_info?.address && (
                <p>{clinicBranding.contact_info.address}</p>
              )}
              {clinicBranding.contact_info?.phone && (
                <p>Phone: {clinicBranding.contact_info.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-8">
          {/* Report Title */}
          <div className="border-b-2 border-[var(--clinic-accent)] pb-4 mb-6">
            <h2 className="text-2xl text-[var(--clinic-primary)]">Clinical Analysis Report</h2>
            <p className="text-gray-600 mt-1">
              Generated: {new Date(consultationData.created_at).toLocaleString()}
            </p>
          </div>

          {/* Patient Summary */}
          <div className="mb-8 section-break">
            <h3 className="text-xl text-[var(--clinic-primary)] mb-4 pb-2 border-b border-[var(--clinic-accent)]">
              Patient Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Name:</span>
                <span className="font-medium ml-2">{patientInfo.name}</span>
              </div>
              {patientInfo.age && (
                <div>
                  <span className="text-sm text-gray-600">Age:</span>
                  <span className="font-medium ml-2">{patientInfo.age} years</span>
                </div>
              )}
              {patientInfo.sex && (
                <div>
                  <span className="text-sm text-gray-600">Sex:</span>
                  <span className="font-medium ml-2">{patientInfo.sex}</span>
                </div>
              )}
              {appointmentInfo.doctor?.name && (
                <div>
                  <span className="text-sm text-gray-600">Physician:</span>
                  <span className="font-medium ml-2">{appointmentInfo.doctor.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Primary Diagnosis */}
          {primaryDiagnosis && (
            <div className="mb-8 avoid-break">
              <h3 className="text-xl text-[var(--clinic-primary)] mb-4 pb-2 border-b border-[var(--clinic-accent)]">
                Primary Diagnosis
              </h3>
              <DiagnosisRenderer diagnosis={primaryDiagnosis} isPrimary={true} />
            </div>
          )}

          {/* Alternative Diagnoses */}
          {alternativeDiagnoses.length > 0 && (
            <div className="mb-8 section-break">
              <h3 className="text-xl text-[var(--clinic-primary)] mb-4 pb-2 border-b border-[var(--clinic-accent)]">
                Alternative Diagnoses
              </h3>
              {alternativeDiagnoses.map((diagnosis, idx) => (
                <div key={idx} className="mb-6">
                  <DiagnosisRenderer diagnosis={diagnosis} isPrimary={false} />
                </div>
              ))}
            </div>
          )}

          {/* Resources Consulted */}
          {consultationData.guidelines_found && consultationData.guidelines_found.length > 0 && (
            <div className="mb-8 section-break">
              <h3 className="text-xl text-[var(--clinic-primary)] mb-4 pb-2 border-b border-[var(--clinic-accent)]">
                Clinical Resources Consulted
              </h3>
              <div className="space-y-3">
                {consultationData.guidelines_found.map((resource, idx) => (
                  <div key={idx} className="border-l-4 border-[var(--clinic-accent)] pl-4 py-2">
                    <div className="flex items-start gap-2">
                      <ExternalLink className="w-4 h-4 text-[var(--clinic-accent)] mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[var(--clinic-primary)]">
                          {resource.source}: {resource.title}
                        </p>
                        {resource.summary && (
                          <p className="text-sm text-gray-600 mt-1">{resource.summary}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1 break-all">{resource.url}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Disclaimer */}
          <div className="mb-8 section-break">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-2">Important Clinical Notice</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>This analysis is a clinical decision support tool only</li>
                    <li>All recommendations require professional clinical review before prescribing</li>
                    <li>Verify patient allergies, drug interactions, and contraindications</li>
                    <li>Consider renal/hepatic function, pregnancy status, and comorbidities</li>
                    <li>Follow local protocols, guidelines, and formularies</li>
                    <li>This system provides reference information, not clinical judgment</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[var(--clinic-primary)] text-white px-8 py-4 text-center text-sm print-background">
          <p className="text-[var(--clinic-background)]">
            This is a confidential medical document. Unauthorized disclosure is prohibited.
          </p>
          <p className="text-[var(--clinic-background)] mt-1">
            © {new Date().getFullYear()} {clinicBranding.clinic_name}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Render a single diagnosis with all its details
 */
function DiagnosisRenderer({ diagnosis, _isPrimary }: { diagnosis: Diagnosis; isPrimary: boolean }) {
  const confidenceColors = {
    high: 'bg-green-100 text-green-800 border-green-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-orange-100 text-orange-800 border-orange-300'
  };

  return (
    <div className="border-2 border-[var(--clinic-accent)] rounded-lg p-4 avoid-break">
      {/* Diagnosis Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-[var(--clinic-primary)]">
            {diagnosis.diagnosis}
          </h4>
          {diagnosis.source && (
            <p className="text-sm text-gray-600 mt-1">Source: {diagnosis.source}</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${confidenceColors[diagnosis.confidence]}`}>
          {diagnosis.confidence.toUpperCase()} CONFIDENCE
        </span>
      </div>

      {/* Summary */}
      {diagnosis.summary && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-700">{diagnosis.summary}</p>
        </div>
      )}

      {/* Primary Care Management */}
      {diagnosis.primary_care && (
        <div className="mb-4">
          <h5 className="font-semibold text-[var(--clinic-primary)] mb-2">Primary Care Management</h5>

          {diagnosis.primary_care.medications && diagnosis.primary_care.medications.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Medications:</p>
              <ul className="list-disc ml-5 text-sm text-gray-600 space-y-1">
                {diagnosis.primary_care.medications.map((med, idx) => (
                  <li key={idx}>{med}</li>
                ))}
              </ul>
            </div>
          )}

          {diagnosis.primary_care.clinical_guidance && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Clinical Guidance:</p>
              <p className="text-sm text-gray-600">{diagnosis.primary_care.clinical_guidance}</p>
            </div>
          )}

          {diagnosis.primary_care.supportive_care && diagnosis.primary_care.supportive_care.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Supportive Care:</p>
              <ul className="list-disc ml-5 text-sm text-gray-600 space-y-1">
                {diagnosis.primary_care.supportive_care.map((care, idx) => (
                  <li key={idx}>{care}</li>
                ))}
              </ul>
            </div>
          )}

          {diagnosis.primary_care.when_to_escalate && diagnosis.primary_care.when_to_escalate.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3">
              <p className="text-sm font-semibold text-red-800 mb-1">When to Escalate:</p>
              <ul className="list-disc ml-5 text-sm text-red-700 space-y-1">
                {diagnosis.primary_care.when_to_escalate.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Diagnostic Workup */}
      {diagnosis.diagnostics && (
        <div className="mb-4">
          <h5 className="font-semibold text-[var(--clinic-primary)] mb-2">Diagnostic Workup</h5>

          {diagnosis.diagnostics.required && diagnosis.diagnostics.required.length > 0 && (
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-700 mb-1">Required Investigations:</p>
              <ul className="list-disc ml-5 text-sm text-gray-600 space-y-1">
                {diagnosis.diagnostics.required.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {diagnosis.diagnostics.monitoring && diagnosis.diagnostics.monitoring.length > 0 && (
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-700 mb-1">Monitoring:</p>
              <ul className="list-disc ml-5 text-sm text-gray-600 space-y-1">
                {diagnosis.diagnostics.monitoring.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Follow-up Care */}
      {diagnosis.follow_up && (
        <div className="mb-4">
          <h5 className="font-semibold text-[var(--clinic-primary)] mb-2">Follow-up Care</h5>

          {diagnosis.follow_up.timeframe && (
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Timeframe:</span> {diagnosis.follow_up.timeframe}
            </p>
          )}

          {diagnosis.follow_up.monitoring && diagnosis.follow_up.monitoring.length > 0 && (
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-700 mb-1">Monitoring Points:</p>
              <ul className="list-disc ml-5 text-sm text-gray-600 space-y-1">
                {diagnosis.follow_up.monitoring.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {diagnosis.follow_up.referral_criteria && diagnosis.follow_up.referral_criteria.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Referral Criteria:</p>
              <ul className="list-disc ml-5 text-sm text-gray-600 space-y-1">
                {diagnosis.follow_up.referral_criteria.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Surgical Management (if indicated) */}
      {diagnosis.surgery?.indicated && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded p-3">
          <h5 className="font-semibold text-purple-900 mb-2">Surgical Management Indicated</h5>
          {diagnosis.surgery.procedure && (
            <p className="text-sm text-purple-800">
              <span className="font-medium">Procedure:</span> {diagnosis.surgery.procedure}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
