import { useState, useEffect } from 'react';
import { MedicalForm } from './MedicalForm';

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

// Get display name from schema (always use formatted form_type for tab display)
const getFormDisplayName = (form: FormSchema): string => {
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

        // If a detected form type is provided, only show that form (don't show all forms as tabs)
        if (detectedFormType) {
          const detectedForm = formsForSpecialty.find(
            (f: FormSchema) => f.form_type === detectedFormType
          );
          if (detectedForm) {
            console.log(`🎯 Using detected form type: ${detectedFormType}`);
            setAvailableForms([detectedForm]);
            setSelectedFormType(detectedFormType);
          } else {
            console.warn(`⚠️ Detected form type '${detectedFormType}' not found, showing all forms`);
            setAvailableForms(formsForSpecialty);
            if (formsForSpecialty.length > 0) {
              setSelectedFormType(formsForSpecialty[0].form_type);
            }
          }
        } else {
          // No detected form type - show all forms for the specialty
          setAvailableForms(formsForSpecialty);
          if (formsForSpecialty.length > 0) {
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

  // Always use only ONE form - never show tabs
  const formToDisplay = availableForms.find(f => f.form_type === selectedFormType) || availableForms[0];

  return (
    <div>
      {/* Single Form Label - always show just one form, never tabs */}
      {formToDisplay && (
        <div className="mb-4">
          <span className="inline-block px-3 py-1 bg-aneya-teal/10 text-aneya-teal rounded-full text-[13px] font-medium">
            {getFormDisplayName(formToDisplay)} Form
          </span>
        </div>
      )}

      {/* Dynamic Form - only one form ever displayed */}
      {formToDisplay && (
        <MedicalForm
          key={formToDisplay.form_type}
          formType={formToDisplay.form_type}
          formName={getFormDisplayName(formToDisplay)}
          specialty={specialty}
          mode="editable"
          patientId={patientId}
          appointmentId={appointmentId}
          doctorUserId={doctorUserId}
          enableAutoSave
          enableAutoFill
          enablePdfDownload
          onBack={onBack}
        />
      )}
    </div>
  );
}
