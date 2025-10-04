import React, { useState, useRef } from 'react';
import { Upload, X, ImageIcon, Video } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';

const ImageUpload = ({
  onImageSelect,
  onImageRemove,
  accept = "image/*,video/*",
  maxSize = 10 * 1024 * 1024, // 10MB default
  className = "",
  showPreview = true,
  placeholder = "Click to upload or drag and drop"
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { uploadMedia } = useWeb3();
  const { toast } = useToast();

  const validateFile = (file) => {
    console.log('🔍 Validating file:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    });

    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const acceptsImages = accept.includes('image/*');
    const acceptsVideos = accept.includes('video/*');

    if (!((isImage && acceptsImages) || (isVideo && acceptsVideos))) {
      const allowedTypes = [];
      if (acceptsImages) allowedTypes.push('images');
      if (acceptsVideos) allowedTypes.push('videos');
      throw new Error(`Please select ${allowedTypes.join(' or ')} only`);
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
      throw new Error(`File too large. Maximum size is ${maxSizeMB}MB`);
    }

    return { isImage, isVideo };
  };

  const processFile = async (file) => {
    try {
      setUploading(true);
      const { isImage, isVideo } = validateFile(file);

      console.log('📁 Processing file:', file.name);

      // Store the file and create preview
      setSelectedFile(file);

      if (isImage) {
        // Create image preview using FileReader
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log('✅ Image preview created');
          setPreview(e.target.result);
        };
        reader.onerror = () => {
          console.error('❌ Error creating preview');
          toast.error('Error reading image file');
        };
        reader.readAsDataURL(file);
      } else if (isVideo) {
        // Create video thumbnail or placeholder
        console.log('🎥 Video file selected');
        setPreview('video-placeholder');
      }

      // Upload to storage and get fileId
      console.log('📤 Uploading to storage...');
      const fileId = await uploadMedia(file);
      console.log('✅ File uploaded with ID:', fileId);

      // Notify parent component
      if (onImageSelect) {
        onImageSelect({
          file,
          fileId,
          preview: isImage ? null : 'video-placeholder', // Preview will be set by FileReader for images
          isVideo
        });
      }

      toast.success(`${isImage ? 'Image' : 'Video'} uploaded successfully!`);

    } catch (error) {
      console.error('❌ File processing error:', error);
      toast.error(error.message || 'Failed to process file');
      clearSelection();
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onImageRemove) {
      onImageRemove();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = () => {
    if (selectedFile?.type.startsWith('video/')) {
      return <Video size={24} className="text-purple-500" />;
    } else if (selectedFile?.type.startsWith('image/')) {
      return <ImageIcon size={24} className="text-blue-500" />;
    }
    return <Upload size={24} className="text-gray-400" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : selectedFile
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-3">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <div>
              <p className="text-sm font-medium text-blue-600">Uploading...</p>
              <p className="text-xs text-gray-500">Processing your file</p>
            </div>
          </div>
        ) : selectedFile ? (
          <div className="space-y-3">
            {getFileIcon()}
            <div>
              <p className="text-sm font-medium text-green-700">File Selected</p>
              <p className="text-xs text-gray-600">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearSelection();
              }}
              className="inline-flex items-center space-x-1 text-xs text-red-600 hover:text-red-700 transition-colors"
            >
              <X size={14} />
              <span>Remove</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload size={32} className="mx-auto text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">{placeholder}</p>
              <p className="text-xs text-gray-500">
                {accept.includes('image/*') && accept.includes('video/*')
                  ? 'Images and videos up to ' + (maxSize / 1024 / 1024).toFixed(0) + 'MB'
                  : accept.includes('image/*')
                  ? 'Images up to ' + (maxSize / 1024 / 1024).toFixed(0) + 'MB'
                  : 'Videos up to ' + (maxSize / 1024 / 1024).toFixed(0) + 'MB'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {showPreview && preview && selectedFile && (
        <div className="relative">
          <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
          {preview === 'video-placeholder' ? (
            <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg border-2 border-dashed border-purple-300 flex items-center justify-center">
              <div className="text-center">
                <Video size={48} className="mx-auto text-purple-500 mb-2" />
                <p className="text-purple-700 font-medium">Video File</p>
                <p className="text-sm text-purple-600">{selectedFile.name}</p>
              </div>
            </div>
          ) : (
            <img
              src={preview}
              alt="Upload preview"
              className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50"
            />
          )}
        </div>
      )}

      {/* File Info */}
      {selectedFile && (
        <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">File name:</span>
            <span className="font-medium text-gray-900">{selectedFile.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">File size:</span>
            <span className="font-medium text-gray-900">{formatFileSize(selectedFile.size)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">File type:</span>
            <span className="font-medium text-gray-900">{selectedFile.type}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;