/**
 * Pending Historical Imports List
 * Shows imports awaiting doctor review with processing status
 */

import { useState, useEffect } from 'react';
import { useHistoricalFormImports, HistoricalFormImport } from '../../hooks/useHistoricalFormImports';
import { HistoricalFormReviewModal } from './HistoricalFormReviewModal';

interface PendingHistoricalImportsProps {
  patientId?: string;
  onViewImport?: (importRecord: HistoricalFormImport) => void;
  onReviewComplete?: () => void;
}

export function PendingHistoricalImports({ patientId, onViewImport, onReviewComplete }: PendingHistoricalImportsProps) {
  const { getPendingImports, deleteImport, loading, error, imports } = useHistoricalFormImports();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    loadImports();
  }, [patientId]);

  const loadImports = async () => {
    await getPendingImports(patientId);
  };

  const handleDelete = async (importId: string) => {
    if (!confirm('Are you sure you want to delete this import? This cannot be undone.')) {
      return;
    }

    setDeletingId(importId);
    const success = await deleteImport(importId);
    if (success) {
      await loadImports();
    }
    setDeletingId(null);
  };

  const getStatusBadge = (importRecord: HistoricalFormImport) => {
    const { processing_status, review_status } = importRecord;

    if (processing_status === 'failed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Failed
        </span>
      );
    }

    if (processing_status === 'processing' || processing_status === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-yellow-800" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing
        </span>
      );
    }

    if (review_status === 'pending_review') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Ready for Review
        </span>
      );
    }

    return null;
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          High Confidence
        </span>
      );
    } else if (confidence >= 0.5) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          Medium Confidence
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
          Low Confidence
        </span>
      );
    }
  };

  if (loading && imports.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-600">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading imports...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-red-900">Error Loading Imports</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={loadImports}
              className="text-sm text-red-600 hover:text-red-800 underline mt-2"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Pending Imports</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload historical forms to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Refresh Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">
          {imports.length} Pending Import{imports.length !== 1 ? 's' : ''}
        </h3>
        <button
          onClick={loadImports}
          disabled={loading}
          className="text-sm text-aneya-teal hover:text-aneya-navy flex items-center gap-1 disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Import Cards */}
      <div className="space-y-3">
        {imports.map((importRecord) => (
          <div
            key={importRecord.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-aneya-teal transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Status & Date */}
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(importRecord)}
                  {importRecord.has_conflicts && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Conflicts
                    </span>
                  )}
                  {importRecord.extraction_confidence !== null && importRecord.extraction_confidence !== undefined && (
                    getConfidenceBadge(importRecord.extraction_confidence)
                  )}
                </div>

                {/* File Count & Date */}
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {importRecord.file_count} file{importRecord.file_count !== 1 ? 's' : ''}
                  </span>
                  {importRecord.form_date && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Form date: {new Date(importRecord.form_date).toLocaleDateString()}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(importRecord.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Extracted Fields Count */}
                {importRecord.fields_extracted > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {importRecord.fields_extracted} field{importRecord.fields_extracted !== 1 ? 's' : ''} extracted
                  </div>
                )}

                {/* Error Message */}
                {importRecord.processing_error && (
                  <div className="mt-2 text-sm text-red-600">
                    Error: {importRecord.processing_error}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {importRecord.processing_status === 'completed' && (
                  <button
                    onClick={() => {
                      setSelectedImportId(importRecord.id);
                      setShowReviewModal(true);
                      onViewImport?.(importRecord);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-aneya-navy rounded hover:bg-opacity-90 transition-colors"
                  >
                    Review
                  </button>
                )}
                <button
                  onClick={() => handleDelete(importRecord.id)}
                  disabled={deletingId === importRecord.id}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  title="Delete import"
                >
                  {deletingId === importRecord.id ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Review Modal */}
      {selectedImportId && (
        <HistoricalFormReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedImportId(null);
          }}
          importId={selectedImportId}
          onReviewComplete={() => {
            loadImports();
            if (onReviewComplete) {
              onReviewComplete();
            }
          }}
          onApplyComplete={() => {
            loadImports();
            if (onReviewComplete) {
              onReviewComplete();
            }
          }}
        />
      )}
    </div>
  );
}
