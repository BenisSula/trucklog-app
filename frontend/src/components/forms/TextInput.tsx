import React, { InputHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';
import FormInput from './FormInput';
import FormLabel from './FormLabel';

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  id?: string;
  name?: string;
  label?: string;
  error?: string;
  icon?: LucideIcon;
  required?: boolean;
  className?: string;
}

const TextInput: React.FC<TextInputProps> = ({
  id,
  name,
  label,
  error,
  icon,
  required,
  className,
  ...rest
}) => {
  // Generate a unique ID if not provided
  const inputId = id || `text-input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div>
      {label && (
        <FormLabel htmlFor={inputId} required={required}>
          {label}
        </FormLabel>
      )}
      <FormInput
        id={inputId}
        name={name || inputId}
        type="text"
        error={error}
        icon={icon}
        className={className}
        {...rest}
      />
    </div>
  );
};

export default TextInput;
