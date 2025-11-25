import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PrimaryButton } from './PrimaryButton';

interface AnalysisCompleteProps {
  onShowReport: () => void;
}

export function AnalysisComplete({ onShowReport }: AnalysisCompleteProps) {
  // Auto-show report immediately
  useEffect(() => {
    onShowReport();
  }, [onShowReport]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-xl mx-auto px-6 text-center">
        <div className="bg-[#1d9e99] rounded-[16px] p-12 aneya-shadow-card mb-8 animate-fadeIn">
          <CheckCircle2 className="w-20 h-20 text-[#0c3555] mx-auto mb-6 animate-scaleIn" />
          <h1 className="text-[32px] leading-[38px] text-[#0c3555] mb-4">
            Analysis Complete
          </h1>
          <p className="text-[17px] leading-[26px] text-[#5C3E53]">
            Your consultation has been successfully analysed. Clinical guidelines and treatment recommendations are ready for review.
          </p>

          <p className="text-[15px] leading-[22px] text-[#5C3E53] mt-6 italic">
            Preparing your report...
          </p>
        </div>

        <PrimaryButton onClick={onShowReport} fullWidth>
          Show Report Now
        </PrimaryButton>
      </div>
    </div>
  );
}
