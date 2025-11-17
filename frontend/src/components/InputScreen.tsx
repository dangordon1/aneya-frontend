import { useState } from 'react';
import { PrimaryButton } from './PrimaryButton';

interface InputScreenProps {
  onAnalyze: (consultation: string, patientId: string) => void;
}

const EXAMPLE_CONSULTATION = `Patient presents with a 3-day history of productive cough with green sputum, fever (38.5°C), and shortness of breath. They report feeling generally unwell with fatigue and reduced appetite. Past medical history includes type 2 diabetes mellitus (well controlled on metformin) and hypertension (on ramipril). No known drug allergies. Non-smoker. On examination: respiratory rate 22/min, oxygen saturation 94% on air, crackles heard in right lower zone on auscultation.`;

export function InputScreen({ onAnalyze }: InputScreenProps) {
  const [consultation, setConsultation] = useState(EXAMPLE_CONSULTATION);
  const [patientId, setPatientId] = useState('P004');

  const handleAnalyze = () => {
    if (consultation.trim()) {
      onAnalyze(consultation, patientId);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-[32px] leading-[38px] text-[#351431] mb-8">Clinical Decision Support</h1>

        {/* Patient ID - above consultation summary */}
        <div className="mb-6">
          <label htmlFor="patient-id" className="block mb-2 text-[14px] leading-[18px] text-[#351431]">
            Patient ID:
          </label>
          <input
            id="patient-id"
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="e.g., P004"
            className="w-full max-w-xs p-3 border-2 border-[#F0D1DA] rounded-[10px] focus:outline-none focus:border-[#351431] transition-colors text-[16px] leading-[1.5] text-[#351431]"
          />
        </div>

        {/* Consultation summary */}
        <div>
          <label htmlFor="consultation" className="block mb-3 text-[14px] leading-[18px] text-[#351431]">
            Heidi consultation summary:
          </label>
          <textarea
            id="consultation"
            value={consultation}
            onChange={(e) => setConsultation(e.target.value)}
            placeholder={EXAMPLE_CONSULTATION}
            className="w-full h-[300px] p-4 border-2 border-[#F0D1DA] rounded-[10px] resize-none focus:outline-none focus:border-[#351431] transition-colors text-[16px] leading-[1.5] text-[#351431]"
          />
        </div>

        {/* Bottom button */}
        <div className="mt-12">
          <PrimaryButton onClick={handleAnalyze} fullWidth>
            Analyse Consultation
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
