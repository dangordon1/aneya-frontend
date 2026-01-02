import { useState, useEffect } from 'react';
import { ProgressiveWizard, WizardStep } from '../ProgressiveWizard';
import { useOBGynForms } from '../../hooks/useOBGynForms';
import { useFormAutoFill, applyFieldUpdatesToState, getAutoFillFieldClasses } from '../../hooks/useFormAutoFill';
import { consultationEventBus } from '../../lib/consultationEventBus';
import type {
  OBGynConsultationForm,
  VitalSigns,
  PhysicalExamFindings,
  UltrasoundFindings,
  LabResults,
} from '../../types/database';

interface OBGynDuringConsultationFormProps {
  patientId: string;
  appointmentId?: string;
  preConsultationFormId?: string;
  onComplete?: () => void;
  displayMode?: 'wizard' | 'flat';
}

export function OBGynDuringConsultationForm({
  patientId,
  appointmentId,
  preConsultationFormId,
  onComplete,
  displayMode = 'wizard',
}: OBGynDuringConsultationFormProps) {
  const { createForm, updateForm, getFormByAppointment, getFormByPatient } = useOBGynForms(patientId);

  // State management
  const [currentForm, setCurrentForm] = useState<OBGynConsultationForm | null>(null);
  const [preConsultationData, setPreConsultationData] = useState<OBGynConsultationForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Vital signs state
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    systolic_bp: undefined,
    diastolic_bp: undefined,
    heart_rate: undefined,
    temperature: undefined,
  });

  // Physical exam findings state
  const [physicalExamFindings, setPhysicalExamFindings] = useState<PhysicalExamFindings>({});

  // Ultrasound findings state
  const [ultrasoundFindings, setUltrasoundFindings] = useState<UltrasoundFindings>({});

  // Lab results state
  const [labResults, setLabResults] = useState<LabResults>({});

  // Clinical impression state
  const [clinicalImpression, setClinicalImpression] = useState({
    diagnosis: '',
    treatment_plan: '',
    medications: '',
    follow_up_date: '',
  });

  // Pregnancy status (from pre-consultation or form)
  const [pregnancyStatus, setPregnancyStatus] = useState<string>('unknown');

  // Auto-fill hook for real-time field extraction
  const { processTranscriptChunk, markManualOverride, autoFilledFields } = useFormAutoFill({
    formType: 'obgyn',
    patientContext: {
      patient_id: patientId,
    },
    currentFormState: {
      vital_signs: vitalSigns,
      physical_exam_findings: physicalExamFindings,
      ultrasound_findings: ultrasoundFindings,
      lab_results: labResults,
      diagnosis: clinicalImpression.diagnosis,
      treatment_plan: clinicalImpression.treatment_plan,
      medications: clinicalImpression.medications,
    },
    onFieldsUpdated: (updates) => {
      console.log(`🔄 Auto-filling ${Object.keys(updates.field_updates).length} fields`);

      // Apply field updates to state
      const updatedState = applyFieldUpdatesToState(
        {
          vital_signs: vitalSigns,
          physical_exam_findings: physicalExamFindings,
          ultrasound_findings: ultrasoundFindings,
          lab_results: labResults,
          diagnosis: clinicalImpression.diagnosis,
          treatment_plan: clinicalImpression.treatment_plan,
          medications: clinicalImpression.medications,
        },
        updates.field_updates
      );

      // Update state with new values
      if (updatedState.vital_signs) setVitalSigns(updatedState.vital_signs);
      if (updatedState.physical_exam_findings) setPhysicalExamFindings(updatedState.physical_exam_findings);
      if (updatedState.ultrasound_findings) setUltrasoundFindings(updatedState.ultrasound_findings);
      if (updatedState.lab_results) setLabResults(updatedState.lab_results);

      // Update clinical impression if any of these fields changed
      if (
        updatedState.diagnosis !== clinicalImpression.diagnosis ||
        updatedState.treatment_plan !== clinicalImpression.treatment_plan ||
        updatedState.medications !== clinicalImpression.medications
      ) {
        setClinicalImpression({
          ...clinicalImpression,
          diagnosis: updatedState.diagnosis || clinicalImpression.diagnosis,
          treatment_plan: updatedState.treatment_plan || clinicalImpression.treatment_plan,
          medications: updatedState.medications || clinicalImpression.medications,
        });
      }

      // Trigger auto-save with the current step (use 1 as default for auto-fill)
      handleAutoSave(1);
    },
  });

  // Subscribe to diarization events for auto-fill
  useEffect(() => {
    console.log(`🔔 OBGyn Form: Subscribing to diarization events for patientId=${patientId}`);

    const subscription = consultationEventBus.subscribe('diarization_chunk_complete', (event) => {
      console.log(`🔔 OBGyn Form: Received event`, {
        event_form_type: event.form_type,
        event_patient_id: event.patient_id,
        this_patient_id: patientId,
        form_type_match: event.form_type === 'obgyn',
        patient_id_match: event.patient_id === patientId,
        has_field_updates: !!event.field_updates && Object.keys(event.field_updates).length > 0,
        will_process: event.form_type === 'obgyn' && event.patient_id === patientId
      });

      // Only process if this is an obgyn form
      if (event.form_type === 'obgyn' && event.patient_id === patientId) {
        console.log(`✅ OBGyn Form: Processing chunk #${event.chunk_index}`);

        // NEW: Directly apply field updates from backend if available
        if (event.field_updates && Object.keys(event.field_updates).length > 0) {
          console.log(`📝 Applying ${Object.keys(event.field_updates).length} field updates from backend:`, event.field_updates);
          processTranscriptChunk(event.field_updates, event.chunk_index);
        } else {
          // Fallback: Process segments if no field_updates provided
          console.log(`⚠️  No field_updates in event, falling back to segment processing`);
          processTranscriptChunk(event.segments, event.chunk_index);
        }
      } else {
        console.log(`⏭️  OBGyn Form: Skipping event (form_type=${event.form_type}, patient_id match=${event.patient_id === patientId})`);
      }
    });

    return () => {
      console.log(`🔕 OBGyn Form: Unsubscribing from diarization events`);
      subscription.unsubscribe();
    };
  }, [processTranscriptChunk, patientId]);

  // Initialize form on mount
  useEffect(() => {
    const initializeForm = async () => {
      setIsLoading(true);
      try {
        // Try to find existing during-consultation form
        if (appointmentId) {
          const existingForm = getFormByAppointment(appointmentId);
          if (existingForm && existingForm.form_type === 'during_consultation') {
            setCurrentForm(existingForm);
            populateFormState(existingForm);
            setIsLoading(false);
            return;
          }
        }

        // Look for pre-consultation form to pre-populate
        // First try by preConsultationFormId if provided, otherwise find by appointmentId
        const preForms = getFormByPatient(patientId, 'pre_consultation');
        let preForm: typeof preForms[0] | undefined;

        if (preConsultationFormId) {
          preForm = preForms.find(f => f.id === preConsultationFormId);
        } else if (appointmentId) {
          preForm = preForms.find(f => f.appointment_id === appointmentId);
        }

        if (preForm) {
          setPreConsultationData(preForm);
          setPregnancyStatus(preForm.pregnancy_status || 'unknown');
          populateFormState(preForm);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing form:', error);
        setIsLoading(false);
      }
    };

    initializeForm();
  }, [patientId, appointmentId, preConsultationFormId]);

  const populateFormState = (form: OBGynConsultationForm) => {
    if (form.vital_signs) setVitalSigns(form.vital_signs);
    if (form.physical_exam_findings) setPhysicalExamFindings(form.physical_exam_findings);
    if (form.ultrasound_findings) setUltrasoundFindings(form.ultrasound_findings);
    if (form.lab_results) setLabResults(form.lab_results);
    if (form.pregnancy_status) setPregnancyStatus(form.pregnancy_status);

    setClinicalImpression({
      diagnosis: form.diagnosis || form.clinical_diagnosis || '',
      treatment_plan: form.treatment_plan || '',
      medications: form.medications || form.medications_prescribed || '',
      follow_up_date: form.follow_up_date || '',
    });
  };

  const handleAutoSave = async (stepIndex: number) => {
    if (!currentForm && !appointmentId) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const updateData = {
        vital_signs: vitalSigns,
        physical_exam_findings: physicalExamFindings,
        ultrasound_findings: ultrasoundFindings,
        lab_results: labResults,
        diagnosis: clinicalImpression.diagnosis,
        treatment_plan: clinicalImpression.treatment_plan,
        medications: clinicalImpression.medications,
        follow_up_date: clinicalImpression.follow_up_date,
        status: 'partial' as const,
        form_type: 'during_consultation' as const,
      };

      if (currentForm) {
        // Update existing form
        const updated = await updateForm(currentForm.id, updateData);
        if (updated) {
          setCurrentForm(updated);
          console.log(`✅ Auto-saved during-consultation form (step ${stepIndex + 1})`);
        }
      } else {
        // Create new form if it doesn't exist
        const created = await createForm(patientId, {
          appointment_id: appointmentId || null,
          ...updateData,
        });
        if (created) {
          setCurrentForm(created);
          console.log(`✅ Created and saved during-consultation form`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save form';
      setSaveError(errorMsg);
      console.error('Error saving form:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteForm = async () => {
    if (!currentForm) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const completed = await updateForm(currentForm.id, {
        vital_signs: vitalSigns,
        physical_exam_findings: physicalExamFindings,
        ultrasound_findings: ultrasoundFindings,
        lab_results: labResults,
        diagnosis: clinicalImpression.diagnosis,
        treatment_plan: clinicalImpression.treatment_plan,
        medications: clinicalImpression.medications,
        follow_up_date: clinicalImpression.follow_up_date,
        status: 'completed',
      });

      if (completed) {
        setCurrentForm(completed);
        console.log('✅ During-consultation form completed');
        onComplete?.();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to complete form';
      setSaveError(errorMsg);
      console.error('Error completing form:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-[20px] p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-aneya-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-aneya-navy">Loading consultation form...</p>
        </div>
      </div>
    );
  }

  const steps: WizardStep[] = [
    {
      title: 'Consultation Review',
      content: <PreConsultationReview data={preConsultationData} />,
    },
    {
      title: 'Vital Signs',
      content: (
        <VitalSignsSection
          vitalSigns={vitalSigns}
          onChange={setVitalSigns}
          autoFilledFields={autoFilledFields}
          onManualOverride={markManualOverride}
        />
      ),
      validate: () => validateVitalSigns(vitalSigns),
    },
    {
      title: 'Physical Examination',
      content: (
        <PhysicalExaminationSection
          findings={physicalExamFindings}
          onChange={setPhysicalExamFindings}
        />
      ),
    },
    ...(pregnancyStatus === 'pregnant'
      ? [
          {
            title: 'Ultrasound Findings',
            content: (
              <UltrasoundFindingsSection
                findings={ultrasoundFindings}
                onChange={setUltrasoundFindings}
              />
            ),
          } as WizardStep,
        ]
      : []),
    {
      title: 'Lab Results',
      content: (
        <LabResultsSection
          results={labResults}
          onChange={setLabResults}
        />
      ),
    },
    {
      title: 'Clinical Impression & Plan',
      content: (
        <ClinicalImpressionSection
          impression={clinicalImpression}
          onChange={setClinicalImpression}
        />
      ),
      validate: () => validateClinicalImpression(clinicalImpression),
    },
  ];

  return (
    <div className="w-full">
      {saveError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-[10px]">
          <p className="text-[14px] text-red-700">{saveError}</p>
        </div>
      )}

      <ProgressiveWizard
        steps={steps}
        onAutoSave={handleAutoSave}
        onComplete={handleCompleteForm}
        displayMode={displayMode}
        showProgressBar={displayMode === 'wizard'}
        showStepNumbers={displayMode === 'wizard'}
      />
    </div>
  );
}

// ============================================
// Section Components
// ============================================

interface PreConsultationReviewProps {
  data: OBGynConsultationForm | null;
}

function PreConsultationReview({ data }: PreConsultationReviewProps) {
  if (!data) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-[10px]">
        <p className="text-[14px] text-amber-800">
          No previous consultation data found. Beginning fresh consultation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-[10px]">
        <h3 className="text-[14px] font-semibold text-blue-900 mb-3">
          Previous Consultation Summary (Read-Only)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Chief Complaint */}
          {data.chief_complaint && (
            <div>
              <label className="text-[12px] text-gray-600 font-medium">Chief Complaint</label>
              <p className="text-[14px] text-aneya-navy mt-1">{data.chief_complaint}</p>
            </div>
          )}

          {/* Pregnancy Status */}
          <div>
            <label className="text-[12px] text-gray-600 font-medium">Pregnancy Status</label>
            <p className="text-[14px] text-aneya-navy mt-1 capitalize">
              {data.pregnancy_status?.replace(/_/g, ' ') || 'Unknown'}
            </p>
          </div>

          {/* Menstrual History */}
          {data.cycle_regularity && (
            <div>
              <label className="text-[12px] text-gray-600 font-medium">Menstrual Regularity</label>
              <p className="text-[14px] text-aneya-navy mt-1 capitalize">
                {data.cycle_regularity?.replace(/_/g, ' ')}
              </p>
            </div>
          )}

          {/* LMP */}
          {data.last_menstrual_period && (
            <div>
              <label className="text-[12px] text-gray-600 font-medium">Last Menstrual Period</label>
              <p className="text-[14px] text-aneya-navy mt-1">{data.last_menstrual_period}</p>
            </div>
          )}

          {/* Current Medications */}
          {data.contraception_status && (
            <div>
              <label className="text-[12px] text-gray-600 font-medium">Contraception</label>
              <p className="text-[14px] text-aneya-navy mt-1 capitalize">
                {data.contraception_status?.replace(/_/g, ' ')}
              </p>
            </div>
          )}

          {/* Symptoms Description */}
          {data.symptoms_description && (
            <div className="sm:col-span-2">
              <label className="text-[12px] text-gray-600 font-medium">Symptoms</label>
              <p className="text-[14px] text-aneya-navy mt-1">{data.symptoms_description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface VitalSignsSectionProps {
  vitalSigns: VitalSigns;
  onChange: (signs: VitalSigns) => void;
  autoFilledFields?: Set<string>;
  onManualOverride?: (fieldPath: string) => void;
}

function VitalSignsSection({ vitalSigns, onChange, autoFilledFields, onManualOverride }: VitalSignsSectionProps) {
  const updateField = (key: keyof VitalSigns, value: string) => {
    // Mark as manual override when user edits
    onManualOverride?.(`vital_signs.${key}`);

    const numValue = value === '' ? undefined : parseFloat(value);
    onChange({ ...vitalSigns, [key]: numValue });
  };

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-gray-600 mb-4">
        Record vital signs measurements taken during examination.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Blood Pressure */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Systolic BP (mmHg)
            {autoFilledFields?.has('vital_signs.systolic_bp') && (
              <span className="ml-2 text-[11px] text-blue-600 font-normal">● Auto-filled</span>
            )}
          </label>
          <input
            type="number"
            value={vitalSigns.systolic_bp ?? ''}
            onChange={(e) => updateField('systolic_bp', e.target.value)}
            min="0"
            max="250"
            className={getAutoFillFieldClasses(
              'vital_signs.systolic_bp',
              autoFilledFields || new Set(),
              'w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px]'
            )}
            placeholder="e.g., 120"
          />
        </div>

        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Diastolic BP (mmHg)
            {autoFilledFields?.has('vital_signs.diastolic_bp') && (
              <span className="ml-2 text-[11px] text-blue-600 font-normal">● Auto-filled</span>
            )}
          </label>
          <input
            type="number"
            value={vitalSigns.diastolic_bp ?? ''}
            onChange={(e) => updateField('diastolic_bp', e.target.value)}
            min="0"
            max="150"
            className={getAutoFillFieldClasses(
              'vital_signs.diastolic_bp',
              autoFilledFields || new Set(),
              'w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px]'
            )}
            placeholder="e.g., 80"
          />
        </div>

        {/* Heart Rate */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Heart Rate (bpm)
          </label>
          <input
            type="number"
            value={vitalSigns.heart_rate ?? ''}
            onChange={(e) => updateField('heart_rate', e.target.value)}
            min="0"
            max="200"
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px]"
            placeholder="e.g., 72"
          />
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Temperature (°C)
          </label>
          <input
            type="number"
            value={vitalSigns.temperature ?? ''}
            onChange={(e) => updateField('temperature', e.target.value)}
            step="0.1"
            min="35"
            max="42"
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px]"
            placeholder="e.g., 37.0"
          />
        </div>

        {/* Respiratory Rate */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Respiratory Rate (breaths/min)
          </label>
          <input
            type="number"
            value={vitalSigns.respiratory_rate ?? ''}
            onChange={(e) => updateField('respiratory_rate', e.target.value)}
            min="0"
            max="50"
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px]"
            placeholder="e.g., 16"
          />
        </div>

        {/* SpO2 */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            SpO2 (%)
          </label>
          <input
            type="number"
            value={vitalSigns.spo2 ?? ''}
            onChange={(e) => updateField('spo2', e.target.value)}
            min="0"
            max="100"
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px]"
            placeholder="e.g., 98"
          />
        </div>
      </div>
    </div>
  );
}

interface PhysicalExaminationSectionProps {
  findings: PhysicalExamFindings;
  onChange: (findings: PhysicalExamFindings) => void;
}

function PhysicalExaminationSection({ findings, onChange }: PhysicalExaminationSectionProps) {
  const updateField = (key: string, value: string) => {
    onChange({ ...findings, [key]: value });
  };

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-gray-600 mb-4">
        Document physical examination findings relevant to OB/GYN assessment.
      </p>

      <div className="space-y-4">
        {/* General Inspection */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            General Inspection
          </label>
          <textarea
            value={findings.general_inspection || ''}
            onChange={(e) => updateField('general_inspection', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., Alert and oriented, no distress..."
          />
        </div>

        {/* Abdominal Examination */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Abdominal Examination
          </label>
          <textarea
            value={findings.abdominal_exam || ''}
            onChange={(e) => updateField('abdominal_exam', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., Soft, non-tender, fundal height..."
          />
        </div>

        {/* Speculum Examination */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Speculum Examination
          </label>
          <textarea
            value={findings.speculum_exam || ''}
            onChange={(e) => updateField('speculum_exam', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., Cervix pink, no discharge..."
          />
        </div>

        {/* Digital/Bimanual Examination */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Digital/Bimanual Examination
          </label>
          <textarea
            value={findings.digital_exam || ''}
            onChange={(e) => updateField('digital_exam', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., Cervix dilated 2cm, anterior position..."
          />
        </div>

        {/* Palpation Findings */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Other Findings (Palpation, Masses, etc.)
          </label>
          <textarea
            value={findings.other_findings || ''}
            onChange={(e) => updateField('other_findings', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., No palpable masses, ovaries..."
          />
        </div>
      </div>
    </div>
  );
}

interface UltrasoundFindingsSectionProps {
  findings: UltrasoundFindings;
  onChange: (findings: UltrasoundFindings) => void;
}

function UltrasoundFindingsSection({ findings, onChange }: UltrasoundFindingsSectionProps) {
  const updateField = (key: string, value: string) => {
    onChange({ ...findings, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-aneya-teal/10 border border-aneya-teal rounded-[10px]">
        <h3 className="text-[14px] font-semibold text-aneya-navy mb-2">
          Pregnancy Ultrasound Findings
        </h3>
        <p className="text-[13px] text-gray-600">
          Document relevant ultrasound measurements and observations.
        </p>
      </div>

      <div className="space-y-4">
        {/* Fetal Biometry */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Fetal Biometry (Crown-Rump Length, Biparietal Diameter, etc.)
          </label>
          <textarea
            value={findings.fetal_biometry || ''}
            onChange={(e) => updateField('fetal_biometry', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., CRL: 12.5cm, Estimated EGA: 13+2 weeks..."
          />
        </div>

        {/* Fetal Well-being */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Fetal Well-being (Heart Rate, Movements, etc.)
          </label>
          <textarea
            value={findings.fetal_wellbeing || ''}
            onChange={(e) => updateField('fetal_wellbeing', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., FHR: 155bpm, Good movements noted..."
          />
        </div>

        {/* Placental Findings */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Placental Findings
          </label>
          <textarea
            value={findings.placental_findings || ''}
            onChange={(e) => updateField('placental_findings', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., Anterior placenta, normal appearance..."
          />
        </div>

        {/* Amniotic Fluid */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Amniotic Fluid Volume
          </label>
          <textarea
            value={findings.amniotic_fluid || ''}
            onChange={(e) => updateField('amniotic_fluid', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., Adequate, Normal AFI: 12cm..."
          />
        </div>

        {/* Anomalies/Concerns */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Anomalies or Areas of Concern
          </label>
          <textarea
            value={findings.anomalies_concerns || ''}
            onChange={(e) => updateField('anomalies_concerns', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., None noted / Specify if any concerns..."
          />
        </div>
      </div>
    </div>
  );
}

interface LabResultsSectionProps {
  results: LabResults;
  onChange: (results: LabResults) => void;
}

function LabResultsSection({ results, onChange }: LabResultsSectionProps) {
  const updateField = (key: string, value: string) => {
    onChange({ ...results, [key]: value });
  };

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-gray-600 mb-4">
        Record laboratory test results if available.
      </p>

      <div className="space-y-4">
        {/* Full Blood Count */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Full Blood Count (FBC)
          </label>
          <textarea
            value={results.fbc || ''}
            onChange={(e) => updateField('fbc', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., Hb: 12.5 g/dL, WBC: 7.5, Plt: 250..."
          />
        </div>

        {/* Coagulation Profile */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Coagulation Profile (PT/INR, APTT)
          </label>
          <textarea
            value={results.coagulation || ''}
            onChange={(e) => updateField('coagulation', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., PT: 12s, APTT: 30s..."
          />
        </div>

        {/* Blood Glucose */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Blood Glucose / HbA1c
          </label>
          <textarea
            value={results.glucose || ''}
            onChange={(e) => updateField('glucose', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., Fasting glucose: 95 mg/dL..."
          />
        </div>

        {/* Serology/STI Tests */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Serology / STI Tests
          </label>
          <textarea
            value={results.serology || ''}
            onChange={(e) => updateField('serology', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., HIV: Negative, Syphilis: Negative..."
          />
        </div>

        {/* Pregnancy Tests */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Pregnancy-Related Tests (hCG, AFP, etc.)
          </label>
          <textarea
            value={results.pregnancy_tests || ''}
            onChange={(e) => updateField('pregnancy_tests', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., hCG: 50,000 mIU/mL, AFP: Normal..."
          />
        </div>

        {/* Other Tests */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Other Relevant Tests
          </label>
          <textarea
            value={results.other_tests || ''}
            onChange={(e) => updateField('other_tests', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., Thyroid function, Liver function, Renal function..."
          />
        </div>
      </div>
    </div>
  );
}

interface ClinicalImpressionSectionProps {
  impression: {
    diagnosis: string;
    treatment_plan: string;
    medications: string;
    follow_up_date: string;
  };
  onChange: (impression: {
    diagnosis: string;
    treatment_plan: string;
    medications: string;
    follow_up_date: string;
  }) => void;
}

function ClinicalImpressionSection({ impression, onChange }: ClinicalImpressionSectionProps) {
  const updateField = (key: string, value: string) => {
    onChange({ ...impression, [key]: value });
  };

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-gray-600 mb-4">
        Document clinical impression, diagnosis, and treatment plan.
      </p>

      <div className="space-y-4">
        {/* Diagnosis */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Clinical Diagnosis *
          </label>
          <textarea
            value={impression.diagnosis}
            onChange={(e) => updateField('diagnosis', e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., Intrauterine pregnancy at 13 weeks gestation with normal biometry..."
          />
          <p className="text-[12px] text-gray-500 mt-1">Required field</p>
        </div>

        {/* Treatment Plan */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Treatment Plan *
          </label>
          <textarea
            value={impression.treatment_plan}
            onChange={(e) => updateField('treatment_plan', e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., Vitamin supplementation, dietary advice, activity recommendations..."
          />
          <p className="text-[12px] text-gray-500 mt-1">Required field</p>
        </div>

        {/* Medications */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Medications Prescribed
          </label>
          <textarea
            value={impression.medications}
            onChange={(e) => updateField('medications', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px] resize-none"
            placeholder="e.g., Prenatal vitamins, Iron supplement, etc. Include dosage and duration..."
          />
        </div>

        {/* Follow-up Date */}
        <div>
          <label className="block text-[14px] font-medium text-aneya-navy mb-2">
            Follow-up Appointment Date
          </label>
          <input
            type="date"
            value={impression.follow_up_date}
            onChange={(e) => updateField('follow_up_date', e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-[10px] focus:outline-none focus:border-aneya-teal text-[14px]"
          />
          <p className="text-[12px] text-gray-500 mt-1">Recommended follow-up date for next consultation</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Validation Functions
// ============================================

function validateVitalSigns(signs: VitalSigns): boolean {
  // At least systolic BP and heart rate should be present
  return !!(
    (signs.systolic_bp !== undefined && signs.systolic_bp !== null) ||
    (signs.heart_rate !== undefined && signs.heart_rate !== null)
  );
}

function validateClinicalImpression(impression: {
  diagnosis: string;
  treatment_plan: string;
  medications?: string;
  follow_up_date?: string;
}): boolean {
  return !!(
    impression.diagnosis.trim() &&
    impression.treatment_plan.trim()
  );
}
