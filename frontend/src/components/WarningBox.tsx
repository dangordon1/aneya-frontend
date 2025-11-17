import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface WarningBoxProps {
  children: ReactNode;
  className?: string;
}

export function WarningBox({ children, className = '' }: WarningBoxProps) {
  return (
    <div className={`bg-[#FFF9E6] border-2 border-[#F0D1DA] rounded-[16px] p-4 flex gap-3 ${className}`}>
      <AlertTriangle className="w-5 h-5 text-[#351431] flex-shrink-0 mt-0.5" />
      <div className="text-[15px] leading-[22px] text-[#351431]">{children}</div>
    </div>
  );
}
