import { useState, useEffect } from 'react';
import { useInfertilityForms } from '../../hooks/useInfertilityForms';
import { ProgressiveWizard, WizardStep } from '../ProgressiveWizard';
import { Checkbox } from '../common';
import {
  InfertilityFormData,
  UpdateInfertilityFormInput,
  InfertilityType,
  SexualFrequency,
  CycleRegularity,
} from '../../types/database';

interface InfertilityPreConsultationFormProps {
  patientId: string;
  appointmentId: string;
  onComplete?: () => void;
  filledBy?: 'patient' | 'doctor'; // Who is filling the form
  doctorUserId?: string; // Doctor's user ID if filled by doctor
}

export function InfertilityPreConsultationForm({
  patientId,
  appointmentId,
  onComplete,
  filledBy = 'patient',
  doctorUserId,
}: InfertilityPreConsultationFormProps) {
  const { createForm, updateForm, getFormByAppointment, autoSaveForm } = useInfertilityForms(patientId);
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<InfertilityFormData>>({});

  // Load existing form if it exists
  useEffect(() => {
    const existingForm = getFormByAppointment(appointmentId);
    if (existingForm) {
      setCurrentFormId(existingForm.id);
      setFormData(existingForm.infertility_data);
    }
  }, [appointmentId, getFormByAppointment]);

  // Validation functions for each step
  const validateStep1 = (): boolean => {
    // Infertility Type & Basic History
    return !!(formData.infertility_type);
  };

  const validateStep2 = (): boolean => {
    // Menstrual & Sexual History - at least one field should be filled
    return !!(formData.menstrual_history || formData.sexual_history);
  };

  const validateStep3 = (): boolean => {
    // Medical History - at least one field
    return !!(formData.medical_history || formData.previous_treatment);
  };

  const validateStep4 = (): boolean => {
    // Investigations - optional, always valid
    return true;
  };

  // Step 1: Infertility Type & Basic Menstrual History
  const Step1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Infertility Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.infertility_type || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, infertility_type: e.target.value as InfertilityType }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
        >
          <option value="">Select infertility type</option>
          <option value="primary">Primary (Never conceived before)</option>
          <option value="secondary">Secondary (Conceived before, having difficulty now)</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Primary infertility means you have never been pregnant. Secondary means you have been pregnant at least once before.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Last Menstrual Period (LMP)
        </label>
        <input
          type="date"
          value={formData.menstrual_history?.lmp || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            menstrual_history: { ...prev.menstrual_history, lmp: e.target.value }
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cycle Length (days)
        </label>
        <input
          type="number"
          min="15"
          max="90"
          value={formData.menstrual_history?.cycle_length_days ?? ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            menstrual_history: {
              ...prev.menstrual_history,
              cycle_length_days: e.target.value !== '' ? parseInt(e.target.value) : undefined
            }
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          placeholder="e.g., 28"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cycle Regularity
        </label>
        <select
          value={formData.menstrual_history?.cycle_regularity || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            menstrual_history: {
              ...prev.menstrual_history,
              cycle_regularity: e.target.value as CycleRegularity
            }
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
        >
          <option value="">Select regularity</option>
          <option value="regular">Regular (predictable)</option>
          <option value="irregular">Irregular</option>
          <option value="absent">Absent/Amenorrhea</option>
        </select>
      </div>
    </div>
  );

  // Step 2: Sexual History
  const Step2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sexual Intercourse Frequency
        </label>
        <select
          value={formData.sexual_history?.frequency || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            sexual_history: { ...prev.sexual_history, frequency: e.target.value as SexualFrequency }
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
        >
          <option value="">Select frequency</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly (2-3 times per week)</option>
          <option value="monthly">Monthly (less than once per week)</option>
          <option value="rarely">Rarely</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sexual Satisfaction (1-10 scale)
        </label>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="10"
            value={formData.sexual_history?.satisfaction || 0}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              sexual_history: { ...prev.sexual_history, satisfaction: parseInt(e.target.value) }
            }))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Not satisfied (0)</span>
            <span className="font-semibold text-gray-700">{formData.sexual_history?.satisfaction || 0}/10</span>
            <span>Very satisfied (10)</span>
          </div>
        </div>
      </div>

      <div>
        <Checkbox
          label="Pain during intercourse (Dyspareunia)"
          checked={formData.sexual_history?.dyspareunia || false}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            sexual_history: { ...prev.sexual_history, dyspareunia: e.target.checked }
          }))}
        />
      </div>

      {formData.sexual_history?.dyspareunia && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe the pain
          </label>
          <textarea
            value={formData.sexual_history?.dyspareunia_description || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              sexual_history: { ...prev.sexual_history, dyspareunia_description: e.target.value }
            }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
            placeholder="Location, severity, timing of pain..."
          />
        </div>
      )}
    </div>
  );

  // Step 3: Medical History & Previous Treatment
  const Step3 = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <h4 className="font-medium text-blue-900 text-sm mb-3">Medical History</h4>
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
            label="Thyroid Disorder"
            checked={formData.medical_history?.thyroid_disorder || false}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              medical_history: { ...prev.medical_history, thyroid_disorder: e.target.checked }
            }))}
          />
          <Checkbox
            label="PCOS (Polycystic Ovary Syndrome)"
            checked={formData.medical_history?.pcos || false}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              medical_history: { ...prev.medical_history, pcos: e.target.checked }
            }))}
          />
          <Checkbox
            label="Endometriosis"
            checked={formData.medical_history?.endometriosis || false}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              medical_history: { ...prev.medical_history, endometriosis: e.target.checked }
            }))}
          />
        </div>
      </div>

      <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
        <h4 className="font-medium text-purple-900 text-sm mb-3">Previous Fertility Treatment</h4>
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
            <label className="block text-sm text-gray-700 mb-1">Number of IUI Cycles</label>
            <input
              type="number"
              min="0"
              value={formData.previous_treatment?.iui_cycles ?? ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                previous_treatment: {
                  ...prev.previous_treatment,
                  iui_cycles: e.target.value !== '' ? parseInt(e.target.value) : undefined
                }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Number of IVF Cycles</label>
            <input
              type="number"
              min="0"
              value={formData.previous_treatment?.ivf_cycles ?? ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                previous_treatment: {
                  ...prev.previous_treatment,
                  ivf_cycles: e.target.value !== '' ? parseInt(e.target.value) : undefined
                }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Step 4: Investigations
  const Step4 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
        <h4 className="font-medium text-green-900 text-sm mb-3">Hormone Levels</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-700 mb-1">FSH</label>
            <input
              type="number"
              step="0.1"
              value={formData.investigations?.hormones?.fsh ?? ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                investigations: {
                  ...prev.investigations,
                  hormones: {
                    ...prev.investigations?.hormones,
                    fsh: e.target.value !== '' ? parseFloat(e.target.value) : undefined
                  }
                }
              }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="mIU/mL"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">LH</label>
            <input
              type="number"
              step="0.1"
              value={formData.investigations?.hormones?.lh ?? ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                investigations: {
                  ...prev.investigations,
                  hormones: {
                    ...prev.investigations?.hormones,
                    lh: e.target.value !== '' ? parseFloat(e.target.value) : undefined
                  }
                }
              }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="mIU/mL"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">AMH</label>
            <input
              type="number"
              step="0.1"
              value={formData.investigations?.hormones?.amh ?? ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                investigations: {
                  ...prev.investigations,
                  hormones: {
                    ...prev.investigations?.hormones,
                    amh: e.target.value !== '' ? parseFloat(e.target.value) : undefined
                  }
                }
              }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="ng/mL"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">Prolactin</label>
            <input
              type="number"
              step="0.1"
              value={formData.investigations?.hormones?.prolactin ?? ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                investigations: {
                  ...prev.investigations,
                  hormones: {
                    ...prev.investigations?.hormones,
                    prolactin: e.target.value !== '' ? parseFloat(e.target.value) : undefined
                  }
                }
              }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="ng/mL"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ultrasound Findings
        </label>
        <textarea
          value={formData.investigations?.ultrasound?.findings || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            investigations: {
              ...prev.investigations,
              ultrasound: {
                ...prev.investigations?.ultrasound,
                findings: e.target.value
              }
            }
          }))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          placeholder="Any ultrasound findings..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Antral Follicle Count (AFC)
        </label>
        <input
          type="number"
          min="0"
          value={formData.investigations?.ultrasound?.antral_follicle_count ?? ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            investigations: {
              ...prev.investigations,
              ultrasound: {
                ...prev.investigations?.ultrasound,
                antral_follicle_count: e.target.value !== '' ? parseInt(e.target.value) : undefined
              }
            }
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          placeholder="Total count"
        />
      </div>
    </div>
  );

  // Wizard step definitions
  const wizardSteps: WizardStep[] = [
    {
      title: 'Infertility Type & Menstrual History',
      content: <Step1 />,
      validate: validateStep1,
    },
    {
      title: 'Sexual History',
      content: <Step2 />,
      validate: validateStep2,
    },
    {
      title: 'Medical History & Previous Treatment',
      content: <Step3 />,
      validate: validateStep3,
    },
    {
      title: 'Investigations',
      content: <Step4 />,
      validate: validateStep4,
    },
  ];

  const handleAutoSave = async (_stepIndex: number) => {
    if (!currentFormId) {
      // Create form if it doesn't exist yet
      const newForm = await createForm(patientId, {
        patient_id: patientId,
        appointment_id: appointmentId,
        form_type: 'pre_consultation',
        status: 'partial',
        filled_by: filledBy === 'doctor' ? doctorUserId || null : null,
        infertility_data: formData,
      });
      if (newForm) {
        setCurrentFormId(newForm.id);
      }
    } else {
      // Auto-save the form
      const updateData: UpdateInfertilityFormInput = {
        status: 'partial',
        infertility_data: formData,
      };
      autoSaveForm(currentFormId, updateData);
    }
  };

  const handleComplete = async () => {
    if (!currentFormId) {
      // Create form if it doesn't exist
      await createForm(patientId, {
        patient_id: patientId,
        appointment_id: appointmentId,
        form_type: 'pre_consultation',
        status: 'completed',
        filled_by: filledBy === 'doctor' ? doctorUserId || null : null,
        infertility_data: formData,
      });
    } else {
      // Mark form as completed
      await updateForm(currentFormId, {
        status: 'completed',
        infertility_data: formData,
      });
    }

    // Call the completion callback
    onComplete?.();
  };

  return (
    <div className="w-full">
      <ProgressiveWizard
        steps={wizardSteps}
        onAutoSave={handleAutoSave}
        onComplete={handleComplete}
        showProgressBar={true}
        showStepNumbers={true}
        allowSkip={false}
      />
    </div>
  );
}
