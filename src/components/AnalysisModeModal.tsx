import { useState } from 'react';
import { X, FileText, FlaskConical, Layers } from 'lucide-react';
import { Consultation } from '../types/database';

export type AnalysisMode = 'guidelines' | 'research' | 'both';

interface AnalysisModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: AnalysisMode) => void;
  consultation?: Consultation; // If re-analyzing existing consultation
}

export function AnalysisModeModal({
  isOpen,
  onClose,
  onSelectMode,
  consultation
}: AnalysisModeModalProps) {
  const [selectedMode, setSelectedMode] = useState<AnalysisMode>('guidelines');

  // Check what analysis has already been done
  const hasGuidelineAnalysis = consultation?.summary_data != null;
  const hasResearchAnalysis = consultation?.research_findings != null;

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSelectMode(selectedMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-[16px] max-w-[500px] w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-[18px] font-semibold text-gray-900">
            Choose Analysis Type
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Guidelines-Based Analysis */}
          <label
            className={`relative flex items-start p-4 border-2 rounded-[12px] cursor-pointer transition-all ${
              selectedMode === 'guidelines'
                ? 'border-aneya-teal bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${hasGuidelineAnalysis ? 'opacity-50' : ''}`}
          >
            <input
              type="radio"
              name="analysisMode"
              value="guidelines"
              checked={selectedMode === 'guidelines'}
              onChange={(e) => setSelectedMode(e.target.value as AnalysisMode)}
              disabled={hasGuidelineAnalysis}
              className="mt-1 text-aneya-teal focus:ring-aneya-teal"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-aneya-teal" />
                <span className="text-[14px] font-semibold text-gray-900">
                  Guidelines-Based Analysis
                  {hasGuidelineAnalysis && (
                    <span className="ml-2 text-[12px] text-green-600">✓ Completed</span>
                  )}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-gray-600">
                Uses NICE, FOGSI, AIIMS clinical guidelines
              </p>
              <p className="mt-1 text-[12px] text-gray-500 italic">
                Recommended for standard care protocols
              </p>
            </div>
          </label>

          {/* Research Papers Analysis */}
          <label
            className={`relative flex items-start p-4 border-2 rounded-[12px] cursor-pointer transition-all ${
              selectedMode === 'research'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${hasResearchAnalysis ? 'opacity-50' : ''}`}
          >
            <input
              type="radio"
              name="analysisMode"
              value="research"
              checked={selectedMode === 'research'}
              onChange={(e) => setSelectedMode(e.target.value as AnalysisMode)}
              disabled={hasResearchAnalysis}
              className="mt-1 text-indigo-600 focus:ring-indigo-600"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-indigo-600" />
                <span className="text-[14px] font-semibold text-gray-900">
                  Research Papers Analysis
                  {hasResearchAnalysis && (
                    <span className="ml-2 text-[12px] text-green-600">✓ Completed</span>
                  )}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-gray-600">
                Uses latest research (last 5 years) from Q1/Q2 journals
              </p>
              <p className="mt-1 text-[12px] text-gray-500 italic">
                Sources: BMJ, Scopus, PubMed
              </p>
            </div>
          </label>

          {/* Both */}
          <label
            className={`relative flex items-start p-4 border-2 rounded-[12px] cursor-pointer transition-all ${
              selectedMode === 'both'
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${hasGuidelineAnalysis && hasResearchAnalysis ? 'opacity-50' : ''}`}
          >
            <input
              type="radio"
              name="analysisMode"
              value="both"
              checked={selectedMode === 'both'}
              onChange={(e) => setSelectedMode(e.target.value as AnalysisMode)}
              disabled={hasGuidelineAnalysis && hasResearchAnalysis}
              className="mt-1 text-purple-600 focus:ring-purple-600"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <span className="text-[14px] font-semibold text-gray-900">
                  Both (Guidelines + Research)
                  {hasGuidelineAnalysis && hasResearchAnalysis && (
                    <span className="ml-2 text-[12px] text-green-600">✓ Completed</span>
                  )}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-gray-600">
                Comprehensive analysis with both evidence sources
              </p>
              <p className="mt-1 text-[12px] text-gray-500 italic">
                Takes ~2-3 minutes (runs sequentially)
              </p>
            </div>
          </label>

          {/* Info message if re-analyzing */}
          {consultation && (hasGuidelineAnalysis || hasResearchAnalysis) && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-[8px]">
              <p className="text-[12px] text-blue-800">
                <strong>Note:</strong> Already completed analysis types are disabled.
                Select an analysis type that hasn't been run yet.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[14px] font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-aneya-navy text-white rounded-[8px] text-[14px] font-medium hover:bg-opacity-90 transition-all"
          >
            Analyze
          </button>
        </div>
      </div>
    </div>
  );
}
