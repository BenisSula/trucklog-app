"""
Enhanced File Upload and Management Service
Provides secure file storage, permissions, preview, and cleanup functionality
"""

import os
import uuid
import hashlib
from typing import Dict, Any, List, Optional
from datetime import timedelta
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import UploadedFile
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError, PermissionDenied
from django.http import Http404, FileResponse, HttpResponse
import logging

from .models import FileUpload, AuditLog
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)


class FileManager:
    """
    Comprehensive file management service with security and permissions
    """

    # Allowed file types and their MIME types
    ALLOWED_FILE_TYPES = {
        "image": ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
        "document": [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "text/csv",
            "application/rtf",
        ],
        "log_export": [
            "application/pdf",
            "text/csv",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        "archive": ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed"],
        "other": [],  # Empty means all types allowed
    }

    # Maximum file sizes (in bytes)
    MAX_FILE_SIZES = {
        "image": 10 * 1024 * 1024,  # 10MB
        "document": 50 * 1024 * 1024,  # 50MB
        "log_export": 100 * 1024 * 1024,  # 100MB
        "archive": 200 * 1024 * 1024,  # 200MB
        "other": 25 * 1024 * 1024,  # 25MB
    }

    def __init__(self, user: User):
        self.user = user

    def upload_file(
        self, uploaded_file: UploadedFile, file_type: str, description: str = "", is_public: bool = False
    ) -> Dict[str, Any]:
        """
        Upload a file with security validation and metadata

        Args:
            uploaded_file: The uploaded file object
            file_type: Type of file (image, document, log_export, etc.)
            description: Optional description
            is_public: Whether the file should be publicly accessible

        Returns:
            Dictionary with upload results
        """
        try:
            # Validate file type
            self._validate_file_type(uploaded_file, file_type)

            # Validate file size
            self._validate_file_size(uploaded_file, file_type)

            # Generate secure filename
            secure_filename = self._generate_secure_filename(uploaded_file.name)

            # Create file path
            file_path = self._create_file_path(file_type, secure_filename)

            # Calculate file hash for integrity
            file_hash = self._calculate_file_hash(uploaded_file)

            # Save file to storage
            saved_path = default_storage.save(file_path, uploaded_file)

            # Create database record
            with transaction.atomic():
                file_upload = FileUpload.objects.create(
                    user=self.user,
                    file_type=file_type,
                    original_filename=uploaded_file.name,
                    file_path=saved_path,
                    file_size=uploaded_file.size,
                    mime_type=uploaded_file.content_type,
                    description=description,
                    is_public=is_public,
                )

                # Create audit log
                AuditLog.objects.create(
                    user=self.user,
                    action="create",
                    model_name="FileUpload",
                    object_id=str(file_upload.id),
                    description=f"Uploaded file: {uploaded_file.name}",
                    ip_address=self._get_client_ip(),
                )

            return {
                "success": True,
                "file_id": file_upload.id,
                "filename": uploaded_file.name,
                "file_size": uploaded_file.size,
                "file_size_mb": round(uploaded_file.size / (1024 * 1024), 2),
                "mime_type": uploaded_file.content_type,
                "file_path": saved_path,
                "file_hash": file_hash,
                "uploaded_at": file_upload.created_at.isoformat(),
            }

        except ValidationError as e:
            logger.warning(f"File upload validation error for user {self.user.id}: {str(e)}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"File upload error for user {self.user.id}: {str(e)}")
            return {"success": False, "error": "File upload failed"}

    def get_file(self, file_id: int, user: Optional[User] = None) -> Dict[str, Any]:
        """
        Get file information and content

        Args:
            file_id: ID of the file to retrieve
            user: User requesting the file (for permission check)

        Returns:
            Dictionary with file information
        """
        try:
            file_upload = FileUpload.objects.get(id=file_id)

            # Check permissions
            if not self._check_file_permission(file_upload, user):
                raise PermissionDenied("You don't have permission to access this file")

            # Check if file exists in storage
            if not default_storage.exists(file_upload.file_path):
                raise Http404("File not found in storage")

            return {
                "success": True,
                "file_id": file_upload.id,
                "original_filename": file_upload.original_filename,
                "file_type": file_upload.file_type,
                "file_size": file_upload.file_size,
                "file_size_mb": file_upload.file_size_mb,
                "mime_type": file_upload.mime_type,
                "description": file_upload.description,
                "is_public": file_upload.is_public,
                "created_at": file_upload.created_at.isoformat(),
                "file_url": self._get_file_url(file_upload),
            }

        except FileUpload.DoesNotExist:
            return {"success": False, "error": "File not found"}
        except PermissionDenied as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Error retrieving file {file_id}: {str(e)}")
            return {"success": False, "error": "Failed to retrieve file"}

    def download_file(self, file_id: int, user: Optional[User] = None) -> HttpResponse:
        """
        Download a file with proper headers and security

        Args:
            file_id: ID of the file to download
            user: User requesting the download

        Returns:
            HttpResponse with file content
        """
        try:
            file_upload = FileUpload.objects.get(id=file_id)

            # Check permissions
            if not self._check_file_permission(file_upload, user):
                raise PermissionDenied("You don't have permission to download this file")

            # Check if file exists
            if not default_storage.exists(file_upload.file_path):
                raise Http404("File not found")

            # Get file content
            file_content = default_storage.open(file_upload.file_path, "rb")

            # Create response
            response = FileResponse(
                file_content,
                content_type=file_upload.mime_type,
                as_attachment=True,
                filename=file_upload.original_filename,
            )

            # Set security headers
            response["Content-Disposition"] = f'attachment; filename="{file_upload.original_filename}"'
            response["X-Content-Type-Options"] = "nosniff"
            response["X-Frame-Options"] = "DENY"

            # Create audit log
            AuditLog.objects.create(
                user=user or self.user,
                action="download",
                model_name="FileUpload",
                object_id=str(file_upload.id),
                description=f"Downloaded file: {file_upload.original_filename}",
                ip_address=self._get_client_ip(),
            )

            return response

        except FileUpload.DoesNotExist:
            raise Http404("File not found")
        except PermissionDenied:
            raise PermissionDenied("You don't have permission to download this file")
        except Exception as e:
            logger.error(f"Error downloading file {file_id}: {str(e)}")
            raise Http404("File download failed")

    def preview_file(self, file_id: int, user: Optional[User] = None) -> HttpResponse:
        """
        Preview a file in the browser (for supported file types)

        Args:
            file_id: ID of the file to preview
            user: User requesting the preview

        Returns:
            HttpResponse with file content for preview
        """
        try:
            file_upload = FileUpload.objects.get(id=file_id)

            # Check permissions
            if not self._check_file_permission(file_upload, user):
                raise PermissionDenied("You don't have permission to preview this file")

            # Check if file exists
            if not default_storage.exists(file_upload.file_path):
                raise Http404("File not found")

            # Check if file type supports preview
            if not self._supports_preview(file_upload.mime_type):
                raise ValidationError("File type does not support preview")

            # Get file content
            file_content = default_storage.open(file_upload.file_path, "rb")

            # Create response for preview
            response = HttpResponse(file_content.read(), content_type=file_upload.mime_type)

            # Set security headers
            response["X-Content-Type-Options"] = "nosniff"
            response["X-Frame-Options"] = "SAMEORIGIN"
            response["Content-Disposition"] = f'inline; filename="{file_upload.original_filename}"'

            return response

        except FileUpload.DoesNotExist:
            raise Http404("File not found")
        except PermissionDenied:
            raise PermissionDenied("You don't have permission to preview this file")
        except ValidationError as e:
            raise ValidationError(str(e))
        except Exception as e:
            logger.error(f"Error previewing file {file_id}: {str(e)}")
            raise Http404("File preview failed")

    def delete_file(self, file_id: int, user: Optional[User] = None) -> Dict[str, Any]:
        """
        Delete a file and its database record

        Args:
            file_id: ID of the file to delete
            user: User requesting the deletion

        Returns:
            Dictionary with deletion results
        """
        try:
            file_upload = FileUpload.objects.get(id=file_id)

            # Check permissions
            if not self._check_file_permission(file_upload, user):
                raise PermissionDenied("You don't have permission to delete this file")

            with transaction.atomic():
                # Delete file from storage
                if default_storage.exists(file_upload.file_path):
                    default_storage.delete(file_upload.file_path)

                # Create audit log before deletion
                AuditLog.objects.create(
                    user=user or self.user,
                    action="delete",
                    model_name="FileUpload",
                    object_id=str(file_upload.id),
                    description=f"Deleted file: {file_upload.original_filename}",
                    ip_address=self._get_client_ip(),
                )

                # Delete database record
                file_upload.delete()

            return {
                "success": True,
                "message": "File deleted successfully",
                "deleted_file": file_upload.original_filename,
            }

        except FileUpload.DoesNotExist:
            return {"success": False, "error": "File not found"}
        except PermissionDenied as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Error deleting file {file_id}: {str(e)}")
            return {"success": False, "error": "Failed to delete file"}

    def list_user_files(
        self, user: Optional[User] = None, file_type: Optional[str] = None, is_public: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """
        List files for a user with optional filtering

        Args:
            user: User to list files for (defaults to self.user)
            file_type: Optional file type filter
            is_public: Optional public/private filter

        Returns:
            List of file information dictionaries
        """
        try:
            target_user = user or self.user
            queryset = FileUpload.objects.filter(user=target_user)

            # Apply filters
            if file_type:
                queryset = queryset.filter(file_type=file_type)
            if is_public is not None:
                queryset = queryset.filter(is_public=is_public)

            files = []
            for file_upload in queryset.order_by("-created_at"):
                files.append(
                    {
                        "id": file_upload.id,
                        "original_filename": file_upload.original_filename,
                        "file_type": file_upload.file_type,
                        "file_size": file_upload.file_size,
                        "file_size_mb": file_upload.file_size_mb,
                        "mime_type": file_upload.mime_type,
                        "description": file_upload.description,
                        "is_public": file_upload.is_public,
                        "created_at": file_upload.created_at.isoformat(),
                        "file_url": self._get_file_url(file_upload),
                        "supports_preview": self._supports_preview(file_upload.mime_type),
                    }
                )

            return files

        except Exception as e:
            logger.error(f"Error listing files for user {target_user.id}: {str(e)}")
            return []

    def cleanup_old_files(self, days_old: int = 30) -> Dict[str, Any]:
        """
        Clean up old files based on age

        Args:
            days_old: Number of days after which files should be cleaned up

        Returns:
            Dictionary with cleanup results
        """
        try:
            cutoff_date = timezone.now() - timedelta(days=days_old)
            old_files = FileUpload.objects.filter(created_at__lt=cutoff_date)

            deleted_count = 0
            total_size_freed = 0

            for file_upload in old_files:
                try:
                    # Delete from storage
                    if default_storage.exists(file_upload.file_path):
                        default_storage.delete(file_upload.file_path)
                        total_size_freed += file_upload.file_size

                    # Delete database record
                    file_upload.delete()
                    deleted_count += 1

                except Exception as e:
                    logger.error(f"Error cleaning up file {file_upload.id}: {str(e)}")

            return {
                "success": True,
                "deleted_count": deleted_count,
                "total_size_freed_mb": round(total_size_freed / (1024 * 1024), 2),
                "cutoff_date": cutoff_date.isoformat(),
            }

        except Exception as e:
            logger.error(f"Error during file cleanup: {str(e)}")
            return {"success": False, "error": str(e)}

    def _validate_file_type(self, uploaded_file: UploadedFile, file_type: str) -> None:
        """Validate file type and MIME type"""
        if file_type not in self.ALLOWED_FILE_TYPES:
            raise ValidationError(f"Invalid file type: {file_type}")

        allowed_mimes = self.ALLOWED_FILE_TYPES[file_type]
        if allowed_mimes and uploaded_file.content_type not in allowed_mimes:
            raise ValidationError(f"File type {uploaded_file.content_type} not allowed for {file_type}")

    def _validate_file_size(self, uploaded_file: UploadedFile, file_type: str) -> None:
        """Validate file size"""
        max_size = self.MAX_FILE_SIZES.get(file_type, self.MAX_FILE_SIZES["other"])
        if uploaded_file.size > max_size:
            max_size_mb = round(max_size / (1024 * 1024), 2)
            raise ValidationError(f"File size exceeds maximum allowed size of {max_size_mb}MB")

    def _generate_secure_filename(self, original_filename: str) -> str:
        """Generate a secure filename to prevent path traversal attacks"""
        # Get file extension
        _, ext = os.path.splitext(original_filename)

        # Generate unique filename
        unique_id = str(uuid.uuid4())
        secure_filename = f"{unique_id}{ext}"

        return secure_filename

    def _create_file_path(self, file_type: str, filename: str) -> str:
        """Create a secure file path"""
        # Create directory structure: uploads/file_type/year/month/filename
        now = timezone.now()
        path_parts = ["uploads", file_type, str(now.year), str(now.month).zfill(2), filename]

        return "/".join(path_parts)

    def _calculate_file_hash(self, uploaded_file: UploadedFile) -> str:
        """Calculate SHA-256 hash of the file for integrity checking"""
        uploaded_file.seek(0)  # Reset file pointer
        file_content = uploaded_file.read()
        return hashlib.sha256(file_content).hexdigest()

    def _check_file_permission(self, file_upload: FileUpload, user: Optional[User]) -> bool:
        """Check if user has permission to access the file"""
        if not user:
            return False

        # Owner can always access
        if file_upload.user == user:
            return True

        # Public files can be accessed by anyone
        if file_upload.is_public:
            return True

        # Staff can access all files
        if user.is_staff:
            return True

        return False

    def _supports_preview(self, mime_type: str) -> bool:
        """Check if file type supports browser preview"""
        previewable_types = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/svg+xml",
            "application/pdf",
            "text/plain",
            "text/csv",
        ]
        return mime_type in previewable_types

    def _get_file_url(self, file_upload: FileUpload) -> str:
        """Generate file URL for access"""
        return f"/api/files/{file_upload.id}/"

    def _get_client_ip(self) -> str:
        """Get client IP address for audit logging"""
        # This would typically come from the request object
        return "127.0.0.1"


class FilePermissionManager:
    """
    Manages file permissions and access control
    """

    def __init__(self, user: User):
        self.user = user

    def can_upload(self, file_type: str) -> bool:
        """Check if user can upload files of given type"""
        # All authenticated users can upload
        return True

    def can_download(self, file_upload: FileUpload) -> bool:
        """Check if user can download a specific file"""
        # Owner can always download
        if file_upload.user == self.user:
            return True

        # Public files can be downloaded by anyone
        if file_upload.is_public:
            return True

        # Staff can download all files
        if self.user.is_staff:
            return True

        return False

    def can_delete(self, file_upload: FileUpload) -> bool:
        """Check if user can delete a specific file"""
        # Only owner or staff can delete
        return file_upload.user == self.user or self.user.is_staff

    def can_preview(self, file_upload: FileUpload) -> bool:
        """Check if user can preview a specific file"""
        # Same as download permission
        return self.can_download(file_upload)
