import { useState, useEffect } from 'react';
import { useAntenatalForms } from '../../hooks/useAntenatalForms';
import { Checkbox } from '../common';
import {
  CreateAntenatalFormInput,
  UpdateAntenatalFormInput,
  PreviousPregnancy,
  RiskFactors,
} from '../../types/database';

interface AntenatalPreConsultationFormProps {
  patientId: string;
  appointmentId: string;
  onComplete?: () => void;
  onBack?: () => void;
  filledBy?: 'patient' | 'doctor';
  doctorUserId?: string;
}

// Helper function to calculate EDD from LMP (adds 280 days)
function calculateEDD(lmpDate: string): string | null {
  if (!lmpDate) return null;
  const lmp = new Date(lmpDate);
  const edd = new Date(lmp.getTime() + (280 * 24 * 60 * 60 * 1000));
  return edd.toISOString().split('T')[0];
}

// Helper function to calculate gestational age in weeks
function calculateGestationalAge(lmpDate: string): number | null {
  if (!lmpDate) return null;
  const lmp = new Date(lmpDate);
  const today = new Date();
  const weeksElapsed = Math.floor((today.getTime() - lmp.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return weeksElapsed > 0 ? weeksElapsed : null;
}

export function AntenatalPreConsultationForm({
  patientId,
  appointmentId,
  onComplete,
  onBack,
  filledBy = 'patient',
  doctorUserId,
}: AntenatalPreConsultationFormProps) {
  // Pass doctorUserId (Firebase user ID) to hook for created_by/updated_by fields
  const { createForm, updateForm, getFormByAppointment } = useAntenatalForms(patientId, doctorUserId);
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateAntenatalFormInput>>({
    form_type: 'pre_consultation',
    status: 'draft',
    appointment_id: appointmentId,
    filled_by: filledBy === 'doctor' ? doctorUserId : null,
    previous_pregnancies: [],
    risk_factors: {},
    medical_history: {},
    family_history: {},
    immunization_status: {},
  });

  // Load existing form if it exists
  useEffect(() => {
    const existingForm = getFormByAppointment(appointmentId);
    if (existingForm) {
      setCurrentFormId(existingForm.id);
      setFormData(existingForm);
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

  // Auto-calculate EDD when LMP changes
  useEffect(() => {
    if (formData.lmp) {
      const calculatedEDD = calculateEDD(formData.lmp);
      const calculatedGA = calculateGestationalAge(formData.lmp);

      setFormData(prev => ({
        ...prev,
        edd: calculatedEDD || prev.edd,
        gestational_age_weeks: calculatedGA || prev.gestational_age_weeks,
      }));
    }
  }, [formData.lmp]);

  const handleAutoSave = async () => {
    if (!currentFormId) {
      // Create form if it doesn't exist yet
      const newForm = await createForm(patientId, {
        ...formData as CreateAntenatalFormInput,
        filled_by: filledBy === 'doctor' ? doctorUserId : null,
      });
      if (newForm) {
        setCurrentFormId(newForm.id);
      }
    } else {
      // Auto-save the form
      const updateData: UpdateAntenatalFormInput = {
        ...formData,
        status: 'partial',
        filled_by: filledBy === 'doctor' ? doctorUserId : null,
      };
      await updateForm(currentFormId, updateData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      if (!currentFormId) {
        // Create form if it doesn't exist
        const newForm = await createForm(patientId, {
          ...formData as CreateAntenatalFormInput,
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
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to add a new pregnancy
  const addPregnancy = () => {
    const currentPregnancies = formData.previous_pregnancies || [];
    const newPregnancy: PreviousPregnancy = {
      pregnancy_num: currentPregnancies.length + 1,
    };
    setFormData(prev => ({
      ...prev,
      previous_pregnancies: [...currentPregnancies, newPregnancy],
    }));
  };

  // Helper function to update a pregnancy
  const updatePregnancy = (index: number, field: keyof PreviousPregnancy, value: any) => {
    const pregnancies = [...(formData.previous_pregnancies || [])];
    pregnancies[index] = { ...pregnancies[index], [field]: value };
    setFormData(prev => ({ ...prev, previous_pregnancies: pregnancies }));
  };

  // Helper function to remove a pregnancy
  const removePregnancy = (index: number) => {
    const pregnancies = [...(formData.previous_pregnancies || [])];
    pregnancies.splice(index, 1);
    // Re-number remaining pregnancies
    pregnancies.forEach((p, i) => { p.pregnancy_num = i + 1; });
    setFormData(prev => ({ ...prev, previous_pregnancies: pregnancies }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 0: Patient Registration (Paper Form Header) */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 border-l-4 border-l-aneya-teal">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Patient Registration
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  THG No.
                </label>
                <input
                  type="text"
                  value={formData.thg_no || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, thg_no: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Hospital registration number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Religion
                </label>
                <input
                  type="text"
                  value={formData.religion || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, religion: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tel No.
                </label>
                <input
                  type="tel"
                  value={formData.tel_no || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tel_no: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Landline/alternate phone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ref Doctor
                </label>
                <input
                  type="text"
                  value={formData.ref_doctor || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, ref_doctor: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Referring doctor name"
                />
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <label className="block text-sm font-semibold text-red-900 mb-2">
                ⚠️ Allergies
              </label>
              <input
                type="text"
                value={formData.allergies || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value || null }))}
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                placeholder="Known drug/food allergies (e.g., Penicillin, NSAIDs, etc.)"
              />
            </div>
          </div>
        </div>

        {/* Section 1: Current Pregnancy Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Current Pregnancy Information
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Menstrual Period (LMP)
                </label>
                <input
                  type="date"
                  value={formData.lmp || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, lmp: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  EDD (Calculated from LMP)
                </label>
                <input
                  type="date"
                  value={formData.edd || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, edd: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Auto-calculated from LMP
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scan EDD
                </label>
                <input
                  type="date"
                  value={formData.scan_edd || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, scan_edd: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  EDD from ultrasound scan
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinical EDD
                </label>
                <input
                  type="date"
                  value={formData.clinical_edd || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, clinical_edd: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  EDD from clinical examination
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gestational Age
              </label>
              <input
                type="number"
                value={formData.gestational_age_weeks ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, gestational_age_weeks: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Weeks"
              />
              <p className="mt-1 text-xs text-gray-500">
                Auto-calculated from LMP, can be manually adjusted based on USG
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gravida (G)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.gravida ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, gravida: e.target.value ? parseInt(e.target.value) : null }))}
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
                  value={formData.para ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, para: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Deliveries"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Live (L)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.live ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, live: e.target.value ? parseInt(e.target.value) : null }))}
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
                  value={formData.abortions ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, abortions: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Miscarriages/Abortions"
                />
              </div>
            </div>

            {/* Marriage & Social History */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 mt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year of Marriage
                </label>
                <input
                  type="date"
                  value={formData.marriage_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, marriage_date: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Date of marriage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period of Cohabitation (months)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.cohabitation_period_months ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, cohabitation_period_months: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Months"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consanguinity
                </label>
                <select
                  value={formData.consanguinity || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    consanguinity: e.target.value ? (e.target.value as 'consanguineous' | 'non_consanguineous') : null
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="consanguineous">Consanguineous</option>
                  <option value="non_consanguineous">Non-Consanguineous</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Consanguineous = Related by blood (important for genetic risk)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Partner Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Partner Details
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Husband Name
                </label>
                <input
                  type="text"
                  value={formData.husband_name || formData.partner_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, husband_name: e.target.value || null, partner_name: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Husband's/Partner's name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Group
                </label>
                <select
                  value={formData.partner_blood_group || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, partner_blood_group: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                >
                  <option value="">Select blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h4 className="font-medium text-blue-900 text-sm mb-3">Partner's Medical History</h4>
              <div className="space-y-2">
                <Checkbox
                  label="Diabetes"
                  checked={formData.partner_medical_history?.diabetes || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    partner_medical_history: { ...prev.partner_medical_history, diabetes: e.target.checked },
                  }))}
                />
                <Checkbox
                  label="Hypertension"
                  checked={formData.partner_medical_history?.hypertension || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    partner_medical_history: { ...prev.partner_medical_history, hypertension: e.target.checked },
                  }))}
                />
                <Checkbox
                  label="Other significant conditions"
                  checked={formData.partner_medical_history?.others || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    partner_medical_history: { ...prev.partner_medical_history, others: e.target.checked },
                  }))}
                />
                {formData.partner_medical_history?.others && (
                  <textarea
                    value={formData.partner_medical_history?.others_text || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      partner_medical_history: { ...prev.partner_medical_history, others_text: e.target.value },
                    }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
                    placeholder="Describe other conditions..."
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Detailed Obstetric History */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Previous Obstetric History
          </h2>
          <div className="space-y-4">
            {formData.previous_pregnancies && formData.previous_pregnancies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mode of Conception</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sex</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Alive</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Birth Wt(kg)</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">NICU</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">BF (months)</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Complications</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.previous_pregnancies.map((preg, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{preg.pregnancy_num}</td>
                        <td className="px-3 py-2">
                          <select
                            value={preg.mode_of_conception || ''}
                            onChange={(e) => updatePregnancy(index, 'mode_of_conception', e.target.value)}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Select</option>
                            <option value="natural">Natural</option>
                            <option value="ivf">IVF</option>
                            <option value="iui">IUI</option>
                            <option value="icsi">ICSI</option>
                            <option value="other">Other</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={preg.year || ''}
                            onChange={(e) => updatePregnancy(index, 'year', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="YYYY"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={preg.mode_of_delivery || ''}
                            onChange={(e) => updatePregnancy(index, 'mode_of_delivery', e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Select</option>
                            <option value="normal">Normal</option>
                            <option value="lscs">LSCS</option>
                            <option value="forceps">Forceps</option>
                            <option value="vacuum">Vacuum</option>
                            <option value="abortion">Abortion</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={preg.sex || ''}
                            onChange={(e) => updatePregnancy(index, 'sex', e.target.value as 'M' | 'F' | undefined)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">-</option>
                            <option value="M">M</option>
                            <option value="F">F</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={preg.alive || false}
                            onChange={(e) => updatePregnancy(index, 'alive', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.1"
                            value={preg.birth_weight_kg || ''}
                            onChange={(e) => updatePregnancy(index, 'birth_weight_kg', e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="kg"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={preg.nicu_admission || false}
                            onChange={(e) => updatePregnancy(index, 'nicu_admission', e.target.checked)}
                            className="rounded border-gray-300"
                            title="NICU Admission"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={preg.breastfeeding_months || ''}
                            onChange={(e) => updatePregnancy(index, 'breastfeeding_months', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="mo"
                            title="Breastfeeding duration in months"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={preg.complications || ''}
                            onChange={(e) => updatePregnancy(index, 'complications', e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Any complications"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removePregnancy(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No previous pregnancies added yet.</p>
            )}

            <button
              type="button"
              onClick={addPregnancy}
              className="px-4 py-2 bg-aneya-teal text-white rounded-lg hover:bg-aneya-teal/90 transition-colors text-sm"
            >
              + Add Pregnancy
            </button>
          </div>
        </div>

        {/* Section 4: Risk Factors */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Risk Factors
          </h2>
          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Checkbox
                label="Previous LSCS/Cesarean"
                checked={(formData.risk_factors as RiskFactors)?.previous_lscs || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  risk_factors: { ...prev.risk_factors as RiskFactors, previous_lscs: e.target.checked },
                }))}
              />
              <Checkbox
                label="Previous PPH (Post-Partum Hemorrhage)"
                checked={(formData.risk_factors as RiskFactors)?.previous_pph || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  risk_factors: { ...prev.risk_factors as RiskFactors, previous_pph: e.target.checked },
                }))}
              />
              <Checkbox
                label="PIH (Pregnancy-Induced Hypertension)"
                checked={(formData.risk_factors as RiskFactors)?.pih || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  risk_factors: { ...prev.risk_factors as RiskFactors, pih: e.target.checked },
                }))}
              />
              <Checkbox
                label="GDM (Gestational Diabetes Mellitus)"
                checked={(formData.risk_factors as RiskFactors)?.gdm || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  risk_factors: { ...prev.risk_factors as RiskFactors, gdm: e.target.checked },
                }))}
              />
              <Checkbox
                label="Previous Stillbirth"
                checked={(formData.risk_factors as RiskFactors)?.previous_stillbirth || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  risk_factors: { ...prev.risk_factors as RiskFactors, previous_stillbirth: e.target.checked },
                }))}
              />
              <Checkbox
                label="Previous Preterm Delivery"
                checked={(formData.risk_factors as RiskFactors)?.previous_preterm || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  risk_factors: { ...prev.risk_factors as RiskFactors, previous_preterm: e.target.checked },
                }))}
              />
              <Checkbox
                label="Anemia"
                checked={(formData.risk_factors as RiskFactors)?.anemia || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  risk_factors: { ...prev.risk_factors as RiskFactors, anemia: e.target.checked },
                }))}
              />
              <Checkbox
                label="Heart Disease"
                checked={(formData.risk_factors as RiskFactors)?.heart_disease || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  risk_factors: { ...prev.risk_factors as RiskFactors, heart_disease: e.target.checked },
                }))}
              />
              <Checkbox
                label="Thyroid Disorder"
                checked={(formData.risk_factors as RiskFactors)?.thyroid || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  risk_factors: { ...prev.risk_factors as RiskFactors, thyroid: e.target.checked },
                }))}
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Other Conditions
              </label>
              <textarea
                value={(formData.risk_factors as RiskFactors)?.other_conditions || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  risk_factors: { ...prev.risk_factors as RiskFactors, other_conditions: e.target.value },
                }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
                placeholder="Any other risk factors or conditions..."
              />
            </div>
          </div>
        </div>

        {/* Section 5: Medical/Surgical/Family History */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Medical, Surgical & Family History
          </h2>
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <h4 className="font-medium text-purple-900 text-sm mb-3">Medical History</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Checkbox
                  label="Diabetes"
                  checked={formData.medical_history?.diabetes || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, diabetes: e.target.checked },
                  }))}
                />
                <Checkbox
                  label="Hypertension"
                  checked={formData.medical_history?.hypertension || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, hypertension: e.target.checked },
                  }))}
                />
                <Checkbox
                  label="Asthma"
                  checked={formData.medical_history?.asthma || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, asthma: e.target.checked },
                  }))}
                />
                <Checkbox
                  label="Tuberculosis"
                  checked={formData.medical_history?.tuberculosis || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, tuberculosis: e.target.checked },
                  }))}
                />
                <Checkbox
                  label="Thyroid Disorder"
                  checked={formData.medical_history?.thyroid || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, thyroid: e.target.checked },
                  }))}
                />
                <Checkbox
                  label="Heart Disease"
                  checked={formData.medical_history?.heart_disease || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    medical_history: { ...prev.medical_history, heart_disease: e.target.checked },
                  }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Surgical History
              </label>
              <textarea
                value={formData.surgical_history || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, surgical_history: e.target.value || null }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Any previous surgeries..."
              />
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <h4 className="font-medium text-green-900 text-sm mb-3">Family History</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Checkbox
                  label="Diabetes"
                  checked={formData.family_history?.diabetes || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    family_history: { ...prev.family_history, diabetes: e.target.checked },
                  }))}
                />
                <Checkbox
                  label="Hypertension"
                  checked={formData.family_history?.hypertension || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    family_history: { ...prev.family_history, hypertension: e.target.checked },
                  }))}
                />
                <Checkbox
                  label="Twins"
                  checked={formData.family_history?.twins || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    family_history: { ...prev.family_history, twins: e.target.checked },
                  }))}
                />
                <Checkbox
                  label="Congenital Anomalies"
                  checked={formData.family_history?.congenital_anomalies || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    family_history: { ...prev.family_history, congenital_anomalies: e.target.checked },
                  }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Gynecological History */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Gynecological History
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Menstrual Pattern
              </label>
              <select
                value={(formData.menstrual_history as any)?.pattern || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  menstrual_history: {
                    ...(prev.menstrual_history || {}),
                    pattern: e.target.value || null
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="regular">Regular</option>
                <option value="irregular">Irregular</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Menstrual History Details
              </label>
              <textarea
                value={(formData.menstrual_history as any)?.details || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  menstrual_history: {
                    ...(prev.menstrual_history || {}),
                    details: e.target.value || null
                  }
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Cycle length, flow, pain, etc..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraception History
              </label>
              <textarea
                value={formData.contraception_history || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, contraception_history: e.target.value || null }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Previous contraception methods used..."
              />
            </div>
          </div>
        </div>

        {/* Section 7: Immunization Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Immunization History
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TT1 (Tetanus Toxoid)
                </label>
                <input
                  type="date"
                  value={formData.immunization_status?.tt1_date || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    immunization_status: { ...prev.immunization_status, tt1_date: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TT2 (Tetanus Toxoid)
                </label>
                <input
                  type="date"
                  value={formData.immunization_status?.tt2_date || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    immunization_status: { ...prev.immunization_status, tt2_date: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TT Booster
                </label>
                <input
                  type="date"
                  value={formData.immunization_status?.tt_booster_date || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    immunization_status: { ...prev.immunization_status, tt_booster_date: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Other Vaccines
              </label>
              <textarea
                value={formData.immunization_status?.other_vaccines || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  immunization_status: { ...prev.immunization_status, other_vaccines: e.target.value },
                }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="MMR, Rubella, Hepatitis, etc..."
              />
            </div>
          </div>
        </div>

        {/* Section 8: Current Pregnancy Symptoms */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Current Pregnancy Symptoms & Complaints
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Symptoms
              </label>
              <textarea
                value={formData.current_symptoms || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, current_symptoms: e.target.value || null }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Nausea, vomiting, fatigue, etc..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Complaints
              </label>
              <textarea
                value={formData.complaints || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, complaints: e.target.value || null }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Any specific concerns or complaints..."
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-between gap-3 pt-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="ml-auto px-6 py-3 bg-aneya-teal text-white rounded-lg font-medium hover:bg-aneya-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Submit Form'}
          </button>
        </div>
      </form>
    </div>
  );
}
