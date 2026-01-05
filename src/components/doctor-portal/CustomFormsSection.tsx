import { useState } from 'react';
import { CustomFormUpload } from './CustomFormUpload';
import { CustomFormLibrary } from './CustomFormLibrary';
import { AddFormModal } from './AddFormModal';

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
  const [showAddFormModal, setShowAddFormModal] = useState(false);

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

  const handleFormAdded = () => {
    // Refresh the library to show newly added form
    setRefreshKey(prev => prev + 1);
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
      <div className="flex items-center justify-between mb-6 border-b border-gray-200">
        <div className="flex gap-4">
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

        {/* Add Form Button */}
        {activeTab === 'library' && (
          <button
            onClick={() => setShowAddFormModal(true)}
            className="mb-3 px-4 py-2 bg-aneya-teal text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Form
          </button>
        )}
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

      {/* Add Form Modal */}
      {showAddFormModal && (
        <AddFormModal
          onClose={() => setShowAddFormModal(false)}
          onFormAdded={handleFormAdded}
        />
      )}
    </div>
  );
}
