import { CustomFormsSection } from './CustomFormsSection';

export function CustomFormsTab() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[24px] text-aneya-navy font-semibold">My Forms</h2>
          <p className="text-sm text-gray-500 mt-1">Upload and manage your specialty-specific consultation forms</p>
        </div>

        {/* Forms Content */}
        <div className="p-6">
          <CustomFormsSection />
        </div>
      </div>
    </div>
  );
}
