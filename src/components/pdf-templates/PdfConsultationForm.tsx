import { Activity } from 'lucide-react';
import { PdfTableRenderer } from './PdfTableRenderer';

interface DesignTokens {
  logo_url?: string;
  primary_color: string;
  accent_color: string;
  background_color: string;
  clinic_name: string;
  contact_info?: {
    address?: string;
    phone?: string;
    fax?: string;
  };
}

interface FormField {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  input_type: string;
  options?: string[];
  row_fields?: FormField[];
  unit?: string;
  max_length?: number;
}

interface FormSection {
  order: number;
  description: string;
  fields: FormField[];
}

interface FormSchema {
  [sectionName: string]: FormSection;
}

interface PatientInfo {
  name: string;
  id?: string;
  date_of_birth?: string;
  age?: number;
  sex?: string;
  phone?: string;
  address?: string;
}

interface AppointmentInfo {
  id: string;
  scheduled_time: string;
  status: string;
  doctor?: {
    name: string;
    license_number?: string;
  };
}

interface PdfConsultationFormProps {
  formSchema: FormSchema;
  formData: Record<string, any>;
  patientInfo: PatientInfo;
  appointmentInfo: AppointmentInfo;
  clinicBranding: DesignTokens;
}

export function PdfConsultationForm({
  formSchema,
  formData,
  patientInfo,
  appointmentInfo,
  clinicBranding
}: PdfConsultationFormProps) {
  // Sort sections by order
  const sortedSections = Object.entries(formSchema)
    .sort(([, a], [, b]) => a.order - b.order);

  return (
    <div className="min-h-screen bg-[var(--clinic-background)] p-8 print-background">
      <div className="max-w-[1200px] mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">

        {/* Letterhead */}
        <div className="bg-[var(--clinic-primary)] text-white p-8 print-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {clinicBranding.logo_url ? (
                <img
                  src={clinicBranding.logo_url}
                  alt="Clinic Logo"
                  className="w-20 h-20 object-contain bg-white rounded-full p-2"
                />
              ) : (
                <div className="w-20 h-20 bg-[var(--clinic-accent)] rounded-full flex items-center justify-center">
                  <Activity className="w-10 h-10 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-3xl text-white">{clinicBranding.clinic_name}</h1>
                <p className="text-[var(--clinic-background)] mt-1">
                  Excellence in Patient Care
                </p>
              </div>
            </div>
            <div className="text-right text-sm text-[var(--clinic-background)]">
              {clinicBranding.contact_info?.address && (
                <p>{clinicBranding.contact_info.address}</p>
              )}
              {clinicBranding.contact_info?.phone && (
                <p>Phone: {clinicBranding.contact_info.phone}</p>
              )}
              {clinicBranding.contact_info?.fax && (
                <p>Fax: {clinicBranding.contact_info.fax}</p>
              )}
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-8">
          {/* Report Title */}
          <div className="border-b-2 border-[var(--clinic-accent)] pb-4 mb-6">
            <h2 className="text-2xl text-[var(--clinic-primary)]">Consultation Form</h2>
            <p className="text-gray-600 mt-1">
              Date: {new Date(appointmentInfo.scheduled_time).toLocaleDateString()}
            </p>
            {appointmentInfo.id && (
              <p className="text-gray-600">Appointment ID: {appointmentInfo.id}</p>
            )}
          </div>

          {/* Patient Information Section */}
          <div className="mb-8 section-break">
            <h3 className="text-xl text-[var(--clinic-primary)] mb-4 pb-2 border-b border-[var(--clinic-accent)]">
              Patient Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-gray-600">Patient Name</span>
                <span className="font-medium">{patientInfo.name}</span>
              </div>
              {patientInfo.id && (
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600">Patient ID</span>
                  <span className="font-medium">{patientInfo.id}</span>
                </div>
              )}
              {patientInfo.date_of_birth && (
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600">Date of Birth</span>
                  <span className="font-medium">
                    {new Date(patientInfo.date_of_birth).toLocaleDateString()}
                  </span>
                </div>
              )}
              {patientInfo.age && (
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600">Age</span>
                  <span className="font-medium">{patientInfo.age} years</span>
                </div>
              )}
              {patientInfo.sex && (
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600">Sex</span>
                  <span className="font-medium">{patientInfo.sex}</span>
                </div>
              )}
              {patientInfo.phone && (
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600">Phone</span>
                  <span className="font-medium">{patientInfo.phone}</span>
                </div>
              )}
              {patientInfo.address && (
                <div className="flex flex-col md:col-span-2">
                  <span className="text-sm text-gray-600">Address</span>
                  <span className="font-medium">{patientInfo.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Form Sections */}
          {sortedSections.map(([sectionName, section]) => (
            <FormSectionRenderer
              key={sectionName}
              sectionName={sectionName}
              section={section}
              formData={formData}
            />
          ))}

          {/* Physician Signature */}
          <div className="border-t-2 border-[var(--clinic-primary)] pt-6 mt-8 section-break">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col">
                <span className="text-sm text-gray-600 mb-2">Physician Name</span>
                <span className="font-medium border-b border-gray-300 pb-2">
                  {appointmentInfo.doctor?.name || '_____________________'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-600 mb-2">License Number</span>
                <span className="font-medium border-b border-gray-300 pb-2">
                  {appointmentInfo.doctor?.license_number || '_____________________'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-600 mb-2">Date</span>
                <span className="font-medium border-b border-gray-300 pb-2">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-gray-600 mb-2">Signature</span>
                <div className="border-2 border-dashed border-[var(--clinic-accent)] rounded h-[60px] flex items-center justify-center text-gray-400 text-sm">
                  Digital Signature
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[var(--clinic-primary)] text-white px-8 py-4 text-center text-sm print-background">
          <p className="text-[var(--clinic-background)]">
            This is a confidential medical document. Unauthorized disclosure is prohibited.
          </p>
          <p className="text-[var(--clinic-background)] mt-1">
            © {new Date().getFullYear()} {clinicBranding.clinic_name}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Render a single form section with its fields
 */
function FormSectionRenderer({
  sectionName,
  section,
  formData
}: {
  sectionName: string;
  section: FormSection;
  formData: Record<string, any>;
}) {
  return (
    <div className="mb-8 avoid-break">
      <h3 className="text-xl text-[var(--clinic-primary)] mb-4 pb-2 border-b border-[var(--clinic-accent)]">
        {section.description}
      </h3>
      <div className="space-y-4">
        {section.fields.map((field, idx) => (
          <FieldRenderer
            key={`${sectionName}-${field.name}-${idx}`}
            field={field}
            value={formData[field.name]}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Render a single field based on its type
 */
function FieldRenderer({ field, value }: { field: FormField; value: any }) {
  const { input_type, label } = field;

  // Handle table fields
  if (input_type === 'table' || input_type === 'table_transposed') {
    const tableData = Array.isArray(value) ? value : [];
    const columns = field.row_fields?.map(rf => ({
      header: rf.label,
      key: rf.name,
      type: rf.type,
      unit: rf.unit
    })) || [];

    return (
      <PdfTableRenderer
        columns={columns}
        data={tableData}
        transposed={input_type === 'table_transposed'}
        title={label}
      />
    );
  }

  // Handle textarea fields
  if (input_type === 'textarea') {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-[var(--clinic-primary)] mb-2">
          {label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="w-full px-4 py-3 border border-gray-300 rounded bg-gray-50 min-h-[100px] whitespace-pre-wrap">
          {value || '-'}
        </div>
      </div>
    );
  }

  // Handle boolean/checkbox fields
  if (input_type === 'checkbox' || field.type === 'boolean') {
    const boolValue = typeof value === 'boolean' ? value : value === 'true' || value === '1';
    return (
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
          boolValue
            ? 'bg-[var(--clinic-accent)] border-[var(--clinic-accent)]'
            : 'border-gray-300'
        }`}>
          {boolValue && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <label className="text-sm text-[var(--clinic-primary)]">
          {label}
        </label>
      </div>
    );
  }

  // Handle dropdown/select/radio fields
  if (input_type === 'dropdown' || input_type === 'radio' || input_type === 'select') {
    return (
      <div className="flex flex-col mb-4">
        <span className="text-sm font-medium text-[var(--clinic-primary)] mb-1">
          {label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </span>
        <span className="px-4 py-2 border border-gray-300 rounded bg-gray-50">
          {value || '-'}
        </span>
      </div>
    );
  }

  // Handle number fields with units
  if (input_type === 'number' || field.type === 'number') {
    const displayValue = value !== null && value !== undefined
      ? field.unit
        ? `${value} ${field.unit}`
        : value
      : '-';

    return (
      <div className="flex flex-col mb-4">
        <span className="text-sm font-medium text-[var(--clinic-primary)] mb-1">
          {label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </span>
        <span className="px-4 py-2 border border-gray-300 rounded bg-gray-50">
          {displayValue}
        </span>
      </div>
    );
  }

  // Handle date fields
  if (input_type === 'date') {
    const displayValue = value
      ? new Date(value).toLocaleDateString()
      : '-';

    return (
      <div className="flex flex-col mb-4">
        <span className="text-sm font-medium text-[var(--clinic-primary)] mb-1">
          {label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </span>
        <span className="px-4 py-2 border border-gray-300 rounded bg-gray-50">
          {displayValue}
        </span>
      </div>
    );
  }

  // Default: text fields (text_short, multi-select, tagbox, rating, etc.)
  return (
    <div className="flex flex-col mb-4">
      <span className="text-sm font-medium text-[var(--clinic-primary)] mb-1">
        {label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </span>
      <span className="px-4 py-2 border border-gray-300 rounded bg-gray-50">
        {Array.isArray(value) ? value.join(', ') : (value || '-')}
      </span>
    </div>
  );
}
