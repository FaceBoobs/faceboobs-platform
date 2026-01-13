// src/contexts/ToastContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [toastRegistry, setToastRegistry] = useState(new Map());

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    setToastRegistry(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 5000, options = {}) => {
    const { id: customId, dismissPrevious = false, preventDuplicates = true } = options;

    // Generate unique ID or use custom ID
    const toastId = customId || `${type}_${Date.now()}_${Math.random()}`;

    // Prevent duplicate toasts with same message and type
    if (preventDuplicates) {
      const existingToast = Array.from(toastRegistry.values()).find(
        t => t.message === message && t.type === type
      );

      if (existingToast) {
        console.log('🚫 Duplicate toast prevented:', message);
        return existingToast.id;
      }
    }

    // Dismiss previous toasts of same type if requested
    if (dismissPrevious) {
      setToasts(prev => prev.filter(t => t.type !== type));
    }

    // Limit total toasts to 3
    setToasts(prev => {
      if (prev.length >= 3) {
        // Remove oldest toast
        const oldest = prev[0];
        removeToast(oldest.id);
        return prev.slice(1);
      }
      return prev;
    });

    const toast = {
      id: toastId,
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration,
      timestamp: Date.now()
    };

    setToastRegistry(prev => {
      const newMap = new Map(prev);
      newMap.set(toastId, toast);
      return newMap;
    });

    setToasts(prev => [...prev, toast]);

    // Auto remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(toastId);
      }, duration);
    }

    return toastId;
  }, [removeToast, toastRegistry]);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
    setToastRegistry(new Map());
  }, []);

  const dismissToast = useCallback((id) => {
    removeToast(id);
  }, [removeToast]);

  // Convenience methods with duplicate prevention
  const toast = {
    success: (message, options) => addToast(message, 'success', 3000, { preventDuplicates: true, ...options }),
    error: (message, options) => addToast(message, 'error', 5000, { preventDuplicates: true, dismissPrevious: false, ...options }),
    warning: (message, options) => addToast(message, 'warning', 4000, { preventDuplicates: true, ...options }),
    info: (message, options) => addToast(message, 'info', 3000, { preventDuplicates: true, ...options }),
    loading: (message, options) => addToast(message, 'loading', 0, { preventDuplicates: true, ...options }),
    dismiss: dismissToast,
    dismissAll: removeAllToasts,
  };

  const value = {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    dismissToast,
    toast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

export default ToastContext;