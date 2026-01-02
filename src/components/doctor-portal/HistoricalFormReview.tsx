/**
 * Historical Form Review Component
 * Side-by-side comparison of extracted vs current patient data
 * Allows doctors to approve/reject specific fields
 */

import { useState, useMemo } from 'react';
import { HistoricalFormImport } from '../../hooks/useHistoricalFormImports';

interface HistoricalFormReviewProps {
  importRecord: HistoricalFormImport;
  onSubmitReview: (approvedFields: string[], rejectedFields: string[], notes?: string) => Promise<boolean>;
  onApplyChanges: () => Promise<boolean>;
  loading?: boolean;
}

interface FieldComparison {
  path: string;
  label: string;
  currentValue: any;
  extractedValue: any;
  hasConflict: boolean;
  conflictType?: string;
  category: string;
  approved: boolean;
}

export function HistoricalFormReview({
  importRecord,
  onSubmitReview,
  onApplyChanges,
  loading = false,
}: HistoricalFormReviewProps) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [fieldApprovals, setFieldApprovals] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [applying, setApplying] = useState(false);

  // Build field comparisons
  const fieldComparisons = useMemo(() => {
    const comparisons: FieldComparison[] = [];
    const { extracted_data, current_data, conflicts } = importRecord;

    // Helper to add field comparison
    const addField = (
      category: string,
      path: string,
      label: string,
      currentValue: any,
      extractedValue: any
    ) => {
      const conflict = conflicts[path];
      comparisons.push({
        path,
        label,
        currentValue,
        extractedValue,
        hasConflict: !!conflict,
        conflictType: conflict?.conflict_type,
        category,
        approved: fieldApprovals[path] ?? false,
      });
    };

    // Demographics
    if (extracted_data.demographics) {
      const demo = extracted_data.demographics;
      const currentDemo = current_data.demographics || {};

      if (demo.name) addField('Demographics', 'demographics.name', 'Name', currentDemo.name, demo.name);
      if (demo.date_of_birth) addField('Demographics', 'demographics.date_of_birth', 'Date of Birth', currentDemo.date_of_birth, demo.date_of_birth);
      if (demo.age_years) addField('Demographics', 'demographics.age_years', 'Age', currentDemo.age_years, demo.age_years);
      if (demo.sex) addField('Demographics', 'demographics.sex', 'Sex', currentDemo.sex, demo.sex);
      if (demo.phone) addField('Demographics', 'demographics.phone', 'Phone', currentDemo.phone, demo.phone);
      if (demo.email) addField('Demographics', 'demographics.email', 'Email', currentDemo.email, demo.email);
      if (demo.height_cm) addField('Demographics', 'demographics.height_cm', 'Height (cm)', currentDemo.height_cm, demo.height_cm);
      if (demo.weight_kg) addField('Demographics', 'demographics.weight_kg', 'Weight (kg)', currentDemo.weight_kg, demo.weight_kg);
    }

    // Vitals
    if (extracted_data.vitals && Array.isArray(extracted_data.vitals)) {
      extracted_data.vitals.forEach((vital: any, index: number) => {
        const vitalFields = [
          { key: 'systolic_bp', label: 'Systolic BP (mmHg)' },
          { key: 'diastolic_bp', label: 'Diastolic BP (mmHg)' },
          { key: 'heart_rate', label: 'Heart Rate (bpm)' },
          { key: 'respiratory_rate', label: 'Respiratory Rate' },
          { key: 'temperature_celsius', label: 'Temperature (°C)' },
          { key: 'spo2', label: 'SpO2 (%)' },
          { key: 'blood_glucose_mg_dl', label: 'Blood Glucose (mg/dL)' },
        ];

        vitalFields.forEach(({ key, label }) => {
          if (vital[key] !== undefined && vital[key] !== null) {
            addField(
              `Vitals #${index + 1}`,
              `vitals.${index}.${key}`,
              label,
              null, // Current vitals not compared (additive)
              vital[key]
            );
          }
        });

        if (vital.recorded_at) {
          addField(
            `Vitals #${index + 1}`,
            `vitals.${index}.recorded_at`,
            'Recorded At',
            null,
            vital.recorded_at
          );
        }
      });
    }

    // Medications
    if (extracted_data.medications && Array.isArray(extracted_data.medications)) {
      extracted_data.medications.forEach((med: any, index: number) => {
        if (med.medication_name) {
          addField(
            `Medication #${index + 1}`,
            `medications.${index}.medication_name`,
            'Medication Name',
            null,
            med.medication_name
          );
        }
        if (med.dosage) {
          addField(
            `Medication #${index + 1}`,
            `medications.${index}.dosage`,
            'Dosage',
            null,
            med.dosage
          );
        }
        if (med.frequency) {
          addField(
            `Medication #${index + 1}`,
            `medications.${index}.frequency`,
            'Frequency',
            null,
            med.frequency
          );
        }
        if (med.status) {
          addField(
            `Medication #${index + 1}`,
            `medications.${index}.status`,
            'Status',
            null,
            med.status
          );
        }
      });
    }

    // Allergies
    if (extracted_data.allergies && Array.isArray(extracted_data.allergies)) {
      extracted_data.allergies.forEach((allergy: any, index: number) => {
        if (allergy.allergen) {
          addField(
            `Allergy #${index + 1}`,
            `allergies.${index}.allergen`,
            'Allergen',
            null,
            allergy.allergen
          );
        }
        if (allergy.severity) {
          addField(
            `Allergy #${index + 1}`,
            `allergies.${index}.severity`,
            'Severity',
            null,
            allergy.severity
          );
        }
        if (allergy.reaction) {
          addField(
            `Allergy #${index + 1}`,
            `allergies.${index}.reaction`,
            'Reaction',
            null,
            allergy.reaction
          );
        }
      });
    }

    // Medical History
    if (extracted_data.medical_history) {
      const medHist = extracted_data.medical_history;
      const currentMedHist = current_data.medical_history || {};

      if (medHist.current_conditions) {
        addField(
          'Medical History',
          'medical_history.current_conditions',
          'Current Conditions',
          currentMedHist.current_conditions,
          medHist.current_conditions
        );
      }
      if (medHist.past_surgeries) {
        addField(
          'Medical History',
          'medical_history.past_surgeries',
          'Past Surgeries',
          currentMedHist.past_surgeries,
          medHist.past_surgeries
        );
      }
      if (medHist.family_history) {
        addField(
          'Medical History',
          'medical_history.family_history',
          'Family History',
          currentMedHist.family_history,
          medHist.family_history
        );
      }
    }

    return comparisons;
  }, [importRecord, fieldApprovals]);

  // Group by category
  const groupedFields = useMemo(() => {
    const groups: Record<string, FieldComparison[]> = {};
    fieldComparisons.forEach((field) => {
      if (!groups[field.category]) {
        groups[field.category] = [];
      }
      groups[field.category].push(field);
    });
    return groups;
  }, [fieldComparisons]);

  const toggleField = (path: string) => {
    setFieldApprovals((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const selectAll = () => {
    const allApprovals: Record<string, boolean> = {};
    fieldComparisons.forEach((field) => {
      allApprovals[field.path] = true;
    });
    setFieldApprovals(allApprovals);
  };

  const deselectAll = () => {
    setFieldApprovals({});
  };

  const handleSubmitReview = async () => {
    const approvedFields = Object.entries(fieldApprovals)
      .filter(([_, approved]) => approved)
      .map(([path]) => path);

    const rejectedFields = fieldComparisons
      .map((f) => f.path)
      .filter((path) => !fieldApprovals[path]);

    if (approvedFields.length === 0) {
      if (!confirm('No fields selected for approval. This will reject all changes. Continue?')) {
        return;
      }
    }

    setSubmitting(true);
    const success = await onSubmitReview(approvedFields, rejectedFields, reviewNotes);
    setSubmitting(false);

    if (success) {
      // Keep approvals for apply step
    }
  };

  const handleApplyChanges = async () => {
    if (!confirm('Apply approved changes to patient record? This cannot be undone.')) {
      return;
    }

    setApplying(true);
    await onApplyChanges();
    setApplying(false);
  };

  const approvedCount = Object.values(fieldApprovals).filter(Boolean).length;
  const conflictCount = fieldComparisons.filter((f) => f.hasConflict).length;

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const getConflictBadge = (conflictType?: string) => {
    if (!conflictType) return null;

    const badges = {
      value_mismatch: (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          Mismatch
        </span>
      ),
      close_match: (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          Close Match
        </span>
      ),
      text_diff: (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
          Different
        </span>
      ),
    };

    return badges[conflictType as keyof typeof badges] || null;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">{fieldComparisons.length}</div>
          <div className="text-sm text-blue-700">Total Fields</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">{approvedCount}</div>
          <div className="text-sm text-green-700">Approved</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-900">{conflictCount}</div>
          <div className="text-sm text-orange-700">Conflicts</div>
        </div>
      </div>

      {/* Confidence Score */}
      {importRecord.extraction_confidence !== null && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">AI Extraction Confidence:</span>
            <div className="flex items-center gap-2">
              <div className="w-48 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    importRecord.extraction_confidence >= 0.8
                      ? 'bg-green-500'
                      : importRecord.extraction_confidence >= 0.5
                      ? 'bg-yellow-500'
                      : 'bg-orange-500'
                  }`}
                  style={{ width: `${importRecord.extraction_confidence * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {(importRecord.extraction_confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm text-aneya-teal hover:text-aneya-navy font-medium"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Field Comparisons by Category */}
      <div className="space-y-6">
        {Object.entries(groupedFields).map(([category, fields]) => (
          <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">{category}</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {fields.map((field) => (
                <div
                  key={field.path}
                  className={`p-4 ${field.hasConflict ? 'bg-orange-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="flex items-center h-6 pt-1">
                      <input
                        type="checkbox"
                        checked={fieldApprovals[field.path] || false}
                        onChange={() => toggleField(field.path)}
                        className="h-4 w-4 rounded border-gray-300 text-aneya-teal focus:ring-aneya-teal"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">{field.label}</span>
                        {getConflictBadge(field.conflictType)}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Current Value */}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Current Value</div>
                          <div className="text-sm text-gray-900 bg-white rounded border border-gray-200 p-2">
                            {formatValue(field.currentValue)}
                          </div>
                        </div>

                        {/* Extracted Value */}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Extracted Value</div>
                          <div className="text-sm text-gray-900 bg-blue-50 rounded border border-blue-200 p-2 font-medium">
                            {formatValue(field.extractedValue)}
                          </div>
                        </div>
                      </div>

                      {/* Conflict Details */}
                      {field.hasConflict && importRecord.conflicts[field.path] && (
                        <div className="mt-2 text-xs text-orange-700 bg-orange-100 rounded p-2">
                          <strong>Conflict:</strong>{' '}
                          {importRecord.conflicts[field.path].conflict_type === 'value_mismatch' &&
                            'Values do not match'}
                          {importRecord.conflicts[field.path].conflict_type === 'close_match' &&
                            `Values are similar but not exact (difference: ${importRecord.conflicts[field.path].difference})`}
                          {importRecord.conflicts[field.path].conflict_type === 'text_diff' &&
                            'Text content differs'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Review Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Review Notes (Optional)
        </label>
        <textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          rows={3}
          placeholder="Add any notes about your review decisions..."
          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        {importRecord.review_status === 'pending_review' ? (
          <button
            onClick={handleSubmitReview}
            disabled={submitting || loading}
            className="px-6 py-3 bg-aneya-navy text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting Review...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Submit Review ({approvedCount} approved)
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleApplyChanges}
            disabled={applying || loading || approvedCount === 0}
            className="px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {applying ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Applying Changes...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Apply Approved Changes
              </>
            )}
          </button>
        )}
      </div>

      {/* Status Message */}
      {importRecord.review_status !== 'pending_review' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-blue-900">
                Review Status: {importRecord.review_status.replace(/_/g, ' ').toUpperCase()}
              </h4>
              {importRecord.reviewed_at && (
                <p className="text-sm text-blue-700 mt-1">
                  Reviewed on {new Date(importRecord.reviewed_at).toLocaleString()}
                </p>
              )}
              {approvedCount > 0 && (
                <p className="text-sm text-blue-700 mt-1">
                  Click "Apply Approved Changes" to update the patient record.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
