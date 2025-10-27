/**
 * Custom hook for form validation using React Hook Form and Yup
 */

import { useForm, UseFormReturn } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Common validation schemas
export const loginSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
});

export const registerSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  first_name: yup
    .string()
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required'),
  last_name: yup
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .required('Last name is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .required('Password is required'),
  password_confirm: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  phone_number: yup
    .string()
    .matches(/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number')
    .optional(),
  license_number: yup
    .string()
    .min(5, 'License number must be at least 5 characters')
    .optional(),
  company_name: yup
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .optional(),
});

export const profileSchema = yup.object({
  first_name: yup
    .string()
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required'),
  last_name: yup
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .required('Last name is required'),
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  phone_number: yup
    .string()
    .matches(/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number')
    .optional(),
});

export const driverProfileSchema = yup.object({
  cdl_number: yup
    .string()
    .min(5, 'CDL number must be at least 5 characters')
    .required('CDL number is required'),
  cdl_state: yup
    .string()
    .length(2, 'State must be 2 characters')
    .required('CDL state is required'),
  cdl_expiry: yup
    .date()
    .min(new Date(), 'CDL expiry must be in the future')
    .required('CDL expiry date is required'),
  medical_cert_expiry: yup
    .date()
    .min(new Date(), 'Medical certificate expiry must be in the future')
    .required('Medical certificate expiry date is required'),
  dot_number: yup
    .string()
    .min(6, 'DOT number must be at least 6 characters')
    .required('DOT number is required'),
  carrier_name: yup
    .string()
    .min(2, 'Carrier name must be at least 2 characters')
    .required('Carrier name is required'),
  home_terminal: yup
    .string()
    .min(2, 'Home terminal must be at least 2 characters')
    .required('Home terminal is required'),
  timezone: yup
    .string()
    .required('Timezone is required'),
  cycle_type: yup
    .string()
    .oneOf(['70_8', '60_7', '34_hour'], 'Invalid cycle type')
    .required('Cycle type is required'),
});

export const tripSchema = yup.object({
  trip_name: yup
    .string()
    .min(3, 'Trip name must be at least 3 characters')
    .required('Trip name is required'),
  pickup_location_id: yup
    .number()
    .positive('Please select a pickup location')
    .required('Pickup location is required'),
  delivery_location_id: yup
    .number()
    .positive('Please select a delivery location')
    .required('Delivery location is required'),
  planned_start_time: yup
    .date()
    .min(new Date(), 'Start time must be in the future')
    .required('Planned start time is required'),
  hours_used_before_trip: yup
    .number()
    .min(0, 'Hours used cannot be negative')
    .max(70, 'Hours used cannot exceed 70')
    .required('Hours used before trip is required'),
  notes: yup
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
});

export const logEntrySchema = yup.object({
  duty_status: yup
    .number()
    .positive('Please select a duty status')
    .required('Duty status is required'),
  start_time: yup
    .date()
    .required('Start time is required'),
  end_time: yup
    .date()
    .min(yup.ref('start_time'), 'End time must be after start time')
    .required('End time is required'),
  location: yup
    .string()
    .min(2, 'Location must be at least 2 characters')
    .required('Location is required'),
  city: yup
    .string()
    .min(2, 'City must be at least 2 characters')
    .required('City is required'),
  state: yup
    .string()
    .length(2, 'State must be 2 characters')
    .required('State is required'),
  remarks: yup
    .string()
    .max(500, 'Remarks must be less than 500 characters')
    .optional(),
});

// Generic hook for form validation
export const useFormValidation = <T extends Record<string, any>>(
  schema: yup.ObjectSchema<any>,
  defaultValues?: Partial<T>
): UseFormReturn<T> => {
  return useForm<T>({
    resolver: yupResolver(schema),
    defaultValues: defaultValues as any,
    mode: 'onChange',
  });
};

// Specific hooks for common forms
export const useLoginForm = () => {
  return useFormValidation(loginSchema, {
    email: '',
    password: '',
  });
};

export const useRegisterForm = () => {
  return useFormValidation(registerSchema, {
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    phone_number: '',
    license_number: '',
    company_name: '',
  });
};

export const useProfileForm = (defaultValues?: any) => {
  return useFormValidation(profileSchema, defaultValues);
};

export const useDriverProfileForm = (defaultValues?: any) => {
  return useFormValidation(driverProfileSchema, defaultValues);
};

export const useTripForm = () => {
  return useFormValidation(tripSchema, {
    trip_name: '',
    pickup_location_id: 0,
    delivery_location_id: 0,
    planned_start_time: new Date(),
    hours_used_before_trip: 0,
    notes: '',
  });
};

export const useLogEntryForm = () => {
  return useFormValidation(logEntrySchema, {
    duty_status: 0,
    start_time: new Date(),
    end_time: new Date(),
    location: '',
    city: '',
    state: '',
    remarks: '',
  });
};
