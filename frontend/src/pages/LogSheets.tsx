import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Plus, Edit, Trash2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { apiService, LogEntry, DailyLog, HOSStatus, DutyStatus } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';
import { DEFAULT_HOS_LIMITS } from '../config/hosLimits';
import HOSStatusCard from '../components/HOSStatusCard';
import FormField from '../components/FormField';
import toast from 'react-hot-toast';

interface LogFormData {
  duty_status: number;
  start_time: string;
  end_time: string;
  location: string;
  city: string;
  state: string;
  remarks: string;
}

const LogSheets: React.FC = () => {
  const { isConnected } = useWebSocket();
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [hosStatus, setHosStatus] = useState<HOSStatus | null>(null);
  const [dutyStatuses, setDutyStatuses] = useState<DutyStatus[]>([]);
  const [hosLimits, setHosLimits] = useState(DEFAULT_HOS_LIMITS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState<LogFormData>({
    duty_status: 0,
    start_time: '',
    end_time: '',
    location: '',
    city: '',
    state: '',
    remarks: '',
  });

  useEffect(() => {
    // Test API connection first
    const testAndFetch = async () => {
      const testResult = await apiService.testConnection();
      
      if (testResult.success) {
        fetchData();
      } else {
        console.error('API connection failed:', testResult);
        // Still try to fetch data to see the actual error
        fetchData();
      }
    };
    
    testAndFetch();
    
    // Set up auto-refresh every 5 minutes for live data
    const refreshInterval = setInterval(() => {
      if (!isSubmitting && !showAddForm) {
        fetchData(true);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Listen for HOS updates from WebSocket
  useEffect(() => {
    const handleHOSUpdate = (event: CustomEvent) => {
      // Update HOS status without full refresh
      setHosStatus(prev => ({
        ...prev,
        ...event.detail
      }));
      
      // Only refresh log data if there are new violations or status changes
      if (event.detail.status_changed || event.detail.new_violations_count > 0) {
        fetchData(true);
      }
    };

    const handleComplianceUpdate = (event: CustomEvent) => {
      setHosStatus(prev => ({
        ...prev,
        ...event.detail,
        compliant: event.detail.violations_count === 0
      }));
    };

    window.addEventListener('hosStatusUpdate', handleHOSUpdate as EventListener);
    window.addEventListener('complianceUpdate', handleComplianceUpdate as EventListener);
    
    return () => {
      window.removeEventListener('hosStatusUpdate', handleHOSUpdate as EventListener);
      window.removeEventListener('complianceUpdate', handleComplianceUpdate as EventListener);
    };
  }, []);

  const fetchData = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      // Get current date range (last 7 days for better performance)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const [entries, daily, hos, statuses, limits] = await Promise.allSettled([
        apiService.getLogEntries({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          page_size: 50
        }),
        apiService.getCurrentDailyLog(),
        apiService.getHOSStatus(), // Use the enhanced HOS status endpoint
        apiService.getDutyStatuses(),
        apiService.getHOSLimits(),
      ]);
      
      // Handle results with proper error handling for each
      if (entries.status === 'fulfilled') {
        setLogEntries(entries.value);
      } else {
        console.error('Failed to fetch log entries:', entries.reason);
        setLogEntries([]); // Set empty array as fallback
      }
      
      if (daily.status === 'fulfilled') {
        setDailyLog(daily.value);
      } else {
        console.warn('No daily log found for today');
        setDailyLog(null);
        // Don't count this as an error since it's normal for new users
      }
      
      if (hos.status === 'fulfilled') {
        setHosStatus(hos.value);
      } else {
        console.error('Failed to fetch HOS status:', hos.reason);
        // Set default HOS status as fallback
        setHosStatus({
          compliant: true,
          hours_used: 0,
          hours_available: 11,
          can_drive: true,
          can_be_on_duty: true,
          needs_rest: false,
          consecutive_off_duty_hours: 10,
          violations_count: 0,
          violations: []
        });
      }
      
      if (statuses.status === 'fulfilled') {
        setDutyStatuses(statuses.value);
      } else {
        console.error('Failed to fetch duty statuses:', statuses.reason);
        // Set default duty statuses as fallback
        setDutyStatuses([
          { id: 1, name: 'off_duty', description: 'Off Duty', color_code: '#6B7280' },
          { id: 2, name: 'sleeper_berth', description: 'Sleeper Berth', color_code: '#3B82F6' },
          { id: 3, name: 'driving', description: 'Driving', color_code: '#10B981' },
          { id: 4, name: 'on_duty_not_driving', description: 'On Duty - Not Driving', color_code: '#F59E0B' }
        ]);
      }
      
      if (limits.status === 'fulfilled') {
        setHosLimits(limits.value);
      } else {
        console.warn('Failed to fetch HOS limits, using defaults:', limits.reason);
        // Keep using DEFAULT_HOS_LIMITS - this is not an error
      }
      
      // Silently handle errors without showing toast notifications
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      const errorMessage = error.message || 'Failed to load log data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duty_status' ? parseInt(value) : value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.duty_status || !formData.start_time || !formData.end_time) {
      return 'Please fill in all required fields';
    }

    const startTime = new Date(formData.start_time);
    const endTime = new Date(formData.end_time);
    
    if (endTime <= startTime) {
      return 'End time must be after start time';
    }

    // Check for reasonable duration (not more than 24 hours)
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (durationHours > 24) {
      return 'Log entry cannot exceed 24 hours';
    }

    if (durationHours < 0.1) {
      return 'Log entry must be at least 6 minutes long';
    }

    // Check for overlapping entries (basic validation)
    const hasOverlap = logEntries.some(entry => {
      if (editingEntry && entry.id === editingEntry.id) return false;
      
      const entryStart = new Date(entry.start_time);
      const entryEnd = new Date(entry.end_time);
      
      return (startTime < entryEnd && endTime > entryStart);
    });

    if (hasOverlap) {
      return 'This time period overlaps with an existing log entry';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      if (editingEntry) {
        const updatedEntry = await apiService.updateLogEntry(editingEntry.id, formData);
        setLogEntries(prev => prev.map(entry => entry.id === editingEntry.id ? updatedEntry : entry));
        toast.success('Log entry updated successfully');
      } else {
        const newEntry = await apiService.createLogEntry(formData);
        setLogEntries(prev => [newEntry, ...prev].sort((a, b) => 
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        ));
        toast.success('Log entry created successfully');
      }
      
      // Reset form
      setFormData({
        duty_status: 0,
        start_time: '',
        end_time: '',
        location: '',
        city: '',
        state: '',
        remarks: '',
      });
      setShowAddForm(false);
      setEditingEntry(null);
      
      // Refresh HOS status after successful save
      try {
        const updatedHOS = await apiService.getHOSStatus();
        setHosStatus(updatedHOS);
      } catch (hosError) {
        console.warn('Failed to refresh HOS status:', hosError);
      }
      
    } catch (error: any) {
      console.error('Error saving log entry:', error);
      const errorMessage = error.message || 'Failed to save log entry';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (entry: LogEntry) => {
    setEditingEntry(entry);
    setFormData({
      duty_status: entry.duty_status,
      start_time: new Date(entry.start_time).toISOString().slice(0, 16),
      end_time: new Date(entry.end_time).toISOString().slice(0, 16),
      location: entry.location,
      city: entry.city,
      state: entry.state,
      remarks: entry.remarks,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (entryId: number) => {
    if (!window.confirm('Are you sure you want to delete this log entry?')) {
      return;
    }

    try {
      setError(null);
      await apiService.deleteLogEntry(entryId);
      setLogEntries(prev => prev.filter(entry => entry.id !== entryId));
      toast.success('Log entry deleted successfully');
      await fetchData(); // Refresh data to get updated HOS status
    } catch (error: any) {
      console.error('Error deleting log entry:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete log entry';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleCertify = async (entryId: number) => {
    try {
      setError(null);
      await apiService.certifyLogEntry(entryId);
      setLogEntries(prev => prev.map(entry => 
        entry.id === entryId ? { ...entry, is_certified: true } : entry
      ));
      toast.success('Log entry certified successfully');
    } catch (error: any) {
      console.error('Error certifying log entry:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to certify log entry';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleCertifyDaily = async () => {
    if (!dailyLog) return;
    
    try {
      setError(null);
      await apiService.certifyDailyLog(dailyLog.id);
      setDailyLog(prev => prev ? { ...prev, is_certified: true } : null);
      toast.success('Daily log certified successfully');
    } catch (error: any) {
      console.error('Error certifying daily log:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to certify daily log';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const getStatusColor = (dutyStatusName: string, dutyStatuses: DutyStatus[]) => {
    // Try to find the duty status and use its color_code
    const dutyStatus = dutyStatuses.find(status => 
      status.name.toLowerCase() === dutyStatusName.toLowerCase()
    );
    
    if (dutyStatus?.color_code) {
      return dutyStatus.color_code;
    }
    
    // Fallback to default colors if color_code not available
    switch (dutyStatusName.toLowerCase()) {
      case 'driving': return '#10B981'; // green-500
      case 'on_duty_not_driving': return '#F59E0B'; // yellow-500
      case 'off_duty': return '#6B7280'; // gray-500
      case 'sleeper_berth': return '#3B82F6'; // blue-500
      default: return '#6B7280'; // gray-500
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours.toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Log Sheets</h1>
            <p className="text-neutral-600 mt-2">Loading your HOS logs...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 animate-pulse">
              <div className="flex items-center">
                <div className="p-2 bg-neutral-200 rounded-lg h-10 w-10"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-neutral-200 rounded w-20 mb-2"></div>
                  <div className="h-6 bg-neutral-200 rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Log Sheets</h1>
            <p className="text-neutral-600 mt-2">Error loading data</p>
          </div>
          <button
            onClick={() => fetchData()}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading log data</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">


      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Log Sheets</h1>
          <p className="text-neutral-600 mt-2">Manage your HOS logs and ensure compliance.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-neutral-600">
              {isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
            </span>
          </div>
          {error && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Server Connection Issues</span>
            </div>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* HOS Status - Enhanced with reusable components */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <HOSStatusCard
          title="Driving Hours"
          current={hosStatus?.hours_used || 0}
          maximum={hosLimits.maxDrivingHours}
          icon={Clock}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          warningIcon={!hosStatus?.can_drive ? <AlertCircle className="h-5 w-5" /> : undefined}
          warningTitle="Cannot drive"
        />

        <HOSStatusCard
          title="On Duty Hours"
          current={hosStatus?.hours_used || 0}
          maximum={hosLimits.maxOnDutyHours}
          icon={Clock}
          iconColor="text-yellow-600"
          iconBgColor="bg-yellow-100"
          warningIcon={!hosStatus?.can_be_on_duty ? <AlertCircle className="h-5 w-5" /> : undefined}
          warningTitle="Cannot be on duty"
        />

        <HOSStatusCard
          title="Off Duty Hours"
          current={hosStatus?.consecutive_off_duty_hours || 0}
          maximum={24}
          icon={Clock}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          subtitle={hosStatus?.needs_rest ? 'Rest required' : 'Adequate rest'}
          showProgressBar={false}
        />

        <HOSStatusCard
          title="Compliance Status"
          current={hosStatus?.compliant ? 1 : 0}
          maximum={1}
          icon={CheckCircle}
          iconColor={hosStatus?.compliant ? 'text-green-600' : 'text-red-600'}
          iconBgColor={hosStatus?.compliant ? 'bg-green-100' : 'bg-red-100'}
          subtitle={(hosStatus?.violations_count || 0) > 0 ? 
            `${hosStatus?.violations_count} violation${(hosStatus?.violations_count || 0) > 1 ? 's' : ''}` : 
            undefined
          }
          showProgressBar={false}
        />
      </div>

      {/* Add Log Entry Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            {editingEntry ? 'Edit Log Entry' : 'Add New Log Entry'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Duty Status"
                name="duty_status"
                type="select"
                value={formData.duty_status}
                onChange={handleInputChange}
                required
                options={[
                  { value: 0, label: 'Select duty status' },
                  ...dutyStatuses.map(status => ({
                    value: status.id,
                    label: status.name
                  }))
                ]}
              />

              <FormField
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Mile Marker 45, I-80"
              />

              <FormField
                label="Start Time"
                name="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={handleInputChange}
                required
              />

              <FormField
                label="End Time"
                name="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={handleInputChange}
                required
              />

              <FormField
                label="City"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="e.g., Denver"
              />

              <FormField
                label="State"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                placeholder="e.g., CO"
                maxLength={2}
              />
            </div>

            <FormField
              label="Remarks"
              name="remarks"
              type="textarea"
              value={formData.remarks}
              onChange={handleInputChange}
              placeholder="Optional notes about this log entry..."
              rows={3}
            />

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>{isSubmitting ? 'Saving...' : (editingEntry ? 'Update Entry' : 'Add Entry')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingEntry(null);
                  setFormData({
                    duty_status: 0,
                    start_time: '',
                    end_time: '',
                    location: '',
                    city: '',
                    state: '',
                    remarks: '',
                  });
                }}
                className="px-4 py-2 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Daily Log Summary */}
      {dailyLog && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">
                Daily Log - {formatDate(dailyLog.log_date)}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Entry</span>
                </button>
                {!dailyLog.is_certified && (
                  <button
                    onClick={handleCertifyDaily}
                    className="flex items-center space-x-2 px-3 py-1 text-sm bg-success-100 text-success-700 rounded-lg hover:bg-success-200 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Certify</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <p className="text-sm text-neutral-600">Driving Hours</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {dailyLog.total_driving_hours.toFixed(1)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-neutral-600">On Duty Hours</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {dailyLog.total_on_duty_hours.toFixed(1)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-neutral-600">Off Duty Hours</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {dailyLog.total_off_duty_hours.toFixed(1)}
                </p>
            </div>
            </div>

            {dailyLog.is_certified && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    Daily log certified on {formatDateTime(dailyLog.certified_at || '')}
                  </span>
            </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Log Entries */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Log Entries</h2>
        </div>
        <div className="p-6">
          {logEntries.length > 0 ? (
          <div className="space-y-4">
              {logEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getStatusColor(entry.duty_status_name, dutyStatuses) }}
                    ></div>
                <div>
                      <p className="font-medium text-neutral-900">{entry.duty_status_name}</p>
                      <p className="text-sm text-neutral-600">
                        {entry.location && `${entry.location}, `}
                        {entry.city && entry.state && `${entry.city}, ${entry.state}`}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatTime(entry.start_time)} - {formatTime(entry.end_time)} 
                        ({calculateDuration(entry.start_time, entry.end_time)} hours)
                      </p>
                      {entry.remarks && (
                        <p className="text-xs text-neutral-500 mt-1">{entry.remarks}</p>
                      )}
                </div>
              </div>
                  <div className="flex items-center space-x-2">
                    {entry.is_certified ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Certified
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCertify(entry.id)}
                        className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                      >
                        Certify
                      </button>
                    )}
                    {entry.is_editable && (
                      <>
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-1 text-neutral-600 hover:text-primary-600 transition-colors"
                          title="Edit log entry"
                          aria-label="Edit log entry"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 text-neutral-600 hover:text-red-600 transition-colors"
                          title="Delete log entry"
                          aria-label="Delete log entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
            </div>
                </div>
              ))}
              </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
              <p className="text-neutral-500">No log entries found</p>
              <p className="text-sm text-neutral-400">Add your first log entry to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogSheets;
