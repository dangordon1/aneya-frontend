import { useState, useEffect } from 'react';
import { Patient, CreatePatientInput, ConsultationLanguage, CONSULTATION_LANGUAGES } from '../types/database';

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: CreatePatientInput) => Promise<void>;
  patient?: Patient;
}

export function PatientFormModal({ isOpen, onClose, onSave, patient }: PatientFormModalProps) {
  const [formData, setFormData] = useState<CreatePatientInput>({
    name: '',
    sex: 'Male',
    date_of_birth: '',
    height_cm: undefined,
    weight_kg: undefined,
    current_medications: '',
    current_conditions: '',
    allergies: '',
    email: '',
    phone: '',
    consultation_language: 'en-IN',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name,
        sex: patient.sex,
        date_of_birth: patient.date_of_birth,
        height_cm: patient.height_cm ?? undefined,
        weight_kg: patient.weight_kg ?? undefined,
        current_medications: patient.current_medications || '',
        current_conditions: patient.current_conditions || '',
        allergies: patient.allergies || '',
        email: patient.email || '',
        phone: patient.phone || '',
        consultation_language: patient.consultation_language || 'en-IN',
      });
    } else {
      setFormData({
        name: '',
        sex: 'Male',
        date_of_birth: '',
        height_cm: undefined,
        weight_kg: undefined,
        current_medications: '',
        current_conditions: '',
        allergies: '',
        email: '',
        phone: '',
        consultation_language: 'en-IN',
      });
    }
    setErrors({});
  }, [patient, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.sex) {
      newErrors.sex = 'Sex is required';
    }

    if (!formData.date_of_birth) {
      newErrors.date_of_birth = 'Date of birth is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving patient:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof CreatePatientInput>(field: K, value: CreatePatientInput[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-4 sm:py-8 pt-16 sm:pt-8">
      <div className="bg-white rounded-[20px] p-4 sm:p-8 max-w-2xl w-full mx-4 my-auto max-h-[calc(100vh-5rem)] sm:max-h-[90vh] overflow-y-auto">
        <h2 className="text-[24px] sm:text-[28px] text-aneya-navy mb-4 sm:mb-6">
          {patient ? 'Edit Patient' : 'Create New Patient'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Name and Sex */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="name" className="block mb-1 text-[12px] text-gray-600">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={`w-full p-2 bg-gray-50 border ${
                  errors.name ? 'border-red-500' : 'border-gray-200'
                } rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy`}
                placeholder="Enter patient name"
              />
              {errors.name && <p className="text-red-500 text-[12px] mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="sex" className="block mb-1 text-[12px] text-gray-600">
                Sex <span className="text-red-500">*</span>
              </label>
              <select
                id="sex"
                value={formData.sex}
                onChange={(e) => updateField('sex', e.target.value as 'Male' | 'Female' | 'Other')}
                className={`w-full p-2 bg-gray-50 border ${
                  errors.sex ? 'border-red-500' : 'border-gray-200'
                } rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy`}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.sex && <p className="text-red-500 text-[12px] mt-1">{errors.sex}</p>}
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="date_of_birth" className="block mb-1 text-[12px] text-gray-600">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => updateField('date_of_birth', e.target.value)}
              className={`w-full p-2 bg-gray-50 border ${
                errors.date_of_birth ? 'border-red-500' : 'border-gray-200'
              } rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy`}
            />
            {errors.date_of_birth && (
              <p className="text-red-500 text-[12px] mt-1">{errors.date_of_birth}</p>
            )}
          </div>

          {/* Height and Weight */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="height" className="block mb-1 text-[12px] text-gray-600">
                Height (cm) <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="height"
                type="number"
                value={formData.height_cm || ''}
                onChange={(e) =>
                  updateField('height_cm', e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy"
                placeholder="e.g., 175"
              />
            </div>

            <div>
              <label htmlFor="weight" className="block mb-1 text-[12px] text-gray-600">
                Weight (kg) <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="weight"
                type="number"
                value={formData.weight_kg || ''}
                onChange={(e) =>
                  updateField('weight_kg', e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy"
                placeholder="e.g., 70"
              />
            </div>
          </div>

          {/* Consultation Language */}
          <div>
            <label htmlFor="consultation_language" className="block mb-1 text-[12px] text-gray-600">
              Consultation Language
            </label>
            <select
              id="consultation_language"
              value={formData.consultation_language || 'en-IN'}
              onChange={(e) => updateField('consultation_language', e.target.value as ConsultationLanguage)}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy"
            >
              {CONSULTATION_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            {formData.consultation_language === 'auto' ? (
              <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Reduced accuracy for Indian languages
              </p>
            ) : (
              <p className="text-[11px] text-gray-500 mt-1">
                Select the language used during consultations with this patient
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4 sm:mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-300 text-gray-700 rounded-[10px] font-medium text-[14px] hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-aneya-navy text-white rounded-[10px] font-medium text-[14px] hover:bg-opacity-90 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
