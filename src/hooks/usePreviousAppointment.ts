import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AppointmentWithPatient, Consultation } from '../types/database';

interface UsePreviousAppointmentReturn {
  previousAppointment: AppointmentWithPatient | null;
  consultation: Consultation | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch the most recent previous completed appointment for a patient
 * @param patientId - The patient's ID
 * @param excludeAppointmentId - Optional appointment ID to exclude (e.g., current appointment)
 */
export function usePreviousAppointment(
  patientId?: string,
  excludeAppointmentId?: string
): UsePreviousAppointmentReturn {
  const [previousAppointment, setPreviousAppointment] = useState<AppointmentWithPatient | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreviousAppointment = async () => {
      // Don't fetch if no patient ID
      if (!patientId) {
        setPreviousAppointment(null);
        setConsultation(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch most recent completed appointment for the patient
        let query = supabase
          .from('appointments')
          .select('*, patient:patients(*), doctor:doctors(*)')
          .eq('patient_id', patientId)
          .in('status', ['completed'])
          .order('scheduled_time', { ascending: false })
          .limit(1);

        const { data: appointments, error: appointmentError } = await query;

        if (appointmentError) {
          console.error('Error fetching previous appointment:', appointmentError);
          setError(appointmentError.message);
          return;
        }

        // Filter out the current appointment if excludeAppointmentId is provided
        const filteredAppointments = appointments?.filter(
          (apt) => apt.id !== excludeAppointmentId
        ) || [];

        if (filteredAppointments.length === 0) {
          setPreviousAppointment(null);
          setConsultation(null);
          return;
        }

        const appointment = filteredAppointments[0];
        setPreviousAppointment(appointment);

        // Fetch associated consultation if it exists
        if (appointment.consultation_id) {
          const { data: consultationData, error: consultationError } = await supabase
            .from('consultations')
            .select('*')
            .eq('id', appointment.consultation_id)
            .single();

          if (consultationError) {
            console.error('Error fetching consultation:', consultationError);
            // Don't set error here - appointment data is still valid
          } else {
            setConsultation(consultationData);
          }
        }
      } catch (err) {
        console.error('Error in usePreviousAppointment:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchPreviousAppointment();
  }, [patientId, excludeAppointmentId]);

  return {
    previousAppointment,
    consultation,
    loading,
    error,
  };
}
