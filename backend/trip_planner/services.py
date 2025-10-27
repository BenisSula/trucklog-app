"""
Route Planning Service
Integrates with OpenRouteService API for distance, time, and route optimization
"""

import os
import requests
from typing import List, Dict, Tuple
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class RouteService:
    """
    Service for calculating routes, distances, and travel times using OpenRouteService API
    """
    
    def __init__(self):
        # Try to get API key from settings first, then environment variable
        api_key = None
        if hasattr(settings, 'OPENROUTESERVICE_API_KEY'):
            api_key = settings.OPENROUTESERVICE_API_KEY
        else:
            api_key = os.getenv('OPENROUTESERVICE_API_KEY', None)
        
        self.api_key = api_key
        self.base_url = 'https://api.openrouteservice.org/v2'
        
        if not self.api_key:
            logger.warning("OpenRouteService API key not configured")
    
    def calculate_distance_and_time(
        self, 
        origin: Tuple[float, float], 
        destination: Tuple[float, float],
        profile: str = 'driving-hgv'  # Heavy goods vehicle profile
    ) -> Dict:
        """
        Calculate driving distance and time between two points
        
        Args:
            origin: (longitude, latitude) of origin
            destination: (longitude, latitude) of destination
            profile: OpenRouteService profile (driving, driving-hgv, driving-electric, etc.)
        
        Returns:
            Dict containing distance (meters), duration (seconds), and route geometry
        """
        if not self.api_key:
            logger.error("OpenRouteService API key not configured")
            return self._calculate_straight_line_distance(origin, destination)
        
        try:
            url = f"{self.base_url}/directions/{profile}"
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            coordinates = [[origin[0], origin[1]], [destination[0], destination[1]]]
            
            response = requests.get(url, headers=headers, params={
                'coordinates': coordinates
            }, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'routes' in data and len(data['routes']) > 0:
                    route = data['routes'][0]
                    summary = route['summary']
                    
                    return {
                        'distance_meters': summary.get('distance', 0),
                        'duration_seconds': summary.get('duration', 0),
                        'distance_miles': summary.get('distance', 0) / 1609.34,  # Convert to miles
                        'duration_hours': summary.get('duration', 0) / 3600,  # Convert to hours
                        'geometry': route.get('geometry', []),
                        'waypoints': route.get('waypoints', []),
                        'success': True
                    }
                else:
                    logger.warning("No routes returned from OpenRouteService")
                    return self._calculate_straight_line_distance(origin, destination)
            else:
                logger.error(f"OpenRouteService API error: {response.status_code}")
                return self._calculate_straight_line_distance(origin, destination)
                
        except Exception as e:
            logger.error(f"Error calling OpenRouteService API: {str(e)}")
            return self._calculate_straight_line_distance(origin, destination)
    
    def _calculate_straight_line_distance(
        self, 
        origin: Tuple[float, float], 
        destination: Tuple[float, float]
    ) -> Dict:
        """
        Fallback calculation using Haversine formula for straight-line distance
        """
        import math
        
        # Haversine formula
        lat1, lon1 = origin[1], origin[0]
        lat2, lon2 = destination[1], destination[0]
        
        R = 6371  # Earth radius in kilometers
        
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = (math.sin(dlat / 2) ** 2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
             math.sin(dlon / 2) ** 2)
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance_km = R * c
        distance_miles = distance_km * 0.621371
        distance_meters = distance_km * 1000
        
        # Estimate driving time (assuming 55 mph average)
        duration_hours = distance_miles / 55
        duration_seconds = duration_hours * 3600
        
        return {
            'distance_meters': distance_meters,
            'duration_seconds': duration_seconds,
            'distance_miles': distance_miles,
            'duration_hours': duration_hours,
            'geometry': [],
            'waypoints': [],
            'success': False,  # Fallback calculation
            'note': 'Straight-line distance calculation (API unavailable)'
        }
    
    def optimize_route(
        self, 
        waypoints: List[Tuple[float, float]],
        profile: str = 'driving-hgv'
    ) -> Dict:
        """
        Optimize route with multiple waypoints using traveling salesman optimization
        
        Args:
            waypoints: List of (longitude, latitude) coordinates
            profile: OpenRouteService profile
        
        Returns:
            Optimized route with reordered waypoints
        """
        if not self.api_key or len(waypoints) < 2:
            return {'optimized': False, 'waypoints': waypoints}
        
        try:
            # Use OpenRouteService optimization endpoint
            url = f"{self.base_url}/optimization"
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            jobs = []
            for i, coord in enumerate(waypoints):
                jobs.append({
                    'id': i,
                    'location': [coord[0], coord[1]]
                })
            
            payload = {
                'jobs': jobs,
                'vehicles': [{
                    'id': 1,
                    'profile': profile,
                    'start': [waypoints[0][0], waypoints[0][1]],
                    'end': [waypoints[-1][0], waypoints[-1][1]]
                }]
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'routes' in data and len(data['routes']) > 0:
                    route = data['routes'][0]
                    optimized_waypoints = []
                    
                    for step in route.get('steps', []):
                        job_id = step.get('job')
                        if job_id is not None and job_id < len(waypoints):
                            optimized_waypoints.append(waypoints[job_id])
                    
                    return {
                        'optimized': True,
                        'waypoints': optimized_waypoints,
                        'distance': route.get('distance', 0),
                        'duration': route.get('duration', 0)
                    }
            
            return {'optimized': False, 'waypoints': waypoints}
            
        except Exception as e:
            logger.error(f"Error optimizing route: {str(e)}")
            return {'optimized': False, 'waypoints': waypoints}
    
    def get_route_alternatives(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        alternatives: int = 3
    ) -> List[Dict]:
        """
        Get multiple alternative routes between two points
        
        Returns:
            List of alternative routes with different characteristics
        """
        if not self.api_key:
            return []
        
        try:
            url = f"{self.base_url}/directions/driving-hgv"
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            coordinates = [[origin[0], origin[1]], [destination[0], destination[1]]]
            
            response = requests.get(url, headers=headers, params={
                'coordinates': coordinates,
                'alternative_routes': {'target_count': alternatives}
            }, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('routes', [])
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting route alternatives: {str(e)}")
            return []


class RestStopPlanner:
    """
    Plan rest stops based on HOS compliance requirements
    """
    
    def __init__(self, route_service: RouteService):
        self.route_service = route_service
    
    def plan_rest_stops(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        hos_status: Dict,
        current_driving_hours: float = 0
    ) -> List[Dict]:
        """
        Plan rest stops based on HOS requirements
        
        Args:
            origin: Start location
            destination: End location  
            hos_status: Current HOS status
            current_driving_hours: Current hours of driving
        
        Returns:
            List of recommended rest stops with timing
        """
        rest_stops = []
        
        # Calculate route
        route_info = self.route_service.calculate_distance_and_time(origin, destination)
        
        if not route_info.get('success'):
            # Can't plan without actual route
            return rest_stops
        
        total_driving_hours = route_info['duration_hours']
        total_trip_hours = current_driving_hours + total_driving_hours
        
        # Check if driver needs breaks based on HOS rules
        hours_since_break = hos_status.get('hours_since_break', 0)
        
        # If driver has been driving for more than 8 hours without a break, need 30-min break
        if hours_since_break >= 8:
            rest_stops.append({
                'type': 'required_30_min',
                'location': None,  # Would need to find actual location along route
                'description': 'Required 30-minute break - driving for more than 8 hours',
                'severity': 'required',
                'timing': 'Before continuing trip'
            })
        
        # If trip would exceed 11 hours of driving, plan break every 8 hours
        if total_trip_hours > 11:
            breaks_needed = int(total_trip_hours / 11)
            
            for i in range(1, breaks_needed):
                break_time = (i * 11) - current_driving_hours
                
                rest_stops.append({
                    'type': 'required_30_min',
                    'description': f'Required 30-minute break to comply with 11-hour driving limit',
                    'severity': 'required',
                    'timing': f'{break_time:.1f} hours into trip',
                    'recommended_hours': break_time
                })
        
        # If trip would exceed 14 hours on-duty, plan 10-hour break before trip
        on_duty_hours = hos_status.get('on_duty_hours', 0)
        total_on_duty = on_duty_hours + total_trip_hours
        
        if total_on_duty > 14:
            rest_stops.insert(0, {
                'type': 'required_10_hour',
                'description': f'Required 10-hour off-duty period - will exceed 14-hour on-duty limit',
                'severity': 'required',
                'timing': 'Before starting trip',
                'required_hours': 10 - hos_status.get('consecutive_off_duty_hours', 0)
            })
        
        return rest_stops


class RouteOptimizer:
    """
    Optimize routes based on multiple criteria (time, distance, HOS compliance, rest stops)
    """
    
    def __init__(self, route_service: RouteService, rest_stop_planner: RestStopPlanner):
        self.route_service = route_service
        self.rest_stop_planner = rest_stop_planner
    
    def optimize_trip(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        waypoints: List[Tuple[float, float]],
        hos_status: Dict
    ) -> Dict:
        """
        Optimize trip route considering HOS compliance and rest stops
        
        Returns:
            Optimized route with rest stops and HOS compliance information
        """
        # Optimize waypoint order if multiple waypoints
        if len(waypoints) > 1:
            optimization_result = self.route_service.optimize_route(waypoints)
            optimized_waypoints = optimization_result.get('waypoints', waypoints)
        else:
            optimized_waypoints = waypoints
        
        # Calculate route segments
        route_segments = []
        current_location = origin
        total_distance = 0
        total_duration = 0
        
        for waypoint in optimized_waypoints:
            segment = self.route_service.calculate_distance_and_time(current_location, waypoint)
            route_segments.append({
                'start': current_location,
                'end': waypoint,
                'distance_meters': segment['distance_meters'],
                'duration_seconds': segment['duration_seconds']
            })
            
            total_distance += segment['distance_meters']
            total_duration += segment['duration_seconds']
            
            current_location = waypoint
        
        # Final segment to destination
        final_segment = self.route_service.calculate_distance_and_time(current_location, destination)
        total_distance += final_segment['distance_meters']
        total_duration += final_segment['duration_seconds']
        
        route_segments.append({
            'start': current_location,
            'end': destination,
            'distance_meters': final_segment['distance_meters'],
            'duration_seconds': final_segment['duration_seconds']
        })
        
        # Plan rest stops
        rest_stops = self.rest_stop_planner.plan_rest_stops(
            origin,
            destination,
            hos_status,
            hos_status.get('current_driving_hours', 0)
        )
        
        return {
            'waypoints': optimized_waypoints,
            'segments': route_segments,
            'total_distance_meters': total_distance,
            'total_distance_miles': total_distance / 1609.34,
            'total_duration_seconds': total_duration,
            'total_duration_hours': total_duration / 3600,
            'rest_stops': rest_stops,
            'hos_compliant': len([s for s in rest_stops if s.get('severity') == 'required']) == 0,
            'optimized': len(optimized_waypoints) > 1
        }

