import { InputHTMLAttributes, forwardRef } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

/**
 * Standard checkbox component for all forms
 * - Larger, more visible checkbox (24x24px)
 * - Consistent styling with focus states
 * - Optional label and description
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', ...props }, ref) => {
    const checkboxId = props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    if (label || description) {
      return (
        <label htmlFor={checkboxId} className="flex items-start gap-3 cursor-pointer group">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={`
              w-6 h-6 mt-0.5
              rounded-md
              border-2 border-gray-300
              text-aneya-teal
              focus:ring-2 focus:ring-aneya-teal focus:ring-offset-2
              hover:border-aneya-teal
              transition-colors
              cursor-pointer
              ${className}
            `.trim()}
            {...props}
          />
          <div className="flex-1">
            {label && (
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {label}
              </span>
            )}
            {description && (
              <p className="text-xs text-gray-500 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </label>
      );
    }

    return (
      <input
        ref={ref}
        type="checkbox"
        id={checkboxId}
        className={`
          w-6 h-6
          rounded-md
          border-2 border-gray-300
          text-aneya-teal
          focus:ring-2 focus:ring-aneya-teal focus:ring-offset-2
          hover:border-aneya-teal
          transition-colors
          cursor-pointer
          ${className}
        `.trim()}
        {...props}
      />
    );
  }
);

Checkbox.displayName = 'Checkbox';
