import { useState } from 'react';
import { InputScreen, PatientDetails } from './components/InputScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { AnalysisComplete } from './components/AnalysisComplete';
import { ReportScreen } from './components/ReportScreen';

type Screen = 'input' | 'progress' | 'complete' | 'report';

// Get API URL from environment variable or use default for local dev
const API_URL = (() => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Validate environment variable doesn't contain newlines or other invalid characters
  if (url.includes('\n') || url.includes('\r') || url.includes('%0A') || url.includes('%0D')) {
    console.error('❌ INVALID API_URL - contains newline or carriage return characters:', url);
    console.error('This is likely a configuration error. Please check your environment variables.');
    throw new Error('Invalid API_URL configuration - contains newline characters');
  }

  // Validate it's a valid URL format
  try {
    new URL(url);
  } catch (e) {
    console.error('❌ INVALID API_URL - not a valid URL format:', url);
    throw new Error('Invalid API_URL configuration - not a valid URL');
  }

  console.log('✅ API_URL validated:', url);
  return url;
})();

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('input');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [currentPatientDetails, setCurrentPatientDetails] = useState<PatientDetails | null>(null);

  const handleAnalyze = async (consultation: string, patientDetails: PatientDetails) => {
    // Validate consultation is not empty or whitespace-only
    if (!consultation.trim()) {
      alert('Please enter a clinical consultation before submitting.\n\nThe consultation text cannot be empty.');
      return;
    }

    setAnalysisResult(null); // Clear previous results
    setCurrentPatientDetails(patientDetails); // Store patient details for report

    try {
      // Check if backend is available first
      console.log('Checking backend availability...');
      console.log('API URL:', API_URL);
      try {
        const healthResponse = await fetch(`${API_URL}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (!healthResponse.ok) {
          throw new Error('Backend health check failed');
        }

        const healthData = await healthResponse.json();
        if (healthData.status !== 'healthy') {
          throw new Error('Backend is not healthy');
        }

        console.log('✅ Backend is available');
      } catch (healthError) {
        console.error('Backend unavailable:', healthError);
        alert(
          'Unable to connect to the Aneya backend server.\n\n' +
          'Please ensure the API server is running.\n' +
          'Local development: python api.py\n' +
          'Production: Check Vercel deployment logs'
        );
        return; // Don't proceed with analysis
      }

      // Backend is available, proceed to progress screen
      setCurrentScreen('progress');

      // Get user's IP address for geolocation
      let userIp = undefined;
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        userIp = ipData.ip;
        console.log('Detected user IP:', userIp);
      } catch (error) {
        console.warn('Could not detect IP address, backend will auto-detect:', error);
      }

      // Call the FastAPI backend - this is the REAL analysis
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultation,
          patient_name: patientDetails.name,
          patient_height: patientDetails.height,
          patient_weight: patientDetails.weight,
          current_medications: patientDetails.currentMedications,
          current_conditions: patientDetails.currentConditions,
          user_ip: userIp  // Send IP for geolocation
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Analysis result:', result); // Debug log

      // Check if the backend returned an error due to invalid input
      if (result.error === 'invalid_input') {
        alert(
          '⚠️ Invalid Input\n\n' +
          result.error_message + '\n\n' +
          'Examples of valid consultations:\n' +
          '• "3-year-old with fever, cough, and difficulty breathing"\n' +
          '• "Patient with chest pain and shortness of breath"\n' +
          '• "72-year-old with suspected pneumonia, productive cough"'
        );
        setCurrentScreen('input');
        return;
      }

      setAnalysisResult(result);

      // Show completion screen (which will auto-advance to report after 2 seconds)
      setCurrentScreen('complete');
    } catch (error) {
      console.error('Analysis error:', error);
      alert(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the backend is running.`);
      setCurrentScreen('input');
    }
  };

  const handleShowReport = () => {
    setCurrentScreen('report');
  };

  const handleStartNew = () => {
    setCurrentScreen('input');
    setAnalysisResult(null);
    setCurrentPatientDetails(null);
  };

  return (
    <div className="min-h-screen bg-aneya-cream">
      {/* Header */}
      <header className="bg-aneya-navy py-4 px-6 border-b border-aneya-teal sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center">
          <img src="/aneya-logo.png" alt="aneya" className="h-40" />
        </div>
      </header>

      {/* Main Content */}
      <main>
        {currentScreen === 'input' && (
          <InputScreen onAnalyze={handleAnalyze} />
        )}

        {currentScreen === 'progress' && (
          <ProgressScreen onComplete={() => setCurrentScreen('complete')} />
        )}

        {currentScreen === 'complete' && (
          <AnalysisComplete onShowReport={handleShowReport} />
        )}

        {currentScreen === 'report' && analysisResult && (
          <ReportScreen
            onStartNew={handleStartNew}
            result={analysisResult}
            patientDetails={currentPatientDetails}
          />
        )}
      </main>
    </div>
  );
}
