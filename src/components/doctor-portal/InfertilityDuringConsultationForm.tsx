import { useState, useEffect } from 'react';
import { useInfertilityForms } from '../../hooks/useInfertilityForms';
import { useFormAutoFill, applyFieldUpdatesToState, getAutoFillFieldClasses } from '../../hooks/useFormAutoFill';
import { consultationEventBus } from '../../lib/consultationEventBus';
import { Checkbox } from '../common';
import {
  InfertilityFormData,
  UpdateInfertilityFormInput,
} from '../../types/database';

interface InfertilityDuringConsultationFormProps {
  patientId: string;
  appointmentId: string;
  onComplete?: () => void;
  onBack?: () => void;
  filledBy?: 'patient' | 'doctor';
  doctorUserId?: string;
}

export function InfertilityDuringConsultationForm({
  patientId,
  appointmentId,
  onComplete,
  filledBy = 'doctor',
  doctorUserId,
}: InfertilityDuringConsultationFormProps) {
  const { createForm, updateForm, getFormByAppointment } = useInfertilityForms(patientId);
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<InfertilityFormData>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Auto-fill hook for real-time field extraction
  const { processTranscriptChunk, markManualOverride, autoFilledFields } = useFormAutoFill({
    formType: 'infertility',
    patientContext: {
      patient_id: patientId,
    },
    currentFormState: formData,
    onFieldsUpdated: (updates) => {
      console.log(`🔄 Auto-filling ${Object.keys(updates.field_updates).length} infertility form fields`);

      // Apply field updates to current form state
      const updatedState = applyFieldUpdatesToState(formData, updates.field_updates);

      // Update form data
      setFormData(updatedState);
    },
  });

  // Subscribe to diarization events for auto-fill
  useEffect(() => {
    console.log(`🔔 Infertility Form: Subscribing to diarization events for patientId=${patientId}`);

    const subscription = consultationEventBus.subscribe('diarization_chunk_complete', (event) => {
      console.log(`🔔 Infertility Form: Received event`, {
        event_form_type: event.form_type,
        event_patient_id: event.patient_id,
        this_patient_id: patientId,
        form_type_match: event.form_type === 'infertility',
        patient_id_match: event.patient_id === patientId,
        has_field_updates: !!event.field_updates && Object.keys(event.field_updates).length > 0,
        will_process: event.form_type === 'infertility' && event.patient_id === patientId
      });

      // Only process if this is an infertility form
      if (event.form_type === 'infertility' && event.patient_id === patientId) {
        console.log(`✅ Infertility Form: Processing chunk #${event.chunk_index}`);

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
        console.log(`⏭️  Infertility Form: Skipping event (form_type=${event.form_type}, patient_id match=${event.patient_id === patientId})`);
      }
    });

    return () => {
      console.log(`🔕 Infertility Form: Unsubscribing from diarization events`);
      subscription.unsubscribe();
    };
  }, [processTranscriptChunk, patientId]);

  // Load existing form if it exists
  useEffect(() => {
    const existingForm = getFormByAppointment(appointmentId);
    if (existingForm) {
      setCurrentFormId(existingForm.id);
      setFormData(existingForm.infertility_data || {});
    }
  }, [appointmentId, getFormByAppointment]);

  // Auto-save on form data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentFormId && Object.keys(formData).length > 0) {
        handleAutoSave();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, currentFormId]);

  const handleAutoSave = async () => {
    if (!currentFormId) {
      const newForm = await createForm(patientId, {
        patient_id: patientId,
        appointment_id: appointmentId,
        form_type: 'during_consultation',
        status: 'partial',
        filled_by: filledBy === 'doctor' ? doctorUserId || null : null,
        infertility_data: formData,
      });
      if (newForm) {
        setCurrentFormId(newForm.id);
      }
    } else {
      const updateData: UpdateInfertilityFormInput = {
        status: 'partial',
        infertility_data: formData,
      };
      await updateForm(currentFormId, updateData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      if (!currentFormId) {
        await createForm(patientId, {
          patient_id: patientId,
          appointment_id: appointmentId,
          form_type: 'during_consultation',
          status: 'completed',
          filled_by: filledBy === 'doctor' ? doctorUserId || null : null,
          infertility_data: formData,
        });
      } else {
        await updateForm(currentFormId, {
          status: 'completed',
          infertility_data: formData,
        });
      }

      onComplete?.();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Information & Menstrual History */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Basic Information & Menstrual History
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  INFERTILITY TYPE <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.infertility_type || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, infertility_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                >
                  <option value="">Select type</option>
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration of Marriage (years)
                  {autoFilledFields.has('infertility_duration') && (
                    <span className="ml-2 text-[11px] text-blue-600 font-normal">● Auto-filled</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.duration_of_marriage ?? ''}
                  onChange={(e) => {
                    markManualOverride('infertility_duration');
                    setFormData(prev => ({ ...prev, duration_of_marriage: e.target.value }));
                  }}
                  className={getAutoFillFieldClasses(
                    'infertility_duration',
                    autoFilledFields,
                    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent'
                  )}
                  placeholder="e.g., 3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consanguinity
                </label>
                <select
                  value={formData.consanguinity || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, consanguinity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraception Used
                </label>
                <input
                  type="text"
                  value={formData.contraception_used || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, contraception_used: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Type of contraception"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LMP (Last Menstrual Period)
                </label>
                <input
                  type="date"
                  value={formData.lmp || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, lmp: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration of Attempting Pregnancy (years)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.duration_attempting_pregnancy ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_attempting_pregnancy: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="e.g., 2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Menstrual Cycle
                </label>
                <select
                  value={formData.menstrual_cycle || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, menstrual_cycle: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="regular">Regular</option>
                  <option value="irregular">Irregular</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration of Flow (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={formData.duration_of_flow ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_of_flow: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="e.g., 5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dysmenorrhoea
                </label>
                <select
                  value={formData.dysmenorrhoea || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, dysmenorrhoea: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Complaints */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Complaints
          </h2>
          <div className="space-y-3">
            <Checkbox
              label="Impotence"
              checked={formData.complaints?.impotence || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                complaints: { ...prev.complaints, impotence: e.target.checked }
              }))}
            />
            <Checkbox
              label="Apareunia"
              checked={formData.complaints?.apareunia || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                complaints: { ...prev.complaints, apareunia: e.target.checked }
              }))}
            />
            <Checkbox
              label="Premature Ejaculation"
              checked={formData.complaints?.premature_ejaculation || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                complaints: { ...prev.complaints, premature_ejaculation: e.target.checked }
              }))}
            />
            <Checkbox
              label="Retrograde Ejaculation"
              checked={formData.complaints?.retrograde_ejaculation || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                complaints: { ...prev.complaints, retrograde_ejaculation: e.target.checked }
              }))}
            />
            <Checkbox
              label="Vaginismus"
              checked={formData.complaints?.vaginismus || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                complaints: { ...prev.complaints, vaginismus: e.target.checked }
              }))}
            />
            <Checkbox
              label="Dyspareunia (Painful Intercourse)"
              checked={formData.complaints?.dyspareunia || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                complaints: { ...prev.complaints, dyspareunia: e.target.checked }
              }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Others (specify)
              </label>
              <input
                type="text"
                value={formData.complaints?.others || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  complaints: { ...prev.complaints, others: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Other complaints..."
              />
            </div>
          </div>
        </div>

        {/* Section 3: Obstetric History */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Obstetric History
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gravida (G)
              </label>
              <input
                type="number"
                min="0"
                value={formData.obstetric_history?.gravida ?? ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  obstetric_history: { ...prev.obstetric_history, gravida: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Total pregnancies"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Para (P)
              </label>
              <input
                type="number"
                min="0"
                value={formData.obstetric_history?.para ?? ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  obstetric_history: { ...prev.obstetric_history, para: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Deliveries"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Live births (L)
              </label>
              <input
                type="number"
                min="0"
                value={formData.obstetric_history?.live_births ?? ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  obstetric_history: { ...prev.obstetric_history, live_births: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Living children"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Abortions (A)
              </label>
              <input
                type="number"
                min="0"
                value={formData.obstetric_history?.abortions ?? ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  obstetric_history: { ...prev.obstetric_history, abortions: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Miscarriages/abortions"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deaths (D)
              </label>
              <input
                type="number"
                min="0"
                value={formData.obstetric_history?.deaths ?? ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  obstetric_history: { ...prev.obstetric_history, deaths: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Child deaths"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Previous Obstetric History Details
            </label>
            <textarea
              value={formData.previous_obstetric_history || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, previous_obstetric_history: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
              placeholder="Details of previous pregnancies, deliveries, complications..."
            />
          </div>
        </div>

        {/* Section 4: Past Medical History & Treatment History */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Past Medical History & Treatment
          </h2>
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h4 className="font-medium text-blue-900 text-sm mb-3">PAST MEDICAL HISTORY</h4>
              <div className="space-y-2">
                <Checkbox
                  label="Diabetes"
                  checked={formData.medical_history?.diabetes || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, diabetes: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Hypertension"
                  checked={formData.medical_history?.hypertension || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, hypertension: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Thyroid"
                  checked={formData.medical_history?.thyroid || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, thyroid: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Asthma"
                  checked={formData.medical_history?.asthma || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, asthma: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Tuberculosis"
                  checked={formData.medical_history?.tuberculosis || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, tuberculosis: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Cancer"
                  checked={formData.medical_history?.cancer || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, cancer: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="HepA B (Hepatitis A & B)"
                  checked={formData.medical_history?.hepa_b || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, hepa_b: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Alcohol"
                  checked={formData.medical_history?.alcohol || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, alcohol: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Smoking"
                  checked={formData.medical_history?.smoking || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, smoking: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Exercise"
                  checked={formData.medical_history?.exercise || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, exercise: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Recreational Drugs"
                  checked={formData.medical_history?.recreational_drugs || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, recreational_drugs: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Others"
                  checked={formData.medical_history?.others_checked || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, others_checked: e.target.checked }
                  }))}
                />
                {formData.medical_history?.others_checked && (
                  <div className="ml-6">
                    <input
                      type="text"
                      value={formData.medical_history?.others || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        medical_history: { ...prev.medical_history, others: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
                      placeholder="Specify other conditions..."
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <h4 className="font-medium text-purple-900 text-sm mb-3">TREATMENT HISTORY</h4>
              <div className="space-y-3">
                <Checkbox
                  label="Ovulation Induction"
                  checked={formData.previous_treatment?.ovulation_induction || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    previous_treatment: { ...prev.previous_treatment, ovulation_induction: e.target.checked }
                  }))}
                />

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Sp / OI / IUI / IVF (Number of cycles)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.previous_treatment?.cycles ?? ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      previous_treatment: { ...prev.previous_treatment, cycles: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                    placeholder="Number of cycles"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Previous Surgeries */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Previous Surgeries
          </h2>
          <textarea
            value={formData.previous_surgeries || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, previous_surgeries: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
            placeholder="List any previous surgeries with dates..."
          />
        </div>

        {/* Section 6: Family History */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Family History
          </h2>
          <textarea
            value={formData.family_history || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, family_history: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
            placeholder="Family history of infertility, genetic conditions, etc..."
          />
        </div>

        {/* Section 7: Husband Medical History */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Husband Medical History
          </h2>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h4 className="font-medium text-blue-900 text-sm mb-3">PAST MEDICAL HISTORY</h4>
            <div className="space-y-2">
              <Checkbox
                label="Diabetes"
                checked={formData.husband_medical_history?.diabetes || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  husband_medical_history: { ...prev.husband_medical_history, diabetes: e.target.checked }
                }))}
              />
              <Checkbox
                label="Hypertension"
                checked={formData.husband_medical_history?.hypertension || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  husband_medical_history: { ...prev.husband_medical_history, hypertension: e.target.checked }
                }))}
              />
              <Checkbox
                label="Thyroid"
                checked={formData.husband_medical_history?.thyroid || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  husband_medical_history: { ...prev.husband_medical_history, thyroid: e.target.checked }
                }))}
              />
              <Checkbox
                label="Asthma"
                checked={formData.husband_medical_history?.asthma || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  husband_medical_history: { ...prev.husband_medical_history, asthma: e.target.checked }
                }))}
              />
              <Checkbox
                label="Tuberculosis"
                checked={formData.husband_medical_history?.tuberculosis || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  husband_medical_history: { ...prev.husband_medical_history, tuberculosis: e.target.checked }
                }))}
              />
              <Checkbox
                label="Cancer"
                checked={formData.husband_medical_history?.cancer || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  husband_medical_history: { ...prev.husband_medical_history, cancer: e.target.checked }
                }))}
              />
              <Checkbox
                label="HepA B (Hepatitis A & B)"
                checked={formData.husband_medical_history?.hepa_b || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  husband_medical_history: { ...prev.husband_medical_history, hepa_b: e.target.checked }
                }))}
              />
              <Checkbox
                label="Alcohol"
                checked={formData.husband_medical_history?.alcohol || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  husband_medical_history: { ...prev.husband_medical_history, alcohol: e.target.checked }
                }))}
              />
              <Checkbox
                label="Smoking"
                checked={formData.husband_medical_history?.smoking || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  husband_medical_history: { ...prev.husband_medical_history, smoking: e.target.checked }
                }))}
              />
              <Checkbox
                label="Exercise"
                checked={formData.husband_medical_history?.exercise || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  husband_medical_history: { ...prev.husband_medical_history, exercise: e.target.checked }
                }))}
              />
              <Checkbox
                label="Recreational Drugs"
                checked={formData.husband_medical_history?.recreational_drugs || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  husband_medical_history: { ...prev.husband_medical_history, recreational_drugs: e.target.checked }
                }))}
              />
              <Checkbox
                label="Others"
                checked={formData.husband_medical_history?.others_checked || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  husband_medical_history: { ...prev.husband_medical_history, others_checked: e.target.checked }
                }))}
              />
              {formData.husband_medical_history?.others_checked && (
                <div className="ml-6">
                  <input
                    type="text"
                    value={formData.husband_medical_history?.others || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      husband_medical_history: { ...prev.husband_medical_history, others: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
                    placeholder="Specify other conditions..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 8: General History */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            General History
          </h2>
          <textarea
            value={formData.general_history || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, general_history: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
            placeholder="General health history, lifestyle factors, etc..."
          />
        </div>

        {/* Section 9: Immunization History */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Immunization History
          </h2>
          <textarea
            value={formData.immunization_history || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, immunization_history: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
            placeholder="Vaccination history (MMR, Rubella, Hepatitis, etc.)..."
          />
        </div>

        {/* Section 10: Investigations */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Investigations for Female
          </h2>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-700 mb-1">HB</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.investigations?.hb ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    investigations: { ...prev.investigations, hb: e.target.value }
                  }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">RBS</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.investigations?.rbs ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    investigations: { ...prev.investigations, rbs: e.target.value }
                  }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">HIV, HBsAg, HCV</label>
                <input
                  type="text"
                  value={formData.investigations?.hiv_hbsag_hcv ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    investigations: { ...prev.investigations, hiv_hbsag_hcv: e.target.value }
                  }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">TB BACTEC CIS</label>
                <input
                  type="text"
                  value={formData.investigations?.tb_bactec_cis ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    investigations: { ...prev.investigations, tb_bactec_cis: e.target.value }
                  }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">TSH</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.investigations?.tsh ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    investigations: { ...prev.investigations, tsh: e.target.value }
                  }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">PRL</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.investigations?.prl ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    investigations: { ...prev.investigations, prl: e.target.value }
                  }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">E2</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.investigations?.e2 ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    investigations: { ...prev.investigations, e2: e.target.value }
                  }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">CBC</label>
                <input
                  type="text"
                  value={formData.investigations?.cbc ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    investigations: { ...prev.investigations, cbc: e.target.value }
                  }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">OGT/THA/C</label>
                <input
                  type="text"
                  value={formData.investigations?.ogt_tha_c ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    investigations: { ...prev.investigations, ogt_tha_c: e.target.value }
                  }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Findings
            </label>
            <textarea
              value={formData.investigations?.findings || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                investigations: { ...prev.investigations, findings: e.target.value }
              }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
              placeholder="Additional investigation findings..."
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-aneya-teal text-white rounded-lg font-medium hover:bg-aneya-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Submit Form'}
          </button>
        </div>
      </form>
    </div>
  );
}
