import React, { useState } from 'react';
import { usePatientHealthSummary } from '../hooks/usePatientHealthSummary';
import { VitalsEntryForm } from './VitalsEntryForm';
import { MedicationManager } from './MedicationManager';
import { AllergyManager } from './AllergyManager';

interface PatientHealthDashboardProps {
  patientId: string;
  patientName?: string;
  readOnly?: boolean;
}

export const PatientHealthDashboard: React.FC<PatientHealthDashboardProps> = ({
  patientId,
  patientName,
  readOnly = false,
}) => {
  const { summary, loading, error, refetch } = usePatientHealthSummary(patientId);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'medications' | 'allergies'>('overview');

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal"></div>
          <p className="mt-2 text-gray-600">Loading health records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-medium">Error loading health records</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-aneya-navy">
              {patientName ? `${patientName}'s Health Records` : 'Patient Health Records'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">Comprehensive view of patient health data</p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm text-aneya-teal border border-aneya-teal rounded-md hover:bg-aneya-teal/10 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'vitals', label: 'Vital Signs' },
            { id: 'medications', label: 'Medications' },
            { id: 'allergies', label: 'Allergies' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-aneya-teal text-aneya-teal'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* Latest Vitals Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-aneya-navy">Latest Vitals</h3>
                {!readOnly && (
                  <button
                    onClick={() => setShowVitalsForm(!showVitalsForm)}
                    className="px-3 py-1.5 text-sm bg-aneya-teal text-white rounded-md hover:bg-aneya-teal/90 transition-colors"
                  >
                    {showVitalsForm ? 'Cancel' : '+ Record Vitals'}
                  </button>
                )}
              </div>

              {showVitalsForm ? (
                <VitalsEntryForm
                  patientId={patientId}
                  onSuccess={() => {
                    setShowVitalsForm(false);
                    refetch();
                  }}
                  onCancel={() => setShowVitalsForm(false)}
                />
              ) : summary?.latest_vitals ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {summary.latest_vitals.systolic_bp && summary.latest_vitals.diastolic_bp && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-600">Blood Pressure</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {summary.latest_vitals.systolic_bp}/{summary.latest_vitals.diastolic_bp}
                      </p>
                      <p className="text-xs text-gray-500">mmHg</p>
                    </div>
                  )}

                  {summary.latest_vitals.heart_rate && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-gray-600">Heart Rate</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {summary.latest_vitals.heart_rate}
                      </p>
                      <p className="text-xs text-gray-500">bpm</p>
                    </div>
                  )}

                  {summary.latest_vitals.temperature_celsius && (
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="text-xs text-gray-600">Temperature</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {summary.latest_vitals.temperature_celsius}
                      </p>
                      <p className="text-xs text-gray-500">°C</p>
                    </div>
                  )}

                  {summary.latest_vitals.spo2 && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-gray-600">SpO2</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {summary.latest_vitals.spo2}
                      </p>
                      <p className="text-xs text-gray-500">%</p>
                    </div>
                  )}

                  {summary.latest_vitals.weight_kg && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-600">Weight</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {summary.latest_vitals.weight_kg}
                      </p>
                      <p className="text-xs text-gray-500">kg</p>
                    </div>
                  )}

                  {summary.latest_vitals.height_cm && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-600">Height</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {summary.latest_vitals.height_cm}
                      </p>
                      <p className="text-xs text-gray-500">cm</p>
                    </div>
                  )}

                  {summary.latest_vitals.bmi && (
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <p className="text-xs text-gray-600">BMI</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {summary.latest_vitals.bmi}
                      </p>
                      <p className="text-xs text-gray-500">kg/m²</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No vital signs recorded</p>
              )}

              {summary?.latest_vitals && (
                <p className="mt-4 text-xs text-gray-500">
                  Recorded: {new Date(summary.latest_vitals.recorded_at).toLocaleString()}
                </p>
              )}
            </div>

            {/* Active Medications Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-aneya-navy mb-4">
                Active Medications ({summary?.active_medications?.length || 0})
              </h3>
              {summary?.active_medications && summary.active_medications.length > 0 ? (
                <div className="space-y-2">
                  {summary.active_medications.slice(0, 5).map((med) => (
                    <div key={med.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{med.medication_name}</p>
                        <p className="text-sm text-gray-600">{med.dosage} - {med.frequency}</p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                    </div>
                  ))}
                  {summary.active_medications.length > 5 && (
                    <button
                      onClick={() => setActiveTab('medications')}
                      className="w-full py-2 text-sm text-aneya-teal hover:underline"
                    >
                      View all {summary.active_medications.length} medications →
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No active medications</p>
              )}
            </div>

            {/* Allergies Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-aneya-navy mb-4">
                Allergies ({summary?.active_allergies?.length || 0})
              </h3>
              {summary?.active_allergies && summary.active_allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {summary.active_allergies.map((allergy) => (
                    <span
                      key={allergy.id}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        allergy.severity === 'severe'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : allergy.severity === 'moderate'
                          ? 'bg-orange-100 text-orange-800 border border-orange-300'
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                      }`}
                    >
                      {allergy.allergen}
                      {allergy.severity && ` (${allergy.severity})`}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-green-700 text-center py-4 bg-green-50 rounded-lg">
                  ✓ No known allergies
                </p>
              )}
            </div>

            {/* Active Conditions Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-aneya-navy mb-4">
                Active Conditions ({summary?.active_conditions?.length || 0})
              </h3>
              {summary?.active_conditions && summary.active_conditions.length > 0 ? (
                <div className="space-y-2">
                  {summary.active_conditions.map((condition) => (
                    <div key={condition.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900">{condition.condition_name}</p>
                      {condition.icd10_code && (
                        <p className="text-sm text-gray-600">ICD-10: {condition.icd10_code}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No active conditions recorded</p>
              )}
            </div>
          </>
        )}

        {activeTab === 'vitals' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <VitalsEntryForm
              patientId={patientId}
              onSuccess={() => refetch()}
            />
          </div>
        )}

        {activeTab === 'medications' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <MedicationManager patientId={patientId} readOnly={readOnly} />
          </div>
        )}

        {activeTab === 'allergies' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <AllergyManager patientId={patientId} readOnly={readOnly} />
          </div>
        )}
      </div>
    </div>
  );
};
