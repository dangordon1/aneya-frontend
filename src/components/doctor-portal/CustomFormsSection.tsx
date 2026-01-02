import { useState } from 'react';
import { CustomFormUpload } from './CustomFormUpload';
import { CustomFormLibrary } from './CustomFormLibrary';

export function CustomFormsSection() {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');

  return (
    <div className="pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-aneya-navy">Custom Forms</h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload and manage your specialty-specific forms
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('library')}
          className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
            activeTab === 'library'
              ? 'text-aneya-teal'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          My Forms
          {activeTab === 'library' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-aneya-teal"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
            activeTab === 'upload'
              ? 'text-aneya-teal'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload New Form
          {activeTab === 'upload' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-aneya-teal"></div>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'library' && <CustomFormLibrary />}
        {activeTab === 'upload' && <CustomFormUpload />}
      </div>
    </div>
  );
}
