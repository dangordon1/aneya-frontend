import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  PatientSymptom,
  CreateSymptomInput,
  UpdateSymptomInput,
} from '../types/database';

interface UsePatientSymptomsReturn {
  symptoms: PatientSymptom[];
  loading: boolean;
  error: string | null;
  createSymptom: (input: CreateSymptomInput) => Promise<PatientSymptom | null>;
  updateSymptom: (symptomId: string, input: UpdateSymptomInput) => Promise<PatientSymptom | null>;
  deleteSymptom: (symptomId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function usePatientSymptoms(): UsePatientSymptomsReturn {
  const { patientProfile } = useAuth();
  const [symptoms, setSymptoms] = useState<PatientSymptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSymptoms = useCallback(async () => {
    if (!patientProfile?.id) {
      setSymptoms([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('patient_symptoms')
        .select('*')
        .eq('patient_id', patientProfile.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSymptoms(data || []);
    } catch (err) {
      console.error('Error fetching symptoms:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch symptoms');
    } finally {
      setLoading(false);
    }
  }, [patientProfile?.id]);

  useEffect(() => {
    fetchSymptoms();
  }, [fetchSymptoms]);

  const createSymptom = useCallback(
    async (input: CreateSymptomInput): Promise<PatientSymptom | null> => {
      if (!patientProfile?.id) {
        setError('Patient profile not available');
        return null;
      }

      try {
        setError(null);

        const insertData = {
          ...input,
          patient_id: patientProfile.id,
        };

        const { data, error: insertError } = await supabase
          .from('patient_symptoms')
          .insert(insertData)
          .select()
          .single();

        if (insertError) throw insertError;

        if (!data) {
          throw new Error('No data returned from insert');
        }

        setSymptoms((prev) => [data, ...prev]);
        return data;
      } catch (err) {
        console.error('Error creating symptom:', err);
        setError(err instanceof Error ? err.message : 'Failed to create symptom');
        return null;
      }
    },
    [patientProfile?.id]
  );

  const updateSymptom = useCallback(
    async (symptomId: string, input: UpdateSymptomInput): Promise<PatientSymptom | null> => {
      if (!patientProfile?.id) {
        setError('Patient profile not available');
        return null;
      }

      try {
        setError(null);

        const { data, error: updateError } = await supabase
          .from('patient_symptoms')
          .update(input)
          .eq('id', symptomId)
          .eq('patient_id', patientProfile.id)
          .select()
          .single();

        if (updateError) throw updateError;

        if (!data) {
          throw new Error('No data returned from update');
        }

        setSymptoms((prev) =>
          prev.map((s) => (s.id === symptomId ? data : s))
        );
        return data;
      } catch (err) {
        console.error('Error updating symptom:', err);
        setError(err instanceof Error ? err.message : 'Failed to update symptom');
        return null;
      }
    },
    [patientProfile?.id]
  );

  const deleteSymptom = useCallback(
    async (symptomId: string): Promise<boolean> => {
      if (!patientProfile?.id) {
        setError('Patient profile not available');
        return false;
      }

      try {
        setError(null);

        const { error: deleteError } = await supabase
          .from('patient_symptoms')
          .delete()
          .eq('id', symptomId)
          .eq('patient_id', patientProfile.id);

        if (deleteError) throw deleteError;

        setSymptoms((prev) => prev.filter((s) => s.id !== symptomId));
        return true;
      } catch (err) {
        console.error('Error deleting symptom:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete symptom');
        return false;
      }
    },
    [patientProfile?.id]
  );

  return {
    symptoms,
    loading,
    error,
    createSymptom,
    updateSymptom,
    deleteSymptom,
    refetch: fetchSymptoms,
  };
}
