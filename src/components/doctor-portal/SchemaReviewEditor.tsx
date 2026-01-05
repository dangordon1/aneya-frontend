import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface SchemaReviewEditorProps {
  formName: string;
  specialty: string;
  initialSchema: Record<string, any>;
  initialPdfTemplate: Record<string, any>;
  description?: string;
  patientCriteria?: string;
  isPublic: boolean;
  logoInfo?: {
    has_logo: boolean;
    logo_position?: string;
    logo_description?: string;
    facility_name?: string;
    logo_url?: string;
  };
  onSave: (schema: any, pdfTemplate: any, metadata: { formName: string; specialty: string; description?: string; patientCriteria?: string; isPublic: boolean }) => Promise<void>;
  onCancel: () => void;
}

export function SchemaReviewEditor({
  formName: initialFormName,
  specialty: initialSpecialty,
  initialSchema,
  initialPdfTemplate,
  description: initialDescription,
  patientCriteria: initialPatientCriteria,
  isPublic: initialIsPublic,
  logoInfo,
  onSave,
  onCancel
}: SchemaReviewEditorProps) {
  const { doctorProfile } = useAuth();
  const [schema, setSchema] = useState(initialSchema);
  const [pdfTemplate, setPdfTemplate] = useState(initialPdfTemplate);
  const [formName, setFormName] = useState(initialFormName);
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [description, setDescription] = useState(initialDescription || '');
  const [patientCriteria, setPatientCriteria] = useState(initialPatientCriteria || '');
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Convert schema object to sections array for easier editing
  const sections = Object.entries(schema).map(([name, data]) => ({
    name,
    ...data as any
  }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(schema, pdfTemplate, {
        formName,
        specialty,
        description,
        patientCriteria,
        isPublic
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save form');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSection = (oldName: string, updated: any) => {
    const newSchema = { ...schema };
    delete newSchema[oldName];
    newSchema[updated.name] = {
      description: updated.description,
      fields: updated.fields,
      order: updated.order
    };
    setSchema(newSchema);
  };

  const handleDeleteSection = (sectionName: string) => {
    const newSchema = { ...schema };
    delete newSchema[sectionName];
    setSchema(newSchema);
  };

  const handleAddSection = () => {
    const newName = `new_section_${Object.keys(schema).length + 1}`;
    setSchema({
      ...schema,
      [newName]: {
        description: "New section",
        fields: [],
        order: Object.keys(schema).length + 1
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900">Review & Edit Form</h3>
        <p className="text-sm text-blue-700 mt-1">
          Edit form details and schema. All fields below are editable.
        </p>
      </div>

      {/* Extracted Logo Information */}
      {logoInfo && logoInfo.has_logo && (
        <div className="bg-aneya-navy border border-aneya-navy rounded-lg p-4">
          <h4 className="font-medium text-white text-sm mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Extracted Logo Information
          </h4>

          {/* Display extracted or clinic logo if available */}
          {(logoInfo.logo_url || doctorProfile?.clinic_logo_url) && (
            <div className="mb-4 flex justify-center">
              <div className="bg-white rounded-lg p-3 inline-block">
                <img
                  src={logoInfo.logo_url || doctorProfile?.clinic_logo_url || ''}
                  alt="Clinic Logo"
                  className="max-h-20 max-w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm">
            {logoInfo.facility_name && (
              <div className="flex items-start gap-2">
                <span className="text-gray-300 font-medium min-w-24">Facility:</span>
                <span className="text-white">{logoInfo.facility_name}</span>
              </div>
            )}
            {logoInfo.logo_description && (
              <div className="flex items-start gap-2">
                <span className="text-gray-300 font-medium min-w-24">Description:</span>
                <span className="text-white">{logoInfo.logo_description}</span>
              </div>
            )}
            {logoInfo.logo_position && (
              <div className="flex items-start gap-2">
                <span className="text-gray-300 font-medium min-w-24">Position:</span>
                <span className="text-white capitalize">{logoInfo.logo_position.replace('-', ' ')}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-300 mt-2 italic">
            {logoInfo.logo_url
              ? "Logo extracted from form and will be saved to your profile for use on PDFs"
              : doctorProfile?.clinic_logo_url
              ? "Your clinic logo will appear on generated PDFs"
              : "Logo detected - it will be extracted and saved when you save this form"}
          </p>
        </div>
      )}

      {/* Form Metadata - Editable Fields */}
      <div className="space-y-4 bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 text-sm">Form Details</h4>

        {/* Form Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Form Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g., neurology_assessment"
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use snake_case (lowercase letters, numbers, underscores only)
          </p>
        </div>

        {/* Specialty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Specialty <span className="text-red-500">*</span>
          </label>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          >
            <option value="">Select specialty...</option>
            <option value="cardiology">Cardiology</option>
            <option value="neurology">Neurology</option>
            <option value="pediatrics">Pediatrics</option>
            <option value="orthopedics">Orthopedics</option>
            <option value="dermatology">Dermatology</option>
            <option value="psychiatry">Psychiatry</option>
            <option value="internal_medicine">Internal Medicine</option>
            <option value="emergency_medicine">Emergency Medicine</option>
            <option value="surgery">Surgery</option>
            <option value="obstetrics_gynecology">Obstetrics & Gynecology</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this form is used for..."
            rows={2}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          />
        </div>

        {/* Patient Criteria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Patient Criteria (Optional)
          </label>
          <textarea
            value={patientCriteria}
            onChange={(e) => setPatientCriteria(e.target.value)}
            placeholder="Which patients or clinical scenarios is this form for? (e.g., 'Pregnant women in antenatal care between 12-40 weeks', 'Patients with neurological symptoms requiring initial assessment')"
            rows={3}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Helps AI select the right form when multiple forms are available for your specialty
          </p>
        </div>

        {/* Public Sharing */}
        <div className="flex items-start gap-3 bg-gray-50 p-3 rounded">
          <input
            type="checkbox"
            id="is_public_edit"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-aneya-teal focus:ring-aneya-teal"
          />
          <div>
            <label htmlFor="is_public_edit" className="text-sm font-medium text-gray-700">
              Make this form public
            </label>
            <p className="text-xs text-gray-500 mt-0.5">
              Allow other doctors to discover and use this form template
            </p>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Sections ({sections.length})</h4>
        {sections.map((section) => (
          <SectionCard
            key={section.name}
            section={section}
            onUpdate={(updated) => handleUpdateSection(section.name, updated)}
            onDelete={() => handleDeleteSection(section.name)}
          />
        ))}
      </div>

      {/* Add Section Button */}
      <button
        onClick={handleAddSection}
        className="w-full px-4 py-3 border-2 border-dashed border-aneya-teal text-aneya-teal rounded-lg hover:bg-aneya-teal hover:text-white transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Section
      </button>

      {/* Preview PDF Button */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <button
          onClick={async () => {
            try {
              const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
              const response = await fetch(`${API_URL}/api/custom-forms/preview-pdf`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  form_name: formName,
                  form_schema: schema,
                  pdf_template: pdfTemplate,
                  clinic_logo_url: doctorProfile?.clinic_logo_url || null,
                  clinic_name: doctorProfile?.clinic_name || null,
                  primary_color: doctorProfile?.primary_color || null,
                  accent_color: doctorProfile?.accent_color || null,
                  text_color: doctorProfile?.text_color || null,
                  light_gray_color: doctorProfile?.light_gray_color || null
                })
              });

              if (response.ok) {
                // Get PDF blob and open in new tab
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
              } else {
                const error = await response.json();
                alert(`Failed to generate PDF preview: ${error.detail || 'Unknown error'}`);
              }
            } catch (err) {
              console.error('PDF preview error:', err);
              alert('Failed to generate PDF preview. Please try again.');
            }
          }}
          className="w-full px-4 py-2 bg-aneya-teal text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium"
        >
          Preview PDF
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center italic">
          Preview how the form will appear as a PDF with your clinic logo
        </p>
      </div>

      {/* Save Error Display */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-red-900">Failed to Save Form</h4>
              <p className="text-sm text-red-700 mt-1">{saveError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-aneya-navy text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Save Form'
          )}
        </button>
      </div>
    </div>
  );
}

// Section Card Component
interface SectionCardProps {
  section: any;
  onUpdate: (updated: any) => void;
  onDelete: () => void;
}

function SectionCard({ section, onUpdate, onDelete }: SectionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSection, setEditedSection] = useState(section);

  const handleSave = () => {
    onUpdate(editedSection);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedSection(section);
    setIsEditing(false);
  };

  const handleAddField = () => {
    const newField = {
      name: `new_field_${editedSection.fields.length + 1}`,
      label: "New Field",
      type: "string",
      input_type: "text_short",
      required: false
    };
    setEditedSection({
      ...editedSection,
      fields: [...editedSection.fields, newField]
    });
  };

  const handleUpdateField = (index: number, updatedField: any) => {
    const newFields = [...editedSection.fields];
    newFields[index] = updatedField;
    setEditedSection({
      ...editedSection,
      fields: newFields
    });
  };

  const handleDeleteField = (index: number) => {
    const newFields = editedSection.fields.filter((_: any, i: number) => i !== index);
    setEditedSection({
      ...editedSection,
      fields: newFields
    });
  };

  if (isEditing) {
    return (
      <div className="border border-aneya-navy rounded-lg p-4 bg-white shadow-md">
        <div className="space-y-4">
          {/* Section Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section Name (snake_case)
            </label>
            <input
              type="text"
              value={editedSection.name}
              onChange={(e) => setEditedSection({ ...editedSection, name: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              placeholder="section_name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={editedSection.description}
              onChange={(e) => setEditedSection({ ...editedSection, description: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              placeholder="What this section captures"
            />
          </div>

          {/* Fields */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Fields ({editedSection.fields.length})
              </label>
              <button
                onClick={handleAddField}
                className="text-xs px-3 py-1 bg-aneya-teal text-white rounded hover:bg-opacity-90"
              >
                + Add Field
              </button>
            </div>
            <div className="space-y-2">
              {editedSection.fields.map((field: any, index: number) => (
                <FieldRow
                  key={index}
                  field={field}
                  onUpdate={(updated) => handleUpdateField(index, updated)}
                  onDelete={() => handleDeleteField(index)}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-2 border-t">
            <button
              onClick={handleCancel}
              className="px-4 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1 text-sm bg-aneya-navy text-white rounded hover:bg-opacity-90"
            >
              Save Section
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h5 className="font-medium text-gray-900">{section.name}</h5>
          <p className="text-sm text-gray-600 mt-1">{section.description}</p>
          <p className="text-xs text-gray-500 mt-2">{section.fields.length} fields</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-sm text-aneya-navy border border-aneya-navy rounded hover:bg-aneya-navy hover:text-white transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-600 hover:text-white transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Field Row Component
interface FieldRowProps {
  field: any;
  onUpdate: (updated: any) => void;
  onDelete: () => void;
}

function FieldRow({ field, onUpdate, onDelete }: FieldRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded p-2 bg-gray-50">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 text-left flex items-center gap-2"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-gray-700">{field.label}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            field.type === 'array' && field.input_type?.includes('table')
              ? 'bg-purple-50 text-purple-700'
              : 'bg-gray-100 text-gray-700'
          }`}>
            {field.type === 'array' && field.input_type?.includes('table')
              ? `Table (${field.row_fields?.length || 0} cols)`
              : field.type
            }
          </span>
        </button>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-800 p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2 pl-6">
          <input
            type="text"
            value={field.name}
            onChange={(e) => onUpdate({ ...field, name: e.target.value })}
            className="w-full p-1 text-xs border rounded"
            placeholder="field_name"
          />
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdate({ ...field, label: e.target.value })}
            className="w-full p-1 text-xs border rounded"
            placeholder="Field Label"
          />
          <select
            value={field.type}
            onChange={(e) => onUpdate({ ...field, type: e.target.value })}
            className="w-full p-1 text-xs border rounded"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
            <option value="object">Object</option>
            <option value="array">Array/Table</option>
          </select>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onUpdate({ ...field, required: e.target.checked })}
              className="rounded"
            />
            Required
          </label>

          {/* Table-specific properties - show only when type="array" and input_type="table" or "table_transposed" */}
          {field.type === 'array' && field.input_type?.includes('table') && (
            <div className="space-y-2 border-t pt-2 mt-2">
              {/* Table Type Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">Table Type:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  field.input_type === 'table_transposed'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {field.input_type === 'table_transposed' ? 'Transposed Table' : 'Regular Table'}
                </span>
              </div>

              {/* Column Names */}
              {field.column_names && (
                <div>
                  <label className="text-xs font-medium text-gray-700">Columns:</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {field.column_names.map((col: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Row Names (for transposed tables) */}
              {field.row_names && (
                <div>
                  <label className="text-xs font-medium text-gray-700">Row Attributes:</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {field.row_names.map((row: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {row}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Row Fields Preview */}
              {field.row_fields && (
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Field Structure ({field.row_fields.length} fields):
                  </label>
                  <div className="mt-1 text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
                    {field.row_fields.map((rf: any, idx: number) => (
                      <div key={idx}>
                        • {rf.label || rf.name} ({rf.type})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
