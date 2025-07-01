// components/admin/AdminButton.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "../security/AdminAuthContext";
import { AdminLoginModal } from "../security/AdminLoginModal";
import { LayoutGrid, LogOut, Settings } from "lucide-react";

export const AdminButton = () => {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const { isPedestalMode, isSystemLocked } = useAdminAuth();
    const router = useRouter();
  
    const handleClick = () => {
      // Always show login modal when clicking admin button
      setShowLoginModal(true);
    };
  
    return (
      <>
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          {/* Main Admin Button - Always shows login prompt */}
          <button
            onClick={handleClick}
            className="
              group flex items-center gap-2
              px-4 py-2 rounded-xl backdrop-blur-sm
              border border-indigo-500/30 transition-all shadow-lg
              bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-600/20 
              hover:from-indigo-600/30 hover:via-purple-600/30 hover:to-blue-600/30 
              shadow-indigo-500/10 hover:shadow-indigo-500/20 cursor-pointer
            "
          >
            <LayoutGrid className="h-4 w-4 text-indigo-400 group-hover:text-indigo-300" />
            <span className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400">
              Admin
            </span>
            
            {/* Mode Indicator */}
            <div className={`w-2 h-2 rounded-full ${isPedestalMode ? 'bg-green-400' : 'bg-red-400'}`} 
                 title={isPedestalMode ? 'System Active (Pedestal Mode)' : 'System Locked'} />
          </button>
        </div>
  
        {/* Login Modal */}
        <AdminLoginModal 
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </>
    );
  };