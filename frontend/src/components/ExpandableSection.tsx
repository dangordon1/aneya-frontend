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
    <div className={`border border-[#1d9e99] rounded-[16px] overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-[#1d9e99] transition-colors"
      >
        <h4 className="text-[18px] leading-[24px] text-[#0c3555]">{title}</h4>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#0c3555]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#0c3555]" />
        )}
      </button>
      {isExpanded && (
        <div className="px-6 py-4 bg-white border-t border-[#1d9e99]">
          {children}
        </div>
      )}
    </div>
  );
}
