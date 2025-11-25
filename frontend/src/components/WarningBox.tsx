import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface WarningBoxProps {
  children: ReactNode;
  className?: string;
}

export function WarningBox({ children, className = '' }: WarningBoxProps) {
  return (
    <div className={`bg-aneya-warning-bg border-2 border-aneya-soft-pink rounded-[16px] p-4 flex gap-3 ${className}`}>
      <AlertTriangle className="w-5 h-5 text-aneya-navy flex-shrink-0 mt-0.5" />
      <div className="text-[15px] leading-[22px] text-aneya-navy">{children}</div>
    </div>
  );
}
