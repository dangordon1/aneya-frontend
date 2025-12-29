import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Consultation,
  CreateConsultationInput,
} from '../types/database';

interface UseConsultationsReturn {
  consultations: Consultation[];
  loading: boolean;
  error: string | null;
  saveConsultation: (input: CreateConsultationInput) => Promise<Consultation | null>;
  deleteConsultation: (consultationId: string) => Promise<boolean>;
  refetch: (patientId?: string) => Promise<void>;
}

export function useConsultations(initialPatientId?: string): UseConsultationsReturn {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConsultations = useCallback(
    async (patientId?: string) => {
      if (!user) {
        setConsultations([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('consultations')
          .select('*')
          .eq('performed_by', user.id)
          .order('created_at', { ascending: false });

        if (patientId) {
          query = query.eq('patient_id', patientId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setConsultations(data || []);
      } catch (err) {
        console.error('Error fetching consultations:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch consultations');
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    fetchConsultations(initialPatientId);
  }, [fetchConsultations, initialPatientId]);

  const saveConsultation = useCallback(
    async (input: CreateConsultationInput): Promise<Consultation | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      // Helper to check if error is retryable (network issues)
      const isRetryableError = (err: unknown): boolean => {
        const message = err instanceof Error ? err.message : String(err);
        const errorObj = err as { code?: string; message?: string };
        return (
          message.includes('Load failed') ||
          message.includes('network') ||
          message.includes('connection') ||
          message.includes('TypeError: Load failed') ||
          errorObj?.code === ''
        );
      };

      // Helper to sleep
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const insertData = {
        ...input,
        performed_by: user.id,
      };

      const maxAttempts = 3;
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          setError(null);
          console.log(`Saving consultation (attempt ${attempt}/${maxAttempts}):`, insertData);

          const { data, error: saveError } = await supabase
            .from('consultations')
            .insert(insertData)
            .select()
            .single();

          if (saveError) {
            console.error('Supabase save error:', saveError);
            // Check if this is a retryable error
            if (isRetryableError(saveError) && attempt < maxAttempts) {
              const delay = Math.min(500 * Math.pow(2, attempt - 1), 5000);
              console.warn(`Network error, retrying in ${delay}ms...`);
              await sleep(delay);
              continue;
            }
            throw saveError;
          }

          if (!data) {
            throw new Error('No data returned from save');
          }

          // Appointment status update is now handled by database trigger
          // See migration: 012_appointment_status_trigger.sql
          // The trigger automatically updates appointment.status to 'completed'
          // when a consultation is saved with an appointment_id

          setConsultations((prev) => [data, ...prev]);
          console.log('Consultation saved successfully');
          return data;
        } catch (err) {
          lastError = err;
          if (isRetryableError(err) && attempt < maxAttempts) {
            const delay = Math.min(500 * Math.pow(2, attempt - 1), 5000);
            console.warn(`Network error (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`, err);
            await sleep(delay);
            continue;
          }
          console.error('Error saving consultation:', err);
          setError(err instanceof Error ? err.message : 'Failed to save consultation');
          return null;
        }
      }

      // All retries exhausted
      console.error('All retry attempts failed:', lastError);
      setError('Network connection lost. Please check your connection and try again.');
      return null;
    },
    [user]
  );

  const deleteConsultation = useCallback(
    async (consultationId: string): Promise<boolean> => {
      if (!user) {
        setError('User not authenticated');
        return false;
      }

      try {
        setError(null);

        // First, check if there's an appointment linked to this consultation and reset it
        const { error: appointmentUpdateError } = await supabase
          .from('appointments')
          .update({
            status: 'scheduled',
            consultation_id: null
          })
          .eq('consultation_id', consultationId);

        if (appointmentUpdateError) {
          console.error('Error resetting appointment:', appointmentUpdateError);
          // Continue with deletion even if appointment reset fails
        }

        // Delete the consultation
        const { error: deleteError } = await supabase
          .from('consultations')
          .delete()
          .eq('id', consultationId);

        if (deleteError) {
          console.error('Error deleting consultation:', deleteError);
          throw deleteError;
        }

        // Update local state
        setConsultations((prev) => prev.filter((c) => c.id !== consultationId));

        return true;
      } catch (err) {
        console.error('Error deleting consultation:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete consultation');
        return false;
      }
    },
    [user]
  );

  return {
    consultations,
    loading,
    error,
    saveConsultation,
    deleteConsultation,
    refetch: fetchConsultations,
  };
}
