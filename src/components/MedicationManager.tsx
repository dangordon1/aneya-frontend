import React, { useState, useEffect } from 'react';
import { usePatientMedications } from '../hooks/usePatientMedications';

interface MedicationManagerProps {
  patientId: string;
  readOnly?: boolean;
}

export const MedicationManager: React.FC<MedicationManagerProps> = ({
  patientId,
  readOnly = false,
}) => {
  const { medications, loading, error, createMedication, updateMedication, getMedications } = usePatientMedications();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    route: '',
    indication: '',
    notes: '',
  });

  useEffect(() => {
    if (patientId) {
      getMedications(patientId, 'active');
    }
  }, [patientId, getMedications]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.medication_name || !formData.dosage || !formData.frequency) {
      return;
    }

    const result = await createMedication({
      patient_id: patientId,
      ...formData,
      status: 'active',
    });

    if (result) {
      // Reset form
      setFormData({
        medication_name: '',
        dosage: '',
        frequency: '',
        route: '',
        indication: '',
        notes: '',
      });
      setShowAddForm(false);
    }
  };

  const handleStopMedication = async (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    await updateMedication(id, {
      stopped_date: today,
      status: 'stopped',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-aneya-navy">Current Medications</h3>
        {!readOnly && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 text-sm bg-aneya-teal text-white rounded-md hover:bg-aneya-teal/90 transition-colors"
          >
            {showAddForm ? 'Cancel' : '+ Add Medication'}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Add Medication Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Add New Medication</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="medication_name"
                  value={formData.medication_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Metformin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosage <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 500mg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Twice daily"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route
                </label>
                <select
                  name="route"
                  value={formData.route}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
                >
                  <option value="">Select route...</option>
                  <option value="Oral">Oral</option>
                  <option value="IV">Intravenous (IV)</option>
                  <option value="IM">Intramuscular (IM)</option>
                  <option value="SC">Subcutaneous (SC)</option>
                  <option value="Topical">Topical</option>
                  <option value="Inhaled">Inhaled</option>
                  <option value="Rectal">Rectal</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indication
                </label>
                <input
                  type="text"
                  name="indication"
                  value={formData.indication}
                  onChange={handleChange}
                  placeholder="e.g., Type 2 Diabetes"
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
                  placeholder="Additional instructions..."
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
                {loading ? 'Adding...' : 'Add Medication'}
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

      {/* Medications List */}
      {loading && medications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Loading medications...</div>
      ) : medications.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          No active medications recorded
        </div>
      ) : (
        <div className="space-y-3">
          {medications.map((med) => (
            <div
              key={med.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{med.medication_name}</h4>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Dosage:</span> {med.dosage}
                    </p>
                    <p>
                      <span className="font-medium">Frequency:</span> {med.frequency}
                    </p>
                    {med.route && (
                      <p>
                        <span className="font-medium">Route:</span> {med.route}
                      </p>
                    )}
                    {med.indication && (
                      <p>
                        <span className="font-medium">Indication:</span> {med.indication}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Started: {new Date(med.started_date).toLocaleDateString()}
                    </p>
                  </div>
                  {med.notes && (
                    <p className="mt-2 text-sm text-gray-600 italic">{med.notes}</p>
                  )}
                </div>

                {!readOnly && med.status === 'active' && (
                  <button
                    onClick={() => handleStopMedication(med.id)}
                    className="ml-4 px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Stop
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
