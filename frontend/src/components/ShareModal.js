// src/components/ShareModal.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Link, 
  Copy, 
  Check, 
  Twitter, 
  Facebook,
  MessageCircle,
  Mail,
  Share as ShareIcon
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const ShareModal = ({ isOpen, onClose, contentId, contentAuthor, contentDescription = "" }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const modalRef = useRef(null);
  const linkInputRef = useRef(null);

  // Generate shareable URL for the content
  const shareUrl = `${window.location.origin}/post/${contentId}`;
  const shareText = contentDescription 
    ? `Check out this amazing content by ${contentAuthor}: "${contentDescription}" 🔥` 
    : `Check out this amazing content by ${contentAuthor} on SocialWeb3! 🔥`;

  // Social media sharing URLs
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=SocialWeb3,Web3,Crypto`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    email: `mailto:?subject=${encodeURIComponent(`Amazing content by ${contentAuthor}`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`
  };

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Auto-select link input when modal opens
  useEffect(() => {
    if (isOpen && linkInputRef.current) {
      setTimeout(() => {
        linkInputRef.current?.select();
      }, 100);
    }
  }, [isOpen]);

  // Copy to clipboard function
  const copyToClipboard = async (text, label = 'Link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopiedText(label);
      toast.success(`${label} copied to clipboard!`);
      
      setTimeout(() => {
        setCopied(false);
        setCopiedText('');
      }, 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopied(true);
      setCopiedText(label);
      toast.success(`${label} copied to clipboard!`);
      
      setTimeout(() => {
        setCopied(false);
        setCopiedText('');
      }, 2000);
    }
  };

  // Handle social media sharing
  const handleSocialShare = (platform) => {
    const url = shareLinks[platform];
    if (url) {
      window.open(url, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
      toast.success(`Opening ${platform.charAt(0).toUpperCase() + platform.slice(1)} share dialog`);
    }
  };

  // Share options configuration
  const shareOptions = [
    {
      id: 'twitter',
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-blue-500 hover:bg-blue-600',
      iconColor: 'text-white',
      action: () => handleSocialShare('twitter')
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      iconColor: 'text-white',
      action: () => handleSocialShare('facebook')
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: MessageCircle,
      color: 'bg-blue-400 hover:bg-blue-500',
      iconColor: 'text-white',
      action: () => handleSocialShare('telegram')
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      iconColor: 'text-white',
      action: () => handleSocialShare('whatsapp')
    },
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      color: 'bg-gray-600 hover:bg-gray-700',
      iconColor: 'text-white',
      action: () => handleSocialShare('email')
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ShareIcon className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Share Content</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Copy Link Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Copy Link</h3>
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <input
                  ref={linkInputRef}
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Link className="absolute right-3 top-2.5 text-gray-400" size={16} />
              </div>
              <button
                onClick={() => copyToClipboard(shareUrl, 'Link')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  copied && copiedText === 'Link'
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {copied && copiedText === 'Link' ? (
                  <div className="flex items-center space-x-2">
                    <Check size={16} />
                    <span>Copied!</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Copy size={16} />
                    <span>Copy</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Share Text Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Share Message</h3>
            <div className="relative">
              <textarea
                value={shareText}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
              <button
                onClick={() => copyToClipboard(shareText, 'Message')}
                className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded transition-colors"
                title="Copy message"
              >
                {copied && copiedText === 'Message' ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} className="text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Social Media Options */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Share on Social Media</h3>
            <div className="grid grid-cols-3 gap-3">
              {shareOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={option.action}
                    className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200 ${option.color}`}
                    title={`Share on ${option.name}`}
                  >
                    <Icon size={20} className={option.iconColor} />
                    <span className="text-xs font-medium text-white mt-1">
                      {option.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Share with friends and earn more engagement!
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes modal-appear {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modal-appear {
          animation: modal-appear 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ShareModal;