import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'white';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

const variantClasses = {
  primary: 'text-purple-600',
  secondary: 'text-gray-500',
  white: 'text-white',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = '',
  variant = 'primary',
}) => {
  const spinnerClass = `${sizeClasses[size]} ${variantClasses[variant]} animate-spin`;

  if (text) {
    return (
      <div className={`flex items-center justify-center gap-2 ${className}`}>
        <Loader2 className={spinnerClass} />
        <span className={`text-sm ${variantClasses[variant]}`}>{text}</span>
      </div>
    );
  }

  return <Loader2 className={`${spinnerClass} ${className}`} />;
};

// Full page loading component
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" variant="primary" />
        <p className="mt-4 text-gray-600">{text}</p>
      </div>
    </div>
  );
};

// Overlay loading component
export const LoadingOverlay: React.FC<{ text?: string; show: boolean }> = ({ 
  text = 'Loading...', 
  show 
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <LoadingSpinner size="lg" variant="primary" text={text} />
      </div>
    </div>
  );
};

export default LoadingSpinner; 