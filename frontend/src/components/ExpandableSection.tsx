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
    <div className={`border border-[#F0D1DA] rounded-[16px] overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-[#F0D1DA] transition-colors"
      >
        <h4 className="text-[18px] leading-[24px] text-[#351431]">{title}</h4>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#351431]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#351431]" />
        )}
      </button>
      {isExpanded && (
        <div className="px-6 py-4 bg-white border-t border-[#F0D1DA]">
          {children}
        </div>
      )}
    </div>
  );
}
