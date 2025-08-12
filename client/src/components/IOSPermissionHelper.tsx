import React from 'react';

interface IOSPermissionHelperProps {
  onClose: () => void;
}

const IOSPermissionHelper: React.FC<IOSPermissionHelperProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Enable Microphone Access</h2>
        
        <div className="space-y-3 text-gray-700">
          <p className="font-semibold">For iOS/iPadOS devices:</p>
          
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Open <strong>Settings</strong> app</li>
            <li>Scroll down and tap <strong>Safari</strong></li>
            <li>Scroll down to <strong>Settings for Websites</strong></li>
            <li>Tap <strong>Microphone</strong></li>
            <li>Select <strong>Ask</strong> or <strong>Allow</strong></li>
            <li>Return to Safari and refresh this page</li>
            <li>When prompted, tap <strong>Allow</strong> to grant microphone access</li>
          </ol>
          
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You must be using Safari browser. Chrome and other browsers have limited microphone support on iOS.
            </p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default IOSPermissionHelper;