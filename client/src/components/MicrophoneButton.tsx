// components/MicrophoneButton.tsx
import React from 'react';

interface MicrophoneButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  isRecording,
  isProcessing,
  onToggle,
  disabled = false
}) => {
  const getButtonState = () => {
    if (isProcessing) return 'processing';
    if (isRecording) return 'recording';
    return 'idle';
  };

  const buttonState = getButtonState();

  const getButtonStyles = () => {
    const baseStyles = "p-2 rounded-lg transition-all duration-200 flex items-center justify-center";
    
    switch (buttonState) {
      case 'recording':
        return `${baseStyles} bg-red-500 hover:bg-red-600 text-white animate-pulse`;
      case 'processing':
        return `${baseStyles} bg-yellow-500 text-white opacity-75 cursor-not-allowed`;
      default:
        return `${baseStyles} bg-gray-600 hover:bg-gray-500 text-white`;
    }
  };

  const getMicrophoneIcon = () => {
    if (buttonState === 'recording') {
      return (
        <svg 
          className="w-5 h-5" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          {/* Recording indicator dot */}
          <circle cx="18" cy="6" r="3" fill="red">
            <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
      );
    }

    return (
      <svg 
        className="w-5 h-5" 
        fill="currentColor" 
        viewBox="0 0 24 24"
      >
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    );
  };

  const getTooltipText = () => {
    switch (buttonState) {
      case 'recording':
        return 'Recording... (auto-sends after silence)';
      case 'processing':
        return 'Processing speech...';
      default:
        return 'Click to start voice input';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        disabled={disabled || isProcessing}
        className={getButtonStyles()}
        title={getTooltipText()}
        type="button"
      >
        {getMicrophoneIcon()}
      </button>
      
      {/* Visual feedback for recording */}
      {isRecording && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
      )}
    </div>
  );
};