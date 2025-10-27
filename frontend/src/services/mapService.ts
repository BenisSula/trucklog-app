import { LatLngTuple } from 'leaflet';

export interface MapLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  altitude?: number;
}

export interface RoutePoint extends MapLocation {
  fuelLevel?: number;
  fuelConsumption?: number;
  engineRpm?: number;
  coolantTemp?: number;
}

export interface FuelData {
  currentLevel: number; // percentage
  consumptionRate: number; // mpg
  totalConsumed: number; // gallons
  estimatedRange: number; // miles
  fuelStops: FuelStop[];
}

export interface FuelStop {
  id: string;
  location: MapLocation;
  gallonsAdded: number;
  cost: number;
  timestamp: string;
}

export class MapService {
  private static instance: MapService;
  private watchId: number | null = null;
  private routePoints: RoutePoint[] = [];
  private fuelData: FuelData = {
    currentLevel: 75,
    consumptionRate: 6.5,
    totalConsumed: 0,
    estimatedRange: 450,
    fuelStops: []
  };

  static getInstance(): MapService {
    if (!MapService.instance) {
      MapService.instance = new MapService();
    }
    return MapService.instance;
  }

  // Convert coordinates to Leaflet format
  toLatLngTuple(location: MapLocation): LatLngTuple {
    return [location.latitude, location.longitude];
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(point1: MapLocation, point2: MapLocation): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * 
      Math.cos(this.toRadians(point2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Start GPS tracking
  startTracking(onLocationUpdate: (location: RoutePoint) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      };

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: RoutePoint = {
            latitude: Math.round(position.coords.latitude * 1000000) / 1000000,
            longitude: Math.round(position.coords.longitude * 1000000) / 1000000,
            timestamp: new Date().toISOString(),
            speed: position.coords.speed ? Math.round(position.coords.speed * 2.237 * 100) / 100 : undefined, // Convert m/s to mph and round to 2 decimal places
            heading: position.coords.heading ? Math.round(position.coords.heading) : undefined,
            altitude: position.coords.altitude ? Math.round(position.coords.altitude) : undefined,
            fuelLevel: Math.round(this.fuelData.currentLevel * 100) / 100,
            fuelConsumption: this.fuelData.consumptionRate,
          };

          this.addRoutePoint(location);
          onLocationUpdate(location);
          resolve();
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Fallback to simulated tracking
          this.startSimulatedTracking(onLocationUpdate);
          resolve();
        },
        options
      );
    });
  }

  // Simulated tracking for demo purposes with realistic patterns
  private startSimulatedTracking(onLocationUpdate: (location: RoutePoint) => void): void {
    let currentLat = 40.7128; // NYC starting point
    let currentLng = -74.0060;
    let heading = 45; // Northeast direction
    let speed = 55.00; // Start at 55 mph
    let fuelLevel = 75.50; // percentage
    let trafficPattern = 0; // For simulating traffic conditions

    const simulateMovement = () => {
      // Simulate realistic traffic patterns
      trafficPattern += 0.1;
      const trafficFactor = Math.sin(trafficPattern) * 0.3 + 0.7; // Creates traffic waves
      
      // Simulate realistic truck movement with traffic consideration
      const baseSpeedVariation = (Math.random() - 0.5) * 4; // ±2 mph base variation
      const trafficSpeedVariation = (1 - trafficFactor) * 20; // Traffic can reduce speed by up to 20 mph
      const targetSpeed = Math.max(25, Math.min(70, 60 + baseSpeedVariation - trafficSpeedVariation));
      
      // Smooth speed changes (trucks don't change speed instantly)
      const speedDiff = targetSpeed - speed;
      speed += speedDiff * 0.1; // Gradual speed change
      speed = Math.round(speed * 100) / 100; // Round to 2 decimal places
      
      // Simulate heading changes (slight course corrections)
      const headingChange = (Math.random() - 0.5) * 5; // ±2.5 degree variation
      heading = Math.round((heading + headingChange + 360) % 360);
      
      // Calculate new position based on speed and heading
      const distance = (speed / 3600) * 2; // Distance in 2 seconds at current speed
      const latChange = (distance / 69) * Math.cos(this.toRadians(heading));
      const lngChange = (distance / 69) * Math.sin(this.toRadians(heading)) / Math.cos(this.toRadians(currentLat));
      
      currentLat += latChange;
      currentLng += lngChange;
      
      // Simulate realistic fuel consumption based on speed
      const fuelConsumptionRate = speed > 60 ? 0.012 : speed > 45 ? 0.008 : 0.005; // Higher consumption at higher speeds
      fuelLevel = Math.max(0, fuelLevel - fuelConsumptionRate);
      fuelLevel = Math.round(fuelLevel * 100) / 100; // Round to 2 decimal places
      
      const location: RoutePoint = {
        latitude: Math.round(currentLat * 1000000) / 1000000, // Round to 6 decimal places
        longitude: Math.round(currentLng * 1000000) / 1000000, // Round to 6 decimal places
        timestamp: new Date().toISOString(),
        speed: Math.round(speed * 100) / 100, // Round to 2 decimal places
        heading: Math.round(heading),
        fuelLevel: Math.round(fuelLevel * 100) / 100, // Round to 2 decimal places
        fuelConsumption: this.fuelData.consumptionRate,
        engineRpm: Math.round(1500 + Math.random() * 500),
        coolantTemp: Math.round(180 + Math.random() * 20),
      };

      this.addRoutePoint(location);
      this.updateFuelData(location);
      onLocationUpdate(location);
    };

    // Update every 2 seconds
    setInterval(simulateMovement, 2000);
  }

  // Stop tracking
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Add route point
  private addRoutePoint(point: RoutePoint): void {
    this.routePoints.push(point);
    // Keep only last 100 points for performance
    if (this.routePoints.length > 100) {
      this.routePoints = this.routePoints.slice(-100);
    }
  }

  // Update fuel data
  private updateFuelData(location: RoutePoint): void {
    if (this.routePoints.length > 1) {
      const previousPoint = this.routePoints[this.routePoints.length - 2];
      const distance = this.calculateDistance(previousPoint, location);
      const fuelConsumed = distance / this.fuelData.consumptionRate;
      
      this.fuelData.totalConsumed += fuelConsumed;
      this.fuelData.currentLevel = Math.max(0, location.fuelLevel || this.fuelData.currentLevel);
      this.fuelData.estimatedRange = (this.fuelData.currentLevel / 100) * 500; // Assume 500 mile range at full tank
    }
  }

  // Get route points
  getRoutePoints(): RoutePoint[] {
    return [...this.routePoints];
  }

  // Get fuel data
  getFuelData(): FuelData {
    return { ...this.fuelData };
  }

  // Add fuel stop
  addFuelStop(location: MapLocation, gallonsAdded: number, cost: number): void {
    const fuelStop: FuelStop = {
      id: Date.now().toString(),
      location,
      gallonsAdded,
      cost,
      timestamp: new Date().toISOString()
    };

    this.fuelData.fuelStops.push(fuelStop);
    this.fuelData.currentLevel = Math.min(100, this.fuelData.currentLevel + (gallonsAdded / 100) * 100);
    this.fuelData.totalConsumed = 0; // Reset consumption counter
  }

  // Calculate ETA based on current speed and distance
  calculateETA(destination: MapLocation, currentLocation: MapLocation, currentSpeed: number): Date {
    const distance = this.calculateDistance(currentLocation, destination);
    const timeHours = distance / Math.max(currentSpeed, 1); // Avoid division by zero
    return new Date(Date.now() + timeHours * 60 * 60 * 1000);
  }

  // Get nearby fuel stations (mock data for demo)
  getNearbyFuelStations(location: MapLocation, radiusMiles: number = 25): Promise<FuelStop[]> {
    return new Promise((resolve) => {
      // Mock fuel stations data
      const mockStations: FuelStop[] = [
        {
          id: 'station1',
          location: {
            latitude: location.latitude + 0.1,
            longitude: location.longitude + 0.1,
            timestamp: new Date().toISOString()
          },
          gallonsAdded: 0,
          cost: 3.45,
          timestamp: new Date().toISOString()
        },
        {
          id: 'station2',
          location: {
            latitude: location.latitude - 0.05,
            longitude: location.longitude + 0.15,
            timestamp: new Date().toISOString()
          },
          gallonsAdded: 0,
          cost: 3.52,
          timestamp: new Date().toISOString()
        }
      ];

      setTimeout(() => resolve(mockStations), 500);
    });
  }

  // Clear route data
  clearRoute(): void {
    this.routePoints = [];
  }

  // Export route data
  exportRouteData(): string {
    return JSON.stringify({
      routePoints: this.routePoints,
      fuelData: this.fuelData,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

export const mapService = MapService.getInstance();