import type { ReactNode } from 'react';

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export function PrimaryButton({ children, onClick, fullWidth = false, disabled = false, className = '' }: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-[#0c3555] text-white px-8 py-3 rounded-[10px]
        hover:bg-[#4A1E45] transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        aneya-shadow-button
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
