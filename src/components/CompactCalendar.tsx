import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Appointment } from '../types/database';

interface CompactCalendarProps {
  appointments: Appointment[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onExpand: () => void;
}

export function CompactCalendar({
  appointments,
  selectedDate,
  onDateChange,
  onExpand
}: CompactCalendarProps) {
  // Get dates that have appointments
  const appointmentDates = appointments.map(apt =>
    new Date(apt.scheduled_time).toDateString()
  );

  const tileContent = ({ date }: { date: Date }) => {
    const dateStr = date.toDateString();
    const hasAppointment = appointmentDates.includes(dateStr);

    if (hasAppointment) {
      return (
        <div className="flex justify-center mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-aneya-teal"></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-[16px] p-4 border-2 border-aneya-teal" style={{ width: '320px' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[16px] font-semibold text-aneya-navy">Calendar</h3>
        <button
          onClick={onExpand}
          className="text-[13px] text-aneya-teal hover:text-aneya-navy font-medium"
        >
          Expand
        </button>
      </div>

      <Calendar
        value={selectedDate}
        onChange={(value) => {
          if (value instanceof Date) {
            onDateChange(value);
          }
        }}
        tileContent={tileContent}
        className="border-none"
      />

      <style>{`
        .react-calendar {
          width: 100%;
          border: none;
          font-family: Inter, sans-serif;
        }
        .react-calendar__tile {
          padding: 0.5em 0.2em;
          font-size: 12px;
        }
        .react-calendar__tile--active {
          background: #1d9e99 !important;
          color: white !important;
        }
        .react-calendar__tile--now {
          background: #f6f5ee !important;
        }
        .react-calendar__tile:hover {
          background: #f6f5ee !important;
        }
        .react-calendar__tile--active:hover {
          background: #1d9e99 !important;
        }
        .react-calendar__navigation button {
          color: #0c3555;
          font-weight: 600;
        }
        .react-calendar__navigation button:hover {
          background: #f6f5ee;
        }
      `}</style>
    </div>
  );
}
