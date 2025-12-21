import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { DoctorAvailability, Appointment, AvailableSlot } from '../types/database';

export interface DateAvailability {
  date: string;
  hasAvailability: boolean;
  availableSlotCount: number;
}

interface UseAvailableSlotsReturn {
  slots: AvailableSlot[];
  loading: boolean;
  error: string | null;
  dateAvailability: DateAvailability[];
  loadingDateAvailability: boolean;
  fetchSlotsForDate: (date: string) => Promise<void>;
  fetchSlotsForWeek: (startDate: string) => Promise<void>;
  fetchDateAvailability: (startDate: string, days: number) => Promise<void>;
}

// Helper to add minutes to a time string
function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60) % 24;
  const newMins = totalMins % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

// Helper to compare times
function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

// Generate time slots from availability
function generateSlots(
  availability: DoctorAvailability[],
  date: string,
  bookedAppointments: Appointment[]
): AvailableSlot[] {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();

  // Get availability for this day of week
  const dayAvailability = availability.filter(
    a => a.day_of_week === dayOfWeek && a.is_active
  );

  if (dayAvailability.length === 0) return [];

  const slots: AvailableSlot[] = [];

  // Get booked times for this date
  const bookedTimes = bookedAppointments
    .filter(apt => apt.scheduled_time.startsWith(date))
    .map(apt => {
      const time = apt.scheduled_time.split('T')[1].substring(0, 5);
      return {
        start: timeToMinutes(time),
        end: timeToMinutes(time) + apt.duration_minutes
      };
    });

  for (const avail of dayAvailability) {
    const startMinutes = timeToMinutes(avail.start_time.substring(0, 5));
    const endMinutes = timeToMinutes(avail.end_time.substring(0, 5));
    const duration = avail.slot_duration_minutes;

    let currentMinutes = startMinutes;
    while (currentMinutes + duration <= endMinutes) {
      // Check if this slot overlaps with any booked appointment
      const slotEnd = currentMinutes + duration;
      const isBooked = bookedTimes.some(
        booked => !(slotEnd <= booked.start || currentMinutes >= booked.end)
      );

      if (!isBooked) {
        const startTime = `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`;
        const endTime = addMinutes(startTime, duration);

        slots.push({
          date,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: duration
        });
      }

      currentMinutes += duration;
    }
  }

  return slots;
}

export function useAvailableSlots(doctorId: string | null): UseAvailableSlotsReturn {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<DoctorAvailability[]>([]);
  const [dateAvailability, setDateAvailability] = useState<DateAvailability[]>([]);
  const [loadingDateAvailability, setLoadingDateAvailability] = useState(false);

  // Fetch doctor's availability schedule
  useEffect(() => {
    if (!doctorId) return;

    const fetchAvailability = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('doctor_availability')
          .select('*')
          .eq('doctor_id', doctorId)
          .eq('is_active', true);

        if (fetchError) throw fetchError;
        setAvailability(data || []);
      } catch (err) {
        console.error('Error fetching doctor availability:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch availability');
      }
    };

    fetchAvailability();
  }, [doctorId]);

  const fetchSlotsForDate = useCallback(async (date: string) => {
    if (!doctorId) {
      setSlots([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch appointments for this date
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59`;

      const { data: aptData, error: aptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('scheduled_time', startOfDay)
        .lte('scheduled_time', endOfDay)
        .not('status', 'eq', 'cancelled');

      if (aptError) throw aptError;

      const generatedSlots = generateSlots(availability, date, aptData || []);
      setSlots(generatedSlots);
    } catch (err) {
      console.error('Error fetching slots:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch slots');
    } finally {
      setLoading(false);
    }
  }, [doctorId, availability]);

  const fetchSlotsForWeek = useCallback(async (startDate: string) => {
    if (!doctorId) {
      setSlots([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calculate end of week
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const startStr = startDate;
      const endStr = end.toISOString().split('T')[0];

      // Fetch all appointments for the week
      const { data: aptData, error: aptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('scheduled_time', `${startStr}T00:00:00`)
        .lte('scheduled_time', `${endStr}T23:59:59`)
        .not('status', 'eq', 'cancelled');

      if (aptError) throw aptError;

      // Generate slots for each day
      const allSlots: AvailableSlot[] = [];
      const current = new Date(startDate);

      for (let i = 0; i < 7; i++) {
        const dateStr = current.toISOString().split('T')[0];
        const daySlots = generateSlots(availability, dateStr, aptData || []);
        allSlots.push(...daySlots);
        current.setDate(current.getDate() + 1);
      }

      setSlots(allSlots);
    } catch (err) {
      console.error('Error fetching week slots:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch slots');
    } finally {
      setLoading(false);
    }
  }, [doctorId, availability]);

  const fetchDateAvailability = useCallback(async (startDate: string, days: number) => {
    if (!doctorId || availability.length === 0) {
      setDateAvailability([]);
      return;
    }

    setLoadingDateAvailability(true);

    try {
      // Calculate date range
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + days);

      const startStr = startDate;
      const endStr = end.toISOString().split('T')[0];

      // Fetch all appointments for the date range
      const { data: aptData, error: aptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('scheduled_time', `${startStr}T00:00:00`)
        .lte('scheduled_time', `${endStr}T23:59:59`)
        .not('status', 'eq', 'cancelled');

      if (aptError) throw aptError;

      // Generate availability info for each day
      const availabilityInfo: DateAvailability[] = [];
      const current = new Date(startDate);

      for (let i = 0; i < days; i++) {
        const dateStr = current.toISOString().split('T')[0];
        const daySlots = generateSlots(availability, dateStr, aptData || []);

        availabilityInfo.push({
          date: dateStr,
          hasAvailability: daySlots.length > 0,
          availableSlotCount: daySlots.length
        });

        current.setDate(current.getDate() + 1);
      }

      setDateAvailability(availabilityInfo);
    } catch (err) {
      console.error('Error fetching date availability:', err);
    } finally {
      setLoadingDateAvailability(false);
    }
  }, [doctorId, availability]);

  return {
    slots,
    loading,
    error,
    dateAvailability,
    loadingDateAvailability,
    fetchSlotsForDate,
    fetchSlotsForWeek,
    fetchDateAvailability
  };
}
