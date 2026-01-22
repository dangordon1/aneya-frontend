import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Download } from 'lucide-react';
import { LandingPage } from './components/LandingPage';
import { LoginScreen } from './components/LoginScreen';
import OTPVerificationScreen from './components/OTPVerificationScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TabNavigation, DoctorTab } from './components/TabNavigation';
import { LocationSelector } from './components/LocationSelector';
import { BranchIndicator } from './components/BranchIndicator';
import { Patient, AppointmentWithPatient, Consultation } from './types/database';
import { useConsultations } from './hooks/useConsultations';
import { useAppointments } from './hooks/useAppointments';
import { useMessages } from './hooks/useMessages';
import { usePatientDoctors } from './hooks/usePatientDoctors';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PatientDashboard } from './components/patient-portal/PatientDashboard';
import { getPatientAge } from './utils/dateHelpers';

// Helper function for timestamped logging
const timestamp = () => new Date().toISOString();

// Dynamic imports for code splitting - these components load on demand
const InputScreen = lazy(() => import('./components/InputScreen').then(m => ({ default: m.InputScreen })));
const ProgressScreen = lazy(() => import('./components/ProgressScreen').then(m => ({ default: m.ProgressScreen })));
const AnalysisComplete = lazy(() => import('./components/AnalysisComplete').then(m => ({ default: m.AnalysisComplete })));
const ReportScreen = lazy(() => import('./components/ReportScreenV2').then(m => ({ default: m.ReportScreenV2 })));
const InvalidInputScreen = lazy(() => import('./components/InvalidInputScreen').then(m => ({ default: m.InvalidInputScreen })));
const FeedbackDashboard = lazy(() => import('./components/FeedbackDashboard').then(m => ({ default: m.FeedbackDashboard })));
const AppointmentsTab = lazy(() => import('./components/AppointmentsTab').then(m => ({ default: m.AppointmentsTab })));
const PatientsTab = lazy(() => import('./components/PatientsTab').then(m => ({ default: m.PatientsTab })));
const PatientDetailView = lazy(() => import('./components/PatientDetailView').then(m => ({ default: m.PatientDetailView })));
// InvitePatientsTab removed - feature disabled for now
const DoctorMessages = lazy(() => import('./components/doctor-portal/DoctorMessages').then(m => ({ default: m.DoctorMessages })));
const DoctorProfileTab = lazy(() => import('./components/doctor-portal/DoctorProfileTab').then(m => ({ default: m.DoctorProfileTab })));
const CustomFormsTab = lazy(() => import('./components/doctor-portal/CustomFormsTab').then(m => ({ default: m.CustomFormsTab })));
const AllDoctorsTab = lazy(() => import('./components/AllDoctorsTab').then(m => ({ default: m.AllDoctorsTab })));
const DesignTestPage = lazy(() => import('./pages/DesignTestPage').then(m => ({ default: m.DesignTestPage })));
// ✨ FIX: Import statically to avoid mixed import patterns (these are also used by other components)
// Lazy loading these causes "Importing a module script failed" errors in production
import { EditableDoctorReportCard } from './components/doctor-portal/EditableDoctorReportCard';

// Import PatientDetails type
import type { PatientDetails } from './components/InputScreen';

type Screen = 'appointments' | 'patients' | 'patient-detail' | 'input' | 'progress' | 'complete' | 'report' | 'invalid' | 'messages' | 'profile' | 'forms' | 'alldoctors' | 'infertility-form' | 'view-consultation-form' | 'feedback-dashboard';

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
  const { user, loading, signIn, signOut, isPatient, userRole, doctorProfile, isAdmin, pendingVerification, clearPendingVerification } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('appointments');
  const [showLoginScreen, setShowLoginScreen] = useState(false); // For landing page -> login flow
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [currentPatientDetails, setCurrentPatientDetails] = useState<PatientDetails | null>(null);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [invalidInputMessage, setInvalidInputMessage] = useState<string>('');
  const [analysisErrors, setAnalysisErrors] = useState<string[]>([]);
  // NEW: State for async drug loading
  const [drugDetails, setDrugDetails] = useState<Record<string, any>>({});
  const [drugsPending, setDrugsPending] = useState<string[]>([]);
  // NEW: State for transcripts
  const [consultationText, setConsultationText] = useState<string>(''); // Used for analysis (summary or transcript)
  const [consultationTranscript, setConsultationTranscript] = useState<string>(''); // Full transcript
  const [consultationSummary, setConsultationSummary] = useState<string>(''); // Summary
  const [originalTranscript, setOriginalTranscript] = useState<string>('');
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<string>('');
  // Location override for testing different regional guidelines
  const [locationOverride, setLocationOverride] = useState<string | null>(null);

  // Consultation ID for feedback system (captured after saving consultation)
  const [currentConsultationId, setCurrentConsultationId] = useState<string | null>(null);

  // Appointment system state
  const [activeTab, setActiveTab] = useState<DoctorTab>('appointments');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPatient | null>(null);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0); // Used to force refresh appointments
  const [appointmentForFormView, setAppointmentForFormView] = useState<AppointmentWithPatient | null>(null); // For viewing consultation forms
  const [consultationForFormView, setConsultationForFormView] = useState<Consultation | null>(null); // Consultation data for form view
  const [generatingPdf, setGeneratingPdf] = useState(false); // PDF generation state for view consultation form screen
  const { saveConsultation } = useConsultations();
  const { createAppointment } = useAppointments();

  // Messaging state - for unread counts and pending care requests
  const { unreadCount } = useMessages();
  const { myPatients } = usePatientDoctors();
  // Compute pending requests count from patients with pending status initiated by patient
  const pendingRequestsCount = myPatients.filter(rel => rel.status === 'pending' && rel.initiated_by === 'patient').length;

  // Check if doctor profile needs to be created or is incomplete
  // This applies when: user is a doctor AND (no profile exists OR profile is missing required fields)
  // Required fields:
  // - name: must be properly filled out (not empty, and must contain a space indicating full name)
  //   Auto-generated names from email prefix (e.g., "danielgordon54") don't have spaces
  // - specialty: must be explicitly selected (not null)
  // AND not during OTP verification (to avoid race condition during sign-up)
  const hasProperName = doctorProfile?.name &&
    doctorProfile.name.trim() !== '' &&
    doctorProfile.name.trim().includes(' ');
  // Fix: Use truthy check for specialty - handles null, undefined, empty string
  const hasSpecialty = !!doctorProfile?.specialty;
  const isProfileIncomplete = !doctorProfile || !hasProperName || !hasSpecialty;
  const needsProfileSetup = userRole === 'doctor' && isProfileIncomplete && !pendingVerification;

  // Debug logging to understand needsProfileSetup state
  console.log('🔍 needsProfileSetup check:', {
    userRole,
    doctorProfile: doctorProfile ? { name: doctorProfile.name, specialty: doctorProfile.specialty } : null,
    hasProperName,
    hasSpecialty,
    isProfileIncomplete,
    pendingVerification: !!pendingVerification,
    needsProfileSetup
  });

  // Track previous needsProfileSetup state to detect completion
  const prevNeedsProfileSetup = useRef(needsProfileSetup);

  // Redirect to profile page if doctor profile needs setup
  // This runs on mount and whenever profile changes or user tries to navigate away
  useEffect(() => {
    if (needsProfileSetup && currentScreen !== 'profile') {
      console.log('⚠️ Doctor profile needs setup - redirecting to profile page');
      setCurrentScreen('profile');
      setActiveTab('profile');
    }
  }, [doctorProfile, currentScreen, needsProfileSetup, userRole]);

  // Redirect to appointments when profile setup is completed
  useEffect(() => {
    if (prevNeedsProfileSetup.current && !needsProfileSetup) {
      console.log('✅ Doctor profile setup completed - redirecting to appointments');
      setCurrentScreen('appointments');
      setActiveTab('appointments');
    }
    prevNeedsProfileSetup.current = needsProfileSetup;
  }, [needsProfileSetup]);

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

  // Wait for userRole to be determined before proceeding
  // This fixes the race condition where user is authenticated but role hasn't loaded yet
  // (especially common with Google SSO where state updates may not have propagated)
  if (user && userRole === null) {
    console.log('⏳ User authenticated but userRole not yet determined, showing loading...');
    return (
      <div className="min-h-screen bg-aneya-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aneya-teal mx-auto mb-4"></div>
          <p className="text-aneya-navy">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Show OTP verification screen if pending
  if (pendingVerification && !user) {
    return (
      <OTPVerificationScreen
        email={pendingVerification.email}
        userId={pendingVerification.userId}
        onVerified={async () => {
          // If we have the password, auto-login after verification
          if (pendingVerification?.password) {
            console.log('🔐 Auto-logging in after OTP verification...');
            const result = await signIn(
              pendingVerification.email,
              pendingVerification.password,
              pendingVerification.role
            );

            if (!result.error) {
              console.log('✅ Auto-login successful!');
              clearPendingVerification();
              // Auth state will update automatically, no need to reload
            } else {
              console.error('❌ Auto-login failed:', result.error);
              clearPendingVerification();
              window.location.reload(); // Fall back to manual login
            }
          } else {
            // No password stored, user must log in manually
            clearPendingVerification();
            window.location.reload();
          }
        }}
        onCancel={async () => {
          clearPendingVerification();
          await signOut();
        }}
      />
    );
  }

  // Show landing page or login screen if not authenticated
  if (!user) {
    if (showLoginScreen) {
      return <LoginScreen onBackToLanding={() => setShowLoginScreen(false)} />;
    }
    return <LandingPage onSignIn={() => setShowLoginScreen(true)} />;
  }

  // Show patient portal for patient role
  if (isPatient && userRole === 'patient') {
    return <PatientDashboard />;
  }

  // Block doctors without complete profile from seeing main content
  // Render profile setup directly instead of allowing render + redirect
  // This prevents brief flash of content and provides defense-in-depth with RLS
  if (needsProfileSetup) {
    return (
      <div className="min-h-screen bg-aneya-cream flex flex-col">
        <header className="bg-aneya-navy py-2 sm:py-4 px-4 sm:px-6 border-b border-aneya-teal">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <img src="/aneya-logo.png" alt="aneya" className="h-24 sm:h-32" />
          </div>
        </header>
        <main className="flex-1 p-4">
          <Suspense fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aneya-teal mx-auto mb-4"></div>
                <p className="text-aneya-navy">Loading...</p>
              </div>
            </div>
          }>
            <DoctorProfileTab isSetupMode={true} />
          </Suspense>
        </main>
        <footer className="bg-aneya-navy py-3 px-4 border-t border-aneya-teal">
          <div className="max-w-7xl mx-auto flex justify-center">
            <button
              onClick={() => signOut()}
              className="text-white hover:text-aneya-teal transition-colors text-sm"
            >
              Sign Out
            </button>
          </div>
        </footer>
      </div>
    );
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

      // Use fetchEventSource for proper SSE handling (no buffering)
      // This library handles POST requests with SSE correctly
      console.log(`[${timestamp()}] Starting SSE connection to ${API_URL}/api/analyze-stream`);

      let finalResult: any = null;
      let hasError = false;
      let isComplete = false;
      const abortController = new AbortController();

      await fetchEventSource(`${API_URL}/api/analyze-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultation,
          patient_name: patientDetails.name,
          patient_age: patientDetails.age,
          patient_sex: patientDetails.sex,
          patient_height: patientDetails.height,
          patient_weight: patientDetails.weight,
          current_medications: patientDetails.currentMedications,
          current_conditions: patientDetails.currentConditions,
          user_ip: userIp,
          location_override: locationOverride || undefined
        }),
        signal: abortController.signal,
        openWhenHidden: true, // Keep connection open when tab is hidden
        async onopen(response) {
          console.log(`[${timestamp()}] SSE connection opened, status: ${response.status}`);
          if (response.ok) {
            // Successfully started analysis, now proceed to progress screen
            setCurrentScreen('progress');
          } else {
            const errorText = await response.text();
            console.error(`[${timestamp()}] Backend error:`, errorText);
            throw new Error(`Analysis failed: ${response.status}`);
          }
        },
        onmessage(ev) {
          const eventType = ev.event;
          try {
            const data = JSON.parse(ev.data);
            console.log(`[${timestamp()}] SSE Event: ${eventType}`, data);

            // Add event to state for real-time display
            setStreamEvents((prev: StreamEvent[]) => [...prev, {
              type: eventType,
              data: data,
              timestamp: Date.now()
            }]);

            // Handle different event types
            if (eventType === 'location') {
              console.log(`[${timestamp()}] 📍 Location detected:`, data.country);
            } else if (eventType === 'guideline_search') {
              console.log(`[${timestamp()}] 🔍 Searching:`, data.source);
            } else if (eventType === 'diagnoses') {
              // Diagnoses available - show report immediately!
              console.log(`[${timestamp()}] ✅ Diagnoses ready:`, data.diagnoses.length, 'diagnoses');
              console.log(`[${timestamp()}] ⏳ Drugs pending:`, data.drugs_pending?.length || 0, 'drugs');
              setAnalysisResult((prev: any) => ({ ...prev, diagnoses: data.diagnoses }));
              // Track pending drugs for loading state
              setDrugsPending(data.drugs_pending || []);
              setCurrentScreen('report');
            } else if (eventType === 'drug_update') {
              // Individual drug details arrived
              const source = data.source || 'unknown';
              console.log(`[${timestamp()}] 💊 Drug ${data.drug_name}: ${data.status} (source: ${source})`);

              // Remove from pending list regardless of status
              setDrugsPending(prev => prev.filter(d => d !== data.drug_name));

              if (data.status === 'complete' && data.details) {
                // Log if LLM was used
                if (source === 'llm') {
                  console.log(`[${timestamp()}]   AI-generated drug information for ${data.drug_name}`);
                }

                setDrugDetails(prev => ({
                  ...prev,
                  [data.drug_name]: data.details
                }));
              }
            } else if (eventType === 'bnf_drug') {
              console.log(`[${timestamp()}] 💊 Drug ${data.medication}: ${data.status}`);
            } else if (eventType === 'complete') {
              console.log(`[${timestamp()}] ✅ Analysis complete`);
              finalResult = data;
              isComplete = true;
              // Abort the connection since we're done
              abortController.abort();
            } else if (eventType === 'error') {
              if (data.type === 'invalid_input') {
                setInvalidInputMessage(data.message);
                setCurrentScreen('invalid');
                hasError = true;
                abortController.abort();
                return;
              }
              // Handle critical API errors (credits, auth, max_tokens) - show immediately
              if (data.type === 'anthropic_credits' || data.type === 'anthropic_api') {
                console.error(`[${timestamp()}] ❌ Critical API error:`, data.message);
                alert(`API Error: ${data.message}`);
                setCurrentScreen('input');
                hasError = true;
                abortController.abort();
                return;
              }
              // Handle max_tokens warning - collect as error but allow analysis to continue
              if (data.type === 'max_tokens') {
                console.warn(`[${timestamp()}] ⚠️ Claude max_tokens warning:`, data.message);
                setAnalysisErrors((prev: string[]) => [...prev, data.message]);
                // Don't return - allow analysis to continue with whatever was generated
              }
              // Collect other errors but don't throw - allow analysis to complete
              console.error(`[${timestamp()}] Error during analysis:`, data.message);
              setAnalysisErrors(prev => [...prev, data.message]);
            }
          } catch (e) {
            console.error(`[${timestamp()}] Error parsing event data:`, e);
          }
        },
        onerror(err) {
          // Don't retry if we intentionally aborted or if analysis is complete
          if (isComplete || abortController.signal.aborted) {
            console.log(`[${timestamp()}] SSE connection closed (stream complete)`);
            return; // Return without throwing to prevent retry
          }
          console.error(`[${timestamp()}] SSE error:`, err);
          hasError = true;
          throw err; // Rethrow to stop retrying
        },
        onclose() {
          console.log(`[${timestamp()}] SSE connection closed`);
          // Don't retry on close - the stream is finished
          if (!isComplete && !hasError) {
            console.log(`[${timestamp()}] Stream closed unexpectedly`);
          }
        }
      }).catch((err) => {
        // Ignore abort errors (expected when we call abortController.abort())
        if (err.name === 'AbortError' || abortController.signal.aborted) {
          console.log(`[${timestamp()}] SSE connection aborted (expected)`);
        } else {
          throw err;
        }
      });

      // After stream completes, handle final result
      if (!hasError && finalResult) {
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
          console.log(`[${timestamp()}] 💊 Loaded ${Object.keys(extractedDrugDetails).length} drug details from analysis result`);
        }
      }
    } catch (error) {
      console.error(`[${timestamp()}] Analysis error:`, error);
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

  const handleStartConsultationFromAppointment = (appointment: AppointmentWithPatient) => {
    setSelectedAppointment(appointment);
    setSelectedPatient(appointment.patient || null);

    // Pre-fill patient details from patient record
    setCurrentPatientDetails({
      name: appointment.patient?.name || '',
      sex: appointment.patient?.sex || '',
      age: appointment.patient ? getPatientAge(appointment.patient) : '',
      height: appointment.patient?.height_cm ? `${appointment.patient.height_cm} cm` : '',
      weight: appointment.patient?.weight_kg ? `${appointment.patient.weight_kg} kg` : '',
      currentMedications: appointment.patient?.current_medications || '',
      currentConditions: appointment.patient?.current_conditions || '',
    });

    // Navigate immediately - don't wait for status update
    setCurrentScreen('input');

    // Update appointment status to in_progress (fire-and-forget, non-blocking)
    fetch(`${API_URL}/api/appointments/${appointment.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' })
    }).catch(error => {
      console.error('Failed to update appointment status:', error);
    });
  };

  // Helper to build patient details from a Patient object
  const buildPatientDetails = (patient: Patient): PatientDetails => ({
    name: patient.name,
    sex: patient.sex,
    age: getPatientAge(patient),
    height: patient.height_cm?.toString() || '',
    weight: patient.weight_kg?.toString() || '',
    currentMedications: patient.current_medications || '',
    currentConditions: patient.current_conditions || ''
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

      // Check if consultation needs summarization first (no summary_data)
      let textForAnalysis = textToAnalyze;
      if (!consultation.summary_data) {
        console.log('Consultation needs summarization first, calling /api/summarize...');
        setStreamEvents(prev => [...prev, {
          type: 'summarizing',
          data: { message: 'Summarizing consultation transcript...' },
          timestamp: Date.now()
        }]);

        const summarizeResponse = await fetch(`${API_URL}/api/summarize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcript: textToAnalyze,
            patient_name: patientDetails.name,
            user_ip: userIp
          }),
        });

        if (!summarizeResponse.ok) {
          console.warn('Summarization failed, proceeding with raw transcript');
        } else {
          const summaryResult = await summarizeResponse.json();
          console.log('Summarization complete:', summaryResult);

          // Update the consultation with summary data
          if (summaryResult.consultation_data?.summary_data) {
            try {
              const { supabase } = await import('./lib/supabase');
              await supabase
                .from('consultations')
                .update({
                  summary_data: summaryResult.consultation_data.summary_data,
                  consultation_text: summaryResult.consultation_data.consultation_text || textToAnalyze
                })
                .eq('id', consultation.id);
              console.log('Consultation updated with summary data');
            } catch (updateErr) {
              console.warn('Failed to save summary data:', updateErr);
            }
          }

          // Use the summarized text for analysis if available
          if (summaryResult.summary) {
            textForAnalysis = summaryResult.summary;
            setConsultationSummary(summaryResult.summary);
          }
        }
      }

      // Use fetchEventSource for proper SSE handling (no buffering)
      console.log(`[${timestamp()}] Starting SSE connection for past consultation analysis`);

      let finalResult: any = null;
      let hasError = false;
      let isComplete = false;
      const abortController = new AbortController();

      await fetchEventSource(`${API_URL}/api/analyze-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultation: textForAnalysis,
          patient_name: patientDetails.name,
          patient_age: patientDetails.age,
          patient_sex: patientDetails.sex,
          patient_height: patientDetails.height,
          patient_weight: patientDetails.weight,
          current_medications: patientDetails.currentMedications,
          current_conditions: patientDetails.currentConditions,
          user_ip: userIp,
          location_override: locationOverride || undefined
        }),
        signal: abortController.signal,
        openWhenHidden: true,
        async onopen(response) {
          console.log(`[${timestamp()}] SSE connection opened, status: ${response.status}`);
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Analysis failed: ${response.status} ${errorText}`);
          }
        },
        onmessage(ev) {
          const eventType = ev.event;
          try {
            const data = JSON.parse(ev.data);
            console.log(`[${timestamp()}] SSE Event: ${eventType}`, data);

            setStreamEvents(prev => [...prev, {
              type: eventType,
              data: data,
              timestamp: Date.now()
            }]);

            if (eventType === 'diagnoses') {
              console.log(`[${timestamp()}] ✅ Diagnoses ready:`, data.diagnoses?.length || 0, 'diagnoses');
              setAnalysisResult((prev: any) => ({ ...prev, diagnoses: data.diagnoses }));
              setDrugsPending(data.drugs_pending || []);
              setCurrentScreen('report');
            } else if (eventType === 'drug_update') {
              const source = data.source || 'unknown';
              console.log(`[${timestamp()}] 💊 Drug ${data.drug_name}: ${data.status} (source: ${source})`);
              setDrugsPending(prev => prev.filter(d => d !== data.drug_name));
              if (data.status === 'complete' && data.details) {
                setDrugDetails(prev => ({
                  ...prev,
                  [data.drug_name]: data.details
                }));
              }
            } else if (eventType === 'complete') {
              console.log(`[${timestamp()}] ✅ Analysis complete`);
              finalResult = data;
              isComplete = true;
              abortController.abort();
            } else if (eventType === 'error') {
              console.error(`[${timestamp()}] Error during analysis:`, data.message || data.error);
              setAnalysisErrors(prev => [...prev, data.message || data.error]);
            }
          } catch (e) {
            console.error(`[${timestamp()}] Error parsing event data:`, e);
          }
        },
        onerror(err) {
          if (isComplete || abortController.signal.aborted) {
            return; // Don't retry if complete
          }
          console.error(`[${timestamp()}] SSE error:`, err);
          hasError = true;
          throw err;
        },
        onclose() {
          console.log(`[${timestamp()}] SSE connection closed`);
        }
      }).catch((err) => {
        if (err.name === 'AbortError' || abortController.signal.aborted) {
          console.log(`[${timestamp()}] SSE connection aborted (expected)`);
        } else {
          throw err;
        }
      });

      if (!hasError && finalResult) {
        setAnalysisResult((prev: any) => ({ ...(prev || {}), ...finalResult }));

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
            console.error(`[${timestamp()}] Failed to update consultation with analysis:`, error);
          } else {
            console.log(`[${timestamp()}] ✅ Consultation updated with analysis results`);
            // Refresh appointments to show updated data
            setAppointmentsRefreshKey(prev => prev + 1);
          }
        } catch (updateError) {
          console.error(`[${timestamp()}] Error updating consultation:`, updateError);
        }
      }
    } catch (error) {
      console.error(`[${timestamp()}] Analysis error:`, error);
      setAnalysisErrors(prev => [...prev, String(error)]);
      alert(`Analysis failed: ${error}`);
      setCurrentScreen('appointments');
    }
  };

  // Handler for analyzing consultations from PatientDetailView (uses selectedPatient from state)
  const handleAnalyzeConsultationFromPatientView = async (appointment: AppointmentWithPatient, consultation: Consultation) => {
    // Build patient details from appointment patient data
    const patientDetails = buildPatientDetails(appointment.patient);

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

      // Check if consultation needs summarization first (no summary_data)
      let textForAnalysis = textToAnalyze;
      if (!consultation.summary_data) {
        console.log('Consultation needs summarization first, calling /api/summarize...');
        setStreamEvents(prev => [...prev, {
          type: 'summarizing',
          data: { message: 'Summarizing consultation transcript...' },
          timestamp: Date.now()
        }]);

        const summarizeResponse = await fetch(`${API_URL}/api/summarize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcript: textToAnalyze,
            patient_name: patientDetails.name,
            user_ip: userIp
          }),
        });

        if (!summarizeResponse.ok) {
          console.warn('Summarization failed, proceeding with raw transcript');
        } else {
          const summaryResult = await summarizeResponse.json();
          console.log('Summarization complete:', summaryResult);

          // Update the consultation with summary data
          if (summaryResult.consultation_data?.summary_data) {
            try {
              const { supabase } = await import('./lib/supabase');
              await supabase
                .from('consultations')
                .update({
                  summary_data: summaryResult.consultation_data.summary_data,
                  consultation_text: summaryResult.consultation_data.consultation_text || textToAnalyze
                })
                .eq('id', consultation.id);
              console.log('Consultation updated with summary data');
            } catch (updateErr) {
              console.warn('Failed to save summary data:', updateErr);
            }
          }

          // Use the summarized text for analysis if available
          if (summaryResult.summary) {
            textForAnalysis = summaryResult.summary;
            setConsultationSummary(summaryResult.summary);
          }
        }
      }

      // Use fetchEventSource for proper SSE handling (no buffering)
      console.log(`[${timestamp()}] Starting SSE connection for patient view analysis`);

      let finalResult: any = null;
      let hasError = false;
      let isComplete = false;
      const abortController = new AbortController();

      await fetchEventSource(`${API_URL}/api/analyze-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultation: textForAnalysis,
          patient_name: patientDetails.name,
          patient_age: patientDetails.age,
          patient_sex: patientDetails.sex,
          patient_height: patientDetails.height,
          patient_weight: patientDetails.weight,
          current_medications: patientDetails.currentMedications,
          current_conditions: patientDetails.currentConditions,
          user_ip: userIp,
          location_override: locationOverride || undefined
        }),
        signal: abortController.signal,
        openWhenHidden: true,
        async onopen(response) {
          console.log(`[${timestamp()}] SSE connection opened, status: ${response.status}`);
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Analysis failed: ${response.status} ${errorText}`);
          }
        },
        onmessage(ev) {
          const eventType = ev.event;
          try {
            const data = JSON.parse(ev.data);
            console.log(`[${timestamp()}] SSE Event: ${eventType}`, data);

            setStreamEvents(prev => [...prev, {
              type: eventType,
              data: data,
              timestamp: Date.now()
            }]);

            if (eventType === 'diagnoses') {
              console.log(`[${timestamp()}] ✅ Diagnoses ready:`, data.diagnoses?.length || 0, 'diagnoses');
              setAnalysisResult((prev: any) => ({ ...prev, diagnoses: data.diagnoses }));
              setDrugsPending(data.drugs_pending || []);
              setCurrentScreen('report');
            } else if (eventType === 'drug_update') {
              const source = data.source || 'unknown';
              console.log(`[${timestamp()}] 💊 Drug ${data.drug_name}: ${data.status} (source: ${source})`);
              setDrugsPending(prev => prev.filter(d => d !== data.drug_name));
              if (data.status === 'complete' && data.details) {
                setDrugDetails(prev => ({
                  ...prev,
                  [data.drug_name]: data.details
                }));
              }
            } else if (eventType === 'complete') {
              console.log(`[${timestamp()}] ✅ Analysis complete`);
              finalResult = data;
              isComplete = true;
              abortController.abort();
            } else if (eventType === 'error') {
              console.error(`[${timestamp()}] Error during analysis:`, data.message || data.error);
              setAnalysisErrors(prev => [...prev, data.message || data.error]);
            }
          } catch (e) {
            console.error(`[${timestamp()}] Error parsing event data:`, e);
          }
        },
        onerror(err) {
          if (isComplete || abortController.signal.aborted) {
            return; // Don't retry if complete
          }
          console.error(`[${timestamp()}] SSE error:`, err);
          hasError = true;
          throw err;
        },
        onclose() {
          console.log(`[${timestamp()}] SSE connection closed`);
        }
      }).catch((err) => {
        if (err.name === 'AbortError' || abortController.signal.aborted) {
          console.log(`[${timestamp()}] SSE connection aborted (expected)`);
        } else {
          throw err;
        }
      });

      if (!hasError && finalResult) {
        setAnalysisResult((prev: any) => ({ ...(prev || {}), ...finalResult }));

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
            console.error(`[${timestamp()}] Failed to update consultation with analysis:`, error);
          } else {
            console.log(`[${timestamp()}] ✅ Consultation updated with analysis results`);
          }
        } catch (updateError) {
          console.error(`[${timestamp()}] Error updating consultation:`, updateError);
        }
      }
    } catch (error) {
      console.error(`[${timestamp()}] Analysis error:`, error);
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
      const summaryObj = consultationSummary as any;
      const summaryData = typeof consultationSummary === 'object' && summaryObj?.consultation_data?.summary_data
        ? summaryObj.consultation_data.summary_data
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

      // Capture consultation ID for feedback system
      setCurrentConsultationId(savedConsultation.id);
      console.log('✅ Consultation ID captured for feedback:', savedConsultation.id);

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
      setConsultationSummary('');
      setOriginalTranscript('');
      setTranscriptionLanguage('');
    } catch (error) {
      console.error('Failed to save consultation:', error);
      alert('Failed to save consultation. Please try again.');
    }
  };

  const handleSaveConsultationOnly = async (consultationData: {
    patient_id: string;
    appointment_id: string | null;
    consultation_text: string;
    original_transcript: string;
    transcription_language: string | null;
    audio_url: string | null;
    patient_snapshot: any;
    consultation_duration_seconds: number;
    transcription_status: 'pending' | 'processing' | 'completed' | 'failed';
  }) => {
    try {
      // Build full consultation object for saveConsultation
      const fullConsultationData = {
        ...consultationData,
        // AI Analysis fields - explicitly null/empty until analyze is called
        analysis_result: null,
        diagnoses: [],
        guidelines_found: [],
        // Default metadata
        location_detected: null,
        backend_api_version: '1.0.0',
        summary_data: null,
      };

      const savedConsultation = await saveConsultation(fullConsultationData);

      if (!savedConsultation) {
        alert('Failed to save consultation. Please check your connection and try again.');
        return undefined;
      }

      // Capture consultation ID for feedback system
      setCurrentConsultationId(savedConsultation.id);
      console.log('✅ Consultation ID captured for feedback:', savedConsultation.id);

      // Increment refresh key to force AppointmentsTab to refetch
      setAppointmentsRefreshKey(prev => prev + 1);

      console.log('✅ Consultation saved successfully');

      return savedConsultation;
    } catch (error) {
      console.error('Failed to save consultation:', error);
      alert('Failed to save consultation. Please try again.');
      return undefined;
    }
  };

  // Handler to close consultation and return to appointments
  const handleCloseConsultation = () => {
    // Increment refresh key to force AppointmentsTab to refetch
    setAppointmentsRefreshKey(prev => prev + 1);

    // Return to appointments
    setCurrentScreen('appointments');
    setActiveTab('appointments');
    setSelectedAppointment(null);
    setSelectedPatient(null);
    setCurrentPatientDetails(null);
    setConsultationText('');
    setConsultationTranscript('');
    setConsultationSummary('');
    setOriginalTranscript('');
    setTranscriptionLanguage('');
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentScreen('patient-detail');
  };

  const handleBackToPatients = () => {
    setSelectedPatient(null);
    setCurrentScreen('patients');
  };

  const handleViewConsultationForm = (appointment: AppointmentWithPatient, consultation: Consultation | null) => {
    setAppointmentForFormView(appointment);
    setConsultationForFormView(consultation);
    setCurrentScreen('view-consultation-form');
  };

  const handleBackFromConsultationForm = () => {
    setAppointmentForFormView(null);
    setConsultationForFormView(null);
    setCurrentScreen('appointments');
  };

  const handleDownloadPdf = async () => {
    if (!appointmentForFormView?.consultation_id) return;

    setGeneratingPdf(true);
    try {
      const response = await fetch(
        `${API_URL}/api/appointments/${appointmentForFormView.id}/consultation-pdf`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate PDF');
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date(appointmentForFormView.scheduled_time);
      const dateStr = date.toISOString().split('T')[0];
      a.download = `consultation_${(appointmentForFormView.patient?.name || 'patient').replace(/\s+/g, '_')}_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadAnalysisPdf = async () => {
    if (!currentConsultationId) return;

    setGeneratingPdf(true);
    try {
      const response = await fetch(
        `${API_URL}/api/consultations/${currentConsultationId}/analysis-pdf`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate analysis PDF');
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      const patientName = currentPatientDetails?.name?.replace(/\s+/g, '_') || 'patient';
      a.download = `analysis_${patientName}_${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading analysis PDF:', error);
      alert('Failed to generate analysis PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadPrescriptionPdf = async () => {
    if (!currentConsultationId) return;

    setGeneratingPdf(true);
    try {
      const response = await fetch(
        `${API_URL}/api/consultations/${currentConsultationId}/prescription-pdf`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate prescription PDF');
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      const patientName = currentPatientDetails?.name?.replace(/\s+/g, '_') || 'patient';
      a.download = `prescription_${patientName}_${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading prescription PDF:', error);
      alert('Failed to generate prescription PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-aneya-cream flex flex-col">
      {/* Header */}
      <header className="bg-aneya-navy py-2 sm:py-4 px-4 sm:px-6 border-b border-aneya-teal sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <img src="/aneya-logo.png" alt="aneya" className="h-24 sm:h-32" />
          <div className="flex items-center gap-4">
            <BranchIndicator />
            <LocationSelector
              selectedLocation={locationOverride}
              onLocationChange={setLocationOverride}
            />
            <div className="text-right">
              {doctorProfile?.name && (
                <span className="text-aneya-cream text-sm sm:text-base font-medium block">{doctorProfile.name}</span>
              )}
              <span className="text-aneya-cream/70 text-xs sm:text-sm font-light tracking-wide">Doctor Portal</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation - only show on appointments/patients/messages/profile/alldoctors screens */}
      {(currentScreen === 'appointments' || currentScreen === 'patients' || currentScreen === 'patient-detail' || currentScreen === 'messages' || currentScreen === 'profile' || currentScreen === 'forms' || currentScreen === 'alldoctors' || currentScreen === 'feedback-dashboard') && (
        <TabNavigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            // Prevent navigation if profile needs setup (except to profile page itself)
            if (needsProfileSetup && tab !== 'profile') {
              alert('Please complete your profile by selecting a specialty before accessing other features.');
              return;
            }
            setActiveTab(tab);
            setCurrentScreen(tab === 'feedback' ? 'feedback-dashboard' : tab);
          }}
          unreadMessagesCount={unreadCount}
          pendingRequestsCount={pendingRequestsCount}
          isAdmin={isAdmin}
        />
      )}

      {/* Main Content */}
      <main className="flex-1">
        <Suspense fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aneya-teal mx-auto mb-4"></div>
              <p className="text-aneya-navy">Loading...</p>
            </div>
          </div>
        }>
          {currentScreen === 'appointments' && (
            <AppointmentsTab
              key={appointmentsRefreshKey}
              onStartConsultation={handleStartConsultationFromAppointment}
              onAnalyzeConsultation={handleAnalyzePastConsultation}
              onViewConsultationForm={handleViewConsultationForm}
            />
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
              onStartConsultation={async (patient) => {
                // Create a REAL appointment in the database
                // Default scheduled_time: 9:00 AM today
                const today = new Date();
                today.setHours(9, 0, 0, 0);

                const realAppointment = await createAppointment({
                  patient_id: patient.id,
                  doctor_id: doctorProfile?.id || null,
                  scheduled_time: today.toISOString(),
                  duration_minutes: 30,
                  appointment_type: 'general',
                  specialty: 'general',
                  specialty_subtype: null,
                  booked_by: 'doctor',
                });

                if (realAppointment) {
                  handleStartConsultationFromAppointment(realAppointment);
                } else {
                  console.error('Failed to create appointment');
                  alert('Failed to create appointment. Please try again.');
                }
              }}
              onAnalyzeConsultation={handleAnalyzeConsultationFromPatientView}
              onPatientUpdated={(updatedPatient) => setSelectedPatient(updatedPatient)}
            />
          )}

          {currentScreen === 'messages' && (
            <DoctorMessages />
          )}

          {currentScreen === 'profile' && (
            <DoctorProfileTab />
          )}

          {currentScreen === 'forms' && (
            <CustomFormsTab />
          )}

          {currentScreen === 'alldoctors' && isAdmin && (
            <AllDoctorsTab />
          )}

          {currentScreen === 'input' && (
            <InputScreen
              onAnalyze={handleAnalyze}
              onSaveConsultation={handleSaveConsultationOnly}
              onCloseConsultation={handleCloseConsultation}
              onBack={() => setCurrentScreen('appointments')}
              preFilledPatient={selectedPatient || undefined}
              appointmentContext={selectedAppointment || undefined}
              locationOverride={locationOverride}
              onLocationChange={setLocationOverride}
            />
          )}

          {currentScreen === 'infertility-form' && selectedPatient && selectedAppointment && (
            <EditableDoctorReportCard
              formType="infertility"
              patientId={selectedPatient.id}
              appointmentId={selectedAppointment.id}
              editable={true}            />
          )}

          {currentScreen === 'view-consultation-form' && appointmentForFormView && (
            <div className="max-w-7xl mx-auto px-4 py-6">
              <div className="mb-4 flex gap-2 flex-wrap">
                <button
                  onClick={handleBackFromConsultationForm}
                  className="px-4 py-2 bg-aneya-navy text-white rounded-[12px] hover:bg-opacity-90 transition-colors"
                >
                  ← Back to Appointments
                </button>
                {appointmentForFormView.consultation_id && appointmentForFormView.status === 'completed' && (
                  <button
                    onClick={handleDownloadPdf}
                    disabled={generatingPdf}
                    className="px-3 py-2 bg-blue-600 text-white rounded-[8px] text-[13px] font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Download className={`w-4 h-4 ${generatingPdf ? 'animate-bounce' : ''}`} />
                    {generatingPdf ? 'Generating...' : 'Download PDF Report'}
                  </button>
                )}
              </div>

              {/* Patient Medical Report - Read-only view */}
              <EditableDoctorReportCard
                appointmentId={appointmentForFormView.id}
                patientId={appointmentForFormView.patient_id}
                formType={consultationForFormView?.detected_consultation_type || appointmentForFormView.specialty_subtype || 'antenatal_2'}
                editable={false}
              />

              {/* Download PDF buttons at bottom */}
              {appointmentForFormView.consultation_id && appointmentForFormView.status === 'completed' && (
                <div className="mt-6 flex justify-center gap-4">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={generatingPdf}
                    className="px-4 py-2 bg-blue-600 text-white rounded-[8px] text-[14px] font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Download className={`w-4 h-4 ${generatingPdf ? 'animate-bounce' : ''}`} />
                    {generatingPdf ? 'Generating...' : 'Download Report'}
                  </button>
                  <button
                    onClick={handleDownloadPrescriptionPdf}
                    disabled={generatingPdf}
                    className="px-4 py-2 bg-aneya-teal text-white rounded-[8px] text-[14px] font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Download className={`w-4 h-4 ${generatingPdf ? 'animate-bounce' : ''}`} />
                    {generatingPdf ? 'Generating...' : 'Download Prescription'}
                  </button>
                </div>
              )}
            </div>
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
              drugsPending={drugsPending}
              appointmentContext={selectedAppointment || undefined}
              onSaveConsultation={selectedAppointment ? handleSaveConsultation : undefined}
              location={locationOverride}
              consultationId={currentConsultationId}
              onDownloadPdf={handleDownloadAnalysisPdf}
              onDownloadPrescriptionPdf={handleDownloadPrescriptionPdf}
              generatingPdf={generatingPdf}
            />
          )}

          {currentScreen === 'feedback-dashboard' && (
            <FeedbackDashboard />
          )}
        </Suspense>
      </main>

      {/* Footer with Sign Out button */}
      <footer className="bg-aneya-navy py-3 px-4 border-t border-aneya-teal mt-8">
        <div className="max-w-7xl mx-auto flex justify-center">
          <button
            onClick={() => signOut()}
            className="bg-aneya-teal hover:bg-aneya-teal/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  // Simple route detection for design test page (dev only)
  const isDesignTest = window.location.pathname === '/design-test';

  if (isDesignTest) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading design test...</div>}>
          <DesignTestPage />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
