// src/components/ShareButton.js
import React, { useState } from 'react';
import { Share } from 'lucide-react';
import ShareModal from './ShareModal';

const ShareButton = ({ 
  contentId, 
  contentAuthor, 
  contentDescription = "",
  className = "", 
  size = 20,
  showLabel = false 
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-all duration-200 text-gray-600 hover:text-green-500 hover:bg-green-50 ${className}`}
        title="Share content"
      >
        <Share size={size} />
        {showLabel && <span className="text-sm font-medium">Share</span>}
      </button>

      {/* Share Modal */}
      <ShareModal
        isOpen={showModal}
        onClose={handleCloseModal}
        contentId={contentId}
        contentAuthor={contentAuthor}
        contentDescription={contentDescription}
      />
    </>
  );
};

export default ShareButton;