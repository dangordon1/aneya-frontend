import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface WarningBoxProps {
  children: ReactNode;
  className?: string;
}

export function WarningBox({ children, className = '' }: WarningBoxProps) {
  return (
    <div className={`bg-[#FFF9E6] border-2 border-[#1d9e99] rounded-[16px] p-4 flex gap-3 ${className}`}>
      <AlertTriangle className="w-5 h-5 text-[#0c3555] flex-shrink-0 mt-0.5" />
      <div className="text-[15px] leading-[22px] text-[#0c3555]">{children}</div>
    </div>
  );
}
