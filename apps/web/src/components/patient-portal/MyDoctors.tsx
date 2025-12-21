import { useState, useEffect } from 'react';
import { usePatientDoctors } from '../../hooks/usePatientDoctors';
import { supabase } from '../../lib/supabase';
import type { Doctor } from '../../types/database';

interface Props {
  onBack: () => void;
}

export function MyDoctors({ onBack: _onBack }: Props) {
  const { myDoctors, loading, error, requestDoctor, refresh } = usePatientDoctors();
  const [showFindDoctor, setShowFindDoctor] = useState(false);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const activeDoctors = myDoctors.filter(rel => rel.status === 'active');
  const pendingDoctors = myDoctors.filter(rel => rel.status === 'pending');

  // Fetch all available doctors when Find Doctor is shown
  useEffect(() => {
    if (showFindDoctor) {
      fetchAllDoctors();
    }
  }, [showFindDoctor]);

  const fetchAllDoctors = async () => {
    console.log('🔍 Fetching all active doctors...');
    setLoadingDoctors(true);
    try {
      // Fetch all active doctors from the doctors table
      // Doctors are added to this table when they sign up via AuthContext
      const { data, error: fetchError } = await supabase
        .from('doctors')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (fetchError) {
        console.error('❌ Error fetching doctors:', fetchError);
        throw fetchError;
      }
      console.log('✅ Fetched doctors:', data?.length || 0, 'doctors found');
      console.log('📋 Doctor data:', data);
      setAllDoctors(data || []);
    } catch (err) {
      console.error('❌ Error fetching doctors:', err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Get doctor IDs that patient already has relationship with
  const existingDoctorIds = myDoctors.map(rel => rel.doctor_id);

  // Filter available doctors (not already connected)
  const availableDoctors = allDoctors.filter(
    doctor => !existingDoctorIds.includes(doctor.id)
  ).filter(doctor =>
    searchTerm === '' ||
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doctor.specialty?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doctor.clinic_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRequestDoctor = async (doctorId: string) => {
    setRequestingId(doctorId);
    setRequestError(null);
    setRequestSuccess(null);

    try {
      const result = await requestDoctor(doctorId);
      if (result) {
        setRequestSuccess('Request sent! The doctor will review your request.');
        setTimeout(() => {
          setShowFindDoctor(false);
          setRequestSuccess(null);
          refresh();
        }, 2000);
      } else {
        setRequestError('Failed to send request. Please try again.');
      }
    } catch (err) {
      setRequestError('Failed to send request. Please try again.');
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back button for Find Doctor view */}
      {showFindDoctor && (
        <button
          onClick={() => setShowFindDoctor(false)}
          className="mb-4 text-aneya-cream/80 hover:text-aneya-cream flex items-center gap-2 text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to My Doctors
        </button>
      )}

      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {showFindDoctor ? (
          /* Find Doctor View */
          <>
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, specialty, or clinic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-aneya-teal"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {requestSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {requestSuccess}
              </div>
            )}

            {requestError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {requestError}
              </div>
            )}

            {loadingDoctors ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal mx-auto"></div>
              </div>
            ) : availableDoctors.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-aneya-navy mb-2">No Doctors Found</h3>
                <p className="text-gray-500 text-sm">
                  {searchTerm ? 'Try a different search term.' : 'No available doctors to connect with.'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-aneya-navy">Available Doctors</h3>
                  <p className="text-sm text-gray-500">{availableDoctors.length} doctors found</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {availableDoctors.map(doctor => (
                    <div key={doctor.id} className="p-4 flex items-start gap-4">
                      <div className="w-12 h-12 bg-aneya-teal/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-aneya-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-aneya-navy">{doctor.name}</h4>
                        {doctor.specialty && (
                          <p className="text-sm text-gray-600">{doctor.specialty}</p>
                        )}
                        {doctor.clinic_name && (
                          <p className="text-sm text-gray-500">{doctor.clinic_name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRequestDoctor(doctor.id)}
                        disabled={requestingId === doctor.id}
                        className="px-4 py-2 bg-aneya-teal text-white text-sm font-medium rounded-lg hover:bg-aneya-teal/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {requestingId === doctor.id ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Requesting...
                          </span>
                        ) : (
                          'Request Care'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </>
        ) : (
          /* My Doctors View */
          <>
            {/* Find Doctor Button */}
            <button
              onClick={() => setShowFindDoctor(true)}
              className="w-full bg-aneya-teal text-white py-3 px-4 rounded-xl font-medium hover:bg-aneya-teal/90 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Find a Doctor
            </button>

            {loading ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal mx-auto"></div>
              </div>
            ) : myDoctors.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-aneya-navy mb-2">No Doctors Yet</h3>
                <p className="text-gray-500 text-sm mb-4">
                  You don't have any doctors assigned yet. Find a doctor to request care.
                </p>
                <button
                  onClick={() => setShowFindDoctor(true)}
                  className="text-aneya-teal hover:text-aneya-teal/80 font-medium"
                >
                  Find a Doctor
                </button>
              </div>
            ) : (
              <>
                {/* Active Doctors */}
                {activeDoctors.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-aneya-navy">My Doctors</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {activeDoctors.map(rel => (
                        <DoctorCard key={rel.id} doctor={rel.doctor} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Doctors */}
                {pendingDoctors.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-aneya-navy">Pending Requests</h3>
                      <p className="text-sm text-gray-500">Waiting for doctor approval</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {pendingDoctors.map(rel => (
                        <DoctorCard key={rel.id} doctor={rel.doctor} isPending />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DoctorCard({ doctor, isPending }: { doctor: Doctor; isPending?: boolean }) {
  return (
    <div className="p-4 flex items-start gap-4">
      <div className="w-12 h-12 bg-aneya-teal/10 rounded-full flex items-center justify-center flex-shrink-0">
        <svg className="w-6 h-6 text-aneya-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-aneya-navy">{doctor.name}</h4>
          {isPending && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              Pending
            </span>
          )}
        </div>
        {doctor.specialty && (
          <p className="text-sm text-gray-600">{doctor.specialty}</p>
        )}
        {doctor.clinic_name && (
          <p className="text-sm text-gray-500">{doctor.clinic_name}</p>
        )}
        {doctor.phone && (
          <p className="text-sm text-gray-400 mt-1">{doctor.phone}</p>
        )}
      </div>
    </div>
  );
}
