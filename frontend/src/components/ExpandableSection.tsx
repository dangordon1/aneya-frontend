import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export function ExpandableSection({ title, children, defaultExpanded = false, className = '' }: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`border border-aneya-soft-pink rounded-[16px] overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-aneya-soft-pink transition-colors"
      >
        <h4 className="text-[18px] leading-[24px] text-aneya-navy">{title}</h4>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-aneya-navy" />
        ) : (
          <ChevronDown className="w-5 h-5 text-aneya-navy" />
        )}
      </button>
      {isExpanded && (
        <div className="px-6 py-4 bg-white border-t border-aneya-soft-pink">
          {children}
        </div>
      )}
    </div>
  );
}
