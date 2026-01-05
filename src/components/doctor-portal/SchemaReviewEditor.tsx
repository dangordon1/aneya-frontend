import { useState } from 'react';

interface SchemaReviewEditorProps {
  formName: string;
  specialty: string;
  initialSchema: Record<string, any>;
  initialPdfTemplate: Record<string, any>;
  description?: string;
  isPublic: boolean;
  onSave: (schema: any, pdfTemplate: any) => Promise<void>;
  onCancel: () => void;
}

export function SchemaReviewEditor({
  formName,
  specialty,
  initialSchema,
  initialPdfTemplate,
  description,
  isPublic,
  onSave,
  onCancel
}: SchemaReviewEditorProps) {
  const [schema, setSchema] = useState(initialSchema);
  const [pdfTemplate, setPdfTemplate] = useState(initialPdfTemplate);
  const [saving, setSaving] = useState(false);

  // Convert schema object to sections array for easier editing
  const sections = Object.entries(schema).map(([name, data]) => ({
    name,
    ...data as any
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(schema, pdfTemplate);
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
        <h3 className="font-semibold text-blue-900">Review Extracted Form Schema</h3>
        <p className="text-sm text-blue-700 mt-1">
          Review and edit the fields extracted by AI. Add, remove, or modify fields as needed.
        </p>
        <div className="mt-2 space-y-1">
          <p className="text-xs text-blue-600">
            <span className="font-medium">Form Name:</span> {formName}
          </p>
          <p className="text-xs text-blue-600">
            <span className="font-medium">Specialty:</span> {specialty}
          </p>
          {description && (
            <p className="text-xs text-blue-600">
              <span className="font-medium">Description:</span> {description}
            </p>
          )}
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

      {/* PDF Preview (read-only) */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-2">PDF Layout Preview</h4>
        <p className="text-sm text-gray-600 mb-2">
          PDF template has been generated automatically. Full editing coming soon.
        </p>
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-700 hover:text-gray-900">
            View JSON
          </summary>
          <pre className="bg-white p-2 rounded mt-2 overflow-auto max-h-40 border border-gray-200">
            {JSON.stringify(pdfTemplate, null, 2)}
          </pre>
        </details>
      </div>

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
          <span className="text-xs text-gray-500">({field.type})</span>
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
        </div>
      )}
    </div>
  );
}
