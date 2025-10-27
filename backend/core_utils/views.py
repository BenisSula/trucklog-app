from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404
from .models import AuditLog, SystemSettings, Notification, FileUpload
from .serializers import AuditLogSerializer, SystemSettingsSerializer, NotificationSerializer, FileUploadSerializer
from .file_manager import FileManager


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Audit log viewset (read-only for security)"""

    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]  # Only admins can view audit logs

    def get_queryset(self):
        # Filter by user if specified
        user_id = self.request.query_params.get("user_id", None)
        if user_id:
            return AuditLog.objects.filter(user_id=user_id)
        return AuditLog.objects.all()


class SystemSettingsViewSet(viewsets.ModelViewSet):
    """System settings management viewset"""

    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    permission_classes = [IsAdminUser]  # Only admins can manage settings

    @action(detail=False, methods=["get"])
    def public(self, request):
        """Get public settings that can be accessed by frontend"""
        public_settings = SystemSettings.objects.filter(is_public=True)
        serializer = self.get_serializer(public_settings, many=True)
        return Response(serializer.data)


class NotificationViewSet(viewsets.ModelViewSet):
    """Notification management viewset"""

    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only see their own notifications
        return Notification.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def unread(self, request):
        """Get unread notifications"""
        unread_notifications = Notification.objects.filter(user=request.user, is_read=False)
        serializer = self.get_serializer(unread_notifications, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"message": "All notifications marked as read"})

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        """Mark a specific notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)


class FileUploadViewSet(viewsets.ModelViewSet):
    """Enhanced file upload management viewset with security and permissions"""

    queryset = FileUpload.objects.all()
    serializer_class = FileUploadSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        # Users can only see their own file uploads unless they're staff
        if self.request.user.is_staff:
            return FileUpload.objects.all()
        return FileUpload.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"])
    def upload(self, request):
        """Upload a file with enhanced security and validation"""
        try:
            uploaded_file = request.FILES.get("file")
            if not uploaded_file:
                return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

            file_type = request.data.get("file_type", "other")
            description = request.data.get("description", "")
            is_public = request.data.get("is_public", "false").lower() == "true"

            # Use FileManager for secure upload
            file_manager = FileManager(request.user)
            result = file_manager.upload_file(
                uploaded_file=uploaded_file, file_type=file_type, description=description, is_public=is_public
            )

            if result["success"]:
                return Response(result, status=status.HTTP_201_CREATED)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"error": "Upload failed", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """Download a file with proper security checks"""
        try:
            file_manager = FileManager(request.user)
            return file_manager.download_file(pk, request.user)
        except Http404:
            return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response(
                {"error": "Download failed", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        """Preview a file in the browser"""
        try:
            file_manager = FileManager(request.user)
            return file_manager.preview_file(pk, request.user)
        except Http404:
            return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": "Preview failed", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["delete"])
    def delete_file(self, request, pk=None):
        """Delete a file with proper security checks"""
        try:
            file_manager = FileManager(request.user)
            result = file_manager.delete_file(pk, request.user)

            if result["success"]:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"error": "Delete failed", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"])
    def list_files(self, request):
        """List user's files with filtering options"""
        try:
            file_type = request.query_params.get("file_type")
            is_public = request.query_params.get("is_public")

            # Convert is_public string to boolean
            is_public_bool = None
            if is_public is not None:
                is_public_bool = is_public.lower() == "true"

            file_manager = FileManager(request.user)
            files = file_manager.list_user_files(user=request.user, file_type=file_type, is_public=is_public_bool)

            return Response({"files": files, "total_count": len(files)})

        except Exception as e:
            return Response(
                {"error": "Failed to list files", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"])
    def file_types(self, request):
        """Get available file types and their constraints"""
        file_manager = FileManager(request.user)

        file_types_info = {}
        for file_type, mime_types in file_manager.ALLOWED_FILE_TYPES.items():
            file_types_info[file_type] = {
                "allowed_mime_types": mime_types,
                "max_size_mb": round(file_manager.MAX_FILE_SIZES[file_type] / (1024 * 1024), 2),
                "supports_preview": (
                    any(FileManager()._supports_preview(mime) for mime in mime_types) if mime_types else False
                ),
            }

        return Response(file_types_info)

    def destroy(self, request, pk=None):
        """Override destroy to use FileManager"""
        try:
            file_manager = FileManager(request.user)
            result = file_manager.delete_file(pk, request.user)

            if result["success"]:
                return Response(status=status.HTTP_204_NO_CONTENT)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"error": "Delete failed", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AuditLogListView(generics.ListAPIView):
    """List audit logs with filtering"""

    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = AuditLog.objects.all()

        # Filter by user
        user_id = self.request.query_params.get("user_id")
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Filter by action
        action = self.request.query_params.get("action")
        if action:
            queryset = queryset.filter(action=action)

        # Filter by model
        model_name = self.request.query_params.get("model_name")
        if model_name:
            queryset = queryset.filter(model_name__icontains=model_name)

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(timestamp__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__date__lte=end_date)

        return queryset.order_by("-timestamp")


class HealthCheckView(generics.GenericAPIView):
    """Health check endpoint"""

    permission_classes = []  # Public endpoint

    def get(self, request, *args, **kwargs):
        """Return system health status"""
        from django.db import connection
        from django.core.cache import cache

        # Check database connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_status = "healthy"
        except Exception as e:
            db_status = f"unhealthy: {str(e)}"

        # Check cache
        try:
            cache.set("health_check", "ok", 10)
            cache_status = "healthy" if cache.get("health_check") == "ok" else "unhealthy"
        except Exception as e:
            cache_status = f"unhealthy: {str(e)}"

        return Response(
            {
                "status": "healthy" if db_status == "healthy" and cache_status == "healthy" else "unhealthy",
                "database": db_status,
                "cache": cache_status,
                "timestamp": timezone.now().isoformat(),
            }
        )


class FileCleanupView(generics.GenericAPIView):
    """File cleanup and maintenance for administrators"""

    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        """Clean up old files"""
        try:
            days_old = int(request.data.get("days_old", 30))

            if days_old < 1:
                return Response({"error": "days_old must be at least 1"}, status=status.HTTP_400_BAD_REQUEST)

            file_manager = FileManager(request.user)
            result = file_manager.cleanup_old_files(days_old)

            if result["success"]:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except ValueError:
            return Response({"error": "Invalid days_old value"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": "Cleanup failed", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get(self, request, *args, **kwargs):
        """Get cleanup statistics"""
        try:
            from django.db.models import Sum, Count
            from datetime import timedelta

            # Get file statistics
            total_files = FileUpload.objects.count()
            total_size = FileUpload.objects.aggregate(total_size=Sum("file_size"))["total_size"] or 0

            # Get old files count
            cutoff_date = timezone.now() - timedelta(days=30)
            old_files_count = FileUpload.objects.filter(created_at__lt=cutoff_date).count()

            old_files_size = (
                FileUpload.objects.filter(created_at__lt=cutoff_date).aggregate(total_size=Sum("file_size"))[
                    "total_size"
                ]
                or 0
            )

            return Response(
                {
                    "total_files": total_files,
                    "total_size_mb": round(total_size / (1024 * 1024), 2),
                    "old_files_count": old_files_count,
                    "old_files_size_mb": round(old_files_size / (1024 * 1024), 2),
                    "cutoff_date": cutoff_date.isoformat(),
                }
            )

        except Exception as e:
            return Response(
                {"error": "Failed to get statistics", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
