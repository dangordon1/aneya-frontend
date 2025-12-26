import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PatientVitals {
  id: string;
  patient_id: string;
  recorded_at: string;
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
}

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
  indication?: string;
  notes?: string;
}

interface PatientAllergy {
  id: string;
  patient_id: string;
  allergen: string;
  allergen_category?: 'medication' | 'food' | 'environmental' | 'other';
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'unknown';
  status: 'active' | 'resolved' | 'questioned';
  notes?: string;
}

interface PatientCondition {
  id: string;
  patient_id: string;
  condition_name: string;
  icd10_code?: string;
  diagnosed_date?: string;
  status: 'active' | 'resolved' | 'chronic' | 'in_remission';
  notes?: string;
}

interface PatientLabResult {
  id: string;
  patient_id: string;
  test_date: string;
  test_type: string;
  results: any;
  interpretation?: string;
  lab_name?: string;
}

interface PatientHealthSummary {
  patient_id: string;
  latest_vitals: PatientVitals | null;
  active_medications: PatientMedication[];
  active_allergies: PatientAllergy[];
  active_conditions: PatientCondition[];
  recent_lab_results: PatientLabResult[];
}

interface UsePatientHealthSummaryReturn {
  summary: PatientHealthSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePatientHealthSummary(patientId: string | null): UsePatientHealthSummaryReturn {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PatientHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!user || !patientId) {
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/patient-health-summary/${patientId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch health summary: ${response.statusText}`);
      }

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching health summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch health summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [user, patientId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  };
}
