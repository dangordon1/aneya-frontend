import { AppointmentWithPatient, Consultation } from '../types/database';
import { formatDateUK, formatTime24 } from '../utils/dateHelpers';

interface PastAppointmentCardProps {
  appointment: AppointmentWithPatient;
  consultation: Consultation | null;
  onClick: () => void;
  viewMode?: 'doctor' | 'patient';
}

export function PastAppointmentCard({
  appointment,
  consultation,
  onClick,
  viewMode = 'doctor',
}: PastAppointmentCardProps) {
  const date = new Date(appointment.scheduled_time);
  const formattedDate = formatDateUK(date);
  const formattedTime = formatTime24(date);

  // Extract primary diagnosis if available for the card header
  const primaryDiagnosis = consultation?.diagnoses && consultation.diagnoses.length > 0
    ? consultation.diagnoses[0].diagnosis || consultation.diagnoses[0].name
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-[16px] border border-gray-200 p-4 hover:shadow-md hover:border-aneya-teal transition-all text-left"
    >
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className="text-[14px] text-gray-600">
          {formattedDate} at {formattedTime}
        </span>
        <span className="px-2 py-1 rounded-full bg-aneya-teal/10 text-aneya-teal text-[12px] font-medium">
          {appointment.status === 'completed' ? 'Completed' : appointment.status}
        </span>
        {consultation?.detected_consultation_type && (
          <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-[12px] font-medium capitalize">
            {consultation.detected_consultation_type.replace('_', ' ')}
          </span>
        )}
      </div>

      <h4 className="text-[16px] text-aneya-navy font-semibold mb-1">
        {viewMode === 'doctor'
          ? appointment.patient?.name || 'Unknown Patient'
          : appointment.doctor?.name || 'Doctor'}
      </h4>

      {viewMode === 'patient' && appointment.doctor?.specialty && (
        <p className="text-[13px] text-gray-600 mb-1">
          {appointment.doctor.specialty}
        </p>
      )}

      {primaryDiagnosis && (
        <p className="text-[14px] text-gray-700 mb-1">
          <span className="font-medium">Diagnosis:</span> {primaryDiagnosis}
        </p>
      )}

      {appointment.reason && (
        <p className="text-[13px] text-gray-500">Reason: {appointment.reason}</p>
      )}

      {consultation?.prescriptions && consultation.prescriptions.length > 0 && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-[13px] font-semibold text-aneya-navy mb-2">Prescriptions</p>
          <div className="space-y-2">
            {consultation.prescriptions.map((prescription, index) => (
              <div key={index} className="text-[12px] text-gray-700">
                <p className="font-medium text-aneya-navy">{prescription.drug_name}</p>
                <div className="ml-2 text-gray-600">
                  {prescription.amount && <span>{prescription.amount}</span>}
                  {prescription.method && <span> • {prescription.method}</span>}
                  {prescription.frequency && <span> • {prescription.frequency}</span>}
                  {prescription.duration && <span> • {prescription.duration}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </button>
  );
}
