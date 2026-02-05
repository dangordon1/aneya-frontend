import { useState, useEffect } from 'react';
import { Prescription } from '../types/database';
import { supabase } from '../lib/supabase';
import { Pill, Plus, Trash2, Save, X, Download } from 'lucide-react';

interface PrescriptionEditorProps {
  consultationId: string;
  initialPrescriptions: Prescription[];
  onSaved?: (prescriptions: Prescription[]) => void;
  readOnly?: boolean;
}

const EMPTY_PRESCRIPTION: Prescription = {
  drug_name: '',
  amount: null,
  method: null,
  frequency: null,
  duration: null,
};

const COLUMNS: { key: keyof Prescription; label: string }[] = [
  { key: 'drug_name', label: 'Drug Name' },
  { key: 'amount', label: 'Amount' },
  { key: 'method', label: 'Method' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'duration', label: 'Duration' },
];

export function PrescriptionEditor({
  consultationId,
  initialPrescriptions,
  onSaved,
  readOnly = false,
}: PrescriptionEditorProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(initialPrescriptions || []);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPrescriptions(initialPrescriptions || []);
    setHasChanges(false);
  }, [consultationId]);

  const handleCellChange = (rowIdx: number, key: keyof Prescription, value: string) => {
    setPrescriptions(prev => {
      const updated = [...prev];
      updated[rowIdx] = { ...updated[rowIdx], [key]: value || null };
      return updated;
    });
    setHasChanges(true);
  };

  const handleAddRow = () => {
    setPrescriptions(prev => [...prev, { ...EMPTY_PRESCRIPTION }]);
    setHasChanges(true);
  };

  const handleRemoveRow = (rowIdx: number) => {
    setPrescriptions(prev => prev.filter((_, i) => i !== rowIdx));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Filter out completely empty rows
      const cleaned = prescriptions.filter(p => p.drug_name.trim() !== '');

      const { error } = await supabase
        .from('consultations')
        .update({ prescriptions: cleaned })
        .eq('id', consultationId);

      if (error) throw error;

      setPrescriptions(cleaned);
      setHasChanges(false);
      onSaved?.(cleaned);
    } catch (err) {
      console.error('Failed to save prescriptions:', err);
      alert('Failed to save prescriptions. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (prescriptions.length === 0 && readOnly) {
    return null;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-aneya-navy" />
          <h5 className="text-[14px] font-semibold text-aneya-navy font-['Georgia',serif]">
            Prescriptions
          </h5>
        </div>
        {!readOnly && hasChanges && (
          <span className="text-[12px] text-amber-600 font-medium">Unsaved changes</span>
        )}
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-[#0c3555] text-white">
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} className="px-3 py-2 text-left font-medium text-[12px]">
                  {col.label}
                </th>
              ))}
              {!readOnly && <th className="px-3 py-2 w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {prescriptions.map((rx, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                {COLUMNS.map(col => (
                  <td key={col.key} className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-gray-700 text-[13px]">{rx[col.key] || '-'}</span>
                    ) : (
                      <input
                        type="text"
                        value={rx[col.key] || ''}
                        onChange={e => handleCellChange(rowIdx, col.key, e.target.value)}
                        placeholder={col.label}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-[13px] focus:border-[#1d9e99] focus:ring-1 focus:ring-[#1d9e99] outline-none"
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleRemoveRow(rowIdx)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {prescriptions.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length + (readOnly ? 0 : 1)}
                  className="px-3 py-4 text-center text-gray-400 italic text-[13px]"
                >
                  No prescriptions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 text-[13px] text-[#1d9e99] border border-[#1d9e99] rounded-[8px] hover:bg-[#1d9e99] hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Medication
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-3 py-1.5 text-[13px] bg-[#1d9e99] text-white rounded-[8px] hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save Prescriptions'}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Prescription Modal ---

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
  initialPrescriptions: Prescription[];
  onSaved?: (prescriptions: Prescription[]) => void;
  onDownloadPrescription?: (consultationId: string) => void;
  downloadingPrescription?: boolean;
  readOnly?: boolean;
}

export function PrescriptionModal({
  isOpen,
  onClose,
  consultationId,
  initialPrescriptions,
  onSaved,
  onDownloadPrescription,
  downloadingPrescription = false,
  readOnly = false,
}: PrescriptionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-aneya-navy" />
            <h3 className="text-[16px] font-semibold text-aneya-navy font-['Georgia',serif]">
              Prescriptions
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {onDownloadPrescription && (
              <button
                onClick={() => onDownloadPrescription(consultationId)}
                disabled={downloadingPrescription}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-[8px] text-[13px] font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Download className={`w-4 h-4 ${downloadingPrescription ? 'animate-bounce' : ''}`} />
                {downloadingPrescription ? 'Generating...' : 'Download PDF'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          <PrescriptionEditor
            consultationId={consultationId}
            initialPrescriptions={initialPrescriptions}
            onSaved={onSaved}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}
