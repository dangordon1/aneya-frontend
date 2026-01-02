/**
 * ReportScreenV2 - Clean Clinical Design with Aneya Color Scheme
 *
 * Design principles:
 * - Aneya brand colors (navy, teal, cream)
 * - All sections collapsed by default
 * - Consistent expand arrows throughout
 * - Clean typography hierarchy
 * - Minimal visual noise
 */

import { useState, useMemo } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { FeedbackButton } from './FeedbackButton';
import { PatientDetails } from './InputScreen';
import { AppointmentWithPatient } from '../types/database';
import { formatTime24 } from '../utils/dateHelpers';
import {
  User,
  AlertCircle,
  Stethoscope,
  Pill,
  Activity,
  Calendar,
  BookOpen,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Save,
  Loader2
} from 'lucide-react';

interface ReportScreenV2Props {
  onStartNew: () => void;
  result: any;
  patientDetails: PatientDetails | null;
  errors?: string[];
  drugDetails?: Record<string, any>;
  drugsPending?: string[];
  appointmentContext?: AppointmentWithPatient;
  onSaveConsultation?: () => void;
  location?: string | null;  // Country code (e.g., 'GB' for UK)
  consultationId?: string | null;  // Consultation ID for feedback system
}

export function ReportScreenV2({
  onStartNew,
  result,
  patientDetails,
  errors = [],
  drugDetails = {},
  drugsPending = [],
  appointmentContext,
  onSaveConsultation,
  location,
  consultationId
}: ReportScreenV2Props) {
  // Determine if BNF links should be shown (UK only)
  const isUK = location === 'GB';
  const diagnoses = result.diagnoses || [];
  const niceGuidelines = result.guidelines_found || [];
  const cksTopics = result.cks_topics || [];
  const bnfSummaries = result.bnf_summaries || [];

  // Feedback state
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Record<string, string>>({});

  // API URL from environment
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Feedback handler
  const handleFeedback = async (
    feedbackType: string,
    sentiment: 'positive' | 'negative',
    data: any
  ) => {
    if (!consultationId) {
      console.warn('Cannot submit feedback: No consultation ID available');
      return;
    }

    try {
      const payload = {
        consultation_id: consultationId,
        feedback_type: feedbackType,
        feedback_sentiment: sentiment,
        ...data
      };

      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to submit feedback');
      }

      const result = await response.json();
      console.log('✅ Feedback submitted:', result);

      // Track which components have received feedback
      setFeedbackSubmitted(prev => ({
        ...prev,
        [data.component_identifier || feedbackType]: sentiment
      }));

    } catch (error) {
      console.error('❌ Failed to submit feedback:', error);
      throw error;
    }
  };

  // Convert diagnoses to consistent format
  const convertedDiagnoses = useMemo(() => {
    return diagnoses.map((diag: any) => {
      if (diag.primary_care || diag.surgery || diag.diagnostics) {
        return diag;
      }
      return {
        ...diag,
        primary_care: {
          medications: [],
          supportive_care: [],
          clinical_guidance: diag.summary || '',
          when_to_escalate: []
        }
      };
    });
  }, [diagnoses]);

  return (
    <div className="min-h-screen bg-aneya-cream">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-aneya-navy mb-1">
            Clinical Analysis Report
          </h1>
          <p className="text-sm text-aneya-text-secondary">
            Generated {new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </header>

        {/* Appointment Context Banner */}
        {appointmentContext && (
          <div className="mb-6 bg-white border border-aneya-soft-pink rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-aneya-teal" />
                <div>
                  <div className="text-sm text-aneya-navy font-medium">
                    Consultation for: {appointmentContext.patient.name}
                  </div>
                  <div className="text-xs text-aneya-text-secondary">
                    Appointment at {formatTime24(new Date(appointmentContext.scheduled_time))} - {appointmentContext.duration_minutes} min
                    {appointmentContext.reason && ` • ${appointmentContext.reason}`}
                  </div>
                </div>
              </div>
              {onSaveConsultation && (
                <button
                  onClick={onSaveConsultation}
                  className="px-4 py-2 bg-aneya-teal hover:bg-aneya-teal/90 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Consultation
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-sm border border-aneya-soft-pink overflow-hidden">

          {/* Patient Details Section */}
          {patientDetails && (
            <CollapsibleSection
              title="Patient Details"
              icon={<User className="w-4 h-4" />}
              badge={patientDetails.name}
            >
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <span className="text-aneya-text-secondary">Name:</span>
                  <span className="ml-2 text-aneya-navy">{patientDetails.name}</span>
                </div>
                <div>
                  <span className="text-aneya-text-secondary">Sex:</span>
                  <span className="ml-2 text-aneya-navy">{patientDetails.sex}</span>
                </div>
                <div>
                  <span className="text-aneya-text-secondary">Age:</span>
                  <span className="ml-2 text-aneya-navy">{patientDetails.age}</span>
                </div>
                <div>
                  <span className="text-aneya-text-secondary">Weight:</span>
                  <span className="ml-2 text-aneya-navy">{patientDetails.weight}</span>
                </div>
                {patientDetails.currentMedications && (
                  <div className="col-span-2">
                    <span className="text-aneya-text-secondary">Current Medications:</span>
                    <p className="mt-1 text-aneya-navy">{patientDetails.currentMedications}</p>
                  </div>
                )}
                {patientDetails.currentConditions && (
                  <div className="col-span-2">
                    <span className="text-aneya-text-secondary">Conditions:</span>
                    <p className="mt-1 text-aneya-navy">{patientDetails.currentConditions}</p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Warnings Section */}
          {errors.length > 0 && (
            <CollapsibleSection
              title="Analysis Warnings"
              icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
              badge={errors.length}
              defaultOpen={true}
            >
              <ul className="space-y-2 text-sm">
                {errors.map((error, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-aneya-navy">
                    <span className="text-amber-600 mt-0.5">•</span>
                    {error}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {/* Diagnoses Section */}
          {convertedDiagnoses.map((diag: any, idx: number) => (
            <DiagnosisSection
              key={idx}
              diagnosis={diag}
              isPrimary={idx === 0}
              number={idx + 1}
              drugDetails={drugDetails}
              drugsPending={drugsPending}
              showBnfLink={isUK}
              consultationId={consultationId}
              onFeedback={handleFeedback}
              feedbackSubmitted={feedbackSubmitted}
            />
          ))}

          {/* Resources Consulted */}
          {(niceGuidelines.length > 0 || cksTopics.length > 0 || bnfSummaries.length > 0) && (
            <CollapsibleSection
              title="Resources Consulted"
              icon={<BookOpen className="w-4 h-4" />}
              badge={niceGuidelines.length + cksTopics.length + bnfSummaries.length}
            >
              <div className="space-y-3 text-sm">
                {niceGuidelines.map((g: any, idx: number) => (
                  <ResourceLink key={`nice-${idx}`} title={`${g.reference}: ${g.title}`} url={g.url} />
                ))}
                {cksTopics.map((t: any, idx: number) => (
                  <ResourceLink key={`cks-${idx}`} title={t.title} url={t.url} />
                ))}
                {bnfSummaries.map((b: any, idx: number) => (
                  <ResourceLink key={`bnf-${idx}`} title={b.title} url={b.url} />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Disclaimer */}
          <div className="px-4 py-4 bg-aneya-cream/50 border-t border-aneya-soft-pink">
            <div className="flex items-start gap-3 text-xs text-aneya-text-secondary">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-aneya-navy" />
              <p>
                This analysis is for clinical decision support only and should not replace clinical judgment.
                Verify all medications and consider individual patient factors before prescribing.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          <PrimaryButton onClick={onStartNew} fullWidth>
            Close Consultation
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Collapsible Section Component
// ============================================

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  icon?: React.ReactNode;
  level?: 1 | 2;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  badge,
  icon,
  level = 1
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const isTopLevel = level === 1;

  return (
    <div className={isTopLevel ? 'border-b border-aneya-soft-pink' : 'border-b border-aneya-cream last:border-b-0'}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 hover:bg-aneya-cream/30 transition-colors ${
          isTopLevel ? 'py-4 px-4' : 'py-3 px-0'
        }`}
        aria-expanded={isOpen}
      >
        <ChevronRight
          className={`w-4 h-4 text-aneya-teal transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
        {icon && <span className="text-aneya-teal flex-shrink-0">{icon}</span>}
        <span className={`flex-1 text-left font-medium ${
          isTopLevel ? 'text-[15px] text-aneya-navy' : 'text-[14px] text-aneya-navy'
        }`}>
          {title}
        </span>
        {badge !== undefined && (
          <span className="px-2 py-0.5 text-xs font-medium text-aneya-text-secondary bg-aneya-cream rounded-full">
            {badge}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={isTopLevel ? 'pb-4 px-4 pl-11' : 'pb-3 pl-7'}>
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================
// Diagnosis Section - with integrated feedback
// ============================================

interface DiagnosisSectionProps {
  diagnosis: any;
  isPrimary: boolean;
  number: number;
  drugDetails: Record<string, any>;
  drugsPending: string[];
  showBnfLink?: boolean;
  consultationId?: string | null;
  onFeedback?: (type: string, sentiment: 'positive' | 'negative', data: any) => Promise<void>;
  feedbackSubmitted?: Record<string, string>;
}

function DiagnosisSection({ diagnosis, isPrimary, number, drugDetails, drugsPending, showBnfLink = true, consultationId, onFeedback, feedbackSubmitted }: DiagnosisSectionProps) {
  const [isOpen, setIsOpen] = useState(isPrimary); // Only primary expanded by default
  const [isMarkedCorrect, setIsMarkedCorrect] = useState(false);

  const diagnosisName = diagnosis.diagnosis || diagnosis.name || 'Unknown Diagnosis';
  const confidence = diagnosis.confidence;

  const handleMarkCorrect = async () => {
    if (!onFeedback || !consultationId) return;

    const newValue = !isMarkedCorrect;
    setIsMarkedCorrect(newValue);

    await onFeedback('diagnosis', 'positive', {
      component_identifier: `diagnosis_${number}`,
      diagnosis_text: diagnosisName,
      is_correct_diagnosis: newValue,
      confidence: confidence
    });
  };

  return (
    <div className="border-b border-aneya-soft-pink last:border-b-0">
      {/* Diagnosis Header with Integrated Feedback */}
      <div className="w-full flex items-center gap-3 py-4 px-4 hover:bg-aneya-cream/30 transition-colors">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 flex-1"
        >
          <ChevronRight
            className={`w-5 h-5 text-aneya-teal transition-transform duration-200 ${
              isOpen ? 'rotate-90' : ''
            }`}
          />
          <Stethoscope className="w-5 h-5 text-aneya-teal" />
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-aneya-text-secondary uppercase tracking-wide">
                {isPrimary ? 'Primary Diagnosis' : `Diagnosis ${number}`}
              </span>
              {confidence && (
                <ConfidenceBadge confidence={confidence} />
              )}
              {isMarkedCorrect && (
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full border border-green-400">
                  ✓ Correct Diagnosis
                </span>
              )}
            </div>
            <h3 className="text-base font-serif font-semibold text-aneya-navy mt-0.5">
              {diagnosisName}
            </h3>
          </div>
        </button>

        {/* Integrated Feedback Controls */}
        {consultationId && onFeedback && (
          <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleMarkCorrect}
              className={`px-2 py-1 text-xs rounded-md transition-all duration-200 flex items-center gap-1 ${
                isMarkedCorrect
                  ? 'bg-green-100 text-green-700 border border-green-400 font-medium'
                  : 'bg-white text-aneya-navy border border-aneya-soft-pink hover:bg-green-50 hover:border-green-300'
              }`}
            >
              {isMarkedCorrect ? '✓ Correct' : 'Mark Correct'}
            </button>
            <FeedbackButton
              onFeedback={(sentiment) => onFeedback('diagnosis', sentiment, {
                component_identifier: `diagnosis_${number}`,
                diagnosis_text: diagnosisName,
                confidence: confidence
              })}
              size="sm"
              initialSentiment={feedbackSubmitted?.[`diagnosis_${number}`] as 'positive' | 'negative' | null}
            />
          </div>
        )}
      </div>

      {/* Diagnosis Content */}
      {isOpen && (
        <div className="px-4 pb-4 pl-12">
          {/* Source */}
          {diagnosis.source && (
            <p className="text-sm text-aneya-text-secondary mb-4">
              Source: {diagnosis.source}
              {diagnosis.url && (
                <a
                  href={diagnosis.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-aneya-teal hover:underline inline-flex items-center gap-1"
                >
                  View guideline <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </p>
          )}

          {/* Nested collapsible sections */}
          <div className="space-y-0">
            {/* Primary Care / Treatment */}
            {diagnosis.primary_care && (
              <CollapsibleSection
                title="Treatment"
                level={2}
                icon={<Pill className="w-4 h-4" />}
                badge={diagnosis.primary_care.medications?.length || 0}
              >
                <TreatmentContent
                  primaryCare={diagnosis.primary_care}
                  drugDetails={drugDetails}
                  drugsPending={drugsPending}
                  showBnfLink={showBnfLink}
                  consultationId={consultationId}
                  onFeedback={onFeedback}
                  feedbackSubmitted={feedbackSubmitted}
                />
              </CollapsibleSection>
            )}

            {/* Diagnostics */}
            {diagnosis.diagnostics && (
              <CollapsibleSection
                title="Investigations"
                level={2}
                icon={<Activity className="w-4 h-4" />}
                badge={diagnosis.diagnostics.required?.length || 0}
              >
                <DiagnosticsContent diagnostics={diagnosis.diagnostics} />
              </CollapsibleSection>
            )}

            {/* Follow-up */}
            {diagnosis.follow_up && (
              <CollapsibleSection
                title="Follow-up"
                level={2}
                icon={<Calendar className="w-4 h-4" />}
              >
                <FollowUpContent followUp={diagnosis.follow_up} />
              </CollapsibleSection>
            )}

            {/* Escalation Criteria */}
            {diagnosis.primary_care?.when_to_escalate?.length > 0 && (
              <CollapsibleSection
                title="When to Escalate"
                level={2}
                icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
                badge={diagnosis.primary_care.when_to_escalate.length}
              >
                <ul className="space-y-1 text-sm">
                  {diagnosis.primary_care.when_to_escalate.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-aneya-navy">
                      <span className="text-amber-600">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Treatment Content
// ============================================

function TreatmentContent({
  primaryCare,
  drugDetails,
  drugsPending,
  showBnfLink = true,
  consultationId,
  onFeedback,
  feedbackSubmitted
}: {
  primaryCare: any;
  drugDetails: Record<string, any>;
  drugsPending: string[];
  showBnfLink?: boolean;
  consultationId?: string | null;
  onFeedback?: (type: string, sentiment: 'positive' | 'negative', data: any) => Promise<void>;
  feedbackSubmitted?: Record<string, string>;
}) {
  return (
    <div className="space-y-4 text-sm">
      {/* Medications */}
      {primaryCare.medications?.length > 0 && (
        <div>
          <h4 className="font-medium text-aneya-navy mb-2">Medications</h4>
          <div className="space-y-2">
            {primaryCare.medications.map((drug: any, idx: number) => {
              const drugName = typeof drug === 'string' ? drug : drug?.drug_name || String(drug);
              const details = drugDetails[drugName];
              const isPending = drugsPending.includes(drugName);
              return (
                <MedicationItem
                  key={idx}
                  drugName={drugName}
                  details={details}
                  isPending={isPending}
                  showBnfLink={showBnfLink}
                  consultationId={consultationId}
                  onFeedback={onFeedback}
                  feedbackSubmitted={feedbackSubmitted}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Clinical Guidance */}
      {primaryCare.clinical_guidance && (
        <div>
          <h4 className="font-medium text-aneya-navy mb-2">Clinical Guidance</h4>
          <p className="text-aneya-text-secondary whitespace-pre-wrap">{primaryCare.clinical_guidance}</p>
        </div>
      )}

      {/* Supportive Care */}
      {primaryCare.supportive_care?.length > 0 && (
        <div>
          <h4 className="font-medium text-aneya-navy mb-2">Supportive Care</h4>
          <ul className="space-y-1 text-aneya-text-secondary">
            {primaryCare.supportive_care.map((item: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-aneya-teal">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================
// Medication Item (Expandable)
// ============================================

function MedicationItem({
  drugName,
  details,
  isPending,
  showBnfLink = true,
  consultationId,
  onFeedback,
  feedbackSubmitted
}: {
  drugName: string;
  details?: any;
  isPending?: boolean;
  showBnfLink?: boolean;
  consultationId?: string | null;
  onFeedback?: (type: string, sentiment: 'positive' | 'negative', data: any) => Promise<void>;
  feedbackSubmitted?: Record<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasDetails = details?.bnf_data || details?.drugbank_data;
  const isLoading = isPending && !hasDetails;

  return (
    <div className="border border-aneya-soft-pink rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-aneya-cream/30 transition-colors"
        disabled={!hasDetails}
      >
        <ChevronRight
          className={`w-3 h-3 text-aneya-teal transition-transform ${
            isOpen ? 'rotate-90' : ''
          } ${!hasDetails ? 'opacity-0' : ''}`}
        />
        <span className="text-aneya-navy">{drugName}</span>
        {isLoading && (
          <span className="text-xs text-aneya-teal ml-auto flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading BNF data...
          </span>
        )}
        {!isLoading && !hasDetails && (
          <span className="text-xs text-aneya-text-disabled ml-auto">No BNF data</span>
        )}
      </button>
      {isOpen && hasDetails && (
        <div className="px-3 pb-3 pt-1 border-t border-aneya-cream text-xs space-y-2 bg-aneya-cream/20">
          {details.bnf_data?.dosage && (
            <div>
              <span className="font-medium text-aneya-navy">Dosage:</span>
              <p className="text-aneya-text-secondary mt-0.5">{details.bnf_data.dosage}</p>
            </div>
          )}
          {details.bnf_data?.side_effects && (
            <div>
              <span className="font-medium text-aneya-navy">Side Effects:</span>
              <p className="text-aneya-text-secondary mt-0.5">{details.bnf_data.side_effects}</p>
            </div>
          )}
          {details.bnf_data?.interactions && (
            <div>
              <span className="font-medium text-aneya-navy">Interactions:</span>
              <p className="text-aneya-text-secondary mt-0.5">{details.bnf_data.interactions}</p>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            {showBnfLink && details.url && (
              <a
                href={details.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-aneya-teal hover:underline inline-flex items-center gap-1"
              >
                View on BNF <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {consultationId && onFeedback && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-aneya-text-secondary">Helpful?</span>
                <FeedbackButton
                  onFeedback={(sentiment) => onFeedback('drug_recommendation', sentiment, {
                    component_identifier: `drug_${drugName.toLowerCase().replace(/\s+/g, '_')}`,
                    drug_name: drugName,
                    drug_dosage: details?.bnf_data?.dosage
                  })}
                  size="sm"
                  initialSentiment={feedbackSubmitted?.[`drug_${drugName.toLowerCase().replace(/\s+/g, '_')}`] as 'positive' | 'negative' | null}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Diagnostics Content
// ============================================

function DiagnosticsContent({ diagnostics }: { diagnostics: any }) {
  return (
    <div className="space-y-4 text-sm">
      {diagnostics.required?.length > 0 && (
        <div>
          <h4 className="font-medium text-aneya-navy mb-2">Required Investigations</h4>
          <ul className="space-y-1 text-aneya-text-secondary">
            {diagnostics.required.map((item: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-aneya-teal">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {diagnostics.monitoring?.length > 0 && (
        <div>
          <h4 className="font-medium text-aneya-navy mb-2">Monitoring</h4>
          <ul className="space-y-1 text-aneya-text-secondary">
            {diagnostics.monitoring.map((item: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-aneya-teal">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================
// Follow-up Content
// ============================================

function FollowUpContent({ followUp }: { followUp: any }) {
  return (
    <div className="space-y-3 text-sm">
      {followUp.timeframe && (
        <p className="text-aneya-navy">
          <span className="font-medium">Timeframe:</span>{' '}
          <span className="text-aneya-text-secondary">{followUp.timeframe}</span>
        </p>
      )}
      {followUp.monitoring?.length > 0 && (
        <div>
          <h4 className="font-medium text-aneya-navy mb-2">Monitoring</h4>
          <ul className="space-y-1 text-aneya-text-secondary">
            {followUp.monitoring.map((item: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-aneya-teal">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {followUp.referral_criteria?.length > 0 && (
        <div>
          <h4 className="font-medium text-aneya-navy mb-2">Referral Criteria</h4>
          <ul className="space-y-1 text-aneya-text-secondary">
            {followUp.referral_criteria.map((item: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-aneya-teal">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================
// Confidence Badge
// ============================================

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    high: 'bg-aneya-teal/10 text-aneya-teal border-aneya-teal/30',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-red-50 text-red-700 border-red-200',
  };
  const colorClass = colors[confidence.toLowerCase()] || 'bg-aneya-cream text-aneya-text-secondary border-aneya-soft-pink';

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colorClass}`}>
      {confidence}
    </span>
  );
}

// ============================================
// Resource Link
// ============================================

function ResourceLink({ title, url }: { title: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-aneya-navy hover:text-aneya-teal transition-colors"
    >
      <ExternalLink className="w-3 h-3 flex-shrink-0 text-aneya-teal" />
      <span className="hover:underline">{title}</span>
    </a>
  );
}
