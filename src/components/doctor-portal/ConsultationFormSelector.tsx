import { useState, useEffect } from 'react';
import { DynamicConsultationForm } from './DynamicConsultationForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface FormSchema {
  id: string;
  form_type: string;
  specialty: string;
  version: number;
  description: string;
  is_active: boolean;
}

interface ConsultationFormSelectorProps {
  patientId: string;
  appointmentId: string;
  doctorUserId?: string;
  detectedFormType?: string;
  specialty?: string;
  onBack?: () => void;
}

// Format form_type to display name (e.g., "antenatal_2" -> "Antenatal 2")
const formatFormType = (formType: string): string => {
  return formType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Get display name from schema (use description if available, otherwise format form_type)
const getFormDisplayName = (form: FormSchema): string => {
  if (form.description && form.description.trim()) {
    return form.description;
  }
  return formatFormType(form.form_type);
};

export function ConsultationFormSelector({
  patientId,
  appointmentId,
  doctorUserId,
  detectedFormType,
  specialty = 'obstetrics_gynecology',
  onBack,
}: ConsultationFormSelectorProps) {
  const [availableForms, setAvailableForms] = useState<FormSchema[]>([]);
  const [selectedFormType, setSelectedFormType] = useState<string>(detectedFormType || '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available form schemas
  useEffect(() => {
    const fetchForms = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/api/form-schemas`);
        if (!response.ok) {
          throw new Error('Failed to fetch form schemas');
        }

        const data = await response.json();

        // Filter forms by specialty
        const formsForSpecialty = data.schemas.filter(
          (schema: FormSchema) => schema.specialty === specialty && schema.is_active
        );

        console.log(`📋 Found ${formsForSpecialty.length} forms for specialty ${specialty}:`,
          formsForSpecialty.map((f: FormSchema) => f.form_type));

        setAvailableForms(formsForSpecialty);

        // Set default selected form
        if (formsForSpecialty.length > 0) {
          // Try to use detected form type if it exists in available forms
          const detectedExists = formsForSpecialty.some(
            (f: FormSchema) => f.form_type === detectedFormType
          );

          if (detectedExists && detectedFormType) {
            setSelectedFormType(detectedFormType);
          } else {
            // Fall back to first available form
            setSelectedFormType(formsForSpecialty[0].form_type);
          }
        }
      } catch (err) {
        console.error('❌ Error fetching form schemas:', err);
        setError('Failed to load available forms');
      } finally {
        setIsLoading(false);
      }
    };

    fetchForms();
  }, [specialty, detectedFormType]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal mx-auto mb-4"></div>
          <p className="text-gray-600">Loading forms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700">{error}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (availableForms.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p className="text-yellow-700">No forms available for {formatFormType(specialty)}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-aneya-navy text-white rounded-lg hover:bg-opacity-90"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Form Type Tabs */}
      {availableForms.length > 1 && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-1" aria-label="Form types">
            {availableForms.map((form) => (
              <button
                key={form.id}
                onClick={() => setSelectedFormType(form.form_type)}
                className={`px-4 py-3 text-[14px] font-medium rounded-t-lg transition-colors ${
                  selectedFormType === form.form_type
                    ? 'bg-aneya-teal text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getFormDisplayName(form)}
                {form.form_type === detectedFormType && (
                  <span className="ml-2 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                    Detected
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Single Form Label (when only one form available) */}
      {availableForms.length === 1 && (
        <div className="mb-4">
          <span className="inline-block px-3 py-1 bg-aneya-teal/10 text-aneya-teal rounded-full text-[13px] font-medium">
            {getFormDisplayName(availableForms[0])} Form
          </span>
        </div>
      )}

      {/* Dynamic Form */}
      {selectedFormType && (
        <DynamicConsultationForm
          key={selectedFormType} // Force re-mount when form type changes
          formType={selectedFormType}
          patientId={patientId}
          appointmentId={appointmentId}
          doctorUserId={doctorUserId}
          displayMode="flat"
          onBack={onBack}
        />
      )}
    </div>
  );
}
