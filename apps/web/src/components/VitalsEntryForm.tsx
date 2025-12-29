import React, { useState } from 'react';
import { usePatientVitals } from '../hooks/usePatientVitals';

interface VitalsEntryFormProps {
  patientId: string;
  appointmentId?: string;
  consultationFormId?: string;
  consultationFormType?: string;
  onSuccess?: (vitalsId: string) => void;
  onCancel?: () => void;
}

export const VitalsEntryForm: React.FC<VitalsEntryFormProps> = ({
  patientId,
  appointmentId,
  consultationFormId,
  consultationFormType,
  onSuccess,
  onCancel,
}) => {
  const { createVitals, loading, error } = usePatientVitals();

  const [formData, setFormData] = useState({
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    respiratory_rate: '',
    temperature_celsius: '',
    spo2: '',
    blood_glucose_mg_dl: '',
    weight_kg: '',
    height_cm: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare data, converting empty strings to undefined and strings to numbers
    const vitalsData: any = {
      patient_id: patientId,
      appointment_id: appointmentId,
      consultation_form_id: consultationFormId,
      consultation_form_type: consultationFormType,
    };

    if (formData.systolic_bp) vitalsData.systolic_bp = parseInt(formData.systolic_bp);
    if (formData.diastolic_bp) vitalsData.diastolic_bp = parseInt(formData.diastolic_bp);
    if (formData.heart_rate) vitalsData.heart_rate = parseInt(formData.heart_rate);
    if (formData.respiratory_rate) vitalsData.respiratory_rate = parseInt(formData.respiratory_rate);
    if (formData.temperature_celsius) vitalsData.temperature_celsius = parseFloat(formData.temperature_celsius);
    if (formData.spo2) vitalsData.spo2 = parseInt(formData.spo2);
    if (formData.blood_glucose_mg_dl) vitalsData.blood_glucose_mg_dl = parseInt(formData.blood_glucose_mg_dl);
    if (formData.weight_kg) vitalsData.weight_kg = parseFloat(formData.weight_kg);
    if (formData.height_cm) vitalsData.height_cm = parseFloat(formData.height_cm);
    if (formData.notes) vitalsData.notes = formData.notes;

    const result = await createVitals(vitalsData);

    if (result && onSuccess) {
      onSuccess(result.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-aneya-navy mb-4">Record Vital Signs</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Blood Pressure */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Systolic BP (mmHg)
            </label>
            <input
              type="number"
              name="systolic_bp"
              value={formData.systolic_bp}
              onChange={handleChange}
              placeholder="120"
              min="0"
              max="300"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diastolic BP (mmHg)
            </label>
            <input
              type="number"
              name="diastolic_bp"
              value={formData.diastolic_bp}
              onChange={handleChange}
              placeholder="80"
              min="0"
              max="200"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
            />
          </div>
        </div>

        {/* Heart Rate & Respiratory Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Heart Rate (bpm)
            </label>
            <input
              type="number"
              name="heart_rate"
              value={formData.heart_rate}
              onChange={handleChange}
              placeholder="72"
              min="0"
              max="300"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Respiratory Rate (breaths/min)
            </label>
            <input
              type="number"
              name="respiratory_rate"
              value={formData.respiratory_rate}
              onChange={handleChange}
              placeholder="16"
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
            />
          </div>
        </div>

        {/* Temperature & SpO2 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature (°C)
            </label>
            <input
              type="number"
              name="temperature_celsius"
              value={formData.temperature_celsius}
              onChange={handleChange}
              placeholder="36.5"
              step="0.1"
              min="30"
              max="45"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SpO2 (%)
            </label>
            <input
              type="number"
              name="spo2"
              value={formData.spo2}
              onChange={handleChange}
              placeholder="98"
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
            />
          </div>
        </div>

        {/* Blood Glucose */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Blood Glucose (mg/dL)
          </label>
          <input
            type="number"
            name="blood_glucose_mg_dl"
            value={formData.blood_glucose_mg_dl}
            onChange={handleChange}
            placeholder="100"
            min="0"
            max="1000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
          />
        </div>

        {/* Weight & Height */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight (kg)
            </label>
            <input
              type="number"
              name="weight_kg"
              value={formData.weight_kg}
              onChange={handleChange}
              placeholder="70.0"
              step="0.1"
              min="0"
              max="500"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Height (cm)
            </label>
            <input
              type="number"
              name="height_cm"
              value={formData.height_cm}
              onChange={handleChange}
              placeholder="170.0"
              step="0.1"
              min="0"
              max="300"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
            />
          </div>
        </div>

        {/* BMI Preview */}
        {formData.weight_kg && formData.height_cm && (
          <div className="p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-900">
              <strong>Calculated BMI:</strong>{' '}
              {(
                parseFloat(formData.weight_kg) /
                Math.pow(parseFloat(formData.height_cm) / 100, 2)
              ).toFixed(1)}
            </p>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Any additional observations..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-aneya-teal focus:border-aneya-teal"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-aneya-teal text-white rounded-md hover:bg-aneya-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Save Vitals'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
