import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  Eye,
  Trash2,
  File,
  Image,
  FileText,
  Archive,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FileItem {
  id: number;
  original_filename: string;
  file_type: string;
  file_size: number;
  file_size_mb: number;
  mime_type: string;
  description: string;
  is_public: boolean;
  created_at: string;
  file_url: string;
  supports_preview: boolean;
}

interface FileTypeInfo {
  allowed_mime_types: string[];
  max_size_mb: number;
  supports_preview: boolean;
}

interface FileManagerProps {
  className?: string;
}

const FileManager: React.FC<FileManagerProps> = ({ className = '' }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileTypes, setFileTypes] = useState<Record<string, FileTypeInfo>>({});
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterPublic, setFilterPublic] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFormRef = useRef<HTMLFormElement>(null);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/core-utils/file-uploads/list_files/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else {
        toast.error('Failed to fetch files');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to fetch files');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFileTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/core-utils/file-uploads/file_types/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFileTypes(data.file_types || {});
      }
    } catch (error) {
      console.error('Error fetching file types:', error);
    }
  }, []);

  // Fetch files on component mount
  useEffect(() => {
    fetchFiles();
    fetchFileTypes();
  }, [fetchFiles, fetchFileTypes]);

  // Filter files based on search and filters
  useEffect(() => {
    let filtered = files;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(file =>
        file.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filterType) {
      filtered = filtered.filter(file => file.file_type === filterType);
    }

    // Public filter
    if (filterPublic) {
      const isPublic = filterPublic === 'true';
      filtered = filtered.filter(file => file.is_public === isPublic);
    }

    setFilteredFiles(filtered);
  }, [files, searchTerm, filterType, filterPublic]);

  const handleFileUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get('file') as File;
    
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('file_type', formData.get('file_type') as string);
      uploadFormData.append('description', formData.get('description') as string);
      uploadFormData.append('is_public', formData.get('is_public') as string);

      const response = await fetch('/api/core-utils/file-uploads/upload/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: uploadFormData,
      });

      if (response.ok) {
        await response.json();
        toast.success(`File "${file.name}" uploaded successfully`);
        setShowUploadModal(false);
        fetchFiles();
        if (uploadFormRef.current) {
          uploadFormRef.current.reset();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (fileId: number, filename: string) => {
    try {
      const response = await fetch(`/api/core-utils/file-uploads/${fileId}/download/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('File downloaded successfully');
      } else {
        toast.error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed');
    }
  };

  const handlePreview = (fileId: number) => {
    const previewUrl = `/api/core-utils/file-uploads/${fileId}/preview/`;
    window.open(previewUrl, '_blank');
  };

  const handleDelete = async (fileId: number, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/core-utils/file-uploads/${fileId}/delete_file/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        toast.success(`File "${filename}" deleted successfully`);
        fetchFiles();
      } else {
        toast.error('Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Delete failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) {
      toast.error('No files selected');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedFiles.size} files?`)) {
      return;
    }

    const deletePromises = Array.from(selectedFiles).map(fileId => {
      return fetch(`/api/core-utils/file-uploads/${fileId}/delete_file/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
    });

    try {
      const responses = await Promise.all(deletePromises);
      const successCount = responses.filter(response => response.ok).length;
      
      if (successCount > 0) {
        toast.success(`${successCount} files deleted successfully`);
        setSelectedFiles(new Set());
        fetchFiles();
      } else {
        toast.error('Delete failed');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Bulk delete failed');
    }
  };

  const toggleFileSelection = (fileId: number) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const selectAllFiles = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(file => file.id)));
    }
  };

  const getFileIcon = (fileType: string, mimeType: string) => {
    if (fileType === 'image' || mimeType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (fileType === 'document' || mimeType.includes('pdf') || mimeType.includes('document')) {
      return <FileText className="h-5 w-5 text-green-500" />;
    } else if (fileType === 'archive' || mimeType.includes('zip') || mimeType.includes('rar')) {
      return <Archive className="h-5 w-5 text-purple-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">File Manager</h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload, manage, and organize your files
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchFiles()}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Upload File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                title="Search files"
                aria-label="Search files"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              title="Filter by file type"
              aria-label="Filter by file type"
            >
              <option value="">All Types</option>
              {Object.keys(fileTypes).map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={filterPublic}
              onChange={(e) => setFilterPublic(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              title="Filter by visibility"
              aria-label="Filter by visibility"
            >
              <option value="">All Files</option>
              <option value="true">Public</option>
              <option value="false">Private</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedFiles.size > 0 && (
        <div className="p-4 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkDelete}
                className="flex items-center space-x-2 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files List */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading files...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <File className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterType || filterPublic
                ? 'Try adjusting your search or filters'
                : 'Upload your first file to get started'
              }
            </p>
            {!searchTerm && !filterType && !filterPublic && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Upload File</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table Header */}
            <div className="flex items-center space-x-4 py-2 border-b border-gray-200">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                  onChange={selectAllFiles}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  title="Select all files"
                  aria-label="Select all files"
                />
              </div>
              <div className="flex-1 font-medium text-gray-900">Name</div>
              <div className="w-24 font-medium text-gray-900">Type</div>
              <div className="w-20 font-medium text-gray-900">Size</div>
              <div className="w-32 font-medium text-gray-900">Date</div>
              <div className="w-20 font-medium text-gray-900">Status</div>
              <div className="w-24 font-medium text-gray-900">Actions</div>
            </div>

            {/* File Items */}
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center space-x-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    title={`Select ${file.original_filename}`}
                    aria-label={`Select ${file.original_filename}`}
                  />
                </div>
                <div className="flex items-center flex-1 min-w-0">
                  {getFileIcon(file.file_type, file.mime_type)}
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.original_filename}
                    </p>
                    {file.description && (
                      <p className="text-xs text-gray-500 truncate">
                        {file.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="w-24 text-sm text-gray-500">
                  {file.file_type}
                </div>
                <div className="w-20 text-sm text-gray-500">
                  {formatFileSize(file.file_size)}
                </div>
                <div className="w-32 text-sm text-gray-500">
                  {formatDate(file.created_at)}
                </div>
                <div className="w-20">
                  {file.is_public ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Public
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      Private
                    </span>
                  )}
                </div>
                <div className="w-24 flex items-center space-x-1">
                  <button
                    onClick={() => handleDownload(file.id, file.original_filename)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {file.supports_preview && (
                    <button
                      onClick={() => handlePreview(file.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(file.id, file.original_filename)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload File</h3>
              <form ref={uploadFormRef} onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="file"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    title="Select file to upload"
                    aria-label="Select file to upload"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Type
                  </label>
                  <select
                    name="file_type"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    title="File type"
                    aria-label="File type"
                  >
                    <option value="">Select file type</option>
                    {Object.keys(fileTypes).map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional description..."
                    title="File description"
                    aria-label="File description"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_public"
                    value="true"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    title="Make file public"
                    aria-label="Make file public"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Make this file public
                  </label>
                </div>
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;
