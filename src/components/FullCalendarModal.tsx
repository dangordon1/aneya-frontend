import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { AppointmentWithPatient } from '../types/database';
import { formatTime24 } from '../utils/dateHelpers';
import { X } from 'lucide-react';

interface FullCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: AppointmentWithPatient[];
  onSelectAppointment: (appointment: AppointmentWithPatient) => void;
  onCreateAppointment: (date: Date) => void;
}

export function FullCalendarModal({
  isOpen,
  onClose,
  appointments,
  onSelectAppointment,
  onCreateAppointment
}: FullCalendarModalProps) {
  if (!isOpen) return null;

  // Group appointments by date
  const appointmentsByDate = appointments.reduce((acc, apt) => {
    const dateStr = new Date(apt.scheduled_time).toDateString();
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(apt);
    return acc;
  }, {} as Record<string, AppointmentWithPatient[]>);

  const tileContent = ({ date }: { date: Date }) => {
    const dateStr = date.toDateString();
    const dayAppointments = appointmentsByDate[dateStr] || [];

    if (dayAppointments.length === 0) {
      return null;
    }

    // Show up to 3 appointments
    const displayAppointments = dayAppointments.slice(0, 3);
    const hasMore = dayAppointments.length > 3;

    return (
      <div className="mt-1 space-y-0.5">
        {displayAppointments.map((apt, idx) => (
          <div
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              onSelectAppointment(apt);
            }}
            className="text-[10px] bg-aneya-teal text-white px-1 py-0.5 rounded cursor-pointer hover:bg-opacity-80 truncate"
          >
            {formatTime24(new Date(apt.scheduled_time))} - {apt.patient?.name || 'Unknown'}
          </div>
        ))}
        {hasMore && (
          <div className="text-[10px] text-gray-500 px-1">
            +{dayAppointments.length - 3} more
          </div>
        )}
      </div>
    );
  };

  const handleTileClick = (value: Date) => {
    const dateStr = value.toDateString();
    const dayAppointments = appointmentsByDate[dateStr] || [];

    // If no appointments on this date, create new appointment
    if (dayAppointments.length === 0) {
      onCreateAppointment(value);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative bg-white rounded-[20px] p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[28px] text-aneya-navy">Calendar View</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-aneya-navy" />
          </button>
        </div>

        {/* Calendar */}
        <Calendar
          onClickDay={handleTileClick}
          tileContent={tileContent}
          className="border-2 border-aneya-teal rounded-[10px] w-full"
        />

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6 text-[13px] text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-aneya-teal"></div>
            <span>Has appointments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border border-gray-300"></div>
            <span>Click to create appointment</span>
          </div>
        </div>

        <style>{`
          .react-calendar {
            width: 100%;
            border: none;
            font-family: Inter, sans-serif;
          }
          .react-calendar__tile {
            padding: 1em 0.5em;
            min-height: 100px;
            font-size: 14px;
            vertical-align: top;
          }
          .react-calendar__tile--active {
            background: rgba(29, 158, 153, 0.1) !important;
            border: 2px solid #1d9e99 !important;
          }
          .react-calendar__tile--now {
            background: #f6f5ee !important;
          }
          .react-calendar__tile:hover {
            background: #f6f5ee !important;
          }
          .react-calendar__navigation button {
            color: #0c3555;
            font-weight: 600;
            font-size: 16px;
          }
          .react-calendar__navigation button:hover {
            background: #f6f5ee;
          }
          .react-calendar__month-view__days__day--weekend {
            color: #0c3555;
          }
        `}</style>
      </div>
    </div>
  );
}
