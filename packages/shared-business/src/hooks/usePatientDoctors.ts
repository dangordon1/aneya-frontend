import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { PatientDoctor, PatientDoctorWithDoctor, PatientDoctorWithPatient, PatientDoctorStatus } from '../types/database';

interface UsePatientDoctorsReturn {
  // For patients: list of their doctors
  myDoctors: PatientDoctorWithDoctor[];
  // For doctors: list of their patients
  myPatients: PatientDoctorWithPatient[];
  loading: boolean;
  error: string | null;
  // Patient actions
  requestDoctor: (doctorId: string) => Promise<PatientDoctor | null>;
  acceptDoctorInvite: (relationshipId: string) => Promise<boolean>;
  rejectDoctorInvite: (relationshipId: string) => Promise<boolean>;
  // Doctor actions
  invitePatient: (patientId: string) => Promise<PatientDoctor | null>;
  acceptPatientRequest: (relationshipId: string) => Promise<boolean>;
  rejectPatientRequest: (relationshipId: string) => Promise<boolean>;
  // Common actions
  removeRelationship: (relationshipId: string) => Promise<boolean>;
  updateStatus: (relationshipId: string, status: PatientDoctorStatus) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function usePatientDoctors(): UsePatientDoctorsReturn {
  const { patientProfile, doctorProfile, isPatient, isDoctor } = useAuth();
  const [myDoctors, setMyDoctors] = useState<PatientDoctorWithDoctor[]>([]);
  const [myPatients, setMyPatients] = useState<PatientDoctorWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRelationships = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch patient's doctors
      if (isPatient && patientProfile?.id) {
        const { data: doctorData, error: doctorError } = await supabase
          .from('patient_doctor')
          .select(`
            *,
            doctor:doctors(*)
          `)
          .eq('patient_id', patientProfile.id)
          .order('created_at', { ascending: false });

        if (doctorError) throw doctorError;
        setMyDoctors(doctorData || []);
      }

      // Fetch doctor's patients
      if (isDoctor && doctorProfile?.id) {
        const { data: patientData, error: patientError } = await supabase
          .from('patient_doctor')
          .select(`
            *,
            patient:patients(*)
          `)
          .eq('doctor_id', doctorProfile.id)
          .order('created_at', { ascending: false });

        if (patientError) throw patientError;
        setMyPatients(patientData || []);
      }
    } catch (err) {
      console.error('Error fetching relationships:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch relationships');
    } finally {
      setLoading(false);
    }
  }, [isPatient, isDoctor, patientProfile?.id, doctorProfile?.id]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  // Patient requests to be added to a doctor
  const requestDoctor = async (doctorId: string): Promise<PatientDoctor | null> => {
    if (!patientProfile?.id) {
      setError('No patient profile available');
      return null;
    }

    try {
      const { data, error: createError } = await supabase
        .from('patient_doctor')
        .insert({
          patient_id: patientProfile.id,
          doctor_id: doctorId,
          initiated_by: 'patient',
          status: 'pending'
        })
        .select()
        .single();

      if (createError) throw createError;
      await fetchRelationships();
      return data;
    } catch (err) {
      console.error('Error requesting doctor:', err);
      setError(err instanceof Error ? err.message : 'Failed to request doctor');
      return null;
    }
  };

  // Doctor invites a patient
  const invitePatient = async (patientId: string): Promise<PatientDoctor | null> => {
    if (!doctorProfile?.id) {
      setError('No doctor profile available');
      return null;
    }

    try {
      const { data, error: createError } = await supabase
        .from('patient_doctor')
        .insert({
          patient_id: patientId,
          doctor_id: doctorProfile.id,
          initiated_by: 'doctor',
          status: 'active' // Auto-accept when doctor initiates
        })
        .select()
        .single();

      if (createError) throw createError;
      await fetchRelationships();
      return data;
    } catch (err) {
      console.error('Error inviting patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to invite patient');
      return null;
    }
  };

  const updateStatus = async (relationshipId: string, status: PatientDoctorStatus): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('patient_doctor')
        .update({ status })
        .eq('id', relationshipId);

      if (updateError) throw updateError;
      await fetchRelationships();
      return true;
    } catch (err) {
      console.error('Error updating relationship status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
      return false;
    }
  };

  const acceptDoctorInvite = async (relationshipId: string): Promise<boolean> => {
    return updateStatus(relationshipId, 'active');
  };

  const rejectDoctorInvite = async (relationshipId: string): Promise<boolean> => {
    return updateStatus(relationshipId, 'rejected');
  };

  const acceptPatientRequest = async (relationshipId: string): Promise<boolean> => {
    return updateStatus(relationshipId, 'active');
  };

  const rejectPatientRequest = async (relationshipId: string): Promise<boolean> => {
    return updateStatus(relationshipId, 'rejected');
  };

  const removeRelationship = async (relationshipId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('patient_doctor')
        .delete()
        .eq('id', relationshipId);

      if (deleteError) throw deleteError;
      await fetchRelationships();
      return true;
    } catch (err) {
      console.error('Error removing relationship:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove relationship');
      return false;
    }
  };

  return {
    myDoctors,
    myPatients,
    loading,
    error,
    requestDoctor,
    acceptDoctorInvite,
    rejectDoctorInvite,
    invitePatient,
    acceptPatientRequest,
    rejectPatientRequest,
    removeRelationship,
    updateStatus,
    refresh: fetchRelationships
  };
}
