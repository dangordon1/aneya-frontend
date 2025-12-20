import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Appointment, Doctor } from '../../types/database';
import { PatientProfileForm } from './PatientProfileForm';
import { MyDoctors } from './MyDoctors';
import { PatientAppointments } from './PatientAppointments';
import { BookAppointmentWizard } from './BookAppointmentWizard';
import { PatientMessages } from './PatientMessages';
import { PatientTabNavigation, PatientTab } from './PatientTabNavigation';
import { SymptomsTab } from './SymptomsTab';
import { useMessages } from '../../hooks/useMessages';
type PatientScreen = 'tabs' | 'book';

interface AppointmentWithDoctor extends Appointment {
  doctor: Doctor | null;
}

export function PatientDashboard() {
  const { patientProfile, signOut, refreshProfiles } = useAuth();
  const [screen, setScreen] = useState<PatientScreen>('tabs');
  const [activeTab, setActiveTab] = useState<PatientTab>('appointments');
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const { unreadCount } = useMessages();
  const [hasSetInitialTab, setHasSetInitialTab] = useState(false);

  // Check if profile has mandatory fields completed
  const isMandatoryFieldsComplete = patientProfile &&
    patientProfile.name &&
    patientProfile.name !== patientProfile.email?.split('@')[0] &&
    patientProfile.date_of_birth &&
    patientProfile.date_of_birth !== '2000-01-01' &&
    patientProfile.sex;

  // Redirect to profile tab on first load if profile is incomplete
  useEffect(() => {
    if (patientProfile && !hasSetInitialTab) {
      if (!isMandatoryFieldsComplete) {
        setActiveTab('profile');
      }
      setHasSetInitialTab(true);
    }
  }, [patientProfile, hasSetInitialTab, isMandatoryFieldsComplete]);

  useEffect(() => {
    if (patientProfile?.id) {
      fetchUpcomingAppointments();
    } else {
      setLoading(false);
    }
  }, [patientProfile?.id]);

  const fetchUpcomingAppointments = async () => {
    if (!patientProfile?.id) return;

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors(*)
        `)
        .eq('patient_id', patientProfile.id)
        .gte('scheduled_time', now)
        .not('status', 'eq', 'cancelled')
        .order('scheduled_time', { ascending: true })
        .limit(5);

      if (error) throw error;
      setUpcomingAppointments(data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Check if profile is incomplete (for warning banner)
  const isProfileIncomplete = !isMandatoryFieldsComplete;

  // Handle tab changes with validation
  const handleTabChange = (tab: PatientTab) => {
    // Prevent navigation away from profile if mandatory fields are not complete
    if (!isMandatoryFieldsComplete && activeTab === 'profile' && tab !== 'profile') {
      alert('Please complete all mandatory fields (Name, Date of Birth, and Sex) before navigating to other sections.');
      return;
    }
    setActiveTab(tab);
  };

  // Handle booking flow
  if (screen === 'book') {
    return (
      <BookAppointmentWizard
        onBack={() => setScreen('tabs')}
        onSuccess={() => {
          fetchUpcomingAppointments();
          setScreen('tabs');
        }}
      />
    );
  }

  // Tab-based view
  return (
    <div className="min-h-screen bg-aneya-cream flex flex-col">
      {/* Header */}
      <header className="bg-aneya-navy py-2 sm:py-4 px-4 sm:px-6 border-b border-aneya-teal">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <img src="/aneya-logo.png" alt="aneya" className="h-16 sm:h-20" />
          <div className="text-right">
            {patientProfile?.name && (
              <span className="text-aneya-cream text-sm sm:text-base font-medium block">{patientProfile.name}</span>
            )}
            <span className="text-aneya-cream/70 text-xs sm:text-sm font-light tracking-wide">Patient Portal</span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <PatientTabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadMessagesCount={unreadCount}
      />

      {/* Main Content */}
      <main className="flex-1 bg-aneya-navy">
        {/* Profile incomplete warning */}
        {isProfileIncomplete && activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto px-4 pt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm font-medium">
                ⚠️ Required: Please complete all mandatory fields marked with <span className="text-red-500">*</span> before navigating to other sections.
              </p>
              <p className="text-red-700 text-xs mt-1">
                You must fill in your Name, Date of Birth, and Sex to continue.
              </p>
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <PatientAppointmentsTab
            upcomingAppointments={upcomingAppointments}
            loading={loading}
            onBookAppointment={() => setScreen('book')}
            onRefresh={fetchUpcomingAppointments}
          />
        )}

        {/* Symptoms Tab */}
        {activeTab === 'symptoms' && (
          <SymptomsTab onBack={() => setActiveTab('appointments')} />
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <PatientMessages onBack={() => setActiveTab('appointments')} />
        )}

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <MyDoctors onBack={() => setActiveTab('appointments')} />
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <PatientProfileForm
            onBack={() => {
              refreshProfiles();
              // Only allow going back if mandatory fields are complete
              if (isMandatoryFieldsComplete) {
                setActiveTab('appointments');
              } else {
                alert('Please complete all mandatory fields (Name, Date of Birth, and Sex) before leaving this page.');
              }
            }}
          />
        )}
      </main>

      {/* Footer with Sign Out */}
      <footer className="bg-aneya-navy py-3 px-4 border-t border-aneya-teal">
        <div className="max-w-4xl mx-auto flex justify-center">
          <button
            onClick={handleSignOut}
            className="bg-aneya-teal hover:bg-aneya-teal/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </footer>
    </div>
  );
}

// Appointments Tab Component - shows upcoming appointments with book button
interface AppointmentsTabProps {
  upcomingAppointments: AppointmentWithDoctor[];
  loading: boolean;
  onBookAppointment: () => void;
  onRefresh: () => void;
}

function PatientAppointmentsTab({ upcomingAppointments, loading, onBookAppointment, onRefresh }: AppointmentsTabProps) {
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Book Appointment Button */}
      <div className="flex justify-end">
        <button
          onClick={onBookAppointment}
          className="bg-aneya-teal text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-aneya-teal/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Book Appointment
        </button>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-aneya-navy text-lg">Upcoming Appointments</h3>
          <button
            onClick={onRefresh}
            className="text-sm text-aneya-teal hover:text-aneya-teal/80 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal mx-auto"></div>
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg mb-2">No upcoming appointments</p>
            <p className="text-sm text-gray-400 mb-4">Book an appointment with one of your doctors</p>
            <button
              onClick={onBookAppointment}
              className="text-aneya-teal hover:text-aneya-teal/80 text-sm font-medium"
            >
              Book an appointment
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingAppointments.map(apt => {
              const { date, time } = formatDateTime(apt.scheduled_time);
              return (
                <div key={apt.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                  <div className="flex-shrink-0 w-20 text-center">
                    <div className="text-sm font-medium text-aneya-navy">{date}</div>
                    <div className="text-xl font-semibold text-aneya-teal">{time}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-aneya-navy truncate text-lg">
                      {apt.doctor?.name || 'Doctor'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {apt.appointment_type.replace('_', ' ')} - {apt.duration_minutes} minutes
                    </p>
                    {apt.reason && (
                      <p className="text-sm text-gray-400 truncate mt-1">{apt.reason}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    apt.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    apt.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {apt.status.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Appointments - Link to full view */}
      <PatientAppointments onBack={() => {}} />
    </div>
  );
}
