import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PatientAllergy {
  id: string;
  patient_id: string;
  allergen: string;
  allergen_category?: 'medication' | 'food' | 'environmental' | 'other';
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'unknown';
  onset_date?: string;
  status: 'active' | 'resolved' | 'questioned';
  recorded_by?: string;
  recorded_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CreateAllergyInput {
  patient_id: string;
  allergen: string;
  allergen_category?: 'medication' | 'food' | 'environmental' | 'other';
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'unknown';
  onset_date?: string;
  status?: 'active' | 'resolved' | 'questioned';
  notes?: string;
}

interface UpdateAllergyInput {
  status?: 'active' | 'resolved' | 'questioned';
  severity?: 'mild' | 'moderate' | 'severe' | 'unknown';
  notes?: string;
}

interface UsePatientAllergiesReturn {
  allergies: PatientAllergy[];
  loading: boolean;
  error: string | null;
  createAllergy: (input: CreateAllergyInput) => Promise<PatientAllergy | null>;
  updateAllergy: (id: string, input: UpdateAllergyInput) => Promise<PatientAllergy | null>;
  getAllergies: (patientId: string, status?: string) => Promise<PatientAllergy[]>;
}

export function usePatientAllergies(): UsePatientAllergiesReturn {
  const { user } = useAuth();
  const [allergies, setAllergies] = useState<PatientAllergy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const createAllergy = useCallback(
    async (input: CreateAllergyInput): Promise<PatientAllergy | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${apiUrl}/api/patient-allergies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to create allergy');
        }

        const data = await response.json();

        // Add to local state
        setAllergies((prev) => [data, ...prev]);

        return data;
      } catch (err) {
        console.error('Error creating allergy:', err);
        setError(err instanceof Error ? err.message : 'Failed to create allergy');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user, apiUrl]
  );

  const updateAllergy = useCallback(
    async (id: string, input: UpdateAllergyInput): Promise<PatientAllergy | null> => {
      if (!user) {
        setError('User not authenticated');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${apiUrl}/api/patient-allergies/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to update allergy');
        }

        const data = await response.json();

        // Update local state
        setAllergies((prev) =>
          prev.map((allergy) => (allergy.id === id ? data : allergy))
        );

        return data;
      } catch (err) {
        console.error('Error updating allergy:', err);
        setError(err instanceof Error ? err.message : 'Failed to update allergy');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user, apiUrl]
  );

  const getAllergies = useCallback(
    async (patientId: string, status: string = 'active'): Promise<PatientAllergy[]> => {
      if (!user) {
        setError('User not authenticated');
        return [];
      }

      try {
        setLoading(true);
        setError(null);

        const url = status
          ? `${apiUrl}/api/patient-allergies/patient/${patientId}?status=${status}`
          : `${apiUrl}/api/patient-allergies/patient/${patientId}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch allergies');
        }

        const data = await response.json();
        setAllergies(data);
        return data;
      } catch (err) {
        console.error('Error fetching allergies:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch allergies');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user, apiUrl]
  );

  return {
    allergies,
    loading,
    error,
    createAllergy,
    updateAllergy,
    getAllergies,
  };
}
