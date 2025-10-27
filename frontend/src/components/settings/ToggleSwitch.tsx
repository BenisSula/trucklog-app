import React from 'react';

interface ToggleSwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: {
      switch: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4',
    },
    md: {
      switch: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
    },
    lg: {
      switch: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-7',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-start justify-between ${className}`}>
      <div className="flex-1 min-w-0 mr-4">
        <label
          htmlFor={id}
          className={`block text-sm font-medium ${
            disabled ? 'text-neutral-400' : 'text-neutral-900'
          } cursor-pointer`}
        >
          {label}
        </label>
        {description && (
          <p className={`mt-1 text-sm ${
            disabled ? 'text-neutral-300' : 'text-neutral-500'
          }`}>
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex flex-shrink-0 ${currentSize.switch} border-2 border-transparent 
          rounded-full cursor-pointer transition-colors ease-in-out duration-200 
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${checked 
            ? 'bg-primary-600' 
            : 'bg-neutral-200'
          }
        `}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={`
            ${checked ? currentSize.translate : 'translate-x-0'}
            pointer-events-none inline-block ${currentSize.thumb} rounded-full 
            bg-white shadow transform ring-0 transition ease-in-out duration-200
          `}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch;