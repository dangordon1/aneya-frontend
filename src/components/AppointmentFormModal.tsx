import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Appointment, Patient, CreateAppointmentInput, AppointmentType, OBGYNSubtype } from '../types/database';

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: CreateAppointmentInput) => Promise<void>;
  patients: Patient[];
  appointment?: Appointment;
  preFilledDate?: Date;
  onCreatePatient?: () => void;
}

export function AppointmentFormModal({
  isOpen,
  onClose,
  onSave,
  patients,
  appointment,
  preFilledDate,
  onCreatePatient
}: AppointmentFormModalProps) {
  const { doctorProfile } = useAuth();

  const [formData, setFormData] = useState<CreateAppointmentInput>({
    patient_id: '',
    scheduled_time: '',
    duration_minutes: 15,
    appointment_type: 'general',
    reason: '',
    notes: '',
  });

  // Determine specialty from doctor's profile
  const doctorSpecialty = doctorProfile?.specialty || 'general';
  const isOBGynDoctor = doctorSpecialty === 'obgyn';

  // Only subtype selection for OB/GYN doctors
  const [subtype, setSubtype] = useState<OBGYNSubtype>('general_obgyn');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Generate time slots from 07:00 to 22:00 in 15-minute intervals
  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 7; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
      }
    }
    // Add 22:00 as the final slot
    slots.push('22:00');
    return slots;
  };

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    if (appointment) {
      const scheduledDate = new Date(appointment.scheduled_time);
      const dateStr = scheduledDate.toISOString().split('T')[0];
      const timeStr = scheduledDate.toTimeString().slice(0, 5);

      setFormData({
        patient_id: appointment.patient_id,
        scheduled_time: `${dateStr}T${timeStr}`,
        duration_minutes: appointment.duration_minutes,
        appointment_type: appointment.appointment_type,
        reason: appointment.reason || '',
        notes: appointment.notes || '',
      });

      // Parse existing appointment to set subtype (specialty comes from doctor profile)
      if (appointment.specialty_subtype) {
        setSubtype(appointment.specialty_subtype as OBGYNSubtype);
      } else if (appointment.appointment_type.startsWith('obgyn_')) {
        // Legacy: parse from appointment_type
        const subtypeStr = appointment.appointment_type.replace('obgyn_', '') as OBGYNSubtype;
        setSubtype(subtypeStr);
      } else {
        setSubtype('general_obgyn');
      }
    } else if (preFilledDate) {
      const dateStr = preFilledDate.toISOString().split('T')[0];
      setFormData({
        patient_id: '',
        scheduled_time: `${dateStr}T09:00`,
        duration_minutes: 15,
        appointment_type: 'general',
        reason: '',
        notes: '',
      });
      setSubtype('general_obgyn');
    } else {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      setFormData({
        patient_id: '',
        scheduled_time: `${dateStr}T09:00`,
        duration_minutes: 15,
        appointment_type: 'general',
        reason: '',
        notes: '',
      });
      setSubtype('general_obgyn');
    }
    setErrors({});
  }, [appointment, preFilledDate, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.patient_id) {
      newErrors.patient_id = 'Please select a patient';
    }

    if (!formData.scheduled_time) {
      newErrors.scheduled_time = 'Please select a date and time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSaving(true);
    try {
      // Convert to ISO string for Supabase
      const [date, time] = formData.scheduled_time.split('T');
      const scheduledDateTime = new Date(`${date}T${time}:00`);

      // Build appointment_type from doctor's specialty + subtype
      let appointmentType: AppointmentType;
      if (isOBGynDoctor) {
        appointmentType = `obgyn_${subtype}` as AppointmentType;
      } else {
        appointmentType = doctorSpecialty as AppointmentType;
      }

      await onSave({
        ...formData,
        scheduled_time: scheduledDateTime.toISOString(),
        appointment_type: appointmentType,
        specialty: doctorSpecialty,
        specialty_subtype: isOBGynDoctor ? subtype : null,
      });
      onClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof CreateAppointmentInput>(
    field: K,
    value: CreateAppointmentInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  // Check if there are no patients (and not editing an existing appointment)
  const hasNoPatients = patients.length === 0 && !appointment;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-4 sm:py-8">
      <div className="bg-white rounded-[20px] p-4 sm:p-8 max-w-2xl w-full mx-4 my-auto max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-y-auto">
        <h2 className="text-[24px] sm:text-[28px] text-aneya-navy mb-4 sm:mb-6">
          {appointment ? 'Edit Appointment' : 'Create New Appointment'}
        </h2>

        {/* No patients message */}
        {hasNoPatients ? (
          <div className="text-center py-8">
            <svg
              className="h-16 w-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-[18px] text-aneya-navy mb-2 font-medium">No patients yet</h3>
            <p className="text-[14px] text-gray-600 mb-6">
              You need to create a patient before you can schedule an appointment.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-[10px] font-medium text-[14px] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {onCreatePatient && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreatePatient();
                  }}
                  className="px-6 py-3 bg-aneya-navy text-white rounded-[10px] font-medium text-[14px] hover:bg-opacity-90 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create Patient
                </button>
              )}
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Patient Selection */}
          <div>
            <label htmlFor="patient" className="block mb-1 text-[12px] text-gray-600">
              Patient <span className="text-red-500">*</span>
            </label>
            <select
              id="patient"
              value={formData.patient_id}
              onChange={(e) => updateField('patient_id', e.target.value)}
              className={`w-full p-2 bg-gray-50 border ${
                errors.patient_id ? 'border-red-500' : 'border-gray-200'
              } rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy`}
            >
              <option value="">Select a patient...</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
            {errors.patient_id && <p className="text-red-500 text-[12px] mt-1">{errors.patient_id}</p>}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="date" className="block mb-1 text-[12px] text-gray-600">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="date"
                type="date"
                value={formData.scheduled_time.split('T')[0]}
                onChange={(e) => {
                  const time = formData.scheduled_time.split('T')[1] || '09:00';
                  updateField('scheduled_time', `${e.target.value}T${time}`);
                }}
                className={`w-full p-2 bg-gray-50 border ${
                  errors.scheduled_time ? 'border-red-500' : 'border-gray-200'
                } rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy`}
              />
            </div>

            <div>
              <label htmlFor="time" className="block mb-1 text-[12px] text-gray-600">
                Time <span className="text-red-500">*</span>
              </label>
              <select
                id="time"
                value={formData.scheduled_time.split('T')[1] || '09:00'}
                onChange={(e) => {
                  const date = formData.scheduled_time.split('T')[0];
                  updateField('scheduled_time', `${date}T${e.target.value}`);
                }}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy"
              >
                {timeSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration and OB/GYN Subtype */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="duration" className="block mb-1 text-[12px] text-gray-600">
                Duration
              </label>
              <select
                id="duration"
                value={formData.duration_minutes}
                onChange={(e) => updateField('duration_minutes', Number(e.target.value))}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            {/* OB/GYN Subtype Selection (only for OB/GYN doctors) */}
            {isOBGynDoctor && (
              <div>
                <label htmlFor="subtype" className="block mb-1 text-[12px] text-gray-600">
                  Appointment Type
                </label>
                <select
                  id="subtype"
                  value={subtype}
                  onChange={(e) => setSubtype(e.target.value as OBGYNSubtype)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy"
                >
                  <option value="general_obgyn">General OB/GYN</option>
                  <option value="infertility">Infertility</option>
                  <option value="antenatal">Antenatal Care (ANC)</option>
                  <option value="routine_gyn">Routine Gynecology</option>
                </select>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block mb-1 text-[12px] text-gray-600">
              Reason for Visit
            </label>
            <textarea
              id="reason"
              value={formData.reason || ''}
              onChange={(e) => updateField('reason', e.target.value)}
              rows={3}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy resize-none"
              placeholder="e.g., Follow-up for diabetes management"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block mb-1 text-[12px] text-gray-600">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy resize-none"
              placeholder="Additional notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4 sm:mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-300 text-gray-700 rounded-[10px] font-medium text-[14px] hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-aneya-navy text-white rounded-[10px] font-medium text-[14px] hover:bg-opacity-90 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
