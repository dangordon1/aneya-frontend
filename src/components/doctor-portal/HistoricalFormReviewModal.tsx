/**
 * Modal wrapper for Historical Form Review
 * Provides full-screen review interface with patient context
 */

import { useState, useEffect } from 'react';
import { HistoricalFormImport, useHistoricalFormImports } from '../../hooks/useHistoricalFormImports';
import { HistoricalFormReview } from './HistoricalFormReview';

interface HistoricalFormReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  importId: string;
  onReviewComplete?: () => void;
  onApplyComplete?: () => void;
}

export function HistoricalFormReviewModal({
  isOpen,
  onClose,
  importId,
  onReviewComplete,
  onApplyComplete,
}: HistoricalFormReviewModalProps) {
  const {
    getImportDetails,
    submitReviewDecision,
    applyImport,
    loading,
    error,
  } = useHistoricalFormImports();

  const [importRecord, setImportRecord] = useState<HistoricalFormImport | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && importId) {
      loadImportDetails();
    }
  }, [isOpen, importId]);

  const loadImportDetails = async () => {
    setLoadingDetails(true);
    const details = await getImportDetails(importId);
    if (details) {
      setImportRecord(details);
    }
    setLoadingDetails(false);
  };

  const handleSubmitReview = async (
    approvedFields: string[],
    rejectedFields: string[],
    notes?: string
  ): Promise<boolean> => {
    const success = await submitReviewDecision({
      importId,
      approvedFields,
      rejectedFields,
      reviewNotes: notes,
    });

    if (success) {
      setSuccessMessage('Review submitted successfully! You can now apply the approved changes.');
      // Reload details to get updated status
      await loadImportDetails();
      if (onReviewComplete) {
        onReviewComplete();
      }
    }

    return success;
  };

  const handleApplyChanges = async (): Promise<boolean> => {
    const result = await applyImport(importId);

    if (result && result.success) {
      setSuccessMessage(
        `Changes applied successfully! ${result.recordsCreated} records created, ${result.recordsUpdated} records updated.`
      );
      if (onApplyComplete) {
        onApplyComplete();
      }
      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 2000);
    }

    return result?.success || false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Review Historical Form Import</h2>
            {importRecord && (
              <p className="text-sm text-gray-600 mt-1">
                {importRecord.file_count} file{importRecord.file_count !== 1 ? 's' : ''} uploaded •{' '}
                {importRecord.fields_extracted} fields extracted
                {importRecord.form_date && ` • Form date: ${new Date(importRecord.form_date).toLocaleDateString()}`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-600">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading import details...</span>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-red-900">Error Loading Import</h4>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <button
                    onClick={loadImportDetails}
                    className="text-sm text-red-600 hover:text-red-800 underline mt-2"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          ) : importRecord ? (
            <>
              {/* Success Message */}
              {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                </div>
              )}

              {/* Review Component */}
              <HistoricalFormReview
                importRecord={importRecord}
                onSubmitReview={handleSubmitReview}
                onApplyChanges={handleApplyChanges}
                loading={loading}
              />
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No import data found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              Review extracted data and approve changes before applying to patient record
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
