/**
 * useFormAutoFill Hook
 *
 * Manages real-time form field auto-fill from consultation transcription.
 *
 * Features:
 * - Processes diarized transcript chunks
 * - Extracts clinical data using AI
 * - Tracks auto-filled vs manually edited fields
 * - Prevents overwriting manual edits
 * - Provides visual indicator support
 */

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { DiarizedSegment } from '../lib/consultationEventBus';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface UseFormAutoFillOptions {
  formType: 'obgyn' | 'infertility' | 'antenatal';
  patientContext: Record<string, any>;
  currentFormState: Record<string, any>;
  onFieldsUpdated: (updates: FieldUpdates) => void;
}

export interface FieldUpdates {
  field_updates: Record<string, any>;
  confidence_scores: Record<string, number>;
  chunk_index: number;
}

export interface UseFormAutoFillReturn {
  processTranscriptChunk: (segments: DiarizedSegment[], chunkIndex: number) => Promise<void>;
  markManualOverride: (fieldPath: string) => void;
  autoFilledFields: Set<string>;
  manualOverrides: Set<string>;
  isProcessing: boolean;
  error: string | null;
}

/**
 * Hook for managing form auto-fill from consultation transcripts
 */
export function useFormAutoFill(options: UseFormAutoFillOptions): UseFormAutoFillReturn {
  const { getIdToken } = useAuth();
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track processing chunks to avoid duplicate calls
  const processingChunks = useRef<Set<number>>(new Set());

  /**
   * Process a transcript chunk and extract form fields
   */
  const processTranscriptChunk = useCallback(
    async (segments: DiarizedSegment[], chunkIndex: number) => {
      // Avoid duplicate processing of the same chunk
      if (processingChunks.current.has(chunkIndex)) {
        console.log(`⏭️  Skipping chunk #${chunkIndex} (already processed)`);
        return;
      }

      processingChunks.current.add(chunkIndex);
      setIsProcessing(true);
      setError(null);

      try {
        console.log(`📋 Processing chunk #${chunkIndex} for ${options.formType} form auto-fill`);

        // Get Firebase ID token for authentication
        const idToken = await getIdToken();
        if (!idToken) {
          throw new Error('Not authenticated - no ID token available');
        }

        // Call backend extraction endpoint with authentication
        const response = await fetch(`${API_URL}/api/extract-form-fields`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            diarized_segments: segments,
            form_type: options.formType,
            patient_context: options.patientContext,
            current_form_state: options.currentFormState,
            chunk_index: chunkIndex,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const result = await response.json();

        // Filter out fields with manual overrides
        const filteredUpdates = Object.entries(result.field_updates || {})
          .filter(([path]) => !manualOverrides.has(path))
          .reduce((acc, [path, value]) => ({ ...acc, [path]: value }), {});

        if (Object.keys(filteredUpdates).length === 0) {
          console.log(`⏭️  No new fields to update from chunk #${chunkIndex}`);
          setIsProcessing(false);
          return;
        }

        // Track newly auto-filled fields
        setAutoFilledFields((prev) => {
          const updated = new Set(prev);
          Object.keys(filteredUpdates).forEach((path) => updated.add(path));
          return updated;
        });

        // Trigger callback with filtered updates
        options.onFieldsUpdated({
          field_updates: filteredUpdates,
          confidence_scores: result.confidence_scores || {},
          chunk_index: chunkIndex,
        });

        console.log(
          `✅ Auto-filled ${Object.keys(filteredUpdates).length} fields from chunk #${chunkIndex}`
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Error processing chunk #${chunkIndex}:`, errorMessage);
        setError(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [options, manualOverrides]
  );

  /**
   * Mark a field as manually overridden (will not be auto-filled again)
   */
  const markManualOverride = useCallback((fieldPath: string) => {
    console.log(`✏️  Field '${fieldPath}' marked as manual override`);

    setManualOverrides((prev) => {
      const updated = new Set(prev);
      updated.add(fieldPath);
      return updated;
    });

    // Remove from auto-filled set if present
    setAutoFilledFields((prev) => {
      const updated = new Set(prev);
      updated.delete(fieldPath);
      return updated;
    });
  }, []);

  return {
    processTranscriptChunk,
    markManualOverride,
    autoFilledFields,
    manualOverrides,
    isProcessing,
    error,
  };
}

/**
 * Helper function to apply nested field updates to form state
 *
 * @param currentState - Current form state
 * @param fieldUpdates - Field updates in dot notation
 * @returns Updated form state
 */
export function applyFieldUpdatesToState(
  currentState: Record<string, any>,
  fieldUpdates: Record<string, any>
): Record<string, any> {
  const newState = { ...currentState };

  for (const [fieldPath, value] of Object.entries(fieldUpdates)) {
    if (fieldPath.includes('.')) {
      // Nested field (e.g., "vital_signs.systolic_bp")
      const [parent, child] = fieldPath.split('.', 2);

      if (!newState[parent]) {
        newState[parent] = {};
      }

      // Handle further nesting if needed
      if (child.includes('.')) {
        const childParts = child.split('.');
        let current = newState[parent];
        for (let i = 0; i < childParts.length - 1; i++) {
          const part = childParts[i];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
        current[childParts[childParts.length - 1]] = value;
      } else {
        newState[parent] = {
          ...newState[parent],
          [child]: value,
        };
      }
    } else {
      // Top-level field
      newState[fieldPath] = value;
    }
  }

  return newState;
}

/**
 * Helper function to get CSS classes for auto-filled fields
 *
 * @param fieldPath - Field path in dot notation
 * @param autoFilledFields - Set of auto-filled field paths
 * @param baseClasses - Base CSS classes
 * @returns CSS classes with auto-fill indicator if applicable
 */
export function getAutoFillFieldClasses(
  fieldPath: string,
  autoFilledFields: Set<string>,
  baseClasses: string = ''
): string {
  const isAutoFilled = autoFilledFields.has(fieldPath);

  return isAutoFilled
    ? `${baseClasses} border-blue-400 bg-blue-50`.trim()
    : baseClasses;
}
