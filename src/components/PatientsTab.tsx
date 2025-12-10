import { useState } from 'react';
import { usePatients } from '../hooks/usePatients';
import { Patient } from '../types/database';
import { PatientFormModal } from './PatientFormModal';
import { calculateAge, formatDateUK, formatTime24 } from '../utils/dateHelpers';

interface PatientsTabProps {
  onSelectPatient: (patient: Patient) => void;
}

export function PatientsTab({ onSelectPatient }: PatientsTabProps) {
  const { patients, loading, createPatient, updatePatient, error } = usePatients();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>(undefined);

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSavePatient = async (patientData: any) => {
    let result;
    if (editingPatient) {
      result = await updatePatient(editingPatient.id, patientData);
    } else {
      result = await createPatient(patientData);
    }

    if (result) {
      setIsModalOpen(false);
      setEditingPatient(undefined);
    } else {
      // Error already logged in usePatients hook
      alert(`Failed to ${editingPatient ? 'update' : 'create'} patient. Please check the console for details.`);
    }
  };

  const handleEditPatient = (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation(); // Prevent row click from triggering
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPatient(undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-aneya-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-aneya-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-aneya-navy">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aneya-cream">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-[14px]">
              ❌ Error: {error}
            </p>
          </div>
        )}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-[24px] sm:text-[32px] text-aneya-navy">Patients</h1>
          <button
            onClick={() => setIsModalOpen(true)}
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
            Create New Patient
          </button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
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
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients by name..."
              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-aneya-teal rounded-[10px] focus:outline-none focus:border-aneya-navy transition-colors text-[14px] text-aneya-navy"
            />
          </div>
        </div>

        {filteredPatients.length === 0 ? (
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-[20px] text-aneya-navy mb-2">No patients found</h3>
            <p className="text-[14px] text-gray-600 mb-6">
              {searchQuery
                ? 'Try adjusting your search criteria'
                : 'Get started by creating your first patient'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 bg-aneya-navy text-white rounded-[10px] font-medium text-[14px] hover:bg-opacity-90 transition-colors"
              >
                Create New Patient
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => onSelectPatient(patient)}
                  className="bg-white rounded-[16px] border-2 border-aneya-teal p-4 cursor-pointer hover:bg-aneya-teal hover:bg-opacity-5 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-[16px] font-semibold text-aneya-navy">{patient.name}</h3>
                      <p className="text-[14px] text-gray-600">
                        {calculateAge(patient.date_of_birth)} • {patient.sex}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleEditPatient(e, patient)}
                      className="px-3 py-1.5 bg-aneya-teal text-white rounded-lg font-medium text-[12px] hover:bg-opacity-90 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[13px]">
                    <div>
                      <span className="text-gray-500">Last Visit:</span>
                      <p className="text-aneya-navy">
                        {patient.last_visit
                          ? formatDateUK(patient.last_visit.scheduled_time)
                          : <span className="text-gray-400 italic">No visits</span>
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Next Appt:</span>
                      <p className="text-aneya-navy">
                        {patient.next_appointment
                          ? (
                            <>
                              {formatDateUK(patient.next_appointment.scheduled_time)}
                              <span className="text-[11px] text-gray-500 ml-1">
                                {formatTime24(patient.next_appointment.scheduled_time)}
                              </span>
                            </>
                          )
                          : <span className="text-gray-400 italic">None</span>
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-[16px] border-2 border-aneya-teal overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-aneya-teal bg-opacity-10 border-b border-aneya-teal">
                    <th className="px-6 py-4 text-left text-[14px] font-semibold text-aneya-navy">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-[14px] font-semibold text-aneya-navy">
                      Age
                    </th>
                    <th className="px-6 py-4 text-left text-[14px] font-semibold text-aneya-navy">
                      Sex
                    </th>
                    <th className="px-6 py-4 text-left text-[14px] font-semibold text-aneya-navy">
                      Last Visit
                    </th>
                    <th className="px-6 py-4 text-left text-[14px] font-semibold text-aneya-navy">
                      Upcoming Appointments
                    </th>
                    <th className="px-6 py-4 text-left text-[14px] font-semibold text-aneya-navy">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      onClick={() => onSelectPatient(patient)}
                      className="border-b border-gray-100 hover:bg-aneya-teal hover:bg-opacity-5 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-[14px] text-aneya-navy font-medium">
                        {patient.name}
                      </td>
                      <td className="px-6 py-4 text-[14px] text-aneya-navy">
                        {calculateAge(patient.date_of_birth)}
                      </td>
                      <td className="px-6 py-4 text-[14px] text-aneya-navy">{patient.sex}</td>
                      <td className="px-6 py-4 text-[14px] text-aneya-navy">
                        {patient.last_visit
                          ? formatDateUK(patient.last_visit.scheduled_time)
                          : <span className="text-gray-500 italic">No visits</span>
                        }
                      </td>
                      <td className="px-6 py-4 text-[14px] text-aneya-navy">
                        {patient.next_appointment
                          ? (
                            <div className="flex flex-col">
                              <span>{formatDateUK(patient.next_appointment.scheduled_time)}</span>
                              <span className="text-[12px] text-gray-500">
                                {formatTime24(patient.next_appointment.scheduled_time)}
                              </span>
                            </div>
                          )
                          : <span className="text-gray-500 italic">None</span>
                        }
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => handleEditPatient(e, patient)}
                          className="px-4 py-2 bg-aneya-teal text-white rounded-lg font-medium text-[12px] hover:bg-opacity-90 transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <PatientFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSavePatient}
          patient={editingPatient}
        />
      </div>
    </div>
  );
}
