import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Truck, 
  MapPin, 
  AlertCircle, 
  RefreshCw, 
  Calendar,
  Shield,
  Clock,
  Award,
  Phone,
  Mail,
  Building,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService, DriverProfile } from '../services/api';
import FormField from '../components/forms/FormField';
import ProfileSection from '../components/forms/ProfileSection';
import { ICON_STYLES, CARD_STYLES } from '../config/theme';
import toast from 'react-hot-toast';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  license_number: string;
  company_name: string;
}

interface DriverFormData {
  cdl_number: string;
  cdl_state: string;
  cdl_expiry: string;
  medical_cert_expiry: string;
  dot_number: string;
  carrier_name: string;
  home_terminal: string;
  timezone: string;
  cycle_type: string;
}

interface ValidationErrors {
  [key: string]: string;
}

// Constants for form options
const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' }
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' }
];

const HOS_CYCLES = [
  { value: '70_8', label: '70/8 Hour Cycle' },
  { value: '60_7', label: '60/7 Hour Cycle' }
];

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    license_number: '',
    company_name: '',
  });
  const [driverData, setDriverData] = useState<DriverFormData>({
    cdl_number: '',
    cdl_state: '',
    cdl_expiry: '',
    medical_cert_expiry: '',
    dot_number: '',
    carrier_name: '',
    home_terminal: '',
    timezone: 'America/Chicago',
    cycle_type: '70_8',
  });
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileErrors, setProfileErrors] = useState<ValidationErrors>({});
  const [driverErrors, setDriverErrors] = useState<ValidationErrors>({});
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    milesThisMonth: 0,
    milesTotal: 0,
  });

  // Validation functions (moved before useEffect hooks)
  const validateProfileData = useCallback((): boolean => {
    const errors: ValidationErrors = {};
    
    if (!profileData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }
    
    if (!profileData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }
    
    if (!profileData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (profileData.phone_number && !/^\+?[\d\s\-()]+$/.test(profileData.phone_number)) {
      errors.phone_number = 'Please enter a valid phone number';
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  }, [profileData]);

  const validateDriverData = useCallback((): boolean => {
    const errors: ValidationErrors = {};
    
    if (driverData.cdl_expiry) {
      const expiryDate = new Date(driverData.cdl_expiry);
      const today = new Date();
      if (expiryDate < today) {
        errors.cdl_expiry = 'CDL expiry date cannot be in the past';
      }
    }
    
    if (driverData.medical_cert_expiry) {
      const expiryDate = new Date(driverData.medical_cert_expiry);
      const today = new Date();
      if (expiryDate < today) {
        errors.medical_cert_expiry = 'Medical certificate expiry date cannot be in the past';
      }
    }
    
    setDriverErrors(errors);
    return Object.keys(errors).length === 0;
  }, [driverData]);

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Auto-save functionality with debouncing (DRY principle)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Auto-save profile data if it's valid and has been modified
      if (profileData.first_name && profileData.last_name && profileData.email && !isSavingProfile) {
        // Only auto-save if there are no validation errors
        if (validateProfileData()) {
          setLastSyncTime(new Date());
        }
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [profileData, isSavingProfile, validateProfileData]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Auto-save driver data if it has been modified
      if (driverData.cdl_number && !isSavingDriver) {
        // Only auto-save if there are no validation errors
        if (validateDriverData()) {
          setLastSyncTime(new Date());
        }
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [driverData, isSavingDriver, validateDriverData]);

  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [userProfile, driverProfileData, trips] = await Promise.all([
        apiService.getCurrentUser(),
        apiService.getDriverProfile().catch(() => null),
        apiService.getTrips().catch(() => []),
      ]);

      setProfileData({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        email: userProfile.email || '',
        phone_number: userProfile.phone_number || '',
        license_number: userProfile.license_number || '',
        company_name: userProfile.company_name || '',
      });

      if (driverProfileData) {
        setDriverProfile(driverProfileData);
        setDriverData({
          cdl_number: driverProfileData.cdl_number || '',
          cdl_state: driverProfileData.cdl_state || '',
          cdl_expiry: driverProfileData.cdl_expiry || '',
          medical_cert_expiry: driverProfileData.medical_cert_expiry || '',
          dot_number: driverProfileData.dot_number || '',
          carrier_name: driverProfileData.carrier_name || '',
          home_terminal: driverProfileData.home_terminal || '',
          timezone: driverProfileData.timezone || 'America/Chicago',
          cycle_type: driverProfileData.cycle_type || '70_8',
        });
      }

      // Calculate stats
      const completedTrips = trips.filter(trip => trip.status === 'completed');
      const totalMiles = completedTrips.reduce((sum, trip) => sum + (trip.total_distance || 0), 0);
      
      // Calculate this month's miles
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const thisMonthTrips = completedTrips.filter(trip => {
        const tripDate = new Date(trip.actual_end_time || trip.created_at);
        return tripDate.getMonth() === thisMonth && tripDate.getFullYear() === thisYear;
      });
      const milesThisMonth = thisMonthTrips.reduce((sum, trip) => sum + (trip.total_distance || 0), 0);
      
      setStats({
        totalTrips: trips.length,
        completedTrips: completedTrips.length,
        milesThisMonth,
        milesTotal: totalMiles,
      });
    } catch (error: any) {
      console.error('Error fetching profile data:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load profile data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDriverChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDriverData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // DRY principle: Reusable error handling function
  const handleApiError = (error: any, setErrors: (errors: ValidationErrors) => void, context: string) => {
    console.error(`Error ${context}:`, error);
    
    // Handle validation errors from backend
    if (error.response?.data && typeof error.response.data === 'object') {
      const backendErrors: ValidationErrors = {};
      Object.keys(error.response.data).forEach(key => {
        if (Array.isArray(error.response.data[key])) {
          backendErrors[key] = error.response.data[key][0];
        } else {
          backendErrors[key] = error.response.data[key];
        }
      });
      setErrors(backendErrors);
      toast.error('Please fix the validation errors');
    } else {
      const errorMessage = error.response?.data?.detail || error.message || `Failed to ${context}`;
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleSaveProfile = async () => {
    if (!validateProfileData()) {
      toast.error('Please fix the validation errors');
      return;
    }

    try {
      setIsSavingProfile(true);
      setError(null);
      setProfileErrors({});
      
      // Show loading toast for better UX
      const loadingToast = toast.loading('Saving personal information...');
      
      await apiService.updateProfile(profileData);
      await refreshUser();
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('✅ Personal information saved to database successfully');
      
      // Update sync time
      setLastSyncTime(new Date());
      
      // Refresh profile data to ensure sync
      await fetchProfileData();
    } catch (error: any) {
      handleApiError(error, setProfileErrors, 'update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveDriver = async () => {
    if (!validateDriverData()) {
      toast.error('Please fix the validation errors');
      return;
    }

    try {
      setIsSavingDriver(true);
      setError(null);
      setDriverErrors({});
      
      // Show loading toast for better UX
      const loadingToast = toast.loading('Saving driver information...');
      
      const updatedDriver = await apiService.updateDriverProfile(driverData);
      setDriverProfile(updatedDriver);
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('✅ Driver information saved to database successfully');
      
      // Update sync time
      setLastSyncTime(new Date());
      
      // Refresh profile data to ensure sync
      await fetchProfileData();
    } catch (error: any) {
      handleApiError(error, setDriverErrors, 'update driver profile');
    } finally {
      setIsSavingDriver(false);
    }
  };

  const isExpiringSoon = (dateString: string, daysThreshold: number = 30): boolean => {
    if (!dateString) return false;
    const expiryDate = new Date(dateString);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= daysThreshold && diffDays > 0;
  };

  const isExpired = (dateString: string): boolean => {
    if (!dateString) return false;
    const expiryDate = new Date(dateString);
    const today = new Date();
    return expiryDate < today;
  };

  // DRY principle: Reusable time formatting function
  const formatSyncTime = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <div className="h-8 bg-neutral-200 rounded w-32 mb-2 animate-pulse"></div>
            <div className="h-4 bg-neutral-200 rounded w-48 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 sm:p-6 animate-pulse">
                  <div className="h-6 bg-neutral-200 rounded w-32 mb-4"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="space-y-2">
                        <div className="h-4 bg-neutral-200 rounded w-20"></div>
                        <div className="h-10 bg-neutral-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 sm:p-6 animate-pulse">
                  <div className="h-6 bg-neutral-200 rounded w-24 mb-4"></div>
                  <div className="space-y-4">
                    {[...Array(2)].map((_, j) => (
                      <div key={j} className="flex items-center space-x-3">
                        <div className="h-5 w-5 bg-neutral-200 rounded"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-neutral-200 rounded w-20 mb-1"></div>
                          <div className="h-6 bg-neutral-200 rounded w-12"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Profile</h1>
              <p className="text-neutral-600 mt-1 sm:mt-2">Error loading profile data</p>
            </div>
            <button
              onClick={fetchProfileData}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error loading profile</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Profile</h1>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 sm:mt-2">
              <p className="text-neutral-600">Manage your driver profile and settings</p>
              {lastSyncTime && (
                <div className="flex items-center space-x-2 text-sm text-success-600 mt-1 sm:mt-0">
                  <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                  <span>Synced: {formatSyncTime(lastSyncTime)}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={fetchProfileData}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <ProfileSection
              title="Personal Information"
              icon={User}
              onSave={handleSaveProfile}
              isSaving={isSavingProfile}
              saveButtonText="Save Personal Info"
              saveButtonVariant="primary"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  id="first_name"
                  label="First Name"
                  type="text"
                  value={profileData.first_name}
                  onChange={handleProfileChange}
                  error={profileErrors.first_name}
                  icon={User}
                  required
                />
                
                <FormField
                  id="last_name"
                  label="Last Name"
                  type="text"
                  value={profileData.last_name}
                  onChange={handleProfileChange}
                  error={profileErrors.last_name}
                  icon={User}
                  required
                />
                
                <FormField
                  id="email"
                  label="Email Address"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  error={profileErrors.email}
                  icon={Mail}
                  required
                />
                
                <FormField
                  id="phone_number"
                  label="Phone Number"
                  type="tel"
                  value={profileData.phone_number}
                  onChange={handleProfileChange}
                  error={profileErrors.phone_number}
                  icon={Phone}
                  placeholder="(555) 123-4567"
                />

                <FormField
                  id="license_number"
                  label="Driver's License"
                  type="text"
                  value={profileData.license_number}
                  onChange={handleProfileChange}
                  error={profileErrors.license_number}
                  icon={CreditCard}
                  placeholder="DL123456789"
                />

                <FormField
                  id="company_name"
                  label="Company Name"
                  type="text"
                  value={profileData.company_name}
                  onChange={handleProfileChange}
                  error={profileErrors.company_name}
                  icon={Building}
                  placeholder="Your Company LLC"
                />
              </div>
            </ProfileSection>

            {/* Driver Information */}
            <ProfileSection
              title="Driver Information"
              icon={Truck}
              onSave={handleSaveDriver}
              isSaving={isSavingDriver}
              saveButtonText="Save Driver Info"
              saveButtonVariant="primary"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  id="cdl_number"
                  label="CDL Number"
                  type="text"
                  value={driverData.cdl_number}
                  onChange={handleDriverChange}
                  error={driverErrors.cdl_number}
                  icon={CreditCard}
                  placeholder="CDL123456789"
                />
                
                <FormField
                  id="cdl_state"
                  label="CDL State"
                  type="select"
                  value={driverData.cdl_state}
                  onChange={handleDriverChange}
                  options={US_STATES}
                  error={driverErrors.cdl_state}
                  icon={MapPin}
                  placeholder="Select State"
                />
                
                <FormField
                  id="cdl_expiry"
                  label="CDL Expiry Date"
                  type="date"
                  value={driverData.cdl_expiry}
                  onChange={handleDriverChange}
                  error={driverErrors.cdl_expiry}
                  icon={Calendar}
                  helpText={driverData.cdl_expiry && isExpiringSoon(driverData.cdl_expiry) ? 'Expires soon!' : undefined}
                />
                
                <FormField
                  id="medical_cert_expiry"
                  label="Medical Certificate Expiry"
                  type="date"
                  value={driverData.medical_cert_expiry}
                  onChange={handleDriverChange}
                  error={driverErrors.medical_cert_expiry}
                  icon={Shield}
                  helpText={driverData.medical_cert_expiry && isExpiringSoon(driverData.medical_cert_expiry) ? 'Expires soon!' : undefined}
                />

                <FormField
                  id="dot_number"
                  label="DOT Number"
                  type="text"
                  value={driverData.dot_number}
                  onChange={handleDriverChange}
                  error={driverErrors.dot_number}
                  icon={Award}
                  placeholder="1234567"
                />

                <FormField
                  id="carrier_name"
                  label="Carrier Name"
                  type="text"
                  value={driverData.carrier_name}
                  onChange={handleDriverChange}
                  error={driverErrors.carrier_name}
                  icon={Building}
                  placeholder="ABC Trucking LLC"
                />

                <FormField
                  id="home_terminal"
                  label="Home Terminal"
                  type="text"
                  value={driverData.home_terminal}
                  onChange={handleDriverChange}
                  error={driverErrors.home_terminal}
                  icon={MapPin}
                  placeholder="123 Terminal St, City, ST"
                />

                <FormField
                  id="timezone"
                  label="Timezone"
                  type="select"
                  value={driverData.timezone}
                  onChange={handleDriverChange}
                  options={TIMEZONES}
                  error={driverErrors.timezone}
                  icon={Clock}
                />

                <FormField
                  id="cycle_type"
                  label="HOS Cycle Type"
                  type="select"
                  value={driverData.cycle_type}
                  onChange={handleDriverChange}
                  options={HOS_CYCLES}
                  error={driverErrors.cycle_type}
                  icon={Clock}
                  helpText="Choose your Hours of Service cycle"
                />
              </div>
            </ProfileSection>
        </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding}`}>
              <h3 className={`${CARD_STYLES.title} mb-4 flex items-center`}>
                <div className={ICON_STYLES.sectionHeader}>
                  <Truck className={ICON_STYLES.sectionHeaderIcon} />
                </div>
                <span className="ml-2">Quick Stats</span>
              </h3>
              
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                <div className="text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start space-x-3">
                    <div className={ICON_STYLES.sectionHeader}>
                      <Truck className={ICON_STYLES.sectionHeaderIcon} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Total Trips</p>
                      <p className="text-xl sm:text-2xl font-bold text-primary-600">{stats.totalTrips}</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start space-x-3">
                    <div className="p-2 bg-success-100 rounded-lg">
                      <Award className="h-5 w-5 text-success-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Completed</p>
                      <p className="text-xl sm:text-2xl font-bold text-success-600">{stats.completedTrips}</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center lg:text-left col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-center lg:justify-start space-x-3">
                    <div className={ICON_STYLES.sectionHeader}>
                      <MapPin className={ICON_STYLES.sectionHeaderIcon} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Miles This Month</p>
                      <p className="text-xl sm:text-2xl font-bold text-primary-600">{stats.milesThisMonth.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center lg:text-left col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-center lg:justify-start space-x-3">
                    <div className="p-2 bg-accent-100 rounded-lg">
                      <MapPin className="h-5 w-5 text-accent-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Total Miles</p>
                      <p className="text-xl sm:text-2xl font-bold text-accent-600">{stats.milesTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding}`}>
              <h3 className={`${CARD_STYLES.title} mb-4 flex items-center`}>
                <div className={ICON_STYLES.sectionHeader}>
                  <User className={ICON_STYLES.sectionHeaderIcon} />
                </div>
                <span className="ml-2">Account Info</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className={ICON_STYLES.formField} />
                    <span className="text-sm font-medium text-neutral-900">Member Since</span>
                  </div>
                  <span className="text-sm text-neutral-600">
                    {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className={ICON_STYLES.formField} />
                    <span className="text-sm font-medium text-neutral-900">Last Login</span>
                  </div>
                  <span className="text-sm text-neutral-600">
                    {user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Driver Status */}
            {driverProfile && (
              <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding}`}>
                <h3 className={`${CARD_STYLES.title} mb-4 flex items-center`}>
                  <div className={ICON_STYLES.sectionHeader}>
                    <Shield className={ICON_STYLES.sectionHeaderIcon} />
                  </div>
                  <span className="ml-2">Driver Status</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-4 w-4 text-neutral-400" />
                      <span className="text-sm font-medium text-neutral-900">CDL Status</span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      isExpired(driverProfile.cdl_expiry) 
                        ? 'bg-red-100 text-red-800' 
                        : isExpiringSoon(driverProfile.cdl_expiry)
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isExpired(driverProfile.cdl_expiry) 
                        ? 'Expired' 
                        : isExpiringSoon(driverProfile.cdl_expiry)
                        ? 'Expires Soon'
                        : 'Valid'
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-4 w-4 text-neutral-400" />
                      <span className="text-sm font-medium text-neutral-900">Medical Cert</span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      isExpired(driverProfile.medical_cert_expiry) 
                        ? 'bg-red-100 text-red-800' 
                        : isExpiringSoon(driverProfile.medical_cert_expiry)
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isExpired(driverProfile.medical_cert_expiry) 
                        ? 'Expired' 
                        : isExpiringSoon(driverProfile.medical_cert_expiry)
                        ? 'Expires Soon'
                        : 'Valid'
                      }
                    </span>
                  </div>

                  {(isExpiringSoon(driverProfile.cdl_expiry) || isExpiringSoon(driverProfile.medical_cert_expiry)) && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Documents Expiring Soon</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Please renew your documents before they expire to avoid compliance issues.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {(isExpired(driverProfile.cdl_expiry) || isExpired(driverProfile.medical_cert_expiry)) && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Expired Documents</p>
                          <p className="text-xs text-red-700 mt-1">
                            You have expired documents. Please renew immediately to maintain compliance.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
