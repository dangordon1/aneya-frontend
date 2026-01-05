import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { UpdateDoctorInput, MedicalSpecialtyType } from '../../types/database';
import { MEDICAL_SPECIALTIES } from '../../types/database';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Get timezone from browser as fallback
const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Europe/London';
  }
};

export function DoctorProfileTab() {
  const { doctorProfile, refreshDoctorProfile, getIdToken } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);
  const hasAttemptedGeoDetection = useRef(false);

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    specialty: MedicalSpecialtyType;
    clinic_name: string;
    clinic_address: string;
    default_appointment_duration: number;
    timezone: string;
    allow_patient_messages: boolean;
  }>({
    name: '',
    email: '',
    phone: '',
    specialty: 'general',
    clinic_name: '',
    clinic_address: '',
    default_appointment_duration: 15,
    timezone: 'Europe/London',
    allow_patient_messages: true,
  });

  // Fetch timezone from backend geolocation API - only if doctor hasn't set one yet
  useEffect(() => {
    const fetchTimezoneFromIP = async () => {
      // Only fetch if doctor profile exists and timezone is not already set
      if (!doctorProfile || doctorProfile.timezone || hasAttemptedGeoDetection.current) {
        return;
      }

      hasAttemptedGeoDetection.current = true;

      try {
        const response = await fetchWithTimeout(
          `${API_URL}/api/geolocation`,
          {},
          5000  // 5 second timeout
        );
        if (response.ok) {
          const data = await response.json();
          if (data.timezone) {
            setDetectedTimezone(data.timezone);
            // Auto-set the form data with detected timezone
            setFormData(prev => ({ ...prev, timezone: data.timezone }));
          }
        }
      } catch (err) {
        console.log('Geolocation detection failed or timed out, using browser timezone as fallback');
        console.log('Error details:', err instanceof Error ? err.message : 'Unknown error');
        // Fallback to browser timezone
        const browserTz = getBrowserTimezone();
        setDetectedTimezone(browserTz);
        setFormData(prev => ({ ...prev, timezone: browserTz }));
      }
    };

    fetchTimezoneFromIP();
  }, [doctorProfile]);

  useEffect(() => {
    if (doctorProfile) {
      // If doctor already has a timezone set, use it (no auto-detection)
      // If not, use detected timezone or browser fallback
      const timezone = doctorProfile.timezone || detectedTimezone || getBrowserTimezone();
      setFormData({
        name: doctorProfile.name || '',
        email: doctorProfile.email || '',
        phone: doctorProfile.phone || '',
        specialty: doctorProfile.specialty,
        clinic_name: doctorProfile.clinic_name || '',
        clinic_address: doctorProfile.clinic_address || '',
        default_appointment_duration: doctorProfile.default_appointment_duration || 15,
        timezone,
        allow_patient_messages: doctorProfile.allow_patient_messages ?? true,
      });
    }
  }, [doctorProfile, detectedTimezone]);

  const handleSave = async () => {
    if (!doctorProfile?.id) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: UpdateDoctorInput = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        specialty: formData.specialty,
        clinic_name: formData.clinic_name.trim() || null,
        clinic_address: formData.clinic_address.trim() || null,
        default_appointment_duration: formData.default_appointment_duration,
        timezone: formData.timezone,
        allow_patient_messages: formData.allow_patient_messages,
      };

      const { error: updateError } = await supabase
        .from('doctors')
        .update(updateData)
        .eq('id', doctorProfile.id);

      if (updateError) throw updateError;

      // Refresh the doctor profile in the auth context
      if (refreshDoctorProfile) {
        await refreshDoctorProfile();
      }

      setSuccess('Profile updated successfully');
      // Stay in edit mode - don't call setIsEditing(false)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to current profile values
    if (doctorProfile) {
      const timezone = doctorProfile.timezone || detectedTimezone || getBrowserTimezone();
      setFormData({
        name: doctorProfile.name || '',
        email: doctorProfile.email || '',
        phone: doctorProfile.phone || '',
        specialty: doctorProfile.specialty,
        clinic_name: doctorProfile.clinic_name || '',
        clinic_address: doctorProfile.clinic_address || '',
        default_appointment_duration: doctorProfile.default_appointment_duration || 15,
        timezone,
        allow_patient_messages: doctorProfile.allow_patient_messages ?? true,
      });
    }
    // Stay in edit mode - don't call setIsEditing(false)
    setError(null);
    setSuccess(null);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload PNG, JPEG, or SVG file');
      return;
    }

    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('File must be less than 2MB');
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !doctorProfile) return;

    setUploadingLogo(true);
    setError('');

    try {
      // Get Firebase JWT token
      const token = await getIdToken();
      if (!token) {
        setError('Authentication required. Please sign in again.');
        setUploadingLogo(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', logoFile);

      const response = await fetch(
        `${API_URL}/api/doctor-logo/upload?doctor_id=${doctorProfile.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setLogoFile(null);
        setLogoPreview(null);
        if (refreshDoctorProfile) {
          await refreshDoctorProfile();
        }
        setSuccess('Logo uploaded successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || result.detail || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      setError('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!doctorProfile?.clinic_logo_url) return;
    if (!confirm('Are you sure you want to delete the clinic logo?')) return;

    setDeletingLogo(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/api/doctor-logo/delete?doctor_id=${doctorProfile.id}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        if (refreshDoctorProfile) {
          await refreshDoctorProfile();
        }
        setSuccess('Logo deleted successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Failed to delete logo');
      }
    } catch (error) {
      console.error('Logo delete error:', error);
      setError('Failed to delete logo. Please try again.');
    } finally {
      setDeletingLogo(false);
    }
  };

  if (!doctorProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white rounded-[20px] shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal mx-auto mb-4"></div>
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[24px] text-aneya-navy font-semibold">My Details</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your profile and contact preferences</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Personal Information Section */}
          <div>
            <h3 className="text-lg font-medium text-aneya-navy mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="Dr. John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="doctor@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                <select
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value as MedicalSpecialtyType })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                >
                  {MEDICAL_SPECIALTIES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Your specialty determines which forms patients see
                </p>
              </div>
            </div>
          </div>

          {/* Clinic Information Section */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-aneya-navy mb-4">Clinic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic/Hospital Name</label>
                <input
                  type="text"
                  value={formData.clinic_name}
                  onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="City Medical Centre"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Address</label>
                <textarea
                  value={formData.clinic_address}
                  onChange={(e) => setFormData({ ...formData, clinic_address: e.target.value })}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                  placeholder="123 Medical Street, London, UK"
                />
              </div>

              {/* Clinic Logo Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinic Logo
                </label>

                {/* Current Logo Display */}
                {doctorProfile?.clinic_logo_url && !logoPreview && (
                  <div className="mb-3 p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={doctorProfile.clinic_logo_url}
                          alt="Clinic logo"
                          className="h-16 max-w-[200px] object-contain"
                        />
                        <span className="text-sm text-gray-600">Current logo</span>
                      </div>
                      <button
                        onClick={handleLogoDelete}
                        disabled={deletingLogo}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingLogo ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Preview */}
                {logoPreview && (
                  <div className="mb-3 p-4 border-2 border-aneya-teal rounded-lg bg-aneya-teal/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-16 max-w-[200px] object-contain"
                        />
                        <span className="text-sm text-aneya-teal font-medium">
                          Preview
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview(null);
                        }}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Controls */}
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="clinic-logo-input"
                    accept=".png,.jpg,.jpeg,.svg"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="clinic-logo-input"
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg cursor-pointer hover:border-aneya-teal hover:text-aneya-teal transition-colors text-sm"
                  >
                    Choose Logo
                  </label>

                  {logoFile && (
                    <button
                      onClick={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="px-4 py-2 bg-aneya-teal text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                      {uploadingLogo && (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                      )}
                      {uploadingLogo ? 'Uploading...' : 'Upload'}
                    </button>
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  PNG, JPEG, or SVG. Max 2MB. Logo will appear on consultation PDFs.
                </p>
              </div>
            </div>
          </div>

          {/* Appointment Settings Section */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-aneya-navy mb-4">Appointment Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Appointment Duration</label>
                <select
                  value={formData.default_appointment_duration}
                  onChange={(e) => setFormData({ ...formData, default_appointment_duration: Number(e.target.value) })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                >
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                  {/* Show auto-detected badge only when timezone was detected and doctor hasn't saved one yet */}
                  {detectedTimezone && !doctorProfile?.timezone && formData.timezone === detectedTimezone && (
                    <span className="ml-2 text-xs text-aneya-teal font-normal">(auto-detected from IP)</span>
                  )}
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
                >
                  {/* Add detected timezone if it's not in the standard list */}
                  {detectedTimezone && ![
                    'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles',
                    'America/Chicago', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore',
                    'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland'
                  ].includes(detectedTimezone) && (
                    <option value={detectedTimezone}>{detectedTimezone} (detected)</option>
                  )}
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="America/New_York">America/New York (EST)</option>
                  <option value="America/Chicago">America/Chicago (CST)</option>
                  <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                  <option value="Pacific/Auckland">Pacific/Auckland (NZST)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Preferences Section */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-aneya-navy mb-4">Contact Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="allow_patient_messages"
                  checked={formData.allow_patient_messages}
                  onChange={(e) => setFormData({ ...formData, allow_patient_messages: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-aneya-teal focus:ring-aneya-teal"
                />
                <div>
                  <label htmlFor="allow_patient_messages" className="text-sm font-medium text-gray-700">
                    Allow patients to message me first
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    When enabled, patients can initiate conversations with you. When disabled, only you can start new conversations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !formData.name.trim() || !formData.email.trim()}
                className="px-6 py-2.5 bg-aneya-navy text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
