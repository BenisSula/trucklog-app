import React, { InputHTMLAttributes } from 'react';
import { Mail } from 'lucide-react';
import FormInput from './FormInput';
import FormLabel from './FormLabel';

interface EmailInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  id?: string;
  name?: string;
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

const EmailInput: React.FC<EmailInputProps> = ({
  id = 'email',
  name,
  label,
  error,
  required,
  className,
  ...rest
}) => {
  return (
    <div>
      {label && (
        <FormLabel htmlFor={id} required={required}>
          {label}
        </FormLabel>
      )}
      <FormInput
        id={id}
        name={name}
        type="email"
        error={error}
        icon={Mail}
        className={className}
        {...rest}
      />
    </div>
  );
};

export default EmailInput;
