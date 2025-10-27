import React from 'react';
import { LucideIcon } from 'lucide-react';
import FormInput from './FormInput';
import FormSelect from './FormSelect';

interface BaseFieldProps {
  id: string;
  name?: string;
  label: string;
  error?: string;
  icon?: LucideIcon;
  required?: boolean;
  className?: string;
  helpText?: string;
}

interface InputFieldProps extends BaseFieldProps {
  type: 'text' | 'email' | 'tel' | 'date' | 'datetime-local' | 'number';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}

interface SelectFieldProps extends BaseFieldProps {
  type: 'select';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

type FormFieldProps = InputFieldProps | SelectFieldProps;

const FormField: React.FC<FormFieldProps> = (props) => {
  const { id, name, label, error, icon, required, className = '', helpText } = props;

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-error-500 ml-1">*</span>}
      </label>
      
      {props.type === 'select' ? (
        <FormSelect
          id={id}
          name={name}
          value={props.value}
          onChange={props.onChange}
          options={props.options}
          placeholder={props.placeholder}
          error={error}
          icon={icon}
          required={required}
        />
      ) : (
        <FormInput
          id={id}
          name={name}
          type={props.type}
          value={props.value}
          onChange={props.onChange}
          placeholder={props.placeholder}
          error={error}
          icon={icon}
          required={required}
          min={props.min}
          max={props.max}
          step={props.step}
        />
      )}
      
      {helpText && (
        <p className="text-xs text-neutral-500">{helpText}</p>
      )}
    </div>
  );
};

export default FormField;