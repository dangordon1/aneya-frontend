/**
 * Generate realistic sample/dummy data based on form schema for PDF preview.
 * TypeScript port of the Python generate_sample_form_data function from pdf_generator.py
 */

interface FieldDefinition {
  name: string;
  label?: string;
  type: string;
  input_type?: string;
  options?: Array<string | { value: string; label: string }>;
  row_fields?: FieldDefinition[];
  properties?: FieldDefinition[] | Record<string, { type?: string }>;
  fields?: FieldDefinition[];
  required?: boolean;
}

interface SectionDefinition {
  description?: string;
  fields?: FieldDefinition[] | Record<string, any>;
  order?: number;
  title?: string;
  type?: string;
  version?: string;
}

type FormSchema = Record<string, SectionDefinition>;

type SampleValue = string | SampleRowData[];

interface SampleRowData {
  [key: string]: string;
}

interface SampleSectionData {
  [fieldName: string]: SampleValue;
}

type SampleFormData = Record<string, SampleSectionData>;

/**
 * Generate sample data for a single field based on its type and name
 */
function generateSampleFieldValue(field: FieldDefinition, rowIndex?: number): string {
  const fieldName = field.name.toLowerCase();
  const fieldType = field.type || 'string';
  const inputType = field.input_type || '';

  switch (fieldType) {
    case 'date':
      return new Date().toLocaleDateString('en-GB');

    case 'boolean':
      return rowIndex !== undefined ? (rowIndex % 2 === 0 ? 'Yes' : 'No') : 'Yes';

    case 'number':
      // Generate realistic medical numbers based on field name
      if (fieldName.includes('weight') || fieldName.includes('wt')) {
        return rowIndex !== undefined ? String(65 + rowIndex) : '65';
      }
      if (fieldName.includes('height')) {
        return rowIndex !== undefined ? String(165 + rowIndex) : '165';
      }
      if (fieldName.includes('blood_pressure') || fieldName.includes('bp')) {
        const systolic = 120 - (rowIndex || 0) * 2;
        const diastolic = 80 - (rowIndex || 0) * 2;
        return `${systolic}/${diastolic}`;
      }
      if (fieldName.includes('temperature') || fieldName.includes('temp')) {
        const temp = 37.0 + (rowIndex || 0) * 0.2;
        return temp.toFixed(1);
      }
      if (fieldName.includes('pulse') || fieldName.includes('heart_rate') || fieldName.includes('fhr')) {
        return String(140 + (rowIndex || 0) * 5);
      }
      if (fieldName.includes('respiratory_rate')) {
        return '16';
      }
      if (fieldName.includes('oxygen') || fieldName.includes('spo2')) {
        return '98';
      }
      if (fieldName.includes('sfh')) {
        return String(30 + (rowIndex || 0));
      }
      return String(Math.floor(Math.random() * 60) + 60);

    case 'select':
      if (field.options && field.options.length > 0) {
        const option = field.options[0];
        return typeof option === 'object' ? option.value : option;
      }
      return 'Option 1';

    default:
      // String or other types
      if (inputType === 'radio' && field.options && field.options.length > 0) {
        const option = field.options[0];
        return typeof option === 'object' ? option.value : option;
      }
      if (inputType === 'textarea') {
        return 'Sample longer text content that would typically be entered in a textarea field. This demonstrates how multi-line text appears in the PDF.';
      }
      // Generate based on field name hints
      if (fieldName.includes('scan_type')) {
        const scanTypes = ['Dating Scan', 'Anomaly Scan', 'Growth Scan'];
        return scanTypes[(rowIndex || 0) % scanTypes.length];
      }
      if (fieldName.includes('complaint')) {
        return `Sample complaint ${(rowIndex || 0) + 1}`;
      }
      if (fieldName.includes('diagnosis')) {
        return `Sample diagnosis ${(rowIndex || 0) + 1}`;
      }
      if (fieldName.includes('medication')) {
        return `Sample medication ${(rowIndex || 0) + 1}`;
      }
      return 'Sample text';
  }
}

/**
 * Generate sample data for a table field (array type)
 */
function generateTableSampleData(field: FieldDefinition): SampleRowData[] {
  const rowFields = field.row_fields || [];
  if (rowFields.length === 0) {
    return [];
  }

  const numRows = 2 + Math.floor(Math.random() * 2); // 2-3 rows
  const sampleRows: SampleRowData[] = [];

  for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
    const rowData: SampleRowData = {};
    for (const rowField of rowFields) {
      rowData[rowField.name] = generateSampleFieldValue(rowField, rowIdx);
    }
    sampleRows.push(rowData);
  }

  return sampleRows;
}

/**
 * Generate sample data for an object field
 */
function generateObjectSampleData(field: FieldDefinition): string {
  const nestedFields = field.properties || field.fields || [];

  if (Array.isArray(nestedFields)) {
    const nestedValues: string[] = [];
    for (const nf of nestedFields) {
      const nfName = nf.name || nf.label || 'field';
      nestedValues.push(`${nfName}: ${generateSampleFieldValue(nf)}`);
    }
    return nestedValues.length > 0 ? nestedValues.join('; ') : 'N/A';
  } else if (typeof nestedFields === 'object') {
    const nestedValues: string[] = [];
    for (const [nfName, nfConfig] of Object.entries(nestedFields)) {
      const fakeField: FieldDefinition = {
        name: nfName,
        type: nfConfig?.type || 'string'
      };
      nestedValues.push(`${nfName}: ${generateSampleFieldValue(fakeField)}`);
    }
    return nestedValues.length > 0 ? nestedValues.join('; ') : 'N/A';
  }

  return 'N/A';
}

/**
 * Generate realistic sample/dummy data based on form schema for PDF preview.
 *
 * @param formSchema - Form schema with sections and field definitions
 * @returns Object with nested structure: {"section_name": {"field_name": "sample value"}}
 */
export function generateSampleFormData(formSchema: FormSchema): SampleFormData {
  const sampleData: SampleFormData = {};

  // Metadata keys to skip
  const metadataKeys = new Set(['title', 'description', 'version', 'type']);

  for (const [sectionName, sectionConfig] of Object.entries(formSchema)) {
    if (!sectionConfig || typeof sectionConfig !== 'object') {
      continue;
    }

    // Skip metadata sections
    if (metadataKeys.has(sectionName)) {
      continue;
    }

    const sectionData: SampleSectionData = {};
    let fields = sectionConfig.fields;

    // Handle different field formats
    let fieldItems: FieldDefinition[] = [];

    if (Array.isArray(fields)) {
      // List format: [{"name": "field_name", ...}]
      fieldItems = fields;
    } else if (fields && typeof fields === 'object') {
      // Dict format: {"field_name": {config}}
      fieldItems = Object.entries(fields).map(([k, v]) => {
        if (typeof v === 'object' && v !== null) {
          return { name: k, ...v } as FieldDefinition;
        }
        return { name: k, value: v, type: 'string' } as FieldDefinition;
      });
    } else if (!fields) {
      // No 'fields' key - treat section keys as field definitions
      fieldItems = Object.entries(sectionConfig)
        .filter(([k]) => !metadataKeys.has(k) && k !== 'fields' && k !== 'order')
        .map(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            return { name: k, ...v } as FieldDefinition;
          }
          return { name: k, value: v, type: 'string' } as FieldDefinition;
        });
    }

    for (const field of fieldItems) {
      const fieldName = field.name || '';
      const fieldType = field.type || 'string';
      const inputType = field.input_type || '';

      if (fieldType === 'array' && inputType.startsWith('table')) {
        // Table field - generate sample rows
        sectionData[fieldName] = generateTableSampleData(field);
      } else if (fieldType === 'object') {
        // Object field - flatten to string
        sectionData[fieldName] = generateObjectSampleData(field);
      } else {
        // Simple field
        sectionData[fieldName] = generateSampleFieldValue(field);
      }
    }

    // Only add section if it has data
    if (Object.keys(sectionData).length > 0) {
      sampleData[sectionName] = sectionData;
    }
  }

  return sampleData;
}

/**
 * Convert snake_case field names to readable labels
 */
export function formatFieldLabel(fieldName: string): string {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
