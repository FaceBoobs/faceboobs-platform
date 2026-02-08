// src/pages/CreatePost.js
import React, { useState } from 'react';
import { Upload, DollarSign, Lock, Globe, ArrowLeft, Sparkles, X, Zap } from 'lucide-react';
import { useSolanaApp } from '../contexts/SolanaAppContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { SupabaseService } from '../services/supabaseService';

const CreatePost = () => {
  const { account, user } = useSolanaApp();
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
  const [showConfetti, setShowConfetti] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // Upload image function
  const uploadImage = async (file) => {
    try {
      const base64Data = await compressImage(file, 0.95);
      return base64Data;
    } catch (error) {
      throw new Error('Failed to upload image: ' + error.message);
    }
  };

  // Compress image function with HIGH QUALITY settings
  const compressImage = (file, quality = 0.95) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const maxWidth = 2400;
        const maxHeight = 2400;
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
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        resolve(compressedDataUrl);
      };

      const reader = new FileReader();
      reader.onload = (e) => img.src = e.target.result;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error('Please select an image or video file');
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }

      setFormData({ ...formData, file });

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

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
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

      let base64Data;
      if (formData.file.type.startsWith('image/')) {
        base64Data = await compressImage(formData.file, 0.95);
      } else {
        const reader = new FileReader();
        base64Data = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(formData.file);
        });
      }

      const contentHash = `content_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const contentId = Math.floor(Math.random() * 2147483647);

      const normalizedAddress = account.toLowerCase();
      console.log('📝 Creating post with Solana address:', normalizedAddress);

      const postData = {
        content_id: contentId,
        creator_address: normalizedAddress,
        username: user?.username || `User${account.substring(0, 6)}`,
        description: formData.description || '',
        content_hash: contentHash,
        image_url: base64Data,
        price: formData.isPaid ? parseFloat(formData.price) : 0,
        is_paid: formData.isPaid,
        likes: 0,
        purchase_count: 0
      };

      console.log('💾 Saving post to Supabase...', postData);
      const result = await SupabaseService.createPost(postData);

      if (!result.success) {
        throw new Error('Failed to save post: ' + result.error);
      }

      console.log('✅ Post saved successfully!', result.data);

      triggerConfetti();
      toast.success('✅ Post created successfully!');

      setFormData({
        file: null,
        isPaid: false,
        price: '',
        description: ''
      });
      setPreview(null);

      window.dispatchEvent(new CustomEvent('refreshFeed'));

      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const createStoryHandler = async () => {
    if (!formData.file) {
      toast.warning('Please select an image/video for your story');
      return;
    }

    try {
      setUploading(true);

      let imageUrl;
      if (formData.file.type.startsWith('image/')) {
        imageUrl = await uploadImage(formData.file);
      } else {
        const reader = new FileReader();
        imageUrl = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(formData.file);
        });
      }

      const contentHash = `story_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const normalizedAddress = account.toLowerCase();
      console.log('📝 Creating story with Solana address:', normalizedAddress);

      const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const storyData = {
        creator_address: normalizedAddress,
        username: user?.username || `User${account.substring(0, 6)}`,
        content: formData.description || '',
        content_hash: contentHash,
        image_url: imageUrl,
        expires_at: expiryTime.toISOString()
      };

      console.log('💾 Saving story to Supabase...', storyData);
      const result = await SupabaseService.createStory(storyData);

      if (!result.success) {
        throw new Error('Failed to save story: ' + result.error);
      }

      triggerConfetti();
      toast.success('📱 Story created successfully!');

      setFormData({
        file: null,
        isPaid: false,
        price: '',
        description: ''
      });
      setPreview(null);

      window.dispatchEvent(new CustomEvent('refreshFeed'));

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
    <>
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10%',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 1}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ['#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6'][
                    Math.floor(Math.random() * 5)
                  ],
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Image Zoom Modal */}
      {imageZoomed && preview && preview !== 'video-placeholder' && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setImageZoomed(false)}
        >
          <img
            src={preview}
            alt="Zoomed preview"
            className="max-w-full max-h-full object-contain rounded-2xl"
          />
          <button
            className="absolute top-4 right-4 bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-200 transition-all"
            onClick={() => setImageZoomed(false)}
          >
            <X size={24} />
          </button>
        </div>
      )}

      {/* Mobile Layout (<768px) */}
      <div className="md:hidden min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-gray-200 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-full transition-all"
            >
              <ArrowLeft size={24} className="text-gray-800" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">Create</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Premium Toggle - Floating Pill */}
        <div className="fixed top-20 right-4 z-20">
          <button
            onClick={() => setFormData({ ...formData, isPaid: !formData.isPaid, price: formData.isPaid ? '' : formData.price })}
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-300 ${
              formData.isPaid
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                : 'bg-white text-gray-800 border border-gray-300'
            }`}
          >
            {formData.isPaid ? <Lock size={16} /> : <Globe size={16} />}
            <span className="text-sm font-semibold">{formData.isPaid ? 'Premium' : 'Free'}</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="pt-20 pb-24 px-4">
          {/* Upload Area */}
          <div className="mt-4">
            <label className="block">
              {!preview ? (
                <div className="min-h-[200px] border-2 border-dashed border-purple-300 rounded-3xl bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all duration-300">
                  <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 rounded-full mb-4">
                    <Upload size={32} className="text-white" />
                  </div>
                  <p className="text-gray-800 font-semibold mb-2">Tap to upload</p>
                  <p className="text-sm font-light text-gray-600">PNG, JPG, GIF, MP4 up to 10MB</p>
                </div>
              ) : (
                <div className="relative">
                  {preview === 'video-placeholder' ? (
                    <div className="min-h-[300px] bg-gradient-to-br from-pink-100 to-purple-100 rounded-3xl flex items-center justify-center shadow-2xl">
                      <div className="text-center">
                        <div className="text-6xl mb-4">🎥</div>
                        <p className="text-lg font-semibold text-gray-800">Video Selected</p>
                        <p className="text-sm font-light text-gray-600 mt-2">{formData.file?.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        setImageZoomed(true);
                      }}
                      className="cursor-zoom-in"
                    >
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full min-h-[300px] object-cover rounded-3xl shadow-2xl"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setPreview(null);
                      setFormData({ ...formData, file: null });
                    }}
                    className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                  >
                    <X size={20} />
                  </button>

                  {formData.file && (
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-full">
                      {(formData.file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                  )}
                </div>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Description Button */}
          <button
            onClick={() => setShowBottomSheet(!showBottomSheet)}
            className="w-full mt-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl px-4 py-3 text-left hover:bg-white transition-all duration-300 shadow-lg"
          >
            <p className="text-sm font-semibold text-gray-800 mb-1">Description</p>
            <p className="text-sm font-light text-gray-600 truncate">
              {formData.description || 'Add a description...'}
            </p>
          </button>

          {/* Price Input for Premium */}
          {formData.isPaid && (
            <div className="mt-4 animate-fadeIn">
              <div className="bg-white/80 backdrop-blur-sm border border-purple-300 rounded-2xl p-4 shadow-lg">
                <label className="block text-sm font-semibold text-gray-800 mb-2">Price in SOL</label>
                <div className="relative">
                  <DollarSign size={20} className="absolute left-3 top-3 text-purple-600" />
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.0001"
                    className="w-full pl-10 pr-4 py-3 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <p className="text-xs font-light text-gray-600 mt-2">
                  Minimum: 0.0001 SOL • Platform fee: 2%
                </p>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {uploading && (
            <div className="mt-4 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gradient-to-r from-pink-200 to-purple-200 rounded w-3/4"></div>
                <div className="h-4 bg-gradient-to-r from-pink-200 to-purple-200 rounded w-1/2"></div>
                <div className="h-4 bg-gradient-to-r from-pink-200 to-purple-200 rounded w-5/6"></div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 z-10">
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={uploading || !formData.file}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
            >
              {uploading ? 'Creating...' : 'Post'}
            </button>

            <button
              onClick={createStoryHandler}
              disabled={uploading || !formData.file}
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-4 rounded-2xl font-semibold hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
            >
              Story
            </button>
          </div>
        </div>

        {/* Description Bottom Sheet */}
        {showBottomSheet && (
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-all duration-300"
            onClick={() => setShowBottomSheet(false)}
          >
            <div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Description</h3>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell your audience about this content..."
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-light"
              />
              <button
                onClick={() => setShowBottomSheet(false)}
                className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Layout (>768px) */}
      <div className="hidden md:block min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-3 hover:bg-white/50 rounded-full transition-all duration-300"
            >
              <ArrowLeft size={24} className="text-gray-800" />
            </button>
            <div>
              <h1 className="text-3xl font-semibold text-gray-800">Create New Content</h1>
              <p className="font-light text-gray-600 mt-1">Share your creativity with the world</p>
            </div>
          </div>

          {/* Main Card with Glass Morphism */}
          <div className="bg-white/40 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/50 overflow-hidden relative">
            {/* Animated Gradient Border Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                 style={{ padding: '2px', borderRadius: '24px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
            </div>

            <div className="p-8">
              {/* Side-by-Side Layout */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left: Media Preview */}
                <div className="space-y-4">
                  <label className="block">
                    {!preview ? (
                      <div className="min-h-[400px] border-2 border-dashed border-purple-300 rounded-3xl bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 hover:scale-105">
                        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6 rounded-full mb-4">
                          <Upload size={48} className="text-white" />
                        </div>
                        <p className="text-gray-800 font-semibold text-lg mb-2">Click to upload</p>
                        <p className="font-light text-gray-600">PNG, JPG, GIF, MP4 up to 10MB</p>
                      </div>
                    ) : (
                      <div className="relative group">
                        {preview === 'video-placeholder' ? (
                          <div className="min-h-[400px] bg-gradient-to-br from-pink-100 to-purple-100 rounded-3xl flex items-center justify-center shadow-2xl">
                            <div className="text-center">
                              <div className="text-8xl mb-4">🎥</div>
                              <p className="text-xl font-semibold text-gray-800">Video Selected</p>
                              <p className="font-light text-gray-600 mt-2">{formData.file?.name}</p>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => setImageZoomed(true)}
                            className="cursor-zoom-in"
                          >
                            <img
                              src={preview}
                              alt="Preview"
                              className="w-full min-h-[400px] object-cover rounded-3xl shadow-2xl transition-all duration-300 group-hover:scale-105"
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setPreview(null);
                            setFormData({ ...formData, file: null });
                          }}
                          className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-red-600 transition-all duration-300 shadow-lg hover:scale-110"
                        >
                          <X size={24} />
                        </button>

                        {formData.file && (
                          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full">
                            {(formData.file.size / 1024 / 1024).toFixed(1)} MB • {formData.file.type}
                          </div>
                        )}
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Right: Form */}
                <div className="space-y-6">
                  {/* Content Type Toggle */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">Content Type</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isPaid: false, price: '' })}
                        className={`p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                          !formData.isPaid
                            ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 bg-white/50'
                        }`}
                      >
                        <Globe size={28} className={`mx-auto mb-2 ${!formData.isPaid ? 'text-green-600' : 'text-gray-400'}`} />
                        <h3 className={`font-semibold ${!formData.isPaid ? 'text-green-800' : 'text-gray-700'}`}>
                          Free
                        </h3>
                        <p className="text-sm font-light text-gray-600 mt-1">Public content</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isPaid: true })}
                        className={`p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                          formData.isPaid
                            ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-100 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 bg-white/50'
                        }`}
                      >
                        <Lock size={28} className={`mx-auto mb-2 ${formData.isPaid ? 'text-purple-600' : 'text-gray-400'}`} />
                        <h3 className={`font-semibold ${formData.isPaid ? 'text-purple-800' : 'text-gray-700'}`}>
                          Premium
                        </h3>
                        <p className="text-sm font-light text-gray-600 mt-1">Paid access</p>
                      </button>
                    </div>
                  </div>

                  {/* Price Input */}
                  {formData.isPaid && (
                    <div className="animate-fadeIn">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Price in SOL</label>
                      <div className="relative">
                        <DollarSign size={20} className="absolute left-4 top-4 text-purple-600" />
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          placeholder="0.0001"
                          className="w-full pl-12 pr-4 py-3 border-2 border-purple-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-white/50 backdrop-blur-sm"
                        />
                      </div>
                      <p className="text-sm font-light text-gray-600 mt-2">
                        Minimum: 0.0001 SOL • Platform fee: 2%
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Tell your audience about this content..."
                      rows={6}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-light transition-all duration-300 bg-white/50 backdrop-blur-sm"
                    />
                  </div>

                  {/* Loading Skeleton */}
                  {uploading && (
                    <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-200">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gradient-to-r from-pink-200 to-purple-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gradient-to-r from-pink-200 to-purple-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gradient-to-r from-pink-200 to-purple-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleSubmit}
                      disabled={uploading || !formData.file}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        'Creating...'
                      ) : (
                        <>
                          <Sparkles size={20} />
                          Create Post
                        </>
                      )}
                    </button>

                    <button
                      onClick={createStoryHandler}
                      disabled={uploading || !formData.file}
                      className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 flex items-center gap-2"
                    >
                      <Zap size={20} />
                      Story
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default CreatePost;
