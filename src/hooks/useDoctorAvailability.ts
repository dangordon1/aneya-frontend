import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { DoctorAvailability, CreateAvailabilityInput, UpdateAvailabilityInput } from '../types/database';

interface UseDoctorAvailabilityReturn {
  availability: DoctorAvailability[];
  loading: boolean;
  error: string | null;
  createAvailability: (input: CreateAvailabilityInput) => Promise<DoctorAvailability | null>;
  updateAvailability: (id: string, input: UpdateAvailabilityInput) => Promise<DoctorAvailability | null>;
  deleteAvailability: (id: string) => Promise<boolean>;
  refreshAvailability: () => Promise<void>;
}

export function useDoctorAvailability(doctorId?: string): UseDoctorAvailabilityReturn {
  const { doctorProfile } = useAuth();
  const [availability, setAvailability] = useState<DoctorAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveDoctorId = doctorId || doctorProfile?.id;

  const fetchAvailability = useCallback(async () => {
    if (!effectiveDoctorId) {
      setAvailability([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', effectiveDoctorId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;
      setAvailability(data || []);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch availability');
    } finally {
      setLoading(false);
    }
  }, [effectiveDoctorId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const createAvailability = async (input: CreateAvailabilityInput): Promise<DoctorAvailability | null> => {
    if (!effectiveDoctorId) {
      setError('No doctor ID available');
      return null;
    }

    try {
      const { data, error: createError } = await supabase
        .from('doctor_availability')
        .insert({
          doctor_id: effectiveDoctorId,
          day_of_week: input.day_of_week,
          start_time: input.start_time,
          end_time: input.end_time,
          slot_duration_minutes: input.slot_duration_minutes || 15,
          is_active: true
        })
        .select()
        .single();

      if (createError) throw createError;

      setAvailability(prev => [...prev, data].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return a.start_time.localeCompare(b.start_time);
      }));

      return data;
    } catch (err) {
      console.error('Error creating availability:', err);
      setError(err instanceof Error ? err.message : 'Failed to create availability');
      return null;
    }
  };

  const updateAvailability = async (id: string, input: UpdateAvailabilityInput): Promise<DoctorAvailability | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('doctor_availability')
        .update({
          ...input,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setAvailability(prev => prev.map(a => a.id === id ? data : a));
      return data;
    } catch (err) {
      console.error('Error updating availability:', err);
      setError(err instanceof Error ? err.message : 'Failed to update availability');
      return null;
    }
  };

  const deleteAvailability = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('doctor_availability')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setAvailability(prev => prev.filter(a => a.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting availability:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete availability');
      return false;
    }
  };

  return {
    availability,
    loading,
    error,
    createAvailability,
    updateAvailability,
    deleteAvailability,
    refreshAvailability: fetchAvailability
  };
}
