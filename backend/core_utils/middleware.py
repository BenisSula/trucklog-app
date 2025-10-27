"""
Custom middleware for the TruckLog application
"""

import time
import logging
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

logger = logging.getLogger(__name__)


class RateLimitMiddleware(MiddlewareMixin):
    """
    Rate limiting middleware to prevent abuse
    """
    
    def process_request(self, request):
        if not getattr(settings, 'RATELIMIT_ENABLE', False):
            return None
            
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        
        # Rate limit: 100 requests per minute
        cache_key = f"rate_limit_{ip}"
        requests = cache.get(cache_key, 0)
        
        if requests >= 100:
            logger.warning(f"Rate limit exceeded for IP: {ip}")
            return JsonResponse({
                'error': 'Rate limit exceeded. Please try again later.'
            }, status=429)
        
        # Increment counter
        cache.set(cache_key, requests + 1, 60)  # 60 seconds TTL
        
        return None


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Log all requests for monitoring and debugging
    """
    
    def process_request(self, request):
        request.start_time = time.time()
        return None
    
    def process_response(self, request, response):
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            
            # Log API requests
            if request.path.startswith('/api/'):
                logger.info(
                    f"API Request: {request.method} {request.path} "
                    f"Status: {response.status_code} Duration: {duration:.3f}s"
                )
        
        return response





