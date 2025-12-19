import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CONSULTATION_LANGUAGES, type ConsultationLanguage } from '../../types/database';

interface Props {
  onBack: () => void;
}

export function PatientProfileForm({ onBack }: Props) {
  const { patientProfile, refreshProfiles } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    sex: 'Other' as 'Male' | 'Female' | 'Other',
    date_of_birth: '',
    phone: '',
    height_cm: '',
    weight_kg: '',
    current_medications: '',
    current_conditions: '',
    allergies: '',
    consultation_language: 'en-IN' as ConsultationLanguage
  });

  useEffect(() => {
    if (patientProfile) {
      setFormData({
        name: patientProfile.name || '',
        sex: patientProfile.sex || 'Other',
        date_of_birth: patientProfile.date_of_birth || '',
        phone: patientProfile.phone || '',
        height_cm: patientProfile.height_cm?.toString() || '',
        weight_kg: patientProfile.weight_kg?.toString() || '',
        current_medications: patientProfile.current_medications || '',
        current_conditions: patientProfile.current_conditions || '',
        allergies: patientProfile.allergies || '',
        consultation_language: patientProfile.consultation_language || 'en-IN'
      });
    }
  }, [patientProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientProfile?.id) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          name: formData.name.trim(),
          sex: formData.sex,
          date_of_birth: formData.date_of_birth,
          phone: formData.phone.trim() || null,
          height_cm: formData.height_cm ? Number(formData.height_cm) : null,
          weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
          current_medications: formData.current_medications.trim() || null,
          current_conditions: formData.current_conditions.trim() || null,
          allergies: formData.allergies.trim() || null,
          consultation_language: formData.consultation_language,
          updated_at: new Date().toISOString()
        })
        .eq('id', patientProfile.id);

      if (updateError) throw updateError;

      await refreshProfiles();
      setSuccessMessage('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-aneya-navy mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={e => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sex <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.sex}
                  onChange={e => setFormData(prev => ({ ...prev, sex: e.target.value as 'Male' | 'Female' | 'Other' }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Language
                </label>
                <select
                  value={formData.consultation_language}
                  onChange={e => setFormData(prev => ({ ...prev, consultation_language: e.target.value as ConsultationLanguage }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
                >
                  {CONSULTATION_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Physical Info */}
          <div>
            <h3 className="text-lg font-semibold text-aneya-navy mb-4">Physical Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={formData.height_cm}
                  onChange={e => setFormData(prev => ({ ...prev, height_cm: e.target.value }))}
                  placeholder="170"
                  min="50"
                  max="250"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={formData.weight_kg}
                  onChange={e => setFormData(prev => ({ ...prev, weight_kg: e.target.value }))}
                  placeholder="70"
                  min="20"
                  max="300"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
                />
              </div>
            </div>
          </div>

          {/* Medical Info */}
          <div>
            <h3 className="text-lg font-semibold text-aneya-navy mb-4">Medical Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Medications
                </label>
                <textarea
                  value={formData.current_medications}
                  onChange={e => setFormData(prev => ({ ...prev, current_medications: e.target.value }))}
                  placeholder="List any medications you are currently taking..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Medical Conditions
                </label>
                <textarea
                  value={formData.current_conditions}
                  onChange={e => setFormData(prev => ({ ...prev, current_conditions: e.target.value }))}
                  placeholder="List any diagnosed medical conditions..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allergies
                </label>
                <textarea
                  value={formData.allergies}
                  onChange={e => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
                  placeholder="List any known allergies (medications, food, etc.)..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-aneya-teal text-white rounded-lg hover:bg-aneya-teal/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
