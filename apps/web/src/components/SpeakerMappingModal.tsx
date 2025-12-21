import { useState } from 'react';

interface SpeakerSegment {
  speaker_id: string;
  text: string;
  start_time: number;
  end_time: number;
}

interface SpeakerMappingModalProps {
  isOpen: boolean;
  speakers: string[];
  segments: SpeakerSegment[];
  onConfirm: (mapping: Record<string, string>) => void;
  onCancel: () => void;
}

const SPEAKER_ROLES = [
  'Doctor',
  'Patient',
  "Patient's Family 1",
  "Patient's Family 2",
  'Other Clinician',
  'Unknown Speaker'
];

export function SpeakerMappingModal({
  isOpen,
  speakers,
  segments,
  onConfirm,
  onCancel
}: SpeakerMappingModalProps) {
  // Initialize mapping with empty values
  const [speakerMapping, setSpeakerMapping] = useState<Record<string, string>>(() => {
    const initialMapping: Record<string, string> = {};
    speakers.forEach((speaker) => {
      initialMapping[speaker] = '';
    });
    return initialMapping;
  });

  if (!isOpen) return null;

  const handleMappingChange = (speakerId: string, role: string) => {
    setSpeakerMapping((prev) => ({
      ...prev,
      [speakerId]: role
    }));
  };

  const handleConfirm = () => {
    // Validate that all speakers have been assigned a role
    const unassigned = speakers.filter(speaker => !speakerMapping[speaker]);
    if (unassigned.length > 0) {
      alert('Please assign a role to all speakers before confirming.');
      return;
    }

    onConfirm(speakerMapping);
  };

  // Get first utterance for each speaker as a sample
  const getSampleText = (speakerId: string): string => {
    const firstSegment = segments.find(seg => seg.speaker_id === speakerId);
    if (!firstSegment) return '';

    // Truncate to 100 characters
    const text = firstSegment.text.trim();
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[20px] max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-aneya-teal shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-aneya-navy text-white p-6 rounded-t-[18px]">
          <h2 className="text-[24px] font-medium mb-2">Assign Speaker Roles</h2>
          <p className="text-[14px] text-gray-200">
            {speakers.length} speakers detected. Please assign a role to each speaker.
          </p>
        </div>

        {/* Speaker Assignment List */}
        <div className="p-6 space-y-6">
          {speakers.map((speakerId, index) => (
            <div
              key={speakerId}
              className="border-2 border-gray-200 rounded-[12px] p-4 bg-gray-50"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-medium text-aneya-navy">
                  Speaker {index + 1} ({speakerId})
                </h3>
              </div>

              {/* Sample Text */}
              <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-[12px] text-gray-500 mb-1">Sample:</p>
                <p className="text-[14px] text-aneya-navy italic">
                  "{getSampleText(speakerId)}"
                </p>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-[12px] text-gray-600 mb-2">
                  Assign Role:
                </label>
                <select
                  value={speakerMapping[speakerId] || ''}
                  onChange={(e) => handleMappingChange(speakerId, e.target.value)}
                  className="w-full px-4 py-2 border-2 border-aneya-teal rounded-[8px] text-[14px] text-aneya-navy focus:outline-none focus:border-aneya-navy transition-colors"
                >
                  <option value="">-- Select Role --</option>
                  {SPEAKER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 p-6 rounded-b-[18px] border-t-2 border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-white border-2 border-gray-300 text-aneya-navy rounded-[10px] font-medium text-[14px] hover:bg-gray-50 transition-colors"
          >
            Skip Diarization
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-3 bg-aneya-navy text-white rounded-[10px] font-medium text-[14px] hover:bg-opacity-90 transition-colors"
          >
            Confirm Speakers
          </button>
        </div>
      </div>
    </div>
  );
}
