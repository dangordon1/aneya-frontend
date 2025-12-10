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

      try {
        setError(null);

        const insertData = {
          ...input,
          performed_by: user.id,
        };
        console.log('Saving consultation with data:', insertData);

        const { data, error: saveError } = await supabase
          .from('consultations')
          .insert(insertData)
          .select()
          .single();

        if (saveError) {
          console.error('Supabase save error:', saveError);
          throw saveError;
        }

        if (!data) {
          throw new Error('No data returned from save');
        }

        // If this consultation is linked to an appointment, update the appointment status
        if (input.appointment_id) {
          console.log('Updating appointment status to completed:', input.appointment_id);
          const { error: updateError } = await supabase
            .from('appointments')
            .update({
              status: 'completed',
              consultation_id: data.id
            })
            .eq('id', input.appointment_id);

          if (updateError) {
            console.error('Error updating appointment status:', updateError);
            // Don't fail the consultation save if appointment update fails
          } else {
            console.log('Appointment marked as completed');
          }
        }

        setConsultations((prev) => [data, ...prev]);

        return data;
      } catch (err) {
        console.error('Error saving consultation:', err);
        setError(err instanceof Error ? err.message : 'Failed to save consultation');
        return null;
      }
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
