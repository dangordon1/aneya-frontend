import { useState, useEffect } from 'react';
import { useAntenatalForms } from '../../hooks/useAntenatalForms';
import { Checkbox } from '../common';
import {
  CreateAntenatalFormInput,
  UpdateAntenatalFormInput,
  CreateAntenatalVisitInput,
  USGScan,
  USGScanType,
  DopplerStudy,
  NSTTest,
  Referral,
} from '../../types/database';

interface AntenatalDuringConsultationFormProps {
  patientId: string;
  appointmentId: string;
  onComplete?: () => void;
  onBack?: () => void;
  filledBy?: 'patient' | 'doctor';
  doctorUserId?: string;
}

export function AntenatalDuringConsultationForm({
  patientId,
  appointmentId,
  onComplete,
  onBack,
  filledBy = 'doctor',
  doctorUserId,
}: AntenatalDuringConsultationFormProps) {
  const { createForm, updateForm, getFormByAppointment, createVisit, getVisitsByForm } = useAntenatalForms(patientId);
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form data (master ANC card)
  const [formData, setFormData] = useState<Partial<CreateAntenatalFormInput>>({
    form_type: 'during_consultation',
    status: 'draft',
    appointment_id: appointmentId,
    filled_by: filledBy === 'doctor' ? doctorUserId : null,
  });

  // Visit data (current visit record)
  const [visitData, setVisitData] = useState<Partial<CreateAntenatalVisitInput>>({
    visit_number: 1,
    visit_date: new Date().toISOString().split('T')[0],
  });

  // Load existing form if it exists
  useEffect(() => {
    const existingForm = getFormByAppointment(appointmentId);
    if (existingForm) {
      setCurrentFormId(existingForm.id);
      setFormData(existingForm);

      // Auto-increment visit number based on existing visits
      const visits = getVisitsByForm(existingForm.id);
      setVisitData(prev => ({ ...prev, visit_number: visits.length + 1 }));
    }
  }, [appointmentId, getFormByAppointment, getVisitsByForm]);

  // Auto-save on form data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentFormId && Object.keys(formData).length > 0) {
        handleAutoSave();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [formData, currentFormId]);

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
      // Ensure form exists
      if (!currentFormId) {
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

      // Create visit record if we have visit data
      if (currentFormId && visitData.visit_date) {
        await createVisit({
          antenatal_form_id: currentFormId,
          visit_number: visitData.visit_number || 1,
          visit_date: visitData.visit_date,
          gestational_age_weeks: visitData.gestational_age_weeks,
          weight_kg: visitData.weight_kg,
          blood_pressure_systolic: visitData.blood_pressure_systolic,
          blood_pressure_diastolic: visitData.blood_pressure_diastolic,
          fundal_height_cm: visitData.fundal_height_cm,
          presentation: visitData.presentation,
          fetal_heart_rate: visitData.fetal_heart_rate,
          urine_albumin: visitData.urine_albumin,
          urine_sugar: visitData.urine_sugar,
          edema: visitData.edema,
          edema_location: visitData.edema_location,
          remarks: visitData.remarks,
          complaints: visitData.complaints,
          clinical_notes: visitData.clinical_notes,
          treatment_given: visitData.treatment_given,
          next_visit_plan: visitData.next_visit_plan,
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

  const nextStep = () => {
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Helper functions for USG scans
  const addUSGScan = () => {
    const scans = formData.usg_scans || [];
    const newScan: USGScan = {
      scan_type: 'dating',
      date: new Date().toISOString().split('T')[0],
    };
    setFormData(prev => ({ ...prev, usg_scans: [...scans, newScan] }));
  };

  const updateUSGScan = (index: number, field: keyof USGScan, value: any) => {
    const scans = [...(formData.usg_scans || [])];
    scans[index] = { ...scans[index], [field]: value };
    setFormData(prev => ({ ...prev, usg_scans: scans }));
  };

  const removeUSGScan = (index: number) => {
    const scans = [...(formData.usg_scans || [])];
    scans.splice(index, 1);
    setFormData(prev => ({ ...prev, usg_scans: scans }));
  };

  // Helper functions for Doppler studies
  const addDopplerStudy = () => {
    const studies = formData.doppler_studies || [];
    const newStudy: DopplerStudy = {
      date: new Date().toISOString().split('T')[0],
    };
    setFormData(prev => ({ ...prev, doppler_studies: [...studies, newStudy] }));
  };

  const updateDopplerStudy = (index: number, field: keyof DopplerStudy, value: any) => {
    const studies = [...(formData.doppler_studies || [])];
    studies[index] = { ...studies[index], [field]: value };
    setFormData(prev => ({ ...prev, doppler_studies: studies }));
  };

  const removeDopplerStudy = (index: number) => {
    const studies = [...(formData.doppler_studies || [])];
    studies.splice(index, 1);
    setFormData(prev => ({ ...prev, doppler_studies: studies }));
  };

  // Helper functions for NST tests
  const addNSTTest = () => {
    const tests = formData.nst_tests || [];
    const newTest: NSTTest = {
      date: new Date().toISOString().split('T')[0],
    };
    setFormData(prev => ({ ...prev, nst_tests: [...tests, newTest] }));
  };

  const updateNSTTest = (index: number, field: keyof NSTTest, value: any) => {
    const tests = [...(formData.nst_tests || [])];
    tests[index] = { ...tests[index], [field]: value };
    setFormData(prev => ({ ...prev, nst_tests: tests }));
  };

  const removeNSTTest = (index: number) => {
    const tests = [...(formData.nst_tests || [])];
    tests.splice(index, 1);
    setFormData(prev => ({ ...prev, nst_tests: tests }));
  };

  // Helper functions for referrals
  const addReferral = () => {
    const referrals = formData.referrals || [];
    const newReferral: Referral = {
      date: new Date().toISOString().split('T')[0],
      referred_to: '',
      reason: '',
    };
    setFormData(prev => ({ ...prev, referrals: [...referrals, newReferral] }));
  };

  const updateReferral = (index: number, field: keyof Referral, value: any) => {
    const referrals = [...(formData.referrals || [])];
    referrals[index] = { ...referrals[index], [field]: value };
    setFormData(prev => ({ ...prev, referrals: referrals }));
  };

  const removeReferral = (index: number) => {
    const referrals = [...(formData.referrals || [])];
    referrals.splice(index, 1);
    setFormData(prev => ({ ...prev, referrals: referrals }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // Review Pre-Consultation Data
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Review Pre-Consultation Data</h3>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">LMP:</span> {formData.lmp || 'Not provided'}
                </div>
                <div>
                  <span className="font-medium">EDD:</span> {formData.edd || 'Not provided'}
                </div>
                <div>
                  <span className="font-medium">Gestational Age:</span> {formData.gestational_age_weeks || 'Not calculated'} weeks
                </div>
                <div>
                  <span className="font-medium">GPLA:</span> G{formData.gravida || 0} P{formData.para || 0} L{formData.live || 0} A{formData.abortions || 0}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">Review the pre-consultation data and proceed to enter visit details.</p>
          </div>
        );

      case 2:
        // Visit Record
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Visit Record</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visit Number
                </label>
                <input
                  type="number"
                  value={visitData.visit_number || ''}
                  onChange={(e) => setVisitData(prev => ({ ...prev, visit_number: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visit Date
                </label>
                <input
                  type="date"
                  value={visitData.visit_date || ''}
                  onChange={(e) => setVisitData(prev => ({ ...prev, visit_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gestational Age (weeks)
                </label>
                <input
                  type="number"
                  value={visitData.gestational_age_weeks ?? ''}
                  onChange={(e) => setVisitData(prev => ({ ...prev, gestational_age_weeks: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={visitData.weight_kg ?? ''}
                  onChange={(e) => setVisitData(prev => ({ ...prev, weight_kg: e.target.value ? parseFloat(e.target.value) : null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Pressure (Systolic)
                </label>
                <input
                  type="number"
                  value={visitData.blood_pressure_systolic ?? ''}
                  onChange={(e) => setVisitData(prev => ({ ...prev, blood_pressure_systolic: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Systolic"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Pressure (Diastolic)
                </label>
                <input
                  type="number"
                  value={visitData.blood_pressure_diastolic ?? ''}
                  onChange={(e) => setVisitData(prev => ({ ...prev, blood_pressure_diastolic: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Diastolic"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fundal Height (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={visitData.fundal_height_cm ?? ''}
                  onChange={(e) => setVisitData(prev => ({ ...prev, fundal_height_cm: e.target.value ? parseFloat(e.target.value) : null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Presentation
                </label>
                <select
                  value={visitData.presentation || ''}
                  onChange={(e) => setVisitData(prev => ({ ...prev, presentation: e.target.value as 'cephalic' | 'breech' | 'transverse' | null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                >
                  <option value="">Select presentation</option>
                  <option value="cephalic">Cephalic</option>
                  <option value="breech">Breech</option>
                  <option value="transverse">Transverse</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fetal Heart Rate (FHR)
                </label>
                <input
                  type="number"
                  value={visitData.fetal_heart_rate ?? ''}
                  onChange={(e) => setVisitData(prev => ({ ...prev, fetal_heart_rate: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="beats/min"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urine Albumin
                </label>
                <select
                  value={visitData.urine_albumin || ''}
                  onChange={(e) => setVisitData(prev => ({ ...prev, urine_albumin: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="nil">Nil</option>
                  <option value="trace">Trace</option>
                  <option value="+">+</option>
                  <option value="++">++</option>
                  <option value="+++">+++</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urine Sugar
                </label>
                <select
                  value={visitData.urine_sugar || ''}
                  onChange={(e) => setVisitData(prev => ({ ...prev, urine_sugar: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="nil">Nil</option>
                  <option value="trace">Trace</option>
                  <option value="+">+</option>
                  <option value="++">++</option>
                  <option value="+++">+++</option>
                </select>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={visitData.edema || false}
                    onChange={(e) => setVisitData(prev => ({ ...prev, edema: e.target.checked || null }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Edema Present</span>
                </label>
                {visitData.edema && (
                  <input
                    type="text"
                    value={visitData.edema_location || ''}
                    onChange={(e) => setVisitData(prev => ({ ...prev, edema_location: e.target.value || null }))}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                    placeholder="Location of edema..."
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks/Complaints
              </label>
              <textarea
                value={visitData.remarks || ''}
                onChange={(e) => setVisitData(prev => ({ ...prev, remarks: e.target.value || null }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Any remarks or complaints for this visit..."
              />
            </div>
          </div>
        );

      case 3:
        // USG Scans
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Ultrasound Scans</h3>
            {formData.usg_scans && formData.usg_scans.length > 0 ? (
              <div className="space-y-4">
                {formData.usg_scans.map((scan, index) => (
                  <div key={index} className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Scan Type
                        </label>
                        <select
                          value={scan.scan_type}
                          onChange={(e) => updateUSGScan(index, 'scan_type', e.target.value as USGScanType)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
                        >
                          <option value="dating">Dating Scan (6-10 weeks)</option>
                          <option value="nt_scan">NT Scan (11-14 weeks)</option>
                          <option value="anomaly">Anomaly Scan (18-22 weeks)</option>
                          <option value="growth1">Growth Scan 1 (28-30 weeks)</option>
                          <option value="growth2">Growth Scan 2 (34-36 weeks)</option>
                          <option value="growth3">Growth Scan 3 (38-40 weeks)</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date
                        </label>
                        <input
                          type="date"
                          value={scan.date}
                          onChange={(e) => updateUSGScan(index, 'date', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
                        />
                      </div>
                      {scan.scan_type === 'dating' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CRL (mm)
                          </label>
                          <input
                            type="number"
                            value={scan.crl ?? ''}
                            onChange={(e) => updateUSGScan(index, 'crl', e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
                            placeholder="Crown-Rump Length"
                          />
                        </div>
                      )}
                      {scan.scan_type === 'nt_scan' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            NT Thickness (mm)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={scan.nt_thickness ?? ''}
                            onChange={(e) => updateUSGScan(index, 'nt_thickness', e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
                            placeholder="Nuchal Translucency"
                          />
                        </div>
                      )}
                      {(scan.scan_type === 'growth1' || scan.scan_type === 'growth2' || scan.scan_type === 'growth3') && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              EFW (grams)
                            </label>
                            <input
                              type="number"
                              value={scan.efw ?? ''}
                              onChange={(e) => updateUSGScan(index, 'efw', e.target.value ? parseInt(e.target.value) : undefined)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
                              placeholder="Estimated Fetal Weight"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              AFI
                            </label>
                            <input
                              type="number"
                              value={scan.afi ?? ''}
                              onChange={(e) => updateUSGScan(index, 'afi', e.target.value ? parseFloat(e.target.value) : undefined)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
                              placeholder="Amniotic Fluid Index"
                            />
                          </div>
                        </>
                      )}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Findings
                        </label>
                        <textarea
                          value={scan.findings || ''}
                          onChange={(e) => updateUSGScan(index, 'findings', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent text-sm"
                          placeholder="Scan findings..."
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUSGScan(index)}
                      className="mt-2 text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove Scan
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No ultrasound scans recorded yet.</p>
            )}
            <button
              type="button"
              onClick={addUSGScan}
              className="px-4 py-2 bg-aneya-teal text-white rounded-lg hover:bg-aneya-teal/90 transition-colors text-sm"
            >
              + Add USG Scan
            </button>
          </div>
        );

      case 4:
        // Antepartum Surveillance (conditional - 28+ weeks)
        const gestationalAge = formData.gestational_age_weeks || 0;
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Antepartum Fetal Surveillance</h3>
            {gestationalAge >= 28 ? (
              <>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                  <h4 className="font-medium text-orange-900 text-sm mb-3">Doppler Studies</h4>
                  {formData.doppler_studies && formData.doppler_studies.length > 0 ? (
                    <div className="space-y-3">
                      {formData.doppler_studies.map((study, index) => (
                        <div key={index} className="bg-white p-3 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Date
                              </label>
                              <input
                                type="date"
                                value={study.date}
                                onChange={(e) => updateDopplerStudy(index, 'date', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Findings
                              </label>
                              <input
                                type="text"
                                value={study.findings || ''}
                                onChange={(e) => updateDopplerStudy(index, 'findings', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Overall findings"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDopplerStudy(index)}
                            className="mt-2 text-red-600 hover:text-red-800 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No Doppler studies recorded.</p>
                  )}
                  <button
                    type="button"
                    onClick={addDopplerStudy}
                    className="mt-3 px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm"
                  >
                    + Add Doppler Study
                  </button>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <h4 className="font-medium text-green-900 text-sm mb-3">NST (Non-Stress Test)</h4>
                  {formData.nst_tests && formData.nst_tests.length > 0 ? (
                    <div className="space-y-3">
                      {formData.nst_tests.map((test, index) => (
                        <div key={index} className="bg-white p-3 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Date
                              </label>
                              <input
                                type="date"
                                value={test.date}
                                onChange={(e) => updateNSTTest(index, 'date', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Result
                              </label>
                              <select
                                value={test.result || ''}
                                onChange={(e) => updateNSTTest(index, 'result', e.target.value as 'reactive' | 'non_reactive' | undefined)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="">Select</option>
                                <option value="reactive">Reactive</option>
                                <option value="non_reactive">Non-Reactive</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Notes
                              </label>
                              <input
                                type="text"
                                value={test.notes || ''}
                                onChange={(e) => updateNSTTest(index, 'notes', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Additional notes"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeNSTTest(index)}
                            className="mt-2 text-red-600 hover:text-red-800 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No NST tests recorded.</p>
                  )}
                  <button
                    type="button"
                    onClick={addNSTTest}
                    className="mt-3 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                  >
                    + Add NST Test
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-600 text-sm">
                  Antepartum surveillance is typically performed after 28 weeks of gestation.
                  Current gestational age: {gestationalAge} weeks.
                </p>
              </div>
            )}
          </div>
        );

      case 5:
        // Laboratory Investigations
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Laboratory Investigations</h3>
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <h4 className="font-medium text-red-900 text-sm mb-3">First Trimester</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Hemoglobin (g/dL)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.lab_investigations?.first_trimester?.hemoglobin ?? ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        lab_investigations: {
                          ...prev.lab_investigations,
                          first_trimester: {
                            ...prev.lab_investigations?.first_trimester,
                            hemoglobin: e.target.value ? parseFloat(e.target.value) : undefined,
                          },
                        },
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Blood Group
                    </label>
                    <select
                      value={formData.lab_investigations?.first_trimester?.blood_group || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        lab_investigations: {
                          ...prev.lab_investigations,
                          first_trimester: {
                            ...prev.lab_investigations?.first_trimester,
                            blood_group: e.target.value,
                          },
                        },
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Select</option>
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
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      VDRL
                    </label>
                    <input
                      type="text"
                      value={formData.lab_investigations?.first_trimester?.vdrl || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        lab_investigations: {
                          ...prev.lab_investigations,
                          first_trimester: {
                            ...prev.lab_investigations?.first_trimester,
                            vdrl: e.target.value,
                          },
                        },
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Positive/Negative"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      HIV
                    </label>
                    <input
                      type="text"
                      value={formData.lab_investigations?.first_trimester?.hiv || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        lab_investigations: {
                          ...prev.lab_investigations,
                          first_trimester: {
                            ...prev.lab_investigations?.first_trimester,
                            hiv: e.target.value,
                          },
                        },
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Positive/Negative"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      HBsAg
                    </label>
                    <input
                      type="text"
                      value={formData.lab_investigations?.first_trimester?.hbsag || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        lab_investigations: {
                          ...prev.lab_investigations,
                          first_trimester: {
                            ...prev.lab_investigations?.first_trimester,
                            hbsag: e.target.value,
                          },
                        },
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Positive/Negative"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Blood Sugar (mg/dL)
                    </label>
                    <input
                      type="number"
                      value={formData.lab_investigations?.first_trimester?.blood_sugar ?? ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        lab_investigations: {
                          ...prev.lab_investigations,
                          first_trimester: {
                            ...prev.lab_investigations?.first_trimester,
                            blood_sugar: e.target.value ? parseFloat(e.target.value) : undefined,
                          },
                        },
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <h4 className="font-medium text-green-900 text-sm mb-3">Second Trimester</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Hemoglobin (g/dL)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.lab_investigations?.second_trimester?.hemoglobin ?? ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        lab_investigations: {
                          ...prev.lab_investigations,
                          second_trimester: {
                            ...prev.lab_investigations?.second_trimester,
                            hemoglobin: e.target.value ? parseFloat(e.target.value) : undefined,
                          },
                        },
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      GTT (Glucose Tolerance Test)
                    </label>
                    <input
                      type="number"
                      value={formData.lab_investigations?.second_trimester?.gtt ?? ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        lab_investigations: {
                          ...prev.lab_investigations,
                          second_trimester: {
                            ...prev.lab_investigations?.second_trimester,
                            gtt: e.target.value ? parseFloat(e.target.value) : undefined,
                          },
                        },
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="mg/dL"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-medium text-blue-900 text-sm mb-3">Third Trimester</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Hemoglobin (g/dL)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.lab_investigations?.third_trimester?.hemoglobin ?? ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        lab_investigations: {
                          ...prev.lab_investigations,
                          third_trimester: {
                            ...prev.lab_investigations?.third_trimester,
                            hemoglobin: e.target.value ? parseFloat(e.target.value) : undefined,
                          },
                        },
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Blood Sugar (mg/dL)
                    </label>
                    <input
                      type="number"
                      value={formData.lab_investigations?.third_trimester?.blood_sugar ?? ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        lab_investigations: {
                          ...prev.lab_investigations,
                          third_trimester: {
                            ...prev.lab_investigations?.third_trimester,
                            blood_sugar: e.target.value ? parseFloat(e.target.value) : undefined,
                          },
                        },
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        // Birth Plan (conditional - 28+ weeks)
        const currentGA = formData.gestational_age_weeks || 0;
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Birth Plan</h3>
            {currentGA >= 28 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mode of Delivery
                    </label>
                    <select
                      value={formData.birth_plan?.mode_of_delivery || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        birth_plan: { ...prev.birth_plan, mode_of_delivery: e.target.value as any },
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                    >
                      <option value="">Select</option>
                      <option value="normal">Normal Vaginal Delivery</option>
                      <option value="elective_lscs">Elective LSCS</option>
                      <option value="emergency_lscs">Emergency LSCS</option>
                      <option value="instrumental">Instrumental</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IOL (Induction of Labour) Plan
                    </label>
                    <input
                      type="text"
                      value={formData.birth_plan?.iol_plan || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        birth_plan: { ...prev.birth_plan, iol_plan: e.target.value },
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                      placeholder="If induction needed..."
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.birth_plan?.epidural || false}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          birth_plan: { ...prev.birth_plan, epidural: e.target.checked },
                        }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">Epidural/Anesthesia</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Support Person in Labour
                    </label>
                    <input
                      type="text"
                      value={formData.birth_plan?.support_person || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        birth_plan: { ...prev.birth_plan, support_person: e.target.value },
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                      placeholder="Partner, family member..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Episiotomy Preference
                    </label>
                    <select
                      value={formData.birth_plan?.episiotomy || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        birth_plan: { ...prev.birth_plan, episiotomy: e.target.value as any },
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="as_needed">As Needed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Breast Feeding Plan
                    </label>
                    <input
                      type="text"
                      value={formData.birth_plan?.breastfeeding_plan || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        birth_plan: { ...prev.birth_plan, breastfeeding_plan: e.target.value },
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                      placeholder="Exclusive breastfeeding, formula, etc."
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-600 text-sm">
                  Birth plan is typically discussed after 28 weeks of gestation.
                  Current gestational age: {currentGA} weeks.
                </p>
              </div>
            )}
          </div>
        );

      case 7:
        // Plan of Management
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Plan of Management</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan for Mother
                </label>
                <textarea
                  value={formData.plan_mother || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, plan_mother: e.target.value || null }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Medical management plan, medications, lifestyle advice, admission if high-risk..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan for Fetus
                </label>
                <textarea
                  value={formData.plan_fetus || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, plan_fetus: e.target.value || null }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Monitoring plan, growth assessment schedule, next USG scan date..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admission Date (if high-risk)
                  </label>
                  <input
                    type="date"
                    value={formData.admission_date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, admission_date: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Follow-up Plan
                  </label>
                  <input
                    type="text"
                    value={formData.followup_plan || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, followup_plan: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                    placeholder="Next visit schedule..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Post-Partum Visit Plan
                </label>
                <textarea
                  value={formData.postpartum_visits || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, postpartum_visits: e.target.value || null }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Post-delivery follow-up schedule..."
                />
              </div>
            </div>
          </div>
        );

      case 8:
        // Referrals
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Referrals</h3>
            {formData.referrals && formData.referrals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Referred To</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.referrals.map((ref, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={ref.date}
                            onChange={(e) => updateReferral(index, 'date', e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={ref.referred_to}
                            onChange={(e) => updateReferral(index, 'referred_to', e.target.value)}
                            className="w-40 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Specialist/Hospital"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={ref.reason}
                            onChange={(e) => updateReferral(index, 'reason', e.target.value)}
                            className="w-48 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Reason for referral"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={ref.outcome || ''}
                            onChange={(e) => updateReferral(index, 'outcome', e.target.value)}
                            className="w-40 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Follow-up outcome"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeReferral(index)}
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
              <p className="text-gray-500 text-sm">No referrals recorded yet.</p>
            )}
            <button
              type="button"
              onClick={addReferral}
              className="px-4 py-2 bg-aneya-teal text-white rounded-lg hover:bg-aneya-teal/90 transition-colors text-sm"
            >
              + Add Referral
            </button>

            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-2">Clinical Notes (This Visit)</h4>
              <textarea
                value={visitData.clinical_notes || ''}
                onChange={(e) => setVisitData(prev => ({ ...prev, clinical_notes: e.target.value || null }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                placeholder="Doctor's clinical notes for this visit..."
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Progress Indicator */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 mx-1 rounded ${
                  step <= currentStep ? 'bg-aneya-teal' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="mt-2 text-center text-sm text-gray-600">
            Step {currentStep} of 8
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 min-h-[400px]">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Previous
              </button>
            )}
            {currentStep < 8 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-aneya-teal text-white rounded-lg font-medium hover:bg-aneya-teal/90 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-aneya-teal text-white rounded-lg font-medium hover:bg-aneya-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Complete Form'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
