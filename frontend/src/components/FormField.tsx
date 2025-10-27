import React from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'select' | 'textarea' | 'datetime-local';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  options?: Array<{ value: string | number; label: string }>;
  className?: string;
  error?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  required = false,
  placeholder,
  maxLength,
  rows = 3,
  options = [],
  className = '',
  error
}) => {
  const baseInputClass = `w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
    error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
  } ${className}`;

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            name={name}
            value={value}
            onChange={onChange}
            className={baseInputClass}
            required={required}
            aria-label={label}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            rows={rows}
            className={baseInputClass}
            placeholder={placeholder}
            maxLength={maxLength}
            required={required}
            aria-label={label}
          />
        );
      
      default:
        return (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            className={baseInputClass}
            placeholder={placeholder}
            maxLength={maxLength}
            required={required}
            aria-label={label}
          />
        );
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {renderInput()}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FormField;