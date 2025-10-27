import React, { useState, useEffect } from 'react';
import { X, Download, Maximize2, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface FilePreviewProps {
  fileId: number;
  filename: string;
  mimeType: string;
  onClose: () => void;
  className?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  fileId,
  filename,
  mimeType,
  onClose,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [fileId]);

  const handleDownload = async () => {
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
      } else {
        setError('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      setError('Download failed');
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-2">⚠️</div>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    const previewUrl = `/api/core-utils/file-uploads/${fileId}/preview/`;

    if (mimeType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full">
          <img
            src={previewUrl}
            alt={filename}
            className="max-w-full max-h-full object-contain"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: 'transform 0.3s ease'
            }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setError('Failed to load image');
              setIsLoading(false);
            }}
          />
        </div>
      );
    }

    if (mimeType === 'application/pdf') {
      return (
        <div className="h-full">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={`PDF preview of ${filename}`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setError('Failed to load PDF');
              setIsLoading(false);
            }}
          />
        </div>
      );
    }

    if (mimeType.startsWith('text/')) {
      return (
        <div className="h-full">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={`Text preview of ${filename}`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setError('Failed to load text file');
              setIsLoading(false);
            }}
          />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">📄</div>
          <p className="text-gray-600">Preview not available for this file type</p>
          <button
            onClick={handleDownload}
            className="mt-2 inline-flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>
      </div>
    );
  };

  const containerClasses = `
    fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50
    ${isFullscreen ? 'p-0' : 'p-4'}
    ${className}
  `;

  const contentClasses = `
    bg-white rounded-lg shadow-xl max-w-6xl max-h-full overflow-hidden
    ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full h-5/6'}
  `;

  return (
    <div className={containerClasses} onClick={onClose}>
      <div className={contentClasses} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {filename}
            </h3>
            <span className="text-sm text-gray-500">
              {mimeType}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Image Controls */}
            {mimeType.startsWith('image/') && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-500 min-w-12 text-center">
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Rotate"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </>
            )}
            
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
