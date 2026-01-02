import { useState } from 'react';
import { AppointmentWithPatient, Consultation } from '../types/database';
import { PastAppointmentCard } from './PastAppointmentCard';
import { formatDateUK } from '../utils/dateHelpers';

interface PreviousAppointmentSidebarProps {
  appointment: AppointmentWithPatient | null;
  consultation: Consultation | null;
  loading: boolean;
  onAppointmentClick?: () => void;
}

export function PreviousAppointmentSidebar({
  appointment,
  consultation,
  loading,
  onAppointmentClick,
}: PreviousAppointmentSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if no appointment
  if (!appointment && !loading) {
    return null;
  }

  // Show loading skeleton
  if (loading) {
    return (
      <div className="w-full bg-white rounded-[16px] border border-gray-200 p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!appointment) return null;

  const lastVisitDate = formatDateUK(new Date(appointment.scheduled_time));

  return (
    <div className="w-full bg-white rounded-[16px] border-2 border-aneya-soft-pink overflow-hidden transition-all">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-aneya-teal"
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
          <div>
            <div className="text-[14px] text-aneya-navy font-medium">
              Previous Appointment
            </div>
            <div className="text-[12px] text-gray-600">
              Last visit: {lastVisitDate}
            </div>
          </div>
        </div>

        {/* Chevron Icon */}
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expanded Content */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-4 pb-4">
          <div className="border-t border-gray-200 pt-4">
            <PastAppointmentCard
              appointment={appointment}
              consultation={consultation}
              onClick={() => onAppointmentClick?.()}
              viewMode="doctor"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
