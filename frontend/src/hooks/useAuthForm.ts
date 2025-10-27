import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Validation schemas
const loginSchema = yup.object({
  email: yup.string()
    .email('Invalid email format')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address')
    .required('Email is required'),
  password: yup.string()
    .min(1, 'Password is required')
    .required('Password is required'),
});

const registerSchema = yup.object({
  email: yup.string()
    .email('Invalid email format')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address')
    .required('Email is required'),
  first_name: yup.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters')
    .matches(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces')
    .required('First name is required'),
  last_name: yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters')
    .matches(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces')
    .required('Last name is required'),
  password: yup.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 
      'Password must contain uppercase, lowercase, number, and special character')
    .required('Password is required'),
  password_confirm: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  phone_number: yup.string()
    .matches(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .optional(),
});

export const useLoginForm = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  
  const form = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      await login(data);
      navigate('/');
    } catch (error) {
      // Error is handled in AuthContext
    }
  };

  return {
    ...form,
    onSubmit: form.handleSubmit(onSubmit),
    isLoading,
    error,
    clearError,
  };
};

export const useRegisterForm = () => {
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  
  const form = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      password_confirm: '',
      phone_number: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await registerUser(data);
      navigate('/');
    } catch (error) {
      // Error is handled in AuthContext
    }
  };

  return {
    ...form,
    onSubmit: form.handleSubmit(onSubmit),
    isLoading,
    error,
    clearError,
  };
};
