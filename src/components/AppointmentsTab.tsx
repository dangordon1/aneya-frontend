import { useState, useEffect } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import { usePatients } from '../hooks/usePatients';
import { AppointmentWithPatient, Consultation, CreatePatientInput } from '../types/database';
import { AppointmentCard } from './AppointmentCard';
import { AppointmentFormModal } from './AppointmentFormModal';
import { PatientFormModal } from './PatientFormModal';
import { CompactCalendar } from './CompactCalendar';
import { FullCalendarModal } from './FullCalendarModal';
import { PastAppointmentCard } from './PastAppointmentCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AppointmentsTabProps {
  onStartConsultation: (appointment: AppointmentWithPatient) => void;
  onAnalyzeConsultation?: (appointment: AppointmentWithPatient, consultation: Consultation) => void;
}

export function AppointmentsTab({ onStartConsultation, onAnalyzeConsultation }: AppointmentsTabProps) {
  const { user, isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { appointments, loading, createAppointment, cancelAppointment } =
    useAppointments(selectedDate.toISOString().split('T')[0]);
  const { patients, createPatient } = usePatients();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithPatient | null>(null);
  const [preFilledDate, setPreFilledDate] = useState<Date | null>(null);

  // State for past appointments
  const [pastAppointments, setPastAppointments] = useState<AppointmentWithPatient[]>([]);
  const [pastAppointmentsLoading, setPastAppointmentsLoading] = useState(true);
  const [consultationsMap, setConsultationsMap] = useState<Record<string, Consultation>>({});

  const handleCreateAppointment = async (appointmentData: any) => {
    await createAppointment(appointmentData);
    setIsFormModalOpen(false);
    setEditingAppointment(null);
    setPreFilledDate(null);
  };

  const handleModifyAppointment = (appointment: AppointmentWithPatient) => {
    setEditingAppointment(appointment);
    setIsFormModalOpen(true);
  };

  const handleCancelAppointment = async (appointment: AppointmentWithPatient) => {
    if (window.confirm(`Cancel appointment with ${appointment.patient.name}?`)) {
      const reason = window.prompt('Reason for cancellation (optional):');
      await cancelAppointment(appointment.id, reason || undefined);
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

  // Fetch past appointments (completed or cancelled) - NON-BLOCKING
  useEffect(() => {
    const fetchPastAppointments = async () => {
      if (!user || loading) {
        // Wait for current appointments to finish loading first
        return;
      }

      try {
        // TIME: Fetch completed and cancelled appointments
        // Admins see all appointments, regular users only see their own
        const appointmentsStart = performance.now();
        console.log('🔍 Fetching past appointments for user:', user.id, isAdmin ? '(admin - all appointments)' : '(own appointments only)');

        let query = supabase
          .from('appointments')
          .select('*, patient:patients(*)')
          .in('status', ['completed', 'cancelled'])
          .order('scheduled_time', { ascending: false })
          .limit(isAdmin ? 50 : 10); // Admins see more appointments

        // Non-admins only see their own appointments
        if (!isAdmin) {
          query = query.eq('user_id', user.id);
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
            Create New Appointment
          </button>
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
            <p className="text-[14px] text-gray-600 mb-6">
              {selectedDate.toDateString() === new Date().toDateString()
                ? 'No appointments for today'
                : 'No appointments for this date'}
            </p>
            <button
              onClick={() => setIsFormModalOpen(true)}
              className="px-6 py-3 bg-aneya-navy text-white rounded-[10px] font-medium text-[14px] hover:bg-opacity-90 transition-colors"
            >
              Create New Appointment
            </button>
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
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Right column: Calendar */}
          <div className="w-full lg:w-[350px] flex-shrink-0">
            <CompactCalendar
              appointments={appointments}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onExpand={() => setIsCalendarExpanded(true)}
            />
          </div>
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

        {/* Past Appointments Section */}
        <div className="mt-12 border-t border-gray-300 pt-8">
          <h2 className="text-[24px] text-aneya-navy mb-6 font-semibold">
            Past Appointments
          </h2>

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
          ) : (
            <div className="space-y-4">
              {pastAppointments.map((appointment) => (
                <PastAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  consultation={consultationsMap[appointment.id] || null}
                  onAnalyze={onAnalyzeConsultation}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
