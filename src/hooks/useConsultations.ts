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

        const { data, error: saveError } = await supabase
          .from('consultations')
          .insert({
            ...input,
            performed_by: user.id,
          })
          .select()
          .single();

        if (saveError) throw saveError;

        // If this consultation is linked to an appointment, update the appointment status
        if (input.appointment_id) {
          const { error: updateError } = await supabase
            .from('appointments')
            .update({
              status: 'completed',
              consultation_id: data.id
            })
            .eq('id', input.appointment_id)
            .eq('created_by', user.id);

          if (updateError) {
            console.error('Error updating appointment status:', updateError);
            // Don't fail the consultation save if appointment update fails
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

  return {
    consultations,
    loading,
    error,
    saveConsultation,
    refetch: fetchConsultations,
  };
}
