import { Activity } from 'lucide-react';

interface FormField {
  name: string;
  label?: string;
  type?: string;
  options?: string[];
  choices?: string[];
  required?: boolean;
}

interface FormSection {
  description?: string;
  order?: number;
  fields?: FormField[];
}

interface FormPreviewCardProps {
  formName: string;
  specialty: string;
  formSchema: Record<string, FormSection>;
  clinicName?: string;
}

export function FormPreviewCard({
  formName,
  specialty,
  formSchema,
  clinicName = 'Healthcare Medical Center'
}: FormPreviewCardProps) {
  // Sort sections by order
  const sortedSections = Object.entries(formSchema)
    .sort(([, a], [, b]) => {
      const orderA = a.order || 999;
      const orderB = b.order || 999;
      return orderA - orderB;
    });

  // Generate sample value based on field type
  const getSampleValue = (field: FormField): string => {
    switch (field.type) {
      case 'number':
        return '120';
      case 'date':
        return new Date().toLocaleDateString();
      case 'boolean':
        return 'Yes';
      case 'select':
      case 'dropdown':
        return field.options?.[0] || field.choices?.[0] || 'Option 1';
      case 'multiselect':
        return field.options?.slice(0, 2).join(', ') || 'Option 1, Option 2';
      case 'textarea':
        return 'Sample text entry for preview...';
      default:
        return 'Sample Value';
    }
  };

  // Format section name for display
  const formatSectionName = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Format field label for display
  const formatFieldLabel = (field: FormField): string => {
    return field.label || field.name?.replace(/_/g, ' ') || 'Field';
  };

  return (
    <div className="min-h-full bg-[var(--medical-cream)]">
      <div className="max-w-[1200px] mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
        {/* Letterhead */}
        <div className="bg-[var(--medical-navy)] text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo placeholder */}
              <div className="w-16 h-16 bg-[var(--medical-teal)] rounded-full flex items-center justify-center">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl text-white">{clinicName}</h1>
                <p className="text-[var(--medical-cream)] mt-1 text-sm">
                  Excellence in Patient Care
                </p>
              </div>
            </div>
            <div className="text-right text-sm text-[var(--medical-cream)]">
              <p>Form Preview</p>
              <p className="text-xs opacity-75">Sample data shown</p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Form Title */}
          <div className="border-b-2 border-[var(--medical-teal)] pb-4 mb-6">
            <h2 className="text-2xl text-[var(--medical-navy)]">
              {formName.replace(/_/g, ' ')}
            </h2>
            <p className="text-gray-600 mt-1">
              Specialty: {specialty.replace(/_/g, ' ')} • Preview Date: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Render each section */}
          {sortedSections.map(([sectionName, sectionDef]) => (
            <div key={sectionName} className="mb-8">
              {/* Section Header */}
              <h3 className="text-xl text-[var(--medical-navy)] mb-4 pb-2 border-b border-[var(--medical-sea-green)]">
                {sectionDef.description || formatSectionName(sectionName)}
              </h3>

              {/* Section Fields */}
              {Array.isArray(sectionDef.fields) && sectionDef.fields.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sectionDef.fields.map((field, idx) => (
                    <div key={`${sectionName}-${field.name || idx}`} className={
                      field.type === 'textarea' ? 'md:col-span-2' : ''
                    }>
                      <label className="block text-[var(--medical-navy)] mb-2 font-medium">
                        {formatFieldLabel(field)}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {field.type === 'boolean' ? (
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`${sectionName}-${field.name}`}
                              checked={true}
                              readOnly
                              className="w-4 h-4 text-[var(--medical-teal)]"
                            />
                            <span className="text-[var(--medical-navy)]">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`${sectionName}-${field.name}`}
                              checked={false}
                              readOnly
                              className="w-4 h-4 text-[var(--medical-teal)]"
                            />
                            <span className="text-[var(--medical-navy)]">No</span>
                          </label>
                        </div>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          value={getSampleValue(field)}
                          readOnly
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700"
                        />
                      ) : field.type === 'select' || field.type === 'dropdown' ? (
                        <select
                          value={getSampleValue(field)}
                          disabled
                          className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700"
                        >
                          <option>{getSampleValue(field)}</option>
                        </select>
                      ) : (
                        <input
                          type={field.type === 'date' ? 'date' : 'text'}
                          value={getSampleValue(field)}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700"
                        />
                      )}
                    </div>
                  ))}
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
                <p>This is a preview of how the form will appear during consultations.</p>
                <p>Sample data is shown for demonstration purposes.</p>
              </div>
              <div className="text-right">
                <p className="text-[var(--medical-navy)] font-medium">Physician Signature</p>
                <div className="w-48 h-12 border-b-2 border-gray-400 mt-2"></div>
                <p className="text-gray-500 text-sm mt-1">Date: ____________</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
