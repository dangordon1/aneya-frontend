/**
 * Frontend PDF Preview Component using @react-pdf/renderer
 * Renders form data as a professional printed report matching the MedicalForm letterhead style.
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { generateSampleFormData, formatFieldLabel } from '../../utils/formSampleData';

interface ClinicBranding {
  clinic_name?: string | null;
  clinic_logo_url?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  text_color?: string | null;
  light_gray_color?: string | null;
}

interface FieldDefinition {
  name: string;
  label?: string;
  type?: string;
  input_type?: string;
  row_fields?: FieldDefinition[];
  required?: boolean;
}

interface SectionDefinition {
  description?: string;
  fields?: FieldDefinition[];
  order?: number;
}

type FormSchema = Record<string, SectionDefinition>;

interface FormPdfDocumentProps {
  schema: FormSchema;
  formName: string;
  clinicBranding?: ClinicBranding;
  formData?: Record<string, Record<string, any>>;
}

// Default colors matching Aneya design system
const DEFAULT_COLORS = {
  primary: '#0c3555',    // aneya-navy
  accent: '#1d9e99',     // aneya-teal
  text: '#333333',
  textLight: '#6b6b6b',
  lightGray: '#d1d5db',
  white: '#ffffff',
  cream: '#f6f5ee',      // aneya-cream
};

const createStyles = (colors: typeof DEFAULT_COLORS) =>
  StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: colors.white,
      paddingTop: 0,
      paddingBottom: 36,
      paddingHorizontal: 0,
      fontFamily: 'Helvetica',
    },
    // --- Letterhead header (navy background) ---
    letterhead: {
      backgroundColor: colors.primary,
      paddingVertical: 18,
      paddingHorizontal: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    letterheadLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoText: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: colors.white,
    },
    logoImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      objectFit: 'cover',
    },
    clinicName: {
      fontSize: 15,
      fontFamily: 'Helvetica-Bold',
      color: colors.white,
    },
    clinicSubtitle: {
      fontSize: 8,
      color: colors.cream,
      marginTop: 2,
    },
    letterheadRight: {
      alignItems: 'flex-end',
    },
    letterheadFormName: {
      fontSize: 10,
      color: colors.cream,
    },
    // --- Form content area ---
    content: {
      paddingHorizontal: 30,
      paddingTop: 10,
    },
    // --- Form title bar ---
    titleBar: {
      borderBottomWidth: 2,
      borderBottomColor: colors.accent,
      paddingBottom: 4,
      marginBottom: 14,
    },
    formTitle: {
      fontSize: 20,
      fontFamily: 'Helvetica-Bold',
      color: colors.primary,
    },
    // --- Section ---
    section: {
      marginBottom: 6,
      marginTop: 8,
    },
    sectionHeader: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: colors.primary,
      marginBottom: 2,
    },
    sectionUnderline: {
      borderBottomWidth: 1,
      borderBottomColor: colors.accent,
      marginBottom: 4,
    },
    // --- 2-column field grid ---
    fieldGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    fieldHalf: {
      width: '50%',
      paddingRight: 8,
      paddingBottom: 3,
    },
    fieldFull: {
      width: '100%',
      paddingBottom: 3,
    },
    // --- Field: label + underlined value (professional printed look) ---
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      borderBottomWidth: 0.5,
      borderBottomColor: colors.lightGray,
      paddingBottom: 1,
      minHeight: 14,
    },
    fieldRowTextarea: {
      borderBottomWidth: 0.5,
      borderBottomColor: colors.lightGray,
      paddingBottom: 2,
      minHeight: 20,
    },
    fieldLabel: {
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      color: colors.primary,
      marginRight: 3,
    },
    fieldValue: {
      fontSize: 8,
      color: colors.text,
      flex: 1,
    },
    fieldValueBlock: {
      fontSize: 8,
      color: colors.text,
      marginTop: 1,
      lineHeight: 1.3,
    },
    fieldLabelBlock: {
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      color: colors.primary,
      marginBottom: 1,
    },
    // --- Table ---
    table: {
      marginTop: 2,
      marginBottom: 3,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      paddingVertical: 2,
      paddingHorizontal: 4,
    },
    tableHeaderCell: {
      fontSize: 6,
      fontFamily: 'Helvetica-Bold',
      color: colors.white,
      flex: 1,
      textAlign: 'center',
      paddingHorizontal: 1,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: colors.lightGray,
      paddingVertical: 2,
      paddingHorizontal: 4,
    },
    tableRowAlt: {
      backgroundColor: '#f7f7f7',
    },
    tableCell: {
      fontSize: 7,
      color: colors.text,
      flex: 1,
      textAlign: 'center',
      paddingHorizontal: 1,
    },
    // --- Signature footer ---
    signatureFooter: {
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 2,
      borderTopColor: colors.accent,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    signatureLeftText: {
      fontSize: 7,
      color: colors.textLight,
    },
    signatureRight: {
      alignItems: 'flex-end',
    },
    signatureLabel: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      color: colors.primary,
    },
    signatureLine: {
      width: 150,
      borderBottomWidth: 1,
      borderBottomColor: colors.text,
      marginTop: 6,
      marginBottom: 3,
    },
    signatureDate: {
      fontSize: 7,
      color: colors.textLight,
    },
    // --- Page footer ---
    pageFooter: {
      position: 'absolute',
      bottom: 16,
      left: 30,
      right: 30,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pageFooterText: {
      fontSize: 6,
      color: colors.textLight,
    },
    pageNumber: {
      fontSize: 6,
      color: colors.textLight,
    },
  });

// --- Format a field value for display ---
const formatValue = (value: any): string => {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === true || value === 'true' || value === 'Yes') return 'Yes';
  if (value === false || value === 'false' || value === 'No') return 'No';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
  return String(value);
};

// --- Inline field: "Label: value" on one line with subtle underline ---
const InlineFieldDisplay: React.FC<{
  label: string;
  value: any;
  styles: ReturnType<typeof createStyles>;
}> = ({ label, value, styles }) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}:</Text>
    <Text style={styles.fieldValue}>{formatValue(value)}</Text>
  </View>
);

// --- Block field: label on top, value below (for textarea / long text) ---
const BlockFieldDisplay: React.FC<{
  label: string;
  value: any;
  styles: ReturnType<typeof createStyles>;
}> = ({ label, value, styles }) => (
  <View style={styles.fieldRowTextarea}>
    <Text style={styles.fieldLabelBlock}>{label}:</Text>
    <Text style={styles.fieldValueBlock}>{formatValue(value)}</Text>
  </View>
);

// --- Table renderer ---
const TableDisplay: React.FC<{
  field: FieldDefinition;
  data: Array<Record<string, any>>;
  styles: ReturnType<typeof createStyles>;
}> = ({ field, data, styles }) => {
  const rowFields = field.row_fields || [];
  const fieldLabel = field.label || formatFieldLabel(field.name);

  if (!data || data.length === 0) {
    return (
      <View style={{ marginBottom: 6 }}>
        <InlineFieldDisplay label={fieldLabel} value={null} styles={styles} />
      </View>
    );
  }

  const columns = rowFields.map(rf => ({
    name: rf.name,
    label: rf.label || formatFieldLabel(rf.name),
  }));

  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={[styles.fieldLabelBlock, { marginBottom: 3 }]}>{fieldLabel}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          {columns.map((col, idx) => (
            <Text key={idx} style={styles.tableHeaderCell}>{col.label}</Text>
          ))}
        </View>
        {data.map((row, rowIdx) => (
          <View
            key={rowIdx}
            style={[styles.tableRow, rowIdx % 2 === 1 ? styles.tableRowAlt : {}]}
          >
            {columns.map((col, colIdx) => (
              <Text key={colIdx} style={styles.tableCell}>
                {row[col.name] || '—'}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

// --- Section renderer ---
const SectionDisplay: React.FC<{
  sectionName: string;
  sectionConfig: SectionDefinition;
  sectionData: Record<string, any>;
  styles: ReturnType<typeof createStyles>;
}> = ({ sectionName, sectionConfig, sectionData, styles }) => {
  const fields = sectionConfig.fields || [];

  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionHeader}>{formatFieldLabel(sectionName)}</Text>
      <View style={styles.sectionUnderline} />

      <View style={styles.fieldGrid}>
        {fields.map((field, idx) => {
          const fieldValue = sectionData[field.name];
          const fieldLabel = field.label || formatFieldLabel(field.name);
          const fieldType = field.input_type || field.type || 'text';
          const isTable = fieldType === 'table' || fieldType === 'table_transposed' || (field.type === 'array' && field.row_fields);
          const isTextarea = fieldType === 'textarea';

          if (isTable && Array.isArray(fieldValue)) {
            return (
              <View key={idx} style={styles.fieldFull}>
                <TableDisplay field={field} data={fieldValue} styles={styles} />
              </View>
            );
          }

          if (isTextarea) {
            return (
              <View key={idx} style={styles.fieldFull}>
                <BlockFieldDisplay label={fieldLabel} value={fieldValue} styles={styles} />
              </View>
            );
          }

          return (
            <View key={idx} style={styles.fieldHalf}>
              <InlineFieldDisplay label={fieldLabel} value={fieldValue} styles={styles} />
            </View>
          );
        })}
      </View>
    </View>
  );
};

/**
 * Main PDF Document component — professional printed report matching MedicalForm letterhead
 */
export const FormPdfDocument: React.FC<FormPdfDocumentProps> = ({
  schema,
  formName,
  clinicBranding,
  formData,
}) => {
  const colors = {
    ...DEFAULT_COLORS,
    ...(clinicBranding?.primary_color && { primary: clinicBranding.primary_color }),
    ...(clinicBranding?.accent_color && { accent: clinicBranding.accent_color }),
    ...(clinicBranding?.text_color && { text: clinicBranding.text_color }),
    ...(clinicBranding?.light_gray_color && { lightGray: clinicBranding.light_gray_color }),
  };

  const styles = createStyles(colors);

  const data = formData && Object.keys(formData).length > 0 ? formData : generateSampleFormData(schema);

  const sortedSections = Object.entries(schema)
    .filter(([name]) => !['title', 'description', 'version', 'type'].includes(name))
    .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0));

  const displayName = formatFieldLabel(formName);
  const clinicDisplayName = clinicBranding?.clinic_name || 'Healthcare Medical Center';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Navy letterhead header (page 1 only) */}
        <View style={styles.letterhead}>
          <View style={styles.letterheadLeft}>
            {clinicBranding?.clinic_logo_url ? (
              <Image src={clinicBranding.clinic_logo_url} style={styles.logoImage} />
            ) : (
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>+</Text>
              </View>
            )}
            <View>
              <Text style={styles.clinicName}>{clinicDisplayName}</Text>
              <Text style={styles.clinicSubtitle}>Excellence in Patient Care</Text>
            </View>
          </View>
          <View style={styles.letterheadRight}>
            <Text style={styles.letterheadFormName}>{displayName}</Text>
          </View>
        </View>

        {/* Form title with teal underline */}
        <View style={[styles.titleBar, { marginHorizontal: 30, marginTop: 20 }]}>
          <Text style={styles.formTitle}>{displayName}</Text>
        </View>

        {/* Sections — direct children of Page for proper page break handling */}
        {sortedSections.map(([sectionName, sectionConfig]) => (
          <View key={sectionName} style={{ paddingHorizontal: 30 }}>
            <SectionDisplay
              sectionName={sectionName}
              sectionConfig={sectionConfig}
              sectionData={data[sectionName] || {}}
              styles={styles}
            />
          </View>
        ))}

        {/* Signature footer */}
        <View style={[styles.signatureFooter, { marginHorizontal: 30 }]}>
          <View>
            <Text style={styles.signatureLeftText}>
              All data is for medical professional use only.
            </Text>
          </View>
          <View style={styles.signatureRight}>
            <Text style={styles.signatureLabel}>Physician Signature</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureDate}>Date: ____________</Text>
          </View>
        </View>

        {/* Page footer */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.pageFooterText}>
            Confidential — Powered by Aneya Healthcare Platform
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

export default FormPdfDocument;
