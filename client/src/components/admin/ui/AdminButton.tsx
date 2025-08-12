// components/admin/AdminButton.tsx
"use client";
import { useState } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "../security/AdminAuthContext";
import { AdminLoginModal } from "../security/AdminLoginModal";
import { LayoutGrid, LogOut, Settings } from "lucide-react";

export const AdminButton = () => {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const { isPedestalMode, isSystemLocked } = useAdminAuth();
    const router = useRouter();
    
    // Add keyboard shortcut for iOS (triple tap 'a' key)
    const [keyPressCount, setKeyPressCount] = useState(0);
    const [lastKeyPressTime, setLastKeyPressTime] = useState(0);
    
    React.useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === 'a' || e.key === 'A') {
          const now = Date.now();
          if (now - lastKeyPressTime < 500) { // Within 500ms
            const newCount = keyPressCount + 1;
            setKeyPressCount(newCount);
            
            if (newCount >= 3) {
              console.log('Triple A pressed - opening admin modal');
              setShowLoginModal(true);
              setKeyPressCount(0); // Reset
            }
          } else {
            setKeyPressCount(1); // Start new sequence
          }
          setLastKeyPressTime(now);
        }
      };
      
      window.addEventListener('keypress', handleKeyPress);
      return () => window.removeEventListener('keypress', handleKeyPress);
    }, [keyPressCount, lastKeyPressTime]);
  
    const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Prevent double-firing on touch devices
      if (e.type === 'touchend' && 'ontouchstart' in window) {
        // Touch device - handle only touchend
        console.log('Admin button touched (touchend)');
      } else if (e.type === 'click' && !('ontouchstart' in window)) {
        // Non-touch device - handle click
        console.log('Admin button clicked');
      } else {
        // Ignore other combinations
        return;
      }
      
      setShowLoginModal(true);
    };
  
    return (
      <>
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          {/* Main Admin Button - Always shows login prompt */}
          <button
            onClick={handleClick}
            onTouchEnd={handleClick}
            className="
              group flex items-center gap-2
              px-6 py-3 rounded-xl backdrop-blur-sm
              border border-indigo-500/30 transition-all shadow-lg
              bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-600/20 
              hover:from-indigo-600/30 hover:via-purple-600/30 hover:to-blue-600/30 
              shadow-indigo-500/10 hover:shadow-indigo-500/20 cursor-pointer
              min-w-[100px] touch-manipulation
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