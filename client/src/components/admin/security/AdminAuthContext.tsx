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

  // Check for existing pedestal mode on mount (but NOT authentication)
  useEffect(() => {
    const pedestalStatus = localStorage.getItem('Harper-pedestal-mode');
    
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
    
    // Never restore authentication - always require fresh login
    setIsAuthenticated(false);
    setIsInitialized(true);
    
    console.log('🏁 Auth context initialized', {
      pedestalMode: pedestalStatus === 'true',
      systemLocked: pedestalStatus !== 'true'
    });
  }, []);

  const login = (password: string): boolean => {
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    
    if (password === adminPassword) {
      setIsAuthenticated(true);
      console.log('✅ Admin authenticated successfully');
      return true;
    }
    
    console.log('❌ Invalid admin password');
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
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