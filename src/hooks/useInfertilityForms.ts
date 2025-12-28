import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  InfertilityForm,
  CreateInfertilityFormInput,
  UpdateInfertilityFormInput,
  FormType,
} from '../types/database';

interface UseInfertilityFormsReturn {
  forms: InfertilityForm[];
  loading: boolean;
  error: string | null;
  createForm: (patientId: string, input: CreateInfertilityFormInput) => Promise<InfertilityForm | null>;
  updateForm: (formId: string, input: UpdateInfertilityFormInput) => Promise<InfertilityForm | null>;
  getFormByAppointment: (appointmentId: string) => InfertilityForm | null;
  getFormsByPatient: (patientId: string, formType?: FormType) => InfertilityForm[];
  autoSaveForm: (formId: string, input: UpdateInfertilityFormInput) => void;
  refreshForms: () => Promise<void>;
}

/**
 * Hook for managing infertility consultation forms
 * Provides CRUD operations and auto-save functionality
 */
export function useInfertilityForms(patientId?: string): UseInfertilityFormsReturn {
  const [forms, setForms] = useState<InfertilityForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce timer for auto-save
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  /**
   * Fetch forms for a specific patient
   */
  const fetchForms = useCallback(async (pid: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('infertility_forms')
        .select('*')
        .eq('patient_id', pid)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setForms(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch infertility forms';
      setError(errorMessage);
      console.error('Error fetching infertility forms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load forms on mount if patientId provided
   */
  useEffect(() => {
    if (patientId) {
      fetchForms(patientId);
    }
  }, [patientId, fetchForms]);

  /**
   * Refresh forms from database
   */
  const refreshForms = useCallback(async () => {
    if (patientId) {
      await fetchForms(patientId);
    }
  }, [patientId, fetchForms]);

  /**
   * Create a new infertility form
   */
  const createForm = useCallback(
    async (pid: string, input: CreateInfertilityFormInput): Promise<InfertilityForm | null> => {
      setError(null);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        const formData = {
          patient_id: pid,
          appointment_id: input.appointment_id || null,
          form_type: input.form_type,
          status: input.status || 'draft',
          filled_by: input.filled_by || null,
          vitals_record_id: input.vitals_record_id || null,
          infertility_data: input.infertility_data || {},
          created_by: user.id,
          updated_by: user.id,
        };

        const { data, error: createError } = await supabase
          .from('infertility_forms')
          .insert(formData)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        // Update local state
        setForms((prev) => [data, ...prev]);

        console.log('✅ Created infertility form:', data.id);
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create infertility form';
        setError(errorMessage);
        console.error('Error creating infertility form:', err);
        return null;
      }
    },
    []
  );

  /**
   * Update an existing infertility form
   */
  const updateForm = useCallback(
    async (formId: string, input: UpdateInfertilityFormInput): Promise<InfertilityForm | null> => {
      setError(null);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        const updateData = {
          ...input,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        };

        const { data, error: updateError } = await supabase
          .from('infertility_forms')
          .update(updateData)
          .eq('id', formId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        // Update local state
        setForms((prev) =>
          prev.map((form) => (form.id === formId ? data : form))
        );

        console.log('✅ Updated infertility form:', formId);
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update infertility form';
        setError(errorMessage);
        console.error('Error updating infertility form:', err);
        return null;
      }
    },
    []
  );

  /**
   * Auto-save form with debouncing (2 second delay)
   */
  const autoSaveForm = useCallback(
    (formId: string, input: UpdateInfertilityFormInput) => {
      // Clear existing timer
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      // Set new timer for auto-save
      const timer = setTimeout(() => {
        console.log('💾 Auto-saving infertility form...', formId);
        updateForm(formId, input);
      }, 2000);

      setAutoSaveTimer(timer);
    },
    [autoSaveTimer, updateForm]
  );

  /**
   * Get form by appointment ID
   */
  const getFormByAppointment = useCallback(
    (appointmentId: string): InfertilityForm | null => {
      return forms.find((form) => form.appointment_id === appointmentId) || null;
    },
    [forms]
  );

  /**
   * Get forms by patient ID and optional form type
   */
  const getFormsByPatient = useCallback(
    (pid: string, formType?: FormType): InfertilityForm[] => {
      let filtered = forms.filter((form) => form.patient_id === pid);

      if (formType) {
        filtered = filtered.filter((form) => form.form_type === formType);
      }

      return filtered;
    },
    [forms]
  );

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  return {
    forms,
    loading,
    error,
    createForm,
    updateForm,
    getFormByAppointment,
    getFormsByPatient,
    autoSaveForm,
    refreshForms,
  };
}
