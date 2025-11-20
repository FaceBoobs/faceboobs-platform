// src/pages/PostDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useLikes } from '../contexts/LikesContext';
import { useComments } from '../contexts/CommentsContext';
import { useToast } from '../contexts/ToastContext';
import { SupabaseService } from '../services/supabaseService';
import PostDetailModal from '../components/PostDetailModal';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, getMediaUrl } = useWeb3();
  const { initializeLikes } = useLikes();
  const { initializeComments } = useComments();
  const { toast } = useToast();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPostDetail, setShowPostDetail] = useState(true);

  useEffect(() => {
    loadPost();
  }, [id, account]);

  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📄 Loading post:', id);

      // Load post from Supabase
      const result = await SupabaseService.getPostById(id);

      if (!result.success || !result.data) {
        setError('Post not found');
        toast.error('Post not found');
        return;
      }

      const postData = result.data;
      console.log('✅ Post loaded:', postData);

      // Initialize likes and comments for this post
      await initializeLikes(id);
      await initializeComments(id);

      setPost(postData);
    } catch (err) {
      console.error('❌ Error loading post:', err);
      setError('Failed to load post');
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate(-1); // Go back to previous page
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-purple-500" />
          <p className="mt-4 text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Post Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The post you are looking for does not exist.'}</p>
          <button
            onClick={handleClose}
            className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <button
            onClick={handleClose}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </button>
        </div>
      </div>

      {/* Post Detail Modal */}
      {showPostDetail && post && (
        <PostDetailModal
          post={post}
          onClose={handleClose}
          getMediaUrl={getMediaUrl}
        />
      )}
    </div>
  );
};

export default PostDetail;
