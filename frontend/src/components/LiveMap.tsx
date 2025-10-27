import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Icon, LatLngTuple, divIcon } from 'leaflet';
import { Navigation } from 'lucide-react';
import { RoutePoint, FuelStop, mapService } from '../services/mapService';
import 'leaflet/dist/leaflet.css';
import './MapStyles.css';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LiveMapProps {
  currentLocation: RoutePoint | null;
  routePoints: RoutePoint[];
  fuelStops: FuelStop[];
  isTracking: boolean;
  onLocationClick?: (location: LatLngTuple) => void;
  className?: string;
}

// Custom truck icon
const createTruckIcon = (heading: number = 0, speed: number = 0) => {
  const color = speed > 0 ? '#10b981' : '#6b7280'; // Green if moving, gray if stopped
  return divIcon({
    html: `
      <div style="
        transform: rotate(${heading}deg);
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${color};
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M3 17h2l.5-2h13l.5 2h2v-5h-3V9.5C18 8.12 16.88 7 15.5 7h-7C7.12 7 6 8.12 6 9.5V12H3v5zm3-7.5C6 8.67 6.67 8 7.5 8h9c.83 0 1.5.67 1.5 1.5V12H6V9.5z"/>
        </svg>
      </div>
    `,
    className: 'truck-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Custom fuel station icon
const fuelStationIcon = divIcon({
  html: `
    <div style="
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f59e0b;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-3h1c.55 0 1 .45 1 1v3.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77z"/>
      </svg>
    </div>
  `,
  className: 'fuel-station-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Component to handle map updates
const MapUpdater: React.FC<{ center: LatLngTuple; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

const LiveMap: React.FC<LiveMapProps> = ({
  currentLocation,
  routePoints,
  fuelStops,
  isTracking,
  className = ''
}) => {
  const mapRef = useRef<any>(null);
  const [mapCenter, setMapCenter] = useState<LatLngTuple>([40.7128, -74.0060]); // Default to NYC
  const [mapZoom, setMapZoom] = useState(13);
  const [mapError, setMapError] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Update map center when current location changes
  useEffect(() => {
    if (currentLocation && isTracking) {
      const newCenter = mapService.toLatLngTuple(currentLocation);
      setMapCenter(newCenter);
    }
  }, [currentLocation, isTracking]);

  // Set map as loaded after a short delay to ensure tiles load
  useEffect(() => {
    console.log('LiveMap component mounted');
    
    const timer = setTimeout(() => {
      console.log('Setting map as loaded');
      setMapLoaded(true);
    }, 3000); // Increased to 3 seconds to allow tiles to load
    
    return () => {
      console.log('LiveMap component unmounting');
      clearTimeout(timer);
    };
  }, []);

  // Debug current location changes
  useEffect(() => {
    if (currentLocation) {
      console.log('Current location updated:', currentLocation);
    }
  }, [currentLocation]);

  // Create route line from route points
  const routeLine: LatLngTuple[] = routePoints.map(point => 
    mapService.toLatLngTuple(point)
  );

  // Handle map errors
  const handleMapError = () => {
    setMapError(true);
  };

  // If map fails to load, show fallback
  if (mapError) {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-neutral-100 rounded-lg h-full flex items-center justify-center border-2 border-dashed border-neutral-300">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">🗺️</div>
            <h4 className="text-lg font-medium text-neutral-600 mb-2">Map Loading Error</h4>
            <p className="text-neutral-500 mb-4">
              Unable to load interactive map. Showing location data below.
            </p>
            {currentLocation && (
              <div className="bg-white rounded-lg p-4 text-sm text-neutral-600 space-y-2">
                <p><strong>📍 Location:</strong> {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</p>
                <p><strong>🚛 Speed:</strong> {currentLocation.speed?.toFixed(2) || 0} mph</p>
                <p><strong>🧭 Heading:</strong> {currentLocation.heading?.toFixed(0) || 0}°</p>
                <p><strong>⛽ Fuel:</strong> {currentLocation.fuelLevel?.toFixed(1) || 0}%</p>
                <p><strong>🕐 Time:</strong> {new Date(currentLocation.timestamp).toLocaleTimeString()}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Location info footer */}
        {currentLocation && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full animate-pulse ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium text-gray-900">
                  {isTracking ? 'Live Tracking Active' : 'Tracking Inactive'}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-600">
                <span>📍 {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</span>
                <span>🚛 {currentLocation.speed?.toFixed(2) || 0} mph</span>
                <span>⛽ {currentLocation.fuelLevel?.toFixed(1) || 0}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="w-full h-full rounded-lg overflow-hidden">
        <MapContainer
          ref={mapRef}
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%', minHeight: '400px' }}
          whenReady={() => {
            // Map created successfully
            console.log('Map created successfully');
            setMapLoaded(true);
          }}
        >
        <MapUpdater center={mapCenter} zoom={mapZoom} />
        
        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Current location marker */}
        {currentLocation && (
          <Marker
            position={mapService.toLatLngTuple(currentLocation)}
            icon={createTruckIcon(currentLocation.heading, currentLocation.speed)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-neutral-900 mb-2">Current Location</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Speed:</strong> {currentLocation.speed?.toFixed(2) || 0} mph</p>
                  <p><strong>Heading:</strong> {currentLocation.heading?.toFixed(0) || 0}°</p>
                  <p><strong>Fuel:</strong> {currentLocation.fuelLevel?.toFixed(1) || 0}%</p>
                  <p><strong>Time:</strong> {new Date(currentLocation.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route line */}
        {routeLine.length > 1 && (
          <Polyline
            positions={routeLine}
            color="#2563eb"
            weight={4}
            opacity={0.7}
          />
        )}

        {/* Fuel stations */}
        {fuelStops.map((station) => (
          <Marker
            key={station.id}
            position={mapService.toLatLngTuple(station.location)}
            icon={fuelStationIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-neutral-900 mb-2">Fuel Station</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Price:</strong> ${station.cost.toFixed(2)}/gal</p>
                  {station.gallonsAdded > 0 && (
                    <p><strong>Fueled:</strong> {station.gallonsAdded.toFixed(1)} gal</p>
                  )}
                  <p><strong>Distance:</strong> {
                    currentLocation 
                      ? mapService.calculateDistance(currentLocation, station.location).toFixed(1) + ' mi'
                      : 'N/A'
                  }</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route points (historical) */}
        {routePoints.slice(0, -1).map((point, index) => (
          <Marker
            key={`route-${index}`}
            position={mapService.toLatLngTuple(point)}
            icon={divIcon({
              html: `<div style="
                width: 6px;
                height: 6px;
                background: #3b82f6;
                border-radius: 50%;
                border: 1px solid white;
                box-shadow: 0 1px 2px rgba(0,0,0,0.3);
              "></div>`,
              className: 'route-point-marker',
              iconSize: [6, 6],
              iconAnchor: [3, 3],
            })}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-neutral-900 mb-2">Route Point</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Speed:</strong> {point.speed?.toFixed(2) || 0} mph</p>
                  <p><strong>Fuel:</strong> {point.fuelLevel?.toFixed(1) || 0}%</p>
                  <p><strong>Time:</strong> {new Date(point.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center z-[999] map-loading">
          <div className="text-center bg-white rounded-lg p-6 shadow-lg">
            <div className="text-4xl mb-4">🗺️</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading interactive map...</p>
            <p className="text-xs text-gray-500 mt-1">Please wait while we load the map tiles</p>
            <button
              onClick={() => setMapLoaded(true)}
              className="mt-3 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
            >
              Show Map Now
            </button>
          </div>
        </div>
      )}
      </div>

      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 z-[1000] space-y-2">
        <button
          onClick={() => setMapZoom(prev => Math.min(18, prev + 1))}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded p-2 shadow-sm transition-colors"
          title="Zoom In"
        >
          <span className="text-lg font-bold text-gray-700">+</span>
        </button>
        <button
          onClick={() => setMapZoom(prev => Math.max(3, prev - 1))}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded p-2 shadow-sm transition-colors"
          title="Zoom Out"
        >
          <span className="text-lg font-bold text-gray-700">−</span>
        </button>
        {currentLocation && (
          <button
            onClick={() => {
              setMapCenter(mapService.toLatLngTuple(currentLocation));
              setMapZoom(15);
            }}
            className="bg-white hover:bg-gray-50 border border-gray-300 rounded p-2 shadow-sm transition-colors"
            title="Center on Vehicle"
          >
            <Navigation className="h-4 w-4 text-gray-700" />
          </button>
        )}
      </div>

      {/* Location info footer */}
      {currentLocation && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full animate-pulse ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium text-gray-900">
                {isTracking ? 'Live Tracking Active' : 'Tracking Inactive'}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <span>📍 {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</span>
              <span>🚛 {currentLocation.speed?.toFixed(1) || 0} mph</span>
              <span>⛽ {currentLocation.fuelLevel?.toFixed(1) || 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Tracking status overlay when no location */}
      {isTracking && !currentLocation && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-900">Acquiring GPS Signal...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMap;