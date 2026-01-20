import { useState } from 'react';
import { AppointmentWithPatient, Consultation } from '../types/database';
import { AppointmentStatusBadge } from './AppointmentStatusBadge';
import { formatTime24 } from '../utils/dateHelpers';

interface AppointmentCardProps {
  appointment: AppointmentWithPatient;
  onStartConsultation: (appointment: AppointmentWithPatient) => void;
  onModify: (appointment: AppointmentWithPatient) => void;
  onCancel: (appointment: AppointmentWithPatient) => void;
  consultation?: Consultation | null;
}

export function AppointmentCard({
  appointment,
  onStartConsultation,
  onModify,
  onCancel,
  consultation
}: AppointmentCardProps) {
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const scheduledTime = new Date(appointment.scheduled_time);
  const formattedTime = formatTime24(scheduledTime);

  const canStartConsultation = appointment.status === 'scheduled' || appointment.status === 'in_progress';
  const reasonDisplay = appointment.reason
    ? appointment.reason.length > 100
      ? appointment.reason.substring(0, 100) + '...'
      : appointment.reason
    : 'No reason specified';

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${API_URL}/api/appointments/${appointment.id}/consultation-pdf`,
        {
          method: 'GET',
          headers: {
            // Add auth token if needed in future
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          const error = await response.json();
          alert(error.detail || 'No consultation form found for this appointment');
        } else {
          throw new Error('Failed to generate PDF');
        }
        return;
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `consultation_${appointment.id.substring(0, 8)}_${(appointment.patient?.name || 'patient').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

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
            {appointment.patient?.name || 'Unknown Patient'}
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

      {consultation?.prescriptions && consultation.prescriptions.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
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

        {appointment.consultation_id && (
          <button
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            className="w-full px-4 py-2 border-2 border-aneya-navy text-aneya-navy rounded-[10px] text-[14px] font-medium hover:bg-aneya-navy hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {generatingPdf ? 'Generating PDF...' : 'Generate PDF'}
          </button>
        )}
      </div>
    </div>
  );
}
