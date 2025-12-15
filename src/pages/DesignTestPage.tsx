/**
 * Design Test Page
 *
 * Use this page to test different ReportScreen designs with mock data.
 * Access at: http://localhost:5173/design-test
 *
 * Features:
 * - Load mock consultation data without calling backend
 * - Switch between different test scenarios
 * - Compare design variations
 */

import { useState } from 'react';
import { ReportScreen } from '../components/ReportScreen';
import { ReportScreenV2 } from '../components/ReportScreenV2';
import {
  communityPneumoniaResult,
  communityPneumoniaPatientDetails,
  communityPneumoniaDrugDetails
} from '../../test-data/community-pneumonia-mock';

// Add more mock scenarios here as you generate them
const MOCK_SCENARIOS = {
  'community-pneumonia': {
    name: 'Community-Acquired Pneumonia',
    result: communityPneumoniaResult,
    patientDetails: communityPneumoniaPatientDetails,
    drugDetails: communityPneumoniaDrugDetails,
  },
};

type ScenarioKey = keyof typeof MOCK_SCENARIOS;
type DesignVersion = 'v1' | 'v2';

export function DesignTestPage() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>('community-pneumonia');
  const [showErrors, setShowErrors] = useState(false);
  const [designVersion, setDesignVersion] = useState<DesignVersion>('v2');

  const scenario = MOCK_SCENARIOS[selectedScenario];

  // Mock errors for testing error display
  const mockErrors = showErrors
    ? [
        'Drug lookup failed for Amoxicillin - BNF server timeout',
        'Could not retrieve full guideline content for NG114',
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Design Test Controls */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Design Test Mode</h1>
              <p className="text-sm text-gray-500">Testing report designs with mock data</p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Design Version Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setDesignVersion('v1')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    designVersion === 'v1'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Original (V1)
                </button>
                <button
                  onClick={() => setDesignVersion('v2')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    designVersion === 'v2'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Clean Clinical (V2)
                </button>
              </div>

              {/* Scenario Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Scenario:</label>
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value as ScenarioKey)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                >
                  {Object.entries(MOCK_SCENARIOS).map(([key, data]) => (
                    <option key={key} value={key}>
                      {data.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Show Errors Toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showErrors}
                  onChange={(e) => setShowErrors(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Show errors
              </label>

              {/* Link back to main app */}
              <a
                href="/"
                className="text-sm text-blue-600 hover:underline"
              >
                Back to app
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="mx-auto my-8">
        {designVersion === 'v1' ? (
          <div className="bg-white shadow-lg mx-auto max-w-5xl">
            <ReportScreen
              onStartNew={() => alert('Start new clicked - this is design test mode')}
              result={scenario.result}
              patientDetails={scenario.patientDetails}
              drugDetails={scenario.drugDetails}
              errors={mockErrors}
            />
          </div>
        ) : (
          <ReportScreenV2
            onStartNew={() => alert('Start new clicked - this is design test mode')}
            result={scenario.result}
            patientDetails={scenario.patientDetails}
            drugDetails={scenario.drugDetails}
            errors={mockErrors}
          />
        )}
      </div>

      {/* Debug Panel */}
      <div className="max-w-3xl mx-auto px-6 pb-8">
        <details className="bg-gray-800 text-white rounded-lg overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer hover:bg-gray-700 text-sm">
            Debug: View Raw JSON Data
          </summary>
          <pre className="p-4 text-xs overflow-x-auto max-h-96 overflow-y-auto">
            {JSON.stringify(scenario.result, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
