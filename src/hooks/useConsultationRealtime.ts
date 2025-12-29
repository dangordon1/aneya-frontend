import { useEffect, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Consultation } from '../types/database';

interface UseConsultationRealtimeOptions {
  consultationId: string | null;
  onStatusChange?: (consultation: Consultation) => void;
  enabled?: boolean;
}

/**
 * Hook to subscribe to real-time updates for a consultation
 *
 * Monitors transcription_status changes and calls onStatusChange callback
 * when the consultation is updated. Useful for showing async processing status.
 *
 * @param consultationId - UUID of consultation to monitor
 * @param onStatusChange - Callback fired when consultation updates
 * @param enabled - Whether to enable the subscription (default: true)
 *
 * @example
 * ```typescript
 * const { consultation, loading, refetch } = useConsultationRealtime({
 *   consultationId: savedConsultation.id,
 *   onStatusChange: (updated) => {
 *     if (updated.transcription_status === 'completed') {
 *       alert('Processing complete!');
 *     }
 *   },
 *   enabled: !!savedConsultation.id
 * });
 * ```
 */
export function useConsultationRealtime({
  consultationId,
  onStatusChange,
  enabled = true
}: UseConsultationRealtimeOptions) {
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial consultation data
  const fetchConsultation = useCallback(async () => {
    if (!consultationId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', consultationId)
        .single();

      if (fetchError) {
        console.error('Error fetching consultation:', fetchError);
        setError(fetchError.message);
        return;
      }

      setConsultation(data);
    } catch (err) {
      console.error('Error in fetchConsultation:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch consultation');
    } finally {
      setLoading(false);
    }
  }, [consultationId, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchConsultation();
  }, [fetchConsultation]);

  // Set up real-time subscription for updates
  useEffect(() => {
    if (!consultationId || !enabled) return;

    console.log(`🔔 Setting up realtime subscription for consultation ${consultationId}`);

    const channel = supabase
      .channel(`consultation-${consultationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'consultations',
          filter: `id=eq.${consultationId}`
        },
        (payload) => {
          const updated = payload.new as Consultation;
          console.log(`🔔 Realtime update received for consultation ${consultationId}:`, {
            status: updated.transcription_status,
            hasError: !!updated.transcription_error
          });

          setConsultation(updated);

          // Call callback if provided
          if (onStatusChange) {
            onStatusChange(updated);
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔔 Realtime subscription status: ${status}`);
      });

    return () => {
      console.log(`🔕 Removing realtime subscription for consultation ${consultationId}`);
      supabase.removeChannel(channel);
    };
  }, [consultationId, enabled, onStatusChange]);

  return {
    consultation,
    loading,
    error,
    refetch: fetchConsultation
  };
}
