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
}

interface AddFormModalProps {
  onClose: () => void;
  onFormAdded: () => void;
}

export function AddFormModal({ onClose, onFormAdded }: AddFormModalProps) {
  const { getIdToken, doctorProfile } = useAuth();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [specialty, setSpecialty] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adoptingFormId, setAdoptingFormId] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableForms();
  }, [specialty, doctorProfile?.specialty]);

  const fetchAvailableForms = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get token (Firebase automatically refreshes if expired)
      const token = await getIdToken();

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params = new URLSearchParams();
      if (specialty) {
        params.append('specialty', specialty);
      }
      if (search) {
        params.append('search', search);
      }

      const response = await fetch(
        `${API_URL}/api/custom-forms/forms/browse?${params}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Failed to load available forms');
      }

      const data = await response.json();
      setForms(data.forms || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchAvailableForms();
  };

  const handleAdoptForm = async (formId: string) => {
    setAdoptingFormId(formId);
    setError(null);

    try {
      // Get token (Firebase automatically refreshes if expired)
      const token = await getIdToken();

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_URL}/api/custom-forms/forms/${formId}/adopt`,
        {
          method: 'POST',
          headers
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add form');
      }

      // Refresh available forms list and notify parent
      await fetchAvailableForms();
      onFormAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add form');
    } finally {
      setAdoptingFormId(null);
    }
  };

  const getSpecialtyDisplayName = (spec: string) => {
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
    return displayNames[spec] || spec;
  };

  const specialties = [
    'cardiology',
    'neurology',
    'pediatrics',
    'orthopedics',
    'dermatology',
    'psychiatry',
    'internal_medicine',
    'emergency_medicine',
    'surgery',
    'obstetrics_gynecology',
    'other'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-aneya-navy">Add Form to Library</h2>
            <p className="text-sm text-gray-500 mt-1">Browse and add public forms to your personal library</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-aneya-teal"
              >
                <option value="">All Specialties</option>
                {specialties.map(spec => (
                  <option key={spec} value={spec}>
                    {getSpecialtyDisplayName(spec)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search form name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-aneya-teal"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-aneya-teal text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Forms List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-6 w-6 text-aneya-teal" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-600">Loading forms...</span>
              </div>
            </div>
          ) : forms.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 font-medium mb-1">No forms available</p>
              <p className="text-sm text-gray-500">All public forms are already in your library</p>
            </div>
          ) : (
            <div className="space-y-3">
              {forms.map(form => (
                <div key={form.id} className="border border-gray-200 rounded-lg p-4 hover:border-aneya-teal transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-aneya-navy">{form.form_name.replace(/_/g, ' ')}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">{getSpecialtyDisplayName(form.specialty)}</p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          Public
                        </span>
                      </div>

                      {form.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{form.description}</p>
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

                    <button
                      onClick={() => handleAdoptForm(form.id)}
                      disabled={adoptingFormId === form.id}
                      className="px-4 py-2 bg-aneya-teal text-white rounded-lg hover:bg-opacity-90 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {adoptingFormId === form.id ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Adding...
                        </span>
                      ) : (
                        'Add'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
