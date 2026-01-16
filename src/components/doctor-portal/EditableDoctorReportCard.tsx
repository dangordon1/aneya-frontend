/**
 * EditableDoctorReportCard
 *
 * Wrapper component that loads data from the backend, transforms it,
 * renders the DoctorReportCard component, and handles auto-saving.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DoctorReportCard, PatientData, PregnancyRecord } from '../doctor-report-card/DoctorReportCard';
import { transformBackendToReportCard, transformReportCardToBackend } from '../../utils/formDataTransformer';
import { supabase } from '../../lib/supabase';

interface EditableDoctorReportCardProps {
  appointmentId: string;
  patientId: string;
  formType: string;
  onFormComplete?: () => void;
  editable?: boolean;
}

export function EditableDoctorReportCard({
  appointmentId,
  patientId,
  formType,
  editable = true
}: EditableDoctorReportCardProps) {
  const componentId = useRef(Math.random().toString(36).substr(2, 9));

  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [pregnancyHistory, setPregnancyHistory] = useState<PregnancyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formId, setFormId] = useState<string | null>(null);

  console.log(`🆔 EditableDoctorReportCard instance ${componentId.current} - isLoading: ${isLoading}`);

  // Ref to track if component is mounted (for cleanup)
  const isMountedRef = useRef(true);

  // Ref to store the debounce timer
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load patient and consultation form data from Supabase
   */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`🔍 [${componentId.current}] Loading data for appointment`, appointmentId);

      // Fetch appointment data with patient join using Supabase
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*, patient:patients(*)')
        .eq('id', appointmentId)
        .single();

      console.log('📦 Appointment data:', appointment);
      console.log('❌ Appointment error:', appointmentError);

      if (appointmentError) {
        throw new Error(`Failed to load appointment: ${appointmentError.message}`);
      }

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Extract patient info from appointment
      const patientInfo = appointment.patient || {
        name: '',
        patient_id: patientId,
        address: '',
        date_of_birth: ''
      };

      console.log('👤 Patient info:', patientInfo);

      // Fetch existing consultation form data using Supabase
      const { data: formData, error: formError } = await supabase
        .from('consultation_forms')
        .select('id, form_data, form_type')
        .eq('appointment_id', appointmentId)
        .eq('form_type', formType)
        .maybeSingle();

      console.log('📋 Form data:', formData);
      console.log('❌ Form error:', formError);

      // Use form data if it exists, otherwise null for new forms
      const backendFormData = formData?.form_data || null;

      console.log('🔄 Backend form data:', backendFormData);

      // Transform backend data to DoctorReportCard format
      const transformed = transformBackendToReportCard(backendFormData, patientInfo);

      console.log('✅ Transformed data:', transformed);

      if (isMountedRef.current) {
        console.log('🎯 Setting state and hiding loading...');
        setPatientData(transformed.patientData);
        setPregnancyHistory(transformed.pregnancyHistory);
        setFormId(formData?.id || null);
        setIsLoading(false);
        console.log('✅ State updated, loading should be false now');
      } else {
        console.log('⚠️ Component unmounted, skipping state update');
      }
    } catch (err) {
      console.error('❌ Error loading consultation form data:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setIsLoading(false);
      }
    }
  }, [appointmentId, patientId, formType]);

  /**
   * Save form data to backend using Supabase
   */
  const saveData = useCallback(async (data: { patientData: PatientData; pregnancyHistory: PregnancyRecord[] }) => {
    try {
      setIsSaving(true);

      // Transform DoctorReportCard format back to backend JSONB
      const backendData = transformReportCardToBackend(data.patientData, data.pregnancyHistory);

      console.log('💾 Saving form data:', { formId, backendData });

      if (formId) {
        // Update existing form
        const { data: updatedForm, error: updateError } = await supabase
          .from('consultation_forms')
          .update({
            form_data: backendData,
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', formId)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to update form: ${updateError.message}`);
        }

        console.log('✅ Form updated:', updatedForm);
      } else {
        // Create new form
        const { data: newForm, error: createError } = await supabase
          .from('consultation_forms')
          .insert({
            appointment_id: appointmentId,
            patient_id: patientId,
            form_type: formType,
            form_data: backendData,
            status: 'in_progress'
          })
          .select()
          .single();

        if (createError) {
          throw new Error(`Failed to create form: ${createError.message}`);
        }

        console.log('✅ Form created:', newForm);

        // Store the new form ID for future updates
        if (isMountedRef.current) {
          setFormId(newForm.id);
        }
      }

      if (isMountedRef.current) {
        setIsSaving(false);
      }
    } catch (err) {
      console.error('❌ Error saving consultation form:', err);
      if (isMountedRef.current) {
        setIsSaving(false);
        setError(err instanceof Error ? err.message : 'Failed to save data');
      }
    }
  }, [appointmentId, patientId, formType, formId]);

  /**
   * Debounced save function - auto-save 2 seconds after last change
   */
  const debouncedSave = useCallback((data: { patientData: PatientData; pregnancyHistory: PregnancyRecord[] }) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      saveData(data);
    }, 2000); // 2 second debounce
  }, [saveData]);

  /**
   * Handle changes from DoctorReportCard component
   */
  const handleChange = useCallback((data: { patientData: PatientData; pregnancyHistory: PregnancyRecord[] }) => {
    setPatientData(data.patientData);
    setPregnancyHistory(data.pregnancyHistory);

    // Auto-save if editable
    if (editable) {
      debouncedSave(data);
    }
  }, [editable, debouncedSave]);

  /**
   * Load data on mount
   */
  useEffect(() => {
    // Reset mounted flag when effect runs (handles StrictMode remounts)
    isMountedRef.current = true;

    loadData();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [appointmentId, patientId, formType]); // Only reload if these change

  /**
   * TODO: Subscribe to diarization events for auto-fill
   * This would listen for consultationEventBus and populate fields
   * based on transcription analysis
   */
  useEffect(() => {
    // Placeholder for diarization event subscription
    // const handleDiarizationEvent = (event: any) => {
    //   // Map event data to DoctorReportCard fields
    //   // Update patientData state
    // };
    //
    // consultationEventBus.on('diarization', handleDiarizationEvent);
    //
    // return () => {
    //   consultationEventBus.off('diarization', handleDiarizationEvent);
    // };
  }, []);

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--medical-teal)] border-r-transparent"></div>
          <p className="mt-4 text-[var(--medical-navy)]">Loading consultation form...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Form</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  /**
   * Render DoctorReportCard
   */
  if (!patientData) {
    return null;
  }

  return (
    <div className="relative">
      {/* Saving indicator */}
      {isSaving && editable && (
        <div className="fixed top-4 right-4 bg-[var(--medical-teal)] text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
          <span>Saving...</span>
        </div>
      )}

      {/* DoctorReportCard component */}
      <DoctorReportCard
        patientData={patientData}
        pregnancyHistory={pregnancyHistory}
        editable={editable}
        onChange={handleChange}
      />
    </div>
  );
}
