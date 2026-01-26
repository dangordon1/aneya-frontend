import { useState, useEffect, useMemo } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import { usePatients } from '../hooks/usePatients';
import { AppointmentWithPatient, Consultation, CreatePatientInput } from '../types/database';
import { AppointmentCard } from './AppointmentCard';
import { AppointmentFormModal } from './AppointmentFormModal';
import { PatientFormModal } from './PatientFormModal';
import { CompactCalendar } from './CompactCalendar';
import { FullCalendarModal } from './FullCalendarModal';
import { PastAppointmentCard } from './PastAppointmentCard';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import { DoctorAvailabilitySettings } from './doctor-portal/DoctorAvailabilitySettings';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getPatientAgeNumber } from '../utils/dateHelpers';

interface AppointmentsTabProps {
  onStartConsultation: (appointment: AppointmentWithPatient) => void;
  onAnalyzeConsultation?: (appointment: AppointmentWithPatient, consultation: Consultation) => void;
  onViewConsultationForm?: (appointment: AppointmentWithPatient, consultation: Consultation | null) => void;
}

export function AppointmentsTab({ onStartConsultation, onAnalyzeConsultation, onViewConsultationForm }: AppointmentsTabProps) {
  const { user, isAdmin, doctorProfile, getIdToken } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { appointments, loading, createAppointment, cancelAppointment, deleteAppointment } =
    useAppointments(selectedDate.toISOString().split('T')[0]);
  const { patients, createPatient } = usePatients();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithPatient | null>(null);
  const [preFilledDate, setPreFilledDate] = useState<Date | null>(null);

  // State for past appointments
  const [pastAppointments, setPastAppointments] = useState<AppointmentWithPatient[]>([]);
  const [pastAppointmentsLoading, setPastAppointmentsLoading] = useState(true);
  const [consultationsMap, setConsultationsMap] = useState<Record<string, Consultation>>({});
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<AppointmentWithPatient | null>(null);
  const [pastAppointmentsSearch, setPastAppointmentsSearch] = useState('');
  const [downloadingPrescriptionId, setDownloadingPrescriptionId] = useState<string | null>(null);

  // Filter past appointments based on search
  const filteredPastAppointments = useMemo(() => {
    if (!pastAppointmentsSearch.trim()) return pastAppointments;
    const search = pastAppointmentsSearch.toLowerCase();
    return pastAppointments.filter(apt =>
      apt.patient?.name?.toLowerCase().includes(search) ||
      apt.reason?.toLowerCase().includes(search) ||
      apt.appointment_type?.toLowerCase().includes(search) ||
      new Date(apt.scheduled_time).toLocaleDateString('en-GB').includes(search)
    );
  }, [pastAppointments, pastAppointmentsSearch]);

  const handleCreateAppointment = async (appointmentData: any) => {
    // Auto-assign the logged-in doctor to the appointment
    const appointmentWithDoctor = {
      ...appointmentData,
      doctor_id: doctorProfile?.id || null,
    };

    await createAppointment(appointmentWithDoctor);
    setIsFormModalOpen(false);
    setEditingAppointment(null);
    setPreFilledDate(null);
  };

  const handleModifyAppointment = (appointment: AppointmentWithPatient) => {
    setEditingAppointment(appointment);
    setIsFormModalOpen(true);
  };

  const handleCancelAppointment = async (appointment: AppointmentWithPatient) => {
    if (window.confirm(`Cancel appointment with ${appointment.patient?.name || 'this patient'}?`)) {
      await cancelAppointment(appointment.id);
    }
  };

  const handleCreateFromCalendar = (date: Date) => {
    setPreFilledDate(date);
    setIsFormModalOpen(true);
  };

  const handleCreatePatient = async (patientData: CreatePatientInput) => {
    const newPatient = await createPatient(patientData);
    if (newPatient) {
      setIsPatientModalOpen(false);
      // Reopen the appointment form after patient is created
      setIsFormModalOpen(true);
    }
  };

  // Helper function to extract form fields and update the appropriate form
  const extractAndFillForm = async (
    appointment: AppointmentWithPatient,
    consultation: Consultation,
    apiUrl: string
  ) => {
    try {
      console.log(`📋 Auto-filling form for consultation ${consultation.id}...`);

      // Get Firebase ID token for authentication
      const idToken = await getIdToken();
      if (!idToken) {
        throw new Error('Not authenticated - no ID token available');
      }

      // Prepare request body
      const requestBody = {
        consultation_id: consultation.id,
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        original_transcript: consultation.original_transcript || '',
        consultation_text: consultation.consultation_text || '',
        patient_snapshot: consultation.patient_snapshot || {}
      };

      // Call new backend endpoint with Authorization header
      const response = await fetch(`${apiUrl}/api/auto-fill-consultation-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('⚠️ Form auto-fill failed:', errorData.detail || response.statusText);
        return; // Don't throw - this shouldn't block re-summarize
      }

      const data = await response.json();

      if (data.success) {
        console.log(`✅ ${data.form_created ? 'Created' : 'Updated'} ${data.consultation_type} form`);
        console.log(`   Form ID: ${data.form_id}`);
        console.log(`   Confidence: ${(data.confidence * 100).toFixed(0)}%`);
        console.log(`   Fields extracted: ${Object.keys(data.field_updates).length}`);
        console.log(`   Reasoning: ${data.reasoning}`);

        // Optional: Show success notification
        // toast.success(`${data.consultation_type} form auto-filled`);
      } else {
        console.warn('⚠️ Form auto-fill unsuccessful:', data.error);
      }

    } catch (error) {
      console.error('❌ Error in form auto-fill:', error);
      // Don't throw - form filling failure shouldn't block re-summarize
    }
  };

  // Standalone form filling function (separate from re-summarize)
  const handleFillForm = async (appointment: AppointmentWithPatient, consultation: Consultation) => {
    if (!consultation || !appointment) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://aneya-backend-xao3xivzia-el.a.run.app';
      console.log('📋 Starting standalone form filling...');
      await extractAndFillForm(appointment, consultation, apiUrl);

      // Refetch fresh consultation data
      const { data: freshConsultation, error: refetchError } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', consultation.id)
        .single();

      if (!refetchError && freshConsultation) {
        const mapKey = freshConsultation.appointment_id || appointment.id;
        setConsultationsMap((prev) => ({
          ...prev,
          [mapKey]: freshConsultation
        }));
      }

      console.log('✅ Form filled successfully');
      alert('Form filled successfully! View the consultation form to see extracted data.');
    } catch (error) {
      console.error('Error filling form:', error);
      alert('Failed to fill form. Please try again.');
    }
  };

  const handleResummarize = async (appointment: AppointmentWithPatient, consultation: Consultation | null) => {
    if (!consultation) {
      console.error('No consultation to re-summarize');
      return;
    }

    try {
      // Get the API URL from environment variables
      const apiUrl = import.meta.env.VITE_API_URL || 'https://aneya-backend-xao3xivzia-el.a.run.app';

      // Prepare the request body
      const requestBody = {
        text: consultation.consultation_text || consultation.original_transcript || '',
        original_text: consultation.original_transcript,
        patient_info: consultation.patient_snapshot || {
          patient_id: appointment.patient_id,
          patient_age: appointment.patient && getPatientAgeNumber(appointment.patient)
            ? `${getPatientAgeNumber(appointment.patient)} years old`
            : 'Age unknown',
        },
        is_from_transcription: true,
        transcription_language: consultation.transcription_language || 'en'
      };

      // Call the backend summarize endpoint
      console.log('🔄 Re-summarizing consultation...');
      const response = await fetch(`${apiUrl}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Failed to re-summarize: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.consultation_data) {
        throw new Error('Invalid response from summarize endpoint');
      }

      // Extract form fields from consultation text
      console.log('📋 Extracting form fields from consultation...');
      await extractAndFillForm(appointment, consultation, apiUrl);

      // Update the consultation in the database
      const { error: updateError } = await supabase
        .from('consultations')
        .update({
          consultation_text: data.consultation_data.consultation_text,
          summary_data: data.consultation_data.summary_data,
          diagnoses: data.consultation_data.diagnoses,
          guidelines_found: data.consultation_data.guidelines_found,
          patient_snapshot: data.consultation_data.patient_snapshot,
        })
        .eq('id', consultation.id);

      if (updateError) {
        throw updateError;
      }

      // Refetch fresh consultation data to include detected_consultation_type and all updated fields
      console.log('🔄 Refetching fresh consultation data...');
      const { data: freshConsultation, error: refetchError } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', consultation.id)
        .single();

      if (refetchError) {
        console.error('⚠️  Error refetching consultation:', refetchError);
        // Fall back to manual state update
        setConsultationsMap((prev) => ({
          ...prev,
          [appointment.id]: {
            ...consultation,
            consultation_text: data.consultation_data.consultation_text,
            summary_data: data.consultation_data.summary_data,
            diagnoses: data.consultation_data.diagnoses,
            guidelines_found: data.consultation_data.guidelines_found,
            patient_snapshot: data.consultation_data.patient_snapshot,
          }
        }));
      } else if (freshConsultation) {
        // Update state with FRESH data including detected_consultation_type
        console.log('✅ Fresh consultation data retrieved with detected type:', freshConsultation.detected_consultation_type);
        console.log('   Consultation appointment_id:', freshConsultation.appointment_id);
        console.log('   Current appointment.id:', appointment.id);

        // Use the consultation's appointment_id as the key to ensure consistency
        const mapKey = freshConsultation.appointment_id || appointment.id;
        setConsultationsMap((prev) => ({
          ...prev,
          [mapKey]: freshConsultation
        }));
      }

      console.log('✅ Consultation re-summarized and form filled successfully');
    } catch (error) {
      console.error('Error re-summarizing consultation:', error);
      alert('Failed to re-summarize consultation. Please try again.');
    }
  };

  const handleResearchAnalysis = async (consultation: Consultation) => {
    if (!consultation) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://aneya-backend-xao3xivzia-el.a.run.app';

      console.log('🔬 Starting research paper analysis...');

      const response = await fetch(`${apiUrl}/api/analyze-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultation_id: consultation.id,
          include_guidelines: true,
          date_filter: 5,
          quartile_filter: "Q1-Q2"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to analyze research: ${response.statusText}`);
      }

      const data = await response.json();

      // Update the consultation in the database with research findings
      const { error: updateError } = await supabase
        .from('consultations')
        .update({
          research_findings: data.research_findings,
        })
        .eq('id', consultation.id);

      if (updateError) {
        throw updateError;
      }

      // Refetch fresh consultation data
      const { data: freshConsultation, error: refetchError } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', consultation.id)
        .single();

      if (refetchError) {
        console.error('⚠️  Error refetching consultation:', refetchError);
      } else if (freshConsultation && freshConsultation.appointment_id) {
        setConsultationsMap((prev) => ({
          ...prev,
          [freshConsultation.appointment_id]: freshConsultation
        }));
      }

      console.log('✅ Research analysis completed successfully');
      alert('Research analysis completed! View the consultation to see latest research findings.');
    } catch (error) {
      console.error('Error analyzing research:', error);
      alert('Failed to analyze research papers. Please try again.');
    }
  };

  const handleRerunTranscription = async (
    appointment: AppointmentWithPatient,
    consultation: Consultation,
    newTranscript: string
  ) => {
    try {
      // Update database
      const { error: updateError } = await supabase
        .from('consultations')
        .update({ original_transcript: newTranscript })
        .eq('id', consultation.id);

      if (updateError) throw updateError;

      // Update local state (triggers modal re-render)
      setConsultationsMap((prev) => ({
        ...prev,
        [appointment.id]: {
          ...consultation,
          original_transcript: newTranscript,
        }
      }));

      console.log('Consultation transcript updated successfully');
    } catch (error) {
      console.error('Error updating transcript:', error);
      alert('Failed to update transcript in database. Please try again.');
      throw error;
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    const success = await deleteAppointment(appointmentId);
    if (success) {
      // Remove from local state
      setPastAppointments(prev => prev.filter(apt => apt.id !== appointmentId));

      // Remove from consultations map
      setConsultationsMap(prev => {
        const updated = { ...prev };
        delete updated[appointmentId];
        return updated;
      });

      // Close modal
      setSelectedAppointmentDetail(null);
    }
  };

  const handleDownloadPrescription = async (consultationId: string) => {
    setDownloadingPrescriptionId(consultationId);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://aneya-backend-xao3xivzia-el.a.run.app';
      const response = await fetch(`${apiUrl}/api/consultations/${consultationId}/prescription-pdf`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || 'Failed to generate prescription PDF');
      }

      // Get the blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prescription_${consultationId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error downloading prescription:', error);
      alert(`Failed to download prescription: ${error.message}`);
    } finally {
      setDownloadingPrescriptionId(null);
    }
  };

  // Fetch past appointments (completed or cancelled) - NON-BLOCKING
  useEffect(() => {
    const fetchPastAppointments = async () => {
      if (!user || loading) {
        // Wait for current appointments to finish loading first
        return;
      }

      try {
        // TIME: Fetch completed appointments (excluding cancelled)
        // Admins see all appointments, regular users only see their own
        const appointmentsStart = performance.now();
        console.log('🔍 Fetching past appointments for user:', user.id, isAdmin ? '(admin - all appointments)' : '(own appointments only)');

        let query = supabase
          .from('appointments')
          .select('*, patient:patients(*)')
          .eq('status', 'completed')
          .order('scheduled_time', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(isAdmin ? 50 : 10); // Admins see more appointments

        // Non-admins only see their own appointments (doctors see their appointments)
        if (!isAdmin && doctorProfile) {
          query = query.eq('doctor_id', doctorProfile.id);
        }

        const { data: appointments, error: appointmentsError } = await query;
        const appointmentsEnd = performance.now();
        console.log(`⏱️ Past appointments query: ${(appointmentsEnd - appointmentsStart).toFixed(0)}ms`);
        console.log('📋 Past appointments found:', appointments?.length || 0, appointments);

        if (appointmentsError) {
          console.error('Error fetching past appointments:', appointmentsError);
          return;
        }

        setPastAppointments(appointments || []);

        // TIME: Fetch consultations for completed appointments
        const completedAppointmentIds = (appointments || [])
          .filter(apt => apt.status === 'completed' && apt.consultation_id)
          .map(apt => apt.consultation_id as string);

        if (completedAppointmentIds.length > 0) {
          const consultationsStart = performance.now();
          const { data: consultations, error: consultationsError } = await supabase
            .from('consultations')
            .select('*')
            .in('id', completedAppointmentIds);
          const consultationsEnd = performance.now();
          console.log(`⏱️ Consultations query: ${(consultationsEnd - consultationsStart).toFixed(0)}ms`);

          if (consultationsError) {
            console.error('Error fetching consultations:', consultationsError);
            return;
          }

          // Create a map of appointment_id -> consultation
          const consultationsById: Record<string, Consultation> = {};
          (consultations || []).forEach(consultation => {
            if (consultation.appointment_id) {
              consultationsById[consultation.appointment_id] = consultation;
            }
          });
          setConsultationsMap(consultationsById);
        }
      } catch (error) {
        console.error('Error fetching past appointments:', error);
      } finally {
        setPastAppointmentsLoading(false);
      }
    };

    // Wait for current appointments to load first, then fetch past appointments
    if (!loading && user) {
      const timer = setTimeout(() => {
        fetchPastAppointments();
      }, 500); // Increased delay to 500ms to ensure current appointments load first

      return () => clearTimeout(timer);
    }
  }, [user, loading, isAdmin]); // Also depend on loading state and admin status

  // Fetch consultations for today's appointments that have consultation_id
  useEffect(() => {
    const fetchTodayConsultations = async () => {
      if (!appointments || appointments.length === 0) return;

      // Find appointments that have consultation_id but no consultation in map yet
      const appointmentsWithConsultations = appointments.filter(
        apt => apt.consultation_id && !consultationsMap[apt.id]
      );

      if (appointmentsWithConsultations.length === 0) return;

      try {
        const consultationIds = appointmentsWithConsultations
          .map(apt => apt.consultation_id as string);

        const { data: consultations, error } = await supabase
          .from('consultations')
          .select('*')
          .in('id', consultationIds);

        if (error) {
          console.error('Error fetching today consultations:', error);
          return;
        }

        // Map consultations by appointment_id
        const newConsultations: Record<string, Consultation> = {};
        (consultations || []).forEach(consultation => {
          if (consultation.appointment_id) {
            newConsultations[consultation.appointment_id] = consultation;
          }
        });

        // Merge with existing consultations map
        setConsultationsMap(prev => ({ ...prev, ...newConsultations }));
      } catch (error) {
        console.error('Error fetching today consultations:', error);
      }
    };

    fetchTodayConsultations();
  }, [appointments]); // Re-run when appointments change

  const formatDateDisplay = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today's Appointments";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow's Appointments";
    } else {
      return `Appointments for ${date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-aneya-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-aneya-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-aneya-navy">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aneya-cream overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[24px] sm:text-[32px] text-aneya-navy mb-2">
            {formatDateDisplay(selectedDate)}
          </h1>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsFormModalOpen(true)}
              className="px-6 py-3 bg-aneya-navy text-white rounded-[10px] font-medium text-[14px] hover:bg-opacity-90 transition-colors flex items-center gap-2"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Appointment
            </button>
            <button
              onClick={() => setIsAvailabilityModalOpen(true)}
              className="px-6 py-3 bg-white border border-aneya-navy text-aneya-navy rounded-[10px] font-medium text-[14px] hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Set Availability
            </button>
            <button
              onClick={() => setIsCalendarVisible(!isCalendarVisible)}
              className="px-6 py-3 bg-white border border-aneya-teal text-aneya-teal rounded-[10px] font-medium text-[14px] hover:bg-aneya-teal/5 transition-colors flex items-center gap-2"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {isCalendarVisible ? 'Hide Calendar' : 'View Calendar'}
            </button>
          </div>
        </div>

        {/* Two-column layout: Appointments on left, Calendar on right */}
        {/* On mobile: stack vertically with appointments first, calendar below */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left column: Appointments List */}
          <div className="flex-1 w-full">
            {appointments.length === 0 ? (
          <div className="bg-white rounded-[16px] p-12 text-center border-2 border-gray-200">
            <svg
              className="h-16 w-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-[20px] text-aneya-navy mb-2">No appointments scheduled</h3>
            <p className="text-[14px] text-gray-600">
              {selectedDate.toDateString() === new Date().toDateString()
                ? 'No appointments for today'
                : 'No appointments for this date'}
            </p>
          </div>
        ) : (
              <div className="space-y-4">
                {appointments
                  .sort((a, b) =>
                    new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
                  )
                  .map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onStartConsultation={onStartConsultation}
                      onModify={handleModifyAppointment}
                      onCancel={handleCancelAppointment}
                      consultation={consultationsMap[appointment.id] || null}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Right column: Calendar (conditionally rendered) */}
          {isCalendarVisible && (
            <div className="w-full lg:w-[350px] flex-shrink-0">
              <CompactCalendar
                appointments={appointments}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onExpand={() => setIsCalendarExpanded(true)}
              />
            </div>
          )}
        </div>

        {/* Modals */}
        <AppointmentFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingAppointment(null);
            setPreFilledDate(null);
          }}
          onSave={handleCreateAppointment}
          patients={patients}
          appointment={editingAppointment || undefined}
          preFilledDate={preFilledDate || undefined}
          onCreatePatient={() => setIsPatientModalOpen(true)}
        />

        <PatientFormModal
          isOpen={isPatientModalOpen}
          onClose={() => setIsPatientModalOpen(false)}
          onSave={handleCreatePatient}
        />

        <FullCalendarModal
          isOpen={isCalendarExpanded}
          onClose={() => setIsCalendarExpanded(false)}
          appointments={appointments}
          onSelectAppointment={(apt) => {
            setIsCalendarExpanded(false);
            handleModifyAppointment(apt);
          }}
          onCreateAppointment={(date) => {
            setIsCalendarExpanded(false);
            handleCreateFromCalendar(date);
          }}
        />

        {isAvailabilityModalOpen && (
          <DoctorAvailabilitySettings
            onClose={() => setIsAvailabilityModalOpen(false)}
          />
        )}

        {/* Past Appointments Section */}
        <div className="mt-12 border-t border-gray-300 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[24px] text-aneya-navy font-semibold">
              Past Appointments
            </h2>
            {pastAppointments.length > 0 && (
              <span className="text-sm text-gray-500">
                {filteredPastAppointments.length} of {pastAppointments.length}
              </span>
            )}
          </div>

          {/* Search box */}
          {pastAppointments.length > 0 && (
            <div className="mb-4 relative">
              <input
                type="text"
                value={pastAppointmentsSearch}
                onChange={(e) => setPastAppointmentsSearch(e.target.value)}
                placeholder="Search past appointments by patient name, date, or reason..."
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aneya-teal/50 focus:border-aneya-teal"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {pastAppointmentsSearch && (
                <button
                  onClick={() => setPastAppointmentsSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {pastAppointmentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-aneya-teal border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pastAppointments.length === 0 ? (
            <div className="bg-gray-50 rounded-[16px] p-8 text-center border border-gray-200">
              <p className="text-[14px] text-gray-600">
                No completed or cancelled appointments yet
              </p>
            </div>
          ) : filteredPastAppointments.length === 0 ? (
            <div className="bg-gray-50 rounded-[16px] p-8 text-center border border-gray-200">
              <p className="text-[14px] text-gray-600">
                No appointments match your search
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
              {filteredPastAppointments.map((appointment) => (
                <PastAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  consultation={consultationsMap[appointment.id] || null}
                  onClick={() => setSelectedAppointmentDetail(appointment)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointmentDetail && (
        <AppointmentDetailModal
          isOpen={true}
          onClose={() => setSelectedAppointmentDetail(null)}
          appointment={selectedAppointmentDetail}
          consultation={consultationsMap[selectedAppointmentDetail.id] || null}
          onAnalyze={onAnalyzeConsultation}
          onResummarize={handleResummarize}
          onFillForm={handleFillForm}
          onRerunTranscription={handleRerunTranscription}
          onResearchAnalysis={handleResearchAnalysis}
          onViewConsultationForm={onViewConsultationForm}
          onDownloadPrescription={handleDownloadPrescription}
          downloadingPrescription={downloadingPrescriptionId !== null}
          isAdmin={isAdmin}
          onDelete={handleDeleteAppointment}
        />
      )}
    </div>
  );
}
