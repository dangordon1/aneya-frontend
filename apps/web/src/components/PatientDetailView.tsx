import { useState } from 'react';
import { Patient, Consultation } from '../types/database';
import { useConsultations } from '../hooks/useConsultations';
import { usePatients } from '../hooks/usePatients';
import { ConsultationHistoryCard } from './ConsultationHistoryCard';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { calculateAgeString, formatDateUK } from '../utils/dateHelpers';

interface PatientDetailViewProps {
  patient: Patient;
  onBack: () => void;
  onEditPatient: (patient: Patient) => void;
  onStartConsultation: (patient: Patient) => void;
  onAnalyzeConsultation?: (consultation: Consultation) => void;
}

export function PatientDetailView({
  patient,
  onBack,
  onEditPatient,
  onStartConsultation,
  onAnalyzeConsultation,
}: PatientDetailViewProps) {
  const { consultations, loading: consultationsLoading, deleteConsultation } = useConsultations(patient.id);
  const { updatePatient } = usePatients();

  const [isConsultationsExpanded, setIsConsultationsExpanded] = useState(true);
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
                {calculateAgeString(patient.date_of_birth)}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-gray-600 mb-1">Sex</div>
              <div className="text-[14px] text-aneya-navy font-medium">{patient.sex}</div>
            </div>
            <div>
              <div className="text-[12px] text-gray-600 mb-1">Date of Birth</div>
              <div className="text-[14px] text-aneya-navy font-medium">
                {formatDateUK(patient.date_of_birth)}
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

        {/* Previous Consultations */}
        <section className="mb-6">
          <button
            onClick={() => setIsConsultationsExpanded(!isConsultationsExpanded)}
            className="w-full flex items-center justify-between p-4 bg-white border-2 border-aneya-teal rounded-[10px] hover:border-aneya-navy transition-colors mb-3"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-[20px] text-aneya-navy">Previous Consultations</h2>
              <span className="text-[14px] text-gray-500">
                ({consultations.length} {consultations.length === 1 ? 'consultation' : 'consultations'})
              </span>
            </div>
            {isConsultationsExpanded ? (
              <ChevronUp className="w-5 h-5 text-aneya-navy" />
            ) : (
              <ChevronDown className="w-5 h-5 text-aneya-navy" />
            )}
          </button>

          {isConsultationsExpanded && (
            <div className="space-y-3">
              {consultationsLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 mx-auto mb-2 border-4 border-aneya-teal border-t-transparent rounded-full animate-spin" />
                  <p className="text-[14px] text-gray-600">Loading consultations...</p>
                </div>
              ) : consultations.length === 0 ? (
                <div className="bg-white rounded-[16px] p-8 text-center border-2 border-gray-200">
                  <p className="text-[15px] text-gray-600">
                    No previous consultations on record
                  </p>
                </div>
              ) : (
                consultations.map((consultation) => (
                  <ConsultationHistoryCard
                    key={consultation.id}
                    consultation={consultation}
                    onDelete={deleteConsultation}
                    onAnalyze={onAnalyzeConsultation}
                  />
                ))
              )}
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
      </div>
    </div>
  );
}
