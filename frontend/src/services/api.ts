/**
 * API Service Layer
 * Handles all communication with the Django backend
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for HTTP-only token storage
});

// Helper function to get cookies
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

// Request interceptor to add CSRF token and auth headers
api.interceptors.request.use(
  (config) => {
    // Get CSRF token from cookies
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    // Add auth token if available (fallback for JWT)
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token if using JWT
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/users/auth/token/refresh/`, {
            refresh: refreshToken,
          }, { withCredentials: true });

          const { access } = response.data;
          localStorage.setItem('access_token', access);
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
  phone_number?: string;
  license_number?: string;
  company_name?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  license_number: string;
  company_name: string;
  is_driver: boolean;
  date_joined: string;
  last_login: string;
}

export interface DriverProfile {
  id: number;
  user: User;
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

export interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  is_terminal: boolean;
}

export interface Trip {
  id: number;
  driver: number;
  driver_name: string;
  trip_name: string;
  pickup_location: number;
  delivery_location: number;
  pickup_location_name: string;
  delivery_location_name: string;
  planned_start_time: string;
  planned_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  total_distance?: number;
  estimated_drive_time?: string;
  actual_drive_time?: string;
  hours_used_before_trip: number;
  hours_available?: number;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface LogEntry {
  id: number;
  driver: number;
  driver_name: string;
  duty_status: number;
  duty_status_name: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  location: string;
  city: string;
  state: string;
  remarks: string;
  is_editable: boolean;
  is_certified: boolean;
  certified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyLog {
  id: number;
  driver: number;
  driver_name: string;
  log_date: string;
  total_driving_hours: number;
  total_on_duty_hours: number;
  total_off_duty_hours: number;
  has_violations: boolean;
  violation_details: string;
  is_compliant: boolean;
  is_certified: boolean;
  certified_at?: string;
  certification_ip?: string;
  log_entries: LogEntry[];
  violations: Violation[];
  created_at: string;
  updated_at: string;
}

export interface Violation {
  id: number;
  driver: number;
  driver_name: string;
  daily_log: number;
  violation_type: string;
  violation_type_display: string;
  severity: string;
  severity_display: string;
  description: string;
  occurred_at: string;
  duration_over?: string;
  is_resolved: boolean;
  resolution_notes: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface HOSStatus {
  compliant: boolean;
  hours_used: number;
  hours_available: number;
  can_drive: boolean;
  can_be_on_duty: boolean;
  needs_rest: boolean;
  consecutive_off_duty_hours: number;
  violations_count: number;
  violations: any[];
  last_30_min_break?: string;
  cycle_type?: string;
  cycle_start_date?: string;
  cycle_progress_percent?: number;
  time_until_break_needed?: number;
  status_changed?: boolean;
  new_violations_count?: number;
  last_updated?: string;
  status_color?: string;
  status_message?: string;
  // Additional properties for compatibility
  driver_id?: number;
  status_summary?: string;
  timestamp?: string;
}

export interface DutyStatus {
  id: number;
  name: string;
  description: string;
  color_code: string;
}

// API Service Class
class ApiService {
  // Authentication
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await api.post('/users/auth/token/', credentials);
    const tokens = response.data;
    
    // Store tokens
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    
    // Get user profile
    const userResponse = await this.getCurrentUser();
    
    return {
      user: userResponse,
      tokens,
    };
  }

  async register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await api.post('/users/register/', data);
    const { user, tokens } = response.data;
    
    // Store tokens
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    
    return { user, tokens };
  }

  async logout(): Promise<void> {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<User> = await api.get('/users/profile/');
    return response.data;
  }

  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = localStorage.getItem('refresh_token');
    const response: AxiosResponse<AuthTokens> = await api.post('/users/auth/token/refresh/', {
      refresh: refreshToken,
    });
    
    const tokens = response.data;
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    
    return tokens;
  }

  // User Management
  async updateProfile(data: Partial<User>): Promise<User> {
    const response: AxiosResponse<User> = await api.put('/users/profile/', data);
    return response.data;
  }

  async getDriverProfile(): Promise<DriverProfile> {
    const response: AxiosResponse<DriverProfile> = await api.get('/users/profiles/my_profile/');
    return response.data;
  }

  async updateDriverProfile(data: Partial<DriverProfile>): Promise<DriverProfile> {
    const response: AxiosResponse<DriverProfile> = await api.put('/users/profiles/my_profile/', data);
    return response.data;
  }

  // Trip Management
  async getTrips(): Promise<Trip[]> {
    try {
      const response: AxiosResponse<Trip[]> = await api.get('/trips/trips/');
      // Ensure we always return an array
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching trips:', error);
      // Return empty array on error to prevent filter errors
      return [];
    }
  }

  async getTrip(id: number): Promise<Trip> {
    const response: AxiosResponse<Trip> = await api.get(`/trips/trips/${id}/`);
    return response.data;
  }

  async createTrip(data: Partial<Trip>): Promise<Trip> {
    const response: AxiosResponse<Trip> = await api.post('/trips/trips/', data);
    return response.data;
  }

  async updateTrip(id: number, data: Partial<Trip>): Promise<Trip> {
    const response: AxiosResponse<Trip> = await api.put(`/trips/trips/${id}/`, data);
    return response.data;
  }

  async deleteTrip(id: number): Promise<void> {
    await api.delete(`/trips/trips/${id}/`);
  }

  async startTrip(id: number): Promise<Trip> {
    const response: AxiosResponse<Trip> = await api.post(`/trips/trips/${id}/start_trip/`);
    return response.data;
  }

  async completeTrip(id: number): Promise<Trip> {
    const response: AxiosResponse<Trip> = await api.post(`/trips/trips/${id}/complete_trip/`);
    return response.data;
  }

  async planRoute(data: any): Promise<Trip> {
    const response: AxiosResponse<Trip> = await api.post('/trips/plan-route/', data);
    return response.data;
  }

  async calculateHOS(data: any): Promise<any> {
    const response: AxiosResponse<any> = await api.post('/trips/calculate-hos/', data);
    return response.data;
  }

  // Location Management
  async getLocations(search?: string): Promise<Location[]> {
    try {
      const params = search ? { search } : {};
      const response: AxiosResponse<Location[]> = await api.get('/trips/locations/', { params });
      // Ensure we always return an array
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching locations:', error);
      // Return empty array on error to prevent map errors
      return [];
    }
  }

  async getTerminals(): Promise<Location[]> {
    const response: AxiosResponse<Location[]> = await api.get('/trips/locations/terminals/');
    return response.data;
  }

  // Log Management - Enhanced with proper endpoints and validation
  async getLogEntries(params?: { 
    start_date?: string; 
    end_date?: string; 
    page?: number; 
    page_size?: number 
  }): Promise<LogEntry[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.start_date) queryParams.append('start_date', params.start_date);
      if (params?.end_date) queryParams.append('end_date', params.end_date);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
      
      const url = `/api/logs/log-entries/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response: AxiosResponse<LogEntry[]> = await api.get(url);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch log entries:', error);
      
      // Return empty array on error
      return [];
    }
  }

  async createLogEntry(data: Partial<LogEntry>): Promise<LogEntry> {
    try {
      // Validate required fields
      if (!data.duty_status || !data.start_time || !data.end_time) {
        throw new Error('Missing required fields: duty_status, start_time, end_time');
      }
      
      // Validate time range
      const startTime = new Date(data.start_time);
      const endTime = new Date(data.end_time);
      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }
      
      const response: AxiosResponse<LogEntry> = await api.post('/api/logs/log-entries/', data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create log entry:', error);
      if (error.message.includes('required fields') || error.message.includes('End time')) {
        throw error; // Re-throw validation errors
      }
      throw error;
    }
  }

  async updateLogEntry(id: number, data: Partial<LogEntry>): Promise<LogEntry> {
    try {
      // Validate time range if both times are provided
      if (data.start_time && data.end_time) {
        const startTime = new Date(data.start_time);
        const endTime = new Date(data.end_time);
        if (endTime <= startTime) {
          throw new Error('End time must be after start time');
        }
      }
      
      const response: AxiosResponse<LogEntry> = await api.put(`/api/logs/log-entries/${id}/`, data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to update log entry:', error);
      if (error.message.includes('End time')) {
        throw error; // Re-throw validation errors
      }
      throw error;
    }
  }

  async deleteLogEntry(id: number): Promise<void> {
    try {
      await api.delete(`/api/logs/log-entries/${id}/`);
    } catch (error) {
      console.error('Failed to delete log entry:', error);
      throw error;
    }
  }

  async certifyLogEntry(id: number): Promise<LogEntry> {
    try {
      const response: AxiosResponse<LogEntry> = await api.post(`/api/logs/log-entries/${id}/certify/`);
      return response.data;
    } catch (error) {
      console.error('Failed to certify log entry:', error);
      throw error;
    }
  }

  async getDailyLogs(startDate?: string, endDate?: string): Promise<DailyLog[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const response: AxiosResponse<DailyLog[]> = await api.get(`/api/logs/daily-logs/?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch daily logs:', error);
      return [];
    }
  }

  async getCurrentDailyLog(): Promise<DailyLog | null> {
    try {
      const response: AxiosResponse<DailyLog> = await api.get('/api/logs/daily-logs/current/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch current daily log:', error);
      return null;
    }
  }

  async certifyDailyLog(id: number): Promise<DailyLog> {
    try {
      const response: AxiosResponse<DailyLog> = await api.post(`/api/logs/daily-logs/${id}/certify/`);
      return response.data;
    } catch (error) {
      console.error('Failed to certify daily log:', error);
      throw error;
    }
  }

  async getViolations(): Promise<Violation[]> {
    try {
      const response: AxiosResponse<Violation[]> = await api.get('/api/logs/violations/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch violations:', error);
      return [];
    }
  }

  async getDutyStatuses(): Promise<DutyStatus[]> {
    try {
      const response: AxiosResponse<DutyStatus[]> = await api.get('/api/logs/duty-statuses/');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch duty statuses:', error);
      
      return [];
    }
  }

  async checkCompliance(): Promise<HOSStatus> {
    try {
      const response: AxiosResponse<HOSStatus> = await api.get('/api/logs/check-compliance/');
      return response.data;
    } catch (error) {
      console.error('Failed to check compliance:', error);
      throw error;
    }
  }

  async getHOSStatus(): Promise<HOSStatus> {
    try {
      const response: AxiosResponse<HOSStatus> = await api.get('/api/logs/hos-status/');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get HOS status:', error);
      
      return {
        compliant: true,
        hours_used: 0,
        hours_available: 70,
        can_drive: true,
        can_be_on_duty: true,
        needs_rest: false,
        consecutive_off_duty_hours: 10,
        violations_count: 0,
        violations: []
      };
    }
  }

  async exportLogs(params: {
    format: 'csv' | 'excel' | 'pdf';
    start_date: string;
    end_date: string;
    include_compliance?: boolean;
  }): Promise<Blob> {
    try {
      const response = await api.post('/api/logs/export/', params, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to export logs:', error);
      throw error;
    }
  }

  async bulkLogOperations(operation: string, data: any): Promise<any> {
    try {
      const response = await api.post('/api/logs/bulk-operations/', {
        operation,
        ...data
      });
      return response.data;
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      throw error;
    }
  }

  async getHOSLimits(): Promise<any> {
    try {
      const response = await api.get('/api/logs/hos-limits/');
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch HOS limits from backend, using defaults:', error);
      // Return default limits if backend doesn't have this endpoint yet
      return {
        maxDrivingHours: 11,
        maxOnDutyHours: 14,
        maxCycleHours: 70,
        minOffDutyHours: 10,
        requiredBreakHours: 0.5,
        maxConsecutiveDrivingHours: 8
      };
    }
  }

  // Health check to test server connectivity
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await api.get('/health/');
      return response.data;
    } catch (error) {
      console.warn('Health check failed:', error);
      throw new Error('Server not available');
    }
  }

  // Debug method to test API connectivity
  async testConnection(): Promise<any> {
    try {
      console.log('Testing API connection to:', API_BASE_URL);
      
      // Test basic connectivity
      const response = await api.get('/logs/duty-statuses/');
      console.log('API test successful:', response.status, response.data);
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('API test failed:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      return { 
        success: false, 
        error: error.message,
        status: error.response?.status,
        details: error.response?.data
      };
    }
  }

  async resolveViolation(violationId: number): Promise<any> {
    try {
      const response: AxiosResponse<any> = await api.post(`/api/logs/violations/${violationId}/resolve/`);
      return response.data;
    } catch (error) {
      console.error('Failed to resolve violation:', error);
      throw error;
    }
  }

  async generateLogSheet(data: { start_date: string; end_date: string }): Promise<any> {
    try {
      const response: AxiosResponse<any> = await api.post('/api/logs/generate-log-sheet/', data);
      return response.data;
    } catch (error) {
      console.error('Failed to generate log sheet:', error);
      throw error;
    }
  }

  // Notifications
  async getNotifications(): Promise<any[]> {
    try {
      const response: AxiosResponse<any[]> = await api.get('/core/notifications/');
      // Ensure we always return an array
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Return empty array on error to prevent filter errors
      return [];
    }
  }

  async getUnreadNotifications(): Promise<any[]> {
    try {
      const response: AxiosResponse<any[]> = await api.get('/core/notifications/unread/');
      // Ensure we always return an array
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      // Return empty array on error to prevent filter errors
      return [];
    }
  }

  async markNotificationRead(id: number): Promise<any> {
    const response: AxiosResponse<any> = await api.post(`/core/notifications/${id}/mark_read/`);
    return response.data;
  }

  async markAllNotificationsRead(): Promise<void> {
    await api.post('/core/notifications/mark_all_read/');
  }

  async createNotification(data: any): Promise<any> {
    const response: AxiosResponse<any> = await api.post('/core/notifications/', data);
    return response.data;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
