/**
 * Frontend PDF Preview Component using @react-pdf/renderer
 * Renders form schema with sample data as a PDF document
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

// Register fonts (using built-in Helvetica as fallback)
// For production, you could register custom fonts like Inter here

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
  type: string;
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
}

// Default colors matching Aneya design system
const DEFAULT_COLORS = {
  primary: '#0c3555',    // aneya-navy
  accent: '#1d9e99',     // aneya-teal
  text: '#4a4a4a',
  textLight: '#6b6b6b',
  lightGray: '#e5e5e5',
  white: '#ffffff',
  background: '#f6f5ee', // aneya-cream
};

// Create styles with dynamic colors
const createStyles = (colors: typeof DEFAULT_COLORS) =>
  StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: colors.white,
      paddingTop: 40,
      paddingBottom: 60,
      paddingHorizontal: 50,
      fontFamily: 'Helvetica',
    },
    header: {
      marginBottom: 20,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    logo: {
      maxWidth: 100,
      maxHeight: 50,
      objectFit: 'contain',
    },
    clinicName: {
      fontSize: 16,
      fontFamily: 'Helvetica-Bold',
      color: colors.primary,
      marginBottom: 4,
    },
    title: {
      fontSize: 20,
      fontFamily: 'Helvetica-Bold',
      color: colors.primary,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 10,
      color: colors.textLight,
      textAlign: 'center',
      marginBottom: 15,
    },
    divider: {
      borderBottomWidth: 2,
      borderBottomColor: colors.accent,
      marginBottom: 15,
    },
    section: {
      marginBottom: 15,
    },
    sectionHeader: {
      fontSize: 12,
      fontFamily: 'Helvetica-Bold',
      color: colors.primary,
      marginBottom: 4,
    },
    sectionUnderline: {
      borderBottomWidth: 1,
      borderBottomColor: colors.accent,
      marginBottom: 8,
      width: '100%',
    },
    sectionDescription: {
      fontSize: 9,
      color: colors.textLight,
      fontStyle: 'italic',
      marginBottom: 8,
    },
    fieldRow: {
      flexDirection: 'row',
      marginBottom: 4,
      alignItems: 'flex-start',
    },
    fieldLabel: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: colors.primary,
      width: '30%',
      minWidth: 100,
    },
    fieldValue: {
      fontSize: 10,
      color: colors.text,
      flex: 1,
      flexWrap: 'wrap',
    },
    // Table styles
    table: {
      marginTop: 4,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.lightGray,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    tableHeaderCell: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: colors.white,
      flex: 1,
      textAlign: 'center',
      paddingHorizontal: 2,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGray,
      paddingVertical: 3,
      paddingHorizontal: 4,
    },
    tableRowAlt: {
      backgroundColor: '#f9f9f9',
    },
    tableCell: {
      fontSize: 8,
      color: colors.text,
      flex: 1,
      textAlign: 'center',
      paddingHorizontal: 2,
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 50,
      right: 50,
      textAlign: 'center',
    },
    footerText: {
      fontSize: 8,
      color: colors.textLight,
    },
    footerBrand: {
      fontSize: 7,
      color: colors.textLight,
      marginTop: 4,
    },
    pageNumber: {
      position: 'absolute',
      bottom: 30,
      right: 50,
      fontSize: 8,
      color: colors.textLight,
    },
  });

// Component to render a single field
const FieldDisplay: React.FC<{
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}> = ({ label, value, styles }) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}:</Text>
    <Text style={styles.fieldValue}>{value}</Text>
  </View>
);

// Component to render a table
const TableDisplay: React.FC<{
  label: string;
  data: Array<Record<string, string>>;
  rowFields: FieldDefinition[];
  styles: ReturnType<typeof createStyles>;
}> = ({ label, data, rowFields, styles }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{label}:</Text>
        <Text style={styles.fieldValue}>No data</Text>
      </View>
    );
  }

  // Get column headers from row_fields
  const columns = rowFields.map(rf => ({
    name: rf.name,
    label: rf.label || formatFieldLabel(rf.name),
  }));

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>{label}:</Text>
      <View style={styles.table}>
        {/* Header row */}
        <View style={styles.tableHeader}>
          {columns.map((col, idx) => (
            <Text key={idx} style={styles.tableHeaderCell}>
              {col.label}
            </Text>
          ))}
        </View>
        {/* Data rows */}
        {data.map((row, rowIdx) => (
          <View
            key={rowIdx}
            style={[
              styles.tableRow,
              rowIdx % 2 === 1 ? styles.tableRowAlt : {},
            ]}
          >
            {columns.map((col, colIdx) => (
              <Text key={colIdx} style={styles.tableCell}>
                {row[col.name] || '-'}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

// Component to render a section
const SectionDisplay: React.FC<{
  sectionName: string;
  sectionConfig: SectionDefinition;
  sectionData: Record<string, string | Array<Record<string, string>>>;
  styles: ReturnType<typeof createStyles>;
}> = ({ sectionName, sectionConfig, sectionData, styles }) => {
  const fields = sectionConfig.fields || [];

  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionHeader}>{formatFieldLabel(sectionName)}</Text>
      <View style={styles.sectionUnderline} />
      {sectionConfig.description && (
        <Text style={styles.sectionDescription}>{sectionConfig.description}</Text>
      )}
      {fields.map((field, idx) => {
        const fieldValue = sectionData[field.name];
        const fieldLabel = field.label || formatFieldLabel(field.name);

        // Check if this is a table field
        if (
          field.type === 'array' &&
          field.input_type?.includes('table') &&
          Array.isArray(fieldValue)
        ) {
          return (
            <TableDisplay
              key={idx}
              label={fieldLabel}
              data={fieldValue as Array<Record<string, string>>}
              rowFields={field.row_fields || []}
              styles={styles}
            />
          );
        }

        // Regular field
        return (
          <FieldDisplay
            key={idx}
            label={fieldLabel}
            value={String(fieldValue || '-')}
            styles={styles}
          />
        );
      })}
    </View>
  );
};

/**
 * Main PDF Document component
 */
export const FormPdfDocument: React.FC<FormPdfDocumentProps> = ({
  schema,
  formName,
  clinicBranding,
}) => {
  // Merge custom colors with defaults
  const colors = {
    ...DEFAULT_COLORS,
    ...(clinicBranding?.primary_color && { primary: clinicBranding.primary_color }),
    ...(clinicBranding?.accent_color && { accent: clinicBranding.accent_color }),
    ...(clinicBranding?.text_color && { text: clinicBranding.text_color }),
    ...(clinicBranding?.light_gray_color && { lightGray: clinicBranding.light_gray_color }),
  };

  const styles = createStyles(colors);

  // Generate sample data from schema
  const sampleData = generateSampleFormData(schema);

  // Sort sections by order if available
  const sortedSections = Object.entries(schema)
    .filter(([name]) => !['title', 'description', 'version', 'type'].includes(name))
    .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0));

  const generationDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              {clinicBranding?.clinic_name && (
                <Text style={styles.clinicName}>{clinicBranding.clinic_name}</Text>
              )}
            </View>
            {clinicBranding?.clinic_logo_url && (
              <Image
                style={styles.logo}
                src={clinicBranding.clinic_logo_url}
              />
            )}
          </View>
          <Text style={styles.title}>{formatFieldLabel(formName)}</Text>
          <Text style={styles.subtitle}>Generated: {generationDate}</Text>
          <View style={styles.divider} />
        </View>

        {/* Sections */}
        {sortedSections.map(([sectionName, sectionConfig]) => (
          <SectionDisplay
            key={sectionName}
            sectionName={sectionName}
            sectionConfig={sectionConfig}
            sectionData={sampleData[sectionName] || {}}
            styles={styles}
          />
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            This document is confidential and for medical professionals only
          </Text>
          <Text style={styles.footerBrand}>
            Powered by Aneya Healthcare Platform
          </Text>
        </View>

        {/* Page number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
};

export default FormPdfDocument;
