import { useState } from 'react';
import { CustomFormUpload } from './CustomFormUpload';
import { CustomFormLibrary } from './CustomFormLibrary';

interface CustomForm {
  id: string;
  form_name: string;
  specialty: string;
  description?: string;
  field_count: number;
  section_count: number;
  status: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  form_schema?: Record<string, any>;
  pdf_template?: Record<string, any>;
}

export function CustomFormsSection() {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingForm, setEditingForm] = useState<CustomForm | null>(null);

  const handleFormSaved = () => {
    // Refresh the library and switch to it
    setRefreshKey(prev => prev + 1);
    setActiveTab('library');
    setEditingForm(null);
  };

  const handleFormEdit = (form: CustomForm) => {
    // Set the form to edit and switch to upload tab
    setEditingForm(form);
    setActiveTab('upload');
  };

  return (
    <div>
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
          onClick={() => {
            setActiveTab('library');
            setEditingForm(null);
          }}
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
          onClick={() => {
            setActiveTab('upload');
            setEditingForm(null);
          }}
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
        {activeTab === 'library' && (
          <CustomFormLibrary
            key={refreshKey}
            onEditForm={handleFormEdit}
          />
        )}
        {activeTab === 'upload' && (
          <CustomFormUpload
            onFormSaved={handleFormSaved}
            editingForm={editingForm}
          />
        )}
      </div>
    </div>
  );
}
