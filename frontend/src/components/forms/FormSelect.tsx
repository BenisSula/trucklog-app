import React, { SelectHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';

interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  id: string;
  name?: string;
  error?: string;
  icon?: LucideIcon;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({
  id,
  name,
  error,
  icon: Icon,
  options,
  placeholder,
  className = '',
  required,
  ...rest
}) => {
  const baseClasses = 'appearance-none relative block w-full py-2 border placeholder-neutral-500 text-neutral-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors bg-white';
  const errorClasses = error ? 'border-error-300 focus:border-error-500 focus:ring-error-500' : 'border-neutral-300';
  const iconPadding = Icon ? 'pl-10' : 'pl-3';
  
  return (
    <div className="mt-1 relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <Icon className="h-5 w-5 text-neutral-400" />
        </div>
      )}
      <select
        id={id}
        name={name || id}
        required={required}
        {...(error ? { 'aria-invalid': 'true' } : { 'aria-invalid': 'false' })}
        {...(error ? { 'aria-describedby': `${id}-error` } : {})}
        className={`${baseClasses} ${errorClasses} ${iconPadding} pr-10 ${className}`}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
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
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-error-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormSelect;