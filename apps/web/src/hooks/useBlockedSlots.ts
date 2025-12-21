import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { BlockedSlot, CreateBlockedSlotInput, UpdateBlockedSlotInput } from '../types/database';

interface UseBlockedSlotsReturn {
  blockedSlots: BlockedSlot[];
  loading: boolean;
  error: string | null;
  createBlockedSlot: (input: CreateBlockedSlotInput) => Promise<BlockedSlot | null>;
  updateBlockedSlot: (id: string, input: UpdateBlockedSlotInput) => Promise<BlockedSlot | null>;
  deleteBlockedSlot: (id: string) => Promise<boolean>;
  refreshBlockedSlots: () => Promise<void>;
}

export function useBlockedSlots(doctorId?: string): UseBlockedSlotsReturn {
  const { doctorProfile } = useAuth();
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveDoctorId = doctorId || doctorProfile?.id;

  const fetchBlockedSlots = useCallback(async () => {
    if (!effectiveDoctorId) {
      setBlockedSlots([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('doctor_blocked_slots')
        .select('*')
        .eq('doctor_id', effectiveDoctorId)
        .order('blocked_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;
      setBlockedSlots(data || []);
    } catch (err) {
      console.error('Error fetching blocked slots:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch blocked slots');
    } finally {
      setLoading(false);
    }
  }, [effectiveDoctorId]);

  useEffect(() => {
    fetchBlockedSlots();
  }, [fetchBlockedSlots]);

  const createBlockedSlot = async (input: CreateBlockedSlotInput): Promise<BlockedSlot | null> => {
    if (!effectiveDoctorId) {
      setError('No doctor ID available');
      return null;
    }

    setError(null);

    try {
      const { data, error: createError } = await supabase
        .from('doctor_blocked_slots')
        .insert({
          doctor_id: effectiveDoctorId,
          blocked_date: input.blocked_date,
          start_time: input.is_all_day ? '00:00' : input.start_time,
          end_time: input.is_all_day ? '23:59' : input.end_time,
          reason: input.reason || null,
          is_all_day: input.is_all_day || false
        })
        .select()
        .single();

      if (createError) throw createError;

      setBlockedSlots(prev => [...prev, data].sort((a, b) => {
        const dateCompare = a.blocked_date.localeCompare(b.blocked_date);
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      }));

      return data;
    } catch (err) {
      console.error('Error creating blocked slot:', err);
      setError(err instanceof Error ? err.message : 'Failed to create blocked slot');
      return null;
    }
  };

  const updateBlockedSlot = async (id: string, input: UpdateBlockedSlotInput): Promise<BlockedSlot | null> => {
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('doctor_blocked_slots')
        .update({
          ...input,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setBlockedSlots(prev => prev.map(slot => slot.id === id ? data : slot));
      return data;
    } catch (err) {
      console.error('Error updating blocked slot:', err);
      setError(err instanceof Error ? err.message : 'Failed to update blocked slot');
      return null;
    }
  };

  const deleteBlockedSlot = async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('doctor_blocked_slots')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setBlockedSlots(prev => prev.filter(slot => slot.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting blocked slot:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete blocked slot');
      return false;
    }
  };

  return {
    blockedSlots,
    loading,
    error,
    createBlockedSlot,
    updateBlockedSlot,
    deleteBlockedSlot,
    refreshBlockedSlots: fetchBlockedSlots
  };
}
