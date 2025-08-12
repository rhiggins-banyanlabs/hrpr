// components/admin/security/AdminAuthContext.tsx
"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  isPedestalMode: boolean;
  isSystemLocked: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  enablePedestalMode: () => void;
  disablePedestalMode: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

interface AdminAuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  // Initialize immediately with default values to avoid loading screen
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPedestalMode, setIsPedestalMode] = useState(false);
  const [isSystemLocked, setIsSystemLocked] = useState(true);
  const [isInitialized, setIsInitialized] = useState(true); // Start as true to skip loading

  // Check for existing pedestal mode and admin session on mount
  useEffect(() => {
    const initAuth = () => {
      try {
        // Detect iOS for special handling
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        if (isIOS) {
          console.log('🍎 iOS detected - using fast auth initialization');
        }
        
        const pedestalStatus = localStorage.getItem('Harper-pedestal-mode');
        const adminSession = localStorage.getItem('Harper-admin-session');
        
        // Check if pedestal mode should be enabled by default (for development)
        const defaultPedestalMode = process.env.NEXT_PUBLIC_PEDESTAL_MODE_ENABLED === 'true';
        
        // Only restore pedestal mode if it was explicitly set OR if default is enabled
        if (pedestalStatus === 'true' || defaultPedestalMode) {
          console.log('🔄 Enabling pedestal mode:', pedestalStatus === 'true' ? 'from localStorage' : 'from environment variable');
          setIsPedestalMode(true);
          setIsSystemLocked(false);
        } else {
          console.log('🔒 No pedestal mode found - system remains locked');
          setIsPedestalMode(false);
          setIsSystemLocked(true);
        }
        
        // Check for valid admin session (expires after 30 minutes)
        if (adminSession) {
          try {
            const sessionData = JSON.parse(adminSession);
            const now = Date.now();
            const sessionAge = now - sessionData.timestamp;
            const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
            
            if (sessionAge < thirtyMinutes) {
              console.log('🔄 Restoring admin session from localStorage');
              setIsAuthenticated(true);
            } else {
              console.log('⏰ Admin session expired, removing');
              localStorage.removeItem('Harper-admin-session');
              setIsAuthenticated(false);
            }
          } catch (error) {
            console.log('❌ Invalid admin session data, removing');
            localStorage.removeItem('Harper-admin-session');
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
        
        console.log('🏁 Auth context initialized', {
          pedestalMode: pedestalStatus === 'true',
          systemLocked: pedestalStatus !== 'true',
          adminAuthenticated: !!adminSession
        });
      } catch (error) {
        console.error('❌ Error during auth initialization:', error);
      }
    };
    
    // Initialize immediately
    initAuth();
    
    // No need for timeout since we start initialized
  }, []); // Empty dependency array - only run once on mount

  const login = (password: string): boolean => {
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    
    if (password === adminPassword) {
      setIsAuthenticated(true);
      
      // Save admin session with timestamp (expires in 30 minutes)
      const sessionData = {
        timestamp: Date.now(),
        authenticated: true
      };
      localStorage.setItem('Harper-admin-session', JSON.stringify(sessionData));
      
      console.log('✅ Admin authenticated successfully');
      return true;
    }
    
    console.log('❌ Invalid admin password');
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('Harper-admin-session');
    // Note: We don't change pedestal mode on logout
    console.log('🚪 Admin logged out (pedestal mode unchanged)');
  };

  const enablePedestalMode = () => {
    setIsPedestalMode(true);
    setIsSystemLocked(false);
    localStorage.setItem('Harper-pedestal-mode', 'true');
    console.log('🏛️ Pedestal mode enabled - System unlocked for public use');
  };

  const disablePedestalMode = () => {
    setIsPedestalMode(false);
    setIsSystemLocked(true);
    localStorage.removeItem('Harper-pedestal-mode');
    console.log('🏛️ Pedestal mode disabled - System locked');
  };

  // Don't render children until initialized to prevent flash
  if (!isInitialized) {
    return null; // Simply return null instead of showing loading screen
  }

  return (
    <AdminAuthContext.Provider value={{
      isAuthenticated,
      isPedestalMode,
      isSystemLocked,
      login,
      logout,
      enablePedestalMode,
      disablePedestalMode,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}