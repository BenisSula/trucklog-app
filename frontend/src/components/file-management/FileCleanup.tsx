import React, { useState, useEffect } from 'react';
import {
  Trash2,
  HardDrive,
  Calendar,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CleanupStats {
  total_files: number;
  total_size_mb: number;
  old_files_count: number;
  old_files_size_mb: number;
  cutoff_date: string;
}

interface CleanupResult {
  success: boolean;
  deleted_count: number;
  total_size_freed_mb: number;
  cutoff_date: string;
  error?: string;
}

interface FileCleanupProps {
  className?: string;
}

const FileCleanup: React.FC<FileCleanupProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);
  const [lastCleanup, setLastCleanup] = useState<CleanupResult | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/core-utils/file-cleanup/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        toast.error('Failed to fetch cleanup statistics');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch cleanup statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const performCleanup = async () => {
    if (!window.confirm(`Are you sure you want to delete files older than ${cleanupDays} days? This action cannot be undone.`)) {
      return;
    }

    setIsCleaning(true);
    try {
      const response = await fetch('/api/core-utils/file-cleanup/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days_old: cleanupDays }),
      });

      if (response.ok) {
        const result = await response.json();
        setLastCleanup(result);
        toast.success(`Cleanup completed: ${result.deleted_count} files deleted, ${result.total_size_freed_mb}MB freed`);
        fetchStats(); // Refresh stats
      } else {
        const error = await response.json();
        toast.error(error.error || 'Cleanup failed');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error('Cleanup failed');
    } finally {
      setIsCleaning(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSize = (mb: number) => {
    if (mb < 1024) {
      return `${mb.toFixed(2)} MB`;
    } else {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">File Cleanup</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage and clean up old files to free up storage space
            </p>
          </div>
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading statistics...</span>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Current Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <HardDrive className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Total Files</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.total_files}</p>
                    <p className="text-sm text-blue-700">
                      {formatSize(stats.total_size_mb)} total size
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-orange-900">Old Files</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.old_files_count}</p>
                    <p className="text-sm text-orange-700">
                      {formatSize(stats.old_files_size_mb)} can be freed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cleanup Information */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Cleanup Information</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Files older than <strong>{formatDate(stats.cutoff_date)}</strong> are considered old and can be cleaned up.
                    This will permanently delete {stats.old_files_count} files and free up {formatSize(stats.old_files_size_mb)} of storage space.
                  </p>
                </div>
              </div>
            </div>

            {/* Cleanup Controls */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Perform Cleanup</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delete files older than (days)
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={cleanupDays}
                      onChange={(e) => setCleanupDays(parseInt(e.target.value) || 30)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-24"
                      title="Number of days"
                      aria-label="Number of days"
                    />
                    <span className="text-sm text-gray-500">days</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={performCleanup}
                    disabled={isCleaning || stats.old_files_count === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{isCleaning ? 'Cleaning...' : 'Clean Up Old Files'}</span>
                  </button>
                  
                  {stats.old_files_count === 0 && (
                    <span className="text-sm text-gray-500">
                      No old files to clean up
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Last Cleanup Result */}
            {lastCleanup && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-green-900">Last Cleanup Result</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Successfully deleted <strong>{lastCleanup.deleted_count}</strong> files
                      and freed up <strong>{formatSize(lastCleanup.total_size_freed_mb)}</strong> of storage space.
                      Files older than {formatDate(lastCleanup.cutoff_date)} were removed.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load statistics</h3>
            <p className="text-gray-500 mb-4">
              There was an error loading the cleanup statistics.
            </p>
            <button
              onClick={fetchStats}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileCleanup;
