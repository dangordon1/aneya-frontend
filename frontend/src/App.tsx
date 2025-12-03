import { useState } from 'react';
import { InputScreen, PatientDetails } from './components/InputScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { AnalysisComplete } from './components/AnalysisComplete';
import { ReportScreen } from './components/ReportScreen';
import { InvalidInputScreen } from './components/InvalidInputScreen';

type Screen = 'input' | 'progress' | 'complete' | 'report' | 'invalid';

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

interface StreamEvent {
  type: string;
  data: any;
  timestamp: number;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('input');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [currentPatientDetails, setCurrentPatientDetails] = useState<PatientDetails | null>(null);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [invalidInputMessage, setInvalidInputMessage] = useState<string>('');

  const handleAnalyze = async (consultation: string, patientDetails: PatientDetails) => {
    // Validate consultation is not empty or whitespace-only
    if (!consultation.trim()) {
      alert('Please enter a clinical consultation before submitting.\n\nThe consultation text cannot be empty.');
      return;
    }

    setAnalysisResult(null); // Clear previous results
    setCurrentPatientDetails(patientDetails); // Store patient details for report
    setStreamEvents([]); // Clear previous stream events

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

      // Use streaming endpoint for real-time updates
      const response = await fetch(`${API_URL}/api/analyze-stream`, {
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
          user_ip: userIp
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`Analysis failed: ${response.status}`);
      }

      // Read the SSE stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;

      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete event in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventLines = line.split('\n');
          let eventType = '';
          let eventData = '';

          for (const l of eventLines) {
            if (l.startsWith('event: ')) {
              eventType = l.substring(7);
            } else if (l.startsWith('data: ')) {
              eventData = l.substring(6);
            }
          }

          if (eventType && eventData) {
            try {
              const data = JSON.parse(eventData);
              console.log(`SSE Event: ${eventType}`, data);

              // Add event to state for real-time display
              setStreamEvents(prev => [...prev, {
                type: eventType,
                data: data,
                timestamp: Date.now()
              }]);

              // Handle different event types
              if (eventType === 'location') {
                console.log('📍 Location detected:', data.country);
              } else if (eventType === 'guideline_search') {
                console.log('🔍 Searching:', data.source);
              } else if (eventType === 'bnf_drug') {
                console.log(`💊 Drug ${data.medication}: ${data.status}`);
              } else if (eventType === 'complete') {
                finalResult = data;
              } else if (eventType === 'error') {
                if (data.type === 'invalid_input') {
                  setInvalidInputMessage(data.message);
                  setCurrentScreen('invalid');
                  return;
                }
                throw new Error(data.message);
              }
            } catch (e) {
              console.error('Error parsing event data:', e);
            }
          }
        }
      }

      if (finalResult) {
        setAnalysisResult(finalResult);
        setCurrentScreen('complete');
      }
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
          <ProgressScreen
            onComplete={() => setCurrentScreen('complete')}
            streamEvents={streamEvents}
          />
        )}

        {currentScreen === 'invalid' && (
          <InvalidInputScreen
            errorMessage={invalidInputMessage}
            onReturnHome={handleStartNew}
          />
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
