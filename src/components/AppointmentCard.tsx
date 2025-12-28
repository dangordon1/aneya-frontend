import { AppointmentWithPatient, MedicalSpecialtyType } from '../types/database';
import { AppointmentStatusBadge } from './AppointmentStatusBadge';
import { formatTime24 } from '../utils/dateHelpers';
import { requiresOBGynForms } from '../utils/specialtyHelpers';

interface AppointmentCardProps {
  appointment: AppointmentWithPatient;
  onStartConsultation: (appointment: AppointmentWithPatient) => void;
  onModify: (appointment: AppointmentWithPatient) => void;
  onCancel: (appointment: AppointmentWithPatient) => void;
  onFillPreConsultationForm?: (appointment: AppointmentWithPatient) => void;
  obgynFormStatus?: 'draft' | 'partial' | 'completed' | null;
  doctorSpecialty?: MedicalSpecialtyType | null;
}

export function AppointmentCard({
  appointment,
  onStartConsultation,
  onModify,
  onCancel,
  onFillPreConsultationForm,
  obgynFormStatus,
  doctorSpecialty
}: AppointmentCardProps) {
  const scheduledTime = new Date(appointment.scheduled_time);
  const formattedTime = formatTime24(scheduledTime);

  const canStartConsultation = appointment.status === 'scheduled' || appointment.status === 'in_progress';
  const reasonDisplay = appointment.reason
    ? appointment.reason.length > 100
      ? appointment.reason.substring(0, 100) + '...'
      : appointment.reason
    : 'No reason specified';

  // Determine button text and visibility for pre-consultation form
  const getFormButtonText = () => {
    if (!obgynFormStatus) return 'Fill Pre-consultation Form';
    if (obgynFormStatus === 'draft' || obgynFormStatus === 'partial') return 'Review/Edit Pre-consultation Form';
    return 'Review Pre-consultation Form';
  };

  // Only show form button for OB/GYN appointments
  const isOBGyn = requiresOBGynForms(doctorSpecialty);
  const canShowFormButton = onFillPreConsultationForm !== undefined && isOBGyn;
  const statusCheck = appointment.status === 'scheduled' || appointment.status === 'in_progress';

  return (
    <div className="bg-white rounded-[16px] p-6 border-2 border-aneya-soft-pink hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[16px] font-semibold text-aneya-navy">
              {formattedTime}
            </span>
            <span className="text-[14px] text-gray-600">
              • {appointment.duration_minutes} min
            </span>
            <AppointmentStatusBadge status={appointment.status} />
          </div>

          <h3 className="text-[18px] text-aneya-navy font-medium mb-1">
            {appointment.patient.name}
          </h3>

          <p className="text-[14px] text-gray-600 mb-3">
            {reasonDisplay}
          </p>

          {appointment.notes && (
            <p className="text-[13px] text-gray-500 italic">
              Notes: {appointment.notes}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
        <div className="flex gap-2">
          {canStartConsultation && (
            <button
              onClick={() => onStartConsultation(appointment)}
              className="flex-1 px-4 py-2 bg-aneya-navy text-white rounded-[10px] text-[14px] font-medium hover:bg-opacity-90 transition-colors"
            >
              Start Consultation
            </button>
          )}

          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
            <>
              <button
                onClick={() => onModify(appointment)}
                className="px-4 py-2 border-2 border-aneya-teal text-aneya-navy rounded-[10px] text-[14px] font-medium hover:bg-aneya-teal hover:text-white transition-colors"
              >
                Modify
              </button>
              <button
                onClick={() => onCancel(appointment)}
                className="px-4 py-2 border-2 border-red-300 text-red-700 rounded-[10px] text-[14px] font-medium hover:bg-red-50 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {canShowFormButton && (appointment.status === 'scheduled' || appointment.status === 'in_progress') && (
          <button
            onClick={() => onFillPreConsultationForm?.(appointment)}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-[10px] text-[14px] font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {getFormButtonText()}
          </button>
        )}
      </div>
    </div>
  );
}
