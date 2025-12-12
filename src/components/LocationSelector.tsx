import { useState } from 'react';

interface LocationSelectorProps {
  selectedLocation: string | null;
  onLocationChange: (location: string | null) => void;
}

const SUPPORTED_LOCATIONS = [
  { code: null, label: 'Auto-detect (from IP)', flag: '' },
  { code: 'GB', label: 'United Kingdom', flag: '' },
  { code: 'IN', label: 'India', flag: '' },
  { code: 'US', label: 'United States', flag: '' },
  { code: 'AU', label: 'Australia', flag: '' },
];

export function LocationSelector({ selectedLocation, onLocationChange }: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentLocation = SUPPORTED_LOCATIONS.find(loc => loc.code === selectedLocation) || SUPPORTED_LOCATIONS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-aneya-navy/10 hover:bg-aneya-navy/20 rounded-lg text-sm font-medium text-aneya-navy transition-colors"
        title="Select location for clinical guidelines"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span>{currentLocation.flag} {selectedLocation ? currentLocation.label : 'Auto'}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-600 font-medium">Select Guidelines Region</p>
              <p className="text-xs text-gray-500">For testing different country guidelines</p>
            </div>
            <div className="py-1">
              {SUPPORTED_LOCATIONS.map((location) => (
                <button
                  key={location.code || 'auto'}
                  onClick={() => {
                    onLocationChange(location.code);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-aneya-teal/10 flex items-center gap-2 ${
                    selectedLocation === location.code ? 'bg-aneya-teal/20 text-aneya-teal font-medium' : 'text-gray-700'
                  }`}
                >
                  <span className="text-base">{location.flag}</span>
                  <span>{location.label}</span>
                  {selectedLocation === location.code && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-auto text-aneya-teal"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
