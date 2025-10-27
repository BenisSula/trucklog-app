import React from 'react';

interface FormLabelProps {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

const FormLabel: React.FC<FormLabelProps> = ({
  htmlFor,
  children,
  required = false,
  className = '',
}) => {
  return (
    <label 
      htmlFor={htmlFor} 
      className={`block text-sm font-medium text-neutral-700 mb-1 ${className}`}
    >
      {children}
      {required && <span className="text-error-500 ml-1" aria-label="required">*</span>}
    </label>
  );
};

export default FormLabel;


