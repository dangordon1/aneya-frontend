import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  AppointmentWithPatient,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from '../types/database';

interface UseAppointmentsReturn {
  appointments: AppointmentWithPatient[];
  loading: boolean;
  error: string | null;
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

        setAppointments(data || []);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
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

        const { data, error: createError } = await supabase
          .from('appointments')
          .insert({
            ...input,
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
        }

        return data;
      } catch (err) {
        console.error('Error creating appointment:', err);
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

      try {
        setError(null);

        let query = supabase
          .from('appointments')
          .update(input)
          .eq('id', id);

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

        return data;
      } catch (err) {
        console.error('Error updating appointment:', err);
        setError(err instanceof Error ? err.message : 'Failed to update appointment');
        return null;
      }
    },
    [user, isAdmin]
  );

  const cancelAppointment = useCallback(
    async (id: string, reason?: string): Promise<AppointmentWithPatient | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      try {
        setError(null);

        let query = supabase
          .from('appointments')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason || null,
          })
          .eq('id', id);

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

        return data;
      } catch (err) {
        console.error('Error cancelling appointment:', err);
        setError(err instanceof Error ? err.message : 'Failed to cancel appointment');
        return null;
      }
    },
    [user, isAdmin]
  );

  return {
    appointments,
    loading,
    error,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    refetch: fetchAppointments,
  };
}
