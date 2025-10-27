import React, { useState, InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import FormInput from './FormInput';
import FormLabel from './FormLabel';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  id?: string;
  name?: string;
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  id = 'password',
  name,
  label,
  error,
  required,
  className,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const rightIcon = (
    <button
      type="button"
      className="text-neutral-400 hover:text-neutral-500 focus:outline-none focus:text-neutral-500"
      onClick={togglePasswordVisibility}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? (
        <EyeOff className="h-5 w-5" />
      ) : (
        <Eye className="h-5 w-5" />
      )}
    </button>
  );

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
        type={showPassword ? 'text' : 'password'}
        error={error}
        icon={Lock}
        rightIcon={rightIcon}
        className={className}
        {...rest}
      />
    </div>
  );
};

export default PasswordInput;
