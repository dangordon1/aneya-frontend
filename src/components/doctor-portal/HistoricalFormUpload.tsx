/**
 * Historical Form Upload Component
 * Allows doctors to upload historical patient forms and initiate import process
 */

import { useState } from 'react';
import { useHistoricalFormImports } from '../../hooks/useHistoricalFormImports';
import { Patient } from '../../types/database';

interface HistoricalFormUploadProps {
  patient: Patient;
  onUploadComplete?: (importId: string) => void;
}

export function HistoricalFormUpload({ patient, onUploadComplete }: HistoricalFormUploadProps) {
  const { uploadHistoricalForms, loading, error: hookError } = useHistoricalFormImports();

  const [files, setFiles] = useState<File[]>([]);
  const [formDate, setFormDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [importId, setImportId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);

      // Validate file count
      if (fileList.length === 0) {
        setError('Please select at least 1 file');
        return;
      }
      if (fileList.length > 10) {
        setError('Maximum 10 files allowed');
        return;
      }

      // Validate file sizes (10MB limit per file)
      const oversizedFiles = fileList.filter(f => f.size > 10 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        setError(`Some files exceed 10MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }

      // Validate file types
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'application/pdf'];
      const invalidFiles = fileList.filter(f => {
        // Check MIME type or file extension
        const ext = f.name.toLowerCase().split('.').pop();
        return !allowedTypes.includes(f.type) &&
               !['jpg', 'jpeg', 'png', 'heic', 'pdf'].includes(ext || '');
      });

      if (invalidFiles.length > 0) {
        setError(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}`);
        return;
      }

      setFiles(fileList);
      setError(null);
      setUploadSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setError(null);
    setUploadSuccess(false);

    try {
      const result = await uploadHistoricalForms({
        patientId: patient.id,
        files,
        formDate: formDate || undefined,
      });

      if (result) {
        setUploadSuccess(true);
        setImportId(result.id);

        // Reset form
        setFiles([]);
        setFormDate('');

        // Reset file input
        const fileInput = document.getElementById('historical-form-files') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        // Notify parent
        if (onUploadComplete) {
          onUploadComplete(result.id);
        }
      } else {
        setError(hookError || 'Upload failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient Info */}
      <div className="bg-aneya-cream border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-aneya-navy rounded-full flex items-center justify-center text-white font-medium">
            {patient.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{patient.name}</h3>
            <p className="text-sm text-gray-600">
              {patient.age_years ? `${patient.age_years} years` : 'Age not specified'} • {patient.sex}
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {uploadSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-medium text-green-900">Forms Uploaded Successfully!</h4>
              <p className="text-sm text-green-700 mt-1">
                {files.length} file{files.length > 1 ? 's have' : ' has'} been uploaded and are being processed.
              </p>
              <p className="text-sm text-green-700 mt-1">
                You'll be able to review the extracted data once processing is complete (typically 30-60 seconds).
              </p>
              {importId && (
                <p className="text-xs text-green-600 mt-2 font-mono">
                  Import ID: {importId}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {(error || hookError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error || hookError}</p>
          </div>
        </div>
      )}

      {/* Form Date (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Original Form Date (Optional)
        </label>
        <input
          type="date"
          value={formDate}
          onChange={(e) => setFormDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">
          If known, enter the date when the original form was filled
        </p>
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Historical Form Files <span className="text-red-500">*</span>
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-aneya-teal transition-colors">
          <input
            id="historical-form-files"
            type="file"
            multiple
            accept=".heic,.jpg,.jpeg,.png,.pdf,.HEIC,.JPG,.JPEG,.PNG,.PDF"
            onChange={handleFileChange}
            className="hidden"
            disabled={loading}
          />
          <label
            htmlFor="historical-form-files"
            className="cursor-pointer flex flex-col items-center"
          >
            <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600 font-medium">Click to upload historical forms</p>
            <p className="text-xs text-gray-500 mt-1">
              Images (HEIC, JPEG, PNG) or PDF documents
            </p>
            <p className="text-xs text-gray-500">
              1-10 files, max 10MB each
            </p>
          </label>
        </div>

        {/* File Preview */}
        {files.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {files.length} file{files.length > 1 ? 's' : ''} selected:
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {files.map((file, index) => {
                const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                return (
                  <div key={index} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {isPDF ? (
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                        <path d="M14 2v6h6"/>
                        <path d="M10 12h4v1h-4z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button
                      onClick={() => {
                        const newFiles = files.filter((_, i) => i !== index);
                        setFiles(newFiles);
                      }}
                      className="text-red-500 hover:text-red-700"
                      disabled={loading}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-700">
            <h4 className="font-medium text-blue-900 mb-1">What happens after upload?</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>AI extracts patient data from uploaded forms</li>
              <li>System detects conflicts with existing patient data</li>
              <li>You'll review extracted data and approve changes</li>
              <li>Approved data updates the patient's record</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Button */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || loading}
          className="px-6 py-3 bg-aneya-navy text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading & Processing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload & Extract Data
            </>
          )}
        </button>
      </div>

      {/* Processing Info */}
      {loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-900">AI Processing in Progress</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Claude Vision AI is analyzing your uploaded forms to extract patient data.
                This typically takes 30-60 seconds depending on the number of files.
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                Please wait while we process your files...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
