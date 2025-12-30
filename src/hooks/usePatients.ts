import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Patient,
  PatientWithAppointments,
  CreatePatientInput,
  UpdatePatientInput,
} from '../types/database';
import {
  getCachedPatients,
  cachePatients,
  cachePatient,
  isLocalId,
} from '../lib/offlineDb';
import {
  queuePatientCreate,
  queuePatientUpdate,
  queuePatientDelete,
  getServerIdForLocalId,
} from '../lib/syncService';

interface UsePatientsReturn {
  patients: PatientWithAppointments[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  hasPendingChanges: boolean;
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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const initialLoadDone = useRef(false);

  // Track network status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchPatients = useCallback(async () => {
    if (!user) {
      setPatients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Always try to load from cache first for instant display
      if (!initialLoadDone.current) {
        try {
          const cachedData = await getCachedPatients(user.id);
          if (cachedData.length > 0) {
            console.log(`📦 Loaded ${cachedData.length} patients from cache`);
            setPatients(cachedData);
            setLoading(false);
          }
        } catch (cacheErr) {
          console.warn('Failed to load from cache:', cacheErr);
        }
      }

      // If offline, use cached data only
      if (!navigator.onLine) {
        console.log('📵 Offline - using cached patient data');
        setIsOffline(true);
        if (initialLoadDone.current) {
          const cachedData = await getCachedPatients(user.id);
          setPatients(cachedData);
        }
        setLoading(false);
        return;
      }

      // Fetch from network
      let query = supabase
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

      // Admins can see all patients, non-admins only see their own
      if (!isAdmin) {
        query = query.eq('created_by', user.id);
      }

      const { data, error: fetchError } = await query;

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

      // Merge with any local-only patients (created offline, not yet synced)
      const localPatients = patients.filter(p => isLocalId(p.id));
      const mergedPatients = [...localPatients, ...patientsWithAppointments];

      setPatients(mergedPatients);

      // Cache the network data
      await cachePatients(patientsWithAppointments);
      console.log(`✅ Fetched and cached ${patientsWithAppointments.length} patients from network`);

      initialLoadDone.current = true;
    } catch (err) {
      console.error('Error fetching patients:', err);

      // If network error, try to use cached data
      if (!navigator.onLine || (err as any)?.message?.includes('network')) {
        setIsOffline(true);
        try {
          const cachedData = await getCachedPatients(user.id);
          setPatients(cachedData);
          setError('Offline - showing cached data');
        } catch (cacheErr) {
          setError(err instanceof Error ? err.message : 'Failed to fetch patients');
          setPatients([]);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch patients');
        setPatients([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

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

        // If offline, create locally and queue for sync
        if (!navigator.onLine) {
          console.log('📵 Creating patient offline...');
          const localId = await queuePatientCreate(input, user.id);

          const localPatient: PatientWithAppointments = {
            id: localId,
            ...input,
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            archived: false,
            user_id: null,
            consultation_language: input.consultation_language || 'en-IN',
            date_of_birth: input.date_of_birth || null,
            age_years: input.age_years || null,
            height_cm: input.height_cm || null,
            weight_kg: input.weight_kg || null,
            current_medications: input.current_medications || null,
            current_conditions: input.current_conditions || null,
            allergies: input.allergies || null,
            email: input.email || null,
            phone: input.phone || null,
            last_visit: null,
            next_appointment: null,
          };

          // Add to local state
          setPatients((prev) => [localPatient, ...prev]);

          // Cache locally
          await cachePatient(localPatient);

          setHasPendingChanges(true);
          console.log('✅ Patient created offline with local ID:', localId);

          return localPatient;
        }

        // Online - create directly in Supabase
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

        const patientWithAppointments: PatientWithAppointments = {
          ...data,
          last_visit: null,
          next_appointment: null,
        };

        // Add to local state
        setPatients((prev) => [patientWithAppointments, ...prev]);

        // Cache the new patient
        await cachePatient(patientWithAppointments);

        return data;
      } catch (err) {
        console.error('Error creating patient:', err);

        // If network error, fall back to offline creation
        if ((err as any)?.message?.includes('network') || (err as any)?.message?.includes('fetch')) {
          console.log('📵 Network error - creating patient offline...');
          const localId = await queuePatientCreate(input, user.id);

          const localPatient: PatientWithAppointments = {
            id: localId,
            ...input,
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            archived: false,
            user_id: null,
            consultation_language: input.consultation_language || 'en-IN',
            date_of_birth: input.date_of_birth || null,
            age_years: input.age_years || null,
            height_cm: input.height_cm || null,
            weight_kg: input.weight_kg || null,
            current_medications: input.current_medications || null,
            current_conditions: input.current_conditions || null,
            allergies: input.allergies || null,
            email: input.email || null,
            phone: input.phone || null,
            last_visit: null,
            next_appointment: null,
          };

          setPatients((prev) => [localPatient, ...prev]);
          await cachePatient(localPatient);
          setHasPendingChanges(true);

          return localPatient;
        }

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

      // Resolve local ID if needed
      const serverId = getServerIdForLocalId(id) || id;

      try {
        setError(null);

        // Optimistically update local state first
        setPatients((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...input, updated_at: new Date().toISOString() } : p))
        );

        // If offline, queue for sync
        if (!navigator.onLine || isLocalId(id)) {
          console.log('📵 Updating patient offline...');
          await queuePatientUpdate(id, input, user.id);

          // Update cache
          const existingPatient = patients.find(p => p.id === id);
          if (existingPatient) {
            await cachePatient({ ...existingPatient, ...input, updated_at: new Date().toISOString() });
          }

          setHasPendingChanges(true);
          return existingPatient ? { ...existingPatient, ...input } : null;
        }

        // Online - update in Supabase
        let query = supabase
          .from('patients')
          .update(input)
          .eq('id', serverId);

        // Admins can update any patient, non-admins only their own
        if (!isAdmin) {
          query = query.eq('created_by', user.id);
        }

        const { data, error: updateError } = await query
          .select()
          .single();

        if (updateError) throw updateError;

        // Update local state with server data
        const existingPatient = patients.find(p => p.id === id);
        const updatedPatient: PatientWithAppointments = {
          ...data,
          last_visit: existingPatient?.last_visit || null,
          next_appointment: existingPatient?.next_appointment || null,
        };

        setPatients((prev) =>
          prev.map((p) => (p.id === id ? updatedPatient : p))
        );

        // Update cache
        await cachePatient(updatedPatient);

        return data;
      } catch (err) {
        console.error('Error updating patient:', err);

        // If network error, queue for sync
        if ((err as any)?.message?.includes('network') || (err as any)?.message?.includes('fetch')) {
          console.log('📵 Network error - queuing patient update...');
          await queuePatientUpdate(id, input, user.id);
          setHasPendingChanges(true);

          const existingPatient = patients.find(p => p.id === id);
          return existingPatient ? { ...existingPatient, ...input } : null;
        }

        // Revert optimistic update on error
        fetchPatients();
        setError(err instanceof Error ? err.message : 'Failed to update patient');
        return null;
      }
    },
    [user, isAdmin, patients, fetchPatients]
  );

  const deletePatient = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) {
        setError('User not authenticated');
        return false;
      }

      const serverId = getServerIdForLocalId(id) || id;

      try {
        setError(null);

        // Optimistically remove from local state
        setPatients((prev) => prev.filter((p) => p.id !== id));

        // If offline or local ID, queue for sync
        if (!navigator.onLine || isLocalId(id)) {
          console.log('📵 Deleting patient offline...');
          await queuePatientDelete(id, user.id);
          setHasPendingChanges(true);
          return true;
        }

        // Online - delete from Supabase
        const { error: deleteError } = await supabase
          .from('patients')
          .delete()
          .eq('id', serverId);

        if (deleteError) throw deleteError;

        return true;
      } catch (err) {
        console.error('Error deleting patient:', err);

        // If network error, queue for sync
        if ((err as any)?.message?.includes('network') || (err as any)?.message?.includes('fetch')) {
          console.log('📵 Network error - queuing patient deletion...');
          await queuePatientDelete(id, user.id);
          setHasPendingChanges(true);
          return true;
        }

        // Revert optimistic delete on error
        fetchPatients();
        setError(err instanceof Error ? err.message : 'Failed to delete patient');
        return false;
      }
    },
    [user, fetchPatients]
  );

  return {
    patients,
    loading,
    error,
    isOffline,
    hasPendingChanges,
    createPatient,
    updatePatient,
    deletePatient,
    refetch: fetchPatients,
  };
}
