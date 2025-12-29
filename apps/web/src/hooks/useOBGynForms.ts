import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  OBGynConsultationForm,
  CreateOBGynFormInput,
  UpdateOBGynFormInput,
  FormType,
} from '../types/database';

interface UseOBGynFormsReturn {
  forms: OBGynConsultationForm[];
  loading: boolean;
  error: string | null;
  createForm: (patientId: string, input: CreateOBGynFormInput) => Promise<OBGynConsultationForm | null>;
  updateForm: (formId: string, input: UpdateOBGynFormInput) => Promise<OBGynConsultationForm | null>;
  deleteForm: (formId: string) => Promise<boolean>;
  getFormByAppointment: (appointmentId: string) => OBGynConsultationForm | undefined;
  getFormByPatient: (patientId: string, formType?: FormType) => OBGynConsultationForm[];
  autoSaveForm: (formId: string, input: UpdateOBGynFormInput) => void;
  refetch: () => Promise<void>;
}

// Debounce timer map for auto-save functionality
const autoSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const AUTOSAVE_DELAY_MS = 2000; // 2 second debounce

export function useOBGynForms(patientId?: string): UseOBGynFormsReturn {
  const { user, isAdmin } = useAuth();
  const [forms, setForms] = useState<OBGynConsultationForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const autoSaveInProgressRef = useRef<Set<string>>(new Set());

  const fetchForms = useCallback(async () => {
    if (!user) {
      setForms([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('obgyn_consultation_forms')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by patient if provided
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      // Non-admins can only see forms they created
      if (!isAdmin) {
        query = query.eq('created_by', user.id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setForms(data || []);
    } catch (err) {
      console.error('Error fetching OB/GYN forms:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch OB/GYN forms');
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, patientId]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const createForm = useCallback(
    async (patientIdParam: string, input: CreateOBGynFormInput): Promise<OBGynConsultationForm | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      try {
        setError(null);

        const insertData = {
          ...input,
          patient_id: patientIdParam,
          created_by: user.id,
          updated_by: user.id,
          status: input.status || 'draft',
        };

        const { data, error: insertError } = await supabase
          .from('obgyn_consultation_forms')
          .insert(insertData)
          .select()
          .single();

        if (insertError) throw insertError;

        if (!data) {
          throw new Error('No data returned from create');
        }

        setForms((prev) => [data, ...prev]);
        return data;
      } catch (err) {
        console.error('Error creating OB/GYN form:', err);
        setError(err instanceof Error ? err.message : 'Failed to create OB/GYN form');
        return null;
      }
    },
    [user]
  );

  const updateForm = useCallback(
    async (formId: string, input: UpdateOBGynFormInput): Promise<OBGynConsultationForm | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      try {
        setError(null);

        let query = supabase
          .from('obgyn_consultation_forms')
          .update({
            ...input,
            updated_by: user.id,
          })
          .eq('id', formId);

        // Non-admins can only update forms they created
        if (!isAdmin) {
          query = query.eq('created_by', user.id);
        }

        const { data, error: updateError } = await query
          .select()
          .single();

        if (updateError) throw updateError;

        if (!data) {
          throw new Error('No data returned from update');
        }

        setForms((prev) =>
          prev.map((f) => (f.id === formId ? data : f))
        );

        return data;
      } catch (err) {
        console.error('Error updating OB/GYN form:', err);
        setError(err instanceof Error ? err.message : 'Failed to update OB/GYN form');
        return null;
      }
    },
    [user, isAdmin]
  );

  const deleteForm = useCallback(
    async (formId: string): Promise<boolean> => {
      if (!user) {
        setError('User not authenticated');
        return false;
      }

      try {
        setError(null);

        let query = supabase
          .from('obgyn_consultation_forms')
          .delete()
          .eq('id', formId);

        // Non-admins can only delete forms they created
        if (!isAdmin) {
          query = query.eq('created_by', user.id);
        }

        const { error: deleteError } = await query;

        if (deleteError) throw deleteError;

        setForms((prev) => prev.filter((f) => f.id !== formId));

        // Clear any pending auto-save for this form
        const timer = autoSaveTimers.get(formId);
        if (timer) {
          clearTimeout(timer);
          autoSaveTimers.delete(formId);
        }

        return true;
      } catch (err) {
        console.error('Error deleting OB/GYN form:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete OB/GYN form');
        return false;
      }
    },
    [user, isAdmin]
  );

  const getFormByAppointment = useCallback(
    (appointmentId: string): OBGynConsultationForm | undefined => {
      return forms.find((f) => f.appointment_id === appointmentId);
    },
    [forms]
  );

  const getFormByPatient = useCallback(
    (patientIdParam: string, formType?: FormType): OBGynConsultationForm[] => {
      let filtered = forms.filter((f) => f.patient_id === patientIdParam);

      if (formType) {
        filtered = filtered.filter((f) => f.form_type === formType);
      }

      return filtered;
    },
    [forms]
  );

  const autoSaveForm = useCallback(
    (formId: string, input: UpdateOBGynFormInput): void => {
      // Clear existing timer for this form
      const existingTimer = autoSaveTimers.get(formId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Don't start a new timer if one is already in progress
      if (autoSaveInProgressRef.current.has(formId)) {
        return;
      }

      // Set new debounced timer
      const timer = setTimeout(async () => {
        autoSaveInProgressRef.current.add(formId);
        try {
          await updateForm(formId, input);
          console.log(`✅ Auto-saved OB/GYN form: ${formId}`);
        } catch (err) {
          console.error(`Error auto-saving OB/GYN form ${formId}:`, err);
        } finally {
          autoSaveInProgressRef.current.delete(formId);
          autoSaveTimers.delete(formId);
        }
      }, AUTOSAVE_DELAY_MS);

      autoSaveTimers.set(formId, timer);
    },
    [updateForm]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      autoSaveTimers.forEach((timer) => clearTimeout(timer));
      autoSaveTimers.clear();
    };
  }, []);

  return {
    forms,
    loading,
    error,
    createForm,
    updateForm,
    deleteForm,
    getFormByAppointment,
    getFormByPatient,
    autoSaveForm,
    refetch: fetchForms,
  };
}
