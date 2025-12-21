export type PatientTab = 'appointments' | 'symptoms' | 'messages' | 'doctors' | 'profile';

interface PatientTabNavigationProps {
  activeTab: PatientTab;
  onTabChange: (tab: PatientTab) => void;
  unreadMessagesCount?: number;
  showOnlyProfile?: boolean; // When true, only show My Details tab
}

export function PatientTabNavigation({ activeTab, onTabChange, unreadMessagesCount = 0, showOnlyProfile = false }: PatientTabNavigationProps) {
  // If profile is incomplete, only show My Details tab
  if (showOnlyProfile) {
    return (
      <div className="w-full bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-2 sm:px-6">
          <div className="flex gap-0.5 sm:gap-2">
            <button
              onClick={() => onTabChange('profile')}
              className="flex-1 px-2 sm:px-6 py-2 sm:py-3 text-xs sm:text-[15px] font-medium rounded-t-[10px] bg-aneya-navy text-white"
            >
              My Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full tab navigation when profile is complete
  return (
    <div className="w-full bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-2 sm:px-6">
        <div className="flex gap-0.5 sm:gap-2">
          <button
            onClick={() => onTabChange('appointments')}
            className={`
              flex-1 px-2 sm:px-6 py-2 sm:py-3 text-xs sm:text-[15px] font-medium rounded-t-[10px] transition-colors
              ${activeTab === 'appointments'
                ? 'bg-aneya-navy text-white'
                : 'bg-aneya-cream text-aneya-navy hover:bg-gray-100'
              }
            `}
          >
            Appointments
          </button>
          <button
            onClick={() => onTabChange('symptoms')}
            className={`
              flex-1 px-2 sm:px-6 py-2 sm:py-3 text-xs sm:text-[15px] font-medium rounded-t-[10px] transition-colors
              ${activeTab === 'symptoms'
                ? 'bg-aneya-navy text-white'
                : 'bg-aneya-cream text-aneya-navy hover:bg-gray-100'
              }
            `}
          >
            Symptoms
          </button>
          <button
            onClick={() => onTabChange('messages')}
            className={`
              flex-1 px-2 sm:px-6 py-2 sm:py-3 text-xs sm:text-[15px] font-medium rounded-t-[10px] transition-colors relative
              ${activeTab === 'messages'
                ? 'bg-aneya-navy text-white'
                : 'bg-aneya-cream text-aneya-navy hover:bg-gray-100'
              }
            `}
          >
            Messages
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onTabChange('doctors')}
            className={`
              flex-1 px-2 sm:px-6 py-2 sm:py-3 text-xs sm:text-[15px] font-medium rounded-t-[10px] transition-colors
              ${activeTab === 'doctors'
                ? 'bg-aneya-navy text-white'
                : 'bg-aneya-cream text-aneya-navy hover:bg-gray-100'
              }
            `}
          >
            My Doctors
          </button>
          <button
            onClick={() => onTabChange('profile')}
            className={`
              flex-1 px-2 sm:px-6 py-2 sm:py-3 text-xs sm:text-[15px] font-medium rounded-t-[10px] transition-colors
              ${activeTab === 'profile'
                ? 'bg-aneya-navy text-white'
                : 'bg-aneya-cream text-aneya-navy hover:bg-gray-100'
              }
            `}
          >
            My Details
          </button>
        </div>
      </div>
    </div>
  );
}
