// src/pages/CreatePost.js
import React, { useState } from 'react';
import { Upload, DollarSign, Lock, Globe } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import SupabaseService from '../services/supabaseService';
import CompressionIndicator from '../components/CompressionIndicator';

const CreatePost = () => {
  const { account, user, contract } = useWeb3(); // Added contract from context
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
  const [compressionData, setCompressionData] = useState(null);
  const [compressionProfile, setCompressionProfile] = useState('standard');

  // Upload image function (placeholder for IPFS or cloud storage)
  const uploadImage = async (file) => {
    try {
      // Convert to base64 for now - you can replace this with actual IPFS upload
      const base64Data = await compressImage(file, 0.7);
      
      // For production, upload to IPFS and return the hash
      // const ipfsHash = await ipfsClient.add(file);
      // return `https://ipfs.io/ipfs/${ipfsHash}`;
      
      return base64Data; // Temporary - return base64 for database storage
    } catch (error) {
      throw new Error('Failed to upload image: ' + error.message);
    }
  };

  // Compress image function
  const compressImage = (file, quality = 0.7) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 800px width)
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        resolve(compressedDataUrl);
      };
      
      const reader = new FileReader();
      reader.onload = (e) => img.src = e.target.result;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    console.log('File selected:', file);
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error('Please select an image or video file');
        return;
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }
      
      setFormData({ ...formData, file });
      
      // Set compression data for images
      if (file.type.startsWith('image/')) {
        setCompressionData({
          originalSize: file.size,
          compressedSize: null,
          profile: compressionProfile
        });
      } else {
        setCompressionData(null);
      }
      
      // Create preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setPreview('video-placeholder');
      }
      
      toast.success(`File "${file.name}" selected successfully!`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.file) {
      toast.warning('Please select an image/video');
      return;
    }
    
    if (formData.isPaid && (!formData.price || parseFloat(formData.price) <= 0)) {
      toast.warning('Please enter a valid price');
      return;
    }

    try {
      setUploading(true);
      console.log('Starting upload process...');
      
      // Convert file to base64 (compressed for images)
      let base64Data;
      if (formData.file.type.startsWith('image/')) {
        base64Data = await compressImage(formData.file, 0.7);
        
        // Update compression data
        const compressedSize = Math.round((base64Data.length * 3) / 4);
        setCompressionData(prev => ({
          ...prev,
          compressedSize
        }));
      } else {
        // For videos, convert to base64 without compression
        const reader = new FileReader();
        base64Data = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(formData.file);
        });
      }


      // Save to Supabase with exact posts table structure
      const contentHash = `content_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const contentId = Math.floor(Math.random() * 2147483647);

      const postData = {
        content_id: contentId,
        creator_address: account,
        username: user?.username || `User${account.substring(0, 6)}`,
        description: formData.description || '',
        content_hash: contentHash,
        image_url: base64Data, // Image/video data goes in image_url field
        price: formData.isPaid ? parseFloat(formData.price) : 0,
        is_paid: formData.isPaid,
        likes: 0,
        purchase_count: 0
      };

      const result = await SupabaseService.createPost(postData);
      
      if (!result.success) {
        console.error('Supabase error:', result.error);
        throw new Error('Failed to save post: ' + result.error);
      }

      console.log('Post saved to Supabase:', result.data);
      toast.success('✅ Post created successfully! Your content is now live!');
      
      // Reset form
      setFormData({
        file: null,
        isPaid: false,
        price: '',
        description: ''
      });
      setPreview(null);
      setCompressionData(null);
      
      // Navigate to home
      setTimeout(() => {
        navigate('/');
      }, 1000);
      
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Enhanced story creation following the suggested pattern
  const createStoryHandler = async () => {
    if (!formData.file) {
      toast.warning('Please select an image/video for your story');
      return;
    }

    try {
      setUploading(true);
      console.log('Creating story...');
      
      // 1. Upload image/video
      let imageUrl;
      if (formData.file.type.startsWith('image/')) {
        imageUrl = await uploadImage(formData.file); // Using compressed image
      } else {
        // For videos, convert to base64
        const reader = new FileReader();
        imageUrl = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(formData.file);
        });
      }
      
      // 2. Generate content hash for blockchain interaction
      const contentHash = `story_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      // 3. Create story on blockchain (if contract is available)
      if (contract && contract.createStory) {
        try {
          console.log('Creating story on blockchain...');
          const tx = await contract.createStory(contentHash);
          await tx.wait();
          console.log('Story created on blockchain:', tx.hash);
        } catch (blockchainError) {
          console.warn('Blockchain transaction failed, continuing with database only:', blockchainError);
          // Continue with database storage even if blockchain fails
        }
      }
      
      // 4. Calculate expiry time (24 hours from now)
      const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // 5. Save to Supabase with exact table structure
      const storyData = {
        creator_address: account,
        username: user?.username || `User${account.substring(0, 6)}`,
        content: formData.description || '', // Text description
        content_hash: contentHash,
        image_url: imageUrl, // Image/video data goes in image_url field
        expires_at: expiryTime.toISOString()
      };

      console.log('Story data being saved:', {
        creator_address: storyData.creator_address,
        content_length: storyData.content.length,
        image_url_length: storyData.image_url.length,
        expires_at: storyData.expires_at,
        content_hash: storyData.content_hash
      });

      const result = await SupabaseService.createStory(storyData);
      
      if (!result.success) {
        console.error('Supabase story error:', result.error);
        throw new Error('Failed to save story: ' + result.error);
      }

      console.log('Story saved to Supabase:', result.data);
      toast.success('📱 Story created successfully! It will be visible for 24 hours.');
      
      // Reset form
      setFormData({
        file: null,
        isPaid: false,
        price: '',
        description: ''
      });
      setPreview(null);
      setCompressionData(null);
      
      // Trigger refresh
      window.dispatchEvent(new CustomEvent('refreshFeed'));
      
      // Navigate to home
      setTimeout(() => {
        navigate('/');
      }, 1000);
      
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
                    setCompressionData(null);
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

            {/* Compression Indicator */}
            {compressionData && formData.file && formData.file.type.startsWith('image/') && (
              <CompressionIndicator
                originalSize={compressionData.originalSize}
                compressedSize={compressionData.compressedSize}
                compressionProfile={compressionProfile}
                onProfileChange={setCompressionProfile}
                className="mt-4"
              />
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
                Minimum: 0.001 BNB. Platform fee: 2%
              </p>
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
              onClick={createStoryHandler}
              disabled={uploading || !formData.file}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Story
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Enhanced Features</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Content saved to Supabase database</li>
              <li>• Images automatically compressed</li>
              <li>• Stories expire after 24 hours</li>
              <li>• Premium content supports payments</li>
              <li>• Blockchain integration ready</li>
              <li>• IPFS upload capability (when configured)</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;