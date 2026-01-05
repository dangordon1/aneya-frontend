import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

interface CustomFormLibraryProps {
  onEditForm?: (form: CustomForm) => void;
}

export function CustomFormLibrary({ onEditForm }: CustomFormLibraryProps = {}) {
  const { session, doctorProfile } = useAuth();
  const [publicForms, setPublicForms] = useState<CustomForm[]>([]);
  const [myForms, setMyForms] = useState<CustomForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewingFormId, setPreviewingFormId] = useState<string | null>(null);
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [sharingFormId, setSharingFormId] = useState<string | null>(null);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  useEffect(() => {
    loadForms();
  }, [doctorProfile?.specialty]);

  const loadForms = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Fetch public forms for doctor's specialty
      const specialty = doctorProfile?.specialty || 'general';

      const [publicResponse, myResponse] = await Promise.all([
        fetch(`${API_URL}/api/custom-forms/public-forms?specialty=${specialty}`, { headers }),
        fetch(`${API_URL}/api/custom-forms/my-forms`, { headers })
      ]);

      if (!publicResponse.ok || !myResponse.ok) {
        throw new Error('Failed to load forms');
      }

      const publicData = await publicResponse.json();
      const myData = await myResponse.json();

      setPublicForms(publicData);
      setMyForms(myData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (formId: string) => {
    setPreviewingFormId(formId);

    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_URL}/api/custom-forms/forms/${formId}/preview-pdf`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate preview');
      }

      // Get PDF blob and open in new tab
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Clean up the URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview form');
    } finally {
      setPreviewingFormId(null);
    }
  };

  const handleDelete = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    setDeletingFormId(formId);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_URL}/api/custom-forms/forms/${formId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete form');
      }

      // Reload forms to reflect changes
      await loadForms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete form');
    } finally {
      setDeletingFormId(null);
    }
  };

  const handleShare = async (formId: string) => {
    if (!confirm('Share this form with all doctors? Once shared, it will appear in the public form library.')) {
      return;
    }

    setSharingFormId(formId);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_URL}/api/custom-forms/forms/${formId}/share`, {
        method: 'PATCH',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to share form');
      }

      // Reload forms to reflect changes
      await loadForms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share form');
    } finally {
      setSharingFormId(null);
    }
  };

  const handleEdit = async (form: CustomForm) => {
    setEditingFormId(form.id);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Fetch full form details (including schema and pdf_template) using the GET endpoint
      const response = await fetch(`${API_URL}/api/custom-forms/forms/${form.id}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch form details');
      }

      const fullForm = await response.json();

      // Call the parent callback with full form data
      if (onEditForm) {
        onEditForm(fullForm);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load form for editing');
    } finally {
      setEditingFormId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getSpecialtyDisplayName = (specialty: string) => {
    const displayNames: { [key: string]: string } = {
      'cardiology': 'Cardiology',
      'neurology': 'Neurology',
      'pediatrics': 'Pediatrics',
      'orthopedics': 'Orthopedics',
      'dermatology': 'Dermatology',
      'psychiatry': 'Psychiatry',
      'internal_medicine': 'Internal Medicine',
      'emergency_medicine': 'Emergency Medicine',
      'surgery': 'Surgery',
      'obstetrics_gynecology': 'Obstetrics & Gynecology',
      'other': 'Other'
    };
    return displayNames[specialty] || specialty;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-aneya-teal" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600">Loading forms...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* My Forms Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-aneya-navy">My Forms</h3>
          <span className="text-sm text-gray-500">
            {publicForms.length + myForms.length} form{publicForms.length + myForms.length !== 1 ? 's' : ''}
          </span>
        </div>

        {publicForms.length === 0 && myForms.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 font-medium mb-1">No forms available</p>
            <p className="text-sm text-gray-500">Upload form images to create your first custom form</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Public Forms */}
            {publicForms.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-aneya-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Public Forms for {getSpecialtyDisplayName(doctorProfile?.specialty || 'general')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {publicForms.map(form => (
                    <div key={form.id} className="bg-gradient-to-br from-aneya-teal/5 to-aneya-navy/5 border border-aneya-teal/20 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h5 className="font-medium text-aneya-navy">{form.form_name.replace(/_/g, ' ')}</h5>
                          <p className="text-sm text-gray-500 mt-0.5">{getSpecialtyDisplayName(form.specialty)}</p>
                        </div>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                          Public
                        </span>
                      </div>

                      {form.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{form.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {form.field_count} fields
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                          {form.section_count} sections
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Forms */}
            {myForms.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Your Custom Forms
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myForms.map(form => (
              <div key={form.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-aneya-teal transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-aneya-navy">{form.form_name.replace(/_/g, ' ')}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">{getSpecialtyDisplayName(form.specialty)}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(form.status)}`}>
                    {form.status}
                  </span>
                </div>

                {form.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{form.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {form.field_count} fields
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    {form.section_count} sections
                  </span>
                </div>

                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Created {formatDate(form.created_at)}</span>
                    {form.is_public && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        Public
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(form.id)}
                      disabled={previewingFormId === form.id}
                      className="flex-1 px-3 py-1.5 border border-aneya-teal text-aneya-teal rounded text-xs font-medium hover:bg-aneya-teal hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {previewingFormId === form.id ? 'Loading...' : 'Preview PDF'}
                    </button>

                    <button
                      onClick={() => handleEdit(form)}
                      disabled={editingFormId === form.id}
                      className="flex-1 px-3 py-1.5 border border-gray-500 text-gray-700 rounded text-xs font-medium hover:bg-gray-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Edit form"
                    >
                      {editingFormId === form.id ? 'Loading...' : 'Edit'}
                    </button>

                    {!form.is_public && (
                      <button
                        onClick={() => handleShare(form.id)}
                        disabled={sharingFormId === form.id}
                        className="flex-1 px-3 py-1.5 border border-blue-500 text-blue-500 rounded text-xs font-medium hover:bg-blue-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Share with all doctors"
                      >
                        {sharingFormId === form.id ? 'Sharing...' : 'Share'}
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(form.id)}
                      disabled={deletingFormId === form.id}
                      className="px-3 py-1.5 border border-red-500 text-red-500 rounded text-xs font-medium hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete form"
                    >
                      {deletingFormId === form.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
