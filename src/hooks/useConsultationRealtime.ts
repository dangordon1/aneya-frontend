import { useEffect, useCallback, useRef, useState } from 'react';
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
 * when the consultation is updated. Uses both Supabase Realtime subscription
 * AND fallback polling to handle fast completions that the subscription may miss.
 *
 * @param consultationId - UUID of consultation to monitor
 * @param onStatusChange - Callback fired when consultation updates
 * @param enabled - Whether to enable the subscription (default: true)
 */
export function useConsultationRealtime({
  consultationId,
  onStatusChange,
  enabled = true
}: UseConsultationRealtimeOptions) {
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  // Stable ref for the callback so subscription doesn't tear down on every render
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const handleTerminalStatus = useCallback((data: Consultation) => {
    setConsultation(data);
    setResolved(true);
    if (onStatusChangeRef.current) {
      onStatusChangeRef.current(data);
    }
  }, []);

  // Fetch consultation and check for terminal status
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

      // If the status is already terminal, fire the callback immediately
      if (data && (data.transcription_status === 'completed' || data.transcription_status === 'failed')) {
        console.log(`🔔 Fetch found terminal status: ${data.transcription_status}`);
        handleTerminalStatus(data);
      }
    } catch (err) {
      console.error('Error in fetchConsultation:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch consultation');
    } finally {
      setLoading(false);
    }
  }, [consultationId, enabled, handleTerminalStatus]);

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

          if (updated.transcription_status === 'completed' || updated.transcription_status === 'failed') {
            handleTerminalStatus(updated);
          } else if (onStatusChangeRef.current) {
            onStatusChangeRef.current(updated);
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
  }, [consultationId, enabled, handleTerminalStatus]);

  // Fallback polling: re-fetch every 5s in case the Realtime subscription
  // missed the update (e.g. if diarization completed before subscription was ready)
  useEffect(() => {
    if (!consultationId || !enabled || resolved) return;

    const interval = setInterval(() => {
      console.log(`🔄 Polling consultation ${consultationId} (fallback)...`);
      fetchConsultation();
    }, 5000);

    return () => clearInterval(interval);
  }, [consultationId, enabled, resolved, fetchConsultation]);

  return {
    consultation,
    loading,
    error,
    refetch: fetchConsultation
  };
}
