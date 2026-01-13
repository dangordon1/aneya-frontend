export type DoctorTab = 'appointments' | 'patients' | 'messages' | 'profile' | 'forms' | 'alldoctors' | 'feedback';

interface TabNavigationProps {
  activeTab: DoctorTab;
  onTabChange: (tab: DoctorTab) => void;
  unreadMessagesCount?: number;
  pendingRequestsCount?: number;
  isAdmin?: boolean;
}

export function TabNavigation({ activeTab, onTabChange, unreadMessagesCount = 0, pendingRequestsCount = 0, isAdmin = false }: TabNavigationProps) {
  const totalBadge = unreadMessagesCount + pendingRequestsCount;

  return (
    <div className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-0 sm:px-6">
        <div className="flex gap-0.5 sm:gap-2 overflow-x-auto">
          <button
            onClick={() => onTabChange('appointments')}
            className={`
              px-2 py-2 sm:px-6 sm:py-3 text-[13px] sm:text-[15px] font-medium rounded-t-[10px] transition-colors whitespace-nowrap
              ${activeTab === 'appointments'
                ? 'bg-aneya-navy text-white'
                : 'bg-aneya-cream text-aneya-navy hover:bg-gray-100'
              }
            `}
          >
            Appointments
          </button>
          <button
            onClick={() => onTabChange('patients')}
            className={`
              px-2 py-2 sm:px-6 sm:py-3 text-[13px] sm:text-[15px] font-medium rounded-t-[10px] transition-colors whitespace-nowrap
              ${activeTab === 'patients'
                ? 'bg-aneya-navy text-white'
                : 'bg-aneya-cream text-aneya-navy hover:bg-gray-100'
              }
            `}
          >
            Patients
          </button>
          <button
            onClick={() => onTabChange('messages')}
            className={`
              px-2 py-2 sm:px-6 sm:py-3 text-[13px] sm:text-[15px] font-medium rounded-t-[10px] transition-colors relative whitespace-nowrap
              ${activeTab === 'messages'
                ? 'bg-aneya-navy text-white'
                : 'bg-aneya-cream text-aneya-navy hover:bg-gray-100'
              }
            `}
          >
            Messages
            {totalBadge > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {totalBadge > 9 ? '9+' : totalBadge}
              </span>
            )}
          </button>
          <button
            onClick={() => onTabChange('profile')}
            className={`
              px-2 py-2 sm:px-6 sm:py-3 text-[13px] sm:text-[15px] font-medium rounded-t-[10px] transition-colors whitespace-nowrap
              ${activeTab === 'profile'
                ? 'bg-aneya-navy text-white'
                : 'bg-aneya-cream text-aneya-navy hover:bg-gray-100'
              }
            `}
          >
            My Details
          </button>
          <button
            onClick={() => onTabChange('forms')}
            className={`
              px-2 py-2 sm:px-6 sm:py-3 text-[13px] sm:text-[15px] font-medium rounded-t-[10px] transition-colors whitespace-nowrap
              ${activeTab === 'forms'
                ? 'bg-aneya-navy text-white'
                : 'bg-aneya-cream text-aneya-navy hover:bg-gray-100'
              }
            `}
          >
            My Forms
          </button>
          {isAdmin && (
            <button
              onClick={() => onTabChange('alldoctors')}
              className={`
                px-2 py-2 sm:px-6 sm:py-3 text-[13px] sm:text-[15px] font-medium rounded-t-[10px] transition-colors whitespace-nowrap
                ${activeTab === 'alldoctors'
                  ? 'bg-aneya-navy text-white'
                  : 'bg-aneya-cream text-aneya-navy hover:bg-gray-100'
                }
              `}
            >
              All Doctors
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onTabChange('feedback')}
              className={`
                px-2 py-2 sm:px-6 sm:py-3 text-[13px] sm:text-[15px] font-medium rounded-t-[10px] transition-colors whitespace-nowrap
                ${activeTab === 'feedback'
                  ? 'bg-aneya-navy text-white'
                  : 'bg-aneya-cream text-aneya-navy hover:bg-gray-100'
                }
              `}
            >
              Feedback
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
