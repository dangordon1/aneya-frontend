/**
 * React Hook for Historical Form Imports
 * Handles uploading historical patient forms and managing review workflow
 */

import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface HistoricalFormImport {
  id: string;
  patient_id: string;
  uploaded_by: string;
  file_count: number;
  file_metadata: Array<{
    file_name: string;
    file_type: string;
    gcs_path: string;
    file_size_bytes: number;
  }>;
  extracted_data: {
    demographics?: Record<string, any>;
    vitals?: Array<Record<string, any>>;
    medications?: Array<Record<string, any>>;
    allergies?: Array<Record<string, any>>;
    medical_history?: Record<string, any>;
    forms?: Array<Record<string, any>>;
    form_metadata?: Record<string, any>;
  };
  current_data: Record<string, any>;
  conflicts: Record<string, {
    current_value: any;
    extracted_value: any;
    conflict_type: string;
    [key: string]: any;
  }>;
  has_conflicts: boolean;
  extraction_confidence: number;
  fields_extracted: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  processed_at?: string;
  review_status: 'pending_review' | 'approved' | 'rejected' | 'partially_approved';
  reviewed_by?: string;
  reviewed_at?: string;
  approved_fields: string[];
  rejected_fields: string[];
  review_notes?: string;
  form_date?: string;
  created_at: string;
  updated_at: string;
}

export interface UploadHistoricalFormsParams {
  patientId: string;
  files: File[];
  formDate?: string; // YYYY-MM-DD
}

export interface ReviewDecisionParams {
  importId: string;
  approvedFields: string[];
  rejectedFields: string[];
  reviewNotes?: string;
}

export function useHistoricalFormImports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imports, setImports] = useState<HistoricalFormImport[]>([]);

  /**
   * Upload historical forms for a patient
   */
  const uploadHistoricalForms = useCallback(
    async (params: UploadHistoricalFormsParams): Promise<HistoricalFormImport | null> => {
      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('patient_id', params.patientId);

        if (params.formDate) {
          formData.append('form_date', params.formDate);
        }

        // Add all files
        params.files.forEach((file) => {
          formData.append('files', file);
        });

        const response = await fetch(`${API_BASE_URL}/api/historical-forms/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to upload forms');
        }

        const result = await response.json();
        return result;
      } catch (err: any) {
        setError(err.message || 'Failed to upload historical forms');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get list of pending imports
   */
  const getPendingImports = useCallback(
    async (patientId?: string, limit = 50, offset = 0): Promise<HistoricalFormImport[]> => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
        });

        if (patientId) {
          params.append('patient_id', patientId);
        }

        const response = await fetch(
          `${API_BASE_URL}/api/historical-forms/pending?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch pending imports');
        }

        const data = await response.json();
        setImports(data.imports || []);
        return data.imports || [];
      } catch (err: any) {
        setError(err.message || 'Failed to fetch pending imports');
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get details of a specific import
   */
  const getImportDetails = useCallback(
    async (importId: string): Promise<HistoricalFormImport | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/historical-forms/${importId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch import details');
        }

        const data = await response.json();
        return data;
      } catch (err: any) {
        setError(err.message || 'Failed to fetch import details');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Submit review decision for an import
   */
  const submitReviewDecision = useCallback(
    async (params: ReviewDecisionParams): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/historical-forms/review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            import_id: params.importId,
            approved_fields: params.approvedFields,
            rejected_fields: params.rejectedFields,
            review_notes: params.reviewNotes,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to submit review');
        }

        return true;
      } catch (err: any) {
        setError(err.message || 'Failed to submit review decision');
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Apply approved import to patient record
   */
  const applyImport = useCallback(
    async (importId: string): Promise<{ success: boolean; recordsCreated: number; recordsUpdated: number } | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/historical-forms/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            import_id: importId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to apply import');
        }

        const result = await response.json();
        return {
          success: result.success,
          recordsCreated: result.records_created,
          recordsUpdated: result.records_updated,
        };
      } catch (err: any) {
        setError(err.message || 'Failed to apply import');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Delete a pending import
   */
  const deleteImport = useCallback(
    async (importId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/historical-forms/${importId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete import');
        }

        // Remove from local state
        setImports((prev) => prev.filter((imp) => imp.id !== importId));
        return true;
      } catch (err: any) {
        setError(err.message || 'Failed to delete import');
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    imports,
    uploadHistoricalForms,
    getPendingImports,
    getImportDetails,
    submitReviewDecision,
    applyImport,
    deleteImport,
  };
}
