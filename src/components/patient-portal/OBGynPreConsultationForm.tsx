import { useState, useEffect } from 'react';
import { useOBGynForms } from '../../hooks/useOBGynForms';
import { ProgressiveWizard, WizardStep } from '../ProgressiveWizard';
import {
  CreateOBGynFormInput,
  UpdateOBGynFormInput,
  CycleRegularity,
  PregnancyStatus,
  ContraceptionStatus,
  SexualActivityStatus,
  STIScreeningResult,
} from '../../types/database';

interface OBGynPreConsultationFormProps {
  patientId: string;
  appointmentId: string;
  onComplete?: () => void;
  filledBy?: 'patient' | 'doctor'; // Indicates who is filling the form
  doctorUserId?: string; // Doctor's user ID if filled by doctor
}

// Helper function to calculate gestational age
function calculateGestationalAge(lmpDate: string): number | null {
  if (!lmpDate) return null;
  const lmp = new Date(lmpDate);
  const today = new Date();
  const weeksElapsed = Math.floor((today.getTime() - lmp.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return weeksElapsed > 0 ? weeksElapsed : null;
}

export function OBGynPreConsultationForm({
  patientId,
  appointmentId,
  onComplete,
  filledBy = 'patient',
  doctorUserId,
}: OBGynPreConsultationFormProps) {
  const { createForm, updateForm, getFormByAppointment, autoSaveForm } = useOBGynForms(patientId);
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateOBGynFormInput>({
    form_type: 'pre_consultation',
    status: 'draft',
    appointment_id: appointmentId,
    filled_by: filledBy === 'doctor' ? doctorUserId : null,
  });

  // Load existing form if it exists
  useEffect(() => {
    const existingForm = getFormByAppointment(appointmentId);
    if (existingForm) {
      setCurrentFormId(existingForm.id);
      setFormData(existingForm);
    }
  }, [appointmentId, getFormByAppointment]);

  // Validation functions for each step
  const validateStep1 = (): boolean => {
    // Menstrual History - at least one field should be filled
    const hasData = !!(formData.last_menstrual_period || formData.cycle_regularity !== undefined);
    return hasData;
  };

  const validateStep2 = (): boolean => {
    // Pregnancy Status & History - at least pregnancy status should be selected
    return formData.pregnancy_status !== undefined;
  };

  const validateStep3 = (): boolean => {
    // Contraception & Family Planning - at least contraception status should be selected
    return formData.contraception_status !== undefined;
  };

  const validateStep4 = (): boolean => {
    // Gynecological History - at least STI screening result should be selected
    return formData.sti_screening_result !== undefined;
  };

  // Step content components
  const Step1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Last Menstrual Period (LMP)
        </label>
        <input
          type="date"
          value={formData.last_menstrual_period || ''}
          onChange={(e) => {
            const date = e.target.value;
            setFormData(prev => ({
              ...prev,
              last_menstrual_period: date || undefined,
            }));
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          placeholder="Select date"
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional: Select the first day of your last menstrual period
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cycle Length (days)
        </label>
        <input
          type="number"
          min="15"
          max="90"
          value={formData.last_menstrual_period ? calculateGestationalAge(formData.last_menstrual_period) || '' : ''}
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
          placeholder="Auto-calculated from LMP"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cycle Regularity <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.cycle_regularity || 'unknown'}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            cycle_regularity: e.target.value as CycleRegularity,
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
        >
          <option value="">Select cycle regularity</option>
          <option value="regular">Regular (predictable)</option>
          <option value="irregular">Irregular</option>
          <option value="absent">Absent/Amenorrhea</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bleeding Pattern
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300" defaultChecked />
            <span className="ml-2 text-sm text-gray-700">Normal flow</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="ml-2 text-sm text-gray-700">Heavy bleeding</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="ml-2 text-sm text-gray-700">Light bleeding</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="ml-2 text-sm text-gray-700">Clotting</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Menstrual Pain Severity
        </label>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="10"
            value={formData.symptom_severity || 0}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              symptom_severity: parseInt(e.target.value),
            }))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>No pain (0)</span>
            <span className="font-semibold text-gray-700">{formData.symptom_severity || 0}/10</span>
            <span>Severe pain (10)</span>
          </div>
        </div>
      </div>
    </div>
  );

  const Step2 = () => {
    const lmpDate = formData.last_menstrual_period;
    const gestationalAge = lmpDate ? calculateGestationalAge(lmpDate) : null;

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Pregnancy Status <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.pregnancy_status || 'not_pregnant'}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              pregnancy_status: e.target.value as PregnancyStatus,
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          >
            <option value="">Select pregnancy status</option>
            <option value="not_pregnant">Not pregnant</option>
            <option value="pregnant">Pregnant</option>
            <option value="postpartum">Postpartum</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        {formData.pregnancy_status === 'pregnant' && gestationalAge && (
          <div className="bg-aneya-cream/50 rounded-lg p-4">
            <p className="text-sm font-medium text-aneya-navy">
              Estimated Gestational Age: <span className="font-semibold">{gestationalAge} weeks</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Based on your LMP date of {new Date(lmpDate!).toLocaleDateString()}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estimated Date of Delivery (if pregnant)
          </label>
          <input
            type="date"
            value={formData.estimated_delivery_date || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              estimated_delivery_date: e.target.value || undefined,
            }))}
            disabled={formData.pregnancy_status !== 'pregnant'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Pregnancies
          </label>
          <input
            type="number"
            min="0"
            value={formData.number_of_pregnancies || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              number_of_pregnancies: e.target.value ? parseInt(e.target.value) : undefined,
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
            placeholder="Total number of pregnancies"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Live Births
          </label>
          <input
            type="number"
            min="0"
            value={formData.number_of_children || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              number_of_children: e.target.value ? parseInt(e.target.value) : undefined,
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
            placeholder="Number of living children"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Miscarriages/Abortions
          </label>
          <input
            type="number"
            min="0"
            value={formData.number_of_miscarriages || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              number_of_miscarriages: e.target.value ? parseInt(e.target.value) : undefined,
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
            placeholder="Include miscarriages and abortions"
          />
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <h4 className="font-medium text-blue-900 text-sm mb-2">Obstetric History</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.gestational_diabetes_history || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  gestational_diabetes_history: e.target.checked,
                }))}
                className="rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-blue-900">History of Gestational Diabetes</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.preeclampsia_history || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  preeclampsia_history: e.target.checked,
                }))}
                className="rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-blue-900">History of Preeclampsia</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.complicated_birth_history || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  complicated_birth_history: e.target.checked,
                }))}
                className="rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-blue-900">Complicated Births</span>
            </label>
          </div>
          {formData.complicated_birth_history && (
            <div className="mt-3">
              <textarea
                value={formData.birth_complications_description || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  birth_complications_description: e.target.value || undefined,
                }))}
                placeholder="Describe birth complications..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const Step3 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current Contraception <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.contraception_status || 'unknown'}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            contraception_status: e.target.value as ContraceptionStatus,
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
        >
          <option value="">Select contraception method</option>
          <option value="none">None</option>
          <option value="hormonal">Hormonal (Pills, Patch, Ring)</option>
          <option value="barrier">Barrier Methods (Condoms, Diaphragm)</option>
          <option value="iud">IUD (Copper or Hormonal)</option>
          <option value="permanent">Permanent (Sterilization)</option>
          <option value="other">Other Method</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {formData.contraception_status && formData.contraception_status !== 'none' && formData.contraception_status !== 'unknown' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contraception Method Details
          </label>
          <textarea
            value={formData.contraception_method_details || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              contraception_method_details: e.target.value || undefined,
            }))}
            placeholder="e.g., 'Birth control pill - Yaz for 3 years', 'Copper IUD inserted 6 months ago'"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          />
        </div>
      )}

      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
        <h4 className="font-medium text-green-900 text-sm mb-3">Family Planning</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-green-900 mb-2">
              Planning to get pregnant in the next:
            </label>
            <select
              defaultValue="not-planning"
              className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
            >
              <option value="not-planning">Not planning</option>
              <option value="1-year">1 year</option>
              <option value="1-2-years">1-2 years</option>
              <option value="2-plus-years">More than 2 years</option>
              <option value="unsure">Unsure</option>
            </select>
          </div>
          <label className="flex items-start">
            <input
              type="checkbox"
              className="mt-1 rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-green-900">
              I would like to discuss family planning options
            </span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sexual Activity
        </label>
        <select
          value={formData.sexual_activity_status || 'unknown'}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            sexual_activity_status: e.target.value as SexualActivityStatus,
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
        >
          <option value="unknown">Select sexual activity status</option>
          <option value="active">Sexually active</option>
          <option value="inactive">Not sexually active</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sexual Partners (past 12 months)
        </label>
        <input
          type="number"
          min="0"
          value={formData.num_sexual_partners || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            num_sexual_partners: e.target.value ? parseInt(e.target.value) : undefined,
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          placeholder="Number of partners"
        />
      </div>
    </div>
  );

  const Step4 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Previous Gynecological Procedures
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="ml-2 text-sm text-gray-700">Dilation & Curettage (D&C)</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="ml-2 text-sm text-gray-700">Hysterectomy</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="ml-2 text-sm text-gray-700">Colposcopy</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="ml-2 text-sm text-gray-700">Cone Biopsy</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="ml-2 text-sm text-gray-700">Myomectomy (Fibroid removal)</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Last Pap Smear
        </label>
        <input
          type="date"
          value={formData.last_pap_smear_date || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            last_pap_smear_date: e.target.value || undefined,
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">
          Recommended every 3 years if normal
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          STI Screening Status <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.sti_screening_result || 'unknown'}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            sti_screening_result: e.target.value as STIScreeningResult,
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
        >
          <option value="">Select screening status</option>
          <option value="negative">Negative (No STI)</option>
          <option value="positive">Positive (STI detected)</option>
          <option value="not_tested">Never tested</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {formData.sti_screening_result === 'positive' && (
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <p className="text-sm text-orange-900">
            Please inform your doctor about the STI diagnosis. Proper treatment is important.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Last STI Screening Date
        </label>
        <input
          type="date"
          value={formData.last_sti_screening_date || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            last_sti_screening_date: e.target.value || undefined,
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
        />
      </div>

      <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
        <h4 className="font-medium text-purple-900 text-sm mb-3">Gynecological Conditions</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.fibroids_history || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                fibroids_history: e.target.checked,
              }))}
              className="rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-purple-900">Fibroids (Uterine Myomas)</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.endometriosis_history || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                endometriosis_history: e.target.checked,
              }))}
              className="rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-purple-900">Endometriosis</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.pcos_history || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                pcos_history: e.target.checked,
              }))}
              className="rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-purple-900">PCOS (Polycystic Ovary Syndrome)</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.pelvic_inflammatory_disease_history || false}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                pelvic_inflammatory_disease_history: e.target.checked,
              }))}
              className="rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-purple-900">Pelvic Inflammatory Disease</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chronic Pelvic Pain
        </label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="ml-2 text-sm text-gray-700">No chronic pelvic pain</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="ml-2 text-sm text-gray-700">Experience chronic pelvic pain</span>
          </label>
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              If yes, describe the pain:
            </label>
            <textarea
              placeholder="Location, frequency, severity, what makes it better/worse..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Wizard step definitions
  const wizardSteps: WizardStep[] = [
    {
      title: 'Menstrual History',
      content: <Step1 />,
      validate: validateStep1,
    },
    {
      title: 'Pregnancy Status & History',
      content: <Step2 />,
      validate: validateStep2,
    },
    {
      title: 'Contraception & Family Planning',
      content: <Step3 />,
      validate: validateStep3,
    },
    {
      title: 'Gynecological History',
      content: <Step4 />,
      validate: validateStep4,
    },
  ];

  const handleAutoSave = async (_stepIndex: number) => {
    if (!currentFormId) {
      // Create form if it doesn't exist yet
      const newForm = await createForm(patientId, {
        ...formData,
        filled_by: filledBy === 'doctor' ? doctorUserId : null,
      });
      if (newForm) {
        setCurrentFormId(newForm.id);
      }
    } else {
      // Auto-save the form
      const updateData: UpdateOBGynFormInput = {
        ...formData,
        status: 'partial',
        filled_by: filledBy === 'doctor' ? doctorUserId : null,
      };
      autoSaveForm(currentFormId, updateData);
    }
  };

  const handleComplete = async () => {
    if (!currentFormId) {
      // Create form if it doesn't exist
      const newForm = await createForm(patientId, {
        ...formData,
        status: 'completed',
        filled_by: filledBy === 'doctor' ? doctorUserId : null,
      });
      if (newForm) {
        setCurrentFormId(newForm.id);
      }
    } else {
      // Mark form as completed
      await updateForm(currentFormId, {
        ...formData,
        status: 'completed',
        filled_by: filledBy === 'doctor' ? doctorUserId : null,
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
