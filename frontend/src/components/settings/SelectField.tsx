import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectFieldProps {
  id: string;
  label: string;
  description?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  description,
  value,
  options,
  onChange,
  icon: Icon,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor={id}
        className={`block text-sm font-medium ${
          disabled ? 'text-neutral-400' : 'text-neutral-900'
        }`}
      >
        {label}
      </label>
      {description && (
        <p className={`text-sm ${
          disabled ? 'text-neutral-300' : 'text-neutral-500'
        }`}>
          {description}
        </p>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-neutral-400" />
          </div>
        )}
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            appearance-none block w-full ${Icon ? 'pl-10' : 'pl-3'} pr-10 py-2 text-base border-neutral-300 
            focus:outline-none focus:ring-primary-500 focus:border-primary-500 
            sm:text-sm rounded-md transition-colors
            ${disabled ? 'bg-neutral-50 text-neutral-400 cursor-not-allowed' : 'bg-white'}
          `}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-neutral-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default SelectField;