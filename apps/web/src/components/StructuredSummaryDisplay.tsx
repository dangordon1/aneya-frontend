import React, { useState } from 'react';
import { FileText, Users, Clock, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { EditableSection } from './EditableSection';
import { SummaryData } from '../types/database';

interface StructuredSummaryDisplayProps {
  summaryData: SummaryData;
  onUpdate: (updatedData: SummaryData) => void;
  onConfirmFieldSave?: (updatedData: SummaryData) => Promise<void>;
}

export const StructuredSummaryDisplay: React.FC<StructuredSummaryDisplayProps> = ({
  summaryData,
  onUpdate,
  onConfirmFieldSave
}) => {
  const [expandedSections, setExpandedSections] = useState({
    metadata: false,
    reviewOfSystems: false,
    plan: true,
    timeline: false,
    keyInfo: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateField = (path: string[], value: any) => {
    const updated = JSON.parse(JSON.stringify(summaryData));
    let current: any = updated;

    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;

    onUpdate(updated);
  };

  // Create a callback for confirming field save to DB
  const createConfirmSaveCallback = (path: string[]) => {
    if (!onConfirmFieldSave) return undefined;

    return async (value: string) => {
      const updated = JSON.parse(JSON.stringify(summaryData));
      let current: any = updated;

      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;

      await onConfirmFieldSave(updated);
    };
  };

  const clinical = summaryData.clinical_summary || {};
  const metadata = summaryData.metadata || {};
  const timeline = summaryData.timeline || [];
  const keyConcerns = summaryData.key_concerns || [];
  const recommendations = summaryData.recommendations_given || [];

  return (
    <div className="space-y-4">
      {/* Metadata Section - Collapsible */}
      {metadata && Object.keys(metadata).length > 0 && (
        <div className="border-2 border-indigo-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('metadata')}
            className="w-full flex items-center justify-between p-3 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-aneya-teal" />
              <h4 className="text-[16px] font-semibold text-aneya-navy">Consultation Information</h4>
            </div>
            {expandedSections.metadata ? (
              <ChevronUp className="w-5 h-5 text-aneya-navy" />
            ) : (
              <ChevronDown className="w-5 h-5 text-aneya-navy" />
            )}
          </button>

          {expandedSections.metadata && (
            <div className="p-4 bg-white space-y-2">
              {metadata.location && (
                <div className="flex gap-2">
                  <span className="text-[14px] font-medium text-aneya-navy">Location:</span>
                  <span className="text-[14px] text-aneya-navy">{metadata.location}</span>
                </div>
              )}
              {metadata.consultation_duration_seconds && (
                <div className="flex gap-2">
                  <span className="text-[14px] font-medium text-aneya-navy">Duration:</span>
                  <span className="text-[14px] text-aneya-navy">
                    {Math.floor(metadata.consultation_duration_seconds / 60)}m {Math.floor(metadata.consultation_duration_seconds % 60)}s
                  </span>
                </div>
              )}
              {metadata.patient_info && Object.keys(metadata.patient_info).length > 0 && (
                <div className="space-y-1">
                  <span className="text-[14px] font-medium text-aneya-navy">Patient Info:</span>
                  {Object.entries(metadata.patient_info).map(([key, value]) => (
                    <div key={key} className="pl-4 text-[13px] text-aneya-navy">
                      {key}: {String(value)}
                    </div>
                  ))}
                </div>
              )}
              {summaryData.speakers && Object.keys(summaryData.speakers).length > 0 && (
                <div className="flex gap-2">
                  <span className="text-[14px] font-medium text-aneya-navy">Speakers:</span>
                  <span className="text-[14px] text-aneya-navy">
                    {Object.entries(summaryData.speakers).map(([role, name]) => `${role} (${name})`).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SOAP Notes Section - Always Visible, Primary Focus */}
      <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 p-3 bg-blue-50 border-b border-blue-200">
          <FileText className="w-5 h-5 text-aneya-teal" />
          <h4 className="text-[16px] font-semibold text-aneya-navy">SOAP Notes</h4>
        </div>

        <div className="p-4 space-y-4 bg-white">
          {/* Subjective - Chief Complaint */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="text-[15px] font-semibold text-aneya-navy mb-3">Subjective</h5>
            <EditableSection
              value={clinical.chief_complaint || ''}
              onSave={(v) => updateField(['clinical_summary', 'chief_complaint'], v)}
              onConfirmSave={createConfirmSaveCallback(['clinical_summary', 'chief_complaint'])}
              label="Chief Complaint"
              placeholder="Primary reason for consultation..."
            />
          </div>

          {/* Subjective - HPI */}
          <EditableSection
            value={clinical.history_present_illness || ''}
            onSave={(v) => updateField(['clinical_summary', 'history_present_illness'], v)}
            onConfirmSave={createConfirmSaveCallback(['clinical_summary', 'history_present_illness'])}
            label="History of Present Illness"
            placeholder="Detailed chronological description..."
            multiline
            className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
          />

          {/* Review of Systems - Collapsible */}
          {clinical.review_of_systems && Object.keys(clinical.review_of_systems).length > 0 && (
            <div className="border border-blue-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('reviewOfSystems')}
                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <h5 className="text-[15px] font-semibold text-aneya-navy">Review of Systems</h5>
                {expandedSections.reviewOfSystems ? (
                  <ChevronUp className="w-4 h-4 text-aneya-navy" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-aneya-navy" />
                )}
              </button>
              {expandedSections.reviewOfSystems && (
                <div className="p-4 space-y-3 bg-white">
                  {Object.entries(clinical.review_of_systems).map(([system, findings]) => (
                    findings && findings !== 'Not discussed' && (
                      <div key={system} className="space-y-1">
                        <h6 className="text-[14px] font-medium text-aneya-navy capitalize">{system}:</h6>
                        <p className="text-[14px] text-aneya-navy pl-3">{findings}</p>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Objective - Physical Examination */}
          {clinical.physical_examination && (
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
              <h5 className="text-[15px] font-semibold text-aneya-navy mb-3">Objective</h5>
              <EditableSection
                value={clinical.physical_examination}
                onSave={(v) => updateField(['clinical_summary', 'physical_examination'], v)}
                onConfirmSave={createConfirmSaveCallback(['clinical_summary', 'physical_examination'])}
                label="Physical Examination"
                placeholder="Examination findings..."
                multiline
              />
            </div>
          )}

          {/* Objective - Investigations */}
          {((Array.isArray(clinical.investigations_reviewed) && clinical.investigations_reviewed.length > 0) ||
            (Array.isArray(clinical.investigations_ordered) && clinical.investigations_ordered.length > 0)) && (
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg space-y-3">
              {Array.isArray(clinical.investigations_reviewed) && clinical.investigations_reviewed.length > 0 && (
                <div>
                  <h6 className="text-[14px] font-medium text-aneya-navy mb-2">Investigations Reviewed:</h6>
                  <ul className="list-disc pl-5 space-y-1">
                    {clinical.investigations_reviewed.map((inv, idx) => (
                      <li key={idx} className="text-[14px] text-aneya-navy">{inv}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(clinical.investigations_ordered) && clinical.investigations_ordered.length > 0 && (
                <div>
                  <h6 className="text-[14px] font-medium text-aneya-navy mb-2">Investigations Ordered:</h6>
                  <ul className="list-disc pl-5 space-y-1">
                    {clinical.investigations_ordered.map((inv, idx) => (
                      <li key={idx} className="text-[14px] text-aneya-navy">{inv}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Assessment */}
          {clinical.assessment && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <h5 className="text-[15px] font-semibold text-aneya-navy mb-3">Assessment</h5>
              <EditableSection
                value={clinical.assessment}
                onSave={(v) => updateField(['clinical_summary', 'assessment'], v)}
                onConfirmSave={createConfirmSaveCallback(['clinical_summary', 'assessment'])}
                label="Clinical Assessment"
                placeholder="Working diagnosis and clinical impression..."
                multiline
              />
            </div>
          )}

          {/* Plan - Expandable */}
          {clinical.plan && (
            <div className="border border-green-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('plan')}
                className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition-colors"
              >
                <h5 className="text-[15px] font-semibold text-aneya-navy">Plan</h5>
                {expandedSections.plan ? (
                  <ChevronUp className="w-4 h-4 text-aneya-navy" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-aneya-navy" />
                )}
              </button>
              {expandedSections.plan && (
                <div className="p-4 space-y-4 bg-white">
                  {Array.isArray(clinical.plan.diagnostic) && clinical.plan.diagnostic.length > 0 && (
                    <div>
                      <h6 className="text-[14px] font-medium text-aneya-navy mb-2">Diagnostic:</h6>
                      <ul className="list-disc pl-5 space-y-1">
                        {clinical.plan.diagnostic.map((item, idx) => (
                          <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(clinical.plan.therapeutic) && clinical.plan.therapeutic.length > 0 && (
                    <div>
                      <h6 className="text-[14px] font-medium text-aneya-navy mb-2">Therapeutic:</h6>
                      <ul className="list-disc pl-5 space-y-1">
                        {clinical.plan.therapeutic.map((item, idx) => (
                          <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(clinical.plan.patient_education) && clinical.plan.patient_education.length > 0 && (
                    <div>
                      <h6 className="text-[14px] font-medium text-aneya-navy mb-2">Patient Education:</h6>
                      <ul className="list-disc pl-5 space-y-1">
                        {clinical.plan.patient_education.map((item, idx) => (
                          <li key={idx} className="text-[14px] text-aneya-navy">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {clinical.plan.follow_up && (
                    <div>
                      <h6 className="text-[14px] font-medium text-aneya-navy mb-2">Follow-up:</h6>
                      <p className="text-[14px] text-aneya-navy pl-3">{clinical.plan.follow_up}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Timeline Section - Collapsible */}
      {Array.isArray(timeline) && timeline.length > 0 && (
        <div className="border-2 border-amber-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('timeline')}
            className="w-full flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-aneya-teal" />
              <h4 className="text-[16px] font-semibold text-aneya-navy">Timeline</h4>
            </div>
            {expandedSections.timeline ? (
              <ChevronUp className="w-5 h-5 text-aneya-navy" />
            ) : (
              <ChevronDown className="w-5 h-5 text-aneya-navy" />
            )}
          </button>

          {expandedSections.timeline && (
            <div className="p-4 bg-white space-y-3">
              {timeline.map((item, idx) => (
                <div key={idx} className="flex gap-3 pb-3 border-b last:border-b-0 border-amber-100">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[12px] font-bold mt-1">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h6 className="text-[14px] font-medium text-aneya-navy">{item.event || 'Event'}</h6>
                      {item.time && <span className="text-[12px] text-gray-500">({item.time})</span>}
                    </div>
                    {item.details && <p className="text-[14px] text-aneya-navy">{item.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Key Information Section - Collapsible */}
      {((Array.isArray(keyConcerns) && keyConcerns.length > 0) ||
        (Array.isArray(recommendations) && recommendations.length > 0)) && (
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('keyInfo')}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-aneya-teal" />
              <h4 className="text-[16px] font-semibold text-aneya-navy">Key Information</h4>
            </div>
            {expandedSections.keyInfo ? (
              <ChevronUp className="w-5 h-5 text-aneya-navy" />
            ) : (
              <ChevronDown className="w-5 h-5 text-aneya-navy" />
            )}
          </button>

          {expandedSections.keyInfo && (
            <div className="p-4 bg-white space-y-4">
              {Array.isArray(keyConcerns) && keyConcerns.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <h5 className="text-[15px] font-semibold text-aneya-navy">Patient Concerns</h5>
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {keyConcerns.map((concern, idx) => (
                      <li key={idx} className="text-[14px] text-aneya-navy">{concern}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(recommendations) && recommendations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <h5 className="text-[15px] font-semibold text-aneya-navy">Recommendations Given</h5>
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {recommendations.map((rec, idx) => (
                      <li key={idx} className="text-[14px] text-aneya-navy">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
