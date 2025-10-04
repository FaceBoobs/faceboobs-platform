// src/components/Toast.js
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const Toast = ({ toast }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { removeToast } = useToast();

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      removeToast(toast.id);
    }, 300); // Match animation duration
  };

  const getToastStyles = () => {
    const baseStyles = "flex items-center p-4 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 ease-in-out";
    
    let typeStyles = "";
    switch (toast.type) {
      case 'success':
        typeStyles = "bg-green-50 border-green-500 text-green-800";
        break;
      case 'error':
        typeStyles = "bg-red-50 border-red-500 text-red-800";
        break;
      case 'warning':
        typeStyles = "bg-yellow-50 border-yellow-500 text-yellow-800";
        break;
      case 'loading':
        typeStyles = "bg-blue-50 border-blue-500 text-blue-800";
        break;
      default: // info
        typeStyles = "bg-blue-50 border-blue-500 text-blue-800";
    }

    const animationStyles = isLeaving 
      ? "opacity-0 translate-x-full scale-95" 
      : isVisible 
        ? "opacity-100 translate-x-0 scale-100" 
        : "opacity-0 translate-x-full scale-95";

    return `${baseStyles} ${typeStyles} ${animationStyles}`;
  };

  const getIcon = () => {
    const iconClass = "flex-shrink-0 w-5 h-5 mr-3";
    
    switch (toast.type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      case 'error':
        return <AlertCircle className={`${iconClass} text-red-600`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-yellow-600`} />;
      case 'loading':
        return <Loader className={`${iconClass} text-blue-600 animate-spin`} />;
      default: // info
        return <Info className={`${iconClass} text-blue-600`} />;
    }
  };

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      <div className="flex-1 text-sm font-medium">
        {toast.message}
      </div>
      {toast.type !== 'loading' && (
        <button
          onClick={handleClose}
          className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

const ToastContainer = () => {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-80 max-w-sm">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

export default ToastContainer;