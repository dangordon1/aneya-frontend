import { useState, useEffect, useCallback } from 'react';
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import { consultationEventBus } from '../../lib/consultationEventBus';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  displayMode = 'flat',
}: DynamicConsultationFormProps) {
  const [schema, setSchema] = useState<RJSFSchema | null>(null);
  const [uiSchema, setUiSchema] = useState<UiSchema>({});
  const [formData, setFormData] = useState<any>({});
  const [formId, setFormId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  // Convert backend schema to JSON Schema format
  const convertToJSONSchema = (backendSchema: any): RJSFSchema => {
    const properties: any = {};
    const required: string[] = [];

    for (const [fieldName, fieldDef] of Object.entries(backendSchema as Record<string, any>)) {
      if (fieldDef.type === 'object' && fieldDef.fields) {
        // Nested object
        properties[fieldName] = convertToJSONSchema(fieldDef.fields);
      } else {
        // Simple field
        const fieldSchema: any = {
          title: fieldDef.description || fieldName,
        };

        switch (fieldDef.type) {
          case 'string':
            fieldSchema.type = 'string';
            if (fieldDef.format === 'date') {
              fieldSchema.format = 'date';
            }
            if (fieldDef.max_length) {
              fieldSchema.maxLength = fieldDef.max_length;
            }
            break;
          case 'number':
            fieldSchema.type = 'number';
            if (fieldDef.range) {
              fieldSchema.minimum = fieldDef.range[0];
              fieldSchema.maximum = fieldDef.range[1];
            }
            break;
          case 'boolean':
            fieldSchema.type = 'boolean';
            break;
          default:
            fieldSchema.type = 'string';
        }

        properties[fieldName] = fieldSchema;
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  };

  // Generate UI schema for better presentation
  const generateUISchema = (backendSchema: any): UiSchema => {
    const uiSchema: UiSchema = {};

    for (const [fieldName, fieldDef] of Object.entries(backendSchema as Record<string, any>)) {
      if (fieldDef.type === 'string' && fieldDef.max_length && fieldDef.max_length > 200) {
        // Use textarea for long text fields
        uiSchema[fieldName] = {
          'ui:widget': 'textarea',
          'ui:options': {
            rows: 4,
          },
        };
      }
    }

    return uiSchema;
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

        const jsonSchema = convertToJSONSchema(data.schema);
        const ui = generateUISchema(data.schema);

        setSchema(jsonSchema);
        setUiSchema(ui);
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
            setFormData(data.form.form_data || {});
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch form data:', error);
      }
    };

    fetchFormData();
  }, [appointmentId, formType]);

  // Subscribe to auto-fill events
  useEffect(() => {
    console.log(`🔔 Dynamic Form: Subscribing to diarization events for ${formType}`);

    const subscription = consultationEventBus.subscribe('diarization_chunk_complete', (event) => {
      if (event.form_type === formType && event.patient_id === patientId) {
        console.log(`✅ Dynamic Form: Processing auto-fill for ${formType}`);

        if (event.field_updates && Object.keys(event.field_updates).length > 0) {
          console.log(`📝 Applying ${Object.keys(event.field_updates).length} field updates:`, event.field_updates);

          // Merge auto-filled data into form
          setFormData((prev: any) => ({
            ...prev,
            ...event.field_updates,
          }));

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
  }, [formType, patientId]);

  // Auto-save debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(formData).length > 0) {
        handleAutoSave();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [formData]);

  const handleAutoSave = async () => {
    try {
      const payload = {
        patient_id: patientId,
        appointment_id: appointmentId,
        form_type: formType,
        form_data: formData,
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
        const data = await response.json();
        if (!formId) {
          setFormId(data.form.id);
        }
        console.log(`💾 Auto-saved ${formType} form`);
      }
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  };

  const handleSubmit = async ({ formData: submittedData }: any) => {
    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !schema) {
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

        {/* React JSON Schema Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <Form
            schema={schema}
            uiSchema={uiSchema}
            formData={formData}
            validator={validator}
            onChange={(e) => setFormData(e.formData)}
            onSubmit={handleSubmit}
            disabled={isSaving}
          >
            <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-aneya-teal text-white rounded-md hover:bg-aneya-teal/90 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Submit Form'}
              </button>
            </div>
          </Form>
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
