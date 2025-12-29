import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  AntenatalForm,
  AntenatalVisit,
  CreateAntenatalFormInput,
  UpdateAntenatalFormInput,
  CreateAntenatalVisitInput,
  UpdateAntenatalVisitInput,
  FormType,
} from '../types/database';

interface UseAntenatalFormsReturn {
  forms: AntenatalForm[];
  visits: AntenatalVisit[];
  loading: boolean;
  error: string | null;
  createForm: (patientId: string, input: CreateAntenatalFormInput) => Promise<AntenatalForm | null>;
  updateForm: (formId: string, input: UpdateAntenatalFormInput) => Promise<AntenatalForm | null>;
  getFormByAppointment: (appointmentId: string) => AntenatalForm | null;
  getFormsByPatient: (patientId: string, formType?: FormType) => AntenatalForm[];
  autoSaveForm: (formId: string, input: UpdateAntenatalFormInput) => void;
  refreshForms: () => Promise<void>;

  // Visit tracking methods
  createVisit: (input: CreateAntenatalVisitInput) => Promise<AntenatalVisit | null>;
  updateVisit: (visitId: string, input: UpdateAntenatalVisitInput) => Promise<AntenatalVisit | null>;
  getVisitsByForm: (formId: string) => AntenatalVisit[];
  refreshVisits: (formId: string) => Promise<void>;
}

/**
 * Hook for managing antenatal consultation forms and visit records
 * Provides CRUD operations for both master ANC forms and individual visits
 * @param patientId - Optional patient ID to filter forms
 * @param userId - Optional user ID (Firebase user ID) for created_by/updated_by fields
 */
export function useAntenatalForms(patientId?: string, userId?: string): UseAntenatalFormsReturn {
  const [forms, setForms] = useState<AntenatalForm[]>([]);
  const [visits, setVisits] = useState<AntenatalVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce timer for auto-save
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Fetch forms for a specific patient
   */
  const fetchForms = useCallback(async (pid: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('antenatal_forms')
        .select('*')
        .eq('patient_id', pid)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setForms(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch antenatal forms';
      setError(errorMessage);
      console.error('Error fetching antenatal forms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch visits for a specific form
   */
  const fetchVisits = useCallback(async (formId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('antenatal_visits')
        .select('*')
        .eq('antenatal_form_id', formId)
        .order('visit_number', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setVisits(data || []);
    } catch (err) {
      console.error('Error fetching antenatal visits:', err);
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
   * Refresh visits for a specific form
   */
  const refreshVisits = useCallback(async (formId: string) => {
    await fetchVisits(formId);
  }, [fetchVisits]);

  /**
   * Create a new antenatal form
   */
  const createForm = useCallback(
    async (pid: string, input: CreateAntenatalFormInput): Promise<AntenatalForm | null> => {
      setError(null);

      try {
        // Use provided userId (Firebase user ID) or throw error if not provided
        if (!userId) {
          throw new Error('User ID is required to create form');
        }

        const formData = {
          patient_id: pid,
          appointment_id: input.appointment_id || null,
          form_type: input.form_type,
          status: input.status || 'draft',
          filled_by: input.filled_by || null,
          lmp: input.lmp || null,
          edd: input.edd || null,
          scan_edd: input.scan_edd || null,
          clinical_edd: input.clinical_edd || null,
          gestational_age_weeks: input.gestational_age_weeks || null,
          gravida: input.gravida || null,
          para: input.para || null,
          live: input.live || null,
          abortions: input.abortions || null,
          marriage_date: input.marriage_date || null,
          cohabitation_period_months: input.cohabitation_period_months || null,
          consanguinity: input.consanguinity || null,
          partner_name: input.partner_name || null,
          partner_blood_group: input.partner_blood_group || null,
          partner_medical_history: input.partner_medical_history || null,
          previous_pregnancies: input.previous_pregnancies || null,
          risk_factors: input.risk_factors || null,
          medical_history: input.medical_history || null,
          surgical_history: input.surgical_history || null,
          family_history: input.family_history || null,
          menstrual_history: input.menstrual_history || null,
          contraception_history: input.contraception_history || null,
          immunization_status: input.immunization_status || null,
          current_symptoms: input.current_symptoms || null,
          complaints: input.complaints || null,
          usg_scans: input.usg_scans || null,
          doppler_studies: input.doppler_studies || null,
          nst_tests: input.nst_tests || null,
          other_surveillance: input.other_surveillance || null,
          lab_investigations: input.lab_investigations || null,
          birth_plan: input.birth_plan || null,
          plan_mother: input.plan_mother || null,
          plan_fetus: input.plan_fetus || null,
          admission_date: input.admission_date || null,
          followup_plan: input.followup_plan || null,
          postpartum_visits: input.postpartum_visits || null,
          referrals: input.referrals || null,
          created_by: userId,
          updated_by: userId,
        };

        const { data, error: createError } = await supabase
          .from('antenatal_forms')
          .insert(formData)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        // Update local state
        setForms((prev) => [data, ...prev]);

        console.log('✅ Created antenatal form:', data.id);
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create antenatal form';
        setError(errorMessage);
        console.error('Error creating antenatal form:', err);
        return null;
      }
    },
    [userId]
  );

  /**
   * Update an existing antenatal form
   */
  const updateForm = useCallback(
    async (formId: string, input: UpdateAntenatalFormInput): Promise<AntenatalForm | null> => {
      setError(null);

      try {
        // Use provided userId (Firebase user ID) or throw error if not provided
        if (!userId) {
          throw new Error('User ID is required to update form');
        }

        const updateData = {
          ...input,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        };

        const { data, error: updateError } = await supabase
          .from('antenatal_forms')
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

        console.log('✅ Updated antenatal form:', formId);
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update antenatal form';
        setError(errorMessage);
        console.error('Error updating antenatal form:', err);
        return null;
      }
    },
    [userId]
  );

  /**
   * Auto-save form with debouncing (2 second delay)
   */
  const autoSaveForm = useCallback(
    (formId: string, input: UpdateAntenatalFormInput) => {
      // Clear existing timer
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      // Set new timer for auto-save
      const timer = setTimeout(() => {
        console.log('💾 Auto-saving antenatal form...', formId);
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
    (appointmentId: string): AntenatalForm | null => {
      return forms.find((form) => form.appointment_id === appointmentId) || null;
    },
    [forms]
  );

  /**
   * Get forms by patient ID and optional form type
   */
  const getFormsByPatient = useCallback(
    (pid: string, formType?: FormType): AntenatalForm[] => {
      let filtered = forms.filter((form) => form.patient_id === pid);

      if (formType) {
        filtered = filtered.filter((form) => form.form_type === formType);
      }

      return filtered;
    },
    [forms]
  );

  /**
   * Create a new visit record
   */
  const createVisit = useCallback(
    async (input: CreateAntenatalVisitInput): Promise<AntenatalVisit | null> => {
      setError(null);

      try {
        // Use provided userId (Firebase user ID) or throw error if not provided
        if (!userId) {
          throw new Error('User ID is required to create visit');
        }

        // Get patient_id from the form
        const form = forms.find((f) => f.id === input.antenatal_form_id);
        if (!form) {
          throw new Error('Associated antenatal form not found');
        }

        const visitData = {
          ...input,
          patient_id: form.patient_id,
          created_by: userId,
        };

        const { data, error: createError } = await supabase
          .from('antenatal_visits')
          .insert(visitData)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        // Update local state
        setVisits((prev) => [...prev, data]);

        console.log('✅ Created antenatal visit:', data.id);
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create antenatal visit';
        setError(errorMessage);
        console.error('Error creating antenatal visit:', err);
        return null;
      }
    },
    [forms, userId]
  );

  /**
   * Update an existing visit record
   */
  const updateVisit = useCallback(
    async (visitId: string, input: UpdateAntenatalVisitInput): Promise<AntenatalVisit | null> => {
      setError(null);

      try {
        const updateData = {
          ...input,
          updated_at: new Date().toISOString(),
        };

        const { data, error: updateError } = await supabase
          .from('antenatal_visits')
          .update(updateData)
          .eq('id', visitId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        // Update local state
        setVisits((prev) =>
          prev.map((visit) => (visit.id === visitId ? data : visit))
        );

        console.log('✅ Updated antenatal visit:', visitId);
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update antenatal visit';
        setError(errorMessage);
        console.error('Error updating antenatal visit:', err);
        return null;
      }
    },
    []
  );

  /**
   * Get visits for a specific form
   */
  const getVisitsByForm = useCallback(
    (formId: string): AntenatalVisit[] => {
      return visits.filter((visit) => visit.antenatal_form_id === formId);
    },
    [visits]
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
    visits,
    loading,
    error,
    createForm,
    updateForm,
    getFormByAppointment,
    getFormsByPatient,
    autoSaveForm,
    refreshForms,
    createVisit,
    updateVisit,
    getVisitsByForm,
    refreshVisits,
  };
}
