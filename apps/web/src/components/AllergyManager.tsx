import React, { useState, useEffect } from 'react';
import { usePatientAllergies } from '../hooks/usePatientAllergies';

interface AllergyManagerProps {
  patientId: string;
  readOnly?: boolean;
}

const severityColors = {
  mild: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  moderate: 'bg-orange-100 text-orange-800 border-orange-300',
  severe: 'bg-red-100 text-red-800 border-red-300',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300',
};

export const AllergyManager: React.FC<AllergyManagerProps> = ({
  patientId,
  readOnly = false,
}) => {
  const { allergies, loading, error, createAllergy, updateAllergy, getAllergies } = usePatientAllergies();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    allergen: '',
    allergen_category: '',
    reaction: '',
    severity: '',
    onset_date: '',
    notes: '',
  });

  useEffect(() => {
    if (patientId) {
      getAllergies(patientId, 'active');
    }
  }, [patientId, getAllergies]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.allergen) {
      return;
    }

    const result = await createAllergy({
      patient_id: patientId,
      allergen: formData.allergen,
      allergen_category: formData.allergen_category as any,
      reaction: formData.reaction || undefined,
      severity: formData.severity as any,
      onset_date: formData.onset_date || undefined,
      notes: formData.notes || undefined,
      status: 'active',
    });

    if (result) {
      // Reset form
      setFormData({
        allergen: '',
        allergen_category: '',
        reaction: '',
        severity: '',
        onset_date: '',
        notes: '',
      });
      setShowAddForm(false);
    }
  };

  const handleResolveAllergy = async (id: string) => {
    await updateAllergy(id, { status: 'resolved' });
    // Refresh list
    if (patientId) {
      getAllergies(patientId, 'active');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-aneya-navy">Allergies</h3>
        {!readOnly && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 text-sm bg-aneya-teal text-white rounded-md hover:bg-aneya-teal/90 transition-colors"
          >
            {showAddForm ? 'Cancel' : '+ Add Allergy'}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Add Allergy Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Add New Allergy</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allergen <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="allergen"
                  value={formData.allergen}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Penicillin, Peanuts"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="allergen_category"
                  value={formData.allergen_category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
                >
                  <option value="">Select category...</option>
                  <option value="medication">Medication</option>
                  <option value="food">Food</option>
                  <option value="environmental">Environmental</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
                >
                  <option value="">Select severity...</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reaction
                </label>
                <input
                  type="text"
                  name="reaction"
                  value={formData.reaction}
                  onChange={handleChange}
                  placeholder="e.g., Rash, difficulty breathing"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Onset Date
                </label>
                <input
                  type="date"
                  name="onset_date"
                  value={formData.onset_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Additional information..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-aneya-teal text-white rounded-md hover:bg-aneya-teal/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Adding...' : 'Add Allergy'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Allergies List */}
      {loading && allergies.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Loading allergies...</div>
      ) : allergies.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-green-50 rounded-lg border border-green-200">
          <svg className="w-12 h-12 mx-auto mb-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium text-green-900">No Known Allergies</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allergies.map((allergy) => (
            <div
              key={allergy.id}
              className={`rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow ${
                allergy.severity ? severityColors[allergy.severity] : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{allergy.allergen}</h4>
                    {allergy.severity && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${severityColors[allergy.severity]}`}>
                        {allergy.severity.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-gray-700">
                    {allergy.allergen_category && (
                      <p>
                        <span className="font-medium">Category:</span> {allergy.allergen_category}
                      </p>
                    )}
                    {allergy.reaction && (
                      <p>
                        <span className="font-medium">Reaction:</span> {allergy.reaction}
                      </p>
                    )}
                    {allergy.onset_date && (
                      <p className="text-xs text-gray-600">
                        First noted: {new Date(allergy.onset_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {allergy.notes && (
                    <p className="mt-2 text-sm text-gray-600 italic">{allergy.notes}</p>
                  )}
                </div>

                {!readOnly && allergy.status === 'active' && (
                  <button
                    onClick={() => handleResolveAllergy(allergy.id)}
                    className="ml-4 px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
