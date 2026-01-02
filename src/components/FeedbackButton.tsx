import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';

interface FeedbackButtonProps {
  onFeedback: (sentiment: 'positive' | 'negative') => Promise<void>;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  initialSentiment?: 'positive' | 'negative' | null;
}

export function FeedbackButton({
  onFeedback,
  disabled = false,
  className = '',
  size = 'md',
  showLabels = false,
  initialSentiment = null
}: FeedbackButtonProps) {
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(initialSentiment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Update internal state when initialSentiment prop changes
  useEffect(() => {
    setSentiment(initialSentiment);
  }, [initialSentiment]);

  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }[size];

  const buttonPadding = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3'
  }[size];

  const handleFeedback = async (newSentiment: 'positive' | 'negative') => {
    if (isSubmitting || disabled) return;

    // Allow changing feedback
    if (sentiment === newSentiment) {
      // Clicking same button again - no-op (or could remove feedback)
      return;
    }

    setIsSubmitting(true);
    try {
      await onFeedback(newSentiment);
      setSentiment(newSentiment);

      // Show confirmation briefly
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Could show error toast here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabels && (
        <span className="text-sm text-gray-600 mr-1">Was this helpful?</span>
      )}

      {/* Thumbs Up Button */}
      <button
        onClick={() => handleFeedback('positive')}
        disabled={disabled || isSubmitting}
        className={`
          ${buttonPadding} rounded-lg transition-all duration-200
          ${sentiment === 'positive'
            ? 'bg-green-100 text-green-700 border-2 border-green-400'
            : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-green-50 hover:text-green-600'
          }
          ${disabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title="Helpful"
      >
        <ThumbsUp className={iconSize} />
      </button>

      {/* Thumbs Down Button */}
      <button
        onClick={() => handleFeedback('negative')}
        disabled={disabled || isSubmitting}
        className={`
          ${buttonPadding} rounded-lg transition-all duration-200
          ${sentiment === 'negative'
            ? 'bg-red-100 text-red-700 border-2 border-red-400'
            : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-red-50 hover:text-red-600'
          }
          ${disabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title="Not helpful"
      >
        <ThumbsDown className={iconSize} />
      </button>

      {/* Confirmation checkmark */}
      {showConfirmation && (
        <CheckCircle className="w-4 h-4 text-green-600 animate-pulse" />
      )}
    </div>
  );
}
