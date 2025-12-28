import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Appointment, Doctor, Consultation } from '../../types/database';
import { requiresOBGynForms } from '../../utils/specialtyHelpers';
import { OBGynPreConsultationForm } from './OBGynPreConsultationForm';

interface AppointmentWithDetails extends Appointment {
  doctor: Doctor | null;
  consultation: Consultation | null;
}

interface Props {
  onBack: () => void;
}

interface AppointmentWithOBGynForm extends AppointmentWithDetails {
  obgynFormStatus?: 'draft' | 'partial' | 'completed' | null;
}

export function PatientAppointments({ onBack }: Props) {
  const { patientProfile } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithOBGynForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [selectedOBGynForm, setSelectedOBGynForm] = useState<{ appointmentId: string; patientId: string } | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('all');

  useEffect(() => {
    if (patientProfile?.id) {
      fetchAppointments();
    }
  }, [patientProfile?.id]);

  const fetchAppointments = async () => {
    if (!patientProfile?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors(*),
          consultation:consultations(*)
        `)
        .eq('patient_id', patientProfile.id)
        .order('scheduled_time', { ascending: false });

      if (fetchError) throw fetchError;

      // For each appointment with OB/GYN doctor, fetch the form status
      const appointmentsWithForms = await Promise.all(
        (data || []).map(async (apt: any) => {
          if (requiresOBGynForms(apt.doctor?.specialty)) {
            try {
              const { data: formData, error: formError } = await supabase
                .from('obgyn_consultation_forms')
                .select('status')
                .eq('appointment_id', apt.id)
                .eq('form_type', 'pre_consultation')
                .single();

              if (!formError && formData) {
                return {
                  ...apt,
                  obgynFormStatus: formData.status,
                };
              }
            } catch (err) {
              // Form doesn't exist yet, that's ok
            }
          }
          return apt;
        })
      );

      setAppointments(appointmentsWithForms);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'upcoming') {
      return new Date(apt.scheduled_time) >= now && apt.status !== 'cancelled';
    }
    if (filter === 'past') {
      return new Date(apt.scheduled_time) < now || apt.status === 'completed';
    }
    return true;
  });

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-600',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-yellow-100 text-yellow-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getOBGynFormBadge = (formStatus: string | null | undefined) => {
    if (!formStatus) return null;

    const styles: Record<string, string> = {
      draft: 'bg-orange-100 text-orange-800',
      partial: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
    };

    const labels: Record<string, string> = {
      draft: 'Form Started',
      partial: 'Form In Progress',
      completed: 'Pre-consultation Form Completed',
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[formStatus] || 'bg-gray-100'}`}>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        {labels[formStatus]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-aneya-cream">
      {/* Header */}
      <header className="bg-aneya-navy text-white p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-white/80 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">My Appointments</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Filter tabs */}
        <div className="bg-white rounded-lg p-1 flex gap-1">
          {(['all', 'upcoming', 'past'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-aneya-teal text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal mx-auto"></div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-aneya-navy mb-2">No Appointments</h3>
            <p className="text-gray-500 text-sm">
              {filter === 'upcoming'
                ? "You don't have any upcoming appointments."
                : filter === 'past'
                ? "You don't have any past appointments."
                : "You don't have any appointments yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map(apt => {
              const { date, time } = formatDateTime(apt.scheduled_time);
              const isPast = new Date(apt.scheduled_time) < now;
              const hasConsultation = apt.consultation && apt.consultation.id;
              const isOBGyn = requiresOBGynForms(apt.doctor?.specialty);
              const hasOBGynForm = apt.obgynFormStatus !== null && apt.obgynFormStatus !== undefined;

              return (
                <div
                  key={apt.id}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                    isPast ? 'opacity-80' : ''
                  }`}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm text-gray-500">{date}</p>
                        <p className="text-xl font-semibold text-aneya-teal">{time}</p>
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(apt.status)}
                      </div>
                    </div>

                    {/* OB/GYN Form Status Badge */}
                    {hasOBGynForm && (
                      <div className="mb-3">
                        {getOBGynFormBadge(apt.obgynFormStatus)}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm text-aneya-navy font-medium">
                          {apt.doctor?.name || 'Doctor'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-600">
                          {apt.duration_minutes} minutes - {apt.appointment_type.replace('_', ' ')}
                        </span>
                      </div>

                      {apt.reason && (
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span className="text-sm text-gray-600">{apt.reason}</span>
                        </div>
                      )}
                    </div>

                    {/* OB/GYN Pre-consultation form button */}
                    {isOBGyn && !isPast && patientProfile && (
                      <button
                        onClick={() => setSelectedOBGynForm({ appointmentId: apt.id, patientId: patientProfile.id })}
                        className="mt-3 w-full py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors border border-purple-200"
                      >
                        {hasOBGynForm ? 'Continue Pre-consultation Form' : 'Fill Pre-consultation Form'}
                      </button>
                    )}

                    {/* Consultation summary button */}
                    {hasConsultation && (
                      <button
                        onClick={() => setSelectedConsultation(apt.consultation)}
                        className="mt-3 w-full py-2 bg-aneya-teal/10 text-aneya-teal rounded-lg text-sm font-medium hover:bg-aneya-teal/20 transition-colors"
                      >
                        View Consultation Summary
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Consultation Modal */}
        {selectedConsultation && (
          <ConsultationModal
            consultation={selectedConsultation}
            onClose={() => setSelectedConsultation(null)}
          />
        )}

        {/* OB/GYN Pre-consultation Form Modal */}
        {selectedOBGynForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-purple-600 text-white p-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Pre-consultation Form - OB/GYN</h2>
                <button
                  onClick={() => setSelectedOBGynForm(null)}
                  className="text-white/80 hover:text-white text-xl"
                >
                  &times;
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <OBGynPreConsultationForm
                  patientId={selectedOBGynForm.patientId}
                  appointmentId={selectedOBGynForm.appointmentId}
                  onComplete={() => {
                    setSelectedOBGynForm(null);
                    // Refresh appointments to show updated form status
                    fetchAppointments();
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ConsultationModal({ consultation, onClose }: { consultation: Consultation; onClose: () => void }) {
  const summary = consultation.summary_data;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-aneya-navy text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Consultation Summary</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {summary?.clinical_summary && (
            <>
              {summary.clinical_summary.chief_complaint && (
                <div>
                  <h4 className="font-medium text-aneya-navy mb-2">Chief Complaint</h4>
                  <p className="text-gray-700">{summary.clinical_summary.chief_complaint}</p>
                </div>
              )}

              {summary.clinical_summary.assessment && (
                <div>
                  <h4 className="font-medium text-aneya-navy mb-2">Assessment</h4>
                  <p className="text-gray-700">{summary.clinical_summary.assessment}</p>
                </div>
              )}

              {summary.clinical_summary.plan && (
                <div>
                  <h4 className="font-medium text-aneya-navy mb-2">Treatment Plan</h4>
                  <p className="text-gray-700">{summary.clinical_summary.plan}</p>
                </div>
              )}
            </>
          )}

          {summary?.recommendations_given && summary.recommendations_given.length > 0 && (
            <div>
              <h4 className="font-medium text-aneya-navy mb-2">Recommendations</h4>
              <ul className="list-disc list-inside space-y-1">
                {summary.recommendations_given.map((rec, i) => (
                  <li key={i} className="text-gray-700">{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {summary?.follow_up && (
            <div>
              <h4 className="font-medium text-aneya-navy mb-2">Follow Up</h4>
              <p className="text-gray-700">{summary.follow_up}</p>
            </div>
          )}

          {!summary && (
            <p className="text-gray-500 text-center py-8">
              No summary available for this consultation.
            </p>
          )}

          <div className="text-xs text-gray-400 pt-4 border-t">
            Consultation date: {new Date(consultation.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
