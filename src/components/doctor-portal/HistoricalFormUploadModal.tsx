/**
 * Modal wrapper for Historical Form Upload
 * Provides a modal interface for uploading historical patient forms
 */

import { Patient } from '../../types/database';
import { HistoricalFormUpload } from './HistoricalFormUpload';

interface HistoricalFormUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onUploadComplete?: () => void;
}

export function HistoricalFormUploadModal({
  isOpen,
  onClose,
  patient,
  onUploadComplete,
}: HistoricalFormUploadModalProps) {
  if (!isOpen) return null;

  const handleUploadComplete = () => {
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Historical Forms</h2>
            <p className="text-sm text-gray-600 mt-1">
              Import patient data from past appointment forms
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <HistoricalFormUpload
            patient={patient}
            onUploadComplete={handleUploadComplete}
          />
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              Supported formats: JPEG, PNG, HEIC, PDF
            </div>
            <button
              onClick={handleClose}
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
