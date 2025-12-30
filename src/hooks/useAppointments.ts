import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  AppointmentWithPatient,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from '../types/database';
import {
  getCachedAppointments,
  cacheAppointments,
  cacheAppointment,
  getCachedPatient,
  isLocalId,
} from '../lib/offlineDb';
import {
  queueAppointmentCreate,
  queueAppointmentUpdate,
  queueAppointmentCancel,
  getServerIdForLocalId,
} from '../lib/syncService';

interface UseAppointmentsReturn {
  appointments: AppointmentWithPatient[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  hasPendingChanges: boolean;
  createAppointment: (input: CreateAppointmentInput) => Promise<AppointmentWithPatient | null>;
  updateAppointment: (id: string, input: UpdateAppointmentInput) => Promise<AppointmentWithPatient | null>;
  cancelAppointment: (id: string, reason?: string) => Promise<AppointmentWithPatient | null>;
  refetch: (date?: string) => Promise<void>;
}

export function useAppointments(initialDate?: string): UseAppointmentsReturn {
  const { user, isAdmin } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
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

  const fetchAppointments = useCallback(
    async (date?: string) => {
      if (!user) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Always try to load from cache first for instant display
        if (!initialLoadDone.current) {
          try {
            const cachedData = await getCachedAppointments(user.id);
            if (cachedData.length > 0) {
              console.log(`📦 Loaded ${cachedData.length} appointments from cache`);
              setAppointments(cachedData);
              setLoading(false);
            }
          } catch (cacheErr) {
            console.warn('Failed to load appointments from cache:', cacheErr);
          }
        }

        // If offline, use cached data only
        if (!navigator.onLine) {
          console.log('📵 Offline - using cached appointment data');
          setIsOffline(true);
          if (initialLoadDone.current) {
            const cachedData = await getCachedAppointments(user.id);
            setAppointments(cachedData);
          }
          setLoading(false);
          return;
        }

        let query = supabase
          .from('appointments')
          .select('*, patient:patients(*), doctor:doctors(*)')
          .in('status', ['scheduled', 'in_progress']) // Only fetch active appointments
          .order('scheduled_time', { ascending: true });

        // Admins can see all appointments, non-admins only see their own
        if (!isAdmin) {
          query = query.eq('created_by', user.id);
        }

        if (date) {
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);

          query = query
            .gte('scheduled_time', startOfDay.toISOString())
            .lte('scheduled_time', endOfDay.toISOString());
        }

        // TIME: Fetch active appointments
        const queryStart = performance.now();
        const { data, error: fetchError } = await query;
        const queryEnd = performance.now();
        console.log(`⏱️ Active appointments query: ${(queryEnd - queryStart).toFixed(0)}ms (${data?.length || 0} records)`);

        // Debug: Log doctor data for each appointment
        console.log('🔍 useAppointments: Fetched appointments with doctor data:',
          data?.map(apt => ({
            id: apt.id,
            patient_name: (apt as any).patient?.name,
            doctor_id: apt.doctor_id,
            doctor_name: (apt as any).doctor?.name,
            doctor_specialty: (apt as any).doctor?.specialty
          }))
        );

        if (fetchError) throw fetchError;

        // Merge with any local-only appointments (created offline, not yet synced)
        const localAppointments = appointments.filter(a => isLocalId(a.id));
        const mergedAppointments = [...localAppointments, ...(data || [])].sort((a, b) =>
          new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
        );

        setAppointments(mergedAppointments);

        // Cache the network data
        await cacheAppointments(data || []);
        console.log(`✅ Fetched and cached ${data?.length || 0} appointments from network`);

        initialLoadDone.current = true;
      } catch (err) {
        console.error('Error fetching appointments:', err);

        // If network error, try to use cached data
        if (!navigator.onLine || (err as any)?.message?.includes('network')) {
          setIsOffline(true);
          try {
            const cachedData = await getCachedAppointments(user.id);
            setAppointments(cachedData);
            setError('Offline - showing cached data');
          } catch (cacheErr) {
            setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
          }
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
        }
      } finally {
        setLoading(false);
      }
    },
    [user, isAdmin]
  );

  useEffect(() => {
    fetchAppointments(initialDate);
  }, [fetchAppointments, initialDate]);

  const createAppointment = useCallback(
    async (input: CreateAppointmentInput): Promise<AppointmentWithPatient | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      try {
        setError(null);

        // Resolve patient ID in case it's a local ID
        const resolvedPatientId = getServerIdForLocalId(input.patient_id) || input.patient_id;

        // If offline, create locally and queue for sync
        if (!navigator.onLine) {
          console.log('📵 Creating appointment offline...');
          const localId = await queueAppointmentCreate(input, user.id);

          // Get patient data from cache if it's a local patient
          let patientData = null;
          if (isLocalId(input.patient_id)) {
            patientData = await getCachedPatient(input.patient_id);
          }

          const localAppointment: AppointmentWithPatient = {
            id: localId,
            ...input,
            patient_id: input.patient_id,
            status: 'scheduled',
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            doctor_id: input.doctor_id || null,
            reason: input.reason || null,
            notes: input.notes || null,
            consultation_id: null,
            booked_by: input.booked_by || null,
            cancelled_at: null,
            cancellation_reason: null,
            specialty: input.specialty || 'general',
            specialty_subtype: input.specialty_subtype || null,
            patient: patientData as any || {
              id: input.patient_id,
              name: 'Loading...',
              sex: 'Other',
              date_of_birth: null,
              age_years: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: user.id,
              archived: false,
              user_id: null,
              consultation_language: 'en-IN',
              height_cm: null,
              weight_kg: null,
              current_medications: null,
              current_conditions: null,
              allergies: null,
              email: null,
              phone: null,
            },
          };

          // Add to local state
          setAppointments((prev) => [...prev, localAppointment].sort((a, b) =>
            new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
          ));

          // Cache locally
          await cacheAppointment(localAppointment);

          setHasPendingChanges(true);
          console.log('✅ Appointment created offline with local ID:', localId);

          return localAppointment;
        }

        // Online - create directly in Supabase
        const { data, error: createError } = await supabase
          .from('appointments')
          .insert({
            ...input,
            patient_id: resolvedPatientId,
            status: 'scheduled',
            created_by: user.id,
          })
          .select('*, patient:patients(*), doctor:doctors(*)')
          .single();

        if (createError) throw createError;

        if (data) {
          setAppointments((prev) => [...prev, data].sort((a, b) =>
            new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
          ));

          // Cache the new appointment
          await cacheAppointment(data);
        }

        return data;
      } catch (err) {
        console.error('Error creating appointment:', err);

        // If network error, fall back to offline creation
        if ((err as any)?.message?.includes('network') || (err as any)?.message?.includes('fetch')) {
          console.log('📵 Network error - creating appointment offline...');
          const localId = await queueAppointmentCreate(input, user.id);

          const localAppointment: AppointmentWithPatient = {
            id: localId,
            ...input,
            status: 'scheduled',
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            doctor_id: input.doctor_id || null,
            reason: input.reason || null,
            notes: input.notes || null,
            consultation_id: null,
            booked_by: input.booked_by || null,
            cancelled_at: null,
            cancellation_reason: null,
            specialty: input.specialty || 'general',
            specialty_subtype: input.specialty_subtype || null,
            patient: {
              id: input.patient_id,
              name: 'Loading...',
              sex: 'Other',
              date_of_birth: null,
              age_years: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: user.id,
              archived: false,
              user_id: null,
              consultation_language: 'en-IN',
              height_cm: null,
              weight_kg: null,
              current_medications: null,
              current_conditions: null,
              allergies: null,
              email: null,
              phone: null,
            },
          };

          setAppointments((prev) => [...prev, localAppointment].sort((a, b) =>
            new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
          ));
          await cacheAppointment(localAppointment);
          setHasPendingChanges(true);

          return localAppointment;
        }

        setError(err instanceof Error ? err.message : 'Failed to create appointment');
        return null;
      }
    },
    [user]
  );

  const updateAppointment = useCallback(
    async (id: string, input: UpdateAppointmentInput): Promise<AppointmentWithPatient | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      // Resolve local ID if needed
      const serverId = getServerIdForLocalId(id) || id;

      try {
        setError(null);

        // Optimistically update local state first
        const existingAppointment = appointments.find(a => a.id === id);
        if (existingAppointment) {
          setAppointments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, ...input, updated_at: new Date().toISOString() } : a))
          );
        }

        // If offline, queue for sync
        if (!navigator.onLine || isLocalId(id)) {
          console.log('📵 Updating appointment offline...');
          await queueAppointmentUpdate(id, input, user.id);

          // Update cache
          if (existingAppointment) {
            await cacheAppointment({ ...existingAppointment, ...input, updated_at: new Date().toISOString() });
          }

          setHasPendingChanges(true);
          return existingAppointment ? { ...existingAppointment, ...input } : null;
        }

        // Online - update in Supabase
        let query = supabase
          .from('appointments')
          .update(input)
          .eq('id', serverId);

        // Admins can update any appointment, non-admins only their own
        if (!isAdmin) {
          query = query.eq('created_by', user.id);
        }

        const { data, error: updateError} = await query
          .select('*, patient:patients(*), doctor:doctors(*)')
          .single();

        if (updateError) throw updateError;

        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? data : a))
        );

        // Update cache
        await cacheAppointment(data);

        return data;
      } catch (err) {
        console.error('Error updating appointment:', err);

        // If network error, queue for sync
        if ((err as any)?.message?.includes('network') || (err as any)?.message?.includes('fetch')) {
          console.log('📵 Network error - queuing appointment update...');
          await queueAppointmentUpdate(id, input, user.id);
          setHasPendingChanges(true);

          const existingAppointment = appointments.find(a => a.id === id);
          return existingAppointment ? { ...existingAppointment, ...input } : null;
        }

        // Revert optimistic update on error
        fetchAppointments(initialDate);
        setError(err instanceof Error ? err.message : 'Failed to update appointment');
        return null;
      }
    },
    [user, isAdmin, appointments, fetchAppointments, initialDate]
  );

  const cancelAppointment = useCallback(
    async (id: string, reason?: string): Promise<AppointmentWithPatient | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      const serverId = getServerIdForLocalId(id) || id;

      try {
        setError(null);

        const cancelData = {
          status: 'cancelled' as const,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || null,
        };

        // Optimistically update local state
        const existingAppointment = appointments.find(a => a.id === id);
        if (existingAppointment) {
          setAppointments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, ...cancelData } : a))
          );
        }

        // If offline, queue for sync
        if (!navigator.onLine || isLocalId(id)) {
          console.log('📵 Cancelling appointment offline...');
          await queueAppointmentCancel(id, reason, user.id);

          // Update cache
          if (existingAppointment) {
            await cacheAppointment({ ...existingAppointment, ...cancelData });
          }

          setHasPendingChanges(true);
          return existingAppointment ? { ...existingAppointment, ...cancelData } : null;
        }

        // Online - cancel in Supabase
        let query = supabase
          .from('appointments')
          .update(cancelData)
          .eq('id', serverId);

        // Admins can cancel any appointment, non-admins only their own
        if (!isAdmin) {
          query = query.eq('created_by', user.id);
        }

        const { data, error: cancelError } = await query
          .select('*, patient:patients(*), doctor:doctors(*)')
          .single();

        if (cancelError) throw cancelError;

        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? data : a))
        );

        // Update cache
        await cacheAppointment(data);

        return data;
      } catch (err) {
        console.error('Error cancelling appointment:', err);

        // If network error, queue for sync
        if ((err as any)?.message?.includes('network') || (err as any)?.message?.includes('fetch')) {
          console.log('📵 Network error - queuing appointment cancellation...');
          await queueAppointmentCancel(id, reason, user.id);
          setHasPendingChanges(true);

          const existingAppointment = appointments.find(a => a.id === id);
          return existingAppointment ? { ...existingAppointment, status: 'cancelled' } : null;
        }

        // Revert optimistic update on error
        fetchAppointments(initialDate);
        setError(err instanceof Error ? err.message : 'Failed to cancel appointment');
        return null;
      }
    },
    [user, isAdmin, appointments, fetchAppointments, initialDate]
  );

  return {
    appointments,
    loading,
    error,
    isOffline,
    hasPendingChanges,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    refetch: fetchAppointments,
  };
}
