import React from 'react';
import { CheckCircle, X, PlusSquare, DollarSign } from 'lucide-react';

const SuccessModal = ({ isOpen, onClose, title, message, features = [] }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">{message}</p>
          
          {features.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 flex items-center">
                ✨ You can now:
              </h3>
              <div className="space-y-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                      {feature.icon}
                    </div>
                    <span className="text-gray-700">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
};

// Pre-configured success modal for becoming a creator
export const CreatorSuccessModal = ({ isOpen, onClose }) => {
  const creatorFeatures = [
    {
      icon: <PlusSquare size={16} className="text-blue-500" />,
      text: "Create posts and share content"
    },
    {
      icon: <DollarSign size={16} className="text-green-500" />,
      text: "Access earnings page and monetize content"
    },
    {
      icon: <CheckCircle size={16} className="text-purple-500" />,
      text: "Start earning money from your followers"
    }
  ];

  return (
    <SuccessModal
      isOpen={isOpen}
      onClose={onClose}
      title="Welcome to Creators!"
      message="Congratulations! You are now a creator and can start earning money from your content."
      features={creatorFeatures}
    />
  );
};

export default SuccessModal;