# File Upload and Management System

This document describes the comprehensive file upload and management system implemented in the TruckLog application, including secure file storage, permissions, preview capabilities, and responsive UI components.

## Overview

The file management system provides enterprise-grade file handling capabilities with:

- **Secure File Upload**: Multi-format file uploads with validation and security checks
- **File Permissions**: User-based access control and public/private file management
- **File Preview**: Browser-based preview for supported file types
- **File Management**: Complete CRUD operations with bulk actions
- **Archive & Cleanup**: Automated cleanup of old files with admin controls
- **Responsive UI**: Modern, mobile-friendly file management interface

## Architecture

### Backend Components

#### 1. FileManager (`core_utils/file_manager.py`)
Core service for file operations with security and validation:

```python
class FileManager:
    """Comprehensive file management service with security and permissions"""
    
    # File type constraints
    ALLOWED_FILE_TYPES = {
        'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        'document': ['application/pdf', 'application/msword', 'text/plain', 'text/csv'],
        'log_export': ['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'archive': ['application/zip', 'application/x-rar-compressed'],
        'other': []  # All types allowed
    }
    
    # Maximum file sizes (in bytes)
    MAX_FILE_SIZES = {
        'image': 10 * 1024 * 1024,      # 10MB
        'document': 50 * 1024 * 1024,   # 50MB
        'log_export': 100 * 1024 * 1024, # 100MB
        'archive': 200 * 1024 * 1024,    # 200MB
        'other': 25 * 1024 * 1024,      # 25MB
    }
```

**Key Methods:**
- `upload_file()`: Secure file upload with validation
- `download_file()`: Secure file download with permission checks
- `preview_file()`: Browser preview for supported file types
- `delete_file()`: Safe file deletion with audit logging
- `list_user_files()`: List files with filtering options
- `cleanup_old_files()`: Automated cleanup of old files

#### 2. FilePermissionManager (`core_utils/file_manager.py`)
Manages file access permissions and security:

```python
class FilePermissionManager:
    """Manages file permissions and access control"""
    
    def can_upload(self, file_type: str) -> bool
    def can_download(self, file_upload: FileUpload) -> bool
    def can_delete(self, file_upload: FileUpload) -> bool
    def can_preview(self, file_upload: FileUpload) -> bool
```

#### 3. Enhanced Views (`core_utils/views.py`)
REST API endpoints for file operations:

- **FileUploadViewSet**: Complete file management API
- **FileCleanupView**: Administrative cleanup operations

### Frontend Components

#### 1. FileManager (`components/FileManager.tsx`)
Main file management interface with full CRUD operations:

**Features:**
- File listing with search and filtering
- Bulk operations (select all, bulk delete)
- Upload modal with drag-and-drop
- File type filtering and status indicators
- Responsive design for mobile and desktop

**Key Props:**
```typescript
interface FileManagerProps {
  className?: string;
}
```

#### 2. FileUpload (`components/FileUpload.tsx`)
Reusable file upload component with drag-and-drop:

**Features:**
- Drag-and-drop file upload
- File validation and error handling
- Upload progress indication
- Multiple file support
- Customizable file type restrictions

**Key Props:**
```typescript
interface FileUploadProps {
  onUploadSuccess?: (file: any) => void;
  onUploadError?: (error: string) => void;
  fileType?: string;
  maxSize?: number; // in MB
  allowedTypes?: string[];
  className?: string;
  multiple?: boolean;
  disabled?: boolean;
}
```

#### 3. FilePreview (`components/FilePreview.tsx`)
File preview modal with zoom and rotation controls:

**Features:**
- Image preview with zoom and rotation
- PDF preview in iframe
- Text file preview
- Download functionality
- Fullscreen mode
- Responsive design

**Key Props:**
```typescript
interface FilePreviewProps {
  fileId: number;
  filename: string;
  mimeType: string;
  onClose: () => void;
  className?: string;
}
```

#### 4. FileCleanup (`components/FileCleanup.tsx`)
Administrative file cleanup interface:

**Features:**
- File statistics display
- Configurable cleanup parameters
- Cleanup progress tracking
- Storage space monitoring
- Admin-only access controls

## API Endpoints

### File Management

#### Upload File
```
POST /api/core-utils/file-uploads/upload/
Content-Type: multipart/form-data

Parameters:
- file: File to upload
- file_type: Type of file (image, document, log_export, archive, other)
- description: Optional description
- is_public: Boolean for public/private access
```

#### List Files
```
GET /api/core-utils/file-uploads/list_files/
Query Parameters:
- file_type: Filter by file type
- is_public: Filter by public/private status
```

#### Download File
```
GET /api/core-utils/file-uploads/{id}/download/
Headers:
- Authorization: Bearer <token>
```

#### Preview File
```
GET /api/core-utils/file-uploads/{id}/preview/
Headers:
- Authorization: Bearer <token>
```

#### Delete File
```
DELETE /api/core-utils/file-uploads/{id}/delete_file/
Headers:
- Authorization: Bearer <token>
```

#### Get File Types
```
GET /api/core-utils/file-uploads/file_types/
Returns: Available file types and their constraints
```

### File Cleanup (Admin Only)

#### Get Cleanup Statistics
```
GET /api/core-utils/file-cleanup/
Returns: File statistics and cleanup information
```

#### Perform Cleanup
```
POST /api/core-utils/file-cleanup/
Body: { "days_old": 30 }
```

## Security Features

### File Upload Security

1. **File Type Validation**: Strict MIME type checking
2. **File Size Limits**: Configurable size limits per file type
3. **Secure Filenames**: UUID-based filenames to prevent path traversal
4. **Virus Scanning**: Integration-ready for antivirus scanning
5. **Content Validation**: File content verification

### Access Control

1. **User-Based Permissions**: Users can only access their own files
2. **Public/Private Files**: Configurable file visibility
3. **Admin Override**: Staff can access all files
4. **Audit Logging**: Complete audit trail for all operations

### Storage Security

1. **Secure File Paths**: Organized directory structure
2. **File Integrity**: SHA-256 hash verification
3. **Backup Support**: Integration-ready for backup systems
4. **Encryption Ready**: Support for file encryption

## File Types and Constraints

### Supported File Types

| Type | MIME Types | Max Size | Preview Support |
|------|------------|----------|-----------------|
| Image | image/jpeg, image/png, image/gif, image/webp, image/svg+xml | 10MB | ✅ |
| Document | application/pdf, application/msword, text/plain, text/csv | 50MB | ✅ (PDF, Text) |
| Log Export | application/pdf, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 100MB | ✅ (PDF, CSV) |
| Archive | application/zip, application/x-rar-compressed | 200MB | ❌ |
| Other | All types | 25MB | ✅ (Text) |

### File Validation

```python
def validate_file_type(uploaded_file: UploadedFile, file_type: str) -> None:
    """Validate file type and MIME type"""
    if file_type not in ALLOWED_FILE_TYPES:
        raise ValidationError(f"Invalid file type: {file_type}")
    
    allowed_mimes = ALLOWED_FILE_TYPES[file_type]
    if allowed_mimes and uploaded_file.content_type not in allowed_mimes:
        raise ValidationError(f"File type {uploaded_file.content_type} not allowed")

def validate_file_size(uploaded_file: UploadedFile, file_type: str) -> None:
    """Validate file size"""
    max_size = MAX_FILE_SIZES.get(file_type, MAX_FILE_SIZES['other'])
    if uploaded_file.size > max_size:
        max_size_mb = round(max_size / (1024 * 1024), 2)
        raise ValidationError(f"File size exceeds maximum allowed size of {max_size_mb}MB")
```

## Usage Examples

### Basic File Upload

```typescript
import { FileUpload } from './components/FileUpload';

function MyComponent() {
  const handleUploadSuccess = (file: any) => {
    console.log('File uploaded:', file);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload failed:', error);
  };

  return (
    <FileUpload
      fileType="document"
      maxSize={50}
      allowedTypes={['application/pdf', 'text/plain']}
      onUploadSuccess={handleUploadSuccess}
      onUploadError={handleUploadError}
    />
  );
}
```

### File Management Interface

```typescript
import { FileManager } from './components/FileManager';

function FileManagementPage() {
  return (
    <div className="container mx-auto p-6">
      <FileManager className="max-w-6xl" />
    </div>
  );
}
```

### File Preview

```typescript
import { FilePreview } from './components/FilePreview';

function FilePreviewModal({ file, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <FilePreview
      fileId={file.id}
      filename={file.original_filename}
      mimeType={file.mime_type}
      onClose={onClose}
    />
  );
}
```

### Administrative Cleanup

```typescript
import { FileCleanup } from './components/FileCleanup';

function AdminPanel() {
  return (
    <div className="admin-panel">
      <FileCleanup className="mb-6" />
    </div>
  );
}
```

## Database Schema

### FileUpload Model

```python
class FileUpload(models.Model):
    FILE_TYPES = [
        ('log_export', 'Log Export'),
        ('document', 'Document'),
        ('image', 'Image'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    file_type = models.CharField(max_length=20, choices=FILE_TYPES)
    original_filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.PositiveIntegerField()
    mime_type = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def file_size_mb(self):
        return round(self.file_size / (1024 * 1024), 2)
```

## Performance Considerations

### File Storage Optimization

1. **Chunked Uploads**: Support for large file chunked uploads
2. **CDN Integration**: Ready for CDN integration
3. **Compression**: Automatic file compression for supported types
4. **Caching**: Browser caching for static files

### Database Optimization

1. **Indexing**: Optimized database indexes for file queries
2. **Pagination**: Efficient pagination for large file lists
3. **Lazy Loading**: Lazy loading of file metadata
4. **Cleanup Jobs**: Automated cleanup of orphaned files

### Memory Management

1. **Streaming**: Stream-based file operations
2. **Memory Limits**: Configurable memory usage limits
3. **Garbage Collection**: Automatic cleanup of temporary files
4. **Resource Monitoring**: File system resource monitoring

## Error Handling

### Upload Errors

```typescript
// File size exceeded
{
  "success": false,
  "error": "File size exceeds maximum allowed size of 50MB"
}

// Invalid file type
{
  "success": false,
  "error": "File type application/octet-stream not allowed for document"
}

// Upload failed
{
  "success": false,
  "error": "Upload failed",
  "details": "Network error"
}
```

### Permission Errors

```typescript
// Permission denied
{
  "error": "Permission denied"
}

// File not found
{
  "error": "File not found"
}
```

## Testing

### Unit Tests

```python
# Backend tests
def test_file_upload_validation():
    file_manager = FileManager(user)
    result = file_manager.upload_file(uploaded_file, 'image')
    assert result['success'] == True

def test_file_permissions():
    permission_manager = FilePermissionManager(user)
    assert permission_manager.can_download(file_upload) == True
```

### Frontend Tests

```typescript
// Frontend tests
test('FileUpload component renders correctly', () => {
  render(<FileUpload fileType="image" />);
  expect(screen.getByText('Upload files')).toBeInTheDocument();
});

test('FileManager displays files correctly', () => {
  const mockFiles = [/* mock file data */];
  render(<FileManager />);
  // Test file display logic
});
```

## Deployment

### Environment Configuration

```python
# settings.py
FILE_UPLOAD_MAX_MEMORY_SIZE = 2621440  # 2.5MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 2621440  # 2.5MB
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755

# File storage settings
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM python:3.9-slim

# Install file handling dependencies
RUN apt-get update && apt-get install -y \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy application
COPY . /app
WORKDIR /app

# Install Python dependencies
RUN pip install -r requirements.txt

# Create media directory
RUN mkdir -p /app/media/uploads
RUN chmod 755 /app/media/uploads
```

### Nginx Configuration

```nginx
# nginx.conf
server {
    listen 80;
    server_name example.com;
    
    # File upload size limit
    client_max_body_size 200M;
    
    # Static files
    location /media/ {
        alias /app/media/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Application
    location / {
        proxy_pass http://django:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring and Maintenance

### File System Monitoring

1. **Disk Usage**: Monitor disk usage and set alerts
2. **File Count**: Track total file count and growth rate
3. **Access Patterns**: Monitor file access patterns
4. **Error Rates**: Track upload/download error rates

### Automated Maintenance

1. **Cleanup Jobs**: Scheduled cleanup of old files
2. **Backup Jobs**: Automated file backups
3. **Health Checks**: File system health monitoring
4. **Performance Monitoring**: Upload/download performance tracking

### Logging

```python
# File operation logging
logger.info(f"File uploaded: {filename} by user {user.id}")
logger.warning(f"File upload failed: {error} for user {user.id}")
logger.error(f"File access denied: {file_id} for user {user.id}")
```

## Troubleshooting

### Common Issues

#### Upload Failures
- **File Size**: Check file size limits
- **File Type**: Verify allowed file types
- **Permissions**: Check file system permissions
- **Disk Space**: Ensure sufficient disk space

#### Download Issues
- **File Not Found**: Check file existence in storage
- **Permission Denied**: Verify user permissions
- **Network Issues**: Check network connectivity
- **Browser Issues**: Clear browser cache

#### Preview Problems
- **Unsupported Format**: Check file type support
- **Browser Compatibility**: Verify browser support
- **File Corruption**: Check file integrity
- **CORS Issues**: Verify CORS configuration

### Debug Mode

```python
# Enable debug logging
LOGGING = {
    'loggers': {
        'core_utils.file_manager': {
            'level': 'DEBUG',
            'handlers': ['console'],
        },
    },
}
```

## Future Enhancements

### Planned Features

1. **File Versioning**: Version control for uploaded files
2. **Advanced Search**: Full-text search within files
3. **File Sharing**: Secure file sharing with expiration
4. **Cloud Storage**: Integration with cloud storage providers
5. **File Encryption**: Client-side file encryption
6. **Batch Operations**: Advanced batch processing
7. **File Analytics**: Usage analytics and reporting
8. **API Rate Limiting**: Advanced rate limiting for file operations

### Scalability Improvements

1. **Microservices**: Decompose into microservices
2. **Load Balancing**: File operation load balancing
3. **Caching Layer**: Redis-based file metadata caching
4. **Queue System**: Background file processing
5. **CDN Integration**: Global content delivery
6. **Database Sharding**: File metadata sharding

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

### Documentation
- **API Documentation**: Complete API reference
- **User Guide**: End-user documentation
- **Developer Guide**: Technical implementation guide
- **Troubleshooting Guide**: Common issues and solutions
