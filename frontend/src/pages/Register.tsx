import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, User, Phone } from 'lucide-react';
import { useRegisterForm } from '../hooks/useAuthForm';
import { EmailInput, PasswordInput, TextInput, FormButton } from '../components/forms';
import { BUTTON_STYLES } from '../config/theme';

const Register: React.FC = () => {
  const { register, onSubmit, isLoading, error, formState: { errors } } = useRegisterForm();

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Column - Register Form */}
        <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-neutral-900 mb-2">Join TruckLog</h2>
              <p className="text-lg text-neutral-600">Create your account to get started</p>
            </div>

            <form className="mt-10 space-y-6" onSubmit={onSubmit}>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <TextInput
                    {...register('first_name')}
                    error={errors.first_name?.message}
                    placeholder="First name"
                    autoComplete="given-name"
                    icon={User}
                  />
                  <TextInput
                    {...register('last_name')}
                    error={errors.last_name?.message}
                    placeholder="Last name"
                    autoComplete="family-name"
                    icon={User}
                  />
                </div>
                
                <EmailInput
                  {...register('email')}
                  error={errors.email?.message}
                  placeholder="Enter your email"
                  autoComplete="email"
                />
                
                <TextInput
                  {...register('phone_number')}
                  error={errors.phone_number?.message}
                  placeholder="Phone number (optional)"
                  autoComplete="tel"
                  icon={Phone}
                />
                
                <PasswordInput
                  {...register('password')}
                  error={errors.password?.message}
                  placeholder="Create a password"
                  autoComplete="new-password"
                />
                
                <PasswordInput
                  {...register('password_confirm')}
                  error={errors.password_confirm?.message}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded mt-1"
                />
                <label htmlFor="terms" className="ml-3 block text-sm text-neutral-700 leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" className="font-medium text-primary-600 hover:text-primary-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="font-medium text-primary-600 hover:text-primary-500">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <FormButton
                type="submit"
                loading={isLoading}
                className={`w-full py-3 text-lg font-semibold ${BUTTON_STYLES.primary}`}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </FormButton>

              <div className="text-center pt-4">
                <span className="text-neutral-600">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-500">
                    Sign in here
                  </Link>
                </span>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Brand Section */}
        <div className="hidden lg:block relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-primary-800/30 to-primary-700/40"></div>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-32 right-24 w-40 h-40 bg-accent-400 rounded-full blur-3xl"></div>
            <div className="absolute bottom-32 left-20 w-56 h-56 bg-accent-300 rounded-full blur-3xl"></div>
            <div className="absolute top-2/3 right-1/3 w-28 h-28 bg-white rounded-full blur-2xl"></div>
          </div>
          <div className="relative z-10 flex items-center justify-center h-full px-8">
            <div className="text-center text-white max-w-lg">
              <div className="mb-8">
                <Truck className="h-24 w-24 mx-auto mb-6 text-accent-300" />
              </div>
              <h1 className="text-5xl font-bold mb-6 leading-tight text-white">Start Your Journey</h1>
              <p className="text-xl leading-relaxed text-white/90 mb-8">
                Join thousands of drivers who trust TruckLog for compliance, route planning, and efficient operations.
              </p>
              <div className="grid grid-cols-1 gap-4 text-left">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-accent-200 rounded-full"></div>
                    <span className="text-white/90">Real-time HOS tracking</span>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-accent-200 rounded-full"></div>
                    <span className="text-white/90">Smart route optimization</span>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-accent-200 rounded-full"></div>
                    <span className="text-white/90">Compliance management</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
