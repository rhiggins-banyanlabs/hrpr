// components/admin/features/pedestal/PedestalModeTab.tsx
"use client"
import { useState } from 'react';
import { useAdminAuth } from '../../security/AdminAuthContext';
import { useRouter } from 'next/navigation';
import Card from '../../ui/Card';
import { Monitor, Power, PowerOff, ExternalLink, AlertTriangle } from 'lucide-react';

export default function PedestalModeTab() {
  const { isPedestalMode, enablePedestalMode, disablePedestalMode } = useAdminAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const router = useRouter();

  const handleEnablePedestalMode = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmEnable = () => {
    enablePedestalMode();
    setShowConfirmModal(false);
    // Show redirect modal
    setShowRedirectModal(true);
  };

  const [showRedirectModal, setShowRedirectModal] = useState(false);

  const handleRedirectToConnie = () => {
    setShowRedirectModal(false);
    router.push('/');
  };

  const handleStayInAdmin = () => {
    setShowRedirectModal(false);
    // Pedestal mode is already enabled, just close modal
  };

  const handleDisablePedestalMode = () => {
    disablePedestalMode();
  };

  return (
    <>
      <div className="space-y-6">
        {/* Current Status Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${isPedestalMode ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                <Monitor className={`h-6 w-6 ${isPedestalMode ? 'text-green-400' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Pedestal Mode</h3>
                <p className="text-gray-400">
                  {isPedestalMode 
                    ? 'Currently active - Connie is ready for public interaction'
                    : 'Currently inactive - Connie is in admin mode'
                  }
                </p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              isPedestalMode 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}>
              {isPedestalMode ? 'ACTIVE' : 'INACTIVE'}
            </div>
          </div>
        </Card>

        {/* Controls Card */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Mode Controls</h3>
          
          {!isPedestalMode ? (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="font-medium text-blue-400 mb-2">Enable Pedestal Mode</h4>
                <p className="text-gray-300 text-sm mb-4">
                  This will activate public mode, allowing conference attendees to interact with Connie. 
                  The system will remain in this mode until manually disabled by an admin.
                </p>
                <button
                  onClick={handleEnablePedestalMode}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium"
                >
                  <Power className="h-5 w-5" />
                  Enable Pedestal Mode
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <h4 className="font-medium text-amber-400 mb-2">Pedestal Mode Active</h4>
                <p className="text-gray-300 text-sm mb-4">
                  Connie is currently in public mode. Conference attendees can interact with the system.
                  Click below to return to admin mode.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium"
                  >
                    <ExternalLink className="h-5 w-5" />
                    View Public Interface
                  </button>
                  <button
                    onClick={handleDisablePedestalMode}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 transition-all font-medium"
                  >
                    <PowerOff className="h-5 w-5" />
                    Disable Pedestal Mode
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Information Card */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">About Pedestal Mode</h3>
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm">
                <strong className="text-white">Public Access:</strong> When enabled, attendees can interact with Connie without admin privileges
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm">
                <strong className="text-white">Persistent State:</strong> Mode remains active until manually disabled by an admin
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm">
                <strong className="text-white">Analytics Tracking:</strong> All interactions are logged and available in the Analytics tab
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm">
                <strong className="text-white">Admin Override:</strong> Admins can always access the admin panel regardless of mode
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black/90 border border-indigo-500/30 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Enable Pedestal Mode?</h3>
              <p className="text-gray-400">
                This will activate public mode for conference attendees. The system will remain in this mode until you manually disable it.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEnable}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redirect Modal */}
      {showRedirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black/90 border border-indigo-500/30 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                <Monitor className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Pedestal Mode Enabled!</h3>
              <p className="text-gray-400">
                Would you like to be redirected to the public Connie interface?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleStayInAdmin}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Stay in Admin
              </button>
              <button
                onClick={handleRedirectToConnie}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                Go to Connie
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}