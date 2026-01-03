import { useState, useEffect } from 'react';
import { Patient, Consultation, AppointmentWithPatient } from '../types/database';
import { usePatients } from '../hooks/usePatients';
import { useAuth } from '../contexts/AuthContext';
import { useAppointments } from '../hooks/useAppointments';
import { PastAppointmentCard } from './PastAppointmentCard';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import { getPatientAge, formatDateUK } from '../utils/dateHelpers';
import { supabase } from '../lib/supabase';

interface PatientDetailViewProps {
  patient: Patient;
  onBack: () => void;
  onEditPatient: (patient: Patient) => void;
  onStartConsultation: (patient: Patient) => void;
  onAnalyzeConsultation?: (appointment: AppointmentWithPatient, consultation: Consultation) => void;
}

export function PatientDetailView({
  patient,
  onBack,
  onEditPatient,
  onStartConsultation,
  onAnalyzeConsultation,
}: PatientDetailViewProps) {
  const { updatePatient } = usePatients();
  const { isAdmin } = useAuth();
  const { deleteAppointment } = useAppointments();

  const [pastAppointments, setPastAppointments] = useState<AppointmentWithPatient[]>([]);
  const [consultationsMap, setConsultationsMap] = useState<Record<string, Consultation>>({});
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<AppointmentWithPatient | null>(null);
  const [isEditingMedications, setIsEditingMedications] = useState(false);
  const [isEditingConditions, setIsEditingConditions] = useState(false);
  const [medicationsValue, setMedicationsValue] = useState(patient.current_medications || '');
  const [conditionsValue, setConditionsValue] = useState(patient.current_conditions || '');

  const handleSaveMedications = async () => {
    await updatePatient(patient.id, { current_medications: medicationsValue });
    setIsEditingMedications(false);
  };

  const handleSaveConditions = async () => {
    await updatePatient(patient.id, { current_conditions: conditionsValue });
    setIsEditingConditions(false);
  };

  const handleCancelMedications = () => {
    setMedicationsValue(patient.current_medications || '');
    setIsEditingMedications(false);
  };

  const handleCancelConditions = () => {
    setConditionsValue(patient.current_conditions || '');
    setIsEditingConditions(false);
  };

  // Fetch past appointments for this patient
  const fetchPastAppointments = async () => {
    try {
      setAppointmentsLoading(true);

      // First query: Get appointments (without consultations)
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*, patient:patients(*)')
        .eq('patient_id', patient.id)
        .in('status', ['completed', 'cancelled'])
        .order('scheduled_time', { ascending: false })
        .order('created_at', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      setPastAppointments(appointmentsData || []);

      // Second query: Get consultations for appointments that have them
      const consultationIds = (appointmentsData || [])
        .filter(apt => apt.consultation_id)
        .map(apt => apt.consultation_id as string);

      if (consultationIds.length > 0) {
        const { data: consultationsData, error: consultationsError } = await supabase
          .from('consultations')
          .select('*')
          .in('id', consultationIds);

        if (consultationsError) throw consultationsError;

        // Build consultations map by appointment_id
        const map: Record<string, Consultation> = {};
        (consultationsData || []).forEach((consultation: Consultation) => {
          if (consultation.appointment_id) {
            map[consultation.appointment_id] = consultation;
          }
        });
        setConsultationsMap(map);
      }
    } catch (error) {
      console.error('Error fetching past appointments:', error);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  // Fetch appointments on mount and when patient changes
  useEffect(() => {
    fetchPastAppointments();
  }, [patient.id]);

  const handleResummarize = async (_appointment: AppointmentWithPatient, consultation: Consultation | null) => {
    if (!consultation) return;

    try {
      // Get the API URL from environment variables
      const apiUrl = import.meta.env.VITE_API_URL || 'https://aneya-backend-xao3xivzia-el.a.run.app';

      // Prepare the request body
      const requestBody = {
        text: consultation.consultation_text || consultation.original_transcript || '',
        original_text: consultation.original_transcript,
        patient_info: consultation.patient_snapshot || {
          patient_id: patient.id,
          patient_age: getPatientAge(patient),
        },
        is_from_transcription: true,
        transcription_language: consultation.transcription_language || 'en'
      };

      // Call the backend summarize endpoint
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

      // Refresh the appointments list to show updated data
      await fetchPastAppointments();

      console.log('Consultation re-summarized successfully');
    } catch (error) {
      console.error('Error re-summarizing consultation:', error);
      alert('Failed to re-summarize consultation. Please try again.');
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

      // Update local state
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

  return (
    <div className="min-h-screen bg-aneya-cream">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-aneya-navy hover:text-aneya-teal transition-colors"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-[14px] font-medium">Back to Patients</span>
          </button>
        </div>

        <h1 className="text-[32px] text-aneya-navy mb-6">{patient.name}</h1>

        {/* Demographics */}
        <section className="mb-6 bg-white rounded-[16px] p-6 border-2 border-aneya-teal">
          <h2 className="text-[20px] text-aneya-navy mb-4">Demographics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-[12px] text-gray-600 mb-1">Age</div>
              <div className="text-[14px] text-aneya-navy font-medium">
                {getPatientAge(patient)}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-gray-600 mb-1">Sex</div>
              <div className="text-[14px] text-aneya-navy font-medium">{patient.sex}</div>
            </div>
            <div>
              <div className="text-[12px] text-gray-600 mb-1">Date of Birth</div>
              <div className="text-[14px] text-aneya-navy font-medium">
                {patient.date_of_birth ? formatDateUK(patient.date_of_birth) : 'Age only recorded'}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-gray-600 mb-1">Height</div>
              <div className="text-[14px] text-aneya-navy font-medium">
                {patient.height_cm ? `${patient.height_cm} cm` : 'Not recorded'}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-gray-600 mb-1">Weight</div>
              <div className="text-[14px] text-aneya-navy font-medium">
                {patient.weight_kg ? `${patient.weight_kg} kg` : 'Not recorded'}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-gray-600 mb-1">Email</div>
              <div className="text-[14px] text-aneya-navy font-medium">
                {patient.email || 'Not recorded'}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-gray-600 mb-1">Phone</div>
              <div className="text-[14px] text-aneya-navy font-medium">
                {patient.phone || 'Not recorded'}
              </div>
            </div>
          </div>
        </section>

        {/* Allergies */}
        {patient.allergies && (
          <section className="mb-6 bg-red-50 rounded-[16px] p-6 border-2 border-red-300">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-[20px] text-red-900 font-semibold">
                Known Allergies
              </h2>
            </div>
            <p className="text-[15px] text-red-900 whitespace-pre-wrap">{patient.allergies}</p>
          </section>
        )}

        {/* Current Medications */}
        <section className="mb-6 bg-white rounded-[16px] p-6 border-2 border-aneya-teal">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] text-aneya-navy">Current Medications</h2>
            {!isEditingMedications && (
              <button
                onClick={() => setIsEditingMedications(true)}
                className="text-[14px] text-aneya-teal hover:text-aneya-navy font-medium"
              >
                Edit
              </button>
            )}
          </div>
          {isEditingMedications ? (
            <div>
              <textarea
                value={medicationsValue}
                onChange={(e) => setMedicationsValue(e.target.value)}
                rows={4}
                className="w-full p-3 border-2 border-aneya-teal rounded-lg focus:outline-none focus:border-aneya-navy text-[14px] text-aneya-navy resize-none"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveMedications}
                  className="px-4 py-2 bg-aneya-navy text-white rounded-[10px] text-[14px] font-medium hover:bg-opacity-90 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelMedications}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-[10px] text-[14px] font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[15px] text-aneya-navy whitespace-pre-wrap">
              {patient.current_medications || 'No current medications recorded'}
            </p>
          )}
        </section>

        {/* Current Conditions */}
        <section className="mb-6 bg-white rounded-[16px] p-6 border-2 border-aneya-teal">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] text-aneya-navy">Current Conditions</h2>
            {!isEditingConditions && (
              <button
                onClick={() => setIsEditingConditions(true)}
                className="text-[14px] text-aneya-teal hover:text-aneya-navy font-medium"
              >
                Edit
              </button>
            )}
          </div>
          {isEditingConditions ? (
            <div>
              <textarea
                value={conditionsValue}
                onChange={(e) => setConditionsValue(e.target.value)}
                rows={4}
                className="w-full p-3 border-2 border-aneya-teal rounded-lg focus:outline-none focus:border-aneya-navy text-[14px] text-aneya-navy resize-none"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveConditions}
                  className="px-4 py-2 bg-aneya-navy text-white rounded-[10px] text-[14px] font-medium hover:bg-opacity-90 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelConditions}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-[10px] text-[14px] font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[15px] text-aneya-navy whitespace-pre-wrap">
              {patient.current_conditions || 'No current conditions recorded'}
            </p>
          )}
        </section>

        {/* Past Appointments */}
        <section className="mt-12 border-t border-gray-300 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[24px] text-aneya-navy font-semibold">
              Past Appointments
            </h2>
            {pastAppointments.length > 0 && (
              <span className="text-sm text-gray-500">
                {pastAppointments.length} of {pastAppointments.length}
              </span>
            )}
          </div>

          {appointmentsLoading ? (
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
            <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
              {pastAppointments.map((appointment) => (
                <PastAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  consultation={consultationsMap[appointment.id] || null}
                  onClick={() => setSelectedAppointmentDetail(appointment)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Appointments */}
        <section className="mb-6 bg-white rounded-[16px] p-6 border-2 border-gray-200">
          <h2 className="text-[20px] text-aneya-navy mb-4">Upcoming Appointments</h2>
          <p className="text-[15px] text-gray-600 italic">
            No upcoming appointments scheduled
          </p>
        </section>

        {/* Symptom History */}
        <section className="mb-6 bg-white rounded-[16px] p-6 border-2 border-gray-200">
          <h2 className="text-[20px] text-aneya-navy mb-4">Symptom History</h2>
          <p className="text-[15px] text-gray-600 italic">
            Patient symptom tracking coming soon
          </p>
        </section>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => onStartConsultation(patient)}
            className="flex-1 px-6 py-3 bg-aneya-navy text-white rounded-[10px] font-medium text-[16px] hover:bg-opacity-90 transition-colors"
          >
            Start New Consultation
          </button>
          <button
            onClick={() => onEditPatient(patient)}
            className="px-6 py-3 border-2 border-aneya-teal text-aneya-navy rounded-[10px] font-medium text-[16px] hover:bg-aneya-teal hover:text-white transition-colors"
          >
            Edit Patient
          </button>
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
            onRerunTranscription={handleRerunTranscription}
            isAdmin={isAdmin}
            onDelete={handleDeleteAppointment}
          />
        )}
      </div>
    </div>
  );
}
