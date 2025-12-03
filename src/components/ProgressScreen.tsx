import { useEffect, useState, useRef } from 'react';
import { Loader2, MapPin, Search, Pill, CheckCircle } from 'lucide-react';

interface StreamEvent {
  type: string;
  data: any;
  timestamp: number;
}

interface ProgressScreenProps {
  onComplete: () => void;
  streamEvents: StreamEvent[];
}

export function ProgressScreen({ onComplete: _onComplete, streamEvents }: ProgressScreenProps) {
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);
  const [guidelinesSearched, setGuidelinesSearched] = useState<string[]>([]);
  const [drugsLookingUp, setDrugsLookingUp] = useState<string[]>([]);
  const [drugsComplete, setDrugsComplete] = useState<string[]>([]);
  const eventLogRef = useRef<HTMLDivElement>(null);

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

    // For drugs, rebuild the state from all events
    const lookingUp = new Set<string>();
    const complete = new Set<string>();

    streamEvents.forEach(event => {
      if (event.type === 'bnf_drug') {
        const medication = event.data.medication;
        const status = event.data.status;

        if (status === 'looking_up') {
          lookingUp.add(medication);
        } else if (status === 'complete') {
          lookingUp.delete(medication);
          complete.add(medication);
        }
      }
    });

    setDrugsLookingUp(Array.from(lookingUp));
    setDrugsComplete(Array.from(complete));

    // Auto-scroll to bottom
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [streamEvents]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'location':
        return <MapPin className="w-4 h-4 text-purple-600" />;
      case 'guideline_search':
        return <Search className="w-4 h-4 text-blue-600" />;
      case 'bnf_drug':
        return <Pill className="w-4 h-4 text-green-600" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'start':
      case 'progress':
        return 'bg-gray-50 border-gray-300';
      case 'location':
        return 'bg-purple-50 border-purple-300';
      case 'guideline_search':
        return 'bg-blue-50 border-blue-300';
      case 'bnf_drug':
        return 'bg-green-50 border-green-300';
      case 'complete':
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
        <p className="text-[17px] leading-[26px] text-aneya-text-secondary mb-8">
          Real-time progress updates from the clinical decision support system...
        </p>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Location */}
          <div className="bg-white border-2 border-aneya-teal rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-aneya-teal" />
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

          {/* Drugs Analyzed */}
          <div className="bg-white border-2 border-green-400 rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Pill className="w-5 h-5 text-green-600" />
              <span className="text-[13px] font-medium text-aneya-text-secondary uppercase tracking-wider">
                Medications
              </span>
            </div>
            <div className="text-[17px] leading-[22px] text-aneya-navy font-medium">
              {drugsComplete.length} analyzed
              {drugsLookingUp.length > 0 && (
                <span className="text-[15px] text-gray-500 ml-1">
                  ({drugsLookingUp.length} pending)
                </span>
              )}
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
                  className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${getEventColor(event.type)}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getEventIcon(event.type)}
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
            {drugsLookingUp.length > 0
              ? `Looking up: ${drugsLookingUp.join(', ')}`
              : guidelinesSearched.length > 0
              ? 'Analyzing guidelines with AI...'
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
