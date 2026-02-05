import { useRef, useEffect, useCallback } from 'react';

interface DiarizedSegment {
  speaker_id: string;
  speaker_role?: string;
  text: string;
  start_time: number;
  end_time: number;
  chunk_index: number;
}

interface DiarizedTranscriptEditorProps {
  segments: DiarizedSegment[];
  onSegmentsChange: (segments: DiarizedSegment[]) => void;
  speakerOptions?: string[];
  disabled?: boolean;
  maxHeight?: string;
  showFileLoad?: boolean;
}

const SPEAKER_COLORS: Record<string, { bg: string; text: string }> = {
  speaker_0: { bg: 'bg-blue-100', text: 'text-blue-800' },
  speaker_1: { bg: 'bg-green-100', text: 'text-green-800' },
};

function getSpeakerColor(speakerId: string) {
  return SPEAKER_COLORS[speakerId] || { bg: 'bg-gray-100', text: 'text-gray-700' };
}

export function parseTranscriptText(text: string): DiarizedSegment[] {
  // First, try parsing as numbered diarized format:
  //  1. [0.00 - 4.56] speaker_0:
  //      Good morning, how are you feeling today?
  const numberedPattern = /^\s*\d+\.\s*\[(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\]\s*(speaker_\d+):\s*\n\s+(.+)/;
  const numberedBlocks = text.split(/(?=\s*\d+\.\s*\[)/);
  const numberedSegments: DiarizedSegment[] = [];
  for (const block of numberedBlocks) {
    const match = block.match(numberedPattern);
    if (match) {
      numberedSegments.push({
        speaker_id: match[3].toLowerCase(),
        text: match[4].trim(),
        start_time: parseFloat(match[1]),
        end_time: parseFloat(match[2]),
        chunk_index: 0,
      });
    }
  }
  if (numberedSegments.length > 0) {
    return numberedSegments;
  }

  // Fall back to line-by-line parsing for old formats
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map((line, idx) => {
    // Match "speaker_0: text" or "Speaker 0: text"
    const speakerMatch = line.match(/^(speaker_\d+):\s*(.+)/i);
    if (speakerMatch) {
      return {
        speaker_id: speakerMatch[1].toLowerCase(),
        text: speakerMatch[2],
        start_time: idx,
        end_time: idx + 1,
        chunk_index: 0,
      };
    }
    // Match "Doctor: text" or "Patient: text" — map to speaker IDs
    const roleMatch = line.match(/^(Doctor|Patient|Nurse|Clinician):\s*(.+)/i);
    if (roleMatch) {
      const role = roleMatch[1].toLowerCase();
      const speakerId = role === 'doctor' || role === 'clinician' ? 'speaker_0' : 'speaker_1';
      return {
        speaker_id: speakerId,
        speaker_role: roleMatch[1],
        text: roleMatch[2],
        start_time: idx,
        end_time: idx + 1,
        chunk_index: 0,
      };
    }
    // Fallback: treat as speaker_0
    return {
      speaker_id: 'speaker_0',
      text: line.trim(),
      start_time: idx,
      end_time: idx + 1,
      chunk_index: 0,
    };
  });
}

export function segmentsToTranscriptText(segments: DiarizedSegment[]): string {
  return segments.map((s, idx) =>
    ` ${idx + 1}. [${s.start_time.toFixed(2)} - ${s.end_time.toFixed(2)}] ${s.speaker_id}:\n     ${s.text}`
  ).join('\n');
}

function AutoResizingTextarea({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={1}
      className="flex-1 text-[13px] text-gray-700 leading-relaxed bg-transparent border-none outline-none resize-none p-0 focus:ring-0"
      onInput={resize}
    />
  );
}

export function DiarizedTranscriptEditor({
  segments,
  onSegmentsChange,
  speakerOptions = ['speaker_0', 'speaker_1'],
  disabled = false,
  maxHeight = '400px',
  showFileLoad = false,
}: DiarizedTranscriptEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleSpeakerChange = (index: number, newSpeakerId: string) => {
    const updated = segments.map((seg, i) =>
      i === index ? { ...seg, speaker_id: newSpeakerId } : seg
    );
    onSegmentsChange(updated);
  };

  const handleTextChange = (index: number, newText: string) => {
    const updated = segments.map((seg, i) =>
      i === index ? { ...seg, text: newText } : seg
    );
    onSegmentsChange(updated);
  };

  const handleDeleteSegment = (index: number) => {
    const updated = segments.filter((_, i) => i !== index);
    onSegmentsChange(updated);
  };

  const handleAddSegment = () => {
    const lastSpeaker = segments.length > 0
      ? segments[segments.length - 1].speaker_id
      : 'speaker_0';
    // Alternate speaker
    const nextSpeaker = lastSpeaker === 'speaker_0' ? 'speaker_1' : 'speaker_0';
    const newSegment: DiarizedSegment = {
      speaker_id: nextSpeaker,
      text: '',
      start_time: segments.length,
      end_time: segments.length + 1,
      chunk_index: 0,
    };
    onSegmentsChange([...segments, newSegment]);
  };

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          console.error('JSON file must contain an array of segments');
          return;
        }
        const segments: DiarizedSegment[] = parsed
          .filter((item: Record<string, unknown>) => item && typeof item.speaker_id === 'string' && typeof item.text === 'string')
          .map((item: Record<string, unknown>, idx: number) => ({
            speaker_id: item.speaker_id as string,
            text: item.text as string,
            start_time: typeof item.start_time === 'number' ? item.start_time : idx,
            end_time: typeof item.end_time === 'number' ? item.end_time : idx + 1,
            chunk_index: typeof item.chunk_index === 'number' ? item.chunk_index : 0,
          }));
        onSegmentsChange(segments);
      } catch (err) {
        console.error('Failed to parse JSON file:', err);
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be loaded again
    e.target.value = '';
  };

  return (
    <div className="border-2 border-aneya-teal rounded-[10px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-[13px] font-medium text-aneya-navy">
          Editable Transcript
        </span>
        <span className="text-[11px] text-gray-500">
          {segments.length} segment{segments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Segment rows */}
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        {segments.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-gray-400 italic">
            No segments yet. Add a segment or load a transcript file.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {segments.map((seg, idx) => {
              const color = getSpeakerColor(seg.speaker_id);
              return (
                <div
                  key={idx}
                  className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 group"
                >
                  {/* Speaker dropdown */}
                  <select
                    value={seg.speaker_id}
                    onChange={(e) => handleSpeakerChange(idx, e.target.value)}
                    disabled={disabled}
                    className={`mt-0.5 px-2 py-0.5 rounded text-[11px] font-medium border-none cursor-pointer focus:ring-1 focus:ring-aneya-teal ${color.bg} ${color.text}`}
                  >
                    {speakerOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  {/* Editable text */}
                  <AutoResizingTextarea
                    value={seg.text}
                    onChange={(val) => handleTextChange(idx, val)}
                    disabled={disabled}
                  />

                  {/* Delete button */}
                  {!disabled && (
                    <button
                      onClick={() => handleDeleteSegment(idx)}
                      className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 text-[14px] leading-none px-1"
                      title="Remove segment"
                    >
                      &times;
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer actions */}
      {!disabled && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200">
          <button
            onClick={handleAddSegment}
            className="text-xs px-3 py-1 text-aneya-teal hover:bg-aneya-teal/10 rounded-md transition-colors"
          >
            + Add Segment
          </button>
          {showFileLoad && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileLoad}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-3 py-1 text-aneya-navy hover:bg-gray-200 rounded-md transition-colors"
              >
                Load from file...
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
