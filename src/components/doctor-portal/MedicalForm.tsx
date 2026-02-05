import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Download } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { consultationEventBus } from '../../lib/consultationEventBus';
import { generateSampleFormData } from '../../utils/formSampleData';
import { FormPdfDocument } from './FormPdfPreview';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// --- Type definitions ---

interface FormField {
  name: string;
  label?: string;
  type?: string;
  input_type?: string;
  options?: Array<string | { value: string; label: string }>;
  choices?: string[];
  required?: boolean;
  row_fields?: FormField[];
  data_source?: {
    table: string;
    filters?: Record<string, string>;
    order_by?: { field: string; ascending?: boolean };
    field_mapping?: Record<string, string>;
  };
}

interface FormSection {
  description?: string;
  order?: number;
  fields?: FormField[];
}

interface ClinicBranding {
  clinic_name?: string | null;
  clinic_logo_url?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  text_color?: string | null;
  light_gray_color?: string | null;
}

interface MedicalFormProps {
  formSchema?: Record<string, FormSection>;
  formType?: string;
  formName: string;
  specialty: string;
  clinicName?: string;
  clinicBranding?: ClinicBranding;
  mode: 'editable' | 'readonly' | 'preview';
  initialData?: Record<string, Record<string, any>>;
  onDataChange?: (data: Record<string, Record<string, any>>) => void;
  patientId?: string;
  appointmentId?: string;
  formId?: string;
  enableAutoSave?: boolean;
  enableAutoFill?: boolean;
  enablePdfDownload?: boolean;
  doctorUserId?: string;
  filledBy?: 'patient' | 'doctor';
  onComplete?: () => void;
  onBack?: () => void;
}

// --- Helpers ---

const formatSectionName = (name: string): string =>
  name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const formatFieldLabel = (field: FormField): string =>
  field.label || field.name?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Field';

const getOptionLabel = (opt: string | { value: string; label: string }): string =>
  typeof opt === 'object' ? opt.label : opt;

const getOptionValue = (opt: string | { value: string; label: string }): string =>
  typeof opt === 'object' ? opt.value : opt;

// --- Component ---

export function MedicalForm({
  formSchema: externalSchema,
  formType,
  formName,
  specialty: _specialty,
  clinicName = 'Healthcare Medical Center',
  clinicBranding,
  mode,
  initialData,
  onDataChange,
  patientId,
  appointmentId,
  formId: externalFormId,
  enableAutoSave = false,
  enableAutoFill = false,
  enablePdfDownload = false,
  doctorUserId,
  filledBy = 'doctor',
  onComplete,
  onBack,
}: MedicalFormProps) {
  const [schema, setSchema] = useState<Record<string, FormSection> | null>(externalSchema || null);
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [formId, setFormId] = useState<string | null>(externalFormId || null);
  const [isLoading, setIsLoading] = useState(!externalSchema);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [formTitle, setFormTitle] = useState<string>(formName);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // If externalSchema changes, update
  useEffect(() => {
    if (externalSchema) {
      setSchema(externalSchema);
      setIsLoading(false);
    }
  }, [externalSchema]);

  // --- Fetch schema from backend when formType provided ---
  useEffect(() => {
    if (externalSchema || !formType) return;

    const fetchSchema = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch(`${API_URL}/api/form-schema/${formType}`);
        const data = await response.json();

        if (!response.ok || data.detail) {
          setLoadError(data.detail || `Failed to load ${formType} form`);
          return;
        }

        if (!data.schema) {
          setLoadError(`No schema found for form type: ${formType}`);
          return;
        }

        const title = formType.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Consultation';
        setFormTitle(title);
        setSchema(data.schema);
      } catch (error) {
        setLoadError(`Error loading form: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    fetchSchema();
  }, [formType, externalSchema]);

  // --- Initialize form data ---
  useEffect(() => {
    if (!schema) return;

    if (mode === 'preview') {
      // Preview mode: use sample data
      const sampleData = generateSampleFormData(schema);
      setFormData(sampleData);
    } else if (initialData && Object.keys(initialData).length > 0) {
      setFormData(initialData);
    }
  }, [schema, mode, initialData]);

  // --- Load existing form data from backend ---
  useEffect(() => {
    if (!schema || !appointmentId || !formType || mode === 'preview') return;

    const fetchFormData = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/consultation-form?appointment_id=${appointmentId}&form_type=${formType}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.form) {
            if (isMountedRef.current) setFormId(data.form.id);
            const existingData = data.form.form_data || {};
            if (Object.keys(existingData).length > 0) {
              // Convert flat dotted keys to nested structure
              const nested = unflattenFormData(existingData, schema);
              setFormData(prev => mergeFormData(prev, nested));
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch form data:', error);
      }
    };

    fetchFormData();
  }, [appointmentId, formType, schema, mode]);

  // --- Populate external data sources for table fields ---
  useEffect(() => {
    if (!schema || mode === 'preview') return;

    const populateExternalDataSources = async () => {
      try {
        const { supabase } = await import('../../lib/supabase');

        for (const [sectionName, sectionDef] of Object.entries(schema)) {
          if (!Array.isArray(sectionDef.fields)) continue;

          for (const field of sectionDef.fields) {
            if (!field.data_source || (field.input_type !== 'table' && field.input_type !== 'table_transposed')) continue;

            const { table: tableName, filters = {}, order_by: orderBy, field_mapping: fieldMapping = {} } = field.data_source;

            let query = supabase.from(tableName).select('*');

            for (const [filterKey, filterValue] of Object.entries(filters)) {
              let actualValue: string = filterValue;
              if (typeof filterValue === 'string' && filterValue.includes('{{')) {
                actualValue = filterValue
                  .replace('{{patient_id}}', patientId || '')
                  .replace('{{appointment_id}}', appointmentId || '');
              }
              query = query.eq(filterKey, actualValue);
            }

            if (orderBy) {
              query = query.order(orderBy.field, { ascending: orderBy.ascending !== false });
            }

            const { data: records, error } = await query;
            if (error || !records?.length) continue;

            const transformedRecords = records.map(record => {
              if (Object.keys(fieldMapping).length > 0) {
                const transformed: Record<string, any> = {};
                for (const [targetField, sourceField] of Object.entries(fieldMapping)) {
                  transformed[targetField] = record[sourceField];
                }
                return transformed;
              }
              return record;
            });

            setFormData(prev => ({
              ...prev,
              [sectionName]: {
                ...prev[sectionName],
                [field.name]: transformedRecords,
              },
            }));
          }
        }
      } catch (error) {
        console.error('Failed to populate external data sources:', error);
      }
    };

    const timer = setTimeout(populateExternalDataSources, 500);
    return () => clearTimeout(timer);
  }, [schema, patientId, appointmentId, mode]);

  // --- Auto-fill subscription ---
  useEffect(() => {
    if (!enableAutoFill || !formType || !patientId || mode === 'preview') return;

    const subscription = consultationEventBus.subscribe('diarization_chunk_complete', (event) => {
      if (event.form_type === formType && event.patient_id === patientId) {
        if (event.field_updates && Object.keys(event.field_updates).length > 0) {
          const nested = unflattenFormData(event.field_updates, schema);
          setFormData(prev => mergeFormData(prev, nested));
          setAutoFilledFields(prev => {
            const updated = new Set(prev);
            Object.keys(event.field_updates).forEach((key: string) => updated.add(key));
            return updated;
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [enableAutoFill, formType, patientId, schema, mode]);

  // --- Auto-save ---
  const handleAutoSave = useCallback((data: Record<string, Record<string, any>>) => {
    if (!enableAutoSave || !appointmentId || !formType || mode === 'preview') return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        if (isMountedRef.current) setIsSaving(true);

        const flatData = flattenFormData(data);
        const payload = {
          patient_id: patientId,
          appointment_id: appointmentId,
          form_type: formType,
          form_data: flatData,
          status: 'draft',
          created_by: doctorUserId,
          updated_by: doctorUserId,
          filled_by: filledBy === 'doctor' ? doctorUserId : null,
        };

        const url = formId
          ? `${API_URL}/api/consultation-form/${formId}`
          : `${API_URL}/api/consultation-form`;

        const response = await fetch(url, {
          method: formId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const responseData = await response.json();
          if (!formId && isMountedRef.current) {
            setFormId(responseData.form.id);
          }
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        if (isMountedRef.current) setIsSaving(false);
      }
    }, 2000);
  }, [enableAutoSave, appointmentId, formType, formId, patientId, doctorUserId, filledBy, mode]);

  // --- Field change handler ---
  const handleFieldChange = useCallback((sectionName: string, fieldName: string, value: any) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          [fieldName]: value,
        },
      };
      onDataChange?.(updated);
      handleAutoSave(updated);
      return updated;
    });
  }, [onDataChange, handleAutoSave]);

  // --- Table row handlers ---
  const handleAddTableRow = useCallback((sectionName: string, fieldName: string, rowFields: FormField[]) => {
    setFormData(prev => {
      const existingRows = (prev[sectionName]?.[fieldName] as any[]) || [];
      const newRow: Record<string, string> = {};
      for (const rf of rowFields) {
        newRow[rf.name] = '';
      }
      const updated = {
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          [fieldName]: [...existingRows, newRow],
        },
      };
      handleAutoSave(updated);
      return updated;
    });
  }, [handleAutoSave]);

  const handleRemoveTableRow = useCallback((sectionName: string, fieldName: string, rowIndex: number) => {
    setFormData(prev => {
      const existingRows = [...((prev[sectionName]?.[fieldName] as any[]) || [])];
      existingRows.splice(rowIndex, 1);
      const updated = {
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          [fieldName]: existingRows,
        },
      };
      handleAutoSave(updated);
      return updated;
    });
  }, [handleAutoSave]);

  const handleTableCellChange = useCallback((sectionName: string, fieldName: string, rowIndex: number, cellName: string, value: any) => {
    setFormData(prev => {
      const existingRows = [...((prev[sectionName]?.[fieldName] as any[]) || [])];
      existingRows[rowIndex] = {
        ...existingRows[rowIndex],
        [cellName]: value,
      };
      const updated = {
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          [fieldName]: existingRows,
        },
      };
      handleAutoSave(updated);
      return updated;
    });
  }, [handleAutoSave]);

  // --- Submit handler ---
  const handleSubmit = async () => {
    if (!appointmentId || !formType) return;

    try {
      const flatData = flattenFormData(formData);
      const payload = {
        patient_id: patientId,
        appointment_id: appointmentId,
        form_type: formType,
        form_data: flatData,
        status: 'completed',
        created_by: doctorUserId,
        updated_by: doctorUserId,
        filled_by: filledBy === 'doctor' ? doctorUserId : null,
      };

      const url = formId
        ? `${API_URL}/api/consultation-form/${formId}`
        : `${API_URL}/api/consultation-form`;

      const response = await fetch(url, {
        method: formId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onComplete?.();
      }
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  // --- PDF download ---
  const handleDownloadPdf = async () => {
    if (!schema) return;

    setGeneratingPdf(true);
    try {
      const branding: ClinicBranding = clinicBranding || {
        clinic_name: clinicName,
      };

      const blob = await pdf(
        <FormPdfDocument
          schema={schema}
          formName={formTitle}
          clinicBranding={branding}
          formData={formData}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // --- Sorted sections ---
  const sortedSections = schema
    ? Object.entries(schema)
        .filter(([name]) => !['title', 'description', 'version', 'type'].includes(name))
        .sort(([, a], [, b]) => (a.order || 999) - (b.order || 999))
    : [];

  const isEditable = mode === 'editable' || mode === 'preview';

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-aneya-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aneya-navy mx-auto mb-4"></div>
          <p className="text-aneya-navy">Loading form schema...</p>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (loadError) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-aneya-cream p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-aneya-navy mb-2">Form Not Available</h3>
          <p className="text-gray-600 mb-4">{loadError}</p>
          {onBack && (
            <button onClick={onBack} className="px-4 py-2 bg-aneya-navy text-white rounded-lg hover:bg-opacity-90 transition-colors">
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!schema) return null;

  // --- Render ---
  return (
    <div className="min-h-full bg-[var(--medical-cream)]">
      <div className="max-w-[1200px] mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
        {/* Letterhead */}
        <div className="bg-[var(--medical-navy)] text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {clinicBranding?.clinic_logo_url ? (
                <img src={clinicBranding.clinic_logo_url} alt="Clinic Logo" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 bg-[var(--medical-teal)] rounded-full flex items-center justify-center">
                  <Activity className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl text-white">{clinicBranding?.clinic_name || clinicName}</h1>
                <p className="text-[var(--medical-cream)] mt-1 text-sm">Excellence in Patient Care</p>
              </div>
            </div>
            <div className="text-right text-sm text-[var(--medical-cream)] flex items-center gap-3">
              <div>
                <p>{mode === 'preview' ? 'Form Preview' : formTitle}</p>
                {mode === 'preview' && <p className="text-xs opacity-75">Sample data shown</p>}
              </div>
              {enablePdfDownload && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={generatingPdf}
                  className="px-3 py-2 bg-[var(--medical-teal)] text-white rounded-lg text-xs font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Download className={`w-3.5 h-3.5 ${generatingPdf ? 'animate-bounce' : ''}`} />
                  {generatingPdf ? 'Generating...' : 'PDF'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Form Title Bar */}
          <div className="border-b-2 border-[var(--medical-teal)] pb-4 mb-6">
            <h2 className="text-2xl text-[var(--medical-navy)]">
              {formTitle.replace(/_/g, ' ')}
            </h2>
          </div>

          {/* Saving indicator */}
          {isSaving && (
            <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 flex items-center gap-2">
              <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
              Saving...
            </div>
          )}

          {/* Auto-fill indicator */}
          {autoFilledFields.size > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                {autoFilledFields.size} field(s) auto-filled from consultation
              </p>
            </div>
          )}

          {/* Sections */}
          {sortedSections.map(([sectionName, sectionDef]) => (
            <div key={sectionName} className="mb-8">
              <h3 className="text-xl text-[var(--medical-navy)] mb-4 pb-2 border-b border-[var(--medical-sea-green)]">
                {formatSectionName(sectionName)}
              </h3>

              {Array.isArray(sectionDef.fields) && sectionDef.fields.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sectionDef.fields.map((field, idx) => {
                    const isTable = field.input_type === 'table' || field.input_type === 'table_transposed' || (field.type === 'array' && field.row_fields);

                    if (isTable) {
                      return (
                        <div key={`${sectionName}-${field.name || idx}`} className="md:col-span-2">
                          {renderTableField(field, sectionName)}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`${sectionName}-${field.name || idx}`}
                        className={field.type === 'textarea' || field.input_type === 'textarea' ? 'md:col-span-2' : ''}
                      >
                        {renderField(field, sectionName)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 italic">No fields in this section</p>
              )}
            </div>
          ))}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t-2 border-[var(--medical-teal)]">
            <div className="flex justify-between items-end">
              <div className="text-gray-500 text-sm">
                {mode === 'preview' ? (
                  <>
                    <p>This is a preview of how the form will appear during consultations.</p>
                    <p>Sample data is shown for demonstration purposes.</p>
                  </>
                ) : (
                  <p>All data is auto-saved as you type.</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[var(--medical-navy)] font-medium">Physician Signature</p>
                <div className="w-48 h-12 border-b-2 border-gray-400 mt-2"></div>
                <p className="text-gray-500 text-sm mt-1">Date: ____________</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
            )}
            {isEditable && mode !== 'preview' && appointmentId && (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-[var(--medical-teal)] text-white rounded-md hover:bg-opacity-90 transition-colors"
              >
                Save Form
              </button>
            )}
            {enablePdfDownload && (
              <button
                onClick={handleDownloadPdf}
                disabled={generatingPdf}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Download className={`w-4 h-4 ${generatingPdf ? 'animate-bounce' : ''}`} />
                {generatingPdf ? 'Generating...' : 'Download PDF'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // --- Render helpers ---

  function renderField(field: FormField, sectionName: string) {
    const fieldValue = formData[sectionName]?.[field.name] ?? '';
    const readOnly = mode === 'readonly';
    const rawFieldType = field.input_type || field.type || 'text';
    // Normalize: checkbox with no options + boolean type = boolean (Yes/No radios)
    const fieldType = (rawFieldType === 'checkbox' && field.type === 'boolean' &&
      !(field.options?.length || field.choices?.length)) ? 'boolean' : rawFieldType;

    return (
      <div>
        <label className="block text-[var(--medical-navy)] mb-2 font-medium">
          {formatFieldLabel(field)}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {fieldType === 'boolean' ? (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`${sectionName}-${field.name}`}
                checked={fieldValue === true || fieldValue === 'Yes' || fieldValue === 'true'}
                onChange={() => !readOnly && handleFieldChange(sectionName, field.name, true)}
                readOnly={readOnly}
                className="w-4 h-4 text-[var(--medical-teal)]"
              />
              <span className="text-[var(--medical-navy)]">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`${sectionName}-${field.name}`}
                checked={fieldValue === false || fieldValue === 'No' || fieldValue === 'false'}
                onChange={() => !readOnly && handleFieldChange(sectionName, field.name, false)}
                readOnly={readOnly}
                className="w-4 h-4 text-[var(--medical-teal)]"
              />
              <span className="text-[var(--medical-navy)]">No</span>
            </label>
          </div>
        ) : fieldType === 'textarea' ? (
          <textarea
            value={fieldValue}
            onChange={(e) => handleFieldChange(sectionName, field.name, e.target.value)}
            readOnly={readOnly}
            rows={3}
            className={`w-full px-4 py-2 border border-gray-300 rounded text-gray-700 ${
              readOnly ? 'bg-gray-50' : 'bg-white focus:border-[var(--medical-teal)] focus:ring-1 focus:ring-[var(--medical-teal)]'
            }`}
          />
        ) : fieldType === 'select' || fieldType === 'dropdown' ? (
          <select
            value={fieldValue}
            onChange={(e) => handleFieldChange(sectionName, field.name, e.target.value)}
            disabled={readOnly}
            className={`w-full px-4 py-2 border border-gray-300 rounded text-gray-700 ${
              readOnly ? 'bg-gray-50' : 'bg-white focus:border-[var(--medical-teal)]'
            }`}
          >
            <option value="">Select...</option>
            {(field.options || field.choices || []).map((opt, i) => (
              <option key={i} value={getOptionValue(opt as any)}>
                {getOptionLabel(opt as any)}
              </option>
            ))}
          </select>
        ) : fieldType === 'radio' ? (
          <div className="flex flex-wrap gap-3">
            {(field.options || field.choices || []).map((opt, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`${sectionName}-${field.name}`}
                  value={getOptionValue(opt as any)}
                  checked={fieldValue === getOptionValue(opt as any)}
                  onChange={(e) => !readOnly && handleFieldChange(sectionName, field.name, e.target.value)}
                  readOnly={readOnly}
                  className="w-4 h-4 text-[var(--medical-teal)]"
                />
                <span className="text-gray-700 text-sm">{getOptionLabel(opt as any)}</span>
              </label>
            ))}
          </div>
        ) : fieldType === 'checkbox' || fieldType === 'multi-select' || fieldType === 'multiselect' ? (
          <div className="flex flex-wrap gap-3">
            {(field.options || field.choices || []).map((opt, i) => {
              const val = getOptionValue(opt as any);
              const currentValues = Array.isArray(fieldValue) ? fieldValue : [];
              const isChecked = currentValues.includes(val);
              return (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (readOnly) return;
                      const newValues = isChecked
                        ? currentValues.filter((v: string) => v !== val)
                        : [...currentValues, val];
                      handleFieldChange(sectionName, field.name, newValues);
                    }}
                    className="w-4 h-4 text-[var(--medical-teal)]"
                  />
                  <span className="text-gray-700 text-sm">{getOptionLabel(opt as any)}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <input
            type={fieldType === 'date' ? 'date' : fieldType === 'number' ? 'number' : 'text'}
            value={fieldValue}
            onChange={(e) => handleFieldChange(sectionName, field.name, e.target.value)}
            readOnly={readOnly}
            className={`w-full px-4 py-2 border border-gray-300 rounded text-gray-700 ${
              readOnly ? 'bg-gray-50' : 'bg-white focus:border-[var(--medical-teal)] focus:ring-1 focus:ring-[var(--medical-teal)]'
            }`}
          />
        )}
      </div>
    );
  }

  function renderTableField(field: FormField, sectionName: string) {
    const rows = (formData[sectionName]?.[field.name] as any[]) || [];
    const rowFields = field.row_fields || [];
    const readOnly = mode === 'readonly';

    return (
      <div>
        <label className="block text-[var(--medical-navy)] mb-2 font-medium">
          {formatFieldLabel(field)}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-[var(--medical-navy)] text-white">
              <tr>
                {rowFields.map((rf, i) => (
                  <th key={i} className="px-3 py-2 text-left font-medium">
                    {rf.label || formatFieldLabel(rf)}
                  </th>
                ))}
                {isEditable && !readOnly && <th className="px-3 py-2 w-16"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className={rowIdx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                  {rowFields.map((rf, colIdx) => (
                    <td key={colIdx} className="px-3 py-2">
                      {readOnly ? (
                        <span className="text-gray-700">{row[rf.name] || '-'}</span>
                      ) : (
                        <input
                          type={rf.type === 'date' || rf.input_type === 'date' ? 'date' : rf.type === 'number' || rf.input_type === 'number' ? 'number' : 'text'}
                          value={row[rf.name] || ''}
                          onChange={(e) => handleTableCellChange(sectionName, field.name, rowIdx, rf.name, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:border-[var(--medical-teal)] focus:ring-1 focus:ring-[var(--medical-teal)]"
                        />
                      )}
                    </td>
                  ))}
                  {isEditable && !readOnly && (
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleRemoveTableRow(sectionName, field.name, rowIdx)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={rowFields.length + (isEditable && !readOnly ? 1 : 0)} className="px-3 py-4 text-center text-gray-400 italic">
                    No rows yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {isEditable && !readOnly && (
          <button
            onClick={() => handleAddTableRow(sectionName, field.name, rowFields)}
            className="mt-2 px-3 py-1.5 text-sm text-[var(--medical-teal)] border border-[var(--medical-teal)] rounded hover:bg-[var(--medical-teal)] hover:text-white transition-colors"
          >
            + Add Row
          </button>
        )}
      </div>
    );
  }
}

// --- Utility: convert flat dotted keys to nested form data ---
function unflattenFormData(flat: Record<string, any>, schema: Record<string, FormSection> | null): Record<string, Record<string, any>> {
  const nested: Record<string, Record<string, any>> = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    if (parts.length === 2) {
      // Flat dot-notation: "section.field" -> nest properly
      const [section, field] = parts;
      if (!nested[section]) nested[section] = {};
      nested[section][field] = value;
    } else if (parts.length === 1 && typeof value === 'object' && value !== null && !Array.isArray(value) && schema && key in schema) {
      // Already nested: key is a section name with an object value
      // This handles data stored in nested format by the backend auto-fill
      if (!nested[key]) nested[key] = {};
      Object.assign(nested[key], value);
    } else if (parts.length === 1 && schema) {
      // Try to find which section this field belongs to
      for (const [sectionName, sectionDef] of Object.entries(schema)) {
        if (Array.isArray(sectionDef.fields)) {
          const found = sectionDef.fields.find(f => f.name === key);
          if (found) {
            if (!nested[sectionName]) nested[sectionName] = {};
            nested[sectionName][key] = value;
            break;
          }
        }
      }
    }
  }

  return nested;
}

// --- Utility: flatten nested form data to dotted keys ---
function flattenFormData(nested: Record<string, Record<string, any>>): Record<string, any> {
  const flat: Record<string, any> = {};

  for (const [section, fields] of Object.entries(nested)) {
    if (fields && typeof fields === 'object') {
      for (const [field, value] of Object.entries(fields)) {
        flat[`${section}.${field}`] = value;
      }
    }
  }

  return flat;
}

// --- Utility: deep merge form data ---
function mergeFormData(
  base: Record<string, Record<string, any>>,
  incoming: Record<string, Record<string, any>>
): Record<string, Record<string, any>> {
  const result = { ...base };

  for (const [section, fields] of Object.entries(incoming)) {
    result[section] = {
      ...result[section],
      ...fields,
    };
  }

  return result;
}
