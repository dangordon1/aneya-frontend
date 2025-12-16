import { useEffect, useState, useRef, useMemo } from 'react';
import { Loader2, MapPin, Search, Pill, CheckCircle, CheckCircle2 } from 'lucide-react';

interface StreamEvent {
  type: string;
  data: any;
  timestamp: number;
}

interface ProgressScreenProps {
  onComplete: () => void;
  streamEvents: StreamEvent[];
}

// Define the step order - when we see a later step, previous steps are complete
const STEP_ORDER = ['geolocation', 'connecting', 'validating', 'analyzing'];

// Estimated time for diagnosis in seconds
const ESTIMATED_DIAGNOSIS_TIME = 20;

export function ProgressScreen({ onComplete: _onComplete, streamEvents }: ProgressScreenProps) {
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);
  const [guidelinesSearched, setGuidelinesSearched] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const eventLogRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Track current active step
  const currentStep = useMemo(() => {
    // Find the latest progress event with a step
    for (let i = streamEvents.length - 1; i >= 0; i--) {
      const event = streamEvents[i];
      if (event.type === 'progress' && event.data?.step) {
        return event.data.step;
      }
      // If we've reached diagnoses or complete, all steps are done
      if (event.type === 'diagnoses' || event.type === 'complete') {
        return 'complete';
      }
    }
    // Check if we have a start event
    for (const event of streamEvents) {
      if (event.type === 'start') {
        return 'start';
      }
    }
    return null;
  }, [streamEvents]);

  // Determine which steps are complete based on current step
  const completedSteps = useMemo(() => {
    const completed = new Set<string>();

    if (currentStep === 'complete') {
      // All steps are complete
      STEP_ORDER.forEach(step => completed.add(step));
      completed.add('start');
      return completed;
    }

    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      // All previous steps are complete
      for (let i = 0; i < currentIndex; i++) {
        completed.add(STEP_ORDER[i]);
      }
    }

    // start is complete once we have any step
    if (currentStep && currentStep !== 'start') {
      completed.add('start');
    }

    return completed;
  }, [currentStep]);

  // Progress bar timer - updates every 100ms for smooth animation
  useEffect(() => {
    // If diagnosis is complete, set to 100%
    if (currentStep === 'complete') {
      setProgress(100);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setElapsedTime(Math.floor(elapsed));

      // Calculate progress percentage with easing
      // Progress slows down as it approaches 95% (never quite reaches 100 until complete)
      const rawProgress = (elapsed / ESTIMATED_DIAGNOSIS_TIME) * 100;
      const easedProgress = Math.min(95, rawProgress * (1 - rawProgress / 200));
      setProgress(easedProgress);
    }, 100);

    return () => clearInterval(interval);
  }, [currentStep]);

  useEffect(() => {
    if (!streamEvents || streamEvents.length === 0) return;

    // Process all events to build up state
    streamEvents.forEach(event => {
      if (event.type === 'location') {
        setDetectedLocation(`${event.data.country} (${event.data.country_code})`);
      }
    });

    // For guidelines, only add new ones by checking against current state
    const allGuidelineSources = streamEvents
      .filter(e => e.type === 'guideline_search')
      .map(e => e.data.source || 'Unknown source');
    setGuidelinesSearched(allGuidelineSources);

    // Auto-scroll to bottom
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [streamEvents]);

  const getEventIcon = (event: StreamEvent) => {
    const eventType = event.type;

    // For progress events, check if this step is complete
    if (eventType === 'progress' && event.data?.step) {
      if (completedSteps.has(event.data.step)) {
        return <CheckCircle2 className="w-4 h-4 text-aneya-seagreen" />;
      }
      // Current step - still running
      return <Loader2 className="w-4 h-4 text-aneya-teal animate-spin" />;
    }

    // For start event
    if (eventType === 'start') {
      if (completedSteps.has('start')) {
        return <CheckCircle2 className="w-4 h-4 text-aneya-seagreen" />;
      }
      return <Loader2 className="w-4 h-4 text-aneya-teal animate-spin" />;
    }

    switch (eventType) {
      case 'location':
        return <MapPin className="w-4 h-4 text-purple-600" />;
      case 'guideline_search':
        return <Search className="w-4 h-4 text-blue-600" />;
      case 'bnf_drug':
        return <Pill className="w-4 h-4 text-green-600" />;
      case 'complete':
      case 'diagnoses':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />;
    }
  };

  const getEventColor = (event: StreamEvent) => {
    const eventType = event.type;

    // For progress events, use green border if complete
    if (eventType === 'progress' && event.data?.step) {
      if (completedSteps.has(event.data.step)) {
        return 'bg-emerald-50 border-aneya-seagreen';
      }
      return 'bg-aneya-teal/10 border-aneya-teal';
    }

    // For start event
    if (eventType === 'start') {
      if (completedSteps.has('start')) {
        return 'bg-emerald-50 border-aneya-seagreen';
      }
      return 'bg-aneya-teal/10 border-aneya-teal';
    }

    switch (eventType) {
      case 'location':
        return 'bg-purple-50 border-purple-300';
      case 'guideline_search':
        return 'bg-blue-50 border-blue-300';
      case 'bnf_drug':
        return 'bg-green-50 border-green-300';
      case 'complete':
      case 'diagnoses':
        return 'bg-emerald-50 border-emerald-400';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  const formatEventMessage = (event: StreamEvent): string => {
    switch (event.type) {
      case 'start':
        return event.data.message || 'Starting analysis...';
      case 'progress':
        return event.data.message || 'Processing...';
      case 'location':
        return `📍 Location: ${event.data.country} (${event.data.country_code})`;
      case 'guideline_search':
        return `🔍 Searching: ${event.data.source}`;
      case 'bnf_drug':
        const status = event.data.status === 'looking_up' ? '⏳' : '✅';
        return `${status} ${event.data.medication}: ${event.data.status}`;
      case 'complete':
        return '✅ Analysis complete!';
      case 'diagnoses':
        return `✅ ${event.data.diagnoses?.length || 0} diagnoses identified`;
      case 'done':
        return event.data.message || 'Done';
      default:
        return JSON.stringify(event.data);
    }
  };

  return (
    <div className="min-h-screen bg-aneya-cream">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-[32px] leading-[38px] text-aneya-navy mb-2">
          Analysing Consultation
        </h1>
        <p className="text-[17px] leading-[26px] text-aneya-text-secondary mb-6">
          Real-time progress updates from the clinical decision support system...
        </p>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[15px] text-aneya-navy font-medium">
              {currentStep === 'complete' ? 'Analysis complete!' : 'Analyzing...'}
            </span>
            <span className="text-[13px] text-aneya-text-secondary">
              {currentStep === 'complete'
                ? `Completed in ${elapsedTime}s`
                : `${elapsedTime}s / ~${ESTIMATED_DIAGNOSIS_TIME}s estimated`
              }
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                currentStep === 'complete' ? 'bg-aneya-seagreen' : 'bg-aneya-teal'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-[13px] text-aneya-text-secondary text-center">
            {Math.round(progress)}% complete
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Location */}
          <div className={`bg-white border-2 rounded-[10px] p-4 ${detectedLocation ? 'border-aneya-seagreen' : 'border-aneya-teal'}`}>
            <div className="flex items-center gap-2 mb-2">
              {detectedLocation ? (
                <CheckCircle2 className="w-5 h-5 text-aneya-seagreen" />
              ) : (
                <Loader2 className="w-5 h-5 text-aneya-teal animate-spin" />
              )}
              <span className="text-[13px] font-medium text-aneya-text-secondary uppercase tracking-wider">
                Location
              </span>
            </div>
            <div className="text-[17px] leading-[22px] text-aneya-navy font-medium">
              {detectedLocation || 'Detecting...'}
            </div>
          </div>

          {/* Guidelines Searched */}
          <div className="bg-white border-2 border-blue-400 rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-5 h-5 text-blue-600" />
              <span className="text-[13px] font-medium text-aneya-text-secondary uppercase tracking-wider">
                Guidelines
              </span>
            </div>
            <div className="text-[17px] leading-[22px] text-aneya-navy font-medium">
              {guidelinesSearched.length} sources searched
            </div>
          </div>
        </div>

        {/* Event Log */}
        <div className="bg-white border-2 border-gray-200 rounded-[10px] p-6">
          <h2 className="text-[20px] leading-[26px] text-aneya-navy font-medium mb-4">
            Real-Time Activity Log
          </h2>
          <div
            ref={eventLogRef}
            className="space-y-2 max-h-[400px] overflow-y-auto pr-2"
            style={{ scrollBehavior: 'smooth' }}
          >
            {streamEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-[15px]">Waiting for events...</p>
              </div>
            ) : (
              streamEvents.map((event, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${getEventColor(event)}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getEventIcon(event)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] leading-[20px] text-aneya-navy">
                      {formatEventMessage(event)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Current Activity */}
        <div className="mt-6 flex items-center justify-center gap-3 p-4 bg-aneya-teal/10 border-2 border-aneya-teal rounded-[10px]">
          <Loader2 className="w-5 h-5 text-aneya-teal animate-spin" />
          <span className="text-[15px] leading-[22px] text-aneya-navy font-medium">
            {currentStep === 'analyzing' || guidelinesSearched.length > 0
              ? 'Analyzing consultation with AI...'
              : currentStep === 'validating'
              ? 'Validating clinical input...'
              : currentStep === 'connecting'
              ? 'Loading medical guidelines...'
              : 'Processing consultation...'}
          </span>
        </div>

        {/* Guidelines List (if any) */}
        {guidelinesSearched.length > 0 && (
          <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-[10px] p-4">
            <h3 className="text-[15px] font-medium text-blue-900 mb-3">
              Guidelines Sources Consulted ({guidelinesSearched.length})
            </h3>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
              {guidelinesSearched.slice(0, 20).map((source, index) => (
                <div
                  key={index}
                  className="text-[13px] text-blue-800 bg-white rounded px-3 py-1.5 truncate"
                  title={source}
                >
                  • {source.replace('search_', '').replace('_', ' ')}
                </div>
              ))}
              {guidelinesSearched.length > 20 && (
                <div className="text-[13px] text-blue-600 italic col-span-2">
                  + {guidelinesSearched.length - 20} more...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
