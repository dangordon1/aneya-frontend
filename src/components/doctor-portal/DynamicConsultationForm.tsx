import { useState, useEffect } from 'react';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/survey-core.min.css';
import { consultationEventBus } from '../../lib/consultationEventBus';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Custom CSS for Aneya styling
const surveyStyles = `
  .sd-root-modern {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    color: #0c3555 !important;
  }

  .sd-root-modern .sd-title,
  .sd-root-modern .sd-page__title,
  .sd-root-modern .sd-question__title {
    font-family: Georgia, 'Times New Roman', serif !important;
    color: #0c3555 !important;
  }

  .sd-root-modern .sd-body,
  .sd-root-modern .sd-question,
  .sd-root-modern .sd-input,
  .sd-root-modern .sd-text {
    color: #0c3555 !important;
  }

  .sd-root-modern .sd-input {
    border-color: #d1d5db !important;
    font-family: 'Inter', sans-serif !important;
  }

  .sd-root-modern .sd-input:focus {
    border-color: #1d9e99 !important;
    ring-color: #1d9e99 !important;
  }

  /* Hide progress bar */
  .sd-progress {
    display: none !important;
  }

  /* Style the complete button */
  .sd-btn {
    background-color: #1d9e99 !important;
    color: white !important;
    border: none !important;
  }

  .sd-btn:hover {
    background-color: #178f8a !important;
  }
`;

// Aneya theme for SurveyJS
const aneyaTheme = {
  cssVariables: {
    '--primary': '#1d9e99', // aneya-teal
    '--primary-light': '#42c2bd',
    '--background': '#f6f5ee', // aneya-cream
    '--background-dim': '#ffffff',
    '--foreground': '#0c3555', // aneya-navy
    '--base-unit': '8px',
  },
};

interface DynamicConsultationFormProps {
  formType: string; // Fully dynamic - any form type from database
  patientId: string;
  appointmentId: string;
  onComplete?: () => void;
  onBack?: () => void;
  filledBy?: 'patient' | 'doctor';
  doctorUserId?: string;
  displayMode?: 'wizard' | 'flat';
}

export function DynamicConsultationForm({
  formType,
  patientId,
  appointmentId,
  onComplete,
  onBack,
  filledBy = 'doctor',
  doctorUserId,
}: DynamicConsultationFormProps) {
  const [survey, setSurvey] = useState<Model | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  // Inject custom CSS for Aneya styling
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.id = 'aneya-survey-styles';
    styleElement.textContent = surveyStyles;
    document.head.appendChild(styleElement);

    return () => {
      const existingStyle = document.getElementById('aneya-survey-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  // Convert backend schema to SurveyJS format
  const convertToSurveyJS = (backendSchema: any): any => {
    const elements: any[] = [];

    // Sort sections by order field
    const sortedSections = Object.entries(backendSchema as Record<string, any>)
      .sort(([, a]: [string, any], [, b]: [string, any]) => {
        const orderA = a.order || 999;
        const orderB = b.order || 999;
        return orderA - orderB;
      });

    for (const [sectionName, sectionDef] of sortedSections) {
      // NEW: Database schema has fields as ARRAY, not object
      if (Array.isArray(sectionDef.fields)) {
        // Section with fields array - create a panel
        const nestedElements = sectionDef.fields.map((field: any) => {
          const fieldPath = `${sectionName}.${field.name}`;
          return convertFieldToElement(fieldPath, field);
        });

        elements.push({
          type: 'panel',
          name: sectionName,
          title: sectionDef.description || sectionName,
          elements: nestedElements,
        });
      } else if (sectionDef.type === 'object' && sectionDef.fields) {
        // OLD FORMAT: Nested object with fields as dictionary (backwards compatibility)
        const nestedElements = Object.entries(sectionDef.fields).map(([nestedFieldName, nestedFieldDef]: [string, any]) => {
          return convertFieldToElement(`${sectionName}.${nestedFieldName}`, nestedFieldDef);
        });

        elements.push({
          type: 'panel',
          name: sectionName,
          title: sectionDef.description || sectionName,
          elements: nestedElements,
        });
      } else {
        // Simple field (top-level)
        elements.push(convertFieldToElement(sectionName, sectionDef));
      }
    }

    return {
      showProgressBar: 'off',
      showQuestionNumbers: 'off',
      pages: [
        {
          name: 'page1',
          elements: elements,
        },
      ],
    };
  };

  const convertFieldToElement = (fieldName: string, fieldDef: any): any => {
    const element: any = {
      name: fieldName,
      title: fieldDef.label || fieldDef.description || fieldName,  // NEW: Use label first, then description
      isRequired: fieldDef.required || false,
    };

    // Handle special input types first
    if (fieldDef.input_type) {
      switch (fieldDef.input_type) {
        case 'dropdown':
          element.type = 'dropdown';
          element.choices = fieldDef.options || [];
          if (fieldDef.placeholder) {
            element.placeholder = fieldDef.placeholder;
          }
          return element;

        case 'radio':
          element.type = 'radiogroup';
          element.choices = fieldDef.options || [];
          return element;

        case 'checkbox':
          // For boolean fields, use SurveyJS 'boolean' type (single true/false checkbox)
          if (fieldDef.type === 'boolean') {
            element.type = 'boolean';
            return element;
          }
          // For multi-select checkboxes, use 'checkbox' type with choices
          element.type = 'checkbox';
          element.choices = fieldDef.options || [];
          return element;

        case 'multi-select':
          element.type = 'tagbox';
          element.choices = fieldDef.options || [];
          if (fieldDef.placeholder) {
            element.placeholder = fieldDef.placeholder;
          }
          return element;

        case 'rating':
          element.type = 'rating';
          element.rateMax = fieldDef.max_rating || 5;
          element.rateMin = fieldDef.min_rating || 1;
          return element;

        case 'textarea':
          element.type = 'comment';
          element.rows = 4;
          return element;

        case 'text_short':
          element.type = 'text';
          return element;

        case 'number':
          element.type = 'text';
          element.inputType = 'number';
          return element;

        case 'date':
          element.type = 'text';
          element.inputType = 'date';
          return element;

        case 'table':
        case 'table_transposed':
          // Render as SurveyJS matrixdynamic (editable table with add/remove rows)
          element.type = 'matrixdynamic';
          element.rowCount = 0; // Start with 0 rows, user can add
          element.addRowText = 'Add Visit';
          element.removeRowText = 'Remove';

          // Build columns from row_fields
          const columns = (fieldDef.row_fields || []).map((rowField: any) => {
            const col: any = {
              name: rowField.name,
              title: rowField.label || rowField.name,
              cellType: 'text', // default
            };

            // Map field types to SurveyJS cell types
            switch (rowField.input_type || rowField.type) {
              case 'date':
                col.cellType = 'text';
                col.inputType = 'date';
                break;
              case 'number':
                col.cellType = 'text';
                col.inputType = 'number';
                break;
              case 'textarea':
                col.cellType = 'comment';
                col.rows = 2;
                break;
              case 'dropdown':
                col.cellType = 'dropdown';
                col.choices = rowField.options || [];
                break;
              case 'checkbox':
                col.cellType = 'checkbox';
                break;
              case 'boolean':
                col.cellType = 'boolean';
                break;
              default:
                col.cellType = 'text';
            }

            return col;
          });

          element.columns = columns;
          return element;
      }
    }

    // Handle standard types
    switch (fieldDef.type) {
      case 'string':
        if (fieldDef.format === 'date') {
          element.type = 'text';
          element.inputType = 'date';
        } else if (fieldDef.max_length && fieldDef.max_length > 200) {
          element.type = 'comment';
          element.rows = 4;
        } else {
          element.type = 'text';
        }
        break;
      case 'number':
        element.type = 'text';
        element.inputType = 'number';
        if (fieldDef.range) {
          element.min = fieldDef.range[0];
          element.max = fieldDef.range[1];
        }
        break;
      case 'boolean':
        element.type = 'boolean';
        break;
      default:
        element.type = 'text';
    }

    return element;
  };

  // Fetch schema from backend
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/api/form-schema/${formType}`);
        const data = await response.json();

        console.log(`📊 Fetched ${formType} schema from database:`, data);

        // Extract title from schema metadata or generate from form_type
        const title = data.title ||
                     data.description ||
                     formType.split('_').map((word: string) =>
                       word.charAt(0).toUpperCase() + word.slice(1)
                     ).join(' ') + ' Consultation';

        setFormTitle(title);

        const surveyJSON = convertToSurveyJS(data.schema);
        const surveyModel = new Model(surveyJSON);

        // Apply Aneya theme
        surveyModel.applyTheme(aneyaTheme);

        // Handle survey completion
        surveyModel.onComplete.add((sender: Model) => {
          handleSubmit(sender.data);
        });

        // Auto-save on value changes
        surveyModel.onValueChanged.add((sender: Model) => {
          handleAutoSave(sender.data);
        });

        setSurvey(surveyModel);
      } catch (error) {
        console.error('❌ Failed to fetch schema:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchema();
  }, [formType]);

  // Fetch existing form data
  useEffect(() => {
    if (!survey) return;

    const fetchFormData = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/consultation-form?appointment_id=${appointmentId}&form_type=${formType}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.form) {
            console.log(`📝 Loaded existing form:`, data.form);
            setFormId(data.form.id);
            survey.data = data.form.form_data || {};
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch form data:', error);
      }
    };

    fetchFormData();
  }, [appointmentId, formType, survey]);

  // Subscribe to auto-fill events
  useEffect(() => {
    console.log(`🔔 Dynamic Form: Subscribing to diarization events for ${formType}`);

    const subscription = consultationEventBus.subscribe('diarization_chunk_complete', (event) => {
      if (event.form_type === formType && event.patient_id === patientId && survey) {
        console.log(`✅ Dynamic Form: Processing auto-fill for ${formType}`);

        if (event.field_updates && Object.keys(event.field_updates).length > 0) {
          console.log(`📝 Applying ${Object.keys(event.field_updates).length} field updates:`, event.field_updates);

          // Merge auto-filled data into survey
          survey.mergeData(event.field_updates);

          // Track auto-filled fields
          setAutoFilledFields((prev) => {
            const updated = new Set(prev);
            Object.keys(event.field_updates).forEach((key) => updated.add(key));
            return updated;
          });
        }
      }
    });

    return () => {
      console.log(`🔕 Dynamic Form: Unsubscribing from diarization events`);
      subscription.unsubscribe();
    };
  }, [formType, patientId, survey]);

  // Auto-save debounced
  let autoSaveTimer: NodeJS.Timeout | null = null;

  const handleAutoSave = async (data: any) => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    autoSaveTimer = setTimeout(async () => {
      try {
        const payload = {
          patient_id: patientId,
          appointment_id: appointmentId,
          form_type: formType,
          form_data: data,
          status: 'draft',
          created_by: doctorUserId,
          updated_by: doctorUserId,
          filled_by: filledBy === 'doctor' ? doctorUserId : null,
        };

        const url = formId
          ? `${API_URL}/api/consultation-form/${formId}`
          : `${API_URL}/api/consultation-form`;

        const method = formId ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const responseData = await response.json();
          if (!formId) {
            setFormId(responseData.form.id);
          }
          console.log(`💾 Auto-saved ${formType} form`);
        }
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, 2000);
  };

  const handleSubmit = async (submittedData: any) => {
    try {
      const payload = {
        patient_id: patientId,
        appointment_id: appointmentId,
        form_type: formType,
        form_data: submittedData,
        status: 'completed',
        created_by: doctorUserId,
        updated_by: doctorUserId,
        filled_by: filledBy === 'doctor' ? doctorUserId : null,
      };

      const url = formId
        ? `${API_URL}/api/consultation-form/${formId}`
        : `${API_URL}/api/consultation-form`;

      const method = formId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`✅ Submitted ${formType} form`);
        onComplete?.();
      }
    } catch (error) {
      console.error('❌ Submit failed:', error);
    }
  };

  if (isLoading || !survey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-aneya-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aneya-navy mx-auto mb-4"></div>
          <p className="text-aneya-navy">Loading form schema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aneya-cream p-8">
      <div className="max-w-4xl mx-auto">
        {/* Form Title - Dynamic from schema */}
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-[24px] font-bold text-aneya-navy">
            {formTitle}
          </h2>
        </div>

        {/* SurveyJS Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <Survey model={survey} />

          {/* Back button */}
          {onBack && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          )}
        </div>

        {/* Auto-fill indicator */}
        {autoFilledFields.size > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              ✨ {autoFilledFields.size} field(s) auto-filled from consultation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
