import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';

interface EditableSectionProps {
  value: string;
  onSave: (newValue: string) => void;
  onConfirmSave?: (newValue: string) => Promise<void>;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  labelClassName?: string;
}

/**
 * Reusable editable section component
 * Click to edit, with save/cancel controls
 */
export const EditableSection: React.FC<EditableSectionProps> = ({
  value,
  onSave,
  onConfirmSave,
  label,
  placeholder = 'Click to edit...',
  multiline = false,
  className = '',
  labelClassName = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local state when prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && multiline && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [isEditing, editValue, multiline]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      if (multiline && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      } else if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  }, [isEditing, multiline]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
    // Mark as having unsaved changes if onConfirmSave is available
    if (onConfirmSave && editValue !== value) {
      setHasUnsavedChanges(true);
      setSavedToDb(false);
    }
  };

  const handleConfirmSaveToDb = async () => {
    if (!onConfirmSave) return;

    setIsSavingToDb(true);
    try {
      await onConfirmSave(editValue);
      setHasUnsavedChanges(false);
      setSavedToDb(true);
      // Reset the saved indicator after 2 seconds
      setTimeout(() => setSavedToDb(false), 2000);
    } catch (error) {
      console.error('Failed to save to database:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSavingToDb(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      e.preventDefault();
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <div className={`${className}`}>
        <label className={`block mb-2 text-[14px] font-medium text-aneya-navy ${labelClassName}`}>
          {label}
        </label>
        <div className="relative">
          {multiline ? (
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full p-3 border-2 border-aneya-teal rounded-lg resize-none focus:outline-none focus:border-aneya-navy transition-colors text-[16px] leading-[1.5] text-aneya-navy"
              rows={3}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full p-3 border-2 border-aneya-teal rounded-lg focus:outline-none focus:border-aneya-navy transition-colors text-[16px] text-aneya-navy"
            />
          )}

          {/* Save/Cancel buttons */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 bg-aneya-teal text-white rounded-md hover:bg-aneya-seagreen transition-colors text-[14px] font-medium"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-aneya-navy rounded-md hover:bg-gray-300 transition-colors text-[14px] font-medium"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            {multiline && (
              <span className="text-[12px] text-gray-500 self-center ml-2">
                Ctrl+Enter to save
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <label className={`text-[14px] font-medium text-aneya-navy ${labelClassName}`}>
          {label}
        </label>
        {/* Confirm save checkbox/button */}
        {onConfirmSave && (hasUnsavedChanges || savedToDb) && (
          <div className="flex items-center gap-2">
            {savedToDb ? (
              <span className="flex items-center gap-1 text-[12px] text-green-600">
                <Check className="w-4 h-4" />
                Saved
              </span>
            ) : hasUnsavedChanges ? (
              <button
                onClick={handleConfirmSaveToDb}
                disabled={isSavingToDb}
                className="flex items-center gap-1 px-2 py-1 text-[12px] bg-amber-100 hover:bg-amber-200 text-amber-800 rounded transition-colors disabled:opacity-50"
              >
                {isSavingToDb ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3" />
                    Confirm change
                  </>
                )}
              </button>
            ) : null}
          </div>
        )}
      </div>
      <div
        onClick={() => setIsEditing(true)}
        className={`p-4 bg-white border-2 rounded-lg hover:border-aneya-navy transition-colors cursor-pointer group ${
          hasUnsavedChanges ? 'border-amber-400' : 'border-aneya-teal'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 text-[16px] text-aneya-navy whitespace-pre-wrap">
            {value || <span className="text-gray-400 italic">{placeholder}</span>}
          </div>
          <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-aneya-teal ml-2 flex-shrink-0 mt-1" />
        </div>
      </div>
    </div>
  );
};
