/**
 * Loading spinner component with customizable size and message
 */
import React from 'react';

const LoadingSpinner = ({ size = 'md', message = 'Loading...', fullScreen = false }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const spinnerClass = sizeClasses[size] || sizeClasses.md;

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${spinnerClass} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}></div>
      {message && (
        <p className="text-gray-600 dark:text-gray-400 font-medium">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
