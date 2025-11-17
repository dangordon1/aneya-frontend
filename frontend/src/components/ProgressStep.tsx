import { Clock, Loader2, CheckCircle2 } from 'lucide-react';

export type StepStatus = 'pending' | 'running' | 'complete';

interface ProgressStepProps {
  title: string;
  status: StepStatus;
  substeps?: string[];
  className?: string;
}

export function ProgressStep({ title, status, substeps, className = '' }: ProgressStepProps) {
  const getIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="w-6 h-6 text-[#8B7A87]" />;
      case 'running':
        return <Loader2 className="w-6 h-6 text-[#351431] animate-spin" />;
      case 'complete':
        return <CheckCircle2 className="w-6 h-6 text-[#351431]" />;
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'pending':
        return 'text-[#8B7A87]';
      case 'running':
        return 'text-[#351431]';
      case 'complete':
        return 'text-[#351431]';
    }
  };

  const getBgColor = () => {
    switch (status) {
      case 'pending':
        return 'bg-white';
      case 'running':
        return 'bg-[#F0D1DA]';
      case 'complete':
        return 'bg-[#F0D1DA]';
    }
  };

  return (
    <div className={`${getBgColor()} rounded-[16px] p-6 clara-shadow-card transition-all ${className}`}>
      <div className="flex items-start gap-4">
        {getIcon()}
        <div className="flex-1">
          <h3 className={`text-[17px] leading-[26px] ${getTextColor()}`}>{title}</h3>
          {substeps && status === 'running' && (
            <div className="mt-3 space-y-2">
              {substeps.map((substep, index) => (
                <div key={index} className="flex items-center gap-2 text-[15px] leading-[22px] text-[#5C3E53] ml-4">
                  <span>{substep}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
