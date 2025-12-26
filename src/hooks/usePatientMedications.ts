import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PatientMedication {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route?: string;
  started_date: string;
  stopped_date?: string;
  status: 'active' | 'stopped' | 'completed';
  prescribed_by?: string;
  prescribed_at?: string;
  appointment_id?: string;
  indication?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CreateMedicationInput {
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route?: string;
  started_date?: string;
  stopped_date?: string;
  status?: 'active' | 'stopped' | 'completed';
  appointment_id?: string;
  indication?: string;
  notes?: string;
}

interface UpdateMedicationInput {
  stopped_date?: string;
  status?: 'active' | 'stopped' | 'completed';
  notes?: string;
}

interface UsePatientMedicationsReturn {
  medications: PatientMedication[];
  loading: boolean;
  error: string | null;
  createMedication: (input: CreateMedicationInput) => Promise<PatientMedication | null>;
  updateMedication: (id: string, input: UpdateMedicationInput) => Promise<PatientMedication | null>;
  getMedications: (patientId: string, status?: string) => Promise<PatientMedication[]>;
}

export function usePatientMedications(): UsePatientMedicationsReturn {
  const { user } = useAuth();
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const createMedication = useCallback(
    async (input: CreateMedicationInput): Promise<PatientMedication | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${apiUrl}/api/patient-medications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to create medication');
        }

        const data = await response.json();

        // Add to local state
        setMedications((prev) => [data, ...prev]);

        return data;
      } catch (err) {
        console.error('Error creating medication:', err);
        setError(err instanceof Error ? err.message : 'Failed to create medication');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user, apiUrl]
  );

  const updateMedication = useCallback(
    async (id: string, input: UpdateMedicationInput): Promise<PatientMedication | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${apiUrl}/api/patient-medications/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to update medication');
        }

        const data = await response.json();

        // Update local state
        setMedications((prev) =>
          prev.map((med) => (med.id === id ? data : med))
        );

        return data;
      } catch (err) {
        console.error('Error updating medication:', err);
        setError(err instanceof Error ? err.message : 'Failed to update medication');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user, apiUrl]
  );

  const getMedications = useCallback(
    async (patientId: string, status?: string): Promise<PatientMedication[]> => {
      if (!user) {
        setError('User not authenticated');
        return [];
      }

      try {
        setLoading(true);
        setError(null);

        const url = status
          ? `${apiUrl}/api/patient-medications/patient/${patientId}?status=${status}`
          : `${apiUrl}/api/patient-medications/patient/${patientId}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch medications');
        }

        const data = await response.json();
        setMedications(data);
        return data;
      } catch (err) {
        console.error('Error fetching medications:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch medications');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user, apiUrl]
  );

  return {
    medications,
    loading,
    error,
    createMedication,
    updateMedication,
    getMedications,
  };
}
