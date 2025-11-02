import { useCallback } from 'react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useErrorHandler = () => {
  const handleError = useCallback((error, context = '') => {
    console.error(`Error in ${context}:`, error);

    let message = 'An unexpected error occurred';

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          message = data.detail || 'Invalid request data';
          break;
        case 401:
          message = 'Authentication required';
          break;
        case 403:
          message = 'Access denied';
          break;
        case 404:
          message = data.detail || 'Resource not found';
          break;
        case 409:
          message = data.detail || 'Conflict with existing data';
          break;
        case 429:
          message = 'Too many requests. Please slow down.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        default:
          message = data.detail || `Server error (${status})`;
      }
    } else if (error.request) {
      // Network error
      message = 'Network error. Please check your connection.';
    } else {
      // Other error
      message = error.message || 'An unexpected error occurred';
    }

    toast.error(message);
    return message;
  }, []);

  const handleNetworkError = useCallback(() => {
    toast.error('Network error - please check your connection');
    // Add auto-retry logic after 5 seconds
    setTimeout(() => window.location.reload(), 5000);
  }, []);

  const logToService = useCallback(async (error, context) => {
    try {
      await fetch(`${API}/error-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: error.toString(),
          context,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (logError) {
      // Silently fail if logging service is unavailable
      console.warn('Failed to log error:', logError);
    }
  }, []);

  const handleSuccess = useCallback((message) => {
    toast.success(message);
  }, []);

  const handleInfo = useCallback((message) => {
    toast.info(message);
  }, []);

  const handleWarning = useCallback((message) => {
    toast.warning(message);
  }, []);

  return {
    handleError,
    handleNetworkError,
    logToService,
    handleSuccess,
    handleInfo,
    handleWarning
  };
};
