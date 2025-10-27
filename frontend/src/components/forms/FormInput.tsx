import React, { InputHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  id: string;
  name?: string;
  error?: string;
  icon?: LucideIcon;
  rightIcon?: React.ReactNode;
  className?: string;
}

const FormInput: React.FC<FormInputProps> = ({
  id,
  name,
  type = 'text',
  placeholder,
  autoComplete,
  error,
  icon: Icon,
  rightIcon,
  className = '',
  required,
  ...rest
}) => {
  const baseClasses = 'appearance-none relative block w-full pl-10 pr-10 py-2 border placeholder-neutral-500 text-neutral-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors';
  const errorClasses = error ? 'border-error-300 focus:border-error-500 focus:ring-error-500' : 'border-neutral-300';
  const iconPadding = Icon ? 'pl-10' : 'pl-3';
  const rightIconPadding = rightIcon ? 'pr-10' : 'pr-3';
  
  return (
    <div className="mt-1 relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-neutral-400" />
        </div>
      )}
      <input
        id={id}
        name={name || id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete || 'off'}
        required={required}
        {...(error ? { 'aria-invalid': 'true' } : { 'aria-invalid': 'false' })}
        {...(error ? { 'aria-describedby': `${id}-error` } : {})}
        className={`${baseClasses} ${errorClasses} ${iconPadding} ${rightIconPadding} ${className}`}
        {...rest}
      />
      {rightIcon && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {rightIcon}
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-error-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;
