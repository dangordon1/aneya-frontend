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
  const { user, isAdmin, doctorProfile } = useAuth();
  const [patients, setPatients] = useState<PatientWithAppointments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supabase client now uses accessToken option to automatically include
  // Firebase ID token in requests, enabling RLS with auth.uid() = Firebase UID

  const fetchPatients = useCallback(async () => {
    if (!user) {
      setPatients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Admins can see all patients
      if (isAdmin) {
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
          .eq('archived', false)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Post-process patients (continue to line 62)
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
        return;
      }

      // Non-admin doctors: Filter to only patients they have active relationships with
      // OR patients they created (via created_by field)
      // Note: RLS can't be used because Supabase uses anon key (Firebase handles auth)
      if (!doctorProfile?.id) {
        console.log('⚠️ No doctor profile found, cannot fetch patients');
        setPatients([]);
        setLoading(false);
        return;
      }

      // Get patient IDs from active relationships
      const { data: relationships, error: relError } = await supabase
        .from('patient_doctor')
        .select('patient_id')
        .eq('doctor_id', doctorProfile.id)
        .eq('status', 'active');

      if (relError) throw relError;

      const patientIdsFromRelationships = (relationships || []).map(r => r.patient_id);

      // Also get patients created by this doctor (via user_id -> created_by)
      const { data: createdPatients, error: createdError } = await supabase
        .from('patients')
        .select('id')
        .eq('created_by', user.id)
        .eq('archived', false);

      if (createdError) throw createdError;

      const patientIdsFromCreated = (createdPatients || []).map(p => p.id);

      // Combine both sets of patient IDs (deduplicated)
      const allPatientIds = [...new Set([...patientIdsFromRelationships, ...patientIdsFromCreated])];

      if (allPatientIds.length === 0) {
        console.log('ℹ️ Doctor has no patients (no relationships or created patients)');
        setPatients([]);
        setLoading(false);
        return;
      }

      // Fetch patients with those IDs
      const { data, error: fetchError } = await supabase
        .from('patients')
        .select(`
          *,
          appointments(
            id,
            scheduled_time,
            status,
            appointment_type
          )
        `)
        .in('id', allPatientIds)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Post-process patients
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
  }, [user, isAdmin, doctorProfile]);

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

        // Create patient_doctor relationship if doctor profile exists
        if (doctorProfile?.id) {
          const { error: relationshipError } = await supabase
            .from('patient_doctor')
            .insert({
              patient_id: data.id,
              doctor_id: doctorProfile.id,
              initiated_by: 'doctor',
              status: 'active'
            });

          if (relationshipError) {
            console.warn('⚠️ Could not create patient-doctor relationship:', relationshipError.message);
          } else {
            console.log('✅ Patient-doctor relationship created');
          }
        }

        // Add to local state (cast to PatientWithAppointments for local state)
        setPatients((prev) => [{ ...data, last_visit: null, next_appointment: null } as PatientWithAppointments, ...prev]);

        return data;
      } catch (err) {
        console.error('Error creating patient:', err);
        setError(err instanceof Error ? err.message : 'Failed to create patient');
        return null;
      }
    },
    [user, doctorProfile]
  );

  const updatePatient = useCallback(
    async (id: string, input: UpdatePatientInput): Promise<Patient | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      try {
        setError(null);

        // For non-admin doctors, verify they have an active relationship with this patient
        if (!isAdmin && doctorProfile?.id) {
          const { data: relationship, error: relationshipError } = await supabase
            .from('patient_doctor')
            .select('id')
            .eq('patient_id', id)
            .eq('doctor_id', doctorProfile.id)
            .eq('status', 'active')
            .maybeSingle();

          if (relationshipError) throw relationshipError;
          if (!relationship) {
            throw new Error('You do not have permission to update this patient');
          }
        }

        const { data, error: updateError } = await supabase
          .from('patients')
          .update(input)
          .eq('id', id)
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
    [user, isAdmin, doctorProfile]
  );

  const deletePatient = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) {
        setError('User not authenticated');
        return false;
      }

      try {
        setError(null);

        // For non-admin doctors, verify they have an active relationship with this patient
        if (!isAdmin && doctorProfile?.id) {
          const { data: relationship, error: relationshipError } = await supabase
            .from('patient_doctor')
            .select('id')
            .eq('patient_id', id)
            .eq('doctor_id', doctorProfile.id)
            .eq('status', 'active')
            .maybeSingle();

          if (relationshipError) throw relationshipError;
          if (!relationship) {
            throw new Error('You do not have permission to delete this patient');
          }
        }

        // Soft delete by setting archived = true (RLS policy restricts hard deletes to superadmins)
        const { data: updatedPatient, error: archiveError } = await supabase
          .from('patients')
          .update({ archived: true })
          .eq('id', id)
          .select('id, archived')
          .single();

        if (archiveError) throw archiveError;

        // Verify the update actually took effect (catches silent RLS failures)
        if (!updatedPatient || updatedPatient.archived !== true) {
          throw new Error('Failed to archive patient - update may have been blocked by permissions');
        }

        // Remove from local state (archived patients are filtered out)
        setPatients((prev) => prev.filter((p) => p.id !== id));

        return true;
      } catch (err) {
        console.error('Error deleting patient:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete patient');
        return false;
      }
    },
    [user, isAdmin, doctorProfile]
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
