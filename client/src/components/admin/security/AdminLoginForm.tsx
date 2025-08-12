// Simple inline login form for iOS compatibility
"use client"
import { useState } from 'react';
import { useAdminAuth } from './AdminAuthContext';
import { useRouter } from 'next/navigation';
import { Lock, LogIn } from 'lucide-react';

export function AdminLoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdminAuth();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Form submitted with password:', password.length > 0 ? 'yes' : 'no');
    
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const success = login(password);
      console.log('Login result:', success);
      
      if (success) {
        console.log('Login successful, redirecting to admin panel');
        setPassword('');
        // Force a page reload to ensure auth state is updated
        setTimeout(() => {
          window.location.href = '/admin';
        }, 100);
      } else {
        setError('Invalid password. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };
  
  // Handle button click separately for iOS
  const handleButtonClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const success = login(password.trim());
      
      if (success) {
        setTimeout(() => {
          window.location.replace('/admin');
        }, 100);
      } else {
        setError('Invalid password');
        setIsLoading(false);
      }
    } catch (error) {
      setError('Login error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-black/90 border border-indigo-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-indigo-500/10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-blue-600/20 rounded-full mb-4">
            <Lock className="h-8 w-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-blue-400">
            Admin Access
          </h2>
          <p className="text-gray-400 mt-2">
            Enter the admin password to access the control panel
          </p>
        </div>

        {/* No Form - Just Input and Button */}
        <div className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleButtonClick(e as any);
                }
              }}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 bg-gray-800/50 border border-indigo-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isLoading}
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleButtonClick}
            onTouchEnd={handleButtonClick}
            disabled={!password.trim() || isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500 text-white rounded-lg hover:from-indigo-700 hover:via-purple-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="h-5 w-5" />
            )}
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            This is a secure admin area. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}