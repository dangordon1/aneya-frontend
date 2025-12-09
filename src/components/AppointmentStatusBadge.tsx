import { AppointmentStatus } from '../types/database';

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
}

export function AppointmentStatusBadge({ status }: AppointmentStatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'no_show':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'no_show':
        return 'No Show';
      default:
        return status;
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full border text-[13px] font-medium ${getStatusStyles()}`}>
      {getStatusLabel()}
    </span>
  );
}
