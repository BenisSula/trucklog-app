import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useHOSUpdates } from '../hooks/useHOSUpdates';
import { useTripUpdates } from '../hooks/useTripUpdates';
import toast from 'react-hot-toast';

const RefreshButton: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { refresh: refreshHOS } = useHOSUpdates({
    autoRefresh: true,
    refreshInterval: 30000,
    enableWebSocket: true
  });

  const { refresh: refreshTrips } = useTripUpdates({
    autoRefresh: true,
    refreshInterval: 60000,
    enableWebSocket: true,
    activeTripsOnly: true
  });

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshHOS(),
        refreshTrips()
      ]);
      toast.success('Data refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
      aria-label="Refresh data"
      title="Refresh data"
    >
      <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
    </button>
  );
};

export default RefreshButton;
