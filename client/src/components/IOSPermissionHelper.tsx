import React, { useState, useEffect } from 'react';

interface IOSPermissionHelperProps {
  isVisible: boolean;
  onClose: () => void;
  onRetry?: () => void;
  permissionType?: 'microphone' | 'audio' | 'both';
  error?: string;
}

const IOSPermissionHelper: React.FC<IOSPermissionHelperProps> = ({
  isVisible,
  onClose,
  onRetry,
  permissionType = 'both',
  error
}) => {
  const [step, setStep] = useState(1);
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    // Detect iOS devices
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const iosDevice = /iPad|iPhone|iPod/.test(userAgent) || 
                      (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iosDevice);
  }, []);

  if (!isVisible || !isIOS) return null;

  const handleNextStep = () => {
    setStep(step + 1);
  };

  const handleRetry = () => {
    setStep(1);
    onRetry?.();
  };

  const microphoneSteps = [
    {
      title: "Enable Microphone Access",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">To use voice features, Harper needs access to your microphone.</p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">If you see a permission popup:</h4>
            <p className="text-blue-700">Tap "Allow" when Safari asks for microphone permission.</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-800 mb-2">If permission was denied:</h4>
            <ol className="text-orange-700 space-y-1">
              <li>1. Go to Settings app</li>
              <li>2. Scroll down to Safari</li>
              <li>3. Tap on "Microphone"</li>
              <li>4. Select "Allow"</li>
              <li>5. Return to this page and refresh</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      title: "Audio Setup Complete",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-700">Great! Your microphone access is now set up.</p>
            <p className="text-sm text-gray-500 mt-2">You can now use voice features by tapping the Harper button.</p>
          </div>
        </div>
      )
    }
  ];

  const audioSteps = [
    {
      title: "Enable Audio Playback",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">iOS requires a user interaction to enable audio playback.</p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">To enable Harper's voice:</h4>
            <p className="text-blue-700">Simply tap anywhere on this screen or the Harper button.</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-green-700">💡 <strong>Tip:</strong> This only needs to be done once per session.</p>
          </div>
        </div>
      )
    }
  ];

  const bothSteps = [
    ...microphoneSteps.slice(0, 1),
    ...audioSteps,
    ...microphoneSteps.slice(1)
  ];

  const steps = permissionType === 'microphone' ? microphoneSteps :
               permissionType === 'audio' ? audioSteps :
               bothSteps;

  const currentStep = steps[Math.min(step - 1, steps.length - 1)];
  const isLastStep = step >= steps.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            🍎 iOS Setup Required
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / steps.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            Step {step} of {steps.length}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <h4 className="text-xl font-semibold text-gray-900 mb-4">
            {currentStep.title}
          </h4>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h5 className="font-medium text-red-800">Error</h5>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {currentStep.content}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="flex space-x-2">
            {Array.from({ length: steps.length }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < step ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <div className="flex space-x-3">
            {!isLastStep ? (
              <button
                onClick={handleNextStep}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            ) : (
              <div className="space-x-3">
                <button
                  onClick={handleRetry}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>

        {/* iOS-specific tips */}
        <div className="px-6 py-3 bg-blue-50 border-t">
          <p className="text-xs text-blue-700">
            <strong>iOS Tip:</strong> If you're still having issues, try refreshing the page or closing and reopening Safari.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IOSPermissionHelper;