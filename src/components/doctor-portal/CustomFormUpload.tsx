import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SchemaReviewEditor } from './SchemaReviewEditor';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type UploadState = 'input' | 'uploading' | 'reviewing' | 'complete';

interface ExtractionResult {
  success: boolean;
  form_name: string;
  specialty: string;
  form_schema: Record<string, any>;
  pdf_template: Record<string, any>;
  metadata: Record<string, any>;
  error?: string;
}

interface ExtractedData {
  form_id?: string;
  form_name: string;
  specialty: string;
  form_schema: Record<string, any>;
  pdf_template: Record<string, any>;
  description?: string;
  patient_criteria?: string;
  is_public: boolean;
  metadata?: Record<string, any>;  // Includes logo_info with logo_url
  logo_info?: {
    has_logo: boolean;
    logo_position?: string;
    logo_description?: string;
    facility_name?: string;
    logo_url?: string;  // URL to extracted and uploaded logo
  };
}

interface CustomForm {
  id: string;
  form_name: string;
  specialty: string;
  description?: string;
  patient_criteria?: string;
  is_public: boolean;
  form_schema?: Record<string, any>;
  pdf_template?: Record<string, any>;
}

interface CustomFormUploadProps {
  onFormSaved?: () => void;
  editingForm?: CustomForm | null;
}

export function CustomFormUpload({ onFormSaved, editingForm }: CustomFormUploadProps) {
  const { session, getIdToken } = useAuth();
  const [uploadState, setUploadState] = useState<UploadState>('input');
  const [files, setFiles] = useState<File[]>([]);
  const [formName, setFormName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle editing existing form
  useEffect(() => {
    if (editingForm) {
      // Populate the review screen with existing form data
      setExtractedData({
        form_id: editingForm.id,
        form_name: editingForm.form_name,
        specialty: editingForm.specialty,
        form_schema: editingForm.form_schema || {},
        pdf_template: editingForm.pdf_template || {},
        description: editingForm.description,
        patient_criteria: editingForm.patient_criteria,
        is_public: editingForm.is_public
      });
      setUploadState('reviewing');
    }
  }, [editingForm]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);

      // Validate file count
      if (fileList.length < 2) {
        setError('Please select at least 2 images');
        return;
      }
      if (fileList.length > 10) {
        setError('Maximum 10 images allowed');
        return;
      }

      // Validate file sizes
      const oversizedFiles = fileList.filter(f => f.size > 10 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        setError(`Some files exceed 10MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }

      setFiles(fileList);
      setError(null);
    }
  };

  const handleUpload = async () => {
    // Prevent duplicate submissions
    if (uploadState === 'uploading') {
      return;
    }

    // Validate inputs
    if (!formName.trim()) {
      setError('Form name is required');
      return;
    }

    if (!specialty) {
      setError('Please select a specialty');
      return;
    }

    if (files.length < 2) {
      setError('Please select at least 2 images');
      return;
    }

    // Validate form name format (snake_case)
    if (!/^[a-z0-9_]+$/.test(formName)) {
      setError('Form name must be in snake_case (lowercase letters, numbers, underscores only)');
      return;
    }

    setUploadState('uploading');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('form_name', formName.toLowerCase());
      formData.append('specialty', specialty);
      formData.append('description', description);
      formData.append('is_public', isPublic.toString());

      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${API_URL}/api/custom-forms/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          // Add auth token if available
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        }
      });

      const result: ExtractionResult = await response.json();

      if (result.success) {
        // ✅ VALIDATE SCHEMA IS NOT EMPTY
        if (!result.form_schema || typeof result.form_schema !== 'object') {
          setError('Backend returned invalid schema - not an object. Please try again with different images.');
          setUploadState('input');
          return;
        }

        const schemaKeys = Object.keys(result.form_schema);
        if (schemaKeys.length === 0) {
          setError(
            'Form extraction failed: No fields detected in the uploaded images.\n\n' +
            'Troubleshooting:\n' +
            '• Ensure images are clear and high resolution\n' +
            '• Check that form fields are visible in the images\n' +
            '• Verify images are not corrupted\n' +
            '• Try uploading images in a different format (JPG/PNG)'
          );
          setUploadState('input');
          return;
        }

        // Show warning if very few fields
        if (schemaKeys.length < 3) {
          console.warn(`⚠️  Only ${schemaKeys.length} fields extracted - this seems low`);
        }

        console.log(`✅ Extracted ${schemaKeys.length} fields from form images`);

        // CHANGED: Show review screen instead of success
        setExtractedData({
          form_name: formName,
          specialty: specialty,
          form_schema: result.form_schema,
          pdf_template: result.pdf_template,
          description: description,
          patient_criteria: result.patient_criteria,
          is_public: isPublic,
          metadata: result.metadata,  // Include full metadata
          logo_info: result.metadata?.logo_info
        });
        setUploadState('reviewing');
      } else {
        setError(result.error || 'Upload failed');
        setUploadState('input');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setUploadState('input');
    }
  };

  const handleSave = async (
    schema: any,
    pdfTemplate: any,
    metadata: { formName: string; specialty: string; description?: string; patientCriteria?: string; isPublic: boolean }
  ) => {
    // ✅ VALIDATE SCHEMA BEFORE SAVING
    if (!schema || typeof schema !== 'object') {
      setError('Invalid schema format - cannot save');
      return;
    }

    const fieldCount = Object.keys(schema).length;
    if (fieldCount === 0) {
      setError(
        'Cannot save form with no fields. ' +
        'Please ensure the schema contains at least one field definition.'
      );
      return;
    }

    // Warn if suspiciously few fields
    if (fieldCount < 5) {
      const confirm = window.confirm(
        `This form only has ${fieldCount} fields. This seems unusually low. ` +
        `Are you sure you want to save?`
      );
      if (!confirm) return;
    }

    console.log(`💾 Saving form with ${fieldCount} fields`);

    const makeRequest = async (token: string) => {
      const isEditing = !!extractedData?.form_id;
      const url = isEditing
        ? `${API_URL}/api/custom-forms/forms/${extractedData!.form_id}`
        : `${API_URL}/api/custom-forms/save`;
      const method = isEditing ? 'PUT' : 'POST';

      return fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          form_name: metadata.formName,
          specialty: metadata.specialty,
          form_schema: schema,
          pdf_template: pdfTemplate,
          description: metadata.description,
          patient_criteria: metadata.patientCriteria,
          is_public: metadata.isPublic,
          metadata: extractedData?.metadata  // Include metadata with logo_info and logo_url
        })
      });
    };

    try {
      // Get fresh token (Firebase SDK will auto-refresh if expired)
      const token = await getIdToken();
      if (!token) {
        throw new Error('Authentication required. Please sign in again.');
      }

      let response = await makeRequest(token);

      // If 401, token might have expired between getIdToken and request
      // Force refresh and retry once
      if (response.status === 401) {
        console.log('🔄 Token expired, forcing refresh and retrying...');
        const freshToken = await getIdToken(true); // Force refresh
        if (!freshToken) {
          throw new Error('Authentication required. Please sign in again.');
        }
        response = await makeRequest(freshToken);
      }

      if (response.ok) {
        setUploadState('complete');
        // Reset form
        setFiles([]);
        setFormName('');
        setSpecialty('');
        setDescription('');
        setIsPublic(false);
        setExtractedData(null);

        // Reset file input
        const fileInput = document.getElementById('form-images') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        // Notify parent to refresh form list
        onFormSaved?.();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save form');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save form. Please try again.');
      throw err; // Re-throw so SchemaReviewEditor knows it failed
    }
  };

  const handleCancel = () => {
    setUploadState('input');
    setExtractedData(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Reviewing State - Show Schema Editor */}
      {uploadState === 'reviewing' && extractedData && (
        <SchemaReviewEditor
          formName={extractedData.form_name}
          specialty={extractedData.specialty}
          initialSchema={extractedData.form_schema}
          initialPdfTemplate={extractedData.pdf_template}
          description={extractedData.description}
          patientCriteria={extractedData.patient_criteria}
          isPublic={extractedData.is_public}
          logoInfo={extractedData.logo_info}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {/* Complete State - Success Message */}
      {uploadState === 'complete' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-green-900">Form Saved Successfully!</h4>
              <p className="text-sm text-green-700 mt-1">
                Your custom form has been saved as a draft. Review it in "My Forms" and activate it when ready.
              </p>
              <button
                onClick={() => setUploadState('input')}
                className="mt-3 px-4 py-2 bg-aneya-navy text-white rounded-lg text-sm hover:bg-opacity-90"
              >
                Upload Another Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input or Uploading State - Show Upload Form */}
      {(uploadState === 'input' || uploadState === 'uploading') && (
        <>
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

          {/* Uploading Progress Message */}
          {uploadState === 'uploading' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-blue-900">AI Analysis in Progress</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Extracting form schema and PDF layout from your images. This typically takes 30-90 seconds.
                  </p>
                </div>
              </div>
            </div>
          )}

      {/* Form Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Form Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="e.g., neurology_assessment"
          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          disabled={uploadState === 'uploading'}
        />
        <p className="text-xs text-gray-500 mt-1">
          Use snake_case (lowercase letters, numbers, underscores only)
        </p>
      </div>

      {/* Specialty */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Specialty <span className="text-red-500">*</span>
        </label>
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          disabled={uploadState === 'uploading'}
        >
          <option value="">Select specialty...</option>
          <option value="cardiology">Cardiology</option>
          <option value="neurology">Neurology</option>
          <option value="pediatrics">Pediatrics</option>
          <option value="orthopedics">Orthopedics</option>
          <option value="dermatology">Dermatology</option>
          <option value="psychiatry">Psychiatry</option>
          <option value="internal_medicine">Internal Medicine</option>
          <option value="emergency_medicine">Emergency Medicine</option>
          <option value="surgery">Surgery</option>
          <option value="obstetrics_gynecology">Obstetrics & Gynecology</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of what this form is used for..."
          rows={3}
          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-aneya-teal focus:border-transparent"
          disabled={uploadState === 'uploading'}
        />
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Form Images <span className="text-red-500">*</span>
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-aneya-teal transition-colors">
          <input
            id="form-images"
            type="file"
            multiple
            accept=".heic,.jpg,.jpeg,.png,.HEIC,.JPG,.JPEG,.PNG"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploadState === 'uploading'}
          />
          <label
            htmlFor="form-images"
            className="cursor-pointer flex flex-col items-center"
          >
            <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600 font-medium">Click to upload form images</p>
            <p className="text-xs text-gray-500 mt-1">HEIC, JPEG, or PNG (2-10 images, max 10MB each)</p>
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {files.length} file{files.length > 1 ? 's' : ''} selected:
            </p>
            <div className="space-y-1">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{file.name}</span>
                  <span className="text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Public Sharing */}
      <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
        <input
          type="checkbox"
          id="is_public"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-aneya-teal focus:ring-aneya-teal"
          disabled={uploadState === 'uploading'}
        />
        <div>
          <label htmlFor="is_public" className="text-sm font-medium text-gray-700">
            Make this form public
          </label>
          <p className="text-xs text-gray-500 mt-0.5">
            Allow other doctors to discover and use this form template
          </p>
        </div>
      </div>

      {/* Upload Button */}
      <div className="flex gap-3 justify-end pt-4">
        <button
          onClick={handleUpload}
          disabled={!formName || !specialty || files.length < 2 || uploadState === 'uploading'}
          className="px-6 py-3 bg-aneya-navy text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {uploadState === 'uploading' ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload & Extract Form
            </>
          )}
        </button>
      </div>
        </>
      )}
    </div>
  );
}
