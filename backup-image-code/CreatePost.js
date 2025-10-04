// src/pages/CreatePost.js
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Upload, DollarSign, Lock, Globe } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

const CreatePost = () => {
  const { contract, uploadMedia, debugStoredImages, testImageUpload } = useWeb3();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    file: null,
    isPaid: false,
    price: '',
    description: ''
  });
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    console.log('🔍 handleFileChange called with file:', file);
    
    if (file) {
      console.log('📁 File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeFormatted: (file.size / 1024 / 1024).toFixed(2) + ' MB'
      });
      
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        console.error('❌ Invalid file type:', file.type);
        toast.error('Please select an image or video file');
        return;
      }
      
      // Validate file size (max 10MB for better handling)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        console.error('❌ File too large:', file.size, 'bytes');
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }
      
      console.log('✅ File validation passed, updating form data');
      setFormData({ ...formData, file });
      
      // Create preview for images only
      if (file.type.startsWith('image/')) {
        console.log('🖼️ Creating image preview...');
        const reader = new FileReader();
        reader.onload = () => {
          console.log('✅ Image preview created successfully');
          setPreview(reader.result);
        };
        reader.onerror = () => {
          console.error('❌ Error reading image file');
          toast.error('Error reading file');
          setPreview(null);
        };
        reader.readAsDataURL(file);
      } else {
        // For videos, create a placeholder preview
        console.log('🎥 Creating video placeholder');
        setPreview('video-placeholder');
      }
      
      toast.success(`File "${file.name}" selected successfully!`);
    } else {
      console.log('⚠️ No file selected');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Simulate file input change event
      const event = { target: { files: [file] } };
      handleFileChange(event);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 handleSubmit called with formData:', formData);
    
    if (!formData.file) {
      console.error('❌ No file in formData');
      toast.warning('Please select or capture an image/video');
      return;
    }
    
    if (formData.isPaid && (!formData.price || parseFloat(formData.price) <= 0)) {
      console.error('❌ Invalid price for paid content');
      toast.warning('Please enter a valid price');
      return;
    }

    try {
      setUploading(true);
      console.log('📤 Starting upload process...');
      console.log('📁 File to upload:', {
        name: formData.file.name,
        type: formData.file.type,
        size: formData.file.size
      });
      
      console.log('🔄 Calling uploadMedia function...');
      const contentHash = await uploadMedia(formData.file);
      console.log('✅ Upload completed! Content hash:', contentHash);
      
      const priceInWei = formData.isPaid ? 
        ethers.parseEther(formData.price) : 
        ethers.parseEther('0');
      
      console.log('⛓️ Creating content on blockchain with hash:', contentHash);
      const tx = await contract.createContent(
        contentHash,
        priceInWei,
        formData.isPaid
      );
      
      console.log('✅ Transaction sent:', tx.hash);
      toast.info('Transaction submitted! Waiting for confirmation...');
      await tx.wait();
      console.log('✅ Transaction confirmed!');
      
      toast.success('🎉 Post created successfully! Your content is now live!');
      
      // Reset form
      setFormData({
        file: null,
        isPaid: false,
        price: '',
        description: ''
      });
      setPreview(null);
      
      console.log('🔄 Triggering feed refresh...');
      window.dispatchEvent(new CustomEvent('refreshFeed'));
      
      // Navigate to home to see the new post
      setTimeout(() => {
        console.log('🏠 Navigating to home page...');
        navigate('/');
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error creating content:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error('Failed to create content: ' + error.message);
    } finally {
      setUploading(false);
      console.log('🏁 Upload process completed');
    }
  };

  const createStory = async () => {
    if (!formData.file) {
      toast.warning('Please select or capture an image/video for your story');
      return;
    }

    try {
      setUploading(true);
      
      console.log('Uploading story...');
      const contentHash = await uploadMedia(formData.file);
      
      console.log('Creating story on blockchain...');
      const tx = await contract.createStory(contentHash);
      await tx.wait();
      
      toast.success('📸 Story created successfully! It will be visible for 24 hours.');
      
      // Clear form
      setFormData({
        file: null,
        isPaid: false,
        price: '',
        description: ''
      });
      setPreview(null);
      
      // Trigger feed refresh
      window.dispatchEvent(new CustomEvent('refreshFeed'));
      
      // Navigate to home to see the story
      setTimeout(() => navigate('/'), 1000);
      
    } catch (error) {
      console.error('Error creating story:', error);
      toast.error('Failed to create story: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Content</h1>
          <p className="text-gray-600 mt-1">Share your creativity with the world</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Upload Media</label>
            
            <div className="flex space-x-4">
              <label className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Click to upload</p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF, MP4 up to 10MB</p>
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {preview && (
              <div className="relative">
                {preview === 'video-placeholder' ? (
                  <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg border border-gray-200 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎥</div>
                      <p className="text-gray-600 font-medium">Video Selected</p>
                      <p className="text-sm text-gray-500">{formData.file?.name}</p>
                    </div>
                  </div>
                ) : (
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="w-full h-64 object-cover rounded-lg border border-gray-200"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setFormData({ ...formData, file: null });
                    toast.info('File removed');
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  ✕
                </button>
                
                {/* File info */}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {formData.file && (
                    <span>{(formData.file.size / 1024 / 1024).toFixed(1)} MB • {formData.file.type}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell your audience about this content..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Content Type</label>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPaid: false, price: '' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  !formData.isPaid 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Globe size={24} className={`mx-auto mb-2 ${!formData.isPaid ? 'text-green-600' : 'text-gray-400'}`} />
                <h3 className={`font-medium ${!formData.isPaid ? 'text-green-800' : 'text-gray-700'}`}>
                  Free Content
                </h3>
                <p className="text-sm text-gray-600 mt-1">Everyone can see this content</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPaid: true })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.isPaid 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Lock size={24} className={`mx-auto mb-2 ${formData.isPaid ? 'text-purple-600' : 'text-gray-400'}`} />
                <h3 className={`font-medium ${formData.isPaid ? 'text-purple-800' : 'text-gray-700'}`}>
                  Premium Content
                </h3>
                <p className="text-sm text-gray-600 mt-1">Users pay to unlock this content</p>
              </button>
            </div>
          </div>

          {formData.isPaid && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price in BNB</label>
              <div className="relative">
                <DollarSign size={20} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.001"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Minimum: 0.001 BNB (~$0.30). Platform fee: 2%
              </p>
            </div>
          )}

          {formData.isPaid && formData.price && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-medium text-purple-800 mb-2">Estimated Earnings</h3>
              <div className="text-sm text-purple-700 space-y-1">
                <div className="flex justify-between">
                  <span>Price per unlock:</span>
                  <span>{formData.price} BNB</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform fee (2%):</span>
                  <span>{(parseFloat(formData.price) * 0.02).toFixed(4)} BNB</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-purple-200 pt-1">
                  <span>You earn per unlock:</span>
                  <span>{(parseFloat(formData.price) * 0.98).toFixed(4)} BNB</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={uploading || !formData.file}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {uploading ? 'Creating...' : 'Create Post'}
            </button>
            
            <button
              type="button"
              onClick={createStory}
              disabled={uploading || !formData.file}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Story
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Content Guidelines</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Content is stored permanently on IPFS</li>
              <li>• Stories disappear after 24 hours</li>
              <li>• Premium content can generate passive income</li>
              <li>• Be respectful and follow community guidelines</li>
            </ul>
            
            {/* Debug section */}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <button
                type="button"
                onClick={() => setDebugMode(!debugMode)}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                {debugMode ? 'Hide' : 'Show'} Debug Tools
              </button>
              
              {debugMode && (
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      debugStoredImages();
                      toast.info('Check console for stored images list');
                    }}
                    className="block w-full text-left text-xs bg-white text-blue-700 px-2 py-1 rounded border hover:bg-blue-50"
                  >
                    📋 List Stored Images (Console)
                  </button>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      toast.info('Testing image upload workflow...');
                      const result = await testImageUpload();
                      if (result.success) {
                        toast.success('✅ Image upload test passed!');
                        console.log('🎉 Test result:', result);
                      } else {
                        toast.error('❌ Image upload test failed');
                        console.error('❌ Test failed:', result.error);
                      }
                    }}
                    className="block w-full text-left text-xs bg-white text-green-700 px-2 py-1 rounded border hover:bg-green-50"
                  >
                    🧠 Test Image Upload Workflow
                  </button>
                  
                  <p className="text-xs text-blue-600 italic">
                    Debug tools help identify image upload issues
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;