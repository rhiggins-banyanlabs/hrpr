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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPedestalMode, setIsPedestalMode] = useState(false);
  const [isSystemLocked, setIsSystemLocked] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check for existing pedestal mode and admin session on mount
  useEffect(() => {
    const pedestalStatus = localStorage.getItem('Harper-pedestal-mode');
    const adminSession = localStorage.getItem('Harper-admin-session');
    
    // Only restore pedestal mode if it was explicitly set
    if (pedestalStatus === 'true') {
      console.log('🔄 Restoring pedestal mode from localStorage');
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
    
    setIsInitialized(true);
    
    console.log('🏁 Auth context initialized', {
      pedestalMode: pedestalStatus === 'true',
      systemLocked: pedestalStatus !== 'true',
      adminAuthenticated: !!adminSession
    });
  }, []);

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
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <div className="text-white text-sm">Initializing system...</div>
        </div>
      </div>
    );
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