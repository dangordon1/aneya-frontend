import { useState, useEffect } from 'react';

export interface WizardStep {
  title: string;
  content: React.ReactNode;
  validate?: () => boolean | Promise<boolean>;
}

export interface ProgressiveWizardProps {
  steps: WizardStep[];
  onStepChange?: (currentStep: number) => void | Promise<void>;
  onComplete?: (completedSteps: number) => void | Promise<void>;
  currentStep?: number;
  canNavigateToStep?: (stepIndex: number, completedSteps: number) => boolean;
  onAutoSave?: (stepIndex: number, stepData?: any) => void | Promise<void>;
  showProgressBar?: boolean;
  showStepNumbers?: boolean;
  allowSkip?: boolean;
}

export function ProgressiveWizard({
  steps,
  onStepChange,
  onComplete,
  currentStep = 0,
  canNavigateToStep,
  onAutoSave,
  showProgressBar = true,
  showStepNumbers = true,
  allowSkip = false,
}: ProgressiveWizardProps) {
  const [activeStep, setActiveStep] = useState(currentStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string>('');

  useEffect(() => {
    setActiveStep(currentStep);
  }, [currentStep]);

  const validateStep = async (): Promise<boolean> => {
    setIsValidating(true);
    setErrors('');

    try {
      const step = steps[activeStep];
      if (step.validate) {
        const isValid = await Promise.resolve(step.validate());
        if (!isValid) {
          setErrors('Please complete all required fields before proceeding');
          setIsValidating(false);
          return false;
        }
      }
      setIsValidating(false);
      return true;
    } catch (error) {
      setErrors(error instanceof Error ? error.message : 'Validation failed');
      setIsValidating(false);
      return false;
    }
  };

  const handleAutoSave = async () => {
    if (!onAutoSave) return;

    setIsSaving(true);
    try {
      await Promise.resolve(onAutoSave(activeStep));
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    if (!isValid) return;

    // Auto-save on step completion
    await handleAutoSave();

    // Mark current step as completed
    const newCompleted = new Set(completedSteps);
    newCompleted.add(activeStep);
    setCompletedSteps(newCompleted);

    if (activeStep < steps.length - 1) {
      const nextStep = activeStep + 1;
      setActiveStep(nextStep);
      await Promise.resolve(onStepChange?.(nextStep));
    } else {
      // Final step completed
      await Promise.resolve(onComplete?.(newCompleted.size));
    }
  };

  const handlePrevious = () => {
    if (activeStep > 0) {
      const prevStep = activeStep - 1;
      setActiveStep(prevStep);
      onStepChange?.(prevStep);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow navigation to completed steps or current step
    const canNavigate = canNavigateToStep ? canNavigateToStep(stepIndex, completedSteps.size) : stepIndex <= activeStep;

    if (canNavigate) {
      setActiveStep(stepIndex);
      onStepChange?.(stepIndex);
      setErrors('');
    }
  };

  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;
  const progressPercentage = ((activeStep + 1) / steps.length) * 100;

  return (
    <div className="w-full bg-white rounded-[20px] p-4 sm:p-8">
      {/* Progress Bar */}
      {showProgressBar && (
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] sm:text-[16px] font-medium text-aneya-navy">
              Step {activeStep + 1} of {steps.length}
            </h3>
            <span className="text-[12px] sm:text-[14px] text-gray-600">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-aneya-teal to-aneya-seagreen transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
              aria-label="Progress"
            />
          </div>
        </div>
      )}

      {/* Step Indicators */}
      <div className="mb-6 sm:mb-8 overflow-x-auto">
        <div className="flex gap-2 sm:gap-3 min-w-min sm:min-w-full pb-2 sm:pb-0">
          {steps.map((step, index) => {
            const isActive = index === activeStep;
            const isCompleted = completedSteps.has(index);
            const canNavigate = canNavigateToStep
              ? canNavigateToStep(index, completedSteps.size)
              : index <= activeStep;

            return (
              <button
                key={index}
                onClick={() => handleStepClick(index)}
                disabled={!canNavigate}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-[10px] font-medium text-[12px] sm:text-[14px] transition-all whitespace-nowrap flex-shrink-0 sm:flex-shrink ${
                  isActive
                    ? 'bg-aneya-navy text-white shadow-md'
                    : isCompleted
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : canNavigate
                        ? 'bg-gray-100 text-aneya-navy hover:bg-gray-200'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                {showStepNumbers && (
                  <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full border border-current text-[11px] sm:text-[12px]">
                    {isCompleted ? (
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                )}
                <span className="hidden sm:inline">{step.title}</span>
                <span className="sm:hidden">{step.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Step Title */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-[22px] sm:text-[28px] font-serif text-aneya-navy">
          {steps[activeStep].title}
        </h2>
      </div>

      {/* Error Message */}
      {errors && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-[10px]">
          <div className="flex gap-3">
            <svg className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-[14px] text-red-700">{errors}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="mb-6 sm:mb-8 min-h-[300px] sm:min-h-[400px]">
        {steps[activeStep].content}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4 sm:pt-6 border-t border-gray-200">
        <button
          onClick={handlePrevious}
          disabled={isFirstStep || isValidating || isSaving}
          className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-[10px] font-medium text-[14px] transition-colors ${
            isFirstStep
              ? 'border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
              : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'
          }`}
        >
          Previous
        </button>

        {!isLastStep ? (
          <button
            onClick={handleNext}
            disabled={isValidating || isSaving}
            className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-aneya-navy text-white rounded-[10px] font-medium text-[14px] hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isValidating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Validating...
              </>
            ) : isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={isValidating || isSaving}
            className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-aneya-teal text-white rounded-[10px] font-medium text-[14px] hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isValidating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Validating...
              </>
            ) : isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Completing...
              </>
            ) : (
              <>
                Complete
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>

      {/* Step Count Info */}
      <div className="mt-4 sm:mt-6 text-center">
        <p className="text-[12px] sm:text-[13px] text-gray-600">
          Completed: {completedSteps.size} of {steps.length - 1} steps
          {allowSkip && <span className="ml-2 text-gray-500">(Optional steps can be skipped)</span>}
        </p>
      </div>
    </div>
  );
}
