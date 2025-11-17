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

export function ProgressScreen({ onComplete }: ProgressScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Show realistic progress animation while backend processes
    // Step through each phase to give user feedback
    if (currentStep < STEPS.length) {
      // Timing for each step (geolocation is fast, AI analysis takes longer)
      const delay = currentStep === 0 ? 1500 :  // Geolocation (fast)
                    currentStep === 2 ? 3000 :  // Connecting to servers
                    currentStep === 4 ? 4000 :  // AI analysis (longer)
                    2500;                        // Other steps
      const timer = setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, delay);

      return () => clearTimeout(timer);
    }
    // Note: We don't auto-complete here - the parent component (App.tsx)
    // will call onComplete when the actual API call finishes
  }, [currentStep, onComplete]);

  const getStepStatus = (stepId: number): StepStatus => {
    if (stepId < currentStep) return 'complete';
    if (stepId === currentStep) return 'running';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-[32px] leading-[38px] text-[#351431] mb-2">
          Analysing Consultation
        </h1>
        <p className="text-[17px] leading-[26px] text-[#5C3E53] mb-12">
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
          <p className="text-[15px] leading-[22px] text-[#5C3E53] mb-4">
            This typically takes 20-40 seconds depending on the complexity of the case.
          </p>

          {/* Real-time processing indicator */}
          <div className="flex items-center justify-center gap-3 mt-6 p-4 bg-[#F0D1DA] rounded-[10px]">
            <Loader2 className="w-5 h-5 text-[#351431] animate-spin" />
            <span className="text-[15px] leading-[22px] text-[#351431] font-medium">
              Processing with real-time AI analysis...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
