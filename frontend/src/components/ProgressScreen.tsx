import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ProgressStep, StepStatus } from './ProgressStep';

interface ProgressScreenProps {
  onComplete: () => void;
}

interface Step {
  id: number;
  title: string;
  message?: string;
  substeps?: string[];
}

const STEPS: Step[] = [
  {
    id: 1,
    title: 'Determining Location from IP Address',
    message: 'Detecting your location to provide region-specific clinical guidelines...'
  },
  {
    id: 2,
    title: 'Connecting to Clinical Decision Support System',
    message: 'Initialising MCP servers (NICE, BNF, Patient Info)...'
  },
  {
    id: 3,
    title: 'Searching Clinical Guidelines Database',
    message: 'Querying NICE guidelines, CKS topics, and BNF treatment summaries...',
    substeps: [
      '→ Searching NICE guidelines',
      '→ Searching CKS topics',
      '→ Searching BNF treatment summaries'
    ]
  },
  {
    id: 4,
    title: 'Analysing Guidelines with AI',
    message: 'Using Claude to extract diagnoses and treatment options...'
  },
  {
    id: 5,
    title: 'Extracting Prescribing Guidance',
    message: 'Analysing BNF summaries for specific dosing and drug interactions...'
  },
  {
    id: 6,
    title: 'Generating Clinical Report',
    message: 'Compiling comprehensive decision support recommendations...'
  }
];

export function ProgressScreen({ onComplete: _onComplete }: ProgressScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Async function to show steps with delays
    const showStepsWithDelay = async () => {
      // Delays for each step (in ms)
      const delays = [800, 1200, 2000, 3000, 2500, 2000];

      for (let i = 0; i < STEPS.length; i++) {
        if (cancelled) break;

        setCurrentStep(i + 1);

        // Wait for the delay before showing next step (can be interrupted)
        if (i < STEPS.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delays[i]));
        }
      }
    };

    showStepsWithDelay();

    // Cleanup function - called when component unmounts (i.e., when backend responds)
    return () => {
      cancelled = true;
    };
  }, []);

  const getStepStatus = (stepId: number): StepStatus => {
    if (stepId < currentStep) return 'complete';
    if (stepId === currentStep) return 'running';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-aneya-cream">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-[32px] leading-[38px] text-aneya-navy mb-2">
          Analysing Consultation
        </h1>
        <p className="text-[17px] leading-[26px] text-aneya-text-secondary mb-12">
          Please wait while we process your consultation with real-time clinical guidelines and AI analysis...
        </p>

        <div className="space-y-4">
          {STEPS.map((step, index) => (
            <ProgressStep
              key={step.id}
              title={step.title}
              status={getStepStatus(index)}
              substeps={step.substeps}
            />
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-[15px] leading-[22px] text-aneya-text-secondary mb-4">
            This typically takes 20-40 seconds depending on the complexity of the case.
          </p>

          {/* Real-time processing indicator */}
          <div className="flex items-center justify-center gap-3 mt-6 p-4 bg-aneya-teal/10 border-2 border-aneya-teal rounded-[10px]">
            <Loader2 className="w-5 h-5 text-aneya-teal animate-spin" />
            <span className="text-[15px] leading-[22px] text-aneya-navy font-medium">
              Processing with real-time AI analysis...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
