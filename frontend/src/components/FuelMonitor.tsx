import React, { useState, useEffect } from 'react';
import { Fuel, TrendingUp, MapPin, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { FuelData, FuelStop, RoutePoint, mapService } from '../services/mapService';
import { CARD_STYLES, ICON_STYLES, BUTTON_STYLES } from '../config/theme';
import toast from 'react-hot-toast';

interface FuelMonitorProps {
  currentLocation: RoutePoint | null;
  fuelData: FuelData;
  onFuelStop: (gallons: number, cost: number) => void;
  className?: string;
}

const FuelMonitor: React.FC<FuelMonitorProps> = ({
  currentLocation,
  fuelData,
  onFuelStop,
  className = ''
}) => {
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [fuelAmount, setFuelAmount] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [nearbyStations, setNearbyStations] = useState<FuelStop[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);

  // Load nearby fuel stations when location changes
  useEffect(() => {
    if (currentLocation) {
      loadNearbyStations();
    }
  }, [currentLocation]);

  const loadNearbyStations = async () => {
    if (!currentLocation) return;
    
    try {
      setIsLoadingStations(true);
      const stations = await mapService.getNearbyFuelStations(currentLocation, 25);
      setNearbyStations(stations);
    } catch (error) {
      console.error('Error loading fuel stations:', error);
      toast.error('Failed to load nearby fuel stations');
    } finally {
      setIsLoadingStations(false);
    }
  };

  const handleFuelStop = () => {
    const gallons = parseFloat(fuelAmount);
    const cost = parseFloat(fuelCost);

    if (isNaN(gallons) || isNaN(cost) || gallons <= 0 || cost <= 0) {
      toast.error('Please enter valid fuel amount and cost');
      return;
    }

    if (!currentLocation) {
      toast.error('Current location not available');
      return;
    }

    onFuelStop(gallons, cost);
    mapService.addFuelStop(currentLocation, gallons, cost);
    
    setFuelAmount('');
    setFuelCost('');
    setShowFuelForm(false);
    
    toast.success(`⛽ Added ${gallons} gallons for $${cost.toFixed(2)}`);
  };

  const getFuelLevelColor = (level: number) => {
    if (level > 50) return 'text-green-600 bg-green-100';
    if (level > 25) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getFuelLevelIcon = (level: number) => {
    if (level > 50) return <Fuel className="h-5 w-5 text-green-600" />;
    if (level > 25) return <Fuel className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateTotalFuelCost = () => {
    return fuelData.fuelStops.reduce((total, stop) => total + stop.cost * stop.gallonsAdded, 0);
  };

  const getAverageConsumption = () => {
    if (fuelData.fuelStops.length === 0) return fuelData.consumptionRate;
    
    const totalGallons = fuelData.fuelStops.reduce((total, stop) => total + stop.gallonsAdded, 0);
    const totalDistance = fuelData.totalConsumed * fuelData.consumptionRate; // Approximate
    
    return totalDistance / Math.max(totalGallons, 1);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Fuel Level Card */}
      <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`${CARD_STYLES.title} flex items-center`}>
            {getFuelLevelIcon(fuelData.currentLevel)}
            <span className="ml-2">Fuel Level</span>
          </h3>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getFuelLevelColor(fuelData.currentLevel)}`}>
            {fuelData.currentLevel.toFixed(1)}%
          </span>
        </div>

        {/* Fuel gauge */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-neutral-600 mb-2">
            <span>Empty</span>
            <span>Full</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                fuelData.currentLevel > 50 
                  ? 'bg-green-500' 
                  : fuelData.currentLevel > 25 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, fuelData.currentLevel))}%` }}
            />
          </div>
        </div>

        {/* Fuel metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-neutral-600">Estimated Range</p>
            <p className="font-semibold text-neutral-900">{fuelData.estimatedRange.toFixed(0)} mi</p>
          </div>
          <div>
            <p className="text-neutral-600">Consumption Rate</p>
            <p className="font-semibold text-neutral-900">{fuelData.consumptionRate.toFixed(1)} mpg</p>
          </div>
        </div>

        {/* Low fuel warning */}
        {fuelData.currentLevel < 25 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-800">
                Low fuel level! Consider refueling soon.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fuel Statistics */}
      <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding}`}>
        <h3 className={`${CARD_STYLES.title} mb-4 flex items-center`}>
          <div className={ICON_STYLES.sectionHeader}>
            <TrendingUp className={ICON_STYLES.sectionHeaderIcon} />
          </div>
          <span className="ml-2">Fuel Statistics</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(calculateTotalFuelCost())}
            </p>
            <p className="text-sm text-neutral-600">Total Fuel Cost</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Fuel className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {fuelData.fuelStops.reduce((total, stop) => total + stop.gallonsAdded, 0).toFixed(1)}
            </p>
            <p className="text-sm text-neutral-600">Total Gallons</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {getAverageConsumption().toFixed(1)}
            </p>
            <p className="text-sm text-neutral-600">Avg MPG</p>
          </div>
        </div>
      </div>

      {/* Fuel Actions */}
      <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding}`}>
        <h3 className={`${CARD_STYLES.title} mb-4`}>Fuel Actions</h3>

        {!showFuelForm ? (
          <div className="space-y-3">
            <button
              onClick={() => setShowFuelForm(true)}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${BUTTON_STYLES.primary}`}
            >
              <Fuel className="h-4 w-4" />
              <span>Record Fuel Stop</span>
            </button>

            <button
              onClick={loadNearbyStations}
              disabled={isLoadingStations || !currentLocation}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${BUTTON_STYLES.secondary}`}
            >
              <MapPin className="h-4 w-4" />
              <span>{isLoadingStations ? 'Loading...' : 'Find Fuel Stations'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Gallons Added
              </label>
              <input
                type="number"
                value={fuelAmount}
                onChange={(e) => setFuelAmount(e.target.value)}
                placeholder="0.0"
                step="0.1"
                min="0"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Total Cost ($)
              </label>
              <input
                type="number"
                value={fuelCost}
                onChange={(e) => setFuelCost(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleFuelStop}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${BUTTON_STYLES.success}`}
              >
                <Fuel className="h-4 w-4" />
                <span>Add Fuel</span>
              </button>
              <button
                onClick={() => {
                  setShowFuelForm(false);
                  setFuelAmount('');
                  setFuelCost('');
                }}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${BUTTON_STYLES.secondary}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nearby Fuel Stations */}
      {nearbyStations.length > 0 && (
        <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding}`}>
          <h3 className={`${CARD_STYLES.title} mb-4 flex items-center`}>
            <div className={ICON_STYLES.sectionHeader}>
              <MapPin className={ICON_STYLES.sectionHeaderIcon} />
            </div>
            <span className="ml-2">Nearby Fuel Stations</span>
          </h3>

          <div className="space-y-3">
            {nearbyStations.map((station) => (
              <div key={station.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Fuel className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-neutral-900">Fuel Station</p>
                    <p className="text-sm text-neutral-600">
                      {currentLocation 
                        ? `${mapService.calculateDistance(currentLocation, station.location).toFixed(1)} mi away`
                        : 'Distance unknown'
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-neutral-900">{formatCurrency(station.cost)}/gal</p>
                  <p className="text-sm text-neutral-600">Regular</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Fuel Stops */}
      {fuelData.fuelStops.length > 0 && (
        <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding}`}>
          <h3 className={`${CARD_STYLES.title} mb-4 flex items-center`}>
            <div className={ICON_STYLES.sectionHeader}>
              <Clock className={ICON_STYLES.sectionHeaderIcon} />
            </div>
            <span className="ml-2">Recent Fuel Stops</span>
          </h3>

          <div className="space-y-3">
            {fuelData.fuelStops.slice(-3).reverse().map((stop) => (
              <div key={stop.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Fuel className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-neutral-900">
                      {stop.gallonsAdded.toFixed(1)} gallons
                    </p>
                    <p className="text-sm text-neutral-600">
                      {new Date(stop.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-neutral-900">
                    {formatCurrency(stop.cost * stop.gallonsAdded)}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {formatCurrency(stop.cost)}/gal
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelMonitor;