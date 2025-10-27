from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'trips', views.TripViewSet)
router.register(r'locations', views.LocationViewSet)
router.register(r'rest-stops', views.RestStopViewSet)
router.register(r'route-segments', views.RouteSegmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('plan-route/', views.PlanRouteView.as_view(), name='plan_route'),
    path('calculate-hos/', views.CalculateHOSView.as_view(), name='calculate_hos'),
]

