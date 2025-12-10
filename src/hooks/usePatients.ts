import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Patient,
  PatientWithAppointments,
  CreatePatientInput,
  UpdatePatientInput,
} from '../types/database';

interface UsePatientsReturn {
  patients: PatientWithAppointments[];
  loading: boolean;
  error: string | null;
  createPatient: (input: CreatePatientInput) => Promise<Patient | null>;
  updatePatient: (id: string, input: UpdatePatientInput) => Promise<Patient | null>;
  deletePatient: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function usePatients(): UsePatientsReturn {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientWithAppointments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    if (!user) {
      setPatients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('patients')
        .select(`
          *,
          appointments!patient_id(
            id,
            scheduled_time,
            status,
            appointment_type
          )
        `)
        .eq('created_by', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Post-process to compute last visit and next appointment
      const patientsWithAppointments: PatientWithAppointments[] = (data || []).map((patient: any) => {
        const appointments = Array.isArray(patient.appointments) ? patient.appointments : [];

        // Most recent completed appointment
        const completedAppointments = appointments
          .filter((apt: any) => apt.status === 'completed')
          .sort((a: any, b: any) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());

        // Next upcoming scheduled appointment
        const now = new Date();
        const upcomingAppointments = appointments
          .filter((apt: any) => apt.status === 'scheduled' && new Date(apt.scheduled_time) > now)
          .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

        // Remove appointments array and add computed fields
        const { appointments: _, ...patientData } = patient;

        return {
          ...patientData,
          last_visit: completedAppointments[0] || null,
          next_appointment: upcomingAppointments[0] || null,
        };
      });

      setPatients(patientsWithAppointments);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch patients');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const createPatient = useCallback(
    async (input: CreatePatientInput): Promise<Patient | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      try {
        setError(null);

        const { data, error: createError } = await supabase
          .from('patients')
          .insert({
            ...input,
            created_by: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        if (!data) throw new Error('No data returned from create');

        // Add to local state (cast to PatientWithAppointments for local state)
        setPatients((prev) => [{ ...data, last_visit: null, next_appointment: null } as PatientWithAppointments, ...prev]);

        return data;
      } catch (err) {
        console.error('Error creating patient:', err);
        setError(err instanceof Error ? err.message : 'Failed to create patient');
        return null;
      }
    },
    [user]
  );

  const updatePatient = useCallback(
    async (id: string, input: UpdatePatientInput): Promise<Patient | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      try {
        setError(null);

        const { data, error: updateError } = await supabase
          .from('patients')
          .update(input)
          .eq('id', id)
          .eq('created_by', user.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update local state - preserve existing appointment data
        setPatients((prev) =>
          prev.map((p) => (p.id === id ? { ...data, last_visit: p.last_visit, next_appointment: p.next_appointment } as PatientWithAppointments : p))
        );

        return data;
      } catch (err) {
        console.error('Error updating patient:', err);
        setError(err instanceof Error ? err.message : 'Failed to update patient');
        return null;
      }
    },
    [user]
  );

  const deletePatient = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) {
        setError('User not authenticated');
        return false;
      }

      try {
        setError(null);

        const { error: deleteError } = await supabase
          .from('patients')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        // Remove from local state
        setPatients((prev) => prev.filter((p) => p.id !== id));

        return true;
      } catch (err) {
        console.error('Error deleting patient:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete patient');
        return false;
      }
    },
    [user]
  );

  return {
    patients,
    loading,
    error,
    createPatient,
    updatePatient,
    deletePatient,
    refetch: fetchPatients,
  };
}
