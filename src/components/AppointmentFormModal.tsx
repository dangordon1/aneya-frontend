import { useState, useEffect } from 'react';
import { Appointment, Patient, CreateAppointmentInput, AppointmentType } from '../types/database';

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: CreateAppointmentInput) => Promise<void>;
  patients: Patient[];
  appointment?: Appointment;
  preFilledDate?: Date;
}

export function AppointmentFormModal({
  isOpen,
  onClose,
  onSave,
  patients,
  appointment,
  preFilledDate
}: AppointmentFormModalProps) {
  const [formData, setFormData] = useState<CreateAppointmentInput>({
    patient_id: '',
    scheduled_time: '',
    duration_minutes: 15,
    appointment_type: 'general',
    reason: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Generate time slots from 08:00 to 18:00 in 15-minute intervals
  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
      }
    }
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

      await onSave({
        ...formData,
        scheduled_time: scheduledDateTime.toISOString(),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-[20px] p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-[28px] text-aneya-navy mb-6">
          {appointment ? 'Edit Appointment' : 'Create New Appointment'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
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

          {/* Duration and Type */}
          <div className="grid grid-cols-2 gap-4">
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

            <div>
              <label htmlFor="type" className="block mb-1 text-[12px] text-gray-600">
                Appointment Type
              </label>
              <select
                id="type"
                value={formData.appointment_type}
                onChange={(e) => updateField('appointment_type', e.target.value as AppointmentType)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal transition-colors text-[14px] text-aneya-navy"
              >
                <option value="general">General</option>
                <option value="follow_up">Follow-up</option>
                <option value="emergency">Emergency</option>
                <option value="routine_checkup">Routine Checkup</option>
              </select>
            </div>
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
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-[10px] font-medium text-[14px] hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-aneya-navy text-white rounded-[10px] font-medium text-[14px] hover:bg-opacity-90 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
