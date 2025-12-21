import { AlertTriangle } from 'lucide-react';

interface SaveConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  patientName: string;
  primaryDiagnosis: string;
  duration: string;
}

export function SaveConsultationModal({
  isOpen,
  onClose,
  onSave,
  patientName,
  primaryDiagnosis,
  duration
}: SaveConsultationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[16px] aneya-shadow-card border border-aneya-soft-pink p-6 max-w-md w-full mx-4">
        <h2 className="text-[26px] leading-[32px] text-aneya-navy mb-4">
          Save Consultation?
        </h2>

        {/* Consultation Details */}
        <div className="bg-aneya-cream rounded-[10px] p-4 mb-4 space-y-3">
          <div>
            <div className="text-[13px] text-gray-600 mb-1">Patient</div>
            <div className="text-[15px] text-aneya-navy font-medium">{patientName}</div>
          </div>

          <div>
            <div className="text-[13px] text-gray-600 mb-1">Primary Diagnosis</div>
            <div className="text-[15px] text-aneya-navy font-medium">{primaryDiagnosis}</div>
          </div>

          <div>
            <div className="text-[13px] text-gray-600 mb-1">Duration</div>
            <div className="text-[15px] text-aneya-navy font-medium">{duration}</div>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 bg-yellow-50 rounded-[10px] p-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
          <p className="text-[14px] text-aneya-navy">
            Unsaved consultations will be lost
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onSave}
            className="flex-1 bg-aneya-navy hover:bg-opacity-90 text-white px-6 py-3 rounded-[10px] transition-colors text-[15px] font-medium"
          >
            Save Consultation
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white hover:bg-gray-50 text-aneya-navy border-2 border-aneya-navy px-6 py-3 rounded-[10px] transition-colors text-[15px] font-medium"
          >
            Return Without Saving
          </button>
        </div>
      </div>
    </div>
  );
}
