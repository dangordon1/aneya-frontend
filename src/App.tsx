import { useState } from 'react';
import { InputScreen, PatientDetails } from './components/InputScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { AnalysisComplete } from './components/AnalysisComplete';
import { ReportScreen } from './components/ReportScreen';
import { InvalidInputScreen } from './components/InvalidInputScreen';
import { LoginScreen } from './components/LoginScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TabNavigation } from './components/TabNavigation';
import { AppointmentsTab } from './components/AppointmentsTab';
import { PatientsTab } from './components/PatientsTab';
import { PatientDetailView } from './components/PatientDetailView';
import { Patient, AppointmentWithPatient, Consultation } from './types/database';
import { useConsultations } from './hooks/useConsultations';
import { ErrorBoundary } from './components/ErrorBoundary';

type Screen = 'appointments' | 'patients' | 'patient-detail' | 'input' | 'progress' | 'complete' | 'report' | 'invalid';

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

function MainApp() {
  const { user, loading, signOut } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('appointments');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [currentPatientDetails, setCurrentPatientDetails] = useState<PatientDetails | null>(null);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [invalidInputMessage, setInvalidInputMessage] = useState<string>('');
  const [analysisErrors, setAnalysisErrors] = useState<string[]>([]);
  // NEW: State for async drug loading
  const [drugDetails, setDrugDetails] = useState<Record<string, any>>({});
  // NEW: State for transcripts
  const [consultationText, setConsultationText] = useState<string>(''); // Used for analysis (summary or transcript)
  const [consultationTranscript, setConsultationTranscript] = useState<string>(''); // Full transcript
  const [consultationSummary, setConsultationSummary] = useState<string>(''); // Summary
  const [originalTranscript, setOriginalTranscript] = useState<string>('');
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<string>('');

  // Appointment system state
  const [activeTab, setActiveTab] = useState<'appointments' | 'patients'>('appointments');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPatient | null>(null);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0); // Used to force refresh appointments
  const { saveConsultation } = useConsultations();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-aneya-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aneya-teal mx-auto mb-4"></div>
          <p className="text-aneya-navy">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  const handleAnalyze = async (
    consultation: string,
    patientDetails: PatientDetails,
    originalTranscriptParam?: string,
    detectedLanguageParam?: string,
    transcriptParam?: string,
    summaryParam?: string
  ) => {
    // Validate consultation is not empty or whitespace-only
    if (!consultation.trim()) {
      alert('Please enter a clinical consultation before submitting.\n\nThe consultation text cannot be empty.');
      return;
    }

    setAnalysisResult(null); // Clear previous results
    setCurrentPatientDetails(patientDetails); // Store patient details for report
    setStreamEvents([]); // Clear previous stream events
    setAnalysisErrors([]); // Clear previous errors
    // Store transcripts for later save
    setConsultationText(consultation); // This is what gets analyzed (summary or transcript)
    setConsultationTranscript(transcriptParam || consultation); // Full transcript
    setConsultationSummary(summaryParam || ''); // Summary if available
    setOriginalTranscript(originalTranscriptParam || '');
    setTranscriptionLanguage(detectedLanguageParam || '');

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

      // Successfully started analysis, now proceed to progress screen
      setCurrentScreen('progress');

      // Read the SSE stream
      // Check if response.body is available (Safari compatibility)
      if (!response.body) {
        console.error('ReadableStream not supported - falling back to text read');
        const text = await response.text();
        console.log('Response text:', text);
        alert('Your browser may not support real-time streaming. Please try using Chrome or Firefox.');
        setCurrentScreen('input');
        return;
      }

      const reader = response.body.getReader();
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
              setStreamEvents((prev: StreamEvent[]) => [...prev, {
                type: eventType,
                data: data,
                timestamp: Date.now()
              }]);

              // Handle different event types
              if (eventType === 'location') {
                console.log('📍 Location detected:', data.country);
              } else if (eventType === 'guideline_search') {
                console.log('🔍 Searching:', data.source);
              } else if (eventType === 'diagnoses') {
                // NEW: Diagnoses available - show report immediately!
                console.log('✅ Diagnoses ready:', data.diagnoses.length, 'diagnoses');
                console.log('⏳ Drugs pending:', data.drugs_pending.length, 'drugs');
                setAnalysisResult((prev: any) => ({ ...prev, diagnoses: data.diagnoses }));
                setCurrentScreen('report');
              } else if (eventType === 'drug_update') {
                // NEW: Individual drug details arrived
                const source = data.source || 'unknown';
                console.log(`Drug ${data.drug_name}: ${data.status} (source: ${source})`);

                if (data.status === 'complete' && data.details) {
                  // Log if LLM was used
                  if (source === 'llm') {
                    console.log(`  AI-generated drug information for ${data.drug_name}`);
                  }

                  setDrugDetails(prev => ({
                    ...prev,
                    [data.drug_name]: data.details
                  }));
                }
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
                // Handle critical API errors (credits, auth, max_tokens) - show immediately
                if (data.type === 'anthropic_credits' || data.type === 'anthropic_api') {
                  console.error('❌ Critical API error:', data.message);
                  alert(`API Error: ${data.message}`);
                  setCurrentScreen('input');
                  return;
                }
                // Handle max_tokens warning - collect as error but allow analysis to continue
                if (data.type === 'max_tokens') {
                  console.warn('⚠️ Claude max_tokens warning:', data.message);
                  setAnalysisErrors((prev: string[]) => [...prev, data.message]);
                  // Don't return - allow analysis to continue with whatever was generated
                }
                // Collect other errors but don't throw - allow analysis to complete
                console.error('Error during analysis:', data.message);
                setAnalysisErrors(prev => [...prev, data.message]);
              }
            } catch (e) {
              console.error('Error parsing event data:', e);
            }
          }
        }
      }

      if (finalResult) {
        setAnalysisResult((prev: any) => ({ ...(prev || {}), ...finalResult }));

        // Extract drug details from bnf_summaries if available
        if (finalResult.bnf_summaries && Array.isArray(finalResult.bnf_summaries)) {
          const extractedDrugDetails: Record<string, any> = {};
          for (const drugData of finalResult.bnf_summaries) {
            // Handle both BNF and DrugBank formats
            const drugName = drugData.medication || drugData.name || drugData.drug_name;
            if (drugName) {
              extractedDrugDetails[drugName] = {
                url: drugData.url || drugData.link,
                bnf_data: drugData.bnf_url ? drugData : undefined,
                drugbank_data: drugData.drugbank_id ? drugData : undefined
              };
            }
          }
          setDrugDetails(extractedDrugDetails);
          console.log(`💊 Loaded ${Object.keys(extractedDrugDetails).length} drug details from analysis result`);
        }

        // Only transition to 'complete' if we're not already showing the report
        if (currentScreen !== 'report') {
          setCurrentScreen('complete');
        }
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
    setCurrentScreen('appointments');
    setActiveTab('appointments');
    setAnalysisResult(null);
    setCurrentPatientDetails(null);
    setSelectedAppointment(null);
    setSelectedPatient(null);
    setConsultationText('');
    setOriginalTranscript('');
    setTranscriptionLanguage('');
  };

  const handleStartConsultationFromAppointment = async (appointment: AppointmentWithPatient) => {
    setSelectedAppointment(appointment);
    setSelectedPatient(appointment.patient);

    // Pre-fill patient details from patient record
    setCurrentPatientDetails({
      name: appointment.patient.name,
      sex: appointment.patient.sex,
      age: appointment.patient.date_of_birth
        ? `${new Date().getFullYear() - new Date(appointment.patient.date_of_birth).getFullYear()} years`
        : '',
      height: appointment.patient.height_cm ? `${appointment.patient.height_cm} cm` : '',
      weight: appointment.patient.weight_kg ? `${appointment.patient.weight_kg} kg` : '',
      currentMedications: appointment.patient.current_medications || '',
      currentConditions: appointment.patient.current_conditions || '',
    });

    // Update appointment status to in_progress
    try {
      await fetch(`${API_URL}/api/appointments/${appointment.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' })
      });
    } catch (error) {
      console.error('Failed to update appointment status:', error);
    }

    setCurrentScreen('input');
  };

  // Helper to build patient details from a Patient object
  const buildPatientDetails = (patient: Patient): PatientDetails => ({
    name: patient.name,
    sex: patient.sex,
    age: patient.date_of_birth
      ? `${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} years`
      : '',
    height: patient.height_cm?.toString() || patient.height?.toString() || '',
    weight: patient.weight_kg?.toString() || patient.weight?.toString() || '',
    currentMedications: Array.isArray(patient.current_medications)
      ? patient.current_medications.join(', ')
      : (patient.current_medications || ''),
    currentConditions: Array.isArray(patient.medical_conditions)
      ? patient.medical_conditions.join(', ')
      : (patient.current_conditions || ''),
    allergies: Array.isArray(patient.allergies)
      ? patient.allergies.join(', ')
      : (patient.allergies || '')
  });

  // Handler for analyzing past consultations that weren't analyzed yet
  const handleAnalyzePastConsultation = async (appointment: AppointmentWithPatient, consultation: Consultation) => {
    // Set up state with consultation data
    setSelectedAppointment(appointment);
    setSelectedPatient(appointment.patient);

    // Build patient details from patient record
    const patientDetails = buildPatientDetails(appointment.patient);

    // Get the text to analyze - prefer original_transcript, fallback to consultation_text
    const textToAnalyze = consultation.original_transcript || consultation.consultation_text || '';

    if (!textToAnalyze.trim()) {
      alert('This consultation has no transcript to analyze.');
      return;
    }

    // Store consultation ID for updating after analysis
    setConsultationText(textToAnalyze);
    setConsultationTranscript(textToAnalyze);
    setOriginalTranscript(consultation.original_transcript || '');
    setTranscriptionLanguage(consultation.transcription_language || '');
    setCurrentPatientDetails(patientDetails);

    // Clear previous state
    setAnalysisResult(null);
    setStreamEvents([]);
    setAnalysisErrors([]);
    setDrugDetails({});

    // Navigate to progress screen
    setCurrentScreen('progress');

    // Call the analyze endpoint
    try {
      // Check if backend is available first
      try {
        const healthResponse = await fetch(`${API_URL}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });

        if (!healthResponse.ok) {
          throw new Error('Backend health check failed');
        }
      } catch (healthError) {
        console.error('Backend unavailable:', healthError);
        alert(
          'Unable to connect to the Aneya backend server.\n\n' +
          'Please ensure the API server is running.'
        );
        setCurrentScreen('appointments');
        return;
      }

      // Get user's IP address for geolocation
      let userIp = undefined;
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        userIp = ipData.ip;
      } catch (error) {
        console.warn('Could not detect IP address:', error);
      }

      // Use streaming endpoint for real-time updates
      const response = await fetch(`${API_URL}/api/analyze-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultation: textToAnalyze,
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
        throw new Error(`Analysis failed: ${response.status} ${errorText}`);
      }

      // Process the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let buffer = '';
      let finalResult: any = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              setStreamEvents(prev => [...prev, {
                type: eventData.type,
                data: eventData,
                timestamp: Date.now()
              }]);

              if (eventData.type === 'complete') {
                finalResult = eventData.data;
              } else if (eventData.type === 'error') {
                setAnalysisErrors(prev => [...prev, eventData.error]);
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete data
            }
          }
        }
      }

      if (finalResult) {
        setAnalysisResult(finalResult);
        setCurrentScreen('complete');

        // Update the consultation in Supabase with the analysis results
        try {
          const { supabase } = await import('./lib/supabase');
          const { error } = await supabase
            .from('consultations')
            .update({
              analysis_result: finalResult,
              diagnoses: finalResult.diagnoses || [],
              guidelines_found: finalResult.guidelines_found || []
            })
            .eq('id', consultation.id);

          if (error) {
            console.error('Failed to update consultation with analysis:', error);
          } else {
            console.log('✅ Consultation updated with analysis results');
            // Refresh appointments to show updated data
            setAppointmentsRefreshKey(prev => prev + 1);
          }
        } catch (updateError) {
          console.error('Error updating consultation:', updateError);
        }
      } else {
        throw new Error('Analysis completed but no results received');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisErrors(prev => [...prev, String(error)]);
      alert(`Analysis failed: ${error}`);
      setCurrentScreen('appointments');
    }
  };

  // Handler for analyzing consultations from PatientDetailView (uses selectedPatient from state)
  const handleAnalyzeConsultationFromPatientView = async (consultation: Consultation) => {
    if (!selectedPatient) {
      alert('No patient selected');
      return;
    }

    // Build patient details from selected patient
    const patientDetails = buildPatientDetails(selectedPatient);

    // Get the text to analyze
    const textToAnalyze = consultation.original_transcript || consultation.consultation_text || '';

    if (!textToAnalyze.trim()) {
      alert('This consultation has no transcript to analyze.');
      return;
    }

    // Set up state
    setConsultationText(textToAnalyze);
    setConsultationTranscript(textToAnalyze);
    setOriginalTranscript(consultation.original_transcript || '');
    setTranscriptionLanguage(consultation.transcription_language || '');
    setCurrentPatientDetails(patientDetails);

    // Clear previous state
    setAnalysisResult(null);
    setStreamEvents([]);
    setAnalysisErrors([]);
    setDrugDetails({});

    // Navigate to progress screen
    setCurrentScreen('progress');

    // Call the analyze endpoint
    try {
      // Check if backend is available first
      try {
        const healthResponse = await fetch(`${API_URL}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });

        if (!healthResponse.ok) {
          throw new Error('Backend health check failed');
        }
      } catch (healthError) {
        console.error('Backend unavailable:', healthError);
        alert(
          'Unable to connect to the Aneya backend server.\n\n' +
          'Please ensure the API server is running.'
        );
        setCurrentScreen('patient-detail');
        return;
      }

      // Get user's IP address for geolocation
      let userIp = undefined;
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        userIp = ipData.ip;
      } catch (error) {
        console.warn('Could not detect IP address:', error);
      }

      // Use streaming endpoint for real-time updates
      const response = await fetch(`${API_URL}/api/analyze-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultation: textToAnalyze,
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
        throw new Error(`Analysis failed: ${response.status} ${errorText}`);
      }

      // Process the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let buffer = '';
      let finalResult: any = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              setStreamEvents(prev => [...prev, {
                type: eventData.type,
                data: eventData,
                timestamp: Date.now()
              }]);

              if (eventData.type === 'complete') {
                finalResult = eventData.data;
              } else if (eventData.type === 'error') {
                setAnalysisErrors(prev => [...prev, eventData.error]);
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete data
            }
          }
        }
      }

      if (finalResult) {
        setAnalysisResult(finalResult);
        setCurrentScreen('complete');

        // Update the consultation in Supabase with the analysis results
        try {
          const { supabase } = await import('./lib/supabase');
          const { error } = await supabase
            .from('consultations')
            .update({
              analysis_result: finalResult,
              diagnoses: finalResult.diagnoses || [],
              guidelines_found: finalResult.guidelines_found || []
            })
            .eq('id', consultation.id);

          if (error) {
            console.error('Failed to update consultation with analysis:', error);
          } else {
            console.log('✅ Consultation updated with analysis results');
          }
        } catch (updateError) {
          console.error('Error updating consultation:', updateError);
        }
      } else {
        throw new Error('Analysis completed but no results received');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisErrors(prev => [...prev, String(error)]);
      alert(`Analysis failed: ${error}`);
      setCurrentScreen('patient-detail');
    }
  };

  const handleSaveConsultation = async () => {
    if (!selectedPatient || !analysisResult) {
      console.error('Missing patient or analysis result');
      return;
    }

    try {
      // Format consultation_text with both transcript and summary
      let formattedConsultationText = '';

      if (consultationTranscript) {
        formattedConsultationText += `Consultation Transcript:\n${consultationTranscript}`;
      }

      if (consultationSummary) {
        if (formattedConsultationText) formattedConsultationText += '\n\n';
        // Handle case where consultationSummary might be an object
        const summaryText = typeof consultationSummary === 'string'
          ? consultationSummary
          : (consultationSummary as any)?.summary || JSON.stringify(consultationSummary);
        formattedConsultationText += `Consultation Summary:\n${summaryText}`;
      }

      // Fallback to consultationText if neither transcript nor summary is set
      if (!formattedConsultationText) {
        formattedConsultationText = consultationText;
      }

      // Extract summary_data from consultationSummary if available
      const summaryData = typeof consultationSummary === 'object' && consultationSummary?.consultation_data?.summary_data
        ? consultationSummary.consultation_data.summary_data
        : null;

      const consultationData = {
        appointment_id: selectedAppointment?.id || null,
        patient_id: selectedPatient.id,
        consultation_text: formattedConsultationText,
        original_transcript: originalTranscript || null,
        transcription_language: transcriptionLanguage || null,
        patient_snapshot: currentPatientDetails,
        // AI Analysis fields - populated after analyze
        analysis_result: analysisResult,
        diagnoses: analysisResult.diagnoses || [],
        guidelines_found: analysisResult.guidelines_found || [],
        // Metadata
        consultation_duration_seconds: null, // Could be calculated from recording time
        location_detected: null,
        backend_api_version: '1.0.0',
        // Full summary data for reference
        summary_data: summaryData,
      };

      const savedConsultation = await saveConsultation(consultationData);

      if (!savedConsultation) {
        alert('Failed to save consultation. Please check your connection and try again.');
        return;
      }

      // Increment refresh key to force AppointmentsTab to refetch
      setAppointmentsRefreshKey(prev => prev + 1);

      // Return to appointments
      setCurrentScreen('appointments');
      setActiveTab('appointments');
      setSelectedAppointment(null);
      setSelectedPatient(null);
      setAnalysisResult(null);
      setCurrentPatientDetails(null);
      setConsultationText('');
      setConsultationSummary(null);
      setOriginalTranscript('');
      setTranscriptionLanguage('');
    } catch (error) {
      console.error('Failed to save consultation:', error);
      alert('Failed to save consultation. Please try again.');
    }
  };

  const handleSaveConsultationOnly = async (transcript: string, summaryResponse: any, patientDetails: PatientDetails) => {
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }

    try {
      // Use unified consultation_data format from summarize API if available
      const apiConsultationData = summaryResponse?.consultation_data;

      // Extract summary text for display
      const summaryText = typeof summaryResponse === 'string'
        ? summaryResponse
        : summaryResponse?.summary || '';

      // Format consultation_text with both transcript and summary
      let formattedConsultationText = '';
      if (transcript) {
        formattedConsultationText += `Consultation Transcript:\n${transcript}`;
      }
      if (summaryText) {
        if (formattedConsultationText) formattedConsultationText += '\n\n';
        formattedConsultationText += `Consultation Summary:\n${summaryText}`;
      }

      // Build consultation data using unified format from API, with fallbacks
      const consultationData = {
        appointment_id: selectedAppointment?.id || null,
        patient_id: selectedPatient.id,
        consultation_text: formattedConsultationText || apiConsultationData?.consultation_text || transcript,
        original_transcript: apiConsultationData?.original_transcript || originalTranscript || transcript || null,
        transcription_language: apiConsultationData?.transcription_language || transcriptionLanguage || null,
        patient_snapshot: patientDetails,
        // AI Analysis fields - explicitly null/empty until analyze is called
        analysis_result: null,
        diagnoses: [],
        guidelines_found: [],
        // Metadata from API
        consultation_duration_seconds: apiConsultationData?.consultation_duration_seconds || null,
        location_detected: apiConsultationData?.location_detected || null,
        backend_api_version: apiConsultationData?.backend_api_version || '1.0.0',
        // Full summary data for reference
        summary_data: apiConsultationData?.summary_data || null,
      };

      const savedConsultation = await saveConsultation(consultationData);

      if (!savedConsultation) {
        alert('Failed to save consultation. Please check your connection and try again.');
        return;
      }

      // Increment refresh key to force AppointmentsTab to refetch
      setAppointmentsRefreshKey(prev => prev + 1);

      alert('Consultation saved successfully!');

      // Return to appointments
      setCurrentScreen('appointments');
      setActiveTab('appointments');
      setSelectedAppointment(null);
      setSelectedPatient(null);
      setCurrentPatientDetails(null);
      setConsultationText('');
      setConsultationTranscript('');
      setConsultationSummary(null);
      setOriginalTranscript('');
      setTranscriptionLanguage('');
    } catch (error) {
      console.error('Failed to save consultation:', error);
      alert('Failed to save consultation. Please try again.');
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentScreen('patient-detail');
  };

  const handleBackToPatients = () => {
    setSelectedPatient(null);
    setCurrentScreen('patients');
  };

  return (
    <div className="min-h-screen bg-aneya-cream">
      {/* Header */}
      <header className="bg-aneya-navy py-2 sm:py-4 px-4 sm:px-6 border-b border-aneya-teal sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <img src="/aneya-logo.png" alt="aneya" className="h-24 sm:h-32" />
          <button
              onClick={() => signOut()}
              className="bg-aneya-teal hover:bg-aneya-teal/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
        </div>
      </header>

      {/* Tab Navigation - only show on appointments/patients screens */}
      {(currentScreen === 'appointments' || currentScreen === 'patients' || currentScreen === 'patient-detail') && (
        <TabNavigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setCurrentScreen(tab);
          }}
        />
      )}

      {/* Main Content */}
      <main>
        {currentScreen === 'appointments' && (
          <AppointmentsTab key={appointmentsRefreshKey} onStartConsultation={handleStartConsultationFromAppointment} onAnalyzeConsultation={handleAnalyzePastConsultation} />
        )}

        {currentScreen === 'patients' && (
          <PatientsTab onSelectPatient={handleSelectPatient} />
        )}

        {currentScreen === 'patient-detail' && selectedPatient && (
          <PatientDetailView
            patient={selectedPatient}
            onBack={handleBackToPatients}
            onEditPatient={() => {
              // TODO: Implement patient editing
              console.log('Edit patient:', selectedPatient.id);
            }}
            onStartConsultation={(patient) => {
              // Create a temporary appointment-like object for consultation
              const tempAppointment: AppointmentWithPatient = {
                id: '',
                patient_id: patient.id,
                scheduled_time: new Date().toISOString(),
                duration_minutes: 30,
                status: 'scheduled',
                appointment_type: 'general',
                reason: null,
                notes: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: user!.id,
                consultation_id: null,
                cancelled_at: null,
                cancellation_reason: null,
                patient: patient
              };
              handleStartConsultationFromAppointment(tempAppointment);
            }}
            onAnalyzeConsultation={handleAnalyzeConsultationFromPatientView}
          />
        )}

        {currentScreen === 'input' && (
          <InputScreen
            onAnalyze={handleAnalyze}
            onSaveConsultation={handleSaveConsultationOnly}
            onBack={() => setCurrentScreen('appointments')}
            preFilledPatient={selectedPatient || undefined}
            appointmentContext={selectedAppointment || undefined}
          />
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
            errors={analysisErrors}
            drugDetails={drugDetails}
            appointmentContext={selectedAppointment || undefined}
            onSaveConsultation={selectedAppointment ? handleSaveConsultation : undefined}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
