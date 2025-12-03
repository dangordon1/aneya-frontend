import { AlertCircle } from 'lucide-react';
import { PrimaryButton } from './PrimaryButton';

interface InvalidInputScreenProps {
  errorMessage: string;
  onReturnHome: () => void;
}

export function InvalidInputScreen({ errorMessage, onReturnHome }: InvalidInputScreenProps) {
  return (
    <div className="min-h-screen bg-aneya-cream">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Error Icon and Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-orange-100 border-2 border-orange-400 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-[32px] leading-[38px] text-aneya-navy mb-2 text-center">
            Invalid Input
          </h1>
          <p className="text-[17px] leading-[26px] text-aneya-text-secondary text-center max-w-2xl">
            This system is designed to analyze clinical consultations and provide evidence-based medical guidance.
          </p>
        </div>

        {/* Error Message Box */}
        <div className="bg-white border-2 border-orange-300 rounded-[10px] p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[20px] leading-[26px] text-aneya-navy font-medium mb-2">
                Why was my input rejected?
              </h2>
              <p className="text-[15px] leading-[22px] text-aneya-text-secondary">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>

        {/* Examples Box */}
        <div className="bg-white border-2 border-aneya-teal rounded-[10px] p-6 mb-8">
          <h2 className="text-[20px] leading-[26px] text-aneya-navy font-medium mb-4">
            Examples of Valid Consultations
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-aneya-cream rounded-lg">
              <div className="w-2 h-2 bg-aneya-teal rounded-full mt-2 flex-shrink-0" />
              <p className="text-[15px] leading-[22px] text-aneya-navy">
                "3-year-old with fever, cough, and difficulty breathing"
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-aneya-cream rounded-lg">
              <div className="w-2 h-2 bg-aneya-teal rounded-full mt-2 flex-shrink-0" />
              <p className="text-[15px] leading-[22px] text-aneya-navy">
                "Patient with chest pain and shortness of breath"
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-aneya-cream rounded-lg">
              <div className="w-2 h-2 bg-aneya-teal rounded-full mt-2 flex-shrink-0" />
              <p className="text-[15px] leading-[22px] text-aneya-navy">
                "72-year-old with suspected pneumonia, productive cough, fever"
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-aneya-cream rounded-lg">
              <div className="w-2 h-2 bg-aneya-teal rounded-full mt-2 flex-shrink-0" />
              <p className="text-[15px] leading-[22px] text-aneya-navy">
                "Post-operative patient with suspected wound infection, fever 38.5°C"
              </p>
            </div>
          </div>
        </div>

        {/* What to Include Section */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-[10px] p-6 mb-8">
          <h2 className="text-[17px] leading-[22px] text-blue-900 font-medium mb-3">
            Valid clinical consultations should include:
          </h2>
          <ul className="space-y-2">
            <li className="text-[15px] leading-[22px] text-blue-800 flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Patient symptoms and complaints</span>
            </li>
            <li className="text-[15px] leading-[22px] text-blue-800 flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Clinical presentations or examination findings</span>
            </li>
            <li className="text-[15px] leading-[22px] text-blue-800 flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Medical history relevant to the current condition</span>
            </li>
            <li className="text-[15px] leading-[22px] text-blue-800 flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Requests for clinical decision support or treatment guidance</span>
            </li>
            <li className="text-[15px] leading-[22px] text-blue-800 flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Diagnostic scenarios requiring medical evaluation</span>
            </li>
          </ul>
        </div>

        {/* Return Home Button */}
        <div className="flex justify-center">
          <PrimaryButton onClick={onReturnHome}>
            Return to Home
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
