interface TabNavigationProps {
  activeTab: 'appointments' | 'patients';
  onTabChange: (tab: 'appointments' | 'patients') => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-2">
          <button
            onClick={() => onTabChange('appointments')}
            className={`
              px-6 py-3 text-[15px] font-medium rounded-t-[10px] transition-colors
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
              px-6 py-3 text-[15px] font-medium rounded-t-[10px] transition-colors
              ${activeTab === 'patients'
                ? 'bg-aneya-navy text-white'
                : 'bg-aneya-cream text-aneya-navy hover:bg-gray-100'
              }
            `}
          >
            Patients
          </button>
        </div>
      </div>
    </div>
  );
}
