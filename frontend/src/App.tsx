import { useState } from 'react';
import { InputScreen } from './components/InputScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { AnalysisComplete } from './components/AnalysisComplete';
import { ReportScreen } from './components/ReportScreen';

type Screen = 'input' | 'progress' | 'complete' | 'report';

// Get API URL from environment variable or use default for local dev
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('input');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleAnalyze = async (consultation: string, patientId: string) => {
    // Validate consultation is not empty or whitespace-only
    if (!consultation.trim()) {
      alert('Please enter a clinical consultation before submitting.\n\nThe consultation text cannot be empty.');
      return;
    }

    setAnalysisResult(null); // Clear previous results

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
          patient_id: patientId,
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
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#351431] py-4 px-6 clara-shadow-card sticky top-0 z-30">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-white text-[28px]" style={{ fontFamily: 'Georgia, serif' }}>
            clara
          </h1>
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
          />
        )}
      </main>
    </div>
  );
}
