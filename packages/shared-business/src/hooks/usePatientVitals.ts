import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PatientVitals {
  id: string;
  patient_id: string;
  recorded_at: string;
  recorded_by?: string;
  appointment_id?: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  temperature_celsius?: number;
  spo2?: number;
  blood_glucose_mg_dl?: number;
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CreateVitalsInput {
  patient_id: string;
  appointment_id?: string;
  consultation_form_id?: string;
  consultation_form_type?: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  temperature_celsius?: number;
  spo2?: number;
  blood_glucose_mg_dl?: number;
  weight_kg?: number;
  height_cm?: number;
  notes?: string;
  source_form_status?: string;
}

interface UsePatientVitalsReturn {
  vitals: PatientVitals[];
  loading: boolean;
  error: string | null;
  createVitals: (input: CreateVitalsInput) => Promise<PatientVitals | null>;
  getVitals: (patientId: string, limit?: number) => Promise<PatientVitals[]>;
}

export function usePatientVitals(): UsePatientVitalsReturn {
  const { user } = useAuth();
  const [vitals, setVitals] = useState<PatientVitals[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const createVitals = useCallback(
    async (input: CreateVitalsInput): Promise<PatientVitals | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${apiUrl}/api/patient-vitals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to create vitals record');
        }

        const data = await response.json();

        // Add to local state
        setVitals((prev) => [data, ...prev]);

        return data;
      } catch (err) {
        console.error('Error creating vitals:', err);
        setError(err instanceof Error ? err.message : 'Failed to create vitals');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user, apiUrl]
  );

  const getVitals = useCallback(
    async (patientId: string, limit: number = 10): Promise<PatientVitals[]> => {
      if (!user) {
        setError('User not authenticated');
        return [];
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${apiUrl}/api/patient-vitals/patient/${patientId}?limit=${limit}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch vitals');
        }

        const data = await response.json();
        setVitals(data);
        return data;
      } catch (err) {
        console.error('Error fetching vitals:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch vitals');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user, apiUrl]
  );

  return {
    vitals,
    loading,
    error,
    createVitals,
    getVitals,
  };
}
