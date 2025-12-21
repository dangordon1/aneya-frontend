import { useState, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  icon?: ReactNode;
  level?: 1 | 2 | 3; // Visual hierarchy level
}

/**
 * Unified collapsible section component for clinical reports.
 * Provides consistent expand/collapse behavior across all report sections.
 */
export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  badge,
  icon,
  level = 1
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Style variants based on hierarchy level
  const levelStyles = {
    1: {
      container: 'border-b border-gray-200',
      header: 'py-4 px-0',
      title: 'text-[16px] font-semibold text-gray-900',
      content: 'pb-4',
    },
    2: {
      container: 'border-b border-gray-100 last:border-b-0',
      header: 'py-3 px-0',
      title: 'text-[15px] font-medium text-gray-800',
      content: 'pb-3',
    },
    3: {
      container: 'border-b border-gray-50 last:border-b-0',
      header: 'py-2 px-0',
      title: 'text-[14px] font-medium text-gray-700',
      content: 'pb-2',
    },
  };

  const styles = levelStyles[level];

  return (
    <div className={styles.container}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 ${styles.header} hover:bg-gray-50 transition-colors -mx-2 px-2 rounded`}
        aria-expanded={isOpen}
      >
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
        {icon && <span className="text-gray-500 flex-shrink-0">{icon}</span>}
        <span className={`${styles.title} flex-1 text-left`}>{title}</span>
        {badge !== undefined && (
          <span className="px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
            {badge}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`${styles.content} pl-7`}>
          {children}
        </div>
      )}
    </div>
  );
}
