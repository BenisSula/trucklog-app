import React from 'react';
import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { useLoginForm } from '../hooks/useAuthForm';
import { EmailInput, PasswordInput, FormButton } from '../components/forms';
import { BUTTON_STYLES } from '../config/theme';

const Login: React.FC = () => {
  const { register, onSubmit, isLoading, error, formState: { errors } } = useLoginForm();

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Column - Login Form */}
        <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-neutral-900 mb-2">Welcome back</h2>
              <p className="text-lg text-neutral-600">Sign in to your TruckLog account</p>
            </div>

            <form className="mt-10 space-y-6" onSubmit={onSubmit}>
              <div className="space-y-5">
                <EmailInput
                  {...register('email')}
                  error={errors.email?.message}
                  placeholder="Enter your email"
                  autoComplete="email"
                />
                
                <PasswordInput
                  {...register('password')}
                  error={errors.password?.message}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-700">
                    Remember me
                  </label>
                </div>
                <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                  Forgot password?
                </Link>
              </div>

              <FormButton
                type="submit"
                loading={isLoading}
                className={`w-full py-3 text-lg font-semibold ${BUTTON_STYLES.primary}`}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </FormButton>

              <div className="text-center pt-4">
                <span className="text-neutral-600">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-500">
                    Sign up here
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
              <h1 className="text-5xl font-bold mb-6 leading-tight text-white">TruckLog</h1>
              <p className="text-xl leading-relaxed text-white/90 mb-8">
                TruckLog helps drivers stay compliant, plan smarter routes, and log hours with ease.
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <div className="text-2xl font-bold text-accent-200">24/7</div>
                  <div className="text-sm text-white/80">Support</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <div className="text-2xl font-bold text-accent-200">100%</div>
                  <div className="text-sm text-white/80">Compliant</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <div className="text-2xl font-bold text-accent-200">Smart</div>
                  <div className="text-sm text-white/80">Routes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
