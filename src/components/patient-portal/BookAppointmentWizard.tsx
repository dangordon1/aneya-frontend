import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePatientDoctors } from '../../hooks/usePatientDoctors';
import { useAvailableSlots, DateAvailability } from '../../hooks/useAvailableSlots';
import { supabase } from '../../lib/supabase';
import type { Doctor, AvailableSlot, AppointmentType } from '../../types/database';

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

type WizardStep = 'doctor' | 'date' | 'time' | 'details' | 'confirm';

const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: 'general', label: 'General Consultation' },
  { value: 'follow_up', label: 'Follow-up Visit' },
  { value: 'routine_checkup', label: 'Routine Checkup' },
  { value: 'emergency', label: 'Urgent Care' }
];

export function BookAppointmentWizard({ onBack, onSuccess }: Props) {
  const { patientProfile } = useAuth();
  const { myDoctors, loading: loadingDoctors } = usePatientDoctors();
  const [step, setStep] = useState<WizardStep>('doctor');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('general');
  const [reason, setReason] = useState('');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    slots,
    loading: loadingSlots,
    fetchSlotsForDate,
    dateAvailability,
    loadingDateAvailability,
    fetchDateAvailability
  } = useAvailableSlots(selectedDoctor?.id || null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Active doctors only
  const activeDoctors = myDoctors.filter(rel => rel.status === 'active').map(rel => rel.doctor);

  // Create a map for quick lookup of date availability
  const availabilityMap = useMemo(() => {
    const map = new Map<string, DateAvailability>();
    dateAvailability.forEach(da => map.set(da.date, da));
    return map;
  }, [dateAvailability]);

  useEffect(() => {
    if (selectedDate && selectedDoctor) {
      fetchSlotsForDate(selectedDate);
    }
  }, [selectedDate, selectedDoctor, fetchSlotsForDate]);

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setStep('date');
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep('time');
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setStep('details');
  };

  const handleDetailsSubmit = () => {
    setStep('confirm');
  };

  const handleBook = async () => {
    if (!patientProfile?.id || !selectedDoctor || !selectedSlot) return;

    setBooking(true);
    setError(null);

    try {
      const scheduledTime = `${selectedSlot.date}T${selectedSlot.start_time}:00`;

      const { error: bookError } = await supabase
        .from('appointments')
        .insert({
          patient_id: patientProfile.id,
          doctor_id: selectedDoctor.id,
          scheduled_time: scheduledTime,
          duration_minutes: selectedSlot.duration_minutes,
          appointment_type: appointmentType,
          reason: reason.trim() || null,
          status: 'scheduled',
          booked_by: 'patient',
          created_by: patientProfile.user_id || patientProfile.id
        });

      if (bookError) throw bookError;

      onSuccess();
    } catch (err) {
      console.error('Error booking appointment:', err);
      setError(err instanceof Error ? err.message : 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    }
    if (dateStr === tomorrow.toISOString().split('T')[0]) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const goBack = () => {
    if (step === 'date') setStep('doctor');
    else if (step === 'time') setStep('date');
    else if (step === 'details') setStep('time');
    else if (step === 'confirm') setStep('details');
    else onBack();
  };

  return (
    <div className="min-h-screen bg-aneya-cream">
      {/* Header */}
      <header className="bg-aneya-navy text-white p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={goBack}
            className="text-white/80 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Book Appointment</h1>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center justify-between text-xs">
            {(['doctor', 'date', 'time', 'details', 'confirm'] as WizardStep[]).map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step === s ? 'bg-aneya-teal text-white' :
                  ['doctor', 'date', 'time', 'details', 'confirm'].indexOf(step) > i
                    ? 'bg-aneya-teal/20 text-aneya-teal'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {i + 1}
                </div>
                {i < 4 && (
                  <div className={`w-8 h-0.5 mx-1 ${
                    ['doctor', 'date', 'time', 'details', 'confirm'].indexOf(step) > i
                      ? 'bg-aneya-teal/40'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Step 1: Select Doctor */}
        {step === 'doctor' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-aneya-navy mb-4">Select Doctor</h2>

            {loadingDoctors ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal mx-auto"></div>
              </div>
            ) : activeDoctors.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>You don't have any assigned doctors yet.</p>
                <p className="text-sm mt-2">Ask your doctor to send you an invitation.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeDoctors.map(doctor => (
                  <button
                    key={doctor.id}
                    onClick={() => handleDoctorSelect(doctor)}
                    className="w-full p-4 border border-gray-200 rounded-lg text-left hover:border-aneya-teal hover:bg-aneya-teal/5 transition-colors"
                  >
                    <div className="font-medium text-aneya-navy">{doctor.name}</div>
                    {doctor.specialty && (
                      <div className="text-sm text-gray-500">{doctor.specialty}</div>
                    )}
                    {doctor.clinic_name && (
                      <div className="text-sm text-gray-400">{doctor.clinic_name}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Date */}
        {step === 'date' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-aneya-navy mb-4">Select Date</h2>
            <p className="text-sm text-gray-500 mb-4">
              Booking with: <span className="font-medium text-aneya-navy">{selectedDoctor?.name}</span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              {availableDates.map(date => (
                <button
                  key={date}
                  onClick={() => handleDateSelect(date)}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    selectedDate === date
                      ? 'border-aneya-teal bg-aneya-teal/10 text-aneya-teal'
                      : 'border-gray-200 hover:border-aneya-teal hover:bg-aneya-teal/5'
                  }`}
                >
                  <div className="font-medium">{formatDate(date)}</div>
                  <div className="text-xs text-gray-500">{new Date(date).toLocaleDateString('en-GB', { weekday: 'long' })}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Time */}
        {step === 'time' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-aneya-navy mb-4">Select Time</h2>
            <p className="text-sm text-gray-500 mb-4">
              {formatDate(selectedDate)} with {selectedDoctor?.name}
            </p>

            {loadingSlots ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal mx-auto"></div>
              </div>
            ) : slots.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>No available slots on this date.</p>
                <button
                  onClick={() => setStep('date')}
                  className="mt-2 text-aneya-teal hover:text-aneya-teal/80 text-sm font-medium"
                >
                  Choose another date
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {slots.map(slot => (
                  <button
                    key={`${slot.date}-${slot.start_time}`}
                    onClick={() => handleSlotSelect(slot)}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      selectedSlot?.start_time === slot.start_time
                        ? 'border-aneya-teal bg-aneya-teal/10 text-aneya-teal'
                        : 'border-gray-200 hover:border-aneya-teal hover:bg-aneya-teal/5'
                    }`}
                  >
                    <div className="font-medium">{slot.start_time}</div>
                    <div className="text-xs text-gray-500">{slot.duration_minutes} min</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Appointment Details */}
        {step === 'details' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-aneya-navy mb-4">Appointment Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appointment Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {APPOINTMENT_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setAppointmentType(type.value)}
                      className={`p-3 border rounded-lg text-sm transition-colors ${
                        appointmentType === type.value
                          ? 'border-aneya-teal bg-aneya-teal/10 text-aneya-teal'
                          : 'border-gray-200 hover:border-aneya-teal hover:bg-aneya-teal/5'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Visit (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Briefly describe why you're booking this appointment..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
                />
              </div>

              <button
                onClick={handleDetailsSubmit}
                className="w-full py-3 bg-aneya-teal text-white rounded-lg hover:bg-aneya-teal/90 font-medium"
              >
                Continue to Confirm
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 'confirm' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-aneya-navy mb-4">Confirm Booking</h2>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Doctor</span>
                <span className="font-medium text-aneya-navy">{selectedDoctor?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span className="font-medium text-aneya-navy">{formatDate(selectedSlot?.date || '')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time</span>
                <span className="font-medium text-aneya-navy">
                  {selectedSlot?.start_time} - {selectedSlot?.end_time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium text-aneya-navy">{selectedSlot?.duration_minutes} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type</span>
                <span className="font-medium text-aneya-navy">
                  {APPOINTMENT_TYPES.find(t => t.value === appointmentType)?.label}
                </span>
              </div>
              {reason && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-600 text-sm">Reason:</span>
                  <p className="text-aneya-navy text-sm mt-1">{reason}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleBook}
              disabled={booking}
              className="w-full py-3 bg-aneya-teal text-white rounded-lg hover:bg-aneya-teal/90 font-medium disabled:opacity-50"
            >
              {booking ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
